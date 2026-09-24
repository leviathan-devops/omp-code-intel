# HIGH slice 3 — 12 findings across 9 files

## src/hunter/graph/corbell-adapter.ts
- **src/hunter/graph/corbell-adapter.ts:462-469** (bug)
  buildCorbellGraphAsync is exported and documented as 'the event-driven replacement for the sync exec' (line 95-99), but the adapter's own `build()` method (line 462) always invokes `this.exec(...)` which defaults to `defaultExec` — a synchronous `execSync` that blocks the Node.js event loop for the full duration of the CLI build (15-25+ minutes on 562 files). The async path is effectively dead code within the adapter's primary build flow. This defeats the stated purpose of keeping the event loop free. Consider having `build()` use `buildCorbellGraphAsync` when the default exec is active, or clearly document that `buildCorbellGraphAsync` is only for external callers.
  ```existing
  stdout = this.exec(`${buildBin} graph build --methods`, {
          cwd: profile.project.root,
          env: couplingEnv,
          // NO TIMEOUT — the build runs until it completes (the operator's
          // order: no static timeouts, event-driven async). The process
          // exit IS the event. 562 files took >10 min on a cold build —
          // the 600s static timeout was the garbage th
  ```
- **src/hunter/graph/corbell-adapter.ts:0-0** (security)
  Two independent metacharacter filtering layers use inconsistent regex patterns. `resolveCorbell`'s `safe()` (line 66) rejects `[^A-Za-z00000_@%+=:,./\\-]` which allows `*` and `~` through, while `defaultExec` (line 160) rejects `[;&|`$(){}!<>\n\r]` which does not filter `*` or `~`. In `/bin/sh`, unquoted `*` triggers glob expansion and `~` triggers home-directory expansion — both are exploitable if an attacker controls the resolved binary path. The two layers should use a single, harmonized character allowlist (or denylist) so a path passing `safe()` is also safe in `defaultExec` and vice versa.
  ```existing
  const safe = (p: string): string => {
    if (/[^A-Za-z0-9_@%+=:,./\-]/.test(p)) {
      throw new Error(`CORBELL_BIN_UNSAFE: resolved binary path contains shell metacharacters: ${p.slice(0, 120)}`);
    }
    return p;
  };
  ```

## src/hunter/graph/store-map.ts
- **src/hunter/graph/store-map.ts:198-201** (bug)
  **Missing `gi_meta` provenance in session writer** — `writeCorbellCheckout` (lines 266-277) writes `populated_at`, `substrate`, and `corbell_checkout` into `gi_meta` inside the transaction, precisely to prevent `layerFreshness` (typed-write.ts:427-456) from reporting the graph as stale-by-construction. However, `writeCorbellToTypedStore` does NOT write any `gi_meta` entries. If no other code path populates `gi_meta` for the session store, `layerFreshness` will read a missing `populated_at` and return `{ stale: true }` immediately, making the freshly-written graph unusable by the graph-fact rung. This is the exact defect the P3 fix in the checkout path was meant to prevent. Either the session writer should also populate `gi_meta` inside the transaction, or a comment should document which external writer is responsible.
  ```existing
  db.exec("COMMIT;");
      // ★ F-144 FIX (2026-09-24): verification reads ride the pre-close order — the writer has committed but not yet closed, so the fresh-reader helpers see the commit.
      storeNodes = countTypedNodes(storePath);
      storeEdges = countTypedEdges(storePath);
  ```
  ```suggested
  // ★ P3 SESSION — same provenance discipline as writeCorbellCheckout:
      //   a session store without populated_at is stale-by-construction.
      db.run(
        "INSERT INTO gi_meta (key, value) VALUES ('populated_at', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [new Date().toISOString()],
      );
      db.run(
        "INSERT INTO gi_meta (key, value) VALUES ('substr
  ```

## src/hunter/harness/types.ts
- **src/hunter/harness/types.ts:19-26** (bug)
  This file re-exports `GraphNode` and `GraphEdge` from `../shared/db.ts`, but `../graph/interface.ts` also defines its own `GraphNode` and `GraphEdge` with stricter typing. The `db.ts` versions use `kind: string` (loose), while `graph/interface.ts` uses `kind: GraphNodeKind` and `kind: GraphEdgeKind` (exact string-literal unions). Similarly, `db.ts`'s `GraphEdge` lacks `id`, `file`, and `line` fields that `interface.ts` defines. Re-exporting the weaker db-level shapes as the harness's canonical types silently defeats the graph-layer's strong typing. Downstream code that imports `GraphNode` from this barrel gets the untyped `kind: string`, allowing invalid kind values to pass the compiler. These re-exports should source from `../graph/interface.ts` instead, or the two definitions should be unified.
  ```existing
  export type {
  DbClient,
  EventKind,
  EventPayload,
  FindingInput,
  FindingVerdict,
  GraphEdge,
  GraphNode,
  ```
  ```suggested
  export type {
  DbClient,
  EventKind,
  EventPayload,
  FindingInput,
  FindingVerdict,
  ReportSectionInput,
  Severity,
  StatementLike,
} from '../shared/db.ts';
export type {
  AwaitEdge,
  BuildResult,
  CallSite,
  ChainStep,
  DeadNode,
  GraphAdapter,
  GraphEdge,
  GraphEdgeKind,
  GraphNode,
  GraphNodeKind,
  ImportEdge,
  Lineage,
} from '../graph/interface.ts';
  ```

