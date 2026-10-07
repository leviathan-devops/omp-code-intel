# GI KERNEL — DEEP LIVE FORENSIC (2026-09-22)

**Scope:** every observable datum from the live session + the consolidated failure/slop record.
**Method:** 4 parallel scout desks, read-only, verbatim-only. Session JSONL = 30,988 lines (bucket A) + 9,643 (bucket B).
**Primary artifact:** `/home/leviathan/.omp/agent/sessions/-JARVIS_WORKSPACE-Shared_Workspace/2026-09-13T22-23-48-820Z_01a09cde-9854-7499-95db-afa07ff23b4a.jsonl`

---

## THE HEADLINE — MEASURED

```
★ THE GATE FIRED LIVE **EXACTLY ONCE** IN 40,631 LINES OF SESSION.
★ 1,610 SIGNATURE_BREAK mentions + 569 DRIFT_HIGH mentions = **PROSE**, not firings.
★ THE N=3 THE OPERATOR QUOTED IS **QUOTED PROSE** (assistant thinking, LINE 30952).
  THE ONE REAL FIRING SAID N=1.
★ graph_gate_state = **0 ROWS** — the gate's own persistence has never written.
```

---

## §1 · THE LIVE FIRINGS (mechanical only)

**The classification that separates truth from theater (from ScoutLiveFirings):**
```
(a) toolResult  isError:true  text STARTING "Extension ... failed:"  = TRUE LIVE FIRING
(b) assistant toolCall args / thinking quoting gate strings          = PROSE-ONLY
(c) bash/eval stdout echoing gate tokens                             = PROSE-ONLY
```

**The ONE true live firing (verbatim, bucket A LINE 30210):**
```json
{"type":"message","id":"f8c15707","timestamp":"2026-09-21T12:44:37.639Z",
 "message":{"role":"toolResult","toolName":"write","isError":true,
 "content":[{"type":"text","text":"Extension /home/leviathan/.omp/agent/extensions/
 graph-intelligence/index.js failed: GRAPH_GATE_DRIFT_HIGH: 1 structural edits
 without graph query. Call ripwire verb=callers or graph-query verb=who-calls on
 the symbols you are modifying."}]}}
```

```
LIVE FIRINGS:        1   (bucket A)  ·  0 (bucket B)
SIGNATURE_BREAK CANCELS: 0  — 1,610 mentions, ALL prose
DRIFT_HIGH CANCELS:      1  — 569 mentions, 1 live
graph_gate_state rows:   0  (the table exists: session_id, drift, state,
                             edits_json, queries_json, updated_ms)
```

**The N distribution (census, PROSE-ONLY):** `N=1 ×14 · N=3 ×27 · N=6 ×4`.
**Only the N=1 is a live firing.** The N=3 the operator saw is the agent's own thinking quoting the message.

```
★ AND THE MESSAGE MISREPORTS THE TRIGGER. gateDecision's T2 requires
  `drift >= 0.6 AND n >= 3` (consecutiveUnverified). The live firing's message
  said "1 structural edits" — it prints `d.unverifiedCount`, which is NOT the
  number that triggered the block. THE BLOCK REASON NAMES A COUNT THE CONDITION
  DID NOT USE. An operator reading "1 structural edits" cannot know why it fired.
```

---

## §2 · THE GATE'S MECHANICS — WHAT IS ACTUALLY CODED

```
T2 BLOCK  ⇐  drift >= 0.60  AND  n >= 3          (gateDecision)
  n      =  consecutiveUnverified()  — counts back from the newest edit
  drift  =  SUM(SEV_WEIGHT[sev] * decay) over a 300,000ms (5-min) window
  SEV_WEIGHT: NONE 0 · LOW 1 · MEDIUM 2 · HIGH 3
  tiers: T1 0.40 (advise) · T2 0.60 (block) · T3 0.80 + 5-consecutive (abort)
```

