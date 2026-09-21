# RUNNING_BUILD_LOG — GI-OMP

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

## [2026-09-14] GI accuracy baseline + optimize loop (overnight setup)
- ripwire map 238 files: 0.27s wall, 22668 B top-200 XML
- OMP parseExports recall 0.366 -> 1.000 (ported fork GG-BUG-2 v2 semantics: declaration + braces-alias + default)
- populate 238 files: 1940 nodes baseline -> 2035 nodes / 1857 edges, 0 dangling dst (star-merge + declaration scope check + package skip)
- who-calls macro-P 0.523 / macro-R 0.568 vs ripwire --callers ground truth (8 symbols)
- query p50 0.2ms host; bottleneck = 3890 open-close sqlite cycles per populate
- gap classes: def-only zero-inbound (correct), method-site miss, file-vs-fn label mismatch, no line numbers, chain/unwired/hunt/audit unwired
- TUI: Grok 4.6 quota 403 -> MiMo V2.5 Free 429s -> zhipu GLM-5.3-Flash live; who-calls runQuery rows=6; QUERY_INVALID MATCH@1039747; blast rows token PENDING
- BUG FOUND IN TUI: graph-query used bare `cwd` (GI_QUERY_FAIL ReferenceError: cwd is not defined) — fixed to scopeRoot from cwdOf(ctx), ST 22/22
- frozen: .omp/BASELINE-2026-09-14.json + /tmp/gi-accuracy-store.sqlite (2035/1857/0-dangling)
- new ST: tests/st-gi-omp-populate.ts (recall + frozen counts + verbs; needs --timeout 120000)

## [2026-09-14] Pending-map sweep: SC-11 + frozen counts + v12 redeploy
- SC-11 GRAPHIFY_GRAPH_TOO_LARGE: ported EN-38 guard as parseGraphJsonGuarded (typed-write.ts) + 129MiB ST in corrupt suite; ST 23/23 (61 expects) + populate 4/4
- frozen counts fixed to v11 (2035/1857); populate ST green
- v12 dists rebuilt (gi 1fa83d93 / trident c3fee889), deployed to gi-omp-w7, SHA-verified in-container, omp bounced 14:28 UTC
- v12 TUI: who-calls runQuery rows=6, no new GI_QUERY_FAIL (9 historic hits predate the scopeRoot fix)

## [2026-09-14] R2+R4+R5+R6: batch populate, line numbers, live verbs, hunt status
- R2 batch: collect-then-single-transaction; populate 24.6s -> 0.5s (49x); counts frozen 2035/1857/0-dangling
- R4 line numbers: parseExportSites (declaration lines); Function nodes carry line (fork schema parity)
- R5 chain+unwired LIVE (GI_VERB_NOT_WIRED retired): chain rows=1 runQueryTool->runQuery (ST + TUI); unwired rows=1259 host
- R6 hunt status LIVE: state=done findingsCount=1183 fixOrderCount=20 (TUI); GI_HUNT_NOT_WIRED never fired on v13
- v13 dists (gi 1c3747e3 / trident d7c83ab9) deployed, SHA-verified, bounced; ST 23/23 + tools 4/4 + populate 4/4
- REMAINING STUB: gi-audit (GI_AUDIT_NOT_WIRED) — R8 will record, not wire (audit engine out of scope)

## [2026-09-14] R3+R5+R6+R7+T-8: method sites, live verbs, hunt, dual-label, retrieval branch
- R3 measured: 3638 distinct method-style callee names vs 20377 bare occurrences; method attribution deferred (bare-call lookbehind excludes obj.foo(); ripwire FN gap class documented, not silently claimed)
- R5 chain+unwired LIVE: chain rows=1 runQueryTool->runQuery (ST + TUI v13); unwired rows=1259 host
- R6 hunt status LIVE: state=done findingsCount=1183 fixOrderCount=20 (TUI v13); GI_HUNT_NOT_WIRED retired for status
- R7 dual-label: fn-only macro-P 0.982 / R 0.568 (vs all-label 0.523/0.568) — file-node callers are import-site labels, a different unit
- T-8 CLOSED: code-retrieval skill is four-engine with warm-store branch
- v13 dists (gi 1c3747e3 / trident d7c83ab9) deployed to gi-omp-w7, SHA-verified, bounced

