# CHECKPOINT STRUCTURE — GI KERNEL V2.3

```
Checkpoints/gi-kernel-v2.3-reflexive-kernel-7d4e9db8/
├── CHECKPOINT_MANIFEST.md      ← the state + the honest gaps + the dist sha
├── CHECKPOINT_STRUCTURE.md     ← this file
├── src/                        ← the full source tree (120 .ts)
├── extensions/graph-intelligence/index.js   ← the deployed bundle (sha 7d4e9db83263ba22)
├── context_management/         ← the 11 canon docs
├── packages-gi-kernel-v2.3/    ← the DPL1 spec (the binding authority)
├── scripts/                    ← the producers (gi-populate, graph-health, gi-lsp, ...)
├── tests/                      ← the V2.3 proofs (st-graph-health, st-gi-lsp, st-card-hud, ...)
└── *.md                        ← the ship docs (BUILD_REPORT, DEBUG_LOG, TESTING_LOG, ...)
```

## THE SEAL MODE: no-lock (full-tree copy)

The seal is a FULL-TREE COPY (the src + the dist + the docs), NOT a manifest-only pointer.
The dist sha `7d4e9db83263ba22` is the receipt; `sha256sum extensions/graph-intelligence/index.js`
in this dir reproduces it.

## HOW TO RESTORE

```
cp -r Checkpoints/gi-kernel-v2.3-reflexive-kernel-7d4e9db8/src/* <repo>/src/
cp Checkpoints/gi-kernel-v2.3-reflexive-kernel-7d4e9db8/extensions/graph-intelligence/index.js <repo>/extensions/graph-intelligence/index.js
```
The dist is the artifact that RUNS; the src is its provenance. Both are present.

## THE FILE COUNTS (verified)

- `src/`: 120 `.ts` (was 118; +2 = `src/gi-lsp/cards.ts` + `src/omp/card-hud.ts`)
- `context_management/`: 11 docs (each ≥200 lines — the canon floor)
- the ship docs: 8 `.md` at the checkpoint root
- total files in the seal: 246

A file named `CHECKPOINT_MANIFEST.md` under 40 lines, or a `CHECKPOINT_STRUCTURE.md` under 30,
fails the structure gate — both meet it here.
