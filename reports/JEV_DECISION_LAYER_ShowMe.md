# WHAT WAS DONE + HOW THE DECISION GATES WORK LIVE

**Scope:** the 4-gate JEV decision layer (this round) + the OMP fallback change
**Date:** 2026-09-30
**Evidence:** every site read this turn; every number re-measured this turn

## 1 · ONE-PARAGRAPH SUMMARY

Two things were done. FIRST, the four enforcement gates that used to decide from a regex now route every decision through a live judge: the regex marks a candidate, the Jev judge (`jevk5-4b-v0.2-Q8_0` at `127.0.0.1:8090`) returns a calibrated `{choice, confidence}`, a mechanical enforcer serves or refuses against a derived threshold, and every decision lands in an append-only ledger. The four gates are the STTGF smoke firewall, the doc-density gate, the container gate, and the graph gate. SECOND, the OMP fallback chain for `opencode-go/*` was changed from `mimo-v2.5` to `muse-spark-1.3-contributor:xhigh`, so a rate-limited call falls to the premium reasoner instead of the small model.

## 2 · THE LIFECYCLE MAP

┌─ 1 · THE ENTRY ───────────────────────────────────────┐
│ THE AGENT'S TOOL CALL  (bash / write / edit)           │
│ the hook sites: pbk-v2/src/index.ts:82 :89 + the chain │
└──────────────────────────────────────────────────────┘

┌─ 2 · THE DETECTOR ───────────────────────────────────────────────┐
│ THE DETECTOR  (mechanical — candidates, NEVER a verdict)          │
│ classifyVerb       firewalls/semantic-smoke-firewall.ts:209       │
│ detectCandidate    src/omp/jev.ts (QUOTE_CONCAT/READ_VERB_HIJACK) │
│ the container set  middleware/container-gate.ts                   │
│ the doc-type set   middleware/doc-density-gate-v2.ts:292          │
│ the export-removal src/omp/gate-hook.ts (the graph gate)          │
└─────────────────────────────────────────────────────────────────┘

┌─ 3 · THE JUDGE ───────────────────────────────────────────────┐
│ THE JEV JUDGE  (the LIVE decision)                             │
│ POST 127.0.0.1:8090/v1/systemone                               │
│   { state, questions: { gate: { type: choice } } }             │
│ <- { choice: serve|refuse, confidence, probabilities }  ~105ms │
│ the model: jevk5-4b-v0.2-Q8_0                                  │
└──────────────────────────────────────────────────────────────┘

┌─ 4 · THE ENFORCER ──────────────────────────────────────────────┐
│ THE ENFORCER  (mechanical — reads the verdict)                   │
│ refuse iff choice is refuse AND confidence >= GATE_THRESHOLD 0.5 │
│ a serve-argmax NEVER blocks · a refusal NAMES its remedy         │
│ polarity: the SECURITY surfaces fail-CLOSED, the INFO fail-OPEN  │
└────────────────────────────────────────────────────────────────┘

┌─ 5 · THE LEDGER ───────────────────────────────────────────────────┐
│ THE LEDGER  ~/.omp/run/gate-ledger.jsonl                            │
│ the triad per row: Pattern · State · Evidence{judge,choice,conf,ms} │
└───────────────────────────────────────────────────────────────────┘

## 3 · THE FOUR GATES (per module)

### SITE 1 · the STTGF smoke gate — pbk-v2/src/middleware/sttgf-gate.ts (180L)

┌──────────────────────────────────────────────────────────────────────┐
│ import: tool-gate (line 22: askGateDecision, smokeCandidate, ...)      │
│ the BLOCK branch (line 89): smokeCandidate(category, commandStr)       │
│ the judge call (line 90): askGateDecision(cand, 'flagged category:..') │
│ the ledger row (lines 91-95): enforced served/refused + the remedy     │
│ the outer catch: fail-CLOSED (an infra failure blocks, named)          │
└──────────────────────────────────────────────────────────────────────┘

*flow: command -> classifyVerb -> BLOCK -> judge -> clear|block*

### SITE 2 · the container gate — pbk-v2/src/middleware/container-gate.ts (185L)

┌────────────────────────────────────────────────────────────────────┐
│ CONTAINER_VERB_RE (line 19): docker/tmux verbs (the SHAPE matcher)   │
│ isBannedRunnerCommand (line 67): the NAME BAN (a policy, not judged) │
│ the wire (line 142): containerCandidate(cmd) on the SHAPE hits       │
│ the ban list (lines 133-140) blocks directly, judge-free             │
│ the catch (line 154): fail-CLOSED, the comment matches the flow      │
└────────────────────────────────────────────────────────────────────┘

