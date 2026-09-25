# HIGH slice 5 — 10 findings across 8 files

## src/hunter/firewall/artifact-scope.ts
- **src/hunter/firewall/artifact-scope.ts:163-167** (security)
  **Security: Missing `masterReal` → `projectRootReal` containment check (symlink escape via existing MASTER_CONTEXT).**

When `masterReal !== null` (the master dir exists, possibly as a symlink), the code verifies that `parentReal` is inside `masterReal`, but never verifies that `masterReal` itself is inside `projectRootReal`. If an attacker (or stale configuration) creates `MASTER_CONTEXT` as a symlink to an external path (e.g., `/tmp/evil`), the following happens:

1. `targetParentNorm === masterNorm` → passes (both resolve to `<root>/MASTER_CONTEXT`)
2. `parentReal = realpathNearestExisting(...)` → resolves through the symlink to `/tmp/evil`
3. `masterReal = fs.realpath(masterNorm)` → also resolves to `/tmp/evil`
4. `parentReal === masterReal` → true → **check passes**
5. Write lands at `/tmp/evil/bug_hunter_report_v1.md` — outside the project.

The F-30 fix (2026-09-24) addressed the CREATE path (`masterReal === null`) by adding a `parentReal` vs `projectRootReal` check, but the analogous guard is missing from the non-CREATE branch. The module's own docblock (F-30 comment) explicitly mentions this exact scenario: *"a symlinked ancestor (e.g. a pre-existing `MASTER_CONTEXT` symlink to /tmp) passed the normalized containment above while resolving outside the project."*

**Fix:** Add a `masterReal` → `projectRootReal` containment check inside the `masterReal !== null` branch, before the `parentReal` vs `masterReal` check.
  ```existing
  if (masterReal !== null) {
    if (parentReal !== masterReal && !parentReal.startsWith(masterReal + path.sep)) {
      return blocked('REPORT_SCOPE_BLOCKED', base, input.target);
    }
  } else {
  ```
  ```suggested
  if (masterReal !== null) {
    // ★ F-30B: verify the resolved master dir itself stays inside the project root;
    // a MASTER_CONTEXT symlink pointing outside the project would otherwise pass
    // the parent-vs-master check (they resolve to the same external path).
    if (masterReal !== projectRootReal && !masterReal.startsWith(projectRootReal + path.sep)) {
      return blocked('REPORT_SCOPE
  ```

## src/hunter/harness/report.ts
- **src/hunter/harness/report.ts:250-263** (bug)
  The thinking-strip step reads back and rewrites the report file *before* the HUNT_DONE transactional commit. If the strip produces a truncated or corrupted file (e.g., the regex strips more than intended, or the `writeFileSync` partially writes due to a disk error), the HUNT_DONE event still records the path as successfully landed. This breaks the invariant that the DB truth matches the file truth. Consider either (a) moving the strip inside the writer seam (before the file is considered 'landed'), (b) computing the strip on the document string *before* the initial write, or (c) verifying file integrity post-strip and aborting the report if it fails.
  ```existing
  try {
      const raw = fs.readFileSync(writerResult.reportPath, 'utf-8');
      let stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, '');
      const titleMatch = stripped.match(/^# .*$/m);
      if (titleMatch && titleMatch.index !== undefined && titleMatch.index > 0) {
        stripped = stripped.substring(titleMatch.index);
      }
      if (stripped !== raw) {
        fs.writeFileSync(writ
  ```

## src/hunter/lexicon/compiled-store.ts
- **src/hunter/lexicon/compiled-store.ts:68-75** (bug)
  **Bug: Spurious ROLLBACK after successful COMMIT in `writeBattery` and `writeRuleCards`.**

In both functions, the nested try/try-finally/catch structure is flawed. When the transaction commits successfully, if `finalize()` throws in the `finally` block, the exception propagates to the outer `catch` block, which unconditionally executes `db.exec('ROLLBACK')` — **after the transaction has already been committed**. This issues a spurious ROLLBACK on a committed transaction, which may cause errors or corrupt state depending on the SQLite driver.

