// st-package-audit — THE E-3 SEAL (the goal's wave E-3: "the SEAL | PACKAGE_AUDIT PASS").
// THE CONTRACT: the 6L+2E build package is SELF-CONTAINED — every artifact the build's
// own docs reference exists ON DISK at its stated path, at or above its stated floor, and
// the RECEIPT names the checkpoint + the dist SHA it seals. A package whose own receipt
// names a file that is not there is a package that cannot be replicated from.
//
// It is NOT a re-test of the kernel (that is st-gi-6l2e + the battery); it is the SEAL:
// the mechanical proof that the PACKAGE exists as a runnable, replicable artifact set.

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");

/** The package artifacts the seal requires, with the floor each must meet.
 *  The floors are the goal's own stated sizes (the "the depth:" list in the pin). */
const PACKAGE_ARTIFACTS: Array<{ rel: string; floor: number }> = [
  { rel: "packages/gi-kernel-6l2e/MASTER_PROMPT.md", floor: 184 },
  { rel: "packages/gi-kernel-6l2e/THE_6L2E_TESTING_SUITE.md", floor: 259 },
  { rel: "packages/gi-kernel-6l2e/ANTI_THEATRICAL_FIREWALL.md", floor: 185 },
  { rel: "packages/gi-kernel-6l2e/SUBAGENT_ENFORCEMENT.md", floor: 189 },
  { rel: "packages/gi-kernel-6l2e/THE_RECEIPT.md", floor: 250 },
  { rel: "packages/gi-kernel-6l2e/6L2E_COMPLETION_REPORT.md", floor: 300 },
];

/** The binding-authority artifacts (the DPL1 spec + the corpus + the wave plan). */
const AUTHORITY_ARTIFACTS: string[] = [
  "packages/gi-kernel-v2.1/GI_KERNEL_6L2E_DPL1_SPEC.md",
  "reports/GI_KERNEL_57_PATTERNS_BIBLE_v1.md",
  ".trident/plan-6l2e/wave-plan.md",
];

const DIST = "extensions/graph-intelligence/index.js";

function lineCount(rel: string): number {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return -1;
  return fs.readFileSync(abs, "utf8").split("\n").length;
}

describe("st-package-audit: the E-3 seal", () => {
  test("test_package_audit: every package artifact exists at or above its floor", () => {
    const failures: string[] = [];
    for (const a of PACKAGE_ARTIFACTS) {
      const n = lineCount(a.rel);
      if (n < 0) failures.push(`MISSING: ${a.rel}`);
      else if (n < a.floor) failures.push(`THIN: ${a.rel} (${n} < ${a.floor})`);
    }
    if (failures.length > 0) throw new Error(`PACKAGE_AUDIT FAIL:\n  ${failures.join("\n  ")}`);
    expect(failures).toEqual([]);
  });

  test("test_package_audit: the binding-authority artifacts exist", () => {
    const missing = AUTHORITY_ARTIFACTS.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));
    expect(missing).toEqual([]);
  });

  test("test_package_audit: the wave plan declares its wave budget", () => {
    const plan = fs.readFileSync(path.join(ROOT, ".trident/plan-6l2e/wave-plan.md"), "utf8");
    // The planning gate's contract: the first section carries `WAVES: <N>`.
    expect(/^WAVES:\s*\d+/m.test(plan)).toBe(true);
  });

  test("test_package_audit: the receipt names a checkpoint + a dist SHA it seals", () => {
    const receipt = fs.readFileSync(path.join(ROOT, "packages/gi-kernel-6l2e/THE_RECEIPT.md"), "utf8");
    // A receipt that does not name the artifact it seals cannot be replicated from.
    expect(/Checkpoints\/gi-/.test(receipt)).toBe(true);
    expect(/[a-f0-9]{16}/.test(receipt)).toBe(true);
  });

  test("test_package_audit: the sealed dist exists and is non-trivial", () => {
    const abs = path.join(ROOT, DIST);
    expect(fs.existsSync(abs)).toBe(true);
    const bytes = fs.statSync(abs).size;
    // A dist below 100 KB cannot contain the kernel (measured: ~9.4 MB bundled).
    expect(bytes).toBeGreaterThan(100_000);
  });
});
