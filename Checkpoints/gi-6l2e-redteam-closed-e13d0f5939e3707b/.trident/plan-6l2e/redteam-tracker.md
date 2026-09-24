# ★ THE RED-TEAM TRACKER — the 5 fronts (the pin's board)

**The pin:** `PIN_FIX_ALL_REMAINING_BUGS.md` · **the run:** 2026-09-23
**The dist:** `038c84c31569aebbf15ba936f4ecc06ad691baa3c2bcffd2f56f4489a2f15dcd`
**THE STOP:** every front green WITH its token · every finding FIXED+pin or NOT-A-BUG+evidence ·
the fresh AUDIT GATE: PASS on the FINAL dist · `bun run test` exit 0 · the predicate exit 0 ·
the receipt updated · the checkpoint refreshed · git clean.

| the front | the files | the gate | the state |
|---|---|---|---|
| **W1** the artifact-coverage | `tests/st-artifact-coverage.test.ts` (NEW) | the suite MOUNTS the dist; exits 0 | ★ **DONE** — 5 pass / 0 fail · ST-AC-1..5 |
| **W2** the audit findings | `scripts/kev-decide.ts` · `src/omp/extension.ts` · `tests/st-audit-findings.test.ts` (NEW) | every row carries a verdict + its evidence | ★ **DONE** — 6 pass / 0 fail · 4 NOT-A-BUG + 1 FIXED (the TOCTOU) · ST-AF-1..5 |
| **W3** the kernel red-team | `tests/st-redteam-kernel.test.ts` (NEW) | the suite exits 0; every confirmed defect FIXED+pin | ★ **DONE** — 10 pass / 0 fail · **FOUND F-108** (the CLI guard) · ST-RT-1..10 |
| **W4** the container coverage | `scripts/container-substrate-payload.sh` (NEW) · `tests/st-container-coverage.test.ts` (NEW) | the container's register reads its REAL value, the DOWN NAMED | ★ **DONE (6/8, honest)** — 2 pass / 0 fail · **F-110** · ST-CT-1..2 |
| **W5** the fresh audit | `artifacts/` · `TESTING_LOG.md` | `AUDIT GATE: PASS` on the FINAL dist | ⏳ **RUNNING** (bg_3, the GO mimo lane) |

## THE DEFECTS FOUND THIS RUN
| # | the finding | the evidence | the state |
|---|---|---|---|
| **F-107** | the artifact-coverage gap (1 of 51 test files mounted the bundle) | the subject audit | ★ **FIXED** — W1 (5 pins) · 2 of 54 files now mount it |
| **F-108** | the KEV CLI's usage guard was INEFFECTIVE (`questions.length` always ≥1) | `--state` alone → `{ok:true}` | ★ **FIXED** — the guard requires ≥1 option |
| **F-109** | `confineTargetPath` TOCTOU (a stale `real`) | the audit's finding #10 | ★ **FIXED** — the double-realpath re-validation |
| **F-110** | the container's register ceiling is 6/8, not 8/8 | 5 shipped · 1 daemon · 1 absent host-side | ★ **RECORDED** — both DOWN named with retry conditions |

## THE FILES' DISCIPLINE (the ONE-WRITER law)
- W1: `tests/st-artifact-coverage.test.ts` ONLY
- W2: `src/omp/extension.ts` + `scripts/kev-decide.ts` + `tests/st-audit-findings.test.ts`
- W3: `tests/st-redteam-kernel.test.ts` ONLY
- W4: `scripts/container-substrate-payload.sh` + `tests/st-container-coverage.test.ts`
- W5: `artifacts/` + `TESTING_LOG.md`

## THE RESUME POINTERS
```
the register   bun scripts/consumption-audit.ts . evidence --gate
the predicate  bun scripts/goal-verify.ts . evidence
the audit rows artifacts/AUDIT_GATE_F98.md
the bug ledger FAILURE_LOG.md (append) · DEBUG_LOG.md (append)
the canon      context_management/ (11 — CURRENT_STATE + EVIDENCE_STATE)
the checkpoint Checkpoints/gi-6l2e-SHIPPED-consumed-8of8-kev-in-place-of-jev-<sha16>/
```
