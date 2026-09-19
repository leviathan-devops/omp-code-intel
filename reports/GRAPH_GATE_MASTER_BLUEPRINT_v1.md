# KNOWLEDGE BIBLE: GI Kernel v1.3 Intelligent Graph Gate
Version: 1.3-DRAFT
Scope: The graph gate module of the GI-OMP kernel — event-aware, temporal, intent-based edit verification
Status: BLUEPRINT (designed, not yet built)

## §1 MACRO BLUEPRINT

```
┌──────────────────────────────────────────────────────────────────┐
│         GI KERNEL v1.3 — INTELLIGENT GRAPH GATE MODULE           │
│         (inside src/omp/extension.ts, not a separate extension)  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    EVENT STREAM (OMP SDK)                  │  │
│  │  beforeToolCall ── afterToolCall ── message_end ── turn_end │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                 LEXICON (Detection Layer)                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐ │  │
│  │  │ Edit     │ │ Temporal │ │ Intent   │ │ Downstream    │ │  │
│  │  │ Intent   │ │ Decay    │ │ Class   │ │ Effect Weight │ │  │
│  │  │ Lexicon  │ │ Engine   │ │ Lexicon │ │ Lexicon       │ │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘ │  │
│  └───────┼────────────┼────────────┼────────────────┼────────┘  │
│          │            │            │                │           │
│          ▼            ▼            ▼                ▼           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              STATE MACHINE (Decision Layer)                │  │
│  │                                                            │  │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌────────┐ │  │
│  │  │  IDLE   │───▶│ TRACKING│───▶│ WARNING │───▶│GATE_ON │ │  │
│  │  │ (pass   │    │ (edit   │    │ (drift  │    │ (block │ │  │
│  │  │  all)   │    │  log)   │    │ > 0.4)  │    │ + abort│ │  │
│  │  └─────────┘    └─────────┘    └─────────┘    └────────┘ │  │
│  │       ▲              │              │              │      │  │
│  │       └──────────────┴── graph ─────┴──────────────┘      │  │
│  │                       call resets                            │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              TIER LADDER (Enforcement Layer)               │  │
│  │  T0: pass (no friction)                                     │  │
│  │  T1: advise (in tool result)                                │  │
│  │  T2: block (named error)                                    │  │
│  │  T3: abort (TTSR mid-stream kill + rewind)                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │           V2 SCAFFOLD (future, not built in v1.3)          │  │
│  │  onEditClassified ── onDriftComputed ── onGateDecision     │  │
│  │  SpecDriftLexicon ── BlastRadiusWeighter ── ContextGraph  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**What this is:** A LASME-grade enforcement module that sits inside the GI kernel's extension bundle, processes every edit/write tool call through a lexicon-driven classification + temporal drift state machine, and escalates enforcement proportionally when the agent makes structural code edits without querying the graph tools. It is NOT a blind "call the graph before every edit" — it is event-aware (processes the actual tool call stream), temporal (decays over time), intent-based (classifies the edit's purpose and severity), and proportionally gated (the tier escalates only when drift is genuinely high).

## §2 LIFECYCLE — THE DECISION ALGORITHM (runs on every beforeToolCall)

### Stage 1: Event Reception

WHAT: The OMP SDK fires `beforeToolCall(toolName, args)` before every tool execution.
HOW: The graph gate registers a listener via the extension API's `beforeToolCall` hook (wired at `agent-session.ts:1337`).
WHERE: `src/omp/graph-gate.ts` (new), hook registration in `src/omp/extension.ts` initialization.
WHY: This is the interception point — the only place where a decision can be made BEFORE the edit lands.

### Stage 2: Edit Classification (the Lexicon)

WHAT: Classify the edit into a severity level.
HOW: The lexicon examines the tool call's arguments for structural indicators:
```
┌─────────────────────────────────────────────────────────────┐
│           EDIT CLASSIFICATION LEXICON                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  INPUT: toolName + args                                     │
│                                                             │
│  ┌─ NON-CODE FILTER ────────────────────────────────────┐   │
│  │ if target file ends .md/.json/.yaml/.toml/.txt:      │   │
│  │   → severity = NONE → PASS THROUGH (no gate)         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ STRUCTURAL DETECTION ───────────────────────────────┐   │
│  │ if edit touches:                                     │   │
│  │   export function/class/const/interface             │   │
│  │   import ... from ...                               │   │
│  │   function signature change                          │   │
│  │   type definition change                             │   │
│  │   class method addition/removal                      │   │
│  │   → severity = HIGH                                  │   │
│  │                                                      │   │
│  │ if edit touches:                                     │   │
│  │   function body (logic, no signature)               │   │
│  │   variable assignment                                │   │
│  │   string literal change                              │   │
│  │   comment addition                                   │   │
│  │   → severity = MEDIUM                                │   │
│  │                                                      │   │
│  │ if edit touches:                                     │   │
│  │   test file (*test*, *spec*)                         │   │
│  │   fixture file                                       │   │
│  │   config schema                                      │   │
│  │   → severity = LOW                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  OUTPUT: { severity, structuralFlags[], touchedSymbols[] }  │
└─────────────────────────────────────────────────────────────┘
```

WHERE: `src/omp/graph-gate.ts:classifyEdit()`
WHY: Doc-only edits never trigger the gate (zero friction on prose). Only structural code edits (the ones that can break callers) escalate.

### Stage 3: Temporal Drift Computation

WHAT: Compute a drift score (0.0-1.0) for the current session.
HOW: The temporal engine maintains a rolling window of edit events and graph queries:

```
┌─────────────────────────────────────────────────────────────┐
│           TEMPORAL DRIFT ENGINE                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STATE (per session):                                       │
│    editLog: Array<{ timestamp, severity, symbols }>         │
│    graphQueries: Array<{ timestamp, tool, target }>         │
│    lastGraphQuery: timestamp | null                         │
│                                                             │
│  ┌─ DECAY FUNCTION ─────────────────────────────────────┐   │
│  │ For each edit E in editLog (last 5 minutes):        │   │
│  │   age = now - E.timestamp                           │   │
│  │   decay = max(0, 1 - (age / 300_000))  // 5min      │   │
│  │   weight = E.severity * decay                       │   │
│  │                                                      │   │
│  │ unverifiedWeight = Σ(weight of edits whose          │   │
│  │   touched symbols have NO matching graph query)    │   │
│  │                                                      │   │
│  │ totalWeight = Σ(weight of ALL edits in window)      │   │
│  │                                                      │   │
│  │ COVERAGE CHECK:                                     │   │
│  │ for each edit's touchedSymbols:                     │   │
│  │   if any graphQuery.target matches the symbol      │   │
│  │     → mark edit as verified (weight excluded)      │   │
│  │                                                      │   │
│  │ drift = unverifiedWeight / max(totalWeight, 1)     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  OUTPUT: { drift: 0.0-1.0, unverifiedCount, lastGraphQuery }│
└─────────────────────────────────────────────────────────────┘
```

WHERE: `src/omp/graph-gate.ts:computeDrift()`
WHY: A hardcoded "3 edits" is arbitrary and blind. The drift score is proportional — a HIGH-severity export rename counts more than a LOW-severity comment change, and edits from 4 minutes ago matter less than edits from 30 seconds ago. A refactoring session that queries the graph every 3-4 edits has drift ≈ 0.2 (no friction). A blind spree of 15 export changes with zero queries has drift ≈ 1.0 (hard stop).

### Stage 4: State Machine Transition

WHAT: Map the drift score to a gate state.
HOW: The 4-state machine tracks the session's enforcement posture:

```
┌─────────────────────────────────────────────────────────────┐
│           STATE MACHINE TRANSITIONS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────┐  drift < 0.3  ┌─────────┐                      │
│  │  IDLE  │◄──────────────│TRACKING │                      │
│  │ (pass) │                │ (log)   │                      │
│  └────┬───┘                └────┬────┘                      │
│       │                        │ drift ≥ 0.4                │
│       │                        ▼                            │
│       │                ┌─────────┐                          │
│       │                │WARNING  │  advisory injected       │
│       │                │(advise) │  into tool result        │
│       │                └────┬────┘                          │
│       │                     │ drift ≥ 0.6                   │
│       │                     ▼                               │
│       │                ┌─────────┐                          │
│       │                │ GATE_ON │  tool call blocked       │
│       │                │ (block) │  named error returned    │
│       │                └────┬────┘                          │
│       │                     │ drift ≥ 0.8 + no graph query  │
│       │                     │ in > 5 consecutive edits      │
│       │                     ▼                               │
│       │                ┌─────────┐                          │
│       │                │ HARD_   │  TTSR mid-stream abort   │
│       │                │ STOP    │  reasoning rewound       │
│       │                │(abort)  │  law injected            │
│       │                └─────────┘                          │
│       │                                                       │
│  ANY STATE: graph query on a touched symbol                   │
│             → drift resets → state returns to IDLE           │
│  (calling ripwire verb=callers or graph-query                 │
│   verb=who-calls on ANY symbol the agent edited               │
│   resets the drift for THAT symbol to 0)                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

