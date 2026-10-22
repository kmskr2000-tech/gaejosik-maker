# 코퍼스: Google Drive

기존 보고서 코퍼스는 사용자의 Google Drive에 있다. Google Drive 커넥터로 검색하고 읽는다. 커넥터가 꺼져 있으면 사용자에게 claude.ai 설정의 커넥터에서 Google Drive를 켜 달라고 한 줄로 요청하고, 그동안은 사용자가 붙여 넣는 문서로 진행한다.

## 폴더 구조

| 폴더 | 유형 | 폴더 ID |
|---|---|---|
| NTS_보고서_코퍼스 | 루트 | 10Mpf4D6IzxL6q8UtYtaWOD5PUa3jzIQE |
| 00_서식견본 | 결재 양식 HWPX | 1OsPhAbbrudXq-B2EYITszGrTyJzZdjb4 |
| 01_업무보고 | 대통령 업무보고 | 1EV5i3pQ34Iw75rBrKN2a6KHhnM_MQqep |
| 02_과제발굴 | 범부처 추진과제 대응 | 1Cyqh0WnE-QMT9c4WH--bRT_fUaVeg7s0 |
| 03_업무평가 | 정부업무평가 대응 | 1vOUMKilwvuK98DkEy4Hch8qVIaD31Tb4 |
| 04_운영방안 | 국세행정 운영방안 | 1hbn7vXk7dBUfEo8WUusdsDDJm6ScnH-V |
| 05_수시 | 수시 기획보고 | 1aaKtwxlF_YAC8UdRIXwozWhbErce9XzG |
| 05_수시/원페이퍼 | 1쪽 요약 보고 | 12I8f7FCw3WG9bgxIYO4PkcIlXCAc0Bwu |
| 06_말씀자료 | 청장 신년사·인사말, 국무회의 참고자료 | 1fP5lsXpGnUF8OvXnqrsj3VxKMQUZiFk8 |
| 06_말씀자료/국장단회의 | 국장단 회의자료 | 1CxXlBauzrDNMO_c9qkhkGYdbHZmdLcte |
| 06_말씀자료/확대간부회의 | 확대간부회의 자료 | 1tKBa2OXez_av13ukUk77KefOpMbRD7iw |
| 07_보도자료 | 보도자료·브리핑 | 16p5qGcc0UoKL9P8b8AU6OiKNTU_3D_ot |
| 08_상급기관지침 | 업무보고 작성지침, 평가 지침, 범부처 계획 | 1UO2lq9OWfnsyzAdj7dkqAGBTobSANjmQ |
| 09_국실취합자료 | 국실 회신 양식·통합본 | 1ESjNrWu3KCgDjB8pugjv0iEYNJG-Ork6 |

06~09는 문서 유형이 아니라 용도로 나눈 폴더다.

- 06_말씀자료: 청장 메시지의 원문 표현. 2단계 맥락 스캔과 운영방안 기조 문장에 쓴다.
- 07_보도자료: 대외 공개 표현. 국민 체감 워딩과 성과 서술 참고용.
- 08_상급기관지침: 문체 참고가 아니라 맥락 소스다. 업무보고·평가 작성 시 해당 지침을 먼저 읽고 양식과 항목명을 그대로 따른다.
- 09_국실취합자료: 1차 자료가 어떤 모양으로 오는지 보는 예시. 문체 앵커로 쓰지 않는다.

폴더 ID로 찾지 못하면(폴더를 옮기거나 다시 만든 경우) 제목으로 찾는다.

```
mimeType = 'application/vnd.google-apps.folder' and title = 'NTS_보고서_코퍼스'
```

## 검색 순서

1단계에서 문서 유형이 정해지면 그 유형 폴더부터 본다.

1. 유형 폴더 목록: `parentId = '<유형 폴더 ID>'`, `excludeContentSnippets: true`로 파일명만 받는다. 파일명이 `YYYY-MM_제목` 형식이라 최신순·주제로 고를 수 있다.
2. 주제가 겹치는 문서 찾기: `parentId = '<유형 폴더 ID>' and fullText contains '<핵심어>'`. 핵심어는 이번 보고서의 주제어(예: AI, 체납, 세무조사).
3. 같은 유형에 맞는 문서가 없으면 다른 유형 폴더에서 주제어로 찾는다. 예를 들어 수시 보고인데 주제가 AI면 운영방안 폴더의 AI 꼭지를 문체 참고로 쓴다.
4. 고른 문서를 `read_file_content`로 읽는다. 한 번에 2편까지. 많이 읽을수록 문체가 흐려지고 컨텍스트만 먹는다.

고르는 기준:
- 같은 유형 + 가장 최근 문서 1편: 현재 양식과 기호 체계의 기준.
- 같은 주제 문서 1편: 해당 분야 워딩의 기준.
- 전 정부·전임 청장 시기 문서는 양식 참고로만 쓰고 슬로건·키워드는 가져오지 않는다.

읽은 문서의 파일명을 출력 끝에 "참고 문서"로 적는다. 사용자가 어떤 문서를 따랐는지 확인할 수 있어야 한다.

## 파일 형식

HWP·HWPX·docx·pdf 모두 올려도 된다.

- docx·pdf·Google 문서: Drive 커넥터 `read_file_content`로 바로 읽는다.
- HWP·HWPX: Drive 커넥터가 직접 읽지 못한다. `download_file_content`로 받아 kordoc으로 Markdown 변환한다. 방법은 `references/kordoc.md`의 "Drive 파일 읽기".
- kordoc을 쓸 수 없는 환경에서 HWP만 있으면, 사용자에게 해당 문서를 docx로 저장해 올리거나 본문을 붙여 달라고 한다.
- DRM이 걸린 파일은 어느 경로로도 읽지 못한다. 보안 해제본을 올려 달라고 한다.

## 서식 견본 폴더

`00_서식견본` (폴더 ID 1OsPhAbbrudXq-B2EYITszGrTyJzZdjb4)에는 실제 결재 양식 HWPX를 둔다. 내용이 아니라 서식(제목표, 결재란, 글꼴, 부호별 크기)을 가져오는 용도다. 6단계에서 HWPX를 만들 때 kordoc `--template`에 쓴다. 파일명은 `견본_유형.hwpx` (예: `견본_수시.hwpx`).

## 파일명 규칙

기존 파일은 원래 이름을 유지한다. 대부분 `YYMMDD 제목` 또는 `YYMMDD_제목` 형식이다(예: `260812 2026년 하반기 국세행정운영방안.hwpx`). 날짜가 없는 파일은 제목의 연도(26년, 2024년도)로 시점을 판단한다.

- `★` 표시: 사용자가 중요 표시한 문서. 같은 조건이면 우선 참고한다.
- `_최종`, `_제출용`, `v27` 등: 최종본. `_작성중`, `_수정` 등은 중간본이므로 최종본이 있으면 최종본을 쓴다.
- 새로 올리는 파일도 같은 방식(`YYMMDD 제목`)을 권장한다.

## 보안

Drive의 코퍼스는 대화 중 Claude에 전송된다. 대외비 표시 문서, 납세자 정보·직원 인적사항이 들어간 문서는 올리지 않거나 해당 부분을 지운 뒤 올린다. 읽은 문서에서 그런 내용을 발견하면 출력에 옮기지 말고 사용자에게 알린다.
