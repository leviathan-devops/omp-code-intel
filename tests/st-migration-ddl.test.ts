// ★★★ THE MIGRATION-DDL PIN (2026-09-25) — the whole-tree audit's CRITICAL.
//
// THE DEFECT IT PINS: `ensureTypedGraphSchema` began a transaction, committed it, and executed
// NO DDL — a silent no-op migration. An earlier wave's BEGIN/COMMIT restructure (the R15H5
// "contention rethrow" fix) moved BEGIN and COMMIT into nested trys and the
// `db.exec(TYPED_GRAPH_DDL)` that sat BETWEEN them was consumed by the edit. It hid for an
// unknown number of commits because `new SharedDb` (db.ts:965) execs the DDL on the NORMAL open
// path, so only the standalone migration was a no-op — and nothing tested the function.
//
// THE LESSON (the asserting-scripted-edits class): an anchor assertion proves the pattern
// matched once and says NOTHING about what else the match consumed. This suite is the assertion
// that was missing.
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { ensureTypedGraphSchema, TYPED_GRAPH_DDL } from "../src/hunter/shared/migrations.ts";

const EXPECTED = ["graph_facts", "resolutions", "typed_edges", "typed_nodes"];

function freshDb(): Database {
  const db = new Database(":memory:");
  // the function's contract: a handle exposing exec + query
  (db as unknown as { exec: (s: string) => void }).exec = db.exec.bind(db);
  (db as unknown as { query: (s: string) => unknown }).query = db.query.bind(db);
  return db;
}

function tables(db: Database): string[] {
  return (db.query("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>)
    .map((r) => r.name)
    .filter((n) => EXPECTED.includes(n))
    .sort();
}

describe("st-migration-ddl: ★ the standalone migration MUST execute its DDL", () => {
  // ── THE POSITIVE HALF ────────────────────────────────────────────────────────
  test("test_migration_creates_all_four_tables", () => {
    const db = freshDb();
    expect(tables(db)).toEqual([]); // the control: a fresh db has none of them
    ensureTypedGraphSchema(db);
    expect(tables(db)).toEqual(EXPECTED);
  });

  // ── THE NEGATIVE HALF: the guard must BITE when the DDL does not run ─────────
  //   Proven live (2026-09-25): a copy of the file with the single line
  //   `db.exec(TYPED_GRAPH_DDL);` deleted reproduces the defect — 0 tables created —
  //   and the now-UNCONDITIONAL schema assertion throws TYPED_MIGRATION_FAILED instead of
  //   returning silently. The pre-fix `if (!began)` guard SKIPPED the assertion on the
  //   transactional path, which is exactly where the DDL runs — that inversion is the bug.
  test("test_migration_assertion_is_unconditional", () => {
    const src = require("node:fs").readFileSync(
      require("node:path").join(import.meta.dir, "..", "src", "hunter", "shared", "migrations.ts"),
      "utf8",
    ) as string;
    // the DDL exec must be PRESENT (the line-eating edit's signature is its absence)
    expect(src.includes("db.exec(TYPED_GRAPH_DDL)")).toBe(true);
    // and the verification must NOT be gated on the non-transactional path
    expect(src).not.toContain("if (!began) assertNonTransactionalSchema(db)");
    expect(src).toContain("assertNonTransactionalSchema(db);");
  });

  // ── THE SCHEMA IS REAL: the DDL declares the four tables ─────────────────────
  test("test_typed_graph_ddl_declares_the_four_tables", () => {
    for (const t of EXPECTED) expect(TYPED_GRAPH_DDL).toContain(`CREATE TABLE IF NOT EXISTS ${t}`);
  });
});
