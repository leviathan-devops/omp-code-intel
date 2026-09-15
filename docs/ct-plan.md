# GI-OMP CONTAINER TEST PLAN — dual FRESH headed OMP TUI

## OBJECTIVE
Verify GI-OMP first-class session-scoped Graph Intelligence in a headed OMP TUI: tools register and are callable; graph-probe returns PROBE_TOOL_OK; two sessions (dual FRESH) write disjoint typed graphs; FULL signature-break cancels; STEER advises; OFF does not misfire; cross-session open is GI_SCOPE_REFUSED; ripwire and grep still exist (not replaced). Hygiene bun test is not this gate.

## TOOLS UNDER TEST
- graph-probe, graph-query, bug-hunt, graph-code-audit (GI-OMP extension + trident-omp dist)
- graph-gate middleware tokens GRAPH_GATE_SIGNATURE_BREAK, [GATE STEER], GI_NO_STORE
- siblings: ripwire, opengrok, grep, container-testing — must remain listed
- blast radius: ~/.omp/agent/extensions/graph-intelligence/index.js, trident-omp dist.js, both config.yml extensions arrays (APPEND)

## TEST SCENARIOS
SCENARIO S1 IDENTITY: prompt the TUI to call graph-probe. passToken: PROBE_TOOL_OK in a tool-result. failToken: tool absent.
SCENARIO S2 TOOLS: graph-query verb=who-calls. passToken: rows= in tool-result. failToken: silent grep fallback.
SCENARIO S3 FIREWALL FULL: strip `export function tridentLog` under GI_DIAL=FULL. passToken: GRAPH_GATE_SIGNATURE_BREAK and file UNCHANGED. failToken: Edit applied.
SCENARIO S4 STEER: same strip under STEER. passToken: [GATE STEER]. failToken: cancel true.
SCENARIO S5 OFF negative: same strip under OFF. passToken: Edit applied with zero gate tokens. failToken: GRAPH_GATE_SIGNATURE_BREAK.
SCENARIO S6 DUAL FRESH: second container/session inserts node beta; first store names exclude beta. passToken: two store paths under /sessions/. failToken: shared typed_nodes.
SCENARIO S7 ERRORS: graph-query verb=delete. passToken: QUERY_INVALID. failToken: crash.
ADVERSARIAL A1: caller B opens session A. passToken: GI_SCOPE_REFUSED. failToken: handle returned.
ADVERSARIAL A2: clear registry without GI_OMP_ALLOW_CLEAR. passToken: GI_CLEAR_REFUSED. failToken: wiped rows.

## ADVERSARIAL
Empty sessionId, relative scopeRoot (GI_PATH_DENIED), 129MiB graph.json (GRAPHIFY_GRAPH_TOO_LARGE, process alive), concurrent 3 UPSERTs (3 registry rows, not last-writer JSON clobber), config.yml must still list trident-omp AND code-retrieval after GI append.

## EVIDENCE
Container via container-testing tui=omp memoryLimitMb=4096. Dist SHA of ~/.omp/agent/extensions/graph-intelligence/index.js and trident-omp dist.js recorded in .omp/ct-results.json. Screenshots are the TUI evidence channel. Host bun test is hygiene only.

## PASS CRITERIA
Phase E 10/10. overallVerdict PASS. Dual FRESH age-bound. Every passToken in a tool-result context. Negative half zero-misfire. classifier may not weaken: this container run is WAVE 4 runtime; bun test 20/20 is not /goal complete.
