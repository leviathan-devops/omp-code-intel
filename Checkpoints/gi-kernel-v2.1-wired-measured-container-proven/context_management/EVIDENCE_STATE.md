# EVIDENCE_STATE — the verified evidence + the honest gaps

**The dist SHA (the deployment fingerprint): 83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709**

## THE DIST SHA CHAIN

```
deployed         83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709  613,039 B
v2.1 blueprint   242f52c556151449  (41,853 B, 862 L — the design of record)
the measurement  jev-fire-measurement.json  bestT=0.40  bestF1=0.933  health.ok=false
```

## THE BEHAVIORAL EVIDENCE (what the agent DID, mechanically observed)

```
★ THE HANDOFF ARTIFACT IS MISSING. `.trident/container-test-results.json` (the container-testing
  Phase F artifact) DOES NOT EXIST — the container battery was executed BY HAND via
  `docker exec stupefied_morse sh -lc 'cd /work/gi && bun test ...'`, so the tokens were
  observed in TERMINAL OUTPUT, not written to the handoff artifact. What follows is what was
  ACTUALLY OBSERVED, quoted, marked with its channel.
```

### THE CONTAINER RUN (channel: the docker exec terminal output, verbatim)

```
COMMAND   docker exec stupefied_morse sh -lc 'rm -rf /tmp/fx383; cd /work/gi && \
            /root/.bun/bin/bun test ./tests/ ./src/hydra/__tests__/'
OUTPUT    199 pass / 0 fail / 705 expect() calls / Ran 199 tests across 20 files. [1291.00ms]
CONDITION a CLEAN /tmp (the fx383 fixture removed) and NO ambient key env — the harshest
          available condition on this host.
VERDICT   PASS — and it found TWO defects the host battery had hidden:
          (1) the hydra batteries READ /tmp/fx383/graphify-out/graph.json and never created it;
          (2) the w7 suite's GO_KEYS depended on the AMBIENT env (an ESM-hoisting trap).
          Both fixed (ensureFx383() + a beforeEach re-pinning the env).
```

### THE LIVE JEV RUN (channel: the HTTP response + the kernel's own output, verbatim)

```
PROBE     {"model":"jev-1.13.0","answers":{"supported":{"type":"noul","noul":0.57}}}  [HTTP 200]
          ok=true model=jev-latest p=0.76 @790ms
KERNEL    E1 WORK (a real diff): SILENT — the live judge answered
          E2 CLOSE (a SUPPORTED claim): PASS p=0.980 spans=1
          E2 CLOSE (an UNBOUND claim): REJECT GI_FABRICATED_CLAIM spans=0
            (the model was NEVER CALLED — asserted with a call-spy)
```

### THE 14-CASE CALIBRATION (channel: the instrument's raw stdout)

```
real violations  n=7  mean P=0.581  min=0.490
false positives  n=7  mean P=0.253  max=0.530
SEPARABLE (min(real) > max(fp)): false      BEST F1=0.933 at t=0.40
   t=0.20 P=0.636 R=1.000 · t=0.40 P=0.875 R=1.000
   t=0.55 P=1.000 R=0.714 · t=0.70 P=1.000 R=0.000  ← STARVATION
★ THE SEEDS (0.90/0.75/0.85) fired the act band ZERO times. A gate that never fires is
  indistinguishable from a gate that works.
```

### THE MUTATION PROOF (channel: the battery run, before/after)

```
verifiable, from the paragon package: verifyHooks.compare neutered →
  st-gi-v2-kernel 6 pass / 2 FAIL; restored → 9 pass / 0 fail.
  (The paragon battery: 17 pass / 0 fail / 51 expect.)
★ F-51: a SOURCE-FILE mutation is not a valid mutation method on that package — two
  `signing.ts` module instances coexist in the test process (measured with a call counter
  reading a CONSTANT hits=7 while verifyRow printed varying verdicts).
```

## WHAT IS MECHANICALLY PROVEN vs MERELY CLAIMED

