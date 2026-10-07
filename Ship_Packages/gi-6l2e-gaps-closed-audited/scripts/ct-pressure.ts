// THE PRESSURE-TEST HARNESS — the decision-surface sweep, run INSIDE the container against
// the REAL modules. Every case: a POSITIVE (must fire/behave) + a NEGATIVE (must not misfire).
// Adjudication is the runner's: a FAIL is re-read against the contract before any verdict.
// Run: bun /gi/scripts/ct-pressure.ts
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { classify } from "../src/hunter/firewall/readonly.ts";
import { acquireHuntLock, releaseHuntLock, huntLockPath } from "../src/hunter/harness/hunt-lock.ts";
import { dedupe } from "../src/hunter/diagnostics/engine.ts";
import { parseBuildOutput } from "../src/hunter/graph/corbell-adapter.ts";
import { resolveNodeFile } from "../src/hunter/graph/corbell-adapter.ts";

const REPO = "/gi";
type R = { id: string; kind: "POS" | "NEG" | "EDGE"; ok: boolean; note: string };
const rows: R[] = [];
const rec = (id: string, kind: R["kind"], ok: boolean, note: string) => {
  rows.push({ id, kind, ok, note });
  console.log(`${ok ? "PASS" : "*** FAIL"} [${kind}] ${id} :: ${note}`);
};

// ════════════════ 1 · THE CLASSIFIER FAMILY (classify) ════════════════
// THE POSITIVE SUITE — the attacks the firewall exists to catch (the FULL family, not the one
// example in a comment): the exec hooks, the write flags, the abbreviations, the clusters, the
// quote-concat, the escapes, the expansions, the chained writes.
const POS: [string, string][] = [
  ["find -exec",            "find . -exec rm {} ;"],
  ["find quoted -exec",     "find . '-exec' rm {} ;"],
  ["find -fprintf",         "find . -fprintf /tmp/o '%p'"],
  ["find -delete",          "find . -delete"],
  ["sort -o",               "sort -o /tmp/o f"],
  ["sort -o attached",      "sort -o/tmp/o f"],
  ["sort --out= abbrev",    "sort --out=/tmp/o f"],
  ["sort --compress-prog",  "sort --compress-program=rm f"],
  ["sort quote-concat",     "sort --out\"put\"=/tmp/o f"],
  ["diff --to-file",        "diff --to-file=/tmp/o a b"],
  ["uniq 2 operands",       "uniq in out"],
  ["uniq -- operands",      "uniq -- -a -b"],
  ["git -o attached",       "git log -o/tmp/o"],
  ["git -po cluster",       "git log -po/tmp/o"],
  ["git --out= abbrev",     "git log --out=/tmp/o"],
  ["git quote-concat",      "git log --out\"put\"=/tmp/o"],
  ["git --ext-diff",        "git log --ext-diff"],
  ["rg --pre",              "rg --pre 'rm -rf /' x"],
  ["sed pipe-smuggle",      "sed -n '1p' foo|bar"],
  ["sed redirect",          "sed -n '1p' foo>bar"],
  ["sed semicolon",         "sed -n '1p' foo;rm -rf /"],
  ["sed -e file-slot",      "sed -n '1p' -e"],
  ["DQ expansion",          "grep \"$(rm -rf /)\" f"],
  ["backtick expansion",    "grep \"`id`\" f"],
  ["escaped-quote pipe",    "cat foo\\' | python -c x"],
  ["unterminated quote",    "cat foo' | python -c x"],
  ["bidi control",          "cat 'a\u202Erm'"],
  ["var expansion",         "cat $HOME/.ssh/id_rsa"],
  ["chained write",         "cat a > /etc/passwd"],
  ["piped exec",            "cat f | sh"],
];
// THE NEGATIVE SUITE — the legit reads the firewall must allow with ZERO misfire.
const NEG: [string, string][] = [
  ["sed -n range",          "sed -n '1,20p' file.txt"],
  ["sed -n addr",           "sed -n '1p' src/a.ts"],
  ["sort -k2",              "sort -k2 f.txt"],
  ["sort plain",            "sort f.txt"],
  ["sort --reverse",        "sort --reverse f.txt"],
  ["uniq one operand",      "uniq f.txt"],
  ["uniq -c",               "uniq -c f.txt"],
  ["git log",               "git log --oneline -5"],
  ["git log -p",            "git log -p"],
  ["git show",              "git show HEAD"],
  ["rg plain",              "rg pattern src/"],
  ["grep -rn",              "grep -rn 'x' src/"],
  ["grep quoted pipe",      "grep 'a|b' f.txt"],
  ["grep DQ string",        'grep "hello world" f.txt'],
  ["find -name",            "find . -name '*.ts'"],
  ["cat",                   "cat README.md"],
  ["ls",                    "ls -la src/"],
  ["diff plain",            "diff a.txt b.txt"],
  ["escaped-quote literal", "cat foo\\'"],
  ["wc",                    "wc -l f.txt"],
  ["head/tail",             "head -20 f.txt"],
  ["echo",                  "echo hello"],
];
let clsLeaks = 0, clsMisfires = 0;
for (const [id, cmd] of POS) {
  const d = classify(cmd);
  const ok = d.verdict !== "ALLOW_READ";
  if (!ok) clsLeaks++;
  rec(`classify:${id}`, "POS", ok, `${d.verdict} [${d.pattern}]`);
}
for (const [id, cmd] of NEG) {
  const d = classify(cmd);
  const ok = d.verdict === "ALLOW_READ";
  if (!ok) clsMisfires++;
  rec(`classify:${id}`, "NEG", ok, `${d.verdict} [${d.pattern}]`);
}
// THE EDGE — the fail-closed input guard (the audit's HIGH, re-probed)
for (const v of [null, undefined, 42, {}] as unknown[]) {
  try {
    const d = classify(v as string);
    rec(`classify:edge:${typeof v}`, "EDGE", d.verdict === "BLOCKED", `${d.verdict}`);
  } catch (e) {
    rec(`classify:edge:${typeof v}`, "EDGE", false, `THREW: ${e instanceof Error ? e.message.slice(0, 50) : ""}`);
  }
}

