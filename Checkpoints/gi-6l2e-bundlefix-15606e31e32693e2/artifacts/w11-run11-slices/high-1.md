# HIGH slice 1 — 12 findings across 8 files

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
