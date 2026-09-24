# HIGH slice 1 — 9 findings across 8 files

## src/hunter/diagnostics/calibration.ts
- **src/hunter/diagnostics/calibration.ts:513-516** (bug)
  The catch block for ROLLBACK is empty — if ROLLBACK itself throws (e.g. connection lost, disk full), the original exception is re-thrown but the database connection is left in a broken transaction state. Any subsequent operations on the same DbClient will fail or produce corrupt results. At minimum, the connection should be flagged as unusable (e.g. call `db.close()` or destroy the client) to prevent silent data corruption.
  ```existing
  } catch (e: unknown) {
      try { db.exec('ROLLBACK'); } catch { /* best-effort: the original error below is what the caller sees */ }
      throw e;
    }
  ```

## src/hunter/firewall/readonly.ts
- **src/hunter/firewall/readonly.ts:134-137** (bug)
  **Bug: `scanMetacharacters` non-exempt path falsely blocks safe quoted arguments for READ verbs.**

The non-exempt branch (lines 124-127) scans the FULL command string against `BYPASS_METACHARACTERS`, which includes single quotes (`'`), double quotes (`"`), and parentheses `(`, `)`. For any READ-verb command with a quoted argument, the quote character is flagged as a metacharacter and the command is BLOCKED.

Trace for `grep 'error' log.txt`:
1. `parseCommand` → firstToken=`grep`, secondToken=`'error'`
2. `scanMetacharacters` → `grep` is NOT in `blockVerbExemption` (not EXECUTION/MUTATION/ECHO) → enters the non-exempt path
3. Non-exempt scan finds `'` in the command string → returns `'` (the quote character)
4. `classify` → `parsed.metacharacter !== null` → BLOCKED as `BASH_BYPASS`

This means **virtually all READ commands with quoted arguments are incorrectly blocked**. Commands like `grep 'pattern' file`, `head -n 5 'file with spaces.txt'`, `cat 'path/to/file'`, `diff 'old.txt' 'new.txt'`, `find . -name '*.ts'` are all rejected.

