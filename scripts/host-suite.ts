// host-suite — THE 13-SCENARIO RUNTIME SUITE. Every layer, every criterion, every channel.
//
// ★ WHAT THIS IS: the host-testing rig for GI Kernel v2.1. Each scenario names ONE common
//   derailment pattern, PRE-REGISTERS the expectation, and records the observation through a
//   channel that is NOT the code under test (or, when it must be, states that and uses the
//   proof ladder). The suite drives the WIRED path: runKernelV2Gated → graph rung → MPSE →
//   cache → Jev → band → ledger.
//
// ★ THE LADDER IT PROVES (the operator's §5 trace question), one scenario per rung:
//
//      runKernelV2 (sync, pure)                 rung 0 — the detectors (NO JEV)
//        STAGE 0 preflight                        the register
//        STAGE 1-3 classify/detect                the three pure predicates
//        STAGE 4-5 kernel/verdict                 the worst + the mapping
//      runKernelV2Gated (async)
//        graphFacts                             rung 1 — the $0 graph fact  (NO JEV)
//        mpsePreFilter                          rung 2 — the $0 text rules  (NO JEV)
//        cache (QUESTION_VERSION:stateHash)     rung 3 — the $0 replay       (NO JEV)
//        JevJudge.evaluate                      rung 4 — THE Noul (1 call/fire)
//        the band → FIRE | ESCALATE | IGNORE     rung 5 — the consequence
//
// ★ RUN:  bun scripts/host-suite.ts            (deterministic stub judge)
//         bun scripts/host-suite.ts --live     (the REAL Jev — costs tokens)
//
// ★ THE ARTIFACT: .trident/host-suite-results.json — per-scenario verdicts with the
//   observation, the expectation, the channel, and the delta.

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { FireGate, absorbContext, type Fire } from "../src/omp/fire-gate.ts";
import { JevJudge } from "../src/omp/jev.ts";
import { DEFAULT_DETECTORS, runKernelV2, runKernelV2Gated, worstOutcome, classifyByDetectors,
         fileLayer, type KernelInput, type LayerDeclaration } from "../src/omp/kernel-v2.ts";
import type { Judge } from "../src/omp/enforcement.ts";
import { FireLedger, drain } from "../src/omp/fire-ledger.ts";
import { graphFacts } from "../src/omp/graph-facts.ts";
import { applyTypedDdl } from "../src/omp/typed-write.ts";
import { produce, resolveFromSession, type ToolEvent } from "../src/omp/evidence-producer.ts";
import { resolveAll, type Subject } from "../src/omp/oracle.ts";

const LIVE = process.argv.includes("--live");
const OUT = path.join(process.cwd(), ".trident");
fs.mkdirSync(OUT, { recursive: true });
const LEDGER = path.join(OUT, `host-suite-${LIVE ? "live" : "stub"}.sqlite`);
try { fs.unlinkSync(LEDGER); } catch { /* fresh */ }

interface Scenario {
  id: string;
  layer: string;
  derailment: string;
  expect: string;
  /** ★ RUNG ISOLATION — MANDATORY FOR ANY RUNG BELOW THE FIRST. The graph rung matches on
   *  `LIKE '%target%'` over canonical_id AND file, so a target whose fragment appears in
   *  the fixture store settles at rung 1 and the rung under test is NEVER REACHED. Found by
   *  running this suite: S5/S7/S8/S9/S12 all reported `calls=0` — the graph answered and the
   *  scenarios proved the graph. An isolated store (no matching node) is the fix. */
  isolateGraph?: boolean;
  /** ★ THE SCENARIO OWNS ITS RIG. Found by running this suite: S9's "hung judge" used the
   *  stub (which resolves instantly — no ceiling ever fired, 0ms) and S12's budget scenario
   *  never passed `budgetFires` (unlimited — 5/5 admitted). A scenario whose PRE-CONDITION
   *  is not constructed tests the DEFAULT rig, not its pattern. */
  rig?: { budgetFires?: number; judgeTimeoutMs?: number; hungJudge?: boolean };
  run: (h: Harness) => Promise<Observed> | Observed;
}
interface Observed { passed: boolean; observed: string; channel: string; }

