# GI-OMP GRAPHIFY CONTAINER TEST PLAN — dual-FRESH headed OMP TUI on omp-ct:master (W9)

Status: PLANNED 2026-09-15 (ProofLock, docs-only lock). Fires ONLY after
W4+W7 gates land (graphify adapter + populate leg + audit bind green) AND
the container-testing tool is available. This plan is the extraction contract
for `.omp/ct-results-graphify.json`. No TUI claim without this plan.

Scope root: `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence`
Spec parent: `GI_OMP_FULL_PORT_DPL1_SPEC.md` S10 + S7 (deep-container suite).
Routing contract: `docs/GRAPH_ROUTING.md` (twin table + counting law).
Prior legal stop (FROZEN): `.omp/ct-results-port.json` overallVerdict PASS
2026-09-14T22:44Z on dists GI 89ce7270 / trident 8756baac (superseded by
eddd8d74 471921 B — re-verify sha in-container before any W9 run).

## OBJECTIVE

Prove the graphify substrate leg + the audit bind live in a headed OMP TUI
on omp-ct:master, with zero regressions to the corbell/hunt/verb surface.
One of the two FRESH sessions is graphify-populated (substrate=graphify);
the other is corbell-populated (regression twin). Changed set this wave
(gated): src/hunter/graph/graphify-adapter.ts (NEW), src/omp/
populate-graphify.ts (NEW), scripts/graphify-build.ts (NEW),
src/hunter/harness/map.ts graphify case, src/hydra/* audit face,
src/omp/extension.ts audit-bind hunk, docs/GRAPH_ROUTING.md (this lock).

## TOOLS UNDER TEST

- populate graphify leg (substrate=graphify + freshness vs graph.json mtime
  + GRAPHIFY_NOT_WARM named + rebuild command).
- graph-query who-calls / impact / safe-delete / gate / chain / blast /
  would-break / unwired / verify on the graphify-populated session
  (store-primary rows + ONE ripwire: line each — twin table).
- bug-hunt hunt on the graphify store (HUNT_DONE + reportPath artifact on
  disk, bytes>0, runId inside; LINELESS_NODE count = 0).
- aether-code-audit bind (findings + reportPath; NOT_WIRED only on real
  attempt failure — stub resurrected = FAIL).
- Siblings ripwire/opengrok/grep/container-testing still listed (regression).

## RIG (12-step law instance)

1. plan-first (THIS file, 2000+ chars). 2. preflight self-check (bun battery
   0-fail, dist sha16 eddd8d74 both copies, ripwire 0.6.0, graphifyy + corbell
   CLIs answer --help). 3. setup TWO fresh containers image=omp-ct:master,
   NEW bundle file path, model=Laguna S 2.1. 4. auth probe FIRST
   (graph-probe PROBE_TOOL_OK). 5. model verify via status bar. 6. scenarios
   below. 7. adversarial discipline (first error = bug). 8. bugs fixed +
   retested. 9. Phase E 10 checks. 10. results artifact
   .omp/ct-results-graphify.json. 11. zero-broken-windows (battery re-run).
   12. declaration (sha + excerpts + per-scenario verdicts).

## TEST SCENARIOS (each: prompt -> passToken + failToken; agent-typeable = CIRCULAR FAIL)

### SCENARIO G1 GRAPHIFY SUBSTRATE POPULATE
- Feature: populate-graphify.ts extract + ledger (substrate=graphify).
- Prompt: Run the explicit graphify build for the fixture root, then call
  graph-query verb=who-calls target=openStore and report the substrate= line
  plus rows= plus node/edge counts from gi_meta.
- Pass token: substrate=graphify
- Fail token: CORBELL_NOT_WARM confusion (wrong-leg signal) or silent zero
- Max wait: 300000 (extract is explicit, never in the query path)
- Evidence: action=read offset, action=check pattern="substrate=graphify",
  ledger DB rows SELECT key,value FROM gi_meta, graph.json bytes>0.

### SCENARIO G2 WHO-CALLS ON GRAPHIFY STORE
- Feature: whoCalls on graphify vocabulary (calls spine + file:line callers).
- Prompt: Call graph-query verb=who-calls target=<graphify symbol> and report
  rows= plus the first three caller file:line lines plus the ripwire: line.
- Pass token: rows= (N>=1) AND at least one caller matches file:line shape
- Fail token: rows=0 with populated store, or missing ripwire: line
- Max wait: 120000
- Evidence: action=read offset, action=check pattern="rows=",
  action=check pattern="ripwire: ".

### SCENARIO G3 HUNT ON GRAPHIFY STORE
- Feature: full 6-phase hunt on graphify-populated store.
- Prompt: Call bug-hunt action=hunt on the graphify session and report
  state= plus reportPath plus findingsCount=.
- Pass token: HUNT_DONE
- Fail token: LINELESS_NODE (seam breach) or uncaught throw
- Max wait: 300000
- Evidence: action=read offset, action=check pattern="HUNT_DONE",
  action=files path read=true (artifact bytes>0, runId inside), HUNT_DONE
  event row in shared.db.

### SCENARIO G4 AUDIT BIND
- Feature: aether-code-audit routes targetPath -> auditor run -> findings.
- Prompt: Call aether-code-audit with the fixture targetPath and report the
  findings count plus reportPath=.
- Pass token: reportPath=
- Fail token: GI_AUDIT_NOT_WIRED (stub resurrected = FAIL)
- Max wait: 300000
- Evidence: action=read offset, action=check pattern="reportPath=",
  artifact read bytes>0.

### SCENARIO G5 TWIN-VERB REGRESSION (ALL 9)
- Feature: all 9 twin legs unchanged on BOTH sessions (graphify + corbell).
- Prompt: Call each graph-query twin verb (who-calls, blast-radius,
  would-break, unwired, chain, impact, safe-delete, gate, verify) on the
  corbell session and report each ripwire: summary line.
- Pass token: ripwire: (present on all 9 results)
- Fail token: any missing leg or QUERY_INVALID on a known verb
- Max wait: 120000 per verb
- Evidence: action=read offset per verb, action=check pattern="ripwire: ".

### SCENARIO G6 DUAL-FRESH ISOLATION (ONE GRAPHIFY SESSION)
- Feature: dual-FRESH sessions write disjoint typed graphs; exactly one is
  graphify-populated.
- Prompt: In session A call graph-probe echo=graphify-fresh-a; in session B
  echo=graphify-fresh-b; then who-calls on each and report both substrate=
  lines plus session ids.
- Pass token: PROBE_TOOL_OK (both) AND substrate=graphify on exactly one side
- Fail token: shared typed_nodes or identical session id
- Max wait: 120000
- Evidence: action=read offset x2, action=check pattern="PROBE_TOOL_OK",
  two store paths under /sessions/, gi_meta substrate rows both sides.

## ADVERSARIAL (each its own live interaction, same 7-field discipline)

- AD-G1 empty graph.json -> pass GRAPH_EMPTY named, fail OOM/hang/crash.
- AD-G2 graphify binary absent -> pass named refusal + indexer-fallback
  token+reason+remedy, fail silent substitute.
- AD-G3 oversized graph.json (129MiB precedent) -> pass
  GRAPHIFY_GRAPH_TOO_LARGE process alive, fail OOM.
- AD-G4 malformed claim to verify -> pass claim-refused named, fail throw
  past the boundary.
- AD-G5 empty target on who-calls -> pass rows=0 no crash, fail
  GI_QUERY_FAIL crash.

## EVIDENCE

Per scenario: stream byte-range excerpt with the passToken in tool-result
context (never agent prose) + artifact reads where declared (G3/G4 report
via action=files path read=true). Deployment integrity: sha256sum of the
deployed bundle FILE in-container equals host sha16 eddd8d740c75b780
prefix (exec on the FILE, never an aggregate). Screenshots via shot action
for the status-bar model line. Host bun battery is hygiene, never the gate.
Results artifact: .omp/ct-results-graphify.json with per-scenario
passTokenMatch/failTokenAbsent/toolResultContext/verdict + circuitBreaker
10 + overallVerdict.

## PASS CRITERIA

Phase E 10/10 (shaMatch, authProbePassed, allScenariosExecuted,
tokensAsserted, noCircularPasses, noTimeouts, blastRadiusCovered,
adversarialBehaved, containerAlive, artifactWritten). All of G1-G6 pass
with passToken present in tool-result context AND failToken absent.
AD-G1..AD-G5 behave as required. overallVerdict PASS in
.omp/ct-results-graphify.json. Dual FRESH age-bound (both sessions alive
at verdict). Negative halves (G4-degraded, AD-*) zero-misfire. No
structural PASS, no source-inspection-as-proof, no asserted-the-behavior.
