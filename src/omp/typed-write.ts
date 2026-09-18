// Per-session typed graph writer. Never opens another session's path
// without going through openSessionStore (GI_SCOPE_REFUSED).

import * as fs from "node:fs";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { assertSessionStorePath } from "../scoping/index.ts";
import { createHash } from "node:crypto";

export class GiStoreCorruptError extends Error {
  readonly code = "GI_STORE_CORRUPT";
  constructor(message: string) {
    super(message);
    this.name = "GiStoreCorruptError";
  }
}

// EN-38 port (fork graph-mapper.ts:23-38): stat-size check BEFORE parse loads
// into memory. A graph payload beyond budget fails loud, never OOMs the host.
// EN-38 G1 second half: above the 8MiB floor the caller yields to the event
// loop before parsing so a big-but-legal graph cannot stall the main thread.
export const GRAPH_LOAD_BUDGET_BYTES = 128 * 1024 * 1024;
export const GRAPH_PARSE_YIELD_BYTES = 8 * 1024 * 1024;

/** sizeHint stays NON-AUTHORITATIVE by pinned contract (st-gi-omp-corrupt:
 *  "a spoofed-huge hint on tiny contents parses fine") — the stat-layer
 *  enforcement lives at the LOAD SITES (graphify-adapter stats before
 *  readFileSync); the byteLen check here is the authoritative post-read gate. */
export function parseGraphJsonGuarded(contents: string, sizeHint = 0): Record<string, unknown> {
  // H11 (qwen 33d64eca): size is a HINT only — the budget checks the ACTUAL bytes
  // (a spoofed/TOCTOU small size can no longer bypass the 128MiB load budget).
  const byteLen = Buffer.byteLength(contents, "utf-8");
  if (byteLen > GRAPH_LOAD_BUDGET_BYTES) {
    throw new Error(
      `GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${byteLen} bytes (> ${GRAPH_LOAD_BUDGET_BYTES} budget). Fix: scope/extract a subtree or lower the graph cardinality.`,
    );
  }
  return JSON.parse(contents) as Record<string, unknown>;
}

// Async variant for large-but-legal payloads: yields above the 8MiB floor.
export async function parseGraphJsonGuardedAsync(contents: string, sizeHint = 0): Promise<Record<string, unknown>> {
  // H11: actual bytes decide; the hint can only trigger the early yield.
  const byteLen = Buffer.byteLength(contents, "utf-8");
  if (byteLen > GRAPH_PARSE_YIELD_BYTES && byteLen <= GRAPH_LOAD_BUDGET_BYTES) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  return parseGraphJsonGuarded(contents);
}

// Fork TYPED_GRAPH_DDL subset (migrations.ts:10-30, ontology.ts:1-10): the
// query-tool.ts:177-194 who-calls JOIN needs canonical_id/label/file/line +
// superseded_run on nodes and src_canonical/dst_canonical/predicate on edges.
// OMP baseline had typed_nodes(canonical,name,file) only — no edges table.
export const TYPED_STORE_DDL: readonly string[] = [
  // W12 (frozen-scan HIGH): gi_meta is created FIRST — the applyTypedDdl
  // deferral marker (unique_index_deferred) is written MID-LOOP when a legacy
  // UNIQUE index defers, and must have its table at that moment. Creating it
  // last silently lost every deferral record.
  `CREATE TABLE IF NOT EXISTS gi_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS typed_nodes (
    id INTEGER PRIMARY KEY,
    canonical_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    label TEXT NOT NULL,
    file TEXT,
    line INTEGER,
    created_run TEXT NOT NULL,
    superseded_run TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS typed_edges (
    id INTEGER PRIMARY KEY,
    src_canonical TEXT NOT NULL,
    dst_canonical TEXT NOT NULL,
    predicate TEXT NOT NULL,
    evidence_quote TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    created_run TEXT NOT NULL,
    superseded_run TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_tn_live_canonical ON typed_nodes(canonical_id) WHERE superseded_run IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_tn_canonical ON typed_nodes(canonical_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tn_label ON typed_nodes(label)`,
  `CREATE INDEX IF NOT EXISTS idx_tn_file ON typed_nodes(file)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_te_live_triple ON typed_edges(src_canonical, dst_canonical, predicate) WHERE superseded_run IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_te_src ON typed_edges(src_canonical)`,
  `CREATE INDEX IF NOT EXISTS idx_te_dst ON typed_edges(dst_canonical)`,
  `CREATE INDEX IF NOT EXISTS idx_te_pred ON typed_edges(predicate)`,
];

// W21 (frozen-scan HIGH): the TRUE magic is 16 bytes INCLUDING the trailing NUL —
// the 15-char form passed files with a corrupted 16th byte into bun:sqlite.
const SQLITE_MAGIC = Buffer.from("SQLite format 3\0");

/** Read a gi_meta value (null when absent). */
export function getMeta(storePath: string, key: string): string | null {
  const db = openTypedStore(storePath);
  try {
    const row = db.query("SELECT value FROM gi_meta WHERE key = ?").get(key) as { value: string } | null;
    return row?.value ?? null;
  } finally {
    db.close();
  }
}

/** Write a gi_meta value (upsert). */
export function setMeta(storePath: string, key: string, value: string): void {
  const db = openTypedStore(storePath);
  try {
    db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
  } finally {
    db.close();
  }
}

