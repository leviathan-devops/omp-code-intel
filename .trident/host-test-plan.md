# HOST TEST PLAN — Graph Intel v2.2 (the deep-host-testing law)

**The rig:** the LIVE host — the deployed extension at
`~/.omp/agent/extensions/graph-intelligence/index.js` (sha `b2ab09acc77684e4`), loaded by the OMP
runtime, driven through the real tool-registration path.
**THE META-OBSERVATION LAW:** the testing agent is ALSO the subject — the tools act on the tester's
own session; every claim is backed by a tool result in THIS session's trace.

## PHASE 0 — THE DEPLOY GROUND TRUTH

| the check | the command | the expected | the status |
|---|---|---|---|
| the bundle SHA | `sha256sum ~/.omp/agent/extensions/graph-intelligence/index.js` | `b2ab09acc77684e4…` | ✅ VERIFIED |
| the V2.2 symbols | `grep -c <sym> <the bundle>` | discoverSourceRoots ≥1 · assertStoreScope ≥1 · adjudicateClaim ≥1 · jevk5Probe ≥1 · judgeDiff ≥1 | ✅ VERIFIED (3/2/2/2/2) |
| the config wiring | `grep graph-intelligence ~/.omp/agent/config.yml` | the index.js path listed | ✅ VERIFIED (line 13) |
| the auth probe | a live model-backed turn | the model answers | PENDING (the first live tool call) |
| the process census | `pgrep -f 'omp'` | the operator's live sessions noted, NEVER killed | NOTE |

## PHASE 1 — THE CAPABILITY CHAIN (the core loop)

| # | the scenario | the exact call | the passToken | the failToken |
|---|---|---|---|---|
| 1.1 | the self-populate on a REAL project | `bun scripts/gi-populate.ts --target <a real repo>` | `built N/6` + the per-layer table | `GRAPH_EMPTY` |
| 1.2 | the register on that project | `bun scripts/consumption-audit.ts <target> <symbol>` | `consumed:N/8` | `GI_POPULATE_FAILED` on a sourced target |
| 1.3 | the tool surface (the LIVE extension) | `graph-probe {action:"status"}` | `PROBE_TOOL_OK` | a bare TypeError |
| 1.4 | the query surface | `graph-query {verb:"who-calls", target:"<a real symbol>"}` | `rows=N` + the caller list | `substrate=undefined` with no reason |

## PHASE 2 — THE ADVERSARIAL (the named refusals)

| # | the attack | the call | the passToken | the failToken |
|---|---|---|---|---|
| 2.1 | a source-less target | `gi-populate --target <an empty dir>` | `GI_NO_SOURCE_ROOT` | `GRAPH_EMPTY` |
| 2.2 | a cross-scope read | a store for A read as B | `GI_STORE_SCOPE_MISMATCH` | a confident row set |
| 2.3 | a fabricated claim | `adjudicateClaim({text:"523 tests pass", turnToolResults:[]})` | `FABRICATED` + `REJECT` | the claim accepted |
| 2.4 | a down judge | `judgeDiff(<diff>, {url:"http://127.0.0.1:1/…"})` | `ok:true` (fail-OPEN) | a throw |
| 2.5 | an unknown verb | `graph-query {verb:"bogus"}` | `QUERY_INVALID: bogus` | a crash |

## PHASE 3 — THE OBSERVATION (the live session)

| # | the observation | the channel | the evidence |
|---|---|---|---|
| 3.1 | the tools register | the session's tool surface | the tool names in the schema |
| 3.2 | a tool result carries its reason | the tool-result context | the verbatim `GI_LAYER_DOWN:<layer>` |
| 3.3 | the register reading | `gi-consumption` | `consumed:N/8` + the per-layer rows |

## PHASE 4 — THE NEGATIVES (the anti-misfire half — MANDATORY)

| # | the legit op | the expected | the failToken |
|---|---|---|---|
| 4.1 | a normal read on a populated store | rows returned, no refusal | a spurious `GI_STORE_SCOPE_MISMATCH` |
| 4.2 | a claim WITH its tool results | `SUPPORTED` | a spurious `FABRICATED` |
| 4.3 | a legit `graph-probe` | `PROBE_TOOL_OK` | a block |
| 4.4 | a normal diff to the judge | `NOTICE` or silent | a spurious `REPAIR` |

**A GENERIC gate preempting a specific token = UNOBSERVED, never PASS.**

## PHASE 5 — THE STRUCTURAL GUARANTEES

| # | the guarantee | the probe | the expected |
|---|---|---|---|
| 5.1 | the session scoping | two sessions, separate stores | no cross-session read |
| 5.2 | the store persistence | a re-open of the same store | the same rows |
| 5.3 | the freshness gate | an aged store | `CORBELL_NOT_WARM:stale` (the TTL) |
| 5.4 | the battery regression | `bun run test` | 453/0 + 551/0 |

## PHASE 6 — THE CANON

| # | the artifact | the path |
|---|---|---|
| 6.1 | the results artifact | `.trident/host-test-results.json` (the per-scenario verdicts) |
| 6.2 | the DEBUG_LOG entries | the per-phase findings + the FP ledger |
| 6.3 | the BUILD_REPORT addendum | the working systems observed, W-numbered |
| 6.4 | the checkpoint | `Checkpoints/gi-kernel-v2.2-self-populate-d1d8-green/` |

## THE HOST-SPECIFIC ANTI-PATTERNS (the deep-host-testing ledger, adapted)

| # | the anti-pattern | the remedy |
|---|---|---|
| H-1 | the row-as-proof circularity | the proof ladder: the tool result > the behavior delta > the seam measurement > the row |
| H-3 | the un-attributed row | the session id + the timestamp on every claim |
| H-5 | the bait-sentence test | the REAL scenario (a real repo, a real symbol) |
| H-6 | the single-intent probe | the minimal pairs (the attack + the legit twin) |
| H-13 | the operator-session kill | NEVER kill a host process you did not spawn |
| H-14 | the model-conditioning blindness | a safety refusal BEFORE the tool call = layer-1 working; document it, never mark the token PASS |

## THE PASS CRITERIA (all must hold)

every PHASE 1-4 scenario executed · every passToken matched IN A TOOL RESULT · every failToken
absent · the PHASE 4 negatives green (zero misfire) · the results artifact written · the honest
verdict (witnessed / pinned-with-constraints / frontier) — never "100%" without the sweep.

## THE HONEST GAPS (pre-registered)

- the container cannot self-populate (a bare env) → PHASE 1.1/1.2 run on the HOST, not the container
- the audit gate is BLOCKED (the lane rate-limited) → the ship-ready claim is withheld
- the store TTL (1 h) → a long test window needs a re-populate mid-run