WHERE: `src/omp/graph-gate.ts:gateDecision()`
WHY: The state machine gives graduated enforcement — the agent gets warnings before blocks, blocks before aborts. The graph-call reset is the reward mechanism: the gate doesn't punish coding, it rewards graph usage.

### Stage 5: Tier Enforcement

WHAT: Execute the gate's decision.
HOW: Each tier has a different enforcement mechanism:

```
┌─────────────────────────────────────────────────────────────┐
│           TIER ENFORCEMENT MECHANISMS                        │
├─────────┬────────────────┬────────────────┬────────────────┤
│  TIER   │  MECHANISM     │  WHAT HAPPENS  │  COST TO AGENT │
├─────────┼────────────────┼────────────────┼────────────────┤
│  T0     │  pass through  │  edit proceeds │  zero          │
│         │                │  no injection  │                │
├─────────┼────────────────┼────────────────┼────────────────┤
│  T1     │  advise        │  advisory      │  ~50 tokens    │
│         │                │  appended to   │  (reads it,    │
│         │                │  tool result   │  continues)    │
│         │                │  "[GATE STEER] │                │
│         │                │  N symbols     │                │
│         │                │  modified      │                │
│         │                │  without graph │                │
│         │                │  query"        │                │
├─────────┼────────────────┼────────────────┼────────────────┤
│  T2     │  block         │  edit REFUSED  │  ~100 tokens   │
│         │                │  error:        │  (must query   │
│         │                │  "GRAPH_GATE_  │  the graph     │
│         │                │  DRIFT_HIGH"   │  then retry)   │
│         │                │  + remedy      │                │
│         │                │  named         │                │
├─────────┼────────────────┼────────────────┼────────────────┤
│  T3     │  abort         │  TTSR fires    │  ~200 tokens   │
│         │                │  mid-stream    │  (reasoning    │
│         │                │  kill + rewind │  rewound,      │
│         │                │  law injected  │  must comply)  │
│         │                │  as system     │                │
│         │                │  message       │                │
└─────────┴────────────────┴────────────────┴────────────────┘
```

