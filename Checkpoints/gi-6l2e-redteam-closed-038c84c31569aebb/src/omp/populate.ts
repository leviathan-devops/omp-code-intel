// populate — the THIN ROUTER. HARD DEPENDENCY ON ALL GRAPH SYSTEMS:
// corbell (parse-grade checkout, PRIMARY, DEFAULT) or graphify (explicit
// substrate only). When neither is available the populate FAILS LOUDLY with
// GI_POPULATE_FAILED — NEVER a regex substitute (the indexer-fallback was
// a BANNED wrong-answer architecture, removed per operator ruling F-48).
// Run-tagged rows; supersede on re-run.
import * as path from "node:path";
import { setMeta } from "./typed-write.ts";
import { populateFromCorbellCheckout } from "./populate-corbell.ts";
import { GraphifyAdapter, mapGraphifyToTyped } from "../hunter/graph/graphify-adapter.ts";
import { graphifyOutPath, isGraphifyCheckoutFreshFor } from "./populate-graphify.ts";
import { openTypedStore, insertForkNodesBatch, insertForkEdgesBatch } from "./typed-write.ts";
export interface PopulateResult {
  filesIndexed: number;
  nodes: number;
  edges: number;
  runTag: string;
  skipped: boolean;
  /** Substrate law (post F-48): 'corbell' = the parse-grade checkout (PRIMARY,
  DEFAULT); 'graphify' = the graphify graph.json leg (explicit substrate only).
  There is NO third substrate. When neither is available the populate fails
  loudly (GI_POPULATE_FAILED), never silently, never via a regex substitute. */
  substrate?: "corbell" | "graphify";
  fallbackReason?: string;
  corbellCheckout?: string;
  graphifyGraph?: string;
}

export function populateSessionStore(storePath: string, root: string, runTag = "populate-" + Date.now().toString(36), opts?: { substrate?: "corbell" | "graphify" }): PopulateResult {
  // THE SUBSTRATE SWITCH (GI-OMP full-port W1): explicit substrate only —
  // DEFAULT stays corbell (zero behavior change for existing sessions).
  // opts.substrate === 'graphify' runs the graphify graph.json leg; anything
  // else (or absent) runs the corbell-first path below, untouched.
  if (opts?.substrate === "graphify") {
    return populateGraphifySessionStore(storePath, root, runTag);
  }
  const corbell = populateFromCorbellCheckout(storePath, root, runTag);
  if (corbell.ok) {
    setMeta(storePath, "substrate", "corbell");
    setMeta(storePath, "corbell_checkout", corbell.checkoutPath);
    setMeta(storePath, "populated_at", new Date().toISOString());
    console.error(`[gi-omp] populate substrate=corbell checkout=${corbell.checkoutPath} nodes=${corbell.nodes} edges=${corbell.edges}`);
    return {
      filesIndexed: 0,
      nodes: corbell.nodes,
      edges: corbell.edges,
      runTag,
      skipped: false,
      substrate: "corbell",
      corbellCheckout: corbell.checkoutPath,
    };
  }
  // F-48 HARD DEPENDENCY LAW: when corbell is unavailable, FAIL LOUDLY.
  // The regex indexer that used to live here (~250 lines: collectTsFiles +
  // parseExports + EXPORT_STAR/BARE_CALL scans) was a BANNED wrong-answer
  // architecture — a named regex-fake graph is still a fake graph.
  const reason = `GI_POPULATE_FAILED:${corbell.reason ?? "CORBELL_NOT_WARM"}`;
  console.error(`[gi-omp] populate LOUD FAIL (no regex fallback): ${reason} (warm with: bun scripts/corbell-build.ts --target '${root}')`);
  return {
    filesIndexed: 0,
    nodes: 0,
    edges: 0,
    runTag,
    skipped: true,
    substrate: undefined,
    fallbackReason: reason,
    corbellCheckout: corbell.checkoutPath,
  };
}
function populateGraphifySessionStore(storePath: string, root: string, runTag: string, scope?: string[]): PopulateResult {
  const resolvedRoot = path.resolve(root);
  const graphPath = graphifyOutPath(resolvedRoot);
  // H05 (qwen 33d64eca): the probe walks the CALLER's scope when provided
  // (session bridge path) — never a blind ["src"] default.
  const freshness = isGraphifyCheckoutFreshFor(resolvedRoot, graphPath, scope ?? ["src"]);
  if (!freshness.fresh) {
    const reason = `GRAPHIFY_NOT_WARM:${freshness.reason}`;
    console.error(`[gi-omp] populate substrate=graphify miss: ${reason} (build with: bun scripts/graphify-build.ts --target '${root}')`);
    return { filesIndexed: 0, nodes: 0, edges: 0, runTag, skipped: true, substrate: "graphify", fallbackReason: reason, graphifyGraph: graphPath };
  }
  const built = new GraphifyAdapter({ project: { root: resolvedRoot } } as never).buildSync(graphPath);
  const { nodeRows, edgeRows } = mapGraphifyToTyped(built.nodes, built.edges, runTag);
  if (nodeRows.length === 0) {
    const reason = "GRAPH_EMPTY:graphify graph produced zero nodes";
    console.error(`[gi-omp] populate substrate=graphify miss: ${reason} (graph=${graphPath})`);
    return { filesIndexed: 0, nodes: 0, edges: 0, runTag, skipped: true, substrate: "graphify", fallbackReason: reason, graphifyGraph: graphPath };
  }
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
  setMeta(storePath, "substrate", "graphify");
  setMeta(storePath, "graphify_graph", graphPath);
  setMeta(storePath, "graphify_nodes", String(nodeRows.length));
  setMeta(storePath, "graphify_edges", String(edgeRows.length));
  setMeta(storePath, "populated_at", new Date().toISOString());
  console.error(`[gi-omp] populate substrate=graphify graph=${graphPath} nodes=${nodeRows.length} edges=${edgeRows.length}`);
  return { filesIndexed: 0, nodes: nodeRows.length, edges: edgeRows.length, runTag, skipped: false, substrate: "graphify", graphifyGraph: graphPath };
}

