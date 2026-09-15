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
import { Database } from "bun:sqlite";
import type { GraphEdge, GraphNode } from "./interface.ts";
import {
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
      const line = fs.readFileSync(file, "utf8").split("\n")[lineNo - 1]?.trim();
      if (line && line.length > 0) return line.slice(0, 500);
    } catch {
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
  const db = openTypedStore(storePath);
  try {
    db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
    db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
    db.exec("BEGIN IMMEDIATE;");
    insertForkNodesBatch(db, nodeRows);
    insertForkEdgesBatch(db, edgeRows);
    db.exec("COMMIT;");
  } finally {
    db.close();
  }
  return {
    nodes: nodeRows.length,
    edges: edgeRows.length,
    runTag,
    storeNodes: countTypedNodes(storePath),
    storeEdges: countTypedEdges(storePath),
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
  const fsMod = fs;
  fsMod.mkdirSync(checkoutPath.slice(0, checkoutPath.lastIndexOf("/")), { recursive: true });
  const db = new Database(checkoutPath, { create: true });
  try {
    db.exec("PRAGMA journal_mode = WAL;");
    db.run(`CREATE TABLE IF NOT EXISTS typed_nodes (
    id INTEGER PRIMARY KEY,
    canonical_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    label TEXT NOT NULL,
    file TEXT,
    line INTEGER,
    created_run TEXT NOT NULL,
    superseded_run TEXT
  )`);
    db.run(`CREATE TABLE IF NOT EXISTS typed_edges (
    id INTEGER PRIMARY KEY,
    src_canonical TEXT NOT NULL,
    dst_canonical TEXT NOT NULL,
    predicate TEXT NOT NULL,
    evidence_quote TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    created_run TEXT NOT NULL,
    superseded_run TEXT
  )`);
    db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
    db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
    db.exec("BEGIN IMMEDIATE;");
    insertForkNodesBatch(db, nodeRows);
    insertForkEdgesBatch(db, edgeRows);
    db.exec("COMMIT;");
    const nRow = db.query("SELECT COUNT(*) AS n FROM typed_nodes WHERE superseded_run IS NULL").get() as { n: number };
    const eRow = db.query("SELECT COUNT(*) AS n FROM typed_edges WHERE superseded_run IS NULL").get() as { n: number };
    return { nodes: nodeRows.length, edges: edgeRows.length, runTag, storeNodes: Number(nRow.n), storeEdges: Number(eRow.n) };
  } finally {
    db.close();
  }
}
