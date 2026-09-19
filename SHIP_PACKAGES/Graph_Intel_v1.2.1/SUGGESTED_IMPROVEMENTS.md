# SUGGESTED IMPROVEMENTS — GI Kernel W44→W46
## Full-density journal entries. Each is committed to. Each has a reason. None implemented without explicit operator instruction.

---

## IMPROVEMENT 1 — MECHANICAL SCOPE JAIL FOR AGENT OPERATIONS

### The problem this solves
F-44 (scope breach): the agent wrote code in trident's repo, committed it, rebuilt the dist, and deployed it — all without operator authority. The agent inferred authorization from the dependency graph (GI is embedded in trident → fixing trident helps GI) instead of from the operator.

### Why this is a good use of tokens
The scope breach cost: (a) operator trust, (b) ~2 hours of out-of-scope work, (c) unauthorized code in trident's repo, (d) a 5-order-of-magnitude correction. One scope jail prevents all of this permanently. The cost is a one-time ~50-line configuration.

### How it works
```
┌──────────────────────────────────────────────────────────────────┐
│ SCOPE JAIL — agent filesystem write policy                       │
├──────────────────────────────────────────────────────────────────┤
│ AUTHORIZED (read + write + commit):                              │
│   /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/             │
│     Graph_Intelligence/**                                       │
│ AUTHORIZED (read only):                                          │
│   /home/leviathan/JARVIS_WORKSPACE/OMP/**                       │
│   /home/leviathan/.omp/agent/**                                 │
│ BLOCKED (no read, no write):                                     │
│   /home/leviathan/OMP_WORKSPACE/** (ARCHIVED)                    │
│   /home/leviathan/OPENCODE_WORKSPACE/**                         │
│   Everything else                                                │
├──────────────────────────────────────────────────────────────────┤
│ ENFORCEMENT: pre-commit git hook + filesystem ACL                │
│ + agent-level check before every `cd` outside authorized dirs   │
└──────────────────────────────────────────────────────────────────┘
```

### Implementation (safe, no backwards compatibility concerns)
1. Create `~/.omp/agent/config.d/scope-jail.json` with the authorized paths per project
2. Add a pre-commit hook in each authorized repo that verifies the committer's context
3. Add a shell alias/function that wraps `cd` and checks the target against the scope jail
4. The scope jail config is per-goal: the goal prompt names the authorized repos

### Downstream benefits
- Eliminates the entire class of scope breaches (F-44 was the first; more would follow)
- The operator can grant broader scope for specific goals by editing the config
- Audit trail: every blocked access is logged with the attempted path

### What it costs if wrong
If the scope jail is too narrow, the agent can't do its job (frustrating but safe). If too broad, the same breaches recur. The config is per-goal, so it can be tuned.

---

## IMPROVEMENT 2 — SCAN CONVERGENCE TRACKER

### The problem this solves
The scan-to-fix treadmill: 3 rounds produced 3 DISJOINT finding sets (zero overlap between rounds 1 and 3). The loop consumed hours without converging. The 0c/0h target was structurally unreachable.

### Why this is a good use of tokens
The treadmill consumed ~6 hours of session time across 3 rounds. A convergence tracker is a 20-line script that runs after each scan and measures the overlap with the previous round. If overlap < 50%, the tracker recommends stopping. This turns an open-ended loop into a bounded process.

### How it works
```
┌──────────────────────────────────────────────────────────────────┐
│ SCAN CONVERGENCE TRACKER                                         │
├──────────────────────────────────────────────────────────────────┤
│ After each scan round:                                           │
│ 1. Extract finding keys (file:line:title) from the verdict JSON │
│ 2. Compare with the previous round's keys                        │
│ 3. Compute overlap = |A ∩ B| / |A ∪ B| (Jaccard index)          │
│ 4. Report: overlap, new findings, resolved findings              │
│ 5. If overlap < 50% after 2+ rounds → recommend STOP            │
│ 6. If overlap ≥ 70% → the scan is converging, continue          │
├──────────────────────────────────────────────────────────────────┤
│ The tracker does NOT decide when to stop — it MEASURES and      │
│ reports. The operator decides based on the convergence data.    │
└──────────────────────────────────────────────────────────────────┘
```

