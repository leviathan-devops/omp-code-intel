

---

# ★★★ THE IMMUTABLE SHIP GATE (the operator's order, 2026-09-23) — READ THIS FIRST

> **"EVERY SINGLE 'SHIP' ATTEMPT MUST HAVE A MANDATORY ZERO TRUST AUDIT + QWEN CODE REVIEW.
> UNTIL THIS TANGIBLY FULLY CLEARS — THE GOAL IS NOT COMPLETE."**

## THE LAW
**NO ship-ready / production-grade / merge / "done and verified" claim without BOTH:**
1. **a ZERO-TRUST AUDIT** (skill `zero-trust-audit`) — the claims table with REAL reproduction
   rows, the fraud hunt, an **independent blind subagent** (contaminated context = disqualified),
   the verdict VERIFIED / VERIFIED WITH CAVEATS / REFUTED; **AND**
2. **a QWEN CODE REVIEW** (skill `qwen-code-audit`) — a **COMPLETED** run at **0 critical / 0 high**.

## THE STATE MACHINE
```
BLOCKED  != PASS      PARTIAL != PASS      CLEARED == PASS (a COMPLETED 0-crit/0-high run)
```

## THE ORDER
fix the findings → **RE-RUN the gate** → the re-run's verdict IS the gate.
*Fixes then a silent re-claim = theater; fixes then a re-run = the gate.*

## THE COMPLETION LAW
The goal is **NOT complete** until the gate **tangibly fully clears**. FORBIDDEN: a scope shrink ·
BLOCKED-as-done · a partial-scope close · "zero bugs" as success · a green battery as capability.

## ★ THE CURRENT GATE STATE (2026-09-23) — ★★★ CLEARED
```
qwen-code-audit:  ★ COMPLETED — DONE rc=0
                  provider: muse-go-mimo (the ACTIVE HOST's key + the go gateway + mimo-v2.5)
                  files_reviewed: 34 · comments: 35 · elapsed 52m14s
                  ★ BY SEVERITY: 0 CRITICAL · 0 HIGH · 18 MEDIUM · 17 LOW
                  ★ THE 8 HIGH THAT BLOCKED THE EARLIER RUN ARE CLEARED.
                  ★ ALL 35 ADJUDICATED: the real ones FIXED (M-1/M-5/M-6/M-7/M-9/M-12);
                    M-18 was a FALSE POSITIVE (7.0.2 is the Go CLI with NO API);
                    L-4/5/17 were POSITIVE comments.
zero-trust-audit: COMPLETE — reports/ZERO_TRUST_AUDIT_6L2E.md (617 L)
                  11/11 claims + 9/9 by a blind subagent · 3 frauds FIXED · 8 HIGH FIXED
                  + §14 the gate clearance + the independent re-audit of the cleared state
★ THE GATE IS **CLEARED**: AUDIT GATE: PASS (0 critical / 0 high).
```
**THE STATE:** tsc exit 0 · 26 pass / 0 fail · 349 pass / 0 fail · consumed:7/8 ·
dist b2ab09acc77684e4805e41ebbadb67fa72ea705ad3f59904c230a06e25bd4fd3 · src_newer 0 · the dist-content gate PASS · the container MATCH.
## THE RETRY CONDITION
```
ocr review --from 640da98 --to HEAD --provider openrouter-laguna-s-free \
           --effort high --concurrency 1 --timeout 60 --format json
```
after the OpenRouter daily reset, or with a paid lane, at a **2-hour** cap.

# POST-COMPACTION_PROMPT — the fresh agent's entry sequence

**The dist SHA: b2ab09acc77684e4805e41ebbadb67fa72ea705ad3f59904c230a06e25bd4fd3**

You are resuming the GI Kernel v2.1 build. Read this; then read the docs in the order below;
then prove you read them; then execute. Do not ask questions the docs answer.

## 1 · THE MISSION