WHERE: T0-T2 in `graph-gate.ts`; T3 via TTSR rule (`.agent/rules/graph-gate.md`)
WHY: Proportional enforcement — the agent gets increasingly strong nudges, with the nuclear option (TTSR abort) reserved for extreme drift.

## §3 DISPATCH TRACES

### Trace 1: A doc-only edit (PASSES)

```
1. Agent calls edit({file: "README.md", oldString: "old", newString: "new"})
2. beforeToolCall fires → graph-gate.classifyEdit("edit", args)
3. classifyEdit: file ends .md → severity=NONE → return {pass: true}
4. Edit executes normally
5. afterToolCall: no action (no structural edit to log)
```

### Trace 2: A structural edit with graph coverage (PASSES at T1)

```
1. Agent calls ripwire({verb: "callers", target: "populateSessionStore"})
   → afterToolCall: graphQueries.push({timestamp, tool: "ripwire", target: "populateSessionStore"})
   → lastGraphQuery = now
2. Agent calls edit({file: "src/omp/populate.ts", oldString: "export function populateSessionStore", newString: "..."})
   → beforeToolCall: classifyEdit detects export change → severity=HIGH, touchedSymbols=["populateSessionStore"]
   → computeDrift: populateSessionStore HAS matching graph query → verified
   → drift = 0.0 (all edits verified) → TIER 0 → pass
3. Edit executes normally
```

