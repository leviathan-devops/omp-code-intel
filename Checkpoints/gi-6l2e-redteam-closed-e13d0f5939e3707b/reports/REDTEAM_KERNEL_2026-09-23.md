# ★ THE KERNEL RED-TEAM REPORT — 2026-09-23

**The suite:** `tests/st-redteam-kernel.test.ts` — the command
`bun test ./tests/st-redteam-kernel.test.ts` returned `14 pass · 0 fail · 52 expect() calls`.
**The subject:** the DECISION SURFACE — `src/omp/decision.ts` · `src/omp/adapters/kev.ts` ·
`scripts/kev-decide.ts`. ★ These files are imported from `../src` — THE SOURCE. The artifact's
own coverage is a DIFFERENT suite (`tests/st-artifact-coverage.test.ts`, which MOUNTS the
deployed bundle).
**The discipline:** ADVERSARIAL-FIRST. Every failure gets the TWO-SIDED ADJUDICATION.

## 1 · THE PROBE REGISTER (each probe · its observed · its verdict)

| id | the attack | the OBSERVED (the assertion's value) | the verdict |
|---|---|---|---|
| ST-RT-1 | a pointer head that found nothing → softmax = uniform | `isUniform([0.25,0.25,0.25,0.25])` → `true`; `isUniform([0.3409,0.0052,0.6539])` → `false`; `[]` → `true`; `[1]` → `true`; `[0.2501,0.2499,0.25,0.25]` → `true`; `[0.26,0.24,0.25,0.25]` → `false` | the guard catches the class |
| ST-RT-2 | a fact whose consumer is a KERNEL (TSG/ABIDE), cast as a LayerId | 4 facts (2 layers + TSG + ABIDE) → `certs.length === 2`; every `layer` in the closed set; `[]` → `[]`; an UNKNOWN consumer → `[]` | the filter holds |
| ST-RT-3 | a FORGED delimiter in the KEV state | `{"ok":true,…}` with a distribution whose `length === 3` and `isUniform(dist) === false` | the sanitizer holds |
| ST-RT-4 | THREE processes deciding on ONE ledger | every `exitCode` in `[0,1]` (no deadlock); the ledger is readable; `size > 0` | SQLite serialized the race |
| **ST-RT-5** | an EMPTY options list (`--state X` alone) | ★ **`{"ok":true,…}`** — the model decided over ZERO options | ★ **FAILED → F-108 FIXED** |
| ST-RT-6 | a MALFORMED `policy.json` | `policySource` contains `POLICY_INVALID`; NOT `no policy.json on disk`; `policyCount > 0` | the loud fallback holds |
| ST-RT-7 | a 10,000-char subject | the verdict is one of ALLOW/STEER/REFUSE/ABORT; `ev.subject.length === 10000` | no truncation, no throw |
| ST-RT-8 | a READ-ONLY ledger dir | `outcome !== "unnamed-throw"` — a named failure or success | the contract holds |
| ST-RT-9 | the probe's `up()` reporting stale state | present scope → `up:true` + non-empty evidence; a GHOST scope → `up:false` + `evidence` matches `ENOENT\|absent` | the probe reports the truth |
| ST-RT-10 | an EMPTY scope | `REFUSE` with a code matching `^GI_STACK_INCOMPLETE`; the PREFLIGHT detail matches the DOWN-count pattern; `ev.influenced.length < 8` | a named refusal |
| **W5-1** | the CLI's error path truncating its JSON | ★ **EMPTY stdout** + stderr `error: Top-level return cannot be used inside an ECMAScript module` | ★ **FAILED → F-112 FIXED** |
| W5-3 | empty/null inputs to `decideFromRegistry` | throws matching `GI_DECIDE_BAD_INPUT: scopeRoot` · `: subject` · `: act` | the guard added |
| W5-4 | a corrupt ledger path (a DIRECTORY where the db belongs) | `GI_LEDGER_OPEN_FAILED\|GI_LEDGER_DIR_FAILED` or success | the contract holds |
| W5-5 | invalid JSON from the KEV CLI | the source carries `GI_ENFORCE_KEV: the KEV CLI printed invalid JSON` | the guarded parse |

## 2 · ★ THE FIND THE SUITE CAUGHT TWICE (F-108 → F-112)

```
PROBE 1 (ST-RT-5): bun scripts/kev-decide.ts --state "some state"
  OBSERVED  {"ok":true,…}            ← the model decided over ZERO options
  ROOT CAUSE (anchored): the guard was `state.length === 0 || questions.length === 0` — but the
    default construction ALWAYS yields ONE question (`[{instr:"", options:[]}]`), so
    `questions.length` is 1 and the guard PASSED. The guard checked a PROXY quantity.
  FIX: `const noOptions = questions.some((q) => q.options.length === 0)` added to the condition.
  THE EXIT TEST: `--state` alone → exit 1 · `--state X --question Y` → exit 1 · the valid call → exit 0

PROBE 2 (W5-1): the same CLI's error path
  OBSERVED  ★ EMPTY stdout; stderr: `error: Top-level return cannot be used inside an
            ECMAScript module`
  ROOT CAUSE: the W5 audit's HIGH #1 was REAL (`process.exit(1)` after `console.log()` can
    TRUNCATE the write) — and MY FIRST REMEDY WAS INVALID: `return` at the top level of an ESM
    module is a SYNTAX ERROR. The remedy broke the CLI.
  FIX: `process.stdout.write(...)` + `process.exitCode = 1` + `throw new Error("KEV_USAGE")`
    (an ESM-valid terminal unwind; the catch guards against a double print).
  THE EXIT TEST: stdout = the COMPLETE JSON (parsed OK) · exit 1
```

## 3 · ★ THE PROBE ERRORS, ADJUDICATED (recorded, never as defects)

| the probe | its claim | ★ THE ADJUDICATION |
|---|---|---|
| ST-RT-8 (1st form) | `expect(named \|\| true).toBe(true)` | ★ A TAUTOLOGY. REWRITTEN to `expect(outcome).not.toBe("unnamed-throw")`. |
| `test_declined_buildregistry_live_state` (1st form) | "one registry object re-reads" | ★ THE WRONG FRESHNESS LEVEL — `kevProbe` resolves at CONSTRUCTION; the probe now uses a FRESH `buildRegistry`. |
| `test_declined_ledger_handle_is_the_sink` (1st form) | `statSync(db).size` grows | ★ THE WRONG MEASUREMENT — SQLite writes to the WAL; the probe now counts ROWS. |
| `test_declined_table_carries_a_verdict_per_row` | 10 rows match | ★ THE SCOPE — the W2 table appends 5 rows with the same shape (15 total); scoped to the adjudication section. |
| the multi-file audit | the scan completes | ★ THE LANE'S TIMEOUT — `LLM completion error: context deadline exceeded` (the default 15 min); the single-file shape is the working one. |

## 4 · THE DEFECTS CERTIFIED
| # | the finding | the state |
|---|---|---|
| F-107 | the artifact-coverage gap (1 of 51 files mounted the deployed bundle) | FIXED — 2 of 54 now mount it |
| F-108 | the KEV CLI's usage guard ineffective (a proxy quantity) | FIXED — the guard requires ≥1 option |
| F-109 | the `confineTargetPath` TOCTOU (a stale `real`) | FIXED — the double-realpath re-validation |
| F-110 | the container's register ceiling is 6/8, not 8/8 | RECORDED — both DOWN named with retry conditions |
| F-111 | L2_ARSUMBRIS's substrate is an au WORKSPACE | RECORDED (BLOCKED) — the daemon replies `count:2` |
| F-112 | the W5 audit's 5 HIGH findings (4 real, 1 by design) | 4 FIXED · 1 DECLINED-with-reason |

## 5 · THE HONEST REMAINDER
1. `consumed:7/8` — `L2_ARSUMBRIS:GI_LAYER_UNCONSUMED` (F-111: the au workspace substrate).
2. W5's audit gate — the post-fix re-audit runs the 3 changed files; its artifact + the
   `AUDIT GATE:` line land in `TESTING_LOG.md`.
3. The 5 declined findings — RESOLVED (4 NOT-A-BUG proven + 1 FIXED), each with its test.
