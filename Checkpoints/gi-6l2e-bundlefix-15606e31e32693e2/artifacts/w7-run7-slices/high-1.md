# HIGH slice 1 — 13 findings across 11 files

## src/hunter/diagnostics/engine.ts
- **src/hunter/diagnostics/engine.ts:769-775** (bug)
  Race condition in stale lock recovery: After unlinking a stale lock and re-creating it (lines 633-635), there is no guarantee that the original lock holder has finished persisting. Process A holds the lock, starts writing. Process B times out, calls `readStoredGraph` (returns null because A isn't done), then does `fs.unlinkSync(lockPath)` on A's lock, creates a new one, and proceeds to build+write — now both A and B believe they hold the lock and write to shared.db concurrently, corrupting the database. The `unlinkSync` + `writeFileSync` pair is not atomic, and there is no coordination mechanism (e.g., polling for DB non-emptiness, advisory lock with retry) to ensure the previous holder finished.
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
      // Poll for DB non-emptiness (the winner persisting) before unlinking.
      const deadline = Date.now() + 5_000;
      while (Date.now() < deadline) {
        const raced = readStoredGraph(dbPath);
        if (raced !== null && raced.nodes.length > 0) {
          rows = raced;

  ```

## src/hunter/firewall/readonly.ts
- **src/hunter/firewall/readonly.ts:134-137** (bug)
  **Bug: `scanMetacharacters` non-exempt path falsely blocks safe quoted arguments for READ verbs.**

The non-exempt branch (lines 124-127) scans the FULL command string against `BYPASS_METACHARACTERS`, which includes single quotes (`'`), double quotes (`"`), and parentheses `(`, `)`. For any READ-verb command with a quoted argument, the quote character is flagged as a metacharacter and the command is BLOCKED.

Trace for `grep 'error' log.txt`:
1. `parseCommand` → firstToken=`grep`, secondToken=`'error'`
2. `scanMetacharacters` → `grep` is NOT in `blockVerbExemption` (not EXECUTION/MUTATION/ECHO) → enters the non-exempt path
3. Non-exempt scan finds `'` in the command string → returns `'` (the quote character)
4. `classify` → `parsed.metacharacter !== null` → BLOCKED as `BASH_BYPASS`

This means **virtually all READ commands with quoted arguments are incorrectly blocked**. Commands like `grep 'pattern' file`, `head -n 5 'file with spaces.txt'`, `cat 'path/to/file'`, `diff 'old.txt' 'new.txt'`, `find . -name '*.ts'` are all rejected.

The blockVerbExemption (line 109) should be expanded to also cover the READ_VERBS family, treating quotes, parentheses, and other shell argument syntax as non-dangerous when the verb is a known read-only command. For READ verbs, the dangerous characters to still check are the command-chaining ones (`|`, `;`, `&`, `>`, `<`, `
`, `$`, `` ` ``) — not the argument-syntax ones (`'`, `"`, `(`, `)`, etc.).
  ```existing
  for (const ch of command) {
    if (BYPASS_METACHARACTERS.has(ch)) return ch;
  }
  return null;
  ```
  ```suggested
  // READ verbs + unknown verbs: the full scan still applies, but we exclude
  // argument-syntax characters that are safe when the verb itself cannot execute code.
  // Command-chaining chars (| ; & > < \n $ `) are still blocked; quotes, parens,
  // braces, etc. are allowed as argument syntax for the read-only verb set.
  for (const ch of command) {
    if (ch === '|' || ch === ';' || ch === '&' |
  ```
- **src/hunter/firewall/readonly.ts:224-227** (bug)
  **Dead code / misleading constant: `ECHO_VERB` and the unreachable check at line 199.**

`ECHO_VERB` (line 75) serves no functional purpose and creates dead code:

1. **Line 109:** `ECHO_VERB` is added to `blockVerbExemption`, but `echo` is already in `EXECUTION_VERBS`, so this is redundant — `EXECUTION_VERBS.has(firstToken)` at line 190 already handles it.
2. **Line 199:** `if (firstToken === ECHO_VERB)` is unreachable because line 190 (`EXECUTION_VERBS.has(firstToken)`) returns `blocked('BASH_EXECUTION', ...)` for `echo` before this check is ever reached.

If `echo` is intended to be **BLOCKED** as an execution verb, the dead code at line 199 should be removed. If it's intended to be **ALLOWED** as a no-op (per the F-48 fix comment's intent), `echo` should be removed from `EXECUTION_VERBS` and `ECHO_VERB` kept for the line 199 path. Either way, the current code is contradictory — the comment says "BARE-ECHO NO-OP" but the path is never executed.
  ```existing
  // THE BARE-ECHO NO-OP EDGE CASE (§7.2:3170) — zero metachars already proven by the BYPASS pass.
  if (firstToken === ECHO_VERB) {
    return allowed('BASH_READ', firstToken, command);
  }
  ```
  ```suggested
  // If echo should be ALLOWED (no-op): remove 'echo' from EXECUTION_VERBS and keep this check.
// If echo should be BLOCKED: remove this dead-code block entirely.
// Current state: echo is in EXECUTION_VERBS, so this block is unreachable.
  ```

## src/hunter/graph/interface.ts
- **src/hunter/graph/interface.ts:51-51** (bug)
  The `Substrate` type includes `'ix'`, but `selectAdapter` throws a REMOVED error for it at runtime. This means TypeScript won't catch `ix` usage at compile time — callers can construct values of type `Substrate` with `'ix'` and pass them around freely, only to hit a runtime throw. The `'ix'` value should be removed from the `Substrate` type to get compile-time enforcement of the removal. Additionally, the profile schema at `src/hunter/profile/schema.ts:44` still lists `'ix'` in `z.enum(['corbell', 'ix', 'graphify'])`, so a profile with `substrate: 'ix'` passes validation, reaches `selectAdapter`, and then throws — a confusing runtime failure that should be caught at validation time instead.
  ```existing
  export type Substrate = 'corbell' | 'ix' | 'graphify';
  ```
  ```suggested
  export type Substrate = 'corbell' | 'graphify';

// And update the profile schema enum accordingly:
// substrate: z.enum(['corbell', 'graphify'])
  ```

## src/hunter/harness/hunt-lock.ts
- **src/hunter/harness/hunt-lock.ts:99-120** (bug)
  The F-61 reread-before-unlink mitigation is incomplete and leaves a TOCTOU race window. Two concurrent processes can both pass the reread check (lines 99-106), then both proceed to unlink (line 111). The sequence is:

1. Process A and B both read the same stale payload → `existing` is identical.
2. Both compute `stale = true`.
3. A rereads → still sees the old payload (B hasn't modified it yet).
4. B rereads → still sees the old payload (A hasn't modified it yet).
5. Both pass the reread ownership check (reread matches existing).
6. A unlinks → succeeds.
7. A writes with 'wx' → succeeds (A's fresh lock now on disk).
8. B unlinks → succeeds (deletes A's fresh lock!).
9. B writes with 'wx' → succeeds.
10. Both A and B believe they hold the lock — mutual exclusion is violated.

The ENOENT catch (line 116) only handles the case where the file was already removed, not the case where it was removed AND replaced with a new lock. To close this gap, the unlink should be followed by a post-unlink verification (e.g., re-read the file and confirm it no longer exists before proceeding to wx write, or use a compare-and-swap mechanism on the file content).
  ```existing
  const reread = readPayload(lockPath);
      if (existing) {
        // ★ F-342 FIX (2026-09-24): the race re-read must compare the FULL ownership
        //   triple — a cross-host lock with colliding pid+stamp but a different
        //   hostname is a DIFFERENT owner; unlinking it would delete a live peer's lock.
        if (!reread || reread.pid !== existing.pid || reread.acquiredAt !== existin
  ```
  ```suggested
  const reread = readPayload(lockPath);
      if (existing) {
        if (!reread || reread.pid !== existing.pid || reread.acquiredAt !== existing.acquiredAt || reread.hostname !== existing.hostname) {
          throw new Error(`HUNT_ALREADY_RUNNING: the lock at ${lockPath} changed during stale-recovery (a peer won the race) — retry the hunt.`);
        }
      } else if (reread) {
        throw new
  ```

## src/hunter/profile/loader.ts
- **src/hunter/profile/loader.ts:503-503** (bug)
  The JSDoc on `loadProfile` (line 436) states "The frozen ProjectProfile is returned on success" but the function returns `result.data` (line 503/549) without calling `Object.freeze`. Downstream code relying on the freeze contract for immutability (e.g., preventing accidental profile mutation) will silently break. Either add `return Object.freeze(profile as ProjectProfile)` or correct the docstring.
  ```existing
  const profile = result.data;
  ```

## src/hydra/templates/lasme.ts
- **src/hydra/templates/lasme.ts:25-25** (bug)
  The double cast `as unknown as z.ZodSchema` bypasses TypeScript's type checker. Since `SubagentOutputSchema` is a `z.ZodObject` which extends `z.ZodType<any, any, any>` (alias for `z.ZodSchema`), this cast should be unnecessary. If it was added to satisfy a stricter generic signature, it still hides potential type mismatches at compile time. If the assignment fails without the cast, the `AuditorTemplate.outputSchema` type should be narrowed to `z.ZodObject` or a more specific union. Either way, `as unknown as` is a red flag that warrants investigation.
  ```existing
  outputSchema: SubagentOutputSchema as unknown as z.ZodSchema,
  ```
  ```suggested
  outputSchema: SubagentOutputSchema,
  ```

## src/omp/adapters/abide.ts
- **src/omp/adapters/abide.ts:118-119** (performance)
  The bounded-tail optimization (F-23, F-AB1, F-210) is defeated by the fallback at line 119. Multiple failure paths — statSync returning null (line 81, file disappears between resolution and read), fd open failure (line 115 catch), and while-loop exhaustion when no newline is found in the growing window — all fall through to `fs.readFileSync(eventsPath, "utf8")`, which loads the **entire** ~22.8 MB ledger into memory. This silently undoes the very optimization these fixes introduced. At minimum, the fallback should log a warning so operators can detect the degraded path, or rethrow if the file is genuinely too large to materialize. Additionally, the stat failure path (st === null) is especially dangerous: it skips straight to full readFileSync without even attempting the bounded tail.
  ```existing
  }
  const raw = fs.readFileSync(eventsPath, "utf8");
  ```
  ```suggested
  }
  // If we reach here, the bounded tail failed — log so operators know the optimization is degraded.
  // Consider throwing for files above a safety threshold instead of silently loading the full ledger.
  const MAX_SAFE_FULL_READ = 32 * 1024 * 1024; // 32 MiB
  if (st && st.size > MAX_SAFE_FULL_READ) {
    throw new Error(
      `GI_ENFORCE_ABIDE: bounded tail failed for ${eventsPath} (${st.siz
  ```

## src/omp/gate-hook.ts
- **src/omp/gate-hook.ts:41-41** (bug)
  The `split(oldString).join(newString)` pattern replaces ALL occurrences of `oldString` in the file, not just the targeted one. Edit tools (e.g., Claude's edit) specify a unique `old_string` to replace only one instance. If `oldString` appears multiple times in the file, the reconstructed `newText` will differ from what the tool actually produces, leading to incorrect gate verdicts. Use `.replace(oldString, newString)` (with the limit parameter omitted or explicitly limited to 1) or a more targeted approach.
  ```existing
  return { oldText, newText: oldText.split(oldString).join(newString), file };
  ```
  ```suggested
  return { oldText, newText: oldText.replace(oldString, newString), file };
  ```
- **src/omp/gate-hook.ts:98-106** (bug)
  When a tool_call is cancelled, this filter removes ALL queued steer entries for that tool name in the session, not just the entry belonging to the current call. If two interleaved write calls both have steers queued and one is cancelled, the innocent call's steer is also discarded. The fix should remove only the specific pending entry for the current call rather than filtering by tool name.
  ```existing
  if (verdict.cancel && verdict.token) {
      const stale = pendingSteer.get(steerSid);
      if (stale) {
        const rest = stale.filter((e) => e.tool !== name);
        if (rest.length > 0) pendingSteer.set(steerSid, rest);
        else pendingSteer.delete(steerSid);
      }
      throw new Error(`${verdict.token}: ${verdict.advisory ?? rec.file}`);
    }
  ```
  ```suggested
  if (verdict.cancel && verdict.token) {
      const stale = pendingSteer.get(steerSid);
      if (stale && stale.length > 0) {
        // Remove only the most recent entry for this tool (FIFO order, last pushed = current call)
        const idx = stale.findLastIndex((e) => e.tool === name);
        if (idx !== -1) stale.splice(idx, 1);
        if (stale.length === 0) pendingSteer.delete(steerSid);

  ```

## src/omp/gate-middleware.ts
- **src/omp/gate-middleware.ts:1-2** (maintainability)
  **Stale header comment contradicts fail-closed behavior.** Line 2 says `Fail-open when no store (GI_NO_STORE)`, but the actual behavior is fail-**closed** (`cancel: true`) unless the explicit escape `GI_ALLOW_NO_STORE=1` is set. This contradiction (documented as AP-5 in the project's audit logs) is misleading to any future maintainer reading the file header. The header should match the body.
  ```existing
  // OMP write/edit graph-gate. STEER default. FULL cancels on export strip.
// No @mimo-ai/plugin. Fail-open when no store (GI_NO_STORE).
  ```
  ```suggested
  // OMP write/edit graph-gate. STEER default. FULL cancels on export strip.
// No @mimo-ai/plugin. Fail-closed when no store (GI_NO_STORE); explicit bypass via GI_ALLOW_NO_STORE=1.
  ```

## src/omp/populate-graphify.ts
- **src/omp/populate-graphify.ts:367-368** (security)
  TOCTOU vulnerability: `vettedHash` is captured BEFORE `GraphifyAdapter.build()` runs (line ~252), then written to the sidecar after the build + DB write (line ~286). If source files change during the build, the sidecar records a hash that never corresponded to the graph actually written to the session store. The fix comment for F-38 correctly identifies this class ('the freshness gate stats graph.json, then build() re-reads it — a swap in between builds rows the gate never vetted') but the same pattern applies to sources: the gate hashes them, the build reads them, and an edit in between is laundered. The sidecar should be re-computed from the source files AFTER the build completes (or the graph file stat-compare should be the sole freshness signal, not the source hash).
  ```existing
  // W46 (frozen-scan HIGH): capture the VETTED source hash at gate-pass time.
  const vettedHash = sourceHashProvider ? sourceHashProvider() : computeSourceHash(resolvedRoot, pinned.graph?.scope ?? ["src"], pinned.graph?.excludes ?? []);
  ```
  ```suggested
  // Capture the source hash AFTER the build completes, not before.
  // This ensures the sidecar hash corresponds to the exact source state
  // that produced the graph written to the store.
  // (The freshness gate still uses the pre-build hash to decide whether
  // to build at all — that's correct. The sidecar records what was BUILT.)
  let vettedHash: string;
  // ... proceed with build ...
  /
  ```

## src/scoping/index.ts
- **src/scoping/index.ts:10-10** (bug)
  `getStoreDbAsync` (scoped-store.ts:106) is exported from the submodule but not re-exported from the barrel file. This is the async variant of `getStoreDb` — an important part of the public API for non-blocking usage. Consumers importing from the scoping barrel cannot access it.
  ```existing
  export { getStoreDb, closeStoreDb, upsertRow, runWithRetry, withImmediateTx } from "./scoped-store.ts";
  ```
  ```suggested
  export { getStoreDb, getStoreDbAsync, closeStoreDb, upsertRow, runWithRetry, withImmediateTx, type ScopedStoreOptions } from "./scoped-store.ts";
  ```
