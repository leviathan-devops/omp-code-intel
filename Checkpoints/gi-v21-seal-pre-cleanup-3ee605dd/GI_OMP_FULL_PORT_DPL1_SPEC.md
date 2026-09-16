# BUILD SPEC ARTIFACT — GI-OMP FULL PORT (graphify + corbell + bug-hunter, one substrate)

- **Target:** `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence`
- **Generated:** 2026-09-15 (this turn, in-context)
- **Trident Version:** omp-go port, trident-omp runtime
- **Status:** PLANNING
- **Artifact Type:** BUILD_SPEC (Layer 1 Prompt)
- **Discovery:** ENABLED (65 src .ts / 14,336 lines; 48 hunter; 9 omp; 14 ST files; dist 471,921 B sha16 `eddd8d740c75b780`; fork-v143, v443-en38, paragon + plutus checkpoints read; graphifyy + corbell CLIs probed; 4-scout wave returns merged)
- **PREFLIGHT:** script-test ✓ deep-container-testing ✓
## §A CONTEXT (the evidence base — a fresh agent reading ONLY this section knows the full situation)

### A.1 CURRENT STATE (measured this turn, 2026-09-15)
- Project: `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence` — src 65 .ts / 14,336 lines (`find src -name "*.ts" | wc -l` → 65; `wc -l` total → 14336); hunter 48 files; omp 9 files; 14 ST batteries; deps typescript ^7.0.2 + xstate ^5.33.0 + zod 4.1.8; bun 1.4.2.
- Battery right now: `58 pass / 0 fail / 703 expect()` across 14 files (ran this turn, `bun test` tail).
- Dist line: `extensions/graph-intelligence/index.js` 471,921 B, sha256 `eddd8d740c75b780…`; byte-identical at `~/.omp/agent/extensions/graph-intelligence/index.js` AND inside gi-omp-port (`docker exec … sha256sum` → `eddd8d740c75b780`); rigs up: gi-omp-port 16m, gi-omp-port2 3h.
- graph-code-audit is a LOUD STUB, verified in source this turn: `src/omp/extension.ts:213-222` — execute ALWAYS returns `GI_AUDIT_NOT_WIRED: audit engine not bound in W2 | ripwire: engine-binding=none phase=W2 status=stub` (`{ok:false, error:"GI_AUDIT_NOT_WIRED"}`); description names the binding as pending. Zero graphify/MCP references in `src/hunter/`+`src/omp/` outside this stub + the EN-38 guard (`src/omp/typed-write.ts:27`).
- Containers: `gi-omp-port` (3a25c2af5387, omp-ct:master) + `gi-omp-port2` (dual-FRESH B) + `gi-omp-rwv` (throwaway image verifier). Model: openrouter/Laguna S 2.1 (free) via native provision. ripwire 0.6.0 baked in-image + ENV PATH fixed (doctor 7/8 → `on_path` row closed by layer rebuild; running rigs resolve via `~/.local/bin/ripwire`).

### A.2 PRIOR BUILDS (what exists + what it proved)
- **v443-en38-graphify-oom-fixed (2026-09-03):** dist `54b50f18…` (18.37MB, 1756 modules), 494 src files zero-drift, tsc 0 on 2 files; 5/5 container red-team receipts (`trident-artifacts/container-test-results.json`); operator verbatim "successfully no crash this time". Honest gaps: RT-1 full-audit parity re-fire PENDING; EN-33/EN-34/EN-36 + {id} anomaly UNCHANGED; cache trees excluded BY DESIGN. The RAM-safe source lines: `graph-mapper.ts:139-154` (stat-size guard + yield, EN-38) + `code-classifier.ts` scoped-program fix (per CHECKPOINT_MANIFEST THE FIX).
- **paragon-cache-autopsy-cleaned (2026-09-06):** dist `9c64933f…` (20.27MB, 1936 modules); battery **2476/0/174 + 9364 expects**; tsc 0 touched; ST-0..ST-9 92 assertions; EN-40 cache invariant; 677 .ts + 16 context docs + 28 MASTER_CONTEXT; 5 ship docs (BUILD_REPORT 2118L, DEBUG_LOG 5166L). Honest gaps: rig dist pre-EN-40 needs re-deploy; host dist pre-merge needs operator restart; 33 legacy tsc errors (shark/v4.1/L5.11, canon class).
- **plutus-corbell-container-tested (2026-08-13):** dist `801b1ffd…`; battery 322/0 (1332 expects, 26 files); tsc 0; W10 REAL hunt: corbell 1,847 nodes (1,775 methods + 71 functions) + 3,583 edges → **332 findings all VIOLATION** (`gateG8.comparator = 101.14`); the four W10 fixes baked (profile-driven config, per-run rebuild snapshot, scaffolding-only GRAPH_EMPTY, dangling-edge FK filter); workspace READ-ONLY directive honored.
- **Our port wave (this tree):** Phase-E artifact `.omp/ct-results-port.json` overallVerdict PASS (20/20 live + AD5 by ST); dists GI 89ce7270…/trident 8756baac… (superseded by `eddd8d74…` this turn for the named audit stub); substrate law live (gi_meta ledger + reconcile); 9-verb `ripwire:` legs live in-container (callers×32, edit-check×42/47, impact×42 `impact_reaches=143`, safe-delete×8, dead-code×12 `count=0`, path×30 `reachable=1 hops=1`, verify×13 `confirmed`); hunt live (HUNT_DONE runId=gi-study-src-hunt-20260914-1, findingsCount=296, 453,718B report).

