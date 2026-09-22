// adapters/abide — ★ ABIDE → the REPAIR rung.
//
// ★ ABIDE REPAIRS, NEVER BLOCKS. The rung is `repair`, and the fact a repair
// contributes is a REPAIR ACTION the decision may take — never a refusal. That
// distinction is the adapter's whole contract: an ABIDE edge that returned a block
// would be the wrong rung entirely.
import * as fs from "node:fs";
import * as path from "node:path";
import type { ConsumerProbe, LayerFact } from "../layer-registry.ts";
import { probePath } from "./_shared.ts";

export function abideProbe(scopeRoot: string, abideRoot?: string): ConsumerProbe {
  const root =
    abideRoot ??
    "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/JARVIS/reports/handovers/JEV_ABIDE_CONTEXT_HANDOVER";
  return {
    id: "ABIDE",
    rung: "repair",
    dependency: "the Abide source — the ALU (repair, never block)",
    errorCode: "GI_ENFORCE_ABIDE",
    up: () => probePath(root),
    // ★ THE REPAIR SURFACE is the Abide ALU, reached by a separate client. Zero
    // facts until wired — and zero facts here is NOT a block; it is an absence of
    // repair advice.
    facts: (): LayerFact[] => [],
  };
}
