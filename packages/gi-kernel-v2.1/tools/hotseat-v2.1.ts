// hotseat-v2.1 — P4: THE RUNTIME SEAT.
//
// ★ THE STANCE, DECLARED IN WRITING: **I am the driver of the GI Kernel v2.1 fire gate
//   as deployed at dist sha 83eb7bba, driven through the live JevJudge against
//   api.typesafe.ai.** Not a test harness around it — the real object, the real model,
//   the real ledger on disk.
//
// THE PIN'S DISCIPLINE: every op is numbered, carries a PRE-REGISTERED expectation, and
// has an evidence channel. Every break is the deliverable. ZERO BUGS IS A RED FLAG, so
// this driver pushes deliberately: N at once, kill mid-operation, the legit path twice,
// starve it, hostile input.
//
// H6 THE RUNTIME LEDGER: what RUNNING teaches that READING cannot. Every entry is
// appended to .mimocode/runtime-grade/ as it is found.

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { FireGate, absorbContext, advisory, type Fire, type StreamRecord } from "../../../src/omp/fire-gate.ts";
import { JevJudge } from "../../../src/omp/jev.ts";
import { FireLedger, drain, withLedger } from "../../../src/omp/fire-ledger.ts";
import { classify, gather, resolveAll } from "../../../src/omp/oracle.ts";
import { PolicyStore, DEFAULT_POLICY_FILE, writePolicyFile } from "../../../src/omp/policy-store.ts";
import { runKernelV2Gated, type KernelInput, fileLayer, type LayerDeclaration } from "../../../src/omp/kernel-v2.ts";

const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..", ".mimocode", "runtime-grade");
fs.mkdirSync(OUT, { recursive: true });
const LEDGER = path.join(OUT, "hotseat-ledger.sqlite");
try { fs.unlinkSync(LEDGER); } catch { /* fresh */ }

const findings: { op: string; expected: string; actual: string; verdict: string; mechanism?: string; fix?: string }[] = [];
function record(op: string, expected: string, actual: string, verdict: string, mechanism?: string, fix?: string) {
  findings.push({ op, expected, actual, verdict, mechanism, fix });
  console.log(`${verdict === "BREAK" ? "✗ BREAK" : verdict === "OK" ? "✓ OK   " : "· NOTE "} ${op}\n        expected: ${expected}\n        actual:   ${actual}`);
}

function tmpLayer(id: LayerDeclaration["id"], dep: string, code: string): LayerDeclaration {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "hs-")), "present");
  fs.writeFileSync(f, "x");
  return fileLayer(id, dep, code, f);
}
const ALL_UP = (): LayerDeclaration[] => [
  tmpLayer("L1_SEMANTICA", "semantica index", "GI_LAYER_SEMANTICA"),
  tmpLayer("L2_ARSUMBRIS", "au daemon socket", "GI_LAYER_ARSUMBRIS"),
  tmpLayer("L3_UA", "ua graph json", "GI_LAYER_UA"),
  tmpLayer("L4_C2KG", "c2kg lsp index", "GI_LAYER_C2KG"),
  tmpLayer("L5_CORBELL", "corbell checkout", "GI_LAYER_CORBELL"),
  tmpLayer("L6_GRAPHIFY", "graphify graph.json", "GI_LAYER_GRAPHIFY"),
];
const NEUTRAL: StreamRecord[] = [{ kind: "reasoning", text: "because the file is next", offsetMs: -100 }];
function aFire(over: Partial<Fire> = {}): Fire {
  return { ruleId: "*dumb", cls: "dumb", shape: "blind edit", tool: "edit", target: "src/omp/kernel-v2.ts", evidence: "queriedBefore=false", ...over };
}

