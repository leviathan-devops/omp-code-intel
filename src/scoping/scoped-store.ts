// ═══ SCOPED STORE — THE SHARED MASTER DB (the boilerplate extraction) ═══
// TRUE SOURCE: v4.4.2-wave-manager-async/Checkpoints/wave-manager-generate-
//   SHIP-APPROVED-v6/src/tools/wave-db.ts (167L) — verified line-level by
//   the master-db-race desk (every anchor below is the v6 line).
//
// THE 8-SESSION LAW (the winner wave-tracker.ts:182-194, verbatim): "the
// JSON read-modify-write COLLIDES across processes — each process loads the
// whole file + rewrites it on mutation → process A's persist clobbers B's
// rows and vice versa. THE FIX: SQLITE with WAL + the busy timeout +
// ROW-KEYED UPSERTS — each process upserts ITS wave's row (the wave primary
// key); the SQLite locking serializes the writers (one at a time, the busy
// timeout waits) — NO whole-file rewrite, NO lost rows."
//
// R2 (wave-db.ts:4): "CLEAN ORGANIZED SQLITE DB — the DB is the only writer,
// NO JSON fallback, NO dual-write" — the dual-write IS the race.
//
// THE LIFETIME: cached singleton → SELECT-1 health → close-on-sick → fresh
// open (WAL + busy_timeout=5000) → ensureSchema (CREATE IF NOT EXISTS + the
// 3-attempt retry with the busy re-arm) → CREATE + WAL run ONCE per process.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Database } from 'bun:sqlite';

export interface ScopedStoreOptions {
  /** The resolved DB file path (from db-path.ts's makeDbPath). */
  dbPath: string;
  /** The CREATE TABLE IF NOT EXISTS statements — run ONCE per process. */
  schema: string[];
  /** The id for the logs. */
  id?: string;
}

let storeDb: Database | null = null;
let storeDbPath: string | null = null;

/** THE PATH-AWARE CACHED SINGLETON: one connection per process per resolved
 *  path. Every reuse health-checks (SELECT 1); a sick handle closes + reopens.
 *  A repointed path closes the old handle first. WAL + busy_timeout on every
 *  fresh open. The schema runs ONCE per process (CREATE IF NOT EXISTS is
 *  idempotent — the 7-process simultaneous first-open race is dead by
 *  construction), with the 3-attempt busy retry. */
export function getStoreDb(opts?: ScopedStoreOptions): Database {
  if (!opts && storeDb) return storeDb; // the common path: no re-spec, healthy
  const want = opts?.dbPath ?? storeDbPath;
  if (!want) throw new Error('[scoped-store] no dbPath: pass opts.dbPath on the first call');
  if (storeDb && storeDbPath === want) {
    try {
      storeDb.query('SELECT 1').get();
      return storeDb;
    } catch (_sick) {
      try { storeDb.close(); } catch (_c) { /* already closed */ }
      storeDb = null;
    }
  }
  if (storeDb) {
    try { storeDb.close(); } catch (_c) { /* already closed */ }
    storeDb = null;
  }
  fs.mkdirSync(path.dirname(want), { recursive: true });
  const fresh = new Database(want, { create: true });
  try {
    fresh.exec('PRAGMA journal_mode = WAL;');
    fresh.exec('PRAGMA busy_timeout = 5000;');
  } catch (_nonfatal) { /* some filesystems refuse WAL — non-fatal */ }
  if (opts?.schema?.length) {
    // THE SCHEMA-SETUP RACE REMEDY: idempotent DDL + the 3-attempt busy
    // retry with the busy_timeout re-arm (the winner wave-db.ts:19-73).
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        for (const stmt of opts.schema) fresh.run(stmt);
        break;
      } catch (e) {
        if (attempt === 2) {
          console.error(`[scoped-store${opts.id ? ' ' + opts.id : ''}] schema setup failed after 3 attempts:`, e instanceof Error ? e.message : String(e));
          break; // boot continues; downstream fails WARN-soft (the v6 behavior)
        }
        try { fresh.exec('PRAGMA busy_timeout = 5000;'); } catch { /* re-arm best-effort */ }
      }
    }
  }
  storeDb = fresh;
  storeDbPath = want;
  return storeDb;
}

export function closeStoreDb(): void {
  if (storeDb) {
    try { storeDb.close(); } catch (_c) { /* already closed */ }
    storeDb = null;
    // THE LAST-KNOWN-PATH LAW: the path SURVIVES the close — a no-opts
    // getStoreDb() reopens at the same path (the v6 const-path behavior,
    // generalized). Only an explicit repoint changes it.
  }
  // ★ F-537 FIX (2026-09-24): the in-flight async-open gate survived close — a later getStoreDbAsync reused the resolved gate and returned a stale/closed handle. Close clears every pending gate so the next open starts fresh.
  storeOpenInFlightByPath.clear();
}

/** ★ F-288 FIX (2026-09-24): the in-flight open guard. getStoreDb is a
 *  check-then-act singleton (check health/path -> close -> reopen); two async callers
 *  interleaved across an await (the sleeps in runWithRetry / withImmediateTx) could both
 *  observe a sick/null handle and open TWICE, orphaning one handle (a leaked fd + WAL
 *  lock contention). Concurrent callers now share ONE pending open: the first sets
 *  storeOpenInFlight synchronously, the rest await it. Async callers (runWithRetry,
 *  withImmediateTx) enter through here; sync upsertRow keeps getStoreDb (the open itself
 *  is synchronous — the guard covers the await-interleave window). */
