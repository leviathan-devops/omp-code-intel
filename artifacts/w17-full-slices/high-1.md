# HIGH slice 1 — 7 findings across 6 files

## src/hunter/graph/graphify-adapter.ts
- **src/hunter/graph/graphify-adapter.ts:869-874** (bug)
  The same atomicity issue exists in both the async build and `buildSync` paths: if `reindex()` throws after `cachedNodes`/`cachedEdges`/`cachedRaw`/`lastGraphPath` are assigned but while `this.built` is `true`, the `finally` block clears `buildInFlight` but the adapter is left in a half-committed state with partially populated caches and `built = false` (or `true` in `buildSync`). A subsequent caller may see stale or partial caches. Move `this.built = true` after `this.reindex()` so that a reindex failure leaves the adapter in a clearly unusable (`built = false`) state with `buildInFlight` released, OR wrap `reindex()` in its own try/catch and re-throw after rolling back `cachedNodes`/`cachedEdges`. Apply this fix consistently to both code paths.
  ```existing
  this.cachedNodes = scopedNodes;
    this.cachedEdges = scopedEdges;
    this.cachedRaw = graph;
    this.lastGraphPath = graphPath;
    this.built = true;
    this.reindex();
  ```
  ```suggested
  this.cachedNodes = scopedNodes;
    this.cachedEdges = scopedEdges;
    this.cachedRaw = graph;
    this.lastGraphPath = graphPath;
    this.built = true;
    try {
      this.reindex();
    } catch (e) {
      this.built = false;
      throw e;
    }
  ```

## src/hunter/harness/hunt-lock.ts
- **src/hunter/harness/hunt-lock.ts:0-0** (bug)
  Bug / Race condition: When `existing` is null and `reread` is also null, stale-lock unlink proceeds without ownership verification.

Trace: `existing = readPayload(lockPath)` returns null → `stale` starts as false → mtime check sets `stale = true` → `reread = readPayload(lockPath)` returns null (still corrupted) → neither `if (existing)` (line 109) nor `else if (reread)` (line 116) matches → both are skipped → execution falls directly to `unlinkSync` on line 120.

In this path, the lock file is deleted purely based on mtime age, with zero ownership verification. A legitimate but temporarily corrupted lock (e.g., from a crash during JSON serialization of a still-live process) could be deleted if its mtime exceeds the TTL but the process is still running and about to finish. The TTL mitigates this, but it means a live hunt that was momentarily interrupted could lose its lock even though it's actively completing.

More practically: between the stat-based mtime read (line 98) and the unlink (line 120), a new process could acquire the lock with a valid wx write. Since both `existing` and `reread` are null, no ownership comparison occurs, and this fresh lock would be unconditionally deleted — the exact scenario the F-61 re-read was designed to prevent for the `existing !== null` branch.

Suggestion: When `reread` is null (lock content still unreadable), abort the stale recovery rather than unlinking — the TTL will eventually unblock the file even if the owner is truly dead.
  ```existing
  if (stale) {
      const reread = readPayload(lockPath);
      if (existing) {
        if (!reread || reread.pid !== existing.pid || reread.acquiredAt !== existing.acquiredAt || reread.hostname !== existing.hostname) {
          throw new Error(`HUNT_ALREADY_RUNNING: the lock at ${lockPath} changed during stale-recovery (a peer won the race) — retry the hunt.`);
        }
      } else if (reread) 
  ```
  ```suggested
  if (stale) {
      const reread = readPayload(lockPath);
      if (existing) {
        if (!reread || reread.pid !== existing.pid || reread.acquiredAt !== existing.acquiredAt || reread.hostname !== existing.hostname) {
          throw new Error(`HUNT_ALREADY_RUNNING: the lock at ${lockPath} changed during stale-recovery (a peer won the race) — retry the hunt.`);
        }
      } else if (reread) 
  ```

## src/hunter/harness/recon.ts
- **src/hunter/harness/recon.ts:42-43** (security)
  Symlink-based path escape and inconsistent containment guards: The containment guard in `countQuotedRules` resolves paths with `path.resolve` but does not call `fs.realpathSync` (or equivalent) to resolve symlinks. A symlink inside `profile.project.root` pointing to `/etc/passwd` (or any file outside the project) would pass the `abs.startsWith(root + sep)` check, allowing reading of arbitrary filesystem files. The same issue applies to the awareness-doc loop in `recon()` (line 67). Additionally, the two code paths differ in their containment patterns, increasing the risk of them drifting apart.

Consider extracting a shared `assertInsideProject(root: string, absPath: string)` helper that resolves symlinks before checking, ensuring both code paths apply identical containment logic:
```
function assertInsideProject(root: string, absPath: string) {
  const real = fs.realpathSync(absPath);
  if (!real.startsWith(root + path.sep) && real !== root) {
    throw new Error(`CORPUS_UNREADABLE: path=${absPath} escapes project root ${root} — resolve corpus paths inside the project`);
  }
}
```
  ```existing
  if (!abs.startsWith(profile.project.root + path.sep) && abs !== profile.project.root) {
      throw new Error(`CORPUS_UNREADABLE: path=${abs} escapes project root ${profile.project.root} — resolve corpus paths inside the project`);
  ```
  ```suggested
  const real = fs.realpathSync(abs);
    if (!real.startsWith(profile.project.root + path.sep) && real !== profile.project.root) {
      throw new Error(`CORPUS_UNREADABLE: path=${abs} (real: ${real}) escapes project root ${profile.project.root} — resolve corpus paths inside the project`);
  ```
