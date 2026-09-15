# BUILD_REPORT — GI-OMP (triple-system wave era)

Append-only build record. Each entry: built / why / how / evidence / verification / honest notes.


## 2026-09-15 — Triple-system forensics wave: graphify + corbell + bug-hunter ground truth (operator-ordered)

**The built:** (1) Upstream ground truth captured by direct probe: graphifyy CLI env (207M, uv tool) — `extract /tmp/fx383 --no-cluster` → `/tmp/fx383/graphify-out/graph.json — 5 nodes, 5 edges`, EXIT=0; graph.json schema `{nodes[], edges[], hyperedges[], input_tokens, output_tokens}`, node fields `id/label/file_type/source_file/source_location/_origin`, edge fields `source/target/relation/confidence/source_file/source_location/weight/_origin`; relations observed `contains/imports_from/imports/calls`, all `confidence: EXTRACTED`. `query`/`path`/`explain`/`god-nodes` all answered on the fixture (BFS depth=2, 1-hop path, node detail, hub ranking). (2) Corbell CLI exercised live on the same fixture: `corbell init` (workspace.yaml) + `corbell graph build --methods` → `Services: 1, Methods: 2, Edges: 1`, store at `corbell-data/.corbell/workspace.db` with tables `graph_nodes(id,node_type,data)` / `graph_edges(id,source_id,target_id,kind,metadata)`; node data carries `file_path/method_name/signature/line_start/line_end/service_id/typed_signature`; edge carries `method_call` + `metadata: {"line": 2}`. (3) Cross-check: ripwire on the same fixture → `count: 1 | callers: [('beta', 'src/beta.ts:2')]` in 0.09-0.10s. (4) Four-scout forensics wave (ForkGraphAudit, CheckpointAudit, SubstrateAudit, UpstreamAudit — all status completed) with anchored inventories: fork hunter chain 54 file rows (micro-loop-machine.ts:119 → recon → map → scan → trace → strike → report, hunt-lock, selectAdapter/ix-adapter/sqlite-store/update/verify/cypher-subset/l6-agent/corbell-embeddings/extraction-mech/merge/resolver/semantic, profile-schema/loader, db.ts:823 openStore, query-engine, ontology, migrations, kind-for-layer, query-tool, lsp-injector, firewalls, lexicon, engine, calibration, semantic-predicates, query-registration, bug-hunt, report-writer, mcp-bridge, docs-patterns, hydra corbell-bridge transforms); fork hydra 10 files (graphify.ts 160L MCP client + 4 agent tools; graph-mapper.ts 318L CLI extractor + EN-38 guards; corbell-bridge.ts 111L remap tables; aether-auditor.ts 233L runLayerHunter; pipeline.ts 168L orchestration; aether-tools 391L; 10 __tests__ files); v443-en38 checkpoint manifest attests dist 54b50f181af10e09e528eaf6ab1c8dfd4195f6102272a39ebeefcdd872a3aa46 (18.37MB) with 5/5 container red-team receipts. (5) TUI 9-verb + audit batch re-driven on gi-omp-port: all nine verbs returned their `ripwire:` lines live (`6 callers…`, `impact_reaches=143 radius_untested=143`, `edit-check status=no-baseline callers=6 incompatible=0`, `safe-delete callers=6 impact_reaches=143 uses=7 tested_self=0 risk=untested-radius`, `dead-code count=0 confidence=high`, `path reachable=1 hops=1 (runQueryTool → runQuery)`, `verdict=confirmed shape=calls hops=1 (readStoredGraph → openStore)`); `graph-code-audit` → `GI_AUDIT_NOT_WIRED` in tool-result context. (6) This ship-doc set created (manifest + 5 docs).
**The why:** Operator redirect, verbatim: "WIRE THIS CORRECTLY. FIX GRAPHIFY + CORBELL + BUG HUNTER - MAKE SURE IT ALL FUCKNG WORKS PROPERLY. WIRE IN RIPEWIRE AS WELL SO WE HAVE 3 WORKING GRAPH INTELLIGENCE SYSTEMS" + "DOCUMENT ALL FAILRUE IN THE SHIP DOCS PER THE SKILL".
**The how:** Scout contracts in one batch context (read-only, absolute paths, anchor-per-claim); fixture /tmp/fx383 (alpha.ts L1, beta.ts L2 import+call) built once and reused by all three systems for a like-for-like comparison; upstream CLIs probed headlessly (`--no-cluster` graphify to keep it LLM-free; `corbell init` required before build — proven by the `No workspace.yaml found` dead end).
**The evidence:** Battery `bun test` → `77 pass / 0 fail / 175 expect() calls / Ran 77 tests across 7 files` (note: default glob — the 14-file full battery number lives in TESTING_LOG); dist SHA `1487abfc16ee0090fd57bf1b53aedb8a942c2e063973b1c069a647c5cd403efa` identical at extensions/ and host-deploy paths; ct-results-port.json overallVerdict PASS (prior wave artifact, unchanged).
**The verification:** Pasted outputs above + in TESTING_LOG results; scout payloads at agent://ForkGraphAudit, agent://CheckpointAudit, agent://SubstrateAudit, agent://UpstreamAudit; container stream ripwire lines via `docker exec gi-omp-port grep -ao`.
**The honest notes:** graph-code-audit is STILL a stub (fix deferred by explicit decision below, not by drift); the 9-verb TUI batch shows the CURRENT dists' store numbers (study-tree scoped) which differ from the Phase-E numbers (fork-scoped) — same verbs, different substrate contents, both honest; graphifyy 207M env is on HOST only — not yet in the CT image (ripwire at least is baked; decision pending); the SubstrateAudit noted OMP-NEW verbs (impact/safe-delete/gate/verify) absent from fork STRUCTURAL_VERBS — deliberate divergence, needs its own spec line, not a violation.

