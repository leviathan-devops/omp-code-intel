# HIGH slice 3 — 13 findings across 11 files

## src/hunter/diagnostics/fixture-calibration.ts
- **src/hunter/diagnostics/fixture-calibration.ts:301-306** (bug)
  `runFixtureCalibration` destructures `{ profile, fixtures }` from `loadFixtureProfileFixtures` but discards `profileFromDisk`. The `CalibrationResult` type (defined in `calibration.ts`) has no field to carry this flag. The extensive comments in this file repeatedly emphasize that 'the coordination gap is REPORTED, never masked' and 'the coordination fact rides the loader's FixtureLoadResult; the caller reports it, never hides it' — but the function silently drops it. This contradicts the stated design invariant and means callers of `runFixtureCalibration` have no way to distinguish 'profile.yaml landed from battery-p6' from 'spec-shaped fallback profile was constructed'.
  ```existing
  export async function runFixtureCalibration(
  fixtureProfileDir: string,
  opts: { recordPath?: string; dryRun?: boolean; battery?: CompiledPredicate[] } = {},
): Promise<CalibrationResult> {
  try {
    const { profile, fixtures } = loadFixtureProfileFixtures(fixtureProfileDir);
  ```
  ```suggested
  export async function runFixtureCalibration(
  fixtureProfileDir: string,
  opts: { recordPath?: string; dryRun?: boolean; battery?: CompiledPredicate[] } = {},
): Promise<CalibrationResult & { profileFromDisk: boolean }> {
  try {
    const { profile, fixtures, profileFromDisk } = loadFixtureProfileFixtures(fixtureProfileDir);
    const battery = opts.battery ?? (await compileFixtureBattery(profi
  ```

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

## src/hunter/graph/resolver.ts
- **src/hunter/graph/resolver.ts:226-227** (bug)
  Inconsistent alias matching between decide() and run() harness paths: The `decide` path matches aliases via `n.id === alias || n.label === alias` (line ~108), but the `run` path only checks `n.id === alias` (line ~132). This means the `run` path silently drops valid harness decisions that use labels as aliases, causing those entities to fall through to full heuristic resolution — an inconsistency that could produce different resolution outcomes depending on which harness path is used.
  ```existing
  const newEnt = newEntities.find((n) => n.id === alias);
              if (!newEnt) continue;
  ```
  ```suggested
  const newEnt = newEntities.find((n) => n.id === alias || n.label === alias);
if (!newEnt) continue;
  ```