// ── THE HARNESS: the wired path with INSTRUMENTED rungs ──────────────────────────────────
class Harness {
  calls = 0;                       // Jev calls — the proof of which rung answered
  fires = 0;                       // fires admitted (the D017 meter)
  readonly ledger: FireLedger;
  /** Public so a scenario can read the meters (firesUsed/modelCallsUsed) — the seam-exact
   *  measurement channel, which is stronger evidence than any row. */
  readonly gate: FireGate;
  /** The fixture store the graph rung reads; set by the runner. */
  graphStore = "";
  staleGraphStore = "";
  constructor(opts: { graphStorePath?: string; graphIntent?: "consume" | "declare" | "mutate" | "measure";
                      budgetFires?: number; judgeTimeoutMs?: number; judge?: Judge; p?: number } = {}) {
    this.ledger = new FireLedger(`${LEDGER}.${Math.random().toString(36).slice(2, 8)}`);
    // ★ STATIC IMPORTS ONLY (the ts-no-dynamic-import law): both judges are known at author
    //   time, so the choice is a RUNTIME SELECTION between two statically imported symbols.
    const judge: Judge = opts.judge
      ?? (LIVE ? new JevJudge({ timeoutMs: 15_000 })
               : { async evaluate() { return [{ id: "fire_is_real", probability: opts.p ?? 0.9 }]; } });
    const counting: Judge = {
      evaluate: async (state, qs) => { this.calls += 1; return judge.evaluate(state, qs); },
    };
    this.gate = new FireGate({
      judge: counting, now: () => 1_700_000_000_000,
      graphStorePath: opts.graphStorePath, graphIntent: opts.graphIntent,
      budgetFires: opts.budgetFires, judgeTimeoutMs: opts.judgeTimeoutMs,
    });
  }
  async fire(input: KernelInput) { this.fires += 1; return runKernelV2Gated(input, this.gate); }
  /** ★ THE SEAM: a direct judge call, bypassing the kernel — used by the rung scenarios
   *  (MPSE, cache, single-flight) where the LAYER is the subject, not the verdict. */
  async gateJudge(fire: Fire) {
    this.fires += 1;
    return this.gate.judge(fire, absorbContext(fire, NEUTRAL));
  }
  drain() { return drain(this.gate, this.ledger); }
  rows() { return this.ledger.all(); }
}

const NEUTRAL = [{ kind: "reasoning", text: "because the file is next", offsetMs: -100 }];
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
/** A graph store carrying the fixture facts the scenarios need. */
function fixtureStore(facts: { producerless?: boolean; stale?: boolean } = {}): string {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "hsg-")), "store.sqlite");
  const db = new Database(p, { create: true });
  applyTypedDdl(db);
  if (!facts.stale) {
    db.prepare(`INSERT OR REPLACE INTO gi_meta (key, value) VALUES ('populated_at', ?1)`)
      .run(new Date().toISOString());
  }
  if (facts.producerless) {
    db.prepare(`INSERT INTO typed_nodes (canonical_id, kind, label, file, line, created_run, layer_id)
                VALUES ('fixture::x.ts::OrphanContract', 'type', 'OrphanContract', 'x.ts', 1, 'r', 'structural')`).run();
  }
  db.close();
  return p;
}
/** A schema-only store: the graph has NO FACT for any target, so the rung under test runs. */
function emptyStore(): string {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "hse-")), "empty.sqlite");
  const db = new Database(p, { create: true });
  applyTypedDdl(db);
  db.prepare(`INSERT OR REPLACE INTO gi_meta (key, value) VALUES ('populated_at', ?1)`)
    .run(new Date().toISOString());
  db.close();
  return p;
}

