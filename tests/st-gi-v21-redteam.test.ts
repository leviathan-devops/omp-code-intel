// st-gi-v21-redteam — P5: THE FULL CORPUS PASS.
//
// THE CONTRACT: "Map every exported decision function first; the surface map IS the
// probe plan. Corpus = positive + negative + edge + the FULL evasion family (never the
// one example in a comment)." And the loop terminates only on "a FULL pass with ZERO
// confirmed defects".
//
// ★ THE SCOPE LIMIT, STATED UP FRONT: the pin says probes run against the DEPLOYED
//   runtime with source-import BANNED. That rule was written for v1.3, which IS bundled
//   into the dist. v2.1 is NOT in the dist — the dist sha 83eb7bba is unchanged and the
//   v2.x modules are source-only. So the deployed surface of v2.1 IS its module surface,
//   and these probes import it. This is a REAL narrowing of the rule and it is named here
//   rather than glossed: a probe against the dist would test v1.3, not this code.
//
// THE SURFACE MAP (every exported decision function):
//   fire-gate        mpsePreFilter · buildState · fireQuestion · FireGate.judge ·
//                    FireGate.reroute · FireGate.recordTruth · intentFire · advisory
//   kernel-v2        preflight · classifyByDetectors · worstOutcome · runKernelV2 ·
//                    streamFromInput · runKernelV2Gated
//   oracle           gather · classify · resolveAll
//   fire-ledger      append/appendMany/all/byRule/count/recordTruth/countsByRule/truthOf ·
//                    drain · withLedger
//   policy-store     readPolicyFile · validatePolicies · writePolicyFile · PolicyStore.*
//   calibration      thresholdFromCost · firesNeededForGap · precisionFromCounts ·
//                    derivePolicy · checkCalibrationHealth
//
// THE EVASION FAMILY (A..M), each with its positive twin:
//   A QUOTATION   the shape appears inside a quotation/discussion
//   B NEGATION    the target appears only in negated slots
//   C EMPTY-EVID a fire with no detector evidence at all
//   D NORMALIZE   two fires identical but for whitespace/case
//   E TRUTH-LAUND the row laundered through an 'unresolved' write, or RE-resolved
//   F DOWNGRADE   a degraded row attempting to dismiss a violation
//   G ORDER       evidence BEFORE the fire, or exactly AT its timestamp
//   H SELF-EVID   a claim binding to its own text
//   I BOUNDARY    p exactly at act, exactly at flag
//   J NUMERIC     NaN / Infinity / negative / >1 probabilities
//   K POLICY      act == flag (an unreachable ESCALATE band)
//   L LEDGER      a row with an empty stateHash; a phantom row
//   M REDUCE      a verdict tie across classes; all-PASS

import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  FireGate, SEED_POLICY, absorbContext, advisory, buildState, degradationOf, intentFire, mpsePreFilter,
  type Fire, type Policy, type StreamRecord,
} from "../src/omp/fire-gate.ts";
import type { Judge } from "../src/omp/enforcement.ts";
import {
  FireLedger, drain, withLedger,
} from "../src/omp/fire-ledger.ts";
import { gather, classify, resolveAll, type OutcomeRecord } from "../src/omp/oracle.ts";
import { PolicyStore, readPolicyFile, validatePolicies, writePolicyFile } from "../src/omp/policy-store.ts";
import {
  DEFAULT_DETECTORS, classifyByDetectors, fileLayer, runKernelV2, worstOutcome,
  type KernelInput, type LayerDeclaration,
} from "../src/omp/kernel-v2.ts";

