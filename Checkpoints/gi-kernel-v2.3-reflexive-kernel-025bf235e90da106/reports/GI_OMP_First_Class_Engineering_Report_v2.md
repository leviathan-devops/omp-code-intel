# GI-OMP FIRST CLASS — ENGINEERING REPORT v2
**Series:** GI_OMP_First_Class (accuracy + optimize loop on the OMP session-scoped port; the parent/base series is MiMoCode Graph_Intelligence v1.4.3 fork-v143; v1 covered W0–W7 first-class wiring PASS)
**Project:** GI-OMP
**Date:** 2026-09-14
**Author:** Trident Agent
**Baseline:** `fork-v143/live-tree` 249 files @ seal sha16 `63247bff8e2baf8f` (workspace git `v4.7` @ `f895e00` is a parent dirty tree, not a GI-OMP commit)
**Commit:** none for this series (uncommitted product tree under `/home/leviathan/JARVIS_WORKSPACE/OMP/Graph_Intelligence`)
**Container:** `gi-omp-w7` (RUNNING, tmux UP, this turn) · **Image:** `runtime-grade-container-sandbox:master`

## ONE-PARAGRAPH SUMMARY

GI-OMP v2 is the accuracy-and-optimize pass over the v1 first-class wiring: the OMP `parseExports` recall went 0.366 → 1.000 by porting the fork's GG-BUG-2 v2 EXPORTED-NAME semantics, a two-pass mechanical populate now indexes the 238-file live tree into the per-session sqlite (2035 nodes / 1857 edges / 0 dangling dst, frozen in-tree at `.omp/accuracy-store-v11.sqlite`), three fork query verbs went from stubs to live (`who-calls` macro-P 0.523/R 0.568 all-label and 0.982/0.568 fn-only vs ripwire `--callers` ground truth, `blast-radius rows=135 root=openStore depth=6` in TUI, `would-break` honest `argsUnknown`), plus `chain` (rows=1 runQueryTool→runQuery, TUI-closed), `unwired` (1259 host), and `bug-hunt status` (`state=done findingsCount=1183 fixOrderCount=20`, TUI-closed) — while populate cost fell 24.6s → 0.5s (49x, single-transaction batch), the EN-38 129MiB `GRAPHIFY_GRAPH_TOO_LARGE` guard was ported with ST proof, T-8 closed (code-retrieval skill is now four-engine), and v13 dists (`gi 1c3747e3` / trident `d7c83ab9`) are deployed, SHA-verified in-container, and TUI-re-verified (who-calls rows=6, no new `GI_QUERY_FAIL`). What it is not: corbell is proven working standalone (1949 methods / 9387 edges / 41s) but is NOT in the OMP loop; graphify is fork-only with a degraded MCP path; the 6-phase hunter machine is NOT ported (status is a read-only unwired census); `gi-audit` is still a loud stub; and the container still runs zhipu/GLM while the operator has now ruled opencode-go + muse-1.3-contributor ONLY with the two key-pool boilerplates — that rewire is specified but not yet executed.

## THE LIFECYCLE MAP (ASCII)

```
┌──────────────────────────────────────────────────────────────┐
│ B0  baseline: recall 0.366, stubs, no populate               │
└──────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ B1  port fork parser GG-BUG-2 -> recall 1.000                │
└──────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ B2  fork-schema DDL + populate 1940n/1460e                   │
└──────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ B3  bare-call + caller labels P 0.499/R 0.568                │
└──────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ B4  spec resolve + def-skip P 0.523/R 0.568                  │
└──────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ B5  star-merge + scope check: 0 dangling dst                 │
└──────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ B6  batch write: 24.6s -> 0.5s (49x), R4-R7                  │
└──────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ B7  chain/unwired/hunt LIVE, T-8 four-engine                 │
└──────────────────────────────────────────────────────────────┘
```

Ruler: width-62 boxes (64-char lines), `▼` at column 32, cap-76 pass (mechanically verified this turn).

## THE ARCHITECTURE

### 1. gate-middleware — parser + gate (128 lines)

