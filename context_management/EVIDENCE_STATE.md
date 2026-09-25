# EVIDENCE_STATE — the verified evidence + the honest gaps

**The dist SHA (the deployment fingerprint): 7c55979449d9c97e766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f**

## THE DIST SHA CHAIN

```
deployed         7c55979449d9c97e766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f  613,039 B
v2.1 blueprint   7c55979449d9c97e766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f  (41,853 B, 862 L — the design of record)
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

---

# ★ THE 6L+2E EVIDENCE (per gate, all this-session tool results)

| gate | the artifact | the verdict |
|---|---|---|
| **W0** | `bunx tsc --noEmit` → exit 0; `bun test` → 336 pass / 0 fail / 1186 expect() | GREEN |
| **A-0** | `sqlite3 <corbell> "SELECT COUNT(*) ... superseded_run IS NULL"` → 5445 live / 63 oracle.ts / 0 Checkpoints | GREEN |
| **A-0 (graphify)** | the rebuild dropped 9165 out-of-scope rows → 1424 live / 0 Checkpoints | GREEN |
| **B/C/D** | `bunx tsc --noEmit` exit 0 with the 8 adapters + the registry + the wiring | GREEN |
| **D-2 (the dist)** | the dist-content gate: 8/8 symbols present, 613 KB → 9.42 MB | GREEN |
| **E-1** | `bun test tests/st-gi-6l2e.test.ts` → 13 pass / 0 fail / 82 expect() | GREEN |
| **E-2 (deploy)** | local sha `7c55979449d9c97e766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f` == container sha | MATCH |
| **E-2 (auth)** | the model answered; the status bar read "Laguna S 2.1 (free)" | PASS |
| **E-2 (the tool)** | the TUI tool result: `consumed:2/8 rungs=settlement` with L5 facts=16 / L6 facts=8 | PASS |
| **E-2 (the negative)** | scopeRoot=/tmp → `consumed:0/8`, every consumer DOWN; `consumed:8/8` ABSENT | PASS |
| **E-2 (the rungs)** | settlement/context/knowledge/decision/meaning/repair — matches the DPL1 map | PASS |
| **E-3** | `packages/gi-kernel-6l2e/6L2E_COMPLETION_REPORT.md` (212 L) + `.trident/plan-6l2e/phaseE.json` | SEALED |
| **the bug ledger** | 6 findings (B-1..B-6), 4 fixed in place, 2 reported with mechanism | NON-EMPTY |

---

# ★ THE TRUE DIST (re-stamped 2026-09-23 after the zero-trust audit)

** sha256_16 `7c55979449d9c97e766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f`** (9,434,756 B).
★ THE AUDIT FOUND SHA DRIFT: this doc carried `a8583082…` / `7c55979449d9c97e766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f` (two rebuilds
stale). The dist was rebuilt after the 8 HIGH gate fixes; **this is the TRUE sha**.
Evidence: `sha256sum extensions/graph-intelligence/index.js` → `7c55979449d9c97e766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f`; `find src -newer` = 0;
the container deploy sha MATCHES.

---

## ★ THE RED-TEAM CLOSE (2026-09-23) — THE 5 FRONTS, EACH WITH ITS EVIDENCE

**The dist:** `7c55979449d9c97e766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f` · **the pin:** `PIN_FIX_ALL_REMAINING_BUGS.md`

| the gate | the command | the measured token | the artifact |
|---|---|---|---|
| W1 the artifact-coverage | `bun test ./tests/st-artifact-coverage.test.ts` | `5 pass · 0 fail` (the suite MOUNTS the dist) | `tests/st-artifact-coverage.test.ts` |
| W2 the audit findings | `bun test ./tests/st-audit-findings.test.ts` | `6 pass · 0 fail` (4 NOT-A-BUG + 1 FIXED) | `artifacts/AUDIT_GATE_F98.md` (the W2 table) |
| W3 the kernel red-team | `bun test ./tests/st-redteam-kernel.test.ts` | `10 pass · 0 fail` (F-108 found) | `tests/st-redteam-kernel.test.ts` |
| W4 the container coverage | the rig's `gi-consumption` | `consumed:6/8` (1/8 → 6/8) | `.trident/plan-6l2e/phaseE-kev.json` (wave_W4) |
| W5 the fresh audit | `ocr scan --path …` (the GO mimo lane) | ⏳ | `artifacts/` + `TESTING_LOG.md` |

**THE FULL SUITE (zero-broken-windows):** `bun run test` → **393 pass / 0 fail (38 files) +
491 pass / 0 fail (55 files)** → **exit 0**.
**tsc:** `bunx tsc --noEmit` → **exit 0**.
**the predicate:** `bun scripts/goal-verify.ts . evidence` → **5/5 · exit 0**.
**the register:** `bun scripts/consumption-audit.ts . evidence --gate` → **consumed:8/8 · exit 0**.

## ★ THE DEFECTS FOUND THIS RUN (4, all recorded)
- **F-107** the artifact-coverage gap — ★ FIXED (W1: 5 pins; 2 of 54 files now mount the dist)
- **F-108** the KEV CLI's usage guard ineffective — ★ FIXED (the guard requires ≥1 option)
- **F-109** the `confineTargetPath` TOCTOU — ★ FIXED (the double-realpath re-validation)
- **F-110** the container's register ceiling is 6/8 — ★ RECORDED (both DOWN named with retries)

## ★ THE HONEST GAPS
1. **The container's register is 6/8** — L2_ARSUMBRIS is a DAEMON (a socket, untarrable) and
   ABIDE's substrate is ABSENT ON THE HOST. Both NAMED with retry conditions.
2. **W5's fresh audit** — the multi-file scan aborts at 0 files (measured); the single-file scan is
   the working shape. The artifact + the `AUDIT GATE:` line land when the lane completes.
3. **The 5 declined findings** are RESOLVED (4 NOT-A-BUG proven + 1 FIXED), each with its test.


---

## ★ THE CLEANUP RUN (2026-09-24) — the 4 waves, each with its measured evidence

**The dist:** `7c55979449d9c97e766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f` · **The spec:** `packages/gi-cleanup/CLEANUP_SPEC.md`

| the wave | the fraud | the command | the measured token | the artifact |
|---|---|---|---|---|
| W1 | FR-1 the LYING GATE | `bun test -t test_goal_predicate` | **4 pass / 0 fail** · the stdout has NO contradicting line | `scripts/goal-verify.ts` (the condition string fixed) |
| W2 | FR-2 the HOLLOW LEDGER | `bun test -t test_ledger_diversity_four_verdicts` | **4 rows, 4 DISTINCT** (dumb|theatrical|destructive|benign) | `tests/st-runtime-diversity.test.ts` |
| W3 | FR-3+FR-4 the 2.7% audit + the 10 findings | the parallel whole-tree scan (12 workers) | RUNNING | `/tmp/whole-tree-audit.json` |
| W4 | FR-5 the container's 6/8 | the rig's `gi-consumption` | **6/8 — ABIDE flipped DOWN→CONSUMED (987 facts)**; L2 + TSG the NAMED blockers | `.trident/plan-6l2e/phaseE-cleanup.json` |

**★ THE FINDING THE RUN SURFACED:** **F-121 — a PREFLIGHT refusal is NEVER recorded in the
ledger.** `runKernelV2` returns at the PREFLIGHT's refusal BEFORE stage 6 (the RECORD), so a
refused stack produces a verdict the ledger never sees. Logged OPEN.

**★ THE HONEST GAPS (this run):**
1. W3's whole-tree audit is RUNNING (the serial shape was 7.5 min/file — the wrong design; the
   parallel shape is 12 workers).
2. W4's 2 DOWN are NAMED with retry conditions (L2 a daemon; TSG's ~600 MB KEV payload absent in
   the FRESH container).
3. F-121 (the unrecorded refusal) is OPEN.
