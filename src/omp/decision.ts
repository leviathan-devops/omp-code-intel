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
import * as fs from "node:fs";
import { graphFacts, type GraphFactInput, type GraphFactVerdict } from "./graph-facts.ts";
import type { DecisionRow } from "./fire-gate.ts";
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

/** ★ AUDIT HIGH #1 (2026-09-23) — the certification FILTER, as a pure function so the rule is
 *  testable without a substrate. `registry.factsFor` returns facts from EVERY consumer,
 *  including the 2 KERNEL consumers (TSG, ABIDE) which are NOT `LayerId`s. Only a LAYER may
 *  certify a layer: a kernel's fact, cast as a LayerId, is an invalid certification. */
export function layerCertifications(
  facts: readonly LayerFact[],
): Array<{ layer: LayerId; verdict: Verdict; reason: string }> {
  const layerIdList: string[] = [...LAYER_IDS];
  return facts
    .filter((f) => layerIdList.includes(f.consumer))
    .map((f) => ({
      layer: f.consumer as LayerId,
      verdict: "PASS" as Verdict,
      reason: `${f.source}`,
    }));
}

/** ★ THE DECISION. It consults the REGISTRY — never a raw store, never a file check.
 *
 *  Chain: registry (8 consumers) → the 6 layers become the kernel's LayerDeclaration[]
 *  (their `up()`/`evidence` are the preflight's subject) → the registry's ANCHORED facts
 *  become the certifications the detectors read → `runKernelV2` returns the verdict.
 *
 *  A layer DOWN → `GI_STACK_INCOMPLETE:<id>` (the kernel's own refusal). A wired-but-silent
 *  layer → NO certification from it (it never inflates the decision). NEVER an empty pass. */