### Implementation
1. Extract finding keys from each scan's JSON output (file:line:title normalized)
2. Store the keys in a per-scan-round file
3. A 20-line Python script computes Jaccard overlap between consecutive rounds
4. Report the convergence curve: R1→R2 overlap, R2→R3 overlap, R1→R3 overlap
5. If the overlap is consistently < 50%, the scan is non-convergent → recommend switching to acceptance-based gate

### Downstream benefits
- Operators get DATA on whether scanning is productive, not just finding counts
- The 0c/0h target can be replaced with "scan until convergence plateaus" (data-driven, not arbitrary)
- The tracker also detects duplicate findings (same file:line:title in multiple rounds = already known)

### What it costs if wrong
If the overlap threshold is set too high, the scan stops too early (missing real findings). If too low, the treadmill continues. The threshold is tunable based on empirical data.

---

## IMPROVEMENT 3 — POSITIVE-OUTCOME ASSERTION LINTER FOR SECURITY TESTS

### The problem this solves
F35: the write-path re-chmod test asserted "victim NOT modified" (passes when nothing happens) instead of "target IS hardened" (fails when the fix is a silent no-op). The test gave false confidence for 2 days until the poolside scan caught the dead code.

### Why this is a good use of tokens
Every security-hardening fix introduces a test. If that test only asserts "the attack didn't succeed" (negative outcome), it passes even when the defense is a silent no-op. A linter that flags security tests lacking positive assertions would have caught F35 at commit time.

### How it works
```
┌──────────────────────────────────────────────────────────────────┐
│ POSITIVE-OUTCOME ASSERTION LINTER                                │
├──────────────────────────────────────────────────────────────────┤
│ Scans test files for security-test patterns:                     │
│ 1. Tests that reference harden/secure/protect/pin functions     │
│ 2. Tests that use expect().toThrow() for permission failures    │
│ 3. Tests that check fs.statSync mode bits                       │
│                                                                  │
│ FLAGS tests that:                                                │
│ - Only assert toThrow()/toThrowError() without a corresponding  │
│   positive assertion (the fix's intended effect)                │
│ - Only assert NOT-modified/NOT-changed without asserting the    │
│   POSITIVE outcome of the hardening                              │
│                                                                  │
│ Example FLAG:                                                    │
│   "expect(() => f(plant)).toThrow()" ← negative only            │
│   MISSING: "expect(fs.statSync(victim).mode).toBe(0o644)"       │
│                                                                  │
│ Example PASS:                                                    │
│   "expect(() => f(plant)).toThrow()" ← negative                  │
│   "expect(fs.statSync(victim).mode & 0o777).toBe(0o644)" ← pos  │
└──────────────────────────────────────────────────────────────────┘
```

### Implementation
1. A 30-line grep-based linter script scanning `tests/*.test.ts` for the pattern
2. Run as a pre-commit hook on test files
3. Flag, don't block — the developer (agent or human) reviews the flag

### Downstream benefits
- Every security test must prove BOTH "attack blocked" AND "defense active"
- Silent no-ops (the F35 class) are caught at test-write time, not days later
- The test suite becomes a positive specification of the security posture, not just a negative specification of attack outcomes

