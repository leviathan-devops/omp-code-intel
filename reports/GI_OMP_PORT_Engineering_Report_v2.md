# GI-OMP PORT — ENGINEERING REPORT v2 (FULL-PORT wave: graphify substrate + hunter seam + audit face + proof)

**Series:** GI_OMP_PORT (v1 = port-wave corbell substrate + 6-phase hunter + parse-grade verbs on omp-ct:master dual-FRESH; v2 = THIS report: full-port wave graphify leg + routing contract + K20.3 determinism row + graphify CT plan + BLOCKED TUI leg)
**Project:** Graph_Intelligence OMP port (GI-OMP)
**Date:** 2026-09-15 (v2 verdict 2026-09-15T05:50:31Z; v1 verdict frozen 2026-09-14T22:44Z)
**Author:** ProofLock (docs/proof-only lock: routing doc + graphify CT plan + graphify CT artifact + this report; NO product code)
**Baseline:** fork-v143/live-tree (seal sha16 `63247bff8e2baf8f`, 249 files) + `GI_OMP_FULL_PORT_DPL1_SPEC.md` (B.2 items 1-14)
**Container:** gi-omp-port (primary) + gi-omp-port2 (dual-FRESH B) — observed alive, NOT driven (TUI leg BLOCKED) · **Image:** omp-ct:master (rig tag `3a25c2af5387`, local tag `ec7422dd1a2f`; re-verify at run time)
**Dist pinned:** `extensions/graph-intelligence/index.js` 471,921 B sha16 `eddd8d740c75b780` (v1 dists GI 89ce7270 / trident 8756baac SUPERSEDED — v1 rows below are frozen history, not current proof)

---

## V1 ROWS — FROZEN (verbatim history, never re-measured, never edited)

V1 source: `reports/GI_OMP_PORT_Engineering_Report_v1.md` (301 lines, sha256 `5a594d03302aad24192d0b2650be52313d620ff80fcd2136fa8a66581db57e0f`, verdict 2026-09-14T22:44Z). V1 legal stop: `.omp/ct-results-port.json` overallVerdict PASS (20/20 live + AD5 PASS-BY-ST). V1 numbers (frozen):

- Host battery 49 pass / 0 fail / 644 expect across 13 files; battery files 13 (1,453 lines); src/hunter 48 files / 11,686 lines; src total 64 files (45 with PORTED FROM).
- Corbell big-tree build 2086 nodes / 9386 edges, 20.2s; kinds method=1949, calls=4698; predicates traces-to=4688.
- who-calls openStore (live) rows=31; impact/safe-delete 158 reaches / 31 callers; blast/chain rows=160 d=5 / rows=1.
- Hunt (live) findingsCount=296; report artifact 453,718 B, 296 sections.
- Gate log trio cancel:true / token / null. CT artifact 20/20 live + 1 PASS-BY-ST.
- Image omp-ct:master 3a25c2af5387. Model openrouter / Laguna S 2.1 (free).
- V1 bugs fixed (frozen): trident-dist build-time-frozen duplicate GI registration (both-dists-rebuild law); scan.ts `path is not defined` + NEW st-hunter-live.ts; corbell-adapter guard/build split-brain; host corbell /tmp-editable wipe (venv + tree-sitter); container corbell at /opt/corbell-venv.
- V1 open items (frozen): P6 swaps (W8 writer / L6 trace / SRO map); K20.3 double-run (CLOSED by v2 S8 below — INCONCLUSIVE named); fallback_reason meta cosmetic.

V1 file untouched by this lock: no edit, no append, no rename. Any future correction to v1 numbers lands as a v3 erratum row, never a v1 rewrite.

---

## V2 DELTA — WHAT THIS WAVE ADDS (and what stays BLOCKED)

ADDED (this lock, docs/proof only): `docs/GRAPH_ROUTING.md` (twin table + units + floors + scope prefixes + ripwire counting law + K20.3 row); K20.3 same-checkout double-hunt proof row (host-measured, INCONCLUSIVE named — S8); `docs/ct-plan-graphify.md` (W9 dual-FRESH plan, plan-first contract for the graphify TUI leg); `.omp/ct-results-graphify.json` (STANDALONE plan+evidence placeholder: K20.3 real, TUI legs BLOCKED, zero invented tokens); this report v2.

