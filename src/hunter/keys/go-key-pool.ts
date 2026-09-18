// PORTED FROM fork-v143 live-tree/graph-intelligence/keys/go-key-pool.ts (259L) — the sqlite cycler, zero key literals, env-driven (NEWEST of 3 copies; NEVER port the C copy with literals)
// Ported 2026-09-14 (port wave W3-P1/P2). 2026-09-15: 6-KEY UPGRADE + OPENROUTER-ONLY FALLBACK (operator order; see §FALLBACK below). Verbatim bytes otherwise; do not edit in place without re-diffing the source.
// ═══ GO KEY POOL — THE 6-KEY OPENCODE-GO CYCLER (the boilerplate extraction) ═══
// TRUE SOURCE: v4.4.3-PWM-merged/Checkpoints/paragon-cache-autopsy-cleaned/
//   src/tools/aether/go-key-pool.ts (the 5-key sqlite version, FR-5, 2026-08-30;
//   go-4/go-5 added 2026-09-06 per the operator: "2 more keys"; go-6 added
//   2026-09-15 per the operator: 6th key appended to ~/.gi-keys.json).
// THE PIN (the operator's ruling 2026-09-08): muse-spark-1.3-contributor —
//   "everything is now muse 1.3" (the ancestors' 1.2-contributor is stale).
//
// THE WHOLE MACHINE: N keys (GO_KEYS.length, currently 6), one deadUntil row each, skip the dead ones.
// State = go_key_pool rows in a sqlite DB (the FR-5 migration 2026-08-30: the
// cross-process read-modify-write race is dead; sqlite's write lock replaces
// the file lock). Every session on this machine shares one pool — a key a
// sibling process proved rate-limited is skipped by everyone until its window
// passes. deadUntil is DATA: the timeout is parsed from the error the key
// itself returned (the "Resets in Xhr Ymin" leader; 5h/day/week/month keyword
// fallbacks; unknown → re-probe in 1h) and the key re-enters the line when
// Date.now() passes it. No timers, no cron, no maintenance. A stray success
// clears a stale timeout (markGoKeyAlive).
// AP-4: the rows carry INDEXES, never keys; the logs carry go-1..go-N (N = GO_KEYS.length).
// GRACE LAW: a DB hiccup degrades to ALL-ALIVE (the cycler keeps cycling —
// a pool-storage failure must never kill an LLM call); the loud-throw class
// belongs to the CALLER'S gate, not this module.
//
// PLUG-IN CONTRACT: this extraction is SELF-CONTAINED — the ancestor imported
// the host's getWaveDb(); the boilerplate ships its own tiny store (the same
// table shape) so the file drops into any bun project. Point GO_POOL_DB at
// your project's existing sqlite to share the pool machine-wide.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { Database } from 'bun:sqlite';

// ═══ CONFIG — the three names you rebrand when plugging in ═══
export const POOL_PREFIX = 'GO';

// THE KEYS (order = priority) — ZERO LITERALS (the operator's ruling 2026-09-12:
// "fully protected env vars but the system should be 100% functional out of the
// box w/ 0 bs"). The pool populates ONCE at module load, in precedence order:
//   1. GO_KEYS_JSON          — a JSON string array (the env override)
//   2. ~/.gi-keys.json       — the gitignored key file (0600), provisioned ONCE
//                              by scripts/provision-keys.sh ({"keys": ["sk-…", …]})
//   3. OPENCODE_GO_API_KEY / OPENCODE_API_KEY — the single-key pool (rotation
//                              degenerates to 1 rung — still functional)
// An EMPTY pool is NOT silent: every consumer's probe/chain fails LOUD with the
// provisioning remedy (AETHER_API_UNREACHABLE / GENERATION_FAILED), and the
// key-free machinery (graph-query, the gate, the verbs) never touches this file.
export const GO_KEYS: string[] = [];

// THE PROVISION FILE — the default well-known path (the key never enters source
// or chat; the file is 0600 and gitignored by provision-keys.sh).
export function giKeysFile(): string {
  if (process.env.GI_KEYS_FILE) return process.env.GI_KEYS_FILE;
  return path.join(os.homedir(), '.gi-keys.json');
}

