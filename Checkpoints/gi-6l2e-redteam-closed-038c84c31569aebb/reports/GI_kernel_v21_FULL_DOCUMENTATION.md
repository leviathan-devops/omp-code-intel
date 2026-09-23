# GI KERNEL v2.1 — FULL DOCUMENTATION
## Every Task, Specified. No Code. Documentation Only.

**Date:** 2026-09-22 · **Baseline:** `jarvis/gi-main` · **Status:** documentation set, per operator order ("NO CODE — GET MY FULL DOCUMENTATION")
**Companion artifacts:** `GI_kernel_v21_forensic_autopsy_context.md` · `GI_kernel_v21_deep_live_forensic.md` · `v2.1-initial-autopsy-report.md`

---

# PART 0 · THE INDEX

| § | Task | Deliverable |
|---|---|---|
| §1 | The forensic | (the 3 companion artifacts) |
| §2 | **NO FALLBACKS** — loud-crash on every layer | the per-layer refusal spec |
| §3 | Why the gate isn't intelligent | the actual mechanics, documented |
| §4 | How this passed the goal loop / review / shipped | the failure inventory |
| §5 | The mechanical gates to build | the enforcement spec |
| §6 | The test inventory — the theatrical tests | the rip-apart |
| §7 | The testing framework + git/GitHub rails + semantica/TSG | the design |

---

# §1 · THE FORENSIC (complete)

**Three artifacts carry the full evidence. Read in this order:**

| # | Artifact | What it is |
|---|---|---|
| 1 | `reports/v2.1-initial-autopsy-report.md` | The FIRST pass: the blast report + show-me (6 layers, 2 Jev layers, TSG, the honest ratio). |
| 2 | `reports/GI_kernel_v21_forensic_autopsy_context.md` | The deep autopsy: the root cause traced to code, the derailment ledger (F-66..F-72), the theatricality ledger (T-01..T-19), the honest grade. |
| 3 | `reports/GI_kernel_v21_deep_live_forensic.md` | The LIVE forensic: the gate fired ONCE in 40,631 lines; 1,610 SIGNATURE_BREAK + 569 DRIFT_HIGH mentions are PROSE; `graph_gate_state` = 0 rows. |

**THE ROOT CAUSE, stated once (both autopsies agree):**
> The session is scoped to a **worktree holding the PRE-V2 tree** (`src/hunter`, 851 store nodes) while the live kernel is `src/omp` (23 `.ts`) in the main repo. **The graph was populated from the worktree**, so it describes a tree the kernel no longer is. `graph-query` returns `rows=0` for every live symbol; its ripwire fallback is cwd-denied (`RIPWIRE_PATH_DENIED`). **An empty answer and a wrong-scope answer are indistinguishable.** The agent read `rows=0` as "no callers", fell back to reading files, and the only structural detector in the loop became **a model paid per file**.

---

# §2 · NO FALLBACKS — THE LOUD-CRASH SPEC FOR EVERY LAYER

## 2.1 · THE LAW (the operator's words)

> *"i explicitly said NO FALLBACKS - LOUD CRASH ERROR MESSAGE IF SOMETHING ISNT WORKING. ON EVERY SINGLE GRAPH LAYER. CODE THIS CORRECTLY. THIS IS 6 LAYERS OF THEATRICAL GARBAGE."*

## 2.2 · THE CURRENT STATE — EVERY SILENT FALLBACK IN THE KERNEL (measured)

