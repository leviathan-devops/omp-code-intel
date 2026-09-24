#!/usr/bin/env bun
// ★ THE RUN-N AUDIT AGGREGATOR — one command: the severity breakdown, the critical/high
//   extract, and the top files. Written so run 7 (and every later run) processes in seconds
//   instead of a hand-rolled python heredoc.
//
//   usage: bun scripts/audit-aggregate.ts /tmp/w7-audit.json [artifacts/w7-run7]
//
//   OUTPUT:
//     - stdout: parts, total comments, the severity breakdown, PASS/FAIL, the top files
//     - <prefix>-critical-high.txt: the [CRITICAL]/[HIGH] findings with line regions +
//       the reviewer's suggested code (the fix-wave source material)
const [auditPath, prefix] = [process.argv[2] ?? "/tmp/w7-audit.json", process.argv[3] ?? "artifacts/w7-run7"];

type Comment = {
  path?: string; content?: string; severity?: string; category?: string;
  start_line?: number; end_line?: number; existing_code?: string; suggestion_code?: string;
};
type Part = { part?: string; result?: { comments?: Comment[]; summary?: { files_reviewed?: number } } };

const raw = await Bun.file(auditPath).json() as Part[];
const all: Comment[] = [];
let empty = 0;
for (const row of raw) {
  const cs = row.result?.comments ?? [];
  if (cs.length === 0) empty += 1;
  all.push(...cs);
}

const sev: Record<string, number> = {};
for (const c of all) {
  const k = (c.severity ?? "(unlabeled)").toLowerCase();
  sev[k] = (sev[k] ?? 0) + 1;
}

console.log(`  parts: ${raw.length} · comments: ${all.length} · empty-file parts: ${empty}`);
console.log("  ── the severity breakdown ──");
for (const [k, v] of Object.entries(sev).sort((a, b) => b[1] - a[1])) console.log(`    ${k}: ${v}`);

const crit = sev["critical"] ?? 0;
const high = sev["high"] ?? 0;
console.log(`\n  ★ THE GATE: CRITICAL=${crit} HIGH=${high} → ${crit === 0 && high === 0 ? "PASS" : "FAIL"}`);

const byFile: Record<string, number> = {};
for (const c of all) byFile[c.path ?? "?"] = (byFile[c.path ?? "?"] ?? 0) + 1;
console.log("\n  ── the top files ──");
for (const [f, n] of Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 14)) {
  console.log(`    ${String(n).padStart(3)}  ${f}`);
}

// ── the blocking extract ─────────────────────────────────────────────────────
const lines: string[] = [];
let n = 0;
for (const c of all) {
  const s = (c.severity ?? "").toUpperCase();
  if (s !== "CRITICAL" && s !== "HIGH") continue;
  n += 1;
  lines.push(`[${s}] ${c.path ?? "?"}:${c.start_line ?? "?"}-${c.end_line ?? "?"} (${c.category ?? "?"})`);
  lines.push(`  ${(c.content ?? "").trim().slice(0, 700)}`);
  if (c.existing_code) lines.push(`  \`\`\`existing\n  ${c.existing_code.trim().slice(0, 400)}\n  \`\`\``);
  if (c.suggestion_code) lines.push(`  \`\`\`suggested\n  ${c.suggestion_code.trim().slice(0, 400)}\n  \`\`\``);
  lines.push("");
}
lines.push(`# total: ${n}`);
await Bun.write(`${prefix}-critical-high.txt`, lines.join("\n"));
console.log(`\n  ✓ the blocking list → ${prefix}-critical-high.txt (${n} findings)`);

// ── the slice builder (disjoint, N buckets) ──────────────────────────────────
const SLICES = Number(process.env.SLICES ?? 5);
const EXCLUDE = (process.env.EXCLUDE ?? "").split(",").filter(Boolean);
const byFile2: Record<string, Comment[]> = {};
for (const c of all) {
  if ((c.severity ?? "").toUpperCase() !== "HIGH") continue;
  const p = c.path ?? "?";
  if (EXCLUDE.includes(p)) continue;
  (byFile2[p] ??= []).push(c);
}
const files = Object.keys(byFile2).sort((a, b) => byFile2[b].length - byFile2[a].length);
const buckets: string[][] = Array.from({ length: SLICES }, () => []);
files.forEach((f, i) => buckets[i % SLICES].push(f));
for (let i = 0; i < SLICES; i += 1) {
  const out: string[] = [`# HIGH slice ${i + 1} — ${buckets[i].reduce((a, f) => a + byFile2[f].length, 0)} findings across ${buckets[i].length} files\n`];
  for (const f of buckets[i].slice().sort()) {
    out.push(`## ${f}`);
    for (const c of byFile2[f]) {
      out.push(`- **${f}:${c.start_line ?? "?"}-${c.end_line ?? "?"}** (${c.category ?? "?"})`);
      out.push(`  ${(c.content ?? "").trim()}`);
      if (c.existing_code) out.push(`  \`\`\`existing\n  ${c.existing_code.trim().slice(0, 400)}\n  \`\`\``);
      if (c.suggestion_code) out.push(`  \`\`\`suggested\n  ${c.suggestion_code.trim().slice(0, 400)}\n  \`\`\``);
    }
    out.push("");
  }
  await Bun.write(`${prefix}-slices/high-${i + 1}.md`, out.join("\n"));
}
console.log(`  ✓ ${SLICES} slices → ${prefix}-slices/ (${files.length} files)`);
