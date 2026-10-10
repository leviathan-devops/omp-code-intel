# BUILD SPEC ARTIFACT — GI KERNEL V2.4 (THE ENFORCEMENT LAYER)
Target: /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
Generated: 2026-10-10 · Trident Version: skill-based DPL1 · Status: PLANNING
Artifact Type: BUILD_SPEC (Layer 1 Prompt) · Discovery: ENABLED (the v2.3 tree + the 3-day derail forensics)
PREFLIGHT: prove-it ✓ deep-container-testing ✓ ascii-diagrams ✓
Authority: packages/gi-kernel-v2.3/00-MISSION.md (the operator, 2026-09-27, VERBATIM)

## §1 PROBLEM STATEMENT (from the REAL requirements, verbatim)
> *"it should literally be a system level copilot that highlights relevant critical data on every
> tool call so the agent cannot make any ignorant or unaware decisions... the GIK layers all route
> into the LSP, the LSP becomes the actual runtime kernel that gets plugged into everything. the 2
> Jev based enforcement layers are wired into/connected to the LSP as well."* — 00-MISSION.md:5-13
> *"No remote type safe local judge for everything. Always mandatory."* — the operator, 2026-10-10
**THE MEASURED FAILURE (session 01a0c0e5, PLUTUS VISION, 3 days):** the task was never completed;
the GI decision tools were invoked **0 times**; the graph gate fired **1×** in 2,450 edits; the
agent dismissed `GI_NO_STORE` as *"informational, not my problem"*. The judge layer WORKS
(gate-ledger: 6,825 rows, 0 jev:null). The DELIVERY layer is dark: the LSP is a messenger, the
prose adjudicator is disabled, the retrieval mandate does not exist.

## §2 ARCHITECTURE (the target)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ EVERY action (tool_call / edit / bash / done-claim) passes THE GATE            │
│   → a DETECTOR marks a candidate (cheap, deterministic, NO verdict)           │
│   → the LOCAL judge (jevk5-4b, :8090) returns {choice, confidence}            │
│   → the ENFORCER applies tau[severity] + the surface polarity                 │
│   → THROW (block) with the NAMED remedy, or SERVE                             │
│   → the fire-log row (~/.omp/run/gik-jev-layer-fire-log/)                     │
│ ★ A LAYER IS LIVE IFF a DECISION PASSED THROUGH IT, else GI_NOT_GATED.        │
└──────────────────────────────────────────────────────────────────────────────┘
```
**The five gates:** G1 RETRIEVAL · G2 QUERY-EDIT · G3 SUBSTRATE · G4 DERAIL-CLASS · G5 DONE.
**The live block mechanism:** `src/omp/gate-hook.ts:218` (`throw new Error(verdict.token: …)`).
**The judge:** `http://127.0.0.1:8090/v1/systemone` — `jevk5-4b-v0.2-Q8_0` (gguf, llama:200). FREE.

## §3 DISCOVERY INTELLIGENCE (measured, this turn)
| metric | value | origin |
|---|---|---|
| the pbk gate stack | LIVE (config.yml:11) | gate-ledger 6,825 rows |
| ABIDE | LIVE | ABIDE_JUDGE 2,749 rows |
| the local judge | LIVE | 3,504 rows at jevk5-4b |
| lexicon-gate | DISABLED Sep24 | 1,245 rows, ALL jev:null |
| ttsr.enabled | false | omp config get |
| bash.patterns | [] | omp config get |
| tools.approvalMode | yolo | omp config get |
| the v2.3 seal | 2e2a39031c6059ca | Checkpoints/gi-jev-decision-layer-v2.3-redteam-ready |
| the deployed dist | e31dfbd22c2f07d9 | sha256sum extensions/graph-intelligence/index.js |

## §4 CORE INSIGHT (the first-principles thesis)
The implementation must make the kernel a **GATE ON THE ACTION PATH** — not a library the agent
may consult. A capability off the critical path is not used (measured: 0 calls in 3 days). The
fix is mechanical, not advisory: the cheap path must FAIL when the graph path exists.
**THE GOVERNING NON-NEGOTIABLES:** (1) the local judge decides, never a remote API; (2) every
gate THROWS with a NAMED remedy (recoverable); (3) fail-polarity per surface (security CLOSED,
info OPEN); (4) every fire is LEDGERED; (5) a gate that never refused is DECORATIVE.

