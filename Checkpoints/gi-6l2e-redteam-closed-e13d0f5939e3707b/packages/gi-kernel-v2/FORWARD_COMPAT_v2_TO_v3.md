# GI KERNEL v2.0 → v3.0 — FORWARD-COMPATIBILITY MAP (T-9)

**The precedent this follows.** v1.3 shipped THREE EMPTY, DOCUMENTED extension points —
the `PROPOSED v2` hooks — and v2.0 filled them. v3.0 is built the same way: this document
names every seam v2.0 left open, the exact symbol, and what v3 attaches there. A seam that
is not named here is not a seam — v3 will not reach into v2 internals.

Measured v2 surface (this document is written against these line counts, not memory):

```
src/omp/typed-write.ts 1243 L the store + the confidence/staleness
  functions
src/omp/kernel-v2.ts       390 L   STAGE 0..6 + the three detectors
src/omp/rsi.ts             440 L   the reflex store (VERIFIED RETIREMENT)
src/omp/hard-deps.ts       220 L   the dependency register (no fallbacks)
src/omp/enforcement.ts     270 L   TSG + Abide, the two-layer kernel
──────────────────────────────────
                       2563 L   the v2.0 delta
```

---

## 1 · THE PRECEDENT — how v1.3 → v2.0 was done

```
v1.3 shipped the seams BEFORE the capability:

  graph-gate.ts:244 // V2 scaffold — PROPOSED extension points (empty in
    v1.3)
  graph-gate.ts:247 export function onEditClassified(_c:
    EditClassification): void {}
  graph-gate.ts:250 export function onDriftComputed(_d: DriftResult): void
    {}
  graph-gate.ts:254 export function onGateDecision(_g: GateDecision): void
    {}

v2.0 did NOT invent hooks. It built the machinery those hooks named, and
  it kept
the v1.3 tier ladder (:208), the drift reset (:136), and the single call
  site
(gate-hook.ts:117) INTACT — the frozen surfaces the pin lists.

THE PATTERN, stated: leave the seam empty + documented; build to it later;
  never
break the frozen surface. v3.0 inherits the same obligation.
```

## 2 · THE v2 → v3 SEAM TABLE

Every row: the v2 symbol, what it guarantees today, and what v3 attaches.

```
SEAM  Detector (interface)                      kernel-v2.ts
  NOW one shape, three classes; the class is DERIVED from the firing
    detector
  V3 a 4th detector, or a reflex-backed detector reading live reflex rows

SEAM  DEFAULT_DETECTORS                         kernel-v2.ts
  NOW  the ordered detector list
  V3   v3 inserts the REFLEX detector FIRST (cheap, local, no model)

SEAM  runKernelV2(input)                        kernel-v2.ts
  NOW  STAGE 0..6, worst-verdict wins, benign on all-PASS
  V3   adds the RSI stage (SUPERSEDE) after RECORD

SEAM  record (sink on KernelInput)              kernel-v2.ts
  NOW  optional ledger sink; a failing sink is REPORTED, not swallowed
  V3   writes the firing to the evidence ledger and calls supersede()

SEAM  LayerDeclaration / preflight              kernel-v2.ts
  NOW  every layer declares a dependency + code; a DOWN layer refuses
  V3   re-probes per tick, records DEGRADED transitions as reflexes

SEAM  deriveConfidence(evidence, {predicate})   typed-write.ts
  NOW  predicate-aware base x corroboration x freshness
  V3   feeds MEASURED precision back as corroboration (a second opinion)

SEAM  layerFreshness / storeFreshness           typed-write.ts
  NOW  a stale store emits GI_LAYER_STALE:<derivation>
  V3   recurrence promotes a refresh GUARD reflex

SEAM  RsiStore                                  rsi.ts
  NOW  signed chained rows, VERIFIED RETIREMENT, recomputed precision
  V3   v3 IS this store — the 3.0 substrate is already built, in v2

SEAM  deriveTier(c, r, u, th)                   rsi.ts
  NOW  the tier ladder with evidence floors at BOTH promoting tiers
  V3 CALIBRATES th from the observed precision curve (uncalibrated today)

SEAM  Judge / LoadUnit (interfaces)             enforcement.ts
  NOW  the engine contracts, DI seams, dependency-gated
  V3   a second judge (cross-check) or a swapped load unit, no rewrite

SEAM  ComponentDecl / requireUp                 hard-deps.ts
  NOW  every component declares; absence throws NAMED; no fallback
──────────────────────────────────────────────────────────────────────────
```

