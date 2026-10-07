// ★ W2 · ST-RT-DIV — THE LEDGER MUST BE DIVERSE (FR-2, F-116).
//
// THE FRAUD: `SELECT COUNT(*), COUNT(DISTINCT rule_id), COUNT(DISTINCT band),
// COUNT(DISTINCT action) FROM fire_decisions` → `34 | 1 | 1 | 1`. The kernel had only ever
// recorded the DUMB fallback. "Non-empty" proved a write path, never a decision diversity.
//
// ★ THE PIN: >=4 DISTINCT (rule_id, band, action) tuples, each from a REAL varied act:
//   a DUMB act (no prior query) · a THEATRICAL act (a claim with no bound span) ·
//   a DESTRUCTIVE act (no layer certification) · a GROUNDED act (all layers certify → ALLOW).

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { decideFromRegistry } from "../src/omp/decision.ts";
import type { KernelRun } from "../src/omp/kernel-v2.ts";
import { FireLedger } from "../src/omp/fire-ledger.ts";

const ROOT = path.resolve(import.meta.dir, "..");

/** A FRESH scope with its own ledger (never the operator's live one). */
function freshScope(tag: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `gi-div-${tag}-`));
}

/** The RECORD sink — the same mapping the extension uses (REFUSE→act, STEER→escalate, ALLOW→ignore). */
function sinkFor(ledgerPath: string) {
  const ledger = new FireLedger(ledgerPath);
  return (run: KernelRun): void => {
    const band = run.verdict === "REFUSE" || run.verdict === "ABORT" ? "act" : run.verdict === "STEER" ? "escalate" : "ignore";
    const action = band === "act" ? "FIRE" : band === "escalate" ? "ESCALATE" : "IGNORE";
    ledger.append({
      at: new Date().toISOString(), ruleId: `kernel-v2:${run.class}:${run.verdict}`, cls: run.class,
      questionVersion: "kernel-v2", probability: band === "act" ? 1 : band === "escalate" ? 0.5 : 0,
      band, action, policyName: `kernel-v2.${run.class}`, actThreshold: 0.5, flagThreshold: 0.25,
      stateHash: (run.reason || "kernel-v2").slice(0, 16), target: run.evidence.slice(0, 40) || "t",
      costUsd: 0, laterTruth: "unresolved",
    });
  };
}

describe("st-runtime-diversity: ★ FR-2 — THE LEDGER MUST SHOW >=4 DISTINCT DECISIONS", () => {
  test("test_ledger_diversity_four_verdicts", () => {
    // ★ THE MEASUREMENT: drive 4 varied acts and count the DISTINCT tuples in the ledger.
    const scope = freshScope("four");
    try {
      const db = path.join(scope, ".omp", "graph-intelligence", "fire-decisions.db");
      fs.mkdirSync(path.dirname(db), { recursive: true });
      const sink = sinkFor(db);

      // ★ THE SCOPE IS THE REAL REPO — its layers are UP, so the preflight PASSES and the
      //   detectors RUN. (A fresh temp scope has no layers: the preflight refuses at stage 0
      //   and the sink never fires — measured. ★ AND THAT IS ITS OWN FINDING, F-121: a
      //   preflight refusal is NOT recorded.) The SINK writes to OUR fresh ledger.
      const real = ROOT;
      // ACT 1 — DUMB: the target was never queried (the grounding precondition fails).
      decideFromRegistry(real, "evidence", { toolName: "edit", target: "evidence", queriedBefore: false }, sink);
      // ACT 2 — THEATRICAL: a claim carrying ZERO bound evidence spans.
      decideFromRegistry(real, "evidence", { toolName: "edit", target: "evidence", queriedBefore: true, claims: [{ text: "it works", spans: 0 }] }, sink);
      // ACT 3 — DESTRUCTIVE: a subject no layer can certify (certs = []).
      decideFromRegistry(real, "zzzNoLayerKnowsThisSubject", { toolName: "edit", target: "zzzNoLayerKnowsThisSubject", queriedBefore: true, claims: [] }, sink);
      // ACT 4 — GROUNDED: all layers certify + a bound claim (the clean run → ALLOW).
      decideFromRegistry(real, "evidence", { toolName: "read", target: "evidence", queriedBefore: true, claims: [{ text: "read the code", spans: 3 }] }, sink);

      const d = new Database(db, { readonly: true });
      const rows = d.query("SELECT rule_id, band, action FROM fire_decisions").all() as Array<{ rule_id: string; band: string; action: string }>;
      d.close();

      const tuples = rows.map((r) => `${r.rule_id}|${r.band}|${r.action}`);
      const distinct = [...new Set(tuples)];
      console.log(`[ST-RT-DIV] ★ the ledger: ${rows.length} rows, ${distinct.length} distinct:\n  ${distinct.join("\n  ")}`);
      // ★ THE GATE: >=4 distinct (rule_id, band, action) tuples
      expect(distinct.length).toBeGreaterThanOrEqual(4);
      // and the DUMB one is still there (the fallback is not lost)
      expect(tuples.some((t) => t.includes("dumb"))).toBe(true);
    } finally {
      fs.rmSync(scope, { recursive: true, force: true });
    }
  }, 900_000);

  test("test_act_theatrical_fires", () => {
    // ★ the POSITIVE half: a claim with spans=0 MUST produce the theatrical class.
    const scope = freshScope("theat");
    try {
      const ev = decideFromRegistry(ROOT, "evidence", { toolName: "edit", target: "evidence", queriedBefore: true, claims: [{ text: "I verified it", spans: 0 }] }, undefined);
      expect(ev.run.class).toBe("theatrical");
      expect(ev.run.reason).toContain("ZERO bound evidence spans");
    } finally { fs.rmSync(scope, { recursive: true, force: true }); }
  }, 300_000);

  test("test_act_destructive_fires", () => {
    // ★ the DESTRUCTIVE half: no certification MUST be UNCERTIFIABLE, never a pass.
    const scope = freshScope("destr");
    try {
      const ev = decideFromRegistry(ROOT, "zzzNoLayerKnowsThisSubject", { toolName: "edit", target: "zzzNoLayerKnowsThisSubject", queriedBefore: true, claims: [] }, undefined);
      if (ev.run.class === "destructive") {
        expect(ev.run.reason).toContain("no layer certified this act");
      } else {
        // the layers may be down on a fresh scope → the PREFLIGHT refuses first (also correct)
        expect(ev.run.code ?? "").toMatch(/^GI_STACK_INCOMPLETE/);
      }
    } finally { fs.rmSync(scope, { recursive: true, force: true }); }
  }, 300_000);

  test("test_act_grounded_allows", () => {
    // ★ the NEGATIVE half: a grounded act (queried, claims bound, layers certify) MUST NOT
    //   produce a false violation. On the REAL repo with the layers up, the run is clean.
    const ev = decideFromRegistry(ROOT, "evidence", { toolName: "read", target: "evidence", queriedBefore: true, claims: [{ text: "read the code first", spans: 3 }] }, undefined);
    // the act is NOT dumb (it queried) and NOT theatrical (the claim is bound)
    expect(ev.run.class).not.toBe("dumb");
    expect(ev.run.class).not.toBe("theatrical");
    // and there is no GI_BLIND_ACT / GI_FABRICATED_CLAIM code on a grounded act
    if (ev.run.code !== null) expect(ev.run.code).not.toBe("GI_BLIND_ACT");
    if (ev.run.code !== null) expect(ev.run.code).not.toBe("GI_FABRICATED_CLAIM");
  }, 900_000);
});
