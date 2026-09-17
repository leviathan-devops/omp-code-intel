#!/usr/bin/env bun
// GI-CLI — direct kernel access for testing and debugging
// Same code path the OMP tools use, callable from the shell.
import { openTypedStore } from "../src/omp/typed-write.ts";
import * as fs from "node:fs";
import * as path from "node:path";

const [,, verb, target, rootArg] = process.argv;
const root = rootArg ? path.resolve(rootArg) : process.cwd();

if (!verb || !target) {
  console.log(`Usage: bun scripts/gi-cli.ts <verb> <target> [root]
  
Verbs: who-calls | impact | blast-radius | unwired | safe-delete
Example: bun scripts/gi-cli.ts who-calls supersedeThenInsert .`);
  process.exit(1);
}

const storePath = path.join(root, ".omp", "graph-intelligence", "graphify-checkout", "store.sqlite");
if (!fs.existsSync(storePath)) {
  console.error(`NO STORE at ${storePath}`);
  console.error("Run: graphify extract <root> --no-cluster && bun scripts/graphify-build.ts <root>");
  process.exit(1);
}

const mod = await import("../src/omp/typed-write.ts");
const db = mod.openTypedStore(storePath);

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
         AND n.kind IN ('function','class','method')`
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
    ).all(...ids) as any[];
    console.log(`safe-delete '${target}': ${callers.length} callers, ${uses.length} uses`);
    for (const c of callers) console.log(`  caller: ${c.caller}`);
    for (const u of uses) console.log(`  uses: ${u.used}`);
    break;
  }
  default:
    console.error(`Unknown verb: ${verb}. Use: who-calls | impact | unwired | safe-delete`);
}
db.close();
