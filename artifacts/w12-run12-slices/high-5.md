# HIGH slice 5 — 8 findings across 7 files

## src/hunter/graph/corbell-adapter.ts
- **src/hunter/graph/corbell-adapter.ts:217-217** (performance)
  `Atomics.wait()` blocks the calling thread entirely. In `defaultExec`, this is exported as a public `ExecFn` — if any production (non-test) caller invokes `defaultExec` with a timeout and hits a SQLITE_BUSY retry, the entire Node.js event loop freezes for up to 16 seconds per retry (worst case: 8 retries × 16s = 128s total freeze). This is acceptable for tests (which stub `ExecFn`) but dangerous if `defaultExec` is used in production async contexts. Consider adding a prominent runtime guard or switching to a non-blocking backoff (e.g., `setTimeout` + promise) for the public export path.
  ```existing
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, backoff);
  ```

## src/hunter/keys/go-key-pool.ts
- **src/hunter/keys/go-key-pool.ts:394-401** (bug)
  **Bug: `home === -1` branch UPDATE is silently overwritten by the subsequent UPSERT — displaced key's exile is always lost.**

The comment on lines 395-399 claims: "the UPSERT below cannot clobber it because it writes under the CURRENT keyid." This reasoning is incorrect. The UPSERT uses `ON CONFLICT(idx)` (line 404-405), which conflicts on the `idx` PRIMARY KEY, not on `keyid`. The UPDATE on line 400 sets `dead_until` on the row at `idx` (keyid = displaced.keyid), but the INSERT on line 403-406 immediately fires `ON CONFLICT(idx) DO UPDATE SET keyid = excluded.keyid, dead_until = excluded.dead_until`, overwriting the displaced key's row entirely.

Trace for `home === -1`:
1. Line 400: `UPDATE SET dead_until = max(old, until) WHERE keyid = X AND idx = N` → row at idx=N has (keyid=X, dead_until=max)
2. Line 403-406: `INSERT (idx=N, keyid=Y, dead_until=until) ON CONFLICT(idx) DO UPDATE SET keyid=Y, dead_until=until` → row at idx=N now has (keyid=Y, dead_until=until). Key X's exile is gone.

Impact: When a key is removed from GO_KEYS and later re-added, its rate-limit exile is silently lost. The still-limited key gets hammered. The F-512 fix's intent is not achieved.

Suggestion: To truly preserve an orphaned exile, either (a) store it in a separate table keyed by keyid, or (b) skip the UPSERT when the slot is occupied by a displaced orphan and use a different idx (e.g., a negative or high-range sentinel), or (c) accept that removed keys lose their exile and update the comment to reflect the actual behavior.
  ```existing
  } else {
          // ★ F-512 FIX (2026-09-24): a reload-removed key (home === -1) keeps its exile ATTACHED
          // ★ to the keyid instead of being deleted. The next reload that restores the key re-homes
          // ★ it (the home>=0 branch); deletion would hammer a still-limited key after a key-set edit.
          // ★ Keyed by keyid so a restored key re-attaches; the UPSERT below cannot cl
  ```

## src/hunter/shared/query-engine.ts
- **src/hunter/shared/query-engine.ts:369-370** (bug)
  SQL LIKE wildcard injection: User-supplied query is interpolated into `LIKE '%..%'` without escaping SQL wildcard characters (`%` and `_`). A query like `a_b` will match `axb`, `ayb`, etc., and `100%` will match any string containing `100`. This degrades search precision silently and could return unexpected results. Escape `%` and `_` in the trimmed query before wrapping.
  ```existing
  const like = `%${query.trim()}%`;
      const rows = this.db.prepare('SELECT canonical_id, label FROM typed_nodes WHERE superseded_run IS NULL AND (label LIKE ? OR canonical_id LIKE ? OR kind LIKE ?) LIMIT ?').all(like, like, like, topK) as Array<{ canonical_id: string; label: string }>;
  ```
  ```suggested
  const escaped = query.trim().replace(/%/g, '\\%').replace(/_/g, '\\_');
      const like = `%${escaped}%`;
      const rows = this.db.prepare('SELECT canonical_id, label FROM typed_nodes WHERE superseded_run IS NULL AND (label LIKE ? ESCAPE '\\' OR canonical_id LIKE ? ESCAPE '\\' OR kind LIKE ? ESCAPE '\\') LIMIT ?').all(like, like, like, topK) as Array<{ canonical_id: string; label: string }>;
  ```

