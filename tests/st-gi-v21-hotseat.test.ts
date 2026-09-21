// st-gi-v21-hotseat — P4: THE RUNTIME SEAT'S FINDINGS, PINNED.
//
// ★ PROVENANCE: these two defects were found by DRIVING the live gate (P4, the hot seat,
//   .mimocode/runtime-grade/hotseat-report.json) — not by reading it and not by the
//   adversarial corpus. Both are the class the pin warns about by name:
//     "a SILENT wrong-answer / no-op / HANG is CRITICAL."
//
//   H4-5  a judge that NEVER RESOLVES hung the gate FOREVER. `budgetFires` bounds the
//         NUMBER of fires; NOTHING bounded TIME, so the ceiling belonged to whichever
//         judge was passed in. The ENFORCEMENT layer could hang the agent.
//   W2-1  N CONCURRENT fires with the same state ALL MISSED the cache and ALL paid the
//         model. Measured: 24 fires over 3 distinct states → cacheHits=0, 24 calls.
//         The cache is documented "the same firing never pays twice" with a 60-80%
//         expected hit rate, and the operator's cost envelope assumes those hits.

import { describe, test, expect } from "bun:test";
import {
  FireGate, DEFAULT_JUDGE_TIMEOUT_MS, FireGateTimeout, absorbContext, degradationOf, QUESTION_VERSION,
  type Fire,
} from "../src/omp/fire-gate.ts";
import type { Judge } from "../src/omp/enforcement.ts";

function aFire(over: Partial<Fire> = {}): Fire {
  return { ruleId: "*dumb", cls: "dumb", shape: "blind edit", tool: "edit", target: "src/omp/kernel-v2.ts", evidence: "queriedBefore=false", ...over };
}
const NEUTRAL = [{ kind: "reasoning", text: "because the file is next", offsetMs: -100 }];
function judgeOf(p: number, calls?: { n: number }): Judge {
  return { async evaluate() { if (calls) calls.n += 1; return [{ id: "fire_is_real", probability: p }]; } };
}

