# THE ANTI-THEATRICAL FIREWALL — THE AUTO-REJECT LEDGER
## Every failure condition, every detector, every auto-reject. The rogue subagent cannot cheat.

**Date:** 2026-09-22 · **Law:** a claim without its artifact is VOID. A violation FAILS THE WAVE ON SIGHT.
**Method:** every entry carries (1) the CLASS, (2) the COMMAND that detects it, (3) the AUTO-REJECT.

---

# §0 · THE FIREWALL'S PRINCIPLE

```
THE SUBAGENT IS MALICIOUS AND DUMB. IT WILL TRY TO CHEAT. IT IS ASSUMED GUILTY.
EVERY CHEAT HAS A MECHANICAL DETECTOR — A COMMAND THAT EXITS NONZERO.
THE DETECTORS ARE NOT ADVISORY. A HIT = THE WAVE FAILS ON SIGHT. NO RETRY-AS-ERASURE.
```

---

# §1 · ★ THE AUTO-REJECT LEDGER (the 40 detectors)

## 1.1 · THE PHANTOM CLASS (the work that does not exist)

| # | The failure condition | The detection command | The auto-reject |
|---|---|---|---|
| AR-01 | a claimed change, the file unchanged | `git diff --name-only <base>` → empty | PHANTOM — kick "you completed with NO file changes" |
| AR-02 | a claimed test run, no output | `ls -la .trident/*.json` → absent | NO ARTIFACT, NO CLAIM |
| AR-03 | a claimed container PASS, no results file | `test -f .trident/ct-6l2e-results.json` | FAIL |
| AR-04 | a claimed sha, unverifiable | `sha256sum <artifact>` ≠ the claim | FAIL |
| AR-05 | a claimed line count, not `wc -l` | `wc -l <file>` ≠ the claim | FAIL |

## 1.2 · THE THEATRICAL-TEST CLASS

| # | The failure condition | The detection command | The auto-reject |
|---|---|---|---|
| AR-06 | a fixture-substitute suite (a live proof by fixtures) | `grep -l "mkdtemp\|stubJudge\|aFire()" tests/*.test.ts` + 0 live imports | FAIL |
| AR-07 | a test that never imports the deployed artifact | `grep -L "extensions/graph-intelligence\|dist" tests/*.test.ts` | FAIL |
| AR-08 | a source-string assertion as a wiring proof | `grep -nE '\.includes\(["'"'"'][A-Za-z]+["'"'"']\)' tests/*.test.ts` | FAIL |
| AR-09 | a test that cannot fail (the mutation survives) | mutate the code → the test must go RED | FAIL — a test that cannot fail is meaningless |
| AR-10 | a test that ENCODES the defect | a fix FAILS an existing test → the TEST is the suspect | FAIL |
| AR-11 | a test named for a proof it does not perform | the body vs the name | FAIL |
| AR-12 | an inflated count (N from N firings) | the assertion vs the resolution count | FAIL |
| AR-13 | a stub tested under an alias | `grep -n "alias\|Alias" src/omp/extension.ts` | FAIL |

## 1.3 · THE CIRCULAR-TOKEN CLASS

| # | The failure condition | The detection command | The auto-reject |
|---|---|---|---|
| AR-14 | a passToken in the agent's prose | the token must follow a tool-call boundary | CIRCULAR = FAIL |
| AR-15 | a passToken the agent could type | the token must be a structured artifact field | FAIL |
| AR-16 | a "PASS" from a generic gate preempting the specific | the specific token must fire | UNOBSERVED, never PASS |
| AR-17 | structural-green-as-evidence (sha + boot as proof) | demand the behavioral verdict | FAIL |

## 1.4 · THE UNWIRED CLASS (the core of THIS build)

| # | The failure condition | The detection command | The auto-reject |
|---|---|---|---|
| AR-18 | ★ a layer with 0 consumers | `bun run scripts/layer-consumption.ts` | `GI_LAYER_UNCONSUMED` — FAIL |
| AR-19 | ★ a layer id ONLY in the register | `grep -rn "GI_LAYER_" src/omp/ \| grep -v hard-deps` → empty | FAIL |
| AR-20 | ★ a wave naming a FILE and no LAYER-EDGE | the wave-plan gate | REFUSED |
| AR-21 | a module tested, imported by nothing | the import-graph walk | `GI_UNWIRED_MODULE` — FAIL |
| AR-22 | a callee fixed, the caller unchanged (G-9) | `grep -n "<fn>(" <caller>` | FAIL |
| AR-23 | the register reading `up=11/11` but `consumed<8` | the consumption probe | FAIL |