export function reloadGoKeys(): void {
  GO_KEYS.length = 0;
  const push = (k: unknown) => {
    if (typeof k === 'string' && k.length > 0 && !GO_KEYS.includes(k)) GO_KEYS.push(k);
  };
  // 1. the env override
  if (process.env.GO_KEYS_JSON) {
    try {
      const p = JSON.parse(process.env.GO_KEYS_JSON) as unknown;
      if (Array.isArray(p)) p.forEach(push);
    } catch { /* malformed GO_KEYS_JSON → ignored, never trusted (the documented contract) */ }
  }
  // 2. the provisioned key file
  try {
    const parsed = JSON.parse(fs.readFileSync(giKeysFile(), 'utf-8')) as { keys?: unknown };
    if (Array.isArray(parsed.keys)) parsed.keys.forEach(push);
  } catch { /* no file → fall through */ }
  // 3. the single env key (the auth.json derivation / the container's staged key)
  const single = process.env.OPENCODE_GO_API_KEY ?? process.env.OPENCODE_API_KEY;
  if (single) push(single);
}
reloadGoKeys();

// THE STORE — GO_POOL_DB env points at an existing project DB to share the
// machine-wide pool; default = a dedicated file in tmp (still shared across
// processes via the same path). BUN_TEST isolates to tmpdir.
// SESSION PINNING (the x-opencode update): each session pins its OWN pool
// file so concurrent sessions never share writer state (the F-34 shared-file
// corruption class) and never inherit a sibling's deadUntil fate. Precedence:
// GO_POOL_DB (the explicit/test override) > BUN_TEST (hermetic tmp) > the
// session-pinned file > the shared default. sanitizeSessionScope mirrors the
// wave-spec.ts:31-37 pattern: strip -> collapse -> trim -> slice(0,64).
export function sanitizeSessionScope(sessionId: string): string {
  return sessionId.trim().replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64) || 'default';
}

// V21 W10 (identity of the pool): ONE machine-wide DB — the session-pinned
// shard is GONE. The header contract ("a key a sibling proved rate-limited is
// skipped by everyone") is now true by construction; sessionId args remain in
// signatures for compatibility but no longer change the store location.
export function goPoolDbFile(sessionId?: string): string {
  void sessionId;
  if (process.env.GO_POOL_DB) return process.env.GO_POOL_DB;
  if (process.env.BUN_TEST) return path.join(os.tmpdir(), 'go-key-pool-test.sqlite');
  return path.join(os.tmpdir(), '.go-key-pool.sqlite');
}

// THE CACHED SINGLETON (the source's getWaveDb pattern, wave-db.ts:105-118):
// one connection per PROCESS per resolved path — a SELECT-1 health check on
// the cached handle, close-on-sick + reopen, WAL + busy_timeout=5000 on every
// fresh open. The handle is keyed to the RESOLVED PATH: a host (or a test
// suite) that repoints GO_POOL_DB gets the new pool, not the stale handle.
// The first extraction opened a NEW Database per call (an fd leak); this is
// the source's lifetime, path-aware.
const poolDbByPath = new Map<string, Database>();
const POOL_DB_LRU_MAX = 8;

