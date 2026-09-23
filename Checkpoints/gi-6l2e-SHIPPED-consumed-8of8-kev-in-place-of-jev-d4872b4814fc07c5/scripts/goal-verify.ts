// goal-verify — ★ THE GOAL'S DONE CONDITIONS AS A MECHANICAL PREDICATE.
//
// THE PREDICATE LAW (measured 2026-09-23): a condition with no exit test is DOCUMENTATION.
// Before this script, three of the goal's five DONE conditions were satisfied only by an
// operator READING a number:
//   · "the register reads consumed:8"      → consumption-audit printed and exited 0 (FIXED: --gate)
//   · "the host-live seat … a non-empty bug ledger" → NOTHING failed on an empty ledger
//   · "the seal + receipt exist"           → only a file listing proved it
//
// THIS SCRIPT IS THE EXIT TEST. Each condition is a check that returns PASS/FAIL; ANY failure
// prints its named reason and the process exits 1. A green run is the ONLY way to claim the
// goal's five conditions — the exit code is the claim.
//
// usage: bun scripts/goal-verify.ts [scopeRoot] [subject]
import * as fs from "node:fs";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { consumptionAudit } from "../src/omp/layer-consumption.ts";

const scopeRoot = process.argv[2] ?? process.cwd();
const subject = process.argv[3] ?? "evidence";

interface Check {
  id: string;
  /** WHAT the goal requires, verbatim. */
  condition: string;
  /** The mechanical test. Returns null on PASS, or the NAMED failure. */
  run: () => string | null;
}

