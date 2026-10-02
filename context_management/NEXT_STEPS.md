<!-- 2026-10-03: the ship-package pass is closing; the 6L+2E is audited+deployed. -->
# ★ CURRENT FOCUS — 2026-10-03
1. The ship package: seal `Ship_Packages/gi-6l2e-…` (assembly + PACKAGE_AUDIT PASS).
2. Deploy + hotseat: the extension is deployed (`879cbbf80b9d9682`); run the live hotseat next.
3. Residuals (honest, low): the c2kg pipeline duplication (LOW audit); the corbell/graphify
   per-test flake (raise the timeout or warm the CLI).

# NEXT_STEPS — the queued work (as of 2026-09-30)

## WAVE A — THE SCOPED-CLEAN AUDIT (host-suite leg: 15/15 stub + live; the audit artifact leg still BLOCKED) (the audit gate is BLOCKED)
- done-when: `AUDIT GATE: PASS (0 critical/high)` quoted from `artifacts/sg-ocr-<new>.json` scoped at the JEV wire files (`jev.ts`, `gate-hook.ts`, `gate-control-set.ts`, `tool-gate.ts`, the 3 gate wirings, the lazy-compiler fix), single-JSON.
- evidence: the artifact path + the session + the counts + the F/EN/V wiring.

## WAVE B — THE RESIDUAL GATES (F-147 / F-150 / F-151)
- F-147: put the tracker state into the judge's question so an escalated session still gets a verdict on the CURRENT command.
- F-150: exclude metadata reads (`inspect`, `logs`, `top`, `port`) from CONTAINER_VERB_RE or route them through the judge as INFO.
- F-151: the judge must distinguish "the text IS the act" from "the text DESCRIBES the act" (the ABIDE catalogue case).
- done-when: each fixed + re-proven on the real path (the corpus + the proof re-run green).

## WAVE C — PERMANENCE (the bridge + the TTSR deploy path)
- the socat bridge as a systemd unit (or `--host 0.0.0.0` on jevk5-systemone.service); the TTSR rules deploy path into fresh rigs.
- done-when: `systemctl is-active` after a restart + the container health probe ok.

## WAVE D — THE PRE-EXISTING ledger-span
- the events-ledger row schema (10 fields exactly) — proven pre-existing by stash.
- done-when: the pbk suite reads 402/0.

## THE RISK REGISTER
- the audit lane intermittently returns OCR_JSON_ABSENT (retry, never upgrade to PASS).
- the `nohup` socat bridge dies on reboot (WAVE C closes this).
- the in-memory bundle holds until a clean boot (F-142 — document, never fight).

# NEXT_STEPS — the W1-W9 wave plan + the risk register

**The dist SHA: 04840c57105a7837d8c7b6411fbdb9d5c630182ea6917c3369231c6b216aed606918125a2b6be3bc37353d8bf6bd73f98b347b37e81ffd9b044f52f7c318a3065e0bd5bc3a4d0fae380b0716db024cd0044f52f7c318a3065e0bd5bc3a4d0fae380b0716db024cd04cfec2abe89bf9db3ac81066ef18a9c37fc3454cec6ddb264cfec2abe89bf9db3ac81066ef18a9c37fc3454cec6ddb264cfec2abe89bf9db3ac81066ef18a9c37fc3454cec6ddb26bcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24bcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24cf5e3903f63bfd3d0a846e3d83b39917d05d1c3e65b1b001e9f97a81a179fd995cfac412934e55c170e87a46740123fc062390e2a74c9030bf00c3300eb6afd144d39503509340e0506a15c873a3df28324da8eb35147460074279422bb7db7d0d2cf04f7a0bcf4a335244102fff15275fbdfa0c9392d50cbc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21baf927aeb9dfeaa067fd92327bfa26cc791740ad33901041e1c94c40a329ae170ba29f71b3c63c7f258b9b948ce09c8854ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f**
**Authority: packages/gi-kernel-v2.1/06-WAVES.md (WAVES: 9) + the DPL1 spec S4.**

## THE WAVES (parallel where files are disjoint; interfaces land first)

