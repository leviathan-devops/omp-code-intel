// fire-gate — THE FIRING-TIME DECISION KERNEL.
//
// THE PROBLEM THIS SOLVES: a detector fires on a SHAPE. At firing time the
// kernel cannot know whether the shape was a real violation or a false
// positive — it acted on form alone. Before v2.0 the options were (a) act on
// every shape (the parked-kernel failure: 24 firings, 18 unrecoverable) or
// (b) act on nothing. This module inserts the third option:
//
//   shape trigger  ->  context absorption  ->  JEV judgment  ->  decision
//                      (lexicon-filtered)      (Noul / firing)   fire|escalate|ignore
//
// THE SHAPE (per the operator, 2026-09-21 — verbatim):
//   "shape trigger --> jev algorithm --> MPSE assisted jev score --> decision
//    point for fire --> fire/ignore"
//
// THE BUDGET: <5000 tokens per fire. These are high-frequency MICRO decisions,
// not macro spec-level ones. At ~100 fires/session x 5 sessions/day the cost is
// ~2 cents.
//
// THE LAWS THIS OBEYS (JEV_ENGINEERING_BIBLE):
//   D004  bounded state — the assembler enforces the cap and REPORTS the trim
//   D006  one snap judgment per question; never a composite
//   D010  fail polarity is PER SURFACE, never global
//   D013  cache-first — the same firing never pays twice
//   D016  the ledger is mandatory and carries `later_truth`
//   §6.4.3 the threshold is a NAMED POLICY, recorded on every row
//   §6.4.6 the two traps: threshold inflation (don't copy 0.95) and starvation
//          (a starved act band means the system pays and uses nothing)
import * as crypto from "node:crypto";
import type { Judge, JudgeQuestion } from "./enforcement.ts";

/** What a detector produced. The trigger carries the SHAPE, not a conclusion. */
export interface Fire {
  /** The reflex/detector identity — the rule that fired. */
  ruleId: string;
  /** destructive | dumb | theatrical — the class the detector owns. */
  cls: string;
  /** One line the operator would read. */
  shape: string;
  /** The act the trigger is about. */
  tool: string;
  target: string;
  /** The detector's own evidence, verbatim. */
  evidence: string;
}

/** The absorbed context. Bounded by construction, and the trim is REPORTED. */
export interface AbsorbedContext {
  /** The lexicon-matched slice, newest-first, under the byte cap. */
  slots: Array<{ kind: string; text: string }>;
  bytes: number;
  /** true when the cap forced a drop — never silent. */
  trimmed: boolean;
  droppedKinds: string[];
}

export interface FireDecision {
  ruleId: string;
  /** The Jev Noul: P(this firing is a REAL violation, given the context). */
  probability: number;
  /** Where it landed under the policy in force. */
  band: "act" | "escalate" | "ignore";
  /** code, never the model. */
  action: "FIRE" | "ESCALATE" | "IGNORE";
  reason: string;
  /** §6.4.7 — the row that makes calibration possible. */
  row: DecisionRow;
  cached: boolean;
  latencyMs: number;
}

export interface DecisionRow {
  at: string;
  ruleId: string;
  cls: string;
  questionVersion: string;
  probability: number;
  band: string;
  action: string;
  policyName: string;
  actThreshold: number;
  flagThreshold: number;
  stateHash: string;
  costUsd: number;
  /** Filled LATER, by the oracle. Never assumed. */
  laterTruth: "confirmed" | "refuted" | "unresolved";
}

// ── THE NAMED POLICY (§6.4.3: "a policy is just those numbers under a name") ──
export interface Policy {
  name: string;
  /** p >= act → FIRE */
  act: number;
  /** flag <= p < act → ESCALATE */
  flag: number;
  /** D010: the fail polarity of THIS surface. */
  failPolarity: "open" | "closed";
}

/** The derived policies. The numbers are EARNED by calibration.ts, not chosen —
 *  these are the seeds used before a rule has calibration data. */
