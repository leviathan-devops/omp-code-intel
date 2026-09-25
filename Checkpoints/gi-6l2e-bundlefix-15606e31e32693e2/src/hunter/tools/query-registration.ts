// PORTED FROM fork-v143/live-tree/graph-intelligence/subagents/trident-bug-hunter/tools/query-registration.ts:1-105
// OMP SEAM ADAPTATION: the fork-plugin tool wrapper + the bare zod schema are
// dropped (banned in OMP code); the fork's .trident shared-store path is
// dropped (a cross-session LEAK in OMP — the session store is the ONLY truth).
// This module is READ-ONLY + deterministic: openSessionStore (scope-checked) →
// the hunter openStore handle (applies the hunter DDL additively — the OMP
// typed tables already carry canonical_id/label/file/line/superseded_run, so
// the structural verbs read them directly) → runQuery → JSON. The corbell-
// native verbs (semantic-search/code-search/docs-patterns) have NO surfaces
// wired in OMP — runQuery throws SEMANTIC_UNAVAILABLE / DOCS_UNAVAILABLE
// loudly (the wire, never a reimplementation, never a silent empty).
import { openSessionStore } from "../../omp/store-open.ts";
import { openStore } from "../shared/db.ts";
import { runQuery, type QueryVerb } from "../surface/query-tool.ts";

/** THE 7 STRUCTURAL VERBS + the 2 awareness verbs — the OMP query surface.
 *  The 3 corbell-native verbs are accepted by the type but fail LOUD at runtime
 *  (SEMANTIC_UNAVAILABLE / DOCS_UNAVAILABLE) until their surfaces are wired. */
export const STRUCTURAL_VERBS: readonly QueryVerb[] = [
  "who-calls",
  "chain",
  "must-implement",
  "unwired",
  "rule",
  "violations",
  "consistency",
  "blast-radius",
  "would-break",
];

/** The query args — the session identity replaces the fork's targetPath (the
 *  project-root store path). The caller reads ONLY its own session store. */
export interface SessionQueryArgs {
  sessionId: string;
  scopeRoot: string;
  verb: QueryVerb;
  symbol?: string;
  from?: string;
  to?: string;
  ruleId?: string;
  week?: string;
  runId?: string;
  query?: string;
  topK?: number;
  format?: "table" | "llm" | "full";
  limit?: number;
  offset?: number;
  proposed?: string;
  depth?: number;
}

/** THE QUERY EXECUTE — the verb runner over THIS session's store, READ-ONLY.
// Fail-closed: a scope refusal (GI_SCOPE_REFUSED) or a corrupt store
// (GI_STORE_CORRUPT) propagates as the named error, never a silent empty.
// The semantic/docs verbs throw SEMANTIC_UNAVAILABLE / DOCS_UNAVAILABLE
// (runQuery's own loud errors — no surfaces are wired in OMP). */
export async function runQueryTool(args: SessionQueryArgs): Promise<string> {
  const opened = openSessionStore({ sessionId: args.sessionId, scopeRoot: args.scopeRoot, callerSessionId: args.sessionId });
  const db = openStore(opened.storePath);
  // ★ F-253 NOTE (2026-09-24): NOT-A-BUG — the open sits OUTSIDE the try, so an
  //   openStore throw never enters the finally (no undefined close, no masked error).
  try {
    const rows = runQuery(
      {
        verb: args.verb,
        symbol: args.symbol,
        from: args.from,
        to: args.to,
        ruleId: args.ruleId,
        week: args.week,
        runId: args.runId,
        query: args.query,
        topK: args.topK,
        format: args.format,
        limit: args.limit,
        offset: args.offset,
        proposed: args.proposed,
        depth: args.depth,
      },
      db,
      undefined,
      undefined,
    );
    return JSON.stringify(rows, null, 2);
  } finally {
    // ★ F-905 FIX (2026-09-24): an unguarded close() throw in finally would mask the try block's original error (db.ts close() calls handle.close() unguarded). Close failure on a read-only handle is non-fatal; the original error stands.
    try { db.close(); } catch { /* close failure is non-fatal; original error preserved */ }
  }
}
