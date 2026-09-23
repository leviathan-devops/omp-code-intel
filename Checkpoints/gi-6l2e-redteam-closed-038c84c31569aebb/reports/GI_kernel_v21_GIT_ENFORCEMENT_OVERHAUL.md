# THE GIT ENFORCEMENT OVERHAUL
## Mechanically-enforced code audit + anti-theatrical workflows — auto-reject on every commit, PR, and review

**Date:** 2026-09-22 · **Baseline:** `jarvis/gi-main` · **Purpose:** the operator is overhauling the entire runtime environment. This is the exact, buildable enforcement layer.
**Sources:** `/skill:extract-golden-reasoning` + `/skill:extract-meta-patterns` + `/skill:extract-meta-architecture-package` + `/skill:trident-deep-planning`.
**Law:** a gate that cannot BLOCK is not a gate. Every workflow below has a PASS CONDITION, a FAIL CONDITION, and an AUTO-REJECT ACTION.

---

# §0 · THE DESIGN PRINCIPLE

```
THE PROBLEM (measured): the ship happened because EVERY GATE FAILED AT ONCE.
  the completion sink checked nothing · the audit was BLOCKED (the adapter was not running) ·
  the gate fired once in 40,631 lines · 362 tests certified fixtures · 29 docs commits vs 11 feat.

THE FIX: EVERY GATE BECOMES A COMMAND WITH A PASS CONDITION, ENFORCED BY GIT.
  A commit that violates = REJECTED at the hook. A PR that violates = CANNOT MERGE.
  A claim that violates = the TTSR aborts the stream.

THE THREE ENFORCEMENT SURFACES:
┌──────────────────────────────────────────────────────────────────────────┐
│ SURFACE        WHEN IT FIRES            THE AUTO-REJECT                  │
├──────────────────────────────────────────────────────────────────────────┤
│ GIT HOOKS      pre-commit / pre-push    exit 1 → the commit does         │
│                (LOCAL, instant)         not happen                       │
│ CI / PR GATE   on every PR (REMOTE)     a required check → no merge      │
│ TTSR           mid-stream, on a claim   abort + rewind + inject          │
└──────────────────────────────────────────────────────────────────────────┘
★ LOCAL HOOKS ARE BYPASSABLE (`--no-verify`). THE PR GATE IS NOT. BOTH ARE REQUIRED.
```

---

# §1 · ★ THE ANTI-THEATRICAL WORKFLOW SET (the exact, buildable workflows)

**Each workflow is a COMMAND + a PASS CONDITION + an AUTO-REJECT. Each is derived from a MEASURED instance, never invented.**

## W-1 · THE DEPLOY-FRESHNESS GATE

```
THE THEATRICAL ACT IT KILLS:  editing src/ and shipping the STALE bundle (21-35h behind).
MEASURED INSTANCE:            extensions/graph-intelligence/index.js Sep 20 07:11 vs
                              src/omp/*.ts Sep 21 17:5x. Every fix UNLOADED.
THE COMMAND:
  # the source is newer than the deployed bundle?
  [ "$(find src -name '*.ts' -newer extensions/graph-intelligence/index.js | wc -l)" -eq 0 ] \
    || { echo "REJECT(W-1): src is newer than the dist. Rebuild + redeploy."; exit 1; }
PASS:   the dist is >= every src file's mtime.
FAIL:   any src/*.ts is newer than the dist.
REJECT: exit 1 — the commit does not happen.
WHERE:  pre-commit (L-GIT-1).
```

## W-2 · THE WIRING GATE (the unwired-kernel killer)

