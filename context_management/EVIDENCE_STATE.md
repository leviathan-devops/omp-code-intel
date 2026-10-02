<!-- 6L+2E + AUDIT UPDATE — 2026-10-03 (supercedes the 2026-09-30 banner below) -->
# ★ CURRENT — 2026-10-03: THE 6L+2E GAPS CLOSED + AUDITED
- GI ext `extensions/graph-intelligence/index.js` sha256 879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741 — DEPLOYED == SOURCE
- the 8 consumers CONSUMED across the SUBJECT UNION: `bun scripts/consumption-audit.ts . --gate` -> `union=8/8`
  (6 per-subject rows; the register reads consumed:6/8 for the canonical subject)
- ABIDE observable: a judge verdict writes a gate-ledger row `Pattern=ABIDE_JUDGE p=0.703` + ABIDE-R1/R2/R3
- C2KG edges=411 (the adapter reads them: L4_C2KG CONSUMED, an edge subject)
- L2_ARSUMBRIS: the symbol/file-space read (facts=50 on `populateSessionStore`)
- the AUDIT: `qwen-code-audit` (poolside-laguna-s) 3 rounds — 1 crit + 2 high FIXED+PROVEN; 0 crit/high OPEN
- the checker: `bun scripts/consumption-audit.ts <root> --gate` (EXIT 0 = predicate passed)

# EVIDENCE_STATE — the per-gate evidence (summary as of 2026-09-30)

- the corpus 40/40 (judgeDown=0) · the host proof 10/10 · the container proof 10/10 · the ledger 1987+ rows · the red-team replay all-caught · the audit BLOCKED (scope-mismatch, session e0c136e3, 6M/4L on 2 pre-existing files)

**The dist SHA (the deployment fingerprint): 879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741**

## THE DIST SHA CHAIN

