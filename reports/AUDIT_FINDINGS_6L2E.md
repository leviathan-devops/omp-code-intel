# THE CODE-AUDIT FINDINGS (ocr session e04327cb, 2026-09-22)

**Tool:** `ocr review --from 640da98 --to HEAD` (Alibaba OpenCodeReview, model muse-spark-1.3-contributor-free)
**Scope:** 19 files of the 6L+2E diff
**Status:** ★ COMPLETE (session e04327cb, 28 files, 34 comments, 9m22s, rc=0)
**Verdict:** 34 comments — 7 HIGH (bug/security) · the rest medium/low

★ SEVERAL ARE REAL BUGS IN THIS BUILD'S OWN NEW CODE. Each is adjudicated below and FIXED where confirmed.


## F-1 · [HIGH] bug · `src/omp/adapters/_shared.ts`
L2 can never report UP: probeSocketDir returns up:false even when socket files exist, and the authoritative probeSocketConnect is async while ConsumerProbe.up() is sync (layer-registry.ts:70). arsumbrisProbe wires only the sync hint, and no caller wires probeSocketConnect. Either expose an async liveness path in the registry or document L2 as permanently DOWN.

## F-2 · [HIGH] bug · `src/omp/adapters/_shared.ts`
Swallowed substrate faults become silent zero-facts: openReadOnly returns null on any open failure and liveEdgesFor/liveNodesFor catch-all to []/0, storeFacts returns [] when db===null. Registry maps up:true + facts:[] to GI_LAYER_UNCONSUMED, not DOWN — violating the file's own never-rows:0 law. Throw or return a discriminated DOWN instead of [].

## F-3 · [HIGH] bug · `src/omp/adapters/arsumbris.ts`
up() can never be true: it delegates to probeSocketDir which returns up:false by design (file is hint-only). Combined with sync-only ConsumerProbe.up, the live daemon is permanently reported DOWN even when probeSocketConnect would succeed. Registry audit() will always emit GI_LAYER_DOWN for L2.

## F-4 · [HIGH] bug · `src/omp/gate-hook.ts`
Single global `pendingQuery` slot loses/misattributes resolutions. Two interleaved `tool_call`s overwrite the first (lost coverage), a query without target leaves a stale slot for the next `tool_result` to consume, and the `tool_result` handler never verifies the result belongs to the pending query/session (it only checks name is graph-query/ripwire and reuses stored `sid`). Use a per-session queue/map keyed by sid+tool, or store pending per `sid` and match result sid/tool before calling recordGraphQuery.

## F-5 · [HIGH] security · `src/omp/extension.ts`
Operator-controlled `scopeRoot` reaches `consumptionAudit(root, subject)` with no `confineTargetPath`/isAbsolute/isDirectory check, unlike graph-query (confineTargetPath + allowlist) and aether-audit paths in the same file. Probes derive `storePath=join(root, ...)` then `statSync`/`openReadOnly`/readdir, enabling arbitrary-path existence/size probing. Confine `root` via `confineTargetPath(path.normalize(root), cwdOf())` and reject on failure before auditing.

## F-6 · [HIGH] bug · `src/omp/extension.ts`
gi-consumption execute drops the tool-call ctx and calls cwdOf() with no args, so scopeRoot falls back to process.cwd() instead of the caller/session cwd. Every other tool in this file threads ctx into cwdOf/confineTargetPath (e.g. aetherAuditExecute takes (_id,params,_sig,_upd,ctx)). Accept ctx as 5th arg and derive root from it for consistency.

## F-7 · [HIGH] bug · `src/omp/gate-hook.ts`
Marking any non-error result as resolved:true lets an empty (rows=0) answer purchase coverage. graph-gate.ts explicitly states rows=0 is a legitimate answer but not coverage (T-16 ritual-query fix: resolved = q.resolved===true || rows>0). Inspect the tool_result payload for row/content evidence before setting resolved:true, otherwise a ritual empty query resets drift.

## F-8 · [MEDIUM] test · `bunfig.toml`
root="./tests" also excludes first-party suites outside ./tests from bare `bun test`: src/hydra/__tests__/pipeline-battery.test.ts, reader-battery.test.ts, settle-battery.test.ts and packages/paragon-runtime-encryption/tests/battery.test.ts (all `bun:test`). The header comment stating the repo's battery is ./tests is therefore inaccurate, and bare `bun test` becomes a silent subset. Either include those dirs in the default run / package.json scripts or document that bare `bun test` is intentionally scoped and where the excluded suites are run.

