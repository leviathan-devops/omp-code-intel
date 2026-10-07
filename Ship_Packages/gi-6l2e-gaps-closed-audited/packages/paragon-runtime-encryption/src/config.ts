// paragon-runtime-encryption — guarded-seam security + auditable-edit primitive.
// Config surface: EVERY name a deployment choice. No GI vocabulary lives here.
// (The reference identity column arrives via `idColumn`; the default
// `entity_id` keeps the reference naming out of this primitive.)

export interface StoreConfig {
  /** sqlite file for the guarded store (G1: lives outside the project tree). */
  storePath: string;
  /** kernel-only HMAC key file (G2: 0600, 32 bytes, never in the tree). */
  keyPath: string;
  /** record table name. Default "records". */
  recordTable?: string;
  /** evidence ledger table name. Default "ledger". */
  ledgerTable?: string;
  /** identity column name. Default "entity_id". */
  idColumn?: string;
}

export interface ResolvedConfig {
  storePath: string;
  keyPath: string;
  recordTable: string;
  ledgerTable: string;
  idColumn: string;
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function ident(name: string, what: string): string {
  if (!IDENT.test(name)) throw new Error(`BAD_CONFIG ${what}=${JSON.stringify(name)} not allowlisted`);
  return name;
}

export function resolveConfig(c: StoreConfig): ResolvedConfig {
  if (!c.storePath) throw new Error("BAD_CONFIG storePath required");
  if (!c.keyPath) throw new Error("BAD_CONFIG keyPath required");
  return {
    storePath: c.storePath,
    keyPath: c.keyPath,
    recordTable: ident(c.recordTable ?? "records", "recordTable"),
    ledgerTable: ident(c.ledgerTable ?? "ledger", "ledgerTable"),
    idColumn: ident(c.idColumn ?? "entity_id", "idColumn"),
  };
}
