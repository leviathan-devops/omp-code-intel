# R16 group B — 6 findings across 5 files

## src/omp/graph-facts.ts
- **src/omp/graph-facts.ts:109-119** (high · bug)
  **Bug: `freshnessGate` violates the file's own 'UNOBSERVED, never PASS' principle.**

The freshness gate returns `settles: true, action: 'IGNORE'` when the store is stale, which tells downstream callers (MPSE, cache, Jev) that the graph has *settled* the question with a clean answer. But a stale store means the graph *cannot know* — it is not evidence of absence. The file's own documented pin states: 'a generic gate preempting a specific one is UNOBSERVED, never PASS.' A stale-data gate is exactly that: a generic gate.

The consequence is severe: the caller at line 142 returns immediately (`return [stale]`), so M-GRAPH-1 through M-GRAPH-5 are never evaluated, and the `settles: true` flag tells the MPSE/Jev layers to stop asking. A stale store silently suppresses all further analysis.

This should be `settles: false, action: null` so the caller records it as UNOBSERVED and the next layer 
  ```existing
  function freshnessGate(db: Database, input: GraphFactInput): GraphFactVerdict | null {
  const f = layerFreshness(db, { derivation: input.derivation ?? "explicit", now: input.now });
  if (!f.stale) return null;
  return {
    rule: "M-GRAPH-3",
    settles: true,
    action: "IGNORE",          // a stale-store refusal is NOT evidence of a violation
    reason: "the graph store is STALE — no fact 
  ```
- **src/omp/graph-facts.ts:102-103** (high · bug)
  **Bug: `LIKE` helper strips `_` and `%` from the target instead of escaping them, causing incorrect SQL LIKE matching.**

The helper `const LIKE = (target) => `%${target.replace(/[%_]/g, '')}%`` removes `_` and `%` from the search term. In SQL LIKE, `_` is a single-character wildcard and `%` is a multi-character wildcard — stripping them changes the semantics of the search.

Concrete failure case: if `target = "foo_bar"` and a canonical_id in the store is `my_foo_bar_handler`, the query becomes `LIKE '%foobar%'`. The string `my_foo_bar_handler` does NOT contain the literal substring `foobar`, so the lookup returns zero rows — the node is treated as absent. Every subsequent rule sees `known === 0` and returns UNOBSERVED for a node that actually exists.

The correct fix is to escape `_` and `%` with a backslash (or chosen escape character) and add an `ESCAPE` clause to the SQL `LIKE` expre
  ```existing
  /** The canonical-id prefix the indexer writes; fragments match within it. */
const LIKE = (target: string) => `%${target.replace(/[%_]/g, "")}%`;
  ```

## src/hydra/auditor.ts
- **src/hydra/auditor.ts:189-192** (high · security)
  The grep tool (both `rg` and `grep -r` fallback) follows symlinks by default when traversing directories inside `targetRoot`. Unlike the `read` tool (which uses `isWithinRoot` + `O_NOFOLLOW`) and the `write_findings` tool (which validates the pinned path against `ledgerDir` + `O_NOFOLLOW`), the grep tool has NO symlink containment. A symlink inside targetRoot pointing to `/etc/shadow` or any external directory would yield matches (and printed file paths) from outside the containment boundary. This is the only tool in the belt that leaks data through symlinks.

Suggestion: After grep returns, filter output lines to only include those whose file path resolves inside targetRoot (a post-hoc containment gate), or use `rg --no-follow` / `grep -P` equivalents where feasible, or run the grep in a subprocess with a chroot/namespace constraint.
  ```existing
  let out = await run("rg", ["-n", "--max-count", String(maxResults), "--", pattern, targetRoot]);
      if (out.startsWith("SEARCH_FAILED") || out.length === 0) {
        out = await run("grep", ["-rn", "-E", "-m", String(maxResults), "--", pattern, targetRoot]);
      }
  ```

## src/kernel/graph-pre-flight.ts
- **src/kernel/graph-pre-flight.ts:38-41** (high · bug)
  **`impactInDb` truncation silently ignored**: `impactInDb` caps its ledger at 5000 rows and sets `truncated: true` when the cap is hit (see `typed-write.ts:1119-1146`). `preFlight` never checks `imp.truncated`, so when a large graph is encountered, `imp.reaches` is under-reported (it equals `ledger.length`, not actual reachability). This silently produces an incorrect `commitStrategy` — e.g., a graph with 100 real reachable nodes but only 49 ledgered would get `"split"` instead of `"domain-level"`. A warning should be emitted when `imp.truncated` is true, mirroring the existing `NO CONSUMERS` and `WIDE BLAST RADIUS` patterns.
  ```existing
  const imp = impactInDb(db, target, 8);

    const byDepth: Record<number, number> = {};
    for (const row of imp.ledger) byDepth[row.depth] = (byDepth[row.depth] ?? 0) + 1;
  ```
  ```suggested
  const imp = impactInDb(db, target, 8);
    if (imp.truncated) warnings.push(`IMPACT TRUNCATED: blast-radius ledger capped at 5000 rows — reachability UNDER-REPORTED for ${target}; commit strategy may be too lenient`);

    const byDepth: Record<number, number> = {};
    for (const row of imp.ledger) byDepth[row.depth] = (byDepth[row.depth] ?? 0) + 1;
  ```

## src/omp/jev.ts
- **src/omp/jev.ts:54-56** (high · bug)
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

## src/omp/ripwire-bridge.ts
- **src/omp/ripwire-bridge.ts:73-78** (high · bug)
  **`spawnSync` ignores `maxBuffer` — buffer limit is non-functional, truncation detection is dead code**

`spawnSync` (Node.js) does **not** support the `maxBuffer` option — only `execSync` and `execFileSync` do. Passing it to `spawnSync` is silently ignored (no error, no limit). This means:

1. **No output is ever capped**: ripwire can produce >32 MB of stdout/stderr without any enforcement.
2. **Truncation detection is dead code**: Lines 79–93 (the ENOBUFS / ERR_CHILD_PROCESS_STDIO_MAXBUFFER / stdout-length heuristic) can never trigger because `spawnSync` never sets these error codes for buffer overflow — it doesn't enforce a buffer limit at all.
3. **The stdout-length heuristic is also unreachable**: `stdoutLen >= RIPWIRE_MAX_BUFFER` can only be true if output genuinely exceeds 32 MB, which will happen — but it won't indicate truncation, just large output.

This means the F-271 and F-1
  ```existing
  const res = spawnSync(bin, [root, ...args], {
    encoding: "utf8",
    timeout: timeoutMs ?? RIPWIRE_TIMEOUT_MS,
    maxBuffer: RIPWIRE_MAX_BUFFER,
    env: e,
  });
  ```
  ```suggested
  // Option A: use execFileSync which supports maxBuffer
  // const res = execFileSync(bin, [root, ...args], {
  //   encoding: "utf8",
  //   timeout: timeoutMs ?? RIPWIRE_TIMEOUT_MS,
  //   maxBuffer: RIPWIRE_MAX_BUFFER,
  //   env: e,
  //   stdio: ["pipe", "pipe", "pipe"],
  // });

  // Option B: keep spawnSync but enforce limit manually after the call
  const res = spawnSync(bin, [root, ...arg
  ```
