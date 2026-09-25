// OMP-NEW (no fork source file): corbell rows -> OMP session typed store.
// Contract (task): faithful kind mapping with the corbell node_type preserved
// as kind; method_call->predicate 'calls'; flow_step->predicate 'traces-to';
// labels resolved from the node data name fields; evidence_quote is a real
// source line or the node id; confidence 1.0 (the batch writers' default).
//
// Input is the CorbellAdapter's projected rows (readCorbellStore output — the
// SAME rows build() caches, so the store and the adapter never diverge). The
// node_type lookup is recovered from the corbell workspace.db when the caller
// passes it (the CLI does): adapter kind 'module' is ambiguous
// (service/datastore/queue all map to it), so the raw node_type wins whenever
// it is available; otherwise the adapter kind is kept verbatim (never
// collapsed to the OMP populate File/Function vocabulary).

import * as fs from "node:fs";
// ★ F-256 FIX (2026-09-24): path.dirname for the checkout parent dir (see writeCorbellCheckout).
import * as path from "node:path";
import { Database } from "bun:sqlite";
import type { GraphEdge, GraphNode } from "./interface.ts";
import {
  applyTypedDdl,
  countTypedEdges,
  countTypedNodes,
  insertForkEdgesBatch,
  insertForkNodesBatch,
  openTypedStore,
  type ForkEdge,
  type ForkNode,
} from "../../omp/typed-write.ts";

/** Read the raw corbell node_type per node id from the workspace.db the CLI
 *  build wrote. Keys are adapter node ids (`corbell:<store-id>`) so the map
 *  joins directly onto readCorbellStore rows. Absent db -> empty map (the
 *  caller falls back to the adapter kind); unreadable db -> loud throw. */
export function readCorbellNodeTypes(corbellDbPath: string): Map<string, string> {
  const out = new Map<string, string>();
  if (!fs.existsSync(corbellDbPath)) return out;
  let db: Database;
  try {
    db = new Database(corbellDbPath, { readonly: true });
  } catch (e: unknown) {
    throw new Error(`CORBELL_STORE_READ: cannot open ${corbellDbPath}: ${String(e)}`);
  }
  try {
    const rows = db.query("SELECT id, node_type FROM graph_nodes").all() as Array<{
      id: unknown;
      node_type: unknown;
    }>;
    for (const row of rows) {
      if (typeof row.id === "string" && typeof row.node_type === "string" && row.node_type.length > 0) {
        out.set(`corbell:${row.id}`, row.node_type);
      }
    }
    return out;
  } catch (e: unknown) {
    throw new Error(`CORBELL_STORE_READ: cannot read node types from ${corbellDbPath}: ${String(e)}`);
  } finally {
    db.close();
  }
}

/** The corbell node_type preserved as the typed kind. The raw store type wins
 *  when the lookup has it (disambiguates module <- service/datastore/queue);
 *  derived class nodes (`corbell:class:*`, never in the store) and lookup
 *  misses keep the adapter kind verbatim. */
export function resolveTypedKind(node: GraphNode, nodeTypeById?: Map<string, string>): string {
  const raw = nodeTypeById?.get(node.id);
  if (typeof raw === "string" && raw.length > 0) return raw;
  return node.kind;
}

/** Edge-kind -> typed predicate. Idempotent over both vocabularies: the raw
 *  corbell kinds (method_call, flow_step, ...) AND the adapter's normalized
 *  kinds (calls, traces-to, ...) land on the same predicate. Unknown -> calls
 *  (the adapter's own fallback posture). */
export function corbellEdgeToPredicate(kind: string): string {
  switch (kind) {
    case "method_call":
    case "call":
    case "calls":
    case "git_coupling":
    case "http_call":
      return "calls";
    case "flow_step":
    case "wires":
    case "traces-to":
      return "traces-to";
    case "depends-on":
    case "import":
    case "imports":
      return "imports";
    case "awaits":
    case "await":
      return "awaits";
    default:
      return "calls";
  }
}

