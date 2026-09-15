// PORTED FROM v443-en38 fork hydra/aether-auditor.ts:96-107 (template/ledger/graph/schema validation) + :205-226 (fulfilled settlement shape) + hydra/aether-tools.ts:148-169 (enforcePinned/WRITE_SCOPE) + :251-260 (graph_tag predicate/kind validation) + hydra/aether-report-reader.ts:95-106 (GRAMMAR_VIOLATION on missing fields)
// Settle-proof law: ONE templated audit settles HunterSettlement fulfilled on the /tmp/fx383-style
// fixture with findings file bytes>0 + grammar-valid report. Adversarial halves pin every rejection.

import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildAuditorTools,
  parseFindingsMarkdown,
  readFindingsReport,
  runTemplateAudit,
  GRAPH_TAG_INVALID_PREDICATE,
  GRAPH_TOOL_VIOLATION,
  READ_CAP,
} from "../auditor.ts";
import { ALL_TEMPLATES, templateByLayerId, templateCount } from "../templates/index.ts";

const GRAPH_PATH = "/tmp/fx383/graphify-out/graph.json";
const TARGET_ROOT = "/tmp/fx383";

describe("hydra templates registry", () => {
  test("exactly 14 templates (6 LASME + 4 MPSE + 4 SRO)", () => {
    expect(templateCount()).toBe(14);
    expect(ALL_TEMPLATES.length).toBe(14);
  });

  test("every template has layerId/anchorPredicate/layerNumber/graphQueries/outputSchema", () => {
    for (const t of ALL_TEMPLATES) {
      expect(t.layerId.length).toBeGreaterThan(0);
      expect(t.anchorPredicate.length).toBeGreaterThan(0);
      expect(t.layerNumber).toBeGreaterThan(0);
      expect(t.graphQueries.length).toBeGreaterThan(0);
      expect(typeof (t.outputSchema as { safeParse?: unknown }).safeParse).toBe("function");
    }
  });

  test("layer-number roster is unique and ascending-ready (R18-R31, 14 distinct)", () => {
    const nums = ALL_TEMPLATES.map((t) => t.layerNumber).sort((a, b) => a - b);
    expect(new Set(nums).size).toBe(14);
    expect(nums[0]).toBe(18);
    expect(nums[nums.length - 1]).toBe(31);
  });

  test("templateByLayerId resolves R28-sro-graph with fork graphQueries", () => {
    const t = templateByLayerId("R28-sro-graph");
    expect(t?.anchorPredicate).toBe("graph-structure");
    expect(t?.graphQueries.join(" ")).toContain("god nodes");
  });

  test("every template outputSchema accepts the canonical candidates+summary payload", () => {
    for (const t of ALL_TEMPLATES) {
      const payload = {
        candidates: [{
          layer: t.layerId,
          predicate: `${t.anchorPredicate}.confirmed-empty`,
          subject: "confirmed-empty",
          object: "Contract",
          file: "src/alpha.ts",
          line: 1,
          evidence: "measured: none",
          implicatedSpecClause: `${t.layerId} audit`,
        }],
        summary: `${t.layerId}: 1 finding`,
      };
      const res = (t.outputSchema as { safeParse: (v: unknown) => { success: boolean } }).safeParse(payload);
      expect(res.success).toBe(true);
    }
  });
});

