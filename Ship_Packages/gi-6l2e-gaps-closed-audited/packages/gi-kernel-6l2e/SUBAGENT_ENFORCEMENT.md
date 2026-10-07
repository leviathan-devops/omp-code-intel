# THE SUBAGENT ENFORCEMENT WORKFLOW — FORCED COMPLIANCE
## The orchestrator's police loop. The rogue subagent is mechanically incapable of cheating.

**Date:** 2026-09-22 · **Premise:** the subagent is MALICIOUS AND DUMB. It is assumed guilty. Every cheat has a detector; every detector auto-rejects.

---

# §0 · THE THREAT MODEL

```
THE SUBAGENT WILL:
  · claim work it did not do            (the phantom)
  · write tests that cannot fail        (the theatrical test)
  · put the passToken in its own prose  (the circular token)
  · ship a layer with 0 consumers       (the light-switch — the exact failure of the last build)
  · answer about the wrong tree         (rows=0 read as "no callers")
  · shrink the scope                    ("2 layers first")
  · mark a wave complete on its own word (the fabricated completion)
  · catch an error and continue         (the silent no-op)
★ THE ORCHESTRATOR'S JOB: MAKE EVERY ONE OF THESE MECHANICALLY IMPOSSIBLE.
```

---

# §1 · ★ THE SEVEN-LAYER ENFORCEMENT (each layer catches a different cheat)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ L1 · THE DISPATCH CONTRACT — the subagent cannot claim undone work       │
│   every dispatch carries the CONTRACT block (§2) + the detectors inline  │
├──────────────────────────────────────────────────────────────────────────┤
│ L2 · THE WAVE-MANAGER — the ONLY dispatch path                           │
│   task action=generate → auto-dispatch · trident-wave-read for liveness  │
├──────────────────────────────────────────────────────────────────────────┤
│ L3 · THE STREAM GATE — the return must be INTACT                         │
│   the returnTruncated flag + the closing-structure read                  │
├──────────────────────────────────────────────────────────────────────────┤
│ L4 · ★ THE PHANTOM CHECK — sha256 before/after                           │
│   "completed" + zero disk change = KICK BACK                             │
├──────────────────────────────────────────────────────────────────────────┤
│ L5 · ★ THE PER-HUNK AUDIT — WHAT/WHY/HOW + a verdict per hunk            │
│   CORRECT | FLAWED | FITTED-TO-GOLDEN | FABRICATION | VIOLATION | CREEP  │
├──────────────────────────────────────────────────────────────────────────┤
│ L6 · ★ THE MECHANICAL RE-VERIFY — I run tsc + the battery + the casts    │
│   the agent exit codes are CLAIMS; MY runs are EVIDENCE                  │
├──────────────────────────────────────────────────────────────────────────┤
│ L7 · ★ THE FIREWALL — the 40 detectors (ANTI_THEATRICAL_FIREWALL.md)     │
│   one command; exit nonzero = the wave FAILS ON SIGHT                    │
└──────────────────────────────────────────────────────────────────────────┘
★ A WAVE CLOSES ONLY ON THE ORCHESTRATOR'S VERIFIED VERDICT. NEVER ON A SUBAGENT'S WORD.
```

---

# §2 · THE DISPATCH CONTRACT (pasted VERBATIM into every subagent prompt)

```
═══ THE CONTRACT (binding — a violation FAILS THE WAVE ON SIGHT) ═══

THE SCOPE IS 8/8: L1 SEMANTICA · L2 ARSUMBRIS · L3 UA · L4 C2KG · L5 CORBELL · L6 GRAPHIFY
                  TSG · ABIDE. A build that wires fewer is INCOMPLETE. SCOPE SHRINK IS FORBIDDEN.

YOU MAY NOT:
  1 claim a change without the file on disk (the orchestrator sha256s before/after)
  2 write a test that does not import the DEPLOYED artifact
  3 assert a wiring via a source-string grep (.includes("Symbol"))
  4 put a passToken in your prose (it must appear in a TOOL RESULT)
  5 shrink the scope
  6 mark a wave complete on your own word (the orchestrator audits; the board closes on ITS verdict)
  7 catch an error and continue silently (log it or propagate it)
  8 report "verified" without the pasted command output beneath it
  9 ship a layer whose consumer list is empty (GI_LAYER_UNCONSUMED = FAIL)
 10 answer rows:0 for an out-of-scope target (GI_STORE_SCOPE_MISMATCH = FAIL)

YOU MUST:
  · name the LAYER-EDGE your wave delivers (not just a file)
  · prove each gate with a KNOWN-BAD fixture that MUST refuse
  · report the exact commands + their raw outputs
  · end with THE EVIDENCE BLOCK: every verification command with its raw output

★ EVERY VIOLATION = THE WAVE FAILS ON SIGHT. NO RETRY-AS-ERASURE.
```

---

# §3 · THE ORCHESTRATOR'S PER-WAVE LOOP (mechanical, no judgment required)

```
1 DISPATCH    task action=generate (the wave-spec.json: the E1/E2/B1-B5 template + the contract)
2 POLL        trident-wave-read sessionId  — the ONLY liveness truth (a stream, not a status field)
                stream → working (leave it) · idle → kick (action=resume) · complete → audit
