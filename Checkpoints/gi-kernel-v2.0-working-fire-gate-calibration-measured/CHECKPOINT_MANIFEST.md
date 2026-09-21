
# CHECKPOINT_MANIFEST — gi-kernel-v2.0-working-fire-gate-calibration-measured

**Unique token:** `gi-kernel-v2.0-working-fire-gate-calibration-measured`
**Saved:** 2026-09-21
**State encoded:** WORKING FUNCTION — the v2.0 kernel runs, and the fire gate's
thresholds have had their FIRST REAL MEASUREMENT.
**Repo:** /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
**Baseline at session start:** c9bff81a56dc5bc5d5740623038d34507f6ab890

## THE STATE — VERIFIED THIS TURN

```
tsc              191 errors == the pre-session baseline, 0 NEW
battery (host)   199 pass / 0 fail / 701 expect / 20 files
battery (CONT)   199 pass / 0 fail / 705 expect / 20 files · clean /tmp, no ambient keys
the gate suite    12 pass / 0 fail / 30 expect
the paragon bat.  17 pass / 0 fail / 51 expect
the dist sha16   83eb7bba9c5e76db  (checkpoint == project)
the src .ts      94  (checkpoint == project)
live Jev probe   ok=true model=jev-latest p=0.76 @790ms
live RB rows     5 PASS / 0 FAIL (host-run; the container re-run is OPEN)
the measurement  14 labelled cases through the LIVE Jev API — see EN-047
```

## THE DELTA SINCE THE LAST CHECKPOINT (what this one adds)

```
src/omp/fire-gate.ts    370 L  NEW  the firing-time decision kernel
src/omp/calibration.ts  185 L  NEW  the derivation machinery (cost matrix + Wilson)
src/omp/jev.ts          149 L  NEW  the live Jev client (the real endpoint)
tests/st-gi-v2-wiring   4 tests NEW  the live-shape contract
tests/st-gi-store       + fx383-fixture.ts  the hermetic fixture helper
the skill  derive-runtime-measurements  (managed-skills, 224 L body)
THE FIRST CALIBRATION RUN + the 2x finding  EN-047
the container heritage  the 2 hermeticity bugs + their fixes  EN-046
```

## THE CONTENTS

```
src/                94 .ts   (MATCH the project)
dist/index.js       613,039 B  sha16 83eb7bba9c5e76db  (MATCH)
context_management/ 2 docs   (2 of the 11-doc canon — shortfall RECORDED)
the 6 ship docs: BUILD_REPORT 422L · DEBUG_LOG 521L · FAILURE_LOG 397L ·
                 SPEC_VIOLATION_LOG 70L · TESTING_LOG 548L · THEATRICALITY_LOG 360L
artifacts/gi-kernel-v2/            13 files (the v2 package + the SC-8 driver)
artifacts/paragon-runtime-encryption/ 9 files (the guarded-seam boilerplate)
artifacts/jev-kernel/               4 modules + the 14-case measurement JSON
artifacts/skills/derive-runtime-measurements/   the minted skill
artifacts/ct-v2/ + reports/ + scripts/
TOTAL 172 files / 3.4M
```

## THE SEAL — MODE B (no lock), DELIBERATE

A mutable working snapshot. Follow-up work is in flight (the v2.1 Jev-in-the-loop
blueprint, the 50+ firing calibration, the container RB re-run). The operator owns
the guardian layer and may re-save with MODE A for a frozen baseline.


## REFRESH — 2026-09-21 (the blueprint + §12 landed AFTER the first save)

The checkpoint was FIRST committed at 750009c, BEFORE the v2.1 blueprint existed.
A checkpoint that predates the artifact it is meant to carry is a stale baseline —
the same class as a doc that describes yesterday's build. REFRESHED with:

```
artifacts/gi-kernel-v2.1/GI_KERNEL_V2.1_MASTER_BLUEPRINT_v1.md   862 L
  sha256(16) 242f52c556151449 · 41,853 B · 14 sections · 25/25 components mapped
  · the W1-W9 build order with the operator's "both" as W3+W4 · the M1-M12 plan
artifacts/reports/GI_Kernel_V2_Engineering_Report_v1.md          1098 L
  §12 THE JEV FIRING-TIME KERNEL — preserved verbatim (774 → 1098, +324)
the 6 ship docs REFRESHED:
  BUILD_REPORT 467 L (★ CRITICAL: the calibration run) · DEBUG_LOG 521 L (EN-047)
  FAILURE_LOG 397 L (F-53) · SPEC_VIOLATION_LOG 74 L (V-01 VIOLATED-HIGH)
  TESTING_LOG 576 L (the instrument's raw run) · THEATRICALITY_LOG 387 L (T-11)
```

**THE LESSON (and it is the session's own lesson applied to itself):** a checkpoint
saved at the START of a work burst does not contain the burst. Save the checkpoint
AFTER the deliverable lands, or refresh it in the same turn — otherwise the baseline
certifies a state that no longer exists.

## THE HONEST GAPS

```
1  THE THRESHOLDS ARE UNCALIBRATED — 14 cases is a real measurement of 14 cases.
   checkCalibrationHealth reports ok=false for all three rules; derivePolicy
   returns calibrated=false with the basis "cost matrix only ... NO measured counts yet".
2  the container RB re-run is OPEN (the 5 PASS rows are HOST-run).
3  TSG is BUILT (cargo release, 54.50s) but not wired as a running LoadUnit.
4  Abide is source-only.
5  the oracle has never scored a real firing (deferred to v3 by the operator).
6  the canon docs are 2 of 11.
7  F-51's module-instance split is measured but not root-caused.
```

## THE NEXT WORK

```
1  the v2.1 Jev-in-the-loop master blueprint (/skill:master-blueprint)
2  50+ real firings → derivePolicy flips to calibrated=true on its own
3  the container RB re-run with tool-bound tokens
4  rule E1 (the oracle's engine) + the polarity
```
