# BUILD SPEC ARTIFACT — GI-OMP FIRST-CLASS SESSION-SCOPED GRAPH INTELLIGENCE

**Target:** Every OMP session has dedicated Graph Intelligence wired first-class (tools + gate + store), session-scoped via the workspace-scoped-state boilerplate, zero leak across sessions or projects.
**Generated:** 2026-09-14
**Trident Version:** 4.4.2 / trident-omp v2.0.0
**Status:** PLANNING
**Artifact Type:** BUILD_SPEC (Layer 1 Prompt)
**Workspace:** `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence`
**Fork:** `fork-v143/` seal sha16 `63247bff8e2baf8f` (v1.4.3 live-sealed)
**Boilerplate:** `vendor/workspace-scoped-state-boilerplate/` (21/21 battery parent)
**PREFLIGHT:** script-test ✓ deep-container-testing ✓ hydra-mode ✓ hydra-orchestrator ✓ wave-planning ✓ plugin-engineering ✓
**HONEST_CLASS:** product_tui
**Discovery:** ENABLED (this-turn: 249 live-tree files, mapper sha16 `3383c961609d24c0` == v443-en38, live OPENCODE store 44293/24701 typed, OMP boot pid 236567 registered 18 tools including ripwire/opengrok)

---

## §A CONTEXT

GI is a MiMoCode drop-in kernel: one corbell/typed SQLite substrate feeding four consumers (12-verb query, OFF|STEER|FULL graph-gate, 6-phase bug-hunter, R0–R16 audit + graphify). It is NOT Trident identity/Poseidon/waves. The JARVIS OMP runtime already loads trident-omp (`container-testing` advertised; `ripwire`/`opengrok` registered 18-tool boot, eval-bridge live, cwd jail). GI is absent from OMP's tool schema today.

v443-en38 (2026-09-03) froze the EN-38 OOM guards (`GRAPHIFY_GRAPH_TOO_LARGE` 128 MiB, `buildScopedProgram` fileCap 1000). GI inherited those files byte-identical. This spec does not re-port EN-38. This spec wires GI into OMP the way container-testing and ripwire were wired: `pi.registerTool` + optional dedicated extension, plus the wave-manager boilerplate so N concurrent OMP sessions cannot clobber each other's graphs (the 8-session JSON RMW class, the 17-minute wipe class, the flushable-cache foreign-root class).

Operator directives this turn, verbatim: port GI to Jarvis OMP workspace; fork the cleanest checkpoint; brainstorm and write a detailed spec to wire GI into OMP first-class so each session has dedicated GI; apply workspace-scoped-state-boilerplate so graphs are session scoped and don't leak; emit the hydra-mode goal prompt. Do not start the hydra build until the operator says run.

---

## §1 PROBLEM STATEMENT

OMP sessions share a process and a plugin set. GI's current MiMoCode shape stores graphs at `<project>/.mimocode/graph-intelligence/store.sqlite` (per-project, sticky session pin to the PROJECT). That is workspace-scoped, not session-scoped. Two OMP sessions on the same project would mutate one typed graph. A global `~/.omp/.../store.sqlite` would leak across projects. A cwd-jail like ripwire (`RIPWIRE_PATH_DENIED`) is necessary but not sufficient: session A can still write session B's rows if they share a file.

The required state: each OMP session owns a graph store under the resolved workspace root, keyed by `sessionKey(sessionId)=sessionId.slice(-24)`, registered in a WAL sqlite master with row-keyed UPSERTs. Cross-session open is `GI_SCOPE_REFUSED` naming the owner. Cross-project resolve is the 3-tier ScopeResolver (explicit token → sticky cache → root scorer → cwd). Tools `graph-query`, `graph-probe`, `bug-hunt`, `graph-code-audit` appear in the same class as `container-testing` (callable; boot log names them). The graph-gate rides OMP write/edit middleware, STEER default, fail-open on missing store, fail-closed on signature-break in FULL.

---

## §2 ARCHITECTURE