## Appendix — evidence anchors carried forward (pre-ship-doc era, 2026-09-14 → 15)

- Prior wave (port + CT): dist GI 89ce7270e1554a89 / trident 8756baac20ebb92f; `.omp/ct-results-port.json` overallVerdict PASS (20/20 live + AD5 PASS-BY-ST); full battery 49/0/644 across 13 files; big-tree build 2086n/9386e in 20.2s; HUNT_DONE runId=gi-study-src-hunt-20260914-1 findingsCount=296 + 453,718B report artifact; 3-dial firewall rows verified in /tmp/gi-gate.log.
- Ripwire wave: dists GI 3ee3e0c9fa3e9b10 / trident 84735f2ce430a3db on both rigs; battery 52/0/660 across 14 files (st-ripwire-bridge.ts NEW 3/3); ripwire 0.6.0 baked into omp-ct:master + ENV PATH fix; gate tail `(store-derived + ripwire edit-check: 6 live callers…)`.
- THE CURRENT SHIP LINE IS the dist recorded in SHIP_DOCS_MANIFEST (`1487abfc16ee0090…`): the extension bundle the full-delegation legs were re-verified against this turn (9-verb batch, gi-omp-port). Prior-wave SHAs above are the audit trail, not the ship line.

## Rollup — pre-ship-doc era (synthesized 2026-09-15 from context_management/RUNNING_BUILD_LOG.md, append-only canon; zero lines rewritten)

## [2026-09-14] W0 scoping GATE
- src/scoping copied from vendor/workspace-scoped-state-boilerplate (5 ts) + gi-session-path.ts + gi-ecosystem.ts
- bun test ./tests/st-gi-omp-scope.ts → 7 pass / 0 fail
- known-bad SHARED-PROJECT-STORE and GLOBAL-HOME-GRAPH refused


## [2026-09-14] W1 registry GATE
- src/omp/gi-registry.ts WAL UPSERT; src/omp/store-open.ts GI_SCOPE_REFUSED
- bun 1.4.2 does not set BUN_TEST=1; isolation keys off test argv + GI_OMP_DB_DIR
- bun test refuse+wipe → included in 20/20


## [2026-09-14] W2–W4
- extension.ts four tools; typed-write isolation; gate-middleware FULL/STEER/OFF
- 20 pass / 0 fail / 54 expect across 6 ST files


## [2026-09-14] W5 wire
- ~/.omp/agent/extensions/graph-intelligence/index.js 11104 B
- both config.yml APPEND (trident-omp + code-retrieval + graph-intelligence)
- trident-omp dist rebuilt 14.59 MB with PROBE_TOOL_OK; deployed live


## [2026-09-14] W6
- managed skill graph-intelligence created
- project skills/graph-intelligence/SKILL.md


## [2026-09-14] W7 WAVE 4 runtime BLOCKED
- container gi-omp-w7 up, omp TUI after 5-step wizard
- send graph-probe → Error: No model selected
- overallVerdict OPEN-NO-MODEL — not /goal complete


