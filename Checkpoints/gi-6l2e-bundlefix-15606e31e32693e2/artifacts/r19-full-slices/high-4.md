# HIGH slice 4 — 7 findings across 6 files

## src/hunter/graph/resolver.ts
- **src/hunter/graph/resolver.ts:80-80** (security)
  Entity labels, IDs, and kinds are interpolated directly into the LLM prompt without any escaping or quoting. If an entity label contains characters like double-quotes (`"`), newlines (`\n`), or backticks, it will break the prompt structure and could cause the LLM to produce garbled or adversarial output. For example, a label containing `\n- alias="..." verdict="same"` would inject a fake resolution line into the prompt.

This is a prompt-injection surface: a maliciously crafted entity label could manipulate the LLM into returning incorrect resolutions, potentially causing data corruption in the DB-backed `same`/`related` verdicts.

Suggestion: escape or quote the values (e.g., JSON-encode the label string, or strip/replacement characters that break the prompt format).
  ```existing
  const newLines = newEntities.map((e) => `- alias="${e.id}" label="${e.label}" kind=${e.kind} file=${e.file ?? ''}:${e.line ?? ''}`).join('\n');
  ```
  ```suggested
  const esc = (s: string) => s.replace(/["\n\r\\]/g, (c) => ({ '"': '\"', '\n': '\\n', '\r': '\\r', '\\': '\\\\' })[c] ?? c);
  const newLines = newEntities.map((e) => `- alias="${esc(e.id)}" label="${esc(e.label)}" kind=${esc(e.kind)} file=${esc(e.file ?? '')}:${String(e.line ?? '')}`).join('\n');
  ```

## src/hunter/harness/strike.ts
- **src/hunter/harness/strike.ts:46-46** (bug)
  The merge loop accesses t.relevance via Object.entries() without a null guard. If a trace row has relevance: null or relevance: undefined, this line throws TypeError: Cannot convert undefined or null to object. The first encounter path (line 43) safely spreads null via {...t.relevance} yielding {}, but the second-encounter path (this line) does not. The R15 fix in relevanceOf only guards the read side, not the merge side.
  ```existing
  for (const [k, v] of Object.entries(t.relevance)) merged[k] = (merged[k] ?? 0) + (typeof v === "number" ? v : 0);
  ```
  ```suggested
  for (const [k, v] of Object.entries(t.relevance ?? {})) merged[k] = (merged[k] ?? 0) + (typeof v === 'number' ? v : 0);
  ```

## src/hunter/shared/ontology.ts
- **src/hunter/shared/ontology.ts:17-20** (bug)
  `HAS_FINDING_PREDICATE` is a valid predicate used in the graph (written by report.ts, enforced by migrations.ts CHECK constraint), but it is **not** included in `PREDICATE_SET`. Any consumer that validates predicates via `isPredicate()` will reject `'has_finding'`, causing a runtime validation failure or silent data rejection. The fix is to include it in the canonical set.
  ```existing
  export const HAS_FINDING_PREDICATE = 'has_finding' as const;
export const ALL_PREDICATES: readonly Predicate[] = [...PREDICATES.lasme, ...PREDICATES.mpse, ...PREDICATES.sro, ...PREDICATES.wiring] as const;
export const NODE_TYPES_SET: ReadonlySet<string> = new Set(NODE_TYPES as readonly string[]);
export const PREDICATE_SET: ReadonlySet<string> = new Set(ALL_PREDICATES as readonly string[]);
  ```
  ```suggested
  export const HAS_FINDING_PREDICATE = 'has_finding' as const;
export type HasFindingPredicate = typeof HAS_FINDING_PREDICATE;
export const ALL_PREDICATES: readonly Predicate[] = [...PREDICATES.lasme, ...PREDICATES.mpse, ...PREDICATES.sro, ...PREDICATES.wiring] as const;
export const ALL_PREDICATES_PLUS: readonly (Predicate | HasFindingPredicate)[] = [...ALL_PREDICATES, HAS_FINDING_PREDICATE] as con
  ```
- **src/hunter/shared/ontology.ts:24-26** (bug)
  `isPredicate()` does not recognise `'has_finding'` as a valid predicate. Any code path that validates user-supplied or DB-sourced predicate strings through this guard will incorrectly reject it, potentially causing data loss or silent constraint violations at write time.
  ```existing
  export function isPredicate(v: unknown): v is Predicate {
  return typeof v === 'string' && (PREDICATE_SET as Set<string>).has(v);
}
  ```
  ```suggested
  export function isPredicate(v: unknown): v is Predicate | HasFindingPredicate {
  return typeof v === 'string' && (PREDICATE_SET as Set<string>).has(v);
}
  ```

## src/kernel/scan-chain.ts
- **src/kernel/scan-chain.ts:188-198** (bug)
  **Race condition: `streamComplete` set AFTER the read loop creates a window where a late timer callback can discard successfully buffered content.**

