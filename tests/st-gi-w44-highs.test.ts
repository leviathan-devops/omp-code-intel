// W44 qwen-scan highs — one named test per finding, red→green, one commit per fix.
// F1 = populate-corbell:111 LIMIT-vs-cap (SQL LIMIT 20001 silently cuts rows the
// 50k in-memory cap claims to allow; over-cap rows never counted in skipped).
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { CORBELL_PREDICATES, isCorbellCheckoutFreshFor, populateFromCorbellCheckout, warmStoreStat, warmStoreUnchanged } from "../src/omp/populate-corbell.ts";
import { computeSourceHashWithBudget, isGraphifyCheckoutFreshFor } from "../src/omp/populate-graphify.ts";
import { captureSnapshot } from "../src/kernel/graph-diff.ts";
import { normalizeGraphifyGraph } from "../src/hunter/graph/graphify-adapter.ts";
import { Database } from "bun:sqlite";
import { describe, test, expect } from "bun:test";
describe("st-gi-w44-highs: qwen scan tail", () => {
  // ---------- F1 (populate-corbell:111 LIMIT vs cap) ----------
  test("test_w44_corbell_sql_limit_matches_cap_over_20k_rows", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-limit-"));
    const warmDir = path.join(root, ".omp", "graph-intelligence", "corbell-checkout");
    fs.mkdirSync(warmDir, { recursive: true });
    const warmPath = path.join(warmDir, "store.sqlite");
    const warm = new Database(warmPath);
    warm.exec(`CREATE TABLE typed_nodes (canonical_id TEXT, kind TEXT, label TEXT, file TEXT, line INTEGER, run TEXT, superseded_run TEXT);
CREATE TABLE typed_edges (src_canonical TEXT, dst_canonical TEXT, predicate TEXT, evidence_quote TEXT, confidence REAL, run TEXT, superseded_run TEXT);`);
    // 20,100 valid nodes — ABOVE the old SQL LIMIT (20001), BELOW the 50k cap.
    warm.exec("BEGIN");
    const ins = warm.prepare(
      "INSERT INTO typed_nodes (canonical_id, kind, label, file, line, run, superseded_run) VALUES (?, 'function', ?, 'src/n.ts', 1, 'warm', NULL)",
    );
    for (let i = 0; i < 20_100; i++) {
      ins.run(`c-n${String(i).padStart(8, "0")}`, `n${i}`);
    }
    warm.exec("COMMIT");
    warm.close();
    // root contains ONLY .omp (skipped by the freshness walk) → fresh gates pass.

    const storePath = path.join(root, "sessions", "sesW44LIMIT0000001", "store.sqlite");
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const r = populateFromCorbellCheckout(storePath, root, "w44limit");
    expect(r.ok).toBe(true);
    // THE FIX: nothing silently dropped by a SQL LIMIT smaller than the cap.
    expect(r.nodes).toBe(20_100);
    expect(r.skipped ?? 0).toBe(0);
  });

  // ---------- F2 (populate-corbell:143 mtime equality) ----------
  test("test_w44_corbell_mid_read_check_catches_same_mtime_swap", () => {
    // preserved-mtime swap (same mtimeMs, different size) must read as CHANGED
    expect(warmStoreUnchanged({ mtimeMs: 100, size: 10, ino: 1 }, { mtimeMs: 100, size: 99, ino: 1 })).toBe(false);
    // same mtime+size on a REPLACED inode (same-stat copy trick) must read as CHANGED
    expect(warmStoreUnchanged({ mtimeMs: 100, size: 10, ino: 1 }, { mtimeMs: 100, size: 10, ino: 2 })).toBe(false);
    // vanished mid-read (either leg missing) must read as CHANGED
    expect(warmStoreUnchanged({ mtimeMs: 100, size: 10, ino: 1 }, null)).toBe(false);
    expect(warmStoreUnchanged(null, { mtimeMs: 100, size: 10, ino: 1 })).toBe(false);
    // identical stat snapshot → unchanged
    expect(warmStoreUnchanged({ mtimeMs: 100, size: 10, ino: 1 }, { mtimeMs: 100, size: 10, ino: 1 })).toBe(true);
    // warmStoreStat returns the full snapshot for a real file, null when absent
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-stat-"));
    const p = path.join(root, "store.sqlite");
    fs.writeFileSync(p, Buffer.alloc(64, 7));
    const st = warmStoreStat(p);
    expect(st).not.toBeNull();
    expect(st!.size).toBe(64);
    expect(warmStoreStat(path.join(root, "absent.sqlite"))).toBeNull();
  });

  // ---------- F3 (populate-corbell:54 freshness budget 2000) ----------
  test("test_w44_corbell_freshness_budget_scales_past_2000_files", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-budget-"));
    const warmDir = path.join(root, ".omp", "graph-intelligence", "corbell-checkout");
    fs.mkdirSync(warmDir, { recursive: true });
    const warmPath = path.join(warmDir, "store.sqlite");
    // 2,100 indexed-class files — ABOVE the old hardcoded budget of 2000.
    const flat = path.join(root, "flat");
    fs.mkdirSync(flat, { recursive: true });
    for (let i = 0; i < 2_100; i++) {
      fs.writeFileSync(path.join(flat, `f${i}.ts`), "export const x = 1;\n");
    }
    fs.writeFileSync(warmPath, "not-a-real-db-but-nonempty\n");
    // Warm store touched AFTER the sources → the correct verdict is FRESH.
    const future = new Date(Date.now() + 5_000);
    fs.utimesSync(warmPath, future, future);
    const fresh = isCorbellCheckoutFreshFor(root, warmPath);
    // THE FIX: budget no longer exhausts on a 2,100-file tree (stale-budget).
    expect(fresh.fresh).toBe(true);
    expect(fresh.reason).toBe("fresh");
  });

  // ---------- F4 (populate-corbell:181 predicate allowlist single source) ----------
  test("test_w44_corbell_predicate_allowlist_single_source_shared_with_diff", () => {
    // The vocabulary is ONE exported contract, not drifting inline literals.
    expect([...CORBELL_PREDICATES]).toEqual(["calls", "traces-to", "imports"]);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-pred-"));
    const warmDir = path.join(root, ".omp", "graph-intelligence", "corbell-checkout");
    fs.mkdirSync(warmDir, { recursive: true });
    const warmPath = path.join(warmDir, "store.sqlite");
    const warm = new Database(warmPath);
    warm.exec(`CREATE TABLE typed_nodes (canonical_id TEXT, kind TEXT, label TEXT, file TEXT, line INTEGER, run TEXT, superseded_run TEXT);
CREATE TABLE typed_edges (src_canonical TEXT, dst_canonical TEXT, predicate TEXT, evidence_quote TEXT, confidence REAL, run TEXT, superseded_run TEXT);
INSERT INTO typed_nodes VALUES ('c-a','function','a','src/a.ts',1,'warm',NULL);
INSERT INTO typed_nodes VALUES ('c-b','function','b','src/b.ts',2,'warm',NULL);
INSERT INTO typed_edges VALUES ('c-a','c-b','calls','q',1.0,'warm',NULL);
INSERT INTO typed_edges VALUES ('c-a','c-b','drift-probe','q',1.0,'warm',NULL);`);
    warm.close();
    const storePath = path.join(root, "sessions", "sesW44PRED0000001", "store.sqlite");
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const r = populateFromCorbellCheckout(storePath, root, "w44pred");
    expect(r.ok).toBe(true);
    // corbell gate: out-of-vocabulary predicate skipped AND counted
    expect(r.edges).toBe(1);
    expect(r.skipped).toBe(1);
    // graph-diff speaks the SAME vocabulary (drift-probe edge is not "known")
    const snap = captureSnapshot(storePath);
    expect(snap.edgePredicates["calls"]).toBe(1);
    expect(snap.edgePredicates["drift-probe"]).toBeUndefined();
  });

  // ---------- F5 (populate-graphify:142 mtime fallback second-granularity) ----------
  test("test_w44_graphify_mtime_fallback_detects_same_second_edit", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-mtime-"));
    const srcDir = path.join(root, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    const srcFile = path.join(srcDir, "a.ts");
    fs.writeFileSync(srcFile, "export const a = 1;\n");
    // Warm graph 400ms OLDER than the source edit — SAME epoch second.
    const graphPath = path.join(root, "graph.json");
    fs.writeFileSync(graphPath, "{}\n");
    const nowSec = Math.floor(Date.now() / 1000);
    const srcM = (nowSec + 1) * 1000 + 400;
    const graphM = (nowSec + 1) * 1000;
    fs.utimesSync(srcFile, new Date(srcM), new Date(srcM));
    fs.utimesSync(graphPath, new Date(graphM), new Date(graphM));
    // No sidecar → legacy mtime fallback path.
    const v = isGraphifyCheckoutFreshFor(root, graphPath, ["src"], []);
    // THE FIX: full ms precision — the sub-second edit must read STALE.
    expect(v.fresh).toBe(false);
    expect(v.reason).toBe("stale");
  });

  // ---------- F6 (populate-graphify:178 large-file fingerprint) ----------
  test("test_w44_graphify_large_file_hash_distinguishes_mid_file_edits", () => {
    const mk = (middleByte: string): string => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-big-"));
      const srcDir = path.join(root, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      const head = Buffer.alloc(4096, 0x48); // 'H'
      const mid = Buffer.alloc(90_112, middleByte.charCodeAt(0));
      const tail = Buffer.alloc(4096, 0x54); // 'T'
      fs.writeFileSync(path.join(srcDir, "big.ts"), Buffer.concat([head, mid, tail]));
      return computeSourceHashWithBudget(root, ["src"], [], 10_000);
    };
    const hashA = mk("A");
    const hashB = mk("B");
    // THE FIX: identical head+tail+size with a DIFFERENT middle must not collide.
    expect(hashA).not.toBe(hashB);
  });

  // ---------- F7 (graphify-adapter:224 edge type lie) ----------
  test("test_w44_adapter_missing_relation_is_not_fabricated", () => {
    const raw = {
      nodes: [{ id: "n1", label: "a", type: "function", file: "src/a.ts" }, { id: "n2", label: "b", type: "function", file: "src/b.ts" }],
      links: [{ source: "n1", target: "n2" }], // NO relation declared
    };
    const g = normalizeGraphifyGraph(raw);
    // THE FIX: an undeclared relation must read "unknown" — never a fabricated
    // real relation name ("references") that typed queries then trust.
    expect(g.edges.length).toBe(1);
    expect(g.edges[0]!.relation).toBe("unknown");
  });
});
