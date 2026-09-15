# FAILURE_LOG — GI-OMP triple-system wave

Append-only derailment ledger. Operator verdicts verbatim. Every entry: what happened → found → root cause → impact → disposition.

### F-01 — Operator rejection: graphify theatrical, no legit working example (2026-09-15)

- **What happened:** Operator verdict, verbatim: "graphify is theatrical bullshit you have not shown me even 1 legit working example of graphify" — plus the redirect: "WIRE THIS CORRECTLY. FIX GRAPHIFY + CORBELL + BUG HUNTER - MAKE SURE IT ALL FUCKNG WORKS PROPERLY. WIRE IN RIPEWIRE AS WELL SO WE HAVE 3 WORKING GRAPH INTELLIGENCE SYSTEMS" and "TELL ME THE FUCKING GAPS, WHY THEY STILL EXIST, DOCUMENT ALL FAILRUE IN THE SHIP DOCS PER THE SKILL".
- **Found:** In-turn, 2026-09-15, by the operator reading the prior wave's claims. Mechanically confirmed same turn: `src/omp/extension.ts:215` stub text + TUI result `GI_AUDIT_NOT_WIRED`; zero graphify references in `src/hunter/`, `src/omp/`.
- **Root cause:** The prior wave's Phase E gate (ct-results-port.json PASS) asserted the stub's refuse-token as the P12 pass criterion — green-by-construction; the fork's real graphify stack (graphify.ts 160L MCP client, graph-mapper.ts 318L CLI extractor, corbell-bridge.ts 111L ontology remap, pipeline.ts 168L orchestration, 10 __tests__ files) was never ported; no port-form decision was ever written (verbatim port vs local-scan adapter vs CLI ingest).
- **Impact:** The "3 graph intelligence systems" claim had 1.5 systems: corbell substrate (real), bug hunter (real), graphify (stub). The ct-results-port.json PASS misrepresents capability coverage — its P12 row is the evidence.
- **Disposition:** OPEN — corrective wave in flight (this turn): upstream graphifyy CLI probed working on a fixture (`extract` → 5 nodes/5 edges, EXIT=0; `query`/`path`/`explain`/`god-nodes` all answered), fork graphify inventory captured by CheckpointAudit scout, ship docs being created per the operator's order, wiring decision pending the gap synthesis.

### F-02 — Operator rejection: ripwire delegation claim unproven, "where does ripwire come in" unanswered (2026-09-15)

- **What happened:** Operator verdict, verbatim: '"Ripwire delegation: no ripwire edit-check module exists in this tree" - what is this. bro INSTALL THIS INTO THE CONTAINER IMAGE. TEST IT PROPERLY. BASIC LOGIC.' and 'YOU STILL HAVE NOT ANSWERED HOW/WHERE/WHEN/WHY RIPWIRE VS MY CUSTOM GRAPH TOOLS'.
- **Found:** In-turn, 2026-09-15, by the operator reading prior answers (two prior turns gave prose answers without a division-of-labor spec).
- **Root cause:** Two defects: (1) the "no ripwire edit-check module" comment was written as if the delegation target were an in-tree module, when the real edit-check is a ripwire CLI FLAG (`--edit-check=SYM`) — the bridge consults were later built correctly (`--edit-check`/`--callers`/`--safe-delete`/`--verify`), but the framing was never corrected in a single place; (2) ripwire-vs-custom-tools was never written down as a routing spec — the answer lived in chat threads, so it evaporated between sessions.
- **Impact:** Operator re-asked the same architecture question twice; trust cost. The TUI evidence did eventually show the delegation working (gate tail `(store-derived + ripwire edit-check: 6 live callers…)`), but undocumented wiring is unwired wiring.
- **Disposition:** FIXED+PROVEN — this turn: ripwire baked into omp-ct:master image + PATH fix, doctor row verified, delegation constants captured from README table below; residual (OPEN): the routing spec still lives only in chat — must land in docs/ before the wave closes.

### F-03 — Subagent dispatch thin-prompt failure (2026-09-15)

- **What happened:** First `task()` dispatch with a 4-scout batch payload hit the tool output limit and was refused (`stop_reason: length … truncated and unsafe to run`); the wave had to be re-dispatched as two smaller batches (2+2).
- **Found:** In-turn, 2026-09-15, immediate tool error.
- **Root cause:** Operator's own standing discipline (dispatch prompts are DPL1-grade: 150+ lines) collides with the tool-call output ceiling when batching 4 full prompts in one call — the payload was truncated mid-arguments.
- **Impact:** One wasted dispatch round; all 4 scouts eventually spawned and completed (ForkGraphAudit 2m58s, CheckpointAudit 59.5s, SubstrateAudit, UpstreamAudit — all status completed).
- **Disposition:** FIXED (process) — batch at most 2 full scout prompts per `task()` call; lesson logged: full prompts cost ceiling, not model effort.

