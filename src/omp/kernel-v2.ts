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
// ★ THE WIRING (W4). Before this line, FireGate had ZERO call sites outside its
// own file — a 370-line gate that nothing called. The post-detector filter is
// the whole point of v2.1: the detector says "this SHAPE is a violation"; the
// gate says whether the shape is REAL.
import {
  FireGate,
  absorbContext,
  type DecisionRow,
  type Fire,
  type StreamRecord,
} from "./fire-gate.ts";

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

/** THE WORST VERDICT WINS, and a tie takes the worst class by the fixed order
 *  destructive > theatrical > dumb (a safety tie never resolves toward the
 *  lighter class). Extracted so the gated runner (W4) picks the SAME outcome
 *  the kernel did — two implementations of this reduce would eventually
 *  disagree, and the gate would then adjudicate a different detector than the
 *  one that produced the verdict. */
export function worstOutcome(
  outcomes: readonly { detector: Detector; outcome: DetectorVerdict }[],
): { detector: Detector; outcome: DetectorVerdict } {
  return outcomes.reduce((a, b) => {
    const va = VERDICT_RANK[a.outcome.verdict];
    const vb = VERDICT_RANK[b.outcome.verdict];
    if (vb > va) return b;
    if (vb === va && a.outcome.verdict !== "PASS" && b.outcome.verdict !== "PASS") {
      const order: Record<ActClass, number> = { destructive: 3, theatrical: 2, dumb: 1, benign: 0 };
      if (order[b.detector.class] > order[a.detector.class]) return b;
    }
    return a;
  });
}

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
  const worst = worstOutcome(outcomes);
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

// ════════════════════════════════════════════════════════════════════════════
// POSITION B — THE POST-DETECTOR FILTER (W4). ★ THE WIRING.
//
// The detector answers "does this SHAPE match a rule?" — cheaply, by design,
// and therefore sometimes wrongly. The gate answers the different question
// "is the shape REAL given the context that surrounds it?", for at most one
// Noul's worth of judgment. The band→action table is the blueprint's (§S6):
//
//     p >= policy.act   → FIRE      the v2.0 verdict APPLIES
//     p >= policy.flag  → ESCALATE  flagged; the verdict still applies
//     else              → IGNORE    the act proceeds; the firing was NOISE
//
// ★ THE SAFE DIRECTION OF THIS SURFACE IS THE OPPOSITE OF POSITION A'S. An
//   advisory must never BLOCK; this filter must never DISMISS without a real
//   adjudication. So when the gate is absent, down, or out of budget, the
//   DETECTOR'S VERDICT STANDS and the degradation is NAMED. Failing to filter
//   is a lost improvement; failing OPEN would be a lost enforcement.
//
// ★ WHY runKernelV2 STAYS SYNCHRONOUS. The judge is a model call — async by
//   nature. Making runKernelV2 async would break every existing caller and the
//   ~20 tests that call it synchronously, and it would conflate two separable
//   things: the stage machine (pure, cheap, no I/O) and the adjudication
//   (async, costly, I/O). The gate therefore WRAPS the stage machine. It still
//   sits exactly where the blueprint puts it — between the detector's VIOLATION
//   and the verdict the caller acts on.
// ════════════════════════════════════════════════════════════════════════════

export interface GateAdjudication {
  ruleId: string;
  cls: ActClass;
  probability: number;
  band: string;
  action: "FIRE" | "ESCALATE" | "IGNORE";
  reason: string;
  /** The decision row — SC-8: every fire leaves a row. */
  row: DecisionRow;
}

export interface GatedKernelRun extends KernelRun {
  /** The detector's verdict BEFORE the gate. PRESERVED, never overwritten —
   *  a filtered false positive must remain auditable as a detector firing. */
  preGateVerdict: KernelRun["verdict"];
  /** The gate's adjudication, when a non-ALLOW verdict was adjudicated. */
  adjudication: GateAdjudication | null;
  /** The NAMED degradation when the gate could not adjudicate. Non-null means
   *  the detector's verdict STANDS on its own. */
  gateSkipped: { code: string; message: string } | null;
}

/** The stream the gate absorbs when the caller supplies none: the kernel's OWN
 *  input, rendered as records. Honest by construction — it adds nothing the
 *  caller did not assert, so the gate cannot be fed evidence the kernel did
 *  not see. A caller with the real session stream passes it via `opts`. */
