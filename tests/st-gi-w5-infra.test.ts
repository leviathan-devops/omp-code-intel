// st-gi-w5-infra: W5 gi-infra-diff proof battery (overhaul spec P2.1+P2.2).
//   T1  captureSnapshot reads real counts from a typed store
//   T2  diffGraphs PASSes on a clean evolution
//   T3  diffGraphs FAILs on edge loss (broken dependency)
//   T4  diffGraphs WARNs on unwired growth (dead code introduced)
//   T5  diffGraphs FAILs on a new cycle
//   T6  gateCheck PASS at micro level / FAIL on criteria breach
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { openTypedStore, insertForkNodesBatch, insertForkEdgesBatch, type ForkNode, type ForkEdge } from "../src/omp/typed-write.ts";
import { captureSnapshot, diffGraphs, type GraphSnapshot } from "../src/kernel/graph-diff.ts";
import { gateCheck, GATE_LEVELS } from "../src/kernel/graph-gate.ts";

function w5Store(run: string, nodes: ForkNode[], edges: ForkEdge[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w5-"));
  const storePath = path.join(root, "sessions", `sesW5${run}00000000000001`.slice(0, 24).padEnd(24, "0"), "store.sqlite");
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const db = openTypedStore(storePath);
  db.exec("BEGIN IMMEDIATE;");
  insertForkNodesBatch(db, nodes);
  insertForkEdgesBatch(db, edges);
  db.exec("COMMIT;");
  db.close();
  return storePath;
}
const N = (id: string, label: string, file: string): ForkNode => ({ canonicalId: id, kind: "function", label, file, line: 1, run: "w5" });
const E = (s: string, d: string): ForkEdge => ({ srcCanonical: s, dstCanonical: d, predicate: "calls", evidence: `${s}->${d}`, run: "w5" });

describe("st-gi-w5-infra: graph-diff + graph-gate", () => {
  test("test_w5_snapshot_reads_real_counts", () => {
    const store = w5Store("A", [N("c-a", "a", "src/a.ts"), N("c-b", "b", "src/b.ts")], [E("c-b", "c-a")]);
    const s = captureSnapshot(store);
    expect(s.nodes).toBe(2);
    expect(s.edges).toBe(1);
    expect(s.unwiredCount).toBe(1); // a has no inbound calls
    expect(s.topDegree[0]?.label).toBe("a");
  });

  test("test_w5_diff_pass_on_clean_evolution", () => {
    const before: GraphSnapshot = { nodes: 2, edges: 1, nodeKinds: { function: 2 }, edgePredicates: { calls: 1 }, unwiredCount: 1, topDegree: [{ label: "a", inbound: 1 }], cycleCount: 0 };
    const after: GraphSnapshot = { nodes: 3, edges: 2, nodeKinds: { function: 3 }, edgePredicates: { calls: 2 }, unwiredCount: 1, topDegree: [{ label: "a", inbound: 2 }], cycleCount: 0 };
    const d = diffGraphs(before, after);
    expect(d.verdict).toBe("PASS");
    expect(d.edgesDelta).toBe(1);
    expect(d.newCycles).toBe(0);
  });

  test("test_w5_diff_fails_on_edge_loss", () => {
    const before: GraphSnapshot = { nodes: 2, edges: 1, nodeKinds: {}, edgePredicates: { calls: 1 }, unwiredCount: 1, topDegree: [], cycleCount: 0 };
    const after: GraphSnapshot = { nodes: 2, edges: 0, nodeKinds: {}, edgePredicates: {}, unwiredCount: 2, topDegree: [], cycleCount: 0 };
    const d = diffGraphs(before, after);
    expect(d.verdict).toBe("FAIL");
    expect(d.edgesDelta).toBe(-1);
    expect(d.details.join("\n")).toMatch(/edge/i);
  });

  test("test_w5_diff_warns_on_unwired_growth", () => {
    const before: GraphSnapshot = { nodes: 2, edges: 1, nodeKinds: {}, edgePredicates: { calls: 1 }, unwiredCount: 1, topDegree: [], cycleCount: 0 };
    const after: GraphSnapshot = { nodes: 3, edges: 1, nodeKinds: {}, edgePredicates: { calls: 1 }, unwiredCount: 2, topDegree: [], cycleCount: 0 };
    const d = diffGraphs(before, after);
    expect(d.verdict).toBe("WARN");
    expect(d.unwiredDelta).toBe(1);
  });

  test("test_w5_diff_fails_on_new_cycle", () => {
    const before: GraphSnapshot = { nodes: 2, edges: 1, nodeKinds: {}, edgePredicates: { calls: 1 }, unwiredCount: 1, topDegree: [], cycleCount: 0 };
    const after: GraphSnapshot = { nodes: 2, edges: 2, nodeKinds: {}, edgePredicates: { calls: 2 }, unwiredCount: 0, topDegree: [], cycleCount: 1 };
    const d = diffGraphs(before, after);
    expect(d.verdict).toBe("FAIL");
    expect(d.newCycles).toBe(1);
  });

  test("test_w5_gate_pass_and_breach", () => {
    const clean: GraphSnapshot = { nodes: 3, edges: 2, nodeKinds: {}, edgePredicates: { calls: 2 }, unwiredCount: 1, topDegree: [{ label: "a", inbound: 2 }], cycleCount: 0 };
    const dirty: GraphSnapshot = { nodes: 3, edges: 1, nodeKinds: {}, edgePredicates: { calls: 1 }, unwiredCount: 3, topDegree: [{ label: "a", inbound: 0 }], cycleCount: 2 };
    const d = diffGraphs(clean, dirty);
    const g = gateCheck(d, { maxBlastRadius: 10, maxNewUnwired: 0, maxNewCycles: 0, maxEdgesLost: 0 });
    expect(g.verdict).toBe("FAIL");
    expect(g.failures.length).toBe(2); // edges lost + new cycles (unwired is a warning)
    expect(g.warnings.length).toBeGreaterThanOrEqual(1); // unwired growth
    // Clean diff at the same thresholds: PASS.
    const ok = gateCheck(diffGraphs(clean, { ...clean, nodes: 4, edges: 3 }), { maxBlastRadius: 10, maxNewUnwired: 0, maxNewCycles: 0, maxEdgesLost: 0 });
    expect(ok.verdict).toBe("PASS");
    // WARN-vs-FAIL precedence: unwired breach with loose edges budget → WARN.
    const w = gateCheck(diffGraphs(clean, { ...clean, unwiredCount: 2 }), { maxBlastRadius: 10, maxNewUnwired: 0, maxNewCycles: 0, maxEdgesLost: 0 });
    expect(w.verdict).toBe("WARN");
  });

  // ---- Spec W5 gate battery (4 named gate cases; T6 above is case 1) ----
  test("test_w5_gate_budgets_scale_by_level", () => {
    // 12 edges lost: FAIL at micro/category budgets (0), PASS at domain (20).
    const clean: GraphSnapshot = { nodes: 8, edges: 20, nodeKinds: {}, edgePredicates: { calls: 20 }, unwiredCount: 0, topDegree: [], cycleCount: 0 };
    const shrunk: GraphSnapshot = { nodes: 8, edges: 8, nodeKinds: {}, edgePredicates: { calls: 8 }, unwiredCount: 0, topDegree: [], cycleCount: 0 };
    const d = diffGraphs(clean, shrunk);
    expect(gateCheck(d, GATE_LEVELS.micro).verdict).toBe("FAIL");
    expect(gateCheck(d, GATE_LEVELS.category).verdict).toBe("FAIL");
    const domain = gateCheck(d, { ...GATE_LEVELS.domain, maxEdgesLost: 20 });
    expect(domain.verdict).toBe("PASS");
  });

  test("test_w5_gate_warn_path_has_empty_failures", () => {
    // Unwired-only growth: WARN, failures EMPTY, warning names the class —
    // dead code warns but never hard-stops the gate.
    const clean: GraphSnapshot = { nodes: 2, edges: 1, nodeKinds: {}, edgePredicates: { calls: 1 }, unwiredCount: 1, topDegree: [], cycleCount: 0 };
    const dirty: GraphSnapshot = { nodes: 4, edges: 1, nodeKinds: {}, edgePredicates: { calls: 1 }, unwiredCount: 3, topDegree: [], cycleCount: 0 };
    const g = gateCheck(diffGraphs(clean, dirty), GATE_LEVELS.micro);
    expect(g.verdict).toBe("WARN");
    expect(g.failures).toEqual([]);
    expect(g.warnings.length).toBeGreaterThanOrEqual(1);
    expect(g.warnings[0]).toMatch(/unwired/i);
  });

  test("test_w5_gate_failure_messages_name_the_breach", () => {
    // Edge loss AND new cycle together: both named, budgets echoed —
    // the contract that a FAIL is actionable without reading the diff.
    const clean: GraphSnapshot = { nodes: 3, edges: 2, nodeKinds: {}, edgePredicates: { calls: 2 }, unwiredCount: 1, topDegree: [], cycleCount: 0 };
    const dirty: GraphSnapshot = { nodes: 3, edges: 0, nodeKinds: {}, edgePredicates: {}, unwiredCount: 3, topDegree: [], cycleCount: 2 };
    const g = gateCheck(diffGraphs(clean, dirty), GATE_LEVELS.micro);
    expect(g.verdict).toBe("FAIL");
    const joined = g.failures.join("\n");
    expect(joined).toMatch(/edges lost/);
    expect(joined).toMatch(/new cycles/);
    expect(joined).toMatch(/budget/);
  });

  test("test_w5_gate_store_backed_pipeline", () => {
    // Store→snapshot→diff→gate pipeline over REAL stores (not hand-built
    // snapshots): a clean evolution PASSes the category gate end to end.
    const before = w5Store("G1", [N("c-a", "a", "src/a.ts"), N("c-b", "b", "src/b.ts")], [E("c-b", "c-a")]);
    const after = w5Store("G2", [N("c-a", "a", "src/a.ts"), N("c-b", "b", "src/b.ts"), N("c-c", "c", "src/c.ts")], [E("c-b", "c-a"), E("c-c", "c-a")]);
    const d = diffGraphs(captureSnapshot(before), captureSnapshot(after));
    expect(d.verdict).not.toBe("FAIL");
    const g = gateCheck(d, GATE_LEVELS.category);
    // The contract: a clean evolution has NO hard-stop breach (failures empty);
    // inbound growth on an existing node legitimately warns.
    expect(g.verdict).not.toBe("FAIL");
    expect(g.failures).toEqual([]);
  });
});
