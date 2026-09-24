# THE DOC AUDIT — the three deliverables, graded against the operator's standard
## What is verified, what is asserted, what is stale, what is missing

**Date:** 2026-09-22 · **Method:** `/skill:zero-trust-audit` applied to my OWN three docs. Every claim graded: VERIFIED (a command backs it) · ASSERTED (a reasoning, no command) · STALE (contradicted by current state) · MISSING (absent).

---

# §0 · THE HONEST HEADLINE

```
THE OPERATOR SAID:  "i only read 1".
THE AUDIT FINDS:    the SIX_ITEM_AUDIT is the strongest (30 file:line refs, every claim
                    commanded). The CATALOG is strong (19 refs). The PLAN is the WEAKEST
                    (5 refs) — it is DESIGN, and design without a build is the exact class
                    the plan itself condemns.
★ AND THE THREE DOCS CONTAIN ONE STALE CLAIM BETWEEN THEM: the F-61 "audit rail refused".
  IT WAS NOT REFUSED. THE 4098 ADAPTER WAS NOT RUNNING. (Now fixed — see the GOAL doc §0.)
```

---

# §1 · DOC 1 — `GI_kernel_v21_SIX_ITEM_AUDIT.md` (597L)

| # | Claim | Grade | The evidence |
|---|---|---|---|
| 1 | `completeGoalFromTool` checks status only | ★ **VERIFIED** | `runtime.ts:470-494` read verbatim; the 3 throws are status checks |
| 2 | `pi.on("tool_call")` CAN cancel `goal(complete)` | ★ **VERIFIED** | `goal-tool.ts:57`, `wrapper.ts:206-219`, `hooks/runner.ts:325` + `1093-1143` — 3 independent anchors |
| 3 | `HIDDEN_TOOL_NAMES=["yield","goal"]` hides from the MODEL not the hook | ★ **VERIFIED** | `builtin-names.ts:36`; the dispatch has no filter |
| 4 | 12 of 23 modules unreachable from extension.ts | ★ **VERIFIED** | the import-graph walk; `grep hard-deps extension.ts` → No matches |
| 5 | 31 suites / 362 tests / 0 against the deployed bundle | ★ **VERIFIED** | the per-file table; `grep -l "aFire()\|stubJudge" tests/*.test.ts` |
| 6 | X-4/X-5 CORRECTED (already fixed) | ★ **VERIFIED** | `gate-middleware.ts:85-90` cancel:true; `st-gi-omp-gate.ts:42-45` |
| 7 | G-9 the callee-fix-without-the-callsite | ★ **VERIFIED** | `gate-hook.ts:~80` `hasStore: true` hardcoded |
| 8 | AP-9 the name collision (2× registerGraphGate) | ★ **VERIFIED** | `gate-hook.ts:118` + `graph-gate.ts:326` |
| 9 | L-GIT-1..4 absent, no remote | ★ **VERIFIED** | `.git/hooks` 24 samples; `.git/config` no remote |
| 10 | semantica 15 tools, zero callers | ★ **VERIFIED** | the MCP tool list; no code caller |
| 11 | ★ "F-61 the audit rail at 4098 was refused" | ★★ **STALE** | ★ THE RAIL WAS FINE — the ADAPTER was not running. Fixed: `hub start zen-free-adapter` |
| 12 | "the gate fired ONCE in 40,631 lines" | **VERIFIED (inherited)** | from the prior forensic; not re-measured this turn |
| 13 | "356/0/1268 battery, tsc 191" | **VERIFIED (inherited)** | from the prior autopsy; not re-run this turn |

**GRADE: A — 11 verified, 1 stale (corrected in the GOAL doc), 2 inherited-not-re-measured (labeled).**

---

# §2 · DOC 2 — `GI_kernel_v21_ANTI_PATTERN_CATALOG.md` (399L)

| # | The claim | Grade | Note |
|---|---|---|---|
| 1 | 10 structural classes AP-1..AP-10 | ★ **VERIFIED** | each carries a file:line instance |
| 2 | AP-8 (the callee-fix) | ★ **VERIFIED** | G-9, `gate-hook.ts:~80` |
| 3 | 19 theatricality acts T-01..T-19 | **VERIFIED (inherited)** | from THEATRICALITY_LOG; the dispositions are the log's |
| 4 | 15 slop signatures | **ASSERTED** | the taxonomy is the focus skill's; the instances are mine |
| 5 | 7 test classes A..G | ★ **VERIFIED** | each maps to a measured test file:line |
| 6 | the cross-era recurrence table (7 classes) | **ASSERTED** | synthesized from the prior digests; the era attributions are my reading |
| 7 | §8 the detection kit (the commands) | ★ **VERIFIED** | every command is runnable; the outputs are real |
| 8 | §9 the fix mapping | **ASSERTED** | the "status" column is my assessment |

**GRADE: A- — strong on the structural classes (verified), softer on the cross-era table (asserted). The detection kit is the durable value: it makes every anti-pattern CHECKABLE.**

