# GI-OMP PORT CONTAINER TEST PLAN — dual FRESH headed OMP TUI on omp-ct:master

## OBJECTIVE
Verify the GI-OMP port wave (profile.yaml + tool adapters + parse-grade verbs) on omp-ct:master in dual-FRESH headed OMP TUI sessions. Changed set this wave: profile.yaml (NEW project constitution), src/hunter/tools/bug-hunt.ts + query-registration.ts + report-writer-local.ts (NEW adapters), src/omp/extension.ts (graph-query impact/safe-delete/gate verbs + hunt wiring via createBugHuntTool), src/omp/typed-write.ts (corbell vocabulary calls/traces-to/imports + impact/safeDelete/gateAdvisory), extensions/graph-intelligence/index.js (rebuilt bundle sha16 490b6bd550d5531c, 126 modules, 454KB). Prior plan docs/ct-plan.md (S1-S7, A1-A2) is folded in by reference; this plan EXTENDS it with the port-wave scenarios. Every scenario below maps to a file in the changed set. Host bun battery (48 pass / 0 fail / 636 expects across 12 files) is hygiene only, never the gate.

## TOOLS UNDER TEST
- graph-probe (src/omp/extension.ts lines 41-63, scenario P1): PROBE_TOOL_OK + session identity.
- graph-query who-calls/blast/chain/unwired (src/omp/typed-write.ts + extension.ts, scenarios P2/P6/P10): corbell vocabulary rows.
- graph-query impact/safe-delete/gate NEW verbs (src/omp/extension.ts lines 133-150 + typed-write.ts impact/safeDelete/gateAdvisory, scenarios P8/P9/P11): upstream closure + file:line callers + STEER/FULL advisory.
- bug-hunt status+hunt (src/hunter/tools/bug-hunt.ts, scenarios P4/P5): unwired-count status + REAL micro-loop hunt with HUNT_DONE + report artifact.
- graph-code-audit stub (src/omp/extension.ts lines 167-176, scenario P12 negative): GI_AUDIT_NOT_WIRED loud, never a fake audit.
- graph-gate FULL/STEER/OFF (src/omp/gate-middleware.ts, scenarios P3/P13/P14): signature-break cancel + steer advise + off zero-misfire.
- populate corbell-first + named fallback (src/omp/populate.ts + populate-corbell.ts, scenario P7): substrate=corbell on warm checkout, CORBELL_NOT_WARM loud otherwise.
- query-registration structural verbs (src/hunter/tools/query-registration.ts, scenario P10): must-implement/rule/violations/consistency delegation.
- siblings ripwire, opengrok, grep, container-testing must remain listed (scenario P15 regression).
- Blast radius: bundle ~/.omp/agent/extensions/graph-intelligence/index.js (sha16 490b6bd550d5531c), trident-omp dist.js (sha16 e3db7a4391084418), both config.yml extensions arrays APPEND, profile.yaml constitution.

## TEST SCENARIOS
### SCENARIO P1 IDENTITY graph-probe
- Feature under test: graph-probe registration + session identity (src/omp/extension.ts).
- Prompt: Call the graph-probe tool with echo set to port-wave-t1 and report the exact tool-result text.
- Pass token: PROBE_TOOL_OK
- Fail token: tool absent
- Max wait: 90000
- Evidence capture: action=read offset, action=check pattern="PROBE_TOOL_OK", tool-result context required.

### SCENARIO P2 TOOLS who-calls corbell rows
- Feature under test: who-calls on corbell substrate (src/omp/typed-write.ts whoCalls + store-map kinds).
- Prompt: Call graph-query verb=who-calls target=openStore and report rows= plus the first three caller lines.
- Pass token: rows=
- Fail token: silent grep fallback
- Max wait: 120000
- Evidence capture: action=read offset, action=check pattern="rows=", action=files none.

### SCENARIO P3 FIREWALL FULL signature-break
- Feature under test: graph-gate FULL cancels export strip (src/omp/gate-middleware.ts).
- Prompt: Under GI_DIAL=FULL remove the word export from an exported function line in a scratch file, then report whether the edit landed and the exact gate token.
- Pass token: GRAPH_GATE_SIGNATURE_BREAK
- Fail token: Edit applied
- Max wait: 120000
- Evidence capture: action=read offset, action=check pattern="GRAPH_GATE_SIGNATURE_BREAK", file UNCHANGED check.

