# HIGH slice 2 — 5 findings across 4 files

## src/hydra/pipeline.ts
- **src/hydra/pipeline.ts:121-125** (bug)
  Pre-gate failure skips the try/catch block that publishes evidence and PIPELINE_FAILED. When a pre-gate fails, `failLoud` throws at line ~101, which is *before* the try block at line 115. The catch block that calls `this.publishRun(seq, evidence)` is never reached, so `this.evidence` is never updated with the failed run's trail. This is inconsistent with the post-gate failure path (which does publish) and means concurrent readers see a stale or empty snapshot after a pre-gate rejection. The pre-gate failure path should also call `publishRun`.
  ```existing
  for (const gate of this.config.gates.pre) {
      this.log("GATE_CHECK", { gate: gate.name, phase: "pre" }, evidence);
      const result = await gate.check(input);
      if (!result.passed) this.failLoud(gate, result.reason ?? "pre-gate failed");
    }
  ```
  ```suggested
  for (const gate of this.config.gates.pre) {
      this.log("GATE_CHECK", { gate: gate.name, phase: "pre" }, evidence);
      const result = await gate.check(input);
      if (!result.passed) {
        this.log("PIPELINE_FAILED", { name: this.config.name, error: `pre-gate ${gate.name}: ${result.reason ?? "pre-gate failed"}` }, evidence);
        this.publishRun(seq, evidence);
        this.failLoud
  ```

## src/omp/graph-facts.ts
- **src/omp/graph-facts.ts:109-119** (bug)
  **Bug: `freshnessGate` violates the file's own 'UNOBSERVED, never PASS' principle.**

The freshness gate returns `settles: true, action: 'IGNORE'` when the store is stale, which tells downstream callers (MPSE, cache, Jev) that the graph has *settled* the question with a clean answer. But a stale store means the graph *cannot know* — it is not evidence of absence. The file's own documented pin states: 'a generic gate preempting a specific one is UNOBSERVED, never PASS.' A stale-data gate is exactly that: a generic gate.

The consequence is severe: the caller at line 142 returns immediately (`return [stale]`), so M-GRAPH-1 through M-GRAPH-5 are never evaluated, and the `settles: true` flag tells the MPSE/Jev layers to stop asking. A stale store silently suppresses all further analysis.

This should be `settles: false, action: null` so the caller records it as UNOBSERVED and the next layer (MPSE) picks up the question.
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
- **src/omp/graph-facts.ts:102-103** (bug)
  **Bug: `LIKE` helper strips `_` and `%` from the target instead of escaping them, causing incorrect SQL LIKE matching.**

The helper `const LIKE = (target) => `%${target.replace(/[%_]/g, '')}%`` removes `_` and `%` from the search term. In SQL LIKE, `_` is a single-character wildcard and `%` is a multi-character wildcard — stripping them changes the semantics of the search.

Concrete failure case: if `target = "foo_bar"` and a canonical_id in the store is `my_foo_bar_handler`, the query becomes `LIKE '%foobar%'`. The string `my_foo_bar_handler` does NOT contain the literal substring `foobar`, so the lookup returns zero rows — the node is treated as absent. Every subsequent rule sees `known === 0` and returns UNOBSERVED for a node that actually exists.

The correct fix is to escape `_` and `%` with a backslash (or chosen escape character) and add an `ESCAPE` clause to the SQL `LIKE` expressions:

```ts
const LIKE = (target: string) => `%${target.replace(/\/g, '\\').replace(/%/g, '\%').replace(/_/g, '\_')}%`;
// and in SQL: ... LIKE ?1 ESCAPE '\'
```

Note: the `inDegree` and `outD` queries all use this `LIKE` helper, so every rule in the file is affected.
  ```existing
  /** The canonical-id prefix the indexer writes; fragments match within it. */
const LIKE = (target: string) => `%${target.replace(/[%_]/g, "")}%`;
  ```

## src/omp/hard-deps.ts
- **src/omp/hard-deps.ts:242-247** (bug)
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

## src/omp/ripwire-bridge.ts
- **src/omp/ripwire-bridge.ts:73-78** (bug)
  **`spawnSync` ignores `maxBuffer` — buffer limit is non-functional, truncation detection is dead code**

`spawnSync` (Node.js) does **not** support the `maxBuffer` option — only `execSync` and `execFileSync` do. Passing it to `spawnSync` is silently ignored (no error, no limit). This means:

1. **No output is ever capped**: ripwire can produce >32 MB of stdout/stderr without any enforcement.
2. **Truncation detection is dead code**: Lines 79–93 (the ENOBUFS / ERR_CHILD_PROCESS_STDIO_MAXBUFFER / stdout-length heuristic) can never trigger because `spawnSync` never sets these error codes for buffer overflow — it doesn't enforce a buffer limit at all.
3. **The stdout-length heuristic is also unreachable**: `stdoutLen >= RIPWIRE_MAX_BUFFER` can only be true if output genuinely exceeds 32 MB, which will happen — but it won't indicate truncation, just large output.

This means the F-271 and F-1029 fixes documented in the comments are ineffective. A malicious or pathological ripwire output could exhaust memory.

**Suggested fix**: Either switch to `execFileSync` (which supports `maxBuffer`), or manually enforce the limit by checking `res.stdout.length` and `res.stderr.length` after the call and truncating/reporting.
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
