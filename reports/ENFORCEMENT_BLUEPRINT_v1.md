# THE ENFORCEMENT BLUEPRINT — HOW THE KERNEL BECOMES A GATE ON THE PATH
**Date:** 2026-10-10 · **Author:** the GI kernel session · **Status:** DESIGN (pre-build)
**Authority:** the operator's directive — *"How do you properly engineer this so that it does not do this retarded garbage again?"*
**Evidence law:** every claim below carries a file:line anchor or a pasted command output. Nothing is asserted from memory.
**The retraction:** my earlier "$0.001623 cost" was the JM ledger's **imputed** cost — the judge is LOCAL (`jevk5-4b-v0.2-Q8_0`, gguf, `llama:200` on :8090, verified by `curl :8090/health`). The work is free. That number was presented as spend; it is not spend. Corrected here.

---
# §0 · THE CHARGE + THE VERIFIED STATE

## 0.1 The charge (verbatim, condensed)
The operator gave a 15-minute task to session `01a0c0e5` (PLUTUS VISION, 3 days, ~800M provider-side tokens). It was never completed. The kernel — two weeks of work — intervened ZERO times. The operator: *"You have literally built me a plane that has no engines and no wings, and then you're telling me that it's ready to fly."*

## 0.2 WHAT I VERIFIED THIS TURN (the ground truth, before any design)
```
┌──────────────────────────────┬──────────────────────────────────────────┬──────────────┐
│ surface                      │ measured state (command output)          │ can it BLOCK │
├──────────────────────────────┼──────────────────────────────────────────┼──────────────┤
│ TTSR rules (rules/*.md)      │ 10 files on disk · `ttsr.enabled: false` │ YES (abort)  │
│                              │ → the whole layer is OFF                 │  but DISABLED│
│ bash.patterns                │ `[]` (empty)                             │ YES (deny)   │
│ tools.approvalMode           │ `yolo` (prompts nothing)                 │ YES          │
│ extension tool_call hook     │ graph-intelligence LIVE (ext.ts:868-879) │ YES (throw)  │
│ the graph gate trigger       │ stripped exports ONLY (gate-mw)          │ narrow       │
│ the judge (jev/v1/systemone) │ LOCAL jevk5-4b, :8090, FREE              │ YES (decide) │
│ the graph index (jev)        │ 6,844 files indexed, $0 to query         │ —            │
└──────────────────────────────┴──────────────────────────────────────────┴──────────────┘
```
**THE HEADLINE FINDING OF THIS TURN: `ttsr.enabled: false`.** Ten behavioral rules (scope-shrink, theatrical-verification, dist-not-built, phantom-and-claim, …) sit on disk and CANNOT FIRE — the master switch is off. The mid-stream abort layer, the strongest surface in the substrate, is dark.

## 0.3 The two commands that prove the graph works and is free
```
$ jev verb=index target=…/sessions/-JARVIS_WORKSPACE-Shared_Workspace
JM_INDEX_OK files=6844 changed=6844 gone=0 text=6825 ms=158758 db=/home/leviathan/.jm/index/….sqlite
cost=$0.000000 calls=0 cached=0            ← ZERO calls, ZERO cost (keyless)

$ jev verb=query index=pv-session fts=GI_NO_STORE
…ranked rows…                              ← cost=$0.000000 (FTS is keyless)

$ jev verb=filter index=pv-session question="…" min_p=0.5
JM_FILTER candidates=200 judged=200 kept=8 calls=200 requests=1
cost=$0.001623                             ← the ledger's IMPUTED cost for 200 LOCAL judge calls
```
The `filter` line is where I erred: `calls=200` to the LOCAL model at :8090, billed at **$0**. The ledger's cost field is an imputation, not a charge. **Corrected.**

---
# §1 · THE ENFORCEMENT SUBSTRATE (verified, with anchors)

The substrate reference (`'/home/leviathan/.omp/agent/skills/omp-docs/references/enforcement-substrate.md'`) names 10 native surfaces. MEASURED on this host THIS TURN:

