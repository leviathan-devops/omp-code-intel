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

const OUT = path.join(process.cwd(), ".trident");
fs.mkdirSync(OUT, { recursive: true });

/** ★ THE EVENT STREAM, from the session's own git history. Each commit is an edit-event at
 *  its author timestamp, whose target is every file it touched. */
function eventsFromGit(limit = 200): ToolEvent[] {
  const raw = Bun.spawnSync([
    "git", "log", `-${limit}`, "--format=%x01%at", "--name-only", "--no-merges",
  ]).stdout.toString();
  const events: ToolEvent[] = [];
  let stamp: number | null = null;
  for (const line of raw.split("\n")) {
    if (line.startsWith("\x01")) {
      stamp = Number(line.slice(1)) * 1000;
      continue;
    }
    const f = line.trim();
    if (f === "" || stamp === null) continue;
    events.push({ tool: "edit", target: f, at: new Date(stamp).toISOString(), ok: true, by: "git-log" });
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
  console.log(`  artifact: .trident/e1-sizing.json\n`);

  // ★ AND THE ARCHITECTURAL CONCLUSION, read off the numbers rather than asserted.
  console.log(`  ── WHAT THIS SAYS ABOUT E1 ──`);
  console.log(`     the producer's yield on REAL events: ${pairs.filter((_, i) => produce(events, pairs[i]!.row.at, pairs[i]!.subject).length > 0).length}/${pairs.length} fires had ≥1 record`);
  console.log(`     ★ E1's workload is the UNRESOLVED share — those are the fires no fact settles.`);
  console.log(`     ★ AND THE SIZE OF THAT SHARE DID NOT NEED AN ENGINE TO MEASURE.\n`);
}

await main();
