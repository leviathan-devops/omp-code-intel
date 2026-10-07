// ST — the ripwire bridge, FULL verb delegation (W4 seam completed).
// Proves every consult against the REAL binary on the fork tree, the hermetic
// absence path for each, and the gateAdvisory note variants:
//   callers  → count≥1 + the cross-check (tools/graph-query.ts callers)
//   impact   → reaches≥1
//   edit-check → status attr + callers≥1 + incompatible attr
//   safe-delete → callers≥1 + risk attr + impact_reaches≥1
//   path     → reachable=1 for execute→openStore (hops≥1)
//   dead-code → numeric count + high confidence
//   verify   → calls(execute, openStore) verdict=confirmed; a refused claim named
//   absent   → every consult returns present:false + `absent (…)` summary, never a throw
//   notes    → ok leg / failed leg / not-consulted strings on gateAdvisory
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  resolveRipwire,
  ripwireCallers,
  ripwireDeadCode,
  ripwireEditCheck,
  ripwireImpact,
  ripwirePath,
  ripwireSafeDelete,
  ripwireVerify,
} from "../src/omp/ripwire-bridge.ts";
import { gateAdvisory, countTypedNodes } from "../src/omp/typed-write.ts";
import { openSessionStore } from "../src/omp/store-open.ts";
import { closeGiRegistry } from "../src/omp/gi-registry.ts";

const ROOT = "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/fork-v143/live-tree";
const DEAD_ENV = { RIPWIRE_BIN: "/nonexistent-ripwire", HOME: "/nonexistent-home", PATH: "/nonexistent-bin" } as NodeJS.ProcessEnv;

describe("st-ripwire-bridge: full verb delegation", () => {
  test("resolve + callers: real binary, count≥1, cross-check vs the GI store's execute@52", () => {
    const bin = resolveRipwire();
    expect(bin).toBeTruthy();
    expect(fs.existsSync(bin as string)).toBe(true);
    const rw = ripwireCallers(ROOT, "openStore");
    expect(rw.present).toBe(true);
    expect(rw.ok).toBe(true);
    expect(rw.summary).toContain("callers");
    if (rw.ok) {
      const callers = rw.data.callers as { name: string; file: string; line: number }[];
      expect(Number(rw.data.count)).toBeGreaterThanOrEqual(1);
      expect(callers.length).toBeGreaterThanOrEqual(1);
      expect(callers.some((c) => c.file.includes("tools/graph-query.ts"))).toBe(true);
    }
  }, 30000);

  test("impact: reaches≥1 with the radius split parsed", () => {
    const rw = ripwireImpact(ROOT, "openStore");
    expect(rw.ok).toBe(true);
    expect(Number(rw.data.reaches)).toBeGreaterThanOrEqual(1);
    expect(rw.summary).toContain("impact_reaches=");
  }, 30000);

  test("edit-check: status + callers + incompatible parsed, <c> rows present", () => {
    const rw = ripwireEditCheck(ROOT, "openStore");
    expect(rw.ok).toBe(true);
    expect(Number(rw.data.callers)).toBeGreaterThanOrEqual(1);
    expect(typeof rw.data.status).toBe("string");
    expect(rw.summary).toContain("edit-check status=");
    expect((rw.data.rows as unknown[]).length).toBeGreaterThanOrEqual(1);
  }, 30000);

  test("safe-delete: callers/impact_reaches/uses/risk parsed", () => {
    const rw = ripwireSafeDelete(ROOT, "openStore");
    expect(rw.ok).toBe(true);
    expect(Number(rw.data.callers)).toBeGreaterThanOrEqual(1);
    expect(Number(rw.data.impact_reaches)).toBeGreaterThanOrEqual(1);
    expect(String(rw.data.risk).length).toBeGreaterThan(0);
  }, 30000);

  test("path: execute→openStore reachable, hops≥1, steps named", () => {
    const rw = ripwirePath(ROOT, "execute", "openStore");
    expect(rw.ok).toBe(true);
    expect(rw.data.reachable).toBe(true);
    expect(Number(rw.data.hops)).toBeGreaterThanOrEqual(1);
    expect((rw.data.steps as unknown[]).length).toBeGreaterThanOrEqual(1);
  }, 30000);

  test("dead-code: numeric count + high confidence", () => {
    const rw = ripwireDeadCode(ROOT);
    expect(rw.ok).toBe(true);
    expect(Number.isFinite(Number(rw.data.count))).toBe(true);
    expect(String(rw.data.confidence).length).toBeGreaterThan(0);
  }, 30000);

  test("verify: calls(execute, openStore) → confirmed; a free-text claim is REFUSED, named", () => {
    const ok = ripwireVerify(ROOT, "calls(execute, openStore)");
    expect(ok.ok).toBe(true);
    expect(String(ok.data.verdict)).toBe("confirmed");
    const refused = ripwireVerify(ROOT, "openStore has callers");
    expect(refused.ok).toBe(false);
    expect(refused.present).toBe(true); // the binary ran; the CLAIM was refused
    expect(refused.summary).toContain("claim refused");
  }, 30000);

  test("ABSENT: every consult is fail-soft and named under a hermetic env", () => {
    expect(resolveRipwire(DEAD_ENV)).toBeNull();
    const legs = [
      ripwireCallers(ROOT, "openStore", { env: DEAD_ENV }),
      ripwireImpact(ROOT, "openStore", { env: DEAD_ENV }),
      ripwireEditCheck(ROOT, "openStore", { env: DEAD_ENV }),
      ripwireSafeDelete(ROOT, "openStore", { env: DEAD_ENV }),
      ripwirePath(ROOT, "execute", "openStore", { env: DEAD_ENV }),
      ripwireDeadCode(ROOT, { env: DEAD_ENV }),
      ripwireVerify(ROOT, "uses(openStore)", { env: DEAD_ENV }),
    ];
    for (const leg of legs) {
      expect(leg.present).toBe(false);
      expect(leg.ok).toBe(false);
      expect(leg.summary.startsWith("absent")).toBe(true);
    }
  });

  test("NOTE VARIANTS: ok / failed / not-consulted on gateAdvisory", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gi-ripwire-st-"));
    process.env.GI_OMP_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "gi-ripwire-reg-"));
    const o = openSessionStore({ sessionId: "ses_RIPWIRE0000000000000001", scopeRoot: tmp });
    expect(countTypedNodes(o.storePath)).toBe(0);
    const none = gateAdvisory(o.storePath, ["x"], "STEER");
    expect(none.advisory).toContain("ripwire not consulted");
    const ok = gateAdvisory(o.storePath, ["x"], "STEER", { ok: true, summary: "edit-check status=no-baseline callers=6 incompatible=0" });
    expect(ok.advisory).toContain("store-derived + ripwire edit-check status=no-baseline callers=6");
    const failed = gateAdvisory(o.storePath, ["x"], "FULL", { ok: false, summary: "absent (ripwire binary not found (set RIPWIRE_BIN))" });
    expect(failed.advisory).toContain("GRAPH_GATE_SIGNATURE_BREAK");
    expect(failed.advisory).toContain("store-derived; ripwire absent");
    fs.rmSync(tmp, { recursive: true, force: true });
    closeGiRegistry();
    delete process.env.GI_OMP_DB_DIR;
  });
});
