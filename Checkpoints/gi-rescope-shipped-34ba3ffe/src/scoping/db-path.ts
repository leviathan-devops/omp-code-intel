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
    for (const env of spec.envVars) {
      const v = process.env[env];
      if (v && v.trim().length > 0) return path.join(v.trim(), spec.fileName);
    }
    if (process.env.BUN_TEST === '1' && spec.testFile) {
      return spec.testFile.startsWith('/')
        ? spec.testFile
        : path.join(os.tmpdir(), spec.testFile);
    }
    let dir = spec.defaultDir;
    if (dir.startsWith('~/')) {
      dir = path.join(process.env.HOME ?? process.env.USERPROFILE ?? '.', dir.slice(2));
    }
    return path.join(dir, spec.fileName);
  };
}
