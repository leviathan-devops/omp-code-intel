// ★ ST-W3-AUDIT-1..3 — THE WHOLE-TREE AUDIT COVERAGE (W3's FR-3+FR-4 pin).
//
// FR-3 was: the audit scanned 3 of 112 files (2.7%) and the PASS was reported as tree-wide.
// This suite FAILS if the audit returns to a sample. The coverage is the claim.

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const ARTIFACT = path.join(ROOT, "artifacts", "whole-tree-audit.json");

function srcFileCount(): number {
  const walk = (d: string): string[] =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
    );
  return walk(path.join(ROOT, "src")).filter((f) => f.endsWith(".ts")).length;
}

describe("st-w3-audit: ★ THE WHOLE-TREE AUDIT COVERS THE TREE", () => {
  test("test_audit_whole_tree_coverage", () => {
    // ★ THE ARTIFACT MUST EXIST — no artifact, no claim.
    expect(fs.existsSync(ARTIFACT)).toBe(true);
    const audit = JSON.parse(fs.readFileSync(ARTIFACT, "utf8")) as {
      files_scanned: number;
      files_with_a_result: number;
      total_comments: number;
      by_severity: Record<string, number>;
      "★ AUDIT GATE (the whole tree)"?: string;
    };
    const live = srcFileCount();
    // ★ FR-3's PIN: the scan ATTEMPTS the WHOLE tree, never a sample (the 2.7% fraud).
    expect(audit.files_scanned).toBeGreaterThanOrEqual(live);
    // and it produced a result for the overwhelming majority (a scan that reads nothing is no scan)
    expect(audit.files_with_a_result).toBeGreaterThanOrEqual(Math.floor(live * 0.9));
  });

  test("test_audit_verdict_is_named", () => {
    const audit = JSON.parse(fs.readFileSync(ARTIFACT, "utf8")) as {
      by_severity: Record<string, number>;
      "★ AUDIT GATE (the whole tree)"?: string;
    };
    // ★ THE VERDICT IS A MECHANICAL FUNCTION OF THE COUNTS — never a hand-typed word.
    const crit = audit.by_severity.critical ?? 0;
    const high = audit.by_severity.high ?? 0;
    const expected = crit === 0 && high === 0 ? "PASS" : "FAIL";
    expect(audit["★ AUDIT GATE (the whole tree)"]?.startsWith(expected)).toBe(true);
  });

  test("test_audit_gate_reflects_the_tree_not_a_sample", () => {
    // ★ THE NEGATIVE CONTROL: the artifact must EXPOSE the blocking count, so a FAIL cannot be
    //   silently rounded to a PASS. If critical+high > 0 the gate string names them.
    const audit = JSON.parse(fs.readFileSync(ARTIFACT, "utf8")) as {
      by_severity: Record<string, number>;
      "★ AUDIT GATE (the whole tree)"?: string;
      the_blocking_findings?: unknown[];
    };
    const crit = audit.by_severity.critical ?? 0;
    const high = audit.by_severity.high ?? 0;
    if (crit + high > 0) {
      expect(audit["★ AUDIT GATE (the whole tree)"]).toContain("FAIL");
      expect((audit.the_blocking_findings ?? []).length).toBeGreaterThan(0);
    }
  });
});
