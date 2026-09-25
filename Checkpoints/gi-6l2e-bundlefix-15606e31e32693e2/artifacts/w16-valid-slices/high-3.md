# HIGH slice 3 — 20 findings across 9 files

## src/hunter/diagnostics/engine.ts
- **src/hunter/diagnostics/engine.ts:271-272** (bug)
  Unguarded parent `realpathSync` breaks the named-error contract. If `path.dirname(abs)` is missing/unreadable (e.g. history log in non-existent dir), `fs.realpathSync` throws raw ENOENT, not HISTORY_LOG_UNREADABLE. Same hole exists in `lockdownReadSource` (raw throw instead of SOURCE_READ_FAILED) and for `rootReal`. Wrap in try/catch and rethrow the named error to preserve the fail-closed law.
  ```existing
  const parentReal = fs.realpathSync(path.dirname(abs));
     if (!containedIn(parentReal)) throw historyLogUnreadable(abs, `path escapes project root (root=${rootReal} parent=${parentReal})`);
  ```
  ```suggested
  let parentReal: string;
     try { parentReal = fs.realpathSync(path.dirname(abs)); } catch (e: unknown) {
       throw historyLogUnreadable(abs, `parent realpath failed: ${String(e)}`);
     }
     if (!containedIn(parentReal)) throw historyLogUnreadable(abs, `path escapes project root (root=${rootReal} parent=${parentReal})`);
  ```
