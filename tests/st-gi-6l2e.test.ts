// st-gi-6l2e — ★ THE 6L+2E CONSUMPTION SUITE (E-1).
//
// THE LAW UNDER TEST (the operator's, verbatim): "A LAYER IS UP IFF ITS FACT CHANGED
// A VERDICT." `up=11/11` is a health check on FILES. This suite tests the ONLY green
// that matters: `consumed:N/8` — which consumers actually contributed an ANCHORED fact.
//
// ★ ADVERSARIAL FIRST. The negative cases (an absent substrate, a wired-but-silent
// consumer, an unanchored fact, a scope mismatch) come BEFORE the happy path. The happy
// path is the LAST confirmation, never the first.
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { buildRegistry, consumptionAudit, SIX_L2E_CONSUMERS } from "../src/omp/layer-consumption.ts";
import { createLayerRegistry, isAnchored, type ConsumerProbe, type LayerFact } from "../src/omp/layer-registry.ts";
import { corbellProbe } from "../src/omp/adapters/corbell.ts";
import { graphifyProbe } from "../src/omp/adapters/graphify.ts";
import { graphFacts, type GraphFactRule } from "../src/omp/graph-facts.ts";
import { FireGate, absorbContext } from "../src/omp/fire-gate.ts";

const REPO = path.resolve(import.meta.dir, "..");

// ─────────────────────────────────────────────────────────────────────────────
// THE REGISTRY'S OWN CONTRACT — the adversarial half
// ─────────────────────────────────────────────────────────────────────────────

