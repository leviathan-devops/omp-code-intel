# HIGH slice 4 — 9 findings across 8 files

## src/hunter/diagnostics/semantic-predicates.ts
- **src/hunter/diagnostics/semantic-predicates.ts:268-268** (bug)
  P6's else-if branch checks for `Checkpoints` and `.trident` in the exclusion list but does NOT check for `dist`, which is explicitly part of the remediation (UNSCOPED_WALKER_REMEDIATION = 'add EXCLUDED_DIRS with Checkpoints .trident dist'). A walker that excludes Checkpoints and .trident but not dist will incorrectly pass this check. The condition should also verify dist is present.
  ```existing
  } else if (!/Checkpoints/i.test(win) || !/\.trident/i.test(win)) {
  ```
  ```suggested
  } else if (!/Checkpoints/i.test(win) || !/\.trident/i.test(win) || !/\bdist\b/i.test(win)) {
  ```

## src/hunter/graph/corbell-adapter.ts
- **src/hunter/graph/corbell-adapter.ts:210-212** (bug)
  Bug: When `opts.timeout` is `undefined` (the common case — no static timeout), the fallback path computes `execTimeout` as `Math.min(undefined, ...)` → `NaN` → `Infinity`. `execSync` with `timeout: Infinity` is not a documented contract in Node.js — it works by accident in some runtimes (treated as no timeout) but is undefined behavior. Should pass `undefined` to execSync to let it run without a timeout.

Additionally, when `retryDeadline === Number.POSITIVE_INFINITY`, the ternary `retryTimeout ?? Number.POSITIVE_INFINITY` always yields `Infinity`, ignoring the `execBudget` calculation that just ran. The intent seems to be that when no deadline exists, each attempt uses the full caller timeout — but the `Math.min` with `Infinity` makes the budget check dead code.

Suggested fix: pass `undefined` as the timeout to execSync when the deadline is infinite, and use explicit branching instead of NaN-coalescing arithmetic.
  ```existing
  const execBudget = retryDeadline - Date.now();
      if (execBudget <= 0) break;
      const execTimeout = retryDeadline === Number.POSITIVE_INFINITY ? retryTimeout : Math.min(retryTimeout ?? Number.POSITIVE_INFINITY, Math.max(1, execBudget));
  ```
  ```suggested
  const execBudget = retryDeadline - Date.now();
      if (execBudget <= 0) break;
      let execTimeout: number | undefined;
      if (retryDeadline === Number.POSITIVE_INFINITY) {
        // No overall deadline — use the caller's per-attempt timeout as-is (or undefined = no timeout).
        execTimeout = retryTimeout;
      } else {
        execTimeout = Math.max(1, Math.min(retryTimeout ?? Infin
  ```
- **src/hunter/graph/corbell-adapter.ts:102-103** (bug)
  Bug (behavioral divergence): `buildCorbellGraphAsync` accepts `opts?.env` but does not inject the `CORBELL_COUPLING_*`, `CORBELL_WALK_EXCLUDE_DIRS`, or `CORBELL_COUPLING_SCOPE` environment variables that the sync `build()` path carefully constructs (lines ~250-280). If an external caller uses the async path for graph builds, the corbell vendor will walk the entire enclosing git repo (months=6, no path filter), reproducing the 742MB store / 30-min D-state stall that the coupling env was specifically designed to prevent.

The sync path even has a comment (line 208) noting this is intentional for the stubbed-exec contract, but the async path is exported as a public function — any caller using it gets a silently different (and dangerous) build behavior.

Suggested fix: accept the same coupling env parameters in `buildCorbellGraphAsync`'s opts, or extract the coupling-env construction into a shared helper that both paths call.
  ```existing
  export function buildCorbellGraphAsync(bin: string, cwd: string, opts?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }): Promise<string> {
  // ★ F-252 FIX (2026-09-24): closed the async twin's two gaps vs the sync path — (1) env passthrough (CORBELL_COUPLING_*/WALK_EXCLUDE knobs were dropped); (2) optional timeoutMs SIGTERMs a hung child and rejects NAMED (default none, per no-static-timeouts or
  ```
  ```suggested
  export function buildCorbellGraphAsync(bin: string, cwd: string, opts?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }): Promise<string> {
  // NOTE: callers MUST pass the coupling env (CORBELL_COUPLING_*, CORBELL_WALK_EXCLUDE_DIRS,
  // CORBELL_COUPLING_SCOPE) to avoid an unbounded git walk. Extract coupling-env construction
  // into a shared helper used by both CorbellAdapter.build() and this 
  ```

## src/hunter/harness/recon.ts
- **src/hunter/harness/recon.ts:118-122** (bug)
  If the SQLite driver used by `openStore` returns `payload` as an already-parsed JavaScript object (some better-sqlite3 configurations do this), `String(row['payload'])` produces `'[object Object]'` and `JSON.parse` throws. The `catch` silently skips the entry, which could suppress a legitimate prior `runId` and produce a duplicate. Consider checking `typeof row['payload']` first: if it is already an object, assign directly; otherwise parse.
  ```existing
  try {
        // THE R16 TYPE_CERTAINTY FIX — JSON.parse returns `any`; the assignment
        // to the typed variable needs no cast at all (no AsExpression to flag),
        // and the runId read below is typeof-guarded before use.
        payload = JSON.parse(String(row['payload'] ?? '{}'));
  ```

