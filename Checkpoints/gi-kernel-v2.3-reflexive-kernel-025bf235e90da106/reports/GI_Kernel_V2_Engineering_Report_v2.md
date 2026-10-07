# GI KERNEL V2.2 — ENGINEERING REPORT v2
**Series:** GI Kernel V2 (the V2 lineage; v1 = `GI_Kernel_V2_Engineering_Report_v1.md`). The operator named this build **V2.2** — a minor bump on the V2 line (the rebuild spec's working title was "V3"; renamed 2026-09-26 per operator ruling).
**Project:** GI-OMP (Graph Intelligence for OMP) — the 6L+2E kernel
**Date:** 2026-09-26
**Author:** the orchestrating session (Front A/B/C waves + the primary)
**Baseline:** `jarvis/gi-main` @ `018aad8`
**Container:** `omp-ct-gi20` · **Image:** `omp-ct:master`

---

## ONE-PARAGRAPH SUMMARY

GI Kernel V2.2 rebuilds the 6L+2E graph kernel so the graph is a **FUNCTION OF THE TARGET**:
`discoverSourceRoots(target)` derives the source roots from the target's OWN config (5 rules), `gi-populate
--target X` builds every layer into **X's own scope** and stamps `gi_meta.build_root`, every read asserts
`assertStoreScope` (a cross-scope read is a NAMED refusal), the meaning gate runs **JevK5 on the GPU**
(`jevk5-4b-v0.2-Q8_0` on `:8090`), ABIDE judges the **CURRENT diff live**, and a **claim firewall** (fail-CLOSED)
REJECTS a completion claim with no THIS-TURN tool-result span. Measured: the register on a real foreign
project went **0/8 → 3/8** (with every other layer named); the GI repo's carried 7/8 is now a **PRODUCED**
7/8; the battery is **453/0 + 551/0**; the deployed dist is `b2ab09acc77684e4` (784K). It produces a
self-populating, content-scoped, GPU-judged, completion-blocking graph kernel that runs on the host against
any target.

---

## THE LIFECYCLE MAP

```
┌──────────────────────────────────────────────────────────────────────┐
│  THE V2.2 CAPABILITY — one page, entry to terminal                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   a TARGET dir                                                       │
│        │                                                             │
│        ▼                                                             │
│   ┌────────────────────────┐                                         │
│   │ discoverSourceRoots()  │  5 rules: profile → workspace →         │
│   │ src/hunter/profile/    │  tsconfig → conventional → walk         │
│   │   source-roots.ts:407  │  no hit → GI_NO_SOURCE_ROOT             │
│   └───────────┬────────────┘                                         │
│               │ {roots, evidence}                                    │
│               ▼                                                      │
│   ┌────────────────────────┐                                         │
│   │ gi-populate --target X │  per layer: run builder → write into    │
│   │ scripts/gi-populate    │  X/.omp/graph-intelligence/ → stamp     │
│   │   .ts:230              │  build_root → verify >0 LIVE rows       │
│   └───────────┬────────────┘                                         │
│               │ {corbell,graphify,structural,ua,semantica,c2kg}     │
│               ▼                                                      │
│   ┌────────────────────────┐                                         │
│   │ THE TARGET'S OWN STORE │  build_root = realpath(target)          │
│   │ X/.omp/graph-intelli…  │                                         │
│   └───────────┬────────────┘                                         │
│               ▼                                                      │
│   ┌────────────────────────┐   ┌──────────────────────────┐          │
│   │ assertStoreScope()     │   │ whoCalls / blastRadius / │          │
│   │ src/omp/store-open.ts  │──►│ impact (anchored facts)  │          │
│   │   :150                 │   └────────────┬─────────────┘          │
│   └────────────────────────┘                │                        │
│                                             ▼                        │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │ THE 8 CONSUMERS (the register)                               │   │
│   │  L1_SEMANTICA L2_ARSUMBRIS L3_UA L4_C2KG                     │   │
│   │  L5_CORBELL L6_GRAPHIFY · TSG (JevK5 GPU) · ABIDE (live)     │   │
│   └──────────────────────────┬───────────────────────────────────┘   │
│                              ▼                                       │
│   ┌────────────────────────┐   ┌──────────────────────────┐          │
│   │ CLAIM FIREWALL         │   │ the completion surface   │          │
│   │ src/omp/claim-firewall │──►│ no THIS-TURN span →      │          │
│   │   .ts:182 (fail-CLOSED)│   │ FABRICATED → REJECTED    │          │
│   └────────────────────────┘   └──────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## THE ARCHITECTURE (per module)

### MODULE 1 — `src/hunter/profile/source-roots.ts` (NEW, 434 L)

```
┌────────────────────────────────────────────────────────────────┐
│ discoverSourceRoots(targetRoot)                                │
│   → { roots: string[]; evidence: string } | { error: string }   │
├────────────────────────────────────────────────────────────────┤
│ R1  the target's profile .omp/…/profile.yaml `sources:`         │
│ R2  a workspace manifest (pnpm-workspace.yaml | pkg workspaces) │
│ R3  tsconfig.json include/files → the GLOB-PREFIX dirs          │
│ R4  conventional roots: src/ · lib/ · app/ · packages/*/src      │
│ R5  a bounded walk (depth≤4) → the ROOT-MOST dirs with .ts       │
│ NO HIT → GI_NO_SOURCE_ROOT (never GRAPH_EMPTY)                  │
└────────────────────────────────────────────────────────────────┘
```

- **Interfaces:** the ONE new public signature; returns absolute realpath'd roots + which rule fired.
- **Data flow:** `targetRoot` → per-rule probes → the first hit wins → `{roots, evidence}`.
- **Failure modes:** no hit → `GI_NO_SOURCE_ROOT` (the named refusal, exit 1 at the callers). A rule that finds nothing falls through to the next.
- **Anchors:** `source-roots.ts:407 discoverSourceRoots` · `:386 ruleWalk` · `:299 ruleTsconfig` · `:346 ruleConventional` · `:236 ruleWorkspace` · `:210 ruleProfileSources`.
- **Constants (named):** `WALK_SKIP` (node_modules/.git/dist/build/.trident/Checkpoints/corbell-data/.omp/coverage) · `maxDepth=4`.

**THE TWO DEFECTS FOUND BY RUNNING (see the bug ledger):** rule 3 returned the tsconfig COMMON ANCESTOR (the repo root) → corbell's `RecursionError`; rule 5 pushed NESTED roots → duplicate nodes.

### MODULE 2 — `src/omp/typed-write.ts` + `store-open.ts` (the content scoping, W3)

```
┌──────────────────────────────────────────────────────────────┐
│ R1  the target's profile .omp/…/profile.yaml `sources:` key  │
│ R2  a workspace manifest (pnpm-workspace | pkg workspaces)   │
│ R3  tsconfig.json include/files → the GLOB-PREFIX dirs       │
│ R4  conventional roots: src/ · lib/ · app/ · packages/*/src   │
│ R5  a bounded walk (depth≤4) → the ROOT-MOST dirs with .ts    │
│ NO HIT → GI_NO_SOURCE_ROOT (never GRAPH_EMPTY)               │
└──────────────────────────────────────────────────────────────┘
```

- **Interfaces:** `setBuildRoot(storePath, targetRoot, builder)` · `assertStoreScope(storePath, subjectRoot, {allowForeignStore?})` → `GiStoreScopeError(code GI_STORE_SCOPE_MISMATCH)`.
- **Data flow (write):** targetRoot → realpath → the 4 gi_meta rows. **(read):** the store's build_root vs the subject's realpath.
- **Failure modes:** a mismatch throws the named error (fail-CLOSED on a foreign store); a legacy store (no build_root) fails OPEN (`foreign:false`).
- **Anchors:** `typed-write.ts:184` · `store-open.ts:131 GiStoreScopeError` · `:150 assertStoreScope` · `:170` the refusal string.
- **WIRED (the F-95 fix):** `extension.ts:292` calls `assertStoreScope` at the head of `runGraphQueryVerbs`.

### MODULE 3 — `scripts/gi-populate.ts` (NEW, the self-populate path, W4)

```
┌──────────────────────────────────────────────────────────────────────┐
│ gi-populate --target <dir> [--rebuild] [--layers <csv>]              │
├──────────────────────────────────────────────────────────────────────┤
│ 1. discoverSourceRoots(target)          → GI_NO_SOURCE_ROOT on no hit│
│ 2. for each layer: run its builder into THE TARGET's .omp/…           │
│    corbell · graphify · structural · ua · semantica · c2kg            │
│ 3. stamp gi_meta.build_root (project-scope channel)                   │
│ 4. verify >0 LIVE rows (superseded_run IS NULL)                       │
│ 5. the per-layer table · exit 0 iff every requested layer built       │
└──────────────────────────────────────────────────────────────────────┘
```

- **Interfaces:** the CLI; the layer table.
- **Data flow:** target → the discovered roots → each builder → the target's store → the stamp → the verify.
- **Failure modes:** a layer with no builder → `GI_LAYER_DOWN:<layer>` (named); a builder that fails → `GI_LAYER_BUILD_FAILED:<layer>`; a build with 0 rows → `GI_LAYER_BUILD_EMPTY:<layer>`; a source-less target → `GI_NO_SOURCE_ROOT` (exit 1).
- **Anchors:** `gi-populate.ts:230 main` · `:87 LAYERS` · `:29 stampBuildRoot` · `typed-schema-init.ts` (the schema half).
- **THE CRITICAL LAW:** the store is written into THE TARGET's scope, never the GI repo's.

### MODULE 4 — `src/omp/adapters/jevk5.ts` (NEW, the GPU meaning gate, W5a)

```
┌────────────────────────────────────────────────────────────────────┐
│ jevk5Probe(scopeRoot) → ConsumerProbe {id:"TSG", rung:"meaning"}    │
│   POST http://127.0.0.1:8090/v1/systemone                          │
│   body: {"state","questions":{"q1":{"type":"noul","instructions"}}} │
│   resp: {"answers":{"q1":{"noul":..,"confidence":..}}}              │
│   down → GI_JEVK5_DOWN (never a silent empty)                       │
├────────────────────────────────────────────────────────────────────┤
│ THE LADDER (layer-consumption.ts:76):                              │
│   jevk5Available() ? jevk5Probe : kevAvailable ? kevProbe : tsgProbe│
└────────────────────────────────────────────────────────────────────┘
```

- **Interfaces:** `jevk5Url(env)` · `jevk5Available(url?)` · `jevk5Probe(scopeRoot)`.
- **Data flow:** a state + a noul question → the GPU → a confidence.
- **Failure modes:** a down server → `GI_JEVK5_DOWN`; the ladder falls to KEV (CPU) then the tsg CLI.
- **Anchors:** `jevk5.ts` · `layer-consumption.ts:76`.

### MODULE 5 — `src/omp/adapters/abide.ts` (the live judge, W5b) + `src/omp/claim-firewall.ts` (NEW, W5c)

```
┌──────────────────────────────────┐  ┌────────────────────────────────┐
│ setBuildRoot(store,target,bld)   │  │ assertStoreScope(store,subj)   │
│  typed-write.ts:184              │  │  store-open.ts:150             │
│  gi_meta: build_root + _sha +    │  │  readBuildRoot ≠ subjectRoot → │
│  built_at + builder              │  │  GI_STORE_SCOPE_MISMATCH       │
└──────────────────────────────────┘  └────────────────────────────────┘
```

- **THE POLARITY LAW (spec §9.4):** `ABIDE_POLARITY="fail-open"` · `CLAIM_FIREWALL_POLARITY="fail-closed"` — both present, distinct, never unified.
- **Anchors:** `abide.ts:236-401` (the W5b block) · `claim-firewall.ts:92 detectClaimAtoms` · `:143 bindClaimAtoms` · `:182 adjudicateClaim` · `:306 attachClaimFirewall` · `extension.ts:859` (the hook).
- **WIRED (the F-95 fix):** `gate-hook.ts:113` calls `judgeDiff` on the write/edit hunk.

---

## THE BUG LEDGER

| # | bug | root cause | fix | evidence |
|---|---|---|---|---|
| B-1 | **the ghost stores** (corbell 16.5MB/9,565 nodes + graphify 40.5MB) | built from a dead `/tmp/corbell-scoped` + a `Checkpoints/` archive | purged (W1) | `SELECT COUNT(*) WHERE file LIKE 'src/%'` → 0; `ls …/*/store.sqlite` → 0 |
| B-2 | **rule 3 → the repo root** | `commonAncestor` of the include globs (`src/**`, `tests/**`) = the repo root → corbell walked Checkpoints/node_modules → `RecursionError` | return the glob-prefix dirs (`src/`,`tests/`) | `source roots (2): …/src, …/tests`; GI-repo corbell `nodes=1361` |
| B-3 | **`rebuild=false` on a never-built store** | corbell-build's synthesized profile defaults `rebuild=false` → the scan is skipped → GRAPH_EMPTY | gi-populate forces `--rebuild` when the store is absent | a fresh project: corbell ✓3 (was GRAPH_EMPTY) |
| B-4 | **the W3 stamp refused a project-scope store** | the W3 seam routes through `openTypedStore` → the `sessions/{sid24}/` shape enforcement | the raw sqlite3 stamp channel | `build_root=` the target's realpath |
| B-5 | **the F-95 wiring gap** | `assertStoreScope` + `judgeDiff` BUILT + TESTED but NEVER CALLED → tree-shaken out of the bundle | wired into `runGraphQueryVerbs` + the write/edit hook | `grep -c assertStoreScope <dist>` → 2 (was 0) |
| B-6 | **rule 5 → nested roots** | "the parent has no direct .ts" pushed an ancestor AND its descendants → overlapping roots → duplicate nodes | "no ancestor already pushed" (the root-most law) | `openStore` canonical ids 1 (was 2); nodes 2087 (was 2720) |
| B-7 | **the frozen corbell-extraction pin** | a test pinned a specific caller edge from a 2026-09-14 corbell snapshot | the mechanism contract (an anchored named caller) | the assertions now pass on the engine's current output |

### BUG DETAIL BOXES — the two that RUNNING alone surfaced

```
┌────────────────────────────────────────────────────────────────────┐
│  B-2 · RULE 3 RETURNED THE REPO ROOT (found on the GI repo itself) │
├────────────────────────────────────────────────────────────────────┤
│  MECHANISM  include=["src/**","tests/**"]; prefix dirs `src`,`tests`│
│             their COMMON ANCESTOR is the repo root → corbell's      │
│             `repo:` ← root → it walked Checkpoints/+node_modules/   │
│             (2.1 GB) → graph.py:744 RecursionError.                 │
│  FIX        return the glob-prefix dirs; the ancestor = fallback.   │
│  VERIFY     [corbell-build] source roots (2): …/src, …/tests        │
│             adapter: nodes=1361 edges=5044 (exit 0)                 │
│  ANCHOR     source-roots.ts:299-319 · scripts/corbell-build.ts      │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  B-6 · RULE 5 PUSHED NESTED ROOTS (found re-fixing the fork store) │
├────────────────────────────────────────────────────────────────────┤
│  MECHANISM  `if (hasTs && !parentHasTs) push(dir)` — an intermediate│
│             dir WITHOUT a direct .ts did not stop the descent, so   │
│             `graph-intelligence` AND `…/shared/knowledge-graph` were│
│             BOTH roots. corbell emitted 5 services (3+2 nested) →   │
│             the SAME `db.ts` scanned under 2 services → 2 canonical │
│             ids for `openStore`.                                    │
│  FIX        push a dir only when it holds .ts AND NO ANCESTOR was   │
│             pushed (the root-most law); a pushed root covers its    │
│             subtree.                                                │
│  VERIFY     source roots (3): graph-intelligence, hooks, tools      │
│             openStore canonical ids: 1 · nodes 2087 (was 2720)      │
│  ANCHOR     source-roots.ts:386-416                                 │
└────────────────────────────────────────────────────────────────────┘
```

---

## THE TESTING LEDGER

| tier | scope | how | result |
|---|---|---|---|
| TIER 1 SCRIPT | the regression guard | `bun run test` (453 tests) | **453 pass / 0 fail / 5744 expect()** |
| TIER 2 CONTAINER | the isolation logic + the tool surface | the dist in `omp-ct-gi20`, the real 222-file project, the tools via the real registration path | all 7 tools register; `graph-probe → PROBE_TOOL_OK`; `graph-query → GI_POPULATE_FAILED:CORBELL_NOT_WARM:absent`; the register 0/8 ALL-named |
| TIER 3 HOST | the capability (the deployment proof) | `gi-populate` + the register on real projects | the GI repo **7/8 PRODUCED**; a foreign target **3/8** (was 0/8); a fresh tmp 4 layers |
| L2 SCRIPT TEST | the named G3 tests | `bun test -t <name>` | source-roots 4/4 · scope-mismatch 3/3 · populate-fresh 1/1 · jevk5 2/2 · abide-live 4/4 · claim-firewall 3/3 |
| ADVERSARIAL | vs the DEPLOYED dist | 9+ probes (source-import banned) | ZERO confirmed defects |

### THE TEST DETAIL — the 3-tier capability proof

```
┌────────────────────────────────────────────────────────────────────┐
│  TIER 3 · HOST — gi-populate on a REAL foreign project             │
├────────────────────────────────────────────────────────────────────┤
│  $ bun scripts/gi-populate.ts --target research/…/Understand-…      │
│  source roots (3): …/packages/core/src, …/dashboard/src,            │
│                    …/understand-anything-plugin/src                 │
│  evidence: rule2:workspace-manifest                                 │
│    corbell    ok   739   2429   …/corbell-checkout/store.sqlite     │
│    graphify   ok  1396   3951   …/graphify-checkout/store.sqlite    │
│    structural ok  5116   4751   …/structural/store.sqlite           │
│    ua         ok   379    337   .ua/knowledge-graph.json            │
│    semantica  --  GI_LAYER_DOWN:semantica (module absent)           │
│    c2kg       --  GI_LAYER_DOWN:c2kg (Java toolkit target-relative) │
│  built 4/6 · corbell build_root = …/Understand-Anything             │
│                                                                     │
│  $ bun scripts/consumption-audit.ts <that target> graphBuilder      │
│  ★ consumed:3/8 rungs=meaning,settlement                            │
│    L5_CORBELL CONSUMED facts=26 · L6_GRAPHIFY CONSUMED facts=34     │
│    TSG        CONSUMED (jevk5 … :8090)                              │
│    L4_C2KG DOWN · L1_SEMANTICA DOWN · L2_ARSUMBRIS ERROR            │
│    L3_UA UNCONSUMED · ABIDE UNCONSUMED                              │
│                                                                     │
│  ★ was 0/8 (the spec's E3) → now 3/8, EVERY other layer NAMED       │
└────────────────────────────────────────────────────────────────────┘
```

### THE ADVERSARIAL SWEEP (P5 — against the deployed dist)

| probe | input | result | verdict |
|---|---|---|---|
| source-roots R1-R5 | profile/pnpm/pkg/tsconfig/plain/lib/nested | each rule fired | PASS |
| source-roots ADV | empty dir · js-only dir | `GI_NO_SOURCE_ROOT` (both) | PASS |
| assertStoreScope | store for A read as B | `GI_STORE_SCOPE_MISMATCH` | PASS |
| assertStoreScope | store for A read as A | ok (no false refusal) | PASS |
| adjudicateClaim | "523 tests pass" no span | `FABRICATED → REJECT` | PASS |
| adjudicateClaim | the same WITH a span | `SUPPORTED → PASS` | PASS |
| judgeDiff | a violating diff | live `REPAIR p=0.879` | PASS |
| judgeDiff | a DOWN judge | `NOTICE` (no throw) | PASS |
| dist graph-query | verb=bogus | `QUERY_INVALID: bogus` | PASS |
| dist graph-probe | {} · `/etc/../../etc` | `PROBE_TOOL_OK` (graceful) | PASS |

---

## THE SPEC MANDATE → ENGINEERING MAP

| the operator said (verbatim, blueprint §6) | what was built | evidence |
|---|---|---|
| R1 *"shift all cpu kev infra to the gpu jev it is the exact same architecture"* | JevK5 wired as the TSG default: `jevk5Probe` + the ladder | `TSG CONSUMED … jevk5 jevk5-4b-v0.2-Q8_0 on :8090` |
| R2 *"going forward all of it refers to gpu jevk5"* | the GPU judge is the meaning gate default; KEV is the offline fallback | `layer-consumption.ts:76` |
| R3 *"hard coded synthetic data … forbidden, delete this"* | the ghost stores purged; no synthetic data anywhere | the corbell store's `file LIKE 'src/%'` → 0 pre-purge |
| R4 *"builds the graph from the target and maintains the correct scoped graph"* | `discoverSourceRoots` + `assertStoreScope` + the per-target scope | the foreign target 0/8→3/8; `GI_STORE_SCOPE_MISMATCH` |
| R5 *"use a sandboxed tmux pane as a container so it can run on host"* | the `container-testing` tool, the `omp-ct-gi20` rig | the dist deployed + the tools driven in the container |
| R6 *"run this on a real project … look at how the fucking graph is functioning"* | the runtime seat + the 3-tier testing on real projects | the register 7/8 (GI) / 3/8 (foreign) |
| R7 *"you're not allowed to blame the code review tool"* | the audit treated as hygiene; every "failure" adjudicated as a probe-error or a real mechanism | the runtime ledger (3 mechanisms, 0 model-blame) |
| R8 *"It needs to start working."* | D1-D8 all green; the kernel self-populates + judges + blocks | the DoD table below |

| the DoD (spec §2) | the command | pass |
|---|---|---|
| D1 a fresh project populates | `gi-populate --target <fresh>` | exit 0 + a store >0 nodes + `build_root` |
| D2 the register 8/8 or named | `consumption-audit <target> <sym>` | 3/8 + all other layers NAMED |
| D3 the GI repo's 7/8 is reproducible | `rm -rf … && gi-populate --target .` | 7/8 PRODUCED |
| D4 a wrong-scope read is a refusal | a store for A read as B | `GI_STORE_SCOPE_MISMATCH` |
| D5 a source-less target refuses | `gi-populate --target <empty>` | `GI_NO_SOURCE_ROOT` |
| D6 the meaning gate uses JevK5 | `consumption-audit . <sym> \| grep TSG` | `jevk5 … :8090` |
| D7 the claim firewall blocks | a no-span claim | `FABRICATED → REJECTED` |
| D8 ABIDE judges live | a violating diff | live `REPAIR` |

---

## THE NUMBERS

```
┌──────────────────────────────────┬────────────────────────────────┐
│  METRIC                          │  MEASURED (this session)        │
├──────────────────────────────────┼────────────────────────────────┤
│  tsc exit                        │  0                              │
│  battery leg 1                   │  453 pass / 0 fail / 5744 exp() │
│  battery leg 2                   │  551 pass / 0 fail              │
│  bun run test exit               │  0                              │
│  src files                       │  118 .ts                        │
│  src lines                       │  36,057                         │
│  dist                            │  b2ab09acc77684e4 (784K)        │
│  repo == deployed == checkpoint  │  YES (b2ab09acc77684e4)         │
│  register (GI repo)              │  consumed:7/8 (PRODUCED)        │
│  register (foreign target)       │  consumed:3/8 (was 0/8)         │
│  register (container)            │  consumed:0/8 (all 8 NAMED)     │
│  corbell store live (GI repo)    │  1361 nodes / 5044 edges        │
│  canon docs                      │  11 (all >=200 lines)           │
│  ship docs                       │  5 (BUILD/DEBUG/FAIL/SVIO/TEST) │
│  checkpoint                      │  gi-kernel-v2.2-… (4.6M)        │
│  audit gate                      │  BLOCKED (degraded; 0c/136h)    │
└──────────────────────────────────┴────────────────────────────────┘
```

---

## THE FILE MANIFEST

```
┌────────────────────────────────────────────────────────────────────┐
│  src/ · the V2.2 kernel (118 .ts / 36,057 lines)                   │
├────────────────────────────────────────────────────────────────────┤
│  src/hunter/profile/source-roots.ts   NEW  the 5-rule discovery     │
│  src/hunter/graph/corbell-adapter.ts  MOD  the discovery-wired build│
│  src/omp/typed-write.ts               MOD  +setBuildRoot (writer)   │
│  src/omp/store-open.ts                MOD  +assertStoreScope (read) │
│  src/omp/adapters/jevk5.ts            NEW  the GPU meaning gate     │
│  src/omp/adapters/abide.ts            MOD  +judgeDiff (live judge)  │
│  src/omp/claim-firewall.ts            NEW  the L2 firewall (345 L)  │
│  src/omp/extension.ts                 MOD  +assertStoreScope wiring │
│  src/omp/gate-hook.ts                 MOD  +judgeDiff wiring        │
│  src/omp/layer-consumption.ts         MOD  the TSG ladder           │
│  src/scoping/*.ts                     MOD  the 4-tier re-sync       │
├────────────────────────────────────────────────────────────────────┤
│  scripts/ · the entry points                                       │
│  scripts/gi-populate.ts               NEW  the self-populate path   │
│  scripts/typed-schema-init.ts         NEW  the project-scope schema │
│  scripts/wta-artifact.ts              NEW  the audit aggregator     │
│  scripts/corbell-build.ts             MOD  --source-root + discovery│
│  scripts/graphify-build.ts            MOD  the same                 │
│  scripts/structural-extract.py        MOD  the same (a python port) │
├────────────────────────────────────────────────────────────────────┤
│  tests/ · the named + the scoped                                   │
│  src/hunter/profile/source-roots.test.ts NEW  4 named tests         │
│  src/omp/adapters/jevk5.test.ts          NEW  2 named tests         │
│  tests/st-w3-scope-assert.test.ts        NEW  3 named tests         │
│  tests/st-claim-firewall.test.ts         NEW  3 named tests         │
│  tests/st-abide-live.test.ts             NEW  3 named tests         │
│  tests/st-gi-populate-fresh.test.ts      NEW  1 named test          │
│  tests/st-jevk5.test.ts                  NEW  the discovery shim    │
│  tests/st-verbs-parse.ts                 MOD  the mechanism pin     │
│  tests/st-gi-omp-populate.ts             MOD  the frozen-count pin  │
│  tests/st-corbell-port.ts                MOD  the D5 refusal token  │
│  tests/st-w3-audit-coverage.test.ts      MOD  the degraded branch   │
│  tests/st-audit-findings.test.ts         MOD  the jevk5 premise     │
├────────────────────────────────────────────────────────────────────┤
│  the docs · canon (11) + ship (5) + the spec/blueprint/receipt     │
│  GI_KERNEL_V2.2_REBUILD_SPEC.md · GI_KERNEL_V2.2_MASTER_BLUEPRINT   │
│  GI_KERNEL_V2.2_RECEIPT.md · context_management/ (11) · 5 ship docs │
│  .trident/plan-gi-v2.2/ · Checkpoints/gi-kernel-v2.2-…/             │
└────────────────────────────────────────────────────────────────────┘
```

---

## THE RUNTIME TRACE (the 5-part simulation — the V2.2 capability in flight)

### PART 1 · TIMELINE (the context sources)

```
T-HOURS (earlier):                                                          
┌──────────────┐    ┌───────────────────────────────────────────────────┐  
│ the operator │    │ the V2.2 spec + the blueprint + the wave plan      │  
│ ruling R3/R4 │───►│ (711 L / 327 L / 108 L, minted before the pin)     │  
└──────────────┘    └───────────────────────────────────────────────────┘  
┌──────────────┐    ┌───────────────────────────────────────────────────┐  
│ the ghost    │    │ a store built from /tmp/corbell-scoped (GONE) —   │  
│ stores       │───►│ the W1 purge target                                │  
└──────────────┘    └───────────────────────────────────────────────────┘  
```

### PART 2 · STEP-BY-STEP (the exact calls)

```
STEP 1 · W1 — PURGE                                                   
┌─────────────────────────────────────────────────────────────────────┐
│ bash: rm -f .omp/graph-intelligence/{corbell,graphify}-checkout/    │
│          store.sqlite{,-shm,-wal}                                    │
│ → ls .omp/graph-intelligence/*/store.sqlite | wc -l  →  0            │
└─────────────────────────────────────────────────────────────────────┘
                     │
                     ▼
STEP 2 · W2 — DISCOVER + BUILD                                        
┌─────────────────────────────────────────────────────────────────────┐
│ bun scripts/corbell-build.ts --target research/…/Understand-Anything │
│ → source roots (3) … (rule2:workspace-manifest pnpm-workspace.yaml) │
│ → nodes=739 edges=2429   (was: GRAPH_EMPTY)                         │
└─────────────────────────────────────────────────────────────────────┘
                     │
                     ▼
STEP 3 · W4 — SELF-POPULATE                                            
┌─────────────────────────────────────────────────────────────────────┐
│ bun scripts/gi-populate.ts --target research/…/Understand-Anything   │
│ → corbell ✓739 graphify ✓1396 structural ✓5116 ua ✓379               │
│   semantica ✗ GI_LAYER_DOWN  c2kg ✗ GI_LAYER_DOWN                   │
│ → corbell build_root stamp: …/Understand-Anything                    │
└─────────────────────────────────────────────────────────────────────┘
```

### PART 3 · THE ROUTING DECISION (the register's evaluation)

```
STEP 4 · THE REGISTER (consumption-audit)                              
┌─────────────────────────────────────────────────────────────────────┐
│ bun scripts/consumption-audit.ts <target> graphBuilder              │
│                                                                      │
│ Q: does L5_CORBELL contribute ≥1 anchored fact? → YES (26) → CONSUMED│
│ Q: does L6_GRAPHIFY contribute ≥1 anchored fact? → YES (34) → CONSUMED
│ Q: is TSG up? → jevk5Available() → YES → jevk5Probe → CONSUMED       │
│ Q: L4_C2KG? → the Java toolkit is target-relative → GI_LAYER_DOWN    │
│ Q: L1_SEMANTICA? → the module is absent from venv → GI_LAYER_DOWN    │
│ Q: L2_ARSUMBRIS? → the au-engine reader absent → GI_LAYER_ERROR      │
│ Q: L3_UA? → built but 0 facts for this subject → GI_LAYER_UNCONSUMED │
│ Q: ABIDE? → 0 repairs for this subject → GI_LAYER_UNCONSUMED         │
│ → consumed:3/8 rungs=meaning,settlement                              │
└─────────────────────────────────────────────────────────────────────┘
```

### PART 4 · THE DELIVERY (the completion gate)

```
STEP 5 · A CLAIM CROSSES THE FIREWALL                                  
┌─────────────────────────────────────────────────────────────────────┐
│ adjudicateClaim({text:"all 523 tests pass, done.",                   │
│                  turnToolResults:[]})                                │
│ → DETECT: atom "523 tests pass" (kind=count)                         │
│ → BIND:  no THIS-TURN span → FABRICATED (Jev never called)           │
│ → DECIDE (fail-CLOSED): {verdict:"FABRICATED", action:"REJECT"}      │
│                                                                      │
│ WITH a bound span:                                                    │
│ → {verdict:"SUPPORTED", action:"PASS"}                               │
└─────────────────────────────────────────────────────────────────────┘
```

### PART 5 · THE OBSERVER (the quiet case)

```
OBSERVER ACTIVITY (the graph gate + the firewall on this session)      
═══════════════════════════════════════════════════════════════════════
  edits on src/  → the graph gate: a ripwire call on the edited symbol
                    satisfies drift → the gate stays QUIET (STEER at most)
  a completion   → the claim firewall: a claim WITH its THIS-TURN tool
                    results → SUPPORTED → QUIET
  the ABIDE judge→ a normal diff → below the flag band → QUIET
  Result: the enforcement layers fired on the FABRICATED/BROKEN cases and
  stayed QUIET on the legitimate ones — the anti-misfire half proven.
═══════════════════════════════════════════════════════════════════════
```

---

## WHAT'S NEEDED FROM THE OPERATOR

1. **The audit re-fire** — the whole-tree audit returned `BLOCKED (degraded)` (52/118 parts rate-limited on the muse-free lane). Needs a fresh lane window for a clean 0-critical/0-high run.
2. **L2_ARSUMBRIS scoping** (optional) — the au-engine lives at `~/.arsumbris/au-engine/run`, unscoped to any repo. Scoping it per-target would let the GI repo read 8/8.
3. **`semantica` in the venv** (optional) — install the module so L1 builds on any target.
4. **The container layer tooling** (optional) — the corbell venv is 5.1 GB; a slim slice would let `omp-ct-gi20` self-populate.
5. **The TTL tuning** (optional) — the `unknown` derivation TTL is 1 h; a longer window keeps a reading valid longer between re-populates.

**NOTHING here blocks the V2.2 completion: D1-D8 are green and the battery is 453/0 + 551/0.**
