// SC-8 driver: ONE firing through the FULL v2 path.
// HONESTY: the JUDGE is a stub (no TypeSafe key on this host). The MACHINERY —
// kernel stages, the detectors, the two-layer enforcement, the reflex write,
// the ledger, the supersede — is the REAL code path. What is substituted is the
// model, at the declared DI seam, and this comment says so.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { DEFAULT_DETECTORS, fileLayer, runKernelV2, type LayerDeclaration } from "../../../src/omp/kernel-v2.ts";
import { RsiStore, deriveTier, DEFAULT_THRESHOLDS } from "../../../src/omp/rsi.ts";
import { runCloseLayer, runWorkLayer, type EnforcementDeps, type Judge, type LoadUnit } from "../../../src/omp/enforcement.ts";
import { assertRegisterComplete, pathComponent, type ComponentDecl } from "../../../src/omp/hard-deps.ts";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sc8-"));
const regFor = (id: string, code: string): ComponentDecl => {
  const f = path.join(dir, `${id}.ok`); fs.writeFileSync(f, "x");
  return pathComponent(id, "kernel", `the ${id} engine`, code, f);
};
const register: ComponentDecl[] = [regFor("TSG", "GI_ENFORCE_TSG"), regFor("ABIDE", "GI_ENFORCE_ABIDE"), regFor("JEV", "GI_JEV_DOWN")];
assertRegisterComplete(register);

const layers: LayerDeclaration[] = [fileLayer("L6_GRAPHIFY", "graphify graph.json", "GI_LAYER_GRAPHIFY", path.join(dir, "g.json"))];
fs.writeFileSync(path.join(dir, "g.json"), "{}");

// the STUB model (declared): answers what it is asked
const stubJudge: Judge = { evaluate: async (_s, qs) => qs.map((q) => ({ id: q.id, probability: 0.9 })) };
// SC-8 FIX (the two-engine disagreement): the OLD stub returned one span
// UNCONDITIONALLY, so the kernel (which saw spans=0 on the claim) and the close
// layer (which was handed a span anyway) disagreed — the two layers were fed
// DIFFERENT EVIDENCE by MY fixture. The load unit is now HONEST: it returns a
// span only when the evidence for that claim is actually in the scope. Both
// layers then read the SAME evidence, and the driver ASSERTS they agree.
const SCOPE_EVIDENCE: Record<string, string> = {
  "tests pass": "bun test -> 195 pass / 0 fail (battery.log:1)",
};
const stubLoad: LoadUnit = {
  retrieve: async (query: string) => {
    const hit = Object.entries(SCOPE_EVIDENCE).find(([k]) => query.toLowerCase().includes(k));
    return hit === undefined
      ? { spans: [], coverage: "complete" as const }
      : { spans: [{ quote: hit[1], source: "battery.log:1" }], coverage: "complete" as const };
  },
};
const deps: EnforcementDeps = { judge: stubJudge, loadUnit: stubLoad, register };

const store = new RsiStore({ storePath: path.join(dir, "rsi.sqlite"), keyPath: path.join(dir, ".kernel.key") });
const REFLEX_ID = "gi:reflex:theatrical:claim-without-span";

