# HIGH slice 4 — 12 findings across 10 files

## src/hunter/diagnostics/semantic-predicates.ts
- **src/hunter/diagnostics/semantic-predicates.ts:0-0** (bug)
  P3 uses `ctx.graph.nodes()` directly to iterate candidates, bypassing the edge-anchored traversal pattern that every other predicate in this file enforces. The file's architecture preamble explicitly states the rule: 'THE ANCHOR — candidate files resolve through the graph edges (resolveEdgeAnchor …), never nodes() as a file list' and 'an empty anchor set returns ZERO findings (no anchor = no scan).' P3 violates this invariant by scanning every function/method/class node in the graph and then independently querying `whoCalls()` for each. This means P3 will scan files outside the project's edge-scoped working set, produce findings for nodes that no edge traversal would ever reach, and emit evidence strings that manually construct the 'edge NONE' leg rather than citing a real traversed edge. This should be converted to use `resolveEdgeAnchor` with an appropriate AnchorSpec (callSymbols + defMatchers matching the enforcement/gate/guard identifiers) so that P3's findings carry genuine edge citations and respect the zero-anchor = zero-scan invariant.
  ```existing
  check(ctx) {
    const findings: Finding[] = []; const sev = bindSeverity(ctx.bindings);
    for (const node of ctx.graph.nodes()) {
      if (node.kind !== 'function' && node.kind !== 'method' && node.kind !== 'class') continue;
      if (!/(enforce|gate|guard|STATE_GATE)/i.test(node.name)) continue;
      let callers: { file: string; line: number; caller: string }[];
      try {
        callers 
  ```

## src/hunter/harness/hunt-lock.ts
- **src/hunter/harness/hunt-lock.ts:10-14** (bug)
  The `hostname` field in `HuntLockPayload` is always written during `acquireHuntLock` but is never read or validated anywhere in the codebase — not during stale detection, not during release, not during the race-condition re-read. This means two machines sharing a filesystem could hold the same lock if their PIDs and timestamps happen to collide. Consider validating `hostname` in `isStale` (e.g., stale if hostname differs from the current host) or documenting that single-host is a hard prerequisite.
  ```existing
  export interface HuntLockPayload {
  pid: number;
  acquiredAt: string;
  hostname: string;
}
  ```

## src/hunter/hooks/bus-hook.ts
- **src/hunter/hooks/bus-hook.ts:80-84** (bug)
  **Non-numeric id rows cause an infinite poll loop**: When `row.id` is not a number, the cursor is never advanced (`this.cursor = row.id` is guarded by `typeof row.id === 'number'`), so the next `poll()` call re-selects the same row via `WHERE id > ?`. The F-247 note acknowledges this scenario but the defensive code path has a bug — it stalls the bus instead of skipping. Either advance the cursor unconditionally (use the last known-good cursor as a fallback), or break out of the loop to prevent re-selection.
  ```existing
  if (typeof row.id !== 'number' || typeof row.kind !== 'string') {
        console.error(`[hydra-bus] skipping malformed events row: ${JSON.stringify(row).slice(0, 160)}`);
        if (typeof row.id === 'number') this.cursor = row.id;
        continue;
      }
  ```
  ```suggested
  if (typeof row.id !== 'number' || typeof row.kind !== 'string') {
        console.error(`[hydra-bus] skipping malformed events row: ${JSON.stringify(row).slice(0, 160)}`);
        // Advance cursor past this row so the bus never stalls on a poison row.
        // If id is non-numeric we use the previous cursor as the advance point;
        // the next poll will still pick up any later valid rows.

  ```