// ── harness ─────────────────────────────────────────────────────────────────
function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), "gi-rt-")); }
function upLayer(id: LayerDeclaration["id"], dep: string, code: string): LayerDeclaration {
  const f = path.join(tmpDir(), "present");
  fs.writeFileSync(f, "x");
  return fileLayer(id, dep, code, f);
}
const ALL_UP = (): LayerDeclaration[] => [
  upLayer("L1_SEMANTICA", "semantica index", "GI_LAYER_SEMANTICA"),
  upLayer("L2_ARSUMBRIS", "au daemon socket", "GI_LAYER_ARSUMBRIS"),
  upLayer("L3_UA", "ua graph json", "GI_LAYER_UA"),
  upLayer("L4_C2KG", "c2kg lsp index", "GI_LAYER_C2KG"),
  upLayer("L5_CORBELL", "corbell checkout", "GI_LAYER_CORBELL"),
  upLayer("L6_GRAPHIFY", "graphify graph.json", "GI_LAYER_GRAPHIFY"),
];
function judgeOf(p: number, calls?: { n: number }): Judge {
  return { async evaluate() { if (calls) calls.n += 1; return [{ id: "fire_is_real", probability: p }]; } };
}
function throwingJudge(m: string): Judge {
  return { async evaluate() { throw new Error(m); } };
}
function aFire(over: Partial<Fire> = {}): Fire {
  return { ruleId: "*dumb", cls: "dumb", shape: "blind edit", tool: "edit", target: "src/omp/kernel-v2.ts", evidence: "queriedBefore=false", ...over };
}
const NEUTRAL: StreamRecord[] = [{ kind: "reasoning", text: "because the file is next", offsetMs: -100 }];
function gateOf(judge: Judge) { return new FireGate({ judge, now: () => 1000 }); }