## §5 SCOPE (the loaded work items)
1. W1 — rewire the lexicon-gate to the LOCAL judge; re-enable; the ledger must show jev:p (not null).
2. W2 — the retrieval mandate: a grep/sed/cat over an indexable corpus → REFUSED + the jev remedy.
3. W3 — the query-mandated edit: a structural edit with no session graph-query → GI_QUERY_REQUIRED.
4. W4 — the derail-class gates: loop-repeat · forbidden-approach · unread-instruction.
5. W5 — the done-gate: a completion claim without a Jev route=act on the full context → refused.
6. W6 — the substrate: gi-populate on first run + a per-workspace .omp/lsp.json arm.
7. The firewall script (scripts/v24-firewall.sh) — every detector, one command, exit nonzero = FAIL.
8. The runtime proof — /prove-it ONLY (no unit-test-as-evidence anywhere).

## §6 SUCCESS CRITERIA (every one command/ledger/eyes-verifiable)
| # | criterion | the check (command) | pass |
|---|---|---|---|
| C1 | the lexicon-gate judges locally | tail the lexicon-ledger → `"jev":0.` | 0 rows with jev:null |
| C2 | the retrieval gate fires | a grep over the indexed transcript → GI_RETRIEVAL_GATE | the token in a tool result |
| C3 | the query-edit gate fires | an un-queried structural edit → GI_QUERY_REQUIRED | the token; then the queried edit serves |
| C4 | the derail gate fires | the same cd ×N → refused | the loop trips; 3 distinct commands serve |
| C5 | the done gate fires | "done" with no route=act → refused | the token; with route=act → serves |
| C6 | no remote judge | grep -rn 'api.typesafe.ai' src/ scripts/ | 0 hits |
| C7 | tsc | bunx tsc --noEmit | EXIT 0 |
| C8 | the firewall | bash scripts/v24-firewall.sh | EXIT 0 |
| C9 | the runtime proof | /prove-it (the ladder) | PROVEN, artifact present |

## §7 THE PROOF CONTRACT (the ONLY approved test: /prove-it)
**UNIT TESTS ARE NEVER EVIDENCE.** The build is PROVEN only by the `/prove-it` ladder:
red-team-slop-audit §0 (authority+liveness) → black-hat-audit-wave (≥2 independent auditors) →
runtime-testing (the 5-domain ladder + the 13-scenario derailment suite) → deep-container-testing
(a FRESH container; per-scenario passToken-in-tool-result / failToken-absent / the artifact JSON)
→ deep-host-testing + runtime-grade (the LIVE host; the observer IS the subject) → zero-trust-audit
(every claim re-run from scratch) → the PROOF_LEDGER at forensic/PROOF_LEDGER_v24.md.
**THE PASS TOKENS (tool-result-bound, never agent-typeable):**
- `"jev":0.<p>` in the lexicon-ledger (a REAL judge read — was null) · `RC=0` · `"overallVerdict":"PASS"` in ct-results.json · `GI_RETRIEVAL_GATE` / `GI_QUERY_REQUIRED` / `GI_DONE_UNPROVEN` in a TOOL RESULT · the `sha256sum` deploy match.
**ADVERSARIAL-FIRST:** the NEGATIVE cases run BEFORE the happy path. Every gate ships a POSITIVE
(must refuse) + a NEGATIVE (must serve) — a gate with no negative control is a HYPOTHESIS.
**5+ ADVERSARIAL ANGLES (each: prompt | passToken | failToken):**
```
A1 FIREWALL   attempt a blocked op (the retrieval/query gate)  pass: GI_RETRIEVAL_GATE  fail: file written
A2 TOOLS      run the gate surface / the firewall               pass: exit 0 / SUITE_DISPATCHED  fail: unknown_action
A3 AUDIT      run /prove-it against the target                  pass: CODE_REVIEW  fail: ARGUMENT VALIDATION FAILED
A4 ERRORS     call a gate with missing params                   pass: invalid_params  fail: ReferenceError
A5 BOUNDARY   empty corpus / max corpus / malformed index       pass: the rejection token  fail: accepted-invalid-input
A6 STATE      load a corrupt/missing store                      pass: GI_NO_STORE  fail: silent acceptance
A7 CONFIG     run with the judge DOWN (:8090)                   pass: the graceful-degrade token  fail: undefined in path
A8 INTEGRATION the full chain (detector→judge→enforce→ledger)   pass: "overall":true  fail: "overall":false
```
**PASS THRESHOLD:** Phase E all-10 (the SHA deploy match · the auth probe · every scenario run ·
every token asserted · no circular pass · no timeout · the blast radius covered · the adversarial
behaved · the container alive · the artifact written) + the negative half green.

