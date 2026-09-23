# THE 6L+2E EXECUTION PLAN — hydra-mode (N concurrent plans, interface-first)
**Law:** the edge IS the deliverable. A wave that names a FILE and no LAYER-EDGE is REFUSED.
**Owner:** the orchestrator. **Dispatch:** the wave-manager (task action=generate) or actor fan-out.

WAVES: 12

## PLAN A — THE SUBSTRATE (the store the layers read)
| wave | the layer-edge | DISJOINT files | done-when gate |
|---|---|---|---|
| A-0 | ★ THE STORE → THE LIVE TREE | `src/omp/populate-graphify.ts`, `src/omp/populate-corbell.ts`, `scripts/exclude-checkpoints.ts` | `SELECT COUNT(*) FROM typed_nodes WHERE file LIKE '%oracle.ts%'` > 0; Checkpoints/ = 0 nodes |
★ A-0 GATES EVERYTHING. A layer over the wrong tree answers about the wrong code.

## PLAN B — THE 6 LAYERS (PARALLEL — disjoint adapters, one registry)
| wave | the layer-edge | files | gate |
|---|---|---|---|
| B-1 | ★ L5 CORBELL → the settlement rung | `src/omp/adapters/corbell.ts`, `src/omp/layer-registry.ts` | `test_consume_corbell` — a corbell fact changes a verdict |
| B-2 | ★ L6 GRAPHIFY → the settlement rung | `src/omp/adapters/graphify.ts` | `test_consume_graphify` |
| B-3 | ★ L4 C2KG → the context rung | `src/omp/adapters/c2kg.ts` | `test_consume_c2kg` OR `GI_LAYER_UNCONSUMED` |
| B-4 | ★ L3 UA → the context rung | `src/omp/adapters/ua.ts` | `test_consume_ua` OR `GI_LAYER_UNCONSUMED` |
| B-5 | ★ L2 ARSUMBRIS → the knowledge rung | `src/omp/adapters/arsumbris.ts` | `test_consume_arsumbris` OR `GI_LAYER_UNCONSUMED` |
| B-6 | ★ L1 SEMANTICA → the decision rung | `src/omp/adapters/semantica.ts` | `test_consume_semantica` OR `GI_LAYER_UNCONSUMED` |
★ B-1..B-6 ARE PARALLEL: each adapter is its OWN file; the registry is the interface (landed FIRST).

## PLAN C — THE 2 KERNELS (the enforcement)
| wave | the layer-edge | files | gate |
|---|---|---|---|
| C-1 | ★ TSG → the meaning gate | `src/omp/adapters/tsg.ts`, `src/omp/enforcement.ts` | `test_consume_tsg` — a meaning verdict |
| C-2 | ★ ABIDE → the repair path | `src/omp/adapters/abide.ts`, `src/omp/enforcement.ts` | `test_consume_abide` — a repair, never a block |

## PLAN D — THE REGISTER + THE CONSUMPTION PROBE
| wave | the layer-edge | files | gate |
|---|---|---|---|
| D-1 | ★ THE REGISTER REPORTS CONSUMPTION | `src/omp/hard-deps.ts`, `src/omp/layer-consumption.ts` | `test_register_reports_consumers` — 0 consumers → `GI_LAYER_UNCONSUMED` |
| D-2 | ★ THE DECISION CONSULTS THE REGISTRY | `src/omp/fire-gate.ts`, `src/omp/extension.ts` | `test_decision_consults_registry` — the rung reads the registry, not raw SQL |

## PLAN E — THE PROOF
| wave | the deliverable | files | gate |
|---|---|---|---|
| E-1 | THE 7-CLASS CORPUS REPLAY | `tests/st-gi-6l2e.test.ts` | 7/7 settle with their SPECIFIC token · `firesUsed()` unchanged |
| E-2 | THE CONTAINER PROOF | `.trident/plan-6l2e/phaseE.json` | 10/10 + the negative suite green |
| E-3 | THE SEAL | `packages/gi-kernel-6l2e/` | PACKAGE_AUDIT PASS |

## THE INTERFACE-FIRST ORDER (the parallelism enabler)
```
T0  A-0 lands the STORE (the substrate every adapter reads) + the REGISTRY INTERFACE
T1  B-1..B-6 + C-1..C-2 + D-1 fire IN PARALLEL (disjoint files, the registry interface frozen at T0)
T2  D-2 integrates (the decision consults the registry — the ONE serial point)
T3  E-1..E-3 (the proof + the seal)
★ NINE WAVES RUN AT T1. THE ONLY SERIAL POINTS ARE A-0 (T0) AND D-2 (T2).
```

## THE PREFLIGHT GATE (P1-P5 — all green or no dispatch)
```
[ ] the DPL1 exists (GI_KERNEL_6L2E_DPL1_SPEC.md — this session)
[ ] this wave-plan (WAVES: 12) with a LAYER-EDGE per wave
[ ] the gates proven by EXECUTED scripts (the known-bad refused)
[ ] the container plan validated (preflight ct → READY)
[ ] the roster at floors (one desk per wave, DPL-grade prompts)
[ ] file sets DISJOINT across plans B/C/D
[ ] interfaces cross-checked (the layer-registry interface frozen at T0)
[ ] the TODO BOARD initialized before dispatch
```

## THE BOARD (task-tree todos)
```
PLAN A: substrate (1 wave)
PLAN B: the 6 layers (6 waves)      ← parallel
PLAN C: the 2 kernels (2 waves)     ← parallel
PLAN D: register + decision (2)     ← D-2 serial
PLAN E: proof + seal (3 waves)
DEP-GATE T0: A-0 done → fire B-1..D-1
DEP-GATE T2: B+C+D-1 done → fire D-2
QC: the integration audit · the 7-class corpus · the container
DOC: canon + ship docs after EVERY wave
```

## THE ANTI-DERAIL (what killed the last build — mechanically prevented)
```
★ AA-1 THE REGISTER-WITHOUT-CONSUMERS  → `scripts/layer-consumption.ts` FAILS on 0 consumers
★ AA-2 THE FILE-ORGANIZED WAVE         → THIS wave-plan: every wave names a LAYER-EDGE
★ AA-3 THE LIGHT-SWITCH LAYER          → a layer id ONLY in hard-deps.ts → FAIL
★ AA-4 THE UNCOVERED RULE              → a rule settling on a COUNT where the extractor lacks the kind → FAIL
★ THE CATEGORY ERROR                   → the pin's own text: "the eyes are not a light switch"
```

## THE RECORD LOOP (per wave, mandatory)
```
after EVERY completed wave: canon-doc-update (the 11) + update-ship-docs (the 6)
a wave without its doc entry is an UNFINISHED wave.
```