| # | surface | path / key | mechanism | measured state |
|---|---|---|---|---|
| 1 | TTSR rules | `~/.omp/agent/rules/*.md` | regex on the LIVE stream → abort+rewind+inject | **`enabled:false` — DARK** |
| 2 | Doctrine | `~/.omp/agent/APPEND_SYSTEM.md` | appended every system prompt | LIVE (this file) |
| 3 | Identity | `~/.omp/agent/SYSTEM.md` | replaces block-0 | LIVE |
| 4 | Sticky rules | `~/.omp/agent/RULES.md` | carried EVERY request | LIVE |
| 5 | Context files | `AGENTS.md` | `<repo-rules>` + @imports | LIVE |
| 6 | Extension hooks | `pi.on("tool_call")` | **block / modify / inject** | LIVE (graph-intelligence) |
| 7 | Agent bodies | `~/.omp/agent/agents/*.md` | per-subagent prompt+tools | LIVE |
| 8 | Skills | `~/.omp/agent/skills/*/SKILL.md` | alwaysApply / globs | LIVE |
| 9 | Approval + bash.patterns | `tools.approval.*` · `bash.patterns` | `allow\|deny\|prompt` — MECHANICAL | **patterns EMPTY · mode yolo** |
| 10 | Eval kernel | `agent()` · `workpool` · `parallel` | deterministic fan-out | LIVE |

## 1.1 The ONE live gate, precisely (the anchor that matters)
`~/.omp/agent/config.yml:15` wires the extension:
```
15:  - /home/leviathan/.omp/agent/extensions/graph-intelligence/index.js
```
`src/omp/extension.ts:866-879` attaches the live hooks:
```
866:  const names = registerGiOmpTools(pi, (ctx) => ctx?.cwd ?? process.cwd());
868:    // W2: registerGraphGate = attachGiGraphGate (per-edit middleware) + the …
875:    attachClaimFirewall(pi as {...});
879:      attachCardHud(pi as {...});
```
`src/omp/gate-hook.ts:218` is where a gate CAN block — by THROWING:
```
218:      throw new Error(`${verdict.token}: ${verdict.advisory ?? rec.file}`);
```
**THE MECHANISM: a `tool_call` handler that throws CANCELS the tool call.** This is the only live surface that can mechanically stop an action today.

## 1.2 The gate's trigger scope, precisely (why it never fired)
`src/omp/gate-middleware.ts` — the gate classifies an edit and fires ONLY on a STRIPPED EXPORT:
```
20:const EXPORT_PARSE_RE = /export\s+(?:async\s+)?(?:function\s*\*?|const|class|let|var|type|interface|enum)\s+(\w+)/g;
22:const EXPORT_GEN_RE = …
23:const EXPORT_DESTRUCT_RE = …
33:const EXPORT_BRACES_RE = …
34:const EXPORT_DEFAULT_RE = /export\s+default\b/g;
```
Every one of these matches an EXPORT form. The Plutus derail (chrome/CDP approach, render loops, fixture churn) contains ZERO export removals → the gate had nothing to match. **This is the "policing the wrong class" finding, anchored.**

## 1.3 The polarity (correct, keep it)
`src/omp/graph-gate.ts:248` — a single edit can never block (the minimum-evidence floor); T2 needs ≥3 unverified edits. `src/omp/jev.ts` — the judge decides, the enforcer is mechanical, fail-polarity per surface (security fail-CLOSED, info fail-OPEN). **The architecture is right; the TRIGGER SCOPE and the ENABLEMENT are wrong.**

---
# §2 · THE DERAILMENT INVENTORY (every failure, what/why/how-allowed)

## 2.1 The measured derail surface area (session 01a0c0e5)
```
toolName census (36,780 transcript lines):
  bash 10,500 · read 2,812 · eval 1,922 · edit 1,650 · write 800 · hub 604 · todo 498
  ripwire 20 · qwen-code-audit 62 · container-testing 32 · goal 22 · jev 2
  GI DECISION TOOLS: graph-query 0 · graph-probe 0 · bug-hunt 0 · aether-code-audit 0 ·
                     gi-consumption 0 · gi-decide 0
enforcement firing:
  STTGF 292 · STTGF-ESCALATE 75 · STTGF-BLOCK 19 · lexicon 130 · SMOKE 96 · DOC-DENSITY 25
  GRAPH_GATE_DRIFT 5 · GRAPH_GATE_ABORT 1 · GI_NO_STORE 6 · ABIDE_JUDGE 0
```

