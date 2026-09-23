// ★ D-2 — THE DECISION CONSULTS THE REGISTRY (the goal's D-2 layer-edge).
//
// THE DEFECT THIS CLOSES (measured 2026-09-23, the dist-content gate):
//   the deployed bundle carried ZERO kernel symbols —
//     dumbDetector=0 · theatricalDetector=0 · classifyByDetectors=0 · runKernelV2=0 ·
//     preflight=0 · FireGate=0 · FireLedger=0 · PolicyStore=0
//   — because the kernel was reached ONLY through TYPE-ONLY imports across the production
//   graph (`layer-registry.ts:22  import type { LayerId } from "./kernel-v2.ts"`), which the
//   bundler ERASES. The extension exposed the REGISTRY (consumptionAudit) but never the
//   DECISION — so the artifact that runs could not decide. This module is the value-wired
//   seam: the extension calls `decideFromRegistry`, so the bundler KEEPS the kernel, and the
//   kernel's layer declarations come FROM THE REGISTRY (never a raw store, never a file check).
//
// ★ THE LAYER-EDGE (the goal's contract): every one of the 6 graph layers is an INPUT to
//   THIS decision. A layer that is down refuses the stack with its NAMED code; a layer that
//   is up but silent contributes no certification. The verdict is the kernel's, and it cites
//   the registry's own evidence.

import { buildRegistry, SIX_L2E_CONSUMERS } from "./layer-consumption.ts";
import type { ConsumerId, LayerFact } from "./layer-registry.ts";
import { runKernelV2, type KernelRun, type LayerDeclaration, type LayerId, type Verdict } from "./kernel-v2.ts";
import * as path from "node:path";
import { graphFacts, type GraphFactInput, type GraphFactVerdict } from "./graph-facts.ts";
import { FireLedger } from "./fire-ledger.ts";
import { PolicyStore, DEFAULT_POLICY_FILE } from "./policy-store.ts";
import { corbellCheckoutPath } from "./populate-corbell.ts";

/** The 6 graph layers the kernel's PREFLIGHT asks. TSG + ABIDE are KERNELS, not layers —
 *  they ride as certifications, never as preflight dependencies. */
const LAYER_IDS: readonly LayerId[] = [
  "L1_SEMANTICA",
  "L2_ARSUMBRIS",
  "L3_UA",
  "L4_C2KG",
  "L5_CORBELL",
  "L6_GRAPHIFY",
];

/** The act under decision. Mirrors the kernel's DetectorContext fields it can know from here. */
export interface DecisionAct {
  toolName: string;
  target: string;
  /** Did this session query/read the target BEFORE the act? (the dumb signal) */
  queriedBefore: boolean;
  claims?: Array<{ text: string; spans: number }>;
}

export interface DecisionEvidence {
  subject: string;
  scopeRoot: string;
  /** The layer consumers the registry supplied to the preflight. */
  layersWired: number;
  /** Every consumer the registry knows (the closed set of 8). */
  consumersTotal: number;
  /** The anchored facts the registry contributed about `subject` (the decision's inputs). */
  facts: LayerFact[];
  /** Which consumers contributed >=1 anchored fact. */
  influenced: ConsumerId[];
  /** ★ THE VERDICT — the kernel's, over the registry's declarations. */
  run: KernelRun;
}

/** ★ THE DECISION. It consults the REGISTRY — never a raw store, never a file check.
 *
 *  Chain: registry (8 consumers) → the 6 layers become the kernel's LayerDeclaration[]
 *  (their `up()`/`evidence` are the preflight's subject) → the registry's ANCHORED facts
 *  become the certifications the detectors read → `runKernelV2` returns the verdict.
 *
 *  A layer DOWN → `GI_STACK_INCOMPLETE:<id>` (the kernel's own refusal). A wired-but-silent
 *  layer → NO certification from it (it never inflates the decision). NEVER an empty pass. */