```
W1 THE LEDGER      src/omp/fire-ledger.ts (NEW) · fire-gate.ts (the writer)
                   DELIVERS the fire_decisions table + the append; laterTruth defaults
                   "unresolved"; indices on (rule_id, later_truth) and (state_hash)
                   GATE: test_ledger_row_written · a live row query
                   BLOCKER: none

W2 THE ORACLE      src/omp/oracle.ts (NEW)
                   DELIVERS resolve(row) → reads the downstream evidence (a later edit to
                   the target, a test run, a withdrawal, a downstream permit) → writes
                   confirmed|refuted|unresolved. Starts with the MPSE-decidable outcomes.
                   GATE: test_oracle_resolves · one real firing resolved end-to-end
                   BLOCKER: W1

W3 POSITION A      src/omp/fire-gate.ts (the intent path) · kernel-v2.ts (MODIFIED)
  (pre-act)        DELIVERS a Fire built from INTENT, judged BEFORE the act, fail-OPEN
                   GATE: test_advisory_open · an advisory fires on an intended blind edit
                   BLOCKER: W2 · ★ lands FIRST because fail-open cannot break anything

W4 POSITION B      src/omp/kernel-v2.ts (MODIFIED — the gate on each VIOLATION)
  (post-detector)  DELIVERS the gate between the detector's VIOLATION and the v2.0 verdict
                   GATE: test_gate_fire · test_gate_ignore · grep -c FireGate > 0
                   BLOCKER: W3

W5 THE POLICY      src/omp/policy-store.ts (NEW) · policies/*.json
                   DELIVERS versioned JSON recipes (D026: data, not code); a policy edit
                   reloads without a rebuild AND changes the cache key
                   GATE: test_policy_reload
                   BLOCKER: W4

W6 THE CALIBRATION src/omp/calibration.ts (the loop)
                   DELIVERS 50+ real firings → the oracle resolves → derivePolicy flips
                   GATE: test_calib_flips · checkCalibrationHealth ok=true
                   BLOCKER: ★ M2 (the operator's cost matrix) + W5

W7 THE MEASUREMENT MEASUREMENT_PLAN.md (filled)
                   DELIVERS M1-M12, every row a number; M11 needs a human sampling session
                   GATE: zero TBD rows
                   BLOCKER: W6

W8 THE CONTAINER   .trident/ct-v2.1/cycle-1/ (the ARTIFACT, not terminal output)
                   DELIVERS the whole loop in omp-ct:master + the Phase F artifact
                   GATE: test_clean_container · 199+/0 in-container + the artifact JSON
                   BLOCKER: W7

W9 THE SEAL        packages/gi-kernel-v2.1/** + SHIP_PACKAGES/
                   DELIVERS the v2.1 package + PACKAGE_AUDIT PASS + the checkpoint refresh
                   GATE: the audit verdict
                   BLOCKER: W8
```

## THE FILES TO TOUCH (each with the change + the blast radius)

```
src/omp/fire-ledger.ts      NEW — the DDL + the append.  blast: none (new)
src/omp/oracle.ts           NEW — the resolution path.   blast: the ledger only
src/omp/fire-gate.ts        the intent path (W3).        blast: fire-gate consumers
src/omp/kernel-v2.ts        THE WIRING (W3+W4).          blast: ★ EVERY tool call when
                            registered. The frozen surfaces must survive:
                            gate-hook.ts:117 the single call site; graph-gate.ts:208 the
                            tier ladder; the 3 PROPOSED hooks.
src/omp/policy-store.ts     NEW — the data recipes.      blast: the gate's thresholds only
```

## THE TEST PLAN THAT DEFINES DONE

```
L0  tsc --noEmit                      191 == baseline (0 new)
L1  unit — the PURE maths             bun test -t test_calib_flips
L2  script — real modules + a real sandbox
      bun test -t test_gate_fire · test_gate_ignore · test_ledger_row_written ·
                  test_advisory_open · test_oracle_resolves · test_policy_reload
L3  container (omp-ct:master)         test_clean_container → 199+/0 + THE PHASE F ARTIFACT
L4  host-live                          the 7 RB angles with tool-result tokens
ADVERSARIAL FIRST (the red-team law): the attack shapes before the happy path.
POSITIVE + NEGATIVE halves: a real violation FIRES; a paired false positive IGNOREs.
```

## THE RISK REGISTER (what could go wrong + the mitigation)

```
R1 ★ THE WIRING ORDER — register the gate before the engines and STAGE 0 refuses every
   tool call on this host (measured: the register reads up=5/11).
   MITIGATION: W3 (fail-open) lands first; the register stays up=5/11 until the engines are
   installed; the gate's fail polarity is per-surface.
R2 THE THRESHOLDS — the seeds fire the act band ZERO times (the 2x error, EN-047).
   MITIGATION: W6 + M2; until then every policy carries calibrated=false with the basis.
R3 THE FROZEN SURFACES — the wiring could break gate-hook.ts:117 or graph-gate.ts:208.
   MITIGATION: the v1.3 gate suite (12/12) runs after every wiring change.
R4 THE CONTAINER ARTIFACT — the Phase F artifact was never written.
   MITIGATION: W8 produces it; until then the evidence is marked as terminal output.
R5 THE COST — a Jev call per fire at ~500 fires/day ≈ 2 cents (accepted).
   MITIGATION: the cache (D013) + the MPSE settlement + the 18KB cap.
R6 THE ORACLE'S COST — 1 fire per resolution doubles the burn.
   MITIGATION: resolve in batches at session end, not per firing.
```

