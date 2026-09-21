# GI-OMP CAPABILITY MAP v1 — the capability light (how-close)

## §0 THE HEADLINE

CORE FUNCTIONAL: 86% (6 of 7 core components WORK)
  WORKS 6 · PARTIAL 1 · STUB 0 · ABSENT 0
VELOCITY (the other axis, not averaged): 119 tests · 19 files · 1004 expects
SILENT CLASS: 0 capabilities return plausible-nothing (all failures named)
RE-PROBE: 3/3 probes reproduced · NOT TAMPERED
RESIDUAL: P6 runId-identity (criterion unsatisfiable by design; findings-identical PASS)

## §1 THE CORE DEFINITION (from GI_OMP_FULL_PORT_DPL1_SPEC.md §6, verbatim)

| # | Capability | Spec anchor |
|---|---|---|
| C1 | st-graphify-port green on fixture shape | §6 S1 |
| C2 | graphify populate writes substrate=graphify + counts | §6 S3 |
| C3 | hunter runs on graphify store (HUNT_DONE + artifact) | §6 S4 |
| C4 | findings carry file:line triplets (LINELESS=0) | §6 S5 |
| C5 | audit binds on green battery (AUDIT_DONE) | §6 S6 |
| C6 | K20.3 double-run determinism row | §6 S8 |
| C7 | Go pool 6-key + openrouter-only fallback | operator order 2026-09-15 |

Periphery (explicitly OUT): routing doc, report v2, LOGIC-LSP (W6), ship
package, checkpoints, boilerplate, corbell-big-tree counts, gate dials.

## §2 THE COMPONENT MAP

| Cap | Component | Anchor |
|---|---|---|
| C1 | GraphifyAdapter + st-graphify-port | src/hunter/graph/graphify-adapter.ts, tests/st-graphify-port.ts |
| C2 | populate switch + populate-graphify leg | src/omp/populate.ts:51-58, src/omp/populate-graphify.ts |
| C3 | hunter MAP graphify-case + micro-loop | src/hunter/harness/map.ts:45-58 |
| C4 | line-resolve + LINELESS guard | src/hunter/shared/line-resolve.ts |
| C5 | hydra auditor + aether-code-audit bind | src/hydra/auditor.ts, src/omp/extension.ts:327-338 |
| C6 | recon seq counter + K20.3 row | src/hunter/harness/recon.ts:108-134, .omp/ct-results-graphify.json k203Row |
| C7 | go-key-pool §FALLBACK + st-go-fallback | src/hunter/keys/go-key-pool.ts:263-323, tests/st-go-fallback.ts |

## §3 THE PROBE SET (pre-registered)

- PROBE-1 FOR C1: `bun test ./tests/st-graphify-port.ts` — EXPECTED 0 fail,
  calls-spine + line numbers. RULE: WORKS if 0 fail + spine asserted.
- PROBE-2 FOR C2: fresh fixture + real extract + populateSessionStore
  {substrate:graphify} + whoCalls — EXPECTED substrate=graphify, nodes>0,
  rows>=1 file:line. RULE: WORKS if all three hold.
- PROBE-3 FOR C3: `bun test ./tests/st-hunter-port.ts ./tests/st-hunter-live.ts`
  + TUI hunt — EXPECTED HUNT_DONE + artifact bytes>0. RULE: WORKS if both.
- PROBE-4 FOR C4: LINELESS census in TUI stream + resolveLine battery —
  EXPECTED LINELESS_NODE count 0 on happy paths + named refusal on bad node.
- PROBE-5 FOR C5: `bun -e runTemplateAudit` + TUI aether-code-audit —
  EXPECTED fulfilled + report.md; TUI AUDIT_DONE + reportPath.
- PROBE-6 FOR C6: two hunts same checkout — EXPECTED per criterion text:
  runId contract field equal. RULE: WORKS only if equal.
- PROBE-7 FOR C7: pool len + decide live + all-dead sandbox —
  EXPECTED 6 keys, live go rung, all-dead openrouter rung.

