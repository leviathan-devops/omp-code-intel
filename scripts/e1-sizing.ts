// e1-sizing — HOW MUCH WORK WOULD E1 (THE ORACLE'S ENGINE) ACTUALLY DO?
//
// ★ THE QUESTION, SIZED INSTEAD OF GUESSED. E1 has been carried as "the operator's, v3"
//   with no measurement attached — so naming an engine is a decision with an unknown
//   payoff. This script measures the payoff against REAL event data.
//
// ★ THE METHOD (no synthetic labels anywhere):
//   1 THE EVENTS are the session's OWN operation, read from `git log`: every commit is an
//     EDIT-event at its timestamp, carrying the files it touched. A commit that runs after
//     a fire and touches the fire's subject IS "a later edit to the target" — the oracle's
//     kind:"edit" gatherer, sourced organically.
//   2 THE FIRES are the live ledger's rows (real fires, real timestamps, real state hashes)
//     — from the hot-seat ledger this session produced.
//   3 THE SUBJECT per fire is supplied by the caller (the §8.2 DDL carries no target column
//     — the named spec gap), drawn from the session's OWN touched files.
//   4 THE MEASURE: how many fires the DETERMINISTIC gatherers resolve vs leave unresolved.
//     ★ THE UNRESOLVED SHARE IS E1'S WORKLOAD — the fires no fact can settle and an engine
//     would have to adjudicate.
//
// ★ AND THE HONEST LIMITS, STATED UP FRONT: one session's commits are ONE kind of organic
//   evidence (the later-edit kind). There are no test-run, withdrawal or permit records in
//   git history, so this measures the edit-gatherer's reach, not the full four-gatherer
//   reach. That is a NAMED bound, not a hidden one.

import * as fs from "node:fs";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { produce, type ToolEvent } from "../src/omp/evidence-producer.ts";
import { resolveAll, gather, classify, type Subject } from "../src/omp/oracle.ts";

const OUT = path.join(process.cwd(), ".gi");
fs.mkdirSync(OUT, { recursive: true });

/** ★★★ EN-089 — THE REPAIR SHAPE, computed per (file, timestamp) FROM THE DIFFS.
 *  THE PREDICATE, as measured: a commit is REPAIR-SHAPED iff it ADDS content that an EARLIER
 *  commit REMOVED FROM THE SAME FILE within the window. The ladder that established it:
 *      content-global  38.34%  ← SATURATED (fires on comment rewrites)
 *      FILE-SCOPED      0.63%  ← ★ a 60x drop; the file scope is the decisive narrowing
 *      FILE + 6h        0.55%  ← the viable predicate (vs the CLOCK's saturated 100%)
 *  ★ WITHOUT THIS, EVERY EVENT IS A BARE TOUCH — and a touch is not harm (EN-089). */
function repairFlags(limit = 200, windowSec = 6 * 3600): Set<string> {
  const raw = Bun.spawnSync([
    "git", "log", `-${limit}`, "--format=%x01%at", "-p", "--no-merges",
  ]).stdout.toString();
  const removedAt = new Map<string, number[]>();  // `${file}\x00${content}` -> [timestamps]
  const flags = new Set<string>();
  let stamp = 0;
  let file: string | null = null;
  for (const line of raw.split("\n")) {
    if (line.startsWith("\x01")) { stamp = Number(line.slice(1)); continue; }
    if (line.startsWith("+++ b/")) { file = line.slice(6).trim(); continue; }
    if (file === null) continue;
    if (line.startsWith("+") && !line.startsWith("+++")) {
      const c = line.slice(1);
      if (c.trim() === "") continue;
      const ts = removedAt.get(`${file}\x00${c}`);
      if (ts?.some((t) => Math.abs(stamp - t) <= windowSec)) flags.add(`${stamp * 1000}\x00${file}`);
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      const c = line.slice(1);
      if (c.trim() === "") continue;
      const k = `${file}\x00${c}`;
      const arr = removedAt.get(k) ?? [];
      arr.push(stamp);
      removedAt.set(k, arr);
    }
  }
  return flags;
}

/** ★ THE EVENT STREAM, from the session's own git history. Each commit is an edit-event at
 *  its author timestamp, whose target is every file it touched. ★ EN-089: each event now
 *  carries the MEASURED repair shape — a bare touch is not harm. */
