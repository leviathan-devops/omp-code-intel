# GI KERNEL v2.1 — THE HARDENING PLAN
## The Gates, the Testing Framework, the Git Rails, the Decision Layers — Mapped

**Date:** 2026-09-22 · **Baseline:** `jarvis/gi-main` · **Purpose:** make a trash-quality ship MECHANICALLY IMPOSSIBLE. Round 1 ships as a DRAFT; code review DENIES; the agent LOOPS until production grade; only then does it ship.
**Companions:** `GI_kernel_v21_SIX_ITEM_AUDIT.md` · `GI_kernel_v21_ANTI_PATTERN_CATALOG.md`.
**Status:** the design. Nothing below is built except where marked.

---

# §0 · THE THESIS

```
THE PROBLEM: the ship happened because EVERY GATE FAILED AT ONCE.
  the completion sink checked nothing · the audit was blocked · the gate fired once ·
  the tests certified fixtures · the docs grew 2.6× the product.

THE FIX: EVERY GATE BECOMES MECHANICAL. A gate that cannot BLOCK is not a gate.
  A ship claim is a MECHANICAL FACT (a set of commands that returned PASS), never a
  MODEL STATEMENT.

THE LAW: THE AGENT MAY NOT DO ANYTHING DESTRUCTIVE — destructive, dumb, or theatrical.
  THE KERNEL'S JOB IS TO MAKE DUMB AND THEATRICAL MECHANICALLY IMPOSSIBLE.
```

---

# §1 · PHASE 1 — THE GOAL-LOOP HARDENING (the keystone: GT-1)

## 1.1 · WHY THIS IS FIRST

**The goal loop is the ship gate. It is the ONE place every completion claim passes through. Today it checks status only (`runtime.ts:470-494`). Harden it, and every other gate has a place to land.**

## 1.2 · GT-1 — THE AUDIT GATE (the exact implementation)

**THE HOOK (PROVEN FEASIBLE — `pi.on("tool_call")` CAN cancel `goal(complete)`, §2.3 of the audit):**
```ts
// src/omp/extension.ts — add to giOmpExtension, after registerGraphGate
export function registerAuditGate(pi: HookAPI): void {
  pi.on("tool_call", async (event) => {
    if (event.toolName !== "goal") return undefined;
    if (event.input.op !== "complete") return undefined;    // ONLY the completion act

    // FAST LEDGER CHECK (not an inline audit — the handler budget is 30s, runner.ts:1093)
    const ledger = readAuditLedger();                       // .trident/audit-ledger.json
    const latest = ledger.at(-1);
    if (!latest || latest.verdict !== "PASS") {
      return {
        block: true,
        reason:
          `AUDIT GATE: ${latest?.verdict ?? "ABSENT"} — ` +
          `${latest?.summary ?? "no audit run recorded"}. ` +
          `Run /skill:qwen-code-audit; fix every critical/high finding; ` +
          `the ledger must carry AUDIT GATE: PASS before goal completion.`,
      };
    }
    if (latest.bundleSha !== currentBundleSha()) {          // GT-4 folded in
      return { block: true, reason: `AUDIT GATE: STALE — the audit ran against ${latest.bundleSha}, the bundle is ${currentBundleSha()}. Re-audit.` };
    }
    return undefined;
  });
}
```

**THE LEDGER (the artifact the gate reads — the audit writes it, the gate reads it):**
```json
// .trident/audit-ledger.json — append-only
{
  "ts": "2026-09-22T...", "verdict": "PASS|FAIL|BLOCKED",
  "summary": "0 critical, 0 high", "bundleSha": "<sha256 of the deployed dist>",
  "sourceSha": "<sha256 of the combined source tree>",
  "scenarios": [ { "id": "T1", "passTokenMatch": true, "failTokenAbsent": true } ]
}
```

**THE SECOND LAYER (the TTSR rule — for prose claims without the tool):**
```
A TTSR rule (the host's mid-stream abort surface, the `ttsr_triggered` event):
  MATCH:  a completion-claim frame ("done", "complete", "all green", "ship ready",
          "goal complete", "everything passes")
  CONDITION: no `AUDIT GATE: PASS` line appears in this turn's tool results
  ACTION: abort the stream mid-token, inject:
          "RUN qwen-code-audit BEFORE claiming completion. The claim is void without it."
★ TTSR is REQUIRED because an agent can CLAIM completion in PROSE without calling goal(complete).
  The hook covers the TOOL ACT; the TTSR covers the CLAIM.
★ THE LIVE STATE: TTSR rules are ABSENT on this host (parked 6 files, live dirs 0).
```

