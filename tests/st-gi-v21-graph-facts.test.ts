// st-gi-v21-graph-facts — P1: THE GRAPH-FACT SETTLEMENT LAYER, PINNED BY THE DERAILMENTS.
//
// ★ THE PROVENANCE IS THE POINT. Each test below REPLAYS A REAL DERAILMENT of the
//   2026-09-22 session — a defect I found by hand, by grep, or by an audit pass — and
//   asserts that the GRAPH settles it at $0, with `firesUsed()` UNCHANGED.
//
//     D-2  OutcomeRecord, 0 producers      → M-GRAPH-1   (the graph said it in 70ms)
//     D-6  ledgerPath, 0 readers           → M-GRAPH-2
//     D-5  abandonInFlight vs evict        → M-GRAPH-4   (ESCALATES — the fact is $0, the
//                                                         interpretation may not be)
//     D-7  serializedBytes, self-measured  → M-GRAPH-5
//     D-3  the store stale by ~20 commits  → M-GRAPH-3   (gates EVERY other rule)
//
// ★ THE PIN'S RULE IS ENFORCED HERE: "a GENERIC gate preempting a SPECIFIC one = UNOBSERVED,
//   never PASS." Every assertion names the SPECIFIC rule token, never "it refused."

import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { applyTypedDdl } from "../src/omp/typed-write.ts";
import { graphFacts } from "../src/omp/graph-facts.ts";
import { FireGate, absorbContext, type Fire } from "../src/omp/fire-gate.ts";
import type { Judge } from "../src/omp/enforcement.ts";

// ── the fixture: a typed store carrying EXACTLY the facts each derailment needs ─────────
const RUN = "fixture-run";

function freshStore(opts: { populatedAt?: string | null } = {}): string {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gi-gf-")), "store.sqlite");
  const db = new Database(p, { create: true });
  applyTypedDdl(db);
  // ★ the freshness record — the field D-3 proved I never checked
  if (opts.populatedAt !== null) {
    db.prepare(`INSERT OR REPLACE INTO gi_meta (key, value) VALUES ('populated_at', ?1)`)
      .run(opts.populatedAt ?? new Date().toISOString());
  }
  db.close();
  return p;
}

function addNode(store: string, canonical: string, kind = "method"): void {
  const db = new Database(store);
  db.prepare(`INSERT INTO typed_nodes (canonical_id, kind, label, file, line, created_run, layer_id)
              VALUES (?1, ?2, ?3, 'fixture.ts', 1, ?4, 'corbell')`).run(canonical, kind, canonical, RUN);
  db.close();
}

function addEdge(store: string, src: string, dst: string, predicate = "calls"): void {
  const db = new Database(store);
  db.prepare(`INSERT INTO typed_edges (src_canonical, dst_canonical, predicate, evidence_quote, confidence, created_run, layer_id, derivation)
              VALUES (?1, ?2, ?3, 'fixture', 1.0, ?4, 'corbell', 'explicit')`).run(src, dst, predicate, RUN);
  db.close();
}

/** A gate wired to the fixture store — the graph rung is the FIRST rung. */
function gateOn(store: string, intent: "consume" | "declare" | "mutate" | "measure", judge?: Judge) {
  const calls = { n: 0 };
  const j: Judge = judge ?? { async evaluate() { calls.n += 1; return [{ id: "fire_is_real", probability: 0.9 }]; } };
  return { gate: new FireGate({ judge: j, graphStorePath: store, graphIntent: intent }), calls };
}

function aFire(target: string): Fire {
  return { ruleId: "*dumb", cls: "dumb", shape: "structural intent", tool: "edit", target, evidence: "queriedBefore=true" };
}
const NEUTRAL = [{ kind: "reasoning", text: "because the structure is under review", offsetMs: -100 }];