export const SEED_POLICY: Readonly<Record<string, Policy>> = {
  // a BLOCK is expensive: a false fire stops legitimate work → the bar is high
  destructive: { name: "destructive-seed", act: 0.9, flag: 0.5, failPolarity: "closed" },
  // an EDIT check is cheap and advisory → the bar is low, it steers
  dumb: { name: "dumb-seed", act: 0.75, flag: 0.35, failPolarity: "open" },
  // a CLOSE claim is the defect itself when false → fail closed, bar high
  theatrical: { name: "theatrical-seed", act: 0.85, flag: 0.45, failPolarity: "closed" },
};

// ── THE LEXICON-FILTERED CONTEXT ASSEMBLER ──────────────────────────────────
/** Lexicons select WHICH stream material enters the state. A record kind that
 *  no lexicon matches never reaches the model — that is the narrow-before-judge
 *  law (D004) implemented as data, not as a filter someone forgets. */
export interface Lexicon {
  kind: string;
  /** Lowercased substrings. A hit admits the record. */
  markers: readonly string[];
}

export const DEFAULT_LEXICONS: readonly Lexicon[] = [
  { kind: "reasoning", markers: ["because", "must", "should", "cannot", "instead", "assume", "verify", "unsure", "risk", "careful"] },
  { kind: "claim", markers: ["done", "complete", "fixed", "verified", "passes", "tests pass", "all green", "shipped", "works"] },
  { kind: "negation", markers: ["not ", "never", "avoid", "won't", "don't", "without", "skip", "ignore", "except"] },
  { kind: "toolcall", markers: ["grep", "ripwire", "graph-query", "read", "edit", "write", "bun test", "tsc", "sha256"] },
  { kind: "error", markers: ["error", "fail", "refus", "denied", "throw", "cannot", "unable"] },
  { kind: "doctrine", markers: ["no fallback", "hard depend", "loud fail", "claim", "evidence", "never substitute"] },
];

/** The byte cap. ~4 bytes/token → this is the <5000-token budget with headroom. */
export const STATE_BYTE_CAP = 18_000;
/** Newest-first; a record whose text exceeds this is clipped, not admitted whole. */
export const SLOT_CHAR_CAP = 2_000;

export interface StreamRecord {
  kind: string;
  text: string;
  /** When it happened, relative to the fire. Negative = before. */
  offsetMs: number;
}

/** Absorb the stream slice the decision needs: lexicon-matched, windowed,
 *  NEWEST-FIRST, byte-capped, with the trim REPORTED (never silent — the same
 *  law as every other cap in this kernel). */
export function absorbContext(
  fire: Fire,
  stream: readonly StreamRecord[],
  opts: { windowMs?: number; lexicons?: readonly Lexicon[]; byteCap?: number } = {},
): AbsorbedContext {
  const windowMs = opts.windowMs ?? 240_000;      // the last 4 minutes
  const lexicons = opts.lexicons ?? DEFAULT_LEXICONS;
  const byteCap = opts.byteCap ?? STATE_BYTE_CAP;
  const inWindow = stream.filter((r) => r.offsetMs >= -windowMs && r.offsetMs <= 0);
  // newest-first, so the cap drops the OLDEST material
  const ordered = [...inWindow].sort((a, b) => b.offsetMs - a.offsetMs);
  const slots: AbsorbedContext["slots"] = [];
  const droppedKinds: string[] = [];
  let bytes = 0;
  let trimmed = false;
  for (const rec of ordered) {
    const lc = rec.text.toLowerCase();
    const lex = lexicons.find((l) => l.kind === rec.kind) ?? lexicons.find((l) => l.markers.some((m) => lc.includes(m)));
    if (lex === undefined) { droppedKinds.push(rec.kind); continue; }
    const text = rec.text.length > SLOT_CHAR_CAP ? rec.text.slice(0, SLOT_CHAR_CAP) + "…[clipped]" : rec.text;
    const cost = Buffer.byteLength(text, "utf8") + rec.kind.length + 8;
    if (bytes + cost > byteCap) { trimmed = true; droppedKinds.push(rec.kind); continue; }
    slots.push({ kind: rec.kind, text });
    bytes += cost;
  }
  return { slots, bytes, trimmed, droppedKinds: [...new Set(droppedKinds)] };
}

