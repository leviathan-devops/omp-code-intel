// st-gi-v21-wiring — W4: POSITION B, THE POST-DETECTOR FILTER. ★ THE WIRING.
//
// THE ANTI-PATTERN THIS WAVE EXISTS TO KILL (the pin's CLASS 3, "THE UNWIRED
// KERNEL"): a module that exists, is tested, and is called by NOTHING. Measured
// at the start of this session: `grep -rn "FireGate" src/ tests/` outside its
// own file returned **0**. fire-gate.ts (370 L) and calibration.ts (185 L) were
// fully built, fully tested, and connected to nothing at all. A gate nobody
// calls is a library, not an enforcement layer.
//
// THE CALL SITE (blueprint §S5/S6): between the detector's VIOLATION and the
// v2.0 verdict. The detector says "this SHAPE is a violation"; the gate says
// whether the shape is REAL. The band→action table is the blueprint's, verbatim:
//
//     p >= policy.act   → FIRE      (the v2.0 verdict APPLIES)
//     p >= policy.flag  → ESCALATE  (flagged; the verdict still applies)
//     else              → IGNORE    (the act proceeds; the firing was NOISE)
//
// ★ THE POLARITY OF THIS SURFACE, AND WHY: the gate can only ever DISMISS a
//   firing. So when it cannot adjudicate — no gate wired, a down judge, a spent
//   budget — the DETECTOR'S VERDICT STANDS. Failing to filter must never reduce
//   enforcement. (Contrast position A, whose type forbids blocking; the two
//   surfaces have OPPOSITE safe directions, which is exactly D010's point.)
//
// ★ WHY THE SYNC runKernelV2 IS LEFT UNTOUCHED: the judge is async by nature
//   (it is a model call). Making runKernelV2 async would break every existing
//   caller and ~20 tests — a frozen surface. The gate therefore wraps the
//   stage machine: `runKernelV2` stays pure and synchronous, and
//   `runKernelV2Gated` adjudicates its output. The gate still sits exactly
//   where the blueprint puts it — between the detector's verdict and the
//   verdict the caller acts on.
//
// ADVERSARIAL-FIRST: the cannot-adjudicate paths run before the happy path.

import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  fileLayer,
  runKernelV2Gated,
  type KernelInput,
  type LayerDeclaration,
} from "../src/omp/kernel-v2.ts";
import { FireGate } from "../src/omp/fire-gate.ts";
import type { Judge } from "../src/omp/enforcement.ts";
import { FireLedger, drain } from "../src/omp/fire-ledger.ts";
import * as os from "node:os";