## [2026-09-14] PORT WAVE W3 — machinery ports landed (mechanical, verbatim, provenance'd)
- P1: triad(54L) shared/ontology shared/kind-for-layer firewall/lexicon-types identity/warhead testing/inconclusive — smoke green
- P2: keys/go-key-pool (fork zero-literal 5-key; snapshot reads live pool: go-1..go-3 dead windows, go-4/5 ok) + shared/migrations (CHECKs enforced: bad kind rejected, empty evidence rejected) + shared/db.ts WHOLE STORE (openStore/writeGraph/appendFinding/mirror smoke green; profile-schema alias shim)
- P3: lexicon/{rule-card,templates,compiler,compiled-store} + graph/{mechanical,merge,resolver} + shared/query-engine + diagnostics/{findings-store,semantic-predicates,engine,calibration,fixture-calibration} — full chain imports green (log->interface->CorbellAdapter->runBattery->loadProfile)
- P5: firewall/{readonly,artifact-scope} behavior-proven with EXACT tokens (rm -rf/node -e THROW BASH_ERROR_MESSAGE; rand write THROW REPORT_SCOPE_ERROR; report write ALLOW_REPORT; cat/rg ALLOW_READ) + hooks/bus-hook + surface/query-tool (DEV-4 depth 8/64)
- SEAMS PATCHED: utils.js->../log.ts; ix case -> loud REMOVED (exclude ruling); profile aliases; deps: typescript added (xstate/zod already present)
- IN-FLIGHT agents: OmpCorbellPort (adapter/store-map/CLI/tests), OmpHunterHarness (harness+lock+st battery)


## [2026-09-14] PORT WAVE — W1+W2 LANDED (corbell substrate + hunter machine)
- OmpCorbellPort (34m47s): profile schema+loader verbatim; corbell-adapter 894L with the full fix-bundle; store-map; scripts/corbell-build.ts; st-corbell-port 6/6. BIG TREE: nodes=2086 edges=9386 (method=1949 exact, calls=4698 traces-to=4688) 20.2s reproducible. ACCEPTANCE all: config emission (version "1"/root ".."), fixture build, store-map counts, GRAPH_EMPTY loud, CORBELL_NOT_FOUND hermetic
- OmpHunterHarness (30m29s): XState5 micro-loop 536L + recon/map/scan/trace/strike/report 1633L total; st-hunter-port 3/3: runId->MAP->SCAN->TRACE->STRIKE->REPORT artifact + HUNT_DONE events row + findingsCount=2; PROFILE_INVALID INCONCLUSIVE; lock round-trip
- ME: W3 machinery ports (P1-P5): triad/ontology/kind-for-layer/lexicon-types/warhead/inconclusive; go-key-pool 5-key zero-literal (live pool: go-4/go-5 ok); migrations CHECKs enforced; WHOLE db.ts store smoking; lexicon+diagnostics+extraction+query-engine+firewalls+bus-hook+query-tool+lsp-injector; firewall EXACT tokens (rm -rf/node -e THROW; cat/rg ALLOW; report scope allow/block)
- SUBSTRATE LAW LIVE (the stopgap demoted): populate = corbell-first; host E2E: substrate=corbell nodes=2086 edges=9386; who-calls openStore rows=12 symbol-level; blast rows=160 depth=5; fallback NAMED (CORBELL_NOT_WARM:absent|stale + warm command)
- BATTERIES: 41 pass / 0 fail / 158 expect across 11 files
- DISTS: gi 2c32f73f2f5f2ab6 / trident e3db7a4391084418 deployed host + w7
- REMAINING: tool adapters -> extension; TUI dual-FRESH tokens; W4 verbs; P6 swaps (W8 writer/L6/SRO)


## [2026-09-14] PORT WAVE — CorbellFinish profile.yaml (W1 constitution closes)
- profile.yaml NEW at root (831B): substrate corbell, scope src, 8 excludes (node_modules, dist, build, .git, Checkpoints, corbell-data, context_management, .trident); corpus docs/GI_OMP_PORT_MASTER_PROMPT.md; pipeline s1.
- loadProfile('profile.yaml').graph => substrate corbell verified host-side.
- st-corbell-port + st-populate-substrate 10/10 green; corbell-build --target fork-v143/live-tree warm nodes=2086 edges=9386 (method=1949 calls=4698 traces-to=4688).
- TOKEN: CORBELL_SUBSTRATE_LIVE (subagent CorbellFinish; verified this turn).


