/**
 * ★ THE CONTAINMENT PRIMITIVE — one implementation for the whole tree.
 *
 * WHY THIS FILE EXISTS (the measured class, three audit runs in a row):
 *   Runs 6, 7 and 8 each returned criticals from the SAME family — **a guard that resolves
 *   but does not CONTAIN, or validates but does not FOLLOW**:
 *     · run 6/7  engine.ts + bug-hunt.ts  — resolved the PARENT, never the FILE (a symlink at
 *                                            the target walked straight out of the tree)
 *     · run 7    gi-session-path.ts       — `path.resolve` collapses `..` but not SYMLINKS
 *     · run 8    scan.ts + artifact-scope — the same two holes again, at new sites
 *   Per-site patching was the wrong unit of work: each fix closed ONE call site and the next
 *   run found the pattern again somewhere else. THE CLASS FIX IS ONE HELPER, called everywhere.
 *
 * THE TWO RULES THIS ENCODES (each earned by a real defect):
 *   1. **CONTAIN ON THE REAL PATH, NOT THE SPELLING.** `path.resolve` collapses `.`/`..` but
 *      follows NO symlinks. A link planted at `<root>/x` pointing at `/etc` passes every string
 *      prefix test while every read follows it out. Resolve the REAL path first.
 *   2. **A NOT-YET-EXISTING TARGET MUST STILL BE CHECKABLE.** A store/report/log usually does
 *      not exist when its path is validated. `realpathSync` throws ENOENT — and the first
 *      repair here walked up to the filesystem ROOT and returned `/`, DISCARDING the path
 *      (35 test failures). The correct resolution is the nearest EXISTING ANCESTOR realpath
 *      JOINED with the remaining segments: the containment question is about the DIRECTORY the
 *      file will be created in, which is exactly the part that can be symlinked.
 *
 * THE SHAPE CHECK AND THE CONTAINMENT CHECK ARE SEPARATE QUESTIONS. A caller's "is this path
 * shaped like X" refusal tests the caller's own SPELLING (resolved for `.`/`..`); the symlink
 * hazard is a DIFFERENT question asked against the real path. Collapsing them into one
 * resolved-string regex is what broke 35 tests. This module keeps them apart.
 */
import * as fs from "node:fs";
import * as path from "node:path";

/** The root prefix that must be matched — `'/'` needs its own form (`'//'` matches nothing). */
export function rootPrefixOf(rootReal: string): string {
  return rootReal === path.sep ? path.sep : rootReal + path.sep;
}

/** Is `real` the root itself, or under it? Caller passes an ALREADY-REAL path. */
export function insideRoot(real: string, rootReal: string): boolean {
  return real === rootReal || real.startsWith(rootPrefixOf(rootReal));
}

/**
 * The realpath of `target`, or — when it does not exist — the realpath of its nearest EXISTING
 * ancestor, re-joined with the segments that do not exist yet. NEVER returns `/` for a path
 * under a missing directory (that was the 35-failure defect): a fully-missing chain returns the
 * realpath of the highest existing ancestor joined with the rest, so the answer still NAMES the
 * path the caller asked about.
 *
 * `maxClimb` bounds the walk (default 12 — deeper than any real project nesting).
 */
export function realNearest(target: string, maxClimb = 12): string {
  const abs = path.resolve(target);
  const missing: string[] = [];
  let dir = abs;
  for (let i = 0; i <= maxClimb; i += 1) {
    try {
      const realDir = fs.realpathSync(dir);
      return missing.length === 0 ? realDir : path.join(realDir, ...missing.reverse());
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break; // the filesystem root itself is unresolvable — give up the walk
      missing.push(path.basename(dir));
      dir = parent;
    }
  }
  // nothing on the chain resolved: return the resolved spelling (loudly wrong beats silently absent)
  return abs;
}

export interface ContainmentResult {
  /** The real path the check evaluated (nearest-existing-ancestor form). */
  real: string;
  /** The real path of the resolved ROOT. */
  rootReal: string;
  /** True when `real` is the root or under it. */
  contained: boolean;
}

/**
 * THE CHECK — resolve both sides and answer containment. NEVER throws; the caller owns the
 * error vocabulary (each subsystem has its own named code: HUNT_SCOPE_INVALID,
 * SOURCE_READ_FAILED, GI_SHARED_PROJECT_STORE …). Returning the values lets the caller name
 * BOTH paths in its message, which is what makes a refusal debuggable.
 */
export function checkContained(target: string, root: string): ContainmentResult {
  const rootReal = fs.existsSync(root) ? fs.realpathSync(root) : realNearest(root);
  const real = realNearest(target);
  return { real, rootReal, contained: insideRoot(real, rootReal) };
}

/**
 * The caller-facing convenience: returns the resolved path or calls `onViolation` with the
 * evidence. Kept as a callback rather than a throw so every subsystem keeps its OWN error class
 * and code (a shared module that invents a generic error would erase the named-error vocabulary
 * the health register depends on).
 */
export function requireContained(
  target: string,
  root: string,
  onViolation: (evidence: { real: string; rootReal: string; target: string; root: string }) => never,
): string {
  const { real, rootReal, contained } = checkContained(target, root);
  if (!contained) onViolation({ real, rootReal, target, root });
  return real;
}
