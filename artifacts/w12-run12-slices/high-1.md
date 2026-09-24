# HIGH slice 1 — 11 findings across 8 files

## src/hunter/diagnostics/calibration.ts
- **src/hunter/diagnostics/calibration.ts:374-380** (bug)
  Partial persistence across DB and file targets: writeCalibrationRows (DB) commits a transaction, then writeCalibrationRecord (file) is called separately. If the DB commit succeeds but the file write fails (e.g., disk full, permission denied), the system ends up with DB rows persisted but no corresponding CALIBRATION_vN.md record — an inconsistent cross-target state with no rollback or compensation mechanism. This is especially problematic since both represent the same calibration session's evidence.
  ```existing
  if (write) {
      const recordPath = write.recordPath ?? path.join(profile.project.root, '.trident', 'bug-hunter');
      if (write.db) {
        this.writeCalibrationRows(write.db, records, fixtureVersion);
      }
      this.writeCalibrationRecord(recordPath, { version, records, excluded, coverageNote });
    }
  ```
  ```suggested
  if (write) {
      const recordPath = write.recordPath ?? path.join(profile.project.root, '.trident', 'bug-hunter');
      try {
        if (write.db) {
          this.writeCalibrationRows(write.db, records, fixtureVersion);
        }
        this.writeCalibrationRecord(recordPath, { version, records, excluded, coverageNote });
      } catch (fileErr: unknown) {
        // DB rows are committed bu
  ```
- **src/hunter/diagnostics/calibration.ts:465-467** (bug)
  Inconsistent fixture validation in both validateFireFixture and validateGoldenFixture: they check that `source` is a string but do NOT verify it is non-empty (unlike `ruleId`, `file`, `anchor` which check `.trim() === ''`). An empty source string passes validation but produces meaningless calibration results — the engine would analyze zero-length input as if it were valid code, silently corrupting the FIRE/SILENT verdict.
  ```existing
  if (typeof f.source !== 'string') {
      throw calibrationFixtureInvalid(`fire fixture ${f.ruleId} carries no source read`);
    }
  ```
  ```suggested
  if (typeof f.source !== 'string' || f.source.trim() === '') {
      throw calibrationFixtureInvalid(`fire fixture ${f.ruleId} carries no source read`);
    }
  ```