## [2026-09-14] Mimo CT parity port + laguna default + rename + scouts
- CT port (trident-omp/src/tools/container-testing.ts): adopt flag, docker.sock passthrough, NATIVE provision (openrouter credential from image auth store -> omp vault + modelRoles pin), trust-dialog auto-clear, status-bar wait, pipe-pane retry x5 + stream reset; required-array fix for code-retrieval i param
- DEFAULT CONTAINER MODEL = openrouter/poolside/laguna-s-2.1:free (smol laguna-xs-2.1:free); E2E: fresh gi-omp-w8 "PROVISION openrouter-credential:inserted model:roles-created" + omp -p -> W8_LAGUNA_OK (6.8s); w7 TUI boots on Laguna S 2.1 (free)
- gi-audit -> graph-code-audit (tool name, skills, docs); ST green; dists gi 34b9d7df / trident b98b0ace deployed host + w7
- Scouts: en38 (G1-G21, G21 = our 0.568 gap ancestor), paragon (A1-A12 corbell), bibles (23-step hunter port plan)
- Tool channels: ripwire+opengrok native tools VALIDATION-REFUSED on i-missing (wrapper bug, fixed in 4 files); opengrok search endpoint anonymous-200; projects/config 401

## [2026-09-14] omp-ct:master image + threads + cutover
- Subagent OmpCtImageBuild (15m39s): FROM mimo-ct:master; full OMP runtime (1.1GB node_modules; V1 failed loud @babel/parser -> V2 full tree); baked config (laguna pins, mnemopi), models.yml, 3 extensions (trident b98b0ace / gi 34b9d7df / code-retrieval), threads (/root/.omp/threads + THREADS_CONTRACT.md), skills (update-thread/journal-master/threads-manager)
- Thread created: MEMORY-journal-thread-container-testing.md (+omp-ct BUILT entry); note: ct-image/UNIVERSAL_MASTER_IMAGE_NOTE.md
- Auth staged (mimo pattern): opencode-auth.json from w7 -> image; rebuild 4.6s -> omp-ct:master 3.76GB id 3a25c2af5387
- Smoke: PROVISION openrouter-credential:inserted model:default-set; omp -p -> OMPCT_OK EXIT=0; boot shows [gi-omp] ... graph-code-audit + [code-retrieval] registered ripwire, opengrok
- CUTOVER: ct-tui-registry.ts:8 CT_IMAGE_OMP -> omp-ct:master; trident dist ae21b54fa33a8b7b deployed (host; effective next session)

## [2026-09-14] corbell forensics + opengrok fix + adapter-emitted config PROOF
- Corbell bug ledger extracted (12 classes): init-template clobber, broken template, RELATIVE-ROOT law, quoted version, scaffolding-only false-clean, EN-22 bypass (substrate+scope:src+8 excludes -> 56,690 methods), HT-BUG-16 orphan spiral + warm-skip, coupling scope law (742MB store + 30min stall), walk-exclude V-SCOPE-1, STORE_BLOATED >512MB guard, BUG-B resolveCorbell, BUG-2 path leak, node-data enrichment, 640-file hang suspects
- PROOF: exact adapter-emitted config (root:"..", repo:.., version "1", excludes, coupling knobs) -> 1949 methods / 9387 edges (4698 method_call + 4688 flow_step) / 63.8s / 2021 nodes
- WHY NOT WIRED: OMP port scoped to store+tools+gate; hunter machine (map.ts->selectAdapter->CorbellAdapter) never ported; regex populate is the stopgap. Wiring = bible steps 1-4 + store mapping
- OpenGrok FIXED: token via container-root chmod (644); wrappers now env||token-file on ALL ops (3 JS + trident TS; JS syntax OK); trident dist b42dba95fa867ed6; authed search 200 + resultCount 5 "ripwire". Index covers only 4 skill projects (checkpoint/OMP trees not indexed - index miss not down)
- ripwire local 0.6.0: --mcp persistent index server + --listen HTTP + --mcp-token + --html confirmed

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

## [2026-09-15] FULL-PORT WAVE CLOSE — graphify substrate + audit face + tool wiring + dual-FRESH TUI PASS (orchestrator record)
- LOCKS: GraphifyLock (adapter + populate leg + schema + routing hunks + tool wiring follow-up) + HunterSeamLock (line-resolve + LINELESS guard + live-leg extend) + AuditFaceLock (hydra tree + audit bind, 39/0/171 + bind AUDIT_DONE) + ProofLock (routing doc + CT plan + K20.3 row + report v2) — all COMPLETE, transcripts at history://<Lock>.
- FOLLOW-UPS (orchestrator transfers, disjoint): routing hunks (interface case + populate switch) + graph-query substrate/targetPath wiring (params + freshness branch + runGraphQueryVerbs; ST HIT/MISS/REGRESSION/DENIED). Failures F-05 + F-06 in FAILURE_LOG.
- GATES: battery `111/0/977` (18 files); dists GI cf464e58f44979ef (565,367 B) + trident b19c166e16b0939b (15.1 MB) identical host/extensions/both-rigs; CT `.omp/ct-results-graphify.json` PASS (6/6 + AD 5/5, 10/10 breaker); tsc wave adds zero new classes (EN-009); provenance 14/14; serve-spawn EMPTY.
- TUI TOKENS (tool-result): substrate=graphify rows=2 beta.ts:1 beta():2; impact_reaches=2; HUNT_DONE runId=gi-study-src-hunt-20260915-2 findingsCount=296 + 453,787B v3; AUDIT_DONE findings=3 reportPath=.../R28-sro-graph-1789455224867/findings/report.md (1305B); PROBE_TOOL_OK x2; AD rows all named. Rigs RUNNING + tmux up at verdict.
- SHIP DOCS: BUILD_REPORT +138L wave entry; DEBUG EN-007/008/009; FAILURE F-05/F-06; SPEC V-07/V-08/V-09; TESTING plan+result zones; manifest Baseline cf464e58... + counters EN-009/F-06/V-09/P-01. Report v2 carries the W9 live-proof erratum (v1 frozen).