OWNED ELSEWHERE (not this lock, recorded for the wave map): graphify adapter + populate leg + scripts/graphify-build.ts (GraphifyLock); hunter map() graphify case + LINELESS_NODE (HunterSeamLock); hydra audit face + audit bind (AuditFaceLock); LOGIC-LSP W6 seam (deferred per D4).

BLOCKED (exact missing capability): the W9 dual-FRESH TUI leg (G1-G6 + AD-G1..AD-G5) is unrunnable from this sandbox — no container-testing tool is exposed (tool inventory: read/bash/edit/eval/glob/grep/task/hub/web_search/write/yield only). `docker ps` observes gi-omp-port/gi-omp-port2 alive but cannot drive headed OMP TUI legs (setup/auth-probe/scenarios/shot/evidence capture). Recorded BLOCKED with reason in `.omp/ct-results-graphify.json` (overallVerdict BLOCKED, 6/6 + AD 5/5 BLOCKED). Unblocks when a session WITH the container-testing tool runs `docs/ct-plan-graphify.md` end-to-end (W4+W7 gates first per orchestrator).

---

## S8 K20.3 SAME-CHECKOUT DOUBLE-HUNT ROW (host-measured 2026-09-15, REAL evidence)

Method: ONE warm checkout `/tmp/gi-k203-bNVWbu` (fixture builder mirrors `tests/st-hunter-live.ts`: docs/PORT_CORPUS.md + src/a.ts + warm corbell-data/.corbell/workspace.db with 3 method nodes + 1 method_call edge + loader-validated profile.yaml gi-hunter-live, graph.rebuild=false), `spawnBugHunterLoop` x2 back-to-back (probe script, removed after run). No rebuild between hunts (D5 same-checkout default).

- HUNT1: state=done runId=gi-hunter-live-hunt-20260915-1 findingsCount=2 reportPath=/tmp/gi-k203-bNVWbu/MASTER_CONTEXT/bug_hunter_report_v1.md (3267 B, carries own runId).
- HUNT2: state=done runId=gi-hunter-live-hunt-20260915-2 findingsCount=2 reportPath=/tmp/gi-k203-bNVWbu/MASTER_CONTEXT/bug_hunter_report_v2.md (3336 B, carries own runId, supersedes v1 append-only).
- runId-identical ASSERT: FAIL — runId differs by the per-day seq counter (+1) BY RECON DESIGN (`recon.ts`:108-134 `openAndNextRunId` counts prior HUNT_DONE events; `micro-loop-machine.ts`:284-313 stub-profile path mirrors it). Verdict: INCONCLUSIVE named `K203_RUNID_SEQUENCE`, never silent. The runId contract field is a SEQUENCE, not a content hash — asserting byte-identity across two hunts on one checkout contradicts the naming law; the machine behaved exactly as built.
- Findings-determinism: PASS — ruleId|file|line sets byte-identical both runs (`wiring.no-dead-module:f0d6a738aadb|…/src/a.ts|4` + `…|3`, 2+2 rows of 4 total), findingsCount equal, batteryVersion identical (`gi-hunter-live-rules-battery-v1`, fingerprint `143886b9a8c8`), HUNT_DONE events x2 with full runId+reportPath+findingsCount payloads, evidence_quote non-empty CHECK (dead-module lines verbatim in both reports).
- Implication for S8: the DPL1 criterion as written ("two hunts, same runId contract field equal") is unsatisfiable against the seq-counter design — future S8 should assert findings-identity + batteryVersion-identity + event-count=2 (the determinism that matters), with runId-seq-+1 expected. Recorded here; spec text unchanged (append-only law).

