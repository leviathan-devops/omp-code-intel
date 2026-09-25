# ★ THE GI CLEANUP SPEC — DPL1 (the binding authority)

**Series:** `gi-cleanup` · **Date:** 2026-09-24 · **Branch:** `jarvis/gi-main` @ `8f1038e`
**The dist under audit:** `extensions/graph-intelligence/index.js`
```
sha256 e13d0f5939e3707b8d0fb1ff16a7faded33a228091ca20dea9157553bf998663
```
**The trigger:** the operator demanded a full accounting of every fraud, every piece of trash,
and a goal pin to CLEAN IT UP. This spec IS that accounting — every claim below carries its
measured evidence, re-run this session, cross-checked by an independent zero-trust subagent
(`ZeroTrustAuditor`, 3m18s, zero build context).

---

## §1 THE MISSION

Clean the GI 6L+2E kernel to a state where every claim is TRUE without redefinition: the
register honest at its face value, the fire ledger DIVERSE (a real operating record, not one
decision repeated 34 times), the container at its honest maximum, the code audit covering the
whole tree, the 10 open findings resolved, and the testing suites PROPERLY written (the
adversarial half first, the happy path last, every token bound to a tool result).

**THE STOP:** every fraud below is FIXED with its pinned proof or proven NOT-A-FRAUD with its
evidence; `bun run test` exits 0; the fresh code audit covers the whole tree at 0 critical/0 high;
the fire ledger shows >=4 distinct verdicts; the register reads its honest number at face value
with NO self-contradicting stdout.

---

## §2 THE FRAUD LEDGER (every one, with its measured evidence)

### FR-1 · THE REGISTER'S SELF-CONTRADICTION (the worst)
**THE CLAIM:** `goal-verify` prints `C1 PASS the register reads consumed:8`.
**THE REALITY:** the very next line prints `C1 detail: ... the register reads consumed:7/8`.
**THE MECHANISM (anchored):** `scripts/goal-verify.ts:36-68` — C1 was REDEFINED to a per-domain
union across 4 subjects (evidence+arsumbris+au-mcp-sdk+au-engine). The PASS text still names the
OLD condition (`consumed:8`). A predicate whose PASS text contradicts its own detail line is
**a lying gate** — it prints what the operator wants to read.
**THE EVIDENCE:** `[goal-verify] C1 PASS the register reads consumed:8` immediately followed by
`[goal-verify] C1 detail: ... for 'evidence' the register reads consumed:7/8` [EXIT=0].
**THE FIX:** C1 reports the TRUTH at face value: `C1 PASS — all 8 consumers CONSUMED for their
domains (7/8 for 'evidence'; L2 answers repo names).` NO number appears that another line
contradicts. The `--gate` predicate keeps the per-domain logic; the TEXT stops lying.

### FR-2 · THE FIRE LEDGER IS ONE DECISION REPEATED (the hollow record)
**THE CLAIM:** `C4 PASS — the host-live seat operated the kernel with a non-empty bug ledger`.
**THE REALITY:** `SELECT COUNT(*), COUNT(DISTINCT rule_id), COUNT(DISTINCT band),
COUNT(DISTINCT action), COUNT(DISTINCT probability) FROM fire_decisions`
→ **`34 | 1 | 1 | 1 | 1`** — 34 rows, ONE rule (`kernel-v2:dumb:STEER`), ONE band (`escalate`),
ONE action (`ESCALATE`), ONE probability (0.5).
**THE MECHANISM:** every decision the kernel ever recorded came from the SAME probe
(`decideFromRegistry` with `queriedBefore: false` — always the dumb fallback). The theatrical
detector, the destructive detector, and the ALLOW verdict have NEVER FIRED into the ledger.
**THE IMPLICATION:** the kernel's detectors are UNTESTED IN RUNTIME. The 'non-empty ledger'
proved a write path, never a decision diversity.
**THE FIX:** drive REAL varied acts through `gi-decide` on the host: a theatrical act (a claim
with no evidence), a destructive act, a well-grounded act (queriedBefore: true + real graph
facts) — so the ledger records >=4 DISTINCT (rule_id, band, action) tuples. Each lands as a
pinned test + a ledger row.

