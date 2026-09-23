#!/usr/bin/env bun
// GI-CLI — direct kernel access for testing and debugging
// Same code path the OMP tools use, callable from the shell.
import { openTypedStore } from "../src/omp/typed-write.ts";
import * as fs from "node:fs";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import type { GraphSnapshot } from "../src/kernel/graph-diff.ts";

const [,, verb, target, rootArg] = process.argv;
const root = rootArg ? path.resolve(rootArg) : process.cwd();

if (!verb || !target) {
  console.log(`Usage: bun scripts/gi-cli.ts <verb> <target> [root]

Query verbs: who-calls | impact | blast-radius | unwired | safe-delete
Infra verbs (P2, W5/W6):
  snapshot            — capture the structural fingerprint of the store
  diff <a.json> <b.json> — diff two snapshot files (save via: ... > before.json)
  gate <diff.json> <micro|category|domain> — stairstepper gate check
  preflight <fn>      — full pre-coding risk package (callers/radius/strategy/targets)
  test-targets <fn> [n] — prioritized TDD test targets
Example: bun scripts/gi-cli.ts who-calls supersedeThenInsert .`);
}

// Store resolution (W6): GI_CLI_STORE > newest session store under the root >
// the legacy inspection checkout. The KERNEL verbs (snapshot/preflight/
// test-targets) require a session-shaped store (openTypedStore refuses the
// inspection checkout by law); the raw query verbs fall back to it.
function resolveStore(): string {
  if (process.env.GI_CLI_STORE) return process.env.GI_CLI_STORE;
  const sessionsDir = path.join(root, ".omp", "graph-intelligence", "sessions");
  try {
    const candidates = fs.readdirSync(sessionsDir)
      .filter((d) => fs.existsSync(path.join(sessionsDir, d, "store.sqlite")))
      .map((d) => path.join(sessionsDir, d, "store.sqlite"))
      .map((p) => ({ p, m: fs.statSync(p).mtimeMs }))
      .sort((a, b) => b.m - a.m);
    if (candidates.length > 0) return candidates[0]!.p;
  } catch { /* no sessions dir */ }
  return path.join(root, ".omp", "graph-intelligence", "graphify-checkout", "store.sqlite");
}
const storePath = resolveStore();
const KERNEL_VERBS = new Set(["snapshot", "preflight", "test-targets"]);
if (!fs.existsSync(storePath)) {
  console.error(`NO STORE at ${storePath}`);
  console.error("Run: graphify extract <root> --no-cluster && bun scripts/graphify-build.ts <root>, or set GI_CLI_STORE to a session store path");
  process.exit(1);
}
const SESSION_SHAPED = /\/sessions\/[A-Za-z0-9_-]{8,24}\/store\.sqlite$/.test(storePath);
if (!SESSION_SHAPED && KERNEL_VERBS.has(verb)) {
  console.error(`GI_CLI_STORE_REQUIRED: '${verb}' needs a session-shaped store (openTypedStore law); ${storePath} is an inspection checkout.`);
  console.error("Set GI_CLI_STORE=/path/to/sessions/<sid>/store.sqlite or populate a session first.");
  process.exit(1);
}
const mod = await import("../src/omp/typed-write.ts");
const db = SESSION_SHAPED ? mod.openTypedStore(storePath) : new Database(storePath, { readonly: true });

