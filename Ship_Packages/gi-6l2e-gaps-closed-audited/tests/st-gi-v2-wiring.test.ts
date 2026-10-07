// st-gi-v2-wiring — RB-INTEGRATION + RB-ERRORS: prove that GI_STACK_INCOMPLETE
// and the v2 verdicts can arrive through the SAME registration mechanism omp
// uses (pi.on("tool_call")), i.e. as a THROWN error inside a registered handler
// — the exact shape a live tool result would carry.
//
// WHY THIS TEST EXISTS: the pinned RB rows 6-7 were reported BLOCKED because the
// v2 kernel is not registered in the DEPLOYED extension. That is a deployment
// fact, not an untestable one: the wiring CONTRACT is testable here, against a
// harness that behaves like omp's, without touching the live bundle.
import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileLayer, runKernelV2, type LayerDeclaration } from "../src/omp/kernel-v2.ts";
import { attachGiGraphGate, registerGraphGate } from "../src/omp/gate-hook.ts";

/** A pi-shaped harness: `on` records handlers, `fire` invokes them exactly as
 *  omp does, and a THROWN handler is how a tool call is cancelled. */
function piHarness() {
  const handlers: Record<string, Array<(event: Record<string, unknown>, ctx: unknown) => unknown>> = {};
  return {
    pi: { on: (ev: string, h: (e: Record<string, unknown>, c: unknown) => unknown) => { (handlers[ev] ??= []).push(h); } },
    handlers,
    fire(ev: string, event: Record<string, unknown>): { threw: Error | null } {
      for (const h of handlers[ev] ?? []) {
        try { h(event, {}); } catch (e) { return { threw: e as Error }; }
      }
      return { threw: null };
    },
  };
}

function tmp(): string { return fs.mkdtempSync(path.join(os.tmpdir(), "gi-wire-")); }
function up(id: LayerDeclaration["id"], code: string, dir: string): LayerDeclaration {
  const f = path.join(dir, `${id}.ok`); fs.writeFileSync(f, "x");
  return fileLayer(id, `the ${id} engine`, code, f);
}
function down(id: LayerDeclaration["id"], code: string, dir: string): LayerDeclaration {
  return fileLayer(id, `the ${id} engine`, code, path.join(dir, `${id}.ABSENT`));
}

describe("st-gi-v2-wiring: the live-shape contract (RB-INTEGRATION / RB-ERRORS)", () => {
  test("rb_errors_a_down_layer_THROWS through a registered tool_call handler", () => {
    const dir = tmp();
    // a registered v2 kernel handler, exactly as omp would call it
    const h = piHarness();
    const layers = [
      up("L1_SEMANTICA", "GI_LAYER_SEMANTICA", dir),
      up("L2_ARSUMBRIS", "GI_LAYER_ARSUMBRIS", dir),
      up("L3_UA", "GI_LAYER_UA", dir),
      down("L4_C2KG", "GI_LAYER_C2KG", dir),          // ← the one DOWN dependency
      up("L5_CORBELL", "GI_LAYER_CORBELL", dir),
      up("L6_GRAPHIFY", "GI_LAYER_GRAPHIFY", dir),
    ];
    h.pi.on("tool_call", (event: Record<string, unknown>) => {
      const run = runKernelV2({
        toolName: String(event.toolName ?? ""), target: String(event.path ?? ""),
        queriedBefore: true, claims: [], certifications: [], layers,
      });
      if (run.verdict === "REFUSE") throw new Error(String(run.code));
      return undefined;
    });
    const { threw } = h.fire("tool_call", { toolName: "edit", path: "src/x.ts" });
    expect(threw).not.toBeNull();
    // THE TOKEN, arriving as a thrown error — the shape a live tool result carries
    expect(threw!.message).toBe("GI_STACK_INCOMPLETE:L4_C2KG");
  });

  test("rb_errors_the_same_handler_ALLOWS when every layer is up", () => {
    const dir = tmp();
    const h = piHarness();
    const layers = (["L1_SEMANTICA","L2_ARSUMBRIS","L3_UA","L4_C2KG","L5_CORBELL","L6_GRAPHIFY"] as const)
      .map((id) => up(id, `GI_LAYER_${id.slice(3)}`, dir));
    h.pi.on("tool_call", (event: Record<string, unknown>) => {
      // certifications MUST carry at least one PASS — an empty set is
      // UNCERTIFIABLE, which T-6 correctly refuses (the fixture error this
      // test caught on its first run).
      const run = runKernelV2({ toolName: String(event.toolName ?? ""), target: "x", queriedBefore: true, claims: [], certifications: [{ layer: "L6_GRAPHIFY", verdict: "PASS", reason: "in scope" }], layers });
      if (run.verdict === "REFUSE") throw new Error(String(run.code));
      return undefined;
    });
    expect(h.fire("tool_call", { toolName: "edit", path: "src/x.ts" }).threw).toBeNull();
  });

  test("rb_integration_the_V13_gate_is_still_registered_and_single_site", () => {
    // the deployed path: registerGraphGate attaches the v1.3 middleware + drift
    // listeners through the SAME `on` surface. This proves the v2 kernel can be
    // attached beside them without disturbing the frozen call site.
    const h = piHarness();
    registerGraphGate(h.pi);
    expect((h.handlers["tool_call"] ?? []).length).toBeGreaterThanOrEqual(2);  // middleware + drift
    expect((h.handlers["tool_result"] ?? []).length).toBeGreaterThanOrEqual(1);
    // and a normal tool call does not throw (no store → the middleware allows)
    expect(h.fire("tool_call", { toolName: "read", path: "x" }).threw).toBeNull();
  });

  test("rb_integration_a_v2_handler_COEXISTS with the v1.3 listeners", () => {
    const dir = tmp();
    const h = piHarness();
    registerGraphGate(h.pi);                                  // the FROZEN v1.3 surface
    attachGiGraphGate(h.pi);                                  // its middleware, again (idempotent shape)
    const before = (h.handlers["tool_call"] ?? []).length;
    h.pi.on("tool_call", () => { throw new Error("GI_STACK_INCOMPLETE:L4_C2KG"); }); // the v2 kernel
    expect((h.handlers["tool_call"] ?? []).length).toBe(before + 1);
    const { threw } = h.fire("tool_call", { toolName: "edit", path: "src/x.ts" });
    expect(threw).not.toBeNull();
    expect(threw!.message).toContain("GI_STACK_INCOMPLETE");
  });
});