## F-9 · [MEDIUM] performance · `src/omp/adapters/_shared.ts`
Sequential connect loop hangs linearly: await net.connect per socket file with 1500ms timeout each, plus manual destroy on connect/error/timeout races. Use parallel Promise.all with single timeout and path.join for socket path.

## F-10 · [MEDIUM] bug · `src/omp/adapters/_shared.ts`
LIKE pattern interpolates raw subject: `%${subject}%` treats %/_ as wildcards, causing over-match and no escaping. Escape % _ \ or use exact/canonical match.

## F-11 · [MEDIUM] maintainability · `src/omp/adapters/abide.ts`
Absolute host-local default makes probe non-portable and always DOWN off-host; scopeRoot param is unused and no env/config override exists. Layer-consumption calls abideProbe(scopeRoot) so default is always taken. Derive from scopeRoot/HOME or env like other adapters.

## F-12 · [MEDIUM] performance · `src/omp/layer-registry.ts`
factsFor() re-probes `p.up()` then `p.facts()` independently from `audit()`. Each store-backed probe re-opens the DB and re-queries, so consumptionAudit (audit + decisionsInfluenced->factsFor + summary->audit) does 3x I/O per consumer and audit vs decision can diverge (TOCTOU). Reuse a single auditOne pass: derive factsFor/decisionsInfluenced/summary from one `audit()` result or cache up()+facts per subject.

## F-13 · [MEDIUM] maintainability · `src/omp/layer-consumption.ts`
consumptionAudit() evaluates the registry 3 times (audit + factsFor + summary->audit), tripling probe I/O and allowing summary/influenced/reports to disagree if substrates change mid-call. Compute `reports = registry.audit(subject)` once, then derive influenced/offenders/summary from that single snapshot.

## F-14 · [MEDIUM] other · `scripts/consumption-audit.ts`
Unhandled `GI_REGISTRY_INCOMPLETE` (or any probe-construction throw) crashes the CLI with a raw stack. Wrap in try/catch and exit non-zero with the named code, consistent with the gi-consumption tool's GI_CONSUMPTION_FAILED handling.

## F-15 · [MEDIUM] performance · `src/omp/adapters/c2kg.ts`
Per-subject full-file parse + blocking I/O: existsSync then readFileSync + JSON.parse of whole index on every facts() call, with unbounded .includes(subject) (case-sensitive substring). Add TOCTOU risk (check-then-read) and over/under-match. Cache parsed index or bound/limit hits like storeFacts(limit).

## F-16 · [MEDIUM] bug · `src/omp/adapters/corbell.ts`
TOCTOU between up() and facts(): up checks file existence, facts re-opens read-only separately. If openReadOnly fails (vanished/locked/corrupt) storeFacts returns [] which registry reports as GI_LAYER_UNCONSUMED, not DOWN. Same LIKE-wildcard issue inherited from liveEdgesFor.

## F-17 · [MEDIUM] bug · `src/omp/adapters/graphify.ts`
Same TOCTOU as L5: up probes file, facts re-opens via storeFacts which swallows open/schema errors to []. Vanished store becomes UNCONSUMED instead of DOWN. Let open errors throw.

## F-18 · [MEDIUM] bug · `src/omp/adapters/semantica.ts`
Probe/file mismatch: up() checks the directory, facts() needs kg.json. Dir-present + file-absent reports UP + [] → GI_LAYER_UNCONSUMED instead of named DOWN. Probe the kg file (like L3/L4) or fold file-absence into DOWN.

## F-19 · [MEDIUM] performance · `src/omp/adapters/semantica.ts`
Same per-query full JSON parse + existsSync/readFileSync + unbounded case-sensitive includes() as L3/L4. Cache parse and bound hits.

## F-20 · [MEDIUM] performance · `src/omp/adapters/ua.ts`
Per-subject full-graph parse with blocking I/O and unbounded substring filter: existsSync + readFileSync + JSON.parse on every call, (n.name).includes(subject) is case-sensitive and matches unrelated symbols. Use single read with try/catch, cache, and limit results.

## F-21 · [MEDIUM] maintainability · `scripts/consumption-audit.ts`
CLI always exits 0 even when consumption is 0/8 or offenders exist, so CI/operators cannot gate on it. Set process.exitCode (e.g. 1 when influenced.length===0) and document the contract, unlike the gi-consumption tool which returns ok:false.