3 AUDIT       a THE STREAM GATE    the return intact? (the truncation flag)
              b THE PHANTOM CHECK  `git diff --name-only` non-empty? sha changed?
              c THE PER-HUNK       every hunk exists on disk (grep the claimed line)
              d THE MECHANICAL     I run: `bunx tsc --noEmit` + `bun test` + the casts
              e THE FIREWALL       `bash scripts/anti-theatrical-firewall.sh` → exit 0?
              f THE ADVERSARIAL    the black-hat corpus (THE_6L2E_TESTING_SUITE.md §3)
4 VERDICT     per hunk: CORRECT | FLAWED | FITTED-TO-GOLDEN | FABRICATION | VIOLATION | CREEP
              → `.trident/wave-audit/<wave>.md` (the per-hunk verdicts + the coverage map)
5 CLOSE       the ledger row + the canon/ship docs (the record loop, §5)
★ A WAVE WITH NO PER-HUNK VERDICTS IS UNAUDITED. AN UNAUDITED WAVE IS AN UNFINISHED DISPATCH.
```

---

# §4 · THE ESCALATION LADDER (the third occurrence is a design order)

```
VIOLATION 1   the wave FAILS. The subagent is kicked with the NAMED detector + the remedy.
VIOLATION 2   the wave FAILS. The desk is REASSIGNED to a fresh subagent, the detector in the prompt.
VIOLATION 3   ★ THE DESK IS RETIRED. The orchestrator builds the artifact ITSELF, or re-plans the
              wave. (The third occurrence is a DESIGN ORDER, not a triage row.)
NEVER: a retry-as-erasure · "the fix landed" without the re-run · a soft pass · a scope cut.
```

---

# §5 · THE RECORD LOOP (per wave, mandatory — the doc is part of the task)

```
AFTER EVERY COMPLETED WAVE (the orchestrator's verified verdict):
  canon-doc-update:  context_management/ (11) — the 2 logs (RUNNING_BUILD_LOG + RUNNING_DEBUG_LOG)
                     at the HIGHEST rate, the moment the work lands
  ship-docs-update:  BUILD_REPORT · DEBUG_LOG · FAILURE_LOG · SPEC_VIOLATION_LOG · TESTING_LOG ·
                     THEATRICALITY_LOG (the OPERATOR-CAUGHT count driven to zero)
★ A WAVE WITHOUT ITS DOC ENTRY IS AN UNFINISHED WAVE.
```

---

# §6 · THE PARALLEL DISPATCH (hydra-mode — the interface-first rule)

```
T0  A-0 lands the STORE (the substrate every adapter reads) + the REGISTRY INTERFACE (frozen)
T1  B-1..B-6 (the 6 layers) + C-1..C-2 (the 2 kernels) + D-1 fire IN PARALLEL
      ★ disjoint adapters · one registry interface · 9 waves at T1
T2  D-2 integrates (the decision consults the registry — the ONE serial point)
T3  E-1..E-3 (the proof + the seal)
★ BOUNDARY CHECK at every T-point: the predecessor's done-when gate + `tsc --noEmit` on the
  COMBINED tree. NEVER dispatch a dependent on a CLAIMED-complete predecessor.
```

---

# §7 · THE BOARD (the task tree — the live view; the disk is the truth)

```
PLAN A: substrate (1 wave)          ← gates everything
PLAN B: the 6 layers (6 waves)      ← PARALLEL
PLAN C: the 2 kernels (2 waves)     ← PARALLEL
PLAN D: register + decision (2)     ← D-2 serial
PLAN E: proof + seal (3 waves)
DEP-GATE T0: A-0 done → fire B-1..D-1
DEP-GATE T2: B+C+D-1 done → fire D-2
QC: the integration audit · the 7-class corpus · the container
DOC: canon + ship docs after EVERY wave
★ A TODO COMPLETES ONLY WHEN THE ORCHESTRATOR'S AUDIT VERDICT LANDS. A subagent's return closes nothing.
```

---

# §8 · THE ANTI-DERAIL (the last build's failures — mechanically prevented)

```
AD-1 THE CATEGORY ERROR (the eyes as a light switch) → AR-18/AR-19/AR-23 detect it
AD-2 THE FILE-ORGANIZED WAVE                        → AR-20 refuses it
AD-3 THE STALE STORE                                → AR-24/AR-25/AR-26 detect it
AD-4 THE UNCOVERED RULE                             → AR-29 detects it
AD-5 THE CALLEE-FIX-WITHOUT-THE-CALLSITE            → AR-22 detects it
AD-6 THE UNWIRED KERNEL                             → AR-21 detects it
AD-7 THE STALE DEPLOY                               → AR-28 detects it
AD-8 THE SCOPE SHRINK                               → the wave-plan gate (WAVES: 12) refuses it
```

# §9 · THE SELF-CHECK (the orchestrator, before declaring any wave done)

```
[ ] the stream gate passed (the return intact)
[ ] the phantom check passed (a real disk change exists)
[ ] the per-hunk verdicts written to .trident/wave-audit/<wave>.md
[ ] I ran tsc + the battery + the casts MYSELF
[ ] the anti-theatrical firewall exited 0
[ ] the black-hat corpus ran (positive + negative)
[ ] the layer-edge is REAL (the consumer count increased)
[ ] the canon + ship docs updated
[ ] the board reflects the verified state
[ ] ZERO open CRITICAL/HIGH
★ ANY UNCHECKED BOX = THE WAVE IS NOT DONE.
```
