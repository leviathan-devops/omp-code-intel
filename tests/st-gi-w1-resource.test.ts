// st-gi-w1-resource: W1 gi-resource proof battery (overhaul spec P1.1, 6 findings).
// One named test per finding, red→green per the TDD law:
//   T1 P1.1.1  populate-corbell: open-failure must NOT close-on-undefined
//   T2 P1.1.3  populate-graphify: read-fault between openSync/closeSync must not leak the fd
//   T3 P1.1.4  go-key-pool: db + -wal + -shm all chmod 0600
//   T4 P1.1.6  go-key-pool: routeGoError on an EMPTY pool returns a named action, never throws
//   T5 P1.1.5  populate-graphify: no require() in the ESM kernel source
//   T6 P1.1.2  typed-write: safeDelete rides ONE connection (whoCallsInDb/impactInDb contract)
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";

import { populateFromCorbellCheckout } from "../src/omp/populate-corbell.ts";
import { supersedeThenInsert } from "../src/omp/populate-graphify.ts";
import {
  insertForkEdgesBatch,
  insertForkNodesBatch,
  openTypedStore,
  safeDelete,
  type ForkEdge,
  type ForkNode,
} from "../src/omp/typed-write.ts";
import { decideGoFallback, GO_KEYS, markGoKeyDead, reloadGoKeys, routeGoError } from "../src/hunter/keys/go-key-pool.ts";

