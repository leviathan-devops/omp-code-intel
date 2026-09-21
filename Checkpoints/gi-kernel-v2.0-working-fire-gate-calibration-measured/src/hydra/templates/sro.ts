// PORTED FROM v443-en38 fork hydra/aether-templates/hunters/sro-{graph,path,dead-code,cycles}.ts (template identities: layerId/anchorPredicate/layerNumber/graphQueries/filterTags; outputSchema = SubagentOutputSchema / SroSubagentOutputSchema from instances/sro.ts)
// OMP SEAM ADAPTATION: same binding-surface law as mpse.ts/lasme.ts — identities + queries +
// tags + zod outputSchema match the fork; staticPrompt bodies are compact OMP mandates. The SRO
// family output schema is SubagentOutputSchema-verbatim (the fork's SroSubagentOutputSchema is the
// same candidates[]+summary shape — verified against sro-dead-code.ts:33 which uses
// SubagentOutputSchema directly; cycles/graph/path import the instances alias of that shape).
// LAW: 14 hunter-template zod bindings — this file owns the 4 SRO templates (R28-R31).

import { z } from "zod";
import type { AuditorTemplate } from "./types.ts";
import { SubagentOutputSchema } from "./types.ts";

function sroTemplate(
  layerId: string,
  anchorPredicate: string,
  layerNumber: number,
  graphQueries: string[],
  filterTags: string[],
  mandate: string,
): AuditorTemplate {
  return {
    layerId,
    anchorPredicate,
    layerNumber,
    graphQueries,
    filterTags,
    outputSchema: SubagentOutputSchema as unknown as z.ZodSchema,
    staticPrompt: `IDENTITY: ${anchorPredicate.toUpperCase()} hunter — ${mandate} You query the SAME shared graph all gates used (one-graph law). MEASURED, never assumed — an empty list is valid when genuinely measured empty. Every candidate CONFIRMED by graph query AND file grep (two-leg verification). GRAPH LAW: prefer EXTRACTED; subgraph depth 3 for blast radius; never fabricate. FINDINGS CONTRACT: findings/report.md via write_findings, ## FINDING: blocks (predicate/file path:line/evidence/spec) + ## SUMMARY.`,
  };
}

// PORTED FROM fork hydra/aether-templates/hunters/sro-graph.ts (sroGraphTemplate: R28-sro-graph/graph-structure/28)
export const sroGraphTemplate = sroTemplate(
  "R28-sro-graph", "graph-structure", 28,
  [
    "show all nodes and edges from the merged graph",
    "find orphaned modules with no incoming or outgoing edges",
    "show layer violations where imports cross architectural boundaries",
    "explain god nodes with highest degree and their communities",
    "get subgraph around orphaned candidates depth 3",
  ],
  ["violates", "triggers", "shouldBe", "declares", "evaluates_to", "contradicts_oracle", "flagged_by", "caused"],
  "hunt architectural anomalies in the merged graph (orphans, layer violations, god-node risks).",
);

// PORTED FROM fork hydra/aether-templates/hunters/sro-path.ts (sroPathTemplate: R29-sro-path/impact-path/29)
export const sroPathTemplate = sroTemplate(
  "R29-sro-path", "impact-path", 29,
  [
    "path from {finding.file}:{finding.line} to all callers within 5 hops",
    "get neighbors of {finding.subject} depth 3 for blast radius",
    "explain {finding.subject} including connections and community",
    "get subgraph centered on finding node depth 2",
  ],
  ["violates", "shouldBe", "implements", "evaluates_to", "contradicts_oracle", "ungrounded_threshold", "flagged_by", "derived_from"],
  "hunt impact paths (caller chains within 5 hops, blast radius per finding).",
);

// PORTED FROM fork hydra/aether-templates/hunters/sro-dead-code.ts (sroDeadCodeTemplate: R30-sro-dead-code/dead-code/30)
export const sroDeadCodeTemplate = sroTemplate(
  "R30-sro-dead-code", "dead-code", 30,
  [
    "find nodes with in-degree 0 that are exported",
    "show functions not in any call chain",
    "find modules with no consumers",
    "get subgraph around candidate dead node depth 2",
  ],
  ["declares", "implements", "wraps", "shouldBe", "flagged_by", "derived_from", "violates", "evaluates_to"],
  "hunt dead code (exports with no importers, functions with no callers, modules with no consumers).",
);

// PORTED FROM fork hydra/aether-templates/hunters/sro-cycles.ts (sroCyclesTemplate: R31-sro-cycles/cycles/31)
export const sroCyclesTemplate = sroTemplate(
  "R31-sro-cycles", "cycles", 31,
  ["find cycles in the import graph", "show circular dependency chains"],
  ["violates", "triggers", "shouldBe", "declares", "evaluates_to", "contradicts_oracle", "flagged_by", "caused"],
  "hunt circular dependencies (import cycles length>=2 verified by reading import statements, SCCs size>=2).",
);

export const SRO_TEMPLATES = [sroGraphTemplate, sroPathTemplate, sroDeadCodeTemplate, sroCyclesTemplate] as const;