**ACCEPTANCE (GT-1):**
```
[ ] pi.on("tool_call") handler matching goal(op=complete) exists in extension.ts
[ ] the handler reads the audit ledger and blocks on non-PASS
[ ] a test fires a goal(complete) call through the handler with a FAIL ledger → asserts block:true
[ ] a test fires with a PASS ledger → asserts undefined
[ ] the TTSR rule exists + a completion-claim prose fires it (the ttsr_triggered event observed)
[ ] the bundleSha check blocks a stale audit
```

## 1.3 · THE COMPLETION CONTRACT (what `goal(complete)` must now require)

```
BEFORE COMPLETING, ALL FOUR MUST BE MECHANICALLY TRUE:
  1 AUDIT GATE: PASS          the ledger's latest verdict is PASS, 0 critical/high
  2 THE BUNDLE IS CURRENT     the deployed dist sha == the audit's bundleSha == the source build
  3 THE LIVE TESTS ARE GREEN  script + container + hot-seat (the three surfaces, §5)
  4 THE ALIGNMENT IS CLEAN    the diff matches the spec wave (L-GIT-4)
★ A completion missing any one returns {block:true, reason:<the missing one>}.
```

---

# §2 · PHASE 2 — THE MECHANICAL GATES GT-2..GT-8

## 2.1 · THE GATE TABLE (each with its landing site + acceptance)

### GT-2 · THE SCOPE GATE
```
BLOCKS: a graph query whose target is outside the populated tree.
WHY:    rows=0 about a target not in the store reads as "no callers" — WRONG. An empty answer
        and a wrong-scope answer are indistinguishable (the root of F-66..F-69).
WHERE:  src/omp/typed-write.ts — the query verbs.
SHAPE:  if the target resolves to no node AND the store's populated roots do not include the
        target's tree ⇒ return GI_STORE_SCOPE_MISMATCH:<target> (never rows=0).
        The store records its populated roots at populate time (gi_meta.populated_roots).
ACCEPT: a query for a symbol in the populated tree → rows; a query for a symbol OUTSIDE it →
        GI_STORE_SCOPE_MISMATCH; a test asserts both.
★ THIS ONE CHANGE WOULD HAVE PREVENTED F-66..F-69.
```

### GT-3 · THE FRESHNESS GATE
```
BLOCKS: a query against a store older than the newest source.
WHY:    a stale substrate is DOWN. F-68 (the stale instrument) was known ~20 commits early.
WHERE:  storeFreshness (typed-write.ts:424) — CALLED in every layer probe + every query.
SHAPE:  populated_at (gi_meta) < max(mtime of the populated roots) ⇒
        GI_STORE_STALE:<age> (a named refusal, never a silent answer).
ACCEPT: a store populated before a source edit → GI_STORE_STALE; a fresh store → answers.
```

### GT-4 · THE DEPLOY GATE
```
BLOCKS: a ship claim when the deployed bundle ≠ source.
WHY:    the bundle is 21-35h behind source; every fix is unloaded.
WHERE:  the completion path (§1.2, the bundleSha check) + a pre-commit hook (L-GIT-1).
SHAPE:  sha256(extensions/graph-intelligence/index.js) != the source build's sha ⇒ REJECT.
ACCEPT: a src edit without a rebuild → the gate rejects; a matched build → passes.
```

### GT-5 · THE LIVE-FIRING GATE
```
BLOCKS: a claim that an enforcement works, with no live firing measured.
WHY:    the gate fired ONCE in 40,631 lines; graph_gate_state = 0 rows.
WHERE:  the ship docs + the completion path.
SHAPE:  the ship claim must cite a MECHANICAL firing count (graph_gate_state rows, the gate
        log lines) for every enforcement claimed to work. Zero rows ⇒ the claim is UNPROVEN.
ACCEPT: a ship claim naming an enforcement with 0 recorded firings → REJECT.
```

### GT-6 · THE NO-FALLBACK GATE
```
BLOCKS: any ALLOW produced by a missing substrate.
WHY:    GI_NO_STORE ALLOW+warn = the silent fallback the operator banned.
WHERE:  gate-middleware.ts:85-90 (FIXED) + ★ THE CALL SITE gate-hook.ts:~80 (STILL hasStore:true).
SHAPE:  !hasStore ⇒ cancel:true; the ONLY escape is the NAMED, LOGGED GI_ALLOW_NO_STORE=1.
★ THE FIX MUST LAND AT THE CALL SITE (G-9): gate-hook.ts must pass the REAL hasStore, not `true`.
ACCEPT: a write with no store → cancel:true; with GI_ALLOW_NO_STORE=1 → cancel:false + a log line.
```