function db(sessionId?: string): Database {
  const want = goPoolDbFile(sessionId);
  const hit = poolDbByPath.get(want);
  if (hit) {
    try {
      hit.query('SELECT 1').get();
      // W9 (frozen-scan HIGH): SQLite can RECREATE -wal/-shm on later
      // checkpoints with the process umask — re-chmod on every cached hit.
      try {
        fs.chmodSync(want, 0o600);
        for (const side of [want + '-wal', want + '-shm']) {
          if (fs.existsSync(side)) fs.chmodSync(side, 0o600);
        }
      } catch { /* best-effort */ }
      poolDbByPath.delete(want);
      poolDbByPath.set(want, hit);
      return hit;
    } catch (_sick) {
      try { hit.close(); } catch { /* already closed */ }
      poolDbByPath.delete(want);
    }
  }
  // W12+13 (frozen-scan HIGH): pre-create 0600 with O_EXCL|O_NOFOLLOW —
  // atomic first-create that (a) never inherits the umask window, (b) REFUSES
  // a pre-planted symlink (ELOOP) instead of following it, (c) races cleanly
  // (EEXIST = another opener won; open r+w and chmod for our handle).
  const openFlags = fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR | fs.constants.O_NOFOLLOW;
  try {
    fs.closeSync(fs.openSync(want, openFlags, 0o600));
  } catch (e) {
    const c = e as NodeJS.ErrnoException;
    if (c.code === "ELOOP") {
      // W16 (frozen-scan HIGH): ELOOP = pre-planted SYMLINK — refuse loudly.
      // The old branch chmod+opened THROUGH the plant (redirect target).
      throw new Error(`GO_POOL_SYMLINK: ${want} is a symlink plant — refusing (remove it or set GO_POOL_DB)`);
    }
    if (c.code !== "EEXIST") throw e;
    // EEXIST = a real file already exists: verify it is not a symlink
    // (lstat does not follow) and harden its mode for our handle.
    const lst = fs.lstatSync(want);
    if (lst.isSymbolicLink()) throw new Error(`GO_POOL_SYMLINK: ${want} is a symlink plant — refusing`);
    try { fs.chmodSync(want, 0o600); } catch { /* not ours */ }
  }
  const fresh = new Database(want, { create: true });
  try { fs.chmodSync(want, 0o600); } catch (_umask) { /* fs may already restrict */ }
  try {
    fresh.exec('PRAGMA journal_mode = WAL;');
    fresh.exec('PRAGMA busy_timeout = 5000;');
  } catch (_nonfatal) { /* an in-memory/tmp db may refuse WAL — non-fatal */ }
  // P1.1.4 (W1 gi-resource): the -wal/-shm sidecars exist from the WAL pragma
  // onward — chmod them explicitly (they usually inherit the main file's mode,
  // but the contract is 0600-unconditional, not inheritance-luck).
  for (const side of [want + '-wal', want + '-shm']) {
    try { if (fs.existsSync(side)) fs.chmodSync(side, 0o600); } catch { /* best-effort */ }
  }
  fresh.run(`CREATE TABLE IF NOT EXISTS go_key_pool (
    idx INTEGER PRIMARY KEY,
    dead_until INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    marked_at INTEGER
  )`);
  // V21 cleanup: stable key identity — a KEYID (one-way fingerprint) column so
  // a reload/reorder can never misattribute a deadUntil row to the wrong key.
  // C5 (qwen d5d5c883 [5]): keyid is sha256(key).slice(0,16) — the old
  // reversible slice(0,12) prefix contradicted the AP-4 never-keys contract
  // (world-readable tmp sqlite) AND collapsed every `sk-ant-…` key to one id.
  // W9: legacy rows are NOT positionally backfilled (see the comment below
  // the ALTER) — keyid-less rows stay readable via byIdx only.
  try {
    fresh.run(`ALTER TABLE go_key_pool ADD COLUMN keyid TEXT`);
  } catch (_dup) { /* column exists */ }
  // W9 (frozen-scan HIGH fixed): NO positional keyid backfill. A legacy
  // keyid-NULL row's idx says nothing about WHICH key died after any
  // reload/reorder — backfilling by position permanently misattributes the
  // exile. Legacy rows stay keyid-NULL and remain readable through the
  // byIdx fallback in mergedDeadViews(); the next markGoKeyDead for a slot
  // writes a correctly-keyed row that supersedes them.
  poolDbByPath.set(want, fresh);
  while (poolDbByPath.size > POOL_DB_LRU_MAX) {
    const oldest = poolDbByPath.keys().next();
    if (oldest.done) break;
    try { poolDbByPath.get(oldest.value)?.close(); } catch (_c) { /* already closed */ }
    poolDbByPath.delete(oldest.value);
  }
  return fresh;
}

export function goKeyLabel(idx: number): string {
  return POOL_PREFIX.toLowerCase() + '-' + (idx + 1);
}

// C5: one-way fingerprint — a leaked keyid no longer reveals key material,
// and distinct keys no longer share one id (the `sk-ant-…` collapse class).
// Legacy rows carrying a 12-char plaintext prefix can never equal a 16-hex
// fingerprint, so they fall through to the idx match (same as keyid NULL).
export function keyidFor(idx: number): string {
  const k = GO_KEYS[idx];
  return k ? createHash('sha256').update(k).digest('hex').slice(0, 16) : '';
}

