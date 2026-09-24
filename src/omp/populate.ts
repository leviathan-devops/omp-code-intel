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
import { graphifyOutPath, isGraphifyCheckoutFreshFor, supersedeThenInsert, minimalGraphifyProfile } from "./populate-graphify.ts";
import { openTypedStore } from "./typed-write.ts";
// ★ F-PO1 (2026-09-24): the single-txn helper — supersede + inserts + meta ride one
//   BEGIN/COMMIT (populate-corbell.ts already rides it; same discipline here).
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
  /** ★ F-854 FIX (2026-09-24): true when the corbell data committed but the gi_meta batch
   *  did not — callers can warn or retry the metadata instead of reading the success shape
   *  as fully healthy (the silent-degradation class: data landed, meta stale, same shape). */
  metaDegraded?: boolean;
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
    // ★ F-310 FIX (2026-09-24): three setMeta() calls each opened+closed the store (3 handles
    // ★ per populate, 3x the open/verify/open-close overhead + 3 non-atomic commits). One handle,
    // ★ one transaction: all three meta rows land atomically or none do.
    const db = openTypedStore(storePath);
    // ★ F-854 FIX (2026-09-24): the degradation flag — set in the catch below, read in the return.
    let metaDegraded = false;
    try {
      db.exec("BEGIN IMMEDIATE;");
      try {
        db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["substrate", "corbell"]);
        db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["corbell_checkout", corbell.checkoutPath]);
        db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["populated_at", new Date().toISOString()]);
        db.exec("COMMIT;");
      } catch (e) {
        try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
        // ★ F-711 FIX (2026-09-24): the corbell data already committed - a meta-row failure must
        // DEGRADE, not throw past a PopulateResult-typed function (no live caller catches
        // GI_META_WRITE_FAILED; it escaped as an uncaught exception). LOUD on stderr, honest
        // success for the data that did land.
        // ★ F-854 FIX (2026-09-24): NAME the degradation on the result — metaDegraded: true
        //   so callers detect stale metadata programmatically (was stderr-only, invisible).
        metaDegraded = true;
        console.error(`[gi-omp] GI_META_WRITE_FAILED: batch meta write for ${storePath} did not commit (${e instanceof Error ? e.message : String(e)}) - data populated, meta degraded`);
      }
    } finally {
      db.close();
    }
    console.error(`[gi-omp] populate substrate=corbell checkout=${corbell.checkoutPath} nodes=${corbell.nodes} edges=${corbell.edges}`);
    return {
      filesIndexed: 0,
      nodes: corbell.nodes,
      edges: corbell.edges,
      runTag,
      skipped: false,
      substrate: "corbell",
      // ★ F-854: present-and-true ONLY on the degraded path (absent otherwise, so the
      //   success shape is byte-identical to before for exact-shape assertions).
      ...(metaDegraded ? { metaDegraded: true } : {}),
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
  // ★ F-359 FIX (2026-09-24): ride the SHARED profile builder — the inline
  //   `{ project: { root } }` lacked name/languages/entryPoints/build/test (TS2739).
  const built = new GraphifyAdapter(minimalGraphifyProfile(resolvedRoot)).buildSync(graphPath);
  const { nodeRows, edgeRows } = mapGraphifyToTyped(built.nodes, built.edges, runTag);
  if (nodeRows.length === 0) {
    const reason = "GRAPH_EMPTY:graphify graph produced zero nodes";
    console.error(`[gi-omp] populate substrate=graphify miss: ${reason} (graph=${graphPath})`);
    return { filesIndexed: 0, nodes: 0, edges: 0, runTag, skipped: true, substrate: "graphify", fallbackReason: reason, graphifyGraph: graphPath };
  }
  // ★ F-PO1 FIX (2026-09-24): the supersede UPDATEs ran in autocommit BEFORE BEGIN and
  //   no ROLLBACK existed — an insert throw voided live rows with no replacement, and the
  //   5x setMeta reopened the DB after close (partial meta on failure). One BEGIN/COMMIT
  //   covers supersede + inserts + meta; any throw → ROLLBACK → NAMED throw.
  const db = openTypedStore(storePath);
  // ★ F-46 FIX (2026-09-24): the close sat outside the try — any throw between open and close leaked the handle. The finally owns the close on every path.
  try {
    try {
      supersedeThenInsert(db, runTag, nodeRows, edgeRows, [
        ["substrate", "graphify"],
        ["graphify_graph", graphPath],
        ["graphify_nodes", String(nodeRows.length)],
        ["graphify_edges", String(edgeRows.length)],
        ["populated_at", new Date().toISOString()],
      ]);
    } catch (e) {
      // ★ F-947 FIX (2026-09-24): keep the cause chain — the re-wrap kept only the
      //   message and dropped the original stack/properties. Text unchanged.
      throw new Error(`GRAPHIFY_WRITE_FAILED: session store write for ${resolvedRoot} did not commit (${e instanceof Error ? e.message : String(e)})`, { cause: e });
    }
  } finally {
    try { db.close(); } catch { /* close best-effort on every path */ }
  }
  console.error(`[gi-omp] populate substrate=graphify graph=${graphPath} nodes=${nodeRows.length} edges=${edgeRows.length}`);
  return { filesIndexed: 0, nodes: nodeRows.length, edges: edgeRows.length, runTag, skipped: false, substrate: "graphify", graphifyGraph: graphPath };
}

