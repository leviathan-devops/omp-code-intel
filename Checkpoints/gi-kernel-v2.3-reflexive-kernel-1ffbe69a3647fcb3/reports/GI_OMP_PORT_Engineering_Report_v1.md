# GI-OMP PORT — ENGINEERING REPORT v1

**Series:** GI_OMP_PORT (the checkpoint-machinery port epoch: corbell parse-grade substrate + 6-phase hunter machine + parse-grade verbs, proven on omp-ct:master dual-FRESH; the parent series is GI_OMP_First_Class v1–v2, the session-scoped store + gate lineage)
**Project:** Graph_Intelligence OMP port (GI-OMP)
**Date:** 2026-09-15 (verdict 2026-09-14T22:44Z)
**Author:** Trident Agent (omp) — god-loop-gi-ct wave W5
**Baseline:** fork-v143/live-tree (seal sha16 `63247bff8e2baf8f`, 249 files) + `.trident/wave-plan.md` T-1..T-10
**Commit:** n/a — no per-tree git lineage (workspace snapshot; fork seal is the baseline authority)
**Container:** gi-omp-port (primary) + gi-omp-port2 (dual-FRESH B) · **Image:** omp-ct:master (`3a25c2af5387`)

---

## ONE-PARAGRAPH SUMMARY

The GI-OMP port wave replaces the regex stopgap with the **parse-grade corbell substrate as the primary knowledge graph** (warm checkout → 2,086 nodes / 9,386 edges over the 249-file fork tree; the regex indexer `src/omp/populate.ts` demoted to a NAMED loud fallback that prints `CORBELL_NOT_WARM:{absent|stale|zero-rows}` with the warm command), wires the **full 6-phase hunter machine** (XState5 micro-loop: recon → MAP → SCAN → TRACE → STRIKE → REPORT, under hunt-lock, fail-closed INCONCLUSIVE as RESULT) end-to-end in a headed OMP TUI — emitting `HUNT_DONE runId=gi-study-src-hunt-20260914-1 findingsCount=296` and a **453,718-byte report artifact on disk** — and extends the tool surface to **parse-grade verbs** (`impact` upstream closure with depth ledger + hint, `safe-delete` naming callers `file:line` + reaches + uses + test-reach in one result, `gate` STEER/FULL advisory naming callers, plus corbell-faithful who-calls/blast/chain/unwired over `calls`+`traces-to`), all proven by a **dual-FRESH headed OMP TUI run on omp-ct:master** whose legal-stop artifact `.omp/ct-results-port.json` reads **overallVerdict PASS — 20/20 live scenarios, circuit breaker 10/10** (AD5 recorded PASS-BY-ST, no TUI claim).

---

## THE LIFECYCLE MAP

```
   TUI tool call  (graph-probe | graph-query | bug-hunt | graph-code-audit)
        │
        v
 ┌──────────────────────────────┐   warm checkout?   ┌────────────────────────┐
 │ openSessionStore              │──────────────────▶│ populate-corbell.ts    │
 │ sessions/<sid24>/store.sqlite │                    │ read warm typed rows   │
 └──────────────┬───────────────┘                    │ freshness ≤500 files   │
                │ absent|stale|zero-rows             └───────────┬────────────┘
                v                                                │ ok
 ┌──────────────────────────────┐                                v
 │ populate.ts regex indexer     │                    ┌────────────────────────┐
 │ NAMED fallback (token+reason) │                    │ store: 2086n / 9386e   │
 └──────────────┬───────────────┘                    │ gi_meta substrate row  │
                └──────────────────┬─────────────────┴───────────┬────────────┘
                                   v                             │
                    ┌──────────────────────────────┐             │
                    │ VERBS  who-calls blast chain  │◀────────────┘
                    │ impact safe-delete gate ...   │  gi_meta ledger:
                    └──────────────┬───────────────┘  substrate=corbell
                                   │                  populated_at=...
                                   v                  corbell_checkout=...
        ┌──────────────────────────────────────────────────────────┐
        │ HUNT  6-phase micro-loop (XState5) under hunt-lock        │
        │ recon→MAP→SCAN→TRACE→STRIKE→REPORT                        │
        │   findings rows + HUNT_DONE event + report .md artifact   │
        └──────────────┬───────────────────────────────────────────┘
                       v
        ┌───────────────────────────────────────────────────────┐
        │ GATE  FULL: cancel+GRAPH_GATE_SIGNATURE_BREAK |       │
        │       STEER: [GATE STEER] advise | OFF: token:null    │
        │       → /tmp/gi-gate.log  (per-edit mechanical record)│
        └───────────────────────────────────────────────────────┘
```