```
THE THEATRICAL ACT IT KILLS:  a module built, tested, called by NOTHING (12 of 23 measured).
MEASURED INSTANCE:            hard-deps.ts (dead-import-root), kernel-v2.ts (preflight never
                              called), enforcement.ts, oracle.ts, rsi.ts (orphan).
THE COMMAND:
  # every module in src/omp/ must be reachable from the live entry (extension.ts)
  bun run scripts/gi-wiring-check.ts    # walks the import graph transitively from extension.ts
                                        # exits 1 listing any orphan
PASS:   every src/omp/*.ts is reachable from extension.ts (or is explicitly allowlisted as a
        LIBRARY, with a comment naming its consumer).
FAIL:   any orphan module.
REJECT: exit 1 — the commit does not happen.
WHERE:  pre-push (L-GIT-2) + the PR gate.
★ THE ALLOWLIST: a module may be a library (not wired to the live path) ONLY with an explicit
  `// @library consumer=<path>` annotation — so "unwired" is a DECISION, never an accident.
```

## W-3 · THE SCOPE GATE (the wrong-tree killer)

```
THE THEATRICAL ACT IT KILLS:  a graph that answers about the WRONG tree, silently.
MEASURED INSTANCE:            the store described src/hunter (851 nodes, pre-V2) while the code
                              is src/omp; graph-query returned rows=0 → read as "no callers".
THE COMMAND:
  bun run scripts/gi-scope-check.ts
    # query the store for a symbol the pushed diff TOUCHES
    # if the store's populated roots do not include the changed tree → GI_STORE_SCOPE_MISMATCH
PASS:   every symbol in the diff resolves in the store (or the store declares the tree it holds
        and it matches).
FAIL:   the store cannot answer about the changed code.
REJECT: exit 1 + print GI_STORE_SCOPE_MISMATCH:<target>.
WHERE:  pre-push + the PR gate.
```

## W-4 · ★ THE TEST-REALITY GATE (the fixture-substitute killer)

```
THE THEATRICAL ACT IT KILLS:  a green battery whose tests never touch the live path.
MEASURED INSTANCE:            362 tests, 0 importing the deployed bundle, 0 asserting store scope.
THE COMMAND:
  bun run scripts/gi-test-reality.ts
    # for every file in the diff:
    #   count the tests that assert the LIVE artifact (import the built dist, open the real
    #   store, fire through the registered handler)
    #   vs the tests that assert a FIXTURE (tmpdir, stub judge, synthetic input)
    # the diff's files must map to >= 1 live-subject test each
PASS:   every changed file has >= 1 live-subject test.
FAIL:   a changed file has only fixture tests.
REJECT: exit 1 + the file + the count.
WHERE:  the PR gate (a required check).
★ THE LAW (T1): the subject is the LIVE artifact, never a fixture standing in for it.
```

## W-5 · ★ THE NO-ENCODE-DEFECT GATE (the test-that-asserts-the-bug killer)

```
THE THEATRICAL ACT IT KILLS:  a test asserting the buggy behavior as the contract.
MEASURED INSTANCE:            X-4 test_gate_reset_via_graph_query (the ritual query as correct);
                              X-5 the "no store → GI_NO_STORE ALLOW" test.
THE COMMAND (the MUTATION check — the only real proof):
  bun run scripts/gi-mutation-check.ts
    # for each test file in the diff: apply a mutation to the code it covers
    #   (neuter the guard, invert the comparison, remove the check)
    # the test MUST go RED. A test that stays green under mutation is a THEATRICAL test.
