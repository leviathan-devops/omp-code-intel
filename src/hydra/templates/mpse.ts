// PORTED FROM v443-en38 fork hydra/aether-templates/hunters/mpse-{contract,oracle,stage,provenance}.ts (template identities: layerId/anchorPredicate/layerNumber/graphQueries/filterTags + output schemas) + instances/sro.ts (SRO base shape, via sro-cycles.ts import)
// OMP SEAM ADAPTATION: staticPrompt bodies REWRITTEN as compact OMP mandates (the fork prompts embed
// absolute source-tree paths + prior-gate stitch slots with no OMP consumer — the D2 bind-only law:
// BIND only the auditor run path). What MUST match the fork per-template is the BINDING surface:
// layerId, anchorPredicate, layerNumber, graphQueries, filterTags, and a zod outputSchema whose
// candidates carry the fork's fields (contractId/implementationStatus/conformances/traceGaps where
// the fork has them). Calibration prose (IDENTITY/HUNT MANDATE/CALIBRATION SHOTS/FINDINGS CONTRACT)
// is summarized, not copied — the auditor never sends these prompts to an LLM in this wave (the
// deterministic sweep below consumes graph+files directly), so prompt bytes are documentation.
// LAW: 14 hunter-template zod bindings — this file owns the 4 MPSE templates (R24-R27).

import { z } from "zod";
import type { AuditorTemplate } from "./types.ts";
import { LayerCandidateSchema, SubagentOutputSchema } from "./types.ts";

const candidateWithContract = LayerCandidateSchema.extend({
  contractId: z.string().optional(),
  implementationStatus: z.enum(["conformant", "violated", "unimplemented"]).optional(),
});

// ★ F-1044 FIX (2026-09-25): the four conformance schemas were structurally identical —
// ★ a field added to one silently diverged the rest. The shared base owns the fields once;
// ★ each schema extends it (Oracle adds epsilon; Provenance adds nothing).
const MpseConformanceBaseSchema = z.object({
  contractId: z.string().min(1),
  specPath: z.string().min(1),
  specLine: z.number().int().positive(),
  specQuote: z.string().min(1),
  implementationStatus: z.enum(["conformant", "violated", "unimplemented"]),
  file: z.string().optional(),
  line: z.number().int().positive().optional(),
  evidence: z.string().optional(),
});

export const MpseContractConformanceSchema = MpseConformanceBaseSchema.extend({});

export const MpseContractOutputSchema = z.object({
  candidates: z.array(candidateWithContract),
  conformances: z.array(MpseContractConformanceSchema).optional(),
  summary: z.string().min(1),
});

// PORTED FROM fork hydra/aether-templates/hunters/mpse-contract.ts (mpseContractTemplate: R24-mpse-contract/contract/24)
export const mpseContractTemplate: AuditorTemplate = {
  layerId: "R24-mpse-contract",
  anchorPredicate: "contract",
  layerNumber: 24,
  graphQueries: [
    "trace contract.checkContract() call chains",
    "find function implementations matching spec declarations",
  ],
  filterTags: ["threshold", "contract", "spec-clause"],
  // ★ F-213 FIX (2026-09-24): direct assignment — MpseContractOutputSchema is a
  //   z.ZodObject which already extends z.ZodSchema (same precedent as sro.ts
  //   F-160); the double cast hid shape drift from the compiler.
  outputSchema: MpseContractOutputSchema,
  staticPrompt: `IDENTITY: CONTRACT hunter — hunt contract conformance (unimplemented/violated/missing-guard/drifted contracts). Trace spec clause → checkContract() chain → implementing function → verdict. Fire on what IS (file+line+verbatim quote or [INFERRED]+graph edge). GRAPH LAW: query graph before files; prefer EXTRACTED; path-trace connections; subgraph depth 3 for blast radius; never fabricate. FINDINGS CONTRACT: findings/report.md via write_findings, ## FINDING: blocks (predicate/file path:line/evidence/spec) + ## SUMMARY.`,
};

export const MpseOracleConformanceSchema = MpseConformanceBaseSchema.extend({
  epsilon: z.number().optional(),
});

export const MpseOracleOutputSchema = z.object({
  candidates: z.array(candidateWithContract),
  conformances: z.array(MpseOracleConformanceSchema).optional(),
  summary: z.string().min(1),
});

