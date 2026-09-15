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
