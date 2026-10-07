# GI-OMP FIRST CLASS — ENGINEERING REPORT v1
**Series:** GI_OMP_First_Class (OMP first-class session-scoped port of Graph Intelligence; the parent/base series is MiMoCode Graph_Intelligence v1.4.3 fork-v143, which has no Engineering_Report files in this tree)
**Project:** GI-OMP
**Date:** 2026-09-14
**Author:** Trident Agent
**Baseline:** `fork-v143/live-tree` 249 files @ seal sha16 `63247bff8e2baf8f` (workspace git `v4.7` @ `f895e00` is a parent dirty tree, not a GI-OMP commit)
**Commit:** none for this series (uncommitted product tree under `/home/leviathan/JARVIS_WORKSPACE/OMP/Graph_Intelligence`)
**Container:** `gi-omp-w7` + `gi-omp-w7b` · **Image:** `runtime-grade-container-sandbox:master`

## ONE-PARAGRAPH SUMMARY

GI-OMP is a first-class OMP plugin surface that gives every headed OMP session its own typed-graph sqlite under `{scopeRoot}/.omp/graph-intelligence/sessions/{sid24}/store.sqlite`, a machine-wide WAL registry at `~/.omp/graph-intelligence/registry.sqlite`, four registered tools (`graph-probe`, `graph-query`, `bug-hunt`, `gi-audit`), and a write/edit graph-gate that does not re-enable Trident Poseidon `runBefore` (still always-allow as of 2026-09-14). It produces named refusals (`GI_SCOPE_REFUSED`, `GI_CLEAR_REFUSED`, `GI_STORE_CORRUPT`, `QUERY_INVALID`, `GRAPH_GATE_SIGNATURE_BREAK`) instead of silent empty graphs, injects `[GATE STEER]` on STEER dial via a `tool_result` listener, and was proven in dual-FRESH headed OMP TUI (`xai-oauth/grok-4.6`) with `.omp/ct-results.json` `overallVerdict: PASS` and Phase E 10/10. Host hygiene this turn is `bun test` **22 pass / 0 fail / 58 expect** across 7 `st-gi-omp-*.ts` files. What it does not produce: a bound hunter/audit engine (`GI_HUNT_NOT_WIRED` / `GI_AUDIT_NOT_WIRED`), the advertised 12-verb query surface (only `who-calls` executes; other listed verbs return `rows=0`), or a fourth branch inside `code-retrieval/SKILL.md` (that skill still says three engines; the fourth branch lives in `graph-intelligence/SKILL.md`).

## THE LIFECYCLE MAP (ASCII)

Wave plan authority: `.trident/wave-plan.md` `WAVES: 8` (65 lines). START NOW was W0; legal stop was W7 Phase E PASS.

```
┌──────────────────────────────────────────────────────────────┐
│ W0  scoping interfaces  T-1 path + AP-1/AP-2 refuse          │
└──────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ W1  registry WAL + openSessionStore  GI_SCOPE_REFUSED        │
└──────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ W2  four tools  graph-probe/query/bug-hunt/gi-audit          │
└──────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ W3  isolation critic  disjoint typed_nodes A/B               │
└──────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ W4  gate middleware  OFF | STEER | FULL                      │
└──────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ W5  trident-omp + config.yml APPEND (3 siblings)             │
└──────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ W6  graph-intelligence skill + retrieval branch              │
└──────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ W7  dual-FRESH headed OMP TUI  Phase E 10/10 PASS            │
└──────────────────────────────────────────────────────────────┘
```

Ruler: every box line is 64 characters (width 62 + 2 borders). Arrow rows are 64 characters with `▼` at column 32. Cap 76: pass.

## THE ARCHITECTURE

### 1. Scoping / session path

```
┌──────────────────────────────────────────────────────────────┐
│ MODULE: scoping (src/scoping, 768 lines / 8 files)           │
│ IN:  scopeRoot abs + sessionId                               │
│ OUT: .../sessions/{sid24}/store.sqlite                       │
│ REFUSE: GI_SHARED_PROJECT_STORE / GI_GLOBAL_HOME_GRAPH       │
│ CONST: GI_STATE_DIR=.omp/graph-intelligence                  │
│ CONST: GI_ECOSYSTEM=gi-omp  SESSION_STORE_RE 8-24            │
└──────────────────────────────────────────────────────────────┘
```

