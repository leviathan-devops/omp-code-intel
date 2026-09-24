# HIGH slice 1 — 13 findings across 9 files

## src/hunter/firewall/lexicon-types.ts
- **src/hunter/firewall/lexicon-types.ts:55-55** (bug)
  **Type mismatch: `remediationHook` evidence shape vs `MPSE` (PascalCase mismatch).**

`PatternFamily.remediationHook` accepts `evidence: { pattern: string; state: string; evidence: string }` (lowercase), while `MPSE` uses `{ Pattern: string; State: string; Evidence: string }` (PascalCase). This means consumers **cannot** pass an `MPSE` triplet directly as the `evidence` argument — they must manually transform the casing. Since the spec explicitly states 'THE MPSE TRIPLET — recorded on EVERY decision, no exceptions', this forces every call site to do a lossy or redundant manual mapping, risking silent `undefined` values if a consumer assumes compatibility.

Suggested fix: align the `remediationHook` parameter shape with `MPSE` (use PascalCase), or accept `MPSE` directly:
```typescript
remediationHook?: (evidence: MPSE) => void;
```
Alternatively, if lowercase is intentional for a separate concern, document the distinction explicitly to prevent misuse.
  ```existing
  remediationHook?: (evidence: { pattern: string; state: string; evidence: string }) => void;
  ```
  ```suggested
  remediationHook?: (evidence: MPSE) => void;
  ```