function readDeadUntil(sessionId?: string): number[] {
  try {
    const rows = db(sessionId).query('SELECT idx, keyid, dead_until FROM go_key_pool').all() as Array<{ idx: number; keyid: string | null; dead_until: number }>;
    // V21 cleanup: KEYID-first resolution — marks follow the KEY, not the
    // positional slot, across reloads/reorders. Legacy rows (keyid NULL, or a
    // pre-C5 12-char plaintext prefix that can never equal a 16-hex
    // fingerprint) still match by idx.
    // C6b + W7: the ONE keyid-MAX merge (shared helper below) — readDeadUntil
    // AND goEarliestDeadIdx both consume it, so the earliest-expiry hint can
    // never disagree with the per-key dead-state.
    const { byKeyid, byIdx } = mergedDeadViews(rows);
    return GO_KEYS.map((k, i) => {
      const kid = createHash('sha256').update(k).digest('hex').slice(0, 16);
      if (byKeyid.has(kid)) return byKeyid.get(kid) as number;
      const legacy = byIdx.get(i);
      return typeof legacy === 'number' ? legacy : 0;
    });
  } catch (e) {
    console.error('[go-key-pool] read degraded to all-alive:', e instanceof Error ? e.message : String(e));
    return GO_KEYS.map(() => 0);
  }
}

// W7 (frozen-scan HIGH fixed): the ONE keyid-MAX merge — readDeadUntil AND
// goEarliestDeadIdx both consume this view, so the earliest-expiry hint can
// never disagree with the per-key dead-state (the old raw-row MIN in
// goEarliestDeadIdx let a stale duplicate row win the hint).
function mergedDeadViews(rows: Array<{ idx: number; keyid: string | null; dead_until: number }>): { byKeyid: Map<string, number>; byIdx: Map<number, number> } {
  const byKeyid = new Map<string, number>();
  for (const r of rows) {
    if (typeof r.keyid !== 'string' || r.keyid.length === 0) continue;
    const prev = byKeyid.get(r.keyid);
    if (prev === undefined || r.dead_until > prev) byKeyid.set(r.keyid, r.dead_until);
  }
  const byIdx = new Map<number, number>();
  for (const r of rows) {
    if (typeof r.idx !== 'number') continue;
    // The positional view serves LEGACY rows only: keyid-NULL OR the pre-C5
    // 12-char plaintext prefix (never a 16-hex fingerprint — those are keyed
    // rows and belong to their key, not to whoever now sits at that idx).
    // W13 (frozen-scan HIGH): pre-C5 rows were invisible to BOTH views before
    // this — readDeadUntil's comment promised idx-match they never got.
    if (typeof r.keyid === 'string' && (r.keyid.length === 16 && /^[0-9a-f]{16}$/.test(r.keyid))) continue;
    const prev = byIdx.get(r.idx);
    if (prev === undefined || r.dead_until > prev) byIdx.set(r.idx, r.dead_until);
  }
  return { byKeyid, byIdx };
}

// THE ONLY DECISION: is this key's timeout still running?
export function goKeyDead(idx: number, now: number = Date.now(), sessionId?: string): boolean {
  return (readDeadUntil(sessionId)[idx] ?? 0) > now;
}

// THE TIMEOUT, parsed from the error the key itself returned. (THE ISE NOTE:
// this regex ladder is a MECHANICAL DETECTOR over a free-text error body, not
// a decision system — the provider's window name arrives as prose and there
// is nothing structural to match on. The decision is the comparison in
// goKeyDead — timestamp > now. A PatternFamily/AST here would be ceremony.)
const GO_WINDOW_MIN_MS = 60_000;
const GO_WINDOW_MAX_MS = 30 * 24 * 3_600_000;

