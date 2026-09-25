# HIGH slice 3 — 12 findings across 10 files

## src/hunter/diagnostics/fixture-calibration.ts
- **src/hunter/diagnostics/fixture-calibration.ts:147-147** (security)
  `manifest.sourceFile` is read directly from untrusted fixture JSON and used in `path.join(dir, manifest.sourceFile)` to construct a file path. A malicious or malformed manifest could set `sourceFile` to `../../etc/passwd` (path traversal), causing reads outside the fixture directory. Validate that the resolved path stays within the fixture dir.
  ```existing
  const source = fs.readFileSync(path.join(dir, manifest.sourceFile), 'utf8');
  ```
  ```suggested
  const resolvedSource = path.resolve(dir, manifest.sourceFile);
  if (!resolvedSource.startsWith(path.resolve(dir) + path.sep) && resolvedSource !== path.resolve(dir)) {
    throw new Error(`CALIBRATION_FIXTURE_INVALID: sourceFile '${manifest.sourceFile}' escapes fixture dir`);
  }
  const source = fs.readFileSync(resolvedSource, 'utf8');
  ```

## src/hunter/graph/merge.ts
- **src/hunter/graph/merge.ts:113-116** (bug)
  Semantic triples are not deduplicated by key. Mechanical triples are deduplicated via `seenMechanicalKeys` (lines 105-108), but the semantic loop (line 116) iterates over all semantic triples without any key-based dedup. If two semantic triples share the same subject|predicate|object key (e.g. extracted by overlapping sources), both will be pushed into `merged`, producing duplicate output rows. Add a `seenSemanticKeys` set analogous to the mechanical one, or deduplicate `semantic` before the loop.
  ```existing
  for (const s of semantic) {
    const k = tripleKey(s);
    const pair = subjectObjectKey(s);
    const mechExact = index.byKey.get(k);
  ```
  ```suggested
  const seenSemanticKeys = new Set<string>();
  for (const s of semantic) {
    const k = tripleKey(s);
    if (seenSemanticKeys.has(k)) continue;
    seenSemanticKeys.add(k);
    const pair = subjectObjectKey(s);
    const mechExact = index.byKey.get(k);
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

## src/hunter/harness/report.ts
- **src/hunter/harness/report.ts:282-288** (bug)
  If `COMMIT` fails (e.g., disk full, I/O error), the transaction remains open on the `DbClient` handle. Unlike the inner DB operation block which has explicit ROLLBACK handling, the COMMIT path has no error recovery. A subsequent operation on this handle could silently operate inside the stale transaction or fail in confusing ways.

Suggested fix: wrap the COMMIT in a try/catch and attempt ROLLBACK on failure, throwing a descriptive error.
  ```existing
  } catch (dbErr: unknown) {
      try { input.db.exec('ROLLBACK'); } catch (rbErr: unknown) {
        throw new Error(`REPORT_ROLLBACK_FAILED: batch error=${dbErr instanceof Error ? dbErr.message : String(dbErr)} rollback error=${rbErr instanceof Error ? rbErr.message : String(rbErr)} (the transaction may still be open — do not reuse this handle for writes)`);
      }
      throw dbErr;
    }
    i
  ```
  ```suggested
  } catch (dbErr: unknown) {
      try { input.db.exec('ROLLBACK'); } catch (rbErr: unknown) {
        throw new Error(`REPORT_ROLLBACK_FAILED: batch error=${dbErr instanceof Error ? dbErr.message : String(dbErr)} rollback error=${rbErr instanceof Error ? rbErr.message : String(rbErr)} (the transaction may still be open — do not reuse this handle for writes)`);
      }
      throw dbErr;
    }
    t
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

## src/omp/ripwire-bridge.ts
- **src/omp/ripwire-bridge.ts:156-160** (bug)
  `Number()` can return `NaN` when the external binary's output drifts (e.g. `j.reaches` is a non-numeric string or absent in an unexpected format). NaN silently propagates into the `data` record and summary strings (e.g. `"impact_reaches=NaN"`). Add validation or a safe-parse helper: `const safeNum = (v: unknown, fallback: number) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; }` and use it consistently instead of bare `Number()`.
  ```existing
  const reaches = Number(j.reaches ?? 0);
  return {
    present: true, ok: true,
    summary: `impact_reaches=${reaches} radius_untested=${String(j.radius_untested ?? "?")}`,
    data: { reaches, radius_tested: j.radius_tested, radius_untested: j.radius_untested },
  ```

## src/scoping/gi-session-path.ts
- **src/scoping/gi-session-path.ts:100-101** (bug)
  Inconsistent session ID padding/truncation between `resolveSessionId` and `sessionStorePath` can produce different final IDs for the same input, breaking the implicit contract that the resolved ID can be directly used with `sessionStorePath`.

In `resolveSessionId`, the ID is truncated to 24 chars *first* (`slice(0, 24)`) and *then* padded (`(id + "-xxxxxxxx").slice(0, 8)`). In `sessionStorePath`, it is padded *first* (`(sid + "xxxxxxxx").slice(0, 8)`) and never truncated.

Example: `resolveSessionId` with a 24-char slug produces `"scope-XXXXXXXXXXXXXXXXXXXX"` (24 chars). If that same 24-char string is later passed to `sessionStorePath`, `sessionKey` takes the last 24 chars (losing the "scope-" prefix), then pads — yielding a completely different ID.

Recommendation: centralize the ID canonicalization in a single function (e.g. `canonicalizeSessionId`) and use it in both code paths to ensure a resolved ID round-trips through `sessionStorePath` identically.
  ```existing
  let id = (`scope-${slug}`).slice(0, 24);
  if (id.length < 8) id = (id + "-xxxxxxxx").slice(0, 8);
  ```
  ```suggested
  // Shared canonicalization — used by both resolveSessionId and sessionStorePath
export function canonicalizeSessionId(raw: string): string {
  let id = raw.slice(-24);
  if (!id) return "";
  if (id.length < 8) id = (id + "xxxxxxxx").slice(0, 8);
  return id;
}
  ```
- **src/scoping/gi-session-path.ts:24-24** (security)
  The `SESSION_STORE_RE` regex does not anchor at the start of the string. After normalization (replacing backslashes), the pattern `/sessions/[A-Za-z0-9_-]{8,24}/store\.sqlite$` would match a relative path such as `evil/sessions/12345678/store.sqlite` or `sessions/12345678/store.sqlite`.

While the *normal* call-site (`sessionStorePath`) always constructs an absolute path via `path.join(scopeRoot, ...)`, `assertSessionStorePath` is a public exported function. Any external caller passing a relative path would pass the check but `path.resolve` would resolve it relative to `process.cwd()`, potentially allowing containment bypass.

Recommendation: anchor the regex with `^` and require a path separator before `sessions` (e.g. `^/[\w./-]+/sessions/...` or at minimum `(^|/)sessions/...` + a final `/` check) to ensure the test validates an absolute, session-scoped path.
  ```existing
  const SESSION_STORE_RE = /\/sessions\/[A-Za-z0-9_-]{8,24}\/store\.sqlite$/;
  ```
  ```suggested
  const SESSION_STORE_RE = /\/[\w.-]+\/sessions\/[A-Za-z0-9_-]{8,24}\/store\.sqlite$/;
  ```
