# HIGH slice 1 — 5 findings across 4 files

## src/hydra/auditor.ts
- **src/hydra/auditor.ts:189-192** (security)
  The grep tool (both `rg` and `grep -r` fallback) follows symlinks by default when traversing directories inside `targetRoot`. Unlike the `read` tool (which uses `isWithinRoot` + `O_NOFOLLOW`) and the `write_findings` tool (which validates the pinned path against `ledgerDir` + `O_NOFOLLOW`), the grep tool has NO symlink containment. A symlink inside targetRoot pointing to `/etc/shadow` or any external directory would yield matches (and printed file paths) from outside the containment boundary. This is the only tool in the belt that leaks data through symlinks.

Suggestion: After grep returns, filter output lines to only include those whose file path resolves inside targetRoot (a post-hoc containment gate), or use `rg --no-follow` / `grep -P` equivalents where feasible, or run the grep in a subprocess with a chroot/namespace constraint.
  ```existing
  let out = await run("rg", ["-n", "--max-count", String(maxResults), "--", pattern, targetRoot]);
      if (out.startsWith("SEARCH_FAILED") || out.length === 0) {
        out = await run("grep", ["-rn", "-E", "-m", String(maxResults), "--", pattern, targetRoot]);
      }
  ```

## src/omp/adapters/kev.ts
- **src/omp/adapters/kev.ts:119-120** (bug)
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
- **src/omp/adapters/kev.ts:107-112** (performance)
  The synchronous `execFileSync` with a 120-second timeout blocks the calling thread entirely. In any concurrent or server-based probe runner, a slow or hung CLI process will block the event loop for up to two minutes, creating a denial-of-service risk for other probes. The F-1206 NOTE acknowledges this as deferred, but it remains a live issue. The recommended mitigation is to migrate `facts()` to an async signature and use `execFile` (callback/promise-based), or offload to a worker thread.
  ```existing
  out = execFileSync(process.execPath, [cli, "--json", JSON.stringify({ state: buildState(scopeRoot, subject), questions: [MEANING_QUESTION] })], {
          encoding: "utf8",
          timeout: 120_000,
          maxBuffer: 8 * 1024 * 1024,
          cwd: scopeRoot,
        });
  ```

## src/omp/gate-middleware.ts
- **src/omp/gate-middleware.ts:112-112** (bug)
  `runGraphGate` reads `process.env.GI_ALLOW_NO_STORE` directly (line ~101) instead of accepting a configurable `env` parameter like `resolveDial` does. This inconsistency means: (1) the bypass decision cannot be unit-tested without mutating the global `process.env`, (2) concurrent test runs can interfere with each other, and (3) the gate's security-relevant behavior (fail-closed vs bypass) is harder to verify in isolation. Consider threading the same `env` parameter through `GateInput` or as a second argument, consistent with `resolveDial`'s pattern.
  ```existing
  if ((process.env.GI_ALLOW_NO_STORE ?? "") === "1") {
  ```
  ```suggested
  // Add env to GateInput or pass as parameter:
    if ((input.env?.GI_ALLOW_NO_STORE ?? process.env.GI_ALLOW_NO_STORE ?? "") === "1") {
  ```

## src/omp/populate.ts
- **src/omp/populate.ts:82-84** (bug)
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
