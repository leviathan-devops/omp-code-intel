// kernel-v2 — GI Kernel v2.0 THE STAGE MACHINE (T-3) + THE THREE DETECTORS (T-4).
//
// v1.3's gate answered ONE question — "is this act safe?" — from a regex severity
// and a drift ratio. v2.0 answers THREE (T-4):
//
//   DESTRUCTIVE  is this act safe?          (the six layers certify)
//   DUMB         did the agent look first?  (grounding preconditions)
//   THEATRICAL   did the agent lie?         (claim <-> evidence binding)
//
// The three are ONE interface (`Detector`) so a fourth can be added without
// touching the pipeline, and each answers PASS | VIOLATION | UNCERTIFIABLE.
//
// THE LAW THIS FILE ENFORCES (T-6 / OR-1): NO FALLBACKS. Every layer and every
// detector DECLARES its hard dependency. STAGE 0 PREFLIGHT asks each one, and a
// single DOWN answer refuses the act with `GI_STACK_INCOMPLETE:<id>` — never a
// degraded mode, never a substitute engine. UNCERTIFIABLE is NOT a pass.
import * as fs from "node:fs";

// ── the six graph layers (T-1 namespaces them in the store) ──────────────────
export type LayerId =
  | "L1_SEMANTICA"
  | "L2_ARSUMBRIS"
  | "L3_UA"
  | "L4_C2KG"
  | "L5_CORBELL"
  | "L6_GRAPHIFY";

export type StageId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface LayerProbe {
  up: boolean;
  /** The evidence the layer answers with — a path that exists, a count, a code.
   *  A probe that cannot state its evidence is DOWN by construction. */
  evidence: string;
}

export interface LayerDeclaration {
  id: LayerId;
  /** WHAT this layer cannot run without, named. Never "optional". */
  dependency: string;
  /** The loud code raised when the dependency is absent. */
  errorCode: string;
  probe: () => LayerProbe;
}

export interface PreflightResult {
  ok: boolean;
  /** null when every layer is up; `GI_STACK_INCOMPLETE:<id>` otherwise. */
  code: string | null;
  offenders: Array<{ id: LayerId; dependency: string; errorCode: string; evidence: string }>;
  up: LayerId[];
}

/** STAGE 0 — ask EVERY layer. One DOWN answer refuses the whole stack.
 *  Ordering is stable and the result names every offender, so an operator sees
 *  the full outage in one line rather than discovering layers one restart apart. */
export function preflight(layers: readonly LayerDeclaration[]): PreflightResult {
  const offenders: PreflightResult["offenders"] = [];
  const up: LayerId[] = [];
  for (const l of layers) {
    let probe: LayerProbe;
    try {
      probe = l.probe();
    } catch (e) {
      // A probe that THROWS is DOWN. Silence is never UP.
      probe = { up: false, evidence: e instanceof Error ? e.message : String(e) };
    }
    if (probe.up) up.push(l.id);
    else offenders.push({ id: l.id, dependency: l.dependency, errorCode: l.errorCode, evidence: probe.evidence });
  }
  if (offenders.length > 0) {
    return { ok: false, code: `GI_STACK_INCOMPLETE:${offenders[0]!.id}`, offenders, up };
  }
  return { ok: true, code: null, offenders, up };
}

/** A layer whose dependency is a path on disk — the common case (a checkout, a
 *  store, a daemon socket). Absent path ⇒ DOWN with the path as its evidence. */
export function fileLayer(
  id: LayerId,
  dependency: string,
  errorCode: string,
  path: string,
): LayerDeclaration {
  return {
    id,
    dependency,
    errorCode,
    probe: () => {
      try {
        const st = fs.statSync(path);
        return { up: st.isFile() || st.isDirectory(), evidence: `${path} (${st.isDirectory() ? "dir" : "file"})` };
      } catch (e) {
        const c = (e as NodeJS.ErrnoException).code ?? "ERR";
        return { up: false, evidence: `${path} (${c})` };
      }
    },
  };
}