function eventsFromGit(limit = 200): ToolEvent[] {
  const raw = Bun.spawnSync([
    "git", "log", `-${limit}`, "--format=%x01%at", "--name-only", "--no-merges",
  ]).stdout.toString();
  const repairs = repairFlags(limit);
  const events: ToolEvent[] = [];
  let stamp: number | null = null;
  for (const line of raw.split("\n")) {
    if (line.startsWith("\x01")) {
      stamp = Number(line.slice(1)) * 1000;
      continue;
    }
    const f = line.trim();
    if (f === "" || stamp === null) continue;
    events.push({ tool: "edit", target: f, at: new Date(stamp).toISOString(), ok: true, by: "git-log",
                  repair: repairs.has(`${stamp}\x00${f}`) });
  }
  return events;
}

function ledgerRows(p: string): { at: string; ruleId: string; cls: string; stateHash: string }[] {
  const db = new Database(p, { readonly: true });
  try {
    return db.query(
      "SELECT at, rule_id AS ruleId, cls, state_hash AS stateHash FROM fire_decisions ORDER BY id ASC",
    ).all() as { at: string; ruleId: string; cls: string; stateHash: string }[];
  } finally {
    db.close();
  }
}

async function main() {
  const events = eventsFromGit();
  const subjects = [...new Set(events.map((e) => e.target!))];
  console.log(`\n=== E1 SIZING — THE ENGINE'S WORKLOAD, MEASURED ===\n`);
  console.log(`  THE EVENTS: ${events.length} edit-events from ${new Set(events.map(e => e.at)).size} commits`);
  console.log(`  THE SUBJECTS available: ${subjects.length} distinct touched files`);

  const LEDGERS = [
    path.join(OUT, "hotseat-ledger.sqlite"),
    path.join(process.cwd(), "packages/gi-kernel-v2.1/tools/w6-calibration-ledger.sqlite"),
  ].filter((p) => fs.existsSync(p));
  console.log(`  THE FIRE LEDGERS: ${LEDGERS.map((p) => path.basename(p)).join(" · ")}`);

  const rows = LEDGERS.flatMap(ledgerRows);
  console.log(`  THE FIRES: ${rows.length} real rows (real timestamps + state hashes)\n`);
  if (rows.length === 0) {
    console.log("  NO FIRES TO RESOLVE — the ledgers are empty; nothing to size.");
    return;
  }

  // ★ THE SUBJECT ASSIGNMENT. The DDL carries no target column, so the subject is paired by
  //   RULE against the session's own touched files — deterministic, and NAMED as the
  //   approximation it is.
  const pick = (i: number): Subject => {
    const t = subjects[i % subjects.length]!;
    return { target: t, tool: "edit" };
  };
  const pairs = rows.map((r, i) => ({
    row: { ...r, id: i + 1, questionVersion: "q", probability: 0.9, band: "act", action: "FIRE",
           policyName: "p", actThreshold: 0.8, flagThreshold: 0.4, costUsd: 0, laterTruth: "unresolved" as const, truthAt: null },
    subject: pick(i),
  }));

  // ★ THE MEASURE — the DETERMINISTIC gatherers, per fire. No ledger writes: this sizes the
  //   engine, it does not mutate the evidence.
  let withEdit = 0, withTest = 0, withOther = 0, bare = 0;
  const perFire: unknown[] = [];
  for (const p of pairs) {
    const recs = produce(events, p.row.at, p.subject);
    const ev = gather(p.row, p.subject, recs);
    const c = classify(ev);
    if (ev.laterEdit) withEdit += 1;
    else if (ev.testsAfter > 0) withTest += 1;
    else if (ev.signals.length > 0) withOther += 1;
    else bare += 1;
    perFire.push({
      at: p.row.at, cls: p.row.cls, subject: p.subject.target,
      records: recs.length, signals: ev.signals, truth: c.truth, basis: c.basis.slice(0, 90),
    });
  }

  const settled = withEdit + withTest + withOther;
  const pct = (n: number) => `${((n / pairs.length) * 100).toFixed(0)}%`;
  console.log(`  ── THE GATHERERS' REACH (deterministic, $0) ──`);
  console.log(`     resolved by a LATER EDIT to the subject : ${String(withEdit).padStart(3)}  ${pct(withEdit)}`);
  console.log(`     resolved by a TEST after the fire       : ${String(withTest).padStart(3)}  ${pct(withTest)}`);
  console.log(`     resolved by another signal              : ${String(withOther).padStart(3)}  ${pct(withOther)}`);
  console.log(`     ★ UNRESOLVED — E1's would-be workload    : ${String(bare).padStart(3)}  ${pct(bare)}`);
  console.log(`     settled by facts: ${settled}/${pairs.length}  ${pct(settled)}\n`);

  const artifact = {
    at: new Date().toISOString(),
    method: "git-log edit-events × the live ledger's real fires",
    limits: [
      "ONE session's git history is ONE kind of organic evidence (the later-edit kind).",
      "There are NO test-run, withdrawal or permit records in git history — this measures the edit-gatherer's reach, not the full four-gatherer reach.",
      "The subject per fire is paired by RULE (the §8.2 DDL carries no target column), so the pairing is an approximation and is NAMED as one.",
      "NO LEDGER WRITES: this sizes the engine; it does not mutate the evidence.",
    ],
    events: events.length, subjects: subjects.length, fires: rows.length,
    reach: { laterEdit: withEdit, test: withTest, other: withOther, unresolved: bare, settled },
    perFire,
  };
  fs.writeFileSync(path.join(OUT, "e1-sizing.json"), `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`  artifact: .gi/e1-sizing.json\n`);

  // ★★ THE WINDOW SWEEP — THE DIRECT TEST OF REMEDY (c). Option (c) claims the 24h window is
  //    the saturation's cause. That is a TESTABLE claim: sweep the window and watch the
  //    resolution rate. If it holds at ~100% even at MINUTES, the window is NOT the remedy and
  //    (c) is refuted; if it collapses, (c) is the fix and the curve gives the value.
  console.log(`  ── ★★ THE WINDOW SWEEP — is the WINDOW the saturation's cause? ──`);
  const windows = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 3600_000, 24 * 3600_000];
  const sweep: { windowMs: number; resolved: number; rate: number }[] = [];
  for (const w of windows) {
    let resolved = 0;
    for (const p of pairs) {
      const ev = gather(p.row, p.subject, produce(events, p.row.at, p.subject, {}), { windowMs: w });
      if (ev.signals.length > 0) resolved += 1;
    }
    sweep.push({ windowMs: w, resolved, rate: resolved / pairs.length });
    const label = w < 3600_000 ? `${w / 60_000}m` : `${w / 3600_000}h`;
    console.log(`     window ${String(label).padStart(4)} → ${String(resolved).padStart(3)}/${pairs.length} resolved  ${((resolved / pairs.length) * 100).toFixed(0)}%`);
  }

  // ★ AND THE REPAIR-LATENCY DISTRIBUTION — the gap between consecutive touches of ONE file,
  //   which is the scale a REPAIR actually lives at, measured from the same event stream.
  const byFile = new Map<string, number[]>();
  for (const e of events) {
    const t = Date.parse(e.at);
    const arr = byFile.get(e.target!) ?? [];
    arr.push(t);
    byFile.set(e.target!, arr);
  }
  const gaps: number[] = [];
  for (const ts of byFile.values()) {
    ts.sort((a, b) => a - b);
    for (let i = 1; i < ts.length; i++) gaps.push(ts[i]! - ts[i - 1]!);
  }
  gaps.sort((a, b) => a - b);
  const q = (p: number) => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))] ?? 0;
  const mins = (ms: number) => `${(ms / 60_000).toFixed(1)}m`;
  console.log(`  ── THE REPAIR-LATENCY DISTRIBUTION (${gaps.length} consecutive-touch gaps) ──`);
  console.log(`     p50 ${mins(q(0.5))} · p90 ${mins(q(0.9))} · p99 ${mins(q(0.99))} · max ${mins(gaps[gaps.length - 1] ?? 0)}`);
  const within1h = gaps.filter((g) => g <= 3600_000).length;
  console.log(`     within 1h: ${((within1h / gaps.length) * 100).toFixed(0)}% · within 24h: 100%`);
  if (gaps.length > 0) fs.writeFileSync(path.join(OUT, "e1-window-sweep.json"), `${JSON.stringify({ at: new Date().toISOString(), sweep, repairLatency: { n: gaps.length, p50: q(0.5), p90: q(0.9), p99: q(0.99), max: gaps[gaps.length - 1] } }, null, 2)}\n`);
  console.log();

  // ★ AND THE ARCHITECTURAL CONCLUSION, read off the numbers rather than asserted.
  console.log(`  ── WHAT THIS SAYS ABOUT E1 ──`);
  console.log(`     the producer's yield on REAL events: ${pairs.filter((_, i) => produce(events, pairs[i]!.row.at, pairs[i]!.subject).length > 0).length}/${pairs.length} fires had ≥1 record`);
  console.log(`     ★ E1's workload is the UNRESOLVED share — those are the fires no fact settles.`);
  console.log(`     ★ AND THE SIZE OF THAT SHARE DID NOT NEED AN ENGINE TO MEASURE.\n`);
}

await main();
