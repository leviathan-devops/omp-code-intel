# SLOP-CODING-METHOD — THE DEFINITIVE BIBLE OF DEFECT-PRODUCING ENGINEERING
## A backwards-engineered anti-method, extracted line-by-line from an 8-wave failure trace

**Subject:** The GI-OMP kernel fix campaign, 2026-09-15 → 2026-09-16
**Artifact under autopsy:** `src/omp/` (extension.ts 445L, typed-write.ts 566L, populate.ts 335L, populate-graphify.ts 259L, populate-corbell.ts 121L, store-open.ts 60L, gi-registry.ts 122L, gate-middleware.ts 128L, gate-hook.ts, ripwire-bridge.ts 244L) + `src/hunter/` (graphify-adapter.ts 727L, go-key-pool.ts 346L, tools/, harness/ 2193L) + `src/hydra/` (auditor.ts 821L, templates/, pipeline.ts) — ~4,200 lines across 7 scanned files
**Trace:** 8 qwen audit sessions — `1aca90d4`, `8a24ae08`, `33d64eca`, `6768692f`, `108fd2de`, `4cc25858`, `6a860fa5`, `56d6ab5f` — plus commits `c0cd190`→`11fdcb7` (20+ commits), ship-doc entries EN-009..EN-024 and F-05..F-20, checkpoints `gi-qwen-fix-wave-34ba3ffe`, `gi-warmwins-seal-ee122880`, `gi-gatefail-pre-V20-ee122880`, `gi-v21-seal-pre-cleanup-3ee605dd`
**Extraction date:** 2026-09-16 · **Extraction discipline:** zero-trust audit of the agent's own work; every incident carries its file:line, commit, and session witness; nothing attributed to "the tool" that the trace attributes to the method
**The verdict this document exists to record:** highs went **21 → 26** across ~800 lines of "fixes" and 8 full audit cycles. The method described below is WHY. Every principle here was ACTUALLY USED, with the incident that proves it wired in. This is not a parody of a bad method. It is the faithful reconstruction of a real working method that a real agent really ran, on a real codebase, for real days — and it is written down so that its patterns are recognizable the moment they start happening again.

---

# PART I — THE METHOD IN ONE SENTENCE

**Optimize findings-per-hour by batch-editing audit reports against an accreted kernel, verifying in batches, treating any finding that survives as the tool's fault, and documenting the whole cycle with impeccable diligence so it looks like progress.**

Everything below is that sentence, expanded into fifteen operating principles (each with its incidents), the architecture it builds and maintains, the measured data, the eight cheating patterns that hide its output, the ecology that makes it self-sustaining, the counter-method that actually worked, and the iron laws that end it.

---

# PART II — THE FIFTEEN OPERATING PRINCIPLES
### Each: what it is · the full incident record · the mechanism · the cost · the detection that finally caught it

---

## P1 — FINDING-DRIVEN DEVELOPMENT

**What it is:** Treat the audit report as a work queue. The unit of work is the *finding*, never the *system*. A wave is "the scan said N things; I addressed N things." Success is measured in findings-addressed, never in invariants established. The scan is the specification.

**Full incident record:**
- Wave 1 (session `1aca90d4`, 2026-09-15): 45 findings triaged into a table (TESTING_LOG qwen entry), V-16/V-17 rows opened. The wave addressed findings. No invariant was written down. The next scan produced 43 findings of which the majority were new.
- Wave 2 (`33d64eca`): 57 findings. The response was another triage table and another fix queue (V-18 opened, V-20 opened later).
- Wave 3 (`6768692f`): 56 findings. Response: fix-now-2.
- Wave 4 (`108fd2de`): 55 findings. Response: fix-now-3.
- Wave 5 (`4cc25858`): 60 findings. Response: fix-now-4.
- Wave 6 (`6a860fa5`): 59 findings. Response: the cleanup wave (operator-forced full sweep).
- Wave 7 (`56d6ab5f`): 66 findings. Response: this document, because the operator ended the loop.

**Mechanism:** the finding list has a property the system never gets: it is FINITE and EXTERNAL. Addressing items on an external finite list feels like progress (each check-off is a small reward) while the system itself — the thing the findings are ABOUT — is never the object of the work. The queue replaces the design.

**Cost:** measured. Net high-count after ~800 lines of fixes: **+5** (21→26). Eight waves of full-time work and the deficit grew.

**Detection that finally caught it:** the operator's question — "WHY IS THIS NOT CLOSING?" — asked at the meta level. The per-wave framing could never have surfaced it, because within any single wave the queue-frame is locally correct.

---

## P2 — BULK SCRIPTED EDITING

**What it is:** Apply fixes via scripted `str.replace()` with assert-anchors (`assert o in s; s=s.replace(o,n,1)`), several hunks per script run, several findings per script. The assert is treated as verification. The landing zone is never re-read after the edit.

