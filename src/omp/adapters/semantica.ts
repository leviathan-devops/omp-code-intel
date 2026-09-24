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
  // ★ F-945 FIX (2026-09-24): split on BOTH separators — split(path.sep) missed `..`
  //   on Windows (sep `\\`, so `C:/foo/../etc` never split and the tripwire was bypassed).
  if (!path.isAbsolute(scopeRoot) || scopeRoot.split(/[/\\]/).includes("..")) throw new Error(`GI_LAYER_SEMANTICA: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  // ★ F-356 FIX (2026-09-24): symlink escape — `..` rejection stops lexical traversal
  //   but a symlinked ancestor inside scopeRoot resolves outside the tree and sails
  //   through path.join silently. Canonicalize through the live filesystem; when the
  //   path does not exist yet realpathSync throws and the unresolved form stands
  //   (the probe reports DOWN, never throws at construction).
  let resolvedRoot: string;
  // ★ F-706 FIX (2026-09-24): the catch fallback kept the UNRESOLVED path when
  //   scopeRoot did not exist yet — a symlink planted in the interim sailed
  //   through path.join silently. The intent-to-validate rides `needsRealpathCheck`
  //   and facts()/up() re-canonicalize at USE time (when the path exists).
  let needsRealpathCheck = false;
  try {
    resolvedRoot = fs.realpathSync(path.resolve(scopeRoot));
  } catch {
    resolvedRoot = path.resolve(scopeRoot);
    needsRealpathCheck = true;
  }
  const canonRoot = (): string => {
    if (!needsRealpathCheck) return resolvedRoot;
    try {
      resolvedRoot = fs.realpathSync(path.resolve(scopeRoot));
      needsRealpathCheck = false;
    } catch { /* still absent — keep the unresolved form, probe reports DOWN */ }
    return resolvedRoot;
  };
  const kgPathFor = (): string => path.join(canonRoot(), ".omp/graph-intelligence/layers/semantica/kg.json");
  return {
    id: "L1_SEMANTICA",
    rung: "decision",
    dependency: "the semantica workspace + its KG store",
    errorCode: "GI_LAYER_SEMANTICA",
    // ★ AUDIT-CLASS FIX (the dir-vs-file hole): the first version probed the DIRECTORY, so
    //   a dir present with no kg.json read UP and then reported UNCONSUMED — a wiring-gap
    //   label over a missing substrate. The probe now asks for the FILE it actually reads.
    // ★ F-706 (2026-09-24): resolve at USE time — a symlink planted after
    //   construction (when needsRealpathCheck was latched) is caught here.
    up: () => probePath(kgPathFor(), true),
    facts: (subject: string): LayerFact[] => {
      // ★ F-28 FIX (2026-09-24): existsSync-then-read is a TOCTOU pair — read directly, name the failure once.
      const liveKgPath = kgPathFor();
      let raw: string;
      try {
        raw = fs.readFileSync(liveKgPath, "utf8");
      } catch (e) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store is absent/unreadable at ${liveKgPath} — ${(e as NodeJS.ErrnoException).code ?? (e instanceof Error ? e.message.slice(0, 80) : String(e))}`);
      }
      let kg: SemanticaKg;
      try {
        kg = JSON.parse(raw) as SemanticaKg;
      } catch (e) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store is unparseable — ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
      }
      // ★ F-825 FIX (2026-09-24): runtime guard after JSON.parse — a corrupted or adversarially
      //   shaped kg.json where `entities` is a string/number/object (not an array) would cause
      //   an unguarded TypeError in .filter(). Validate the shape before consumption.
      if (kg !== null && typeof kg === "object" && !Array.isArray(kg) && kg.entities !== undefined && !Array.isArray(kg.entities)) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store has an invalid 'entities' field (expected array, got ${typeof kg.entities})`);
      }
      // ★ F-944 FIX (2026-09-24): per-element shape guard — F-825 validated the array
      //   but one corrupt entry (`{"name": 42}`, null) threw inside .filter() and failed
      //   the whole call. Bad entries skip; good ones still match.
      const hits = (kg.entities ?? []).filter((e) => {
        if (e === null || e === undefined || typeof e !== "object") return false;
        const nm: unknown = (e as { name?: unknown }).name;
        if (typeof nm !== "string") return false;
        return nm.includes(subject);
      });
      return hits.map((e) => ({
        consumer: "L1_SEMANTICA" as const,
        rung: "decision" as const,
        subject,
        value: { type: e.type, name: e.name },
        source: `${liveKgPath}#entities(${e.id ?? e.name ?? "?"})`,
      }));
    },
  };
}
