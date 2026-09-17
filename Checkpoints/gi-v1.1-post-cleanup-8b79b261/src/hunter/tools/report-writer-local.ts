// PORTED FROM fork-v143/live-tree/graph-intelligence/subagents/trident-bug-hunter/tools/report-writer.ts:91-122 (500-cap + coverage) + :965-1003 (stripBeforeSeal) + :1005-1117 (N-versioning write path)
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

/** THE THINKING STRIP (fork report-writer.ts:959-986, verbatim) — removes (a)
 *  <think>…</think> blocks and (b) any leading meta-commentary before the
 *  FIRST '# ' heading (the deliberation class), then the caller asserts the
 *  sealed artifact starts with '# '. Body content mentioning thinking stays
 *  intact — only the preamble is stripped. */
export function stripBeforeSeal(raw: string): string {
  let s = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
  s = s.replace(/<think>[\s\S]*$/gi, "");
  let idx = s.search(/^# /m);
  if (idx === -1) {
    // THE DEEP-HEADING PROMOTION (2026-09-06 — the ST-1 live catch): content
    // written entirely at ###-depth gets its FIRST deeper heading promoted to
    // '# ' so the seal contract (a titled report) holds without a
    // re-generation round-trip. The preamble before it is still stripped.
    const deepIdx = s.search(/^#{2,6} /m);
    if (deepIdx !== -1) {
      const before = s.slice(0, deepIdx);
      const after = s.slice(deepIdx).replace(/^#{2,6}[ ]?/, "# ");
      s = before + after;
      idx = s.search(/^# /m);
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
    const keep = new Set(findings.slice(0, MAX_REPORT_FINDINGS).map((f) => f.id));
    sections = sections.filter((s) => keep.has(s.finding_id));
    findings = findings.slice(0, MAX_REPORT_FINDINGS);
  }
  const result = await writeReportDirect({ ...input, findings, sections });
  try {
    const raw = fs.readFileSync(result.reportPath, "utf-8");
    const stripped = stripBeforeSeal(raw);
    if (stripped !== raw) {
      fs.writeFileSync(result.reportPath, stripped, "utf-8");
      console.log(`[report-writer-local] thinking-strip applied — removed ${raw.length - stripped.length} chars of meta-commentary`);
    }
  } catch (stripErr: unknown) {
    console.warn(`[report-writer-local] thinking-strip failed (non-fatal): ${stripErr instanceof Error ? stripErr.message : String(stripErr)}`);
  }
  return result;
}
