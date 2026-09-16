/**
 * st-hunter-port — hunter harness HARNESS-CORE proof battery.
 * Proves end-to-end (REAL modules, no mocks except the stub adapter/battery):
 *   1. happy path: stub profile + stub adapter + 2-seed stub battery run
 *      RECON→MAP→SCAN→TRACE→STRIKE→REPORT to state=done with a named runId,
 *      findingsCount=2, a MASTER_CONTEXT/bug_hunter_report_v1.md artifact, and
 *      a HUNT_DONE bus row — plus per-phase artifact evidence.
 *   2. fail-closed path: missing profile → state=inconclusive with the NAMED
 *      PROFILE_INVALID error (never a silent pass).
 *   3. hunt-lock acquire/exclusive/refusal + release/re-acquire round-trip.
 */
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadProfile } from "../src/hunter/profile/loader.ts";
import type { ProjectProfile } from "../src/hunter/profile/schema.ts";
import { compileTemplate, TEMPLATE_LIBRARY } from "../src/hunter/lexicon/templates.ts";
import type { CompiledPredicate } from "../src/hunter/lexicon/templates.ts";
import type {
  BuildResult,
  DeadNode,
  GraphAdapter,
  GraphNode,
} from "../src/hunter/graph/interface.ts";
import { createMicroLoop } from "../src/hunter/harness/micro-loop-machine.ts";
import {
  acquireHuntLock,
  huntLockPath,
  releaseHuntLock,
} from "../src/hunter/harness/hunt-lock.ts";

const PROJECT_NAME = "hunter-port-fixture";
const STUB_BATTERY_VERSION = "st-hunter-port-battery-v1";

function fixtureTarget(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "st-hunter-port-"));
  fs.mkdirSync(path.join(dir, "corpus"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "corpus", "rules.md"),
    [
      "# Fixture corpus (the compiled-battery source)",
      "> NEVER ship dead modules with zero inbound callers.",
      "> MUST wire every declared pipeline stage to its entry.",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(dir, "profile.json"),
    JSON.stringify({
      profileVersion: 1,
      project: {
        name: PROJECT_NAME,
        root: dir,
        languages: ["typescript"],
        entryPoints: ["src/main.ts"],
        build: "true",
        test: "true",
      },
      graph: { substrate: "corbell", scope: ["src"], excludes: [] },
      rules: { corpus: ["corpus/rules.md"], bindings: {} },
      pipeline: {
        stages: [{ id: "s1", entry: "main", contract: "the fixture stage contract" }],
      },
      history: { failureLogs: [] },
      awareness: { docs: [] },
    }),
  );
  return dir;
}

function loadFixtureProfile(target: string): ProjectProfile {
  return loadProfile(path.join(target, "profile.json"));
}

/** The stub adapter — the §6.5 adapter-override seam. Two unwired dead nodes
 *  seed the findings through the REAL wiring.no-dead-module template check. */
function stubAdapter(): GraphAdapter {
  const nodes: GraphNode[] = [
    {
      id: "seed:node-a",
      kind: "function",
      name: "seedFnA",
      file: null,
      line: null,
      lineage: "CODE_DERIVED",
      source: "stub:seed",
    },
    {
      id: "seed:node-b",
      kind: "function",
      name: "seedFnB",
      file: null,
      line: null,
      lineage: "CODE_DERIVED",
      source: "stub:seed",
    },
  ];
  const dead: DeadNode[] = [
    { id: "seed:a", name: "seedFnA", file: "src/seed-a.ts", line: 11 },
    { id: "seed:b", name: "seedFnB", file: "src/seed-b.ts", line: 22 },
  ];
  const buildResult: BuildResult = {
    nodes,
    edges: [],
    durationMs: 1,
    adapter: "corbell",
    lineage: { spec: 0, code: 2, hybrid: 0 },
    command: "stub-build",
  };
  return {
    build: async (_profile: ProjectProfile) => buildResult,
    whoCalls: (_symbol: string) => [],
    chain: (_id: string) => [],
    imports: (_module: string) => [],
    awaits: (_symbol: string) => [],
    unwired: () => dead,
    nodes: (kind?: GraphNode["kind"]) =>
      kind ? nodes.filter((n) => n.kind === kind) : [...nodes],
  };
}

