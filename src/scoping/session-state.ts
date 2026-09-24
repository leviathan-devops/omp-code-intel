// ═══ SESSION STATE — THE SESSION-KEYED JSON LATCH (the boilerplate extraction) ═══
// TRUE SOURCE: Hydra_Wave_Manager/src/tools/wave-planning-gate.ts (the
// planning-state pattern, verified 2026-09-10) + the v6 planMtimeMs latch law.
//
// THE CONCEPT: per-session budget/coordination latches live in ONE JSON file
// under the session's SCOPED state dir (the scope-resolver's output), keyed
// by sessionId.slice(-24). Sessions on DIFFERENT codebases never share a
// file (the scope separation); sessions on the SAME codebase intentionally
// SHARE the budget (the plan is the codebase's, not the session's).
//
// THE MTIME-LATCH LAW (the v6 budget contract): an entry latches
// {plannedAt, planNote, wavesGenerated, planMtimeMs}. When the plan file's
// mtime CHANGES (the operator EDITED the plan — the documented remedy for an
// exhausted budget), wavesGenerated resets to 1 = a fresh N-wave contract.
// "A planningNote alone does NOT extend an exhausted plan."

import * as fs from 'node:fs';

export interface SessionStateEntry {
  plannedAt?: string;
  planNote?: string;
  wavesGenerated?: number;
  planMtimeMs?: number;
  [k: string]: unknown;
}

export type SessionStateMap = Record<string, SessionStateEntry>;

/** THE SESSION KEY LAW: slice(-24) — the stable tail of the session id (the
 *  source's own key derivation). */
export function sessionKey(sessionId: string): string {
  return sessionId.slice(-24);
}

export function readSessionState(statePath: string): SessionStateMap {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8')) as SessionStateMap;
  } catch {
    return {}; // absent/corrupt → empty; the latch re-arms on first record
  }
}

export function writeSessionState(statePath: string, state: SessionStateMap): void {
  const tmp = statePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, statePath); // the atomic swap — a concurrent reader never sees torn JSON
}

/** ★ F-130 FIX (2026-09-24): the read-modify-write lock. tickSessionBudget reads the
 *  state file, mutates it, writes it back — two concurrent callers both read the same
 *  snapshot, both increment, one write wins (a LOST tick). The lock serializes the RMW;
 *  the atomic tmp+rename inside writeSessionState stays. Stale-lock reclaim after 2s. */
function withStateLock<T>(statePath: string, fn: () => T): T {
  const lockPath = statePath + ".lock";
  // ★ F-135 FIX (2026-09-24): the lock carries a TOKEN; the release unlinks only if the token
  //   still matches (else a peer's reclaimed lock would be destroyed by our late release).
  const token = `${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  for (;;) {
    try { fs.writeFileSync(lockPath, token, { flag: "wx" }); break; }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      // ★ F-134 FIX (2026-09-24): a FRESH age per iteration. The old single upfront deadline meant
      //   that after the first reclaim every later EEXIST re-unlinked (mutual exclusion broken) and
      //   the deadline was never reset. Now a peer's FRESH lock (age < 2s) is never unlinked.
      let ageMs = Infinity;
      try { ageMs = Date.now() - fs.statSync(lockPath).mtimeMs; } catch { continue; /* vanished → retry */ }
      // ★ F-158 FIX (2026-09-24): 5s reclaim floor — coarse-granularity filesystems
      //   (FAT32/HFS+, 1-2s mtime resolution) truncate mtime DOWN, so a live lock
      //   can read up to ~2s older than it is; 2s risked unlinking a live peer.
      if (ageMs > 5000) { try { fs.unlinkSync(lockPath); } catch { /* a peer reclaimed first */ } continue; }
      // ★ F-136 FIX: a longer sync spin (10ms) — the shortest wait that still bounds the busy loop.
      const t = Date.now(); while (Date.now() - t < 10) { /* the sync spin (no async file-lock API) */ }
    }
  }
  try { return fn(); }
  finally {
    let holder = "";
    try { holder = fs.readFileSync(lockPath, "utf8").trim(); } catch { /* gone */ }
    if (holder === token) { try { fs.unlinkSync(lockPath); } catch { /* gone */ } }
  }
}

/** THE BUDGET TICK — the latch semantics: (1) the plan's mtime CHANGED since
 *  the entry latched → the operator edited the plan → reset wavesGenerated to
 *  1 (the fresh contract); (2) unchanged → increment; (3) no entry → create.
 *  Returns the new count. */
export function tickSessionBudget(
  statePath: string,
  sessionId: string | null,
  planMtimeMs: number,
  planNote?: string,
): number | null {
  if (!sessionId) return null;
  const key = sessionKey(sessionId);
  return withStateLock(statePath, () => {
    const state = readSessionState(statePath);
    const entry = state[key];
    if (!entry) {
      state[key] = { plannedAt: new Date().toISOString(), planNote, wavesGenerated: 1, planMtimeMs };
      writeSessionState(statePath, state);
      return 1;
    }
    if (entry.planMtimeMs !== planMtimeMs) {
      // THE MTIME LATCH: the plan changed → a fresh budget (the reset law).
      state[key] = { ...entry, plannedAt: new Date().toISOString(), planNote: planNote ?? entry.planNote, wavesGenerated: 1, planMtimeMs };
      writeSessionState(statePath, state);
      return 1;
    }
    const n = (entry.wavesGenerated ?? 0) + 1;
    state[key] = { ...entry, wavesGenerated: n, planNote: planNote ?? entry.planNote };
    writeSessionState(statePath, state);
    return n;
  });
}
