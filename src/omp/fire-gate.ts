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
import { graphFacts } from "./graph-facts.ts";

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
  /** ★★★ EN-090 — THE FIRE'S TARGET, IN PLAINTEXT. THE FINDING THAT PUT IT HERE: the target
   *  was already in the state (`buildState` line 244: `target: fire.target`) and then HASHED
   *  INTO OBLIVION (`sha256(JSON.stringify(state)).slice(0,16)`). The row recorded the hash
   *  and DROPPED THE PLAINTEXT — so no reader could ever point a gatherer at the subject.
   *  THE MEASURED CONSEQUENCE: the oracle's caller had to PAIR subjects by rule
   *  (i % subjects.length), and when E1 was sized against that pairing every "resolution"
   *  was a false positive (all 3 resolved fires were .trident artifacts the sizing script had
   *  itself rewritten). 0%, 6%, 94% — ALL NUMBERS ABOUT AN ARBITRARY PAIRING. Optional
   *  because rows written before the migration have no target and NEVER WILL: it is
   *  irrecoverable, and NULL says so honestly. */
  target?: string;
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

/** ★ HOT-SEAT H4-5 (BREAK): THE GATE'S OWN TIMEOUT.
 *  Measured live: a judge that NEVER RESOLVES hung the gate forever. `budgetFires`
 *  bounds the NUMBER of fires; NOTHING bounded TIME, so the ceiling belonged to
 *  whichever judge implementation was passed in. The pin's own words: "a SILENT
 *  wrong-answer / no-op / HANG is CRITICAL."
 *  The gate is the ENFORCEMENT layer — if it can hang, the agent hangs. It now
 *  enforces its own ceiling regardless of the judge's contract. */
export const DEFAULT_JUDGE_TIMEOUT_MS = 10_000;

/** Thrown when the gate's own ceiling elapses. DISTINCT from a judge error so the
 *  degradation it records is named for what actually happened. */
export class FireGateTimeout extends Error {
  constructor(readonly ms: number) {
    super(`GI_FIREGATE_JUDGE_TIMEOUT: the judge did not answer within ${ms}ms`);
    this.name = "FireGateTimeout";
  }
}

// ── THE DEGRADATION VOCABULARY (ONE place knows it) ─────────────────────────
/** ★ THE ROW'S POLICY NAME IS THE CONTRACT FOR "this was not a real judgment".
 *  The gate marks every degraded row with a `+suffix`, and every CONSUMER must be
 *  able to tell a degradation from a decision — a degraded row must never be
 *  allowed to DISMISS (EN-057) and must never be mistaken for a real FIRE.
 *
 *  WHY THIS FUNCTION EXISTS: consumers used to pattern-match the suffixes
 *  themselves. Adding `+bad-answer` (R-1) would then have required every consumer
 *  to learn a new string, and any consumer that missed it would treat a corrupt
 *  answer as a real adjudication — a hole created by the FIX. The vocabulary lives
 *  here; the consumers ask.
 *
 *  Returns null when the row IS a real judgment. */
