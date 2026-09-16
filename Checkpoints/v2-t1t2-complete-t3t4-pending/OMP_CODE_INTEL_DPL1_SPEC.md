# BUILD SPEC ARTIFACT — OMP_CODE_INTEL

- **Target:** /home/leviathan/OPENCODE_WORKSPACE/projects/omp-code-intel (greenfield plugin package)
- **Generated:** 2026-09-12
- **Trident Version:** skill-based DPL1 (trident-deep-planning v2026-09-08 amendments)
- **Status:** PLANNING
- **Artifact Type:** BUILD_SPEC (Layer 1 Prompt)
- **Discovery:** ENABLED — 16 MiMo/OMP/registry sources read or fetched this session; measured counts in §3
- **PREFLIGHT:** script-test ✓ deep-container-testing ✓
- **Companion artifacts:** reports/OMP_Code_Intelligence_Plugin_ShowMe.md (blueprint + fidelity deltas)

## TABLE OF CONTENTS

1. §1 Problem Statement
2. §2 Architecture
3. §3 Discovery Intelligence
4. §4 Core Insight
5. §5 Scope
6. §6 Success Criteria
7. §7 Container Test Plan (plan-first)
8. §A Context
9. §B Dense Build Plan
10. §8 Anti-Pattern Ledger
11. §9 Open Decisions
12. §10 The Spec Illustrated
13. §11 Script Testing Suite
14. §12 Deep Container Testing Suite
15. Spec-Manager Gate

## DISCOVERED INTELLIGENCE

- **Languages:** TypeScript (Bun runtime, ESM) for the plugin; Rust N-API prebuilt via dependency.
- **Entry points:** plugin `server` entry (a `Plugin = (input, options) => Promise<Hooks>` fn) loaded by `packages/opencode/src/plugin/loader.ts:69-116` from config `"plugin": [["omp-code-intel", {options}]]`.
- **Patterns found:** MiMo tool registry custom-over-builtin shadow (`registry.ts:336-338`); hook governance surface (`packages/plugin/src/index.ts:422-626`); OMP tool schemas (`astGrepSchema`, `astEditSchema`, `evalSchema` fetched verbatim); hashline constants (`hashline-format.ts`: `HL_FILE_HASH_LENGTH = 4`, `HL_LINE_BODY_SEP = ":"`).
- **Failures to design against:** OMP `ast-edit.ts` stale-preview class (preview→apply drift → named error, nothing written); `evidence-pipeline.ts:72-74` non-fatal persistence swallow (visible via frozen chainLength); builtin `lsp.ts:56` "No LSP server available" loud rejection.
- **Decisions:** pin `@oh-my-pi/pi-natives@18.1.18` exact (no float — 22k-commit upstream); merkle chain per project at `.mimocode/omp-intel/merkle-chain.jsonl`; tag length 4 (OMP-proven); additive tool IDs v1, shadow opt-in.
- **Warheads honored:** loud-fail-or-clear-pass (every rejection names its token); verification-before-declaration (§11/§12 written before code); proven-path (npm dep + registry shadow are documented-supported paths).
## §1 PROBLEM STATEMENT

From the operator, verbatim, across three turns:

1. "analyze deeply https://github.com/can1357/oh-my-pi built in code intelligence at the harness level … everything that makes the harness itself intelligent and significantly less likely to write theatrical garbage code"
2. "how can we bundle all that into an 'OMP Code Intelligence' plugin for mimocode that we can just turn on so all of it works on the mimocode substrate the same way?"
3. "spec and map the FULL architecture for this completely — then give me the pinnable /goal-prompt"

The build: ONE npm-installable MiMo-Code plugin package (`omp-code-intel`) that, on a single
config-line toggle, delivers OMP's harness-level coding intelligence to the primary agent —
structural search/rewrite, hashline-anchored edits, persistent eval kernels, LSP full ops,
native grep, merkle evidence chain, stream-rule governance, optional advisor — with zero
edits to MiMo core files in v1. The completed audit (this session) established feasibility:
the native core is npm (`@oh-my-pi/pi-natives@18.1.18`, MIT, 6 platform N-API optionals),
the plugin API can register AND shadow tools, and the hook surface covers every governance
feature except mid-token stream abort (documented delta, optional core patch).
## §2 ARCHITECTURE

