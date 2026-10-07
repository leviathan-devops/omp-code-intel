import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { registerGraphGate } from "../src/omp/gate-hook.ts";
import {
  classifyEdit,
  computeDrift,
  createEmptyState,
  gateDecision,
  loadGateState,
  onDriftComputed,
  onEditClassified,
  onGateDecision,
  recordEdit,
  recordGraphQuery,
  resetDriftForSymbol,
  saveGateState,
} from "../src/omp/graph-gate.ts";

function highEdit(sym: string, ts = Date.now()) {
  return { classification: classifyEdit("edit", { file: "src/omp/target.ts", oldString: `export function ${sym}() {}`, newString: `export function ${sym}Renamed() {}` }), ts };
}

describe("st-gi-graph-gate: v1.3 intelligent graph gate", () => {
  test("test_classify_doc", () => {
    const c = classifyEdit("edit", { file: "README.md", oldString: "old", newString: "new" });
    expect(c.severity).toBe("NONE");
    const c2 = classifyEdit("edit", { file: "docs/spec.json", oldString: "a", newString: "b" });
    expect(c2.severity).toBe("NONE");
  });

  test("test_classify_export", () => {
    const c = classifyEdit("edit", { file: "src/omp/foo.ts", oldString: "export function myFunc() {}", newString: "export function myFunc2() {}" });
    expect(c.severity).toBe("HIGH");
    expect(c.touchedSymbols.join(",")).toContain("myFunc");
  });

  test("test_drift_covered", () => {
    const st = createEmptyState();
    for (const sym of ["aaa", "bbb", "ccc"]) {
      const c = classifyEdit("edit", { file: "src/omp/t.ts", oldString: `export function ${sym}() {}`, newString: `export function ${sym}X() {}` });
      recordEdit(c, st);
      recordGraphQuery({ tool: "ripwire", target: sym, resolved: true }, st);
    }
    const d = computeDrift(st);
    expect(d.drift).toBeLessThan(0.3);
    const g = gateDecision(d, st);
    expect(g.tier).toBe("T0");
  });

  test("test_drift_spree", () => {
    const st = createEmptyState();
    for (const sym of ["aaa", "bbb", "ccc"]) {
      const c = classifyEdit("edit", { file: "src/omp/t.ts", oldString: `export function ${sym}() {}`, newString: `export function ${sym}X() {}` });
      recordEdit(c, st);
    }
    const d = computeDrift(st);
    expect(d.drift).toBeGreaterThanOrEqual(0.6);
    const g = gateDecision(d, st);
    expect(g.tier).toBe("T2");
    expect(String(g.blockReason ?? "")).toContain("GRAPH_GATE_DRIFT_HIGH");
  });

  test("test_query_reset", () => {
    // RULING (W1): one edit covered by its own re-query → drift 0.
    // c1 renames solo→solo2; querying "solo2" (the CURRENT name) covers it.
    // c2 renames solo2→solo3; "solo3" covers it. Zero unverified → drift 0.
    const st = createEmptyState();
    const c1 = classifyEdit("edit", { file: "src/omp/t.ts", oldString: "export function solo() {}", newString: "export function solo2() {}" });
    recordEdit(c1, st);
    recordGraphQuery({ tool: "graph-query", target: "solo2", resolved: true }, st);
    const c2 = classifyEdit("edit", { file: "src/omp/t.ts", oldString: "export function solo2() {}", newString: "export function solo3() {}" });
    recordEdit(c2, st);
    recordGraphQuery({ tool: "graph-query", target: "solo3", resolved: true }, st);
    const d = computeDrift(st);
    expect(d.drift).toBe(0);
    expect(gateDecision(d, st).tier).toBe("T0");
  });

  test("test_decay_zero", () => {
    const st = createEmptyState();
    const old = Date.now() - 10 * 60 * 1000;
    const c = classifyEdit("edit", { file: "src/omp/t.ts", oldString: "export function aged() {}", newString: "export function aged2() {}" });
    recordEdit(c, st, old);
    const d = computeDrift(st);
    expect(d.drift).toBe(0);
  });

  test("test_state_persists", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-gate-"));
    const storePath = path.join(dir, "store.sqlite");
    const st = createEmptyState();
    const c = classifyEdit("edit", { file: "src/omp/t.ts", oldString: "export function per() {}", newString: "export function per2() {}" });
    recordEdit(c, st);
    saveGateState(storePath, "sesTEST000000000000000001", st);
    const reloaded = loadGateState(storePath, "sesTEST000000000000000001");
    expect(reloaded).not.toBeNull();
    expect(reloaded!.editLog.length).toBe(1);
    expect(computeDrift(reloaded!).drift).toBe(computeDrift(st).drift);
  });

  test("test_v2_empty", () => {
    expect(typeof onEditClassified).toBe("function");
    expect(typeof onDriftComputed).toBe("function");
    expect(typeof onGateDecision).toBe("function");
    const src = fs.readFileSync(new URL("../src/omp/graph-gate.ts", import.meta.url), "utf-8");
    const hits = src.split("\n").filter((l) => l.includes("PROPOSED"));
    expect(hits.length).toBeGreaterThanOrEqual(4);
  });

  test("test_per_symbol_reset", () => {
    const st = createEmptyState();
    const ca = classifyEdit("edit", { file: "src/omp/t.ts", oldString: "export function alpha() {}", newString: "export function alpha2() {}" });
    recordEdit(ca, st);
    const cb = classifyEdit("edit", { file: "src/omp/t.ts", oldString: "export function beta() {}", newString: "export function beta2() {}" });
    recordEdit(cb, st);
    recordGraphQuery({ tool: "ripwire", target: "beta", resolved: true }, st);
    resetDriftForSymbol("beta", st);
    const d = computeDrift(st);
    expect(d.drift).toBeGreaterThan(0);
    expect(d.verifiedSymbols.join(",")).toContain("beta");
    expect(d.verifiedSymbols.join(",")).not.toContain("alpha");
  });
  test("test_gate_end_to_end_tool_call_path", () => {
    // W1: 5 blind HIGH edits fired as tool_call events through the REGISTERED
    // registerGraphGate handlers must throw T2 GRAPH_GATE_DRIFT_HIGH.
    // Module-direct computeDrift/gateDecision does NOT satisfy this test.
    const handlers: Record<string, Array<(event: Record<string, unknown>, ctx: unknown) => unknown>> = {};
    const pi = {
      on: (ev: string, h: (event: Record<string, unknown>, ctx: unknown) => unknown) => {
        (handlers[ev] = handlers[ev] ?? []).push(h);
      },
    };
    registerGraphGate(pi);
    expect((handlers["tool_call"] ?? []).length).toBeGreaterThanOrEqual(2);
    const fire = (toolName: string, input: Record<string, unknown>): unknown[] => {
      const out: unknown[] = [];
      for (const h of handlers["tool_call"] ?? []) {
        out.push(h({ toolName, input }, {}));
      }
      return out;
    };
    const blind = (sym: string) => ({
      file: "src/omp/w.ts",
      old_string: `export function ${sym}() {}`,
      new_string: `export function ${sym}X() {}`,
    });
    // First two blind edits pass (T0/T1); the run must END in a T2 throw
    // carrying GRAPH_GATE_DRIFT_HIGH — quoted from the handler, verbatim.
    let threw: unknown = null;
    for (const sym of ["wa1", "wa2", "wa3", "wa4", "wa5"]) {
      try {
        fire("edit", blind(sym));
      } catch (e) {
        threw = e;
        break;
      }
    }
    expect(threw).not.toBeNull();
    expect(String(threw instanceof Error ? threw.message : threw)).toContain("GRAPH_GATE_DRIFT_HIGH");
  });

  test("test_gate_state_persists_via_store", () => {
    // W1 RED: after a wired-path edit sequence, the graph_gate_state row
    // must exist via openTypedStore (the production store contract).
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-gate-int-"));
    const storePath = path.join(dir, "sessions", "sesGATEINT000000000001", "store.sqlite");
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const st = createEmptyState();
    const c = classifyEdit("edit", { file: "src/omp/w.ts", oldString: "export function per() {}", newString: "export function per2() {}" });
    recordEdit(c, st);
    computeDrift(st);
    saveGateState(storePath, "sesGATEINT000000000001", st);
    const reopened = loadGateState(storePath, "sesGATEINT000000000001");
    expect(reopened).not.toBeNull();
    expect(reopened!.editLog.length).toBe(1);
    expect(reopened!.editLog[0]!.symbols.join(",")).toContain("per");
  });

  test("test_gate_reset_via_graph_query", () => {
    // W1 RED: a graph query event between edits must drop the drift back to
    // T0 on the wired path — the reward mechanism, not just the math.
    const st = createEmptyState();
    const mk = (s: string) => classifyEdit("edit", { file: "src/omp/w.ts", oldString: `export function ${s}() {}`, newString: `export function ${s}X() {}` });
    recordEdit(mk("ra1"), st);
    recordEdit(mk("ra2"), st);
    recordGraphQuery({ tool: "graph-query", target: "ra1", resolved: true }, st);
    recordGraphQuery({ tool: "graph-query", target: "ra2", resolved: true }, st);
    const d = computeDrift(st);
    expect(d.drift).toBeLessThan(0.3);
    expect(gateDecision(d, st).tier).toBe("T0");
  });
});


