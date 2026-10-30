/**
 * form-hwpx — 양식(HWP·HWPX)의 서식으로 원고 Markdown을 HWPX로 만든다.
 * 국세청 보고서 스튜디오(nts-report-studio)의 양식 서식 이식 엔진을 스킬용 명령으로 묶은 것.
 *
 *   node form-hwpx.mjs 원고.md 양식.hwpx -o 결과.hwpx [--report-info '【’26. 10. 혁신정책담당관실】']
 *   node form-hwpx.mjs 원고.md 양식.hwp  -o 결과.hwpx --preset 보고서 --agency 국세청 [--no-cover --no-toc --bullet2 ○]
 *   node form-hwpx.mjs --inspect 양식.hwpx      (뽑은 역할별 서식·간격 줄만 본다)
 *
 * kordoc은 번들하지 않는다. KORDOC_DIR(npm i --prefix 로 설치한 폴더) → 현재 폴더 → npx 캐시 → 전역 순으로 찾는다.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import {
  adaptMarkdown,
  applySpacers,
  describeSpacers,
  describeStyles,
  evenTables,
  extractFromHwp,
  extractFromHwpx,
  extractSpacersFromHwp,
  extractSpacersFromHwpx,
  fixTallRows,
  restyleHwpx,
  withFallbacks,
  type Role,
} from "../../../nts-report-studio/src/lib/formStyle.ts";

type Kordoc = typeof import("kordoc");

function loadKordoc(): Kordoc {
  const bases: string[] = [];
  if (process.env.KORDOC_DIR) bases.push(process.env.KORDOC_DIR);
  bases.push(process.cwd());
  const npx = path.join(os.homedir(), ".npm", "_npx");
  try {
    for (const d of fs.readdirSync(npx)) if (fs.existsSync(path.join(npx, d, "node_modules", "kordoc"))) bases.push(path.join(npx, d));
  } catch {}
  try {
    bases.push(path.dirname(execSync("npm root -g", { encoding: "utf8" }).trim()));
  } catch {}
  for (const b of bases) {
    try {
      return createRequire(path.join(b, "noop.js"))("kordoc") as Kordoc;
    } catch {}
  }
  throw new Error("kordoc을 찾지 못했습니다. `npm i --prefix <폴더> kordoc` 후 KORDOC_DIR=<폴더> 로 다시 실행하세요.");
}

function args(argv: string[]) {
  const pos: string[] = [];
  const opt: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--") && a !== "-o") pos.push(a);
    else {
      const key = a === "-o" ? "out" : a.slice(2);
      const next = argv[i + 1];
      if (["no-cover", "no-toc", "inspect"].includes(key) || next === undefined) opt[key] = true;
      else {
        opt[key] = next;
        i++;
      }
    }
  }
  return { pos, opt };
}

/** 견본 모드 경고에서 kordoc이 다른 서식으로 대신 채운 역할 */
function missingRoles(warnings: string[]): Set<Role> {
  const w = warnings.find((x) => x.includes("서식이 없어")) ?? "";
  const roles = new Set<Role>();
  if (w.includes("□ 항목")) roles.add("L0");
  if (w.includes("○ 항목")) roles.add("L1");
  if (w.includes("- 항목")) roles.add("L2");
  if (w.includes("· 항목")) roles.add("L3");
  if (w.includes("제목표")) roles.add("title");
  if (w.includes("요약 상자")) roles.add("summary");
  if (w.includes("데이터 표")) roles.add("table");
  return roles;
}