### F-04 — Ship-docs gate S1 line-floor FAILED on fresh logs (2026-09-15)

- **What happened:** Post-rollup gate: DEBUG_LOG 43, FAILURE_LOG 27, SPEC_VIOLATION_LOG 11 lines — all under the 50-line S1 floor. BUILD_REPORT 128 and TESTING_LOG 91 pass.
- **Found:** Mechanical gate run, same turn as doc creation.
- **Root cause:** Fresh logs (created this wave) vs a floor written for mature logs. Entry substance is real (5+3+6 entries, all anchored); the floor measures bulk.
- **Impact:** Gate verdict FAILED-on-floor. No padding applied (density law wins over the line floor). Documented in DEBUG_LOG EN-006.
- **Disposition:** OPEN (process) — proposal: gate on entries+evidence for young logs. No operator action needed; resolves as waves append.

### F-05 — Phantom module import shipped in the graphify populate switch (2026-09-15)

- **What happened:** GraphifyLock's transferred-hunk return wired `src/omp/populate.ts:9` to `import { GraphifyAdapter, graphifyOutPathForPopulate, isGraphifyFreshForPopulate, mapGraphifyRowsForPopulate } from "./populate-graphify-bridge.ts"` — a module that DOES NOT EXIST (no such path in `src/omp/`). Solo-file battery runs passed (populate.ts never loads there); the FULL 18-file battery failed 8/8 errors anchored at this import (`Cannot find module './populate-graphify-bridge.ts'`).
- **Found:** Same turn, by the orchestrator running the FULL 18-file battery instead of trusting the lock's 15-file claim — solo-green plus full-red is the signature of a load-time break in a shared module.
- **Root cause:** The lock composed the switch against a planned bridge surface instead of the REAL exports (`graphify-adapter.ts`: GraphifyAdapter/mapGraphifyToTyped; `populate-graphify.ts`: graphifyOutPath/isGraphifyCheckoutFreshFor). No dep-point compile boundary was run before the return (the wave BOUNDARIES rule existed in the dispatch but was not enforced by the lock).
- **Impact:** One wasted verify round plus one explicit-transfer round-trip. Zero TUI impact (dists were never rebuilt on the broken tree).
- **Disposition:** FIXED — GraphifyLock closed both hunks against the real surface under explicit transfer (import now `../hunter/graph/graphify-adapter.ts` plus `./populate-graphify.ts` only); FULL 18-file battery re-verified by the orchestrator (`107 pass / 0 fail / 962 expect()`) before any dist rebuild.

### F-06 — Tool-surface gap: graph-query could not reach the graphify leg (2026-09-15)

- **What happened:** After all four locks landed green (host battery `107/0/962`), the TUI probe `graph-query who-calls alpha() targetPath=/tmp/fx383g` returned `substrate=corbell rows=0` on a graphify-warm root (graph.json 5n/5e present). The populate switch (`populate.ts:51-58`, `opts.substrate === 'graphify'`) was unreachable: `graph-query` params (`extension.ts:69-78`) had NO substrate/targetPath fields and the reconcile block (`:100-110`) was corbell-only.
- **Found:** Same turn, by TUI measurement (not by any host battery — every ST passes explicit paths and never drives the tool boundary). Host batteries are blind to tool-surface wiring by construction.
- **Root cause:** The DPL1 spec scoped item 4 ("populate.ts substrate switch") to the populate module, but no spec item owned the TOOL PARAM surface that must pass the substrate choice down. The locks built a leg nobody could invoke — a seam-ownership gap between substrate wave (W1) and surface wave (W4 verbs, built earlier against corbell-only reconcile).
- **Impact:** The graphify leg was real but inert from the TUI until wired. Zero data corruption (fallback correctly reported corbell-miss, never a silent substitute).
- **Disposition:** FIXED — explicit follow-up transfer to GraphifyLock (extension.ts graph-query hunk ONLY, audit-bind untouched): params gain substrate/targetPath, graphify branch checks freshness then calls `populateSessionStore(...,{substrate:'graphify'})`, MISS returns GRAPHIFY_NOT_WARM/GRAPH_EMPTY plus the rebuild remedy. TUI re-proof: `substrate=graphify rows=2 beta.ts:1 beta():2` on the same root.

### F-07 — Ship-package Phase A gate FAILED on first run (S1 + S5) (2026-09-15)

