// layer-registry — ★ THE T0 INTERFACE (the 6L+2E consumption contract).
//
// THE OPERATOR'S LAW this module makes mechanical:
//   "A LAYER IS UP IFF ITS FACT CHANGED A VERDICT."
//
// `up=11/11` is a health check on FILES — a light switch. It says a path exists.
// It says NOTHING about whether any decision ever READ it. The measured state that
// produced this module: 6 layer ids appearing ONLY in hard-deps.ts, 12 of 23 src/omp
// modules unreachable from the entry point, and a deployed bundle carrying zero
// v2.x symbols. Every layer was "up". None was consumed.
//
// THE CONSUMPTION CHAIN this module defines:
//   substrate UP  →  facts() returns ≥1 fact  →  the DECISION reads it  →  a VERDICT changes
// A break at any link is a NAMED, LOUD state — never a silent pass, never rows:0:
//   GI_LAYER_DOWN        the substrate does not answer (the register's own codes carry the why)
//   GI_LAYER_UNCONSUMED  the substrate answers but contributes ZERO facts to the decision
//   CONSUMED             the substrate answers AND its facts reached the decision
//
// ★ TYPES ONLY — this file imports NO adapter. The adapters import THIS. That
// direction is what lets the 8 edges be written in parallel against a frozen
// interface, and what makes the wiring (D-2) the single point that cannot drift.
import type { LayerId } from "./kernel-v2.ts";

/** The 6 graph layers + the 2 Jev kernels. The consumer set is closed. */
export type KernelId = "TSG" | "ABIDE";
export type ConsumerId = LayerId | KernelId;

/** WHERE in the decision a consumer's facts land. A rung is a position in the
 *  kernel's own reasoning, not a label: a settlement fact can flip a verdict, a
 *  context fact can only inform one. */
export type Rung =
  | "decision" // L1 SEMANTICA — a precedent the verdict may cite
  | "settlement" // L5 CORBELL + L6 GRAPHIFY — the graph facts a verdict settles on
  | "context" // L3 UA + L4 C2KG — surrounding structure the decision reads
  | "knowledge" // L2 ARSUMBRIS — the typed repo knowledge
  | "meaning" // TSG — the meaning gate
  | "repair"; // ABIDE — the repair path (never a block)

/** ONE fact a consumer contributes. A fact without its `source` anchor is not a
 *  fact — it is an assertion, and the registry refuses to count it. */
export interface LayerFact {
  consumer: ConsumerId;
  rung: Rung;
  /** the symbol / predicate the fact is ABOUT (the join key) */
  subject: string;
  /** what the decision may read (a predicate, an edge kind, a precedent, a repair) */
  value: unknown;
  /** WHERE it came from — the substrate path + the row/edge anchor. MANDATORY. */
  source: string;
}

/** The probe a substrate answers with. `up` alone is a light switch; the registry
 *  never reports CONSUMED on `up` alone. */
export interface SubstrateProbe {
  up: boolean;
  /** The evidence the substrate answers with — a path that exists, a row count, a code.
   *  A probe that cannot state its evidence is DOWN by construction. */
  evidence: string;
}

/** ★ THE CONSUMER CONTRACT. Each of the 8 edges implements exactly this. */
export interface ConsumerProbe {
  id: ConsumerId;
  rung: Rung;
  /** WHAT it cannot run without, named. Never "optional". */
  dependency: string;
  /** The loud code raised when the substrate is absent (the register's own code). */
  errorCode: string;
  /** Ask reality. A throw is DOWN; silence is never UP. */
  up(): SubstrateProbe;
  /** ★ THE CONSUMPTION SURFACE: the facts this consumer contributes about `subject`.
   *  An EMPTY array means WIRED-BUT-SILENT → the registry reports GI_LAYER_UNCONSUMED.
   *  A fact whose `source` is empty is DISCARDED (counted, never silent). */
  // ★ F-520 FIX (2026-09-24): probes MUST be pure/idempotent — audit() and factsFor() each call
  //   up() + facts() independently, so a stateful/side-effectful probe can make the two views
  //   (audit verdicts vs the decision's facts) disagree. No shared contract change; documented.
  facts(subject: string): LayerFact[];
}

/** The per-consumer verdict. This is the ONLY shape a "the layer works" claim may cite. */
export interface ConsumptionReport {
  consumer: ConsumerId;
  rung: Rung;
  up: boolean;
  evidence: string;
  /** how many facts it returned for the probed subject (post-anchor-filter) */
  factsReturned: number;
  /** facts whose `source` was empty — discarded, never counted */
  factsDiscarded: number;
  /** ★ THE ONLY GREEN: up AND factsReturned > 0 */
  consumed: boolean;
  // ★ DPL1 §7 A6: a consumer that THROWS mid-query is GI_LAYER_ERROR:<id> — DISTINCT from
  //   GI_LAYER_DOWN (a substrate ABSENCE). The DPL1 names both tokens; conflating them hides
  //   a fault behind an absence.
  verdict: "CONSUMED" | "GI_LAYER_UNCONSUMED" | "GI_LAYER_DOWN" | `GI_LAYER_ERROR:${string}`;
}

