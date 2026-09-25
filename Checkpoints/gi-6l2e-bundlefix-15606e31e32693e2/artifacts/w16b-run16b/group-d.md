# R16 group D — 6 findings across 5 files

## src/omp/populate-graphify.ts
- **src/omp/populate-graphify.ts:174-195** (high · bug)
  **`walkFailed` check at line 174 is dead code — walk failures are silently ignored.**

The check `if (walkFailed) return { fresh: false, reason: "stale-read-failed" }` is placed at line 174, AFTER the `walk` function definition but BEFORE the `for` loop at line 175 that actually calls `walk()`. Since `walkFailed` is only set to `true` inside `walk()` (line 144), and `walk()` is only invoked from line 190 inside the scope loop, `walkFailed` is always `false` when checked at line 174.

After `walk()` sets `walkFailed = true` during the scope loop, the flag is never checked again. The probe continues and may reach the mtime comparison (line 205) based on partial data, potentially reporting "fresh" when a directory that failed `realpathSync` contained newer files.

The `stale-read-failed` reason was clearly intended as a fail-closed path (per the F-846 FIX comment), but it can never be reach
  ```existing
  if (walkFailed) return { fresh: false, reason: "stale-read-failed" };
  for (const rel of scope) {
    const target = containedScopeTarget(root, rel);
    if (target === null) continue;
    // V21 cleanup fix-now: a scope entry may be a FILE — stat it directly
    // (walk() on a file throws ENOTDIR and silently counted nothing).
    let stTarget: fs.Stats | null = null;
    try { stTarget = fs.st
  ```
  ```suggested
  for (const rel of scope) {
    const target = containedScopeTarget(root, rel);
    if (target === null) continue;
    let stTarget: fs.Stats | null = null;
    try { stTarget = fs.statSync(target); } catch { stTarget = null; }
    if (stTarget?.isFile()) {
      const base = path.basename(target);
      if (excludes.includes(base)) continue;
      if (stTarget.mtimeMs > newest) newest = stTarget.m
  ```
- **src/omp/populate-graphify.ts:296-307** (high · bug)
  **`hashSourceTree` walk does NOT skip files matching `excludes` — inconsistency with `isGraphifyCheckoutFreshFor`.**

In `isGraphifyCheckoutFreshFor` (line 164), the file branch checks `if (excludes.includes(entry.name)) continue;` before counting the file toward the budget and mtime. But in `hashSourceTree` (lines 296-307), the file branch has NO such check — all matching extension files are hashed regardless of `excludes`.

This means a user-configured `excludes` entry for a file (e.g. `"debug-helper.ts"`) will:
1. Be skipped by the freshness probe's mtime walk (not triggering staleness via mtime)
2. Still be included in the content hash (triggering `stale-content` if it changes)

The net effect is that excluding a file by name does NOT prevent it from invalidating the content hash sidecar, undermining the purpose of the `excludes` configuration. Add `if (excludes.includes(entry.name))
  ```existing
  } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        budget.n--;
        try {
          const stat = fs.statSync(path.join(dir, entry.name));
          hashFile(path.join(dir, entry.name), `${prefix}${entry.name}`, stat.size);
        } catch {
          // frozen-scan HIGH: an unreadable file is NOT silently omitted
  ```
  ```suggested
  } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        if (excludes.includes(entry.name)) {
          hash.update(`skip-excluded:${prefix}${entry.name}\n`);
          continue;
        }
        budget.n--;
        try {
          const stat = fs.statSync(path.join(dir, entry.name));
          hashFile(path.join(dir, en
  ```

## src/hydra/pipeline.ts
- **src/hydra/pipeline.ts:121-125** (high · bug)
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

## src/omp/gate-middleware.ts
- **src/omp/gate-middleware.ts:112-112** (high · bug)
  `runGraphGate` reads `process.env.GI_ALLOW_NO_STORE` directly (line ~101) instead of accepting a configurable `env` parameter like `resolveDial` does. This inconsistency means: (1) the bypass decision cannot be unit-tested without mutating the global `process.env`, (2) concurrent test runs can interfere with each other, and (3) the gate's security-relevant behavior (fail-closed vs bypass) is harder to verify in isolation. Consider threading the same `env` parameter through `GateInput` or as a second argument, consistent with `resolveDial`'s pattern.
  ```existing
  if ((process.env.GI_ALLOW_NO_STORE ?? "") === "1") {
  ```
  ```suggested
  // Add env to GateInput or pass as parameter:
    if ((input.env?.GI_ALLOW_NO_STORE ?? process.env.GI_ALLOW_NO_STORE ?? "") === "1") {
  ```

## src/omp/populate-corbell.ts
- **src/omp/populate-corbell.ts:110-112** (high · bug)
  In `isCorbellCheckoutFreshFor`, when `fs.statSync` throws on an individual source file (line 128 catch block), `walkFailed` is not set — the file is silently skipped. If the most recently modified source file is unreadable (e.g., permission denied, broken symlink), `newest` stays artificially low and the function reports `fresh`. This is a false-fresh bug: a changed-but-unreadable source doesn't trigger staleness. Since unreadable directories already set `walkFailed`, files with matched extensions should follow the same fail-closed discipline.
  ```existing
  const m = fs.statSync(path.join(dir, entry.name)).mtimeMs;
          if (m > newest) newest = m;
        } catch { /* unreadable file — skip */ }
  ```
  ```suggested
  const m = fs.statSync(path.join(dir, entry.name)).mtimeMs;
          if (m > newest) newest = m;
        } catch {
          // Unreadable source file: fail-closed (same as unreadable dir).
          // If the newest file can't be stat'd, we cannot confirm freshness.
          walkFailed = true;
          return;
        }
  ```

## src/scoping/scope-binding.ts
- **src/scoping/scope-binding.ts:158-160** (high · security)
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
