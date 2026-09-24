# HIGH slice 4 — 10 findings across 8 files

## src/hunter/firewall/readonly.ts
- **src/hunter/firewall/readonly.ts:166-170** (bug)
  **Quoted-argument tokenization produces incorrect `secondToken`, breaking git/sed routing.**

`parseCommand` splits on `\s+` without respecting shell quotes, so `commit -m "fix"` tokenizes as `[commit, -m, "fix"]` with `secondToken = "-m"` instead of the message. For `sed -n '1,20p'`, tokenization happens to work because `-n` is unquoted, but for `sed -n "1,20p"`, `secondToken` becomes `"1,20p"` (with the quote character), so `routeSed` returns `'MUTATION'` and a legitimate read-only sed command is incorrectly blocked.

More critically, for a command like `node -e "execSync('rm -rf /')"`, tokenization yields `secondToken = '-e'` — this works **by accident** because `-e` is not the dangerous part. But the `secondToken` value is semantically wrong and would break any future logic that inspects it (e.g., checking whether the argument to `-e` is a file path vs. inline code).

**Suggested fix:** Use a proper shell-aware tokenizer (e.g., a state machine tracking quote context) or use a regex like `/(?:[^\s"']+|"[^"]*"|'[^']*')+/g` to split tokens while respecting quotes.
  ```existing
  function parseCommand(command: string): ParsedCommand {
  const trimmed = command.trimStart();
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const firstToken = tokens[0] ?? '';
  const secondToken = tokens[1] ?? '';
  ```
  ```suggested
  function parseCommand(command: string): ParsedCommand {
  const trimmed = command.trimStart();
  // Shell-aware token split: respects single/double quotes so that
  // `sed -n "1,20p"` yields secondToken `"1,20p"` (the full quoted arg)
  // rather than a truncated/broken token.
  const tokenRe = /[^\s"']+|"[^"]*"|'[^']*'/g;
  const tokens = trimmed.match(tokenRe) ?? [];
  const firstToken = tokens
  ```
- **src/hunter/firewall/readonly.ts:252-257** (security)
  **`allowed()` and `blocked()` return plain object literals instead of `BashLockdownDecision` — type-safety gap allowing silent alias desync.**

The `allowed()` and `blocked()` helper functions construct return values as raw object literals with `string`-typed `state` and `triplet` fields, rather than using `BashLockdownDecision` as their return type annotation. This means:

1. TypeScript will not flag if `state` is set to a string that doesn't match `verdict` (e.g., `state: 'PARSED->ALLOW_READ'` vs. `state: 'ALLOW_READ'`).
2. The sibling `lexicon-types.ts` already has `makeLexiconDecision()` and `assertLexiconDecisionConsistent()` for exactly this purpose — the `F-850 FIX` comment in that file describes this desync class as a known risk.
3. Any downstream code that relies on `decision.state === decision.verdict` (the test alias contract) would silently receive `'PARSED->ALLOW_READ'` instead of `'ALLOW_READ'`.

**Suggested fix:** Either annotate the return type as `BashLockdownDecision` and set `state` to match `verdict`, or use `makeLexiconDecision` from `lexicon-types.ts`.
  ```existing
  function allowed(pattern: string, token: string, command: string): BashLockdownDecision {
  const mPSE: MPSE = { Pattern: pattern, State: 'PARSED->ALLOW_READ', Evidence: command };
  return {
    verdict: 'ALLOW_READ', state: 'ALLOW_READ', pattern, token, message: '', mPSE, triplet: mPSE,
  };
}
  ```
  ```suggested
  function allowed(pattern: string, token: string, command: string): BashLockdownDecision {
  const mPSE: MPSE = { Pattern: pattern, State: 'PARSED->ALLOW_READ', Evidence: command };
  return {
    verdict: 'ALLOW_READ', state: 'ALLOW_READ', pattern, token, message: '', mPSE, triplet: mPSE,
  };
}
// Note: `state` is set to match `verdict` above. The raw object literal is accepted
// by TypeScript b
  ```

## src/hunter/harness/micro-loop-machine.ts
- **src/hunter/harness/micro-loop-machine.ts:393-393** (bug)
  `handleDisposables` is declared as an array (line ~304) and iterated over in both `stop()` and `settle()` to perform cleanup of subscriptions, but it is **never populated anywhere**. No code ever calls `handleDisposables.push(...)`. This makes all cleanup logic that references this array dead code:

1. In `stop()`: the `for (const d of handleDisposables.splice(0))` loop never executes.
2. In `settle()`: the reverse-iteration removal loop (`for (let i = handleDisposables.length - 1; ...)`) never executes.

Meanwhile, subscriptions created in `done()` (`sub2`, `sub3`) are only managed by the local `settle()` function. If `stop()` is called while `done()` is pending, `sub2` and `sub3` remain subscribed and are never cleaned up — they leak.

