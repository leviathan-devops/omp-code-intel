# CHECKPOINT MANIFEST — gi-jev-decision-layer-v2.3-redteam-ready

**Sealed:** 2026-09-30 · **Mode:** B (a mutable working snapshot — no chattr lock; the operator's default for a checkpoint that receives follow-up)
**The subject:** the GI kernel + the pbk-v2 gate stack — THE JEV DECISION LAYER (the 4 gates judge) + the OMP fallback change.

## THE DIST SHAs (the artifacts)
```
GI ext   2e2a39031c6059ca0fa02eacf986112701f8877d9b2b60d2613efc73c8191cdf  (825316 B)
omp-ct   fe86a02fe77e18a906898b952e8eb53fa2598ceca815346ec35da9ea277bc64c  (205468 B)
```
Both == the live deployed bundles (sha-verified at the seal).

## THE CONTENTS (the file counts)
| the piece | the path | the count |
|---|---|---|
| src (FULL tree) | `src/` | 120 `.ts` files |
| the dists + SHAs | `dist/` | 2 bundles + 2 `.sha256` |
| the canon | `context_management/` | 12 docs |
| the ship docs | `*.md` | 8 (BUILD_REPORT · DEBUG_LOG · FAILURE_LOG · SPEC_VIOLATION_LOG · TESTING_LOG · THEATRICALITY_LOG · DERAILMENT_CATALOGUE · SHIP_DOCS_MANIFEST) |
| the spec + the artifacts | root | PLAN-CLEANUP-JEV.md · gate-control-set.ts · deployed-gate-proof.ts · gate-control-set.json · jev-log-entry.txt · trace-live.ts · trace-refuse.ts |
| **the total** | | **4.6M** |

## THE STATE (verified at the seal)
- **THE 40-CASE CORPUS: 40/40, judgeDown=0, RC=0** — attacks 10/10 · legit 10/10 · quoted 10/10
  (the operator's EXACT command VERBATIM) · boundary 10/10.
- **THE DEPLOYED-BUNDLE PROOF: 10/10, RC=0** against the served artifact (`fe86a02f`).
- **THE LEDGER: 1647 rows, every one judge-bearing** (`~/.omp/run/gate-ledger.jsonl`).
- **THE CONTAINER: 0 `Failed to load extension`** (was 3×) — the F-144 close.
- tsc EXIT-0 (both repos) · pbk `bun test ./tests/` 401/1 (the 1 PRE-EXISTING) · GI tests 5/0.

## THE DERAILMENT CATALOGUE (the red-team source)
`DERAILMENT_CATALOGUE.md` — ~50 classes from 4 scouts over the project's own logs, each with a
verbatim anchor + a copy-pasteable red-team trigger; 12 COVERAGE-GAPs named (identity/session,
mock-as-proof, multi-writer, schema-spelling, starvation, containment, rename-collision,
deny-list-closure, F-147 the escalation, F-148 the container route, F-149 the model-lane stall,
F-134 the single-runtime detector).

## THE HONEST GAPS (not claimed done)
1. **THE AUDIT GATE is BLOCKED** (OCR_JSON_ABSENT) — the last complete verdict FAIL (0 crit/4 high)
   with all 4 fixed; no clean run.
2. **2 of the 4 gates' questions are uncalibrated** on the residual FP classes — F-150 (the
   container verb-list breadth: a metadata READ blocked) · F-151 (the ABIDE documentation FP).
3. **F-147** the escalation ladder not judge-gated · **F-148** the container cannot reach `:8090`.
4. **THE PRE-EXISTING `ledger-span`** failure keeps the pbk suite at 401/1.
5. **A CLEAN BOOT** — the fallback + the 4-gate wire take effect in a NEW omp session.

## THE NEXT WORK
The container red-team: prompt the container agent to REPEAT the catalogue's top derailments
(RT-1..RT-16) and verify the v2.3 kernel catches each — the corpus-expansion loop.
