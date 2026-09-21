# BUILD_STATE — the SHA chain + the module inventory

**dist SHA: 83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709** · 2026-09-21

## THE SHA CHAIN (every checkpoint + what changed)

```
v1.3 dist (DEPLOYED)          83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709
  the frozen surface. 613,039 B. Unchanged since the v1.3 seal.
v1.3 ship package             dist seg 83eb7bba (SHIP_PACKAGES/Graph_Intel_v1.3/)
the v2.1 blueprint            242f52c556151449  (41,853 B, 862 L)
the 14-case measurement       artifacts/jev-kernel/measurement-14-case.json (bestT=0.40)
checkpoint v2.0-working       750009c (the first save) → c329f83 (the refresh with the blueprint)
baseline at session start     c9bff81a56dc5bc5d5740623038d34507f6ab890
HEAD                          652d780 (the create pin)
```

## THE MODULE INVENTORY (file → lines → purpose → status)

```
src/omp/typed-write.ts  1243  the store: layer_id · derivation · confidence · freshness  SOLID
src/omp/kernel-v2.ts     390  STAGE 0..6 + the three detectors                          SOLID
src/omp/rsi.ts           448  the reflex store + VERIFIED RETIREMENT                    SOLID
src/omp/hard-deps.ts     220  the dependency register (no fallbacks)                    SOLID
src/omp/enforcement.ts   270  TSG + Abide, the two-layer kernel                         SOLID
src/omp/jev.ts           149  the live Jev client                                        SOLID
src/omp/fire-gate.ts     370  the firing-time decision kernel                           BUILT/UNWIRED
src/omp/calibration.ts   185  the derivation machinery                                  BUILT
──────────────────────────────
                        3275  the v2.0+v2.1 source delta
```

## THE TEST INVENTORY (6 files / 65 tests)

```
tests/st-gi-store.test.ts       211 L  11 tests  T-1/T-8/SC-6/SC-7
tests/st-gi-v2-gate.test.ts     192 L  14 tests  T-3/T-4/SC-2
tests/st-gi-v2-kernel.test.ts   222 L   9 tests  T-7/SC-4/SC-5 + the mutation
tests/st-gi-v2-deps.test.ts     146 L  11 tests  T-6
tests/st-gi-v2-enforce.test.ts  170 L  16 tests  T-5
tests/st-gi-v2-wiring.test.ts   109 L   4 tests  the live-shape contract
src/hydra/__tests__/fx383-fixture.ts  the hermetic fixture helper (the container fix)
──────────────────────────────
                               1050 L  65 tests
```

## VERIFIED RESULTS (the gates, this turn)

```
battery (host)      199 pass / 0 fail / 701 expect / 20 files [1258ms]
battery (CONTAINER) 199 pass / 0 fail / 705 expect / 20 files (clean /tmp, no ambient keys)
tsc                 191 errors == the pre-session baseline, 0 NEW
the gate suite      12 pass / 0 fail / 30 expect
the paragon battery 17 pass / 0 fail / 51 expect
register            ok=false up=5/11 first=GI_LAYER_SEMANTICA
```

## THE BUILD COMMAND + THE EXACT ENV

```
cd /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
ln -sfn /home/leviathan/JARVIS_WORKSPACE/OMP/Graph_Intelligence/node_modules node_modules
bun test ./tests/ ./src/hydra/__tests__/          # the battery
bunx tsc --noEmit -p tsconfig.json                # the typecheck
rm -f node_modules                                 # ALWAYS clean the symlink
source ~/.config/typesafe/env.sh                   # loads TYPESAFE_AI_API_KEY from the 0600 file
the container: docker exec stupefied_morse sh -lc 'cd /work/gi && /root/.bun/bin/bun test ...'
```

## THE FROZEN-MACHINERY FILE:LINE LIST (what is locked and why)

```
extensions/graph-intelligence/index.js     sha 83eb7bba... (the deployed artifact)
src/omp/graph-gate.ts:208                  the tier ladder — the v1.3 behaviour
src/omp/graph-gate.ts:136                  the drift reset
src/omp/gate-hook.ts:117                   THE single call site (grep count = 1)
src/omp/graph-gate.ts:247/:250/:254        the 3 PROPOSED hooks
src/omp/populate.ts:21                     the F-48 law (no third substrate)
```

## THE CHECKPOINT STRUCTURE (the last save)

```
Checkpoints/gi-kernel-v2.0-working-fire-gate-calibration-measured/   175 files / 3.4M
  src/ 94 .ts (MATCH) · dist/index.js sha 83eb7bba (MATCH) · context_management/ ·
  the 6 ship docs · artifacts/{gi-kernel-v2, paragon-runtime-encryption, jev-kernel,
  skills, ct-v2, reports, scripts} · CHECKPOINT_MANIFEST.md + CHECKPOINT_STRUCTURE.md
  SEAL: MODE B (no lock) — documented, per the operator's ruling on manifest-only locks
```
