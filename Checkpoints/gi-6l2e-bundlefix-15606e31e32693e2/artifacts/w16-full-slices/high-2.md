# HIGH slice 2 — 25 findings across 12 files

## src/hunter/diagnostics/calibration.ts
- **src/hunter/diagnostics/calibration.ts:450-456** (bug)
  Suffix file match causes false FIRED: `f.file.endsWith(fixture.file)` matches unrelated paths (`src/b.ts` vs `lib/b.ts`, or `ab.ts` vs `b.ts`). A coincidental suffix hit within ±2 lines wrongfully yields FIRED → CALIBRATED. Normalize both paths and require exact equality or a `/`-boundary suffix (e.g. `f.file === fixture.file || f.file.endsWith('/' + fixture.file)` after POSIX normalization).
  ```existing
  const hit = findings.some(
        (f) => f.ruleId === p.id
          && f.verdict === 'VIOLATION'
          && f.file.endsWith(fixture.file)
          && f.line >= fixture.line - 2
          && f.line <= fixture.line + 2,
      );
  ```
  ```suggested
  const normFinding = f.file.replace(/\\/g, '/');
      const normFixture = fixture.file.replace(/\\/g, '/');
      const fileMatch = normFinding === normFixture || normFinding.endsWith('/' + normFixture);
      const hit = findings.some(
        (f) => f.ruleId === p.id
          && f.verdict === 'VIOLATION'
          && fileMatch
          && f.line >= fixture.line - 2
          && f.line <= fixtu
  ```
- **src/hunter/diagnostics/calibration.ts:231-233** (bug)
  dryRun is metadata-only: `liveBattery()` returns the CALIBRATED subset and `run()` persists DB rows + CALIBRATION_vN.md regardless of `dryRun`. A dry-run caller can accidentally ship/consume uncurated predicates despite the header claiming the gate is 'born OFF'. Either gate `liveBattery()` (return [] + warn when dryRun) or gate persistence, or document explicitly that callers must check `result.dryRun` before consuming `liveBattery`.
  ```existing
  liveBattery(): CompiledPredicate[] {
    return this.battery.filter((p) => this.verdictOf(p.id) === 'CALIBRATED');
  }
  ```
  ```suggested
  liveBattery(): CompiledPredicate[] {
    if (this.dryRun) return [];
    return this.battery.filter((p) => this.verdictOf(p.id) === 'CALIBRATED');
  }
  ```
- **src/hunter/diagnostics/calibration.ts:540-540** (bug)
  Ownership fallback re-mutates caller + id collision: `find(...) ?? p` writes `calibrated` onto the caller's object for ad-hoc predicates passed to fireTest/silentTest, undermining the F-1021 clone. Worse, `verdicts`/`fireByPred`/`silentByPred` are keyed by `p.id`, so duplicate ids in the battery share one verdict and `find` marks only the first row while `liveBattery()/excluded()` flip all rows with that id.
  ```existing
  const owned = this.battery.find((b) => b.id === p.id) ?? p;
  ```
  ```suggested
  const owned = this.battery.find((b) => b.id === p.id);
    if (!owned) return; // ad-hoc predicate: record verdict maps only, never touch caller object
    // TODO: key verdict maps by object identity or index if duplicate ids must be supported
  ```
- **src/hunter/diagnostics/calibration.ts:246-247** (bug)
  batteryVersion omits identity/behavior fields: corpus hash covers only `anchor+verbatimQuote` and bindings. An `id` rename, `severity`/threshold/check-logic change reuses the same version, so stale calibration is treated as valid — violating the O22.4 invalidation claim. Include `id`, `severity`, and any threshold/check identity in the hashed corpus.
  ```existing
  const corpusHash = sha256(this.battery.map((p) => `${p.anchor}\n${p.verbatimQuote}`).join('\n'));
    const bindingsHash = sha256(this.battery.map((p) => JSON.stringify(p.bindings)).join('\n'));
  ```
  ```suggested
  const corpusHash = sha256(this.battery.map((p) => `${p.id}\n${p.anchor}\n${p.verbatimQuote}\n${(p as { severity?: unknown }).severity}`).join('\n'));
    const bindingsHash = sha256(this.battery.map((p) => JSON.stringify(p.bindings)).join('\n'));
  ```

