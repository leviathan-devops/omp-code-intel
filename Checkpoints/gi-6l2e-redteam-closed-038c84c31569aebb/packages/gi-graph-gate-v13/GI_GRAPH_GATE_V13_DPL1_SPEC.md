# GI GRAPH GATE v1.3 — DPL1 BUILD SPEC

## §0 HEADER
- Mission: intelligent graph gate inside the GI kernel (LASME: lexicon → state machine → tier ladder)
- Scale class: system (new module + wiring + tests + TTSR rules)
- Baseline: jarvis/gi-main @ 8599500 · battery 218/0/1759 ×30 · dist ee0829c735cc5a1a
- Density: this spec targets 400-600 lines

## §1 DISCOVERED INTELLIGENCE (measured this turn, first-hand)
- `src/omp/extension.ts` 598 lines: `registerGiOmpTools(pi, cwdOf)` at :302 owns every `pi.registerTool()` call (`:306`, `:345`, `:576`, `:582`); the gate registers its hooks inside this function so it ships in the SAME bundle
- `src/omp/typed-write.ts` 964 lines: `openTypedStore()` at :145 is the session-store gate every verb funnels through; tables gi_meta (:60) + typed_nodes (:64) + typed_edges (:74) live beside the new `graph_gate_state` table
- `src/omp/graph-gate.ts`: ABSENT (greenfield, ~500 lines to write) — `grep -n "classifyEdit\|computeDrift\|gateDecision" src/omp/extension.ts src/omp/typed-write.ts` = 0 hits
- OMP hook surface: `beforeToolCall`/`afterToolCall` wired at `agent-session.ts:1333-1337` (extension contract in `wrapper.ts` ~:178); the same surface `code-retrieval/index.js` uses
- TTSR: 5 rules live in `~/.agent/rules/` (anti-theatrical, verification-before-declaration, anti-scope-shrink, basic-logic-check, red-team-default); firing semantics = abort + rewind + system-message inject + retry (clean prior context retained)
- Extension tools registered: `GI_TOOL_NAMES` at `extension.ts:20` = graph-probe, graph-query, bug-hunt, aether-code-audit (+ graph-code-audit alias)
- Agent bodies: scout/task/reviewer in `~/.omp/agent/agents/` (task.md carries the one existing ripwire line)
- APPEND_SYSTEM.md: 31 lines (graph-first doctrine + hard-dependency law + anti-theatrical law + semantic commit tokens)
- Battery 218/0/1749 ×30 files — the anti-regression net for the build
- Deployed dist sha16=ee0829c7 (repo == host, `bun -e import` EXEC-OK)

## §2 PROBLEM STATEMENT (operator requirements, verbatim)
1. "Build an intelligent graph gate inside the GI kernel that enforces graph-tool usage before structural code edits"
2. "NOT a blind 'call the graph before every edit' [which] is retarded"
3. "Event-aware, temporal, intent-based" — the gate processes the actual tool-call stream, decays over time, classifies edit intent
4. "Doc-only edits (.md, .json, .yaml) NEVER trigger the gate" — spec anchor: the lexicon MUST emit severity NONE for non-code suffixes; success criterion 1 pins it; container angle 2 proves it with 20 doc edits
5. "Test-only edits trigger at LOW severity"
6. "Only actual code edits (export changes, import changes, function deletions, type modifications) escalate"
7. "The gate must reward graph usage (queries reset drift)" — spec anchor: `resetDriftForSymbol()` in the afterToolCall hook; success criteria 3+5 pin it; container angle 3 proves it
8. "Give a reasonable window of chained edits without graph calls in between before tightening"
9. "Guard against drift over time, blind edits, unintentional yet destructive or misaligned actions"
10. "Scaffold forward compatibility for v2 (spec drift lexicons, blast-radius weighters, context-graph bridges) without building them" — spec anchor: the 3 empty interfaces (`onEditClassified`, `onDriftComputed`, `onGateDecision`) + 4 PROPOSED plugin docs; success criterion 8 pins emptiness; anti-pattern row 5 (V2 creep) guards it

## §3 ARCHITECTURE
The gate is a module inside the existing extension bundle (`src/omp/graph-gate.ts`), not a separate extension:

```
beforeToolCall(edit/write args)
  → classifyEdit(): NONE (doc) | LOW (test) | MEDIUM (logic) | HIGH (export/import/delete/type)
  → recordEdit() into session state (timestamp, severity, symbols)
  → computeDrift(): unverifiedWeight / totalWeight over 5-min decay window
  → gateDecision(drift): T0 pass (<0.3) | T1 advise (≥0.4) | T2 block (≥0.6) | T3 abort (≥0.8 + 5 consecutive)
  → afterToolCall(graph-query|ripwire): recordGraphQuery() → resetDriftForSymbol()

Session state: graph_gate_state table in the session store (edit log + query log + gate state + drift).
V2 scaffold: onEditClassified / onDriftComputed / onGateDecision empty interfaces + SpecDriftLexicon / BlastRadiusWeighter / ReasoningTokenAnalyzer / ContextGraphBridge documented as PROPOSED.
```

### §3.1 WIRING POINT (first-hand this turn)
- `src/omp/extension.ts:302` — `registerGiOmpTools(pi, cwdOf)` owns every `pi.registerTool()` call; the gate registers its hooks inside this function so it ships in the SAME bundle (`extensions/graph-intelligence/index.js`, sha16=ee0829c7)
- `src/omp/typed-write.ts:145` — `openTypedStore()` is the session-store gate every verb funnels through; the gate's `graph_gate_state` table lives beside `gi_meta`, `typed_nodes`, `typed_edges` in the same session sqlite
- `src/omp/extension.ts:54` — `getMeta(storePath, "substrate")` is how verbs read session state today; the gate reads `graph_gate_state` by the same pattern (open store → query → close)

### §3.2 DECISION ALGORITHM (the 5 stages, anchored)
1. **classifyEdit** (`src/omp/graph-gate.ts` NEW): doc (.md/.json/.yaml) → NONE; test files → LOW; logic bodies → MEDIUM; export/import/delete/type → HIGH
2. **recordEdit**: append (timestamp, severity, symbols) to the session's edit log
3. **computeDrift**: unverifiedWeight / totalWeight over the 5-minute decay window; a graph query on a touched symbol excludes that symbol's weight
4. **gateDecision(drift)**: T0 pass (<0.3) → T1 advise (≥0.4) → T2 block (≥0.6, `GI_GATE_DRIFT_HIGH`) → T3 abort (≥0.8 + 5 consecutive, TTSR `graph-before-structural-edit`)
5. **recordGraphQuery + resetDriftForSymbol** on every graph-query/ripwire tool call (afterToolCall hook)

### §3.3 STATE CONTRACT
```
graph_gate_state(session_id TEXT PRIMARY KEY, drift REAL, state TEXT, edits_json TEXT, queries_json TEXT, updated_ms INTEGER)
```
One row per session. Read-modify-write inside the session store's existing open/close discipline (`src/omp/typed-write.ts:145` openTypedStore pattern). No global memory — two sessions never share drift.

## §4 CORE INSIGHT
The FIRST attempt at this problem was a blind regex TTSR rule ("call the graph before every edit") — correctly rejected as retarded: it fires on doc edits, has no session memory, no severity classes, no decay, and no reward for graph usage. The insight from LASME (per the Paragon V1 boilerplate): **detection (lexicon) and decision (state machine) are separate layers**. The lexicon answers only "WHAT is this edit" (severity + symbols); the state machine answers only "WHAT is this session's drift" (unverified weight over time); the tier ladder answers only "WHAT enforcement fits this drift" (pass/advise/block/abort). A single layer doing all three is the blind gate. No single edit triggers enforcement — only a pattern of unverified structural edits. And graph calls reset the pattern — the gate measures verification coverage, never edit count. The insight from LASME: **detection (lexicon) and decision (state machine) are separate layers**. The lexicon classifies WHAT the edit is; the state machine tracks the SESSION's drift over time; the tier ladder escalates PROPORTIONALLY. No single edit triggers enforcement — only a pattern of unverified structural edits. And graph calls reset the pattern — the gate measures verification coverage, not edit count.