export function parseGoWindowMs(err: string): number {
  // THE PRECISE SIGNAL FIRST (live-proven 2026-08-30: GoUsageLimitError says
  // "Weekly usage limit reached. Resets in 14hr 37min" — the reset time IS
  // the actual timeout; the keyword class is the fallback, never the leader).
  // V21 W10: hr-dialect coverage (hours/hrs/h) + EVERY return clamped to
  // [1 minute, 30 days] — never a sub-minute hot-cycle, never a lost key.
  const clamp = (ms: number): number => Math.min(Math.max(ms, GO_WINDOW_MIN_MS), GO_WINDOW_MAX_MS);
  const resetHrMin = err.match(/resets? in\s*(\d+)\s*(?:hours?|hrs?|h)\b(?:\s*(\d+)\s*min)?/i);
  if (resetHrMin) return clamp((Number(resetHrMin[1]) * 60 + Number(resetHrMin[2] ?? '0')) * 60_000);
  const resetMin = err.match(/resets? in\s*(\d+)\s*min(?!\s*hour)/i);
  if (resetMin) return clamp(Number(resetMin[1]) * 60_000);
  // C6 (qwen d5d5c883 [6]): `seconds?` first — the old `(?:sec|secs|second|s)\b`
  // never matched the `seconds` plural (`second`+`s` has no boundary after
  // `second`; `sec`+`onds` has none either), so `Resets in 30 seconds` fell
  // through to the 1h unknown default.
  const resetSec = err.match(/resets? in\s*(\d+)\s*(?:seconds?|secs?|s)\b/i);
  if (resetSec) return clamp(Number(resetSec[1]) * 1000);
  const resetDays = err.match(/resets? in\s*(\d+)\s*days?/i);
  if (resetDays) return clamp(Number(resetDays[1]) * 24 * 3_600_000);
  // V21 cleanup: precise weeks/months resets (the keyword fallback only knew
  // bare 'weekly'/'monthly' — 'Resets in 2 weeks' fell to unknown-1h).
  const resetWeeks = err.match(/resets? in\s*(\d+)\s*weeks?/i);
  if (resetWeeks) return clamp(Number(resetWeeks[1]) * 7 * 24 * 3_600_000);
  const resetMonths = err.match(/resets? in\s*(\d+)\s*months?/i);
  if (resetMonths) return clamp(Number(resetMonths[1]) * 30 * 24 * 3_600_000);
  if (/\b5\s*-?\s*hours?\b|\bhourly\b/i.test(err)) return clamp(5 * 3_600_000);
  if (/\bdaily\b|\bper[-\s]?day\b/i.test(err)) return clamp(24 * 3_600_000);
  if (/\bweekly\b|\bper[-\s]?week\b/i.test(err)) return clamp(7 * 24 * 3_600_000);
  if (/\bmonthly\b|\bper[-\s]?month\b/i.test(err)) return clamp(30 * 24 * 3_600_000);
  return clamp(3_600_000); // unknown 429 → re-probe in 1h (re-arms longer on the next window name)
}

// H19 (qwen 33d64eca): key material must never hit the (world-readable) tmp
// sqlite. Redact sk-/Bearer/api-key patterns BEFORE the reason slice persists.
export function redactKeyMaterial(err: string): string {
  return String(err ?? "")
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]{8,}/gi, 'Bearer [REDACTED]')
    .replace(/(x-?api-key\s*[:=]\s*)\S+/gi, '$1[REDACTED]')
    // V21 W10: JSON/header key shapes the first pass missed.
    .replace(/"(?:api_?key|token|authorization)\s*"\s*:\s*"[^"]{6,}"/gi, '"api_key":"[REDACTED]"')
    .replace(/(api_?key|token)\s*[:=]\s*[A-Za-z0-9._-]{8,}/gi, '$1=[REDACTED]');
}

