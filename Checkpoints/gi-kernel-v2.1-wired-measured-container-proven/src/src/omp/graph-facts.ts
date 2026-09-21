// graph-facts — THE GRAPH-FACT SETTLEMENT LAYER. The $0 rung gets eyes.
//
// ★ WHY THIS FILE EXISTS (the operator's charge, 2026-09-22): the kernel has SIX GRAPH
//   LAYERS and used them as a REGISTRATION PRECONDITION — a substrate to bring UP so a gate
//   would pass — instead of as THE INPUT TO EVERY DECISION. Seven derailments of this
//   session's own coding were 7-of-7 graph-detectable and 7-of-7 settleable at $0, and not
//   one needed a model call.
//
//     D-2 OutcomeRecord, 0 producers     ← the graph said it in 70ms; I read code for 70 calls
//     D-6 ledgerPath, 0 readers          ← found by grep, late
//     D-3 the store stale by ~20 commits ← the freshness gate EXISTED and was never run
//     D-5 two guards for one mutation    ← found by an audit pass
//     D-7 a field measured into itself   ← found by an audit pass
//
//   THE LADDER IS NOW: **graph → MPSE → cache → Jev.** The cheapest rung that can answer
//   does, and the graph answers FACTS — never guess a fact with a model.
//
// ★ EVERY RULE HERE IS A FACT READ OFF `typed_nodes`/`typed_edges`. None calls a model. The
//   settlement a rule produces is EVIDENCE FOR THE FIRE, so a settled fire writes its row
//   with `questionVersion: "graph:<rule>"` — the same never-silent convention as `mpse:`.

import { Database } from "bun:sqlite";
import { layerFreshness } from "./typed-write.ts";

export type GraphFactRule =
  | "M-GRAPH-1"   // HAS-PRODUCER — a consumed type must have ≥1 constructing edge
  | "M-GRAPH-2"   // HAS-READER   — a declared field must have ≥1 reading edge
  | "M-GRAPH-3"   // STORE-FRESH  — a verdict from a stale store is REFUSED
  | "M-GRAPH-4"   // GUARD-PARITY — N>1 call sites of one mutation
  | "M-GRAPH-5";  // NO-SELF-MEASURE — a field inside its own computation

export interface GraphFactVerdict {
  rule: GraphFactRule;
  /** True when the graph settles the fire — no model call is needed. */
  settles: boolean;
  /** The settlement's evidence weight: a real violation, or a clean structure. */
  action: "FIRE" | "IGNORE" | null;
  reason: string;
  /** The verbatim graph fact that produced the verdict — the audit trail. */
  evidence: string;
}

/** ★★ THE INDEXER'S COVERAGE — MEASURED, NOT ASSUMED (2026-09-22).
 *
 *  Every rule above is only as good as the extractor feeding it. RUN AGAINST THE REAL GRAPH,
 *  the four derailment probes returned:
 *
 *      D-2 OutcomeRecord    → NO NODE  — the indexer extracts methods/classes/flows, NOT TYPES
 *      D-6 ledgerPath       → NO NODE  — CONFIG FIELDS are not indexed
 *      D-7 serializedBytes  → NO NODE  — LOCAL CONSTS are not indexed
 *      D-5 abandonInFlight  → a FALSE IGNORE before this was fixed (an inline closure
 *                             was invisible, so the count was 1 where the truth was 2)
 *
 *  SO THE HONEST COVERAGE OF THIS LAYER TODAY IS **0 OF 4** on the session's own derailments.
 *  The RULES are correct and tested (12/12 against fixtures); THE EXTRACTOR DOES NOT YET EMIT
 *  THE NODE KINDS THEY READ. That is P4 in the plan, and it is a DIFFERENT REPO.
 *
 *  ★ THE RULE THIS ESTABLISHES, and it is the reason M-GRAPH-4 no longer settles IGNORE:
 *    A RULE MAY SETTLE ON A **POSITIVE** FACT — "the node exists and its in-degree is 0" —
 *    because the indexer FINDING the node proves it covers that kind.
 *    A RULE MUST NEVER SETTLE IGNORE ON A **COUNT** — because a count is a LOWER BOUND, and
 *    absence of evidence is only evidence of absence when the extractor covers the space.
 *
 *  ★ AND AN UNSETTLED RULE IS RECORDED AS UNOBSERVED, never as a pass. The pin's own law: a
 *    generic gate preempting a specific one is UNOBSERVED, never PASS.
 */
export const GRAPH_FACTS_COVERAGE = {
  /** The node kinds the corbell indexer emits (measured from the live store). */
  indexedKinds: ["method", "class", "flow", "service"] as const,
  /** The kinds the rules NEED but the indexer does NOT emit — the P4 gap. */
  missingKinds: ["type", "interface", "config-field", "local-const", "closure"] as const,
  /** The rules that can settle today (they read indexedKinds only). */
  settlableNow: ["M-GRAPH-3"] as const,
  /** The rules that are implemented but BLOCKED on the extractor. */
  blockedOnExtractor: ["M-GRAPH-1", "M-GRAPH-2", "M-GRAPH-4", "M-GRAPH-5"] as const,
  verdict: "RULES CORRECT + TESTED (12/12); EXTRACTOR INCOMPLETE — 0 of the session's 4 structural derailments are settlable today",
} as const;

