# HIGH slice 1 — 13 findings across 9 files

## src/hunter/diagnostics/fixture-calibration.ts
- **src/hunter/diagnostics/fixture-calibration.ts:138-143** (bug)
  `bindingsMap` silently returns `{}` for any non-object input (including `undefined`, `null`, arrays). Combined with `compileFixtureBattery`, which iterates the entries of that map, a missing or malformed `declaredPredicates` section in the profile produces a zero-predicate battery with no warning. The calibration then runs with no predicates — an empty pass that proves nothing. The guard should treat a missing/empty `declaredPredicates` as a configuration error, not a silent fallback.
  ```existing
  function bindingsMap(v: unknown): Record<string, Record<string, unknown>> {
  if (v !== undefined && v !== null && typeof v === 'object') {
    return v as Record<string, Record<string, unknown>>;
  }
  return {};
}
  ```
  ```suggested
  function bindingsMap(v: unknown, label: string): Record<string, Record<string, unknown>> {
  if (v !== undefined && v !== null && typeof v === 'object' && !Array.isArray(v)) {
    const map = v as Record<string, Record<string, unknown>>;
    if (Object.keys(map).length === 0) {
      throw new Error(`CALIBRATION_INVALID: ${label} is an empty object — at least one binding is required`);
    }
    r
  ```