export function degradationOf(policyName: string): "NO_ANSWER" | "BAD_ANSWER" | "TIMEOUT" | "JUDGE_UNAVAILABLE" | null {
  if (policyName.includes("+no-answer")) return "NO_ANSWER";
  if (policyName.includes("+bad-answer")) return "BAD_ANSWER";
  // ★ the hot seat's finding: a TIMEOUT is a degradation like any other, and a
  //   consumer that could not name it would treat a hung judge as a real judgment.
  if (policyName.includes("+timeout")) return "TIMEOUT";
  if (policyName.includes("+fail-")) return "JUDGE_UNAVAILABLE";
  return null;
}

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
    // ★ PASS-5 HIGH — THE KIND-MATCH BYPASS. The first branch admitted a record whose
    //   kind merely EQUALLED a lexicon's kind, WITHOUT any marker in its text. A record
    //   `{kind: "reasoning", text: "lorem ipsum"}` sailed through the narrow-before-judge
    //   gate (D004) carrying NO decision-relevant material — the gate the whole kernel's
    //   token budget depends on. A kind is a LABEL, not evidence; the admission test is
    //   whether the TEXT matches a marker.
    const lex = lexicons.find((l) => l.markers.some((m) => lc.includes(m)));
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
  // ★ EN-074, CORRECTED BY THE OPERATOR: THE <5000-TOKEN FIGURE IS A **SOFT TARGET**,
  //   NOT A HARD CAP. My first fix enforced it by DROPPING SLOTS until the serialized
  //   state fit — which trades JUDGMENT QUALITY for a budget that is not hard. The
  //   material `absorbContext` admitted passed the lexicon filter; it is the material the
  //   decision NEEDS. Truncating it to hit a number is a false economy.
  //
  //   WHAT THE MEASUREMENT WAS STILL FOR: the pin's M5 measures the per-fire token cost,
  //   and the cap was bounding the WRONG QUANTITY — `ctx.bytes` (an intermediate) rather
  //   than the envelope the model receives. MEASURED under a maximal stream: ctx.bytes
  //   17,981 while the state serialized to 22,914 bytes ≈ 5,729 tokens. So the fix is to
  //   MEASURE THE REAL ENVELOPE AND REPORT IT — never to truncate to reach it.
  //
  //   The structural bound stays where it belongs: `absorbContext`'s byte cap, which drops
  //   the OLDEST material (the documented policy) and sets `trimmed` — never silent.
  const trigger = {
    rule: fire.ruleId,
    class: fire.cls,
    shape: fire.shape,
    tool: fire.tool,
    target: fire.target,
    detector_evidence: fire.evidence.slice(0, 1_500),
  };
  const meta: Record<string, unknown> = {
    slots: ctx.slots.length,
    bytes: ctx.bytes,
    trimmed: ctx.trimmed,
    dropped: ctx.droppedKinds,
  };
  const state: Record<string, unknown> = {
    trigger,
    context: ctx.slots.map((slot) => ({ kind: slot.kind, text: slot.text })),
    context_meta: meta,
  };
  // ★ THE SOFT TARGET, MEASURED AND REPORTED. `serializedBytes` is the envelope the model
  //   actually receives; `overTarget` says whether it exceeded STATE_BYTE_CAP. Both ride
  //   `context_meta` so M5 can count the overshoot instead of guessing at it — and so a
  //   caller can SEE a fire that grew past the target rather than being quietly trimmed.
  //
  //   ★ PASS-7 MEDIUM — THE MEASUREMENT MUST INCLUDE ITSELF. The first version measured the
  //   state BEFORE adding these three fields, so the reported number UNDERCOUNTED the real
  //   envelope by the width of the fields that report it — a measurement that changes the
  //   thing it measures and then reports the pre-change value. A two-pass fixed point fixes
  //   it exactly: seed the fields so the SHAPE is final, measure, write the real values, then
  //   verify — the second pass settles because the digits either match or the third confirms.
  meta["serializedBytes"] = 0;
  meta["estTokens"] = 0;
  meta["overTarget"] = false;
  for (let pass = 0; pass < 3; pass++) {
    const measured = Buffer.byteLength(JSON.stringify(state), "utf8");
    if (meta["serializedBytes"] === measured) break;          // the fixed point held
    meta["serializedBytes"] = measured;
    meta["estTokens"] = Math.round(measured / 4);
    meta["overTarget"] = measured > STATE_BYTE_CAP;
  }
  return state;
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
  /** ★ PASS-7 — RESERVED, NOT WIRED. The first comment promised "absent ⇒ no ledger ⇒ no
   *  calibration", which is TRUE of the SYSTEM but FALSE of this field: nothing in this class
   *  reads it. The ledger is wired by the CALLER (`withLedger(gate, ledger)` from
   *  fire-ledger.ts, or `drain(gate, ledger)`), and the cache is in-memory by design (D013's
   *  key is the canonical state; persistence of the cache is not specified). These fields are
   *  kept for a future file-backed mode and are NAMED as unused rather than promising a
   *  behaviour they do not have. */
  ledgerPath?: string;
  /** ★ PASS-7 — RESERVED, NOT WIRED. See `ledgerPath`. */
  cachePath?: string;
  /** Hard stop, §D017 — bounds the NUMBER of fires. */
  budgetFires?: number;
  /** ★ HOT-SEAT H4-5 — bounds the TIME of one judgment. `budgetFires` cannot: a judge
   *  that never answers spends no budget. Defaults to DEFAULT_JUDGE_TIMEOUT_MS. */
  judgeTimeoutMs?: number;
  /** ★ P1 (THE GRAPH-FACT RUNG) — the typed store the fact set reads. Present ⇒ the ladder
   *  is graph → MPSE → cache → Jev and a FACT settles the fire at $0. Absent ⇒ the graph
   *  rung is UNAVAILABLE and says so, never silently skipped. */
  graphStorePath?: string;
  /** What the fire's intent does with the target — selects the applicable fact rules. */
  graphIntent?: "consume" | "declare" | "mutate" | "measure";
  /** The derivation class for the store's TTL (explicit | inferred | heuristic). */
  graphDerivation?: string;
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
  // ★ PASS-5 HIGH — AN EMPTY OR WHITESPACE TARGET MATCHES EVERYTHING: ''.includes('')
  //   is true, so a fire with a missing target would be settled IGNORE by the negation
  //   branch on NO evidence. A missing subject is not a discussion — it is a malformed fire.
  if (fire.target.trim() === "") {
    return { settle: null, reason: "MPSE: the fire names no target — the negation branch cannot run on an empty subject (the judgment goes to Jev)" };
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
  /** D017's hard stop: the NUMBER OF FIRES that reached the model path. */
  private budgetUsed = 0;
  /** ★ EN-076 — the ECONOMIC meter: actual model calls. A single-flight share costs one
   *  call but still counts as a fire, so the two numbers diverge under concurrency and
   *  BOTH are reported. */
  private modelCalls = 0;
  /** ★ R-D (cache/version defect, exposed by the question probe): the cache is keyed by
   *  (QUESTION_VERSION, stateHash) — NEVER by the state alone. A question re-authoring
   *  changes what a probability MEANS, so serving an old answer under a new question
   *  version is a silent misattribution. The ledger row already records questionVersion;
   *  the cache must agree with the ledger, or the two disagree about what was asked. */
  private cache = new Map<string, { probability: number }>();
  /** ★ HOT-SEAT W2-1 (BREAK): SINGLE-FLIGHT. `cache.set` runs only AFTER a judgment
   *  returns, so N CONCURRENT fires with the same state all missed and all paid the
   *  model. Measured live: 24 fires over 3 distinct states produced cacheHits=0 and 24
   *  model calls, against a documented 60-80% hit rate — the operator's cost envelope
   *  assumes those hits. This map makes a concurrent duplicate WAIT for the call already
   *  in flight instead of starting its own. */
  private inFlight = new Map<string, Promise<readonly { id: string; probability: number }[]>>();
  private ledger: DecisionRow[] = [];

  constructor(private readonly cfg: FireGateConfig) {}

  /** §6.4.3 rule (4): the probabilities are stored; re-routing never re-infers. */
  reroute(row: DecisionRow, policy: Policy): DecisionRow {
    // ★ PASS-5 HIGH — A DEGRADED ROW STAYS DEGRADED. Its probability is a FORCED value (0 or
    //   1 by the fail polarity), NOT a model answer. The first version replaced the policy
    //   name outright, which STRIPPED the `+timeout`/`+fail-*`/`+no-answer`/`+bad-answer`
    //   marker — so a placeholder, re-bandied under a new policy, presented itself as a real
    //   judgment, and `degradationOf` could no longer see it. The suffix is preserved.
    const degradation = degradationOf(row.policyName);
    const suffix = degradation === null ? "" : (row.policyName.match(/\+[^+]*$/) ?? [""])[0];
    const band = row.probability >= policy.act ? "act" : row.probability >= policy.flag ? "escalate" : "ignore";
    const action = band === "act" ? "FIRE" : band === "escalate" ? "ESCALATE" : "IGNORE";
    return { ...row, band, action, policyName: `${policy.name}${suffix}`, actThreshold: policy.act, flagThreshold: policy.flag, costUsd: 0 };
  }

  async judge(fire: Fire, ctx: AbsorbedContext): Promise<FireDecision> {
    const t0 = (this.cfg.now ?? Date.now)();
    // ★ PASS-5 HIGH — AN UNKNOWN CLASS MUST NOT FALL TO THE DUMB-SEED OPEN POLICY. A new
    //   destructive-like surface would have defaulted to fail-OPEN — the polarity that lets a
    //   down judge DISMISS it. An unrecognized class is UNCERTIFIABLE, and uncertifiable is
    //   fail-CLOSED: the act is refused until someone names the class.
    //   the policy: an explicit per-rule override, else the class seed.
    const policy = this.cfg.policies?.[fire.ruleId] ?? SEED_POLICY[fire.cls] ?? SEED_POLICY["destructive"]!;
    const state = buildState(fire, ctx);
    // ★ F-FG1a (2026-09-24): reassigned after the graph rung splices below — the hash
    //   must cover the envelope the model receives, including graph_facts.
    let stateHash = crypto.createHash("sha256").update(JSON.stringify(state)).digest("hex").slice(0, 16);

    // ═══ THE GRAPH-FACT RUNG (P1, 2026-09-22) — THE CHEAPEST RUNG GETS EYES ═══════
    // ★ THE LADDER IS NOW: graph → MPSE → cache → Jev. The graph answers FACTS; a fact is
    //   never worth a model call. Every rule is $0 (one indexed query, no network).
    // ★ AND THE RUNG IS NAMED WHEN UNAVAILABLE — the hard-dependency law: a missing store
    //   produces a row that SAYS SO, never a silent fall-through that looks like a pass.
    if (this.cfg.graphStorePath !== undefined) {
      const facts = graphFacts({
        storePath: this.cfg.graphStorePath,
        target: fire.target,
        intent: this.cfg.graphIntent ?? "consume",
        derivation: this.cfg.graphDerivation,
      });
      const settled = facts.find((v) => v.settles && v.action !== null);
      if (settled !== undefined && settled.action !== null) {
        const row: DecisionRow = {
          at: new Date(t0).toISOString(), ruleId: fire.ruleId, cls: fire.cls,
          questionVersion: `graph:${settled.rule}`,
          probability: settled.action === "IGNORE" ? 0 : 1,
          band: settled.action === "IGNORE" ? "ignore" : "act",
          action: settled.action,
          policyName: policy.name, actThreshold: policy.act, flagThreshold: policy.flag,
          stateHash, costUsd: 0, target: fire.target, laterTruth: "unresolved",
        };
        this.ledger.push(row);
        return {
          ruleId: fire.ruleId, probability: row.probability, band: row.band as never,
          action: settled.action as never,
          reason: `${settled.rule} — ${settled.reason} [${settled.evidence}]`,
          row, cached: false, latencyMs: (this.cfg.now ?? Date.now)() - t0,
        };
      }
      // a factless or escalate-only outcome falls through, with the consulted facts recorded
      if (facts.length > 0) {
        (state["context_meta"] as Record<string, unknown>)["graph_facts"] =
          facts.map((v) => `${v.rule}:${v.settles ? v.action : "ESCALATE"}`);
      }
      // ★ F-FG1 FIX (2026-09-24): the splice mutates the measured envelope — re-measure
      //   (the PASS-7 fixed point, extended to this rung) and re-hash, so the cache key,
      //   serializedBytes, estTokens and overTarget describe what the model receives.
      const metaAfter = state["context_meta"] as Record<string, unknown>;
      for (let pass = 0; pass < 3; pass++) {
        const m = Buffer.byteLength(JSON.stringify(state), "utf8");
        if (metaAfter["serializedBytes"] === m) break;
        metaAfter["serializedBytes"] = m;
        metaAfter["estTokens"] = Math.round(m / 4);
        metaAfter["overTarget"] = m > STATE_BYTE_CAP;
      }
      stateHash = crypto.createHash("sha256").update(JSON.stringify(state)).digest("hex").slice(0, 16);
    }

    // MPSE — the second deterministic rung; it settles a fire for $0.
    const pre = mpsePreFilter(fire, ctx);
    if (pre.settle !== null) {
      const row: DecisionRow = {
        at: new Date(t0).toISOString(), ruleId: fire.ruleId, cls: fire.cls,
        questionVersion: `mpse:${QUESTION_VERSION}`, probability: pre.settle === "IGNORE" ? 0 : 1,
        band: pre.settle === "IGNORE" ? "ignore" : "act", action: pre.settle,
        policyName: policy.name, actThreshold: policy.act, flagThreshold: policy.flag,
        stateHash, costUsd: 0, target: fire.target, laterTruth: "unresolved",
      };
      this.ledger.push(row);
      return { ruleId: fire.ruleId, probability: row.probability, band: row.band as never, action: pre.settle, reason: pre.reason, row, cached: false, latencyMs: (this.cfg.now ?? Date.now)() - t0 };
    }

    // CACHE (D013) — the same firing never pays twice.
    // ★ R-D: keyed by (QUESTION_VERSION, stateHash). The state hash covers trigger +
    //   context but NOT the question, so a re-authored question must not be served the
    //   old answer. The ledger row records questionVersion; the cache agrees with it.
    const cacheKey = `${QUESTION_VERSION}:${stateHash}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      const band = cached.probability >= policy.act ? "act" : cached.probability >= policy.flag ? "escalate" : "ignore";
      const row: DecisionRow = {
        at: new Date(t0).toISOString(), ruleId: fire.ruleId, cls: fire.cls,
        questionVersion: QUESTION_VERSION, probability: cached.probability,
        band, action: band === "act" ? "FIRE" : band === "escalate" ? "ESCALATE" : "IGNORE",
        policyName: policy.name, actThreshold: policy.act, flagThreshold: policy.flag,
        stateHash, costUsd: 0, target: fire.target, laterTruth: "unresolved",
      };
      this.ledger.push(row);
      return { ruleId: fire.ruleId, probability: cached.probability, band: band as never, action: row.action as never, reason: "cache hit — the same state was judged before", row, cached: true, latencyMs: 0 };
    }

    // BUDGET (D017) — a hard stop, loudly. ★ PASS-7 HIGH — THE RESERVATION HAPPENS HERE,
    // BEFORE THE AWAIT. The first version checked the budget here and incremented it AFTER
    // the model answered, so N CONCURRENT fires all read the same pre-await value and all
    // passed — the stop was bypassable by concurrency exactly like the cache was. The unit
    // is RESERVED at admission, which is also the honest accounting: a fire that is admitted
    // has spent its slot whether or not it returns an answer.
    if (this.cfg.budgetFires !== undefined && this.budgetUsed >= this.cfg.budgetFires) {
      throw new Error(`GI_FIREGATE_BUDGET: ${this.budgetUsed}/${this.cfg.budgetFires} fires used`);
    }
    this.budgetUsed += 1;

    // THE JUDGMENT — ONE Noul, one state, one call.
    let answers: readonly { id: string; probability: number }[];
    let sharedCall = false;
    // ★ PASS-7 — DECLARED OUTSIDE THE TRY. `const` inside the try block is invisible to the
    //   catch, so the timeout path could not name the call it was abandoning.
    let thisCall: Promise<readonly { id: string; probability: number }[]> | null = null;
    try {
      // ★ HOT-SEAT H4-5 — THE GATE'S OWN CEILING. Measured: a judge that never resolves
      //   hung this gate forever, because the timeout belonged to the JUDGE's contract
      //   and not the gate's. `Promise.race` against a timer makes the ceiling the
      //   GATE's, whatever the judge does. The timer is cleared so a normal path does
      //   not hold the event loop open.
      const ceiling = this.cfg.judgeTimeoutMs ?? DEFAULT_JUDGE_TIMEOUT_MS;
      const timer = Promise.withResolvers<never>();
      const handle = setTimeout(() => timer.reject(new FireGateTimeout(ceiling)), ceiling);
      // ★ W2-1: a concurrent identical fire SHARES the call already in flight.
      const call = this.judgeOnce(cacheKey, state);
      sharedCall = call.shared;
      thisCall = call.answers;
      try {
        answers = await Promise.race([call.answers, timer.promise]);
      } finally {
        clearTimeout(handle);
      }
      // ★ EN-076 — the ECONOMIC meter only; `budgetUsed` was RESERVED at admission above
      //   (PASS-7 moved it there to close the check-then-act race).
      if (!call.shared) this.modelCalls += 1;
    } catch (e) {
      // D010: the polarity of THIS surface. Fail-open = the act proceeds and the
      // miss is RECORDED; fail-closed = the act is refused.
      // ★ A TIMEOUT AND A JUDGE ERROR ARE DIFFERENT FACTS and get different names —
      //   a consumer that cannot tell them apart cannot tell "the model is slow" from
      //   "the model is broken".
      const timedOut = e instanceof FireGateTimeout;
      // ★ EN-075 — A TIMED-OUT CALL IS ABANDONED. Its promise never settles, so nothing else
      //   would ever remove it; and a later same-state fire would inherit the hang.
      // ★ F-FG2 FIX (2026-09-24): a timed-out SHARER holds the CREATOR's promise (same
      //   identity), so abandoning evicted a live call and forced a duplicate model call.
      //   Only the creator abandons; the creator's own ceiling guarantees the entry dies.
      if (timedOut && thisCall !== null && !sharedCall) this.abandonInFlight(cacheKey, thisCall);
      // ★ AND A FIRE THAT REACHED THE MODEL AND GAVE UP IS STILL A FIRE — its slot was
      //   already reserved at admission; only the economic meter moves here.
      if (!sharedCall) this.modelCalls += 1;
      const closed = policy.failPolarity === "closed";
      const suffix = timedOut ? "timeout" : `fail-${policy.failPolarity}`;
      const row: DecisionRow = {
        at: new Date(t0).toISOString(), ruleId: fire.ruleId, cls: fire.cls,
        questionVersion: QUESTION_VERSION, probability: closed ? 1 : 0,
        band: closed ? "act" : "ignore", action: closed ? "FIRE" : "IGNORE",
        policyName: `${policy.name}+${suffix}`, actThreshold: policy.act,
        flagThreshold: policy.flag, stateHash, costUsd: 0, target: fire.target, laterTruth: "unresolved",
      };
      this.ledger.push(row);
      return {
        ruleId: fire.ruleId, probability: row.probability, band: row.band as never, action: row.action as never,
        reason: timedOut
          ? `the judge exceeded the gate's ${(e as FireGateTimeout).ms}ms ceiling — fail-${policy.failPolarity} for the ${fire.cls} surface`
          : `judge unavailable (${e instanceof Error ? e.message.slice(0, 120) : "?"}) — fail-${policy.failPolarity} for the ${fire.cls} surface`,
        row, cached: false, latencyMs: (this.cfg.now ?? Date.now)() - t0,
      };
    }

    const a = answers.find((x) => x.id === "fire_is_real");
    // ★ A MISSING ANSWER **OR A CORRUPT ONE** IS UNCERTIFIABLE — never a silent pass.
    // A NaN or Infinity probability fails EVERY `>=` comparison, so before this guard it
    // landed in the LOWEST band REGARDLESS of the policy's fail polarity: a broken model
    // answer would have DISMISSED a violation on a fail-CLOSED surface (theatrical,
    // destructive) whose contract says REFUSE. A NaN therefore BYPASSED THE POLARITY
    // CONTRACT ENTIRELY. Found by the P5 red-team corpus (R-1, the J-numeric probes).
    // ★ EN-077 (PASS-6 HIGH) — FINITE IS NOT A PROBABILITY. `Number.isFinite` let p=-0.2 and
    //   p=1.5 through: they band (ignore / act) and are written to the ledger, where the W1
    //   validation would later REJECT the row — so the gate would produce a decision it
    //   cannot persist, and the ledger's own guard would fire on the gate's output. The range
    //   is checked HERE, at the source, with the same 0..1 contract the ledger enforces.
    if (a === undefined || !Number.isFinite(a.probability) || a.probability < 0 || a.probability > 1) {
      const why = a === undefined ? "no-answer" : "bad-answer";
      const closed = policy.failPolarity === "closed";
      const row: DecisionRow = {
        at: new Date(t0).toISOString(), ruleId: fire.ruleId, cls: fire.cls,
        questionVersion: QUESTION_VERSION, probability: closed ? 1 : 0,
        band: closed ? "act" : "ignore",
        action: closed ? "FIRE" : "IGNORE",
        policyName: `${policy.name}+${why}`, actThreshold: policy.act, flagThreshold: policy.flag,
        stateHash, costUsd: 0, target: fire.target, laterTruth: "unresolved",
      };
      this.ledger.push(row);
      return {
        ruleId: fire.ruleId, probability: row.probability, band: row.band as never,
        action: row.action as never,
        reason: a === undefined
          ? "the judge returned no answer for fire_is_real"
          : `the judge returned a NON-FINITE probability (${String(a.probability)}) for fire_is_real — routed by the ${policy.failPolarity} polarity, not by the comparison`,
        row, cached: false, latencyMs: 0,
      };
    }

    const p = a.probability;
    const band = p >= policy.act ? "act" : p >= policy.flag ? "escalate" : "ignore";
    const action = band === "act" ? "FIRE" : band === "escalate" ? "ESCALATE" : "IGNORE";
    this.cache.set(cacheKey, { probability: p });
    const row: DecisionRow = {
      at: new Date(t0).toISOString(), ruleId: fire.ruleId, cls: fire.cls,
      questionVersion: QUESTION_VERSION, probability: p, band, action,
      policyName: policy.name, actThreshold: policy.act, flagThreshold: policy.flag,
      stateHash, costUsd: 0, target: fire.target, laterTruth: "unresolved",
    };
    this.ledger.push(row);
    return {
      ruleId: fire.ruleId, probability: p, band: band as never, action: action as never,
      reason: `P(real)=${p.toFixed(3)} under ${policy.name} (act>=${policy.act}, flag>=${policy.flag})`,
      // ★ W2-1: a SHARED call is a cache hit in effect — the same state did not pay
      //   twice. Reporting it as `cached: false` would have hidden the very saving the
      //   single-flight exists to make.
      row, cached: sharedCall, latencyMs: (this.cfg.now ?? Date.now)() - t0,
    };
  }

  /** ★ HOT-SEAT W2-1 — ONE MODEL CALL PER STATE IN FLIGHT. Returns the shared promise
   *  and whether this caller CREATED it: only the creator spends budget, because only
   *  the creator makes a call. The map entry is removed when the call settles, so the
   *  long-lived cache below takes over for later (non-concurrent) repeats. */
  private judgeOnce(cacheKey: string, state: Record<string, unknown>): { answers: Promise<readonly { id: string; probability: number }[]>; shared: boolean } {
    const existing = this.inFlight.get(cacheKey);
    if (existing !== undefined) return { answers: existing, shared: true };
    const answers = this.cfg.judge.evaluate(state, [fireQuestion()]);
    this.inFlight.set(cacheKey, answers);
    // ★ EN-075 (PASS-6 HIGH) — COMPARE-AND-DELETE, and the eviction must also happen on a
    //   TIMEOUT. Two defects in one line of intent:
    //   (a) the first version deleted by KEY alone. An ORPHANED call (one whose caller
    //       timed out) can settle LATER and delete the entry a NEW call now owns — evicting
    //       a live call and letting a third caller start yet another. Delete only if the
    //       entry IS this promise.
    //   (b) a TIMED-OUT judge's promise NEVER settles, so these handlers never ran and the
    //       entry persisted FOREVER. Every later same-state fire inherited the hung promise.
    //       My H4-5 fix bounded ONE call; my W2-1 fix SHARED the call; the two composed
    //       into a SHARED HANG, and I described it in a commit without fixing it.
    const evict = () => { if (this.inFlight.get(cacheKey) === answers) this.inFlight.delete(cacheKey); };
    void answers.then(evict, evict);
    return { answers, shared: false };
  }

  /** ★ EN-075 — ABANDON AN IN-FLIGHT CALL THE CALLER HAS GIVEN UP ON. Called when the
   *  gate's own ceiling fires: the hung call is dead to us, and leaving it in the map would
   *  hand it to every later same-state fire.
   *  ★ PASS-7 HIGH — AND IT MUST BE COMPARE-AND-DELETE TOO. My first version deleted by KEY
   *  ALONE, while the settle-handler used compare-and-delete — THE EXACT INCONSISTENCY I WAS
   *  FIXING. A SHARER that times out (the entry is the creator's promise, not its own) would
   *  delete an entry a NEW call had since created. The identity is required, so the caller
   *  passes the call it is abandoning. */
  private abandonInFlight(cacheKey: string, abandoned: Promise<readonly { id: string; probability: number }[]>): void {
    if (this.inFlight.get(cacheKey) === abandoned) this.inFlight.delete(cacheKey);
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
  /** ★ EN-076 — the model calls actually made (≤ firesUsed under single-flight). */
  modelCallsUsed(): number { return this.modelCalls; }
  cacheSize(): number { return this.cache.size; }
}

