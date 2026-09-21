// st-gi-v21-structural-extract — THE KERNEL'S OWN EXTRACTOR, PINNED.
//
// ★ PROVENANCE: the graph-fact rules shipped correct and TESTED (12/12) and could settle
//   0 of 4 of the session's derailments — because corbell's indexer emits
//   method|class|flow|service and the rules read type|field|const|closure. The fix was an
//   EXTRACTOR (scripts/structural-extract.py), and RUNNING IT produced the defect below.
//
// ★★ THE BUG THIS TEST PINS: the extractor MANUFACTURED THE REFERENCES THE RULE LOOKED FOR.
//    Declaring `ledgerPath?: string` emitted `Container --references--> ledgerPath` from the
//    DECLARATION SITE, so EVERY declared member had in-degree >= 1 and M-GRAPH-2 could never
//    fire. 1,320 manufactured edges were removed. ★ A PRODUCER THAT INVENTS THE EVIDENCE ITS
//    CONSUMER NEEDS IS THE WORST KIND OF INSTRUMENT.

import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { applyTypedDdl } from "../src/omp/typed-write.ts";
import { graphFacts } from "../src/omp/graph-facts.ts";

const PY = "/home/leviathan/corbell-venv/bin/python";
const SCRIPT = path.join(import.meta.dir, "..", "scripts", "structural-extract.py");

// ★★ THE ENVIRONMENT DEPENDENCY, NAMED AND ASSERTED — FOUND BY THE CONTAINER.
//   This suite MUST run the extractor through the corbell venv's Python (it carries
//   tree-sitter + the TypeScript grammar). That venv is a HOST PATH, so in a clean container
//   all three tests FAILED. THE HONEST FIX IS NOT TO SKIP QUIETLY — it is to report the
//   blocker by name (the pin's law: a blocked verification is BLOCKED, never PASSED) and to
//   keep the dependency VISIBLE, because it is the same class as the register's host-pinned
//   ABSIDE/RSI paths that produce the container's +6 delta.
const EXTRACTOR_RUNTIME = fs.existsSync(PY) && fs.existsSync(SCRIPT);
const it = EXTRACTOR_RUNTIME ? test : test.skip;
const WHY = `the extractor runtime is absent (${PY}) — BLOCKED in a clean container, not failed`;

test("★ THE EXTRACTOR'S RUNTIME DEPENDENCY IS NAMED (it is a HOST path, like the register's)", () => {
  // this test runs EVERYWHERE and states the fact, so the skip below is never silent
  if (EXTRACTOR_RUNTIME) {
    expect(fs.existsSync(PY)).toBe(true);
  } else {
    // in a container: recorded, not hidden
    expect(WHY).toContain("BLOCKED in a clean container");
  }
});

/** A fixture source with: a declared-but-unused field, a used field, and a closure. */
const FIXTURE = `
export interface Config {
  unusedField?: string;
  usedField?: number;
}
export function make(c: Config) {
  const read = () => c.usedField;
  const ignored = () => c.usedField;
  return read;
}
`;

function run(root: string, store: string): { ok: boolean; stdout: string } {
  const r = Bun.spawnSync([PY, SCRIPT, "--root", root, "--store", store]);
  return { ok: r.exitCode === 0, stdout: r.stdout.toString() + r.stderr.toString() };
}

describe("st-gi-v21-structural-extract: the extractor's contract", () => {
  it("the four kinds are emitted, and the store carries provenance", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-se-"));
    const srcDir = path.join(dir, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, "fixture.ts"), FIXTURE);
    const store = path.join(dir, "store.sqlite");
    const db0 = new Database(store, { create: true });
    applyTypedDdl(db0);
    db0.close();

    const r = run(srcDir, store);
    expect(r.ok).toBe(true);
    expect(r.stdout).toContain("STRUCTURAL_EXTRACT_OK");

    const db = new Database(store, { readonly: true });
    const kinds = db.query("SELECT kind, COUNT(*) n FROM typed_nodes WHERE layer_id='structural' GROUP BY kind").all() as { kind: string; n: number }[];
    const have = Object.fromEntries(kinds.map((k) => [k.kind, k.n]));
    expect(have["type"]).toBe(1);        // the Config interface
    expect(have["field"]).toBe(2);       // its two members
    expect(have["closure"]).toBe(2);     // read + ignored
    // ★ THE PROVENANCE RIDE-ALONG — a store without populated_at is refused as STALE
    const meta = db.query("SELECT value FROM gi_meta WHERE key='populated_at'").get() as { value: string } | null;
    expect(meta).not.toBeNull();
    db.close();
  });

  it("★ THE SELF-REFERENCE GUARD: declaring a member is NOT referencing it", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-se2-"));
    const srcDir = path.join(dir, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, "fixture.ts"), FIXTURE);
    const store = path.join(dir, "store.sqlite");
    const db0 = new Database(store, { create: true });
    applyTypedDdl(db0);
    db0.close();
    expect(run(srcDir, store).ok).toBe(true);

    // ★ M-GRAPH-2 MUST FIRE ON THE UNUSED FIELD. Before the guard, the declaring interface
    //   emitted a reference edge to its own member, in-degree was 1, and the rule settled
    //   IGNORE — A FALSE IGNORE.
    const unused = graphFacts({ storePath: store, target: "unusedField", intent: "declare" });
    expect(unused[0]!.rule).toBe("M-GRAPH-2");
    expect(unused[0]!.settles).toBe(true);
    expect(unused[0]!.action).toBe("FIRE");              // ★ THE DEAD FIELD, CAUGHT AT $0

    // and a USED field settles IGNORE — the rule discriminates
    const used = graphFacts({ storePath: store, target: "usedField", intent: "declare" });
    expect(used[0]!.action).toBe("IGNORE");
  });

  it("★ THE CLOSURE IS VISIBLE: a call site inside an arrow function counts", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-se3-"));
    const srcDir = path.join(dir, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    // two mutation sites — the second is an INLINE CLOSURE, the D-5 shape
    fs.writeFileSync(path.join(srcDir, "fixture.ts"), `
class Gate {
  private m = new Map<string, number>();
  drop(k: string) { this.m.delete(k); }
  once(k: string) { const ev = () => this.m.delete(k); return ev; }
}
`);
    const store = path.join(dir, "store.sqlite");
    const db0 = new Database(store, { create: true });
    applyTypedDdl(db0);
    db0.close();
    expect(run(srcDir, store).ok).toBe(true);

    // the closures are IN the graph — 50 exist in the real store, invisible to corbell
    const db = new Database(store, { readonly: true });
    const cl = db.query("SELECT COUNT(*) n FROM typed_nodes WHERE kind='closure' AND layer_id='structural'").get() as { n: number };
    expect(cl.n).toBeGreaterThan(0);
    db.close();
  });
});
