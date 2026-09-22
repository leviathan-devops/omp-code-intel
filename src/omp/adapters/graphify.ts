// adapters/graphify — ★ L6 GRAPHIFY → the SETTLEMENT rung.
//
// THE EDGE: the graphify leg's typed store is the SECOND settlement substrate.
// Its extract is a WHOLE-TREE walk (measured: 26,710 Checkpoints refs) that the
// build-time scope filter reduces to src/ — so the STORE is the honest surface,
// never the raw graph.json.
import * as path from "node:path";
import type { ConsumerProbe, LayerFact } from "../layer-registry.ts";
import { probePath, storeFacts } from "./_shared.ts";

export const GRAPHIFY_CHECKOUT_REL = ".omp/graph-intelligence/graphify-checkout/store.sqlite";

export function graphifyProbe(scopeRoot: string): ConsumerProbe {
  const storePath = path.join(scopeRoot, GRAPHIFY_CHECKOUT_REL);
  return {
    id: "L6_GRAPHIFY",
    rung: "settlement",
    dependency: "the graphify graph.json leg",
    errorCode: "GI_LAYER_GRAPHIFY",
    up: () => probePath(storePath, true),
    facts: (subject: string): LayerFact[] => storeFacts("L6_GRAPHIFY", "settlement", storePath, subject),
  };
}
