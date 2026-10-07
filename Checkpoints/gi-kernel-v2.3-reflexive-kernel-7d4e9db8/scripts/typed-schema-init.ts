#!/usr/bin/env bun
// typed-schema-init — apply the TYPED store DDL to a PROJECT-scope store so a layer
// builder (structural-extract.py) can write into it.
//
// WHY THIS EXISTS: the W3 seam (openTypedStore) ENFORCES the `sessions/{sid24}/store.sqlite`
// shape — correct for a session store, but a target-scope graph store (the target's
// `.omp/graph-intelligence/structural/store.sqlite`) is NOT session-shaped. This helper
// applies the SAME `TYPED_STORE_DDL` through bun:sqlite directly, so the schema is
// identical while the path is free. It is the schema half of the project-scope write
// path (the stamp half lives in gi-populate's stampBuildRoot).
//
// usage: bun scripts/typed-schema-init.ts <store.sqlite>
import { Database } from "bun:sqlite";
import { TYPED_STORE_DDL } from "../src/omp/typed-write.ts";

const storePath = process.argv[2];
if (!storePath) {
  console.error("typed-schema-init: usage: bun scripts/typed-schema-init.ts <store.sqlite>");
  process.exit(2);
}
const db = new Database(storePath, { create: true });
try {
  for (const stmt of TYPED_STORE_DDL) db.run(stmt);
} finally {
  db.close();
}
console.log(`typed-schema-init: schema applied → ${storePath}`);