// ════════════════ 2 · THE LOCK STATE MACHINE (hunt-lock) ════════════════
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ct-lock-"));
const target = path.join(tmpRoot, "t");
// L1 — acquire succeeds; the payload carries the ownership triple
const p1 = acquireHuntLock(target);
rec("lock:acquire", "POS", p1.pid === process.pid && typeof p1.hostname === "string" && !!p1.acquiredAt, `pid=${p1.pid} host=${p1.hostname}`);
// L2 — a SECOND acquire must throw HUNT_ALREADY_RUNNING (the mutual exclusion)
let l2 = false, l2note = "";
try { acquireHuntLock(target); } catch (e) { l2 = /HUNT_ALREADY_RUNNING/.test(String(e)); l2note = String(e).slice(0, 60); }
rec("lock:second-acquire-refused", "POS", l2, l2note || "NO THROW — the mutex is broken");
// L3 — a foreign-host lock must NOT be released (the F-342 contract)
{
  const lp = huntLockPath(target);
  const real = JSON.parse(fs.readFileSync(lp, "utf8"));
  fs.writeFileSync(lp, JSON.stringify({ pid: process.pid, acquiredAt: real.acquiredAt, hostname: "another-host-xyz" }));
  releaseHuntLock(target);
  const kept = fs.existsSync(lp);
  rec("lock:foreign-host-not-released", "POS", kept, kept ? "kept (fail-closed ✓)" : "DELETED a foreign lock — F-342 broken");
  fs.writeFileSync(lp, JSON.stringify(real));   // restore
}
// L4 — a corrupted lock must NOT be stolen before the TTL (the F-60/F-30 fail-closed)
{
  const lp = huntLockPath(target);
  const real = fs.readFileSync(lp, "utf8");
  fs.writeFileSync(lp, "{ this is not json");
  let threw = false;
  try { acquireHuntLock(target); } catch { threw = true; }
  rec("lock:corrupt-not-stolen", "POS", threw, threw ? "refused (fail-closed ✓)" : "STOLE a corrupted lock");
  fs.writeFileSync(lp, real);
}
// L5 — release by the owner succeeds; a second release is a benign no-op
releaseHuntLock(target);
const gone = !fs.existsSync(huntLockPath(target));
rec("lock:owner-release", "POS", gone, gone ? "released ✓" : "the owner could not release");
let l5ok = true;
try { releaseHuntLock(target); } catch { l5ok = false; }
rec("lock:double-release-benign", "EDGE", l5ok, l5ok ? "no throw ✓" : "THREW on a double release");
// L6 — acquire after release succeeds (the full cycle)
let l6 = false;
try { const p = acquireHuntLock(target); l6 = p.pid === process.pid; } catch { /* no */ }
rec("lock:reacquire-after-release", "NEG", l6, l6 ? "re-acquired ✓" : "could not re-acquire");
releaseHuntLock(target);

