# THE GIT ENFORCEMENT LAYER — MASTER BLUEPRINT v1
## The 17 workflows that mechanically reject slop on every commit, PR, and review

**System:** the git/GitHub/TTSR enforcement rails · **Date:** 2026-09-22 · **Type:** subsystem blueprint
**Method:** master-blueprint — locate → absorb → author → prove. Every rail MEASURED this turn.
**Ingredients loaded:** engineering-report · extracting-production-boilerplates · show-me · ascii-diagrams.

---

# 1 · MACRO BLUEPRINT (one page)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ THE ENFORCEMENT PIPELINE — a claim travels through 6 gates or it does not│
│ reach the operator. Each gate is a COMMAND that exits nonzero on violatio│
└──────────────────────────────────────────────────────────────────────────┘

  THE AGENT WRITES CODE
        │
        ▼
  ┌───────────────────┐  LOCAL · instant · bypassable (--no-verify)
  │ GATE 1 PRE-COMMIT │  W-1 deploy · W-6 src-string · W-9 docs ·
  │ exit 1 → refused  │  W-11 guard · W-12 names · W-13 fallbacks · battery 
  └─────────┬─────────┘
            ▼
  ┌───────────────────┐  LOCAL · bypassable
  │ GATE 2 COMMIT-MSG │  W-8 claim-evidence + the semantic prefix
  └─────────┬─────────┘
            ▼
  ┌───────────────────┐  LOCAL · bypassable
  │ GATE 3 PRE-PUSH   │  W-3 scope · W-2 wiring · W-14 call-site
  └─────────┬─────────┘
            ▼
  ┌───────────────────┐  ★ REMOTE · NOT bypassable
  │ GATE 4 PR         │  W-4 test-reality · W-5 mutation · W-10 live-firing 
  │ a required check  │  W-7 AUDIT GATE (the 8-rung chain)
  └─────────┬─────────┘
            ▼
  ┌───────────────────┐  CI
  │ GATE 5 ALIGNMENT  │  W-15 spec-wave drift · W-16 semantica decision conf
  └─────────┬─────────┘
            ▼
  ┌───────────────────┐  CI
  │ GATE 6 MEANING    │  W-17 TSG: does the diff MEAN the wave it claims?
  └─────────┬─────────┘
            ▼
       THE MERGE / THE SHIP
```

**★ THE KEY FACT: LOCAL HOOKS ARE BYPASSABLE (`--no-verify`). THE PR GATE IS NOT. Both are required — the local hooks are the fast developer loop, the PR gate is the unbypassable wall.**

---

# 2 · THE MEASURED STATE (what exists on this host)

| Rail | Measured | The evidence |
|---|---|---|
| L-GIT-1 PRE-COMMIT | ★ **ABSENT** | `ls .git/hooks/` → 24 `.sample` files only |
| L-GIT-2 PRE-PUSH | ★ **ABSENT** | no scope/wiring script exists |
| L-GIT-3 PR-GATE | ★ **ABSENT** | no `.github/workflows/`; the audit rail was DOWN (now fixed) |
| L-GIT-4 ALIGNMENT | ★ **ABSENT** | no CI job |
| L-GIT-5 WORKTREE | **PARTIAL** | git exists; ★ **NO REMOTE** (`.git/config` = `[core]`+`[user]` only) |

```
★ THE BLOCKER FOR THE PR GATE: THE REPO HAS NO REMOTE. A GitHub PR gate REQUIRES a remote
  + a PAT/App. Without it, GATE 4/5/6 CANNOT EXIST — the local hooks are all that can run.
