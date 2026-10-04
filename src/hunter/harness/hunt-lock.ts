// PORTED FROM the archived upstream skill tree/harness/hunt-lock.ts:1-105.
// Verbatim port — node-only lock, portable as-is (no seam adaptation needed).
// BECAUSE: graph builds ran minutes-long; 30min absorbs 10x without blocking legit hunts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const STALE_LOCK_TTL_MS = 30 * 60 * 1000;

export interface HuntLockPayload {
  pid: number;
  acquiredAt: string;
  hostname: string;
}

function lockPathFor(targetPath: string): string {
  return path.join(targetPath, '.gi', 'hunt.lock');
}

// ★ F-243 NOTE (2026-09-24): NOT-A-BUG — EPERM-as-alive errs toward exclusion
//   (worst case a hunt waits; isStale bounds every hold by the 30min TTL). A
//   recycled PID owned by another user needs platform owner reads for a delay-only
//   failure — never corruption, never a false free.
function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: unknown) {
    if (e !== undefined && e !== null && typeof e === 'object' && 'code' in e) {
      const code = (e as { code: unknown }).code;
      if (code === 'ESRCH') return false;
      if (code === 'EPERM') return true;
    }
    console.warn(`[hunt-lock] isPidAlive unknown code for pid=${pid}: ${String(e)}`);
    // ★ W9-AUDIT FIX (2026-09-28): FAIL-CLOSED — an unknown error was read as "not alive",
    //   so a LIVE same-host holder was classified STALE and its lock UNLINKED (the audit's
    //   HIGH: a mutual-exclusion breach). An ambiguous probe now reads as ALIVE (never steal
    //   on an unknown failure); ESRCH alone proves death.
    return true;
  }
}

function isStale(payload: HuntLockPayload): boolean {
  const age = Date.now() - Date.parse(payload.acquiredAt);
  if (Number.isNaN(age)) return true;
  if (age > STALE_LOCK_TTL_MS) return true;
  // ★ F-342 FIX (2026-09-24): cross-host PID blindness — process.kill(pid, 0) only
  //   proves liveness in THIS host's PID namespace. A lock from another host sharing
  //   the filesystem with a colliding PID would read "alive" here. A foreign-host
  //   lock is freed by the TTL alone — never by a local PID verdict (fail-closed).
  if (typeof payload.hostname === 'string' && payload.hostname !== os.hostname()) return false;
  if (!isPidAlive(payload.pid)) return true;
  return false;
}