## THE GATE TO CLEAR

```
★ M2 — THE COST MATRIX. The operator's answer to: "when this rule is wrong, which error
  costs more, and by how much?" per class (destructive / dumb / theatrical).
  Until it arrives: W1-W5 are unblocked and buildable; W6 waits.
```

## THE WAVE-BY-WAVE EXECUTION DETAIL (the exact shape of each)

```
W1 THE LEDGER — why first: nothing else can be calibrated, audited or counted without a row.
   THE DDL (blueprint S8.2): fire_decisions(id, at, rule_id, cls, question_version,
   probability, band, action, policy_name, act_threshold, flag_threshold, state_hash,
   cost_usd, later_truth, truth_at) + two indices: (rule_id, later_truth) and (state_hash).
   THE WRITER hooks FireGate's existing ledger array (fire-gate.ts:344 rows()) — the table
   is a PERSISTENCE of what the gate already builds in memory.
   TEST: test_ledger_row_written — fire once, query the table, assert one row with
   laterTruth='unresolved'.

W2 THE ORACLE — why second: the rows must exist before they can be resolved.
   THE EVIDENCE GATHERERS (four, each a query over the session record):
     (a) a later edit touched the same target within T
     (b) a test/verify tool ran after the firing
     (c) the claim was withdrawn or restated WITH a span
     (d) a downstream gate permitted the act
   THE CLASSIFICATION: any (a)-(d) → confirmed | refuted; none → unresolved.
   ★ REFUTED REQUIRES A SECOND SIGNAL — never merely the absence of complaint.
   TEST: test_oracle_resolves — one real firing resolved with its evidence recorded.

W3 POSITION A (the pre-act advisory) — why BEFORE W4: fail-OPEN cannot break anything, so
   the live path is exercised while the filter is still being built.
   THE SHAPE: a Fire built from the INTENT (tool + target + the classifier's read), judged
   BEFORE the act runs. A FIRE verdict on an advisory = the act is refused pre-emptively.
   TEST: test_advisory_open — an intended blind edit gets an advisory; a legitimate intent
   passes with zero friction.

W4 POSITION B (the post-detector filter) — THE WIRING.
   THE CALL SITE: inside runKernelV2, between the detector's VIOLATION (kernel-v2.ts:299)
   and the verdict mapping (:328). For each detector outcome with verdict != PASS:
   build a Fire, call FireGate.judge, and let the ACTION modulate the verdict.
   ★ THE FROZEN SURFACES: gate-hook.ts:117 (the single call site) stays 1;
   graph-gate.ts:208 (the tier ladder) survives; the 3 PROPOSED hooks :247/:250/:254 remain.
   THE ANTI-PATTERN DETECTION: grep -c "FireGate" src/omp/kernel-v2.ts > 0.
   TEST: test_gate_fire (a real violation adjudicated FIRE) + test_gate_ignore (a paired
   false positive IGNORED).

W5 THE POLICY STORE (D026: data, not code) — a versioned JSON recipe per rule; a human edits
   it without a rebuild; the edit changes the cache key (L12).
   TEST: test_policy_reload — edit the JSON, assert the band changes on a STORED
   probability (the reroute path, no re-inference).

W6 THE CALIBRATION — ★ BLOCKED ON M2. Once the cost matrix arrives: set DEFAULT_PROFILES'
   costs, run 50+ real firings, let the oracle resolve, and derivePolicy flips
   calibrated=true on its own.
   TEST: test_calib_flips + checkCalibrationHealth ok=true with zero findings.

W7 THE MEASUREMENT — M1-M12 (MEASUREMENT_PLAN.md). M11 needs a HUMAN session: sample the
   IGNORE rows and label them. That is the only view of the gate's silent false negatives.

W8 THE CONTAINER — the whole loop in omp-ct:master AND the Phase F ARTIFACT
   (.trident/container-test-results.json) — the artifact is the deliverable, not the
   terminal output. Stage with `docker cp src/. <dest>/` (the trailing slash).

W9 THE SEAL — the package + PACKAGE_AUDIT + a checkpoint refresh AFTER the deliverable.
```

## THE RISK REGISTER — THE FULL FORM (each: the trigger, the blast, the mitigation)

