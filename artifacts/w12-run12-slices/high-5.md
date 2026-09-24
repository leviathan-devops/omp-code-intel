# HIGH slice 5 — 9 findings across 8 files

## src/hunter/graph/corbell-adapter.ts
- **src/hunter/graph/corbell-adapter.ts:217-217** (performance)
  `Atomics.wait()` blocks the calling thread entirely. In `defaultExec`, this is exported as a public `ExecFn` — if any production (non-test) caller invokes `defaultExec` with a timeout and hits a SQLITE_BUSY retry, the entire Node.js event loop freezes for up to 16 seconds per retry (worst case: 8 retries × 16s = 128s total freeze). This is acceptable for tests (which stub `ExecFn`) but dangerous if `defaultExec` is used in production async contexts. Consider adding a prominent runtime guard or switching to a non-blocking backoff (e.g., `setTimeout` + promise) for the public export path.
  ```existing
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, backoff);
  ```

## src/hunter/harness/micro-loop-machine.ts
- **src/hunter/harness/micro-loop-machine.ts:445-450** (bug)
  **Resource leak: `done()` path does not close the SQLite DbClient.**

The F-501 fix (line 457) correctly closes `snapshot.db` inside `stop()`, but `done()` resolves without triggering db closure. If a caller does `await handle.done()` and never calls `stop()` (or the `stop()` call is missed due to the `pendingSettle` bug above), the SQLite WAL file handle leaks.

Consider closing the db inside `settle()` (or a shared teardown function called by both `done()` and `stop()`), or document that callers must always call `stop()` after `done()` resolves.
  ```existing
  function settle(): void {
          if (settled) return;
          settled = true;
          pendingSettle = null;
          sub2.unsubscribe();
          sub3.unsubscribe();
  ```

## src/hunter/shared/containment.ts
- **src/hunter/shared/containment.ts:111-114** (bug)
  The `resolved` flag (e.g., `rootResolved` in `checkContained`) is computed but not included in the `ContainmentResult` interface or returned to callers. This means functions like `requireContained` cannot detect when a path was not truly resolved via `realpathSync`, undermining the module's guarantee (F-602). Add `resolved` to `ContainmentResult` and ensure it is surfaced in all return paths, including wrapper functions.
  ```existing
  let rootReal: string;
  let rootResolved: boolean;
  try { rootReal = fs.realpathSync(root); rootResolved = true; }
  catch { rootReal = realNearest(root); rootResolved = false; }
  ```
  ```suggested
  let rootReal: string;
  let rootResolved: boolean;
  try { rootReal = fs.realpathSync(root); rootResolved = true; }
  catch { rootReal = realNearest(root); rootResolved = false; }
  const real = realNearest(target);
  const contained = insideRoot(real, rootReal);
  const targetAbs = path.resolve(target);
  const resolved = real !== targetAbs || fs.existsSync(real);
  return { real, rootReal, conta
  ```

## src/hunter/tools/report-writer-local.ts
- **src/hunter/tools/report-writer-local.ts:53-59** (bug)
  The regex `/^#{2,6} /m` does not exclude Markdown fenced code blocks (``` ... ```). If the report body contains a fenced code block with lines like `## Example` or `### ```json`, the `s.search(/^#{2,6} /m)` at line 43 will match inside the code fence, causing unintended heading promotion and corruption of the report's code-block content. Consider using a regex that skips fenced code blocks (e.g., strip fenced blocks before matching, or use a state-machine scan).
  ```existing
  const deepIdx = s.search(/^#{2,6} /m);
    if (deepIdx !== -1) {
      const before = s.slice(0, deepIdx);
      const after = s.slice(deepIdx).replace(/^#{2,6}[ ]?/, "# ");
      s = before + after;
      idx = s.search(/^# /m);
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

## src/omp/adapters/semantica.ts
- **src/omp/adapters/semantica.ts:0-0** (bug)
  The F-825 type guard (line 74) validates that `kg.entities` is an array, but does not validate individual element shapes. If a corrupted or adversarial kg.json contains an entity where `name` is a number, boolean, or object (e.g. `{"name": 42}`), the `??` on line 77 does not trigger (the value is not null/undefined), and `.includes()` is called on a non-string — throwing `TypeError: e.name.includes is not a function`. This crashes the entire `facts()` call mid-query, turning what should be a single bad entry into a GI_LAYER_ERROR verdict for the whole consumer.

Suggested fix: add an element-level type check in the filter, or validate each entity's shape before consumption.
  ```existing
  const hits = (kg.entities ?? []).filter((e) => (e.name ?? ).includes(subject));
  ```
  ```suggested
  const hits = (kg.entities ?? []).filter((e) => {
        if (e === null || typeof e !== "object" || typeof e.name !== "string") return false;
        return e.name.includes(subject);
      });
  ```
- **src/omp/adapters/semantica.ts:0-0** (security)
  The `..` segment check on line 18 uses `scopeRoot.split(path.sep)`, which is `\` on Windows. A forward-slash path like `C:/foo/../etc` would not be split correctly — `path.sep` is `\`, so the split yields `['C:/foo/../etc']` and the `..` check passes. Although `path.resolve` normalizes the path afterward, the defensive check intended to catch lexical traversal is silently bypassed on Windows with mixed separators.

Suggested fix: normalize separators before splitting, or check against both `/` and `\` separators.
  ```existing
  if (!path.isAbsolute(scopeRoot) || scopeRoot.split(path.sep).includes("..") ) throw new Error(`GI_LAYER_SEMANTICA: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  ```
  ```suggested
  const normalizedSep = scopeRoot.replaceAll(/[/\\]/g, path.sep);
  if (!path.isAbsolute(scopeRoot) || normalizedSep.split(path.sep).includes("..") ) throw new Error(`GI_LAYER_SEMANTICA: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
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

## src/omp/typed-write.ts
- **src/omp/typed-write.ts:367-369** (bug)
  BUG: NaN propagation bypasses the [0,1] clamp. If `opts.ageDays` is NaN (e.g., caller passes an undefined arithmetic result), `Math.exp(-NaN / tau)` evaluates to NaN. Then `base * corr * NaN` = NaN. The final `Math.max(0, Math.min(1, NaN))` evaluates to NaN because `Math.min(1, NaN)` = NaN and `Math.max(0, NaN)` = NaN. This stores a non-numeric confidence in SQLite, which downstream consumers may not expect. Add a NaN guard after the multiplication or on the input.
  ```existing
  const fresh =
    typeof opts.ageDays === "number" && opts.ageDays > 0 ? Math.exp(-opts.ageDays / tau) : 1.0;
  const confidence = Math.max(0, Math.min(1, base * corr * fresh));
  ```
  ```suggested
  const fresh =
    typeof opts.ageDays === "number" && opts.ageDays > 0 ? Math.exp(-opts.ageDays / tau) : 1.0;
  const raw = base * corr * fresh;
  const confidence = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : DERIVATION_BASE["unknown"]!;
  ```