// ── the three classes (T-4) ─────────────────────────────────────────────────
export type ActClass = "destructive" | "dumb" | "theatrical" | "benign";
export type Verdict = "PASS" | "VIOLATION" | "UNCERTIFIABLE";
export type Tier = "T0" | "T1" | "T2" | "T3";

export interface DetectorContext {
  toolName: string;
  target: string;
  /** Did this session query/read the target BEFORE the act? (the dumb signal) */
  queriedBefore: boolean;
  /** Claims in flight with how many evidence spans bind to each. (theatrical) */
  claims: Array<{ text: string; spans: number }>;
  /** The layers' certifications for a destructive act. */
  certifications: Array<{ layer: LayerId; verdict: Verdict; reason: string }>;
}

export interface DetectorVerdict {
  verdict: Verdict;
  tier: Tier;
  reason: string;
  evidence: string;
}

/** ONE interface for every class. A detector states which class it owns and
 *  answers; the pipeline never special-cases a detector by name. */
export interface Detector {
  id: string;
  class: ActClass;
  detect(ctx: DetectorContext): DetectorVerdict;
}

const PASS: DetectorVerdict = { verdict: "PASS", tier: "T0", reason: "no signal", evidence: "" };

/** DUMB — the act has no prior look at its target. The v1 lineage replaces the
 *  parked `basic-logic-check.md` regex ("let me guess") with a FACT read off the
 *  execution record: was the symbol queried before the edit? A fact cannot be
 *  phrased around; a phrase can. */
export const dumbDetector: Detector = {
  id: "dumb.grounding-precondition",
  class: "dumb",
  detect(ctx) {
    if (ctx.queriedBefore) return { ...PASS, reason: "target was queried before the act" };
    return {
      verdict: "VIOLATION",
      tier: "T1",
      reason: `no graph query on '${ctx.target}' before the act — the edit is blind`,
      evidence: `execution record: queried_before=false for target='${ctx.target}' tool='${ctx.toolName}'`,
    };
  },
};

/** THEATRICAL — a claim with ZERO bound evidence spans. The firewall's cheapest
 *  gate: a claim that cannot be bound is FABRICATED by code alone, and no model
 *  is consulted. Replaces `anti-theatrical.md` + `verification-before-declaration.md`. */
export const theatricalDetector: Detector = {
  id: "theatrical.claim-without-span",
  class: "theatrical",
  detect(ctx) {
    const unbound = ctx.claims.filter((c) => c.spans === 0);
    if (unbound.length === 0) return { ...PASS, reason: "every claim carries at least one bound span" };
    const first = unbound[0]!;
    return {
      verdict: "VIOLATION",
      tier: "T2",
      reason: `claim has ZERO bound evidence spans: "${first.text.slice(0, 80)}"`,
      evidence: `claims=${ctx.claims.length} unbound=${unbound.length} spans[0]=0`,
    };
  },
};

/** DESTRUCTIVE — the six layers' certification. A layer that cannot answer is
 *  UNCERTIFIABLE, which is NOT a pass (T-6). */
export const destructiveDetector: Detector = {
  id: "destructive.layer-certification",
  class: "destructive",
  detect(ctx) {
    if (ctx.certifications.length === 0) {
      return {
        verdict: "UNCERTIFIABLE",
        tier: "T2",
        reason: "no layer certified this act — nothing to stand on",
        evidence: "certifications=0",
      };
    }
    const v = ctx.certifications.find((c) => c.verdict !== "PASS");
    if (v === undefined) return { ...PASS, reason: `all ${ctx.certifications.length} layers certified` };
    if (v.verdict === "VIOLATION") {
      return {
        verdict: "VIOLATION",
        tier: "T2",
        reason: `${v.layer}: ${v.reason}`,
        evidence: `certifications=${ctx.certifications.length} first_non_pass=${v.layer}:${v.verdict}`,
      };
    }
    return {
      verdict: "UNCERTIFIABLE",
      tier: "T2",
      reason: `${v.layer} could not certify: ${v.reason}`,
      evidence: `certifications=${ctx.certifications.length} first_non_pass=${v.layer}:UNCERTIFIABLE`,
    };
  },
};

