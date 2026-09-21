// st-gi-v2-enforce — T-5 THE ENFORCEMENT KERNEL (TSG load unit + Abide ALU).
// The two polarities are the point: E1 fails OPEN (an edit is never wedged),
// E2 fails CLOSED (a false "done" IS the defect). Adversarial-first.
import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { bandOf, runCloseLayer, runWorkLayer, type EnforcementDeps, type Judge, type LoadUnit } from "../src/omp/enforcement.ts";
import { pathComponent, type ComponentDecl } from "../src/omp/hard-deps.ts";

function tmp(): string { return fs.mkdtempSync(path.join(os.tmpdir(), "gi-enf-")); }

/** A register where every component is UP (real files on disk). */
function allUp(): ComponentDecl[] {
  const dir = tmp();
  const mk = (id: string, code: string) => {
    const f = path.join(dir, id);
    fs.writeFileSync(f, "x");
    return pathComponent(id, "kernel", `the ${id} engine`, code, f);
  };
  return [mk("TSG", "GI_ENFORCE_TSG"), mk("ABIDE", "GI_ENFORCE_ABIDE"), mk("JEV", "GI_JEV_DOWN")];
}
function allDown(): ComponentDecl[] {
  const root = tmp();
  const mk = (id: string, code: string) =>
    pathComponent(id, "kernel", `the ${id} engine`, code, path.join(root, `${id}-absent`));
  return [mk("TSG", "GI_ENFORCE_TSG"), mk("ABIDE", "GI_ENFORCE_ABIDE"), mk("JEV", "GI_JEV_DOWN")];
}
/** A judge that answers the questions it was ASKED (by their ids) — the contract.
 *  A judge that invents ids is exercised separately (the judge-defect case). */
const judgeOf = (p: number): Judge => ({
  evaluate: async (_state, questions) => questions.map((q) => ({ id: q.id, probability: p })),
});
const loadOf = (spans: Array<{ quote: string; source: string }>, coverage: "complete" | "incomplete" = "complete"): LoadUnit =>
  ({ retrieve: async () => ({ spans, coverage }) });
const deps = (over: Partial<EnforcementDeps> = {}): EnforcementDeps => ({
  judge: judgeOf(0.9), loadUnit: loadOf([{ quote: "exit 0", source: "log:1" }]), register: allUp(), ...over,
});