## src/hunter/firewall/artifact-scope.ts
- **src/hunter/firewall/artifact-scope.ts:127-127** (bug)
  Relative targets resolve against process.cwd, not projectRoot. `path.resolve(input.target)` on a relative `MASTER_CONTEXT/bug_hunter_report_v1.md` yields a cwd-anchored path, so `targetParentNorm !== masterNorm` false-BLOCKs legitimate calls and makes the normalized-parent gate cwd-dependent. Resolve relative inputs against the project root (e.g. `path.resolve(projectRootReal, input.target)`) or reject non-absolute targets fail-closed.
  ```existing
  const targetNorm = path.normalize(path.resolve(input.target));
  ```
  ```suggested
  if (typeof input.target !== 'string' || input.target.length === 0) return blocked('REPORT_SCOPE_BLOCKED', '', String(input.target));
  const targetNorm = path.normalize(path.isAbsolute(input.target) ? path.resolve(input.target) : path.resolve(projectRootReal, input.target));
  ```
- **src/hunter/firewall/artifact-scope.ts:193-194** (security)
  Target-level symlink escape bypasses the parent-only realpath check. Only `path.dirname(targetNorm)` is realpath-resolved; `fs.stat` follows symlinks, so a pre-planted `MASTER_CONTEXT/bug_hunter_report_v1.md -> /outside/secret` pointing at a non-existent file returns ENOENT and ALLOWs, and the subsequent write follows the link outside the master dir/project. `lstat` the target and BLOCK if it is a symlink (or realpath-resolve the full target and contain it), and `stat` `targetNorm` instead of raw `input.target` to avoid cwd divergence.
  ```existing
  try {
    await fs.stat(input.target);
  ```
  ```suggested
  try {
    const lt = await fs.lstat(targetNorm);
    if (lt.isSymbolicLink()) return blocked('REPORT_SCOPE_BLOCKED', base, input.target);
    await fs.stat(targetNorm);
  ```

## src/hunter/harness/recon.ts
- **src/hunter/harness/recon.ts:124-124** (bug)
  Buffer/BLOB payload misclassified as already-parsed object: typeof check is true for Buffer/Uint8Array (bun:sqlite returns BLOB as Buffer), so such rows are cast to runId object instead of decoded. A high seq is then silently missed and next runId collides. Also JSON.parse result is never validated to be an object: stored 123 or quoted string parses to number/string and payload.runId access throws or misbehaves. Fix by handling Buffer/Uint8Array via toString utf8 before parse, and validating parsed value is a non-array object.
  ```existing
  const raw: unknown = row['payload'];
  ```
- **src/hunter/harness/recon.ts:116-116** (performance)
  Full-table scan loads and JSON-parses every HUNT_DONE payload on each recon: O(N) CPU and memory that grows unbounded as history accumulates. Push prefix filtering into SQL (LIKE on payload) or maintain a per-day counter, rather than fetching all rows.
  ```existing
  for (const row of db.prepare("SELECT payload FROM events WHERE kind = 'HUNT_DONE'").all()) {
  ```
- **src/hunter/harness/recon.ts:40-40** (security)
  Corpus path resolution trusts profile entries with no containment check: path.resolve(root, entry) allows ../ escape outside project root to be read. Combined with unbounded synchronous readFileSync this blocks the event loop and can OOM on large files. Validate resolved path stays under project root and cap file size via statSync before read.
  ```existing
  const abs = path.isAbsolute(entry) ? entry : path.resolve(profile.project.root, entry);
  ```

## src/hunter/harness/report.ts
- **src/hunter/harness/report.ts:192-196** (bug)
  Concurrent version allocation has no retry: `nextReportVersion()` probes then `wx` throws REPORT_VERSION_COLLISION on race, but `report()` awaits `input.writer()` once with no retry. Two concurrent hunts probing the same max version will both attempt v(N+1); the loser fails outright instead of re-probing. Add a bounded retry (re-resolve version + rewrite, or loop inside `writeReportDirect`) rather than surfacing a pathological-only error to the caller.
  ```existing
  try {
    fs.writeFileSync(reportPath, document, { encoding: 'utf-8', flag: 'wx' });
  } catch (e: unknown) {
    const code = (e !== null && typeof e === 'object' && 'code' in e) ? String((e as { code: unknown }).code) : '';
    if (code === 'EEXIST') throw new Error(`REPORT_VERSION_COLLISION: path=${reportPath} (another report landed v${version} concurrently — re-run the report actor)`);
  ```
  ```suggested
  for (let attempt = 0; attempt < 5; attempt++) {
  const version = nextReportVersion(masterContextDir);
  const reportPath = path.join(masterContextDir, `bug_hunter_report_v${version}.md`);
  try {
    fs.writeFileSync(reportPath, document, { encoding: 'utf-8', flag: 'wx' });
    break;
  } catch (e: unknown) {
    const code = (e !== null && typeof e === 'object' && 'code' in e) ? String((e as { c
  ```
