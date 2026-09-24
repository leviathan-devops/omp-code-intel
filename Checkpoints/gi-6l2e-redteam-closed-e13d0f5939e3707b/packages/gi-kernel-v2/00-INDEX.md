# 00 — PACKAGE INDEX (GI Kernel v2.0)

The complete artifact set. Every file, its role, and its gate.

## THE DOCUMENTS

```
┌────────────────────────────────────────────┬───────┬──────────────────────────────
│ FILE                                       │ LINES │ ROLE
├────────────────────────────────────────────┼───────┼──────────────────────────────
│ 00-MISSION.md                              │   77  │ the mission verbatim + the
│                                            │       │ non-negotiables + the 5 opens
│ 01-DISCOVERY.md                            │  107  │ the measured inventory
│ GI_KERNEL_V2_DPL1_SPEC.md                  │       │ the build spec (14 sections)
│ 06-WAVES.md                                │       │ the wave plan + the exit gates
│ 07-GOALS.md                                │       │ per-desk contracts + the org
│ GI_KERNEL_V2_MASTER_BLUEPRINT.md           │  553  │ the architecture (rev 2.2)
│ ENFORCEMENT_ENGINE_MASTER_BLUEPRINT_v1.md   │ 1031  │ TSG+Abide+Jev (the 9-section)
│ RSI_ARCHITECTURE_v1.md                     │  371  │ the 3.0 design + the LIVE proof
│ FORWARD_COMPAT_v2_TO_v3.md                 │  200  │ the 11 v3 seams
│ PACKAGE_AUDIT.md                           │       │ the audit verdict
└────────────────────────────────────────────┴───────┴──────────────────────────────
```

## THE SOURCE (the v2 delta — 2563 L)

```
src/omp/typed-write.ts   1243 L   the store: layer_id, derivation, confidence, freshness
src/omp/kernel-v2.ts      390 L   STAGE 0..6 + the three detectors
src/omp/rsi.ts            440 L   the reflex store + VERIFIED RETIREMENT
src/omp/hard-deps.ts      220 L   the dependency register (no fallbacks)
src/omp/enforcement.ts    270 L   TSG + Abide, the two-layer kernel
```

## THE TESTS (60 tests — 918 L)

```
tests/st-gi-store.test.ts       11 tests   T-1 / T-8 / SC-7
tests/st-gi-v2-gate.test.ts     14 tests   T-3 / T-4 / SC-2
tests/st-gi-v2-kernel.test.ts    8 tests   T-7 / SC-4 / SC-5 (+ the mutation proof)
tests/st-gi-v2-deps.test.ts     11 tests   T-6 (the register)
tests/st-gi-v2-enforce.test.ts  16 tests   T-5 (both polarities)
```

## THE GATES, AS MEASURED

```
full battery   194 pass / 0 fail / 688 expect / 19 files
typecheck      191 errors == baseline, 0 new
the live store  migrated: 1266 nodes, layer_id NULL = 0
the register    ok=false, 6/11 DOWN (the honest state of this host)
```

## READ ORDER (for a fresh agent)

```
1  00-MISSION.md                      what and why
2  GI_KERNEL_V2_DPL1_SPEC.md          the contract
3  GI_KERNEL_V2_MASTER_BLUEPRINT.md   the architecture
4  06-WAVES.md                         what is built vs open
5  the source modules in wave order   typed-write → kernel-v2 → rsi → hard-deps → enforcement
6  FORWARD_COMPAT_v2_TO_v3.md          the next phase's seams
7  RSI_ARCHITECTURE_v1.md              the 3.0 substrate (already built)
8  PACKAGE_AUDIT.md                    the verdict
```

## THE ONE-SENTENCE STATE

The unit layer is complete and green (5 modules, 60 tests, battery 194/0, tsc at
baseline); the live layer is blocked on a TypeSafe key and an engine install, and that
block is reported rather than routed around.
