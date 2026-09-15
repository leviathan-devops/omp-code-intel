// ST — the W1 substrate law: corbell is PRIMARY, the regex indexer is the NAMED
// fallback (never silent). Proves: (a) a warm checkout populates the session
// store with the parse-grade rows and reports substrate=corbell; (b) an absent
// checkout falls back WITH the CORBELL_NOT_WARM token + reason; (c) a stale
// checkout (source newer than the store) also falls back loudly.
import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { closeGiRegistry } from "../src/omp/gi-registry.ts";
import { openSessionStore } from "../src/omp/store-open.ts";
import { populateSessionStore } from "../src/omp/populate.ts";
import { CORBELL_CHECKOUT_REL, corbellCheckoutPath } from "../src/omp/populate-corbell.ts";
import { writeCorbellCheckout } from "../src/hunter/graph/store-map.ts";
import { Database } from "bun:sqlite";
import { countTypedEdges, countTypedNodes, namesInStore } from "../src/omp/typed-write.ts";

afterEach(() => {
  closeGiRegistry();
  delete process.env.GI_OMP_DB_DIR;
});

function mkRoot(): { root: string; cleanup: () => void } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-substrate-"));
  process.env.GI_OMP_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "gi-reg-"));
  return {
    root,
    cleanup: () => {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(process.env.GI_OMP_DB_DIR!, { recursive: true, force: true });
    },
  };
}

function plantWarmCheckout(root: string, nodes: Array<{ canonical: string; kind: string; label: string; file: string }>, edges: Array<{ src: string; dst: string; predicate: string; evidence: string }>): string {
  const warmPath = path.join(root, CORBELL_CHECKOUT_REL);
  fs.mkdirSync(path.dirname(warmPath), { recursive: true });
  const { Database } = require("bun:sqlite") as typeof import("bun:sqlite");
  const db = new Database(warmPath, { create: true });
  db.exec(`CREATE TABLE IF NOT EXISTS typed_nodes (id INTEGER PRIMARY KEY, canonical_id TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, file TEXT, line INTEGER, created_run TEXT NOT NULL, superseded_run TEXT)`);
  db.exec(`CREATE TABLE IF NOT EXISTS typed_edges (id INTEGER PRIMARY KEY, src_canonical TEXT NOT NULL, dst_canonical TEXT NOT NULL, predicate TEXT NOT NULL, evidence_quote TEXT NOT NULL, confidence REAL NOT NULL DEFAULT 1.0, created_run TEXT NOT NULL, superseded_run TEXT)`);
  for (const n of nodes) db.run("INSERT INTO typed_nodes (canonical_id, kind, label, file, created_run) VALUES (?,?,?,?,?)", [n.canonical, n.kind, n.label, n.file, "warm"]);
  for (const e of edges) db.run("INSERT INTO typed_edges (src_canonical, dst_canonical, predicate, evidence_quote, confidence, created_run) VALUES (?,?,?,?,1.0,?)", [e.src, e.dst, e.predicate, e.evidence, "warm"]);
  db.close();
  return warmPath;
}

