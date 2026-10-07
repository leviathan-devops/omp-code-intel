// st-gi-v21-advisory — W3: POSITION A, THE PRE-ACT ADVISORY (fail-OPEN).
//
// THE OPERATOR'S RULING: the gate sits in BOTH positions — "1) both". This is
// the FIRST half. Before an act runs, the gate asks whether the SHAPE of the
// INTENDED act is a violation. An act not yet taken can be steered for free; the
// v2.0 post-hoc refusal costs the agent the whole edit.
//
// ★ THE LAW OF THIS SURFACE, ENCODED IN THE TYPE: FAIL-OPEN. An advisory that
//   cannot reach the model MUST NOT block a legitimate act. `Advisory.block` is
//   the literal type `false` — position A cannot block BY CONSTRUCTION, so a
//   future edit that tried to make it refuse would not compile.
//
// ★ AND IT COMPOSES WITH WHAT ALREADY EXISTS. The v1.3 gate already has a
//   pre-act advisory (`gateAdvisory`, typed-write.ts:1213) — a DETERMINISTIC
//   caller-listing that costs $0 and says WHICH callers a change would break.
//   That one INFORMS; this one ADJUDICATES. They are complementary, and
//   re-inventing the caller list here would be duplicate machinery.
//
// ADVERSARIAL-FIRST: the fail-open paths run before the happy path, because a
// surface that fails CLOSED here would block every legitimate act on the host.

import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  FireGate,
  absorbContext,
  advisory,
  intentFire,
  type Intent,
  type StreamRecord,
} from "../src/omp/fire-gate.ts";
import type { Judge } from "../src/omp/enforcement.ts";
import { FireLedger, drain } from "../src/omp/fire-ledger.ts";

function stubJudge(p: number, calls?: { n: number }): Judge {
  return {
    async evaluate() {
      if (calls) calls.n += 1;
      return [{ id: "fire_is_real", probability: p }];
    },
  };
}
function throwingJudge(message: string): Judge {
  return { async evaluate() { throw new Error(message); } };
}
function emptyJudge(): Judge {
  return { async evaluate() { return []; } };   // an answer-less judge
}

/** A stream that does NOT settle the fire at the MPSE layer: the target is
 *  mentioned without a negation, and the evidence is non-empty. */
const STREAM: StreamRecord[] = [
  { kind: "reasoning", text: "because the kernel file is next", offsetMs: -200 },
  { kind: "toolcall", text: "ripwire callers kernel-v2", offsetMs: -100 },
];

function anIntent(over: Partial<Intent> = {}): Intent {
  return { tool: "edit", target: "src/omp/kernel-v2.ts", queriedBefore: false, ...over };
}
function ctxFor(intent: Intent) {
  return absorbContext(intentFire(intent), STREAM);
}
function aGate(judge: Judge, now = () => 1000): FireGate {
  return new FireGate({ judge, now });
}