/** ★ THE REGISTRY. The decision asks IT; it never reaches a substrate directly. */
export interface LayerRegistry {
  register(probe: ConsumerProbe): void;
  consumers(): readonly ConsumerProbe[];
  /** ★ THE CONSUMPTION PROBE (D-1): every consumer, asked for one subject. */
  audit(subject: string): ConsumptionReport[];
  /** ★ THE DECISION'S VIEW (D-2): the facts for a subject, tagged by consumer. */
  factsFor(subject: string): LayerFact[];
  /** The consumers that CONTRIBUTED at least one fact for this subject. */
  decisionsInfluenced(subject: string): ConsumerId[];
  /** One line an operator can act on: `consumed:8/8` or the offenders named. */
  summary(subject: string): string;
}

/** A fact is only a fact when it carries its anchor. Empty source ⇒ DISCARDED. */
export function isAnchored(f: LayerFact): boolean {
  return typeof f.source === "string" && f.source.trim().length > 0;
}

/** Build a registry over a fixed consumer set. Registration is idempotent by id:
 *  a duplicate id REPLACES (so a test can override one consumer without rebuilding). */
export function createLayerRegistry(): LayerRegistry {
  const byId = new Map<ConsumerId, ConsumerProbe>();

  const auditOne = (p: ConsumerProbe, subject: string): ConsumptionReport => {
    let probe: SubstrateProbe;
    try {
      // ★ AUDIT H-8 FIXED: the first version trusted the probe's return shape — a null/
      //   undefined return threw OUTSIDE this try and aborted the WHOLE audit for all 8
      //   consumers. The shape is now validated here: one malformed adapter marks ITSELF
      //   DOWN instead of taking the registry with it.
      const raw = p.up() as SubstrateProbe | null | undefined;
      probe = raw !== null && raw !== undefined && typeof raw.up === "boolean"
        ? { up: raw.up, evidence: typeof raw.evidence === "string" ? raw.evidence : "" }
        : { up: false, evidence: "the probe returned a malformed shape (no boolean `up`) — DOWN by construction" };
    } catch (e) {
      // A probe that THROWS is DOWN. Silence is never UP.
      probe = { up: false, evidence: e instanceof Error ? e.message : String(e) };
    }
    if (!probe.up) {
      return {
        consumer: p.id,
        rung: p.rung,
        up: false,
        evidence: probe.evidence,
        factsReturned: 0,
        factsDiscarded: 0,
        consumed: false,
        verdict: "GI_LAYER_DOWN",
      };
    }
    let raw: LayerFact[] = [];
    try {
      // ★ AUDIT H-8 (the class, swept): a non-array (or a null-containing array) threw at
      //   `raw.filter(isAnchored)` OUTSIDE the try. The shape is normalized here.
      const got = p.facts(subject) as unknown;
      raw = Array.isArray(got) ? (got.filter((f) => f !== null && typeof f === "object") as LayerFact[]) : [];
      if (!Array.isArray(got)) {
        // ★ F-519 FIX (2026-09-24): a non-array is a MID-QUERY fault (the substrate ANSWERED
        //   with the wrong shape), not an absent substrate — DOWN contradicted up:true and
        //   conflated the taxonomy. Same token as the throw path below.
        return {
          consumer: p.id, rung: p.rung, up: true,
          evidence: "facts() returned a NON-ARRAY — malformed response, not an absent substrate",
          factsReturned: 0, factsDiscarded: 0, consumed: false, verdict: `GI_LAYER_ERROR:${p.id}`,
        };
      }
    } catch (e) {
      // ★ DPL1 §7 A6: a consumer that THROWS while reading is GI_LAYER_ERROR:<id> — the
      //   DISTINCT mid-query-fault token (never "returned zero facts", never a bare DOWN).
      //   The three states are distinct on purpose: UNCONSUMED = a wiring gap · DOWN = an
      //   absent substrate · ERROR:<id> = the substrate answered but the read faulted.
      return {
        consumer: p.id,
        rung: p.rung,
        up: true,
        evidence: `facts() threw: ${e instanceof Error ? e.message : String(e)}`,
        factsReturned: 0,
        factsDiscarded: 0,
        consumed: false,
        verdict: `GI_LAYER_ERROR:${p.id}`,
      };
    }
    const anchored = raw.filter(isAnchored);
    const discarded = raw.length - anchored.length;
    const consumed = anchored.length > 0;
    return {
      consumer: p.id,
      rung: p.rung,
      up: true,
      evidence: probe.evidence,
      factsReturned: anchored.length,
      factsDiscarded: discarded,
      consumed,
      verdict: consumed ? "CONSUMED" : "GI_LAYER_UNCONSUMED",
    };
  };

  const registry: LayerRegistry = {
    register(probe: ConsumerProbe): void {
      byId.set(probe.id, probe);
    },
    consumers(): readonly ConsumerProbe[] {
      return [...byId.values()];
    },
    audit(subject: string): ConsumptionReport[] {
      return [...byId.values()].map((p) => auditOne(p, subject));
    },
    factsFor(subject: string): LayerFact[] {
      const out: LayerFact[] = [];
      for (const p of byId.values()) {
        try {
          // ★ F-405 FIX (2026-09-24): auditOne validates the probe shape (malformed → DOWN
          //   with evidence); factsFor trusted p.up().up, so a non-object truthy return
          //   silently skipped the consumer and the two views disagreed. Same rule here:
          //   only boolean-true up contributes; malformed-or-DOWN contributes nothing.
          // ★ F-706 FIX (2026-09-24): factsFor used `.up !== true` while auditOne validates
          // `typeof raw.up === "boolean"` - a truthy non-boolean (up:1) read UP in audit but
          // vanished in factsFor (two-view drift). Same rule as auditOne: boolean-shaped and true.
          const rawProbe: unknown = p.up();
          const probeValid = typeof rawProbe === "object" && rawProbe !== null && typeof (rawProbe as { up?: unknown }).up === "boolean";
          if (!probeValid || (rawProbe as { up?: unknown }).up !== true) continue;
          // ★ F-354 FIX (2026-09-24): a null/non-object fact used to throw inside
          //   isAnchored, and the catch dropped the consumer's ENTIRE contribution —
          //   auditOne already filtered before isAnchored, factsFor did not. Same
          //   filter here: only the bad fact is discarded, never the whole consumer.
          const got: unknown = p.facts(subject);
          // ★ F-707 FIX (2026-09-24): a non-array facts() return vanished here with zero trace
          // while auditOne reports GI_LAYER_ERROR for the same consumer (two-view drift).
          // factsFor's contract stays facts-only, but the fault is now LOUD on stderr.
          if (!Array.isArray(got)) { console.error('[layer-registry] factsFor: consumer ' + p.id + ' returned non-array facts - see audit GI_LAYER_ERROR:' + p.id); continue; }
          for (const f of got) {
            if (f !== null && typeof f === "object" && isAnchored(f as LayerFact)) out.push(f as LayerFact);
          }
        } catch (factsErr) {
          // ★ F-707 FIX (2026-09-24): a throwing consumer contributes nothing to the decision
          // (reported GI_LAYER_ERROR by audit(), never smuggled in as an empty answer) - but
          // the fault is now LOUD on stderr instead of a silent continue.
          console.error('[layer-registry] factsFor: consumer ' + p.id + ' threw mid-query - see audit GI_LAYER_ERROR:' + p.id + ': ' + (factsErr instanceof Error ? factsErr.message : String(factsErr)));
          continue;
        }
      }
      return out;
    },
    decisionsInfluenced(subject: string): ConsumerId[] {
      return [...new Set(registry.factsFor(subject).map((f) => f.consumer))];
    },
    summary(subject: string): string {
      const reports = registry.audit(subject);
      const consumed = reports.filter((r) => r.consumed);
      const down = reports.filter((r) => r.verdict === "GI_LAYER_DOWN");
      const unconsumed = reports.filter((r) => r.verdict === "GI_LAYER_UNCONSUMED");
      // ★ F-708 FIX (2026-09-24): GI_LAYER_ERROR verdicts (mid-query faults) were invisible here -
      // the operator saw consumed:6/8 with no hint that consumers faulted. Named error bucket.
      const errors = reports.filter((r) => r.verdict.startsWith("GI_LAYER_ERROR"));
      const parts = [
        `consumed:${consumed.length}/${reports.length}`,
        `rungs=${[...new Set(consumed.map((r) => r.rung))].sort().join(",") || "none"}`,
      ];
      if (unconsumed.length > 0) parts.push(`GI_LAYER_UNCONSUMED=${unconsumed.map((r) => r.consumer).join(",")}`);
      if (down.length > 0) parts.push(`GI_LAYER_DOWN=${down.map((r) => r.consumer).join(",")}`);
      if (errors.length > 0) parts.push(`GI_LAYER_ERROR=${errors.map((r) => r.consumer).join(",")}`);
      return parts.join(" ");
    },
  };
  return registry;
}
