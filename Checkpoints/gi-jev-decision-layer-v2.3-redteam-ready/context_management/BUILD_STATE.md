# BUILD_STATE — the SHA chain + the module inventory

**dist SHA: b2ab09acc77684e4805e41ebbadb67fa72ea705ad3f59904c230a06e25bd4fd3** · 2026-09-21

## THE SHA CHAIN (every checkpoint + what changed)

```
v1.3 dist (DEPLOYED)          b2ab09acc77684e4805e41ebbadb67fa72ea705ad3f59904c230a06e25bd4fd3
  the frozen surface. 613,039 B. Unchanged since the v1.3 seal.
v1.3 ship package             dist seg 83eb7bba (SHIP_PACKAGES/Graph_Intel_v1.3/)
the v2.1 blueprint            b2ab09acc77684e4805e41ebbadb67fa72ea705ad3f59904c230a06e25bd4fd3  (41,853 B, 862 L)
the 14-case measurement       artifacts/jev-kernel/measurement-14-case.json (bestT=0.40)
checkpoint v2.0-working       750009c (the first save) → c329f83 (the refresh with the blueprint)
baseline at session start     c9bff81a56dc5bc5d5740623038d34507f6ab890
HEAD                          652d780 (the create pin)
```

## THE MODULE INVENTORY (file → lines → purpose → status)

```
src/omp/typed-write.ts  1243  the store: layer_id · derivation · confidence · freshness  SOLID
src/omp/kernel-v2.ts     390  STAGE 0..6 + the three detectors                          SOLID
src/omp/rsi.ts           448  the reflex store + VERIFIED RETIREMENT                    SOLID
src/omp/hard-deps.ts     220  the dependency register (no fallbacks)                    SOLID
src/omp/enforcement.ts   270  TSG + Abide, the two-layer kernel                         SOLID
src/omp/jev.ts           149  the live Jev client                                        SOLID
src/omp/fire-gate.ts     370  the firing-time decision kernel                           BUILT/UNWIRED
src/omp/calibration.ts   185  the derivation machinery                                  BUILT
──────────────────────────────
                        3275  the v2.0+v2.1 source delta
```

## THE TEST INVENTORY (6 files / 65 tests)

```
tests/st-gi-store.test.ts       211 L  11 tests  T-1/T-8/SC-6/SC-7
tests/st-gi-v2-gate.test.ts     192 L  14 tests  T-3/T-4/SC-2
tests/st-gi-v2-kernel.test.ts   222 L   9 tests  T-7/SC-4/SC-5 + the mutation
tests/st-gi-v2-deps.test.ts     146 L  11 tests  T-6
tests/st-gi-v2-enforce.test.ts  170 L  16 tests  T-5
tests/st-gi-v2-wiring.test.ts   109 L   4 tests  the live-shape contract
src/hydra/__tests__/fx383-fixture.ts  the hermetic fixture helper (the container fix)
──────────────────────────────
                               1050 L  65 tests
```

## VERIFIED RESULTS (the gates, this turn)

```
battery (host)      199 pass / 0 fail / 701 expect / 20 files [1258ms]
battery (CONTAINER) 199 pass / 0 fail / 705 expect / 20 files (clean /tmp, no ambient keys)
tsc                 191 errors == the pre-session baseline, 0 NEW
the gate suite      12 pass / 0 fail / 30 expect
the paragon battery 17 pass / 0 fail / 51 expect
register            ok=false up=5/11 first=GI_LAYER_SEMANTICA
```

## THE BUILD COMMAND + THE EXACT ENV

```
cd /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
ln -sfn /home/leviathan/JARVIS_WORKSPACE/OMP/Graph_Intelligence/node_modules node_modules
bun test ./tests/ ./src/hydra/__tests__/          # the battery
bunx tsc --noEmit -p tsconfig.json                # the typecheck
rm -f node_modules                                 # ALWAYS clean the symlink
source ~/.config/typesafe/env.sh                   # loads TYPESAFE_AI_API_KEY from the 0600 file
the container: docker exec stupefied_morse sh -lc 'cd /work/gi && /root/.bun/bin/bun test ...'
```

