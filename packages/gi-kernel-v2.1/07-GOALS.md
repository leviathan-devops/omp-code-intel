# 07 — GOAL PROMPTS + HYDRA ORGANIZATION

## THE HYDRA ORG CHART

```
┌────────────────────────────────────────────────────────────────────┐
│ THE ORCHESTRATOR — never writes product while a leaf can write     │
│   runs the gates · audits every return · records the board         │
├────────────────────────────────────────────────────────────────────┤
│ DESKS                                                              │
│   D1  THE LEDGER DESK      src/omp/fire-ledger.ts                  │
│   D2  THE ORACLE DESK      src/omp/oracle.ts                       │
│   D3  THE GATE DESK        src/omp/kernel-v2.ts (MODIFIED)         │
│   D4  THE POLICY DESK      src/omp/policy-store.ts                 │
│   D5  THE MEASUREMENT DESK MEASUREMENT_PLAN.md + the instruments   │
├────────────────────────────────────────────────────────────────────┤
│ LAW  min 5 live desks per turn · cap 4 product-file writers        │
│      strictly disjoint write-sets · claim-is-a-claim               │
└────────────────────────────────────────────────────────────────────┘
```

## PER-DESK CONTRACTS (the stop conditions)

### D1 · THE LEDGER DESK
```
MISSION     persist every fire so it can be calibrated and audited
READ FIRST  src/omp/fire-gate.ts (DecisionRow) · the blueprint §8.2
KNOWN STATE the gate exists and is unwired; no ledger table exists
TASKS       the fire_decisions table · the append · the indices
CONSTRAINTS laterTruth defaults 'unresolved' · the append is never an update
VERIFICATION T9 green + a live row query
RETURN      the schema + a live row, pasted
STOP        every fire leaves a row and the row is queryable
```

### D2 · THE ORACLE DESK
```
MISSION     fill laterTruth from the downstream evidence — never guess
READ FIRST  RSI_ARCHITECTURE_v1.md §4 (the oracle's design) · the blueprint §9.3
KNOWN STATE the oracle has never scored a real firing
TASKS       resolve() · the evidence gatherers · confirmed/refuted/unresolved
CONSTRAINTS REFUTED requires a SECOND signal, never the absence of complaint;
            UNRESOLVED is EXCLUDED, never counted as confirmed
VERIFICATION one real firing resolved with the evidence recorded
RETURN      the resolution + its evidence, pasted
STOP        a row's laterTruth changed with the evidence attached
```

### D3 · THE GATE DESK
```
MISSION     wire the gate in BOTH positions without breaking v2.0
READ FIRST  src/omp/kernel-v2.ts:264 (runKernelV2) · the blueprint §10 W3/W4
KNOWN STATE grep -c "FireGate" kernel-v2.ts = 0 (unwired)
TASKS       position A (pre-act, fail-open) · position B (post-detector)
CONSTRAINTS the v2.0 tier ladder survives · the single call site stays 1 ·
            ENGINES BEFORE REGISTRATION
VERIFICATION the battery 199/0 + tsc baseline + a real FIRE and a real IGNORE
RETURN      the two adjudications, pasted
STOP        grep -c "FireGate" > 0 AND both positions exercised
```

### D4 · THE POLICY DESK
```
MISSION     the policies as versioned DATA (D026)
READ FIRST  src/omp/fire-gate.ts:110 (Policy) · the bible D026
KNOWN STATE the seeds are hardcoded in SEED_POLICY
TASKS       the JSON schema · the loader · the reload-without-rebuild path
CONSTRAINTS a policy edit changes the cache key · the basis travels with the policy
VERIFICATION an edited JSON changes the band on a STORED probability (reroute)
RETURN      the before/after bands, pasted
STOP        a policy edit lands without a rebuild
```

### D5 · THE MEASUREMENT DESK
```
MISSION     fill M1-M12 with numbers; zero TBD
READ FIRST  the blueprint §11 · the skill derive-runtime-measurements
KNOWN STATE only the 14-case baseline (M1 partial, health.ok=false)
TASKS       the instruments per row · M11's human sampling session
CONSTRAINTS no guesses · every number cites its instrument · the delta is the finding
VERIFICATION MEASUREMENT_PLAN.md with zero TBD
RETURN      the filled plan
STOP        every row carries a number and its instrument
```

## THE FORBIDDEN LIST (every desk)

```
· registering the gate before the engines · a chosen constant unlabelled ·
  a global threshold across asymmetric costs · a silent pass on a missing answer ·
  a source-file mutation as a mutation test · a host battery as a code property
```