## src/kernel/scan-chain.ts
- **src/kernel/scan-chain.ts:138-143** (bug)
  **Resource leak risk on non-ok HTTP responses**: When `response.ok` is false, `response.text()` is called to read the error body, but this is wrapped in a try/catch that silently ignores failures. If `response.text()` throws (e.g., the body stream is interrupted or the connection drops mid-read), the response body is not fully drained. In Node.js `fetch`, undrained response bodies prevent the underlying TCP connection from being returned to the agent pool. With up to 30 requests per chain run, this can exhaust connections. Ensure the body is always consumed, even if the read fails.
  ```existing
  if (!response.ok) {
      clearInterval(stallTimer);
      let detail = "";
      try { detail = (await response.text()).slice(0, 200); } catch { /* body unreadable — status alone is the signal */ }
      return { ok: false, reason: `SCAN_HTTP_${response.status}: ${response.statusText ?? ""}${detail ? ` — ${detail}` : ""}` };
    }
  ```
  ```suggested
  if (!response.ok) {
      clearInterval(stallTimer);
      let detail = "";
      try { detail = (await response.text()).slice(0, 200); } catch {
        try { await response.body?.cancel(); } catch { /* best-effort drain */ }
      }
      return { ok: false, reason: `SCAN_HTTP_${response.status}: ${response.statusText ?? ""}${detail ? ` — ${detail}` : ""}` };
    }
  ```

## src/omp/adapters/semantica.ts
- **src/omp/adapters/semantica.ts:0-0** (bug)
  The F-825 type guard (line 74) validates that `kg.entities` is an array, but does not validate individual element shapes. If a corrupted or adversarial kg.json contains an entity where `name` is a number, boolean, or object (e.g. `{"name": 42}`), the `??` on line 77 does not trigger (the value is not null/undefined), and `.includes()` is called on a non-string — throwing `TypeError: e.name.includes is not a function`. This crashes the entire `facts()` call mid-query, turning what should be a single bad entry into a GI_LAYER_ERROR verdict for the whole consumer.

Suggested fix: add an element-level type check in the filter, or validate each entity's shape before consumption.
  ```existing
  const hits = (kg.entities ?? []).filter((e) => (e.name ?? ).includes(subject));
  ```
  ```suggested
  const hits = (kg.entities ?? []).filter((e) => {
        if (e === null || typeof e !== "object" || typeof e.name !== "string") return false;
        return e.name.includes(subject);
      });
  ```
- **src/omp/adapters/semantica.ts:0-0** (security)
  The `..` segment check on line 18 uses `scopeRoot.split(path.sep)`, which is `\` on Windows. A forward-slash path like `C:/foo/../etc` would not be split correctly — `path.sep` is `\`, so the split yields `['C:/foo/../etc']` and the `..` check passes. Although `path.resolve` normalizes the path afterward, the defensive check intended to catch lexical traversal is silently bypassed on Windows with mixed separators.

Suggested fix: normalize separators before splitting, or check against both `/` and `\` separators.
  ```existing
  if (!path.isAbsolute(scopeRoot) || scopeRoot.split(path.sep).includes("..") ) throw new Error(`GI_LAYER_SEMANTICA: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  ```
  ```suggested
  const normalizedSep = scopeRoot.replaceAll(/[/\\]/g, path.sep);
  if (!path.isAbsolute(scopeRoot) || normalizedSep.split(path.sep).includes("..") ) throw new Error(`GI_LAYER_SEMANTICA: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  ```

## src/omp/hard-deps.ts
- **src/omp/hard-deps.ts:330-330** (bug)
  `join` filters out zero-length strings before joining. When `scopeRoot` is `""`, every `join(cfg.scopeRoot, ...)` produces a bare relative path like `.omp/graph-intelligence/layers/semantica`. This resolves against `process.cwd()` at probe time — silently UP on a machine whose CWD contains that structure, DOWN on others. The hard-dependency philosophy requires an explicit, loud failure when `scopeRoot` is missing, not a CWD-dependent guess. Add a guard that rejects an empty `scopeRoot` at the top of `buildRegister`.
  ```existing
  const join = (...parts: string[]): string => parts.filter((p) => p.length > 0).join("/").replace(/\/{2,}/g, "/");
  ```
  ```suggested
  if (!cfg.scopeRoot) {
    throw new Error("REGISTER_CONFIG: scopeRoot is required — an empty scope root would produce relative paths that resolve against CWD, not a loud failure");
  }
  const join = (...parts: string[]): string => parts.filter((p) => p.length > 0).join("/").replace(/\/{2,}/g, "/");
  ```

## src/omp/populate.ts
- **src/omp/populate.ts:138-139** (bug)
  The original exception `e` is discarded when re-wrapping as a new Error. The original stack trace, cause chain, and any structured error properties are lost, making production debugging significantly harder. Use `{ cause: e }` to preserve the original exception.
  ```existing
  } catch (e) {
      throw new Error(`GRAPHIFY_WRITE_FAILED: session store write for ${resolvedRoot} did not commit (${e instanceof Error ? e.message : String(e)})`);
  ```
  ```suggested
  } catch (e) {
      throw new Error(`GRAPHIFY_WRITE_FAILED: session store write for ${resolvedRoot} did not commit (${e instanceof Error ? e.message : String(e)})`, { cause: e });
  ```
