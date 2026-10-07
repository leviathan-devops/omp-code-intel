#!/usr/bin/env bun
// wta-artifact — turn the whole-tree audit's raw parts into artifacts/whole-tree-audit.json
// in the shape the st-w3-audit-coverage test reads (files_scanned, by_severity, AUDIT GATE).
// usage: bun scripts/wta-artifact.ts /tmp/wta-v3.json artifacts/whole-tree-audit.json
import * as fs from "node:fs";
import * as path from "node:path";
const [rawPath, outPath] = [process.argv[2] ?? "/tmp/wta-v3.json", process.argv[3] ?? "artifacts/whole-tree-audit.json"];
const parts = JSON.parse(fs.readFileSync(rawPath, "utf8")) as Array<{ part?: string; result?: { comments?: Array<{ severity?: string }>; note?: string } }>;
const liveSrc = (() => { const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]); return walk("src").filter((f) => f.endsWith(".ts")); })();
let comments = 0, withResult = 0, empty = 0;
const bySeverity: Record<string, number> = {};
const blocking: Array<{ path: string; severity: string; content: string }> = [];
for (const p of parts) {
  const cs = p.result?.comments ?? [];
  if (p.result?.note === "EMPTY_RESULT" || cs.length === 0) { empty++; continue; }
  withResult++;
  for (const c of cs) {
    comments++;
    const sev = (c.severity ?? "?").toUpperCase();
    bySeverity[sev] = (bySeverity[sev] ?? 0) + 1;
    if (sev === "CRITICAL" || sev === "HIGH") blocking.push({ path: (c as { path?: string }).path ?? "?", severity: sev, content: ((c as { content?: string }).content ?? "").slice(0, 300) });
  }
}
const crit = bySeverity.CRITICAL ?? 0, high = bySeverity.HIGH ?? 0;
// ★ THE GATE LINE (V2.2, 2026-09-26): a run with EMPTY_RESULT parts is DEGRADED — its gate is
//   BLOCKED (never PASS), because the lane rate-limited and the scan is incomplete. A clean
//   run reads PASS/FAIL on the critical/high counts. The degradation is always NAMED.
const degraded = empty > 0;
const gateLine = degraded
  ? `BLOCKED (degraded run — ${empty}/${parts.length} parts EMPTY_RESULT, rate-limited; among the ${withResult} reviewed: ${crit} critical, ${high} high)`
  : crit === 0 && high === 0 ? "PASS (0 critical, 0 high)" : `FAIL (${crit} critical, ${high} high)`;
const artifact = {
  files_scanned: parts.length,
  files_with_a_result: withResult,
  empty_result_parts: empty,
  total_comments: comments,
  by_severity: bySeverity,
  "★ AUDIT GATE (the whole tree)": gateLine,
  the_blocking_findings: blocking.slice(0, 100),
  run: "wta-v3",
  provider: "muse-free",
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));
console.log(`wta-artifact: ${parts.length} parts · ${comments} comments · gate: ${artifact["★ AUDIT GATE (the whole tree)"]} → ${outPath}`);
console.log(`  live src: ${liveSrc.length} · coverage: ${parts.length}/${liveSrc.length}`);