```
OMP session (ses_… / ctx.sessionID)
        │
        ▼
 ┌──────────────────────────────────────────────────────────┐
 │ TIER 1  explicit projectToken (existsSync) ──► PINS      │
 │ TIER 2  sticky SESSION cache (never re-derive)           │
 │ TIER 3  root scorer (.git / .omp / package.json;         │
 │         state-dir dominance; deepest wins; path-as-root) │
 │ TIER 4  cwd last resort                                  │
 └──────────────────────┬───────────────────────────────────┘
                        │ scopeRoot
                        ▼
  {scopeRoot}/.omp/graph-intelligence/sessions/{sid24}/store.sqlite
                        │
                        ▼
  MASTER REGISTRY (one machine-wide sqlite, WAL + busy_timeout 5s)
  env GI_OMP_DB_DIR → BUN_TEST sandbox → ~/.omp/graph-intelligence/registry.sqlite
  PK = session_id; UPSERT only; NO JSON fallback; NO dual-write
```

**Ecosystem binding (boilerplate `ScopeBindingManager`):**
- ecosystem `gi-omp`, stateDir `.omp/graph-intelligence`, wavePrefix `gi-`, label `GI-OMP`
- siblings: `trident-omp`, `ripwire` (no shared store), `opengrok` (Lucene, GET-only)
- foreign id → loud refusal naming the correct tool
- alias-forgery guard on generate-time ids

**Tool surface (OMP `pi.registerTool`, pi.zod schemas — JSON-schema is a silent skip):**
| Tool | Job | Store |
| graph-query | 12 verbs (who-calls, blast-radius, would-break, …) | THIS session store only |
| graph-probe | health `PROBE_TOOL_OK` + session identity | none |
| bug-hunt | hunt/status over spawnBugHunterLoop | THIS session store |
| graph-code-audit | R0–R16 + graphify mapper (EN-38 guards intact) | THIS session store |

**Gate:** trident-omp middleware on `write`/`edit` → `runGraphGate` with the session store. Dial: env `GI_DIAL` > `{scopeRoot}/.omp/graph-intelligence/dial.json` > STEER. Grace: no store → ALLOW+warn `GI_NO_STORE`. FULL signature-break → cancel with `GRAPH_GATE_SIGNATURE_BREAK`.

**Retrieval sibling law:** grep = regex lines; ripwire = session parse graph; opengrok = standing Lucene; GI = typed store who-calls/blast. Do not replace grep/ripwire/opengrok. code-retrieval skill gains a fourth branch: warm GI store → graph-query; else ripwire.

**EN-38 frozen:** `GRAPH_LOAD_BUDGET_BYTES=128MiB`, `GRAPH_PARSE_YIELD_BYTES=8MiB`, `GRAPHIFY_GRAPH_TOO_LARGE`, `buildScopedProgram` fileCap 1000 / RSS 2048 / batch 200. Do not strip.

---

## §3 DISCOVERY INTELLIGENCE (measured this turn)

| Fact | Value | Command/source |
|---|---|---|
| Fork live-tree files | 249 | rsync + python nfiles |
| Seal sha16 | 63247bff8e2baf8f | MANIFEST_V143_SHA16.txt |
| graph-mapper sha16 | 3383c961609d24c0 / 16095 B | sha256 of live + v443 + GI lifted — all equal |
| code-classifier sha16 | 5dbd85dde7d2a45a / 46113 B | same three copies |
| OPENCODE live store | 31862784 B, typed_nodes=44293, typed_edges=24701 | sqlite3 ro |
| GI project store | 12853248 B, 13931/6441 | sqlite3 ro |
| OMP boot | pid 236567, `registered 18 tools including container-testing, ripwire, opengrok` | omp.2026-09-14.236567.log |
| ripwire jail | `RIPWIRE_PATH_DENIED` for /etc and abs paths outside Shared_Workspace | tool.ripwire this session |
| OpenGrok | ping 200; GRAPHIFY_GRAPH_TOO_LARGE resultCount 0 (index miss, not DOWN) | tool.opengrok |
| Boilerplate battery parent | 21 pass / 32 expect | README.md |
| sessionKey | slice(-24) | session-state.ts:31-32 |
| busy_timeout | 5000 ms + 3-attempt retry ladder | scoped-store.ts header |
| GI CURRENT_STATE banner | v1.3.0 (doc lag; BUILD_REPORT sealed v1.4.0/v1.4.3) | do not treat banner as seal |

