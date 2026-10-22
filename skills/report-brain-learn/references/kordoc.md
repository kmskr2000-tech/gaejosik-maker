# kordoc 사용법

보고서 파일 처리는 kordoc(github.com/chrisryugj/kordoc)으로 한다. kordoc은 HWP·HWPX·PDF·DOCX·XLSX를 Markdown으로 읽고, Markdown을 공문서 서식 HWPX로 만들고, 공문서 표기법을 검수한다. 한컴오피스 없이 작동한다.

## 이 스킬에서 쓰는 곳

| 단계 | 작업 | kordoc 기능 |
|---|---|---|
| 1·3단계 | 국실 1차 자료(HWP·HWPX·PDF·XLSX) 읽기 | `parse_document` |
| 3·4단계 | Drive 코퍼스 HWP 읽기 | Drive에서 내려받은 뒤 `parse_document` |
| 3단계 | 1차 자료 개인정보 가리기 | `redact_document` |
| 5단계 | 표기법·문체·구성·수치 검수 | `lint_document` (CLI `lint --gate --numbers`) |
| 6단계 | Markdown 원고를 HWPX로 | `generate_document` (CLI `generate`) |
| 6단계 | 서식 견본 그대로 새 내용 | `generate --template` 또는 `patch` |

## 실행 방법 선택

아래 순서로 쓸 수 있는 것을 고른다.

1. kordoc MCP 도구가 보이면(`parse_document`, `generate_document`, `lint_document` 등) 그것을 쓴다.
2. 셸을 쓸 수 있고 Node.js 20 이상이 있으면 CLI `npx -y kordoc ...`를 쓴다.
3. 둘 다 안 되면 Markdown 원고까지만 만들고, 사용자에게 아래 설치를 한 줄로 안내한다.

```bash
npx -y kordoc setup
```

설치 명령은 사용자 PC에서 실행하는 것이다. Claude가 대신 실행하지 않는다.

## 원고 Markdown 규칙

kordoc은 Markdown 위계를 공문서 부호로 바꾼다. 원고는 이 규칙으로 쓴다. 부호(□ ○ -)를 직접 타이핑하지 않는다. 직접 쓰면 부호가 이중으로 붙는다.

| Markdown | HWPX 결과 |
|---|---|
| `# 제목` | 문서 제목(제목표·표지) |
| `# 제목` 바로 아래 `> 문장` | 요약 상자. 보고 목적 한 문장, 3줄 이내 |
| `## 장 제목` | 장 띠(Ⅰ, Ⅱ …) |
| `### 절 제목` | 절 제목 |
| `- 항목` (들여쓰기 0) | □ |
| `  - 항목` (2칸) | ○ 또는 ㅇ |
| `    - 항목` (4칸) | - |
| `      - 항목` (6칸) | · |
| `- ※ 문장` | ※ 참고 |
| 표 (`\| a \| b \|`) | 정부 관행 표(머리행 음영, 합계 행 위치 자동) |

업무보고 프리셋은 `> ▪ 문장` 인용문이 성과 요약 상자가 된다.

## 문서 유형별 생성 옵션

| 문서 유형 | 프리셋 | 기본 옵션 |
|---|---|---|
| 대통령 업무보고 | `업무보고` | `--agency 국세청` |
| 국세행정 운영방안 | `개조식` | `--agency 국세청 --org 국세청` (표지·목차 자동) |
| 정부업무평가 대응 | `보고서` | `--agency 국세청` |
| 범부처 과제 발굴 | `보고서` | `--agency 국세청`. 공문 양식이 HWPX로 왔으면 `fill_form` 또는 `patch` |
| 수시 기획보고 | `보고서` | `--agency 국세청 --report-info '(날짜, 혁신정책담당관실)'` |

```bash
npx -y kordoc generate 원고.md -o 결과.hwpx --preset 업무보고 --agency 국세청
npx -y kordoc generate 원고.md -o 결과.hwpx --preset 개조식 --agency 국세청 --org 국세청
npx -y kordoc generate 원고.md -o 결과.hwpx --preset 보고서 --agency 국세청 --bullet2 ○
```

