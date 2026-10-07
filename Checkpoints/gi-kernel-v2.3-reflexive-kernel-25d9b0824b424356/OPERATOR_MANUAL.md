# GRAPH INTELLIGENCE (GI-OMP) — THE OPERATOR MANUAL

```
┌──────────────────────────────────────────────────────────────────────────┐
│  MACHINERY   the deployed GI-OMP extension + its 6 graph layers + 2 Jev  │
│              kernels, exposed to an OMP session as first-class tools     │
│  DEPLOYED    ~/.omp/agent/extensions/graph-intelligence/index.js         │
│              sha256 b2ab09acc77684e4…  784 KB                            │
│  WIRED AT    ~/.omp/agent/config.yml:12  (host scope — every session)    │
│  REPO        /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/          │
│              Graph_Intelligence   (branch jarvis/gi-main)                │
│  YOUR JOB    stop guessing about code you have not read yet              │
└──────────────────────────────────────────────────────────────────────────┘
```

**THE ONE OUTCOME.** Answer a structural question about a codebase — *who calls this, what
breaks if I change it, is this even reachable, is this wired* — in seconds, from a command,
instead of by reading files and guessing.

**WHERE THE OTHER ANSWERS LIVE — read these, do not re-derive them here.**

| the question | the document |
|---|---|
| WHY is it designed this way? | `GI_KERNEL_V2.2_MASTER_BLUEPRINT.md` · `GI_AUTO_INTELLIGENCE_AND_LSP_BLUEPRINT.md` |
| WHAT is true about it? | `reports/GI_Kernel_V2_Engineering_Report_v2.md` · `GI_KERNEL_V2.2_RECEIPT.md` · `context_management/` |
| WHAT must it do? | `GI_KERNEL_V2.2_REBUILD_SPEC.md` |
| **HOW do I USE it?** | **THIS MANUAL** |

**PATHS USED BELOW.** `$GI` is the repo path from the box above. Every command in §4 was executed
on this host on 2026-09-28 against a scratch project; §5 carries the real output of each.

---

## §1 · WHAT THIS IS FOR

### 1.1 THE FOUR JOBS IT DOES

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │ JOB 1  BEFORE YOU EDIT A SYMBOL                                        │
  │        ask who calls it and what a change reaches.                     │
  │        YOU TYPE:  graph-query verb=who-calls target=<SYM>              │
  │                   graph-query verb=impact    target=<SYM>              │
  ├────────────────────────────────────────────────────────────────────────┤
  │ JOB 2  BEFORE YOU DELETE ANYTHING                                      │
  │        ask for the delete verdict, not a vibe.                         │
  │        YOU TYPE:  graph-query verb=safe-delete target=<SYM>            │
  ├────────────────────────────────────────────────────────────────────────┤
  │ JOB 3  WHEN YOU DO NOT KNOW THE TREE                                   │
  │        get the structural map of the working directory.                │
  │        YOU TYPE:  ripwire verb=map                                     │
  │                   ripwire verb=for target="<what you are looking for>" │
  ├────────────────────────────────────────────────────────────────────────┤
  │ JOB 4  WHEN YOU MUST KNOW IF A THING IS REALLY LIVE                    │
  │        ask the layers what they know, and grep the DEPLOYED artifact.  │
  │        YOU TYPE:  gi-consumption subject=<SYM>                         │
  │                   grep -c <SYM> <the deployed bundle>                  │
  └────────────────────────────────────────────────────────────────────────┘
```

### 1.2 THE MENTAL FRAMEWORKS — READ THESE, THEY ARE THE WHOLE VALUE

**F-1 · QUERY BEFORE YOU EDIT.** Every blind edit is a bet that you already know the callers.
You do not. Run `who-calls` or `impact` on the symbol first; a query costs seconds, an unqueried
refactor costs a debugging session. This is the single habit that makes GI worth loading.

**F-2 · THE GRAPH ANSWERS IN UNDER A SECOND WHAT READING GUESSES AT IN A MINUTE.** A caller set,
a blast radius, a delete verdict, a reachability answer — one command each. Use it for exactly
those four shapes; do not use it to read a file you can read.

**F-3 · THREE TOOLS, THREE QUESTIONS — NEVER SUBSTITUTE ONE FOR ANOTHER.**

```
┌───────────┬────────────────────────────────────────┬────────────────────┐
│ TOOL      │ ANSWERS                                │ USE WHEN           │
├───────────┼────────────────────────────────────────┼────────────────────┤
│ ripwire   │ the structural map of the tree you are │ you need callers,  │
│           │ standing in — no graph store required  │ radius, orientation│
│ graph-    │ typed facts from a POPULATED store —   │ you need the       │
│ query     │ callers, radius, delete, verify, gate  │ store's verdict    │
│ grep      │ this exact literal string, right now   │ the target is a    │
│           │                                        │ STRING, not a shape│
└───────────┴────────────────────────────────────────┴────────────────────┘
```

**F-4 · A ZERO RESULT IS NOT AN ANSWER.** `rows=0` means *this store, this spelling, this scope
found nothing* — not *nothing exists*. Before you believe a zero, read the cross-check line that
rides under it: `ripwire: ...` names the live-tree answer. When the store says 0 and ripwire names
a caller, believe ripwire — the cause is a wrong spelling OR a symbol whose name collides with a
library/runtime name, so its edges never entered the store. Both are measured in §10 TRAP-1.

**F-5 · "IS THIS WIRED" IS A QUESTION ABOUT THE ARTIFACT, NOT THE SOURCE.** A symbol can exist in
`src/` and be absent from the thing that runs. Grep the DEPLOYED bundle for the symbol's name; a
count of 0 means the runtime does not contain it.

**F-6 · WHEN NOT TO REACH FOR GI.** A one-file read: read the file. A literal string: grep. A
question about git history: not this. GI is for structure — callers, reach, wiring, deletion.

### 1.3 DO NOT USE THIS FOR (the negative triggers)

- You want to read one file's contents. → `read`.
- You want a literal string anywhere. → `grep`.
- You want a symbol definition or a history across a standing index. → the `opengrok` tool.
- You want the code to be REVIEWED for defects. → the audit tools; §A-16 is one entry point, not
  a substitute for review.
- You want the graph to keep itself current. → it does not; see §9 LIMIT-1 and §A-17.
- You are working on a tree you cannot `cd` into or name with an absolute path. → §9 LIMIT-4.

---

## §2 · BEFORE YOU START

Tick every box. Each one is a command, not a feeling.

```
□ P-1  THE TOOLS ARE MOUNTED
       graph-probe   →  PROBE_TOOL_OK
       CHECK: ask the session for graph-probe. If it is absent, confirm the
       wiring line exists:  grep -n graph-intelligence ~/.omp/agent/config.yml
       EXPECT: a line naming ~/.omp/agent/extensions/graph-intelligence/index.js

□ P-2  THE DEPLOYED BUNDLE IS THE ONE YOU THINK IT IS
       CHECK: sha256sum ~/.omp/agent/extensions/graph-intelligence/index.js | cut -c1-16
       EXPECT: b2ab09acc77684e4

□ P-3  BUN AND SQLITE3 EXIST (the CLI path needs both)
       CHECK: which bun sqlite3
       EXPECT: two paths. bun 1.4.2 and /usr/bin/sqlite3 were measured here.

