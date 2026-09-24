// ═══ DB PATH — THE ENV-CHAIN RESOLVER (the boilerplate extraction) ═══
// TRUE SOURCES: Hydra_Wave_Manager/src/hydra-bus/contracts.ts (defaultDbPath,
// the 9-test-file host-DB pollution fix) + src/tools/wave-tracker.ts
// (TRACKER_DB_PATH, the BUN_TEST=1 class-kill) — the two ancestors converged
// on the same law with different shapes; this factory carries BOTH.
//
// THE RESOLUTION ORDER (the law):
//   1. an explicit dataDir argument (the caller knows best)
//   2. THE ENV CHAIN — each env var in order, first set wins
//      (the test convention sets ONE env; every reader honors the SAME env —
//      before this law, 9 test files wrote fixture rows into the REAL
//      production DB because the tracker and the store honored DIFFERENT envs)
//   3. THE TEST ISOLATION — under `bun test` (BUN_TEST=1), a dedicated test
//      file, AUTOMATICALLY: any test that touches the DB is isolated with no
//      per-file import to forget (the class-kill: a1/m1/ok1 test rows were
//      landing in the PROD db via unguarded test files)
//   4. THE PRODUCTION DEFAULT — the home dir

import * as os from 'node:os';
import * as path from 'node:path';

export interface DbPathSpec {
  /** The env chain — first set wins (order = priority). */
  envVars: string[];
  /** The production default directory (absolute, or '~/name' — expanded). */
  defaultDir: string;
  /** The DB file name inside the dir. */
  fileName: string;
  /** The dedicated test file when BUN_TEST=1 (absolute or tmp-relative). */
  testFile?: string;
}

/** THE LAZY RESOLVER — a FUNCTION, never a module-load const. THE LAW (the
 *  tracker fix): a module-load const freezes the env BEFORE the test
 *  bootstrap sets it — the lazy per-call read honors whatever the test
 *  convention set, whenever it was set. */
export function makeDbPath(spec: DbPathSpec): () => string {
  return function dbPath(): string {
    // F-855/F-856 shared tilde constants — hoisted: both branches read them.
    const TILDE = String.fromCharCode(126);
    const TILDE_SLASH = TILDE + '/';
    for (const env of spec.envVars) {
      const v = process.env[env];
      if (v && v.trim().length > 0) {
        // ★ F-939 FIX (2026-09-24): the env-var override (the highest-priority source) never
        //   tilde-expanded — `MY_DB_DIR=~/data` resolved literally to `~/data/file.db` while
        //   defaultDir/testFile expanded (SILENT mis-resolution to the wrong location). Same
        //   TILDE law as the F-855/F-856 branches (bare `~` is HOME too; missing HOME fails
        //   CLOSED with HOME_NOT_SET instead of resolving against an unpredictable cwd).
        const raw = v.trim();
        if (raw === TILDE || raw.startsWith(TILDE_SLASH)) {
          const home = process.env.HOME ?? process.env.USERPROFILE;
          if (!home) {
            throw new Error(
              `[db-path] HOME_NOT_SET: neither HOME nor USERPROFILE env var is set ` +
              `(fileName="${spec.fileName}") — cannot resolve ${env}`,
            );
          }
          return raw === TILDE ? path.join(home, spec.fileName) : path.join(home, raw.slice(2), spec.fileName);
        }
        return path.join(raw, spec.fileName);
      }
    }
    if (process.env.BUN_TEST === '1') {
      if (!spec.testFile) {
        // ★ F-131 FIX (2026-09-24): loud-fail instead of silent fallthrough. When
        //   BUN_TEST=1 but the caller forgot testFile, the resolver MUST NOT silently
        //   write to the production directory — that is exactly the 9-test-file host-DB
        //   pollution class this module exists to prevent.
        throw new Error(
          `[db-path] GI_TEST_ISOLATION_BROKEN: BUN_TEST=1 but no testFile in spec ` +
          `(fileName="${spec.fileName}") — cannot isolate from production DB`,
        );
      }
      // ★ F-413 FIX (2026-09-24): path.isAbsolute handles drive-letter/UNC — startsWith('/') misclassified Windows absolute paths as relative.
      // ★ F-856 FIX (2026-09-24): expand a tilde testFile against HOME.
      const testFile = spec.testFile;
      if (path.isAbsolute(testFile)) return testFile;
      if (testFile === TILDE || testFile.startsWith(TILDE_SLASH)) {
        const home = process.env.HOME ?? process.env.USERPROFILE;
        if (!home) {
          throw new Error(
            `[db-path] HOME_NOT_SET: neither HOME nor USERPROFILE env var is set ` +
            `(fileName="${spec.fileName}") - cannot resolve testFile`,
          );
        }
        return testFile === TILDE ? path.join(home, spec.fileName) : path.join(home, testFile.slice(2));
      }
      return path.join(os.tmpdir(), testFile);
    }
    let dir = spec.defaultDir;
    // ★ F-855 FIX (2026-09-24): bare tilde is HOME too.
    if (dir === TILDE || dir.startsWith(TILDE_SLASH)) {
      // ★ F-355 FIX (2026-09-24): the '.' fallback silently resolved the production DB
      //   relative to an unpredictable cwd when neither HOME nor USERPROFILE is set
      //   (containers/CI) — the exact silent-pollution class this module exists to
      //   prevent. Fail CLOSED with the named error, matching GI_TEST_ISOLATION_BROKEN.
      const home = process.env.HOME ?? process.env.USERPROFILE;
      if (!home) {
        throw new Error(
          `[db-path] HOME_NOT_SET: neither HOME nor USERPROFILE env var is set ` +
          `(fileName="${spec.fileName}") — cannot resolve defaultDir`,
        );
      }
      dir = path.join(home, dir.slice(2));
    }
    return path.join(dir, spec.fileName);
  };
}
