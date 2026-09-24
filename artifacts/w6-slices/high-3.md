# R6-HIGH slice 3 — 11 findings across 9 files

## src/hunter/graph/merge.ts
- **src/hunter/graph/merge.ts:150-154** (bug)
  **Bug: `conflictReason` silently overwritten on repeated contradictions.** When multiple semantic triples share the same subject/object pair as a mechanical triple, the inner `for (const mech of mechPairGroup)` loop overwrites `existing.conflictReason` each time, discarding earlier contradiction details. For example, if semantic triples S1 and S2 both have the same pair as mechanical triple M1, S2's iteration replaces S1's `conflictReason` on M1, losing S1's predicate information. This is a data-integrity loss — the mechanical row ends up recording only the last semantic predicate it conflicted with.

**Suggestion:** Accumulate conflict reasons (e.g., append to an array or concatenate) rather than overwriting.
  ```existing
  const existing = mergedByKey.get(tripleKey(mech));
        if (existing && !existing.conflict) {
          existing.conflict = true;
          existing.conflictReason = `CONTRADICTION: mechanical predicate=${mech.predicate} vs semantic predicate=${s.predicate} for ${s.subject}->${s.object} (both preserved, flagged as L8 contradiction)`;
        }
  ```
  ```suggested
  const existing = mergedByKey.get(tripleKey(mech));
        if (existing && !existing.conflict) {
          existing.conflict = true;
          existing.conflictReason = `CONTRADICTION: mechanical predicate=${mech.predicate} vs semantic predicate=${s.predicate} for ${s.subject}->${s.object} (both preserved, flagged as L8 contradiction)`;
        } else if (existing?.conflict) {
          // Accumul
  ```