Four layers, top to bottom; every boundary is a documented-supported path (no forks of MiMo, no vendoring of OMP's session fabric):

1. **Config layer** — `"plugin": [["omp-code-intel", options]]` in mimocode.json.
   `PluginOptions = Record<string, unknown>` (`packages/plugin/src/index.ts:69`).
   Loader auto-installs npm plugins and gates compatibility via package.json
   peer declarations (`opencode/src/plugin/loader.ts:69-116`, stages
   install/entry/compatibility with named skip reasons).
2. **Plugin layer** — `src/index.ts` exports the `Plugin` fn returning `Hooks`:
   `tool` map (additive: `ast_grep`, `ast_edit`, `omp_edit`, `eval`, `evidence`,
   `resolve`; shadow opt-in: `grep`, `lsp`), `tool.execute.after` (merkle append
   + rule scan), `experimental.chat.messages.transform` +
   `experimental.chat.system.transform` (injection), `experimental.session.compacting`
   (rule persistence), `event` (`file.edited` → tag-store invalidation;
   `types.gen.ts:487`), `session.userQuery.post` (advisor read).
3. **Shim layer** — `src/shim.ts`: the ~300-line bridge from OMP tool-body
   expectations to MiMo `ToolContext` (`tool.ts:4-21`: sessionID, directory,
   worktree, abort, metadata(), ask()): cwd resolution, options-backed settings,
   per-session tag store, path-list parsing. Built once in W1; every tool sits on it.
4. **Native layer** — `@oh-my-pi/pi-natives@18.1.18` (pinned): `astGrep`,
   `astEdit`, hashline fns (`hashlineFileHash`, `hashlineFormatHeader`,
   `hashlineFormatNumberedLines`, `hashlineStripPrefixes`), grep, glob, diff,
   tokens. Platform binaries arrive as optionalDependencies; engines bun>=1.3.14
   == MiMo root `packageManager: bun@1.3.14`.

Data flow: model calls plugin tool → shim resolves ctx → pi-natives executes →
output formatted with `path#tag` + `N:body` rows → tag store updated →
`tool.execute.after` appends merkle row + scans rules → result text returns.
## §3 DISCOVERY INTELLIGENCE (measured this session)

MiMo-Code tree (`/home/leviathan/Grok_Build/reference/mimo-code`, read not estimated):

| File | Lines | Load-bearing fact |
|---|---|---|
| packages/plugin/src/index.ts | 626 | `Hooks` surface :422-626; PluginOptions :69 |
| packages/plugin/src/tool.ts | 41 | `ToolDefinition` :32-38; `ToolContext` :4-21 |
| packages/opencode/src/plugin/loader.ts | 216 | resolve/load pipeline :69-128 |
| packages/opencode/src/tool/registry.ts | 565 | shadow :336-338; lsp flag :309; actor mask :442-444 |
| packages/opencode/src/tool/edit.ts | 752 | Cline/Gemini fuzzy match :1-4; Semaphore lock :38-48 |
| packages/opencode/src/tool/lsp.ts | 91 | 9 read ops :12-22; loud no-server :56 |
| packages/opencode/src/tool/read.ts | 384 | 2000-line/50KB caps :17-21; lsp.touchFile warm :80-82 |
| packages/opencode/src/tool/{grep,bash,apply_patch}.ts | 148/1328/308 | baseline tool inventory |
| packages/sdk/js/src/gen/types.gen.ts | — | `file.edited` in Event union :487 |

OMP (fetched verbatim from github.com/can1357/oh-my-pi@main): `tools/ast-grep.ts`
(~470 lines: `astGrepSchema` {pat, path?, lang?, skip?}, DEFAULT_AST_LIMIT=50,
`capParseErrors`, multi-target rebase), `tools/ast-edit.ts` (~600 lines:
`ops:[{pat,out}]`, `paths:[]`, dryRun→`queueResolveHandler` staging,
stale-preview named error, fresh re-tag post-apply, `PI_MAX_AST_FILES` default
1000), `tools/hashline-format.ts` (25 lines: constants verbatim), `tools/eval.ts`
(~900 lines: `evalSchema` {language:'py'|'js', code, title?, timeout?, reset?},
backends, IdleTimeout), `docs/lsp-config.md` (ServerConfig fields, defaults.json
50+ servers, TS-native selection rule), README (31 tools, 14 lsp ops, ~80k Rust
core, 6 crates).

npm registry (fetched): `@oh-my-pi/pi-natives@18.1.18` — MIT, N-API
`binaryName: pi_natives`, optionalDeps
`@oh-my-pi/pi-natives-{linux,win32,darwin}-{x64,arm64}`, SLSA provenance,
unpackedSize 1,256,741 bytes.

Local: `trident-omp/src/engines/subagent/harness/evidence-pipeline.ts` — 88
lines, `MerkleNode` :8-15, `merkle-chain.jsonl` append :66-75,
`verifyChainIntegrity` :82-87.

Licenses: MiMo `LICENSE` MIT (Xiaomi 2026 + opencode 2025); pi-natives MIT.
Bun: MiMo root pins `bun@1.3.14`; pi-natives engines `>=1.3.14`. Match.
## §4 CORE INSIGHT

The implementation must produce runtime-grade software that works correctly in a
real MiMo-Code session — not just code that compiles. Harness intelligence is the
product: correctness moves from model discretion to mechanical anchors (content-hash
tags verified before any write), and every rejection is a LOUD, NAMED failure
(`STALE_ANCHOR`, `ANCHOR_MISMATCH`, `PARSE_ISSUES_CAPPED`, `KERNEL_MISSING`,
`NO_LSP_SERVER`, `INTEGRITY_FALSE`) — never a silent degrade, never a substitute
artifact dressed as success (the fallback test: a fallback that produces a DIFFERENT
artifact marked VALIDATED is banned).

Governing non-negotiables:
1. **Error handling on every path** — every tool names its failure tokens; the
   catch-all is banned in tests (exact-tag assertions only).
2. **Boundary validation** — empty pattern, max-size file, malformed tag, hostile
   kernel input all carry named rejections.
3. **Resource cleanup** — eval sidecars die with the session (`session.post`
   finalizer + process-count assertion in tests); tag store invalidates on
   out-of-band `file.edited`.
4. **Side-effects-before-claims** — the merkle row lands on disk BEFORE the tool
   returns success text; `evidence` reads the chain, never the tool's own memory.
## §5 SCOPE (loaded requirements)

1. Plugin package `omp-code-intel` with `server` entry; loadable by one config line; npm + file: channels.
2. `ast_grep` tool: OMP schema verbatim, `matchCount/filesSearched/limitReached` fields, parse-error cap, `path#tag` + `N:body` output.
3. `ast_edit` tool: `ops/paths` schema, dryRun preview, staged diffs, apply only via `resolve` tool, stale-preview named error.
4. `omp_edit` tool: `{file_path, tag, hunks:[{line, old, new}]}`; tag verify before write; `STALE_ANCHOR`/`ANCHOR_MISMATCH` named rejections; retag after apply.
5. Tag store: per-session, `file.edited` invalidation, `HL_FILE_HASH_LENGTH=4`.
6. `eval` tool: persistent py/js kernels via Bun.spawn; `evalSchema` verbatim; `reset` per-kernel; named `KERNEL_MISSING`.
7. Kernel RPC v1: read/grep/ast re-entry via JSONL file bridge to plugin's own fns.
8. `evidence` tool + merkle chain: port `evidence-pipeline.ts` (88 lines) to `.mimocode/omp-intel/merkle-chain.jsonl`; `tool.execute.after` appends on mutating tools.
9. TTSR-lite: rule scan on `tool.execute.after`, injection via `messages.transform`, persistence via `session.compacting`.
10. Advisor (flagged): `userQuery.post` trajectory read + concern injection via `messages.transform`; model via options.
11. Shadow `grep` (opt-in): pi-natives in-process grep behind the same id.
12. Shadow `lsp` (opt-in): vendored client (~500 LoC PROPOSED — measure at build), ops beyond builtin's 9: rename, codeAction, diagnostics, willRename on omp_edit retag.
13. `THIRD-PARTY-NOTICES` with OMP attribution; `@oh-my-pi/pi-natives@18.1.18` pinned exact.
14. Options surface: `{ast, hashline, eval:{py,js}, merkle, ttsr:{rules}, advisor:{model}, shadow:[]}` — all on except advisor/shadow.
15. Toggle-off = remove config line; builtins unaffected (registry passes through).
16. Wave-gated delivery W1-W4 per §B; each wave ships script tests (§11) + container proof (§12) before merge.
## §6 SUCCESS CRITERIA (mechanical, every row checkable)

| # | Criterion | Check command / observation |
|---|---|---|
| SC-1 | Package installs | `bun install` in plugin dir exits 0; `node_modules/@oh-my-pi/pi-natives/package.json` version == 18.1.18 |
| SC-2 | Types clean | `bun x tsc --noEmit` exits 0 |
| SC-3 | Plugin loads | MiMo session boot with config line: `ToolRegistry.ids()` contains `ast_grep`, `omp_edit`, `evidence` |
| SC-4 | Structural search | `ast_grep {pat:"console.log($$$)"}` on fixture: result contains `"matchCount"` > 0 and `#` tag header |
| SC-5 | Anchor edit | `omp_edit` with valid tag: file sha256 changes; result contains new tag; old tag rejected thereafter with exact `STALE_ANCHOR` |
| SC-6 | Stale guard never writes | `omp_edit` with stale tag: file sha256 UNCHANGED (compare before/after) + exact token `STALE_ANCHOR` in result |
| SC-7 | Staged rewrite | `ast_edit` returns preview text containing `proposed`; disk unchanged until `resolve` call; after resolve, disk sha256 changed + `applied` in result |
| SC-8 | Merkle chain | after ≥3 mutating calls, `.mimocode/omp-intel/merkle-chain.jsonl` has ≥3 rows; `evidence {}` returns `"integrity": true` and integer `chainLength` |
| SC-9 | Chain detects corruption | delete a middle row from the jsonl; `evidence {}` returns `"integrity": false` (LOUD, not throw-less silence) |
| SC-10 | Kernel persistence | two `eval {language:"py"}` calls: 2nd sees variable set by 1st (stdout echo proves) |
| SC-11 | Kernel cleanup | after session end: `pgrep -f omp-intel-eval` returns nothing |
| SC-12 | TTSR injection | rule matching fixture output fires: synthetic user part contains `[omp-intel rule` in next-step trajectory |
| SC-13 | Rule survives compaction | trigger compaction; `session.compacting` output context array includes rule body |
| SC-14 | Shadow grep | config `shadow:["grep"]`: registry `grep` def description == plugin's; without: builtin's |
| SC-15 | Toggle-off clean | remove config line, reboot: plugin tool ids absent from `ids()`; builtins present |
| SC-16 | LSP loud missing | `lsp` on `.zzz` file: exact `No LSP server available` |
| SC-17 | Tag invalidation | out-of-band file write → `file.edited` event → next `omp_edit` with old tag returns `STALE_ANCHOR` |
| SC-18 | Script suite green | `bun run tests/st/run.ts` exit 0, PASS table printed (§11) |
| SC-19 | Container suite green | `.trident/container-test-results.json` `overall.verdict == "pass"` with all planned scenarios PASS (§12) |
## §7 CONTAINER TEST PLAN (plan-first — extracted verbatim to .trident/test-plan.md)

**Rig:** runtime-grade container with MiMo + the plugin installed via config line; dist SHA recorded at setup; auth probe FIRST (a model-backed tool call succeeds — silent-auth green is the #1 false-green); screenshot = message-level evidence channel; exec = disk truth.

**Angles (7, context-matched):**

| Angle | Scenario | passToken (tool-result-bound) | failToken |
|---|---|---|---|
| TOOLS | model calls ast_grep on seeded fixture | `"matchCount":` present in tool result | `unknown tool` |
| FIREWALL | model attempts omp_edit with stale tag | `STALE_ANCHOR` + fixture sha256 unchanged via exec | file bytes changed |
| STATE | corrupt merkle jsonl (drop middle row) then evidence {} | `"integrity": false` | `"integrity": true` after corruption |
| LIFECYCLE | remove plugin config line, restart, list tools | builtin `edit` present + `ast_grep` absent from registry ids() | `ast_grep` still present |
| CONCURRENCY | two parallel omp_edit on same file+tag | exactly one `applied`-class success; loser carries `STALE_ANCHOR` or `ANCHOR_MISMATCH`; final sha256 == winner's write | both "succeed" |
| ERRORS | eval {language:"py"} with python absent | `KERNEL_MISSING` named error | stack-trace dump / silent hang |
| CONFIG | plugin options `{eval:{py:false}}` then eval py | named disabled-error; `js` path advertised | py executes anyway |

**Evidence requirement:** every scenario: screenshot (rendered tool result) + exec (sha256/jsonl reads) + the per-scenario row in `.trident/container-test-results.json` with passTokenMatch + failTokenAbsent + toolResultContext.
**Pass threshold:** ALL planned scenarios PASS, zero skips, zero circular tokens (agent prose never counts), negative half green (legit edits flow unmuted).
## §A CONTEXT (a fresh agent reading ONLY this section knows the situation)

**Current state:** greenfield project dir `projects/omp-code-intel/` contains this spec only. No code exists yet — by design (tests in §11/§12 were written against THIS spec, before implementation).

**Prior work (this session, same conversation):**
1. OMP audit — README + `docs/lsp-config.md` + 4 tool sources fetched verbatim; established the 9-feature intelligence inventory (ast search/rewrite, hashline, LSP-in-writes, eval kernels, TTSR, advisor, task-typed-yield, schemes, native core).
2. MiMo audit — plugin contract, loader, registry shadow mechanism, builtin tool baselines measured (§3 table).
3. Blueprint — `reports/OMP_Code_Intelligence_Plugin_ShowMe.md`: master architecture, fidelity-delta table (IDENTICAL/PARTIAL/APPROXIMATED/SUBSET per feature), failure modes, open decisions, wave sketch.
4. Feasibility verdict — ~85% of features land in-plugin; v1 touches zero MiMo core files.

**References with dates:** MiMo tree snapshot read 2026-09-12 at `/home/leviathan/Grok_Build/reference/mimo-code` (git present; `.git` dir exists — pin commit at W1 kickoff with `git rev-parse HEAD`). OMP sources fetched 2026-09-12 from main@HEAD (moving target — the PINNED npm dep, not the repo, is the build surface). npm metadata fetched 2026-09-12.

**What exists and is proven:** `@oh-my-pi/pi-natives@18.1.18` on npm (SLSA-attested, 6 platform optionals); trident-omp merkle pipeline (88 lines, production-used in this workspace). **What does not exist:** the plugin package, the shim, the tag store, kernel manager, all tests.
## §B DENSE BUILD PLAN

**Module map (interfaces):**

| Module | Exports | Depends on |
|---|---|---|
| src/shim.ts | `mkCtx(toolCtx, options): ShimCtx` {cwd, settings, tagStore, toPathList} | plugin API types |
| src/tagstore.ts | `class TagStore {snapshot(abs,txt): tag; verify(abs,tag): bool; retag(abs): tag; invalidate(abs)}` | node:crypto |
| src/ast.ts | `astGrepTool`, `astEditTool` (ToolDefinition) | pi-natives, shim, tagstore |
| src/edit.ts | `ompEditTool` | tagstore, shim |
| src/resolve.ts | `resolveTool` + `queueStaged(sessionID, handler)` | ast.ts staging contract |
| src/merkle.ts | `class EvidencePipeline` (ported) + `evidenceTool` | node:crypto/fs |
| src/eval/kernels.ts | `class KernelManager {spawn(lang): Kernel; killAll()}` | Bun.spawn |
| src/eval/rpc.ts | `startRpcBridge(dir, dispatch)` — JSONL req/res watcher | kernels |
| src/ttsr.ts | `scan(output): Violation[]`, `injectRules(parts)`, `persistRules(ctx)` | options.rules |
| src/advisor.ts | `onUserQueryPost(trajectory)` | options.advisor |
| src/grep.ts / src/lsp/* | shadow tools | pi-natives / vendored client |
| src/index.ts | `const plugin: Plugin` — wires Hooks per options | all above |

**Data flow (the anchor loop):** ast_grep/ast_edit emit `[path]#tag` headers → TagStore.snapshot records {tag=hash(content) prefix 4} → omp_edit verifies tag THEN hunks (`lines[n] != old` → `ANCHOR_MISMATCH at line N`) → atomic write → retag → `tool.execute.after` fires merkle.record(tool, diffHash, true) → evidence reads jsonl.

**File manifest (all NEW; zero MiMo files edited):**
`package.json`, `tsconfig.json`, `THIRD-PARTY-NOTICES`, `src/{index,shim,config,tagstore,ast,edit,resolve,merkle,ttsr,advisor,grep}.ts`, `src/eval/{kernels,rpc,prelude-py,prelude-js}.ts`, `src/lsp/{client,tool}.ts`, `tests/st/{harness.ts,ast.st.ts,edit.st.ts,merkle.st.ts,eval.st.ts,ttsr.st.ts,run.ts}`.

**Wave plan (disjoint write-sets, gate = §11 suite green + §12 spot-check):**
- **W1 anchor loop:** shim, tagstore, ast, edit — the core value tranche.
- **W2 governance + rules:** merkle port, evidence tool, tool.execute.after wiring, ttsr + transforms + compacting persistence.
- **W3 kernels:** eval/ spawn + rpc + prelude stubs + session cleanup.
- **W4 shadows + ship:** lsp vendor + grep + advisor + notices + npm publish prep + toggle-off proof — TERMINAL (SC-19/SC-20).
## §8 ANTI-PATTERN LEDGER (3 categories, every entry mechanically detected)

**ARCHITECTURAL:**
1. Regex-where-AST — a code-search tool body that never calls `astGrep`/pi-natives. Detection: `grep -L "pi-natives" src/ast.ts` must return nothing; ST asserts `"matchCount"` field (regex grep cannot produce metaVariables).
2. The wrong-layer governance — rule logic inside a tool body instead of `tool.execute.after`. Detection: `grep -n "omp-intel rule" src/*.ts` matches only `src/ttsr.ts`.
3. Daemon-as-drive — eval kernels as long-lived daemons outliving sessions. Detection: post-session `pgrep -f omp-intel-eval` non-empty → FAIL (SC-11).

**BEHAVIORAL:**
4. Silent stale-write — omp_edit proceeding on tag mismatch. Detection: ST fixture with pre-mutated file; sha256 before == after; exact `STALE_ANCHOR` token in result (SC-6).
5. Claim-before-chain — success text without a merkle row on disk. Detection: ST reads jsonl row count before/after each mutating call (SC-8).
6. Catch-all recovery — failures returning generic Error. Detection: ST asserts exact tags (`KERNEL_MISSING`, `NO_LSP_SERVER`); `grep -n "catch {}" src/` must return nothing outside documented port sites.

**PROCESS:**
7. Theatrical test — a PASS whose token appears only in agent prose. Detection: container artifact records `toolResultContext` per scenario; reviewer greps it (§12 anti-circularity).
8. Unpinned dependency — `^18` float on pi-natives. Detection: `grep '"@oh-my-pi/pi-natives": "18.1.18"' package.json` exact.
9. Shadow-without-opt-in — `grep`/`lsp` shadowing when `options.shadow` omits them. Detection: ST boots registry with `shadow: []` and asserts builtin description object identity.
## §9 OPEN DECISIONS (evidence + recommended default)

1. **Additive vs shadow IDs** — evidence: registry shadow is supported (`registry.ts:336-338`) but replaces builtin descriptions wholesale. DEFAULT: additive v1; shadow behind `options.shadow` list.
2. **LSP client sourcing** — evidence: MiMo `src/lsp/` (7 files) exists but is core-internal; plugins import only `@mimo-ai/plugin`. DEFAULT: vendor a minimal client (~500 LoC PROPOSED — measure at W5 kickoff; if >800 LoC, cut diagnostics first, keep rename+hover).
3. **Eval transport** — evidence: `PluginInput.$` BunShell available; ipykernel adds zmq dep. DEFAULT: REPL pipes via `Bun.spawn` v1; zmq deferred.
4. **Advisor model channel** — evidence: `PluginInput.client` SDK exists; its model-prompt surface unverified. DEFAULT: spike FIRST in W5; fallback = no advisor in v1 (flagged off, documented) — never a fake advisor.
5. **Packaging channel** — evidence: loader auto-installs npm; `file:` for dev. DEFAULT: npm publish post-W5; `file:` during waves.
6. **Core-patch candidates** (out of v1 scope, both upstreamable): tag emission in builtin read/grep; stream-chunk hook for true mid-token TTSR. DEFAULT: ship v1, file PRs after.
## §10 THE SPEC ILLUSTRATED

### 10.1 MASTER VIEW (every box names its section)

```
┌───────────────────────────────────────────────────────────┐
│ mimocode.json "plugin":[["omp-code-intel",opts]]  (§2 L1) │
└────────────────────────────┬──────────────────────────────┘
                             ▼
┌───────────────────────────────────────────────────────────┐
│ Loader: install→entry→compat→import       (§2 L1, §A)     │
└────────────────────────────┬──────────────────────────────┘
                             ▼
┌───────────────────────────────────────────────────────────┐
│ Plugin Hooks wiring                            (§2 L2)    │
│ ├─ tool map: ast_grep ast_edit omp_edit eval   (§5 2-7)   │
│ │            evidence resolve [+shadow grep lsp]           │
│ ├─ tool.execute.after → merkle + rule scan     (§5 8-9)   │
│ ├─ transforms + compacting → inject + persist  (§5 9-10)  │
│ └─ event file.edited → tag invalidation        (§5 5)     │
└────────────────────────────┬──────────────────────────────┘
                             ▼
┌───────────────────────────────────────────────────────────┐
│ Shim: mkCtx + TagStore                (§B, §4 n.n. 1-4)   │
└────────────────────────────┬──────────────────────────────┘
                             ▼
┌───────────────────────────────────────────────────────────┐
│ @oh-my-pi/pi-natives@18.1.18 pinned        (§3, §5 13)    │
└───────────────────────────────────────────────────────────┘
```

### 10.2 CORE MECHANISM — the anchor loop (§5 2-5, §B data flow)

```
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│ ast_grep   │  │ omp_edit   │  │ atomic     │  │ merkle     │
│ (§5.2)     │  │ (§5.4)     │  │ write+retag│  │ (§5.8)     │
│            │  │            │  │            │  │            │
│ emits      │─►│ verify tag │─►│ sha changes│─►│ jsonl row  │
│ path#tag   │  │ stale→FAIL │  │ new tag    │  │ before     │
│ N:body     │  │ mismatch→  │  │ minted     │  │ success    │
│            │  │ FAIL named │  │            │  │ text       │
└────────────┘  └────────────┘  └────────────┘  └────────────┘
```

### 10.3 OVERLAYS — orthogonal always-on mechanisms (§5 8-10, §2 L2)

```
                  ┌──────────────────────────────┐
                  │ every tool result            │
                  └───────────────┬──────────────┘
                                  ▼
        ┌─────────────────────────────────────────────┐
        │ tool.execute.after                          │
        │ ├─ merkle.record(tool,dataHash,passed)     │
        │ └─ ttsr.scan(output) → violations?         │
        │      └─ messages.transform injects rule    │
        │         + session.compacting persists it   │
        └─────────────────────────────────────────────┘
```

### 10.4 BUILD MANIFEST — waves + untouched core (§B)

```
┌────────────────────────────────────────────┐
│ W1 shim tagstore ast edit   anchor loop    │
│ W2 merkle evidence after-hook   governance │
│ W3 ttsr transforms compacting  rules       │
│ W4 eval kernels rpc prelude    runtime     │
│ W5 lsp grep advisor notices    shadows     │
├────────────────────────────────────────────┤
│ UNTOUCHED: entire MiMo core tree (0 edits) │
└────────────────────────────────────────────┘
```

### 10.5 NAMED-ERROR MAP — the complete rejection surface (§4, §7)

```
┌──────────────────────────────────────────────┐
│ STALE_ANCHOR      tag != content hash        │
│ ANCHOR_MISMATCH   hunk old != line bytes     │
│ PARSE_ISSUES_*    capped parse errors        │
│ KERNEL_MISSING    eval lang unavailable      │
│ NO_LSP_SERVER     filetype unserved          │
│ "integrity":false merkle chain broken        │
│ PLUGIN_LOAD_*     loader stages (install/    │
│                   entry/compatibility)       │
└──────────────────────────────────────────────┘
```

Every box maps to a section; every arrow is a transition the code implements.
## §11 SCRIPT TESTING SUITE (per script-test skill — written BEFORE the code)

PREFLIGHT: script-test ✓. Mode B harness (plugin code is plain TS): real
imports, real bytes, observation-channel assertions only — diskBytes,
exitShape-with-exact-tag, rows(jsonl), returnedValue. No spy verbs exist in
the harness. Exactly ONE runPromise at the bottom; every scenario
`Effect.timeout`-bounded.

**THE HARNESS (tests/st/harness.ts, verbatim shape):**
`withSandbox` = mkdtempSync + scope finalizer rm; `class TagFailure
{ readonly _tag = "TagFailure"; constructor(readonly token: string) {} }` —
the failure mapper EXTRACTS the spec-named token from the thrown message so
`Exit.isFailure && cause.token === "STALE_ANCHOR"` is assertable; `scenario(name,
stimulus, expect)` returns `{name, verdict, got}`; PASS/FAIL table printed;
`process.exit(rows.every(PASS) ? 0 : 1)`.

**ST CONTRACTS (assertion = spec-named token OR observable artifact):**

| Script | Both halves |
|---|---|
| ast.st.ts | LEGIT: fixture with 3 `console.log` → `"matchCount":3`-class field + `#` tag in output. ADVERSARIAL: empty pat → exact `pat must be a non-empty pattern`; dir of broken .ts → capped `Parse issues` (never raw dump) |
| edit.st.ts | LEGIT: valid tag+hunks → diskBytes changed + new tag returned + jsonl row count +1. ADVERSARIAL: stale tag → `STALE_ANCHOR` + diskBytes IDENTICAL; wrong old line → `ANCHOR_MISMATCH at line N` + bytes identical; missing snapshot → `read first` guidance token |
| merkle.st.ts | LEGIT: 3 records → rows(jsonl)==3, `verify()==true`. ADVERSARIAL: drop middle row → `verify()==false` (SC-9); tamper a hash → `false` |
| eval.st.ts | LEGIT: py kernel set-then-read across 2 calls (stdout proves persistence). ADVERSARIAL: missing binary → `KERNEL_MISSING`; reset:true wipes (2nd call fails on undefined name) |
| ttsr.st.ts | LEGIT: clean output → scan()==[] (zero-misfire half). ADVERSARIAL: rule-matching fixture → violation carries rule key; inject produces `[omp-intel rule` part |
| registry.st.ts | LEGIT: shadow:["grep"] → plugin grep id present. ADVERSARIAL: shadow:[] → builtin description identity (§8.9) |

**THE RUNNER:** `bun run tests/st/run.ts` — executes every ST in sequence,
prints the table, exit-code verdict (SC-18).

**ANTI-CHEAT PROPERTIES:** written before implementation (this section);
every assertion targets a §4-named token or a disk/exit observable; failure
assertions name the exact tag (catch-all banned, §8.6); the runner's exit code
is the CI gate; the harness contains no mock of any unit under test.
## §12 DEEP CONTAINER TESTING SUITE (per deep-container-testing skill)

PREFLIGHT: deep-container-testing ✓.

**THE 12-STEP LAW instantiated:** (1) plan = §7 verbatim, 2000+ chars, six
sections; (2) preflight READY; (3) setup with fresh container + dist SHA
verified against the deployed FILE sha (exec sha256sum — never the aggregate);
(4) AUTH PROBE FIRST: model-backed tool call succeeds, status bar shows the
live provider; (5) model verification via screenshot only; (6) scenario
execution send→waitForCompletion→SCREENSHOT (message channel) + exec (disk
truth) → passToken in TOOL-RESULT context + failToken absent; (7) first error
= a bug to fix+retest, never a skip; (8) found bugs fixed minimally, battery
re-run, zero regressions; (9) Phase E circuit breaker (all 10); (10) results
artifact `.trident/container-test-results.json`; (11) zero-broken-windows;
(12) declaration = sha proof + evidence excerpts + per-scenario verdicts.

**FAMILY SUITES (POSITIVE + NEGATIVE per use case):**
- AUTH family: plugin loads; `ToolRegistry.ids()` shows the six additive ids
  (tool-result context, not prose). NEGATIVE: without config line, ids absent.
- Enforcement families (the teeth): FIREWALL/ST/CONCURRENCY/ERRORS/CONFIG rows
  of §7 — each fires ITS OWN token (`STALE_ANCHOR`, `"integrity": false`,
  `KERNEL_MISSING`, disabled-error). A generic gate preempting = UNOBSERVED.
- NEGATIVE/happy family (zero-misfire, MANDATORY after teeth): legit ast_grep→
  omp_edit→resolve flow completes unmuted; builtin edit/write untouched by rule
  scan when no rule matches; compaction proceeds with context appended, not
  replaced.
- Adversarial family: corrupt jsonl mid-session; parallel same-file edits;
  toggle-off mid-boot; hostile kernel input (fork bomb one-liner → timeout kill
  + named error).

**RESULTS ARTIFACT schema:** per scenario `{name, family: POSITIVE|NEGATIVE,
specificToken, passTokenMatch, failTokenAbsent, toolResultContext, timedOut,
verdict, evidence}` + `{phaseE: {shaMatch, authProbe, allExecuted,
tokensAsserted, noCircular, noTimeouts, blastRadius, adversarial, alive,
artifactWritten}, overallVerdict}`.

**PASS CRITERIA:** Phase E all-10 + negative half green + every token in a
tool-result context. BANNED declarations: "structural PASS", "PASS by design",
"asserted the behavior". SC-19 is the merge gate.
## SPEC-MANAGER GATE

The 2026-09-08 amendments mandate: `bun run scripts/spec-manager.ts <spec.md>`
returns compiler-style feedback and the spec is revision-looped until ✅
APPROVED. **This workspace has no scripts/spec-manager.ts** (verified by find,
this session). Standing order for the build agent: if the machine lands in the
tree before dispatch, run it against this file and reconcile every ✗; until
then, the Mechanical Completion Checklist below is the gate — executed by hand,
findings recorded in the build log.

**MECHANICAL COMPLETION CHECKLIST (executed):**
- [x] 11 contract sections present, in order (§1-§9 + §A + §B)
- [x] Anti-pattern ledger: 9 entries, 3 categories, every detection mechanical (§8)
- [x] Open decisions: 6 forks, each with evidence + default (§9)
- [x] Evidence-currency: all §3 anchors from this session's reads/fetches; no stale citations
- [x] §7: 7 adversarial angles + evidence requirement + pass threshold
- [x] §6: 19 criteria, every one command/ledger/eyes-checkable
- [x] §3/§5 numbers measured (line counts, version, byte size) — the two PROPOSED tags live in §9/§5.12 with defaults
- [x] Problem statement = operator verbatim (§1)
- [x] Uniqueness: every section header exactly once
- [x] §10: 5 graphs, every box → section
- [x] §11: harness + ST contracts + both halves + runner + anti-cheat block
- [x] §12: 12-step instance + families POSITIVE+NEGATIVE + artifact schema + Phase E
- [x] Closing skills loaded before writing (script-test ✓ deep-container-testing ✓)

**ZERO-TRUST AUDIT:** no unresolvable gaps. Two LOW findings, both resolved
by existing defaults: (1) advisor channel unverified → §9.4 spikes-first rule;
(2) LSP client size PROPOSED → §9.2 cut-order defined. The spec is
dispatch-ready for L2 or a build agent.