Languages: TypeScript (bun), Python corbell substrate (host-only populate), sqlite.
Entry points: `fork-v143/live-tree/graph-intelligence/hooks/graph-gate.ts`, `shared/knowledge-graph/db.ts`, `subagents/trident-bug-hunter/surface/query-tool.ts`, `hydra/graph-mapper.ts`.
OMP entry: `~/.omp/agent/extensions/` + `JARVIS_WORKSPACE/OMP/.omp/config.yml` extensions array (OVERRIDES user config — must list every extension).

---

## §4 CORE INSIGHT

The implementation must produce **runtime-grade software that works correctly in a real OMP TUI session** — not a copied MiMoCode tree that never registers. The governing non-negotiable: **the session is the isolation unit; the workspace is the root; sqlite WAL row-UPSERT is the only writer.** A per-project shared store is a leak. A JSON session map is the 8-session clobber class. A flushable activity window is the foreign-root class. First-class means `registerTool` at boot AND a boot log line naming the tools AND a dual-FRESH TUI session that can invoke `graph-probe` and get `PROBE_TOOL_OK` with **distinct** session ids and **distinct** store paths.

---

## §5 SCOPE (≤20)

1. Copy boilerplate 6 files into `src/scoping/` with GI ecosystem table; keep law comments.
2. Session store path `{scopeRoot}/.omp/graph-intelligence/sessions/{sid24}/store.sqlite`.
3. Master registry sqlite, env-chained, BUN_TEST isolated, no JSON fallback.
4. `GI_SCOPE_REFUSED` on cross-session open/write; names owner sessionKey.
5. Sticky ScopeResolver; never re-derive mid-session.
6. Register graph-query, graph-probe, bug-hunt, graph-code-audit via pi.zod in a dedicated extension AND trident-omp (same belt as ripwire).
7. List the extension in BOTH `~/.omp/agent/config.yml` AND `JARVIS_WORKSPACE/OMP/.omp/config.yml`.
8. graph-gate middleware on write/edit; STEER default; FULL cancel token `GRAPH_GATE_SIGNATURE_BREAK`.
9. Populate is per-session mechanical index (parseExports + named-import edges); never copy another session's sqlite.
10. EN-38 guards stay; GRAPHIFY_GRAPH_TOO_LARGE loud.
11. Skills: `graph-intelligence` + code-retrieval fourth branch.
12. ST suite: isolation, refuse, zero-misfire, known-bad wipe of production DB.
13. Dual-FRESH OMP TUI container proof (product_tui): two sessions, two stores, no leaked nodes.
14. Do not port Poseidon/identity/waves. Do not replace grep/ripwire/opengrok.
15. Do not ship until operator `/plugin-ship`-equivalent (OMP restart is operator).
16. Output caps 50KB/2000 lines; spill to file.
17. Fail-open on missing store; fail-closed on FULL signature-break.
18. clear()/wipe production registry REFUSED unless GI_OMP_ALLOW_CLEAR=1 (boilerplate class: 5 test files wiped prod DB).
19. Q0 bun:sqlite for OMP (already bun).
20. Canon + ship docs in this fork; MIMOCODE parent is read-only.

---

## §6 SUCCESS CRITERIA (classifier may not weaken)