Interfaces: `sessionStorePath(scopeRoot, sessionId)` at `src/scoping/gi-session-path.ts:26-38` joins `scopeRoot`, `GI_STATE_DIR` (`.omp/graph-intelligence` line 10), `sessions`, `sessionKey(sessionId)`, `store.sqlite`, then `assertSessionStorePath`. `SESSION_STORE_RE` at line 24 is `/\/sessions\/[A-Za-z0-9_-]{8,24}\/store\.sqlite$/`. Data flow: absolute root in → sid24 folder out. Failure: non-absolute `scopeRoot` throws `GI_PATH_DENIED` (lines 27-28); missing `/sessions/{sid24}/` throws `GI_SHARED_PROJECT_STORE` (lines 49-53); `~/.omp/graph-intelligence/store.sqlite` throws `GI_GLOBAL_HOME_GRAPH` (lines 43-47). Ecosystem binding `createGiBinding` at `src/scoping/gi-ecosystem.ts:9-19` registers `ecosystem: gi-omp`, `wavePrefix: gi-`, `label: GI-OMP`. Provenance: `scope-binding.ts` 200 lines, `scope-resolver.ts` 162, `scoped-store.ts` 157, `db-path.ts` 54, `session-state.ts` 78 copied from `vendor/workspace-scoped-state-boilerplate/`; `gi-session-path.ts` 70 and `gi-ecosystem.ts` 24 are NEW.

### 2. Master registry

```
┌──────────────────────────────────────────────────────────────┐
│ MODULE: gi-registry  (122 lines)                             │
│ PATH: env GI_OMP_DB_DIR -> ~/.omp/.../registry.sqlite        │
│ WRITE: UPSERT gi_sessions only  (no JSON, no dual-write)     │
│ WIPE: GI_CLEAR_REFUSED unless GI_OMP_ALLOW_CLEAR=1           │
│ TEST ISOLATION: argv st-gi-omp | GI_OMP_DB_DIR               │
└──────────────────────────────────────────────────────────────┘
```

`giRegistryPath()` at `src/omp/gi-registry.ts:30-42` chains `GI_OMP_DB_DIR` via `makeDbPath` (`envVars: ["GI_OMP_DB_DIR"]`, `defaultDir: "~/.omp/graph-intelligence"`, `fileName: "registry.sqlite"` lines 23-28). bun 1.4.2 does **not** set `BUN_TEST=1`; isolation also keys off `argv1.includes("st-gi-omp")` (lines 33-38) so tests do not write prod. `clearGiRegistry` at lines 110-118 throws `GiClearError` code `GI_CLEAR_REFUSED` with verbatim `"GI_CLEAR_REFUSED: set GI_OMP_ALLOW_CLEAR=1 to wipe the registry (never default)"` unless env is exactly `"1"`. TUI A2: `graph-probe action=wipe` without that env returned `GI_CLEAR_REFUSED`; python sqlite count on `/root/.omp/graph-intelligence/registry.sqlite` stayed **3** (`default`, `omp-default-session`, `ssion-identity-key-w7-s1`).

### 3. openSessionStore

```
┌──────────────────────────────────────────────────────────────┐
│ MODULE: openSessionStore  (60 lines)                         │
│ callerKey != ownerKey  ->  GI_SCOPE_REFUSED                  │
│ mkdir + empty create + upsertGiSession                       │
│ TUI A1: sessionId=ses_AAA...  token GI_SCOPE_REFUSED         │
└──────────────────────────────────────────────────────────────┘
```

