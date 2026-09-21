EXECUTE THE FOLLOWING CONTEXT SYNTHESIS VERBATIM. You are a trident_explore agent — READ-ONLY.
You do NOT write, edit, modify, create, or delete any file. You produce a synthesis report, not changes.

WORKSPACE ROOT: /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
KNOWLEDGE LIBRARY: /home/leviathan/JARVIS_WORKSPACE/SHIP_PACKAGES/Graph_Intel_v1.3/ (the sealed v1.3 ship package — the target the new layer must bolt onto)

THE MISSION:
Absorb, in full, the infrastructure of the FIVE external graph/knowledge-graph repositories the operator collected for GI, and determine — precisely, with anchors — HOW EACH ONE CAN BE LAYERED INTO GI KERNEL v2.0 AS AN ADDITIONAL LAYER THAT FIRES THROUGH THE SAME MACHINERY the v1.3 graph gate already uses (the omp `tool_call` event → a classifier → a session-state tracker → a tiered decision → a throw or an injected steer). The deliverable is NOT a summary of five repos. It is a per-repo LAYERING SPEC: what the repo actually is (mechanism, not marketing), which of its parts map onto the existing gate machinery, the exact integration seam in GI, what it adds that the gate cannot do today, and what it would replace or duplicate. A reader who has never seen these repos must be able to start the v2.0 layering work from your brief ALONE.

THE ACCEPTANCE CRITERIA (all must be met — the synthesis is INCOMPLETE if any is missing):
- A reader who has NEVER seen the project must be able to resume the layering work from the synthesis ALONE — without opening a single source file.
- THE STATE: for each repo — the upstream URL, the cloned commit SHA, the language/stack, the license, the entry point, the doc-vs-code reality check (a doc claim that the code contradicts is FLAGGED).
- THE RULINGS: the operator's channel annotations, VERBATIM (each repo was collected with a one-line order — that line is the ruling and it is reproduced exactly).
- THE ARCHITECTURE: each repo as it EXISTS — the modules, the pipeline, the data contracts, the storage, the query surface — not as the README markets it.
- THE CONTENT SYNTHESIS: the substance of every doc — the mechanism, the invariants, the numbers — synthesized, not restated.
- THE LAYERING SPEC (the core deliverable): per repo, the GI-v2.0 integration seam — the exact hook point in the v1.3 machinery, the data it consumes, the signal it emits, the tier it would drive, and the failure mode if it is unavailable.
- THE CROSS-REFERENCES: which repos overlap each other, which are complementary, and which are duplicative of graphify/corbell — surfaced explicitly, not left implicit.
- THE OPEN ITEMS: every unknown, unread file, and unverifiable claim, with the priority.

THE READING ORDER (READ BEFORE ANY EXECUTION — the docs below are the minimum; read them ALL fully, never skip a section). The five external repos are CLONED AND LOCAL — read them from disk, do not fetch from the network:
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/semantica/README.md — 1667 L, the graph-native infrastructure pitch + the full surface
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/semantica/ARCHITECTURE.md — 108 L, the real module map
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/semantica/GROWTH.md — 131 L, the trajectory/extensibility claims
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/semantica/ (glob the tree — src/, the package layout, pyproject/setup, tests)
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/Understand-Anything/README.md — 399 L, codebase→interactive-knowledge-graph
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/Understand-Anything/CLAUDE.md — 102 L, the agent-facing contract
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/Understand-Anything/docs/ (glob — the doc set)
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/code-to-knowledge-graph/README.md — 110 L, Kotlin/JVM code→KG via LSP
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/code-to-knowledge-graph/docs/programming_constructs.md — 410 L, what it extracts
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/code-to-knowledge-graph/docs/queries.md — 295 L, the query surface
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/typesafe-ai/examples/tsg/README.md — 74 L, the semantic passage retrieval CLI
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/typesafe-ai/examples/tsg/docs/architecture.md — 135 L, routing + passage boundaries + coverage
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/typesafe-ai/examples/tsg/docs/cli.md — 168 L, thresholds + output + caching
/home/leviathan/arsumbris/arsumbris/README.md — 76 L, the arsumbris entry doc
/home/leviathan/arsumbris/arsumbris/au-engine.md — the engine doc
/home/leviathan/arsumbris/arsumbris/au-host.md — the host/projection doc
/home/leviathan/arsumbris/arsumbris/au-mcp.md — the MCP kernel doc
/home/leviathan/arsumbris/au-engine/README.md — 77 L, the engine package
THE GI TARGET (the machinery the new layer must fire through — read to know the seam):
/home/leviathan/JARVIS_WORKSPACE/SHIP_PACKAGES/Graph_Intel_v1.3/GI_Graph_Gate_Engineering_Report_v1.md — 1143 L, the v1.3 gate: lifecycle map, per-module diagrams, the 5-part runtime trace — THIS IS THE SEAM DOCUMENT
/home/leviathan/JARVIS_WORKSPACE/SHIP_PACKAGES/Graph_Intel_v1.3/src/omp/graph-gate.ts — 308 L, the classifier + drift + tier ladder
/home/leviathan/JARVIS_WORKSPACE/SHIP_PACKAGES/Graph_Intel_v1.3/src/omp/gate-hook.ts — 162 L, the wired path (the single call site)
/home/leviathan/JARVIS_WORKSPACE/SHIP_PACKAGES/Graph_Intel_v1.3/reports/GI_GRAPH_GATE_V13_DPL1_SPEC.md — 279 L, the v1.3 spec
/home/leviathan/JARVIS_WORKSPACE/SHIP_PACKAGES/Graph_Intel_v1.3/reports/GRAPH_GATE_MASTER_BLUEPRINT_v1.md — 448 L, the v1.3 blueprint