async function main() {
  // ══ H1 — THE REAL INSTANCE ═══════════════════════════════════════════════════
  const ledger = new FireLedger(LEDGER);
  const judge = new JevJudge({ timeoutMs: 8000 });
  const gate = new FireGate({ judge });
  console.log(`\n=== H1 THE INSTANCE ===`);
  console.log(`  driver:    the GI Kernel v2.1 fire gate (src/omp/fire-gate.ts, 590+ L module set)`);
  console.log(`  judge:     JevJudge → api.typesafe.ai (the live Noul)`);
  console.log(`  ledger:    ${LEDGER}`);
  console.log(`  policy:    SEED_POLICY (dumb act=0.75 · theatrical 0.85 · destructive 0.90)`);
  console.log(`  pid:       ${process.pid}`);

  // ══ H2 OP 1 — THE BASELINE FIRE (pre-registered: p in (0,1), one row) ═════════
  const t1 = Date.now();
  const f1 = aFire();
  const d1 = await gate.judge(f1, absorbContext(f1, NEUTRAL));
  const ms1 = Date.now() - t1;
  record("OP-1 baseline fire",
    "a probability in (0,1) and exactly one row",
    `p=${d1.probability} band=${d1.band} action=${d1.action} ${ms1}ms`,
    d1.probability > 0 && d1.probability < 1 ? "OK" : "NOTE");
  drain(gate, ledger);
  record("OP-1b the row persisted", "1 row", `${ledger.count()} row(s)`, ledger.count() === 1 ? "OK" : "BREAK");

  // ══ H4 PUSH 1 — N AT ONCE (concurrency) ══════════════════════════════════════
  // PRE-REGISTERED: N concurrent fires through ONE gate must each leave exactly one
  // row, and the cache must not collapse distinct states into one judgment.
  const N = 8;
  const before = ledger.count();
  const results = await Promise.all(
    Array.from({ length: N }, (_, i) => {
      const f = aFire({ evidence: `queriedBefore=false concurrent=${i}` });   // DISTINCT states
      return gate.judge(f, absorbContext(f, NEUTRAL));
    }),
  );
  drain(gate, ledger);
  const after = ledger.count();
  const distinctProbs = new Set(results.map((r) => r.probability)).size;
  record(`H4-1 ${N} fires at once (distinct states)`,
    `${N} new rows; the ledger never loses one under concurrency`,
    `${after - before} new rows (expected ${N}); ${distinctProbs} distinct probabilities`,
    after - before === N ? "OK" : "BREAK",
    after - before === N ? undefined : "a concurrent fire's row was lost or duplicated");

  // ══ H4 PUSH 2 — THE LEGIT PATH TWICE (the cache) ═════════════════════════════
  // PRE-REGISTERED: the SAME state judged twice must hit the cache and pay once.
  const callsBefore = gate.firesUsed();
  const dup = aFire({ evidence: "queriedBefore=false duplicated-state" });
  const dA = await gate.judge(dup, absorbContext(dup, NEUTRAL));
  const dB = await gate.judge(dup, absorbContext(dup, NEUTRAL));
  const callsAfter = gate.firesUsed();
  record("H4-2 the legit path twice (same state)",
    "the second judgment is a CACHE HIT and costs no fire",
    `first cached=${dA.cached} · second cached=${dB.cached} · firesUsed ${callsBefore}→${callsAfter} · sameHash=${dA.row.stateHash === dB.row.stateHash}`,
    dB.cached === true && callsAfter - callsBefore === 1 ? "OK" : "BREAK",
    dB.cached === true ? undefined : "the cache did not hit on an identical state");

  // ══ H4 PUSH 3 — STARVE IT (budget exhausted) ═════════════════════════════════
  // PRE-REGISTERED: a spent budget THROWS (D017) and the throw is NAMED.
  const starved = new FireGate({ judge, budgetFires: 0 });
  let starveMsg = "";
  try { await starved.judge(aFire({ evidence: "starved" }), absorbContext(aFire(), NEUTRAL)); }
  catch (e) { starveMsg = e instanceof Error ? e.message : String(e); }
  record("H4-3 starve the budget (budgetFires=0)",
    "a named throw: GI_FIREGATE_BUDGET",
    starveMsg === "" ? "NO THROW" : starveMsg.slice(0, 90),
    starveMsg.includes("GI_FIREGATE_BUDGET") ? "OK" : "BREAK",
    starveMsg.includes("GI_FIREGATE_BUDGET") ? undefined : "a spent budget did not raise the named token");

  // ══ H4 PUSH 4 — HOSTILE INPUT ════════════════════════════════════════════════
  const hostile: { name: string; fire: Fire }[] = [
    { name: "a 200KB evidence string", fire: aFire({ evidence: "x".repeat(200_000) }) },
    { name: "unicode + control chars", fire: aFire({ evidence: "ev\x00\x1b[31m\u202e\u0007id" }) },
    { name: "an empty target", fire: aFire({ target: "" }) },
    { name: "a 10KB target", fire: aFire({ target: "a/".repeat(5_000) + "x.ts" }) },
    { name: "an unknown class", fire: aFire({ cls: "banana", ruleId: "*banana" }) },
  ];
  for (const h of hostile) {
    let outcome = "";
    let verdict = "OK";
    try {
      const d = await gate.judge(h.fire, absorbContext(h.fire, NEUTRAL));
      outcome = `p=${d.probability} band=${d.band} action=${d.action} policy=${d.row.policyName}`;
    } catch (e) { outcome = `THREW: ${(e instanceof Error ? e.message : String(e)).slice(0, 90)}`; }
    // a hostile input must produce a DECISION or a NAMED throw — never a hang, never silence
    if (outcome === "") { verdict = "BREAK"; outcome = "no outcome (a hang or a silent no-op)"; }
    record(`H4-4 hostile: ${h.name}`, "a decision or a NAMED throw — never a hang or silence", outcome, verdict);
  }
  drain(gate, ledger);

  // ══ H4 PUSH 5 — KILL MID-OPERATION (a judge that never answers) ══════════════
  // a judge that NEVER settles — the deliberate hang (Promise.withResolvers keeps the
  // resolver unexposed: nothing in this process can complete it).
  // ★ THE RETEST ASSERTS THE NEW CONTRACT. The first run proved the gate HAD no ceiling;
  //   the fix gave it one (DEFAULT_JUDGE_TIMEOUT_MS). This probe passes a SHORT ceiling
  //   and asserts the gate RETURNS with the timeout named — the probe's own 6s window was
  //   shorter than the 10s default, which is why the first retest still read as a hang.
  const neverSettles = Promise.withResolvers<never>().promise;
  const hung = new FireGate({
    judge: { async evaluate() { return await neverSettles; } },
    budgetFires: 5,
    judgeTimeoutMs: 1_500,
  });
  const killStart = Date.now();
  const killResult = await Promise.race([
    hung.judge(aFire({ evidence: "hung" }), absorbContext(aFire(), NEUTRAL))
      .then((d) => `returned: action=${d.action} policy=${d.row.policyName}`)
      .catch((e) => `threw: ${String(e).slice(0, 60)}`),
    Promise.withResolvers<string>().promise.then(() => "unreachable"),   // never resolves; the race is won by the gate
    (async () => { await Bun.sleep(8_000); return "STILL HANGING after 8s"; })(),
  ]);
  record("H4-5 kill mid-operation (a judge that never resolves)",
    "the GATE's own ceiling fires — it returns with the timeout NAMED, well under the 8s probe window",
    `${killResult} (waited ${Date.now() - killStart}ms)`,
    killResult.startsWith("STILL HANGING") ? "BREAK" : "OK",
    killResult.startsWith("STILL HANGING") ? "the gate still has no effective ceiling" : undefined,
    killResult.includes("+timeout") ? "the gate's own ceiling fired and the degradation is named +timeout" : undefined);

  // ══ H4 PUSH 6 — THE WIRED PATH END-TO-END (position B, live) ═════════════════
  const vi: KernelInput = {
    toolName: "goal.complete", target: "migration", queriedBefore: true,
    claims: [{ text: "the migration is complete and all tests pass", spans: 0 }],
    certifications: [{ layer: "L5_CORBELL", verdict: "PASS", reason: "in scope" }],
    layers: ALL_UP(),
  };
  const gatedRun = await runKernelV2Gated(vi, gate);
  record("H4-6 the WIRED path, live (a real violation through position B)",
    "preGate=REFUSE and a real adjudication from the live model",
    `preGate=${gatedRun.preGateVerdict} verdict=${gatedRun.verdict} adj=${gatedRun.adjudication?.action ?? "none"} p=${gatedRun.adjudication?.probability ?? "-"}`,
    gatedRun.preGateVerdict === "REFUSE" && gatedRun.adjudication !== null ? "OK" : "BREAK");

  // ══ H4 PUSH 7 — THE ORACLE ON THE BATTERED LEDGER ════════════════════════════
  drain(gate, ledger);
  const all = ledger.all();
  const subject = { target: "src/omp/kernel-v2.ts" };
  const recs = [{ kind: "edit" as const, at: new Date(Date.now() + 60_000).toISOString(), target: subject.target }];
  const rep = resolveAll(ledger, all.map((r) => ({ row: r, subject })), recs);
  record("H4-7 resolve the whole battered ledger",
    "every unresolved row is either resolved or counted — no silent skip",
    `rows=${all.length} resolved=${rep.resolved} leftUnresolved=${rep.leftUnresolved} alreadyResolved=${rep.alreadyResolved} phantom=${rep.phantom} contended=${rep.contended} failed=${rep.failed.length}`,
    rep.resolved + rep.leftUnresolved + rep.alreadyResolved + rep.phantom + rep.contended + rep.failed.length === all.length ? "OK" : "BREAK",
    "the SIX counters must PARTITION the input — if they do not sum, a row was silently dropped");

  // ══ H4 PUSH 8 — A SECOND DRAIN (idempotency on a live ledger) ════════════════
  const n1 = drain(gate, ledger);
  const n2 = drain(gate, ledger);
  record("H4-8 drain twice on the live ledger", "0 on the second drain", `first=${n1} second=${n2}`, n2 === 0 ? "OK" : "BREAK");

  // ══ H4 PUSH 9 — POLICY STORE UNDER A LIVE EDIT ═══════════════════════════════
  const pdir = fs.mkdtempSync(path.join(os.tmpdir(), "hs-pol-"));
  const ppath = path.join(pdir, "policies.json");
  writePolicyFile(ppath, DEFAULT_POLICY_FILE);
  const store = new PolicyStore(ppath);
  const rowBefore = (await gate.judge(aFire({ evidence: "policy-probe" }), absorbContext(aFire(), NEUTRAL))).row;
  const rerouted = gate.reroute(rowBefore, { ...store.get("*dumb")!, act: 0.99, flag: 0.5 });
  record("H4-9 reroute a stored probability under a new policy",
    "the probability is UNCHANGED and only the band moves",
    `p ${rowBefore.probability}→${rerouted.probability} · band ${rowBefore.band}→${rerouted.band} · costUsd=${rerouted.costUsd}`,
    rerouted.probability === rowBefore.probability && rerouted.costUsd === 0 ? "OK" : "BREAK");

  // ══ H4 PUSH 10 — THE ADVISORY UNDER A DOWN JUDGE (fail-open, live) ═══════════
  const downGate = new FireGate({ judge: { async evaluate() { throw new Error("hotseat: simulated outage"); } } });
  const adv = await advisory(downGate, { tool: "edit", target: "x.ts", queriedBefore: false }, absorbContext(aFire(), NEUTRAL));
  record("H4-10 the advisory with a DOWN judge",
    "verdict=pass, block=false, and a NAMED skip",
    `verdict=${adv.verdict} block=${adv.block} skipped=${adv.skipped?.code ?? "none"}`,
    adv.verdict === "pass" && adv.block === false && adv.skipped !== null ? "OK" : "BREAK");

  // ══ H4 PUSH WAVE 2 — HARDER (the pin: ZERO BUGS IS A RED FLAG) ═══════════════

  // W2-1 — A LARGER N AT ONCE, and the SAME state twice inside it
  // ★ the probe must drain FIRST, or it measures this batch PLUS anything pending from an
  //   earlier op (H4-9 judges without draining). The first version read 25 rows for 24
  //   fires and called it a break — the code was right, the measurement was not.
  drain(gate, ledger);
  const before2 = ledger.count();
  const bigN = 24;
  const big = await Promise.all(Array.from({ length: bigN }, (_, i) => {
    const f = aFire({ evidence: `queriedBefore=false wave2=${i % 3}` });   // only 3 DISTINCT states
    return gate.judge(f, absorbContext(f, NEUTRAL));
  }));
  drain(gate, ledger);
  const grew = ledger.count() - before2;
  record(`W2-1 ${bigN} fires at once over only 3 distinct states`,
    "every fire leaves a row (cache hits still record), and no row is lost",
    `${grew} rows for ${bigN} fires · cacheHits=${big.filter((d) => d.cached).length} · firesUsed=${gate.firesUsed()}`,
    grew === bigN ? "OK" : "BREAK",
    grew === bigN ? undefined : "a concurrent cache hit did not leave its row — the ledger lost fires");

  // W2-2 — TWO GATES, ONE LEDGER (the drain watermark is keyed by FILE)
  const gateB = new FireGate({ judge });
  const sharedLedger = new FireLedger(LEDGER);          // a SECOND handle on the SAME file
  const fB = aFire({ evidence: "two-handles" });
  await gateB.judge(fB, absorbContext(fB, NEUTRAL));
  const dA2 = drain(gateB, sharedLedger);
  const dB2 = drain(gateB, sharedLedger);
  const dOther = drain(gate, sharedLedger);             // the ORIGINAL gate on the SAME file
  record("W2-2 two ledger HANDLES on one file, two gates",
    "the second drain is 0 and the other gate's rows are not re-written",
    `handle1 drain=${dA2} then ${dB2} · the other gate's drain=${dOther} · total rows=${sharedLedger.count()}`,
    dB2 === 0 && dOther === 0 ? "OK" : "NOTE",
    dB2 === 0 ? undefined : "the watermark did not hold across handles on the same file",
    dOther !== 0 ? "a DIFFERENT gate's rows were drained by a handle that had not seen them — correct (distinct rows), but it means exactly-once is per (ledger-file, row-object), not per gate." : undefined);
  sharedLedger.close();

  // W2-3 — THE ORACLE ON AN EMPTY LEDGER
  const empty = new FireLedger(path.join(OUT, "empty.sqlite"));
  const er = resolveAll(empty, [], []);
  record("W2-3 the oracle on an EMPTY ledger",
    "zero of everything, no throw",
    `resolved=${er.resolved} leftUnresolved=${er.leftUnresolved} phantom=${er.phantom} failed=${er.failed.length}`,
    er.resolved === 0 && er.failed.length === 0 ? "OK" : "BREAK");
  empty.close();

  // W2-4 — A POLICY NOTHING CAN PASS (act = 1.0) — the starvation extreme
  const starveDir = fs.mkdtempSync(path.join(os.tmpdir(), "hs-starve-"));
  const starvePath = path.join(starveDir, "p.json");
  writePolicyFile(starvePath, { version: 1, policies: { "*dumb": { name: "impossible", act: 1.0, flag: 0.999, failPolarity: "open" } } });
  const starveStore = new PolicyStore(starvePath);
  const starveGate = new FireGate({ judge, policies: { "*dumb": starveStore.get("*dumb")! } });
  const sd = await starveGate.judge(aFire({ evidence: "starve-probe" }), absorbContext(aFire(), NEUTRAL));
  record("W2-4 a policy nothing can pass (act=1.0)",
    "the act band is unreachable and the row shows it — never a silent FIRE",
    `p=${sd.probability} band=${sd.band} action=${sd.action}`,
    sd.action !== "FIRE" ? "OK" : "BREAK",
    sd.action !== "FIRE" ? undefined : "act=1.0 produced a FIRE — the band comparison is wrong");

  // W2-5 — A DESTRUCTIVE INTENT THROUGH THE ADVISORY (live classification)
  const dIntent = { tool: "bash", target: "rm -rf /work/gi/src", queriedBefore: true };
  const dAdv = await advisory(gate, dIntent, absorbContext(aFire(), NEUTRAL));
  record("W2-5 a DESTRUCTIVE intent through the advisory",
    "classified destructive and STILL never blocks (fail-open by type)",
    `verdict=${dAdv.verdict} block=${dAdv.block} p=${dAdv.probability} policy=${dAdv.row?.policyName ?? "-"}`,
    dAdv.block === false ? "OK" : "BREAK",
    dAdv.block === false ? undefined : "position A blocked an act — the fail-open type contract broke");

  // W2-6 — A RECORD BEYOND THE FORWARD WINDOW
  const wSubject = { target: "src/omp/kernel-v2.ts" };
  const far = new Date(Date.now() + 48 * 3600_000).toISOString();
  const farEv = classify(gather({ at: new Date(Date.now() - 60_000).toISOString() }, wSubject, [
    { kind: "edit", at: far, target: wSubject.target },
  ]));
  record("W2-6 a record 48h in the future (beyond the 24h window)",
    "it is NOT evidence — the window is bounded forward",
    `truth=${farEv.truth} signals=${JSON.stringify(farEv.signals)}`,
    farEv.truth === "unresolved" ? "OK" : "BREAK",
    farEv.truth === "unresolved" ? undefined : "a record beyond the forward window was admitted as evidence");

  // W2-7 — A STATE HASH SHARED ACROSS TWO CLASSES
  const crossA = aFire({ cls: "dumb", ruleId: "*dumb", evidence: "identical-shape" });
  const crossB = aFire({ cls: "theatrical", ruleId: "*theatrical", evidence: "identical-shape" });
  const cA = await gate.judge(crossA, absorbContext(crossA, NEUTRAL));
  const cB = await gate.judge(crossB, absorbContext(crossB, NEUTRAL));
  record("W2-7 two CLASSES, the same evidence (a state-hash collision)",
    "the cache must not serve one class's judgment to another — the state includes the fire",
    `sameHash=${cA.row.stateHash === cB.row.stateHash} · A(p=${cA.probability} ${cA.row.policyName}) B(p=${cB.probability} ${cB.row.policyName})`,
    cA.row.stateHash === cB.row.stateHash ? "OK" : "NOTE",
    cA.row.stateHash === cB.row.stateHash
      ? undefined
      : "the hashes differ, so the STATE carries the class — the cache cannot cross classes.",
    cA.row.stateHash === cB.row.stateHash
      ? "★ THE HASHES ARE EQUAL, so buildState does NOT include the class: a theatrical fire could be served a dumb fire's cached probability. Check whether buildState carries cls."
      : undefined);

  // W2-8 — THE LEDGER REJECTS A CORRUPTED ROW IN A LIVE BATCH
  const badBatch = [
    { ...aFire(), stateHash: "live-bad-1", at: new Date().toISOString(), ruleId: "*dumb", cls: "dumb", questionVersion: "q", probability: 0.5, band: "ignore", action: "IGNORE", policyName: "p", actThreshold: 0.75, flagThreshold: 0.35, costUsd: 0, laterTruth: "unresolved" as const },
    { ...aFire(), stateHash: "", at: new Date().toISOString(), ruleId: "*dumb", cls: "dumb", questionVersion: "q", probability: 0.5, band: "ignore", action: "IGNORE", policyName: "p", actThreshold: 0.75, flagThreshold: 0.35, costUsd: 0, laterTruth: "unresolved" as const },
  ];
  const preCount = ledger.count();
  const written = ledger.appendMany(badBatch);
  record("W2-8 a live batch with ONE corrupt row",
    "the good row lands, the bad one is reported, and the count reflects reality",
    `written=${written} rows +${ledger.count() - preCount} persistFailures=${ledger.persistFailures()}`,
    written === 1 && ledger.count() - preCount === 1 ? "OK" : "BREAK",
    written === 1 ? undefined : "the good row was blocked by its corrupt sibling");

  drain(gate, ledger);

  // ══ H6 — THE RUNTIME LEDGER ══════════════════════════════════════════════════
  const breaks = findings.filter((f) => f.verdict === "BREAK");
  const notes = findings.filter((f) => f.verdict === "NOTE");
  const out = {
    at: new Date().toISOString(),
    stance: "I am the driver of the GI Kernel v2.1 fire gate at dist sha 83eb7bba, driven through the live JevJudge against api.typesafe.ai.",
    ops: findings.length,
    breaks: breaks.length,
    notes: notes.length,
    findings,
    ledgerPath: LEDGER,
    ledgerRows: ledger.count(),
  };
  fs.writeFileSync(path.join(OUT, "hotseat-report.json"), `${JSON.stringify(out, null, 2)}\n`);
  ledger.close();

  console.log(`\n=== H6 THE RUNTIME LEDGER ===`);
  console.log(`  ops ${findings.length} · breaks ${breaks.length} · notes ${notes.length}`);
  console.log(`  rows left in the battered ledger: ${out.ledgerRows}`);
  console.log(`  written: .mimocode/runtime-grade/hotseat-report.json`);
  if (breaks.length === 0 && notes.length === 0) console.log(`  ★ ZERO FINDINGS — THE PIN SAYS THAT IS A RED FLAG, NOT A RESULT.`);
}

await main();