describe("st-gi-v2-enforce: T-5 — the two-layer enforcement kernel", () => {
  test("bandThresholds_are_declared_not_magic", () => {
    expect(bandOf(0.95)).toBe("act");
    expect(bandOf(0.8)).toBe("act");
    expect(bandOf(0.6)).toBe("flag");
    expect(bandOf(0.5)).toBe("flag");
    expect(bandOf(0.49)).toBe("clear");
  });

  // ── E1 · WORK LAYER — fail-OPEN ──────────────────────────────────────────
  test("e1_an_act_band_verdict_appends_REPAIR_text_never_a_rollback", async () => {
    const r = await runWorkLayer(deps(), {
      diff: "- const a = 1;", task: "add a", rules: [{ id: "no-unused", instructions: "unused const?", whenTrue: "unused", whenFalse: "used" }],
    });
    expect(r.verdict).toBe("REPAIR");
    expect(r.repair).toContain("no-unused");
    expect(r.repair).toContain("NOT reverted");     // R3: repair text, not a block
  });

  test("e1_a_clear_band_is_silent", async () => {
    const r = await runWorkLayer(deps({ judge: judgeOf(0.1) }), {
      diff: "x", task: "t", rules: [{ id: "r", instructions: "i", whenTrue: "y", whenFalse: "n" }],
    });
    expect(r.verdict).toBe("SILENT");
  });

  test("e1_fail_OPEN_a_down_engine_SKIPS_with_the_named_code_never_wedges", async () => {
    const r = await runWorkLayer(deps({ register: allDown() }), {
      diff: "x", task: "t", rules: [{ id: "r", instructions: "i", whenTrue: "y", whenFalse: "n" }],
    });
    expect(r.verdict).toBe("SKIPPED");              // the edit proceeds
    expect(r.repair).toBeNull();
    expect(r.reason).toContain("GI_ENFORCE_ABIDE"); // named, loud
  });

  test("e1_a_judge_answering_unknown_rule_ids_is_a_REPORTED_defect_not_a_violation", async () => {
    const inventing: Judge = { evaluate: async () => [{ id: "a_question_nobody_asked", probability: 0.99 }] };
    const r = await runWorkLayer(deps({ judge: inventing }), {
      diff: "x", task: "t", rules: [{ id: "real-rule", instructions: "i", whenTrue: "y", whenFalse: "n" }],
    });
    expect(r.verdict).toBe("NOTICE");        // NOT a REPAIR — nothing real was violated
    expect(r.evidence).toContain("judge_defect=unknown_answer_ids:a_question_nobody_asked");
  });

  test("e1_fail_OPEN_a_JUDGE_THAT_THROWS_skips_named_never_silent", async () => {
    const throwing: Judge = { evaluate: async () => { throw new Error("gateway 503"); } };
    const r = await runWorkLayer(deps({ judge: throwing }), {
      diff: "x", task: "t", rules: [{ id: "r", instructions: "i", whenTrue: "y", whenFalse: "n" }],
    });
    expect(r.verdict).toBe("SKIPPED");
    expect(r.evidence).toContain("gateway 503");
  });

  test("e1_no_rules_and_empty_diff_are_SILENT_not_skipped", async () => {
    expect((await runWorkLayer(deps(), { diff: "x", task: "t", rules: [] })).verdict).toBe("SILENT");
    expect((await runWorkLayer(deps(), { diff: "   ", task: "t", rules: [{ id: "r", instructions: "i", whenTrue: "y", whenFalse: "n" }] })).verdict).toBe("SILENT");
  });

  // ── E2 · CLOSE LAYER — fail-CLOSED ───────────────────────────────────────
  test("e2_zero_spans_is_FABRICATED_by_code_alone_the_model_is_never_called", async () => {
    let called = false;
    const spy: Judge = { evaluate: async () => { called = true; return []; } };
    const r = await runCloseLayer(deps({ judge: spy, loadUnit: loadOf([]) }), { claim: "tests pass", scope: "." });
    expect(r.verdict).toBe("REJECT");
    expect(r.code).toBe("GI_FABRICATED_CLAIM");
    expect(r.spans).toHaveLength(0);
    expect(r.evidence).toContain("spans=0");
    expect(called).toBe(false);          // ← the cheapest gate: no model call
  });

  test("e2_supported_at_or_above_the_act_band_PASSES", async () => {
    const r = await runCloseLayer(deps({ judge: judgeOf(0.8) }), { claim: "tests pass", scope: "." });
    expect(r.verdict).toBe("PASS");
    expect(r.code).toBeNull();
    expect(r.spans).toHaveLength(1);
  });

  test("e2_low_confidence_REJECTS_it_does_not_pass", async () => {
    const r = await runCloseLayer(deps({ judge: judgeOf(0.79) }), { claim: "tests pass", scope: "." });
    expect(r.verdict).toBe("REJECT");
    expect(r.code).toBe("CLAIM_REJECTED");
  });

  test("e2_INCOMPLETE_coverage_FAILS_CLOSED_never_read_as_no_matches", async () => {
    const r = await runCloseLayer(deps({ loadUnit: loadOf([{ quote: "x", source: "l:1" }], "incomplete") }), { claim: "done", scope: "." });
    expect(r.verdict).toBe("FAIL_CLOSED");
    expect(r.code).toBe("TSG_NO_COVERAGE");
    expect(r.evidence).toContain("coverage=incomplete");
  });

  test("e2_fail_CLOSED_when_the_load_unit_is_down", async () => {
    const down = allDown();
    const r = await runCloseLayer(deps({ register: down }), { claim: "done", scope: "." });
    expect(r.verdict).toBe("FAIL_CLOSED");
    expect(r.code).toBe("GI_ENFORCE_TSG");
  });

  test("e2_fail_CLOSED_when_the_load_unit_THROWS", async () => {
    const throwing: LoadUnit = { retrieve: async () => { throw new Error("scan aborted"); } };
    const r = await runCloseLayer(deps({ loadUnit: throwing }), { claim: "done", scope: "." });
    expect(r.verdict).toBe("FAIL_CLOSED");
    expect(r.code).toBe("TSG_TIMEOUT");
    expect(r.evidence).toContain("scan aborted");
  });

  test("e2_fail_CLOSED_when_the_JUDGE_is_down_even_with_spans_bound", async () => {
    const reg = allUp().filter((c) => c.id !== "JEV");   // JEV absent
    const root = tmp();
    reg.push(pathComponent("JEV", "kernel", "the TypeSafe key", "GI_JEV_DOWN", path.join(root, "absent")));
    const r = await runCloseLayer(deps({ register: reg }), { claim: "done", scope: "." });
    expect(r.verdict).toBe("FAIL_CLOSED");
    expect(r.code).toBe("GI_JEV_DOWN");
    expect(r.spans).toHaveLength(1);      // the spans WERE bound; the judge was not available
  });

  test("e2_an_empty_claim_is_PASS_not_a_rejection", async () => {
    const r = await runCloseLayer(deps(), { claim: "   ", scope: "." });
    expect(r.verdict).toBe("PASS");
    expect(r.reason).toContain("no claim");
  });

  test("e2_the_two_polarities_differ_on_the_SAME_outage", async () => {
    const down = allDown();
    const work = await runWorkLayer(deps({ register: down }), {
      diff: "x", task: "t", rules: [{ id: "r", instructions: "i", whenTrue: "y", whenFalse: "n" }],
    });
    const close = await runCloseLayer(deps({ register: down }), { claim: "done", scope: "." });
    expect(work.verdict).toBe("SKIPPED");      // OPEN — the editor keeps working
    expect(close.verdict).toBe("FAIL_CLOSED"); // CLOSED — a false done is the defect
  });
});