switch (verb) {
  case "who-calls": {
    const ids = (db.query("SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL").all(target) as any[]).map(r => r.canonical_id);
    if (!ids.length) { console.log(`NOT FOUND: no live node with label '${target}'`); break; }
    const rows = db.query(
      `SELECT DISTINCT src.label AS caller, src.file AS file, src.line AS line, e.dst_canonical AS target_canonical
       FROM typed_edges e JOIN typed_nodes src ON e.src_canonical = src.canonical_id
       WHERE e.dst_canonical IN (${ids.map(()=>'?').join(',')})
         AND e.predicate IN ('calls','traces-to','imports') AND e.superseded_run IS NULL
         AND src.superseded_run IS NULL`
    ).all(...ids) as any[];
    console.log(`who-calls '${target}': ${rows.length} caller(s)`);
    for (const r of rows) console.log(`  ← ${r.caller} (${r.file}:${r.line}) → ${r.target_canonical}`);
    break;
  }
  case "impact": {
    const ids = (db.query("SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL").all(target) as any[]).map(r => r.canonical_id);
    if (!ids.length) { console.log(`NOT FOUND: '${target}'`); break; }
    const seen = new Set(ids);
    let frontier = [...ids];
    const ledger: any[] = [];
    for (let d = 1; d <= 8 && frontier.length; d++) {
      const next: string[] = [];
      for (let i = 0; i < frontier.length; i += 64) {
        const chunk = frontier.slice(i, i + 64);
        const callers = db.query(
          `SELECT DISTINCT src.canonical_id AS id, src.label AS caller, src.file AS file, src.line AS line
           FROM typed_edges e JOIN typed_nodes src ON e.src_canonical = src.canonical_id
           WHERE e.dst_canonical IN (${chunk.map(()=>'?').join(',')})
             AND e.superseded_run IS NULL AND src.superseded_run IS NULL`
        ).all(...chunk) as any[];
        for (const c of callers) {
          if (seen.has(c.id)) continue;
          seen.add(c.id);
          ledger.push({ symbol: c.caller, depth: d, file: c.file ?? "", line: c.line ?? 0 });
          next.push(c.id);
        }
      }
      frontier = next;
    }
    console.log(`impact '${target}': ${ledger.length} nodes reached`);
    for (const l of ledger) console.log(`  depth ${l.depth}: ${l.symbol} (${l.file}:${l.line})`);
    break;
  }
  case "unwired": {
    const rows = db.query(
      `SELECT n.label AS name, n.file AS file, n.line AS line, n.kind AS kind
       FROM typed_nodes n
       WHERE n.superseded_run IS NULL
         AND NOT EXISTS (SELECT 1 FROM typed_edges e WHERE e.dst_canonical = n.canonical_id AND e.superseded_run IS NULL)
         AND n.kind IN ('function','class','method','Function','Class','Method')`
    ).all() as any[];
    console.log(`unwired (zero inbound): ${rows.length} nodes`);
    for (const r of rows.slice(0, 30)) console.log(`  ${r.kind}: ${r.name} (${r.file}:${r.line ?? "?"})`);
    if (rows.length > 30) console.log(`  ... and ${rows.length - 30} more`);
    break;
  }
  case "safe-delete": {
    const ids = (db.query("SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL").all(target) as any[]).map(r => r.canonical_id);
    if (!ids.length) { console.log(`NOT FOUND: '${target}'`); break; }
    const callers = db.query(
      `SELECT DISTINCT src.label AS caller FROM typed_edges e JOIN typed_nodes src ON e.src_canonical = src.canonical_id
       WHERE e.dst_canonical IN (${ids.map(()=>'?').join(',')}) AND e.superseded_run IS NULL`
    ).all(...ids) as any[];
    const uses = db.query(
      `SELECT DISTINCT dst.label AS used FROM typed_edges e JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id
       WHERE e.src_canonical IN (${ids.map(()=>'?').join(',')}) AND e.superseded_run IS NULL`
    ).all(...ids) as Array<{ used: string }>;
    console.log(`safe-delete '${target}': ${callers.length} callers, ${uses.length} uses`);
    for (const c of callers) console.log(`  caller: ${c.caller}`);
    for (const u of uses) console.log(`  uses: ${u.used}`);
    break;
  }
  case "snapshot": {
    const { captureSnapshot } = await import("../src/kernel/graph-diff.ts");
    console.log(JSON.stringify(captureSnapshot(storePath), null, 1));
    break;
  }
  case "diff": {
    const { diffGraphs } = await import("../src/kernel/graph-diff.ts");
    const [, , , fileA, fileB] = process.argv;
    if (!fileA || !fileB) { console.error("diff requires two snapshot JSON files"); process.exit(1); }
    const d = diffGraphs(JSON.parse(fs.readFileSync(fileA, "utf8")) as GraphSnapshot, JSON.parse(fs.readFileSync(fileB, "utf8")) as GraphSnapshot);
    console.log(`verdict: ${d.verdict}`);
    for (const line of d.details) console.log(`  ${line}`);
    break;
  }
  case "gate": {
    const { gateCheck, GATE_LEVELS } = await import("../src/kernel/graph-gate.ts");
    const { diffGraphs } = await import("../src/kernel/graph-diff.ts");
    const [, , , fileA, fileB, levelArg] = process.argv;
    const level = (levelArg ?? "micro") as keyof typeof GATE_LEVELS;
    if (!fileA || !fileB) { console.error("gate requires two snapshot JSON files"); process.exit(1); }
    const d = diffGraphs(JSON.parse(fs.readFileSync(fileA, "utf8")) as GraphSnapshot, JSON.parse(fs.readFileSync(fileB, "utf8")) as GraphSnapshot);
    const g = gateCheck(d, GATE_LEVELS[level] ?? GATE_LEVELS.micro!);
    console.log(`gate (${level}): ${g.verdict}`);
    for (const f of g.failures) console.log(`  FAIL: ${f}`);
    for (const w of g.warnings) console.log(`  WARN: ${w}`);
    break;
  }
  case "preflight": {
    const { preFlight } = await import("../src/kernel/graph-pre-flight.ts");
    const pf = preFlight(storePath, target);
    console.log(`pre-flight '${pf.target}': strategy=${pf.commitStrategy} reaches=${pf.blastRadius.reaches} callers=${pf.riskProfile.callers}`);
    for (const c of pf.directCallers) console.log(`  caller: ${c.caller} (${c.file}:${c.line}) via ${c.via}`);
    for (const t of pf.testTargets) console.log(`  test: ${t.label} (inbound ${t.inboundDegree}, priority ${t.priority})`);
    for (const w of pf.warnings) console.log(`  WARN: ${w}`);
    break;
  }
  case "test-targets": {
    const { getTestTargets } = await import("../src/kernel/graph-test-target.ts");
    const max = Number(process.argv[5] ?? "5") || 5;
    for (const t of getTestTargets(storePath, target, max)) {
      console.log(`  #${t.priority} ${t.label} (${t.file}:${t.line}) inbound=${t.inboundDegree} — ${t.reason}`);
    }
    break;
  }
  default:
    console.error(`Unknown verb: ${verb}. See usage above.`);
}
db.close();