```
┌──────────────────────────────────────────────────────────────┐
│ MODULE: gate-middleware (parser + OFF/STEER/FULL)             │
│ IN:  source text -> parseExports / parseExportSites          │
│ OUT: names[] + {name, line}[] anchored declarations          │
│ CONST: GG-BUG-2 trio (PARSE + BRACES + DEFAULT)              │
│ FAIL: FULL strip -> GRAPH_GATE_SIGNATURE_BREAK + cancel      │
└──────────────────────────────────────────────────────────────┘
```

Interfaces: `parseExports(src: string): string[]` (`src/omp/gate-middleware.ts:16-35`, read this turn) implements fork GG-BUG-2 v2 semantics — `EXPORT_PARSE_RE` (declaration: function/const/class/let/var/type/interface/enum), `EXPORT_BRACES_RE` (`export { a as b }` yields the ALIAS), `EXPORT_DEFAULT_RE` (yields `'default'`). `parseExportSites` (appended B6, same file) returns `{name, line}[]` with 1-based declaration lines for fork-schema `typed_nodes.line` parity. `runGraphGate` (lines 66-91, prior read) resolves OFF/STEER/FULL with `GI_NO_STORE` fail-open. Data flow: write/edit tool input → old/new text diff → removed-export set → dial verdict. Failure: FULL cancel throws `GRAPH_GATE_SIGNATURE_BREAK` with `removed=` advisory (proven S3/B5 on both containers, v1 artifact). Calibration constants: the three regexes verbatim from fork `graph-gate.ts:146-151`; recall measured 1.000 (1637 nodes, 0 missed over 238 files) vs 0.366 baseline (564/1542, 906 missed).

### 2. typed-write — fork-schema store + verbs + EN-38 guard (358 lines)

```
┌──────────────────────────────────────────────────────────────┐
│ MODULE: typed-write (DDL + verbs + guard + batch)            │
│ TABLES: typed_nodes / typed_edges + 6 indexes                │
│ VERBS: whoCalls / blastRadius / wouldBreak / chain / unwired │
│ GUARD: parseGraphJsonGuarded 128MiB (EN-38 port)              │
│ WRITE: single inserts + R2 batch (one connection)            │
└──────────────────────────────────────────────────────────────┘
```

DDL (`src/omp/typed-write.ts:20-47`, read this turn): fork `TYPED_GRAPH_DDL` subset — nodes carry `canonical_id/kind/label/file/line/created_run/superseded_run`, edges carry `src_canonical/dst_canonical/predicate/evidence_quote/confidence/created_run/superseded_run`, six indexes (`idx_tn_canonical/label/file`, `idx_te_src/dst/pred`). Verbs read this turn (`typed-write.ts:160-241` plus R5 appends): `whoCalls` (fork query-tool.ts:177-194 JOIN, returns caller rows not self rows), `blastRadius` (fork :415-458 recursive CTE, default depth 8), `wouldBreak` (fork :460-492, honest `argsUnknown: true`), `chainCalls` (fork :200-243 BFS, MAX_DEPTH 64), `unwiredNodes` (fork :283-302 NOT-EXISTS). EN-38 guard (appended this turn, lines ~16-29): `GRAPH_LOAD_BUDGET_BYTES = 128*1024*1024`, `GRAPH_PARSE_YIELD_BYTES = 8*1024*1024`, `parseGraphJsonGuarded` throws byte-identical `GRAPHIFY_GRAPH_TOO_LARGE` message. Batch writers `insertForkNodesBatch/insertForkEdgesBatch` (R2) share one connection under `BEGIN IMMEDIATE`. Failure modes: `GI_STORE_CORRUPT` on bad sqlite magic (ST PROVEN); supersede-on-rerun via `superseded_run` (no clobber); stale `insertTypedNode` legacy writer kept for isolate/refuse ST compat.

### 3. populate — two-pass mechanical indexer (256 lines)

```
┌──────────────────────────────────────────────────────────────┐
│ MODULE: populate (collect, then ONE transaction)             │
│ PASS 1: contents + label index + star/type merges            │
│ PASS 2: nodes/edges arrays -> single BEGIN/COMMIT            │
│ SCANS: imports + bindings + bare-call (caller labels)        │
│ CONST: POPULATE_FILE_BUDGET = 1000                           │
└──────────────────────────────────────────────────────────────┘
```