// THE DEAD-MARK — persists the window + the REASON (the 300-char error slice)
// + marked_at: the audit trail (who died, why, when) rides in the row.
export function markGoKeyDead(idx: number, err: string, now: number = Date.now(), sessionId?: string): number {
  if (!Number.isInteger(idx) || idx < 0 || idx >= GO_KEYS.length) return now;
  const msg = String(err ?? '');
  const until = now + parseGoWindowMs(msg);
  try {
    const conn = db(sessionId);
    // W7/W8 (frozen-scan HIGH): DELETE-siblings + UPSERT ride ONE transaction —
    // two autocommit statements left a window where the key owned zero rows.
    conn.exec('BEGIN IMMEDIATE;');
    try {
      conn.run('DELETE FROM go_key_pool WHERE keyid = ? AND idx != ?', [keyidFor(idx), idx]);
      conn.run(
        `INSERT INTO go_key_pool (idx, keyid, dead_until, reason, marked_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(idx) DO UPDATE SET keyid = excluded.keyid, dead_until = excluded.dead_until, reason = excluded.reason, marked_at = excluded.marked_at`,
        [idx, keyidFor(idx), until, redactKeyMaterial(msg).slice(0, 300), now],
      );
      conn.exec('COMMIT;');
      // W9 (frozen-scan HIGH): SQLite can recreate -wal/-shm at the process
      // umask on later checkpoints — re-chmod the trio after every write,
      // not only on fresh opens (the cache-hit chmod only runs at db() entry).
      try {
        const poolPath = goPoolDbFile(sessionId);
        fs.chmodSync(poolPath, 0o600);
        for (const side of [poolPath + '-wal', poolPath + '-shm']) {
          if (fs.existsSync(side)) fs.chmodSync(side, 0o600);
        }
      } catch { /* best-effort */ }
    } catch (inner) {
      try { conn.exec('ROLLBACK;'); } catch { /* already rolled back */ }
      throw inner;
    }
  } catch (e) {
    // V21 cleanup: a failed write returns 0 — the caller knows NO exile was
    // persisted (the old return `until` falsely signalled an exile that the
    // next readDegraded-to-all-alive would contradict anyway).
    console.error('[go-key-pool] markGoKeyDead write FAILED (no exile persisted):', e instanceof Error ? e.message : String(e));
    return 0;
  }
  return until;
}
export function markGoKeyAlive(idx: number, now: number = Date.now(), sessionId?: string): boolean {
  if (!Number.isInteger(idx) || idx < 0 || idx >= GO_KEYS.length) return false;
  try {
    // W9 (frozen-scan HIGH): clear by KEYID (keyid-first parity with the
    // dead-mark/reads) — the positional clear hit the WRONG key after a
    // reload/reorder, resurrecting a dead sibling instead.
    // W12 (frozen-scan HIGH): the OR-idx arm revives LEGACY keyid-NULL rows
    // — the keyid-only UPDATE never matched them, so readDeadUntil (byIdx
    // fallback) kept reporting a dead key that markGoKeyAlive could not clear.
    const r = db(sessionId).run(
      'UPDATE go_key_pool SET dead_until = 0 WHERE dead_until > ? AND (keyid = ? OR (keyid IS NULL AND idx = ?))',
      [now, keyidFor(idx), idx],
    );
    return r.changes > 0;
  } catch (e) {
    console.error('[go-key-pool] markGoKeyAlive write failed:', e instanceof Error ? e.message : String(e));
    return false;
  }
}

// THE OBSERVABILITY LINE — per-key state for the [chain] logs + the loud
// fail. Carries LABELS, never keys (AP-4).
export function goPoolSnapshot(now: number = Date.now(), sessionId?: string): string {
  // V21 cleanup: ONE read feeds the snapshot; non-finite values clamp to
  // alive (a corrupt row can no longer throw RangeError out of toISOString).
  const MAX_DATE_MS = 8_640_000_000_000; // Date range ceiling — beyond this toISOString throws
  return readDeadUntil(sessionId).map((until, i) => {
    // V21 cleanup fix-now: finite AND within the Date range — 1e20 passed the
    // old isFinite check and threw RangeError out of toISOString.
    const sane = typeof until === 'number' && Number.isFinite(until) && until > now && until <= MAX_DATE_MS;
    return sane
      ? goKeyLabel(i) + ' dead until ' + new Date(until).toISOString()
      : goKeyLabel(i) + ' ok';
  }).join(' · ');
}

// ═══ THE ERROR CLASSIFIER (mirrored from the boilerplate canon 2026-09-13:
// the §6 pool-accounting contract as ONE tested function) ═══
// 'quota' → dead-mark · 'rejected' → dead-mark · 'contract' (400
// MissingSessionID) → NEVER dead-mark · 'other' → never mark. Contract beats
// quota beats rejected; status codes word-boundaried (see the canon).
export type GoErrorClass = 'quota' | 'rejected' | 'contract' | 'other' | 'server';

export function classifyGoError(err: string): GoErrorClass {
  const e = String(err ?? '');
  // V21 W10: ORDERED classifier — server (500-504) BEFORE quota, so a 503
  // body containing "overloaded" can never exile a key as quota; 529 stays
  // quota (capacity window); no regex overlap remains between classes.
  if (/MissingSessionID/i.test(e)) return 'contract';
  if (/\b50[0-4]\b|internal server error|bad gateway|service unavailable|gateway timeout/i.test(e)) return 'server';
  if (/\b529\b/i.test(e)) return 'quota';
  if (/GoUsageLimitError|usage limit|quota|rate limit|\b429\b|\b402\b/i.test(e)) return 'quota';
  // V21 cleanup: bare 'overloaded' (no 529/429 code) is transient capacity —
  // short re-probe (server class), never a 1h quota exile.
  if (/overloaded/i.test(e)) return 'server';
  if (/\b401\b|\b403\b|invalid_api_key|invalid x-api-key|unauthorized/i.test(e)) return 'rejected';
  return 'other';
}

