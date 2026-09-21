# CHECKPOINT_STRUCTURE — gi-kernel-v2.0-working-fire-gate-calibration-measured

```
Checkpoints/gi-kernel-v2.0-working-fire-gate-calibration-measured/
├── src/                    94 .ts   THE FULL SOURCE TREE (MATCH)
│   ├── omp/                typed-write · kernel-v2 · rsi · hard-deps ·
│   │                       enforcement · jev · fire-gate · calibration
│   ├── hunter/             the graph adapters + keys
│   ├── scoping/            the session/scope identity
│   └── hydra/              the wave machinery + the hermetic fixture helper
├── dist/index.js           613,039 B   sha16 83eb7bba9c5e76db (MATCH)
├── context_management/     2 docs      (the canon shortfall, recorded)
├── BUILD_REPORT.md         422 L
├── DEBUG_LOG.md            521 L       EN-001..EN-047
├── FAILURE_LOG.md          397 L       F-001..F-53
├── SPEC_VIOLATION_LOG.md    70 L
├── TESTING_LOG.md          548 L       the plan zone + the results zone
├── THEATRICALITY_LOG.md    360 L       T-01..T-10 + the root pattern
├── artifacts/
│   ├── gi-kernel-v2/               the v2 package (11 docs + drivers)
│   ├── paragon-runtime-encryption/ the guarded-seam boilerplate
│   ├── jev-kernel/                 fire-gate · calibration · jev · enforcement
│   │                               + measurement-14-case.json
│   ├── skills/                     derive-runtime-measurements (the minted skill)
│   ├── ct-v2/                      the RB host-live evidence
│   └── reports/ + scripts/
├── CHECKPOINT_MANIFEST.md
└── CHECKPOINT_STRUCTURE.md
```

## THE COUNTS

```
total files  172       src .ts  94 (MATCH)      dist 1 (sha MATCH)
ship docs    6         artifacts 81             metadata 2
context docs 2 of 11   (RECORDED shortfall)
```

## THE GATES

```
path has no spaces     PASS (hyphens + dots only)
src MATCH              PASS 94/94
dist sha MATCH         PASS 83eb7bba9c5e76db
the 6 ship docs        PASS all present
spec + artifacts       PASS 81 files
manifest               PASS (this file + the structure doc)
secrets                0 hits (the Jev key lives OUTSIDE the repo, mode 0600)
the seal               MODE B (no lock, documented)
```

## THE HONEST GAPS

```
1 the thresholds are UNCALIBRATED (14 cases; the health gate says ok=false)
2 the container RB re-run is OPEN
3 TSG built but not wired · Abide source-only · the oracle unmeasured
4 the canon docs are 2 of 11
5 F-51's module-instance split measured, not root-caused
```
