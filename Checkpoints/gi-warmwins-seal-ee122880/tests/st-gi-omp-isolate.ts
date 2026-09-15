import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { closeGiRegistry } from "../src/omp/gi-registry.ts";
import { openSessionStore } from "../src/omp/store-open.ts";
import { countTypedNodes, insertTypedNode, namesInStore } from "../src/omp/typed-write.ts";

afterEach(() => {
  closeGiRegistry();
  delete process.env.GI_OMP_DB_DIR;
});

describe("W3 isolation critic", () => {
  test("concurrent A+B writes do not leak typed_nodes", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-iso-"));
    fs.writeFileSync(path.join(root, "package.json"), '{"name":"iso"}');
    process.env.GI_OMP_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "gi-reg-"));
    const a = openSessionStore({ sessionId: "ses_AAAAAAAAAAAAAAAAAAAAAAAA", scopeRoot: root });
    const b = openSessionStore({ sessionId: "ses_BBBBBBBBBBBBBBBBBBBBBBBB", scopeRoot: root });
    expect(a.storePath).not.toBe(b.storePath);
    insertTypedNode(a.storePath, { canonical: "Function:alpha:" + a.storePath, name: "alpha", file: "a.ts" });
    insertTypedNode(b.storePath, { canonical: "Function:beta:" + b.storePath, name: "beta", file: "b.ts" });
    expect(countTypedNodes(a.storePath)).toBe(1);
    expect(countTypedNodes(b.storePath)).toBe(1);
    expect(namesInStore(a.storePath)).toEqual(["alpha"]);
    expect(namesInStore(b.storePath)).toEqual(["beta"]);
    expect(namesInStore(a.storePath).includes("beta")).toBe(false);
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(process.env.GI_OMP_DB_DIR, { recursive: true, force: true });
  });
});