## F-22 · [MEDIUM] bug · `src/omp/layer-registry.ts`
Probe shape is trusted blindly: if p.up() returns {up:true} without a string evidence (or non-boolean up), report.evidence becomes undefined and downstream consumers crash (scripts/consumption-audit.ts does r.evidence.slice). Validate/normalize: treat missing/non-string evidence as DOWN (or default to '') instead of propagating undefined.

## F-23 · [MEDIUM] bug · `src/omp/adapters/_shared.ts`
Unguarded db.close() in finally can throw and mask facts: if close fails (WAL lock/IO) the throw escapes facts() and audit reports DOWN with a close error instead of the read result. Same repo (populate-corbell.ts) wraps every close in try/catch.

## F-24 · [MEDIUM] maintainability · `src/omp/adapters/corbell.ts`
Runtime import from populate module breaks documented adapter isolation (layer-registry/layer-consumption: adapters import ONLY the frozen interface). It pulls bun:sqlite + typed-write + populate-graphify into the decision path. Graphify adapter avoids this with a local constant — the two edges now use opposite strategies for the same problem.

## F-25 · [MEDIUM] maintainability · `src/omp/adapters/graphify.ts`
Duplicated checkout path drifts from canonical populate-graphify.ts GRAPHIFY_CHECKOUT_REL (same literal in two places). Corbell edge imports its constant; this edge re-declares it — one edit updates one substrate and silently stale the other.

## F-26 · [MEDIUM] bug · `src/omp/adapters/c2kg.ts`
No shape guard on parsed index: if file contains null/non-object or symbols is non-array, idx.symbols access/.filter throws; if any entry is null, s.name throws. Throw escapes facts() (registry converts to DOWN) instead of controlled empty. Validate with Array.isArray + per-entry object check.

## F-27 · [MEDIUM] bug · `src/omp/adapters/semantica.ts`
Same shape gap as L3/L4: kg null/non-object or entities non-array makes kg.entities throw; null entry makes e.name throw. Guard root and entries before filter.

## F-28 · [MEDIUM] bug · `src/omp/adapters/ua.ts`
Null-entry deref: g null (JSON null) makes g.nodes throw; nodes non-array makes .filter throw; null node makes n.name/n.id throw. Add Array.isArray + object guard so malformed graph returns [] instead of escaping throw.

## F-29 · [LOW] maintainability · `src/omp/adapters/_shared.ts`
evidence_quote is selected but discarded when building LayerFact, and liveNodesFor is never called by corbell/graphify edges. Either include evidence in value/source for audit or drop the column/query.

## F-30 · [LOW] style · `src/omp/adapters/abide.ts`
Unused imports fs/path (facts returns [] without I/O). Remove to avoid dead-code noise.

## F-31 · [LOW] style · `src/omp/typed-write.ts`
Variadic query args typed as `any[]` violates the no-`any` rule and weakens binding checks. Use `unknown[]` (or `SQLQueryBindings[]`) — call site passes a single string label so it still typechecks.

## F-32 · [LOW] style · `src/omp/adapters/tsg.ts`
Unused fs import (facts returns [] without reading). Remove.

## F-33 · [LOW] maintainability · `src/omp/gate-hook.ts`
Third disjunct is dead/redundant: name is already event.toolName lowercased, so String(event.toolName ?? '') === 'graph-query' is subsumed by the first clause. It also suggests case-sensitive intent that isn't real. Drop it to a single lowercased comparison.

## F-34 · [LOW] maintainability · `src/omp/layer-consumption.ts`
Probes are registered in corbell/graphify/c2kg/ua/arsumbris/semantica/tsg/abide order while SIX_L2E_CONSUMERS documents L1..L6+TSG+ABIDE canonical order, so audit()/CLI/tool output lists consumers out of documented order. Register in SIX_L2E_CONSUMERS order (or sort reports by that index) so consumed:N/8 lines read L1→L6.

## F-35 · [LOW] maintainability · `src/omp/typed-write.ts`
Buffer.alloc(0) as the initializer is a wasted alloc that also masks uninitialized use: if the open/read path ever leaves head unassigned, head.subarray() on the empty buffer silently yields a non-magic comparison instead of a type error. Use a definite-assignment declaration or allocate the 16-byte buffer once outside the try.