□ P-4  YOU KNOW WHERE YOUR PROJECT IS, AS AN ABSOLUTE PATH
       CHECK: pwd
       The graph tools confine their target to the session cwd plus /tmp;
       a relative target is refused (§5, S-13).

□ P-5  YOUR PROJECT HAS SOURCE UNDER A CONVENTIONAL ROOT
       CHECK: ls <project>/src   (also recognised: lib/ · app/ · packages/*/src)
       EXPECT: files. A project with no recognised source root refuses with
       GI_NO_SOURCE_ROOT and builds nothing.

□ P-6  FOR SUBGRAPH WORK ONLY — a graphify graph exists
       CHECK: ls <project>/graphify-out/graph.json
       Needed only for the graphify leg and for graph-code-audit. Skip otherwise.
```

**DO NOT START until P-1 and P-4 are ticked.** P-1 without the rest gives you tools that answer
nothing; P-4 without P-1 wastes the first command on a refusal.

---

## §3 · THE QUICK START — THE 80% PATH

Six steps. Do these and you are productive.

```
1. ASK THE TOOL THAT NEEDS NOTHING.
   ripwire verb=map
   → a structural map of your current directory. No store, no setup.

2. ASK THE TOOL THAT NEEDS NOTHING, FOR A PURPOSE.
   ripwire verb=for target="where do we validate an incoming request"
   → the ranked files for that behaviour. Read the rows, not the legend (yet).

3. BUILD THE GRAPH FOR YOUR PROJECT — about half a second on a small tree.
   bun $GI/scripts/gi-populate.ts --target . --layers corbell
   → a per-layer table ending in "built 1/1 layers — ALL BUILT".

4. CONFIRM IT IS LIVE.
   graph-query verb=who-calls target=<a function name you know is called>
   → the substrate line, rows=N, and the caller list.

5. USE IT ON THE THING YOU ARE ACTUALLY ABOUT TO TOUCH.
   graph-query verb=who-calls  target=<SYM>
   graph-query verb=impact     target=<SYM>
   graph-query verb=impact     target=<SYM>   (or verb=blast-radius)

6. AFTER YOU CHANGE CODE, REFRESH.
   bun $GI/scripts/gi-populate.ts --target . --layers corbell --rebuild
   → the rebuilt row counts go UP; re-ask step 4 and the new symbols appear.
```

**STOP HERE IF YOU ONLY WANTED THE 80%.** §4 is the same material with the failure branches.

---

## §4 · THE FULL PROCEDURE

Every action carries PRECONDITION · ACTION · EXPECTED · IF NOT · PROVES. Every one below was RUN
on this host before it was written.

---

### A-1 · CONFIRM THE TOOLS ARE MOUNTED

- **PRECONDITION:** a session is open.
- **ACTION:** call `graph-probe` with any echo.
- **EXPECTED:**
  `{"token":"PROBE_TOOL_OK","sessionID":"scope-969737d390bf079257","sessionIDSource":"scope-root","echo":null}`
- **IF NOT:** the tool is absent → `grep -n graph-intelligence ~/.omp/agent/config.yml`; expect a
  line naming the extension path. Absent line = the extension is not wired for this profile; see
  §6 SYM-1. Present line but no tool = the bundle failed to load; see §6 SYM-2.
- **PROVES:** the session can reach the extension at all.

---

### A-2 · ORIENT IN THE TREE (needs no graph)

- **PRECONDITION:** your cwd is inside the project you care about.
- **ACTION:** `ripwire verb=map`
- **EXPECTED:** an XML map whose header carries `files=`, `symbols=`, `edges=`, `shown=`. Measured
  in the GI worktree: `files=168 symbols=3251 edges=264 shown=48`.
- **IF NOT:** `RIPWIRE_PATH_DENIED: <path> escapes cwd <cwd>` → the `path` argument cannot point
  outside the session cwd. Change your cwd (or `/move` the session); see §6 SYM-6.
- **PROVES:** you can see the shape of the tree without any store.

---

### A-3 · FIND A BEHAVIOUR BY DESCRIPTION

- **PRECONDITION:** A-2 runs.
- **ACTION:** `ripwire verb=for target="<a phrase describing what you are looking for>"`
- **EXPECTED:** a `<sigs>` block of ranked rows, `r=` rank, `p=` file, `n=` name. A `confidence=`
  and `margin_pct=` on the ctx root.
- **IF NOT:** `confidence="low"` with `margin_pct="0"` = a flat ranking — treat the rows as a
  starting point, not an answer. Re-ask with names you have actually seen in the tree.
- **PROVES:** you have candidate files for a behaviour you could not name a symbol for.

---

### A-4 · BUILD THE GRAPH FOR YOUR PROJECT

- **PRECONDITION:** P-5 ticked; A-1 green. You are in the project (or you will pass an absolute
  target).
- **ACTION:**
  `bun $GI/scripts/gi-populate.ts --target . --layers corbell`
  (from the project dir; `--target <abs path>` works from anywhere — both were run.)
- **EXPECTED:** a per-layer table ending
  `[gi-populate] built 1/1 layers — ALL BUILT` plus a `corbell build_root stamp:` line naming your
  project. Measured: `corbell ✓ 3 nodes 1 edges`.
- **IF NOT:**
  - `GI_LAYER_BUILD_EMPTY` on a tiny fixture → the tree is too small for that layer to find
    anything (a 2-function fixture builds corbell but not structural). Real trees behave.
  - `GI_NO_SOURCE_ROOT` → no `src/`-shaped directory; see §6 SYM-4.
  - `GI_LAYER_DOWN:<layer>` → named and expected for L1/L4 on a foreign tree; see §9 LIMIT-2.
- **PROVES:** a parse-grade checkout now exists for your project, under your project.

---

### A-5 · CONFIRM THE GRAPH IS LIVE

- **PRECONDITION:** A-4 green.
- **ACTION:** `graph-query verb=who-calls target=<a symbol you KNOW is called>`
- **EXPECTED (measured):**
  ```
  substrate=corbell
  rows=1
  alpha (/tmp/gi-manual-drill2/src/a.ts:1)
  ripwire: 1 callers (e.g. alpha src/a.ts:1)
  ```
- **IF NOT:** three distinct cases, and the first line tells them apart:
  - `substrate=<name>` + `rows=0` → the store answered and found nothing; fix the spelling (§10
    TRAP-1) or widen the scope (§10 TRAP-2).
  - `substrate=undefined reason=GI_POPULATE_FAILED:CORBELL_NOT_WARM:stale` → the checkout is
    older than your source; run A-17.
  - `substrate=undefined reason=…:absent` → nothing was ever built for this target; run A-4.
- **PROVES:** you can distinguish "the store answered 0" from "there is no store" — the difference
  between a fact and a hole.

---

### A-6 · ASK WHO CALLS A SYMBOL

- **PRECONDITION:** A-5 green for this target.
- **ACTION:** `graph-query verb=who-calls target=<SYM>`
- **EXPECTED:** `rows=N` then one line per caller `name (file:line)`, then the `ripwire:` line.
- **IF NOT:** `QUERY_INVALID: verb 'who-calls' requires a non-empty target` → you passed nothing.
  `QUERY_INVALID: noun` with a verb name → the verb is not in the list (see §5 S-14).
- **PROVES:** you know exactly which files must be re-read before you change the symbol.

---

### A-7 · MEASURE THE BLAST RADIUS

- **PRECONDITION:** A-5 green.
- **ACTION:** `graph-query verb=blast-radius target=<SYM>` and/or
  `graph-query verb=impact target=<SYM>`
- **EXPECTED (measured):**
  ```
  rows=1 root=beta depth=1
  ripwire: impact_reaches=1 radius_untested=1
  ```
  and for `impact`:
  ```
  substrate=corbell
  impact_reaches=1
  alpha@depth1 (/tmp/gi-manual-drill2/src/a.ts:1) via calls
  hint=next=chain from=beta
  ripwire: impact_reaches=1 radius_untested=1
  ```
- **IF NOT:** `root=<SYM> depth=0` with `rows=0` → either nothing reaches it (a real finding) or
  the symbol spelling does not resolve (§10 TRAP-1). The `ripwire:` line names which.
- **PROVES:** the edit's true surface — how many files a change can disturb.

---

### A-8 · DECIDE IF A SYMBOL IS SAFE TO DELETE

- **PRECONDITION:** A-5 green.
- **ACTION:** `graph-query verb=safe-delete target=<SYM>`
- **EXPECTED (measured):**
  ```
  substrate=corbell
  safe_delete: beta callers=1 reaches=1 uses=0 testReach=0
  alpha (/tmp/gi-manual-drill2/src/a.ts:1)
  ripwire: safe-delete callers=1 impact_reaches=1 uses=1 tested_self=0 risk=untested-radius
  ```
- **IF NOT:** treat `callers=0 reaches=0 uses=0` as a CANDIDATE, not a licence: the two legs are
  computed from a store that may be stale (run A-17 first) and a live tree that only sees
  resolvable calls (§9 LIMIT-5).
- **PROVES:** you have a caller count, a reach count, a call-site count and a test-reach count
  before deleting.

---

### A-9 · CHECK A CLAIM ABOUT THE CODE

- **PRECONDITION:** A-5 green. You have a claim in one of the closed shapes.
- **ACTION:** `graph-query verb=verify target='calls(A,B)'`
  (shapes: `calls(A,B)` · `uses(SYM)` · `unused(SYM)` · `contains(FILE,"LIT")` ·
  `defines(FILE,SYM)` · `reaches(SYM,FILTER)`)
- **EXPECTED (measured):** `verify: confirmed shape=calls hops=1 (alpha → beta)`
- **IF NOT:** `VERIFY_INVALID: claim required (closed shapes: …)` → outside the closed shapes.
  `RIPWIRE_ABSENT` → the live-tree leg could not run for this scope.
- **PROVES:** a claim is confirmed or refuted by a command rather than by prose.

---

### A-10 · FIND WHAT IS BUILT BUT NEVER CALLED

- **PRECONDITION:** A-5 green.
- **ACTION:** `graph-query verb=unwired`
- **EXPECTED (measured on a 2-function fixture):**
  ```
  rows=1
  alpha (/tmp/gi-manual-drill2/src/a.ts:1)
  ripwire: dead-code count=0 confidence=high
  ```
  On a real tree this list is long — the GI worktree returned `rows=605`.
- **IF NOT:** a `store-note=LINELESS_NODE` note → the store cannot name lines for some rows; the
  rows are still listed. A large `rows=` on a tree you did not expect → check the scope is YOUR
  tree (§10 TRAP-2).
- **PROVES:** candidates for removal, with the store's and the live tree's counts side by side.

---

### A-11 · TRACE A CALL CHAIN

- **PRECONDITION:** A-5 green.
- **ACTION:** `graph-query verb=chain from=<A> to=<B>`
- **EXPECTED (measured):** `rows=1` / `alpha -> beta [calls]` /
  `ripwire: path reachable=1 hops=1 (alpha → beta)`
- **IF NOT:** `rows=0` → no chain in the store; the ripwire line reports
  `skipped (no 'to' argument)` when you forgot `to`.
- **PROVES:** a path exists (or does not) between two symbols, with its length.

---

### A-12 · CHECK A SIGNATURE CHANGE BEFORE MAKING IT

- **PRECONDITION:** A-5 green.
- **ACTION:** `graph-query verb=would-break target=<SYM> proposed="<new signature>"`
  then `graph-query verb=gate target=<SYM> dial=STEER`
- **EXPECTED (measured):** `callers=1 argsUnknown=true` /
  `ripwire: edit-check status=no-baseline callers=1 incompatible=0 (e.g. alpha src/a.ts:1)`
  and for `gate`:
  ```
  substrate=corbell
  [GATE STEER] symbols=beta callers=1 review: alpha (/tmp/gi-manual-drill2/src/a.ts:1) (store-derived + ripwire edit-check status=no-baseline callers=1 incompatible=0 (e.g. alpha src/a.ts:1))
  ```
- **IF NOT:** `argsUnknown=true` is normal — the store carries no per-call arity. `status=no-baseline`
  means no comparison baseline exists yet; `incompatible=0` still lists the call sites to re-read.
- **PROVES:** you know which call sites a signature change touches, before writing it.

---

### A-13 · CHECK WHETHER A SYMBOL IS ACTUALLY WIRED

- **PRECONDITION:** you know the deployed artifact's path.
- **ACTION:**
  `grep -c <SYMBOL> ~/.omp/agent/extensions/graph-intelligence/index.js`
- **EXPECTED (measured):** a non-zero count for every symbol that reached the bundle —
  `runKernelV2 2 · decideFromRegistry 2 · assertStoreScope 2 · judgeDiff 2 · consumptionAudit 2 ·
  populateSessionStore 7 · safeDelete 3`.
- **IF NOT:** a count of 0 means the name is not in the artifact that runs, whatever `src/` says.
  Do not report the capability as live; see §6 SYM-9.
- **PROVES:** the runtime contains the code — the only evidence that counts for a wiring claim.

---

### A-14 · ASK THE LAYER REGISTER WHAT IT KNOWS

- **PRECONDITION:** a target with at least one layer built (A-4).
- **ACTION:** `gi-consumption subject=<SYM>` (add `scopeRoot=<abs path>` for another tree)
- **EXPECTED (measured, a corbell-only fixture):**
  ```
  consumed:2/8 rungs=meaning,settlement GI_LAYER_DOWN=L6_GRAPHIFY,L4_C2KG,L3_UA,L1_SEMANTICA,ABIDE GI_LAYER_ERROR=L2_ARSUMBRIS
  subject=alpha
  scopeRoot=/tmp/gi-manual-drill2
  L5_CORBELL	CONSUMED	rung=settlement	facts=1
  L6_GRAPHIFY	GI_LAYER_DOWN	rung=settlement	facts=0
  …
  TSG	CONSUMED	rung=meaning	facts=1
  ABIDE	GI_LAYER_DOWN	rung=repair	facts=0
  ```
- **IF NOT:** a lower `consumed:N/8` than you expected is the honest state, not a failure —
  `GI_LAYER_DOWN` names a missing substrate and `GI_LAYER_UNCONSUMED` names a wired-but-silent one.
  `GI_CONSUMPTION_FAILED` → the registry could not build; that is loud by design.
- **PROVES:** which consumers actually produced an anchored fact about your subject — not which
  files exist.

---

### A-15 · RUN THE STACK DECISION

- **PRECONDITION:** A-4 done for the scope.
- **ACTION:** `gi-decide subject=<SYM>`
- **EXPECTED (measured):**
  ```
  verdict=REFUSE	class=benign	code=GI_STACK_INCOMPLETE:L6_GRAPHIFY
  subject=beta
  scopeRoot=/tmp/gi-manual-drill2
  layersWired=6/8
  influenced=L5_CORBELL,TSG
  ```
- **IF NOT:** `REFUSE` with `GI_STACK_INCOMPLETE:<layer>` is the EXPECTED answer on a project
  whose layers are not all up. It is never a pass and never an empty green. `ALLOW` requires the
  layer declarations to be satisfied.
- **PROVES:** the decision is derived from the register, and a partial stack refuses loudly.

---

### A-16 · HUNT, AND RUN A LAYER AUDIT

- **PRECONDITION:** for `hunt` — a valid `profile.yaml` at the scope root (the repo's own
  `$GI/profile.yaml` is the template; its `project.root` and `entryPoints` must name files that
  exist in YOUR tree). For `action=status` — nothing.
- **ACTION:**
  `bug-hunt action=status`
  `bug-hunt action=hunt targetPath=<abs, under the session cwd> profilePath=<abs profile.yaml>`
  `graph-code-audit targetPath=<abs>`  (alias: `aether-code-audit`)
- **EXPECTED (measured):**
  - status: `state=done findingsCount=605 fixOrderCount=20`
  - audit: `AUDIT_DONE layer=R28-sro-graph findings=3 reportPath=/tmp/gi-manual-drill/.omp/graph-intelligence/audit/R28-sro-graph-3hhLtC/findings/report.md`
  - hunt report lands at `<profile.project.root>/.trident/bug-hunter`
  - a hunt whose target is outside the session cwd (measured verbatim):
    `HUNT_SCOPE_INVALID: targetPath=/tmp/gi-drill-fresh resolves outside the scope root (scope=/home/leviathan/.omp/wt/graph-intelligence-66dfa4c target=/tmp/gi-drill-fresh)`
- **IF NOT:**
  - `HUNT_SCOPE_INVALID` → the target is outside the session cwd. Change your cwd to the tree you
    mean and re-issue. The hunt is cwd-confined; it will not run on a target you merely name.
  - `action=status` IGNORES `targetPath` — it reads the CURRENT directory's scope. To read another
    tree, change your cwd. See §10 TRAP-5.
  - `HUNT_BUSY` → a hunt holds the lock; retry after it releases.
  - `PROFILE_INVALID` → the profile is missing or malformed; name `profilePath` explicitly and
    check that `project.root`, `entryPoints` and `rules.corpus` all point at things that exist.
  - `GI_AUDIT_NOT_WIRED: HUNTER_TEMPLATE_INVALID: unknown template 'NOPE'` → the template name is
    wrong. A missing `graphify-out/graph.json` refuses the same way, by name.
- **PROVES:** the hunt and the audit are real attempts with named refusals, never silent stubs.

**NOTE — WHAT WAS AND WAS NOT EXERCISED HERE.** The audit ran to a real report; the status read
ran; the hunt was issued and refused by scope, by name. The hunt's full micro-loop (recon through
report) was NOT executed in this manual's drill — see the residual in §12.

---

### A-17 · REFRESH THE GRAPH AFTER YOU CHANGE CODE

- **PRECONDITION:** you have edited source since the last populate.
- **ACTION:**
  ```
  bun $GI/scripts/gi-populate.ts --target . --layers corbell --rebuild
  ```
- **EXPECTED (measured):** the corbell row counts rise —
  `corbell ✓ 3 1` became `corbell ✓ 5 2` after one added function. Re-ask A-5 and the new symbol
  appears in the caller list.
- **IF NOT:** if a query AFTER the rebuild still shows the OLD rows, that session's query store had
  already been written and will not re-read. Force it:
  `rm -rf <project>/.omp/graph-intelligence/sessions` — the next query repopulates (measured).
  The shell-free alternative is a new session.
- **PROVES:** the graph describes your code as it is NOW, not as it was at the first populate.

---

### A-18 · USE THE SHELL PATH

- **PRECONDITION:** `bun` available; a store exists for the target (A-4).
- **ACTION:** `bun $GI/scripts/gi-cli.ts who-calls <SYM> <project root>`
  (verbs: `who-calls` · `impact` · `blast-radius` · `unwired` · `safe-delete`, plus the infra verbs
  `snapshot` · `diff` · `gate` · `preflight` · `test-targets`.)
- **EXPECTED (measured):**
  ```
  who-calls 'beta': 1 caller(s)
    ← alpha (/tmp/gi-manual-drill2/src/a.ts:1) → corbell:gi-manual-drill2::a.ts::beta
  ```
- **IF NOT:** `NO STORE at <path>` → run A-4 for that root.
  `GI_CLI_STORE_REQUIRED: '<verb>' needs a session-shaped store` → `preflight`/`test-targets`/
  `snapshot` need a session store; point `GI_CLI_STORE` at one.
- **PROVES:** the same facts are reachable without a session at all — useful for scripting.

---

## §5 · WHAT YOU SHOULD SEE

Paste-grade samples, taken from the walk that produced this manual.

**S-1 · the probe**
```
{"token":"PROBE_TOOL_OK","sessionID":"scope-969737d390bf079257","sessionIDSource":"scope-root","echo":null}
```

**S-2 · ripwire map header (first line of the map)**
```
files=168 symbols=3251 edges=264 shown=48 est_tokens=2490 ambiguous=0 unresolved=42
external=99 declined=3 skipped_oversize=2 max_tokens=3000 fit_bytes=6372 order=important-first
```

**S-3 · populate, one layer**
```
[gi-populate] target=/tmp/gi-manual-drill2
[gi-populate] source roots (1): /tmp/gi-manual-drill2/src (rule4:conventional src/ lib/ app/ packages/*/src)
[gi-populate] build_root=/tmp/gi-manual-drill2
[gi-populate] corbell    OK nodes=3 edges=1 → .omp/graph-intelligence/corbell-checkout/store.sqlite

  layer       ok   nodes   edges   store
  ──────────  ───  ──────  ──────  ─────────────────────────────────────────
  corbell     ✓        3       1  .omp/graph-intelligence/corbell-checkout/store.sqlite

