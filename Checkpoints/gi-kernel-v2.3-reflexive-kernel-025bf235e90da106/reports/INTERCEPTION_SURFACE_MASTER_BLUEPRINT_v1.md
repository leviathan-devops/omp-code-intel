# THE INTERCEPTION SURFACE — MASTER BLUEPRINT v1
## Where the goal loop can be intercepted, and how to insert audit criteria mechanically

**System:** the omp goal engine's interception points · **Date:** 2026-09-22 · **Version:** omp 17.2.12 (`@oh-my-pi/pi-coding-agent`) · **Type:** subsystem blueprint
**Method:** master-blueprint — locate → absorb → author → prove. Every anchor read THIS turn.
**Ingredients loaded:** engineering-report · extracting-production-boilerplates · show-me · ascii-diagrams.

---

# 1 · MACRO BLUEPRINT (the whole system on one page)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ THE GOAL LOOP — WHERE A CLAIM BECOMES A FACT, AND WHERE WE INTERCEPT     │
└──────────────────────────────────────────────────────────────────────────┘

  the agent decides "the goal is done"
        │
        ▼
  ┌─────────────────────┐   ★ INTERCEPT POINT ①  ── THE TOOL PATH
  │ calls goal(op=complete) │   (the tool call, pre-execution)
  └──────────┬──────────┘      a pi.on("tool_call") handler runs HERE,
             │                 returns {block:true} → the call NEVER runs
             ▼
  ┌──────────────────────────────────────────────────────────┐
  │ ★ THE UNGATED SINK — completeGoalFromTool (runtime.ts:470)│
  │   THREE status checks (goal exists · not complete · not  │
  │   dropped) → status="complete"                            │
  │   ★ ZERO VERIFICATION. THE AGENT'S PROSE IS THE ONLY INPUT│
  └──────────┬───────────────────────────────────────────────┘
             │
             ▼
      the goal closes (status=complete, mode=exiting)

  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  THE PROSE PATH (no tool call at all):
  the agent WRITES "all green, ship it" into its reply
        │
        ▼
  ┌─────────────────────┐   ★ INTERCEPT POINT ②  ── THE STREAM
  │ the TTSR engine     │   a regex/AST rule matches the CLAIM
  │ (mid-stream abort)  │   → abort the stream → inject → retry
  └─────────────────────┘
```

**★ THE TWO INTERCEPT POINTS, AND WHY BOTH ARE REQUIRED:**
```
① tool_call  catches the agent that EXECUTES completion (calls the tool)
② TTSR       catches the agent that only CLAIMS it in PROSE (no tool call)
★ THE GI KERNEL FAILED BECAUSE NEITHER EXISTED — completeGoalFromTool checks status only.
```

---

# 2 · LIFECYCLE SECTIONS (in execution order, cheapest checks first)

## 2.1 · THE GOAL STATE MACHINE (the 5 statuses, every transition)

```
  (none) ──create──▶ ┌────────┐ ◀──resume──┐
                     │ ACTIVE │            │
                     └───┬────┘            │
         ┌────────────────┼────────────────┐│
    complete           pause          budget-hit│
         ▼                ▼                ▼   │
   ┌──────────┐    ┌────────┐   ┌───────────────┐
   │ COMPLETE │    │ PAUSED │   │ BUDGET-LIMITED│
   └──────────┘    └────────┘   └───────────────┘
                    (resumable)     (resumable)
   ★ DROPPED (terminal) from ACTIVE/PAUSED

STATUSES   state.ts:3  "active" | "paused" | "budget-limited" | "complete" | "dropped"
```

| From → To | The method | file:line | The guard |
|---|---|---|---|
| (none) → ACTIVE | `createGoal` | `runtime.ts:361-379` | rejects if a non-dropped/non-complete goal exists |
| ACTIVE → ACTIVE | `replaceGoal` | `runtime.ts:381-397` | requires an active goal |
| PAUSED → ACTIVE | `resumeGoal` | `runtime.ts:399-414` | rejects if already complete |
| ACTIVE → PAUSED | `pauseGoal` | `runtime.ts:416-436` | — |
| ANY → DROPPED | `dropGoal` | `runtime.ts:438-459` | — |
| ★ ACTIVE → COMPLETE | `completeGoalFromTool` | `runtime.ts:470-494` | ★ **THREE STATUS CHECKS ONLY** |
| ACTIVE → BUDGET-LIMITED | `#flushUsageLocked` | `runtime.ts:340-345` | `tokensUsed >= tokenBudget` |
| BUDGET-LIMITED → ACTIVE | `onBudgetMutated` | `runtime.ts:255-283` | a budget raise |
| ACTIVE → PAUSED (auto) | `onTaskAborted` | `runtime.ts:199-226` | on interrupt |
| ACTIVE → PAUSED (reload) | `onThreadResumed` | `runtime.ts:228-253` | ★ a reload PAUSES, never silently resumes |