*the split: the shapes are JUDGED; the name ban is POLICY*

### SITE 3 · the doc-density gate — pbk-v2/.../doc-density-gate-v2.ts (422L)

┌──────────────────────────────────────────────────────────────────────┐
│ import: tool-gate (line 38: askGateDecision, docTypeCandidate, ...)    │
│ the floor block (line 403): docTypeCandidate(path, docType, head)      │
│ the judge call (line 404): file + classified-as + floor + lines + head │
│ the clear path: return undefined (the write proceeds)                  │
└──────────────────────────────────────────────────────────────────────┘

*INFO surface: a down judge NEVER blocks a doc write*

### SITE 4 · the graph gate — src/omp/gate-hook.ts (420L)

┌───────────────────────────────────────────────────────────────┐
│ import: jev.ts (line 14: askToolGate, graphBreakCandidate, ...) │
│ the handler: pi.on('tool_call', async (event) => ...)  // async │
│ runGraphGate({...}) — the removed-export detection              │
│ the cancel path (line 147): graphBreakCandidate(file, advisory) │
│ the judge-clear path: return undefined (the edit proceeds)      │
└───────────────────────────────────────────────────────────────┘

*INFO surface: a down judge NEVER blocks an edit*

### SITE 5 · the judge client — pbk-v2/src/ext/tool-gate.ts (224L)

┌────────────────────────────────────────────────────────────────────┐
│ askGateDecision (line 86): fetch + 4s timeout -> {choice,confidence} │
│ enforceGate (line 131): the threshold + the polarity + the remedy    │
│ GATE_THRESHOLD = 0.5 (line 56) — DERIVED, never magic                │
│ sanitizeForJudge + scrubSecrets — the injection/secret walls         │
└────────────────────────────────────────────────────────────────────┘

*why its own client: the enforced bundle must be self-contained*

### SITE 6 · the F-144 lazy compiler — src/hunter/graph/mechanical.ts

┌───────────────────────────────────────────────────────────────────┐
│ import type * as tsT from 'typescript' (line 7) — type-only, erased │
│ createRequire (line 9) — the lazy runtime resolve                   │
│ GI_TS_MISSING (line 17) — the named refusal, not a load kill        │
│ the extension LOADS without typescript; AST paths need it on call   │
└───────────────────────────────────────────────────────────────────┘

*measured: 0 load failures in the container (was 3x)*

### SITE 7 · the fallback — ~/.omp/agent/config.yml (lines 46-48)

┌────────────────────────────────────────────────────────────────┐
│ retry.modelFallback: true                                        │
│ retry.fallbackChains['opencode-go/*']:                           │
│   - opencode-go/muse-spark-1.3-contributor:xhigh   <- the change │
│   (was: - opencode-go/mimo-v2.5)                                 │
└────────────────────────────────────────────────────────────────┘

*verified: omp config get -> muse-spark-1.3-contributor:xhigh*

## 4 · THE CALL TREE (the hot path — one blocked command)

┌─ the root ────────────────────────┐
│ tool_call: bash { command }        │
│ pbk-v2/src/index.ts:89 (the chain) │
└──────────────────────────────────┘

  sttgfGate
  pbk-v2/src/middleware/sttgf-gate.ts
    checkSmokeTestFirewall
    firewalls/semantic-smoke-firewall.ts:209
      smokeCandidate
      pbk-v2/src/ext/tool-gate.ts
        askGateDecision  ──► POST 127.0.0.1:8090
        enforceGate
        recordGateDecision  ──► gate-ledger.jsonl

shown=9 total=9 capped=0 (counted by hand from the drawn nodes)

## 5 · THE RUNTIME TRACE (the F-141 heredoc, observed live)

### PART 1 — TIMELINE

┌─ THE CONTEXT ──────────────────────────────────────────────────┐
│ T-BOOT: the extension loads (omp-ct dist.js, sha fe86a02f...)   │
│ T-RUN: the agent issues a bash tool call with a heredoc command │
└───────────────────────────────────────────────────────────────┘

### PART 2 — THE STEPS

┌─ THE TRACE ───────────────────────────────────────────────────────┐
│ STEP 1: tool_call bash                                             │
│   args: { command: cat > /tmp/f.ts <<EOF ... node -e ... EOF }     │
│   -> the chain runs sttgfGate                                      │
│                                                                    │
│ STEP 2: classifyVerb matches INLINE_EXEC (the TEXT in the heredoc) │
│   -> BLOCK branch entered                                          │
│                                                                    │
│ STEP 3: smokeCandidate('INLINE', command)                          │
│   -> POST 127.0.0.1:8090/v1/systemone                              │
│   -> { choice: serve, confidence: 0.76 }  (TEXT, not an execution) │
│                                                                    │
│ STEP 4: enforceGate -> serve (0.76 >= 0.5, choice is serve)        │
│   -> recordGateDecision (the ledger row, enforced=served)          │
│   -> return undefined (NO block)                                   │
│                                                                    │
│ STEP 5: the command RUNS; the agent sees its output                │
└──────────────────────────────────────────────────────────────────┘

