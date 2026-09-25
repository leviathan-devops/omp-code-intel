# HIGH slice 5 — 10 findings across 9 files

## src/hunter/graph/merge.ts
- **src/hunter/graph/merge.ts:191-194** (bug)
  **Inconsistent `subjectKind`/`objectKind` inheritance in contradiction path.**

In the exact-match path (mechExact), semantic values inherit from anchor when undefined:
```
subjectKind: s.subjectKind ?? anchor.subjectKind,
objectKind: s.objectKind ?? anchor.objectKind,
```
But in the contradiction semantic-row push (lines ~153-154), the fallback is missing:
```
subjectKind: s.subjectKind,
objectKind: s.objectKind,
```
If the semantic triple lacks `subjectKind` or `objectKind`, this row will have `undefined` in those fields, while the exact-match path would have used the anchor's values. This is likely a bug introduced when the contradiction path was added/modified.

Suggestion: apply the same `?? anchor.subjectKind` / `?? anchor.objectKind` fallback pattern used in the exact-match branch.
  ```existing
  subjectKind: s.subjectKind,
        objectKind: s.objectKind,
        source: 'semantic',
        conflict: true,
  ```
  ```suggested
  subjectKind: s.subjectKind ?? anchor.subjectKind,
        objectKind: s.objectKind ?? anchor.objectKind,
        source: 'semantic',
        conflict: true,
  ```

## src/hunter/harness/scan.ts
- **src/hunter/harness/scan.ts:49-51** (security)
  `requireContained` (imported from `containment.ts`) returns the resolved `real` path but its `contained` check does NOT verify the `resolved` flag. When `resolved` is false (the path couldn't be followed through symlinks), the returned path is the unresolved spelling — which passed `insideRoot` on string prefix alone, the exact vulnerability class F-440 was written to fix.

The `checkContained` function (containment.ts:106) explicitly tracks `resolved` for this reason (see F-602 fix comment at containment.ts:91-97). `requireContained` at containment.ts:137 discards it by only destructuring `contained`. This means a corpus entry like `<root>/link -> /etc/passwd` where `link` doesn't exist yet (so `realNearest` can't follow the symlink) would return the unresolved `<root>/link` spelling, which passes the prefix test while the eventual file read follows the symlink out of the tree.