### GT-7 · THE PREFLIGHT GATE
```
BLOCKS: booting with a DOWN layer.
WHY:    preflight() (kernel-v2.ts:69) exists and is NEVER called; 12 of 23 modules unreachable.
WHERE:  extension.ts init — call the register audit on boot.
SHAPE:  preflight(layers) at giOmpExtension init; one DOWN layer ⇒ GI_STACK_INCOMPLETE:<id>
        ⇒ the extension registers NO tools and says WHY.
ACCEPT: boot with a layer down → GI_STACK_INCOMPLETE + zero tools; boot clean → tools register.
```

### GT-8 · THE TEST-REALITY GATE
```
BLOCKS: a battery whose tests never touch the live path.
WHY:    362 tests, 0 against the deployed bundle.
WHERE:  the test-reality count + the ship docs.
SHAPE:  every changed file maps to ≥1 LIVE-subject scenario; the count is asserted
        (the T1 LIVE-SUBJECT LAW, §3).
ACCEPT: a suite with 0 live-path assertions → the ship claim is REJECTED.
```

## 2.2 · THE GATE DEPENDENCY ORDER

```
GT-7 preflight (boot)          ← FIRST: nothing runs if the stack is incomplete
  └─ GT-2 scope + GT-3 freshness (every query)
      └─ GT-6 no-fallback (every write/edit)
          └─ GT-4 deploy (every build)
              └─ GT-1 audit (every completion)  ← THE KEYSTONE
                  └─ GT-5 live-firing + GT-8 test-reality (the ship evidence
★ GT-1 DEPENDS ON GT-4 (the audit's bundleSha must match) — so GT-4 lands before GT-1's
  staleness check is meaningful.
```

---

# §3 · PHASE 3 — THE TESTING FRAMEWORK (the universal template)

## 3.1 · THE SEVEN LAWS (derived from the 12 anti-patterns + the 7 test classes)

```
T1 LIVE-SUBJECT LAW      the subject is the LIVE artifact (the deployed bundle, the real store,
                         the registered handler) — never a fixture standing in for it.
T2 WIRING LAW            the test asserts the CALL PATH, not the module's internals:
                         "the extension imports the register" / "the handler calls saveGateState"
                         — not "saveGateState works". Grep the IMPORT GRAPH, not the source string.
T3 SCOPE LAW             a test of a graph answer asserts the ANSWER IS ABOUT THE RIGHT SUBJECT
                         (the store describes this tree) — not merely that rows exist.
T4 NO-ENCODE-DEFECT LAW  a test never asserts the buggy behavior as the contract. When a fix
                         fails an existing test, THE TEST IS A SUSPECT, not the fix.
T5 EFFECT-NOT-SHAPE LAW  a test asserts an OBSERVABLE EFFECT (a row written, a fire logged, a
                         file changed) — never a shape or a count of calls.
T6 FRESHNESS LAW         a test of a substrate asserts its FRESHNESS (populated_at ≥ the newest
                         source mtime).
T7 FAIL-POLARITY LAW     a test of a failure path asserts the LOUD outcome (a named error),
                         never an allow.
```

## 3.2 · THE PER-SUITE TEMPLATE (what every module must carry)

```
FOR EVERY MODULE THE EXTENSION LOADS:
  · a WIRING test     — the extension imports it (grep the import graph)
  · a LIVE test       — it runs through the registered handler on a real edit
  · a PERSISTENCE test — its state lands in the store (assert the ROW, not the call)
  · a REFUSAL test    — when its dependency is absent, it REFUSES by name (never allows)
FOR EVERY GRAPH ANSWER:
  · a SCOPE test      — the target is in the populated tree, or GI_STORE_SCOPE_MISMATCH
  · a FRESHNESS test  — populated_at ≥ the newest source mtime
FOR EVERY COMPLETION CLAIM:
  · an AUDIT test     — the claim is accompanied by AUDIT GATE: PASS
FOR EVERY TEST ITSELF (the mutation check):
  · a MUTATION        — prove the test FAILS when the code is wrong (neuter the guard → RED)
```

## 3.3 · THE MUTATION CHECK (the anti-theater proof)

