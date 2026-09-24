# HIGH slice 4 — 10 findings across 9 files

## src/hunter/diagnostics/semantic-predicates.ts
- **src/hunter/diagnostics/semantic-predicates.ts:157-163** (bug)
  **P3 `whoCalls(node.name)` uses symbol name, not node identity — causes false negatives via name collision.**

`whoCalls(symbol: string)` (defined in `graph/interface.ts:109`) takes a symbol **name** and returns all callers across the entire codebase for that name. When two functions in different files share the same name (e.g., both named `enforce`), `whoCalls('enforce')` returns the union of callers for BOTH. If file A has a function `enforce` with callers and file B has a function `enforce` with no callers, the `whoCalls` for B's node still returns A's callers, so B is incorrectly treated as wired and skipped.

Additionally, `GraphAdapter` already exposes `unwired(): DeadNode[]` (interface line 113) which solves this exact problem at the adapter level using node IDs rather than symbol names. Consider using that API, or at minimum disambiguating by filtering `whoCalls` results to only callers in the same file.
  ```existing
  try {
        callers = ctx.graph.whoCalls(node.name);
      } catch (e: unknown) {
        console.error(`[semantic-predicates] P3 whoCalls failed for ${node.name}: ${String(e)}`);
        continue;
      }
      if (callers.length !== 0) continue;
  ```
  ```suggested
  // Option A: use the adapter's built-in unwired() method
      // const deadNodes = ctx.graph.unwired();
      // if (!deadNodes.some(d => d.id === node.id)) continue;

      // Option B: filter whoCalls results to only same-file callers
      try {
        callers = ctx.graph.whoCalls(node.name).filter(c => c.file === file);
      } catch (e: unknown) {
        console.error(`[semantic-predicates
  ```

## src/hunter/harness/map.ts
- **src/hunter/harness/map.ts:62-62** (bug)
  The `map()` JSDoc explicitly documents that it throws `GRAPH_EMPTY` on an empty build, but this check is never performed anywhere in the function. Neither `corbell-adapter.ts` nor `graphify-adapter.ts` throw `graphEmpty()` either, and the `GraphEmptyError` / `graphEmpty()` factory in `interface.ts` is never called. An adapter returning zero nodes would silently pass the LINELESS guard (no nodes to iterate), write an empty graph to SQLite, and mirror it — violating the documented contract and the micro-loop's `GRAPH_EMPTY → INCONCLUSIVE` routing. Add an explicit post-build check after `assertMappableLines(buildResult)`:
  ```existing
  assertMappableLines(buildResult);
  ```
  ```suggested
  assertMappableLines(buildResult);
  if (buildResult.nodes.length === 0) {
    throw graphEmpty('adapter build produced zero nodes');
  }
  ```

## src/hunter/hooks/bus-hook.ts
- **src/hunter/hooks/bus-hook.ts:147-154** (bug)
  The F-1023 catch block unconditionally restores `cursorBefore` on any throw, but by that point some rows in the `clean` loop may have already been dispatched to subscribers (lines 126–144 advance the cursor row-by-row while delivering). If any future code path in the delivery loop throws an uncaught exception (outside the per-subscriber try/catch or the JSON.parse catch), the cursor rolls back to `cursorBefore` and the next `poll()` re-selects and re-delivers those already-dispatched rows — violating the at-most-once delivery intent. Currently safe because all throwing paths in the loop are individually caught, but this is a latent defect: a single added line that throws (e.g., a new validation, a logging call on a circular-ref payload) would silently break the invariant. Consider advancing the cursor only after the entire batch is delivered (set `this.cursor` to the last row's id after the loop completes, not incrementally during it), or track a 'delivered up to' high-water mark restored only for rows not yet delivered.
  ```existing
  } catch (e: unknown) {
      // ★ F-1023 FIX (2026-09-25, cont.): the cursor advanced row-by-row above, so
      // ★ an escaping throw (DB failure, subscriber bookkeeping fault) would strand
      // ★ it past rows never delivered — the next poll skips them (silent loss).
      // ★ Restore the entry cursor; the next poll re-selects the batch. Normal
      // ★ poison skips return cleanly and kee
  ```
  ```suggested
  } catch (e: unknown) {
      // Restore the entry cursor so the next poll re-selects the entire batch.
      // NOTE: any rows already dispatched in the clean loop above will be
      // re-delivered — the caller must tolerate at-least-once if this path fires.
      this.cursor = cursorBefore;
      throw e;
  ```
- **src/hunter/hooks/bus-hook.ts:210-214** (bug)
  `restoreCursor` does not check whether `lastDeliveredId` is less than the current cursor. If called with a stale or lower value (e.g., a misconfigured boot-time restore, or a race with a prior `poll()` that already advanced the cursor), the cursor regresses and all events with id > lastDeliveredId are re-selected and re-delivered — violating at-most-once semantics. The cursor should only move forward.
  ```existing
  restoreCursor(lastDeliveredId: number): void {
    if (typeof lastDeliveredId === 'number' && Number.isFinite(lastDeliveredId) && lastDeliveredId >= 0) {
      this.cursor = Math.floor(lastDeliveredId);
    }
  }
  ```
  ```suggested
  restoreCursor(lastDeliveredId: number): void {
    if (typeof lastDeliveredId === 'number' && Number.isFinite(lastDeliveredId) && lastDeliveredId >= 0) {
      const id = Math.floor(lastDeliveredId);
      if (id > this.cursor) {
        this.cursor = id;
      }
    }
  }
  ```

## src/hunter/lexicon/compiled-store.ts
- **src/hunter/lexicon/compiled-store.ts:72-75** (bug)
  **Bug: Missing stale row cleanup for `compiled_predicates` in `writeCompiledCache`**

The function deletes old `rule_cards` rows (`DELETE FROM rule_cards WHERE corpus_hash = ?`) before inserting fresh ones, but performs no corresponding cleanup of old `compiled_predicates` rows. Since `INSERT OR REPLACE` only handles idempotency by primary key (`id`), if a recompile produces a predicate set with fewer or different ids, orphaned rows from the previous battery persist indefinitely. Over repeated recompilations, stale predicates accumulate in the table and could be loaded by `loadBattery` if they share the same `battery_version`.

Add a `DELETE FROM compiled_predicates WHERE battery_version = ?` (using the first battery entry's `batteryVersion`, or the `corpusHash` if they correspond) at the start of the battery write section.
  ```existing
  if (battery.length > 0) {
      const insBat = db.prepare(
        `INSERT OR REPLACE INTO compiled_predicates (${COMPILED_PREDICATES_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      );
  ```

## src/hunter/surface/lsp-injector.ts
- **src/hunter/surface/lsp-injector.ts:241-243** (bug)
  **Glob patterns silently ignored when the server is DB-backed.** When `this.db` is bound, `resolveTouchedFiles` short-circuits to `return [candidate]`, treating the glob pattern as a literal file path. The `glob` tool (line 538) passes through the raw pattern (e.g. `src/*.ts`), which becomes the "candidate." `diagnosticsFor('src/*.ts')` then queries the DB for a file literally named `src/*.ts`, which never matches any real file path. Result: diagnostic blocks are never appended to glob tool results in DB-backed (production) mode — only in the in-memory test seam where the regex expansion runs.
  ```existing
  resolveTouchedFiles(candidate: string): string[] {
    if (this.db) return [candidate]; // the DB-backed read resolves the exact file (the project truth)
    if (this.state.has(candidate)) return [candidate];
  ```
  ```suggested
  resolveTouchedFiles(candidate: string): string[] {
    if (this.db) {
      // DB-backed: if the candidate contains glob chars, expand against the
      // findings table's distinct file column; otherwise exact match.
      if (/[*?[]/.test(candidate)) {
        return this.expandGlobFromDb(candidate);
      }
      return [candidate];
    }
    if (this.state.has(candidate)) return [candidate];
  ```

## src/hydra/templates/mpse.ts
- **src/hydra/templates/mpse.ts:108-118** (maintainability)
  TraceGapSchema manually re-declares all base schema fields (contractId, specPath, specLine, specQuote, implementationStatus, file, line, evidence) instead of extending MpseConformanceBaseSchema. This directly contradicts the F-1044 fix rationale: "the four conformance schemas were structurally identical — a field added to one silently diverged the rest." If a field is added to or modified in MpseConformanceBaseSchema (e.g., changing evidence to required, or adding a new field), TraceGapSchema will silently diverge. TraceGapSchema should extend the base and only override the fields that differ (implementationStatus narrowed to literal, evidence made required, plus the extra gapReason field).
  ```existing
  export const TraceGapSchema = z.object({
  contractId: z.string().min(1),
  specPath: z.string().min(1),
  specLine: z.number().int().positive(),
  specQuote: z.string().min(1),
  implementationStatus: z.literal("unimplemented"),
  file: z.string().optional(),
  line: z.number().int().positive().optional(),
  evidence: z.string().min(1),
  gapReason: z.string().min(1).optional(),
});
  ```
  ```suggested
  export const TraceGapSchema = MpseConformanceBaseSchema.extend({
  implementationStatus: z.literal("unimplemented"),
  evidence: z.string().min(1),
  gapReason: z.string().min(1).optional(),
});
  ```

## src/omp/enforcement.ts
- **src/omp/enforcement.ts:339-344** (bug)
  **Close-layer JEV catch collapses timeout and crash into the same `GI_JEV_DOWN` code, losing the slow-vs-broken distinction.** The TSG paths in the same function correctly separate `TSG_TIMEOUT` from `TSG_DOWN`, and the work layer's comment explicitly says a timeout "carries its own named code". Here both `EngineTimeout` and generic errors map to `GI_JEV_DOWN`. A consumer cannot tell whether the judge is slow (might succeed on retry) or broken (needs operator intervention). Add a dedicated `GI_JEV_TIMEOUT` code for the timeout branch.
  ```existing
  } catch (e) {
    if (e instanceof EngineTimeout) {
      return { verdict: "FAIL_CLOSED", code: "GI_JEV_DOWN", reason: `the judge timed out at close after ${ENGINE_TIMEOUT_MS}ms (fail-closed)`, evidence: e.message, spans };
    }
    return { verdict: "FAIL_CLOSED", code: "GI_JEV_DOWN", reason: "the judge failed at close (fail-closed)", evidence: e instanceof Error ? e.message : String(e), spans 
  ```
  ```suggested
  } catch (e) {
    if (e instanceof EngineTimeout) {
      return { verdict: "FAIL_CLOSED", code: "GI_JEV_TIMEOUT", reason: `the judge timed out at close after ${ENGINE_TIMEOUT_MS}ms (fail-closed)`, evidence: e.message, spans };
    }
    const jevCode = e instanceof Error && "code" in e && typeof (e as { code?: unknown }).code === "string"
      ? String((e as { code: unknown }).code)
      : "GI_
  ```

## src/omp/hard-deps.ts
- **src/omp/hard-deps.ts:300-310** (bug)
  The `assertRegisterComplete` function only validates that `id`, `dependency`, and `errorCode` are non-empty strings. It does not check for **duplicate `id` values** across the register — two components with the same `id` would both be silently accepted. Duplicate IDs make operator triage impossible: when a `HardDependencyError` fires, the `component` field is ambiguous. Every prior audit pass (w6, w8, pass5, pass6) flagged this gap, and it remains unfixed. A `Set`-based uniqueness check on `id` should be added.
  ```existing
  export function assertRegisterComplete(register: readonly ComponentDecl[]): void {
  const bad: string[] = [];
  for (const d of register) {
    if (d.id.trim() === "") bad.push("<blank id>");
    if (d.dependency.trim() === "") bad.push(`${d.id}: blank dependency`);
    if (d.errorCode.trim() === "") bad.push(`${d.id}: blank errorCode`);
  }
  if (bad.length > 0) {
    throw new Error(`REGISTER_I
  ```
  ```suggested
  export function assertRegisterComplete(register: readonly ComponentDecl[]): void {
  const bad: string[] = [];
  const seenIds = new Set<string>();
  const seenCodes = new Set<string>();
  for (const d of register) {
    if (d.id.trim() === "") bad.push("<blank id>");
    else if (seenIds.has(d.id)) bad.push(`${d.id}: duplicate id`);
    else seenIds.add(d.id);
    if (d.dependency.trim() === "") 
  ```

## src/scoping/scope-binding.ts
- **src/scoping/scope-binding.ts:80-82** (bug)
  Stale prefix map entry on re-registration with a different prefix. The early `return existing` on line 79 means the duplicate prefix guard (lines 82–85) is **unreachable** when the same ecosystem re-registers. If a bug or misconfiguration causes the same ecosystem to be registered with a different `wavePrefix`, the old prefix remains in `this.prefixes` pointing to the stale binding, while the new prefix is added on line 88. This causes: (1) `ownerOf` can now match the stale prefix for waves that should belong to the new prefix; (2) `isForeignWave` on the owning binding returns incorrect results; (3) the mutual-exclusivity contract silently breaks. The duplicate prefix check should execute **before** (or independently of) the existing-binding early return.
  ```existing
  register(spec: EcosystemSpec): ScopeBinding {
    const existing = this.bindings.get(spec.ecosystem);
    if (existing) return existing;
  ```
  ```suggested
  register(spec: EcosystemSpec): ScopeBinding {
    // ★ Check for prefix collision BEFORE the idempotency short-circuit —
    //   a same-ecosystem re-registration with a different prefix must not leave
    //   a stale entry in the prefix map.
    const prefixOwner = this.prefixes.get(spec.wavePrefix);
    if (prefixOwner && prefixOwner.ecosystem !== spec.ecosystem) {
      throw new Error(
      
  ```
