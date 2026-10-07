// PORTED FROM the archived upstream skill tree/tools/report-writer.ts:91-122 (500-cap + coverage) + :965-1003 (stripBeforeSeal) + :1005-1117 (N-versioning write path)
// OMP SEAM ADAPTATION — LOGIC ONLY. CUT: the network generation contract
// (GENERATION_MODEL/PROVIDER/TOKENS/STREAM, StreamFetch transport, the
// single-provider chain + retry, the chunked/batch assembly, the SSE parser),
// the likec4 splice (ArchitectureDiagrams + buildArchitectureDiagrams), the
// plugin tool wrapper (createReportWriterTool — banned import), and the prompt
// assembly (buildGenerationPrompt — consumed only by the cut network call, so
// "if needed" resolves to NOT needed). KEPT: MAX_REPORT_FINDINGS (the
// operator's 2026-08-14 contract — the report renders the RANKED ACTIONABLE
// CORE, the FULL set stays in the store), reportCoverage (the capped header
// metadata), stripBeforeSeal (the thinking-strip, verbatim), N-versioning
// (bug_hunter_report_v<N>.md, never overwrite — delegated to the REAL harness
// writer writeReportDirect in ../harness/report.ts, the LOCKED MASTER_CONTEXT
// path). Every fallback prints its token+reason loudly, never silent.
import fs from "node:fs";
import { writeReportDirect } from "../harness/report.ts";
import type { ReportFinding, ReportWriterInput, ReportWriterResult } from "../harness/types.ts";

/** THE REPORT'S ACTIONABLE FINDINGS CAP (fork report-writer.ts:91-103 — the
 *  2026-08-14 host-test fix: "5 HOURS FOR A FUCKING REPORT IS NOT FUCKING
 *  REALISTIC"). The report renders the top-N findings by rank + the full count
 *  + the class distribution; the FULL set stays in the hunt store (the truth),
 *  queryable via the structural verbs. One batch's worth (~1M chars) → a
 *  single bounded local assembly instead of the multi-hour dump. */
export const MAX_REPORT_FINDINGS = 500;

/** THE REPORT'S FULL COUNT + CLASS DISTRIBUTION (fork report-writer.ts:112-122,
 *  verbatim) — the header metadata for the capped report: the reader sees the
 *  full scale + the per-class breakdown without the multi-hour dump. */
export function reportCoverage(findings: ReportFinding[]): { total: number; byRule: Record<string, number> } {
  const byRule: Record<string, number> = {};
  for (const f of findings) {
    const cls = f.rule.split(":")[0];
    byRule[cls] = (byRule[cls] ?? 0) + 1;
  }
  return { total: findings.length, byRule };
}

/** ★ F-913 FIX (2026-09-24): fence-aware heading scan — /^#{1,6} / matched inside fenced code blocks, so the no-H1 promotion path promoted a fence heading (proven: "```json\n## Fenced-Only" → "# Fenced-Only"). Lines inside ```/~~~ fences are skipped; fence-free input is byte-identical to s.search. */
function headingIdxOutsideFence(s: string, re: RegExp): number {
  const lines = s.split("\n");
  let offset = 0;
  let inFence = false;
  let fenceChar = "";
  for (const line of lines) {
    const fence = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      const ch = fence[1]?.[0] ?? "";
      if (!inFence) { inFence = true; fenceChar = ch; }
      else if (ch === fenceChar) { inFence = false; fenceChar = ""; }
    } else if (!inFence && re.test(line)) {
      return offset;
    }
    offset += line.length + 1;
  }
  return -1;
}

/** THE THINKING STRIP (fork report-writer.ts:959-986, verbatim) — removes (a)
 *  <think>…</think> blocks and (b) any leading meta-commentary before the
 *  FIRST '# ' heading (the deliberation class), then the caller asserts the
 *  sealed artifact starts with '# '. Body content mentioning thinking stays
 *  intact — only the preamble is stripped. */