// ═══ THE EARLIEST-EXPIRY RESOLVER + INDEX RESOLVER (mirrored from the canon
// 2026-09-13 — consumers must import these, never re-declare the SELECT) ═══
export function goEarliestDeadIdx(sessionId?: string, now: number = Date.now()): { idx: number; expiryKnown: boolean; dropped: number } {
  // C7 + W7 (frozen-scan HIGH fixed): the hint consumes the SAME keyid-MAX
  // merge as readDeadUntil — a stale duplicate row can no longer win the
  // earliest-expiry slot with a window the merged view has already superseded.
  try {
    const rows = db(sessionId).query('SELECT idx, keyid, dead_until FROM go_key_pool').all() as Array<{ idx: number; keyid: string | null; dead_until: number }>;
    const { byKeyid, byIdx } = mergedDeadViews(rows);
    let dropped = 0;
    let best = -1;
    let bestUntil = Number.MAX_SAFE_INTEGER;
    let seen = 0;
    GO_KEYS.forEach((k, i) => {
      const kid = createHash('sha256').update(k).digest('hex').slice(0, 16);
      const merged = byKeyid.get(kid) ?? byIdx.get(i);
      if (typeof merged !== 'number' || !Number.isFinite(merged)) return;
      // An EXPIRED mark (dead_until <= now) means the key is alive again —
      // it does not compete for earliest-expiry.
      if (merged <= now) return;
      seen++;
      if (merged < bestUntil) { bestUntil = merged; best = i; }
    });
    return { idx: best, expiryKnown: seen > 0, dropped };
  } catch {
    return { idx: -1, expiryKnown: false, dropped: 0 };
  }
}