// ★ F-419 FIX (2026-09-24): key the in-flight gate by dbPath — the old shared gate returned
//   the wrong handle when two different dbPaths opened concurrently.
const storeOpenInFlightByPath = new Map<string, Promise<Database>>();
export async function getStoreDbAsync(opts?: ScopedStoreOptions): Promise<Database> {
  if (!opts && storeDb) {
    try {
      storeDb.query('SELECT 1').get();
      return storeDb;
    } catch (_sick) { /* fall through to the shared open below */ }
  }
  const want = opts?.dbPath ?? storeDbPath;
  const existingGate = want ? storeOpenInFlightByPath.get(want) : null;
  if (existingGate) return existingGate;
  let resolveOpen!: (db: Database) => void;
  let rejectOpen!: (e: unknown) => void;
  const gate = new Promise<Database>((res, rej) => { resolveOpen = res; rejectOpen = rej; });
  if (want) storeOpenInFlightByPath.set(want, gate);
  try {
    const db = getStoreDb(opts);
    resolveOpen(db);
    return db;
  } catch (e) {
    rejectOpen(e);
    throw e;
  } finally {
    const k = want ?? '';
    if (storeOpenInFlightByPath.get(k) === gate) storeOpenInFlightByPath.delete(k);
  }
}

/** THE ROW-KEYED UPSERT HELPER — the anti-clobber write. Each process upserts
 *  ITS row (the PK); the SQLite locking serializes the writers. NO whole-file
 *  rewrite exists in this module. */
export function upsertRow(table: string, pkColumn: string, pk: string | number, dataJson: string, extra?: Record<string, string | number>): void {
  // ★ F-129 FIX (2026-09-24): identifier validation. The single caller passes literals,
  //   but interpolating identifiers into SQL is a footgun — refuse anything that is not
  //   a bare SQL identifier (defense-in-depth, no behavior change for the literal caller).
  const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
  if (!IDENT.test(table) || !IDENT.test(pkColumn)) throw new Error(`[scoped-store] GI_SQL_IDENT_REFUSED: ${table}.${pkColumn}`);
  const cols = extra ? Object.keys(extra) : [];
  for (const c of cols) if (!IDENT.test(c)) throw new Error(`[scoped-store] GI_SQL_IDENT_REFUSED: ${c}`);
  const placeholders = ['?', '?', ...cols.map(() => '?')];
  const updates = ['data = excluded.data', ...cols.map((c) => `${c} = excluded.${c}`)];
  const sql = `INSERT INTO ${table} (${pkColumn}, data${cols.length ? ', ' + cols.join(', ') : ''}) VALUES (${placeholders.join(', ')})
    ON CONFLICT(${pkColumn}) DO UPDATE SET ${updates.join(', ')}`;
  getStoreDb().run(sql, [pk, dataJson, ...cols.map((c) => (extra as Record<string, string | number>)[c])]);
}

/** THE WRITE-RETRY LADDER (the winner wave-tracker.ts:218-234): 3 attempts;
 *  busy/locked → close the (stale) handle + sleep 50×(n+1)ms + retry; after
 *  the last: WARN — the in-memory state stays live, the caller decides.
 *  ★ F-208 FIX (2026-09-24): returns TRUE on success, FALSE after exhausted
 *  retries — the old void swallow left callers unable to detect silent loss.
 *  ★ F-285 FIX (2026-09-24): async sleep — the old sync busy-wait
 *  `while(Date.now()<until)` blocked the event loop; same setTimeout pattern
 *  withImmediateTx uses. Async: no live callers in-tree (grep: def+export only).
 *  ★ F-286 FIX (2026-09-24): busy/locked-gated close+retry — a non-busy error
 *  rethrows LOUD without closing the healthy singleton (the old close-on-ANY
 *  error dropped a good handle on e.g. a constraint violation, then retried
 *  a deterministic failure 3×). */
export async function runWithRetry(sql: string, params: (string | number | null)[], attempts = 3, id = ''): Promise<boolean> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      (await getStoreDbAsync()).run(sql, params as never);
      return true;
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!/busy|locked/i.test(msg)) throw e; // non-busy → LOUD immediately, handle untouched
      closeStoreDb();
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
    }
  }
  console.error(`[scoped-store${id ? ' ' + id : ''}] persist failed after ${attempts} attempts (the in-memory state stays live):`, lastErr instanceof Error ? lastErr.message : String(lastErr));
  return false;
}

/** THE IMMEDIATE TRANSACTION (the winner wave-db.ts:103-127) — for the
 *  multi-row read-modify-write the row-UPSERT cannot cover. BEGIN IMMEDIATE
 *  grabs the write lock upfront; busy/locked → ROLLBACK + close + sleep +
 *  retry 3×; non-busy → rethrow LOUD. */
export async function withImmediateTx<T>(fn: (db: Database) => T, attempts = 3, id = ''): Promise<T> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const db = await getStoreDbAsync();
      db.exec('BEGIN IMMEDIATE;');
      try {
        const result = fn(db);
        db.exec('COMMIT;');
        return result;
      } catch (e) {
        try {
          db.exec('ROLLBACK;');
        } catch (_r) {
          // ★ F-538 FIX (2026-09-24): a failed ROLLBACK left the connection broken but cached — every later op failed mysteriously while the caller only saw the original error. The dead handle is now closed + evicted (LOUD warn), so the next op reopens fresh.
          console.error(`[scoped-store${id ? ' ' + id : ''}] ROLLBACK failed — evicting the dead handle:`, _r instanceof Error ? _r.message : String(_r));
          try { db.close(); } catch { /* best effort */ }
          if (storeDb === db) storeDb = null;
        }
        throw e;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/busy|locked/i.test(msg)) throw e; // non-busy → LOUD immediately
      lastErr = e;
      closeStoreDb();
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
    }
  }
  throw new Error(`[scoped-store${id ? ' ' + id : ''}] the transaction failed after ${attempts} attempts: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
}
