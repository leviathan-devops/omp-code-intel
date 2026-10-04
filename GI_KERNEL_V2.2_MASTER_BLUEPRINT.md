# GI KERNEL V2.2 — THE MASTER BLUEPRINT (the derailment guard)

**Series:** GI-Kernel-V2.2 · **Date:** 2026-09-25 · **Baseline:** HEAD 75d2586 · dist 3595ff900bf6581b
**Companion spec:** `GI_KERNEL_V2.2_REBUILD_SPEC.md` (651 lines, the W1-W6 work)
**THE PURPOSE OF THIS DOCUMENT:** make derailment IMPOSSIBLE by naming every derailment that has
actually occurred on this project, its trigger, its detection, and its mechanical remedy — so a fresh
agent (or this one after a compaction) cannot repeat it.

---

## §1 THE MACRO BLUEPRINT (the whole system in one page)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  THE GI KERNEL — THE 6L+2E STACK, AFTER V2.2                                     │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌──────────────────────────── THE TARGET ────────────────────────────────┐   │
│  │  any codebase: src/ · packages/*/src · a workspace · a Rust crates/    │   │
│  └────────────────────────────────┬───────────────────────────────────────┘   │
│                                   │                                            │
│                    ┌──────────────▼───────────────┐                           │
│                    │  W2 SOURCE-ROOT DISCOVERY    │  no hit → GI_NO_SOURCE_ROOT│
│                    │  profile → workspace →       │  (NEVER an empty graph)    │
│                    │  tsconfig → convention → walk│                           │
│                    └──────────────┬───────────────┘                           │
│                                   │                                            │
│                    ┌──────────────▼───────────────┐                           │
│                    │  W4 SELF-POPULATE            │  writes INTO the target's  │
│                    │  gi-populate --target X      │  OWN .omp/graph-intelligence│
│                    └──────────────┬───────────────┘                           │
│                                   │                                            │
│      ┌────────┬────────┬──────────┼──────────┬────────┬────────┐              │
│      ▼        ▼        ▼          ▼          ▼        ▼        ▼              │
│   L1 SEMAN  L2 ARSUM  L3 UA   L4 C2KG   L5 CORB  L6 GRAPH  ┌──────┐           │
│   decision  knowledge context context   settle   settle    │ TSG  │           │
│                                                            │meaning│          │
│  ┌─────────────────────────────────────────────────────────┤      │          │
│  │  W3 CONTENT SCOPING: every store asserts build_root      │ ABIDE│          │
│  │  a read whose subject ≠ build_root →                     │repair│          │
│  │  GI_STORE_SCOPE_MISMATCH (a NAMED refusal)                └──┬───┘          │
│  └─────────────────────────────────────────────────────────────┼─────────────┘
│                                                                 │              │
│                    ┌────────────────────────────────────────────▼───────────┐ │
│                    │  W5a JEVK5 ON GPU  (:8090 / :8008)                     │ │
│                    │  W5b ABIDE JUDGES LIVE (the diff, not the ledger)      │ │
│                    │  W5c L2 CLAIM FIREWALL — FAIL-CLOSED (the missing half)│ │
│                    └────────────────────────────────────────────┬───────────┘ │
│                                                                 │              │
│                    ┌────────────────────────────────────────────▼───────────┐ │
│                    │  W6 THE 3-TIER TESTING: SCRIPT · CONTAINER · HOST       │ │
│                    └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
```

**THE ONE LAW ACROSS THE STACK:** *the graph is a function of the target, and every artifact it
produces asserts which target it describes.*

**THE POLARITY LAW (from the binding blueprint, verbatim):**
> *"Abide fail-open on missing key. Claim firewall fail-closed on goal.complete. Do not unify those
> polarities."*

---

## §2 THE LIFECYCLE (the turn of the kernel)

```
  1  SESSION START
       · the scope resolver pins the project root (the boilerplate's 4 tiers)
       · the stores are opened; each asserts gi_meta.build_root == realpath(scopeRoot)

  2  A QUERY (graph-query / graph-probe / bug-hunt)
       · the store is read ONLY if its build_root matches → else GI_STORE_SCOPE_MISMATCH
       · the 6 layers + TSG are asked for anchored facts
       · the register prints consumed:N/8 with every non-consumer NAMED

  3  AN EDIT (a write/edit tool call)
       · W5b: the CURRENT hunk diff → the compiled warhead rules → JevK5 on the GPU
       · band act (>=0.8) → a repair reason appended to the tool result (ABIDE, fail-OPEN)
       · band flag → a notice; band clear → silent

  4  A COMPLETION CLAIM (the model says "done" / "N tests pass" / goal.complete)
       · W5c: extract the claim atoms; bind each to a THIS-TURN tool-result span
       · no span → FABRICATED (no Jev needed — the span IS the proof)
       · span present → JevK5 Choice: supports | contradicts
       · FAIL-CLOSED: a claim without a bound span REJECTS the turn

  5  SESSION END
       · the ledger rows are written; the register's reading is the session's verdict
```

---

## §3 THE ENFORCEMENT LAWS (each with its forbidden behaviour + mechanical consequence)

| # | THE LAW | THE FORBIDDEN BEHAVIOUR | THE MECHANICAL CONSEQUENCE |
|---|---|---|---|
| L1 | the store asserts its build root | serving a store built from another tree | `GI_STORE_SCOPE_MISMATCH` — the read refuses |
| L2 | no source root = a named refusal | producing an empty graph from a wrong path | `GI_NO_SOURCE_ROOT: no source root discovered under <target>` |
| L3 | the graph is a function of the target | committing a pre-built store as capability | `rm -rf` + repopulate must reproduce the reading (D3) |
| L4 | the model cannot close its own turn | a completion claim with no bound span | `FABRICATED` — the turn is REJECTED (fail-CLOSED) |
| L5 | ABIDE repairs, it does not block | using ABIDE as a blocker | a block attempt is a POLARITY VIOLATION (the blueprint forbids it) |
| L6 | the meaning gate uses the GPU model | KEV-CPU as the default | the TSG evidence must name jevk5 + the port |
| L7 | a guard must be proven to fire | shipping a guard with no positive test | the guard's test must show the guard FIRING, or the guard is deleted |
| L8 | capability claims require the container tier | citing a script battery as capability proof | the TESTING_LOG must carry the container tier for the claim |

---

## §4 THE FALSIFICATION INSTRUMENTS (a machine per claim)

| the claim | the instrument | the falsifier |
|---|---|---|
| "the store describes the target" | `SELECT file FROM typed_nodes LIMIT 1` | a path outside the target's realpath |
| "the kernel is self-populating" | `rm -rf .omp/graph-intelligence && gi-populate --target .` | the register cannot re-read |
| "the graph works on a real project" | the container rig + a real project + the real registration path | `consumed:0/8` |
| "the meaning gate uses JevK5" | `grep -rn "8090\|8008\|jevk5" src/` | 0 hits |
| "L2 blocks" | a fabricated claim | it passes |
| "the guard fires" | the guard's positive test | the test never observes a firing |
| "the audit gate is green" | the whole-tree audit + the register on a real project | the register is unchanged across N days |

**THE INSTRUMENT LAW:** a claim without a falsifier is not a claim — it is a hope. Every row above is
a COMMAND, not a review.

---

## §5 THE DERAILMENT LEDGER (every derailment that has ACTUALLY occurred here)

### D-1 · THE AUDIT TREADMILL (the 2-day derailment — F-128)

```
  THE TRIGGER:  an LLM code-review tool that generates findings indefinitely.
  THE PATTERN:  "the audit gate is 0 crit/0 high" treated as THE GOAL.
                Each run samples a fresh comment set → the count never reaches zero →
                the loop never terminates → the SYSTEM is never driven.
  THE COST:     2 days. 46 "fixes". Zero change to the graph's runtime behaviour.
  THE DETECTION: the register on a real project reads the SAME before and after
                 (0/8 both times). If N days of work leave the runtime unchanged,
                 the work was hygiene, not progress.
  THE MECHANICAL REMEDY:
    · the audit gate is DEMOTED to a hygiene check (run it, fix criticals, move on)
    · the GOAL is the definition of done in the spec's §2 (D1-D8), all runtime-measured
    · a rule: BEFORE starting any audit triage, run the register on a real project.
      If it reads < 8/8, the audit is NOT the priority — the capability is.
```

### D-2 · THE GHOST-STORE THEATRE (F-124, T-2026-09-25-A)

```
  THE TRIGGER:  a scoping experiment run with --target /tmp/corbell-scoped.
  THE PATTERN:  the store was written into the GI repo's scope and COMMITTED.
                The register then read 7/8 — real data about a DEAD tree.
  THE COST:     every "consumed:7/8" reading for weeks was a reading about nothing.
  THE DETECTION: SELECT COUNT(*) FROM typed_nodes WHERE file LIKE 'src/%' → 0
                 (a one-line query that was never run)
  THE MECHANICAL REMEDY:
    · every store carries build_root (W3); a read whose subject ≠ build_root REFUSES
    · a checkpoint that carries a store MUST carry its build_root in the manifest
    · THE STANDING QUERY: after ANY populate, run the src-prefix count. 0 = the store
      describes the wrong tree.
```

### D-3 · THE SCRIPT-BATTERY FALSE GREEN (E8, T-2026-09-25-B)

```
  THE TRIGGER:  a test suite that runs the code against the repo's OWN stores.
  THE PATTERN:  44 passing tests read as "the system works".
  THE COST:     the 0/8 on a real project was invisible for weeks.
  THE DETECTION: run the SAME tools in a container against a REAL project.
                 The battery said pass; the container said 0/8.
  THE MECHANICAL REMEDY:
    · the 3-tier testing law (W6): a capability claim REQUIRES the container tier
    · a script battery is a REGRESSION GUARD, never a capability proof
```

### D-4 · THE UNWIRED INSTALLED MODEL (F-127, EN-9)

```
  THE TRIGGER:  a model installed and serving on the GPU.
  THE PATTERN:  "JevK5 is installed" read as "the layers use JevK5".
  THE COST:     the meaning gate ran a 0.6B CPU model while a 4B GPU model idled.
  THE DETECTION: grep -rn "8090\|8008\|jevk5" src/  →  0
  THE MECHANICAL REMEDY:
    · "installed and serving" ≠ "wired". The test for wired is the grep, and it must
      be RUN, not assumed.
```

### D-5 · THE MISSING BLOCKING HALF (F-125, V-2026-09-25-1)

```
  THE TRIGGER:  a 4-layer architecture spec; 2 layers built.
  THE PATTERN:  "ABIDE = repair" read as "the architecture is inverted".
  THE COST:     the model can still close its own turn; the whole class the operator
                named has no enforcement.
  THE DETECTION: grep -rln "claim.firewall" src/ → EMPTY (the layer is absent)
  THE MECHANICAL REMEDY:
    · a 4-layer spec is built as 4 layers or the missing ones are NAMED as OPEN
    · every layer in a spec's stack gets a "BUILT? Y/N" cell in the canon, and an
      N is a work item, never a silent omission
```

### D-6 · THE HARDCODED LAYOUT ASSUMPTION (E4, EN-8)

```
  THE TRIGGER:  a build that assumed <target>/src.
  THE PATTERN:  GRAPH_EMPTY on a real project (its sources are in packages/*/src).
  THE COST:     the kernel could only ever build its own repo.
  THE DETECTION: run the build on a workspace-shaped project.
  THE MECHANICAL REMEDY:
    · source-root discovery from the target's OWN config (W2)
    · a no-hit is GI_NO_SOURCE_ROOT, never GRAPH_EMPTY
