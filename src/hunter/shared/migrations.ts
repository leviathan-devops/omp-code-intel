// PORTED FROM fork-v143 live-tree/graph-intelligence/shared/knowledge-graph/migrations.ts (~75L) — TYPED_GRAPH_DDL (CHECK-closed kinds/predicates, idx_tn_file GG-BUG-5) + ensureTypedGraphSchema
// Ported 2026-09-14 (port wave W3-P2). Verbatim bytes; import ./ontology.ts is the ported sibling.
import { NODE_TYPES, ALL_PREDICATES } from './ontology.ts';

// ★ F-331 FIX (2026-09-24): SQL single-quote DOUBLING. The old body emitted `'${v}'`
//   verbatim — a node type carrying an apostrophe would terminate the literal and
//   silently alter the CHECK clause's DDL semantics. Standard SQL escaping: double
//   every embedded quote. (Values are compile-time constants today; the escaping is
//   what keeps that irrelevant.)
function sqlList(values: readonly string[]): string {
  return values.map((v) => `'${v.replace(/'/g, "''")}'`).join(',');
}

const NODE_KINDS_SQL = sqlList(NODE_TYPES);
const PREDICATES_SQL = sqlList(ALL_PREDICATES);

// ★ F-834 FIX (2026-09-24): graph_facts carried NO predicate/evidence CHECKs while typed_edges
//   enforces both — arbitrary garbage predicates broke schema consistency. Closed to the same
//   PREDICATES_SQL canon plus 'has_finding', the ONE live writer's predicate (report.ts:317
//   insertFact.run(f.file, 'has_finding', ...) — a bare IN (PREDICATES_SQL) would have turned that
//   committed write into a constraint violation). Evidence rides the same length(evidence) > 0 law.
//   SCOPE: CREATE TABLE IF NOT EXISTS only constrains FRESH stores; pre-existing graph_facts tables
//   keep their old shape (SQLite cannot ALTER in a CHECK) — a rebuild is the remedy there.
const GRAPH_FACT_PREDICATES_SQL = `${PREDICATES_SQL},'has_finding'`;

export const TYPED_GRAPH_DDL = `
CREATE TABLE IF NOT EXISTS typed_nodes (
  id INTEGER PRIMARY KEY,
  canonical_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN (${NODE_KINDS_SQL})),
  label TEXT NOT NULL,
  file TEXT,
  line INTEGER,
  created_run TEXT NOT NULL,
  superseded_run TEXT
);
CREATE TABLE IF NOT EXISTS typed_edges (
  id INTEGER PRIMARY KEY,
  src_canonical TEXT NOT NULL,
  dst_canonical TEXT NOT NULL,
  predicate TEXT NOT NULL CHECK (predicate IN (${PREDICATES_SQL})),
  evidence_quote TEXT NOT NULL CHECK (length(evidence_quote) > 0),
  confidence REAL NOT NULL DEFAULT 1.0,
  created_run TEXT NOT NULL,
  superseded_run TEXT
);
CREATE TABLE IF NOT EXISTS resolutions (
  alias TEXT PRIMARY KEY,
  canonical_id TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('same','related','unrelated')),
  reasoning TEXT NOT NULL,
  created_run TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS graph_facts (
  id INTEGER PRIMARY KEY,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL CHECK (predicate IN (${GRAPH_FACT_PREDICATES_SQL})),
  object TEXT NOT NULL,
  evidence TEXT NOT NULL CHECK (length(evidence) > 0),
  confidence REAL NOT NULL,
  created_at INTEGER NOT NULL,
  superseded_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tn_canonical ON typed_nodes(canonical_id);
CREATE INDEX IF NOT EXISTS idx_tn_kind ON typed_nodes(kind);
-- THE FILE INDEX (GG-BUG-5, the host live-fire 2026-09-10): the graph gate's
-- blast-radius CTE joins dst.file = blast.file per recursion row — with no
-- index on file each step full-scans typed_nodes (measured: 468-row closure
-- at depth 2 took 81s on the 51K-edge production store; indexed it is ms).
CREATE INDEX IF NOT EXISTS idx_tn_file ON typed_nodes(file);
CREATE INDEX IF NOT EXISTS idx_te_src ON typed_edges(src_canonical);
CREATE INDEX IF NOT EXISTS idx_te_dst ON typed_edges(dst_canonical);
CREATE INDEX IF NOT EXISTS idx_te_pred ON typed_edges(predicate);
CREATE INDEX IF NOT EXISTS idx_res_canonical ON resolutions(canonical_id);
CREATE INDEX IF NOT EXISTS idx_gf_subject ON graph_facts(subject);
`;