describe("st-gi-v21-advisory: W3 — position A, fail-OPEN", () => {
  // ══ ADVERSARIAL FIRST: the fail-open paths ═══════════════════════════════

  test("test_advisory_fails_open — a THROWING judge never blocks the act", async () => {
    const intent = anIntent();
    const a = await advisory(aGate(throwingJudge("jev is down")), intent, ctxFor(intent));
    expect(a.verdict).toBe("pass");           // ★ the act PROCEEDS
    expect(a.block).toBe(false);
    expect(a.skipped).not.toBeNull();
    expect(a.skipped!.code).toContain("GI_ADVISORY_OPEN");
    // LOUD means the reason is CARRIED, not swallowed.
    expect(a.skipped!.message).toContain("jev is down");
    // ★ AND THE DEGRADATION IS RECORDED — my first version of this test asserted
    //   `row === null` ("no judgment ⇒ no row") and the implementation refused:
    //   the gate had ALREADY written a row carrying the fail-open mark (D010's
    //   "the act proceeds and the miss is RECORDED"). Returning null would have
    //   DISCARDED that record — an advisory that hides its own degradation is
    //   the silent-failure class this kernel exists to kill.
    expect(a.row).not.toBeNull();
    expect(a.row!.policyName).toContain("+fail-open");
    expect(a.skipped!.code).toContain("JUDGE_UNAVAILABLE");
  });

  test("test_advisory_fails_open_on_no_answer — an answer-less judge is UNCERTIFIABLE, not a pass", async () => {
    const intent = anIntent();
    const a = await advisory(aGate(emptyJudge()), intent, ctxFor(intent));
    expect(a.verdict).toBe("pass");           // fail-open: the act still proceeds
    expect(a.block).toBe(false);
    // ★ but the SKIP IS NAMED — "uncertifiable" must be distinguishable from
    //   "the model said it was fine".
    expect(a.skipped!.code).toContain("GI_ADVISORY_OPEN");
    expect(a.skipped!.code).toContain("NO_ANSWER");
  });

  test("test_advisory_budget_exhaustion_is_not_a_block — D017 on an advisory", async () => {
    const intent = anIntent();
    const gate = new FireGate({
      judge: stubJudge(0.99),
      budgetFires: 0,                            // ★ the budget is already spent
      now: () => 1000,
    });
    const a = await advisory(gate, intent, ctxFor(intent));
    expect(a.verdict).toBe("pass");              // an advisory NEVER blocks
    expect(a.skipped!.code).toContain("GI_ADVISORY_OPEN");
  });

  // ══ THE HAPPY PATH — LAST ════════════════════════════════════════════════

  test("test_advisory_open — an intended BLIND edit gets a steer", async () => {
    const calls = { n: 0 };
    const intent = anIntent({ queriedBefore: false });   // the blind edit, NOT yet taken
    const a = await advisory(aGate(stubJudge(0.95, calls)), intent, ctxFor(intent));

    expect(calls.n).toBe(1);                    // the model WAS consulted
    expect(a.verdict).toBe("steer");            // ★ an advisory FIRES
    expect(a.block).toBe(false);                // ★ and it does NOT block
    expect(a.probability).toBeCloseTo(0.95, 6);
    expect(a.skipped).toBeNull();
    // the row is recorded — SC-8: every fire leaves a row
    expect(a.row).not.toBeNull();
    expect(a.row!.ruleId).toBe("*dumb");
    expect(a.row!.cls).toBe("dumb");
    expect(a.row!.laterTruth).toBe("unresolved");
  });

  test("test_advisory_legit_intent_passes — a MAPPED intent meets zero friction", async () => {
    const calls = { n: 0 };
    const intent = anIntent({ queriedBefore: true });     // the graph WAS consulted
    const a = await advisory(aGate(stubJudge(0.02, calls)), intent, ctxFor(intent));
    expect(a.verdict).toBe("pass");
    expect(a.block).toBe(false);
    expect(a.skipped).toBeNull();               // it was JUDGED, not skipped
    expect(calls.n).toBe(1);
  });

  test("test_advisory_steer_carries_a_human_reason — the operator reads why", async () => {
    const intent = anIntent({ queriedBefore: false });
    const a = await advisory(aGate(stubJudge(0.95)), intent, ctxFor(intent));
    expect(a.reason).toContain("*dumb");        // the rule that fired
    expect(a.reason).toMatch(/0\.9[0-9]{2}/);   // the probability
    expect(a.reason).toContain("act>=");        // the threshold IN FORCE (§6.4.3 rule 3)
  });

  test("test_advisory_never_blocks_whatever_the_model_says — p=1.00 still does not block", async () => {
    const intent = anIntent({ queriedBefore: false });
    const a = await advisory(aGate(stubJudge(1.0)), intent, ctxFor(intent));
    expect(a.verdict).toBe("steer");
    expect(a.block).toBe(false);                // ★ the maximum certainty, and STILL no block
    // ★ and the TYPE is the enforcement: `block` is the literal `false`, so a
    //   consumer cannot narrow it to `true` without a compile error.
    const typed: false = a.block;
    expect(typed).toBe(false);
  });

  test("test_advisory_row_lands_in_the_ledger — position A feeds the SAME table", async () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "gi-v21-adv-"));
    const ledger = new FireLedger(path.join(d, "fire.sqlite"));
    const intent = anIntent({ queriedBefore: false });
    const gate = aGate(stubJudge(0.95));
    const a = await advisory(gate, intent, ctxFor(intent));
    expect(a.row).not.toBeNull();

    // the advisory's fire went through gate.judge, so `rows()` holds it and the
    // ledger drain picks it up — ONE table for BOTH positions.
    const n = drain(gate, ledger);
    expect(n).toBe(1);
    expect(ledger.count()).toBe(1);
    const row = ledger.all()[0]!;
    expect(row.ruleId).toBe("*dumb");
    expect(row.probability).toBeCloseTo(0.95, 6);
    ledger.close();
  });

  test("test_intent_fire_shapes_match_the_detector_classes — one vocabulary", () => {
    expect(intentFire(anIntent({ tool: "edit" })).cls).toBe("dumb");
    expect(intentFire(anIntent({ tool: "write" })).cls).toBe("dumb");
    expect(intentFire(anIntent({ tool: "goal.complete" })).cls).toBe("theatrical");
    expect(intentFire(anIntent({ tool: "bash", target: "rm -rf /" })).cls).toBe("destructive");
    // the fire names its TARGET and the ACT — the same fields the detectors fill
    const f = intentFire(anIntent({ tool: "edit", target: "a/b.ts" }));
    expect(f.target).toBe("a/b.ts");
    expect(f.tool).toBe("edit");
    expect(f.evidence).toContain("queriedBefore");
  });
});
