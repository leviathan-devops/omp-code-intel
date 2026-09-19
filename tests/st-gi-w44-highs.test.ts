// W44 qwen-scan highs — one named test per finding, red→green, one commit per fix.
// F1 = populate-corbell:111 LIMIT-vs-cap (SQL LIMIT 20001 silently cuts rows the
// 50k in-memory cap claims to allow; over-cap rows never counted in skipped).
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { CORBELL_PREDICATES, isCorbellCheckoutFreshFor, populateFromCorbellCheckout, warmStoreStat, warmStoreUnchanged } from "../src/omp/populate-corbell.ts";
import { computeSourceHashWithBudget, isGraphifyCheckoutFreshFor } from "../src/omp/populate-graphify.ts";
import { captureSnapshot } from "../src/kernel/graph-diff.ts";
import { normalizeGraphifyGraph, scopeBuildToProfile } from "../src/hunter/graph/graphify-adapter.ts";
import { Database } from "bun:sqlite";
import { describe, test, expect } from "bun:test";
import { ledgerDirConfined, parseTargetRoots, settlementLedgerConfined, substrateNeedsPopulate, writeWipeAudit } from "../src/omp/extension.ts";
import { populateSessionStore } from "../src/omp/populate.ts";
import { goKeyDead, goPoolDbFile, hardenPoolFile, hardenPrivateDir, markGoKeyDead, reloadGoKeys } from "../src/hunter/keys/go-key-pool.ts";
import { supersedeThenInsert } from "../src/omp/populate-graphify.ts";
import { GraphifyAdapter } from "../src/hunter/graph/graphify-adapter.ts";
import { graphProbeWipeAudited } from "../src/omp/extension.ts";
import { sweep, writeBriefPinned } from "../src/hydra/auditor.ts";
import { containedScopeTarget } from "../src/omp/populate-graphify.ts";
import { normalizeGraphifyGraph, scopeBuildToProfile } from "../src/hunter/graph/graphify-adapter.ts";
import { blastRadius, chainCalls, setMeta } from "../src/omp/typed-write.ts";
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

  // ---------- F8 (graphify-adapter:199 null row guard) ----------
  test("test_w44_adapter_null_rows_dropped_not_thrown", () => {
    const raw = {
      nodes: [null, { id: "n1", label: "a", type: "function", file: "src/a.ts" }, 42, { id: "n2", label: "b", type: "function", file: "src/b.ts" }],
      links: [null, { source: "n1", target: "n2", relation: "calls" }],
    };
    // THE FIX: null / non-object rows are DROPPED (counted), never a TypeError.
    const g = normalizeGraphifyGraph(raw);
    expect(g.nodes.length).toBe(2);
    expect(g.edges.length).toBe(1);
    expect(g.edges[0]!.relation).toBe("calls");
  });

  // ---------- F9 (graphify-adapter:181 sync containment base) ----------
  test("test_w44_scope_sync_base_canonical_failclosed", () => {
    const mkNode = (id: string, file: string): { id: string; label: string; type: string; file: string } => ({ id, label: id, type: "function", file });
    const nodes = [mkNode("n1", "src/a.ts"), mkNode("n2", "docs/b.md"), mkNode("n3", "src/c.ts")];
    const edges = [
      { sourceId: "n1", targetId: "n3", relation: "calls", confidence: "EXTRACTED" as const },
      { sourceId: "n1", targetId: "n2", relation: "calls", confidence: "EXTRACTED" as const },
    ];
    // Leg 1: unresolvable base = fail CLOSED (zero rows, full drop).
    const dead = scopeBuildToProfile(nodes, edges, path.join("/nonexistent", String(Date.now())), ["src"]);
    expect(dead.nodes.length).toBe(0);
    expect(dead.dropped).toBe(3);
    // Leg 2: SYMLINKED base canonicalizes once — scoped rows survive, out-of-scope
    // rows drop, and the edge whose endpoint dropped is pruned with them.
    const real = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-base-real-"));
    fs.mkdirSync(path.join(real, "src"), { recursive: true });
    fs.mkdirSync(path.join(real, "docs"), { recursive: true });
    const linkRoot = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-base-link-")), "link");
    fs.symlinkSync(real, linkRoot);
    const r = scopeBuildToProfile(nodes, edges, linkRoot, ["src"]);
    expect(r.nodes.map((n) => n.id).sort()).toEqual(["n1", "n3"]);
    expect(r.edges.length).toBe(1);
    expect(r.edges[0]!.targetId).toBe("n3");
  });

  // ---------- F10 (extension:463 audit ledger TOCTOU / prefix check) ----------
  test("test_w44_ledger_containment_component_check_accepts_root_child", () => {
    // THE FIX: component-based containment (the W16 discipline) replaces the
    // string startsWith — a "/" target must ACCEPT its children (the old
    // resolve(root)+sep built "//" and false-denied), siblings stay denied.
    expect(ledgerDirConfined("/tmp/gi-audit/ledger-x", "/tmp/gi-audit")).toBe(true);
    expect(ledgerDirConfined("/tmp/gi-audit-x/ledger", "/tmp/gi-audit")).toBe(false);
    expect(ledgerDirConfined("/etc/passwd-dir", "/tmp/gi-audit")).toBe(false);
    expect(ledgerDirConfined("/tmp/gi-audit", "/tmp/gi-audit")).toBe(false); // empty rel = the root itself
    // root "/" accepts any absolute child, denies nothing below itself
    expect(ledgerDirConfined("/tmp/ledger", "/")).toBe(true);
  });

  // ---------- F13 (extension:245 wipe audit path) ----------
  test("test_w44_wipe_audit_lands_in_registry_store", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-wipe-"));
    const giDir = path.join(root, ".omp", "graph-intelligence");
    // THE FIX: the audit write goes through a registry-shaped store — the old
    // setMeta(registry.sqlite) always threw (session-shape law) so the trail
    // NEVER landed and every wipe reported WIPE_AUDIT_FAILED.
    expect(() => writeWipeAudit(giDir, "sess-a@2026-09-18T00:00:00Z")).not.toThrow();
    const db = new Database(path.join(giDir, "registry.sqlite"), { readonly: true });
    try {
      const row = db.query("SELECT value FROM gi_meta WHERE key = 'last_wipe'").get() as { value: string };
      expect(row.value).toBe("sess-a@2026-09-18T00:00:00Z");
    } finally {
      db.close();
    }
    // second write upserts (audit trail keeps the LATEST wipe)
    expect(() => writeWipeAudit(giDir, "sess-b@2026-09-18T01:00:00Z")).not.toThrow();
    const db2 = new Database(path.join(giDir, "registry.sqlite"), { readonly: true });
    try {
      const row2 = db2.query("SELECT value FROM gi_meta WHERE key = 'last_wipe'").get() as { value: string };
      expect(row2.value).toBe("sess-b@2026-09-18T01:00:00Z");
    } finally {
      db2.close();
    }
  });

  // ---------- F15 (extension:50 GI_TARGET_ROOTS split) ----------
  test("test_w44_target_roots_split_keeps_colon_paths_whole", () => {
    // THE FIX: entries split on '|' ONLY — the old extra ':' split corrupted
    // legal colon-bearing Linux paths AND allowlisted their truncated prefix.
    expect(parseTargetRoots(" /a | /b ", "/w")).toEqual(["/a", "/b"]); // whitespace + empties dropped
    expect(parseTargetRoots("/a::/b", "/w")).toEqual(["/a::/b"]); // colons survive whole
    expect(parseTargetRoots("", "/w")).toEqual([]); // caller falls back to [cwd, /tmp]
    expect(parseTargetRoots("C:", "/w")).toEqual(["C:"]); // drive-letter root preserved whole
  });

  // ---------- F14 (extension:485 settlement reconfine base) ----------
  test("test_w44_settlement_reconfine_checks_target_root_not_general_allowlist", () => {
    const real = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-tgt-"));
    fs.mkdirSync(path.join(real, "ledger", "findings"), { recursive: true });
    // Under the audit target → accepted, real path returned.
    const ok = settlementLedgerConfined(path.join(real, "ledger"), real);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.real).toBe(fs.realpathSync(path.join(real, "ledger")));
    // Under /tmp but OUTSIDE the audit target: the old general-allowlist
    // reconfine (default roots [target, /tmp]) ACCEPTED this escape.
    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-elsewhere-"));
    const escaped = settlementLedgerConfined(elsewhere, real);
    expect(escaped.ok).toBe(false);
    // Missing ledger path → loud denial, never a throw.
    expect(settlementLedgerConfined(path.join(real, "nope"), real).ok).toBe(false);
  });

  // ---------- F16 (extension:371 populate-lane recheck) ----------
  test("test_w44_substrate_needs_populate_decision_seam", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-lane-"));
    const storePath = path.join(root, "sessions", "sesW44LANE0000001", "store.sqlite");
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    // Leg A: empty store → populate needed.
    expect(substrateNeedsPopulate(storePath, root)).toBe(true);
    // Warm corbell checkout (root holds ONLY .omp → freshness passes).
    const warmDir = path.join(root, ".omp", "graph-intelligence", "corbell-checkout");
    fs.mkdirSync(warmDir, { recursive: true });
    const warm = new Database(path.join(warmDir, "store.sqlite"));
    warm.exec(`CREATE TABLE typed_nodes (canonical_id TEXT, kind TEXT, label TEXT, file TEXT, line INTEGER, run TEXT, superseded_run TEXT);
CREATE TABLE typed_edges (src_canonical TEXT, dst_canonical TEXT, predicate TEXT, evidence_quote TEXT, confidence REAL, run TEXT, superseded_run TEXT);
INSERT INTO typed_nodes VALUES ('c-n1','function','n1','src/n1.ts',3,'warm',NULL);`);
    warm.close();
    populateSessionStore(storePath, root);
    // Leg B: populated from corbell + warm → NO repopulate (the skip the
    // lane-queued concurrent query must take).
    expect(substrateNeedsPopulate(storePath, root)).toBe(false);
    // Leg C: fallback substrate + warm corbell → upgrade repopulate fires.
    setMeta(storePath, "substrate", "indexer-fallback");
    expect(substrateNeedsPopulate(storePath, root)).toBe(true);
  });

  // ---------- F20 (pool:340 reorder exile loss) ----------
  test("test_w44_pool_reorder_preserves_displaced_key_exile", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-pool-"));
    const prevPool = process.env.GO_POOL_DB;
    const prevKeys = process.env.GO_KEYS_JSON;
    process.env.GO_POOL_DB = path.join(dir, "pool.sqlite");
    process.env.GO_KEYS_JSON = JSON.stringify(["key-aaa", "key-bbb"]);
    reloadGoKeys();
    try {
      const now = Date.now();
      // B (idx 1) is exiled.
      markGoKeyDead(1, "429 rate limit window", now);
      expect(goKeyDead(1, now + 60_000)).toBe(true);
      // REORDER: B moves to idx 0, A moves to idx 1.
      process.env.GO_KEYS_JSON = JSON.stringify(["key-bbb", "key-aaa"]);
      reloadGoKeys();
      // A (now idx 1) gets exiled — its upsert must NOT destroy B's exile row.
      markGoKeyDead(1, "429 rate limit window", now);
      // THE FIX: B's exile survives the reorder (keyid re-homing).
      expect(goKeyDead(0, now + 60_000)).toBe(true);
      expect(goKeyDead(1, now + 60_000)).toBe(true);
    } finally {
      if (prevPool === undefined) delete process.env.GO_POOL_DB; else process.env.GO_POOL_DB = prevPool;
      if (prevKeys === undefined) delete process.env.GO_KEYS_JSON; else process.env.GO_KEYS_JSON = prevKeys;
      reloadGoKeys();
    }
  });

  // ---------- F17 (pool:106 private dir existing perms) ----------
  test("test_w44_pool_private_dir_hardened_even_when_preexisting", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-dir-"));
    const privateDir = path.join(dir, ".gi-omp");
    // An attacker (or sloppy setup) pre-creates the dir WORLD-READABLE.
    fs.mkdirSync(privateDir, { mode: 0o755 });
    // THE FIX: hardenPrivateDir tightens a PRE-EXISTING lax dir (the old
    // mkdir mode only applied on CREATE — 0755 stayed with the pool inside).
    hardenPrivateDir(privateDir);
    const mode = fs.statSync(privateDir).mode & 0o777;
    expect(mode).toBe(0o700);
    // Idempotent + creates on demand.
    const fresh = path.join(dir, "nested", ".gi-omp");
    hardenPrivateDir(fresh);
    expect(fs.statSync(fresh).mode & 0o777).toBe(0o700);
  });

  // ---------- F18+F19 (pool:131 cache-hit chmod TOCTOU / pool:167 symlink refusal bypass) ----------
  test("test_w44_pool_harden_nofollow_never_chmods_victim", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-harden-"));
    // Real file: harden 0644 -> 0600.
    const real = path.join(dir, "pool.sqlite");
    fs.writeFileSync(real, "x");
    fs.chmodSync(real, 0o644);
    hardenPoolFile(real);
    expect(fs.statSync(real).mode & 0o777).toBe(0o600);
    // Symlink plant: the call THROWS and the VICTIM keeps its mode — the old
    // lstat-then-chmodSync window chmodded the victim through the link.
    const victim = path.join(dir, "victim.sqlite");
    fs.writeFileSync(victim, "x");
    fs.chmodSync(victim, 0o644);
    const plant = path.join(dir, "plant.sqlite");
    fs.symlinkSync(victim, plant);
    expect(() => hardenPoolFile(plant)).toThrow();
    expect(fs.statSync(victim).mode & 0o777).toBe(0o644);
  });

  // ---------- F21 (laguna scan HIGH: write-path chmod still follows symlinks) ----------
  test("test_w44_pool_write_path_sidecar_hardening_nofollow", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-wal-"));
    const prevDb = process.env.GO_POOL_DB;
    const prevKeys = process.env.GO_KEYS_JSON;
    process.env.GO_POOL_DB = path.join(dir, "pool.sqlite");
    process.env.GO_KEYS_JSON = JSON.stringify(["key-aaa", "key-bbb"]);
    reloadGoKeys();
    try {
      const now = Date.now();
      markGoKeyDead(0, "429 rate limit window", now); // creates db + -wal
      // Plant: -wal swapped for a symlink to a VICTIM file.
      const victim = path.join(dir, "victim.sqlite");
      fs.writeFileSync(victim, "x");
      fs.chmodSync(victim, 0o644);
      const wal = process.env.GO_POOL_DB + "-wal";
      fs.rmSync(wal, { force: true });
      fs.symlinkSync(victim, wal);
      // Write-path re-chmod must go through O_NOFOLLOW — the victim keeps 644.
      markGoKeyDead(1, "429 rate limit window", now);
      expect(fs.statSync(victim).mode & 0o777).toBe(0o644);
    } finally {
      if (prevDb === undefined) delete process.env.GO_POOL_DB; else process.env.GO_POOL_DB = prevDb;
      if (prevKeys === undefined) delete process.env.GO_KEYS_JSON; else process.env.GO_KEYS_JSON = prevKeys;
      reloadGoKeys();
    }
  });
  // ---------- F22 (auditor: probe failures dropped when findings exist) ----------
  test("test_w44_deadcode_sweep_marks_incomplete_alongside_findings", async () => {
    const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-sweep-"));
    const srcDir = path.join(targetRoot, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    for (const n of ["n1", "n2", "n3", "n4"]) fs.writeFileSync(path.join(srcDir, `${n}.ts`), `export const ${n} = 1;\n`);
    const graph = {
      nodes: [
        { id: "n1", label: "n1", type: "function", file: "src/n1.ts", data: {} },
        { id: "n2", label: "n2", type: "function", file: "src/n2.ts", data: {} },
        { id: "n3", label: "n3", type: "function", file: "src/n3.ts", data: {} },
        { id: "n4", label: "n4", type: "function", file: "src/n4.ts", data: {} },
        { id: "p1", label: "p1", type: "function", file: "src/p1.ts", data: {} },
        { id: "p2", label: "p2", type: "function", file: "src/p2.ts", data: {} },
      ],
      edges: [{ src: "p1", dst: "p2", relation: "calls", confidence: "EXTRACTED" }],
    };
    let calls = 0;
    const invoke = async ({ pattern }: { pattern: string }) => {
      calls += 1;
      // n1/n2 probe clean (no consumers); n3/n4 probes FAIL (infra).
      return pattern.startsWith("n1") || pattern.startsWith("n2") ? "(no matches)" : "SEARCH_FAILED: boom";
    };
    const belt = { grep: { invoke }, read: { invoke }, writeFindings: { invoke }, graphTag: { invoke }, tools: [] };
    const template = { anchorPredicate: "dead-code", layerId: "R28-sro-graph" };
    const callCounter = { count: 0, names: [] as string[] };
    const results = await sweep(template as never, graph as never, targetRoot, belt as never, callCounter);
    const found = results.filter((r) => String(r.subject).includes("dead code"));
    const marked = results.filter((r) => String(r.subject).includes("INCOMPLETE") || String(r.predicate).includes("incomplete"));
    // 2 dead-code rows ride WITH the incompleteness marker — the old gate
    // (out.length === 0) dropped the marker whenever any finding existed.
    expect(found.length).toBe(2);
    expect(marked.length).toBe(1);
  });

  // ---------- F23 (auditor: brief write not fd-pinned) ----------
  test("test_w44_brief_write_pinned_never_follows_symlink", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-brief-"));
    // Real file: the pinned write lands and truncates.
    const briefPath = path.join(dir, "brief.md");
    fs.writeFileSync(briefPath, "OLD-CONTENT-MUCH-LONGER");
    writeBriefPinned(briefPath, "# BRIEF\n");
    expect(fs.readFileSync(briefPath, "utf-8")).toBe("# BRIEF\n");
    // Planted symlink: the write THROWS and the VICTIM is untouched —
    // the old writeFileSync followed the link and clobbered the target.
    const victim = path.join(dir, "victim.md");
    fs.writeFileSync(victim, "victim-bytes");
    const plant = path.join(dir, "planted-brief.md");
    fs.symlinkSync(victim, plant);
    expect(() => writeBriefPinned(plant, "evil")).toThrow();
    expect(fs.readFileSync(victim, "utf-8")).toBe("victim-bytes");
  });
  // ---------- F24 (extension: wipe audit success-when-skipped) ----------
  test("test_w44_wipe_skipped_audit_not_reported_true", async () => {
    const prev = process.env.GI_OMP_ALLOW_CLEAR;
      const out = await graphProbeWipeAudited({ cwd: path.join("/nonexistent", String(Date.now())) }, (c) => c?.cwd ?? process.cwd());
    try {
      // THE FIX: a SKIPPED audit is reported as not-audited with the reason —
      // the old flow left auditNote empty on confinement failure and claimed
      // wipeAudited:true.
      expect(out.audited).toBe(false);
      expect(out.text).toContain("WIPE_AUDIT_FAILED");
    } finally {
      if (prev === undefined) delete process.env.GI_OMP_ALLOW_CLEAR; else process.env.GI_OMP_ALLOW_CLEAR = prev;
    }
  });

  // ---------- F26 (populate-corbell: unbounded edges read / nondeterministic cap) ----------
  test("test_w44_corbell_edge_cap_deterministic_across_insertion_orders", () => {
    const mkWarm = (insertionOrder: "asc" | "desc"): string => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-edgedet-"));
      const warmDir = path.join(root, ".omp", "graph-intelligence", "corbell-checkout");
      fs.mkdirSync(warmDir, { recursive: true });
      const warm = new Database(path.join(warmDir, "store.sqlite"));
      warm.exec(`CREATE TABLE typed_nodes (canonical_id TEXT, kind TEXT, label TEXT, file TEXT, line INTEGER, run TEXT, superseded_run TEXT);
CREATE TABLE typed_edges (src_canonical TEXT, dst_canonical TEXT, predicate TEXT, evidence_quote TEXT, confidence REAL, run TEXT, superseded_run TEXT);`);
      // 50,000 nodes (at the node cap) + 200,000 DISTINCT triples (over the 150k
      // edge cap), inserted in the chosen order.
      const NODES_N = 50_000;
      const EDGES_N = 200_000;
      const pad = (i: number) => `c-n${String(i).padStart(8, "0")}`;
      warm.exec("BEGIN");
      const insN = warm.prepare("INSERT INTO typed_nodes VALUES (?, 'function', ?, 'src/n.ts', 1, 'warm', NULL)");
      for (let i = 0; i < NODES_N; i++) insN.run(pad(i), `n${i}`);
      const insE = warm.prepare("INSERT INTO typed_edges VALUES (?, ?, 'calls', ?, 1.0, 'warm', NULL)");
      const order = (i: number) => insertionOrder === "asc" ? i : EDGES_N - 1 - i;
      for (let i = 0; i < EDGES_N; i++) {
        const k = order(i);
        const s = k % NODES_N;
        const d = (s * 31 + (Math.floor(k / NODES_N) + 1)) % NODES_N;
        if (s === d) continue;
        insE.run(pad(s), pad(d), `ev-${String(k).padStart(7, "0")}`);
      }
      warm.exec("COMMIT");
      warm.close();
      return root;
    };
    const survivors = (root: string): string[] => {
      const tag = root.slice(-6).toUpperCase().replace(/[^A-Z0-9]/g, "0");
      const storePath = path.join(root, "sessions", `sesDET${tag}000000`.slice(0, 24).padEnd(24, "0"), "store.sqlite");
      fs.mkdirSync(path.dirname(storePath), { recursive: true });
      const r = populateFromCorbellCheckout(storePath, root, "w44det");
      expect(r.ok).toBe(true);
      const db = new Database(storePath, { readonly: true });
      try {
        return (db.query("SELECT src_canonical || '>' || dst_canonical AS pair FROM typed_edges WHERE superseded_run IS NULL").all() as Array<{ pair: string }>).map((x) => x.pair).sort();
      } finally {
        db.close();
      }
    };
    const a = survivors(mkWarm("asc"));
    const b = survivors(mkWarm("desc"));
    expect(a.length).toBe(150_000); // cap binds
    // THE FIX: survivors are the lexicographically-first cap edges — identical
    // across insertion orders (the old row-order slice kept arbitrary rows).
    expect(a).toEqual(b);
  });

  // ---------- F27 (populate-graphify: duplicate txn guards) ----------
  test("test_w44_supersede_nested_txn_throws_single_named_code", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-txn-"));
    const storePath = path.join(root, "sessions", "sesW44TXN000000001", "store.sqlite");
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const db = new Database(storePath);
    db.exec("CREATE TABLE typed_nodes (canonical_id TEXT, kind TEXT, label TEXT, file TEXT, line INTEGER, run TEXT, superseded_run TEXT)");
    db.exec("CREATE TABLE typed_edges (src_canonical TEXT, dst_canonical TEXT, predicate TEXT, evidence_quote TEXT, confidence REAL, run TEXT, superseded_run TEXT)");
    db.exec("BEGIN IMMEDIATE");
    // THE FIX: ONE named code (GI_TXN_NESTED) — the old pair threw the
    // misleading GI_TXN_REQUIRED from a duplicate first guard.
    expect(() =>
      supersedeThenInsert(db, "w44txn", [{ canonicalId: "c-a", kind: "function", label: "a", file: "src/a.ts", line: 1, run: "w44txn" }], [], []),
    ).toThrow(/GI_TXN_NESTED/);
    db.exec("ROLLBACK");
    db.close();
  });

  // ---------- F28 (populate-graphify: double freshness walks) ----------
  test("test_w44_graphify_sidecar_short_circuits_mtime_walk", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-walk-"));
    const srcDir = path.join(root, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    for (let i = 0; i < 600; i++) fs.writeFileSync(path.join(srcDir, `f${i}.ts`), `export const v${i} = ${i};\n`);
    const graphPath = path.join(root, "graph.json");
    fs.writeFileSync(graphPath, "{}\n");
    // A VALID sidecar (the exact content hash) — the strong deterministic check.
    fs.writeFileSync(path.join(root, "graph.graph_hash"), computeSourceHashWithBudget(root, ["src"], [], 500));
    // 600 files exceed the 500 freshness budget: the mtime walk exhausts.
    // THE FIX: the sidecar check runs FIRST and proves freshness — the walk's
    // stale-budget never overrides the deterministic content verdict.
    const v = isGraphifyCheckoutFreshFor(root, graphPath, ["src"], []);
    expect(v.fresh).toBe(true);
    expect(v.reason).toBe("fresh");
  });

  // ---------- F30 (populate-graphify: absolute scope escape) ----------
  test("test_w44_absolute_scope_entry_contained_to_root", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-scope-"));
    const graphPath = path.join(root, "graph.json");
    fs.writeFileSync(graphPath, "{}\n");
    // An OUT-OF-ROOT absolute scope entry: the walk must refuse it (filesSeen
    // stays 0 → fail-closed stale-unscooped), never walk /tmp/LEAK.
    const leakDir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-LEAK-"));
    fs.writeFileSync(path.join(leakDir, "leak.ts"), "export const leak = 1;\n");
    const escaped = isGraphifyCheckoutFreshFor(root, graphPath, [leakDir], []);
    expect(escaped.fresh).toBe(false);
    expect(escaped.reason).toBe("stale-unscooped");
    // Positive control: an absolute entry INSIDE the root is legitimate.
    // (Graph file touched LAST — mtime-granularity deterministic.)
    const srcDir = path.join(root, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, "a.ts"), "export const a = 1;\n");
    const future = new Date(Date.now() + 5_000);
    fs.utimesSync(graphPath, future, future);
    const inner = isGraphifyCheckoutFreshFor(root, graphPath, [srcDir], []);
    expect(inner.fresh).toBe(true);
    expect(inner.reason).toBe("fresh");
  });

  // ---------- F32 (graphify-adapter: buildSync zero-in-scope guard) ----------
  test("test_w44_buildsync_zero_in_scope_throws_graphempty", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-bsync-"));
    fs.mkdirSync(path.join(root, "out"), { recursive: true });
    fs.writeFileSync(path.join(root, "out", "a.ts"), "export const a = 1;\n");
    // graph.json whose ONLY node is OUT OF SCOPE (scope=src, node in out/).
    const graphPath = path.join(root, "graph.json");
    fs.writeFileSync(graphPath, JSON.stringify({
      nodes: [{ id: "n1", label: "a", type: "function", file: "out/a.ts" }],
      links: [],
    }));
    const adapter = new GraphifyAdapter({ project: { root }, graph: { scope: ["src"] } } as never);
    // THE FIX: buildSync carries build()'s zero-in-scope graphEmpty — the old
    // variant silently cached zero nodes and produced an empty store.
    expect(() => adapter.buildSync(graphPath)).toThrow(/zero in-scope|graph produced zero/i);
  });

  // ---------- F34 (typed-write: blastRadius silent truncation cap) ----------
  test("test_w44_blast_radius_surfaces_truncated_flag", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-br-"));
    const storePath = path.join(root, "sessions", "sesW44BRAD0000001", "store.sqlite");
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const db = new Database(storePath);
    db.exec(`CREATE TABLE typed_nodes (canonical_id TEXT PRIMARY KEY, kind TEXT, label TEXT, file TEXT, line INTEGER, run TEXT, superseded_run TEXT);
CREATE TABLE typed_edges (src_canonical TEXT, dst_canonical TEXT, predicate TEXT, evidence_quote TEXT, confidence REAL, run TEXT, superseded_run TEXT);`);
    db.exec("BEGIN");
    const insN = db.prepare("INSERT INTO typed_nodes VALUES (?, 'function', 'big', 'src/big.ts', 1, 't', NULL)");
    for (let i = 0; i < 501; i++) insN.run(`c-big${String(i).padStart(5, "0")}`);
    const insE = db.prepare("INSERT INTO typed_edges VALUES (?, ?, 'calls', 'q', 1.0, 't', NULL)");
    for (let i = 0; i < 501; i++) insE.run(`c-root${String(i).padStart(5, "0")}`, `c-big${String(i).padStart(5, "0")}`);
    db.exec("COMMIT");
    db.close();
    const b = blastRadius(storePath, "big");
    // THE FIX: the 500-id cap SURFACES as truncated:true (whoCalls parity) —
    // the old return shape hid the under-report from programmatic callers.
    expect(b.truncated).toBe(true);
  });

  // ---------- F35 (laguna CRITICAL: write-path re-chmod silently no-op) ----------
  test("test_w44_pool_write_path_rechmod_actually_runs", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-rech-"));
    const prevDb = process.env.GO_POOL_DB;
    const prevKeys = process.env.GO_KEYS_JSON;
    process.env.GO_POOL_DB = path.join(dir, "pool.sqlite");
    process.env.GO_KEYS_JSON = JSON.stringify(["key-aaa", "key-bbb"]);
    reloadGoKeys();
    try {
      const now = Date.now();
      markGoKeyDead(0, "429 rate limit window", now); // creates the pool file
      const poolFile = process.env.GO_POOL_DB!;
      // Simulate the umask-recreation class: the pool file left world-readable.
      fs.chmodSync(poolFile, 0o644);
      // A write (markGoKeyDead) must re-harden it to 0600 — the F21-era edit
      // silently no-opped here (poolPath undeclared, swallowed best-effort).
      markGoKeyDead(1, "429 rate limit window", now);
      expect(fs.statSync(poolFile).mode & 0o777).toBe(0o600);
    } finally {
      if (prevDb === undefined) delete process.env.GO_POOL_DB; else process.env.GO_POOL_DB = prevDb;
      if (prevKeys === undefined) delete process.env.GO_KEYS_JSON; else process.env.GO_KEYS_JSON = prevKeys;
      reloadGoKeys();
    }
  });

  // ---------- F36 (populate-corbell: M05 confidence contradiction) ----------
  test("test_w44_corbell_invalid_confidence_defaults_conservative", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-conf-"));
    const warmDir = path.join(root, ".omp", "graph-intelligence", "corbell-checkout");
    fs.mkdirSync(warmDir, { recursive: true });
    const warm = new Database(path.join(warmDir, "store.sqlite"));
    warm.exec(`CREATE TABLE typed_nodes (canonical_id TEXT, kind TEXT, label TEXT, file TEXT, line INTEGER, run TEXT, superseded_run TEXT);
CREATE TABLE typed_edges (src_canonical TEXT, dst_canonical TEXT, predicate TEXT, evidence_quote TEXT, confidence REAL, run TEXT, superseded_run TEXT);
INSERT INTO typed_nodes VALUES ('c-a','function','a','src/a.ts',1,'warm',NULL);
INSERT INTO typed_nodes VALUES ('c-b','function','b','src/b.ts',2,'warm',NULL);
INSERT INTO typed_edges VALUES ('c-a','c-b','calls','q',0.7,'warm',NULL);
INSERT INTO typed_edges VALUES ('c-a','c-b','traces-to','q',NULL,'warm',NULL);
INSERT INTO typed_edges VALUES ('c-a','c-b','imports','q',99.0,'warm',NULL);`);
    warm.close();
    const storePath = path.join(root, "sessions", "sesW44CONF0000001", "store.sqlite");
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const r = populateFromCorbellCheckout(storePath, root, "w44conf");
    expect(r.ok).toBe(true);
    expect(r.edges).toBe(3);
    const db = new Database(storePath, { readonly: true });
    try {
      const rows = db.query("SELECT predicate, confidence FROM typed_edges WHERE superseded_run IS NULL ORDER BY predicate").all() as Array<{ predicate: string; confidence: number }>;
      const byPred = new Map(rows.map((x) => [x.predicate, x.confidence]));
      expect(byPred.get("calls")).toBe(0.7); // valid confidence SURVIVES (M05)
      // THE FIX: missing/invalid confidence defaults CONSERVATIVELY (0.5),
      // never 1.0 — an absent source value must not read as certainty.
      expect(byPred.get("traces-to")).toBe(0.5);
      // Out-of-range confidence (99.0 > 1.0) also clamps to the conservative default.
      expect(byPred.get("imports")).toBe(0.5);
    } finally {
      db.close();
    }
  });

  // ---------- F37 (typed-write: visitCap Infinity clamp) ----------
  test("test_w44_chain_calls_infinity_cap_terminates", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-inf-"));
    const storePath = path.join(root, "sessions", "sesW44INF00000001", "store.sqlite");
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const db = new Database(storePath);
    db.exec(`CREATE TABLE typed_nodes (canonical_id TEXT PRIMARY KEY, kind TEXT, label TEXT, file TEXT, line INTEGER, run TEXT, superseded_run TEXT);
CREATE TABLE typed_edges (src_canonical TEXT, dst_canonical TEXT, predicate TEXT, evidence_quote TEXT, confidence REAL, run TEXT, superseded_run TEXT);`);
    db.exec("BEGIN");
    const insN = db.prepare("INSERT INTO typed_nodes VALUES (?, 'function', ?, 'src/f.ts', 1, 't', NULL)");
    const insE = db.prepare("INSERT INTO typed_edges VALUES (?, ?, 'calls', 'q', 1.0, 't', NULL)");
    for (let i = 0; i < 40; i++) insN.run(`c-f${String(i).padStart(3, "0")}`, `f${i}`);
    for (let i = 0; i < 39; i++) insE.run(`c-f${String(i).padStart(3, "0")}`, `c-f${String(i + 1).padStart(3, "0")}`);
    db.exec("COMMIT");
    db.close();
    // THE FIX: visitCap=Infinity is clamped to the finite ceiling — the walk
    // terminates with the full chain (no hang, no unbounded enqueue).
    const steps = chainCalls(storePath, "f0", "NO-SUCH-TARGET", 64, Number.POSITIVE_INFINITY);
    expect(steps.truncated).toBeFalsy(); // 40 < 100000: untruncated traversal
    expect(steps.length).toBeLessThanOrEqual(40);
  });

  // ---------- F38 (populate-graphify: symlinked root base canonicalized) ----------
  test("test_w44_scope_target_survives_symlinked_root", () => {
    const real = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-base-real-"));
    const realSrc = path.join(real, "src");
    fs.mkdirSync(realSrc, { recursive: true });
    fs.writeFileSync(path.join(realSrc, "a.ts"), "export const a = 1;\n");
    // root reached THROUGH a symlink: the base must canonicalize before the
    // relative() compare — the raw-root compare read "../real/src" as escape.
    const linkRoot = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-base-link-")), "link");
    fs.symlinkSync(real, linkRoot);
    const t = containedScopeTarget(linkRoot, "src/a.ts");
    expect(t).not.toBeNull();
    // Out-of-root entry through the same link: still refused.
    const leak = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-base-leak-"));
    expect(containedScopeTarget(linkRoot, path.relative(linkRoot, leak) + "/x.ts")).toBeNull();
  });

  // ---------- F41 (populate-graphify: first-run freshness bypass) ----------
  test("test_w44_first_run_stale_graph_fails_closed", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-firstrun-"));
    const srcDir = path.join(root, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    const outDir = path.join(root, "graphify-out");
    fs.mkdirSync(outDir, { recursive: true });
    // Warm graph written FIRST (older), source touched AFTER (newer) → stale.
    const graphPath = path.join(outDir, "graph.json");
    fs.writeFileSync(graphPath, JSON.stringify({
      nodes: [{ id: "n1", label: "a", type: "function", file: "src/a.ts" }],
      links: [],
    }));
    const srcFile = path.join(srcDir, "a.ts");
    fs.writeFileSync(srcFile, "export const a = 1;\n");
    const past = new Date(Date.now() - 60_000);
    fs.utimesSync(graphPath, past, past);
    // Source strictly newer (W44 ms-precision compare needs a real delta).
    const newer = new Date(Date.now() + 5_000);
    fs.utimesSync(srcFile, newer, newer);
    // NO session store yet — the first-run path.
    const storePath = path.join(root, "sessions", "sesW44FRUN0000001", "store.sqlite");
    const r = populateSessionStore(storePath, root, "w44frun", { substrate: "graphify" });
    // THE FIX: first-run runs the SAME freshness gate — a stale graph must
    // fail closed, never seed a new store from stale data.
    // THE FIX: first-run runs the SAME freshness gate — a stale graph fails
    // closed (skipped + named fallbackReason), never seeds a new store.
    expect(r.skipped).toBe(true);
    expect(String(r.fallbackReason)).toMatch(/GRAPHIFY_NOT_WARM:stale/);
  });
});