export function decideFromRegistry(
  scopeRoot: string,
  subject: string,
  act: DecisionAct,
  record?: (run: KernelRun) => void,
): DecisionEvidence {
  // ★ AUDIT HIGH (W5, 2026-09-23): NO input validation — an empty/undefined scopeRoot or subject
  //   silently propagated into buildRegistry + factsFor, producing a verdict about nothing.
  //   FAIL FAST with a named error: a decision must name its inputs.
  if (typeof scopeRoot !== "string" || scopeRoot.trim().length === 0) {
    throw new Error("GI_DECIDE_BAD_INPUT: scopeRoot must be a non-empty string");
  }
  if (typeof subject !== "string" || subject.trim().length === 0) {
    throw new Error("GI_DECIDE_BAD_INPUT: subject must be a non-empty string");
  }
  if (act === null || typeof act !== "object") {
    throw new Error("GI_DECIDE_BAD_INPUT: act must be an object");
  }
  // ★ F-1 FIX (2026-09-24): `act` carried three REQUIRED fields the kernel reads
  //   (`toolName`, `target`, `queriedBefore`) with no validation — `{}` made the
  //   dumb detector report "blind" (undefined is falsy) and printed "undefined" in
  //   evidence. Same typeof+emptiness discipline as scopeRoot/subject above.
  const a = act as { toolName?: unknown; target?: unknown; queriedBefore?: unknown };
  if (typeof a.toolName !== "string" || a.toolName.trim().length === 0) {
    throw new Error("GI_DECIDE_BAD_INPUT: act.toolName must be a non-empty string");
  }
  if (typeof a.target !== "string" || a.target.trim().length === 0) {
    throw new Error("GI_DECIDE_BAD_INPUT: act.target must be a non-empty string");
  }
  if (typeof a.queriedBefore !== "boolean") {
    throw new Error("GI_DECIDE_BAD_INPUT: act.queriedBefore must be a boolean (undefined would silently read as blind)");
  }
  // ★ F-907 FIX (2026-09-24): scopeRoot flows into path.join for store/ledger/policy paths — a relative traversal (../../etc) would escape the .omp tree. Canonical absolute form required (absolute + no .. on either separator + no NUL), mirroring store-open.ts/ua.ts; any absolute root (tmp, repo) still passes. Both entry points carry it.
  if (!path.isAbsolute(scopeRoot) || scopeRoot.split(/[\\/]/).includes("..") || scopeRoot.includes("\0")) {
    throw new Error(`GI_DECIDE_BAD_INPUT: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  }
  const registry = buildRegistry(scopeRoot);

  // The registry's facts for this subject — the decision's evidence base. `factsFor`
  // already filters to ANCHORED facts (an empty `source` is discarded by the registry).
  const facts = registry.factsFor(subject);
  // the distinct consumers behind the facts (dynamic membership → Set, per the project rule)
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
  // ★ AUDIT HIGH (2026-09-23): `factsFor` iterates EVERY consumer — including the 2 KERNEL
  //   consumers TSG + ABIDE, which are NOT `LayerId`s. The first version cast `f.consumer as
  //   LayerId` for all of them, so a TSG/ABIDE fact produced a certification with an INVALID
  //   layer value. ONLY layer consumers may certify a layer.
  const certifications = layerCertifications(facts);

  const run = runKernelV2({
    toolName: act.toolName,
    target: act.target,
    queriedBefore: act.queriedBefore,
    claims: act.claims ?? [],
    certifications,
    layers,
    record,
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
  // ★ AUDIT HIGH (W5 re-audit, 2026-09-23): the SAME missing-validation class as
  //   `decideFromRegistry` — found by the re-audit AFTER the sibling was guarded. An empty
  //   scopeRoot/target silently propagated into the store path + the ledger path. A guard here
  //   keeps the two entry points SYMMETRIC: every public decision names its inputs.
  if (typeof scopeRoot !== "string" || scopeRoot.trim().length === 0) {
    throw new Error("GI_DECIDE_BAD_INPUT: scopeRoot must be a non-empty string");
  }
  if (typeof target !== "string" || target.trim().length === 0) {
    throw new Error("GI_DECIDE_BAD_INPUT: target must be a non-empty string");
  }
  // ★ F-843 FIX (2026-09-24): `intent` was the one unvalidated public input — TypeScript's union does not stop `undefined` at runtime, which sailed into graphFacts, matched NO M-GRAPH branch, and returned an empty fact set dressed as "the graph has no fact". Same fail-fast discipline as scopeRoot/target above.
  if (intent !== "consume" && intent !== "declare" && intent !== "mutate" && intent !== "measure") {
    throw new Error(`GI_DECIDE_BAD_INPUT: intent must be one of consume|declare|mutate|measure (got ${String(intent)})`);
  }
  // ★ F-907 FIX (2026-09-24): same traversal hole as decideFromRegistry — symmetric guard so both entry points name a bad scopeRoot instead of joining it into store/ledger/policy paths.
  if (!path.isAbsolute(scopeRoot) || scopeRoot.split(/[\\/]/).includes("..") || scopeRoot.includes("\0")) {
    throw new Error(`GI_DECIDE_BAD_INPUT: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  }
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
  } catch (e) {
    // ★ AUDIT MEDIUM #1 (2026-09-23): this catch was EMPTY — it swallowed EVERY error the
    //   PolicyStore throws, so a MALFORMED or unreadable `policy.json` silently fell back to
    //   the seed set and no caller could tell "no policy file" from "a broken one". The seed
    //   set is the NAMED fallback for the ABSENT-FILE case ONLY; any OTHER failure is LOUD
    //   (policySource carries the error), so an operator sees a broken policy, never a
    //   silent substitution.
    if (fs.existsSync(policyPath)) {
      const msg = e instanceof Error ? e.message : String(e);
      policySource = `POLICY_INVALID: ${policyPath} (${msg}) — the seed set stands, LOUDLY`;
    }
    // else: the file is genuinely absent → the seed set IS the documented fallback
  }

  const ledgerPath = path.join(scopeRoot, ".omp", "graph-intelligence", "fire-decisions.db");
  // ★ THE FRESH-SCOPE FIX (2026-09-23, found in the omp-ct TUI): `gi-decide` with a
  //   scopeRoot that had never hosted the kernel FAILED with
  //   `GI_LEDGER_OPEN_FAILED: cannot open or migrate the fire ledger at
  //    /tmp/.omp/graph-intelligence/fire-decisions.db (unable to open database file)`
  //   — the ledger's DIRECTORY did not exist and FireLedger opens the path directly.
  //   A decision must never fail because its RECORD had nowhere to live: create the dir.
  const ledgerDir = path.dirname(ledgerPath);
  try {
    fs.mkdirSync(ledgerDir, { recursive: true });
  } catch (e) {
    // ★ AUDIT MEDIUM #2 (2026-09-23): the call was unguarded, so a read-only filesystem or a
    //   permission denial escaped this function as an UNCAUGHT throw — while its contract is
    //   to return a `FireEvidence`. A named error keeps the contract.
    throw new Error(`GI_LEDGER_DIR_FAILED: cannot create ${ledgerDir} (${e instanceof Error ? e.message : String(e)})`);
  }
  const ledger = new FireLedger(ledgerPath);

  return { storePath, target, intent, verdicts, settles, fires, policyCount, policySource, ledgerPath, ledger };
}