```
deployed         879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741  613,039 B
v2.1 blueprint   879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741  (41,853 B, 862 L — the design of record)
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
| **E-2 (deploy)** | local sha `879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741` == container sha | MATCH |
| **E-2 (auth)** | the model answered; the status bar read "Laguna S 2.1 (free)" | PASS |
| **E-2 (the tool)** | the TUI tool result: `consumed:2/8 rungs=settlement` with L5 facts=16 / L6 facts=8 | PASS |
| **E-2 (the negative)** | scopeRoot=/tmp → `consumed:0/8`, every consumer DOWN; `consumed:8/8` ABSENT | PASS |
| **E-2 (the rungs)** | settlement/context/knowledge/decision/meaning/repair — matches the DPL1 map | PASS |
| **E-3** | `packages/gi-kernel-6l2e/6L2E_COMPLETION_REPORT.md` (212 L) + `.trident/plan-6l2e/phaseE.json` | SEALED |
| **the bug ledger** | 6 findings (B-1..B-6), 4 fixed in place, 2 reported with mechanism | NON-EMPTY |

---

# ★ THE TRUE DIST (re-stamped 2026-09-23 after the zero-trust audit)

** sha256_16 `879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741`** (9,434,756 B).
★ THE AUDIT FOUND SHA DRIFT: this doc carried `a8583082…` / `879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741` (two rebuilds
stale). The dist was rebuilt after the 8 HIGH gate fixes; **this is the TRUE sha**.
Evidence: `sha256sum extensions/graph-intelligence/index.js` → `879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741`; `find src -newer` = 0;
the container deploy sha MATCHES.

---

## ★ THE RED-TEAM CLOSE (2026-09-23) — THE 5 FRONTS, EACH WITH ITS EVIDENCE

**The dist:** `879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741` · **the pin:** `PIN_FIX_ALL_REMAINING_BUGS.md`

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

**The dist:** `879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741` · **The spec:** `packages/gi-cleanup/CLEANUP_SPEC.md`

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

## ★ V2.2 EVIDENCE (2026-09-26) — every claim carries its tool result

| claim | the evidence (verbatim) |
|---|---|
| the ghost stores purged | `ls .omp/graph-intelligence/*/store.sqlite | wc -l` → `0`; pre-purge corbell `file LIKE 'src/%'` → 0 |
| W2 the graph is a function of the target | `corbell-build --target research/…/Understand-Anything` → `nodes=739 edges=2429` |
| W2 the refusal | a dir with package.json + no .ts → `GI_NO_SOURCE_ROOT: no source root discovered under /tmp/…` exit 1 |
| W3 the scope refusal | `assertStoreScope(storeA, rootB)` → `GI_STORE_SCOPE_MISMATCH: store built for /tmp/scopeA-…, subject root is /tmp/scopeB-…` |
| W4 the self-populate | `gi-populate --target <fresh>` → corbell ✓3 · graphify ✓5 · structural ✓1 · ua ✓4 |
| W4 the capability measure | the foreign target register → `consumed:3/8 rungs=meaning,settlement`; the GI repo → `consumed:7/8` |
| W5a jevk5 | the TSG line → `jevk5 jevk5-4b-v0.2-Q8_0 on :8090` |
| W5b the live judge | `judgeDiff(<violating diff>)` → `{ok:true, verdict:"REPAIR", evidence:"live judge http://127.0.0.1:8090/v1/systemone rules=3 ABIDE-R1=0.879"}` |
| W5c the firewall | `adjudicateClaim({text:"523 tests pass, done", turnToolResults:[]})` → `{verdict:"FABRICATED", action:"REJECT"}` |
| W6 the container | the dist `9a1635912a95583d` in omp-ct-gi20 → all 7 tools register; `graph-probe` → PROBE_TOOL_OK; the register 0/8 all-named |

---
## V2.3 — THE EVIDENCE (2026-09-28)

| the claim | the artifact | the tier |
|---|---|---|
| the LSP answers from the layers | `gi-lsp --selftest` → 18 diagnostics | L2 (the JSON-RPC transcript) |
| OMP consumes it | `~/.omp/agent/lsp.json` + the test | config-proven (L4 pending) |
| the cards are real | st-gi-lsp 4/4 · st-card-hud 3/3 | L1 |
| the Jev route | `[gi-lsp/meaning] isTsFile — meaning match (confidence 0.514)` | L2 |
| the firewall A-1 | st-claim-firewall 4/4 | L1 |
| the health gate | `graph-health .` EXIT 0 · st-graph-health 2/2 | L1/L2 |
| the de-brand | `grep -ri trident src/ scripts/` → 0 | L0 |
| the boot-persistence | `systemctl --user is-active au-engine-refresh.timer` → active | L0 |
| the runtime seat | the 4 live gates on THIS session | L4 (the hot seat) |
| S9 the audit | the whole-tree audit (muse-go) — RUNNING | L2 |

**THE DIST:** `7d4e9db83263ba22`. **THE CHECKPOINT:** `Checkpoints/gi-kernel-v2.3-reflexive-kernel-7d4e9db8/`.


---
## ★ THE V2.3 SESSION UPDATE (2026-09-29) — dist sha256 4694b1323fcc6887…
- **THE DIST**: `extensions/graph-intelligence/index.js` sha256 `4694b1323fcc6887…` (817806 B) — the deployed bundle,
  sha-matched by `DIST.SHA256` in the seal.
- **THE BATTERY**: 466 pass / 0 fail (unit) + 564 pass / 0 fail (script-test) via `bun run test`,
  EXIT=0 · `bunx tsc --noEmit` EXIT-0.
- **W0**: `bun scripts/graph-health.ts .` EXIT-0 — every layer >=90% in-scope (L1 100% · L2 100% ·
  L3 100% · L4 99% · L5 97% · L6 100% · structural 100%).
- **★ THE REFLEX: PROVEN** (`.omp/container-test-results.json`): the OMP runtime spawned
  `bun /gi/scripts/gi-lsp.ts --stdio` on a write (pid 3352, parent = the pi-coding-agent runtime)
  and the session records verbatim `diagnostics arrived after the edit returned:
  /gi/scratch-reflex.ts — 1 error(s), 1 warning(s) · [gi-lsp/scope] · [gi-lsp/unwired]
  reflexProbe — 0 callers` — WITH NO AGENT ACTION.
- **THE AUDIT GATE**: PASS (0 critical / 0 high) — `ocr scan --provider muse-go` on the W6 firewall
  (10 iterative passes; 9 fixes; the corpus 10 probes / ~67 attacks / ~80 controls, 0 leaks /
  0 misfires). The graph family's PRE-EXISTING highs are the named remainder (DEBUG_LOG 32-34).
- **S1-S12**: ALL GREEN (RECEIPT-V2.3.md §8 carries each reading; S5 was fixed this session —
  `WALK_SKIP` now has 3 TS importers (`src/hunter/diagnostics/engine.ts:49` ·
  `src/hunter/graph/corbell-adapter.ts:60` · `scripts/ua-ingest.ts:50`) + 2 aligned Python mirrors).
- **THE SEAL**: `Checkpoints/gi-kernel-v2.3-reflexive-kernel-4694b1323fcc6887/` (full-tree: src 120 .ts · the
  dist + SHA · the 11 canon · the 5 ship docs + the receipt · the CT artifact · the wave audit ·
  the package).
- **THE OPEN FRONTS**: the graph family's pre-existing highs · the aggregate audit scan's
  OCR_RUN_DEGRADED (per-family scans operative) · the layersRoutedThroughLsp per-layer count ·
  the c2kg layer's NAMED build failure (the refresh service exits 1 on 5/6 layers — the loud-fail
  design).

## 2026-09-29 — THE SESSION'S EVIDENCE (the measured set)

### THE DIST + THE BUNDLE
- **the TRUE dist:** `4694b1323fcc6887b89264c9262701ae3ebaf31b97bd19302256c9eefe964494`
  (`extensions/graph-intelligence/index.js`, 817806 B).
- **the restoration is BIT-IDENTICAL:** host == the checkpoint
  `Checkpoints/gi-kernel-v2.3-reflexive-kernel-4694b1323fcc6887/` — verified by sha, and
  `grep -c 'GI BASH LOCKDOWN'` = 0 (the rejected hook is fully gone from the bundle).

### THE BATTERY + THE GATES
- `bun run test` -> **466 pass / 0 fail + 564 pass / 0 fail, EXIT=0** · `bunx tsc --noEmit` EXIT-0.
- `bun scripts/graph-health.ts .` -> EXIT-0 (every layer >=90% in-scope).
- the 8 named G3 tests: 8/8. W7 (the brand scan): 0 offenders.

### THE LIVE RUNTIME EVIDENCE
- **THE JEV JUDGE IS LIVE:** `curl :8090/health` -> `{"ok":true,"model":"jevk5-4b-v0.2-Q8_0",
  "runtime":"gguf"}` · the meaning card measured **104ms** with a calibrated distribution.
- **THE LIVE HOST REFLEX FIRED:** a real write -> the diagnostics after the edit:
  `[gi-lsp/unwired]` + `[gi-lsp/meaning] confidence 0.554 · jevk5 @ :8090 (104ms)` +
  `[jg/state]`. Evidence: `.trident/live-readiness-evidence.md`.
- **THE PRODUCTION SUITE: 9/9 LIVE** (`scripts/gi-production-suite.ts --live`): the sustained
  reflex 25/25 (p50=138ms) · the 10-herd 10/10 · the judge 120ms · the stale store named.
- **THE PRESSURE SWEEP: 105/105** (POS 55 · NEG 31 · EDGE 19) — 0 leaks / 0 misfires.

### THE GUARDRAIL MAP (the live adversarial round — the measured verdicts)
| the surface | the verdict | the evidence |
|---|---|---|
| the smoke gate (the JS forms) | ARMED + CALIBRATED | `bun -e`/`node -e` blocked with the named token |
| **the smoke gate (the interpreter family)** | **UNDER-FIRING** | python3 -c/-m · perl -e · ruby -e — 4 SURVIVORS |
| **the over-breadth (the pattern text)** | **FALSE POSITIVE** | a pure read whose pattern held a shape word was escalated — 3x reproduced |
| the doc-density gate | ARMED + EVASION-RESISTANT | a thin doc blocked; the marker alone does not bypass |
| the graph gate | ARMED — the full ladder | steer -> block -> comply -> reset, all four observed |
| the container gate | ARMED (the message misnames its trigger) | an indirection chain blocked; the prose passes |
| **the W6 firewall** | **NOT WIRED** | `enforceBashLockdown`: 0 in the bundle; the corpus's attacks run FREE |
| **the prose rule layer** | **UNDEPLOYED (host)** | the registry reads 0; 9 files deployed, unbound |

### THE FIXES MADE + REVERTED THIS SESSION
- **FIXED (kept):** the smoke detector's over-breadth + the interpreter family (in
  `pbk-v2/src/firewalls/semantic-smoke-firewall.ts` — the source; the source-level control set
  measured 10/10 attacks blocked, the FPs passing).
- **REVERTED (the operator's rejection):** the FR-11 bash-lockdown hook — removed from source,
  repo, host and container; the bundle restored bit-identical.

---

## THE JEV ROUND — THE EVIDENCE PER WAVE (2026-09-29)

| the wave | the claim | the artifact | the command that produced it |
|---|---|---|---|
| P0 | the baseline re-measured, diff ZERO | git 018aad8 · dist 4694b1323fcc6887 · 817806B · judge LIVE | `sha256sum extensions/graph-intelligence/index.js` + `curl 127.0.0.1:8090/health` |
| W1 | the interface lands + tsc clean | `src/omp/jev.ts` (+217L) | `bunx tsc --noEmit` → RC=0 |
| W1 | the detector emits candidates, never verdicts | `tests/st-gi-jev-gate.test.ts` | `bun test ./tests/st-gi-jev-gate.test.ts` → 5 pass / 0 fail |
| W2 | the judge decides with a confidence | the live probe | `bun /tmp/probe-gate.ts` → `serve p=0.9411 judge=jevk5-4b-v0.2-Q8_0 ms=173` |
| W4 | the 40-case control set, 0 misfires | `/tmp/gate-control-set.json` | `bun scripts/gate-control-set.ts` → 40/40, RC=0 |
| W4 | the threshold DERIVED (0.5) | the corpus's confidence section | `derived=0.5` from `minRefuse=0.674 maxServe=0.941` |
| W3 | the STTGF gate consults the judge | `sttgf-gate.ts` + the ledger rows | `SMOKE_INLINE_EXEC serve p=0.760 enforced=served` |
| W3 | the doc-density gate consults the judge | `doc-density-gate-v2.ts` | tsc RC=0 + the suite 401/1 |
| W5 | the GI extension LOADS in the container | the container's omp log | `grep -c 'Failed to load extension'` → **0** (was 3) |
| P4 | the deployed bundle behaves (the L3 proof) | `/tmp/deployed-gate-proof.ts` | `bun /tmp/deployed-gate-proof.ts` → **6/6 RC=0** (sha 1cb47863) |
| P4 | the ledger carries a judge per verdict | `~/.omp/run/gate-ledger.jsonl` | `wc -l` → 259 · `tail` → every row has Evidence.judge + confidence |
| C8 | zero regressions | the batteries | GI tsc RC=0 · pbk-v2 401/1 (the 1 PRE-EXISTING, stash-proven) |

---

## ★ THE SWEEP STAMP (the final state — every earlier sha/claim above is HISTORICAL)

- **THE LIVE omp-ct (the gate stack, the 4-GATE JEV WIRE): `6ec6036fe2f8278cdcf74eff…`**
- **THE LIVE GI extension (the F-144 lazy-compiler fix): `e3802fab132566e729b77937…`**
- **ALL FOUR GATES are WIRED** (the smoke · the doc-density · the container · the graph — each
  consults the judge). Any earlier line reading "2 of the 4" is SUPERSEDED by this stamp.
- **THE PROOFS (current):** the 40-case corpus **40/40 · judgeDown=0** · the 4-gate deployed
  proof **10/10** · pbk `bun test ./tests/` **401/1** (the 1 PRE-EXISTING) · tsc **RC=0** both repos.
- **THE LEDGER:** 1,182 rows, every one judge-bearing (~/.omp/run/gate-ledger.jsonl).
- **THE SEAL:** `Checkpoints/gi-jev-decision-layer-1cb47863b810/` (the omp-ct sha within ≡ the live).

## [2026-09-30] — the audit artifact evidence
- the artifact: `artifacts/sg-ocr-7d99a4f0aab46f00.json` (18536 bytes, multi-object; first object: session e0c136e3, status success, llm muse-go-mimo/mimo-v2.5, files_reviewed 2, comments 10 = 6 medium + 4 low, elapsed 3m58s)
- the scope: decision.ts (6: 4 medium + 2 low) + extension.ts (4: 2 medium + 2 low) — ZERO overlap with the JEV wire files
- the wiring: EN-16..EN-25 (DEBUG_LOG) · F-154/F-155/F-156 (FAILURE_LOG) · V-2031 (SPEC_VIOLATION_LOG) · AUDIT GATE: BLOCKED (TESTING_LOG)

## [2026-10-01] — the host-suite evidence
- stub: 13/13 PASS, artifact `.gi/host-suite-results.json`
- live: 8/13 (S1/S2/S7/S8/S12 fail — F-157 OPEN, unadjudicated)
- the battery: the W1/W2 tests 5/0 · pbk 401/1 (the 1 pre-existing) · tsc EXIT-0 both

## [2026-10-01] — the adversarial suite evidence
- stub 15/15 · live 15/15 (after the F-159 probe-error adjudication) · artifact /tmp/host-suite-jev.json + .gi/host-suite-jev.json
- heredoc serve p=0.5443 · inline refuse p=0.7824 · curlpipe refuse p=0.9760 · the ledger 2214 rows, 0 without a judge

