# HIGH slice 1 — 4 findings across 3 files

## src/hunter/harness/micro-loop-machine.ts
- **src/hunter/harness/micro-loop-machine.ts:480-484** (bug)
  **Bug (high): `pendingDone` is never reset after resolution.**

After `done()` resolves, `pendingDone` remains assigned to the resolved promise forever. A subsequent call to `done()` (e.g., by code that awaits one phase, inspects context, then awaits again) silently returns the stale resolved promise. If the caller has called `stop()` in between, the snapshot will be from the stopped/stale actor, not a fresh one. More critically, this means the done() promise can never be recycled for a new machine lifecycle.

**Fix:** Reset `pendingDone = null` inside `settle()` after calling `resolve()`.
  ```existing
  function settle(): void {
          if (settled) return;
          settled = true;
          pendingSettle = null;
          sub2.unsubscribe();
  ```
  ```suggested
  function settle(): void {
          if (settled) return;
          settled = true;
          pendingSettle = null;
          sub2.unsubscribe();
          for (let i = handleDisposables.length - 1; i >= 0; i--) {
            if (handleDisposables[i] === sub2) handleDisposables.splice(i, 1);
          }
          // Reset so a subsequent done() call re-subscribes rather than returning
          // 
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

## src/hydra/client-reader.ts
- **src/hydra/client-reader.ts:74-77** (bug)
  The `.unref?.()` call on the timeout promise (not the timer) in `attach()` and `disconnect()` is a no-op: `Promise` objects do not have an `unref` method — only `Timeout` objects from `setTimeout` do. The code `setTimeout(...).unref?.()` works because `setTimeout` returns a `Timeout` with `.unref()`. But the expression `new Promise(...).unref?.()` in the `attach()`/`disconnect()` race patterns is dead code — it silently does nothing. This is harmless but misleading. In `listTools` and `callTimer` paths the `.unref?.()` is correctly placed on the timer. In `attach`/`disconnect` the `.unref?.()` is placed on the Promise, not the timer, so the timer is never unref'd and stays referenced until it fires or is cleared. The timer is never cleared in `attach()`/`disconnect()` after a successful close, so the abandoned timer holds a reference on the event loop for up to 5 seconds. Fix by capturing the timer and calling `.unref()` on it, and clearing it after success.
  ```existing
  await Promise.race([
            old.close(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('TRANSPORT_CLOSE_TIMEOUT: close() exceeded 5000ms — releasing the reference anyway')), 5000).unref?.()),
          ]);
  ```
  ```suggested
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
          try {
            await Promise.race([
              old.close(),
              new Promise<void>((_, rej) => {
                closeTimer = setTimeout(() => rej(new Error('TRANSPORT_CLOSE_TIMEOUT: close() exceeded 5000ms — releasing the reference anyway')), 5000);
                closeTimer?.unref?.();
              }),
        
  ```
