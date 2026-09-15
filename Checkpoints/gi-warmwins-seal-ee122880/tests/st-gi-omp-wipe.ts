import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  GiClearError,
  clearGiRegistry,
  closeGiRegistry,
  giRegistryPath,
  giSessionCount,
  openGiRegistry,
  upsertGiSession,
} from "../src/omp/gi-registry.ts";

afterEach(() => {
  closeGiRegistry();
  delete process.env.GI_OMP_ALLOW_CLEAR;
  delete process.env.GI_OMP_DB_DIR;
});

describe("W1 wipe MUST refuse", () => {
  test("clear without GI_OMP_ALLOW_CLEAR refuses; row count unchanged", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-wipe-"));
    process.env.GI_OMP_DB_DIR = dir;
    delete process.env.GI_OMP_ALLOW_CLEAR;
    openGiRegistry();
    upsertGiSession({
      sessionId: "ABCDEFGHIJKLMNOPQRSTUVWX",
      scopeRoot: dir,
      storePath: path.join(dir, "sessions", "ABCDEFGHIJKLMNOPQRSTUVWX", "store.sqlite"),
    });
    const before = giSessionCount();
    expect(before).toBe(1);
    let caught: GiClearError | null = null;
    try {
      clearGiRegistry();
    } catch (e) {
      caught = e as GiClearError;
    }
    expect(caught?.code).toBe("GI_CLEAR_REFUSED");
    expect(giSessionCount()).toBe(1);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("BUN_TEST registry path is not ~/.omp/graph-intelligence/registry.sqlite", () => {
    delete process.env.GI_OMP_DB_DIR;
    const p = giRegistryPath();
    const prod = path.join(os.homedir(), ".omp/graph-intelligence/registry.sqlite");
    expect(p).not.toBe(prod);
    expect(p.includes(os.tmpdir()) || p.includes("gi-omp-registry-test")).toBe(true);
  });
});
