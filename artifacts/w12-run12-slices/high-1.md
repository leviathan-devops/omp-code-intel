# HIGH slice 1 — 12 findings across 9 files

## src/hunter/diagnostics/calibration.ts
- **src/hunter/diagnostics/calibration.ts:374-380** (bug)
  Partial persistence across DB and file targets: writeCalibrationRows (DB) commits a transaction, then writeCalibrationRecord (file) is called separately. If the DB commit succeeds but the file write fails (e.g., disk full, permission denied), the system ends up with DB rows persisted but no corresponding CALIBRATION_vN.md record — an inconsistent cross-target state with no rollback or compensation mechanism. This is especially problematic since both represent the same calibration session's evidence.
  ```existing
  if (write) {
      const recordPath = write.recordPath ?? path.join(profile.project.root, '.trident', 'bug-hunter');
      if (write.db) {
        this.writeCalibrationRows(write.db, records, fixtureVersion);
      }
      this.writeCalibrationRecord(recordPath, { version, records, excluded, coverageNote });
    }
  ```
  ```suggested
  if (write) {
      const recordPath = write.recordPath ?? path.join(profile.project.root, '.trident', 'bug-hunter');
      try {
        if (write.db) {
          this.writeCalibrationRows(write.db, records, fixtureVersion);
        }
        this.writeCalibrationRecord(recordPath, { version, records, excluded, coverageNote });
      } catch (fileErr: unknown) {
        // DB rows are committed bu
  ```
- **src/hunter/diagnostics/calibration.ts:465-467** (bug)
  Inconsistent fixture validation in both validateFireFixture and validateGoldenFixture: they check that `source` is a string but do NOT verify it is non-empty (unlike `ruleId`, `file`, `anchor` which check `.trim() === ''`). An empty source string passes validation but produces meaningless calibration results — the engine would analyze zero-length input as if it were valid code, silently corrupting the FIRE/SILENT verdict.
  ```existing
  if (typeof f.source !== 'string') {
      throw calibrationFixtureInvalid(`fire fixture ${f.ruleId} carries no source read`);
    }
  ```
  ```suggested
  if (typeof f.source !== 'string' || f.source.trim() === '') {
      throw calibrationFixtureInvalid(`fire fixture ${f.ruleId} carries no source read`);
    }
  ```
