// st-gi-w8b-defrag: W8 residual-high fixes proof battery.
//   T1  P1.3.4 hardening: applyTypedDdl RECOVERS a deferred UNIQUE index —
//       legacy duplicates are tombstoned (oldest kept) and the index is
//       retried; the store regains its invariant on first open
//   T2  the recovered index ENFORCES: a third duplicate insert now throws
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";

import { applyTypedDdl, TYPED_STORE_DDL } from "../src/omp/typed-write.ts";

function legacyStoreWithDuplicates(): { db: Database; p: string } {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gi-w8b-")), "sessions", "sesW8BDEFRAG0000001", "store.sqlite");
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const db = new Database(p);
  // Simulate the LEGACY store: full typed schema EXCEPT the unique indexes.
  for (const stmt of TYPED_STORE_DDL) {
    if (stmt.includes("CREATE UNIQUE INDEX")) continue;
    db.run(stmt);
  }
  // Two LIVE rows sharing one canonical_id — the deferral trigger.
  db.run(
    "INSERT INTO typed_nodes (canonical_id, kind, label, file, line, created_run, superseded_run) VALUES ('dup', 'function', 'first', 'src/a.ts', 1, 'legacy', NULL)",
  );
  db.run(
    "INSERT INTO typed_nodes (canonical_id, kind, label, file, line, created_run, superseded_run) VALUES ('dup', 'function', 'second', 'src/a.ts', 2, 'legacy', NULL)",
  );
  return { db, p };
}

describe("st-gi-w8b-defrag: UNIQUE recovery + enforcement", () => {
  test("test_w8_ddl_recovers_unique_index_after_dedup", () => {
    const { db } = legacyStoreWithDuplicates();
    const spy = console.error;
    console.error = () => {}; // silence the deferral/recovery notes
    try {
      expect(() => applyTypedDdl(db)).not.toThrow();
    } finally {
      console.error = spy;
    }
    // The invariant is BACK: exactly one live row per canonical_id —
    // NEWEST kept (MAX rowid: freshest label/file/line wins), oldest
    // tombstoned as ddl-dedup (the W9 ruling: never resurrect stale rows).
    const rows = db.query(
      "SELECT label, superseded_run FROM typed_nodes WHERE canonical_id = 'dup' ORDER BY rowid",
    ).all() as Array<{ label: string; superseded_run: string | null }>;
    expect(rows).toHaveLength(2);
    expect(rows[0]!.superseded_run).toBe("ddl-dedup");
    expect(rows[1]!.superseded_run).toBeNull();
  });

  test("test_w8_recovered_index_enforces_uniqueness", () => {
    const { db } = legacyStoreWithDuplicates();
    console.error = () => {};
    try {
      applyTypedDdl(db);
    } catch { /* not thrown in this path */ }
    // THE CONTRACT: the store rejects a THIRD live row with the same
    // canonical_id — the deferral class is closed, permanently.
    expect(() =>
      db.run(
        "INSERT INTO typed_nodes (canonical_id, kind, label, file, line, created_run, superseded_run) VALUES ('dup', 'function', 'third', 'src/a.ts', 3, 'legacy', NULL)",
      ),
    ).toThrow();
  });
});
