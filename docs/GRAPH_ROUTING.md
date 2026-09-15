# GI-OMP GRAPH ROUTING — twin-verb contract (W8)

Status: ACTIVE 2026-09-15 (ProofLock, docs-only). Scope: Graph_Intelligence.
Pinned: extension.ts:38 registerGiOmpTools, :82 13 verbs; typed-write.ts;
ripwire-bridge.ts; gate-middleware.ts. Ref tree: fork-v143/live-tree
2086n/9386e corbell. Dist: index.js 471921 B sha16 eddd8d740c75b780.

## 1. LAW

Every graph-query twin verb is store-primary: reads THIS session store
(sessions/<sid>/store.sqlite, superseded_run IS NULL everywhere) and appends
exactly ONE live-tree line `ripwire: <summary>` from ripwire 0.6.0. Store row
is the verdict; ripwire leg is the witness. Absent/failed legs are NAMED
(absent/query-failed/claim-refused), never silent. 9 legs ride 7 consults
(blast shares impact; would-break shares gate). 4 delegation verbs have NO
twin: must-implement/rule/violations/consistency read the hunt substrate via
runQueryTool READ-ONLY over the same store.

## 2. TWIN TABLE

| GI verb (ext) | store-primary (typed-write) | ripwire twin (bridge) | argv |
|---|---|---|---|
| who-calls :111 | whoCalls :239 | ripwireCallers :122 | --callers=SYM --json |
| blast-radius :120 | blastRadius :271 | ripwireImpact :143 | --impact=SYM --json |
| would-break :125 | wouldBreak :318 | ripwireEditCheck :158 | --edit-check=SYM XML |
| unwired :131 | unwiredNodes :411 | ripwireDeadCode :211 | --dead-code XML |
| chain :137 | chainCalls :351 | ripwirePath :195 | --path=FROM,TO XML |
| impact :145 | impact :447 | ripwireImpact :143 | --impact=SYM --json |
| safe-delete :152 | safeDelete :497 | ripwireSafeDelete :174 | --safe-delete=SYM XML |
| gate :159 | gateAdvisory :538 | ripwireEditCheck :158 | --edit-check=SYM XML |
| verify :168 | NONE (ripwire-primary) | ripwireVerify :228 | --verify=CLAIM XML |
| must-implement/rule/violations/consistency :179 | runQueryTool query-registration.ts:57 | NONE | n/a |

Shapes: who-calls `substrate=.. rows=N <caller> (f:l) ripwire: ..` (:118);
blast `rows=N root=S depth=D ripwire: ..` (:123); would-break
`callers=N argsUnknown=true ripwire: ..` (:129); unwired `rows=N .. ripwire:
..` (:135); chain `rows=N <from> -> <to> [kind] ripwire: ..` (:143); impact
`impact_reaches=N <sym>@depthD (f:l) via P hint=.. ripwire: ..` (:150);
safe-delete `safe_delete: S callers=N reaches=M uses=K testReach=T ripwire:
..` (:157); gate `<advisory>` = `[GATE STEER] ..` or
`GRAPH_GATE_SIGNATURE_BREAK ..` (:166); verify `verify: <summary>`, empty
claim VERIFY_INVALID (:173), unknown verb QUERY_INVALID (:83).

## 3. UNITS

who-calls row {caller,file,line,kind,predicate} per inbound typed edge
(calls+traces-to+imports, dst.label=:sym); flow traces-to callers file=""
line=0 honest. blast node {file,depth} FILE-level CTE walk, cap 8,
src.file IS NOT NULL; flow sources terminate honestly. would-break
{callers,breaking[]={importer,reason},argsUnknown:true} delegates whoCalls.
unwired {name,file,line,UNWIRED,kind} kinds
method/flow/service/class/function/file/module + capitals, zero inbound,
n.file IS NOT NULL. chain {from,to,kind,file,line} BFS labels MAX_DEPTH 64,
unreachable=[] . impact {symbol,depth,file,line,via} upstream BFS,
hint=next=chain from=S. safe-delete {callers NAMED f:l, reaches=impact
count, uses downstream, testReach test|spec|mock|fixture}. gate
{dial,symbols,callers[]={symbol,caller,file,line,via},advisory} FULL
GRAPH_GATE_SIGNATURE_BREAK no-longer-fit / STEER [GATE STEER] review; note
(not-consulted|+ripwire|;ripwire). verify: CLOSED claim language
calls/uses/unused/contains/defines/reaches; refused claim
{present:true,ok:false,summary:"claim refused (..)"}.