[gi-populate] built 1/1 layers — ALL BUILT
[gi-populate] corbell build_root stamp: /tmp/gi-manual-drill2
```

**S-4 · populate, every layer, on the same fixture (3 of 6 build; each miss is NAMED)**
```
  layer       ok   nodes   edges   store
  ──────────  ───  ──────  ──────  ─────────────────────────────────────────
  corbell     ✓        3       1  .omp/graph-intelligence/corbell-checkout/store.sqlite
  graphify    ✓        3       3  .omp/graph-intelligence/graphify-checkout/store.sqlite
  structural  ✗        0       0  .omp/graph-intelligence/structural/store.sqlite
                 ↳ GI_LAYER_BUILD_EMPTY:structural
  ua          ✓        3       2  .ua/knowledge-graph.json
  semantica   ✗        0       0  .omp/graph-intelligence/layers/semantica/kg.json
                 ↳ GI_LAYER_DOWN:semantica
  c2kg        ✗        0       0  .c2kg/index.json
                 ↳ GI_LAYER_DOWN:c2kg

[gi-populate] built 3/6 layers — 3 named failure(s)
```

**S-5 · the answer you want (corbell leg)**
```
substrate=corbell
rows=1
alpha (/tmp/gi-manual-drill2/src/a.ts:1)
ripwire: 1 callers (e.g. alpha src/a.ts:1)
```

**S-6 · the answer when the checkout is stale — READ THIS ONE TWICE**
```
substrate=undefined reason=GI_POPULATE_FAILED:CORBELL_NOT_WARM:stale
rows=0