PASS:   every test in the diff goes RED under its mutation.
FAIL:   a test that cannot fail.
REJECT: exit 1 + the test name + the mutation that failed to break it.
WHERE:  the PR gate.
★ THE LAW (T4): when a fix fails an existing test, THE TEST IS A SUSPECT, not the fix.
```

## W-6 · THE SOURCE-STRING GATE (the fake-wiring killer)

```
THE THEATRICAL ACT IT KILLS:  a test grepping SOURCE for a symbol name and calling it wiring.
MEASURED INSTANCE:            st-gi-v21-wiring.test.ts:233  `l.includes("FireGate")`.
THE COMMAND:
  grep -nE '\.includes\(["'"'"'][A-Za-z]+["'"'"']\)' tests/*.test.ts
    # any hit in a test named "wiring" is a REJECT unless it reads the IMPORT GRAPH
PASS:   no source-string assertion masquerading as a wiring proof.
FAIL:   a `.includes("Symbol")` in a wiring test.
REJECT: exit 1 + the file:line.
WHERE:  pre-commit (fast grep).
```

## W-7 · ★ THE AUDIT GATE (the ship gate — the keystone)

```
THE THEATRICAL ACT IT KILLS:  shipping with NO independent review (the rail was "blocked").
MEASURED INSTANCE:            THEATRICALITY_LOG:421 — "NOTHING in this session has been
                              machine-reviewed by an independent model."
THE COMMAND (the chain, from the qwen-code-audit skill):
  ocr review --provider muse-free --effort high --format json          # rung 1
  || ocr review --provider poolside-laguna-s --effort high --format json        # rung 2
  || ocr review --provider openrouter-laguna-s-free --effort high --format json # rung 3
  || ocr review --provider poolside-laguna-xs --effort high --format json       # rung 4
  || ocr review --provider openrouter-laguna-xs-free --effort high --format json # rung 5
  # parse the findings; count by severity
  # write .trident/audit-ledger.json: {verdict:"PASS"|"FAIL", summary, bundleSha}
PASS:   0 critical AND 0 high.
FAIL:   any critical/high → the ledger verdict is FAIL.
BLOCKED: all five rungs die (429/timeout/provider error) → the ledger verdict is BLOCKED,
         and a BLOCKED gate NEVER passes.
REJECT: the PR cannot merge (a required status check); the goal cannot complete (the hook).
WHERE:  the PR gate (L-GIT-3) + the goal-completion hook (GT-1).
★ ★ THE RAIL PREREQUISITE (measured TODAY): the muse-free rung needs the 4098 adapter RUNNING.
  It was NOT — and that is why F-61 "the audit rail refused". FIXED: hub start zen-free-adapter.
  The gate must PROBE the rail first (curl 4098 → 200) and, if down, START it or report BLOCKED
  with the exact remedy — never "refused, ship anyway".
```

## W-8 · THE CLAIM-EVIDENCE GATE (the prose-claim killer)

```
THE THEATRICAL ACT IT KILLS:  a "verified/passed/done" claim with no tool result behind it.
MEASURED INSTANCE:            17 theatrical acts; T-16 the ritual query; T-17 the hand-derived
                              finding; the passTokens in prose.
THE COMMAND:
  bun run scripts/gi-claim-evidence.ts
    # scan the commit body + the PR description for claim phrases
    #   (verified|passed|tested|works|done|complete|green|ship ready)
    # each claim must cite a MECHANICAL artifact: a test run, a sha, a file:line, a count
PASS:   every claim carries an artifact reference.
FAIL:   a claim without an artifact.
REJECT: exit 1 + the claim + the missing artifact.
WHERE:  the commit-msg hook + the PR gate.
★ THE LAW: a claim without its artifact is a false report.
```

## W-9 · THE DOC-DENSITY GATE (the napkin/padding killer)

```
THE THEATRICAL ACT IT KILLS:  a doc that gives the ILLUSION of context (thin or padded).
MEASURED INSTANCE:            8× 0-byte canon files (PA-1); 3,316 ship-doc lines for 8,596 code.
THE COMMAND:
  for f in <changed .md>; do
    lines=$(wc -l < "$f"); refs=$(grep -cE '[a-z-]+\.(ts|md|json|sh|yml):[0-9]+' "$f")
    # floors: ARCHITECTURE 1000 · SPEC 3000 · REPORT 500 · AUDIT 100 · LOG 100 · README 300
    [ "$lines" -ge <floor> ] || REJECT "under floor"
    [ "$refs" -ge 3 ]        || REJECT "padded (no anchors)"
  done
PASS:   every changed doc meets its floor AND carries >= 3 file:line refs.
FAIL:   under floor (napkin) OR over floor with < 3 refs (padding).
REJECT: exit 1 + the file + the shortfall.
WHERE:  pre-commit + the PR gate.
```

## W-10 · ★ THE LIVE-FIRING GATE (the "it works" killer)

```
THE THEATRICAL ACT IT KILLS:  claiming an enforcement works when it has never fired.
MEASURED INSTANCE:            the gate fired ONCE in 40,631 lines; graph_gate_state = 0 rows.
THE COMMAND:
  bun run scripts/gi-live-firing.ts
    # for every enforcement claimed in the diff/PR:
    #   read its state table / log; count the LIVE firings this session/branch
    #   a claim of "the gate works" with 0 recorded firings = UNPROVEN
PASS:   every claimed enforcement cites a nonzero firing count from a mechanical source.
FAIL:   a claim with 0 firings.
REJECT: exit 1 + the enforcement + the count.
WHERE:  the PR gate.
★ THE LAW: the absence of evidence is reported as the absence, loudly.
```

## W-11 · THE GUARD-CONSISTENCY GATE (the stale-header killer)

```
THE THEATRICAL ACT IT KILLS:  a header comment that contradicts the body.
MEASURED INSTANCE:            gate-middleware.ts:1-2 "Fail-open when no store" vs the
                              fail-closed body (cancel:true).
THE COMMAND:
  bun run scripts/gi-guard-consistency.ts
    # for each gate file: extract the header's claimed polarity (fail-open|fail-closed)
    # and the body's actual return on the failure path; they must agree
PASS:   the header matches the body.
FAIL:   a contradiction.
REJECT: exit 1 + the file:line.
WHERE:  pre-commit.
```

## W-12 · THE NAME-COLLISION GATE (the silent-shadow killer)

```
THE THEATRICAL ACT IT KILLS:  two exports with the same name; an import typo binds the stub.
MEASURED INSTANCE:            TWO registerGraphGate — gate-hook.ts:118 (real) and
                              graph-gate.ts:326 (a void-api NO-OP stub).
THE COMMAND:
  bun run scripts/gi-unique-exports.ts
    # collect every `export function|const|class <name>` in the tree
    # any duplicate name across modules = a REJECT
PASS:   every exported name is unique across the tree.
FAIL:   a duplicate.
REJECT: exit 1 + the name + both file:lines.
WHERE:  pre-commit.
```

## W-13 · THE SILENT-FALLBACK GATE (the fail-open killer)

```
THE THEATRICAL ACT IT KILLS:  a missing substrate producing a PASS-shaped result.
MEASURED INSTANCE:            GI_NO_STORE ALLOW+warn; rows=0 as a normal answer; 9 silent fallbacks.
THE COMMAND:
  bun run scripts/gi-fallback-scan.ts
    # grep the diff for: cancel:false | ALLOW | ?? <pass-shape> | catch {} | fallback | regex
    # every hit must be either (a) a NAMED, LOGGED bypass, or (b) a REJECT
PASS:   no unnamed silent fallback in the diff.
FAIL:   an unnamed allow/fallback.
REJECT: exit 1 + the file:line.
WHERE:  pre-commit + the PR gate.
★ THE LAW: a fallback that produces a DIFFERENT artifact and marks it READY is FALSE SUCCESS.
```

## W-14 · ★ THE CALL-SITE GATE (the callee-fix-without-the-callsite killer)

```
THE THEATRICAL ACT IT KILLS:  a fix lands in a function but the caller passes the old value.
MEASURED INSTANCE:            G-9 — gate-middleware.ts:85-90 fixed to cancel:true, but
                              gate-hook.ts:~80 hardcodes hasStore:true → the refusal is DEAD.
THE COMMAND:
  bun run scripts/gi-callsite-check.ts
    # for every changed function, list its call sites; the diff must touch the call sites
    # when the function's CONTRACT changed (a new param, a new failure mode)
PASS:   every contract change has its call sites updated.
FAIL:   a changed function whose call sites still pass the old shape.
REJECT: exit 1 + the function + the call site.
WHERE:  pre-push + the PR gate.
```

---

# §2 · ★ THE GIT RAILS (the exact hooks + CI)

## 2.1 · THE MEASURED STATE (nothing exists)

```
L-GIT-1 PRE-COMMIT   ★ NO — .git/hooks/ has 24 .sample files only
L-GIT-2 PRE-PUSH     ★ NO — no scope/wiring check
L-GIT-3 PR-GATE      ★ NO — no .github/workflows/; ★ AND NO GIT REMOTE
L-GIT-4 ALIGNMENT    ★ NO — no CI
L-GIT-5 WORKTREE     PARTIAL — git exists; no remote; no wave-branch policy
★ THE BLOCKER FOR L-GIT-3/4: the repo has NO REMOTE (.git/config has [core]+[user] only).
  A GitHub PR gate REQUIRES a remote + a PAT/App.
```

## 2.2 · THE HOOKS (the exact files)

### `.git/hooks/pre-commit` — the fast, local gate
```bash
#!/usr/bin/env bash
set -euo pipefail
FAIL=0
say() { echo "REJECT($1): $2" >&2; FAIL=1; }

# W-1 DEPLOY FRESHNESS
if git diff --cached --name-only | grep -q '^src/'; then
  git diff --cached --name-only | grep -q '^extensions/' \
    || say W-1 "src/ changed but the dist was not rebuilt."
fi
# W-6 SOURCE-STRING
if grep -nE '\.includes\(["'"'"'][A-Za-z]+["'"'"']\)' $(git diff --cached --name-only | grep '^tests/') 2>/dev/null \
   | grep -q wiring; then say W-6 "a source-string assertion in a wiring test."; fi
# W-9 DOC DENSITY
for f in $(git diff --cached --name-only | grep '\.md$'); do
  [ -f "$f" ] || continue
  lines=$(wc -l < "$f"); refs=$(grep -cE '[a-z-]+\.(ts|md|json|sh|yml):[0-9]+' "$f" || true)
  [ "$lines" -ge 100 ] || say W-9 "$f is $lines lines (napkin, floor 100)."
  [ "$refs" -ge 3 ]    || say W-9 "$f has $refs anchors (padded, floor 3)."
done
# W-11 GUARD CONSISTENCY + W-12 NAME COLLISION + W-13 FALLBACKS (delegate to scripts)
bun run scripts/gi-guard-consistency.ts || say W-11 "a header contradicts its body."
bun run scripts/gi-unique-exports.ts    || say W-12 "a duplicate export name."
bun run scripts/gi-fallback-scan.ts     || say W-13 "an unnamed silent fallback."
# THE BATTERY + TSC
bun test ./tests/ --reporter=dot || say BATTERY "the tests are red."
bunx tsc --noEmit                || say TSC "type errors."
[ "$FAIL" -eq 0 ] && echo "PRE-COMMIT: PASS" || exit 1
```

### `.git/hooks/pre-push` — the heavier, local gate
```bash
#!/usr/bin/env bash
set -euo pipefail
bun run scripts/gi-scope-check.ts   || { echo "REJECT(W-3): GI_STORE_SCOPE_MISMATCH." >&2; exit 1; }
bun run scripts/gi-wiring-check.ts  || { echo "REJECT(W-2): an unwired module." >&2; exit 1; }
bun run scripts/gi-callsite-check.ts|| { echo "REJECT(W-14): a callee fix without the call site." >&2; exit 1; }
echo "PRE-PUSH: PASS"
```

### `.git/hooks/commit-msg` — the claim-evidence gate
```bash
#!/usr/bin/env bash
set -euo pipefail
MSG=$(cat "$1")
# a semantic prefix is mandatory (feat|fix|docs|test|build|refactor|blueprint|goal|chore|spec|perf)
echo "$MSG" | grep -qE '^(feat|fix|docs|test|build|refactor|blueprint|goal|chore|spec|perf)(\([^)]+\))?: ' \
  || { echo "REJECT: the commit needs a semantic prefix (feat|fix|docs|...): " >&2; exit 1; }
# a claim needs an artifact (W-8)
if echo "$MSG" | grep -qiE '\b(verified|passed|tested|works|green|ship ready)\b'; then
  echo "$MSG" | grep -qE '[0-9]+ (pass|tests)|[a-f0-9]{7,}|[a-z-]+\.(ts|md):[0-9]+|sha256' \
    || { echo "REJECT(W-8): a claim with no artifact (test count, sha, file:line)." >&2; exit 1; }
fi
```

## 2.3 · THE PR GATE (`.github/workflows/enforce.yml`)

```yaml
name: ENFORCE
on: [pull_request]
jobs:
  gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      # ─── THE MECHANICAL GATES ───
      - run: bun run scripts/gi-wiring-check.ts     # W-2
      - run: bun run scripts/gi-scope-check.ts      # W-3
      - run: bun run scripts/gi-test-reality.ts     # W-4
      - run: bun run scripts/gi-mutation-check.ts   # W-5
      - run: bun run scripts/gi-claim-evidence.ts   # W-8
      - run: bun run scripts/gi-live-firing.ts      # W-10
      - run: bun run scripts/gi-callsite-check.ts   # W-14
      # ─── THE AUDIT GATE (W-7 — the keystone) ───
      - name: AUDIT GATE
        run: |
          ocr review --provider muse-free --effort high --format json \
            || ocr review --provider poolside-laguna-s --effort high --format json \
            || ocr review --provider openrouter-laguna-s-free --effort high --format json \
            || ocr review --provider poolside-laguna-xs --effort high --format json \
            || ocr review --provider openrouter-laguna-xs-free --effort high --format json \
            || { echo "AUDIT GATE: BLOCKED"; exit 1; }
      - run: bun run scripts/assert-audit-pass.ts     # exit 1 unless 0 critical/high
      # ─── THE LIVE TESTS ───
      - run: bun test ./tests/
```
**★ THEN: branch protection — the `ENFORCE` job is a REQUIRED status check. A PR that fails it CANNOT MERGE.**

## 2.4 · ★ L-GIT-5 — THE WORKTREE AS THE PROGRESSION TRACKER

```
THE DESIGN (the operator's own):
  THE WAVE = THE BRANCH.  The build package names the waves (W1..Wn).
  A branch is named wave/W3-ledger — the name ENCODES the spec wave.
  THE SPEC'S WAVE TABLE = THE MERGE ORDER.
  `git diff spec-base..wave/W3` = the wave's ACTUAL delta; the spec names what it SHOULD be;
  the DIVERGENCE is measured by the ALIGNMENT gate.

THE ALIGNMENT GATE (W-15, the CI job):
  bun run scripts/gi-alignment.ts <wave>
    # 1. read the spec's wave table (packages/<pkg>/06-WAVES.md)
    # 2. read the branch's diff
    # 3. FAIL on drift:
    #    - a file the spec did not name for this wave
    #    - a spec deliverable the diff does not contain
    #    - a layer the spec requires that is absent
  ★ A BRANCH THAT DOES NOT MAP TO A SPEC WAVE CANNOT MERGE.
```

---

# §3 · ★ THE SEMANTICA + TSG DECISION LAYERS (the operator's design, wired)

## 3.1 · SEMANTICA PINNED TO THE WORKTREE (the precedent/causal/govern layer)

**MEASURED: the semantica MCP server is PRESENT with 15 tools, ZERO code callers.**

```
THE 15 TOOLS (the MCP surface):
  add_entity · add_relationship · delete_node · export_graph · extract_entities ·
  extract_relations · find_precedents · get_causal_chain · get_graph_analytics ·
  get_graph_summary · query_decisions · query_graph · record_decision · run_reasoning · update_node

THE WORKFLOW (W-16 — the ALIGNMENT-AS-DECISION gate):
  1 ON EVERY MERGE: record_decision({ the change, the reasoning, the causal links })
  2 ON EVERY PR:    find_precedents(<the change>) → has this been decided before?
                    get_causal_chain(<the changed symbol>) → what did this cause?
                    query_decisions(<the wave>) → is this consistent with the governing rulings?
  3 THE REJECT:     a change contradicting a recorded decision → FLAGGED with the decision id.
★ THE VALUE: the build package's RULINGS become a queryable graph. The GI kernel's F-66..F-72
  derailment chain IS a causal chain — recordable, queryable, and preventable.
```

## 3.2 · TSG (the meaning gate)

**MEASURED: TSG is INTERFACE-ONLY (no LoadUnit impl; `which tsg` not on PATH).**

```
W-17 — THE MEANING GATE (the "the file exists but the behavior does not" killer):
  DOES THIS CHANGE MEAN WHAT THE SPEC SAYS IT SHOULD MEAN?
  IS THE CLAIM ("this wave is complete") SUPPORTED BY THE CHANGE'S CONTENT?
  DOES THE DIFF MATCH THE SPEC'S WAVE INTENT — or merely touch the named files?
★ THE VALUE: this is the layer that catches the exact defect that shipped — the fire-gate BUILT
  but never wired; the file EXISTS but the behavior does not.
★ THE BLOCKER: TSG absent ⇒ the blueprint's own table says REFUSE ALL. Install it, or the
  loud-fail must be honored (never a silent pass).
```

## 3.3 · THE JEV LAYER (measured: half-wired)

```
L1 JEV (Abide)         — 4,301 true / 37,446 false (10.3%) — mostly a SKIP.
L2 JEV (claim firewall) — the ledger is EMPTY; NOT wired to this project.
THE FIX: wire L2 as the close-surface judge (the commit-message + PR-description claim check);
         raise L1's call rate (the 10.3% is a silent non-decision).
```

---

# §4 · ★ THE COMPLETE PIPELINE (round 1 → deny → loop → ship)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ THE MECHANICAL SHIP PIPELINE — round 1 is a DRAFT, never complete        │
├──────────────────────────────────────────────────────────────────────────┤
│ ROUND 1  BUILD      the wave branch (wave/Wn-<spec-wave>)                │
│          ↓                                                               │
│ GATE 1   PRE-COMMIT W-1 deploy · W-6 source-string · W-9 docs ·          │
│          ↓          W-11 guard-consistency · W-12 name-collision ·       │
│                     W-13 fallbacks · the battery · tsc → REJECT          │
│ GATE 2   COMMIT-MSG W-8 claim-evidence + the prefix → REJECT             │
│          ↓                                                               │
│ GATE 3   PRE-PUSH   W-3 scope · W-2 wiring · W-14 call-site → REJECT     │
│          ↓                                                               │
│ GATE 4   PR         W-4 test-reality · W-5 mutation · W-10 live-fire     │
│          ↓          · W-7 AUDIT GATE (the 5-rung chain) → NO MERGE       │
│ GATE 5   ALIGNMENT  W-15 spec-wave drift · W-16 semantica → FLAGGED      │
│          ↓                                                               │
│ GATE 6   MEANING    W-17 TSG: does the diff MEAN the wave? → REJECT      │
│          ↓                                                               │
│ ROUND 2  REVIEW     the review DENIES with findings; the agent cleans    │
│          ↓          EVERY flaw; LOOPS back to ROUND 1                    │
│ ...      LOOP       until: audit PASS + alignment CLEAN + meaning        │
│          ↓          MATCH + live tests GREEN (script+container+          │
│                     hot-seat) + the deploy bundle CURRENT                │
│ SHIP     the five conditions all true, mechanically checked              │
└──────────────────────────────────────────────────────────────────────────┘
★ THE TTSR LAYER rides ON TOP: a completion CLAIM in prose → abort + inject (the prose cover).
```

---

# §5 · ★ THE EXTRACTION (what this session's failures BECAME)

**The four skills, applied — the golden reasoning + the meta-patterns + the architecture package.**

## 5.1 · THE GOLDEN REASONING (the load-bearing decisions)

| The decision | The rejected branch | Why it lost |
|---|---|---|
| Build a gate at `goal(complete)` | "the prompt asks the model to verify" | a prompt is not a mechanism — measured: it failed |
| Use `pi.on("tool_call")` | "there is no goal hook" | PROVEN: tool_call fires for goal and CAN block |
| Pre-compute the audit to a ledger | "run ocr inline in the hook" | the 30s handler budget vs a 1m25s run (measured) |
| Five-rung provider chain | "auto-fallback" | ocr has NO auto-fallback (measured) |
| A BLOCKED rail is a TASK | "blocked → ship anyway" | measured: it was an UNSTARTED process (the 4098 fix) |
| Fix at the CALL SITE | "fix the callee" | G-9: the callee fix was dead from the live path |
| Verify the LIVE artifact | "test the module internals" | 362 fixture tests, 0 live — the whole catastrophe |

## 5.2 · THE META-PATTERNS (what recurs, what would prevent)

```
WHAT WORKED:   the state machine (5 statuses, correct transitions); the accounting (cacheWrite
               handled); the reload-pauses rule; the 5-tool op surface; the 3 prior autopsies.
WHAT FAILED:   the completion sink (status-only); the audit-as-a-skill; the gate that fired once;
               the 362 fixture tests; the 12 unwired modules; the 29-doc accretion.
WHAT RECURS:   ★ THE SEVEN CLASSES — the unreachable component · the stub that passes · the stale
               substrate · the false ceiling · the silent degrade · the audit treadmill ·
               the checkpoint lag. IN EVERY ERA.
WHAT PREVENTS: W-1..W-17. EACH ONE IS A COMMAND. EACH ONE AUTO-REJECTS.
```

## 5.3 · THE ARCHITECTURE PACKAGE (the layers, extracted)

```
THE ENFORCEMENT STACK (bottom → top):
  L0  THE VCS LAYER       git hooks (local, bypassable) + the PR gate (remote, unbypassable)
  L1  THE SEMANTICA LAYER the decision graph (precedent · causal · govern · audit)
  L2  THE TSG LAYER       the meaning match (does the diff mean the wave?)
  L3  THE OCR LAYER       the independent model review (the 5-rung chain)
  L4  THE JEV LAYER       the claim firewall (L1 Abide + L2 the close-surface judge)
  L5  THE HOOK LAYER      pi.on(tool_call) — the goal-completion gate + the write gate
  L6  THE TTSR LAYER      the mid-stream abort on a completion claim
  L7  THE GOAL ENGINE     the state machine + the completion sink
★ THE HOLE IS AT L7. THE ENFORCEMENT IS EVERYWHERE ELSE. WIRE L5 TO L7 AND THE HOLE CLOSES.
```

---

# §6 · THE HONEST RESIDUAL

```
WHAT THIS DOC IS:      the complete, buildable enforcement design — 17 workflows, each a
                       command + a pass condition + an auto-reject, mapped to git/PR/TTSR.
WHAT IS NOT DONE:      W-1..W-17 are SPECIFIED, not built. The hooks do not exist. The scripts
                       do not exist. The PR gate needs a REMOTE (the repo has none).
                       TSG is absent. Semantica has zero callers.
THE OPERATOR'S ORDER:  NO CODE — this is the plan.
★ THE ONE THING ALREADY DONE: the rail (W-7's prerequisite) — the 4098 adapter is RUNNING and
  the gate is PROVEN (an ocr scan returned status:success, 9 findings).
★ THE NEXT LEGAL STEP: the operator authorizes the build, starting with the hooks (W-1, W-6,
  W-9, W-11, W-12, W-13 are the cheapest — pure greps) + the audit gate (W-7, the keystone).
```