| ID | Criterion | Verify |
|---|---|---|
| SC-1 | Fork on disk 249 live-tree files, sha16 63247bff8e2baf8f | `wc` + cat MANIFEST |
| SC-2 | Dedicated extension registers 4 GI tools; boot log names them | grep omp log `graph-query` |
| SC-3 | graph-probe returns PROBE_TOOL_OK + this sessionID | tool result JSON |
| SC-4 | Two sessions same project → two store paths; typed_nodes disjoint | sqlite counts + path strings |
| SC-5 | Session B openStore(session A) → GI_SCOPE_REFUSED | ST known-bad |
| SC-6 | Foreign project path → resolver does not pin A's root | ST scorer |
| SC-7 | BUN_TEST never writes `~/.omp/graph-intelligence/registry.sqlite` | ST isolation |
| SC-8 | FULL strip of exported fn → GRAPH_GATE_SIGNATURE_BREAK; file unchanged | container TUI |
| SC-9 | STEER strip → land + `[GATE STEER]`; OFF → land zero tokens | container TUI |
| SC-10 | who-calls on a hub in THIS store matches ST ground; not the other session | graph-query rows |
| SC-11 | GRAPHIFY_GRAPH_TOO_LARGE on 129MiB graph.json; process alive | ST + container |
| SC-12 | Dual FRESH OMP TUI: both sessions invoke graph-probe; distinct ids | screenshot + JSON |
| SC-13 | WAVE 3 isolation critic: no leaked nodes after concurrent writes | sqlite |
| SC-14 | WAVE 4 runtime: headed OMP TUI, tools visible, Phase E 10/10, ct-results PASS | artifact |
| Last rows SC-13/SC-14 are the only legal /goal complete. LIVE INNER ≠ done. |

---

## §7 CONTAINER TEST PLAN (plan-first)

Rig: `container-testing` tui=omp, image `runtime-grade-container-sandbox:master` or `mimo-ct:master` as available, memoryLimitMb=4096, distPath = built GI-OMP extension + trident-omp dist. Dual FRESH sessions (two containers or two tmux sessions). HONEST_CLASS=product_tui. Host pytest is hygiene never ship.

Angles ≥5: IDENTITY, TOOLS, FIREWALL, LIFECYCLE, INTEGRATION, ERRORS, STATE, CONFIG, CONCURRENCY.

| RB | Behavior | passToken | failToken |
|---|---|---|---|
| RB-IDENTITY | graph-probe in TUI | `PROBE_TOOL_OK` in tool result | tool absent / empty |
| RB-TOOLS | graph-query who-calls | `rows=` numeric in tool result | RIPWIRE used as silent fallback |
| RB-FIREWALL | FULL signature strip | `GRAPH_GATE_SIGNATURE_BREAK` + file UNCHANGED | Edit applied on export strip |
| RB-LIFECYCLE | session restart, sticky pin holds | same scopeRoot in registry row | foreign root |
| RB-INTEGRATION | concurrent A+B writes | two store files; counts isolated | shared typed_nodes growth |
| RB-ERRORS | content without path analogue: graph-query bad verb | `QUERY_INVALID` | crash / empty ok |
| RB-STATE | corrupt store sqlite header | loud `GI_STORE_CORRUPT` ALLOW+warn | silent empty graph |
| RB-CONFIG | GI_OMP_DB_DIR unset | default path under ~/.omp/graph-intelligence | write to /tmp leftover |
| RB-CONCURRENCY | 3 sessions UPSERT registry | all 3 rows present | last-writer-wins JSON clobber |

Evidence: `.omp/ct-results.json` per-scenario + screenshots. Phase E all 10. Positive+negative halves. Generic gate preempting specific token = UNOBSERVED not PASS.

---

## §8 ANTI-PATTERN LEDGER

### ARCHITECTURAL
- AP-A1 SHARED-PROJECT-STORE — one sqlite per project for all sessions. Detect: store path lacks `/sessions/{sid24}/`. Incident: 8-session RMW clobber.
- AP-A2 GLOBAL-HOME-STORE — `~/.omp/graph-intelligence/store.sqlite` as the graph. Detect: openStore path equals that. Incident: cross-project leak.
- AP-A3 JSON-SESSION-MAP — sessions.json whole-file rewrite. Detect: `JSON.parse`+write of all sessions. Incident: process A clobbers B.
- AP-A4 DUAL-WRITE — sqlite AND json. Detect: both writers. Incident: "the dual-write IS the race".
- AP-A5 REPLACE-RIPWIRE — GI swallows structural map. Detect: code-retrieval skill drops ripwire branch.