// ── THE STATE BUILDER (the exact envelope Jev sees) ─────────────────────────
/** The state is the EVIDENCE ONLY (D004, Red Pill #12): no conversation, no
 *  instructions to the model, no unbounded material. */
export function buildState(fire: Fire, ctx: AbsorbedContext): Record<string, unknown> {
  return {
    trigger: {
      rule: fire.ruleId,
      class: fire.cls,
      shape: fire.shape,
      tool: fire.tool,
      target: fire.target,
      detector_evidence: fire.evidence.slice(0, 1_500),
    },
    context: ctx.slots.map((s) => ({ kind: s.kind, text: s.text })),
    context_meta: { slots: ctx.slots.length, bytes: ctx.bytes, trimmed: ctx.trimmed, dropped: ctx.droppedKinds },
  };
}

// ── THE QUESTION (authored once, versioned — D026) ──────────────────────────
export const QUESTION_VERSION = "fire-legitimacy-v1";

/** §6.4.6's question: ONE snap judgment, about the SHAPE and its CONTEXT. */
export function fireQuestion(): JudgeQuestion {
  return {
    id: "fire_is_real",
    instructions:
      "A detector fired on this act because its SHAPE matched a rule. Judge whether the " +
      "SHAPE is a REAL violation given the surrounding context, or a FALSE POSITIVE. " +
      "Weigh: (a) does the context show the act was grounded, intended, or already covered " +
      "elsewhere? (b) does any context record contradict the detector's premise? (c) is the " +
      "shape the same thing the rule meant to catch, or a coincidental match? " +
      "A mention of a rule, a negation, a quotation, or a discussion ABOUT the behaviour is " +
      "NOT the behaviour itself. Judge only the evidence supplied; do not speculate about " +
      "material not present.",
    whenTrue:
      "the detector's premise holds on this act — the shape is the violation it names, and " +
      "nothing in the context contradicts it",
    whenFalse:
      "the shape matched but the act is legitimate, already grounded, discussed rather than " +
      "performed, negated, or the context contradicts the detector's premise",
  };
}

// ── THE GATE ────────────────────────────────────────────────────────────────
export interface FireGateConfig {
  judge: Judge;
  /** ruleId → policy; a rule with no policy falls to its CLASS seed. */
  policies?: Record<string, Policy>;
  /** Where to append the decision rows. Absent ⇒ no ledger ⇒ no calibration. */
  ledgerPath?: string;
  cachePath?: string;
  /** Hard stop, §D017. */
  budgetFires?: number;
  now?: () => number;
}

/** MPSE-ASSISTED PRE-FILTER. The deterministic layer runs BEFORE the model and
 *  can settle a fire outright — the cheapest decision is the one not made. */
export function mpsePreFilter(fire: Fire, ctx: AbsorbedContext): { settle: FireDecision["action"] | null; reason: string } {
  const all = ctx.slots.map((s) => s.text.toLowerCase()).join("\n");
  // A fire whose own detector evidence is EMPTY cannot be adjudicated — the
  // model would be guessing about nothing.
  if (fire.evidence.trim() === "") {
    return { settle: "IGNORE", reason: "MPSE: empty detector evidence — nothing to adjudicate (fail-closed to ignore, recorded)" };
  }
  // The act target appears in a NEGATION slot and nowhere else → discussion, not act.
  const mentionsTarget = ctx.slots.filter((s) => s.text.toLowerCase().includes(fire.target.toLowerCase()));
  if (mentionsTarget.length > 0) {
    const onlyNegated = mentionsTarget.every((s) =>
      /(not |never|won't|don't|without|skip|avoid|discuss|mention|about the rule)/.test(s.text.toLowerCase()),
    );
    if (onlyNegated) {
      return { settle: "IGNORE", reason: `MPSE: target '${fire.target}' appears only in negated/discussion slots (${mentionsTarget.length}) — the shape matched a mention, not the act` };
    }
  }
  return { settle: null, reason: "MPSE: no deterministic settlement — the judgment goes to Jev" };
}