- **src/hunter/diagnostics/fixture-calibration.ts:317-323** (bug)
  The closed-loop invariant (C26) requires that the fire fixture's `ruleId` matches one of the compiled battery predicate IDs. `compileFixtureBattery` stamps the declared `ruleId` onto each compiled predicate, but `loadCalibrationFixtures` (and by extension `loadFixtureProfileFixtures`) assembles the fire fixtures and battery independently with no cross-validation. If the fire fixture's `ruleId` (e.g., `'P6'`) does not match any battery predicate ID (e.g., due to a renamed key in `profile.yaml`), the calibration runs with the wrong or no predicate — silently violating the closed-loop contract. Add an explicit check in `loadFixtureProfileFixtures` or `runFixtureCalibration` that every fire fixture's `ruleId` is present in the battery's predicate IDs.
  ```existing
  const battery = opts.battery ?? (await compileFixtureBattery(profile));
    const recordPath = opts.recordPath ?? fixtureProfileDir;
    return runCalibration(profile, fixtures, {
      battery,
      dryRun: opts.dryRun ?? true,
      recordPath,
    });
  ```
  ```suggested
  const battery = opts.battery ?? (await compileFixtureBattery(profile));
    const batteryIds = new Set(battery.map((p) => p.id));
    for (const fire of fixtures.fire) {
      if (!batteryIds.has(fire.ruleId)) {
        throw new Error(
          `CLOSED_LOOP_BROKEN: fire fixture ruleId '${fire.ruleId}' does not match any battery predicate id `[...batteryIds].join(', ') + ']'`
        );
      }
 
  ```
- **src/hunter/diagnostics/fixture-calibration.ts:157-158** (security)
  Path-traversal vulnerability exists in both `loadFireFixture` and `loadGoldenFixture`. The `manifest.sourceFile` value is joined directly into `readFileSync` without validating that the resolved path stays within the fixture directory. A malicious fixture's `manifest.json` could reference `../../etc/passwd` via `sourceFile` to read arbitrary files. Consider validating that the resolved path is within the fixture directory.
  ```existing
  const source = fs.readFileSync(path.join(dir, manifest.sourceFile), 'utf8');
  if (!manifest.ruleId || !manifest.file || !manifest.line) {
  ```
  ```suggested
  const resolvedSource = path.resolve(dir, manifest.sourceFile);
  if (!resolvedSource.startsWith(path.resolve(dir))) {
    throw new Error(`CALIBRATION_FIXTURE_INVALID: sourceFile '${manifest.sourceFile}' escapes fixture directory`);
  }
  const source = fs.readFileSync(resolvedSource, 'utf8');
  if (!manifest.ruleId || !manifest.file || !manifest.line) {
  ```

## src/hunter/graph/resolver.ts
- **src/hunter/graph/resolver.ts:0-0** (maintainability)
  The `decide` path (lines ~214–260) and the `run` path (lines ~263–305) contain near-identical JSON parsing, alias matching against `newEntities`, dangling-canonical heuristic fallback, and partial-match-merge logic. Additionally, the alias extraction is inconsistent: the `decide` path uses a `typeof rec.alias === 'string'` guard while the `run` path uses `String(rec.alias ?? '')`, which will coerce non-string types (e.g. `rec.alias === 0` → `'0'`, `rec.alias === true` → `'true'`) into strings, potentially creating spurious aliases that accidentally match entity ids or labels. This duplication means any bug fix applied to one path must be manually replicated to the other — and they can already silently diverge. Extract a shared function (e.g. `parseHarnessDecisions(rawJson, newEntities, existing)`) to ensure both paths apply identical validation, alias coercion, and fallback rules.
  ```existing
  try {
      const raw = await effectiveHarness.decide(prompt);
      if (typeof raw === 'string' && raw.trim().length > 0) {
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch (e: unknown) { throw new ResolverError(`RESOLVER_FAILED: harness returned non-JSON — ${e instanceof Error ? e.message : String(e)}`); }
        const obj = parsed as Record<string, unknown>;
       
  ```
  ```suggested
  // Extract shared parsing logic into a helper, e.g.:
function parseHarnessDecisions(
  rawDecisions: unknown[],
  newEntities: NewEntity[],
  existing: ExistingCanonical[],
): ResolutionDecision[] {
  const decisions: ResolutionDecision[] = [];
  for (const d of rawDecisions) {
    if (!d || typeof d !== 'object') continue;
    const rec = d as Record<string, unknown>;
    const alias = typeof rec
  ```

## src/hunter/lexicon/compiler.ts
- **src/hunter/lexicon/compiler.ts:220-227** (bug)
  Blocking I/O in the async code path: `compileBattery` is an async function designed to avoid blocking the event loop (as indicated by the F-146 FIX comment), but `extractRuleCards` internally calls `fs.readFileSync` (see rule-card.ts:283). This means the 'async' compile path still blocks the event loop during corpus reads, defeating the purpose of the async fix. Either `extractRuleCards` needs an async variant, or this should be documented as a known limitation.
  ```existing
  const version = await batteryVersionAsync(profile);
  if (db) {
    const row = db.prepare('SELECT COUNT(*) AS c FROM compiled_predicates WHERE battery_version = ?').get(version);
    if (Number(row?.['c'] ?? 0) > 0) {
      return { battery: loadBattery(db, version), batteryVersion: version, fromCache: true };
    }
  }
  const cards = extractRuleCards(profile.rules.corpus);
  ```

## src/hunter/profile/loader.ts
- **src/hunter/profile/loader.ts:528-533** (security)
  **Security: TOCTOU race between `realpathSync` calls allows symlink swap attack.** The `contained` function calls `realpathSync` to resolve `resolvedRoot` and each entry independently. Between these calls an attacker (with project-root write access) can swap a symlink: the first call resolves the root to `/project`, the entry resolves to `/project/src` (passes check), but at read time the symlink points to `/etc`. The fix is to resolve both the root and entry in a single atomic comparison, or resolve `resolvedRoot` once outside the loop and compare raw resolved paths. The current code comment acknowledges the race window; consider documenting the threat model explicitly so future maintainers understand the intentional trade-off.
  ```existing
  const contained = (entry: string): boolean => {
    const abs = path.resolve(resolvedRoot, entry);
    let real: string;
    try { real = fs.realpathSync(abs); } catch { return false; }
    return real === resolvedRoot || real.startsWith(resolvedRoot + path.sep);
  };
  ```
- **src/hunter/profile/loader.ts:342-343** (bug)
  **Bug: YAML parser accepts colons in plain scalars without a following space.** Per the YAML spec (and the parser's own intent), a colon is only a key-value separator when followed by whitespace or at end-of-line. The `indexOf(':')` check in `parseMapping` and `parseSequence` (and `splitTopLevel` via `findTopLevelColon`) finds ANY colon, so a plain scalar like `foo:bar` is incorrectly parsed as key `foo` with value `bar` instead of the string `foo:bar`. For the profile's current shapes this may not manifest, but it silently corrupts data for values like `p1.fallback:type` or any dotted binding key containing a colon followed by a non-space character.

Fix: after finding the colon index, verify `s[ci + 1] === ' '` or `ci + 1 === s.length` before treating it as a key-value separator.
  ```existing
  const ci = l.text.indexOf(':');
      if (ci < 0) yamlErr(keyPath, l.text, l.line, 'expected "key: value"');
  ```

## src/omp/adapters/_shared.ts
- **src/omp/adapters/_shared.ts:108-110** (bug)
  **Bug: `err.status === undefined` does not reliably detect ENOENT (missing curl binary).**

When `execFileSync` fails to spawn a child process (e.g., curl is not installed — ENOENT), Node.js/Bun set `err.status` to `null`, not `undefined`. The strict equality check `err.status === undefined` is `false` when `status` is `null`, so the code falls through to `const code = err.status` (which is `null`), and since `null !== 52 && null !== 56`, the socket is recorded as `refused`. The F-260 fix's intent — reporting `PROBE INFRA BROKEN` when curl is missing — never fires.

Consequence: on a host without curl, every socket file is logged as `refused`, and the final evidence says "every socket refused (stale files, no daemon)" — misleading operators into debugging the daemon instead of installing curl.

Suggested fix: use `err.status == null` (loose equality) to catch both `null` and `undefined`, or check explicitly for both.
  ```existing
  if (err.status === undefined) {
        return { up: false, evidence: `${dir} — PROBE INFRA BROKEN: curl could not exec (${err.code ?? "unknown"}) — install curl; this is NOT a socket verdict` };
      }
  ```
  ```suggested
  if (err.status == null) {
        return { up: false, evidence: `${dir} — PROBE INFRA BROKEN: curl could not exec (${err.code ?? "unknown"}) — install curl; this is NOT a socket verdict` };
      }
  ```

## src/omp/fire-gate.ts
- **src/omp/fire-gate.ts:752-757** (bug)
  The doc comment claims `/opt/kill/process.txt` does NOT produce a false match, but the `DESTRUCTIVE_TOKEN` regex DOES match it: the `/` character before and after `kill` are both in the boundary class `[\s"'\\;:|&/]`, so the pattern `(?:^|[\s"'\\;:|&/])kill(?:$|[\s"'\\;:|&/])` succeeds. This means an intent like `edit /opt/kill/process.txt` is incorrectly classified as `destructive`, raising the gate threshold to 0.9 and potentially blocking or escalating a benign edit. The F-40 fix comment says "path components no longer produce false matches" but the implementation contradicts it. The root cause is that `/` appears in both the prefix and suffix boundary classes, treating any slash-delimited path segment as a command token.
  ```existing
  const DESTRUCTIVE_TOKEN = /(?:^|[\s"'\\;:|&/])(rm|rmdir|dd|mkfs|shutdown|reboot|kill|pkill|drop|truncate)(?:$|[\s"'\\;:|&/])/i;
/** Whole-token test: path components no longer produce false matches (`/opt/kill/process.txt`), but real command tokens still match even with adjacent slashes or quotes. Case-insensitive. */
export function hasDestructiveToken(probe: string): boolean {
  if (DESTRUCTIVE_
  ```
  ```suggested
  // Option A — Use the already-declared DESTRUCTIVE_COMMANDS Set with proper tokenization:
// export function hasDestructiveToken(probe: string): boolean {
//   if (DESTRUCTIVE_FLAG.test(probe)) return true;
//   const tokens = probe.toLowerCase().split(/[\s"'\\;:|&/]+/).filter(Boolean);
//   return tokens.some(t => DESTRUCTIVE_COMMANDS.has(t));
// }
//
// Option B — Remove `/` from the boundary cl
  ```

## src/omp/gi-registry.ts
- **src/omp/gi-registry.ts:64-75** (bug)
  `upsertGiSession` always passes `'{}'` as the data JSON, meaning every call for the same `sessionId` overwrites any previously stored session data. The `upsertRow` SQL uses `ON CONFLICT DO UPDATE SET data = excluded.data`, which unconditionally replaces the existing data column. If a session is re-registered (e.g. after a reconnect or multi-phase open), all previously persisted metadata is silently lost. The function signature also lacks a `data` parameter, so callers have no way to supply existing session state.
  ```existing
  export function upsertGiSession(row: {
  sessionId: string;
  scopeRoot: string;
  storePath: string;
}): void {
  openGiRegistry();
  upsertRow("gi_sessions", "session_id", row.sessionId, "{}", {
    scope_root: row.scopeRoot,
    store_path: row.storePath,
    opened_at: new Date().toISOString(),
  });
}
  ```
  ```suggested
  export function upsertGiSession(row: {
  sessionId: string;
  scopeRoot: string;
  storePath: string;
  data?: string;
}): void {
  openGiRegistry();
  upsertRow("gi_sessions", "session_id", row.sessionId, row.data ?? "{}", {
    scope_root: row.scopeRoot,
    store_path: row.storePath,
    opened_at: new Date().toISOString(),
  });
}
  ```
- **src/omp/gi-registry.ts:47-48** (bug)
  The `process.env.BUN_TEST === "1"` check is unreliable because Bun does NOT set this environment variable. This not only makes the test-prod path detection in gi-registry.ts depend on a fragile fallback but also contradicts `db-path.ts` where `BUN_TEST === '1'` is used for test isolation, creating redundancy and maintenance issues. Consider using a more reliable signal like `BUN_TEST_PID` or a custom env var.
  ```existing
  const inTestContext = process.env.BUN_TEST === "1"
      || argv1.includes("/tests/st-");
  ```
  ```suggested
  // BUN_TEST_PID is actually set by `bun test`; BUN_TEST is not.
    const inTestContext = process.env.BUN_TEST_PID != null
      || argv1.includes("/tests/st-");
  ```

## src/omp/populate-graphify.ts
- **src/omp/populate-graphify.ts:515-515** (bug)
  The validation only checks `nodeRows.length === 0` and throws, but does NOT guard `edgeRows.length === 0`. If `nodeRows` has entries but `edgeRows` is empty, the unconditional `UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL` (line 535) will supersede ALL existing live edges — silently wiping inspection data. The session-path helper `supersedeThenInsert` correctly checks `nodeRows.length === 0 && edgeRows.length === 0` before refusing, and only conditionally runs the UPDATE when the respective batch is non-empty (lines 480-487). `writeGraphifyCheckout` should apply the same bidirectional guard: refuse if BOTH are empty, and only run the UPDATE+INSERT when the batch is non-empty.
  ```existing
  if (nodeRows.length === 0) throw new Error("GRAPH_EMPTY:graphify checkout refusing empty input (would wipe live inspection rows)");
  ```
  ```suggested
  if (nodeRows.length === 0 && edgeRows.length === 0) throw new Error("GRAPH_EMPTY:graphify checkout refusing empty input (would wipe live inspection rows)");
  ```

## src/scoping/scope-resolver.ts
- **src/scoping/scope-resolver.ts:138-138** (bug)
  The bare `catch` block silently swallows ALL exceptions from `readActivity` and the entire scoring pipeline — including filesystem permission errors, encoding issues, or unexpected data shapes. This makes it impossible to diagnose why a session fell back to cwd. At minimum, log the error. Consider logging at `warn` level to match the vanished-cache warning above.
  ```existing
  } catch { /* activity read failure → fall through to cwd */ }
  ```
  ```suggested
  } catch (err) { console.warn(`[scope-resolver] auto-detect failed for session ${sessionId}:`, err); }
  ```