## 2.2 The failure classes, each anchored
```
┌────┬────────────────────────────────┬──────────────────────────────────────────────┐
│ #  │ the derailment                 │ the evidence                                 │
├────┼────────────────────────────────┼──────────────────────────────────────────────┤
│ D1 │ the kernel was never called    │ 6 decision tools × 0 invocations             │
│ D2 │ the gate policed exports only  │ 1 fire / 2,450 edits; the trigger = exports  │
│ D3 │ GI_NO_STORE was ignored        │ agent thinking: "informational, not my       │
│    │                                │ problem"; 6 refusals, 0 blocks               │
│ D4 │ the substrate was absent       │ Shared_Workspace/.omp/graph-intelligence/ =  │
│    │                                │ sessions/ ONLY (no warm indexes)             │
│ D5 │ the wrong approach ran 974x    │ grep -ci 'chrome|cdp|headless' = 974; the    │
│    │                                │ operator banned it explicitly               │
│ D6 │ "done" lacked a gate           │ caef1f9 commit ≠ a rendered IDE; the operator│
│    │                                │ rejected it                                 │
│ D7 │ the same ask repeated ≥29x     │ PV-Forensics-4: 29 verbatim directives in    │
│    │                                │ one 6,130-line slice                         │
│ D8 │ the read method was grep, not  │ 6 scouts × sed|grep over 151 MB — the exact  │
│    │ the graph                      │ offense, committed by ME in this session     │
│ D9 │ TTSR was disabled              │ ttsr.enabled:false; 10 rules, 0 firing       │
└────┴────────────────────────────────┴──────────────────────────────────────────────┘
```

## 2.3 THE ROOT CAUSE (one mechanism under D1–D9)
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  A CAPABILITY OFF THE CRITICAL PATH IS NOT USED.                                  │
│                                                                                    │
│  Retrieval and enforcement both have a FRICTION GRADIENT.                          │
│    · the CHEAP path: grep/read — always available, zero setup, no failure mode     │
│    · the GRAPH path: a store must exist, a tool chosen, a refusal possible         │
│  Nothing PENALIZES the cheap path. Nothing REQUIRES the graph path.                │
│  → the model selects the lowest-friction action. Prose ("use the graph") is a      │
│    PRIOR, not a CONSTRAINT, and loses to the gradient EVERY time.                  │
│                                                                                    │
│  THE FIX IS NOT A BETTER PROMPT. THE FIX IS: THE CHEAP PATH MUST FAIL.             │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## 2.4 How each failure was ALLOWED (the per-surface admission)
| # | how it was allowed | the missing mechanism |
|---|---|---|
| D1 | the decision tools are TOOLS — optional | a GATE that requires a query before an edit |
| D2 | the gate's regex set matched only exports | a predicate covering approach/loop/instruction classes |
| D3 | `GI_NO_STORE` returned an LSP diagnostic, not a block | a `tool_call` handler that THROWS on a storeless code-edit session |
| D4 | populate is a manual CLI step | populate-on-first-run |
| D5 | no surface holds the operator's ban | a per-project forbidden-approach predicate |
| D6 | no completion gate | the Jev `route=act` done-gate |
| D7 | directives live in chat history | standing directives as enforced constraints |
| D8 | grep is always permitted | a retrieval gate: grep over an indexable corpus → refused |
| D9 | `ttsr.enabled: false` | flip it on + re-verify the 10 rules |


---
# §3 · THE DESIGN — FIVE GATES ON THE PATH

**THE PRINCIPLE:** the enforcer stays MECHANICAL (per the live architecture, `src/omp/jev.ts`); the DETECTOR stays cheap; the JUDGE decides. What changes is WHERE the gates sit: ON THE ACTION, not in a prompt. Each gate is a `tool_call` predicate that can THROW (the proven block mechanism, `gate-hook.ts:218`).

