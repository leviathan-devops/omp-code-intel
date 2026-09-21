
## [2026-09-20T12:00:00] — container angles caught 2 defects unit tests missed
- SYMPTOM: angle4 (2 blind edits) threw T2; angle5 (10 comment edits) reached T2
- ROOT CAUSE: (1) single-edit drift=1.0 ≥ 0.6 cut — sample-size artifact; (2) symbol-less edits weighted MEDIUM in full
- FIX: T2 requires ≥3 consecutive (gate-gate.ts:223); symbol-less comment edits carry ZERO drift (gate-gate.ts:164)
- LESSON: container angles on the wired path catch what unit tests on the math miss
- EVIDENCE: ALL-6-PASS post-fix; 230/0 ×3 stable; commit 60fe3e4

## [2026-09-21T12:00:00] — EN-048: node_modules absent → a false baseline divergence
- SYMPTOM: the battery read 166 pass / 1 fail / 1 ERROR and tsc read TS2688, against a pin frozen at 199/0/701 + 191. Two probes "diverged" on a repo where nothing had changed.
- ROOT CAUSE: node_modules/ was ABSENT — the entire dep tree. `Cannot find package 'xstate'` killed the hydra micro-loop-machine; `Cannot find type definition file for 'bun-types'` killed tsc. It is gitignored, so nothing in git records its loss.
- FIX: `bun install` → 8 packages in 25ms. Re-measured: 199/0/701 EXACT ✓ and tsc 191 EXACT ✓.
- LESSON: an ENVIRONMENT loss reads exactly like a CODE regression when the probe is run cold. The distinguishing move is to measure the ENVIRONMENT before concluding the code moved — and to report the divergence as root-caused rather than accepting either number. Root/pin says "inherited numbers are STALE"; `du`/`ls` on node_modules is part of re-measuring.
- EVIDENCE: battery 166/1/1err → 199/0/701; tsc TS2688 → 191; dist sha 83eb7bba UNCHANGED throughout

## [2026-09-21T12:02:00] — EN-049: `Judge` is declared but NOT re-exported (TS2459)
- SYMPTOM: tsc 192 (baseline 191, +1 NEW): `tests/st-gi-v21-ledger.test.ts(21,8): error TS2459: Module '"../src/omp/fire-gate.ts"' declares 'Judge' locally, but it is not exported.`
- ROOT CAUSE: `Judge` is DEFINED in enforcement.ts:34. fire-gate.ts IMPORTS it for its own `FireGateConfig.judge` field but does not re-export it — so a consumer importing it from fire-gate.ts is reaching through a module that merely uses it.
- FIX: import the type from its defining module (`../src/omp/enforcement.ts`). tsc → 191, EXACTLY the baseline.
- LESSON: a type a module DEPENDS on is not a type the module OFFERS. The 0-new-tsc law is what caught it — a study that only ran the new test would have shipped a tree that no longer type-checks.
- EVIDENCE: tsc 192 → 191; `grep -c 'fire-ledger|v21-ledger'` in the tsc output → 0

## [2026-09-21T12:03:00] — EN-050: "a firing is not a resolution" — MY TEST asserted an inflated count
- SYMPTOM: `test_ledger_feeds_calibration` failed: expected confirmed=12, received 0. The IMPLEMENTATION was right; the TEST was wrong.
- ROOT CAUSE: the test fired 12 times and immediately asserted `confirmed: 12` — never calling `recordTruth`. Every row was still `unresolved`, exactly as §6.4.7 requires ("written 'unresolved' AT FIRING TIME"). The ledger refused to count unresolved rows as evidence and reported the truth.
- FIX: assert the unresolved state FIRST, then stand in for the oracle explicitly, then assert the counts.
- LESSON: this failure is the HONESTY LAW WORKING — an unresolved row was never silently promoted to evidence. The lesson for the oracle (W2) and every future reader: CONFIRMED is a claim about the world made LATER; the ledger must never be able to infer it from the fact that a fire happened. A calibration that counted firings as confirmations would report perfect precision on zero evidence.
- EVIDENCE: the assertion now reads `{confirmed: 0, refuted: 0, unresolved: 12}` before the oracle step and `{confirmed: 12, unresolved: 0}` after; derivePolicy calibrated=false → true

