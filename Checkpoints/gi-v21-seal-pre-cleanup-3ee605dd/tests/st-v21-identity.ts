// V21 W1 — identity model: traversal must key on canonical_id, never on label.
// Deterministic conflation fixture:
//   A "run"@a.ts   B "run"@b.ts          (TWO distinct identities, same label)
//   CA "ca"@ca.ts  calls A               (A's only caller)
//   D  "ca"@d.ts   (different fn, same label "ca" as CA; nobody calls D in truth)
//   TOP "top"@t.ts calls D               (D's caller — UNRELATED to run's impact)
// True impact("run") = { ca@depth1 } — nothing at depth 2.
// Label-keyed BFS expands frontier label "ca" → pulls D's caller TOP in as a PHANTOM depth-2.
import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { insertForkNode, insertForkEdge, openTypedStore, impact, whoCalls, countTypedNodes } from "../src/omp/typed-write.ts";
import { Database } from "bun:sqlite";

function freshStore(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "v21-ident-"));
  // Session-scoped store path (the scoping law: /sessions/{sid24}/store.sqlite).
  return path.join(dir, "sessions", "v21identitytest0000001", "store.sqlite");
}

function buildConflationStore(storePath: string): void {
  insertForkNode(storePath, { canonicalId: "a.ts:1:run", kind: "Function", label: "run", file: "a.ts", line: 1, run: "r1" });
  insertForkNode(storePath, { canonicalId: "b.ts:1:run", kind: "Function", label: "run", file: "b.ts", line: 1, run: "r1" });
  insertForkNode(storePath, { canonicalId: "ca.ts:1:ca", kind: "Function", label: "ca", file: "ca.ts", line: 1, run: "r1" });
  insertForkNode(storePath, { canonicalId: "d.ts:9:ca", kind: "Function", label: "ca", file: "d.ts", line: 9, run: "r1" });
  insertForkNode(storePath, { canonicalId: "t.ts:1:top", kind: "Function", label: "top", file: "t.ts", line: 1, run: "r1" });
  insertForkEdge(storePath, { srcCanonical: "ca.ts:1:ca", dstCanonical: "a.ts:1:run", predicate: "calls", evidence: "ca(a)", run: "r1" });
  // D is NOT called by anyone in truth; D does NOT call run. TOP calls D.
  insertForkEdge(storePath, { srcCanonical: "t.ts:1:top", dstCanonical: "d.ts:9:ca", predicate: "calls", evidence: "top(d)", run: "r1" });
}

describe("V21 W1 identity model", () => {
  test("impact traversal never crosses same-label identities (no phantom depth-2)", () => {
    const storePath = freshStore();
    try {
      buildConflationStore(storePath);
      expect(countTypedNodes(storePath)).toBe(5);
      const im = impact(storePath, "run", 4);
      const symbols = im.ledger.map((r) => r.symbol);
      expect(im.reaches).toBe(1);
      expect(symbols).toContain("ca");
      expect(symbols).not.toContain("top");
    } finally {
      fs.rmSync(path.dirname(storePath), { recursive: true, force: true });
    }
  });

  test("whoCalls attributes callers per canonical identity, rows carry the target id", () => {
    const storePath = freshStore();
    try {
      buildConflationStore(storePath);
      const wc = whoCalls(storePath, "run");
      expect(wc.rows).toBe(1);
      expect(wc.callers.length).toBe(1);
      expect(wc.callers[0]?.caller).toBe("ca");
      // V21 contract: the row names WHICH identity was called.
      expect((wc.callers[0] as { target_canonical?: string }).target_canonical).toBe("a.ts:1:run");
    } finally {
      fs.rmSync(path.dirname(storePath), { recursive: true, force: true });
    }
  });
});

describe("V21 W2 tombstone writes", () => {
  test("re-insert tombstones the prior live row instead of REPLACE-deleting it", () => {
    const storePath = freshStore();
    try {
      insertForkNode(storePath, { canonicalId: "x.ts:1:fn", kind: "Function", label: "fn", file: "x.ts", line: 1, run: "run-1" });
      // same canonical_id arrives again in a NEW run (the graph rebuilt)
      insertForkNode(storePath, { canonicalId: "x.ts:1:fn", kind: "Function", label: "fn", file: "x.ts", line: 2, run: "run-2" });
      const db = new Database(storePath, { readonly: true });
      try {
        const all = db.query(
          "SELECT created_run, superseded_run, line FROM typed_nodes WHERE canonical_id = ? ORDER BY created_run",
        ).all("x.ts:1:fn") as Array<{ created_run: string; superseded_run: string | null; line: number }>;
        // BOTH generations exist: run-1 tombstoned BY run-2, run-2 live.
        expect(all.length).toBe(2);
        expect(all[0]?.created_run).toBe("run-1");
        expect(all[0]?.superseded_run).toBe("run-2");
        expect(all[1]?.created_run).toBe("run-2");
        expect(all[1]?.superseded_run).toBeNull();
        expect(all[1]?.line).toBe(2);
      } finally {
        db.close();
      }
      // and the live view sees exactly one row
      expect(countTypedNodes(storePath)).toBe(1);
    } finally {
      fs.rmSync(path.dirname(storePath), { recursive: true, force: true });
    }
  });

  test("edge re-insert follows the same tombstone law", () => {
    const storePath = freshStore();
    try {
      insertForkNode(storePath, { canonicalId: "a.ts:1:a", kind: "Function", label: "a", file: "a.ts", line: 1, run: "r1" });
      insertForkNode(storePath, { canonicalId: "b.ts:1:b", kind: "Function", label: "b", file: "b.ts", line: 1, run: "r1" });
      insertForkEdge(storePath, { srcCanonical: "a.ts:1:a", dstCanonical: "b.ts:1:b", predicate: "calls", evidence: "a()", run: "r1" });
      insertForkEdge(storePath, { srcCanonical: "a.ts:1:a", dstCanonical: "b.ts:1:b", predicate: "calls", evidence: "a() v2", run: "r2" });
      const db = new Database(storePath, { readonly: true });
      try {
        const all = db.query(
          "SELECT created_run, superseded_run, evidence_quote FROM typed_edges WHERE src_canonical = ? AND dst_canonical = ? AND predicate = ? ORDER BY created_run",
        ).all("a.ts:1:a", "b.ts:1:b", "calls") as Array<{ created_run: string; superseded_run: string | null; evidence_quote: string }>;
        expect(all.length).toBe(2);
        expect(all[0]?.created_run).toBe("r1");
        expect(all[0]?.superseded_run).toBe("r2");
        expect(all[1]?.superseded_run).toBeNull();
        expect(all[1]?.evidence_quote).toBe("a() v2");
      } finally {
        db.close();
      }
    } finally {
      fs.rmSync(path.dirname(storePath), { recursive: true, force: true });
    }
  });
});