### BEHAVIORAL
- AP-B1 FLUSHABLE-CACHE — re-resolve mid-session. Detect: ScopeResolver cache miss after first pin. Incident: foreign root.
- AP-B2 CROSS-SESSION-READ — who-calls returns other session's nodes. Detect: ST two-sandbox. Token `GI_LEAK`.
- AP-B3 WIPE-PROD-DB — tests call clear() without GI_OMP_ALLOW_CLEAR. Incident: 5 test files wiped prod.
- AP-B4 SILENT-DOWNGRADE — GI down → grep without naming. Same class as OPENGROK_DOWN swallow.
- AP-B5 TOOL-SCHEMA-SNAPSHOT — "refresh" without process restart sold as wired. Incident: GI Round 12 + ripwire this week.

### PROCESS
- AP-P1 PROJECT-EXTENSIONS-OVERRIDE — OMP `.omp/config.yml` extensions list drops siblings. Incident: code-retrieval never loaded from JARVIS OMP desk.
- AP-P2 STUB-HYDRA — INCONCLUSIVE placeholders. Incident: GI Round 10 operator catch. WARHEAD 18.
- AP-P3 MIMO-HOOK-ON-OMP — copy tool.execute.before assuming OMP has mimo hook-api. Detect: import @mimo-ai/plugin in OMP extension.
- AP-P4 START-WITHOUT-PIN — hydra desks before operator run. Forbidden this turn.
- AP-P5 GAUNTLET-MINT — GAME DEV STUDIO / leftover_prim on this plugin tree.

Mechanical detection = ST assertions + boot-log grep + path regex `/sessions/[A-Za-z0-9_-]{8,24}/store\.sqlite` + `GI_SCOPE_REFUSED` tests. Bare keyword grep without artifact = lexicon violation.

---

## §9 OPEN DECISIONS (defaults)

