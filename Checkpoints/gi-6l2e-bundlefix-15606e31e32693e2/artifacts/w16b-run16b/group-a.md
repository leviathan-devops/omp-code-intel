# R16 group A — 7 findings across 5 files

## src/omp/adapters/kev.ts
- **src/omp/adapters/kev.ts:119-120** (high · bug)
  The `out.split("\n").reverse().find(...)` heuristic to extract JSON from CLI stdout is fragile and error-prone. If the CLI emits debug lines, warnings, or progress indicators to stdout (e.g., `{"debug": true}` or a truncated `{"partial...`), this picks up the wrong line. The try/catch around `JSON.parse` prevents a crash, but the wrong object could silently pass all downstream checks (ok, distribution, uniform) and produce a fabricated verdict. A safer approach is to use a structured protocol: scan only lines that begin with `{` AND contain `"ok"`, or better yet, capture stderr for diagnostics and treat stdout as exclusively JSON.
  ```existing
  const line = out.split("\n").reverse().find((l) => l.trim().startsWith("{"));
      if (line === undefined) throw new Error(`GI_ENFORCE_KEV: the KEV CLI printed no JSON — output: ${out.slice(0, 200)}`);
  ```
  ```suggested
  // Prefer a JSON object that looks like a real KEV answer (has "ok" field)
      const candidates = out.split("\n").filter((l) => l.trim().startsWith("{") && l.includes('"ok"'));
      const line = candidates[candidates.length - 1];
      if (line === undefined) throw new Error(`GI_ENFORCE_KEV: the KEV CLI printed no JSON — output: ${out.slice(0, 200)}`);
  ```
- **src/omp/adapters/kev.ts:107-112** (high · performance)
  The synchronous `execFileSync` with a 120-second timeout blocks the calling thread entirely. In any concurrent or server-based probe runner, a slow or hung CLI process will block the event loop for up to two minutes, creating a denial-of-service risk for other probes. The F-1206 NOTE acknowledges this as deferred, but it remains a live issue. The recommended mitigation is to migrate `facts()` to an async signature and use `execFile` (callback/promise-based), or offload to a worker thread.
  ```existing
  out = execFileSync(process.execPath, [cli, "--json", JSON.stringify({ state: buildState(scopeRoot, subject), questions: [MEANING_QUESTION] })], {
          encoding: "utf8",
          timeout: 120_000,
          maxBuffer: 8 * 1024 * 1024,
          cwd: scopeRoot,
        });
  ```

## src/scoping/session-state.ts
- **src/scoping/session-state.ts:75-77** (high · bug)
  `writeSessionState` accepts a full state map and overwrites it, but the caller may have read that state *before* acquiring the lock. Classic read-then-write TOCTOU: if another process runs `tickSessionBudget` between the caller's read and this write, the other process's update is silently clobbered. Consider changing the API to accept a mutation function `(current: SessionStateMap) => SessionStateMap` so the read and write happen atomically inside the lock, similar to `tickSessionBudget`.
  ```existing
  export function writeSessionState(statePath: string, state: SessionStateMap): void {
  withStateLock(statePath, () => { writeSessionStateRaw(statePath, state); });
}
  ```
  ```suggested
  export function writeSessionState(statePath: string, mutator: (current: SessionStateMap) => SessionStateMap): void {
  withStateLock(statePath, () => {
    const state = readSessionState(statePath);
    writeSessionStateRaw(statePath, mutator(state));
  });
}
  ```