Evidence anchors: checkout `/tmp/gi-k203-bNVWbu` (7 entries: .trident, MASTER_CONTEXT v1+v2 reports, corbell-data, docs, profile.yaml, src); shared.db findings 4 rows (2 per runId, INSERT-id order); HUNT_DONE payloads (800-char excerpts in `.omp/ct-results-graphify.json` k203Row); host hygiene `st-ripwire-bridge.ts` 9/0/59 + `st-verbs-parse.ts` 6/0/474 (same turn, hygiene only).

---

## ROUTING CONTRACT (W8 — pointer, not copy)

Full contract: `docs/GRAPH_ROUTING.md` (6619 B, 119 lines). Twin table: 9 verb legs x 7 consults (blast shares impact, would-break shares gate) + 4 delegation verbs (no twin). Units: store rows vs ripwire witness vocabulary (never mixed). Floors: counts_floor=1 per leg on the reference tree (openStore), finding floors >= (who-calls rows>=25, unwired>=100). Scope prefixes: /sessions/{sid}/ path law + GI_SCOPE_REFUSED + (scopeRoot,substrate,dist-sha) attribution triple. Counting law: independent counters, attribution-not-equality across scopes, DEAD_ENV hermetic absent legs.

---

## CT PLAN + ARTIFACT (W9 — pointer, not copy)

Plan: `docs/ct-plan-graphify.md` (7794 B, 151 lines, 2000+ chars — the plan-first contract): G1 substrate populate (substrate=graphify) / G2 who-calls rows+file:line+ripwire / G3 hunt HUNT_DONE+artifact / G4 audit findings+reportPath (NOT_WIRED=fail) / G5 all-9 twin regression / G6 dual-FRESH one-graphify isolation + AD-G1..AD-G5 (empty/binary-missing/oversized/bad-claim/empty-target). Artifact: `.omp/ct-results-graphify.json` (238 lines, JSON VALID): k203Row REAL, TUI legs BLOCKED with exact missing tool, circuitBreaker 2/10 true (containerAlive + artifactWritten + noTimeouts/noCircularPasses implied), overallVerdict BLOCKED.

---

## NUMBERS (v2 — only what this turn measured)

