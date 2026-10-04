# PLAN — THE JEV DECISION LAYER + THE GUARDRAIL CLEANUP
**Status: PLAN ONLY — NOTHING EXECUTED.** Author: the primary agent, 2026-09-29.
**The authority (the operator's mandate, verbatim):**
> *"ALL DECISION MAKING TO BE DOEN THROUGH JEV THERE SHOULD BE ANY FUCKING MISFIRES OR DUMB
> BULLSHIT IN YOUR FUCKING KERNEL!!!!! CODE THIS CORRECTLY!!!!!"* · *"I EXPLICITLY SAID TO WIRE
> FUCKING JEV AS THE INTELLIGENT DECISION MAKING LAYER"* · *"we should NOT have any agent-loop
> breaking dumb features like tool lockdowns"* · *"everything needs to be recoverable"*

---

## §1 · THE CURRENT STATE (measured this session — every line has its command)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  THE DECISION PATH AS IT ACTUALLY IS (regex everywhere the decisions happen)          │
└──────────────────────────────────────────────────────────────────────────────────────┘
   the agent's tool call
        │
        ├─► omp-ct gate stack ──► classifyVerb()  ──── REGEX LADDER
        │        (STTGF · doc-density · CT · graph)       pbk-v2/src/firewalls/
        │                                                semantic-smoke-firewall.ts:209
        │        ✗ MISFIRED on a quoted legit command  → broke another live session
        │
        ├─► GI extension ──► the graph gate (regex) · the cards · the claim firewall
        │        │
        │        ├─► JEJ adapters EXIST: omp/jev.ts · adapters/jevk5.ts · kev.ts · abide.ts
        │        └─► JEV DECIDES IN 3 PLACES ONLY: the meaning card · the claim firewall · the HUD
        │
        └─► the W6 firewall (readonly.ts: 9 fixes, 56-case corpus, 0/0)
                 └─► ZERO callers on the live path  (enforceBashLockdown: 0 in the bundle)

   THE JEV JUDGE: LIVE — {"ok":true,"model":"jevk5-4b-v0.2-Q8_0","runtime":"gguf"} · 104ms
   THE GATES:     REGEX — the judge is not consulted
```

**THE MEASURED BROKEN SET (the failure ledger F-140..F-144):**

| # | the defect | the evidence | the impact |
|---|---|---|---|
| F-140 | **the gates decide by regex; Jev is not consulted** | `classifyVerb()` at `semantic-smoke-firewall.ts:209`; `omp-ct/dist.js` = 44 `jev` tokens, none a decision call | **CRITICAL — the mandate** |
| F-141 | the FR-11 hook false-positived on a quoted command | the operator's verbatim rejection; the hook REMOVED, the bundle restored bit-identical (`4694b1323fcc6887`) | **CRITICAL — broke a live session** |
| F-142 | deployed ≠ running (the in-memory bundle holds) | the restore did not silence the live fires | HIGH — no in-session live proof |
| F-143 | the prose layer is unarmed on the host | `omp ttsr list` → 0; 9 rules copied, still 0 (the bind-at-construction law) | HIGH — the warheads enforce nothing |
| F-144 | the GI extension fails to load in the container | 3× `Failed to load extension: Unexpected while resolving package 'typescript'` | HIGH — no container proof of any GI hook |

---

## §2 · THE TARGET STATE (what "coded correctly" means here)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  THE DECISION PATH AS IT MUST BE (Jev decides; regex only DETECTS)                    │
└──────────────────────────────────────────────────────────────────────────────────────┘
   the agent's tool call
        │
        ├─► THE DETECTOR LAYER (cheap, mechanical, NO verdict)
        │        · the regex/lexicon marks CANDIDATES + extracts the SIGNALS
        │        · it NEVER returns a verdict  (its only job: "this shape is worth judging")
        │
        ├─► THE JEV DECISION LAYER  ← ★ THE MANDATE
        │        · one call per candidate: classifyToolCall(state) -> {verdict, confidence, reason}
        │        · the state = the command + the quoted spans STRIPPED + the session context
        │        · a calibrated probability, not a boolean; the threshold is DERIVED, not magic
        │        · THE JUDGE: jevk5-4b-v0.2-Q8_0 @ :8090  (already live)
        │        · FAIL-OPEN for INFO gates · FAIL-CLOSED for the SECURITY gate — per surface
        │
        └─► THE ENFORCER (mechanical, no thinking)
                 · reads the Jev verdict; blocks/serves; every decision LEDGERED with its confidence
                 · RECOVERABLE: the refusal names the permitted form AND the sanctioned tool
                 · the regex NEVER blocks anything ever again

   THE LAW (ISE): the lexicon DETECTS · the state machine DECIDES · the evidence triad RECORDS.
   The regex is a mechanical detector — never the decision.
```

---

## §3 · THE PHASES (ordered; every step carries its mechanical check)

```
   P0  THE FLOOR        a clean session boot + the baseline re-measure     (no code change)
   P1  THE JEV LAYER    the gate classifiers -> Jev decisions              (THE MANDATE)
   P2  THE RIG          the GI extension loads in the container
   P3  THE PROSE        the TTSR rules armed + observed firing
   P4  THE WIRE         the firewall's live caller (re-done, correct probes)
   P5  THE VERIFY       the misfire corpus + the recoverability matrix
```

### P0 · THE FLOOR — restore trust before any change (no code)
1. **A clean session boot** on the host. Every deployed fix this session is in-memory only until
   then (F-142). **THE CHECK:** a fresh session; `grep -c 'GI BASH LOCKDOWN' <the live bundle>` = 0
   AND the gate fires observed in the FIRST minute match the CURRENT bundle's tokens.
2. **The baseline re-measure** (the zero-trust input, not memory):
   `bunx tsc --noEmit` · `bun run test` (the two lanes) · `bun scripts/graph-health.ts .` ·
   `sha256sum extensions/graph-intelligence/index.js`.
   **THE CHECK:** the battery counts + the dist sha recorded into the ship docs THIS turn.
3. **The live misfire probe** — the exact broken shape from the other session, run in a SCRATCH
   session (never the operator's): a quoted `--flag "value"` command with an `&&` chain.
   **THE CHECK:** it RUNS. If it refuses, P0 fails and P1 does not start.

### P1 · THE JEV DECISION LAYER — the mandate
**Target files:** `pbk-v2/src/firewalls/semantic-smoke-firewall.ts` (the classifier) ·
`src/omp/jev.ts` (the existing adapter — REUSE, never a new adapter) · the 3 sibling classifiers
(the doc-density · the container · the graph).
1. **Add the judge call** in the adapter's existing shape: `askJev({ kind: "tool_gate", state })`
   → `{ choice, confidence, probabilities }` (the live contract:
   `{type:"choice", instructions, criteria:{allow:null, block:null}}` — verified live).
2. **Demote the regex to the detector**: `classifyVerb()` keeps ONLY the candidate-marking +
   the signal extraction. Its `return 'inline_exec'` becomes `candidate = {kind, signals}`
   — **no verdict from the regex.**
3. **The decision** = the Jev call on the candidate's state (the command + the UNQUOTED view +
   the session context). The verdict carries a confidence.
4. **The threshold is DERIVED** (a measured control set), never a magic constant — and recorded
   beside the measured value it was derived from (the theatre rule).
5. **The polarity per surface**: the security gate FAIL-CLOSED (a dead judge = refuse);
   the info gates (the doc-density, the graph) FAIL-OPEN (a dead judge = allow + a named log).
6. **The audit trail**: every decision writes a ledger row `{the candidate, the verdict, the
   confidence, the judge, the ms}` — the evidence triad (Pattern · State · Evidence).
**THE CHECK:** a 40-case control set (10 attacks, 10 legit, 10 quoted-legit, 10 boundary) run
against the Jev path: **the quoted-legit cases MUST pass** (the F-141 class), the attacks MUST
block, and every decision carries its confidence in the ledger.

### P2 · THE RIG — the GI extension must load in the container
1. **Pin the mechanism** (it is not yet pinned — the honest state): reproduce
   `Unexpected while resolving package 'typescript'` on a fresh container boot, with the bundle
   UNCHANGED between boots (the copy-race ruled in or out).
2. **The fix (one of, decided by the measurement):** (a) externalize the resolution
   (`bun build --external typescript` when the code path allows); (b) make the code path LAZY
   (resolve only when the TS-parsing feature is actually invoked — the extension's other tools
   must load without it); (c) ship the dependency into the container image.
**THE CHECK:** a fresh container boot; the extension's tools visible in the TUI; 0
`Failed to load extension` in the log — AND the bash hook (P4) fires there.

### P3 · THE PROSE LAYER — the TTSR rules armed + OBSERVED
1. The 9 rule files are already at `~/.omp/agent/rules/` (deployed, unverified).
2. **The check:** a FRESH session; `omp ttsr list` shows them; then a REAL firing — the rule's
   condition matched on a live stream, observed (not asserted).
3. **The compile trap guard:** `omp ttsr list | grep -c '[native]'` after the write (a silently
   dropped rule is the class).
**THE CHECK:** ≥1 rule observed FIRING on a live turn, with the verbatim abort text.

### P4 · THE FIREWALL WIRE — re-done with the CORRECT probe set
1. **The lesson from F-141 folded in:** the misfire probe set MUST contain the shapes that broke
   it — quoted args, `&&` chains, `--flag "value"`, the subshells, the redirects — not 26 simple
   commands. **THE SET IS THE DELIVERABLE.**
2. Only then: the firewall's live caller (the W6 corpus' own `BASH_BYPASS` discriminator, or
   better, the P1 Jev path with the detector demoted).