`openSessionStore` at `src/omp/store-open.ts:36-59` computes `ownerKey = sessionKey(sessionId)` and `callerKey = sessionKey(callerSessionId ?? sessionId)`. Mismatch throws `GiScopeError` code `GI_SCOPE_REFUSED` with `session ${callerKey} cannot open store owned by ${ownerKey}` (lines 39-42). Existing registry row with a different `session_id` also refuses (lines 45-49). graph-query execute at `src/omp/extension.ts:76-84` defaults `callerId` to `"omp-default-session"` then allows `params.sessionId` override, which is how TUI A1 (`sessionId=ses_AAAAAAAAAAAAAAAAAAAAAAAA`) produced `GI_SCOPE_REFUSED` in the tool result.

### 4. Typed store

```
┌──────────────────────────────────────────────────────────────┐
│ MODULE: typed-write  (92 lines)                              │
│ DDL typed_nodes / typed_edges  WAL                           │
│ MAGIC: Buffer SQLite format 3                                │
│ garbage header -> GiStoreCorruptError GI_STORE_CORRUPT       │
│ whoCalls: SELECT name WHERE name=?                           │
└──────────────────────────────────────────────────────────────┘
```

`openTypedStore` at `src/omp/typed-write.ts:30-49` always `assertSessionStorePath` first. Empty/missing files are created. Non-empty files whose first 16 bytes are not `SQLite format 3` throw `GiStoreCorruptError` (`code = "GI_STORE_CORRUPT"`, lines 8-13, 42-43). Isolation critic `tests/st-gi-omp-isolate.ts:15-31` opens `ses_A…` and `ses_B…` on the same tmp root, inserts `alpha` vs `beta`, asserts `countTypedNodes` 1/1 and `namesInStore(a)` does not include `beta`. WAVE 3 ST, not a TUI sqlite dump of typed_nodes (TUI isolation used two containers + two session folders).

### 5. Tool factory

```
┌──────────────────────────────────────────────────────────────┐
│ MODULE: extension factory  (129 lines)                       │
│ GI_TOOL_NAMES = graph-probe, graph-query,                    │
│                 bug-hunt, gi-audit                           │
│ probe: PROBE_TOOL_OK | action=wipe -> CLEAR_REFUSED          │
│ query: QUERY_INVALID | who-calls rows= | SCOPE               │
│ hunt/audit: GI_HUNT_NOT_WIRED / GI_AUDIT_NOT_WIRED           │
└──────────────────────────────────────────────────────────────┘
```

`GI_TOOL_NAMES` at `src/omp/extension.ts:10`. `graph-probe` lines 36-58: default JSON `{token:"PROBE_TOOL_OK", sessionID, echo}`; `action=wipe` calls `clearGiRegistry`. `graph-query` lines 60-96: verb allow-list `who-calls|blast-radius|would-break|unwired|chain` (line 72); unknown verb `QUERY_INVALID` (lines 73-74). Only `who-calls` hits `whoCalls` (lines 85-87); the other four listed verbs return `rows=0` (line 89) — advertised "12-verb" is a false ceiling vs implementation. `bug-hunt` lines 98-107 returns `"GI_HUNT_NOT_WIRED: hunter machine not bound in W2"`. `gi-audit` lines 109-118 returns `"GI_AUDIT_NOT_WIRED: audit engine not bound in W2"`. Default export `giOmpExtension` lines 123-129 registers tools and `attachGiGraphGate` if `pi.on` exists, then `console.error("[gi-omp] registered " + names.join(", "))`.

### 6. Graph-gate (middleware + hook)

```
┌──────────────────────────────────────────────────────────────┐
│ MODULE: gate-middleware + gate-hook                          │
│ Dial: GI_DIAL env > dial.json > STEER                        │
│ FULL: cancel GRAPH_GATE_SIGNATURE_BREAK throw                │
│ STEER: land + tool_result prefix [GATE STEER]                │
│ OFF: land token=null                                         │
│ NOT Poseidon runBefore (disabled 2026-09-14)                 │
└──────────────────────────────────────────────────────────────┘
```

