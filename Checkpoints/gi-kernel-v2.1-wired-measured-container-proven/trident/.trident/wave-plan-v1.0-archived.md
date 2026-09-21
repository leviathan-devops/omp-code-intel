# GI-OMP FIRST-CLASS — WAVE PLAN
WAVES: 8

## TARGET (verbatim success criteria T-1..T-n)
T-1 Session store path {scopeRoot}/.omp/graph-intelligence/sessions/{sid24}/store.sqlite
T-2 Master registry WAL sqlite env-chained; NO JSON fallback
T-3 GI_SCOPE_REFUSED on cross-session open
T-4 graph-query, graph-probe, bug-hunt, gi-audit registered
T-5 graph-gate STEER default; FULL → GRAPH_GATE_SIGNATURE_BREAK
T-6 Dual FRESH sessions disjoint typed_nodes
T-7 EN-38 frozen GRAPHIFY_GRAPH_TOO_LARGE
T-8 code-retrieval fourth branch; keep grep/ripwire/opengrok
T-9 config.yml extensions APPEND
T-10 WAVE 3 isolation + WAVE 4 headed TUI (SC-9/SC-10 legal stop)

## BASELINE (verified 2026-09-14)
B-1 Fork live-tree 249 files seal 63247bff8e2baf8f EXISTS
B-2 vendor/workspace-scoped-state-boilerplate/ 6 ts EXISTS
B-3 src/scoping ABSENT
B-4 src/omp ABSENT
B-5 GI tools ABSENT from OMP advertised schema
B-6 tests/st-gi-omp-*.ts ABSENT

## TARGET CLASSIFICATION (§T)
migration + new OMP surface. D-modes: D1 silent fallback, D3 theatrical complete, D7 dual-write race. T-classes: T1 stub, T2 shared-store leak, T5 schema-snapshot.

## THE ORACLE TABLE (§O)
| OR-1 | two sessionIds same cwd → two store paths containing /sessions/ | bun test tests/st-gi-omp-scope.ts |
| OR-2 | shared project store path MUST refuse | bun test known-bad SHARED-PROJECT-STORE |
| OR-3 | global ~/.omp/graph-intelligence/store.sqlite MUST refuse as session store | bun test AP-2 |
| OR-4 | path regex /sessions/{sid24}/store.sqlite | node assert |

## BACKWARD MAP
T-1 ← sessionStorePath helper ← ScopeResolver + sessionKey ← boilerplate copy ← B-2
T-3 ← openSessionStore ← registry ← T-1
SC-9/SC-10 ← tools+gate+config ← T-1..T-5

## FORWARD WAVES
### Wave 0 — scoping interfaces (START NOW)  [depends: none]
  Files: src/scoping/* tests/st-gi-omp-scope.ts package.json tsconfig.json
  Gate: bun test tests/st-gi-omp-scope.ts → exit 0 AND known-bad shared path refused
### Wave 1 — registry + openSessionStore  [depends: wave 0]
  Files: src/omp/store-open.ts src/omp/gi-registry.ts tests/st-gi-omp-refuse.ts tests/st-gi-omp-wipe.ts
  Gate: bun test tests/st-gi-omp-refuse.ts tests/st-gi-omp-wipe.ts MUST refuse
### Wave 2 — tools extension  [depends: wave 1]
  Files: src/omp/extension.ts src/omp/tools/*.ts extensions/graph-intelligence/index.js
  Gate: factory registerTool names graph-query graph-probe bug-hunt gi-audit
### Wave 3 — WAVE 3 isolation critic  [depends: wave 1]
  Files: tests/st-gi-omp-isolate.ts
  Gate: disjoint typed_nodes two sandboxes
### Wave 4 — WAVE 4 gate middleware  [depends: wave 1]
  Files: src/omp/gate-middleware.ts tests/st-gi-omp-gate.ts
  Gate: FULL token + OFF zero-misfire
### Wave 5 — trident-omp + config.yml APPEND  [depends: wave 2]
  Files: OMP_WORKSPACE/trident-omp/src/tools/gi-omp.ts both config.yml
  Gate: config lists GI path AND trident-omp AND code-retrieval
### Wave 6 — skills  [depends: wave 2]
  Files: skills/graph-intelligence/SKILL.md code-retrieval skill edit
  Gate: skill file exists; grep still names ripwire
### Wave 7 — headed dual-FRESH container  [depends: waves 2-6]
  Files: docs/ct-plan.md .omp/ct-results.json
  Gate: Phase E 10/10 PASS = WAVE 4 runtime legal stop

## COVERAGE MAP
T-1 → W0; T-2 T-3 → W1; T-4 → W2 W5; T-5 → W4; T-6 SC-9 → W3; T-7 frozen; T-8 → W6; T-9 → W5; T-10 SC-10 → W7
