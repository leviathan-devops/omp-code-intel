// enforcement — T-5 THE ENFORCEMENT KERNEL: TSG + ABIDE as ONE 2-layer machine.
//
//   E1 · WORK LAYER    Abide         judges THE DIFF        fail-OPEN   (~300ms)
//   E2 · CLOSE LAYER   Claim Firewall judges THE CLAIM      fail-CLOSED
//   TSG                the load unit  supplies the SPANS both layers judge over
//
// POLARITY (R5, per-surface): an edit may not wedge the editor on a slow judge,
// so E1 fails OPEN; a false "done" IS the defect, so E2 fails CLOSED.
//
// T-6 APPLIED: neither layer owns an engine. Both take their engine through a
// dependency-injected seam and check the HARD-DEPENDENCY REGISTER first. The
// seam exists so a TEST can supply a fake engine — that is a test boundary, not
// a production fallback: at runtime the register refuses when the engine is
// absent, and there is no other path.
import {
  requireUp,
  type ComponentDecl,
} from "./hard-deps.ts";

// ── the engine contract (what the kernel needs from TSG and Abide) ───────────
export interface JudgeQuestion {
  id: string;
  instructions: string;
  whenTrue: string;
  whenFalse: string;
}

export interface JudgeAnswer {
  id: string;
  probability: number;
}

/** ONE call carrying every question — the Abide law the whole stack follows. */
export interface Judge {
  evaluate(state: Record<string, unknown>, questions: readonly JudgeQuestion[]): Promise<readonly JudgeAnswer[]>;
}

export interface Span {
  /** The evidence text the claim binds to. */
  quote: string;
  /** Where it came from — a file:line anchor or a ledger row id. */
  source: string;
}

/** TSG's surface: given a plain-English question and a scope, return the ranked
 *  spans that could answer it. `coverage` is first-class: an incomplete scan is
 *  REPORTED, never silently treated as "no matches". */
export interface LoadUnit {
  retrieve(query: string, scope: string): Promise<{ spans: readonly Span[]; coverage: "complete" | "incomplete" }>;
}

export interface EnforcementDeps {
  judge: Judge;
  loadUnit: LoadUnit;
  register: readonly ComponentDecl[];
}

// ── verdicts ────────────────────────────────────────────────────────────────
export type WorkVerdict = "REPAIR" | "NOTICE" | "SILENT" | "SKIPPED";
export type CloseVerdict = "PASS" | "REJECT" | "FAIL_CLOSED";

export interface WorkResult {
  verdict: WorkVerdict;
  /** REPAIR TEXT, never a rollback (R3: Abide appends, it does not block). */
  repair: string | null;
  reason: string;
  evidence: string;
}

export interface CloseResult {
  verdict: CloseVerdict;
  code: string | null;
  reason: string;
  evidence: string;
  /** The spans the claim bound to — the absence proof when there are none. */
  spans: readonly Span[];
}

/** Band thresholds, declared not magic (Abide's own 0.8 / 0.5). */
export const ACT_PROBABILITY = 0.8;
export const FLAG_PROBABILITY = 0.5;

export function bandOf(probability: number): "act" | "flag" | "clear" {
  if (probability >= ACT_PROBABILITY) return "act";
  if (probability >= FLAG_PROBABILITY) return "flag";
  return "clear";
}

// ── E1 · THE WORK LAYER (Abide) — fail-OPEN ─────────────────────────────────
export interface WorkInput {
  diff: string;
  task: string;
  rules: readonly JudgeQuestion[];
}

/** Judges the DIFF. FAIL-OPEN: an absent engine, a timeout, or a malformed
 *  answer SKIPS with a named reason rather than wedging the edit — the surface's
 *  declared polarity. A SKIP is reported, never silent. */
