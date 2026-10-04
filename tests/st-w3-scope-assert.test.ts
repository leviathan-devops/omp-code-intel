// st-w3-scope-assert — GI-KERNEL-V2.2 W3 CONTENT SCOPING (GI_KERNEL_V2.2_REBUILD_SPEC §3 W3).
// The ghost-store class (F-124/D-2): a store built for tree A must never be
// served as describing tree B. Writer stamps build_root; readers refuse LOUD.
import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { sessionStorePath } from "../src/scoping/gi-session-path.ts";
import { setBuildRoot, getMeta } from "../src/omp/typed-write.ts";
import { assertStoreScope, GiStoreScopeError } from "../src/omp/store-open.ts";
import { ScopeResolver, scoreProjectRoots } from "../src/scoping/scope-resolver.ts";

let seq = 1000;
function tmpStore(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w3-"));
  seq += 1;
  return sessionStorePath(d, `w3scope${String(seq).padStart(4, "0")}`);
}

describe("st-w3-scope-assert: W3 content scoping", () => {
  test("test_store_build_root_written", () => {
    const dirA = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w3-A-"));
    fs.writeFileSync(path.join(dirA, "a.ts"), "export const a = 1;\n");
    const store = tmpStore();
    const stamped = setBuildRoot(store, dirA, "structural");
    const real = fs.realpathSync(dirA);
    expect(stamped.buildRoot).toBe(real);
    expect(getMeta(store, "build_root")).toBe(real);
    const sha = getMeta(store, "build_root_sha");
    expect(sha).not.toBeNull();
    expect(sha!.length).toBe(64);
    expect(getMeta(store, "builder")).toBe("structural");
    expect(getMeta(store, "built_at")).not.toBeNull();
    // same-scope read passes
    const ok = assertStoreScope(store, dirA);
    expect(ok.foreign).toBe(false);
    expect(ok.buildRoot).toBe(real);
  });

  test("test_store_scope_mismatch_refuses", () => {
    const dirA = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w3-AA-"));
    const dirB = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w3-BB-"));
    fs.writeFileSync(path.join(dirA, "a.ts"), "export const a = 1;\n");
    fs.writeFileSync(path.join(dirB, "b.ts"), "export const b = 2;\n");
    const store = tmpStore();
    setBuildRoot(store, dirA, "corbell");
    const realA = fs.realpathSync(dirA);
    const realB = fs.realpathSync(dirB);
    let msg = "";
    try {
      assertStoreScope(store, dirB);
    } catch (e) {
      msg = e instanceof Error ? e.message : String(e);
    }
    expect(msg).toContain("GI_STORE_SCOPE_MISMATCH");
    expect(msg).toContain(realA);
    expect(msg).toContain(realB);
    // error class carries the code
    let err: unknown = null;
    try {
      assertStoreScope(store, dirB);
    } catch (e) {
      err = e;
    }
    expect(err instanceof GiStoreScopeError).toBe(true);
    // inspection bypass returns foreign:true instead of throwing
    const bypass = assertStoreScope(store, dirB, { allowForeignStore: true });
    expect(bypass.foreign).toBe(true);
    expect(bypass.buildRoot).toBe(realA);
  });

  test("test_scope_tiers_no_drift", () => {
    // TIER1: explicit projectToken pins (existsSync-gated)
    const proj = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w3-T1-"));
    const r1 = new ScopeResolver({ stateDir: ".trident", readActivity: () => [] });
    expect(r1.resolve("sess-tier1", proj)).toBe(proj);
    // TIER2: sticky session cache — a re-resolve with hostile activity keeps the pin
    const hostile = () => [{ workdir: "/tmp/definitely-not-the-project-xyz" }];
    // (cache lives per-instance; emulate TIER2 by resolving twice on one instance)
    const r2 = new ScopeResolver({ stateDir: ".trident", readActivity: hostile as never });
    const first = r2.resolve("sess-sticky", proj);
    expect(first).toBe(proj);
    const second = r2.resolve("sess-sticky");
    expect(second).toBe(proj);
    // TIER3: auto-detect — session file activity → workdir anchor ×2 → root scorer
    const root3 = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w3-T3-"));
    fs.writeFileSync(path.join(root3, "package.json"), "{}\n");
    fs.mkdirSync(path.join(root3, "src"), { recursive: true });
    fs.writeFileSync(path.join(root3, "src", "x.ts"), "export const x = 1;\n");
    const act = () => [
      { workdir: root3 },
      { filepath: path.join(root3, "src", "x.ts") },
    ];
    const r3 = new ScopeResolver({ stateDir: ".trident", readActivity: act });
    expect(r3.resolve("sess-auto")).toBe(root3);
    // TIER4: cwd last resort — no token, no cache, no activity
    const cwd = process.cwd();
    const r4 = new ScopeResolver({ stateDir: ".trident", readActivity: () => [] });
    expect(r4.resolve("sess-cwd-fresh")).toBe(cwd);
    // root scorer: state-dir dominance + path-as-root still hold
    const scored = scoreProjectRoots(new Map([[path.join(root3, "src", "x.ts"), 1]]), ".trident");
    expect(scored).toBe(root3);
  });
});