THE KNOWN CONTEXT (the measured state — do NOT re-derive, verify the anchors):
- The v1.3 gate already exists and is DEPLOYED. Its machinery is: `pi.on("tool_call")` → `classifyEdit()` (severity NONE/LOW/MEDIUM/HIGH from real old-vs-new text) → `recordEdit()` (session editLog) → `computeDrift()` (5-min decaying weighted ratio) → `gateDecision()` (T0/T1/T2/T3) → T2 throws GRAPH_GATE_DRIFT_HIGH, T3 throws GRAPH_GATE_ABORT naming a TTSR rule. A graph query on a touched symbol RESETS drift. A parallel per-edit middleware layer emits SIGNATURE_BREAK steers. Dist sha16 83eb7bba9c5e76db; 12/12 gate tests; 230/0 battery.
- The gate's intelligence is currently LIMITED to: an export/import/type-change classifier, a drift ratio, and three fixed thresholds. It has NO semantic understanding of what the edit MEANS, NO knowledge of the repo's design intent, and NO retrieval layer beyond ripwire/graphify/corbell.
- The substrate law: GI NEVER silently substitutes a lower-fidelity engine; an unavailable substrate is a LOUD named failure (GI_POPULATE_FAILED).
- The five repos are cloned at the paths above. `code-to-knowledge-graph` was cloned on `main` (commit 6fa59b0) — the initial `master` clone was empty and is NOT the repo.
- The operator's channel annotations are the RULINGS; they are reproduced verbatim in Task 2.