export async function runWorkLayer(deps: EnforcementDeps, input: WorkInput): Promise<WorkResult> {
  if (input.rules.length === 0) {
    return { verdict: "SILENT", repair: null, reason: "no rules to check", evidence: "rules=0" };
  }
  if (input.diff.trim() === "") {
    return { verdict: "SILENT", repair: null, reason: "empty diff", evidence: "diff_len=0" };
  }
  try {
    // ★ F-32 FIX (2026-09-24): `find(...)!` passed undefined into requireUp on a missing component — a bare TypeError instead of the named code. Guard first.
    const abideDecl = deps.register.find((c) => c.id === "ABIDE");
    if (!abideDecl) throw Object.assign(new Error("GI_ENFORCE_ABIDE: ABIDE is not registered"), { code: "GI_ENFORCE_ABIDE" });
    requireUp(abideDecl);
    const jevDecl = deps.register.find((c) => c.id === "JEV");
    if (!jevDecl) throw Object.assign(new Error("GI_ENFORCE_JEV: JEV is not registered"), { code: "GI_ENFORCE_JEV" });
    requireUp(jevDecl);
  } catch (e) {
    // FAIL-OPEN — and LOUD about it. The named dependency code rides the result.
    const code = (e as { code?: string }).code ?? "GI_ENFORCE_ABIDE";
    return { verdict: "SKIPPED", repair: null, reason: `work layer skipped: ${code}`, evidence: (e as Error).message };
  }
  let answers: readonly JudgeAnswer[];
  try {
    answers = await deps.judge.evaluate({ diff: input.diff, task: input.task }, input.rules);
  } catch (e) {
    return { verdict: "SKIPPED", repair: null, reason: "work layer skipped: judge failed (fail-open)", evidence: e instanceof Error ? e.message : String(e) };
  }
  // An answer whose id matches NO rule is a JUDGE DEFECT: it answered a question
  // nobody asked. Reported, never counted as a violation (the first run of this
  // test caught the module naming the ANSWER id instead of the RULE id, which
  // produced a repair message that named nothing an operator could act on).
  const ruleById = new Map(input.rules.map((r) => [r.id, r] as const));
  const unknown = answers.filter((a) => !ruleById.has(a.id)).map((a) => a.id);
  const known = answers.filter((a) => ruleById.has(a.id));
  // The message names the rule AND what it checks — an id alone is opaque to a
  // reader, and instructions alone do not identify which rule to cite. Both.
  const label = (a: JudgeAnswer): string => {
    const r = ruleById.get(a.id);
    return r === undefined ? a.id : `${r.id} (${r.instructions})`;
  };

  const acting = known.filter((a) => bandOf(a.probability) === "act");
  const flagged = known.filter((a) => bandOf(a.probability) === "flag");
  const note = unknown.length > 0 ? ` judge_defect=unknown_answer_ids:${unknown.join(",")}` : "";

  if (acting.length === 0) {
    return {
      verdict: flagged.length > 0 || unknown.length > 0 ? "NOTICE" : "SILENT",
      repair: null,
      reason: unknown.length > 0 ? `judge returned ${unknown.length} answer(s) for unknown rules` : flagged.length > 0 ? `${flagged.length} rule(s) flagged` : "all rules clear",
      evidence: `rules=${input.rules.length} act=0 flag=${flagged.length} answered=${known.length}${note}`,
    };
  }
  // REPAIR TEXT — the agent keeps working; the correction rides as the next
  // message. Never a rollback, never a block (R3). The named rules are the
  // RULES the kernel sent, so the message is actionable.
  const names = acting.map((a) => a.id).join(", ");
  return {
    verdict: "REPAIR",
    repair: `[abide] ${acting.length} rule(s) violated on this edit: ${acting.map(label).join(" | ")}. Repair the edit; the change was NOT reverted.`,
    reason: `${acting.length} rule(s) at the act band`,
    evidence: `rules=${input.rules.length} act=${acting.length} ids=${names}${note}`,
  };
}

// ── E2 · THE CLOSE LAYER (Claim Firewall) — fail-CLOSED ─────────────────────
export interface CloseInput {
  claim: string;
  /** Where to look for the evidence that could back the claim. */
  scope: string;
}

/** Judges the CLAIM. The order is the whole design:
 *   1  DETECT  the claim text (code)
 *   2  BIND    retrieve spans with TSG; ZERO spans ⇒ FABRICATED, and the model
 *              is NEVER CALLED — the cheapest and most common case
 *   3  JUDGE   ONE question over the bound spans only
 *   4  ROUTE   code applies the thresholds; the model never routes
 *  FAIL-CLOSED on any engine failure: a false "done" is itself the defect. */