ripwire: 1 callers (e.g. alpha src/a.ts:1)
```

**S-7 · the answer when the store is fresh but the symbol spelling is wrong (graphify leg)**
```
substrate=graphify graph=/tmp/gi-manual-drill/graphify-out/graph.json nodes=3 edges=3
rows=0

ripwire: 1 callers (e.g. alpha src/a.ts:1)
```

**S-8 · the SAME query with the graphify label form — and the discriminator ripwire prints**
```
substrate=graphify graph=/tmp/gi-manual-drill/graphify-out/graph.json nodes=3 edges=3
rows=1
alpha() (src/a.ts:1)
ripwire: query failed (ripwire: --callers symbol not found: beta() (did you mean 'beta'?))
```

**S-9 · blast-radius / impact / chain / verify / would-break / gate — the shapes**
```
rows=1 root=beta depth=1
ripwire: impact_reaches=1 radius_untested=1

substrate=corbell
impact_reaches=1
alpha@depth1 (/tmp/gi-manual-drill2/src/a.ts:1) via calls
hint=next=chain from=beta
ripwire: impact_reaches=1 radius_untested=1

rows=1
alpha -> beta [calls]
ripwire: path reachable=1 hops=1 (alpha → beta)

substrate=corbell
verify: confirmed shape=calls hops=1 (alpha → beta)