**Suggestion**: Either add `handleDisposables.push(sub2)` / `handleDisposables.push(sub3)` after creating them in `done()` (so `stop()` can clean them up), or remove the `handleDisposables` array entirely and consolidate all subscription lifecycle management into a single mechanism.
  ```existing
  const handleDisposables: Array<{ unsubscribe(): void }> = [];
  ```
  ```suggested
  const handleDisposables: Array<{ unsubscribe(): void }> = [];
  // ... inside done():
        handleDisposables.push(sub2);
        handleDisposables.push(sub3);
  ```

## src/hunter/lexicon/compiled-store.ts
- **src/hunter/lexicon/compiled-store.ts:114-121** (bug)
  Error masking: the `finally` block runs after the `catch` block, which can cause error masking if `finalize()` throws and replaces the original exception. In `writeBattery`, `stmt.finalize()` runs inside an inner `try` before the outer `catch`, preserving the root cause. In `writeRuleCards`, the structural asymmetry is fragile despite individual try/catch guards. Recommend restructuring to match `writeBattery`'s pattern or at minimum log/swallow finalize errors to preserve the original exception.
  ```existing
  } finally {
    // ★ F-358 FIX (2026-09-24): finalize BOTH statements — same native-handle leak
    //   as writeBattery (the DELETE was an anonymous one-shot, never finalizable).
    // ★ F-823b FIX (2026-09-24): F-823 declared both as `| undefined` (they may not have been
    //   allocated when prepare itself throws) — so the finally must GUARD before finalizing.
    try { ins?.finalize(); } ca
  ```
  ```suggested
  } catch (e: unknown) {
    db.exec('ROLLBACK');
    throw e;
  } finally {
    try { ins?.finalize(); } catch { /* best-effort cleanup */ }
    try { del?.finalize(); } catch { /* best-effort cleanup */ }
  }
  ```

## src/hydra/client-reader.ts
- **src/hydra/client-reader.ts:95-99** (bug)
  `listTools()` and `callTool()` both call their respective transport methods (`await t.listTools()` and `await t.callTool(name, args ?? {})`) without any timeout guard, identical to the `attach()` and `disconnect()` hazard (F-611/F-612). A stalled or hung transport call in either method would block the caller indefinitely, holding the captured transport reference and deadlocking subsequent operations. Apply the same `Promise.race` timeout pattern used in `attach()`/`disconnect()` to both `listTools()` and `callTool()` for consistency with the F-611/F-612 rationale.
  ```existing
  try {
      return await t.listTools();
    } catch (err) {
      throw new Error(`GRAPHIFY_MCP_LIST_FAILED: ${String((err as Error).message ?? err)}`);
    }
  ```
  ```suggested
  try {
      return await Promise.race([
        t.listTools(),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('GRAPHIFY_LIST_TIMEOUT: listTools() exceeded 5000ms')), 5000)),
      ]);
    } catch (err) {
      throw new Error(`GRAPHIFY_MCP_LIST_FAILED: ${String((err as Error).message ?? err)}`);
    }
  ```

## src/omp/adapters/tsg.ts
- **src/omp/adapters/tsg.ts:123-131** (security)
  **Redaction bypass: only exact full-key and tail-8 partial matches are redacted, leaving first-N or middle portions of the key exposed.** The F-914 fix adds a tail-8 heuristic, but if the CLI or error path echoes the first 4+ characters, or a middle substring of the key, neither the exact split/join nor the tail heuristic will match. For example, a log that prints `key.slice(0, 12)` or a server-echoed context showing a prefix would survive redaction. Consider also redacting the first N characters (e.g., first 8) when key length >= 16, or using a regex-based approach that matches any contiguous 8+ character substring of the key.
  ```existing
  const redact = (s: string): string => {
          if (key === null || key.length === 0) return s;
          let out: string = s.split(key).join(key.slice(0, 4) + '...[redacted]');
          if (key.length >= 16) {
            const tail: string = key.slice(-8);
            if (tail.length >= 8) out = out.split(tail).join('...[redacted-tail]');
          }
          return out;
        };
  ```
  ```suggested
  const redact = (s: string): string => {
          if (key === null || key.length === 0) return s;
          // Exact full-key match (metachar-safe via split/join)
          let result: string = s.split(key).join(key.slice(0, 4) + '...[redacted]');
          if (key.length >= 16) {
            // Tail-8 heuristic (existing F-914 fix)
            const tail: string = key.slice(-8);
            if (t
  ```