## src/hunter/shared/db.ts
- **src/hunter/shared/db.ts:780-780** (bug)
  **Silent error swallowing in idempotent guards masks real failures.**

The `catch (idemErr) { console.debug(...) }` pattern is used for ~10 DDL operations (views, ATTACH, chmod, close). While idempotent DDL like `CREATE VIEW IF NOT EXISTS` may legitimately fail, other operations like `chmodSync` (disk full, permission denied), `Database.close()` (I/O error during WAL checkpoint), and `ATTACH DATABASE` (path doesn't exist, permission denied) can fail for reasons unrelated to idempotency. Swallowing these errors with `console.debug` makes real failures invisible and leads to confusing downstream errors.

At minimum, the catch blocks should inspect the error message for known idempotency patterns (e.g., 'already exists') and re-throw for unexpected errors.
  ```existing
  try { fs.chmodSync(this.familyPath, 0o444); } catch (idemErr) { /* idempotent guard */ console.debug("[kg-store] idempotent guard #5:", idemErr instanceof Error ? idemErr.message : String(idemErr)); }
  ```
  ```suggested
  try {
      fs.chmodSync(this.familyPath, 0o444);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // chmod may fail if already read-only — treat that as idempotent
      if (/EACCES|permission denied|Operation not permitted/i.test(msg)) {
        console.debug("[kg-store] chmod already read-only:", msg);
      } else {
        throw e;
      }
    }
  ```

## src/hunter/tools/bug-hunt.ts
- **src/hunter/tools/bug-hunt.ts:261-264** (bug)
  The `status` action (the `else` branch starting around line 211) opens a session store but never closes it. If `openSessionStore` acquires any resources (file handles, locks, etc.), those resources will leak on each status call. Verify whether `opened.storePath` / `opened` needs cleanup after use, and if so, add a finally block to release those resources.
  ```existing
  const opened = openSessionStore({ sessionId: callerId, scopeRoot, callerSessionId: callerId });
        if (countTypedNodes(opened.storePath) === 0) {
          populateSessionStore(opened.storePath, scopeRoot);
        }
  ```
- **src/hunter/tools/bug-hunt.ts:262-264** (bug)
  Potential race condition in the status action: if two concurrent status calls both observe `countTypedNodes(opened.storePath) === 0`, both will call `populateSessionStore`. If that function is not idempotent (e.g., creates duplicate entries), the session store will be corrupted. Consider adding a guard (e.g., a mutex or compare-and-swap flag) around the populate call, or document that `populateSessionStore` is safe to call multiple times.
  ```existing
  if (countTypedNodes(opened.storePath) === 0) {
          populateSessionStore(opened.storePath, scopeRoot);
        }
  ```

## src/omp/adapters/tsg.ts
- **src/omp/adapters/tsg.ts:105-108** (performance)
  Using `execFileSync` blocks the Node.js event loop for up to 180 seconds. If `facts()` is invoked from an async handler or under concurrent load, all other I/O and timers will stall for the duration. Consider using `execFile` (async) or wrapping in a worker thread. The 3-minute timeout makes this especially dangerous in a server context.
  ```existing
  out = execFileSync(bin, ["grep", "--json", "--threshold", "0.5", "--", subject, srcRoot], {
          encoding: "utf8",
          timeout: 180_000,
          maxBuffer: 32 * 1024 * 1024,
  ```
  ```suggested
  // Use async execFile or a worker thread to avoid blocking the event loop
        out = await new Promise<string>((resolve, reject) => {
          execFile(bin, ["grep", "--json", "--threshold", "0.5", "--", subject, srcRoot], {
            encoding: "utf8",
            timeout: 180_000,
            maxBuffer: 32 * 1024 * 1024,
            env: { ...process.env, TYPESAFE_API_KEY: key },
          
  ```

## src/omp/kernel-v2.ts
- **src/omp/kernel-v2.ts:279-282** (bug)
  `worstOutcome` calls `Array.prototype.reduce` without an initial value. When `outcomes` is an empty array, this throws a `TypeError: Reduce of empty array with no initial value`. The `KernelInput.detectors` field is typed as `readonly Detector[]` (or `undefined`), so a caller can pass `[]`, which flows through `classifyByDetectors` → `worstOutcome` and crashes the kernel.
  ```existing
  export function worstOutcome(
  outcomes: readonly { detector: Detector; outcome: DetectorVerdict }[],
): { detector: Detector; outcome: DetectorVerdict } {
  return outcomes.reduce((a, b) => {
  ```
  ```suggested
  export function worstOutcome(
  outcomes: readonly { detector: Detector; outcome: DetectorVerdict }[],
): { detector: Detector; outcome: DetectorVerdict } {
  if (outcomes.length === 0) {
    throw new Error("worstOutcome requires at least one outcome");
  }
  return outcomes.reduce((a, b) => {
  ```

## src/omp/layer-registry.ts
- **src/omp/layer-registry.ts:0-0** (bug)
  **Bug: Non-array `facts()` returns contradictory verdict — `up: true` yet `verdict: 'GI_LAYER_DOWN'`**

When `p.facts(subject)` returns a non-array value, `auditOne` sets `up: true` (the probe *did* answer) but returns `verdict: 'GI_LAYER_DOWN'` with evidence `'facts() returned a NON-ARRAY — DOWN by construction'`. This directly contradicts the module's own fault taxonomy documented in the interface and comments: `GI_LAYER_DOWN` means "the substrate does not answer" — but here it *did* answer, it just returned an unexpected shape. This conflates two distinct fault classes (`GI_LAYER_DOWN` = absent substrate vs. malformed response). Per the module's own design philosophy (DPL1 §7 A6), these must never be conflated.

Suggested fix: use a distinct verdict for this case, e.g. `GI_LAYER_ERROR:${p.id}`, consistent with how `facts()` throwing is handled — both are mid-query faults, not substrate absence.
  ```existing
  let raw: LayerFact[] = [];
    try {
      const got = p.facts(subject) as unknown;
      raw = Array.isArray(got) ? (got.filter((f) => f !== null && typeof f === "object") as LayerFact[]) : [];
      if (!Array.isArray(got)) {
        return {
          consumer: p.id, rung: p.rung, up: true,
          evidence: "facts() returned a NON-ARRAY — DOWN by construction",
          factsReturned: 0, fa
  ```
- **src/omp/layer-registry.ts:0-0** (bug)
  **Consistency: `auditOne` and `factsFor` have divergent defensive logic for the same probes, risking two inconsistent views of the same consumer set**

`auditOne` (lines 122-167) and `factsFor` (lines 168-187) both independently call `p.up()` and `p.facts(subject)` with different shape-validation strategies:

- `auditOne` validates the `up()` return with a thorough null/shape check (lines 125-128) and normalizes the result; `factsFor` uses a simpler `typeof rawProbe !== 'object' || rawProbe === null || ... .up !== true` (lines 177-179).
- `auditOne` handles non-array `facts()` with an explicit early return and a dedicated verdict; `factsFor` silently `continue`s.
- `auditOne` filters facts with `f !== null && typeof f === 'object'`; `factsFor` uses the same filter but then relies on `isAnchored` afterward.

For a stateful or side-effectful probe (e.g., one that reads from a file or cache that changes between calls), calling `up()` and `facts()` twice — once in `audit()` and once in `factsFor()` — could yield different results, making the two views (`audit` verdicts vs. `factsFor` contributions) disagree. This undermines the registry's core guarantee: that the decision's view (`factsFor`) is consistent with the audit verdicts.

Suggested fix: compute `audit()` results once and derive `factsFor` from cached `ConsumptionReport` data, or at minimum document that probes must be pure/idempotent.
  ```existing
  factsFor(subject: string): LayerFact[] {
      const out: LayerFact[] = [];
      for (const p of byId.values()) {
        try {
          const rawProbe: unknown = p.up();
          if (typeof rawProbe !== "object" || rawProbe === null || (rawProbe as { up?: unknown }).up !== true) continue;
          const got: unknown = p.facts(subject);
          if (!Array.isArray(got)) continue;
          fo
  ```

## src/scoping/scope-binding.ts
- **src/scoping/scope-binding.ts:138-140** (bug)
  Bug: `ownsWave` does not use longest-prefix matching, contradicting the fix intent of F-207. When a wave ID like `wave-extra-123` is checked against two bindings (`wave-extra-` and `wave-`), `ScopeBindingImpl.ownsWave` returns `true` for BOTH because both prefixes are prefixes of the id. `ownerOf` in the manager correctly sorts longest-first and picks `wave-extra-`, but any direct caller of `ownsWave` (e.g. `assertOwnWave`, or external code calling `binding.ownsWave(id)`) gets the wrong answer for the `wave-` binding. Similarly, `isForeignWave` correctly resolves ownership via longest match, but `assertOwnWave` only calls `ownsWave` first — if `ownsWave` returns true for the wrong binding, the assertion passes incorrectly. Fix: `ownsWave` should check that no longer-registered prefix is a better match (i.e. the wave starts with this binding's prefix AND does NOT start with any longer prefix that is also registered).
  ```existing
  ownsWave(waveId: string): boolean {
    return typeof waveId === 'string' && waveId.startsWith(this.wavePrefix);
  }
  ```
  ```suggested
  ownsWave(waveId: string): boolean {
    if (typeof waveId !== 'string') return false;
    if (!waveId.startsWith(this.wavePrefix)) return false;
    // F-207: reject if a LONGER registered prefix is a better (more specific) match.
    for (const prefix of this.allPrefixes()) {
      if (prefix.length > this.wavePrefix.length && prefix.startsWith(this.wavePrefix) && waveId.startsWith(prefix)) {
   
  ```
