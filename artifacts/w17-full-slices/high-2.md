# HIGH slice 2 — 7 findings across 6 files

## src/hunter/harness/map.ts
- **src/hunter/harness/map.ts:77-77** (security)
  Path traversal risk: `profile.project.root` is used directly in `path.join` to construct the database path without any sanitization. If `root` contains `..` segments (e.g., `/some/path/../../etc`), the resulting `dbPath` could point outside the expected `.trident/knowledge-graph/` directory, potentially overwriting arbitrary files. Consider normalizing and validating that the resolved path stays within an expected parent directory.
  ```existing
  const dbPath = path.join(profile.project.root, '.trident', 'knowledge-graph', 'shared.db');
  ```
  ```suggested
  const resolved = path.resolve(profile.project.root, '.trident', 'knowledge-graph', 'shared.db');
  // Guard: ensure the resolved path doesn't escape the project root
  const projectRoot = path.resolve(profile.project.root);
  if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
    throw new Error(`map actor: resolved dbPath escapes project root (${resolved})`);
  }
  co
  ```

## src/hunter/surface/lsp-injector.ts
- **src/hunter/surface/lsp-injector.ts:166-171** (bug)
  Non-transactional DB reads in `diagnosticsFromDb`: Three separate SQL queries (AUDIT_DONE lookup, HUNT_DONE lookup, then findings + graph_facts) execute outside any transaction. A concurrent write (e.g., a new HUNT_DONE event arriving between the second and third queries) can produce an inconsistent snapshot — the runId from the old HUNT_DONE is used to query findings, but new findings for a new run are already present. Consider wrapping these reads in a single transaction or using a single correlated subquery.
  ```existing
  const auditRow = rowAs<{ payload?: string }>(
        this.db!.prepare(
          "SELECT payload FROM events WHERE kind = 'AUDIT_DONE' ORDER BY id DESC LIMIT 1",
        ).get(),
        'AUDIT_DONE row',
      );
  ```
- **src/hunter/surface/lsp-injector.ts:0-0** (bug)
  Race condition in `acquireWriteLock`: `this.pausedByWriteLock = !this.pausedFlag` reads `pausedFlag` and then `pause()` sets it to `true`, but there is no atomicity guarantee. If an external caller calls `pause()` between the flag read and the `this.pause()` call inside `acquireWriteLock`, `pausedByWriteLock` will be `true` (because the external pause was not yet visible), and a subsequent `releaseWriteLock` will call `resume()`, undoing the external pause. This is an inherent single-threaded-event-loop race in microtask interleaving.
  ```existing
  acquireWriteLock(): void {
    if (this.writeLock) throw new EngineError(GRAPH_UPDATE_CONFLICT, `${GRAPH_UPDATE_CONFLICT}: a write is already in progress — the watcher is paused`);
    this.writeLock = true;
    this.pausedByWriteLock = !this.pausedFlag;
    this.pause();
  }
  ```

## src/hunter/tools/query-registration.ts
- **src/hunter/tools/query-registration.ts:58-58** (bug)
  `openSessionStore` is called with `callerSessionId: args.sessionId`, making `callerSessionId` always equal to `sessionId`. If the scope-checking logic in `openSessionStore` is supposed to verify that the *calling* session is authorized to access the *target* session's store, passing the same value defeats the purpose — an attacker-controlled `args.sessionId` will always pass the check against itself. Verify that `openSessionStore` expects the actual caller identity from a trusted source (e.g., a request context or process identity) rather than a user-supplied field.
  ```existing
  const opened = openSessionStore({ sessionId: args.sessionId, scopeRoot: args.scopeRoot, callerSessionId: args.sessionId });
  ```
  ```suggested
  // callerSessionId should come from a trusted source, not from user-supplied args:
const callerId = getCallerSessionId(); // or however the trusted identity is obtained
const opened = openSessionStore({ sessionId: args.sessionId, scopeRoot: args.scopeRoot, callerSessionId: callerId });
  ```

