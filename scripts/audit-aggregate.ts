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
// ★★★ THE INSTRUMENT GATE'S FALSE-POSITIVE CLASS — FIXED (2026-09-25). The original
//   `empty = comments.length === 0` conflated THREE DISTINCT STATES and so fired on the
//   BEST possible outcome:
//     1. INSTRUMENT DEAD — the part is the EMPTY_RESULT marker (or 0 bytes): the lane
//        produced NOTHING. This is the ONLY state that may void a run.
//     2. CLEAN REVIEW — `status:"success"` with 0 comments (`"No comments generated.
//        Looks good to me."`, files_reviewed:1, tokens spent). The reviewer READ the file
//        and found nothing. Under the operator's stop ("0 critical / 0 high") this is the
//        GOAL STATE — flagging it VOID makes a clean tree unreachable by construction.
//     3. OUT OF SCOPE — `status:"skipped"` (`"No supported files changed."`): the ocr CLI
//        scopes to git-CHANGED paths, so a committed-clean tree answers "skipped". Scope,
//        not breakage.
//   Only state 1 counts toward the empty ratio.
let empty = 0;   // the instrument-dead count (the only one the gate may act on)
let clean = 0;   // reviewed, zero findings
let skipped = 0; // out of the CLI's scope, never scanned
for (const row of raw) {
  const r = row.result as { comments?: Comment[]; status?: string; note?: string } | undefined;
  const cs = r?.comments ?? [];
  const isMarker = r?.note === "EMPTY_RESULT" || (cs.length === 0 && (r?.status === undefined && r?.note === undefined));
  if (isMarker) empty += 1;
  else if (cs.length === 0 && r?.status === "skipped") skipped += 1;
  else if (cs.length === 0) clean += 1;
  all.push(...cs);
}

const sev: Record<string, number> = {};
for (const c of all) {
  const k = (c.severity ?? "(unlabeled)").toLowerCase();
  sev[k] = (sev[k] ?? 0) + 1;
}

console.log(`  parts: ${raw.length} · comments: ${all.length}`);
console.log(`  ★ THE INSTRUMENT: ${empty} instrument-dead · ${clean} CLEAN REVIEWS (read, zero findings) · ${skipped} out-of-scope (skipped)`);
// ★ F-607 (2026-09-24): THE INSTRUMENT GATE. A run whose parts are mostly the EMPTY_RESULT
//   marker measured a DEAD LANE, not a clean tree — run 9 reported "1 critical / 2 high" with
//   108 of 113 parts empty (a lapsed Go subscription returned 0 bytes on every scan). A low
//   finding count from a dead instrument is the most dangerous output this tool can produce,
//   so it REFUSES rather than reporting. `AUDIT_INSTRUMENT_DEAD` names the failure.
const emptyRatio = raw.length === 0 ? 1 : empty / raw.length;
if (emptyRatio > 0.2) {
  console.error(`\n  ✗ AUDIT_INSTRUMENT_DEAD: ${empty} of ${raw.length} parts (${Math.round(emptyRatio * 100)}%) are EMPTY_RESULT markers — the scan lane produced no bytes. THIS RUN IS VOID: verify the provider lane (go-pool-ctl snapshot + a live completion) before quoting any number.`);
  process.exit(2);
}
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
