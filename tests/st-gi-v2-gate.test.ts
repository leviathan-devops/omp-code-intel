// st-gi-v2-gate — WAVE 2 GATE: the STAGE 0..6 skeleton (T-3) and the three
// detectors on ONE interface (T-4); a down layer REFUSES with
// GI_STACK_INCOMPLETE:<layer> (SC-2).
//
// ADVERSARIAL-FIRST (the pin's discipline): the REFUSAL paths run before the
// happy path. A stack that cannot answer must never read as a pass.
import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  DEFAULT_DETECTORS,
  destructiveDetector,
  dumbDetector,
  fileLayer,
  preflight,
  runKernelV2,
  theatricalDetector,
  type Detector,
  type KernelInput,
  type LayerDeclaration,
} from "../src/omp/kernel-v2.ts";

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gi-k2-"));
}
function upLayer(id: LayerDeclaration["id"], dep: string, code: string): LayerDeclaration {
  const f = path.join(tmp(), "present");
  fs.writeFileSync(f, "x");
  return fileLayer(id, dep, code, f);
}
function downLayer(id: LayerDeclaration["id"], dep: string, code: string): LayerDeclaration {
  return fileLayer(id, dep, code, path.join(tmp(), "absent"));
}
const ALL_UP = (): LayerDeclaration[] => [
  upLayer("L1_SEMANTICA", "semantica index", "GI_LAYER_SEMANTICA"),
  upLayer("L2_ARSUMBRIS", "au daemon socket", "GI_LAYER_ARSUMBRIS"),
  upLayer("L3_UA", "ua graph json", "GI_LAYER_UA"),
  upLayer("L4_C2KG", "c2kg lsp index", "GI_LAYER_C2KG"),
  upLayer("L5_CORBELL", "corbell checkout", "GI_LAYER_CORBELL"),
  upLayer("L6_GRAPHIFY", "graphify graph.json", "GI_LAYER_GRAPHIFY"),
];
function input(over: Partial<KernelInput> = {}): KernelInput {
  return {
    toolName: "edit",
    target: "foo",
    queriedBefore: true,
    claims: [],
    certifications: [{ layer: "L5_CORBELL", verdict: "PASS", reason: "in scope" }],
    layers: ALL_UP(),
    ...over,
  };
}