## src/hunter/surface/query-tool.ts
- **src/hunter/surface/query-tool.ts:390-393** (performance)
  **Performance: `violations` fetches ALL matching rows into memory before pagination.** The SQL query has no `LIMIT`/`OFFSET` clause — it materializes the entire `findings` table matching the filter into a JS array, then slices. On a store with thousands of violations this is wasteful and can cause memory pressure. The database should handle pagination natively (e.g., `LIMIT ? OFFSET ?` in the SQL) so only the requested page is fetched. The current `MAX_QUERY_ROWS_FULL` (2000) cap applied after the full fetch means up to 2000 rows are always loaded even if only 10 are needed.
  ```existing
  const rows = rowsAs<Record<string, unknown>>(
    db.prepare(`SELECT rule_id, severity, file, line, evidence, verdict, week, run_id FROM findings WHERE verdict = 'VIOLATION'${byRun}${byWeek} ORDER BY CASE severity WHEN 'CRIT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MED' THEN 2 ELSE 3 END`).all(...params),
    'violations',
  );
  ```
  ```suggested
  // Push LIMIT/OFFSET params at the end so they come after runId/week params.
  const effectiveCap = input.format === 'llm' ? MAX_QUERY_ROWS : MAX_QUERY_ROWS_FULL;
  const off = Math.max(0, Math.floor(input.offset ?? 0));
  const lim = input.limit !== undefined
    ? Math.min(Math.max(0, Math.floor(input.limit)), effectiveCap)
    : effectiveCap;
  const rows = rowsAs<Record<string, unknown>>(
    
  ```

## src/kernel/graph-diff.ts
- **src/kernel/graph-diff.ts:67-70** (bug)
  **Bug: Label collision silently corrupts `inboundByLabel`.** When multiple nodes share the same `label` (e.g., two functions with the same name in different modules but distinct `canonical_id`), the later node's inbound count overwrites the earlier one. This causes `diffGraphs` to compare incorrect before/after values for that label — a blast-radius jump could be missed or fabricated. The same issue affects the `topDegree` array (duplicate label entries), but `inboundByLabel` is worse because it silently drops data via `Record` key overwrite.

Suggestion: Either aggregate (sum) inbound counts when labels collide, or switch to using `canonical_id` as the comparison key throughout `diffGraphs`.
  ```existing
  const inboundByLabel: Record<string, number> = {};
    for (const [cid, n] of inbound) {
      inboundByLabel[nodes.find((nn) => nn.canonical_id === cid)?.label ?? cid] = n;
    }
  ```
  ```suggested
  // Pre-build a canonical_id → label lookup to avoid O(n) find() per edge.
    const cidToLabel = new Map<string, string>();
    for (const nn of nodes) cidToLabel.set(nn.canonical_id, nn.label);

    const inboundByLabel: Record<string, number> = {};
    for (const [cid, n] of inbound) {
      const label = cidToLabel.get(cid) ?? cid;
      // Aggregate inbound counts when labels collide to avoid 
  ```

## src/omp/enforcement.ts
- **src/omp/enforcement.ts:275-275** (bug)
  Bug: Non-timeout errors in the close layer's bind (evidence scan) catch block are assigned the error code `"TSG_TIMEOUT"` even when the failure was NOT a timeout. This mislabels engine crashes, network errors, or any non-timeout exception as a timeout, making it impossible for callers to distinguish "slow" from "broken" (the exact distinction the fire-gate vocabulary is designed to preserve). The code should be `"TSG_DOWN"` or should extract the actual error code from the thrown error (same as the JEV catch does below with `GI_JEV_DOWN`).
  ```existing
  code: "TSG_TIMEOUT",
  ```
  ```suggested
  // Extract the real error code so callers can distinguish TSG crashes from timeouts.
    const tsgCode = e instanceof Error && "code" in e && typeof (e as { code?: unknown }).code === "string"
      ? String((e as { code: unknown }).code)
      : "TSG_DOWN";
    return {
      verdict: "FAIL_CLOSED",
      code: tsgCode,
      reason: "the evidence scan failed (fail-closed)",
      evidence: e ins
  ```

## src/omp/jev.ts
- **src/omp/jev.ts:216-216** (security)
  The Bearer token redaction regex `[A-Za-z0-9_-]+` does not cover API keys containing characters like `.`, `+`, `/`, `=` (common in base64-encoded or vendor-format keys). Additionally, if the key somehow appears in error messages outside the Bearer format (e.g., `String(e)` path for non-Error rejections), it won't be redacted at all. Consider a broader regex or a centralized redaction utility that scrubs the actual key value.
  ```existing
  error: e instanceof Error ? e.message.replace(/Bearer [A-Za-z0-9_-]+/g, "Bearer <redacted>") : String(e),
  ```

## src/scoping/db-path.ts
- **src/scoping/db-path.ts:79-88** (bug)
  Bug: When `testFile` is `'~/'`, the `startsWith(TILDE_SLASH)` branch fires, `slice(2)` yields `''`, and `path.join(home, '')` returns the bare HOME directory — not a file path. The function then returns this directory as the DB path, which would silently corrupt resolution. The bare `'~'` case correctly appends `spec.fileName`, but `'~/'` does not. Consider normalizing: if the resolved path is a directory or ends with a separator, append `spec.fileName`.
  ```existing
  if (testFile === TILDE || testFile.startsWith(TILDE_SLASH)) {
        const home = process.env.HOME ?? process.env.USERPROFILE;
        if (!home) {
          throw new Error(
            `[db-path] HOME_NOT_SET: neither HOME nor USERPROFILE env var is set ` +
            `(fileName="${spec.fileName}") - cannot resolve testFile`,
          );
        }
        return testFile === TILDE ? path.join
  ```
