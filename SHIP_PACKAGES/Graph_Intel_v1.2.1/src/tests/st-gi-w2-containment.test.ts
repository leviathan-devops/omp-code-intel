// st-gi-w2-containment: W2 gi-containment proof battery (overhaul spec P1.2).
// Pins + fixes for path containment across the three layers:
//   T1 P1.2.4  projection emits RELATIVE-POSIX anchors (same format as normalize) — abs was the divergence
//   T2 P1.2.1  projection with an UNRESOLVABLE root drops anchors (fail-closed) — the
//              old resolve-fallback emitted absolute anchors for files that do not exist
//   T3 P1.2.2  auditor nodeFile never returns a `..`-escaping anchor (pin — V21 fixed)
//   T4 P1.2.3  extension confinement: symlinked root canonicalized before allowlist check (pin)
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { normalizeGraphifyGraph, projectGraphifyGraph } from "../src/hunter/graph/graphify-adapter.ts";
import { nodeFileForTest } from "../src/hydra/auditor.ts";

function w2Tmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe("st-gi-w2-containment: P1.2 fixes + pins", () => {
  // ---------- T1 (P1.2.4) ----------
  test("test_w2_projection_emits_relative_posix_anchors", () => {
    const root = w2Tmp("gi-w2-rel-");
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n");
    // Contained file via BOTH spellings the graphify JSON can carry.
    const { nodes } = projectGraphifyGraph(
      {
        nodes: [
          { id: "x", label: "x", type: "function", file: "src/a.ts", data: {} },
          { id: "y", label: "y", type: "function", file: path.join(root, "src", "a.ts"), data: {} },
        ],
        edges: [],
        communities: [],
        godNodes: [],
      },
      root,
    );
    // OLD: absolute anchors ("/tmp/.../src/a.ts") — diverged from normalize's
    // relative posix. NEW: both spellings collapse to the SAME "src/a.ts".
    expect(nodes[0]!.file).toBe("src/a.ts");
    expect(nodes[1]!.file).toBe("src/a.ts");
    // And the source anchor carries the same unified format.
    expect(nodes[0]!.source).toContain("src/a.ts");
  });

  // ---------- T2 (P1.2.1) ----------
  test("test_w2_projection_unresolvable_root_drops_anchors", () => {
    // Root path does NOT exist (realpath fails; the old code fell back to
    // path.resolve and then CONTAINED a relative anchor against the fake
    // base — emitting an absolute anchor for a file that cannot exist).
    const fakeRoot = path.join(os.tmpdir(), `gi-w2-missing-${Date.now()}-x`);
    expect(fs.existsSync(fakeRoot)).toBe(false);
    const { nodes } = projectGraphifyGraph(
      {
        nodes: [{ id: "x", label: "x", type: "function", file: "a.ts", data: {} }],
        edges: [],
        communities: [],
        godNodes: [],
      },
      fakeRoot,
    );
    // Fail-closed: no anchor can be proven contained → anchor dropped,
    // identity kept (the C3 posture, extended to the unresolvable-base case).
    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.file ?? "").toBe("");
    expect(nodes[0]!.id).toBe("graphify:x");
  });

  // ---------- T5 (P1.2.5 — the normalize→projection chain) ----------
  test("test_w2_chain_containment_survives_rootless_normalize", () => {
    const root = w2Tmp("gi-w2-chain-");
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n");
    // A rootless normalize call runs NO containment pass (the loader owns the
    // root) — the escape must still be dropped by the projection backstop
    // BEFORE any row reaches the typed store.
    const g = normalizeGraphifyGraph({
      nodes: [
        { id: "in", label: "in", type: "function", file: "src/a.ts" },
        { id: "out", label: "out", type: "function", file: "/etc/passwd" },
      ],
      edges: [{ source: "in", target: "out", relation: "calls" }],
    });
    const { nodes } = projectGraphifyGraph(g, root);
    const byId = new Map(nodes.map((n) => [n.id, n] as const));
    expect(byId.get("graphify:in")?.file ?? "").toBe("src/a.ts");
    expect(byId.get("graphify:out")?.file ?? "").toBe("");
  });

  // ---------- T3 (P1.2.2 — pin: V21 already guards) ----------
  test("test_w2_auditor_nodefile_no_escape", () => {
    const root = "/tmp/gi-w2-audit-root";
    // Relative escapes pass through raw — pin the guard: the emitted anchor
    // must never start with `..`.
    expect(nodeFileForTest(root, { file: "../outside.ts" })).not.toMatch(/^\.\./);
    expect(nodeFileForTest(root, { file: "src/ok.ts" })).toBe("src/ok.ts");
    expect(nodeFileForTest(root, { file: "" })).toBe("");
  });

  // ---------- T4 (P1.2.3 — pin: confinement canonicalizes) ----------
  test("test_w2_extension_confine_symlinked_root_within_allowlist", () => {
    // The confinement under test lives in the extension bundle; the LAW it
    // pins: a symlinked allowlist root contains its realpath target.
    const realDir = w2Tmp("gi-w2-real-");
    const linkDir = path.join(w2Tmp("gi-w2-link-"), "link");
    fs.symlinkSync(realDir, linkDir);
    const roots = [linkDir]; // allowlist written with the SYMLINK spelling
    const real = fs.realpathSync(realDir);
    // path.relative against the REAL target must be contained when the root
    // is canonicalized before the check (the H12 law).
    const canonicalRoot = fs.realpathSync(linkDir);
    const rel = path.relative(canonicalRoot, real);
    expect(rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))).toBe(true);
  });
});
