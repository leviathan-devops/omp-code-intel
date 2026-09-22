// adapters/corbell — ★ L5 CORBELL → the SETTLEMENT rung.
//
// THE EDGE: the corbell parse-grade checkout's typed store is the PRIMARY graph
// substrate. This adapter is the edge from that store INTO the decision: the live
// edges whose canonical id names the subject become FACTS the verdict may settle on.
//
// Consumed iff the store answers AND at least one live edge names the subject.
// A store that answers with zero matching edges is GI_LAYER_UNCONSUMED — the layer
// is wired but contributes nothing about THIS subject.
import * as path from "node:path";
import { CORBELL_CHECKOUT_REL } from "../populate-corbell.ts";
import type { ConsumerProbe, LayerFact } from "../layer-registry.ts";
import { probePath, storeFacts } from "./_shared.ts";

export function corbellProbe(scopeRoot: string): ConsumerProbe {
  const storePath = path.join(scopeRoot, CORBELL_CHECKOUT_REL);
  return {
    id: "L5_CORBELL",
    rung: "settlement",
    dependency: "the corbell parse-grade checkout (PRIMARY)",
    errorCode: "GI_LAYER_CORBELL",
    up: () => probePath(storePath, true),
    facts: (subject: string): LayerFact[] => storeFacts("L5_CORBELL", "settlement", storePath, subject),
  };
}
