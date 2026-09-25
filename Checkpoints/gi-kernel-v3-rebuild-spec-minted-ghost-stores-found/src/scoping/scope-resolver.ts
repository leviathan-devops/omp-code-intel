// ═══ SCOPE RESOLVER — THE WORKSPACE AUTO-SCOPING (the boilerplate extraction) ═══
// TRUE SOURCE: Hydra_Wave_Manager/src/tools/wave-dispatch.ts :335-480
//   (resolveScopeRoot + scoreProjectRoots + SESSION_SCOPE_CACHE).
//
// THE OPERATOR'S LAW (verbatim, :339-340): "MAKE SURE THIS IS FULLY CLEAN.
// EVERYTHING IS PROJECT WORKSPACE SCOPED".
//
// THE THREE-TIER RESOLUTION:
//   1. EXPLICIT projectToken absolute path WINS (the strongest signal) —
//      and PINS the session's cache.
//   2. THE STICKY CACHE — a session that already resolved NEVER re-derives
//      (the flush-proof guarantee; sole exception: the cached path itself
//      vanished — see resolve() ★ F-156 (2026-09-24)). THE LAW BEHIND IT (:340-347): the
//      first extraction used a FLUSHABLE 200-part window — a run of
//      workdir-less log greps pushed the project anchors out and the
//      resolver grabbed a FOREIGN root (the live misfire: the stale
//      workspace-global spec loaded + a COUNT MISMATCH). STICKY = resolved
//      once from real project activity, NEVER re-derived mid-session.
//   3. AUTO-DETECT from the session's own file activity: the WORKDIR ANCHOR
//      (bash commands carry relative paths; the workdir field IS the project
//      anchor, weighted ×2 — the cmd-regex alone captures junk fragments),
//      then the ROOT SCORER below.
//   4. LAST RESORT — process.cwd() (never a parent-workspace hardcode).
//
// THE ROOT SCORER'S LAWS (the winner :419-433, each from a live misfire):
//   1. A root has .git, .trident (your state dir), OR package.json — but NOT
//      bare `src` (a .ts file LIVES under .../src, so src matched its own
//      ascent — the "src false-root" class).
//   2. STATE-DIR PRESENCE DOMINATES: the wave state lives in the root that
//      actually owns the state dir, even when a deeper nested sub-package
//      also matches (the monorepo class).
//   3. Among same-state candidates, the DEEPER (more specific) wins.
//   4. COLLECT EVERY root ancestor per path — a nested src/package.json must
//      not mask the outer root where the state dir lives.
//   5. PATH-AS-ROOT: a candidate may itself BE the root (the workdir anchor
//      points AT the root) — test before ascending, else a shallower
//      ancestor steals the scope.

import * as fs from 'node:fs';
import * as path from 'node:path';

/** The session-activity seam: the host's own transcript/page reader. Returns
 *  the session's tool-call inputs (command/workdir/filepath fields when
 *  present). The source reads its runtime's session stream; tests inject
 *  canned activity. */
export interface SessionActivity {
  command?: string;
  workdir?: string;
  filepath?: string | string[];
}

export type ActivityReader = (sessionId: string, limit: number) => SessionActivity[];

export interface ScopeResolverOptions {
  /** The state-dir marker that DOMINATES root selection ('.trident'). */
  stateDir: string;
  /** The session-activity reader (the seam). */
  readActivity: ActivityReader;
  /** The activity window per auto-detect pass (the source: 200 parts). */
  activityLimit?: number;
  /** The cwd last resort is captured at construction. */
  cwd?: string;
}

export class ScopeResolver {
  private readonly cache = new Map<string, string>();
  private readonly stateDir: string;
  private readonly readActivity: ActivityReader;
  private readonly activityLimit: number;
  private readonly cwd: string;

  constructor(opts: ScopeResolverOptions) {
    this.stateDir = opts.stateDir;
    this.readActivity = opts.readActivity;
    this.activityLimit = opts.activityLimit ?? 200;
    this.cwd = opts.cwd ?? process.cwd();
  }