- **src/hunter/diagnostics/calibration.ts:283-289** (security)
  The whoCalls error is caught and coerced to empty callers with only a console.warn, then the empty data is folded into the fixturesHash. This means a broken graph adapter's topology errors silently corrupt the version hash — causing either (a) a valid calibration to be spuriously invalidated (benign but wasteful) or (b) a stale calibration to be silently reused if the adapter was always broken for this fixture (dangerous). The warning is logged but not surfaced as a CalibrationError, so callers cannot distinguish 'calibration passed' from 'calibration passed with degraded topology'. Consider throwing CalibrationError here instead of console.warn, consistent with the file's own 'loud named error, never a coerced default' law for fixture faults.
  ```existing
  } catch (e) {
          // ★ F-335 FIX (2026-09-24): a throwing whoCalls used to coerce to [] SILENTLY -
          // ★ a topology-breaking adapter fault escaped the version hash. Still [] (a broken
          // ★ edge read must not brick versioning) but LOUD: the node + the error are warned.
          console.warn(`[calibration] whoCalls threw for node ${n.name}: ${e instanceof Error ? e.message 
  ```
  ```suggested
  } catch (e) {
          throw calibrationFixtureInvalid(
            `graph.whoCalls() threw for node ${n.name}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
  ```

## src/hunter/graph/interface.ts
- **src/hunter/graph/interface.ts:231-239** (bug)
  No null/undefined guard on `profile.graph` before accessing `.substrate`. If a malformed or legacy `ProjectProfile` arrives with `graph` as `undefined`, this will throw an unhandled `TypeError: Cannot read properties of undefined (reading 'substrate')` instead of the intended `ADAPTER_FAILED` error. Add a defensive check.
  ```existing
  export function selectAdapter(profile: ProjectProfile): GraphAdapter {
  // THE NATIVE-AST RIP-OUT (the operator ruling 2026-09-07, stated 4+ times:
  // NO FALLBACKS — LOUD FAIL OR CLEAR PASS — HARD DEPENDENCY). The Substrate
  // type no longer includes native-ast, but a legacy profile object (or a
  // hand-built string) can still arrive here at runtime — it FAILS LOUDLY
  // with the named REM
  ```
  ```suggested
  export function selectAdapter(profile: ProjectProfile): GraphAdapter {
  if (!profile.graph || typeof profile.graph.substrate !== 'string') {
    throw adapterFailed(
      `substrate=${String((profile.graph as any)?.substrate)}`,
      'profile.graph or profile.graph.substrate is missing or not a string — set graph.substrate to corbell or graphify.',
    );
  }
  if (profile.graph.substrate === '
  ```

## src/hunter/keys/go-key-pool.ts
- **src/hunter/keys/go-key-pool.ts:394-401** (bug)
  **Bug: `home === -1` branch UPDATE is silently overwritten by the subsequent UPSERT — displaced key's exile is always lost.**

The comment on lines 395-399 claims: "the UPSERT below cannot clobber it because it writes under the CURRENT keyid." This reasoning is incorrect. The UPSERT uses `ON CONFLICT(idx)` (line 404-405), which conflicts on the `idx` PRIMARY KEY, not on `keyid`. The UPDATE on line 400 sets `dead_until` on the row at `idx` (keyid = displaced.keyid), but the INSERT on line 403-406 immediately fires `ON CONFLICT(idx) DO UPDATE SET keyid = excluded.keyid, dead_until = excluded.dead_until`, overwriting the displaced key's row entirely.

Trace for `home === -1`:
1. Line 400: `UPDATE SET dead_until = max(old, until) WHERE keyid = X AND idx = N` → row at idx=N has (keyid=X, dead_until=max)
2. Line 403-406: `INSERT (idx=N, keyid=Y, dead_until=until) ON CONFLICT(idx) DO UPDATE SET keyid=Y, dead_until=until` → row at idx=N now has (keyid=Y, dead_until=until). Key X's exile is gone.

Impact: When a key is removed from GO_KEYS and later re-added, its rate-limit exile is silently lost. The still-limited key gets hammered. The F-512 fix's intent is not achieved.

Suggestion: To truly preserve an orphaned exile, either (a) store it in a separate table keyed by keyid, or (b) skip the UPSERT when the slot is occupied by a displaced orphan and use a different idx (e.g., a negative or high-range sentinel), or (c) accept that removed keys lose their exile and update the comment to reflect the actual behavior.
  ```existing
  } else {
          // ★ F-512 FIX (2026-09-24): a reload-removed key (home === -1) keeps its exile ATTACHED
          // ★ to the keyid instead of being deleted. The next reload that restores the key re-homes
          // ★ it (the home>=0 branch); deletion would hammer a still-limited key after a key-set edit.
          // ★ Keyed by keyid so a restored key re-attaches; the UPSERT below cannot cl
  ```

## src/hunter/shared/db.ts
- **src/hunter/shared/db.ts:821-822** (bug)
  Overly broad idempotent guards: the same catch-and-debug pattern is used for both idempotent DDL (`CREATE VIEW IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `ATTACH`) and for real writes (`INSERT OR REPLACE` in `requestPromotion`, lines 840-844). Genuine failures — disk full, corruption, `SQLITE_READONLY` on a mis-sealed store, or a partial schema failure from `ensureFamilyTables` — would be silently lost. The guard boundary between 'safe to ignore' and 'must throw' is informal. Consider narrowing the catch to only `SQLITE_ERROR` / `SQLITE_CONSTRAINT` messages for write operations, and letting I/O errors propagate. For the constructor path, a schema error from `ensureFamilyTables` partially failing should not be swallowed by the view-creation guard.
  ```existing
  try { this.familyDb.prepare("INSERT OR REPLACE INTO family_metadata (key, value) VALUES (?,?)").run(`promotion_pending:${hash}`, detail); } catch (idemErr) { /* idempotent guard */ console.debug("[kg-store] idempotent guard #6:", idemErr instanceof Error ? idemErr.message : String(idemErr)); }
    try { this.familyDb.prepare("INSERT OR REPLACE INTO family_metadata (key, value) VALUES ('promotion_s
  ```
  ```suggested
  // Narrow the guard to expected idempotent errors only:
function isIdempotentGuard(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('already exists') || msg.includes('constraint') || msg.includes('UNIQUE') || msg.includes('duplicate');
}
// Then in each catch block:
} catch (idemErr) {
  if (!isIdempotentGuard(idemErr)) throw idemErr;
 
  ```

## src/hydra/client-reader.ts
- **src/hydra/client-reader.ts:74-77** (bug)
  Unhandled promise rejection risk: If `old.close()` resolves before the 5000ms timeout, the setTimeout callback will still fire and call `rej(new Error(...))` on an already-settled race. Since nobody is awaiting that promise anymore, this produces an **unhandled promise rejection** — which in Node.js 15+ terminates the process by default. The timeout promise should resolve (not reject) on expiry, or the timer should be cancelled when close() wins the race.
  ```existing
  await Promise.race([
            old.close(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('TRANSPORT_CLOSE_TIMEOUT: close() exceeded 5000ms — releasing the reference anyway')), 5000).unref?.()),
          ]);
  ```
  ```suggested
  await Promise.race([
            old.close(),
            new Promise<void>((_resolve, reject) => {
              const id = setTimeout(() => reject(new Error('TRANSPORT_CLOSE_TIMEOUT: close() exceeded 5000ms — releasing the reference anyway')), 5000);
              id.unref?.();
              // Prevent unhandled rejection if close() wins: cancel the timer.
              old.close().then(() => cl
  ```

## src/omp/adapters/tsg.ts
- **src/omp/adapters/tsg.ts:122-123** (security)
  **Key redaction is fragile and may leak partial key material**: The `split(key).join(replacement)` approach only catches *exact, contiguous* occurrences of the key. It will miss:
1. Partial key exposure (e.g., the last 8 chars of the key in a stack trace or echo)
2. Key encoded via base64, URL-encoding, or case changes by the CLI or an intermediate layer
3. A key that is a substring of a longer token that happens to be printed

Consider redacting via a regex `new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')` for correctness, and additionally scrubbing the last N characters of the key as a partial-match heuristic.
  ```existing
  const redact = (s: string): string =>
          key !== null && key.length > 0 ? s.split(key).join(key.slice(0, 4) + '...[redacted]') : s;
  ```

## src/omp/decision.ts
- **src/omp/decision.ts:122-122** (security)
  **Path traversal via `scopeRoot` (both entry points).** `scopeRoot` is caller-supplied and used directly in `path.join` to derive `storePath`, `ledgerPath`, and `policyPath` without any canonicalization or boundary check. A malicious or malformed `scopeRoot` such as `../../etc` would cause reads/writes outside the intended `.omp` tree. After the `typeof` + emptiness check, canonicalize and verify the resolved path is within an expected parent:
```ts
const canonicalRoot = path.resolve(scopeRoot);
if (!canonicalRoot.startsWith(path.resolve("."))) {
  throw new Error(`GI_DECIDE_BAD_INPUT: scopeRoot escapes expected tree: ${scopeRoot}`);
}
```
Alternatively, reject paths containing `..` segments. This issue exists in both `decideFromRegistry` (line ~150) and `decideFireFromGraph` (line ~170).
  ```existing
  const registry = buildRegistry(scopeRoot);
  ```
  ```suggested
  const canonicalRoot = path.resolve(scopeRoot);
  // Guard against path traversal — scopeRoot must not escape the expected tree.
  // (Replace the sentinel check below with a project-specific root if applicable.)
  if (!canonicalRoot.startsWith(path.resolve('.'))) {
    throw new Error(`GI_DECIDE_BAD_INPUT: scopeRoot escapes expected tree: ${scopeRoot}`);
  }
  const registry = buildRegistry(canoni
  ```
- **src/omp/decision.ts:257-257** (bug)
  **Unguarded `new FireLedger(ledgerPath)` breaks the return-type contract.** The `mkdirSync` call above is carefully wrapped in a try/catch that produces a named error — but the immediately following `new FireLedger(ledgerPath)` is unprotected. `FireLedger`'s constructor throws `LedgerError` for a corrupt file, a permission denial, or a migration failure. That untyped throw escapes `decideFireFromGraph`, violating its `FireEvidence` return contract. Wrap it consistently:
```ts
let ledger: FireLedger;
try {
  ledger = new FireLedger(ledgerPath);
} catch (e) {
  throw new Error(`GI_LEDGER_OPEN_FAILED: cannot open ledger at ${ledgerPath} (${e instanceof Error ? e.message : String(e)})`);
}
```
  ```existing
  const ledger = new FireLedger(ledgerPath);
  ```
  ```suggested
  let ledger: FireLedger;
  try {
    ledger = new FireLedger(ledgerPath);
  } catch (e) {
    throw new Error(`GI_LEDGER_OPEN_FAILED: cannot open ledger at ${ledgerPath} (${e instanceof Error ? e.message : String(e)})`);
  }
  ```

## src/omp/layer-consumption.ts
- **src/omp/layer-consumption.ts:117-124** (bug)
  `consumptionAudit` builds its own summary string (lines 117-121) but omits `GI_LAYER_ERROR` verdicts, which were added to `layer-registry.ts`'s `summary()` in the F-708 FIX. Consumers that threw mid-query (`verdict.startsWith('GI_LAYER_ERROR')`) are excluded from the summary string, so an operator sees `consumed:6/8` with no hint that some consumers faulted. The registry's own `summary()` method already handles this (line 252 of layer-registry.ts). This creates a two-view drift: `consumptionAudit.summary` and `registry.summary(subject)` disagree for the same subject when `GI_LAYER_ERROR` consumers exist. Either reuse `registry.summary(subject)` here, or add the missing `GI_LAYER_ERROR` bucket to match.
  ```existing
  const down = reports.filter((r) => r.verdict === "GI_LAYER_DOWN");
  const unconsumed = reports.filter((r) => r.verdict === "GI_LAYER_UNCONSUMED");
  const parts = [
    `consumed:${consumed.length}/${reports.length}`,
    `rungs=${[...new Set(consumed.map((r) => r.rung))].sort().join(",") || "none"}`,
  ];
  if (unconsumed.length > 0) parts.push(`GI_LAYER_UNCONSUMED=${unconsumed.map((r) => r.cons
  ```
  ```suggested
  const errors = reports.filter((r) => r.verdict.startsWith("GI_LAYER_ERROR"));
  const down = reports.filter((r) => r.verdict === "GI_LAYER_DOWN");
  const unconsumed = reports.filter((r) => r.verdict === "GI_LAYER_UNCONSUMED");
  const parts = [
    `consumed:${consumed.length}/${reports.length}`,
    `rungs=${[...new Set(consumed.map((r) => r.rung))].sort().join(",") || "none"}`,
  ];
  if (uncon
  ```

## src/scoping/db-path.ts
- **src/scoping/db-path.ts:42-45** (bug)
  Environment variable values are not tilde-expanded. If a user sets an env var (e.g. `MY_DB_DIR=~/data`) to override the path, the tilde is treated literally, producing a relative path like `~/data/file.db` instead of expanding to the home directory. The spec's `defaultDir` and `testFile` both support tilde expansion, but the env-var override path (the highest-priority source) does not — this is inconsistent and could silently resolve to the wrong location.
  ```existing
  for (const env of spec.envVars) {
      const v = process.env[env];
      if (v && v.trim().length > 0) return path.join(v.trim(), spec.fileName);
    }
  ```
  ```suggested
  const TILDE = '~';
    const TILDE_SLASH = '~/';
    for (const env of spec.envVars) {
      const v = process.env[env];
      if (v && v.trim().length > 0) {
        let raw = v.trim();
        if (raw === TILDE || raw.startsWith(TILDE_SLASH)) {
          const home = process.env.HOME ?? process.env.USERPROFILE;
          if (!home) {
            throw new Error(
              `[db-path] HOME_NOT
  ```