## src/hunter/harness/scan.ts
- **src/hunter/harness/scan.ts:35-42** (security)
  The path-traversal containment check in `resolveCorpusPaths` uses `path.resolve` + string prefix matching (`startsWith`), but does NOT resolve symlinks via `fs.realpathSync`. If a symlink exists inside the project root pointing to a file outside the root (e.g., `project/link -> /etc/passwd`), then `path.resolve(root, 'link')` yields `project/link` which passes the `startsWith(root + path.sep)` check, even though the actual target escapes the project. Since the header comment (F-64) explicitly states this is defense-in-depth against path traversal, adding `fs.realpathSync` would close this class of bypass. Note: `fs.realpathSync` can throw on broken symlinks — a try/catch should convert that to the existing `HUNT_INVALID_CORPUS` error.
  ```existing
  const root = path.resolve(profile.project.root);
  const corpus = profile.rules.corpus.map((entry) => {
    const abs = path.isAbsolute(entry) ? path.normalize(entry) : path.resolve(root, entry);
    if (abs !== root && !abs.startsWith(root + path.sep)) {
      throw new Error(`HUNT_INVALID_CORPUS: entry=${entry} escapes the project root (${root}) — corpus entries must stay under the root.`);
    
  ```
  ```suggested
  import fs from 'node:fs';
  const root = fs.realpathSync(path.resolve(profile.project.root));
  const corpus = profile.rules.corpus.map((entry) => {
    let abs: string;
    try {
      const raw = path.isAbsolute(entry) ? path.normalize(entry) : path.resolve(root, entry);
      abs = fs.realpathSync(raw);
    } catch {
      throw new Error(`HUNT_INVALID_CORPUS: entry=${entry} could not be resolv
  ```

## src/hunter/lexicon/compiler.ts
- **src/hunter/lexicon/compiler.ts:0-0** (bug)
  `batteryVersionAsync` is documented as 'non-blocking reads for the async compile paths' (F-146 FIX), but it synchronously calls `batteryName(profile)` which internally invokes `extractRuleCards` → `readLinesOrThrow` → `fs.readFileSync`. This means every corpus file is read synchronously inside the async path, defeating the stated purpose of F-146. Additionally, `compileBattery` later calls `extractRuleCards(profile.rules.corpus)` again (line ~206), resulting in each corpus file being read 3 times total (1× async via Promise.all, 2× sync via extractRuleCards). Consider either: (a) making `batteryName` async-aware so it reuses the already-read texts, or (b) caching the extracted cards and passing them through to avoid redundant I/O.
  ```existing
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
  const hash = sha256(`${corpusText}\n${JSON.stringify(profile.rules.bindings)}`);
  return `${projectTok
  ```
  ```suggested
  // Option A: pass the already-read texts into batteryName (requires batteryName refactoring)
  // Option B: extract cards once and derive the name from them
  const cards = extractRuleCards(profile.rules.corpus);
  const corpusText = texts.join('\n');
  const hash = sha256(`${corpusText}\n${JSON.stringify(profile.rules.bindings)}`);
  return `${projectTokenSlug(profile.project.name)}-${batteryName
  ```

## src/hunter/shared/query-engine.ts
- **src/hunter/shared/query-engine.ts:355-355** (bug)
  The fallback LIKE-based scoring `1 - i * 0.05` produces negative scores for results at index ≥ 20. Since `VECTOR_TOPK_MAX` is 100, consumers that expect scores in [0, 1] will get values as low as ≈ -3.95. Clamp the score to a minimum of 0 or use a different decay function.
  ```existing
  return rows.map((r, i) => ({ canonical_id: r.canonical_id, score: 1 - i * 0.05 }));
  ```
  ```suggested
  return rows.map((r, i) => ({ canonical_id: r.canonical_id, score: Math.max(0, 1 - i * 0.05) }));
  ```
- **src/hunter/shared/query-engine.ts:224-225** (bug)
  If `COUNT(*)` returns null (e.g., on an empty/unmigrated table) or a non-number type (schema mismatch), the `typeof edgeCount === 'number'` check silently skips the cap guard. This allows an unbounded full-graph BFS that can OOM — the exact failure mode the guard was designed to prevent. Treat non-number as an error or default to 0.
  ```existing
  const edgeCount = edgeCountRow?.['c'];
      if (typeof edgeCount === 'number' && edgeCount > 500000) throw new Error(`COMMUNITY_TOO_LARGE: edges=${edgeCount} exceeds the 500000 in-memory BFS cap (page by predicate or raise the cap deliberately)`);
  ```
  ```suggested
  const edgeCount = edgeCountRow?.['c'];
      if (typeof edgeCount !== 'number') throw new Error(`COMMUNITY_QUERY_FAILED: unexpected COUNT(*) result type: ${String(edgeCount)}`);
      if (edgeCount > 500000) throw new Error(`COMMUNITY_TOO_LARGE: edges=${edgeCount} exceeds the 500000 in-memory BFS cap (page by predicate or raise the cap deliberately)`);
  ```

## src/kernel/graph-gate.ts
- **src/kernel/graph-gate.ts:66-68** (bug)
  blastRadiusChanges array entries are not validated for being non-null objects before property access. If any entry is null, undefined, or a primitive (e.g., from an untyped caller or serialization), `b.after` / `b.before` will throw a TypeError that escapes the gate boundary. The `Number.isFinite` check on the next line never gets a chance to catch it, because the crash happens on `b.after - b.before`. Add a guard at the top of the loop to fail-closed on non-object entries, consistent with the existing F-204 defense-in-depth pattern.
  ```existing
  for (const b of diff.blastRadiusChanges ?? []) {
    // ★ F-204 FIX (2026-09-24): a malformed entry fails closed, never NaN-passes.
    const jump = b.after - b.before;
  ```
  ```suggested
  for (const b of diff.blastRadiusChanges ?? []) {
    if (!b || typeof b !== "object" || typeof b.before !== "number" || typeof b.after !== "number" || typeof b.label !== "string") {
      failures.push("malformed blastRadiusChanges entry — not a {label, before, after} object, refusing to pass an unmeasured gate");
      continue;
    }
    // ★ F-204 FIX (2026-09-24): a malformed entry fails close
  ```

## src/omp/enforcement.ts
- **src/omp/enforcement.ts:194-195** (bug)
  Misleading error code: when TSG is not registered, the thrown error code is `CLAIM_FW_JEV_NO_KEY`, which references JEV but is actually guarding the TSG component. A developer diagnosing a TSG-deployment issue will be misdirected. This should use a TSG-specific code like `CLAIM_FW_TSG_DOWN` or similar.
  ```existing
  const tsgDecl = deps.register.find((c) => c.id === "TSG");
    if (!tsgDecl) throw Object.assign(new Error("TSG is not registered"), { code: "CLAIM_FW_JEV_NO_KEY" });
  ```
  ```suggested
  const tsgDecl = deps.register.find((c) => c.id === "TSG");
    if (!tsgDecl) throw Object.assign(new Error("TSG is not registered"), { code: "CLAIM_FW_TSG_DOWN" });
  ```
- **src/omp/enforcement.ts:200-203** (bug)
  Unsafe Error cast in multiple catch blocks: `(e as Error).message` without an `instanceof Error` guard can throw a secondary TypeError if a non-Error value is caught. Found in the close-layer TSG catch block and the JEV registration catch block. This is the exact class of bug that the F-32/F-406 fixes were meant to address.
  ```existing
  code: (e as { code?: string }).code ?? "CLAIM_FW_JEV_NO_KEY",
      reason: "close layer could not bind evidence (fail-closed)",
      evidence: (e as Error).message,
      spans: [],
  ```
  ```suggested
  code: (e as { code?: string }).code ?? "CLAIM_FW_TSG_DOWN",
      reason: "close layer could not bind evidence (fail-closed)",
      evidence: e instanceof Error ? e.message : String(e),
      spans: [],
  ```

## src/omp/gate-hook.ts
- **src/omp/gate-hook.ts:48-48** (bug)
  `split(oldString).join(newString)` replaces ALL occurrences of `oldString` throughout the file content. An OMP edit operation targets a single specific location. This means the reconstructed `newText` may differ from what the agent actually intended, causing `runGraphGate` and `classifyEdit` to evaluate drift and severity against an incorrect reconstruction. Use `replace(oldString, newString)` (which replaces only the first occurrence) or `replace` with a `replaceAll` if the intent is truly global.
  ```existing
  return { oldText, newText: oldText.split(oldString).join(newString), file };
  ```
  ```suggested
  return { oldText, newText: oldText.replace(oldString, newString), file };
  ```

## src/omp/typed-write.ts
- **src/omp/typed-write.ts:232-239** (security)
  **TOCTOU: `new Database()` executes before `verifyOpenedStoreFile`**

`verifyOpenedStoreFile(storePath)` (line ~299) is called AFTER `new Database(storePath, { create: true })` has already opened the file. A concurrent regular-file swap (rename another session's valid SQLite into this path) between the pre-open stat/magic check and the `Database` constructor would open cross-session data. The post-open verify then re-reads the (now-swapped) file's header and passes.

The `Database` constructor should receive the already-validated fd (if bun:sqlite supports it), or the path validation + open should be atomic via a single `O_NOFOLLOW` open with `fstat` dev/ino pinning.
  ```existing
  const db = new Database(storePath, { create: true });
  try {
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA busy_timeout = 5000;"); // scan triage: raw BEGIN IMMEDIATE needs contention tolerance
    // W36 (frozen-scan HIGH): post-open re-verify narrows the residual
    // validation→open window — a symlink planted, or garbage swapped in,
    // after the pre-open checks is refuse
  ```
  ```suggested
  // Validate AND open atomically — the Database constructor should receive
  // the fd that passed the magic check, not re-resolve the path.
  // If bun:sqlite does not support fd-based open, at minimum pin the inode
  // before open and re-check after open:
  const preOpenIno = fs.lstatSync(storePath).ino;
  const db = new Database(storePath, { create: true });
  try {
    const postIno = fs.fstat
  ```

## src/scoping/scoped-store.ts
- **src/scoping/scoped-store.ts:108-123** (bug)
  Race between sync `getStoreDb` and async `getStoreDbAsync` on first open: The async gate (`storeOpenInFlightByPath`) only protects async→async races. A sync caller via `upsertRow` → `getStoreDb()` can observe a null/sick handle and open a connection at the same time an async caller in `getStoreDbAsync` is also opening — the sync path has no gate. If `getStoreDbAsync` is mid-flight and a concurrent `upsertRow` call arrives, the sync path opens a fresh `Database` and assigns it to `storeDb`, then the async path's `getStoreDb(opts)` call also opens another fresh `Database`, overwriting `storeDb` and orphaning the first. Consider synchronously setting `storeDb` inside `getStoreDb` before the async caller can observe it, or serializing all opens through a shared mutex.
  ```existing
  export async function getStoreDbAsync(opts?: ScopedStoreOptions): Promise<Database> {
  if (!opts && storeDb) {
    try {
      storeDb.query('SELECT 1').get();
      return storeDb;
    } catch (_sick) { /* fall through to the shared open below */ }
  }
  const want = opts?.dbPath ?? storeDbPath;
  const existingGate = want ? storeOpenInFlightByPath.get(want) : null;
  if (existingGate) return ex
  ```
  ```suggested
  // One option: use a module-level Map<string, Promise<Database>> that both sync and async
// callers consult. The sync getStoreDb could become async-aware, or at minimum store the
// in-flight promise BEFORE the synchronous open completes, so that a concurrent sync caller
// that arrives mid-open sees the promise and waits.
  ```
- **src/scoping/scoped-store.ts:87-90** (bug)
  `closeStoreDb` does not clean up the in-flight gate map (`storeOpenInFlightByPath`). If `closeStoreDb()` is called while an async open is pending, the stale resolved/rejected promise remains in the map. A subsequent `getStoreDbAsync` call retrieves the already-resolved gate and returns a stale or closed database handle. Clean the map entry on close.
  ```existing
  export function closeStoreDb(): void {
  if (storeDb) {
    try { storeDb.close(); } catch (_c) { /* already closed */ }
    storeDb = null;
  ```
  ```suggested
  export function closeStoreDb(): void {
  if (storeDb) {
    try { storeDb.close(); } catch (_c) { /* already closed */ }
    storeDb = null;
    // Clear any in-flight gate so the next open starts fresh
    if (storeDbPath) storeOpenInFlightByPath.delete(storeDbPath);
  ```
- **src/scoping/scoped-store.ts:193-200** (bug)
  In `withImmediateTx`, if `fn(db)` throws a non-busy error, the `ROLLBACK` is attempted inside the inner `catch` and its failure is silently swallowed. Then the outer `catch` catches the original error and (since it is non-busy) rethrows it immediately — meaning the caller never learns the rollback may have failed. This can leave the connection in a broken state where subsequent operations fail unexpectedly. At minimum, log the rollback failure; ideally, if rollback fails, also close the singleton since the connection is unusable.
  ```existing
  try {
        const result = fn(db);
        db.exec('COMMIT;');
        return result;
      } catch (e) {
        try { db.exec('ROLLBACK;'); } catch (_r) { /* the tx is already dead */ }
        throw e;
      }
  ```
  ```suggested
  try {
        const result = fn(db);
        db.exec('COMMIT;');
        return result;
      } catch (e) {
        try {
          db.exec('ROLLBACK;');
        } catch (_r) {
          // Rollback failed — connection is unusable, close the singleton
          try { db.close(); } catch { /* best effort */ }
          storeDb = null;
        }
        throw e;
      }
  ```
