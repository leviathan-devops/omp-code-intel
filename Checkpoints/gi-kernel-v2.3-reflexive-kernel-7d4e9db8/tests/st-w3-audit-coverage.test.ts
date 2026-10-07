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
    //   THIS is the anti-fraud invariant — it holds regardless of the lane's health.
    expect(audit.files_scanned).toBeGreaterThanOrEqual(live);
    // ★ THE HEALTH METRIC (V2.2, 2026-09-26): "most files got a result" is a HEALTHY-LANE
    //   property. When the free lane rate-limits mid-run, the script writes explicit
    //   EMPTY_RESULT markers (the honest "the scan returned nothing" record) and the
    //   artifact's gate line names the degradation. Assert the health metric ONLY on a
    //   healthy run; on a BLOCKED/degraded run, assert the DEGRADATION IS NAMED (the
    //   anti-fraud invariant above already held). Fitting a green here would be the
    //   FITTED-TO-GOLDEN anti-pattern; distinguishing an invariant from an environment
    //   metric is not.
    const gate = audit["★ AUDIT GATE (the whole tree)"] ?? "";
    const degraded = /BLOCKED|degraded|EMPTY_RESULT/i.test(gate);
    if (!degraded) {
      expect(audit.files_with_a_result).toBeGreaterThanOrEqual(Math.floor(live * 0.9));
    } else {
      // a degraded run must NAME its degradation, never silently read as clean
      expect(gate).toMatch(/BLOCKED|degraded/i);
    }
  });

  test("test_audit_verdict_is_named", () => {
    const audit = JSON.parse(fs.readFileSync(ARTIFACT, "utf8")) as {
      by_severity: Record<string, number>;
      empty_result_parts?: number;
      "★ AUDIT GATE (the whole tree)"?: string;
    };
    // ★ THE VERDICT IS A MECHANICAL FUNCTION OF THE COUNTS AND THE DEGRADATION — never a hand-typed word.
    //   V2.2 (2026-09-26): a run with EMPTY_RESULT parts (the lane rate-limited) is BLOCKED, never PASS.
    const crit = audit.by_severity.critical ?? 0;
    const high = audit.by_severity.high ?? 0;
    const degraded = (audit.empty_result_parts ?? 0) > 0;
    const expected = degraded ? "BLOCKED" : crit === 0 && high === 0 ? "PASS" : "FAIL";
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
