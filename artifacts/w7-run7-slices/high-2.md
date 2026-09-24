# HIGH slice 2 — 9 findings across 8 files

## src/hunter/firewall/artifact-scope.ts
- **src/hunter/firewall/artifact-scope.ts:163-167** (security)
  Security: When `masterReal` is not null (the master dir exists), the code verifies that `parentReal` is inside `masterReal`, but it never verifies that `masterReal` itself is inside `projectRootReal`. If `MASTER_CONTEXT` (or any variant) exists as a symlink pointing outside the project root (e.g., `/project/MASTER_CONTEXT → /tmp/evil`), then `masterReal` resolves to `/tmp/evil`, `parentReal` resolves through the same symlink to `/tmp/evil/`, and the containment check passes. The caller then writes the report to `/tmp/evil/bug_hunter_report_v<N>.md`, escaping the project boundary entirely. A defending check should verify `masterReal` is within `projectRootReal` before trusting it as the containment boundary.
  ```existing
  if (masterReal !== null) {
    if (parentReal !== masterReal && !parentReal.startsWith(masterReal + path.sep)) {
      return blocked('REPORT_SCOPE_BLOCKED', base, input.target);
    }
  } else {
  ```
  ```suggested
  if (masterReal !== null) {
    // F-NEW: verify the resolved master dir itself is inside the project root —
    // a variant symlink (e.g. MASTER_CONTEXT -> /tmp) would otherwise let writes
    // escape the project boundary.
    if (masterReal !== projectRootReal && !masterReal.startsWith(projectRootReal + path.sep)) {
      console.warn(`[artifact-scope] master realpath escapes project root (mas
  ```

## src/hunter/graph/corbell-adapter.ts
- **src/hunter/graph/corbell-adapter.ts:0-0** (security)
  Shell injection risk in exported defaultExec: This function passes cmdRaw directly to execSync (which invokes /bin/sh -c) with zero sanitization. While internal callers construct commands from resolveCorbell()-validated paths, the function itself is a public export. Any external caller or future internal caller passing user-influenced input enables shell metacharacter injection. Since resolveCorbell already validates paths, consider adding a guard here as defense-in-depth, or remove the export so only guarded internal call-sites can use it.
  ```existing
  export const defaultExec: ExecFn = (cmdRaw, opts) => {
  const cmd = 'exec ' + cmdRaw;
  const ATTEMPTS = 8;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      return execSync(cmd, {
  ```
  ```suggested
  export const defaultExec: ExecFn = (cmdRaw, opts) => {
  if (/[;&|`$(){}!<>\n]/.test(cmdRaw)) {
    throw new Error(`CORBELL_EXEC_UNSAFE: command contains shell metacharacters: ${cmdRaw.slice(0, 120)}`);
  }
  const cmd = 'exec ' + cmdRaw;
  ```
- **src/hunter/graph/corbell-adapter.ts:135-135** (bug)
  Async timeout SIGKILL is fire-and-forget: When the timeout fires, the Promise is rejected immediately and the 5-second SIGKILL fallback runs on an unref'd timer. If SIGTERM does not terminate the child, the SIGKILL is never awaited and the child process can outlive the caller. Consider waiting for proc.on('exit') before settling the rejection, so the caller is not left with an orphaned process.
  ```existing
  reject(new Error(`corbell graph build timed out after ${timeoutMs}ms (cwd: ${cwd}) — child SIGTERMed (SIGKILL in 5s), no partial graph accepted`));
  ```
  ```suggested
  proc.on('exit', () => {
          done(() => reject(new Error(`corbell graph build timed out after ${timeoutMs}ms (cwd: ${cwd}) — child killed, no partial graph accepted`)));
        });
  ```

## src/hunter/graph/store-map.ts
- **src/hunter/graph/store-map.ts:194-195** (bug)
  If the same `runTag` is passed on a re-run (or the generated `Date.now()` tag collides with a previous run), the supersede UPDATE `WHERE superseded_run IS NULL` becomes a no-op: the previous successful insert already left all rows with `superseded_run = <this runTag>` (not NULL). The subsequent INSERT then adds duplicate live rows alongside the original ones from that same run, corrupting the store. Consider either: (a) generating a new unique runTag and using a different mechanism to supersede, or (b) explicitly superseding rows with the same runTag too: `UPDATE ... SET superseded_run = ?1 WHERE superseded_run IS NULL OR superseded_run = ?1`.
  ```existing
  db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
      db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
  ```

## src/hunter/profile/loader.ts
- **src/hunter/profile/loader.ts:503-503** (bug)
  The JSDoc on `loadProfile` (line 436) states "The frozen ProjectProfile is returned on success" but the function returns `result.data` (line 503/549) without calling `Object.freeze`. Downstream code relying on the freeze contract for immutability (e.g., preventing accidental profile mutation) will silently break. Either add `return Object.freeze(profile as ProjectProfile)` or correct the docstring.
  ```existing
  const profile = result.data;
  ```

## src/hydra/templates/mpse.ts
- **src/hydra/templates/mpse.ts:151-160** (bug)
  Missing `filterTags` on `mpseProvenanceTemplate`. All other three MPSE templates (R24 contract, R25 oracle, R26 stage) define `filterTags` arrays, but R27 provenance omits it entirely. While `filterTags` is typed as optional in `AuditorTemplate` (types.ts line 51), downstream filtering logic that iterates `MPSE_TEMPLATES` and reads `.filterTags` will silently get `undefined` for this template, causing it to be skipped or mishandled by tag-based filtering. This is almost certainly a copy-paste omission.
  ```existing
  export const mpseProvenanceTemplate: AuditorTemplate = {
  layerId: "R27-mpse-provenance",
  anchorPredicate: "provenance",
  layerNumber: 27,
  graphQueries: [
    "path spec clause reference to code implementation",
    "find unreachable spec declarations",
  ],
  // ★ F-213 FIX (2026-09-24): direct assignment (see contract — same F-160 precedent).
  outputSchema: MpseProvenanceOutputSchema,
  ```
  ```suggested
  export const mpseProvenanceTemplate: AuditorTemplate = {
  layerId: "R27-mpse-provenance",
  anchorPredicate: "provenance",
  layerNumber: 27,
  graphQueries: [
    "path spec clause reference to code implementation",
    "find unreachable spec declarations",
  ],
  filterTags: ["trace-gap", "unreachable", "provenance"],
  outputSchema: MpseProvenanceOutputSchema,
  ```

## src/omp/adapters/c2kg.ts
- **src/omp/adapters/c2kg.ts:0-0** (bug)
  Untrusted JSON field `s.name` is not type-validated. If the index file contains a symbol entry where `name` is a number (valid JSON), the nullish coalescing `s.name ?? ''` will not trigger (number is not nullish), and `Number.prototype.includes` does not exist — this throws a TypeError at runtime, bypassing the GI_LAYER_C2KG contract. The F-346 fix addressed `idx.symbols` not being an array, but individual item fields need the same defensive treatment since this is runtime-untrusted JSON. Use `String(s.name ?? '')` to coerce safely.
  ```existing
  const symbols = Array.isArray(idx.symbols) ? idx.symbols : [];
      const hits = symbols.filter((s) => (s.name ?? '').includes(subject));
  ```
  ```suggested
  const symbols = Array.isArray(idx.symbols) ? idx.symbols : [];
      const hits = symbols.filter((s) => String(s.name ?? '').includes(subject));
  ```

## src/omp/graph-gate.ts
- **src/omp/graph-gate.ts:303-311** (bug)
  `saveGateState` finally block calls `db.close()` without try/catch — if `db.run()` throws (e.g., disk full) and then `db.close()` also throws (possible when the DB is in a bad state), the close exception replaces the original write error, masking the root cause. Compare with `loadGateState` which correctly wraps `db?.close()` in try/catch. Additionally, unlike `loadGateState`, there is no error logging here — a silent failure leaves the caller unaware that state was not persisted.
  ```existing
  const db = openSessionDb(storePath);
  try {
    db.run(
      "INSERT INTO graph_gate_state (session_id, drift, state, edits_json, queries_json, updated_ms) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET drift = excluded.drift, state = excluded.state, edits_json = excluded.edits_json, queries_json = excluded.queries_json, updated_ms = excluded.updated_ms",
      [sessionId, state
  ```
  ```suggested
  const db = openSessionDb(storePath);
  try {
    db.run(
      "INSERT INTO graph_gate_state (session_id, drift, state, edits_json, queries_json, updated_ms) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET drift = excluded.drift, state = excluded.state, edits_json = excluded.edits_json, queries_json = excluded.queries_json, updated_ms = excluded.updated_ms",
      [sessionId, state
  ```

## src/scoping/db-path.ts
- **src/scoping/db-path.ts:54-56** (bug)
  Using `startsWith('/')` to detect absolute paths is not cross-platform safe. On Windows, absolute paths start with a drive letter (e.g., `C:\Users\...`), so this check would incorrectly treat a Windows absolute path as relative and incorrectly join it with `os.tmpdir()`. Use `path.isAbsolute()` instead, which correctly handles all platforms.
  ```existing
  return spec.testFile.startsWith('/')
        ? spec.testFile
        : path.join(os.tmpdir(), spec.testFile);
  ```
  ```suggested
  return path.isAbsolute(spec.testFile)
        ? spec.testFile
        : path.join(os.tmpdir(), spec.testFile);
  ```
