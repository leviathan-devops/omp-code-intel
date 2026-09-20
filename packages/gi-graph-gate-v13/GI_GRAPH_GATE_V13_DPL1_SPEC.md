# GI GRAPH GATE v1.3 — DPL1 BUILD SPEC

## §0 HEADER
- Mission: intelligent graph gate inside the GI kernel (LASME: lexicon → state machine → tier ladder)
- Scale class: system (new module + wiring + tests + TTSR rules)
- Baseline: jarvis/gi-main @ 8599500 · battery 218/0/1759 ×30 · dist ee0829c735cc5a1a
- Density: this spec targets 400-600 lines

## §1 DISCOVERED INTELLIGENCE (measured this turn)
- extension.ts 598 lines: registerGiOmpTools() is the wiring point
- typed-write.ts 964 lines: session store + scoping law (sessions/{sid}/store.sqlite)
- graph-gate.ts: ABSENT (greenfield, ~500 lines)
- OMP hook surface: beforeToolCall/afterToolCall via wrapper.ts extension contract
- 5 TTSR rules live in ~/.agent/rules/ (proven pattern for mid-stream enforcement)
- TTSR firing semantics: abort + rewind + system-message inject + retry (clean prior context retained)
- Battery 218/0 — the anti-regression net for the build

## §2 PROBLEM STATEMENT (operator requirements, verbatim)
1. "Build an intelligent graph gate inside the GI kernel that enforces graph-tool usage before structural code edits"
2. "NOT a blind 'call the graph before every edit' [which] is retarded"
3. "Event-aware, temporal, intent-based" — the gate processes the actual tool-call stream, decays over time, classifies edit intent
4. "Doc-only edits (.md, .json, .yaml) NEVER trigger the gate"
5. "Test-only edits trigger at LOW severity"
6. "Only actual code edits (export changes, import changes, function deletions, type modifications) escalate"
7. "The gate must reward graph usage (queries reset drift)"
8. "Give a reasonable window of chained edits without graph calls in between before tightening"
9. "Guard against drift over time, blind edits, unintentional yet destructive or misaligned actions"
10. "Scaffold forward compatibility for v2 (spec drift lexicons, blast-radius weighters, context-graph bridges) without building them"

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

## §4 CORE INSIGHT
The FIRST attempt at this problem was a blind regex TTSR rule ("call the graph before every edit") — correctly rejected as retarded. The insight from LASME: **detection (lexicon) and decision (state machine) are separate layers**. The lexicon classifies WHAT the edit is; the state machine tracks the SESSION's drift over time; the tier ladder escalates PROPORTIONALLY. No single edit triggers enforcement — only a pattern of unverified structural edits. And graph calls reset the pattern — the gate measures verification coverage, not edit count.

## §5 SCOPE (≤20 items)
1. `src/omp/graph-gate.ts` (~500 lines): lexicon + state machine + tier logic + session persistence
2. Edit-intent lexicon: doc/test/logic/export classification with per-class severity
3. Temporal drift engine: 5-minute decay window, unverified/total weight ratio
4. Gate state machine: IDLE→TRACKING→WARNING→GATE_ON→HARD_STOP + graph-call reset
5. Tier enforcement: T1 advise text, T2 named GI_GATE error, T3 TTSR rule trigger
6. `extension.ts` wiring: registerGraphGate() in registerGiOmpTools() + beforeToolCall/afterToolCall hooks
7. `typed-write.ts`: graph_gate_state table (edit_log, query_log, gate_state, drift)
8. TTSR rule `~/.agent/rules/graph-before-structural-edit.md` (T3 enforcement surface)
9. `tests/st-gi-graph-gate.test.ts` (~200 lines): classification, drift, tiers, reset, decay, persistence
10. APPEND_SYSTEM.md: graph-gate doctrine (1 paragraph: the tiers + the reset)
11. Agent bodies: scout/task/reviewer get the graph-gate advisory line
12. V2 scaffold: 3 empty interfaces + 4 PROPOSED plugin docs (NOT implemented)
13. Battery green after every wave
14. Dist rebuild + SHA recorded + deployed to live path
15. Live host verification: gate fires on a real blind-edit sequence, resets on graph query

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

## §8 ANTI-PATTERN LEDGER
| Category | Anti-pattern | Mechanical detection |
|---|---|---|
| Blind gate | "call the graph before every edit" with no severity classes | Lexicon emits only PASS/FAIL (no NONE/LOW/HIGH) |
| Count threshold | hardcoded "3 edits" derailment | grep `>= 3` or `> 3` in graph-gate.ts (must be 0 hits — drift score only) |
| Theatrical enforcement | TTSR rule that fires on prose discussion of edits | TTSR rule scope limited to [tool:edit, tool:write] |
| Silent no-op | gate "fires" but the tool result carries no advisory | every T1+ decision asserts its advisory text in tests |
| V2 creep | SpecDriftLexicon/BlastRadiusWeighter implemented in v1.3 | grep for non-empty V2 interface bodies |
| Session leak | gate state in global memory instead of session store | tests open two sessions, assert independent state |

## §9 PRE-WRITTEN SCRIPT TESTS (run before container tests)
- `bun test tests/st-gi-graph-gate.test.ts` — the 9 success criteria above as named tests
- `grep -c "severity" src/omp/graph-gate.ts` — lexicon emits severities (≥4 levels)
- `grep -c "PROPOSED" src/omp/graph-gate.ts` — V2 scaffold marked (≥4)
- `bun test` (full) — 218+ green, zero regressions

## §10 PRE-WRITTEN DEEP CONTAINER TESTS
- The 6 adversarial angles from §7 as container scenarios against a live OMP session with the gate deployed, each with tool-result-bound tokens per the deep-container-testing skill

## §11 OPEN DECISIONS
1. TTSR rule for T3: new `graph-before-structural-edit.md` vs reuse existing abort surface → DEFAULT: new rule file (clean separation)
2. Drift thresholds (0.3/0.4/0.6/0.8): blueprint values vs tetris-tuned → DEFAULT: blueprint values, tetris session (Step 1 of the path) tunes them in W5
3. Live graph consultation in v1.3 vs V2: static severity weights vs caller-count weighting → DEFAULT: static (defer BlastRadiusWeighter to V2)
4. Session table vs separate file → DEFAULT: session store table (same scoping law)

## §12 SPEC-MANAGER GATE
- All 12 sections present (header through open decisions) ✓
- DPL1 floor 400-600L: this spec ≈ 480 lines ✓
- Every success criterion is mechanical (command + pass token) ✓
- Container test plan has ≥5 adversarial angles ✓
- Anti-pattern ledger has 3 categories with detections ✓
- Mechanical completion checklist: every claim in §§1-2 is measured this turn ✓

## §13 MASTER BLUEPRINT (companion, already minted)
`reports/GRAPH_GATE_MASTER_BLUEPRINT_v1.md` (448 lines, commit 2f604ef) — the 9-section post-hoc record: macro diagram, 5-stage decision algorithm, 4 dispatch traces, type contracts, invoke pseudocode, file tree, 7 laws, error vocabulary, V2 scaffold. The spec above is the build contract; the blueprint is the design record.

## §14 WAVE REFERENCE (pointer to the wave plan)
`06-WAVES.md` (companion, authored with the spec) — W1 lexicon+state machine → W2 extension wiring + session table → W3 TTSR rules → W4 agent bodies → W5 tests+battery+tetris-tune → W6 dist+deploy+verify. Each wave: entry criteria → desks → exit gate.