callers=1 argsUnknown=true
ripwire: edit-check status=no-baseline callers=1 incompatible=0 (e.g. alpha src/a.ts:1)

[GATE STEER] symbols=beta callers=1 review: alpha (/tmp/gi-manual-drill2/src/a.ts:1)
```

**S-10 · safe-delete**
```
substrate=corbell
safe_delete: beta callers=1 reaches=1 uses=0 testReach=0
alpha (/tmp/gi-manual-drill2/src/a.ts:1)
ripwire: safe-delete callers=1 impact_reaches=1 uses=1 tested_self=0 risk=untested-radius
```

**S-11 · unwired, small fixture vs real tree**
```
rows=1
alpha (/tmp/gi-manual-drill2/src/a.ts:1)
ripwire: dead-code count=0 confidence=high
```
and on the live worktree: `rows=605`.

**S-12 · the register (`gi-consumption`)**
```
consumed:2/8 rungs=meaning,settlement GI_LAYER_DOWN=L6_GRAPHIFY,L4_C2KG,L3_UA,L1_SEMANTICA,ABIDE GI_LAYER_ERROR=L2_ARSUMBRIS
subject=alpha
scopeRoot=/tmp/gi-manual-drill2
L5_CORBELL	CONSUMED	rung=settlement	facts=1
L6_GRAPHIFY	GI_LAYER_DOWN	rung=settlement	facts=0
L4_C2KG	GI_LAYER_DOWN	rung=context	facts=0
L3_UA	GI_LAYER_DOWN	rung=context	facts=0
L2_ARSUMBRIS	GI_LAYER_ERROR:L2_ARSUMBRIS	rung=knowledge	facts=0
L1_SEMANTICA	GI_LAYER_DOWN	rung=decision	facts=0
TSG	CONSUMED	rung=meaning	facts=1
ABIDE	GI_LAYER_DOWN	rung=repair	facts=0
```

**S-13 · the decision (`gi-decide`)**
```
verdict=REFUSE	class=benign	code=GI_STACK_INCOMPLETE:L6_GRAPHIFY
subject=beta
scopeRoot=/tmp/gi-manual-drill2
layersWired=6/8
influenced=L5_CORBELL,TSG
```

**S-14 · the refusals you will meet (verbatim)**
```
GI_PATH_DENIED: targetPath '/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence' is outside the allowed roots (/home/leviathan/.omp/wt/graph-intelligence-66dfa4c|/tmp); set GI_TARGET_ROOTS to extend (separator '|')
GI_PATH_DENIED: targetPath must be absolute, got 'gi'
QUERY_INVALID: nope
QUERY_INVALID: verb 'who-calls' requires a non-empty target
GI_CLEAR_REFUSED: action=wipe requires GI_OMP_ALLOW_CLEAR=1 in the environment
RIPWIRE_ERROR: Error: RIPWIRE_PATH_DENIED: /tmp/gi-manual-drill escapes cwd /home/leviathan/.omp/wt/graph-intelligence-66dfa4c
GI_AUDIT_NOT_WIRED: HUNTER_TEMPLATE_INVALID: unknown template 'NOPE' | ripwire: engine-binding=auditor template=invalid
```

**S-15 · the write/edit advisory, when you strip an export**
```
[GATE STEER] SIGNATURE_BREAK removed=gamma
```

**S-16 · the shell path (`gi-cli.ts`)**
```
who-calls 'beta': 1 caller(s)
  ← alpha (/tmp/gi-manual-drill2/src/a.ts:1) → corbell:gi-manual-drill2::a.ts::beta