export async function runCloseLayer(deps: EnforcementDeps, input: CloseInput): Promise<CloseResult> {
  // 1 DETECT
  const claim = input.claim.trim();
  if (claim.length === 0) {
    return { verdict: "PASS", code: null, reason: "no claim in flight", evidence: "claim_len=0", spans: [] };
  }

  // 2 BIND — the load unit's dependency is checked BEFORE it is used.
  try {
    // ★ F-32 FIX (2026-09-24): same undefined-find guard on the close path — a missing TSG/JEV must read as the named fail-closed code.
    const tsgDecl = deps.register.find((c) => c.id === "TSG");
    if (!tsgDecl) throw Object.assign(new Error("TSG is not registered"), { code: "CLAIM_FW_JEV_NO_KEY" });
    requireUp(tsgDecl);
  } catch (e) {
    return {
      verdict: "FAIL_CLOSED",
      code: (e as { code?: string }).code ?? "CLAIM_FW_JEV_NO_KEY",
      reason: "close layer could not bind evidence (fail-closed)",
      evidence: (e as Error).message,
      spans: [],
    };
  }
  let spans: readonly Span[];
  try {
    const r = await deps.loadUnit.retrieve(claim, input.scope);
    spans = r.spans;
    if (r.coverage === "incomplete") {
      // COVERAGE IS FIRST-CLASS: an incomplete scan cannot certify a claim. It
      // is never silently read as "no matches" (that would be a false REJECT on
      // missing evidence) nor as "fine" (a false PASS).
      return {
        verdict: "FAIL_CLOSED",
        code: "TSG_NO_COVERAGE",
        reason: "the evidence scan was incomplete — the claim cannot be certified",
        evidence: `spans=${spans.length} coverage=incomplete`,
        spans,
      };
    }
  } catch (e) {
    return {
      verdict: "FAIL_CLOSED",
      code: "TSG_TIMEOUT",
      reason: "the evidence scan failed (fail-closed)",
      evidence: e instanceof Error ? e.message : String(e),
      spans: [],
    };
  }

  // ZERO SPANS ⇒ FABRICATED by code alone. The model is never consulted.
  if (spans.length === 0) {
    return {
      verdict: "REJECT",
      code: "GI_FABRICATED_CLAIM",
      reason: `claim has ZERO bound evidence spans: "${claim.slice(0, 80)}"`,
      evidence: `spans=0 scope=${input.scope}`,
      spans: [],
    };
  }

  // 3 JUDGE — one question, over the BOUND spans only.
  try {
    const jevCloseDecl = deps.register.find((c) => c.id === "JEV");
    if (!jevCloseDecl) throw Object.assign(new Error("JEV is not registered"), { code: "GI_JEV_DOWN" });
    requireUp(jevCloseDecl);
  } catch (e) {
    return {
      verdict: "FAIL_CLOSED",
      code: (e as { code?: string }).code ?? "GI_JEV_DOWN",
      reason: "the judge is unavailable at close (fail-closed)",
      evidence: (e as Error).message,
      spans,
    };
  }
  let answers: readonly JudgeAnswer[];
  try {
    answers = await deps.judge.evaluate(
      { claim, evidence: spans.map((s) => `${s.quote} @ ${s.source}`).join("\n---\n") },
      [{
        id: "claim_supported",
        instructions: "Does the evidence SUPPORT the claim, CONTRADICT it, or SAY NOTHING about it?",
        whenTrue: "the evidence directly supports the claim",
        whenFalse: "the evidence contradicts the claim or says nothing about it",
      }],
    );
  } catch (e) {
    return { verdict: "FAIL_CLOSED", code: "GI_JEV_DOWN", reason: "the judge failed at close (fail-closed)", evidence: e instanceof Error ? e.message : String(e), spans };
  }

  // 4 ROUTE — code, never the model (low confidence REJECTS, it does not pass).
  const support = answers.find((a) => a.id === "claim_supported");
  if (support === undefined) {
    return { verdict: "REJECT", code: "GI_FABRICATED_CLAIM", reason: "the judge returned no answer for the claim", evidence: `answers=${answers.length}`, spans };
  }
  if (support.probability >= ACT_PROBABILITY) {
    return { verdict: "PASS", code: null, reason: "the evidence supports the claim", evidence: `p=${support.probability.toFixed(3)} spans=${spans.length}`, spans };
  }
  return {
    verdict: "REJECT",
    code: "CLAIM_REJECTED",
    reason: `the evidence does not support the claim (p=${support.probability.toFixed(3)} < ${ACT_PROBABILITY})`,
    evidence: `p=${support.probability.toFixed(3)} spans=${spans.length}`,
    spans,
  };
}