export function stripBeforeSeal(raw: string): string {
  let s = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
  s = s.replace(/<think>[\s\S]*$/gi, "");
  let idx = headingIdxOutsideFence(s, /^# /);
  if (idx === -1) {
    // THE DEEP-HEADING PROMOTION (2026-09-06 — the ST-1 live catch): content
    // written entirely at ###-depth gets its FIRST deeper heading promoted to
    // '# ' so the seal contract (a titled report) holds without a
    // re-generation round-trip. The preamble before it is still stripped.
    const deepIdx = headingIdxOutsideFence(s, /^#{2,6} /);
    if (deepIdx !== -1) {
      const before = s.slice(0, deepIdx);
      const after = s.slice(deepIdx).replace(/^#{2,6}[ ]?/, "# ");
      s = before + after;
      idx = headingIdxOutsideFence(s, /^# /);
    }
  }
  if (idx === -1) return s.trim();
  return s.slice(idx).trimStart();
}

/** THE LOCAL REPORT ASSEMBLY — the network call replaced by the harness's own
 *  local markdown writer. Caps the findings at MAX_REPORT_FINDINGS (loud
 *  REPORT_CAPPED with the full coverage, never a silent truncation), delegates
 *  the N-versioned write to writeReportDirect, then applies the thinking-strip
 *  read-back (mirrors the report actor's seal — idempotent on direct output,
 *  which already starts with '# '). Matches the ReportWriter seam so it plugs
 *  straight into createMicroLoop + spawnBugHunterLoop. */
export async function generateLocalReport(input: ReportWriterInput): Promise<ReportWriterResult> {
  let findings = input.findings;
  let sections = input.sections;
  if (findings.length > MAX_REPORT_FINDINGS) {
    const cov = reportCoverage(findings);
    console.error(
      `[report-writer-local] REPORT_CAPPED reason=operator-500-cap findings=${cov.total} rendered=${MAX_REPORT_FINDINGS} byRule=${JSON.stringify(cov.byRule)} (the FULL set stays in the hunt store — query it via the structural verbs, never a silent truncation)`,
    );
    // ★ R15: severity rank before truncation — the header promises 'RANKED ACTIONABLE CORE'
    // but the old code kept input order. CRIT>HIGH>MED>WARN, stable tie-break by original index.
    const severityRank: Record<string, number> = { CRIT: 0, HIGH: 1, MED: 2, WARN: 3 };
    // ★ R18-HIGH FIX (2026-09-25): the comment above promised "stable tie-break by original
    //   index" and the comparator did NOT implement it. The MAX_REPORT_FINDINGS cut is by
    //   POSITION, so with same-severity findings the survivors would depend on the sort
    //   engine's stability. The index is captured at map time and compared explicitly.
    const ranked = findings
      .map((f, idx) => [f, idx] as const)
      .sort((a, b) => ((severityRank[a[0].severity] ?? 99) - (severityRank[b[0].severity] ?? 99)) || (a[1] - b[1]))
      .map(([f]) => f);
    const keep = new Set(ranked.slice(0, MAX_REPORT_FINDINGS).map((f) => f.id));
    sections = sections.filter((s) => keep.has(s.finding_id));
    findings = ranked.slice(0, MAX_REPORT_FINDINGS);
  }
  // ★ F-34 FIX (2026-09-24): the writer throw (disk full/perm/missing dir) was an
  //   uncontextualized propagation — wrap with the named REPORT_WRITE_FAILED token
  //   naming the run so the caller can attribute the failure.
  let result: ReportWriterResult;
  try {
    result = await writeReportDirect({ ...input, findings, sections });
  } catch (e: unknown) {
    throw new Error(`REPORT_WRITE_FAILED: runId=${input.runId} detail=${e instanceof Error ? e.message : String(e)} (the N-versioned write failed — disk full, permission, or missing MASTER_CONTEXT)`);
  }
  // ★ F-74 FIX (2026-09-24): readFileSync/writeFileSync inside the async writer blocked the
  //   event loop for the whole read+write — the promise forms yield instead (fs.promises, no
  //   new import, same loud non-fatal strip contract).
  try {
    const raw = await fs.promises.readFile(result.reportPath, "utf-8");
    const stripped = stripBeforeSeal(raw);
    if (stripped !== raw) {
      // ★ F-555 FIX (2026-09-24): the empty-strip guard — a strip that yields nothing (the whole
      //   report was <think> blocks) must never seal an empty file over the landed report.
      if (stripped.trim().length === 0) {
        console.error(`[report-writer-local] stripBeforeSeal produced empty output for runId=${input.runId} — leaving original file intact to avoid data loss`);
      } else {
        await fs.promises.writeFile(result.reportPath, stripped, "utf-8");
        console.log(`[report-writer-local] thinking-strip applied — removed ${raw.length - stripped.length} chars of meta-commentary`);
      }
    }
  } catch (stripErr: unknown) {
    console.warn(`[report-writer-local] thinking-strip failed (non-fatal): ${stripErr instanceof Error ? stripErr.message : String(stripErr)}`);
  }
  return result;
}
