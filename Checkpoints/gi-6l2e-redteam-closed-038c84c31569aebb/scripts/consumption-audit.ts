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
import { consumptionAudit } from "../src/omp/layer-consumption.ts";

const argv = process.argv.slice(2);
const expectIdx = argv.findIndex((a) => a === "--expect");
const expectArg = expectIdx >= 0 ? Number(argv[expectIdx + 1]) : NaN;
const gate = argv.includes("--gate");
const expected = Number.isFinite(expectArg) ? expectArg : gate ? 8 : null;
// the positional args are the ones that are not the flags (or an --expect value)
const positionals = argv.filter((a, i) => !a.startsWith("--") && !(expectIdx >= 0 && i === expectIdx + 1));

const scopeRoot = positionals[0] ?? process.cwd();
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

// ★ THE PREDICATE: consumed < expected is a LOUD, NONZERO failure — never a green print.
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