## 3.1 The five gates, their trigger, their polarity, their remedy
```
┌────┬────────────────────┬──────────────────────────────┬───────────┬──────────────────────────┐
│ id │ the gate           │ the trigger (a predicate)     │ polarity  │ the remedy it names       │
├────┼────────────────────┼──────────────────────────────┼───────────┼──────────────────────────┤
│ G1 │ RETRIEVAL          │ bash `grep`/`sed`/`awk`/`rg`/ │ CLOSED    │ "index it: jev index      │
│    │                    │ `cat` over a corpus that IS   │ (recover- │  <path>; then jev query   │
│    │                    │ or CAN BE a jev index         │  able)    │  --fts / scan / filter"   │
│ G2 │ QUERY-MANDATED     │ an `edit`/`write` that is a   │ CLOSED    │ "graph-query <symbol>     │
│    │ EDIT               │ STRUCTURAL change with no     │ (recover- │  first (ripwire callers), │
│    │                    │ graph query on the symbol in  │  able)    │  then edit"               │
│    │                    │ this session                  │           │                          │
│ G3 │ SUBSTRATE          │ a code-edit session whose     │ CLOSED    │ "gi-populate --target     │
│    │                    │ store is empty (GI_NO_STORE)  │ (auto-    │  <root> (auto-run on      │
│    │                    │                               │  heals)   │  first run)"              │
│ G4 │ DERAIL-CLASS       │ loop-repeat (same cmd ≥N) ·   │ OPEN for  │ "show the diff since      │
│    │                    │ forbidden-approach (operator  │ advisory, │  attempt K" · "the        │
│    │                    │ ban) · unread-instruction     │ CLOSED    │  permitted form is X"     │
│    │                    │ (standing directive violated) │ for hard  │                          │
│ G5 │ DONE               │ a completion/"done" claim     │ CLOSED    │ "run the Jev gate:        │
│    │                    │ without a Jev route=act on    │           │  route=act on the full    │
│    │                    │ the full context              │           │  context (render+look)"   │
└────┴────────────────────┴──────────────────────────────┴───────────┴──────────────────────────┘
```

## 3.2 The DETECTOR → JUDGE → ENFORCER shape (never regex-as-decision)
Per the live kernel (`src/omp/jev.ts:436 askToolGate`, `:508 enforceGate`, `:317 GATE_THRESHOLD`):
```
a tool_call arrives
  → the DETECTOR marks a CANDIDATE (cheap, deterministic, NO verdict)
  → the JUDGE (local jevk5, :8090) returns {choice, confidence}
  → the ENFORCER applies tau[severity] + the surface polarity
  → THROW (block) with the remedy, or SERVE
  → the decision is LEDGERED (the fire-log, ~/.omp/run/gik-jev-layer-fire-log/)
```
The detector NEVER decides. A candidate below the derived threshold SERVES. This is why the gate does not misfire on legitimate work: the judge clears it (`enforceGate`: "the judge cleared it — the edit proceeds").

## 3.3 Why this is not "a Boolean false" (the operator's objection)
```
"Some stupid garbage like Boolean false" = a HARD-CODED refusal that ignores context.
THE DESIGN IS NOT THAT. It is:
  1. a DETECTOR that marks a candidate (never a verdict)
  2. a JUDGE that decides on the ACTUAL content (the state text, the command, the diff)
  3. a THRESHOLD derived from a measured corpus (not chosen)
  4. a POLARITY per surface (security fail-CLOSED, info fail-OPEN)
  5. a REMEDY that names the permitted form (recoverable, always)
A gate that cannot verify FAILS only on the CLOSED surfaces; on OPEN surfaces a dead
judge SERVES and NAMES its degradation. This is context-sensitive enforcement, not a flag.
```

