// st-gi-v21-evidence-producer — P2: THE ORACLE'S MISSING INPUT, PINNED.
//
// ★ PROVENANCE: the operator named this directly — "the oracle needs a DOWNSTREAM-EVIDENCE
//   PRODUCER; the producer is the gate, the engine" — and it was measured twice: EVERY
//   resolution this session achieved was SYNTHETIC (the W6 corpus labels; the hot seat's
//   hand-built edits). A precision computed from labels is a measurement of the LABELS.
//
// ★ THE GATE THIS SUITE MUST PASS (the plan's own criterion): an ORGANIC resolution — a fire
//   resolved from PRODUCED evidence, with no label anywhere in the path.

import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { applyTypedDdl } from "../src/omp/typed-write.ts";
import {
  produce, laterEditFromGraph, persistRecords, readRecords, produceAndPersist, resolveFromSession,
  type ToolEvent,
} from "../src/omp/evidence-producer.ts";
import { FireGate, absorbContext, type Fire } from "../src/omp/fire-gate.ts";
import type { Judge } from "../src/omp/enforcement.ts";
import { FireLedger, drain } from "../src/omp/fire-ledger.ts";
import { resolveAll, type Subject } from "../src/omp/oracle.ts";

function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), "gi-ep-")); }
function judgeOf(p: number): Judge {
  return { async evaluate() { return [{ id: "fire_is_real", probability: p }]; } };
}
function aFire(over: Partial<Fire> = {}): Fire {
  return { ruleId: "*dumb", cls: "dumb", shape: "blind edit", tool: "edit", target: "src/omp/kernel-v2.ts", evidence: "queriedBefore=false", ...over };
}
const NEUTRAL = [{ kind: "reasoning", text: "because the file is next", offsetMs: -100 }];
const T0 = "2026-09-20T08:00:00.000Z";
const AFTER = "2026-09-20T09:00:00.000Z";
const SUBJECT: Subject = { target: "src/omp/kernel-v2.ts", tool: "edit" };