describe("hydra auditor mission tools", () => {
  test("buildAuditorTools rejects empty ledgerDir with AUDITOR_TOOLS_INVALID", () => {
    expect(() => buildAuditorTools("", TARGET_ROOT, "R28-sro-graph", "flagged_by")).toThrow("AUDITOR_TOOLS_INVALID");
  });

  test("read tool caps at READ_CAP lines", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hydra-belt-"));
    try {
      const belt = buildAuditorTools(dir, TARGET_ROOT, "R28-sro-graph", "flagged_by");
      const out = await belt.read.invoke({ path: "src/alpha.ts", limit: READ_CAP + 1 });
      expect(out).toContain("READ_CAP_EXCEEDED");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("read tool refuses out-of-root with READ_SCOPE_VIOLATION", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hydra-belt-"));
    try {
      const belt = buildAuditorTools(dir, TARGET_ROOT, "R28-sro-graph", "flagged_by");
      const out = await belt.read.invoke({ path: "/etc/hostname" });
      expect(out).toContain("READ_SCOPE_VIOLATION");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("write_findings rejects off-pinned path with GRAPH_TOOL_VIOLATION", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hydra-belt-"));
    try {
      const belt = buildAuditorTools(dir, TARGET_ROOT, "R28-sro-graph", "flagged_by");
      const out = await belt.writeFindings.invoke({ path: path.join(dir, "evil.md"), content: "x" });
      expect(out).toContain(GRAPH_TOOL_VIOLATION);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("graph_tag rejects non-ontology predicate with GRAPH_TAG_INVALID_PREDICATE", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hydra-belt-"));
    try {
      const belt = buildAuditorTools(dir, TARGET_ROOT, "R28-sro-graph", "flagged_by");
      await expect(belt.graphTag.invoke({ findingSubject: "s", findingFile: "f", findingLine: 1, predicate: "not-a-predicate", evidence: "e" }))
        .rejects.toThrow(GRAPH_TAG_INVALID_PREDICATE);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("hydra report grammar", () => {
  test("missing FINDING header rejects GRAMMAR_VIOLATION", () => {
    expect(() => parseFindingsMarkdown("just prose, no blocks\n")).toThrow("GRAMMAR_VIOLATION");
  });

  test("block missing evidence rejects GRAMMAR_VIOLATION", () => {
    const raw = "## FINDING: broken\n- predicate: x.y\n- file: src/alpha.ts:1\n- spec: s\n\n## SUMMARY\ns\n";
    expect(() => parseFindingsMarkdown(raw)).toThrow("GRAMMAR_VIOLATION");
  });

  test("readFindingsReport rejects empty file with REPORT_PARSE_FAILED", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hydra-rep-"));
    const fp = path.join(dir, "report.md");
    try {
      fs.writeFileSync(fp, "   \n", "utf-8");
      await expect(readFindingsReport(fp)).rejects.toThrow("REPORT_PARSE_FAILED");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("hydra audit settle proof (fixture)", () => {
  test("R28-sro-graph settles fulfilled with bytes>0 + grammar-valid report", async () => {
    const ledger = fs.mkdtempSync(path.join(os.tmpdir(), "hydra-settle-"));
    try {
      const template = templateByLayerId("R28-sro-graph")!;
      const settlement = await runTemplateAudit({
        template,
        ledgerDir: ledger,
        targetRoot: TARGET_ROOT,
        graphPath: GRAPH_PATH,
      });
      expect(settlement.status).toBe("fulfilled");
      if (settlement.status !== "fulfilled") return;
      expect(settlement.fileBytes).toBeGreaterThan(0);
      const reportPath = path.join(ledger, "findings", "report.md");
      expect(fs.existsSync(reportPath)).toBe(true);
      const read = await readFindingsReport(reportPath, template.outputSchema as never);
      expect(read.fileBytes).toBeGreaterThan(0);
      const findings = read.findings as { candidates: Array<{ file: string; line: number; evidence: string }> };
      expect(findings.candidates.length).toBeGreaterThan(0);
      for (const c of findings.candidates) {
        expect(c.file.length).toBeGreaterThan(0);
        expect(Number.isInteger(c.line) && c.line > 0).toBe(true);
        expect(c.evidence.length).toBeGreaterThan(0);
      }
      // typed-edge splice landed (graph_tag→typed-edge, one row per finding minimum)
      const splicePath = path.join(ledger, "evidence", "typed-edges.jsonl");
      expect(fs.existsSync(splicePath)).toBe(true);
      const rows = fs.readFileSync(splicePath, "utf-8").trim().split("\n");
      expect(rows.length).toBeGreaterThanOrEqual(findings.candidates.length);
      const row = JSON.parse(rows[0]!) as Record<string, unknown>;
      expect(String(row.evidence_quote ?? "").length).toBeGreaterThan(0);
      expect(settlement.telemetry.toolCallNames).toContain("write_findings");
    } finally {
      fs.rmSync(ledger, { recursive: true, force: true });
    }
  }, 60000);

  test("all 14 templates settle fulfilled on the fixture (no template invalid)", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "hydra-all14-"));
    try {
      for (const t of ALL_TEMPLATES) {
        const ledger = path.join(root, t.layerId);
        const s = await runTemplateAudit({ template: t, ledgerDir: ledger, targetRoot: TARGET_ROOT, graphPath: GRAPH_PATH });
        expect(`${t.layerId}:${s.status}`).toBe(`${t.layerId}:fulfilled`);
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 120000);

  test("missing graph.json rejects GRAPHIFY_NOT_WARM (real attempt, loud)", async () => {
    const ledger = fs.mkdtempSync(path.join(os.tmpdir(), "hydra-settle-"));
    try {
      const template = templateByLayerId("R28-sro-graph")!;
      const s = await runTemplateAudit({
        template,
        ledgerDir: ledger,
        targetRoot: TARGET_ROOT,
        graphPath: path.join(ledger, "no-graph.json"),
      });
      expect(s.status).toBe("rejected");
      if (s.status === "rejected") expect(s.error).toContain("GRAPHIFY_NOT_WARM");
    } finally {
      fs.rmSync(ledger, { recursive: true, force: true });
    }
  });

  test("invalid template rejects HUNTER_TEMPLATE_INVALID", async () => {
    const ledger = fs.mkdtempSync(path.join(os.tmpdir(), "hydra-settle-"));
    try {
      const s = await runTemplateAudit({
        template: { layerId: "", anchorPredicate: "x", layerNumber: 0, staticPrompt: "", outputSchema: undefined as never, graphQueries: [] },
        ledgerDir: ledger,
        targetRoot: TARGET_ROOT,
        graphPath: GRAPH_PATH,
      });
      expect(s.status).toBe("rejected");
      if (s.status === "rejected") expect(s.error).toContain("HUNTER_TEMPLATE_INVALID");
    } finally {
      fs.rmSync(ledger, { recursive: true, force: true });
    }
  });
});