### SCENARIO P4 HUNT STATUS unwired count
- Feature under test: bug-hunt status reads session store (src/hunter/tools/bug-hunt.ts status path).
- Prompt: Call bug-hunt action=status and report state= plus findingsCount= plus the first two fix-order lines.
- Pass token: findingsCount=
- Fail token: GI_HUNT_NOT_WIRED
- Max wait: 120000
- Evidence capture: action=read offset, action=check pattern="findingsCount=", tool-result context required.

### SCENARIO P5 HUNT LIVE micro-loop report
- Feature under test: bug-hunt action=hunt runs the REAL micro-loop (recon/map/scan/trace/strike/report) under hunt-lock.
- Prompt: Call bug-hunt action=hunt on the session store and report state= plus reportPath plus findingsCount=.
- Pass token: HUNT_DONE
- Fail token: uncaught throw
- Max wait: 300000
- Evidence capture: action=read offset, action=check pattern="HUNT_DONE", action=files path read=true for the report artifact.

### SCENARIO P6 BLAST corbell depth
- Feature under test: blast-radius over corbell calls+traces-to (src/omp/typed-write.ts blastRadius).
- Prompt: Call graph-query verb=blast-radius target=openStore and report rows= plus root= plus depth=.
- Pass token: rows=
- Fail token: QUERY_INVALID
- Max wait: 120000
- Evidence capture: action=read offset, action=check pattern="rows=".

### SCENARIO P7 SUBSTRATE corbell-first
- Feature under test: populate corbell-first + substrate surfacing (src/omp/populate.ts + populate-corbell.ts).
- Prompt: Call graph-query verb=who-calls target=openStore and report the substrate= line plus rows=.
- Pass token: substrate=corbell
- Fail token: CORBELL_NOT_WARM
- Max wait: 120000
- Evidence capture: action=read offset, action=check pattern="substrate=corbell".

### SCENARIO P8 IMPACT upstream closure
- Feature under test: impact verb upstream transitive closure + depth ledger + hint (src/omp/typed-write.ts impact, wired extension.ts).
- Prompt: Call graph-query verb=impact target=openStore and report impact_reaches= plus the first ledger line plus hint=.
- Pass token: impact_reaches=
- Fail token: QUERY_INVALID
- Max wait: 120000
- Evidence capture: action=read offset, action=check pattern="impact_reaches=".

### SCENARIO P9 SAFE-DELETE named callers
- Feature under test: safe-delete callers NAMED file:line + reaches + uses + testReach in ONE result (src/omp/typed-write.ts safeDelete).
- Prompt: Call graph-query verb=safe-delete target=openStore and report callers= plus the first caller file:line plus testReach=.
- Pass token: safe_delete:
- Fail token: QUERY_INVALID
- Max wait: 120000
- Evidence capture: action=read offset, action=check pattern="safe_delete:".

### SCENARIO P10 STRUCTURAL delegation chain
- Feature under test: must-implement/rule/violations/consistency delegation to ported runQuery (src/hunter/tools/query-registration.ts).
- Prompt: Call graph-query verb=chain from=runQueryTool to=runQuery and report rows= plus the first step kind.
- Pass token: rows=
- Fail token: GI_QUERY_FAIL
- Max wait: 120000
- Evidence capture: action=read offset, action=check pattern="rows=".

### SCENARIO P11 GATE advisory callers
- Feature under test: gate advisory STEER/FULL lists callers that no longer fit (src/omp/typed-write.ts gateAdvisory).
- Prompt: Call graph-query verb=gate target=openStore and report the advisory line with at least one caller file:line.
- Pass token: GATE STEER
- Fail token: QUERY_INVALID
- Max wait: 120000
- Evidence capture: action=read offset, action=check pattern="GATE STEER".