### A.3 REFERENCES (files read, forensic sources with dates)
- Fork hydra face: `…/v443-en38-graphify-oom-fixed/src/hydra/{pipeline.ts:1-168, aether-auditor.ts:1-233, aether-tools.ts:1-391, types.ts:1-268, findings-map.ts:1-259, graphify.ts:1-160, graph-mapper.ts:1-318, corbell-bridge.ts:1-111}` + `__tests__/` (10 files incl. graphify/corbell/pipeline/integration).
- Fork audit corpus: 14 hunter templates `aether-templates/hunters/` (mpse/lasme/sro families) + `instances/{mpse,lasme,sro}.ts` + `aether-meta.ts` (the LIVE fan-out path; `pipeline.dispatchSubagent` is a dead AETHER_MIGRATION stub).
- Upstream CLIs ground-truthed this turn: graphifyy (`/home/leviathan/.local/share/uv/tools/graphifyy/bin/python`, 207M env — `extract --no-cluster` on /tmp/fx383 → 5 nodes/5 edges graph.json, EXIT=0; `query`/`path`/`explain`/`god-nodes` answered) + corbell CLI (`corbell init` mandatory, then `graph build --methods` → Services:1 Methods:2 Edges:1, `workspace.db` tables `graph_nodes(id,node_type,data)` / `graph_edges(id,source_id,target_id,kind,metadata)`) + ripwire 0.6.0 (13ms `--callers=alpha --json` → count 1, beta@src/beta.ts:2).
- Our tree (read this turn): `src/omp/extension.ts:1-123` (4 tools, 13 verbs, reconcile :95-110), `:213-222` (audit stub), `src/hunter/tools/bug-hunt.ts:1-123` (`spawnBugHunterLoop` fail-closed), `src/hunter/harness/micro-loop-machine.ts:1-123` (XState, named seams), `src/hunter/graph/corbell-adapter.ts:1-83` (fix-bundle, `resolveCorbell`, CORBELL_NOT_FOUND text).
- Master context: `docs/GI_OMP_PORT_MASTER_PROMPT.md` (W1–W5 + LAWS + Phase-E appendix), `context_management/RUNNING_BUILD_LOG.md` (21 `## [` wave entries synthesized).
- Scout returns merged this turn: ForkGraphAudit (54 file rows), CheckpointAudit (per-file verb tables + error-token catalogues + MCP/CLI dependency table), SubstrateAudit (13-verb split; reconcile law; substrate tokens), UpstreamAudit (graphify verb inventory — no --callers/--impact there, ripwire-only — + graph.json field catalogue + ripwire flag spellings + counting law).

## §B THE DENSE BUILD PLAN (architecture + scope + manifest + waves)

