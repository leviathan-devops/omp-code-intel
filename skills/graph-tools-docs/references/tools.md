# Tools reference — the four GI tools (from src/omp/extension.ts + bug-hunt.ts)

## graph-probe (extension.ts:147-169)
- Params: `{i?, echo?, action?}`. Default: returns `{"token":"PROBE_TOOL_OK","sessionID","echo"}`.
- `action=wipe`: env-gated registry clear → `GI_CLEARED`, else `GI_CLEAR_REFUSED`.
- Pass token: `PROBE_TOOL_OK`. Use: auth probe FIRST in every container run.

## graph-query (extension.ts:170-256, verbs :45-141)
- Params: `{i?, verb*, target?, symbol?, from?, to?, proposed?, sessionId?, substrate?, targetPath?}`.
- Unknown verb → `QUERY_INVALID: <verb>`. Relative targetPath → `GI_PATH_DENIED`.
- `substrate=graphify` + absolute targetPath → freshness check → populate graphify leg → SAME verbs with `substrate=graphify ...` note. MISS → `GRAPHIFY_NOT_WARM:*` / `GRAPH_EMPTY` + rebuild remedy, never a corbell substitute.
- Default path: corbell reconcile (warm checkout → repopulate; else surface stored substrate).
- Every twin verb appends ONE `ripwire:` line (store-primary, live-tree leg named; absent/failed legs NAMED).

## bug-hunt (hunter/tools/bug-hunt.ts:143-206)
- Params: `{i?, action: hunt|status, targetPath?, profilePath?}`.
- `action=status`: session-store census → `state=done findingsCount=N fixOrderCount=M` (unwired count + fix order, no loop).
- `action=hunt`: `spawnBugHunterLoop({targetPath, profilePath})` — REAL micro-loop under hunt-lock → `HUNT_DONE runId= findingsCount= reportPath=` + report artifact; fail-closed `HUNT_INCONCLUSIVE` as RESULT (named error, never a throw).

## aether-code-audit (extension.ts:327-332; alias graph-code-audit :333-338, SAME execute)
- Params: `{i?, targetPath?, template?}` (default template `R28-sro-graph`; 14 layerIds R18–R31).
- Happy: `AUDIT_DONE layer= findings= reportPath=` + `findings/report.md` on disk.
- Degraded (ONLY after a real attempt): `GI_AUDIT_NOT_WIRED: HUNTER_TEMPLATE_INVALID | <settlement.error> | <caught>` with `cause` field. A stub-shaped error is legal ONLY named after a real attempt.
- Engine: fork `hydra/aether-auditor.ts runLayerHunter` contract; deterministic sweep, no LLM transport (D2 law).
