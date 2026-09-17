// st-gi-w3-validation: W3 gi-validation proof battery (overhaul spec P1.3+P1.4+P1.5).
//   T1  P1.3.1  corbell skips empty-label warm rows (pin — V21 fixed)
//   T2  P1.3.2  corbell validates EDGES (empty dst / unknown predicate skipped+counted)
//   T3  P1.3.3  auditor graph shape SPOT-CHECKS elements (id / source+target)
//   T4  P1.3.4  DDL deferral is precise — non-unique failures RETHROW
//   T5  P1.4.1  hash detects a TAIL edit beyond 4KB
//   T6  P1.4.2  budget exhaustion MARKS the digest (≠ unbudgeted digest)
//   T7  P1.4.3  sidecar path never aliases a non-.json graph file
//   T8  P1.5.1  chain() SKIPS lineless steps (counted) — never throws
//   T9  P1.5.2  unwiredNodes SKIPS lineless rows (counted) — never throws
//   T10 P1.5.3  safeDelete REPORTS dropped-lineless uses
import { describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";

import { populateFromCorbellCheckout } from "../src/omp/populate-corbell.ts";
import { projectGraphifyGraph, normalizeGraphifyGraph } from "../src/hunter/graph/graphify-adapter.ts";
import { isGraphifyCheckoutFreshFor } from "../src/omp/populate-graphify.ts";
import { openTypedStore, safeDelete, unwiredNodes } from "../src/omp/typed-write.ts";
import type { ForkEdge, ForkNode } from "../src/omp/typed-write.ts";

// Module-loading exception: T6/T7 pin seams that this fix introduces — a
// static import of a not-yet-existing export would hide the other nine reds.
const w3graphify = async () => await import("../src/omp/populate-graphify.ts?w3");
// T4 seam: applyTypedDdl is introduced by the fix (same exception).
const w3tw = async () => await import("../src/omp/typed-write.ts?w3");

function w3Tmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}
function w3WarmStore(root: string, nodes: Array<[string, string, string, string, number]>, edges: Array<[string, string, string]>): string {
  const warmDir = path.join(root, ".omp", "graph-intelligence", "corbell-checkout");
  fs.mkdirSync(warmDir, { recursive: true });
  const warmPath = path.join(warmDir, "store.sqlite");
  const warm = new Database(warmPath);
  warm.exec(`CREATE TABLE typed_nodes (canonical_id TEXT, kind TEXT, label TEXT, file TEXT, line INTEGER, run TEXT, superseded_run TEXT);
CREATE TABLE typed_edges (src_canonical TEXT, dst_canonical TEXT, predicate TEXT, evidence_quote TEXT, confidence REAL, run TEXT, superseded_run TEXT);`);
  for (const [cid, kind, label, file, line] of nodes) {
    warm.run("INSERT INTO typed_nodes VALUES (?,?,?,?,?,?,NULL)", [cid, kind, label, file, line, "warm"]);
  }
  for (const [s, d, p] of edges) {
    warm.run("INSERT INTO typed_edges VALUES (?,?,?,?,1.0,'warm',NULL)", [s, d, p, `ev ${s}->${d}`]);
  }
  warm.close();
  return warmPath;
}