```

### D-7 · THE LOST PLOT (the meta-derailment under D-1)

```
  THE TRIGGER:  a stop-condition that is a COUNT ("0 crit / 0 high").
  THE PATTERN:  the count becomes the goal; the system becomes the side-effect.
  THE COST:     two days, and the operator's threat to hand the project to another agent.
  THE DETECTION: ask "what OBSERVABLE BEHAVIOUR changed?" If the answer is a commit count,
                 the plot is lost.
  THE MECHANICAL REMEDY:
    · THE MACRO ANCHOR: every session starts by stating (a) the ONE capability being
      built, (b) its definition of done (a COMMAND), (c) what the runtime does TODAY.
    · A session that cannot name all three is derailed before it starts.
    · THE WEEKLY TEST: run the register on a fresh project. It is the ONLY measure
      that cannot be gamed by commits.
```

---

## §6 THE OPERATOR'S RULINGS (verbatim, binding)

| # | the ruling | the date |
|---|---|---|
| R1 | *"shift all cpu kev infra to the gpu jev it is the exact same architecture and this is just better"* | 2026-09-25 |
| R2 | *"going forward all of it refers to gpu jevk5"* | 2026-09-25 |
| R3 | *"What is this? So you have hard coded synthetic data in the back end and this doesn't actually build the graph correctly from the real target. If so that is extremely theatrical, completely forbidden, and needs to immediately be completely rebuilt correctly. No hard coded synthetic data, not allowed, forbidden, delete this"* | 2026-09-25 |
| R4 | *"correctly engineer this so that it builds the graph from the target and it maintains the correct scoped graph for the target and does not fucking create any bullshit mess."* | 2026-09-25 |
| R5 | *"use a sandboxed tmux pane as a container so it can run on host and build the graphs properly"* | 2026-09-25 |
| R6 | *"You're supposed to have loaded this into a container on a headed off session and run this on a real project and look at how is the fucking graph functioning on a real session on a real code base. On real data."* | 2026-09-25 |
| R7 | *"you're not allowed to blame the code review tool. The code review tool is doing exactly what it's supposed to. You are the one that is supposed to be smart enough to fucking build things correctly"* | 2026-09-25 |
| R8 | *"It needs to start working."* | 2026-09-25 |

**THE RULING LAW:** these are binding. A design that contradicts one of them is rejected before it is
built.

---

## §7 THE STANDING RULES (the derailment-prevention checklist)

```
  BEFORE ANY WORK SESSION:
    [ ] state the ONE capability being built (in the operator's words)
    [ ] state its definition of done (a COMMAND, not a description)
    [ ] run the register on a REAL project and record what it reads TODAY
        (the baseline that no commit can game)

  BEFORE ANY CODE EDIT:
    [ ] which wave (W1-W6) does this serve? If none → STOP, it is a derailment.
    [ ] does it touch a store? → does it write build_root?
    [ ] does it add a guard? → where is the test that shows the guard FIRING?

  BEFORE ANY COMPLETION CLAIM:
    [ ] which tier of evidence (SCRIPT / CONTAINER / HOST)?
    [ ] a capability claim requires CONTAINER; a ship claim requires HOST
    [ ] every number carries its command

  BEFORE ANY AUDIT TRIAGE:
    [ ] run the register on a real project. If < 8/8, the CAPABILITY is the priority.
    [ ] the audit is hygiene, never the goal.

  BEFORE ANY CHECKPOINT:
    [ ] does it carry src/ · dist+SHA · the 11 canon · the ship docs?
    [ ] does every store it carries have a build_root in the manifest?
    [ ] ONE lock mode (never manifest-only)

  ON ANY STALL:
    [ ] trident-problem-solving, HARD-BOUNDED at 3 failed fix-verify cycles
    [ ] never blame the model / the environment / the platform (the model-blame ban)
    [ ] the mechanism is always in the design, the code, the gate, or the harness
```

---

## §8 THE ANTI-PATTERNS (the kill list — each with its detector)

| the anti-pattern | the detector |
|---|---|
| the audit treadmill | the register on a real project is unchanged across N days |
| the ghost store | `WHERE file LIKE 'src/%'` → 0 after a populate |
| the script-battery false green | the container tier disagrees with the battery |
| the unwired installed model | `grep -rn "<port>" src/` → 0 |
| the missing blocking half | a fabricated claim passes |
| the hardcoded layout | `GRAPH_EMPTY` on a workspace-shaped project |
| the pre-built-store demo | `rm -rf` the stores; the reading cannot be reproduced |
| the manifest-only lock | `lsattr` shows the src/dist writable |
| the count-as-goal | the answer to "what behaviour changed?" is a commit count |
| the 92%-framing | a byte delta presented without the source measurement |

---

## §9 THE RESIDUAL (what this blueprint does NOT settle)

1. **The JevK5 request contract** — unprobed. W5a step 1 produces it; until then the adapter's request
   shape is a plan, not a fact.
2. **`corbell` in a container** — the rig must bake it in OR the populate runs on the host and the
   store is copied in. This blueprint records the gap and does not choose.
3. **The ABIDE live-judge latency on JevK5** — the blueprint measures the REMOTE Jev (~300ms/13
   rules); the GPU local model is unmeasured.
4. **The L2 firewall's false-positive rate** — a fail-CLOSED gate that rejects legitimate claims is
   worse than none; unmeasured.
5. **The c2kg symbol-depth rebuild** — the tool produced 182 module names; the symbol-depth run is
   unexercised.
6. **The R5 tmux-pane order** — this host's CT gate blocks raw `tmux`; the sanctioned path is the
   `hub` supervised process (proven this session: it ran the build on the host and produced the real
   `GRAPH_EMPTY` answer). Whether a tmux pane is separately obtainable is open.

---

## §10 THE HANDOFF

**The next artifact:** the wave plan (`.trident/wave-plan.md`) derived from the spec's §3 W1-W6.
**The owner skill:** `build-package` → `trident-deep-planning` (DPL1) → the worker/wave topology.
**The first wave:** W1 (purge, a delete) + W5a (the JevK5 probe) in parallel — both are prerequisites
and neither blocks the other.
**THE FIRST MEASUREMENT:** `gi-populate --target research/graph-infra-repos/Understand-Anything` must
produce >0 nodes. That single command is the whole rebuild's first proof.