/** The 2-seed stub battery — one REAL compiled predicate (the template check
 *  fires once per unwired node → 2 findings). */
function stubBattery(): CompiledPredicate[] {
  const template = TEMPLATE_LIBRARY["wiring.no-dead-module"];
  if (!template) throw new Error("STUB_BATTERY_MISSING: wiring.no-dead-module absent from TEMPLATE_LIBRARY");
  const card = {
    verbatimQuote: "NEVER ship dead modules with zero inbound callers.",
    anchor: "corpus/rules.md:2",
    severity: "HIGH" as const,
  };
  const predicate = compileTemplate(
    template,
    { verbatimQuote: card.verbatimQuote, anchor: card.anchor, severity: card.severity },
    card,
    STUB_BATTERY_VERSION,
  );
  return [predicate];
}

describe("st-hunter-port: happy path runs the 6-phase loop to a report", () => {
  test("RECON→MAP→SCAN→TRACE→STRIKE→REPORT emits runId + findings + report + HUNT_DONE", async () => {
    const target = fixtureTarget();
    const profile = loadFixtureProfile(target);
    const loop = createMicroLoop({
      targetPath: target,
      profilePath: path.join(target, "profile.json"),
      adapter: stubAdapter(),
      profile,
      battery: stubBattery(),
    });
    try {
      loop.start({ type: "START" });
      await loop.done();
      const snap = loop.getSnapshot();

      // THE TERMINAL CONTRACT
      expect(snap.state).toBe("done");
      expect(snap.phase).toBe("done");
      expect(snap.result.state).toBe("done");
      expect(snap.result.error).toBeNull();

      // THE NAMED RUN ID (recon-derived: '<project>-hunt-<yyyyMMdd>-<seq>')
      expect(snap.result.runId).toMatch(/^hunter-port-fixture-hunt-\d{8}-1$/);

      // SCAN+STRIKE: the 2 seeded findings survived to the fix order. The
      // ruleIds are the REAL content-addressed predicate ids
      // ('wiring.no-dead-module:<hash12>' — templates.ts contentAddress, never
      // the bare template name), so the fix order is matched by suffix.
      expect(snap.result.findingsCount).toBe(2);
      expect(loop.context.traces).toHaveLength(2);
      expect(snap.result.fixOrder).toHaveLength(2);
      expect(snap.result.fixOrder[0]).toMatch(/^wiring\.no-dead-module:[0-9a-f]{12}:src\/seed-[ab]\.ts:\d+$/);
      expect(snap.result.fixOrder[1]).toMatch(/^wiring\.no-dead-module:[0-9a-f]{12}:src\/seed-[ab]\.ts:\d+$/);
      expect([...snap.result.fixOrder].sort().map((id) => id.replace(/^wiring\.no-dead-module:[0-9a-f]{12}:/, ''))).toEqual([
        'src/seed-a.ts:11',
        'src/seed-b.ts:22',
      ]);

      // REPORT: the LOCKED artifact landed at v1 under the tmp target
      const reportPath = snap.result.reportPath;
      expect(reportPath).toContain(path.join("MASTER_CONTEXT", "bug_hunter_report_v1.md"));
      expect(fs.existsSync(reportPath as string)).toBe(true);
      const document = fs.readFileSync(reportPath as string, "utf-8");
      expect(document).toContain("# BUG-HUNT REPORT — v1");
      expect(document).toContain(snap.result.runId);
      expect(document).toContain("src/seed-a.ts:11");
      expect(document).toContain("src/seed-b.ts:22");

      // PER-PHASE ARTIFACT EVIDENCE (each phase's durable side effect)
      const db = loop.context.db;
      if (!db) throw new Error("ST-HUNTER-PORT: context.db missing after done (MAP never landed)");
      // MAP: the graph rows landed
      const nodeRows = db.prepare("SELECT id FROM graph_nodes").all();
      expect(nodeRows).toHaveLength(2);
      // SCAN: the runId-scoped findings landed
      const findingRows = db
        .prepare("SELECT rule_id, file, line FROM findings WHERE run_id = ?")
        .all(snap.result.runId);
      expect(findingRows).toHaveLength(2);
      // REPORT: the 6-part sections landed
      const sectionRows = db
        .prepare("SELECT finding_id FROM report_sections WHERE run_id = ?")
        .all(snap.result.runId);
      expect(sectionRows).toHaveLength(2);
      // REPORT: the HUNT_DONE bus event landed with the payload contract
      const eventRows = db
        .prepare("SELECT payload FROM events WHERE kind = 'HUNT_DONE'")
        .all();
      expect(eventRows).toHaveLength(1);
      const payload = JSON.parse(String(eventRows[0]["payload"])) as Record<string, unknown>;
      expect(payload["runId"]).toBe(snap.result.runId);
      expect(payload["reportPath"]).toBe(reportPath);
      expect(payload["findingsCount"]).toBe(2);
      expect(payload["batteryVersion"]).toBe(STUB_BATTERY_VERSION);
      expect(payload["fixOrder"]).toEqual(snap.result.fixOrder);
      db.close();
    } finally {
      try {
        loop.context.db?.close();
      } catch {
        /* the idempotent close */
      }
      loop.stop();
      fs.rmSync(target, { recursive: true, force: true });
    }
  }, 30000);
});

