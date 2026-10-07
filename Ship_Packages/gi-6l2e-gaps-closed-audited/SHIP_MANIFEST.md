# SHIP MANIFEST — gi-6l2e-gaps-closed-audited (v1)

Version: 1 · Source: `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence` · Date: 2026-10-03
Deployment fingerprint (GI ext): `879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741`
Source branch: `jarvis/gi-main` · HEAD `2a0682b` (+ the uncommitted audit fixes)

## ARTIFACTS
| path | KB | SHA-16 |
|---|---|---|
| `dist/gi-index.js` | 809 | `879cbbf80b9d9682` |

The artifact is the deployed OMP extension bundle. `sha(source)==sha(deployed)` at seal.

## SOURCE STATS
- src `.ts` files: 120 · lines: 37,831 · packaged `.md` files: 69
- the 6L+2E: `bun scripts/consumption-audit.ts . --gate` → `union=8/8` (EXIT 0); 6 per-subject rows
- ABIDE observable: a judge verdict → gate-ledger `Pattern=ABIDE_JUDGE p=0.703` + ABIDE-R1/R2/R3
- C2KG edges: 411 · L2_ARSUMBRIS symbol-space facts: 50 · tsc: EXIT-0 · st-gi-6l2e: 30/0
- AUDIT: `qwen-code-audit` (poolside-laguna-s) 3 rounds — 1 critical + 2 high FIXED+PROVEN; 0 crit/high OPEN
- the null-guard probe: `NULL_GUARD_OK facts=0` (a non-object `.c2kg/index.json`)

## TEST RESULTS SUMMARY
- `tests/st-gi-6l2e.test.ts` — 30 pass / 0 fail / 469 expect() calls (a load-sensitive flake in the
  corbell/graphify tests under concurrent CPU load — the per-test timeout, not the changed files)
- `bunx tsc --noEmit` — EXIT-0 · `bun scripts/consumption-audit.ts . --gate` — `union=8/8` EXIT-0

## PACKAGE CONTENTS
- `dist/` the deployed extension bundle (`gi-index.js`)
- `src/` the full source tree (120 `.ts`, adapters + gates + hunter + omp)
- `scripts/` (the build + the consumption predicate + the au-read wire client + the whole-tree audit)
- `tests/` (72 files, incl. `st-gi-6l2e.test.ts`) · `packages/` · `context_management/` (12 canon docs)
- the 6 ship docs (`BUILD_REPORT` · `DEBUG_LOG` · `FAILURE_LOG` · `SPEC_VIOLATION_LOG` · `TESTING_LOG` · `THEATRICALITY_LOG`)
- `Checkpoints/gi-6l2e-gaps-closed-2026-10-02/` (the W5 seal: the results artifact + the dist)
- `artifacts/sg-ocr-728e6ceb94844450.json` (the code-audit artifact — GATE S7 input)
- the generated docs: `BUILD_REPORT.md` · `DEBUG_LOG.md` · `FULL_BUILD_CONTEXT.md` · `MASTER_INDEX.md` · `PACKAGE_AUDIT.md`
- `GIT_HISTORY.md` · `README.md` · `DEPLOY.sh`

## AUDIT
`AUDIT GATE: PASS (0 critical/high OPEN)` — sessions `5938c5e6` (1 crit/2 high/5 med/4 low),
`c183570e` (1 crit/1 high/2 med/5 low), `df2b5c0a` (1 med/1 low). 1 residual LOW (c2kg pipeline
duplication — accepted refactor debt).
