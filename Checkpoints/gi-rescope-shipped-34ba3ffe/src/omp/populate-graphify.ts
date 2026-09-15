// PORTED FROM src/omp/populate-corbell.ts:1-121 (checkout-path + freshness probe + supersede-then-insert + named NOT_WARM discipline) + fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/graph/corbell-adapter.ts:340-353 (warm-index skip: the index is built EXPLICITLY, hunts/queries READ).
// src/omp/populate-graphify.ts
// THE GRAPHIFY POPULATE LEG (W1) — the third substrate leg beside corbell and
// the mechanical regex fallback. Reads the warm graph.json (written
// EXPLICITLY by scripts/graphify-build.ts — D3 explicit-CLI decision, the
// corbell warm-index law) through GraphifyAdapter + writes the typed rows
// into the session store with the SAME supersede discipline as corbell.
//
// DEFAULT substrate stays corbell — this leg fires ONLY when explicitly
// invoked (the script path) or when profile.graph.substrate === 'graphify'.
// Zero behavior change for existing sessions.

import * as fs from "node:fs";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import {
  GraphifyAdapter,
  mapGraphifyToTyped,
  resolveGraphifyOut,
} from "../hunter/graph/graphify-adapter.ts";
import {
  type ForkEdge,
  type ForkNode,
  insertForkEdgesBatch,
  insertForkNodesBatch,
  openTypedStore,
  setMeta,
} from "./typed-write.ts";
import type { BuildResult } from "../hunter/graph/interface.ts";
import type { ProjectProfile } from "../hunter/profile/schema.ts";

export const GRAPHIFY_CHECKOUT_REL = ".omp/graph-intelligence/graphify-checkout/store.sqlite";
export const GRAPHIFY_FRESHNESS_BUDGET = 500;

export interface GraphifyPopulateResult {
  ok: boolean;
  reason?: string;
  nodes: number;
  edges: number;
  checkoutPath: string;
  graphPath: string;
}

export function graphifyCheckoutPath(root: string): string {
  return path.join(root, GRAPHIFY_CHECKOUT_REL);
}

export function graphifyOutPath(root: string, profile?: ProjectProfile): string {
  if (profile) return resolveGraphifyOut(profile);
  return path.join(path.resolve(root), "graphify-out", "graph.json");
}

/** Freshness probe (populate-corbell.ts:32-65 shape, budgeted): stale when any
 *  indexed-class source file is NEWER than the warm graph.json — the query
 *  must then fall back LOUDLY, never silently serve a stale graph. */
export function isGraphifyCheckoutFreshFor(
  root: string,
  graphPath: string,
): { fresh: boolean; reason: string } {
  if (!fs.existsSync(graphPath)) return { fresh: false, reason: "absent" };
  const st = fs.statSync(graphPath);
  if (st.size === 0) return { fresh: false, reason: "empty" };
  const warmMtime = st.mtimeMs;
  let newest = 0;
  const budget = { n: GRAPHIFY_FRESHNESS_BUDGET };
  const walk = (dir: string): void => {
    if (budget.n <= 0) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (budget.n <= 0) return;
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "dist", "build", "coverage", "__pycache__", "graphify-out"].includes(entry.name)) continue;
        budget.n--;
        walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        budget.n--;
        try {
          const m = fs.statSync(path.join(dir, entry.name)).mtimeMs;
          if (m > newest) newest = m;
        } catch { /* unreadable file — skip */ }
      }
    }
  };
  walk(root);
  if (newest > warmMtime) return { fresh: false, reason: "stale" };
  return { fresh: true, reason: "fresh" };
}

function minimalGraphifyProfile(root: string): ProjectProfile {
  const resolved = path.resolve(root);
  const slug = path.basename(resolved).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "target";
  return {
    profileVersion: 1,
    project: {
      name: slug,
      root: resolved,
      languages: ["typescript"],
      entryPoints: ["src/main.ts"],
      build: "bun run build",
      test: "bun test",
    },
    graph: { substrate: "graphify", scope: ["src"], excludes: [] },
    rules: { corpus: [], bindings: {} },
    pipeline: { stages: [{ id: "s1", entry: "main", contract: "graphify-populate" }] },
    history: { failureLogs: [] },
    awareness: { docs: [] },
  };
}

/** Populate a SESSION store from the warm graph.json (the explicit-build
 *  contract: graph.json must exist and be fresh — extraction NEVER happens
 *  here; run scripts/graphify-build.ts first). storePath MUST be
 *  session-shaped (openTypedStore refuses anything else).
 *
 *  Operational misses (absent/empty/stale graph, empty build) return
 *  {ok:false, reason} with the named token — never a throw, never silent.
 *  A LINELESS_NODE from the typed projection propagates LOUD (a data defect,
 *  owned by the hunter map branch — not an operational state). */
