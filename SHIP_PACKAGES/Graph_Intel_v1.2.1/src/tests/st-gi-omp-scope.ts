/**
 * st-gi-omp-scope — W0 gate.
 * REAL modules. Observable paths. Both halves.
 * known-bad MUST refuse: shared project store, global home graph.
 */
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  GiPathError,
  ScopeResolver,
  assertSessionStorePath,
  createGiBinding,
  emptyRegistry,
  forbiddenGlobalHomeGraph,
  forbiddenSharedProjectStore,
  sessionKey,
  sessionStorePath,
} from "../src/scoping/index.ts";

function sandbox(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-omp-scope-"));
  fs.writeFileSync(path.join(dir, "package.json"), '{"name":"gi-scope-fixture"}');
  return dir;
}

describe("W0 session store paths", () => {
  test("two sessionIds same cwd → two /sessions/{sid24}/ stores", () => {
    const root = sandbox();
    const a = sessionStorePath(root, "ses_AAAAAAAAAAAAAAAAAAAAAAAA");
    const b = sessionStorePath(root, "ses_BBBBBBBBBBBBBBBBBBBBBBBB");
    expect(a).not.toBe(b);
    expect(a).toContain("/sessions/");
    expect(b).toContain("/sessions/");
    expect(a.endsWith("store.sqlite")).toBe(true);
    expect(a).toContain(sessionKey("ses_AAAAAAAAAAAAAAAAAAAAAAAA"));
    expect(b).toContain(sessionKey("ses_BBBBBBBBBBBBBBBBBBBBBBBB"));
    assertSessionStorePath(a);
    assertSessionStorePath(b);
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("sessionKey is slice(-24)", () => {
    expect(sessionKey("ses_ABCDEFGHIJKLMNOPQRSTUVWX")).toBe("ABCDEFGHIJKLMNOPQRSTUVWX");
  });
});

describe("W0 known-bad MUST refuse", () => {
  test("SHARED-PROJECT-STORE path refused", () => {
    const root = sandbox();
    const shared = forbiddenSharedProjectStore(root);
    expect(shared.includes("/sessions/")).toBe(false);
    let caught: GiPathError | null = null;
    try {
      assertSessionStorePath(shared);
    } catch (e) {
      caught = e as GiPathError;
    }
    expect(caught).not.toBeNull();
    expect(caught!.code).toBe("GI_SHARED_PROJECT_STORE");
    expect(caught!.message).toContain("GI_SHARED_PROJECT_STORE");
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("GLOBAL-HOME-GRAPH path refused", () => {
    const homeGraph = forbiddenGlobalHomeGraph();
    let caught: GiPathError | null = null;
    try {
      assertSessionStorePath(homeGraph);
    } catch (e) {
      caught = e as GiPathError;
    }
    expect(caught).not.toBeNull();
    expect(caught!.code).toBe("GI_GLOBAL_HOME_GRAPH");
  });

  test("relative scopeRoot denied", () => {
    let caught: GiPathError | null = null;
    try {
      sessionStorePath("not-absolute", "ses_ABCDEFGHIJKLMNOPQRSTUVWX");
    } catch (e) {
      caught = e as GiPathError;
    }
    expect(caught?.code).toBe("GI_PATH_DENIED");
  });
});

describe("W0 GI ecosystem + sticky resolver", () => {
  test("gi-omp binding registers stateDir and prefix", () => {
    const b = createGiBinding(emptyRegistry());
    expect(b.ecosystem).toBe("gi-omp");
    expect(b.stateDir).toBe(".omp/graph-intelligence");
    expect(b.wavePrefix).toBe("gi-");
    expect(b.label).toBe("GI-OMP");
  });

  test("sticky cache never re-derives mid-session", () => {
    const root = sandbox();
    const foreign = sandbox();
    const resolver = new ScopeResolver({
      stateDir: ".omp/graph-intelligence",
      cwd: foreign,
      readActivity: () => [{ workdir: foreign, filepath: path.join(foreign, "package.json") }],
    });
    const first = resolver.resolve("ses_sticky_AAAAAAAAAAAAAAAA", root);
    const second = resolver.resolve("ses_sticky_AAAAAAAAAAAAAAAA");
    expect(first).toBe(root);
    expect(second).toBe(root);
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(foreign, { recursive: true, force: true });
  });
});