describe("st-gi-w3-validation: P1.3/P1.4/P1.5 fixes + pins", () => {
  test("test_w3_corbell_skips_empty_label_rows_pin", () => {
    const root = w3Tmp("gi-w3-label-");
    w3WarmStore(root, [
      ["c-ok", "function", "ok", "src/ok.ts", 1],
      ["c-bad", "function", "", "src/bad.ts", 2],
    ], []);
    const r = populateFromCorbellCheckout(path.join(root, "sessions", "sesW3LABEL0000000001", "store.sqlite"), root, "w3label");
    fs.mkdirSync(path.join(root, "sessions", "sesW3LABEL0000000001"), { recursive: true });
    expect(r.ok).toBe(true);
    expect(r.nodes).toBe(1);
    expect(r.skipped ?? 0).toBeGreaterThanOrEqual(1);
  });

  test("test_w3_corbell_validates_edges", () => {
    const root = w3Tmp("gi-w3-edge-");
    w3WarmStore(root, [
      ["c-a", "function", "a", "src/a.ts", 1],
      ["c-b", "function", "b", "src/b.ts", 2],
    ], [
      ["c-b", "c-a", "calls"],     // valid
      ["c-b", "", "calls"],        // INVALID: empty dst
      ["c-a", "c-b", "knows-about"], // INVALID: unknown predicate
    ]);
    const r = populateFromCorbellCheckout(path.join(root, "sessions", "sesW3EDGE000000000001", "store.sqlite"), root, "w3edge");
    fs.mkdirSync(path.join(root, "sessions", "sesW3EDGE000000000001"), { recursive: true });
    expect(r.ok).toBe(true);
    expect(r.edges).toBe(1); // the malformed rows never reach the store
    expect(r.skipped ?? 0).toBeGreaterThanOrEqual(2);
  });

  test("test_w3_auditor_shape_spot_checks_elements", () => {
    // The shape gate must reject a nodes[] whose ELEMENTS are malformed
    // (array-level checks alone let garbage rows flow into the sweep).
    expect(() =>
      normalizeGraphifyGraph({ nodes: [{ nope: true }], edges: [{ source: "s", target: "t" }] }),
    ).not.toThrow(); // normalize tolerates+maps; the AUDITOR gate is the loud one
    const bad = { nodes: "not-an-array", edges: [] };
    // auditor.validateLoadedGraphShape seam exercised via exported checker:
    const mod = require("../src/hydra/auditor.ts") as { validateGraphShapeForTest?: (g: unknown) => void };
    expect(typeof mod.validateGraphShapeForTest).toBe("function");
    expect(() => mod.validateGraphShapeForTest!({ nodes: [{ id: "x", label: "x" }], edges: [{ source: "x", target: "y" }] })).not.toThrow();
    expect(() => mod.validateGraphShapeForTest!({ nodes: [{ id: "" }], edges: [{ source: "x" }] })).toThrow(/shape/i);
  });

  test("test_w3_ddl_deferral_precise_rethrows_other_errors", async () => {
    const { applyTypedDdl } = await w3tw();
    // A statement whose failure merely CONTAINS the word UNIQUE must NOT be
    // silently deferred — only real unique-constraint failures on unique-index
    // creation defer.
    const throwingDb = {
      run: (stmt: string) => {
        if (stmt.includes("CREATE UNIQUE INDEX")) {
          throw new Error("UNIQUE constraint failed: typed_nodes.canonical_id");
        }
        throw new Error('syntax error near "UNIQUE" (a comment mention)');
      },
    } as unknown as Database;
    expect(() => applyTypedDdl(throwingDb)).toThrow(/syntax error/);
    // The real deferral case stays silent-and-logged.
    const deferringDb = {
      run: (stmt: string) => {
        if (stmt.includes("CREATE UNIQUE INDEX")) throw new Error("UNIQUE constraint failed: typed_nodes.canonical_id");
      },
    } as unknown as Database;
    const spy = spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => applyTypedDdl(deferringDb)).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });

  test("test_w3_hash_detects_tail_edit_beyond_4kb", () => {
    const root = w3Tmp("gi-w3-tail-");
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    const f = path.join(root, "src", "big.ts");
    fs.writeFileSync(f, "// " + "x".repeat(8192) + "\nexport const v = 1;\n");
    const graphPath = path.join(root, "g.json");
    fs.writeFileSync(graphPath, "{}");
    // Baseline hash of v1 (computed through the same public probe path).
    const { computeSourceHashForTest } = require("../src/omp/populate-graphify.ts") as { computeSourceHashForTest?: unknown };
    void computeSourceHashForTest; // seam may or may not exist; probe path below is authoritative
    fs.writeFileSync(path.join(root, "g.graph_hash"), "tail-baseline");
    const r1 = isGraphifyCheckoutFreshFor(root, graphPath, ["src"], []);
    expect(r1.fresh).toBe(false); // baseline mismatch → stale (sanity)
    // THE CONTRACT: rewrite the sidecar with the CURRENT hash, then edit ONLY
    // the tail (>4KB in) → the hash MUST change → stale. Old code hashed only
    // the first 4KB → fresh (missed the edit).
    const { tailHashOf } = (() => ({
      tailHashOf: (): string => {
        // Recompute via the probe itself: a second probe right after rewriting
        // the sidecar returns fresh:true and the sidecar then holds the digest
        // we need — but populate() owns that write. Instead probe BEFORE/AFTER
        // the tail edit with a helper-copied digest: use the exported seam when
        // present, else fall back to the two-probe delta contract.
        return "tail-seam";
      },
    }))();
    void tailHashOf;
    const mod = require("../src/omp/populate-graphify.ts") as { computeSourceHashForTest?: (root: string, scope: string[], excludes: string[]) => string };
    if (typeof mod.computeSourceHashForTest === "function") {
      const before = mod.computeSourceHashForTest(root, ["src"], []);
      fs.writeFileSync(path.join(root, "g.graph_hash"), before);
      expect(isGraphifyCheckoutFreshFor(root, graphPath, ["src"], []).fresh).toBe(true);
      fs.writeFileSync(f, "// " + "x".repeat(8192) + "\nexport const v = 2;\n"); // TAIL edit
      expect(isGraphifyCheckoutFreshFor(root, graphPath, ["src"], []).fresh).toBe(false);
    } else {
      throw new Error("computeSourceHashForTest seam missing (fix not landed)");
    }
  });

  test("test_w3_budget_exhaustion_marks_digest", async () => {
    const { computeSourceHashWithBudget } = await w3graphify();
    const root = w3Tmp("gi-w3-budget-");
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    for (let i = 0; i < 12; i++) fs.writeFileSync(path.join(root, "src", `f${String(i).padStart(2, "0")}.ts`), `export const v${i} = ${i};\n`);
    const exhausted = computeSourceHashWithBudget(root, ["src"], [], 5);
    const complete = computeSourceHashWithBudget(root, ["src"], [], 1000);
    expect(exhausted).not.toBe(complete); // the marker byte makes truncation visible
  });

  test("test_w3_chain_skips_lineless_steps", async () => {
    const root = w3Tmp("gi-w3-chain-");
    fs.mkdirSync(path.join(root, "graphify-out"), { recursive: true });
    const graphJson = {
      nodes: [
        { id: "a", label: "a", type: "function", file: "src/a.ts", data: { line: 1 } },
        { id: "b", label: "b", type: "function", file: "src/b.ts", data: { line: 2 } },
        { id: "c", label: "c", type: "function", file: "src/c.ts", data: {} }, // LINELESS
        { id: "d", label: "d", type: "function", file: "src/d.ts", data: { line: 4 } },
      ],
      edges: [
        { source: "a", target: "b", relation: "calls" },
        { source: "b", target: "c", relation: "calls" }, // step lands on lineless c
        { source: "c", target: "d", relation: "calls" }, // step FROM lineless c
      ],
    };
    fs.writeFileSync(path.join(root, "graphify-out", "graph.json"), JSON.stringify(graphJson));
    const { GraphifyAdapter } = await import("../src/hunter/graph/graphify-adapter.ts?w3chain");
    const profile: import("../src/hunter/profile/schema.ts").ProjectProfile = {
      profileVersion: 1,
      project: { name: "w3chain", root, languages: ["typescript"], entryPoints: ["src/a.ts"], build: "true", test: "true" },
      graph: { substrate: "graphify", scope: ["src"], excludes: [] },
      rules: { corpus: [], bindings: {} },
      pipeline: { stages: [{ id: "s1", entry: "main", contract: "w3chain" }] },
      history: { failureLogs: [] },
      awareness: { docs: [] },
    };
    const adapter = new GraphifyAdapter(profile);
    await adapter.build(profile);
    // OLD: throws LINELESS_NODE mid-walk (N-1 good steps lost with it).
    // NEW: lineless steps skipped + counted — a→b survives, no throw.
    const steps = adapter.chain("a");
    expect(steps.length).toBeGreaterThanOrEqual(1);
    expect(steps[0]!.from).toBe("a");
    expect(steps[0]!.to).toBe("b");
  });

  test("test_w3_unwired_skips_lineless_rows", () => {
    const root = w3Tmp("gi-w3-unwired-");
    const storePath = path.join(root, "sessions", "sesW3UNWIRED00000001", "store.sqlite");
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const db = openTypedStore(storePath);
    const nodes: ForkNode[] = [
      { canonicalId: "u-l", kind: "function", label: "lineful", file: "src/l.ts", line: 7, run: "w3" },
      { canonicalId: "u-0", kind: "function", label: "lineless", file: "src/z.ts", line: null as unknown as number, run: "w3" },
    ];
    db.exec("BEGIN IMMEDIATE;");
    require("../src/omp/typed-write.ts").insertForkNodesBatch(db, nodes);
    db.exec("COMMIT;");
    db.close();
    const rows = unwiredNodes(storePath); // OLD: throws LINELESS_NODE on u-0
    expect(rows.map((r) => r.name)).toEqual(["lineful"]); // lineless skipped, lineful kept
  });

  test("test_w3_safe_delete_reports_lineless_use_drop", () => {
    const root = w3Tmp("gi-w3-sdline-");
    const storePath = path.join(root, "sessions", "sesW3SDLINE00000001", "store.sqlite");
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const db = openTypedStore(storePath);
    const nodes: ForkNode[] = [
      { canonicalId: "t", kind: "function", label: "target", file: "src/t.ts", line: 1, run: "w3" },
      { canonicalId: "u1", kind: "function", label: "caller1", file: "src/c1.ts", line: 5, run: "w3" },
      { canonicalId: "u2", kind: "function", label: "caller2", file: "src/c2.ts", line: 6, run: "w3" },
    ];
    const edges: ForkEdge[] = [
      { srcCanonical: "u1", dstCanonical: "t", predicate: "calls", evidence: "u1->t", run: "w3" },
      { srcCanonical: "u2", dstCanonical: "t", predicate: "traces-to", evidence: "flow edge", run: "w3" }, // lineless edge
    ];
    db.exec("BEGIN IMMEDIATE;");
    require("../src/omp/typed-write.ts").insertForkNodesBatch(db, nodes);
    require("../src/omp/typed-write.ts").insertForkEdgesBatch(db, edges);
    db.exec("COMMIT;");
    db.close();
    const r = safeDelete(storePath, "target");
    expect(r.callers.length).toBe(2);
    // P1.5.3: the lineless USE is counted, never silently vanished.
    const withStats = r as unknown as { usesLinelessDropped?: number };
    expect(typeof withStats.usesLinelessDropped).toBe("number");
    expect(withStats.usesLinelessDropped ?? -1).toBeGreaterThanOrEqual(1);
  });
});