## 2.2 · ★ THE COMPLETION SINK (the hole, verbatim — the place to gate)

```ts
// src/goals/runtime.ts:470-494
async completeGoalFromTool(): Promise<Goal> {
    return await this.#withAccounting(async () => {
        await this.#flushUsageLocked("suppressed");
        const state = this.#getStateClone();
        if (!state?.goal) throw new Error("cannot complete goal because no goal is active");
        if (state.goal.status === "complete") throw new Error("goal is already complete");
        if (state.goal.status === "dropped") throw new Error("cannot complete a dropped goal");
        state.enabled = false;
        state.goal.status = "complete";        // ← ★ THE CLAIM BECOMES FACT HERE
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
**★ THE GATE GOES BEFORE LINE 470 — either in the hook (intercept ①) or inside this function (the patch).**

## 2.3 · THE MODEL-FACING CONTRACT (the only "verification" — it is PROSE)

```
src/prompts/tools/goal.md, verbatim:
  "- `complete` marks the goal complete after you have verified every deliverable against
     current evidence."
  "NEVER call `complete` because a budget is low or a turn is ending. Call it only when the
   goal is actually done and verified."
★ THE ENTIRE COMPLETION VERIFICATION IS A SENTENCE IN A PROMPT. It has failed once already.
```

## 2.4 · THE TOOL DISPATCH PATH (the wrapper — every hop)

```
execute(params)                                          wrapper.ts:195-243
  ├─ 0. user policy check (deny → throw)
  ├─ 1. ★ EMIT tool_call                                 wrapper.ts:205-215
  │       if (callResult?.block) throw Error(reason)     wrapper.ts:217-219 
  │       if (callResult?.input) effectiveParams = ...   wrapper.ts:224-226
  ├─ 2. approval gate (against effectiveParams)
  └─ 3. this.tool.execute(effectiveParams)
```

---

# 3 · DISPATCH TRACES (every hop of every interception surface)

## 3.1 · TRACE A — THE TOOL PATH (intercept ①)

```
the model calls goal{op:"complete"}
  → omp builds the tool call, resolves the tool by name "goal"
  → wrapper.execute() runs                                            wrapper.ts:195
  → if (this.runner.hasHandlers("tool_call"))                          wrapper.ts:205
  → runner.emitToolCall({type:"tool_call", toolName:"goal",           wrapper.ts:207-215
                         toolCallId, input:{op:"complete"}})
  → ★ OUR HANDLER runs  →  reads .trident/audit-ledger.json  →  returns
       {block:true, reason:"AUDIT GATE: FAIL …"}
  → if (callResult?.block) throw new Error(reason)                     wrapper.ts:217-219
  → ★ THE THROW PROPAGATES → the tool NEVER executes → completeGoalFromTool NEVER runs
  → the error text returns to the model: "Extension … failed: AUDIT GATE: FAIL …"
★ THE CALLER (the model) SEES THE BLOCK AND MUST FIX.
```

## 3.2 · TRACE B — THE PROSE PATH (intercept ②)

```
the model emits "…and the goal is complete, all green."
  → the TTSR engine (mid-stream) matches the rule's pattern
  → the stream ABORTS mid-token
  → the rule body is INJECTED as a system reminder
  → generation RETRIES from the same point
★ THE MODEL COURSE-CORRECTS WITHIN THE SAME TURN — no second turn needed.
```

## 3.3 · TRACE C — THE PATCH PATH (intercept ③, the deepest)

```
goal{op:"complete"} → GoalTool.execute                                goal-tool.ts:82
  → runtime.completeGoalFromTool()                                    runtime.ts:470
  → ★ a PATCHED precondition: this.#host.getCompletionGate?.()
  → gate(goal) returns {ok:false, reason}  →  throw GOAL_COMPLETION_REFUSED
★ UNBYPASSABLE — no hook config, no --no-verify. THE COST: a vendored-dependency patch.
```

---

# 4 · TYPES + ENGINE CHECKS (the contracts verbatim)

```ts
// dist/types/extensibility/hooks/types.d.ts:214-222 — the event
export interface ToolCallEvent {
    type: "tool_call";
    toolName: string;      // "goal" INCLUDED — no hidden-tool exemption
    toolCallId: string;
    input: Record<string, unknown>;
}

