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
  const deadline = Date.now() + 2000;
  let fd: number;
  for (;;) {
    try { fd = fs.openSync(lockPath, "wx"); break; }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      if (Date.now() > deadline) { try { fs.unlinkSync(lockPath); } catch { /* gone */ } }
      const t = Date.now(); while (Date.now() - t < 3) { /* the sync spin (no async file-lock API) */ }
    }
  }
  try { return fn(); }
  finally { try { fs.closeSync(fd); } catch { /* closed */ } try { fs.unlinkSync(lockPath); } catch { /* gone */ } }
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