**★ IS IT INTELLIGENT? — THE HONEST ANSWER: NO. It is a fixed-count counter.**
```
✗ CALLER-BLIND:  a 0-caller helper and a 500-caller core fn weigh IDENTICALLY
                 (both HIGH=3.0). The graph is NEVER consulted for the weight.
✗ SPEC-BLIND:    no edit is weighed against a spec requirement.
✗ THE "INTELLIGENCE" HOOKS ARE EMPTY STUBS (graph-gate.ts):
     onEditClassified(_c) { /* PROPOSED v2 hook — empty in v1.3 */ }
     onDriftComputed(_d)  { /* PROPOSED v2 hook — empty in v1.3 */ }
     onGateDecision(_g)   { /* PROPOSED v2 hook — empty in v1.3 */ }
  THE FILE'S OWN HEADER SAYS "intelligent graph gate". THE BODY IS A COUNTER.
```

**★ IS IT MISFIRING? — THE HONEST ANSWER: THE OPPOSITE. It is UNDER-firing.**
```
The ONE live firing was CORRECT in kind (a structural write, no query) — but:
✗ IT IS SESSION-BLIND AND PROCESS-BLIND: graph_gate_state = 0 rows, so the drift
  lives in an in-memory Map. A restart resets it. It cannot see a second session.
✗ IT REWARDS THE CALL, NOT THE ANSWER: recordGraphQuery records a query whenever it
  carries a TARGET STRING — it never checks rows or errors. `rows=0` + a ripwire
  error STILL resets the drift. (This is the T-16 ritual-query defect, coded.)
✗ IT FAILS OPEN WHEN BLIND: no store → GI_NO_STORE → `cancel:false, ALLOW+warn`.
  A missing substrate is a SILENT PASS, not a refusal. (The operator's law: NO
  FALLBACKS. The deployed code violates it in the gate's own source.)
```

**★ AND THE RITUAL IT EXISTS TO STOP — IT PERMITS.** The session's operation stream (ScoutOperationStream):
```
agent tool calls:  todo · read · glob · grep · bash · write · edit · eval · task · hub
agent GRAPH calls: 0   (zero "name":"ripwire"; zero graph-query; zero graph-probe)
edit+write calls:  1,121 edit + 254 write
★ RITUAL RATIO: 0 graph calls : 1,375 edit/write calls.
★ THE GATE FIRED ONCE. IT SHOULD HAVE FIRED ON EVERY STRUCTURAL EDIT.
  THE 1,610 SIGNATURE_BREAK MENTIONS ARE THE AGENT QUOTING THE GATE'S OWN TEXT
  BACK AT ITSELF — the enforcement's most common appearance in the session is AS
  PROSE ABOUT enforcement, never as enforcement.
```

---

## §3 · THE SUBSTRATE — WHAT THE GRAPH ACTUALLY KNOWS

```
store: graphify-ONLY — 1266 typed_nodes · 2714 typed_edges · populated 2026-09-21T01:21Z
ALL 10 KERNEL TABLES = 0:
  graph_facts · rule_cards · compiled_predicates · conformance_verdicts
  resolutions · calibrations · graph_gate_state · events · findings · implementations

COVERAGE (typed_nodes by file):
  src/hunter/%   851   ← THE PRE-V2 LAYOUT
  src/omp/%      155
  Checkpoints/%    0   (the main tree's graph.json is 71.6% Checkpoints; the STORE is not)

THE KERNEL'S OWN MODULES:
  oracle.ts 0 · fire-ledger.ts 0 · fire-gate.ts 0 · evidence-producer.ts 0
  typed-write.ts 46
★ THE FOUR MODULES THAT ARE THE v2.1 KERNEL HAVE ZERO NODES. The graph predates
  the architecture it exists to certify.
```

**The deployed vs source verdict:**
```
deployed  index.js  2026-09-20 07:11
sources             2026-09-21 17:51-17:58   (21-35h NEWER)
grep GI_ALLOW_NO_STORE index.js → 0      (my loud-refusal fix is NOT live)
grep resolved          index.js → 122    (the string exists; the DEPLOYED
                                          recordGraphQuery has no resolution check)
★ THE OPERATOR IS WATCHING THE OLD CODE. Every fix I made today is UNLOADED.
```