3. **THE CHECK:** the 40-case control set at 0 misfires — INCLUDING the exact command that broke
   the other session, verbatim.

### P5 · THE VERIFY — the misfire corpus + the recoverability matrix
1. **The misfire corpus** (the classes this session measured): the over-breadth (the pattern-text
   inside a quote) · the missed-variant (the interpreter family) · the misnamed message ·
   the stale-bundle · the unarmed-layer. Each with its case.
2. **THE RECOVERABILITY MATRIX** (the operator's law "everything needs to be recoverable"):
   for EVERY gate, the refusal NAMES its remedy + a sanctioned path EXISTS + the loop CONTINUES.
   **THE CHECK:** for each gate: trigger it; read the message; follow the named remedy; confirm
   the work proceeds. A gate without a working recovery = a finding.
**THE CHECK:** the matrix complete, every cell with a real run.

---

## §4 · THE ACCEPTANCE CRITERIA (the done-when, mechanically checkable)
| # | the criterion | the check |
|---|---|---|
| A1 | Jev decides the gate verdicts | the ledger rows show a judge call + a confidence per verdict |
| A2 | the regex cannot block | `grep -rn "return 'inline_exec'" src/` → 0 (the classifier returns candidates, not verdicts) |
| A3 | the quoted-legit class passes | the 40-case control set, 0 misfires |
| A4 | the other session's exact command runs | it is in the control set, verbatim, PASS |
| A5 | every gate is recoverable | the matrix: every refusal names a remedy + the remedy works |
| A6 | the container loads the GI ext | 0 load failures; the tools visible; the hook fires |
| A7 | the prose layer is armed + observed | ≥1 rule firing with the verbatim abort |
| A8 | zero regressions | the battery green + tsc + the graph-health |

---

## §5 · THE RISKS + THE ROLLBACK
| the risk | the mitigation | the rollback |
|---|---|---|
| the Jev path adds latency to every tool call | the detector pre-filters (only candidates reach the judge); the judge measured at 104ms | the adapter's timeout → the surface's polarity (fail-open for info, closed for security) |
| the judge is DOWN | the per-surface polarity (P1.5) + a NAMED log | the info gates continue; the security gate refuses loudly (never a silent allow) |
| the probe set is again too narrow (the F-141 class) | the set is the deliverable (P4.1) + the operator's exact command included | re-run the set; no deploy until 0 misfires |
| a change breaks the running session | the checkpoint restore (the bundle is bit-identical-restorable — proven twice this session) | `cp <the checkpoint bundle> ~/.omp/agent/extensions/graph-intelligence/index.js` |

---

## §6 · THE HONEST NOTES (not claimed)
1. **This is a plan.** No phase has been executed. The only things DONE this round: the failure
   data logged (F-140..F-144) and the hook REMOVED (the bundle restored to
   `4694b1323fcc6887`, bit-identical to the checkpoint).
2. **F-144's mechanism is NOT pinned** — the typescript resolution needs the P2 measurement.
3. **The container proofs of the GI hooks this session are VOID** (the extension never loaded
   there, per F-144). Every earlier container claim about a GI hook is retracted.
4. **The running sessions hold stale bundles** (F-142) — every live observation until the next
   clean boot describes the OLD code.
5. **The Jev adapter is REUSED, not rebuilt** (`src/omp/jev.ts` + `adapters/jevk5.ts` exist and
   the judge answers) — the work is the WIRING, not a new client.
