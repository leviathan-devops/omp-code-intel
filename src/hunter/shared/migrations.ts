// PORTED FROM fork-v143 live-tree/graph-intelligence/shared/knowledge-graph/migrations.ts (~75L) — TYPED_GRAPH_DDL (CHECK-closed kinds/predicates, idx_tn_file GG-BUG-5) + ensureTypedGraphSchema
// Ported 2026-09-14 (port wave W3-P2). Verbatim bytes; import ./ontology.ts is the ported sibling.
import { NODE_TYPES, ALL_PREDICATES } from './ontology.ts';

function sqlList(values: readonly string[]): string {
  return values.map((v) => `'${v}'`).join(',');
}

const NODE_KINDS_SQL = sqlList(NODE_TYPES);
const PREDICATES_SQL = sqlList(ALL_PREDICATES);

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
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  evidence TEXT NOT NULL,
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
    try { db.exec('BEGIN IMMEDIATE'); began = true; } catch { began = false; /* no explicit-BEGIN support: bare exec below */ }
    db.exec(TYPED_GRAPH_DDL);
    try { db.exec('COMMIT'); } catch (commitErr: unknown) { if (began) throw commitErr; /* else: nothing to commit */ }
  } catch (e: unknown) {
    if (began) { try { db.exec('ROLLBACK'); } catch { /* best-effort: the original error below is the truth */ } }
    throw new Error(`TYPED_MIGRATION_FAILED: ${e instanceof Error ? e.message : String(e)}`);
  }
}