---

## THE ARCHITECTURE (per module)

### A. Substrate layer — corbell-first populate + the ledger

```
 src/omp/populate.ts:49 populateSessionStore
   │  corbell FIRST (populate-corbell.ts:67)
   │    ├─ ok  → setMeta(substrate=corbell) + checkout path + timestamp
   │    └─ !ok → console.error("populate falling back to the mechanical
   │              indexer: <CORBELL_NOT_WARM:*> (warm with: bun
   │              scripts/corbell-build.ts --target '<root>')")
   v
 src/omp/typed-write.ts:77  CREATE TABLE gi_meta(key PK, value)
 src/omp/typed-write.ts:85  getMeta()
 src/omp/typed-write.ts:97  setMeta()
 src/omp/extension.ts :100  stored = getMeta(store,"substrate")
           :104  if (empty || (warm.fresh && stored !== "corbell"))
                     → repopulate   ← THE RECONCILE LAW
```

- **Interfaces:** `PopulateResult { filesIndexed, nodes, edges, runTag, skipped, substrate, fallbackReason, corbellCheckout }` (`populate.ts:14-24`).
- **Data flow:** warm checkout store (`<root>/.omp/graph-intelligence/corbell-checkout/store.sqlite`) → rows copied batch-wise (`insertForkNodesBatch`/`insertForkEdgesBatch`) → session store under `sessions/<sid24>/` with `superseded_run` bookkeeping.
- **Failure modes (all NAMED, none silent):** `CORBELL_NOT_WARM:absent|empty|stale|zero-rows|unreadable:<msg>` (freshness probe ≤500 files, `populate-corbell.ts:32-65`); `GI_STORE_CORRUPT` via sqlite magic check (`typed-write.ts:106-126`); `GI_SCOPE_REFUSED` cross-session (`store-open.ts:39-49`); `GI_PATH_DENIED` scope resolution (`src/scoping/index.ts`).
- **Calibration constants:** `CORBELL_FRESHNESS_BUDGET = 500` (`populate-corbell.ts:15`); `POPULATE_FILE_BUDGET = 1000` (`populate.ts:10`).

### B. Corbell chain — the fix-bundle adapter (verbatim port)

```
 profile.yaml ──loadProfile──▶ src/hunter/profile/loader.ts:427
    │  (root exists · corpus exists · history exists → named errors)
    v
 src/hunter/graph/corbell-adapter.ts:271  CorbellAdapter.build()
    ├─ writeWorkspaceConfig: version "1" QUOTED · root: ".." · repo: ..
    ├─ warm-skip: graph.rebuild === false → SKIP the build exec
    ├─ guard: resolveCorbell() → `<bin> --help` must exit 0
    ├─ build exec: `${resolvedBin} graph build --methods`  (FIXED split-brain)
    ├─ coupling env: CORBELL_COUPLING_MONTHS=1 · MAX_COMMIT_FILES=200
    │                · MAX_COMMITS=500 · SCOPE=<proj-rel-to-git-root>
    ├─ walk excludes: profile ex + Checkpoints,corbell-data,context_management,.trident
    ├─ STORE_BLOATED > 512MB → loud fail
    └─ substance check: ZERO code nodes → loud GRAPH_EMPTY
    v
 readCorbellStore: graph_nodes(id,node_type,data) + graph_edges(src,tgt,kind,metadata)
    → corbell:<id> canonicals · name resolution name→method_name→…→id
    → line resolution line→line_start→line_end · numeric-literal enrichment
    → class-node derivation from method class_name
    v
 src/hunter/graph/store-map.ts → typed_nodes/typed_edges (method_call→calls,
                                 flow_step→traces-to) via typed-write batch writers
```