- **src/hunter/harness/report.ts:284-284** (bug)
  `BEGIN IMMEDIATE` is issued outside the try/ROLLBACK scope, so if the caller already holds a transaction (or the DB is locked) the throw escapes without rollback handling and aborts before any section/event work. There is also no savepoint/nesting check. Wrap the BEGIN in the guarded region (or check `inTransaction` / use SAVEPOINT) so nested-callers get a clear error instead of an indeterminate handle state.
  ```existing
  input.db.exec('BEGIN IMMEDIATE');
  ```
  ```suggested
  try {
  input.db.exec('BEGIN IMMEDIATE');
} catch (e: unknown) {
  throw new Error(`REPORT_TX_BEGIN_FAILED: ${e instanceof Error ? e.message : String(e)} (caller may already hold a transaction — use a savepoint or serialize hunts)`);
}
try {
  // ... appends + COMMIT ...
} catch (dbErr: unknown) { /* rollback */ }
  ```

## src/hunter/lexicon/compiled-store.ts
- **src/hunter/lexicon/compiled-store.ts:78-82** (bug)
  Stale battery on empty / heterogeneous versions: eviction is derived from `battery[0].batteryVersion` and skipped entirely when `battery` is empty. A recompile to empty therefore leaves the prior rows for `corpusHash` readable by `loadBattery`, and a battery with mixed `batteryVersion`s only evicts the first version. Since the header states `corpus_hash IS battery_version`, the authoritative key is the `corpusHash` param, not `battery[0]`. Also consider validating all rows share `corpusHash` and failing loud on mismatch.
  ```existing
  if (battery.length > 0 && battery[0] !== undefined) {
      const delBat = db.prepare('DELETE FROM compiled_predicates WHERE battery_version = ?');
      stmts.push(delBat);
      delBat.run(battery[0].batteryVersion);
    }
  ```
  ```suggested
  const delBat = db.prepare('DELETE FROM compiled_predicates WHERE battery_version = ?');
stmts.push(delBat);
delBat.run(corpusHash);
for (const p of battery) {
  if (p.batteryVersion !== corpusHash) throw new LexiconError('VERSION_MISMATCH', `batteryVersion ${p.batteryVersion} != corpusHash ${corpusHash}`);
}
  ```

## src/hunter/profile/loader.ts
- **src/hunter/profile/loader.ts:545-547** (bug)
  TOCTOU stat race escapes named-error contract: `existsSync(...) || statSync(...).isDirectory()` performs two stats with no try/catch. If the root is deleted/replaced between `realpathSync` and here, `statSync` throws raw ENOENT/ENOTDIR instead of PROFILE_INVALID, violating the fail-closed contract. Use a single `statSync` in try/catch.
  ```existing
  if (!fs.existsSync(resolvedRoot) || !fs.statSync(resolvedRoot).isDirectory()) {
    throw profileInvalid('project.root', profile.project.root, 'the project root must exist and be a directory');
  }
  ```
  ```suggested
  let st: fs.Stats;
  try { st = fs.statSync(resolvedRoot); } catch {
    throw profileInvalid('project.root', profile.project.root, 'the project root must exist and be a directory');
  }
  if (!st.isDirectory()) {
    throw profileInvalid('project.root', profile.project.root, 'the project root must exist and be a directory');
  }
  ```
