# CHECKPOINT_STRUCTURE — gi-kernel-v2-six-layer-stack-rsi-live-jev-validated

The complete structure listing, the file counts, the state, and the gaps.

## THE TREE

```
Checkpoints/gi-kernel-v2-six-layer-stack-rsi-live-jev-validated/
├── src/                          91 .ts   THE FULL SOURCE TREE
│   ├── omp/                      the kernel: typed-write · kernel-v2 · rsi ·
│   │                             hard-deps · enforcement · jev
│   ├── hunter/                   the graph adapters (graphify/corbell) + shared
│   ├── scoping/                  the session/scope identity + store guards
│   └── hydra/                    the wave machinery
├── dist/
│   └── index.js                  613,039 B   sha16 83eb7bba9c5e76db
├── context_management/           2 docs      (the canon shortfall is a recorded gap)
├── BUILD_REPORT.md              422 L        ship doc 1/5
├── DEBUG_LOG.md                 349 L        ship doc 2/5
├── FAILURE_LOG.md               319 L        ship doc 3/5
├── SPEC_VIOLATION_LOG.md         70 L        ship doc 4/5
├── TESTING_LOG.md               528 L        ship doc 5/5
├── GI_KERNEL_V2_DPL1_SPEC.md                 the authority spec (404 L)
├── artifacts/
│   ├── gi-kernel-v2/             13 files   the v2 package + the SC-8 driver
│   ├── paragon-runtime-encryption/ 9 files  the extracted guarded-seam boilerplate
│   ├── ct-v2/                     5 files   the RB host-live evidence
│   └── reports/                  31 files   the engineering reports
├── CHECKPOINT_MANIFEST.md                    the state, the SHAs, the gaps
└── CHECKPOINT_STRUCTURE.md                   this file
```

## THE FILE COUNTS (measured)

```
total files          158
src .ts               91   (project: 91 — MATCH)
dist                  1    (sha == project — MATCH)
ship docs             5    (all present)
context docs          2    (canon floor 11 — SHORTFALL, recorded)
artifacts            58    (packages + evidence + reports)
metadata              2    (this file + the manifest)
```

## THE STATE

```
battery      199 pass / 0 fail / 701 expect / 20 files
gate suite    12 pass / 0 fail / 30 expect
paragon       17 pass / 0 fail / 51 expect
tsc          191 errors == baseline, 0 new
dist         83eb7bba9c5e76db  (checkpoint == project)
live Jev     ok=true model=jev-latest p=0.76 @790ms
live RB      5 PASS / 0 FAIL
```

## THE SEAL — MODE B

No lock. A mutable working snapshot, documented. The operator's ruling: a manifest-only
lock is meaningless; the choice is full-tree or none. Follow-up work is in flight, so a
full-tree lock would be lifted immediately. Re-save with MODE A for a frozen baseline.

## THE HONEST GAPS

```
1  the oracle never scored a real firing
2  TSG is BUILT but not yet wired as a running LoadUnit
3  Abide is source-only
4  the canon docs are 2 of 11
5  RB rows 6-7: the CONTRACT is tested; no LIVE row yet (the deployed extension does
   not register the v2 kernel)
6  the tier thresholds + bands are uncalibrated
7  F-51's underlying puzzle is partially open (contradictory gutting readings)
```