// dist/types/extensibility/shared-events.d.ts:234-236 — the result
export interface ToolCallEventResult {
    /** If true, block the tool from executing */
    block?: boolean;
    /** Reason for blocking (returned to LLM as error) */
    reason?: string;
    /** Replacement input the tool executes with… Ignored when `block` is true. */
    input?: Record<string, unknown>;
}

// dist/types/extensibility/hooks/types.d.ts:194-205 — the goal tool's input
const goalSchema = {
  op: "create" | "get" | "complete" | "resume" | "drop",
  objective?: string,
  token_budget?: number,
};
```

**THE ENGINE CHECKS (in execution order):**
```
1 wrapper.ts:200  policy deny → throw
2 wrapper.ts:205  hasHandlers("tool_call") → emit
3 wrapper.ts:217  callResult.block → throw          ★ THE CANCEL
4 wrapper.ts:224  callResult.input → replace params
5 wrapper.ts:243  approval policy deny → throw
6 wrapper.ts:~250 this.tool.execute(effectiveParams)
7 goals/runtime.ts:470  the sink — THREE status checks
```

---

# 5 · INVOKE PSEUDOCODE (per mechanism)

```
THE AUDIT GATE HANDLER (intercept ①)
  inputs:  event{toolName, input}
  outputs: {block:true, reason} | undefined
  ─────────────────────────────────────────────────────
  if event.toolName is not "goal":           return undefined
  if event.input.op is not "complete":       return undefined
  row = read the audit ledger (the LAST row)
  if row is absent:                          return {block:true, "AUDIT GATE: ABSENT"}
  if row.verdict is not "PASS":              return {block:true, "AUDIT GATE: FAIL"}
  if row.bundleSha differs from the dist:    return {block:true, "AUDIT GATE: STALE"}
  return undefined      ← ★ PASS: the completion proceeds
```

```
THE TTSR RULE (intercept ②)
  inputs:  the stream tokens
  outputs: abort+inject | pass-through
  ─────────────────────────────────────────────────────
  if a completion-claim phrase appears:      → check the condition
  if no "AUDIT GATE: PASS" in this turn's tool results:  → ABORT + INJECT
  else:                                      → pass
