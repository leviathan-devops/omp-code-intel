# HIGH slice 3 — 2 findings across 2 files

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