`resolveDial` at `src/omp/gate-middleware.ts:18-31` default `"STEER"`. `runGraphGate` lines 47-72: `hasStore===false` → `{cancel:false, token:"GI_NO_STORE"}`; export-fn removed + `FULL` → `{cancel:true, token:"GRAPH_GATE_SIGNATURE_BREAK"}`; same + `STEER` → `{cancel:false, token:"[GATE STEER]"}`; `OFF` → `{cancel:false, token:null}`. Hook `attachGiGraphGate` at `src/omp/gate-hook.ts:57-106` listens `tool_call` for `write|write_file|edit|patch`, reconstructs OMP edit DSL (`input` PUT body, not only `old_string`/`new_string` — that miss was B3), throws `${token}: ${advisory}` on FULL cancel (line 88). STEER sets `pendingSteer` and `tool_result` prepends `{type:"text", text: note}` (lines 93-104). `hasStore: true` is **hardcoded** at line 81 — `GI_NO_STORE` is ST-only (`st-gi-omp-gate.ts:37-41`), not TUI-proven.

### 7. Wire / skills / config

Host `~/.omp/agent/config.yml` lines 6-9 and `JARVIS_WORKSPACE/OMP/.omp/config.yml` lines 16-19 both APPEND three paths: `trident-omp/dist.js`, `code-retrieval/index.js`, `graph-intelligence/index.js`. Container `/root/.omp/agent/config.yml` listed only trident-omp + graph-intelligence (blast sibling `code-retrieval` absent inside the CT image). Managed skill `~/.omp/agent/managed-skills/graph-intelligence/SKILL.md` 1622 B contains the fourth retrieval branch (grep / ripwire / opengrok / graph-query). User skill `~/.omp/agent/skills/code-retrieval/SKILL.md` line 3 still says "three first-class OMP tools" — T-8 is **partial**.

### 8. Dual-FRESH TUI proof

```
┌──────────────────────────────────────────────────────────────┐
│ MODULE: dual-FRESH TUI proof                                 │
│ gi-omp-w7 + gi-omp-w7b                                       │
│ image runtime-grade-container-sandbox:master                 │
│ model xai-oauth/grok-4.6                                     │
│ artifact .omp/ct-results.json overallVerdict PASS            │
└──────────────────────────────────────────────────────────────┘
```

Artifact `.omp/ct-results.json` 52 lines / 2691 B / sha16 `0241479ea3994a00`. `phaseEScore: "10/10"`. Tokens quoted from TUI tool results (not chat paraphrase): `PROBE_TOOL_OK`, `rows=`, `GRAPH_GATE_SIGNATURE_BREAK`, `[GATE STEER] SIGNATURE_BREAK removed=tridentLog`, `GATE_TOKENS_ABSENT`, `QUERY_INVALID`, `GI_SCOPE_REFUSED`, `GI_STORE_CORRUPT`, `GI_CLEAR_REFUSED`. FULL fixture on w7b after block: `export function tridentLog() { return 1; }` unchanged.

## THE BUG LEDGER

| # | bug | root cause | fix | evidence |
|---|---|---|---|---|
| B1 | W7 TUI `Error: No model selected` | omp wizard left no provider; first ct-results `OPEN-NO-MODEL` | 5-step wizard + `xai-oauth/grok-4.6` | `context_management/RUNNING_BUILD_LOG.md:26-29` (stale log still says BLOCKED); later TUI status bar `Grok 4.6` / `xai-oauth` |
| B2 | ST would write prod registry | bun 1.4.2 does not set `BUN_TEST=1` | `giRegistryPath` also keys `argv1.includes("st-gi-omp")` | `gi-registry.ts:32-38`; `RUNNING_BUILD_LOG.md:10` |
| B3 | FULL strip **landed** (gate miss) | OMP edit payload keys are `input`,`path`,`paths` not `old_string`/`new_string`; reconstruct saw no export strip | DSL-aware `reconstruct` in `gate-hook.ts:21-54` | first CT EXEC after strip: `function tridentLog` without export; after fix: fixture unchanged + `GRAPH_GATE_SIGNATURE_BREAK` |
| B4 | STEER TUI had no `[GATE STEER]` in tool result | `tool_call` threw only on FULL; STEER was log-only | `pendingSteer` + `tool_result` inject `gate-hook.ts:90-104` | TUI quote `[GATE STEER] SIGNATURE_BREAK removed=tridentLog`; file landed |
| B5 | (rejected) re-enable Poseidon `runBefore` | operator freeze 2026-09-14 always-allow | dedicated `pi.on("tool_call")` instead | `gate-hook.ts:1-2` comment; throw at line 88 |
| B6 | A2 had no TUI verb | `clearGiRegistry` only ST-callable | `graph-probe action=wipe` `extension.ts:42-50` | TUI `GI_CLEAR_REFUSED`; registry still 3 rows |
| B7 | session folder `ssion-identity-key-w7-s1` | `sessionKey` = `slice(-24)` truncates long ids | none (contract) | registry ids in ct-results.json:26 |
| B8 | `hasStore: true` hardcoded | hook never asks the registry | ST covers `GI_NO_STORE`; TUI does not | `gate-hook.ts:81` vs `gate-middleware.ts:48-49` |

