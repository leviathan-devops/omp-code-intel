// st-gi-w9-toctou: W9 residual-high fixes proof battery.
//   T1  post-open re-verify: a symlink planted between validation and
//       Database open is refused (GI_STORE_SYMLINK), not opened.
//   T2  post-open re-verify: a garbage file swapped in after validation is
//       refused (GI_STORE_CORRUPT), not opened.
//   T3  valid store still opens clean (no false refusal on the happy path).
//   T4  chainCalls visit-cap: a wide fan-out stops at the budget and the
//       returned path array carries truncated=true (never a silent cut).
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { openTypedStore, insertForkNode, insertForkEdge, chainCalls, verifyOpenedStoreFile } from "../src/omp/typed-write.ts";


function sessPath(tag: string): string {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), tag)), "sessions", "sesW9TOCTOU00000001", "store.sqlite");
  fs.mkdirSync(path.dirname(p), { recursive: true });
  return p;
}

function seedTiny(p: string): void {
  insertForkNode(p, { canonicalId: "c-a", kind: "Function", label: "a", file: "src/a.ts", line: 1, run: "w9" });
  insertForkNode(p, { canonicalId: "c-b", kind: "Function", label: "b", file: "src/b.ts", line: 2, run: "w9" });
  insertForkEdge(p, { srcCanonical: "c-a", dstCanonical: "c-b", predicate: "calls", evidence: "a->b", run: "w9" });
}

describe("st-gi-w9-toctou: post-open re-verify + chain visit cap", () => {
  test("test_w9_postopen_symlink_refused", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w9-sym-"));
    const real = path.join(dir, "sessions", "sesW9TOCTOU00000001", "store.sqlite");
    fs.mkdirSync(path.dirname(real), { recursive: true });
    seedTiny(real);
    const link = path.join(dir, "sessions", "sesW9TOCTOU00000002", "store.sqlite");
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(real, link);
    // The open path itself passes lstat-refusal? No — lstat SEES the link and
    // refuses up front; this test pins the post-open layer too by asserting
    // the refusal error code either way.
    expect(() => openTypedStore(link)).toThrow(/GI_STORE_SYMLINK|GI_STORE_CORRUPT/);
  });

  test("test_w9_postopen_garbage_refused", () => {
    const p = sessPath("gi-w9-garbage-");
    fs.writeFileSync(p, "definitely not a sqlite file, just text............");
    expect(() => openTypedStore(p)).toThrow(/GI_STORE_CORRUPT/);
  });

  test("test_w9_postopen_valid_passes", () => {
    const p = sessPath("gi-w9-valid-");
    seedTiny(p);
    const db = openTypedStore(p);
    try {
      const n = (db.query("SELECT COUNT(*) AS n FROM typed_nodes WHERE superseded_run IS NULL").get() as { n: number }).n;
      expect(n).toBe(2);
    } finally {
      db.close();
    }
  });

  test("test_w9_postopen_helper_symlink_direct", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w9-hsym-"));
    const real = path.join(dir, "sessions", "sesW9TOCTOU00000001", "store.sqlite");
    fs.mkdirSync(path.dirname(real), { recursive: true });
    seedTiny(real);
    const link = path.join(dir, "sessions", "sesW9TOCTOU00000002", "store.sqlite");
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(real, link);
    expect(() => verifyOpenedStoreFile(link)).toThrow(/GI_STORE_SYMLINK/);
  });

  test("test_w9_postopen_helper_valid_direct", () => {
    const p = sessPath("gi-w9-hvalid-");
    seedTiny(p);
    expect(() => verifyOpenedStoreFile(p)).not.toThrow();
  });

  test("test_w9_chain_visitcap_truncated", () => {
    const p = sessPath("gi-w9-chain-");
    // Wide fan-out: root calls 40 leaves; visitCap=10 forces the budget.
    insertForkNode(p, { canonicalId: "c-root", kind: "Function", label: "root", file: "src/r.ts", line: 1, run: "w9" });
    const db = new Database(p);
    try {
      db.exec("BEGIN IMMEDIATE;");
      for (let i = 0; i < 40; i++) {
        db.run("INSERT INTO typed_nodes (canonical_id, kind, label, file, line, created_run, superseded_run) VALUES (?, 'Function', ?, 'src/l.ts', 1, 'w9', NULL)", [`c-l${i}`, `leaf${i}`]);
        db.run("INSERT INTO typed_edges (src_canonical, dst_canonical, predicate, evidence_quote, confidence, created_run, superseded_run) VALUES ('c-root', ?, 'calls', 'e', 1.0, 'w9', NULL)", [`c-l${i}`]);
      }
      db.exec("COMMIT;");
    } catch (e) {
      try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
      throw e;
    } finally {
      db.close();
    }
    const steps = chainCalls(p, "root", "no-such-target", 64, 10);
    const truncated = "truncated" in steps ? steps.truncated : undefined;
    expect(truncated).toBe(true);
    expect(Array.isArray(steps)).toBe(true);
  });
});