### SCENARIO P12 AUDIT stub loud
- Feature under test: graph-code-audit honest stub (src/omp/extension.ts, audit engine out of scope).
- Prompt: Call graph-code-audit with any targetPath and report the exact error token.
- Pass token: GI_AUDIT_NOT_WIRED
- Fail token: findings fabricated
- Max wait: 90000
- Evidence capture: action=read offset, action=check pattern="GI_AUDIT_NOT_WIRED".

### SCENARIO P13 STEER advise
- Feature under test: STEER dial advises without cancel (src/omp/gate-middleware.ts).
- Prompt: Under GI_DIAL=STEER repeat the P3 export-strip attempt and report the advise token and whether the edit landed.
- Pass token: GATE STEER
- Fail token: cancel true
- Max wait: 120000
- Evidence capture: action=read offset, action=check pattern="GATE STEER".

### SCENARIO P14 OFF zero-misfire
- Feature under test: OFF dial lands with zero gate tokens (negative half).
- Prompt: Under GI_DIAL=OFF repeat the export-strip attempt and report that the edit landed with no gate token.
- Pass token: Edit applied
- Fail token: GRAPH_GATE_SIGNATURE_BREAK
- Max wait: 120000
- Evidence capture: action=read offset, action=check pattern="Edit applied".

### SCENARIO P15 SIBLINGS regression
- Feature under test: ripwire/opengrok/grep/container-testing still listed (blast radius, no replacement).
- Prompt: List the registered tool names containing ripwire and report whether ripwire is still present.
- Pass token: ripwire
- Fail token: tool missing
- Max wait: 90000
- Evidence capture: action=read offset, action=check pattern="ripwire".

### SCENARIO P16 DUAL FRESH isolation
- Feature under test: dual-FRESH sessions write disjoint typed graphs (session scoping, second container).
- Prompt: In the second fresh session call graph-probe echo=port-fresh-b and report PROBE_TOOL_OK plus the session id differing from the first session.
- Pass token: PROBE_TOOL_OK
- Fail token: shared typed_nodes
- Max wait: 120000
- Evidence capture: action=read offset, action=check pattern="PROBE_TOOL_OK", two store paths under /sessions/.

## ADVERSARIAL
Minimum adversarial coverage for the port wave: AD1 empty target on who-calls (expect rows=0 with no crash, failToken GI_QUERY_FAIL crash); AD2 missing profile hunt (PROFILE_INVALID INCONCLUSIVE named, failToken silent pass); AD3 cross-session open (GI_SCOPE_REFUSED naming owner, failToken handle returned); AD4 bad verb verb=delete (QUERY_INVALID, failToken 200 ok); AD5 129MiB graph.json guard (GRAPHIFY_GRAPH_TOO_LARGE, process alive, failToken OOM). Each adversarial runs as its own live interaction with the same 7-field discipline: prompt, passToken, failToken, maxWaitMs 90000, evidence capture via read+check.

## EVIDENCE
Per scenario: stream byte-range excerpt with the passToken highlighted in tool-result context (not agent prose), plus artifact reads where declared (P5 report artifact via action=files path read=true). Deployment integrity: sha256sum of the deployed bundle file in-container (exec sha256sum of the FILE, never an aggregate) equals host sha16 490b6bd550d5531c prefix. Screenshots via shot action for the status-bar model line. Host bun battery 48/12 is hygiene, recorded but never the gate. Results artifact: .omp/ct-results-port.json with per-scenario passTokenMatch/failTokenAbsent/toolResultContext/verdict + circuitBreaker 10 + overallVerdict.

## PASS CRITERIA
Phase E 10/10 (shaMatch, authProbePassed, allScenariosExecuted, tokensAsserted, noCircularPasses, noTimeouts, blastRadiusCovered, adversarialBehaved, containerAlive, artifactWritten). All 16 scenarios pass with passToken present in tool-result context AND failToken absent. Adversarial AD1-AD5 behave as required. overallVerdict PASS in .omp/ct-results-port.json. Dual FRESH age-bound (both sessions alive at verdict). Negative halves (P12/P14) zero-misfire. classifier may not weaken: this port run is the WAVE 4 runtime; bun test 48/12 is not /goal complete.
