import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { closeGiRegistry } from "../src/omp/gi-registry.ts";
import { openSessionStore } from "../src/omp/store-open.ts";
import { populateSessionStore } from "../src/omp/populate.ts";
import { blastRadius, countTypedEdges, countTypedNodes, whoCalls, wouldBreak } from "../src/omp/typed-write.ts";
import { parseExports } from "../src/omp/gate-middleware.ts";

const ROOT = "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/fork-v143/live-tree";

afterEach(() => {
  closeGiRegistry();
  delete process.env.GI_OMP_DB_DIR;
});

describe("GI populate + verbs accuracy (frozen 2026-09-14)", () => {
  test("parseExports recall is 1.000 on the 238-file tree", () => {
    const files: string[] = [];
    const walk = (d: string): void => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = d + "/" + e.name;
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith(".ts") && !e.name.endsWith(".d.ts")) files.push(p);
      }
    };
    walk(ROOT);
    expect(files.length).toBe(238);
    let got = 0;
    let missed = 0;
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      const names = parseExports(src);
      got += names.length;
      const re = /export\s+(?:async\s+)?(?:function|const|class|let|var|type|interface|enum)\s+(\w+)/g;
      const braces = /export\s*\{([^}]*)\}/g;
      let m: RegExpExecArray | null;
      const truth = new Set<string>();
      while ((m = re.exec(src))) truth.add(m[1]);
      while ((m = braces.exec(src))) {
        for (const s of m[1].split(",")) {
          const t = s.trim().split(" as ").pop()!.trim();
          if (/^\w+$/.test(t)) truth.add(t);
        }
      }
      if (/export\s+default\b/.test(src)) truth.add("default");
      for (const t of truth) if (!names.includes(t)) missed++;
    }
    expect(missed).toBe(0);
    expect(got).toBe(1637);
  });

  test("populate on the live tree: substrate-aware frozen counts", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gi-pop-"));
    process.env.GI_OMP_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "gi-reg-"));
    const o = openSessionStore({ sessionId: "ses_POPULATE000000000000001", scopeRoot: tmp });
    const r = populateSessionStore(o.storePath, ROOT, "populate-frozen");
    // W1 substrate law: corbell (warm checkout) is PRIMARY; the regex indexer is
    // the NAMED fallback. Frozen counts per substrate (2026-09-14).
    if (r.substrate === "corbell") {
      expect(r.filesIndexed).toBe(0);
      expect(r.nodes).toBe(2086);
      expect(r.edges).toBe(9386);
      expect(countTypedNodes(o.storePath)).toBe(2086);
      expect(countTypedEdges(o.storePath)).toBe(9386);
    } else {
      expect(r.filesIndexed).toBe(238);
      expect(r.nodes).toBe(2035);
      expect(r.edges).toBe(1857);
      expect(countTypedNodes(o.storePath)).toBe(2035);
      expect(countTypedEdges(o.storePath)).toBe(1857);
      expect(r.fallbackReason ?? "").toContain("CORBELL_NOT_WARM");
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("who-calls runQuery finds real importers (substrate-aware)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gi-pop-"));
    process.env.GI_OMP_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "gi-reg-"));
    const o = openSessionStore({ sessionId: "ses_POPULATE000000000000002", scopeRoot: tmp });
    const r = populateSessionStore(o.storePath, ROOT, "populate-frozen2");
    const q = whoCalls(o.storePath, "runQuery");
    if (r.substrate === "corbell") {
      // parse-grade callers: qualified method ids; flow_step edges map to
      // 'traces-to' and are NOT callers (the fork's who-calls reads calls+imports
      // only — same here). runQuery's real callers: execute, detectR17Drift.
      expect(q.rows).toBeGreaterThanOrEqual(2);
      expect(q.names.join("\n")).toMatch(/execute|detectR17Drift/);
    } else {
      expect(q.rows).toBeGreaterThanOrEqual(5);
      expect(q.names.join("\n")).toContain("tools/graph-query.ts");
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("blast-radius openStore fans out, would-break is honest", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gi-pop-"));
    process.env.GI_OMP_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "gi-reg-"));
    const o = openSessionStore({ sessionId: "ses_POPULATE000000000000003", scopeRoot: tmp });
    populateSessionStore(o.storePath, ROOT, "populate-frozen3");
    const b = blastRadius(o.storePath, "openStore");
    expect(b.nodes.length).toBeGreaterThanOrEqual(10);
    const w = wouldBreak(o.storePath, "openStore", "openStore(path, opts)");
    expect(w.callers).toBeGreaterThanOrEqual(10);
    expect(w.argsUnknown).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
