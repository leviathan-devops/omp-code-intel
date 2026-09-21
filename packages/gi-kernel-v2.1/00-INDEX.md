# 00 — PACKAGE INDEX (GI Kernel v2.1 — the Jev-in-the-loop runtime kernel)

Every file, its role, and its gate. The package is DONE when every spec gate is green, the
battery is green, every document is at its floor, and a fresh agent can build from it alone.

## THE DOCUMENTS

```
┌──────────────────────────────────────────────┬───────┬────────┬──────────────────────
│ FILE                                         │ LINES │ FLOOR  │ ROLE
├──────────────────────────────────────────────┼───────┼────────┼──────────────────────
│ 00-MISSION.md                                │   86  │ present│ the mission verbatim +
│                                              │       │        │ the 4 rulings + 5 opens
│ 01-DISCOVERY.md                              │  125  │ present│ the measured inventory
│ GI_KERNEL_V2.1_DPL1_SPEC.md                  │  450  │  400   │ the build spec (19 §)
│ GI_KERNEL_V2.1_MASTER_BLUEPRINT_v1.md        │  862  │ 1000   │ the design of record
│ 06-WAVES.md                                  │  112  │ present│ W1-W9 + exit gates
│ 07-GOALS.md                                  │   92  │ present│ 5 desk contracts + the org
│ MEASUREMENT_PLAN.md                          │   48  │ present│ M1-M12 + the instruments
│ 00-INDEX.md                                  │  this │ present│ the read order
│ canon/ (11 docs)                             │ seeded│  200 ea│ the canon — GROWTH PENDING
└──────────────────────────────────────────────┴───────┴────────┴──────────────────────
```

**★ TWO FLOORS NOT MET, RECORDED RATHER THAN PADDED:**
```
· the blueprint is 862 L against a 1000 L system floor. It carries 14 sections, 3 dispatch
  traces, 25/25 components mapped and 0 over-width lines — it is DENSE, and 862 is its
  true length. Padding to 1000 would be the cheat the skill rejects.
· canon/ is SEEDED (3 docs with real content, 8 empty stubs) against a 200 L/doc floor.
  The skill permits growth per milestone; the shortfall is named here.
```

## THE SOURCE (the v2.1 delta + what it extends)

```
src/omp/fire-gate.ts      370 L  BUILT      the firing-time decision kernel
src/omp/calibration.ts    185 L  BUILT      the derivation machinery
src/omp/jev.ts            149 L  BUILT LIVE the live client (the real endpoint)
src/omp/kernel-v2.ts      390 L  TO MODIFY  W3/W4 wire the gate here
src/omp/typed-write.ts   1243 L  EXISTING   the store
src/omp/rsi.ts            448 L  EXISTING   the reflex store
src/omp/hard-deps.ts      220 L  EXISTING   the register
src/omp/enforcement.ts    270 L  EXISTING   TSG + Abide
src/omp/oracle.ts            —  TO BUILD    W2
src/omp/policy-store.ts      —  TO BUILD    W5
src/omp/fire-ledger.ts       —  TO BUILD    W1
```

## THE TESTS

```
EXISTING  6 files · 1050 L · 65 tests · battery 199 pass / 0 fail / 701 expect
TO BUILD  tests/st-gi-v2.1-firegate.test.ts  (14 tests, T1-T14, incl. the mutation)
```

## THE GATES

```
battery (host)      199 pass / 0 fail / 701 expect / 20 files [1258ms]
battery (container) 199 pass / 0 fail / 705 expect / 20 files
tsc                 191 == the pre-session baseline, 0 NEW
the register        ok=false up=5/11 first=GI_LAYER_SEMANTICA
the measurement     bestT=0.40 bestF1=0.933 health.ok=false
```

## READ ORDER (a fresh agent)

```
1  00-MISSION.md                     what and why + the 5 opens
2  GI_KERNEL_V2.1_MASTER_BLUEPRINT_v1.md    the design (esp. §10 W1-W9, §11 M1-M12)
3  GI_KERNEL_V2.1_DPL1_SPEC.md       the contract
4  06-WAVES.md                       what to build in what order
5  07-GOALS.md                       the desk contracts
6  MEASUREMENT_PLAN.md               the numbers to earn
7  src/omp/fire-gate.ts + calibration.ts   the built core
8  canon/                            the state
```

## THE ONE-SENTENCE STATE

The v2.1 core is BUILT and measured (fire-gate 370 L, calibration 185 L, 14 real firings); the
WIRING is not (0 call sites); the thresholds are UNCALIBRATED and wait on M2 (your cost matrix);
and the build order W1→W9 is ready to execute the moment that one number arrives.