- **src/scoping/session-state.ts:88-91** (high · bug)
  The `for (;;)` lock-acquisition loop has no upper bound. If the lock holder crashes and the stale-reclaim path consistently fails (e.g., `statSync` or `unlinkSync` throws due to permissions or filesystem errors), this spins forever, deadlocking the process. Add a maximum iteration count or wall-clock deadline after which the function throws a descriptive error.
  ```existing
  for (;;) {
    try { fs.writeFileSync(lockPath, token, { flag: "wx" }); break; }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  ```
  ```suggested
  const MAX_LOCK_ATTEMPTS = 300; // ~3s at 10ms spin per attempt
  for (let attempt = 0; attempt < MAX_LOCK_ATTEMPTS; attempt++) {
    try { fs.writeFileSync(lockPath, token, { flag: "wx" }); break; }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      // ... existing stat/unlink/spin logic ...
    }
  }
  throw new Error(`[session-state] failed to acquire lock a
  ```

## src/hydra/templates/sro.ts
- **src/hydra/templates/sro.ts:78-79** (high · bug)
  sroCyclesTemplate's filterTags (line 78) are byte-for-byte identical to sroGraphTemplate's (line 44): `["violates", "triggers", "shouldBe", "declares", "evaluates_to", "contradicts_oracle", "flagged_by", "caused"]`. This appears to be a copy-paste artifact. The cycles template hunts circular dependencies and likely needs different filter tags — e.g., `"implements"`, `"wraps"`, `"derived_from"` (used by sroPathTemplate and sroDeadCodeTemplate for import/call relationships) are more relevant for cycle detection than `"triggers"` and `"caused"`, which relate to graph-structure anomalies (orphans, god-nodes). Please verify the intended tag set against the fork source (`sro-cycles.ts`) and correct if needed.
  ```existing
  ["violates", "triggers", "shouldBe", "declares", "evaluates_to", "contradicts_oracle", "flagged_by", "caused"],
  "hunt circular dependencies (import cycles length>=2 verified by reading import statements, SCCs size>=2).",
  ```
  ```suggested
  // TODO: verify against fork — cycles likely needs import-relationship tags
  ["violates", "shouldBe", "implements", "wraps", "evaluates_to", "derived_from", "flagged_by"],
  "hunt circular dependencies (import cycles length>=2 verified by reading import statements, SCCs size>=2)."
  ```

## src/omp/hard-deps.ts
- **src/omp/hard-deps.ts:242-247** (high · bug)
  The variable is named `listeningPaths` but the Set is populated from ALL entries in `/proc/net/unix` without filtering by socket state. The `/proc/net/unix` file lists every Unix domain socket on the system — listening, established, connecting, etc. A socket in state ESTABLISHED or CONNECTING would also match, producing a false UP for a daemon that is no longer accepting connections.

In `/proc/net/unix`, the state field is at column index 3 (0-indexed); `0A` (hex) means LISTENING. The probe should filter on that state, or at minimum acknowledge the gap. Given the stated design goal ('existence is not liveness' / 'a socket FILE with no entry is a stale corpse'), the check is incomplete — having an entry is also not necessarily listening.
  ```existing
  const listeningPaths = new Set(
        table.split("\n").map((line) => {
          const parts = line.trim().split(/\s+/);
          return parts[parts.length - 1] ?? "";
        }),
      );
  ```
  ```suggested
  // In /proc/net/unix, column 3 (0-indexed) is the socket state; "0A" = LISTENING.
      const listeningPaths = new Set(
        table.split("\n")
          .filter((line) => {
            const parts = line.trim().split(/\s+/);
            // skip the header line ("sk  RefCount ...") and lines with fewer fields
            return parts.length >= 7 && parts[3] === "0A";
          })
          .map(
  ```

## src/omp/populate.ts
- **src/omp/populate.ts:82-84** (high · bug)
  `db.close()` is not guarded by try/catch in the corbell path. If `close()` throws (e.g., I/O error on flush, corrupted DB handle), the exception propagates out of the finally block and masks the return value — including the `metaDegraded` flag. The graphify path already wraps close correctly (`try { db.close(); } catch { ... }`). Apply the same pattern here.
  ```existing
  } finally {
      db.close();
    }
  ```
  ```suggested
  } finally {
      try { db.close(); } catch { /* close best-effort */ }
    }
  ```
