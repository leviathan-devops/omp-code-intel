# HIGH slice 5 — 22 findings across 12 files

## src/hunter/diagnostics/findings-store.ts
- **src/hunter/diagnostics/findings-store.ts:113-113** (bug)
  BEGIN IMMEDIATE with no re-entrancy guard fails if caller already holds a transaction (SQLite: cannot start a transaction within a transaction). Also preventable validation (evidence emptiness) runs inside the tx, forcing a ROLLBACK for errors rejectable before BEGIN, and an empty batch still pays BEGIN/COMMIT.
  ```existing
  db.exec('BEGIN IMMEDIATE');
  ```
  ```suggested
  // Pre-validate before opening tx; early-return on empty batch; guard nesting.
    // if (findings.length === 0) return { runId, week: week ?? null, appended: 0 };
    // for (let i = 0; i < findings.length; i++) { validate evidence -> throw FINDING_NO_TRIPLET }
    // db.exec('SAVEPOINT findings_batch'); // or check inTransaction() if DbClient exposes it; document non-reentrant if not supported
 
  ```
- **src/hunter/diagnostics/findings-store.ts:164-164** (bug)
  week:null is unqueryable: != null skips the clause for both undefined (no filter) and null (filter IS NULL), silently returning a multi-week superset. Even if pushed, `week = ?` with NULL never matches — needs `IS NULL`.
  ```existing
  if (opts.week != null) {
  ```
  ```suggested
  if (opts.week !== undefined) {
    if (opts.week === null) clauses.push('week IS NULL');
    else { clauses.push('week = ?'); params.push(opts.week); }
  }
  ```