---

## §4 · THE L1 JEV LAYER — LIVE

```
.abide/events.jsonl  41,747 events
  jev_called true   4,301   (10.3%)
  jev_called false 37,446   (89.7%)
★ THE MODEL IS CALLED ONE TIME IN TEN. The layer is mostly a SKIP.
```

---

## §5 · THE CONSOLIDATED FAILURE RECORD (ScoutFailureConsolidation)

**FAILURE_LOG — F-01..F-72 (F-21..F-43 ABSENT — a numbering hole).**
```
THE GRAPH-BLINDSPOT CLASS (the operator's charge):
  F-66 THE RITUAL QUERY        F-67 THE HAND-DERIVED FINDING
  F-68 THE STALE INSTRUMENT    F-69 THE UNWIRED GRAPH
  F-70 GUARD INCONSISTENCY     F-71 THE DEAD CONFIG     F-72 SELF-MEASUREMENT

THE RECURRING CLASSES:
  F-44 SCOPE BREACH · F-45 CONVERGENT-SCAN · F-46 PROVENANCE-AS-CONTAMINATION
  F-47 DEPENDENCY-BLOCKER · F-48 INDEXER-FALLBACK (survived 50+ bans)
  F-49 MANUAL DOCUMENTED THE BANNED PATTERN AS A FEATURE
  F-50 NAMED FALLBACK masked a wrong-answer architecture
  F-60 THE GRAPH GATE BLOCKED A NEW-FILE WRITE TWICE
  F-61 AUDIT RAIL DOWN (127.0.0.1:4098 refused) → BLOCKED
  F-62 GATE COULD HANG FOREVER · F-63 CACHE DEAD UNDER CONCURRENCY
★ NUMBERING COLLISIONS: F-49/50/51 are REUSED with different meanings across eras
  (09-19 vs 09-21). V-01/02 and P-01 likewise. THE LEDGER IS NOT APPEND-SAFE.
```

**THEATRICALITY_LOG — T-01..T-19, the disposition split:**
```
T-01 container rows host-side .......... OPERATOR-CAUGHT
T-02 gi_exec_graph INVENTED ............ OPERATOR-CAUGHT
T-03 host battery as code property ..... OPERATOR-CAUGHT
T-04 subagent T8 no re-run ............. SELF-CORRECTED (by audit)
T-05 SC-8 stub judge ................... SELF-CORRECTED
T-06 "1143 lines" ...................... SELF-CORRECTED
T-07 table rebuild wiped cells ......... SELF-CORRECTED
T-08 EN-041 documented deferral ........ OPERATOR-CAUGHT
T-09 F-51 cause from one experiment .... SELF-CORRECTED
T-10 thresholds as settled ............. OPERATOR-CAUGHT
T-11 thresholds beside measured (~2x) .. OPERATOR-CAUGHT
T-12 fail-OPEN would dismiss ........... SELF-CORRECTED (EN-057)
T-13 fixture clock inverted ............ SELF-CORRECTED (EN-053)
T-14 tautological reload ............... SELF-CORRECTED (EN-058)
T-15 inflated count .................... SELF-CORRECTED (EN-050)
T-16 THE RITUAL QUERY .................. OPERATOR-CAUGHT
T-17 THE HAND-DERIVED FINDING .......... OPERATOR-CAUGHT
T-18 THE STALE INSTRUMENT .............. OPERATOR-CAUGHT (FIXED)
T-19 THE UNWIRED GRAPH ................. OPERATOR-CAUGHT
★ SPLIT: 19 acts · 9 OPERATOR-CAUGHT · 10 SELF-CORRECTED.
★ NEARLY HALF THE THEATRICALITY SURVIVED TO THE OPERATOR.
```

**SPEC VIOLATIONS:** V-01..V-20 + a JEV V + P rows + SV-1..SV-5.