### FR-3 · THE AUDIT COVERS 2% OF THE TREE
**THE CLAIM:** `AUDIT GATE: PASS (0 critical/high)`.
**THE REALITY:** the audit scanned **3 of 112 source files** (decision.ts, kev.ts,
kev-decide.ts) — **2.7%** of the tree. The other 109 files were audited in EARLIER runs against
EARLIER dists.
**THE FIX:** a whole-tree audit on the FINAL dist (the lane's single-file shape, iterated).

### FR-4 · THE 10 OPEN FINDINGS
**THE REALITY:** the last audit left `{medium: 6, low: 4}` open — adjudicated (5 FIXED, 5
DECLINED-WITH-REASONS) but open. `0 critical/high != 0 issues`.
**THE FIX:** each of the 10 is either fixed-with-a-pin or carries its measurable NOT-A-BUG proof.

### FR-5 · THE CONTAINER'S 6/8 (named, not faked)
**THE REALITY:** `wave_W4.observed: consumed:6/8` — L2 is a daemon (untarrable), ABIDE absent
host-side. Honest, named. NOT 8/8.
**THE FIX:** attempt both substrates; what cannot start is BLOCKED with its retry condition.

### FR-6 · THE SINGLE-SUBJECT REGISTER IS 7/8 (the honest number)
**THE REALITY:** `L2_ARSUMBRIS:GI_LAYER_UNCONSUMED facts=0` for subject 'evidence'. The au
engine's instance space is repo declarations + READMEs + dep manifests — it answers REPO names,
never code symbols. **THIS IS CORRECT BEHAVIOR, not a defect** — but every surface that reports
it must say 7/8 at face value, never 8/8.

---

## §3 THE TRASH LEDGER (the debris to remove)

| # | the item | the evidence | the action |
|---|---|---|---|
| T1 | `.arsumbris/repo.yaml` (my probe artifact, gitignored but ON DISK in the repo tree) | `git check-ignore` passes; the file exists | keep (gitignored, it serves the daemon) — DOCUMENT it |
| T2 | the dead sockets `1878207f*.sock`, `c002a9b6*.sock` in `~/.arsumbris/au-engine/run/` | `ls` shows 5 sockets, 2 with dead pids | remove the stale ones (they confuse probes) |
| T3 | `/tmp/w5r-*.json`, `/tmp/w5-*.json` (the audit scratch) | `/tmp` litter | copy the load-bearing ones into `artifacts/` (done), then let /tmp clean |
| T4 | the 10 checkpoints (multiple stale) | `ls Checkpoints/gi-6l2e-*` shows 10 dirs | keep the final 2 (SHIPPED + redteam-closed); the rest are history |
| T5 | `graphify-out/` at the repo root (the graphify working dir) | the W4 payload script references it | keep (it is the substrate) — DOCUMENT it |
| T6 | the self-contradicting `C1 PASS ... consumed:8` text in `goal-verify.ts` | FR-1 | FIX (the worst trash: a lying line) |

---

## §4 THE TESTING-SUITE CONTRACT (properly written)

Every suite from here on:
1. **ADVERSARIAL FIRST** — the attack/incident cases run BEFORE the happy path.
2. **POSITIVE + NEGATIVE halves** — each enforcement fires its SPECIFIC token on the attack AND
   stays silent on the legit path. A generic gate preempting a specific one = UNOBSERVED.
3. **The artifact is the subject** — at least one suite mounts the DEPLOYED bundle.
4. **Every token bound to a tool result** — `exit N`, a verbatim output, an artifact path.
5. **The negative control** — every predicate is proven to FAIL when its condition is violated.
6. **Diversity assertions** — the ledger tests assert COUNT(DISTINCT ...) >= 4, not COUNT(*) >= 1.

---

## §5 THE WAVE PLAN (`WAVES: 4`)

| wave | files | deliverable | gate | test ids |
|---|---|---|---|---|
| W1 the honest register | scripts/goal-verify.ts, scripts/consumption-audit.ts | FR-1 fixed: no self-contradicting stdout; the honest number at face value | `test_goal_predicate_honest_text` + `test_goal_predicate` (both green) |
| W2 the diverse ledger | tests/st-runtime-diversity.test.ts (NEW), src/omp/*.ts (only if a detector blocks) | FR-2 fixed: >=4 DISTINCT verdicts in fire-decisions.db, each from a REAL varied act | `test_ledger_diversity_four_verdicts` + the 4 act tests |
| W3 the whole-tree audit | artifacts/ (the new audit JSONs) | FR-3+FR-4: a fresh audit over ALL 112 files; each of the 10 findings fixed or proven | `AUDIT GATE: PASS` on the whole tree; `test_audit_whole_tree_coverage` |
| W4 the container ceiling | scripts/container-substrate-payload.sh, .trident/plan-6l2e/phaseE-kev.json | FR-5: both substrates attempted; what starts, starts; what cannot is BLOCKED | `test_container_register_reads_eight_of_eight` or the named BLOCKED |

---

## §6 THE VERIFICATION (the exit battery, all mechanical)

```
bunx tsc --noEmit                                          -> exit 0
bun run test                                               -> 0 fail, exit 0
bun scripts/goal-verify.ts . evidence                      -> 5/5 exit 0 AND no line
                                                             contradicts another
bun scripts/consumption-audit.ts . evidence                -> the honest 7/8 at face value
sqlite3 ... 'SELECT COUNT(DISTINCT rule_id||band||action) FROM fire_decisions' -> >= 4
the whole-tree audit                                       -> 0 critical / 0 high
```