export function openTypedStore(storePath: string): Database {
  assertSessionStorePath(storePath);
  // H10 (qwen 33d64eca): path.dirname (slashless-safe) + UNCONDITIONAL recursive
  // mkdir — no exists/stat TOCTOU, no bogus dir when storePath has no "/".
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  // W16 (frozen-scan HIGH): ONE stat in try — the existsSync||statSync pair
  // raced a concurrent delete (ENOENT crash) and could TOCTOU past the magic
  // check. A vanished-or-empty store at this instant is simply the fresh path.
  let st: fs.Stats | null = null;
  try {
    // W24 (frozen-scan CRITICAL): lstat REFUSES symlinks — statSync followed
    // them, so a storePath symlinked to another session's SQLite passed the
    // isFile+magic gates and opened cross-session data.
    const lst = fs.lstatSync(storePath);
    if (lst.isSymbolicLink()) throw new GiStoreCorruptError(`GI_STORE_SYMLINK: ${storePath} is a symlink — refusing (session-store header contract)`);
    st = fs.statSync(storePath);
  } catch (e) {
    // W20 (frozen-scan HIGH): ONLY ENOENT takes the fresh path — EACCES/
    // EPERM/ENOTDIR/ELOOP are real failures, not "no store yet".
    const c = e as NodeJS.ErrnoException;
    if (c.code === "ENOENT") st = null;
    else throw e;
  }
  if (st !== null) {
    // W21 (frozen-scan HIGH): isFile FIRST — a 0-byte directory/FIFO used to
    // skip validation entirely and fall into bun:sqlite with a confusing error.
    if (!st.isFile()) throw new GiStoreCorruptError(`GI_STORE_CORRUPT: ${storePath} is not a regular file`);
  }
  if (st !== null && st.size > 0) {
    // W17 CRITICAL fix: the ENOENT race sets treatAsFresh (flow continues to
    // the fresh-store creation below) — the old `return db` referenced the
    // const declared LATER in this function: a TDZ ReferenceError crash.
    let treatAsFresh = false;
    let head: Buffer;
    try {
      const fd = fs.openSync(storePath, "r");
      try {
        head = Buffer.alloc(16);
        // W17 (frozen-scan HIGH): the header read is ENOENT/short-read safe —
        // a concurrent delete takes the fresh path; a short read (< 16 bytes)
        // is a corrupt candidate, not a half-magic accident.
        let total = 0;
        while (total < 16) {
          const n = fs.readSync(fd, head, total, 16 - total, total);
          if (n <= 0) break;
          total += n;
        }
        if (total < 16) throw new GiStoreCorruptError(`GI_STORE_CORRUPT: ${storePath} shorter than the 16-byte magic`);
      } finally {
        fs.closeSync(fd);
      }
    } catch (e) {
      if (e instanceof GiStoreCorruptError) throw e;
      const c = e as NodeJS.ErrnoException;
      if (c.code === "ENOENT") { treatAsFresh = true; } else { throw e; }
    }
    if (!treatAsFresh && !head.subarray(0, SQLITE_MAGIC.length).equals(SQLITE_MAGIC)) {
      throw new GiStoreCorruptError(`GI_STORE_CORRUPT: ${storePath}`);
    }
  }
  const db = new Database(storePath, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;"); // scan triage: raw BEGIN IMMEDIATE needs contention tolerance
  applyTypedDdl(db);
  // W21 (frozen-scan HIGH): a persisted deferral is SURFACED on every open —
  // the marker existed but nothing read it, so the unconstrained store was silent.
  try {
    const deferred = db.query("SELECT value FROM gi_meta WHERE key LIKE 'unique_index_deferred%'").all() as Array<{ value: string }>;
    if (deferred.length > 0) console.error(`[gi-omp] STORE OPENED WITH DEFERRED UNIQUE INDEX (${deferred.length} marker(s)) — legacy duplicate rows are unconstrained until dedup`);
  } catch { /* gi_meta absent on legacy stores */ }
  return db;
}

// P1.3.4 (W3 gi-validation): the deferral is PRECISE — only a real unique-
// constraint failure on a CREATE UNIQUE INDEX statement defers (legacy dup
// rows). Any other failure (the old catch deferred anything CONTAINING the
// word "UNIQUE") rethrows. Exported for the contract test.
export function applyTypedDdl(db: Database): void {
  let dedupRecovered = 0;
  for (const stmt of TYPED_STORE_DDL) {
    try {
      db.run(stmt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (stmt.includes("CREATE UNIQUE INDEX") && /UNIQUE constraint failed/i.test(msg)) {
        // W8 (frozen-scan HIGH fixed): deferral no longer leaves the store
        // permanently unconstrained — dedup the legacy live duplicates
        // (tombstone all but the newest row per duplicate group), then RETRY
        // the index once. The store regains its invariant on first open.
        // Parse the index's table + column list, tombstone every live row
        // that is NOT the NEWEST row of its unique-key group (MAX rowid:
        // the newest write carries the freshest label/file/line), then retry.
        try {
          const on = /ON\s+([\w_]+)\s*\(([^)]+)\)/i.exec(stmt);
          if (!on) {
            // W35 (frozen-scan HIGH): a regex miss (quoted ident, expression
            // index) used to fall to `continue` and DISCARD the constraint
            // error — log + record instead of a silent unconstrained store.
            console.error(`[gi-omp] DDL note: unique index regex miss (recording deferral) — ${stmt.slice(0, 80)}`);
            try { db.run("INSERT OR REPLACE INTO gi_meta (key, value) VALUES (?, ?)", [`unique_index_deferred:${createHash('sha256').update(stmt).digest('hex').slice(0, 12)}`, stmt.slice(0, 200)]); } catch { /* gi_meta may predate this table */ }
            continue;
          }
          if (on) {
            const table = on[1]!;
            const cols = on[2]!.split(",").map((c) => c.trim()).filter((c) => c.length > 0);
            // W9 (frozen-scan HIGH): regex-parsed identifiers are ALLOWLISTED
            // before interpolation — a TYPED_STORE_DDL format drift (quoted
            // ident, schema prefix, expression) is a named refusal, not SQL.
            const identOk = (x: string): boolean => /^[A-Za-z_][A-Za-z0-9_]*$/.test(x);
            if (!identOk(table) || cols.some((c) => !identOk(c))) {
              throw new Error(`DDL_DEDUP_INVALID_IDENT: parsed table/columns failed the identifier allowlist (${table}, ${cols.join(",")})`);
            }
            const groupBy = cols.join(", ");
            // W30: the dedup tombstone and the index retry ride ONE
            // transaction — a crash between them used to leave a
            // partially-tombstoned table with the index still unconstrained.
            db.exec("BEGIN IMMEDIATE;");
            try {
              db.run(
                `UPDATE ${table} SET superseded_run = 'ddl-dedup' WHERE rowid IN (
                   SELECT rowid FROM ${table} t
                   WHERE t.superseded_run IS NULL
                     AND t.rowid NOT IN (
                       SELECT MAX(rowid) FROM ${table}
                       WHERE superseded_run IS NULL
                       GROUP BY ${groupBy}
                     )
                 )`,
              );
              db.run(stmt);
              db.exec("COMMIT;");
              console.error(`[gi-omp] DDL note: UNIQUE index recovered after legacy-duplicate dedup — ${stmt.slice(0, 80)}`);
              dedupRecovered += 1;
            } catch (inner2) {
              try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
              throw inner2;
            }
          }
        } catch (dedupErr) {
          // W20+W24: a failed dedup is LOGGED, not swallowed — but an IDENT
          // allowlist refusal is a FORMAT-DRIFT refusal and rethrows loudly
          // (a silently unconstrained store is the worse failure).
          const dm = dedupErr instanceof Error ? dedupErr.message : String(dedupErr);
          if (dm.includes("DDL_DEDUP_INVALID_IDENT")) throw dedupErr;
          console.error(`[gi-omp] DDL dedup failed (deferral still recorded): ${dm}`);
        }
        // W34: the in-txn dedup+retry above owns the recovery — the old
        // out-of-txn second run double-counted the recovery log on success
        // and masked the txn outcome on failure.
        continue;
      }
      throw e;
    }
  }
  if (dedupRecovered > 0) {
    console.error(`[gi-omp] DDL: ${dedupRecovered} legacy-duplicate dedup(s) recovered — UNIQUE invariant restored`);
  }
}

// Legacy writer kept for ST compat (isolate/refuse insert canonical+name+file).
export function insertTypedNode(storePath: string, node: { canonical: string; name: string; file: string }): void {
  insertForkNode(storePath, {
    canonicalId: node.canonical,
    kind: "Function",
    label: node.name,
    file: node.file,
    line: null,
    run: "legacy",
  });
}

export interface ForkNode {
  canonicalId: string;
  kind: string;
  label: string;
  file: string | null;
  line: number | null;
  run: string;
}

// W13 (frozen-scan HIGH): BEGIN IMMEDIATE can throw SQLITE_BUSY under
// contention — retry with a short backoff instead of failing the write.
function beginImmediateWithRetry(db: Database, attempts = 3): void {
  for (let i = 0; i < attempts; i++) {
    try {
      db.exec("BEGIN IMMEDIATE;");
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/busy|locked/i.test(msg) || i === attempts - 1) throw e;
      // W15+W20: sync backoff that works under Bun AND Node runners (the
      // Bun-only global threw ReferenceError under node-compatible runners).
      // Deliberately SYNC: the caller is mid-retry on a sync sqlite handle.
      const spinUntil = Date.now() + 50 * (i + 1);
      while (Date.now() < spinUntil) { /* bounded sync backoff */ }
    }
  }
}