### PART 3 — THE ROUTING DECISION

┌─ THE DECISION ─────────────────────────────────────────────────────────┐
│ Q1: did the regex match?          -> YES (INLINE_EXEC)                  │
│ Q2: the judge available?          -> YES (:8090 ok)                     │
│ Q3: the judge's choice?           -> serve (p=0.76, TEXT not execution) │
│ Q4: the confidence clears 0.5?    -> YES                                │
│ -> SERVE (the block is overridden)                                      │
│                                                                         │
│ THE OTHER PATH: choice=refuse p>=0.5 -> the block STANDS,               │
│   the reason names the remedy (use container-testing).                  │
└───────────────────────────────────────────────────────────────────────┘

### PART 4 — THE DELIVERY

┌─ THE DELIVERY ─────────────────────────────────────────────┐
│ the gate returns undefined -> the tool executes             │
│ the agent receives the command output verbatim              │
│ the ledger row: CONTAINER_BYPASS/SMOKE + serve + p + remedy │
└───────────────────────────────────────────────────────────┘

### PART 5 — THE OBSERVER (the quiet case)

┌─ THE OBSERVER ───────────────────────────────────────────────┐
│ the gate ledger: the row lands (Pattern/State/Evidence)       │
│ the guard timer (2 min): greps config.yml for the omp-ct line │
│   -> PRESENT -> exit 0, no write (the quiet case)             │
│ RESULT: ZERO guard writes. The enforcement spoke once,        │
│   in the ledger row — not in a block.                         │
└─────────────────────────────────────────────────────────────┘

## 6 · THE FALLBACK TRACE (the second thing done, 5 parts)

┌─ THE FALLBACK ─────────────────────────────────────────────────────────┐
│ PART 1 TIMELINE: session boot reads config.yml (modelFallback: true,    │
│   chain opencode-go/* -> muse-spark-1.3-contributor:xhigh)              │
│                                                                         │
│ PART 2 STEPS: STEP 1 the primary call 429s -> STEP 2 the chain          │
│   lookup matches 'opencode-go/*' -> STEP 3 dispatch the rung            │
│                                                                         │
│ PART 3 ROUTING: Q1 429? YES -> Q2 fallback on? YES -> Q3 chain          │
│   matches? YES -> Q4 rung whitelisted? YES (muse-spark-1.3) -> DISPATCH │
│                                                                         │
│ PART 4 DELIVERY: the muse-spark reply renders; the config read-back     │
│   confirms: opencode-go/* -> muse-spark-1.3-contributor:xhigh           │
│                                                                         │
│ PART 5 OBSERVER: the guard timer exits 0 (quiet); the gate ledger       │
│   is UNCHANGED (a model call is not a tool call)                        │
└───────────────────────────────────────────────────────────────────────┘

## 7 · THE NUMBERS

| the metric | the value | the source |
|---|---|---|
| the corpus | 40/40 · judgeDown=0 | bun scripts/gate-control-set.ts |
| the deployed proof | 10/10 | bun /tmp/deployed-gate-proof.ts |
| the ledger | 1647 rows, all judge-bearing | wc -l gate-ledger.jsonl |
| the omp-ct sha | fe86a02fe77e18a9... | sha256sum dist.js |
| the GI ext sha | 2e2a39031c6059ca... | sha256sum index.js |
| the fallback | muse-spark-1.3:xhigh | omp config get |
| jev.ts / tool-gate.ts | 563L / 224L | wc -l |
| sttgf/container/doc-density | 180L / 185L / 422L | wc -l |
| gate-hook / control-set | 420L / 228L | wc -l |

## 8 · THE OPEN GAPS

1. **THE AUDIT LANE** — the last complete run: 0 critical / 7 high (the pre-existing v6 port). A clean run is needed for the ship claim; the lane intermittently returns `OCR_JSON_ABSENT`.

2. **THE HOST-BRIDGE** (F-148) — the container's gate cannot reach `:8090` (no route); a socat forwarder is the remedy for the in-container judge proof.

3. **THE PRE-EXISTING `ledger-span` FAILURE** — the events-ledger row schema (10 fields). Not this round's; it keeps the pbk suite at 401/1.

4. **A CLEAN BOOT** — the fallback + the 4-gate wire take effect in a NEW omp session (the in-memory bundle holds, F-142).