```

```
THE CHAIN RUNNER (the audit's input — the 8-rung walk)
  inputs:  the review target
  outputs: a verdict JSON | BLOCKED
  ─────────────────────────────────────────────────────
  ensure rung 1 (the 4098 adapter) is UP; if down, START it
  for each of the 8 rungs (in order):
    if the rung is exiled (429 <45s):        skip
    out = ocr review --provider <rung>
    if out.status in (complete, partial):    return out        ★ THE WINNER
    else:                                    exile the rung; next
  return BLOCKED (all 8 dead)                                  ← the loud end
```

---

# 6 · TREES

```
THE GOAL ENGINE (src/goals/)
  └── @oh-my-pi/pi-coding-agent v17.2.12 (goal-tool.ts:57 · runtime.ts:521)
        ├── GoalTool (the tool)                    tools/goal-tool.ts
        │     ├── name = "goal"                    :57
        │     ├── execute → the runtime dispatch   :82
        │     └── the 5 ops (create|get|complete|resume|drop)
        ├── GoalRuntime (the state machine)        runtime.ts:127
        │     ├── createGoal / replaceGoal / resumeGoal
        │     ├── pauseGoal / dropGoal
        │     ├── completeGoalFromTool ★ THE SINK   :470
        │     └── onTaskAborted / onThreadResumed
        └── state.ts (the types)

THE INTERCEPTION SURFACE (what we can hook)
  └── extension.ts (the live entry)
        ├── registerGraphGate(pi)                  :601
        └── ★ registerAuditGate(pi)  ← THE NEW WIRE
              └── pi.on("tool_call") → the audit gate
```

---

# 7 · LAWS + INVARIANTS

```
L1  THE DEEPEST INTERCEPT WINS. tool_call (the tool path) is stronger than TTSR (the prose
    path) — but the prose path covers what the tool path cannot see. SHIP BOTH.
L2  A HOOK IS ONLY AS STRONG AS ITS HOOK POINT. If omp changes the dispatch, the hook dies.
    ★ THE PATCH (intercept ③) IS THE ONLY UNBYPASSABLE LAYER.
L3  NEVER RUN THE AUDIT INLINE IN THE HOOK. The handler budget is 30s (runner.ts:1093-1124);
    a full ocr run is 1m25s+. THE LEDGER PATTERN IS MANDATORY.
L4  A BLOCKED DEPENDENCY IS A STARTUP TASK, NEVER A VERDICT. (The 4098 outage: a 2-second
    restart skipped the whole session's audit.)
L5  HIDDEN_TOOL_NAMES ≠ HOOK EXEMPTION. ["yield","goal"] hides them from the MODEL, not from
    the dispatch. VERIFIED: wrapper.ts:206 has no filter.
L6  THE GATE MUST BE FAIL-CLOSED. A missing ledger → block. A stale bundle → block.
L7  A GENERIC GATE PREEMPTING A SPECIFIC ONE = UNOBSERVED, NEVER PASS.
```

---

# 8 · ERROR VOCABULARY + SHEMA + SHELL

```
THE FROZEN TOKENS:
  AUDIT GATE: PASS      the ledger's latest verdict, 0 critical/high
  AUDIT GATE: FAIL      any critical/high
  AUDIT GATE: ABSENT    no run recorded
  AUDIT GATE: BLOCKED   all 8 rungs dead
  AUDIT GATE: STALE     the audit's bundleSha ≠ the dist
  GOAL_COMPLETION_REFUSED  the patch path (intercept ③)

THE LEDGER SCHEMA (.trident/audit-ledger.json — append-only):
  { "ts": ISO, "verdict": "PASS|FAIL|BLOCKED", "summary": "0 critical, 0 high",
    "bundleSha": sha256, "sourceSha": sha256,
    "scenarios": [{"id":"A1","passTokenMatch":true,"failTokenAbsent":true,"verdict":"PASS"}] }

THE MINIMAL SHELL (a builder starts here):
  #!/usr/bin/env bash
  # ocr-chain — walk all 8 rungs; the first JSON verdict wins.
  RUNGS=(muse-free opencode-go-muse poolside-laguna-s poolside-laguna-xs \
         openrouter-laguna-s-free openrouter-laguna-xs-free nvidia-nemotron openrouter-nemotron-free)
  for p in "${RUNGS[@]}"; do
    out=$(timeout 900 ocr review --provider "$p" --effort high --format json 2>/dev/null)
    if printf '%s' "$out" | grep -qE '"status"\s*:\s*"(complete|partial|success)"'; then
      printf '%s' "$out"; exit 0; fi
  done
  echo "AUDIT GATE: BLOCKED" >&2; exit 1
```

---

# 9 · BACKWARDS MAP + PROVENANCE

| The source component | The blueprint section | file:line |
|---|---|---|
| ToolCallEvent | §4 | dist/types/extensibility/hooks/types.d.ts:214 |
| ToolCallEventResult | §4 | dist/types/extensibility/shared-events.d.ts:234 |
| the dispatch + the cancel | §2.4, §3.1 | wrapper.ts:195-243 |
| the sink | §2.2 | goals/runtime.ts:470-494 |
| the state machine | §2.1 | goals/runtime.ts + state.ts:3 |
| the model-facing contract | §2.3 | prompts/tools/goal.md |
| the hook API (24 events) | §4, §7 | dist/types/extensibility/hooks/types.d.ts:326 |
| the 4098 adapter | §5 | ~/.omp/run/adapters/zen-free-adapter.mjs |
| the ocr chain | §5, §8 | ~/.opencodereview/config.json |

**THE VARIANT TABLE (the goal engine's provenance):**
| Variant | Origin | Verdict |
|---|---|---|
| `Michaelliv/pi-goal` (223★, MIT) | the upstream extension (3 tools: create/get/update) | the ANCESTOR |
| `@oh-my-pi/pi-coding-agent` v17.2.12 | the omp NATIVE PORT (1 tool, 5 ops) | ★ THE WINNER |
| the delta | 3 tools → 1 op-field tool; `dropped` added; the runtime moved in-tree | documented above |

**THE RE-HOST GUIDE (how to reproduce the interception):**
```
1 add src/omp/audit-gate.ts (the handler, §5 pseudocode)
2 wire it: extension.ts:601 — after registerGraphGate(pi)
3 add the ledger writer (scripts/run-audit.sh → .trident/audit-ledger.json)
4 add the TTSR rule (the prose path)
5 VERIFY: a goal(complete) with a FAIL ledger → blocked (a test)
6 VERIFY: kill rung 1 → the chain still answers (the adversarial proof)
```

**WHAT WAS LEFT OUT:** the vendor-patch path (intercept ③) is DESIGNED, not applied — a
vendored-dependency patch. The recommended route is the UPSTREAM request (omp's PRs are open).

**THE BATTERY VERDICT:** all anchors read THIS turn; the cancel proven 3 ways; the sink read
verbatim; the 4098 fix PROVEN (an ocr scan returned `status:success`).
