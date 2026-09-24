# THE GOAL LOOP — FULL LIFECYCLE, HOOK SURFACE, AND HARDENING MAP
## omp's native goal engine: how it is wired, what we can hook, how to replace it

**Date:** 2026-09-22 · **Subject:** `@oh-my-pi/pi-coding-agent` v17.2.12 (`src/goals/`) · **Upstream:** `Michaelliv/pi-goal` (223★) → forked into omp · **Host:** `can1357/oh-my-pi` (32,394★)
**Method:** every claim carries a `file:line` or a raw command output.

---

# §0 · THE RAIL — WHAT WAS BROKEN (F-61 root-caused)

## 0.1 · THE MISDIAGNOSIS IN MY OWN PRIOR DOC

```
THE PRIOR DOC SAID:   "F-61 — the audit rail at 127.0.0.1:4098 was refused (BLOCKED)."
THE TRUTH:            the rail was NOT broken. THE ADAPTER WAS NOT RUNNING.
```

## 0.2 · THE MECHANICAL ROOT CAUSE

```
ocr config (~/.opencodereview/config.json):
  "muse-free": { "url": "http://127.0.0.1:4098/zen/v1", "protocol": "openai-responses",
                 "model": "muse-spark-1.3-contributor-free" }
★ 4098 IS THE ADAPTER — NOT the raw proxy.

WHAT LISTENS:
  4097  → the LIVE go-session-proxy (pid 2847, /home/leviathan/OPENCODE_WORKSPACE/.mimocode/
          go-session-proxy.mjs). It answers 200 on /zen/v1/models.
  4098  → ★ NOTHING. Connection refused.

WHY AN ADAPTER IS REQUIRED (the two hard incompatibilities):
  1  go-session-proxy enforces the 4-GATE FINGERPRINT on POST /zen/v1 *-free:
     UA "opencode/1.18.31" · x-opencode-session "ses_[0-9a-f]{12}[b62]{14}" ·
     tools MUST include bash/glob/grep/read · stream:true.  ocr sends NONE of it.
  2  the free route FORCES SSE; ocr's client cannot decode text/event-stream.
★ THE ADAPTER (7486 B, ~170 lines) injects the gates, forwards to 4097, consumes the SSE,
  and returns the assembled `response.completed` JSON with a SYNTHESIZED `output_text`.
```

## 0.3 · THE FIX (applied + PROVEN)

```
THE FILE:   ~/.omp/run/adapters/zen-free-adapter.mjs   (exists, 7486 B, Sep 21 12:24)
THE STATE:  ★ NOT RUNNING (died with a reboot — the skill warned about exactly this:
            "the original lived at /tmp/zen-free-adapter.mjs and died with a reboot")
THE FIX:    hub op:"start" name:"zen-free-adapter"  →  ready:{port:4098}  (SUPERVISED, not a bare &)
RESULT:     ready pid=2141352 uptime=157ms

THE PROBE (verbatim):
  curl POST 4098/zen/v1/responses {model:"muse-spark-1.3-contributor-free",input:"Reply with exactly: RAIL_OK"}
  → output_text: 'RAIL_OK'   status: completed
```

## 0.4 · ★★ THE GATE PROVEN END-TO-END (the real ocr run)

```
ocr scan --provider muse-free --timeout 30 --concurrency 2 --format json --path src/omp/gate-hook.ts
→ {
    "status": "success",
    "llm": { "provider": "muse-free", "model": "muse-spark-1.3-contributor-free" },
    "summary": { "files_reviewed": 1, "comments": 9, "total_tokens": 30352, "elapsed": "1m25s" },
    "tool_calls": { "total": 1, "failure": 0 }
  }
★ THE RAIL WORKS. The gate is NO LONGER BLOCKED.
```