// ════════════════════════════════════════════════════════════════════════════
// POSITION A — THE PRE-ACT ADVISORY (§S0). The operator's ruling was "1) both":
// the gate sits BEFORE the act as well as after the detector.
//
// WHY A BEFORE THE ACT: an act not yet taken can be steered for free. The
// v2.0 post-hoc refusal costs the agent the whole edit — the work is already
// done and is then thrown away. Here the same judgment arrives while the
// intent is still only an intent.
//
// ★ FAIL POLARITY: **OPEN**. An advisory that cannot reach the model MUST NEVER
//   block a legitimate act. That is not a convention here — it is the TYPE:
//   `block` is the literal `false`, so an edit that tried to make position A
//   refuse would fail to compile.
//
// ★ IT COMPOSES, DOES NOT DUPLICATE. The v1.3 gate already carries a pre-act
//   advisory (`gateAdvisory`, typed-write.ts:1213) — a DETERMINISTIC, $0
//   caller-listing that says which callers a change would break. That one
//   INFORMS. This one ADJUDICATES ("is this shape a violation?"). Both ride the
//   same moment; re-deriving the caller list here would be duplicate machinery.
// ════════════════════════════════════════════════════════════════════════════

/** What is ABOUT to happen — the pre-act shape. The difference between this and
 *  a detector's Fire is tense: an Intent describes an act not yet taken. */