```
PROVEN   the battery 199/0 on the host AND in the container (clean /tmp, no keys)
PROVEN   tsc 191 == baseline (0 new)
PROVEN   the live Jev path (HTTP 200 + the kernel's verdicts)
PROVEN   the two defect kills on the LIVE store (confidence distinct=2, GI_LAYER_STALE fires)
PROVEN   EN-041 fixed (23,086 edges survive, was 0)
PROVEN   the RSI mutation bites (6/2 → 9/0)
CLAIMED  the v2.1 gate improves enforcement — UNMEASURED (0 call sites; 14 cases is not a curve)
CLAIMED  TSG as the load unit — BUILT, never driven by the kernel
CLAIMED  <5000 tokens per fire — the CAP is designed (18KB); M5 is UNMEASURED
```

## THE HONEST GAPS (named, never hidden)

```
1  THE PHASE F ARTIFACT IS MISSING — no .trident/container-test-results.json exists. The
   container evidence is terminal output. A fresh session re-running the CT tool would
   produce the artifact.
2  THE THRESHOLDS ARE UNCALIBRATED — 14 cases is a real measurement OF 14 CASES.
   checkCalibrationHealth returns ok=false; derivePolicy returns calibrated=false.
3  M2 (the cost matrix) IS UNANSWERED — the operator's; blocks W6.
4  M11 (the false negatives) IS UNMEASURED — the gate's silent class, visible only by
   sampling the IGNORE rows.
5  THE CONTAINER RB RE-RUN IS OPEN — the 5 PASS rows (v2.0) are HOST-run.
6  F-51's module-instance split: measured, not root-caused.
7  THE CANON DOCS are under the 200-line floor (this prep wrote them at whatever density the
   remaining budget allowed; the line counts are in the density gate's output).
```

## THE FILE:LINE ANCHORS (what each number came from)

```
src/omp/typed-write.ts:427   layerFreshness → the GI_LAYER_STALE evidence
src/omp/fire-gate.ts:196     mpsePreFilter → the $0 settlement
src/omp/fire-gate.ts:262     FireGate.judge → the band + the row
src/omp/calibration.ts:52    precisionFromCounts → the Wilson interval
src/omp/jev.ts:72            JevJudge.evaluate → the HTTP 200 probe
src/omp/rsi.ts:248           verify → the mutation's target
```

## THE PROVEN VS CLAIMED TABLE (expanded — every claim, its evidence, its verdict)

```
CLAIM                                     EVIDENCE                          VERDICT
battery 199/0 on the host                 bun test → the count              PROVEN
battery 199/0 in the container            docker exec → the count           PROVEN (terminal)
tsc 191 == baseline                       bunx tsc --noEmit                 PROVEN
the live Jev path works                   HTTP 200 + {"noul":0.57}          PROVEN
the kernel judges with the live model     E1 SILENT · E2 PASS p=0.980       PROVEN
zero spans ⇒ the model is never called    the call-spy: called=false        PROVEN
the two defect kills are LIVE             the store query + storeFreshness  PROVEN
EN-041 fixed                              the real corpus: 23,086 edges     PROVEN
the RSI mutation bites                    6 pass/2 FAIL → 9 pass/0 fail     PROVEN
the phantom sessionID is gone             6 resolver cases, 0 phantoms      PROVEN
the v2.1 gate improves enforcement        0 call sites                      UNVERIFIED
TSG as the load unit                      built, never driven               UNVERIFIED
<5000 tokens per fire                     the cap is designed; M5 unrun     UNVERIFIED
the 5 RB rows pass                        host-run xd:// tool results       PROVEN-CONTRACT
the container Phase F artifact exists     ★ IT DOES NOT                    FALSE-CLAIM-WITHDRAWN
```

## THE MEASUREMENT INSTRUMENTS (where each number came from)

