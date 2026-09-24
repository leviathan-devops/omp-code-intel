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
  // ★ F-27 FIX (2026-09-24): scopeRoot reaches the fs — canonical absolute form only (`..` segments would let `/allowed/../../etc` escape the intended tree; path.join normalizes them away silently).
  if (!path.isAbsolute(scopeRoot) || scopeRoot.split(path.sep).includes("..")) throw new Error(`GI_LAYER_SEMANTICA: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  const kgPath = path.join(path.resolve(scopeRoot), ".omp/graph-intelligence/layers/semantica/kg.json");
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
      // ★ F-28 FIX (2026-09-24): existsSync-then-read is a TOCTOU pair — read directly, name the failure once.
      let raw: string;
      try {
        raw = fs.readFileSync(kgPath, "utf8");
      } catch (e) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store is absent/unreadable at ${kgPath} — ${(e as NodeJS.ErrnoException).code ?? (e instanceof Error ? e.message.slice(0, 80) : String(e))}`);
      }
      let kg: SemanticaKg;
      try {
        kg = JSON.parse(raw) as SemanticaKg;
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