## THE FROZEN-MACHINERY FILE:LINE LIST (what is locked and why)

```
extensions/graph-intelligence/index.js     sha 83eb7bba... (the deployed artifact)
src/omp/graph-gate.ts:208                  the tier ladder — the v1.3 behaviour
src/omp/graph-gate.ts:136                  the drift reset
src/omp/gate-hook.ts:117                   THE single call site (grep count = 1)
src/omp/graph-gate.ts:247/:250/:254        the 3 PROPOSED hooks
src/omp/populate.ts:21                     the F-48 law (no third substrate)
```

## THE CHECKPOINT STRUCTURE (the last save)

```
Checkpoints/gi-kernel-v2.0-working-fire-gate-calibration-measured/   175 files / 3.4M
  src/ 94 .ts (MATCH) · dist/index.js sha 83eb7bba (MATCH) · context_management/ ·
  the 6 ship docs · artifacts/{gi-kernel-v2, paragon-runtime-encryption, jev-kernel,
  skills, ct-v2, reports, scripts} · CHECKPOINT_MANIFEST.md + CHECKPOINT_STRUCTURE.md
  SEAL: MODE B (no lock) — documented, per the operator's ruling on manifest-only locks
```

## THE CHECKPOINT STRUCTURE (the full tree with line counts)

```
Checkpoints/gi-kernel-v2.0-working-fire-gate-calibration-measured/    175 files / 3.4M
├── src/                    94 .ts  (MATCH the project's 94)
│   ├── omp/                typed-write 1243 · kernel-v2 390 · rsi 448 · hard-deps 220 ·
│   │                       enforcement 270 · jev 149 · fire-gate 370 · calibration 185
│   ├── hunter/             the graph adapters + the key pool
│   ├── scoping/            gi-session-path.ts (resolveSessionId) + the store guards
│   └── hydra/              the wave machinery + __tests__/fx383-fixture.ts
├── dist/index.js           613,039 B   sha 83eb7bba (MATCH)
├── context_management/     this doc set
├── BUILD_REPORT.md 467 L · DEBUG_LOG.md 521 L · FAILURE_LOG.md 397 L ·
│   SPEC_VIOLATION_LOG.md 74 L · TESTING_LOG.md 576 L · THEATRICALITY_LOG.md 387 L
├── artifacts/
│   ├── gi-kernel-v2/               the v2.0 package (11 docs + drivers)
│   ├── paragon-runtime-encryption/ the guarded-seam boilerplate (9 files)
│   ├── jev-kernel/                 fire-gate · calibration · jev · enforcement
│   │                               + measurement-14-case.json
│   ├── skills/derive-runtime-measurements/   the minted skill
│   ├── ct-v2/                      the RB host-live evidence
│   └── reports/ + scripts/
├── CHECKPOINT_MANIFEST.md          the state + the HONEST GAPS + the refresh note
└── CHECKPOINT_STRUCTURE.md         the tree + the counts + the gates
```

## THE ENVIRONMENT + THE EXACT COMMANDS

```bash
# THE BATTERY (the primary gate)
cd /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
ln -sfn /home/leviathan/JARVIS_WORKSPACE/OMP/Graph_Intelligence/node_modules node_modules
bun test ./tests/ ./src/hydra/__tests__/     # → 199 pass / 0 fail / 701 expect / 20 files
rm -f node_modules                            # ALWAYS clean the symlink (it breaks other tools)

# THE TYPECHECK
bunx tsc --noEmit -p tsconfig.json            # → 191 errors == the baseline

# THE LIVE JEV KEY (out-of-band, mode 0600)
source ~/.config/typesafe/env.sh              # exports TYPESAFE_AI_API_KEY from the file
# the key NEVER enters the repo, a chat, a log, or a doc row.

# THE CONTAINER (the rig of record)
docker exec stupefied_morse sh -lc 'cd /work/gi && /root/.bun/bin/bun test ./tests/ ./src/hydra/__tests__/'
# ★ NOTE: staging uses `docker cp src/hydra/. <dest>/` — the trailing /. copies CONTENTS.
#   Without it, docker cp NESTS the directory (measured: it produced __tests__/__tests__).

# THE MIGRATION / POPULATE (the store work)
populateSessionStore(<store>, <root>, tag, {substrate:"graphify", graphifyGraph:<path>})
bun scripts/graphify-build.ts --target <root>   # the build now marks its OWN sidecar fresh
```