// PORTED FROM fork hydra/aether-templates/hunters/mpse-oracle.ts (mpseOracleTemplate: R25-mpse-oracle/oracle/25)
export const mpseOracleTemplate: AuditorTemplate = {
  layerId: "R25-mpse-oracle",
  anchorPredicate: "oracle",
  layerNumber: 25,
  graphQueries: [
    "find Math.abs and comparison operators near threshold constants",
    "trace epsilon oracle patterns",
  ],
  filterTags: ["threshold", "epsilon"],
  // ★ F-213 FIX (2026-09-24): direct assignment (see contract — same F-160 precedent).
  outputSchema: MpseOracleOutputSchema,
  staticPrompt: `IDENTITY: ORACLE hunter — hunt epsilon/oracle threshold enforcement (unguarded numeric decisions, epsilon drift, missing oracle guards near contract calls). Fire on what IS (file+line+verbatim quote or [INFERRED]+graph edge). GRAPH LAW: query graph before files; prefer EXTRACTED; never fabricate. FINDINGS CONTRACT: findings/report.md via write_findings, ## FINDING: blocks + ## SUMMARY.`,
};

export const MpseStageConformanceSchema = MpseConformanceBaseSchema.extend({});

export const MpseStageOutputSchema = z.object({
  candidates: z.array(candidateWithContract),
  conformances: z.array(MpseStageConformanceSchema).optional(),
  summary: z.string().min(1),
});

// PORTED FROM fork hydra/aether-templates/hunters/mpse-stage.ts (mpseStageTemplate: R26-mpse-stage/stage/26)
export const mpseStageTemplate: AuditorTemplate = {
  layerId: "R26-mpse-stage",
  anchorPredicate: "stage",
  layerNumber: 26,
  graphQueries: [
    "show function call chains with their pre/post conditions",
    "find stage gate violations",
  ],
  filterTags: ["pre-condition", "post-condition", "invariant"],
  // ★ F-213 FIX (2026-09-24): direct assignment (see contract — same F-160 precedent).
  outputSchema: MpseStageOutputSchema,
  staticPrompt: `IDENTITY: STAGE hunter — hunt stage-gate enforcement (pre/post/invariant violations in call chains, guard-skipping paths). Fire on what IS (file+line+verbatim quote or [INFERRED]+graph edge). GRAPH LAW: query graph before files; prefer EXTRACTED; never fabricate. FINDINGS CONTRACT: findings/report.md via write_findings, ## FINDING: blocks + ## SUMMARY.`,
};

// ★ F-1206 FIX (2026-09-25): TraceGapSchema re-declared every base field — a field added to
// ★ MpseConformanceBaseSchema silently diverged it (the F-1044 class). Extend the base; narrow
// ★ implementationStatus to the literal, require evidence, add gapReason. Same accepted set:
// ★ every previously-valid TraceGap still validates (base fields identical, evidence was required).
export const TraceGapSchema = MpseConformanceBaseSchema.extend({
  implementationStatus: z.literal("unimplemented"),
  evidence: z.string().min(1),
  gapReason: z.string().min(1).optional(),
});

export const ProvenanceConformanceSchema = MpseConformanceBaseSchema.extend({});

export const MpseProvenanceOutputSchema = z.object({
  candidates: z.array(candidateWithContract),
  conformances: z.array(ProvenanceConformanceSchema).optional(),
  traceGaps: z.array(TraceGapSchema).optional(),
  summary: z.string().min(1),
});

// PORTED FROM fork hydra/aether-templates/hunters/mpse-provenance.ts (mpseProvenanceTemplate: R27-mpse-provenance/provenance/27)
export const mpseProvenanceTemplate: AuditorTemplate = {
  layerId: "R27-mpse-provenance",
  anchorPredicate: "provenance",
  layerNumber: 27,
  graphQueries: [
    "path spec clause reference to code implementation",
    "find unreachable spec declarations",
  ],
  // ★ F-406 FIX (2026-09-24): missing filterTags (copy-paste omission — R24/R25/R26 all carry them; the auditor reads template.filterTags ?? [] so undefined silently degraded to flagged_by).
  filterTags: ["trace-gap", "unreachable", "provenance"],
  // ★ F-213 FIX (2026-09-24): direct assignment (see contract — same F-160 precedent).
  outputSchema: MpseProvenanceOutputSchema,
  staticPrompt: `IDENTITY: PROVENANCE hunter — hunt trace gaps (spec clauses with no implementing code, unreachable declarations). Missing trace = TRACE_GAP. Fire on what IS (file+line+verbatim quote or [INFERRED]+graph edge). GRAPH LAW: query graph before files; prefer EXTRACTED; never fabricate. FINDINGS CONTRACT: findings/report.md via write_findings, ## FINDING: blocks + ## SUMMARY.`,
};

export const MPSE_TEMPLATES = [mpseContractTemplate, mpseOracleTemplate, mpseStageTemplate, mpseProvenanceTemplate] as const;