## [2026-09-21T12:04:00] — EN-051: `bun test -t <selector>` unscoped scans the whole repo
- SYMPTOM: `bun test -t test_ledger_row_written` reported 1 pass / 8 skip / 68 FAIL / 68 errors across 77 tests in 197 files — the named test itself passed, but the run was unreadable.
- ROOT CAUSE: the `-t` filter does not scope the FILE SET; it scanned 197 files (including indexed copies under Checkpoints/) and the unrelated files errored on load.
- FIX: file-scope the selector — `bun test -t <name> ./tests/<file>.test.ts` → 1 pass / 6 filtered out / 0 fail.
- LESSON: the pin's G3 form (`bun test -t <selector>`) must be FILE-SCOPED or its output is noise that can hide a real failure among unrelated load errors. Recorded for every wave's named-test evidence.
- EVIDENCE: unscoped 1 pass/68 fail → scoped 1 pass/0 fail/6 filtered out

## [2026-09-21T12:30:00] — EN-052: resolveAll TRUSTED THE CALLER'S STALE ROW (a real history-rewriting defect)
- SYMPTOM: `test_oracle_unresolved_rows_are_skipped` failed — a second `resolveAll` pass over an ALREADY-CONFIRMED row reported `resolved: 1` instead of 0.
- ROOT CAUSE: `resolveAll` guarded on `row.laterTruth !== "unresolved"` where `row` is the CALLER'S OBJECT. The ledger updated the TABLE; the caller's snapshot still said "unresolved". So a caller holding rows from an earlier `ledger.all()` would re-resolve them — and if the evidence had changed, a CONFIRMED row could be rewritten to REFUTED. History silently rewritten by a stale in-memory copy. My own doc comment said this must not happen; the CODE did not enforce it.
- FIX: the ledger is the authority. Added `FireLedger.truthOf(stateHash)` and `resolveAll` now reads the LIVE truth from the table. A row absent from the ledger (`null`) is SKIPPED — resolving a phantom would write a truth for a fire never recorded.
- LESSON: a guard that reads a CALLER-PASSED COPY is not a guard — it is an honour system. When the store is the authority, EVERY check must go to the store. The adversarial test ("a resolved row is never re-judged") is what caught it; the happy path passed.
- EVIDENCE: 6 pass/3 fail → 12 pass/0 fail; the stamp `truth_at` is now provably unchanged on a second pass

## [2026-09-21T12:32:00] — EN-053: a fixture clock in the FUTURE inverted a time assertion
- SYMPTOM: `test_oracle_resolves` failed: `expect(truthAt).toBeGreaterThan(T0)` — received 1789977241936 (~07:54Z) vs T0 = 2026-09-21T10:00Z.
- ROOT CAUSE: T0 was set ~2h AHEAD of the machine's wall clock. `resolveAll`'s default `now()` is the REAL clock, so `truth_at` was legitimately EARLIER than the fixture's "fire time" and the assertion inverted. A fixture time running ahead of the host is a trap.
- FIX: T0 → 2026-09-20T08:00Z (PAST), evidence stamps shifted into the (T0, T0+24h] window. ALSO: added the `GI_ORACLE_TIME_TRAVEL` guard — a resolution stamp that does not follow its fire THROWS rather than writing a truth_at before the row it resolves.
- LESSON: a fixed clock fixture must be anchored to the PAST unless every consumer's clock is injected. The failure was in the FIXTURE, not the resolver — and it is the reason the time-travel guard now exists.
- EVIDENCE: assertion inverted → passes; the new guard is tested by `test_oracle_no_time_travel` (throws + writes NOTHING)

## [2026-09-21T12:33:00] — EN-054: dismissed evidence VANISHED from the basis
- SYMPTOM: `test_oracle_withdrawn_needs_a_span` failed — a withdrawal WITHOUT a span produced the basis "no downstream evidence at all", which is indistinguishable from "no evidence was presented".
- ROOT CAUSE: the "seen but rejected" records were appended to `ev.notes` (the audit trail) but the BASIS never surfaced them. A reader (or an auditor) could not tell an empty window from a window full of evidence that was thrown out.
- FIX: `classify` now appends `(presented but dismissed: ...)` to the unresolved basis whenever records were seen and did not count. The audit trail rides the decision it explains.
- LESSON: "no evidence" and "evidence that did not qualify" are DIFFERENT FACTS and must not render identically. This is the same class as the kernel's cap-reporting law (a cap that trims silently is a lie) and the unwired-row counter ("skipped, counted, never silent").
- EVIDENCE: 11 pass/1 fail → 12 pass/0 fail; the basis now reads `unresolved [] — no evidence that COUNTS (presented but dismissed: withdraw @... WITHOUT a span — ignored ...)`

