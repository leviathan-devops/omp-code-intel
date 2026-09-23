# THE DEPLOYED-RUNTIME DECISION PROBE — 2026-09-23T04:11:30Z

**The bundle probed:** `~/.omp/agent/extensions/graph-intelligence/index.js`
**Its sha256:** `3bffc09947b440ec94fe7abc35927f0d210afad4f4660a0d6d017830f0a82306`
**The method:** import the DEPLOYED bundle, mount it on a fake `pi` (the omp
extension surface), register the tools, invoke `gi-decide` — **source-import BANNED**.

```
bundle exports: GI_TOOL_NAMES,GI_TOOL_NAMES_ALIASES,graphProbeWipeAudited,ledgerDirConfined,parseTargetRoots,registerGiOmpTools,settlementLedgerConfined,substrateNeedsPopulate,writeWipeAudit
tools mounted: graph-probe,graph-query,bug-hunt,aether-code-audit,graph-code-audit,gi-consumption,gi-decide
───── gi-decide VERDICT (926ms) ─────
verdict=STEER	class=dumb	code=GI_BLIND_ACT
subject=populateSessionStore
scopeRoot=/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
layersWired=6/8
influenced=L5_CORBELL,L6_GRAPHIFY,L3_UA,L1_SEMANTICA
reason=no graph query on 'populateSessionStore' before the act — the edit is blind
  stage 0 PREFLIGHT	UP	6 layer(s) up
  stage 1 CLASSIFY	OK	3 classes asked (dumb|theatrical|destructive)
  stage 2 BIND+INDEX	OK	claims=0 bound=0
  stage 3 DETECT	SIGNAL	dumb:VIOLATION theatrical:PASS destructive:PASS
  stage 4 KERNEL	VIOLATION	dumb.grounding-precondition (dumb)
  stage 5 VERDICT	STEER	no graph query on 'populateSessionStore' before the act — the edit is blind
  stage 6 RECORD	SKIPPED	no sink supplied
graph: store=/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/.omp/graph-intelligence/corbell-checkout/store.sqlite	settles=true	fires=0	policy=3@the seed policy set (no policy.json on disk — the named fallback)	ledger=/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/.omp/graph-intelligence/fire-decisions.db
  M-GRAPH-1	settles=true	action=IGNORE	the consumed symbol "populateSessionStore" has producers
───── details ─────
{"ok":false,"verdict":"STEER","class":"dumb","code":"GI_BLIND_ACT","layersWired":6,"influenced":["L5_CORBELL","L6_GRAPHIFY","L3_UA","L1_SEMANTICA"],"graphSettles":true,"graphFires":0,"policyCount":3}
```