export const DEFAULT_DETECTORS: readonly Detector[] = [dumbDetector, theatricalDetector, destructiveDetector];

/** The class of an act is derived from WHICH detector fires, never supplied by
 *  the caller — so a caller cannot mislabel its own act into a lighter class. */
export function classifyByDetectors(
  detectors: readonly Detector[],
  ctx: DetectorContext,
): Array<{ detector: Detector; outcome: DetectorVerdict }> {
  return detectors.map((d) => {
    let outcome: DetectorVerdict;
    try {
      outcome = d.detect(ctx);
    } catch (e) {
      // A detector that throws is UNCERTIFIABLE — never a silent PASS.
      outcome = {
        verdict: "UNCERTIFIABLE",
        tier: "T2",
        reason: `detector ${d.id} threw`,
        evidence: e instanceof Error ? e.message : String(e),
      };
    }
    return { detector: d, outcome };
  });
}

// ── THE STAGE MACHINE ───────────────────────────────────────────────────────
export interface StageRecord {
  stage: StageId;
  name: string;
  outcome: string;
  detail: string;
}

export interface KernelRun {
  stages: StageRecord[];
  verdict: "ALLOW" | "STEER" | "REFUSE" | "ABORT";
  code: string | null;
  class: ActClass;
  reason: string;
  evidence: string;
}

export interface KernelInput {
  toolName: string;
  target: string;
  queriedBefore: boolean;
  claims: Array<{ text: string; spans: number }>;
  certifications: Array<{ layer: LayerId; verdict: Verdict; reason: string }>;
  layers: readonly LayerDeclaration[];
  detectors?: readonly Detector[];
  /** Optional sink for the RECORD stage — the enforcement ledger. */
  record?: (run: KernelRun) => void;
}

const TIER_ORDER: Record<Tier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };
const VERDICT_RANK: Record<Verdict, number> = { PASS: 0, UNCERTIFIABLE: 1, VIOLATION: 2 };

/** Run STAGE 0..6 in order, cheapest first, and refuse the moment the stack
 *  cannot answer. Every stage's outcome is recorded so the refusal is
 *  explainable and a test can assert the stage ran. */
