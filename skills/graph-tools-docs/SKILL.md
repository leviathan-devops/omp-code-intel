---
name: graph-tools-docs
description: "Graph tools self-docs — tools, verbs, architecture, wiring, use cases, actions"
---

# Graph Tools Docs — GI Pipeline Self-Documentation

**Announce:** Using graph-tools-docs skill.

You are documenting the Graph Intelligence tool surface itself (the GI-OMP
extension: graph-probe, graph-query, bug-hunt, aether-code-audit, plus the
substrate pack and the Go fallback chain). When the user asks "what do the
graph tools do", "how does hunt differ from audit", "which verb answers X",
"where does substrate= come from", or "how does the fallback work", answer
from here — don't guess. Read only the reference file the question needs,
but read it before changing files or asserting behavior.

Probed baseline: GI dist `34ba3ffe` (566,951 B), trident dist `67dc892a`
(15.1 MB), battery 119/0/1004 (19 files), CT PASS 11/11 breaker 10/10,
pool 6 keys + openrouter-only fallback, templates 14 (R18–R31).

## Identity

The GI pipeline is a session-scoped code-graph machine: upstream CLIs
build graphs (corbell method graph, graphifyy concept graph, ripwire
on-demand index), the populate layer normalizes them into typed session
stores, and four tools read them. No tool re-parses source. Every error is
a NAMED token (never a throw past the boundary, never a silent
substitute). Evidence law: every behavior claim cites the command plus its
output or the source file plus lines.

## Feature Map

|Feature|What it is|How to reach it|
|---|---|---|
|**graph-probe**|health + session identity probe|xd://graph-probe `{echo}` → PROBE_TOOL_OK|
|**graph-query**|13-verb parse-grade query over THIS session store|xd://graph-query `{verb, target, ...}`|
|**bug-hunt**|6-phase hunter (RECON→MAP→SCAN→TRACE→STRIKE→REPORT)|xd://bug-hunt `{action: hunt\|status}`|
|**aether-code-audit**|one settled hunter-template sweep → findings+report|xd://aether-code-audit `{targetPath, template}`|
|**substrates**|corbell (default) / graphify (explicit) / indexer-fallback (named)|`substrate` + absolute `targetPath` params|
|**Go fallback**|6-key Go cycler → openrouter laguna s2.1 free last rung|pool §FALLBACK, decide/route/snapshot|
|**ripwire twin**|ONE `ripwire:` cross-check line per twin verb|appended to every twin result|

## Reference routing

Read only the reference the request needs, but read it first.
References live beside this SKILL.md under `references/`:

- Tools, verbs, params, pass tokens: `references/tools.md`
- Architecture, substrates, data flows, file map: `references/architecture.md`
- Wiring: populate switch, hunter seam, audit bind, Go fallback chain: `references/wiring.md`
- Use cases: which tool/verb for which question: `references/use-cases.md`
- Tool actions: every action/verb with exact behavior: `references/actions.md`
- Live host truth beats vendored notes: the GI repo `src/`, `tests/`,
  `.omp/ct-results-graphify.json` at
  `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence`.

## Rules

- Confirm the tool/verb exists in the map before describing it.
- Trigger then one-line how. Never invent params — check extension.ts.
- Never describe `graph-code-audit` as canonical (it is the alias of
  `aether-code-audit`).
- Never describe inferx/nvidia fallback rungs (ONLY openrouter exists).
- Redact key material; fingerprints and labels only.
- Every behavior claim cites a command + output or a source file + lines.

## Hunt vs audit (the most-asked distinction — answer verbatim)

**bug-hunt** runs the full 6-phase hunter machine over a profile's corpus:
RECON (profile load) → MAP (adapter build + LINELESS guard) → SCAN
(battery predicates) → TRACE (call chains) → STRIKE (fix order) →
REPORT (markdown artifact). Output: `HUNT_DONE runId= findingsCount=
reportPath=` plus the report file on disk (e.g. 453,787 B, 296
findings). Use it to FIND live defects in a tree.

**aether-code-audit** runs ONE settled hunter template over the graphify
graph: `runTemplateAudit({template, ledgerDir, targetRoot, graphPath})`
(deterministic sweep + capped file reads, no LLM) → HunterSettlement
fulfilled/rejected. Output: `AUDIT_DONE layer= findings= reportPath=`
plus `findings/report.md` (e.g. 1305 B, 3 FINDING blocks). Use it to
AUDIT one structural question (god-nodes, cycles, dead-code, contracts).
Hunt finds defects; audit settles one template's question with evidence.