export function streamFromInput(input: KernelInput): StreamRecord[] {
  const out: StreamRecord[] = [{ kind: "toolcall", text: `${input.toolName} ${input.target}`, offsetMs: -100 }];
  for (const c of input.claims) out.push({ kind: "claim", text: c.text, offsetMs: -90 });
  for (const c of input.certifications) {
    out.push({ kind: "reasoning", text: `${c.layer} ${c.verdict} ${c.reason}`, offsetMs: -80 });
  }
  return out;
}

/** ★ RUN THE KERNEL, THEN ADJUDICATE ITS VIOLATION — position B.
 *  A clean act is returned untouched and costs ZERO model calls: the filter
 *  only ever looks at something a detector already flagged. */
export async function runKernelV2Gated(
  input: KernelInput,
  gate: FireGate | undefined,
  opts: { stream?: readonly StreamRecord[] } = {},
): Promise<GatedKernelRun> {
  const base = runKernelV2(input);
  const stands = (skipped: { code: string; message: string } | null): GatedKernelRun => ({
    ...base,
    preGateVerdict: base.verdict,
    adjudication: null,
    gateSkipped: skipped,
  });

  // NOTHING TO FILTER. A clean act never reaches the model — the cheapest
  // judgment is the one not made.
  if (base.verdict === "ALLOW") return stands(null);

  if (gate === undefined) {
    return stands({
      code: "GI_GATE_ABSENT",
      message: "no gate wired — the detector's verdict stands; a missing filter never dismisses a violation",
    });
  }

  // THE SAME WORST OUTCOME THE KERNEL CHOSE — via the shared helper, so the
  // gate can never adjudicate a different detector than the one that refused.
  const detectors = input.detectors ?? DEFAULT_DETECTORS;
  const outcomes = classifyByDetectors(detectors, input);
  const worst = worstOutcome(outcomes);
  const fire: Fire = {
    ruleId: `*${worst.detector.class}`,
    cls: worst.detector.class,
    shape: worst.outcome.reason,
    tool: input.toolName,
    target: input.target,
    evidence: worst.outcome.evidence,
  };
  const ctx = absorbContext(fire, opts.stream ?? streamFromInput(input));

  let d;
  try {
    d = await gate.judge(fire, ctx);
  } catch (e) {
    // A down judge, a spent budget (D017), any throw. The verdict STANDS.
    const message = e instanceof Error ? e.message : String(e);
    return stands({ code: "GI_GATE_UNAVAILABLE", message });
  }

  const adjudication: GateAdjudication = {
    ruleId: fire.ruleId,
    cls: worst.detector.class,
    probability: d.probability,
    band: d.band,
    action: d.action as GateAdjudication["action"],
    reason: d.reason,
    row: d.row,
  };

  // ★ A DEGRADED ROW MUST NEVER DISMISS. The gate's own fail-polarity rows carry
  //   a suffix on the policy name. On a fail-CLOSED class (theatrical) the
  //   degraded row reads FIRE; on a fail-OPEN class (dumb) it reads IGNORE —
  //   and APPLYING that IGNORE would let a down judge silently switch
  //   enforcement off. That is the precise failure this surface's polarity
  //   exists to prevent, so a degraded row is detected HERE and the detector's
  //   verdict STANDS. The row is still in the gate's ledger (SC-8 holds) and
  //   the degradation is NAMED.
  const suffix = d.row.policyName.includes("+no-answer") ? "NO_ANSWER"
    : d.row.policyName.includes("+fail-") ? "JUDGE_UNAVAILABLE"
    : null;
  if (suffix !== null) {
    return stands({ code: `GI_GATE_UNAVAILABLE:${suffix}`, message: d.reason });
  }

  if (d.action === "IGNORE") {
    // ★ THE FALSE POSITIVE IS DISMISSED. The detector fired on a shape; the
    //   gate read the context and found the firing to be noise. The act
    //   proceeds — and the dismissal is EXPLAINED on the run.
    return {
      ...base,
      preGateVerdict: base.verdict,
      verdict: "ALLOW",
      code: null,
      class: "benign",
      reason: `gate IGNORE — the firing was noise: ${d.reason}`,
      adjudication,
      gateSkipped: null,
    };
  }

  // FIRE and ESCALATE both keep the v2.0 verdict: the violation is REAL. The
  // difference is that ESCALATE says so more quietly and marks the row.
  return { ...base, preGateVerdict: base.verdict, adjudication, gateSkipped: null };
}
