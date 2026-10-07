// demo.ts — stands up the package against a throwaway /tmp store and runs
// BOTH reference attacks, printing the verdicts. `bun demo.ts` from inside
// the package. No repo needed beyond this directory.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { KernelStore, mintKey } from "./src/index";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paragon-demo-"));
const keyPath = path.join(dir, "vault", ".kernel.key");
mintKey(keyPath);
const store = KernelStore.open({
  storePath: path.join(dir, "vault", "store.sqlite"),
  keyPath,
  recordTable: "reflex",
  ledgerTable: "reflex_evidence",
  idColumn: "reflex_id",
});

const EID = "app:reflex:theatrical:claim-without-span";
const r1 = store.write({
  entityId: EID,
  kind: "Reflex",
  label: 'claim "tests pass" with zero bound spans',
  evidenceQuote: "the claim + the absence proof",
  confidence: 0.95,
  confirmed: 19,
  refuted: 1,
  createdRun: "run-7",
});
console.log(`KERNEL WRITE 1  sig=${r1.sig.slice(0, 16)}  kind=${r1.kind}  precision=0.95 (19/20)`);
const r2 = store.write({
  entityId: "app:reflex:dumb:blind-structural-edit",
  kind: "Guard",
  label: "structural edit with no prior query",
  evidenceQuote: "edit w.ts:208, 0 prior queries",
  confidence: 0.99,
  confirmed: 31,
  refuted: 1,
  createdRun: "run-9",
});
console.log(`KERNEL WRITE 2  sig=${r2.sig.slice(0, 16)}  kind=${r2.kind}  precision=0.99 (31/32)`);

// ATTACK 1 — direct insert of a second live row.
try {
  store.db.run(
    `INSERT INTO reflex (reflex_id, kind, label, evidence_quote, confidence, created_run, prev_hash, sig) VALUES (?, 'Reflex', 'dup', 'x', 0.5, 'run-10', 'GENESIS', 'aa')`,
    [EID],
  );
  console.log("ATTACK 1 (direct insert)   -> WRITE SUCCEEDED (UNEXPECTED)");
} catch (e) {
  console.log(`ATTACK 1 (direct insert)   -> BLOCKED: ${String(e).split("\n")[0]}`);
}

// ATTACK 2 — retire the real row, then insert the forgery.
store.db.run(`UPDATE reflex SET superseded_run = ? WHERE id = ?`, ["run-99", r1.id]);
store.db.run(
  `INSERT INTO reflex (reflex_id, kind, label, evidence_quote, confidence, confirmed, created_run, superseded_run, prev_hash, sig)
   VALUES (?, 'Retired', 'AGENT-AUTHORED EXEMPTION', 'forged', 1.0, 999, 'run-99', NULL, 'GENESIS', 'deadbeefdeadbeef')`,
  [EID],
);
const forgedId = Number((store.db.query(`SELECT id FROM reflex ORDER BY id DESC LIMIT 1`).get() as { id: number }).id);
const forged = store.rawById(forgedId)!;
console.log(`ATTACK 2 (retire-then-insert) -> DB write succeeded; forged id=${forgedId} sig=${forged.sig}`);
console.log(`  verify(forged) = ${store.verify(forged)} -> ${store.verify(forged) ? "TRUSTED (BAD)" : "REJECTED -> ABSENT"}`);
const live = store.readLive(EID)!;
console.log(`  readLive = id=${live.id} kind=${live.kind} (real row ${live.id === r1.id ? "STAYS LIVE — retirement IGNORED" : "DISPLACED (BAD)"})`);
console.log(`  chain: ok=${store.verifyChain().ok} checked=${store.verifyChain().checked}`);

store.close();
console.log(`store dir: ${dir} (throwaway; rm -rf it)`);