// ── the harness ─────────────────────────────────────────────────────────────
function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "gi-v21-wire-")); }
function upLayer(id: LayerDeclaration["id"], dep: string, code: string): LayerDeclaration {
  const f = path.join(tmp(), "present");
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

/** A REAL violation the DETECTOR finds on its own: a claim with ZERO bound
 *  spans → theatricalDetector → VIOLATION T2 → the v2.0 verdict is REFUSE. */
function aViolation(over: Partial<KernelInput> = {}): KernelInput {
  return {
    toolName: "goal.complete",
    target: "migration",
    queriedBefore: true,
    claims: [{ text: "the migration is done and verified", spans: 0 }],
    certifications: [{ layer: "L5_CORBELL", verdict: "PASS", reason: "in scope" }],
    layers: ALL_UP(),
    ...over,
  };
}

/** A CLEAN act: nothing for any detector to say. */
function aCleanAct(over: Partial<KernelInput> = {}): KernelInput {
  return {
    toolName: "edit",
    target: "src/omp/kernel-v2.ts",
    queriedBefore: true,
    claims: [{ text: "the edit is scoped", spans: 2 }],
    certifications: [{ layer: "L5_CORBELL", verdict: "PASS", reason: "in scope" }],
    layers: ALL_UP(),
    ...over,
  };
}

function stubJudge(p: number, calls?: { n: number }): Judge {
  return { async evaluate() { if (calls) calls.n += 1; return [{ id: "fire_is_real", probability: p }]; } };
}
function throwingJudge(message: string): Judge {
  return { async evaluate() { throw new Error(message); } };
}
function aGate(judge: Judge): FireGate {
  return new FireGate({ judge, now: () => 1000 });
}

describe("st-gi-v21-wiring: W4 — the post-detector filter", () => {
  // ══ ADVERSARIAL FIRST: the cannot-adjudicate paths ═══════════════════════

  test("test_gate_absent_never_dismisses — no gate ⇒ the detector's verdict STANDS, named", async () => {
    const base = await runKernelV2Gated(aViolation(), undefined);
    expect(base.preGateVerdict).toBe("REFUSE");
    expect(base.verdict).toBe("REFUSE");        // ★ NOT dismissed by an absent filter
    expect(base.adjudication).toBeNull();
    expect(base.gateSkipped).not.toBeNull();
    expect(base.gateSkipped!.code).toContain("GI_GATE_ABSENT");
  });

  test("test_gate_unavailable_never_dismisses — a DOWN judge ⇒ the violation stands", async () => {
    const base = await runKernelV2Gated(aViolation(), aGate(throwingJudge("jev is down")));
    expect(base.preGateVerdict).toBe("REFUSE");
    expect(base.verdict).toBe("REFUSE");        // ★ a down filter does not reduce enforcement
    expect(base.adjudication).toBeNull();       // NO real adjudication happened
    expect(base.gateSkipped!.code).toContain("GI_GATE_UNAVAILABLE");
    // ★ THE LESSON FROM EN-056 APPLIED IN ADVANCE: the gate does NOT throw when
    //   its judge is down — D010's fail-polarity path catches internally and
    //   returns a row marked with a policy-name suffix. So the degradation is
    //   detected on the SUFFIX, not on an exception.
    expect(base.gateSkipped!.code).toContain("JUDGE_UNAVAILABLE");
    expect(base.gateSkipped!.message).toContain("jev is down");
  });

  test("test_gate_degraded_row_never_dismisses_on_a_FAIL_OPEN_class — the sharpest case", async () => {
    // ★ THE DEFECT THIS TEST WAS WRITTEN TO CATCH: `dumb` is fail-OPEN, so a
    //   down judge yields a degraded row whose action reads IGNORE. Applying
    //   that action would DISMISS a real violation because the model was
    //   unreachable — a down judge silently switching enforcement off. The
    //   detector's verdict must stand instead.
    const blindEdit = aCleanAct({ toolName: "edit", target: "src/omp/X.ts", queriedBefore: false });
    // sanity: the DETECTOR alone calls this a violation (T1 → STEER)
    const base = await runKernelV2Gated(blindEdit, aGate(throwingJudge("jev is down")));
    expect(base.preGateVerdict).toBe("STEER");
    expect(base.verdict).toBe("STEER");         // ★ NOT dismissed to ALLOW
    expect(base.adjudication).toBeNull();
    expect(base.gateSkipped!.code).toContain("JUDGE_UNAVAILABLE");
  });

  test("test_gate_allow_passthrough_costs_nothing — a clean act never reaches the model", async () => {
    const calls = { n: 0 };
    const base = await runKernelV2Gated(aCleanAct(), aGate(stubJudge(0.99, calls)));
    expect(base.preGateVerdict).toBe("ALLOW");
    expect(base.verdict).toBe("ALLOW");
    expect(base.adjudication).toBeNull();
    expect(base.gateSkipped).toBeNull();        // nothing was skipped — nothing was ASKED
    expect(calls.n).toBe(0);                    // ★ ZERO model calls on a clean act
  });

  // ══ THE HAPPY PATH — LAST ════════════════════════════════════════════════

  test("test_gate_fire — a REAL violation adjudicated FIRE keeps the v2.0 verdict", async () => {
    const calls = { n: 0 };
    const base = await runKernelV2Gated(aViolation(), aGate(stubJudge(0.95, calls)));
    expect(calls.n).toBe(1);                    // the model WAS consulted
    expect(base.preGateVerdict).toBe("REFUSE");
    expect(base.verdict).toBe("REFUSE");        // ★ FIRE ⇒ the v2.0 verdict APPLIES
    expect(base.adjudication).not.toBeNull();
    expect(base.adjudication!.action).toBe("FIRE");
    expect(base.adjudication!.probability).toBeCloseTo(0.95, 6);
    expect(base.adjudication!.cls).toBe("theatrical");
    expect(base.gateSkipped).toBeNull();
  });

  test("test_gate_ignore — a FALSE POSITIVE adjudicated IGNORE is DISMISSED", async () => {
    const base = await runKernelV2Gated(aViolation(), aGate(stubJudge(0.02)));
    expect(base.preGateVerdict).toBe("REFUSE");
    expect(base.verdict).toBe("ALLOW");         // ★ the firing was NOISE — the act proceeds
    expect(base.adjudication!.action).toBe("IGNORE");
    expect(base.code).toBeNull();               // the refusal code is cleared with the verdict
    expect(base.reason).toContain("IGNORE");    // and the dismissal is EXPLAINED
  });

  test("test_gate_escalate — the flag band flags without dismissing", async () => {
    const base = await runKernelV2Gated(aViolation(), aGate(stubJudge(0.60)));
    expect(base.adjudication!.action).toBe("ESCALATE");
    expect(base.verdict).toBe("REFUSE");        // ★ ESCALATE keeps the verdict — it only FLAGS
    expect(base.preGateVerdict).toBe("REFUSE");
  });

  test("test_gate_row_lands_in_the_ledger — position B feeds the SAME table as A", async () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "gi-v21-wire-led-"));
    const ledger = new FireLedger(path.join(d, "fire.sqlite"));
    const gate = aGate(stubJudge(0.95));
    const base = await runKernelV2Gated(aViolation(), gate);
    expect(base.adjudication).not.toBeNull();

    const n = drain(gate, ledger);
    expect(n).toBe(1);
    const row = ledger.all()[0]!;
    expect(row.ruleId).toBe("*theatrical");
    expect(row.cls).toBe("theatrical");
    expect(row.probability).toBeCloseTo(0.95, 6);
    expect(row.laterTruth).toBe("unresolved");
    // §6.4.3 rule 3 — the threshold IN FORCE rides the row
    expect(row.actThreshold).toBeGreaterThan(0);
    ledger.close();
  });

  // ══ EN-086 — THE DEGRADATION IS CLASSIFIED BY CODE, NEVER BY PROSE ══════════════
  // ★ FOUND BY THE HOST SUITE (S12). The gated runner returned the generic
  //   GI_GATE_UNAVAILABLE for EVERY failure, so a caller could not tell "the budget ran out"
  //   from "the model is broken" without parsing the message — the EN-056 lesson
  //   ("detect a degradation by the SUFFIX, never by reason prose") one layer up.

  test("EN-086: a spent budget is a DISTINCT named skip from a down judge", async () => {
    const vi = aViolation();
    // the budget is spent BEFORE the fire, so the gate throws its named D017 token
    const broke = new FireGate({ judge: stubJudge(0.99), budgetFires: 0 });
    const r1 = await runKernelV2Gated(vi, broke);
    expect(r1.gateSkipped).not.toBeNull();
    // ★ THE SPECIFIC CODE — not a generic unavailability, and not prose
    expect(r1.gateSkipped!.code).toBe("GI_GATE_BUDGET_EXHAUSTED");
    // and the detector's verdict STOOD (the gated runner never rejects)
    expect(r1.verdict).toBe(r1.preGateVerdict);

    // the SAME shape from a DOWN judge carries the OTHER code. ★ AND THE VOCABULARY IS
    // TWO-TIERED, which the first version of this test got wrong: a down judge does NOT
    // throw out of the gate (the gate catches its own judge and writes a `+fail-*` row), so
    // the runner's `degradationOf` branch names it with its SUFFIX. Only the THROW path
    // (the budget, which is a refusal to call at all) reaches the runner's own catch.
    const down = new FireGate({ judge: { async evaluate() { throw new Error("jev is down"); } } });
    const r2 = await runKernelV2Gated(vi, down);
    expect(r2.gateSkipped!.code).toBe("GI_GATE_UNAVAILABLE:JUDGE_UNAVAILABLE");
    // ★ THE TWO ARE DISTINGUISHABLE BY CODE ALONE — which is the whole point
    expect(r1.gateSkipped!.code).not.toBe(r2.gateSkipped!.code);
    expect(r1.gateSkipped!.code).toContain("BUDGET");
    expect(r2.gateSkipped!.code).toContain("JUDGE_UNAVAILABLE");
  });

  test("test_gate_wiring_is_present — the anti-pattern CLASS 3 detection", () => {
    // The wave's own exit gate: grep -c "FireGate" src/omp/kernel-v2.ts > 0.
    // Asserted HERE as a test so the wiring cannot be silently removed.
    const src = fs.readFileSync(
      path.join(import.meta.dir, "..", "src", "omp", "kernel-v2.ts"), "utf8",
    );
    const hits = src.split("\n").filter((l) => l.includes("FireGate")).length;
    expect(hits).toBeGreaterThan(0);
    // and it must be an IMPORT + a CALL, not a comment mentioning the name
    expect(src).toContain('from "./fire-gate.ts"');
    expect(src).toContain("gate.judge(");
  });
});