## src/hunter/harness/scan.ts
- **src/hunter/harness/scan.ts:111-113** (bug)
  The catch block silently swallows ALL exceptions from the calibration gate — including genuine bugs (e.g., a corrupted fixture causing data issues, a logic error in `runCalibration`, or a runtime error in the fixture extraction code above). The run then proceeds with an unvalidated battery, which could produce false results. Consider either: (a) only catching a narrow set of expected errors (e.g., missing/invalid fixture shape), or (b) re-throwing after logging when the error is not a known calibration-absent case, or (c) recording the failure in the ScanResult so callers can inspect it.
  ```existing
  } catch (calErr: unknown) {
      console.warn(`[scan] D17 calibration gate failed (non-fatal, battery unchanged): ${calErr instanceof Error ? calErr.message : String(calErr)}`);
    }
  ```
  ```suggested
  } catch (calErr: unknown) {
      // Distinguish expected 'no fixtures' / 'empty calibration' from genuine runtime errors.
      const msg = calErr instanceof Error ? calErr.message : String(calErr);
      if (msg.includes('no fixtures') || msg.includes('empty') || msg.includes('ENOENT')) {
        console.warn(`[scan] D17 calibration gate skipped (non-fatal): ${msg}`);
      } else {
        // U
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

## src/hydra/auditor.ts
- **src/hydra/auditor.ts:1113-1113** (bug)
  REPORT_MTIME_SLACK_MS = 100 is too tight for common filesystem timestamp resolutions. ext4 defaults to 1-second mtime granularity (unless created with `metadata_csum`), and Windows NTFS has variable granularity. The report is written via fd-pinned write, then stat'd immediately after — but the mtime can lag up to 1 second behind the actual write on ext4. This causes the freshness gate to reject legitimately fresh reports as `HUNTER_STALE_REPORT`. The previous value of 2000ms was noted as too loose (accepting pre-run reports), but 100ms is too tight. A value of 1500–2000ms is correct for 1-second-resolution filesystems, or the check should use the write tool's returned byte count as a positive write confirmation instead of relying solely on mtime.
  ```existing
  const REPORT_MTIME_SLACK_MS = 100;
  ```
  ```suggested
  const REPORT_MTIME_SLACK_MS = 1500;
  ```

## src/omp/adapters/c2kg.ts
- **src/omp/adapters/c2kg.ts:32-38** (bug)
  After `JSON.parse`, the `as C2kgIndex` cast is a compile-time-only assertion — it does not validate the runtime structure. If `idx.symbols` exists but is not an array (e.g., a string, number, or object), the subsequent `.filter()` call will throw an uncaught `TypeError` ("idx.symbols.filter is not a function"). This TypeError will bubble up with a raw JS error message instead of the intended `GI_LAYER_C2KG`-prefixed error, bypassing the design contract. The `.filter()` and `.map()` chain should either be wrapped in the existing try/catch, or `idx.symbols` should be validated with `Array.isArray()` before use.
  ```existing
  let idx: C2kgIndex;
      try {
        idx = JSON.parse(fs.readFileSync(indexPath, "utf8")) as C2kgIndex;
      } catch (e) {
        throw new Error(`GI_LAYER_C2KG: the index is unparseable — ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
      }
      const hits = (idx.symbols ?? []).filter((s) => (s.name ?? "").includes(subject));
  ```
  ```suggested
  let idx: C2kgIndex;
      try {
        idx = JSON.parse(fs.readFileSync(indexPath, "utf8")) as C2kgIndex;
      } catch (e) {
        throw new Error(`GI_LAYER_C2KG: the index is unparseable — ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
      }
      const symbols = Array.isArray(idx.symbols) ? idx.symbols : [];
      const hits = symbols.filter((s) => (s.name ?? "").includes(s
  ```

## src/omp/gate-middleware.ts
- **src/omp/gate-middleware.ts:28-66** (maintainability)
  `parseExports` and `parseExportSites` contain near-identical regex iteration and name-extraction logic (same five regexes, same destructuring parser, same braces/default handling). This duplication means any fix to export-parsing semantics (like the F-41 fix for generators) must be applied in two places. Extract the shared iteration into a single internal helper (e.g., `iterExportNames(src, cb)`) and have both public functions delegate to it — `parseExports` collects names into a Set, `parseExportSites` captures name-to-offset via the callback.
  ```existing
  export function parseExports(src: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  EXPORT_PARSE_RE.lastIndex = 0;
  while ((m = EXPORT_PARSE_RE.exec(src))) out.add(m[1]);
  EXPORT_GEN_RE.lastIndex = 0;
  while ((m = EXPORT_GEN_RE.exec(src))) out.add(m[1]);
  EXPORT_DESTRUCT_RE.lastIndex = 0;
  while ((m = EXPORT_DESTRUCT_RE.exec(src))) eachDestructuredName(m[
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

## src/omp/layer-registry.ts
- **src/omp/layer-registry.ts:205-205** (bug)
  `factsFor` doesn't filter null/non-object elements from `facts()` before passing to `isAnchored`. If a consumer's `facts()` returns `[null, {…}, …]`, then `isAnchored(null)` throws a TypeError. The outer try-catch catches this, but the consequence is that ALL remaining facts from that consumer are silently dropped — not just the null ones. Compare with `auditOne` (line 148), which explicitly filters out nulls/non-objects BEFORE calling `isAnchored`. This inconsistency means `auditOne` correctly discards only bad facts while `factsFor` loses an entire consumer's contribution on the first null.
  ```existing
  for (const f of p.facts(subject)) if (isAnchored(f)) out.push(f);
  ```
  ```suggested
  const got = p.facts(subject);
if (Array.isArray(got)) {
  for (const f of got) {
    if (f !== null && typeof f === "object" && isAnchored(f as LayerFact)) out.push(f as LayerFact);
  }
}
  ```

## src/scoping/db-path.ts
- **src/scoping/db-path.ts:60-60** (bug)
  When neither `HOME` nor `USERPROFILE` is set (e.g., in some containerized or CI environments), the fallback to `'.'` silently resolves the DB path relative to the current working directory. This is dangerous: the production DB would be written to an unpredictable location that varies between invocations. Given that this entire module exists to **prevent silent DB pollution**, this silent fallback contradicts the module's core guarantee. Consider throwing an error instead, similar to the `GI_TEST_ISOLATION_BROKEN` pattern above.
  ```existing
  dir = path.join(process.env.HOME ?? process.env.USERPROFILE ?? '.', dir.slice(2));
  ```
  ```suggested
  const home = process.env.HOME ?? process.env.USERPROFILE;
      if (!home) {
        throw new Error(
          `[db-path] HOME_NOT_SET: neither HOME nor USERPROFILE env var is set ` +
          `(fileName="${spec.fileName}") — cannot resolve defaultDir`,
        );
      }
      dir = path.join(home, dir.slice(2));
  ```