### B3 detail — OMP edit DSL

Root cause: first FULL TUI edit applied because `reconstruct` only understood `old_string`/`new_string`. Live `/tmp/gi-gate.log` showed `"keys":["input","path","paths"]` and `"verdict":{"cancel":false}`. Mechanism: OMP `edit` sends a PUT body in `input`; stripping `export` from `export function tridentLog` never reached `parseExports` on `newText`. Fix: apply a regex detector on the DSL body (`export\s+function` → `function`) against on-disk `oldText` (`gate-hook.ts:41-53` region). Verification: second FULL drive, log `"cancel":true,"token":"GRAPH_GATE_SIGNATURE_BREAK","advisory":"removed=tridentLog"` and `cat /workspace/gi-gate-fixture.ts` still `export function tridentLog`.

### B4 detail — STEER inject

FULL throw cancels the tool. STEER must **land** the edit and still name the break in the tool result (SC-8 / SC-9). `runGraphGate` already returned `token:"[GATE STEER]"` (`gate-middleware.ts:64-69`) but nothing put that string into OMP's tool result. Fix: store `pendingSteer` on `tool_call`, prepend a text content part on `tool_result`. Verification: TUI assistant quoted `[GATE STEER] SIGNATURE_BREAK removed=tridentLog` and fixture became `function tridentLog` with `keep()` still exported.

## THE TESTING LEDGER

This-turn command (verbatim):

```
bun test v1.4.2 (744846f84)

 22 pass
 0 fail
 58 expect() calls
Ran 22 tests across 7 files. [80.00ms]
```

Files: `./tests/st-gi-omp-scope.ts ./tests/st-gi-omp-refuse.ts ./tests/st-gi-omp-wipe.ts ./tests/st-gi-omp-tools.ts ./tests/st-gi-omp-isolate.ts ./tests/st-gi-omp-gate.ts ./tests/st-gi-omp-corrupt.ts`