describe("W1 populate substrate law", () => {
  test("warm corbell checkout => substrate=corbell, parse-grade rows land in the session store", () => {
    const { root, cleanup } = mkRoot();
    // A source file OLDER than the checkout (freshness passes).
    fs.writeFileSync(path.join(root, "old.ts"), "export function old() {}\n");
    const before = new Date(Date.now() - 60_000);
    fs.utimesSync(path.join(root, "old.ts"), before, before);
    plantWarmCheckout(root, [
      { canonical: "Function:foo:a.ts", kind: "method", label: "foo", file: "a.ts" },
      { canonical: "Function:bar:b.ts", kind: "method", label: "bar", file: "b.ts" },
    ], [{ src: "Function:bar:b.ts", dst: "Function:foo:a.ts", predicate: "calls", evidence: "b.ts calls foo" }]);
    const o = openSessionStore({ sessionId: "ses_SUBSTRATE000000000001", scopeRoot: root });
    const r = populateSessionStore(o.storePath, root, "run-warm");
    expect(r.substrate).toBe("corbell");
    expect(r.nodes).toBe(2);
    expect(r.edges).toBe(1);
    expect(countTypedNodes(o.storePath)).toBe(2);
    expect(countTypedEdges(o.storePath)).toBe(1);
    expect(namesInStore(o.storePath).sort()).toEqual(["bar", "foo"]);
    cleanup();
  });

  test("absent checkout => NAMED fallback with CORBELL_NOT_WARM:absent", () => {
    const { root, cleanup } = mkRoot();
    fs.writeFileSync(path.join(root, "u.ts"), "export const u = 1;\n");
    const o = openSessionStore({ sessionId: "ses_SUBSTRATE000000000002", scopeRoot: root });
    const r = populateSessionStore(o.storePath, root, "run-fallback");
    expect(r.substrate).toBe("indexer-fallback");
    expect(r.fallbackReason?.startsWith("CORBELL_NOT_WARM:")).toBe(true);
    expect(r.fallbackReason).toContain("absent");
    expect(countTypedNodes(o.storePath)).toBeGreaterThan(0);
    cleanup();
  });

  test("stale checkout => fallback with CORBELL_NOT_WARM:stale", () => {
    const { root, cleanup } = mkRoot();
    plantWarmCheckout(root, [{ canonical: "Function:x:old.ts", kind: "method", label: "x", file: "old.ts" }], []);
    const warmPath = path.join(root, CORBELL_CHECKOUT_REL);
    const old = new Date(Date.now() - 120_000);
    fs.utimesSync(warmPath, old, old);
    fs.writeFileSync(path.join(root, "newer.ts"), "export function newer() {}\n");
    const o = openSessionStore({ sessionId: "ses_SUBSTRATE000000000003", scopeRoot: root });
    const r = populateSessionStore(o.storePath, root, "run-stale");
    expect(r.substrate).toBe("indexer-fallback");
    expect(r.fallbackReason).toBe("CORBELL_NOT_WARM:stale");
    cleanup();
  });
});

// reconcile proof: an existing fallback-populated store is UPGRADED to corbell
// when a warm checkout appears (the ledger + reconcile law), and the who-calls
// response surfaces the substrate on BOTH the fresh and the cached path.
describe("W1 reconcile - stale regex store upgrades when corbell goes warm", () => {
  test("who-calls surfaces substrate always; regex store reconciles to corbell", async () => {
    const { registerGiOmpTools } = await import("../src/omp/extension.ts");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-reconcile-"));
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src/a.ts"), "export function alpha() { return 1; }\nexport function beta() { alpha(); }\n");
    const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-reconcile-db-"));
    process.env.GI_OMP_DB_DIR = dbDir;
    const exec: Record<string, Function> = {};
    const optionalStr = { optional: () => optionalStr };
    const pi = { zod: { string: () => optionalStr, enum: () => optionalStr, object: () => ({}) }, registerTool: (t: any) => { exec[t.name] = t.execute; } };
    registerGiOmpTools(pi, () => root);
    const ctx = { sessionID: "ses_RECONCILE0000000000001", cwd: root };

    // PASS 1: no warm checkout -> fallback populated, substrate named in response.
    const r1 = await exec["graph-query"]("id", { verb: "who-calls", target: "beta" }, undefined, undefined, ctx);
    expect(r1.content[0].text).toContain("substrate=indexer-fallback");

    // WARM: stage a checkout (fresh) via the real checkout writer.
    const check = corbellCheckoutPath(root);
    writeCorbellCheckout(check, [
      { id: "live-tree::src::alpha", kind: "method", name: "alpha", file: path.join(root, "src/a.ts"), line: 1, lineage: "CODE_DERIVED" as any, source: "test" },
      { id: "live-tree::src::beta", kind: "method", name: "beta", file: path.join(root, "src/a.ts"), line: 2, lineage: "CODE_DERIVED" as any, source: "test" },
    ] as any, [
      { sourceId: "live-tree::src::beta", targetId: "live-tree::src::alpha", kind: "calls", lineage: "CODE_DERIVED" as any },
    ] as any, { runTag: "reconcile-fixture" });

    // PASS 2: same session -> reconciles to corbell (upgrade takes effect).
    const r2 = await exec["graph-query"]("id", { verb: "who-calls", target: "alpha" }, undefined, undefined, ctx);
    expect(r2.content[0].text).toContain("substrate=corbell");
    expect(r2.content[0].text).toContain("rows=1");

    // PASS 3: cached path still surfaces the substrate.
    const r3 = await exec["graph-query"]("id", { verb: "who-calls", target: "alpha" }, undefined, undefined, ctx);
    expect(r3.content[0].text).toContain("substrate=corbell");

    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(dbDir, { recursive: true, force: true });
  });
});
