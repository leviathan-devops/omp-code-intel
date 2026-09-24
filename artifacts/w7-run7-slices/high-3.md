# HIGH slice 3 — 8 findings across 7 files

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

## src/hunter/harness/map.ts
- **src/hunter/harness/map.ts:98-104** (bug)
  **Edge deduplication discards location info — potential false-pass in LINELESS guard.**

The `edgeLocByTarget` map keeps only the first edge per `targetId`. If the first edge targeting a node has NO `source_location`, but a later edge DOES, the guard checks against `{ source_location: undefined }` instead of the later edge's location. This causes a valid node (with line info available via a later edge) to be falsely rejected as LINELESS_NODE — or conversely, if the first edge has `source_location` and a later one lacks it, that's benign but semantically wrong.

The real danger: a node where the *only* source of line information is a second (or later) edge — the first edge for that target has no location info. The guard would throw LINELESS_NODE even though the line IS resolvable via the other edge.

Suggestion: collect ALL edge locations per targetId (as an array), and when resolving, try each edge's location until one resolves a line.
  ```existing
  const edgeLocByTarget: Record<string, { source_location?: unknown; metadata?: unknown }> = {};
  for (const e of buildResult.edges) {
    if (edgeLocByTarget[e.targetId] === undefined) {
      const rec = e as unknown as Record<string, unknown>;
      edgeLocByTarget[e.targetId] = { source_location: rec['source_location'], metadata: rec['metadata'] };
    }
  }
  ```
  ```suggested
  const edgeLocByTarget: Record<string, Array<{ source_location?: unknown; metadata?: unknown }>> = {};
  for (const e of buildResult.edges) {
    const rec = e as unknown as Record<string, unknown>;
    const entry = { source_location: rec['source_location'], metadata: rec['metadata'] };
    (edgeLocByTarget[e.targetId] ??= []).push(entry);
  }
  ```
- **src/hunter/harness/map.ts:110-114** (bug)
  **resolveLine receives only one edge — but there may be multiple edges to the same node.**

After fixing the edge dedup above (if collecting arrays), the `resolveLine` call on line 107-111 passes only `edgeLocByTarget[n.id] ?? null` (a single entry). If the data was changed to an array, this call needs updating to try each edge entry. Additionally, `resolveLine` is currently a fire-and-forget — it either returns a valid line or throws. If it throws for one edge but a different edge would have resolved, the guard is overly strict.

Consider building a `tryResolveLine`-based loop over all edges for the node before falling through to the loud refusal.
  ```existing
  resolveLine(
      { line: n.line ?? undefined, data, source_location: data['source_location'] },
      edgeLocByTarget[n.id] ?? null,
      n.id,
    );
  ```
  ```suggested
  // Try all edges pointing at this node — if ANY resolves a line, the node passes.
    const edges = edgeLocByTarget[n.id];
    if (edges && edges.length > 0) {
      let resolved = false;
      for (const edge of edges) {
        const line = tryResolveLine(
          { line: n.line ?? undefined, data, source_location: data['source_location'] },
          edge,
        );
        if (line !== unde
  ```

## src/hunter/harness/micro-loop-machine.ts
- **src/hunter/harness/micro-loop-machine.ts:399-403** (bug)
  BUG (High): `done()` + `stop()` lifecycle race — the pending promise never resolves.

When `done()` is called while the machine is still running, `sub2` and `sub3` are registered on the actor and pushed to `handleDisposables`. If `stop()` is then called before the machine reaches a terminal state, `handleDisposables.splice(0)` unsubscribes both `sub2` and `sub3` (the only callbacks that can call `settle()` and resolve the promise), then `actor.stop()` kills the actor. The `pendingDone` promise is left pending forever, causing any caller awaiting `handle.done()` to hang indefinitely.

Fix: resolve `pendingDone` inside `stop()` before tearing down subscriptions.
  ```existing
  stop(): void {
      sub.unsubscribe();
      for (const d of handleDisposables.splice(0)) d.unsubscribe();
      try { actor.stop(); } catch (e) { console.error('[micro-loop] actor stop failed:', e instanceof Error ? e.message : String(e)); }
    },
  ```
  ```suggested
  stop(): void {
      sub.unsubscribe();
      for (const d of handleDisposables.splice(0)) d.unsubscribe();
      // F-337 follow-up: resolve any pending done() promise so the caller
      // never hangs after an explicit stop().
      if (pendingDone !== null && !settled) {
        settled = true;
        pendingDone.resolve();
      }
      try { actor.stop(); } catch (e) { console.error('[micro
  ```

## src/hunter/tools/bug-hunt.ts
- **src/hunter/tools/bug-hunt.ts:78-84** (security)
  **Security: `realpathSync` fallback bypasses scope containment for both target and profile paths.**

