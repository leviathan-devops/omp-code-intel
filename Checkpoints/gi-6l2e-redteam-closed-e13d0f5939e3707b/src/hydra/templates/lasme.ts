// PORTED FROM v443-en38 fork hydra/aether-templates/hunters/lasme-{actor,adapter,engine,lexicon,state-machine,mpse-threshold}.ts (template identities: layerId/anchorPredicate/layerNumber/graphQueries/filterTags; outputSchema = SubagentOutputSchema)
// OMP SEAM ADAPTATION: same binding-surface law as mpse.ts — identities + graphQueries +
// filterTags + zod outputSchema match the fork; staticPrompt bodies are compact OMP mandates
// (fork bodies embed absolute tree paths + scope/emission calibration with no OMP consumer).
// LAW: 14 hunter-template zod bindings — this file owns the 6 LASME templates (R18-R23).

import { z } from "zod";
import type { AuditorTemplate } from "./types.ts";
import { SubagentOutputSchema } from "./types.ts";

function lasmeTemplate(
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
    staticPrompt: `IDENTITY: ${anchorPredicate.toUpperCase()} hunter — ${mandate} Fire on what IS (file+line+verbatim quote or [INFERRED]+graph edge); never fire on test fixtures/mocks/calib:-exempted sites. GRAPH LAW: query graph before files; prefer EXTRACTED; path-trace connections; subgraph depth 3 for blast radius; never fabricate. FINDINGS CONTRACT: findings/report.md via write_findings, ## FINDING: blocks (predicate/file path:line/evidence/spec) + ## SUMMARY.`,
  };
}

// PORTED FROM fork hydra/aether-templates/hunters/lasme-lexicon.ts (lasmeLexiconTemplate: R18-lasme-lexicon/lexicon/18)
export const lasmeLexiconTemplate = lasmeTemplate(
  "R18-lasme-lexicon", "lexicon", 18,
  ["find all interfaces with more than 5 members", "show if/else chains deeper than 3", "find numeric literals not in named constants"],
  ["lexicon", "PatternFamily", "ISE"],
  "hunt lexicon derailments (unanchored literals gating decisions, missing PatternFamily coverage).",
);

// PORTED FROM fork hydra/aether-templates/hunters/lasme-actor.ts (lasmeActorTemplate: R19-lasme-actor/actor/19)
export const lasmeActorTemplate = lasmeTemplate(
  "R19-lasme-actor", "actor", 19,
  ["show all createMachine and createActor call sites", "trace send() to subscribe() paths", "find actors without subscription handlers"],
  ["actor", "createMachine", "createActor", "send", "subscribe"],
  "hunt actor topology (missing subscriptions, broken message flow, topology drift, orphan actors).",
);

// PORTED FROM fork hydra/aether-templates/hunters/lasme-state-machine.ts (lasmeStateMachineTemplate: R20-lasme-state-machine/state-machine/20)
export const lasmeStateMachineTemplate = lasmeTemplate(
  "R20-lasme-state-machine", "state-machine", 20,
  ["find machines with scattered boolean flags alongside them", "show state machines with their state count", "find XState createMachine configurations"],
  ["state-machine", "XState", "createMachine", "boolean-flags"],
  "hunt state-machine derailments (scattered boolean flags, missing machine coverage, drifted configs).",
);

// PORTED FROM fork hydra/aether-templates/hunters/lasme-engine.ts (lasmeEngineTemplate: R21-lasme-engine/engine/21)
export const lasmeEngineTemplate = lasmeTemplate(
  "R21-lasme-engine", "engine", 21,
  ["find all writeFileSync and file I/O calls", "trace degrade/fallback branches", "find container config references"],
  ["engine", "writeFileSync", "degrade", "side-effect"],
  "hunt engine derailments (unlogged degrades, silent swallows, side-effect scope breaches).",
);

// PORTED FROM fork hydra/aether-templates/hunters/lasme-adapter.ts (lasmeAdapterTemplate: R22-lasme-adapter/adapter/22)
export const lasmeAdapterTemplate = lasmeTemplate(
  "R22-lasme-adapter", "adapter", 22,
  ["find delegation function patterns", "show spread operator and Object.assign merge sites", "trace adapter to engine call chains"],
  ["adapter", "delegation", "snapshot-merge", "parity"],
  "hunt adapter derailments (broken delegation, lossy merges, parity drift between twin adapters).",
);

// PORTED FROM fork hydra/aether-templates/hunters/lasme-mpse-threshold.ts (lasmeMpseThresholdTemplate: R23-lasme-mpse-threshold/mpse-threshold/23)
export const lasmeMpseThresholdTemplate = lasmeTemplate(
  "R23-lasme-mpse-threshold", "mpse-threshold", 23,
  ["find numeric comparisons in contract-checking functions", "show Math.abs and comparison operators near contract calls", "find epsilon oracle patterns"],
  ["mpse-threshold", "epsilon", "contract-call", "numeric-decision"],
  "hunt mpse-threshold derailments (unanchored numerics gating contract verdicts).",
);

export const LASME_TEMPLATES = [
  lasmeLexiconTemplate, lasmeActorTemplate, lasmeStateMachineTemplate,
  lasmeEngineTemplate, lasmeAdapterTemplate, lasmeMpseThresholdTemplate,
] as const;