export interface Intent {
  /** The tool that is about to run — edit, write, goal.complete, bash. */
  tool: string;
  /** What it is about to touch. */
  target: string;
  /** ★ THE PRE-ACT FACT the dumb rule keys on: was the target mapped before
   *  the act? `false` is the blind edit, and it is the whole point of having an
   *  advisory — the act can still be preceded by the query. */
  queriedBefore: boolean;
  /** Anything else the operator would want in the shape line. */
  detail?: string;
}

/** ★ THE ADVISORY'S RESULT. `block` is the literal `false`: position A cannot
 *  stop an act, and the type system enforces it rather than a comment. */
export interface Advisory {
  /** `steer` = the shape looks like a violation; the act still proceeds. */
  verdict: "pass" | "steer";
  /** ★ ALWAYS false. The fail-open law, in the type. */
  block: false;
  /** The model's probability, or null when the advisory could not reach it. */
  probability: number | null;
  /** The operator-readable why, carrying the rule, the probability and the
   *  threshold in force (§6.4.3 rule 3). */
  reason: string;
  /** The decision row, when a judgment actually happened (SC-8). */
  row: DecisionRow | null;
  /** The NAMED degradation, when the advisory ran fail-open or could not
   *  certify. Null when a real judgment was obtained. */
  skipped: { code: string; message: string } | null;
}