**★ AND THE FIRST REAL FINDING (the gate earning its keep immediately):**
```
src/omp/gate-hook.ts — "Shared `pendingSteer` race: single closure variable is overwritten by
interleaved/concurrent tool_calls, so a steer for file A can be attached to file B's tool_result
or lost if a non-edit call clears it. Use a per-call correlation map (sessionId + toolCallId)."
★ THIS IS A CONCURRENCY DEFECT IN THE LIVE GATE — found by the rail that was "BLOCKED".
```

## 0.5 · THE LESSON (the anti-pattern this is)

```
THE CLASS:      a BLOCKED gate reported as a permanent state instead of a STARTUP TASK.
THE ERROR:      "the rail is refused" → the ship proceeds. THE RAIL NEEDED A 2-SECOND RESTART.
THE LAW:        a BLOCKED dependency is a TASK TO COMPLETE, never a verdict. The question is
                "what starts it?" — never "it is blocked, ship anyway."
★ F-61 WAS NEVER A BLOCKER. IT WAS AN UNSTARTED PROCESS. THE WHOLE SESSION'S AUDIT GATE WAS
  SKIPPED OVER A MISSING `hub start`.
```

---

# §1 · THE GOAL LIFECYCLE (the full state machine, as wired)

## 1.1 · THE PROVENANCE (what omp imported)

```
UPSTREAM:  Michaelliv/pi-goal (223★, MIT, TypeScript) — "Persistent autonomous goals for pi"
           .pi/extensions/pi-goal/{index.ts,goal-state.ts,usage.ts}
THE FORK:  omp NATIVE-PORTED it into `src/goals/` (not an extension — first-class engine):
             src/goals/runtime.ts          the GoalRuntime class (521 lines)
             src/goals/state.ts            the types (Goal, GoalModeState, GoalStatus)
             src/goals/tools/goal-tool.ts  the `goal` AgentTool
             src/goals/index.ts            the barrel
           wired at src/tools/index.ts:448  `goal: s => new GoalTool(s)`
           runtime host at src/sdk.ts:1721  `getGoalRuntime: () => session?.goalRuntime`
★ omp REWROTE the upstream's 3 tools (create_goal/get_goal/update_goal) into ONE tool with an
  `op` field (create|get|resume|drop|complete) — a cleaner surface. The lifecycle is the same.
```

## 1.2 · ★ THE STATE MACHINE (the complete map)

```
                        ┌──────────────────────────────────────────────┐
                        │           THE GOAL STATE MACHINE             │
                        └──────────────────────────────────────────────┘

  (none) ──create──▶ ┌────────┐
                     │ ACTIVE │◀────resume────┐
                     └───┬────┘               │
                         │                    │
        ┌────────────────┼────────────────┐   │
        │                │                │   │
   complete           pause          budget hit│
        │                │                │   │
        ▼                ▼                ▼   │
   ┌──────────┐    ┌────────┐    ┌───────────────┐
   │ COMPLETE │    │ PAUSED │    │ BUDGET-LIMITED│
   └──────────┘    └────────┘    └───────────────┘
        │                │                │
     (terminal)      (resumable)      (resumable via onBudgetMutated)
        │
   ┌─────────┐
   │ DROPPED │  ← drop, from ACTIVE or PAUSED
   └─────────┘
     (terminal)

  STATUSES (state.ts:3):  "active" | "paused" | "budget-limited" | "complete" | "dropped"
  ★ NOTE: omp ADDS "dropped" (upstream pi-goal has only 4: active|paused|budget_limited|complete).
```

## 1.3 · THE TRANSITIONS (each with its file:line)