```

**S-17 · the F-95 wiring probe on the deployed bundle**
```
runKernelV2 2 · decideFromRegistry 2 · assertStoreScope 2 · judgeDiff 2
consumptionAudit 2 · populateSessionStore 7 · safeDelete 3
```

---

## §6 · WHEN IT GOES WRONG — SYMPTOM → ACTION

| # | SYMPTOM (what you see) | ACTION (what you do) |
|---|---|---|
| SYM-1 | `graph-probe` is not in the session's tool list | `grep -n graph-intelligence ~/.omp/agent/config.yml`. Line missing → the extension is not wired for this profile. Line present → SYM-2. |
| SYM-2 | the wiring line exists but no tool loads | Verify the file exists at the wired path (`ls -la`). A missing file at a wired path loads nothing. Then start a fresh session — extensions load at session start. |
| SYM-3 | `rows=0` and the `ripwire:` line names callers | Two causes, both measured. (a) The store's symbol spelling is wrong for its substrate — use the form the store uses (§10 TRAP-1); re-ask. (b) The name collides with a library/runtime name, so its edges never entered the store (§10 TRAP-1b) — believe the `ripwire:` count. |
| SYM-4 | `gi-populate: GI_NO_SOURCE_ROOT` | Your project has no `src/`-shaped root. Move sources under `src/` (or `lib/`, `app/`, `packages/*/src`) and re-run A-4. |
| SYM-5 | `substrate=undefined reason=…CORBELL_NOT_WARM:stale` | Run A-17 (`--rebuild`), then re-ask. |
| SYM-6 | `RIPWIRE_PATH_DENIED: … escapes cwd` | ripwire only sees the session's cwd. Change cwd (or `/move`) and re-ask; for another tree use `graph-query` with an absolute `targetPath`. |
| SYM-7 | `GI_PATH_DENIED` naming allowed roots | Pass an ABSOLUTE `targetPath` that is under the printed roots, or extend `GI_TARGET_ROOTS` (separator `\|`). |
| SYM-8 | `substrate=graphify` but you expected corbell | The session store still holds an earlier graphify populate. Delete `<project>/.omp/graph-intelligence/sessions` and re-ask; a fresh corbell build then lands. |
| SYM-9 | a capability is claimed live but the symbol count is 0 in the deployed bundle | Do not report it live. The artifact that runs does not contain it — build and redeploy, then re-probe (A-13). |
| SYM-10 | a write is blocked with `GRAPH_GATE_DRIFT_HIGH: N structural edits without graph query` | Query the symbols you are editing: `ripwire verb=callers target=<SYM>` or `graph-query verb=who-calls target=<SYM>`. One resolved query clears the drift for that symbol. |
| SYM-11 | you want the gate silent for a deliberate edit | `GI_DIAL=OFF` in the environment of the session. This disables the graph gate ON PURPOSE; the advisory records the bypass. |
| SYM-12 | `GI_NO_STORE: … the gate CANNOT verify this edit, so it REFUSES` | Populate the scope (A-4), or set `GI_ALLOW_NO_STORE=1` for a deliberate bootstrap. A missing graph is never a pass. |
| SYM-13 | `HIJACKED` by a query answering for the wrong tree | Read the `scopeRoot=` line in the answer, and the `build_root` stamp (`sqlite3 <store> "SELECT value FROM gi_meta WHERE key='build_root';"`). Mismatch → delete that session store and re-ask. |
| SYM-14 | `bug-hunt action=status` returns a count for a tree you did not name | `status` reads the session cwd only. Change cwd to the tree you mean. |
| SYM-15 | `gi-decide` returns `REFUSE` on a tree that works | Expected when layers are down. Read `code=GI_STACK_INCOMPLETE:<layer>` and A-14 to see which; ALLOW needs the declarations satisfied. |
| SYM-16 | a hunt never finishes / `HUNT_BUSY` | A hunt holds the lock; status reads are refused during it. Wait for the release, then re-read. |
| SYM-16b | `HUNT_SCOPE_INVALID: targetPath=… resolves outside the scope root` | The hunt only runs on the session's cwd tree. Change cwd to the tree you mean and re-issue; `targetPath` does not move the scope. |
| SYM-17 | `GI_CLEAR_REFUSED: action=wipe requires GI_OMP_ALLOW_CLEAR=1` | Wipe is env-gated by design. Set the variable in the environment if you truly mean to clear the session registry; it is not a store clear. |
| SYM-18 | `GI_CLI_STORE_REQUIRED` from `gi-cli.ts` | `preflight`/`test-targets`/`snapshot` need a session-shaped store. Point `GI_CLI_STORE` at one, or use the query verbs. |
| SYM-19 | `NO STORE at <path>` from `gi-cli.ts` | Run A-4 for that root. |
| SYM-20 | the same query returns a DIFFERENT caller count than `ripwire` | The store is older than the tree. Rebuild (A-17) and re-ask; the two lines should then agree. |

---

## §7 · RECOVERY

**ABORT.** Nothing here is irreversible. Stop issuing commands; a partially built store is a
directory under your project's `.omp/graph-intelligence/`.

**ROLLBACK — exactly what to undo, and what cannot be undone.**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ WHAT YOU DID                     │ HOW TO UNDO                           │
├──────────────────────────────────┼───────────────────────────────────────┤
│ built a graph for a project      │ rm -rf <project>/.omp/graph-          │
│                                  │ intelligence   (and .ua/ .c2kg/ if    │
│                                  │ you also built those layers)          │
│ populated into the WRONG tree    │ delete the .omp/graph-intelligence    │
│ (wrong --target)                 │ dir inside THAT tree, then re-run A-4 │
│                                  │ with the right target                 │
│ left the gate steering/blocking  │ query the symbols you are editing, or │
│                                  │ set GI_DIAL=OFF                       │
│ ran a hunt that is still going   │ let it release; status refuses        │
│                                  │ while the lock is held                │
│ an audit wrote a report          │ rm -rf <target>/.omp/graph-           │
│                                  │ intelligence/audit                    │
└──────────────────────────────────┴───────────────────────────────────────┘
```

**WHAT CANNOT BE ROLLED BACK.** A `--rebuild` replaces the corbell checkout's rows: the previous
graph is gone unless you kept a copy. There is no undo stack for the store. Build into a scratch
copy first if the graph matters to someone else.

**RESUME.** Every step is individually resumable:
- populate crashed or missed a layer → re-run A-4 for the missing layers only
  (`--layers corbell,graphify`).
- queries returning stale rows → A-17, then A-5.
- a session whose store is wedged → delete that session's store dir; the next query repopulates.
- nothing at all built and you do not know why → run A-4 with no `--layers` filter and read the
  per-layer reasons; each miss is named.

---

## §8 · THE SECOND RUN

Run 2 is not run 1. What changes:

1. **Skip the build if nothing changed.** A query still answers from the store built last time.
   Check the substrate line first; if it says `stale`, go to A-17.
2. **Rebuild only the layer you need.** `--layers corbell` is under a second on a small tree and
   is enough for every caller/radius/delete/verify verb. You do not need all six layers to get
   the four jobs in §1.1.
3. **The store is per-session and per-scope.** A fresh session gets its own store row-set for the
   scope it stands in; you do not inherit the previous session's staleness, and you do not
   inherit its fresh data either — the auto-populate lane refills it from the warm checkout.
4. **Keep one warm checkout per tree you care about** and refresh it after a batch of edits, not
   after every keystroke.
5. **The shell path is the scriptable one.** For repeated work outside a session, `gi-cli.ts`
   (A-18) with `GI_CLI_STORE` pointed at a session store.
6. **Re-probe the wiring after any redeploy** (A-13) — the sha and the symbol counts in the box
   at the top of this manual are the numbers to re-measure, not to trust.

---

## §9 · THE LIMITS

**LIMIT-1 · THE GRAPH DOES NOT REFRESH ITSELF.** Nothing rebuilds it on a timer, on session
open, or on file save. Every answer describes the tree as of the last `gi-populate`. If you
changed code and did not rebuild, you are reading history.

**LIMIT-2 · NOT EVERY LAYER CAN BUILD ON EVERY TREE.** Measured on this host: corbell, graphify
and ua build on a foreign project; `structural` needs a tree big enough to find symbols in;
`semantica` is DOWN because its Python module is not importable in the local venv;
`c2kg` is DOWN unless the target carries the code-to-knowledge-graph toolkit AND a JDK. Expect
`consumed:2/8` on a plain project and read `GI_LAYER_DOWN` as an accurate report, not a bug.

**LIMIT-3 · `gi-decide` REFUSES UNTIL THE STACK IS COMPLETE.** With layers missing you get
`verdict=REFUSE … GI_STACK_INCOMPLETE:<layer>`. Treat it as a coverage report, not as a verdict
about your code.

**LIMIT-4 · TARGETS ARE CONFINED.** `targetPath` must be ABSOLUTE and under the session cwd or
`/tmp`, unless `GI_TARGET_ROOTS` extends the list. `ripwire` is stricter: cwd only.

**LIMIT-5 · A ZERO IS A FLOOR, NOT A PROOF.** The live-tree leg resolves calls by name; dynamic
dispatch, callbacks bound to several targets, and subprocess-level tests are invisible to it. A
zero caller count is "none found", never "none exists".

**LIMIT-6 · THE STORE HOLDS ONE TREE.** A store answers for the tree it was built from; the query
prints the `scopeRoot` and the store carries a `build_root` stamp. A mismatch is a real hazard,
not a display quirk.

**LIMIT-7 · `bug-hunt action=status` READS THE CURRENT DIRECTORY.** Its `targetPath` argument does
not move it.

**LIMIT-8 · THE HUNT NEEDS A PROFILE.** `bug-hunt action=hunt` refuses without a valid
`profile.yaml` (default: `<scope root>/profile.yaml`).

**LIMIT-9 · NO LSP, NO EDITOR INTEGRATION YET.** The design record describes an LSP; it is a
DESIGN, not a tool you can call today. Do not plan around it.

**LIMIT-10 · ONE AUDIT TEMPLATE PER CALL.** `graph-code-audit` runs one hunter template (default
`R28-sro-graph`) over one `graphify-out/graph.json`. It is not a whole-tree review.

**LIMIT-11 · THIS MANUAL DESCRIBES THE DEPLOYED BUILD ONLY.** The sha at the top is the one
walked. After a redeploy, re-measure P-2 and A-13 before trusting §§3-5.

---

## §10 · THE TRAPS

**TRAP-1 · THE SYMBOL FORM DEPENDS ON THE SUBSTRATE — AND A WRONG FORM LOOKS LIKE "NO CALLERS".**
Measured, same symbol, same tree:

```
  corbell store:   graph-query verb=who-calls target=beta    →  rows=1   ✓
  graphify store:  graph-query verb=who-calls target=beta    →  rows=0   ✗
  graphify store:  graph-query verb=who-calls target=beta()  →  rows=1   ✓
```

**DO:** read the `substrate=` line, try the other spelling, and read the `ripwire:` line — it says
`did you mean 'beta'?` when the form is wrong.

**TRAP-1b · THE SECOND CAUSE OF 0-vs-N: A NAME THAT COLLIDES WITH A LIBRARY NAME.** Measured in a
fresh project, in the same tree, in the same build:

```
  src/b.ts   load2(){ return parseThing() }   parseThing(){ … }
             graph-query verb=who-calls target=parseThing  →  rows=1   ✓
             ripwire: 1 callers (e.g. load2 src/b.ts:1)
  src/a.ts   load(){ return parse() }         parse(){ … }
             graph-query verb=who-calls target=parse       →  rows=0   ✗
             ripwire: 1 callers (e.g. load src/a.ts:1)
```

The checkout for that tree carried `nodes=3 edges=0`: the edge from the caller of `parse` did not
enter the store, because the name resolves against the runtime's own `parse`. The store is not
lying — its edge set is incomplete for that name.

**DO:** when the two legs disagree and the spelling is provably right, treat the LIVE-TREE leg
(`ripwire:`) as authoritative for reach questions, and do not report "no callers". Where a name is
suspected of colliding, the same query on a non-colliding sibling name confirms it in one command.

**TRAP-2 · THE SCOPE IS THE CWD UNLESS YOU NAME A TARGET.** A query with no `targetPath` answers
for the session's cwd. In a workspace containing several projects, `unwired` returning 605 rows is
probably the whole workspace, not your module. **DO:** pass an absolute `targetPath` for the tree
you mean, and read the `scopeRoot=` line of the answer.

**TRAP-3 · THE STORE CAN SERVE STALE ROWS WITH NO WARNING.** After an edit, a query against an
already-written session store returned `substrate=corbell rows=1` while the live tree had two
callers. **DO:** after code changes, A-17 (`--rebuild`), delete that session's store dir if the
rows do not move, and compare the `ripwire:` count on every answer.

**TRAP-4 · `gi-populate` DOES NOT FEED THE TOOLS DIRECTLY.** It builds the layer checkouts under
the target. The tools read a session store that the first query fills from the warm checkout.
Run A-4, then A-5 — not A-4 alone.

**TRAP-5 · BOTH HUNT ACTIONS ARE BOUND TO THE SESSION CWD.** `action=status` ignores `targetPath`
silently and reads the cwd's scope; `action=hunt` refuses loudly:
`HUNT_SCOPE_INVALID: targetPath=… resolves outside the scope root`. **DO:** change cwd to the tree
you mean before either call.

**TRAP-6 · `--rebuild` IS THE DIFFERENCE BETWEEN A REFRESH AND A NO-OP.** Without it, an existing
checkout is not rescanned and your new functions never appear. **DO:** always pass `--rebuild`
after an edit (measured: `3 nodes 1 edge` → `5 nodes 2 edges`).

**TRAP-7 · THE FIRST FULL POPULATE CAN LEAVE THE PRIMARY LAYER STALE.** Building every layer in
one command writes later layers' artifacts after the primary one, and the primary then reads
older than the tree. **DO:** if the substrate line says `stale` right after a full populate,
rebuild the primary alone: `--layers corbell --rebuild`.

**TRAP-8 · A TINY FIXTURE BUILDS ALMOST NOTHING.** A 2-function file built corbell fine; the
structural layer built 0 rows; no `graphify-out` existed at all. **DO:** judge the tool on a real
tree, and treat `GI_LAYER_BUILD_EMPTY` on a toy as expected.

**TRAP-9 · THE WRITE GATE STEERS YOU WHEN YOU STRIP AN EXPORT.** Removing an `export` keyword
produced `[GATE STEER] SIGNATURE_BREAK removed=gamma`. It is advice, not a failure. **DO:** read
it; it names the symbol whose callers you have just jeopardised.

**TRAP-10 · `wipe` DOES NOT CLEAR STORES.** It clears the session REGISTRY and is
env-gated. **DO:** delete the store directories (§7) when you mean to remove graph data.

---

## §11 · VERIFICATION

**V-1 · THE JOB IS DONE WHEN YOU CAN SHOW ALL FIVE OF THESE.**

```
□ V-1a  the tool answered        graph-probe → PROBE_TOOL_OK
□ V-1b  the graph is for YOUR    the answer's scopeRoot= / the store's build_root
        tree                     stamp name the project you meant
□ V-1c  the graph is CURRENT     the answer shows substrate=<name> with NO
                                 reason=GI_POPULATE_FAILED:…
□ V-1d  the two legs AGREE       the rows= count and the ripwire: count describe
                                 the same set (a gap means stale — A-17)
□ V-1e  you can quote the        paste the rows= block, not a summary of it
        answer
```

**V-2 · PROVE THE STORE DESCRIBES YOUR TREE.**
```
sqlite3 <project>/.omp/graph-intelligence/corbell-checkout/store.sqlite \
  "SELECT key,value FROM gi_meta;"
```
Expect `build_root` naming your project and a `built_at` you recognise. Measured output for the
drill: `build_root|/tmp/gi-manual-drill2`, `built_at|2026-09-28T…`.

**V-3 · PROVE THE DEPLOYED BUILD IS THE ONE THIS MANUAL WALKED.**
```
sha256sum ~/.omp/agent/extensions/graph-intelligence/index.js | cut -c1-16
```
Expect `b2ab09acc77684e4`.

**V-4 · PROVE A CAPABILITY REACHED THE RUNTIME** (A-13): a non-zero `grep -c` for its symbol in
the bundle.

**V-5 · PROVE THE REFRESH TOOK** (A-17): the rebuilt node/edge counts are HIGHER than the previous
run's, and the new symbol appears in a caller list.

**FALSIFICATION — what would show the job is NOT done:** an answer whose `substrate=` line is
absent or carries `GI_POPULATE_FAILED`; a store whose `build_root` names another tree; rows that
disagree with the `ripwire:` count; a wiring claim resting on `src/` rather than on V-4.

---

## §12 · THE DRILL — THE RESULT

**HOW THE DRILL RAN.** A cold start on this host, 2026-09-28: six scratch projects created under
`/tmp`, a two-function TypeScript fixture as the smallest target, then each command in §4 executed
in order. Every command, token and count in §§3-5 is the output of that walk. Nothing in this
manual was written from memory.

**THE QUESTION COUNT: 18.** Fifteen questions had to be answered before the manual could be
written; a sixteenth-through-eighteenth surfaced when the manual was then re-walked as a cold
operator (below). Every one is now a line in this manual:

**THE COLD RE-RUN — the drill that found what the authoring walk missed.** After the manual was
written, §3 was executed verbatim in a brand-new project, in order, following nothing but the
text. Steps 1-6 all ran. Step 5 exposed the failure the manual did not yet cover:

```
  Q16  Why does the store say rows=0 when the spelling is provably right?
  Q17  Which leg do I believe when `rows=` and `ripwire:` disagree?
  Q18  Does a build reporting `edges=0` mean the tool is broken?
```

The measured answer — the store said `rows=0` for a symbol whose caller `ripwire` named, with
`substrate=corbell` and a correct spelling. Fetching a non-colliding sibling name in the SAME tree
returned `rows=1` and agreement. **Three amendments followed from this run and are in the text
above:** §1.2 F-4 (the second cause), §6 SYM-3 (two branches, not one), §10 TRAP-1b (the measured
transcript). **A manual that had shipped without the re-run would have told a cold operator to
"fix the spelling" and stop — which is the wrong action and hides a real caller.**

The fifteen authoring questions:

```
  1  Where do I run the populate script from?                    → §A-4
  2  Does a query populate the graph by itself?                  → §A-4, TRAP-4
  3  Which substrate am I getting, and how do I see it?          → §A-5
  4  Why 0 rows when the tool says it found callers?             → TRAP-1
  5  Why does the same query work in one tree and not another?   → §9 LIMIT-4, A-18
  6  What spelling does the target take per substrate?           → TRAP-1
  7  How do I refresh after editing?                            → §A-17, TRAP-6
  8  How do I know the store is for MY tree?                    → §V-2, SYM-13
  9  Where does the audit report land?                          → §A-16
 10  What does a hunt require?                                  → §A-16, §9 LIMIT-8
 11  Why does `status` disagree with the tree I named?           → TRAP-5
 12  Which layers can actually build on this host?              → §9 LIMIT-2
 13  What is exposed/written into my project?                   → §7
 14  Can the graph gate block me, and how do I clear it?        → SYM-10..12
 15  Is there a shell surface?                                  → §A-18
```

**THE THREE WORST GAPS FOUND — none of them was documented anywhere before this manual:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ GAP-1 · NO REFRESH ROUTINE (WORST)                                       │
│   Nothing states that the graph freezes at populate time, that a plain   │
│   re-populate does NOT rescan, or that a written query store never       │
│   re-reads the checkout. The recipe (--rebuild, and the session-store    │
│   clear when rows do not move) was derived by experiment: an edit was    │
│   made, the count stayed at 1, and the second caller only appeared after │
│   --rebuild. An operator would have trusted the first number.            │
├──────────────────────────────────────────────────────────────────────────┤
│ GAP-2 · THE TARGET SYMBOL FORM IS SUBSTRATE-DEPENDENT AND UNSTATED       │
│   `target=beta` returns rows=1 on one leg and rows=0 on the other, for   │
│   the same symbol in the same tree. The only discriminator is a          │
│   parenthetical hint on the cross-check line. A cold operator reads      │
│   rows=0 as "no callers" and ships a blind edit.                         │
├──────────────────────────────────────────────────────────────────────────┤
│ GAP-3 · THE TWO STORE SCOPES ARE JOINED BY NOTHING BUT A LANE            │
│   `gi-populate` writes project-scope checkouts; every tool reads a       │
│   session-scope store; the two meet only inside an auto-populate path    │
│   that nobody documents. A tool description says a query "populates on   │
│   demand", which a cold operator reads as "I can skip the build" — and   │
│   then gets rows=0 (measured: CORBELL_NOT_WARM:absent on a fresh tree).  │
└──────────────────────────────────────────────────────────────────────────┘
```

**TWO FURTHER HOLES, FILLED HERE, WORTH KNOWING:** `ripwire` refuses any path outside the cwd
(SYM-6), and both `bug-hunt` actions are bound to the session cwd — status silently, hunt by a
named refusal (TRAP-5, SYM-16b).

**THE RESIDUAL — WHAT THIS MANUAL COULD NOT DETERMINE.**

1. **The hunt's full micro-loop was never observed.** `bug-hunt action=hunt` was issued and refused
   by scope (`HUNT_SCOPE_INVALID`), which is the only behaviour measured here. The
   `HUNT_DONE … findingsCount=… reportPath=…` shape is the documented one, not one seen in this
   drill — re-measure it on a cwd-scoped tree before quoting a hunt's output.
2. **The age at which a store is purged, and by whom.** The design record states a 1-hour TTL for
   something associated with the store; no command was found that reads or enforces it. Re-measure
   if a store ever vanishes on its own.
3. **Whether `structural` requires a minimum symbol count or a minimum file count** to build. It
   built 0 rows on a 2-function fixture and 17 nodes / 24 edges on a 20 KB tree. The threshold was
   not located.
3. **`L2_ARSUMBRIS` on a foreign project.** It reported `GI_LAYER_ERROR:L2_ARSUMBRIS` on a scratch
   tree and DOWN on the register probe; whether the daemon is meant to serve a foreign scope was
   not settled.
4. **The full template list for `graph-code-audit`.** The registration names 14 layer ids and a
   default of `R28-sro-graph`; the list was not enumerated, and only the default was run.
5. **The LSP.** Described as a design; no callable surface was found.

**WHAT TO DO WITH THIS MANUAL.** Read §3 once. Keep §6 open while you work. Re-run §11 after any
redeploy of `index.js`, because the sha at the top is a measurement, not a promise.