Wire, runtime-test and seal GI Kernel v2.1 — the Jev-in-the-loop runtime kernel. The core is
BUILT (`src/omp/fire-gate.ts:262`, 370 L; `src/omp/calibration.ts:38`, 185 L) and UNWIRED
(`grep -c FireGate src/omp/kernel-v2.ts` = 0). The 9 waves are in
`packages/gi-kernel-v2.1/06-WAVES.md`. W6 is BLOCKED on M2 (the operator's cost matrix).

## 2 · THE WORKSPACE ROOT

```
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
branch jarvis/gi-main · rig stupefied_morse @ omp-ct:master
```

## 3 · THE READING ORDER (numbered; read before any code)

```
1  context_management/COMPACTION_SURVIVAL.md     the resume anchor — the shape of the build
2  THIS doc                                      the entry sequence
3  context_management/CURRENT_STATE.md           the architecture as it IS + the proven inventory
4  context_management/BUILD_STATE.md             the SHA chain + the module inventory
5  context_management/EVIDENCE_STATE.md          what is PROVEN vs merely CLAIMED
6  context_management/DECISION_CHAIN.md          the operator's rulings VERBATIM
7  packages/gi-kernel-v2.1/GI_KERNEL_V2.1_MASTER_BLUEPRINT_v1.md   (862 L — the design)
8  packages/gi-kernel-v2.1/GI_KERNEL_V2.1_DPL1_SPEC.md             (505 L — the contract)
9  packages/gi-kernel-v2.1/06-WAVES.md                             (132 L — the waves)
10 .trident/CREATE_PIN_v2.1.txt                                    (145 L — the /goal pin)
```

## 4 · THE VERIFIED STATE (do-not-re-litigate)

```
battery      199 pass / 0 fail / 701 expect / 20 files
tsc          191 == the pre-session baseline, 0 NEW
dist sha     b2ab09acc77684e4805e41ebbadb67fa72ea705ad3f59904c230a06e25bd4fd3
container    199 pass / 0 fail / 705 expect (clean /tmp, no ambient keys)
checkpoint   Checkpoints/gi-kernel-v2.0-working-fire-gate-calibration-measured/ (175 files)
register     ok=false up=5/11 first=GI_LAYER_SEMANTICA
v2.1 core    fire-gate.ts 370 L · calibration.ts 185 L · WIRED: NO
```

## 5 · THE CRITICAL DOCTRINE (the operator's rulings, verbatim)

```
"destructive, dumb, or theatrical. explicitly all 3 of these."
"dumb and theatrical is 80% of the kernel's work."
"NO FUCKING STUPID FALLBACKS ANYWHERE IN THIS STACK. HARD DEPENDENCIES ON EVERYTHING."
"if it exists on github we can use it. period."
"1) both"    — the gate in BOTH positions (pre-act + post-detector)
"2) get proper measurements for everything. no guesses"
"CONTAINER. THATS WHY ITS THERE."
"whenever you ask me questions, you always provide the relevant context"
"each fire should be < 5000 tokens"
```

## 6 · THE BUILD PLAN (the waves — see 06-WAVES.md for the full gates)

```
W1 THE LEDGER      src/omp/fire-ledger.ts      test_ledger_row_written
W2 THE ORACLE      src/omp/oracle.ts           test_oracle_resolves
W3 POSITION A      fire-gate.ts + kernel-v2    test_advisory_open   ← lands FIRST (fail-open)
W4 POSITION B      kernel-v2.ts                test_gate_fire · test_gate_ignore
W5 THE POLICY      src/omp/policy-store.ts     test_policy_reload
W6 THE CALIBRATION calibration.ts (the loop)   test_calib_flips     ← ★ BLOCKED ON M2
W7 THE MEASUREMENT MEASUREMENT_PLAN.md         zero TBD rows
W8 THE CONTAINER   .trident/ct-v2.1/           test_clean_container ← produce the PHASE F ARTIFACT
W9 THE SEAL        packages/gi-kernel-v2.1/**  PACKAGE_AUDIT PASS
```

## 7 · THE ACCEPTANCE

```
· the battery 199/0 on the host AND in the container (the container produces the artifact)
· tsc 191 == baseline (0 new)
· every wave's named test green, verified by re-running it YOURSELF
· checkCalibrationHealth ok=true (after 50+ real firings)
· MEASUREMENT_PLAN.md with ZERO TBD rows
· PACKAGE_AUDIT PASS + a refreshed checkpoint
```

## 8 · THE OPERATING RULES

```
· EVIDENCE OR NOTHING — every verdict carries a quoted tool result (the row query, the
  artifact path, RC=0), never prose.
· THE CONTAINER IS THE RIG OF RECORD — and it produces the Phase F artifact
  (.trident/container-test-results.json), not terminal output.
· PARALLEL WAVES, DISJOINT FILES — interfaces land first; boundary checks at every
  dependency point; never dispatch a dependent on a CLAIMED-complete predecessor.
· THE BUILDER-UNDER-AUDIT LAW — re-run tsc/battery/casts yourself on the combined tree.
· NO GUESSES — every constant carries its derivation or the label UNCALIBRATED.
· MINIMAL CHANGE — the frozen surfaces (gate-hook.ts:117, graph-gate.ts:208) survive.
```

## 9 · THE DO-NOTs (the frozen list + the anti-patterns)

```
DO NOT register the gate before the engines — the register reads up=5/11 and STAGE 0 would
  refuse EVERY tool call on this host (gate-hook.ts:117 → kernel-v2.ts:57).
DO NOT choose a threshold — derive it (calibration.ts:38) or label it UNCALIBRATED.
DO NOT invent a component — gi_exec_graph was a name with no code (T-02).
DO NOT substitute a rig — the container is the contract (F-53, T-01).
DO NOT revert the hermetic fixture (src/hydra/__tests__/fx383-fixture.ts) to a /tmp dependency.
DO NOT re-open the proven machinery (CURRENT_STATE's proven-machinery inventory).
DO NOT cite a number without its instrument (the measurement law).
DO NOT save a checkpoint before its deliverable exists.
```

## 10 · THE FIRST ACTION (the proof-of-context)

Give a 5-line state summary naming ALL FIVE of these, then EXECUTE:
```
1  the dist sha (83eb7bba...)
2  the battery count (199 pass / 0 fail / 701 expect)
3  the v2.1 core's wiring state (fire-gate 370 L, calibration 185 L, 0 call sites)
4  which wave is FIRST and why it is fail-open (W3, the pre-act advisory)
5  what W6 is blocked on (M2 — the operator's cost matrix)
```
Then fire W1 the same turn. Do not stop between waves — drive W1 → W2 → W3 → W4 → W5,
re-running every gate yourself, and report at W6's blocker or at the seal.

## 11 · THE ANTI-DERAIL LIST (this project's known failures — do not re-live them)

```
A-1  THE RIG SUBSTITUTION — running a container-minted row host-side and calling it passed.
     Measured cost: the container then found TWO real defects. Use the named rig.
A-2  THE CHOSEN CONSTANT — publishing a threshold without its derivation. Measured cost:
     a 2x error that made the act band fire ZERO times (a gate that never fires looks
     exactly like a gate that works).
A-3  THE UNWIRED KERNEL — a module that exists, is tested, and is called by nothing.
     The detection: grep -c "FireGate" src/omp/kernel-v2.ts must be > 0 after W4.
A-4  THE INVENTED COMPONENT — naming a store that does not exist (gi_exec_graph).
A-5  SCOPE SHRINK under pressure — "too big" is never a finding; decompose instead.
A-6  APPROVAL-GATING required work — the remedy IS the work order; execute it.
A-7  THEORETICAL fixes without runs — a mechanism described but not executed is a claim.
A-8  BLIND / syntax-only coding — a grep or a file read is not a graph. Map first.
```

## 12 · THE ANTI-STOP LIST (these never close the run)

```
· STATIONARITY — "no change in N turns" is not done.
· A SUB-INNER PASS as complete — one wave's green with siblings open is progress.
· MEMORY-COMPLETE — "I already verified this" without a this-turn re-run is STALE.
· THEATER-COMPLETE — prose summaries, typed-but-unrun commands, verdicts without outputs.
· BLOCKED-AS-DONE — a block names its resume condition; it is never a stop.
· A PARTIAL-SCOPE close — the board must read all-green.
· "ZERO BUGS" as success — the push set must have run.
· AN EMPTY RUNTIME LEDGER — nothing was operated; it was inspected.
· A GREEN BATTERY as capability — the battery is an effort receipt.
```

## 13 · THE CONTAINER DISCIPLINE (the rig of record)

```
THE COMMAND   docker exec stupefied_morse sh -lc 'rm -rf /tmp/fx383; cd /work/gi && \
                /root/.bun/bin/bun test ./tests/ ./src/hydra/__tests__/'
STAGING       docker cp <src>/. <dest>/     ← the trailing /. copies CONTENTS.
              WITHOUT it, docker cp NESTS the directory (measured: __tests__/__tests__).
THE DEPS      bun add zod xstate (the container has no node_modules for /work/gi)
THE ARTIFACT  ★ THE DELIVERABLE IS .trident/container-test-results.json (Phase F), not the
              terminal output. The current run has terminal evidence ONLY.
```

## 14 · THE ECONOMICS (the operator's envelope, checked)

```
per fire          ~1,200-3,000 input tokens (the 18KB cap ≈ 4,500 tokens worst case)
fires per session ~100 · sessions per day 5 · fires per day ~500
cost per day      ~$0.021-0.063 at $0.042/1M input tokens
★ THE ENVELOPE HOLDS with headroom. The 18KB cap is the guard: a fire that would exceed it
  TRIMS (and reports the trim) rather than growing the bill.
★ THE ORACLE ADDS ~1 fire per resolution — batch resolutions at session end, not per firing.
```

## 15 · THE THREADS (durable memory, outside this project tree)

```
~/.omp/threads/store.sqlite
  omp/system-debugging/global-debug-log     EN-001..EN-047 (the bug ledger)
  omp/copilot-intelligence                   the operator-interface rules (D-06's standing
                                             rule: a question always carries its context)
  omp/copilot-agents                         the copilot machinery
READ THEM with: bun /home/leviathan/JARVIS_WORKSPACE/OMP/threads/omp-threads.ts \
                  micro-thread read system-debugging global-debug-log
```

## 16 · THE DENSITY NOTE (why this doc is not 400 lines)

This doc is the ENTRY SEQUENCE, not the encyclopedia. The depth lives in the blueprint
(862 L), the DPL1 spec (505 L), and the other canon docs. When this doc names a fact, the
detail is one read away — the referenced doc is named beside it. A fresh agent that wants
MORE reads: the blueprint (the design), the spec (the contract), CURRENT_STATE (the
architecture as it is), DECISION_CHAIN (the rulings verbatim).

---

## ★ V2.2 POST-COMPACTION (2026-09-26) — THE GRAPH IS A FUNCTION OF THE TARGET (COMPLETE)

**A fresh agent reads THIS first.**

**THE ONE CAPABILITY BUILT:** the GI kernel builds its graph FROM ANY TARGET (self-populating, content-scoped) + judges with JevK5 on the GPU + BLOCKS hallucinated completion.
**THE DoD (spec §2):** D1-D8 ALL GREEN. The register: the GI repo **7/8** PRODUCED · a foreign target **3/8** (was 0/8) · the container 0/8 all-named.
**dist:** `b2ab09acc77684e4805e41ebbadb67fa72ea705ad3f59904c230a06e25bd4fd3` · **checkpoint:** `Checkpoints/gi-kernel-v2.2-self-populate-d1d8-green/`.

**THE ENTRY SEQUENCE (run these, in order):**
```
cd /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
sha256sum extensions/graph-intelligence/index.js          # → 9a1635912a95583d…
bun scripts/gi-populate.ts --target <any project>         # the self-populate
bun scripts/consumption-audit.ts <that project> <a symbol> # → consumed:N/8 or named
bun run test                                              # the regression guard
```

**THE NEW SURFACE (do not re-invent):** `scripts/gi-populate.ts` · `scripts/typed-schema-init.ts` · `src/hunter/profile/source-roots.ts` · `src/omp/adapters/jevk5.ts` · `src/omp/claim-firewall.ts`.
**THE HONEST GAPS:** L2_ARSUMBRIS UNCONSUMED (the au-engine is at ~/.arsumbris) · semantica + c2kg DOWN on a foreign target · the container lacks the layer tooling · the store TTL (a reading is valid WITHIN the TTL).
**THE OPERATOR'S RULINGS:** the blueprint §6 (R1 GPU jevk5 · R3 no synthetic data · R4 scoped per target · R5/R6 the container on a real project · R7 no tool-blame · R8 it must work).

---
## V2.3 — THE RESUME POINT (2026-09-28)

**A fresh session reads, in order:**
1. `RECEIPT_V2.3.md` — the verdict (the predicate = REFLEXIVE).
2. `context_management/BUILD_STATE.md` — the dist, the seams, the state.
3. `Checkpoints/gi-kernel-v2.3-reflexive-kernel-7d4e9db8/CHECKPOINT_MANIFEST.md` — the seal + gaps.
4. `reports/GRAPH_GATE_live_forensic.md` — the runtime-grade hot seat (the 4 live gates).

**THE DIST TO RESTORE:** `7d4e9db83263ba22`. **THE BINDING SPEC:** `packages/gi-kernel-v2.3/GI_KERNEL_V2.3_DPL1_SPEC.md`.
**THE OPEN ITEM:** the S9 audit line + the CONTAINER domain. Resume from DISK.


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

## THE JEV LAYER — THE RESUME POINT (2026-09-29)

**WHAT IS DONE (verified this round, not claimed):** the Jev decision layer is WIRED and DEPLOYED.
- The 40-case corpus: **40/40, 0 misfires** (`bun scripts/gate-control-set.ts` → RC=0), including
  the operator's EXACT broken command VERBATIM.
- The deployed-bundle proof: **6/6** (`bun /tmp/deployed-gate-proof.ts`, sha `1cb47863`).
- The ledger: **259 rows, every one carrying a judge + confidence** (`~/.omp/run/gate-ledger.jsonl`).
- The F-144 container load: **0 failures** (was 3×).
- The deploys: omp-ct `1cb47863b810e400ccade4ff` · the GI ext `db9252e48f519a718ec8`.

**WHAT IS OPEN (named):** ★ ALL 4 GATES ARE WIRED (the sweep stamp below) · the ESCALATE
ladder not judge-gated (F-147) · the container cannot reach :8090 (F-148) · the AUDIT GATE line is
BLOCKED (no audit artifact) · the pre-existing `ledger-span` failure.

**THE FIRST COMMANDS A FRESH SESSION SHOULD RUN:**
```
cd /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
curl -s 127.0.0.1:8090/health                      # the judge must be LIVE (else the gates degrade)
bun scripts/gate-control-set.ts                    # the 40-case corpus → expect 40/40 RC=0
bun /tmp/deployed-gate-proof.ts                    # the deployed proof → expect 6/6 RC=0
sha256sum ~/.omp/agent/extensions/omp-ct/dist.js   # expect 1cb47863b810e400ccade4ff
wc -l ~/.omp/run/gate-ledger.jsonl                 # the ledger (rows carry Evidence.judge)
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