| From → To | The method | The file:line | What it checks |
|---|---|---|---|
| (none) → ACTIVE | `createGoal` | `runtime.ts:361-379` | rejects if a non-dropped/non-complete goal exists |
| ACTIVE → ACTIVE (replace) | `replaceGoal` | `runtime.ts:381-397` | requires an active goal |
| PAUSED → ACTIVE | `resumeGoal` | `runtime.ts:399-414` | rejects if already complete |
| ACTIVE → PAUSED | `pauseGoal` | `runtime.ts:416-436` | — |
| ANY → DROPPED | `dropGoal` | `runtime.ts:438-459` | — |
| ★ ACTIVE → COMPLETE | `completeGoalFromTool` | `runtime.ts:470-494` | ★ **THREE STATUS CHECKS ONLY** |
| ACTIVE → BUDGET-LIMITED | `#flushUsageLocked` | `runtime.ts:340-345` | `tokensUsed >= tokenBudget` |
| BUDGET-LIMITED → ACTIVE | `onBudgetMutated` | `runtime.ts:255-283` | a budget raise |
| ACTIVE → PAUSED (auto) | `onTaskAborted` | `runtime.ts:199-226` | on interrupt |
| ACTIVE → PAUSED (reload) | `onThreadResumed` | `runtime.ts:228-253` | ★ a reload PAUSES, never silently resumes |

## 1.4 · ★★ THE COMPLETION SINK (the hole, verbatim)

```ts
// src/goals/runtime.ts:470-494 — completeGoalFromTool
async completeGoalFromTool(): Promise<Goal> {
    return await this.#withAccounting(async () => {
        await this.#flushUsageLocked("suppressed");
        const state = this.#getStateClone();
        if (!state?.goal) throw new Error("cannot complete goal because no goal is active");
        if (state.goal.status === "complete") throw new Error("goal is already complete");
        if (state.goal.status === "dropped") throw new Error("cannot complete a dropped goal");
        state.enabled = false;
        state.goal.status = "complete";        // ← THE CLAIM BECOMES FACT
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
**★ THE THREE PRECONDITIONS ARE ALL STATUS CHECKS. NONE IS A VERIFICATION. THE AGENT'S PROSE IS THE ONLY INPUT.**

## 1.5 · ★ THE MODEL-FACING CONTRACT (the only "verification" — it is PROSE)

**The tool's own description (`src/prompts/tools/goal.md`, verbatim):**
```
- `complete` marks the goal complete after you have verified every deliverable against
  current evidence.
...
NEVER call `complete` because a budget is low or a turn is ending. Call it only when the goal
is actually done and verified.
```
**★ THE ENTIRE COMPLETION VERIFICATION IS A SENTENCE IN A PROMPT. There is no mechanism. This is the prose-claim sink: the model is *asked* to verify, and the loop *trusts* the answer.**

**The continuation prompt (upstream pi-goal, `index.ts`, verbatim) — the audit instruction:**
```
Before deciding that the goal is achieved, perform a completion audit against the actual current state:
- Restate the objective as concrete deliverables or success criteria.
- Build a prompt-to-artifact checklist...
- Inspect the relevant files, command output, test results, PR state, or other real evidence...
- Do not accept proxy signals as completion by themselves...
- Treat uncertainty as not achieved...
```
**★ A WELL-WRITTEN PROMPT. AND IT IS STILL ONLY A PROMPT — the same class as the audit "skill" that nothing enforced.**

---

# §2 · THE HOOK SURFACE (the complete map — what we can intercept)

## 2.1 · ★★ THE TOOL DISPATCH (the key mechanism)

```
THE CALL PATH (wrapper.ts:204-243, verbatim structure):
  execute(params)
    ├─ 0. user policy check (deny → throw)
    ├─ 1. ★ EMIT tool_call  ← THE HOOK FIRES, for EVERY tool
    │       if (callResult?.block) throw Error(reason)  ← ★ THE CANCEL
    ├─ 2. approval gate (against effectiveParams)
    └─ 3. this.tool.execute(effectiveParams)

★ THE DISPATCH HAS NO toolName FILTER (wrapper.ts:206-215). `this.tool.name` is passed
  unconditionally — INCLUDING `goal`. The hook sees EVERY tool.