## THE SHA CHAIN — WHAT CHANGED BETWEEN EACH

```
c9bff81  the session's baseline (the pinned HEAD from the goal)
   ↓ the v2.0 work: typed-write's v2 columns · kernel-v2 · rsi · hard-deps · enforcement
9f9e9db  W1 — the six-layer store + the two defect kills (layer_id · derivation · freshness)
9ace9c1  W2 — the STAGE 0..6 machine + the three detectors
693c530  W3 — the RSI reflex layer with VERIFIED RETIREMENT
c287ab0  W3 — the enforcement kernel (TSG + Abide, two polarities)
f5d81be  the canon (this prep)
652d780  the create pin
   ↓ the checkpoint: 750009c (first save) → c329f83 (REFRESHED with the blueprint + §12)
```

## THE MODULE INVENTORY — PURPOSE + THE KEY EXPORTS

```
src/omp/typed-write.ts  1243 L  the store. EXPORTS: openTypedStore · applyTypedDdl ·
                                migrateLayerColumns · deriveConfidence · derivationOf ·
                                layerOf · layerFreshness · storeFreshness · insertForkNode ·
                                insertForkEdge
src/omp/kernel-v2.ts     390 L  the stage machine. EXPORTS: runKernelV2 · preflight ·
                                classifyByDetectors · dumbDetector · theatricalDetector ·
                                destructiveDetector · DEFAULT_DETECTORS · fileLayer
src/omp/rsi.ts           448 L  the reflex store. EXPORTS: RsiStore · deriveTier ·
                                DEFAULT_THRESHOLDS · DERIVATION_BASE
src/omp/hard-deps.ts     220 L  the register. EXPORTS: audit · requireUp · buildRegister ·
                                pathComponent · commandComponent · keyComponent ·
                                assertRegisterComplete · HardDependencyError
src/omp/enforcement.ts   270 L  the two-layer kernel. EXPORTS: runWorkLayer · runCloseLayer ·
                                bandOf · ACT_PROBABILITY · FLAG_PROBABILITY · Judge · LoadUnit
src/omp/jev.ts           149 L  the live client. EXPORTS: JevJudge · probeJev · resolveKey ·
                                TYPESAFE_URL · TYPESAFE_MODEL · JevError
src/omp/fire-gate.ts     370 L  THE v2.1 CORE. EXPORTS: FireGate · absorbContext · buildState ·
                                fireQuestion · mpsePreFilter · SEED_POLICY · STATE_BYTE_CAP
src/omp/calibration.ts   185 L  the derivation. EXPORTS: thresholdFromCost ·
                                precisionFromCounts · derivePolicy · checkCalibrationHealth ·
                                firesNeededForGap · DEFAULT_PROFILES
```

## THE FROZEN-MACHINERY LIST — WHAT IS LOCKED, WHY, AND HOW TO VERIFY

```
LOCKED                              WHY                              THE VERIFY
extensions/graph-intelligence/       the deployed artifact            sha256sum → 83eb7bba
  index.js  (613,039 B)
src/omp/graph-gate.ts:208            the v1.3 tier ladder (the        bun test -t st-gi-graph-gate
                                     shipped behaviour)               → 12/12
src/omp/graph-gate.ts:136            recordGraphQuery (the reset)     the drift tests
src/omp/gate-hook.ts:117             THE single call site             grep -c registerGraphGate = 1
src/omp/graph-gate.ts:247/:250/:254  the 3 PROPOSED v2 hooks          grep -c PROPOSED = 7
src/omp/populate.ts:21               the F-48 law (no 3rd substrate)  grep the comment
```

