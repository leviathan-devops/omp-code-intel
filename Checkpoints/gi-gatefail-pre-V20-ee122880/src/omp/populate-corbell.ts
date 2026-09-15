// Corbell-first populate (port wave W1 — the substrate demotion law).
// The parse-grade corbell checkout is the PRIMARY populate; the mechanical regex
// indexer in populate.ts is the NAMED fallback. Every fallback fires with a
// token + reason + the warm command — no silent substitutes (port law).
//
// Warm path: <root>/.omp/graph-intelligence/corbell-checkout/store.sqlite —
// written by scripts/corbell-build.ts (the fork's warm-index contract: the
// build is EXPLICIT; hunts/queries READ the warm store — HT-BUG-16 orphan law).
import * as fs from "node:fs";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { type ForkEdge, type ForkNode, insertForkEdgesBatch, insertForkNodesBatch, openTypedStore } from "./typed-write.ts";

export const CORBELL_CHECKOUT_REL = ".omp/graph-intelligence/corbell-checkout/store.sqlite";
export const CORBELL_FRESHNESS_BUDGET = 500;

export interface CorbellPopulateResult {
  ok: boolean;
  reason?: string;
  nodes: number;
  edges: number;
  checkoutPath: string;
}

export function corbellCheckoutPath(root: string): string {
  return path.join(root, CORBELL_CHECKOUT_REL);
}

// The freshness probe (fork project-scope.ts isStale shape, budgeted): stale when
// any indexed-class source file is NEWER than the warm store — the query must
// then fall back LOUDLY, never silently serve a stale graph.
export function isCorbellCheckoutFreshFor(root: string, warmPath: string): { fresh: boolean; reason: string } {
  if (!fs.existsSync(warmPath)) return { fresh: false, reason: "absent" };
  const st = fs.statSync(warmPath);
  if (st.size === 0) return { fresh: false, reason: "empty" };
  const warmMtime = st.mtimeMs;
  let newest = 0;
  const budget = { n: CORBELL_FRESHNESS_BUDGET };
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
        if (["node_modules", ".git", "dist", "build", "coverage", "__pycache__", "corbell-data", ".omp"].includes(entry.name)) continue;
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

export function populateFromCorbellCheckout(storePath: string, root: string, runTag: string): CorbellPopulateResult {
  const warmPath = corbellCheckoutPath(root);
  const freshness = isCorbellCheckoutFreshFor(root, warmPath);
  if (!freshness.fresh) {
    return { ok: false, reason: `CORBELL_NOT_WARM:${freshness.reason}`, nodes: 0, edges: 0, checkoutPath: warmPath };
  }
  // Read the warm typed rows (the checkout store IS the typed schema — same
  // canonical_id/kind/label/file/line + src/dst/predicate/evidence_quote shape).
  let rows: { canonical_id: string; kind: string; label: string; file: string | null; line: number | null }[] = [];
  let edges: { src_canonical: string; dst_canonical: string; predicate: string; evidence_quote: string; confidence: number }[] = [];
  const src = new Database(warmPath, { readonly: true });
  try {
    rows = src.query(
      "SELECT canonical_id, kind, label, file, line FROM typed_nodes WHERE superseded_run IS NULL",
    ).all() as typeof rows;
    edges = src.query(
      "SELECT src_canonical, dst_canonical, predicate, evidence_quote, confidence FROM typed_edges WHERE superseded_run IS NULL",
    ).all() as typeof edges;
  } catch (e) {
    return { ok: false, reason: `CORBELL_NOT_WARM:unreadable:${e instanceof Error ? e.message.slice(0, 60) : String(e)}`, nodes: 0, edges: 0, checkoutPath: warmPath };
  } finally {
    src.close();
  }
  if (rows.length === 0) {
    return { ok: false, reason: "CORBELL_NOT_WARM:zero-rows", nodes: 0, edges: 0, checkoutPath: warmPath };
  }
  // Write into the session store, superseding the previous run's rows.
  const db = openTypedStore(storePath);
  try {
    db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
    db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
    db.exec("BEGIN IMMEDIATE;");
    const nodeRows: ForkNode[] = rows.map((r) => ({
      canonicalId: r.canonical_id,
      kind: r.kind,
      label: r.label,
      file: r.file,
      line: r.line,
      run: runTag,
    }));
    const edgeRows: ForkEdge[] = edges.map((e) => ({
      srcCanonical: e.src_canonical,
      dstCanonical: e.dst_canonical,
      predicate: e.predicate,
      evidence: e.evidence_quote,
      run: runTag,
    }));
    insertForkNodesBatch(db, nodeRows);
    insertForkEdgesBatch(db, edgeRows);
    db.exec("COMMIT;");
  } finally {
    db.close();
  }
  return { ok: true, nodes: rows.length, edges: edges.length, checkoutPath: warmPath };
}
