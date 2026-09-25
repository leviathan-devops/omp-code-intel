// SHIM (port seam): the canonical authority is ./db.ts (the whole-file port of the fork db.ts).
// Early W3 consumers imported this slice name; it now re-exports the canonical module so there is
// ONE authority (the shape-drift ban). Keep importing either path; DB code imports ./db.ts.
export * from "./db.ts";
