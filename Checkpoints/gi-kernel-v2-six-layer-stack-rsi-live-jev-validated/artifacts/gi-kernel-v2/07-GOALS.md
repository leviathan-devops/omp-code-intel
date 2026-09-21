# 07 — GOAL PROMPTS + HYDRA ORGANIZATION

## THE HYDRA ORG CHART

```
┌────────────────────────────────────────────────────────────────────┐
│ THE ORCHESTRATOR (this session)                                    │
│   never writes product while a leaf can write                      │
│   runs the gates, audits every return, records the board           │
├────────────────────────────────────────────────────────────────────┤
│ DESKS                                                              │
│   D1  THE STORE DESK          src/omp/typed-write.ts               │
│   D2  THE GATE DESK           src/omp/kernel-v2.ts                 │
│   D3  THE RSI DESK            src/omp/rsi.ts                       │
│   D4  THE REGISTER DESK       src/omp/hard-deps.ts                 │
│   D5  THE KERNEL DESK         src/omp/enforcement.ts               │
│   D6  THE BOILERPLATE DESK    packages/paragon-runtime-encryption  │
│       (dispatched: ParagonBoilerplate, muse 1.3, running)          │
├────────────────────────────────────────────────────────────────────┤
│ LAW  min 5 live desks per turn · cap 4 product-file writers        │
│      strictly disjoint write-sets · claim-is-a-claim               │
└────────────────────────────────────────────────────────────────────┘
```

## THE DISPATCH LAW (pinned, verbatim)

```
MISSION / READ FIRST / KNOWN STATE / TASKS WHAT-HOW-WHY / CONSTRAINTS /
VERIFICATION / RETURN
```

## PER-DESK GOAL PROMPTS (the stop-condition contract)

### D1 · THE STORE DESK
```
MISSION     give the store the six-layer namespacing without breaking the v1.3 shape
READ FIRST  src/omp/typed-write.ts · src/hunter/graph/graphify-adapter.ts
KNOWN STATE the live store has 1266 nodes / 2714 edges, ONE confidence value
TASKS       T-1 layer_id + migration · T-8 deriveConfidence · SC-7 freshness
CONSTRAINTS no constant confidence · the partial index survives · idempotent migration
VERIFICATION bun test tests/st-gi-store.test.ts green; the live store migrates clean
RETURN      the migration output + the freshness verdict, both pasted
STOP        the 11 tests green AND the live store carries layer_id on every row
```

### D2 · THE GATE DESK
```
MISSION     build STAGE 0..6 and the three detectors on ONE interface
READ FIRST  src/omp/graph-gate.ts (the v1.3 tier ladder + the PROPOSED hooks)
KNOWN STATE gateDecision has 2 callers; one is live (gate-hook.ts:117)
TASKS       T-3 the stage machine · T-4 the three detectors · SC-2 the refusal
CONSTRAINTS the class is DERIVED from the firing detector · UNCERTIFIABLE is NOT a pass
VERIFICATION bun test tests/st-gi-v2-gate.test.ts green; SC-2's token verbatim
RETURN      the stage trace + the refusal code, pasted
STOP        a down layer REFUSES with GI_STACK_INCOMPLETE:<layer> and STAGE 3 never runs
```

### D3 · THE RSI DESK
```
MISSION     the reflex loop that adapts, proven by attack
READ FIRST  packages/gi-kernel-v2/RSI_ARCHITECTURE_v1.md §1 (the LIVE proof)
KNOWN STATE the live guardhole seam was attacked and fixed; the store exists at
            ~/.omp/graph-intelligence/rsi/ (mode 0700, key 0600)
TASKS       T-7 signed rows · VERIFIED RETIREMENT · recomputed precision
CONSTRAINTS precision recomputed NEVER incremented · HOLD never promotes on one firing
VERIFICATION the MUTATION test: verify() neutered → RED; restored → GREEN
RETURN      both attack verdicts + the mutation run, pasted
STOP        an unsigned supersede leaves the victim LIVE, and the mutation bites
```

### D4 · THE REGISTER DESK
```
MISSION     no fallbacks anywhere — every component declares and refuses loudly
READ FIRST  src/omp/populate.ts (the F-48 law) · the RSI architecture §C
KNOWN STATE 11 components; the live audit shows 6 DOWN
TASKS       T-6 the register · requireUp · the live audit
CONSTRAINTS a probe that throws is DOWN · an EMPTY file is DOWN · secrets = labels only
VERIFICATION the live audit output, pasted, with every code named
RETURN      the audit table + the firstCode
STOP        a missing dependency throws a NAMED HardDependencyError; no code path substitutes
```

### D5 · THE KERNEL DESK
```
MISSION     TSG + Abide as one 2-layer machine with the declared polarities
READ FIRST  packages/gi-kernel-v2/ENFORCEMENT_ENGINE_MASTER_BLUEPRINT_v1.md §2,§5
KNOWN STATE Jev is ABSENT on this host; the engines are not installed
TASKS       T-5 E1 fail-OPEN work layer · E2 fail-CLOSED close layer · TSG as load unit
CONSTRAINTS the model is NEVER called when zero spans bind · coverage is first-class
VERIFICATION bun test tests/st-gi-v2-enforce.test.ts green, incl. the call-spy test
RETURN      both polarities on the SAME outage, pasted
STOP        zero spans ⇒ REJECT with the judge never invoked; an outage ⇒ SKIP vs FAIL_CLOSED
```

### D6 · THE BOILERPLATE DESK (dispatched)
```
MISSION     extract the guarded-seam security pattern as a reusable, PROVEN boilerplate
MODEL       muse 1.3 (opencode-go) — dedicated, running
DELIVERABLE packages/paragon-runtime-encryption/ (src/ + tests/ + README + demo.ts)
STOP        the battery green from INSIDE the package + the two attacks + the mutation
```

## ESCALATION PATHS

```
a desk blocked on a missing engine  → report the dependency; do NOT route around it
a desk's test fails                 → fix the CODE or the TEST, never delete the test
a desk's claim contradicts the disk → the disk wins; the claim is a defect
the operator's ruling is needed     → the open-decisions table (E1, the polarity, the cache)
```