export interface TypedGraphDb {
  exec(sql: string): unknown;
  // ★ F-833 FIX (2026-09-24): the optional read leg for the non-transactional fallback's
  //   integrity check below (bun:sqlite Database.query satisfies this shape).
  query?: (sql: string) => { all: (...args: unknown[]) => Array<{ name: string }> };
}

export function ensureTypedGraphSchema(db: TypedGraphDb): void {
  if (!db || typeof db.exec !== 'function') {
    throw new Error('TYPED_MIGRATION_FAILED: db handle missing exec');
  }
  // ★ F-43 FIX (2026-09-24): the multi-statement DDL ran without an explicit
  //   transaction — a late-statement failure left a half-migrated schema.
  //   BEGIN/COMMIT makes it atomic; a driver without explicit-BEGIN support
  //   falls through to the bare exec, still failing loud below.
  // ★ F-70 FIX (2026-09-24): the COMMIT catch-all swallowed REAL commit failures (disk full,
  //   I/O error) after a successful BEGIN — the caller saw success on a rolled-back schema.
  //   The swallow now applies ONLY when BEGIN itself failed (no transaction to commit).
  let began = false;
  try {
    // ★ R15H5 FIX (2026-09-25): the old catch-all conflated lock contention with
    //   no-BEGIN support — a SQLITE_BUSY/locked/timeout/I-O failure on BEGIN fell
    //   through to bare auto-commit exec, turning transient concurrency failure
    //   into an unverified multi-statement partial migration. Fall back ONLY on
    //   unsupported-syntax shapes (or a nested-transaction join into the caller's
    //   tx); rethrow contention/timeout/I-O immediately.
    try { db.exec('BEGIN IMMEDIATE'); began = true; } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/no such|syntax|not supported|cannot start a transaction/i.test(msg)) began = false; /* no explicit-BEGIN support (or nested join): bare exec below */
      else throw new Error(`TYPED_MIGRATION_FAILED: BEGIN IMMEDIATE failed: ${msg}`);
    }
    try { db.exec('COMMIT'); } catch (commitErr: unknown) { if (began) throw commitErr; /* else: nothing to commit */ }
    // ★ F-833 FIX (2026-09-24): without BEGIN each DDL statement auto-committed — a
    //   mid-sequence failure leaves a half-migrated schema the caller cannot detect. Verify all
    //   four tables exist; a partial (or unverifiable) schema is a loud TYPED_MIGRATION_FAILED
    //   via the catch below, never silent success.
    if (!began) assertNonTransactionalSchema(db);
  } catch (e: unknown) {
    if (began) { try { db.exec('ROLLBACK'); } catch { /* best-effort: the original error below is the truth */ } }
    throw new Error(`TYPED_MIGRATION_FAILED: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ★ F-833 (cont.): the post-execution integrity check for the non-transactional fallback.
function assertNonTransactionalSchema(db: TypedGraphDb): void {
  const EXPECTED = ['typed_nodes', 'typed_edges', 'resolutions', 'graph_facts'];
  let names: string[] | null = null;
  try {
    const q = db.query?.("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('typed_nodes','typed_edges','resolutions','graph_facts')");
    if (q) names = q.all().map((r) => r.name);
  } catch { names = null; /* the throw below names it */ }
  if (names === null) {
    throw new Error('TYPED_MIGRATION_FAILED: non-transactional fallback executed without BEGIN and the driver exposes no readable sqlite_master — cannot verify all-or-nothing migration (remedy: use a driver with explicit-BEGIN support)');
  }
  const verified: string[] = names;
  const missing = EXPECTED.filter((t) => !verified.includes(t));
  if (missing.length > 0) {
    throw new Error(`TYPED_MIGRATION_FAILED: non-transactional fallback left a partial schema — missing ${missing.join(',')} (statements auto-committed individually; rebuild the store from scratch)`);
  }
}