## [2026-09-21T12:34:00] — EN-055: the graph gate blocked a NEW file write (GRAPH_GATE_ABORT) and how it clears
- SYMPTOM: writing `src/omp/oracle.ts` (a NEW file) was blocked twice — T2 `GRAPH_GATE_DRIFT_HIGH` then T3 `GRAPH_GATE_ABORT: drift 1.00 with 2 unverified structural edits — reasoning rewound`.
- ROOT CAUSE (read from src/omp/graph-gate.ts): `classifyEdit` extracts EXPORT symbols from the write's content (`extractExportSymbols`) and records them as `touchedSymbols`; an edit is "verified" only when SOME recorded graph query's target matches one of them (`normTarget` lowercases both sides). For a new file, the names do not exist in the index yet, so the natural instinct — query the FILE — fails: `ripwire --edit-check oracle.ts` → "symbol not found".
- FIX: the gate records queries from the HOOK'S PRE-EXECUTION path (`gate-hook.ts:137-140`), so even a FAILED ripwire query is recorded. Querying on a symbol the new file WILL export (`ripwire --callers resolveAll`) verifies the edit retroactively, because `computeDrift` re-evaluates the whole edit log against the current query list.
- LESSON: for a NEW file, query the symbol the file will EXPORT — not the filename, and not a symbol that already exists. The `RIPWIRE_FAIL symbol not found` result still counts, because the hook writes the query before the tool runs.
- EVIDENCE: blocked (T2, then T3) → the same write succeeded immediately after `--callers resolveAll` + `--callers classify`; the gate log confirms both queries recorded

## [2026-09-21T12:45:00] — EN-056: an advisory that returned NULL discarded the gate's own degradation record
- SYMPTOM: `test_advisory_fails_open` failed — I asserted `a.row === null` ("no judgment ⇒ no row to record"). The actual row was present with `policyName: "dumb-seed+fail-open"`.
- ROOT CAUSE: the gate does NOT throw when its judge is down — D010's fail-open path CATCHES the error internally and returns a row that RECORDS the degradation ("the act proceeds and the miss is recorded"). My implementation correctly passed that row back; my TEST assumed a null.
- FIX: the test now asserts the STRONGER truth — the row EXISTS, its `policyName` carries `+fail-open`, and the skipped code names JUDGE_UNAVAILABLE. The `row === null` case belongs to the one path where `gate.judge` genuinely THROWS (the D017 budget overrun), which is covered separately.
- LESSON: the gate had already been designed to never lose a degradation. The `advisory` wrapper must not become the place where a record goes missing — a null row there would have been a silent-failure surface sitting ON TOP of a correctly-recording kernel. Detect a degradation by the row's SUFFIX (`+no-answer`, `+fail-*`), never by the reason's prose: a string for humans may be reworded, a suffix is a contract.
- EVIDENCE: 8 pass/1 fail → 9 pass/0 fail; both fail-open paths now proven (throw → row null + GI_ADVISORY_OPEN; internal degrade → row present + JUDGE_UNAVAILABLE)