- **What happened:** `update-ship-docs` gate S1–S6 run this turn for the ship package: FAILED — S1 `SPEC_VIOLATION_LOG.md` 16 lines (<50); S5 BUILD tail `b19c166e…` ≠ TRUE GI `cf464e58…`.
- **Found:** Mechanical gate run, same turn (Phase A STEP 5, before any assembly).
- **Root cause:** Thin single-line-row log vs bulk floor (EN-010/EN-006 class) + dual-artifact SHA ordering vs tail-read gate.
- **Impact:** Phase A blocked per order-is-law; zero assembly until green. No package, no checkpoint, no boilerplate until the re-run passes.
- **Disposition:** FIXED — V-10/V-11 + evidence annex (real outputs) bring SPEC to 50+; ship-package BUILD entry closes on the GI SHA; manifest refreshed. Re-run evidence in TESTING_LOG ship-package result entry.

### F-08 — Audit tool misnamed graph-code-audit for an aether engine (2026-09-15)

- **What happened:** Operator verdict, verbatim: "the code audit tool should be named aether-code-audit ~ you ported in the 4 meta layer gated aether code audit tool right? name this properly."
- **Found:** Same turn — fork filenames (`aether-auditor.ts`, `aether-meta.ts`, `pipeline.ts` → `AetherHydraPipeline`) vs our registration (`graph-code-audit`).
- **Root cause:** W2-era name coined for a stub, never re-checked against fork provenance at bind time. Plus an honest scope correction owed: the port is ONE settled template run + tested-but-unbound pipeline — NOT the full 4-gate LLM meta fan-out (no LLM transport in OMP by D2 law).
- **Impact:** Name/provenance mismatch; no behavior impact (same execute). Risk if uncorrected: the next agent hunts a "graph audit" file that does not exist.
- **Disposition:** FIXED — renamed with backwards alias (same execute), both dists rebuilt + TUI-proven on both names. Scope stated honestly in DEBUG EN-011 + the tool map below.

### F-09 — Go pool at 5 with no last rung + proxy §6 half unwired to a chain (2026-09-15)

- **What happened:** Operator order: 6th Go key + openrouter-only fallback on original mechanics + proxy-record hardening so aether embedded agents don't stall.
- **Found:** Mapping turn — pool file 5 keys (go-1..3 dead-windowed), `classifyGoError` present but no `decide/route/snapshot` chain half, zero Go LLM call sites in GI (nothing to stall at the transport layer — the stall risk is pool-exhaustion with no rung to fall to).
- **Root cause:** Depth + missing last rung (see EN-012). Proxy itself healthy (ACTIVE, healthz green, single listener) — no proxy change needed; the §6 contract needed its chain counterpart in-tree.
- **Impact:** Pre-fix, all-Go-dead = loud dead end with no fallback. Post-fix, degrades to laguna s2.1 free.
- **Disposition:** FIXED — key provisioned (5→6, 0600), §FALLBACK wired, `8/0/24` battery green, full `119/0/1004` green, both dists rebuilt.

### F-10 — Rescope move broke battery until node_modules linked (2026-09-15)

- **What happened:** First battery from the NEW root: `102/8 + 3 errors` — `Cannot find package 'xstate'` (vendor excluded from the move by design).
- **Found:** Same turn, full 19-file enumeration (solo-green would have hidden it — F-05 class).
- **Root cause:** Correct exclusion (never ship vendor) meets a root without installed deps; the new repo has no `bun install` history yet.
- **Impact:** One red run, zero source impact.
- **Disposition:** FIXED — temporary symlink to OMP node_modules for the verification run (`119/0/1004` green), symlink REMOVED after; fresh clones run `bun install` from bun.lock. Recorded so the next migration doesn't re-litigate it.

### F-11 — Qwen gate returns 2 critical + 21 high on the ship wave (2026-09-15)

- **What happened:** `ocr scan` (5 wave files, JSON) → 45 findings (critical 2, high 21, medium 21, low 1), session `1aca90d4`.
- **Found:** Same turn, severity recount from the session JSONL (never the prose summary).
- **Root cause:** Mixed bag — 1 critical REFUTED by callee read (wipe gate lives in gi-registry.ts:111 + 2 battery pins), 1 critical + most highs are REAL debt (txn ordering, rollback absence, sessionId trust, targetPath allowlist, populate-on-read locking, empty-pool wording, grace-law masking, session-pin docs, singleton thrash, BFS quadratic, stringify-200, line-regex, id-normalize, line-0 masking, edge-line default).
- **Impact:** Ship-ready claim BLOCKED per gate law until triaged; no silent pass.
- **Disposition:** TRIAGED (table in TESTING_LOG) — gate verdict FAIL pending V-16/V-17 fixes or accepted-debt sign-off. No fixes applied inside the gate run (read-only law).
