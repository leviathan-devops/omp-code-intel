# THE 6L+2E TESTING SUITE — SCRIPT · CONTAINER · BLACK-HAT
## The exact tests that prove the 8 components work in CONTAINER and LIVE ON HOST

**Date:** 2026-09-22 · **Baseline:** `jarvis/gi-main` @ `fdf90b1` · **Method:** script-test (L2) + deep-container-testing (L3/L4) + red-team-pressure-test (black-hat).
**LAW: a PASS is only a PASS when the passToken appears in a TOOL RESULT. Agent prose = CIRCULAR = FAIL.**

---

# PART 0 · THE TEST ARCHITECTURE

```
L0  tsc --noEmit                 the syntax floor — worth nothing alone
L1  unit (bun test)              PURE functions only — anything touching the world is BANNED here
L2  SCRIPT TEST (real modules,   ★ THE DEFAULT for any runtime claim — the deployed artifact,
    real sandbox, observed effects)   real bytes, observed outcomes
L3  CONTAINER (omp-ct:master)    ★ the isolated runtime — plan-first, screenshot evidence, Phase E
L4  HOST-LIVE (this session)     ★ the meta-observation — the enforcement fires on MY OWN calls
★ A CLAIM AT L0/L1 ONLY IS NOT A RUNTIME CLAIM. The build is not verified until L3 AND L4 pass.
```

---

# PART 1 · THE SCRIPT-TEST SUITE (L2 — the in-process runtime verification)

**Per the script-test skill: the 7-part pattern (SANDBOX → IMPORT → DECLARE → EXERCISE → OBSERVE → ADVERSARIAL → CLEANUP). Every assertion targets a SPEC-NAMED token or an OBSERVABLE artifact. NO spy assertions.**

## 1.1 · THE HARNESS (written verbatim — `tests/harness-6l2e.ts`)

```ts
import { Effect, Exit } from "effect";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// SANDBOX — a real dir, scope-owned cleanup (never a mock of the fs)
export const withSandbox = <A>(use: (dir: string) => Effect.Effect<never, Error, A>) =>
  Effect.gen(function* () {
    const dir = mkdtempSync(join(tmpdir(), "gi6l2e-"));
    yield* Effect.addFinalizer(() => Effect.sync(() => rmSync(dir, { recursive: true, force: true })));
    return yield* use(dir);
  }).pipe(Effect.scoped);

export class LayerFailure { readonly _tag = "LayerFailure"; constructor(readonly reason: string) {} }

// IMPORT THE DEPLOYED ARTIFACT (never a reimplementation)
export const loadRegistry = () =>
  Effect.tryPromise({
    try: () => import("../src/omp/layer-registry.ts").then((m) => m.buildLayerRegistry()),
    catch: (e) => new LayerFailure(String(e)),
  });

// THE CONSUMPTION PROBE (the anti-register gate — the core assertion)
export const runConsumptionProbe = (registry: unknown) =>
  Effect.tryPromise({
    try: () => import("../src/omp/layer-consumption.ts").then((m) => m.probeConsumption(registry)),
    catch: (e) => new LayerFailure(String(e)),
  });

// THE PASS/FAIL PRINTER + the exit-code verdict (the harness's own verdict)
export function report(rows: { name: string; verdict: string; got: string }[]): never {
  for (const r of rows) console.log(`${r.verdict.padEnd(4)} ${r.name.padEnd(42)} ${r.got.slice(0, 90)}`);
  const failed = rows.filter((r) => r.verdict !== "PASS");
  console.log(`\n${rows.length - failed.length}/${rows.length} PASS`);
  process.exit(failed.length === 0 ? 0 : 1);
}
```

## 1.2 · ★ THE PER-LAYER ST CONTRACTS (the SPEC-NAMED tokens — NOT prose)

**Each layer gets TWO halves: POSITIVE (its fact reaches a verdict) + NEGATIVE (a legit query passes with zero misfire).**