`populateSessionStore` (`src/omp/populate.ts`, 256 lines): PASS 1 reads all files into `contents`, builds `labelIndex` (export name → canonicals), merges `export *` targets (star-merge) and `export type {}` re-exports; PASS 2 emits File nodes, Function nodes (with R4 declaration lines), `imports` edges (relative specs only, resolved against `contents`), `calls` edges from named bindings (spec-resolved + declaration scope-checked) and the bare-call scan (label-index resolution, enclosing-exported-function caller attribution, def-site skip). Contract laws enforced in code: package-spec skip (no `node:child_process` ghosts), declaration scope check (killed the `V5_CONFIDENCE_FLOOR` phantom — used-but-never-declared), 0 dangling dst verified (`SELECT COUNT(*) ... LEFT JOIN ... IS NULL` = 0). R2: collect-then-`BEGIN IMMEDIATE` batch cut populate 24.6s → 0.5s (49x) with frozen counts 2035/1857. Failure: `POPULATE_FILE_BUDGET = 1000` caps collection; unreadable files skipped with continue.

### 4. extension — tool surface (175 lines)

```
┌──────────────────────────────────────────────────────────────┐
│ MODULE: extension (4 tools, live verbs, live hunt)           │
│ graph-query: 5 live verbs (who/ blast/break/chain/unwired)   │
│ graph-probe: PROBE_TOOL_OK + env-gated wipe                  │
│ bug-hunt: status = unwired census + fix order (R6)           │
│ gi-audit: GI_AUDIT_NOT_WIRED (sole remaining stub)           │
└──────────────────────────────────────────────────────────────┘
```

`registerGiOmpTools` (`src/omp/extension.ts`, 175 lines; verb block lines 70-112 read this turn): `scopeRoot` from `cwdOf(ctx)` (the TUI-found `cwd-not-defined` fix — line 83), populate-on-first-query when `countTypedNodes === 0` (lines 86-87), verb dispatch who-calls/blast-radius/would-break/unwired/chain with tool-result-bound tokens (`rows=`, `callers=`, `state=done`). `bug-hunt status` returns `state=done findingsCount= fixOrderCount=` over the session store (read-only; the 6-phase machine is NOT ported — only `surface/query-tool.ts` + `hunt-lock.ts` are portable per scout table). `gi-audit` still returns `GI_AUDIT_NOT_WIRED` — the one honest stub left. `graph-probe action=wipe` stays env-gated (`GI_CLEAR_REFUSED`).

### 5. Session + registry (182 lines, unchanged v2)

`store-open.ts` (60) + `gi-registry.ts` (122) + `src/scoping/*` (768): session store path, `GI_SCOPE_REFUSED` caller check, WAL registry UPSERT, `GI_OMP_DB_DIR` chain, wipe gate. Untouched this loop; ST PROVEN in battery.

### 6. Adjacent systems (NOT ported — functionality report)

| System | live-test result this turn | functional? | in OMP loop? |
|---|---|---|---|
| corbell CLI | `graph build --methods` on 238-file tree: **1949 methods / 9387 edges / 41.4s wall** (5.1MB sqlite: `graph_nodes` 2021, `graph_edges` 9387); standalone tree-sitter parse proven OK | yes, once configured | NO |
| corbell config | two footguns hit live: `workspace.yaml` `repo:` resolves under `config_dir/` (wrote `../live-tree`, not `./live-tree`); `version: 1` (int) fails pydantic (needs `"1"`) | works with correct config | n/a |
| corbell TS detection | "Tree-sitter ✗ not installed" is a MISLEADING label — the real cause both times was config (0 files scanned); venv has tree-sitter 0.26.0 + TS grammar, `_get_ts_parser('typescript')` returns a live Parser | yes | n/a |
| graphify (fork) | MCP path degraded without SDK (`GRAPHIFY_MCP_UNAVAILABLE`); EN-38 guard (128MiB + 8MiB yield) ported to OMP with ST proof | fork-only, degraded MCP | guard only |
| bug-hunter machine | 17-file import map: zero `@mimo-ai/plugin` in scope; 3 `@opencode-ai/plugin` sites all in `tools/`; portable subset = `surface/query-tool.ts` alone | machine not portable | status verb only |
| OMP populate (replacement) | 238 files → 2035/1857/0-dangling in 0.5s host | yes | YES |

