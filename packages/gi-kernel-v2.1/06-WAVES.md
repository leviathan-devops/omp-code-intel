# 06 — WAVE STRUCTURE

Disjoint-file work; each wave's gate precedes the next wave's start. The blueprint's
§10 order, made concrete with owners and exit gates.

## W1 — THE LEDGER

```
FILES      src/omp/fire-gate.ts (the writer) · src/omp/fire-ledger.ts (NEW, the table)
ENTRY      the blueprint read; the fire_decisions schema agreed (§8.2)
DELIVERS   the table + the append; laterTruth defaults to "unresolved"; indices on
           (rule_id, later_truth) and (state_hash)
EXIT GATE  bun test tests/st-gi-v2.1-firegate.test.ts -t T9 (every fire leaves a row)
           + a live row query showing laterTruth='unresolved'
DEPENDS    nothing
```

## W2 — THE ORACLE

```
FILES      src/omp/oracle.ts (NEW)
ENTRY      W1 green (the rows exist to resolve)
DELIVERS   resolve(row) → reads the downstream evidence (a later edit to the target, a
           test run, a withdrawal, a downstream permit) → writes confirmed|refuted|
           unresolved. Starts with the MPSE-decidable outcomes only.
EXIT GATE  one real firing resolved end-to-end; a row's laterTruth changed from
           'unresolved' with the evidence recorded
DEPENDS    W1
```

## W3 — POSITION A: THE PRE-ACT ADVISORY (the operator's "both", first half)

```
FILES      src/omp/fire-gate.ts (the intent path) · src/omp/kernel-v2.ts (MODIFIED)
ENTRY      W2 green
DELIVERS   a Fire built from INTENT, judged BEFORE the act, fail-OPEN
EXIT GATE  an advisory fires on an intended blind edit; a legitimate intent passes;
           the battery 199/0 + tsc at baseline
DEPENDS    W2
★ WHY FIRST: fail-open cannot break anything, so the live path is exercised while the
  filter is still being built.
```

## W4 — POSITION B: THE POST-DETECTOR FILTER (the second half)

```
FILES      src/omp/kernel-v2.ts (MODIFIED, the gate on each VIOLATION)
ENTRY      W3 green
DELIVERS   the gate between the detector's VIOLATION and the v2.0 verdict
EXIT GATE  grep -c "FireGate" src/omp/kernel-v2.ts > 0 (the anti-pattern ledger's
           CLASS 3 detection) + a real violation adjudicated FIRE + a false positive
           IGNORED
DEPENDS    W3
★ THE WIRING-ORDER LAW: engines before registration. With L1..L5 ENOENT and JEV
  absent, STAGE 0 refuses every act.
```

## W5 — THE POLICY STORE

```
FILES      src/omp/policy-store.ts (NEW) · packages/gi-kernel-v2.1/policies/*.json
ENTRY      W4 green
DELIVERS   versioned JSON recipes (D026: data, not code); a policy edit reloads
           without a rebuild and changes the cache key
EXIT GATE  an edited policy JSON changes the band on the same stored probability
           (the reroute path, no re-inference)
DEPENDS    W4
```

## W6 — THE CALIBRATION LOOP

```
FILES      src/omp/calibration.ts (the loop) · the live path
ENTRY      W5 green + ★ M2 ANSWERED (the operator's cost matrix)
DELIVERS   50+ real firings → the oracle resolves → derivePolicy flips calibrated=true
EXIT GATE  checkCalibrationHealth returns ok=true with zero findings; the derived act
           bars are printed beside the seeds
DEPENDS    W5 + M2
★ BLOCKER: M2. Every derived threshold waits on the cost matrix.
```

## W7 — THE MEASUREMENT SWEEP

```
FILES      MEASUREMENT_PLAN.md (filled) · the instruments
ENTRY      W6 green
DELIVERS   M1-M12, every row a number; M11 needs a human sampling session
EXIT GATE  zero TBD rows in MEASUREMENT_PLAN.md
DEPENDS    W6
```

## W8 — THE CONTAINER

```
FILES      .trident/ct-v2.1/cycle-1/
ENTRY      W7 green
DELIVERS   the whole loop in omp-ct:master: the battery + one live adjudicated fire
EXIT GATE  199+ pass / 0 fail in the container + the 7 RB angles with tool-result
           tokens
DEPENDS    W7
```

## W9 — THE SEAL

```
FILES      packages/gi-kernel-v2.1/** + SHIP_PACKAGES/
ENTRY      W8 green
DELIVERS   the v2.1 package + PACKAGE_AUDIT PASS + the checkpoint refresh
EXIT GATE  PACKAGE_AUDIT PASS; every doc at floor; a fresh agent can build from the
           package alone
DEPENDS    W8
```