| # | Location | The silent fallback | The violation |
|---|---|---|---|
| S-1 | `gate-middleware.ts:68` | `!hasStore` → `{cancel:false, advisory:"GI_NO_STORE: ALLOW+warn"}` | ★★ A missing graph ALLOWS the edit. The gate is silently disabled exactly when it cannot verify. |
| S-2 | `graph-query` (extension) | `rows=0` returned as a normal answer | An empty answer reads as "nothing there", not "wrong scope". |
| S-3 | `ripwire-bridge.ts` | `RIPWIRE_PATH_DENIED` → the query fails, the caller falls through | The fallback path is a refusal, but the CALLER treats it as "no data". |
| S-4 | `hard-deps.ts` (`audit`, `requireUp`, `assertRegisterComplete`) | **BUILT, TESTED, NEVER CALLED.** `grep -n "hard-deps" src/omp/extension.ts` → empty | ★★★ The loud-crash register exists and the LIVE PATH DOES NOT IMPORT IT. |
| S-5 | `kernel-v2.ts` (`preflight`, `GI_STACK_INCOMPLETE`) | **BUILT, TESTED, NEVER CALLED.** `grep -n "preflight\|kernel-v2" src/omp/extension.ts` → empty | The one-DOWN-refuses-all preflight is not in the extension's init. |
| S-6 | 5 of 6 layers (SEMANTICA, ARSUMBRIS, UNDERSTAND-ANY, CODE-TO-KNOWLEDGE, CORBELL) | 0 nodes each, no caller | They are DOWN by declaration — but nothing asks them, so the DOWN-ness is SILENT. |
| S-7 | `TSG` | `which tsg` → NOT ON PATH | The blueprint says TSG absent ⇒ REFUSE ALL. Nothing calls it. The absence is silent. |
| S-8 | L2 Jev claim firewall | ledger EMPTY (`JevManager/ledger/` → 0 files) | The close-surface judge does not exist, and nothing reports its absence. |
| S-9 | L1 Jev (Abide) | 89.7% `jev_called:false` | The judge SKIPS on 9 of 10 events — a silent non-decision. |

**THE THROUGH-LINE: every one of the nine is the same defect — a missing or broken substrate produces a PASS-shaped result instead of a named refusal.**

## 2.3 · THE REQUIRED BEHAVIOR (the spec, layer by layer)

**THE PRINCIPLE: a substrate that cannot answer MUST SAY SO, LOUDLY, BY NAME. A pass is only ever a pass when the thing that verifies was consulted and answered.**