```

## 2.2 · THE COMPLETE EVENT TABLE (24 events, from docs/hooks.md + the types)

| Event | Cancel? | The exact contract | The use for our hardening |
|---|---|---|---|
| ★ `tool_call` | ★ **YES** | `{block?, reason?, input?}` — "if any handler returns {block:true}, execution stops"; "if handler throws, wrapper fails closed and blocks" | ★ **GT-1: match `goal`+`op=complete` → block** |
| `tool_result` | modify | `{content?, details?, isError?}` | GT-5: append the audit advisory |
| `turn_end` | observe | — | GT-5: account the turn's live firings |
| `context` | modify | `{messages?}` — chained | inject the audit reminder into context |
| `before_agent_start` | inject | `{message?}` | inject the completion contract |
| `session_start` | observe | — | GT-7: run the preflight on boot |
| `session_before_switch` | ★ YES | `{cancel?}` | block a switch with a dirty goal |
| `session_before_compact` | ★ YES | `{cancel?, compaction?}` | preserve the goal state across compaction |
| `session.compacting` | modify | `{context?, prompt?}` | keep the objective in the compaction |
| `session_before_branch` | ★ YES | `{cancel?, skipConversationRestore?}` | — |
| `session_before_tree` | ★ YES | `{cancel?, summary?}` | — |
| `session_shutdown` | observe | — | flush the audit ledger |
| `agent_start` / `agent_end` | observe | — | GT-5: the firing count per agent run |
| `turn_start` | observe | — | — |
| `auto_compaction_start/end` | observe | — | — |
| `auto_retry_start/end` | observe | — | — |
| `ttsr_triggered` | observe | `{rules: Rule[]}` | ★ the mid-stream abort (the SECOND layer) |
| `todo_reminder` | observe | `{todos, attempt, maxAttempts}` | — |

**★ AND WHAT CANNOT BE HOOKED (measured, the limits):**
```
✗ eval prelude invocations (browser.open, tab.run, computer.run) — HOST BRIDGE calls, not
  AgentTool calls: "they do not emit tool_call or tool_result" (docs/hooks.md, verbatim).
✗ the goal STATE MACHINE internals — there is NO `goal_updated` hook (only the runtime EVENT
  `goal_updated` emitted to the host, state.ts:24 — not a pi.on subscription).
✗ execution continuation after a thrown tool error — "error path rethrows".
★ SO THE ONLY INTERCEPTION POINT FOR goal(complete) IS `tool_call`. WHICH IS ENOUGH — it CAN block.
```

## 2.3 · ★★ THE CANCEL PROOF (three independent evidences, re-verified)

```
(a) THE GOAL TOOL IS A NORMAL TOOL
    goal-tool.ts:57     readonly name = "goal";
    goal-tool.ts:47-56  implements AgentTool<typeof goalSchema, GoalToolDetails>
    tools/index.ts:448  goal: s => new GoalTool(s)     ← registered in the tool map
    ★ HIDDEN_TOOL_NAMES = ["yield","goal"] (builtin-names.ts:36) — this hides them from the
      MODEL'S tool LIST, NOT from the hook dispatch.