## THE BUG LEDGER

| # | bug | root cause | fix | evidence |
|---|---|---|---|---|
| C1 | `GI_QUERY_FAIL: ReferenceError: cwd is not defined` in TUI | `extension.ts` used bare `cwd`; host ST passes `cwdOf` stub so never caught | `scopeRoot` from `cwdOf(ctx)` (line 83) | TUI stream: 9 `GI_QUERY_FAIL` / 17 `ReferenceError` (all pre-fix); post-fix `rows=6`, zero new hits |
| C2 | OMP recall 0.366 | function-only regex missed const/class/type/braces/default | GG-BUG-2 trio port | 564/1542 → 1637/0 on 238 files |
| C3 | 144 dangling dst (v6 store) | package-spec + phantom + unresolved bindings | relative-only + declaration scope check + star-merge | v11 store: 0 dangling |
| C4 | populate 24.6s | 3890 open/close sqlite cycles | R2 single-transaction batch | 0.5s (49x), counts frozen |
| C5 | frozen ST red (1940 vs 2035) | expectation predated star-merge growth | updated to 2035/1857 this turn | populate ST 4/4 |
| C6 | container CT `check` cursor misses real tokens | cursor offset lags stream writes | direct stream grep fallback | blast 14 hits via grep vs NO MATCH via check |
| C7 | corbell "Tree-sitter ✗" (2 occurrences) | mislabeled: real causes were repo-path + version-type config errors | corrected config; documented | 1949/9387 build |
| C8 | `void 0` / dup-declaration / doubled-loop edit collisions | overlapping edit ranges during fast iteration | repaired + ST green after each | battery green at every checkpoint |

### C1 detail — the ctx-class bug host ST cannot catch

The TUI agent called `graph-query verb=who-calls`; the tool threw `GI_QUERY_FAIL: ReferenceError: cwd is not defined` (9 occurrences in `/tmp/tui-stream.txt`). Mechanism: `execute` referenced a `cwd` binding that exists only in the ST stub harness (`registerGiOmpTools(pi, () => "/tmp")` injects it; the real `cwdOf(ctx)` call was never wired into the query path). Host ST passed because the stub's closure supplied what production `ctx` did not. Fix: `const scopeRoot = cwdOf(...)` at `extension.ts:83`, used for both `openSessionStore` and `populateSessionStore`. Verification: post-14:28-UTC bounce, `who-calls runQuery rows=6` in tool result, zero new `GI_QUERY_FAIL` in stream. Standing law (runbook): every new tool path gets a TUI turn — host ST is blind to the ctx class.

## THE TESTING LEDGER

Host command re-ran this turn (verbatim):

```
bun test v1.4.2 (744846f84)

 25 pass
 0 fail
 65 expect() calls
Ran 25 tests across 7 files. [180.00ms]
```

(The 7 fast files; populate ST separately: `4 pass / 0 fail / 13 expect`, ~79s, needs `--timeout 120000`. Total: **29 pass / 0 fail / 78 expect across 8 files.**)

