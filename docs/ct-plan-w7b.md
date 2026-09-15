# GI-OMP CONTAINER TEST PLAN — dual FRESH B (gi-omp-w7b)

## OBJECTIVE
Stand a SECOND headed OMP TUI (dual FRESH vs gi-omp-w7) and prove Graph Intelligence is session-scoped: graph-probe returns PROBE_TOOL_OK in this TUI; graph-query talks only to THIS session store; a node written here named beta must not appear in gi-omp-w7's store; GI_SCOPE_REFUSED on cross-session open. Hygiene bun test is not this gate. classifier may not weaken.

## TOOLS UNDER TEST
- graph-probe, graph-query, bug-hunt, graph-code-audit registered by trident-omp dist.js + graph-intelligence/index.js
- siblings ripwire, opengrok, grep, container-testing must still exist
- blast radius: /root/.omp/agent/extensions/*, config.yml extensions APPEND
- isolation: {scopeRoot}/.omp/graph-intelligence/sessions/{sid24}/store.sqlite

## TEST SCENARIOS
SCENARIO B1 IDENTITY: call graph-probe echo=w7b-s1. passToken: PROBE_TOOL_OK in a tool-result. failToken: tool absent.
SCENARIO B2 TOOLS: graph-query verb=who-calls target=beta. passToken: rows= in tool-result. failToken: silent grep fallback.
SCENARIO B3 ERRORS: graph-query verb=delete. passToken: QUERY_INVALID. failToken: crash or 200 ok.
SCENARIO B4 ISOLATION: after inserting beta in B, A store names exclude beta. passToken: two store paths containing /sessions/. failToken: shared typed_nodes.
SCENARIO B5 FIREWALL: FULL strip of export function in this session. passToken: GRAPH_GATE_SIGNATURE_BREAK. failToken: Edit applied on export strip.

## ADVERSARIAL
Caller B opens session A → GI_SCOPE_REFUSED. Relative scopeRoot → GI_PATH_DENIED. clear() without GI_OMP_ALLOW_CLEAR → GI_CLEAR_REFUSED. 429 on OpenCode Go must not be treated as a GI tool failure. Empty echo on graph-probe still PROBE_TOOL_OK.

## EVIDENCE
container-testing tui=omp memoryLimitMb=4096. Screenshots are the TUI evidence channel. Record dist sha of trident-omp dist.js and graph-intelligence/index.js. Results in Graph_Intelligence/.omp/ct-results.json. Dual FRESH means gi-omp-w7 AND gi-omp-w7b both alive with distinct prompts.

## PASS CRITERIA
Phase E 10/10 only when BOTH TUIs have PROBE_TOOL_OK in tool-result context AND isolation holds. overallVerdict PASS. bun test 20/20 is hygiene never GATE B. LIVE INNER is not /goal complete. classifier may not weaken.
