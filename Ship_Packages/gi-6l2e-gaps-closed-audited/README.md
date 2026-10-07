# GI 6L+2E — GAPS CLOSED + AUDITED · Ship Package

**Deployment fingerprint:** `879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741`

Graph Intelligence (GI) is a session-scoped graph-intelligence OMP extension. This package seals the
**6L+2E gaps-closed** work: all 8 consumers (the 6 graph layers L1 SEMANTICA · L2 ARSUMBRIS · L3 UA ·
L4 C2KG · L5 CORBELL · L6 GRAPHIFY, plus the 2 Jev kernels TSG + ABIDE) are **CONSUMED across the
subject union** and **observable**, and the changed code passed a **3-round code audit** (1 critical +
2 high FIXED+PROVEN; 0 critical/high OPEN).

## The one-line proof
```
$ bun scripts/consumption-audit.ts . --gate
[consumption] union=8/8
[consumption] ★ THE PREDICATE PASSED: all 8 consumers CONSUMED for their domains
EXIT=0
```

## Artifacts
| path | KB | SHA-16 |
|---|---|---|
| `dist/gi-index.js` | 809 | `879cbbf80b9d9682` |

## Deploy
```
bash DEPLOY.sh
```
Copies `dist/gi-index.js` → `~/.omp/agent/extensions/graph-intelligence/index.js`, verifies the sha,
and prints the verification command. A **new omp session** loads the new bundle.

## Verification
```
bunx tsc --noEmit                                         # EXIT-0
bun test tests/st-gi-6l2e.test.ts                         # 30 pass / 0 fail
bun scripts/consumption-audit.ts <projectRoot> --gate     # union=8/8
```

## Contents
| path | what |
|---|---|
| `dist/` | the deployed extension bundle |
| `src/` | the full source tree (120 `.ts`) |
| `scripts/` | the build + the consumption predicate + the au-read wire client |
| `tests/` | the suite (72 files, incl. `st-gi-6l2e.test.ts`) |
| `context_management/` | the 12 canon docs (CURRENT_STATE … RUNNING_DEBUG_LOG) |
| `Checkpoints/gi-6l2e-gaps-closed-2026-10-02/` | the W5 seal (results artifact + dist) |
| `artifacts/sg-ocr-728e6ceb94844450.json` | the code-audit artifact |
| `BUILD_REPORT.md` · `DEBUG_LOG.md` · `FULL_BUILD_CONTEXT.md` | the generated docs |
| `MASTER_INDEX.md` · `PACKAGE_AUDIT.md` · `GIT_HISTORY.md` | the index + the audit verdict + the lineage |
| the 6 ship docs | the 6-doc build record |

## Audit
`AUDIT GATE: PASS (0 critical/high OPEN)` — the audit ran on the `poolside-laguna-s` lane (the free
lane was day-capped). 1 residual LOW finding (c2kg pipeline duplication — accepted refactor debt).