## [2026-09-15T12:14+04:00] — SHIP-PACKAGE Phase A green (S1–S6) + assembly authorized
- WHAT: update-ship-docs full pass — EN-010/F-07 captured perishable first, SPEC V-10/V-11 + evidence annex then V-12/V-13 + annex II + remediation ledger (every VIOLATED row dispositioned; OPEN carried: V-10 LOW loader-test, V-11 MEDIUM K20.3-text), BUILD ship-package entry closing on GI SHA, manifest refreshed (EN-010/F-07/V-13/P-01).
- WHY: /ship-package order-is-law — Phase A must be green before any assembly.
- HOW: first gate run FAILED (S1 SPEC 16 lines, S5 dual-SHA tail order) → fixed with real content only, re-ran to green.
- EVIDENCE: wc 146/83/59/60/151+ lines; BUILD tail cf464e58 == TRUE SHA; battery 111/0/977; CT PASS 11/11 breaker 10/10.
- NEXT: Phase C blocks → Phase D dist gate → Phase E assembly → checkpoint → boilerplate → audit → headed TUI re-proof → show-me.

## [2026-09-15T14:25+04:00] — FINAL SEAL: rename + 6-key + fallback, TUI re-proof green
- WHAT: aether-code-audit rename (canonical + alias) + Go 6-key provision + openrouter-only §FALLBACK + st-go-fallback 8/8; both dists rebuilt; ship docs re-greened (S5 MATCH, manifest re-baselined 34ba3ffe); headed TUI re-proof on FINAL SHAs.
- WHY: operator cleanup order — audit naming, pool depth + last rung, proxy-record hardening.
- HOW: map-first (proxy ACTIVE single-listener; §6 classifier in-tree; zero Go LLM sites in hydra) → file-provision 6th key → §FALLBACK chain half → battery → rebuild → docs → dual-rig re-proof.
- EVIDENCE: battery 119/0/1004 (19 files); GO_KEYS len 6; live go-4 + all-dead→openrouter; TUI PROBE x2, substrate=graphify rows=2, AUDIT_DONE findings=3, HUNT_DONE 296 + v6 artifact, B honest-zero.
- NEXT: package + checkpoint refresh on 34ba3ffe (stale cf464e58 set) — or ship as source-sealed state per operator call.

## [2026-09-15T17:09+04:00] — QWEN FIX WAVE green (all 45 addressed)
- WHAT: V-16 txn helper + freshness/token/dirname fixes; adapter id/lines/dangling/index fixes; extension trust/dial/legs/parse fixes; pool window/bounds/snapshot/empty fixes; auditor read/grep/evidence/drive/stale/write/cycles/isolate fixes.
- WHY: operator order — fix EVERYTHING qwen flagged, report all issues.
- HOW: anchored scripted replacements; stash-bisect for breaks vs flakes; 19-file battery gate.
- EVIDENCE: 119/0/1004 post-fix; solos green; diff +223/-117 across 5 files.
- NEXT: rebuild both dists → TUI re-proof → ship docs seal → package/checkpoint refresh → qwen RE-RUN for the PASS verdict.

## [2026-09-15T18:23+04:00] — FRESHNESS WARM-WINS + BOTH-DISTS-II (G1 restored, all legs green)
- WHAT: warm-wins tail + `.omp` freshness excludes (both substrates) + trident 280fd303 (NODE_PATH xstate fix) + both-dists/both-rigs deploy + G1/G4/G3/G5 + port2 re-proof.
- WHY: G1 MISS-on-warm (inverted comparison) + EN-018 second instance (GI-only deploy vs frozen trident).
- EVIDENCE: battery 119/0/1004; GI ee122880 + trident 280fd303 exec-verified all four copies; G1 nodes=5/edges=5/rows=2 MISS-absent; G4 findings=3; G3 296/v12; G5 impact=2 + safe-delete 2/2/0/0; port2 probe + honest-empty.
- NEXT: checkpoint refresh on ee122880/280fd303; qwen RE-RUN for the verdict flip (V-16/V-17 CLOSED in source, re-run owed).

