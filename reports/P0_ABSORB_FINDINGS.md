# P0 ABSORB — THE 6L+2E BASELINE, RE-MEASURED FIRST-HAND
**Turn:** 2026-09-22 · **Tree:** `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence` (own repo, branch `graph-intelligence`) · **HEAD:** `640da98`
**Method:** every number below is a command run THIS turn. Nothing inherited.

---

## §1 · THE BASELINE (the pin's 7 lines, re-run)

| the pin claimed | re-measured | verdict |
|---|---|---|
| HEAD `640da98` | `640da98 docs(ttsr): ★★★ THE 3-PART INTENT FRAME` | ✅ CONFIRMED |
| repo dist `83eb7bba…` 613,039 B Sep 20 07:11 | `83eb7bba9c5e76db` 613,039 B 2026-09-20 07:11:07 | ✅ CONFIRMED |
| deployed `f9e233be…` 613,000 B Sep 22 20:13 | `f9e233bee9f59a5f` 613,000 B 2026-09-22 20:13:22 | ✅ CONFIRMED |
| 26 src newer · 99 .ts · 31 test files | 26 · 99 · 31 | ✅ CONFIRMED |
| the deployed bundle carries ZERO v2.x symbols | all 6 = 0 | ✅ CONFIRMED |
| register `up=5/11` | ★ NOT REPRODUCED — no `up=` string in src | ⚠ UNVERIFIED |
| rig `omp-ct:master` 4 GB | `988d8bde1f87` 4GB | ✅ CONFIRMED |

**★ THE PIN'S BASELINE IS ACCURATE — AND IT UNDERSTATES THE PROBLEM.**

---

## §2 · ★★★ THE HEADLINE — F-95 IS AN *UNWIRED SOURCE*, NOT A BAD DEPLOY

The pin framed F-95 as *"the deploy diverged"*. **The measurement says something worse and simpler:**

```
$ bun build src/omp/extension.ts --outfile /tmp/gi-fresh.js --target bun --format esm --bundle
Bundled 137 modules in 20ms → 0.62 MB

$ sha256sum /tmp/gi-fresh.js extensions/.../index.js ~/.omp/agent/extensions/.../index.js
3dcb19e3415c8b36  617,830  /tmp/gi-fresh.js            ← a FRESH build from CURRENT source
83eb7bba9c5e76db  613,039  extensions/graph-intelligence/index.js
f9e233bee9f59a5f  613,000  ~/.omp/agent/extensions/graph-intelligence/index.js

$ for s in createSourceFile runKernelV2 kernel-v2 fire-ledger policy-store graph-facts layer-registry; do grep -c $s <each>; done
  FRESH=0 0 0 0 0 0 0      DEPLOYED=0 0 0 0 0 0 0
```
**★ A FRESH BUILD FROM THE CURRENT SOURCE PRODUCES THE SAME ZERO-SYMBOL BUNDLE.**
The 39-byte repo↔deploy difference is cosmetic. **There is no "bad deploy" to revert — the
SOURCE ITSELF produces a bundle with no v2.x code.**

### §2.1 · THE MECHANISM (the wiring truth)
```
$ grep -E "^import" src/omp/extension.ts     → 18 imports
$ for m in calibration enforcement evidence-producer fire-gate fire-ledger graph-facts \
           hard-deps jev kernel-v2 oracle policy-store rsi; do
    grep -c "omp/$m.ts" src/omp/extension.ts; done
  0 0 0 0 0 0 0 0 0 0 0 0     ← ★ ALL TWELVE: ZERO IMPORTS
```
**THE 12 v2.x MODULES ARE UNREACHABLE FROM THE ENTRY POINT.** bun tree-shakes them; the bundle
cannot contain what the graph never reaches. `kernel-v2.ts` (582 L), `hard-deps.ts` (370 L),
`fire-ledger.ts`, `policy-store.ts`, `graph-facts.ts`, `oracle.ts`, `jev.ts`, `rsi.ts`,
`enforcement.ts`, `fire-gate.ts`, `calibration.ts`, `evidence-producer.ts` — **all written, all
orphaned.**

### §2.2 · THE SECOND MECHANISM — the typescript dep is a CLI with no API
```
$ node_modules/typescript/package.json → version 7.0.2, main: NONE, types: NONE,
    bin: { tsc: "bin/tsc" }
$ ls node_modules/typescript/lib/ → tsc.js version.cjs getExePath.js   ← NO typescript.d.ts
```
`typescript@7.0.2` is **Microsoft's Go-native TypeScript** (the tsc CLI). It ships **no
programmatic API**. But the code calls the API:
```
$ grep -rn "from 'typescript'" src/ →  src/hunter/diagnostics/engine.ts:44  import ts from 'typescript'
                                       src/hunter/graph/mechanical.ts:2    import * as tsImport from 'typescript'
$ grep -n "ts.createSourceFile\|ts.isClassDeclaration" …
  engine.ts(519) createSourceFile · mechanical.ts(122) isClassDeclaration
```
**bun resolved `typescript` → `node_modules/typescript/package.js` (an EMPTY stub) and bundled
THAT.** The TS-API calls are dead in the bundle. `bug-hunt → micro-loop-machine → engine.ts`
is a LIVE path (ripwire: `bug-hunt.ts:13` imports `micro-loop-machine`) — so **the bug-hunt tool
has been running with a silently-stubbed parser.**
★ Declared `^7.0.2` since the initial commit `c3db965` (2026-09-15) — **the TS-API path has never
typechecked or run in this tree.** The `5.9.3` API-bearing line was never installed.