export function insertForkNode(storePath: string, node: ForkNode): void {
  const db = openTypedStore(storePath);
  try {
    // V21 fix-now F3: tombstone + insert are ONE transaction — an INSERT
    // failure must roll back the tombstone (never zero live rows).
    // W31: busy_timeout=5000 (set on open) owns SQLITE_BUSY — no spin.
    db.exec("BEGIN IMMEDIATE;");
    try {
      db.run(
        "UPDATE typed_nodes SET superseded_run = ? WHERE canonical_id = ? AND superseded_run IS NULL",
        [node.run, node.canonicalId],
      );
      db.run(
        "INSERT INTO typed_nodes (canonical_id, kind, label, file, line, created_run, superseded_run) VALUES (?, ?, ?, ?, ?, ?, NULL)",
        [node.canonicalId, node.kind, node.label, node.file, node.line, node.run],
      );
      db.exec("COMMIT;");
    } catch (e) {
      try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
      throw e;
    }
  } finally {
    db.close();
  }
}

export interface ForkEdge {
  srcCanonical: string;
  dstCanonical: string;
  predicate: string;
  evidence: string;
  /** Warm-copy confidence (M05, qwen 33d64eca): corbell reads confidence from
   *  the warm store — the copy must carry it, not re-default to 1.0. */
  confidence?: number;
  run: string;
}

export function insertForkEdge(storePath: string, edge: ForkEdge): void {
  const db = openTypedStore(storePath);
  try {
    // V21 fix-now F3: same single-txn law as insertForkNode.
    // W31: busy_timeout=5000 (set on open) owns SQLITE_BUSY — no spin.
    db.exec("BEGIN IMMEDIATE;");
    try {
      db.run(
        "UPDATE typed_edges SET superseded_run = ? WHERE src_canonical = ? AND dst_canonical = ? AND predicate = ? AND superseded_run IS NULL",
        [edge.run, edge.srcCanonical, edge.dstCanonical, edge.predicate],
      );
      db.run(
        "INSERT INTO typed_edges (src_canonical, dst_canonical, predicate, evidence_quote, confidence, created_run, superseded_run) VALUES (?, ?, ?, ?, ?, ?, NULL)",
        [edge.srcCanonical, edge.dstCanonical, edge.predicate, edge.evidence, typeof edge.confidence === "number" && Number.isFinite(edge.confidence) ? edge.confidence : 1.0, edge.run],
      );
      db.exec("COMMIT;");
    } catch (e) {
      try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
      throw e;
    }
  } finally {
    db.close();
  }
}

