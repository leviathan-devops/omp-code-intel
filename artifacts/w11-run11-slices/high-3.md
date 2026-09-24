# HIGH slice 3 — 10 findings across 8 files

## src/hunter/diagnostics/calibration.ts
- **src/hunter/diagnostics/calibration.ts:266-271** (bug)
  When `graph.nodes()` throws, the error is swallowed with a `console.warn` and an empty graph is recorded in the version hash. This contradicts the file's own stated principle: 'an ill-shaped fixture is the loud named CALIBRATION_FIXTURE_INVALID — never a coerced default.' A broken adapter means the fixture's version hash is silently incorrect, which can cause a stale calibration to be reused or a valid one to be invalidated — both wrong outcomes that fail to surface the real problem. Consider throwing `calibrationFixtureInvalid` instead, or at minimum including the error detail in the hash so it is not silently equivalent to an empty graph.
  ```existing
  try {
        rawNodes = graph.nodes();
      } catch (e: unknown) {
        console.warn(`[calibration] graph.nodes() threw: ${e instanceof Error ? e.message : String(e)} - recording empty graph in version hash`);
        rawNodes = [];
      }
  ```
  ```suggested
  try {
        rawNodes = graph.nodes();
      } catch (e: unknown) {
        throw calibrationFixtureInvalid(
          `graph.nodes() threw for fixture: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
  ```

## src/hunter/harness/hunt-lock.ts
- **src/hunter/harness/hunt-lock.ts:154-162** (bug)
  TOCTOU race in `releaseHuntLock`: After reading the payload and verifying ownership (`existing.pid !== process.pid` / hostname check), but before `unlinkSync`, the lock file could have been deleted by the TTL-stale-recovery path in `acquireHuntLock` and replaced with a new lock held by a **different** owner. The subsequent `unlinkSync` would then delete the new owner's lock. The correct approach is to use an atomic compare-and-delete: either use a unique marker in the lock content and verify it before unlinking, or use `rename` + `unlink` (rename to a temp file, verify the rename succeeded, then unlink). At minimum, re-read the lock before unlink to confirm the ownership triple (pid + acquiredAt + hostname) still matches.
  ```existing
  if (existing.pid !== process.pid) return;
    // ★ F-342 FIX (2026-09-24): never release a FOREIGN-HOST lock — the PID check
    //   above is namespace-local, so a colliding PID on this host must not unlink
    //   another host's lock. Fail closed: keep it, name the holder.
    if (typeof existing.hostname === 'string' && existing.hostname !== os.hostname()) {
      console.warn(`[hunt-lock] rel
  ```
  ```suggested
  if (existing.pid !== process.pid) return;
    if (typeof existing.hostname === 'string' && existing.hostname !== os.hostname()) {
      console.warn(`[hunt-lock] release skipped for ${lockPath}: held by host ${existing.hostname} (this host ${os.hostname()} — a colliding PID must not unlink a foreign lock)`);
      return;
    }
    // Re-read to close the TOCTOU window — another process's stale-re
  ```

## src/hunter/lexicon/compiler.ts
- **src/hunter/lexicon/compiler.ts:97-110** (performance)
  **`batteryName` performs synchronous file I/O via `extractRuleCards`, causing redundant corpus reads and defeating async improvements. In `batteryVersionAsync`, this blocks the event loop, and the corpus is read twice: once asynchronously for the hash and once synchronously in `batteryName`. Similarly, `batteryVersion` reads files twice synchronously. Consider passing pre-extracted cards to `batteryName` to eliminate the redundant I/O.**
  ```existing
  export async function batteryVersionAsync(profile: ProjectProfile): Promise<string> {
  const texts = await Promise.all(profile.rules.corpus.map(async (p) => {
    let text: string;
    try {
      text = await readFile(p, 'utf8');
    } catch (e: unknown) {
      throw corpusUnreadable(p, String(e));
    }
    return `${p}\n${text}`;
  }));
  const corpusText = texts.join('\n');
  const hash = sh
  ```

## src/hunter/shared/migrations.ts
- **src/hunter/shared/migrations.ts:84-87** (security)
  The transactional migration has an atomicity gap: when the driver doesn't support explicit BEGIN (began = false), each statement in TYPED_GRAPH_DDL auto-commits individually. If a mid-sequence statement fails, earlier statements remain committed, leaving a half-migrated schema that the caller cannot detect from the error alone. Consider adding a post-execution integrity check (e.g., querying sqlite_master for expected tables) or documenting this risk prominently for consumers that must guarantee all-or-nothing migration.
  ```existing
  let began = false;
  try {
    try { db.exec('BEGIN IMMEDIATE'); began = true; } catch { began = false; /* no explicit-BEGIN support: bare exec below */ }
    db.exec(TYPED_GRAPH_DDL);
  ```
  ```suggested
  // Verify schema integrity after non-transactional fallback
if (!began) {
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('typed_nodes','typed_edges','resolutions','graph_facts')");
  // If fewer than 4 tables found, throw to signal partial migration
}
  ```
- **src/hunter/shared/migrations.ts:45-50** (bug)
  The graph_facts table lacks a CHECK constraint on its `predicate` column, unlike typed_edges which enforces `CHECK (predicate IN (...))`. This allows arbitrary garbage strings to be inserted as predicates into graph_facts, breaking consistency with the rest of the schema. Similarly, there is no length check on `evidence` (typed_edges enforces `CHECK (length(evidence_quote) > 0)`).
  ```existing
  CREATE TABLE IF NOT EXISTS graph_facts (
  id INTEGER PRIMARY KEY,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  evidence TEXT NOT NULL,
  ```
  ```suggested
  CREATE TABLE IF NOT EXISTS graph_facts (
  id INTEGER PRIMARY KEY,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL CHECK (predicate IN (${PREDICATES_SQL})),
  object TEXT NOT NULL,
  evidence TEXT NOT NULL CHECK (length(evidence) > 0),
  ```

## src/hydra/pipeline.ts
- **src/hydra/pipeline.ts:194-197** (bug)
  The `splice(0, this.evidence.length, ...evidence)` spread may exceed the JavaScript engine's maximum call stack size (V8 limit ~65k arguments) if `evidence` is large. Replace with a bounded approach to avoid a potential stack overflow.
  ```existing
  if (seq >= this.publishedSeq) {
      this.evidence.splice(0, this.evidence.length, ...evidence);
      this.publishedSeq = seq;
    }
  ```
  ```suggested
  if (seq >= this.publishedSeq) {
      this.evidence.length = 0;
      for (const entry of evidence) {
        this.evidence.push(entry);
      }
      this.publishedSeq = seq;
    }
  ```

## src/omp/adapters/c2kg.ts
- **src/omp/adapters/c2kg.ts:42-49** (bug)
  Individual symbol objects from untrusted JSON are not type-validated. Properties such as `s.name`, `s.kind`, `s.file`, and `s.line` could be non-string or non-number types at runtime. The nullish coalescing operator `??` only guards against `null`/`undefined`, so for example, a numeric `s.name` like `42` would cause `42.includes(subject)` to throw a TypeError, crashing the entire `facts()` call and bypassing the error contract. Similarly, non-string values for `s.kind` and `s.file` could leak into the output `LayerFact`, and a non-number `s.line` would violate the typed contract of the `symbols` interface, leading to potential misbehavior in downstream consumers.
  ```existing
  const hits = symbols.filter((s) => (s.name ?? "").includes(subject));
    return hits.map((s) => ({
      consumer: "L4_C2KG" as const,
      rung: "context" as const,
      subject,
      value: { kind: s.kind, file: s.file, line: s.line },
      source: `${indexPath}#symbols(${s.file ?? "?"}:${s.line ?? "?"})`,
    }));
  ```
  ```suggested
  const hits = symbols.filter((s) => typeof s.name === "string" && s.name.includes(subject));
    return hits.map((s) => ({
      consumer: "L4_C2KG" as const,
      rung: "context" as const,
      subject,
      value: {
        kind: typeof s.kind === "string" ? s.kind : undefined,
        file: typeof s.file === "string" ? s.file : undefined,
        line: typeof s.line === "number" ? s.line : un
  ```

## src/omp/gate-hook.ts
- **src/omp/gate-hook.ts:168-168** (bug)
  **Orphaned `pendingQueries` entries never evicted** — If a `graph-query`/`ripwire` tool_call fires but the matching `tool_result` never arrives (agent abort, timeout, crash, or the `throw` from `attachGiGraphGate` cancelling the enclosing frame before the query executes), the entry in `pendingQueries` and the corresponding `states` entry persist indefinitely. The `Map` grows unbounded over the session lifetime with no TTL, max-size cap, or periodic sweep. In a long-running session, this is a memory leak. Recommend adding a TTL sweep (e.g. entries older than N seconds are pruned on each `tool_call`) or a max-queue cap with oldest-eviction.
  ```existing
  const pendingQueries = new Map<string, Array<{ target: string; tool: string }>>();
  ```
  ```suggested
  // Add periodic eviction inside the tool_call handler:
const QUERY_TTL_MS = 120_000;
const now = Date.now();
for (const [k, q] of pendingQueries) {
  // (entries don't carry timestamps; add them if needed)
  // Or simpler: cap per-session queue length and evict oldest
  if (q.length > 10) {
    const removed = q.splice(0, q.length - 10);
    // optionally recordGraphQuery with resolved=false for r
  ```
- **src/omp/gate-hook.ts:241-242** (bug)
  **Fragile regex heuristics for query resolution detection** — `hasRows` and `noRows` (lines 256–262) depend on opaque regex patterns matching against text content to determine whether a graph query actually returned data. If the tool output format changes (e.g. a new query verb, a different data schema, localization), `hasRows` may false-negative, causing a legitimately resolved query to not grant drift coverage. This directly triggers a T3 abort on the next structural edit — a hard block on the agent's ability to work. The detection should be more robust, ideally checking structured response fields rather than regex-scanning opaque text.
  ```existing
  const hasRows = /rows?\s*[:=]\s*[1-9]/.test(text) || /"count":\s*[1-9]/.test(text) || /(?:^|\n)\s*(?:src|lib|tests|packages)\/[^\s]+:\d+/.test(text);
const noRows = /rows?\s*[:=]\s*0\b/.test(text) || /"count":\s*0\b/.test(text) || /NO NODE|not found|0 (?:rows|matches|results)/i.test(text);
  ```
  ```suggested
  // Prefer checking structured fields on the event before falling back to regex:
const detailsRows = typeof event.details === "object" && event.details !== null
  ? (event.details as { rowCount?: number; rows?: number; count?: number })
  : {};
const hasRows = (typeof detailsRows.rowCount === "number" && detailsRows.rowCount > 0)
  || (typeof detailsRows.rows === "number" && detailsRows.rows > 0)
 
  ```

## src/omp/gi-registry.ts
- **src/omp/gi-registry.ts:144-146** (bug)
  `closeGiRegistry()` calls `closeStoreDb()` which closes **all** tracked store DB handles. Any other caller that currently holds a handle from `getStoreDb` (e.g., an ongoing `openSessionStore`) will have its connection invalidated, potentially causing silent failures or `SQLITE_MISUSE` errors on subsequent operations. Document this side-effect prominently, or add a parameter to selectively close only the registry DB.
  ```existing
  export function closeGiRegistry(): void {
  closeStoreDb();
}
  ```
  ```suggested
  // NOTE: closeStoreDb() closes ALL tracked DB handles, not just the registry.
// Callers must ensure no other store DB is in active use, or this function
// should be refactored to close only the registry connection.
export function closeGiRegistry(): void {
  closeStoreDb();
}
  ```