- **src/hunter/diagnostics/calibration.ts:283-289** (security)
  The whoCalls error is caught and coerced to empty callers with only a console.warn, then the empty data is folded into the fixturesHash. This means a broken graph adapter's topology errors silently corrupt the version hash — causing either (a) a valid calibration to be spuriously invalidated (benign but wasteful) or (b) a stale calibration to be silently reused if the adapter was always broken for this fixture (dangerous). The warning is logged but not surfaced as a CalibrationError, so callers cannot distinguish 'calibration passed' from 'calibration passed with degraded topology'. Consider throwing CalibrationError here instead of console.warn, consistent with the file's own 'loud named error, never a coerced default' law for fixture faults.
  ```existing
  } catch (e) {
          // ★ F-335 FIX (2026-09-24): a throwing whoCalls used to coerce to [] SILENTLY -
          // ★ a topology-breaking adapter fault escaped the version hash. Still [] (a broken
          // ★ edge read must not brick versioning) but LOUD: the node + the error are warned.
          console.warn(`[calibration] whoCalls threw for node ${n.name}: ${e instanceof Error ? e.message 
  ```
  ```suggested
  } catch (e) {
          throw calibrationFixtureInvalid(
            `graph.whoCalls() threw for node ${n.name}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
  ```

## src/hunter/graph/interface.ts
- **src/hunter/graph/interface.ts:231-239** (bug)
  No null/undefined guard on `profile.graph` before accessing `.substrate`. If a malformed or legacy `ProjectProfile` arrives with `graph` as `undefined`, this will throw an unhandled `TypeError: Cannot read properties of undefined (reading 'substrate')` instead of the intended `ADAPTER_FAILED` error. Add a defensive check.
  ```existing
  export function selectAdapter(profile: ProjectProfile): GraphAdapter {
  // THE NATIVE-AST RIP-OUT (the operator ruling 2026-09-07, stated 4+ times:
  // NO FALLBACKS — LOUD FAIL OR CLEAR PASS — HARD DEPENDENCY). The Substrate
  // type no longer includes native-ast, but a legacy profile object (or a
  // hand-built string) can still arrive here at runtime — it FAILS LOUDLY
  // with the named REM
  ```
  ```suggested
  export function selectAdapter(profile: ProjectProfile): GraphAdapter {
  if (!profile.graph || typeof profile.graph.substrate !== 'string') {
    throw adapterFailed(
      `substrate=${String((profile.graph as any)?.substrate)}`,
      'profile.graph or profile.graph.substrate is missing or not a string — set graph.substrate to corbell or graphify.',
    );
  }
  if (profile.graph.substrate === '
  ```

## src/hunter/lexicon/compiler.ts
- **src/hunter/lexicon/compiler.ts:195-201** (bug)
  The D13 verbatim-quote guard is bypassable for non-string truthy values in declared predicates. `String(binding['verbatimQuote'] ?? '')` coerces any truthy non-string (e.g. number `42` → `'42'`, boolean `true` → `'true'`, object `{}` → `'[object Object]'`) into a non-empty string that passes the trim check. A declared predicate with `verbatimQuote: 42` would pass D13 without containing actual quoted doctrine text. The corpus path (`compileCards`) does not have this issue because `card.verbatimQuote` is already typed as `string | undefined` by the parser. Add an explicit `typeof` guard for the declared path.
  ```existing
  const verbatimQuote = String(binding['verbatimQuote'] ?? '');
    if (!verbatimQuote || verbatimQuote.trim() === '') {
      throw new LexiconError(
        'D13_VIOLATION',
        `D13_VIOLATION: declaredPredicate ${ruleId} lacks a verbatim quote — doctrine is QUOTED, never synthesized`,
      );
    }
  ```
  ```suggested
  const rawQuote = binding['verbatimQuote'];
    if (typeof rawQuote !== 'string' || rawQuote.trim() === '') {
      throw new LexiconError(
        'D13_VIOLATION',
        `D13_VIOLATION: declaredPredicate ${ruleId} lacks a verbatim quote — doctrine is QUOTED, never synthesized`,
      );
    }
    const verbatimQuote = rawQuote;
  ```

## src/hunter/tools/query-registration.ts
- **src/hunter/tools/query-registration.ts:85-87** (bug)
  `db.close()` in the `finally` block may throw (e.g., SQLite I/O error during flush or a corrupt database). If it does, the thrown exception will mask the original error from the `try` block, making debugging significantly harder. The downstream `close()` implementations (`db.ts:433-438`) call `this.handle.close()` with no error guard. Wrap in try-catch to preserve the original error:
```typescript
finally {
  try { db.close(); } catch { /* close failure is non-fatal; original error preserved */ }
}
```
  ```existing
  } finally {
    db.close();
  }
  ```
  ```suggested
  } finally {
    try { db.close(); } catch { /* close failure is non-fatal; original error preserved */ }
  }
  ```

## src/omp/adapters/abide.ts
- **src/omp/adapters/abide.ts:186-196** (bug)
  Bug: When `subject` is an empty string, `hay.includes(subject)` always returns `true` because `String.prototype.includes('')` is always true in JavaScript. This means an empty subject would match ALL flagged events, producing a flood of spurious repair facts. Add a guard to reject empty/blank subjects, or adjust the matching logic.
  ```existing
  const hits = events.filter((e) => {
        if (e.band !== "flag") return false; // ★ only a FLAG is a repair opportunity
        // ★ F-506 FIX (2026-09-24): one-direction hay.includes(subject) missed repairs when the
        // * subject is the broader text containing the span excerpt. Also match the reverse
        // * (subject contains the span); an empty span never matches.
        const hay
  ```
  ```suggested
  if (!subject || subject.trim().length === 0) return [];
      const hits = events.filter((e) => {
        if (e.band !== "flag") return false;
        const hay = `${e.matched_span ?? ""} ${e.verdict ?? ""} ${e.rule ?? ""}`;
        if (hay.includes(subject)) return true;
        const span = (e.matched_span ?? "").trim();
        if (span.length > 0 && subject.includes(span)) return true;
       
  ```

## src/omp/decision.ts
- **src/omp/decision.ts:122-122** (security)
  **Path traversal via `scopeRoot` (both entry points).** `scopeRoot` is caller-supplied and used directly in `path.join` to derive `storePath`, `ledgerPath`, and `policyPath` without any canonicalization or boundary check. A malicious or malformed `scopeRoot` such as `../../etc` would cause reads/writes outside the intended `.omp` tree. After the `typeof` + emptiness check, canonicalize and verify the resolved path is within an expected parent:
```ts
const canonicalRoot = path.resolve(scopeRoot);
if (!canonicalRoot.startsWith(path.resolve("."))) {
  throw new Error(`GI_DECIDE_BAD_INPUT: scopeRoot escapes expected tree: ${scopeRoot}`);
}
```
Alternatively, reject paths containing `..` segments. This issue exists in both `decideFromRegistry` (line ~150) and `decideFireFromGraph` (line ~170).
  ```existing
  const registry = buildRegistry(scopeRoot);
  ```
  ```suggested
  const canonicalRoot = path.resolve(scopeRoot);
  // Guard against path traversal — scopeRoot must not escape the expected tree.
  // (Replace the sentinel check below with a project-specific root if applicable.)
  if (!canonicalRoot.startsWith(path.resolve('.'))) {
    throw new Error(`GI_DECIDE_BAD_INPUT: scopeRoot escapes expected tree: ${scopeRoot}`);
  }
  const registry = buildRegistry(canoni
  ```
- **src/omp/decision.ts:257-257** (bug)
  **Unguarded `new FireLedger(ledgerPath)` breaks the return-type contract.** The `mkdirSync` call above is carefully wrapped in a try/catch that produces a named error — but the immediately following `new FireLedger(ledgerPath)` is unprotected. `FireLedger`'s constructor throws `LedgerError` for a corrupt file, a permission denial, or a migration failure. That untyped throw escapes `decideFireFromGraph`, violating its `FireEvidence` return contract. Wrap it consistently:
```ts
let ledger: FireLedger;
try {
  ledger = new FireLedger(ledgerPath);
} catch (e) {
  throw new Error(`GI_LEDGER_OPEN_FAILED: cannot open ledger at ${ledgerPath} (${e instanceof Error ? e.message : String(e)})`);
}
```
  ```existing
  const ledger = new FireLedger(ledgerPath);
  ```
  ```suggested
  let ledger: FireLedger;
  try {
    ledger = new FireLedger(ledgerPath);
  } catch (e) {
    throw new Error(`GI_LEDGER_OPEN_FAILED: cannot open ledger at ${ledgerPath} (${e instanceof Error ? e.message : String(e)})`);
  }
  ```

## src/omp/jev.ts
- **src/omp/jev.ts:169-174** (bug)
  Null answer values from the API cause an uncaught TypeError that escapes the JevError contract. The check `if (a === undefined) continue;` only guards against missing keys. If the upstream returns null for an answer (e.g. {supported: null}), a is null, passes the undefined check, and `typeof a.noul` throws a raw TypeError (cannot read properties of null). This violates the evaluate() contract where callers expect only JevError. Fix: add a null guard after the undefined check.
  ```existing
  const a = answers[q.id];
      if (a === undefined) continue;
      // A Noul answer carries the probability in `noul`; anything else is a shape
      // we did not ask for and is DROPPED (the caller sees fewer answers and must
      // treat a missing answer as UNCERTIFIABLE, never as a pass).
      if (typeof a.noul === "number") out.push({ id: q.id, probability: a.noul });
  ```
  ```suggested
  const a = answers[q.id];
      if (a == null || typeof a !== "object") continue;
      // A Noul answer carries the probability in `noul`; anything else is a shape
      // we did not ask for and is DROPPED.
      if (typeof a.noul === "number") out.push({ id: q.id, probability: a.noul });
  ```

## src/omp/store-open.ts
- **src/omp/store-open.ts:50-63** (security)
  TOCTOU between `realpathSync` and the subsequent `mkdirSync`/`writeFileSync`: after `resolvedScopeRoot` is computed (line 60–66), an attacker with local filesystem access could replace a directory component in the resolved path with a symlink before `mkdirSync` on line 71 or `writeFileSync` on line 73. The `wx` flag guards the final file from truncation but does NOT prevent writing through a symlinked intermediate directory. The `assertSessionStorePath` inside `sessionStorePath` partially mitigates this (it re-resolves the parent), but the window between that assertion and the actual `mkdirSync`/`writeFileSync` is still open. Consider performing `realpathSync` on `path.dirname(storePath)` immediately before `mkdirSync`, or using `fs.opendirSync` + `fchown`/`fd`-based creation to minimize the window.
  ```existing
  let resolvedScopeRoot: string;
  try {
    resolvedScopeRoot = fs.realpathSync(input.scopeRoot);
  } catch {
    throw new GiScopeError(`GI_SCOPE_REFUSED: scopeRoot does not resolve: ${JSON.stringify(input.scopeRoot)}`);
  }
  const storePath = sessionStorePath(resolvedScopeRoot, input.sessionId);
  const existing = findGiSessionByStorePath(storePath);
  if (existing && existing.session_id !== own
  ```
  ```suggested
  let resolvedScopeRoot: string;
  try {
    resolvedScopeRoot = fs.realpathSync(input.scopeRoot);
  } catch {
    throw new GiScopeError(`GI_SCOPE_REFUSED: scopeRoot does not resolve: ${JSON.stringify(input.scopeRoot)}`);
  }
  const storePath = sessionStorePath(resolvedScopeRoot, input.sessionId);
  const existing = findGiSessionByStorePath(storePath);
  if (existing && existing.session_id !== own
  ```
