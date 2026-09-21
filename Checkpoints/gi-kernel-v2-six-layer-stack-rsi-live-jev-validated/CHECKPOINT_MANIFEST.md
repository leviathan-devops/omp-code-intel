# CHECKPOINT_MANIFEST — gi-kernel-v2-six-layer-stack-rsi-live-jev-validated

**Unique token:** `gi-kernel-v2-six-layer-stack-rsi-live-jev-validated` (hyphens only, no spaces)
**Saved:** 2026-09-21
**Repo:** /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
**Branch @ commit:** jarvis/gi-main @ HEAD (this checkpoint's own commit follows)
**Baseline at session start:** c9bff81a56dc5bc5d5740623038d34507f6ab890

## THE STATE — VERIFIED THIS SESSION

```
┌────────────────────────────┬──────────────────────────────────────────────┐
│ metric                     │ measured                                     │
├────────────────────────────┼──────────────────────────────────────────────┤
│ the full battery           │ 199 pass / 0 fail / 701 expect / 20 files    │
│ the v1.3 gate suite        │ 12 pass / 0 fail / 30 expect                 │
│ the v2 suites              │ 65 tests across 6 files                      │
│ the paragon battery        │ 17 pass / 0 fail / 51 expect                 │
│ typecheck                  │ 191 errors == the pre-session baseline, 0 NEW│
│ the dist sha16             │ 83eb7bba9c5e76db  (checkpoint == project)    │
│ the src .ts count          │ 91  (checkpoint == project)                  │
│ the SC-8 driver            │ SC8-EXEC-OK · engines AGREE on both cases    │
│ the live Jev probe         │ ok=true model=jev-latest p=0.76 @790ms       │
│ the live RB rows           │ RB-IDENT · RB-TOOLS · RB-FIREWALL ·          │
│                            │ RB-LIFECYCLE · RB-CONFIG = 5 PASS / 0 FAIL   │
│ the RB wiring contract     │ 4 pass (GI_STACK_INCOMPLETE as a THROWN      │
│                            │ error through a registered tool_call handler)│
└────────────────────────────┴──────────────────────────────────────────────┘
```

## THE DEFECTS FIXED IN THIS SESSION (all measured)

```
B1   confidence = 1.0 on 2714/2714 edges      -> DERIVED from the PREDICATE;
     live distinct = 2 (0.99 x 2173 observed, 0.72 x 904 inferred)
B3   a 2-day-old graph read as fresh           -> GI_LAYER_STALE:explicit, ageMs 128,234,269
EN-041 EVERY edge dropped as lineless (24,757) -> TWO field-name mismatches against the real
     schema: (a) source_location never handed to the resolver; (b) the TYPE says src/dst
     while the JSON emits source/target. Now 9,797/9,814 nodes lined + 23,086 edges survive
ISSUE 9 the old baseline store still showed 1  -> re-populated; live distinct = 2
F-50   a malformed sig CRASHED the verifier     -> length-check before the compare
F-51   T8's mutation proof did not bite         -> T8 now re-runs T2's assertion UNDER the
     mutation and expects it to throw
SESSION-ID every session shared one drift bucket -> resolveSessionId: ctx -> GI_SESSION_ID ->
     the SCOPE ROOT. Zero phantom "default" across 6 cases
SC-8   the two engines were fed different evidence -> ONE evidence source + an agreement
     assertion that immediately caught the fixture drift
R-1    the migration broke applyTypedDdl        -> the skip is REPORTED, never thrown
```

## THE CONTENTS (measured file counts)

```
src/                     91 .ts files   (the FULL source tree — matches the project)
dist/index.js            613,039 B      sha16 83eb7bba9c5e76db (== the project dist)
context_management/       2 docs        (RUNNING_BUILD_LOG + RUNNING_DEBUG_LOG)
BUILD_REPORT.md          422 L
DEBUG_LOG.md             349 L
FAILURE_LOG.md           319 L
SPEC_VIOLATION_LOG.md     70 L
TESTING_LOG.md           528 L
GI_KERNEL_V2_DPL1_SPEC.md               (the authority spec, 404 L)
artifacts/gi-kernel-v2/               13 files (the v2 package: 11 docs + drivers)
artifacts/paragon-runtime-encryption/  9 files (the extracted boilerplate)
artifacts/ct-v2/                       5 files (the RB evidence)
artifacts/reports/                    31 files (the engineering reports)
```

## THE SEAL — MODE B (NO LOCK), DELIBERATE

Per the operator's ruling that a manifest-only immutable lock is meaningless (the
manifest attests a state that src/dist can drift underneath), and that the choice is
"either recursively applied to every file or not there at all": this checkpoint uses
**MODE B — a mutable working snapshot, documented as such**. NO `chattr +i` was applied.
Reason: this checkpoint receives the follow-up work already in flight (the oracle's
engine, the engine installs), and a full-tree lock would have to be lifted for each.
The operator owns the guardian layer and may re-save with MODE A if a frozen baseline is
wanted.

## THE HONEST GAPS (what is NOT verified)

```
1  THE LIVE JEV PATH IS NOW REAL, BUT the ORACLE has still never scored a real firing.
   The RSI tier ladder is exercised on synthetic + driver ledgers only.
2  TSG IS BUILT (`cargo build --release --example tsg` -> Finished in 54.50s, EXIT=0)
   and the binary exists at target/release/examples/tsg — but it is NOT yet wired into
   the LoadUnit seam as a running process. Its 2,000+ line Rust engine is compiled,
   not driven by the kernel.
3  ABIDE IS SOURCE-ONLY. The two-layer kernel is implemented natively; the Abide
   package is not installed.
4  THE CANON DOCS ARE 2 OF 11. Only RUNNING_BUILD_LOG + RUNNING_DEBUG_LOG exist in
   context_management/; the other nine (CURRENT_STATE, BUILD_STATE, EVIDENCE_STATE,
   CHANGELOG, DECISION_CHAIN, NEXT_STEPS, TASK_QUEUE, POST-COMPACTION_PROMPT,
   COMPACTION_SURVIVAL) are ABSENT. Recorded, not papered.
5  THE RB ROWS 6-7 (INTEGRATION, ERRORS): their CONTRACT is now tested (4 pass, the
   token arrives as a thrown error through a registered handler), but the DEPLOYED
   extension still does not register the v2 kernel — so no live session yet carries
   the token. A contract test is not a live row.
6  THE TIER THRESHOLDS (0.90 / 10 fires / 0.20) and the 0.8/0.5 bands are UNCALIBRATED.
7  F-51'S UNDERLYING PUZZLE IS PARTIALLY OPEN: T8's fix is real and battery-green, but
   the source-level gutting experiment produced CONTRADICTORY readings (a standalone
   probe saw the gutter take effect; the battery's verifyRow reported cmp=false with
   the same gutter in the file). The cause was not isolated before the budget ran out.
   Documented as OPEN, not guessed.
```

## THE NEXT WORK (for a resuming agent)

```
1  Install the engines: build/point TSG at the LoadUnit seam; wire the Abide package.
2  Register the v2 kernel in the extension beside registerGraphGate (ONE new listener),
   then run RB-INTEGRATION/RB-ERRORS as LIVE rows.
3  Calibrate the tier thresholds from real firings.
4  Rule E1 (the oracle's engine) and the polarity question.
5  Write the nine missing canon docs.
```