`--bullet2 ○`는 2단계 부호를 ㅇ 대신 ○로 바꾼다. 코퍼스가 어느 쪽을 쓰는지 보고 정한다.

## 서식 견본 쓰기 (우선)

Drive `NTS_보고서_코퍼스/00_서식견본`에 혁신정책담당관실 실제 서식 HWPX가 있으면 프리셋보다 견본을 우선한다. 견본이 있어야 실제 제목표·결재란·글꼴이 재현된다.

- 새 문서를 견본 서식으로: `generate 원고.md -o 결과.hwpx --template 견본.hwpx`. 견본의 쪽 설정·글꼴·제목표·담당 줄·요약 상자·□○-·※·표 서식을 쓰고 내용만 바꾼다. 프리셋 옵션과 함께 쓰지 못한다.
- 견본의 로고·결재란까지 그대로 둬야 하면 patch 경로를 쓴다.

```bash
npx -y kordoc 견본.hwpx --keep-layout-tables -o 편집.md
# 편집.md의 내용만 새 원고로 바꾼다. 부호·표 구조·표지 줄은 둔다
npx -y kordoc patch 견본.hwpx 편집.md -o 결과.hwpx
```

- 단계별 글꼴만 배우려면 `--levels-from 견본.hwpx`를 프리셋과 같이 쓴다.

견본 HWP(5.x)는 HWPX로 저장해 두라고 사용자에게 안내한다. `--template`은 HWPX만 받는다.

## Drive 파일 읽기

Drive 커넥터는 HWP를 직접 읽지 못한다. kordoc으로 읽으려면 파일이 로컬에 있어야 한다.

1. `download_file_content`로 파일을 받아 작업 폴더에 저장한다(base64 디코드).
2. `parse_document`(또는 `npx -y kordoc 파일.hwp -o 파일.md`)로 Markdown을 얻는다.
3. 코퍼스는 문체만 볼 것이므로 `--no-images`를 준다.

docx·pdf·Google 문서는 Drive 커넥터의 `read_file_content`로 바로 읽어도 된다.

## 검수

6단계에서 HWPX를 만들기 전에 원고 Markdown을 검수한다.

```bash
npx -y kordoc lint 원고.md --gate --preset 보고서
```

- 표기법·문체 error, 윤문(AI 문체), 구성(왜 → 무엇 → 어떻게) 지적이 나온다. 지적을 고친 뒤 다시 돌린다.
- 지적이 코퍼스 문체와 충돌하면 코퍼스를 따르고, 그 지적은 출력 끝 "판단 필요 지점"에 적는다. kordoc 규칙은 일반 공문서 기준이고, 국세청 내부 관행이 우선이다.
- HWPX를 만든 뒤 `lint 결과.hwpx --numbers`로 본문과 표의 수치가 맞는지 한 번 더 본다.
- 생성할 때 `--gate`를 주면 게이트를 통과하지 못한 원고는 파일이 만들어지지 않는다. 마감이 급한 수시 보고에서는 빼고, 지적 목록만 사용자에게 보여 준다.

## 개인정보 가리기

국실 1차 자료에 납세자 이름·주민번호·사업자번호·연락처가 보이면 원고 작업 전에 가린다.

```bash
npx -y kordoc redact 자료.hwpx -o 자료_가림.hwpx
```

가린 사실을 사용자에게 알린다.

## 실패 처리

kordoc은 실패 시 코드를 준다. 자주 나오는 것:

| 코드 | 의미 | 대응 |
|---|---|---|
| `DRM_PROTECTED` | 한컴 문서보안 걸린 파일 | 열 수 없다. 사용자에게 보안 해제본이나 텍스트를 요청 |
| `ENCRYPTED` | 암호 문서 | 사용자에게 암호 해제본 요청 |
| `IMAGE_BASED_PDF` | 스캔 PDF | `--ocr`로 다시 |
| `UNSUPPORTED_FORMAT` | 지원 안 하는 형식 | 사용자에게 다른 형식 요청 |

사무실 문서는 DRM이 걸린 경우가 많다. DRM 파일을 우회하려 하지 않는다.
