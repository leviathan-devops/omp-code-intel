# HIGH slice 5 — 5 findings across 5 files

## src/hunter/firewall/lexicon-types.ts
- **src/hunter/firewall/lexicon-types.ts:99-99** (bug)
  **mPSE is not frozen in makeLexiconDecision — asymmetry with frozen triplet allows silent alias divergence.**

`Object.freeze` is shallow, so the outer decision object is frozen, but `d.mPSE` (which is `base.mPSE` by reference) is NOT frozen. Meanwhile `d.triplet` IS frozen via `Object.freeze({ ...base.mPSE })`. This means:

1. External code can mutate `d.mPSE.Pattern = 'evil'` without a TypeScript or runtime error.
2. After mutation, `d.mPSE` and `d.triplet` diverge — the very alias desync the F-850 fix was designed to prevent.
3. `d.mPSE` is also the same object reference as the caller's `base.mPSE`, so the caller can silently corrupt the decision post-construction.

The `triplet` is correctly frozen; `mPSE` should receive the same treatment.
  ```existing
  return Object.freeze({ ...base, state: base.verdict, triplet: Object.freeze({ ...base.mPSE }) });
  ```
  ```suggested
  const frozenMPSE = Object.freeze({ ...base.mPSE });
  return Object.freeze({ ...base, mPSE: frozenMPSE, state: base.verdict, triplet: frozenMPSE });
  ```

## src/hunter/graph/resolver.ts
- **src/hunter/graph/resolver.ts:366-375** (bug)
  The outer `catch` block re-throws `e` as-is, but `db.exec('BEGIN')` (line 340) and `db.exec('COMMIT')` (line 365) are not wrapped in inner try/catch blocks that convert errors to `ResolverError`. If either throws a raw database driver error (e.g., I/O failure, lock contention, disk full), the caller receives an unwrapped error, breaking the `ResolverError` contract that all other failure paths in this function honor. Wrap `db.exec('BEGIN')` and `db.exec('COMMIT')` in their own try/catch, or wrap the final `throw e` to ensure consistency.
  ```existing
  } catch (e: unknown) {
      // ★ F-255 FIX (2026-09-24): a failed ROLLBACK leaves the DB partially committed — the old warn-only rethrew just the write error, hiding the suspect store. The rollback failure is folded into the thrown error (warn kept for the log trail).
      try { db.exec('ROLLBACK'); } catch (rbErr: unknown) {
        const rbMsg = rbErr instanceof Error ? rbErr.message : String(
  ```
  ```suggested
  } catch (e: unknown) {
      try { db.exec('ROLLBACK'); } catch (rbErr: unknown) {
        const rbMsg = rbErr instanceof Error ? rbErr.message : String(rbErr);
        const origMsg = e instanceof Error ? e.message : String(e);
        console.warn(`[resolver] ROLLBACK failed after resolutions write error: ${rbMsg} (original: ${origMsg})`);
        throw new ResolverError(`RESOLVER_FAILED: resolu
  ```

## src/hunter/lexicon/compiler.ts
- **src/hunter/lexicon/compiler.ts:115-126** (bug)
  The W16-HIGH fix was designed to prevent a TOCTOU race between fingerprinting and card extraction. However, this async implementation reintroduces a similar race: `Promise.all` reads each corpus file TWICE in parallel — once via `readFile` (for the hash) and once via `extractRuleCardsAsync` (for the cards). If a corpus file changes between the two reads, the hash is computed from the old content while the cards are extracted from the new content (or vice versa). The sync `batteryVersion` avoids this because `readFileSync` and `extractRuleCards` run sequentially on the same event, making interleaving impossible. For the async path, the two independent read streams open a window for concurrent corpus edits. Consider extracting the card data directly from the text read results (passing the already-read text to a `cardsFromLines`-style function) instead of re-reading files.
  ```existing
  const [texts, cards] = await Promise.all([
    Promise.all(profile.rules.corpus.map(async (p) => {
      let text: string;
      try {
        text = await readFile(p, 'utf8');
      } catch (e: unknown) {
        throw corpusUnreadable(p, String(e));
      }
      return `${p}\n${text}`;
    })),
    extractRuleCardsAsync(profile.rules.corpus),
  ]);
  ```
  ```suggested
  // Read each corpus file once, then derive both the hash input and the cards
  // from the SAME text — no TOCTOU, one file read per path.
  const texts = await Promise.all(profile.rules.corpus.map(async (p) => {
    let text: string;
    try {
      text = await readFile(p, 'utf8');
    } catch (e: unknown) {
      throw corpusUnreadable(p, String(e));
    }
    return `${p}\n${text}`;
  }));
  //
  ```

## src/omp/adapters/kev.ts
- **src/omp/adapters/kev.ts:148-153** (bug)
  When `ans.best` is undefined (the CLI omits the field), `best` defaults to `0` and the argmax fallback on lines 149–152 is **never triggered** — because `0` is a valid integer within `[0, dist.length)`. This means the verdict silently becomes `labels[0]` ("match") regardless of the actual distribution peak. For example, if `dist = [0.1, 0.7, 0.2]`, the correct verdict should be "drift" (index 1) but this code returns "match". The default should trigger the argmax path instead of hardcoding index 0.
  ```existing
  let best = ans.best?.[0] ?? 0;
      if (!Number.isInteger(best) || best < 0 || best >= dist.length) {
        let m = 0;
        for (let k = 1; k < dist.length; k++) if (dist[k]! > dist[m]!) m = k;
        best = m;
      }
  ```
  ```suggested
  let best = ans.best?.[0];
      if (best === undefined || !Number.isInteger(best) || best < 0 || best >= dist.length) {
        let m = 0;
        for (let k = 1; k < dist.length; k++) if (dist[k]! > dist[m]!) m = k;
        best = m;
      }
  ```

## src/omp/graph-gate.ts
- **src/omp/graph-gate.ts:76-89** (bug)
  `extractExportSymbols` in `graph-gate.ts` is significantly less complete than the parallel export parser `eachExportName` in `gate-middleware.ts` (which handles 5 regex forms). Specifically, this regex misses:
1. **Generator functions**: `export function* foo()` / `export async function* bar()` — the `*` is not in the alternation.
2. **Destructured exports**: `export const { a, b } = ...` / `export const [x, y] = ...` — no destructuring support.
3. **Default-exported named declarations**: `export default function foo()` / `export default class Bar` — the identifier after `default` is not extracted as a touched symbol.

Since `classifyEdit` uses `extractExportSymbols` to compute `touchedSymbols`, edits touching generator exports, destructured exports, or default-exported named declarations will have incomplete symbol lists. This can cause:
- Under-coverage: a graph query on the real symbol name won't match the (empty or partial) `touchedSymbols`, so the edit stays unverified even after a valid query.
- Incorrect severity classification when `structural` flag depends on `oldSyms.length > 0 || newSyms.length > 0`.

Consider unifying with `gate-middleware.ts`'s `eachExportName` (or extracting both to a shared utility).
  ```existing
  function extractExportSymbols(text: string): string[] {
  const out: string[] = [];
  const re = /\bexport\s+(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  const braceRe = /export\s*\{([^}]{1,400})\}/g;
  while ((m = braceRe.exec(text)) !== null) {
    for (c
  ```
  ```suggested
  function extractExportSymbols(text: string): string[] {
  const out: string[] = [];
  // Named declarations (including generators)
  const declRe = /\bexport\s+(?:async\s+)?function\*?\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m: RegExpExecArray | null;
  while ((m = declRe.exec(text)) !== null) out.push(m[1]);
  const classRe = /\bexport\s+(?:abstract\s+)?class\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while
  ```
