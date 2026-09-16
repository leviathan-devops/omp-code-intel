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
  TYPED_STORE_DDL,
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
  return resolveGraphifyOut({ project: { root: path.resolve(root) } } as ProjectProfile);
}

/** Freshness probe (populate-corbell.ts:32-65 shape, budgeted): stale when any
 *  indexed-class source file is NEWER than the warm graph.json — the query
 *  must then fall back LOUDLY, never silently serve a stale graph. */
export function isGraphifyCheckoutFreshFor(
  root: string,
  graphPath: string,
  scope: string[] = ["src"],
): { fresh: boolean; reason: string } {
  if (!fs.existsSync(graphPath)) return { fresh: false, reason: "absent" };
  let st: fs.Stats;
  try {
    st = fs.statSync(graphPath);
  } catch {
    return { fresh: false, reason: "absent" };
  }
  const warmMtime = st.mtimeMs;
  let newest = 0;
  let exhausted = false;
  const budget = { n: GRAPHIFY_FRESHNESS_BUDGET };
  const walk = (dir: string): void => {
    if (budget.n <= 0) { exhausted = true; return; }
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (budget.n <= 0) { exhausted = true; return; }
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "dist", "build", "coverage", "__pycache__", "graphify-out", ".omp"].includes(entry.name)) continue;
        budget.n--;
        walk(path.join(dir, entry.name));
      } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        budget.n--;
        try {
          const m = fs.statSync(path.join(dir, entry.name)).mtimeMs;
          if (m > newest) newest = m;
        } catch { /* unreadable file — skip */ }
      }
    }
  };
  for (const rel of scope) {
    const dir = path.isAbsolute(rel) ? rel : path.join(root, rel);
    if (fs.existsSync(dir)) walk(dir);
  }
  if (exhausted) return { fresh: false, reason: "stale-budget" };
  // WARM-WINS: the graph is fresh when NO source file is newer than it.
  // (newest <= warmMtime; the +1000ms tolerance covers same-second writes.)
  if (newest <= warmMtime + 1000) return { fresh: true, reason: "fresh" };
  return { fresh: false, reason: "stale" };
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
  // checkoutPath is the INSPECTION pointer only (scripts/graphify-build.ts
  // writes it); the session rows go to storePath above — callers must not
  // confuse the two (qwen 8a24ae08).
  const checkoutPath = graphifyCheckoutPath(resolvedRoot);
  // H05 (qwen 33d64eca): the probe walks the PROFILE's scope — a custom-scope
  // profile must be checked against ITS file set, never the ["src"] default.
  const freshness = isGraphifyCheckoutFreshFor(resolvedRoot, graphPath, pinned.graph?.scope ?? ["src"]);
  if (!freshness.fresh) {
    return { ok: false, reason: `GRAPHIFY_NOT_WARM:${freshness.reason}`, nodes: 0, edges: 0, checkoutPath, graphPath };
  }
  let build: BuildResult;
  try {
    build = await new GraphifyAdapter(pinned).build(pinned);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const named = /GRAPHIFY_NOT_WARM:|GRAPH_EMPTY:|LINELESS_NODE|GRAPHIFY_GRAPH_TOO_LARGE|GRAPHIFY_EXTRACT_FAILED/.test(msg)
      ? msg.slice(0, 200)
      : `GRAPHIFY_CORRUPT:build-failed (not a warm-miss — investigate, do not rebuild-blindly) ${msg.slice(0, 140)}`;
    return { ok: false, reason: named, nodes: 0, edges: 0, checkoutPath, graphPath };
  }
  if (build.nodes.length === 0) {
    return { ok: false, reason: "GRAPH_EMPTY:graphify graph produced zero nodes", nodes: 0, edges: 0, checkoutPath, graphPath };
  }
  // H17 (qwen 6768692f): the typed projection runs INSIDE its own guard —
  // a LINELESS_NODE (or shape TypeError) is a NAMED data defect result
  // ({ok:false}), never an escaping promise rejection.
  let nodeRows: ForkNode[];
  let edgeRows: ForkEdge[];
  try {
    ({ nodeRows, edgeRows } = mapGraphifyToTyped(build.nodes, build.edges, runTag));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const named = /LINELESS_NODE|GRAPHIFY_/.test(msg) ? msg.slice(0, 200) : `GRAPHIFY_CORRUPT:projection-failed ${msg.slice(0, 140)}`;
    return { ok: false, reason: named, nodes: 0, edges: 0, checkoutPath, graphPath };
  }
  const db = openTypedStore(storePath);
  try {
    // Caller owns close (the helper never closes a caller-owned connection).
    supersedeThenInsert(db, runTag, nodeRows, edgeRows, [
      ["substrate", "graphify"],
      ["graphify_graph", graphPath],
      ["graphify_nodes", String(nodeRows.length)],
      ["graphify_edges", String(edgeRows.length)],
      ["populated_at", new Date().toISOString()],
    ]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `GRAPHIFY_WRITE_FAILED:${msg.slice(0, 160)}`, nodes: 0, edges: 0, checkoutPath, graphPath };
  } finally {
    db.close();
  }
  console.error(
    `[gi-omp] populate substrate=graphify graph=${graphPath} nodes=${nodeRows.length} edges=${edgeRows.length}`,
  );
  return { ok: true, nodes: nodeRows.length, edges: edgeRows.length, checkoutPath, graphPath };
}