## [2026-09-21T13:05:00] — EN-057 ★ CRITICAL: a fail-OPEN gate degradation would have DISMISSED a real violation
- SYMPTOM: `test_gate_unavailable_never_dismisses` failed on `adjudication === null`, and reading the dump exposed a far worse latent defect than the assertion: the gate's degraded row for a fail-OPEN class reads `action: "IGNORE"`, and the gated runner would have APPLIED it.
- ROOT CAUSE: the post-detector filter applies the gate's action. When the judge is DOWN, `fire-gate.ts` does not throw — D010's fail-polarity path catches internally and returns a row: fail-CLOSED classes get `probability: 1, action: FIRE`; fail-OPEN classes get `probability: 0, action: IGNORE` (measured: `policyName: "theatrical-seed+fail-closed"`). For a fail-OPEN class, applying that IGNORE means **a down judge silently switches enforcement OFF** — the exact failure the surface's polarity exists to prevent. The `dumb` detector is fail-OPEN, so a Jev outage would have quietly disabled every blind-edit steer.
- FIX: `runKernelV2Gated` detects a degraded row by its POLICY-NAME SUFFIX (`+no-answer` / `+fail-*`) — never by an exception, which never comes — and returns the detector's verdict UNCHANGED with `gateSkipped` naming the degradation. The row still exists in the gate's ledger, so SC-8 holds and nothing is lost.
- LESSON: "fail-open" is a property of a SURFACE, and the same degraded row can be safe on one surface and dangerous on another. On position A an IGNORE is harmless (the advisory was never blocking); on position B an IGNORE is a DISMISSAL. The wrapper must therefore never blindly apply the inner layer's fail-polarity — it must recognise a degraded row as NOT AN ADJUDICATION and fall back to the verdict it was asked to filter.
- EVIDENCE: 7 pass/1 fail → 9 pass/0 fail; the new `test_gate_degraded_row_never_dismisses_on_a_FAIL_OPEN_class` pins it (a `dumb` violation + a down judge ⇒ verdict stays STEER, NOT ALLOW)

## [2026-09-21T13:22:00] — EN-058: a reload test that constructed the store AFTER the edit (a no-op masquerading as a reload)
- SYMPTOM: `test_policy_reload` failed on `r.changed === true` — received false, on a file that HAD been edited.
- ROOT CAUSE: the test wrote the EDITED file first, then `new PolicyStore(p)` (which reads the edited content), then called `reload()` — which re-read the same content it was constructed from. The store was correct; the fixture had eliminated the very transition it was meant to observe.
- FIX: load the store BEFORE the edit, matching the production sequence (load → a human edits → reload). `changed` now reports true and the version bump is observed.
- LESSON: a RELOAD can only be tested across a CHANGE. Constructing the subject after the mutation silently converts the test into a tautology — it passes or fails on the fixture's ordering, not on the behaviour. This is the fixture-clock trap (EN-053) in a different costume: both are cases where the SETUP, not the code, determined the outcome.
- EVIDENCE: 7 pass/1 fail → 8 pass/0 fail; changed=false on a re-read of identical content, changed=true on a genuine edit

## [2026-09-21T13:33:00] — EN-059: the host/container expects delta (+4), root-caused after surviving as folklore
- SYMPTOM: the container battery reports 905 expect against the host's 901 — same 244 pass, same 0 fail, same 25 files. An identical suite producing a different number of ASSERTIONS.
- FIRST HYPOTHESIS (WRONG, and killed by measurement): "the TSG binary is on the host's PATH but absent in the container." Measured: `which tsg` / `which abide` → ABSENT in BOTH. A plausible story that the probe refuted in one command. Second time this session that a mechanism-shaped guess died on contact with an actual measurement.
- ROOT CAUSE (measured): printed the actual `r.down` list in both environments from the same cold-scope construction. HOST 9 down · CONTAINER 11 down. `tests/st-gi-v2-deps.test.ts:112` asserts TWO expectations per down entry, so count = 2 × |down|. The two extra entries are ABIDE and RSI_STORE, which probe ABSOLUTE HOST PATHS (`/home/leviathan/JARVIS_WORKSPACE/.../JARVIS/rep...` and `/home/leviathan/.omp/graph-intelligence/rsi`) — paths that exist on the host and cannot exist in a container. 2 × 2 = +4, exactly.
- THE SAME +4 APPEARED AS 701 vs 705 in the v2.0 container run and was never explained. It is now.
- FIX: NONE — and that is the correct call. The loop is right (every down entry must state why). The defect is in what a reader may CONCLUDE: "901 expects" is not a constant, it is a function of the host's filesystem. Recorded in the Phase F artifact so the next session does not re-derive it or mistake it for a regression.
- LESSON: a count that differs between two environments with IDENTICAL pass/fail is not noise — it is a test whose ASSERTION COUNT is data-dependent. Chase it to the loop, then to the data, then to the environment fact. And when a delta predates your work, root-cause it anyway: unexplained folklore becomes a false regression the moment someone moves a directory.
- EVIDENCE: 9 vs 11 down measured in both; 2 expects per entry at st-gi-v2-deps.test.ts:112-113; 2×2=4 = the observed delta; my five suites identical at 200 expects in both