```
A TEST THAT CANNOT FAIL IS MEANINGLESS. FOR EVERY CRITICAL TEST:
  1 apply the mutation (neuter the guard, invert the comparison, remove the check)
  2 the test MUST go RED
  3 restore the code; the test goes GREEN
★ THE SPEC'S OWN T14 IS THE MODEL: "the MUTATION: neuter the band mapping → T1/T2 go RED".
★ A suite with no mutation check is a suite whose teeth are unproven.
```

---

# §4 · PHASE 4 — THE GIT RAILS (L-GIT-1..L-GIT-5)

## 4.1 · THE MEASURED STATE (AuditEnforcementRails — NOTHING EXISTS)

```
L-GIT-1 PRE-COMMIT   ★ NO — .git/hooks/ has 24 .sample files only
L-GIT-2 PRE-PUSH     ★ NO — no scope/wiring check exists
L-GIT-3 PR-GATE      ★ NO — no .github/workflows/; the audit rail (127.0.0.1:4098) is BLOCKED
L-GIT-4 ALIGNMENT    ★ NO — no CI; the semantica consumer absent
L-GIT-5 WORKTREE     PARTIAL — git exists; ★ NO REMOTE (.git/config has [core]+[user] only)
```

## 4.2 · THE RAIL DESIGN (each a command with a pass condition)

### L-GIT-1 · PRE-COMMIT (`.git/hooks/pre-commit`)
```bash
#!/usr/bin/env bash
set -euo pipefail
# GATE A — the deploy freshness: src changed but dist stale ⇒ REJECT
if git diff --cached --name-only | grep -q '^src/'; then
  if ! git diff --cached --name-only | grep -q '^extensions/'; then
    echo "REJECT: src/ changed but the dist was not rebuilt. Run the build." >&2
    exit 1
  fi
fi
# GATE B — the live battery (not the fixture battery)
bun test ./tests/ --reporter=dot || { echo "REJECT: the battery is red." >&2; exit 1; }
# GATE C — tsc
bunx tsc --noEmit || { echo "REJECT: tsc errors." >&2; exit 1; }
echo "PRE-COMMIT: PASS"
```

### L-GIT-2 · PRE-PUSH (`.git/hooks/pre-push`)
```bash
#!/usr/bin/env bash
set -euo pipefail
# GATE D — the scope check: the store must describe the pushed tree
bun run scripts/gi-scope-check.ts || { echo "REJECT: GI_STORE_SCOPE_MISMATCH." >&2; exit 1; }
# GATE E — the wiring check: every module the extension loads is imported
bun run scripts/gi-wiring-check.ts || { echo "REJECT: an unwired module (AP-1)." >&2; exit 1; }
echo "PRE-PUSH: PASS"
```

### L-GIT-3 · PR-GATE (`.github/workflows/audit.yml` + a required status check)
```yaml
name: AUDIT GATE
on: [pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bun install
      - run: bun run scripts/run-audit.ts          # qwen-code-audit | the pinned fallback chain
      - run: bun run scripts/assert-audit-pass.ts  # exit 1 unless AUDIT GATE: PASS
```
```
★ THE REQUIRED CHECK: a PR without `AUDIT GATE: PASS` CANNOT MERGE.
★ THE BLOCKER: the repo has NO REMOTE and NO workflows. This requires a remote + a PAT/App.
```

### L-GIT-4 · ALIGNMENT (the semantica-backed decision check)
```
A CI job that diffs the branch against the build-package spec and FAILS on drift:
  · a file the spec did not name ⇒ FLAGGED
  · a layer the spec requires that is absent ⇒ FLAGGED
  · a change that contradicts a GOVERNING DECISION ⇒ FLAGGED with the decision (§6)
```

### L-GIT-5 · WORKTREE-AS-PROGRESSION-TRACKER (the operator's own design, formalized)
```
THE WORKTREE'S BRANCH = THE WAVE.  The build package names the waves (W1..Wn).
EACH WAVE IS A BRANCH whose name encodes the spec wave:  wave/W3-ledger.
THE SPEC'S WAVE TABLE = THE MERGE ORDER. A branch that does not map to a spec wave
  cannot merge — the alignment check rejects it.
THE WORKTREE'S DIFF = THE PROGRESS RECORD. `git diff spec-base..wave/W3` is the wave's
  actual delta; the spec names what it SHOULD be; the divergence is MEASURED.
★ THE WORKTREE BECOMES THE MECHANICAL TRACKER: alignment is a DIFF, not a report.
```

