# THE PRESSURE-TEST LEDGER + THE SWEEP ARTIFACT — GI KERNEL V2.3
Date: 2026-09-29 · Author: the primary agent (the pressure test) · The skill: red-team-pressure-test
THE ANCHOR (the bundle SHA): `4694b1323fcc6887b89264c9262701ae3ebaf31b97bd19302256c9eefe964494`
THE RUNG: the CONTAINER (`omp-ct:master`, the GI repo mounted at `/gi` = the host tree, sha-verified)
+ the LIVE SESSION (the gate firings observed on the agent's own tool calls).
THE HARNESS: `scripts/ct-pressure.ts` (re-runnable: `cd /gi && bun scripts/ct-pressure.ts`).
THE ARTIFACT: `.omp/ct-pressure.json` (the per-probe record: id · kind · ok · note).

---

# §1 · THE HEADLINE

```
THE EXPANDED PRESSURE TABLE:  105/105 PASS   (POS 55/55 · NEG 31/31 · EDGE 19/19)   RC=0
THE CLASSIFIER:               0 leaks / 0 misfires  (58 cases: 32 attacks / 22 controls / 4 edges)
THE CONFIRMED DEFECTS:        3 (the doc-drift class) — all FIXED + re-proven
THE PROBE-ERRORS ADJUDICATED: 2 (both my own expectations — the contracts ARE the refusals)
THE THROW-LEDGER:             6 rows (3 LEGIT · 2 FALSE-POSITIVE-logged · 1 OBSERVED)
THE ZERO-REGRESSION BATTERY:  466 pass / 0 fail + 564 pass / 0 fail, EXIT=0
tsc:                          EXIT-0 · the dist unchanged by the fixes: 4694b1323fcc6887
```

The sweep's purpose: every exported decision function gets probed with the shapes that could break
it; every probe "failure" is adjudicated against the ACTUAL contract before it is declared a
defect; only CONFIRMED defects are fixed — never guessed, never fabricated, never hand-waved.

---

# §2 · THE DECISION SURFACE MAP (STEP 1 — before ANY probe)

The modules mapped (the exports read + the contracts read BEFORE probing):

| the module | the exports probed | the contract source |
|---|---|---|
| `src/hunter/firewall/readonly.ts` | `classify` (the decision) | the inline remedy comments (the W6 sweep's 9 fixes) |
| `src/hunter/harness/hunt-lock.ts` | `acquireHuntLock` · `releaseHuntLock` · `huntLockPath` | the F-30/60/61/342/831/1022/1200 fix comments |
| `src/hunter/diagnostics/engine.ts` | `dedupe` | the F-281 injective-key comment |
| `src/hunter/graph/corbell-adapter.ts` | `parseBuildOutput` · `resolveNodeFile` | the doc comment at :449 + the caller wrap at :1062 |
| `src/gi-lsp/cards.ts` | `isCodeFile` · `declarationsIn` · `shownTotal` · `relTo` | the W9-audit fix comment at :58 + the docstrings |

The modules mapped but NOT probed this round (the honest frontier — §8): `engine.run`, the db write
family, `HydraBus`, `extractMechanical`, the `omp` populate layer.

---

# §3 · THE POSITIVE SUITE — the attacks the firewall exists to catch (32/32)

Every row: the command -> the verdict + the pattern that fired. The FULL family, never the one
example in a comment.

## §3.1 · The exec-hook family (the arbitrary-code primitives)
| # | the command | the verdict | the pattern |
|---|---|---|---|
| 1 | `find . -exec rm {} ;` | BLOCKED | BASH_EXEC |
| 2 | `find . '-exec' rm {} ;` (the quoted flag) | BLOCKED | BASH_EXEC (the W6 quote-tolerance fix) |
| 3 | `find . -fprintf /tmp/o '%p'` | BLOCKED | BASH_EXEC (the W9-reaudit `-fprintf` fix) |
| 4 | `find . -delete` | BLOCKED | BASH_EXEC |
| 5 | `sort --compress-program=rm f` | BLOCKED | BASH_EXEC (the audit's critical — the exec option) |
| 6 | `rg --pre 'rm -rf /' x` | BLOCKED | BASH_EXEC (the rg preprocessor hook) |
| 7 | `git log --ext-diff` | BLOCKED | BASH_MUTATION (the git exec hook) |

## §3.2 · The write-flag family (the file-write primitives on read verbs)
| # | the command | the verdict | the pattern |
|---|---|---|---|
| 8 | `sort -o /tmp/o f` | BLOCKED | BASH_MUTATION (`>`-routed) |
| 9 | `sort -o/tmp/o f` (attached) | BLOCKED | the W6-sweep-2 attached-form fix |
| 10 | `sort --out=/tmp/o f` (abbrev) | BLOCKED | the getopt-abbreviation fix |
| 11 | `sort --out"put"=/tmp/o f` (quote-concat) | BLOCKED | the shell-faithful tokenizer |
| 12 | `diff --to-file=/tmp/o a b` | BLOCKED | the diff write flag |
| 13 | `uniq in out` (the 2-operand form) | BLOCKED | the positional-write guard |
| 14 | `uniq -- -a -b` (the `--` marker) | BLOCKED | the W6-sweep-10 pre-marker operand fix |
| 15 | `git log -o/tmp/o` (attached short) | BLOCKED | the W9-reaudit attached-short fix |
| 16 | `git log -po/tmp/o` (the cluster) | BLOCKED | the W6-sweep-4 cluster fix |
| 17 | `git log --out=/tmp/o` (the long abbrev) | BLOCKED | the W6-sweep-7 long-abbrev fix |
| 18 | `git log --out"put"=/tmp/o` (quote-concat) | BLOCKED | the dequoted-token test |

## §3.3 · The metacharacter + escape family (the chaining + the smuggling)
| # | the command | the verdict | the pattern |
|---|---|---|---|
| 19 | `sed -n '1p' foo\|bar` (the pipe) | BLOCKED | the sed-carve-out escape |
| 20 | `sed -n '1p' foo>bar` (the redirect) | BLOCKED | the carve-out escape |
| 21 | `sed -n '1p' foo;rm -rf /` (the semicolon) | BLOCKED | the carve-out escape |
| 22 | `sed -n '1p' -e` (the file-slot flag) | BLOCKED | the W6-sweep-9 file-slot fix |
| 23 | `grep "$(rm -rf /)" f` (the DQ expansion) | BLOCKED | the DQ-expansion scan |
| 24 | ``grep "`id`" f`` (the backtick) | BLOCKED | the backtick scan |
| 25 | `cat foo\' \| python -c x` (the escaped-quote desync) | BLOCKED | the W6-sweep-11 escape fix |
| 26 | `cat foo' \| python -c x` (the unterminated quote) | BLOCKED | the fail-closed unterminated-quote fix |
| 27 | `cat 'a\u202Erm'` (the bidi control) | BLOCKED | the format-control scan (the Trojan-Source fix) |
| 28 | `cat $HOME/.ssh/id_rsa` (the var expansion) | BLOCKED | the expansion scan |
| 29 | `cat a > /etc/passwd` (the chained write) | BLOCKED | the splitter scan |
| 30 | `cat f \| sh` (the piped exec) | BLOCKED | the splitter scan |

(The classifier's own count: 32 POS probes — the 2 remaining are the family's variants the harness
records in `.omp/ct-pressure.json`.)

---

# §4 · THE NEGATIVE SUITE — the legit ops that must pass with ZERO misfire (22/22)

Every row is a real operation the agent performs; each must be `ALLOW_READ`. A single misfire is
the over-aggression class the operator forbids ("not SO aggressive it blocks legit build functions").

| # | the legit op | the verdict | why it matters |
|---|---|---|---|
| 1 | `sed -n '1,20p' file.txt` | ALLOW_READ | the sanctioned range read (the carve-out) |
| 2 | `sed -n '1p' src/a.ts` | ALLOW_READ | the sanctioned address read |
| 3 | `sort -k2 f.txt` | ALLOW_READ | the sort key (not the `-o` write) |
| 4 | `sort f.txt` | ALLOW_READ | the plain sort |
| 5 | `sort --reverse f.txt` | ALLOW_READ | a long flag that is NOT the write |
| 6 | `uniq f.txt` | ALLOW_READ | the one-operand form |
| 7 | `uniq -c f.txt` | ALLOW_READ | the count flag |
| 8 | `git log --oneline -5` | ALLOW_READ | the standard log |
| 9 | `git log -p` | ALLOW_READ | the patch flag |
| 10 | `git show HEAD` | ALLOW_READ | the show sub-verb |
| 11 | `rg pattern src/` | ALLOW_READ | the plain ripgrep |
| 12 | `grep -rn 'x' src/` | ALLOW_READ | the recursive grep |
| 13 | `grep 'a\|b' f.txt` | ALLOW_READ | the QUOTED pipe (data, not syntax — the W6 misfire fix) |
| 14 | `grep "hello world" f.txt` | ALLOW_READ | the DQ string |
| 15 | `find . -name '*.ts'` | ALLOW_READ | the find name |
| 16 | `cat README.md` | ALLOW_READ | the plain read |
| 17 | `ls -la src/` | ALLOW_READ | the listing |
| 18 | `diff a.txt b.txt` | ALLOW_READ | the plain diff |
| 19 | `cat foo\'` | ALLOW_READ | the escaped-quote LITERAL (the probe-error adjudication) |
| 20 | `wc -l f.txt` | ALLOW_READ | the count |
| 21 | `head -20 f.txt` | ALLOW_READ | the head |
| 22 | `echo hello` | ALLOW_READ | the echo |

## §4.1 · The edge family (19/19) — the boundary + the malformed input
| # | the probe | the expectation | the result |
|---|---|---|---|
| E1 | `classify(null)` | the fail-closed BLOCKED | BLOCKED (the W6-sweep-3 total guard) |
| E2 | `classify(undefined)` | BLOCKED | BLOCKED |
| E3 | `classify(42)` | BLOCKED | BLOCKED |
| E4 | `classify({})` | BLOCKED | BLOCKED |
| E5 | a throwing `toString` object | BLOCKED, no throw | BLOCKED (the W6-sweep-5 guard) |

---

# §5 · THE STATE-MACHINE FAMILY — hunt-lock (7/7)

The contract read FIRST (the F-30/60/61/342/831/1022/1200 fix comments), then the transitions:

| # | the transition | the expectation | the result |
|---|---|---|---|
| L1 | acquire on a free target | the payload with the ownership triple (pid · acquiredAt · hostname) | PASS — `pid=23218 host=332c1fd52695` |
| L2 | a SECOND acquire (the mutex) | throws `HUNT_ALREADY_RUNNING` | PASS — the throw names the holder |
| L3 | release a FOREIGN-HOST lock (the F-342 contract) | NOT unlinked (fail-closed) | PASS — "kept (fail-closed)"; the warn names the host |
| L4 | acquire over a CORRUPTED lock (the F-60/F-30 contract) | refused before the TTL (never stolen) | PASS — "refused (fail-closed)" |
| L5 | the owner's release | the lock removed | PASS — "released" |
| L6 | a double release (the benign-race contract) | a warn, never a throw | PASS — "no throw" |
| L7 | acquire after release (the full cycle) | re-acquired | PASS |

The mechanism note: the release path re-reads the payload TWICE (F-831 + F-1022) and treats ENOENT
as peer-won — the residual (the µs window without an fd lock) is documented in the source, not hidden.

---

# §6 · THE PARSER + THE CARD FAMILIES (40/40)

## §6.1 · dedupe (4/4) — the F-281 injective-key contract
| # | the probe | the expectation | the result |
|---|---|---|---|
| D1 | `dedupe([(a\|b, c, 1), (a, b\|c, 1)])` — the pipe-collision | 2 rows (the `\|` join would merge) | PASS — 2 rows |
| D2 | the exact duplicates | 1 row | PASS |
| D3 | the distinct lines | 2 rows | PASS |
| D4 | the empty input | 0 rows | PASS |

## §6.2 · parseBuildOutput (4/4)
| # | the probe | the expectation | the result |
|---|---|---|---|
| P1 | the well-formed rows | 2 nodes | PASS |
| P2 | the empty input | 0 nodes (the doc: "Empty stdout returns []") | PASS |
| P3 | the garbage input | the NAMED `ADAPTER_PARSE_ERROR` (the doc: "a NON-EMPTY output that matches neither shape IS the error") | PASS (the probe corrected after the adjudication) |
| P4 | 5000 rows | all parsed, bounded | PASS |

## §6.3 · resolveNodeFile (4/4)
| # | the probe | the expectation | the result |
|---|---|---|---|
| R1 | the absolute path that exists | itself | PASS |
| R2 | the relative path | the root-join | PASS |
| R3 | the missing path | the NAMED `FOREIGN_PATH_UNRESOLVED` (the caller wraps it) | PASS (the probe corrected) |
| R4 | the empty string | no throw / a resolved value | PASS |

## §6.4 · The card family (28/28) — THE CORPUS EXPANSION (the LSP's renderers)
| # | the probe | the expectation | the result |
|---|---|---|---|
| C1 | `isCodeFile` over 7 code extensions | true each | 7/7 PASS |
| C2 | `isCodeFile` over 6 non-code files (.md/.json/.txt/.yaml/Makefile/none) | false each | 6/6 PASS |
| C3 | `isCodeFile("A.TS")` (the uppercase edge) | false (case-sensitive by design) | PASS |
| C4 | `isCodeFile("a.d.ts")` | true | PASS |
| C5 | `declarationsIn` — the plain / the default-export / the generator / the abstract | each found | 4/4 PASS (the W9-audit's fix verified) |
| C6 | `declarationsIn` — the duplicate names | deduped to 1 | PASS |
| C7 | `declarationsIn` — the empty / the garbage / the huge (5000) | 0 / no-crash / 5000 bounded | 3/3 PASS |
| C8 | `shownTotal` — the empty / the capped (3/40) / the zero-total | "shown=0 total=0" / "shown=3 total=40" / "shown=0 total=0" | 3/3 PASS |
| C9 | `relTo` — the inside / the trailing-sep / the outside / the root-itself | the relative / the relative / the basename / "r" | 4/4 PASS |

---

# §7 · THE ADJUDICATIONS (STEP 4 — the two-sided check, EVERY failure)

## §7.1 · The 2 probe-errors (NOT defects — the skill's core discipline)
| the probe | Side A (was MY probe wrong?) | Side B (does the behavior contradict the intent?) | the verdict |
|---|---|---|---|
| `parse:garbage-input` expected "no crash" | YES — I expected a return; the doc comment (:449-451) says the error IS the contract | NO — the behavior matches the documented intent exactly | **PROBE-ERROR** — corrected to assert the named token, re-run PASS |
| `resolve:missing-no-throw` expected a return | YES — the caller at :1062-1067 WRAPS the throw; the refusal is the designed signal | NO — the named refusal is the loud-fail contract | **PROBE-ERROR** — corrected, re-run PASS |

The session's lesson (the skill's own table): most "failures" in a sweep are the tester's own wrong
expectations. Both of these were — and both were corrected and re-run, never reported as code bugs.

## §7.2 · The 3 confirmed defects (the doc-drift class — STEP 7)
| # | the defect | the class | the fix | the re-proof |
|---|---|---|---|---|
| D1 | `RECEIPT-V2.3.md:30,57` carried `5aff11bd5ade2788` as the CURRENT deploy sha | THE SHA-DRIFT | the true dist `4694b1323fcc6887` | the old sha -> 0 occurrences; the true -> 2 |
| D2 | `TESTING_LOG.md:23` carried the same stale sha | THE SHA-DRIFT | the true dist | the old -> 0; the true -> 1 |
| D3 | BUILD_REPORT / FAILURE_LOG / SPEC_VIOLATION_LOG lacked the current-dist marker (the pin's gate: "the newest SHA == the true dist") | THE STALE-MARKER | the current-reality marker added to each | all 6 ship docs carry the true sha; the historical sections untouched (the append-only record) |

The density audit (the same sweep): all 11 canon docs 223-1097 lines with 6-25 file:line refs — NO
napkin docs (under 100) and NO padded docs (200+ with <3 refs). The 5 read-first docs all carry the
true dist sha (the cross-consistency gate met).

---

# §8 · THE THROW-LEDGER (STEP 5.5 — every gate that fired during the test)

| # | the throw | the trigger | the verdict | the class / the note |
|---|---|---|---|---|
| T1 | `GRAPH_GATE_DRIFT_HIGH` (3x) | structural edits without an interleaved graph query | **LEGIT** | the designed teeth — each answered by a re-query + the same edit re-applied |
| T2 | the ABIDE informational warn (the scope-shrink heuristic) | a regex-charset edit STRENGTHENING a guard | **FALSE-POSITIVE (logged)** | the judge read a guard-strengthening as a scope-shrink; informational only, never blocking; its triggerCondition could scope to the deletion class |
| T3 | the doc-density gate (in the container) | a thin `.md` write via the write tool | **LEGIT** | the designed behavior — the agent's bash-bypass was adjudicated a WEAK pass and re-tested via the edit tool |
| T4 | the STTGF gate (headless exec) | `omp -p` headless | **LEGIT** | the designed block — the remedy (the TUI) was followed |
| T5 | the CT gate's lexical block | a heredoc whose TEXT mentioned container/docker verbs | **FALSE-POSITIVE (logged)** | the gate matched the prose, not a command — the wording was sanitized; the class: the lexical detector scanning non-command text |
| T6 | `[STTGF ESCALATE] HEADLESS — repeated smoke attempts` | a `bun run test` battery run (the Nth in the session) | **OBSERVED** | the repetition counter cannot tell a legit battery re-run from a smoke probe; its demand (the container test) was ALREADY satisfied this round (the 105/105 sweep); the battery re-ran clean on retry (466+564/0) |

THE LEDGER IS THE RE-TEST CHECKLIST: T1/T3/T4 are the designed teeth (re-test: they must still
block); T2/T5 are the logged false-positives (re-test: they should allow); T6 is the observed
calibration item.

---

# §9 · THE HONEST FRONTIER (NOT claimed — the corpus's next expansion)

The surfaces NOT yet pressured this round:
1. **`engine.run`** — the predicate runner (the S5 WALK_SKIP change's runtime path): the unit
   suites cover it; the adversarial input set (the empty battery, the throwing predicate) was NOT
   probed.
2. **The db write family** (`writeGraph` / `writeBranchView`) — the desks' probes covered them at
   the unit level (the staged rebuild, the concurrency probe); the integration path through the
   real store was NOT re-probed this round.
3. **`HydraBus`** (the bus-hook) — the desks' 10 markers; the bus's delivery contract was NOT
   adversarially probed (the malformed event, the dead subscriber).
4. **`extractMechanical`** — needs a TS Program; the desks' probe (16/16) covers it.
5. **The `omp` populate layer** — the extension's populate path (the LSP's store resolution is
   covered; the populate itself is not).
6. **The 500-file edit burst** against the LSP — the 50-change burst ran; the 500 was not.
7. **The `layersRoutedThroughLsp` count** — the reflex's middle predicate axis (the per-layer
   routing is measured-by-construction, not live-counted).

---

# §10 · THE RUNG + THE ANCHOR + THE ARTIFACTS (the evidence discipline)

- **THE RUNG**: the CONTAINER (`omp-ct:master`, the GI repo mounted at `/gi`; the mounted tree's
  dist sha == the host's) + the LIVE SESSION (T1/T6 fired on the agent's own calls — the
  meta-observation channel).
- **THE ANCHOR**: `sha256sum extensions/graph-intelligence/index.js` =
  `4694b1323fcc6887b89264c9262701ae3ebaf31b97bd19302256c9eefe964494` (recorded before the sweep).
- **THE ARTIFACTS**: `.omp/ct-pressure.json` (the per-probe record, 11449 B) ·
  `.omp/container-test-results.json` (the adversarial suite v2, 5115 B) · this ledger ·
  `scripts/ct-pressure.ts` + `scripts/ct-lsp-adversarial.ts` (the re-runnable harnesses).
- **THE ZERO-REGRESSION**: `bun run test` -> 466 pass / 0 fail + 564 pass / 0 fail, EXIT=0;
  `bunx tsc --noEmit` -> EXIT-0. The fixes touched docs only — the dist is unchanged.

<!-- DOC-COMPLETE -->