export async function populateFromGraphifyCheckout(
  storePath: string,
  root: string,
  runTag: string,
  profile?: ProjectProfile,
): Promise<GraphifyPopulateResult> {
  const resolvedRoot = path.resolve(root);
  const base = profile ?? minimalGraphifyProfile(resolvedRoot);
  const pinned: ProjectProfile = {
    ...base,
    project: { ...base.project, root: resolvedRoot },
  };
  const graphPath = resolveGraphifyOut(pinned);
  const checkoutPath = graphifyCheckoutPath(resolvedRoot);
  const freshness = isGraphifyCheckoutFreshFor(resolvedRoot, graphPath);
  if (!freshness.fresh) {
    return { ok: false, reason: `GRAPHIFY_NOT_WARM:${freshness.reason}`, nodes: 0, edges: 0, checkoutPath, graphPath };
  }
  let build: BuildResult;
  try {
    build = await new GraphifyAdapter(pinned).build(pinned);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: msg.slice(0, 200), nodes: 0, edges: 0, checkoutPath, graphPath };
  }
  if (build.nodes.length === 0) {
    return { ok: false, reason: "GRAPH_EMPTY:graphify graph produced zero nodes", nodes: 0, edges: 0, checkoutPath, graphPath };
  }
  const { nodeRows, edgeRows } = mapGraphifyToTyped(build.nodes, build.edges, runTag);
  const db = openTypedStore(storePath);
  try {
    db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
    db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
    db.exec("BEGIN IMMEDIATE;");
    const nodeInserts: ForkNode[] = nodeRows.map((r) => ({
      canonicalId: r.canonicalId,
      kind: r.kind,
      label: r.label,
      file: r.file,
      line: r.line,
      run: runTag,
    }));
    const edgeInserts: ForkEdge[] = edgeRows.map((r) => ({
      srcCanonical: r.srcCanonical,
      dstCanonical: r.dstCanonical,
      predicate: r.predicate,
      evidence: r.evidence,
      run: runTag,
    }));
    insertForkNodesBatch(db, nodeInserts);
    insertForkEdgesBatch(db, edgeInserts);
    db.exec("COMMIT;");
  } finally {
    db.close();
  }
  setMeta(storePath, "substrate", "graphify");
  setMeta(storePath, "graphify_graph", graphPath);
  setMeta(storePath, "graphify_nodes", String(nodeRows.length));
  setMeta(storePath, "graphify_edges", String(edgeRows.length));
  setMeta(storePath, "populated_at", new Date().toISOString());
  console.error(
    `[gi-omp] populate substrate=graphify graph=${graphPath} nodes=${nodeRows.length} edges=${edgeRows.length}`,
  );
  return { ok: true, nodes: nodeRows.length, edges: edgeRows.length, checkoutPath, graphPath };
}

/** Inspection-checkout writer (the scripts/graphify-build.ts path): the SAME
 *  typed DDL + the SAME batch writers + the SAME supersede discipline as
 *  writeCorbellCheckout in store-map.ts, against a bare sqlite file that is
 *  NOT a session store. NEVER use for session data. */
export function writeGraphifyCheckout(
  checkoutPath: string,
  nodeRows: ForkNode[],
  edgeRows: ForkEdge[],
  opts?: { runTag?: string },
): { nodes: number; edges: number; runTag: string; storeNodes: number; storeEdges: number } {
  const runTag = opts?.runTag ?? `graphify-checkout-${Date.now().toString(36)}`;
  const taggedNodes = nodeRows.map((r) => ({ ...r, run: runTag }));
  const taggedEdges = edgeRows.map((r) => ({ ...r, run: runTag }));
  fs.mkdirSync(checkoutPath.slice(0, checkoutPath.lastIndexOf("/")), { recursive: true });
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
    insertForkNodesBatch(db, taggedNodes);
    insertForkEdgesBatch(db, taggedEdges);
    db.exec("COMMIT;");
    const nRow = db.query("SELECT COUNT(*) AS n FROM typed_nodes WHERE superseded_run IS NULL").get() as { n: number };
    const eRow = db.query("SELECT COUNT(*) AS n FROM typed_edges WHERE superseded_run IS NULL").get() as { n: number };
    return { nodes: taggedNodes.length, edges: taggedEdges.length, runTag, storeNodes: Number(nRow.n), storeEdges: Number(eRow.n) };
  } finally {
    db.close();
  }
}