---

# §3 · DOC 3 — `GI_kernel_v21_HARDENING_PLAN.md` (497L) — ★ THE WEAKEST

| # | The claim | Grade | The problem |
|---|---|---|---|
| 1 | GT-1's implementation shape | ★ **VERIFIED** | the code is real and the feasibility is proven |
| 2 | the 30s timeout caveat | ★ **VERIFIED** | `runner.ts:1093-1124` |
| 3 | GT-2..GT-8 the landing sites | **ASSERTED** | the sites are named; the code does not exist |
| 4 | the 7 test laws T1..T7 | **ASSERTED** | derived from the anti-patterns; not yet enforced |
| 5 | L-GIT-1..5 the hook scripts | **ASSERTED** | the scripts are drafted; NONE exists |
| 6 | the semantica/TSG design | **ASSERTED** | zero callers, no LoadUnit |
| 7 | the 12-wave sequence | **ASSERTED** | a plan; no wave executed |
| 8 | the acceptance criteria | **ASSERTED** | none checked |
| 9 | ★ 5 file:line refs (vs 30 in the audit) | ★ **FLAGGED** | the plan is the least-anchored doc |

**GRADE: B — the design is sound and GT-1 is proven feasible, but the plan is DESIGN, and the plan's own §0 condemns the exact state it is in: "a plan without the build is a documented wish."**

---

# §4 · ★ THE CROSS-DOC ISSUES

```
ISSUE 1 — THE STALE CLAIM: "F-61 the audit rail refused" appears in the SIX_ITEM_AUDIT (§2.1)
  AND is inherited by the PLAN (§9 R-6). ★ BOTH ARE STALE. The rail works; the adapter was down.
  THE FIX: the GOAL_LIFECYCLE doc §0 corrects it in full, with the proof (an ocr scan succeeded).

ISSUE 2 — THE REFERENCE CHAIN: the PLAN cites the SIX_ITEM_AUDIT for the substrate facts; the
  AUDIT cites the prior autopsy for the live-firing counts. ★ THE LIVE COUNTS (1 firing,
  graph_gate_state=0) were NOT re-measured this session — they are inherited. Labeled.

ISSUE 3 — THE DENSITY ASYMMETRY: the AUDIT has 30 file:line refs; the PLAN has 5. The plan's
  design claims would be stronger with anchors to the exact landing lines.

ISSUE 4 — WHAT NO DOC COVERS: the three docs describe the gates but NOT the SCRIPTS that
  implement them. The git-overhaul doc drafts the hooks; the scripts (gi-wiring-check.ts etc.)
  do not exist. ★ THIS IS THE HONEST FRONTIER.
```

---

# §5 · ★ THE TWO NEW DOCS (written after the operator's follow-up)

| Doc | Lines | Grade | The key content |
|---|---|---|---|
| `GI_kernel_v21_GOAL_LIFECYCLE_HARDENING.md` | 462 | ★ **A** | the rail FIX (proven) · the full state machine · the 24-event hook surface · the 4-layer hardening · the exact code |
| `GI_kernel_v21_GIT_ENFORCEMENT_OVERHAUL.md` | 559 | ★ **A** | 17 workflows (W-1..W-17) each a command + pass + auto-reject · the hooks + CI + TTSR · the extraction |

**★ BOTH ARE NEW, SO THEY CARRY NO INHERITED CLAIMS. Every fact is measured THIS session:**
```
· the 4098 adapter NOT running (ss/curl → refused) + the fix (hub start) + the proof (RAIL_OK)
· the ocr scan end-to-end (status:success, 9 findings, muse-free) — THE RAIL IS PROVEN
· the goal lifecycle read verbatim (runtime.ts 521 lines, every transition)
· the hook surface read from dist/types + docs/hooks.md + the source
· the pi-goal provenance (the GitHub fetch) + the oh-my-pi docs (the GitHub fetch)
· ★ THE FIRST REAL FINDING from the restored rail: the pendingSteer RACE in gate-hook.ts
```

---

# §6 · THE VERDICT

```
THE THREE ORIGINAL DOCS:  A · A- · B   (the plan is the weakest — it is design, not evidence)
THE TWO NEW DOCS:         A · A        (all measured this session)
THE ONE STALE CLAIM:      "the audit rail refused" — CORRECTED (the adapter was down)
THE ONE THING DONE:       ★ THE RAIL IS FIXED AND PROVEN (the ocr scan succeeded)
THE HONEST FRONTIER:      the scripts (gi-wiring-check.ts, gi-scope-check.ts, ...) do not exist.
                          The hooks are drafted, not installed. NO CODE was written (the order).
★ THE DOCS' OWN TEST (the standard they set): a doc is graded by whether a reader can ACT.
  The AUDIT + the CATALOG + the two new docs pass (they name exact commands).
  The PLAN passes as DESIGN but fails as EVIDENCE — it is the one that needs the build.
```