**Fix:** Move `COMMIT` outside the inner try, or restructure so the catch only fires when COMMIT has not succeeded. For example, track commit status with a boolean flag, or restructure the try blocks so the outer catch doesn't wrap the finally.
  ```existing
  db.exec('COMMIT');
  } finally {
    try { stmt.finalize(); } catch { /* already finalized or driver-closed — the ROLLBACK below is what matters */ }
  }
  } catch (e: unknown) {
    db.exec('ROLLBACK');
    throw e;
  }
  ```
  ```suggested
  db.exec('BEGIN');
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO compiled_predicates (${COMPILED_PREDICATES_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?)`,
  );
  let committed = false;
  try {
    for (const p of battery) {
      const checkCode = JSON.stringify({ template: p.template, bindings: p.bindings });
      stmt.run(
        p.id,
        p.family,
        p.template,
        JSON.strin
  ```

## src/hunter/lexicon/rule-card.ts
- **src/hunter/lexicon/rule-card.ts:147-147** (bug)
  The `DECLARED_CLASSIFICATION` regex uses the `i` (case-insensitive) flag, so it will match inputs like `classification: arch` or `Classification: Domain` and capture the mixed/lowercase form (e.g. `cm[1]` = `'arch'`). However, `isClassification()` performs a strict case-sensitive comparison (`v === 'ARCH' || v === 'LOGIC' || ...`), so the captured lowercase value is rejected and silently discarded. The operator's curated declaration is lost — exactly the class of bug the P6 fix was meant to prevent. Either remove the `i` flag from the regex (enforcing uppercase), or normalize with `.toUpperCase()` before the guard check.
  ```existing
  const DECLARED_CLASSIFICATION = /^\s*classification\s*[:=]\s*(ARCH|LOGIC|PROCESS|DOMAIN)\b/i;
  ```
  ```suggested
  const DECLARED_CLASSIFICATION = /^\s*classification\s*[:=]\s*(ARCH|LOGIC|PROCESS|DOMAIN)\b/;
  ```
- **src/hunter/lexicon/rule-card.ts:148-148** (bug)
  Same case-sensitivity mismatch as DECLARED_CLASSIFICATION: the `DECLARED_SEVERITY` regex uses the `i` flag and will capture lowercase values like `'crit'`, but `isSeverity()` compares against the uppercase-only `SEVERITIES` array (`['CRIT', 'HIGH', 'MED', 'WARN']`). A corpus line `severity: crit` matches the regex but the captured value is silently rejected by the guard, so the operator's curated severity is lost and the mechanical `rate()` fallback applies instead.
  ```existing
  const DECLARED_SEVERITY = /^\s*severity\s*[:=]\s*(CRIT|HIGH|MED|WARN)\b/i;
  ```
  ```suggested
  const DECLARED_SEVERITY = /^\s*severity\s*[:=]\s*(CRIT|HIGH|MED|WARN)\b/;
  ```

## src/hunter/tools/report-writer-local.ts
- **src/hunter/tools/report-writer-local.ts:98-100** (bug)
  Potential data loss: if `stripBeforeSeal` returns an empty string (e.g., the entire report consisted solely of `<think>` blocks with no remaining content after stripping), the condition `stripped !== raw` on line 99 would be true, and an empty file would be written back — silently destroying the report that `writeReportDirect` just successfully wrote. Add a guard to skip the write-back when the stripped result is empty, or log an error and leave the original file intact.
  ```existing
  const stripped = stripBeforeSeal(raw);
    if (stripped !== raw) {
      await fs.promises.writeFile(result.reportPath, stripped, "utf-8");
  ```
  ```suggested
  const stripped = stripBeforeSeal(raw);
    if (stripped !== raw) {
      if (stripped.length === 0) {
        console.error(`[report-writer-local] stripBeforeSeal produced empty output for runId=${input.runId} — leaving original file intact to avoid data loss`);
      } else {
        await fs.promises.writeFile(result.reportPath, stripped, "utf-8");
        console.log(`[report-writer-local] thin
  ```

## src/omp/adapters/kev.ts
- **src/omp/adapters/kev.ts:51-55** (bug)
  The uniform-distribution tolerance of `1e-3` is extremely tight. For a 3-option softmax, a near-uniform but still meaningless distribution such as `[0.34, 0.33, 0.33]` (max deviation ≈ 0.007 from 1/3) will pass this guard and produce a spurious verdict. The tolerance should be calibrated against the model's known output characteristics (e.g., empirically measured variance on known-uniform inputs) rather than using a magic constant. Consider a wider tolerance (e.g., `0.05`) or a statistical test (e.g., checking that the dominant option exceeds the second by a meaningful margin).
  ```existing
  export function isUniform(dist: readonly number[], tol = 1e-3): boolean {
  if (dist.length === 0) return true;
  const eq = 1 / dist.length;
  return dist.every((x) => Math.abs(x - eq) < tol);
}
  ```
- **src/omp/adapters/kev.ts:122-125** (bug)
  There is no validation that the distribution values are finite numbers. If the CLI outputs `[NaN, NaN, NaN]` or `[Infinity, -Infinity, 0]`, the `isUniform` check returns `false` (NaN/Infinity comparisons are always false), the argmax loop picks index 0, and a spurious verdict is produced. Add a guard that checks every element is a finite number before proceeding.
  ```existing
  const dist = ans.answers?.[0];
      if (dist === undefined || dist.length === 0) throw new Error("GI_ENFORCE_KEV: the KEV decision carried no distribution");
      // ★ THE UNIFORM GUARD — a pointer head that points at nothing is a DEFECT, not a verdict.
      if (isUniform(dist)) {
  ```

## src/omp/extension.ts
- **src/omp/extension.ts:142-142** (security)
  When `GI_TARGET_ROOTS` is unset, the fallback allowlist includes `/tmp`, so any path under `/tmp` passes confinement. An attacker who can plant files under `/tmp` (e.g. predictable temp paths from other tools, shared `/tmp` on multi-user systems) can make `confineTargetPath` return a `/tmp` path as 'confined'. This weakens the confinement guarantee for operators who haven't explicitly set `GI_TARGET_ROOTS`.
  ```existing
  const roots = allowRoots.length > 0 ? allowRoots : [callerCwd, "/tmp"];
  ```
  ```suggested
  // Consider removing "/tmp" from the default fallback, or at minimum document
  // the security implication. If /tmp is required for backwards compatibility,
  // restrict it to a subdirectory like "/tmp/gi-omp" to limit the attack surface:
  const roots = allowRoots.length > 0 ? allowRoots : [callerCwd];
  ```

## src/omp/ripwire-bridge.ts
- **src/omp/ripwire-bridge.ts:200-203** (bug)
  F-407 fix is only partially applied. The comment on lines 127-128 explicitly states: "Bare Number() returns NaN which silently propagates into data records" — and `safeNum` was introduced to fix this. However, `ripwireSafeDelete`, `ripwireDeadCode`, `ripwirePath`, and `ripwireVerify` all still use bare `Number()` on XML attribute values. When the external binary emits a non-numeric string for any of these attributes, the resulting `data` object silently contains NaN values that will propagate to downstream consumers.

Specifically:
- `ripwireSafeDelete` uses `Number(a.callers ?? 0)`, `Number(a.impact_reaches ?? 0)`, `Number(a.uses ?? 0)`, `Number(a.tested_self ?? 0)`.
- `ripwireDeadCode` uses `Number(a.count ?? 0)`.
- `ripwirePath` uses `Number(a.hops ?? 0)`.
- `ripwireVerify` uses `Number(a.hops ?? 0)` and `Number(a.count ?? 0)`.

Replace all bare `Number(a.xxx ?? 0)` with `safeNum(a.xxx, 0)` in these functions, consistent with what was already done in `ripwireEditCheck` (line 184).
  ```existing
  callers: Number(a.callers ?? 0),
      impact_reaches: Number(a.impact_reaches ?? 0),
      uses: Number(a.uses ?? 0),
      tested_self: Number(a.tested_self ?? 0),
  ```
  ```suggested
  callers: safeNum(a.callers, 0),
      impact_reaches: safeNum(a.impact_reaches, 0),
      uses: safeNum(a.uses, 0),
      tested_self: safeNum(a.tested_self, 0),
  ```
