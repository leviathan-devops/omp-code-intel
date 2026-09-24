// GI-OMP master registry — one machine-wide sqlite, WAL, row UPSERTs.
// NO JSON fallback. NO dual-write. AP-4 / T-2.

import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import {
  closeStoreDb,
  getStoreDb,
  makeDbPath,
  upsertRow,
} from "../scoping/index.ts";
export const GI_REGISTRY_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS gi_sessions (
    session_id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}',
    scope_root TEXT NOT NULL,
    store_path TEXT NOT NULL,
    opened_at TEXT NOT NULL
  )`,
  // ★ F-344 FIX (2026-09-24): findGiSessionByStorePath filters on store_path (called
  //   twice per openSessionStore) but only session_id was indexed — every lookup was
  //   a full table scan. CREATE IF NOT EXISTS keeps this idempotent for live DBs.
  `CREATE INDEX IF NOT EXISTS idx_gi_sessions_store_path ON gi_sessions(store_path)`,
];

const resolveRegistryPath = makeDbPath({
  envVars: ["GI_OMP_DB_DIR"],
  defaultDir: "~/.omp/graph-intelligence",
  fileName: "registry.sqlite",
  testFile: path.join(os.tmpdir(), "gi-omp-registry-test.sqlite"),
});

export function giRegistryPath(): string {
  if (!process.env.GI_OMP_DB_DIR) {
    // ★ F-GR1 FIX (2026-09-24): the '.test.'/'_test_' substring checks false-positive
    //   in production (e.g. /opt/myapp/integration-test-runner/bin/app) and silently
    //   routed PROD traffic to the tmp test DB. Only the repo's own test-file prefix
    //   remains as a fallback below.
    const argv1 = process.argv[1] ?? "";
    // ★ F-GR1 FIX (2026-09-24) + F-14 (2026-09-24): the '.test.'/'_test_' substrings
    //   false-positive in prod (e.g. /opt/myapp/integration-test-runner/bin/app) — dropped.
    //   But in a batch run argv1 is the FIRST glob file (e.g. st-artifact-coverage.test.ts),
    //   so 'st-gi-omp' alone missed most tests and the wipe test read the PROD path. The
    //   repo's own test dir + prefix (/tests/st-) is the precise signal: it matches EVERY
    //   test file here, never a prod binary path.
    // ★ F-710 FIX (2026-09-24): the old primary signal `BUN_TEST === "1"` NEVER fires —
    // ★ PROBED live (bun 1.4.2 `bun test`: BUN_TEST *and* BUN_TEST_PID are both
    // ★ unset; only BUN_INSTALL is present), so isolation rested SOLELY on the argv1
    // ★ fallback below. The signal is now the UNION of every known runner marker
    // ★ (BUN_TEST, BUN_TEST_PID for runners that do set them, argv1 prefix) — a
    // ★ future Bun that sets either env keeps isolating; today argv1 carries it.
    const inTestContext = process.env.BUN_TEST != null
      || process.env.BUN_TEST_PID != null
      || argv1.includes("/tests/st-");
    if (inTestContext) {
      return path.join(os.tmpdir(), "gi-omp-registry-test.sqlite");
    }
  }
  return resolveRegistryPath();
}

export function openGiRegistry(): Database {
  return getStoreDb({
    dbPath: giRegistryPath(),
    schema: GI_REGISTRY_SCHEMA,
    id: "gi-omp",
  });
}

// ★ F-709 FIX (2026-09-24): the old upsert hardcoded data='{}' — re-registering a
// ★ session (reconnect, multi-phase open) silently WIPED its persisted metadata via
// ★ ON CONFLICT DO UPDATE. Callers that hold session state now pass it through;
// ★ callers that don't keep the old '{}' default (store-open.ts passes 3 fields).
export function upsertGiSession(row: {
  sessionId: string;
  scopeRoot: string;
  storePath: string;
  data?: string;
}): void {
  openGiRegistry();
  upsertRow("gi_sessions", "session_id", row.sessionId, row.data ?? "{}", {
    scope_root: row.scopeRoot,
    store_path: row.storePath,
    opened_at: new Date().toISOString(),
  });
}

export function findGiSession(sessionId: string): {
  session_id: string;
  scope_root: string;
  store_path: string;
} | null {
  const db = openGiRegistry();
  const hit = db.query(
    "SELECT session_id, scope_root, store_path FROM gi_sessions WHERE session_id = ?",
  ).get(sessionId) as
    | { session_id: string; scope_root: string; store_path: string }
    | null
    | undefined;
  return hit ?? null;
}

export function findGiSessionByStorePath(storePath: string): {
  session_id: string;
  scope_root: string;
  store_path: string;
} | null {
  const db = openGiRegistry();
  const hit = db.query(
    "SELECT session_id, scope_root, store_path FROM gi_sessions WHERE store_path = ?",
  ).get(storePath) as
    | { session_id: string; scope_root: string; store_path: string }
    | null
    | undefined;
  return hit ?? null;
}

export function giSessionCount(): number {
  const db = openGiRegistry();
  const row = db.query("SELECT COUNT(*) AS n FROM gi_sessions").get() as { n: number };
  return Number(row.n);
}

export class GiClearError extends Error {
  readonly code = "GI_CLEAR_REFUSED";
  constructor(message: string) {
    super(message);
    this.name = "GiClearError";
  }
}

/** AP-8: tests that wiped prod DB. Production wipe is env-gated. */
export function clearGiRegistry(): void {
  if (process.env.GI_OMP_ALLOW_CLEAR !== "1") {
    throw new GiClearError(
      "GI_CLEAR_REFUSED: set GI_OMP_ALLOW_CLEAR=1 to wipe the registry (never default)",
    );
  }
  const db = openGiRegistry();
  db.run("DELETE FROM gi_sessions");
}

// ★ F-818 FIX (2026-09-24): BLAST-RADIUS CONTRACT — closeStoreDb() closes the
//   process-wide scoping singleton (scoped-store.ts holds ONE cached handle for the
//   current path), NOT just the registry. Any live handle from getStoreDb (e.g. an
//   ongoing openSessionStore) is invalidated — later use reopens via the SELECT-1
//   health check, but in-flight statements can hit SQLITE_MISUSE. Call ONLY at a
//   quiescent point (test afterEach, process teardown) — never mid-query. A selective
//   close is DELIBERATELY not offered: the suite relies on this as a global reset
//   (every st-gi-omp-*.test.ts afterEach), and the singleton holds one path at a
//   time, so "close only X" is not expressible here.
export function closeGiRegistry(): void {
  closeStoreDb();
}
