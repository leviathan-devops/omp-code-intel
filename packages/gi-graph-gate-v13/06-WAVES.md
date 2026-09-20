# WAVE PLAN — GI Kernel v1.3 Intelligent Graph Gate

## W1 — LEXICON + STATE MACHINE (the gate core)
- **Files owned:** src/omp/graph-gate.ts (NEW, ~500 lines)
- **Entry criteria:** DPL1 spec approved, no open blockers
- **Desks:** 1 build desk (the gate module), 0 dependencies
- **Work:** edit-intent lexicon (NONE/LOW/MEDIUM/HIGH), temporal drift engine (5-min decay), state machine (IDLE→TRACKING→WARNING→GATE_ON→HARD_STOP), tier logic (T0-T3), session persistence (graph_gate_state), V2 scaffold (3 empty interfaces, marked PROPOSED)
- **Exit gate:** `bun test tests/st-gi-graph-gate.test.ts` green (criteria 1-8 from §6); V2 interfaces empty (grep PROPOSED ≥ 4)
- **Evidence:** test output tail + `grep -c` counts

## W2 — EXTENSION WIRING + SESSION TABLE (the integration)
- **Files owned:** src/omp/extension.ts (registerGraphGate + hooks), src/omp/typed-write.ts (graph_gate_state table)
- **Entry criteria:** W1 exit gate green
- **Desks:** 1 build desk
- **Work:** beforeToolCall/afterToolCall hook registration in registerGiOmpTools(); session table schema; turn-end decay + persist
- **Exit gate:** full battery green (218+); `grep -c` gate markers in src (not yet dist)
- **Evidence:** `bun test` tail

## W3 — TTSR RULES (the mid-stream enforcement surface)
- **Files owned:** ~/.agent/rules/graph-before-structural-edit.md (NEW); APPEND_SYSTEM.md (1 paragraph doctrine)
- **Entry criteria:** W2 exit gate green
- **Desks:** 1 docs desk
- **Work:** T3 rule file (scope [tool:edit, tool:write], drift≥0.8 + 5-consecutive condition); doctrine paragraph in APPEND_SYSTEM.md
- **Exit gate:** rule file exists with valid frontmatter; doctrine paragraph present
- **Evidence:** `ls ~/.agent/rules/graph-before-structural-edit.md` + `grep -c "Graph Gate" ~/.omp/agent/APPEND_SYSTEM.md`

## W4 — AGENT BODIES (the identity surface)
- **Files owned:** ~/.omp/agent/agents/scout.md, task.md, reviewer.md (1 paragraph each)
- **Entry criteria:** W3 exit gate green
- **Desks:** 1 docs desk
- **Work:** graph-gate advisory line in each agent body (query-before-edit + drift-reset law)
- **Exit gate:** `grep -c "graph" ~/.omp/agent/agents/task.md` increased vs baseline
- **Evidence:** grep counts per file

## W5 — TESTS + BATTERY + TETRIS-TUNE (the verification)
- **Files owned:** tests/st-gi-graph-gate.test.ts; no src changes except threshold tuning from tetris data
- **Entry criteria:** W4 exit gate green
- **Desks:** 1 test desk + 1 container desk (tetris session)
- **Work:** 9 named tests (criteria 1-8 + persistence); full battery; tetris tuning session in a fresh container (threshold adjustments only, documented per change)
- **Exit gate:** `bun test` 218+ pass / 0 fail; tetris session completed with fire/no-fire log
- **Evidence:** battery tail + tetris fire log

## W6 — DIST + DEPLOY + VERIFY (the ship)
- **Files owned:** extensions/graph-intelligence/index.js; ~/.omp/agent/extensions/graph-intelligence/index.js
- **Entry criteria:** W5 exit gate green
- **Desks:** 1 ship desk
- **Work:** `bun build` → SHA recorded → cp to live path → import EXEC-OK → live host verification (blind-edit sequence fires T2, graph query resets, doc edits pass)
- **Exit gate:** `grep -c "graph_gate_state\|GI_GATE_DRIFT_HIGH" extensions/graph-intelligence/index.js` ≥ 2; live T2 block witnessed with verbatim error
- **Evidence:** SHA + import output + T2 error text

## HYDRA ORGANIZATION
```
orchestrator (main session)
├── W1 desk: graph-gate.ts module
├── W2 desk: extension + store wiring (starts after W1 green)
├── W3 desk: TTSR rules + doctrine (starts after W2 green)
├── W4 desk: agent bodies (starts after W3 green)
├── W5 desks: tests + tetris container (starts after W4 green)
└── W6 desk: dist + deploy + verify (starts after W5 green)
```
Sequential waves (shared files within wave groups); W3+W4 could parallelize (disjoint files: ~/.agent/rules/* vs ~/.omp/agent/agents/*) if the orchestrator rules to do so.