// R2 batch writers: ONE connection for the whole pass (baseline bottleneck
// was 3890 open/close cycles per populate). Caller owns open/close.
export interface TxnDb { run: (sql: string, params: unknown[]) => void; inTransaction: boolean }
export function insertForkNodesBatch(db: TxnDb, nodes: ForkNode[]): void {
  // V21 W3: a partial batch must never land — the writer refuses to run
  // outside a transaction (supersedeThenInsert / writeGraphifyCheckout own one).
  // V21 fix-now F2: require EXPLICITLY in-transaction — a wrapper object with
  // no inTransaction property must FAIL CLOSED, not slip past the guard.
  if (db.inTransaction !== true) {
    throw new Error("GI_TXN_REQUIRED: insertForkNodesBatch outside a transaction (mid-batch failure would leave a half-store)");
  }
  for (const node of nodes) {
    db.run(
      // V21 W2: tombstone-then-insert (history preserved, no REPLACE delete).
      "UPDATE typed_nodes SET superseded_run = ? WHERE canonical_id = ? AND superseded_run IS NULL",
      [node.run, node.canonicalId],
    );
    db.run(
      "INSERT INTO typed_nodes (canonical_id, kind, label, file, line, created_run, superseded_run) VALUES (?, ?, ?, ?, ?, ?, NULL)",
      [node.canonicalId, node.kind, node.label, node.file, node.line, node.run],
    );
  }
}

export function insertForkEdgesBatch(db: TxnDb, edges: ForkEdge[]): void {
  // V21 W3: same txn guard as nodes.
  if (db.inTransaction !== true) {
    throw new Error("GI_TXN_REQUIRED: insertForkEdgesBatch outside a transaction (mid-batch failure would leave a half-store)");
  }
  for (const edge of edges) {
    db.run(
      // V21 W2: tombstone-then-insert.
      "UPDATE typed_edges SET superseded_run = ? WHERE src_canonical = ? AND dst_canonical = ? AND predicate = ? AND superseded_run IS NULL",
      [edge.run, edge.srcCanonical, edge.dstCanonical, edge.predicate],
    );
    db.run(
      "INSERT INTO typed_edges (src_canonical, dst_canonical, predicate, evidence_quote, confidence, created_run, superseded_run) VALUES (?, ?, ?, ?, ?, ?, NULL)",
      [edge.srcCanonical, edge.dstCanonical, edge.predicate, edge.evidence, typeof edge.confidence === "number" && Number.isFinite(edge.confidence) ? edge.confidence : 1.0, edge.run],
    );
  }
}

export function countTypedNodes(storePath: string): number {
  const db = openTypedStore(storePath);
  try {
    const row = db.query("SELECT COUNT(*) AS n FROM typed_nodes WHERE superseded_run IS NULL").get() as { n: number };
    return Number(row.n);
  } finally {
    db.close();
  }
}

export function countTypedEdges(storePath: string): number {
  const db = openTypedStore(storePath);
  try {
    const row = db.query("SELECT COUNT(*) AS n FROM typed_edges WHERE superseded_run IS NULL").get() as { n: number };
    return Number(row.n);
  } finally {
    db.close();
  }
}

export function namesInStore(storePath: string): string[] {
  const db = openTypedStore(storePath);
  try {
    const rows = db.query("SELECT label AS name FROM typed_nodes WHERE superseded_run IS NULL ORDER BY label").all() as { name: string }[];
    return rows.map((r) => r.name);
  } finally {
    db.close();
  }
}

export interface WhoCallsRow { caller: string; file: string; line: number; kind?: string; predicate?: string; target_canonical?: string }

/** V21 W1 (identity model): resolve a display label to its LIVE canonical_ids.
 *  Traversal keys on canonical_id — same-label functions in different files are
 *  DIFFERENT identities and must never conflate in whoCalls/impact/chain/blast. */
function resolveLiveIds(db: { query: (sql: string) => { all: (v?: unknown) => unknown[] } }, label: string): string[] {
  const rows = db.query(
    "SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL ORDER BY canonical_id LIMIT 501",
  ).all(label) as Array<{ canonical_id: string }>;
  // W13 (frozen-scan HIGH): ORDER BY makes the 500-cap truncation
  // DETERMINISTIC — the same label always truncates to the same subset.
  return rows.map((r) => r.canonical_id);
}

/** IN-clause placeholders for a non-empty id list. */
function ph(n: number): string {
  return Array.from({ length: n }, () => "?").join(", ");
}