### Trace 3: A blind spree (ESCALATES to T2)

```
1. Agent edits export function A (no prior graph query)
   → severity=HIGH, touchedSymbols=["A"], unverified → drift=1.0
   → but only 1 edit → totalWeight=1, drift=1/1=1.0... 
   → WAIT: temporal window is 5 minutes, single HIGH edit
   → drift high but editCount low → TIER 1 (advise)
2. Agent edits export function B (still no graph query)
   → severity=HIGH, touchedSymbols=["B"], unverified
   → 2 HIGH edits, 0 verified → drift=2/2=1.0
   → editCount=2 → still TIER 1 (warning in tool result)
3. Agent edits export function C (STILL no graph query)
   → 3 HIGH edits, 0 verified → drift=3/3=1.0
   → editCount=3, drift sustained → TIER 2 (BLOCK)
   → edit REFUSED with "GRAPH_GATE_DRIFT_HIGH: 3 structural edits
     without graph query. Call ripwire verb=callers or graph-query
     verb=who-calls on the symbols you are modifying."
4. Agent calls graph-query({verb: "who-calls", target: "C"})
   → afterToolCall: graphQueries records C → drift for C resets
   → Agent retries edit C → TIER 0 (pass) → edit succeeds
```

### Trace 4: The graph-call reset (RECOVERY)

```
1. Agent in WARNING state (drift=0.5 from 2 medium edits)
2. Agent calls graph-query({verb: "blast-radius", target: "myFunc"})
3. afterToolCall: graphQueries records myFunc
4. If next edit touches myFunc → verified → drift drops
5. Gate returns to IDLE (drift < 0.3 threshold)
```

## §4 TYPES + INTERFACES

```typescript
// src/omp/graph-gate.ts — the type contracts

enum EditSeverity { NONE, LOW, MEDIUM, HIGH }

enum GateTier { T0_PASS, T1_ADVISE, T2_BLOCK, T3_ABORT }

enum GateState { IDLE, TRACKING, WARNING, GATE_ON, HARD_STOP }

interface EditClassification {
  severity: EditSeverity
  structuralFlags: string[]     // ["export_change", "import_change"]
  touchedSymbols: string[]      // ["populateSessionStore", "openSessionStore"]
  targetFile: string
}

interface DriftResult {
  drift: number                 // 0.0-1.0
  unverifiedCount: number       // edits without graph coverage
  verifiedSymbols: string[]     // symbols that have been queried
  lastGraphQuery: number | null // timestamp
}

interface GateDecision {
  tier: GateTier
  state: GateState
  advisory?: string             // T1: the appended text
  blockReason?: string          // T2: the named error
  ttsrRuleName?: string         // T3: the rule to fire
}

interface GraphGateSessionState {
  editLog: Array<{ timestamp: number, severity: EditSeverity, symbols: string[] }>
  graphQueries: Array<{ timestamp: number, tool: string, target: string }>
  gateState: GateState
  drift: number
}
```

## §5 INVOKE PSEUDOCODE

```
┌─────────────────────────────────────────────────────────────┐
│  registerGraphGate(api: ExtensionAPI)                       │
├─────────────────────────────────────────────────────────────┤
│  INPUT:  api (the OMP extension API with hook surface)     │
│  OUTPUT: void (hooks registered, state initialized)        │
│                                                             │
│  1  state ← loadSessionState()                              │
│  2  api.onBeforeToolCall((toolName, args) →                 │
│  3    if toolName ∉ {edit, write} → return pass            │
│  4    classification ← classifyEdit(args)                   │
│  5    if classification.severity = NONE → return pass      │
│  6    recordEdit(classification, state)                     │
│  7    drift ← computeDrift(state)                           │
│  8    decision ← gateDecision(drift, state)                 │
│  9    if decision.tier = T1 →                               │
│  10     inject advisory into tool result context           │
│  11     return pass                                         │
│  12   if decision.tier = T2 →                               │
│  13     return block with named error                       │
│  14   if decision.tier = T3 →                               │
│  15     trigger TTSR rule (abort + rewind + inject)        │
│  16   return pass                                           │
│  17 )                                                       │
│  18                                                         │
│  19  api.onAfterToolCall((toolName, args) →                 │
│  20    if toolName ∈ {graph-query, ripwire} →              │
│  21     recordGraphQuery(args, state)                       │
│  22     resetDriftForSymbol(args.target, state)            │
│  23  )                                                      │
│  24                                                         │
│  25  api.onTurnEnd(() →                                     │
│  26    decayOldEdits(state)                                 │
│  27    persistSessionState(state)                           │
│  28  )                                                      │
└─────────────────────────────────────────────────────────────┘
```