---

# §5 · PHASE 5 — THE SHIP PIPELINE (round 1 → review → loop → ship)

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

## 5.1 · THE THREE TEST SURFACES (all three, or no ship)

```
SCRIPT     the battery — but LIVE-subject (the T1 law), not fixtures.
CONTAINER  the isolated runtime (the deep-container-testing rig: omp-ct:master).
HOT-SEAT   the agent lives in the deployed instance (the meta-observation loop).
★ ALL THREE MUST BE GREEN. A ship claim on ONE surface is not a ship claim.
★ THE EVIDENCE PER SURFACE: a results artifact with per-scenario passTokenMatch +
  failTokenAbsent + toolResultContext + verdict. NO ARTIFACT, NO CLAIM.
```

---

# §6 · PHASE 6 — THE DECISION LAYERS (semantica + TSG)

## 6.1 · SEMANTICA PINNED TO THE WORKTREE (the precedent/causal/govern/audit layer)

**MEASURED: the semantica MCP server is PRESENT with 15 tools, ZERO code callers.**
```
THE 15 TOOLS: add_entity · add_relationship · delete_node · export_graph · extract_entities ·
              extract_relations · find_precedents · get_causal_chain · get_graph_analytics ·
              get_graph_summary · query_decisions · query_graph · record_decision ·
              run_reasoning · update_node

PINNED TO THE WORKTREE, IT ANSWERS:
  · find_precedents      — HAS THIS DECISION BEEN MADE BEFORE? (the build package's rulings)
  · get_causal_chain     — WHAT DID THIS CHANGE CAUSE? (the derailment chain)
  · query_decisions      — IS THIS COMMIT CONSISTENT WITH THE GOVERNING DECISIONS?
  · record_decision      — AUDIT: every ruling, every violation, every reversal — on the record.

THE RAIL IT POWERS: the ALIGNMENT GATE (L-GIT-4). Semantica holds the build package's
  decisions; a commit whose change contradicts a governing decision is FLAGGED with the
  decision it violates. THE DECISION IS THE EVIDENCE, not a reviewer's opinion.
```

## 6.2 · THE TSG KERNEL (the meaning gate)

**MEASURED: TSG is INTERFACE-ONLY (no LoadUnit implementation; `which tsg` not on PATH).**
```
TSG = the load/index unit (per-passage Noul, coverage-first). "STAGE 4 · KERNEL  TSG: meaning match?"

THE DEDICATED KERNEL ANSWERS, PER COMMIT/PR:
  · DOES THIS CHANGE MEAN WHAT THE SPEC SAYS IT SHOULD MEAN?
  · IS THE CLAIM ("this wave is complete") SUPPORTED BY THE CHANGE'S CONTENT?
  · DOES THE DIFF MATCH THE SPEC'S WAVE INTENT — or merely touch the named files?

THE RAIL IT POWERS: THE MEANING GATE. A commit whose content does not match its spec wave's
  MEANING is rejected, even if it touches the right files. THIS IS THE LAYER THAT CATCHES
  "the file exists but the behavior does not" — the exact defect that shipped.
★ THE BLOCKER: TSG absent ⇒ the blueprint's own table says REFUSE ALL. Nothing calls it,
  so the absence is SILENT — the one place the loud-failure law is not upheld.
```

## 6.3 · THE JEV LAYER (measured: half-wired)

```
L1 JEV (Abide)  — 4,301 true / 37,446 false (10.3% call rate) — mostly a SKIP.
L2 JEV (claim firewall) — the ledger is EMPTY; NOT wired to this project.
THE FIX: wire L2 as the close-surface judge (enforcement.ts:172 runCloseLayer, currently
  unreachable); raise L1's call rate via the rubric (the 10.3% is a silent non-decision).
```

---

# §7 · PHASE 7 — THE WAVE SEQUENCE (the build order)

**★ DEPENDENCY-ORDERED: a gate cannot be built before its dependency lands.**