export class FireGate {
  private budgetUsed = 0;
  private cache = new Map<string, { probability: number }>();
  private ledger: DecisionRow[] = [];

  constructor(private readonly cfg: FireGateConfig) {}

  /** §6.4.3 rule (4): the probabilities are stored; re-routing never re-infers. */
  reroute(row: DecisionRow, policy: Policy): DecisionRow {
    const band = row.probability >= policy.act ? "act" : row.probability >= policy.flag ? "escalate" : "ignore";
    const action = band === "act" ? "FIRE" : band === "escalate" ? "ESCALATE" : "IGNORE";
    return { ...row, band, action, policyName: policy.name, actThreshold: policy.act, flagThreshold: policy.flag, costUsd: 0 };
  }

  async judge(fire: Fire, ctx: AbsorbedContext): Promise<FireDecision> {
    const t0 = (this.cfg.now ?? Date.now)();
    // the policy: an explicit per-rule override, else the class seed.
    const policy = this.cfg.policies?.[fire.ruleId] ?? SEED_POLICY[fire.cls] ?? SEED_POLICY["dumb"]!;
    const state = buildState(fire, ctx);
    const stateHash = crypto.createHash("sha256").update(JSON.stringify(state)).digest("hex").slice(0, 16);

    // MPSE FIRST — the deterministic layer can settle a fire for $0.
    const pre = mpsePreFilter(fire, ctx);
    if (pre.settle !== null) {
      const row: DecisionRow = {
        at: new Date(t0).toISOString(), ruleId: fire.ruleId, cls: fire.cls,
        questionVersion: `mpse:${QUESTION_VERSION}`, probability: pre.settle === "IGNORE" ? 0 : 1,
        band: pre.settle === "IGNORE" ? "ignore" : "act", action: pre.settle,
        policyName: policy.name, actThreshold: policy.act, flagThreshold: policy.flag,
        stateHash, costUsd: 0, laterTruth: "unresolved",
      };
      this.ledger.push(row);
      return { ruleId: fire.ruleId, probability: row.probability, band: row.band as never, action: pre.settle, reason: pre.reason, row, cached: false, latencyMs: (this.cfg.now ?? Date.now)() - t0 };
    }

    // CACHE (D013) — the same firing never pays twice.
    const cached = this.cache.get(stateHash);
    if (cached !== undefined) {
      const band = cached.probability >= policy.act ? "act" : cached.probability >= policy.flag ? "escalate" : "ignore";
      const row: DecisionRow = {
        at: new Date(t0).toISOString(), ruleId: fire.ruleId, cls: fire.cls,
        questionVersion: QUESTION_VERSION, probability: cached.probability,
        band, action: band === "act" ? "FIRE" : band === "escalate" ? "ESCALATE" : "IGNORE",
        policyName: policy.name, actThreshold: policy.act, flagThreshold: policy.flag,
        stateHash, costUsd: 0, laterTruth: "unresolved",
      };
      this.ledger.push(row);
      return { ruleId: fire.ruleId, probability: cached.probability, band: band as never, action: row.action as never, reason: "cache hit — the same state was judged before", row, cached: true, latencyMs: 0 };
    }

    // BUDGET (D017) — a hard stop, loudly.
    if (this.cfg.budgetFires !== undefined && this.budgetUsed >= this.cfg.budgetFires) {
      throw new Error(`GI_FIREGATE_BUDGET: ${this.budgetUsed}/${this.cfg.budgetFires} fires used`);
    }

    // THE JUDGMENT — ONE Noul, one state, one call.
    let answers: readonly { id: string; probability: number }[];
    try {
      answers = await this.cfg.judge.evaluate(state, [fireQuestion()]);
      this.budgetUsed += 1;
    } catch (e) {
      // D010: the polarity of THIS surface. Fail-open = the act proceeds and the
      // miss is RECORDED; fail-closed = the act is refused.
      const closed = policy.failPolarity === "closed";
      const row: DecisionRow = {
        at: new Date(t0).toISOString(), ruleId: fire.ruleId, cls: fire.cls,
        questionVersion: QUESTION_VERSION, probability: closed ? 1 : 0,
        band: closed ? "act" : "ignore", action: closed ? "FIRE" : "IGNORE",
        policyName: `${policy.name}+fail-${policy.failPolarity}`, actThreshold: policy.act,
        flagThreshold: policy.flag, stateHash, costUsd: 0, laterTruth: "unresolved",
      };
      this.ledger.push(row);
      return {
        ruleId: fire.ruleId, probability: row.probability, band: row.band as never, action: row.action as never,
        reason: `judge unavailable (${e instanceof Error ? e.message.slice(0, 120) : "?"}) — fail-${policy.failPolarity} for the ${fire.cls} surface`,
        row, cached: false, latencyMs: (this.cfg.now ?? Date.now)() - t0,
      };
    }

    const a = answers.find((x) => x.id === "fire_is_real");
    if (a === undefined) {
      // A missing answer is UNCERTIFIABLE, never a silent pass.
      const row: DecisionRow = {
        at: new Date(t0).toISOString(), ruleId: fire.ruleId, cls: fire.cls,
        questionVersion: QUESTION_VERSION, probability: policy.failPolarity === "closed" ? 1 : 0,
        band: policy.failPolarity === "closed" ? "act" : "ignore",
        action: policy.failPolarity === "closed" ? "FIRE" : "IGNORE",
        policyName: `${policy.name}+no-answer`, actThreshold: policy.act, flagThreshold: policy.flag,
        stateHash, costUsd: 0, laterTruth: "unresolved",
      };
      this.ledger.push(row);
      return { ruleId: fire.ruleId, probability: row.probability, band: row.band as never, action: row.action as never, reason: "the judge returned no answer for fire_is_real", row, cached: false, latencyMs: 0 };
    }

    const p = a.probability;
    const band = p >= policy.act ? "act" : p >= policy.flag ? "escalate" : "ignore";
    const action = band === "act" ? "FIRE" : band === "escalate" ? "ESCALATE" : "IGNORE";
    this.cache.set(stateHash, { probability: p });
    const row: DecisionRow = {
      at: new Date(t0).toISOString(), ruleId: fire.ruleId, cls: fire.cls,
      questionVersion: QUESTION_VERSION, probability: p, band, action,
      policyName: policy.name, actThreshold: policy.act, flagThreshold: policy.flag,
      stateHash, costUsd: 0, laterTruth: "unresolved",
    };
    this.ledger.push(row);
    return { ruleId: fire.ruleId, probability: p, band: band as never, action: action as never, reason: `P(real)=${p.toFixed(3)} under ${policy.name} (act>=${policy.act}, flag>=${policy.flag})`, row, cached: false, latencyMs: (this.cfg.now ?? Date.now)() - t0 };
  }

  /** §6.4.7 — the oracle fills this in later. Never assumed at firing time. */
  recordTruth(stateHash: string, truth: DecisionRow["laterTruth"]): number {
    let n = 0;
    for (const r of this.ledger) if (r.stateHash === stateHash) { r.laterTruth = truth; n += 1; }
    return n;
  }

  // Public API seam: the calibration machinery and the tests read the ledger.
  rows(): readonly DecisionRow[] { return this.ledger; }
  firesUsed(): number { return this.budgetUsed; }
  cacheSize(): number { return this.cache.size; }
}