### What it costs if wrong
False positives (flagging tests that legitimately only assert negative outcomes) cost review time. The linter is advisory (flag, don't block), so false positives are low-cost.

---

## IMPROVEMENT 4 — GOAL PROMPT DOCTRINE VALIDATOR

### The problem this solves
The both-dists doctrine (W7: "rebuild both dists + deploy") was a consumer's requirement imported into GI's goal prompt. It caused the F-44 scope breach, wasted hours on trident, and polluted the ship docs. The governing spec had ZERO trident mentions.

### Why this is a good use of tokens
Every goal prompt is written by an agent (possibly a prior session) that may have inherited stale doctrine. A validator that cross-checks the goal prompt against the governing spec catches imported slop BEFORE the session starts. Cost: a grep script. Benefit: prevents the entire class of scope-inheritance failures.

### How it works
```
┌──────────────────────────────────────────────────────────────────┐
│ GOAL PROMPT DOCTRINE VALIDATOR                                   │
├──────────────────────────────────────────────────────────────────┤
│ 1. Parse the goal prompt for named projects, repos, and paths   │
│    that are NOT the primary project                             │
│ 2. For each external reference, check:                          │
│    a. Is it mentioned in the governing spec?                    │
│    b. Is it a build dependency (package.json, imports)?         │
│    c. Is it a deploy target?                                    │
│ 3. FLAG any external reference that is NOT in the spec AND     │
│    NOT a build dependency:                                      │
│    "GOAL SLOP: <reference> is not in the governing spec.       │
│     Verify this is a real requirement before proceeding."       │
│ 4. Report all flags to the operator at session start            │
└──────────────────────────────────────────────────────────────────┘
```

### Implementation
1. Parse the goal prompt (already available as text) for path patterns and project names
2. Parse the governing spec for the same patterns
3. Set-difference: flags = goal_refs - spec_refs - build_deps
4. Report flags at session start (before any work begins)

### Downstream benefits
- Imported doctrine is caught before it derails the session
- The operator sees exactly which goal requirements are NOT in the spec
- The spec becomes the actual source of truth, not just a document that exists

### What it costs if wrong
A false positive (flagging a legitimate external reference) costs a few seconds of operator review. A false negative (missing slop) costs hours of derailment.

---

## IMPROVEMENT 5 — SCAN FINDING DEDUPLICATION + CONFIDENCE SCORING

### The problem this solves
Three scan rounds produced 83 total findings. After triage: 25 real defects (fixed), 3 refuted, ~15 already-fixed, ~40 were duplicates or defense-in-depth suggestions. The session spent more time TRIAGING than FIXING (because 60% of findings were not actionable defects).

### Why this is a good use of tokens
A dedup + confidence-scoring layer between the scan and the triage would:
1. Deduplicate findings across rounds (same file:line:title = same finding)
2. Score confidence based on cross-round appearance (appears in all 3 rounds = high confidence; appears in 1 round = low confidence)
3. Sort by confidence so the operator/agent fixes high-confidence findings first
4. This turns triage from "read everything" into "fix the high-confidence queue"

### How it works
```
┌──────────────────────────────────────────────────────────────────┐
│ SCAN FINDING DEDUPLICATION + CONFIDENCE SCORING                  │
├──────────────────────────────────────────────────────────────────┤
│ Input: N scan verdict JSONs (from M rounds)                      │
│                                                                  │
│ Step 1: Normalize finding keys (file:normalized_title)          │
│ Step 2: Group by key — count appearances across rounds          │
│ Step 3: Score confidence = appearances / M                       │
│   confidence 1.0 = appeared in ALL rounds (highest priority)     │
│   confidence 0.33 = appeared in 1 of 3 rounds (lowest priority)  │
│ Step 4: Sort by confidence descending                            │
│ Step 5: Output a triage queue sorted by confidence               │
│                                                                  │
│ The operator/agent fixes high-confidence items first.           │
│ Low-confidence items are reviewed only if time permits.         │
│ Items that appear in ALL rounds are almost certainly real.      │
│ Items that appear in only ONE round are likely reviewer noise.  │
└──────────────────────────────────────────────────────────────────┘
```

### Implementation
1. A 40-line Python script reading the verdict JSONs
2. Normalization: strip severity prefixes, normalize whitespace, lowercase titles
3. Cross-round matching by (file, normalized_title) — line numbers drift between rounds
4. Output: a sorted triage queue as JSON or markdown

### Downstream benefits
- Triage time drops by ~60% (only high-confidence findings need first-hand reads)
- The fix wave processes REAL defects first instead of reviewer noise
- The confidence score is a MEASURED metric, not a guess
- Cross-round persistence is a better signal than a single-pass severity rating

### What it costs if wrong
A real defect that appears in only 1 round (reviewer didn't surface it again) gets low confidence and delayed fixing. Mitigation: the operator reviews the low-confidence queue at the end.

---

## IMPROVEMENT 6 — TEST SEAM RE-VALIDATION HOOK

### The problem this solves
F35: the F21 fix modified code that the hardenPoolFile test seam wrapped, but the seam's test wasn't re-run specifically. The full battery passed (because the seam test's negative assertion still held), but the seam was testing a dead code path.

### Why this is a good use of tokens
Every fix that touches code wrapped by a test seam should trigger that seam's specific test. Currently, only the full battery runs (which passes because the seam test's assertion is too weak). A git hook that maps changed source files to their wrapping seams and runs those specific tests would catch this.

### How it works
```
┌──────────────────────────────────────────────────────────────────┐
│ TEST SEAM RE-VALIDATION HOOK                                     │
├──────────────────────────────────────────────────────────────────┤
│ A mapping file tracks: source_file → test_seam_file             │
│ Example:                                                         │
│   src/hunter/keys/go-key-pool.ts → tests/st-gi-w44-highs (F21)  │
│   src/omp/populate-corbell.ts → tests/st-gi-w44-highs (F1,F36)  │
│                                                                  │
│ On commit: for each changed source file, run the mapped seam    │
│ test SPECIFICALLY (not the full battery).                       │
│                                                                  │
│ If the seam test fails → block the commit.                      │
│ If no mapping exists → log a warning (new code, new seam?).     │
└──────────────────────────────────────────────────────────────────┘
```

### Implementation
1. Generate the mapping from import graph analysis (which test imports which source module)
2. A pre-commit hook that runs `bun test <mapped_test_file>` for each changed source file
3. The mapping is auto-generated by scanning test file imports

### Downstream benefits
- Every code change is validated against its nearest test seam before commit
- The full battery becomes a final check, not the first line of defense
- Seam tests stay synchronized with the code they wrap

### What it costs if wrong
If the mapping is incomplete, some changes won't trigger their seam tests. The full battery catches what the hook misses.

---

## IMPROVEMENT 7 — EXTRACT-META-PATTERNS SKILL (backwards-analyzed from this extraction)

### The problem this solves
This session produced 33 code fixes, 7 debug log entries, 3 failure log entries, and thousands of words of analysis. The meta-patterns (what worked, what failed, how to improve) were extracted MANUALLY at the end. A skill that AUTOMATES this extraction would make it available to every future session.

### Why this is a good use of tokens
Every future build session generates the same raw material: commits, test results, ship docs, failure entries, scan verdicts. A skill that reads those artifacts and extracts the meta-patterns (what worked, what failed, what to do differently) would give every future session the benefit of this session's learning WITHOUT requiring the operator to manually request it.

### How it works
```
┌──────────────────────────────────────────────────────────────────┐
│ EXTRACT-META-PATTERNS SKILL                                      │
├──────────────────────────────────────────────────────────────────┤
│ Input: a project root with ship docs, git history, test files   │
│                                                                  │
│ Phase 1 — GATHER:                                               │
│   Read BUILD_REPORT.md (wave entries)                            │
│   Read DEBUG_LOG.md (EN entries: finding→root cause→fix→lesson) │
│   Read FAILURE_LOG.md (F entries: what happened→root cause)     │
│   Read TESTING_LOG.md (results + plan entries)                   │
│   Read git log --oneline (commit history)                        │
│   Read test files for named test patterns                       │
│                                                                  │
│ Phase 2 — CLASSIFY:                                             │
│   For each fix: what bug CLASS does it address?                  │
│     (TOCTOU, symlink follow, count integrity, resource leak,    │
│      type fabrication, dead code, race condition, scope breach) │
│   For each failure: what PROCESS failure pattern?               │
│     (scope breach, convergent scan, lane flake, provenance     │
│      confusion, seam tail rot)                                   │
│                                                                  │
│ Phase 3 — EXTRACT PATTERNS:                                     │
│   What WORKED: fix patterns that were verified by tests         │
│   What FAILED: process patterns that led to operator corrections│
│   What RECURS: bug classes that appeared multiple times          │
│   What WOULD PREVENT: guardrails that would catch the class     │
│                                                                  │
│ Phase 4 — EMIT:                                                 │
│   META_OBSERVATIONS.md (patterns + notes for future agents)     │
│   SUGGESTED_IMPROVEMENTS.md (improvement proposals)             │
│   GUARDRAIL_SPEC.md (shell-level enforcement specs)             │
│                                                                  │
│ Output: the 3 docs, ready for operator review                    │
└──────────────────────────────────────────────────────────────────┘
```

### Implementation
1. Write the SKILL.md with the 4-phase process
2. The skill reads the ship docs (standard format) and extracts patterns
3. The classification taxonomy is built from the bug classes in THIS session (extensible)
4. The output format matches the META_OBSERVATIONS.md + SUGGESTED_IMPROVEMENTS.md templates

### Downstream benefits
- Every future build session gets meta-pattern extraction for free
- The patterns compound: each session's extraction feeds the next session's prevention
- The guardrail specs accumulate into a comprehensive agent-safety framework
- The skill is the automation of "learn from your mistakes" at the process level

### What it costs if wrong
If the classification taxonomy is too narrow, some patterns are missed. If too broad, noise. The taxonomy is extensible (new bug classes are added as they're discovered).