describe("st-gi-v21-evidence-producer: P2 — the producer", () => {
  // ══ THE FOUR KINDS ══════════════════════════════════════════════════════════════════

  test("test_producer_emits_four_kinds — every kind, from its own source", () => {
    const events: ToolEvent[] = [
      { tool: "edit", target: "src/omp/kernel-v2.ts", at: AFTER, ok: true },
      { tool: "bash", command: "bun test ./tests/", target: "src/omp/kernel-v2.ts", at: AFTER, passed: false },
    ];
    const records = produce(events, T0, SUBJECT, {
      withdrawals: [{ at: AFTER, target: SUBJECT.target, span: "src/omp/kernel-v2.ts:299" }],
      permits: [{ at: AFTER, target: SUBJECT.target, by: "graph-gate" }],
    });
    const kinds = records.map((r) => r.kind).sort();
    expect(kinds).toEqual(["edit", "permit", "test", "withdraw"]);
    expect(records.find((r) => r.kind === "test")!.passed).toBe(false);
    expect(records.find((r) => r.kind === "withdraw")!.span).toBe("src/omp/kernel-v2.ts:299");
    expect(records.find((r) => r.kind === "permit")!.by).toBe("graph-gate");
  });

  test("a verify run with NO verdict emits a test record with `passed` ABSENT", () => {
    // ★ emitting `passed: true` for an unknown outcome would MANUFACTURE corroboration —
    //   oracle.ts treats an absent flag as NO SIGNAL (the O1 fix), and the producer must not
    //   undo that by inventing a verdict.
    const records = produce(
      [{ tool: "bash", command: "bun test ./tests/", target: SUBJECT.target, at: AFTER }],
      T0, SUBJECT,
    );
    expect(records.length).toBe(1);
    expect(records[0]!.kind).toBe("test");
    expect("passed" in records[0]!).toBe(false);
  });

  test("EVIDENCE BEFORE THE FIRE IS NOT EMITTED — the forward-only boundary", () => {
    const records = produce(
      [{ tool: "edit", target: SUBJECT.target, at: "2026-09-20T07:00:00.000Z" }],
      T0, SUBJECT,
    );
    expect(records).toEqual([]);
  });

  test("an event touching ANOTHER target is not this fire's evidence", () => {
    const records = produce(
      [{ tool: "edit", target: "src/omp/SOMEONE_ELSE.ts", at: AFTER }],
      T0, SUBJECT,
    );
    expect(records).toEqual([]);
  });

  // ══ ★ THE ORGANIC RESOLUTION — THE GATE ═════════════════════════════════════════════

  test("test_organic_resolution — a fire resolved from PRODUCED evidence, no label anywhere", async () => {
    const dir = tmpDir();
    const ledger = new FireLedger(path.join(dir, "fire.sqlite"));
    const gate = new FireGate({ judge: judgeOf(0.9), now: () => Date.parse(T0) });
    const fire = aFire();
    await gate.judge(fire, absorbContext(fire, NEUTRAL));
    drain(gate, ledger);
    const row = ledger.all()[0]!;
    expect(row.laterTruth).toBe("unresolved");

    // ── THE SESSION CONTINUES. The agent edits the SAME target, then a test FAILS. ──────
    const events: ToolEvent[] = [
      { tool: "edit", target: "src/omp/kernel-v2.ts", at: AFTER, ok: true },
      { tool: "bash", command: "bun test ./tests/", target: "src/omp/kernel-v2.ts", at: AFTER, passed: false },
    ];
    const recordsPath = path.join(dir, "records.ndjson");
    const { records, persisted, sources } = produceAndPersist({
      events, fireAt: row.at, fireStateHash: row.stateHash, subject: SUBJECT, recordsPath,
    });
    expect(records.length).toBeGreaterThan(0);
    expect(persisted).toBe(records.length);
    expect(sources).toContain("events");

    // ★ REPRODUCIBLE: the records read back from DISK are the ones that resolve the fire
    const fromDisk = readRecords(recordsPath, row.stateHash);
    expect(fromDisk.length).toBe(records.length);

    // ── THE RESOLUTION, FROM PRODUCED EVIDENCE ONLY ────────────────────────────────────
    const report = resolveAll(ledger, [{ row, subject: SUBJECT }], fromDisk, {
      now: () => "2026-09-20T12:00:00.000Z",
    });
    expect(report.resolved).toBe(1);
    expect(report.confirmed).toBe(1);                    // a later edit + a failing test
    expect(report.failed.length).toBe(0);
    // ★ AND THE ROW ITSELF CHANGED — read it back from the TABLE
    expect(ledger.all()[0]!.laterTruth).toBe("confirmed");
    expect(ledger.all()[0]!.truthAt).not.toBeNull();
    ledger.close();
  });

  test("ORGANIC NEGATIVE: a fire with NO downstream events stays UNRESOLVED", async () => {
    const dir = tmpDir();
    const ledger = new FireLedger(path.join(dir, "f.sqlite"));
    const gate = new FireGate({ judge: judgeOf(0.9), now: () => Date.parse(T0) });
    const fire = aFire();
    await gate.judge(fire, absorbContext(fire, NEUTRAL));
    drain(gate, ledger);
    const row = ledger.all()[0]!;
    const records = produce([], row.at, SUBJECT);        // the world said nothing
    expect(records).toEqual([]);
    const report = resolveAll(ledger, [{ row, subject: SUBJECT }], records);
    expect(report.resolved).toBe(0);
    expect(report.leftUnresolved).toBe(1);
    expect(ledger.all()[0]!.laterTruth).toBe("unresolved");
    ledger.close();
  });

  // ══ THE GRAPH AS A SOURCE — AND ITS LABEL ═══════════════════════════════════════════

  test("laterEditFromGraph derives an edit from the structural layer's run tag", () => {
    const dir = tmpDir();
    const store = path.join(dir, "store.sqlite");
    const db = new Database(store, { create: true });
    applyTypedDdl(db);
    const after = Date.parse("2026-09-20T10:00:00.000Z");
    db.prepare(`INSERT INTO typed_nodes (canonical_id, kind, label, file, line, created_run, layer_id)
                VALUES ('structural::src/omp/kernel-v2.ts:1::x', 'const', 'x', 'src/omp/kernel-v2.ts', 1, ?1, 'structural')`)
      .run(`structural-${after.toString(16)}`);
    db.close();

    const rec = laterEditFromGraph(store, SUBJECT, T0);
    expect(rec).not.toBeNull();
    expect(rec!.kind).toBe("edit");
    // ★ THE LOWER-CONFIDENCE SOURCE IS LABELLED. It proves the FILE changed, not that the
    //   edit was a REPAIR — a weaker fact must not look like a stronger one.
    expect(rec!.by).toBe("graph:structural");
  });

  test("laterEditFromGraph returns NULL when the run predates the fire", () => {
    const dir = tmpDir();
    const store = path.join(dir, "s.sqlite");
    const db = new Database(store, { create: true });
    applyTypedDdl(db);
    const before = Date.parse("2026-09-20T06:00:00.000Z");
    db.prepare(`INSERT INTO typed_nodes (canonical_id, kind, label, file, line, created_run, layer_id)
                VALUES ('structural::src/omp/kernel-v2.ts:1::x', 'const', 'x', 'src/omp/kernel-v2.ts', 1, ?1, 'structural')`)
      .run(`structural-${before.toString(16)}`);
    db.close();
    expect(laterEditFromGraph(store, SUBJECT, T0)).toBeNull();
  });

  test("an UNAVAILABLE graph source is NAMED, and does not void the event-derived records", () => {
    const dir = tmpDir();
    const { records, sources } = produceAndPersist({
      events: [{ tool: "edit", target: SUBJECT.target, at: AFTER }],
      fireAt: T0, fireStateHash: "h", subject: SUBJECT,
      recordsPath: path.join(dir, "r.ndjson"),
      graphStorePath: "/nonexistent/store.sqlite",
    });
    expect(records.length).toBe(1);                      // the event record SURVIVED
    expect(sources).toContain("graph:UNAVAILABLE");      // and the absence is NAMED
  });

  // ══ ★★ THE WIRED PATH — THE ORCHESTRATOR (what a session runs at its end) ═════════════

  test("resolveFromSession — THE PRODUCER WIRED: N unresolved fires resolved in ONE call", async () => {
    const dir = tmpDir();
    const ledger = new FireLedger(path.join(dir, "f.sqlite"));
    const gate = new FireGate({ judge: judgeOf(0.9), now: () => Date.parse(T0) });

    // THREE fires on the SAME target (distinct states) + one on ANOTHER target
    const subjects = new Map<string, Subject>();
    for (let i = 0; i < 3; i++) {
      const f = aFire({ evidence: `queriedBefore=false n=${i}` });
      await gate.judge(f, absorbContext(f, NEUTRAL));
    }
    const other = aFire({ target: "src/omp/OTHER.ts", evidence: "queriedBefore=false other" });
    await gate.judge(other, absorbContext(other, NEUTRAL));
    drain(gate, ledger);
    expect(ledger.count()).toBe(4);
    for (const r of ledger.all()) {
      subjects.set(r.stateHash, r.stateHash === ledger.all()[3]!.stateHash ? { target: "src/omp/OTHER.ts" } : SUBJECT);
    }

    // ★ THE SESSION'S OPERATION: one edit to the target that fired 3 times
    const events: ToolEvent[] = [{ tool: "edit", target: "src/omp/kernel-v2.ts", at: AFTER, ok: true, repair: true }];
    const r = resolveFromSession(ledger, events, {
      recordsPath: path.join(dir, "r.ndjson"), subjects,
      now: () => "2026-09-20T12:00:00.000Z",
    });

    expect(r.considered).toBe(4);
    expect(r.resolved).toBe(3);           // the three on the edited target
    expect(r.confirmed).toBe(3);          // each saw a later edit
    expect(r.noEvidence).toBe(1);         // the OTHER target was never touched — silence, COUNTED
    expect(r.noSubject).toBe(0);
    // ★ AND A SUBJECT-LESS FIRE IS NAMED, NEVER SILENTLY SKIPPED
    const r2 = resolveFromSession(ledger, events, { recordsPath: path.join(dir, "r2.ndjson"), subjects: new Map() });
    expect(r2.considered).toBe(1);        // only the untouched fire remains unresolved
    expect(r2.noSubject).toBe(1);         // and it is COUNTED as such
    ledger.close();
  });

  // ══ THE REPRODUCIBILITY LEDGER ══════════════════════════════════════════════════════

  test("records are scoped by fire — one fire's records never resolve another's", () => {
    const dir = tmpDir();
    const p = path.join(dir, "r.ndjson");
    persistRecords(p, "hash-A", [{ kind: "edit", at: AFTER, target: SUBJECT.target }]);
    persistRecords(p, "hash-B", [{ kind: "permit", at: AFTER, target: SUBJECT.target }]);
    expect(readRecords(p, "hash-A").map((r) => r.kind)).toEqual(["edit"]);
    expect(readRecords(p, "hash-B").map((r) => r.kind)).toEqual(["permit"]);
    expect(readRecords(p, "hash-C")).toEqual([]);
  });
});