```
the 14-case corpus       the paired-corpus instrument (7 real + 7 fp twins), fired through
                         the LIVE Jev endpoint, swept across thresholds
the Wilson intervals     calibration.ts:52 precisionFromCounts
the cost cuts            calibration.ts:38 thresholdFromCost
the fire floors          calibration.ts:106 firesNeededForGap
the live store numbers   the SQLite reads (readonly mode, never a write)
the container numbers    the docker exec terminal output
the battery numbers      bun test (re-run this turn)
the tsc number           bunx tsc --noEmit (re-run this turn)
★ EVERY number in this doc was measured. NONE is estimated. If a number here disagrees with
  a fresh run, THE DOC IS STALE — trust the command.
```

## THE CONTAINER EVIDENCE — THE FULL ACCOUNTING OF WHAT WAS AND WAS NOT CAPTURED

```
WHAT WAS DONE       the battery was staged to /work/gi in stupefied_morse (omp-ct:master)
                    and run with the container's bun, against a CLEAN /tmp and NO ambient
                    key env — the harshest available condition.
WHAT WAS OBSERVED   the first run: 136 pass / 9 fail / 3 errors (the hydra suites died on a
                    host-only /tmp/fx383 fixture and on absent zod/xstate).
                    an intermediate run: 198 pass / 1 fail (the ESM-hoisting GO_KEYS trap).
                    the final run: 199 pass / 0 fail / 705 expect / 20 files [1291ms].
WHAT WAS FIXED      (1) ensureFx383() — the idempotent fixture helper (with the host fixture
                    PHYSICALLY MOVED AWAY, the suites read 39/0 and the helper recreated it);
                    (2) a beforeEach re-pinning the key env + reloadGoKeys().
WHAT WAS **NOT** CAPTURED  ★ the Phase F artifact (.trident/container-test-results.json).
                    The container-testing skill's Phase F writes the per-scenario record
                    (passToken, failToken, the match, the byte offset, the tool-call-context
                    verification). NONE of that exists — the tokens are in the terminal
                    scrollback only.
★ THE CONSEQUENCE: a "container tested" claim for v2.1 CANNOT be artifact-backed until W8
  runs the rig. The v2.0 container evidence is TERMINAL, and is recorded as such.
```

## THE EVIDENCE LADDER (what each tier proves and what it does not)

```
L0  tsc --noEmit         proves: the types line up. does NOT prove: anything runs.
L1  unit                 proves: a pure function returns what was asserted. does NOT prove:
                         the real module behaves in the world.
L2  script test          proves: real modules, real stores, observation-channel assertions.
                         This is where the v2/v2.1 evidence lives (bun:test + real imports).
L3  container            proves: the code works in a FRESH environment with no leftovers.
                         ★ the only tier that catches a machine-dependent test.
L4  host-live            proves: the DEPLOYED artifact behaves under real tool calls.
                         ★ the only tier that catches a deployment/packaging gap.
★ THE v2.1 GATE has L0-L2 evidence and NOTHING ABOVE. W3/W4 (the wiring) will need L3+L4.
```

## THE PROMOTION-GATE MATHS (what the evidence must clear)

```
THE REFLEX TIERS (rsi.ts:103 deriveTier)
  GUARD     precision >= 0.90  AND  fires >= 10  AND  unresolvedRatio <= 0.20
  REFLEX    precision >= 0.70  AND  fires >= 3   AND  unresolvedRatio <= 0.50
  RETIRED   fires >= 20 with precision below the REFLEX floor
  HOLD      everything else — CAN NEVER PROMOTE
★ THE EVIDENCE FLOORS ARE THE POINT: precision computed on ONE firing is noise. The first
  W3 run promoted on a single lucky firing; the test caught it and both promoting tiers
  gained evidence floors.
★ THE 14-CASE CORPUS does not clear GUARD for any rule (fires < 10). The measured route to
  a guard is 50+ firings + the operator's cost matrix.

THE ACT THRESHOLD (calibration.ts:118 derivePolicy)
  act = max(costCut, est.low)   — the bar may not sit below what the rule has PROVEN
  flag = min(act/2, est.high)
★ A rule whose precision is not yet sufficient keeps the seed AND SAYS SO (calibrated=false
  + the basis string). That string is the evidence: read it, do not infer.
```