  /** THE THREE-TIER RESOLUTION. sessionId null → explicit-or-cwd only. */
  resolve(sessionId: string | null, projectToken?: unknown): string {
    // 1) EXPLICIT absolute path wins + PINS.
    if (typeof projectToken === 'string' && projectToken.trim().length > 0) {
      const tok = projectToken.trim();
      if (fs.existsSync(tok)) {
        this.cache.set(sessionId ?? 'default', tok);
        return tok;
      }
      return this.cwd;
    }
    // 2) THE STICKY CACHE — never re-derive mid-session (★ F-156 FIX 2026-09-24:
    //   doc corrected — the existsSync guard below IS the sole exception: a
    //   vanished cached path falls through and re-pins instead of scoping
    //   state into a ghost dir).
    if (typeof sessionId === 'string' && sessionId.length > 0) {
      const cached = this.cache.get(sessionId);
      if (cached && fs.existsSync(cached)) return cached;
      // ★ F-510 FIX (2026-09-24): a vanished cached path fell through to auto-detect SILENTLY -
      // * the session could re-pin to a foreign root with no signal. Still falls through (never
      // * scope state into a ghost dir) but LOUD.
      if (cached) {
        console.warn(`[scope-resolver] cached path vanished for session ${sessionId}: ${cached} - re-detecting`);
      }
    }
    // 3) AUTO-DETECT from the session's own file activity.
    if (typeof sessionId === 'string' && sessionId.length > 0) {
      try {
        const activities = this.readActivity(sessionId, this.activityLimit);
        if (activities.length > 0) {
          const abs = new Map<string, number>();
          for (const part of activities) {
            // THE WORKDIR ANCHOR: weighted ×2 — the deliberate project anchor.
            const wd = part.workdir;
            if (typeof wd === 'string' && wd.startsWith('/') && wd.length > 3) {
              abs.set(wd, (abs.get(wd) ?? 0) + 2);
            }
            const cands = part.filepath
              ?? (part.command ? (part.command.match(/\/[^\s;]+/g) ?? []) : []);
            const list = Array.isArray(cands) ? cands : [cands];
            for (const c of list) {
              const s = String(c);
              if (!s.startsWith('/')) continue;
              // ★ F-157 FIX (2026-09-24): skip URL-shaped tokens — the match starts
              //   at the first slash, so "https://host/path" arrives as
              //   "//host/path" and poisoned the scorer with a foreign root.
              if (s.startsWith('//') || s.includes('://')) continue;
              const base = s.slice(0, s.indexOf('?') === -1 ? s.length : s.indexOf('?'));
              if (base.length < 3) continue;
              abs.set(base, (abs.get(base) ?? 0) + 1);
            }
          }
          const scored = scoreProjectRoots(abs, this.stateDir);
          if (scored) {
            // PIN THE RESOLUTION (the sticky cache).
            this.cache.set(sessionId, scored);
            return scored;
          }
        }
      // ★ F-712 FIX (2026-09-24): the bare catch swallowed EVERYTHING from
      // ★ readActivity + the scoring pipeline (permission errors, encoding faults,
      // ★ bad shapes) — a session silently fell back to cwd with no trace. The
      // ★ fallback stands, but the cause is LOUD at warn (the vanished-cache
      // ★ warning above sets the precedent).
      } catch (err) { console.warn(`[scope-resolver] auto-detect failed for session ${sessionId}:`, err); }
    }
    // 4) LAST RESORT — the current dir.
    return this.cwd;
  }
}

/** Given candidate absolute paths → the project root to scope the state dir
 *  to. The 5 selection laws in the header, each from a live misfire. */
export function scoreProjectRoots(paths: Map<string, number>, stateDir: string): string | null {
  function has(d: string, name: string): boolean {
    try { return fs.existsSync(path.join(d, name)); } catch { return false; }
  }
  function isRoot(d: string): boolean {
    return has(d, '.git') || has(d, stateDir) || has(d, 'package.json');
  }
  const candidates: Array<{ d: string; depth: number; hasState: boolean; weight: number }> = [];
  const seen = new Set<string>();
  for (const [p, w] of paths) {
    // THE PATH-AS-ROOT: test the candidate itself before ascending.
    let d = isRoot(p) ? p : path.dirname(p);
    let guard = 0;
    while (guard++ < 32 && d.length > 1) {
      if (isRoot(d) && !seen.has(d)) {
        seen.add(d);
        // ★ F-860 FIX (2026-09-24, run-11): the WEIGHT was read off the map and DISCARDED —
        //   `for (const [p] of paths)` ignored the value, so the documented "workdir ×2 — the
        //   deliberate project anchor" never influenced the choice (selection was depth-only).
        //   A candidate's weight is the MAX of the weights of the paths that named it (a root
        //   reached from the workdir anchor outranks one reached only from a filepath fragment).
        const prev = candidates.find((c) => c.d === d);
        if (prev === undefined) {
          candidates.push({ d, depth: d.replace(/\\/g, "/").split("/").length, hasState: has(d, stateDir), weight: w ?? 0 });
        } else if ((w ?? 0) > prev.weight) {
          prev.weight = w ?? 0;
        }
      }
      const up = path.dirname(d);
      if (up === d) break;
      d = up;
    }
  }
  if (candidates.length === 0) return null;
  // STATE-DIR DOMINANCE → then the WEIGHT (the deliberate anchor) → then deepest.
  const stateOwners = candidates.filter((c) => c.hasState);
  const pool = stateOwners.length > 0 ? stateOwners : candidates;
  pool.sort((a, b) => (b.weight - a.weight) || (b.depth - a.depth));
  return pool[0].d;
}