## src/hunter/graph/mechanical.ts
- **src/hunter/graph/mechanical.ts:281-286** (bug)
  Single-file depth overflow aborts whole program extraction: `MAX_DEPTH` throw inside `visit` propagates out of the per-file loop and fails `extractMechanical` entirely, discarding triples from all healthy files. Isolate per file (skip/log pathological file and continue).
  ```existing
  try {
      visit(sf, undefined);
    } catch (e: unknown) {
      if (e instanceof MechanicalExtractionError) throw e;
      throw new MechanicalExtractionError(`mechanical walk failed for ${relPosix} — ${e instanceof Error ? e.message : String(e)}`);
    }
  ```
  ```suggested
  try {
      visit(sf, undefined);
    } catch (e: unknown) {
      // isolate pathological file instead of aborting whole program
      if (e instanceof MechanicalExtractionError && e.message.includes('AST depth exceeds')) continue;
      throw e instanceof MechanicalExtractionError ? e : new MechanicalExtractionError(`mechanical walk failed for ${relPosix} — ${e instanceof Error ? e.message : Str
  ```
- **src/hunter/graph/mechanical.ts:182-188** (bug)
  Inline variable exports mis-typed as `fn:`: `export const x = 5` / `export const obj = {...}` emits `exports fn:x` while `declares` only emits `fn:` for arrow/function initializers. This pollutes the `fn:` namespace and breaks declares↔exports joins. Gate on function-like initializer or use neutral symbol canonical.
  ```existing
  } else if (ts.isVariableStatement(stmt)) {
          for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              pushTriple(fileCanon, 'exports', `fn:${decl.name.text}`, expEvidence, relPosix, expLine);
            }
          }
        }
  ```
  ```suggested
  } else if (ts.isVariableStatement(stmt)) {
          for (const decl of stmt.declarationList.declarations) {
            if (!ts.isIdentifier(decl.name)) continue;
            const isFn = decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));
            if (!isFn) continue;
            pushTriple(fileCanon, 'exports', `fn:${decl.name.text}`, expE
  ```
- **src/hunter/graph/mechanical.ts:202-202** (bug)
  Module specifier canonicalization creates bogus nodes and misses index resolution in both import and re-export branches: bare specifiers (`lodash` / `export ... from 'lodash'`) become `file:lodash`, and `./dir` becomes `./dir.ts` with no `index.ts` / extension probing, so edges never join real files. Resolve bare specifiers to package nodes and probe directory index in both branches so import/export triples join.
  ```existing
  const targetCanon = `file:${targetRel}`;
  ```
  ```suggested
  const targetCanon = target.startsWith('.') ? `file:${targetRel}` : `package:${target}`;
  ```

## src/hunter/graph/merge.ts
- **src/hunter/graph/merge.ts:130-134** (bug)
  Exact-match pushes a duplicate row instead of upgrading. The mechanical key was already emitted (and indexed in `mergedByKey`), then `mechExact` pushes a second row with the same `tripleKey` as `source:'both'`. Identical triples are doubled and counts/skews downstream. Fix: look up `mergedByKey.get(k)` and upgrade that row in place (source='both', inherit file:line/kinds, update confidence/evidence) instead of `merged.push`.
  ```existing
  if (mechExact) {
      const anchor = mechExact;
      const inheritedFile = anchor.file;
      const inheritedLine = anchor.line;
      merged.push({
  ```
  ```suggested
  if (mechExact) {
      const anchor = mechExact;
      const existing = mergedByKey.get(k);
      if (existing) {
        existing.source = 'both';
        existing.evidence = s.evidence.trim().slice(0, 500);
        existing.confidence = s.confidence;
        existing.file = anchor.file ?? s.file;
        existing.line = anchor.line ?? s.line;
        existing.subjectKind = s.subjectKind ?? ancho
  ```
- **src/hunter/graph/merge.ts:11-14** (bug)
  Internal dedup `Set` leaked on public `MergedTriple`. Exposing mutable `seenContradictions?: Set<string>` breaks `JSON.stringify` (serializes as `{}`), leaks internal bookkeeping to consumers, and allows external mutation to corrupt contradiction accumulation. Keep it in a module-private `WeakMap<MergedTriple, Set<string>>` (or `Map<string, Set<string>>` keyed by `tripleKey`) and strip it before return.
  ```existing
  /** ★ F-822b FIX (2026-09-24): the dedup Set the F-822 fix introduced was read off the type
   *  before it was DECLARED — TS2339 at every site. It is part of the row's conflict
   *  bookkeeping, so it belongs on the interface. */
  seenContradictions?: Set<string>;
  ```
  ```suggested
  // seenContradictions removed from public interface — track internally, e.g.:
  // const seenContradictions = new WeakMap<MergedTriple, Set<string>>();
  ```

## src/hunter/harness/hunt-lock.ts
- **src/hunter/harness/hunt-lock.ts:55-57** (security)
  Missing hostname validation bypasses cross-host guard. readPayload only checks pid/acquiredAt, so a lock with missing/non-string hostname is returned as valid. Both isStale (`typeof hostname === 'string' && ...`) and releaseHuntLock then skip the foreign-host fail-closed path and fall back to namespace-local isPidAlive / unlink, allowing a colliding local PID to free/delete another host's live lock on a shared filesystem. Require hostname (and ideally integer pid + parseable acquiredAt) here so legacy/corrupt locks take the null-payload TTL-gated path and release fail-closes.
  ```existing
  const parsed = JSON.parse(raw) as Partial<HuntLockPayload>;
    if (typeof parsed.pid !== 'number' || typeof parsed.acquiredAt !== 'string') return null;
    return parsed as HuntLockPayload;
  ```
  ```suggested
  const parsed = JSON.parse(raw) as Partial<HuntLockPayload>;
    if (typeof parsed.pid !== 'number' || !Number.isInteger(parsed.pid) || parsed.pid <= 0) return null;
    if (typeof parsed.acquiredAt !== 'string' || Number.isNaN(Date.parse(parsed.acquiredAt))) return null;
    if (typeof parsed.hostname !== 'string' || parsed.hostname.length === 0) return null;
    return parsed as HuntLockPayload;
  ```
- **src/hunter/harness/hunt-lock.ts:180-186** (bug)
  Release unlink remains non-atomic despite double re-read. fresh/fresh2 narrow the window to µs but read-check-unlinkSync is still TOCTOU: a stale-recovery in acquireHuntLock can unlink + wx-create a fresh lock between fresh2 and unlinkSync, and this unlink deletes the stranger's lock (mutual-exclusion violation). Path locks cannot be made safe by re-reading; use an atomic primitive (lock-directory via mkdir O_EXCL, hard-link, or fd-based flock/fcntl) or at minimum document that release may delete a peer and require callers to tolerate it.
  ```existing
  const fresh2 = readPayload(lockPath);
    if (!fresh2 || fresh2.pid !== existing.pid || fresh2.acquiredAt !== existing.acquiredAt || fresh2.hostname !== existing.hostname) {
      console.warn(`[hunt-lock] release skipped for ${lockPath}: the lock changed just before unlink (a peer won the race) — keeping the current holder's lock`);
      return;
    }
    try {
      fs.unlinkSync(lockPath);
  ```
  ```suggested
  // TODO: replace read-check-unlink with an atomic release (e.g. hold an fd/flock
    // from acquire and use close+unlink under lock, or use a mkdir-based lock dir).
    // Re-reads only narrow the race; they cannot close it.
    const fresh2 = readPayload(lockPath);
    if (!fresh2 || fresh2.pid !== existing.pid || fresh2.acquiredAt !== existing.acquiredAt || fresh2.hostname !== existing.hostname
  ```
- **src/hunter/harness/hunt-lock.ts:34-35** (bug)
  isPidAlive fail-open on unknown errors contradicts the EPERM-as-alive fail-closed rule. Any kill error other than ESRCH/EPERM (e.g. EINVAL, unexpected platform error) warns then returns false, which isStale treats as dead and immediately unlinks a same-host lock that may still be live. Default to true (assume alive, TTL bounds the hold) to err toward exclusion.
  ```existing
  console.warn(`[hunt-lock] isPidAlive unknown code for pid=${pid}: ${String(e)}`);
    return false;
  ```
  ```suggested
  console.warn(`[hunt-lock] isPidAlive unknown code for pid=${pid}: ${String(e)}`);
    return true;
  ```
- **src/hunter/harness/hunt-lock.ts:154-154** (bug)
  PID-only ownership in release allows a recycled-PID stranger to unlink. releaseHuntLock(targetPath) accepts no expected payload and unlinks any lock whose pid === process.pid, without comparing acquiredAt/hostname to what this process actually acquired. After PID reuse (or two hunts in one host sharing a PID namespace), a process that never acquired the lock can delete the live holder's lock. Pass the HuntLockPayload from acquireHuntLock into release and require full-triple equality before unlink.
  ```existing
  if (existing.pid !== process.pid) return;
  ```
  ```suggested
  // Require caller to prove ownership: releaseHuntLock(targetPath, expected: HuntLockPayload)
    // if (existing.pid !== expected.pid || existing.acquiredAt !== expected.acquiredAt || existing.hostname !== expected.hostname) return;
    if (existing.pid !== process.pid) return;
  ```

## src/hunter/harness/map.ts
- **src/hunter/harness/map.ts:127-127** (bug)
  File-less code nodes bypass the LINELESS guard entirely, contradicting the header guarantee (every CODE method/function/class must carry a finite line, never silently dropped). A CODE_DERIVED node with file null/empty and no line anywhere continues here and reaches writeGraph, where downstream findings require file:line triplets and will fail silently - the exact failure mode the EN-002 fix was meant to refuse LOUD as LINELESS_NODE.
  ```existing
  if (typeof n.file !== 'string' || n.file.length === 0) continue;
  ```
  ```suggested
  if (typeof n.file !== 'string' || n.file.length === 0) {
      const data = (n.data ?? {}) as Record<string, unknown>;
      resolveLine({ line: n.line ?? undefined, data, source_location: data['source_location'] }, edgeLocByTarget[n.id] ?? null, n.id);
      continue;
    }
  ```

## src/hunter/lexicon/rule-card.ts
- **src/hunter/lexicon/rule-card.ts:307-311** (bug)
  Declared metadata lines are peeked but never consumed: cardsFromLines scans readDeclaredMeta(i+1) without advancing past it. A declaring line that is also rule-shaped (e.g. `severity: HIGH — MUST audit`) will be re-visited next iteration via isRuleShaped and emitted as a spurious extra card, duplicating/inflating the battery despite the F-1202 skip inside readDeclaredMeta.
  ```existing
  } else if (isQuotedPassage(line)) {
      cards.push(makeCard(extractInlineQuote(line), anchor, line, readDeclaredMeta(lines, i + 1)));
    } else if (isRuleShaped(line)) {
      cards.push(makeCard(line.trim(), anchor, line, readDeclaredMeta(lines, i + 1)));
    }
  ```
  ```suggested
  function cardsFromLines(file: string, lines: string[]): RuleCard[] {
  const cards: RuleCard[] = [];
  for (let i = 0; i < lines.length; i++) {
    // ... anchor/line setup ...
    if (isBlockquote(line)) {
      const collected = collectBlockquote(lines, i);
      const { meta, end } = consumeDeclaredMeta(lines, collected.end);
      cards.push(makeCard(collected.text, anchor, line, meta));
     
  ```
- **src/hunter/lexicon/rule-card.ts:244-245** (bug)
  Fully-curated override forces proposed=0 even for an empty/unquotable quote. An empty verbatimQuote violates the D13 core (a rule that cannot be quoted must stay PROPOSED for operator curation). Curation should suppress the ambiguous-voice flag, never the empty-quote flag.
  ```existing
  const curated = declared?.classification !== undefined && declared?.severity !== undefined;
  const proposed: 0 | 1 = curated ? 0 : (ambiguous || quote.trim().length === 0 || voiceAmbiguous(quote) ? 1 : 0);
  ```
  ```suggested
  const curated = declared?.classification !== undefined && declared?.severity !== undefined;
  if (quote.trim().length === 0) return { verbatimQuote: quote, anchor, classification: declared?.classification ?? voted, severity: declared?.severity ?? rate(quote), proposed: 1 };
  const proposed: 0 | 1 = curated ? 0 : (ambiguous || voiceAmbiguous(quote) ? 1 : 0);
  ```

## src/hunter/shared/migrations.ts
- **src/hunter/shared/migrations.ts:27-27** (bug)
  Stale pre-existing tables pass as success. CREATE TABLE IF NOT EXISTS never alters an existing typed_nodes/typed_edges/graph_facts, so a store created before CHECKs/indexes were added keeps the old shape. The transactional path (began===true) returns success with no shape verification — only the non-transactional fallback calls assertNonTransactionalSchema. Fix: verify schema shape on both paths (sqlite_master.sql contains expected CHECK/index, or PRAGMA table_info/index_list) and fail or rebuild/migrate when it diverges.
  ```existing
  CREATE TABLE IF NOT EXISTS typed_nodes (
  ```
  ```suggested
  export function ensureTypedGraphSchema(db: TypedGraphDb): void {
  // ... BEGIN + exec as today ...
  assertSchemaShape(db); // run on BOTH began and !began paths: check sqlite_master.sql for CHECK(kind IN ...)/CHECK(predicate IN ...)/length(...)>0 and index_list for idx_tn_file etc.
}
  ```
- **src/hunter/shared/migrations.ts:98-98** (bug)
  BEGIN failure conflates lock contention with no-BEGIN support. Any exec('BEGIN IMMEDIATE') throw (SQLITE_BUSY/locked, timeout, I/O) sets began=false and falls through to bare auto-commit exec, turning a transient concurrency failure into an unverified multi-statement partial migration. Fix: only fall back on an unsupported-syntax error; rethrow BUSY/locked/timeout immediately.
  ```existing
  try { db.exec('BEGIN IMMEDIATE'); began = true; } catch { began = false; /* no explicit-BEGIN support: bare exec below */ }
  ```
  ```suggested
  try { db.exec('BEGIN IMMEDIATE'); began = true; }
catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/no such|syntax|not supported/i.test(msg)) began = false;
  else throw new Error(`TYPED_MIGRATION_FAILED: BEGIN IMMEDIATE failed: ${msg}`, { cause: e });
}
  ```

## src/hunter/surface/query-tool.ts
- **src/hunter/surface/query-tool.ts:255-257** (performance)
  BFS N+1 prepares in `chain`: `db.prepare(... WHERE e.src_canonical = ? ...)` is constructed inside the `while (head < queue.length)` loop, so every dequeued node (up to depth 64 with hub fan-out) pays prepare+execute. Hoist the statement once outside the loop or replace the per-node walk with a set-based recursive CTE like `blastRadius`.
  ```existing
  const out = rowsAs<{ dst_id: string; dst_label: string; dst_file: string; dst_line: number; predicate: string }>(
      db.prepare(`
        SELECT dst.canonical_id AS dst_id, dst.label AS dst_label,
  ```
  ```suggested
  const chainEdgesStmt = db.prepare(`
        SELECT dst.canonical_id AS dst_id, dst.label AS dst_label,
               dst.file AS dst_file, dst.line AS dst_line, e.predicate AS predicate
        FROM typed_edges e
        JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id
        WHERE e.src_canonical = ? AND e.predicate = 'calls' AND e.superseded_run IS NULL`);
    // in loop:
    const o
  ```

## src/hydra/pipeline.ts
- **src/hydra/pipeline.ts:121-125** (bug)
  Pre-gate failure skips the try/catch block that publishes evidence and PIPELINE_FAILED. When a pre-gate fails, `failLoud` throws at line ~101, which is *before* the try block at line 115. The catch block that calls `this.publishRun(seq, evidence)` is never reached, so `this.evidence` is never updated with the failed run's trail. This is inconsistent with the post-gate failure path (which does publish) and means concurrent readers see a stale or empty snapshot after a pre-gate rejection. The pre-gate failure path should also call `publishRun`.
  ```existing
  for (const gate of this.config.gates.pre) {
      this.log("GATE_CHECK", { gate: gate.name, phase: "pre" }, evidence);
      const result = await gate.check(input);
      if (!result.passed) this.failLoud(gate, result.reason ?? "pre-gate failed");
    }
  ```
  ```suggested
  for (const gate of this.config.gates.pre) {
      this.log("GATE_CHECK", { gate: gate.name, phase: "pre" }, evidence);
      const result = await gate.check(input);
      if (!result.passed) {
        this.log("PIPELINE_FAILED", { name: this.config.name, error: `pre-gate ${gate.name}: ${result.reason ?? "pre-gate failed"}` }, evidence);
        this.publishRun(seq, evidence);
        this.failLoud
  ```

## src/omp/graph-facts.ts
- **src/omp/graph-facts.ts:109-119** (bug)
  **Bug: `freshnessGate` violates the file's own 'UNOBSERVED, never PASS' principle.**

The freshness gate returns `settles: true, action: 'IGNORE'` when the store is stale, which tells downstream callers (MPSE, cache, Jev) that the graph has *settled* the question with a clean answer. But a stale store means the graph *cannot know* — it is not evidence of absence. The file's own documented pin states: 'a generic gate preempting a specific one is UNOBSERVED, never PASS.' A stale-data gate is exactly that: a generic gate.

The consequence is severe: the caller at line 142 returns immediately (`return [stale]`), so M-GRAPH-1 through M-GRAPH-5 are never evaluated, and the `settles: true` flag tells the MPSE/Jev layers to stop asking. A stale store silently suppresses all further analysis.

This should be `settles: false, action: null` so the caller records it as UNOBSERVED and the next layer (MPSE) picks up the question.
  ```existing
  function freshnessGate(db: Database, input: GraphFactInput): GraphFactVerdict | null {
  const f = layerFreshness(db, { derivation: input.derivation ?? "explicit", now: input.now });
  if (!f.stale) return null;
  return {
    rule: "M-GRAPH-3",
    settles: true,
    action: "IGNORE",          // a stale-store refusal is NOT evidence of a violation
    reason: "the graph store is STALE — no fact 
  ```
- **src/omp/graph-facts.ts:102-103** (bug)
  **Bug: `LIKE` helper strips `_` and `%` from the target instead of escaping them, causing incorrect SQL LIKE matching.**

The helper `const LIKE = (target) => `%${target.replace(/[%_]/g, '')}%`` removes `_` and `%` from the search term. In SQL LIKE, `_` is a single-character wildcard and `%` is a multi-character wildcard — stripping them changes the semantics of the search.

Concrete failure case: if `target = "foo_bar"` and a canonical_id in the store is `my_foo_bar_handler`, the query becomes `LIKE '%foobar%'`. The string `my_foo_bar_handler` does NOT contain the literal substring `foobar`, so the lookup returns zero rows — the node is treated as absent. Every subsequent rule sees `known === 0` and returns UNOBSERVED for a node that actually exists.

The correct fix is to escape `_` and `%` with a backslash (or chosen escape character) and add an `ESCAPE` clause to the SQL `LIKE` expressions:

```ts
const LIKE = (target: string) => `%${target.replace(/\/g, '\\').replace(/%/g, '\%').replace(/_/g, '\_')}%`;
// and in SQL: ... LIKE ?1 ESCAPE '\'
```

Note: the `inDegree` and `outD` queries all use this `LIKE` helper, so every rule in the file is affected.
  ```existing
  /** The canonical-id prefix the indexer writes; fragments match within it. */
const LIKE = (target: string) => `%${target.replace(/[%_]/g, "")}%`;
  ```

## src/omp/hard-deps.ts
- **src/omp/hard-deps.ts:242-247** (bug)
  The variable is named `listeningPaths` but the Set is populated from ALL entries in `/proc/net/unix` without filtering by socket state. The `/proc/net/unix` file lists every Unix domain socket on the system — listening, established, connecting, etc. A socket in state ESTABLISHED or CONNECTING would also match, producing a false UP for a daemon that is no longer accepting connections.

In `/proc/net/unix`, the state field is at column index 3 (0-indexed); `0A` (hex) means LISTENING. The probe should filter on that state, or at minimum acknowledge the gap. Given the stated design goal ('existence is not liveness' / 'a socket FILE with no entry is a stale corpse'), the check is incomplete — having an entry is also not necessarily listening.
  ```existing
  const listeningPaths = new Set(
        table.split("\n").map((line) => {
          const parts = line.trim().split(/\s+/);
          return parts[parts.length - 1] ?? "";
        }),
      );
  ```
  ```suggested
  // In /proc/net/unix, column 3 (0-indexed) is the socket state; "0A" = LISTENING.
      const listeningPaths = new Set(
        table.split("\n")
          .filter((line) => {
            const parts = line.trim().split(/\s+/);
            // skip the header line ("sk  RefCount ...") and lines with fewer fields
            return parts.length >= 7 && parts[3] === "0A";
          })
          .map(
  ```

## src/omp/ripwire-bridge.ts
- **src/omp/ripwire-bridge.ts:73-78** (bug)
  **`spawnSync` ignores `maxBuffer` — buffer limit is non-functional, truncation detection is dead code**

`spawnSync` (Node.js) does **not** support the `maxBuffer` option — only `execSync` and `execFileSync` do. Passing it to `spawnSync` is silently ignored (no error, no limit). This means:

1. **No output is ever capped**: ripwire can produce >32 MB of stdout/stderr without any enforcement.
2. **Truncation detection is dead code**: Lines 79–93 (the ENOBUFS / ERR_CHILD_PROCESS_STDIO_MAXBUFFER / stdout-length heuristic) can never trigger because `spawnSync` never sets these error codes for buffer overflow — it doesn't enforce a buffer limit at all.
3. **The stdout-length heuristic is also unreachable**: `stdoutLen >= RIPWIRE_MAX_BUFFER` can only be true if output genuinely exceeds 32 MB, which will happen — but it won't indicate truncation, just large output.

This means the F-271 and F-1029 fixes documented in the comments are ineffective. A malicious or pathological ripwire output could exhaust memory.

**Suggested fix**: Either switch to `execFileSync` (which supports `maxBuffer`), or manually enforce the limit by checking `res.stdout.length` and `res.stderr.length` after the call and truncating/reporting.
  ```existing
  const res = spawnSync(bin, [root, ...args], {
    encoding: "utf8",
    timeout: timeoutMs ?? RIPWIRE_TIMEOUT_MS,
    maxBuffer: RIPWIRE_MAX_BUFFER,
    env: e,
  });
  ```
  ```suggested
  // Option A: use execFileSync which supports maxBuffer
  // const res = execFileSync(bin, [root, ...args], {
  //   encoding: "utf8",
  //   timeout: timeoutMs ?? RIPWIRE_TIMEOUT_MS,
  //   maxBuffer: RIPWIRE_MAX_BUFFER,
  //   env: e,
  //   stdio: ["pipe", "pipe", "pipe"],
  // });

  // Option B: keep spawnSync but enforce limit manually after the call
  const res = spawnSync(bin, [root, ...arg
  ```
