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
// The V-16 helper lives in populate-graphify.ts (the graphify wave shipped it
// there); corbell now rides the SAME one-txn supersede discipline (H02/H03).
import { supersedeThenInsert } from "./populate-graphify.ts";

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
  // M03 (qwen 33d64eca): stat can race (removed/permission) — loud absent,
  // never an escaping throw from a probe.
  let st: fs.Stats;
  try {
    st = fs.statSync(warmPath);
  } catch {
    return { fresh: false, reason: "absent" };
  }
  if (st.size === 0) return { fresh: false, reason: "empty" };
  const warmMtime = st.mtimeMs;
  let newest = 0;
  let walkFailed = false;
  // H01 (qwen 33d64eca): budget exhaustion is LOUD — truncated walk answers
  // stale-budget (parity with the graphify probe), never a false-fresh.
  let exhausted = false;
  const budget = { n: CORBELL_FRESHNESS_BUDGET };
  const walk = (dir: string): void => {
    if (budget.n <= 0) { exhausted = true; return; }
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      // V21 cleanup fix-now: ANY unreadable dir sets walkFresh → stale-read-failed.
      // returning made newest stay 0 and an unreadable tree read "fresh".
      if (dir === root) walkFailed = true;
      return;
    }
    for (const entry of entries) {
      if (budget.n <= 0) { exhausted = true; return; }
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "dist", "build", "coverage", "__pycache__", "corbell-data", ".omp"].includes(entry.name)) continue;
        budget.n--;
        walk(path.join(dir, entry.name));
      // H01/M06 (qwen 33d64eca/6768692f): the SAME indexed-class suffix set
      // graphify watches — .js/.py/etc. edits must count as staleness here.
      } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        budget.n--;
        try {
          const m = fs.statSync(path.join(dir, entry.name)).mtimeMs;
          if (m > newest) newest = m;
        } catch { /* unreadable file — skip */ }
      }
    }
  };
  walk(root);
  if (walkFailed) return { fresh: false, reason: "stale-read-failed" };
  if (exhausted) return { fresh: false, reason: "stale-budget" };
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
  // M05 (qwen 33d64eca): confidence is READ from the warm store and must
  // survive the copy — never re-hardcoded to 1.0 on insert. ForkEdge gains
  // an optional confidence; insertForkEdgesBatch honors it (typed-write).

  // V21 cleanup fix-now: the TOCTOU baseline is captured BEFORE the reads.
  const stBefore = (() => { try { return fs.statSync(warmPath).mtimeMs; } catch { return -1; } })();
  let src: Database | null = null;
  try {
    // H04 (qwen 33d64eca): the open is INSIDE the try — a corrupt/locked warm
    // store maps to CORBELL_NOT_WARM:unreadable, never an escaping throw.
    src = new Database(warmPath, { readonly: true });
    rows = src.query(
      "SELECT canonical_id, kind, label, file, line FROM typed_nodes WHERE superseded_run IS NULL",
    ).all() as typeof rows;
    edges = src.query(
      "SELECT src_canonical, dst_canonical, predicate, evidence_quote, confidence FROM typed_edges WHERE superseded_run IS NULL",
    ).all() as typeof edges;
  } catch (e) {
    return { ok: false, reason: `CORBELL_NOT_WARM:unreadable:${e instanceof Error ? e.message.slice(0, 60) : String(e)}`, nodes: 0, edges: 0, checkoutPath: warmPath };
  } finally {
    try { src?.close(); } catch { /* already closed */ }
  }
  // H05 + M109: validate each warm row, then cap at 50k.
  // canonical_id non-empty, kind non-empty, line null or integer>=0.
  // Invalid rows skipped + counted. Over-cap rows skipped + counted separately.
  const MAX_WARM_ROWS = 50_000;
  let skippedInvalid = 0;
  const validRows = rows.filter((r) => {
    const validId = typeof r.canonical_id === "string" && r.canonical_id.length > 0;
    const validKind = typeof r.kind === "string" && r.kind.length > 0;
    const validLine = r.line === null || (Number.isInteger(r.line) && r.line >= 0);
    if (!validId || !validKind || !validLine) {
      skippedInvalid += 1;
      return false;
    }
    return true;
  });
  if (validRows.length === 0) {
    return { ok: false, reason: "CORBELL_NOT_WARM:zero-rows", nodes: 0, edges: 0, checkoutPath: warmPath };
  }
  // V21 W11 + cleanup fix-now: the AFTER stat compares against the BEFORE
  // baseline captured above the reads.
  const freshnessAfter = isCorbellCheckoutFreshFor(root, warmPath);
  const mtimeAfter = (() => { try { return fs.statSync(warmPath).mtimeMs; } catch { return -2; } })();
  if (!freshnessAfter.fresh || mtimeAfter !== stBefore) {
    return { ok: false, reason: "CORBELL_NOT_WARM:changed-mid-read", nodes: 0, edges: 0, checkoutPath: warmPath };
  }
  const materializeRows = validRows.length > MAX_WARM_ROWS ? validRows.slice(0, MAX_WARM_ROWS) : validRows;
  const materializeSkipped = skippedInvalid + (validRows.length - materializeRows.length);

    // Write into the session store, superseding the previous run's rows.
  // H02+H03 (qwen 33d64eca): supersede + insert + meta ride ONE transaction
  // with ROLLBACK (the V-16 helper discipline, corbell parity). Before: the
  // two UPDATEs ran in AUTOCOMMIT before BEGIN — a mid-insert throw left the
  // previous run wiped with nothing committed; a throw inside BEGIN skipped
  // COMMIT with no ROLLBACK (held WAL lock, escaping throw). The helper owns
  // BEGIN/COMMIT/ROLLBACK/close for exactly one unit of work.
  // CRITICAL fix: nodeRows maps from materializeRows (validated + capped),
  // NOT from the raw unvalidated rows — invalid/over-cap rows were being written.
  const nodeRows: ForkNode[] = materializeRows.map((r) => ({
    canonicalId: r.canonical_id,
    kind: r.kind,
    label: r.label,
    file: r.file,
    line: r.line,
    run: runTag,
  }));
  const cappedEdges = edges.length > MAX_WARM_ROWS * 3 ? edges.slice(0, MAX_WARM_ROWS * 3) : edges;
  const edgeRows: ForkEdge[] = cappedEdges.map((e) => ({
    srcCanonical: e.src_canonical,
    dstCanonical: e.dst_canonical,
    predicate: e.predicate,
    evidence: e.evidence_quote,
    confidence: typeof e.confidence === "number" && Number.isFinite(e.confidence) ? e.confidence : 1.0,
    run: runTag,
  }));
  let db: ReturnType<typeof openTypedStore>;
  try {
    db = openTypedStore(storePath);
    // Caller owns close (the helper never closes a caller-owned connection).
    supersedeThenInsert(db, runTag, nodeRows, edgeRows, [
      ["substrate", "corbell"],
      ["corbell_checkout", warmPath],
      ["corbell_nodes", String(nodeRows.length)],
      ["corbell_edges", String(edgeRows.length)],
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `CORBELL_WRITE_FAILED:${msg.slice(0, 120)}`, nodes: 0, edges: 0, checkoutPath: warmPath };
  } finally {
    try { db.close(); } catch (closeErr) { console.error(`[gi-omp] store close warning: ${closeErr instanceof Error ? closeErr.message : String(closeErr)}`); }
  }
  return { ok: true, nodes: rows.length, edges: edges.length, checkoutPath: warmPath };
}