The blockVerbExemption (line 109) should be expanded to also cover the READ_VERBS family, treating quotes, parentheses, and other shell argument syntax as non-dangerous when the verb is a known read-only command. For READ verbs, the dangerous characters to still check are the command-chaining ones (`|`, `;`, `&`, `>`, `<`, `
`, `$`, `` ` ``) — not the argument-syntax ones (`'`, `"`, `(`, `)`, etc.).
  ```existing
  for (const ch of command) {
    if (BYPASS_METACHARACTERS.has(ch)) return ch;
  }
  return null;
  ```
  ```suggested
  // READ verbs + unknown verbs: the full scan still applies, but we exclude
  // argument-syntax characters that are safe when the verb itself cannot execute code.
  // Command-chaining chars (| ; & > < \n $ `) are still blocked; quotes, parens,
  // braces, etc. are allowed as argument syntax for the read-only verb set.
  for (const ch of command) {
    if (ch === '|' || ch === ';' || ch === '&' |
  ```
- **src/hunter/firewall/readonly.ts:224-227** (bug)
  **Dead code / misleading constant: `ECHO_VERB` and the unreachable check at line 199.**

`ECHO_VERB` (line 75) serves no functional purpose and creates dead code:

1. **Line 109:** `ECHO_VERB` is added to `blockVerbExemption`, but `echo` is already in `EXECUTION_VERBS`, so this is redundant — `EXECUTION_VERBS.has(firstToken)` at line 190 already handles it.
2. **Line 199:** `if (firstToken === ECHO_VERB)` is unreachable because line 190 (`EXECUTION_VERBS.has(firstToken)`) returns `blocked('BASH_EXECUTION', ...)` for `echo` before this check is ever reached.

If `echo` is intended to be **BLOCKED** as an execution verb, the dead code at line 199 should be removed. If it's intended to be **ALLOWED** as a no-op (per the F-48 fix comment's intent), `echo` should be removed from `EXECUTION_VERBS` and `ECHO_VERB` kept for the line 199 path. Either way, the current code is contradictory — the comment says "BARE-ECHO NO-OP" but the path is never executed.
  ```existing
  // THE BARE-ECHO NO-OP EDGE CASE (§7.2:3170) — zero metachars already proven by the BYPASS pass.
  if (firstToken === ECHO_VERB) {
    return allowed('BASH_READ', firstToken, command);
  }
  ```
  ```suggested
  // If echo should be ALLOWED (no-op): remove 'echo' from EXECUTION_VERBS and keep this check.
// If echo should be BLOCKED: remove this dead-code block entirely.
// Current state: echo is in EXECUTION_VERBS, so this block is unreachable.
  ```

## src/hunter/graph/resolver.ts
- **src/hunter/graph/resolver.ts:225-226** (bug)
  Bug (asymmetry with `decide` path): The `run()` path resolves `newEnt` via `n.id === alias` only, while the `decide()` path uses `n.id === alias || n.label === alias` (line 193). If the AI harness returns an entity's label rather than its ID in the `alias` field, the `run()` path silently drops that record and falls back to heuristic — producing an incorrect or inconsistent result without any diagnostic signal.

Fix: add the same `|| n.label === alias` fallback to the `run()` path for parity.
  ```existing
  // ★ F-253 FIX (2026-09-24): run path — same no-fabrication rule as the decide path (skip hallucinated aliases).
              const newEnt = newEntities.find((n) => n.id === alias);
  ```
  ```suggested
  // ★ F-253 FIX (2026-09-24): run path — same no-fabrication rule as the decide path (skip hallucinated aliases).
              const newEnt = newEntities.find((n) => n.id === alias || n.label === alias);
  ```

## src/hunter/lexicon/templates.ts
- **src/hunter/lexicon/templates.ts:135-140** (security)
  readPath allows traversal into `constructor` as an own property: for a standard object, `Object.hasOwn(obj, 'constructor')` returns `true` because `constructor` is an inherited but also own-key-accessible property. A crafted `node.data` with a poisoned `constructor.prototype` chain (e.g., via a polluted dependency writing to `Object.prototype.constructor`) would let `readPath` walk into the prototype. Consider blocklisting `__proto__` and `constructor` explicitly — the F-333 fix was on the right track but the set of dangerous keys is larger than just prototype-chain walks via inherited properties.
  ```existing
  // ★ F-333 FIX (2026-09-24): OWN-PROPERTY ONLY. A bare `obj[part]` walks the
    //   prototype chain — a polluted Object.prototype (or an Object.create'd node.data)
    //   could surface an INHERITED value as if it were a binding. The predicate's
    //   bindings are the template's INPUT, so the read is a trust boundary.
    if (!Object.hasOwn(cur, part)) return undefined;
    cur = (cur as Rec
  ```
  ```suggested
  // The F-333 trust-boundary guard: own-property only, PLUS blocklist of
    // keys that are unsafe even as own properties.
    if (!Object.hasOwn(cur, part)) return undefined;
    if (part === '__proto__' || part === 'constructor') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  ```

## src/hydra/templates/lasme.ts
- **src/hydra/templates/lasme.ts:25-25** (bug)
  The double cast `as unknown as z.ZodSchema` bypasses TypeScript's type checker. Since `SubagentOutputSchema` is a `z.ZodObject` which extends `z.ZodType<any, any, any>` (alias for `z.ZodSchema`), this cast should be unnecessary. If it was added to satisfy a stricter generic signature, it still hides potential type mismatches at compile time. If the assignment fails without the cast, the `AuditorTemplate.outputSchema` type should be narrowed to `z.ZodObject` or a more specific union. Either way, `as unknown as` is a red flag that warrants investigation.
  ```existing
  outputSchema: SubagentOutputSchema as unknown as z.ZodSchema,
  ```
  ```suggested
  outputSchema: SubagentOutputSchema,
  ```

## src/omp/adapters/abide.ts
- **src/omp/adapters/abide.ts:118-119** (performance)
  The bounded-tail optimization (F-23, F-AB1, F-210) is defeated by the fallback at line 119. Multiple failure paths — statSync returning null (line 81, file disappears between resolution and read), fd open failure (line 115 catch), and while-loop exhaustion when no newline is found in the growing window — all fall through to `fs.readFileSync(eventsPath, "utf8")`, which loads the **entire** ~22.8 MB ledger into memory. This silently undoes the very optimization these fixes introduced. At minimum, the fallback should log a warning so operators can detect the degraded path, or rethrow if the file is genuinely too large to materialize. Additionally, the stat failure path (st === null) is especially dangerous: it skips straight to full readFileSync without even attempting the bounded tail.
  ```existing
  }
  const raw = fs.readFileSync(eventsPath, "utf8");
  ```
  ```suggested
  }
  // If we reach here, the bounded tail failed — log so operators know the optimization is degraded.
  // Consider throwing for files above a safety threshold instead of silently loading the full ledger.
  const MAX_SAFE_FULL_READ = 32 * 1024 * 1024; // 32 MiB
  if (st && st.size > MAX_SAFE_FULL_READ) {
    throw new Error(
      `GI_ENFORCE_ABIDE: bounded tail failed for ${eventsPath} (${st.siz
  ```

## src/omp/gate-middleware.ts
- **src/omp/gate-middleware.ts:1-2** (maintainability)
  **Stale header comment contradicts fail-closed behavior.** Line 2 says `Fail-open when no store (GI_NO_STORE)`, but the actual behavior is fail-**closed** (`cancel: true`) unless the explicit escape `GI_ALLOW_NO_STORE=1` is set. This contradiction (documented as AP-5 in the project's audit logs) is misleading to any future maintainer reading the file header. The header should match the body.
  ```existing
  // OMP write/edit graph-gate. STEER default. FULL cancels on export strip.
// No @mimo-ai/plugin. Fail-open when no store (GI_NO_STORE).
  ```
  ```suggested
  // OMP write/edit graph-gate. STEER default. FULL cancels on export strip.
// No @mimo-ai/plugin. Fail-closed when no store (GI_NO_STORE); explicit bypass via GI_ALLOW_NO_STORE=1.
  ```

## src/omp/rsi.ts
- **src/omp/rsi.ts:444-448** (bug)
  TOCTOU race condition: `liveIncludingForgedRetirement()` is called BEFORE `BEGIN IMMEDIATE`, so `current` may be stale. A concurrent `write()` with the same `canonicalId` could insert a new live row between the read and the lock acquisition. The subsequent `head()` (inside the txn) would then correctly read the new tip, but the early-return guard `current.kind === d.tier` still uses the stale `current`. Additionally, the `label` and `evidenceQuote` inherited from `current` may correspond to the wrong row. The derivation (`recount`) and `head()` are correctly inside the txn, but `current` is not. Either move `liveIncludingForgedRetirement()` inside the transaction, or re-read it after BEGIN IMMEDIATE.
  ```existing
  this.db.exec("BEGIN IMMEDIATE;");
    try {
      const counts = this.recount(canonicalId);
      const d = deriveTier(counts.confirmed, counts.refuted, counts.unresolved);
      const current = this.liveIncludingForgedRetirement(canonicalId);
  ```