async function main() {
  const { pos, opt } = args(process.argv.slice(2));
  if (opt.inspect) {
    const f = pos[0] ?? String(opt.inspect);
    const b = new Uint8Array(fs.readFileSync(f));
    const hwp = f.toLowerCase().endsWith(".hwp");
    const styles = hwp ? extractFromHwp(b) : await extractFromHwpx(b);
    const sp = hwp ? extractSpacersFromHwp(b) : await extractSpacersFromHwpx(b);
    console.log(`글자 서식: ${styles ? describeStyles(styles) : "(못 읽음)"}`);
    console.log(`문단 간격 줄: ${describeSpacers(sp) || "(없음)"}`);
    return;
  }
  const [mdPath, formPath] = pos;
  if (!mdPath || !formPath || !opt.out) {
    console.error("사용법: node form-hwpx.mjs 원고.md 양식.hwp(x) -o 결과.hwpx [--report-info '【…】'] [--preset 보고서 --agency 국세청 --no-cover --no-toc --bullet2 ○]");
    process.exit(2);
  }
  const k = loadKordoc();
  let markdown = fs.readFileSync(mdPath, "utf8");
  const form = new Uint8Array(fs.readFileSync(formPath));
  const isHwp = formPath.toLowerCase().endsWith(".hwp");
  const warnings: string[] = [];
  const reportInfo = typeof opt["report-info"] === "string" ? opt["report-info"] : "";
  let bytes: Uint8Array;

  if (!isHwp) {
    const found = await extractFromHwpx(form).catch(() => null);
    const styles = found && withFallbacks(found);
    if (styles) markdown = adaptMarkdown(markdown, styles);
    // 견본 모드는 공문 옵션을 쓰지 않으므로 【…】 머리 줄은 제목 아래 문단으로 넣는다
    if (reportInfo && !markdown.includes(reportInfo)) markdown = markdown.replace(/^(# .*\n)/m, `$1\n${reportInfo}\n`);
    bytes = new Uint8Array(await k.markdownToHwpx(markdown, { template: form, warnings }));
    const missing = missingRoles(warnings);
    if (styles) {
      const roles = new Set((Object.keys(styles) as Role[]).filter((x) => x !== "body" && ((x !== "summary" && x !== "table") || missing.has(x))));
      const r = await restyleHwpx(bytes, styles, markdown, roles);
      bytes = r.bytes;
      if (r.applied.length) warnings.push(`양식 글자 서식 적용: ${describeStyles(Object.fromEntries(r.applied.map((x) => [x, styles[x]])))}`);
    }
    const sp = await extractSpacersFromHwpx(form).catch(() => ({}));
    const gaps = await applySpacers(bytes, sp, markdown);
    bytes = gaps.bytes;
    if (gaps.added) warnings.push(`양식 문단 간격 줄 ${gaps.added}개 적용 (${describeSpacers(sp)})`);
    const even = await evenTables(bytes);
    bytes = even.bytes;
    if (even.fixed) warnings.push(`표 칸 ${even.fixed}개의 글자 모양을 머리행·본문 행끼리 맞춤`);
    const tall = await fixTallRows(bytes);
    bytes = tall.bytes;
    if (tall.fixed) warnings.push(`양식 표의 높은 칸 높이를 옮긴 행 ${tall.fixed}칸을 줄임`);
  } else {
    const styles = (() => {
      try {
        const f = extractFromHwp(form);
        return f && withFallbacks(f);
      } catch (e) {
        warnings.push(`양식 HWP 서식을 읽지 못함: ${e instanceof Error ? e.message : String(e)}`);
        return null;
      }
    })();
    if (styles) markdown = adaptMarkdown(markdown, styles);
    const gongmun: Record<string, unknown> = { preset: String(opt.preset ?? "보고서"), agency: String(opt.agency ?? "국세청"), warnings };
    if (typeof opt.bullet2 === "string") gongmun.bullet2 = opt.bullet2;
    if (opt["no-cover"]) gongmun.cover = false;
    if (opt["no-toc"]) gongmun.toc = false;
    if (reportInfo) gongmun.reportInfo = reportInfo;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bytes = new Uint8Array(await k.markdownToHwpx(markdown, { gongmun: gongmun as any, warnings }));
    if (styles) {
      const r = await restyleHwpx(bytes, styles, markdown);
      bytes = r.bytes;
      if (r.applied.length) warnings.push(`양식 글자 서식 적용: ${describeStyles(Object.fromEntries(r.applied.map((x) => [x, styles[x]])))}`);
      let sp = {};
      try {
        sp = extractSpacersFromHwp(form);
      } catch {}
      const gaps = await applySpacers(bytes, sp, markdown);
      bytes = gaps.bytes;
      if (gaps.added) warnings.push(`양식 문단 간격 줄 ${gaps.added}개 적용 (${describeSpacers(sp)})`);
      warnings.push("HWP 양식은 글자 서식·문단 간격 줄만 옮김. 쪽 여백·줄 간격·표 테두리까지 맞추려면 한글에서 HWPX로 저장한 양식을 쓸 것");
    } else warnings.push("양식 HWP가 암호·배포용이라 서식을 못 읽음. 프리셋 서식으로 만듦");
  }
  fs.writeFileSync(String(opt.out), bytes);
  const v = await k.validateHwpx(Buffer.from(bytes)).catch((e: unknown) => ({ ok: false, error: String(e) }));
  console.log(JSON.stringify({ out: opt.out, validate: (v as { ok?: boolean }).ok ?? v, warnings }, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
