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
import { assertStoreFresh, probePath, storeFacts } from "./_shared.ts";

export function corbellProbe(scopeRoot: string): ConsumerProbe {
  // ★ R20-HIGH FIX (2026-09-25): scopeRoot was joined RAW — a `..` segment (or a relative form)
  //   could probe a location outside the intended scope. Normalize + require an ABSOLUTE path; a
  //   non-absolute input is a caller bug, refused LOUD (the probe is a read surface, not a resolver).
  if (!path.isAbsolute(scopeRoot)) throw new Error(`GI_LAYER_CORBELL: scopeRoot must be absolute, got '${scopeRoot.slice(0, 120)}'`);
  const normalizedRoot = path.resolve(scopeRoot);
  const storePath = path.join(normalizedRoot, CORBELL_CHECKOUT_REL);
  return {
    id: "L5_CORBELL",
    rung: "settlement",
    dependency: "the corbell parse-grade checkout (PRIMARY)",
    errorCode: "GI_LAYER_CORBELL",
    up: () => {
      // ★ R20-HIGH FIX (2026-09-25): `up` checked only EXISTENCE — a STALE store read as UP, and a
      //   caller that gates on up() alone would then hit the facts() throw. A stale store is not a
      //   USABLE substrate for this run, so up() now enforces freshness too (a stale store is UP:
      //   false with the reason), keeping the liveness signal honest.
      const probe = probePath(storePath, true);
      if (!probe.up) return probe;
      try {
        assertStoreFresh(storePath);
        return probe;
      } catch (e) {
        return { up: false, evidence: `${storePath} (${e instanceof Error ? e.message : String(e)})` };
      }
    },
    facts: (subject: string): LayerFact[] => {
      // ★ DPL1 §7 A3: refuse a verdict from a STALE store.
      assertStoreFresh(storePath);
      return storeFacts("L5_CORBELL", "settlement", storePath, subject);
    },
  };
}