## §5 SCOPE (≤20 items, each anchored to its landing file)
1. `src/omp/graph-gate.ts` (~500 lines, NEW): lexicon + state machine + tier logic + session persistence — the ONLY new source file
2. Edit-intent lexicon (`graph-gate.ts:classifyEdit`): doc (.md/.json/.yaml/.toml) → NONE; test files → LOW; logic bodies → MEDIUM; export/import/delete/type → HIGH
3. Temporal drift engine (`graph-gate.ts:computeDrift`): 5-minute decay window, unverified/total weight ratio; graph queries on a touched symbol exclude that symbol's weight
4. Gate state machine (`graph-gate.ts:gateDecision`): IDLE→TRACKING→WARNING→GATE_ON→HARD_STOP; tier map T0<0.3 / T1≥0.4 / T2≥0.6 / T3≥0.8+5-consecutive
5. Tier enforcement: T1 advisory text appended to tool result; T2 named `GI_GATE_DRIFT_HIGH` error + remedy; T3 trigger of TTSR rule `graph-before-structural-edit`
6. `src/omp/extension.ts:302` registerGiOmpTools(): `registerGraphGate(pi)` wired inside the existing registration block — ships in the SAME bundle (sha16 target recorded at build)
7. `src/omp/typed-write.ts:145` openTypedStore() pattern: `graph_gate_state(session_id TEXT PRIMARY KEY, drift REAL, state TEXT, edits_json TEXT, queries_json TEXT, updated_ms INTEGER)` beside gi_meta/typed_nodes/typed_edges
8. TTSR rule `~/.agent/rules/graph-before-structural-edit.md` (NEW, T3 surface): scope [tool:edit, tool:write], condition drift≥0.8 + 5-consecutive structural edits with zero graph queries, contextMode discard, repeatMode once
9. `tests/st-gi-graph-gate.test.ts` (~200 lines, NEW): the 9 success criteria as named tests (criteria 1-8 + persistence)
10. `~/.omp/agent/APPEND_SYSTEM.md`: 1 doctrine paragraph (the tiers + the graph-call reset law)
11. `~/.omp/agent/agents/{scout,task,reviewer}.md`: 1 advisory line each (query-before-edit + drift-reset law)
12. V2 scaffold: `onEditClassified` / `onDriftComputed` / `onGateDecision` EMPTY interfaces + SpecDriftLexicon / BlastRadiusWeighter / ReasoningTokenAnalyzer / ContextGraphBridge docs MARKED PROPOSED — zero implementation
13. Battery green after every wave (`bun test`, 218+ pass / 0 fail floor)
14. Dist rebuild + SHA recorded + deployed to `~/.omp/agent/extensions/graph-intelligence/index.js`
15. Live host verification: a real blind-edit sequence fires T2 (verbatim error quoted), a graph query resets, doc edits pass

## §6 SUCCESS CRITERIA (mechanical table)
| # | Criterion | Command / check | Pass |
|---|---|---|---|
| 1 | Lexicon classifies doc edits as NONE | `bun test st-gi-graph-gate -t classify_doc` green | pass |
| 2 | Lexicon classifies export edits as HIGH | `bun test st-gi-graph-gate -t classify_export` green | pass |
| 3 | Drift < 0.3 on graph-covered sequence | test with query-every-3-edits → T0 | pass |
| 4 | Drift ≥ 0.6 on 5 consecutive blind HIGH edits | test asserts T2 block with GI_GATE_DRIFT_HIGH | pass |
| 5 | Graph query resets drift for that symbol | test: edit → query → edit same symbol → T0 | pass |
| 6 | 5-min decay zeroes old edits | test with backdated timestamps → old weight 0 | pass |
| 7 | Session state persists across turns | test: write → re-read via new handle | pass |
| 8 | V2 interfaces exist but are empty | `grep -c "PROPOSED\|TODO(v2)" graph-gate.ts` ≥ 4 | pass |
| 9 | Full battery green | `bun test` 218+ pass / 0 fail | pass |
| 10 | Dist contains the gate markers | `grep -c "graph_gate_state\|GI_GATE_DRIFT_HIGH" extensions/graph-intelligence/index.js` ≥ 2 | pass |

## §7 CONTAINER TEST PLAN (≥5 adversarial angles, tool-result-bound tokens)
1. **Blind-spree attack:** 6 consecutive export edits with zero graph queries → expect T2 block token `GRAPH_GATE_DRIFT_HIGH` in a tool result
2. **Doc-flood bypass attempt:** 20 doc edits → expect ZERO gate fires, all pass through
3. **Query-then-edit legit:** graph query → edit same symbol → expect T0 pass, advisory absent
4. **Decay evasion:** 2 edits, wait past 5-min window (mock clock), 2 more edits → expect T0 (old weight decayed), never T2
5. **Severity gaming:** 10 LOW edits (comments) with zero queries → expect max T1 (LOW weight never reaches T2 alone)
6. **Reset gaming:** edit A → query UNRELATED symbol B → edit A again → expect still drifted (reset is per-symbol, not global)

