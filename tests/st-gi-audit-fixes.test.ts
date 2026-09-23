// st-gi-audit-fixes — THE REGRESSION PINS for the 2026-09-23 code-audit's 2 HIGH findings.
//
// The audit (ocr, GO lane, session 2bced5f8) returned: high=2 · medium=4 · low=7.
// BOTH HIGH findings were adjudicated REAL (not probe errors) and fixed. These tests pin them
// so they cannot silently return.
//
// ★ ADVERSARIAL FIRST — each test states the FAILURE it prevents, not the happy path.

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { layerCertifications } from "../src/omp/decision.ts";
import type { LayerFact } from "../src/omp/layer-registry.ts";

const BUNDLE = path.resolve(import.meta.dir, "..", "extensions", "graph-intelligence", "index.js");

/** Mount the DEPLOYED bundle on a fake `pi` and return its tool map (the E-2 surface).
 *  ★ THE DYNAMIC IMPORT IS THE POINT (the rule's own exception: "Test cases that intentionally
 *  exercise module loading boundaries"): BUNDLE is a BUILD ARTIFACT whose path is resolved at
 *  run time, and the test's subject is exactly the deployed module — a static import of a
 *  file that does not exist until the build would fail tsc for every non-built checkout. */
async function mountBundle(): Promise<Map<string, { name: string; execute: (...a: unknown[]) => Promise<{ content: Array<{ text: string }>; details: Record<string, unknown> }> }>> {
  const mod = await import(BUNDLE);
  const tools = new Map<string, { name: string; execute: (...a: unknown[]) => Promise<{ content: Array<{ text: string }>; details: Record<string, unknown> }> }>();
  const zodAny: unknown = new Proxy(function () {}, { get: () => zodAny, apply: () => zodAny });
  const pi = {
    registerTool: (t: unknown) => { const tt = t as { name: string }; tools.set(tt.name, tt as never); },
    on: () => {}, registerCommand: () => {}, registerAgent: () => {}, log: () => {},
    zod: new Proxy({}, { get: () => zodAny }), z: new Proxy({}, { get: () => zodAny }),
  };
  const register = mod.registerGiOmpTools as unknown as (
    p: unknown,
    cwdOf: (ctx?: { cwd?: string }) => string,
  ) => string[];
  register(pi, (ctx) => ctx?.cwd ?? process.cwd());
  return tools;
}

describe("st-gi-audit-fixes: the 2026-09-23 code-audit's HIGH findings", () => {
  test("AUDIT-HIGH-1: only LAYER facts certify a layer — a kernel fact (TSG/ABIDE) is filtered", () => {
    // THE FAILURE THIS PREVENTS: `factsFor` returns facts from EVERY consumer, including the
    // 2 KERNEL consumers (TSG, ABIDE) which are NOT LayerIds. The first version cast
    // `f.consumer as LayerId` for all of them → a certification carrying an INVALID layer.
    const facts: LayerFact[] = [
      { consumer: "L5_CORBELL", rung: "settlement", subject: "s", value: 1, source: "the corbell store" },
      { consumer: "TSG", rung: "meaning", subject: "s", value: 2, source: "the tsg verdict" },
      { consumer: "ABIDE", rung: "repair", subject: "s", value: 3, source: "the abide repair" },
      { consumer: "L1_SEMANTICA", rung: "decision", subject: "s", value: 4, source: "the semantica kg" },
    ];
    const certs = layerCertifications(facts);
    // exactly the 2 layers survive; the 2 kernels are dropped
    expect(certs.length).toBe(2);
    expect(certs.map((c) => c.layer).sort()).toEqual(["L1_SEMANTICA", "L5_CORBELL"]);
    // ★ NO certification may carry a non-layer id — the invalid-cast class
    const LAYER_IDS = ["L1_SEMANTICA", "L2_ARSUMBRIS", "L3_UA", "L4_C2KG", "L5_CORBELL", "L6_GRAPHIFY"];
    for (const c of certs) expect(LAYER_IDS).toContain(c.layer);
    // and the reason is the fact's OWN anchor (the audit trail)
    expect(certs.find((c) => c.layer === "L5_CORBELL")!.reason).toBe("the corbell store");
  });

  test("AUDIT-HIGH-2: a FAILED wipe audit is a LOUD failure, never `GI_CLEARED` with ok:true", async () => {
    // THE FAILURE THIS PREVENTS: the tool returned `GI_CLEARED` with `ok: true` when the audit
    // had FAILED (wipeAudited:false) — a false success. The remedy: `WIPE_AUDIT_FAILED`+ok:false.
    const tools = await mountBundle();
    const probe = tools.get("graph-probe");
    expect(probe).toBeDefined();
    const prev = process.env.GI_OMP_ALLOW_CLEAR;
    process.env.GI_OMP_ALLOW_CLEAR = "1";   // clear the env gate so the audit path is reached
    try {
      // a cwd that CANNOT exist → confineTargetPath fails → audited:false
      const ghost = path.join(os.tmpdir(), `gi-audit-ghost-${Date.now()}`, "nope");
      const res = await probe!.execute("t", { action: "wipe" }, undefined, undefined, { cwd: ghost });
      const text = res.content[0].text;
      // ★ the false-success token must be ABSENT when the audit failed
      expect(text).toContain("WIPE_AUDIT_FAILED");
      expect(res.details.ok).toBe(false);
      expect(res.details.token ?? "").not.toBe("GI_CLEARED");
      expect(text).not.toContain("GI_CLEARED");
    } finally {
      if (prev === undefined) delete process.env.GI_OMP_ALLOW_CLEAR; else process.env.GI_OMP_ALLOW_CLEAR = prev;
    }
  });

  test("AUDIT-HIGH-2b: the wipe path actually CALLS clearGiRegistry (it was a DEAD import)", () => {
    // THE FAILURE THIS PREVENTS: `clearGiRegistry` was imported into extension.ts but NEVER
    // CALLED — the tool reported `GI_CLEARED` without ever clearing. This pin asserts the call
    // site EXISTS in the source (a source-anchor check; the runtime behavior needs the env gate
    // + a real registry, exercised in the container).
    const src = fs.readFileSync(path.resolve(import.meta.dir, "..", "src", "omp", "extension.ts"), "utf8");
    expect(src).toContain("clearGiRegistry();");
    // and the false-success shape is gone
    expect(src).not.toContain('textResult("GI_CLEARED\\n" + wipeAudit.text, { ok: true');
  });
});