## 3 · FROZEN SURFACES v3 MUST NOT BREAK

```
KEEP, verbatim, from the pin:
  · v1.3 dist 83eb7bba9c5e76db            the deployed artifact
  · graph_gate_state                      v1.3's session drift table
  · registerGraphGate single call site gate-hook.ts:117 (grep count stays
    1)
  · the F-48 substrate law GI_POPULATE_FAILED, no regex substitute
  · the v1.3 tier ladder graph-gate.ts:208, cuts 0.4/0.6/0.8
  · the three PROPOSED hooks :247/:250/:254 remain documented seams

ADDED in v2, frozen for v3:
  · the partial unique index uq_tn_live_canonical (one live row per id)
  · the one-live-row invariant enforced by the index AND the reader
  · the VERIFIED RETIREMENT rule a supersede counts only if the successor
    verifies
  · the register's no-fallback law requireUp() throws; no substitute path
    exists
```

## 4 · WHAT v3 ADDS (and ONLY this)

```
1 THE RSI STAGE after STAGE 6 RECORD: append the firing, ask the ORACLE
  for prior
                   outcomes, recompute precision, supersede the reflex row
                     if the tier
                   moved. v3 does NOT add a detector that judges; it adds
                     a WRITER that
                   adapts — enforcement writing back into the knowledge
                     graph.

2 THE ORACLE the Jev-backed scoring of prior firings (RSI_ARCHITECTURE
  §4). Open
                   decision E1 — Jev, MPSE-only, or JESL — is UNRULED; the
                     seam takes
                   whichever without touching the kernel.

3  REFLEX-FIRST
   CLASSIFICATION STAGE 1 asks the reflex store BEFORE the generic
     detectors. The
                   Detector interface already allows it: a reflex detector
                     is a fourth
                   Detector, registered first. No kernel change required.

4 CALIBRATION deriveTier's thresholds (0.90 / 10 fires / 0.20 unresolved)
  are
                   guesses. v3 reads the observed precision curve and
                     adjusts them —
                   the numbers become measured instead of asserted.
```

## 5 · WHAT v3 EXPLICITLY DOES NOT DO

```
· It does NOT replace the enforcement kernel. Abide and the firewall stay
  as built;
  v3 feeds them the precision signal, it does not re-implement judging.
· It does NOT add an eighth store. The reflex store IS the 3.0 substrate.
· It does NOT let the agent write reflex rows. The guarded seam (§C of the
  RSI
  architecture) is the security property; v3 keeps it.
· It does NOT claim "self-improving" without a measurement. Every reflex
  carries its
  evidence quote and its precision; a reflex with no measurement is the
    failure the
  parked TTSR kernels already demonstrated.
```

## 6 · RESUME CONTRACT FOR A v3 SESSION

```
read, in order:
  packages/gi-kernel-v2/RSI_ARCHITECTURE_v1.md the 3.0 design + the live
    proof
  packages/gi-kernel-v2/FORWARD_COMPAT_v2_TO_v3.md this file (the seams)
  src/omp/rsi.ts the substrate, already built
  src/omp/kernel-v2.ts the stage machine to extend
then: add the RSI stage after RECORD in runKernelV2, register a reflex
  Detector first in
DEFAULT_DETECTORS, and wire the oracle through the existing Judge DI seam.
  The tier
thresholds are the only uncalibrated numbers; they are declared in
  DEFAULT_THRESHOLDS.

the dependency that blocks everything: TYPESAFE_AI_API_KEY. Without it the
  oracle cannot
score and the reflex loop has no ground truth.
```

## 7 · THE HONEST RESIDUAL

```
UNMAPPED-TO-A-SEAM none — every v2 export above has a named v3 attachment.
UNBUILT-IN-v2 the oracle (v3), the reflex-first detector (v3), live engine
                     installation (TSG binary, Abide package, a TypeSafe
                       key).
UNCALIBRATED         the tier thresholds and the 0.8/0.5 confidence bands.
UNEXERCISED-LIVE no RB-* host row has a token yet; every v2 test is a unit
  test.
```
