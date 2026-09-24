# 06 — WAVE STRUCTURE

Decomposed into waves of DISJOINT-FILE work. Each wave: entry criteria → desks → exit
gate. No wave starts with its predecessor's gate unmet.

```
WAVES: 4 (of the pin's 10 — the pin's W1..W4 are the build; W5..W10 are the v3 horizon)
```

## WAVE 1 — THE STORE + THE LEDGERS

```
FILES      src/omp/typed-write.ts
           tests/st-gi-store.test.ts
ENTRY      the ripwire map of typed-write.ts (LAWS: map before edit)
DELIVERS   T-1  layer_id + derivation on typed_nodes/typed_edges
           T-1  migrateLayerColumns() — ALTER + backfill from the canonical prefix
           T-8  deriveConfidence() — predicate-aware derivation class
           SC-7 layerFreshness/storeFreshness — per-derivation TTL
EXIT GATE  bun test tests/st-gi-store.test.ts        → 11 pass / 0 fail
           full battery                                → 145 pass / 0 fail
           tsc                                         → 191 (baseline, 0 new)
           the LIVE store migrated: layer_id NULL = 0
VERDICT    CLOSED (commit 9f9e9db)
```

## WAVE 2 — THE GATE SKELETON + THE THREE DETECTORS

```
FILES      src/omp/kernel-v2.ts
           tests/st-gi-v2-gate.test.ts
ENTRY      the ripwire map of graph-gate.ts + the gateDecision caller check
           (blast radius: 2 callers, one live)
DELIVERS   T-3  STAGE 0..6 with STAGE 0 PREFLIGHT + GI_STACK_INCOMPLETE:<layer>
           T-4  dumb / theatrical / destructive on ONE Detector interface
           the class DERIVED from the firing detector, never caller-supplied
EXIT GATE  bun test tests/st-gi-v2-gate.test.ts      → 14 pass / 0 fail
           full battery                                → 159 pass / 0 fail
           SC-2 verbatim: code = "GI_STACK_INCOMPLETE:L4_C2KG"
VERDICT    CLOSED (commit 9ace9c1)
```

## WAVE 3 — THE ENFORCEMENT KERNEL + THE RSI SEAM

```
FILES      src/omp/rsi.ts · src/omp/hard-deps.ts · src/omp/enforcement.ts
           tests/st-gi-v2-kernel.test.ts · tests/st-gi-v2-deps.test.ts
           tests/st-gi-v2-enforce.test.ts
ENTRY      the ripwire map of populate.ts (the F-48 surface for SC-3)
DELIVERS   T-7  the reflex store: signed chained rows + VERIFIED RETIREMENT
           T-6  the hard-dependency register: no fallbacks, loud named codes
           T-5  TSG + Abide as one 2-layer machine with declared polarities
EXIT GATE  st-gi-v2-kernel  8 pass / 0 fail   (the mutation proof: 6/2 without verify)
           st-gi-v2-deps   11 pass / 0 fail
           st-gi-v2-enforce 16 pass / 0 fail
           full battery                        → 194 pass / 0 fail
VERDICT    CLOSED (commits 693c530 · 8fef436 · c287ab0)
           HONEST: T-5/T-6 are wired and dependency-gated; the ENGINES are not
           installed (no TypeSafe key, TSG unbuilt), so the LIVE end-to-end is OPEN.
```

## WAVE 4 — THE v3 BLUEPRINT + THE PACKAGE SEAL

```
FILES      packages/gi-kernel-v2/**   (00-MISSION .. 07-GOALS + INDEX + the DPL1)
           reports/**                 (the engineering report + the audit)
ENTRY      W1..W3 gates all met; the v2 surface measured for the compat map
DELIVERS   T-9  FORWARD_COMPAT_v2_TO_v3.md — 11 seams, the precedent, the residual
           T-10 the package: every doc at its floor + 00-INDEX + the audit
           SC-9 PACKAGE_AUDIT PASS with a fresh-agent-can-build test
EXIT GATE  PACKAGE_AUDIT verdict = PASS
           every package doc ≥ its floor
           the fresh-agent read test (a reader builds v3 from the package alone)
VERDICT    ← THIS WAVE
```

## THE HOST-LIVE WAVE (the pin's CONTAINER TESTING block)

```
FILES      .trident/ct-v2/cycle-<N>/   (evidence, not source)
ENTRY      W4's package built
DELIVERS   RB-IDENT · RB-TOOLS · RB-FIREWALL · RB-LIFECYCLE · RB-INTEGRATION ·
           RB-ERRORS · RB-CONFIG — each with a tool-bound passToken/failToken
EXIT GATE  every RB row's token present in a TOOL RESULT, never in prose
STATUS     OPEN — see the blocker note below
```

## THE BLOCKER, STATED PLAINLY

```
RB-FIREWALL / RB-LIFECYCLE run against the RSI store — those CAN run today.
RB-IDENT / RB-TOOLS need the GI extension loaded in a live omp session.
RB-INTEGRATION / RB-ERRORS / RB-CONFIG need the kernel wired into the gate path.
ALL of the Jev-backed rows need TYPESAFE_AI_API_KEY, which is ABSENT on this host.

⇒ the unit layer is DONE and green; the live layer is BLOCKED on a key + engine
  install. A blocked row is reported BLOCKED, never marked passed.
```
