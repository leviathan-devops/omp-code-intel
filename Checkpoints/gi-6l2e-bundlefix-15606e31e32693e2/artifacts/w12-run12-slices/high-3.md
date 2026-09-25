# HIGH slice 3 — 10 findings across 8 files

## src/hunter/diagnostics/fixture-calibration.ts
- **src/hunter/diagnostics/fixture-calibration.ts:335-335** (bug)
  Bug: `profileFromDisk` flag is silently dropped, contradicting the documented design intent. `loadFixtureProfile` returns `{ profile, profileFromDisk }` (line 313) and the JSDoc on lines 324–325 explicitly states: 'The coordination fact (the profileFromDisk flag) rides the loader's FixtureLoadResult; the caller reports it, never hides it.' However, only `{ profile }` is destructured on line 335, so the flag is discarded. Any caller of `runFixtureCalibration` has no way to know whether the profile was loaded from disk or synthetically constructed, making the coordination gap invisible — exactly the anti-pattern the code is designed to prevent.
  ```existing
  const { profile } = loadFixtureProfile(fixtureProfileDir);
  ```
  ```suggested
  const { profile, profileFromDisk } = loadFixtureProfile(fixtureProfileDir);
    // ... later, include profileFromDisk in the return or a richer result type
  ```
- **src/hunter/diagnostics/fixture-calibration.ts:170-173** (security)
  Security: The path-traversal containment check uses `path.resolve` which normalizes the logical path but does **not** follow symlinks. A symlink placed inside the fixture directory (e.g., `fixtures/fire/link -> /etc`) that points outside the boundary will pass the `startsWith` check because `path.resolve(dir, '../etc')` resolves to a path that does not start with `dir + path.sep`. However, when `readFileSync` follows the symlink, it reads arbitrary files outside the fixture boundary. Use `fs.realpathSync` to resolve symlinks before the containment comparison. This same issue exists in both `loadFireFixture` (line 170–171) and `loadGoldenFixture` (line 193–194).
  ```existing
  const resolvedSource = path.resolve(dir, manifest.sourceFile);
  if (resolvedSource !== path.resolve(dir) && !resolvedSource.startsWith(path.resolve(dir) + path.sep)) {
    throw new Error(`CALIBRATION_FIXTURE_INVALID: fire fixture ${dir} sourceFile '${manifest.sourceFile}' escapes the fixture directory`);
  }
  ```
  ```suggested
  const resolvedSource = path.resolve(dir, manifest.sourceFile);
  // Resolve symlinks so a symlink inside the dir pointing outside is caught.
  const realSource = fs.realpathSync(resolvedSource);
  const realDir = fs.realpathSync(path.resolve(dir));
  if (realSource !== realDir && !realSource.startsWith(realDir + path.sep)) {
    throw new Error(`CALIBRATION_FIXTURE_INVALID: fire fixture ${dir} sou
  ```

## src/hunter/graph/resolver.ts
- **src/hunter/graph/resolver.ts:196-198** (bug)
  **Bug — entity silently dropped from output.** `resolvedAliases` is built from each decision's `alias` field, which is the *harness-provided alias string* — it could match either a new entity's `id` or `label`. If entity A is resolved by the harness with alias="foo" (matching A.id), and a distinct entity B has `label="foo"`, then `resolvedAliases.has(ne.label)` is `true` for entity B, so B is skipped from heuristic fallback and is **missing from the final decisions array entirely**.

Fix: build the resolved set from the *entity identity* that was actually matched, not from the harness alias string:
```ts
const resolvedEntityIds = new Set(decisions.map((d) => d.newEntity.id));
for (const ne of newEntities) {
  if (!resolvedEntityIds.has(ne.id)) {
```
  ```existing
  const resolvedAliases = new Set(decisions.map((d) => d.alias));
  for (const ne of newEntities) {
    if (!resolvedAliases.has(ne.id) && !resolvedAliases.has(ne.label)) {
  ```
  ```suggested
  const resolvedEntityIds = new Set(decisions.map((d) => d.newEntity.id));
  for (const ne of newEntities) {
    if (!resolvedEntityIds.has(ne.id)) {
  ```

## src/hunter/profile/loader.ts
- **src/hunter/profile/loader.ts:314-325** (bug)
  **Flow-value parser has no recursion-depth cap (stack overflow / denial-of-service).**

The block-level parser correctly caps recursion at depth 100 (F-67 fix), but `parseFlowValue` → `parseFlowMap`/`parseFlowArray` → `parseFlowValue` can recurse without any depth bound. A crafted YAML profile with a single-line value like `{a:{b:{c:{…}}}}` nested >10,000 levels deep would overflow the call stack with a `RangeError`, which would be caught by the generic `catch` in `loadProfile` (line 498) and surfaced as a generic `PROFILE_INVALID` — losing the named-error contract and the specific field context.

The fix should mirror the block-level guard: add a `depth` parameter (default 0) to `parseFlowValue`, `parseFlowMap`, and `parseFlowArray`, and reject with `YamlParseError` at depth > 100.
  ```existing
  /** Parse a single-line flow value: flow map | flow array | quoted | scalar. */
function parseFlowValue(token: string, line: number): unknown {
  const t = token.trim();
  if (t === '') return null;
  if (t.startsWith('{')) {
    if (!t.endsWith('}')) yamlErr([], t, line, `flow map is not closed on a single line: "${t}"`);
    return parseFlowMap(t.slice(1, -1), line);
  }
  if (t.startsWith('['))
  ```
  ```suggested
  /** Parse a single-line flow value: flow map | flow array | quoted | scalar. */
function parseFlowValue(token: string, line: number, depth = 0): unknown {
  if (depth > 100) yamlErr([], token, line, 'maximum flow-nesting depth (100) exceeded');
  const t = token.trim();
  if (t === '') return null;
  if (t.startsWith('{')) {
    if (!t.endsWith('}')) yamlErr([], t, line, `flow map is not closed on
  ```

## src/kernel/graph-diff.ts
- **src/kernel/graph-diff.ts:136-141** (bug)
  The blast-radius comparison only checks nodes present in `after.topDegree` (top-5) against `before.topDegree`. A node that was NOT in the top-5 before (e.g., had 2 inbound edges) but now has a very high inbound count (e.g., 50) will appear in `after.topDegree`, but `beforeDeg.get(t.label)` returns `undefined` and the node is silently skipped. This means the most dramatic blast-radius jumps — nodes going from near-zero to very high — can go entirely undetected if they weren't already in the before snapshot's top-5. To properly detect all blast-radius jumps, consider maintaining the full inbound map (not just top-5) in the snapshot, or at minimum building a complete `beforeDeg` map from the full snapshot data.
  ```existing
  const beforeDeg = new Map(before.topDegree.map((t) => [t.label, t.inbound]));
  const blastRadiusChanges: GraphDiffResult["blastRadiusChanges"] = [];
  for (const t of after.topDegree) {
    const b = beforeDeg.get(t.label);
    if (b !== undefined && t.inbound > b) blastRadiusChanges.push({ label: t.label, before: b, after: t.inbound });
  }
  ```
  ```suggested
  // Build full inbound maps for complete blast-radius comparison
  const beforeInbound = new Map<string, number>();
  for (const [cid, count] of before.fullInbound) {
    const node = beforeNodesByCid.get(cid);
    beforeInbound.set(node?.label ?? cid, count);
  }
  const afterInbound = new Map<string, number>();
  for (const [cid, count] of after.fullInbound) {
    const node = afterNodesByCid.get
  ```

## src/omp/enforcement.ts
- **src/omp/enforcement.ts:128-128** (bug)
  The design comments promise fail-OPEN handles timeouts ("a timeout … SKIPS with a named reason") and the evidence scan catch labels itself "TSG_TIMEOUT", but no timeout is enforced on either `deps.judge.evaluate()` or `deps.loadUnit.retrieve()`. If an engine hangs (e.g., model cold-start, network stall), these `await` calls block indefinitely — the caller (an editor surface per R5) wedges, contradicting the fail-OPEN/fail-CLOSED polarity contract. Wrap calls in `Promise.race` with a timeout (e.g., via `AbortController` or a `setTimeout`-based reject) appropriate to each layer.
  ```existing
  answers = await deps.judge.evaluate({ diff: input.diff, task: input.task }, input.rules);
  ```
  ```suggested
  // Enforce the ~300ms fail-open budget stated in the kernel header.
    const JUDGE_TIMEOUT_MS = 5_000;
    answers = await Promise.race([
      deps.judge.evaluate({ diff: input.diff, task: input.task }, input.rules),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("judge timeout")), JUDGE_TIMEOUT_MS),
      ),
    ]);
  ```

## src/omp/layer-registry.ts
- **src/omp/layer-registry.ts:228-228** (bug)
  `factsFor()` silently drops consumers that return non-array `facts()` via `console.error` + `continue`, but `auditOne()` returns a `GI_LAYER_ERROR` verdict. This is by design (documented as F-707), but `console.error` output is ephemeral and may be lost in production log aggregation. If the caller relies on `factsFor()` alone (without also calling `audit()`), the non-array fault is invisible. The method should consider returning an augmented result or a second return value that surfaces faults, so callers get the same fidelity as `audit()`.
  ```existing
  if (!Array.isArray(got)) { console.error('[layer-registry] factsFor: consumer ' + p.id + ' returned non-array facts - see audit GI_LAYER_ERROR:' + p.id); continue; }
  ```
  ```suggested
  // Option: return { facts: LayerFact[], faults: { consumer: ConsumerId; reason: string }[] }
// so callers of factsFor() can detect mid-query faults without calling audit() separately.
  ```

## src/omp/populate-graphify.ts
- **src/omp/populate-graphify.ts:268-276** (bug)
  **Missing symlink cycle guard in hashSourceTree — potential infinite loop**

The freshness probe walk (isGraphifyCheckoutFreshFor) has a `visited` Set keyed on `fs.realpathSync(dir)` to prevent infinite recursion from symlink cycles (F-846 FIX). However, the `walk` function inside `hashSourceTree` (used by computeSourceHash / computeSourceHashWithBudget) does NOT have any equivalent cycle guard. If `src/` contains a symlink cycle (e.g., `src/self -> src`), the freshness probe correctly detects and reports `stale-read-failed`, but `computeSourceHash` will recurse forever (until the Node.js stack overflows), bypassing the budget counter (which only counts files, not directory visits). This is especially dangerous because `computeSourceHash` is called in the populate path after the freshness gate passes — a project that somehow passes freshness (via sidecar match on a cached hash) but then triggers a rehash (e.g., sidecar write failed last time, next run uses mtime path) would hang or crash.
  ```existing
  const visitedDirs = new Set<string>();
  const walk = (dir: string, prefix: string): void => {
    if (budget.n <= 0) { exhausted = true; return; }
    let realDir: string;
    try { realDir = fs.realpathSync(dir); } catch { hash.update(`skip-dir:${prefix}\n`); return; }
    if (visitedDirs.has(realDir)) return;
    visitedDirs.add(realDir);
    let entries: fs.Dirent[];
    try { entries = fs.rea
  ```
  ```suggested
  const visitedDirs = new Set<string>();
  const walk = (dir: string, prefix: string): void => {
    if (budget.n <= 0) { exhausted = true; return; }
    let realDir: string;
    try { realDir = fs.realpathSync(dir); } catch { hash.update(`skip-dir:${prefix}\n`); return; }
    if (visitedDirs.has(realDir)) { hash.update(`skip-cycle:${prefix}\n`); return; }
    visitedDirs.add(realDir);
    let entri
  ```
- **src/omp/populate-graphify.ts:433-449** (bug)
  **Sidecar write failure creates an unbounded rebuild loop with no circuit-breaker**

If the sidecar write (`fs.writeFileSync(hashPath, vettedHash, "utf8")`) fails persistently (read-only filesystem, disk full, permissions), every subsequent `populateFromGraphifyCheckout` call will:
1. Find no sidecar → fall back to mtime freshness check
2. Mtime check may prove the graph 'fresh' (mtime hasn't changed)
3. Rebuild, populate, try sidecar write, fail again

The error is logged loudly (good), but there is no backoff, no circuit-breaker, and no persistent failure counter. On a read-only filesystem, this loops indefinitely on every invocation. Consider writing a failure marker (e.g., a `.graph_hash_FAILED` sentinel) that the freshness probe can detect to short-circuit to stale immediately, or implement exponential backoff.
  ```existing
  try {
      // W46: write the VETTED hash captured at gate-pass — the post-commit
      // rehash used to absorb mid-populate edits (stale-wins laundering).
      fs.writeFileSync(hashPath, vettedHash, "utf8");
    } catch (hashErr) {
      // ★ F-400 FIX (2026-09-24, the run-7 CRITICAL): the sidecar write failure was
      //   logged at `console.log` — INVISIBLE to an operator watching errors, a
  ```

## src/scoping/db-path.ts
- **src/scoping/db-path.ts:42-45** (bug)
  Environment variable values are not tilde-expanded. If a user sets an env var (e.g. `MY_DB_DIR=~/data`) to override the path, the tilde is treated literally, producing a relative path like `~/data/file.db` instead of expanding to the home directory. The spec's `defaultDir` and `testFile` both support tilde expansion, but the env-var override path (the highest-priority source) does not — this is inconsistent and could silently resolve to the wrong location.
  ```existing
  for (const env of spec.envVars) {
      const v = process.env[env];
      if (v && v.trim().length > 0) return path.join(v.trim(), spec.fileName);
    }
  ```
  ```suggested
  const TILDE = '~';
    const TILDE_SLASH = '~/';
    for (const env of spec.envVars) {
      const v = process.env[env];
      if (v && v.trim().length > 0) {
        let raw = v.trim();
        if (raw === TILDE || raw.startsWith(TILDE_SLASH)) {
          const home = process.env.HOME ?? process.env.USERPROFILE;
          if (!home) {
            throw new Error(
              `[db-path] HOME_NOT
  ```
