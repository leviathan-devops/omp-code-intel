// ★ W2 (the live half) — drive the 4 varied acts through the KERNEL LIBRARY (the tool hardcodes
//   queriedBefore:false — F-122), writing to the OPERATOR'S live ledger.
import { decideFromRegistry } from "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/src/omp/decision.ts";
import { FireLedger } from "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/src/omp/fire-ledger.ts";
const R = "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence";
// ★ THE SAME SINK the extension builds (extension.ts ~:704)
const ledger = new FireLedger(`${R}/.omp/graph-intelligence/fire-decisions.db`);
const sink = (run: { verdict: string; class: string; reason: string; evidence: string }): void => {
  const band = run.verdict === "REFUSE" || run.verdict === "ABORT" ? "act" : run.verdict === "STEER" ? "escalate" : "ignore";
  const action = band === "act" ? "FIRE" : band === "escalate" ? "ESCALATE" : "IGNORE";
  ledger.append({ at: new Date().toISOString(), ruleId: `kernel-v2:${run.class}:${run.verdict}`, cls: run.class,
    questionVersion: "kernel-v2", probability: band === "act" ? 1 : band === "escalate" ? 0.5 : 0, band, action,
    policyName: `kernel-v2.${run.class}`, actThreshold: 0.5, flagThreshold: 0.25,
    stateHash: (run.reason || "kernel-v2").slice(0, 16), target: run.evidence.slice(0, 40) || "t",
    costUsd: 0, laterTruth: "unresolved" });
};
const acts: Array<[string, Parameters<typeof decideFromRegistry>[2]]> = [
  ["ACT-DUMB",        { toolName: "edit",   target: "evidence",            queriedBefore: false }],
  ["ACT-THEATRICAL",  { toolName: "write",  target: "evidence",            queriedBefore: true, claims: [{ text: "verified", spans: 0 }] }],
  ["ACT-DESTRUCTIVE", { toolName: "delete", target: "zzzNoLayerKnows",     queriedBefore: true, claims: [] }],
  ["ACT-GROUNDED",    { toolName: "read",   target: "evidence",            queriedBefore: true, claims: [{ text: "read the code", spans: 3 }] }],
];
for (const [name, act] of acts) {
  const ev = decideFromRegistry(R, act.target, act, sink);
  console.log(`  ${name}: verdict=${ev.run.verdict} class=${ev.run.class} code=${ev.run.code ?? "none"}`);
}
ledger.close?.();
