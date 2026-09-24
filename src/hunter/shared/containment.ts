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
  // ★ F-601 FIX (2026-09-24, caught by the RESTORED ocr lane on this very file): an EMPTY
  //   root made the prefix `'/'`, and every absolute path starts with `/` — containment
  //   became VACUOUSLY TRUE. A guard that is always true is not a guard.
  if (rootReal.length === 0) throw new Error('CONTAINMENT_BAD_ROOT: rootReal must not be empty');
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
    } catch (e: unknown) {
      // ★ F-604 FIX (2026-09-24, caught by the RESTORED lane): the catch was UNTYPED — every
      //   realpathSync failure was read as "missing" and the walk climbed PAST it. EACCES
      //   (denied) and ELOOP (symlink loop) are NOT "missing": climbing past a denied dir can
      //   resolve to an ancestor that IS inside the root, silently GRANTING containment to a
      //   path that should have been refused. Only ENOENT/ENOTDIR mean absent; anything else
      //   propagates (the caller's named error vocabulary owns it).
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') throw e;
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
  /**
   * ★ F-602 (2026-09-24, caught by the RESTORED ocr lane): FALSE when the realpath walk could
   *   not resolve ANY ancestor, so `real` is the caller's unresolved spelling — a path that
   *   has NOT followed symlinks. Comparing it against a symlink-RESOLVED root can pass on a
   *   string prefix while the real path escapes. The value was always computed; it was never
   *   REPORTED. A caller that needs a hard guarantee must check this flag.
   */
  resolved: boolean;
}

/**
 * THE CHECK — resolve both sides and answer containment. NEVER throws; the caller owns the
 * error vocabulary (each subsystem has its own named code: HUNT_SCOPE_INVALID,
 * SOURCE_READ_FAILED, GI_SHARED_PROJECT_STORE …). Returning the values lets the caller name
 * BOTH paths in its message, which is what makes a refusal debuggable.
 */
export function checkContained(target: string, root: string): ContainmentResult {
  // ★ F-603 FIX (2026-09-24, the restored lane's HIGH): `existsSync(root) ? realpathSync(root)`
  //   is a TOCTOU — the dir can vanish between the two calls and realpathSync then THROWS,
  //   violating this module's "NEVER throws" contract. realpath directly; realNearest already
  //   handles a missing path, so the catch is the fallback, not a second stat.
  let rootReal: string;
  let rootResolved: boolean;
  try { rootReal = fs.realpathSync(root); rootResolved = true; }
  catch { rootReal = realNearest(root); rootResolved = false; }
  const real = realNearest(target);
  const contained = insideRoot(real, rootReal);
  // ★ F-606 FIX (2026-09-24, the restored lane): `resolved` must be FALSE exactly when the walk
  //   produced nothing — i.e. `real` is still the caller's spelling. That is true when the
  //   result equals the abs spelling AND nothing is there. (When the walk JOINS a resolved
  //   ancestor the two differ; when the path exists they agree but it IS real.)
  const targetAbs = path.resolve(target);
  const resolved = real !== targetAbs || fs.existsSync(real);
  return { real, rootReal, contained, resolved };
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