Since this file's `resolveCorpusPaths` is the primary call site that was patched for symlink-awareness (F-440), the fix is incomplete without also checking the `resolved` flag. Consider adding `&&` the resolved check in the onViolation callback, or using `checkContained` directly instead of `requireContained` so you can inspect `resolved`.
  ```existing
  return requireContained(abs, root, (ev) => {
      throw new Error(`HUNT_INVALID_CORPUS: entry=${entry} resolves outside the project root (root=${ev.rootReal} real=${ev.real}) — corpus entries must stay under the root.`);
    });
  ```
  ```suggested
  const { real, rootReal, contained, resolved } = checkContained(abs, root);
    if (!contained) {
      throw new Error(`HUNT_INVALID_CORPUS: entry=${entry} resolves outside the project root (root=${rootReal} real=${real}) — corpus entries must stay under the root.`);
    }
    if (!resolved) {
      console.warn(`[scan] HUNT_INVALID_CORPUS WARNING: entry=${entry} could not be resolved through syml
  ```

## src/hunter/lexicon/templates.ts
- **src/hunter/lexicon/templates.ts:239-245** (bug)
  `bindRange` performs `Array.isArray` but does NOT verify that the array has exactly 2 elements nor that both elements are numbers before casting to `[number, number]`. A bindings object with `range: ["a", "b"]` or `range: [1, 2, 3]` passes this guard. Downstream in `provenance.quoted-not-synthesized`, the range is passed directly to `ctx.source.read(file, range)` — non-numeric values or a 3-element tuple would propagate silently, potentially causing runtime errors or silent misreads at the source-read boundary. Add element-type and length validation mirroring `bindStages` / `bindStringArray` patterns.
  ```existing
  function bindRange(bindings: Record<string, unknown>): [number, number] | undefined {
  const v = bindings['range'];
  if (Array.isArray(v)) {
    return v as [number, number];
  }
  return undefined;
}
  ```
  ```suggested
  function bindRange(bindings: Record<string, unknown>): [number, number] | undefined {
  const v = bindings['range'];
  if (
    Array.isArray(v) && v.length === 2 &&
    typeof v[0] === 'number' && typeof v[1] === 'number'
  ) {
    return [v[0], v[1]];
  }
  return undefined;
}
  ```

## src/hydra/client-reader.ts
- **src/hydra/client-reader.ts:99-102** (bug)
  The `Promise.race` timeout pattern in `listTools()`, `callTool()`, `attach()`, and `disconnect()` produces unhandled promise rejections. When the actual transport operation (e.g., `t.listTools()`, `t.callTool()`, `old.close()`, `this.transport.close()`) settles **before** the 5000ms timeout, the timeout promise later rejects with a `*_TIMEOUT` error. Since no `.catch()` handler is attached to the losing side of the race, this becomes an **unhandled rejection**. In Node.js 15+ (where unhandled rejections crash the process by default), this can bring down the entire process even though the original operation succeeded.

Suggested fix: add `.catch(() => {})` to the timeout promise to suppress the rejection once the race is already won, or track and await the losing promise in a non-blocking way.
  ```existing
  return await Promise.race([
        t.listTools(),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('GRAPHIFY_LIST_TIMEOUT: listTools() exceeded 5000ms')), 5000).unref?.()),
      ]);
  ```
  ```suggested
  const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error('GRAPHIFY_LIST_TIMEOUT: listTools() exceeded 5000ms')), 5000).unref?.(),
      );
      return await Promise.race([t.listTools(), timeout]).finally(() => {
        // Suppress the unhandled rejection from the losing side of the race.
        timeout.catch(() => {});
      });
  ```

## src/kernel/scan-chain.ts
- **src/kernel/scan-chain.ts:51-69** (performance)
  The same auth file `~/.local/share/opencode/auth.json` is read synchronously in both `getOpenRouterKey()` (line 48) and `getNvidiaKey()` (line 58). In `runScanChain`, these are called sequentially during the retry loop, so the file is read twice (and up to 12 times total with 5 retries × 2 providers). Beyond the duplicate I/O, both use `readFileSync` which **blocks the Node.js event loop**. Under backoff pressure with sequential chain traversal, this can stall the entire process. Consider: (1) caching the parsed auth object at module scope or at chain-build time; (2) using async `fs.promises.readFile` instead.
  ```existing
  function getOpenRouterKey(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const auth = JSON.parse(require('fs').readFileSync(
      require('os').homedir() + '/.local/share/opencode/auth.json', 'utf8'
    ));
    return auth.openrouter?.key ?? '';
  } catch { return ''; }
}

