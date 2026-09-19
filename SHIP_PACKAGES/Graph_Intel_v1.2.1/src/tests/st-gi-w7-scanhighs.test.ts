// st-gi-w7-scanhighs: frozen-scan high-tier fixes proof battery.
//   T1  goEarliestDeadIdx consumes the SAME keyid-MAX merge as readDeadUntil —
//       a stale duplicate row can no longer win the earliest-expiry hint
//   T2  markGoKeyDead deletes sibling rows carrying the same keyid (no
//       duplicate-row class after reorders)
//
// HERMETIC STATE LAW: every env this file touches is snapshotted at module
// load and RESTORED in the module afterEach — the go-key-pool singleton is
// shared process-wide, and a leak here poisons st-go-fallback's default-pool
// assertions (the W7/W8 ordering flake, root-caused 2026-09-18).
import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";

// Snapshot BEFORE any override, so afterEach can restore the machine default.
const SAVED_ENV = {
  GO_POOL_DB: process.env.GO_POOL_DB ?? null,
  GI_KEYS_FILE: process.env.GI_KEYS_FILE ?? null,
  GO_KEYS_JSON: process.env.GO_KEYS_JSON ?? null,
  OPENCODE_GO_API_KEY: process.env.OPENCODE_GO_API_KEY ?? null,
  OPENCODE_API_KEY: process.env.OPENCODE_API_KEY ?? null,
};

process.env.GO_POOL_DB = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gi-w7s-")), "pool.sqlite");
process.env.GI_KEYS_FILE = path.join(os.tmpdir(), `gi-w7s-absent-${Date.now()}`, "keys.json"); // no provision file
process.env.GO_KEYS_JSON = JSON.stringify(["w7s-key-0", "w7s-key-1", "w7s-key-2"]);
process.env.OPENCODE_GO_API_KEY = "";
process.env.OPENCODE_API_KEY = "";

import { createHash } from "node:crypto";
import { GO_KEYS, goEarliestDeadIdx, keyidFor, markGoKeyDead, reloadGoKeys } from "../src/hunter/keys/go-key-pool.ts";

const kid = (k: string): string => createHash("sha256").update(k).digest("hex").slice(0, 16);

// The hermetic pool path — re-pinned per test (afterEach restores the saved env).
const W7_POOL = process.env.GO_POOL_DB!;

afterEach(() => {
  // Restore the EXACT pre-file env (null = delete) + reload the pool from
  // the machine default sources — the next test file must see the natural
  // singleton state, never this file's hermetic overrides.
  const restore = (k: string, v: string | null): void => {
    if (v === null) delete process.env[k];
    else process.env[k] = v;
  };
  restore("GO_POOL_DB", SAVED_ENV.GO_POOL_DB);
  restore("GI_KEYS_FILE", SAVED_ENV.GI_KEYS_FILE);
  restore("GO_KEYS_JSON", SAVED_ENV.GO_KEYS_JSON);
  restore("OPENCODE_GO_API_KEY", SAVED_ENV.OPENCODE_GO_API_KEY);
  restore("OPENCODE_API_KEY", SAVED_ENV.OPENCODE_API_KEY);
  reloadGoKeys();
});

describe("st-gi-w7-scanhighs: pool keyid-merge unification", () => {
  test("test_w7_earliest_expiry_uses_merged_keyid_view", () => {
    const now = Date.now();
    const dbFile = W7_POOL;
    process.env.GO_POOL_DB = W7_POOL; // afterEach deleted the env — re-pin
    const raw = new Database(dbFile);
    raw.exec(`CREATE TABLE IF NOT EXISTS go_key_pool (idx INTEGER PRIMARY KEY, dead_until INTEGER NOT NULL DEFAULT 0, reason TEXT, marked_at INTEGER)`);
    try { raw.exec(`ALTER TABLE go_key_pool ADD COLUMN keyid TEXT`); } catch { /* exists */ }
    // key 1 (keyid kid(GO_KEYS[1])) has TWO rows: a STALE small window at idx 0
    // and the authoritative larger window at idx 1.
    raw.run("INSERT OR REPLACE INTO go_key_pool (idx, keyid, dead_until, reason, marked_at) VALUES (0, ?, ?, 'stale', ?)", [kid(GO_KEYS[1]!), now + 1_000, now]);
    raw.run("INSERT OR REPLACE INTO go_key_pool (idx, keyid, dead_until, reason, marked_at) VALUES (1, ?, ?, 'fresh', ?)", [kid(GO_KEYS[1]!), now + 5_000, now]);
    // key 2: dead until now+3_000 (single row).
    raw.run("INSERT OR REPLACE INTO go_key_pool (idx, keyid, dead_until, reason, marked_at) VALUES (2, ?, ?, 'k2', ?)", [kid(GO_KEYS[2]!), now + 3_000, now]);
    raw.close();

    const r = goEarliestDeadIdx(undefined, now);
    // OLD: the stale row (now+1000) won MIN → idx 1 with the wrong expiry hint.
    // NEW: the keyid-MAX merge (same as readDeadUntil) applies first → key 1
    // is dead until now+5000; key 2 expires at now+3000 → key 2 is earliest.
    expect(r.idx).toBe(2);
  });

  test("test_w7_mark_dead_removes_keyid_sibling_rows", () => {
    const now = Date.now();
    const dbFile = W7_POOL;
    process.env.GO_POOL_DB = W7_POOL; // afterEach deleted the env — re-pin
    const raw = new Database(dbFile);
    // Simulate a post-reorder duplicate: key 0's keyid also sits at idx 9.
    raw.run("INSERT OR REPLACE INTO go_key_pool (idx, keyid, dead_until, reason, marked_at) VALUES (9, ?, ?, 'ghost', ?)", [keyidFor(0), now + 9_000, now]);
    raw.close();
    markGoKeyDead(0, "429 rate limited", now);
    const after = new Database(dbFile);
    const rows = after.query("SELECT COUNT(*) AS n FROM go_key_pool WHERE keyid = ?").all(keyidFor(0)) as Array<{ n: number }>;
    after.close();
    expect(Number(rows[0]!.n)).toBe(1); // exactly ONE row names this key
  });
});
