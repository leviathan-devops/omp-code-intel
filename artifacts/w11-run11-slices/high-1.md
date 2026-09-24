# HIGH slice 1 — 13 findings across 9 files

## src/hunter/diagnostics/engine.ts
- **src/hunter/diagnostics/engine.ts:785-791** (bug)
  TOCTOU race in file-lock recovery: Lines 785-791 attempt to recover from a stale lock by unlinking it and re-acquiring, but this unlink+writeFileSync is non-atomic. Two concurrent processes can both observe `rows === null && !haveLock`, both unlink the stale lock, and both acquire `wx` locks in quick succession (or one acquires right after the other's unlink). Both then proceed to `buildLocalGraph` + `writeGraph`, corrupting the DB. The fix should use an atomic advisory lock (e.g., `fs.openSync(lockPath, 'wx' | 'w')` with an `flock`/`lockf`), or at minimum check the lock file's PID is stale AND use a timestamp-based staleness threshold rather than an immediate unlink+reacquire.
  ```existing
  if (rows === null && !haveLock) {
      // Lock holder vanished without persisting (crash between lock and write):
      // take over rather than deadlock on its stale lock.
      try { fs.unlinkSync(lockPath); } catch { /* already gone */ }
      fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
      haveLock = true;
    }
  ```
  ```suggested
  if (rows === null && !haveLock) {
      // Lock holder vanished without persisting (crash between lock and write):
      // take over rather than deadlock on its stale lock.
      try {
        const lockContent = fs.readFileSync(lockPath, 'utf8').trim();
        const lockPid = Number(lockContent);
        if (Number.isFinite(lockPid)) {
          try { process.kill(lockPid, 0); } catch {
       
  ```
- **src/hunter/diagnostics/engine.ts:0-0** (bug)
  collectLocalTsFiles is vulnerable to symlink cycles: `e.isDirectory()` returns true for symlinks to directories. If a symlink creates a cycle (e.g., `<root>/link` → `<root>/`), the recursive `walk()` will recurse infinitely, causing a stack overflow. The function should resolve symlinks before recursing and track visited real paths to detect cycles.
  ```existing
  function collectLocalTsFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries: import('node:fs').Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e: unknown) {
      throw sourceReadFailed(dir, `local build readdir failed: ${String(e)}`);
    }
    for (const e of entries) {
      if (e.name 
  ```
  ```suggested
  function collectLocalTsFiles(root: string): string[] {
  const out: string[] = [];
  const visitedRealDirs = new Set<string>();
  const walk = (dir: string): void => {
    let realDir: string;
    try {
      realDir = fs.realpathSync(dir);
    } catch (e: unknown) {
      throw sourceReadFailed(dir, `local build realpath failed: ${String(e)}`);
    }
    if (visitedRealDirs.has(realDir)) return; 
  ```
- **src/hunter/diagnostics/engine.ts:754-761** (bug)
  Dead code: `fallbackProfile` always throws, so the assignment `profile = fallbackProfile(...)` on line 760 can never complete. This means `profileFromDisk` remains `false` whenever the profile fails to load, and the variable `profile` is never assigned via the catch path — the exception propagates immediately. The catch block is dead code; the try/catch is unnecessary. If the intent is to allow callers to distinguish 'profile loaded from disk' vs 'profile not loaded', the catch should handle this differently (e.g., re-throw after logging, or return a partial summary).
  ```existing
  let profile: ProjectProfile;
  let profileFromDisk = false;
  try {
    profile = loadProfile(args.profilePath);
    profileFromDisk = true;
  } catch (e: unknown) {
    profile = fallbackProfile(root, e instanceof Error ? e.message.slice(0, 300) : String(e));
  }
  ```
  ```suggested
  let profile: ProjectProfile;
  let profileFromDisk = false;
  try {
    profile = loadProfile(args.profilePath);
    profileFromDisk = true;
  } catch (e: unknown) {
    // fallbackProfile always throws — propagate the load error directly.
    throw new Error(
      `PROFILE_INVALID: the disk profile failed to load for ${root} ` +
      `(reason: ${e instanceof Error ? e.message.slice(0, 300) : St
  ```

## src/hunter/graph/graphify-adapter.ts
- **src/hunter/graph/graphify-adapter.ts:918-923** (bug)
  buildSync() checks `this.buildInFlight` but never sets it, unlike build(). This breaks the mutual-exclusion guarantee: if an async build() is suspended at its setImmediate/yield point, a concurrent buildSync() call passes the guard and begins mutating shared caches (cachedNodes, cachedEdges, cachedRaw, etc.) concurrently. Any future refactor that adds an await or callback inside buildSync would silently corrupt shared state. Both paths must use the same reentrancy flag.
  ```existing
  buildSync(graphPath: string, profileOverride?: ProjectProfile): { nodes: GraphNode[]; edges: GraphEdge[]; graph: GraphifyGraph } {
    // ★ F-250 FIX (2026-09-24): buildSync is atomic alone but not against an in-flight async build() suspended at its parse-yield await — refuse LOUD; a refused/failed build leaves built=false (fail-closed).
    if (this.buildInFlight) {
      throw adapterFailed("gra
  ```
  ```suggested
  buildSync(graphPath: string, profileOverride?: ProjectProfile): { nodes: GraphNode[]; edges: GraphEdge[]; graph: GraphifyGraph } {
    if (this.buildInFlight) {
      throw adapterFailed("graphify buildSync", "ADAPTER_BUSY: an async build() is in flight on this adapter — serialize builds, one at a time");
    }
    this.buildInFlight = true;
    this.built = false;
    try {
      // ... existing 
  ```

## src/hunter/hooks/bus-hook.ts
- **src/hunter/hooks/bus-hook.ts:0-0** (bug)
  In `retryFailed()`, if subscriber A succeeds but subscriber B throws, the event is re-queued. On the next `retryFailed()` call, subscriber A receives the event a second time, causing duplicate processing. The retry logic should track per-subscriber delivery status (e.g., a boolean flag per subscriber) so that only the failing subscribers are retried, or the event should be marked as delivered once ANY subscriber succeeds.
  ```existing
  retryFailed(): number {
    const pending = this.failedEvents.splice(0, this.failedEvents.length);
    for (const f of pending) {
      let lastError: unknown = null;
      for (const fn of this.subscribers) {
        try {
          fn(eventKind(f.row.kind), f.payload);
        } catch (e: unknown) {
          console.error(`[hydra-bus] retry for ${f.row.kind} (attempt ${f.attempt + 1}) subscribe
  ```

## src/hunter/tools/bug-hunt.ts
- **src/hunter/tools/bug-hunt.ts:97-98** (bug)
  **Bug: Lock release when `acquireHuntLock` throws corrupts lock state.** If `acquireHuntLock(absTarget)` throws (e.g., lock corruption, concurrent hold), the outer `finally` block (lines 153–156) still calls `releaseHuntLock(absTarget)` on a lock that was never acquired. This could corrupt the lock file, unlock another process's held lock, or mask the original acquisition error. The fix is to track whether acquisition succeeded with a boolean flag and guard the release.
  ```existing
  acquireHuntLock(absTarget);
  try {
  ```
  ```suggested
  let lockHeld = false;
  acquireHuntLock(absTarget);
  lockHeld = true;
  try {
  ```

## src/omp/adapters/abide.ts
- **src/omp/adapters/abide.ts:130-130** (bug)
  The fallback path in `tailEvents` re-reads the file with `readFileSync` after the bounded-tail loop fails. The earlier guard checks `st.size > MAX_SAFE_FULL_READ` and throws, but if `st` is null (stat failed), the code falls through to `readFileSync` with no size guard at all — a missing ledger's ENOENT will surface as an unhandled crash rather than the structured `GI_ENFORCE_ABIDE` error. Add a null-check on `st` before `readFileSync`.
  ```existing
  const raw = fs.readFileSync(eventsPath, "utf8");
  ```

## src/omp/decision.ts
- **src/omp/decision.ts:0-0** (bug)
  The `intent` parameter is not validated, unlike every other public input in this file. The file's own F-1 FIX (line 96-104) and the comment on line 131 explicitly document that an empty/undefined input silently propagates into downstream functions producing wrong results. `GraphFactInput.intent` is typed as `"consume" | "declare" | "mutate" | "measure"` but TypeScript does not prevent `undefined` at runtime. An undefined `intent` would silently reach `graphFacts`, skip the M-GRAPH-5 rule (which checks `input.intent === "measure"`), and yield a potentially wrong verdict set. This is the exact same defect class the file has already fixed twice (the F-1 FIX for `decideFromRegistry` act fields, and the W5 audit for `decideFireFromGraph` scopeRoot/target) — `intent` was missed. Add a validation guard consistent with the existing pattern.
  ```existing
  const target: string,
  intent: GraphFactInput["intent"],
): FireEvidence {
  ```
  ```suggested
  const target: string,
  intent: GraphFactInput["intent"],
): FireEvidence {
  // ★ AUDIT HIGH: validate `intent` — the same missing-input class as scopeRoot/target.
  //   An undefined intent silently propagates into graphFacts, skipping rules.
  const VALID_INTENTS: readonly string[] = ["consume", "declare", "mutate", "measure"];
  if (!VALID_INTENTS.includes(intent as string)) {
    throw new Er
  ```

## src/omp/extension.ts
- **src/omp/extension.ts:461-462** (bug)
  The graphify branch (substrate==='graphify') calls `populateSessionStore` inside `withPopulateLane` but has NO retry on failure: if populate throws, the error propagates to the calling tool, but the lane is resolved and the store remains empty/stale. A subsequent queued query that hits the DEFAULT branch will re-check `substrateNeedsPopulate` and may re-populate, but a subsequent graphify-branch query will NOT re-attempt populate. Consider recording the populate failure state in the lane and re-attempting on the next graphify-branch caller, or have the graphify branch fall back to the default substrate check on populate failure.
  ```existing
  const pop = await withPopulateLane(async () => populateSessionStore(opened.storePath, scopeRoot, "graphify-" + Date.now().toString(36), { substrate: "graphify" }));
      if (pop.skipped || (pop.fallbackReason ?? "").length > 0) {
  ```
- **src/omp/extension.ts:345-352** (security)
  Two concurrent `action=wipe` calls to graph-probe can both pass the `GI_OMP_ALLOW_CLEAR` env gate, both pass the audit confinement check, and both call `clearGiRegistry()` — resulting in a double wipe with only one audit trail entry. The first wipe clears the registry; the second operates on an already-cleared state. Add a concurrency guard (e.g., a promise-based lock or a module-level `wiping` flag) to serialize wipe operations.
  ```existing
  if (String(p.action ?? "").toLowerCase() === "wipe") {
      // CRITICAL fix (frozen scan): defense-in-depth AT the tool layer — the
      // description promises an env gate; the deep gate lives inside
      // clearGiRegistry (GI_OMP_ALLOW_CLEAR, code GI_CLEAR_REFUSED). The tool
      // now refuses with the SAME env + code before touching the registry.
      if (process.env.GI_OMP_ALLOW_CLEAR !
  ```

## src/omp/populate-corbell.ts
- **src/omp/populate-corbell.ts:174-174** (performance)
  The freshness probe `isCorbellCheckoutFreshFor` is called twice: once at line 123 (before reads) and once at line 166 (after reads). Each call walks the entire workspace tree with up to `CORBELL_FRESHNESS_BUDGET` (50,000) `statSync` calls — that's potentially 100k stat syscalls per invocation of this function. The second call's primary purpose is to detect a rebuild that happened during the read, but the `warmStoreUnchanged` (mtime+size+ino snapshot) comparison at line 168 already covers that case. Consider removing the second `isCorbellCheckoutFreshFor` call and relying solely on the `warmStoreUnchanged` comparison, or caching the freshness walk result if both checks are deemed necessary.
  ```existing
  const freshnessAfter = isCorbellCheckoutFreshFor(root, warmPath);
  ```
  ```suggested
  // Rely on the stat-snapshot comparison (stBefore vs stAfter) to detect
  // mid-read swaps — avoids a second full filesystem walk (50k stat calls).
  // If freshness semantics beyond stat-snapshot are needed, consider caching
  // the walk result from the first probe above.
  ```

## src/scoping/gi-ecosystem.ts
- **src/scoping/gi-ecosystem.ts:7-7** (bug)
  Hardcoded temporary directory path `/tmp/gi-omp-tmp` is not cross-platform. On Windows, `/tmp` does not exist and this will fail at runtime. Use `os.tmpdir()` or a platform-appropriate alternative to construct this path dynamically.
  ```existing
  export const GI_TMP_DIR = "/tmp/gi-omp-tmp";
  ```
  ```suggested
  import { tmpdir } from "node:os";
import { join } from "node:path";

export const GI_TMP_DIR = join(tmpdir(), "gi-omp-tmp");
  ```
- **src/scoping/gi-ecosystem.ts:7-7** (security)
  The fixed predictable path `/tmp/gi-omp-tmp` can be exploited via symlink attacks (TOCTOU race condition): a malicious user could pre-create a symlink at this path pointing to a sensitive location, and the application could follow it when writing files. Using a randomized or user-specific subdirectory under the system temp directory mitigates this risk.
  ```existing
  export const GI_TMP_DIR = "/tmp/gi-omp-tmp";
  ```
  ```suggested
  import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const GI_TMP_DIR = join(tmpdir(), `gi-omp-tmp-${randomUUID()}`);
  ```
