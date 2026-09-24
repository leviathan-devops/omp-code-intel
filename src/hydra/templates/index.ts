// PORTED FROM v443-en38 fork hydra/aether-templates/hunters/* (14 hunter files) + meta/{lasme,mpse,sro}-meta.ts (roster law) — the registry barrel
// Registry law: template count MUST be 14 (6 LASME R18-R23 + 4 MPSE R24-R27 + 4 SRO R28-R31).
// The meta rosters fix the stitch order (lasme → mpse → sro, ascending layerNumber); the W7
// auditor run path consumes ONE template per run — the roster exists so the bind layer can
// enumerate without importing family files directly.

import type { AuditorTemplate } from "./types.ts";
import { LASME_TEMPLATES } from "./lasme.ts";
import { MPSE_TEMPLATES } from "./mpse.ts";
import { SRO_TEMPLATES } from "./sro.ts";

export type { AuditorTemplate } from "./types.ts";
export { LayerCandidateSchema, SubagentOutputSchema } from "./types.ts";
export type { LayerCandidate, SubagentOutput } from "./types.ts";
export { LASME_TEMPLATES } from "./lasme.ts";
export { MPSE_TEMPLATES } from "./mpse.ts";
export { SRO_TEMPLATES } from "./sro.ts";

export const ALL_TEMPLATES: readonly AuditorTemplate[] = [
  ...LASME_TEMPLATES,
  ...MPSE_TEMPLATES,
  ...SRO_TEMPLATES,
];
// ★ F-7 FIX (2026-09-24): the registry law (line 2) is now enforced — a family
//   edit that adds or removes a template fails LOUD at import, never drifts silent.
if (ALL_TEMPLATES.length !== 14) {
  throw new Error(`HUNTER_TEMPLATE_COUNT: registry law requires exactly 14 templates (6 LASME + 4 MPSE + 4 SRO), found ${ALL_TEMPLATES.length}`);
}

const BY_LAYER_ID: Record<string, AuditorTemplate> = {};
for (const t of ALL_TEMPLATES) {
  // ★ F-8 FIX (2026-09-24): duplicate layerIds fail LOUD — the old silent
  //   overwrite hid the loser and corrupted templateByLayerId lookups.
  if (BY_LAYER_ID[t.layerId] !== undefined) {
    throw new Error(`HUNTER_TEMPLATE_DUPLICATE: duplicate layerId '${t.layerId}'`);
  }
  BY_LAYER_ID[t.layerId] = t;
}

export function templateByLayerId(layerId: string): AuditorTemplate | null {
  if (typeof layerId !== "string" || layerId.trim() === "") return null;
  return BY_LAYER_ID[layerId] ?? null;
}

export function templateCount(): number {
  return ALL_TEMPLATES.length;
}
