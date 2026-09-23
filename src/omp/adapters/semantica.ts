// adapters/semantica — ★ L1 SEMANTICA → the DECISION rung.
//
// The semantica workspace + its KG store. ★ UNVERIFIED PATH (the register's own
// note): "no consumer in this repo reads their paths, and no tool on this host
// populates them (the semantica checkout is SOURCE, not a store)". The path may be
// right or wrong — it was NOT replaced with an invented one. Absent ⇒ DOWN, named.
import * as fs from "node:fs";
import * as path from "node:path";
import type { ConsumerProbe, LayerFact } from "../layer-registry.ts";
import { probePath } from "./_shared.ts";

interface SemanticaKg {
  entities?: Array<{ id?: string; name?: string; type?: string; source?: string }>;
}

export function semanticaProbe(scopeRoot: string): ConsumerProbe {
  const kgPath = path.join(scopeRoot, ".omp/graph-intelligence/layers/semantica/kg.json");
  const dir = path.join(scopeRoot, ".omp/graph-intelligence/layers/semantica");
  return {
    id: "L1_SEMANTICA",
    rung: "decision",
    dependency: "the semantica workspace + its KG store",
    errorCode: "GI_LAYER_SEMANTICA",
    // ★ AUDIT-CLASS FIX (the dir-vs-file hole): the first version probed the DIRECTORY, so
    //   a dir present with no kg.json read UP and then reported UNCONSUMED — a wiring-gap
    //   label over a missing substrate. The probe now asks for the FILE it actually reads.
    up: () => probePath(kgPath, true),
    facts: (subject: string): LayerFact[] => {
      // ★ GATE M-6 FIXED (the H-2 class, swept): a substrate fault THROWS.
      if (!fs.existsSync(kgPath)) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store is absent at ${kgPath}`);
      }
      let kg: SemanticaKg;
      try {
        kg = JSON.parse(fs.readFileSync(kgPath, "utf8")) as SemanticaKg;
      } catch (e) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store is unparseable — ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
      }
      const hits = (kg.entities ?? []).filter((e) => (e.name ?? "").includes(subject));
      return hits.map((e) => ({
        consumer: "L1_SEMANTICA" as const,
        rung: "decision" as const,
        subject,
        value: { type: e.type, name: e.name },
        source: `${kgPath}#entities(${e.id ?? e.name ?? "?"})`,
      }));
    },
  };
}