### B.1 ARCHITECTURE — the three-system topology after this build
- Surface (unchanged contracts): `graph-probe` (PROBE_TOOL_OK), `graph-query` (13 verbs, twin-leg format `${popNote}<verb-payload>\nripwire: <summary>`), `bug-hunt` (`status` census + `hunt` → HUNT_DONE), `graph-code-audit` (R0-R16 surface: findings with {Pattern, State, Evidence triplets} — replaces the stub ONLY when its battery is green).
- Substrate pack (one populate, three readers): `src/omp/populate-graphify.ts` NEW (graphifyy CLI extract → graph.json → fixtures graph rows → session store, gi_meta `substrate=graphify`, freshness vs graph.json mtime, supersede discipline identical to corbell); `populate-corbell.ts` EXISTS (untouched semantics); `populate.ts` gains the substrate switch `{corbell | graphify | regex-named-fallback}` driven by `profile.graph.substrate`; DEFAULT STAYS `corbell` (zero behavior change for existing sessions).
- Hunter (unchanged machine, widened inputs): RECON (profile load — EXTEND: accept `substrate: graphify` + graphify-out path) → MAP (`selectAdapter` EXTEND: `graphify` case → GraphifyAdapter: read graph.json via the guarded loader + store-map node/edge rows) → SCAN/TRACE/STRIKE/REPORT untouched. `GraphifyMCPClient` is NOT ported (MCP serve stays an operator-side debugging path; the machine reads graph.json directly — decision D1).
- Audit face (verbatim port, fork-shaped): `src/hydra/` NEW TREE mirroring the fork — `graphify-client.ts` (stdio MCP client, NO serve spawn: read-only verbs listTools/callTool/disconnect; the serve lifecycle belongs to the operator's shell) + `map-reader.ts` (guarded graph.json read + local token-scan/BFS fallbacks — the EN-38 guards travel WITH it: 128MB budget + 8MB yield) + `auditor.ts` (mission-tool factory + capped read/grep + force-bound write_findings + graph_tag→typed-edge splice) + `templates/` (the 14 hunter-template bindings, zod-validated) + `pipeline.ts` (gate skeleton + synthesizer; `dispatchSubagent` stays a loud AETHER_MIGRATION stub — matches the fork, no new machinery) + `__tests__/` mirroring the fork's 10 files (subset: client adversarial, mapper adversarial, audit settle, pipeline smoke).
- Audit tool bind: `graph-code-audit` execute routes `{targetPath}` → auditor run → findings → `{ok:true, findings, reportPath}`; the NOT_WIRED refusal SURVIVES as the degraded path (binary absent / graph.json missing / template invalid) — a stub-shaped error is legal ONLY when named after a real attempt.
- Data flows: (1) corbell path UNCHANGED: CLI → workspace.db → typed rows. (2) graphify path: CLI `--no-cluster` extract → graph.json → GraphifyAdapter (kind map: file→File, function/method→Function, class→Class, module→Module, import→Module; predicate map: calls→calls, imports→imports, inherits→implements, uses→wraps, references→declares, returns→shouldBe; evidence_quote `explicit:`/`inferred:` + node id/source line) → typed rows. (3) hunt: adapter graph → battery predicates (edge-anchored REQUIRED — `resolveLine()`: file line ← node `line` ?? data.line_start ?? data.line_end ?? edge `source_location` L-number; STILL NONE → named `LINELESS_NODE` refusal, never silent drop) → traces → fixOrder → report md + HUNT_DONE. (4) verbs: store-primary rows + ONE `ripwire:` leg each (existing, untouched).
- Interfaces: `GraphifyAdapter implements GraphAdapter` (same BuildResult/nodes/edges contract as CorbellAdapter); `GraphifyGraph {nodes: GraphifyNode[{id,label,type,file,data?}], edges: GraphifyEdge[{src,dst,relation,confidence}], communities, godNodes}` (fork types.ts shape, trimmed to what scan/trace read); `AuditRun {template, inputData, ledgerDir} → HunterSettlement {fulfilled {findings,fileBytes,…} | rejected {error,…}}`; profile gains `substrate: 'graphify'` enum member + `graphifyOut?: string` (default `<root>/graphify-out/graph.json`).

### B.2 SCOPE (loaded work items, ≤20)
1. Port decision record D1 (MCP client vs local-scan reader) — written, not inherited.
2. `src/hunter/graph/graphify-adapter.ts` NEW (kind/predicate maps + resolveLine + adapter).
3. `src/omp/populate-graphify.ts` NEW (extract orchestration + freshness + ledger write).
4. `populate.ts` substrate switch (corbell|graphify|regex-fallback, default corbell).
5. `profile/schema.ts` + `loader.ts`: `substrate: 'graphify'` + `graphifyOut` field.
6. Fixture-call battery `st-graphify-port.ts` (config/extract/map/counts/empty-loud/binary-missing hermetic).
7. Hunter map() graphify case + LINELESS_NODE refusal + regression battery.
8. `src/hydra/` audit-face port (client-reader/mapper/auditor/templates/pipeline + tests).
9. `graph-code-audit` bind (stub retired ONLY on green battery).
10. `docs/GRAPH_ROUTING.md` (twin table + units + floors + scope prefixes).
11. K20.3 same-ids re-hunt proof row.
12. LOGIC-LSP real surface (W6 seam replacement).
13. Dual-FRESH TUI re-proof incl. one graphify-populated session.
14. Report v2 (this spec's evidence appended, v1 rows frozen).

### B.3 FILE MANIFEST (every NEW/EDITED file + role)
- NEW `src/hunter/graph/graphify-adapter.ts` — the graphify read path (kinds, predicates, resolveLine).
- NEW `src/omp/populate-graphify.ts` — the third populate leg (extract + freshness + ledger).
- NEW `tests/st-graphify-port.ts` — the fixture-call battery (acceptance gate).
- NEW `src/hydra/{client-reader,map-reader,auditor,templates,pipeline}.ts` + `__tests__/` — the audit face.
- NEW `docs/GRAPH_ROUTING.md` — the routing contract.
- EDIT `src/omp/populate.ts` — substrate switch only (corbell path untouched).
- EDIT `src/hunter/profile/{schema,loader}.ts` — enum + field only.
- EDIT `src/hunter/harness/map.ts` — graphify case + LINELESS_NODE (reconcile seam only).
- EDIT `src/omp/extension.ts` — audit bind only (verbs/tools untouched).
- DELETED: nothing. INVARIANT CORE (store/gate/registry/session scoping): untouched.

### B.4 WAVE PLAN SKETCH (desks + disjoint files + gates)
- Wave 1 (substrate): graphify-adapter + populate leg + schema/loader small edits + st-graphify-port → GATE: battery green incl. new file (no other file touched).
- Wave 2 (hunter seam): map() case + resolveLine + LINELESS_NODE + regression → GATE: full 14→15-file battery green.
- Wave 3 (audit face): hydra tree + its tests, disjoint from waves 1–2 files → GATE: its battery green + one templated audit settling on the fixture.
- Wave 4 (bind + proof): audit-tool bind + routing doc + K20.3 + dual-FRESH TUI incl. graphify session → GATE: Phase-E tokens incl. a graphify-leg token; report v2.
## §8 THE ANTI-PATTERN LEDGER (the last-2-days token waste, each with its mechanical detection)

### ARCHITECTURAL (banned structures)
- STUB-SOLD-AS-SURFACE: registering `graph-code-audit` while execute ALWAYS refuses. Incident: P12 certified a stub token as PASS; the capability never existed. Detection: `grep -c "GI_AUDIT_NOT_WIRED" src/omp/extension.ts` must be 0 at ship OR the spec section for the audit face must carry its own battery + artifact. BUILDER RULE: no tool registration without its proof battery in the same wave.
- MCP-SERVE-IN-PROCESS: spawning `graphify.serve` (or any long-lived python child) from inside a TUI tool call. Incident class: orphaned children, TUI stalls, the HT-BUG-16 corbell orphan spiral precedent. Detection: `grep -rn "spawn.*serve\|StdioClientTransport\|spawnSync.*python" src/ | grep -v test` must be EMPTY at ship. The machine reads graph.json; the operator runs serve.
- REGEX-PRIMARY: re-promoting `populate.ts` mechanical indexing above a parse-grade substrate once one is warm. Incident: 2035-node stopgap sold as the graph for weeks. Detection: any populate path that skips the gi_meta substrate write (`grep -c setMeta.*substrate src/omp/populate*.ts` < number of legs → FAIL).
- DAEMON-AS-DRIVE: background watchers/rebuild loops (`graphify watch`, warm-index daemons) as the freshness mechanism. Detection: `grep -rni "watch\|setInterval\|cron" src/omp/populate*.ts src/hunter/graph/*.ts` must hit ONLY comments/tests.

### BEHAVIORAL (banned runtime behaviors)
- ABSENCE-TOKEN PASS: a gate whose pass criterion is a refusal string (`GI_AUDIT_NOT_WIRED`, `RIPWIRE_MISSING`). Detection: every TEST PLAN ENTRY must name a WORK token (counts/rows/artifacts); CI greps plan entries for absence-token pass criteria → FAIL on match.
- TOOL-RESULT PROSE: agent narration quoted as tool evidence. Detection: every passToken assertion must cite the tool boundary (`tool-result context`); stream prose matches don't count.
- CONTINUATION ACCUMULATION: re-running setup/deploy in a loop instead of diagnosing the wedged state (the 5× identical `setup` loop this campaign burned: same args, same redacted result). Detection: two identical tool calls back-to-back with identical outcomes → STOP, diagnose, escalate.
- SILENT SUBSTITUTE: any fallback that doesn't print its token+reason+remedy. Detection: `grep -rn "catch\s*{" src/omp/*.ts src/hunter/graph/*.ts | xargs -I{} sh -c 'grep -A3 "{}" | grep -qi "console.error\|throw new"'` — every catch either logs loudly or rethrows named.

### PROCESS (banned actions)
- PORT-WITHOUT-PROVENANCE: a ported file with no `// PORTED FROM <tree>/<file>:<lines>` line. Detection: new files under `src/hunter/**` and `src/hydra/**` must match `grep -c "PORTED FROM" >= 1` each — enforced in the ST harness setup, not by review.
- THIN DISPATCH: subagent prompts under 150 lines / batch payloads that truncate (`stop_reason: length`). Detection: `wc -l` on the filled prompt ≥150; batch ≤2 full prompts per call (the F-03 lesson: 4-at-once truncated mid-arguments).
- IMAGE DRIFT: hot-installed container binaries diverging from the baked image. Detection: Phase-E re-verifies `sha256sum` of the deployed FILE in-container against the host SHA (the setup-distSha-mismatch ladder) — no aggregate hashes.
- STALE-ARTIFACT CLAIM: citing `.omp/ct-results-port.json` PASS as current proof after the dists moved (the file now pins superseded SHAs 89ce7270/8756baac). Detection: every artifact citation must state the dist SHA it was earned on; mismatched SHA → STALE, re-run.
- REWRITE-MID-FLIGHT: editing `docs/GI_OMP_PORT_MASTER_PROMPT.md` substance instead of appending a dated section. Detection: `git diff`-style review on docs edits — appends only.
## §9 THE OPEN DECISIONS (every unresolved fork + evidence + recommended default)

### D1 — graphify read path: local-scan reader vs verbatim MCP-client port
- Evidence FOR local-scan: the machine only ever needs graph.json rows (extract once, read many); the EN-38 guards already exist for the file path; MCP serve lifecycle (spawn/teardown/orphan risk) has no owner in a TUI tool call; upstream `extract --no-cluster` is LLM-free and instant on fixtures (0.3s/5 nodes).
- Evidence FOR verbatim MCP port: fork fidelity (graphify.ts + live `query_graph`/`shortest_path`/`get_node` semantics the hunter templates may assume); `graph_tag→add_tag` write-back needs a live server.
- RECOMMENDED DEFAULT: local-scan reader for the machine path (this spec's §B); ship `graphify-client.ts` as READ-ONLY verbs listTools/callTool/disconnect with NO serve spawn (operator-side debugging only). Revisit if a template requires server-side verbs.

### D2 — audit face: full hydra port vs auditor-only slice
- Evidence FOR full port: fork parity (pipeline gates + synthesizer + 10 test files); the operator's "wire this correctly" order names the whole face.
- Evidence FOR slice: the live fan-out is `runMetaLayer`, NOT `pipeline.dispatchSubagent` (dead stub); the synthesizer/memory bus have no OMP consumer yet.
- RECOMMENDED DEFAULT: port the full file SET (fidelity) but BIND only the auditor run path (runner + tools + report); pipeline gates + synthesizer land as tested-but-unbound code with their batteries. No dead code ships unbound without its test.

### D3 — populate trigger for the graphify leg: explicit CLI run vs lazy extract-on-query
- Evidence FOR explicit: hunts/queries never block on a minutes-long extract; matches the corbell warm-index law (build explicitly, reads stay fast); the fork's extract runs under a 120s timeout that does NOT belong in a query path.
- Evidence FOR lazy: fewer moving parts for the operator.
- RECOMMENDED DEFAULT: explicit (`scripts/graphify-build.ts` mirroring `corbell-build.ts`); queries read graph.json + freshness check; stale graph → named `GRAPHIFY_NOT_WARM` + the exact rebuild command (the CORBELL_NOT_WARM precedent).

### D4 — LOGIC-LSP in this wave or W6
- Evidence FOR now: the report refresh seam is already stubbed (`report.ts:282`); closing it here removes the last named stub besides audit.
- Evidence FOR W6: zero consumers exist yet; the seam is honest and tested.
- RECOMMENDED DEFAULT: W6 (this spec's scope item 12 stays a seam replacement, not a surface). The audit bind is the wave's terminal deliverable, not the LSP.

### D5 — K20.3 re-hunt: same checkout vs rebuilt graph
- Evidence: determinism proof needs identical inputs; a rebuild re-validates the whole chain but conflates determinism with build stability.
- RECOMMENDED DEFAULT: same checkout, two hunts, identical runId contract asserted (re-run on rebuild only if the first pair diverges).
## §1 PROBLEM STATEMENT (from the real requirements — operator verbatim)

- "graphify is theatrical bullshit you have not shown me even 1 legit working example of graphify" — the `graph-code-audit` tool ALWAYS refuses (`GI_AUDIT_NOT_WIRED`), and no legit graphify call path was ever demonstrated.
- "Refresh on what this is and how it works: https://github.com/Graphify-Labs/graphify — https://github.com/Corbell-AI/Corbell" — the upstream ground truth (graphifyy CLI: `extract/query/path/explain/god-nodes/affected`; corbell CLI: `init/graph build --methods`; both verified on /tmp/fx383 this turn).
- "LOOK AT THE TRIDENT CHECKPOINTS AGAIN FOR THE WORKING FUCKING GRAPH/BUG HUNTER TOOLS" — the fork hydra face (`graphify.ts` MCP client, `graph-mapper.ts` CLI extractor, `corbell-bridge.ts` remap, `aether-auditor.ts` runner, `pipeline.ts` gates) + the three manifests' attestations.
- "WIRE THIS CORRECTLY. FIX GRAPHIFY + CORBELL + BUG HUNTER — MAKE SURE IT ALL FUCKING WORKS PROPERLY. WIRE IN RIPWIRE AS WELL SO WE HAVE 3 WORKING GRAPH INTELLIGENCE SYSTEMS."
- "TELL ME THE FUCKING GAPS, WHY THEY STILL EXIST, DOCUMENT ALL FAILURE IN THE SHIP DOCS PER THE SKILL" — the ship docs now exist (manifest + 5 docs, gate run); the gaps are EN-001/EN-002 (graphify stub + schema seam) and F-01/F-02 (theatrical gate + routing evaporation).
- "STOP WASTING TIME. HAVE YOUR SUBAGENTS FULLY ANALYZE EVERYTHING PROPERLY" — 4-scout wave completed (ForkGraphAudit 2m58s, CheckpointAudit 59.5s, SubstrateAudit, UpstreamAudit).
- "write the full spec to properly port in all the working machineries into this plugin. simple. full anti patterns against the last 2 days of token waste." — THIS artifact.

## §2 ARCHITECTURE (the context this build lands in — existing, not proposed)

- Extension factory `src/omp/extension.ts:38` registers 4 tools (`GI_TOOL_NAMES` :16); graph-query dispatches 13 verbs (:82) over the session store at `{scopeRoot}/.omp/graph-intelligence/sessions/{sid24}/store.sqlite` (gi-registry WAL UPSERT, store-open GI_SCOPE_REFUSED, PENDING hierarchy, gi_meta substrate ledger with reconcile law :95-110).
- Corbell substrate: adapter shell over the REAL CLI (fix-bundle: quoted version, relative-root, coupling env, walk excludes, no-timeout, warm-skip, STORE_BLOATED, GRAPH_EMPTY substance, CORBELL_NOT_FOUND text, node enrichment) → store-map kinds/predicates → populate corbell-first, regex named fallback.
- Hunter: XState micro-loop RECON→MAP→SCAN→TRACE→STRIKE→REPORT→DONE|INCONCLUSIVE, `spawnBugHunterLoop` fail-closed (bug-hunt.ts:53), hunt-lock, query-registration 7 structural verbs READ-ONLY, runQueryTool delegation for the 4 coverage verbs.
- Ripwire legs: 8 twin verbs + verify append ONE `ripwire:` line each (bridge: RIPWIRE_BIN→~/.local/bin→PATH, spawnSync bounded 8s, JSON for the flat verbs, XML report-parse otherwise, fail-soft absent/query-failed/claim-refused).
- Gate: FULL cancels with GRAPH_GATE_SIGNATURE_BREAK; STEER advises [GATE STEER]; OFF lands tokenless; every verdict also lands in the gate log.

## §3 DISCOVERY INTELLIGENCE (measured numbers only)

- Tree: 65 src .ts / 14,336 lines; hunter 48; omp 9; tests 14 files.
- Deps: typescript ^7.0.2, xstate ^5.33.0, zod 4.1.8; runtime bun 1.4.2.
- Dist: 471,921 B, sha256 `eddd8d740c75b780…` — identical at extensions/, host deploy, gi-omp-port.
- Battery: `58 pass / 0 fail / 703 expect()` across 14 files (this turn).
- Fixture truth (/tmp/fx383): graphify 5n/5e, relations contains/imports_from/imports/calls (all EXTRACTED); corbell Services:1 Methods:2 Edges:1, node fields file_path/method_name/line_start/line_end, edge metadata line; ripwire count=1 (beta@src/beta.ts:2), 0.09s.
- Fork audit corpus: 14 templates (mpse/lasme/sro); pipeline.execute order: pre-gates → extract → connect → fan-out(settled) → synthesize → post-gates → contract check.
- Provenance: 45 src files carry `// PORTED FROM` (grep -rl count this turn).
- Entry points: `src/omp/extension.ts:38 registerGiOmpTools`; `src/hunter/tools/bug-hunt.ts:53 spawnBugHunterLoop`; `src/hunter/harness/micro-loop-machine.ts:108 createMicroLoop`.

## §4 CORE INSIGHT (first principles)

- The implementation must produce runtime-grade software that works correctly in a real runtime environment — not just code that compiles. Governing non-negotiables: every error path returns a NAMED token (never a throw past the tool boundary, never a silent substitute); every input boundary is validated (empty graphPath, empty symbol, missing store, unparseable graph.json — each has its token); every acquired resource is released (hunt-lock finally, actor stop, db close, MCP disconnect best-effort); side effects precede claims (report artifact on disk BEFORE HUNT_DONE text; ledger write BEFORE the substrate line).
- The three systems are three READERS over two upstream builders plus one index: corbell CLI builds a method graph, graphifyy CLI builds a concept graph, ripwire parses on demand — the plugin's job is READ + NORMALIZE + GATE, never re-parse. Any code that re-implements an upstream parse is the forbidden reimplementation class.
- The port law holds end to end: every ported file carries `// PORTED FROM <tree>/<file>:<lines>`; every deviation is a NAMED seam with its reason; every stub is a loud named error with a retirement battery named.

## §5 SCOPE (loaded requirement bullets, ≤200 chars each, 14 items — see §B.2 items 1–14, identical by reference)

- Scope is EXACTLY §B.2 items 1–14 (decision record, adapter, populate leg, schema/loader, battery, hunter seam, audit face, audit bind, routing doc, K20.3, LOGIC-LSP, dual-FRESH re-proof, report v2). Nothing outside this list ships in this build.

## §6 SUCCESS CRITERIA (mechanical, every row command/ledger/eyes-verifiable)

| # | Criterion | Verification |
|---|---|---|
| S1 | `st-graphify-port.ts` green on the fixture shape | `bun test tests/st-graphify-port.ts` → 0 fail; asserts calls-spine + line numbers + EMPTY loud + binary-missing hermetic |
| S2 | Fixture `calls` spine end-to-end | graph.json edge `beta()→alpha()` present (today: hand-verified; post-build: battery asserts) |
| S3 | Populate writes `substrate=graphify` + node/edge counts | `SELECT key,value FROM gi_meta` row + counts >0 on the session store |
| S4 | Hunter runs on a graphify-populated store | HUNT_DONE + reportPath artifact on disk (bytes>0, runId inside) |
| S5 | Findings carry file:line triplets | every finding row has non-empty file + finite line (LINELESS_NODE count = 0) |
| S6 | Audit tool binds on green battery | `graph-code-audit` returns findings+reportPath; NOT_WIRED only on real attempt failure |
| S7 | Routing doc exists and is referenced | `docs/GRAPH_ROUTING.md` on disk + skill-doc link |
| S8 | K20.3 double-run identical | two hunts, same runId contract field equal |
| S9 | Full battery zero regressions | 14→15 files, 0 fail, expect() ≥703 |
| S10 | Dual-FRESH re-proof incl. graphify session | Phase-E tokens incl. one graphify-leg token on omp-ct:master |
| S11 | Provenance complete | `grep -rl "PORTED FROM" src/hunter/graph/graphify-adapter.ts src/omp/populate-graphify.ts src/hydra/` → every new file ≥1 |
| S12 | No MCP serve spawned in-process | `grep -rn "graphify.serve\|StdioClientTransport" src/ ` (excluding tests/docs) → EMPTY |

## §7 CONTAINER TEST PLAN (plan-first — the extraction contract for `.trident/test-plan.md`)

- OBJECTIVE: prove the graphify substrate leg + the audit bind live in a headed OMP TUI on omp-ct:master, with zero regressions to the corbell/hunt/verb surface.
- TOOLS UNDER TEST: `populate-graphify.ts` (new), `graphify-adapter.ts` (new), hunter `map()` graphify case, `graph-code-audit` (bind), the 9 twin-verb legs (regression: identical tokens).
- SCENARIOS (each: exact prompt → tool-result-bound passToken + failToken; agent-typeable = CIRCULAR FAIL):
  1. graphify substrate populate → pass `substrate=graphify` in result, fail `CORBELL_NOT_WARM` confusion (wrong-leg signal).
  2. who-calls on a graphify-populated session → pass `rows=` + file:line callers, fail `rows=0` with populated store.
  3. hunt on graphify store → pass `HUNT_DONE` + `reportPath=` artifact on disk, fail `LINELESS_NODE` (seam breach) or throw.
  4. graph-code-audit on the fixture → pass findings + `reportPath=`, fail `GI_AUDIT_NOT_WIRED` (stub resurrected = FAIL).
  5. twin-verb regression (all 9) → pass the SAME `ripwire:` summaries as the corbell run, fail any missing leg.
  6. ADVERSARIAL empty graph.json → pass `GRAPHIFY_GRAPH_TOO_LARGE` or `GRAPH_EMPTY` named, fail OOM/hang/crash.
  7. ADVERSARIAL binary absent → pass `CORBELL_NOT_FOUND`-class named refusal + `indexer-fallback`, fail silent substitute.
- EVIDENCE: stream excerpts with the tokens in tool-result context + `sha256sum` of the deployed bundle file in-container + ledger DB rows + artifact bytes.
- PASS CRITERIA: 7/7 scenarios with passToken present AND failToken absent; battery 0-fail; containers alive at verdict; results artifact written.
## THE SPEC ILLUSTRATED — the master ASCII graph (every box maps to a spec §)

```text
┌──────────────────────────────────────────────────────────────┐
│ MASTER VIEW (§B.1 — entry → stage → terminal)                │
│                                                              │
│  profile ──► RECON ──► MAP ──► SCAN ──► TRACE ──► STRIKE     │
│                 │         │                                   │
│           ┌─────┴───┐ ┌───┴────────┐ ┌────────────────┐       │
│           │ corbell │ │ graphify   │ │ regex fallback │       │
│           │ adapter │ │ adapter    │ │ (named warn)   │       │
│           └─────┬───┘ └───┬────────┘ └───────┬────────┘       │
│                 └─────────┴──────────┬───────┘                │
│                        typed rows → session store            │
│                        (gi_meta substrate ledger)            │
│                                   │                          │
│                              REPORT ──► HUNT_DONE            │
└──────────────────────────────────────────────────────────────┘
```


```text
┌────────────────────────────────────────────────────────────┐
│ CORE MECHANISM — substrate switch (§B.1)                   │
│                                                            │
│  substrate ──┬── corbell ──► populate-corbell.ts           │
│              ├── graphify ──► populate-graphify.ts         │
│              └── other ────► regex + NAMED warn            │
│  DEFAULT corbell — zero behavior change for old sessions   │
└────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────┐
│ OVERLAYS — always-on mechanisms (§B.1 + §8)                │
│                                                            │
│  freshness ──► stale/absent → NAMED fallback + remedy      │
│  gi_meta ──► every query surfaces substrate=…              │
│  reconcile ──► warm + mismatch → repopulate                │
│  twin legs ──► ONE ripwire: line per twin verb             │
│  gate ──► FULL cancel / STEER advise / OFF land            │
└────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────┐
│ BUILD MANIFEST (§B.3 — waves §B.4, core untouched)          │
│                                                            │
│  Wave 1: adapter + populate leg + schema + battery         │
│  Wave 2: map() case + resolveLine + LINELESS_NODE          │
│  Wave 3: hydra tree + tests + settle proof                 │
│  Wave 4: audit bind + routing + K20.3 + dual-FRESH + v2    │
│  UNTOUCHED: store/gate/registry/scoping, 9 twin verbs      │
└────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────┐
│ NAMED-ERROR MAP (refusals — §B.1 + fork tokens)             │
│                                                            │
│  PROFILE_INVALID · CORPUS_MISSING · HISTORY_MISSING        │
│  CORBELL_NOT_FOUND · GRAPHIFY_NOT_WARM · GRAPH_EMPTY       │
│  LINELESS_NODE · HUNT_NO_COVERAGE · INCONCLUSIVE           │
│  GI_AUDIT_NOT_WIRED (degraded audit, after real attempt)   │
│  QUERY_INVALID · GI_SCOPE_REFUSED · RIPWIRE_ABSENT         │
└────────────────────────────────────────────────────────────┘
```
## THE SCRIPT TESTING SUITE (in-process runtime verification — the 6-part pattern)

### HARNESS (sandbox builder + PASS/FAIL printers + expectThrow — shared by all ST below)
- `mkdtempSync` sandbox per test with `rmSync` finalizer; fixture builders: `writeFixture(root)` writes `src/alpha.ts` (def L1) + `src/beta.ts` (import + `alpha()` call L2) + `package.json`; `writeGraphifyOut(root)` shells the REAL graphifyy CLI (`extract --no-cluster`, asserts EXIT=0 + graph.json bytes>0); `writeCorbellOut(root)` shells REAL `corbell init` + `graph build --methods` (asserts `Methods: 2` in stdout — the fixture-call precedent, not a mock).
- PASS/FAIL printer: per-assertion `ok(name, cond, got)` appending to a rows array; final table + `process.exitCode = fails ? 1 : 0`.
- `expectThrow(fn, tokenSubstring)`: runs fn, asserts the thrown message CONTAINS the spec-named token (PROFILE_INVALID, GRAPHIFY_EXTRACT_FAILED, LINELESS_NODE, GI_AUDIT_NOT_WIRED).
- Exactly ONE runner invocation per harness, at the bottom edge; every scenario bounded (120s file timeout).

### ST-1 `st-graphify-port.ts` — the acceptance gate (mirrors the fork's graphify.test.ts adversarial halves)
- resolveBinary: `GRAPHIFY_BIN` env → `~/.local/share/uv/tools/graphifyy/bin/python` exists → else `{present:false}`; ABSENT case asserts the hermetic refusal token, never a throw.
- extract: REAL CLI on `writeFixture` → asserts `graph.json` has `nodes[]` with a `calls` edge `beta()→alpha()` (the field names from §A.3: `id/label/source_file/source_location` + `source/target/relation/confidence`).
- map: adapter read → typed rows ≥3 nodes / ≥1 `calls` edge; every row carries finite line (the resolveLine contract — a line-less row FAILS here, not downstream).
- empty: empty dir → `GRAPH_EMPTY` named (NOT a silent zero).
- hermetic: binary path pointed at `/nonexistent` → named refusal + regex fallback fires with its token.
- LEGIT HALF (zero-misfire): well-formed fixture passes with zero refusals; finding-count assertions tolerate ≥ (counts are floors).

### ST-2 hunter seam regression (extends st-hunter-live.ts, never replaces)
- graphify-populated store → full live chain → HUNT_DONE + report artifact (bytes>0, runId inside) + HUNT_DONE event row.
- LINELESS_NODE adversarial: a node row with line stripped → the scan phase refuses NAMED (not a silent drop, not a thrown crash reaching the tool surface).
- Existing corbell-path STs re-run unchanged (zero regressions).

### ST-3 audit-face battery (mirrors the fork's 10 `__tests__` files, subset)
- client adversarial: empty graphPath → GRAPHIFY_CONNECT_INVALID; null MCP → GRAPHIFY_TOOLS_INVALID; disconnect-then-call → Not connected.
- mapper adversarial: empty targetRoot/nonexistent path → GRAPHIFY_EXTRACT_FAILED; oversized graph.json → GRAPHIFY_GRAPH_TOO_LARGE (129MiB precedent preserved).
- audit settle: one templated run on the fixture → `HunterSettlement` fulfilled with findings file bytes>0 + grammar-valid report.md.
- pipeline smoke: gates pass/fail paths named; `dispatchSubagent` still throws AETHER_MIGRATION (documents the dead stub, does not revive it).

### THE RUNNER
- `bun test ./tests/st-graphify-port.ts ./tests/st-hunter-live.ts ./tests/st-hunter-port.ts [audit battery]` — single command, exit-code verdict, per-file expect() totals printed.

### THE ANTI-CHEAT PROPERTIES
- Written at spec time, before any implementation file in §B.3 exists.
- Every assertion targets a SPEC-NAMED token (the error vocabulary above) or an OBSERVABLE artifact (graph.json bytes, DB rows, report bytes, runId strings).
- The adversarial halves (empty/hermetic/line-less/oversized) FAIL on the current tree (the capabilities don't exist yet) — verified by running the battery BEFORE the build wave lands (all-new asserts must fail, all-regression asserts must pass).
- No mocks of the units under test: the REAL CLIs run (graphifyy, corbell), the REAL store is read back, the REAL report bytes are asserted.
## THE DEEP CONTAINER TESTING SUITE (deployed runtime proof — 12-step law instantiated)

- 12-STEP INSTANCE: plan-first (this §7 IS the plan, 2000+ chars) → preflight self-check → setup fresh container, image=omp-ct:master, the NEW bundle file path, model=Laguna S 2.1 → auth probe FIRST (model-backed call must succeed) → model verify via status bar → scenarios below → adversarial discipline (first error = bug, not excuse) → bugs fixed+retested → Phase E 10 checks → results artifact `.omp/ct-results-graphify.json` → zero-broken-windows (battery+build re-run) → declaration (sha + excerpts + per-scenario verdicts).
- AUTH family FIRST: graph-probe returns PROBE_TOOL_OK (failToken: tool absent) — the silent-auth false-green killer.
- POSITIVE suite (each enforcement fires ITS token): graphify substrate populate → `substrate=graphify` + counts>0; hunt on graphify store → `HUNT_DONE` + artifact bytes; audit bind → findings + `reportPath=`; twin-verb regression → identical `ripwire:` legs.
- NEGATIVE suite (zero misfire, AFTER the teeth): corbell-path verbs return IDENTICAL tokens as the Phase-E baseline; a missing graphify-out → named fallback (not a crash); the stub-shaped refusal appears ONLY on the degraded path.
- ADVERSARIAL family: empty graph.json → `GRAPH_EMPTY`/`GRAPHIFY_GRAPH_TOO_LARGE` (fail: OOM/hang); binary absent → named refusal + fallback (fail: silent substitute); malformed claim string to the audit tool → named refusal (fail: throw past the boundary); oversized store → loud fail (fail: stall).
- RESULTS ARTIFACT: per-scenario {name, feature, passToken, failToken, passTokenMatch, failTokenAbsent, toolResultContext, maxWaitMs, timedOut, verdict, evidence} + phaseE block + overallVerdict. NO ARTIFACT, NO CLAIM.
- PASS CRITERIA: Phase-E 10/10 + negative half green + the four-element declaration. Banned phrases: structural PASS, source-inspection-as-proof, asserted-the-behavior.