async function firing(label: string, claims: Array<{ text: string; spans: number }>, queried: boolean) {
  console.log(`\n──── FIRING: ${label} ────`);
  // 1 the kernel decides
  const run = runKernelV2({
    toolName: "edit", target: "src/x.ts", queriedBefore: queried, claims,
    certifications: [{ layer: "L6_GRAPHIFY", verdict: "PASS", reason: "in scope" }],
    layers, detectors: DEFAULT_DETECTORS,
    record: () => { /* the enforcement sink */ },
  });
  console.log(`  STAGES ${run.stages.map((s) => `${s.stage}:${s.name}=${s.outcome}`).join(" ")}`);
  console.log(`  KERNEL verdict=${run.verdict} class=${run.class} code=${run.code ?? "-"}`);

  // 2 the enforcement kernel acts on the SAME act — and with ONE evidence
  //   source the kernel's span count and the close layer's must AGREE.
  const claimText = claims[0]?.text ?? "";
  const bound = (await stubLoad.retrieve(claimText, ".")).spans.length;
  if (bound !== (claims[0]?.spans ?? 0)) {
    throw new Error(`SC8-FIXTURE-DRIFT: the kernel was told spans=${claims[0]?.spans} but the load unit binds ${bound} — one evidence source, one truth`);
  }
  const work = await runWorkLayer(deps, { diff: "- const a = 1", task: "t", rules: [{ id: "no-unused", instructions: "unused const?", whenTrue: "unused", whenFalse: "used" }] });
  const close = await runCloseLayer(deps, { claim: claimText, scope: "." });
  const kernelRefused = run.verdict === "REFUSE";
  const closeRefused = close.verdict === "REJECT" || close.verdict === "FAIL_CLOSED";
  if (kernelRefused !== closeRefused) {
    throw new Error(`SC8-ENGINES-DISAGREE: kernel=${run.verdict} close=${close.verdict} — the two layers must agree on the same evidence`);
  }
  console.log(`  ENFORCE work=${work.verdict} close=${close.verdict}${close.code ? ` code=${close.code}` : ""}  [engines AGREE: kernel=${run.verdict} close=${close.verdict}]`);

  // 3 the RSI layer RECORDS the firing and adapts
  let live = store.liveIncludingForgedRetirement(REFLEX_ID);
  if (live === null) {
    store.write({ canonicalId: REFLEX_ID, kind: "HOLD", label: claims[0]?.text ?? label, evidenceQuote: run.evidence || run.reason, confidence: 0.5 }, "rsi-1");
    live = store.liveIncludingForgedRetirement(REFLEX_ID);
  }
  store.appendFiring(REFLEX_ID, new Date().toISOString());
  const fired = run.verdict === "REFUSE";
  store.appendOutcome(REFLEX_ID, fired ? "confirmed" : "refuted", fired ? "the claim was unbound — refused" : "the act was permitted");
  const counts = store.recount(REFLEX_ID);
  const d = deriveTier(counts.confirmed, counts.refuted, counts.unresolved, DEFAULT_THRESHOLDS);
  console.log(`  LEDGER confirmed=${counts.confirmed} refuted=${counts.refuted} unresolved=${counts.unresolved}`);
  console.log(`  RSI precision=${d.precision.toFixed(3)} fires=${d.fires} → tier=${d.tier}`);
  return d.tier;
}

// a real firing sequence: the same UNSUPPORTED claim, three times. The claim is
// chosen so its span count is HONEST — nothing in the scope evidences an
// out-of-band migration, so the load unit binds 0 spans and the kernel agrees.
const UNSUPPORTED = "the database migration succeeded";
await firing("unsupported claim, zero spans", [{ text: UNSUPPORTED, spans: 0 }], true);
await firing("unsupported claim, zero spans (again)", [{ text: UNSUPPORTED, spans: 0 }], true);
const tier = await firing("unsupported claim, zero spans (third)", [{ text: UNSUPPORTED, spans: 0 }], true);
// and the OTHER side: a claim the scope DOES evidence — both layers must agree
// that it is NOT refused (the quiet case, proven on the same machinery).
await firing("supported claim, one bound span", [{ text: "tests pass", spans: 1 }], true);

console.log("\n──── THE REFLEX ROW (the ledger showing it) ────");
for (const r of store.allRows()) {
  console.log(`  id=${r.id} kind=${r.kind} conf=${r.confidence.toFixed(3)} run=${r.createdRun} superseded=${r.supersededRun ?? "-"} verified=${store.verify(r)} sig=${r.sig.slice(0, 12)}`);
}
const superseded = store.supersede(REFLEX_ID, "rsi-2");
console.log(`\n──── SUPERSEDE ────`);
console.log(`  new row: ${superseded ? `${superseded.kind} conf=${superseded.confidence.toFixed(3)}` : "(no change)"}`);
console.log(`  live now: ${store.liveIncludingForgedRetirement(REFLEX_ID)?.createdRun}`);
console.log(`  history rows: ${store.allRows().length} (append-only — the old row survives)`);
store.close();
console.log(`\nSC8-EXEC-OK final_tier=${tier}`);