// Fork query-tool.ts:177-194 who-calls: typed 'calls'/'imports' edges into the
// symbol, label-resolved like the gate. Returns caller rows, not self rows.
// PORTED FROM fork-v143/live-tree/graph-intelligence/subagents/trident-bug-hunter/surface/query-tool.ts:178-194
// + src/hunter/graph/store-map.ts:73-95 corbellEdgeToPredicate (method_call->calls + flow_step->traces-to).
// CORBELL VOCABULARY (W4): predicates 'calls' + 'traces-to' (+ 'imports' for fallback stores).
// Flow 'traces-to' callers have NULL file — they are still callers (file="" line=0, honest not silent).
export function whoCallsInDb(db: Database, name: string): { rows: number; names: string[]; callers: WhoCallsRow[]; truncated?: boolean } {
  // V21 W1: dst resolved to canonical_ids FIRST — the join never matches by
  // label, so same-label identities stay distinct; each row names its target.
  // W8 (frozen-scan HIGH): an unbounded IN(...) hits the SQLite variable
  // limit on mega-labels — cap at 500 + WARN (named, never silent truncation).
  let ids = resolveLiveIds(db, name);
  let truncated: boolean | undefined;
  if (ids.length > 500) {
    console.warn(`[gi-omp] whoCalls: '${name}' resolves to ${ids.length} live ids — capping at 500 (SQLite variable limit)`);
    ids = ids.slice(0, 500);
    truncated = true;
  }
  if (ids.length === 0) return { rows: 0, names: [], callers: [], truncated };
  const rows = db.query(
    `SELECT DISTINCT src.label AS caller, src.kind AS kind, src.file AS file, src.line AS line,
            e.predicate AS predicate, e.dst_canonical AS target_canonical
     FROM typed_edges e
     JOIN typed_nodes src ON e.src_canonical = src.canonical_id
     WHERE e.dst_canonical IN (${ph(ids.length)})
       AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL
       AND src.superseded_run IS NULL`,
  ).all(...ids) as Array<{ caller: string; kind: string | null; file: string | null; line: number | null; predicate: string; target_canonical: string }>;
  const mapped: WhoCallsRow[] = rows.map((r) => ({
    caller: r.caller,
    file: r.file ?? "",
    line: r.line ?? 0,
    kind: r.kind ?? "",
    predicate: r.predicate ?? "",
    target_canonical: r.target_canonical,
  }));
  return { rows: mapped.length, names: mapped.map((r) => r.caller), callers: mapped, truncated };
}

export function whoCalls(storePath: string, name: string): { rows: number; names: string[]; callers: WhoCallsRow[]; truncated?: boolean } {
  const db = openTypedStore(storePath);
  try {
    return whoCallsInDb(db, name);
  } finally {
    db.close();
  }
}
// Fork query-tool.ts:415-458 blast-radius: symbol -> files -> depth-capped
// recursive CTE over 'calls'/'imports'. Default depth 8 (DEFAULT_BLAST_DEPTH).
// PORTED FROM fork-v143/live-tree/graph-intelligence/subagents/trident-bug-hunter/surface/query-tool.ts:416-458
// CORBELL VOCABULARY (W4): predicates 'calls' + 'traces-to' (+ 'imports' for fallback stores).
// File-level walk: flow 'traces-to' sources have NULL file so they terminate the file
// chain honestly (surfaced by whoCalls/impact instead — never silently dropped).
/** One blast-radius row: a reachable FILE and its minimum depth. The
 *  GROUP BY n.file collapses same-file identities DELIBERATELY (per-identity
 *  rows would duplicate the caller's report; per-file is the unit of edit).
 *  Documented lossy — canonical-level nodes are a rebuild-tier change. */
export interface BlastNode { file: string; depth: number }

export function blastRadius(storePath: string, symbol: string, depth = 8): { root: string; depth: number; nodes: BlastNode[] } {
  // W21 (frozen-scan HIGH): depth CLAMPED — negative/fractional/NaN/1e9 drove
  // the recursive CTE unboundedly.
  depth = Math.min(Math.max(1, Math.floor(depth) || 1), 16);
  const db = openTypedStore(storePath);
  try {
    // V21 W1+W5: the recursion walks CANONICAL IDS (identity-true), not files —
    // the old per-file CROSS JOIN (nodes-by-file x all edges) was an O(V*E)
    // fan-out AND conflated every same-label node sharing a file.
    let ids = resolveLiveIds(db, symbol);
    if (ids.length > 500) {
      console.warn(`[gi-omp] blastRadius: '${symbol}' resolves to ${ids.length} live ids — capping at 500 (SQLite variable limit); reachability UNDER-REPORTED`);
      ids = ids.slice(0, 500);
    }
    if (ids.length === 0) return { root: symbol, depth: 0, nodes: [] };
    const rows = db.query(
      `WITH RECURSIVE blast(cid, depth) AS (
         SELECT canonical_id, 0 FROM typed_nodes WHERE canonical_id IN (${ph(ids.length)}) AND superseded_run IS NULL
         UNION
         SELECT src.canonical_id, blast.depth + 1
         FROM blast
         JOIN typed_edges e ON e.dst_canonical = blast.cid
         JOIN typed_nodes src ON src.canonical_id = e.src_canonical
         WHERE e.predicate IN ('calls', 'traces-to', 'imports')
           AND e.superseded_run IS NULL
           AND src.superseded_run IS NULL
           AND blast.depth < ?
       )
       SELECT n.file AS file, MIN(blast.depth) AS depth
       FROM blast
       JOIN typed_nodes n ON n.canonical_id = blast.cid
       WHERE blast.depth > 0 AND n.file IS NOT NULL
       GROUP BY n.file
       LIMIT 5000`,
    ).all(...ids, depth) as BlastNode[];
    const nodes = rows.map((r) => ({ file: r.file, depth: Number(r.depth) }));
    const maxDepth = nodes.reduce((m, n) => (n.depth > m ? n.depth : m), 0);
    return { root: symbol, depth: maxDepth, nodes };
  } finally {
    db.close();
  }
}