- **Failure modes:** `ADAPTER_FAILED: command=corbell --help detail=CORBELL_NOT_FOUND …` (verbatim, container-captured); `ADAPTER_FAILED: … could not read the corbell store rows: SQLiteError: no such column: metadata` (fixture-captured); `GRAPH_EMPTY`; `STORE_BLOATED`; `FOREIGN_PATH_UNRESOLVED` (logged, node kept file-less).
- **Measured:** fork-v143 big-tree build `nodes=2086 edges=9386` (method=1949 exact, calls=4698, traces-to=4688), 20.2s reproducible; `st-corbell-port` 6/6 (28 expects).

### C. The 6-phase hunter machine (harness/**)

```
 src/hunter/tools/bug-hunt.ts:53 spawnBugHunterLoop  (acquireHuntLock)
        │                                          :139 createBugHuntTool (tool)
        v
 src/hunter/harness/micro-loop-machine.ts:108 createMicroLoop (XState5)
   recon ──▶ map ──▶ scan ──▶ trace ──▶ strike ──▶ report
    │        │        │        │         │          │
 profile   adapter  compile  legacy    dedupe     writer(N-versioned
  load     build +  battery  matrix    + rank      local md, 500-cap)
           writeGraph          (deterministic)      + HUNT_DONE event
           + mirror            :118 no network      + mirrorToMasterContext
```

- **Interfaces:** `MicroLoopOptions { targetPath, profilePath, adapter?, profile?, battery?, reportWriter? }`; result `{ runId, state, findingsCount, reportPath, fixOrder, error }`.
- **Failure modes:** every error is a **RESULT, never a throw** (`state:"inconclusive"` + named code): `PROFILE_INVALID` (field+value+remedy), `CORPUS_MISSING`, `HISTORY_MISSING`, `ADAPTER_FAILED`, `GRAPH_EMPTY`, `HUNT_NO_COVERAGE` (rulesCompiled=0), `D13_VIOLATION` (quote-less card), `ENGINE_GRAPH_EMPTY`.
- **Evidence:** live TUI `HUNT_DONE runId=gi-study-src-hunt-20260914-1 findingsCount=296 reportPath=/workspace/gi-study-src/MASTER_CONTEXT/bug_hunter_report_v1.md`; artifact 453,718 B, 296 sections, rule `wiring.no-dead-module:f0d6a738aadb`, evidence text `dead module buildT2Brief (…:10) has zero inbound callers — the unwired() graph read lists it`; host battery `tests/st-hunter-live.ts` (no stubs, full chain incl. HUNT_DONE event row) 1/1.

### D. Tool surface + verbs

```
 src/omp/extension.ts:37 registerGiOmpTools → graph-probe :41 | graph-query :71
   verbs:81 [who-calls, blast-radius, would-break, unwired, chain, impact,
              safe-delete, gate, must-implement, rule, violations, consistency]
   impact :133 → typed-write.ts:447   safe-delete :138 → :497
   gate   :143 → :536                 who-calls :110 → :239
 bug-hunt :180 createBugHuntTool      graph-code-audit :191 (stub, loud)
```