- **src/hunter/graph/resolver.ts:204-204** (bug)
  Harness partial-match silently discards all valid decisions: When the harness returns decisions for only a subset of entities (e.g., some filtered by hallucination checks or dangling canonical fallbacks), the `decisions.length === newEntities.length` check discards the entire harness result and falls back to full heuristic resolution. This means correct harness decisions for the subset that were processed are silently lost. Consider merging harness decisions with heuristic fallback for the remaining entities instead of discarding everything.
  ```existing
  if (decisions.length === newEntities.length) harnessDecisions = decisions;
  ```
  ```suggested
  if (decisions.length > 0) {
  // Merge: use harness decisions for resolved entities, heuristic for the rest
  const resolvedAliases = new Set(decisions.map(d => d.alias));
  for (const ne of newEntities) {
    if (!resolvedAliases.has(ne.id)) {
      const h = heuristicDecide(ne, existing);
      decisions.push({ alias: ne.id, canonicalId: h.canonical ? h.canonical.canonical_id : ne.id, verdict: h
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

## src/hunter/surface/query-tool.ts
- **src/hunter/surface/query-tool.ts:529-529** (bug)
  The `r.step` property is never set by the `chain()` verb, so `r.step ?? 1` always evaluates to `1`. Every chain step record in LLM format is mislabeled as step=1. The step number should be derived from the position in the path (e.g., `step` should be set in `chain()` on each step object, or derived here from the record's position/index).

Suggested fix: in `chain()`, add `step: cur.steps.length + 1` to each step object:
```typescript
const step: QueryRow = {
  step: cur.steps.length + 1,
  from: cur.id, to: e.dst_label, kind: e.predicate,
  file: e.dst_file ?? '', line: e.dst_line ?? 0,
};
```
  ```existing
  return { record: `chain step=${r.step ?? 1} from=${String(r.from)} to=${String(r.to)} kind=${String(r.kind)}` };
  ```
  ```suggested
  return { record: `chain step=${r.step ?? 1} from=${String(r.from)} to=${String(r.to)} kind=${String(r.kind)}` };
  ```

## src/kernel/graph-test-target.ts
- **src/kernel/graph-test-target.ts:0-0** (performance)
  N+1 query performance issue: For each of the N callers, `whoCallsInDb(db, label)` is called, which internally runs `resolveLiveIds` (a DB query) plus the main edges query. With caching, unique callers still each trigger a full DB round-trip. For functions with many callers, this is a significant bottleneck. Consider adding a batch query (e.g., a single `whoCallsInDb` call per caller or a bulk degree calculation), or at least documenting the O(N) DB query cost and the caller-count upper bound.
  ```existing
  const degreeOf = (label: string): number => {
      const hit = degreeCache.get(label);
      if (hit !== undefined) return hit;
      const d = whoCallsInDb(db, label).rows;
      degreeCache.set(label, d);
      return d;
    }
  ```
  ```suggested
  // Batch approach: collect all unique caller labels first, then compute
    // degrees in a single pass or a dedicated batch function.
    const degreeOf = (label: string): number => {
      const hit = degreeCache.get(label);
      if (hit !== undefined) return hit;
      const d = whoCallsInDb(db, label).rows;
      degreeCache.set(label, d);
      return d;
    }
  ```

## src/omp/evidence-producer.ts
- **src/omp/evidence-producer.ts:353-356** (performance)
  **Performance: N-times full-file re-read in `resolveFromSession`** — `readRecords` is called once per unresolved fire (line 355), and each call reads + parses the entire NDJSON file, splits it into lines, JSON-parses every line, and filters by `fireStateHash`. For N unresolved fires and a file of size S, this is O(N × S). As sessions accumulate evidence across many fires, this degrades linearly. A single read + group-by-`fireStateHash` pass would be O(S) and eliminate N−1 redundant file reads.

Suggested fix: read the file once, partition into a `Map<fireStateHash, OutcomeRecord[]>`, and look up per fire.
  ```existing
  const perFire = new Map<string, OutcomeRecord[]>();
  for (const p of pairs) {
    perFire.set(p.row.stateHash, readRecords(opts.recordsPath, p.row.stateHash));
  }
  ```
  ```suggested
  // Read the file ONCE and partition by fireStateHash — O(S) instead of O(N × S).
  const allRecords = readRecordsAll(opts.recordsPath);
  const perFire = new Map<string, OutcomeRecord[]>();
  for (const r of allRecords) {
    const key = (r as OutcomeRecord & { fireStateHash: string }).fireStateHash;
    let bucket = perFire.get(key);
    if (bucket === undefined) { bucket = []; perFire.set(key, b
  ```

## src/omp/extension.ts
- **src/omp/extension.ts:136-170** (security)
  **TOCTOU gap: statSync on stale `real` before the re-resolve guard** — The `statSync` at line ~133 checks that `real` is a directory using the first-resolved path. However, the TOCTOU re-validation at lines 166-170 only re-resolves `normalized` via `realpathSync` and compares path *identity* (`realAfter !== real`) — it does NOT re-check the directory type. An attacker who swaps a symlink target from a directory to a file between the `statSync` and the final `realpathSync` can pass the type check with the stale `real` while the re-resolve still matches (same symlink, different target). The re-resolve should also re-stat to confirm the target remains a directory.

Suggested fix: after line 168 (`if (realAfter !== real)`), add a second stat check on `realAfter`:
```typescript
if (realAfter !== real) {
  return { ok: false, error: `GI_PATH_DENIED: the path changed during the confinement check (TOCTOU) — '${normalized.slice(0, 120)}'` };
}
let stAfter: import("node:fs").Stats | null = null;
try { stAfter = fs.statSync(realAfter); } catch { stAfter = null; }
if (!stAfter || !stAfter.isDirectory()) {
  return { ok: false, error: `GI_PATH_DENIED: targetPath is not a directory after re-resolve: '${realAfter.slice(0, 120)}'` };
}
```
  ```existing
  if (!st || !st.isDirectory()) {
    return { ok: false, error: `GI_PATH_DENIED: targetPath is not a directory: '${real.slice(0, 120)}'` };
  }
  // W44 (supersedes the V21 ':' note): the split lives in parseTargetRoots
  // ('|' only — never ':').
  const allowRoots = parseTargetRoots(process.env.GI_TARGET_ROOTS ?? "");
  const roots = allowRoots.length > 0 ? allowRoots : [callerCwd, "/tmp"];
  co
  ```
- **src/omp/extension.ts:563-573** (security)
  **Security: `fs.mkdirSync(auditRoot, { recursive: true })` runs BEFORE the symlink-plant check** — Line 565 creates the audit directory before the `realpathSync` + `path.relative` confinement check at lines 569-571. If an attacker pre-creates a symlink at the `auditRoot` path (`.omp/graph-intelligence/audit`) pointing to an external directory, `mkdirSync` with `recursive: true` will follow the symlink and create the directory tree at the attacker's target location. The subsequent symlink check detects the escape and returns an error, but the directory has already been created outside the confinement boundary.

The W12/W15 comments describe the fix as checking *before* `mkdtemp`, but `mkdirSync` (which also follows symlinks) is not guarded. Suggested fix: use `fs.mkdirSync` followed by an immediate `realpathSync` check *before* the `mkdtempSync` call, and `fs.rmdirSync(auditRoot)` (or a cleanup) if the check fails — or, better yet, create the parent directory chain with `mkdirSync` after resolving each component:
```typescript
const auditRoot = join(targetReal, ".omp", "graph-intelligence", "audit");
const auditRootReal = fs.realpathSync(auditRoot);
// Re-resolve after creation to detect symlink plant:
const ledgerRel = path.relative(targetReal, auditRootReal);
if (ledgerRel === "" || ledgerRel.startsWith("..") || path.isAbsolute(ledgerRel)) {
  // clean up the planted symlink's target before refusing
  return textResult("GI_LEDGER_DENIED: audit root is a symlink plant", ...);
}
```
Or more robustly: create the `.omp/graph-intelligence/audit` path with `mkdirSync` inside a try, immediately `realpathSync`, and if it escaped, remove the created directory tree before returning the error.
  ```existing
  const targetReal = resolve(targetRoot);
      const auditRoot = join(targetReal, ".omp", "graph-intelligence", "audit");
      fs.mkdirSync(auditRoot, { recursive: true });
      // W15/W16 (frozen-scan HIGH): component containment on the AUDIT ROOT —
      // refuse a pre-planted symlink BEFORE mkdtemp (path.relative verdict,
      // never a string prefix).
      const auditRootReal = fs.realpat
  ```

## src/omp/graph-facts.ts
- **src/omp/graph-facts.ts:103-103** (bug)
  The `LIKE` helper wraps every target in `%target%` (line 100), causing ALL queries (`known` check, `inDegree`, `outD`, self-edge) to perform **substring matching** on `canonical_id`. This means unrelated symbols that merely *contain* the target as a substring will be conflated — producing false positives or false negatives across all five rules.

For example, `target = "User"` will match `UserProfile`, `UserService`, `AdminUser`, etc. The `known` node-count check (line 167) will think multiple unrelated nodes are 'the target', and `inDegree` (line 130) will aggregate edges belonging to different symbols.

The self-edge query (line 240) is especially sensitive, as it requires both `src_canonical` and `dst_canonical` to match `%target%`, leading to false self-edge counts for M-GRAPH-5 when multiple nodes share the substring.

Consider using exact match (`=`) or, if prefix matching is needed, use `LIKE 'prefix%'` without the leading wildcard.
  ```existing
  const LIKE = (target: string) => `%${target.replace(/[%_]/g, "")}%`;
  ```
  ```suggested
  const LIKE = (target: string) => `${target.replace(/[%_]/g, "")}%`;
  ```

## src/omp/populate-graphify.ts
- **src/omp/populate-graphify.ts:525-532** (bug)
  Indentation mismatch in `writeGraphifyCheckout` suggests a misplaced `try` block around COMMIT. The `db.exec("COMMIT;")` and its catch/rollback are indented inside an extra level, implying they sit inside a nested `try` that does NOT have a corresponding outer `catch`/`finally` for the ROLLBACK path. If the COMMIT is indeed nested inside two `try` blocks, the inner catch's ROLLBACK fires, but the outer catch also fires and issues a SECOND ROLLBACK — a double-rollback. More critically, the intent of the F-127 fix was to keep the COMMIT inside the same `try` that runs the inserts, but the current indentation places COMMIT and its catch in a scope that could mask commit failures from the outer catch. Verify the brace nesting matches the single-transaction contract.
  ```existing
  db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["populated_at", new Date().toISOString()]);
      try {
    db.exec("COMMIT;");
  } catch (commitErr) {
    try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
    throw commitErr;
  }
    } catch (e) {
  ```
  ```suggested
  db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["populated_at", new Date().toISOString()]);
      try {
        db.exec("COMMIT;");
      } catch (commitErr) {
        try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
        throw commitErr;
      }
    } catch (e) {
  ```

## src/scoping/scope-binding.ts
- **src/scoping/scope-binding.ts:171-187** (security)
  assertOwnSession silently permits an action when the session belongs to no known ecosystem (neither this one nor any sibling). An unbound, stale, or typo'd session id bypasses the mutual-exclusivity contract without any warning. Consider logging a warning or throwing when the session is unbound and the caller expects it to be bound — at minimum, the operator should be told that the session is unknown.
  ```existing
  assertOwnSession(sessionId: string, action: string): void {
    const own = this.spec.registry.findWaveBySession(sessionId);
    if (own) return; // the session belongs to THIS ecosystem — proceed.
    // The READ-ONLY sibling check (auto-wired by the manager): is the session
    // a FOREIGN wave's agent? Refuse with the remedy. If no registry knows
    // it, the session is unbound — proceed; th
  ```
  ```suggested
  assertOwnSession(sessionId: string, action: string): void {
    const own = this.spec.registry.findWaveBySession(sessionId);
    if (own) return; // the session belongs to THIS ecosystem — proceed.
    for (const [eco, surface] of Object.entries(this.siblingsFn ? this.siblingsFn() : {})) {
      const hit = surface.findWaveBySession(sessionId);
      if (hit) {
        throw new Error(
          `
  ```