## [2026-09-21T14:30:00] — EN-060 ★ CRITICAL: a NaN from the model bypassed the fail polarity entirely
- SYMPTOM: found by the P5 red-team's J-numeric probe, written to RECORD behaviour rather than assert it. A judge returning `NaN` produced `band: "ignore"` on a `dumb` fire.
- ROOT CAUSE: `const band = p >= policy.act ? "act" : p >= policy.flag ? "escalate" : "ignore"`. EVERY comparison against NaN is false, so control falls to the final `else` — `ignore` — REGARDLESS of the policy's fail polarity. On a fail-CLOSED class (theatrical, destructive) the D010 contract says a judge that cannot answer must REFUSE; a NaN produced IGNORE. **The fail polarity was not consulted at all** — the corrupt value routed itself by falling off the end of a ternary.
- THE SEVERITY: identical in form to EN-057 (the fail-OPEN dismissal) but reached from the WRONG side — there, a degradation applied the polarity; here, a corrupt value ESCAPED the polarity. Both end with enforcement silently switched off while the battery stays green.
- FIX: extend the existing UNCERTIFIABLE guard from `a === undefined` to `a === undefined || !Number.isFinite(a.probability)`, and route by the polarity exactly as the no-answer path does, naming the degradation `+bad-answer`.
- ★ AND THE FIX OPENED A HOLE I CLOSED IN THE SAME PASS: `+bad-answer` is a NEW suffix, and two consumers (the advisory, the gated runner) pattern-matched the suffix LIST themselves. Either would have treated a corrupt answer as a REAL adjudication. FIX: the vocabulary moved to `degradationOf()` in fire-gate.ts — one place knows the strings, the consumers ask. Adding a degradation kind is now a ONE-LINE change in one file.
- LESSON: a value that fails every comparison is not a value that fails SAFELY — it is a value that takes whatever branch is left over, and the leftover branch is almost never the conservative one. Also: when a fix introduces a new member of an enumeration, grep every consumer of that enumeration BEFORE the fix, not after.
- EVIDENCE: 21 pass/2 fail → 24 pass/0 fail; `degradationOf(row.policyName) === "BAD_ANSWER"` for NaN and Infinity on both polarities

## [2026-09-21T14:32:00] — EN-061: an inconsistent policy validation (one empty band caught, its twin not)
- SYMPTOM: the P5 red-team's K-policy probe. `act < flag` was REJECTED; `act == flag` LOADED — and both empty the ESCALATE band.
- ROOT CAUSE: the check was `if (p.act < p.flag)` with the message "the ESCALATE band would be empty" — accurate for `<`, and EQUALLY accurate for `==`, which the check did not cover.
- FIX: `act <= flag` is rejected, with the two cases distinctly named — GI_POLICY_INVERTED (the numbers contradict: the flag claims a higher bar than the act, and `p >= act` is tested first so the flag is never consulted) and GI_POLICY_ZERO_WIDTH_BAND (the band has no width). BOTH rejections rest on the same reason: ESCALATE is a DOCUMENTED band, and a policy that silently makes it unreachable is the silent-configuration class this module exists to prevent.
- LESSON: when a validation says "this would empty X", check whether the IDENTICAL harm arrives by a second path the predicate does not cover. A `<` where the harm is `<=` catches one and advertises that the other is safe.
- EVIDENCE: the zero-width policy loaded before → now throws GI_POLICY_ZERO_WIDTH_BAND; the inverted case still throws GI_POLICY_INVERTED