(b) THE DISPATCH FILTERS NOTHING
    wrapper.ts:206  if (!loopEmittedToolCall && this.runner.hasHandlers("tool_call")) {
    wrapper.ts:207-215  emitToolCall({ type:"tool_call", toolName:this.tool.name, toolCallId, input })
    ★ `this.tool.name` — no allowlist, no exemption.

(c) THE CANCEL PATH (two forms)
    FORM A:  return { block: true, reason: "..." }
             wrapper.ts:217-219  if (callResult?.block) { const reason = ...; throw new Error(reason); }
    FORM B:  throw new Error("...")
             wrapper.ts:232-238  catch (err) { if (err instanceof Error) throw err; ... }
             → the throw propagates → the tool NEVER executes.
    ★ AND hooks/runner.ts:1093-1143 (the extension runner) converts a handler throw to
      {block:true, reason} with a 30s fail-closed timeout.
```

**★ VERDICT (unchanged, now re-proven): `pi.on("tool_call")` CAN CANCEL `goal(op=complete)`. The handler must match `toolName==="goal" && input.op==="complete"` — WHICH NO CODE DOES TODAY.**

## 2.4 · WHERE THE HOOKS LIVE ON THIS HOST

```
DISCOVERY (docs/hooks.md, verbatim):
  project:  <cwd>/.omp/hooks/pre/*.{ts,js}  and  <cwd>/.omp/hooks/post/*.{ts,js}
  user:     ~/.omp/agent/hooks/pre/*.{ts,js} and ~/.omp/agent/hooks/post/*.{ts,js}
★ ★ A FACTORY PLACED DIRECTLY IN hooks/ IS NOT DISCOVERED — it must be in pre/ or post/.
  "<cwd>/.omp/hooks/psy-guards.ts (no pre//post/ subdirectory) loads nothing and reports no error."
★ THE EXTENSION ROUTE (what GI ALREADY USES): a registered extension's default factory receives
  `pi` and calls pi.on(...) — extension.ts:601 registerGraphGate(pi). THIS PATH WORKS.
★ --hook IS AN ALIAS FOR --extension in the current runtime.
```

---

# §3 · ★ THE HARDENING MAP (how to modify this for our needs)

## 3.1 · THE FOUR INTERVENTION LAYERS (in order of strength)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ LAYER 1 — THE HOOK (pi.on tool_call)   ★ THE ONLY ENFORCEMENT LAYER      │
│   can do: BLOCK the completion · REWRITE the input · inject a message    │
│   lands:  an extension (extension.ts) or <cwd>/.omp/hooks/pre/*.ts       │
│   shape:  match goal+op=complete → read the audit → {block:true}         │
├──────────────────────────────────────────────────────────────────────────┤
│ LAYER 2 — THE TTSR RULE (mid-stream abort)  ★ THE PROSE-CLAIM COVER      │
│   can do: abort the stream MID-TOKEN, inject the rule, retry             │
│   shape:  match "goal complete|all green|ship ready" prose +             │
│           condition "no AUDIT GATE: PASS in this turn's tool results"    │
│   ★ REQUIRED: an agent can CLAIM completion in PROSE without the tool.   │
├──────────────────────────────────────────────────────────────────────────┤
│ LAYER 3 — THE ENGINE PATCH (fork the goal engine)   ★ THE DEEPEST        │
│   can do: change completeGoalFromTool — add a real precondition          │
│   lands:  node_modules/@oh-my-pi/.../src/goals/runtime.ts                │
│   ★ COST: a vendored-dependency patch (lost on upgrade).                 │
│   ★ BENEFIT: the sink closed AT THE SOURCE — no hook can bypass.         │
├──────────────────────────────────────────────────────────────────────────┤
│ LAYER 4 — THE PROMPT (the model-facing contract)     ★ THE WEAKEST       │
│   can do: ASK the model to verify (what exists today)                    │
│   ★ THIS IS NOT ENFORCEMENT. It is the current state, and it failed.     │
└──────────────────────────────────────────────────────────────────────────┘

## 3.2 · ★ THE RECOMMENDED BUILD (Layer 1 + Layer 2, then Layer 3 if needed)

### 3.2.1 · LAYER 1 — THE AUDIT GATE HOOK (the exact code)

```ts
// src/omp/audit-gate.ts — the NEW module (the missing enforcement)
import type { HookAPI } from "@oh-my-pi/pi-coding-agent";
import { readFileSync, existsSync } from "node:fs";

const LEDGER = "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/.trident/audit-ledger.json";

function latestVerdict(): { verdict: string; summary: string; bundleSha?: string } | null {
  if (!existsSync(LEDGER)) return null;
  try {
    const rows = JSON.parse(readFileSync(LEDGER, "utf8"));
    return Array.isArray(rows) ? (rows.at(-1) ?? null) : null;
  } catch { return null; }
}

export function registerAuditGate(pi: HookAPI): void {
  pi.on("tool_call", async (event) => {
    if (event.toolName !== "goal") return undefined;
    if (event.input.op !== "complete") return undefined;        // ONLY the completion act

    const row = latestVerdict();
    if (!row) {
      return { block: true, reason:
        "AUDIT GATE: ABSENT — no audit has been recorded. Run /skill:qwen-code-audit " +
        "(ocr review --provider muse-free --effort high --format json) and record " +
        "AUDIT GATE: PASS in .trident/audit-ledger.json before completing the goal." };
    }
    if (row.verdict !== "PASS") {
      return { block: true, reason:
        `AUDIT GATE: ${row.verdict} — ${row.summary}. Fix every critical/high finding and re-run.` };
    }
    return undefined;                                            // PASS → allow
  });
}
```
**Wire it: `extension.ts:601` — after `registerGraphGate(pi)`, add `registerAuditGate(pi)`.**

**★ THE 30s BUDGET CAVEAT (critical):** the handler must NOT run ocr inline (a full run is 1m25s+ — measured). **It reads the LEDGER.** The audit is PRE-COMPUTED out-of-band (a script, a pre-commit hook, or the PR gate) and writes the ledger. The hook is a fast ledger read.

### 3.2.2 · LAYER 2 — THE TTSR RULE (the prose-claim cover)

```
FILE:   ~/.omp/agent/ttsr/<name>.md  (or the host's TTSR rule dir)
MATCH:  a completion-claim frame — /\b(goal complete|all green|ship ready|everything passes|
        done and verified|production grade)\b/
CONDITION: no "AUDIT GATE: PASS" string in this turn's tool results
ACTION: abort the stream, inject:
        "STOP. You claimed completion with no AUDIT GATE: PASS in this turn's tool results.
         Run /skill:qwen-code-audit, fix every critical/high finding, record the ledger row,
         THEN re-claim."
★ MEASURED STATE: TTSR rules are ABSENT on this host (parked 6 files, live dirs 0).
```

### 3.2.3 · LAYER 3 — THE ENGINE PATCH (if the hook is not enough)

```ts
// src/goals/runtime.ts — completeGoalFromTool, patched
async completeGoalFromTool(): Promise<Goal> {
    return await this.#withAccounting(async () => {
        await this.#flushUsageLocked("suppressed");
        const state = this.#getStateClone();
        if (!state?.goal) throw new Error("cannot complete goal because no goal is active");
        if (state.goal.status === "complete") throw new Error("goal is already complete");
        if (state.goal.status === "dropped") throw new Error("cannot complete a dropped goal");
        // ★ THE ADDED PRECONDITION (the real gate):
        const gate = this.#host.getCompletionGate?.();          // a host-provided verifier
        if (gate) {
          const verdict = await gate(state.goal);                // returns {ok, reason}
          if (!verdict.ok) throw new Error(`GOAL_COMPLETION_REFUSED: ${verdict.reason}`);
        }
        state.enabled = false;
        ...
```
**★ THE COST: a vendored-dependency patch (lost on `omp` upgrade). THE BENEFIT: unbypassable.**
**★ THE BETTER ROUTE: request the hook — omp's upstream is OPEN (PRs "temporarily open to everyone"). A `goal_before_complete` hook event is the clean upstream fix.**

## 3.3 · ★ THE COMPLETION CONTRACT (what `goal(complete)` must require — mechanically)

```
BEFORE ANY goal(complete) IS ACCEPTED, ALL FIVE MUST BE MECHANICALLY TRUE:
  1 AUDIT GATE: PASS          the ledger's latest verdict is PASS, 0 critical/high
  2 THE BUNDLE IS CURRENT     sha256(deployed dist) == the audit's bundleSha
  3 THE LIVE TESTS ARE GREEN  script + container + hot-seat (all three, with artifacts)
  4 THE ALIGNMENT IS CLEAN    the diff matches the spec wave (the git rails)
  5 THE LIVE-FIRING COUNT     every enforcement claimed to work cites a nonzero firing count
★ A completion missing any one → {block:true, reason:<the missing one>}.
```

## 3.4 · ★ WHAT TO REPLACE vs KEEP (the engine assessment)

| Component | Verdict | Why |
|---|---|---|
| The state machine (5 statuses, the transitions) | ★ **KEEP** | clean, complete, well-tested; the transitions are correct |
| The accounting (token/time per turn) | ★ **KEEP** | `goalTokenDelta` handles cacheWrite correctly (the codex divergence is documented) |
| The continuation loop | ★ **KEEP** | the reload-pauses rule (`onThreadResumed`) is the right default |
| The prompt (the completion-audit instruction) | **KEEP** | it is well-written — but it is NOT enforcement |
| ★ `completeGoalFromTool` | ★ **HARDEN** | the three status checks are the hole — add the gate (Layer 3) or hook it (Layer 1) |
| The 5-tool surface (`op` field) | **KEEP** | cleaner than upstream's 3 separate tools |
| The absence of a `goal_updated` HOOK | ★ **REQUEST UPSTREAM** | the runtime emits `goal_updated` (state.ts:24) but it is not a `pi.on` subscription |

**★ THE HONEST ASSESSMENT: the ENGINE IS GOOD. The COMPLETION SINK is the one hole, and it is ONE function (`runtime.ts:470-494`). The engine does not need replacing — it needs a gate at the one place where a claim becomes a fact.**

---

# §4 · THE BUILD ORDER (the waves)

| Wave | The deliverable | The file | The acceptance |
|---|---|---|---|
| G0 | ★ the rail (DONE) | `~/.omp/run/adapters/zen-free-adapter.mjs` + the hub start | `ocr scan` → `status:success` |
| G1 | the audit ledger + the writer | `.trident/audit-ledger.json` + `scripts/run-audit.sh` | a run writes `AUDIT GATE: PASS\|FAIL` |
| G2 | ★ LAYER 1 — the hook | `src/omp/audit-gate.ts` + `extension.ts:601` | a `goal(complete)` with a FAIL ledger → block |
| G3 | LAYER 2 — the TTSR rule | the TTSR rule dir | a completion-claim prose → abort + inject |
| G4 | the bundleSha check (GT-4) | `audit-gate.ts` | a stale audit → block |
| G5 | the three test surfaces | script + container + hot-seat | all green, with artifacts |
| G6 | ★ LAYER 3 (only if the hook is bypassed) | `src/goals/runtime.ts` | the patch survives an upgrade (or is upstreamed) |

**★ G0 IS DONE. G1 IS NEXT. G2 CLOSES THE HOLE.**

---

# §5 · THE HONEST RESIDUAL

```
WHAT IS DONE:      the rail is FIXED and PROVEN (the ocr scan succeeded, 9 findings).
                   the goal lifecycle is fully mapped (5 statuses, every transition, file:line).
                   the hook surface is fully mapped (24 events, the cancel proof re-verified).
                   the hardening is designed (4 layers, the exact code).
WHAT IS NOT DONE:  G1..G6. NO code written (the standing order: NO CODE).
                   the TTSR rules remain ABSENT on this host.
                   the engine patch (Layer 3) is designed, not applied.
THE NEXT STEP:     the operator authorizes G1+G2 — the ledger + the hook. That is the ONE
                   change that closes the hole.
★ AND THE CORRECTION TO MY OWN PRIOR DOC: F-61 was NOT "the audit rail refused". It was
  "the adapter was not running". A 2-second restart. THE WHOLE AUDIT GATE WAS SKIPPED OVER IT.
```