const checks: Check[] = [
  {
    id: "C1",
    condition: "the register reads consumed:8 (not up=11/11)",
    run: () => {
      const audit = consumptionAudit(scopeRoot, subject);
      const consumed = audit.reports.filter((r) => r.consumed).length;
      const total = audit.reports.length;
      if (consumed < 8) {
        const off = audit.reports.filter((r) => !r.consumed).map((r) => `${r.consumer}:${r.verdict}`).join(",");
        return `consumed:${consumed}/${total} < 8 — offenders=${off}`;
      }
      return null;
    },
  },
  {
    id: "C2",
    condition: "the 7-class corpus settles at $0 with its SPECIFIC tokens",
    run: () => {
      const suitePath = path.join(scopeRoot, "tests", "st-gi-6l2e.test.ts");
      if (!fs.existsSync(suitePath)) return `the 7-class corpus suite is ABSENT at ${suitePath}`;
      const t = fs.readFileSync(suitePath, "utf8");
      // the corpus IS seven fixtures, and the count is ASSERTED (not narrated)
      if (!/fixtures\.length\)\.toBe\(7\)/.test(t)) return "the 7-fixture count assertion is ABSENT from tests/st-gi-6l2e.test.ts";
      // the $0 settlement: the judge must not be reached, the budget untouched, the cost zero
      for (const tok of ["judgeCalls).toBe(0)", "firesUsed()).toBe(0)", "costUsd).toBe(0)"]) {
        if (!t.includes(tok)) return `the $0 assertion '${tok}' is ABSENT`;
      }
      // the SPECIFIC tokens: the graph rules the corpus fires
      for (const rule of ["M-GRAPH-1", "M-GRAPH-2", "M-GRAPH-4", "M-GRAPH-5"]) {
        if (!t.includes(rule)) return `the specific rule token '${rule}' is ABSENT from the corpus`;
      }
      return null;
    },
  },
  {
    id: "C3",
    condition: "the container Phase-E is 10/10 + the negative suite",
    run: () => {
      const hostRaw = fs.existsSync(path.join(scopeRoot, ".trident/plan-6l2e/phaseE.json"))
        ? (fs.readFileSync(path.join(scopeRoot, ".trident/plan-6l2e/phaseE.json"), "utf8"))
        : null;
      const host = hostRaw === null ? null : (JSON.parse(hostRaw) as { scenarios?: unknown[]; verdict?: string });
      if (host === null) return ".trident/plan-6l2e/phaseE.json is ABSENT";
      const n = host.scenarios?.length ?? 0;
      if (n < 10) return `the host rig's Phase-E has ${n} scenarios (< 10)`;
      if (!/PASS/.test(host.verdict ?? "")) return `the host rig's verdict is not PASS: '${host.verdict}'`;
      const kevRaw = fs.existsSync(path.join(scopeRoot, ".trident/plan-6l2e/phaseE-kev.json"))
        ? (fs.readFileSync(path.join(scopeRoot, ".trident/plan-6l2e/phaseE-kev.json"), "utf8"))
        : null;
      const kev = kevRaw === null ? null : (JSON.parse(kevRaw) as { verdict?: string });
      if (kev === null) return ".trident/plan-6l2e/phaseE-kev.json is ABSENT";
      if (!/PASS/.test(kev.verdict ?? "")) return `the KEV rig's verdict is not PASS: '${kev.verdict}'`;
      // ★ THE TWO-SIDED ADJUDICATION (this check caught ITSELF): a bare /BLOCKED/ matches the
      //   SUCCESS string "0 BLOCKED". The predicate is correct only for a NONZERO count.
      const blocked = /([1-9]\d*)\s+BLOCKED/.exec(kev.verdict ?? "");
      if (blocked !== null) return `the KEV rig reports ${blocked[1]} BLOCKED scenario(s): '${kev.verdict}'`;
      const red = fs.existsSync(path.join(scopeRoot, "tests", "st-gi-v21-redteam.test.ts"));
      if (!red) return "the negative suite (tests/st-gi-v21-redteam.test.ts) is ABSENT";
      return null;
    },
  },
  {
    id: "C4",
    condition: "the host-live seat operated the kernel with a non-empty bug ledger",
    run: () => {
      const db = path.join(scopeRoot, ".omp", "graph-intelligence", "fire-decisions.db");
      if (!fs.existsSync(db)) return `${db} is ABSENT — the runtime ledger was never written`;
      try {
        const d = new Database(db, { readonly: true });
        const row = d.query("SELECT COUNT(*) AS n FROM fire_decisions").get() as { n: number } | null;
        d.close();
        const n = row?.n ?? 0;
        if (n < 1) return `the runtime ledger holds ${n} rows — an EMPTY ledger is the goal's named red flag`;
        return null;
      } catch (e) {
        return `the runtime ledger could not be read: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },
  {
    id: "C5",
    condition: "the seal + receipt exist",
    run: () => {
      const audit = path.join(scopeRoot, "packages", "gi-kernel-6l2e", "PACKAGE_AUDIT.md");
      const receipt = path.join(scopeRoot, "packages", "gi-kernel-6l2e", "THE_RECEIPT.md");
      if (!fs.existsSync(audit)) return "packages/gi-kernel-6l2e/PACKAGE_AUDIT.md is ABSENT";
      if (!fs.existsSync(receipt)) return "packages/gi-kernel-6l2e/THE_RECEIPT.md is ABSENT";
      const a = fs.readFileSync(audit, "utf8");
      if (!/Verdict:\*\* ★ \*\*PASS/.test(a)) return "PACKAGE_AUDIT does not carry the PASS verdict";
      const r = fs.readFileSync(receipt, "utf8");
      if (!/Checkpoints\/gi-/.test(r)) return "THE_RECEIPT names no checkpoint";
      if (!/[a-f0-9]{16}/.test(r)) return "THE_RECEIPT names no dist SHA";
      return null;
    },
  },
];

console.log(`[goal-verify] scopeRoot=${scopeRoot} · subject=${subject}`);
console.log("[goal-verify] ★ THE FIVE DONE CONDITIONS, MECHANICALLY");
const failures: string[] = [];
for (const c of checks) {
  let reason: string | null;
  try {
    reason = c.run();
  } catch (e) {
    reason = `the check THREW: ${e instanceof Error ? e.message : String(e)}`;
  }
  if (reason === null) {
    console.log(`  ${c.id} PASS  ${c.condition}`);
  } else {
    console.log(`  ${c.id} FAIL  ${c.condition}`);
    console.log(`        └─ ${reason}`);
    failures.push(`${c.id}: ${reason}`);
  }
}
if (failures.length > 0) {
  console.log(`\nGI_GOAL_NOT_MET: ${failures.length} of ${checks.length} conditions FAILED`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log(`\n[goal-verify] ★ THE PREDICATE PASSED: ${checks.length}/${checks.length} conditions met`);
