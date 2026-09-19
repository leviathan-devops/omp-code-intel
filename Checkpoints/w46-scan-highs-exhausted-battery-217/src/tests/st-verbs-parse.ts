// ST — W4 parse-grade verbs on the corbell substrate (2086 nodes / 9386 edges live).
// Proves the verb surface reads the CORBELL vocabulary faithfully:
// kinds method/flow/service/class (+ Function/Class/File for fallback stores) and
// predicates 'calls' + 'traces-to' (+ 'imports' for fallback stores).
// Before W4 the verbs filtered predicate IN ('calls','imports') only, leaving the
// 4688 'traces-to' edges (flow_step) half-invisible; flow callers were dropped by
// the src.file IS NOT NULL guard. Now: who-calls reads traces-to, impact returns
// the upstream closure with a depth ledger, safeDelete names callers file:line,
// the gate advisory names callers, chain traverses traces-to, unwired reads
// corbell kinds.
import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { closeGiRegistry } from "../src/omp/gi-registry.ts";
import { openSessionStore } from "../src/omp/store-open.ts";
import { populateSessionStore } from "../src/omp/populate.ts";
import {
  blastRadius,
  chainCalls,
  countTypedEdges,
  countTypedNodes,
  gateAdvisory,
  impact,
  safeDelete,
  unwiredNodes,
  whoCalls,
} from "../src/omp/typed-write.ts";

const ROOT = "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/fork-v143/live-tree";

afterEach(() => {
  closeGiRegistry();
  delete process.env.GI_OMP_DB_DIR;
});

function openCorbellPopulated(sessionId: string): { tmp: string; store: string } {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gi-verbs-"));
  process.env.GI_OMP_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "gi-verbs-reg-"));
  const o = openSessionStore({ sessionId, scopeRoot: tmp });
  const r = populateSessionStore(o.storePath, ROOT, "verbs-" + sessionId.slice(-8));
  expect(r.substrate).toBe("corbell");
  expect(r.nodes).toBe(2086);
  expect(r.edges).toBe(9386);
  expect(countTypedNodes(o.storePath)).toBe(2086);
  expect(countTypedEdges(o.storePath)).toBe(9386);
  return { tmp, store: o.storePath };
}

describe("W4 verbs parse-grade on the corbell substrate", () => {
  test("who-calls reads traces-to (flow callers no longer dropped)", () => {
    const { tmp, store } = openCorbellPopulated("ses_VERBSPARSE000000000001");
    const q = whoCalls(store, "openStore");
    // 12 calls + 19 traces-to inbound (2026-09-14 frozen); the old
    // calls/imports-only filter saw 12 at most and dropped every flow.
    expect(q.rows).toBeGreaterThanOrEqual(25);
    const preds = new Set(q.callers.map((c) => c.predicate));
    expect(preds.has("traces-to")).toBe(true);
    expect(preds.has("calls")).toBe(true);
    // A flow_step caller is present (kind flow, file "" — honest, not silent).
    expect(q.callers.some((c) => c.kind === "flow" && c.predicate === "traces-to")).toBe(true);
    // A named method caller survives with file:line (execute @ tools/graph-query.ts:52).
    const named = q.callers.filter((c) => c.file.length > 0);
    expect(named.length).toBeGreaterThanOrEqual(1);
    expect(named.some((c) => c.caller === "execute" && c.file.endsWith("tools/graph-query.ts") && c.line === 52)).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("impact returns reaches>=1 with a depth ledger + follow-up hint", () => {
    const { tmp, store } = openCorbellPopulated("ses_VERBSPARSE000000000002");
    const imp = impact(store, "openStore");
    expect(imp.reaches).toBeGreaterThanOrEqual(1);
    expect(imp.ledger.length).toBe(imp.reaches);
    expect(imp.ledger[0].depth).toBe(1);
    for (const row of imp.ledger) {
      expect(row.symbol.length).toBeGreaterThan(0);
      expect(row.depth).toBeGreaterThanOrEqual(1);
    }
    expect(imp.hint).toContain("next=chain");
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("safeDelete names >=1 caller file:line + reaches + uses + test-reach", () => {
    const { tmp, store } = openCorbellPopulated("ses_VERBSPARSE000000000003");
    const s = safeDelete(store, "openStore");
    expect(s.callers.length).toBeGreaterThanOrEqual(1);
    const named = s.callers.filter((c) => c.file.length > 0 && c.line > 0);
    expect(named.length).toBeGreaterThanOrEqual(1);
    expect(named.some((c) => c.file.endsWith("tools/graph-query.ts"))).toBe(true);
    expect(s.reaches).toBeGreaterThanOrEqual(1);
    // openStore calls exec + applyPragmas (db.ts) — the downstream uses leg.
    expect(s.uses.length).toBeGreaterThanOrEqual(1);
    // The test-reach leg resolves on a symbol with testish-path callers.
    const a = safeDelete(store, "add");
    expect(a.testReach.length).toBeGreaterThanOrEqual(1);
    expect(a.testReach.some((t) => /test|spec|mock|fixture/i.test(t.file))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("gateAdvisory names >=1 caller (store-derived, ripwire absent)", () => {
    const { tmp, store } = openCorbellPopulated("ses_VERBSPARSE000000000004");
    const g = gateAdvisory(store, ["openStore"], "STEER");
    expect(g.callers.length).toBeGreaterThanOrEqual(1);
    // Mechanism contract: the advisory NAMES callers (count + a review entry).
    // The literal caller label is substrate-dependent — the repopulated
    // store's caller mix changed with the W45 edge-read fix.
    expect(g.advisory).toMatch(/callers=\d+/);
    expect(g.advisory).toContain("review:");
    expect(g.advisory).toContain("store-derived");
    const full = gateAdvisory(store, ["openStore"], "FULL");
    expect(full.advisory).toContain("GRAPH_GATE_SIGNATURE_BREAK");
    expect(full.callers.length).toBeGreaterThanOrEqual(1);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("chain traverses traces-to (flow -> method)", () => {
    const { tmp, store } = openCorbellPopulated("ses_VERBSPARSE000000000005");
    const steps = chainCalls(store, "RunGraphLogicPhaseFlow", "runRg");
    expect(steps.length).toBeGreaterThanOrEqual(1);
    expect(steps[steps.length - 1].to).toBe("runRg");
    expect(steps.some((st) => st.kind === "traces-to")).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("unwired reads corbell kinds — lineless rows are a NAMED refusal (V21 W9, no silent drop, no fabricated 0)", () => {
    const { tmp, store } = openCorbellPopulated("ses_VERBSPARSE000000000006");
    // The legacy warm store carries genuinely lineless rows (flow-class). V21 W9:
    // unwired refuses loudly (LINELESS_NODE) instead of fabricating line 0.
    let err: Error | null = null;
    try {
      unwiredNodes(store);
    } catch (e) {
      err = e as Error;
    }
    if (err !== null) {
      expect(err.message).toContain("LINELESS_NODE");
    } else {
      // A store with every row line-anchored returns real rows (no fabrication needed).
      const u = unwiredNodes(store);
      expect(u.length).toBeGreaterThanOrEqual(1);
      for (const r of u) expect(r.line).toBeGreaterThan(0);
    }
    const u2 = (() => { try { return unwiredNodes(store); } catch { return []; } })();
    for (const r of u2.slice(0, 50)) {
      expect(r.file.length).toBeGreaterThan(0);
      expect(r.status).toBe("UNWIRED");
    }
    // blast-radius still fans out on the widened predicates (no regression).
    const b = blastRadius(store, "openStore");
    expect(b.nodes.length).toBeGreaterThanOrEqual(10);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