The `inScope` check is described as 'symlink-aware' but when `realpathSync` fails (permissions, broken symlink, OS edge cases), the fallback defaults to the unresolved path. This allows a symlinked path that resolves outside the scope to pass the check because the scope containment runs against the logical path. This issue exists for both targetPath (as noted in the original) and profilePath (F-303b).

**Suggestion**: When `realpathSync` fails and scope containment is required, treat the path as out-of-scope (throw) rather than silently falling back to the unresolved path. This aligns with the fail-closed design philosophy.
  ```existing
  if (scopeReal !== null) {
    let targetReal = absTarget;
    try { targetReal = fsDyn.realpathSync(absTarget); } catch { targetReal = absTarget; }
    if (!inScope(targetReal)) {
      throw new Error(`HUNT_SCOPE_INVALID: targetPath=${args.targetPath} resolves outside the scope root (scope=${scopeReal} target=${targetReal})`);
    }
  }
  ```
  ```suggested
  if (scopeReal !== null) {
    let targetReal: string;
    try {
      targetReal = fsDyn.realpathSync(absTarget);
    } catch {
      // Fail closed: if we cannot resolve the real path, we cannot confirm
      // containment — reject rather than silently checking the logical path.
      throw new Error(`HUNT_SCOPE_INVALID: targetPath=${args.targetPath} cannot resolve for scope check (scope=${scope
  ```

## src/kernel/graph-diff.ts
- **src/kernel/graph-diff.ts:153-153** (bug)
  **Bug: WARN verdict never set for blast radius jumps.**

The JSDoc comment on this function explicitly states: "WARN: unwired growth or a blast-radius jump (a node's inbound more than doubling)." However, the verdict logic at line 126 only checks `unwiredDelta > 0` for WARN. Blast radius jumps (which are detected and reported in `details` at line 131) never influence the verdict. A change that causes a node's inbound to triple would still produce verdict=PASS.

Fix: After computing blast radius changes, check if any qualify as a jump (e.g., `after > 2 * before`) and set verdict to WARN accordingly.
  ```existing
  if (unwiredDelta > 0 && verdict !== "FAIL") verdict = "WARN";
  ```

## src/omp/calibration.ts
- **src/omp/calibration.ts:90-95** (bug)
  **Bug: Negative z-score produces inverted Wilson interval (same pattern as F-CAL-Z fix in firesNeededForGap).**

When a negative `z` is passed, the `margin` computed on line 93 becomes negative (since `z < 0`). This causes:
- `low = centre - margin` → `centre + |margin|` (higher than centre)
- `high = centre + margin` → `centre - |margin|` (lower than centre)
- Result: `low > high`, `halfWidth` becomes **negative**, and `sufficient: (high - low) / 2 <= 0.10` evaluates to `true` (a negative number is always ≤ 0.10) — falsely marking a rule as having sufficient evidence.

The F-CAL-Z fix in `firesNeededForGap` (line 45) already addressed this exact pattern with `Math.abs(z) || 1.96`, but `precisionFromCounts` was not updated with the same defensive measure.
  ```existing
  const z2 = z * z;
  const denom = 1 + z2 / resolved;
  const centre = (p + z2 / (2 * resolved)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * resolved)) / resolved)) / denom;
  const low = Math.max(0, centre - margin);
  const high = Math.min(1, centre + margin);
  ```
  ```suggested
  const zSafe = Math.abs(z) || 1.96;
  const z2 = zSafe * zSafe;
  const denom = 1 + z2 / resolved;
  const centre = (p + z2 / (2 * resolved)) / denom;
  const margin = (zSafe * Math.sqrt((p * (1 - p) + z2 / (4 * resolved)) / resolved)) / denom;
  const low = Math.max(0, centre - margin);
  const high = Math.min(1, centre + margin);
  ```

## src/omp/jev.ts
- **src/omp/jev.ts:34-39** (security)
  The comment on line 16 references a '0600 file' invariant, and the KEY_FILE path implies a secret key file. However, `resolveKey` reads the file with `fs.readFileSync` but never checks that the file has restrictive permissions (e.g., mode 0o600). A world-readable key file is silently accepted. Consider checking `fs.statSync(KEY_FILE).mode` and rejecting files with overly permissive permissions (e.g., if `(mode & 0o077) !== 0`), consistent with the documented '0600 file' contract.
  ```existing
  try {
    const v = fs.readFileSync(KEY_FILE, "utf8").trim();
    if (v.length > 0) return v;
  } catch {
    /* fall through to the throw */
  }
  ```
  ```suggested
  try {
    const stat = fs.statSync(KEY_FILE);
    if ((stat.mode & 0o077) !== 0) {
      throw new JevError(
        "GI_JEV_KEY_PERMS",
        `key file ${KEY_FILE} has insecure permissions ${stat.mode.toString(8)} (expected 0600)`,
      );
    }
    const v = fs.readFileSync(KEY_FILE, "utf8").trim();
    if (v.length > 0) return v;
  } catch (e) {
    if (e instanceof JevError) throw e;
    /*
  ```