- **Verb semantics (corbell vocabulary):** who-calls reads `calls`+`traces-to`+`imports` with `superseded_run IS NULL` everywhere (`typed-write.ts:243-249`); impact = upstream closure + depth ledger + `hint=next=chain from=<sym>`; safe-delete = callers (file:line) + reaches + uses + testReach in ONE result; gate advisory = store-derived caller list when ripwire absent (says so: `(store-derived; no ripwire edit-check in this tree)`), FULL names `GRAPH_GATE_SIGNATURE_BREAK`.
- **Measured live:** `rows=31` (openStore: 12 calls + 19 traces-to) · `impact_reaches=158` · `safe_delete: openStore callers=31 reaches=158 uses=2 testReach=0` · `blast rows=160 depth=5` · `chain rows=1 corbell:live-tree::query-registration.ts::runQueryTool -> runQuery [calls]` · `[GATE STEER] … callers=31 review: execute (…tools/graph-query.ts:52), …`

### E. Gate middleware (dials + hook)

```
 write/edit tool_call ──▶ gate-hook.ts ──▶ gate-middleware.ts:37 resolveDial
                                            (env GI_DIAL | dial file | STEER)
                          :71 runGraphGate
   FULL  → cancel:true  token GRAPH_GATE_SIGNATURE_BREAK
   STEER → cancel:false token [GATE STEER] advisory SIGNATURE_BREAK removed=X
   OFF   → cancel:false token:null
                          v
              /tmp/gi-gate.log  {"recFile":...,"dial":...,"verdict":{...}}
```

- **Verbatim ledger entries (container evidence):**
  - `{"recFile":"gi-study-src/scratch-full.ts","dial":"FULL","verdict":{"cancel":true,"token":"GRAPH_GATE_SIGNATURE_BREAK","advisory":"removed=fullProbe"}}` + file UNCHANGED on disk.
  - `{"recFile":"gi-study-src/scratch-gate.ts","dial":"STEER","verdict":{"cancel":false,"token":"[GATE STEER]","advisory":"SIGNATURE_BREAK removed=gateProbe"}}` + edit landed.
  - `{"recFile":"gi-study-src/scratch-off.ts","dial":"OFF","verdict":{"cancel":false,"token":null,"advisory":null}}` + edit landed, zero gate tokens in the stream.

### F. Session scoping + registry

```
 store-open.ts:36 openSessionStore  → sessionKey(sid) owner==caller else GI_SCOPE_REFUSED
                                   → sessionStorePath(scopeRoot, sid) → sessions/<sid24>/
 gi-registry.ts   one machine-wide sqlite (WAL) row-UPSERTs, NO JSON fallback
```

- **Live evidence:** `GI_SCOPE_REFUSED: GiScopeError: GI_SCOPE_REFUSED: session omp-default-session cannot open store owned by ne-else-0000000000000000`.
- **Dual-FRESH isolation:** A (gi-omp-port): `substrate=corbell, nodes=2086, edges=9386, betaUnique ABSENT`; B (gi-omp-port2): `substrate=indexer-fallback` (reason `CORBELL_NOT_WARM:absent`), `nodes=2`, `betaUnique PRESENT`; two disjoint store files (A 5,111,808 B @22:39Z; B 45,056 B @22:42Z); both containers RUNNING + tmux up at verdict.

---

## THE BUG LEDGER