- **src/hunter/hooks/bus-hook.ts:101-108** (bug)
  **Subscriber failure permanently loses the event with no retry or dead-letter path**: When a subscriber throws, the error is logged but the cursor still advances past the row. For critical dispatch directives (e.g., `HUNT_DONE` → main agent dispatch), this means the event is permanently undelivered. Consider maintaining a failed-events list or re-queuing mechanism so that transient subscriber failures do not cause silent data loss.
  ```existing
  try {
            fn(eventKind(row.kind), payload);
          } catch (e: unknown) {
            // a subscriber failure must not kill the poll loop — the row is
            // still consumed (the cursor advances), the failure is logged by
            // the platform's error handler.
            console.error(`[hydra-bus] subscriber for ${row.kind} threw: ${e instanceof Error ? e.message : String(
  ```
  ```suggested
  try {
            fn(eventKind(row.kind), payload);
          } catch (e: unknown) {
            console.error(`[hydra-bus] subscriber for ${row.kind} threw: ${e instanceof Error ? e.message : String(e)}`);
            // Record the failure so the caller can inspect/retry later.
            this.failedEvents.push({ row, error: e, attempt: 1 });
          }
  ```

## src/hunter/lexicon/compiled-store.ts
- **src/hunter/lexicon/compiled-store.ts:46-49** (bug)
  Missing `finalize()` calls for prepared statements. The `StatementLike` interface (db.ts:177-182) exposes a `finalize()` method, and bun:sqlite requires it to release the native handle. In `writeBattery`, the INSERT statement is not finalized if the loop or COMMIT throws, leaking the native handle. In `writeRuleCards`, neither the DELETE statement nor the INSERT statement (`ins`) are finalized — same resource-leak issue. Both statements should be finalized in a `finally` block or after the loop completes.
  ```existing
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO compiled_predicates (${COMPILED_PREDICATES_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?)`,
  );
  for (const p of battery) {
  ```
  ```suggested
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO compiled_predicates (${COMPILED_PREDICATES_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?)`,
  );
  try {
    for (const p of battery) {
      const checkCode = JSON.stringify({ template: p.template, bindings: p.bindings });
      stmt.run(
        p.id, p.family, p.template, JSON.stringify(p.bindings),
        p.verbatimQuote, p.anchor, p.severity, chec
  ```

## src/hydra/auditor.ts
- **src/hydra/auditor.ts:1113-1113** (bug)
  REPORT_MTIME_SLACK_MS = 100 is too tight for common filesystem timestamp resolutions. ext4 defaults to 1-second mtime granularity (unless created with `metadata_csum`), and Windows NTFS has variable granularity. The report is written via fd-pinned write, then stat'd immediately after — but the mtime can lag up to 1 second behind the actual write on ext4. This causes the freshness gate to reject legitimately fresh reports as `HUNTER_STALE_REPORT`. The previous value of 2000ms was noted as too loose (accepting pre-run reports), but 100ms is too tight. A value of 1500–2000ms is correct for 1-second-resolution filesystems, or the check should use the write tool's returned byte count as a positive write confirmation instead of relying solely on mtime.
  ```existing
  const REPORT_MTIME_SLACK_MS = 100;
  ```
  ```suggested
  const REPORT_MTIME_SLACK_MS = 1500;
  ```

## src/omp/adapters/arsumbris.ts
- **src/omp/adapters/arsumbris.ts:91-97** (bug)
  The `walk` function recursively traverses all object values without a visited-set to guard against circular references. If the daemon output contains circular references (e.g., a prototype chain or malformed JSON), this will cause infinite recursion and a stack overflow, crashing the Node.js process.
  ```existing
  const values: string[] = [];
            const walk = (v: unknown): void => {
              if (typeof v === "string") values.push(v);
              else if (Array.isArray(v)) for (const x of v) walk(x);
              else if (v && typeof v === "object") for (const x of Object.values(v as Record<string, unknown>)) walk(x);
            };
            walk(i);
  ```
  ```suggested
  const values: string[] = [];
            const seen = new WeakSet<object>();
            const walk = (v: unknown): void => {
              if (typeof v === "string") values.push(v);
              else if (Array.isArray(v)) for (const x of v) walk(x);
              else if (v && typeof v === "object") {
                if (seen.has(v as object)) return;
                seen.add(v as object);
     
  ```

## src/omp/fire-ledger.ts
- **src/omp/fire-ledger.ts:617-617** (bug)
  Persistent malformed rows cause an unbounded retry loop. When `drain()` is called (from `judgeWithPersist`), it collects ALL unseen rows from `gate.rows()` and passes them to `appendManyDetailed`. If one row is persistently malformed (e.g., bad domain, bad probability), it fails in the per-row fallback, is never added to the `seen` WeakSet, and is retried on EVERY subsequent `judge()` call. This floods `persistFailureCount` and overwrites `lastPersistError` indefinitely. Each retry also re-attempts all previously failed rows, not just the latest one.

Suggested fix: in `judgeWithPersist`, instead of calling `drain(original, ledger)` which re-attempts all stale failures, only persist the specific decision just produced. Alternatively, `drain` should cap how many stale failures it re-attempts per call, or the fallback should add persistently-failing rows to a dead-letter set that is skipped on future drains.
  ```existing
  drain(original, ledger);
  ```
  ```suggested
  try {
      drain(original, ledger);
    } catch (e) {
      const bare45 = e instanceof LedgerError ? (e.code.startsWith("GI_LEDGER_") ? e.code.slice("GI_LEDGER_".length) : e.code) : "PERSIST_FAILED";
      const code = `GI_LEDGER_${bare45}`;
      const message = e instanceof Error ? e.message : String(e);
      ledger.notePersistFailure(code, message);
      // NOTE: a persistently malformed ro
  ```

## src/omp/graph-gate.ts
- **src/omp/graph-gate.ts:100-101** (bug)
  In `classifyEdit`, `extractExportSymbols` is called on `args.oldString ?? args.content` and `args.newString ?? args.content`. When both `oldString` and `newString` are undefined but `content` is provided, both calls parse the same `content` string, producing duplicate symbol lists. More critically, when `oldString` is defined and `newString` is undefined, the second call falls back to `args.content` (the full file), not an empty string — so `newSyms` would contain every exported symbol from the entire file, not just those introduced by the edit. This inflates `touchedSymbols` and can cause false-positive coverage (edits appear to touch symbols they don't) or false-positive HIGH severity (structural flag triggers on unrelated exports).
  ```existing
  const oldSyms = extractExportSymbols(args.oldString ?? args.content ?? "");
  const newSyms = extractExportSymbols(args.newString ?? args.content ?? "");
  ```
  ```suggested
  const oldSyms = extractExportSymbols(args.oldString ?? "");
  const newSyms = extractExportSymbols(args.newString ?? args.content ?? "");
  ```
- **src/omp/graph-gate.ts:317-322** (security)
  `loadGateState` calls `JSON.parse` on data retrieved from SQLite (`row.edits_json`, `row.queries_json`). While the outer catch returns `null`, the `JSON.parse` of `queries_json` could produce objects where `resolved` is not a boolean — a corrupted or tampered DB row could set `resolved` to a truthy non-boolean value (e.g., the string "true"), which would pass `q.resolved === true` correctly (strict equality rejects it), but `typeof q.rows === "number" && q.rows > 0` could still match. More importantly, the deserialized `GateEditRecord` objects have no schema validation — a maliciously crafted `severity` string (e.g., "CRITICAL") would not match any `SEV_WEIGHT` key, producing `NaN` weight and silently corrupting drift computation to `NaN`. Consider validating deserialized data against expected schemas.
  ```existing
  return {
      editLog: JSON.parse(row.edits_json) as GateEditRecord[],
      graphQueries: JSON.parse(row.queries_json) as GateQueryRecord[],
      gateState: row.state,
      drift: row.drift,
    };
  ```

## src/omp/jev.ts
- **src/omp/jev.ts:17-17** (bug)
  The `KEY_FILE` path uses `${process.env.HOME ?? "/home/leviathan"}` as a fallback. This is evaluated at module load time as a top-level `const`. If `process.env.HOME` is undefined, the hardcoded fallback `/home/leviathan` is a user-specific path that will be wrong on virtually every other machine. This means on systems without `HOME` set, the key file lookup silently targets a non-existent path rather than a conventional location. Consider using `os.homedir()` which handles this correctly, or throw if HOME is missing.
  ```existing
  export const KEY_FILE = `${process.env.HOME ?? "/home/leviathan"}/.config/typesafe/key`;
  ```
  ```suggested
  import * as os from "node:os";
// ...
export const KEY_FILE = `${os.homedir()}/.config/typesafe/key`;
  ```

## src/omp/rsi.ts
- **src/omp/rsi.ts:0-0** (bug)
  The `recount()` and `liveIncludingForgedRetirement()` calls in `supersede()` execute OUTSIDE the IMMEDIATE transaction. This creates a TOCTOU race: a concurrent `appendFiring` or `appendOutcome` can alter the evidence ledger between the recount and the `BEGIN IMMEDIATE`, causing the new row to be inserted with stale confirmed/refuted/unresolved counts and a potentially incorrect derived tier. The entire derivation — recount + live-read + tier derivation — should be performed INSIDE the transaction (after `BEGIN IMMEDIATE`) to guarantee a consistent snapshot. Note: `recount` and `liveIncludingForgedRetirement` do their own reads outside your transaction, so wrapping only the write portion is insufficient; you need to either move the reads inside or use `SAVEPOINT` with a single consistent read snapshot.
  ```existing
  supersede(canonicalId: string, run: string): ReflexRow | null {
    const counts = this.recount(canonicalId);
    const d = deriveTier(counts.confirmed, counts.refuted, counts.unresolved);
    const current = this.liveIncludingForgedRetirement(canonicalId);
    if (current !== null && current.kind === d.tier) return null; // no change
    // ATOMIC retire-then-insert...
  ```