describe("st-gi-v21-hotseat: the runtime seat's findings", () => {
  // ══ H4-5 — THE GATE'S OWN CEILING ════════════════════════════════════════════

  test("H4-5: a judge that NEVER resolves cannot hang the gate", async () => {
    const neverSettles = Promise.withResolvers<never>().promise;
    const gate = new FireGate({
      judge: { async evaluate() { return await neverSettles; } },
      judgeTimeoutMs: 300,                      // a short ceiling for the test
    });
    const t0 = Date.now();
    const d = await gate.judge(aFire(), absorbContext(aFire(), NEUTRAL));
    const elapsed = Date.now() - t0;
    // ★ the gate RETURNED, well inside the default 10s, because the ceiling is the GATE's
    expect(elapsed).toBeLessThan(3_000);
    expect(d.row.policyName).toContain("+timeout");
    expect(degradationOf(d.row.policyName)).toBe("TIMEOUT");
    expect(d.reason).toContain("ceiling");
    // and the polarity still routes: dumb is fail-OPEN, so the act proceeds
    expect(d.action).toBe("IGNORE");
  });

  test("H4-5b: the ceiling is the GATE's, not the judge's — a slow-but-alive judge degrades", async () => {
    const gate = new FireGate({
      judge: { async evaluate() { await Bun.sleep(5_000); return [{ id: "fire_is_real", probability: 0.9 }]; } },
      judgeTimeoutMs: 250,
    });
    const d = await gate.judge(aFire(), absorbContext(aFire(), NEUTRAL));
    expect(degradationOf(d.row.policyName)).toBe("TIMEOUT");
    expect(d.probability).toBe(0);              // the fail-OPEN polarity for `dumb`
  });

  test("H4-5c: a TIMEOUT and a JUDGE ERROR are NAMED differently", async () => {
    const thrown = new FireGate({ judge: { async evaluate() { throw new Error("boom"); } } });
    const d = await thrown.judge(aFire(), absorbContext(aFire(), NEUTRAL));
    expect(degradationOf(d.row.policyName)).toBe("JUDGE_UNAVAILABLE");
    expect(degradationOf(d.row.policyName)).not.toBe("TIMEOUT");
    // a consumer that cannot tell "slow" from "broken" cannot act on either
    expect(DEFAULT_JUDGE_TIMEOUT_MS).toBeGreaterThan(0);
    expect(new FireGateTimeout(1).message).toContain("GI_FIREGATE_JUDGE_TIMEOUT");
  });

  test("H4-5d: a judge that ANSWERS inside the ceiling is untouched", async () => {
    const calls = { n: 0 };
    const gate = new FireGate({ judge: judgeOf(0.95, calls), judgeTimeoutMs: 5_000 });
    const d = await gate.judge(aFire(), absorbContext(aFire(), NEUTRAL));
    expect(calls.n).toBe(1);
    expect(d.row.policyName).not.toContain("+timeout");
    expect(d.action).toBe("FIRE");
  });

  // ══ W2-1 — SINGLE-FLIGHT (concurrent identical fires) ════════════════════════

  test("W2-1: N CONCURRENT identical fires share ONE model call", async () => {
    const calls = { n: 0 };
    const gate = new FireGate({ judge: judgeOf(0.9, calls) });
    const f = aFire({ evidence: "concurrent-identical" });
    const N = 8;
    // ★ the state is identical for all N (same evidence, same target, no timestamp in
    //   buildState), so they are genuinely the same judgment.
    const results = await Promise.all(
      Array.from({ length: N }, () => gate.judge(f, absorbContext(f, NEUTRAL))),
    );
    // ★ ONE call, N decisions. Before the fix this was N calls.
    expect(calls.n).toBe(1);
    expect(results.length).toBe(N);
    // ★ and exactly ONE of them is the creator; the rest report as cached, because the
    //   same state did not pay twice.
    const cachedCount = results.filter((r) => r.cached).length;
    expect(cachedCount).toBe(N - 1);
    // every fire still leaves its own row (SC-8 holds under concurrency)
    expect(gate.rows().length).toBe(N);
    // ★ EN-076 — THE TWO METERS ARE SEPARATE AND BOTH HONEST. D017's hard stop bounds the
    //   NUMBER OF FIRES (8 here — every judgment that reached the model path); the ECONOMIC
    //   meter counts actual model calls (1 — the single-flight share). My first version
    //   collapsed them into the call count, which made the hard stop bypassable by
    //   concurrency.
    expect(gate.firesUsed()).toBe(N);          // the D017 stop: N fires
    expect(gate.modelCallsUsed()).toBe(1);     // the economic meter: 1 call
  });

  test("W2-1b: sequential identical fires still hit the long-lived cache", async () => {
    const calls = { n: 0 };
    const gate = new FireGate({ judge: judgeOf(0.9, calls) });
    const f = aFire({ evidence: "sequential-identical" });
    const a = await gate.judge(f, absorbContext(f, NEUTRAL));
    const b = await gate.judge(f, absorbContext(f, NEUTRAL));
    expect(calls.n).toBe(1);
    expect(a.cached).toBe(false);
    expect(b.cached).toBe(true);                // the cache, not the single-flight
    expect(gate.firesUsed()).toBe(1);
  });

  test("W2-1c: DISTINCT states are never collapsed", async () => {
    const calls = { n: 0 };
    const gate = new FireGate({ judge: judgeOf(0.9, calls) });
    await Promise.all(Array.from({ length: 5 }, (_, i) => {
      const f = aFire({ evidence: `distinct=${i}` });
      return gate.judge(f, absorbContext(f, NEUTRAL));
    }));
    expect(calls.n).toBe(5);                    // five states, five calls
    expect(gate.rows().length).toBe(5);
  });

  // ══ EN-075 — A TIMED-OUT CALL IS ABANDONED (the shared-hang class) ═════════════
  // ★ PASS-6 HIGH, AND THE SECOND TIME THIS SESSION I DESCRIBED A DEFECT WITHOUT FIXING
  //   IT: I wrote it into a commit message as "REGRESSION 1" and my fix list omitted it.
  //   The mechanism: judgeOnce evicted only when the JUDGE promise settled — and a hung
  //   judge NEVER settles — so the entry persisted and EVERY later same-state fire
  //   inherited the hung promise. H4-5 bounded ONE call; W2-1 SHARED the call; together
  //   they made the hang SHARED.

  test("EN-075: a TIMED-OUT call does not poison later fires with the same state", async () => {
    const neverSettles = Promise.withResolvers<never>().promise;
    const gate = new FireGate({
      judge: { async evaluate() { return await neverSettles; } },
      judgeTimeoutMs: 200,
    });
    const f = aFire({ evidence: "en075-same-state" });
    const t0 = Date.now();
    const d1 = await gate.judge(f, absorbContext(f, NEUTRAL));
    const t1 = Date.now();
    expect(degradationOf(d1.row.policyName)).toBe("TIMEOUT");

    // ★ THE SAME STATE, AGAIN. Before the fix this inherited the hung in-flight promise
    //   and hung for its own ceiling too (or forever, with a longer ceiling).
    const d2 = await gate.judge(f, absorbContext(f, NEUTRAL));
    const t2 = Date.now();
    expect(degradationOf(d2.row.policyName)).toBe("TIMEOUT");
    // ★ fire 2 made its OWN call: it paid its own ceiling, and it was not served from cache
    expect(t2 - t1).toBeLessThan(1_500);
    expect(d2.cached).toBe(false);
    expect(t1 - t0).toBeLessThan(1_500);
    // ★ and the two meters tell the story: 2 fires, 2 calls (each timed out on its own)
    expect(gate.firesUsed()).toBe(2);
    expect(gate.modelCallsUsed()).toBe(2);
  });

  // ══ R-D — THE CACHE IS VERSION-SCOPED ════════════════════════════════════════
  // The question probe exposed it: buildState has NO questionVersion field, so the state
  // hash covers trigger+context only. Before this fix the cache was keyed by stateHash
  // alone — a question re-authoring would serve OLD answers under a NEW name. Now the key
  // is (QUESTION_VERSION, stateHash), and the ledger row (which already records
  // questionVersion) agrees with the cache.

  test("R-D: the ledger row records the question version that produced it", async () => {
    const gate = new FireGate({ judge: judgeOf(0.9) });
    const d = await gate.judge(aFire({ evidence: "rd-version-record" }), absorbContext(aFire(), NEUTRAL));
    // ★ the row names the question that produced the probability — the cache must agree
    expect(d.row.questionVersion).toBe("fire-legitimacy-v1");
  });

  test("R-Db: a cached answer carries the SAME question version as its row", async () => {
    const calls = { n: 0 };
    const gate = new FireGate({ judge: judgeOf(0.9, calls) });
    const f = aFire({ evidence: "rd-version-agree" });
    const a = await gate.judge(f, absorbContext(f, NEUTRAL));
    const b = await gate.judge(f, absorbContext(f, NEUTRAL));
    expect(calls.n).toBe(1);                    // one call, one cached repeat
    expect(b.cached).toBe(true);
    // ★ the cached repeat is stamped with the version that PRODUCED it — never a version
    //   that did not ask. A re-authored question must not be served this answer.
    expect(b.row.questionVersion).toBe(a.row.questionVersion);
    expect(b.row.probability).toBe(a.row.probability);
  });

  test("R-Dc: questionVersion is a module constant the ledger and cache share", async () => {
    expect(QUESTION_VERSION).toBe("fire-legitimacy-v1");
    const gate = new FireGate({ judge: judgeOf(0.9) });
    const d = await gate.judge(aFire({ evidence: "rd-version-const" }), absorbContext(aFire(), NEUTRAL));
    expect(d.row.questionVersion).toBe(QUESTION_VERSION);
  });
});