```
R1  THE WIRING ORDER     trigger: registering the gate while up=5/11
    blast: STAGE 0 refuses EVERY tool call on this host — the agent stops working
    mitigation: W3 lands first (fail-open); the register stays measured; the polarity is
    per-surface; and the wiring is a SEPARATE wave from the ledger work.
R2  THE STARVATION TRAP  trigger: keeping the seeds
    blast: the act band never fires; the ledger looks calm while every violation passes
    mitigation: M2 + W6; until then every policy carries calibrated=false + the basis.
R3  THE FROZEN SURFACES  trigger: the W4 edit
    blast: the v1.3 behaviour changes silently (the single call site, the tier ladder)
    mitigation: the v1.3 gate suite (12/12) after every wiring change; grep the call-site
    count after every edit.
R4  THE CONTAINER FAKE   trigger: running the rows by hand again
    blast: terminal evidence is not the artifact; the next session cannot verify
    mitigation: W8 produces .trident/container-test-results.json via the rig.
R5  THE COST             trigger: a Jev call per fire + per resolution
    blast: ~2x the token burn (still ~4 cents/day at the envelope)
    mitigation: the cache (D013) + the MPSE settlement + batching the oracle at session end.
R6  THE CANON DRIFT      trigger: docs updated at session end
    blast: the next agent reads a stale SHA and builds on fiction
    mitigation: the cross-consistency gate (5b) before any prep; the 2 logs at the moment.
```

## THE DONE-WHEN, CONSOLIDATED (the terminal gate)

```
ALL of: the battery 199+/0 on the host AND the container (with the Phase F artifact) ·
tsc 191 == baseline · every wave's named test green verified BY RE-RUNNING IT YOURSELF ·
checkCalibrationHealth ok=true · MEASUREMENT_PLAN.md with ZERO TBD · PACKAGE_AUDIT PASS ·
a checkpoint refreshed AFTER the seal exists.
```

## ★ V2.2 NEXT STEPS (2026-09-26)

**STATE:** the V2.2 rebuild is COMPLETE (D1-D8 green). The kernel self-populates from any target.

**THE QUEUED WORK (for a future session — none blocking the V2.2 completion):**
1. **L2_ARSUMBRIS scoping** — the au-engine lives at `~/.arsumbris/au-engine/run`; scope it per-target so the GI repo reads 8/8.
2. **semantica on a foreign target** — install the `semantica` module into the venv so the L1 layer builds anywhere.
3. **c2kg portability** — the Java producer resolves its toolkit target-relative; make it repo-relative so a foreign target can build L4.
4. **the container rig** — ship the layer tooling (a slim corbell venv) so omp-ct-gi20 can self-populate.
5. **the TTL tuning** — the SC-7 staleness TTL is short; a longer TTL (per derivation class) keeps a reading valid longer.
6. **the 2 remaining battery failures** — the audit-coverage artifact (regenerate on each ship) + the buildregistry KEV-plant (updated for the jevk5 ladder).

---
## V2.3 — NEXT (2026-09-28)

1. **S9/S12 close:** when the whole-tree audit completes, land the `AUDIT GATE:` line in TESTING_LOG;
   the battery's 2 fails (`st-w3-audit` = the audit artifact; `st-artifact-coverage` = fixed by the
   rebuild) resolve with it.
2. **THE CONTAINER DOMAIN:** the runtime-testing ladder's domain 3 (omp-ct-gi20) — the LSP driven
   on a real project in a clean rig.
3. **A-2..A-6 of the claim firewall:** scoped in the spec; A-1 (the headline) is fixed.
4. **The OMP-TUI consumption (S2):** observe the gi-lsp diagnostics through the live OMP client
   (config-proven today; TUI-observation owed).


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

## NEXT STEPS (the JEV layer — what remains, in order)

1. **WIRE THE REMAINING 2 GATES** — the container gate (`middleware/container-gate.ts`) + the graph
   gate (`src/omp/gate-middleware.ts` `runGraphGate`): the same candidate → judge → enforcer shape.
2. **THE ESCALATE LADDER (F-147)** — put the tracker state into the judge's question so a session
   already escalated still gets the judge's verdict on the CURRENT command.
3. **THE HOST-BRIDGE (F-148)** — a socat forwarder so the container's gate can reach :8090 (the
   in-container judge proof).
4. **THE AUDIT GATE** — run the code-audit lane (ocr/qwen) over this round's diff; TESTING_LOG's
   line is currently BLOCKED (honest). A FAIL blocks any ship-ready claim.
5. **THE PRE-EXISTING `ledger-span` FAILURE** — the events-ledger row schema (10 fields exactly);
   not this round's, but it keeps the pbk-v2 suite red.
6. **THE RUNTIME SEAT, COMPLETED** — drive the live gate first-person in a session whose model lane
   is healthy (the hub-spawn session stalled on DeepSeek/Verboo).

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