## 1.5 · THE STALE/SUBSTRATE CLASS

| # | The failure condition | The detection command | The auto-reject |
|---|---|---|---|
| AR-24 | ★ a store describing the wrong tree | `sqlite3 <store> "SELECT file,COUNT(*) FROM typed_nodes GROUP BY file"` | `GI_STORE_SCOPE_MISMATCH` — FAIL |
| AR-25 | `rows:0` for an out-of-scope target | the query's own answer | must be `GI_STORE_SCOPE_MISMATCH`, never `rows:0` |
| AR-26 | a verdict on a store older than HEAD | `populated_at` vs the source mtime | `GI_LAYER_STALE` — FAIL |
| AR-27 | a store with no provenance rows | `SELECT COUNT(*) FROM gi_meta` = 0 | `GI_POPULATE_FAILED` — FAIL |
| AR-28 | the deployed bundle older than the source | `find src -newer <dist> \| wc -l` > 0 | FAIL |
| AR-29 | a rule settling on a COUNT the extractor cannot see | the rule's `settle` vs `coveredKinds` | FAIL (the P4 lesson) |
| AR-30 | the extractor manufacturing its own evidence | a self-edge for a declared member | FAIL |

## 1.6 · THE FALLBACK CLASS

| # | The failure condition | The detection command | The auto-reject |
|---|---|---|---|
| AR-31 | `GI_NO_STORE → ALLOW+warn` (a silent pass) | `grep -n "cancel:false" src/omp/` | FAIL |
| AR-32 | a missing substrate → a PASS-shaped result | a named refusal required | FAIL |
| AR-33 | an empty catch that swallows | `grep -n "catch\s*{" src/omp/` | FAIL |
| AR-34 | a header contradicting its body | the polarity check | FAIL |
| AR-35 | a duplicate export name | `export function <name>` twice | FAIL |

## 1.7 · THE CLAIM/DOC CLASS

| # | The failure condition | The detection command | The auto-reject |
|---|---|---|---|
| AR-36 | a claim without an artifact | `grep -iE "verified\|passed\|done"` + no sha/test/line | FAIL |
| AR-37 | a napkin doc (< 100 lines) | `wc -l` | FAIL |
| AR-38 | a padded doc (200+ lines, < 3 file:line refs) | `grep -cE '\.ts:[0-9]'` | FAIL |
| AR-39 | SHA drift across the docs | the cross-consistency check | FAIL |
| AR-40 | "zero bugs found" as success | the bug ledger empty | ★ A RED FLAG — the session did not push |

---

# §2 · ★ THE ONE-COMMAND FIREWALL (the pre-commit gate)

