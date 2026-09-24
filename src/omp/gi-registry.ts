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
    //   routed PROD traffic to the tmp test DB. BUN_TEST=1 (set by `bun test`) is the
    //   primary signal; only the repo's own test-file prefix remains as a fallback.
    const argv1 = process.argv[1] ?? "";
    // ★ F-GR1 FIX (2026-09-24) + F-14 (2026-09-24): the '.test.'/'_test_' substrings
    //   false-positive in prod (e.g. /opt/myapp/integration-test-runner/bin/app) — dropped.
    //   But bun does NOT set BUN_TEST, and in a batch run argv1 is the FIRST glob file
    //   (e.g. st-artifact-coverage.test.ts), so 'st-gi-omp' alone missed most tests and the
    //   wipe test read the PROD path. The repo's own test dir + prefix (/tests/st-) is the
    //   precise signal: it matches EVERY test file here, never a prod binary path.
    const inTestContext = process.env.BUN_TEST === "1"
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

export function upsertGiSession(row: {
  sessionId: string;
  scopeRoot: string;
  storePath: string;
}): void {
  openGiRegistry();
  upsertRow("gi_sessions", "session_id", row.sessionId, "{}", {
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

export function closeGiRegistry(): void {
  closeStoreDb();
}
