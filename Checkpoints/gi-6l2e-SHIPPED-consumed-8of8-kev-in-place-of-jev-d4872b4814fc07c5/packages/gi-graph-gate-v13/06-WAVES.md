# WAVE PLAN — GI Kernel v1.3 Intelligent Graph Gate

## W1 — LEXICON + STATE MACHINE (the gate core)
- **Files owned:** src/omp/graph-gate.ts (NEW, ~500 lines) — EXCLUSIVE, no other wave touches it
- **Entry criteria:** DPL1 spec approved (this file), no open blockers
- **Desks:** 1 build desk
- **Work:** edit-intent lexicon (NONE/LOW/MEDIUM/HIGH per §7D classifyEdit contract); temporal drift engine (computeDrift per §7C); state machine + tier logic (gateDecision per §7C); session persistence (graph_gate_state table); V2 scaffold (3 empty interfaces, PROPOSED)
- **Exit gate:** `bun test tests/st-gi-graph-gate.test.ts` green (criteria 1-8 from §6); `grep -c PROPOSED src/omp/graph-gate.ts` ≥ 4
- **Evidence:** test output tail + `grep -c` counts

## W2 — EXTENSION WIRING + SESSION TABLE (the integration)
- **Files owned:** src/omp/extension.ts (registerGraphGate call inside registerGiOmpTools() :302 ONLY — no other lines); src/omp/typed-write.ts (graph_gate_state table beside gi_meta :60)
- **Entry criteria:** W1 exit gate green
- **Desks:** 1 build desk
- **Work:** beforeToolCall/afterToolCall hook registration; session table schema; turn-end decay + persist
- **Exit gate:** full battery green (218+); `grep -c "registerGraphGate" src/omp/extension.ts` = 1 (exactly one call site, never scattered)
- **Evidence:** `bun test` tail + grep count

## W3 — TTSR RULES (the mid-stream enforcement surface)
- **Files owned:** ~/.agent/rules/graph-before-structural-edit.md (NEW); ~/.omp/agent/APPEND_SYSTEM.md (1 doctrine paragraph, appended at tail)
- **Entry criteria:** W2 exit gate green
- **Desks:** 1 docs desk
- **Work:** T3 rule file (scope [tool:edit, tool:write], drift≥0.8 + 5-consecutive condition, contextMode discard, repeatMode once); doctrine paragraph
- **Exit gate:** rule file exists with valid frontmatter (`grep -c "contextMode" ~/.agent/rules/graph-before-structural-edit.md` = 1); doctrine paragraph present (`grep -c "Graph Gate" ~/.omp/agent/APPEND_SYSTEM.md` ≥ 1)
- **Evidence:** ls + grep counts

## W4 — AGENT BODIES (the identity surface)
- **Files owned:** ~/.omp/agent/agents/scout.md, task.md, reviewer.md (1 paragraph EACH, appended at tail — no existing lines touched)
- **Entry criteria:** W3 exit gate green
- **Desks:** 1 docs desk (PARALLELIZABLE with W3: disjoint files — ~/.agent/rules/* vs ~/.omp/agent/agents/*)
- **Work:** graph-gate advisory line in each agent body (query-before-edit + drift-reset law)
- **Exit gate:** `grep -c "graph" ~/.omp/agent/agents/task.md` increased vs pre-wave baseline (record baseline count in the wave ledger before editing)
- **Evidence:** grep counts per file + baseline numbers

## W5 — TESTS + BATTERY + TETRIS-TUNE (the verification)
- **Files owned:** tests/st-gi-graph-gate.test.ts (the 9 named tests from §9); threshold tuning ONLY (no mechanism changes — any mechanism change re-opens W1)
- **Entry criteria:** W4 exit gate green
- **Desks:** 1 test desk + 1 container desk (tetris session)
- **Work:** 9 named tests; full battery; tetris tuning session in a fresh container (threshold adjustments only, one commit per adjustment with its fire/no-fire data)
- **Exit gate:** `bun test` 218+ pass / 0 fail; tetris session completed with fire/no-fire log; every threshold change has its tuning commit
- **Evidence:** battery tail + tetris fire log + per-adjustment commits

## W6 — DIST + DEPLOY + VERIFY (the ship)
- **Files owned:** extensions/graph-intelligence/index.js (build output); ~/.omp/agent/extensions/graph-intelligence/index.js (deploy copy)
- **Entry criteria:** W5 exit gate green
- **Desks:** 1 ship desk
- **Work:** `bun build` → SHA recorded → cp to live path → import EXEC-OK → live host verification (blind-edit sequence fires T2 with verbatim error, graph query resets, doc edits pass)
- **Exit gate:** `grep -c "graph_gate_state\|GI_GATE_DRIFT_HIGH" extensions/graph-intelligence/index.js` ≥ 2; live T2 block witnessed with verbatim error quoted in the wave ledger
- **Evidence:** SHA + import output + T2 error text

## HYDRA ORGANIZATION
```
orchestrator (main session)
├── W1 desk: graph-gate.ts module (no dependencies, starts immediately)
├── W2 desk: extension + store wiring (starts after W1 green — shares NO files with W1)
├── W3 desk: TTSR rules + doctrine (starts after W2 green)
├── W4 desk: agent bodies (PARALLEL with W3 — disjoint files)
├── W5 desks: tests + tetris container (starts after W3+W4 green)
└── W6 desk: dist + deploy + verify (starts after W5 green)
```
Sequential waves except W3+W4 (disjoint file sets, explicitly parallelizable). No wave shares a file with another — the ownership map above is the contract; a wave touching another's files is SCOPE BREACH (F-44 class), stop and re-scope.
