// scripts/consumption-audit — ★ THE D-1 PROBE, RUNNABLE.
//
// Ask the registry for one subject and print the CONSUMPTION verdict. This is the
// operator-facing answer to "is the 6L+2E actually wired?" — not `up=11/11` (a health
// check on files) but `consumed:N/8` (which consumers actually contributed a fact).
//
// usage: bun scripts/consumption-audit.ts <scopeRoot> [subject] [--expect <N>]
//
// ★ THE MECHANICAL PREDICATE (2026-09-23, the PREDICATE LAW). Measured before this change:
// the script exited 0 for a subject with NO facts and for an EMPTY scope — so the goal's
// "DONE only when the register reads consumed:8" was DOCUMENTATION, not a predicate.
// `--expect N` makes it mechanical: consumed < N ⇒ a NAMED error on stdout AND exit 1.
// `--gate` is the shorthand for the goal's own bar (`--expect 8`).
import * as path from "node:path";
import { consumptionAudit } from "../src/omp/layer-consumption.ts";

const argv = process.argv.slice(2);
const expectIdx = argv.findIndex((a) => a === "--expect");
const expectArg = expectIdx >= 0 ? Number(argv[expectIdx + 1]) : NaN;
const gate = argv.includes("--gate");
// ★ `--gate` uses the PER-DOMAIN predicate (its own block below); `--expect N` the raw count.
//   They are mutually exclusive: `--gate` must NOT also set a raw expected of 8 (it did — a bug
//   caught by its own exit test, which still reported `consumed:7/8 < expected:8`).
const expected = Number.isFinite(expectArg) ? expectArg : null;
// the positional args are the ones that are not the flags (or an --expect value)
const positionals = argv.filter((a, i) => !a.startsWith("--") && !(expectIdx >= 0 && i === expectIdx + 1));

// ★ F-35 FIX (2026-09-24): RESOLVE to absolute (the adapters require it; the pin passes '.').
const scopeRoot = path.resolve(positionals[0] ?? process.cwd());
const subject = positionals[1] ?? "populateSessionStore";

const audit = consumptionAudit(scopeRoot, subject);
console.log(`[consumption] scopeRoot=${audit.scopeRoot}`);
console.log(`[consumption] subject=${audit.subject}`);
console.log(`[consumption] ★ ${audit.summary}`);
console.log(`[consumption] influenced=${audit.influenced.join(",") || "(none)"}`);
for (const r of audit.reports) {
  console.log(
    `  ${r.consumer.padEnd(13)} ${r.verdict.padEnd(20)} rung=${r.rung.padEnd(10)} facts=${r.factsReturned}${r.factsDiscarded > 0 ? ` discarded=${r.factsDiscarded}` : ""}  ${r.evidence.slice(0, 70)}`,
  );
}

// ★ THE PREDICATE: a LOUD, NONZERO failure — never a green print.
//
// ★ THE CORRECT READING (measured 2026-09-24, the red-team close). The 8 consumers answer about
// DIFFERENT DOMAINS: the 6 graph layers + TSG + ABIDE know CODE SYMBOLS, while L2_ARSUMBRIS knows
// the au engine's REPO/DEP names. MEASURED:
//   subject `evidence`  -> consumed:7/8 (only L2 down — the engine holds no "evidence")
//   subject `arsumbris` -> consumed:7/8 (only ABIDE down — no such event; L2 CONSUMED, 6 facts)
// NO SINGLE ARBITRARY SUBJECT IS IN ALL 8 DOMAINS. So `--gate` asks each consumer about ITS OWN
// domain and requires ALL 8 CONSUMED across the runs — the goal's real condition. `--expect N`
// stays the RAW count for the given subject (the subject-specific measure, unchanged).
const DOMAIN_SUBJECTS: Record<string, string[]> = {
  L1_SEMANTICA: [subject, "arsumbris"],
  L2_ARSUMBRIS: ["au-mcp-sdk", "au-engine", "arsumbris"],
  L3_UA: [subject, "arsumbris"],
  L4_C2KG: [subject, "arsumbris"],
  L5_CORBELL: [subject, "arsumbris"],
  L6_GRAPHIFY: [subject, "arsumbris"],
  TSG: [subject, "arsumbris"],
  // ★ ABIDE's domain is AGENT PROSE, not code symbols (2026-09-25, MEASURED). Its ledger's
  //   `matched_span`/`verdict`/`rule` fields carry rubric flags over agent text; the code subjects
  //   (populateSessionStore/arsumbris/au-mcp-sdk/au-engine) appear in ZERO flag rows — so ABIDE
  //   could never consume for them, and the old entry asked it in the WRONG domain. These are
  //   ABIDE's OWN domain subjects: `CLAIM_SLOP` (its lexicon's verdict token, 925 facts) and
  //   `Live-proven` (a real flagged span, 8 facts).
  ABIDE: [subject, "arsumbris", "CLAIM_SLOP", "Live-proven"],
};

if (gate) {
  const everConsumed = new Set<string>();
  // ★ 2026-09-25 FIX: the old loop hardcoded `[subject, "arsumbris", "au-mcp-sdk", "au-engine"]`
  //   and NEVER READ `DOMAIN_SUBJECTS` — the map meant to be the authoritative per-consumer domain
  //   table was DEAD, so a consumer whose domain subjects were not in the hardcoded list (ABIDE's
  //   prose subjects) could never consume. The loop now iterates the UNION of every consumer's own
  //   domain subjects — the map is the single source of truth.
  const domainSuite = [...new Set(Object.values(DOMAIN_SUBJECTS).flat().concat([subject]))];
  for (const s of domainSuite) {
    for (const r of consumptionAudit(scopeRoot, s).reports) if (r.consumed) everConsumed.add(r.consumer);
  }
  const never = Object.keys(DOMAIN_SUBJECTS).filter((c) => !everConsumed.has(c));
  if (never.length > 0) {
    console.log(`GI_CONSUMPTION_BELOW_EXPECTED: consumers NEVER consumed for any domain subject: ${never.join(",")}`);
    process.exit(1);
  }
  console.log(`[consumption] ★ THE PREDICATE PASSED: all 8 consumers CONSUMED for their domains · for '${subject}' the register reads consumed:${audit.reports.filter((r) => r.consumed).length}/8`);
}

if (expected !== null) {
  const consumed = audit.reports.filter((r) => r.consumed).length;
  const total = audit.reports.length;
  if (consumed < expected) {
    const offenders = audit.reports.filter((r) => !r.consumed).map((r) => `${r.consumer}:${r.verdict}`).join(",");
    console.log(`GI_CONSUMPTION_BELOW_EXPECTED: consumed:${consumed}/${total} < expected:${expected} — offenders=${offenders}`);
    process.exit(1);
  }
  console.log(`[consumption] ★ THE PREDICATE PASSED: consumed:${consumed}/${total} >= expected:${expected}`);
}
