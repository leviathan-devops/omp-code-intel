# HIGH slice 4 — 2 findings across 2 files

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