/** A real source line from the caller's file at the edge/node line (trimmed,
 *  capped), or the `src -> dst` id pair when no readable line exists. */
// ★ F-6 FIX (2026-09-24): bounded per-file line cache (LRU, 500 files) + clear hook so long-lived processes cannot retain every file forever.
const EDGE_EVIDENCE_CACHE_MAX = 500;
const edgeEvidenceLineCache = new Map<string, string[]>();
export function clearEdgeEvidenceCache(): void { edgeEvidenceLineCache.clear(); }
export function edgeEvidence(edge: GraphEdge, nodesById: Map<string, GraphNode>): string {
  const src = nodesById.get(edge.sourceId);
  const lineNo = edge.line ?? src?.line ?? null;
  const file = src?.file ?? null;
  if (
    typeof file === "string" &&
    file.length > 0 &&
    typeof lineNo === "number" &&
    Number.isFinite(lineNo) &&
    lineNo >= 1
  ) {
    try {
      let lines = edgeEvidenceLineCache.get(file);
      if (lines) {
        // ★ R20-HIGH FIX (2026-09-25): the cache claimed LRU but the eviction was FIFO — a HIT did
        //   not refresh recency, so a hot file used once early was evicted before a cold one. A true
        //   LRU re-inserts the entry on hit (Map preserves insertion order → the front is least-
        //   recently-used). The comment and the behavior now agree.
        edgeEvidenceLineCache.delete(file);
        edgeEvidenceLineCache.set(file, lines);
      }
      if (!lines) {
        // ★ R15 FIX: the unbounded whole-file read blocked the loop, OOM'd on large
        //   files, and followed any absolute path the adapter supplied with a stale
        //   cache in long-lived processes. Cap at 1 MiB / 20k lines (the evidence is
        //   ONE trimmed line); oversized files fall through to the id pair, loud and safe.
        const st = fs.statSync(file);
        if (!st.isFile() || st.size > 1048576) return `${edge.sourceId} -> ${edge.targetId}`;
        lines = fs.readFileSync(file, "utf8").split("\n", 20000);
        edgeEvidenceLineCache.set(file, lines);
        if (edgeEvidenceLineCache.size > EDGE_EVIDENCE_CACHE_MAX) {
          const oldest = edgeEvidenceLineCache.keys().next().value;
          if (oldest !== undefined) edgeEvidenceLineCache.delete(oldest);
        }
      }
      const line = lines[lineNo - 1]?.trim();
      if (line && line.length > 0) return line.slice(0, 500);
    } catch {
      edgeEvidenceLineCache.delete(file);
      // unreadable source — fall through to the id pair
    }
  }
  return `${edge.sourceId} -> ${edge.targetId}`;
}

/** Project adapter rows onto the typed-store row shapes (pure — no I/O). */
export function mapCorbellToTyped(
  nodes: GraphNode[],
  edges: GraphEdge[],
  runTag: string,
  nodeTypeById?: Map<string, string>,
): { nodeRows: ForkNode[]; edgeRows: ForkEdge[] } {
  const nodesById = new Map(nodes.map((n) => [n.id, n] as const));
  const nodeRows: ForkNode[] = nodes.map((n) => ({
    canonicalId: n.id,
    kind: resolveTypedKind(n, nodeTypeById),
    label: n.name,
    file: typeof n.file === "string" ? n.file : null,
    line: typeof n.line === "number" && Number.isFinite(n.line) ? n.line : null,
    run: runTag,
  }));
  const edgeRows: ForkEdge[] = edges.map((e) => ({
    srcCanonical: e.sourceId,
    dstCanonical: e.targetId,
    predicate: corbellEdgeToPredicate(e.kind),
    evidence: edgeEvidence(e, nodesById),
    run: runTag,
  }));
  return { nodeRows, edgeRows };
}

export interface CorbellStoreWriteResult {
  nodes: number;
  edges: number;
  runTag: string;
  storeNodes: number;
  storeEdges: number;
}