// ════════════════ 3 · THE DEDUPE CONTRACT (engine.dedupe) ════════════════
const mk = (ruleId: string, file: string, line: number) => ({ ruleId, file, line, severity: "HIGH", message: "m", evidence: "e", predicateId: "P" }) as never;
// D1 — the F-281 injective key: ruleId/file containing '|' must NOT collide
const d1 = dedupe([mk("a|b", "c", 1), mk("a", "b|c", 1)]);
rec("dedupe:pipe-collision", "POS", d1.length === 2, `${d1.length} rows (must be 2 — the '|' join would merge)`);
// D2 — the exact duplicates collapse
const d2 = dedupe([mk("r", "f", 1), mk("r", "f", 1)]);
rec("dedupe:exact-dup", "POS", d2.length === 1, `${d2.length} rows (must be 1)`);
// D3 — distinct lines preserved
const d3 = dedupe([mk("r", "f", 1), mk("r", "f", 2)]);
rec("dedupe:distinct-lines", "NEG", d3.length === 2, `${d3.length} rows (must be 2)`);
// D4 — the empty input
const d4 = dedupe([]);
rec("dedupe:empty", "EDGE", d4.length === 0, `${d4.length} rows`);

// ════════════════ 4 · THE PARSER FAMILY (parseBuildOutput) ════════════════
const prof = { project: { root: REPO }, graph: { scope: ["src"] } } as never;
// P1 — the well-formed rows parse
const p1o = parseBuildOutput("fn alpha src/a.ts:10\nclass Beta src/b.ts:20\n", prof);
rec("parse:wellformed", "POS", p1o.length === 2, `${p1o.length} nodes`);
// P2 — the malformed lines do NOT crash (the empty/garbage input)
let p2ok = true, p2n = -1;
try { p2n = parseBuildOutput("", prof).length; } catch { p2ok = false; }
rec("parse:empty-input", "EDGE", p2ok && p2n === 0, p2ok ? `${p2n} nodes` : "THREW on empty input");
let p3ok = false, p3note = "";
try { parseBuildOutput("garbage\n\n\u0000\nnot a row at all\n", prof); p3note = "returned (unexpected)"; }
catch (e) { const m = e instanceof Error ? e.message : String(e); p3ok = /ADAPTER_PARSE_ERROR/.test(m); p3note = m.slice(0, 70); }
rec("parse:garbage-named-refusal", "EDGE", p3ok, p3note);
// P4 — a huge input is bounded
const huge = Array.from({ length: 5000 }, (_, i) => `fn f${i} src/a.ts:${i + 1}`).join("\n");
const t0 = Date.now();
const p4 = parseBuildOutput(huge, prof);
rec("parse:huge-bounded", "EDGE", p4.length === 5000 && Date.now() - t0 < 20000, `${p4.length} nodes in ${Date.now() - t0}ms`);

// ════════════════ 5 · THE PATH RESOLVER (resolveNodeFile) ════════════════
// R1 — an absolute path that exists resolves to itself
const abs = path.join(REPO, "README.md");
rec("resolve:absolute-exists", "POS", resolveNodeFile(abs, REPO) === abs, "resolved to itself");
// R2 — a relative path joins the root
const rel = "README.md";
const r2 = resolveNodeFile(rel, REPO);
rec("resolve:relative-join", "POS", r2 === path.join(REPO, rel), r2);
// R3 — a nonexistent relative path does NOT throw
let r3ok = false, r3note = "";
try { const v = resolveNodeFile("no/such/file-xyz.ts", REPO); r3note = `returned "${String(v).slice(0, 50)}" (unexpected)`; }
catch (e) { const m = e instanceof Error ? e.message : String(e); r3ok = /FOREIGN_PATH_UNRESOLVED/.test(m); r3note = m.slice(0, 70); }
rec("resolve:missing-named-refusal", "EDGE", r3ok, r3note);
// R4 — the empty string does not throw
let r4ok = true;
try { resolveNodeFile("", REPO); } catch { r4ok = false; }
rec("resolve:empty-no-throw", "EDGE", r4ok, r4ok ? "no throw ✓" : "THREW on empty");