export function decideFromRegistry(scopeRoot: string, subject: string, act: DecisionAct): DecisionEvidence {
  const registry = buildRegistry(scopeRoot);

  // The registry's facts for this subject — the decision's evidence base. `factsFor`
  // already filters to ANCHORED facts (an empty `source` is discarded by the registry).
  const facts = registry.factsFor(subject);
  const influenced = [...new Set(facts.map((f) => f.consumer))];

  // ★ THE LAYER-EDGE: the kernel's layer declarations come FROM THE REGISTRY.
  //   `consumer.up()` is asked at decision time — the decision reads reality, not a cache.
  const layers: LayerDeclaration[] = registry
    .consumers()
    .filter((c) => (LAYER_IDS as readonly string[]).includes(c.id))
    .map((c) => ({
      id: c.id as LayerId,
      dependency: c.dependency,
      errorCode: c.errorCode,
      probe: () => {
        const s = c.up();
        return { up: s.up, evidence: s.evidence };
      },
    }));

  // The registry's anchored facts become the certifications the detectors weigh.
  const certifications = facts.map((f) => ({
    layer: f.consumer as LayerId,
    verdict: "PASS" as Verdict,
    reason: `${f.source}`,
  }));

  const run = runKernelV2({
    toolName: act.toolName,
    target: act.target,
    queriedBefore: act.queriedBefore,
    claims: act.claims ?? [],
    certifications,
    layers,
  });

  return {
    subject,
    scopeRoot,
    layersWired: layers.length,
    consumersTotal: SIX_L2E_CONSUMERS.length,
    facts,
    influenced,
    run,
  };
}

/** ★ THE L5/L6 WIRE — "the decision reads the parse-grade graph" (the DPL1's layer table).
 *  The FireGate's ladder is graph → MPSE → cache → Jev: the graph answers FACTS and a fact
 *  is never worth a model call. This is that rung, composed so the extension carries it. */
export interface FireEvidence {
  storePath: string;
  target: string;
  intent: GraphFactInput["intent"];
  verdicts: GraphFactVerdict[];
  /** True when the graph settled the fire — no model call was needed. */
  settles: boolean;
  /** The verdicts that demanded a FIRE (a real violation the graph found). */
  fires: number;
  policyCount: number;
  policySource: string;
  ledgerPath: string;
  /** ★ THE RECORD — a live FireLedger. The caller appends; nothing here fabricates a row. */
  ledger: FireLedger;
}

/** ★ THE DECISION READS THE PARSE-GRADE GRAPH (L5 CORBELL, and L6 via the same store).
 *  `graphFacts` is handed the TYPED STORE — absent ⇒ it says so (never a silent pass).
 *  The policy comes from the PolicyStore (the seed policy set is the NAMED fallback);
 *  the record is a FireLedger on disk (an in-memory ledger throws — it is not a ledger). */
export function decideFireFromGraph(
  scopeRoot: string,
  target: string,
  intent: GraphFactInput["intent"],
): FireEvidence {
  const storePath = corbellCheckoutPath(scopeRoot);
  const verdicts = graphFacts({ storePath, target, intent });
  const settles = verdicts.some((v) => v.settles);
  const fires = verdicts.filter((v) => v.action === "FIRE").length;

  const policyPath = path.join(scopeRoot, ".omp", "graph-intelligence", "policy.json");
  let policyCount = Object.keys(DEFAULT_POLICY_FILE.policies).length;
  let policySource = "the seed policy set (no policy.json on disk — the named fallback)";
  try {
    const store = new PolicyStore(policyPath);
    policyCount = Object.keys(store.all()).length;
    policySource = policyPath;
  } catch {
    // the seed set stands; `policySource` NAMES that, so the count is never anonymous
  }

  const ledgerPath = path.join(scopeRoot, ".omp", "graph-intelligence", "fire-decisions.db");
  const ledger = new FireLedger(ledgerPath);

  return { storePath, target, intent, verdicts, settles, fires, policyCount, policySource, ledgerPath, ledger };
}

