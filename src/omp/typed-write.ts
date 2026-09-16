// Per-session typed graph writer. Never opens another session's path
// without going through openSessionStore (GI_SCOPE_REFUSED).

import * as fs from "node:fs";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { assertSessionStorePath } from "../scoping/index.ts";

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
  // W1 substrate ledger: records which substrate populated this store
  // ('corbell' | 'indexer-fallback') so queries can SURFACE it always and
  // reconcile on upgrade - a regex-populated store must never silently
  // masquerade once the parse-grade substrate is warm.
  `CREATE TABLE IF NOT EXISTS gi_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
];

const SQLITE_MAGIC = Buffer.from("SQLite format 3");

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
  if (!fs.existsSync(storePath) || fs.statSync(storePath).size === 0) {
    // fresh store path — DDL below creates the schema
  } else {
    const head = Buffer.alloc(16);
    const fd = fs.openSync(storePath, "r");
    try {
      fs.readSync(fd, head, 0, 16, 0);
    } finally {
      fs.closeSync(fd);
    }
    if (!head.subarray(0, SQLITE_MAGIC.length).equals(SQLITE_MAGIC)) {
      throw new GiStoreCorruptError(`GI_STORE_CORRUPT: ${storePath}`);
    }
  }
  const db = new Database(storePath, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  // H08/M14 (qwen 33d64eca): per-statement replay — a legacy store holding
  // duplicate live rows cannot host the new UNIQUE index; that ONE statement
  // fails loudly in stderr and the rest of the DDL lands (the store keeps
  // working; new stores get the constraint from birth).
  for (const stmt of TYPED_STORE_DDL) {
    try {
      db.run(stmt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("UNIQUE")) {
        console.error(`[gi-omp] DDL note: UNIQUE index deferred (legacy duplicate rows) — ${msg.slice(0, 120)}`);
        continue;
      }
      throw e;
    }
  }
  return db;
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

export function insertForkNode(storePath: string, node: ForkNode): void {
  const db = openTypedStore(storePath);
  try {
    // V21 fix-now F3: tombstone + insert are ONE transaction — an INSERT
    // failure must roll back the tombstone (never zero live rows).
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
export function insertForkNodesBatch(db: { run: (sql: string, params: unknown[]) => void; inTransaction?: boolean }, nodes: ForkNode[]): void {
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

export function insertForkEdgesBatch(db: { run: (sql: string, params: unknown[]) => void; inTransaction?: boolean }, edges: ForkEdge[]): void {
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
    "SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL",
  ).all(label) as Array<{ canonical_id: string }>;
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
export function whoCalls(storePath: string, name: string): { rows: number; names: string[]; callers: WhoCallsRow[] } {
  const db = openTypedStore(storePath);
  try {
    // V21 W1: dst resolved to canonical_ids FIRST — the join never matches by
    // label, so same-label identities stay distinct; each row names its target.
    const ids = resolveLiveIds(db, name);
    if (ids.length === 0) return { rows: 0, names: [], callers: [] };
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
    return { rows: mapped.length, names: mapped.map((r) => r.caller), callers: mapped };
  } finally {
    db.close();
  }
}

export interface BlastNode { file: string; depth: number }

// Fork query-tool.ts:415-458 blast-radius: symbol -> files -> depth-capped
// recursive CTE over 'calls'/'imports'. Default depth 8 (DEFAULT_BLAST_DEPTH).
// PORTED FROM fork-v143/live-tree/graph-intelligence/subagents/trident-bug-hunter/surface/query-tool.ts:416-458
// CORBELL VOCABULARY (W4): predicates 'calls' + 'traces-to' (+ 'imports' for fallback stores).
// File-level walk: flow 'traces-to' sources have NULL file so they terminate the file
// chain honestly (surfaced by whoCalls/impact instead — never silently dropped).
export function blastRadius(storePath: string, symbol: string, depth = 8): { root: string; depth: number; nodes: BlastNode[] } {
  const db = openTypedStore(storePath);
  try {
    // V21 W1+W5: the recursion walks CANONICAL IDS (identity-true), not files —
    // the old per-file CROSS JOIN (nodes-by-file x all edges) was an O(V*E)
    // fan-out AND conflated every same-label node sharing a file.
    const ids = resolveLiveIds(db, symbol);
    if (ids.length === 0) return { root: symbol, depth: 0, nodes: [] };
    const rows = db.query(
      `WITH RECURSIVE blast(cid, depth) AS (
         SELECT canonical_id, 0 FROM typed_nodes WHERE canonical_id IN (${ph(ids.length)})
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
       GROUP BY n.file`,
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
    const starts = db.query(
      "SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL",
    ).all(from) as { canonical_id: string }[];
    const targets = db.query(
      "SELECT DISTINCT label FROM typed_nodes WHERE label = ? AND superseded_run IS NULL",
    ).all(to) as { label: string }[];
    const toSet = new Set(targets.map((r) => r.label));
    // V21 W4: visited marked on ENQUEUE — the dequeue-mark variant pushed the
    // same id once per inbound edge (exponential churn on dense graphs).
    const visited = new Set<string>(starts.map((s) => s.canonical_id));
    const queue: Array<{ id: string; steps: ChainStep[] }> = starts.map((s) => ({ id: s.canonical_id, steps: [] }));
    while (queue.length > 0 && queue[0].steps.length < maxDepth) {
      const cur = queue.shift()!;
      const out = db.query(
        `SELECT dst.canonical_id AS dst_id, dst.label AS dst_label,
                dst.file AS dst_file, dst.line AS dst_line, e.predicate AS predicate
         FROM typed_edges e
         JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id
         WHERE e.src_canonical = ? AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL
           AND dst.superseded_run IS NULL`,
      ).all(cur.id) as { dst_id: string; dst_label: string; dst_file: string; dst_line: number; predicate: string }[];
      for (const e of out) {
        const step: ChainStep = {
          from: cur.id,
          to: e.dst_label,
          kind: e.predicate,
          file: e.dst_file ?? "",
          line: e.dst_line ?? 0,
        };
        if (toSet.has(e.dst_label) && !(from === to && cur.steps.length === 0)) {
          return [...cur.steps, step];
        }
        if (!visited.has(e.dst_id)) {
          visited.add(e.dst_id);
          queue.push({ id: e.dst_id, steps: [...cur.steps, step] });
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
export function unwiredNodes(storePath: string): UnwiredRow[] {
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
         )`,
    ).all() as { name: string; file: string; line: number | null; kind: string }[];
    return rows.map((r) => {
      // V21 W9: no invented anchors — a lineless unwired row is a named defect.
      if (r.line === null || r.line === undefined) {
        throw new Error(`LINELESS_NODE: unwired row ${r.name} (${r.file ?? "?"}) has no line`);
      }
      return { name: r.name, file: r.file ?? "", line: r.line, status: "UNWIRED" as const, kind: r.kind ?? "" };
    });
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
export function impact(storePath: string, symbol: string, depth = 8): ImpactResult {
  const db = openTypedStore(storePath);
  try {
    const ledger: ImpactLedgerRow[] = [];
    const seen = new Set<string>();
    // V21 W1: the frontier carries CANONICAL IDS, never labels — same-label
    // functions are distinct identities. Start ids are seeded BEFORE the loop
    // (a cycle can never ledger the start as its own caller).
    const startIds = resolveLiveIds(db, symbol);
    if (startIds.length === 0) return { symbol, reaches: 0, ledger, hint: `next=chain from=${symbol}` };
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
          ledger.push({ symbol: c.caller, depth: d, file: c.file ?? "", line: c.line ?? 0, via: c.predicate ?? "" });
          next.push(c.id);
        }
      }
      frontier = next;
    }
    return { symbol, reaches: ledger.length, ledger, hint: `next=chain from=${symbol}` };
  } finally {
    db.close();
  }
}

