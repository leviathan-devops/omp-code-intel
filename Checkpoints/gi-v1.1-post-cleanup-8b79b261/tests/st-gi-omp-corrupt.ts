import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { closeGiRegistry } from "../src/omp/gi-registry.ts";
import { openSessionStore } from "../src/omp/store-open.ts";
import { GiStoreCorruptError, GRAPH_LOAD_BUDGET_BYTES, parseGraphJsonGuarded, whoCalls } from "../src/omp/typed-write.ts";

afterEach(() => {
  closeGiRegistry();
  delete process.env.GI_OMP_DB_DIR;
});

describe("GI_STORE_CORRUPT", () => {
  test("garbage bytes in session store are named, not silent empty", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-corrupt-"));
    fs.writeFileSync(path.join(root, "package.json"), '{"name":"c"}');
    process.env.GI_OMP_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "gi-reg-"));
    const opened = openSessionStore({
      sessionId: "ses_CORRUPTXXXXXXXXXXXXXXX",
      scopeRoot: root,
    });
    fs.writeFileSync(opened.storePath, "NOT A SQLITE DATABASE");
    let caught: GiStoreCorruptError | null = null;
    try {
      whoCalls(opened.storePath, "alpha");
    } catch (e) {
      caught = e as GiStoreCorruptError;
    }
    expect(caught?.code).toBe("GI_STORE_CORRUPT");
    expect(caught?.message).toContain("GI_STORE_CORRUPT");
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(process.env.GI_OMP_DB_DIR, { recursive: true, force: true });
  });

  test("129MiB graph.json fails loud GRAPHIFY_GRAPH_TOO_LARGE, process alive", () => {
    expect(GRAPH_LOAD_BUDGET_BYTES).toBe(128 * 1024 * 1024);
    // V-20 H11: the guard reads the ACTUAL bytes — the size argument is a
    // hint only. A spoofed-small hint on over-budget contents still trips;
    // a spoofed-huge hint on tiny contents parses fine (hint not authoritative).
    const overBudget = "x".repeat(GRAPH_LOAD_BUDGET_BYTES + 1);
    let caught: Error | null = null;
    try {
      parseGraphJsonGuarded(overBudget, 1);
    } catch (e) {
      caught = e as Error;
    }
    expect(caught?.message).toContain("GRAPHIFY_GRAPH_TOO_LARGE");
    expect(parseGraphJsonGuarded('{"nodes":[]}', 129 * 1024 * 1024)).toEqual({ nodes: [] });
  });
});