export function resolveGoKeyIndex(now: number = Date.now(), sessionId?: string): { idx: number; alive: boolean; expiryKnown: boolean } {
  // W13 (frozen-scan HIGH): the low-level API fails LOUD on an empty pool —
  // the old idx:-1 fallthrough made callers believe in a nonexistent key.
  if (GO_KEYS.length === 0) throw new Error('GO_POOL_EMPTY: no Go keys configured (provision ~/.gi-keys.json or set GO_KEYS_JSON)');
  const untils = readDeadUntil(sessionId);
  for (let i = 0; i < GO_KEYS.length; i++) {
    if ((untils[i] ?? 0) <= now) return { idx: i, alive: true, expiryKnown: true };
  }
  const r = goEarliestDeadIdx(sessionId, now);
  return { idx: r.idx, alive: false, expiryKnown: r.expiryKnown };
}
// LAW (verbatim operator constraint): ONLY OPENROUTER. DO NOT WIRE INFERX OR
// NVIDIA IN THE CHAIN. Mechanics = the ORIGINAL fallback chain mechanics from
// the free-key-pipeline boilerplate (KNOWLEDGE_LIBRARY/
// agent_plugin_boilerplates/free-key-pipeline-boilerplate): per-call
// retry+fall (transport-chain.ts:116-260 — ledger skip gate + anyOk escape,
// RETRY_ATTEMPTS per rung, RETRY_BACKOFF on retryable, STALL fall-fast after
// ONE retry, RATE-LIMIT fall with shared 45s exile, DEGENERATE-done routes to
// the next rung, LOUD END full-shape error event, never silence).
// CHAIN SHAPE HERE (2 rungs, go-first):
//   RUNG 1 — Go pool: cycle GO_KEYS[0..N) via resolveGoKeyIndex (skip dead);
//     quota (429/usage-limit) → markGoKeyDead + NEXT KEY, same rung retry
//     until EVERY key dead in this call; contract (400 MissingSessionID) →
//     NEVER dead-mark, walk the rungs (proxy §6 contract); rejected
//     (401/403) → dead-mark + next key; other → next key, no mark.
//   RUNG 2 — OpenRouter poolside laguna s2.1 free (openrouter/poolside/
//     laguna-s-2.1:free): fires ONLY when EVERY Go key is dead in this call
//     (resolveGoKeyIndex().alive === false). Key = OPENROUTER_API_KEY env
//     (auth.json openrouter entry derivation; NEVER in source/AP-4: the
//     snapshot line carries the rung LABEL + fingerprint prefix, never key).
// NO other rung exists: no inferx, no nvidia, no zen-free tier. A second
// fallback rung is a spec violation, not an improvement.
export const FALLBACK_MODEL_OPENROUTER = 'openrouter/poolside/laguna-s-2.1:free';
export const FALLBACK_PROVIDER_OPENROUTER = 'openrouter';
//
// THE FALLBACK DECISION (pure, tested): given the Go resolver outcome, do we
// stay on Go or fall to OpenRouter? Go-alive → rung 1 with that index.
// Go-all-dead → rung 2 (openrouter), carrying the earliest-expiry hint.
export interface GoFallbackDecision {
  rung: 'go' | 'openrouter';
  goIndex: number;
  goAlive: boolean;
  reason: string;
}
export function decideGoFallback(now: number = Date.now(), sessionId?: string): GoFallbackDecision {
  if (GO_KEYS.length === 0) throw new Error("GO_POOL_EMPTY: no Go keys configured (provision ~/.gi-keys.json or set GO_KEYS_JSON) — refusing silent OpenRouter fallthrough");
  const r = resolveGoKeyIndex(now, sessionId);
  if (r.alive) return { rung: 'go', goIndex: r.idx, goAlive: true, reason: 'go-' + (r.idx + 1) + '-alive' };
  const lbl = r.idx >= 0 ? 'go-' + (r.idx + 1) : 'go-unknown';
  // W13 note: goIndex === -1 on the openrouter rung is a DOCUMENTED marker
  // (no go key exists to name) — consumers branch on rung, never on goIndex.
  return { rung: 'openrouter', goIndex: r.idx, goAlive: false, reason: 'all-go-dead→openrouter (earliest-expiry ' + lbl + ')' };
}
//
// THE FALLBACK ERROR ROUTER (proxy §6 accounting contract, per-attempt):
// quota → markGoKeyDead(idx) + ADVANCE (same rung); contract → NO mark, walk
// rungs (tier-1 fix, never a pool fault); rejected → markGoKeyDead(idx) +
// advance; other → advance without mark. Returns the action the caller takes.
export type GoFallbackAction = 'advance-same-rung' | 'fall-to-openrouter' | 'walk-rungs-no-mark' | 'advance-no-mark';
export function routeGoError(idx: number, err: string, now: number = Date.now(), sessionId?: string): GoFallbackAction {
  const cls = classifyGoError(err);
  if (cls === 'contract') return 'walk-rungs-no-mark';
  // H18: 'server' (5xx) = transient provider fault → advance, NO dead-mark,
  // NO window (the next call re-probes the key immediately).
  if (cls === 'server') return 'advance-no-mark';
  if (cls === 'quota' || cls === 'rejected') {
    // W9 (frozen-scan HIGH): a 0 from markGoKeyDead means NO exile was
    // persisted (write failed) — advancing the same rung would hammer the
    // still-rate-limited key; fall to the router instead.
    if (markGoKeyDead(idx, err, now, sessionId) === 0) return 'fall-to-openrouter';
    // P1.1.6 (W1 gi-resource): an EMPTY pool makes decideGoFallback throw
    // GO_POOL_EMPTY — routeGoError must answer a NAMED action, never throw:
    // with zero keys there is nothing to advance to → fall-to-openrouter.
    let next: GoFallbackDecision;
    try {
      next = decideGoFallback(now, sessionId);
    } catch {
      return 'fall-to-openrouter';
    }
    return next.rung === 'go' ? 'advance-same-rung' : 'fall-to-openrouter';
  }
  return 'advance-no-mark';
}
//
// THE FALLBACK SNAPSHOT (AP-4: labels + fingerprint prefix, NEVER key material).
export function goFallbackSnapshot(now: number = Date.now(), sessionId?: string): string {
  try {
    const d = decideGoFallback(now, sessionId);
    return goPoolSnapshot(now, sessionId) + ' · fallback=' + d.rung + '(' + d.reason + ')';
  } catch {
    return goPoolSnapshot(now, sessionId) + ' · fallback=unknown(pool-empty)';
  }
}
