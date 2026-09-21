# 01 — DISCOVERY (measured this turn, never remembered)

## THE LANDING ZONE

```
repo      /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
branch    jarvis/gi-main · HEAD 89e86b8 (the blueprint commit)
runtime   bun 1.4.2 · node >= 22
rig       stupefied_morse @ omp-ct:master  Up 4 hours (the container as host runtime)
```

## THE MACHINERY THIS BUILD EXTENDS (measured, wc -l)

```
src/omp/typed-write.ts   1243 L   the store: layer_id · derivation · confidence · freshness
src/omp/kernel-v2.ts      390 L   STAGE 0..6 + the three detectors
src/omp/rsi.ts            448 L   the reflex store + VERIFIED RETIREMENT
src/omp/hard-deps.ts      220 L   the dependency register (no fallbacks)
src/omp/enforcement.ts    270 L   TSG + Abide, the two-layer kernel
src/omp/jev.ts            149 L   the live Jev client (the real endpoint)
src/omp/fire-gate.ts      370 L   THE FIRING-TIME DECISION KERNEL (v2.1's core, built)
src/omp/calibration.ts    185 L   THE DERIVATION MACHINERY (built)
────────────────────────────────
                        3275 L   the v2.0+v2.1 source delta
```

**★ THE CRITICAL DISCOVERY: the v2.1 core is ALREADY BUILT.** `fire-gate.ts` and
`calibration.ts` exist, type-clean, and were exercised live (13 fires through the real Jev API).
**What does NOT exist is the wiring** — `grep -c "FireGate" src/omp/kernel-v2.ts` = 0. Nothing
calls the gate. The build is therefore an INTEGRATION build, not a from-scratch one.

## THE TESTS (measured)

```
tests/st-gi-store.test.ts       211 L  11 tests
tests/st-gi-v2-gate.test.ts     192 L  14 tests
tests/st-gi-v2-kernel.test.ts   222 L   9 tests
tests/st-gi-v2-deps.test.ts     146 L  11 tests
tests/st-gi-v2-enforce.test.ts  170 L  16 tests
tests/st-gi-v2-wiring.test.ts   109 L   4 tests
──────────────────────────────────────────
                                1050 L  65 tests
```

## THE GATES (measured this turn)

```
battery (host)   199 pass / 0 fail / 701 expect / 20 files [1258ms]
tsc              191 errors == the pre-session baseline, 0 NEW
the gate suite    12 pass / 0 fail / 30 expect
the paragon bat.  17 pass / 0 fail / 51 expect
```

## THE LIVE REGISTER (what is actually UP on this host)

```
ok=false  up=5/11  first=GI_LAYER_SEMANTICA
  DOWN L1_SEMANTICA · L2_ARSUMBRIS · L3_UA · L4_C2KG · L5_CORBELL (ENOENT)
  UP   L6_GRAPHIFY · TSG · ABIDE · RSI_STORE · GI_STORE_DIR
  DOWN JEV   (TYPESAFE_AI_API_KEY — present at ~/.config/typesafe/key mode 0600,
              NOT exported into the ambient env; the run shim sources it)
```

**★ THE MEASURED CONSEQUENCE:** with the register live, STAGE 0 REFUSES every act. **Registering
the gate before the engines are installed would refuse every tool call in every session on this
host.** The wiring order is load-bearing (the blueprint's §13 residual #6).

## THE MEASUREMENT BASELINE (the 14-case run, EN-047)

```
/tmp/jev-fire-measurement.json   bestT=0.40 · bestF1=0.933 · health.ok=false
real violations  n=7 mean P=0.581 min=0.490
false positives  n=7 mean P=0.253 max=0.530
★ the seeds (0.90/0.75/0.85) were ~2x too high; the act band fired ZERO times.
```

## THE BLUEPRINT (Step 4 — EXISTS, 862 L)

```
packages/gi-kernel-v2.1/GI_KERNEL_V2.1_MASTER_BLUEPRINT_v1.md
  sha256(16) 242f52c556151449 · 14 sections · 25/25 components mapped
  §10 the W1-W9 build order · §11 the M1-M12 measurement plan
```

## THE CONTAINER HERITAGE (what the container already taught, EN-046)

```
· the hydra batteries READ a host-only /tmp/fx383 fixture and never created it
  → FIXED with the idempotent ensureFx383() helper
· the w7 suite's GO_KEYS depended on the AMBIENT env (an ESM-hoisting trap)
  → FIXED with a beforeEach re-pinning the env + reloadGoKeys()
· the container then read 199 pass / 0 fail with a clean /tmp and no ambient keys
```

## VARIANT LINEAGE

```
no competing variants — the v2.1 modules are new this session. The v2.0 package
(packages/gi-kernel-v2/, 3246 L) is the direct predecessor and is carried as context.
The v1.3 lineage remains sealed in SHIP_PACKAGES/Graph_Intel_v1.3 (dist 83eb7bba).
```

## CONSTRAINTS DISCOVERED (each cost a round this session)

```
· openTypedStore REFUSES a symlinked store path; the session-path regex needs
  /sessions/[A-Za-z0-9_-]{8,24}/store.sqlite — fixtures must use sessionStorePath()
· applyTypedDdl's error contract is TESTED with a run-only db double: a new step that
  introspects must REPORT a skip rather than throw
· bun:sqlite returns snake_case; a camelCase domain type needs an explicit mapper
· a SOURCE-FILE mutation is not a valid mutation method on the paragon package (the
  module-instance split, F-51) — mutate the SEAM at runtime
· docker cp of a directory NESTS it; use the trailing /. to copy contents
· the graphify freshness probe compares a sidecar the BUILD never wrote → the build
  must mark its own output fresh (EN-043)
```

## WHAT I DID NOT READ

```
· the JEV_ENGINEERING_BIBLE.md beyond §1-§6.5 (300 of 3006 lines read)
· the oracle's design beyond the blueprint's seam (§9.3 of the blueprint)
· the TSG Rust internals (built, not read)
· the Abide package internals (source-only, not installed)
```
