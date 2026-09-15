# CHECKPOINT MANIFEST — gi-warmwins-seal-ee122880

Token: gi-warmwins-seal-ee122880 (hyphens only; state SEALED on warm-wins fix).
Date: 2026-09-15. Follows gi-qwen-fix-wave-34ba3ffe (fixes in source, dists stale at seal time).
Branch: jarvis/gi-main. Skill: saving-checkpoints (full-protocol save of the warm-wins seal).

## Dist SHAs (exec-verified, zero drift)
- GI extensions/graph-intelligence/index.js: ee122880b48a393f9a54429f33d1043f808817c28d2f39ddbfc62dacebaa12ce
- Checkpoint dist/index.js: ee122880b48a393f9a54429f33d1043f808817c28d2f39ddbfc62dacebaa12ce — MATCH
- Trident dist/index.js: 280fd30353dd825d24d43cdfa3b4a254df94741981e3bcec3176be2ed78846bd
- Checkpoint dist/trident-index.js: 280fd30353dd825d24d43cdfa3b4a254df94741981e3bcec3176be2ed78846bd — MATCH
- Host-deploy + gi-omp-port + gi-omp-port2: identical prefixes ee122880 / 280fd303 (docker exec verified pre-legs).

## Battery + state
- Script: 119 pass / 0 fail / 1004 expect() across 19 files (16 tests/*.ts + 3 src/hydra/__tests__; vendor symlink for the run, removed after — F-10 law). A stale wrong-file-name background run (bg_3: 78 pass + 7 graphify/scope fails on binary-missing fixtures) settled mid-turn and is SUPERSEDED — never a gate input.
- Container: BOTH dists rebuilt AFTER the warm-wins fix (GI tail line 11321; trident 23.86 MB line 403428, NODE_PATH build for xstate), deployed to BOTH rigs, relaunched: auth probe + G1 who-calls + G4 audit + G3 hunt + G5 impact/safe-delete on gi-omp-port; probe + empty-tree who-calls on gi-omp-port2.
- Tool-result tokens (verbatim, THIS seal): substrate=graphify graph=/tmp/fx383g/graphify-out/graph.json nodes=5 edges=5 + Two callers of alpha() (beta.ts lines 1-2), GRAPHIFY_NOT_WARM ABSENT; AUDIT_DONE layer=R28-sro-graph findings=3 (dir R28-sro-graph-1789481197584); HUNT_DONE runId=gi-study-src-hunt-20260915-11 findingsCount=296 (bug_hunter_report_v12.md); impact_reaches=2 + hint=next=chain from=alpha(); safe_delete: callers=2 reaches=2 uses=0 testReach=0; port2 PROBE_TOOL_OK + empty-tree GRAPHIFY_NOT_WARM:absent with named rebuild remedy.
- Fixes sealed: V-18 (freshness inversion → WARM-WINS tail) + V-19 (both-dists law II: NODE_PATH trident rebuild); source diff 6 files + 2 dists + 5 ship docs + 1 canon doc.

## Complete contents (this checkpoint)
- src/: 80 .ts across 20 dirs (hunter/hydra/omp/scoping) — count matches project (80). The FULL tree.
- tests/: 19 files (16 ST + 3 hydra batteries) — the FULL battery, runnable via the 19-file enumeration.
- dist/: index.js GI 564K (ee122880) + trident-index.js 23M (280fd303) — SHAs MATCH project.
- context_management/: RUNNING_BUILD_LOG.md 183 lines (the project's entire canon — single-doc project, see gaps).
- Ship docs: BUILD_REPORT.md 195 + DEBUG_LOG.md 171 + FAILURE_LOG.md 147 + SPEC_VIOLATION_LOG.md 66 + TESTING_LOG.md 249 (12 result zones, 2 plan zones) + SHIP_DOCS_MANIFEST.md (Baseline ee122880).
- Authority: GI_OMP_FULL_PORT_DPL1_SPEC.md 302 lines + MIGRATION_MANIFEST.md 761 lines.
- Artifacts: ct-results-graphify.json + ct-results-port.json (container verdicts).
- Legacy: st-go-fallback.ts + st-graphify-port.ts at top level (kept from prior save; canonical copies live in tests/).

## Honest gaps
- Canon floor: the project maintains ONE canon doc (RUNNING_BUILD_LOG.md, 183 lines); the skill's >=11-doc canon floor does NOT apply — recorded as structural absence, not a save defect. The 5 read-first canon docs do not exist in this project.
- Doc-density floors: BUILD 195/500, DEBUG 171/500, FAILURE 147/100, SPEC 66/100, TESTING 249/100 per the skill's DOC-DENSITY LAW. Ship docs here are milestone-scoped by project convention (append-only per wave), not 500-line engineering tomes — recorded as convention, not hidden.
- Qwen verdict still FAIL-by-count (16 high, re-run 8a24ae08) until re-run-III; V-10 LOW (loader-test) + V-11 MEDIUM (K20.3-text) still OPEN.
- No key material (AP-4). MODE B mutable working snapshot — no chattr lock (operator default for a checkpoint receiving follow-up fixes: qwen re-run III pending).
- Recovery: root ship docs → SHIP_DOCS_MANIFEST → BUILD warm-wins entry → DEBUG EN-021 → FAILURE F-18 → SPEC V-18/V-19 → TESTING seal entry → this manifest → dist/ SHAs.

## Structure verification (this save)
- find $CP -maxdepth 2 -type d: checkpoint/context_management/dist/src + src/{hunter,hydra,omp,scoping} + tests + artifacts.
- find $CP/src -name "*.ts" | wc -l: 80 (== project 80).
- ls $CP: BUILD_REPORT CHECKPOINT_MANIFEST DEBUG_LOG FAILURE_LOG GI_OMP_FULL_PORT_DPL1_SPEC MIGRATION_MANIFEST SHIP_DOCS_MANIFEST SPEC_VIOLATION_LOG TESTING_LOG artifacts context_management dist src tests (+ legacy st-*.ts).
- Secret scan: grep -rE 'sk-[A-Za-z0-9]{20,}' $CP → clean required before commit (STEP 10.5 gate).

## Next work
- qwen-code-audit RE-RUN III on the 5 sealed files for the PASS verdict flip (V-16/V-17 closed in source; 16-high set is the work list).
- V-10 loader-own test + V-11 K20.3 criterion reword (findings-identity) on operator order.
- Push only on explicit operator order.
- Sign-off: battery + TUI tokens + SHAs this turn; operator owns push.