- **src/hunter/diagnostics/engine.ts:715-715** (bug)
  Bare-name `fn:<name>` synthesis with first-wins dedupe merges distinct symbols: same-named functions in different files share one id (loser file's definition dropped, callee nodes carry call-site file/line), creating false `calls`/`awaits` edges and false `whoCalls` hits. File-qualify ids (e.g. `fn:<rel>:<name>`) or keep definition nodes distinct from synthesized callee stubs.
  ```existing
  pushNode({ id: `fn:${callee}`, kind: 'function', name: callee, file: rel, line: callLine, lineage: 'CODE_DERIVED', source: `${rel}:${callLine}` });
  ```
  ```suggested
  // TODO: file-qualify to avoid cross-file collision, e.g. `fn:${rel}:${callee}`
        // with alias resolution for whoCalls(); do not reuse bare fn:<name> for distinct symbols.
  ```
- **src/hunter/diagnostics/engine.ts:595-597** (security)
  Symlink-to-file outside the root is collected without containment: `out.push(abs)` keeps the link path, then `readFileSync(abs)` follows it out of tree, bypassing the lockdown model for the local build. Resolve `real = realpathSync(abs)` and require it inside `rootReal` (fail-closed SOURCE_READ_FAILED), consistent with the F-3/F-301 gates on the read path.
  ```existing
  } else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
          out.push(abs);
        }
  ```
  ```suggested
  } else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
          let real = abs;
          try { real = fs.realpathSync(abs); } catch (err: unknown) {
            throw sourceReadFailed(abs, `local build dangling symlink: ${String(err)}`);
          }
          // TODO: require real inside rootReal else throw sourceReadFailed (containment).
          out.push(abs);
        }
  ```

## src/hunter/diagnostics/semantic-predicates.ts
- **src/hunter/diagnostics/semantic-predicates.ts:119-119** (bug)
  P2 self-match: `win` always contains the triggering `setAbortFlag` line, so `/abort/i` is trivially true ("setAbortFlag" contains "abort"). The check reduces to only the negative clause, flagging every `setAbortFlag` without `writeStateAtomic` in ±15 lines even when no separate abort path exists. Exclude the trigger line or require an independent abort signal (e.g. `abort(`, ` aborted`, `AbortController`) outside the trigger line.
  ```existing
  if (/abort/i.test(win) && !/writeStateAtomic|phase.*FAILED/.test(win)) {
  ```
  ```suggested
  const winWithoutTrigger = lines.slice(Math.max(0, i - 15), i).join('\n') + '\n' + lines.slice(i + 1, Math.min(lines.length, i + 15)).join('\n');
        if (/\babort\b/i.test(winWithoutTrigger) && !/writeStateAtomic|phase.*FAILED/i.test(win)) {
  ```
- **src/hunter/diagnostics/semantic-predicates.ts:165-166** (bug)
  P3 false negative: nodes without `id` are silently skipped when `deadIds` is available. If the graph adapter omits `id` for some kinds, a genuinely unwired gate is dropped instead of falling back to `whoCalls(name)`. Only skip when `nid` is defined and absent; otherwise use the `whoCalls` fallback per-node.
  ```existing
  if (deadIds !== null) {
        if (nid === undefined || !deadIds.has(nid)) continue;
  ```
  ```suggested
  if (deadIds !== null && nid !== undefined) {
        if (!deadIds.has(nid)) continue;
      } else if (deadIds === null) {
        // whoCalls fallback only when unwired() unavailable; when nid is undefined
        // fall through to whoCalls fallback as well instead of skipping.
  ```
- **src/hunter/diagnostics/semantic-predicates.ts:37-38** (bug)
  Mandatory-edge invariant violated: `evEdge` falls back to `'edge NONE (unanchored — never emitted)'` but every caller still pushes the finding. When `firstCite(anchor.cites, file)` misses for a file in `anchor.files`, an unanchored finding is emitted contrary to the header contract ("a finding without a traversed edge is theater" / "no anchor = no scan"). Skip the file (continue) when `cite` is undefined instead of emitting with an edge-NONE leg.
  ```existing
  const cite = firstCite(anchor.cites, file);
  const edgeLeg = cite ? edgeEvidence(cite) : 'edge NONE (unanchored — never emitted)';
  ```
  ```suggested
  const cite = firstCite(anchor.cites, file);
  if (!cite) return undefined; // caller skips: no traversed edge for this file
  const edgeLeg = edgeEvidence(cite);
  ```
- **src/hunter/diagnostics/semantic-predicates.ts:234-234** (bug)
  P5 file-level exemption causes false negatives: `if (/DIAGNOSTIC_TOOLS/.test(text)) continue` skips the entire file when the token appears anywhere, even far from the `PHASE_REQUIRED_TOOLS` window where the per-window check (`!/DIAGNOSTIC_TOOLS|AUDIT_TOOLS|\bread\b/.test(win)`) is the correct scope. A file with an unrelated DIAGNOSTIC_TOOLS mention suppresses all jail findings. Remove the file-level early-continue and rely solely on the window-scoped test.
  ```existing
  if (/DIAGNOSTIC_TOOLS/i.test(text)) continue;
  ```
  ```suggested
  // Removed file-level DIAGNOSTIC_TOOLS skip — exemption is window-scoped below.
  ```

## src/hunter/firewall/lexicon-types.ts
- **src/hunter/firewall/lexicon-types.ts:99-99** (bug)
  Alias freeze is compile-time only + shared reference defeats the guard. `readonly` does not prevent runtime mutation (`(d as any).state = ...` or `d.triplet.Pattern = ...` still succeeds), and `triplet: base.mPSE` aliases the same object reference. A single `d.mPSE.Evidence = 'x'` mutates `d.triplet` identically, so the value-equality check in `assertLexiconDecisionConsistent` still passes while evidence is corrupted. The comment claiming `readonly freezes post-construction drift` is misleading.
  ```existing
  return { ...base, state: base.verdict, triplet: base.mPSE };
  ```
  ```suggested
  return Object.freeze({ ...base, state: base.verdict, triplet: Object.freeze({ ...base.mPSE }) }); // + Object.freeze mPSE copy; document that readonly is compile-time only
  ```
- **src/hunter/firewall/lexicon-types.ts:104-107** (bug)
  Guard checks alias identity only, not MPSE semantics, and dereferences without null checks. It verifies `state===verdict` and `triplet===mPSE` by value but never that `mPSE.Pattern===pattern` or that `mPSE.State` encodes the verdict (e.g. BLOCKED verdict with `State='PARSED->ALLOW_READ'` passes). Also `d.triplet.Pattern` throws `TypeError` instead of `LEXICON_ALIAS_MISMATCH` if `d/triplet/mPSE` is null/undefined (missing null check per checklist).
  ```existing
  export function assertLexiconDecisionConsistent(d: LexiconDecision): void {
  const tripletOk = d.triplet.Pattern === d.mPSE.Pattern
    && d.triplet.State === d.mPSE.State
    && d.triplet.Evidence === d.mPSE.Evidence;
  ```
  ```suggested
  export function assertLexiconDecisionConsistent(d: LexiconDecision): void {
  if (!d || !d.triplet || !d.mPSE) throw new Error(`LEXICON_ALIAS_MISMATCH: missing decision/triplet/mPSE`);
  const tripletOk = d.triplet.Pattern === d.mPSE.Pattern && d.triplet.State === d.mPSE.State && d.triplet.Evidence === d.mPSE.Evidence;
  const semanticsOk = d.mPSE.Pattern === d.pattern && d.mPSE.State.includes(d.v
  ```

## src/hunter/harness/scan.ts
- **src/hunter/harness/scan.ts:54-57** (security)
  Unresolved-symlink warn-through is fail-open: when `!ev.resolved`, `ev.real` is the unresolved spelling (nearest-ancestor miss / nothing on the chain resolved per `checkContained`/`realNearest`), yet the scan warns and returns it as trusted corpus input. An attacker-planted symlink or missing chain can pass the ancestor string-prefix while reads follow out of the tree. Corpus entries are read-paths (not the create-before-it-exists flow `requireContained` preserves), so fail-closed: throw HUNT_INVALID_CORPUS instead of warn+continue.
  ```existing
  if (!ev.resolved) {
      console.warn(`[scan] HUNT_INVALID_CORPUS WARNING: entry=${entry} could not be resolved through symlinks (real=${ev.real}) — contained on the nearest ancestor, treating as inside but unverified`);
    }
    return ev.real;
  ```
  ```suggested
  if (!ev.resolved) {
      throw new Error(`HUNT_INVALID_CORPUS: entry=${entry} could not be resolved through symlinks (real=${ev.real}) — refusing unverified corpus input.`);
    }
    return ev.real;
  ```
- **src/hunter/harness/scan.ts:140-146** (bug)
  D17 gate runs with `dryRun:true` yet applies `cal.liveBattery` exclusion. Per `calibration.ts` D28 the verdicts in dryRun are 'computed + surfaced, never applied' (`dryRun` is only recorded on the result; `gate.run()` always returns the filtered split). Either the scan must not consume `liveBattery` while dryRun, or it must pass `dryRun:false` as an explicit operator-curation act with justification. Current code makes `dryRun` meaningless.
  ```existing
  if (hasFixtures) {
        const cal = await runCalibration(normalized, fixtures, { battery, dryRun: true });
        if (cal.excluded.length > 0) {
          liveBattery = cal.liveBattery;
          console.warn(`[scan] D17 calibration: ${cal.excluded.length} FLAGGED → EXCLUDED; ${cal.coverageNote}`);
        }
      }
  ```
  ```suggested
  if (hasFixtures) {
        // Born-dryRun: do not apply exclusions without operator curation.
        // If exclusion is intended, pass dryRun:false explicitly and document the curation.
        const cal = await runCalibration(normalized, fixtures, { battery, dryRun: true });
        if (cal.excluded.length > 0) {
          console.warn(`[scan] D17 calibration (dryRun): ${cal.excluded.length} FLA
  ```
- **src/hunter/harness/scan.ts:140-146** (bug)
  HUNT_NO_COVERAGE is only checked pre-calibration, so a fully-excluded `liveBattery` (all predicates FLAGGED) still dispatches `runBattery` and can report false-clean. Re-check emptiness after the D17 gate (and surface `coverageNote`) — an empty live battery is INCONCLUSIVE, never a clean pass.
  ```existing
  if (hasFixtures) {
        const cal = await runCalibration(normalized, fixtures, { battery, dryRun: true });
        if (cal.excluded.length > 0) {
          liveBattery = cal.liveBattery;
          console.warn(`[scan] D17 calibration: ${cal.excluded.length} FLAGGED → EXCLUDED; ${cal.coverageNote}`);
        }
      }
  ```
  ```suggested
  if (hasFixtures) {
        const cal = await runCalibration(normalized, fixtures, { battery, dryRun: true });
        if (cal.excluded.length > 0) {
          liveBattery = cal.liveBattery;
          console.warn(`[scan] D17 calibration: ${cal.excluded.length} FLAGGED → EXCLUDED; ${cal.coverageNote}`);
        }
        if (liveBattery.length === 0) {
          throw new Error(`HUNT_NO_COVERAGE: l
  ```

## src/hunter/hooks/bus-hook.ts
- **src/hunter/hooks/bus-hook.ts:119-126** (bug)
  Payload shape is never validated: `JSON.parse` result is cast to `Record` without checking it is a non-null object, and parse failures fall back to `{raw}` which downstream treats as valid. `JSON.parse('null')` yields `null`, `JSON.parse('42')` yields a number — the former crashes `payload['conformanceZero']` in `createHydraBus` (TypeError on null), the latter silently evaluates `conformanceZero` as false (mis-reports AUDIT_DONE clear check). Validate object shape and reject/route invalid payloads explicitly instead of synthesizing `{raw}`.
  ```existing
  for (const row of clean) {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(row.payload) as Record<string, unknown>;
      } catch (e: unknown) {
        console.warn(`[hydra-bus] event payload parse failed — the raw form is kept: ${e instanceof Error ? e.message : String(e)}`);
        payload = { raw: row.payload };
      }
  ```
  ```suggested
  for (const row of clean) {
      let payload: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(row.payload);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          console.error(`[hydra-bus] event id=${row.id} payload is not an object, skipped`);
          this.cursor = row.id;
          continue;
        }
        payload = p
  ```
- **src/hunter/hooks/bus-hook.ts:99-99** (bug)
  At-most-once consumption with droppable dead-letter can permanently lose a directive: cursor advances even when all subscribers throw (`this.cursor = row.id` runs unconditionally), so delivery relies on someone polling `getFailedEvents()/retryFailed()`. But `retryFailed()` drops the entry if `subscribers[idx]` is gone. If the caller never retries or the wiring changes, HUNT_DONE→dispatch is consumed-but-never-delivered with only a console.error trace.
  ```existing
  this.cursor = row.id;
  ```
  ```suggested
  // Make loss explicit: return delivery failures to the caller, or retain
// failures across wiring changes (re-broadcast or keep queued) instead of drop.
// At minimum surface count in poll() return value so callers cannot ignore it.
  ```

## src/hunter/profile/schema.ts
- **src/hunter/profile/schema.ts:28-28** (bug)
  Non-strict z.object strips unknown keys by default, so typoed/added fields silently pass. That directly defeats the D26 freeze intent stated in the header (drift should require spec amendment + profileVersion bump). Freeze at least the top-level (and ideally PipelineStageSchema) with .strict().
  ```existing
  export const ProjectProfileSchema = z.object({
  ```
  ```suggested
  export const ProjectProfileSchema = z.strictObject({
// ... same fields ...
// or: z.object({ ... }).strict()
  ```
- **src/hunter/profile/schema.ts:61-61** (bug)
  Comment on PipelineStageSchema claims `id` is unique per profile, but schema enforces only min(1) strings. Duplicate stage ids pass validation and can corrupt pipeline dispatch downstream. Add a uniqueness refine on stages.
  ```existing
  stages: z.array(PipelineStageSchema).min(1), // the declared stages (id/entry/contract)
  ```
  ```suggested
  stages: z.array(PipelineStageSchema).min(1).refine((s) => new Set(s.map((x) => x.id)).size === s.length, { message: 'pipeline.stages[].id must be unique per profile' }),
  ```

## src/hunter/shared/kind-for-layer.ts
- **src/hunter/shared/kind-for-layer.ts:27-27** (bug)
  Overbroad substring classification: generic `includes('graph'/'path'/'dead'/'cycle'/'engine'/etc.)` matches unrelated ids (e.g. `photography` contains `graph`, `deadline` contains `dead`, `empathy-path` false positives) and result silently depends on if-chain order (e.g. an id containing both `adapter` and `engine` always wins `Engine` vs `Adapter` by position). Use anchored/exact matching (allowlist map or word-boundary regex) and document precedence.
  ```existing
  if (low.includes('sro') || low.includes('graph') || low.includes('path') || low.includes('dead') || low.includes('cycle')) return 'Gate';
  ```
  ```suggested
  // Example: explicit table with anchored match instead of bare includes()
  // const GATE_PATTERNS = [/\bsro\b/, /\bgraph\b/, /\bpath\b/, /\bdead\b/, /\bcycle\b/];
  // if (GATE_PATTERNS.some((re) => re.test(low))) return 'Gate';
  ```

## src/hunter/tools/query-registration.ts
- **src/hunter/tools/query-registration.ts:58-58** (security)
  Self-attested session identity: `callerSessionId: args.sessionId` makes the scope check tautological. `openSessionStore` compares `sessionKey(callerSessionId ?? sessionId)` vs `sessionKey(sessionId)` and only refuses on mismatch — passing the same caller-controlled value guarantees equality, so any caller that can supply an arbitrary `sessionId` can open any session's store. Scope isolation then depends on caller honesty.
  ```existing
  const opened = openSessionStore({ sessionId: args.sessionId, scopeRoot: args.scopeRoot, callerSessionId: args.sessionId });
  ```
  ```suggested
  export async function runQueryTool(args: SessionQueryArgs, callerSessionId: string): Promise<string> {
  const opened = openSessionStore({ sessionId: args.sessionId, scopeRoot: args.scopeRoot, callerSessionId });
  // ... reject when args.sessionId !== callerSessionId unless an explicit privileged open is intended and audited
  const db = openStore(opened.storePath);
  ```
- **src/hunter/tools/query-registration.ts:59-59** (bug)
  Read-path mutation contradicts the READ-ONLY claim: `openStore(storePath)` opens a read-write handle and executes `CREATE_TABLES_SQL` + `TYPED_GRAPH_DDL` on every query (idempotent but still a write lock). Every query therefore takes a writer lock, risking WAL contention / SQLITE_BUSY under concurrent queries and mutating the store on the read path. Open read-only here and move schema-ensure to the write path only.
  ```existing
  const db = openStore(opened.storePath);
  ```
  ```suggested
  // Query path must not run DDL: open read-only, e.g.
// const db = openStoreReadOnly(opened.storePath);
const db = openStore(opened.storePath); // TODO: replace with read-only open; ensure schema only on writers
  ```

## src/hunter/triad.ts
- **src/hunter/triad.ts:47-47** (bug)
  Empty `from`/`to` accepted in StateRef: only `typeof === 'string'` is checked, so `''` or `'   '` passes validation. This lets a meaningless transition satisfy the mandatory triad and defeats Law 2 (no triplet = no finding). Require trimmed non-empty strings like `machineId`/`memberId`/`file`.
  ```existing
  if (typeof sta.from !== 'string' || typeof sta.to !== 'string') return false;
  ```
  ```suggested
  if (typeof sta.from !== 'string' || sta.from.trim() === '') return false;
  if (typeof sta.to !== 'string' || sta.to.trim() === '') return false;
  ```