## §7B DISPATCH TRACES (every hop, exact call shape)

### Trace 1: a doc-only edit (PASSES at T0, zero friction)
```
1. Agent calls edit({file: "README.md", oldString, newString})
2. beforeToolCall fires → classifyEdit("edit", args)
3. classifyEdit: file ends .md → severity=NONE
4. gateDecision skipped entirely (NONE short-circuits)
5. Edit executes normally
6. afterToolCall: no-op (nothing structural to log)
```

### Trace 2: a covered structural edit (PASSES at T0)
```
1. Agent calls ripwire({verb: "callers", target: "populateSessionStore"})
   → afterToolCall: graphQueries.push({timestamp, tool: "ripwire", target: "populateSessionStore"})
2. Agent calls edit({file: "src/omp/populate.ts", oldString: "export function populateSessionStore", ...})
   → beforeToolCall: classifyEdit detects export change → HIGH, symbols=["populateSessionStore"]
   → computeDrift: populateSessionStore HAS matching graph query → verified
   → drift = 0.0 → T0 → pass
3. Edit executes normally
```

### Trace 3: a blind spree (ESCALATES T1→T2)
```
1. Edit export function A (no prior graph query) → HIGH, unverified → drift computed over 1 edit → T1 (advise appended to tool result)
2. Edit export function B (still no query) → 2 HIGH unverified → T1 again
3. Edit export function C (still no query) → 3 HIGH unverified, drift ≥ 0.6 → T2
   → edit REFUSED: "GRAPH_GATE_DRIFT_HIGH: 3 structural edits without graph query. Call ripwire verb=callers or graph-query verb=who-calls on the symbols you are modifying."
4. Agent calls graph-query({verb: "who-calls", target: "C"})
   → afterToolCall records C → drift for C resets
5. Agent retries edit C → T0 → succeeds
```

### Trace 4: graph-call recovery (the reward path)
```
1. Agent in WARNING (drift 0.5 from 2 unverified medium edits)
2. Agent calls graph-query({verb: "blast-radius", target: "myFunc"})
3. afterToolCall: graphQueries records myFunc
4. Next edit touches myFunc → verified → drift drops below 0.3
5. Gate returns to IDLE
```

## §7C INVOKE PSEUDOCODE (the decision algorithm, implementable)

```
registerGraphGate(api):
  state ← loadSessionState()
  api.onBeforeToolCall((toolName, args) →
    if toolName ∉ {edit, write} → return pass
    classification ← classifyEdit(args)
    if classification.severity = NONE → return pass
    recordEdit(classification, state)
    drift ← computeDrift(state)
    decision ← gateDecision(drift, state)
    if decision.tier = T1 →
      inject advisory into tool result context
      return pass
    if decision.tier = T2 →
      return block "GRAPH_GATE_DRIFT_HIGH: <count> structural edits..."
    if decision.tier = T3 →
      trigger TTSR rule graph-before-structural-edit
    return pass)

  api.onAfterToolCall((toolName, args) →
    if toolName ∈ {graph-query, ripwire} →
      recordGraphQuery(args, state)
      resetDriftForSymbol(args.target, state))

  api.onTurnEnd(() →
    decayOldEdits(state)
    persistSessionState(state))

computeDrift(state):
  now ← Date.now()
  unverifiedWeight ← 0
  totalWeight ← 0
  for edit in state.editLog (last 5 min):
    age ← now - edit.timestamp
    decay ← max(0, 1 - age/300000)
    weight ← edit.severity * decay
    totalWeight += weight
    if edit.symbols have NO matching graphQueries →
      unverifiedWeight += weight
  return unverifiedWeight / max(totalWeight, 1)
```

## §7D INTERFACE TABLE (exports, types, contracts, calibration)

