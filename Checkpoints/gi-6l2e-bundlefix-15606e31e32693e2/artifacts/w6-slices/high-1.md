# R6-HIGH slice 1 — 11 findings across 9 files

## src/hunter/diagnostics/calibration.ts
- **src/hunter/diagnostics/calibration.ts:256-267** (bug)
  graph.nodes() return ordering is not enforced to be deterministic, yet the result is fed directly into JSON.stringify for fixturesHash computation. If the adapter returns nodes in a non-deterministic order (e.g., from a Set or Map with insertion-order iteration), the same logical fixture set produces different batteryVersion hashes across runs, silently invalidating valid calibrations. The callers are sorted but the nodes themselves are not.
  ```existing
  const graphOf = (graph: GraphAdapter): unknown => ({
      nodes: graph.nodes().map((n) => ({
        id: n.id, kind: n.kind, name: n.name,
        file: n.file ?? null, line: n.line ?? null, lineage: n.lineage, source: n.source,
        data: n.data ?? null,
      })),
      edges: graph.nodes().map((n) => {
        try {
          return { to: n.id, callers: graph.whoCalls(n.name).map((c) => `${
  ```
  ```suggested
  const graphOf = (graph: GraphAdapter): unknown => {
      const nodes = graph.nodes().map((n) => ({
        id: n.id, kind: n.kind, name: n.name,
        file: n.file ?? null, line: n.line ?? null, lineage: n.lineage, source: n.source,
        data: n.data ?? null,
      }));
      nodes.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      return {
        nodes,
        edges: graph.no
  ```
- **src/hunter/diagnostics/calibration.ts:263-265** (bug)
  When whoCalls() throws, the catch silently coerces the callers to an empty array, masking a real data-integrity or adapter-error condition. This means a topology-breaking change that causes whoCalls to throw escapes the fixturesHash, producing a stale batteryVersion and allowing a potentially invalid calibration to be reused. The error should be logged or the serialization should fail loudly rather than silently degrading.
  ```existing
  try {
          return { to: n.id, callers: graph.whoCalls(n.name).map((c) => `${c.caller}@${c.file}:${c.line}`).sort() };
        } catch { return { to: n.id, callers: [] }; }
  ```
  ```suggested
  try {
          return { to: n.id, callers: graph.whoCalls(n.name).map((c) => `${c.caller}@${c.file}:${c.line}`).sort() };
        } catch (e) {
          console.warn(`[calibration] whoCalls threw for node ${n.name}: ${e instanceof Error ? e.message : String(e)} — including empty callers in version hash`);
          return { to: n.id, callers: [] };
        }
  ```

## src/hunter/graph/corbell-adapter.ts
- **src/hunter/graph/corbell-adapter.ts:118-123** (bug)
  **Process not killed on timeout, leaks after rejection.** When `timeoutMs` fires, the timer calls `proc.kill('SIGTERM')` inside a try/catch, but if SIGTERM doesn't terminate the process (e.g., the process traps SIGTERM), the child continues running indefinitely. The `settled` guard prevents the close/error handlers from calling `reject` again — but `proc` is never explicitly unref'd or escalated to SIGKILL. Additionally, stdout/stderr accumulate unbounded during the leaked process lifetime. Fix: add SIGKILL escalation after a short grace period (e.g., 5s), and consider unrefing the timer so it doesn't keep the event loop alive after rejection.
  ```existing
  timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { proc.kill('SIGTERM'); } catch { /* already exited */ }
        reject(new Error(`corbell graph build timed out after ${timeoutMs}ms (cwd: ${cwd}) — child SIGTERMed, no partial graph accepted`));
      }, timeoutMs);
  ```
  ```suggested
  timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { proc.kill('SIGTERM'); } catch { /* already exited */ }
        // Escalate to SIGKILL after 5 s grace if the child survives SIGTERM.
        const killTimer = setTimeout(() => {
          try { proc.kill('SIGKILL'); } catch { /* already exited */ }
        }, 5_000);
        killTimer.unref();
        rej
  ```

## src/hunter/harness/micro-loop-machine.ts
- **src/hunter/harness/micro-loop-machine.ts:0-0** (bug)
  The `done()` method creates two new actor subscriptions (`sub2`, `sub3`) every time it is called, even if a previous invocation is still pending resolution. The `settled` flag only prevents duplicate *resolution* — it does not prevent duplicate *subscription creation*. If `done()` is called twice before the actor terminates, four subscriptions are created, and `handleDisposables` accumulates stale entries. Each call should either reuse an existing pending promise or guard against re-subscription.
  ```existing
  done(): Promise<void> {
      return new Promise<void>((resolve): void => {
        if (actor.getSnapshot().status === 'done') { resolve(); return; }
        const snapStatus: unknown = (actor.getSnapshot() as { status?: unknown }).status;
        if (snapStatus === 'stopped' || snapStatus === 'error') { resolve(); return; }
        let settled = false;
        const sub2 = actor.subscribe((s): vo
  ```
  ```suggested
  private _pendingDone: Promise<void> | null = null;
    done(): Promise<void> {
      if (this._pendingDone) return this._pendingDone;
      this._pendingDone = new Promise<void>((resolve): void => {
        if (actor.getSnapshot().status === 'done') { resolve(); return; }
        const snapStatus: unknown = (actor.getSnapshot() as { status?: unknown }).status;
        if (snapStatus === 'stopped' 
  ```

## src/hunter/profile/loader.ts
- **src/hunter/profile/loader.ts:0-0** (bug)
  **Dead/unreachable tab detection — `raw.trim()` strips leading tabs, so the regex `/^\t/` on `trimmed` can never match.**

`raw.trim()` removes all leading whitespace including tabs. The resulting `trimmed` string will never start with a `\t` character, making the `/^\t/.test(trimmed)` check always `false`. This means tab-indented YAML is silently accepted instead of rejected — a direct violation of the stated fail-closed contract (the file header explicitly says "tabs are not allowed in indentation").

Fix: test against the raw line or the leading whitespace portion, e.g.:
```
const leadingWhitespace = raw.slice(0, raw.length - raw.trimStart().length);
if (/	/.test(leadingWhitespace)) yamlErr([], raw, i + 1, 'tabs are not allowed in indentation (the subset is space-indented)');
```
  ```existing
  const trimmed = raw.trim();
    if (trimmed === '') continue;
    if (/^	/.test(trimmed)) yamlErr([], trimmed, i + 1, 'tabs are not allowed in indentation (the subset is space-indented)');
  ```
  ```suggested
  const trimmed = raw.trim();
    if (trimmed === '') continue;
    const leadingWhitespace = raw.slice(0, raw.length - raw.trimStart().length);
    if (/	/.test(leadingWhitespace)) yamlErr([], raw.trim(), i + 1, 'tabs are not allowed in indentation (the subset is space-indented)');
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

## src/omp/adapters/abide.ts
- **src/omp/adapters/abide.ts:107-108** (security)
  `scopeRoot` is accepted but never referenced inside `abideProbe`. Every other adapter (c2kg, corbell, graphify, kev, semantica, tsg, ua) uses `scopeRoot` to scope file access to the workspace. Here the events path is resolved from the separate `abideRoot` param (or a hardcoded absolute default), completely bypassing the scope boundary that `scopeRoot` is meant to enforce. This means any caller that passes a confined `scopeRoot` gets no isolation — the adapter reads from an absolute path regardless. Either `scopeRoot` should be used to derive `abideRoot` (e.g., `path.join(scopeRoot, ABIDE_EVENTS_REL)`), or the parameter should be removed to make the omission explicit.
  ```existing
  export function abideProbe(scopeRoot: string, abideRoot?: string): ConsumerProbe {
  const eventsPath = abideEventsPath(abideRoot);
  ```
  ```suggested
  export function abideProbe(scopeRoot: string, abideRoot?: string): ConsumerProbe {
  const eventsPath = abideEventsPath(abideRoot ?? scopeRoot);
  ```
- **src/omp/adapters/abide.ts:38-40** (maintainability)
  Hardcoded absolute workspace path `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace` as the default. This is a user-specific, environment-specific path baked into production code. If the deployment environment changes or another user runs this, it silently resolves to a non-existent directory (or worse, a different agent's ledger). The default should come from an environment variable or be derived from `scopeRoot`.
  ```existing
  export function abideEventsPath(abideRoot?: string): string {
  return path.join(abideRoot ?? "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace", ABIDE_EVENTS_REL);
}
  ```
  ```suggested
  export function abideEventsPath(abideRoot?: string): string {
  const root = abideRoot ?? process.env.JARVIS_WORKSPACE ?? "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace";
  return path.join(root, ABIDE_EVENTS_REL);
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

## src/omp/jev.ts
- **src/omp/jev.ts:17-17** (bug)
  The `KEY_FILE` path uses `${process.env.HOME ?? "/home/leviathan"}` as a fallback. This is evaluated at module load time as a top-level `const`. If `process.env.HOME` is undefined, the hardcoded fallback `/home/leviathan` is a user-specific path that will be wrong on virtually every other machine. This means on systems without `HOME` set, the key file lookup silently targets a non-existent path rather than a conventional location. Consider using `os.homedir()` which handles this correctly, or throw if HOME is missing.
  ```existing
  export const KEY_FILE = `${process.env.HOME ?? "/home/leviathan"}/.config/typesafe/key`;
  ```
  ```suggested
  import * as os from "node:os";
// ...
export const KEY_FILE = `${os.homedir()}/.config/typesafe/key`;
  ```

## src/omp/rsi.ts
- **src/omp/rsi.ts:0-0** (bug)
  The `recount()` and `liveIncludingForgedRetirement()` calls in `supersede()` execute OUTSIDE the IMMEDIATE transaction. This creates a TOCTOU race: a concurrent `appendFiring` or `appendOutcome` can alter the evidence ledger between the recount and the `BEGIN IMMEDIATE`, causing the new row to be inserted with stale confirmed/refuted/unresolved counts and a potentially incorrect derived tier. The entire derivation — recount + live-read + tier derivation — should be performed INSIDE the transaction (after `BEGIN IMMEDIATE`) to guarantee a consistent snapshot. Note: `recount` and `liveIncludingForgedRetirement` do their own reads outside your transaction, so wrapping only the write portion is insufficient; you need to either move the reads inside or use `SAVEPOINT` with a single consistent read snapshot.
  ```existing
  supersede(canonicalId: string, run: string): ReflexRow | null {
    const counts = this.recount(canonicalId);
    const d = deriveTier(counts.confirmed, counts.refuted, counts.unresolved);
    const current = this.liveIncludingForgedRetirement(canonicalId);
    if (current !== null && current.kind === d.tier) return null; // no change
    // ATOMIC retire-then-insert...
  ```
