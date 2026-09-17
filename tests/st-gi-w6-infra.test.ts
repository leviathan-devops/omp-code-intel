// st-gi-w6-infra: W6 gi-infra-pre proof battery (overhaul spec P2.3+P2.4).
//   T1  preFlight returns the full risk package on a real store
//   T2  preFlight commitStrategy scales with blast radius
//   T3  getTestTargets ranks depth-1 callers by inbound degree
//   T4  getTestTargets caps at maxTargets
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { openTypedStore, insertForkNodesBatch, insertForkEdgesBatch, type ForkNode, type ForkEdge } from "../src/omp/typed-write.ts";
import { preFlight } from "../src/kernel/graph-pre-flight.ts";
import { getTestTargets } from "../src/kernel/graph-test-target.ts";

function w6Store(nodes: ForkNode[], edges: ForkEdge[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w6-"));
  const storePath = path.join(root, "sessions", "sesW6INFRA00001", "store.sqlite");
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const db = openTypedStore(storePath);
  db.exec("BEGIN IMMEDIATE;");
  insertForkNodesBatch(db, nodes);
  insertForkEdgesBatch(db, edges);
  db.exec("COMMIT;");
  db.close();
  return storePath;
}
const N = (id: string, label: string): ForkNode => ({ canonicalId: id, kind: "function", label, file: `src/${label}.ts`, line: 1, run: "w6" });
const E = (s: string, d: string, p = "calls"): ForkEdge => ({ srcCanonical: s, dstCanonical: d, predicate: p, evidence: `${s}->${d}`, run: "w6" });

// Topology: u1..u3 call target; u4 traces-to it; target calls helper (lineless target class covered by tn elsewhere).
// u1 is the HIGHEST-connected caller (u1 also calls w1, w2 which call back into u1 → inbound(u1)=3).
const NODES: ForkNode[] = [
  N("c-target", "target"), N("c-u1", "u1"), N("c-u2", "u2"), N("c-u3", "u3"),
  N("c-u4", "u4"), N("c-w1", "w1"), N("c-w2", "w2"), N("c-x", "x"), N("c-y", "y"),
];
const EDGES: ForkEdge[] = [
  E("c-x", "c-y"), // isolated pair — reach(x) = 1 → single-commit strategy
  E("c-u1", "c-target"), E("c-u2", "c-target"), E("c-u3", "c-target"), E("c-u4", "c-target", "traces-to"),
  E("c-target", "c-u1", "imports"),
  E("c-u1", "c-w1"), E("c-u1", "c-w2"), E("c-w1", "c-u1"), E("c-w2", "c-u1"),
];

describe("st-gi-w6-infra: pre-flight + test targeting", () => {
  test("test_w6_preflight_full_risk_package", () => {
    const store = w6Store(NODES, EDGES);
    const pf = preFlight(store, "target");
    expect(pf.target).toBe("target");
    expect(pf.directCallers.length).toBeGreaterThanOrEqual(3);
    expect(pf.directCallers.some((c) => c.caller === "u1")).toBe(true);
    expect(pf.blastRadius.reaches).toBeGreaterThanOrEqual(6); // the whole graph is upstream-connected
    expect(pf.riskProfile.callers).toBeGreaterThanOrEqual(4);
    expect(["single", "split", "domain-level"]).toContain(pf.commitStrategy);
    expect(pf.testTargets.length).toBeGreaterThan(0);
  });

  test("test_w6_preflight_commit_strategy_scales", () => {
    const store = w6Store(NODES, EDGES);
    const small = preFlight(store, "x"); // isolated pair: reach(x)=1
    expect(small.commitStrategy).toBe("single");
    const big = preFlight(store, "target");
    expect(big.commitStrategy === "split" || big.commitStrategy === "domain-level").toBe(true);
  });

  test("test_w6_test_targets_rank_by_inbound_degree", () => {
    const store = w6Store(NODES, EDGES);
    const targets = getTestTargets(store, "target", 3);
    expect(targets.length).toBeLessThanOrEqual(3);
    expect(targets[0]!.label).toBe("u1"); // highest-connected depth-1 caller
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i - 1]!.inboundDegree).toBeGreaterThanOrEqual(targets[i]!.inboundDegree);
    }
    expect(targets.every((t) => t.priority >= 1)).toBe(true);
  });

  test("test_w6_test_targets_respect_max", () => {
    const store = w6Store(NODES, EDGES);
    expect(getTestTargets(store, "target", 2)).toHaveLength(2);
    expect(getTestTargets(store, "target", 1)).toHaveLength(1);
  });
});