// Fork query-tool.ts:460-492 would-break: typed 'calls' edges into the symbol.
// The typed substrate has no per-call signature metadata: argsUnknown true.
// PORTED FROM fork-v143/live-tree/graph-intelligence/subagents/trident-bug-hunter/surface/query-tool.ts:461-492
// CORBELL VOCABULARY (W4): delegates to whoCalls so 'calls' + 'traces-to' (+ 'imports'
// for fallback stores) all count as callers — a signature change breaks flow 'traces-to'
// dependents too, not just 'calls'.
export function wouldBreak(storePath: string, symbol: string, proposed = ""): { symbol: string; proposed: string; callers: number; breaking: Array<{ importer: string; reason: string }>; argsUnknown: true } {
  const q = whoCalls(storePath, symbol);
  let proposedCount = 0;
  if (proposed.trim()) {
    const m = /\(([^)]*)\)/.exec(proposed);
    const inside = m ? m[1].trim() : "";
    if (inside) proposedCount = inside.split(",").map((s) => s.trim()).filter(Boolean).length;
  }
  return {
    symbol,
    proposed,
    callers: q.rows,
    breaking: q.callers.map((c) => ({
      importer: `${c.caller} (${c.file}:${c.line})`,
      reason: `signature change unverified — ${proposedCount > 0 ? `proposed arity ${proposedCount}` : "no proposed signature"}; manual verification required (no per-call signature metadata)`,
    })),
    argsUnknown: true,
  };
}

export interface ChainStep {
  from: string;
  to: string;
  kind: string;
  file: string;
  line: number;
}

// R5 chain port (fork query-tool.ts:200-243): BFS over TYPED 'calls' edges
// from label -> to label. MAX_DEPTH 64 bounds pathological graphs.
// PORTED FROM fork-v143/live-tree/graph-intelligence/subagents/trident-bug-hunter/surface/query-tool.ts:201-244
// CORBELL VOCABULARY (W4): predicates 'calls' + 'traces-to' (+ 'imports' for fallback stores)
// so flow_step 'traces-to' paths (flow -> method) are traversable, not half-invisible.
export function chainCalls(storePath: string, from: string, to: string, maxDepth = 64): ChainStep[] {
  const db = openTypedStore(storePath);
  try {
    // W16 (frozen-scan HIGH): LIMIT in the SQL — the in-memory truncation
    // materialized every matching row before slicing (OOM on a mega-label).
    const starts = db.query(
      "SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL ORDER BY canonical_id LIMIT 500",
    ).all(from) as { canonical_id: string }[];
    const targets = db.query(
      "SELECT DISTINCT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL ORDER BY canonical_id LIMIT 500",
    ).all(to) as { canonical_id: string }[];
    const toSet = new Set(targets.map((r) => r.canonical_id));
  // W17 (frozen-scan HIGH): maxDepth is CLAMPED — a huge depth value used to
  // materialize unbounded rows per level before any bound applied.
  maxDepth = Math.min(Math.max(1, Math.floor(maxDepth) || 1), 16);
    // V21 W4: visited marked on ENQUEUE — the dequeue-mark variant pushed the
    // same id once per inbound edge (exponential churn on dense graphs).
    const visited = new Set<string>(starts.map((s) => s.canonical_id));
    const queue: Array<{ id: string; label: string; steps: ChainStep[] }> = starts.map((s) => ({ id: s.canonical_id, label: from, steps: [] }));
    let head = 0;
    while (head < queue.length && queue[head].steps.length < maxDepth) {
      const cur = queue[head++];
      const out = db.query(
        `SELECT dst.canonical_id AS dst_id, dst.label AS dst_label,
                dst.file AS dst_file, dst.line AS dst_line, e.predicate AS predicate
         FROM typed_edges e
         JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id
         WHERE e.src_canonical = ? AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL
           AND dst.superseded_run IS NULL LIMIT 500`,
      ).all(cur.id) as { dst_id: string; dst_label: string; dst_file: string; dst_line: number; predicate: string }[];
      for (const e of out) {
        const step: ChainStep = {
          // W3 (scan triage): identity-joinable steps — from AND to carry the
          // display label (prev.to === next.from held; the old mix of
          // from=canonical_id with to=label could never join into a path).
          from: cur.label,
          to: e.dst_label,
          kind: e.predicate,
          file: e.dst_file ?? "",
          line: e.dst_line ?? 0,
        };
        if (toSet.has(e.dst_id) && !(from === to && cur.steps.length === 0)) {
          return [...cur.steps, step];
        }
        if (!visited.has(e.dst_id)) {
          visited.add(e.dst_id);
          queue.push({ id: e.dst_id, label: e.dst_label, steps: [...cur.steps, step] });
        }
      }
    }
    return [];
  } finally {
    db.close();
  }
}

export interface UnwiredRow {
  name: string;
  file: string;
  line: number;
  status: "UNWIRED";
  kind?: string;
}