- **src/hunter/harness/recon.ts:143-147** (bug)
  Corrupt-payload salvage logic may adopt a spurious sequence number. The salvage (lines 113-116) searches for the `prefix` string anywhere in the raw text (`indexOf`), then extracts digits immediately following it. If the prefix token coincidentally appears in non-runId text within a corrupt payload (e.g., in a stack trace, log snippet, or nested JSON string), the extracted digits would be a stale or unrelated number, inflating `seq` and risking a runId collision. Consider salvaging only when the prefix appears at the start of the raw text (or after a known JSON key boundary like `"runId":"`), or at minimum limit the salvage regex to match the full payload structure more strictly.
  ```existing
  const idx = rawText.indexOf(prefix);
        if (idx !== -1) {
          const dm = /^\d+/.exec(rawText.slice(idx + prefix.length));
          if (dm) seq = Math.max(seq, Number(dm[0]!));
        }
  ```
  ```suggested
  // Salvage only when prefix appears as a JSON string value for "runId"
        const keyPattern = `"runId"\s*:\s*"${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\$&')}`;
        const idx = rawText.indexOf(keyPattern);
        if (idx !== -1) {
          const start = idx + keyPattern.length;
          const dm = /^\d+/.exec(rawText.slice(start));
          if (dm) seq = Math.max(seq, Number(dm[0]!));
 
  ```

## src/hunter/tools/bug-hunt.ts
- **src/hunter/tools/bug-hunt.ts:80-86** (security)
  When no `scopeRoot` is provided and `realpathSync(absTarget)` fails, `scopeReal` is silently set to `null`, which causes `inScope()` to return `true` for ALL paths. This completely disables scope containment for both the target (the `if (scopeReal !== null)` guard at line 104 is skipped) and the profile (guard at line 139 skipped). The profile could then point to any path on the filesystem (e.g. `/etc/passwd`).

Compare with the `scopeRoot`-provided path (line 77-79), which correctly returns INCONCLUSIVE on `realpathSync` failure — a fail-closed behavior. The `else` branch is inconsistent with this contract.

The practical scenario is narrow (`statSync` succeeds but `realpathSync` fails, possible with execute-only directory permissions), but the defensive-intent gap is real: the comment at line 72 explicitly states "scopeRoot omitted no longer disables containment", yet this code path does exactly that. Recommendation: return `inconclusive(...)` in the `else` catch block to fail-closed, matching the pattern used for the `scopeRoot`-provided path.
  ```existing
  } else {
    try {
      scopeReal = fsDyn.realpathSync(absTarget);
    } catch {
      scopeReal = null;
    }
  }
  ```
  ```suggested
  } else {
    try {
      scopeReal = fsDyn.realpathSync(absTarget);
    } catch {
      return inconclusive(`HUNT_SCOPE_INVALID: targetPath=${args.targetPath} cannot resolve for scope check (realpath failed — the validated absolute target is its own containment root, and without a realpath the boundary cannot be enforced)`);
    }
  }
  ```

## src/omp/adapters/semantica.ts
- **src/omp/adapters/semantica.ts:32-37** (bug)
  The catch blocks in `canonRoot()` (both at construction-time and USE-time) silently swallow ALL errors from `fs.realpathSync`, not just ENOENT. This conflates benign 'path does not exist yet' cases with genuine resolution failures like ELOOP (infinite symlink loop), EACCES (permission denied), or EIO (I/O error). An ELOOP would silently fall back to the unresolved path, defeating the symlink-escape protection provided by `needsRealpathCheck` (F-356/F-706). The catches should discriminate: if the error code is ENOENT/ENOENT-like, keep the deferred-realpath behavior; otherwise, throw or log the error for diagnosability.
  ```existing
  try {
    resolvedRoot = fs.realpathSync(path.resolve(scopeRoot));
  } catch {
    resolvedRoot = path.resolve(scopeRoot);
    needsRealpathCheck = true;
  }
  ```
  ```suggested
  try {
    resolvedRoot = fs.realpathSync(path.resolve(scopeRoot));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== undefined && code !== "ENOENT") {
      // Non-absent failure (ELOOP, EACCES, etc.) — resolve eagerly so the
      // probe surfaces the real problem instead of silently falling through.
      throw new Error(`GI_LAYER_SEMANTICA: realpathSync f
  ```

## src/omp/hard-deps.ts
- **src/omp/hard-deps.ts:389-390** (bug)
  Hardcoded fallback path `/home/leviathan` persists in hard-deps.ts at lines 373, 390, and 397 (for ABIDE and RSI_STORE). This contradicts the F-343 fix in jev.ts which replaced hardcoded paths with `os.homedir()` to avoid silent wrong paths and ensure loud failures. Use `os.homedir()` or require these paths in `RegisterConfig`.
  ```existing
  pathComponent("ABIDE", "kernel", "the Abide source — the ALU (repair, never block)", "GI_ENFORCE_ABIDE",
      cfg.abideRoot ?? "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/JARVIS/reports/handovers/JEV_ABIDE_CONTEXT_HANDOVER"),
  ```
  ```suggested
  pathComponent("ABIDE", "kernel", "the Abide source — the ALU (repair, never block)", "GI_ENFORCE_ABIDE",
      cfg.abideRoot ?? `${os.homedir()}/JARVIS_WORKSPACE/Shared_Workspace/JARVIS/reports/handovers/JEV_ABIDE_CONTEXT_HANDOVER`),
  ```
