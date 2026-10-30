# form-hwpx 빌드

`skills/nts-planning-report/scripts/form-hwpx.mjs`의 원본. 서식 엔진은 `kmskr2000-tech/nts-report-studio`의 `src/lib/formStyle.ts`를 그대로 쓴다(웹앱과 같은 코드).

다시 만들 때(웹앱 formStyle.ts가 바뀌었을 때):

```bash
# gaejosik-maker 옆에 nts-report-studio를 받아 두고 그 폴더에서 npm install
npx -y esbuild tools/form-hwpx/cli.ts --bundle --platform=node --format=esm --target=node20 \
  --external:kordoc --legal-comments=none \
  --banner:js='import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' \
  --outfile=skills/nts-planning-report/scripts/form-hwpx.mjs
cd skills && rm nts-planning-report.skill && zip -qr nts-planning-report.skill nts-planning-report
```

jszip·cfb는 번들에 들어가고, kordoc은 실행 때 KORDOC_DIR → 현재 폴더 → npx 캐시 → 전역 순으로 찾는다.