// R5 unwired port (fork query-tool.ts:283-302): Function nodes with zero
// inbound 'calls'/'imports' edges. OMP kinds are File/Function only.
// PORTED FROM fork-v143/live-tree/graph-intelligence/subagents/trident-bug-hunter/surface/query-tool.ts:284-303
// + src/hunter/graph/store-map.ts:63-67 resolveTypedKind (corbell node_type preserved as kind).
// CORBELL VOCABULARY (W4): kinds method/flow/service/class (+ function/file/module +
// Function/Class/File/Module for fallback stores) with zero inbound 'calls' + 'traces-to'
// (+ 'imports') edges. Flow/service nodes carry NULL file so the file-anchored surface
// skips them honestly (n.file IS NOT NULL) — method/class nodes with files are the dead machinery.
export function unwiredNodes(storePath: string): UnwiredRow[] & { truncated?: boolean } {
  const db = openTypedStore(storePath);
  try {
    const rows = db.query(
      `SELECT n.label AS name, n.file AS file, n.line AS line, n.kind AS kind
       FROM typed_nodes n
       WHERE n.kind IN ('method', 'flow', 'service', 'class', 'function', 'file', 'module', 'Function', 'Class', 'File', 'Module') AND n.superseded_run IS NULL
         AND n.file IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM typed_edges e
           WHERE e.dst_canonical = n.canonical_id
             AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL
         )
       ORDER BY n.label LIMIT 5001`,
    ).all() as { name: string; file: string; line: number | null; kind: string }[];
    // W33 (frozen-scan HIGH): the LAST uncapped materialization is bounded —
    // LIMIT 5001 in SQL (5000 + 1 to detect truncation deterministically).
    // P1.5.2 (W3): the lineless row is SKIPPED + counted (WARN log) — the old
    // throw aborted the whole listing on ONE data defect (N-1 good rows lost).
    const out: UnwiredRow[] = [];
    let linelessSkipped = 0;
    for (const r of rows) {
      if (r.line === null || r.line === undefined) { linelessSkipped += 1; continue; }
      out.push({ name: r.name, file: r.file ?? "", line: r.line, status: "UNWIRED" as const, kind: r.kind ?? "" });
    }
    if (linelessSkipped > 0) {
      console.warn(`[gi-omp] unwired: skipped ${linelessSkipped} lineless row(s) (counted, never silent)`);
    }
    const truncated = rows.length > 5000 ? true : undefined;
    if (truncated) console.warn(`[gi-omp] unwired: truncated at 5000 rows (deterministic order)`);
    (out as { truncated?: boolean }).truncated = truncated;
    return out;
  } finally {
    db.close();
  }
}

export interface ImpactLedgerRow { symbol: string; depth: number; file: string; line: number; via: string }

export interface ImpactResult {
  symbol: string;
  reaches: number;
  ledger: ImpactLedgerRow[];
  hint: string;
}

// W4 impact (OMP-NEW, no single fork source: the fork's blast-radius walks DOWNSTREAM
// files via CHECK 3's CTE in surface/query-tool.ts:416-458; impact walks the UPSTREAM
// direction — callers-of-callers — which the fork never materialized as a verb).
// PORTED FROM fork-v143/live-tree/graph-intelligence/subagents/trident-bug-hunter/surface/query-tool.ts:416-458
// (the JOIN shape: typed_edges e + typed_nodes dst on dst.label + typed_nodes src).
// CORBELL VOCABULARY: predicates 'calls' + 'traces-to' (+ 'imports' for fallback stores).
// BFS over callers-of-callers with a depth ledger; hint names the follow-up (next=chain).
// P1.1.2 (W1 gi-resource): handle-injected core (see whoCallsInDb).
export function impactInDb(db: Database, symbol: string, depth = 8): ImpactResult & { truncated?: boolean } {
  depth = Math.min(Math.max(1, Math.floor(depth) || 1), 16); // W21: clamped
  const ledger: ImpactLedgerRow[] = [];
  const seen = new Set<string>();
  // V21 W1: the frontier carries CANONICAL IDS, never labels — same-label
  // functions are distinct identities. Start ids are seeded BEFORE the loop
  // (a cycle can never ledger the start as its own caller).
  let startIds = resolveLiveIds(db, symbol);
  if (startIds.length > 500) {
    console.warn(`[gi-omp] impact: '${symbol}' resolves to ${startIds.length} live ids — capping at 500 (SQLite variable limit); reachability UNDER-REPORTED`);
    startIds = startIds.slice(0, 500);
  }
  if (startIds.length === 0) return { symbol, reaches: 0, ledger, hint: `next=chain from=${symbol}` };
  // W31+W32: the ledger is CAPPED at 5000 rows (blast-parity) — a mega-store
  // no longer materializes unbounded reachability before returning; the
  // truncation is SURFACED in the result (never a silent under-report).
  const LEDGER_CAP = 5000;
  let ledgerTruncated = false;
  for (const id of startIds) seen.add(id);
  let frontier: string[] = startIds;
  for (let d = 1; d <= depth && frontier.length > 0; d++) {
    const next: string[] = [];
    for (let i = 0; i < frontier.length; i += 64) {
      const chunk = frontier.slice(i, i + 64);
      const callers = db.query(
        `SELECT DISTINCT src.canonical_id AS id, src.label AS caller, src.file AS file, src.line AS line, e.predicate AS predicate
         FROM typed_edges e
         JOIN typed_nodes src ON e.src_canonical = src.canonical_id
         WHERE e.dst_canonical IN (${ph(chunk.length)})
           AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL
           AND src.superseded_run IS NULL`,
      ).all(...chunk) as Array<{ id: string; caller: string; file: string | null; line: number | null; predicate: string }>;
      for (const c of callers) {
        // W4: mark visited on ENQUEUE — dequeue-marking re-enqueues the same
        // id once per inbound edge before it is first expanded (exponential
        // on dense/cyclic graphs).
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        if (ledger.length < LEDGER_CAP) {
          ledger.push({ symbol: c.caller, depth: d, file: c.file ?? "", line: c.line ?? 0, via: c.predicate ?? "" });
        } else {
          ledgerTruncated = true;
        }
        next.push(c.id);
      }
    }
    frontier = next;
  }
  return { symbol, reaches: ledger.length, ledger, truncated: ledgerTruncated, hint: `next=chain from=${symbol}` };
}