## [2026-09-14] PORT WAVE — HunterAdapters tool adapters (hunt path LIVE)
- src/hunter/tools/bug-hunt.ts NEW (REAL micro-loop under hunt-lock, fail-closed INCONCLUSIVE, owned-lifecycle teardown) + query-registration.ts NEW (7 structural verbs READ-ONLY over session store, semantic/docs loud UNAVAILABLE) + report-writer-local.ts NEW (LOGIC ONLY: 500-cap + stripBeforeSeal + N-versioned local markdown, network + likec4 CUT).
- src/omp/extension.ts: bug-hunt action=hunt wired via createBugHuntTool; graph-query delegates must-implement/rule/violations/consistency to ported runQuery; banned imports clean (no plugin, no .min()).
- PROOF: st-hunter-port 3/3 + tools+populate 8/8 (11 pass 0 fail); host spawnBugHunterLoop state=done findingsCount=2 reportPath MASTER_CONTEXT/bug_hunter_report_v1.md.
- TOKEN: HUNT_DONE (subagent HunterAdapters; tools import OK + battery verified this turn).


## [2026-09-14] PORT WAVE — VerbsParseGrade parse-grade verbs (W4)
- src/omp/typed-write.ts: every verb filter widened to IN ('calls','traces-to','imports') (17 traces-to hits); WhoCallsRow gains kind+predicate; new exports impact/safeDelete/gateAdvisory (extension.ts untouched, md5 546459b13fa69925335490f03341c687).
- tests/st-verbs-parse.ts NEW 6/6 (474 expects) on warm fork checkout: whoCalls openStore rows=31 traces-to=19; impact_reaches=158 depth ledger + next=chain hint; safe_delete names execute (tools/graph-query.ts:52); advisory names 31 callers.
- No substrate regression (populate+substrate green).
- TOKEN: VERBS_PARSE_GRADE (subagent VerbsParseGrade; battery + host proof verified this turn).


## [2026-09-14] PORT WAVE — extension bundle rebuild + host deploy (new verbs live)
- Bundle was STALE (22:19, 44KB, no impact/safeDelete/gateAdvisory/hunt adapters); rebuilt via `bun build src/omp/extension.ts --outdir extensions/graph-intelligence --target bun --format esm --bundle` (126 modules, 454KB).
- extensions/graph-intelligence/index.js promoted (sha16 490b6bd550d5531c) + deployed to ~/.omp/agent/extensions/graph-intelligence/index.js (identical).
- Full battery post-deploy: 48 pass / 0 fail / 636 expect across 12 files.
- Effective next OMP session (host restart is operator action per D8).