/** Write adapter rows into a session-shaped typed store via the EXISTING batch
 *  writers (ONE connection, supersede-then-insert per the populate
 *  discipline). storePath MUST be session-shaped
 *  (.../sessions/{sid}/store.sqlite) — openTypedStore refuses anything else. */
export function writeCorbellToTypedStore(
  storePath: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  opts?: { runTag?: string; nodeTypeById?: Map<string, string> },
): CorbellStoreWriteResult {
  const runTag = opts?.runTag ?? `corbell-${Date.now().toString(36)}`;
  const { nodeRows, edgeRows } = mapCorbellToTyped(nodes, edges, runTag, opts?.nodeTypeById);
  // ★ R15 FIX: the global supersede UPDATEs below ran unconditionally — an empty build
  //   tombstoned every live row with no replacements (a wipe). Empty is INCONCLUSIVE-shaped
  //   (the map actor already refuses GRAPH_EMPTY); this guard is defense in depth at the
  //   writer boundary, never a silent zero-row commit.
  if (nodeRows.length === 0 && edgeRows.length === 0) {
    throw new Error('CORBELL_STORE_WRITE: refusing to supersede the store with empty input (zero nodes + zero edges — a wipe, never a write)');
  }
  const db = openTypedStore(storePath);
  // ★ F-144 FIX (2026-09-24): pre-close verification reads — the counts below are captured before db.close() (see COMMIT site); fresh connections opened AFTER close can miss the close-triggered WAL checkpoint.
  let storeNodes = 0;
  let storeEdges = 0;
  try {
    // ★ F-124 FIX (2026-09-24): the supersede UPDATEs ride INSIDE the transaction.
    //   The old order (supersede AUTOCOMMIT before BEGIN, no ROLLBACK) left ZERO live
    //   rows with no replacements if a later insert threw — the exact BLAST-CRITICAL
    //   defect the sibling path already fixed; this path was missed.
    db.exec("BEGIN IMMEDIATE;");
    try {
      db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
      db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
      insertForkNodesBatch(db, nodeRows);
      insertForkEdgesBatch(db, edgeRows);
      // ★ F-515 FIX (2026-09-24): the session writer records its own provenance IN THE SAME
      //   TRANSACTION (the checkout path's P3 discipline) — a session store without
      //   populated_at is stale-by-construction to layerFreshness, whatever the caller does later.
      db.run(
        "INSERT INTO gi_meta (key, value) VALUES ('populated_at', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [new Date().toISOString()],
      );
      db.run(
        "INSERT INTO gi_meta (key, value) VALUES ('substrate', 'corbell') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [],
      );
      db.exec("COMMIT;");
      // ★ F-144 FIX (2026-09-24): verification reads ride the pre-close order — the writer has committed but not yet closed, so the fresh-reader helpers see the commit.
      storeNodes = countTypedNodes(storePath);
      storeEdges = countTypedEdges(storePath);
    } catch (e) {
      try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
      throw e;
    }
  } finally {
    db.close();
  }
  return {
    nodes: nodeRows.length,
    edges: edgeRows.length,
    runTag,
    storeNodes,
    storeEdges,
  };
}

/** Inspection-checkout writer (the scripts/corbell-build.ts path): the SAME
 *  typed DDL + the SAME batch writers + the SAME supersede discipline as the
 *  session writer above, but against a bare sqlite file that is NOT a session
 *  store. openTypedStore MUST refuse the checkout path (no
 *  /sessions/{sid}/ segment — the AP-1/AP-2 leak guard), so this opens
 *  bun:sqlite directly and applies the typed-write DDL statements inline
 *  (duplicated by necessity: the DDL const is module-private in typed-write).
 *  NEVER use for session data — sessions go through writeCorbellToTypedStore. */