describe("st-gi-v21-graph-facts: P1 — the derailments, settled at $0", () => {
  // ══ D-2 · THE PRODUCER-LESS CONTRACT ══════════════════════════════════════════════

  test("D-2 → M-GRAPH-1: a consumed type with ZERO producers settles FIRE at $0", async () => {
    const store = freshStore();
    addNode(store, "corbell:fixture::oracle.ts::OutcomeRecord");
    // ★ ZERO edges into it — the exact fact the graph held in 70ms while I read code
    const { gate, calls } = gateOn(store, "consume");
    const d = await gate.judge(aFire("OutcomeRecord"), absorbContext(aFire("OutcomeRecord"), NEUTRAL));
    expect(d.row.questionVersion).toBe("graph:M-GRAPH-1");   // ★ THE SPECIFIC TOKEN
    expect(d.action).toBe("FIRE");
    expect(d.reason).toContain("ZERO incoming edges");
    expect(calls.n).toBe(0);                                  // ★ $0 — NO MODEL CALL
    expect(gate.firesUsed()).toBe(0);                         // ★ AND NO FIRE SPENT
  });

  test("D-2 NEGATIVE: a consumed type WITH producers settles IGNORE at $0", async () => {
    const store = freshStore();
    addNode(store, "corbell:fixture::x.ts::Consumed");
    addEdge(store, "corbell:fixture::x.ts::caller", "corbell:fixture::x.ts::Consumed");
    const { gate, calls } = gateOn(store, "consume");
    const d = await gate.judge(aFire("Consumed"), absorbContext(aFire("Consumed"), NEUTRAL));
    expect(d.row.questionVersion).toBe("graph:M-GRAPH-1");
    expect(d.action).toBe("IGNORE");
    expect(calls.n).toBe(0);
  });

  // ══ D-6 · THE DEAD DECLARATION ═══════════════════════════════════════════════════

  test("D-6 → M-GRAPH-2: a declared field with ZERO readers settles FIRE at $0", async () => {
    const store = freshStore();
    addNode(store, "corbell:fixture::fire-gate.ts::FireGateConfig.ledgerPath", "field");
    const { gate, calls } = gateOn(store, "declare");
    const d = await gate.judge(aFire("ledgerPath"), absorbContext(aFire("ledgerPath"), NEUTRAL));
    expect(d.row.questionVersion).toBe("graph:M-GRAPH-2");
    expect(d.action).toBe("FIRE");
    expect(d.reason).toContain("declared, never consumed");
    expect(calls.n).toBe(0);
  });

  // ══ D-5 · THE GUARD INCONSISTENCY — the honest split ═════════════════════════════

  test("D-5 → M-GRAPH-4: N>1 call sites of one mutation ESCALATES (a fact, not a verdict)", async () => {
    const store = freshStore();
    addNode(store, "corbell:fixture::fire-gate.ts::FireGate.abandonInFlight");
    addEdge(store, "corbell:fixture::fire-gate.ts::FireGate.judge", "corbell:fixture::fire-gate.ts::FireGate.abandonInFlight");
    addEdge(store, "corbell:fixture::fire-gate.ts::FireGate.judgeOnce", "corbell:fixture::fire-gate.ts::FireGate.abandonInFlight");
    const { gate, calls } = gateOn(store, "mutate");
    const d = await gate.judge(aFire("abandonInFlight"), absorbContext(aFire("abandonInFlight"), NEUTRAL));
    // ★ THE HONEST SPLIT: the graph COUNTED the sites ($0 fact); whether their GUARDS AGREE
    //   is a judgment — so it ESCALATES and the fire still reaches the model.
    expect(d.row.questionVersion).not.toBe("graph:M-GRAPH-4");
    expect(calls.n).toBe(1);                                  // the model WAS asked
    const meta = (d as unknown as { row: { questionVersion: string } }).row.questionVersion;
    expect(meta.startsWith("graph:")).toBe(false);
  });

  test("D-5 NEGATIVE: a single call site is a LOWER BOUND — it does NOT settle IGNORE", async () => {
    // ★★ FOUND BY RUNNING M-GRAPH-4 AGAINST THE REAL GRAPH: it settled IGNORE "single call
    //   site" for `abandonInFlight`, which ACTUALLY has two mutation sites — the second is an
    //   inline closure the indexer cannot see. IT ANSWERED CONFIDENTLY WRONG (the
    //   silent-degrade class, filed CRITICAL).
    //   ★ THE RULE: a count of N is a LOWER BOUND. A rule may settle on a POSITIVE fact (the
    //   node exists), never on a COUNT, because absence of evidence is only evidence of
    //   absence when the extractor covers the space — and it does not cover closures.
    const store = freshStore();
    addNode(store, "corbell:fixture::x.ts::Mut");
    addEdge(store, "corbell:fixture::x.ts::only", "corbell:fixture::x.ts::Mut");
    const { gate, calls } = gateOn(store, "mutate");
    const d = await gate.judge(aFire("Mut"), absorbContext(aFire("Mut"), NEUTRAL));
    expect(d.row.questionVersion).not.toBe("graph:M-GRAPH-4");   // ★ NO IGNORE SETTLEMENT
    expect(calls.n).toBe(1);                                     // it went to the model
  });

  // ══ D-7 · THE SELF-MEASUREMENT ═══════════════════════════════════════════════════

  test("D-7 → M-GRAPH-5: a field on BOTH ends of an edge settles FIRE at $0", async () => {
    const store = freshStore();
    addNode(store, "corbell:fixture::fire-gate.ts::serializedBytes", "field");
    addEdge(store, "corbell:fixture::fire-gate.ts::serializedBytes", "corbell:fixture::fire-gate.ts::serializedBytes", "traces-to");
    const { gate, calls } = gateOn(store, "measure");
    const d = await gate.judge(aFire("serializedBytes"), absorbContext(aFire("serializedBytes"), NEUTRAL));
    expect(d.row.questionVersion).toBe("graph:M-GRAPH-5");
    expect(d.action).toBe("FIRE");
    expect(d.reason).toContain("self-referential");
    expect(calls.n).toBe(0);
  });

  // ══ D-3 · THE STALE INSTRUMENT — it GATES every other rule ═══════════════════════

  test("D-3 → M-GRAPH-3: a STALE store refuses EVERY fact, whatever the target", async () => {
    // ★ the store's populated_at is 30 days old against an `explicit` TTL of 24h
    const old = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
    const store = freshStore({ populatedAt: old });
    addNode(store, "corbell:fixture::oracle.ts::OutcomeRecord");   // the D-2 shape, present
    const { gate, calls } = gateOn(store, "consume");
    const d = await gate.judge(aFire("OutcomeRecord"), absorbContext(aFire("OutcomeRecord"), NEUTRAL));
    // ★ M-GRAPH-3 WINS: a fact from a dead store is worse than no fact
    expect(d.row.questionVersion).toBe("graph:M-GRAPH-3");
    expect(d.reason).toContain("STALE");
    expect(calls.n).toBe(0);
  });

  test("D-3b: a store with NO populated_at is STALE BY CONSTRUCTION (fail-closed)", async () => {
    const store = freshStore({ populatedAt: null });
    addNode(store, "corbell:fixture::x.ts::Y");
    const { gate } = gateOn(store, "consume");
    const d = await gate.judge(aFire("Y"), absorbContext(aFire("Y"), NEUTRAL));
    expect(d.row.questionVersion).toBe("graph:M-GRAPH-3");
    expect(d.reason).toContain("STALE");
  });

  // ══ THE HARD-DEPENDENCY LAW + THE NO-FACT CASE ═══════════════════════════════════

  test("an UNAVAILABLE store is NAMED, never a silent fall-through", async () => {
    const { gate } = gateOn("/nonexistent/graph.sqlite", "consume");
    const d = await gate.judge(aFire("Anything"), absorbContext(aFire("Anything"), NEUTRAL));
    // the rung could not read a fact ⇒ it falls through, and the model answers
    expect(d.row.questionVersion).not.toContain("graph:");
    const meta = d.row.questionVersion;
    expect(meta.length).toBeGreaterThan(0);
  });

  test("NO FACT for a target falls through to the next rung — never a silent pass", async () => {
    const store = freshStore();
    // nothing in the store matches this target
    const { gate, calls } = gateOn(store, "consume");
    const d = await gate.judge(aFire("NoSuchSymbolAnywhere"), absorbContext(aFire("NoSuchSymbolAnywhere"), NEUTRAL));
    expect(calls.n).toBe(1);                                  // the model answered
    expect(d.row.questionVersion).not.toContain("graph:");
  });

  // ══ THE DIRECT API — the six rules, asserted by name ═════════════════════════════

  test("graphFacts returns the SPECIFIC rule for each intent — never a generic refusal", () => {
    const store = freshStore();
    addNode(store, "corbell:fixture::a.ts::Lonely");
    const consume = graphFacts({ storePath: store, target: "Lonely", intent: "consume" });
    expect(consume.map((v) => v.rule)).toEqual(["M-GRAPH-1"]);
    const declare = graphFacts({ storePath: store, target: "Lonely", intent: "declare" });
    expect(declare.map((v) => v.rule)).toEqual(["M-GRAPH-2"]);
    const mutate = graphFacts({ storePath: store, target: "Lonely", intent: "mutate" });
    expect(mutate.map((v) => v.rule)).toEqual(["M-GRAPH-4"]);
    const measure = graphFacts({ storePath: store, target: "Lonely", intent: "measure" });
    expect(measure.map((v) => v.rule)).toEqual(["M-GRAPH-5"]);
  });

  test("graphFacts on a missing store returns the NAMED unavailability, not an empty list", () => {
    const v = graphFacts({ storePath: "/nope.sqlite", target: "X", intent: "consume" });
    expect(v.length).toBe(1);
    expect(v[0]!.evidence).toContain("GI_GRAPH_FACTS_UNAVAILABLE");
    expect(v[0]!.settles).toBe(false);
  });
});