## THE PROOF-OF-STATE (what a fresh agent can re-run to confirm this doc)

```
bun test ./tests/ ./src/hydra/__tests__/   → 199 / 0 / 701 / 20 files
bunx tsc --noEmit -p tsconfig.json         → 191
sha256sum extensions/.../index.js          → b2ab09acc77684e4805e41ebbadb67fa72ea705ad3f59904c230a06e25bd4fd3...
grep -c FireGate src/omp/kernel-v2.ts      → 0        (the wiring is the build)
grep -c registerGraphGate src/omp/gate-hook.ts → 1    (the single call site holds)
```

**If any of those five disagree with this doc, THIS DOC IS STALE — trust the command.**

---

# ★ THE 6L+2E BUILD STATE (2026-09-22)

| item | value |
|---|---|
| HEAD | `f6fca91` |
| dist sha256_16 | **`b2ab09acc77684e4805e41ebbadb67fa72ea705ad3f59904c230a06e25bd4fd3`** |
| dist size | 9,426,889 B (was 613,000 B) |
| dist-content gate | **PASS** (every v2.x symbol present) |
| src newer than dist | **0** |
| tsc | **exit 0 / 0 errors** (was 191) |
| battery | ** 336 pass  0 fail ** |
| the 6L+2E suite | 13 pass / 0 fail / 82 expect() |
| container proof | `gi-6l2e-ct` (omp-ct:master) — deploy sha MATCH, 5/5 scenarios |
| consumption | **consumed:2/8** (L5 corbell + L6 graphify) |
| the gate defect | **FIXED** (the reset fires on a resolved query) |
| the L2 probe defect | **FIXED** (a socket FILE is not a DAEMON; connect() is the proof) |

---

# ★ THE TRUE DIST (re-stamped 2026-09-23 after the zero-trust audit)

** sha256_16 `b2ab09acc77684e4805e41ebbadb67fa72ea705ad3f59904c230a06e25bd4fd3`** (9,434,756 B).
★ THE AUDIT FOUND SHA DRIFT: this doc carried `a8583082…` / `b2ab09acc77684e4805e41ebbadb67fa72ea705ad3f59904c230a06e25bd4fd3` (two rebuilds
stale). The dist was rebuilt after the 8 HIGH gate fixes; **this is the TRUE sha**.
Evidence: `sha256sum extensions/graph-intelligence/index.js` → `b2ab09acc77684e4805e41ebbadb67fa72ea705ad3f59904c230a06e25bd4fd3`; `find src -newer` = 0;
the container deploy sha MATCHES.

---

## ★ V2.2 — GI KERNEL V2.2: THE GRAPH IS A FUNCTION OF THE TARGET (2026-09-26)

**dist:** `b2ab09acc77684e4805e41ebbadb67fa72ea705ad3f59904c230a06e25bd4fd3` · 776K · deployed sha-matched.
**branch:** jarvis/gi-main · **spec:** GI_KERNEL_V2.2_REBUILD_SPEC.md (711 L, SPEC-AUDIT: APPROVED 0/8).