| Export | Type | Contract | Calibration |
|---|---|---|---|
| `classifyEdit(toolName, args)` | (string, object) → EditClassification | Returns NONE/LOW/MEDIUM/HIGH + symbols[]; NEVER throws (unknown suffix → LOW, never NONE) | severity map: doc=0, test=1, logic=2, export=3 |
| `computeDrift(state)` | GraphGateSessionState → DriftResult | Returns 0.0-1.0; empty log → 0.0; all-verified → 0.0 | decay window 300000ms; tier cuts 0.3/0.4/0.6/0.8 |
| `gateDecision(drift, state)` | (number, state) → GateDecision | T0<0.3, T1≥0.4, T2≥0.6, T3≥0.8+5-consecutive; T1 always before T2 on the same drift curve | 5-consecutive counter resets on any graph query |
| `recordGraphQuery(args, state)` | void | Appends {timestamp, tool, target}; idempotent for duplicate targets | target normalized (strip parens, lowercase kind) |
| `resetDriftForSymbol(target, state)` | void | Zeroes weight for edits whose symbols match target; per-symbol, never global | match = exact symbol OR file-scoped (`file:sym`) |
| `registerGraphGate(api)` | ExtensionAPI → void | Registers before/after/turn hooks; loads session state; safe to call twice (idempotent registration) | called once from registerGiOmpTools() |

## §7E FAILURE MODES (per component)

| Component | Failure | Symptom | Handling |
|---|---|---|---|
| classifyEdit | unknown file suffix | severity misassigned | default LOW (never NONE for unknown code) |
| computeDrift | clock skew (backdated timestamps) | decay computes negative age | clamp age ≥ 0; test covers |
| gateDecision | drift exactly on a cut (0.6) | ambiguous tier | lower tier wins (advisory before block) |
| recordGraphQuery | target missing from args | undefined symbol logged | normalize to "" and skip reset (no crash) |
| session persist | store locked (concurrent turn) | persist throws | catch + log; next turn re-reads (eventual consistency) |
| TTSR T3 | rule file absent | abort never fires | T2 remains the ceiling; T3 logged as UNWIRED |

## §8 ANTI-PATTERN LEDGER
| Category | Anti-pattern | Mechanical detection |
|---|---|---|
| Blind gate | "call the graph before every edit" with no severity classes | Lexicon emits only PASS/FAIL (no NONE/LOW/HIGH) |
| Count threshold | hardcoded "3 edits" derailment | grep `>= 3` or `> 3` in graph-gate.ts (must be 0 hits — drift score only) |
| Theatrical enforcement | TTSR rule that fires on prose discussion of edits | TTSR rule scope limited to [tool:edit, tool:write] |
| Silent no-op | gate "fires" but the tool result carries no advisory | every T1+ decision asserts its advisory text in tests |
| V2 creep | SpecDriftLexicon/BlastRadiusWeighter implemented in v1.3 | grep for non-empty V2 interface bodies |
| Session leak | gate state in global memory instead of session store | tests open two sessions, assert independent state |

## §9 PRE-WRITTEN SCRIPT TESTS (run before container tests — exact identifiers)
- `bun test tests/st-gi-graph-gate.test.ts -t classify_doc_edits_none` (§6.1: doc files → NONE)
- `bun test tests/st-gi-graph-gate.test.ts -t classify_export_edits_high` (§6.2: export/import/delete/type → HIGH)
- `bun test tests/st-gi-graph-gate.test.ts -t drift_low_on_covered_sequence` (§6.3: query every 3rd edit → T0)
- `bun test tests/st-gi-graph-gate.test.ts -t drift_blocks_blind_high_spree` (§6.4: 5 consecutive blind HIGH → T2 + GI_GATE_DRIFT_HIGH)
- `bun test tests/st-gi-graph-gate.test.ts -t query_resets_drift_for_symbol` (§6.5: edit → query same → edit → T0)
- `bun test tests/st-gi-graph-gate.test.ts -t decay_zeroes_old_edits` (§6.6: backdated >5min → weight 0)
- `bun test tests/st-gi-graph-gate.test.ts -t state_persists_across_turns` (§6.7: write → new handle re-read)
- `bun test tests/st-gi-graph-gate.test.ts -t v2_interfaces_empty` (§6.8: grep PROPOSED ≥ 4 + bodies empty)
- `bun test tests/st-gi-graph-gate.test.ts -t reset_is_per_symbol` (§7 angle 6: query B does NOT clear A)
- `grep -c "severity" src/omp/graph-gate.ts` — lexicon emits severities (≥4 levels: NONE/LOW/MEDIUM/HIGH)
- `grep -c "PROPOSED" src/omp/graph-gate.ts` — V2 scaffold marked (≥4)
- `bun test` (full) — 218+ green, zero regressions

