// scripts/consumption-audit — ★ THE D-1 PROBE, RUNNABLE.
//
// Ask the registry for one subject and print the CONSUMPTION verdict. This is the
// operator-facing answer to "is the 6L+2E actually wired?" — not `up=11/11` (a health
// check on files) but `consumed:N/8` (which consumers actually contributed a fact).
//
// usage: bun scripts/consumption-audit.ts <scopeRoot> [subject]
import { consumptionAudit } from "../src/omp/layer-consumption.ts";

const scopeRoot = process.argv[2] ?? process.cwd();
const subject = process.argv[3] ?? "populateSessionStore";

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