| test | scope | how | result |
|---|---|---|---|
| st-gi-omp-scope (113) | T-1/AP-1/AP-2 | bun | in 25/25 |
| st-gi-omp-refuse (63) | T-3 | bun | in 25/25 |
| st-gi-omp-wipe (52) | AP-8 | bun | in 25/25 |
| st-gi-omp-tools (60) | names + wipe + chain + hunt | bun | 4/4 incl. `rows=1` chain + `state=done` hunt |
| st-gi-omp-isolate (32) | WAVE 3 | bun | in 25/25 |
| st-gi-omp-gate (48) | FULL/STEER/OFF/NO_STORE | bun | in 25/25 |
| st-gi-omp-corrupt (47) | CORRUPT + **EN-38 129MiB guard** | bun | PASS `GRAPHIFY_GRAPH_TOO_LARGE`, under-budget parses |
| st-gi-omp-populate (90) | recall 1.000 + frozen 2035/1857 + verbs | bun, long timeout | 4/4 |
| TUI who-calls (v13) | scopeRoot fix | live turn, GLM | PASS `rows=6` |
| TUI blast (v6 store) | blast-radius | stream grep | `rows=135 root=openStore depth=6` ×14 |
| TUI chain (v13) | chain verb | stream grep | `rows=1` runQueryTool→runQuery |
| TUI hunt (v13) | bug-hunt status | stream grep | `state=done findingsCount=1183 fixOrderCount=20`, stub never fired |
| TUI QUERY_INVALID | adversarial | check MATCH@1039747 | PASS |
| corbell TS build | adjacent capability | CLI timed | 1949 methods / 9387 edges / 41.4s |
| ripwire map | ground-truth cost | CLI timed | 238 files / 0.27s / 22668 B top-200 |
| tsc / lint | n/a | not invoked | NOT RUN |

Regression sweep: every checkpoint ran the fast battery green (22→23→25 as tests were added); populate ST red once (E1, stale expectation — fixed, not weakened); container tokens re-verified after each dist redeploy.

## THE SPEC MANDATE → ENGINEERING MAP

| the operator said | what was built | evidence |
|---|---|---|
| Test graph + bug-hunter, baseline accuracy + runtime | 8-symbol ripwire-ground-truth protocol, frozen store + JSON | `.omp/BASELINE-2026-09-14.json`, `.omp/accuracy-store-v11.sqlite` (2035/1857/0-dangling, verified this turn) |
| Debug→optimize loop in container, 8h pipeline | runbook R1–R8 + watchdog `gi-overnight-8h`; R1–R7 executed, R8 is this report | `.omp/OVERNIGHT-LOOP-2026-09-14.md`; build log R-entries |
| Pending map "should all be done" | frozen counts ✓, dists rebuilt+redeployed+SHA-verified ✓, SC-11 ✓ (ST proof), T-8 ✓ (four-engine), R2–R7 ✓; R8 = this report | ST 25/25 + 4/4; SHAs `1c3747e3`/`d7c83ab9`; skill grep `graph-query` ×8 |
| Quota chain → the two boilerplates; go-only muse-1.3-cont | host config ALREADY pins `task/smol/default: opencode-go/muse-spark-1.3-contributor` (`~/.omp/agent/config.yml:2-5`, read this turn); boilerplates inventoried (§14) | config lines; directive recorded as standing order below |
| SC-11 129MiB guard | `parseGraphJsonGuarded` + budget consts + ST | `typed-write.ts` guard block; corrupt ST 2/2 |
| DPL1 T-8 (from v1, carried) | code-retrieval skill four-engine: branch, role row, physics, activation | 8 `graph-query` hits, zero `three`-engine stale refs |
| DPL1 SC-1..SC-14, T-1..T-10 | v1 PASS stands; v2 extends verbs/populate (scope "everything") | v1 report + this report |

## THE NUMBERS

```
┌──────────────────────────────────────────────────────────────┐
│ recall 0.366 -> 1.000 (1637 nodes, 0 missed)                 │
│ populate 238f: 2035n / 1857e / 0 dangling                    │
│ macro-P 0.523 / R 0.568 (all-label, 8 sym)                   │
│ fn-only P 0.982 / R 0.568 (R7 dual-label)                    │
│ populate 24.6s -> 0.5s (49x, R2 batch)                       │
│ corbell TS: 1949 methods / 9387 edges / 41s                  │
│ query p50 0.2ms host (who-calls)                             │
│ ST 23/23 (61 exp) + tools 4/4 + pop 4/4                      │
│ TUI rows=6 / rows=135 / rows=1 / 1183                        │
│ v13 gi 1c3747e3 / trident d7c83ab9                           │
└──────────────────────────────────────────────────────────────┘
```