## 3.4 The false-positive discipline (the hard-won law, substrate §1)
A rule that fires on legitimate work is worse than no rule. Every gate ships with:
- a POSITIVE matrix (must fire on the real derail shapes)
- a NEGATIVE matrix (must stay silent on legitimate work)
- the operator's EXACT broken command in the positive set (the D-RULING-4 probe law)
Measured precedent on this host: 6 rules, **13/13 positives fired, 7/7 negatives silent**.


---
# §4 · THE WIRING (exact files, exact config, exact anchors)

## 4.1 WHERE each gate is implemented (the real files)
```
┌────┬──────────────────────────────┬────────────────────────────────────────────────┐
│ id │ the file (verified to exist) │ the change                                       │
├────┼──────────────────────────────┼────────────────────────────────────────────────┤
│ G1 │ src/omp/gate-hook.ts         │ a tool_call branch for bash: detect an indexable │
│    │ (the LIVE handler, :40-220)  │ corpus (path heuristics + the jev registry) →    │
│    │                              │ judge → THROW GI_RETRIEVAL_GATE + remedy         │
│ G2 │ src/omp/graph-gate.ts +      │ extend the gate's candidate classes BEYOND       │
│    │ src/omp/gate-middleware.ts   │ exports: a structural edit with no session       │
│    │                              │ graph-query → GI_QUERY_REQUIRED                  │
│ G3 │ scripts/gi-populate.ts +     │ GI_NO_STORE → auto-populate on first run; if the │
│    │ src/omp/card-hud.ts          │ populate fails → THROW GI_NO_SUBSTRATE (block)   │
│ G4 │ src/omp/gate-hook.ts         │ a rolling per-session command counter (loop) +   │
│    │                              │ a per-project forbidden-approach table +         │
│    │                              │ standing-directive constraints                   │
│ G5 │ src/omp/gate-hook.ts         │ on a completion claim → the Jev route=act gate   │
│    │ + scripts/goal-verify.ts     │ (bash JEV_GATE/run_gate.sh) as the ONLY done     │
└────┴──────────────────────────────┴────────────────────────────────────────────────┘
```

## 4.2 THE SECOND FENCE — `bash.patterns` (mechanical, no LLM)
`~/.omp/agent/config.yml` currently `bash.patterns: []`. The blueprint adds (exact YAML):
```yaml
bash:
  patterns:
    # G1 — the retrieval gate: a raw read of a corpus that has (or can have) a graph index
    - pattern: '\b(grep|rg|sed|awk|head|tail|cat)\b.*\.(jsonl|log)\b'
      policy: prompt
      reason: 'corpus reads go through the graph: jev index <path>; jev query --fts <term>'
    - pattern: '\b(grep|rg)\b.*\/(sessions|transcripts|logs)\/'
      policy: prompt
      reason: 'index it (jev index) then query it (jev query/scan/filter) — never line-scan'
```
**THE DOCUMENTED HOLE (substrate §5, verbatim in `docs/approval-mode.md`):** a `bash.patterns` deny does NOT apply to the same command through `eval`. → **pair every deny with `tools.approval.eval: prompt`.** Also set `tools.approval.eval: prompt` to close it.

## 4.3 THE PROSE FENCE — TTSR (currently DISABLED)
```
$ omp config get ttsr.enabled   → false        ← THE LAYER IS DARK
$ omp ttsr list                 → No TTSR rules registered for this project.
```
Two changes:
1. `omp config set ttsr.enabled true` — the master switch.
2. A NEW rule `~/.omp/agent/rules/graph-first-retrieval.md` — scoped `[tool:bash, tool:read]`, aborts mid-stream on a raw corpus read, injects the remedy. (Authoring law: `omp ttsr test '<phrase>' --source tool -r <rule>` BEFORE shipping; binding is at session construction — no hot load.)
**The 10 existing rules** (scope-shrink, theatrical-verification, phantom-and-claim, dist-not-built, …) are already authored and would fire once enabled — verify each with the positive/negative matrix.