## [2026-09-15] PORT CT RUN — Phase E on omp-ct:master, dual-FRESH (god-loop-gi-ct W5)
- ARTIFACT: .omp/ct-results-port.json — overallVerdict PASS, 20/20 live scenarios + AD5 PASS-BY-ST (host battery, no TUI claim). Containers: gi-omp-port (primary) + gi-omp-port2 (dual-FRESH B), both omp-ct:master, model Laguna S 2.1 (free)/openrouter, age-bound at verdict (both RUNNING + tmux up).
- DISTS: GI 89ce7270e1554a89 / trident 8756baac20ebb92f — deployed to BOTH containers, sha-verified in-container (exec).
- SURFACE PROVEN LIVE (tool-result context): P1 PROBE_TOOL_OK (+B port-fresh-b); P2/P7 substrate=corbell rows=31 (12 calls + 19 traces-to); P3 FULL cancel:true GRAPH_GATE_SIGNATURE_BREAK + file UNCHANGED (gate log); P4 findingsCount=497; P5 HUNT_DONE runId=gi-study-src-hunt-20260914-1 findingsCount=296 + report artifact 453,718B on disk (header runId/findings/sections; wiring.no-dead-module evidence quotes); P6 rows=160 root=openStore depth=5; P8 impact_reaches=158 + ledger + hint; P9 safe_delete: callers=31 reaches=158 uses=2 testReach=0; P10 rows=1 runQueryTool->runQuery [calls]; P11 [GATE STEER] callers=31 naming file:line; P12 GI_AUDIT_NOT_WIRED; P13 STEER [GATE STEER] advisory removed=gateProbe + landed; P14 OFF token:null + landed + zero tokens; P15 ripwire tool present + loud RIPWIRE_MISSING (binary absent in image, named); P16 dual-FRESH disjoint stores (A corbell 2086/9386 betaUnique ABSENT; B indexer-fallback CORBELL_NOT_WARM:absent nodes=2 betaUnique PRESENT).
- REFUSALS: GI_SCOPE_REFUSED (names owner), QUERY_INVALID: delete, GI_STORE_CORRUPT (corrupt file) → rm → named fallback (stale, freshness law) → checkout refresh → reconciled substrate=corbell rows=31. AD1 empty target rows=0 no crash.
- BUGS FOUND + FIXED THIS RUN (all logged with verbatim tokens):
  1) TOOL-NAME COLLISION: trident-omp dist registers the GI tools from the GI source AT ITS BUILD TIME; a stale baked dist shadowed the fresh GI bundle (symptoms: no substrate line, hunt→status shape). Fix: rebuild BOTH dists on every GI change + deploy together. CLASS: build-time-frozen duplicate registration.
  2) `path is not defined` — scan.ts resolveCorpusPaths used path.* without node:path import; live compile path only (stub-battery ST never exercised it). Fix + NEW battery tests/st-hunter-live.ts (no stubs; full live chain incl. HUNT_DONE event row) — pins the live route.
  3) corbell-adapter split-brain: guard resolved a binary, build exec used bare `corbell`. Build now execs the resolved binary.
  4) HOST corbell repair: ~/.local/bin/corbell was an editable install pointing at /tmp/corbell-ref (wiped — the tmp-install class the adapter comments warn about); venv lacked tree-sitter. Fixed: shebang→venv python + tree-sitter + 9 grammars into /home/leviathan/corbell-venv; st-corbell-port 6/6.
  5) CONTAINER provisioning: omp-ct ships no corbell; real CLI installed at /opt/corbell-venv (pip --no-deps; --help exit 0 — the adapter's durable site).
- BATTERIES: host 49 pass / 0 fail / 644 expect across 13 files (incl. st-hunter-live NEW). st-corbell-port 6/6.
- REMAINING (next waves, non-blocking for the port stop): P6 swaps (W8 writer / L6 trace / SRO map) recorded in the manifest queue; LIVE re-hunt same-ids (K20.3) double-run; fallback_reason meta key clear-on-corbell cosmetic.


## [2026-09-15] RIPWIRE BAKE + EDIT-CHECK DELEGATION (operator order: install + test properly)
- IMAGE: ripwire 0.6.0 baked into omp-ct:master (ct-image/Dockerfile.ripwire addendum layer FROM omp-ct:master + COPY stage/ripwire + chmod + `--version` RUN; Dockerfile.omp-ct also updated with the COPY for future full rebuilds). VERIFIED from a FRESH throwaway container (gi-omp-rwv) off the rebuilt tag: /root/.local/bin/ripwire 49,709,320 B, `ripwire 0.6.0 (Release, GNU 14.2.1, emit=std::print, built_from=unknown)`.
- HOT: binary copied into gi-omp-port + gi-omp-port2; in-container smoke: `--callers=openStore --json` on the study tree in 13ms → {"of":"openStore","defs":1,"count":6,"callers":[...]}; `--edit-check`/`--safe-delete` run; named errors on empty trees (no hangs).
- BRIDGE (NEW src/omp/ripwire-bridge.ts): RIPWIRE_BIN → ~/.local/bin → PATH resolution; spawnSync bounded 8s; parses {callers:[{t,n,p}]} → {name,file,line}; fail-soft {present:false,reason}. gateAdvisory gains the 4th arg (RipwireNote) — notes: "(store-derived + ripwire edit-check: N live callers; e.g. …)" | "(store-derived; ripwire absent: …)" | "(store-derived; ripwire not consulted)". extension.ts gate verb consults + passes. The W4 "no ripwire edit-check module exists in this tree" note is CLOSED (it was a flag on the external binary, never an in-tree module).
- ST: tests/st-ripwire-bridge.ts NEW 3/3 (PRESENT path incl. cross-check: live-tree ripwire sees tools/graph-query.ts callers for openStore; ABSENT hermetically; note variants). Battery now 52 pass / 0 fail / 660 expect across 14 files.
- DISTS: GI 3ee3e0c9fa3e9b10 / trident 84735f2ce430a3db — deployed to gi-omp-port + gi-omp-port2.
- TUI EVIDENCE (gi-omp-port, relaunched): xd://ripwire {"verb":"doctor"} + {"verb":"callers","target":"openStore"} now ANSWER (RIPWIRE_MISSING count = 0 in the stream; real ripwire XML shown). gate verb: `substrate=corbell [GATE STEER] symbols=openStore callers=31 review: … (store-derived + ripwire edit-check: 6 live callers …)` — the agent cross-checked: ripwire's 6 (readStoredGraph, runGraphLogicDiagnostics, map, createMicroLoop, openAndNextRunId, runQueryTool) match its own callers result exactly.
- ROOTS: gate consults ripwire at the session scopeRoot (/workspace) — session-consistent, not repo-specific.
- ADDENDUM: ripwire doctor 7/8 — the single failed row was binary-path on_path=0 (NOT ON PATH); fixed in the image (ENV PATH="/root/.local/bin:${PATH}" added to Dockerfile.ripwire + Dockerfile.omp-ct, tag rebuilt, `docker image inspect` shows PATH="/root/.local/bin:…" first). Running rigs unaffected (the extension + bridge resolve via ~/.local/bin/ripwire regardless).


## [2026-09-15] FULL-PORT WAVE — graphify substrate + hunter seam + audit face + tool wiring + dual-FRESH TUI PASS (god-loop W1-W9)

**The built:** (1) `src/hunter/graph/graphify-adapter.ts` NEW (GraphifyAdapter + build/buildSync + mapGraphifyToTyped + resolveGraphifyBinary + resolveGraphifyOut; kind/predicate maps fork-bridge semantics; lineless passthrough); (2) `src/omp/populate-graphify.ts` NEW (async `populateFromGraphifyCheckout` + `writeGraphifyCheckout` + freshness probe + GRAPHIFY_CHECKOUT_REL); (3) `src/omp/populate.ts` switch (`opts.substrate==='graphify'` → sync bridge; DEFAULT corbell byte-identical); `src/hunter/graph/interface.ts` `case 'graphify'` (Substrate widened corbell|ix|graphify); (4) `src/hunter/profile/schema.ts` substrate enum + `graphifyOut` field; (5) `scripts/graphify-build.ts` NEW (explicit extract → inspection checkout); (6) `src/hunter/shared/line-resolve.ts` NEW + `map.ts` LINELESS guard + `assertMappableLines`; (7) `src/hydra/` NEW TREE (client-reader/map-reader/auditor/pipeline + templates 14 R18-R31 + 3 batteries); (8) `extension.ts` audit bind (269+) + graph-query substrate/targetPath wiring (params + freshness branch + `runGraphQueryVerbs` extraction, default path identical); (9) `tests/st-graphify-port.ts` NEW (10 tests: extract/calls-spine/counts/empty/hermetic + tool HIT/MISS/REGRESSION/DENIED); `tests/st-hunter-live.ts` W4 graphify live leg; (10) `docs/GRAPH_ROUTING.md` + `docs/ct-plan-graphify.md` + `.omp/ct-results-graphify.json` (PASS) + report v2 + W9 erratum.
**The why:** DPL1 `GI_OMP_FULL_PORT_DPL1_SPEC.md` B.2 items 1-14 (audit stub `GI_AUDIT_NOT_WIRED` retired as a capability; F-01/F-02 operator rejections; K20.3 + dual-FRESH proof owed).
**The how:** 4-lock single-batch dispatch (Graphify/HunterSeam/AuditFace/Proof, disjoint files) + orchestrator verify (per-hunk audit, FULL battery on every return) + 2 follow-up transfers (routing hunks; tool-surface wiring) + both-dists rebuild + dual-FRESH TUI proof. Failures F-05 (phantom bridge import) + F-06 (tool-surface gap) fixed same turn, both in FAILURE_LOG.
**The evidence:** Battery `111 pass / 0 fail / 977 expect()` across 18 files (15 ST + 3 hydra; st-graphify-port solo `10/0/84`); dists GI `cf464e58f44979ef5f4591b92e1784a4717bfe46c87aa8ea90ec06180c0b34ce` (565,367 B) + trident `b19c166e16b0939b4670d07266aa1b738795ea51107be4aabf3b8abf22ea1e1f` (15.1 MB) — identical host/extensions/both-rigs (exec-verified); CT artifact `.omp/ct-results-graphify.json` overallVerdict PASS (6/6 + AD 5/5, circuit 10/10); K20.3 row INCONCLUSIVE named (K203_RUNID_SEQUENCE, findings-identical PASS).
**The verification:** TUI tool-result excerpts — G1 `substrate=graphify graph=/tmp/fx383g/graphify-out/graph.json nodes=5 edges=5 rows=2 beta.ts:1 beta():2`; G2 `impact_reaches=2`; G3 `HUNT_DONE runId=gi-study-src-hunt-20260915-2 findingsCount=296` + 453,787 B v3; G4 `AUDIT_DONE layer=R28-sro-graph findings=3 reportPath=.../R28-sro-graph-1789455224867/findings/report.md` (1305 B); G5 all verbs named + fail-soft; G6 PROBE_TOOL_OK x2 + graphify isolated to A; AD rows all named. Host smoke: /tmp/gfx graphify populate nodes=6 edges=6, whoCalls rows=2, impact 2, safeDelete 2. Provenance `PORTED FROM` 14/14 new files; serve-spawn grep EMPTY.
**The honest notes:** tsc-noEmit stays red on the pre-existing class (Database-vs-{run} + extension cast; wave adds zero new classes — EN-009 + runtime BATCH-CALL-RUNTIME-OK proof); `bun test` default glob (10 files `116/0`) differs from the 18-file gate enumeration (`111/0/977`) — the enumeration is the gate number (EN-003 class); graphifyy CLI lives on HOST only (container audit reads staged graph.json — the D1 local-scan decision, serve never in-process); K20.3 runId-identity unsatisfiable by recon design (S8 should assert findings-identity — report v2 S8 note).

## [2026-09-15] SHIP-PACKAGE — GI-OMP full-port wave sealed (ship assembly milestone)

**The built:** Ship package assembly for the full-port wave (graphify substrate + hunter seam + audit face + tool wiring + dual-FRESH TUI PASS): Phase A ship-docs refreshed to green (DEBUG EN-010, FAILURE F-07, SPEC V-10/V-11 + evidence annex), Phase B canon (single-doc RUNNING_BUILD_LOG wave entries), Phase C 5 blocks staged FROM the docs, Phase D dist gate (GI + trident SHAs exec-verified 4-way), Phase E native assembly under `Ship_Packages/`, Phase F checkpoints + git history, Phase G boilerplate, Phase I git lifecycle. Ship-package TUI re-proof (NOT a re-quote): FRESH headed container legs re-driven on the SHIPPED dists per the operator's standing order (grep is not a test).
**The why:** Operator order `/ship-package` with the explicit law — order is law, any gate fails = stop/fix/retry, never ship a red package — plus the standing ruling "GREP IS NOT A FUCKING TEST YOU NEED TO SPAWN A LEGIT HEADED TUI CONTAINER AND TEST IT PROPERLY."
**The how:** update-ship-docs S1–S6 run FIRST (caught S1 SPEC-thin + S5 dual-SHA-order live, fixed with real content, re-ran to green); canon RUNNING_BUILD_LOG wave entries (single-doc canon on this tree — no CANON_MANIFEST, no 11-doc set; stated plainly, never faked); blocks extracted from the now-current docs (never memory); dists rebuilt BEFORE the wave's TUI proof and never touched after (fingerprint continuity); headed TUI re-proof on the shipped SHAs; package assembled ignore-aware; PACKAGE_AUDIT mechanical checks; checkpoint sealed per saving-checkpoints; boilerplate per extracting-production-boilerplates.
**The evidence:** Battery `111 pass / 0 fail / 977 expect()` across 18 files (re-run at assembly); ship TUI re-proof tokens (tool-result context, gi-omp-port + gi-omp-port2, dists `cf464e58f44979ef` + `b19c166e16b0939b` exec-verified in-container before legs): PROBE_TOOL_OK both rigs; G1 `substrate=graphify rows=2 beta.ts:1 beta():2`; G4 `AUDIT_DONE findings=3 reportPath=.../findings/report.md`; G3 `HUNT_DONE findingsCount=296`; G6 graphify isolated to A; AD rows all named. PACKAGE_AUDIT verdict PASS (artifacts exist, manifest SHAs == packaged SHAs, docs counted, zero secret patterns, tests present).
**The verification:** Pasted outputs in TESTING_LOG ship-package result entry (battery tail, in-container sha256sum lines, per-leg tool-result excerpts, audit verdict). Checkpoint `Checkpoints/gi-omp-full-port-wave-shipped-<sha16>/` sealed with manifest + structure doc.
**The honest notes:** Canon on this tree is ONE doc (`context_management/RUNNING_BUILD_LOG.md`, 156+ lines) — there is no 11-doc canon set and no CANON_MANIFEST, so Phase B's U1–U4 200-line gates do not apply; the equivalent (wave entries after every wave + cross-doc SHA agreement) is met and stated. tsc-noEmit stays red on the pre-existing structural class (EN-009, runtime-green, zero new classes). K20.3 runId-identity unsatisfiable by design (V-11, findings-identity PASS). The trident dist SHA is recorded mid-entry; the GI manifest-artifact SHA closes this file (`cf464e58f44979ef5f4591b92e1784a4717bfe46c87aa8ea90ec06180c0b34ce`).

## [2026-09-15] GO 6-KEY + OPENROUTER-ONLY FALLBACK (operator order)

**The built:** 6th Go key provisioned (`~/.gi-keys.json` 5→6, 0600 kept); `go-key-pool.ts` §FALLBACK (`:263-323`: openrouter laguna s2.1 free constants, `decideGoFallback`/`routeGoError`/`goFallbackSnapshot`); `tests/st-go-fallback.ts` NEW (8 tests). Pool header re-titled 6-KEY with provenance.
**The why:** Operator order verbatim — 6th key into the cycler, openrouter fallback if all Go down on ORIGINAL mechanics, ONLY OPENROUTER (no inferx/nvidia), proxy-record hardening so aether agents don't stall.
**The how:** Mapped proxy (§6 contract already in-tree as `classifyGoError`; proxy ACTIVE/healthz-green/single-listener — no proxy change) + boilerplate mechanics (transport-chain retry/fall/stall/degenerate/loud-end anchored as the doc contract) + zero-Go-LLM-sites verification (hydra is a deterministic sweep, nothing to stall). Wired the chain half the pool was missing.
**The evidence:** Battery `119 pass / 0 fail / 1004 expect()` across 19 files; fallback solo `8/0/24`; `GO_KEYS len: 6`; live `go-4-alive` + all-dead→openrouter + contract-no-mark + quota-advance proofs. Dists rebuilt: GI `34ba3ffe2b0b68ef` + trident `67dc892a55c06e11` (identical host/deploy, pre-TUI-reproof baseline).
**The verification:** Runtime outputs pasted in EN-012; battery tails this turn; headed TUI re-proof in TESTING_LOG (next entry).
**The honest notes:** Pool file holds 6 funded keys (fingerprints only in logs, AP-4); openrouter key rides env/auth.json derivation (never in source); proxy untouched (healthy); K20.3/V-10/V-11 carried opens unchanged.

## [2026-09-15] SHIP SEAL — dists rebuilt post-rename+fallback, manifest re-baselined

**The built:** Final seal entry. Changes since the last seal: aether-code-audit rename (canonical + alias, `extension.ts:18-22,327-338`, tools battery updated) + Go 6-key + openrouter-only §FALLBACK + `tests/st-go-fallback.ts`. Both dists rebuilt AFTER all source changes and deployed host-side.
**The evidence:** Battery `119/0/1004` (19 files); fallback solo `8/0/24`; pool `GO_KEYS len: 6`; CT PASS artifact + ship TUI re-proof (TESTING_LOG). Manifest artifact GI `34ba3ffe2b0b68ef913ca851efda6a4b4aa1beec65bc4f55d2458969c7bf8bf9` (566,951 B, host + deploy identical, both rigs pending re-verify at re-proof).
**The verification:** `sha256sum` lines + battery tails + TUI excerpts in TESTING_LOG seal entries.
**The honest notes:** Trident sibling `67dc892a55c06e1113035d6b6c34111cbedd283ee3dc66255fc9fbd7524fbd93` recorded mid-entry; the MANIFEST-artifact GI SHA closes this file (`34ba3ffe2b0b68ef913ca851efda6a4b4aa1beec65bc4f55d2458969c7bf8bf9`).

## [2026-09-15] RESCOPE — self-contained repo Shared_Workspace/Graph_Intelligence (operator order)

**The built:** 743-file SHA-gated move from `OMP/Graph_Intelligence` (archive husks left, never deleted); `MIGRATION_MANIFEST.md` (761 lines, 743/743 match); anchor rewrite (`corbell-adapter.ts:185` + 13 files OMP→Shared_Workspace root); fresh repo `jarvis/gi-main` commit `c3db965`; detached worktree `Graph_Intelligence-wt-gi-ship`; graph-tools-docs skill (SKILL + 5 references, mirrored at `skills/graph-tools-docs/`); rescope-target companion skill; EN-013/F-10/V-15 records.
**The why:** Operator order — clean git tree for the entire GI pipeline; plus graph-tools-docs full set; plus refresh + ship + qwen-audit to follow.
**The how:** rescope skill (survey → move → verify) + rescope-target inputs (TARGET/SOURCE/REWRITES/EXCLUDE); node_modules excluded, symlinked-only for the verification battery, then removed.
**The evidence:** `VERIFY: 743/743 match`; battery `119/0/1004` from the NEW root; `git log` baseline commit; worktree list both trees.
**The verification:** SHA gate output + battery tail + git log/worktree outputs this turn.
**The honest notes:** Mimocode-path rewrite = ONE code anchor (`corbell-adapter.ts:185`, OPENCODE kept as fallback) — no `Shared Workspace Context/MIMOCODE` hits existed in code/tests/scripts; OMP git still shows deletions-vs-HEAD (its history preserved; new history starts here). F-10 red-then-green battery recorded.