(Ruler-verified this turn: width-62 boxes. ST line now reads 25/25 fast + populate 4/4 = 29 total; the box's `23/23` row is the pre-tools-growth count — corrected here: fast battery re-ran **25 pass / 65 expect** this turn.)

Per-file lines (this turn, `wc -l`): extension 175, gate-hook 106, gate-middleware 128, gi-registry 122, populate 256, store-open 60, typed-write 358 (omp 1205); scoping 768; tests 505 (8 files); v1 report 334 lines.

## THE FILE MANIFEST (ASCII tree)

```
Graph_Intelligence/                        product tree
├── src/omp/                               1205 lines (MODIFIED v2)
│   ├── extension.ts          175          5 live verbs + hunt status
│   ├── typed-write.ts        358          DDL + 5 verbs + EN-38 + batch
│   ├── populate.ts           256          NEW v2 (2-pass indexer)
│   ├── gate-middleware.ts    128          GG-BUG-2 parser + sites (R4)
│   ├── gate-hook.ts          106          (unchanged v2)
│   ├── gi-registry.ts        122          (unchanged v2)
│   └── store-open.ts          60          (unchanged v2)
├── src/scoping/                768        (unchanged v2)
├── tests/                      505        8 files (MODIFIED: tools+corrupt+populate)
├── extensions/graph-intelligence/
│   ├── extension.js  38.4KB              v13 bundle (sha16 1c3747e3)
│   └── index.js      38.4KB              synced copy
├── .omp/accuracy-store-v11.sqlite 1.7MB   NEW (2035/1857/0-dangling)
├── .omp/BASELINE-2026-09-14.json          MODIFIED (v13 + R7 + T8 blocks)
├── context_management/RUNNING_BUILD_LOG.md MODIFIED (+2 R-entries)
├── reports/GI_OMP_First_Class_Engineering_Report_v1.md  EXISTING
└── reports/GI_OMP_First_Class_Engineering_Report_v2.md  NEW (this file)

HOST WIRE (outside tree):
~/.omp/agent/extensions/graph-intelligence/index.js  v13 (1c3747e3)
~/.omp/agent/extensions/trident-omp/dist.js          v13 (d7c83ab9, 14.62MB)
~/.omp/agent/skills/code-retrieval/SKILL.md          MODIFIED (T-8 four-engine)
```

## WHAT'S NEEDED FROM THE OPERATOR

1. **Standing model order recorded (your ruling): opencode-go + `muse-spark-1.3-contributor` ONLY, NEVER any other model.** Host config already pins it (`~/.omp/agent/config.yml:2-5`). Container `gi-omp-w7` currently runs `zhipu-coding-plan/glm-5.3-flash` (its config has no go keys: `env | grep OPENCODE_GO_API_KEY` = 0 in-container).
2. **P0 decision — key material for the container.** To honor (1) in-container: inject go keys via `GO_KEYS_JSON` env (the go-key-pool env-injection contract — keys never in files/logs) and set container `modelRoles.default: opencode-go/muse-spark-1.3-contributor`; or rule that TUI verification stays on free providers while host-side work pins go/1.3. I will not move key material without your explicit go — AP-4.
3. **Key-pool wiring (when you approve 2):** port `go-key-pool.ts` + `provider-chain.ts` (single-logical-rung law, `assertSingleProviderChain`, credential-binding §12 pin-per-session) into the trident-omp provider path; free-key-pipeline stays OUT (go-only per your ruling).
4. **Remaining stub (accepted):** `gi-audit` → `GI_AUDIT_NOT_WIRED`. The R0–R16 engine is a separate port; say the word if it joins the loop.
5. **R3 deferred honestly:** method/constructor call-site attribution (3638 method-style names vs 20377 bare occurrences measured) is NOT implemented — the bare-call lookbehind excludes `obj.foo(`. Ripwire covers this class today; the four-engine skill routes accordingly.
6. **No P0 blockers on the built surface.** ST 25/25 + 4/4, TUI tokens on v13, artifacts frozen. The loop resumes at R8-closeout whenever you call it.

Tried and rejected (do not reopen): corbell-in-the-OMP-loop (41s + config fragility vs 0.5s mechanical populate); JSON session maps; shared project stores; re-enabling Poseidon `runBefore`; treating bun green as WAVE 4; free-provider chains for this project (your go-only ruling).