export interface SafeDeleteResult {
  symbol: string;
  callers: WhoCallsRow[];
  reaches: number;
  uses: Array<{ symbol: string; file: string; line: number }>;
  testReach: Array<{ symbol: string; file: string; line: number }>;
}

// W4 safe-delete (OMP-NEW, no single fork source: combines the fork's who-calls JOIN
// in surface/query-tool.ts:178-194 with the upstream closure shape above).
// PORTED FROM fork-v143/live-tree/graph-intelligence/subagents/trident-bug-hunter/surface/query-tool.ts:178-194
// ONE result: direct callers (NAMED file:line) + transitive reaches (callers-of-callers
// count via impact) + uses (symbols this symbol calls) + test-reach (callers/uses whose
// file matches test/spec/mock/fixture paths). Empty sets are honest empties, never throws.
export function safeDelete(storePath: string, symbol: string): SafeDeleteResult {
  const db = openTypedStore(storePath);
  try {
    const q = whoCalls(storePath, symbol);
    const imp = impact(storePath, symbol);
    const uses = db.query(
      `SELECT DISTINCT dst.label AS symbol, dst.file AS file, dst.line AS line
       FROM typed_edges e
       JOIN typed_nodes src ON e.src_canonical = src.canonical_id AND src.label = ?
       JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id
       WHERE e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL
         AND src.superseded_run IS NULL AND dst.superseded_run IS NULL`,
    ).all(symbol) as Array<{ symbol: string; file: string | null; line: number | null }>;
    const mappedUses = uses.map((u) => ({ symbol: u.symbol, file: u.file ?? "", line: u.line ?? 0 }));
    const isTestPath = (f: string): boolean => /(test|spec|mock|fixture)/i.test(f);
    const testReach = [
      ...q.callers.filter((c) => isTestPath(c.file)).map((c) => ({ symbol: c.caller, file: c.file, line: c.line })),
      ...mappedUses.filter((u) => isTestPath(u.file)),
    ];
    return { symbol, callers: q.callers, reaches: imp.reaches, uses: mappedUses, testReach };
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
      const q = whoCalls(storePath, symbol);
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
