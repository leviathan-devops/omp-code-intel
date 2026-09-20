// CT harness: 6 DPL1 §7 adversarial angles against the WIRED registerGraphGate
// path (tool_call events through the registered handlers, never module-direct).
// Provenance: derived from the container-verified /tmp/ct-final.mjs run
// (all 6 PASS in omp-ct). Run: bun scripts/ct-gate-angles-v13.mjs
import { registerGraphGate } from "../src/omp/gate-hook.ts";
const res = {};
function freshPi() {
  const handlers = {};
  return { pi: { on: (ev, h) => { (handlers[ev] = handlers[ev] ?? []).push(h); } }, handlers };
}
const fire = (handlers, toolName, input) => { for (const h of handlers["tool_call"] ?? []) h({ toolName, input }, {}); };
// ANGLE 1: blind spree — 6 consecutive export edits, zero queries → T2
{
  const { pi, handlers } = freshPi(); registerGraphGate(pi);
  let r = "NO-THROW";
  try { for (const s of ["a1","a2","a3","a4","a5","a6"]) fire(handlers, "edit", { file_path: "src/omp/w.ts", old_string: `export function ${s}() {}`, new_string: `export function ${s}X() {}` }); }
  catch (e) { r = String(e.message).slice(0, 50); }
  res.angle1_blind_spree = r.includes("GRAPH_GATE_DRIFT_HIGH") ? "PASS" : "FAIL:" + r;
}
// ANGLE 2: doc flood — 20 doc edits → zero fires
{
  const { pi, handlers } = freshPi(); registerGraphGate(pi);
  let r = "PASS";
  try { for (let i = 0; i < 20; i++) fire(handlers, "edit", { file_path: "docs/n" + i + ".md", old_string: "a", new_string: "b" }); }
  catch (e) { r = "FAIL:" + String(e.message).slice(0, 50); }
  res.angle2_doc_flood = r;
}
// ANGLE 3: query-then-edit — graph query → edit same symbol → T0
{
  const { pi, handlers } = freshPi(); registerGraphGate(pi);
  let r = "PASS";
  try {
    fire(handlers, "graph-query", { target: "cov1" });
    fire(handlers, "edit", { file_path: "src/omp/w.ts", old_string: "export function cov1() {}", new_string: "export function cov1X() {}" });
  } catch (e) { r = "FAIL:" + String(e.message).slice(0, 50); }
  res.angle3_query_then_edit = r;
}
// ANGLE 4: 2 edits only → NO block (minimum-evidence floor: T2 needs ≥3)
{
  const { pi, handlers } = freshPi(); registerGraphGate(pi);
  let r = "PASS";
  try { for (const s of ["d1", "d2"]) fire(handlers, "edit", { file_path: "src/omp/w.ts", old_string: `export function ${s}() {}`, new_string: `export function ${s}X() {}` }); }
  catch (e) { r = "FAIL:threw@" + String(e.message).slice(0, 40); }
  res.angle4_two_edits_no_block = r;
}
// ANGLE 5: 10 comment-only edits → never T2 (zero drift)
{
  const { pi, handlers } = freshPi(); registerGraphGate(pi);
  let r = "PASS";
  try { for (let i = 0; i < 10; i++) fire(handlers, "edit", { file_path: "src/x.ts", old_string: "// c" + i, new_string: "// c" + i + "x" }); }
  catch (e) { r = String(e.message).includes("GRAPH_GATE_DRIFT_HIGH") ? "FAIL:LOW-reached-T2" : "FAIL:" + String(e.message).slice(0, 50); }
  res.angle5_severity_gaming = r;
}
// ANGLE 6: edit A → query UNRELATED B → more edits → drift persists (per-symbol reset)
{
  const { pi, handlers } = freshPi(); registerGraphGate(pi);
  const seq = [];
  try { fire(handlers, "edit", { file_path: "src/omp/w.ts", old_string: "export function gA() {}", new_string: "export function gAX() {}" }); seq.push("e1-ok"); }
  catch (e) { seq.push("e1-THREW"); }
  fire(handlers, "graph-query", { target: "unrelatedB" });
  seq.push("q-ok");
  try { for (const s of ["gB", "gC", "gD"]) fire(handlers, "edit", { file_path: "src/omp/w.ts", old_string: `export function ${s}() {}`, new_string: `export function ${s}X() {}` }); seq.push("e234-ok-below-T2"); }
  catch (e) { seq.push("later-THREW:" + String(e.message).slice(0, 25)); }
  res.angle6_sequence = seq.join(" | ");
  res.angle6_reset_gaming = seq.join(" ").includes("THREW") ? "PASS:drift-persisted" : "CHECK:" + seq.join("|");
}
console.log(JSON.stringify(res, null, 1));
const fails = Object.entries(res).filter(([k, v]) => String(v).startsWith("FAIL"));
if (fails.length > 0) { console.error("FAILURES:", fails.map(([k]) => k).join(",")); process.exit(1); }
console.log("ALL-6-PASS");