## §6 FILE TREE (what v1.3 adds to the GI kernel)

```
src/omp/
├── extension.ts          (modified — registerGraphGate() wired)
├── graph-gate.ts         (NEW ~300 lines — the gate module)
├── typed-write.ts        (modified — graph_gate_state table)
└── ...

tests/
└── st-gi-graph-gate.test.ts  (NEW ~200 lines)
    ├── test_gate_passes_doc_edits
    ├── test_gate_advises_on_first_structural_edit
    ├── test_gate_blocks_sustained_drift
    ├── test_gate_resets_on_graph_query
    ├── test_temporal_decay_five_minute_window
    └── test_severity_classification

.agent/rules/
└── graph-gate.md         (NEW — the T3 TTSR rule)

~/.agent/rules/
└── anti-theatrical.md    (NEW — the TTSR conversion rules)
└── verification-before-declaration.md
└── anti-scope-shrink.md
└── basic-logic-check.md
└── red-team-default.md
```

## §7 LAWS + INVARIANTS

1. NEVER gate a non-code edit. Doc files (.md, .json, .yaml, .toml) pass through with zero friction — the gate's `classifyEdit()` returns `severity=NONE` and the tool call proceeds. The gate is for code, not prose.

2. ALWAYS reward graph usage. A graph call on any symbol the agent has edited resets the drift for that symbol to 0. The gate punishes blindness, not coding.

3. NEVER block a single edit. The minimum escalation path is T1 (advise) for the first 1-2 structural edits. T2 (block) requires sustained drift across ≥ 3 edits. The agent gets warnings before walls.

4. ALWAYS name the remedy. A T2 block includes: `"GRAPH_GATE_DRIFT_HIGH: N structural edits without graph query. Call ripwire verb=callers or graph-query verb=who-calls on the symbols you are modifying."` — the agent knows exactly what to do to unblock.

5. NEVER use T3 (abort) unless drift ≥ 0.8 AND ≥ 5 consecutive structural edits with zero graph queries. T3 is the nuclear option; it rewinds reasoning and injects the law mid-stream. Reserved for extreme cases.

6. ALWAYS decay over time. Edits older than 5 minutes contribute zero to the drift score. The gate tracks the WORKING window, not the session's full history.

7. ALWAYS persist session state. The gate's state machine survives turn boundaries (stored in the session's `graph_gate_state` table). A resumed session picks up where it left off.

## §8 ERROR VOCABULARY

| Token | Meaning | Tier |
|---|---|---|
| `GRAPH_GATE_PASS` | severity=NONE or drift < 0.3 | T0 |
| `GRAPH_GATE_STEER` | advisory appended to tool result | T1 |
| `GRAPH_GATE_DRIFT_HIGH` | edit blocked; graph query required | T2 |
| `GRAPH_GATE_ABORT` | TTSR mid-stream abort triggered | T3 |

## §9 V2 SCAFFOLD (forward compatibility, PROPOSED)

The v1.3 gate has three extension points — empty interfaces that v2 plugins will implement:

1. `onEditClassified(classification)` — v2: the SpecDriftLexicon plugs in here to classify edits against spec requirements
2. `onDriftComputed(driftResult)` — v2: the BlastRadiusWeighter plugs in here to weight severity by actual caller count
3. `onGateDecision(decision)` — v2: the ReasoningTokenAnalyzer plugs in here to adjust gate tolerance based on the agent's reasoning quality

These are PROPOSED with owner=operator. Not built in v1.3. The interfaces exist so v2 plugins can be added without touching the gate's core logic.
