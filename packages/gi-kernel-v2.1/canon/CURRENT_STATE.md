# CURRENT_STATE — GI Kernel v2.1

**Seeded at the v2.1 package mint (2026-09-21). Growth per milestone is legal; stamp when done.**
**Floor for a completed doc: 200 lines. This is the milestone SEED — the floor is reached by
growth, and the shortfall is RECORDED rather than padded.**

## THE ARCHITECTURE AS IT EXISTS

```
src/omp/typed-write.ts 1243 L the store (layer_id · derivation ·
  confidence · freshness)
src/omp/kernel-v2.ts 390 L STAGE 0..6 + the three detectors ← W3/W4 MODIFY
  THIS
src/omp/rsi.ts            448 L  the reflex store + VERIFIED RETIREMENT
src/omp/hard-deps.ts      220 L  the dependency register (no fallbacks)
src/omp/enforcement.ts    270 L  TSG + Abide, the two-layer kernel
src/omp/jev.ts            149 L  the live Jev client
src/omp/fire-gate.ts      370 L  the firing-time kernel  ← BUILT, UNWIRED
src/omp/calibration.ts    185 L  the derivation machinery  ← BUILT
```

## PER-MODULE STATUS

```
typed-write DONE + LIVE the live store migrated (1266 nodes, layer_id
  NULL=0)
kernel-v2 DONE the detectors + the stage machine; the gate NOT wired
rsi DONE signed chained rows; VERIFIED RETIREMENT proven by attack
hard-deps     DONE          the register; the live audit up=5/11
enforcement   DONE          TSG+Abide seams; the engines not installed
jev           DONE + LIVE   the real endpoint proven at p=0.76 @790ms
fire-gate     BUILT         UNWIRED — grep -c "FireGate" kernel-v2.ts = 0
calibration   BUILT         14 cases measured; health.ok=false
```

## THE FROZEN SURFACES

```
· the v1.3 dist 83eb7bba9c5e76db · the graph_gate_state table ·
  registerGraphGate single call site (gate-hook.ts:117) · the F-48
    substrate law ·
  the v1.3 tier ladder (graph-gate.ts:208) · the 3 PROPOSED hooks
    :247/:250/:254
```