Ripwire witness: callers {count,callers[] p split LAST colon} `N callers
(e.g. ..)`; impact {reaches,radius_tested/untested}
`impact_reaches=N radius_untested=..`; edit-check {status,callers,
incompatible,rows <c>} first-tag parse; safe-delete
{callers,impact_reaches,uses,tested_self,risk}; path {reachable,hops,
steps <s>}; dead-code {count,confidence}; verify
{verdict,shape,hops,count,steps}. Resolve: RIPWIRE_BIN ->
~/.local/bin/ripwire -> PATH (:31-43). Timeout 8s, 32MB, fail-soft
(:53-70, :105-111).

## 4. FLOORS

counts_floor=1: every twin leg asserts count>=1 on the reference tree
(openStore symbol) — st-ripwire-bridge.ts pins callers>=1, reaches>=1,
edit-check callers>=1, safe-delete callers>=1 + impact_reaches>=1, path
reachable=1 hops>=1, dead-code numeric count, verify confirmed. Finding
floors are >= (never exact): st-verbs-parse.ts who-calls rows>=25,
impact reaches>=1 ledger==reaches, safeDelete callers>=1 uses>=1,
gate callers>=1, chain>=1, unwired>=100. EN-38: 128MB GRAPHIFY budget,
8MB yield floor (typed-write.ts:20-40).

## 5. SCOPE PREFIXES

Store path MUST match /sessions/{sid8-24}/store.sqlite else
GI_SHARED_PROJECT_STORE; global home graph GI_GLOBAL_HOME_GRAPH
(gi-session-path.ts:24-55). ScopeRoot MUST be absolute else GI_PATH_DENIED.
Cross-session open GI_SCOPE_REFUSED (store-open.ts:36-50). Evidence rows
carry (scopeRoot, substrate, dist-sha) triple — DEBUG EN (fork-scope rows
`tools/graph-query.ts:52` vs study-scope `gi-study-src/src/..` are different
units, never compared). Substrate line always first: substrate=corbell |
substrate=indexer-fallback reason=CORBELL_NOT_WARM:* (extension.ts:100-110).

## 6. RIPWIRE COUNTING LAW

counts_floor=1 on reference tree; store-primary and ripwire leg NEVER share
a counter variable — each asserts its own floor from its own read (store
SQL vs binary stdout). Cross-check is attribution (ripwire e.g. names
tools/graph-query.ts:52), not equality: divergent counts across scopes are
ATTRIBUTION rows (scope,substrate,SHA), never failures. Absent binary:
every leg present:false ok:false `absent (..)` (DEAD_ENV hermetic battery).

## 7. K20.3 SAME-CHECKOUT DOUBLE-HUNT ROW (2026-09-15, host-measured)

Checkout: /tmp/gi-k203-bNVWbu (warm corbell-data/.corbell/workspace.db,
graph.rebuild=false, profile gi-hunter-live). HUNT1 done
runId=gi-hunter-live-hunt-20260915-1 findings=2
report=MASTER_CONTEXT/bug_hunter_report_v1.md 3267B. HUNT2 done
runId=gi-hunter-live-hunt-20260915-2 findings=2
report=MASTER_CONTEXT/bug_hunter_report_v2.md 3336B. runId-identical
ASSERT: FAIL (seq counter +1 by recon design recon.ts:108-134,
micro-loop-machine.ts:284-313) -> verdict INCONCLUSIVE named
(K203_RUNID_SEQUENCE, never silent). Findings-determinism: PASS —
ruleId|file|line sets byte-identical (2+2 rows), batteryVersion identical
(gi-hunter-live-rules-battery-v1 fingerprint 143886b9a8c8), HUNT_DONE x2
events, both reports carry own runId. Method: bun .tmp-k203.ts (spawnBug
HunterLoop x2, removed after). Full row + payloads in report v2 S8.