## src/kernel/scan-chain.ts
- **src/kernel/scan-chain.ts:64-67** (bug)
  **Permanent cached auth failure — no retry or TTL.** `readAuthFile()` sets `cachedAuth = null` on the first read failure (line ~63). Because `null !== undefined`, every subsequent call for the entire process lifetime returns `{}`, permanently剥夺 the chain of OpenRouter and NVIDIA keys. If `auth.json` is temporarily locked, missing at cold start, or not yet written by another process, the scan chain silently loses 5 of 6 rungs with no recovery path. Add a TTL-based cache expiry (e.g., re-attempt the read after N seconds) or a per-attempt read for the `null` case.
  ```existing
  } catch {
    cachedAuth = null;
    return {};
  }
  ```
  ```suggested
  } catch {
    // Don't cache permanent failure — allow retry on next call (e.g., cold start race)
    cachedAuth = undefined;
    return {};
  }
  ```

## src/omp/evidence-producer.ts
- **src/omp/evidence-producer.ts:216-216** (bug)
  `laterEditFromGraph` emits a record with `target: r.file` (the actual file path from the database), but the oracle's `gather` function (oracle.ts:277) does strict equality: `r.target !== subject.target`. When the subject's target is a symbol name, a directory prefix, or any string that doesn't exactly equal the matched file path, the graph-derived record is silently discarded by the oracle — making this fallback dead code for non-file-path subjects.

Additionally, the LIKE `%target%` query matches by substring (e.g. subject `"app"` matches file `"application.js"`), so `r.file` can be an entirely unrelated file whose name happens to contain the target string. The `touches()` function in this file has careful boundary-aware matching (F-264 fix), but `laterEditFromGraph` bypasses it entirely.

Suggestions:
1. Set `target: subject.target` (not `r.file`) when the graph match is by `label` rather than `file`, so the oracle's exact-match gate passes.
2. Consider applying boundary-aware matching or at minimum a more constrained LIKE (e.g. `target LIKE ? ESCAPE '\\' || '%'` or exact match on `file`) to reduce false evidence.
  ```existing
  +        target: r.file,
  ```
  ```suggested
  // The oracle (oracle.ts:277) does exact match: r.target === subject.target.
      // Use the subject's own target so the record passes the oracle's gate.
      // The file path is disclosed via `by: "graph:structural"` for audit.
      return {
        kind: "edit",
        at: new Date(indexedAt).toISOString(),
        target: subject.target,
        by: "graph:structural",
      };
  ```

## src/omp/populate-graphify.ts
- **src/omp/populate-graphify.ts:156-164** (maintainability)
  The hardcoded directory exclusion list `["node_modules", ".git", "dist", "build", "coverage", "__pycache__", "graphify-out", ".omp"]` and the file extension regex `/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/` (plus the `.d.ts` exclusion check) are duplicated verbatim in both `isGraphifyCheckoutFreshFor` (lines 135–143) and `hashSourceTree` (lines 247–255). If one is updated without the other, the freshness probe and the content-hash computation will enumerate different file sets, producing mismatched verdicts — the probe reports fresh while the hash differs, or vice versa, causing silent stale-serves or rebuild loops. Extract both the exclusion list and the file-matching predicate into a shared module-level constant (e.g. `INDEXED_EXCLUDED_DIRS` and `isIndexableFile(entry)`) and use them in both walks.
  ```existing
  if (["node_modules", ".git", "dist", "build", "coverage", "__pycache__", "graphify-out", ".omp"].includes(entry.name)) continue;
        if (excludes.includes(entry.name)) continue;
        // dirs walk free: do not count directories toward budget
        walk(path.join(dir, entry.name));
      } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name
  ```
  ```suggested
  // Extract to module scope (single source of truth for both probe and hash):
const INDEXED_EXCLUDED_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", "__pycache__", "graphify-out", ".omp"]);
const INDEXED_FILE_RE = /\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/;

// Then in both walks:
if (INDEXED_EXCLUDED_DIRS.has(entry.name)) continue;
if (excludes.includes(entr
  ```
