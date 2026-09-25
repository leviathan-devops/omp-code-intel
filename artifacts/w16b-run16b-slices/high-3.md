# HIGH slice 3 — 5 findings across 4 files

## src/hydra/templates/sro.ts
- **src/hydra/templates/sro.ts:78-79** (bug)
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

## src/omp/graph-gate.ts
- **src/omp/graph-gate.ts:184-185** (bug)
  `computeDrift` silently mutates the caller's `state` in three ways: (1) it splices `state.editLog` and `state.graphQueries` via `filter` reassignment (lines 203–204), destroying entries the caller may still reference; (2) it writes `state.drift = drift` as a side-effect of what reads like a pure computation; (3) `gateDecision` also mutates `state.gateState` without documenting the mutation contract. These hidden side-effects are dangerous if any caller expects a read-only drift check (e.g., previewing a gate decision without committing the pruning). The mutation of editLog/graphQueries is irreversible — once entries are pruned, `saveGateState` persists the shortened arrays, permanently losing history that might still be within the window on another clock read.
  ```existing
  state.editLog = state.editLog.filter((e) => now - e.timestamp < DRIFT_WINDOW_MS);
  state.graphQueries = state.graphQueries.filter((q) => now - q.timestamp < DRIFT_WINDOW_MS);
  ```
  ```suggested
  // Option A: make computeDrift pure — compute on local copies, return result without mutating state.
  const activeEdits = state.editLog.filter((e) => now - e.timestamp < DRIFT_WINDOW_MS);
  const activeQueries = state.graphQueries.filter((q) => now - q.timestamp < DRIFT_WINDOW_MS);
  // ... compute on activeEdits / activeQueries ...
  // Return drift without writing to state; let the caller decid
  ```
- **src/omp/graph-gate.ts:389-390** (bug)
  `loadGateState` returns `null` when the persisted row is corrupt, tampered, or fails shape validation. Most callers interpret `null` as 'no prior state' and create a fresh gate via `createEmptyState()`, which silently erases the entire accumulated drift history for that session. The error is logged to console but the gate itself has no signal that history was lost — a session that was at T2 WARNING can silently reset to IDLE. This is a data-loss path that should either throw (forcing callers to handle corruption explicitly) or return a degraded state that preserves the non-corrupt fields.
  ```existing
  console.error(`GI_GATE_STATE_LOAD_FAILED: ${storePath} session=${sessionId} err=${e instanceof Error ? e.message : String(e)}`);
    return null;
  ```
  ```suggested
  console.error(`GI_GATE_STATE_LOAD_FAILED: ${storePath} session=${sessionId} err=${e instanceof Error ? e.message : String(e)}`);
    // Throw instead of returning null so callers cannot silently discard history.
    throw new Error(`GI_GATE_STATE_CORRUPT: ${storePath} session=${sessionId}`);
  ```

## src/omp/jev.ts
- **src/omp/jev.ts:54-56** (bug)
  Resource-exhaustion errors from `openSync` (e.g. `EMFILE`, `ENFILE` — too many open file descriptors) silently fall through to the `GI_JEV_NO_KEY` throw at line 87. This misidentifies a system resource condition as a missing key, which will cause callers to show a misleading 'no key' message instead of flagging the real problem. These errno codes should be re-thrown as a distinct JevError (or at least NOT mapped to `GI_JEV_NO_KEY`).
  ```existing
  // ENOENT and friends: fall through to the NO_KEY throw below (the old readFile path did the same).
    }
    if (fd !== null) {
  ```
  ```suggested
  // ENOENT, ENOTDIR etc. — genuinely absent, fall through below.
      // EMFILE/ENFILE — resource exhaustion, not a missing key; surface it.
      if (c?.code === 'EMFILE' || c?.code === 'ENFILE') {
        throw new JevError(
          "GI_JEV_KEY_PERMS",
          `key file ${KEY_FILE} could not be opened: ${c.code} (system out of file descriptors — not a missing key)`,
        );
      }
    }

  ```

## src/scoping/scope-binding.ts
- **src/scoping/scope-binding.ts:158-160** (security)
  `statePath` performs no path-traversal sanitization. If a caller passes `..` segments in `parts` (or even `scopeRoot`), `path.join` resolves them and can escape the intended `stateDir` boundary. For example, `statePath('/project', '..', 'etc', 'passwd')` would resolve to `/etc/passwd`. Since this method is part of the public `ScopeBinding` interface and deals with on-disk state, callers that pass untrusted input (e.g., user-supplied wave names) could write outside the sandbox.
  ```existing
  statePath(scopeRoot: string, ...parts: string[]): string {
    return path.join(scopeRoot, this.stateDir, ...parts);
  }
  ```
  ```suggested
  statePath(scopeRoot: string, ...parts: string[]): string {
    const resolved = path.resolve(scopeRoot, this.stateDir, ...parts);
    const base = path.resolve(scopeRoot, this.stateDir);
    if (!resolved.startsWith(base + path.sep) && resolved !== base) {
      throw new Error(
        `[${this.label} SCOPE] statePath: resolved path "${resolved}" escapes the state directory "${base}". ` +
       
  ```