★ THE AUDIT RAIL (the gate's input): FIXED this session — the 4098 adapter was down; started
  + proven (`ocr scan` → `status:success`).
```

---

# 3 · THE 17 WORKFLOWS (each: the banned thing → the command → the auto-reject)

## 3.1 · THE LOCAL HOOKS (fast, bypassable)

| # | The workflow | The command | Pass | Auto-reject |
|---|---|---|---|---|
| W-1 | DEPLOY FRESHNESS | `find src -newer <dist> \| wc -l` | 0 | exit 1 |
| W-6 | SOURCE-STRING ASSERT | `grep -nE '\.includes\("[A-Za-z]+"\)' tests/*.ts` | no wiring-test hit | exit 1 |
| W-8 | CLAIM-EVIDENCE | grep the commit body for claims + require a sha/test/file:line | every claim bound | exit 1 |
| W-9 | DOC DENSITY | `wc -l` + `grep -c '<file>:<line>'` | floor + ≥3 anchors | exit 1 |
| W-11 | GUARD CONSISTENCY | the header polarity == the body | match | exit 1 |
| W-12 | NAME COLLISION | every `export function <name>` unique | unique | exit 1 |
| W-13 | SILENT FALLBACK | grep the diff for `cancel:false\|ALLOW\|catch {}` | named+logged only | exit 1 |

## 3.2 · THE PRE-PUSH (heavier, local)

| # | The workflow | The command | Auto-reject |
|---|---|---|---|
| W-2 | WIRING | walk the import graph from extension.ts | an orphan module → exit 1 |
| W-3 | SCOPE | query the store for a diff symbol | `GI_STORE_SCOPE_MISMATCH` → exit 1 |
| W-14 | CALL-SITE | a contract change touches its callers | an unchanged call site → exit 1 |

## 3.3 · THE PR GATE (remote, unbypassable — the wall)

| # | The workflow | The command | Auto-reject |
|---|---|---|---|
| ★ W-7 | **THE AUDIT GATE** | the 8-rung ocr chain → 0 critical/high | a required check → **NO MERGE** |
| W-4 | TEST-REALITY | count live-subject tests per changed file | only-fixture → NO MERGE |
| W-5 | MUTATION | mutate the code → the test must go RED | a test that cannot fail → NO MERGE |
| W-10 | LIVE-FIRING | an enforcement claim cites a firing count | 0 firings → NO MERGE |

## 3.4 · THE CI DECISION LAYERS

| # | The workflow | The command | Auto-reject |
|---|---|---|---|
| W-15 | ALIGNMENT | the diff vs the spec's wave table | drift → FLAGGED |
| W-16 | SEMANTICA | a change vs the recorded decisions | a contradiction → FLAGGED + the decision id |
| W-17 | TSG MEANING | does the diff MEAN the wave? | drift → exit 1 |

## 3.5 · THE TTSR LAYER (mid-stream, the prose cover)

```
THE THEATRICAL ACT IT KILLS:  a completion CLAIM with no artifact, in the reply text.
THE RULE:  match "done|complete|all green|ship ready|goal complete"
           CONDITION: no "AUDIT GATE: PASS" in this turn's tool results
           ACTION: abort the stream, inject the demand, retry.
★ MEASURED: TTSR rules are ABSENT on this host (parked 6 files, live dirs 0).
```

---

# 4 · THE TRACES (a commit's journey)

```
TRACE A — A GOOD COMMIT
  the agent edits src/omp/gate-hook.ts + rebuilds the dist
  → git commit → pre-commit: W-1 ✓ (dist newer) · W-6 ✓ · W-9 ✓ · W-11 ✓ · W-12 ✓ · W-13 ✓
                          · battery ✓ · tsc ✓  → PASS
  → commit-msg: W-8 ✓ (the claim cites a test count) + the prefix ✓ → PASS
  → git push → pre-push: W-2 ✓ · W-3 ✓ · W-14 ✓ → PASS
  → PR → W-4 ✓ · W-5 ✓ · W-10 ✓ · W-7 AUDIT GATE: PASS → MERGEABLE

TRACE B — A SLOP COMMIT (rejected at GATE 1)
  the agent edits src/omp/fire-gate.ts, does NOT rebuild the dist
  → pre-commit: W-1 ✗ ("src/ changed but the dist was not rebuilt") → exit 1
  → ★ THE COMMIT NEVER HAPPENS. The agent fixes + retries.

TRACE C — A THEATRICAL PR (rejected at GATE 4)
  the agent's PR claims "verified" with no artifact
  → the commit-msg W-8 catches it at GATE 2 (before the PR)
  → if it slipped: W-7 AUDIT GATE runs → FAIL → the required check → ★ CANNOT MERGE
```

---

# 5 · LAWS + INVARIANTS

```
L1  A GATE IS ONLY A GATE IF IT BLOCKS. A gate that warns is documentation.
L2  LOCAL HOOKS ARE BYPASSABLE. THE PR GATE IS NOT. SHIP BOTH.
L3  THE PREREQUISITE: A GIT REMOTE. Without it, GATE 4/5/6 do not exist.
L4  THE AUDIT RAIL IS THE GATE'S INPUT. A dead rail = a BLOCKED gate, NEVER a pass.
L5  A BLOCKED GATE IS A STARTUP TASK, NOT A VERDICT. (the 4098 lesson)
L6  THE MUTATION IS THE ONLY PROOF A TEST BITES. A green test proves nothing without it.
L7  A CLAIM WITHOUT AN ARTIFACT IS A FALSE REPORT. W-8 enforces it.
L8  THE SPEC'S WAVE TABLE IS THE MERGE ORDER. A diff not matching it is DRIFT.
```

---

# 6 · THE ERROR VOCABULARY

```
REJECT(W-1): src is newer than the dist. Rebuild + redeploy.
REJECT(W-2): an unwired module (no importer).
REJECT(W-3): GI_STORE_SCOPE_MISMATCH:<target>
REJECT(W-4): <file> has only fixture tests.
REJECT(W-5): <test> cannot fail (the mutation survived).
REJECT(W-6): a source-string assertion in a wiring test.
REJECT(W-7): AUDIT GATE: FAIL|BLOCKED|ABSENT|STALE
REJECT(W-8): a claim with no artifact (test count, sha, file:line).
REJECT(W-9): <file> is <n> lines (under floor) / has <n> anchors (padded).
REJECT(W-10): <enforcement> claims to work with 0 recorded firings.
REJECT(W-11): <file>'s header contradicts its body.
REJECT(W-12): duplicate export name <name> (<file1>:<l1>, <file2>:<l2>).
REJECT(W-13): an unnamed silent fallback at <file>:<line>.
REJECT(W-14): <fn>'s contract changed; its call site at <file>:<line> still passes the old shape.
FLAG(W-15): <file> is not in the spec's wave <W>.
FLAG(W-16): the change contradicts decision <D-id>.
REJECT(W-17): the diff does not MEAN the wave it claims.
```

---

# 7 · THE BACKWARDS MAP + PROVENANCE

| The rail | The blueprint section | The evidence |
|---|---|---|
| the pre-commit hook | §3.1 | (to be written: `.git/hooks/pre-commit`) |
| the commit-msg hook | §3.1 | (to be written: `.git/hooks/commit-msg`) |
| the pre-push hook | §3.2 | (to be written: `.git/hooks/pre-push`) |
| the PR workflow | §3.3 | (to be written: `.github/workflows/enforce.yml`) |
| the audit chain | §3.3 | the qwen-code-audit skill (5 rungs) + the 8-rung extension |
| the TTSR rule | §3.5 | (absent on this host — to be written) |
| the 17 workflows | §3 | `GI_kernel_v21_GIT_ENFORCEMENT_OVERHAUL.md` (559 L) |

**THE RE-HOST GUIDE:**
```
1 copy the 3 hooks into .git/hooks/ (chmod +x)
2 write the 8 scripts the hooks call (gi-wiring-check.ts, gi-scope-check.ts, …)
3 add a git remote (the PR gate's prerequisite)
4 add .github/workflows/enforce.yml + the required status check
5 add the TTSR rule
6 VERIFY: a stale-dist commit → refused; a fixture-only PR → no merge; a FAIL audit → no merge
```

**WHAT WAS LEFT OUT:** the semantica worktree-pin (15 MCP tools, 0 callers) and the TSG
meaning gate (no LoadUnit impl) are DESIGNED in the overhaul doc §3, not wired here.

**THE BATTERY VERDICT:** every rail MEASURED this turn (24 sample hooks, no remote, no
workflows); the 17 workflows each carry a runnable command; the audit rail fixed + proven.
