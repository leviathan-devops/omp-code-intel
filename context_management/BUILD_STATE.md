# BUILD_STATE — the SHA chain + the module inventory

**dist SHA: 038c84c31569aebbf15ba936f4ecc06ad691baa3c2bcffd2f56f4489a2f15dcd** · 2026-09-21

## THE SHA CHAIN (every checkpoint + what changed)

```
v1.3 dist (DEPLOYED)          038c84c31569aebbf15ba936f4ecc06ad691baa3c2bcffd2f56f4489a2f15dcd
  the frozen surface. 613,039 B. Unchanged since the v1.3 seal.
v1.3 ship package             dist seg 83eb7bba (SHIP_PACKAGES/Graph_Intel_v1.3/)
the v2.1 blueprint            038c84c31569aebb  (41,853 B, 862 L)
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

## THE CHECKPOINT STRUCTURE (the full tree with line counts)

```
Checkpoints/gi-kernel-v2.0-working-fire-gate-calibration-measured/    175 files / 3.4M
├── src/                    94 .ts  (MATCH the project's 94)
│   ├── omp/                typed-write 1243 · kernel-v2 390 · rsi 448 · hard-deps 220 ·
│   │                       enforcement 270 · jev 149 · fire-gate 370 · calibration 185
│   ├── hunter/             the graph adapters + the key pool
│   ├── scoping/            gi-session-path.ts (resolveSessionId) + the store guards
│   └── hydra/              the wave machinery + __tests__/fx383-fixture.ts
├── dist/index.js           613,039 B   sha 83eb7bba (MATCH)
├── context_management/     this doc set
├── BUILD_REPORT.md 467 L · DEBUG_LOG.md 521 L · FAILURE_LOG.md 397 L ·
│   SPEC_VIOLATION_LOG.md 74 L · TESTING_LOG.md 576 L · THEATRICALITY_LOG.md 387 L
├── artifacts/
│   ├── gi-kernel-v2/               the v2.0 package (11 docs + drivers)
│   ├── paragon-runtime-encryption/ the guarded-seam boilerplate (9 files)
│   ├── jev-kernel/                 fire-gate · calibration · jev · enforcement
│   │                               + measurement-14-case.json
│   ├── skills/derive-runtime-measurements/   the minted skill
│   ├── ct-v2/                      the RB host-live evidence
│   └── reports/ + scripts/
├── CHECKPOINT_MANIFEST.md          the state + the HONEST GAPS + the refresh note
└── CHECKPOINT_STRUCTURE.md         the tree + the counts + the gates
```

## THE ENVIRONMENT + THE EXACT COMMANDS

```bash
# THE BATTERY (the primary gate)
cd /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
ln -sfn /home/leviathan/JARVIS_WORKSPACE/OMP/Graph_Intelligence/node_modules node_modules
bun test ./tests/ ./src/hydra/__tests__/     # → 199 pass / 0 fail / 701 expect / 20 files
rm -f node_modules                            # ALWAYS clean the symlink (it breaks other tools)

# THE TYPECHECK
bunx tsc --noEmit -p tsconfig.json            # → 191 errors == the baseline

# THE LIVE JEV KEY (out-of-band, mode 0600)
source ~/.config/typesafe/env.sh              # exports TYPESAFE_AI_API_KEY from the file
# the key NEVER enters the repo, a chat, a log, or a doc row.

# THE CONTAINER (the rig of record)
docker exec stupefied_morse sh -lc 'cd /work/gi && /root/.bun/bin/bun test ./tests/ ./src/hydra/__tests__/'
# ★ NOTE: staging uses `docker cp src/hydra/. <dest>/` — the trailing /. copies CONTENTS.
#   Without it, docker cp NESTS the directory (measured: it produced __tests__/__tests__).

# THE MIGRATION / POPULATE (the store work)
populateSessionStore(<store>, <root>, tag, {substrate:"graphify", graphifyGraph:<path>})
bun scripts/graphify-build.ts --target <root>   # the build now marks its OWN sidecar fresh
```

## THE SHA CHAIN — WHAT CHANGED BETWEEN EACH

```
c9bff81  the session's baseline (the pinned HEAD from the goal)
   ↓ the v2.0 work: typed-write's v2 columns · kernel-v2 · rsi · hard-deps · enforcement
9f9e9db  W1 — the six-layer store + the two defect kills (layer_id · derivation · freshness)
9ace9c1  W2 — the STAGE 0..6 machine + the three detectors
693c530  W3 — the RSI reflex layer with VERIFIED RETIREMENT
c287ab0  W3 — the enforcement kernel (TSG + Abide, two polarities)
f5d81be  the canon (this prep)
652d780  the create pin
   ↓ the checkpoint: 750009c (first save) → c329f83 (REFRESHED with the blueprint + §12)
```

## THE MODULE INVENTORY — PURPOSE + THE KEY EXPORTS

```
src/omp/typed-write.ts  1243 L  the store. EXPORTS: openTypedStore · applyTypedDdl ·
                                migrateLayerColumns · deriveConfidence · derivationOf ·
                                layerOf · layerFreshness · storeFreshness · insertForkNode ·
                                insertForkEdge
src/omp/kernel-v2.ts     390 L  the stage machine. EXPORTS: runKernelV2 · preflight ·
                                classifyByDetectors · dumbDetector · theatricalDetector ·
                                destructiveDetector · DEFAULT_DETECTORS · fileLayer
src/omp/rsi.ts           448 L  the reflex store. EXPORTS: RsiStore · deriveTier ·
                                DEFAULT_THRESHOLDS · DERIVATION_BASE
src/omp/hard-deps.ts     220 L  the register. EXPORTS: audit · requireUp · buildRegister ·
                                pathComponent · commandComponent · keyComponent ·
                                assertRegisterComplete · HardDependencyError
src/omp/enforcement.ts   270 L  the two-layer kernel. EXPORTS: runWorkLayer · runCloseLayer ·
                                bandOf · ACT_PROBABILITY · FLAG_PROBABILITY · Judge · LoadUnit
src/omp/jev.ts           149 L  the live client. EXPORTS: JevJudge · probeJev · resolveKey ·
                                TYPESAFE_URL · TYPESAFE_MODEL · JevError
src/omp/fire-gate.ts     370 L  THE v2.1 CORE. EXPORTS: FireGate · absorbContext · buildState ·
                                fireQuestion · mpsePreFilter · SEED_POLICY · STATE_BYTE_CAP
src/omp/calibration.ts   185 L  the derivation. EXPORTS: thresholdFromCost ·
                                precisionFromCounts · derivePolicy · checkCalibrationHealth ·
                                firesNeededForGap · DEFAULT_PROFILES
```

## THE FROZEN-MACHINERY LIST — WHAT IS LOCKED, WHY, AND HOW TO VERIFY

```
LOCKED                              WHY                              THE VERIFY
extensions/graph-intelligence/       the deployed artifact            sha256sum → 83eb7bba
  index.js  (613,039 B)
src/omp/graph-gate.ts:208            the v1.3 tier ladder (the        bun test -t st-gi-graph-gate
                                     shipped behaviour)               → 12/12
src/omp/graph-gate.ts:136            recordGraphQuery (the reset)     the drift tests
src/omp/gate-hook.ts:117             THE single call site             grep -c registerGraphGate = 1
src/omp/graph-gate.ts:247/:250/:254  the 3 PROPOSED v2 hooks          grep -c PROPOSED = 7
src/omp/populate.ts:21               the F-48 law (no 3rd substrate)  grep the comment
```

## THE PROOF-OF-STATE (what a fresh agent can re-run to confirm this doc)

```
bun test ./tests/ ./src/hydra/__tests__/   → 199 / 0 / 701 / 20 files
bunx tsc --noEmit -p tsconfig.json         → 191
sha256sum extensions/.../index.js          → 038c84c31569aebb...
grep -c FireGate src/omp/kernel-v2.ts      → 0        (the wiring is the build)
grep -c registerGraphGate src/omp/gate-hook.ts → 1    (the single call site holds)
```

**If any of those five disagree with this doc, THIS DOC IS STALE — trust the command.**

---

# ★ THE 6L+2E BUILD STATE (2026-09-22)

| item | value |
|---|---|
| HEAD | `f6fca91` |
| dist sha256_16 | **`038c84c31569aebb`** |
| dist size | 9,426,889 B (was 613,000 B) |
| dist-content gate | **PASS** (every v2.x symbol present) |
| src newer than dist | **0** |
| tsc | **exit 0 / 0 errors** (was 191) |
| battery | ** 336 pass  0 fail ** |
| the 6L+2E suite | 13 pass / 0 fail / 82 expect() |
| container proof | `gi-6l2e-ct` (omp-ct:master) — deploy sha MATCH, 5/5 scenarios |
| consumption | **consumed:2/8** (L5 corbell + L6 graphify) |
| the gate defect | **FIXED** (the reset fires on a resolved query) |
| the L2 probe defect | **FIXED** (a socket FILE is not a DAEMON; connect() is the proof) |

---

# ★ THE TRUE DIST (re-stamped 2026-09-23 after the zero-trust audit)

** sha256_16 `038c84c31569aebb`** (9,434,756 B).
★ THE AUDIT FOUND SHA DRIFT: this doc carried `a8583082…` / `038c84c31569aebb` (two rebuilds
stale). The dist was rebuilt after the 8 HIGH gate fixes; **this is the TRUE sha**.
Evidence: `sha256sum extensions/graph-intelligence/index.js` → `038c84c31569aebb`; `find src -newer` = 0;
the container deploy sha MATCHES.
