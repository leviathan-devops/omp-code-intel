// NIGHT-GI: gi-populate must log the NAMED error of a failed layer, not the Bun crash footer.
import { expect, test } from "bun:test";
import { failureTail, isBusy } from "../scripts/gi-populate.ts";

test("failureTail names GRAPHIFY_GRAPH_TOO_LARGE, not the Bun footer", () => {
  const out = "[graphify-build] extract done\n162 |     throw new Error(\n                    ^\nerror: GRAPHIFY_GRAPH_TOO_LARGE: graph.json is 171404992 bytes (> 134217728 budget).\n      at statAndReadGraphJson (x.ts:162:15)\n\nBun v1.4.2 (Linux x64)\n";
  const t = failureTail(out);
  expect(t).toMatch(/GRAPHIFY_GRAPH_TOO_LARGE/);
  expect(t).not.toMatch(/Bun v1\.4\.2/);
});

test("failureTail names SQLITE_BUSY", () => {
  const out = "290 |     db.exec(\"BEGIN IMMEDIATE;\");\n             ^\nSQLiteError: database is locked\n      errno: 5,\n       code: \"SQLITE_BUSY\"\n\n      at run (bun:sqlite:318:21)\n\nBun v1.4.2 (Linux x64)\n";
  const t = failureTail(out);
  expect(t).toMatch(/database is locked/);
  expect(t).toMatch(/SQLITE_BUSY/);
});

test("isBusy detects only the lock transient", () => {
  expect(isBusy("SQLiteError: database is locked\n code: \"SQLITE_BUSY\"")).toBe(true);
  expect(isBusy("error: GRAPHIFY_GRAPH_TOO_LARGE: graph.json is 1 bytes")).toBe(false);
});