## [2026-09-15T20:15+04:00] — V-20 WAVE: gate convergence + host-deploy seal (GI eab074e3 + trident 27b1b59c)
- WHAT: corbell txn parity; per-table supersede guard; caller-owned close; projection guard; unified confineTargetPath (BOTH handlers); freshness scope+suffix parity+stale-budget; UNIQUE partial indexes; BFS seed; dirname; size-hint-only+read-once; community join; quota classifier+server; redaction; stale 100ms; grep containment; Z-anchor.
- WHY: operator order — fix all, ready for host deploy.
- EVIDENCE: battery 119/0/1004 ×3; SHAs exec-verified 4 copies; TUI G1+G4+G5 green (run-id 1789492431044); re-runs IV/V/VI = 56/55/60 findings, crits 1→0→1→0 (real crit fixed; wipe crit refuted gi-registry.ts:111).
- GATE STATUS: FAIL-by-count stands (highs ≠ 0); residual = bounded fix-now vs accepted-debt per TESTING_LOG re-run III/IV/V/VI triage. Convergence law: EN-023/F-20.
- NEXT: operator ruling on debt set → fixed-scope re-run VII → production-grade verdict.

## [2026-09-20T12:00:00] — v1.3 graph gate sealed + ship package
- WHAT: graph-gate.ts (308L) + wiring + TTSR rule + doctrine + agent bodies + 12 tests + container harness; dist 83eb7bba; ship package Graph_Intel_v1.3
- WHY: operator's v1.3 mission — LASME enforcement, never blind
- HOW: TDD module → wiring → doctrine → container angles (caught 2 real defects) → fixes → re-verify
- EVIDENCE: 230/0/1786 ×31 [8.72s]; 12/12 gate; ALL-6-PASS container ×3; SHA 83eb7bba9c5e76db
- NEXT: tetris threshold tuning (operator order); V2 scaffold consumers