## §10 PRE-WRITTEN DEEP CONTAINER TESTS (bound to §5 scope items)
- Angle 1 (blind spree) proves scope items 4+5 (state machine reaches GATE_ON, T2 named error fires)
- Angle 2 (doc flood) proves scope item 2 (NONE classification never escalates)
- Angle 3 (query-then-edit) proves scope items 3+5 (graph-call reset + T0 pass)
- Angle 4 (decay evasion) proves scope item 3 (5-minute decay zeroes old weight)
- Angle 5 (severity gaming) proves scope item 2 (LOW never reaches T2 alone)
- Angle 6 (reset gaming) proves scope item 3 (reset is per-symbol, global query does not clear unrelated drift)
- Each as a container scenario against a live OMP session with the gate deployed, tool-result-bound tokens per the deep-container-testing skill

## §11 OPEN DECISIONS (each with evidence + recommended default)
1. TTSR rule for T3 — new `graph-before-structural-edit.md` vs reuse an existing abort surface.
   Evidence: the 5 live TTSR rules (`~/.agent/rules/`) are all single-purpose files; no existing rule covers edit-structure gating. Reuse would mean cross-rule bleed (anti-pattern 10 of warhead-writing).
   Recommended default: NEW rule file (clean separation). Owner if overruled: whoever merges two rule scopes must re-tune both condition lists.
2. Drift thresholds (0.3/0.4/0.6/0.8) — blueprint values vs tetris-tuned.
   Evidence: the values are reasoned (T1 advisory must fire before a 3-edit chain completes; T3 abort must not fire inside a normal 5-edit refactor). No live measurement exists yet.
   Recommended default: blueprint values for W1-W4; the Step-1 tetris session tunes them in W5 with fire/no-fire data. Owner if overruled: the tuner must re-run criteria 3+4.
3. Live graph consultation in v1.3 vs V2 — static severity weights vs caller-count weighting from live `whoCalls()`/`impact()`.
   Evidence: static weights cannot distinguish a 2-caller rename from a 153-caller rename. But wiring live consultation adds the store-open path to the hot gate path (latency + failure surface).
   Recommended default: STATIC in v1.3 (defer BlastRadiusWeighter to V2). Owner if overruled: must add the store-open failure wrap (F39 pattern) to the gate's hot path.
4. Session table vs separate file — `graph_gate_state` in the session sqlite vs a per-session JSON sidecar.
   Evidence: session sqlite already carries gi_meta/typed_nodes/typed_edges via `src/omp/typed-write.ts:145` openTypedStore(); the scoping law (sessions/{sid}/store.sqlite) applies. A sidecar duplicates the scoping + corruption rules.
   Recommended default: session store table. Owner if overruled: must re-implement scoping + corruption + symlink-refusal for the sidecar.

## §12 SPEC-MANAGER GATE (mechanical checklist, run before dispatch)
- [ ] All 14 sections present (§0 through §14) — `grep -c "^## §" GI_GRAPH_GATE_V13_DPL1_SPEC.md` = 15 (header + 14)
- [ ] DPL1 floor 400-600L — `wc -l` in band (currently 148 → EXPAND to floor before dispatch)
- [ ] Every success criterion is mechanical (command + pass token) — §6 rows 1-10 each name a `bun test -t` or grep command
- [ ] Container test plan has ≥5 adversarial angles bound to scope items — §7 (6 angles) + §10 (per-angle scope binding)
- [ ] Anti-pattern ledger has 3+ categories with MECHANICAL detections — §8 (6 rows, each with a grep/test detection)
- [ ] Open decisions carry evidence + recommended default + overrule owner — §11 (4 decisions)
- [ ] File:line anchors: every landing file named — §5 items 1,6,7,8,9 carry paths
- [ ] Zero trident references in built code — incident records in ship docs (F-44/EN-026) are the audit trail, not references
- [ ] Zero imported foreign nouns — no Hormuz/game-studio/poseidon terms

## §13 MASTER BLUEPRINT (companion, already minted)
`reports/GRAPH_GATE_MASTER_BLUEPRINT_v1.md` (448 lines, commit 2f604ef) — the 9-section post-hoc record: macro diagram, 5-stage decision algorithm, 4 dispatch traces, type contracts, invoke pseudocode, file tree, 7 laws, error vocabulary, V2 scaffold. The spec above is the build contract; the blueprint is the design record.

## §14 WAVE REFERENCE (pointer to the wave plan)
`06-WAVES.md` (companion, authored with the spec) — W1 lexicon+state machine → W2 extension wiring + session table → W3 TTSR rules → W4 agent bodies → W5 tests+battery+tetris-tune → W6 dist+deploy+verify. Each wave: entry criteria → desks → exit gate.
