import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { closeGiRegistry } from "../src/omp/gi-registry.ts";
import { GiScopeError, openSessionStore } from "../src/omp/store-open.ts";

function sandbox(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-omp-refuse-"));
  fs.writeFileSync(path.join(dir, "package.json"), '{"name":"gi-refuse"}');
  return dir;
}

afterEach(() => {
  closeGiRegistry();
});

describe("W1 GI_SCOPE_REFUSED", () => {
  test("caller B cannot open session A's store", () => {
    const root = sandbox();
    process.env.GI_OMP_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "gi-reg-"));
    const a = openSessionStore({
      sessionId: "ses_AAAAAAAAAAAAAAAAAAAAAAAA",
      scopeRoot: root,
    });
    expect(a.storePath).toContain("/sessions/");
    let caught: GiScopeError | null = null;
    try {
      openSessionStore({
        sessionId: "ses_AAAAAAAAAAAAAAAAAAAAAAAA",
        scopeRoot: root,
        callerSessionId: "ses_BBBBBBBBBBBBBBBBBBBBBBBB",
      });
    } catch (e) {
      caught = e as GiScopeError;
    }
    expect(caught).not.toBeNull();
    expect(caught!.code).toBe("GI_SCOPE_REFUSED");
    expect(caught!.message).toContain("GI_SCOPE_REFUSED");
    expect(caught!.message).toContain(a.ownerKey);
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(process.env.GI_OMP_DB_DIR, { recursive: true, force: true });
    delete process.env.GI_OMP_DB_DIR;
  });

  test("same session re-open is allowed", () => {
    const root = sandbox();
    process.env.GI_OMP_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "gi-reg-"));
    const first = openSessionStore({
      sessionId: "ses_CCCCCCCCCCCCCCCCCCCCCCCC",
      scopeRoot: root,
    });
    const second = openSessionStore({
      sessionId: "ses_CCCCCCCCCCCCCCCCCCCCCCCC",
      scopeRoot: root,
    });
    expect(second.storePath).toBe(first.storePath);
    expect(second.created).toBe(false);
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(process.env.GI_OMP_DB_DIR, { recursive: true, force: true });
    delete process.env.GI_OMP_DB_DIR;
  });
});