| Wave | The deliverable | The files (disjoint) | The gate | The acceptance |
|---|---|---|---|---|
| W0 | ★ REBUILD + DEPLOY | `extensions/graph-intelligence/index.js` | GT-4 | the bundle sha == the source build sha |
| W1 | GT-6 at the CALL SITE | `src/omp/gate-hook.ts` | GT-6 | a write with no store → cancel:true |
| W2 | GT-7 the preflight | `src/omp/extension.ts` | GT-7 | a layer down → GI_STACK_INCOMPLETE + zero tools |
| W3 | GT-2 the scope gate | `src/omp/typed-write.ts` | GT-2 | a target outside the tree → GI_STORE_SCOPE_MISMATCH |
| W4 | GT-3 the freshness gate | `src/omp/typed-write.ts` + the probes | GT-3 | a stale store → GI_STORE_STALE |
| W5 | ★ GT-1 the audit gate + the ledger | `src/omp/extension.ts` + `scripts/run-audit.ts` | GT-1 | a goal(complete) with a FAIL ledger → block:true |
| W6 | the TTSR rule | the TTSR rule dir | GT-1 layer 2 | a completion-claim prose → abort + inject |
| W7 | the test-reality harness | `tests/` + the 7 laws | GT-8 | every changed file has a live scenario |
| W8 | the git rails | `.git/hooks/` + `scripts/` | L-GIT-1..2 | a stale-dist commit → REJECT |
| W9 | the semantica bridge | the worktree-pin | L-GIT-4 | a contradicting decision → FLAGGED |
| W10 | the TSG LoadUnit | the TSG impl | the meaning gate | a diff not meaning its wave → REJECT |
| W11 | the ship pipeline | the CI + the three surfaces | all | a round-1 ship → DENIED; the loop → SHIP |

**★ W0 IS FIRST BECAUSE EVERY OTHER GATE READS THE DEPLOYED BUNDLE. A gate that tests stale code proves nothing.**

---

# §8 · THE ACCEPTANCE CRITERIA (the plan is done when)

```
[ ] GT-1 exists: a goal(op=complete) with no AUDIT GATE: PASS is BLOCKED (a test proves it)
[ ] the TTSR rule exists: a completion-claim prose aborts the stream (the event observed)
[ ] GT-2..GT-8 each exist + each has a mutation-checked test
[ ] the bundle is CURRENT (sha match) — every fix is LIVE
[ ] the 7 test laws are enforced: 0 fixture-substitute suites, 0 source-string proofs
[ ] L-GIT-1..5 each exist as a command with a pass condition
[ ] semantica is pinned + a contradicting decision FLAGS a commit
[ ] TSG answers the meaning question per commit
[ ] the three test surfaces (script + container + hot-seat) are GREEN with artifacts
[ ] a deliberate trash-quality ship attempt is MECHANICALLY BLOCKED (the red-team proof)
```

**★ THE FINAL ACCEPTANCE IS ADVERSARIAL: attempt to ship trash, and prove the gates BLOCK it. A gate inventory that has never blocked a real attempt is a documented wish.**

---

# §9 · THE RISKS + THE BLOCKERS

| # | The risk / blocker | The impact | The resolution |
|---|---|---|---|
| R-1 | The 30s hook timeout vs a full ocr run | GT-1 cannot run the audit inline | the LEDGER pattern (pre-compute, the gate reads the ledger) — designed in §1.2 |
| R-2 | No git remote + no workflows | L-GIT-3 (the PR gate) cannot exist | the operator decides: a remote + a PAT/App |
| R-3 | TSG absent | the meaning gate cannot fire | the operator installs TSG (or the loud-fail is honored) |
| R-4 | The 5 down layers | GT-7 refuses all tool registration | expected behavior — the layers come up, or the kernel is honestly DOWN |
| R-5 | The store describes the wrong tree | every query answers about `src/hunter` | W3/W4 + a re-populate from the live tree |
| R-6 | The audit rail (127.0.0.1:4098) BLOCKED | no independent review | unblock the rail (the ocr adapter) |
| R-7 | The bundle is 21-35h stale | every fix is unloaded | W0 first |

---

# §10 · THE HONEST RESIDUAL

```
WHAT THIS PLAN IS:      the design — the gates, the framework, the rails, the decision layers,
                        each with an implementation shape + an acceptance test.
WHAT IS NOT DONE:       NOTHING below §0 is built. The gates are SPECIFIED, not coded.
                        The bundle is STALE. The 12 unwired modules are still unwired.
                        The audit rail is BLOCKED. TSG is absent.
THE OPERATOR'S ORDER:   NO CODE — this plan is documentation, per the standing order.
★ THE NEXT LEGAL STEP:  the operator authorizes the build, starting at W0 (rebuild + deploy).
                        A plan without the build is a documented wish — the same class as the
                        audit that was blocked and the gate that was never called.
```

**The goal remains active.** `goal({op:"complete"})` stays a false claim.