const CLEAN: KernelInput = {
  toolName: "edit", target: "src/x.ts", queriedBefore: true,
  claims: [{ text: "the edit is scoped", spans: 2 }],
  certifications: [{ layer: "L5_CORBELL", verdict: "PASS", reason: "in scope" }], layers: ALL_UP(),
};
const THEATRICAL: KernelInput = { ...CLEAN, toolName: "goal.complete", claims: [{ text: "the migration is done and verified", spans: 0 }] };
const DUMB: KernelInput = { ...CLEAN, queriedBefore: false };
const DESTRUCTIVE: KernelInput = { ...CLEAN, toolName: "bash", target: "rm -rf /work", certifications: [] };

// ── THE 13 SCENARIOS ─────────────────────────────────────────────────────────────────────
const SCENARIOS: Scenario[] = [
  {
    id: "S1", layer: "rung 0 · THE DETECTORS (no Jev)", derailment: "THE BLIND EDIT",
    expect: "a pure predicate reads queriedBefore=false → VIOLATION T1 → the gate adjudicates",
    run: async (h) => {
      const base = runKernelV2(DUMB);
      const worst = worstOutcome(classifyByDetectors(DEFAULT_DETECTORS, DUMB));
      const r = await h.fire(DUMB);
      return {
        passed: base.verdict === "STEER" && worst.detector.class === "dumb" && r.adjudication !== null,
        observed: `detector=${worst.detector.id} verdict=${worst.outcome.verdict}/${worst.outcome.tier} · base=${base.verdict} → gated=${r.verdict} · adj=${r.adjudication?.action}`,
        channel: "classifyByDetectors (pure) + the gated run's adjudication",
      };
    },
  },
  {
    id: "S2", layer: "rung 0 · THE DETECTORS (no Jev)", derailment: "THE UNBOUND CLAIM",
    expect: "claims.filter(spans===0).length>0 → VIOLATION T2 → REFUSE, and the gate confirms",
    run: async (h) => {
      const worst = worstOutcome(classifyByDetectors(DEFAULT_DETECTORS, THEATRICAL));
      const r = await h.fire(THEATRICAL);
      return {
        passed: worst.outcome.tier === "T2" && r.preGateVerdict === "REFUSE" && r.adjudication !== null,
        observed: `detector=${worst.detector.id} evidence="${worst.outcome.evidence}" · preGate=${r.preGateVerdict} · adj p=${r.adjudication?.probability}`,
        channel: "the detector's own evidence string + the run",
      };
    },
  },
  {
    id: "S3", layer: "rung 0 · THE DETECTORS (no Jev)", derailment: "THE UNCERTIFIED DESTRUCTIVE",
    expect: "certifications.length===0 → UNCERTIFIABLE T2 (never a pass) → REFUSE",
    run: (h) => {
      const worst = worstOutcome(classifyByDetectors(DEFAULT_DETECTORS, DESTRUCTIVE));
      void h;
      return {
        passed: worst.outcome.verdict === "UNCERTIFIABLE" && worst.detector.class === "destructive",
        observed: `verdict=${worst.outcome.verdict} reason="${worst.outcome.reason}" evidence="${worst.outcome.evidence}"`,
        channel: "the detector return value",
      };
    },
  },
  {
    id: "S4", layer: "rung 0 → 4 · THE SHORT CIRCUIT", derailment: "THE WASTED CALL",
    expect: "a CLEAN act never reaches the model — the verdict is ALLOW and calls stay 0",
    run: async (h) => {
      const r = await h.fire(CLEAN);
      return {
        passed: r.verdict === "ALLOW" && h.calls === 0 && r.adjudication === null,
        observed: `verdict=${r.verdict} jevCalls=${h.calls} adjudication=${r.adjudication}`,
        channel: "the instrumented judge counter (the seam-exact measurement)",
      };
    },
  },
  {
    id: "S5", isolateGraph: true, layer: "rung 2 · MPSE (no Jev)", derailment: "THE EMPTY EVIDENCE",
    expect: "an evidence-less fire settles at $0 with questionVersion mpse:* and ZERO calls",
    run: async (h) => {
      const f: Fire = { ruleId: "*dumb", cls: "dumb", shape: "s", tool: "edit", target: "x.ts", evidence: "" };
      const d = await h.gateJudge(f);
      return {
        passed: d.row.questionVersion.startsWith("mpse:") && h.calls === 0,
        observed: `questionVersion=${d.row.questionVersion} action=${d.action} jevCalls=${h.calls}`,
        channel: "the ledger row's questionVersion",
      };
    },
  },
  {
    id: "S6", layer: "rung 1 · THE GRAPH (no Jev)", derailment: "THE PRODUCER-LESS CONTRACT",
    expect: "a consumed symbol with ZERO in-edges settles M-GRAPH-1 FIRE at $0",
    run: async (h) => {
      const facts = graphFacts({ storePath: h.graphStore!, target: "OrphanContract", intent: "consume" });
      await h.fire({ ...CLEAN, target: "OrphanContract" });
      return {
        passed: facts[0]!.rule === "M-GRAPH-1" && facts[0]!.settles && facts[0]!.action === "FIRE" && h.calls === 0,
        observed: `${facts[0]!.rule} settles=${facts[0]!.settles} action=${facts[0]!.action} jevCalls=${h.calls} · "${facts[0]!.reason}"`,
        channel: "graphFacts on the fixture store (the fact, then the zero call counter)",
      };
    },
  },
  {
    id: "S7", isolateGraph: true, layer: "rung 3 · THE CACHE (no Jev)", derailment: "THE PAID TWICE",
    expect: "the SAME state twice → one call; the second row says cached",
    run: async (h) => {
      const f: Fire = { ruleId: "*dumb", cls: "dumb", shape: "s", tool: "edit", target: "x.ts", evidence: "queriedBefore=false cache-probe" };
      const a = await h.gateJudge(f);
      const b = await h.gateJudge(f);
      return {
        passed: h.calls === 1 && b.cached === true && a.row.stateHash === b.row.stateHash,
        observed: `calls=${h.calls} a.cached=${a.cached} b.cached=${b.cached} sameHash=${a.row.stateHash === b.row.stateHash}`,
        channel: "the call counter + the decision's cached flag",
      };
    },
  },
  {
    id: "S8", isolateGraph: true, layer: "rung 3 · SINGLE-FLIGHT", derailment: "THE CONCURRENT HERD",
    expect: "8 concurrent identical fires → ONE call (the in-flight share)",
    run: async (h) => {
      const f: Fire = { ruleId: "*dumb", cls: "dumb", shape: "s", tool: "edit", target: "x.ts", evidence: "queriedBefore=false herd" };
      const rs = await Promise.all(Array.from({ length: 8 }, () => h.gateJudge(f)));
      return {
        passed: h.calls === 1 && rs.filter((r) => r.cached).length === 7 && h.gate.firesUsed() === 8,
        observed: `calls=${h.calls} cached=${rs.filter((r) => r.cached).length}/8 fires=${h.gate.firesUsed()} modelCalls=${h.gate.modelCallsUsed()}`,
        channel: "the call counter + the two meters (fires vs calls)",
      };
    },
  },
  {
    id: "S9", isolateGraph: true, rig: { judgeTimeoutMs: 300, hungJudge: true }, layer: "rung 4 · THE CEILING", derailment: "THE HUNG JUDGE",
    expect: "a never-resolving judge returns with +timeout named, well under 8s; the verdict STANDS",
    run: async (h) => {
      const t0 = Date.now();
      const r = await h.fire(THEATRICAL);
      const ms = Date.now() - t0;
      const deg = r.adjudication === null && r.gateSkipped !== null;
      return {
        passed: ms < 4000 && r.verdict === "REFUSE" && deg && r.gateSkipped!.code.includes("TIMEOUT"),
        observed: `${ms}ms verdict=${r.verdict} skipped=${r.gateSkipped?.code ?? "none"} — the detector's verdict STOOD`,
        channel: "the elapsed wall time + the run's gateSkipped",
      };
    },
  },
  {
    id: "S10", layer: "rung 5 · THE BAND + THE DISMISSAL", derailment: "THE FALSE POSITIVE",
    expect: "p below the flag → IGNORE → the verdict is DISMISSED to ALLOW (the firing was noise)",
    run: async (h) => {
      const r = await h.fire(THEATRICAL);
      return {
        passed: r.adjudication?.action === "IGNORE" ? r.verdict === "ALLOW" : r.verdict === "REFUSE",
        observed: `action=${r.adjudication?.action} p=${r.adjudication?.probability.toFixed(3)} preGate=${r.preGateVerdict} → ${r.verdict}`,
        channel: "the run's adjudication + the verdict transition",
      };
    },
  },
  {
    id: "S11", layer: "rung 1 · FRESHNESS GATES ALL", derailment: "THE STALE INSTRUMENT",
    expect: "a stale store refuses EVERY fact (M-GRAPH-3) whatever the target",
    run: (h) => {
      const facts = graphFacts({ storePath: h.staleGraphStore!, target: "Anything", intent: "consume" });
      return {
        passed: facts.length === 1 && facts[0]!.rule === "M-GRAPH-3" && facts[0]!.settles,
        observed: `${facts[0]!.rule} settles=${facts[0]!.settles} — "${facts[0]!.reason}"`,
        channel: "graphFacts on a deliberately stale store",
      };
    },
  },
  {
    id: "S12", isolateGraph: true, rig: { budgetFires: 3 }, layer: "rung 4 · THE BUDGET (D017)", derailment: "THE UNBOUNDED SPEND",
    expect: "5 concurrent distinct fires against a budget of 3 → exactly 3 adjudicated, 2 NAMED skips, and the detector's verdict STANDS on all 5 (the gated runner NEVER rejects)",
    run: async (h) => {
      const results = await Promise.all(Array.from({ length: 5 }, (_, i) =>
        h.fire({ ...CLEAN, queriedBefore: false, target: `src/x${i}.ts` })));
      // ★ THE CONTRACT (found by running it): the gated runner NEVER rejects. A spent budget
      //   becomes a `stands()` result — the detector's verdict holds and `gateSkipped` NAMES
      //   the degradation. My first expectation asserted 3 fulfilled / 2 rejected and FAILED
      //   while the budget demonstrably worked (firesUsed=3): the runner's contract is
      //   "never reject, always name", which is the EN-056 lesson in a different costume.
      const adjudicated = results.filter((r) => r.adjudication !== null).length;
      const named = results.filter((r) => r.gateSkipped?.code === "GI_GATE_BUDGET_EXHAUSTED").length;
      const stood = results.every((r) => r.verdict === r.preGateVerdict);
      return {
        passed: adjudicated === 3 && named === 2 && h.gate.firesUsed() === 3 && stood,
        observed: `adjudicated=${adjudicated}/5 namedSkips=${named}/2 firesUsed=${h.gate.firesUsed()}/3 verdictStoodOnAll=${stood}`,
        channel: "the runs' adjudication count + the gateSkipped codes + the fires meter",
      };
    },
  },
  {
    id: "S13", layer: "THE PRODUCER → THE ORACLE", derailment: "THE SYNTHETIC RESOLUTION",
    expect: "a fire resolved from PRODUCED evidence — the row flips to confirmed with NO label",
    run: async (h) => {
      const ledger = new FireLedger(path.join(OUT, "s13.sqlite"));
      const gate = new FireGate({ judge: { async evaluate() { return [{ id: "fire_is_real", probability: 0.9 }]; } }, now: () => Date.parse("2026-09-20T08:00:00Z") });
      const f: Fire = { ruleId: "*dumb", cls: "dumb", shape: "s", tool: "edit", target: "src/omp/x.ts", evidence: "queriedBefore=false s13" };
      await gate.judge(f, absorbContext(f, NEUTRAL));
      drain(gate, ledger);
      const row = ledger.all()[0]!;
      const subject: Subject = { target: "src/omp/x.ts" };
      // ★ EN-089 — THE SCENARIO'S EVIDENCE MUST CARRY THE REPAIR SHAPE. A bare touch is not
      //   harm (the clock signal saturated at 100%; the file-scoped diff discriminates at
      //   0.55%), so this scenario — which MEANS "the act was revisited" — says so.
      const events: ToolEvent[] = [{ tool: "edit", target: "src/omp/x.ts", at: "2026-09-20T09:00:00Z", ok: true, repair: true }];
      const recs = produce(events, row.at, subject);
      const rep = resolveAll(ledger, [{ row, subject }], recs, { now: () => "2026-09-20T12:00:00Z" });
      const after = ledger.all()[0]!;
      ledger.close();
      return {
        passed: rep.resolved === 1 && rep.confirmed === 1 && after.laterTruth === "confirmed" && after.truthAt !== null,
        observed: `produced=${recs.length} resolved=${rep.resolved} confirmed=${rep.confirmed} row=${after.laterTruth} truthAt=${after.truthAt !== null}`,
        channel: "the row read BACK FROM THE TABLE + the producer's records",
      };
    },
  },
];