export function writeCorbellCheckout(
  checkoutPath: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  opts?: { runTag?: string; nodeTypeById?: Map<string, string> },
): CorbellStoreWriteResult {
  const runTag = opts?.runTag ?? `corbell-checkout-${Date.now().toString(36)}`;
  const { nodeRows, edgeRows } = mapCorbellToTyped(nodes, edges, runTag, opts?.nodeTypeById);
  // ★ R15 FIX: same empty-supersede class as the session writer above — an empty checkout
  //   build must not tombstone the checkout's live rows with no replacements.
  if (nodeRows.length === 0 && edgeRows.length === 0) {
    throw new Error('CORBELL_STORE_WRITE: refusing to supersede the checkout with empty input (zero nodes + zero edges — a wipe, never a write)');
  }
  const fsMod = fs;
  // ★ F-256 FIX (2026-09-24): bare filenames broke the parent math — "store.sqlite".lastIndexOf("/") is -1, so slice(0,-1) mkdir'd "store.sqlit" (silent wrong dir). path.dirname() is total: "store.sqlite"->".", "a/b.sqlite"->"a".
  fsMod.mkdirSync(path.dirname(checkoutPath), { recursive: true });
  const db = new Database(checkoutPath, { create: true });
  try {
    db.exec("PRAGMA journal_mode = WAL;");
    // ★ EN-070 — THE SCHEMA IS THE AUTHORITY'S, NOT A DUPLICATE. This function created
    //   its OWN typed_nodes WITHOUT layer_id, while `insertForkNodesBatch` (imported from
    //   the same module this imports) INSERTS layer_id — so every checkout write died with
    //   SQLITE_ERROR "no such column: layer_id". Two CREATE TABLE typed_nodes existed and
    //   the stale one won on a fresh database. `applyTypedDdl` is the single schema: it
    //   carries layer_id, the CHECK constraints, the UNIQUE indexes AND the dedup-recovery
    //   for legacy stores. A second copy of a schema is a second source of truth, and the
    //   two WILL drift.
    applyTypedDdl(db);
    // BLAST CRITICAL fix (qwen corbell-leg circuit): supersede + inserts ride
    // ONE transaction with ROLLBACK — the old split (supersede AUTOCOMMIT
    // before BEGIN, no rollback) left ZERO live rows with no replacements if
    // either batch threw, and dangled the open transaction on close.
    db.exec("BEGIN IMMEDIATE;");
    try {
      db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
      db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
      insertForkNodesBatch(db, nodeRows);
      insertForkEdgesBatch(db, edgeRows);
      // ★ P3 (2026-09-22) — THE WRITER RECORDS ITS OWN PROVENANCE, IN THE SAME TRANSACTION.
      //   Measured: the corbell checkout carried gi_meta with ZERO ROWS — the graph existed
      //   and had NO populated_at, so `layerFreshness` (typed-write.ts:424) refused EVERY
      //   fact read from it as STALE BY CONSTRUCTION. The graph was unusable to the
      //   graph-fact rung the moment it was built, and nothing said so.
      //   ★ AND IT RIDES THE TRANSACTION DELIBERATELY: a graph whose provenance did not
      //   commit with it is a graph that lies about its own age. Both land, or neither.
      db.run(
        "INSERT INTO gi_meta (key, value) VALUES ('populated_at', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [new Date().toISOString()],
      );
      db.run(
        "INSERT INTO gi_meta (key, value) VALUES ('substrate', 'corbell') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [],
      );
      db.run(
        "INSERT INTO gi_meta (key, value) VALUES ('corbell_checkout', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [runTag],
      );
      db.exec("COMMIT;");
    } catch (e) {
      try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
      throw e;
    }
    const nRow = db.query("SELECT COUNT(*) AS n FROM typed_nodes WHERE superseded_run IS NULL").get() as { n: number };
    const eRow = db.query("SELECT COUNT(*) AS n FROM typed_edges WHERE superseded_run IS NULL").get() as { n: number };
    return { nodes: nodeRows.length, edges: edgeRows.length, runTag, storeNodes: Number(nRow.n), storeEdges: Number(eRow.n) };
  } finally {
    db.close();
  }
}
