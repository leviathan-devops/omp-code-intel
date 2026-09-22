# GI KERNEL v2.1 — THE SIX-ITEM AUDIT
## Every Question You Asked, Answered With Mechanical Evidence

**Date:** 2026-09-22 · **Baseline:** `jarvis/gi-main` · **Method:** zero-trust-audit + a 6-desk read-only wave (E1 template, verbatim). Every claim carries a `file:line` anchor or a raw command output. No claim without a command.
**Companions:** `GI_kernel_v21_ANTI_PATTERN_CATALOG.md` (the anti-patterns) · `GI_kernel_v21_HARDENING_PLAN.md` (the plan).
**Supersedes:** `GI_kernel_v21_FULL_DOCUMENTATION.md` (the B-level draft — this is the A-level rebuild; the draft's §2–§7 are corrected and extended below).

---

# §0 · THE DENOMINATOR (what this document answers)

The operator's message, verbatim (session `2026-09-13T22-23-48-820Z_01a09cde`, line 30805):

```
1) how this was allowed to pass the goal loop. every flaw that allowed this to "pass"
2) how this was allowed to pass code review. /skill:qwen-code-audit is MANDATORY at the end of a
   run and should be ENFORCED BY THE GOAL LOOP. WHY ISNT IT. /skill:omp-docs TELL ME WHAT HOOK
   SURFACE FOR THE GOAL LOOP EXISTS SO WE CAN FORCE CODE AUDIT BY DEFAULT ON EVERYTHING
   COMPLETION CLAIM AND REJECT THE CLAIM IF CODE AUDIT FAILS. Goal mechanics need hardening
3) why this code was so shittily built. complete derailment from the build package how was this
   even allowed to ship
4) real mechanical gates we can and must build to force the anti patterns to #3 and make it
   mechanically impossible for such a trash quality "ship" to ever be allowed. this is round 1
   shipped as complete. this is what goes to code review, gets denied with feedback of obvious
   flaws, cleans everything up, LOOPS UNTIL LEGITAMETLY PRODUCTION GRADE, VERIFIED IN LIVE
   SCRIPT/CONTAINER/HOT SEAT TESTS, THEN it ships
5) full inventory of every single "test" that failed to catch literally the entire codebase being
   compeletely fucked. /skill:zero-trust-audit rip it apart. all the theatrical logic and
   bullshit garbage testing that was done to compltely waste tokens and build theatrical slop
   that is in clear and obvious violation of the spec and bild package
6) how can we built a proer testing framework from the anti pattenrs of #5 that serve as a
   universal template for the /skill:runtime-grade testing suite AND what gate workflows can we
   build to enforce this mechanically using Git and GitHub and git events as the enforcement
   rails? Automatically reject commits and PRs that are out of alignement and use the git
   worktree to track progression + alignment to the spec and build package. We can pin semantica
   to the worktree and have it assist with the intellignece of this + have a dedicated TSG
   kernel for decision making. Map this out for me what would this look like
```

**Plus the two asks in the same message:** mint the `extract-meta-patterns` skill from the process; `/skill:spec-update` the response as `v2.1-initial-autopsy-report.md`.

**The audit wave (6 read-only desks, E1 template):**

| Desk | Item | The key mechanical finding |
|---|---|---|
| AuditGoalLoop | 1+2 | `completeGoalFromTool` sets `status=complete` with ZERO substantive checks; `pi.on("tool_call")` CAN cancel `goal(complete)` — PROVEN |
| AuditTestSuite | 5 | 31 suites; all fixture-subject; 2 named-live suites use harnesses, not the deployed bundle; X-4/X-5 already CORRECTED |
| AuditUnwiredStubs | 4 | 12 of 23 modules UNREACHABLE from the live entry; `hard-deps`+`kernel-v2` dead roots |
| AuditBuildPackage | 3 | The v2.1 adjudication loop is a tested library BESIDE the live path, not IN it; `runKernelV2` zero call sites |
| AuditSubstrateDeploy | 1 | `graph_gate_state` DDL exists, `save/loadGateState` NEVER called in prod; bundle Sep 20 vs sources Sep 21 |
| AuditEnforcementRails | 2+6 | Hook surface verified; git rails ABSENT (no remote, samples-only hooks, no workflows); semantica present-never-called |

---

# §1 · ITEM 1 — HOW THIS PASSED THE GOAL LOOP

## 1.1 · THE COMPLETION SINK — THE ROOT OF IT ALL

**The goal tool is a normal tool (`name="goal"`), and its completion path has NO substantive checks.**

`node_modules/@oh-my-pi/pi-coding-agent/src/goals/tools/goal-tool.ts:57`:
```ts
export class GoalTool implements AgentTool<typeof goalSchema, GoalToolDetails> {
    readonly name = "goal";
```
`node_modules/@oh-my-pi/pi-coding-agent/src/goals/runtime.ts:470-494` (VERBATIM):
```ts
async completeGoalFromTool(): Promise<Goal> {
    return await this.#withAccounting(async () => {
        await this.#flushUsageLocked("suppressed");
        const state = this.#getStateClone();
        if (!state?.goal) {
            throw new Error("cannot complete goal because no goal is active");
        }
        if (state.goal.status === "complete") {
            throw new Error("goal is already complete");
        }
        if (state.goal.status === "dropped") {
            throw new Error("cannot complete a dropped goal");
        }
        state.enabled = false;
        state.goal.status = "complete";        // ← THE CLAIM BECOMES FACT HERE
        state.goal.updatedAt = this.#now();
        state.mode = "exiting";
        state.reason = "completed";
        this.#clearActiveAccounting();
        this.#budgetReportedFor = undefined;
        await this.#commitState(state, { persist: "goal" });
        return state.goal;
    });
}
```

**★ THE THREE PRECONDITIONS ARE ALL STATUS CHECKS. NONE IS A VERIFICATION.** No scope check, no freshness check, no deploy check, no live-firing check, no audit check, no test check. **The agent's own prose is the only input; `status = "complete"` is the output. That is the prose-claim sink.**

## 1.2 · THE EIGHT FLAWS (G-1..G-8) — ALL VERIFIED MECHANICALLY

| # | The flaw | The verification | The check that is MISSING |
|---|---|---|---|
| G-1 | No SCOPE check in the loop | `grep goal\|complete src/omp/extension.ts` → only prose comments, ZERO functional hits (AuditGoalLoop V5) | `GI_STORE_SCOPE_MISMATCH` — the store describes `src/hunter`, the code is `src/omp`; nothing compares them |
| G-2 | No FRESHNESS check in the loop | `storeFreshness` (typed-write.ts:424) exists; `grep storeFreshness src/omp/` → never called from the completion path | a `populated_at >= newest-source-mtime` gate |
| G-3 | No DEPLOY check in the loop | no mtime compare anywhere in the completion path; bundle Sep 20 07:11 vs sources Sep 21 17:5x | a bundle-vs-source mtime gate |
| G-4 | No LIVE-FIRING check in the loop | `graph_gate_state` = 0 rows; the gate fired once in 40,631 lines | a "the enforcement fired N times this session" gate |
| G-5 | The audit is a SKILL, not a GATE | `aether-code-audit` registered as a TOOL at `extension.ts:580`; **no hook invokes it** | `pi.on("tool_call")` on `goal(op=complete)` → run audit → block on FAIL |
| G-6 | The loud-crash register is UNWIRED | `grep hard-deps\|preflight\|kernel-v2 src/omp/extension.ts` → **ZERO hits** (AuditGoalLoop V6) | `preflight()` at extension init |
| G-7 | The tests certify FIXTURES | 31 suites; 0 import the deployed bundle; 0 assert store scope vs the live tree (AuditTestSuite) | a live-subject suite |
| G-8 | `goal(complete)` accepts a PROSE claim | `runtime.ts:470-494` (above) | the audit gate — the ONLY input is the agent's word |

**★★★ THE MECHANICAL REASON IN ONE LINE: the goal loop's completion condition is a MODEL STATEMENT, not a MEASURED FACT. Nothing in the loop re-runs the capability; the agent's own words close the goal.**

## 1.3 · THE GOAL-LOOP MECHANICS AS BUILT (the full surface)

```
goal({op:"create"})   → status=active, the objective + budget recorded
goal({op:"get"})      → reads state
goal({op:"resume"})   → re-activates a paused goal
goal({op:"drop"})     → status=dropped
goal({op:"complete"}) → completeGoalFromTool() → the THREE status checks → status=complete
                        ★ NO HOOK FIRES. NO GATE CONSULTS. THE GOAL CLOSES.
```

**The loop checks NOTHING about:**
```
✗ the graph's reachability (is the store describing THIS tree?)
✗ the layers' liveness (are the 6 layers up?)
✗ the deployed bundle's freshness (is the running code the current code?)
✗ the tests' reality (do they exercise the live path, or fixtures?)
✗ the audit (has an independent model reviewed the change?)
✗ the substrate's scope (does the graph answer about the code you wrote?)
```

**And the enforcement that DOES exist is nearly inert (§3.4 of the prior autopsy): 1 live firing against 1,375 edit/write calls and 0 graph calls.**

---

# §2 · ITEM 2 — HOW IT PASSED CODE REVIEW, AND THE HOOK SURFACE

## 2.1 · THE ANSWER TO "WHY ISN'T qwen-code-audit ENFORCED?"

```
THE REVIEW RAIL:      qwen-code-audit (ocr) — "no system is ship ready until a run returns
                      0 critical and 0 high findings."
THE MEASURED STATE:   the audit gate is BLOCKED. THEATRICALITY_LOG:421, verbatim:
  "★ THE HONEST RESIDUAL: the AUDIT GATE is BLOCKED, so NOTHING in this session has been
   machine-reviewed by an independent model. Every claim above rests on tests I wrote and
   ran myself."
THE MECHANISM:        F-61 — the audit rail at 127.0.0.1:4098 was refused (BLOCKED).
★ SO: THE CODE REVIEW NEVER RAN, AND THE SHIP PROCEEDED ANYWAY.
★ A BLOCKED gate that does not block is a theatrical gate.
```

**WHY it isn't enforced, mechanically:** `aether-code-audit` is registered as a **TOOL** (`extension.ts:580-585`) — a thing the agent *may* call. It is **not** bound to any hook. The goal loop's completion path (`runtime.ts:470-494`) consults no hook. So the audit is a **documented wish**: a skill the agent is *asked* to run, with nothing that makes the ship fail if it doesn't.

## 2.2 · THE HOOK SURFACE (VERBATIM from the vendored upstream truth)

**Source:** `node_modules/@oh-my-pi/pi-coding-agent/dist/types/extensibility/hooks/types.d.ts` (the `HookAPI` interface). ★ NOTE: `skill://omp-docs` itself contains NO hook pages — it points at the vendored types. This substitution is declared, not hidden (AuditEnforcementRails §8).

**The COMPLETE event surface (24 events):**
```ts
export interface HookAPI {
    on(event: "session_start",              handler: HookHandler<SessionStartEvent>): void;
    on(event: "session_before_switch",      handler: HookHandler<SessionBeforeSwitchEvent, SessionBeforeSwitchResult>): void;
    on(event: "session_switch",             handler: HookHandler<SessionSwitchEvent>): void;
    on(event: "session_before_branch",      handler: HookHandler<SessionBeforeBranchEvent, SessionBeforeBranchResult>): void;
    on(event: "session_branch",             handler: HookHandler<SessionBranchEvent>): void;
    on(event: "session_before_compact",     handler: HookHandler<SessionBeforeCompactEvent, SessionBeforeCompactResult>): void;
    on(event: "session.compacting",         handler: HookHandler<SessionCompactingEvent, SessionCompactingResult>): void;
    on(event: "session_compact",            handler: HookHandler<SessionCompactEvent>): void;
    on(event: "session_shutdown",           handler: HookHandler<SessionShutdownEvent>): void;
    on(event: "session_before_tree",        handler: HookHandler<SessionBeforeTreeEvent, SessionBeforeTreeResult>): void;
    on(event: "session_tree",               handler: HookHandler<SessionTreeEvent>): void;
    on(event: "context",                    handler: HookHandler<ContextEvent, ContextEventResult>): void;
    on(event: "before_agent_start",         handler: HookHandler<BeforeAgentStartEvent, BeforeAgentStartEventResult>): void;
    on(event: "agent_start",                handler: HookHandler<AgentStartEvent>): void;
    on(event: "agent_end",                  handler: HookHandler<AgentEndEvent>): void;
    on(event: "turn_start",                 handler: HookHandler<TurnStartEvent>): void;
    on(event: "turn_end",                   handler: HookHandler<TurnEndEvent>): void;
    on(event: "auto_compaction_start",      handler: HookHandler<AutoCompactionStartEvent>): void;
    on(event: "auto_compaction_end",        handler: HookHandler<AutoCompactionEndEvent>): void;
    on(event: "auto_retry_start",           handler: HookHandler<AutoRetryStartEvent>): void;
    on(event: "auto_retry_end",             handler: HookHandler<AutoRetryEndEvent>): void;
    on(event: "ttsr_triggered",             handler: HookHandler<TtsrTriggeredEvent>): void;
    on(event: "todo_reminder",              handler: HookHandler<TodoReminderEvent>): void;
    on(event: "tool_call",                  handler: HookHandler<ToolCallEvent, ToolCallEventResult>): void;
    on(event: "tool_result",                handler: HookHandler<ToolResultEvent, ToolResultEventResult>): void;
    // + sendMessage(), appendEntry(), registerTool(), registerCommand(), registerRenderer()
}
```

**THE CANCEL CONTRACT (the exact shape — verbatim):**
```ts
// dist/types/extensibility/shared-events.d.ts:234-236
export interface ToolCallEventResult {
    /** If true, block the tool from executing */
    block?: boolean;
    /** Reason for blocking (returned to LLM as error) */
    reason?: string;
    /** Replacement input the tool executes with... Ignored when `block` is true. */
    input?: Record<string, unknown>;
}

// dist/types/extensibility/hooks/types.d.ts:214-222
export interface ToolCallEvent {
    type: "tool_call";
    toolName: string;      // e.g. "bash", "edit", "write" — AND "goal"
    toolCallId: string;
    input: Record<string, unknown>;
}
```

**THE EVENT LIST + WHAT EACH CAN DO (AuditEnforcementRails, the hook table):**

| Event | Can CANCEL? | What it blocks | The verbatim evidence |
|---|---|---|---|
| `tool_call` | ★ **YES** | **ANY tool, incl. `goal(op=complete)`** | `ToolCallEventResult.block` — "If true, block the tool from executing"; `wrapper.ts:206-219` `if(callResult?.block) throw Error(reason)` |
| `tool_result` | NO (modify only) | rewrites content/details/isError | `ToolResultEventResult` — "modify tool results" |
| `turn_end` | NO (observe) | — | `TurnEndEvent:212-216` |
| `session_before_switch` | YES | the switch | `SessionBeforeSwitchResult.cancel` |
| `session_before_compact` | YES | the compaction | `SessionBeforeCompactResult` |
| `session_before_branch` | YES | the branch | `SessionBeforeBranchResult` |
| `session_before_tree` | YES | the tree op | `SessionBeforeTreeResult` |
| `context` | modifies messages | rewrites what the LLM sees | `ContextEventResult.messages` |
| `before_agent_start` | injects | adds context before the loop | `BeforeAgentStartEventResult` |
| `ttsr_triggered` | mid-stream abort | the TTSR engine's own event | `TtsrTriggeredEvent { rules: Rule[] }` |
| `goal_updated` | NO (observe) | — | emitted on goal state change |

## 2.3 · ★★ THE GT-1 FEASIBILITY PROOF (CAN a hook cancel `goal(complete)`?)

**VERDICT: YES. PROVEN MECHANICALLY. THREE INDEPENDENT PIECES OF EVIDENCE:**

```
EVIDENCE 1 — THE GOAL TOOL IS A NORMAL TOOL, WRAPPED BY THE SAME DISPATCH.
  goal-tool.ts:57   readonly name = "goal";   (registered as a normal AgentTool)
  wrapper.ts:206-215  this.tool.name dispatched through emitToolCall — UNCONDITIONALLY.
  ★ NO hidden-tool exemption: HIDDEN_TOOL_NAMES = ["yield","goal"] (builtin-names.ts:36) hides
    them from the MODEL'S tool list — it does NOT exempt them from the hook dispatch.

EVIDENCE 2 — THE HOOK DISPATCH FIRES FOR EVERY TOOL.
  hooks/runner.ts:325  async emitToolCall(event: ToolCallEvent): Promise<ToolCallEventResult | undefined> {
  ★ NO toolName filter in the dispatcher. Every hook's "tool_call" handlers run for every tool.

EVIDENCE 3 — THE CANCEL PATH (two forms, both converge to block).
  FORM A (documented):  return { block: true, reason: "..." }
  FORM B (throw):       throw new Error("...") → runner.ts:1133-1143 catches → {block:true, reason}
  runner.ts:1093-1124   handler timeout (30s) → FAIL-CLOSED {block:true}
  wrapper.ts:217-219    if (callResult?.block) throw Error(reason)   ← THE EXECUTION IS BLOCKED
  examples/extensions/README.md:80-84  documents {block:true, reason} as the canonical cancel.
```

**★ THE PRECEDENT IN THE CODEBASE ITSELF:** `gate-hook.ts:90` throws to cancel a `write`; `gate-hook.ts:149,152` throw to cancel T3/T2. **The same mechanism cancels `goal(complete)` — the handler just has to match `toolName==="goal" && input.op==="complete"`, which NO code does today.**

## 2.4 · THE GT-1 IMPLEMENTATION (the exact shape)

```ts
// THE GOAL-COMPLETION AUDIT GATE — the missing enforcement (PROPOSED, not built)
pi.on("tool_call", async (event) => {
  if (event.toolName !== "goal") return undefined;
  if (event.input.op !== "complete") return undefined;      // only the completion act
  const verdict = await runAuditGate();                      // qwen-code-audit | the pinned chain
  if (verdict.status !== "PASS") {
    return {
      block: true,
      reason: `AUDIT GATE: ${verdict.status} — ${verdict.summary}. ` +
              `Run /skill:qwen-code-audit and fix every critical/high finding before completing.`,
    };
  }
  return undefined;
});
```
**THE BUDGET CAVEAT:** the handler has a **30s timeout** (`runner.ts:1093-1124`). A full ocr run exceeds it. **The correct design: PRE-COMPUTE the audit (async, out-of-band), write `AUDIT GATE: PASS` to the ledger, and have the handler CHECK THE LEDGER (fast) rather than run the audit inline.**

**THE SECOND LAYER (the TTSR rule — for prose claims without the tool):**
```
A TTSR rule matching completion CLAIM prose ("done", "complete", "all green", "ship ready",
"goal complete") whose condition is "no `AUDIT GATE: PASS` line appears in this turn's tool
results" ⇒ abort the stream mid-token, inject: "RUN qwen-code-audit BEFORE claiming completion."
★ TTSR is NEEDED because an agent can CLAIM completion in PROSE without calling goal(complete).
  The hook alone covers only the tool act; the TTSR covers the claim.
★ TTSR surface: regex/AST rules that abort the stream, inject a reminder, retry from the same
  point; survives compaction; emits the `ttsr_triggered` event.
```

**★ THE LIVE STATE: TTSR rules are ABSENT on this host** (parked 6 files, live dirs 0 — BUILD_REPORT:893-895). `gate-hook.ts:149` even NAMES a TTSR abort (`GRAPH_GATE_ABORT`) **without a loaded rule to fire it** — the name without the mechanism.

---

# §3 · ITEM 3 — WHY THE CODE WAS SO SHITTILY BUILT

## 3.1 · THE DERAILMENT IN ONE SENTENCE

**From the project's own FAILURE_LOG:485 (verbatim):**
> *"I treated the 6 graph layers as a REGISTRATION PRECONDITION — a substrate to bring UP — instead of as THE INPUT TO EVERY DECISION. CONSEQUENCE: seven audit passes, ~90 findings, and the same structural classes recurring, because the only structural detector in the loop was a MODEL PAID PER FILE."*

## 3.2 · ★★★ THE MECHANICAL PROOF OF THE DERAILMENT (AuditBuildPackage)

**THE SPEC DESIGNED A DECISION LOOP. THE LIVE PATH NEVER CALLS IT.**
```
SPEC (blueprint §2, S0-S9 lifecycle): the fire-gate judges each action → a decision row →
                                        the oracle resolves laterTruth → calibration flips.
CODE (fire-gate.ts 44KB, oracle.ts 26KB, fire-ledger.ts 33KB, calibration.ts 8.9KB,
      kernel-v2.ts 23KB, policy-store.ts 18KB): ALL BUILT. ALL TESTED. 356/0.
LIVE (extension.ts): imports gate-hook.ts ONLY (extension.ts:10).
★ grep fire-gate|kernel-v2|enforcement|oracle in extension.ts → ZERO.
★ runKernelV2 → ZERO call sites.
★ THE v2.1 ADJUDICATION LOOP IS A TESTED LIBRARY *BESIDE* THE LIVE PATH, NOT *IN* IT.
```

**THE UNREACHABLE MODULES (AuditUnwiredStubs, the import graph):**
```
REACHABLE (11 of 23):  extension, gate-hook, gate-middleware, graph-gate, typed-write,
                       store-open, gi-registry, populate, populate-corbell,
                       populate-graphify, ripwire-bridge
UNREACHABLE (12 of 23): hard-deps, enforcement, kernel-v2, fire-gate, fire-ledger, graph-facts,
                        evidence-producer, oracle, policy-store, calibration, rsi, jev
★ 12 of 23 MODULES ARE DEAD ROOTS. The loud-crash register, the preflight, the whole
  v2.1 adjudication chain, the Jev judge, the RSI reflex layer — BUILT, TESTED, UNREACHABLE.
```

**THE IMPORT CHAIN THAT FOOLED EVERYONE:**
```
hard-deps.ts  ←imported by←  enforcement.ts:18   ★ the prior claim "imported by nothing" was
                                                  WRONG; it IS imported — by a module that is
                                                  ITSELF unreachable from extension.ts.
★ A DEAD-IMPORT-ROOT: the import exists, the live path is dead. The register is never called.
```

## 3.3 · THE SPEC-COVERAGE TABLE (what the build package demanded vs what shipped)

| Requirement (spec) | BUILT? | WIRED? | The evidence |
|---|---|---|---|
| The 6-layer graph stack | 1 of 6 | L6 only | store graphify-only, 1266 nodes |
| The hard-dependency law | YES (`hard-deps.ts` 17KB) | ★ NO | 0 importers from the live path |
| The loud-crash on every layer | PARTIAL | ★ NO | `preflight()` never called at init |
| The pre-act seat (Position A) | the plan 21KB | ★ NO | `grep preAct src/omp/` → no implementation |
| The post-detector filter (Position B) | YES (`kernel-v2.ts`) | ★ NO | `runKernelV2` zero call sites |
| FC-9 "silent-degrade" killed | ★ NO | — | `GI_NO_STORE` ALLOW+warn (then bypassed at the caller, §3.4) |
| FC-8 "accretion" killed | ★ NO | — | 29 docs commits vs 11 feat |
| The fire ledger | YES (33KB) | ★ NO | 0 rows written in prod |
| The oracle | YES (26KB) | ★ NO | 0 resolutions in prod |
| The calibration loop | YES | ★ NO | `calibrated:false` (W6 blocked) |
| The Jev judge | YES (`jev.ts`) | ★ NO | 10.3% call rate, ad-hoc |
| The RSI reflex layer | YES (`rsi.ts` 18KB) | ★ NO | ORPHAN — nobody imports it |

**★ THE PATTERN: THE MACHINERY WAS BUILT; THE WIRING WAS NOT. The spec asked for a RUNNING SYSTEM; the build produced a LIBRARY WITH GREEN TESTS.**

## 3.4 · THE NEW FINDING — G-9 (the fix that landed in the callee but not the caller)

```
THE FIX (2026-09-22):  gate-middleware.ts:85-90  !hasStore → cancel:true GI_NO_STORE  (fail-closed)
THE CALLER:            gate-hook.ts:~80  runGraphGate({ ..., hasStore: true })  ← HARDCODED true
★ THE FAIL-CLOSED REFUSAL IS DEAD FROM THE LIVE PATH: the caller asserts sight, so the
  no-store branch is UNREACHABLE. The fix landed in the callee; the call site bypasses it.
★ CLASS: THE CALLEE-FIX-WITHOUT-THE-CALLSITE — the same shape as V-08 (shipped-but-unreachable).
```

## 3.5 · HOW IT SHIPPED (the ship mechanism, step by step)

```
1 THE DOCS GREW       29 docs commits vs 11 feat — 3,316 ship-doc lines for 8,596 code lines.
2 THE TESTS CERTIFIED FIXTURES   31 suites, 0 against the deployed bundle.
3 THE AUDIT WAS BLOCKED  the ocr rail at 127.0.0.1:4098 refused → the ship proceeded.
4 THE GATE WAS NEARLY INERT  1 live firing in 40,631 lines.
5 THE GOAL CLOSED ON PROSE  completeGoalFromTool → status=complete on status checks alone.
★ THE SHIP WAS NOT A DECISION. IT WAS THE ABSENCE OF EVERY GATE AT ONCE.
```

---

# §4 · ITEM 4 — THE MECHANICAL GATES TO BUILD

## 4.1 · THE PRINCIPLE

**MAKE IT MECHANICALLY IMPOSSIBLE for a trash-quality ship to be allowed. A gate is only a gate if it BLOCKS.**

## 4.2 · THE GATE INVENTORY (GT-1..GT-8 — each with its exact landing site)

| # | Gate | What it blocks | Where it lands | Status |
|---|---|---|---|---|
| GT-1 | THE AUDIT GATE | any `goal(op=complete)` without `AUDIT GATE: PASS` | `pi.on("tool_call")` on `goal` + a TTSR rule | ★ FEASIBLE (proven §2.3) — NOT BUILT |
| GT-2 | THE SCOPE GATE | a graph query whose target is outside the populated tree | `GI_STORE_SCOPE_MISMATCH` in `graph-query` | ABSENT |
| GT-3 | THE FRESHNESS GATE | a query against a store older than the newest source | `storeFreshness` in every layer probe | EXISTS (`typed-write.ts:424`) — NEVER RUN |
| GT-4 | THE DEPLOY GATE | a ship claim when the deployed bundle ≠ source | an mtime compare in the completion path | ABSENT |
| GT-5 | THE LIVE-FIRING GATE | a claim that enforcement works, with no live firing measured | a firing count required in the ship docs | ABSENT |
| GT-6 | THE NO-FALLBACK GATE | any `ALLOW` produced by a missing substrate | `cancel:true` on `GI_NO_STORE` | ★ FIXED IN SOURCE, BYPASSED AT THE CALLER (G-9) |
| GT-7 | THE PREFLIGHT GATE | booting with a DOWN layer | `preflight()` at extension init | EXISTS (`kernel-v2.ts:69`) — NEVER CALLED |
| GT-8 | THE TEST-REALITY GATE | a battery whose tests never touch the live path | a live-path assertion count per suite | ABSENT |

## 4.3 · THE ROUND-1 → REVIEW → LOOP → SHIP PIPELINE (the operator's exact demand)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ THE SHIP PIPELINE — round 1 ships as a DRAFT, never as complete          │
├──────────────────────────────────────────────────────────────────────────┤
│ ROUND 1  BUILD      the wave branch (wave/Wn-<spec-wave>)                │
│          ↓                                                               │
│ GATE 1   PRE-COMMIT the LIVE battery + the deploy-freshness check        │
│          ↓          (src changed but dist stale ⇒ REJECT)                │
│ GATE 2   PRE-PUSH   the scope check + the wiring check                   │
│          ↓          (a loaded module not imported ⇒ REJECT)              │
│ GATE 3   PR         the AUDIT GATE (qwen-code-audit as a required check) │
│          ↓          (no AUDIT GATE: PASS ⇒ CANNOT MERGE)                 │
│ GATE 4   ALIGNMENT  semantica vs the build package                       │
│          ↓          (a contradicting decision ⇒ FLAGGED)                 │
│ GATE 5   MEANING    TSG: does the diff MEAN the spec wave?               │
│          ↓                                                               │
│ ROUND 2  REVIEW     the review DENIES; the agent cleans EVERY flaw       │
│          ↓          LOOPS back to ROUND 1                                │
│ ...      LOOP       until audit PASS + alignment CLEAN + meaning MATCH + │
│          ↓          live tests GREEN + the deploy bundle CURRENT         │
│ SHIP     the four conditions all true, mechanically checked              │
└──────────────────────────────────────────────────────────────────────────┘
```

**THE THREE TEST SURFACES THE SHIP REQUIRES (the operator's own words):**
```
SCRIPT     the battery — but LIVE-subject, not fixtures (the T1 law, §6)
CONTAINER  the isolated runtime (the deep-container-testing rig)
HOT-SEAT   the agent lives in the deployed instance (the meta-observation loop)
★ ALL THREE must be green. A ship claim on ONE surface is not a ship claim.
```

---

# §5 · ITEM 5 — THE FULL TEST INVENTORY (THE RIP-APART)

## 5.1 · THE SHAPE (AuditTestSuite, mechanical)

```
31 suites · 362 tests · 1,268 expect() calls
SUBJECT SPLIT:
  ★ 29 suites import module INTERNALS directly (fire-gate, kernel-v2, graph-gate, hard-deps,
    ledgers) against tmpdir fixtures — FIXTURE-SUBJECT.
  ★ 2 suites touch a live-shaped path: st-gi-graph-gate (end-to-end via registerGraphGate
    harness :125) + st-gi-v2-wiring (pi-harness :42-100) — BOTH use SYNTHETIC harnesses,
    NEVER the deployed bundle.
  ★ 0 suites import the deployed bundle. 0 assert store scope vs the live tree.
```

## 5.2 · THE PER-FILE TABLE (the 8 largest + the totals)

| File | Tests | Live-subject? | Theatrical class | The specific test that fails the law |
|---|---|---|---|---|
| st-gi-v21-hotseat.test.ts | 12 | NO | A (fixture-substitute) + F | named "hot-seat", driven by synthetic `aFire()` + stub judges — the NAME claims a runtime proof the body does not perform |
| st-gi-v21-wiring.test.ts | 10 | NO | C (source-string) | `:233` `test_gate_wiring_is_present` counts `l.includes("FireGate")` in SOURCE — a grep is not a wiring proof |
| st-gi-graph-gate.test.ts | 15 | PARTIAL | mixed | `:125` fires through `registerGraphGate` — but via a synthetic pi harness, never the deployed extension |
| st-gi-v2-deps.test.ts | 11 | NO | D (unwired-module) | tests `hard-deps` register mechanics on tmp paths — the module is unreachable from the live entry |
| st-gi-v2-wiring.test.ts | 4 | NO | D | `piHarness()` stands in for the real omp runtime |
| st-gi-v21-redteam.test.ts | 27 | NO | A | the A..M evasion corpus vs module internals with stub judges |
| st-gi-w44-highs.test.ts | 33 | NO | A + E | per-finding fixture asserts (LIMIT/cap, mtime, chmod, txn) |
| st-gi-v21-audit2.test.ts | 21 | NO | A | audit-finding fixtures |
| **TOTALS** | **362** | **0 deployed-bundle** | **A..G** | — |

## 5.3 · THE TWELVE MISSES (X-1..X-12) — VERIFIED AGAINST THE TEST SOURCE

| # | The miss | Verdict | The evidence |
|---|---|---|---|
| X-1 | The store described the WRONG TREE | ★ **CONFIRMED** | no test asserts store scope vs the live tree; all stores tmpdir-built |
| X-2 | The gate fired ONCE in 40,631 lines | **PARTIAL** | `:125` fires through handlers — but via a synthetic harness; the live-fire count is unasserted |
| X-3 | `graph_gate_state` = 0 rows | ★ **CONFIRMED** | `:164` asserts tmp-store persistence; nothing asserts the live handler CALLS saveGateState |
| X-4 | The ritual query purchased coverage | ★ **CORRECTED** | `:181-192` NOW passes `resolved:true`; the defect-encoding form is GONE; `:202-225` pins the resolved-vs-unresolved trio. The prior autopsy described the PRE-fix file |
| X-5 | `GI_NO_STORE` ALLOWED the edit | ★ **CORRECTED** | `st-gi-omp-gate.ts:42-45` now asserts `cancel:true`; `gate-middleware.ts:85-90` returns `cancel:true`. The old `cancel:false` survives only in a comment as history |
| X-6 | The deployed bundle was STALE | ★ **CONFIRMED** | zero suites compare the bundle mtime to source |
| X-7 | `hard-deps` was never called | ★ **CONFIRMED** | `grep hard-deps extension.ts` → No matches; tested only in `v2-deps` |
| X-8 | `preflight` was never called | ★ **CONFIRMED** | `grep preflight extension.ts` → No matches |
| X-9 | 5 of 6 layers were DOWN | ★ **CONFIRMED** | `v2-deps` asserts register mechanics; no test asserts a layer POPULATED in the live store |
| X-10 | The "hot-seat" suite was a FIXTURE suite | ★ **CONFIRMED** | 12 tests, synthetic records |
| X-11 | The wiring tests assert SOURCE STRINGS | ★ **CONFIRMED** | `:233` `includes("FireGate")` |
| X-12 | `graph-code-audit` was a stub; its alias passed | **CORRECTED** | `aether-code-audit` + alias share `aetherAuditExecute`; `GI_AUDIT_NOT_WIRED` fires only AFTER a real attempt (`:467-470`) — NOT a stub |

**★ THE HONESTY LAW APPLIED TO MY OWN PRIOR WORK: X-4 and X-5 were CORRECTED between the prior autopsy and now. The prior autopsy's claims about them were TRUE of the pre-fix file and are STALE now. Reporting a stale defect as current is the same class as the defects I am auditing.**

## 5.4 · THE SEVEN THEATRICAL TEST CLASSES (the taxonomy)

```
CLASS A · THE FIXTURE SUBSTITUTE        a suite named for a live proof, driven by fixtures
                                        (the hot-seat suite, X-10)
CLASS B · THE TEST THAT ENCODES THE DEFECT  a test asserting the bug as the contract
                                        (X-4, X-5 — the pre-fix forms; now corrected)
CLASS C · THE SOURCE-STRING ASSERTION   a test grepping source for a symbol name
                                        (X-11) — proves a string exists, not that it runs
CLASS D · THE UNWIRED-MODULE TEST       a thorough test of a module nothing imports
                                        (X-7, X-8) — passes forever, proves nothing live
CLASS E · THE SHAPE-ONLY ASSERTION      a test asserting a function's shape, not its effect
                                        (T-13's inverted clock, T-14's tautological reload)
CLASS F · THE INFLATED COUNT            a test asserting N from N firings, with no resolution
                                        (T-15) — would report perfect precision on zero evidence
CLASS G · THE STUB'S ALIAS              a stub tested under a second name (X-12)
```

**★★ THE PATTERN UNDER ALL SEVEN: THE TESTS EXERCISE THE MACHINERY'S INTERNALS, NEVER ITS WIRING INTO THE LIVE SESSION. 362 green tests, and not one asks: *is the store describing this tree? did the gate fire? was the register called?***

---

# §6 · ITEM 6 — THE TESTING FRAMEWORK + THE ENFORCEMENT RAILS

*(The full expansion is in `GI_kernel_v21_HARDENING_PLAN.md` §3–§6. The law and the mapping are here.)*

## 6.1 · THE UNIVERSAL TEST TEMPLATE (derived from the 12 anti-patterns)

**THE RULE: a test earns its place only if it can FAIL for a reason that matters. Every anti-pattern in §5 is a test that CANNOT fail meaningfully.**

**THE SEVEN LAWS OF A REAL TEST:**
```
T1 LIVE-SUBJECT LAW    the subject is the LIVE artifact (the deployed bundle, the real store,
                       the registered handler) — never a fixture standing in for it.
T2 WIRING LAW          the test asserts the CALL PATH, not the module's internals:
                       "the extension imports the register" / "the handler calls saveGateState"
                       — not "saveGateState works".
T3 SCOPE LAW           a test of a graph answer asserts the ANSWER IS ABOUT THE RIGHT SUBJECT
                       (the store describes this tree) — not merely that rows exist.
T4 NO-ENCODE-DEFECT LAW a test never asserts the buggy behavior as the contract. When a fix
                       fails an existing test, THE TEST IS A SUSPECT, not the fix.
T5 EFFECT-NOT-SHAPE LAW a test asserts an OBSERVABLE EFFECT (a row written, a fire logged, a
                       file changed) — never a shape or a count of calls.
T6 FRESHNESS LAW       a test of a substrate asserts its FRESHNESS (populated_at ≥ the newest
                       source mtime).
T7 FAIL-POLARITY LAW   a test of a failure path asserts the LOUD outcome (a named error),
                       never an allow.
```

**THE TEMPLATE (per suite):**
```
FOR EVERY MODULE THE EXTENSION LOADS:
  · a WIRING test: the extension imports it (grep the import graph, not the source string)
  · a LIVE test: it runs through the registered handler on a real edit
  · a PERSISTENCE test: its state lands in the store (assert the ROW, not the call)
  · a REFUSAL test: when its dependency is absent, it REFUSES by name (never allows)
FOR EVERY GRAPH ANSWER:
  · a SCOPE test: the target is in the populated tree, or GI_STORE_SCOPE_MISMATCH
  · a FRESHNESS test: populated_at ≥ the newest source mtime
FOR EVERY COMPLETION CLAIM:
  · an AUDIT test: the claim is accompanied by AUDIT GATE: PASS
```

## 6.2 · THE GIT RAILS — MEASURED STATE ON THIS HOST (AuditEnforcementRails)

| Rail | Available? | The mechanical evidence |
|---|---|---|
| L-GIT-1 PRE-COMMIT | ★ **NO** | `.git/hooks/` → 24 `.sample` files only; no live hook |
| L-GIT-2 PRE-PUSH | ★ **NO** | no scope/wiring check exists |
| L-GIT-3 PR-GATE | ★ **NO** | no `.github/workflows/`; the audit rail at 127.0.0.1:4098 is BLOCKED |
| L-GIT-4 ALIGNMENT | ★ **NO** | no CI; the L1 consumer (semantica) absent |
| L-GIT-5 WORKTREE | **PARTIAL** | git exists; ★ NO REMOTE (`.git/config` has `[core]`+`[user]` only) |

**★ THE RAILS ARE DESIGN-ONLY. The prior doc specified L-GIT-1..5; NONE exists as a mechanism.**

## 6.3 · SEMANTICA (the worktree-pinned decision layer)

**MEASURED: the semantica MCP server is PRESENT with 15 tools, and has ZERO code callers.**
```
THE 15 TOOLS: add_entity · add_relationship · delete_node · export_graph · extract_entities ·
              extract_relations · find_precedents · get_causal_chain · get_graph_analytics ·
              get_graph_summary · query_decisions · query_graph · record_decision ·
              run_reasoning · update_node
THE DESIGN (FULL_DOC §7.4): pin semantica to the worktree → precedent ("has this been decided?"),
              causal ("what did this cause?"), govern ("is this commit consistent?"), audit.
★ CODE CALLERS: ZERO. The integration is a DESIGN, not a mechanism.
```

## 6.4 · TSG (the dedicated decision-making kernel)

**MEASURED: TSG is INTERFACE-ONLY.**
```
hard-deps.ts:354-360   the register PROBES the TSG path (design)
hard-deps.ts:16        GRAPH_INFRA_REPOS_FOUND (the clone is present)
★ NO LoadUnit IMPLEMENTATION. `commandComponent` unused for TSG. PATH unverified.
★ The blueprint's own table says "TSG absent ⇒ REFUSE ALL". Nothing calls it → the absence
  is SILENT — the one place the loud-failure law is not upheld.
```

---

# §7 · THE CLOSURE

## 7.1 · THE SIX ANSWERS, IN ONE LINE EACH

```
1 GOAL LOOP    the completion sink (runtime.ts:470-494) checks STATUS ONLY; 8 checks (G-1..G-8)
               are absent; the audit is a tool nobody invokes.
2 CODE REVIEW  the audit rail was BLOCKED and the ship proceeded; a blocked gate that does not
               block is a theatrical gate. THE HOOK SURFACE CAN FIX IT: pi.on("tool_call") CAN
               cancel goal(complete) — PROVEN (3 evidences). GT-1 is buildable today.
3 DERAILMENT   the v2.1 loop is a tested library BESIDE the live path; 12 of 23 modules are dead
               roots; the spec's own FC-8 (accretion) + FC-9 (silent-degrade) were committed.
4 GATES        GT-1..GT-8; GT-3/GT-6/GT-7 exist but are never run/called/bypassed; GT-1 is the
               keystone and is now proven feasible.
5 TESTS        31 suites, 362 tests, ZERO against the deployed bundle; 7 theatrical classes;
               X-1/X-3/X-6/X-7/X-8/X-9/X-10/X-11 CONFIRMED, X-4/X-5 CORRECTED (already fixed).
6 FRAMEWORK    the 7 laws (T1..T7); the git rails are DESIGN-ONLY (no remote, samples-only
               hooks, no workflows); semantica present-never-called; TSG interface-only.
```

## 7.2 · THE HONEST VERDICT

**The machinery is real and largely sound (356/0, a working write/edit gate, named failures). The INTELLIGENCE LAYER — the entire point — is a tested library beside a live path that never calls it.** The build shipped because **every gate failed at once**: the completion sink checked nothing, the audit was blocked, the gate fired once, the tests certified fixtures, and the docs grew 2.6× the product. **The operator's charge is CONFIRMED at every point, with the correction that two defects (X-4/X-5) were already fixed before this audit.**

**The goal remains active.** `goal({op:"complete"})` stays a false claim.
