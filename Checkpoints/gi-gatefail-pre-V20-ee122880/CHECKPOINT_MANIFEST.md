# CHECKPOINT MANIFEST — gi-gatefail-pre-V20-ee122880

Token: gi-gatefail-pre-V20-ee122880 (hyphens only; state = GATE-FAIL BASELINE BEFORE THE V-20 FIX WAVE).
Date: 2026-09-15. Branch jarvis/gi-main @ 2fd14e8 (audit triage docs committed).

## Why this checkpoint exists
- The qwen RE-RUN III (session 33d64eca, 7 sealed files, 207s) measured 57 findings: 0 critical / 23 high / 26 medium / 8 low → GATE FAIL. This is the state BEFORE the V-20 fix wave, so every fix has a byte-exact before-state to diff and revert to.

## Dist SHAs (verified zero-drift at save)
- GI extensions/graph-intelligence/index.js: ee122880b48a393f9a54429f33d1043f808817c28d2f39ddbfc62dacebaa12ce
- Checkpoint copy: ee122880b48a393f9a54429f33d1043f808817c28d2f39ddbfc62dacebaa12ce — MATCH
- Trident ~/OMP_WORKSPACE/trident-omp/dist/index.js: 280fd30353dd825d24d43cdfa3b4a254df94741981e3bcec3176be2ed78846bd
- Checkpoint copy: 280fd30353dd825d24d43cdfa3b4a254df94741981e3bcec3176be2ed78846bd — MATCH
- Rigs gi-omp-port + gi-omp-port2 exec-verified on ee122880 this turn.

## Battery + state
- Battery: 119 pass / 0 fail / 1004 expect across 19 files (this session).
- TUI: G1 rows=2, G4 AUDIT_DONE findings=3 (run-id 1789488696430), G3 HUNT_DONE 296 v12, G5 impact=2 + safe-delete 2/2/0/0, port2 probe + honest-empty. ALL LIVE GREEN.
- GATE: FAIL — 23 static highs. Triage table: TESTING_LOG re-run III entry. Fix-now set (15 highs) + debt set (8 highs) named there; wave V-20 queued.

## Contents
- src/: 80 .ts (hunter/hydra/omp/scoping) — matches project exactly.
- tests/: 19 files (16 ST + 3 hydra batteries) — the full battery.
- dist/: index.js (GI ee122880) + trident-index.js (280fd303) — both MATCH.
- context_management/: RUNNING_BUILD_LOG.md (the project's entire canon — single-doc project, recorded as structural absence per the >=11 floor).
- Ship docs: all 5 (BUILD 195 / DEBUG 179 / FAILURE 155 / SPEC 67 / TESTING 296) + SHIP_DOCS_MANIFEST (Baseline ee122880, counters EN-022/F-19/V-20/P-01).
- Spec: GI_OMP_FULL_PORT_DPL1_SPEC.md (302L) + MIGRATION_MANIFEST.md (761L).
- Artifacts: ct-results-graphify.json.

## Honest gaps
- 23 qwen highs OPEN in this snapshot by design (this is the before-state).
- Canon floor >=11 docs not met (project maintains 1) — structural, not a save defect.
- Doc-density floors under skill ideals (milestone-scoped convention) — recorded.
- MODE B mutable — no chattr (follow-up wave lands on top of this lineage).
- Secret scan: clean (sk-pattern grep = zero hits).

## Next work
- V-20 wave: corbell txn parity (H02-H04), scope threading (H05), map-throw wrap (H06), supersede filter+guard (H07), UNIQUE (H08), BFS seed (H09), dirname (H10), size-hint (H11), confinement (H12), read-once (H13), community join (H14), quota regex (H18), redaction+0600 (H19), stale 100ms (H21), containment (H22), Z-anchor (H23).
- Then: rebuild both dists, deploy both rigs, battery + TUI re-proof, re-run IV → GATE PASS = 0 crit / 0 high.

## Save verification (this save)
- SHAs: GI MATCH + trident MATCH (zero drift, exec-verified rig copies).
- Secret scan: grep sk-pattern over the tree -> zero hits.
- src 80/80 .ts; tests 19/19; dist both copies; canon 1 doc (single-doc project); ship docs 5/5; spec + migration + CT artifact present.
- MODE B (mutable working snapshot, no chattr) — the V-20 wave lands on this lineage.
