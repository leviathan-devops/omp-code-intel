// st-gi-v2-deps — T-6 THE HARD-DEPENDENCY REGISTER. NO FALLBACKS, ANYWHERE.
// Adversarial-first: the REFUSAL shapes run before the happy path.
import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  HardDependencyError,
  assertRegisterComplete,
  audit,
  buildRegister,
  commandComponent,
  keyComponent,
  pathComponent,
  requireUp,
  type ComponentDecl,
} from "../src/omp/hard-deps.ts";

function tmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gi-deps-"));
}

describe("st-gi-v2-deps: T-6 — no fallback, loud named failure", () => {
  // ── ADVERSARIAL FIRST ────────────────────────────────────────────────────
  test("t6_an_absent_dependency_THROWS_with_its_own_code_never_substitutes", () => {
    const d = pathComponent("X", "layer", "the thing", "GI_LAYER_X", "/nonexistent/definitely/absent");
    expect(() => requireUp(d)).toThrow(HardDependencyError);
    try {
      requireUp(d);
    } catch (e) {
      const h = e as HardDependencyError;
      expect(h.code).toBe("GI_LAYER_X");
      expect(h.component).toBe("X");
      expect(h.dependency).toBe("the thing");
      expect(h.message).toContain("there is no fallback");
    }
  });

  test("t6_an_EMPTY_file_is_DOWN_a_zero_byte_graph_is_not_a_substrate", () => {
    const f = path.join(tmp(), "graph.json");
    fs.writeFileSync(f, "");
    const d = pathComponent("L6_GRAPHIFY", "layer", "graphify graph.json", "GI_LAYER_GRAPHIFY", f, { mustBeFile: true });
    const r = audit([d]);
    expect(r.ok).toBe(false);
    expect(r.down[0]!.evidence).toContain("EMPTY");
  });

  test("t6_a_directory_where_a_FILE_is_required_is_DOWN", () => {
    const d = path.join(tmp(), "dir-not-file");
    fs.mkdirSync(d);
    const c = pathComponent("L6_GRAPHIFY", "layer", "graphify graph.json", "GI_LAYER_GRAPHIFY", d, { mustBeFile: true });
    expect(audit([c]).ok).toBe(false);
    expect(audit([c]).down[0]!.evidence).toContain("not a regular file");
  });

  test("t6_a_probe_that_THROWS_is_DOWN_never_up", () => {
    const bomb: ComponentDecl = {
      id: "BOMB", cls: "kernel", dependency: "reality", errorCode: "GI_BOMB",
      probe: () => { throw new Error("connection refused"); },
    };
    const r = audit([bomb]);
    expect(r.ok).toBe(false);
    expect(r.down[0]!.evidence).toContain("connection refused");
  });

  test("t6_the_audit_names_the_FIRST_refusal_in_declaration_order", () => {
    const a = pathComponent("A", "layer", "dep a", "GI_A", "/absent/a");
    const b = pathComponent("B", "layer", "dep b", "GI_B", "/absent/b");
    const r = audit([a, b]);
    expect(r.firstCode).toBe("GI_A");
    expect(r.down.map((d) => d.id)).toEqual(["A", "B"]);
  });

  // ── the register cannot be under-declared ────────────────────────────────
  test("t6_a_blank_dependency_is_REFUSED_registry_incomplete", () => {
    const bad: ComponentDecl[] = [
      { id: "X", cls: "layer", dependency: "", errorCode: "GI_X", probe: () => ({ up: true, evidence: "" }) },
    ];
    expect(() => assertRegisterComplete(bad)).toThrow(/REGISTER_INCOMPLETE/);
    const bad2: ComponentDecl[] = [
      { id: "Y", cls: "layer", dependency: "something", errorCode: "  ", probe: () => ({ up: true, evidence: "" }) },
    ];
    expect(() => assertRegisterComplete(bad2)).toThrow(/REGISTER_INCOMPLETE/);
  });

  // ── the real register ────────────────────────────────────────────────────
  test("t6_the_v2_register_declares_ALL_six_layers_plus_the_kernel_and_stores", () => {
    const reg = buildRegister({ scopeRoot: tmp() });
    assertRegisterComplete(reg);   // must not throw
    const ids = reg.map((r) => r.id);
    expect(ids).toContain("L1_SEMANTICA");
    expect(ids).toContain("L2_ARSUMBRIS");
    expect(ids).toContain("L3_UA");
    expect(ids).toContain("L4_C2KG");
    expect(ids).toContain("L5_CORBELL");
    expect(ids).toContain("L6_GRAPHIFY");
    expect(ids).toContain("TSG");
    expect(ids).toContain("ABIDE");
    expect(ids).toContain("JEV");
    expect(ids).toContain("RSI_STORE");
    expect(reg.filter((r) => r.cls === "layer")).toHaveLength(6);
    // every code is a distinct, named token
    const codes = reg.map((r) => r.errorCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  test("t6_a_cold_scope_reports_EVERY_layer_down_with_a_reason", () => {
    const reg = buildRegister({ scopeRoot: tmp(), env: {} });
    const r = audit(reg);
    expect(r.ok).toBe(false);
    // on a cold scope, all six layers are down and each states WHY
    for (const d of r.down) {
      expect(d.evidence.length).toBeGreaterThan(0);
      expect(d.errorCode.startsWith("GI_")).toBe(true);
    }
    const layersDown = r.down.filter((d) => d.cls === "layer").map((d) => d.id);
    expect(layersDown).toHaveLength(6);
    expect(r.firstCode).toBe("GI_LAYER_SEMANTICA");
  });

  test("t6_jevs_absence_is_named_and_NOTHING_about_its_value_is_exposed", () => {
    const absent = keyComponent("JEV", "kernel", "the TypeSafe API key", "GI_JEV_DOWN", "TYPESAFE_AI_API_KEY", {});
    expect(audit([absent]).down[0]!.evidence).toBe("TYPESAFE_AI_API_KEY ABSENT");
    // present: the evidence carries a LENGTH, never the value
    const present = keyComponent("JEV", "kernel", "the TypeSafe API key", "GI_JEV_DOWN", "TYPESAFE_AI_API_KEY", { TYPESAFE_AI_API_KEY: "sk-secret-value-1234" });
    const ev = audit([present]).entries[0]!.evidence;
    expect(ev).toContain("present");
    expect(ev).not.toContain("sk-secret-value-1234");   // the secrets law
  });

  test("t6_a_command_dependency_reports_its_resolved_path_or_absence", () => {
    const found = commandComponent("TSG", "kernel", "the tsg binary", "GI_ENFORCE_TSG", () => "/usr/local/bin/tsg");
    expect(audit([found]).entries[0]!.evidence).toBe("/usr/local/bin/tsg");
    const missing = commandComponent("TSG", "kernel", "the tsg binary", "GI_ENFORCE_TSG", () => null);
    const r = audit([missing]);
    expect(r.ok).toBe(false);
    expect(r.down[0]!.evidence).toBe("not found on PATH");
  });

  test("t6_requireUp_is_SILENT_when_the_dependency_is_present", () => {
    const f = path.join(tmp(), "present.json");
    fs.writeFileSync(f, "{}");
    const d = pathComponent("OK", "layer", "a real file", "GI_OK", f, { mustBeFile: true });
    expect(() => requireUp(d)).not.toThrow();
  });
});