| # | bug | root cause | fix | evidence |
|---|-----|-----------|-----|----------|
| 1 | Stale-store masquerade: pre-populated store never surfaced its substrate | populate fired only on `countTypedNodes==0`; persisted session store kept silent regex rows | `gi_meta` ledger + reconcile law (`extension.ts:104`) | ST 4/4; live reconcile → `substrate=corbell rows=31`, 2086/9386 |
| 2 | `path is not defined` kills the live hunt | `scan.ts:29` used `path.*` with NO `node:path` import; the stub-battery ST skipped that branch | import added + NEW `tests/st-hunter-live.ts` pinning the live route | pre-fix: hunt RESULT text verbatim `path is not defined`; post-fix: HUNT_DONE; ST 1/1 |
| 3 | Adapter split-brain binary | guard resolved a binary; build exec used bare `corbell` (PATH) | build now execs `resolveCorbell()` (`corbell-adapter.ts:394-395`) | st-corbell-port 6/6 after fix |
| 4 | Tool-name collision shadows the port | trident-omp dist re-registers GI tools **from the GI source at ITS build time**; a stale baked dist (17:04) won the name race | both dists rebuilt from current source + deployed together | old behavior `rows=11` no substrate line vs new `substrate=corbell rows=31`; HUNT_DONE only after |
| 5 | Host `corbell` binary died (ModuleNotFoundError) | `.local/bin/corbell` was an editable install pointing at `/tmp/corbell-ref` — wiped (the exact tmp-install class the adapter comments warn about) | shebang → venv python; venv made the durable install | `corbell --help` exit 0; st-corbell-port back 6/6 |
| 6 | venv lacked tree-sitter stack | corbell 1.0.0 in venv without grammars | `pip install tree-sitter + 9 language grammars` into venv | `import tree_sitter, tree_sitter_typescript → grammars OK`; fixture build yields nodes>0 |
| 7 | Container (omp-ct) ships no corbell | image built without the CLI | real CLI installed at `/opt/corbell-venv` (pip --no-deps; the adapter's durable site) | `corbell --help` exit 0 in-container; guard passes |
| 8 | YAML subset rejected the profile (×2) | fixture authored with unquoted `:` values (`machinery: a module`, `docs/PORT_CORPUS.md:3`) — the loader's subset is colon-strict | fixture rewritten colon-free (machine correct: fail-closed `PROFILE_INVALID` with line number both times) | verbatim: `PROFILE_INVALID: field=yaml … parse error at line 20/21` → HUNT_DONE after fixture fix |

**Detail box — #4, the collision (most dangerous class):** the GI tools are registered TWICE in omp-ct (trident dist + GI bundle). The trident dist **bundles the GI source at build time** (`trident-omp/src/tools/gi-omp.ts` imports `registerGiOmpTools` from the GI tree). A stale bake silently served pre-port tools — no substrate line, hunt→status shape — while the "fresh" bundle sat inert. It was only caught because the CT plan asserts *tokens*, not *existence*. **Law extracted:** every GI-source change must rebuild BOTH dists; both were rebuilt (`89ce7270` / `8756baac`) and deployed together, after which every token landed.

**Detail box — #2, live-only defect:** st-hunter-port (3/3) exercised the machine through its port seams (profile override + stub battery), which **bypass** `resolveCorpusPaths` — the exact line that referenced the missing import. The live TUI hunt caught it in one turn (`path is not defined`). The new `st-hunter-live.ts` closes the class: no stub profile, no stub adapter, no stub battery — the real chain must reach `state=done` with a report file and a `HUNT_DONE` event row.

---

## THE TESTING LEDGER

| test | scope | how | result |
|------|-------|-----|--------|
| Host battery (final) | 13 files: st-gi-omp-scope/refuse/wipe/tools/isolate/gate/corrupt + st-hunter-port + **st-hunter-live** + st-corbell-port + st-populate-substrate + st-gi-omp-populate + st-verbs-parse | `bun test …` | **49 pass / 0 fail / 644 expect** |
| st-corbell-port | adapter fix-bundle + store-map + CLI + GRAPH_EMPTY | fixture builds | 6/6 · 28 expects (after env repair) |
| st-hunter-live (NEW) | the LIVE chain: loadProfile→CorbellAdapter→compileBattery→runBattery→trace→strike→report | tmp fixture + staged warm store | 1/1 · 8 expects · HUNT_DONE event row asserted |
| st-verbs-parse | corbell vocabulary verbs | warm fork checkout | 6/6 · 474 expects |
| Container suite | 22 rows in `.omp/ct-results-port.json` | live TUI interactions per plan `ct-plan-port.md` (plan hash 59ebb16) | **20/20 live PASS + AD5 PASS-BY-ST** |
| Gate trio | FULL/STEER/OFF write-gate on real edits | scratch files + `/tmp/gi-gate.log` | cancel:true / `[GATE STEER]` / token:null — all exact |
| Corrupt→heal→reconcile | `GI_STORE_CORRUPT` then recovery | 57B garbage file → rm → refresh | refusal verbatim; repopulate via named fallback (`CORBELL_NOT_WARM:stale`) then reconcile `substrate=corbell 2086/9386` |
| Dual-FRESH isolation | A vs B disjoint graphs | probe + who-calls + store inspection both sides | betaUnique only in B; A unchanged; both alive at verdict |
| Provenance sweep | every port carries `// PORTED FROM <tree>/<file>:<lines>` | `grep -rl` | **45 files** carry provenance |
| Regression sweep (wave) | 41/0 → 42/0 → 48/0 → (46+3env-fail) → **49/0** | same battery re-run at each dist | only regression: st-corbell-port ×3 during host corbell breakage — repaired to 6/6 (env, adjudicated) |

---

## THE SPEC MANDATE → ENGINEERING MAP

| the operator said | what was built | evidence |
|---|---|---|
| "corbell substrate wired (fix-bundle verbatim)" | `corbell-adapter.ts` 894L fix-bundle: quoted `version:"1"`, `root:".."`, warm-skip, coupling env, walk excludes, STORE_BLOATED, GRAPH_EMPTY, node enrichment | substrate=corbell live; ledger 2086/9386; st-corbell-port 6/6 |
| "the 6-phase hunter machine LIVE" | XState5 micro-loop + recon/map/scan/trace/strike/report + hunt-lock | `HUNT_DONE … findingsCount=296` + 453,718B artifact on disk |
| "full machinery set per the port manifest" | W3 P1–P5 ports (triad/ontology/go-key-pool/migrations/db/lexicon/diagnostics/query-engine/firewalls/surface) | RUNNING_BUILD_LOG wave sections; 45 provenance files |
| "parse-grade verbs" | impact / safe-delete / gate + corbell-faithful who-calls/blast/chain/unwired | live tokens `impact_reaches=158`, `safe_delete:`, `[GATE STEER] callers=31`, `rows=31` |
| "NO regex substitutes for real machines" | regex indexer DEMOTED, not deleted; every fallback fires with token+reason+warm command | B: `substrate=indexer-fallback` + `CORBELL_NOT_WARM:absent`; heal turn: `…:stale` |
| "dual-FRESH headed OMP TUI proof on omp-ct:master" | gi-omp-port + gi-omp-port2, both omp-ct:master, same dists, one model | ct-results-port.json; both containers alive |
| "Legal stop = ct-results-port.json overallVerdict PASS" | the artifact written + validated | `JSON VALID · overallVerdict: PASS · 22 rows · circuitBreaker all true` |
| "Every port carries // PORTED FROM" | provenance lines | 45 files |

---

## THE NUMBERS

```
 ┌────────────────────────────────────────────┬───────────────────────────────┐
 │ MEASURED METRIC                            │ VALUE                         │
 ├────────────────────────────────────────────┼───────────────────────────────┤
 │ Host battery                               │ 49 pass / 0 fail / 644 expect │
 │ Battery files                              │ 13 (1,453 lines)              │
 │ src/hunter files / lines                   │ 48 / 11,686                   │
 │ src total files                            │ 64 (45 with PORTED FROM)      │
 │ Corbell big-tree build                     │ 2086 nodes / 9386 edges, 20.2s│
 │   kinds                                    │ method=1949 · calls=4698      │
 │   predicates                               │ traces-to=4688                │
 │ who-calls openStore (live)                 │ rows=31                       │
 │ impact / safe-delete (live)                │ 158 reaches / 31 callers      │
 │ blast / chain (live)                       │ rows=160 d=5 / rows=1         │
 │ Hunt (live)                                │ findingsCount=296             │
 │   report artifact                          │ 453,718 B · 296 sections      │
 │ Gate log trio                              │ cancel:true / token / null    │
 │ CT artifact                                │ 20/20 live + 1 PASS-BY-ST     │
 │ GI dist (sha256)                           │ 89ce7270e1554a89… (460,870 B) │
 │ trident dist (sha256)                      │ 8756baac20ebb92f… (15,060,916)│
 │ Image                                      │ omp-ct:master 3a25c2af5387    │
 └────────────────────────────────────────────┴───────────────────────────────┘
```

---

## THE FILE MANIFEST

```
 Graph_Intelligence/
 ├─ profile.yaml                        NEW  (substrate: corbell · scope src · 8 excludes)
 ├─ src/omp/
 │  ├─ extension.ts                     MOD  (verbs :81/:133-147 · hunt wiring :180)
 │  ├─ typed-write.ts                   MOD  (gi_meta :77 · corbell vocab :243 ·
 │  │                                          impact :447 · safeDelete :497 ·
 │  │                                          gateAdvisory :536)
 │  ├─ populate.ts                      MOD  (corbell-first :49-68 · named fallback)
 │  ├─ populate-corbell.ts              NEW  (freshness :32 · checkout read :67)
 │  ├─ store-open.ts                    EX   (GI_SCOPE_REFUSED)
 │  ├─ gi-registry.ts                   EX   (WAL registry)
 │  ├─ gate-middleware.ts               EX   (resolveDial :37 · runGraphGate :71)
 │  └─ gate-hook.ts                     EX
 ├─ src/hunter/                         (48 files · 11,686 L · all NEW this lineage)
 │  ├─ profile/{schema,loader}.ts       verbatim port (loader :427)
 │  ├─ graph/{corbell-adapter,interface,store-map}.ts  (adapter :271)
 │  ├─ harness/{micro-loop-machine( :108),recon,map,scan,trace,strike,
 │  │           report,hunt-lock,types}.ts
 │  ├─ lexicon/{rule-card,templates,compiler,compiled-store}.ts
 │  ├─ diagnostics/{findings-store,semantic-predicates,engine,
 │  │               calibration,fixture-calibration}.ts
 │  ├─ tools/{bug-hunt( :53,:139),query-registration,report-writer-local}.ts
 │  ├─ firewall/{readonly,artifact-scope}.ts · surface/{query-tool,lsp-injector}.ts
 │  ├─ keys/go-key-pool.ts (5-key, zero-literal) · shared/{db,query-engine,migrations}.ts
 │  └─ scoping/ … (EX incl. gi-registry peers)
 ├─ scripts/corbell-build.ts            NEW  (explicit warm-index builder)
 ├─ tests/ (13 files · 1,453 L)         NEW/MOD incl. st-hunter-live.ts (NEW)
 ├─ docs/{GI_OMP_PORT_MASTER_PROMPT,ct-plan-port}.md   NEW
 ├─ .omp/ct-results-port.json           NEW  ← THE LEGAL STOP
 └─ context_management/RUNNING_BUILD_LOG.md  APPEND-ONLY (ported wave + CT sections)
```

---

## WHAT'S NEEDED FROM THE OPERATOR

1. **Host omp restart (optional):** the host dists are deployed (`~/.omp/agent/extensions/…`); they take effect on the next host session. The proof of record is the container run.
2. **P6 queue decision:** the remaining manifest swaps (W8 writer / L6 trace / SRO map) are queued, non-blocking for this lineage's stop — approve timing for the next wave.
3. **K20.3 double-run:** re-hunt same-ids determinism check — 1 extra hunt turn in either container if you want it recorded.
4. **Containers left running (Phase G):** gi-omp-port + gi-omp-port2 hold inspectable evidence — authorize cleanup when done.
5. **Cosmetic approval:** clear the `fallback_reason` gi_meta key on the corbell success path (stale key lingers after reconcile; harmless but untidy).
6. **Build discipline:** keep the both-dists-rebuild rule wired (or approve a post-build hook in trident-omp so a GI change can never ship half-stale again).

*Every number above was measured this run; every token was captured in tool-result context or the gate log; nothing in this report is a remembered value.*