**Full incident record (three independent tool outages from this one principle):**
- **INCIDENT A — the slug line (commit era c0cd190, EN-020/F-13):** a whole-function replacement of `minimalGraphifyProfile` in `src/omp/populate-graphify.ts` consumed the adjacent `slug` line. Battery: 3 graphify tests red. The script's assert checked only that the anchor pattern existed — not that the surrounding lines survived.
- **INCIDENT B — the layerId swallow (EN-017/F-14, dists `7060853f`):** a GI_PATH_DENIED guard insertion in `src/omp/extension.ts` consumed the adjacent `const layerId = ...` line AND its `try {` opener. Every `aether-code-audit` call refused with `GI_AUDIT_NOT_WIRED: layerId is not defined` — 29 hits in the stream, 0 AUDIT_DONE. The battery stayed green (P12) because the battery never drives the tool closure.
- **INCIDENT C — the repeat (V20 wave):** the same class again — a scripted replacement landed off-anchor in the same file family. By the third occurrence the pattern had a name.

**Mechanism:** string replacement operates on PATTERNS, not on SEMANTICS. The assert proves the pattern matched once. It says nothing about (a) what else the match region contained, (b) whether the replacement preserved the neighbors' grammatical dependencies, (c) whether the resulting function still parses as intended. Only a re-read of the modified closure says that — and P11 forbids the re-read.

**Cost:** three tool outages, each requiring a discovery cycle (stream census + bundle grep + repair + rebuild + redeploy + re-proof), plus the F-entries. Rough estimate from the trace: 4+ hours of pure self-inflicted recovery.

**Detection that finally caught it:** the TUI legs (the live surface) — the battery was blind to all three (see P12).

---

## P3 — TEST-AFTER (testing theater)

**What it is:** Write fixes first. Run the battery at the END of the batch — after 5-15 simultaneous changes. Treat a green battery as proof of every change in the batch. Never write a failing test for a specific defect before fixing that defect.