// ════════════════ 6 · THE CARD FAMILY (the LSP's renderers — THE CORPUS EXPANSION) ════════════════
import { isCodeFile, declarationsIn, shownTotal, relTo } from "../src/gi-lsp/cards.ts";
// C1 — the DOC FILTER (the doc-silence contract): code files YES, docs NO
const codeYes = ["src/a.ts", "a.tsx", "a.js", "a.jsx", "a.mjs", "a.cjs", "a.py"];
const codeNo = ["README.md", "a.json", "a.txt", "a.yaml", "Makefile", "a"];
for (const f of codeYes) rec(`card:isCodeFile-yes:${f}`, "POS", isCodeFile(f) === true, `${isCodeFile(f)}`);
for (const f of codeNo) rec(`card:isCodeFile-no:${f}`, "NEG", isCodeFile(f) === false, `${isCodeFile(f)}`);
// C2 — the EDGE: the uppercase extension + the .d.ts (the case-sensitivity boundary)
rec("card:isCodeFile-uppercase", "EDGE", isCodeFile("A.TS") === false, `A.TS -> ${isCodeFile("A.TS")} (case-sensitive by design)`);
rec("card:isCodeFile-dts", "EDGE", isCodeFile("a.d.ts") === true, `a.d.ts -> ${isCodeFile("a.d.ts")}`);
// C3 — declarationsIn: the plain / the default-export / the generator / the dup / the empty
const decl = (src: string) => declarationsIn(src).map((d) => d.name);
rec("card:decl-plain", "POS", decl("export function foo() {}").join() === "foo", decl("export function foo() {}").join());
rec("card:decl-default", "POS", decl("export default function bar() {}").includes("bar"), decl("export default function bar() {}").join());
rec("card:decl-generator", "POS", decl("export function* gen() {}").includes("gen"), decl("export function* gen() {}").join());
rec("card:decl-async-abstract", "POS", decl("export abstract class C {}").includes("C"), decl("export abstract class C {}").join());
rec("card:decl-dup-deduped", "POS", decl("const a = 1;\nconst a = 2;").length === 1, decl("const a = 1;\nconst a = 2;").join());
rec("card:decl-empty", "EDGE", decl("").length === 0, `${decl("").length} decls`);
rec("card:decl-garbage", "EDGE", (() => { try { return decl("\u0000\u0001 not code at all"); } catch { return false; } })(), "no crash");
const hugeDecl = Array.from({ length: 5000 }, (_, i) => `const v${i} = ${i};`).join("\n");
const td0 = Date.now(); const dh = decl(hugeDecl);
rec("card:decl-huge-bounded", "EDGE", dh.length === 5000 && Date.now() - td0 < 10000, `${dh.length} in ${Date.now() - td0}ms`);
// C4 — shownTotal: the cap arithmetic (the NEVER-a-fabricated-count contract)
const card = (rows: number, total: number) => ({ kind: "CALLERS", rows: Array.from({ length: rows }, () => ({ file: "f", line: 1 })), total } as never);
rec("card:shownTotal-empty", "EDGE", shownTotal([]) === "shown=0 total=0", shownTotal([]));
rec("card:shownTotal-capped", "POS", shownTotal([card(3, 40)]) === "shown=3 total=40", shownTotal([card(3, 40)]));
rec("card:shownTotal-zero-total", "EDGE", shownTotal([card(0, 0)]) === "shown=0 total=0", shownTotal([card(0, 0)]));
// C5 — relTo: the inside / the outside / the root-itself
rec("card:relTo-inside", "POS", relTo("/r", "/r/a/b.ts") === "a/b.ts", relTo("/r", "/r/a/b.ts"));
rec("card:relTo-trailing-sep", "POS", relTo("/r/", "/r/a.ts") === "a.ts", relTo("/r/", "/r/a.ts"));
rec("card:relTo-outside", "NEG", relTo("/r", "/other/a.ts") === "a.ts", relTo("/r", "/other/a.ts"));
rec("card:relTo-root-itself", "EDGE", relTo("/r", "/r") === "r", relTo("/r", "/r"));

// ════════════════ THE TABLE ════════════════
const pass = rows.filter((r) => r.ok).length;
const byKind = (k: R["kind"]) => `${rows.filter((r) => r.kind === k && r.ok).length}/${rows.filter((r) => r.kind === k).length}`;
console.log(`\n==== THE PRESSURE TABLE: ${pass}/${rows.length} PASS  (POS ${byKind("POS")} · NEG ${byKind("NEG")} · EDGE ${byKind("EDGE")}) ====`);
console.log(`     the classifier: leaks=${clsLeaks} misfires=${clsMisfires}`);
for (const r of rows.filter((x) => !x.ok)) console.log(`  *** FAIL [${r.kind}] ${r.id} :: ${r.note}`);
fs.writeFileSync(path.join(REPO, ".omp", "ct-pressure.json"), JSON.stringify({ rows, pass, total: rows.length, clsLeaks, clsMisfires }, null, 1));
fs.rmSync(tmpRoot, { recursive: true, force: true });
process.exit(pass === rows.length ? 0 : 1);
