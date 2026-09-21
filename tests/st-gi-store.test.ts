// st-gi-store — WAVE 1 GATE: the store gains the six-layer namespacing (T-1),
// the ledgers exist (T-2), and the two live defects die: the constant
// confidence (B1 / SC-6) and silent staleness (B3 / SC-7).
//
// ADVERSARIAL-FIRST: every property is asserted by the case that would FAIL if
// the property were removed — the fail-closed base, the absent populated_at,
// the blanket-prefix corpus. The happy path is the LAST confirmation.
import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { sessionStorePath } from "../src/scoping/gi-session-path.ts";
import {
  DERIVATION_BASE,
  applyTypedDdl,
  deriveConfidence,
  derivationOf,
  insertForkEdge,
  layerFreshness,
  layerOf,
  migrateLayerColumns,
  openTypedStore,
  storeFreshness,
  TYPED_STORE_DDL,
} from "../src/omp/typed-write.ts";

// The canonical path builder — the guard requires /sessions/{8..24 chars}/
// store.sqlite, so the fixture uses the SAME constructor production uses and
// cannot drift from the contract it must satisfy.
let seq = 0;
function tmpStore(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "gi-store-"));
  seq += 1;
  return sessionStorePath(d, `sidtest${String(seq).padStart(4, "0")}`);
}