- **src/hunter/profile/loader.ts:203-207** (bug)
  `splitTopLevel` drops the escaped character: on `\\` it does `i++` to skip quote-state tracking but then `cur += c` appends only the backslash, losing the escaped char (e.g. `"a\"b"` corrupts). Append both chars or restructure to preserve the token.
  ```existing
  } else {
      if (c === '\\') i++;
      else if (c === '"') q = null;
    }
    cur += c;
  ```
  ```suggested
  } else {
      if (c === '\\' && i + 1 < s.length) { cur += c + s[i + 1]; i++; continue; }
      else if (c === '"') q = null;
    }
    cur += c;
  ```

## src/hunter/surface/lsp-injector.ts
- **src/hunter/surface/lsp-injector.ts:369-369** (bug)
  Watcher queue mixes path forms: paused/write-locked events push bare `filename` while active events push `path.resolve(absDir, filename)`. `enforceBacklog` dedupes by exact string so the same file in both forms is not folded, and downstream `scan(batch)` / `provider.forFile` (exact-key match) misses the bare form while `triggerReparse` sees mixed forms — same file can be double-processed or leave diagnostics stale after a pause.
  ```existing
  if (this.pausedFlag || this.writeLock) { this.queue.push(filename); this.enforceBacklog(); return; }
  ```
  ```suggested
  if (this.pausedFlag || this.writeLock) { this.queue.push(path.resolve(absDir, filename)); this.enforceBacklog(); return; }
  ```
- **src/hunter/surface/lsp-injector.ts:400-402** (bug)
  resume() drains the queue and triggers reparse but never calls scan(batch) (nor onChange), unlike scheduleDrain which does onChange + triggerReparse + scan. Diagnostics accumulated during a pause/write-lock window therefore stay stale until the next live fs event.
  ```existing
  resume(): void {
    this.pausedFlag = false;
    if (this.queue.length > 0) { const pending = this.drainQueue(); this.triggerReparse(pending); }
  ```
  ```suggested
  resume(): void {
    this.pausedFlag = false;
    if (this.queue.length > 0) { const pending = this.drainQueue(); this.triggerReparse(pending); this.scan(pending); }
  ```
- **src/hunter/surface/lsp-injector.ts:662-664** (performance)
  Glob fan-out defeats the O32.3 byte-cost budget: truncation is applied per-file block (500 chars) but inject() joins an unbounded number of blocks. A broad pattern (e.g. `src/*`) matching dozens of files injects tens of KB and pushes the real tool output out of context — the exact regression the budget prevents.
  ```existing
  if (blocks.length === 0) return { output: base };
  const joined = blocks.join('\n\n');
  return { output: base ? `${base}\n\n${joined}` : joined };
  ```
  ```suggested
  if (blocks.length === 0) return { output: base };
  const MAX_BLOCKS = 3;
  const capped = blocks.slice(0, MAX_BLOCKS);
  let joined = capped.join('\n\n');
  if (blocks.length > MAX_BLOCKS) joined += `\n\n  (${blocks.length - MAX_BLOCKS} more files with diagnostics omitted)`;
  if (joined.length > LOGIC_LSP_BYTE_COST * MAX_BLOCKS) joined = joined.slice(0, LOGIC_LSP_BYTE_COST * MAX_BLOCKS) + '\n  (
  ```
- **src/hunter/surface/lsp-injector.ts:432-434** (bug)
  enforceBacklog() does not enforce WATCHER_BACKLOG_CAP: on overflow it only dedupes by full path and reassigns the (still over-cap) array. If all entries are distinct the queue stays > cap forever — unbounded growth and repeated WATCHER_STALLED warns with no shedding.
  ```existing
  private enforceBacklog(): void {
    if (this.queue.length > WATCHER_BACKLOG_CAP) {
      console.warn(WATCHER_STALLED);
  ```
  ```suggested
  private enforceBacklog(): void {
    if (this.queue.length > WATCHER_BACKLOG_CAP) {
      console.warn(WATCHER_STALLED);
      // after dedupe below, drop oldest beyond cap:
      // this.queue = this.queue.slice(this.queue.length - WATCHER_BACKLOG_CAP);
  ```