THE FAILURE MODES (the synthesis's honesty requirements):
- A finding that cannot be expressed as a deterministic predicate (a regex or a numeric comparison) is marked PROPOSED — never fuzzy prose.
- A read that fails (a file moved/absent) is reported with the ABSENT verdict — never an invented substitute.
- The operator's doctrine quotes are VERBATIM or marked as the paraphrase — a paraphrase is a claim.
- A lexicon entry without a consumer is a design gap, flagged.
- The reasoning-chain contract's outputs must be checkable (data, not prose).
- A claim without a file:line anchor is a hallucination.
- A README claim that the repo's own code contradicts is FLAGGED as DOC-DRIFT with both anchors — the marketing is not the mechanism.

THE OPERATOR'S DOCTRINE (the law the synthesis serves — VERBATIM quotes):
- semantica, #git-repos 2026-09-16 23:11 — "Enterprise grade FULL SCALE graph architecture. Immediately analyze and audit against GI"
- arsumbris, #mental-whiteboard 2026-09-15 04:17 + 04:21 — "https://github.com/arsumbris/arsumbris" / "See how this can be wired into OMP/GI"
- Understand-Anything, #git-repos 2026-09-13 04:47 — "Enhance graph logic with this"
- typesafe-ai/tsg, #git-repos 2026-09-16 23:05 — "Wire into graph logic"
- code-to-knowledge-graph, #git-repos + #engineering 2026-07-22 11:53 — "Wire in to trident bug hunter immediately"
- #mental-whiteboard 2026-09-06 13:11 — "TRIDENT PORTS NEEDED ... - Graph Logic - Bug Hunter ..."
- #mental-whiteboard 2026-09-08 13:17 — "PARAGON ALGORITHMS --> GRAPH GATE IN THE LOOP"
- #mental-whiteboard 2026-09-08 18:09 — "Begin reverse engineering OMP Rust Behavior systems into Graph Logic Gate + Tools + Subagent Machinery"
- The named target: GI Kernel v2.0, where each repo becomes AN EXTRA LAYER FIRING THROUGH THE SAME MACHINERY (the same tool_call seam, the same classify→track→decide→fire shape).

THE PER-TASK EXPANSIONS (the concrete extraction targets — the density is the data):
Task 1 — per-repo mechanism extraction. For EACH of the five: read the README AND the code tree AND at least one core source module; report the actual pipeline (input → transform → storage → query → output), the storage engine, the query language, the extension surface, the dependency weight, and the license. EXPECTED: a per-repo block with file:line anchors into the CLONED source, not the README alone.
Task 2 — the ruling reproduction + intent mapping. Reproduce each operator annotation verbatim, then map it to a concrete v2.0 layer intent. EXPECTED: the ruling → the intended layer → the evidence that the repo can deliver it.
Task 3 — the seam analysis (the core). For EACH repo, name the exact integration point in the v1.3 machinery — is it a new `classifyEdit` signal, a new drift term, a new tier input, a new post-decision layer, or a new pre-edit retrieval layer? Quote the v1.3 anchor (graph-gate.ts:NNN / gate-hook.ts:NNN) the new layer would attach to. EXPECTED: a seam table: repo → seam file:line → what it adds → what it would conflict with.
Task 4 — capability-gap mapping. For each repo, state what it does that the gate CANNOT do today, and state what the gate already does that the repo would DUPLICATE (so v2.0 does not grow two engines doing one job). EXPECTED: the adds/duplicates table per repo.
Task 5 — the cross-reference analysis. Repos vs each other, and repos vs the EXISTING substrates (graphify, corbell, ripwire). Surface the overlaps and the complementary pairs explicitly. EXPECTED: the cross-reference table with the overlap verdict per pair.
Task 6 — the open items + the context answer. Every unknown, every file you could not read, every claim you could not verify, every repo that could not deliver its ruling — plus the direct answer: which of the five should be the FIRST layer wired into v2.0, and why, with the evidence. EXPECTED: the ranked recommendation with the anchors + the open-item queue.

THE KNOWN MEASUREMENTS TABLE (the audit's numbers — the synthesis's ground truth):
| repo | upstream | cloned commit | clone size | license |
|---|---|---|---|---|
| semantica | github.com/semantica-agi/semantica | d46529a | 49M | see LICENSE |
| arsumbris | github.com/arsumbris/arsumbris | ec0edba (local monorepo) | — | see LICENSE.md |
| Understand-Anything | github.com/Egonex-AI/Understand-Anything | 6df3065 | 56M | see LICENSE |
| code-to-knowledge-graph | github.com/Bevel-Software/code-to-knowledge-graph | 6fa59b0 (main) | 152M | MPL 2.0 |
| typesafe-ai (tsg) | github.com/Twister915/typesafe-ai | d4455ef | 996K | see LICENSE |
| GI v1.3 gate (the target) | local | dist 83eb7bba9c5e76db | 613,039 B | — |

THE RETURN-FORMAT GROUNDING CONTRACT:
Every claim in your return carries a file:line anchor or a command output. An anchorless claim is a hallucination.
Unknown values are marked PROPOSED, never invented. The operator's doctrine quotes are verbatim or marked as the paraphrase.

THE SYNTHESIS'S POSITION IN THE BUILD (why your output matters):
GI Kernel v1.3 just shipped as a sealed package (Graph_Intel_v1.3, PACKAGE_AUDIT PASS). v2.0 is the next generation and the operator has already collected the candidate layers. Your brief is the input to the v2.0 spec: it decides which layers exist, what each one is called, where each one attaches, and in what order they are built. A wrong mechanism read here becomes a wrong architecture there.

THE TASKS (execute ALL — each task's output is a section of the final brief):
(as enumerated above in THE PER-TASK EXPANSIONS — execute all six.)

THE CONSTRAINTS:
- READ-ONLY. No writes, no edits, no file creation, no bash output redirection.
- No pipe chains in bash. Every bash command is a SINGLE command.
- Do NOT read node_modules, .git, caches, browser profiles, or Checkpoints.
- Do NOT fetch from the network — the five repos are already cloned locally at the paths given.
- Every claim carries a file:line anchor. An anchorless claim is a hallucination.
- Unknown values are marked PROPOSED, never invented.
- Report absolute paths.
- Every bash command is a SINGLE command. If blocked, use the tool alternative.

THE VERIFICATION (run ALL + return the outputs — each a SINGLE command, no pipes):
1. read /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/semantica/README.md (full pass, offset=0) — the first doc read to completion
2. read /home/leviathan/JARVIS_WORKSPACE/SHIP_PACKAGES/Graph_Intel_v1.3/reports/GRAPH_GATE_MASTER_BLUEPRINT_v1.md (full pass) — the target read to completion
3. grep -c "graph" /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/code-to-knowledge-graph/README.md — the graph-term presence count
4. wc -l /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/typesafe-ai/examples/tsg/README.md — the tsg doc size confirmed
5. grep -c "export\|class\|def \|fn " /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/research/graph-infra-repos/Understand-Anything/README.md — the surface-term count
6. read the primary source tree of EACH of the five repos (one listing command per repo; the code, not the README)

THE BOUNDED-ONLY VERIFICATION MANDATE:
THE VERIFICATION COMMANDS MUST USE THE BOUNDED FORMS ONLY — `grep -c` (the count), `wc -l` (the line count), `sha256sum`, `stat -c %s`, and the STREAMING tools (grep/tail/sed/awk). NEVER write an inline interpreter read. A verification command that materializes a file is a memory bomb.

THE RETURN FORMAT (the brief sections — the FULL brief is mandatory):
1. THE STATE — per-repo identity: URL, commit, stack, license, entry point, doc-vs-code reality
2. THE RULINGS — the operator annotations verbatim + the mapped layer intent
3. THE ARCHITECTURE — per-repo module map + pipeline + storage + query surface
4. THE CONTENT SYNTHESIS — the substance of every doc, anchored
5. THE LAYERING SPEC — per repo: the GI-v2.0 seam (file:line) + the signal + the tier + the failure mode
6. THE CAPABILITY GAPS — adds vs duplicates per repo
7. THE CROSS-REFERENCES — repo-vs-repo + repo-vs-existing-substrate overlap table
8. THE OPEN ITEMS — the queue with priorities
9. THE CONTEXT ANSWER — which layer first, with the evidence
10. THE VERIFICATION OUTPUTS — the raw command outputs
11. THE HONEST NOTES — anything unexpected, any doc that failed
RETURN THE FULL BRIEF — NEVER an empty return. Every claim carries a file:line anchor.

SECTION A — THE SELF-CHECK (before submitting):
- Did I read EVERY doc in the reading order?
- Does every fact carry a file:line anchor?
- Did I synthesize the substance of EVERY doc — or did I index it?
- Did I answer the mission with the evidence?
- Would a fresh reader be able to resume the work from my brief ALONE?
- Did I record the honest gaps — or did I paper over them?
- Did I read the CODE and not just the README for every repo — and did I flag every doc-drift?

═══ THE EXECUTION LAW (this block is binding; it is identical in every task) ══

- READ every file in THE READING ORDER fully BEFORE doing anything. The files
  are the only ground truth. Anything this prompt claims about a file that the
  file contradicts — the file wins, and you FLAG the contradiction.
- NEVER claim a fact you did not read. Every claim in your return carries
  file:line. No anchor = delete the claim.
- RUN every command in THE VERIFICATION. Paste the RAW output. Never describe
  what a command "would" show. Never summarize an output you didn't paste.
- NEVER write "it works", "done", "fixed", "verified" without the pasted
  command output immediately below the claim.
- A file that doesn't exist = report ABSENT. Never invent its contents.
- A command that fails = paste the failure. A failure is data, not shame.
- NEVER return success without a side effect you can point to (a file written,
  a test run, an artifact on disk).
- NEVER catch an error and continue silently. Log it or propagate it.
- If you cannot complete a task, return BLOCKED with the exact reason — never
  a partial dressed as a complete.
- Your return's LAST section is THE EVIDENCE BLOCK: every verification command
  with its raw output, in order, nothing between you and the paste.