| test | scope | how | result |
|---|---|---|---|
| st-gi-omp-scope.ts (113 lines) | T-1 path + AP-1/AP-2 | bun; known-bad shared project store + global home graph | included in 22/22 |
| st-gi-omp-refuse.ts (63) | T-3 cross-session | bun `GI_SCOPE_REFUSED` | included |
| st-gi-omp-wipe.ts (52) | AP-8 wipe | bun without `GI_OMP_ALLOW_CLEAR` | included |
| st-gi-omp-tools.ts (38) | T-4 names + A2 wipe probe | bun factory 4 names; `action=wipe` → `GI_CLEAR_REFUSED` | included |
| st-gi-omp-isolate.ts (32) | T-6 / SC-9 WAVE 3 | concurrent A/B inserts, no leaked names | included |
| st-gi-omp-gate.ts (48) | T-5 FULL/STEER/OFF/NO_STORE | 7 expects on `runGraphGate` | included |
| st-gi-omp-corrupt.ts (35) | RB-STATE | garbage bytes → `GI_STORE_CORRUPT` | included |
| S1 IDENTITY w7 | RB-IDENTITY | headed TUI graph-probe | PASS `PROBE_TOOL_OK` |
| S2 TOOLS w7 | RB-TOOLS | headed TUI graph-query | PASS `rows=` |
| S3 FIREWALL FULL w7 | RB-FIREWALL | headed TUI edit strip `GI_DIAL=FULL` | PASS `GRAPH_GATE_SIGNATURE_BREAK` file unchanged |
| S4 STEER TUI | SC-8 | headed TUI `GI_DIAL=STEER` | PASS `[GATE STEER]` file landed |
| S5 OFF TUI | SC-8 | headed TUI `GI_DIAL=OFF` | PASS `GATE_TOKENS_ABSENT` file landed |
| S7 ERRORS | RB-ERRORS | bad verb | PASS `QUERY_INVALID` |
| A1 GI_SCOPE_REFUSED | T-3 | graph-query foreign sessionId | PASS `GI_SCOPE_REFUSED` |
| A2 GI_CLEAR_REFUSED | AP-8 | graph-probe action=wipe | PASS `GI_CLEAR_REFUSED`; 3 rows remain |
| RB-STATE TUI | RB-STATE | overwrite store with `NOT A SQLITE DATABASE` | PASS `GI_STORE_CORRUPT` |
| RB-CONFIG | RB-CONFIG | default registry path in container | PASS `/root/.omp/graph-intelligence/registry.sqlite` |
| RB-CONCURRENCY | RB-CONCURRENCY | sqlite count gi_sessions | PASS 3 rows |
| B1/B2 w7b | dual FRESH | second container Grok 4.6 | PASS `PROBE_TOOL_OK` / `rows=` |
| B5 FULL w7b | dual FRESH firewall | FULL strip on w7b | PASS `GRAPH_GATE_SIGNATURE_BREAK` file unchanged |
| GRAPHIFY 129MiB | SC-11 | not in this 7-file battery | **NOT RUN** (EN-38 frozen in fork; no new ST) |
| GI_NO_STORE TUI | T-5 grace | ST only | **NOT TUI** |
| tsc / lint / purity | n/a | not invoked | **NOT RUN** |

Regression: first FULL TUI FAIL (edit landed) → after B3 DSL reconstruct → FULL PASS on both containers. First W7 `OPEN-NO-MODEL` → after wizard `PASS`. `RUNNING_BUILD_LOG.md` still records the blocked state (doc lag; not overwritten this report).

Token sweep (TUI, quoted): `PROBE_TOOL_OK`, `rows=`, `GRAPH_GATE_SIGNATURE_BREAK`, `[GATE STEER]`, `GATE_TOKENS_ABSENT`, `QUERY_INVALID`, `GI_SCOPE_REFUSED`, `GI_STORE_CORRUPT`, `GI_CLEAR_REFUSED`. Fail tokens that did **not** appear on the matching dial: FULL did not land the strip after B3; OFF did not emit `GRAPH_GATE_SIGNATURE_BREAK`.

## THE SPEC MANDATE → ENGINEERING MAP