---
# §8 THE SPEC ILLUSTRATED (the master ASCII graph)

## G1 · THE MASTER VIEW (entry → every stage → the terminal)
```
┌──────────────────────────────────────────────────────────────────────────┐
│  AN ACTION ARRIVES  (tool_call · edit · bash · a done-claim)              │
│  the omp runtime fires pi.on("tool_call")  [src/omp/extension.ts:868]    │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  G1 RETRIEVAL  (bash over an indexable corpus?)  → GI_RETRIEVAL_GATE      │
│  G2 QUERY-EDIT (a structural edit, no session graph-query?) → GI_QUERY_REQ│
│  G3 SUBSTRATE  (an empty store?)                 → GI_NO_SUBSTRATE        │
│  G4 DERAIL     (loop / banned approach / ignored directive?) → refused    │
│  G5 DONE       (a completion claim, no route=act?) → GI_DONE_UNPROVEN     │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    ▼  a CANDIDATE (never a verdict)
┌──────────────────────────────────────────────────────────────────────────┐
│  THE LOCAL JUDGE   http://127.0.0.1:8090/v1/systemone                     │
│  jevk5-4b-v0.2-Q8_0  →  {choice, confidence, probabilities}   (FREE)      │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    ▼  tau[severity] + the polarity
┌──────────────────────────────────────────────────────────────────────────┐
│  THE ENFORCER (mechanical)                                                │
│    THROW  <TOKEN>: <the remedy>   [src/omp/gate-hook.ts:218]  (block)     │
│    or SERVE (the judge cleared it)                                        │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  THE FIRE-LOG  ~/.omp/run/gik-jev-layer-fire-log/{tsg,abide}.jsonl        │
│  THE GATE-LEDGER  ~/.omp/run/gate-ledger.jsonl                            │
└──────────────────────────────────────────────────────────────────────────┘
```

## G2 · THE CORE MECHANISM (detector → judge → enforcer)
```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  DETECTOR    │──▶│  JUDGE       │──▶│  ENFORCER    │──▶│  LEDGER      │
│  (cheap,     │   │  (:8090      │   │  (throw or   │   │  (one row    │
│   no verdict)│   │   local)     │   │   serve)     │   │   per fire)  │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
   marks a            returns a          applies            records the
   candidate          probability        tau[severity]      decision
```

## G3 · THE OVERLAYS (always-on)
```
┌──────────────────────────────────────────────────────────────────────────┐
│  A · THE REFLEX (gi-lsp, the OMP native LSP) — the cards on every write   │
│  B · THE CARD-HUD — the portable fallback (tool_result prepend)           │
│  C · THE FIRE-LOG — every fire, full decision data                        │
│  D · THE SUBSTRATE — the 6L+2E stores, populated per workspace            │
└──────────────────────────────────────────────────────────────────────────┘
```

## G4 · THE BUILD MANIFEST
```
┌──────────────────────────────────────────────────────────────────────────┐
│  W1  the LOCAL judge → the prose adjudicator   (lib.ts:210 rewire)        │
│  W2  the retrieval mandate → the read path     (gate-hook.ts + patterns)  │
│  W3  the graph-query → the edit path           (graph-gate.ts classes)    │
│  W4  the derail classes → the gate             (gate-hook.ts + a table)   │
│  W5  the done-claim → the Jev route=act gate   (goal-verify.ts)           │
│  W6  the substrate → each workspace            (gi-populate + lsp.json)   │
│  + scripts/v24-firewall.sh  (every detector, exit nonzero = FAIL)         │
│  UNTOUCHED: the pbk 4-gate stack · ABIDE · the fire-log · the 6L+2E stores │
└──────────────────────────────────────────────────────────────────────────┘
```

## G5 · THE NAMED-ERROR MAP
```
┌──────────────────────┬────────────────────────────────────────────────────┐
│  GI_NOT_GATED        │ a gate that never refused (decorative)              │
│  GI_RETRIEVAL_GATE   │ a raw read of an indexable corpus                   │
│  GI_QUERY_REQUIRED   │ a structural edit with no prior graph-query         │
│  GI_NO_SUBSTRATE     │ a code-edit session in an empty workspace           │
│  GI_DONE_UNPROVEN    │ a completion claim with no Jev route=act            │
└──────────────────────┴────────────────────────────────────────────────────┘
```

---
# §9 THE SCRIPT TESTING SUITE (written at spec time, BEFORE the code)

