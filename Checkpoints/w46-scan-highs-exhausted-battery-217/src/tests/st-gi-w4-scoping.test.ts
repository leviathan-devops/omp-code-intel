// st-gi-w4-scoping: W4 gi-scoping proof battery (overhaul spec P1.6).
//   T1  the scope filter drops Checkpoints/Ship_Packages/reports/tests rows and
//       keeps src/ rows (THE gate: no Checkpoints path ever reaches the store)
//   T2  edges survive only when BOTH endpoints are scoped (no dangling ghosts)
import { describe, expect, test } from "bun:test";
import * as path from "node:path";

import { scopeBuildToProfile, type GraphNode, type GraphEdge } from "../src/hunter/graph/graphify-adapter.ts";

// Real-directory root: scopeBuildToProfile is fail-CLOSED on unresolvable
// roots (CONTAINMENT_ROOT_UNRESOLVABLE gate) — the fixture root must exist,
// so it anchors at the test's own temp tree.
import * as fs from "node:fs";
import * as os from "node:os";
const FIXROOT = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w4-"));
fs.mkdirSync(path.join(FIXROOT, "src"), { recursive: true });

function node(id: string, file: string): GraphNode {
  return { id: `graphify:${id}`, kind: "function", name: id, file, line: 1, lineage: "CODE_DERIVED", source: `${file}:1`, data: {} } as GraphNode;
}
function edge(s: string, t: string): GraphEdge {
  return { sourceId: `graphify:${s}`, targetId: `graphify:${t}`, kind: "calls", lineage: "CODE_DERIVED", file: "src/a.ts", line: 1 } as GraphEdge;
}

describe("st-gi-w4-scoping: P1.6 store-scope filter", () => {
  test("test_w4_scoped_no_checkpoints_in_store", () => {
    const nodes = [
      node("live", path.join(FIXROOT, "src", "a.ts")),
      node("ckpt", path.join(FIXROOT, "Checkpoints", "wave1", "a.ts")),
      node("ship", path.join(FIXROOT, "Ship_Packages", "v1", "a.ts")),
      node("report", path.join(FIXROOT, "reports", "x.md")),
      node("test", path.join(FIXROOT, "tests", "a.test.ts")),
      node("nested", path.join(FIXROOT, "src", "deep", "b.ts")),
    ];
    const { nodes: kept, dropped } = scopeBuildToProfile(nodes, [], FIXROOT, ["src"]);
    expect(kept.map((n) => n.file).sort()).toEqual([path.join(FIXROOT, "src", "a.ts"), path.join(FIXROOT, "src", "deep", "b.ts")]);
    expect(dropped).toBe(4);
    // THE WAVE GATE, expressed on the filter output (case-insensitive: the
    // legacy "Checkpoints" spelling must not slip through on Linux):
    expect(kept.some((n) => (n.file ?? "").toLowerCase().includes("checkpoints"))).toBe(false);
  });

  test("test_w4_edges_kept_only_when_both_endpoints_scoped", () => {
    const nodes = [node("live", path.join(FIXROOT, "src", "a.ts")), node("ckpt", path.join(FIXROOT, "Checkpoints", "a.ts"))];
    const edges = [edge("live", "live"), edge("live", "ckpt"), edge("ckpt", "live")];
    const { nodes: kept, edges: keptEdges } = scopeBuildToProfile(nodes, edges, FIXROOT, ["src"]);
    expect(kept).toHaveLength(1);
    expect(keptEdges).toHaveLength(1);
    expect(keptEdges[0]!.sourceId).toBe("graphify:live");
    expect(keptEdges[0]!.targetId).toBe("graphify:live");
  });
});