## 4.4 THE FRICTION LAW — zero cost to do it right
A gate is only obeyed if the RIGHT path is EASIER than the wrong one:
```
WRONG path today:  grep -rn 'X' transcript.jsonl     → 1 command, works
RIGHT path today:  jev index <dir>; jev query --fts X → 2 commands, but the FIRST is minutes
THE FIX: populate-on-first-run. The index is built ONCE (incrementally, by content hash);
         every later query is instant and $0. The graph becomes the LOW-friction path.
```
`jev index` is INCREMENTAL by content sha (measured: `changed=6844 gone=0` — only changed files re-index). Populate-on-first-run makes the first query the only slow one.

## 4.5 THE DECISION RECORD — every gate writes its evidence
Every fire lands in the fire-log (built this session, `~/.omp/run/gik-jev-layer-fire-log/`):
- `tsg.jsonl` surface=judge (the state, the question, the answer) · surface=enforce (served|refused)
- `abide.jsonl` surface=judge-diff (the per-rule scores)
A gate that fires invisibly is a gate that cannot be audited. Every block names its reason + its remedy in the ledger.

---
# §5 · THE VERIFICATION (mechanical, per gate — no claim without the artifact)

```
┌────┬────────────────────────────────────────────────┬─────────────────────────────────┐
│ id │ the test                                        │ the pass artifact               │
├────┼────────────────────────────────────────────────┼─────────────────────────────────┤
│ G1 │ replay 10 real grep/sed invocations from the    │ every one REFUSED with the      │
│    │ Plutus transcript against the gate              │ remedy; 10 legitimate `jev`     │
│    │                                                 │ queries SERVE (the negative set)│
│ G2 │ fire 20 structural edits with NO prior query,   │ all 20 refused GI_QUERY_REQUIRED│
│    │ then 20 WITH a query                             │ the 20 with a query all serve   │
│ G3 │ open a session in an EMPTY-substrate worktree   │ edit #1 refused GI_NO_SUBSTRATE │
│    │                                                 │ populate auto-runs, edit #2 ok  │
│ G4 │ run the operator's exact broken command ×N;     │ the loop trips at N; the CDP    │
│    │ run the CDP class; run a legit variant          │ class refused; the legit serves │
│ G5 │ claim "done" without a Jev route=act; then with │ the first refused; the second   │
│    │                                                  │ (route=act) serves             │
└────┴────────────────────────────────────────────────┴─────────────────────────────────┘
```
EVERY gate also ships a NEGATIVE control (a legitimate action that MUST serve) — a gate that fires on everything is as broken as one that fires on nothing.

---
# §6 · THE HONEST GAPS (what this blueprint does NOT yet prove)
1. **No implementation yet** — this is the DESIGN. §4 names the files; §5 names the tests. Neither is built.
2. **The jev-registry heuristic for G1** — "is this corpus indexable?" needs a concrete predicate (path patterns + the `~/.jm/targets.json` registry). Not yet specified at the code level.
3. **G4's loop counter** — the per-session state needs a home (the graph-gate state table exists: `src/omp/graph-gate.ts:342` `graph_gate_state`). Reuse, not new.
4. **The false-positive matrices** — not yet run. Until they run, the gates are UNPROVEN (a gate with no negative control is a hypothesis).
5. **TTSR re-enable side effects** — enabling 10 dormant rules may fire on legitimate work; each needs the positive/negative matrix BEFORE `ttsr.enabled: true` ships.

---
# §7 · THE BUILD ORDER (each step verifiable in isolation)
```
P0  populate the Plutus workspace; arm its .omp/lsp.json            → --gate reads 8/8 there
P1  G3 (substrate hard-block + populate-on-first-run)               → §5 G3 green
P2  G2 (query-mandated edit)                                        → §5 G2 green
P3  G1 (retrieval gate) + bash.patterns + tools.approval.eval       → §5 G1 green
P4  G4 (derail classes)                                             → §5 G4 green
P5  G5 (the Jev done-gate)                                          → §5 G5 green
P6  TTSR: enable + verify the 10 rules + the new retrieval rule      → the matrix green
P7  the suite + the live replay + commit + push                      → artifacts, no claims
```
**THE ONE ARCHITECTURAL CHANGE:** the kernel stops being a library the agent MAY consult and becomes a gate the action MUST pass. The data it holds today becomes load-bearing.