describe("st-hunter-port: fail-closed INCONCLUSIVE carries the NAMED error", () => {
  test("missing profile → state=inconclusive with PROFILE_INVALID (never a silent pass)", async () => {
    const target = fs.mkdtempSync(path.join(os.tmpdir(), "st-hunter-port-bad-"));
    const loop = createMicroLoop({
      targetPath: target,
      profilePath: path.join(target, "no-such-profile.json"),
    });
    try {
      loop.start({ type: "START" });
      await loop.done();
      const snap = loop.getSnapshot();
      expect(snap.state).toBe("inconclusive");
      expect(snap.phase).toBe("inconclusive");
      expect(snap.result.state).toBe("inconclusive");
      expect(snap.result.reportPath).toBeNull();
      expect(snap.result.findingsCount).toBe(0);
      expect(snap.result.error).not.toBeNull();
      expect(snap.result.error as string).toMatch(/PROFILE_INVALID/);
    } finally {
      loop.stop();
      fs.rmSync(target, { recursive: true, force: true });
    }
  }, 30000);
});

describe("st-hunter-port: hunt-lock acquire/release round-trip", () => {
  test("acquire → exclusive refusal → release → re-acquire", () => {
    const target = fs.mkdtempSync(path.join(os.tmpdir(), "st-hunter-port-lock-"));
    try {
      const first = acquireHuntLock(target);
      expect(first.pid).toBe(process.pid);
      expect(fs.existsSync(huntLockPath(target))).toBe(true);

      // exclusivity: a second acquire while held is the NAMED refusal
      let refused: unknown = null;
      try {
        acquireHuntLock(target);
      } catch (e: unknown) {
        refused = e;
      }
      expect(refused).not.toBeNull();
      expect(String((refused as Error).message)).toMatch(/HUNT_ALREADY_RUNNING/);

      releaseHuntLock(target);
      expect(fs.existsSync(huntLockPath(target))).toBe(false);

      const second = acquireHuntLock(target);
      expect(second.pid).toBe(process.pid);
      releaseHuntLock(target);
      expect(fs.existsSync(huntLockPath(target))).toBe(false);
    } finally {
      fs.rmSync(target, { recursive: true, force: true });
    }
  });
});