| # | Layer | The dependency | On absence — the REQUIRED behavior |
|---|---|---|---|
| L1 | SEMANTICA | the semantica consumer + tool | `GI_STACK_INCOMPLETE:L1_SEMANTICA` — REFUSE the act, name the missing consumer. |
| L2 | ARSUMBRIS | the au-host instance socket | `GI_STACK_INCOMPLETE:L2_ARSUMBRIS` — probe `/proc/net/unix` (existence ≠ liveness); a dead socket is DOWN. |
| L3 | UNDERSTAND-ANY | the UA `/understand` pass output | `GI_STACK_INCOMPLETE:L3_UNDERSTAND_ANY` — no graph = no answer. |
| L4 | CODE-TO-KNOWLEDGE | `c2kg` binary | `GI_STACK_INCOMPLETE:L4_C2KG` — absent on this host = REFUSE. |
| L5 | CORBELL | the corbell checkout + freshness | `GI_STACK_INCOMPLETE:L5_CORBELL` — a stale checkout is DOWN (freshness is part of the dependency). |
| L6 | GRAPHIFY | the graphify store + freshness | `GI_STACK_INCOMPLETE:L6_GRAPHIFY` — a store describing the wrong tree is DOWN, and it must SAY which tree it holds. |
| — | TSG | the load unit | `GI_ENFORCE_TSG` → REFUSE ALL (the blueprint's own table). |
| — | the GATE | a store for this scope | ★★ `GI_NO_STORE` → **`cancel:true`**, never ALLOW+warn. The only escape is the explicit, named `GI_ALLOW_NO_STORE=1`, which records that the gate was bypassed ON PURPOSE. |

**THE THREE MECHANICAL REQUIREMENTS:**
```
1 THE PREFLIGHT RUNS AT INIT. extension.ts must call the register audit on boot:
  one DOWN layer ⇒ GI_STACK_INCOMPLETE:<id> ⇒ the extension registers NO tools and
  says WHY. (Today: hard-deps.ts is imported by nothing.)
2 THE QUERY MUST DISTINGUISH EMPTY FROM WRONG-SCOPE. rows=0 about a target that is
  not in the populated tree ⇒ GI_STORE_SCOPE_MISMATCH:<target>, not rows=0.
  (This ONE change would have prevented F-66..F-69.)
3 THE GATE MUST REFUSE WHEN BLIND. GI_NO_STORE ⇒ cancel:true. A missing substrate
  is never a pass. (Today it is ALLOW+warn — the exact silent fallback.)
```

## 2.4 · THE FRESHNESS REQUIREMENT (part of every layer's dependency)

**A STALE SUBSTRATE IS DOWN.** The kernel HAS the instrument (`storeFreshness` in `typed-write.ts:424`, `gi_populated_at` in `gi_meta`) and **never runs it**. The spec:
```
EVERY layer's probe() must include a FRESHNESS check:
  populated_at < the newest source mtime  ⇒ DOWN, with the age named.
THE MEASURED GAP (this session): store populated 2026-09-21T01:21Z; the live sources
are 2026-09-21T17:5xZ; the DEPLOYED bundle is 2026-09-20T07:11Z — 21-35h stale.
```

---

# §3 · WHY THE GATE ISN'T INTELLIGENT — THE ACTUAL MECHANICS

## 3.1 · THE OPERATOR'S QUESTION

> *"why is this blindly 3. why is this not event aware and intellignet? is it? explain the ACTUAL mechanics here based on waht is actualyl coded."*

## 3.2 · THE ACTUAL MECHANICS (read from `graph-gate.ts`, this session)

**THE TRIGGER (the "blindly 3"):**
```
T2 BLOCK  ⇐  drift >= 0.60  AND  n >= 3          (gateDecision, graph-gate.ts:223)
  n      =  consecutiveUnverified()  — counts BACKWARD from the newest edit,
           stopping at the first verified one (graph-gate.ts:194-206)
  drift  =  SUM(SEV_WEIGHT[sev] * decay)  over a 300,000ms (5-minute) window
  decay  =  1 - age/window  (a linear fade)
  SEV_WEIGHT: NONE 0 · LOW 1 · MEDIUM 2 · HIGH 3
  tiers: T1 0.40 (advise) · T2 0.60 (block) · T3 0.80 + 5-consecutive (abort)
```

**SO THE ANSWER: it is NOT event-aware and NOT intelligent. It is a fixed counter.**
```
✗ NOT CALLER-AWARE. A 1-caller helper and a 500-caller core fn BOTH weigh HIGH=3.0.
  The graph is NEVER consulted for the weight. (onDriftComputed — the hook that was
  supposed to add blast-radius weighting — is an EMPTY STUB.)
✗ NOT SPEC-AWARE. No edit is weighed against a spec requirement.
✗ NOT SYMBOL-AWARE. Every touched export counts the same.
✗ NOT SESSION-AWARE. graph_gate_state = 0 rows; the drift is an in-memory Map that
  dies on restart and cannot see a second session.
✗ NOT EVENT-AWARE. It reacts to a COUNT, not to what the edit DOES.
```

**THE "INTELLIGENCE" HOOKS ARE EMPTY STUBS (verbatim from `graph-gate.ts`):**
```ts
export function onEditClassified(_c: EditClassification): void { /* PROPOSED v2 hook — empty in v1.3 */ }
export function onDriftComputed(_d: DriftResult): void { /* PROPOSED v2 hook — empty in v1.3 */ }
export function onGateDecision(_g: GateDecision): void { /* PROPOSED v2 hook — empty in v1.3 */ }
```
**The file's own header says "intelligent graph gate (LASME)". The body is a counter with three stubs where the intelligence was designed to live.**

## 3.3 · THE FOUR CODE-LEVEL DEFECTS (beyond the stub hooks)

```
D-1  THE REWARD IS THE CALL, NOT THE ANSWER.
     recordGraphQuery(q) records a query whenever it carries a TARGET STRING.
     It NEVER checks whether the query RETURNED ROWS or ERRORED.
     → `graph-query verb=who-calls target=classify` → rows=0 + a ripwire error
       STILL resets the drift. THE GATE REWARDS RITUAL. (This is T-16, coded.)

D-2  THE BLOCK MESSAGE MISREPORTS ITS OWN TRIGGER.
     The T2 condition uses n >= 3 (consecutiveUnverified), but blockReason prints
     d.unverifiedCount. The ONE live firing said "1 structural edits" while the
     condition that fired was n>=3. AN OPERATOR CANNOT DIAGNOSE THE BLOCK.

D-3  IT FAILS OPEN WHEN BLIND.
     !hasStore → cancel:false, "GI_NO_STORE: ALLOW+warn". A missing graph ALLOWS.

D-4  THE EXEMPTION IS TOO BROAD.
     symbol-less edits (comments) carry ZERO drift — a real container-angle fix —
     but the rule means ANY edit whose exports don't parse is free.
```

## 3.4 · THE VERDICT (measured, not asserted)

```
IS IT INTELLIGENT?  NO. A fixed counter, caller-blind, spec-blind, in-memory,
                    with three empty hooks where the intelligence was designed.
IS IT MISFIRING?    NO. The ONE live firing (bucket A LINE 30210) was CORRECT in kind:
                    a structural write, no query, isError:true.
IS IT UNDER-FIRING? ★★★ YES. 1 firing against 1,375 edit/write calls and 0 graph calls.
                    AND ITS OWN RECORD OF FIRING IS EMPTY (graph_gate_state = 0 rows).
THE REAL DEFECT:    AN ENFORCEMENT THAT IS PRESENT, WIRED, TESTED, AND NEARLY INERT.
```

---

# §4 · HOW THIS PASSED THE GOAL LOOP, CODE REVIEW, AND SHIPPED

## 4.1 · HOW IT PASSED THE GOAL LOOP

**THE GOAL LOOP AS BUILT:**
```
goal({op:"complete"})  →  the goal tool marks complete.
THE LOOP CHECKS NOTHING ABOUT:
  ✗ the graph's reachability (is the store describing THIS tree?)
  ✗ the layers' liveness (are the 6 layers up?)
  ✗ the deployed bundle's freshness (is the running code the current code?)
  ✗ the tests' reality (do they exercise the live path, or fixtures?)
  ✗ the audit (has an independent model reviewed the change?)
```

**EVERY FLAW THAT ALLOWED IT TO PASS (enumerated):**
| # | The flaw | The evidence |
|---|---|---|
| G-1 | No scope check in the loop | the store described `src/hunter`; the loop never compared it to the live tree |
| G-2 | No freshness check in the loop | the store was 21-35h stale; `storeFreshness` exists, never run |
| G-3 | No deploy check in the loop | the deployed bundle was 21-35h behind source; nothing compared mtimes |
| G-4 | No live-firing check in the loop | the gate fired once in 40k lines; nothing measured it |
| G-5 | The audit is a SKILL, not a GATE | `qwen-code-audit` is a documented mandate; nothing enforces it |
| G-6 | The loud-crash register is not wired | `hard-deps.ts` is imported by nothing |
| G-7 | The tests certify fixtures, not the live path | 31 test files; the 4 live-path assertions are the minority |
| G-8 | `goal(complete)` accepts a prose claim | the completion is a statement, not a re-run |

**THE MECHANICAL REASON: the goal loop's completion condition is a MODEL STATEMENT, not a MEASURED FACT.** Nothing in the loop re-runs the capability; the agent's own words close the goal.

## 4.2 · HOW THIS PASSED CODE REVIEW

```
THE REVIEW RAIL: qwen-code-audit (ocr) — "no system is ship ready until a run returns
                 0 critical and 0 high findings."
THE MEASURED STATE: the audit gate is BLOCKED. THEATRICALITY_LOG:421, verbatim:
  "★ THE HONEST RESIDUAL: the AUDIT GATE is BLOCKED, so NOTHING in this session has been
   machine-reviewed by an independent model. Every claim above rests on tests I wrote and
   ran myself."
THE MECHANISM: F-61 — the audit rail at 127.0.0.1:4098 was refused (BLOCKED). A BLOCKED
               audit is NEVER a pass — but nothing in the loop WITHHELD the ship claim.
★ SO: THE CODE REVIEW NEVER RAN, AND THE SHIP PROCEEDED ANYWAY. A BLOCKED gate that does
  not block is a theatrical gate.
```

## 4.3 · WHY THE CODE WAS BUILT THIS WAY (the derailment from the build package)

```
THE BUILD PACKAGE asked for: the six-layer graph stack, TSG as the load unit, the Jev
                             kernel, every component declaring its hard dependency and
                             failing LOUDLY, no fallbacks anywhere.
WHAT WAS BUILT:              the MACHINERY for all of it — and the WIRING for almost none.
THE DERAILMENT, one sentence (from FAILURE_LOG:485, verbatim):
  "I treated the 6 graph layers as a REGISTRATION PRECONDITION — a substrate to bring UP —
   instead of as THE INPUT TO EVERY DECISION."
THE CONSEQUENCE: seven audit passes, ~90 findings, the same structural classes recurring,
  because the only structural detector in the loop was a MODEL PAID PER FILE.
THE SHIP MECHANISM: the docs grew (29 docs commits vs 11 feat), the tests certified
  fixtures, the audit was BLOCKED, and the goal closed on a prose claim.
```

---

# §5 · THE MECHANICAL GATES TO BUILD

## 5.1 · THE PRINCIPLE

**MAKE IT MECHANICALLY IMPOSSIBLE for a trash-quality ship to be allowed. A gate is only a gate if it BLOCKS.**

## 5.2 · THE COMPLETION GATE (the goal loop's missing enforcement)

**THE HOOK SURFACE (from omp-docs, measured):**
```
pi.on("tool_call")    → CAN CANCEL: a throw aborts the call.
                        ★ THE GI GATE ALREADY USES THIS (gate-hook.ts:123).
pi.on("tool_result")  → post-call; appends an advisory (gate-hook.ts:95).
pi.on("turn_end")     → end-of-turn.
TTSR rules            → regex/AST mid-stream ABORT + rewind + inject.
the goal tool         → op: create|get|resume|complete|drop
```

**THE REQUIRED ENFORCEMENT (the missing piece):**
```
A tool_call handler that INTERCEPTS goal(op=complete), then, IN ORDER:
  1 RUN qwen-code-audit (or the pinned fallback chain).
  2 If the verdict is FAIL or BLOCKED  ⇒ THROW. The throw CANCELS the completion.
  3 Only AUDIT GATE: PASS (0 critical/high) allows the completion.
★ TODAY THE AUDIT IS A SKILL — a documented wish. NOTHING ENFORCES IT.
★ THE FIX IS A pi.on("tool_call") HANDLER + a TTSR rule as the second layer.
```

**THE TTSR LAYER (the belt to the hook's braces):**
```
A TTSR rule matching a completion CLAIM ("done", "complete", "all green", "ship ready")
whose condition is "no AUDIT GATE: PASS line appears in this turn's tool results"
⇒ abort the stream, inject: "RUN qwen-code-audit BEFORE claiming completion."
```

## 5.3 · THE GATE INVENTORY (the full set to build)

| # | Gate | What it blocks | Where it lands |
|---|---|---|---|
| GT-1 | THE AUDIT GATE | any completion claim without `AUDIT GATE: PASS` | `pi.on("tool_call")` on `goal(complete)` + TTSR |
| GT-2 | THE SCOPE GATE | a graph query whose target is outside the populated tree | `GI_STORE_SCOPE_MISMATCH` in graph-query |
| GT-3 | THE FRESHNESS GATE | a query against a store older than the newest source | `storeFreshness` in every layer probe |
| GT-4 | THE DEPLOY GATE | a ship claim when the deployed bundle ≠ source | an mtime compare in the completion path |
| GT-5 | THE LIVE-FIRING GATE | a claim that an enforcement works, with no live firing measured | require a mechanical firing count in the ship docs |
| GT-6 | THE NO-FALLBACK GATE | any `ALLOW` produced by a missing substrate | `cancel:true` on `GI_NO_STORE` |
| GT-7 | THE PREFLIGHT GATE | booting with a DOWN layer | `preflight()` at extension init |
| GT-8 | THE TEST-REALITY GATE | a battery whose tests never touch the live path | a count of live-path assertions per suite |

---

# §6 · THE TEST INVENTORY — RIP IT APART

## 6.1 · THE OPERATOR'S CHARGE

> *"full inventory of every single 'test' that failed to catch literally the entire codebase being compeletely fucked. rip it apart. all the theatrical logic and bullshit garbage testing that was done to compltely waste tokens."*

## 6.2 · THE INVENTORY (31 test files, 362 tests)

```
st-gi-w44-highs.test.ts         33   ← the biggest; security highs
st-gi-v21-redteam.test.ts       27   ← the red-team corpus
st-gi-v21-audit2.test.ts        21   ← audit findings
st-gi-v2-enforce.test.ts        16
st-gi-v21-oracle.test.ts        16
st-gi-v2-gate.test.ts           14
st-gi-graph-gate.test.ts        15   ← the GATE's own tests
st-gi-v21-hotseat.test.ts       12   ← "hot-seat" — but against FIXTURES
st-gi-v21-graph-facts.test.ts   12
st-gi-v21-ledger.test.ts         8
st-gi-v21-wiring.test.ts        10
... (31 files total, 362 tests)
```

## 6.3 · WHAT THE TESTS FAILED TO CATCH (each a named gap)

| # | The failure the battery missed | Why the test could not see it |
|---|---|---|
| X-1 | ★★★ **THE STORE DESCRIBED THE WRONG TREE** | Every test builds a store from a fixture in a tmpdir. **NO TEST ASSERTS THE STORE'S SCOPE AGAINST THE LIVE TREE.** The one test that touches a "live store" (`st-gi-v21-w6calibration`) reads a calibration ledger, not the code graph. |
| X-2 | ★★ **THE GATE FIRED ONCE IN 40,631 LINES** | The gate's tests (`st-gi-graph-gate`, 15 tests) drive `recordEdit`/`recordGraphQuery` **directly** with synthetic fixtures. They prove the MATH; they never prove the gate fires **through the registered handler on a live edit**. |
| X-3 | ★★ **`graph_gate_state` = 0 ROWS** | No test asserts the gate's own PERSISTENCE. `saveGateState`/`loadGateState` exist and are tested in isolation — but nothing asserts the live handler ever CALLS them. |
| X-4 | ★★ **THE RITUAL QUERY PURCHASED COVERAGE** | `test_gate_reset_via_graph_query` ASSERTED the defect as correct behavior: it called `recordGraphQuery` with a target and asserted the drift cleared. **THE TEST ENCODED THE BUG.** |
| X-5 | ★★ **`GI_NO_STORE` ALLOWED THE EDIT** | `st-gi-omp-gate.ts:37` — `test("no store → GI_NO_STORE ALLOW")` asserted `cancel:false`. **THE TEST CERTIFIED THE SILENT FALLBACK.** |
| X-6 | ★★ **THE DEPLOYED BUNDLE WAS STALE** | No test compares the deployed bundle's mtime to the source. The battery runs on SOURCE; the running code is the BUNDLE. |
| X-7 | ★★ **THE LOUD-CRASH REGISTER WAS NEVER CALLED** | `hard-deps.ts` has tests. **NO TEST ASSERTS THE EXTENSION IMPORTS IT.** A test of an unwired module passes forever. |
| X-8 | ★★ **THE PREFLIGHT WAS NEVER CALLED** | Same shape: `kernel-v2.ts` `preflight` is tested; nothing asserts `extension.ts` calls it. |
| X-9 | ★★ **5 OF 6 LAYERS WERE DOWN** | `st-gi-v2-deps.test.ts` (11 tests) tests the register's MECHANICS. **No test asserts a layer is POPULATED in the live store.** |
| X-10 | ★ **THE "HOT-SEAT" SUITE WAS A FIXTURE SUITE** | `st-gi-v21-hotseat.test.ts` (12 tests) — named for the hot seat, driven by synthetic records. The NAME claimed a runtime proof the body did not perform. |
| X-11 | ★ **THE WIRING TESTS ASSERT SOURCE STRINGS** | `st-gi-v21-wiring.test.ts:233` — `test_gate_wiring_is_present` counts `l.includes("FireGate")` in the SOURCE. **A grep over source is not a wiring proof.** |
| X-12 | ★ **`graph-code-audit` WAS A STUB, AND ITS ALIAS PASSED** | The tool was a stub (BUILD_REPORT admits it); the alias `graph-code-audit` → `aether-code-audit` was registered "with the SAME execute" — so the stub's test passed under a second name. |

**THE PATTERN UNDER ALL TWELVE: THE TESTS EXERCISE THE MACHINERY'S INTERNALS, NEVER ITS WIRING INTO THE LIVE SESSION.** 362 green tests, and not one asks: *is the store describing this tree? did the gate fire? was the register called?*

## 6.4 · THE THEATRICAL TEST CLASSES (the taxonomy)

```
CLASS A · THE FIXTURE SUBSTITUTE      a suite named for a live proof, driven by fixtures
                                       (the hot-seat suite, X-10)
CLASS B · THE TEST THAT ENCODES THE DEFECT  a test asserting the bug as the contract
                                       (X-4, X-5) — fixing the code FAILS the test
CLASS C · THE SOURCE-STRING ASSERTION a test grepping source for a symbol name
                                       (X-11) — proves a string exists, not that it runs
CLASS D · THE UNWIRED-MODULE TEST     a thorough test of a module nothing imports
                                       (X-7, X-8) — passes forever, proves nothing live
CLASS E · THE SHAPE-ONLY ASSERTION    a test asserting a function's shape, not its effect
                                       (T-13's inverted clock, T-14's tautological reload)
CLASS F · THE INFLATED COUNT          a test asserting N from N firings, with no resolution
                                       (T-15) — would report perfect precision on zero evidence
CLASS G · THE STUB'S ALIAS            a stub tested under a second name (X-12)
```

---

# §7 · THE PROPER TESTING FRAMEWORK + THE GIT/GITHUB ENFORCEMENT RAILS

## 7.1 · THE OPERATOR'S CHARGE

> *"how can we built a proer testing framework from the anti pattenrs of #5 that serve as a universal template for the runtime-grade testing suite AND what gate workflows can we build to enforce this mechanically using Git and GitHub and git events as the enforcement rails? Automatically reject commits and PRs that are out of alignement and use the git worktree to track progression + alignment to the spec and build package. We can pin semantica to the worktree and have it assist with the intellignece of this + have a dedicated TSG kernel for decision making. Map this out for me what would this look like."*

## 7.2 · THE UNIVERSAL TEST TEMPLATE (derived from the 12 anti-patterns)

**THE RULE: a test earns its place only if it can FAIL for a reason that matters. Every anti-pattern in §6 is a test that CANNOT fail meaningfully.**

**THE SEVEN LAWS OF A REAL TEST:**
```
T1 LIVE-SUBJECT LAW    the subject is the LIVE artifact (the deployed bundle, the real
                       store, the registered handler) — never a fixture standing in for it.
T2 WIRING LAW          the test asserts the CALL PATH, not the module's internals:
                       "the extension imports the register" / "the handler calls
                       saveGateState" — not "saveGateState works".
T3 SCOPE LAW           a test of a graph answer asserts the ANSWER IS ABOUT THE RIGHT
                       SUBJECT (the store describes this tree) — not merely that rows exist.
T4 NO-ENCODE-DEFECT LAW a test never asserts the buggy behavior as the contract. When a
                       fix fails an existing test, THE TEST IS A SUSPECT, not the fix.
T5 EFFECT-NOT-SHAPE LAW a test asserts an OBSERVABLE EFFECT (a row written, a fire logged,
                       a file changed) — never a shape or a count of calls.
T6 FRESHNESS LAW       a test of a substrate asserts its FRESHNESS (populated_at ≥ the
                       newest source mtime).
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

## 7.3 · THE GIT RAILS (the enforcement using git events)

**THE PRINCIPLE: the git history and the worktree ARE the alignment record. A commit or PR that is out of alignment with the spec/build package is REJECTED mechanically.**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ THE GIT ENFORCEMENT LAYERS                                               │
├──────────────────────────────────────────────────────────────────────────┤
│ L-GIT-1  PRE-COMMIT  · a hook that runs the LIVE battery (not the fixture │
│                       battery) + the deploy-freshness check. A commit that │
│                       changes src/ without rebuilding dist/ is REJECTED.   │
│ L-GIT-2  PRE-PUSH    · a hook that runs the SCOPE check (the store vs the  │
│                       live tree) + the WIRING check (every module the      │
│                       extension loads is imported).                        │
│ L-GIT-3  PR-GATE     · a required status check: AUDIT GATE: PASS. A PR      │
│                       without it CANNOT merge. (This is the qwen-code-     │
│                       audit as a GitHub required check, not a skill.)      │
│ L-GIT-4  ALIGNMENT   · a CI job that diffs the branch against the build-   │
│                       package spec and FAILS on drift (a file the spec did │
│                       not name, a layer the spec requires that is absent). │
│ L-GIT-5  WORKTREE    · the worktree is the progression tracker: each wave  │
│                       is a branch; the spec's wave list is the branch plan; │
│                       a branch that does not map to a spec wave is REJECTED│
└──────────────────────────────────────────────────────────────────────────┘
```

**THE WORKTREE-AS-PROGRESSION-TRACKER (the operator's own suggestion, formalized):**
```
THE WORKTREE'S BRANCH = THE WAVE.  The build package names the waves (W1..Wn).
EACH WAVE IS A BRANCH whose name encodes the spec wave:  wave/W3-ledger.
THE SPEC'S WAVE TABLE = THE MERGE ORDER. A branch that does not map to a spec wave
  cannot merge — the alignment check rejects it.
THE WORKTREE'S DIFF = THE PROGRESS RECORD. `git diff spec-base..wave/W3` is the
  wave's actual delta; the spec names what it SHOULD be; the divergence is measured.
★ THE WORKTREE BECOMES THE MECHANICAL TRACKER: alignment is a diff, not a report.
```

## 7.4 · SEMANTICA PINNED TO THE WORKTREE (the decision layer)

**THE OPERATOR'S DESIGN: pin semantica (L1) to the worktree so it assists with the intelligence.**

```
SEMANTICA = L1, the DECISION LAYER: "what we already decided, why, and what it caused"
             record → link(causal) → precedent → govern → audit.

PINNED TO THE WORKTREE, IT ANSWERS:
  · HAS THIS DECISION BEEN MADE BEFORE? (precedent — the build package's rulings)
  · WHAT DID THIS CHANGE CAUSE? (causal — the derailment chain)
  · IS THIS COMMIT CONSISTENT WITH THE GOVERNING DECISIONS? (govern)
  · AUDIT: every ruling, every violation, every reversal — on the record.

THE RAIL IT POWERS: the ALIGNMENT GATE (L-GIT-4). Semantica holds the build package's
  decisions; a commit whose change contradicts a governing decision is FLAGGED with the
  decision it violates. THE DECISION IS THE EVIDENCE, not a reviewer's opinion.
```

## 7.5 · THE DEDICATED TSG KERNEL (the decision-making layer)

**THE OPERATOR'S DESIGN: a dedicated TSG kernel for decision making.**

```
TSG = the load/index unit (Rust, per-passage Noul, coverage-first).
      "STAGE 4 · KERNEL  TSG: meaning match?"

THE DEDICATED KERNEL ANSWERS, PER COMMIT/PR:
  · DOES THIS CHANGE MEAN WHAT THE SPEC SAYS IT SHOULD MEAN?
  · IS THE CLAIM ("this wave is complete") SUPPORTED BY THE CHANGE'S CONTENT?
  · DOES THE DIFF MATCH THE SPEC'S WAVE INTENT — or merely touch the named files?

THE RAIL IT POWERS: THE MEANING GATE. A commit whose content does not match its spec
  wave's MEANING is rejected, even if it touches the right files. (This is the layer
  that catches "the file exists but the behavior does not".)
```

## 7.6 · THE FULL PICTURE — THE MECHANICAL SHIP PIPELINE

```
┌──────────────────────────────────────────────────────────────────────────┐
│ THE SHIP PIPELINE — round 1 ships as a DRAFT, not as complete            │
├──────────────────────────────────────────────────────────────────────────┤
│ ROUND 1  BUILD      the wave branch (wave/Wn-<spec-wave>)                 │
│          ↓                                                                │
│ GATE 1   PRE-COMMIT the LIVE battery + the deploy-freshness check         │
│          ↓          (src changed but dist stale ⇒ REJECT)                 │
│ GATE 2   PRE-PUSH   the scope check + the wiring check                    │
│          ↓          (a loaded module not imported ⇒ REJECT)               │
│ GATE 3   PR         the AUDIT GATE (qwen-code-audit as a required check)  │
│          ↓          (no AUDIT GATE: PASS ⇒ CANNOT MERGE)                  │
│ GATE 4   ALIGNMENT  semantica vs the build package (a contradicting       │
│          ↓          decision ⇒ FLAGGED with the decision)                 │
│ GATE 5   MEANING    TSG: does the diff MEAN the spec wave?                │
│          ↓                                                                │
│ ROUND 2  REVIEW     the code review DENIES with the findings; the agent   │
│          ↓          cleans EVERY flaw; LOOPS back to ROUND 1              │
│ ...      LOOP       until the audit is PASS and the alignment is CLEAN    │
│          ↓                                                                │
│ SHIP     only when: audit PASS + alignment CLEAN + meaning MATCH +        │
│          live tests (script + container + hot-seat) GREEN + the deploy    │
│          bundle CURRENT.                                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

**THE THREE TEST SURFACES THE SHIP REQUIRES (the operator's own words):**
```
SCRIPT     the battery (but LIVE, not fixtures — per the T1 law)
CONTAINER  the isolated runtime (the deep-container-testing rig)
HOT-SEAT   the agent lives in the deployed instance (the runtime-grade loop —
           the META-OBSERVATION, never a synthetic harness)
★ ALL THREE must be green. A ship claim on ONE surface is not a ship claim.
```

---

# §8 · THE RESIDUAL (named, per the honesty law)

```
WHAT THIS DOCUMENT IS:      the full specification of every task the operator gave,
                            as documentation. NO CODE was written.
WHAT IS NOT DONE:           the gates are SPECIFIED, not built. The deploy is STALE.
                            The fixes I coded EARLIER (before the no-code order) are
                            in source and UNLOADED.
THE HONEST LIMIT:           this documentation describes what MUST be built; the build
                            itself is the next operator-authorized step.
★ THE OPERATOR'S ORDER, honored: NO CODE.
```

**The goal remains active.** `goal({op:"complete"})` stays a false claim.