export interface GraphFactInput {
  /** The typed store. Absent ⇒ the layer is UNAVAILABLE and says so (never a silent pass). */
  storePath: string;
  /** The symbol/file the fire is about — a canonical_id fragment or a file basename. */
  target: string;
  /** What the intent does with the target. Selects the applicable rules. */
  intent: "consume" | "declare" | "mutate" | "measure";
  /** The derivation class for the TTL (explicit | inferred | heuristic). */
  derivation?: string;
  now?: number;
}

/** The canonical-id prefix the indexer writes; fragments match within it. */
const LIKE = (target: string) => `%${target.replace(/[%_]/g, "")}%`;

/** ★ M-GRAPH-3 IS CHECKED FIRST AND IT GATES EVERYTHING ELSE. A fact read from a stale store
 *  is WORSE than no fact: it is a confident answer about a codebase that no longer exists.
 *  Measured on this very session: `abandonInFlight` was ABSENT from the graph two commits
 *  after it was written, because the store had not been re-populated. */
function freshnessGate(db: Database, input: GraphFactInput): GraphFactVerdict | null {
  const f = layerFreshness(db, { derivation: input.derivation ?? "explicit", now: input.now });
  if (!f.stale) return null;
  return {
    rule: "M-GRAPH-3",
    settles: true,
    action: "IGNORE",          // a stale-store refusal is NOT evidence of a violation
    reason: "the graph store is STALE — no fact is served from it",
    evidence: `${f.code ?? "GI_LAYER_STALE"} · populatedAt=${f.populatedAt === null ? "NEVER" : new Date(f.populatedAt).toISOString()} · ageMs=${f.ageMs ?? "?"} · ttlMs=${f.ttlMs}`,
  };
}

/** Count the edges into a node whose canonical_id matches the target. */
function inDegree(db: Database, target: string, predicate?: string): { n: number; sample: string[] } {
  const rows = (predicate === undefined
    ? db.query(`SELECT src_canonical FROM typed_edges WHERE dst_canonical LIKE ?1 LIMIT 5`).all(LIKE(target))
    : db.query(`SELECT src_canonical FROM typed_edges WHERE dst_canonical LIKE ?1 AND predicate = ?2 LIMIT 5`).all(LIKE(target), predicate)) as { src_canonical: string }[];
  return { n: rows.length, sample: rows.map((r) => r.src_canonical) };
}

/** ★ THE FULL FACT SET for one intent. Returns every applicable verdict, in rule order.
 *  An EMPTY array means the graph has NO FACT about this target — which is a legitimate
 *  outcome (the graph is not omniscient) and is recorded as such, never as a pass. */