## [2026-09-21T14:50:00] — EN-062: the AUDIT RAIL REBUILT — the zen-free adapter restored and corrected
- SYMPTOM: `ocr scan` failed with `dial tcp 127.0.0.1:4098: connect: connection refused`. The audit gate had been BLOCKED for the whole session, so no ship-ready claim could be made.
- ROOT CAUSE (measured, three components): port 4097 UP · go-session-proxy 6 procs RUNNING · port 4098 REFUSED because `/tmp/zen-free-adapter.mjs` was GONE — /tmp does not survive a reboot, which the skill itself warns about.
- FIX: rebuilt the adapter at `~/.omp/run/adapters/zen-free-adapter.mjs` (durable, out of /tmp) and started it with the hub (`op:"start"`, ready on port 4098, restart on-failure) so it is SUPERVISED rather than a bare `&`.
- ★ THREE ROUNDS OF PROBE ERRORS, EACH A MEASURED CORRECTION THE SKILL DID NOT CARRY:
    1. `{type:"function", function:{name}}` → 400 "tools[0] missing required field `name`"
       (the [OI] nested shape the rest of this stack uses is REJECTED here)
    2. `{name, description, input_schema}` → 400 "tools[0] did not match any supported type"
    3. `{type:"function", name, description, parameters}` → 200 ✓ THE WORKING SHAPE
       — `type` AND a TOP-LEVEL `name` are both required.
  Plus a bug of my own, caught by the probe and not by reading: the dedupe filter still
  used the NESTED accessor (`t.function.name`) after I flattened the stubs, so it threw and
  the adapter answered 500 with Bun's HTML error overlay.
- ★ AND A SECOND MEASURED CORRECTION: the raw `response.completed` object carries NO
  top-level `output_text` (measured: `output: [reasoning, message]`, no output_text field).
  That field is a CLIENT-SDK CONVENIENCE. ocr reads it, so the adapter must SYNTHESIZE it
  from `output[].content[].text` over the `message` items — without that, every scan would
  silently read an empty answer.
- VERIFICATION: the probe returns `status: completed` and `output_text: 'ADAPTER_OK'`.
- THE SKILL WAS UPDATED (a managed skill, so writable): the working tool shape, the
  output_text synthesis, the durable-path + hub-supervision rule, and a
  failure-symptom→cause table (500+HTML = the adapter threw, not the upstream; 400 name =
  no top-level name; 200-but-empty = output_text not synthesized; refused = not running).
- LESSON: an adapter is a CONTRACT with two independent validators (the gate fingerprint
  and the upstream's schema) plus a third reader (ocr). Each was discovered by RUNNING it.
  A skill that names the steps but not the SHAPES leaves the next session to rediscover
  them one 400 at a time.

## [2026-09-21T16:00:00] — EN-063 ★★★ CRITICAL: my own F0 fix RE-INTRODUCED F0
- SYMPTOM: the pass-3 audit scan rated a `drain()` finding CRITICAL — "marks failed rows as seen on partial commit — permanent data loss".
- ROOT CAUSE: THE FIX FOR F0 CREATED A NEW INSTANCE OF F0. F0 was "the watermark advances before the commit". The fix moved the watermark to after the commit — but the R7 fix then made `appendMany` commit SOME rows and fail others (a per-row fallback), while returning only a COUNT. `drain` still marked EVERY ATTEMPTED row as seen, so the failed rows were marked seen and NEVER RETRIED: a permanently lost fire, which is precisely F0's harm.
- ★ THE PATTERN, AND WHY IT MATTERS MORE THAN THE BUG: F0's fix needed a second fix (R7) to stop one bad row blocking its siblings, and THAT fix silently re-opened F0. A count cannot distinguish "all committed" from "some committed"; only the ROWS can. The fix: `appendManyDetailed` returns `{committed, failed}` and `drain` advances the watermark PER COMMITTED ROW.
- THE SECOND FINDING IT DREW: "withLedger's retry guarantee depends on the broken watermark" (HIGH) — the same root, and it is now sound because the watermark is per-row.
- LESSON: when a fix changes a function's RETURN SHAPE from "a fact about the whole" to "a fact about a part", every consumer of that return value must be re-derived. `appendMany` went from "all or nothing" (a boolean-ish count) to "some of each" — and `drain`'s invariant ("every attempted row is now persisted") silently became false. The audit found it in one pass; a test suite that only asserted the happy path would not have.
- ALSO FIXED FROM PASS 3: recordTruth now WHITELISTS confirmed|refuted (a single-value exclusion let any other string reach SQLite) · band/action domain validation added · `all()` gained an optional limit (the table grows without bound) · the module-global drain map is now bounded at 64 entries.
- EVIDENCE: the new test `F0b-critical` repairs a failed row IN PLACE and asserts the next drain WRITES it (1 → 2 rows, no duplicate); battery 292/0/1043/28 · tsc 191 == baseline.