The stall timer fires every 5s on the event loop. `streamComplete` is assigned `!dead` AFTER the for-loop breaks. In the gap between `done === true` and `clearInterval`, if the timer callback runs (e.g., a final 5s tick queued just before the stream's last chunk arrived), it sets `dead = true`. Then `streamComplete` becomes `false`, and the condition `dead && !streamComplete` on the next line incorrectly returns `STALL` — discarding the fully buffered content in `full`.

Fix: set `streamComplete = true` before (or instead of after) the loop, so a late timer cannot override a completed stream.
  ```existing
  streamComplete = !dead;
    } catch {
      // ★ F-405 FIX (2026-09-24): reader.read() may throw after abort — fall through
      //   to finally for deterministic cleanup (the old code leaked the underlying
      //   TCP/socket connection held by the Response body on abort or exception).
    } finally {
      reader.cancel().catch(() => {}); // release the underlying connection
    }
    clearIn
  ```
  ```suggested
  streamComplete = true; // set BEFORE any potential timer tick; gated on loop exit
    } catch {
      // ★ F-405 FIX (2026-09-24): reader.read() may throw after abort — fall through
      //   to finally for deterministic cleanup (the old code leaked the underlying
      //   TCP/socket connection held by the Response body on abort or exception).
    } finally {
      reader.cancel().catch(() => {
  ```

## src/omp/kernel-v2.ts
- **src/omp/kernel-v2.ts:550-552** (bug)
  The degradation classification (lines 348-352) relies on `message.includes("GI_FIREGATE_BUDGET")` etc. to determine the error code. The comment at EN-056 explicitly warns against detecting degradation by prose, yet this code does exactly that — classifying by string-matching on error messages. If the upstream error text changes or is wrapped, the wrong degradation code will be emitted. Consider having the gate throw typed/structured errors (e.g., instances of named error classes) so the caller can use `instanceof` or a `code` property instead of substring matching.
  ```existing
  const code = message.includes("GI_FIREGATE_BUDGET") ? "GI_GATE_BUDGET_EXHAUSTED"
      : message.includes("GI_FIREGATE_JUDGE_TIMEOUT") ? "GI_GATE_TIMEOUT"
      : "GI_GATE_UNAVAILABLE";
  ```
  ```suggested
  // Prefer structured error types from FireGate over string matching.
    // e.g.: if (e instanceof FireGateBudgetError) { code = "GI_GATE_BUDGET_EXHAUSTED"; }
    const code = e instanceof Error && e.name === "FireGateBudgetError" ? "GI_GATE_BUDGET_EXHAUSTED"
      : e instanceof Error && e.name === "FireGateJudgeTimeout" ? "GI_GATE_TIMEOUT"
      : "GI_GATE_UNAVAILABLE";
  ```

## src/omp/store-open.ts
- **src/omp/store-open.ts:89-106** (bug)
  Race-condition orphan: when two concurrent openers both create the file via wx (one wins, one gets EEXIST), and both see `!current` in the first registry check, the second upsert overwrites the first's registry row. The first opener (which DID create the file) returns successfully with `created=true` and no further registry check — its store file is now orphaned on disk with no matching registry entry. Later openers will hit EEXIST on wx (file exists) but find no registry row, and since the file was not created by *this* opener (`created=false`), the orphan never gets cleaned up.

The existing F-1210 orphan cleanup only handles the *current* opener's file when it loses the registry race — it does not handle the case where the *other* opener's file becomes orphaned after this opener's upsert overwrites the other's row.

**Suggestion**: After the upsert (line ~96), if `created` is false (this opener did NOT create the file), re-verify the file's existence via `fs.existsSync(storePath)` combined with the registry row. If the file exists but `written.session_id !== ownerKey`, that means this opener overwrote another opener's registry row — clean up the other opener's orphaned store file. Alternatively, restructure to minimize the race window: perform the upsert immediately after the wx check (before returning), and treat EEXIST+registry-match as success. This reduces the window in which the overwrite can occur.
  ```existing
  if (!current) {
    upsertGiSession({
      sessionId: ownerKey,
      scopeRoot: resolvedScopeRoot,
      storePath,
    });
  }
  // ★ F-1047 FIX (2026-09-25, run-13 HIGH): check-then-upsert raced — two concurrent openers
  // ★ could both observe `!current` and the loser silently overwrote the winner's row (the
  // ★ F-896 class: losing a race must not fall through). Verify-after-write: re-rea
  ```
  ```suggested
  if (!current) {
    upsertGiSession({
      sessionId: ownerKey,
      scopeRoot: resolvedScopeRoot,
      storePath,
    });
  }
  // ★ F-1047 FIX: verify after write — a foreign owner means this opener lost the race.
  const written = findGiSessionByStorePath(storePath);
  if (written && written.session_id !== ownerKey) {
    // If THIS opener created the file, clean up the orphan (existing logi
  ```