| # | Fork | Default |
|---|---|---|
| D1 | Dedicated extension vs only trident-omp | BOTH (ripwire lesson) |
| D2 | Session store vs session column in one DB | per-session sqlite FILE (leak blast smaller; registry is the shared piece) |
| D3 | Populate on first graph-query vs on session start | lazy on first query/gate (don't OOM boot — EN-38 class) |
| D4 | Share read-only project snapshot | NO in v1. Isolated populate per session. Snapshot is v1.5. |
| D5 | Dial default | STEER (GI D2) |
| D6 | Advertise tools in model schema | essential loadMode; do not rely on eval bridge |
| D7 | Corbell full build in OMP | host-only; session populate = mechanical indexer (GI project-scope ensureGraphPopulated class) |
| D8 | Operator restart | required to pick up extensions; document; do not claim this chat's schema |

---

## §B DENSE BUILD PLAN

**NEW files (this fork):**
- `src/scoping/{scope-binding,scope-resolver,db-path,scoped-store,session-state,gi-registry}.ts` — boilerplate + GI registry schema
- `src/omp/extension.ts` — factory registerTool ×4
- `src/omp/gate-middleware.ts` — write/edit → runGraphGate
- `src/omp/store-open.ts` — openSessionStore(sessionId, ctx) → GI_SCOPE_REFUSED | handle
- `extensions/graph-intelligence/index.js` — bundled entry
- `tests/st-gi-omp-{scope,refuse,isolate,gate,wipe}.ts`
- `~/.omp/agent/skills/graph-intelligence/SKILL.md`
- this spec + hydra pin

**EDIT:** `JARVIS_WORKSPACE/OMP/.omp/config.yml` extensions array (append, never replace); `~/.omp/agent/config.yml` same; trident-omp `src/tools/registry.ts` spread GI tools like ripwire; code-retrieval skill fourth branch.

**UNTOUCHED:** MIMOCODE Graph_Intelligence parent; v443 checkpoint; ripwire binary; OpenGrok docker; EN-38 mapper/classifier bytes; Poseidon.

**Waves (sketch — hydra pin is authority):**
- W0 interfaces + scoping copy (disjoint: src/scoping)
- W1 store-open + registry (src/omp/store-open.ts, gi-registry)
- W2 tools extension (src/omp/extension.ts)
- W3 gate middleware (gate-middleware.ts)
- W4 ST isolation battery
- W5 trident-omp + config.yml
- W6 skills
- W7 dual-FRESH container (WAVE 3 isolation + WAVE 4 runtime)

---

## THE SPEC ILLUSTRATED

Master view (width 62):

```
┌──────────────────────────────────────────────────────────┐
│ §1 problem: OMP sessions leak if GI is per-project       │
└──────────────────────────┬───────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────┐
│ §2 resolver → session store → WAL registry               │
└──────────────────────────┬───────────────────────────────┘
                           ▼
┌────────────┬────────────┬────────────┬───────────────────┐
│ graph-     │ graph-     │ bug-hunt   │ graph-code-audit          │
│ query      │ probe      │            │ + EN-38 mapper    │
└─────┬──────┴──────┬─────┴──────┬─────┴─────────┬─────────┘
      │             │            │               │
      ▼             ▼            ▼               ▼
┌──────────────────────────────────────────────────────────┐
│ §6 SC-4/5 isolation · SC-8/9 gate · SC-12/13/14 TUI      │
│ WAVE 3 isolation critic · WAVE 4 headed runtime          │
└──────────────────────────────────────────────────────────┘
```

Named errors: `GI_SCOPE_REFUSED` · `GI_NO_STORE` · `GI_STORE_CORRUPT` · `GI_LEAK` · `GI_PATH_DENIED` · `GRAPH_GATE_SIGNATURE_BREAK` · `GRAPHIFY_GRAPH_TOO_LARGE` · `QUERY_INVALID` · `PROBE_TOOL_OK` · `RIPWIRE_PATH_DENIED` (sibling, do not reuse).

---

## THE SCRIPT TESTING SUITE

Harness: bun, real tmp dirs, real sqlite, real imports from `src/scoping` + `src/omp/store-open`. No mocks of openSessionStore. Both halves. Runner `bun test tests/st-gi-omp-*.ts` exit 0. Script green is **hygiene**, never GATE B, never /goal complete.

| ST | Stimulus | Observable | known-bad MUST refuse |
|---|---|---|---|
| st-scope | two sessionIds, same cwd | two store paths under /sessions/ | same path |
| st-refuse | B opens A's sessionKey | throw/return GI_SCOPE_REFUSED | silent handle |
| st-isolate | A inserts node N; B who-calls | B rows=0 for N | N visible |
| st-wipe | clear() without env | refuse; prod registry row count unchanged | wipe |
| st-buntest | BUN_TEST=1 | db path contains testFile name | writes ~/.omp/.../registry.sqlite |
| st-sticky | resolve twice with poisoned activity | second == first pin | foreign root |
| st-too-large | 129MiB graph.json | GRAPHIFY_GRAPH_TOO_LARGE | OOM / parse |
| st-gate-full | strip export in FULL | cancel true + token | land |
| st-gate-off | same strip in OFF | land, no token | cancel |
| st-bad-verb | graph-query op=delete | QUERY_INVALID | 200 ok |

---

## THE DEEP CONTAINER TESTING SUITE

12-step law instantiated: plan 2000+ chars 6 sections → setup headed omp TUI → auth probe → screenshot status bar live provider → scenarios below → adversarial continue → Phase E 10 → `.omp/ct-results.json` → zero broken windows → declaration with sha.

POSITIVE: RB-FIREWALL FULL strip; RB-CONCURRENCY 3 sessions; cross-session who-calls leak attempt.
NEGATIVE: legit edit append; legit graph-query on own store; legit ripwire doctor; legit grep.
AUTH first. Dual FRESH (WAVE 3). Headed runtime (WAVE 4). passToken in tool-result context only.

---

## ZERO-TRUST AUDIT OF THIS SPEC

| Sev | Finding | Edit |
|---|---|---|
| MED | GI CURRENT_STATE still says v1.3.0 | cited as doc lag in §3 |
| MED | OMP advertised schema may still hide tools | D6 loadMode essential + boot log + TUI proof |
| LOW | OpenGrok index misses GI trees | out of scope; do not silent-fallback |
| — | EN-38 already in fork | do not re-implement |

No unresolvable gaps. Operator restart is required to mutate the live tool schema. This session does not start hydra desks.