## src/hunter/tools/bug-hunt.ts
- **src/hunter/tools/bug-hunt.ts:76-77** (bug)
  Validation throws violate the fail-closed RESULT contract. Header says INCONCLUSIVE is a RESULT never a throw, but all HUNT_SCOPE_INVALID paths throw (and `createMicroLoop` below is outside the inner try that maps throws to inconclusive). Direct callers of `spawnBugHunterLoop` must catch throws, and a `createMicroLoop` throw escapes as a throw. Fix: return `{state:'inconclusive',...}` for validation failures and move `createMicroLoop` inside the try that maps to the fail-closed RESULT.
  ```existing
  if (scopeReal === path.sep) {
    throw new Error(`HUNT_SCOPE_INVALID: scopeRoot=${args.scopeRoot} resolves to the filesystem root — containment against '/' admits every path and is not a boundary`);
  ```
- **src/hunter/tools/bug-hunt.ts:80-80** (security)
  Containment disabled when `scopeRoot` omitted re-admits /etc. `inScope` returns true for every path when `scopeReal===null`, so a direct call without `scopeRoot` passes any existing directory/file. F-303 intent was to bound the hunt. Fix: require `scopeRoot` (fail-closed HUNT_SCOPE_INVALID/inconclusive when missing) or default it to the validated absolute target's containment root instead of open.
  ```existing
  const inScope = (real: string): boolean => scopeReal === null || real === scopeReal || (scopePrefix !== null && real.startsWith(scopePrefix));
  ```

## src/hunter/tools/report-writer-local.ts
- **src/hunter/tools/report-writer-local.ts:100-102** (bug)
  Unranked 500-cap truncation: `findings.slice(0, MAX)` keeps input order with no severity/rank sort, despite the header/`MAX_REPORT_FINDINGS` comments promising the 'RANKED ACTIONABLE CORE' / 'top-N findings by rank'. If the caller passes unsorted store output an arbitrary subset is rendered and the loud REPORT_CAPPED log still claims a ranked core. Sort by severity (CRIT>HIGH>MED>WARN, then stable tie-break) before slicing, or document/assert a sorted-input precondition.
  ```existing
  const keep = new Set(findings.slice(0, MAX_REPORT_FINDINGS).map((f) => f.id));
    sections = sections.filter((s) => keep.has(s.finding_id));
    findings = findings.slice(0, MAX_REPORT_FINDINGS);
  ```
  ```suggested
  const rank: Record<string, number> = { CRIT: 0, HIGH: 1, MED: 2, WARN: 3 };
    const ranked = [...findings].sort((a, b) => (rank[a.severity] ?? 99) - (rank[b.severity] ?? 99));
    const keep = new Set(ranked.slice(0, MAX_REPORT_FINDINGS).map((f) => f.id));
    sections = sections.filter((s) => keep.has(s.finding_id));
    findings = ranked.slice(0, MAX_REPORT_FINDINGS);
  ```

## src/kernel/graph-pre-flight.ts
- **src/kernel/graph-pre-flight.ts:38-41** (bug)
  **`impactInDb` truncation silently ignored**: `impactInDb` caps its ledger at 5000 rows and sets `truncated: true` when the cap is hit (see `typed-write.ts:1119-1146`). `preFlight` never checks `imp.truncated`, so when a large graph is encountered, `imp.reaches` is under-reported (it equals `ledger.length`, not actual reachability). This silently produces an incorrect `commitStrategy` — e.g., a graph with 100 real reachable nodes but only 49 ledgered would get `"split"` instead of `"domain-level"`. A warning should be emitted when `imp.truncated` is true, mirroring the existing `NO CONSUMERS` and `WIDE BLAST RADIUS` patterns.
  ```existing
  const imp = impactInDb(db, target, 8);

    const byDepth: Record<number, number> = {};
    for (const row of imp.ledger) byDepth[row.depth] = (byDepth[row.depth] ?? 0) + 1;
  ```
  ```suggested
  const imp = impactInDb(db, target, 8);
    if (imp.truncated) warnings.push(`IMPACT TRUNCATED: blast-radius ledger capped at 5000 rows — reachability UNDER-REPORTED for ${target}; commit strategy may be too lenient`);

    const byDepth: Record<number, number> = {};
    for (const row of imp.ledger) byDepth[row.depth] = (byDepth[row.depth] ?? 0) + 1;
  ```