| the operator said | what was built | evidence |
|---|---|---|
| Port GI to Jarvis OMP first-class, session-scoped | dedicated extension + trident-omp registerTool ×4 + per-session sqlite | `extension.ts:10,32-121`; store path `gi-session-path.ts:35` |
| Fork the cleanest checkpoint | `fork-v143/live-tree` 249 files | this-turn python count 249; `MANIFEST_V143_SHA16.txt` = `63247bff8e2baf8f` |
| workspace-scoped-state-boilerplate, no leak | src/scoping copy + `openSessionStore` caller check | `st-gi-omp-isolate.ts:21-28`; TUI A1 `GI_SCOPE_REFUSED` |
| hydra-mode goal; do not start until run | WAVES:8 plan; later operator-driven W0–W7 | `.trident/wave-plan.md:1-2`; goal completed this session |
| T-1 session store `/sessions/{sid24}/store.sqlite` | `sessionStorePath` + regex assert | `gi-session-path.ts:24-37` |
| T-2 WAL registry, no JSON fallback | `gi-registry.ts` sqlite UPSERT only | 122-line module; no `sessions.json` writer in `src/omp` |
| T-3 GI_SCOPE_REFUSED names owner | `GiScopeError` message includes both keys | `store-open.ts:40-41`; TUI A1 |
| T-4 four tools registered | `GI_TOOL_NAMES` + factory return | `extension.ts:10,120`; ST tools 4 names |
| T-5 gate STEER default; FULL token | `resolveDial` default STEER; FULL cancel | `gate-middleware.ts:30,57-61`; TUI S3/S4/S5 |
| T-6 dual FRESH disjoint typed_nodes | ST isolate + two containers | `st-gi-omp-isolate.ts`; ct-results ISOLATION PASS |
| T-7 EN-38 frozen | fork mapper untouched this series | live-tree 249 still `63247bff8e2baf8f`; no mapper edit in `src/omp` |
| T-8 code-retrieval fourth branch; keep grep/ripwire/opengrok | fourth branch in graph-intelligence skill **only** | managed SKILL.md "Fourth retrieval branch"; code-retrieval SKILL.md still "three … tools" |
| T-9 config.yml APPEND never replace | both host configs list 3 extensions | `~/.omp/agent/config.yml:6-9`; `OMP/.omp/config.yml:16-19` |
| T-10 WAVE 3 + WAVE 4 headed TUI | isolate ST + dual-FRESH PASS | bun 22/22; ct-results `overallVerdict: PASS` `phaseEScore: 10/10` |
| Do not re-enable Poseidon | dedicated tool_call listener | `gate-hook.ts:1-2,57-88` |
| classifier may not weaken | hygiene bun ≠ ship; TUI tokens required | this report separates ST 22/22 from TUI tokens |

Canon sources that the skill required but that **do not exist** on the GI-OMP product tree (not invented): `context_management/CURRENT_STATE.md` (only under `fork-v143/context_management/`), `BUILD_STATE.md` / `EVIDENCE_STATE.md` / `CHANGELOG.md` same, `.trident/wave-audit/*.md` NONE, `.trident/container-test-results.json` NONE (artifact is `.omp/ct-results.json`), `.trident/forensics/*.md` NONE, `machinery/proof-*.ts` NONE. Product-tree `context_management/RUNNING_BUILD_LOG.md` exists (29 lines) and is **stale** at W7 BLOCKED.

## THE NUMBERS

```
┌──────────────────────────────────────────────────────────────────────┐
│ live-tree files                 249                                  │
│ fork seal sha16                 63247bff8e2baf8f                     │
│ src files / src lines           14 / 1349                            │
│ scoping lines                   768                                  │
│ omp lines                       581                                  │
│ ST files / ST lines             7 / 381                              │
│ bun test this-turn              22 pass / 0 fail                     │
│ bun expect() calls              58                                   │
│ bun version                     1.4.2 (744846f84)                    │
│ trident-omp dist.js             14600123 B                           │
│ trident-omp sha16               65b347259ef12e53                     │
│ graph-intelligence/index.js     14902 B                              │
│ ct-results.json                 2691 B sha16 0241479ea3994a00        │
│ DPL1 spec lines                 315                                  │
│ wave-plan.md lines              65                                   │
│ managed skill                   1622 B                               │
│ project skill                   510 B                                │
│ host config extensions          3 (APPEND)                           │
│ container registry rows         3 after wipe refuse                  │
│ Phase E                         10/10                                │
│ overallVerdict                  PASS                                 │
└──────────────────────────────────────────────────────────────────────┘
```

Ruler: numbers box 72 characters (width 70 + 2). Cap 76: pass.

Per-file line counts (this-turn `wc -l`): db-path 54, gi-ecosystem 24, gi-session-path 70, scoping/index 23, scope-binding 200, scope-resolver 162, scoped-store 157, session-state 78, extension 129, gate-hook 106, gate-middleware 72, gi-registry 122, store-open 60, typed-write 92, st-corrupt 35, st-gate 48, st-isolate 32, st-refuse 63, st-scope 113, st-tools 38, st-wipe 52, DPL1 315, wave-plan 65, ct-results 52.

## THE FILE MANIFEST (ASCII tree)