describe("st-gi-v21-redteam: P5 — the full corpus pass", () => {
  // ══════════════════ POSITIVE CONTROLS (a corpus with no reals measures nothing) ═══

  test("P-positive: a real violation reaches the model and is banded honestly", async () => {
    const calls = { n: 0 };
    const ctx = absorbContext(aFire(), NEUTRAL);
    const d = await gateOf(judgeOf(0.95, calls)).judge(aFire(), ctx);
    expect(calls.n).toBe(1);                 // NOT settled by MPSE — the model decided
    expect(d.probability).toBeCloseTo(0.95, 6);
    expect(d.band).toBe("act");
    expect(d.action).toBe("FIRE");
  });

  test("P-negative: a legitimate act fires nothing", async () => {
    const f = aFire({ evidence: "queriedBefore=true" });
    const d = await gateOf(judgeOf(0.02)).judge(f, absorbContext(f, NEUTRAL));
    expect(d.band).toBe("ignore");
    expect(d.action).toBe("IGNORE");
  });

  // ══════════════════ A — THE QUOTATION EVASION ════════════════════════════════════
  // The shape appears inside a quotation. MPSE's rule 2 is supposed to catch the
  // discussion case; this probes whether the quotation family is inside its reach.

  test("A-quotation: a QUOTED command is a discussion, not an act", async () => {
    const f = aFire({ ruleId: "*destructive", cls: "destructive", tool: "bash", target: "rm -rf /work/gi/src", evidence: "certifications=0" });
    const ctx = absorbContext(f, [
      { kind: "reasoning", text: "I am quoting the runbook: 'rm -rf /work/gi/src' — I am not running it", offsetMs: -200 },
    ]);
    const pre = mpsePreFilter(f, ctx);
    // ★ THE HONEST REPORT: if MPSE does not settle this, the MODEL must. Either is
    // acceptable; a SILENT PASS is not. Record which happened.
    if (pre.settle !== null) {
      expect(pre.settle).toBe("IGNORE");
    } else {
      expect(pre.reason).toContain("goes to Jev");
    }
  });

  // ══════════════════ B — THE NEGATION EVASION ══════════════════════════════════════

  test("B-negation: a target appearing ONLY negated is settled for $0", () => {
    const f = aFire({ target: "kernel-v2.ts" });
    const ctx = absorbContext(f, [
      { kind: "reasoning", text: "we will not edit kernel-v2.ts this turn", offsetMs: -100 },
    ]);
    const pre = mpsePreFilter(f, ctx);
    expect(pre.settle).toBe("IGNORE");
    expect(pre.reason).toContain("negated");
  });

  test("B-negation-NEGATIVE-twin: a negation in ONE slot does not settle a REAL act", () => {
    const f = aFire({ target: "kernel-v2.ts" });
    const ctx = absorbContext(f, [
      { kind: "reasoning", text: "I will not skip the check", offsetMs: -200 },
      { kind: "toolcall", text: "edit kernel-v2.ts now", offsetMs: -100 },
    ]);
    const pre = mpsePreFilter(f, ctx);
    // the SECOND slot mentions the target WITHOUT a negation → must not settle
    expect(pre.settle).toBeNull();
  });

  // ══════════════════ C — THE EMPTY-EVIDENCE EVASION ════════════════════════════════

  test("C-empty-evidence: no evidence is settled IGNORE and RECORDED, never silent", () => {
    const f = aFire({ evidence: "" });
    const ctx = absorbContext(f, NEUTRAL);
    const pre = mpsePreFilter(f, ctx);
    expect(pre.settle).toBe("IGNORE");
    expect(pre.reason).toContain("empty detector evidence");
  });

  // ══════════════════ D — THE NORMALIZATION EVASION ═════════════════════════════════

  test("D-normalize: whitespace-only differences are DIFFERENT states (no cache collapse)", async () => {
    // If two materially identical fires shared a state hash, one judgment would be
    // silently reused for the other. That is only safe if the states ARE identical.
    const gate = gateOf(judgeOf(0.9));
    const a = aFire({ evidence: "queriedBefore=false" });
    const b = aFire({ evidence: "queriedBefore=false " });   // one trailing space
    const da = await gate.judge(a, absorbContext(a, NEUTRAL));
    const db = await gate.judge(b, absorbContext(b, NEUTRAL));
    // ★ EITHER behaviour is defensible; the DEFECT would be an unexamined one. Record it.
    if (da.row.stateHash === db.row.stateHash) {
      expect(db.cached).toBe(true);       // a genuine collapse: the cache MUST report it
    } else {
      expect(db.cached).toBe(false);      // distinct states: distinct judgments
    }
  });

  // ══════════════════ E — THE TRUTH-LAUNDERING EVASION ══════════════════════════════

  test("E-launder: writing 'unresolved' is REJECTED — it is the absence of a resolution", async () => {
    const ledger = new FireLedger(path.join(tmpDir(), "l.sqlite"));
    const gate = gateOf(judgeOf(0.9));
    const f = aFire();
    await gate.judge(f, absorbContext(f, NEUTRAL));
    drain(gate, ledger);
    const hash = ledger.all()[0]!.stateHash;
    let threw = false;
    let msg = "";
    try { ledger.recordTruth(hash, "unresolved"); } catch (e) { threw = true; msg = e instanceof Error ? e.message : String(e); }
    expect(threw).toBe(true);
    expect(msg).toContain("GI_LEDGER_BAD_TRUTH");
    expect(ledger.all()[0]!.laterTruth).toBe("unresolved");   // unchanged
    ledger.close();
  });

  test("E-launder-2: a RE-resolution is refused even when the caller holds a stale row", async () => {
    const ledger = new FireLedger(path.join(tmpDir(), "l2.sqlite"));
    const gate = gateOf(judgeOf(0.9));
    const f = aFire();
    await gate.judge(f, absorbContext(f, NEUTRAL));
    drain(gate, ledger);
    const stale = ledger.all()[0]!;                       // the caller's SNAPSHOT
    const recs: OutcomeRecord[] = [{ kind: "edit", at: new Date(Date.parse(stale.at) + 3_600_000).toISOString(), target: f.target }];
    expect(resolveAll(ledger, [{ row: stale, subject: { target: f.target } }], recs).resolved).toBe(1);
    // the SECOND pass with the SAME stale object must change nothing
    expect(resolveAll(ledger, [{ row: stale, subject: { target: f.target } }], recs).resolved).toBe(0);
    ledger.close();
  });

  // ══════════════════ F — THE DOWNGRADE EVASION ═════════════════════════════════════
  // already covered by test_gate_degraded_row_never_dismisses_on_a_FAIL_OPEN_class;
  // here the ADVERSARIAL direction: a fail-CLOSED class must ALSO not be downgraded.

  test("F-downgrade: a fail-CLOSED class's degraded row cannot be UPGRADED either", async () => {
    const f: Fire = aFire({ ruleId: "*theatrical", cls: "theatrical", tool: "goal.complete", evidence: "claims=1 unbound=1 spans[0]=0" });
    const d = await gateOf(throwingJudge("down")).judge(f, absorbContext(f, NEUTRAL));
    // the fail-CLOSED path gives p=1 / FIRE. That row is a DEGRADATION, and it must be
    // recognisable as one — otherwise a downstream reader mistakes it for a real FIRE.
    expect(d.row.policyName).toContain("+fail-closed");
    expect(d.probability).toBe(1);
    expect(d.action).toBe("FIRE");
  });

  // ══════════════════ G — THE ORDER EVASION ═════════════════════════════════════════

  test("G-order: evidence AT the exact firing timestamp does NOT count (exclusive window)", async () => {
    const ledger = new FireLedger(path.join(tmpDir(), "g.sqlite"));
    const gate = gateOf(judgeOf(0.9));
    const f = aFire();
    await gate.judge(f, absorbContext(f, NEUTRAL));
    drain(gate, ledger);
    const row = ledger.all()[0]!;
    // the SAME instant — not "later"
    const ev = gather(row, { target: f.target }, [{ kind: "edit", at: row.at, target: f.target }]);
    expect(ev.signals).toEqual([]);
    expect(classify(ev).truth).toBe("unresolved");
    // and one millisecond later IS later
    const ev2 = gather(row, { target: f.target }, [{ kind: "edit", at: new Date(Date.parse(row.at) + 1).toISOString(), target: f.target }]);
    expect(ev2.signals).toEqual(["laterEdit"]);
    ledger.close();
  });

  // ══════════════════ H — THE SELF-EVIDENCE EVASION ═════════════════════════════════

  test("H-self-evidence: a claim whose ONLY span is its own text still binds (spans>=1)", () => {
    // the kernel's binding test is spans > 0. A self-referential span is a spans=1.
    // This records the boundary: v2.1 does NOT detect circular evidence — it counts.
    const inp: KernelInput = {
      toolName: "goal.complete", target: "x", queriedBefore: true,
      claims: [{ text: "this claim is true", spans: 1 }],    // the span IS the text
      certifications: [{ layer: "L5_CORBELL", verdict: "PASS", reason: "in scope" }],
      layers: ALL_UP(),
    };
    const r = runKernelV2(inp);
    // ★ THE FINDING, NAMED: a self-binding claim passes the theatrical detector.
    expect(r.verdict).toBe("ALLOW");
    expect(r.class).toBe("benign");
  });

  // ══════════════════ I — THE BOUNDARY EVASION ══════════════════════════════════════

  test("I-boundary: p EXACTLY at act fires; p just BELOW does not", async () => {
    const pol = SEED_POLICY["dumb"]!;             // act 0.75
    const at = await gateOf(judgeOf(pol.act)).judge(aFire(), absorbContext(aFire(), NEUTRAL));
    expect(at.band).toBe("act");
    const below = await gateOf(judgeOf(pol.act - Number.EPSILON)).judge(aFire(), absorbContext(aFire(), NEUTRAL));
    expect(below.band).toBe("escalate");
  });

  test("I-boundary-2: p EXACTLY at flag escalates; just below ignores", async () => {
    const pol = SEED_POLICY["dumb"]!;             // flag 0.35
    const atF = await gateOf(judgeOf(pol.flag)).judge(aFire(), absorbContext(aFire(), NEUTRAL));
    expect(atF.band).toBe("escalate");
    const below = await gateOf(judgeOf(pol.flag - Number.EPSILON)).judge(aFire(), absorbContext(aFire(), NEUTRAL));
    expect(below.band).toBe("ignore");
  });

  // ══════════════════ J — THE NUMERIC EVASION ═══════════════════════════════════════

  test("J-numeric: a NaN from the model routes by the FAIL POLARITY, not by comparison", async () => {
    // ★ R-1, FIXED. Before the fix a NaN failed every `>=` and landed IGNORE regardless
    // of policy — so a corrupt answer BYPASSED THE POLARITY CONTRACT. This class is
    // fail-OPEN, so IGNORE is the correct polarity outcome — but it must be a NAMED
    // DEGRADATION, not an indistinguishable "the model said it was fine".
    const d = await gateOf(judgeOf(Number.NaN)).judge(aFire(), absorbContext(aFire(), NEUTRAL));
    expect(d.band).toBe("ignore");
    expect(d.row.policyName).toContain("+bad-answer");       // ★ the degradation is NAMED
    expect(degradationOf(d.row.policyName)).toBe("BAD_ANSWER");
    expect(d.reason).toContain("NON-FINITE");
  });

  test("J-numeric-2: a NaN on a FAIL-CLOSED class REFUSES — the sharp case", async () => {
    // ★ THE DEFECT'S REAL SHAPE. `theatrical` is fail-CLOSED: its contract says a judge
    // that cannot answer must REFUSE. Before the fix a NaN produced IGNORE here — a
    // dismissal on a surface whose polarity forbids one.
    const f: Fire = aFire({ ruleId: "*theatrical", cls: "theatrical", tool: "goal.complete", evidence: "claims=1 unbound=1 spans[0]=0" });
    const d = await gateOf(judgeOf(Number.NaN)).judge(f, absorbContext(f, NEUTRAL));
    expect(d.probability).toBe(1);                            // the CLOSED polarity
    expect(d.action).toBe("FIRE");
    expect(d.row.policyName).toContain("+bad-answer");
  });

  test("J-numeric-3: Infinity routes by polarity too, never by the comparison", async () => {
    const d = await gateOf(judgeOf(Number.POSITIVE_INFINITY)).judge(aFire(), absorbContext(aFire(), NEUTRAL));
    expect(d.row.policyName).toContain("+bad-answer");        // NOT a real FIRE
    expect(degradationOf(d.row.policyName)).toBe("BAD_ANSWER");
    const f: Fire = aFire({ ruleId: "*destructive", cls: "destructive", tool: "bash", evidence: "certifications=0" });
    const dc = await gateOf(judgeOf(Number.POSITIVE_INFINITY)).judge(f, absorbContext(f, NEUTRAL));
    expect(dc.action).toBe("FIRE");                           // closed → refuse
    expect(dc.row.policyName).toContain("+bad-answer");
  });

  test("J-numeric-3: the ledger REJECTS a non-finite probability loudly", () => {
    const ledger = new FireLedger(path.join(tmpDir(), "j.sqlite"));
    let threw = false;
    let msg = "";
    try {
      ledger.append({
        at: new Date().toISOString(), ruleId: "*dumb", cls: "dumb", questionVersion: "q",
        probability: Number.NaN, band: "ignore", action: "IGNORE", policyName: "p",
        actThreshold: 0.75, flagThreshold: 0.35, stateHash: "h", costUsd: 0, laterTruth: "unresolved",
      });
    } catch (e) { threw = true; msg = e instanceof Error ? e.message : String(e); }
    expect(threw).toBe(true);
    expect(msg).toContain("GI_LEDGER_BAD_PROBABILITY");
    ledger.close();
  });

  // ══════════════════ K — THE POLICY EVASION ════════════════════════════════════════

  test("K-policy: act == flag is REJECTED — the zero-width ESCALATE band", () => {
    // ★ R-2, FIXED. The validator rejected `act < flag` while ACCEPTING `act == flag`,
    // which empties the SAME documented band. Both are now rejected, distinctly named.
    const p = path.join(tmpDir(), "k.json");
    fs.writeFileSync(p, JSON.stringify({ version: 1, policies: { "*dumb": { name: "flat", act: 0.5, flag: 0.5, failPolarity: "open" } } }));
    let threw = false;
    let msg = "";
    try { new PolicyStore(p); } catch (e) { threw = true; msg = e instanceof Error ? e.message : String(e); }
    expect(threw).toBe(true);
    expect(msg).toContain("GI_POLICY_ZERO_WIDTH_BAND");
    // and the INVERTED case keeps its own distinct name
    const p2 = path.join(tmpDir(), "k2.json");
    fs.writeFileSync(p2, JSON.stringify({ version: 1, policies: { "*dumb": { name: "inv", act: 0.2, flag: 0.9, failPolarity: "open" } } }));
    let msg2 = "";
    try { new PolicyStore(p2); } catch (e) { msg2 = e instanceof Error ? e.message : String(e); }
    expect(msg2).toContain("GI_POLICY_INVERTED");
  });

  // ══════════════════ L — THE LEDGER EVASION ════════════════════════════════════════

  test("L-ledger: an empty stateHash is rejected — the row could never be resolved", () => {
    const ledger = new FireLedger(path.join(tmpDir(), "l3.sqlite"));
    let threw = false;
    let msg = "";
    try {
      ledger.append({
        at: new Date().toISOString(), ruleId: "*dumb", cls: "dumb", questionVersion: "q",
        probability: 0.5, band: "ignore", action: "IGNORE", policyName: "p",
        actThreshold: 0.75, flagThreshold: 0.35, stateHash: "   ", costUsd: 0, laterTruth: "unresolved",
      });
    } catch (e) { threw = true; msg = e instanceof Error ? e.message : String(e); }
    expect(threw).toBe(true);
    expect(msg).toContain("GI_LEDGER_EMPTY_STATE_HASH");
    ledger.close();
  });

  test("L-ledger-2: a double drain writes every fire exactly once", async () => {
    const ledger = new FireLedger(path.join(tmpDir(), "l4.sqlite"));
    const gate = gateOf(judgeOf(0.9));
    for (let i = 0; i < 5; i++) {
      const f = aFire({ evidence: `queriedBefore=false n=${i}` });
      await gate.judge(f, absorbContext(f, NEUTRAL));
    }
    expect(drain(gate, ledger)).toBe(5);
    expect(drain(gate, ledger)).toBe(0);
    expect(ledger.count()).toBe(5);
    ledger.close();
  });

  test("L-ledger-3: withLedger cannot leave an unwritten fire", async () => {
    const ledger = new FireLedger(path.join(tmpDir(), "l5.sqlite"));
    const gate = withLedger(gateOf(judgeOf(0.9)), ledger);
    const f = aFire();
    await gate.judge(f, absorbContext(f, NEUTRAL));
    expect(ledger.count()).toBe(1);              // written WITHOUT an explicit drain
    ledger.close();
  });

  // ══════════════════ M — THE REDUCE EVASION ════════════════════════════════════════

  test("M-reduce: a tie between two non-PASS classes resolves to the HEAVIER class", () => {
    const ctx = { toolName: "edit", target: "x", queriedBefore: false, claims: [{ text: "the migration is done and verified", spans: 0 }], certifications: [] };
    const out = classifyByDetectors(DEFAULT_DETECTORS, ctx);
    const worst = worstOutcome(out);
    // dumb (T1) vs theatrical (T2) — the worse VERDICT wins regardless of order
    expect(worst.outcome.verdict).toBe("VIOLATION");
    expect(worst.detector.class).toBe("theatrical");
  });

  test("M-reduce-2: an all-PASS run is BENIGN, never the first detector's class", () => {
    const ctx = { toolName: "edit", target: "x", queriedBefore: true, claims: [{ text: "scoped", spans: 2 }], certifications: [{ layer: "L5_CORBELL" as const, verdict: "PASS" as const, reason: "ok" }] };
    const out = classifyByDetectors(DEFAULT_DETECTORS, ctx);
    const worst = worstOutcome(out);
    expect(worst.outcome.verdict).toBe("PASS");
    const inp: KernelInput = { ...ctx, layers: ALL_UP() };
    const r = runKernelV2(inp);
    expect(r.verdict).toBe("ALLOW");
    expect(r.class).toBe("benign");
  });
});