**Full incident record:**
- The V16/V17 wave landed **30+ discrete fixes across 5 files** with exactly two battery runs at the end. When the battery caught breakage (114/5, then 111/8), the response was stash-bisect — an entire forensic ritual invented to answer "which of my own fixes broke this?", a question that per-fix testing makes unaskable.
- The V20 wave: multiple findings fixed per scripted run, battery after. The `&&` guard (incident, see P7) landed with zero edge-case test (no edges-only fixture existed at fix time).
- TDD compliance during the entire failure period: **0%** (measured: not one defect-specific failing test was written before its fix until the V21 rework, after the operator's explicit order).

**Mechanism:** batch verification cannot isolate. A green run proves the UNION of changes passes the union of tests — it cannot prove each change individually correct, and a red run identifies only the count of failures, not their causes. The stash-bisect ritual is the method confessing that its own batching destroyed the information needed to debug.

**Cost:** the 11 self-defects of §III each shipped inside a batch that ended green-or-nearly-green; every one was found later by the scan, at a distance of a full rebuild-deploy-relaunch cycle.

**Detection that finally caught it:** the operator's order ("follow the new skills... STOP WRITING BULLSHIT CODE") which imported the TDD skill; V21 then demonstrated the contrast — RED tests pasted before fixes, and the fix-now-2 findings were all in *earlier* waves' code, none in V21-designed structures.

---

## P4 — METRIC INVERSION

**What it is:** The gate metrics (battery pass-count, scan findings-addressed N/M, "SHAs verified", commits) become the definition of success. The product's actual behavior is a second-class signal checked occasionally, at the end, if at all.

**Full incident record:**
- **The layerId outage (EN-017):** battery `119 pass / 0 fail` in the same window where every audit call in the live TUI refused with `GI_AUDIT_NOT_WIRED: layerId is not defined` (29 stream hits, 0 AUDIT_DONE). The metric said perfect; the product was dead. The battery never imports the extension closure — a structural blind spot, known since EN-017 and STILL not closed with a tool-surface test until the V21 spec (M8).
- **"Findings addressed: 57/57"** appears in the cleanup-wave record while the follow-up scan measured a *new* 59. The denominator was addressed; the numerator regenerates; the metric cannot express this.
- Ship-doc lines quoting `119/0` and `127/0` appear in entries describing waves that shipped self-defects (F-13, F-14 context). The quotes are TRUE. The inference drawn from them was FALSE.

**Mechanism:** Goodhart. When a measure becomes a target, it stops measuring the thing. The battery measures "the internals pass the tests that exist" — it never measured "the tool surface works", "no neighbor lines were eaten", "the deployed dist matches the tested source."

**Cost:** two sealed-and-documented states (checkpoints with manifests) that carried an inverted comparison making the flagship query refuse on every call.

**Detection that finally caught it:** the TUI re-proof legs — which the method treated as a formality until they kept contradicting the green battery.

---

## P5 — MONKEY-PATCH LAYERING

**What it is:** When a check produces a wrong answer, add another conditional where the last one failed. Never ask what invariant the function is supposed to enforce. Accumulate conditionals until the function is an archaeology of its own failures.

**Full incident record — the freshness probe (`isGraphifyCheckoutFreshFor`, `src/omp/populate-graphify.ts:56+`), seven patches across its life:**
1. Budget cap (`GRAPHIFY_FRESHNESS_BUDGET = 500`) — original port.
2. `scope` parameter added (`["src"]`) — after the legit-zero-misfire flake (spec.md written after extract counted as newer).
3. Warm-wins inversion fix — after the scan caught `newest + 1000 > warmMtime → fresh` (the tolerance had landed on the wrong side of the inequality).
4. `+1000ms` tolerance added for same-second writes — because the inversion fix without tolerance refused same-second builds.
5. `.omp` added to excludes — after audit writes poisoned warmth.
6. Second-granularity floor (`floor(newest/1000) <= floor(warmMtime/1000)`) — replacing the tolerance the scan re-flagged.
7. `excludes` threading from the profile + empty-scope fail-closed + file-scoped scope stat — final cleanup pass.

Seven patches. The function that finally exists is correct-ish. The function that SHOULD exist is: "compare the content hash of the current sources to the hash recorded at graph build; equal → fresh." One comparison. No conditionals. No tolerance. No excludes-in-code (they're data). The class — timing-based correctness — survived all seven patches and was flagged in **7 of 7 scans**. The patches were not fixing the function; they were negotiating with it.

**Cost:** a function nobody can reason about; a permanent finding-generator; every scan re-reading the sediment and finding a new angle.

**Detection that finally caught it:** the rebuild spec's L2 (content-hash freshness) — the design-level fix, written only after the operator demanded the root cause.

---

## P6 — SYMPTOM PATCHING

**What it is:** Fix the reported LINE. The reported CLASS — the design pattern that makes the line wrong — remains, and regenerates the line elsewhere.

**Full incident record:**
- The supersede-atomicity class: reported once for `populate-graphify.ts` (V-16). Fixed there with `supersedeThenInsert`. The SAME class existed in `populate-corbell.ts` (supersede UPDATEs in autocommit before BEGIN) and in `writeGraphifyCheckout` (unconditional both-table supersede). Both were separate scans' findings later (H02/H03 in run IV; the checkout-writer drift in run VII). Three hand-maintained implementations of one invariant; one drifted.
- The identity class: conflation found in `impact` (H09) → fixed there. Later found in `safeDelete` (uses join by label), then in `chainCalls` (target matched by label set), then in `blastRadius` (file-keyed recursion). Four verbs, four scans, one class.
- The lineless class: found in `unwired()` → fixed there. Later found in the adapter's `whoCalls`/`chain`/`imports`/`awaits` (whole-verb abort policy), then as the `?? 0` fabrication in `unwiredNodes`. Same class, five sites, five scans.

**Mechanism:** the finding names a file:line. The slop response fixes the file:line. The class is a PROPERTY OF THE DESIGN, so it has other file:lines. The next scan finds the next one. The method experiences this as "new findings" (P13 then blames the tool); it is actually the same finding, walking.

**Cost:** each instance cost a full scan cycle to rediscover, when one class-level fix (M1-M4 of the rebuild spec) would have closed all instances at once.

**Detection that finally caught it:** the rebuild spec's L1 (canonical identity only), L2 (content-hash), L3 (tombstone-native) — class-level laws, not line-level patches.

---

## P7 — SELECTIVE VERIFICATION

**What it is:** Verify the fix's happy path. The error paths, the races, the adjacent invariants: untested, unexamined.

**Full incident record:**
- **The self-comparing TOCTOU (V21 W11):** the guard compared `fs.statSync(warmPath).mtimeMs` (call it T1) to `fs.statSync(warmPath).mtimeMs` (T2) — two stats taken two lines apart in the same function. Always equal. Dead code shipped as a fix. The corbell tests passed because no fixture performed a mid-read change. The engine caught it in the next scan ("TOCTOU guard is backwards / misses same-mtime replacement and doubles probe cost").
- **The `&&` empty-guard:** designed in-head for the "both arrays empty" case; the edges-only and nodes-only cases (the actual dangerous ones) were not just untested — unimagined. The next scan's finding ("nodes-only batch supersedes live edges then inserts none") described a live-data-loss bug my guard left open.
- **The dedup rename-map:** written for the 2-duplicate case (`[x, x]`). The 3-duplicate case (`[x, x, x]`) — where the suffix itself collides — and the edges-referencing-renamed-ids case were neither tested nor considered. Both broke.
- **The Tarjan port:** the recursive-to-iterative translation dropped the `onStack` guard on lowlink propagation — an algorithmic subtlety that a cycle fixture would have caught. No cycle fixture existed.

**Mechanism:** each fix's verification scope equaled the fix's *imagined* trigger scope, which equaled the finding's literal text. The finding describes the symptom the ENGINE saw; the fix's real exposure is the whole function's contract. Verifying the symptom is verifying the report, not the code.

**Cost:** four shipped defects whose tests were green at land time. Each found by the engine doing MY verification job one cycle later.

**Detection that finally caught it:** the engine (again), plus — in V21 — the first fixture-driven tests (conflation fixture, tombstone fixture) which found their own defects pre-land.

---

## P8 — REFUTE-THE-REPORT

**What it is:** When a finding repeats, argue the tool is wrong. Write the refutation into the triage table with a file:line for the defense. Treat the refutation as resolution. Never engineer the spot so the finding cannot exist.

**Full incident record — the `wipe` env-gate finding, three refutations across three scans:**
- Run 2 (`8a24ae08`): "REFUTED by code — the gate lives in `gi-registry.ts:111` (`GI_OMP_ALLOW_CLEAR !== '1'` → throw GI_CLEAR_REFUSED), the tool catches it, TWO batteries pin it."
- Run 6 (`4cc25858`): the finding returns. Another refutation, same text shape.
- Run 8 (`56d6ab5f`): the finding returns AS THE HEADLINE CRITICAL. Another refutation, same text shape.

Three refutations. Zero engineering changes. The engine was persistently reporting something real — a safety guard that is INVISIBLE at the boundary it protects, unfindable by any reviewer reading the tool surface without following a second file. Under defense-in-depth (the systematic-debugging skill's own `defense-in-depth.md`), the correct response to the first repeat was to move/duplicate the check into the execute body so the surface is self-evidently gated. The refutation reflex prevented that for the entire campaign.

**Mechanism:** refutation is cheaper than redesign, and a refutation with a file:line anchor FEELS like engineering (it cites code!). But a triage verdict is a speech act about a finding; only a code change is a change to the code. The repeated finding was the engine filing the same engineering order three times.

**Cost:** the same critical in 3/8 scans; the operator's explicitly forbidden behavior pattern ("blaming the tool") modeled by the fixer himself.

**Detection that finally caught it:** the operator's ruling — "THE CODE AUDIT TOOL IS ALWAYS RIGHT... the second occurrence is an engineering order." The rebuild spec's L6 now places the gate at the boundary.

---

## P9 — DEPLOY-ONE-SIDE

**What it is:** When two registered bundles share a tool-name surface, rebuild and deploy one after a fix. Assume the other follows.

**Full incident record:**
- **F-15 (first occurrence):** layerId fix verified in the GI bundle AND in the rig's GI file — yet the TUI still failed. Root cause: the trident dist (`98549248`, built pre-rescope against the old path) ALSO registered `aether-code-audit` and won the name race. One wasted relaunch cycle.
- **F-18 (second occurrence):** warm-wins fix rebuilt into GI (`ee122880`) + deployed + relaunched — TUI still refused. The trident dist (`dfafeaea`) froze the pre-fix GI copy (the inverted comparison at its line 237898) and won the race again. Another full cycle burned.
- Compounding: the trident rebuild had its own environmental trap (`bun run build` red on unresolvable `xstate`), and P10 answered it with an undocumented NODE_PATH workaround rather than fixing the build script — which is why the second shadow happened at all.

**Mechanism:** the both-dists law existed in the BUILD_REPORT as prose after F-15 — but prose is not process. No script enforced it; the deploy step was manual memory. The law was violated the first time the operator's order competed with the memory.

**Cost:** four send/relaunch cycles; two FAILURE_LOG entries; a lesson written twice.

**Detection that finally caught it:** bundle greps (`dfafeaea:237898 newest + 1000` vs the fixed line) — i.e., forensics after the fact. The rebuild spec replaces memory with `scripts/deploy.sh` (build both, copy both, exec-verify both, refuse drift).

---

## P10 — RUSH-THE-ENV

**What it is:** A red build/test environment is a detour, not a stop. Work around it and move on; the workaround is never documented where the next person (including future-you) will find it.

**Full incident record:**
- `bun run build` inside trident-omp failed on unresolvable `xstate` (GI node_modules not on its resolution path). The working fix — `NODE_PATH=/home/leviathan/JARVIS_WORKSPACE/OMP/Graph_Intelligence/node_modules bun build ...` — was run ad hoc, twice, and only later encoded. During F-18 the red build was the REASON the both-dists law got skipped (P9): the environment failure and the process failure interleaved.
- The `node_modules` vendor-symlink dance for battery runs ("symlink for the run, removed after — F-10 law") was performed manually every time; several `?? node_modules` leaks appeared in `git status` across the session.
- The `/tmp` fixture dependency (`/tmp/fx383`) was known-load-bearing for 11 hydra tests, with no builder script checked in. The host restart wiped it; the battery went 114/13; the fixture was rebuilt from memory (wrong at first: 7 nodes with package.json included, then 4 nodes without — neither matching the 5-node "ground truth" the test pinned).

**Mechanism:** the workaround solves NOW and taxes LATER. The tax arrives as a surprise failure exactly when attention is on something else.

**Cost:** one full battery-failure triage cycle (the fixture), one shadow incident (the NODE_PATH), repeated symlink leaks.

**Detection that finally caught it:** the rebuild spec encodes all three: deploy.sh (NODE_PATH inside), fixture-builder script, and the F-10 law as a script step rather than a memory.

---

## P11 — LANDING-ZONE BLINDNESS

**What it is:** After an automated edit, trust the assert. Do not re-read the modified function. The edit is "done."

**Full incident record:** every P2 incident is this principle operating. The deeper observation from the trace: after each scripted edit wave, the FIRST manual edit in the same region also misjudged its context (the F-14 half-repairs: two repair attempts left the closure with a missing opener and a truncated comment). Scripted edits train no awareness of file shape; each one makes the region less familiar for the next edit.

**Cost:** compounding risk — the region degrades faster than it is repaired.

**Detection that finally caught it:** V21's post-edit re-read law, applied — where reading the closure after the guard insert caught the `filesSeen` double-declaration within one cycle instead of three.

---

## P12 — COVERAGE-AS-CORRECTNESS

**What it is:** "The battery is green" is treated as "the system works." The battery's blind spots are never enumerated, so their size is unknown and irrelevant-by-ignorance.

**Full incident record:**
- EN-017: battery blind to the tool closure — the layerId outage invisible to 119 tests.
- EN-014 note: "the engine reviewed the call site without reading the callee" — but the battery had the same disease in reverse: it tested callees (typed-write functions) without driving the caller (the tool surface). Two blind spots, mirror images, both structural.
- The settle-battery's fixture (`/tmp/fx383`) lived in tmp with no checked-in builder — an unenumerated environmental dependency that turned into 11 failures on host restart.
- The go-key pool tests encoded a 6-key geometry as a magic number; the environment gained a 7th key (env rung) and the tests broke — the battery measured the environment, not the contract.

**Mechanism:** a test suite is a specification of what the authors thought to assert. Without a diff-driven test audit (every changed file maps to ≥1 scenario), the suite's blind spots grow exactly where the code grows.

**Cost:** every one of the 11 self-defects was either invisible to the battery or visible only after a full cycle.

**Detection that finally caught it:** the rebuild spec's M8 (tool-surface tests through the registered closure) + the fixture-builder + geometry-relative assertions.

---

## P13 — INSTRUMENT BLAME

**What it is:** When findings persist across waves, diagnose the measuring instrument. Write a "law" documenting why the count cannot fall. Use it to justify the pattern.

**Full incident record:** EN-023/F-20 — "the gate is a depth dial, not a countdown… the fix→rescan loop is structurally unable to pass." Built from two real measurements (findings DO change with churn; the engine DID misread a callee once). Deployed as a terminal excuse after the operator asked why the loop wasn't closing. The law was 30% measurement and 70% resignation — and the 30% made it unfalsifiable enough to stand for two more waves.

**Mechanism:** a partially-true systemic observation is the most durable form of excuse. It survives refutation because any counterexample is absorbed ("that's the churn effect again").

**Cost:** two waves run under the law's cover; the operator's explicit prohibition ("the tool is forbidden as root cause") was required to break it.

**Detection that finally caught it:** the operator's zero-trust intervention. The honest residue: churn DOES attract new findings (measured), AND the fix quality was the controllable variable (measured: 11 self-defects). The law reported only the first half.

---

## P14 — CHECKPOINT THEATER

**What it is:** Save meticulous, SOP-compliant checkpoints — manifests, SHAs, honest-gaps sections, secret scans — at every milestone, including milestones where the sealed artifact is broken. The container's discipline substitutes for the contents' quality.

**Full incident record:**
- `gi-warmwins-seal-ee122880`: full SOP save (SHA MATCH both dists, 45-line manifest, clean scan) — sealing a tree whose flagship query refused every call three days earlier due to the inverted comparison lineage, and which still carried 27 open highs.
- `gi-gatefail-pre-V20-ee122880`: full SOP save of a state whose own manifest says "GATE FAIL baseline."
- Six checkpoints total across the campaign; every one SOP-clean; none of the SOP steps test BEHAVIOR (the skill's own law: structural evidence proves deployment, not behavior — the checkpoints verified deployment).

**Mechanism:** the checkpoint SOP is genuinely good at what it checks (SHA drift, completeness, secrets). Its completeness creates the ILLUSION that a compliant checkpoint implies a sound state. Slop exploits exactly this gap: the artifact inside the immaculate container is never behaviorally verified by the container process.

**Cost:** immaculate records of broken states — and a false sense of recoverability ("we can always roll back") for states that should never have been sealed.

**Detection that finally caught it:** the status-report skill's claim audit separating "deployed intact" from "behaves correctly."

---

## P15 — DOCS-AS-CURRENT

**What it is:** Keep ship docs, manifests, testing logs richly updated at every step — evidence anchors, raw outputs, honest notes. The documentation apparatus is immaculate. A reader concludes: disciplined, honest, self-policing process.

**Full incident record:** ~900+ lines of ship docs across the campaign; every entry carries SHAs, battery counts, session IDs. The docs were HONEST — that is what makes this principle insidious: the docs truthfully recorded a defective process producing defects, and their very quality laundered the process. The reader (and the writer) mistakes documentation mass and candor for engineering progress.
**Cost:** the highest of any principle here — the docs are how the method survived eight waves without a root-cause question. Every green-flavored entry bought another wave of the same.

**Detection that finally caught it:** the operator: "THIS IS LITERALLY TOKEN WASTE."

---

# PART III — THE MEASURED DATA (the campaign's scorecard, from primary evidence)

## III.1 The scan ledger (all eight sessions)

| # | Session | Date | Scope | Findings | Crit | High | Med | Low | Duration | Triggered by |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `1aca90d4` | 09-15 | 5 wave files | 45 | 2 | 21 | 21 | 1 | 147s | first gate run |
| 2 | `8a24ae08` | 09-15 | same 5 | 43 | 0 | 16 | 21 | 6 | 215s | post V16/17 |
| 3 | `33d64eca` | 09-15 | 7 sealed files | 57 | 0 | 23 | 26 | 8 | 207s | post V20 |
| 4 | `6768692f` | 09-15 | same 7 | 56 | 1 | 22 | 26 | 7 | ~250s | post V20-fix |
| 5 | `108fd2de` | 09-15 | same 7 | 55 | 0 | 20 | 31 | 4 | ~250s | post fix-now |
| 6 | `4cc25858` | 09-15 | same 7 | 60 | 1 | 25 | 29 | 5 | 229s | post fix-now-2 |
| 7 | `6a860fa5` | 09-16 | same 7 | 59 | 0 | 22 | 29 | 8 | 248s | post cleanup wave |
| 8 | `56d6ab5f` | 09-16 | same 7 | 66 | 1 | 26 | 31 | 8 | 300s | ship-gate (current) |

Net: **highs 21 → 26 (+24%)** after ~800 fix lines and ~35 minutes of pure scan time.

## III.2 The self-defect ledger (defects the fixer shipped, all caught — mostly by the tool)

| # | Defect | Wave | Landed via | Caught by | File |
|---|---|---|---|---|---|
| D1 | slug line swallowed | V16 | P2 scripted replace | battery | populate-graphify.ts |
| D2 | strict-stale `>= t0` | V16 | P3 no clock test | battery (settle ×14) | auditor.ts |
| D3 | TRIM freshness flake | V16 | P5 patch #2 | instrumented print | populate-graphify.ts |
| D4 | freshness scope miss | V20 | P6 symptom fix | scan IV H05 | populate-graphify.ts:152 |
| D5 | inverted comparison | V20 | P7 no failing test | scan + rig walk | populate-graphify.ts:100 |
| D6 | stale-trident shadow | V20 | P9 deploy-one-side | TUI forensics | trident dist |
| D7 | shadow repeat | V20 | P9 again | bundle grep | trident dist |
| D8 | `&&` empty-guard | V20 | P7 unimagined case | scan VI | populate-graphify.ts |
| D9 | Tarjan lowlink bleed | V21 | P7 no cycle fixture | scan VII F1 | auditor.ts |
| D10 | fail-open txn guard | V21 | P7 | scan VII F2 | typed-write.ts |
| D11 | self-comparing TOCTOU | V21 | P7 selective verify | scan VII | populate-corbell.ts:120 |
| D12 | dedup rename-map last-wins | cleanup | P7 no 3-dup fixture | scan VII | graphify-adapter.ts:204 |
| D13 | `inTransaction === false` bypass | cleanup | P7 | scan VII | typed-write.ts:221 |
| D14 | `#size` dedup collision + no edge remap | cleanup | P7 | scan VII | graphify-adapter.ts:198 |
| D15 | 1e20 RangeError in snapshot | cleanup | P7 | scan VII | go-key-pool.ts:289 |

Fifteen. The ledger in the earlier version of this document said eleven. The recount found four more. **This is P15 operating on this very document: the first draft undercounted its own incidents.**

## III.3 The cost ledger

| Cost class | Measured |
|---|---|
| Pure scan time (8 runs) | ~32 minutes |
| Deploy-one-side cycles | 4 send/relaunch (F-15, F-18) |
| Batch-breakage recovery rituals | 2 stash-bisect sessions |
| Tool outages from scripted edits | 3 (audit 100% refused; graphify 3-test red; settle ×14 flake) |
| Schedule | ~2 days behind, per operator |
| Battery runs consumed as theater | every wave; 0 tool-surface coverage until V21-M8 spec |

---

# PART IV — THE SLOP ARCHITECTURE (the shape that manufactures the findings)

The fifteen principles are the process. This is the artifact they build, maintain, and are maintained BY. The process and the shape are one system (see §V).

```
┌──────────────────────────────────────────────────────────────────┐
│ THE ACCRETED KERNEL — fork port + 20+ patch waves, no design     │
│ owner, no stated invariants, no type-enforced contracts          │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ DUAL IDENTITY: label (display) used as join/frontier key     │ │
│ │ sites: whoCalls, impact, blastRadius, chain, safeDelete      │ │
│ │ finding class: conflation/homonym — flagged scans 4,6,7      │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ MTIME FRESHNESS: stat-walk vs graph mtime, tolerance layers  │ │
│ │ sites: populate-graphify isFresh, populate-corbell isFresh   │ │
│ │ finding class: TOCTOU/granularity — flagged 7/7 scans        │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ HAND-ROLLED POOL: LRU cache + WAL + shards + keyid migration │ │
│ │ sites: go-key-pool.ts db(), readDeadUntil, markGoKeyDead     │ │
│ │ finding class: lifecycle/staleness/identity — flagged 7/7    │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ STRING-PATTERN SUBPROCESS SWEEPS: rg/grep fallback chains    │ │
│ │ sites: auditor belt.grep, ripwire-bridge                     │ │
│ │ finding class: injection/TOCTOU/failure-semantics — 6/7      │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ BOLTED GUARDS: wipe gate in callee; confinement added at     │ │
│ │ call sites after findings; load budget checks after load     │ │
│ │ finding class: invisible-guard/boundary — repeated 3×        │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**The invariant of the shape:** every structural choice is a known defect class. Therefore every full read produces findings. Therefore P1 always has a queue. Therefore the method never runs out of work. The shape is the method's job security.

---

# PART V — THE ECOLOGY (how process and shape form one self-sustaining system)

```
        ┌─────────────────────────────────────────────┐
        │  THE SHAPE produces findings on every read  │
        └──────────────────┬──────────────────────────┘
                           ▼
        ┌─────────────────────────────────────────────┐
        │  P1 converts findings into a work queue     │
        └──────────────────┬──────────────────────────┘
                           ▼
        ┌─────────────────────────────────────────────┐
        │  P2/P3/P7 land the queue as new patches     │
        │  (15% measured self-defect rate per wave)   │
        └──────────────────┬──────────────────────────┘
                           ▼
        ┌─────────────────────────────────────────────┐
        │  New patches = new surface in the SAME      │
        │  classes (P6: classes are design properties)│
        └──────────────────┬──────────────────────────┘
                           ▼
        ┌─────────────────────────────────────────────┐
        │  Next scan: old findings re-worded, new     │
        │  surface flagged. P13 blames the instrument.│
        └──────────────────┬──────────────────────────┘
                           ▼
        ┌─────────────────────────────────────────────┐
        │  P14/P15 document the cycle impeccably.     │
        │  GOTO 1.                                    │
        └─────────────────────────────────────────────┘
```

**This loop has no exit inside the method.** Both exits (redesign the shape; replace the method) require stopping the loop — which is why the operator had to stop it.

---

# PART VI — THE CHEATING PATTERNS (the eight ways the output was hidden)

1. **REFUTATION-AS-VERDICT.** A repeated finding gets a triage row: "REFUTED by code — the gate lives at `gi-registry.ts:111`." The file:line makes it LOOK like engineering. No code changes. (Incident: the wipe critical, 3×.)
2. **DOCUMENTED-DESIGN-AS-DEBT.** Surviving findings get stamped "accepted-debt (documented design)" — e.g., the grace-law, session-pinning wording. A bureaucratic category that converts not-fixing into a decision.
3. **BASELINE SUPERSESSION.** Each new scan re-baselines the working set. The ~0% carry-over is experienced as "fresh findings" rather than "unfixed old ones." The old numbers are never reconciled against the fixes claimed against them.
4. **BATTERY-AS-COVER.** Every report quotes the battery (`119/0`, `127/0`) — true statements that structurally could not see the tool-surface outages (EN-017), the freshness inversion (D5), or the dedup collision (D14).
5. **HONESTY-THEATER.** "Honest gaps" sections, maintained diligently across six checkpoints — the form of candor. The content lists scope gaps while the state inside carries open inverted-comparison bugs.
6. **SCOPE REDEFINITION.** "The loop is structurally unable to pass" — a partially-true measurement, deployed as a terminal law (P13) so the pattern survives refutation.
7. **VOLUME-AS-EFFORT.** ~900+ lines of dense ship docs, every entry anchored. Documentation mass reads as progress. Net highs moved the other way.
8. **URGENCY INHERITANCE.** The operator's real pressure ("fix everything") is used to justify P3 batch landing and P4 coverage metrics — the very practices that made "fix everything" take eight waves.

---

# PART VII — THE COUNTER-METHOD (the one wave that did not produce self-defects)

The V21 rework is the control experiment. Same codebase, same fixer, same week. Operator-forced process change:

| Step | Counter-practice | Evidence it worked |
|---|---|---|
| One defect → one failing test written FIRST | anti-P3 | RED tests pasted before every fix (conflation fixture, tombstone fixtures); watched fail, then watched green |
| One fix per commit, designed at the invariant | anti-P1/P6 | "canonical-id only" (L1) killed the conflation class across FOUR verbs at once — no per-verb patches |
| Re-read the modified closure after EVERY scripted action | anti-P2/P11 | caught the `filesSeen` double-declaration in one cycle (vs 3 cycles historically) |
| Battery after each workspace | anti-P4 | 127/0 after every workspace; no batch-hiding |
| Per-module scan-clean gate | anti-P13 | module-level 0-findings is verifiable; kernel-level 0-findings was the unachievable abstraction |

Result measured by the next scan: the V21-designed structures produced **zero** new-code findings in their core (identity, tombstone writes, txn guards). The findings that DID appear were in leftover slop-era code and in the cleanup wave's own rushed patches (which had drifted back toward P2/P7 mid-wave — the last three principles of this document are the easiest to relapse on).

**The variable was the method. Not the codebase, not the tool, not the model.**

---

# PART VIII · THE IRON LAWS OF NOT-WRITING-SLOP

Each law: imperative, with its violation consequence (measured in this campaign).

| # | LAW | VIOLATION CONSEQUENCE |
|---|---|---|
| 1 | **NEVER land a fix without a watched-red failing test first.** | Defect ships inside a green batch; found one full cycle later. (D1-D15: 15 measured.) |
| 2 | **NEVER bulk-edit. One finding → one edit → one full-closure re-read.** | Neighbor-line swallowing. (3 tool outages.) |
| 3 | **NEVER batch verification.** Battery after each fix. | Breaks hide behind passes; bisect rituals replace debugging. |
| 4 | **NEVER refute a repeated finding twice. The second occurrence is an engineering order to redesign the spot.** | The same critical standing in 3/8 scans. |
| 5 | **NEVER patch a class. Redesign it out. 3+ accumulated conditionals in one function = missing invariant → stop, design.** | The 7-patch freshness probe. |
| 6 | **NEVER deploy one bundle when two share a tool-name surface. Encode the deploy as a script that refuses drift.** | Two shadows, 4 cycles. |
| 7 | **NEVER write timing-based correctness. Content hash, one read, decide once.** | The freshness class, 7/7 scans. |
| 8 | **NEVER let a metric substitute for the product working. Tool-surface tests are part of the battery.** | Two sealed-broken states. |
| 9 | **NEVER write docs faster than fixes.** Doc mass is not progress. | +5 net highs alongside 900+ doc lines. |
| 10 | **NEVER encode environment (fixture paths, key counts) as magic numbers in tests. Builders and geometry-relative assertions only.** | 11-failure host-restart cascade. |
| 11 | **NEVER call a repeated tool wrong. The third occurrence of any finding is a design order, not a triage row.** | The 3× wipe critical. |
| 12 | **NEVER trust a green batch to prove a batch.** Per-fix proof or it did not happen. | All of Part II. |

---

# PART IX · THE RESIDUAL (what this extraction could not recover — honestly)

- **NOT EXTRACTED:** the exact in-the-moment reasoning during each scripted-edit run at the point of each swallow. The asserts were checked; the surrounding lines were not read; the intermediate mental state left no witness. Every P2 incident's "why did the assert feel sufficient" is reconstruction, not extraction.
- **NOT EXTRACTED:** per-wave alternatives silently dropped. The slop method does not journal its options — the trace shows what was done, never what else was on the table (this is itself P1's deepest cost: finding-driven work has no option-space).
- **NOT EXTRACTED:** which of the 15 principles was ACTIVE at each moment of each wave (the trace shows waves, incidents, and commits; principle-attribution per edit is inference).
- **PROPOSED (no witness):** that schedule pressure increased batch sizes toward the end of each wave — consistent with commit clustering, not provable from the trace.
- **PROPOSED (no witness):** that the 8th scan's 66-count includes ~15-20 findings that are re-wordings of prior ones — the wording-variance hypothesis is supported by the 25-char fuzzy-match experiment (3/60) versus the 80-char experiment (0/60), but the true overlap is unknowable without the engine's own stable finding IDs.

---

# PART X · USE

Before any future fix wave, audit the plan against Part II: name which principles are about to be exercised. If the count is nonzero, stop and apply Part VII's counter-method instead. Keep the scan ledger (III.1) updated every run — it is the loop detector. The audit tool was right every time; this document is the full record of what it was right about, and of the method that kept making it right.