function getNvidiaKey(): string {
  try {
    // eslint-disable-next-line @typesc
  ```

## src/omp/extension.ts
- **src/omp/extension.ts:213-214** (bug)
  **TOCTOU: `confineTargetPath` returns stale `real` instead of verified `realAfter`**. The function re-resolves `normalized` into `realAfter` (line 202-203) and verifies it is stable and still a directory (lines 204-211). But line 213 returns `{ ok: true, real }` — the FIRST resolution — not `realAfter`. If the path was swapped between the first `realpathSync` and the re-check, the stability check catches the change and denies it. However, if a swap happens between the stability check (line 204) and the caller's subsequent file open (which happens AFTER the function returns), the caller still receives the first-resolved `real`, not the freshly-verified `realAfter`. Since `realAfter` was confirmed stable at the check moment, it is the safer handle to return. Returning `real` means the caller operates on a path that was verified N syscalls ago rather than the path verified at the final check.

Additionally, `realAfter` is `string | null` but `realAfter.slice()` is called on line 211 without a null check — this will throw a runtime TypeError if the second `realpathSync` fails (though `realAfter` is checked for null in the conditional, `realAfter.slice` in the template literal would throw before the function returns the error string if `stAfter` check passes but `realAfter` was somehow null — this path is actually safe because if `realAfter` is null the function returns the deny on line 204, but the type annotation is misleading).
  ```existing
  return { ok: true, real };
};
  ```
  ```suggested
  return { ok: true, real: realAfter ?? real };
  ```

## src/omp/fire-ledger.ts
- **src/omp/fire-ledger.ts:340-341** (bug)
  BUG: Duplicated error-normalization logic causes double `GI_LEDGER_` prefix on persisted failure codes in multiple locations (e.g., `appendManyDetailed`'s fallback and `withLedger`'s catch block). This results in `lastPersist.code` having `GI_LEDGER_GI_LEDGER_...` pattern. The fix is to extract a shared normalization helper that converts errors to a normalized `{ code, message }` record, ensuring the prefix is applied exactly once.
  ```existing
  const bare45 = err.code.startsWith("GI_LEDGER_") ? err.code.slice("GI_LEDGER_".length) : err.code;
          this.notePersistFailure(`GI_LEDGER_${bare45}`, err.message);
  ```
  ```suggested
  // Note: err.code already carries the GI_LEDGER_ prefix from LedgerError.
          // notePersistFailure stores the code as-is; consumers see the same code
          // the LedgerError carried — no double-wrapping.
          this.notePersistFailure(err.code, err.message);
  ```
- **src/omp/fire-ledger.ts:579-580** (bug)
  BUG: `path.resolve(ledger.path)` depends on `process.cwd()` at call time, not at ledger-open time. If the CWD changes between drain calls (e.g. the gate opens a ledger with a relative path `./data/decisions.db`, a drain runs, then a `chdir()` occurs, then another drain runs), `path.resolve` produces a different absolute key. The module-level `drained` WeakSet and `poisoned` Set would have two entries for the same physical file. The second drain would not find any rows in the 'new' WeakSet, re-read all gate rows, and write them all again — silently breaking the exactly-once guarantee. The fix: resolve the path in the constructor and store it as an instance field, then use that resolved path as the key in both maps.
  ```existing
  export function drain(gate: FireGate, ledger: FireLedger): number {
  const key = path.resolve(ledger.path);
  ```
  ```suggested
  export function drain(gate: FireGate, ledger: FireLedger): number {
  // Use the ledger's own resolved path, set at construction time,
  // so CWD changes between drain calls do not create duplicate keys.
  const key = path.resolve(ledger.path);
  // (Alternatively, store the resolved path in the FireLedger constructor
  // and expose it as `ledger.resolvedPath`.)
  ```

## src/omp/populate.ts
- **src/omp/populate.ts:118-120** (bug)
  **Scope default contradicts H05 comment**: The comment says 'the probe walks the CALLER's scope when provided — never a blind ["src"] default', but `populateSessionStore` (the sole public caller that selects the graphify path) never passes `scope` to `populateGraphifySessionStore`. Therefore the freshness check ALWAYS probes `["src"]` regardless of actual project layout. Either: (a) thread the real scope through from the caller, or (b) update the comment to honestly state that the session bridge path uses the `["src"]` default. As-is the comment is misleading and the behavior silently assumes all projects index from `src/`.
  ```existing
  // H05 (qwen 33d64eca): the probe walks the CALLER's scope when provided
  // (session bridge path) — never a blind ["src"] default.
  const freshness = isGraphifyCheckoutFreshFor(resolvedRoot, graphPath, scope ?? ["src"]);
  ```
  ```suggested
  // NOTE: session bridge caller never passes scope — the freshness check
  // currently defaults to ["src"]. If a non-src project layout needs coverage,
  // scope must be threaded through from populateSessionStore's opts.
  const freshness = isGraphifyCheckoutFreshFor(resolvedRoot, graphPath, scope ?? ["src"]);
  ```

## src/scoping/scoped-store.ts
- **src/scoping/scoped-store.ts:63-68** (bug)
  Both PRAGMA statements are in the same try block. If `PRAGMA journal_mode = WAL;` throws, `PRAGMA busy_timeout = 5000;` is never executed, leaving the default busy_timeout of 0. This means any subsequent busy/locked SQLite operation will fail immediately instead of waiting 5 seconds, undermining the entire retry mechanism. Each pragma should have its own try-catch so busy_timeout is always set.
  ```existing
  try {
    fresh.exec('PRAGMA journal_mode = WAL;');
    fresh.exec('PRAGMA busy_timeout = 5000;');
  } catch (walErr) {
    console.error(`[scoped-store${opts?.id ? ' ' + opts.id : ''}] WAL mode FAILED — falling back to rollback journal (race-condition protection DEGRADED):`, walErr instanceof Error ? walErr.message : String(walErr));
  }
  ```
  ```suggested
  try {
    fresh.exec('PRAGMA journal_mode = WAL;');
  } catch (walErr) {
    console.error(`[scoped-store${opts?.id ? ' ' + opts.id : ''}] WAL mode FAILED — falling back to rollback journal (race-condition protection DEGRADED):`, walErr instanceof Error ? walErr.message : String(walErr));
  }
  try {
    fresh.exec('PRAGMA busy_timeout = 5000;');
  } catch (btErr) {
    console.error(`[scoped-stor
  ```