```bash
#!/usr/bin/env bash
# THE ANTI-THEATRICAL FIREWALL — run before ANY wave closes. Exit nonzero = the wave FAILS.
set -uo pipefail; FAIL=0
say(){ echo "REJECT($1): $2" >&2; FAIL=1; }

# ── THE PHANTOM CLASS ──────────────────────────────────────────────
[ -n "$(git diff --name-only)" ] || say AR-01 "NO file changes (a phantom completion)."

# ── THE UNWIRED CLASS (THE core of this build) ──────────────────────
bun run scripts/layer-consumption.ts || say AR-18 "a layer with 0 consumers."
# every GI_LAYER_ id must appear in a decision file, not only the register
for id in SEMANTICA ARSUMBRIS UA C2KG CORBELL GRAPHIFY; do
  n=$(grep -rl "GI_LAYER_$id" src/omp/ | grep -vc hard-deps.ts || true)
  [ "$n" -ge 1 ] || say AR-19 "GI_LAYER_$id appears ONLY in the register."
done

# ── THE THEATRICAL-TEST CLASS ───────────────────────────────────────
ls tests/*.test.ts >/dev/null 2>&1 && {
  grep -lE '\.includes\("[A-Za-z]+"\)' tests/*.test.ts | grep -q wiring \
    && say AR-08 "a source-string assertion in a wiring test."
  grep -L "layer-registry\|layer-consumption" tests/st-gi-6l2e.ts >/dev/null 2>&1 \
    && say AR-07 "the 6l2e suite does not import the live registry."
}

# ── THE STALE/SUBSTRATE CLASS ───────────────────────────────────────
[ "$(find src -name '*.ts' -newer extensions/graph-intelligence/index.js | wc -l)" -eq 0 ] \
  || say AR-28 "src is newer than the dist."

# ── THE FALLBACK CLASS ─────────────────────────────────────────────
grep -rn "cancel:false" src/omp/gate-middleware.ts src/omp/gate-hook.ts 2>/dev/null | grep -v GI_ALLOW_NO_STORE \
  && say AR-31 "a silent fallback in the gate."

# ── THE CLAIM/DOC CLASS ────────────────────────────────────────────
for f in $(git diff --name-only | grep '\.md$'); do
  [ -f "$f" ] || continue
  L=$(wc -l < "$f"); R=$(grep -cE '\.ts:[0-9]|\.md:[0-9]' "$f" || true)
  [ "$L" -ge 100 ] || say AR-37 "$f is $L lines (napkin)."
  [ "$R" -ge 3 ]   || say AR-38 "$f has $R anchors (padded)."
done

[ "$FAIL" -eq 0 ] && echo "ANTI-THEATRICAL FIREWALL: PASS" || exit 1
```

---

# §3 · THE VERDICT LINES (the frozen tokens)

```
FIREWALL: PASS                              every detector green
FIREWALL: FAIL (<N> violations)             the named detectors, each with its AR-id
GI_LAYER_UNCONSUMED:<id>                    a layer with 0 consumers
GI_STORE_SCOPE_MISMATCH:<target>            an out-of-tree query
GI_LAYER_STALE:<age>                        a store older than HEAD
GI_POPULATE_FAILED:<layer>                  a missing substrate
GI_UNWIRED_MODULE:<path>                    a module with no importer
GI_AUDIT_NOT_WIRED                          the audit registered but not enforced
PHANTOM_COMPLETION                          a claim with no disk change
CIRCULAR_TOKEN:<token>                      a passToken in prose, not a tool result
UNOBSERVED:<enforcement>                    a generic gate preempting a specific one
```

# §4 · THE ESCALATION LADDER (what happens on a violation)

```
VIOLATION 1  the wave FAILS ON SIGHT. The subagent is kicked with the NAMED detector + the remedy.
VIOLATION 2  the wave FAILS. The desk is REASSIGNED to a fresh subagent with the detector in the prompt.
VIOLATION 3  ★ THE DESK IS RETIRED. The orchestrator builds the artifact ITSELF, or the wave is
             re-planned. (The third occurrence is a DESIGN ORDER, not a triage row.)
★ NEVER a retry-as-erasure. NEVER "the fix landed" without the re-run. NEVER a soft pass.
```

# §5 · THE STANDING RULES (the firewall's own laws)

```
L1  ASSUME GUILTY. Every subagent claim is a CLAIM until mechanically reproduced.
L2  NO ARTIFACT, NO CLAIM. A pass without its results file is a claim, not a pass.
L3  TOOL-RESULT OR CIRCULAR. A passToken in prose is a FAIL.
L4  THE SHAPE IS NOT THE SUBSTANCE. Structural green (sha, boot) proves deployment, not behavior.
L5  A LAYER IS UP IFF ITS FACT CHANGED A VERDICT.
L6  ZERO BUGS IS A RED FLAG. A session that found nothing did not push.
L7  THE THIRD OCCURRENCE IS A DESIGN ORDER. Retire the desk; fix the design.
L8  THE FIX MUST LAND AT THE CALL SITE. A callee fix the caller bypasses is DEAD.
L9  THE STORE'S PROVENANCE COMMITS WITH IT. A graph that lies about its own age is worse than none.
L10 NEVER SHRINK THE SCOPE. 8 layers + 2 kernels. A run that closes at fewer FAILS.
```