### THE WAVES (all audited by the orchestrator, per-hunk verdicts in RUNNING_BUILD_LOG)
| wave | deliverable | gate | evidence |
|---|---|---|---|
| W1 | the 2 ghost stores purged | `ls …/*/store.sqlite | wc -l` → 0 | corbell 9,565 nodes/0 live-src; graphify → Checkpoints archive |
| W2 | `discoverSourceRoots(target)` + 5 rules | 4 tests green; the real target builds >0 nodes | Understand-Anything: **739 nodes** (was GRAPH_EMPTY) |
| W3 | `setBuildRoot` + `assertStoreScope` | 3 tests green; a cross-scope read refuses | `GI_STORE_SCOPE_MISMATCH: store built for A, subject root is B` |
| W4 | `gi-populate --target X` (self-populate) | the fresh project populates; the register 8/8-or-named | fresh tmp: corbell 3/graphify 5/structural 1/ua 4; **the foreign target 0/8 → 3/8** |
| W5a | JevK5 wired (GPU → KEV → tsg) | the TSG evidence names jevk5 | `TSG CONSUMED … jevk5 jevk5-4b-v0.2-Q8_0 on :8090` |
| W5b | ABIDE judges the CURRENT diff live | a rule-violating diff → a live verdict | `REPAIR p=0.879` (live judge, not the ledger) |
| W5c | the claim firewall (L2, fail-CLOSED) | a fabricated claim → REJECTED | FAB → `{FABRICATED, REJECT}` · BOUND → `{SUPPORTED, PASS}` |

### THE DoD (spec §2) — ALL GREEN
D1 a fresh project populates ✓ · D2 the register 8/8-or-named ✓ · D3 the GI repo's 7/8 PRODUCED (not carried) ✓ · D4 a cross-scope read refuses ✓ · D5 a source-less target refuses (GI_NO_SOURCE_ROOT) ✓ · D6 the meaning gate uses JevK5 on GPU ✓ · D7 the claim firewall blocks ✓ · D8 ABIDE judges live ✓.

### THE CAPABILITY MEASURE (the register, real projects)
- the GI repo: **consumed:7/8** (corbell 50 · graphify 50 · c2kg 2 · ua 31 · semantica 12 · TSG jevk5 · ABIDE 948; L2 named) — **PRODUCED from a fresh build**.
- the foreign target (Understand-Anything, 387 .ts): **consumed:3/8** (corbell 26 · graphify 34 · TSG) — was **0/8**.
- the container (omp-ct-gi20, 222-file project): 0/8 with EVERY layer named (the container lacks the tooling).

### THE NEW FILES
`scripts/gi-populate.ts` · `scripts/typed-schema-init.ts` · `src/hunter/profile/source-roots.ts` · `src/omp/adapters/jevk5.ts` · `src/omp/claim-firewall.ts` + their tests.

---
## V2.3 — THE REFLEXIVE KERNEL (2026-09-28)