## §4 THE RESULTS

| Cap | State | Evidence (tool result, agent does not author) |
|---|---|---|
| C1 | WORKS | `10 pass / 0 fail / 84 expect() / Ran 10 tests` |
| C2 | WORKS | `POP substrate=graphify nodes=6 edges=6 skipped=false`; `WHO rows=2 beta.ts:1 beta():2`; TUI `substrate=graphify ... nodes=5 edges=5 rows=2` |
| C3 | WORKS | `8 pass / 0 fail / 67 expect()` (port+live); TUI `HUNT_DONE runId=...-7 findingsCount=296` + v8 artifact 453,787 B |
| C4 | WORKS | TUI `LINELESS_NODE 0`; guard `LINELESS_NODE: no line for ...` named on bad nodes |
| C5 | WORKS | `17 pass / 0 fail / 135 expect()` settle; `fulfilled ledger fileBytes 1305`; TUI `AUDIT_DONE findings=3 reportPath=...1789468710348` |
| C6 | PARTIAL | runIds `-7` then `-8` (seq +1 BY DESIGN); reports v7+v8 both 453,787 B; k203Row findingsEqual true, runIdsEqual false |
| C7 | WORKS | `GO_KEYS.length=6`; live `go-4-alive`; all-dead `all-go-dead→openrouter`; battery `8/0/24` |

## §5 THE BROKEN SET (C6 PARTIAL — named)

- Working: determinism-that-matters (findings ruleId/file/line identical,
  batteryVersion identical, event-count +1 per hunt, artifacts land).
- Broken: runId-identity AS WRITTEN (the runId is a per-day SEQUENCE, not a
  content hash — asserting byte-identity contradicts recon.ts:108-134).
- Fix: S8 should assert findings-identity + batteryVersion-identity +
  event-count=2 (V-11, carried open MEDIUM).

## §6 THE AXIS CONTRAST

| Axis | Number | What it measures |
|---|---|---|
| VELOCITY | 119 tests pass · 19 files · 1004 expects | what was DONE (author asserts) |
| VELOCITY | dual-FRESH CT PASS 11/11 · breaker 10/10 | suite outcomes (gated) |
| CAPABILITY | CORE FUNCTIONAL 86% (6/7 WORK) | what WORKS when DRIVEN |
| CAPABILITY | blind re-probe 3/3 agree | tamper check |

The test suite is NOT cited as capability evidence above (law 2) — §4
evidence is all DRIVEN output (extract/populate/hunt/settle/TUI streams).

## §7 THE SILENT CLASS

Zero. Every failure mode is named: GRAPHIFY_NOT_WARM / GRAPH_EMPTY /
GRAPHIFY_GRAPH_TOO_LARGE / LINELESS_NODE / GI_AUDIT_NOT_WIRED (after real
attempt) / HUNT_INCONCLUSIVE / CORBELL_NOT_WARM / GI_PATH_DENIED / claim
refused / walk-rungs-no-mark. No plausible-nothing return found.

## §8 THE RE-PROBE (blind, zero-context agent BlindReprobe)

Sample: PROBE-A (fresh-fixture populate) + PROBE-B (settle) + PROBE-C
(pool fallback) — includes WORKS across substrates.
- PROBE-A: WORKS — `nodes=6 edges=6`, `whoCalls rows=2` file:line (quoted).
- PROBE-B: WORKS — `status fulfilled fileBytes 1305`, report 3 FINDINGs.
- PROBE-C: WORKS — `GO_KEYS.length=6`, live go-4, all-dead openrouter.
Agreement 3/3 with §4 → NOT TAMPERED.

## §9 THE RESIDUAL

- P6 runId-identity (see §5). Nothing else could not be driven.
- Git tree: GI lives inside the 1171-file OMP repo (144 GI paths tracked,
  15 modified/new) — RECOMMENDATION: fresh self-contained repo (Option A in
  chat); no destructive act taken (operator decision).
- Open carries: V-10 LOW (loader-own graphify test), V-11 MEDIUM (S8 text).