describe("st-gi-v2-gate: W2 — the stage machine + the three detectors", () => {
  // ── ADVERSARIAL FIRST: the refusal paths ─────────────────────────────────
  test("sc2_one_down_layer_refuses_the_whole_stack", () => {
    const layers = ALL_UP();
    layers[3] = downLayer("L4_C2KG", "c2kg lsp index", "GI_LAYER_C2KG");
    const r = runKernelV2(input({ layers }));
    expect(r.verdict).toBe("REFUSE");
    expect(r.code).toBe("GI_STACK_INCOMPLETE:L4_C2KG");      // SC-2's exact token
    expect(r.reason).toContain("GI_LAYER_C2KG");
    expect(r.reason).toContain("c2kg lsp index");            // the dependency is NAMED
    // STAGE 0 must be the refusing stage — it never reached DETECT
    const s0 = r.stages.find((s) => s.stage === 0)!;
    expect(s0.outcome).toBe("REFUSE");
    expect(r.stages.some((s) => s.stage === 3)).toBe(false);
  });

  test("sc2_a_probe_that_THROWS_is_DOWN_never_up", () => {
    const throwing: LayerDeclaration = {
      id: "L1_SEMANTICA", dependency: "semantica index", errorCode: "GI_LAYER_SEMANTICA",
      probe: () => { throw new Error("connection refused"); },
    };
    const pre = preflight([throwing]);
    expect(pre.ok).toBe(false);
    expect(pre.code).toBe("GI_STACK_INCOMPLETE:L1_SEMANTICA");
    expect(pre.offenders[0]!.evidence).toContain("connection refused");
  });

  test("sc2_preflight_names_EVERY_offender_in_one_pass", () => {
    const layers = ALL_UP();
    layers[0] = downLayer("L1_SEMANTICA", "semantica index", "GI_LAYER_SEMANTICA");
    layers[5] = downLayer("L6_GRAPHIFY", "graphify graph.json", "GI_LAYER_GRAPHIFY");
    const pre = preflight(layers);
    expect(pre.offenders.map((o) => o.id)).toEqual(["L1_SEMANTICA", "L6_GRAPHIFY"]);
    expect(pre.up).toHaveLength(4);
  });

  test("t3_uncertifiable_is_NOT_a_pass_it_refuses", () => {
    // destructive with ZERO certifications: nothing to stand on
    const r = runKernelV2(input({ certifications: [] }));
    expect(r.verdict).toBe("REFUSE");       // the T-6 law
    expect(r.reason).toContain("no layer certified");
  });

  test("t4_a_throwing_detector_is_UNCERTIFIABLE_never_a_silent_pass", () => {
    const bomb: Detector = {
      id: "bomb", class: "dumb",
      detect: () => { throw new Error("detector exploded"); },
    };
    const r = runKernelV2(input({ detectors: [bomb] }));
    expect(r.verdict).toBe("REFUSE");
    expect(r.stages.find((s) => s.stage === 4)!.outcome).toBe("UNCERTIFIABLE");
  });

  // ── the three detectors, ONE interface (T-4) ─────────────────────────────
  test("t4_all_three_detectors_share_one_shape", () => {
    for (const d of DEFAULT_DETECTORS) {
      const v = d.detect({ toolName: "edit", target: "x", queriedBefore: true, claims: [], certifications: [{ layer: "L5_CORBELL", verdict: "PASS", reason: "ok" }] });
      expect(typeof d.id).toBe("string");
      expect(typeof d.class).toBe("string");
      expect(["PASS", "VIOLATION", "UNCERTIFIABLE"]).toContain(v.verdict);
      expect(["T0", "T1", "T2", "T3"]).toContain(v.tier);
      expect(typeof v.reason).toBe("string");
      expect(typeof v.evidence).toBe("string");
    }
    expect(DEFAULT_DETECTORS.map((d) => d.class)).toEqual(["dumb", "theatrical", "destructive"]);
  });

  test("dumb_blind_act_steers_the_first_time", () => {
    const r = runKernelV2(input({ queriedBefore: false }));
    expect(r.verdict).toBe("STEER");
    expect(r.class).toBe("dumb");
    expect(r.reason).toContain("blind");
    expect(r.evidence).toContain("queried_before=false");
  });

  test("theatrical_an_unbound_claim_refuses", () => {
    const r = runKernelV2(input({ claims: [{ text: "tests pass", spans: 0 }] }));
    expect(r.verdict).toBe("REFUSE");
    expect(r.class).toBe("theatrical");
    expect(r.code).toBe("GI_FABRICATED_CLAIM");
    expect(r.reason).toContain("ZERO bound evidence spans");
  });

  test("theatrical_a_BOUND_claim_passes_the_cheapest_gate", () => {
    const r = runKernelV2(input({ claims: [{ text: "tests pass", spans: 3 }] }));
    expect(r.verdict).toBe("ALLOW");
    expect(r.code).toBeNull();
  });

  test("destructive_a_layer_violation_refuses_with_the_layer_named", () => {
    const r = runKernelV2(input({
      certifications: [
        { layer: "L5_CORBELL", verdict: "PASS", reason: "in scope" },
        { layer: "L2_ARSUMBRIS", verdict: "VIOLATION", reason: "declared contract broken" },
      ],
    }));
    expect(r.verdict).toBe("REFUSE");
    expect(r.class).toBe("destructive");
    expect(r.reason).toContain("L2_ARSUMBRIS");
    expect(r.reason).toContain("declared contract broken");
  });

  // ── the class is DERIVED, never caller-supplied ──────────────────────────
  test("the_class_comes_from_which_detector_fired", () => {
    // the same call, three different signals → three different classes.
    expect(runKernelV2(input({ queriedBefore: false })).class).toBe("dumb");
    expect(runKernelV2(input({ claims: [{ text: "done", spans: 0 }] })).class).toBe("theatrical");
    expect(runKernelV2(input({ certifications: [{ layer: "L4_C2KG", verdict: "VIOLATION", reason: "edge lost" }] })).class).toBe("destructive");
    expect(runKernelV2(input()).class).toBe("benign"); // all-PASS is benign, NOT the first detector's class
  });

  // ── the stage trace ──────────────────────────────────────────────────────
  test("t3_all_seven_stages_are_recorded_in_order_on_the_happy_path", () => {
    const r = runKernelV2(input());
    expect(r.stages.map((s) => s.stage)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(r.stages.map((s) => s.name)).toEqual(["PREFLIGHT", "CLASSIFY", "BIND+INDEX", "DETECT", "KERNEL", "VERDICT", "RECORD"]);
    expect(r.verdict).toBe("ALLOW");
  });

  test("t3_the_record_stage_writes_and_a_failing_sink_is_REPORTED", () => {
    const written: string[] = [];
    const ok = runKernelV2(input({ record: (run) => written.push(run.verdict) }));
    expect(written).toEqual(["ALLOW"]);
    expect(ok.stages.find((s) => s.stage === 6 && s.outcome === "WRITTEN")).toBeTruthy();
    // a sink that throws must surface, not vanish
    const bad = runKernelV2(input({ record: () => { throw new Error("ledger locked"); } }));
    const failed = bad.stages.filter((s) => s.stage === 6 && s.outcome === "FAILED");
    expect(failed).toHaveLength(1);
    expect(failed[0]!.detail).toContain("ledger locked");
  });

  test("t3_the_worst_verdict_wins_a_safety_tie_never_lightens", () => {
    // dumb STEER + theatrical REFUSE in one act → the refuse wins
    const r = runKernelV2(input({ queriedBefore: false, claims: [{ text: "done", spans: 0 }] }));
    expect(r.verdict).toBe("REFUSE");
    expect(r.class).toBe("theatrical");   // destructive > theatrical > dumb on a tie
  });
});