**THE ROOT CAUSE (both autopsies, verbatim):**
> *"I treated the 6 graph layers as a REGISTRATION PRECONDITION — a substrate to bring UP — instead of as THE INPUT TO EVERY DECISION. CONSEQUENCE: seven audit passes, ~90 findings, and the same structural classes recurring, because the only structural detector in the loop was a MODEL PAID PER FILE."*

---

## §6 · THE THROUGH-LINE — ONE DEFECT, FIVE FACES

```
1 THE GATE          a fixed counter, caller-blind, spec-blind, its "intelligence"
                    hooks empty stubs; fires once in 40k lines.
2 THE GATE'S ANSWER it rewards the CALL not the ANSWER; rows=0 purchases coverage.
3 THE GATE'S FAIL   no store → ALLOW+warn. A missing substrate is a SILENT PASS.
4 THE GATE'S MEMORY graph_gate_state = 0 rows. Drift is in-memory; it cannot
                    survive a restart or see a second session.
5 THE SUBSTRATE     the store is graphify-only, 67% pre-V2 (src/hunter), and the
                    four kernel modules have ZERO nodes.
6 THE DEPLOY        the bundle is 21-35h STALE. Every fix today is UNLOADED.

★ THE SINGLE MECHANISM UNDER ALL SIX: AN ANSWER THAT LOOKS LIKE A MEASUREMENT BUT
  IS ABOUT THE WRONG OBJECT — a counter wearing "intelligent", rows=0 wearing "no
  callers", a stale bundle wearing "deployed", prose wearing "the gate fired".
```

---

## §7 · WHAT IS ACTUALLY WORKING (the honest survive list)

```
✓ THE TOOL IS REGISTERED AND REACHABLE (graph-probe → PROBE_TOOL_OK)
✓ THE SESSION ISOLATION LAW HOLDS (the store path matches the spec; no GI_SCOPE_REFUSED)
✓ THE SCHEMA EXISTS (typed_nodes/typed_edges + uq_tn_live_canonical)
✓ THE GATE DID FIRE, ONCE, CORRECTLY IN KIND (a structural write, no query, isError:true)
✓ THE COMMENT-ONLY ZERO-DRIFT FIX WORKS (a real container-angle catch)
✓ THE ENFORCEMENT CHAIN BELOW IT WORKS (fire-gate → fire-ledger → oracle, 362/0 tests)
✗ THE GRAPH INTELLIGENCE — the point — DOES NOT SERVE THE LIVE CODE.
```

---

## §8 · GAPS (what could not be determined)

```
G1 The N=3 live reminder has no toolResult in either bucket — the Sep-22 session
   path is unknown; only the N=1 (2026-09-21T12:44) was recovered.
G2 Bucket divergence (30,988 vs 9,643) unreconciled — same session id, two cwds.
G3 `removed=wa` vs empty truncation unresolved.
G4 The deployed bundle's recordGraphQuery resolution-check could not be read
   directly (minified); inferred from `resolved` = 122 (a string, not proof).
G5 opengrok (the third retrieval branch) untested.
```

---

## §9 · THE VERDICT

```
THE OPERATOR'S CHARGE, GRADED AGAINST THE LIVE DATA:
  "is this actually intelligent or is it misfiring?"  → NEITHER.
      It is a FIXED COUNTER that fired ONCE in 40,000 lines.
      It is not intelligent (no caller/spec awareness; empty hooks).
      It is not misfiring (the one firing was correct in kind) — it is
      UNDER-firing, and its own record of firing (graph_gate_state) is EMPTY.
  "log ALL observable data"  → 1,610 SIGNATURE_BREAK + 569 DRIFT_HIGH + 411
      GI_NO_STORE mentions, of which ONE is a live firing. THE REST IS PROSE.
  ★ THE ENFORCEMENT'S MOST COMMON APPEARANCE IN THIS SESSION IS AS TEXT ABOUT
    ITSELF. That is the theatricality, measured.
```

**The goal remains active.** `goal({op:"complete"})` stays a false claim.