Provenance: NEW = this series; COPY = boilerplate; EXISTING = fork-v143; MODIFIED = host wire.

```
Graph_Intelligence/                          NEW workspace
├── src/scoping/                             COPY+NEW (768 lines)
│   ├── db-path.ts                           COPY 54
│   ├── scope-binding.ts                     COPY 200
│   ├── scope-resolver.ts                    COPY 162
│   ├── scoped-store.ts                      COPY 157
│   ├── session-state.ts                     COPY 78
│   ├── index.ts                             NEW 23
│   ├── gi-session-path.ts                   NEW 70
│   └── gi-ecosystem.ts                      NEW 24
├── src/omp/                                 NEW (581 lines)
│   ├── extension.ts                         NEW 129
│   ├── gate-hook.ts                         NEW 106
│   ├── gate-middleware.ts                   NEW 72
│   ├── gi-registry.ts                       NEW 122
│   ├── store-open.ts                        NEW 60
│   └── typed-write.ts                       NEW 92
├── tests/st-gi-omp-*.ts                     NEW 7 files / 381 lines
├── docs/GI_OMP_FIRST_CLASS_DPL1_SPEC.md     NEW 315
├── docs/ct-plan.md / ct-plan-w7b.md         NEW
├── .trident/wave-plan.md                    NEW 65
├── .omp/ct-results.json                     NEW 52  PASS
├── context_management/RUNNING_BUILD_LOG.md  NEW 29  STALE
├── skills/graph-intelligence/SKILL.md       NEW 510 B
├── fork-v143/live-tree/                     EXISTING 249 files
├── vendor/workspace-scoped-state-boilerplate/ EXISTING
└── reports/GI_OMP_First_Class_Engineering_Report_v1.md  NEW (this file)

HOST WIRE (MODIFIED, outside product tree):
~/.omp/agent/config.yml                      APPEND 3 extensions
JARVIS_WORKSPACE/OMP/.omp/config.yml         APPEND 3 extensions
~/.omp/agent/extensions/trident-omp/dist.js  14600123 B
~/.omp/agent/extensions/graph-intelligence/index.js  14902 B
~/.omp/agent/managed-skills/graph-intelligence/SKILL.md  1622 B
~/.omp/agent/skills/code-retrieval/SKILL.md  UNCHANGED (still 3 engines)
```

## WHAT'S NEEDED FROM THE OPERATOR

1. **Host OMP restart** if this live chat must advertise `graph-probe` / `graph-query` in *this* process schema (AP-6: schema snapshot is not a wire). Container TUIs already loaded the dist.
2. **Bind or keep loud stubs** for `bug-hunt` / `gi-audit` (`GI_HUNT_NOT_WIRED` / `GI_AUDIT_NOT_WIRED` at `extension.ts:102-117`). Default: keep loud; do not silent-pass.
3. **12-verb vs who-calls:** `graph-query` description says 12 verbs; execute implements `who-calls` only; `blast-radius|would-break|unwired|chain` return `rows=0` (`extension.ts:72-89`). Decide: implement or shrink the description.
4. **T-8 remainder:** patch `~/.omp/agent/skills/code-retrieval/SKILL.md` fourth branch, or accept the branch living only in `graph-intelligence`.
5. **Container sibling blast:** CT image config omitted `code-retrieval`. Host APPEND is intact. No action required unless the next CT image must mirror host.
6. **GI_NO_STORE TUI** and **SC-11 129MiB GRAPHIFY** were not headed-TUI / not in this ST battery. Do not treat them as WAVE 4 evidence.
7. **No Poseidon re-lock.** Gate stays a dedicated `tool_call` listener.
8. **P0 blockers for the closed goal:** none. Legal stop SC-10 is met by `.omp/ct-results.json` PASS. Remaining items above are product gaps, not reopen of W7.

Tried and rejected (do not reopen): re-enable Trident `runBefore`; silent grep fallback when GI is down; shared `{project}/.omp/graph-intelligence/store.sqlite`; JSON session map; treating bun 22/22 as WAVE 4; one-container "dual session" via two prompts without a second FRESH identity.