export function runKernelV2(input: KernelInput): KernelRun {
  const stages: StageRecord[] = [];
  const detectors = input.detectors ?? DEFAULT_DETECTORS;

  // STAGE 0 — PREFLIGHT. The whole stack or nothing.
  const pre = preflight(input.layers);
  stages.push({
    stage: 0,
    name: "PREFLIGHT",
    outcome: pre.ok ? "UP" : "REFUSE",
    detail: pre.ok ? `${pre.up.length} layer(s) up` : `${pre.offenders.length} layer(s) DOWN: ${pre.offenders.map((o) => o.id).join(",")}`,
  });
  if (!pre.ok) {
    const reason = pre.offenders
      .map((o) => `${o.errorCode} (${o.id} needs ${o.dependency}; ${o.evidence})`)
      .join(" | ");
    return finish(stages, "REFUSE", pre.code, "benign", reason, `offenders=${pre.offenders.length}`);
  }

  // STAGE 1 — CLASSIFY + STAGE 3 — DETECT (the detectors both classify and judge).
  const outcomes = classifyByDetectors(detectors, input);
  stages.push({
    stage: 1,
    name: "CLASSIFY",
    outcome: "OK",
    detail: `3 classes asked (dumb|theatrical|destructive)`,
  });

  // STAGE 2 — BIND + INDEX (the claims' spans are already bound by the record;
  // the stage asserts the binding EXISTED rather than performing it here).
  stages.push({
    stage: 2,
    name: "BIND+INDEX",
    outcome: "OK",
    detail: `claims=${input.claims.length} bound=${input.claims.filter((c) => c.spans > 0).length}`,
  });

  stages.push({
    stage: 3,
    name: "DETECT",
    outcome: outcomes.some((o) => o.outcome.verdict !== "PASS") ? "SIGNAL" : "CLEAN",
    detail: outcomes.map((o) => `${o.detector.class}:${o.outcome.verdict}`).join(" "),
  });

  // STAGE 4 — KERNEL: the worst verdict wins, and a tie takes the worst class
  // by the fixed order destructive > theatrical > dumb (a safety tie never
  // resolves toward the lighter class).
  const worst = outcomes.reduce((a, b) => {
    const va = VERDICT_RANK[a.outcome.verdict];
    const vb = VERDICT_RANK[b.outcome.verdict];
    if (vb > va) return b;
    if (vb === va && a.outcome.verdict !== "PASS" && b.outcome.verdict !== "PASS") {
      const order: Record<ActClass, number> = { destructive: 3, theatrical: 2, dumb: 1, benign: 0 };
      if (order[b.detector.class] > order[a.detector.class]) return b;
    }
    return a;
  });
  stages.push({
    stage: 4,
    name: "KERNEL",
    outcome: worst.outcome.verdict,
    detail: `${worst.detector.id} (${worst.detector.class})`,
  });

  // STAGE 5 — VERDICT. UNCERTIFIABLE refuses; PASS steers only if a T1 signal
  // was present, otherwise allows.
  let verdict: KernelRun["verdict"];
  if (worst.outcome.verdict === "VIOLATION") {
    verdict = TIER_ORDER[worst.outcome.tier] >= TIER_ORDER["T2"] ? "REFUSE" : "STEER";
  } else if (worst.outcome.verdict === "UNCERTIFIABLE") {
    verdict = "REFUSE"; // T-6: uncertifiable is NOT a pass
  } else {
    verdict = "ALLOW";
  }
  stages.push({
    stage: 5,
    name: "VERDICT",
    outcome: verdict,
    detail: worst.outcome.reason,
  });

  // A run where EVERY detector passed is BENIGN — not "the first detector's
  // class". Labelling a clean act by whichever detector happened to be first
  // was a real mis-report (caught by st-gi-v2-gate): an untouched act has no
  // violation class at all.
  const cleanRun = worst.outcome.verdict === "PASS";
  const code = cleanRun
    ? null
    : worst.detector.class === "destructive"
      ? "GI_VIOLATION"
      : worst.detector.class === "theatrical"
        ? "GI_FABRICATED_CLAIM"
        : "GI_BLIND_ACT";
  const run = finish(
    stages,
    verdict,
    code,
    cleanRun ? "benign" : worst.detector.class,
    worst.outcome.reason,
    worst.outcome.evidence,
  );

  // STAGE 6 — RECORD. Optional sink; the run is returned regardless so a caller
  // that has no ledger yet still gets an explainable verdict.
  stages.push({ stage: 6, name: "RECORD", outcome: input.record ? "WRITTEN" : "SKIPPED", detail: input.record ? "enforcement ledger" : "no sink supplied" });
  if (input.record) {
    try {
      input.record(run);
    } catch (e) {
      // The RECORD stage failing must not silently drop the verdict — it is
      // reported on the run itself (T-6: a silent catch is the dangerous class).
      run.stages.push({ stage: 6, name: "RECORD", outcome: "FAILED", detail: e instanceof Error ? e.message : String(e) });
    }
  }
  return run;
}

function finish(
  stages: StageRecord[],
  verdict: KernelRun["verdict"],
  code: string | null,
  cls: ActClass,
  reason: string,
  evidence: string,
): KernelRun {
  return { stages, verdict, code, class: cls, reason, evidence };
}