## src/omp/kernel-v2.ts
- **src/omp/kernel-v2.ts:561-561** (bug)
  Unsafe type assertion: `d.action as GateAdjudication["action"]` silently accepts any string returned by `gate.judge()`. If the gate returns an unexpected action value (e.g. "ALLOW"), this cast would mask the invalid value and downstream code would treat it as FIRE/ESCALATE/IGNORE without any runtime validation. Add a guard to reject unknown action values.
  ```existing
  action: d.action as GateAdjudication["action"],
  ```
  ```suggested
  action: validateAction(d.action),

// ... add helper:
const VALID_ACTIONS = new Set<GateAdjudication["action"]>(["FIRE", "ESCALATE", "IGNORE"]);
function validateAction(action: string): GateAdjudication["action"] {
  if (!VALID_ACTIONS.has(action as GateAdjudication["action"])) {
    throw new Error(`unexpected gate action: ${action}`);
  }
  return action as GateAdjudication["action"];
}
  ```

## src/omp/populate-graphify.ts
- **src/omp/populate-graphify.ts:174-195** (bug)
  **`walkFailed` check at line 174 is dead code — walk failures are silently ignored.**

The check `if (walkFailed) return { fresh: false, reason: "stale-read-failed" }` is placed at line 174, AFTER the `walk` function definition but BEFORE the `for` loop at line 175 that actually calls `walk()`. Since `walkFailed` is only set to `true` inside `walk()` (line 144), and `walk()` is only invoked from line 190 inside the scope loop, `walkFailed` is always `false` when checked at line 174.

After `walk()` sets `walkFailed = true` during the scope loop, the flag is never checked again. The probe continues and may reach the mtime comparison (line 205) based on partial data, potentially reporting "fresh" when a directory that failed `realpathSync` contained newer files.

The `stale-read-failed` reason was clearly intended as a fail-closed path (per the F-846 FIX comment), but it can never be reached. Move the check to AFTER the scope loop (alongside the `filesSeen` and `exhausted` checks at lines 194-195), or check it inside the loop after each `walk()` call.
  ```existing
  if (walkFailed) return { fresh: false, reason: "stale-read-failed" };
  for (const rel of scope) {
    const target = containedScopeTarget(root, rel);
    if (target === null) continue;
    // V21 cleanup fix-now: a scope entry may be a FILE — stat it directly
    // (walk() on a file throws ENOTDIR and silently counted nothing).
    let stTarget: fs.Stats | null = null;
    try { stTarget = fs.st
  ```
  ```suggested
  for (const rel of scope) {
    const target = containedScopeTarget(root, rel);
    if (target === null) continue;
    let stTarget: fs.Stats | null = null;
    try { stTarget = fs.statSync(target); } catch { stTarget = null; }
    if (stTarget?.isFile()) {
      const base = path.basename(target);
      if (excludes.includes(base)) continue;
      if (stTarget.mtimeMs > newest) newest = stTarget.m
  ```
- **src/omp/populate-graphify.ts:296-307** (bug)
  **`hashSourceTree` walk does NOT skip files matching `excludes` — inconsistency with `isGraphifyCheckoutFreshFor`.**

In `isGraphifyCheckoutFreshFor` (line 164), the file branch checks `if (excludes.includes(entry.name)) continue;` before counting the file toward the budget and mtime. But in `hashSourceTree` (lines 296-307), the file branch has NO such check — all matching extension files are hashed regardless of `excludes`.

This means a user-configured `excludes` entry for a file (e.g. `"debug-helper.ts"`) will:
1. Be skipped by the freshness probe's mtime walk (not triggering staleness via mtime)
2. Still be included in the content hash (triggering `stale-content` if it changes)

The net effect is that excluding a file by name does NOT prevent it from invalidating the content hash sidecar, undermining the purpose of the `excludes` configuration. Add `if (excludes.includes(entry.name)) continue;` in the file branch of `hashSourceTree`'s walk (and fold the filename into the digest as `skip-excluded:` so the hash remains deterministic).
  ```existing
  } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        budget.n--;
        try {
          const stat = fs.statSync(path.join(dir, entry.name));
          hashFile(path.join(dir, entry.name), `${prefix}${entry.name}`, stat.size);
        } catch {
          // frozen-scan HIGH: an unreadable file is NOT silently omitted
  ```
  ```suggested
  } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        if (excludes.includes(entry.name)) {
          hash.update(`skip-excluded:${prefix}${entry.name}\n`);
          continue;
        }
        budget.n--;
        try {
          const stat = fs.statSync(path.join(dir, entry.name));
          hashFile(path.join(dir, en
  ```