const W1_TMP_DIRS: string[] = [];
function w1Tmp(prefix: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  W1_TMP_DIRS.push(d);
  return d;
}
afterEach(() => {
  // Restore the machine state the pool singleton shares with later test files:
  // env overrides off + reload from the REAL provision file.
  delete process.env.GO_KEYS_JSON;
  delete process.env.GO_POOL_DB;
  delete process.env.GI_KEYS_FILE;
  reloadGoKeys();
});
// Note: tmp dirs are intentionally left for OS tmp reaping (the house battery
// pattern in st-corbell-port.ts does the same); env restores are immediate.
describe("st-gi-w1-resource: P1.1 lifecycle fixes", () => {
  // ---------- T1 (P1.1.1) ----------
  test("test_w1_corbell_open_failure_no_undefined_close_warning", () => {
    const root = w1Tmp("gi-w1-corbell-");
    const warmDir = path.join(root, ".omp", "graph-intelligence", "corbell-checkout");
    fs.mkdirSync(warmDir, { recursive: true });
    const warmPath = path.join(warmDir, "store.sqlite");
    // Minimal warm checkout with the typed schema + one valid node.
    const warm = new Database(warmPath);
    warm.exec(`CREATE TABLE typed_nodes (canonical_id TEXT, kind TEXT, label TEXT, file TEXT, line INTEGER, run TEXT, superseded_run TEXT);
CREATE TABLE typed_edges (src_canonical TEXT, dst_canonical TEXT, predicate TEXT, evidence_quote TEXT, confidence REAL, run TEXT, superseded_run TEXT);
INSERT INTO typed_nodes VALUES ('c-n1','function','n1','src/n1.ts',3,'warm',NULL);`);
    warm.close();
    // root has ONLY .omp (skipped by the freshness walk) → fresh gates pass.

    const warnings: string[] = [];
    const spy = spyOn(console, "error").mockImplementation((...a: unknown[]) => {
      warnings.push(a.map(String).join(" "));
    });
    try {
      // storePath is a DIRECTORY → openTypedStore must throw inside the try.
      const r = populateFromCorbellCheckout(root, root, "w1-open-fail");
      expect(r.ok).toBe(false);
      expect(r.reason ?? "").toMatch(/^CORBELL_WRITE_FAILED:/);
      // THE FIX: no close-on-undefined noise when the open itself failed.
      const undefinedCloses = warnings.filter((w) => w.includes("Cannot read properties of undefined"));
      expect(undefinedCloses).toEqual([]);
    } finally {
      spy.mockRestore();
    }

    // Positive control: a REAL store file → full write succeeds, still silent.
    // Session-shaped: openTypedStore enforces /sessions/{8-24}/store.sqlite.
    const okStore = path.join(root, "sessions", "sesW1OK00000000000001", "store.sqlite");
    fs.mkdirSync(path.dirname(okStore), { recursive: true });
    const spy2 = spyOn(console, "error").mockImplementation(() => {});
    try {
      const r2 = populateFromCorbellCheckout(okStore, root, "w1-open-ok");
      expect(r2.ok).toBe(true);
      expect(r2.nodes).toBe(1);
      expect(r2.edges).toBe(0);
      expect(warnings).toEqual([]);
    } finally {
      spy2.mockRestore();
    }
  });

  // ---------- T3 (P1.1.4) ----------
  test("test_w1_key_pool_sidecars_0600", () => {
    const dir = w1Tmp("gi-w1-pool-");
    const dbPath = path.join(dir, "pool.sqlite");
    process.env.GO_POOL_DB = dbPath;
    process.env.GO_KEYS_JSON = JSON.stringify(["w1-key-a", "w1-key-b"]);
    reloadGoKeys(); // the pool's own reload seam — no import busting
    const now = Date.now();
    markGoKeyDead(0, "w1 429 rate limit", now); // forces db() open + WAL
    decideGoFallback(now);
    for (const f of [dbPath, dbPath + "-wal", dbPath + "-shm"]) {
      const st = fs.statSync(f);
      expect((st.mode & 0o777)).toBe(0o600);
    }
  });

  // ---------- T4 (P1.1.6) ----------
  test("test_w1_route_go_error_empty_pool_named_action", () => {
    const dir = w1Tmp("gi-w1-empty-");
    process.env.GO_POOL_DB = path.join(dir, "pool.sqlite");
    process.env.GO_KEYS_JSON = "[]"; // env source: zero
    process.env.GI_KEYS_FILE = path.join(dir, "absent-keys.json"); // file source: absent
    // Neutralize source 3 (the single-key env fallback) for THIS test only:
    const savedGo = process.env.OPENCODE_GO_API_KEY;
    const savedApi = process.env.OPENCODE_API_KEY;
    delete process.env.OPENCODE_GO_API_KEY;
    delete process.env.OPENCODE_API_KEY;
    try {
      reloadGoKeys();
      expect(GO_KEYS.length).toBe(0);
      // OLD: throws GO_POOL_EMPTY out of decideGoFallback via routeGoError.
      // NEW: named action — an empty pool has nothing to advance to.
      expect(routeGoError(0, "HTTP 429 rate limited", Date.now())).toBe("fall-to-openrouter");
    } finally {
      if (savedGo !== undefined) process.env.OPENCODE_GO_API_KEY = savedGo;
      if (savedApi !== undefined) process.env.OPENCODE_API_KEY = savedApi;
    }
  });

  // ---------- T5 (P1.1.5) ----------
  test("test_w1_graphify_esm_no_require", () => {
    const src = fs.readFileSync(
      path.join(import.meta.dir, "..", "src", "omp", "populate-graphify.ts"),
      "utf8",
    );
    expect(/\brequire\s*\(/.test(src)).toBe(false);
  });

  // ---------- T6 (P1.1.2) ----------
  test("test_w1_safe_delete_single_connection_contract", async () => {
    const root = w1Tmp("gi-w1-sd-");
    // Session-shaped: openTypedStore enforces /sessions/{8-24}/store.sqlite.
    const storePath = path.join(root, "sessions", "sesW1SD00000000000001", "store.sqlite");
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const db = openTypedStore(storePath);
    const nodes: ForkNode[] = [
      { canonicalId: "c-a", kind: "function", label: "a", file: "src/a.ts", line: 1, run: "w1" },
      { canonicalId: "c-b", kind: "function", label: "b", file: "src/b.ts", line: 5, run: "w1" },
    ];
    const edges: ForkEdge[] = [
      { srcCanonical: "c-b", dstCanonical: "c-a", predicate: "calls", evidence: "b calls a", run: "w1" },
    ];
    db.exec("BEGIN IMMEDIATE;"); // the batch inserters are txn-gated by design
    insertForkNodesBatch(db, nodes);
    insertForkEdgesBatch(db, edges);
    db.exec("COMMIT;");

    // THE CONTRACT: handle-injected variants exist and match the path-based
    // public API row-for-row; safeDelete rides the ONE outer connection.
    const qPath = safeDelete(storePath, "a");
    // Dynamic import REQUIRED: the Db-variants are introduced BY the fix under
    // test — a static import of a not-yet-existing export would fail the whole
    // FILE at load and hide the other five reds. The boundary IS the module
    // surface itself (module-loading exception per the no-dynamic-import rule).
    const { whoCallsInDb, impactInDb } = await import("../src/omp/typed-write.ts");
    const qDb = whoCallsInDb(db, "a");
    const iDb = impactInDb(db, "a");
    expect(qDb.callers).toEqual(qPath.callers);
    expect(iDb.reaches).toBe(qPath.reaches);
    expect(qPath.callers.map((c: { caller: string }) => c.caller)).toEqual(["b"]);
    expect(qPath.reaches).toBe(1);
    db.close();
  });

  // ---------- T2 (P1.1.3) — LAST: it installs a node:fs seam mock ----------
  test("test_w1_graphify_hash_read_error_closes_fd", async () => {
    const root = w1Tmp("gi-w1-fd-");
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "ok.ts"), "export const ok = 1;\n");
    fs.writeFileSync(path.join(root, "src", "fault.ts"), "export const fault = 1;\n");
    const graphPath = path.join(root, "g.json");
    fs.writeFileSync(graphPath, "{}");
    fs.writeFileSync(path.join(root, "g.graph_hash"), "stale-baseline");
    // Dynamic import REQUIRED: this instance must capture the node:fs seam
    // mock registered below (the file's static imports bound the real fs).
    // Bun's mock.module takes a FACTORY returning the module namespace.
    const actualFs = await import("node:fs");
    // Capture REAL function VALUES before mocking: bun's mock.module rebinds
    // the live namespace exports, so `actualFs.readSync(...)` inside the mock
    // would recurse into itself. Pre-mock consts hold the original functions.
    const realReadSync = actualFs.readSync;
    const realReadlinkSync = actualFs.readlinkSync;
    const realReaddirSync = actualFs.readdirSync;
    // Bun's mock.module takes a FACTORY returning the module namespace.
    mock.module("node:fs", () => ({
      ...actualFs,
      readSync(fd: number, buffer: Uint8Array, offset: number, length: number, position?: number): number {
        let target = "";
        try { target = realReadlinkSync(`/proc/self/fd/${fd}`); } catch { /* transient */ }
        if (target.endsWith("fault.ts")) throw Object.assign(new Error("EIO: fault injection"), { code: "EIO" });
        return realReadSync(fd, buffer, offset, length, position ?? null);
      },
    }));
    // Cache-busted import: THIS instance captures the mocked node:fs.
    const pg = await import("../src/omp/populate-graphify.ts?w1fd");

    const faultFds = (): number => {
      let n = 0;
      for (const e of realReaddirSync("/proc/self/fd")) {
        if (!/^\d+$/.test(e)) continue;
        try {
          if (realReadlinkSync(`/proc/self/fd/${e}`).endsWith("fault.ts")) n++;
        } catch { /* fd closed between readdir and readlink — fine */ }
      }
      return n;
    };

    const before = faultFds();
    // 8 iterations discriminate cleanly: OLD leaked one fd PER call (≥8),
    // NEW closes in finally (≤2). 8 keeps the fault loop inside the battery
    // time budget (the EIO seam costs ~real readlink per call).
    for (let i = 0; i < 8; i++) {
      // sidecar present → probe recomputes the hash → walks src/ → hits the seam
      pg.isGraphifyCheckoutFreshFor(root, graphPath, ["src"], []);
    }
    expect(pg.isGraphifyCheckoutFreshFor(root, graphPath, ["src"], []).fresh).toBe(false);
    const leaked = faultFds() - before;
    // OLD: 8 leaked fds (closeSync skipped by the swallow-catch). NEW: ≤2.
    expect(leaked).toBeLessThanOrEqual(2);

    mock.module("node:fs", () => actualFs);
    mock.restore();
  });
});