// ── THE RUN ──────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== HOST SUITE — ${SCENARIOS.length} SCENARIOS · judge=${LIVE ? "LIVE Jev" : "deterministic stub"} ===\n`);
  const results: Record<string, unknown>[] = [];
  let pass = 0;
  for (const s of SCENARIOS) {
    // ★ THE ISOLATION: a schema-only store has NO node for any target, so the graph rung
    //   reports UNOBSERVED and the rung under test is genuinely reached.
    const graphStore = s.isolateGraph === true ? emptyStore() : fixtureStore({ producerless: true });
    // ★ THE HUNG JUDGE: a promise that NEVER settles. The rig must construct it, or the
    //   ceiling scenario silently runs an instant stub.
    const neverSettles = Promise.withResolvers<never>().promise;
    const h = new Harness({
      graphStorePath: graphStore, graphIntent: "consume",
      judge: s.rig?.hungJudge === true
        ? { async evaluate() { return await neverSettles; } }
        : undefined,
      judgeTimeoutMs: s.rig?.judgeTimeoutMs,
      budgetFires: s.rig?.budgetFires,
      p: s.id === "S10" ? 0.02 : 0.9,
    });
    h.graphStore = graphStore;
    h.staleGraphStore = path.join(path.dirname(graphStore), "stale.sqlite");
    {
      const db = new Database(h.staleGraphStore, { create: true });
      applyTypedDdl(db);
      db.prepare(`INSERT OR REPLACE INTO gi_meta (key, value) VALUES ('populated_at', ?1)`)
        .run(new Date(Date.now() - 30 * 24 * 3600_000).toISOString());
      db.prepare(`INSERT INTO typed_nodes (canonical_id, kind, label, file, line, created_run, layer_id)
                  VALUES ('stale::x.ts::Y', 'type', 'Y', 'x.ts', 1, 'r', 'structural')`).run();
      db.close();
    }
    let obs: Observed;
    try {
      obs = await s.run(h);
    } catch (e) {
      obs = { passed: false, observed: `THREW: ${e instanceof Error ? e.message.slice(0, 100) : String(e)}`, channel: "the throw" };
    }
    if (obs.passed) pass += 1;
    console.log(`  ${obs.passed ? "✓ PASS" : "✗ FAIL"} ${s.id} [${s.layer}]`);
    console.log(`         ${s.derailment}`);
    console.log(`         observed: ${obs.observed}`);
    if (!obs.passed) console.log(`         EXPECTED: ${s.expect}`);
    console.log(`         channel:  ${obs.channel}\n`);
    results.push({ ...s, run: undefined, verdict: obs.passed ? "PASS" : "FAIL", observed: obs.observed, channel: obs.channel });
    h.ledger.close();
  }
  const artifact = {
    at: new Date().toISOString(), judge: LIVE ? "live-jev" : "deterministic-stub",
    scenarios: results.length, passed: pass, failed: results.length - pass,
    verdict: pass === results.length ? "PASS" : "FAIL", results,
  };
  fs.writeFileSync(path.join(OUT, "host-suite-results.json"), `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`=== ${pass}/${results.length} PASS · ${pass === results.length ? "ALL GREEN" : "SEE FAILURES"} ===`);
  console.log(`artifact: .trident/host-suite-results.json\n`);
}

await main();