- Routing doc: 6619 B / 119 lines. CT plan: 7794 B / 151 lines. CT artifact: 238 lines JSON VALID, 11 scenarios all BLOCKED, k203Row embedded.
- K20.3: HUNT1 -1 findings=2 3267B / HUNT2 -2 findings=2 3336B / findings-identical PASS / runId-identical FAIL-by-design INCONCLUSIVE named.
- Host hygiene (same turn): st-ripwire-bridge 9/0/59 + st-verbs-parse 6/0/474 (corbell populate 2086/9386 each).
- Dist: 471,921 B sha16 eddd8d740c75b780. V1 frozen sha256 5a594d03… (301 lines). Image rig 3a25c2af5387 / local ec7422dd1a2f.
- Battery files observed: 14 ST files (up from v1's 13 — sibling locks active; project-wide validation is Main's job, not this lock's).

---

## FILE MANIFEST (this lock ONLY — 4 NEW files, zero edits)

- NEW `docs/GRAPH_ROUTING.md` (6619 B) — W8 routing contract.
- NEW `docs/ct-plan-graphify.md` (7794 B) — W9 plan-first contract.
- NEW `.omp/ct-results-graphify.json` (238 lines) — W9 artifact (K20.3 real + TUI BLOCKED).
- NEW `reports/GI_OMP_PORT_Engineering_Report_v2.md` (THIS file) — v1 frozen, append-only delta.
- EDITED: nothing. DELETED: nothing (.tmp-k203.ts probe removed post-run — throwaway, not a deliverable). No src/, no tests/, no v1, no sibling files touched.

---

## WHAT'S NEEDED FROM THE OPERATOR

1. W4+W7 gates (GraphifyLock/HunterSeamLock/AuditFaceLock) before any W9 TUI fire — per orchestrator dep signal; this lock stands by.
2. W9 TUI run needs a session WITH the container-testing tool: run `docs/ct-plan-graphify.md` G1-G6 + AD-G1..AD-G5 on omp-ct:master, overwrite `.omp/ct-results-graphify.json` BLOCKED rows with live tokens (keep k203Row).
3. S8 criterion revisit: assert findings-identity (not runId-identity) for double-hunts — or accept K203_RUNID_SEQUENCE INCONCLUSIVE as the standing K20.3 verdict.
4. K20.3 checkout `/tmp/gi-k203-bNVWbu` is tmpdir evidence — authorize cleanup when the wave no longer needs re-reads.
5. V1 stays frozen — corrections as v3 erratum rows only.

---

## W9 LIVE-PROOF ERRATUM (2026-09-15T07:05Z, orchestrator — supersedes the BLOCKED rows above, v1 stays frozen)

- Dists (BOTH rebuilt after all locks + wiring, exec-verified all four copies): GI `cf464e58f44979ef` (565,367 B) at `extensions/graph-intelligence/index.js`, host deploy, gi-omp-port, gi-omp-port2; trident `b19c166e16b0939b` (15.1 MB) at `~/OMP_WORKSPACE/trident-omp/dist/index.js`, host deploy, both rigs. Image omp-ct:master (rigs 3a25c2af5387, local ec7422dd1a2f). Model openrouter/Laguna S 2.1 free (status-bar both rigs).
- Battery at ship: `111 pass / 0 fail / 977 expect()` across 18 files (15 ST + 3 hydra); st-graphify-port solo `10/0/84` (6 port + 4 tool-wiring: HIT/MISS/REGRESSION/DENIED). tsc: wave files carry ONLY the pre-existing errors (extension.ts:286 attachGiGraphGate cast; populate*.ts Database-vs-{run} structural — same class as populate-corbell.ts:96-98 + store-map.ts:171-172, pre-existing, runtime-green); zero NEW error classes from this wave (new-file grep: extension/populate*/graphify-adapter/line-resolve/map/hydra only those rows).
- CT artifact `.omp/ct-results-graphify.json` overallVerdict PASS (was BLOCKED): G1 `substrate=graphify graph=/tmp/fx383g/graphify-out/graph.json nodes=5 edges=5 rows=2 beta.ts:1 beta():2`; G2 `impact_reaches=2 beta.ts@depth1 via imports`; G3 `HUNT_DONE runId=gi-study-src-hunt-20260915-2 findingsCount=296` + 453,787 B v3 artifact; G4 `AUDIT_DONE layer=R28-sro-graph findings=3 reportPath=.../R28-sro-graph-1789455224867/findings/report.md` (1305 B, 3 FINDING rows) + degraded `GRAPHIFY_NOT_WARM` named-after-attempt; G5 all verbs named rows + fail-soft ripwire legs (safe-delete callers=11 fallback-scope, chain rows=1, verify claim-refused, empty-target rows=0, prior corbell rows=31/impact=158 unchanged); G6 `PROBE_TOOL_OK` both rigs + graphify isolated to A (B: indexer-fallback/CORBELL_NOT_WARM:absent honest zero); AD-G1 `GRAPHIFY_NOT_WARM` + `GRAPH_EMPTY` guard (adapter :537-538); AD-G2 binary-absent named + fallback; AD-G3 `GRAPHIFY_GRAPH_TOO_LARGE` bytes=134217729; AD-G4 claim-refused CLOSED language; AD-G5 rows=0 no crash. Circuit breaker 10/10.
- Follow-up wiring (post-lock, orchestrator-transferred to GraphifyLock): `graph-query` params gain substrate/targetPath (`extension.ts:178-179`); graphify branch freshness-checks then `populateSessionStore(...,{substrate:'graphify'})`, MISS returns GRAPHIFY_NOT_WARM/GRAPH_EMPTY + rebuild remedy — closed the TUI-unreachable-leg gap (F-06). Audit-bind hunk untouched (269+).
- Provenance: all 14 new files carry `PORTED FROM` (>=1 each); `grep serve-spawn` over wave src = EMPTY (no MCP serve in-process); failures F-05 (phantom bridge import) + F-06 (tool-surface gap) recorded in FAILURE_LOG with fixes + re-verification.