## [2026-09-21T12:05:00] — v2.1 W1 THE LEDGER: src/omp/fire-ledger.ts (the calibration substrate)
- WHAT: src/omp/fire-ledger.ts (337 L) — the §8.2 fire_decisions table + the writer + the reader + the two seams. tests/st-gi-v21-ledger.test.ts (215 L, 7 tests, 36 expects).
- WHY: FireGate's config declares `ledgerPath` (fire-gate.ts:222 — "Absent ⇒ no ledger ⇒ no calibration") and NOTHING EVER READ IT. The gate has built rows in memory since it was written (fire-gate.ts:367 `rows()` — "the calibration machinery and the tests read the ledger") and every one died with the process. A threshold cannot be derived from rows that do not exist.
- HOW: TDD — the RED run (module absent, 0 pass/1 fail/1 error) preceded the implementation. The DDL is §8.2 VERBATIM; a test asserts the live table's columns equal the constant, so a silent column rename cannot slip through. The seam needs ZERO edits to fire-gate.ts (W3 owns that file): `drain()` reads the public `rows()` accessor with an object-identity WeakSet watermark, and `withLedger()` is a Proxy wrapping `judge()` so an empty ledger is impossible BY CONSTRUCTION, not by discipline.
- EVIDENCE: battery 206 pass / 0 fail / 737 expect / 21 files (baseline 199/0/701/20 → +7 tests/+36 expects/+1 file, ZERO regressions). tsc 191 == baseline, 0 new. W1 suite 7/0/36. All 5 pin-named selectors pass individually (test_ledger_row_written · test_ledger_ddl_exact · test_ledger_fails_loud · test_ledger_no_double_write · test_ledger_feeds_calibration). `derivePolicy` flips calibrated=true at 12 confirmed fires + `checkCalibrationHealth` returns ok=true with ZERO findings — the loop ENGAGES end to end.
- NEXT: W2 (the oracle) · W3 (position A) · W5 (policy store) — all unblocked. W6 stays BLOCKED on M2 (the operator's cost matrix).

## [2026-09-21T12:35:00] — v2.1 W2 THE ORACLE: src/omp/oracle.ts (the laterTruth resolution path)
- WHAT: src/omp/oracle.ts (~250 L) — the four evidence gatherers + the classification + the batch resolver. tests/st-gi-v21-oracle.test.ts (259 L, 12 tests, 37 expects). Ledger AMENDMENT: FireLedger.truthOf() (W2-driven).
- WHY: the ledger writes `later_truth='unresolved'` on every row (§6.4.7) and NOTHING EVER CHANGED IT. `precision = confirmed/(confirmed+refuted)` had no numerator and no denominator, so `derivePolicy` stayed calibrated:false forever and every threshold remained a seed guess. This is the module that converts rows into a measured curve.
- HOW: TDD — RED (module absent) preceded the implementation. The four gatherers (a) laterEdit (b) test (c) withdraw-with-a-span (d) permit; the classification CONFIRMED = harm (laterEdit|testFailed|withdrawn) · REFUTED = a permit, or >=2 corroborating signals · UNRESOLVED = everything else. ★ THE SECOND-SIGNAL LAW: one passing test is NOT corroboration — the absence of a complaint is not evidence. ★ HARM BEATS PERMISSION: a permit followed by a repair is CONFIRMED; a wrong permit convicts the permit, not the fire.
- ★ THE SPEC GAP (named, not papered): §8.2's DDL carries NO `target` and NO `tool` column, yet W2's contract is "a later edit to THE TARGET". The row cannot supply its own subject, so `resolveAll` takes it EXPLICITLY. The DDL was NOT silently extended.
- EVIDENCE: W2 suite 12 pass/0 fail/37 expect · battery 218/0/774/22 files (W1 baseline 206/0/737/21 → +12 tests/+37 expects/+1 file, ZERO regressions) · tsc 191 == baseline 0 new · `bun test -t test_oracle_resolves` PASS scoped.
- NEXT: W3 (position A) · W5 (policy store). W6 stays BLOCKED on M2.

## [2026-09-21T12:50:00] — v2.1 W3 POSITION A: the pre-act advisory (fail-OPEN), in fire-gate.ts
- WHAT: fire-gate.ts +127 L — `Intent`, `Advisory`, `intentFire()`, `advisory()`. tests/st-gi-v21-advisory.test.ts (9 tests, 45 expects).
- WHY: the operator's ruling was "1) both" — the gate in BOTH positions. This is the first half: before an act runs, ask whether the SHAPE of the INTENDED act is a violation. An act not yet taken can be steered for free; the v2.0 post-hoc refusal costs the agent the whole edit.
- ★ THE LAW IS IN THE TYPE: `Advisory.block` is the literal `false`. Position A CANNOT block, so an edit that tried to make it refuse would not compile. The fail-open polarity on this surface is enforced by the type system, not by a comment.
- ★ IT COMPOSES, DOES NOT DUPLICATE (the ripwire lens found this): the v1.3 gate ALREADY has a pre-act advisory — `gateAdvisory` (typed-write.ts:1213, churn=39 amp=11) — a DETERMINISTIC $0 caller-listing that says WHICH callers a change would break. That one INFORMS; this one ADJUDICATES. Re-deriving the caller list here would have been duplicate machinery.
- EVIDENCE: W3 suite 9 pass/0 fail/45 expect · battery 227/0/819/23 files (W2 baseline 218/0/774/22 → +9 tests/+45 expects/+1 file, ZERO regressions) · tsc 191 == baseline 0 new · `bun test -t test_advisory_open` PASS scoped.
- NEXT: W4 (position B, THE WIRING — the gate between the detector's VIOLATION and the v2.0 verdict) · W5 (policy store).

## [2026-09-21T13:10:00] — v2.1 W4 POSITION B: THE WIRING — the UNWIRED KERNEL is wired
- WHAT: kernel-v2.ts +~145 L — `worstOutcome()` (extracted, shared), `streamFromInput()`, `GateAdjudication`, `GatedKernelRun`, `runKernelV2Gated()`. tests/st-gi-v21-wiring.test.ts (9 tests, 46 expects).
- ★ THE ANTI-PATTERN LEDGER, CLASS 3 — MEASURED, BEFORE AND AFTER:
    FireGate occurrences in src/omp/kernel-v2.ts   0 → 3
    `gate.judge(` call sites                       0 → 1
    FireGate references outside fire-gate.ts       0 → 27
  At session start the gate had ZERO call sites: 370 lines of built, tested, and completely unconnected enforcement. It is now called by the kernel.
- THE CALL SITE (blueprint §S5/S6): between the detector's VIOLATION and the verdict the caller acts on. The band→action table is the blueprint's verbatim: FIRE → the v2.0 verdict applies · ESCALATE → flagged, verdict applies · IGNORE → the firing was noise, the act proceeds.
- ★ WHY runKernelV2 STAYS SYNCHRONOUS: the judge is a model call (async by nature). Making runKernelV2 async would break every existing caller and ~20 tests (a frozen surface) and would conflate the pure stage machine with the costly I/O adjudication. The gate WRAPS the stage machine — and still sits exactly where the blueprint puts it.
- ★ THE SAFE DIRECTION IS OPPOSITE POSITION A'S: an advisory must never BLOCK; this filter must never DISMISS without a real adjudication. Absent gate / down judge / spent budget ⇒ the DETECTOR'S VERDICT STANDS, named.
- EVIDENCE: W4 suite 9 pass/0 fail/46 expect · battery 236/0/865/24 files (W3 baseline 227/0/819/23 → +9 tests/+46 expects/+1 file, ZERO regressions on the MODIFIED core) · tsc 191 == baseline 0 new · `bun test -t test_gate_fire` PASS · `-t test_gate_ignore` PASS · the frozen surfaces: gate-hook.ts registerGraphGate UNTOUCHED, graph-gate.ts tier ladder 4 refs intact.
- ★ THE BOUNDARY (do not over-claim): W4 wires the gate INTO THE KERNEL. The kernel is NOT yet called from the live tool path (runKernelV2 call sites outside its file = 0) — that is the REGISTRATION, and the pin's law forbids it while the register reads up=5/11. Two levels; only level 1 is done.
- NEXT: W5 (policy store) · W6 BLOCKED on M2 · W8 needs the rig.

## [2026-09-21T13:25:00] — v2.1 W5 THE POLICY STORE: src/omp/policy-store.ts (D026 — data, not code)
- WHAT: policy-store.ts (~200 L) — PolicyFile, read/write (ATOMIC via temp+rename), validatePolicies, PolicyStore (load/reload/get/all/version/validate). packages/gi-kernel-v2.1/policies/policies.json SHIPPED (all 3 classes). tests/st-gi-v21-policy.test.ts (8 tests, 36 expects).
- WHY: a threshold is a DECISION, and a decision living in source can only change via a rebuild. The operator's cost posture is a number they OWN and may revise. The recipes live in versioned JSON; a human edits them without touching the build.
- ★ THE ECONOMICS IT UNLOCKS: the probability is already stored on every row (§6.4.3 rule 4). Changing a threshold RE-BANDS those stored probabilities — it does NOT re-ask the model. 50 fires can be re-bandied under a revised posture for $0, which is what makes calibration ITERATIVE instead of expensive.
- ★ EXIT GATE MET (measured in the test): p=0.80 under act=0.75 → band=act/FIRE. The file is edited to act=0.90, reload reports changed=true version=2. The SAME stored probability 0.80 → band=escalate/ESCALATE, policyName dumb-tightened, costUsd=0, and **calls.n === 1** — the model was asked exactly ONCE across the whole sequence. No re-inference.
- ★ A POLICY THAT CANNOT BE LOADED IS LOUD: MISSING (no silent seed substitution) · MALFORMED (bad JSON / non-numeric / no name) · RANGE (outside 0..1) · INVERTED (act < flag would EMPTY the escalate band). The one non-silent fallback: a rule ABSENT from the file falls to its class seed in fire-gate.ts — the documented pre-calibration path.
- EVIDENCE: W5 suite 8 pass/0 fail/36 expect · battery 244/0/901/25 files (W4 baseline 236/0/865/24 → +8 tests/+36 expects/+1 file, ZERO regressions) · tsc 191 == baseline 0 new · `bun test -t test_policy_reload` PASS.
- NEXT: W6 BLOCKED on M2 · W7 the measurement plan · W8 the container rig.

## [2026-09-21T13:35:00] — v2.1 W8 THE CONTAINER: the Phase F artifact EXISTS (the named residual CLOSED)
- WHAT: .trident/ct-v2.1/ created · .trident/container-test-results.json (4121 B, valid JSON, Phase F shape).
- WHY: EVERY prior "container tested" claim in this project rested on TERMINAL OUTPUT. The Phase F artifact — the per-scenario record the next session can verify — was named as residual #2 in the compaction prep. It now exists.
- THE RUN: staged src/. tests/. packages/. into stupefied_morse:/work/gi (the TRAILING SLASH law — without it docker cp NESTS the directory), cleaned /tmp, and ran the battery with the container's own bun 1.4.2.
- EVIDENCE: **244 pass / 0 fail / 905 expect / 25 files [1.55s]** in the CLEAN container. Host: 244/0/901/25.
- ★ THE +4 DELTA — ROOT-CAUSED BY MEASUREMENT (it was an unexplained 701-vs-705 in the v2.0 run):
    built the register with a cold tmp() scopeRoot and env:{} in BOTH environments, printed r.down:
      HOST 9 down · CONTAINER 11 down · 2 expects per down entry → 2 × 2 = +4 — EXACTLY the delta.
    the two extra: ABIDE and RSI_STORE probe ABSOLUTE HOST PATHS (/home/leviathan/...) that exist
    on the host and cannot exist in a container. Combined with the data-dependent loop in
    tests/st-gi-v2-deps.test.ts:112, the assertion count is a FUNCTION OF THE HOST'S FILESYSTEM.
    ★ CONSEQUENCE FOR READERS: 901 is NOT a stable constant. My new suites are IDENTICAL in both
    environments (ledger 36 / oracle 37 / advisory 45 / wiring 46 / policy 36 = 200), so W1-W5
    contribute ZERO to the delta and are HERMETIC.
- ★ HONEST SCOPE (recorded INSIDE the artifact): this is the BATTERY run, not the scenario-driver Phase F. The rig requirement (a real clean-container execution with a captured artifact) is met; the full per-scenario passToken/failToken contract with byte offsets is not. Named so no reader over-claims it.
- NEXT: W7 (the measurement plan) · W9 (the seal).

## [2026-09-21T13:55:00] — v2.1 W7 THE MEASUREMENT: M1-M12 filled — 12 MEASURED · 0 TBD
- WHAT: packages/gi-kernel-v2.1/tools/measure-campaign.ts (the M1 INSTRUMENT, ~280 L) + campaign-report.json + MEASUREMENT_PLAN.md filled.
- WHY: the operator's law — "2) get proper measurements for everything. no guesses". W7's gate is ZERO TBD, and every M-number must come from a COUNTER OVER STORED ROWS.
- THE CAMPAIGN: 14 PAIRED cases (8 real + 6 false-positive twins) fired through the WIRED path (W3's advisory/FireGate → W1's ledger) with the LIVE Jev judge. 14 fires → 14 rows written AND stored, end to end. THE PAIRING IS THE POINT: a corpus of reals alone cannot measure a gate (firing on everything scores R=1.000 and is worthless).
- ★ THE MEASURED NUMBERS:
    M1  best t=0.35 → F1=0.889 · P=0.800 · R=1.000   (per rule: theatrical 3C/2R · dumb 3C/2R · destructive 2C/2R)
    M6  latency p50=331ms p95=748ms (run 1); p50=328ms p95=1351ms (run 2 — ★ the p95 nearly DOUBLED; the p50 was stable to 3ms)
    M7  trimmed 0/14 · 29 slots (~2 per fire) — the 18KB cap never bit on this corpus
    M8  MPSE settled 0/14 = 0.0% — ★ THE CHEAPEST LAYER CONTRIBUTED NOTHING
    M9  degraded 0/14 = 0.0% — the failure path was never taken (so EN-056/EN-057 are test-proven, not runtime-proven)
    M12 act band 0/14 → STARVED=TRUE — REPRODUCED through the wired path
    M10 14/14 resolvable on the corpus labels (NOT the same number as the real downstream resolution rate — do not conflate)
    health ok=false with 3 findings — the kernel correctly REFUSES to calibrate at n=4/5 per rule
- ★ THE DECISIVE FINDING: the shipped seeds are ~2.5x too high. At the `dumb` seed act=0.75 only 2 of 8 REAL violations fire (R=0.250). The measured optimum is t≈0.35-0.40. This reproduces the prior session's "2x error that made the act band fire ZERO times" — on a different corpus through a different code path, which upgrades it from an observation to a PROPERTY of the shipped seeds.
- ★ AND THE M2 CONNECTION MADE EXPLICIT: the cost matrix does not change what is TRUE (the curve); it chooses which error the operator prefers to pay for. The shipped posture (block 4x) pins the bar at 0.80 and starves the band. The operator's M2 answer decides whether this gate ever fires.
- EVIDENCE: the campaign ran LIVE twice; campaign-report.json carries the sweep, the per-rule counts, the policies and the health; MEASUREMENT_PLAN 12 MEASURED / 0 TBD / 5 UNMEASURED (M2 the operator's · M5 an instrument gap NAMED — the judge does not surface usage · M11 needs a human sampling session · M10's real-downstream rate).

## [2026-09-21T14:35:00] — v2.1 P5 THE RED-TEAM: the full corpus pass — 2 CONFIRMED DEFECTS FOUND AND FIXED, ZERO REMAIN
- WHAT: tests/st-gi-v21-redteam.test.ts (24 tests, 57 expects) — the A..M evasion family over the SURFACE MAP of every exported decision function (15 of them).
- WHY: the pin's P5 exit gate — "a FULL corpus pass: ZERO confirmed defects". Corpus = positive + negative + edge + the FULL evasion family, never the one example in a comment.
- THE SCOPE LIMIT, NAMED IN THE FILE: the pin says probes run against the DEPLOYED runtime with source-import BANNED. That rule was written for v1.3, which IS bundled — v2.1 is NOT in the dist (sha 83eb7bba unchanged, the v2.x modules source-only). The deployed surface of v2.1 IS its module surface. A real narrowing, recorded rather than glossed.
- ★ DEFECT R-1 (CRITICAL): A NaN FROM THE MODEL BYPASSED THE FAIL POLARITY CONTRACT. A non-finite probability fails EVERY `>=` comparison, so it landed in the LOWEST band REGARDLESS of policy — meaning a CORRUPT answer produced a DISMISSAL on a fail-CLOSED surface (theatrical, destructive) whose contract says REFUSE. The gate treated "the model returned nonsense" identically to "the model said this is fine". FIXED: a missing OR non-finite answer routes by the fail polarity and is NAMED (`+bad-answer`).
- ★ DEFECT R-2 (LOW): the policy validator rejected `act < flag` while ACCEPTING `act == flag` — both empty the ESCALATE band, and ESCALATE is a DOCUMENTED band. FIXED: both rejected, distinctly named (GI_POLICY_INVERTED · GI_POLICY_ZERO_WIDTH_BAND).
- ★ THE FIX'S OWN HOLE, CLOSED: adding `+bad-answer` would have required EVERY consumer that pattern-matches suffixes to learn a new string — and any consumer that missed it would treat a corrupt answer as a REAL adjudication, a hole created BY the fix. So the vocabulary moved into ONE place: `degradationOf(policyName)` in fire-gate.ts, asked by both consumers.
- EVIDENCE: red-team suite 24 pass/0 fail/57 expect · battery 268/0/958/26 files (244/0/901/25 → +24 tests/+57 expects/+1 file, ZERO regressions) · tsc 191 == baseline 0 new.

## [2026-09-21T14:50:00] — THE AUDIT RAIL RESTORED (unblocking the AUDIT GATE)
- WHAT: ~/.omp/run/adapters/zen-free-adapter.mjs (~170 L, durable) started under the hub on :4098 with restart=on-failure; ocr wired to it; the scan dispatched.
- WHY: the AUDIT GATE was BLOCKED — the adapter had died with /tmp, so NOTHING this session could be independently reviewed and every ship-ready claim stayed withheld.
- THE MEASURED CORRECTIONS (all three folded into the managed skill): the working tool shape is `{type:"function", name, ...}` (the [OI] nested shape and the flat name-only shape both 400); `output_text` is NOT an API field and must be synthesized from `output[].content[].text`; the adapter must live outside /tmp and be hub-supervised.
- EVIDENCE: the probe returns status=completed and output_text='ADAPTER_OK'; the scan discovers the file, prices it (~49K in + 7K out) and dispatches with NO connection error.

## [2026-09-21T15:20:00] — ★ THE AUDIT FOUND 20 DEFECTS IN MY OWN CODE — 10 HIGH — ALL FIXED
- WHAT: the AUDIT GATE UNBLOCKED (the zen-free adapter rebuilt) and the ocr scan run over the three new modules with the LIVE muse model. 20 findings across 3 files. Two fix suites: tests/st-gi-v21-audit-fixes.test.ts (9 tests) + tests/st-gi-v21-audit2.test.ts (14 tests).
- ★ WHY THIS IS THE MOST IMPORTANT PARAGRAPH OF THE SESSION: my OWN red-team corpus (P5, 24 tests, A..M evasions) found 2 defects. The INDEPENDENT model found 20 — and NOT ONE was a bad-data case. They were CONTRACT cases: a comment promising more than the code does, a validated object handed out mutably, a NaN that DISABLES a filter instead of emptying it, a rule branch that can never execute. I wrote this code, so my mental model WAS the code's model. A reader who did not write it asked the questions I could not see.
- THE LEDGER (7): F0 drain watermark advanced BEFORE the commit → a failed write PERMANENTLY LOST fires (HIGH) · F1 withLedger converted a MADE decision into a rejection on a persist failure (HIGH) · F2 use-after-close unchecked, raw sqlite errors leaked (MED) · F3 append null-derefed and validated 2 of 14 fields (MED) · F4 truthOf blind-cast while countsByRule threw on the SAME value (MED) · F5 prepared statement never finalized before close (MED) · F6 the Proxy allocated a new judge per read, breaking `===` (LOW).
- THE ORACLE (6): O0 an UNPARSEABLE row.at made EVERY record pass the forward window (NaN comparisons are false) — a bound that fails OPEN (HIGH) · O1 a flag-less test was promoted to `testPassed` by its own `testsAfter > 0` (HIGH) · O2 the ">= 2 corroborating signals" branch CANNOT EXECUTE — a documented rule with no reachable path (HIGH) · O3 `Subject.tool` was declared and NEVER consulted (HIGH) · O4 a skewed clock aborted the batch AFTER earlier writes — a partial write with no rollback (HIGH) · O5 the dismissed-evidence disclosure only rode the zero-signal path, contradicting the function's own header (MED).
- THE POLICY STORE (7): P0 the schema version was never gated — `version: 99` loaded silently (HIGH) · P1 `get()` returned the LIVE object, so `store.get(id)!.act = 0` moved the enforcement bar, bypassing validation (HIGH) · P2 the temp path used only `process.pid`, so same-process writes collided (HIGH) · P3 `readPolicyFile` returned an UNVALIDATED cast (MED) · P4 `writePolicyFile` persisted inverted/out-of-range policies, deferring the failure to the next restart (MED) · P5 the shipped seeds were mutably exported (MED) · P6 the error cause was stringified instead of chained (LOW).
- ★ ONE OF THE FIXES EXPOSED A SEMANTIC ERROR OF MINE: I had the reload test bump the schema version to signal "the content changed". A THRESHOLD edit is not a SCHEMA change. The P0 gate correctly rejected it, which is how the conflation surfaced.
- EVIDENCE: audit-fixes 9/0/43 · audit2 14/0/33 · battery **291/0/1034/28** (268/0/958/26 → +23 tests, ZERO regressions) · tsc 191 == baseline 0 new · the 3 artifacts on disk (.audit/sg-ocr-*.json, 14165 + 10850 + 10672 bytes).
- NEXT: the RE-VERIFY scan (the same instrument) → the AUDIT GATE verdict.