function readPayload(lockPath: string): HuntLockPayload | null {
  try {
    const raw = fs.readFileSync(lockPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<HuntLockPayload>;
    // ★ R15H5 FIX (2026-09-25): the old check accepted a lock with a missing /
    //   non-string hostname as valid — isStale's foreign-host guard (`typeof
    //   hostname === 'string' && ...`) and release's foreign-host refusal then
    //   skipped the fail-closed path, letting a colliding local PID free/delete
    //   another host's live lock on a shared filesystem. Require the FULL
    //   ownership triple (integer pid, parseable acquiredAt, non-empty hostname)
    //   so legacy/corrupt locks take the null-payload TTL-gated path instead.
    if (typeof parsed.pid !== 'number' || !Number.isInteger(parsed.pid) || parsed.pid <= 0) return null;
    if (typeof parsed.acquiredAt !== 'string' || Number.isNaN(Date.parse(parsed.acquiredAt))) return null;
    if (typeof parsed.hostname !== 'string' || parsed.hostname.length === 0) return null;
    return parsed as HuntLockPayload;
  } catch (e: unknown) {
    console.warn(`[hunt-lock] readPayload failed for ${lockPath}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

export function acquireHuntLock(targetPath: string): HuntLockPayload {
  const lockPath = lockPathFor(targetPath);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const payload: HuntLockPayload = {
    pid: process.pid,
    acquiredAt: new Date().toISOString(),
    hostname: os.hostname(),
  };
  try {
    fs.writeFileSync(lockPath, JSON.stringify(payload, null, 2), { flag: 'wx' });
    return payload;
  } catch (e: unknown) {
    const code = e !== undefined && e !== null && typeof e === 'object' && 'code' in e
      ? (e as { code: unknown }).code
      : undefined;
    if (code !== 'EEXIST') throw e;
    const existing = readPayload(lockPath);
    // ★ F-60 FIX (2026-09-24): a null payload (corrupted/unreadable lock) skipped
    //   stale-recovery and threw HUNT_ALREADY_RUNNING forever (a permanent block — the
    //   file could never be acquired OR released). A null payload is now treated as stale
    //   ONLY when the file is older than the TTL (a fresh-but-racing writer is never
    //   deleted); otherwise the fail-closed throw below stands.
    let stale = existing ? isStale(existing) : false;
    if (!existing) {
      try {
        const ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
        if (!Number.isNaN(ageMs) && ageMs > STALE_LOCK_TTL_MS) stale = true;
      } catch { /* stat failed: fail closed below */ }
    }
    if (stale) {
      // ★ F-61 FIX (2026-09-24): CRITICAL stale-lock race — two processes could both read
      //   the stale payload, both unlink, and the loser deletes the winner's FRESH lock
      //   (both then hold wx-created locks). Re-read before unlink (abort when the payload
      //   changed) and treat an ENOENT unlink as a lost race (throw so the caller retries
      //   instead of racing the winner through wx).
      const reread = readPayload(lockPath);
      if (existing) {
        // ★ F-342 FIX (2026-09-24): the race re-read must compare the FULL ownership
        //   triple — a cross-host lock with colliding pid+stamp but a different
        //   hostname is a DIFFERENT owner; unlinking it would delete a live peer's lock.
        if (!reread || reread.pid !== existing.pid || reread.acquiredAt !== existing.acquiredAt || reread.hostname !== existing.hostname) {
          throw new Error(`HUNT_ALREADY_RUNNING: the lock at ${lockPath} changed during stale-recovery (a peer won the race) — retry the hunt.`);
        }
      } else if (reread) {
        throw new Error(`HUNT_ALREADY_RUNNING: pid=${reread.pid} acquiredAt=${reread.acquiredAt} holds ${lockPath} — wait for it to finish or delete the stale lock.`);
      } else {
        // ★ W17-HIGH FIX (2026-09-25): the null/null path (corrupted lock, stale by
        //   mtime) reached unlinkSync with NO pre-unlink re-validation — a peer's
        //   fresh wx-created lock between the reread (above) and the unlink (below)
        //   was deleted unconditionally. Re-validate immediately before the unlink:
        //   a now-readable payload or a now-fresh mtime means a peer won the race —
        //   throw HUNT_ALREADY_RUNNING (retry the hunt) instead of unlinking.
        //   Residual (same class as the F-1022 release comment below): path locks
        //   cannot unlink atomically without an fd lock — the window is now µs
        //   (fresh2+stat → unlink adjacent), never ms.
        const fresh2 = readPayload(lockPath);
        if (fresh2) {
          throw new Error(`HUNT_ALREADY_RUNNING: pid=${fresh2.pid} acquiredAt=${fresh2.acquiredAt} holds ${lockPath} — wait for it to finish or delete the stale lock.`);
        }
        let ageMs2 = Number.NaN;
        try {
          ageMs2 = Date.now() - fs.statSync(lockPath).mtimeMs;
        } catch {
          throw new Error(`HUNT_ALREADY_RUNNING: the lock at ${lockPath} changed during stale-recovery (a peer won the race) — retry the hunt.`);
        }
        if (Number.isNaN(ageMs2) || ageMs2 <= STALE_LOCK_TTL_MS) {
          throw new Error(`HUNT_ALREADY_RUNNING: the lock at ${lockPath} changed during stale-recovery (a peer won the race) — retry the hunt.`);
        }
      }
      try {
        fs.unlinkSync(lockPath);
      } catch (err: unknown) {
        const unlinkCode = err !== undefined && err !== null && typeof err === 'object' && 'code' in err
          ? (err as { code: unknown }).code
          : undefined;
        if (unlinkCode === 'ENOENT') {
          throw new Error(`HUNT_ALREADY_RUNNING: the lock at ${lockPath} changed during stale-recovery (a peer won the race) — retry the hunt.`);
        }
        console.warn(`[hunt-lock] stale unlink failed for ${lockPath}: ${err instanceof Error ? err.message : String(err)}`);
      }
      try {
        fs.writeFileSync(lockPath, JSON.stringify(payload, null, 2), { flag: 'wx' });
        return payload;
      } catch (e2: unknown) {
        const code2 = e2 !== undefined && e2 !== null && typeof e2 === 'object' && 'code' in e2
          ? (e2 as { code: unknown }).code
          : undefined;
        if (code2 === 'EEXIST') {
          const holder2 = readPayload(lockPath);
          const holderPid = holder2?.pid ?? '?';
          const holderAt = holder2?.acquiredAt ?? '?';
          throw new Error(`HUNT_ALREADY_RUNNING: pid=${holderPid} acquiredAt=${holderAt} holds ${lockPath} — wait for it to finish or delete the stale lock.`);
        }
        throw e2;
      }
    }
    const holderPid = existing?.pid ?? '?';
    const holderAt = existing?.acquiredAt ?? '?';
    throw new Error(`HUNT_ALREADY_RUNNING: pid=${holderPid} acquiredAt=${holderAt} holds ${lockPath} — wait for it to finish or delete the stale lock.`);
  }
}

export function releaseHuntLock(targetPath: string): void {
  const lockPath = lockPathFor(targetPath);
  try {
    const existing = readPayload(lockPath);
    // ★ F-30 FIX (2026-09-24): a null payload (corrupted/unreadable lock) must NOT
    //   unlink — the old `existing && ...` fell through to unlinkSync and deleted a
    //   lock whose owner was unknown (concurrent-hunt hazard). Fail closed: keep it.
    if (!existing) {
      console.warn(`[hunt-lock] release skipped for ${lockPath}: unreadable payload (fail-closed, lock kept)`);
      return;
    }
    if (existing.pid !== process.pid) return;
    // ★ F-342 FIX (2026-09-24): never release a FOREIGN-HOST lock — the PID check
    //   above is namespace-local, so a colliding PID on this host must not unlink
    //   another host's lock. Fail closed: keep it, name the holder.
    if (typeof existing.hostname === 'string' && existing.hostname !== os.hostname()) {
      console.warn(`[hunt-lock] release skipped for ${lockPath}: held by host ${existing.hostname} (this host ${os.hostname()} — a colliding PID must not unlink a foreign lock)`);
      return;
    }
    // ★ F-831 FIX (2026-09-24): close the release TOCTOU — the payload above was read before
    //   the pid/host checks, but the TTL-stale-recovery path in acquireHuntLock may have replaced
    //   the lock between that read and this unlink. Re-read and compare the FULL ownership triple;
    //   a changed (or vanished) holder keeps its lock — fail closed, never unlink a stranger.
    const fresh = readPayload(lockPath);
    if (!fresh || fresh.pid !== existing.pid || fresh.acquiredAt !== existing.acquiredAt || fresh.hostname !== existing.hostname) {
      console.warn(`[hunt-lock] release skipped for ${lockPath}: the lock changed during release (a peer won the race) — keeping the current holder's lock`);
      return;
    }
    // ★ F-1022 FIX (2026-09-25): the F-831 re-read is NOT atomic with the unlink —
    // ★ a stale-recovery in acquireHuntLock can replace the lock in between and this
    // ★ unlink would delete the stranger's fresh lock. Narrow the window with a SECOND
    // ★ re-read immediately before the unlink, and treat ENOENT as peer-won (warn,
    // ★ keep). Residual: path locks cannot release atomically without an fd lock —
    // ★ the window is now µs, never ms, and a lost race warns instead of corrupting.
    // ★ PROBE NOTE: a lock missing at ENTRY exits earlier via the F-30 fail-closed
    // ★ null path ("unreadable payload"); the ENOENT catch below covers only the
    // ★ unlink-time race (peer deleted/replaced between fresh2 and unlinkSync).
    const fresh2 = readPayload(lockPath);
    if (!fresh2 || fresh2.pid !== existing.pid || fresh2.acquiredAt !== existing.acquiredAt || fresh2.hostname !== existing.hostname) {
      console.warn(`[hunt-lock] release skipped for ${lockPath}: the lock changed just before unlink (a peer won the race) — keeping the current holder's lock`);
      return;
    }
    try {
      fs.unlinkSync(lockPath);
    } catch (e: unknown) {
      const code = e !== undefined && e !== null && typeof e === 'object' && 'code' in e ? (e as { code: unknown }).code : undefined;
      if (code === 'ENOENT') {
        console.warn(`[hunt-lock] release skipped for ${lockPath}: the lock vanished before unlink (a peer won the race) — nothing to delete`);
        return;
      }
      throw e;
    }
  } catch (e: unknown) {
    // ★ F-1200 FIX (2026-09-25): the outer catch swallowed ALL unexpected unlink failures
    //   (EACCES, EMFILE, ENOSPC) with a warn — the caller never learned the lock leaked and
    //   every future acquireHuntLock threw HUNT_ALREADY_RUNNING indefinitely (TTL-bounded by
    //   the 30min stale-recovery, never permanent). Benign races return early above (F-30/
    //   F-342/F-831/F-1022 + ENOENT); anything reaching the inner `throw e` or this catch is
    //   unexpected — warn LOUD then re-throw so the caller (bug-hunt.ts finally) records
    //   HUNT_LOCK_RELEASE_FAILED instead of silently leaking.
    console.warn(`[hunt-lock] release failed for ${lockPath}: ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }
}

export function huntLockPath(targetPath: string): string {
  return lockPathFor(targetPath);
}