| ST id | The layer-edge | The POSITIVE assertion | The NEGATIVE assertion |
|---|---|---|---|
| `test_consume_corbell` | L5 CORBELL → the settlement rung | a corbell fact (a method's callers) **flips a fire's verdict** — the row's `settledBy==="graph"` | a query about a symbol corbell covers → a real fact, no false refusal |
| `test_consume_graphify` | L6 GRAPHIFY → the settlement rung | a graphify edge fact flips a verdict (`settledBy==="graph"`) | a graphify-covered query answers |
| `test_consume_c2kg` | L4 C2KG → the context rung | a c2kg symbol fact flips a verdict, **OR** `GI_LAYER_UNCONSUMED` | — |
| `test_consume_ua` | L3 UA → the context rung | a UA graph fact flips a verdict, **OR** `GI_LAYER_UNCONSUMED` | — |
| `test_consume_arsumbris` | L2 ARSUMBRIS → the knowledge rung | a typed-KG fact flips a verdict, **OR** `GI_LAYER_UNCONSUMED` | — |
| `test_consume_semantica` | L1 SEMANTICA → the decision rung | a precedent flips a verdict, **OR** `GI_LAYER_UNCONSUMED` | — |
| `test_consume_tsg` | TSG → the meaning gate | a meaning verdict (`"meaning":"match"` / `"drift"`) | a change that means its spec → `match` |
| `test_consume_abide` | ABIDE → the repair path | a repair (`"repaired":true`) — **NEVER a block** | a healthy change → no repair, no block |
| `test_register_reports_consumers` | the register | a 0-consumer layer reads **`GI_LAYER_UNCONSUMED`** | an 8-consumer layer reads `"consumed":8` |
| `test_scope_mismatch` | the scope gate | an out-of-tree target → **`GI_STORE_SCOPE_MISMATCH`** | an in-tree target → real rows |
| `test_stale_store_refuses` | the freshness gate | `populated_at < HEAD` → **`GI_LAYER_STALE`** | a fresh store → an answer |
| `test_derailment_corpus` | the 7-class replay | 7/7 settle with their **SPECIFIC** token, `firesUsed()` unchanged | — |

**★ THE SPECIFIC-ENFORCEMENT RULE:** a GENERIC refusal preempting a layer's OWN token = **UNOBSERVED, never PASS**.

## 1.3 · THE ST SCRIPT (the runner — `tests/st-gi-6l2e.ts`)

```ts
// ONE runPromise, at the bottom edge, ever (the EFFECT-02 law)
const rows = await Effect.runPromise(
  Effect.all([
    scenario("test_consume_corbell",              "a corbell caller fact flips a fire",  true),
    scenario("test_consume_graphify",             "a graphify edge fact flips a fire",   true),
    scenario("test_register_reports_consumers",   "0 consumers → GI_LAYER_UNCONSUMED",   true),
    scenario("test_scope_mismatch",               "out-of-tree → GI_STORE_SCOPE_MISMATCH", true),
    scenario("test_stale_store_refuses",          "stale → GI_LAYER_STALE",              true),
    // ── ADVERSARIAL (the negative halves) ──
    scenario("negative_in_tree_query",            "an in-tree query answers, no misfire", true),
    scenario("negative_fresh_store",              "a fresh store answers",                true),
    scenario("negative_all_consumed",             "8 consumers → consumed=8",             true),
    scenario("test_derailment_corpus",            "7/7 specific tokens",                  true),
  ], { concurrency: 1 })
);
report(rows);
```
**★ RUN: `bun run tests/st-gi-6l2e.ts` — the EXIT CODE is the verdict. `bun test -t test_consume_corbell` for the single selectors.**

## 1.4 · THE ANTI-CHEAT PROPERTIES

```
1 WRITTEN BEFORE THE CODE — the suite exists at pin time; the builder implements TO it.
2 SPEC-NAMED TOKENS — every assertion targets a frozen token (GI_LAYER_UNCONSUMED, GI_LAYER_STALE,
  GI_STORE_SCOPE_MISMATCH, settledBy=="graph") or an observable artifact (bytes, exit codes, rows).
3 OBSERVABLE-ONLY — the observation API (diskBytes/rows/exitShape/stateOf). No spy assertions exist.
4 THE MOCK-DETECTION — the integration script imports the DEPLOYED artifact; a fake provide() on a
  must-be-real capability is statically visible.
5 THE RUNNER'S EXIT CODE — the verdict is the process exit, never a printed claim.
```

---

# PART 2 · THE CONTAINER SUITE (L3 — the isolated runtime proof)

**THE 12-STEP EXECUTION LAW (per deep-container-testing), instantiated:**

```
1  THE PLAN FIRST — this document, 2000+ chars, 6 sections. THE PLAN IS THE CONTRACT.
2  THE PREFLIGHT — plan self-check → READY before setup.
3  THE SETUP — container-testing action=setup containerName=gi-6l2e image=omp-ct:master
   distPath=<the FILE path> → verify the returned distSha == the project dist SHA.
4  THE AUTH PROBE FIRST — a model-backed tool call must succeed (the #1 false-green).
5  THE MODEL VERIFICATION — the screenshot's status bar is the ONLY truth.
6  THE SCENARIO EXECUTION — send the exact prompt → SCREENSHOT → assert the passToken PRESENT +
   the failToken ABSENT in a TOOL-RESULT context.
7  THE ADVERSARIAL DISCIPLINE — the first error is never an excuse; a failure is a bug to log+fix.
8  THE FOUND BUGS — the minimal fix → the battery + the scenario re-run → zero regressions.
9  THE PHASE-E CIRCUIT BREAKER — all 10 before any declaration.
10 THE RESULTS ARTIFACT — .trident/ct-6l2e-results.json. NO ARTIFACT, NO CLAIM.
11 THE ZERO-BROKEN-WINDOWS — battery + tsc + build after every fix.
12 THE DECLARATION — the sha256sum proof + the evidence + the per-scenario verdict.
```

## 2.1 · ★ THE PER-LAYER CONTAINER SCENARIOS (tool-result-bound tokens)

| # | The angle | The prompt | passToken (TOOL RESULT) | failToken |
|---|---|---|---|---|
| C1 | AUTH (FIRST) | "run `graph-probe` and report the raw output" | `PROBE_TOOL_OK` | a 401 / `Insufficient credits` |
| C2 | L5 CORBELL | "query corbell for the callers of the settlement rung; report the raw rows" | `"layer":"L5_CORBELL"` | `"rows":0` |
| C3 | L6 GRAPHIFY | "query graphify for the micro edges of `oracle.ts`; report the raw rows" | `"layer":"L6_GRAPHIFY"` | `NO NODE` |
| C4 | L4 C2KG | "query the code-context layer for the symbol `judge`; report" | `"layer":"L4_C2KG"` OR `GI_LAYER_UNCONSUMED` | `"rows":0` (an ambiguous empty) |
| C5 | L3 UA | "query the context layer for the system meaning; report" | `"layer":"L3_UA"` OR `GI_LAYER_UNCONSUMED` | `"rows":0` |
| C6 | L2 ARSUMBRIS | "query the knowledge layer for the typed entity; report" | `"layer":"L2_ARSUMBRIS"` OR `GI_LAYER_UNCONSUMED` | `"rows":0` |
| C7 | L1 SEMANTICA | "query the decision layer for the precedent; report" | `"layer":"L1_SEMANTICA"` OR `GI_LAYER_UNCONSUMED` | `"rows":0` |
| C8 | TSG | "have TSG judge whether this change means its spec; report the raw verdict" | `"meaning":"match"` or `"meaning":"drift"` | `GI_ENFORCE_TSG` absent-and-silent |
| C9 | ABIDE | "have Abide repair this broken change; report the raw result" | `"repaired":true` | `"blocked":true` |
| C10 | ★ THE CONSUMPTION (the anti-register) | "read the kernel register and report the CONSUMED count" | `"consumed":8` | `"consumed":0` |
| C11 | STATE | "query a store populated before HEAD; report" | `GI_LAYER_STALE` | `"rows":0` |
| C12 | BOUNDARY | "query a symbol not in the populated tree; report" | `GI_STORE_SCOPE_MISMATCH` | `"rows":0` |
| C13 | ★ INTEGRATION | "run a fire the graph settles; report the ledger row" | `"settledBy":"graph"` | `"firesUsed":1` |
| C14 | ★ NEGATIVE (zero misfire) | "query all 8 layers with a legit in-tree target; report" | `"consumed":8` + 8 real answers | any false `GI_LAYER_UNCONSUMED` |

**★ THE ACTIVATION PRECONDITION:** the layers must be REACHABLE (the substrate present) or the test is structurally incapable of proving the enforcement. The plan names the activation step.

---

# PART 3 · ★ THE BLACK-HAT ADVERSARIAL CORPUS (zero-trust — the attack shapes)

**Per red-team-pressure-test: the corpus comes from the CONTRACT, never from memory. Every attack fires its SPECIFIC token.**

## 3.1 · THE POSITIVE SUITE (every enforcement MUST FIRE)

| # | The attack | The layer under test | The EXPECTED token |
|---|---|---|---|
| P1 | a store populated from the WRONG tree (src/hunter) → query a src/omp symbol | the scope gate | `GI_STORE_SCOPE_MISMATCH` |
| P2 | a store whose `populated_at` < HEAD → any query | the freshness gate | `GI_LAYER_STALE` |
| P3 | a layer declared but 0 consumers → read the register | the consumption gate | `GI_LAYER_UNCONSUMED` |
| P4 | a rule settling IGNORE on a COUNT (the M-GRAPH-4 class) | the settlement rung | `M-GRAPH-4` ESCALATE, never IGNORE |
| P5 | the extractor emitting `Container → itsOwnMember` (1,320 fake edges) | the extractor | the self-edge REFUSED |
| P6 | a store with NO `gi_meta` provenance rows | the populate | `GI_POPULATE_FAILED` |
| P7 | a callee fixed, the caller passing the old value | the wiring gate | the call-site REJECT |
| P8 | a module tested but imported by nothing | the wiring gate | `GI_UNWIRED_MODULE` |
| P9 | `goal(op=complete)` with no `AUDIT GATE: PASS` | the audit gate | `block:true` |
| P10 | `GI_NO_STORE` (a missing substrate) | the no-fallback gate | `cancel:true`, never ALLOW |
| P11 | a source-string `.includes("Sym")` in a wiring test | the test-reality gate | the REJECT |
| P12 | a passToken in the agent's prose only | the circular-token gate | CIRCULAR = FAIL |

## 3.2 · THE NEGATIVE SUITE (every legit case MUST NOT FIRE — the zero-misfire mandate)

```
N1  an in-tree query → a real fact, NO gate fires
N2  a fresh store → answers, NO GI_LAYER_STALE
N3  all 8 layers consumed → `"consumed":8`, NO GI_LAYER_UNCONSUMED
N4  a legit edit with a graph query first → NO drift block
N5  a rule settling on a POSITIVE fact → settles at $0, NO false escalate
N6  a real `goal(complete)` WITH `AUDIT GATE: PASS` → completes, NO block
N7  a module imported by the live entry → NO GI_UNWIRED_MODULE
N8  a store whose provenance committed with it → NO GI_POPULATE_FAILED
★ A SUITE THAT FIRES EVERY ATTACK BUT NEVER PROVES THE LEGIT PATH IS HALF A SUITE.
```

## 3.3 · THE SUCCESS + FAILURE CONDITIONS (the zero-trust verdict)

```
SUCCESS (the build is real) — ALL of:
  · the container: 14/14 scenarios PASS, each passToken in a TOOL-RESULT context
  · the host-live: the enforcement fires on MY OWN calls, MECHANICAL not prose
  · the consume: `"consumed":8` from the register (NOT `up=11/11`)
  · the corpus: 12/12 attacks fire their SPECIFIC token; 8/8 legit paths zero-misfire
  · the derailment replay: 7/7 settle with their specific token, `firesUsed()` unchanged
  · Phase E: 10/10 · the artifacts on disk · ZERO open CRITICAL/HIGH

FAILURE (the build is theatrical) — ANY of:
  · any layer with consumers.length===0 reported as "up"
  · any `rows:0` where `GI_STORE_SCOPE_MISMATCH` belongs
  · any passToken in the agent's prose (CIRCULAR)
  · any "PASS" from a generic gate preempting a specific enforcement (UNOBSERVED)
  · the register reading `up=11/11` while `consumed` < 8
  · any test that does not import the DEPLOYED artifact
  · zero bugs found (the red flag — the session did not push)
  · a green battery presented as capability
```

---

# PART 4 · THE HOST-LIVE LOOP (L4 — the meta-observation)

**Per runtime-grade: the operator's seat, not the author's. I operate the LIVE kernel.**

```
H1 START IT      the real extension loaded in the session; name the bundle + its mtime
H2 OPERATE       first person, numbered: OP-n | I DID | I EXPECTED (pre-registered) | IT DID
H3 THE BUGS      every break is the deliverable: op#, expected, actual VERBATIM, mechanism, fix
H4 PUSH IT       8 layers queried at once · kill mid-query · starve it (no substrate) ·
                 hostile input (a symbol that does not exist) · the wrong-tree store
H5 FIX IN PLACE  the retest = the NEXT numbered op on the SAME battered instance
H6 THE LEDGER    what RUNNING taught that READING could not
H7 CLOSE         only when nothing unexperienced remains AND the residual is NAMED
★ ZERO BUGS IS A RED FLAG. A silent wrong-answer / no-op / hang is CRITICAL.
★ THE SECOND OPERATOR: a zero-context subagent, given ONLY the docs, must operate the kernel.
```

# PART 5 · THE RESULTS ARTIFACT SCHEMA

```json
// .trident/ct-6l2e-results.json
{ "distSha": "<sha256>", "overallVerdict": "PASS|FAIL|BLOCKED",
  "scenarios": [ { "id":"C1", "angle":"AUTH", "feature":"auth-probe",
    "passToken":"PROBE_TOOL_OK", "failToken":"401",
    "passTokenMatch":true, "failTokenAbsent":true, "toolResultContext":true,
    "maxWaitMs":90000, "timedOut":false, "verdict":"PASS", "evidence":"<path+offset>" } ],
  "blackHat": { "positive": 12, "negative": 8, "specificTokenMatches": 12, "unobserved": 0 },
  "phaseE": { "shaMatch":true, "authProbe":true, "allScenarios":true, "allTokens":true,
              "noCircular":true, "noTimeouts":true, "blastRadiusCovered":true,
              "adversarialBehaved":true, "containerAlive":true, "artifactWritten":true } }
```
**★ NO ARTIFACT, NO CLAIM. A half-suite artifact is a half-suite.**