const DESTRUCTIVE_HINT = /(^|[\s"])(rm|rmdir|dd|mkfs|shutdown|reboot|kill|pkill|drop|truncate)(\s|$)|--force|--hard|-rf\b|:\s*>|>\s*\/dev\/sd/;
const CLOSE_HINT = /(complete|close|done|finish|ship|finalize|merge)/i;

/** Derive the class of an INTENT with the SAME vocabulary the detectors use
 *  (`dumb` | `theatrical` | `destructive`). Destructive wins: an intent that
 *  could destroy outranks one that merely claims. */
export function intentFire(intent: Intent): Fire {
  const probe = `${intent.tool} ${intent.target}`;
  const cls = DESTRUCTIVE_HINT.test(probe)
    ? "destructive"
    : CLOSE_HINT.test(intent.tool)
      ? "theatrical"
      : "dumb";
  return {
    ruleId: `*${cls}`,
    cls,
    shape: `intended ${intent.tool} on ${intent.target}`,
    tool: intent.tool,
    target: intent.target,
    // the same field the dumb detector fills, in the same truthy vocabulary —
    // one vocabulary across both positions.
    evidence: `queriedBefore=${intent.queriedBefore}${intent.detail !== undefined ? ` ${intent.detail}` : ""}`,
  };
}

/** ★ ADJUDICATE AN INTENT — position A. ALWAYS returns; NEVER throws on a
 *  degraded path; NEVER blocks. Every degradation is NAMED in `skipped`, so
 *  "the model said it was fine" and "the model could not be reached" are
 *  distinguishable — which is exactly what an advisory must preserve. */
export async function advisory(gate: FireGate, intent: Intent, ctx: AbsorbedContext): Promise<Advisory> {
  const fire = intentFire(intent);
  let d: FireDecision;
  try {
    d = await gate.judge(fire, ctx);
  } catch (e) {
    // THE FAIL-OPEN PATH. A down judge, a spent budget (D017), any throw — the
    // act PROCEEDS and the reason is CARRIED. An advisory is a courtesy; it is
    // never a gate.
    const message = e instanceof Error ? e.message : String(e);
    return {
      verdict: "pass", block: false, probability: null, row: null,
      reason: `advisory unavailable — the act proceeds (fail-open): ${message}`,
      skipped: { code: "GI_ADVISORY_OPEN", message },
    };
  }

  // The gate's OWN degraded rows carry a suffix on the policy name. Read it
  // through the SHARED vocabulary, never by prose and never by a local copy of
  // the string list — a consumer that pattern-matches suffixes itself will miss
  // the next one added (R-1's `+bad-answer` would have been such a miss).
  const suffix = degradationOf(d.row.policyName);
  if (suffix !== null) {
    return {
      verdict: "pass", block: false, probability: d.probability, row: d.row,
      reason: `advisory could not certify the intent — the act proceeds (fail-open): ${d.reason}`,
      skipped: { code: `GI_ADVISORY_OPEN:${suffix}`, message: d.reason },
    };
  }

  const steer = d.band === "act";
  return {
    verdict: steer ? "steer" : "pass",
    block: false,
    probability: d.probability,
    reason: steer
      ? `ADVISORY STEER [${fire.ruleId}] — ${d.reason}`
      : `advisory pass [${fire.ruleId}] — the intended act does not read as a violation (${d.reason})`,
    row: d.row,
    skipped: null,
  };
}