**dist:** `7d4e9db83263ba22` (810129B) — the deployed bundle, repo=deploy sha-matched.
**src:** 120 .ts (was 118; +src/gi-lsp/cards.ts +src/omp/card-hud.ts).
**battery:** 464 pass / 2 fail (the 2 = the build's staleness gates; both fix at W9).
**tsc:** EXIT 0.
**trident in src+scripts:** 0 (the de-brand complete; the read-fallback `resolveStateRel`).

### THE NEW SEAMS
| the artifact | the role | in the bundle? |
|---|---|---|
| `scripts/gi-lsp.ts` | the GI LSP server (stdio, JSON-RPC) — the 6 layers as a sense organ | separate process |
| `src/gi-lsp/cards.ts` | the 5 fact-card shapes (CALLERS·UNWIRED·CONFLICT·MEANING·SCOPE) | ✅ fileCards ×2 |
| `src/omp/card-hud.ts` | the Card-HUD fallback (tool_call → cards → tool_result) | ✅ attachCardHud ×2 |
| the claim-firewall A-1 | the negated-span binder fix | ✅ |

### THE EVIDENCE
`RECEIPT_V2.3.md` (the verdict) · `reports/GRAPH_GATE_live_forensic.md` (the live gates) ·
`host-test-failure-log.md` (12 bugs) · `Checkpoints/gi-kernel-v2.3-reflexive-kernel-7d4e9db8/` (the seal).

### THE MECHANISM OF THE HEADLINE FIX (W0)
`scripts/structural-extract.py` rule 3 returned the COMMON ANCESTOR of [src,tests] (= the repo root)
while `src/hunter/profile/source-roots.ts` returned the PREFIX DIRS — a PY/TS divergence. Fixed by
porting the V2.2 W4 glob-prefix law → structural 70453 → 7866 (12.4% → 100% in-scope).


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

---

## ★ THE CURRENT-REALITY MARKER (2026-09-29 — updated by canon-doc-update)

**THE DEPLOYED DIST: `4694b1323fcc6887b89264c9262701ae3ebaf31b97bd19302256c9eefe964494`**
(`extensions/graph-intelligence/index.js`, 817806 B) — the hash the deployed artifact carries.
It is BIT-IDENTICAL to `Checkpoints/gi-kernel-v2.3-reflexive-kernel-4694b1323fcc6887/`.

**THE MEASURED STATE (this update's ground truth):**
- the battery `bun run test` -> 466 pass / 0 fail + 564 pass / 0 fail, EXIT=0 · tsc EXIT-0
- the 8 named G3 tests 8/8 · W7 (the brand scan) 0 offenders
- the Jev judge LIVE: `{"ok":true,"model":"jevk5-4b-v0.2-Q8_0"}` · the meaning card 104ms
- the live host reflex FIRED (a real write -> the diagnostics after the edit; the Jev confidence)
- the production suite 9/9 live (the sustained reflex 25/25) · the pressure sweep 105/105

**THE OPEN (the operator's mandate — the plan `PLAN-CLEANUP-JEV.md`):**
1. THE JEV DECISION LAYER IS NOT WIRED INTO THE GATES — the judge answers in 104ms and the
   adapters exist (`src/omp/jev.ts` · `adapters/jevk5.ts` · `kev.ts` · `abide.ts`), but the four
   gates decide by regex (`pbk-v2/src/firewalls/semantic-smoke-firewall.ts:209`).
2. the GI extension fails to load in the container (3x `resolving package 'typescript'`).
3. the prose rule layer is unbound on the host (the registry 0; 9 files deployed).
4. the W6 firewall still has no live caller (`enforceBashLockdown`: 0 in the bundle).
5. DEPLOYED-NOT-RUNNING: the running sessions hold the pre-restart bundle in memory.

**THE REVERTED (the operator's rejection):** the FR-11 bash-lockdown hook — removed from the
source, the repo, the host and the container; the bundle restored bit-identical.

---

## [2026-09-29T23:34:28+04:00] — THE JEV DECISION LAYER: the SHAs + the battery

```
THE DEPLOYED ARTIFACTS (this round):
  pbk-v2 (the gate stack)   dist/index.js → ~/.omp/agent/extensions/omp-ct/dist.js
                            9da0eaf940786840 (before) → 1cb47863b810e400ccade4ff (now, 201.50 KB)
                            the wire symbols: smokeCandidate · askGateDecision · recordGateDecision ·
                                              docTypeCandidate · GATE_THRESHOLD
  the GI extension          extensions/graph-intelligence/index.js
                            4694b1323fcc6887 (before) → db9252e48f519a718ec8 (now, 818371 B)
                            the F-144 fix: 0 static typescript imports · createRequire · GI_TS_MISSING
  both deployed to the omp-ct container (the clean boot: 0 load failures)

THE BATTERY (measured this round):
  GI:       bunx tsc --noEmit → RC=0
  pbk-v2:   bunx tsc --noEmit → RC=0;  bun test ./tests/ → 401 pass / 1 fail (the 1 PRE-EXISTING)
  the W1/W2 tests: bun test ./tests/st-gi-jev-gate.test.ts → 5 pass / 0 fail
  the 40-case corpus: bun scripts/gate-control-set.ts → 40/40, RC=0
  the deployed-bundle proof: /tmp/deployed-gate-proof.ts → 6/6, RC=0 (sha 1cb47863)
  the ledger: ~/.omp/run/gate-ledger.jsonl → 259 rows, all carrying a judge + confidence
```

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
