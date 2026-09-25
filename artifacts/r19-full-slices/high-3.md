# HIGH slice 3 — 7 findings across 6 files

## src/hunter/firewall/readonly.ts
- **src/hunter/firewall/readonly.ts:75-78** (security)
  The metacharacter scanner only checks for ASCII shell metacharacters. Unicode bidirectional override characters (U+202A–U+202E, U+2066–U+2069) can be used to visually disguise a dangerous command as a safe one in code review and logs. For example, a command containing U+202E (RIGHT-TO-LEFT OVERRIDE) followed by safe-looking tokens could visually render as a harmless command while the actual byte stream contains injection characters. Consider adding bidirectional override/separator characters to the BYPASS_METACHARACTERS set, or reject commands containing any non-ASCII control characters.
  ```existing
  const BYPASS_METACHARACTERS: ReadonlySet<string> = new Set([
  '|', ';', '&', '>', '<', '(', ')', '*', '?', '[', ']', '{', '}',
  '#', '!', '%', '~', '$', '`', '\\', '\'', '"', '\n',
]);
  ```
  ```suggested
  const BYPASS_METACHARACTERS: ReadonlySet<string> = new Set([
  '|', ';', '&', '>', '<', '(', ')', '*', '?', '[', ']', '{', '}',
  '#', '!', '%', '~', '$', '`', '\\', '\'', '"', '\n',
  // Unicode bidirectional override/separator characters (security: visual spoofing defense)
  '\u202A', '\u202B', '\u202C', '\u202D', '\u202E',
  '\u2066', '\u2067', '\u2068', '\u2069', '\u206A', '\u206B',
  '\u206C'
  ```

## src/hunter/harness/report.ts
- **src/hunter/harness/report.ts:145-160** (bug)
  Bug: The `document` string is built once at line 188 using the initial `version` value, but the retry loop (lines 194-207) re-probes `nextReportVersion()` on each iteration and may write the document under a DIFFERENT version number. When a collision occurs (EEXIST), the retry picks up `retryVersion` which can be greater than the initial version, but the document content is never rebuilt. This causes two concrete data correctness defects:

1. The file is named `bug_hunter_report_vN.md` but the heading inside says `# BUG-HUNT REPORT — vM` where M < N.
2. The `supersedes:` metadata line references `bug_hunter_report_v(M-1)` instead of `bug_hunter_report_v(N-1)`, pointing to the wrong predecessor.

The `version` and `reportPath` variables are correctly updated for the return value, so `writerResult.version` is right — but the sealed artifact's content is wrong.

Fix: rebuild the `document` content inside the retry loop after determining `retryVersion`, or at minimum rebuild lines that embed the version number.
  ```existing
  let version = nextReportVersion(masterContextDir);
  let reportPath = path.join(masterContextDir, `bug_hunter_report_v${version}.md`);

  const lines: string[] = [
    `# BUG-HUNT REPORT — v${version}`,
    '',
    `- runId: ${input.runId}`,
    `- findings: ${input.findings.length}`,
    `- sections: ${input.sections.length}`,
    ...(version > 1 ? [`- supersedes: bug_hunter_report_v${version - 1
  ```
  ```suggested
  let version = nextReportVersion(masterContextDir);
  let reportPath = path.join(masterContextDir, `bug_hunter_report_v${version}.md`);

  const findingRows: ReportFinding[] = input.findings;
  const graphRows: GraphSummary[] = input.graphSummaries;

  /** Build the document content for a given version number. */
  function buildDocument(v: number): string {
    const hdr: string[] = [
      `# BUG
  ```

## src/hunter/lexicon/compiler.ts
- **src/hunter/lexicon/compiler.ts:127-130** (bug)
  Empty corpus handling is asymmetric between the sync and async paths. The sync `batteryVersion` silently produces a valid version string (`'project-rules-battery-v1 (fingerprint: ...)'`) when `profile.rules.corpus` is empty — treating it as the spec's 'honest zero battery'. However, `batteryVersionWithCardsAsync` explicitly throws `corpusEmpty()` for the same input. Callers using different paths for the same profile will see contradictory behavior: sync succeeds, async throws. This violates the spec's own principle that 'the two states are distinguished by measurement, never conflated.' Either both paths should treat empty corpus as a valid zero battery, or both should throw.
  ```existing
  if (profile.rules.corpus.length === 0) {
    const { corpusEmpty } = await import('./rule-card.ts');
    throw corpusEmpty();
  }
  ```
  ```suggested
  // Align with batteryVersion (sync): empty corpus = valid honest zero battery.
  // The cards array will be empty, batteryNameFromCards([]) returns 'rules',
  // and the fingerprint will be deterministic from the empty corpus + bindings.
  // If the caller wants to reject empty corpus, do so at the profile-validation
  // layer, not inconsistently in one path only.
  ```
- **src/hunter/lexicon/compiler.ts:271-276** (bug)
  The DB cache hit check (`SELECT COUNT(*)`) and the subsequent `writeCompiledCache` are not wrapped in a single transaction or guarded by any concurrency mechanism. Two concurrent `compileBattery` calls for the same profile can both see an empty cache (both SELECTs return 0), then both proceed to compile and write. Depending on `writeCompiledCache`'s UPSERT semantics this either silently overwrites (wasting work) or throws a unique-constraint conflict. The check-then-write pattern is a classic TOCTOU race. Consider using a locking mechanism (e.g., advisory lock keyed on the battery version) or moving the SELECT inside the transaction in `writeCompiledCache` to make it atomic.
  ```existing
  if (db) {
    const row = db.prepare('SELECT COUNT(*) AS c FROM compiled_predicates WHERE battery_version = ?').get(version);
    if (Number(row?.['c'] ?? 0) > 0) {
      return { battery: loadBattery(db, version), batteryVersion: version, fromCache: true };
    }
  }
  ```
  ```suggested
  if (db) {
    // Atomic check-or-write: move the existence check inside writeCompiledCache's
    // transaction to prevent two concurrent compilations from both missing the cache
    // and both writing. Alternatively, use an advisory lock:
    //   db.prepare('SELECT 1 FROM compiled_predicates WHERE battery_version = ?').get(version);
    const existing = db.prepare('SELECT 1 FROM compiled_predic
  ```

## src/hydra/pipeline.ts
- **src/hydra/pipeline.ts:142-154** (bug)
  Evidence trail lost on input validation / graph-load failures. The R16D fix (line 107-109) correctly publishes partial evidence before throwing on pre-gate rejections, but the same pattern was NOT applied to the input-validation errors (lines 121-125) and the graph-load failure (lines 124-125). When these paths throw, the local `evidence` array (containing PIPELINE_START and any pre-gate GATE_CHECK entries) is never passed to `publishRun`, so concurrent readers of `this.evidence` see a stale snapshot — the exact class of bug R16D fixed for pre-gates.

Wrap these throw sites with the same publish-before-throw pattern, or refactor to use a single `finally` block for evidence publication.
  ```existing
  } catch (e) {
      throw new Error(`[${this.config.name}] GATE FAILED: input — targetRootFor/graphPathFor threw: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (targetRoot.trim() === "" || graphPath.trim() === "") {
      throw new Error(`[${this.config.name}] GATE FAILED: input — targetRoot and graphPath required`);
    }
    this.log("GRAPH_EXTRACT_START", {}, evidence);
    let 
  ```
  ```suggested
  } catch (e) {
      this.log("PIPELINE_FAILED", { name: this.config.name, error: `targetRootFor/graphPathFor threw: ${e instanceof Error ? e.message : String(e)}` }, evidence);
      this.publishRun(seq, evidence);
      throw new Error(`[${this.config.name}] GATE FAILED: input — targetRootFor/graphPathFor threw: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (targetRoot.trim() === 
  ```

## src/omp/gate-hook.ts
- **src/omp/gate-hook.ts:122-128** (bug)
  **Bug: Cancel-path wipes ALL pending steer entries for the tool name, not just the cancelled call's entry.**

When a verdict fires `cancel` (line 121), the code at line 124 filters the pendingSteer queue with `e.tool !== name`, which removes *every* pending steer entry for that tool name. If two interleaved `edit` calls exist (e.g., edit-A on file₁ and edit-B on file₂), cancelling edit-A also destroys edit-B's steer note. The F-1207 fix (line 74-77) correctly added file-based matching for the `tool_result` path, but the cancel-path cleanup was never updated to match.

Fix: filter by both tool name AND file to only evict the specific entry being cancelled, or simply leave the queue intact since the throw will abort the frame anyway (the remaining entries will be consumed by their matching tool_results or swept by TTL).
  ```existing
  const stale = pendingSteer.get(steerSid);
      if (stale) {
        const rest = stale.filter((e) => e.tool !== name);
        if (rest.length > 0) pendingSteer.set(steerSid, rest);
        else pendingSteer.delete(steerSid);
      }
      throw new Error(`${verdict.token}: ${verdict.advisory ?? rec.file}`);
  ```
  ```suggested
  const stale = pendingSteer.get(steerSid);
      if (stale) {
        const rest = stale.filter((e) => !(e.tool === name && e.file === rec.file));
        if (rest.length > 0) pendingSteer.set(steerSid, rest);
        else pendingSteer.delete(steerSid);
      }
      throw new Error(`${verdict.token}: ${verdict.advisory ?? rec.file}`);
  ```

## src/omp/rsi.ts
- **src/omp/rsi.ts:165-167** (bug)
  PRAGMA busy_timeout is not set. With BEGIN IMMEDIATE + WAL mode, if another connection holds a write lock, the IMMEDIATE lock acquisition fails immediately with SQLITE_BUSY. Adding `PRAGMA busy_timeout=N` (e.g. 5000ms) allows SQLite to retry automatically instead of failing instantly under concurrent access — critical for a production enforcement layer.
  ```existing
  this.db = new Database(cfg.storePath);
    this.db.exec("PRAGMA journal_mode=WAL;");
    this.db.exec(this.schema());
  ```
  ```suggested
  this.db = new Database(cfg.storePath);
    this.db.exec("PRAGMA journal_mode=WAL;");
    this.db.exec("PRAGMA busy_timeout = 5000;");
    this.db.exec(this.schema());
  ```