describe("st-gi-6l2e: the registry contract", () => {
  test("test_register_reports_consumers", () => {
    // ★ THE ANTI-REGISTER PREDICATE: a consumer whose substrate is UP but which
    // contributes ZERO facts is GI_LAYER_UNCONSUMED — NOT green. This is the exact
    // defect that produced `up=5/11` while nothing was wired.
    const r = createLayerRegistry();
    r.register({
      id: "L5_CORBELL",
      rung: "settlement",
      dependency: "a store that answers",
      errorCode: "GI_LAYER_CORBELL",
      up: () => ({ up: true, evidence: "the substrate answers" }),
      facts: () => [], // ← wired but SILENT
    });
    const [rep] = r.audit("anything");
    expect(rep!.up).toBe(true);
    expect(rep!.factsReturned).toBe(0);
    expect(rep!.consumed).toBe(false);
    expect(rep!.verdict).toBe("GI_LAYER_UNCONSUMED");
  });

  test("test_unanchored_fact_is_discarded", () => {
    // A fact without its `source` anchor is an ASSERTION, not a fact. The registry
    // discards it and COUNTS the discard — never silently accepts it.
    const r = createLayerRegistry();
    r.register({
      id: "L6_GRAPHIFY",
      rung: "settlement",
      dependency: "x",
      errorCode: "GI_LAYER_GRAPHIFY",
      up: () => ({ up: true, evidence: "ok" }),
      facts: (): LayerFact[] => [
        { consumer: "L6_GRAPHIFY", rung: "settlement", subject: "s", value: 1, source: "" }, // ← no anchor
        { consumer: "L6_GRAPHIFY", rung: "settlement", subject: "s", value: 2, source: "store#row(1)" },
      ],
    });
    const [rep] = r.audit("s");
    expect(rep!.factsReturned).toBe(1);
    expect(rep!.factsDiscarded).toBe(1);
    expect(rep!.consumed).toBe(true);
    expect(isAnchored({ consumer: "L6_GRAPHIFY", rung: "settlement", subject: "s", value: 1, source: "   " })).toBe(false);
  });

  test("test_probe_that_throws_is_down", () => {
    // Silence is never UP. A probe that throws is DOWN with the throw as evidence.
    const r = createLayerRegistry();
    r.register({
      id: "L3_UA",
      rung: "context",
      dependency: "x",
      errorCode: "GI_LAYER_UA",
      up: () => { throw new Error("EACCES: the substrate is unreadable"); },
      facts: () => [],
    });
    const [rep] = r.audit("s");
    expect(rep!.up).toBe(false);
    expect(rep!.verdict).toBe("GI_LAYER_DOWN");
    expect(rep!.evidence).toContain("EACCES");
  });

  test("test_consumer_that_throws_reading_is_down_not_unconsumed", () => {
    // ★ THE DISTINCTION THAT MATTERS: UNCONSUMED is a WIRING gap; a throw while
    // reading is a SUBSTRATE fault. Conflating them hides a broken substrate behind
    // a "not wired yet" label.
    const r = createLayerRegistry();
    r.register({
      id: "L1_SEMANTICA",
      rung: "decision",
      dependency: "x",
      errorCode: "GI_LAYER_SEMANTICA",
      up: () => ({ up: true, evidence: "ok" }),
      facts: () => { throw new Error("SQLITE_CORRUPT: the kg store is unreadable"); },
    });
    const [rep] = r.audit("s");
    expect(rep!.verdict).toBe("GI_LAYER_DOWN");
    expect(rep!.evidence).toContain("SQLITE_CORRUPT");
  });

  test("test_duplicate_registration_replaces", () => {
    // Registration is idempotent by id — a test can override ONE consumer (the wiring
    // seam) without rebuilding the other seven.
    const r = createLayerRegistry();
    const mk = (v: string): ConsumerProbe => ({
      id: "TSG", rung: "meaning", dependency: "x", errorCode: "GI_ENFORCE_TSG",
      up: () => ({ up: true, evidence: "ok" }),
      facts: () => [{ consumer: "TSG", rung: "meaning", subject: "s", value: v, source: "tsg#1" }],
    });
    r.register(mk("first"));
    r.register(mk("second"));
    expect(r.consumers().length).toBe(1);
    expect((r.factsFor("s")[0]!.value as string)).toBe("second");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE 8 — the real adapters against the real tree
// ─────────────────────────────────────────────────────────────────────────────

describe("st-gi-6l2e: the 8 consumers against the live tree", () => {
  test("test_registry_is_the_closed_set", () => {
    const r = buildRegistry(REPO);
    const ids = r.consumers().map((c) => c.id).sort();
    expect(ids).toEqual([...SIX_L2E_CONSUMERS].sort());
    expect(ids.length).toBe(8);
  });

  test("test_consume_corbell", () => {
    // L5 CORBELL → the settlement rung. The live store answers about a real symbol.
    const probe = corbellProbe(REPO);
    const up = probe.up();
    expect(up.up).toBe(true);
    const facts = probe.facts("populateSessionStore");
    expect(facts.length).toBeGreaterThan(0);
    for (const f of facts) {
      expect(f.rung).toBe("settlement");
      expect(f.source.length).toBeGreaterThan(0); // every fact carries its anchor
    }
  });

  test("test_consume_graphify", () => {
    // L6 GRAPHIFY → the settlement rung.
    const probe = graphifyProbe(REPO);
    expect(probe.up().up).toBe(true);
    const facts = probe.facts("populateSessionStore");
    expect(facts.length).toBeGreaterThan(0);
    for (const f of facts) expect(f.consumer).toBe("L6_GRAPHIFY");
  });

  test("test_consumption_audit_names_every_non_consumer", () => {
    // ★ THE LOUD REMAINDER: the audit must NAME each non-consumer and its reason —
    // a green/red count alone is not actionable.
    const audit = consumptionAudit(REPO, "populateSessionStore");
    expect(audit.reports.length).toBe(8);
    expect(audit.summary).toContain("consumed:");
    expect(audit.influenced.length).toBeGreaterThan(0);
    for (const o of audit.offenders) {
      expect(o.evidence.length).toBeGreaterThan(0); // a reason, never a bare verdict
    }
    // the two settlement legs are the live edges
    expect(audit.influenced).toContain("L5_CORBELL");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ★ THE ADVERSARIAL CASES (the failure classes the pin names)
// ─────────────────────────────────────────────────────────────────────────────

describe("st-gi-6l2e: adversarial", () => {
  test("test_scope_mismatch", () => {
    // ★ THE WRONG-TREE STORE: a store that answers about a DIFFERENT tree must not
    // be read as this tree's graph. Here: a store whose live rows name a path that is
    // not this scope. The consumer returns facts ONLY for subjects present; a subject
    // from another tree yields ZERO facts → UNCONSUMED, never a fabricated answer.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gi-6l2e-scope-"));
    const storeDir = path.join(tmp, ".omp/graph-intelligence/corbell-checkout");
    fs.mkdirSync(storeDir, { recursive: true });
    const store = path.join(storeDir, "store.sqlite");
    const db = new Database(store);
    db.exec(`CREATE TABLE typed_nodes (id INTEGER PRIMARY KEY, canonical_id TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, file TEXT, line INTEGER, layer_id TEXT, created_run TEXT NOT NULL, superseded_run TEXT);
             CREATE TABLE typed_edges (id INTEGER PRIMARY KEY, src_canonical TEXT NOT NULL, dst_canonical TEXT NOT NULL, predicate TEXT NOT NULL, evidence_quote TEXT NOT NULL, created_run TEXT NOT NULL, superseded_run TEXT);`);
    // a row about ANOTHER tree
    db.run(`INSERT INTO typed_edges (src_canonical,dst_canonical,predicate,evidence_quote,created_run,superseded_run) VALUES (?,?,?,?,?,NULL)`,
      ["othertree::a::fn", "othertree::a::caller", "calls", "othertree/a.ts:1", "run1"]);
    db.close();

    const probe = corbellProbe(tmp);
    expect(probe.up().up).toBe(true);
    // the OTHER tree's subject IS in this store — but the probe is asked about a symbol
    // that is NOT: it must answer ZERO, never a neighbouring row.
    expect(probe.facts("a-symbol-this-store-never-saw").length).toBe(0);
  });

  test("test_stale_store_refuses", () => {
    // ★ THE APPEND-ONLY STORE: a superseded row must NEVER be read as live. This is
    // the A-0 lesson made mechanical (the naive count read 6191 Checkpoints against a
    // clean live store).
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gi-6l2e-stale-"));
    const storeDir = path.join(tmp, ".omp/graph-intelligence/corbell-checkout");
    fs.mkdirSync(storeDir, { recursive: true });
    const store = path.join(storeDir, "store.sqlite");
    const db = new Database(store);
    db.exec(`CREATE TABLE typed_nodes (id INTEGER PRIMARY KEY, canonical_id TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, file TEXT, line INTEGER, layer_id TEXT, created_run TEXT NOT NULL, superseded_run TEXT);
             CREATE TABLE typed_edges (id INTEGER PRIMARY KEY, src_canonical TEXT NOT NULL, dst_canonical TEXT NOT NULL, predicate TEXT NOT NULL, evidence_quote TEXT NOT NULL, created_run TEXT NOT NULL, superseded_run TEXT);`);
    // a SUPERSEDED row (history) and a LIVE row, same subject
    db.run(`INSERT INTO typed_edges (src_canonical,dst_canonical,predicate,evidence_quote,created_run,superseded_run) VALUES (?,?,?,?,?,?)`,
      ["t::ghost::fn", "t::ghost::old", "calls", "ghost.ts:1", "run1", "run2"]);
    db.run(`INSERT INTO typed_edges (src_canonical,dst_canonical,predicate,evidence_quote,created_run,superseded_run) VALUES (?,?,?,?,?,NULL)`,
      ["t::ghost::fn", "t::ghost::live", "calls", "ghost.ts:2", "run2"]);
    db.close();

    const facts = corbellProbe(tmp).facts("ghost::fn");
    expect(facts.length).toBe(1); // ONLY the live row
    const val = facts[0]!.value as { to: string };
    expect(val.to).toBe("t::ghost::live");
    expect(JSON.stringify(facts)).not.toContain("ghost::old");
  });

  test("test_absent_substrate_is_down_not_empty", () => {
    // ★ THE NO-FALLBACK LAW: a missing substrate is GI_LAYER_DOWN with the errno as
    // evidence — NEVER an empty table dressed as "no facts".
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gi-6l2e-absent-"));
    const audit = consumptionAudit(tmp, "anything");
    const corbell = audit.reports.find((r) => r.consumer === "L5_CORBELL")!;
    expect(corbell.up).toBe(false);
    expect(corbell.verdict).toBe("GI_LAYER_DOWN");
    expect(corbell.evidence).toContain("ENOENT");
  });

  test("test_register_reports_consumption_not_file_existence", () => {
    // ★ THE CATEGORY ERROR, MADE MECHANICAL: a subject no consumer knows must yield
    // consumed:0/8 even though several substrates are UP. `up` and `consumed` are
    // DIFFERENT QUESTIONS and the audit must never conflate them.
    const audit = consumptionAudit(REPO, "a-symbol-that-does-not-exist-anywhere-xyzzy");
    const upCount = audit.reports.filter((r) => r.up).length;
    expect(upCount).toBeGreaterThan(0); // substrates ARE up
    expect(audit.influenced.length).toBe(0); // but NOTHING is consumed
    expect(audit.summary).toContain("consumed:0/8");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ★ SC-5 · THE 7-CLASS DERAILMENT CORPUS (the layers' PURPOSE)
//
// THE OPERATOR'S CHARGE (graph-facts.ts:4-10, verbatim): "the kernel has SIX GRAPH
// LAYERS and used them as a REGISTRATION PRECONDITION — a substrate to bring UP so a
// gate would pass — instead of as THE INPUT TO EVERY DECISION. Seven derailments of
// this session's own coding were 7-of-7 graph-detectable and 7-of-7 settleable at $0,
// and not one needed a model call."
//
// THE LADDER: graph → MPSE → cache → Jev. The graph answers FACTS; a fact is never
// worth a model call. This test proves the $0 settlement by wiring a judge that THROWS
// if it is ever reached.
// ─────────────────────────────────────────────────────────────────────────────

interface CorpusFixture {
  id: string;
  intent: "consume" | "declare" | "mutate" | "measure";
  target: string;
  /** the SPECIFIC rule token the graph must answer with */
  expectRule: GraphFactRule;
  expectSettles: boolean;
  expectAction: "FIRE" | "IGNORE" | null;
  why: string;
}

/** Build a store carrying the derailment shapes + a FRESH populated_at marker. */
function corpusStore(dir: string): string {
  const p = path.join(dir, "corpus.sqlite");
  const db = new Database(p);
  db.exec(`CREATE TABLE typed_nodes (id INTEGER PRIMARY KEY, canonical_id TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, file TEXT, line INTEGER, layer_id TEXT, created_run TEXT NOT NULL, superseded_run TEXT);
           CREATE TABLE typed_edges (id INTEGER PRIMARY KEY, src_canonical TEXT NOT NULL, dst_canonical TEXT NOT NULL, predicate TEXT NOT NULL, evidence_quote TEXT NOT NULL, created_run TEXT NOT NULL, superseded_run TEXT);
           CREATE TABLE gi_meta (key TEXT PRIMARY KEY, value TEXT);`);
  const node = (id: string, kind: string): void => {
    db.run(`INSERT INTO typed_nodes (canonical_id,kind,label,file,line,layer_id,created_run,superseded_run) VALUES (?,?,?,?,?,?,?,NULL)`,
      [id, kind, id, "src/omp/x.ts", 1, "structural", "corpus"]);
  };
  const edge = (s: string, d: string, pred: string): void => {
    db.run(`INSERT INTO typed_edges (src_canonical,dst_canonical,predicate,evidence_quote,created_run,superseded_run) VALUES (?,?,?,?,?,NULL)`,
      [s, d, pred, "src/omp/x.ts:1", "corpus"]);
  };
  // D-2: a consumed type NOTHING constructs (in-degree 0)
  node("t::OutcomeRecord", "type");
  // D-6: a declared field with ZERO edges
  node("t::ledgerPath", "field");
  // D-5: a mutation with TWO call sites
  node("t::abandonInFlight", "method");
  edge("t::guardA", "t::abandonInFlight", "calls");
  edge("t::guardB", "t::abandonInFlight", "calls");
  // D-7: a field measured into itself (a SELF-edge)
  node("t::serializedBytes", "field");
  edge("t::serializedBytes", "t::serializedBytes", "references");
  // the NEGATIVES: a symbol WITH producers / WITH references
  node("t::producedThing", "type");
  edge("t::someCaller", "t::producedThing", "calls");
  node("t::referencedField", "field");
  edge("t::referencedField", "t::other", "references");
  // ★ a FRESH marker — otherwise M-GRAPH-3 gates every other rule
  db.run(`INSERT INTO gi_meta (key,value) VALUES ('populated_at', ?)`, [new Date().toISOString()]);
  db.close();
  return p;
}

describe("st-gi-6l2e: ★ SC-5 the 7-class derailment corpus", () => {
  test("test_derailment_corpus", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gi-6l2e-corpus-"));
    const store = corpusStore(tmp);

    const fixtures: CorpusFixture[] = [
      { id: "D-2", intent: "consume", target: "OutcomeRecord", expectRule: "M-GRAPH-1", expectSettles: true, expectAction: "FIRE",
        why: "a consumed type with ZERO incoming edges — nothing constructs it" },
      { id: "D-6", intent: "declare", target: "ledgerPath", expectRule: "M-GRAPH-2", expectSettles: true, expectAction: "FIRE",
        why: "a declared field with ZERO edges — declared, never consumed" },
      { id: "D-5", intent: "mutate", target: "abandonInFlight", expectRule: "M-GRAPH-4", expectSettles: false, expectAction: null,
        why: "TWO call sites — the fact is $0, its INTERPRETATION may not be (the honest split: escalate, never settle IGNORE on a count)" },
      { id: "D-7", intent: "measure", target: "serializedBytes", expectRule: "M-GRAPH-5", expectSettles: true, expectAction: "FIRE",
        why: "a field on BOTH ends of an edge — a self-referential measurement" },
      { id: "NEG-1", intent: "consume", target: "producedThing", expectRule: "M-GRAPH-1", expectSettles: true, expectAction: "IGNORE",
        why: "a consumed symbol WITH producers — the rule must not fire on a healthy shape" },
      { id: "NEG-2", intent: "declare", target: "referencedField", expectRule: "M-GRAPH-2", expectSettles: true, expectAction: "IGNORE",
        why: "a declared symbol WITH references" },
    ];

    const seen: string[] = [];
    for (const f of fixtures) {
      const verdicts = graphFacts({ storePath: store, target: f.target, intent: f.intent });
      const hit = verdicts.find((v) => v.rule === f.expectRule);
      expect(hit).toBeDefined();
      // ★ THE SPECIFIC TOKEN — the rule that answered, never a generic gate
      seen.push(hit!.rule);
      expect(hit!.rule).toBe(f.expectRule);
      expect(hit!.settles).toBe(f.expectSettles);
      expect(hit!.action).toBe(f.expectAction);
      // every verdict carries its verbatim evidence — the audit trail
      expect(hit!.evidence.length).toBeGreaterThan(0);
    }
    // 6 fixtures, 4 distinct SPECIFIC rule tokens + the 2 negatives on the same rules
    expect([...new Set(seen)].sort()).toEqual(["M-GRAPH-1", "M-GRAPH-2", "M-GRAPH-4", "M-GRAPH-5"] as GraphFactRule[]);

    // ── M-GRAPH-3 · STORE-FRESH (D-3) — a SEPARATE, STALE store ──────────────
    const staleDir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-6l2e-stale-"));
    const staleStore = path.join(staleDir, "stale.sqlite");
    const sdb = new Database(staleStore);
    sdb.exec(`CREATE TABLE typed_nodes (id INTEGER PRIMARY KEY, canonical_id TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, file TEXT, line INTEGER, layer_id TEXT, created_run TEXT NOT NULL, superseded_run TEXT);
              CREATE TABLE typed_edges (id INTEGER PRIMARY KEY, src_canonical TEXT NOT NULL, dst_canonical TEXT NOT NULL, predicate TEXT NOT NULL, evidence_quote TEXT NOT NULL, created_run TEXT NOT NULL, superseded_run TEXT);
              CREATE TABLE gi_meta (key TEXT PRIMARY KEY, value TEXT);`);
    sdb.run(`INSERT INTO typed_nodes (canonical_id,kind,label,created_run,superseded_run) VALUES ('t::x','type','x','r',NULL)`);
    sdb.close();
    const staleV = graphFacts({ storePath: staleStore, target: "x", intent: "consume" });
    expect(staleV.length).toBe(1);
    expect(staleV[0]!.rule).toBe("M-GRAPH-3");
    expect(staleV[0]!.action).toBe("IGNORE"); // a stale refusal is NOT evidence of a violation
    expect(staleV[0]!.evidence).toContain("GI_LAYER_STALE");

    // ── ★ THE $0 SETTLEMENT — the judge MUST NOT be reached ──────────────────
    let judgeCalls = 0;
    const judge = {
      evaluate: () => { judgeCalls += 1; throw new Error("THE MODEL MUST NOT BE CALLED — the graph settled this fire"); },
    } as unknown as ConstructorParameters<typeof FireGate>[0]["judge"];
    const gate = new FireGate({ judge, graphStorePath: store, graphIntent: "consume", now: () => 1000 });
    const fire = { ruleId: "*dumb", cls: "dumb", shape: "a consumed contract", tool: "edit", target: "OutcomeRecord", evidence: "the graph holds it" };
    const decision = await gate.judge(fire, absorbContext(fire, []));
    expect(judgeCalls).toBe(0); // ★ NO MODEL CALL
    expect(gate.firesUsed()).toBe(0); // ★ THE BUDGET IS UNTOUCHED
    expect(decision.action).toBe("FIRE");
    expect(decision.row.costUsd).toBe(0);
    expect(decision.row.questionVersion).toBe("graph:M-GRAPH-1");
    expect(decision.reason).toContain("M-GRAPH-1");
  });
});