---

## §3 · ★ L0 IS RED — 191 TYPE ERRORS (the pin's L0 gate cannot pass)

```
$ bunx tsc --noEmit ; echo $?      →  1
$ grep -c 'error TS' → 191
```
`tsconfig.json` is `strict: true`, `include: ["src/**/*.ts", "tests/**/*.ts"]` — **all 191 are
in scope.**

### §3.1 · THE 6 ROOT CAUSES (191 errors → 6 fixes)
| # | root | errors | the fix |
|---|---|---|---|
| RC-1 | `TxnDb` interface (`typed-write.ts:696`) — `run:(sql,params:unknown[])=>void` vs bun's `Database` | 16 | widen the interface to bun's `SQLQueryBindings` shape |
| RC-2 | `typescript@7.0.2` — the API import resolves to `lib/version` | **73** | pin `typescript@5.9.3` (or vendor the API) |
| RC-3 | bun:sqlite `row` typed `unknown` (TS18046) | 41 | the query generics (`db.query<Row,T>(…)`) |
| RC-4 | `?w1fd`/`?w3`/`?w3chain` query-suffixed imports (TS2307) | 4 | declare the module pattern or drop the suffix |
| RC-5 | duplicate identifier (`st-gi-w44-highs.test.ts`) | 10 | a double import |
| RC-6 | assorted (TS2339/2694/2300/…) | ~47 | per-file, post-RC-1..5 |
**★ RC-2 + RC-3 + RC-1 = 130 of 191. Five edits retire two-thirds of the red.**

---

## §4 · THE BATTERY IS UN-SCOPED (a second L0-class defect)
```
$ bun test        →  scans research/graph-infra-repos/**  →  Cannot find module 'elkjs' ·
                     Cannot find package 'graphology'  →  TIMEOUT at 300 s
$ cat package.json →  "test:all": "bun test <8 named files> --timeout 120000"
```
Bare `bun test` walks the **vendored third-party repos** under `research/` and dies.
**The sanctioned battery is `bun run test:all` (8 files).** Any "the battery is green" claim
that ran bare `bun test` measured the wrong tree.

---

## §5 · THE SUBSTRATE + THE GRAPH (A-0's evidence, measured)
```
$ ripwire for src/omp/extension.ts   (via the gi-link symlink)
  root=.../gi-link   at=640da9834+dirty   graph_ambiguous=734  graph_unresolved=5957  graph_unindexed=203
```
★ **THE GRAPH'S TOP HITS FOR `src/omp/extension.ts` ARE ALL `Checkpoints/` COPIES**
(`Checkpoints/gi-gatefail-pre-V20-ee122880/src/omp/extension.ts` ranks #3). **The store indexes
the archive.** A-0's "Checkpoints excluded" gate is confirmed necessary by the live graph.
★ **`ripwire` is cwd-confined** (`RIPWIRE_PATH_DENIED` on the absolute GI path) — it resolves
through the pre-existing `gi-link` symlink in the cwd worktree. **Use `path=gi-link` for every
structural query in this build.**

---

## §6 · ★ THE PIN CORRECTION (what W0 + the wiring waves must change)

1. **W0 IS MANDATORY AND PRECEDES EVERYTHING.** The pin's P2 preflight has no L0 requirement;
   the tree is red. **Add W0 — green the tree** (RC-1..RC-6, tsc exit 0, the scoped battery) as
   the gate before A-0.
2. **★ THE WIRING GAP IS THE CENTRAL DEFECT, AND THE WAVE-PLAN'S FILE SETS MISS IT.** The plan
   gives B-1..B-6 one adapter file each and puts the only `extension.ts` edit in D-2. **If the
   registry (B-1's `layer-registry.ts`) must import 6 adapters that do not exist yet (parallel),
   the parallelism is impossible — and if nothing imports the adapters, F-95 RECURS EXACTLY.**
   **THE FIX: D-2 imports all 6 adapters + the 2 kernels directly into `extension.ts`.** The
   adapters stay disjoint (each its own file); the SINGLE wiring point is D-2.
3. **THE BUILD COMMAND IS NAMED** (it was absent from the plan):
   `bun build src/omp/extension.ts --outfile extensions/graph-intelligence/index.js --target bun --format esm --bundle`
4. **THE DIST-CONTENT GATE MUST RUN ON THE FRESH BUILD, not the deployed copy** — because the
   fresh build is the thing that proves the wiring. (Measured: fresh build == deployed, both 0.)
5. **`typescript` must be pinned to an API-bearing version** or the bug-hunt parser stays stubbed
   (RC-2 is a RUNTIME defect, not a type-only one).

---

## §7 · THE HONEST GAPS
- `up=5/11` — not reproduced from source; the register's report string was not located this turn.
  **OPEN** (owner: the D-1 wave).
- The 6 layer adapters do not exist (`src/omp/adapters/` is absent) — B-1..B-6 are greenfield.
- The container rig `omp-ct:master` is confirmed present but was not booted this turn.
- The 39-byte repo↔deploy delta was not diffed byte-for-byte (moot: the fresh build is the truth).