## src/omp/fire-gate.ts
- **src/omp/fire-gate.ts:368-372** (bug)
  The MPSE negation regex is missing common affirmative action verbs. F-266 added `execut|perform|applied|deployed|shipped|complet|ran|went ahead|carried out`, but real-world slots use forms like "deleted", "removed", "destroyed", "dropped", "killed", "erased", "wiped", and "nuked" — none of which match. A slot like `"discussed removing the server and then deleted it"` passes `every()` because "deleted" is not matched by the affirmative regex, so the entire slot is treated as negated/discussion. The fire is settled IGNORE on a REAL violation. The comment says "F-266 FIX" but the verb list is incomplete — consider matching against the DESTRUCTIVE_COMMANDS vocabulary or broadening the affirmative regex.
  ```existing
  const onlyNegated = mentionsTarget.every((s) => {
      const t = s.text.toLowerCase();
      if (/(execut|perform|applied|deployed|shipped|complet|\bran\b|did (it|this|that)|went ahead|carried out)/.test(t)) return false;
      return /(not |never|won't|don't|without|skip|avoid|discuss|mention|about the rule)/.test(t);
    });
  ```
  ```suggested
  const onlyNegated = mentionsTarget.every((s) => {
      const t = s.text.toLowerCase();
      if (/(execut|perform|applied|deployed|shipped|complet|\bran\b|did (it|this|that)|went ahead|carried out|deleted|removed|destroyed|dropped|killed|erased|wiped|nuked)/.test(t)) return false;
      return /(not |never|won't|don't|without|skip|avoid|discuss|mention|about the rule)/.test(t);
    });
  ```

## src/omp/graph-gate.ts
- **src/omp/graph-gate.ts:315-321** (bug)
  **SQLite concurrency: no WAL mode or busy-timeout configured.**

`openSessionDb` opens a fresh `Database` connection on every `saveGateState`/`loadGateState` call without setting WAL journal mode or a busy timeout. Concurrent sessions writing to the same `storePath` can hit `SQLITE_BUSY` errors that propagate as unhandled exceptions (the `throw e` in `saveGateState`'s catch block). Bun's synchronous SQLite does not inherently serialize cross-process access.

Recommend enabling WAL mode and setting a busy timeout after opening the connection.
  ```existing
  function openSessionDb(storePath: string): Database {
  const dir = path.dirname(storePath);
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(storePath);
  db.exec(GATE_DDL);
  return db;
}
  ```
  ```suggested
  function openSessionDb(storePath: string): Database {
  const dir = path.dirname(storePath);
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(storePath);
  db.exec("PRAGMA journal_mode=WAL");
  db.exec("PRAGMA busy_timeout=5000");
  db.exec(GATE_DDL);
  return db;
}
  ```
- **src/omp/graph-gate.ts:253-255** (bug)
  **`substrateUnreachable` degradation is permanent — transient failures cause lasting gate suppression.**

Once `attempts > 0 && !resolvedAny` becomes true (e.g., a single transient network blip), the gate permanently degrades to T1 advisory for the rest of the session. Even if the substrate recovers and subsequent queries resolve, `resolvedAny` was captured as a snapshot and the gate never re-evaluates. The `substrateUnreachable` check should re-evaluate against the current query log rather than using a stale flag, or the gate should have a recovery path.
  ```existing
  const attempts = state.graphQueries.filter((q) => q.tool !== "reset").length;
  const resolvedAny = state.graphQueries.some((q) => q.resolved === true);
  const substrateUnreachable = attempts > 0 && !resolvedAny;
  ```
  ```suggested
  const attempts = state.graphQueries.filter((q) => q.tool !== "reset").length;
  const resolvedAny = state.graphQueries.some((q) => q.resolved === true);
  // Only treat substrate as unreachable if recent attempts (within the drift
  // window) all failed — a transient blip should not permanently suppress the gate.
  const recentWindow = now - DRIFT_WINDOW_MS;
  const recentAttempts = state.graphQu
  ```

## src/omp/ripwire-bridge.ts
- **src/omp/ripwire-bridge.ts:0-0** (bug)
  The ENOBUFS error code may not be emitted by all Node.js versions on maxBuffer overflow. In some Node.js versions the error code is `ERR_CHILD_PROCESS_STDIO_MAXBUFFER` (or the error object may not have a `.code` property at all). This means the TRUNCATED diagnostic could silently fall through to the generic `rawErr.message` path, producing a less informative 'query failed' leg instead of the intended 'TRUNCATED' label. Consider checking for both codes, or falling back to a heuristic (e.g. stdout.length >= RIPWIRE_MAX_BUFFER).
  ```existing
  execError = rawErr.code === "ENOBUFS"
      ? `TRUNCATED: stdout exceeded maxBuffer ${RIPWIRE_MAX_BUFFER}B — ${rawErr.message}`
      : rawErr.message;
  ```
  ```suggested
  const isTruncated = rawErr.code === "ENOBUFS" || rawErr.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
    execError = isTruncated
      ? `TRUNCATED: stdout exceeded maxBuffer ${RIPWIRE_MAX_BUFFER}B — ${rawErr.message}`
      : rawErr.message;
  ```