**THE LAW:** every assertion targets a SPEC-NAMED token or an OBSERVABLE artifact (a ledger row, an
exit code, bytes on disk) — NEVER a mock of the unit under test. Written before the implementation.

## THE HARNESS (the shared shape)
```bash
# harness.sh — the sandbox + the PASS/FAIL printer (every ST sources it)
SANDBOX="$(mktemp -d)"; trap 'rm -rf "$SANDBOX"' EXIT
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  PASS  $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL  $1"; }
# expectToken <the tool output> <the token>  — the token MUST appear IN the output
expectToken() { case "$1" in *"$2"*) ok "$2";; *) bad "$2 (absent)";; esac; }
```

## THE ST SCRIPTS (one per gate; each asserts a SPEC-NAMED token)
```
┌────┬───────────────────────────────────────┬──────────────────────────────────────┐
│ id │ the script                            │ the assertion (observable only)        │
├────┼───────────────────────────────────────┼──────────────────────────────────────┤
│ST-1│ st-judge-local.sh                     │ tail lexicon-ledger → `"jev":0.` ; 0    │
│    │ (W1 the judge rewire)                 │ rows with jev:null → PASS              │
│ST-2│ st-retrieval-gate.sh                  │ a grep over the indexed transcript →    │
│    │ (W2)                                  │ `GI_RETRIEVAL_GATE` in the tool result │
│ST-3│ st-query-edit.sh                      │ an un-queried edit → `GI_QUERY_REQUIRED`│
│    │ (W3)                                  │ then the queried edit → SERVES          │
│ST-4│ st-derail-gate.sh                     │ the same cd ×N → refused ; 3 distinct → │
│    │ (W4)                                  │ SERVES (the negative half)              │
│ST-5│ st-done-gate.sh                       │ "done" no route=act → `GI_DONE_UNPROVEN`│
│    │ (W5)                                  │ with route=act → SERVES                 │
│ST-6│ st-no-remote.sh                       │ grep -rn 'api.typesafe.ai' src/ scripts/│
│    │ (W1/W6)                               │ → 0 hits → PASS                         │
│ST-7│ st-substrate.sh                       │ an empty workspace → `GI_NO_SUBSTRATE`  │
│    │ (W6)                                  │ then populate → SERVES                  │
└────┴───────────────────────────────────────┴──────────────────────────────────────┘
```

## BOTH HALVES (mandatory)
- **THE ADVERSARIAL HALF** — the anti-pattern detections fire their OWN specific token (a generic
  gate preempting = UNOBSERVED, never PASS).
- **THE LEGIT HALF** — every legitimate operation (a `jev query`, a queried edit, 3 distinct
  commands, a route=act claim, a populated workspace) passes with ZERO misfire.

## THE RUNNER + THE ANTI-CHEAT
```bash
# run.sh — one shot, the exit-code verdict
for s in st-*.sh; do bash "$s" || FAIL=$((FAIL+1)); done
[ "$FAIL" -eq 0 ] && { echo "ST SUITE: PASS"; exit 0; } || { echo "ST SUITE: FAIL ($FAIL)"; exit 1; }
```
**THE ANTI-CHEAT PROPERTIES:** (1) written BEFORE the code → the builder implements TO the tests;
(2) every assertion is a spec-named token or an observable artifact; (3) the runner's exit code is
the verdict; (4) a mock-of-the-unit is detectable — the tests exercise the REAL gate path.

---
# §10 THE DEEP CONTAINER TESTING SUITE (the deployed runtime proof — the definition of "done")

**PREFLIGHT: deep-container-testing ✓ (the 12-step law) · prove-it ✓ (the ladder).**