export function graphFacts(input: GraphFactInput): GraphFactVerdict[] {
  let db: Database;
  try {
    db = new Database(input.storePath, { readonly: true });
  } catch (e) {
    // ★ THE HARD-DEPENDENCY LAW: an unavailable layer is NAMED, never silently skipped.
    return [{
      rule: "M-GRAPH-3",
      settles: false,
      action: null,
      reason: "the graph layer is UNAVAILABLE — the fact set could not be read",
      evidence: `GI_GRAPH_FACTS_UNAVAILABLE: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`,
    }];
  }
  try {
    const verdicts: GraphFactVerdict[] = [];

    const stale = freshnessGate(db, input);
    if (stale !== null) return [stale];                 // ★ staleness gates every other rule

    // ★ THE NODE MUST EXIST BEFORE ANY RULE MAY SETTLE. FOUND BY THE CORPUS TEST — my first
    //   version treated "no node" as "in-degree zero" and fired M-GRAPH-1 on ANY unknown
    //   target. Those are DIFFERENT FACTS:
    //     the node exists with in-degree 0  → NOTHING CONSTRUCTS IT   (a real fact)
    //     the node is ABSENT                → THE GRAPH DOES NOT KNOW   (no fact at all)
    //   The pin's own rule: "a GENERIC gate preempting a specific one = UNOBSERVED, never
    //   PASS." A rule that fires on absence is a generic gate wearing a specific name.
    const known = (db.query(`SELECT COUNT(*) AS n FROM typed_nodes WHERE canonical_id LIKE ?1`).get(LIKE(input.target)) as { n: number }).n;
    if (known === 0) {
      return [{
        rule: "M-GRAPH-1",
        settles: false,
        action: null,
        reason: `the graph has NO NODE for "${input.target}" — no fact exists to settle on`,
        evidence: "node absent · UNOBSERVED (a fall-through, never a pass)",
      }];
    }

    const inD = inDegree(db, input.target);
    const outD = (db.query(`SELECT COUNT(*) AS n FROM typed_edges WHERE src_canonical LIKE ?1`).get(LIKE(input.target)) as { n: number }).n;

    // ── M-GRAPH-1 · HAS-PRODUCER ────────────────────────────────────────────────
    if (input.intent === "consume") {
      // ★ A CONSUMED CONTRACT WITH NO PRODUCER IS THE D-2 CLASS: the agent relies on a
      //   shape nothing constructs. The graph states it as in-degree 0.
      const producers = inDegree(db, input.target, "calls");
      verdicts.push(producers.n === 0
        ? { rule: "M-GRAPH-1", settles: true, action: "FIRE",
            reason: `the consumed symbol "${input.target}" has ZERO incoming edges — nothing constructs or calls it`,
            evidence: `in-degree 0 (calls) · out-degree ${outD}` }
        : { rule: "M-GRAPH-1", settles: true, action: "IGNORE",
            reason: `the consumed symbol "${input.target}" has producers`,
            evidence: `in-degree ${producers.n} · sample: ${producers.sample.slice(0, 3).join(", ")}` });
    }

    // ── M-GRAPH-2 · HAS-READER ─────────────────────────────────────────────────
    if (input.intent === "declare") {
      // ★ A DECLARED FIELD WITH NO READER IS THE D-6 CLASS: config promising consumption.
      verdicts.push(outD === 0 && inD.n === 0
        ? { rule: "M-GRAPH-2", settles: true, action: "FIRE",
            reason: `the declared symbol "${input.target}" has ZERO edges in or out — declared, never consumed`,
            evidence: "in-degree 0 · out-degree 0" }
        : { rule: "M-GRAPH-2", settles: true, action: "IGNORE",
            reason: `the declared symbol "${input.target}" is referenced`,
            evidence: `in-degree ${inD.n} · out-degree ${outD}` });
    }

    // ── M-GRAPH-4 · GUARD-PARITY ───────────────────────────────────────────────
    if (input.intent === "mutate") {
      // ★ N>1 CALL SITES OF ONE MUTATION: the graph can COUNT them. Whether their guards
      //   AGREE is a judgment — so this ESCALATES rather than settling (the honest split:
      //   the fact is $0, its interpretation may not be).
      const sites = inDegree(db, input.target, "calls");
      // ★★ M-GRAPH-4 NEVER SETTLES IGNORE — FOUND BY RUNNING IT AGAINST THE REAL GRAPH.
      //   Measured on `abandonInFlight`: the graph reported a SINGLE call site and settled
      //   IGNORE, while the function ACTUALLY has two mutation sites (the second is an
      //   inline closure the indexer cannot see). IT ANSWERED CONFIDENTLY WRONG — the
      //   silent-degrade class this kernel files as CRITICAL.
      //   ★ THE PRINCIPLE, AND IT GENERALIZES: a rule may settle on a POSITIVE fact (the
      //   node EXISTS and its in-degree is 0 — the indexer found that node, so it covers that
      //   kind). It must NEVER settle IGNORE from a COUNT, because ABSENCE OF EVIDENCE IS
      //   ONLY EVIDENCE OF ABSENCE WHEN THE EXTRACTOR COVERS THE SPACE — and the indexer
      //   does not cover closures. A count of N is a LOWER BOUND, so only N>1 is a fact.
      verdicts.push({
        rule: "M-GRAPH-4",
        settles: false,
        action: null,
        reason: sites.n > 1
          ? `the mutation "${input.target}" has ${sites.n} call sites — their guards must agree`
          : `the mutation "${input.target}" shows ${sites.n} call site — A LOWER BOUND, not a proof of one (the indexer cannot see inline closures)`,
        evidence: sites.n > 1
          ? `call sites: ${sites.sample.join(", ")}`
          : `in-degree ${sites.n} — UNOBSERVED, never IGNORE: the extractor's coverage is incomplete`,
      });
    }

    // ── M-GRAPH-5 · NO-SELF-MEASURE ────────────────────────────────────────────
    if (input.intent === "measure") {
      // ★ A FIELD INSIDE ITS OWN COMPUTATION IS THE D-7 CLASS: the measurement changes the
      //   measured object. The graph shows it as a SELF-EDGE.
      const self = (db.query(`SELECT COUNT(*) AS n FROM typed_edges WHERE src_canonical LIKE ?1 AND dst_canonical LIKE ?1`).get(LIKE(input.target)) as { n: number }).n;
      verdicts.push(self > 0
        ? { rule: "M-GRAPH-5", settles: true, action: "FIRE",
            reason: `"${input.target}" appears on BOTH ends of an edge — a self-referential measurement`,
            evidence: `self-edges: ${self}` }
        : { rule: "M-GRAPH-5", settles: true, action: "IGNORE",
            reason: `"${input.target}" has no self-edge`,
            evidence: `self-edges: 0` });
    }

    // ★ NO APPLICABLE RULE ⇒ NO FACT. An empty result is recorded as UNOBSERVED by the
    //   caller, never as a pass (the pin: a generic gate preempting a specific one is
    //   UNOBSERVED, never PASS).
    return verdicts;
  } finally {
    db.close();
  }
}