describe("st-gi-store: W1 — the store + the live-defect kills", () => {
  // ── T-1: the six-layer namespacing ────────────────────────────────────────
  test("t1_layer_id_present_on_both_tables", () => {
    const p = tmpStore();
    const db = openTypedStore(p);
    try {
      const cols = (t: string): string[] =>
        (db.query(`PRAGMA table_info(${t})`).all() as Array<{ name: string }>).map((r) => r.name);
      expect(cols("typed_nodes")).toContain("layer_id");
      expect(cols("typed_edges")).toContain("layer_id");
      expect(cols("typed_edges")).toContain("derivation");
    } finally {
      db.close();
    }
  });

  test("t1_layer_of_reads_the_canonical_prefix", () => {
    expect(layerOf("graphify:src_omp_typed_write")).toBe("graphify");
    expect(layerOf("corbell:foo")).toBe("corbell");
    // ADVERSARIAL: an un-prefixed id has NO layer — null, never a guess.
    expect(layerOf("bare_symbol")).toBeNull();
  });

  test("t1_migration_upgrades_a_pre_v2_store_and_backfills", () => {
    const p = tmpStore();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const db = new Database(p);
    try {
      // a PRE-V2 store: the old DDL, no layer_id/derivation anywhere
      db.run(`CREATE TABLE typed_nodes (id INTEGER PRIMARY KEY, canonical_id TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, file TEXT, line INTEGER, created_run TEXT NOT NULL, superseded_run TEXT)`);
      db.run(`CREATE TABLE typed_edges (id INTEGER PRIMARY KEY, src_canonical TEXT NOT NULL, dst_canonical TEXT NOT NULL, predicate TEXT NOT NULL, evidence_quote TEXT NOT NULL, confidence REAL NOT NULL DEFAULT 1.0, created_run TEXT NOT NULL, superseded_run TEXT)`);
      db.run(`INSERT INTO typed_nodes (canonical_id,kind,label,created_run) VALUES ('graphify:a','Function','a','r1')`);
      db.run(`INSERT INTO typed_edges (src_canonical,dst_canonical,predicate,evidence_quote,created_run) VALUES ('corbell:x','corbell:y','calls','explicit: calls quiet','r1')`);
      const mig = migrateLayerColumns(db);
      expect(mig.added).toContain("typed_nodes.layer_id");
      expect(mig.added).toContain("typed_edges.derivation");
      const n = db.query("SELECT layer_id FROM typed_nodes WHERE canonical_id='graphify:a'").get() as { layer_id: string };
      const e = db.query("SELECT layer_id FROM typed_edges WHERE src_canonical='corbell:x'").get() as { layer_id: string };
      expect(n.layer_id).toBe("graphify");   // backfilled from the prefix
      expect(e.layer_id).toBe("corbell");
      // idempotent: a second run adds nothing
      expect(migrateLayerColumns(db).added).toHaveLength(0);
    } finally {
      db.close();
    }
  });

  // ── SC-6 / B1: the constant confidence is DEAD ────────────────────────────
  test("sc6_derivation_varies_by_predicate_the_core_kill", () => {
    // The live corpus writes the blanket prefix 'explicit:' on ALL 2714 edges,
    // so the prefix alone yields ONE class. The predicate is the honest
    // discriminator — and these two are the case that proves it.
    const ev = "explicit: calls in source a->b @ f.ts:1";
    expect(derivationOf(ev, "calls")).toBe("inferred");      // resolved, not read
    expect(derivationOf(ev, "imports")).toBe("explicit");    // the statement IS the edge
    const c1 = deriveConfidence(ev, { predicate: "calls" }).confidence;
    const c2 = deriveConfidence(ev, { predicate: "imports" }).confidence;
    expect(c1).toBeLessThan(c2);
    expect(c1).toBe(DERIVATION_BASE["inferred"]);
    expect(c2).toBe(DERIVATION_BASE["explicit"]);
  });

  test("sc6_distinct_confidence_values_over_one_mixed_corpus", () => {
    const p = tmpStore();
    const db = openTypedStore(p);
    try {
      const run = "r1";
      const rows: Array<[string, string, string]> = [
        ["graphify:a", "graphify:b", "imports"],
        ["graphify:c", "graphify:d", "calls"],
        ["graphify:e", "graphify:f", "implements"],
        ["graphify:g", "graphify:h", "declares"],
        ["graphify:i", "graphify:j", "calls"],
      ];
      for (const [src, dst, pred] of rows) {
        insertForkEdge(p, {
          srcCanonical: src, dstCanonical: dst, predicate: pred,
          evidence: `explicit: ${pred} in source ${src}->${dst} @ f.ts:1`, run,
        });
      }
      const n = db.query("SELECT COUNT(DISTINCT confidence) AS n FROM typed_edges").get() as { n: number };
      // The B1 assertion: a constant would give 1. The derived field gives >1.
      expect(n.n).toBeGreaterThan(1);
      const byDeriv = db.query("SELECT derivation, COUNT(*) AS n FROM typed_edges GROUP BY derivation").all() as Array<{ derivation: string; n: number }>;
      expect(byDeriv.length).toBeGreaterThan(1);
    } finally {
      db.close();
    }
  });

  test("sc6_known_bad_absent_prefix_fails_closed_never_1_0", () => {
    // ADVERSARIAL / the known-bad fixture: a writer supplying a prefix we do
    // not recognise and an unknown predicate MUST NOT be upgraded to certainty.
    const r = deriveConfidence("no-prefix here at all", { predicate: "mystery_relation" });
    expect(r.derivation).toBe("unknown");
    expect(r.confidence).toBe(DERIVATION_BASE["unknown"]);
    expect(r.confidence).toBeLessThan(1.0);   // the exact B1 failure shape
  });

  // ── SC-7 / B3: staleness is first-class ───────────────────────────────────
  test("sc7_absent_populated_at_is_stale_by_construction", () => {
    const p = tmpStore();
    const db = openTypedStore(p);
    try {
      const f = layerFreshness(db);
      expect(f.stale).toBe(true);
      expect(f.code).toBe("GI_LAYER_STALE:explicit");
      expect(f.populatedAt).toBeNull();
    } finally {
      db.close();
    }
  });

  test("sc7_ttl_zero_makes_any_prior_populate_stale", () => {
    const p = tmpStore();
    const db = openTypedStore(p);
    try {
      // populated 5s in the past: fresh under a 60s TTL, stale under a 0ms TTL.
      // (The boundary matters: `age > ttl` means a populate in the SAME
      //  millisecond as the read is not stale even at ttl=0 — asserted below.)
      db.run("INSERT OR REPLACE INTO gi_meta (key,value) VALUES ('populated_at', ?)", [new Date(Date.now() - 5_000).toISOString()]);
      const fresh = layerFreshness(db, { ttlMs: 60_000 });
      expect(fresh.stale).toBe(false);
      expect(fresh.code).toBeNull();
      const stale = layerFreshness(db, { ttlMs: 0 });   // any real age ⇒ stale
      expect(stale.stale).toBe(true);
      expect(stale.code).toBe("GI_LAYER_STALE:explicit");
      // the boundary, stated rather than assumed
      db.run("INSERT OR REPLACE INTO gi_meta (key,value) VALUES ('populated_at', ?)", [new Date(Date.now() + 1_000).toISOString()]);
      expect(layerFreshness(db, { ttlMs: 0 }).stale).toBe(false);
    } finally {
      db.close();
    }
  });

  test("sc7_store_freshness_on_a_real_path", () => {
    const p = tmpStore();
    const db = openTypedStore(p);
    db.run("INSERT OR REPLACE INTO gi_meta (key,value) VALUES ('populated_at', ?)", [new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString()]);
    db.close();
    const f = storeFreshness(p, { ttlMs: 24 * 3600 * 1000 });  // 40d old, 1d ttl
    expect(f.stale).toBe(true);
    expect(f.ageMs).toBeGreaterThan(24 * 3600 * 1000);
  });

  // ── T-2 + the surviving invariants ────────────────────────────────────────
  test("t2_ledger_tables_and_the_partial_index_survive", () => {
    const p = tmpStore();
    const db = openTypedStore(p);
    try {
      // the one-live-row invariants the migration must not disturb
      expect(db.query("SELECT 1 FROM sqlite_master WHERE type='index' AND name='uq_tn_live_canonical'").get()).toBeTruthy();
      expect(db.query("SELECT 1 FROM sqlite_master WHERE type='index' AND name='uq_te_live_triple'").get()).toBeTruthy();
      expect(db.query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='graph_gate_state'").get()).toBeTruthy();
      // the DDL is the single source of truth for the shape under test
      expect(TYPED_STORE_DDL.some((d) => d.includes("layer_id"))).toBe(true);
    } finally {
      db.close();
    }
  });

  test("t2_apply_typed_ddl_is_idempotent_on_an_existing_store", () => {
    const p = tmpStore();
    const db = openTypedStore(p);
    try {
      applyTypedDdl(db);
      applyTypedDdl(db);   // must not throw, must not duplicate
      const t = db.query("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('typed_nodes','typed_edges','gi_meta','graph_gate_state')").get() as { n: number };
      expect(t.n).toBe(4);
    } finally {
      db.close();
    }
  });
});