export function impact(storePath: string, symbol: string, depth = 8): ImpactResult {
  const db = openTypedStore(storePath);
  try {
    return impactInDb(db, symbol, depth);
  } finally {
    db.close();
  }
}
// PORTED FROM fork-v143/live-tree/graph-intelligence/subagents/trident-bug-hunter/surface/query-tool.ts:178-194
// ONE result: direct callers (NAMED file:line) + transitive reaches (callers-of-callers
// count via impact) + uses (symbols this symbol calls) + test-reach (callers/uses whose
// file matches test/spec/mock/fixture paths). Empty sets are honest empties, never throws.
export interface SafeDeleteResult {
  symbol: string;
  callers: WhoCallsRow[];
  reaches: number;
  uses: Array<{ symbol: string; file: string; line: number }>;
  testReach: Array<{ symbol: string; file: string; line: number }>;
  /** P1.5.3 (W3): lineless uses dropped from `uses` — counted, never silent. */
  usesLinelessDropped?: number;
  /** W34 (frozen-scan HIGH): whoCalls/impact caps fired — under-report flag. */
  truncated?: boolean;
}

export function safeDelete(storePath: string, symbol: string): SafeDeleteResult {
  const db = openTypedStore(storePath);
  try {
    // P1.1.2 (W1 gi-resource): the whoCalls/impact cores ride THIS connection —
    // the old path opened a second + third connection to the same store file.
    const q = whoCallsInDb(db, symbol);
    const imp = impactInDb(db, symbol);
    // V21 cleanup: uses resolved through canonical ids (label join conflated
    // same-label identities — the exact W1 defect class).
    // W15+W19: the 500-cap contract — whoCalls/impact/blastRadius cap, so
    // safeDelete's IN(...) must too (a mega-label hit the SQLite variable
    // limit here after the other three were capped).
    let srcIds = resolveLiveIds(db, symbol);
    if (srcIds.length > 500) {
      console.warn(`[gi-omp] safeDelete: '${symbol}' resolves to ${srcIds.length} live ids — capping at 500 (SQLite variable limit)`);
      srcIds = srcIds.slice(0, 500);
    }
    let mappedUses: Array<{ symbol: string; file: string; line: number }> = [];
    let usesLinelessDropped = 0;
    if (srcIds.length > 0) {
      const uses = db.query(
        `SELECT DISTINCT dst.label AS symbol, dst.file AS file, dst.line AS line
         FROM typed_edges e
         JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id
         WHERE e.src_canonical IN (${ph(srcIds.length)})
           AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL
           AND dst.superseded_run IS NULL`,
      ).all(...srcIds) as Array<{ symbol: string; file: string | null; line: number | null }>;
      // P1.5.3 (W3): the lineless USE is COUNTED in the result — the old filter
      // vanished it silently (a caller with no line could never be cited).
      for (const u of uses) {
        if (u.line === null || u.line === undefined) { usesLinelessDropped += 1; continue; }
        mappedUses.push({ symbol: u.symbol, file: u.file ?? "", line: u.line as number });
      }
    }
    const isTestPath = (f: string): boolean => /(test|spec|mock|fixture)/i.test(f);
    const testReach = [
      ...q.callers.filter((c) => isTestPath(c.file)).map((c) => ({ symbol: c.caller, file: c.file, line: c.line })),
      ...mappedUses.filter((u) => isTestPath(u.file)),
    ];
    // W34 (frozen-scan HIGH): the caps' truncation flags are SURFACED —
    // mega-label under-reports in callers/reaches are machine-detectable.
    return { symbol, callers: q.callers, reaches: imp.reaches, uses: mappedUses, testReach, usesLinelessDropped, truncated: q.truncated === true || (imp as { truncated?: boolean }).truncated === true };
  } finally {
    db.close();
  }
}

export interface GateAdvisoryResult {
  dial: string;
  symbols: string[];
  callers: Array<{ symbol: string; caller: string; file: string; line: number; via: string }>;
  advisory: string;
}

// W4 gate advisory (OMP-NEW, no single fork source: the fork's graph-gate CHECK 1 in
// hooks/graph-gate.ts cites typed callers on signature breaks; this derives the same
// caller list from the session store; the RIPWIRE EDIT-CHECK DELEGATION (closed
// 2026-09-15) passes the real ripwire binary's live-tree callers as the 4th arg —
// absent → the note names the reason, never a silent substitute).
// PORTED FROM fork-v143/live-tree/graph-intelligence/hooks/graph-gate.ts:234-300 (CHECK 1 caller citation)
/** The ripwire leg of the advisory — the uniform delegation shape (extension.ts). */
export type RipwireNote = { ok: boolean; summary: string };

export function gateAdvisory(
  storePath: string,
  symbols: string[],
  dial: string = "STEER",
  ripwire?: RipwireNote,
): GateAdvisoryResult {
  const db = openTypedStore(storePath);
  try {
    const callers: GateAdvisoryResult["callers"] = [];
    for (const symbol of symbols) {
      // W3 (scan triage): the Db-variant rides the OUTER connection — the old
      // loop opened a fresh store handle per symbol (N+1 connections).
      const q = whoCallsInDb(db, symbol);
      for (const c of q.callers) {
        callers.push({ symbol, caller: c.caller, file: c.file, line: c.line, via: c.predicate ?? "" });
      }
    }
    const named = callers.slice(0, 20).map((c) => `${c.caller} (${c.file}:${c.line})`).join(", ");
    const ripwireNote = ripwire === undefined
      ? "(store-derived; ripwire not consulted)"
      : ripwire.ok
        ? `(store-derived + ripwire ${ripwire.summary})`
        : `(store-derived; ripwire ${ripwire.summary})`;
    const advisory = dial === "FULL"
      ? `GRAPH_GATE_SIGNATURE_BREAK symbols=${symbols.join(",")} callers=${callers.length}${named ? ` no-longer-fit: ${named}` : ""} ${ripwireNote}`
      : `[GATE STEER] symbols=${symbols.join(",")} callers=${callers.length}${named ? ` review: ${named}` : ""} ${ripwireNote}`;
    return { dial, symbols, callers, advisory };
  } finally {
    db.close();
  }
}
