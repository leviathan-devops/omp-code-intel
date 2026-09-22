// layer-consumption — ★ D-1/D-2: THE ASSEMBLY + THE CONSUMPTION PROBE.
//
// This module is the ONE place the 8 edges are composed, and the ONE place a
// consumer of the registry gets its answers. It exists so that:
//
//   D-1  the REGISTER reports CONSUMPTION (not `up=5/11` on file existence)
//   D-2  the DECISION consults the REGISTRY (not a raw SQL query against a store)
//
// ★ WHY THE ASSEMBLY IS HERE AND NOT IN THE ADAPTERS: the 8 adapters are disjoint
// files that import ONLY the frozen interface (layer-registry.ts). This module is
// the single place that imports all 8. That is deliberate — it is the point where a
// missing import becomes a TYPE ERROR rather than a silently tree-shaken module.
// The measured failure this prevents: 12 of 23 src/omp modules were unreachable from
// the entry point, so bun tree-shook them and the deployed bundle carried zero v2.x
// symbols while every layer read "up".
import type { ConsumerId, ConsumerProbe, ConsumptionReport, LayerRegistry } from "./layer-registry.ts";
import { createLayerRegistry } from "./layer-registry.ts";
import { corbellProbe } from "./adapters/corbell.ts";
import { graphifyProbe } from "./adapters/graphify.ts";
import { c2kgProbe } from "./adapters/c2kg.ts";
import { uaProbe } from "./adapters/ua.ts";
import { arsumbrisProbe } from "./adapters/arsumbris.ts";
import { semanticaProbe } from "./adapters/semantica.ts";
import { tsgProbe } from "./adapters/tsg.ts";
import { abideProbe } from "./adapters/abide.ts";

/** ★ THE 8. The consumer set is CLOSED and named here — the registry cannot be
 *  built with a subset without this list changing. */
export const SIX_L2E_CONSUMERS: readonly ConsumerId[] = [
  "L1_SEMANTICA",
  "L2_ARSUMBRIS",
  "L3_UA",
  "L4_C2KG",
  "L5_CORBELL",
  "L6_GRAPHIFY",
  "TSG",
  "ABIDE",
];

/** Build the registry over every consumer. `overrides` lets a test replace ONE
 *  consumer's probe (the wiring seam) without rebuilding the other seven. */
export function buildRegistry(
  scopeRoot: string,
  overrides?: Partial<Record<ConsumerId, ConsumerProbe>>,
): LayerRegistry {
  const registry = createLayerRegistry();
  const probes: ConsumerProbe[] = [
    corbellProbe(scopeRoot),
    graphifyProbe(scopeRoot),
    c2kgProbe(scopeRoot),
    uaProbe(scopeRoot),
    arsumbrisProbe(),
    semanticaProbe(scopeRoot),
    tsgProbe(scopeRoot),
    abideProbe(scopeRoot),
  ];
  for (const p of probes) {
    const override = overrides?.[p.id];
    registry.register(override ?? p);
  }
  // ★ A CLOSED SET: registering anything outside SIX_L2E_CONSUMERS is a wiring bug,
  //   not a feature. This assertion is what makes "8 consumers" checkable.
  const missing = SIX_L2E_CONSUMERS.filter((id) => !registry.consumers().some((c) => c.id === id));
  if (missing.length > 0) {
    throw new Error(`GI_REGISTRY_INCOMPLETE: no probe registered for ${missing.join(",")}`);
  }
  return registry;
}

export interface ConsumptionAudit {
  scopeRoot: string;
  subject: string;
  reports: ConsumptionReport[];
  /** the consumers that contributed ≥1 anchored fact */
  influenced: ConsumerId[];
  /** ★ THE ONLY GREEN LINE: `consumed:N/8 rungs=…` */
  summary: string;
  /** every consumer that is NOT consumed, with its reason — the loud remainder */
  offenders: Array<{ consumer: ConsumerId; verdict: ConsumptionReport["verdict"]; evidence: string }>;
}

/** ★ THE PROBE (D-1). Ask every consumer for one subject and report CONSUMPTION.
 *
 *  ★ AUDIT FINDING FIXED (2026-09-22): the first version evaluated the registry THREE
 *  times (audit + decisionsInfluenced→factsFor + summary→audit), tripling the probe I/O
 *  (each store-backed probe re-opens the DB) and letting the summary, the influenced set
 *  and the reports DISAGREE if a substrate changed mid-call (TOCTOU). ONE snapshot now
 *  feeds all three. */
export function consumptionAudit(scopeRoot: string, subject: string): ConsumptionAudit {
  const registry = buildRegistry(scopeRoot);
  const reports = registry.audit(subject);
  const influenced = reports.filter((r) => r.consumed).map((r) => r.consumer);
  const consumed = reports.filter((r) => r.consumed);
  const down = reports.filter((r) => r.verdict === "GI_LAYER_DOWN");
  const unconsumed = reports.filter((r) => r.verdict === "GI_LAYER_UNCONSUMED");
  const parts = [
    `consumed:${consumed.length}/${reports.length}`,
    `rungs=${[...new Set(consumed.map((r) => r.rung))].sort().join(",") || "none"}`,
  ];
  if (unconsumed.length > 0) parts.push(`GI_LAYER_UNCONSUMED=${unconsumed.map((r) => r.consumer).join(",")}`);
  if (down.length > 0) parts.push(`GI_LAYER_DOWN=${down.map((r) => r.consumer).join(",")}`);
  return {
    scopeRoot,
    subject,
    reports,
    influenced,
    summary: parts.join(" "),
    offenders: reports
      .filter((r) => !r.consumed)
      .map((r) => ({ consumer: r.consumer, verdict: r.verdict, evidence: r.evidence })),
  };
}