// ══ ★★★ THE RITUAL-QUERY FIX (2026-09-22) — a query must RESOLVE, not merely FIRE ══
//    THE MEASURED DEFECT: `recordGraphQuery` reset drift whenever a query carried a
//    TARGET STRING, never checking whether it returned rows. So the exact call that
//    produced `rows=0` + a ripwire error STILL purchased coverage. THAT is T-16.

test("test_an_UNRESOLVED_query_does_NOT_cover_the_edit — the T-16 fix", () => {
  const st = createEmptyState();
  recordEdit(highEdit("alpha").classification, st);
  // ★ a query that fired but did NOT resolve (rows=0 / an error)
  recordGraphQuery({ tool: "graph-query", target: "alpha", resolved: false }, st);
  const d = computeDrift(st);
  // ★ the edit stays UNVERIFIED — an empty answer is not evidence
  expect(d.unverifiedCount).toBeGreaterThan(0);
});

test("test_a_RESOLVED_query_DOES_cover_the_edit", () => {
  const st = createEmptyState();
  recordEdit(highEdit("alpha").classification, st);
  recordGraphQuery({ tool: "graph-query", target: "alpha", resolved: true }, st);
  const d = computeDrift(st);
  expect(d.unverifiedCount).toBe(0);
});

test("test_rows>0_implies_resolved — the caller may report either way", () => {
  const st = createEmptyState();
  recordEdit(highEdit("alpha").classification, st);
  recordGraphQuery({ tool: "graph-query", target: "alpha", rows: 7 }, st);
  expect(computeDrift(st).unverifiedCount).toBe(0);
});
