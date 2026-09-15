# GI-OMP PORT MASTER PROMPT — ALL CHECKPOINT MACHINERY, PORTED PROPERLY

Status: ACTIVE (pinned 2026-09-14)
Scope: /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
Source: fork-v143/live-tree (249 files, sha16 63247bff8e2baf8f) + v443-en38 + paragon-cache-autopsy-cleaned checkpoints
HONEST_CLASS: product_tui (GI-OMP plugin) · Ship proof: dual-FRESH headed OMP TUI on omp-ct:master + BR gates
DENSITY: multi_dimension (5 god-loop workflows + outer goal)

## 0. THE LAWS

- NO THEATRICAL BUILDS. Every ported subsystem is a VERBATIM port with `// PORTED FROM <tree>/<file>:<lines>` provenance. No reimplementations, no stubs sold as done, no regex substitutes where a real machine exists. Stubs allowed ONLY as loud named errors (`*_NOT_WIRED`) awaiting their port, and each must appear in this document's queue.
- THE REGEX INDEXER IS DEMOTED, NOT DELETED: `src/omp/populate.ts` becomes the NAMED FALLBACK (`CORBELL_NOT_FOUND` / `GRAPH_EMPTY` → loud warn + fallback), the parse-grade corbell substrate becomes the primary populate. The fallback must print WHY it fired.
- NO STATIC TIMEOUTS on long corbell builds (event-driven; process exit is the event).
- Every port wave: ST battery green + the port's own proof battery green BEFORE any TUI deploy. Zero regressions or revert.
- Every TUI claim: tool-result token, never prose. Host ST is hygiene; TUI is the gate.
- The ported machinery list is AUTHORITATIVE from the PortManifestAudit table (agent://PortManifestAudit). A subsystem absent from the manifest is an audit gap — patch the manifest, then port.

## 1. DIMENSIONS (god-loop workflows)

### W1 god-loop-gi-corbell — the corbell substrate, wired properly
Owns: src/hunter/profile/**, src/hunter/graph/** (corbell-adapter, interface, store-map), scripts/corbell-build.ts, tests/st-corbell-port.ts, the populate integration.
THE WIRING PLAN (verbatim, from the fix-bundle audit C C1—C14):
1. Port `src/hunter/profile/{schema,loader}.ts` (frozen zod ProjectProfile) + author `profile.yaml` for the target (substrate: 'corbell', scope: 'src', the 8 excludes).
2. Port the adapter's fix-bundle verbatim:
   - `writeWorkspaceConfig`: `version: "1"` QUOTED (CB4: int fails pydantic) · `root: ".."` · `repo: ..` (CB3 RELATIVE-ROOT LAW: config_dir IS corbell-data/, '.' resolves to corbell-data itself → files scanned: 0) · language from profile · storage block.
   - init guard + staleness detection (CB1: unconditional init REGENERATES the template on every build and clobbers; run init ONLY when absent; regenerate on root/repo divergence).
   - coupling env (CB8): CORBELL_COUPLING_MONTHS=1, CORBELL_COUPLING_MAX_COMMIT_FILES=200, CORBELL_COUPLING_MAX_COMMITS=500, CORBELL_COUPLING_SCOPE=<project-rel-to-git-root> — the vendor walk climbs to the enclosing repo otherwise (742MB store + 30min D-state stall precedent).
   - walk excludes (CB9/V-SCOPE-1): CORBELL_WALK_EXCLUDE_DIRS = profile excludes + Checkpoints,corbell-data,context_management,.trident.
   - NO static timeout on the build (CB7: "the 600s static timeout was the garbage that killed it").
   - warm-index skip when `profile.graph.rebuild === false` (CB7/HT-BUG-16: minutes-long sync scan orphaned by platform timeouts; hunts read the warm store).
   - STORE_BLOATED >512MB loud fail (CB10).
   - hunting-substance check: ZERO code nodes (method/class/function/file/rule/constant) → loud GRAPH_EMPTY (CB5: scaffolding-only graphs produced FALSE "audit clean"; the "Tree-sitter ✗ not installed" banner is this class).
   - `resolveCorbell`/`assertCorbell` with the exact CORBELL_NOT_FOUND text (CB11; pip is NOT on PyPI — git+https://github.com/Corbell-AI/Corbell.git).
   - `readCorbellStore` + node-data enrichment (CB13: numeric literals from node source into node.data — the domain.numeric-threshold findings-0 root).
3. Store mapping (store-map.ts): corbell `workspace.db` (graph_nodes id/node_type/data JSON; graph_edges source_id/target_id/kind) → OMP `typed_nodes/typed_edges` via the EXISTING batch writers (src/omp/typed-write.ts). Faithful kinds: method→'method', flow→'flow', service→'service'; method_call→predicate 'calls'; flow_step→'traces-to'; labels resolved from node data; evidence_quote real (node id/source line).
4. populate integration: `populateSessionStore` gains substrate mode — corbell FIRST; the regex indexer demoted to the loud named fallback. **The stopgap era ends here: the primary populate is the parse-grade graph.**
5. Verb adjustment: who-calls/blast/chain/unwired filters accept the corbell kinds + 'traces-to' predicate (extend the IN-lists; keep 'imports'/'calls' for fallback stores).
Gates: st-corbell-port battery green; `bun scripts/corbell-build.ts --target fork-v143/live-tree --rebuild` → counts ≈ 1949 methods / 9387 edges (precedent: 63.8s, 4698 method_call + 4688 flow_step); TUI graph-query on a corbell-populated session returns rows=.
Acceptance token: `CORBELL_SUBSTRATE_LIVE` (tool result: rows= from a corbell-built store; probe shows `substrate: corbell`).

### W2 god-loop-gi-hunter — the 6-phase machine, ported and live
Owns: src/hunter/harness/**, src/hunter/diagnostics/**, src/hunter/lexicon/**, src/hunter/tools/**, the bug-hunt tool action, tests/st-hunter-port.ts + tests/st-hunter-live.ts.
The 23-step port order (BibleBugHunter scout — agent://BugHunterBibles §2), dependency-ordered:
1 profile-schema VERBATIM · 2 profile-loader VERBATIM · 3 typed-DDL from migrations.ts VERBATIM · 4 adapter shim (types+GraphError; corbell|ix → ADAPTER_FAILED) · 5 rule-card VERBATIM · 6 templates VERBATIM · 7 compiler VERBATIM · 8 compiled-store ADAPTED (session) · 9 findings-store ADAPTED · 10 engine CORE VERBATIM + shim · 11 calibration VERBATIM (dryRun) · 12 recon VERBATIM · 13 map LEGACY-only (corbell path rides W1) · 14 scan VERBATIM · 15 trace LEGACY-only · 16 strike VERBATIM · 17 report VERBATIM + injected writer · 18 micro-loop + hunt-lock + bug-hunt entry VERBATIM (hunt runs the loop; status keeps the census) · 19 query-tool 7-verbs VERBATIM + blast/keep; semantic/docs loud UNAVAILABLE · 20 firewalls VERBATIM · 21 bus+warhead VERBATIM · 22 lsp-injector VERBATIM (session-bound) · 23 report-writer LOCAL (keep N-versioning + sections + 500-cap; replace the network call with the local markdown).
EXCLUDES (with reasons): corbell-CLI (vendor shell — W1 owns the shell), ix, embeddings, mcp/ui/docs, likec4, extraction/l6/update/verify/query-engine, semantic-predicates/cypher, auditor (graph-code-audit stays NOT_WIRED per scope).
Proof (verbatim from the bible plan): 1 md + 1 binding hunt → runId→MAP→SCAN→TRACE→STRIKE→REPORT md + HUNT_DONE; the verbs read the store; re-hunt same ids (K20.3).
Gates: st-hunter-port green; a LIVE hunt in the TUI (bug-hunt action=hunt) emits a report artifact on disk with real findings + HUNT_DONE; INCONCLUSIVE paths named.
Acceptance token: `HUNT_DONE` + report artifact path.

### W3 god-loop-gi-machines — the remaining machinery set
Owns: per the PortManifestAudit verdicts: key infrastructure (go-key-pool sqlite 5-key cycler + §12 credential-binding pin; go-session-proxy where applicable), the audit-engine subset the machine touches (graph/audit-graph whoCalls/chain/unwired surface), event bus, warhead, firewalls (readonly/artifact-scope), findings-map, run-status patterns (the EN-32/EN-36 count semantics), any diff-noticed newer copies from en38/paragon. Each port: verbatim + provenance + ST.
Gates: each subsystem's own ST; no regression to W1/W2 batteries.
Acceptance token: `MACHINES_PORTED:<n>` (the manifest's PORT rows all landed or explicitly re-queued with reasons).

### W4 god-loop-gi-verbs — parse-grade verb surface (ripwire-parity where it matters)
Owns: src/omp/typed-write.ts verb extensions + extension.ts tool surface.
- Upgrade who-calls/blast-radius/chain/unwired to read the corbell substrate faithfully (kinds/predicates from W1.5).
- Add `impact` behavior: upstream transitive closure with depth ledger + `next=`-style follow-up hint; add `safe-delete` read: callers + transitive reaches + uses + tests-reach in one result (callers NAMED file:line).
- Gate advisory upgrade: STEER/FULL advisory lists the callers that no longer fit (the edit-check read; when ripwire is present, delegate; else derive from the store).
Gates: TUI tokens: `impact_reaches=` + `safe_delete:` + gate advisory naming ≥1 caller file:line.
Acceptance token: `VERBS_PARSE_GRADE`.

### W5 god-loop-gi-ct — dual-FRESH TUI proof on omp-ct:master
Owns: docs/ct-plan-port.md, .omp/ct-results-port.json, the two containers.
Full Phase E on omp-ct:master: identity → tools → corbell substrate live (rows= from corbell store) → hunt end-to-end (HUNT_DONE + report artifact) → gate 3-dial → refusals → dual-FRESH isolation → adversarial (empty target GRAPH_EMPTY; missing profile INCONCLUSIVE; cross-session GI_SCOPE_REFUSED).
Gates: Phase E 10/10 PASS artifact; the container image is omp-ct:master; the version banner shows the ported machine.
Acceptance token: `.omp/ct-results-port.json` overallVerdict PASS.

## 2. THE AUDIT LAW

The PortManifestAudit table is the queue (agent://PortManifestAudit). If a subsystem the machine needs is missing from it → audit first, port second. Every port row: source tree + file:line + blockers + verdict. NO port without a provenance line pointing at the source.

## 3. FORBIDDEN (named dead paths)

- Building new machinery where a checkpoint port exists (the regex-populate class — demoted; never re-promoted as "the solution").
- Silent fallbacks: every fallback prints its token + reason.
- Reimplementations "inspired by" the fork (the ISE theatre class): ports are verbatim or adapted at a NAMED seam.
- bun-green sold as machine-live; host-only claims for TUI machines.
- Rewriting this plan mid-flight (append-only; revisions get a dated section).

## 4. EVIDENCE LEDGER

- W1: .omp/BASELINE-2026-09-14.json corbell block + scripts/corbell-build.ts counts.
- W2: report artifacts under MASTER_CONTEXT/ + HUNT_DONE rows.
- W3: per-subsystem ST outputs.
- W4: TUI tool-result tokens.
- W5: .omp/ct-results-port.json.
- RUNNING_BUILD_LOG.md append per wave; DEBUG_LOG-style entries for every bug found during porting (CB-classes re-hit = log with the same verbatim token).

---

## [2026-09-15] PORT CT RUN — Phase E verdict (append-only)
- RESULT: .omp/ct-results-port.json → overallVerdict PASS; 20/20 live scenarios + AD5 PASS-BY-ST (host battery; no TUI claim). Circuit breaker 10/10.
- RIG: gi-omp-port + gi-omp-port2 (dual-FRESH), image omp-ct:master, model openrouter/Laguna S 2.1 (free); dists GI 89ce7270 / trident 8756baac (sha-verified in-container).
- KEY LIVE TOKENS: substrate=corbell rows=31 · HUNT_DONE runId=gi-study-src-hunt-20260914-1 findingsCount=296 + report artifact 453,718B on disk · impact_reaches=158 · safe_delete: callers=31 · [GATE STEER] + FULL GRAPH_GATE_SIGNATURE_BREAK cancel:true + OFF token:null zero-misfire · GI_SCOPE_REFUSED · GI_STORE_CORRUPT → self-heal → reconcile · dual-FRESH disjoint stores (betaUnique only in B).
- BUGS FIXED THIS RUN: (1) trident-omp dist build-time-frozen duplicate registration of the GI tools — shadowed the fresh GI bundle; now BOTH dists rebuilt+deployed on every GI change. (2) scan.ts `path is not defined` (missing node:path import; live compile path only) + NEW tests/st-hunter-live.ts pinning the live route (HUNT_DONE event included). (3) corbell-adapter guard/build split-brain (build now execs the resolved binary). (4) host corbell: /tmp-editable wipe class repaired (venv + tree-sitter grammars). (5) container corbell provisioned at /opt/corbell-venv (real CLI; --help exit 0).
- BATTERIES: 49 pass / 0 fail / 644 expect across 13 files (host). st-corbell-port 6/6. st-hunter-live NEW 1/1.
- OPEN (non-blocking for the port stop): P6 swaps (W8 writer / L6 trace / SRO map), same-ids re-hunt double-run (K20.3), fallback_reason meta clear-on-corbell cosmetic.