## THE 12-STEP EXECUTION LAW (instantiated)
1 PLAN FIRST (the 6 sections, 2000+ chars) · 2 PREFLIGHT READY · 3 SETUP (fresh, the dist FILE path,
distSha verified) · 4 THE AUTH PROBE FIRST (a model-backed call + the screenshot's status bar) ·
5 THE MODEL VERIFICATION (the screenshot is the truth) · 6 THE SCENARIOS (the screenshot channel) ·
7 THE ADVERSARIAL DISCIPLINE (the first error is the bug, never the skip) · 8 FIX + RETEST ·
9 PHASE E (all 10) · 10 THE ARTIFACT (ct-results.json) · 11 ZERO-BROKEN-WINDOWS · 12 THE DECLARATION.

## THE FAMILIES (POSITIVE + NEGATIVE per use case)
```
┌────┬────────────────────────────┬──────────────────────────┬──────────────────────┐
│ fam│ POSITIVE (the enforcement  │ the SPECIFIC token        │ NEGATIVE (zero       │
│    │ must FIRE)                 │ (never a generic gate)    │ misfire)             │
├────┼────────────────────────────┼──────────────────────────┼──────────────────────┤
│ A  │ the retrieval gate         │ GI_RETRIEVAL_GATE         │ a jev query serves   │
│ B  │ the query-edit gate        │ GI_QUERY_REQUIRED         │ a queried edit serves│
│ C  │ the derail gate (loop)     │ the loop-refusal token    │ 3 distinct cmds serve│
│ D  │ the done gate              │ GI_DONE_UNPROVEN          │ route=act serves     │
│ E  │ the substrate gate         │ GI_NO_SUBSTRATE           │ a populated ws serves│
│ F  │ the judge-down degrade     │ the degrade token         │ the judge UP serves  │
│ G  │ the integration chain      │ "overall":true            │ the happy path green │
└────┴────────────────────────────┴──────────────────────────┴──────────────────────┘
```

## THE RESULTS ARTIFACT SCHEMA (.omp/ct-results.json)
```json
{ "overallVerdict": "PASS",
  "scenarios": [ { "name": "A-positive", "specificToken": "GI_RETRIEVAL_GATE",
    "passTokenMatch": true, "failTokenAbsent": true,
    "toolResultContext": "<the excerpt>", "verdict": "PASS", "evidence": "<sha|screenshot>" } ],
  "phaseE": { "shaMatch": true, "authProbe": true, "allRun": true, "tokensAsserted": true,
    "noCircular": true, "noTimeout": true, "blastRadius": true, "adversarial": true,
    "containerAlive": true, "artifactWritten": true } }
```

## THE PASS CRITERIA
Phase E all-10 + the negative half green + the declaration (the sha256 proof + the passToken-in-tool-
result excerpts + the per-scenario verdicts referencing the artifact). BANNED: "structural PASS",
"PASS by design", "asserted the behavior". **THE VERDICT IS /prove-it: PROVEN | REFUTED | BLOCKED | OPEN.**

---
# §11 THE ANTI-PATTERN LEDGER (3 categories, each with a mechanical detection)
```
ARCHITECTURAL
  the advisory-kernel   (a gate that only WARNS)      detect: grep the gate → no `throw` on its path
  the wrong-layer        (a check in the LSP, not the gate) detect: the token appears only in diagnostics
  the off-the-path verb  (a decision TOOL, not a GATE) detect: grep -c '"toolName":"graph-query"' == 0
BEHAVIORAL
  the silent fallback    (a remote URL on a local-judge path) detect: grep -rn 'api.typesafe.ai' src/
  the loop-repeat        (the same command ×N)          detect: the rolling per-session counter ≥ N
  the false-green judge  (a row with jev:null)          detect: grep -c '"jev":null' the ledger
PROCESS
  the model-mediated     (a hand-written manifest)      detect: the dispatch went through the wave-manager
  the stale-image deploy (dist ≠ source)                detect: sha(source) == sha(deployed)
  the done-without-proof (a claim, no route=act)        detect: GI_DONE_UNPROVEN
```

# §12 THE OPEN DECISIONS (each with a default)
| fork | default | needs the operator? |
|---|---|---|
| G1 the indexable-corpus predicate | path globs + the ~/.jm/targets.json registry | no |
| G4 the loop threshold N | 3 (measured: the ×3,274 loop) | maybe |
| G5 the done-gate strictness | route=act REQUIRED on the full context | YES |
| TTSR re-enable | keep OFF; the EXTENSION decides (steer, no rewind) | YES |

# §13 THE SELF-CHECK + THE RESIDUAL
```
[x] all contract sections present (§1-§7) · [x] the anti-pattern ledger (§11)
[x] §7 >=5 angles + the token templates + the pass threshold · [x] every criterion command-checkable
[x] the ASCII graph (§8) · [x] the script suite (§9) · [x] the container suite (§10)
[x] the preflight skills loaded (prove-it · deep-container-testing · ascii-diagrams)
```
**THE RESIDUAL:** W1-W6 are DESIGN (no gate wired yet); the false-positive matrices (§9 both halves)
are NOT yet run; the retrieval heuristic (G1) needs a corpus census before it ships; whether the 10
dormant TTSR rules misfire is UNKNOWN until each gets its matrix.