/** V-16 FIX (qwen session 1aca90d4): the single-txn helper — supersede +
 *  insert + meta in ONE transaction with ROLLBACK. Before: supersede UPDATEs
 *  ran in autocommit BEFORE BEGIN, so an insert throw lost live rows with no
 *  replacement and no rollback; 5x setMeta reopened the DB after close. Now:
 *  everything rides one connection, one BEGIN IMMEDIATE, one COMMIT; any
 *  throw → ROLLBACK → close → named GRAPHIFY_WRITE_FAILED (loud, never
 *  silent, never half-written). The checkout path below uses the same helper
 *  (DDL single-sourced from typed-write.ts, no drift). */
export function supersedeThenInsert(
  // Caller-owned connection: the caller opens (openTypedStore / new Database)
  // and MUST NOT be inside a transaction (bare BEGIN fails otherwise — the
  // helper owns BEGIN/COMMIT/ROLLBACK/close for exactly one unit of work).
  db: Database,
  runTag: string,
  nodeRows: ForkNode[],
  edgeRows: ForkEdge[],
  meta: Array<[string, string]>,
): void {
  // H07 + re-run-V: PER-TABLE empty guard — a nodes-only batch must not
  // supersede live edges into void (and vice versa). Zero rows in BOTH is
  // the only full refusal.
  if (nodeRows.length === 0 && edgeRows.length === 0) {
    throw new Error("GRAPHIFY_WRITE_FAILED: refusing supersede-then-insert with zero rows (would wipe live data)");
  }
  db.exec("BEGIN IMMEDIATE;");
  try {
    // Per-table guard: only supersede a table we are about to re-populate.
    if (nodeRows.length > 0) {
      db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
      insertForkNodesBatch(db, nodeRows);
    }
    if (edgeRows.length > 0) {
      db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
      insertForkEdgesBatch(db, edgeRows);
    }
    for (const [k, v] of meta) {
      db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [k, v]);
    }
    db.exec("COMMIT;");
  } catch (e) {
    try { db.exec("ROLLBACK;"); } catch { /* already-rolled-back */ }
    throw e;
  }
  // Caller owns close (typed-write batch-writer contract) — the helper never
  // closes a connection it did not open (re-run-V high: close+leak pair).
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
  if (nodeRows.length === 0) throw new Error("GRAPH_EMPTY:graphify checkout refusing empty input (would wipe live inspection rows)");
  const taggedNodes = nodeRows.map((r) => ({ ...r, run: runTag }));
  const taggedEdges = edgeRows.map((r) => ({ ...r, run: runTag }));
  fs.mkdirSync(path.dirname(checkoutPath), { recursive: true });
  const db = new Database(checkoutPath, { create: true });
  try {
    db.exec("PRAGMA journal_mode = WAL;");
    for (const stmt of TYPED_STORE_DDL) db.run(stmt);
    db.exec("BEGIN IMMEDIATE;");
    try {
      db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
      db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
      insertForkNodesBatch(db, taggedNodes);
      insertForkEdgesBatch(db, taggedEdges);
      db.exec("COMMIT;");
    } catch (e) {
      try { db.exec("ROLLBACK;"); } catch { /* already-rolled-back — close still runs */ }
      throw e;
    }
    const nRow = db.query("SELECT COUNT(*) AS n FROM typed_nodes WHERE superseded_run IS NULL").get() as { n: number };
    const eRow = db.query("SELECT COUNT(*) AS n FROM typed_edges WHERE superseded_run IS NULL").get() as { n: number };
    return { nodes: taggedNodes.length, edges: taggedEdges.length, runTag, storeNodes: Number(nRow.n), storeEdges: Number(eRow.n) };
  } finally {
    db.close();
  }
}
