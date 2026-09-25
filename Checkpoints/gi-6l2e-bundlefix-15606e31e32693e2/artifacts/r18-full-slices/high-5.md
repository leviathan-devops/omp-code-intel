# HIGH slice 5 — 6 findings across 5 files

## src/hunter/graph/merge.ts
- **src/hunter/graph/merge.ts:132-165** (bug)
  When `mechExact` exists (a semantic triple matches a mechanical triple exactly) but `mergedByKey.get(k)` returns `undefined`, this branch pushes a **new** semantic-only row with `source: 'semantic'`. However, the mechanical triple was already emitted by the mechanical loop above with `source: 'mechanical'` (line 73-83). This creates two output rows for the same `tripleKey`: one mechanical, one semantic — a duplicate that should instead have been merged into a single `source: 'both'` row.

The `mergedByKey.get(k)` can be `undefined` only if the mechanical loop deduplicated the key away (`seenMechanicalKeys`), which means there's exactly one mechanical row in `merged` with that key. The fix is to check `merged` directly (or ensure the mechanical loop always populates `mergedByKey`) and upgrade in-place, or fall back to building the `source: 'both'` row with anchor inheritance here. As-is, downstream consumers see double-counted triples with inconsistent `source` tags.
  ```existing
  // ★ R15H5 FIX (2026-09-25): the old form pushed a SECOND row with the same
      //   tripleKey as the mechanical row already emitted (and indexed in
      //   mergedByKey) — identical triples were doubled and counts skewed
      //   downstream. Upgrade the emitted row in place: source='both', the
      //   semantic evidence/confidence, the mechanical file:line anchor.
      const existing = m
  ```
  ```suggested
  const existing = mergedByKey.get(k);
      if (existing) {
        existing.source = 'both';
        existing.evidence = s.evidence.trim().slice(0, 500);
        existing.confidence = s.confidence;
        existing.file = anchor.file || s.file;
        existing.line = anchor.line || s.line;
        existing.subjectKind = s.subjectKind ?? anchor.subjectKind;
        existing.objectKind = s.objectKi
  ```

## src/hunter/lexicon/rule-card.ts
- **src/hunter/lexicon/rule-card.ts:0-0** (bug)
  readDeclaredMeta scans ahead for metadata lines but cardsFromLines does not advance the loop index i past them. When subsequent lines match isRuleShaped or isQuotedPassage, spurious cards are created from metadata lines, violating determinism. The fix is to return the number of lines consumed from readDeclaredMeta and advance i accordingly.
  ```existing
  function readDeclaredMeta(lines: string[], start: number): { classification?: Classification; severity?: Severity } {
  const meta: { classification?: Classification; severity?: Severity } = {};
  for (let i = start; i < lines.length && i < start + META_SCAN_WINDOW; i++) {
    const line = lines[i];
    if (line.trim() === '') break;                       // the blank line ends the metadata block

  ```
  ```suggested
  function readDeclaredMeta(lines: string[], start: number): { classification?: Classification; severity?: Severity; consumed: number } {
  const meta: { classification?: Classification; severity?: Severity } = {};
  let consumed = 0;
  for (let i = start; i < lines.length && i < start + META_SCAN_WINDOW; i++) {
    const line = lines[i];
    if (line.trim() === '') break;
    const cm = line.match(
  ```

## src/omp/adapters/tsg.ts
- **src/omp/adapters/tsg.ts:131-131** (security)
  The redaction function preserves the first 4 characters of the API key in error messages via `key.slice(0, 4) + '...[redacted]'`. This leaks a key prefix that can identify the key type, narrow the key space for brute-force attacks, or correlate with other leaked data. For keys between 8–15 characters (which skip the 8-gram pass entirely), only this partial redaction applies, making the leak proportionally larger. Replace with a fully opaque placeholder.
  ```existing
  let out: string = s.split(key).join(key.slice(0, 4) + '...[redacted]');
  ```
  ```suggested
  let out: string = s.split(key).join('[REDACTED]');
  ```

## src/omp/calibration.ts
- **src/omp/calibration.ts:113-114** (bug)
  Health check uses a different half-width threshold (0.15) than the `sufficient` field (0.10) in `precisionFromCounts`. A rule with halfWidth in (0.10, 0.15] has `sufficient=false` (meaning the evidence isn't strong enough to set a threshold from) but is NOT flagged by the health check as 'n too small'. Conversely, `derivePolicy` uses a completely different criterion (`minFiresForAct` count) rather than checking either `est.sufficient` or halfWidth. This means the 'is evidence sufficient?' question has three inconsistent answers within the same file, making the system's behavior unpredictable: a rule can pass `derivePolicy`'s sufficiency gate, fail `precisionFromCounts.sufficient`, and not be flagged by the health check — or any combination thereof.
  ```existing
  sufficient: Math.max(centre - low, high - centre) <= 0.10,
    starved: false,
  ```
  ```suggested
  sufficient: Math.max(centre - low, high - centre) <= 0.10,
    starved: false,
// In derivePolicy, also gate on est.sufficient before using the measured lower bound:
//   if (!est.sufficient) { /* treat as uncalibrated */ }
// In checkCalibrationHealth, use the same threshold as sufficient:
//   if (!est.starved && !est.sufficient) findings.push(...);
// Or extract a shared constant: const SUFFICI
  ```
- **src/omp/calibration.ts:203-208** (bug)
  The `checkCalibrationHealth` regression detector does not verify the `flag <= act` invariant — the most critical structural property for the decision kernel (flag > act empties the ESCALATE band and inverts escalation). Specifically, when `act` falls in approximately [0.05, 0.10], `calFlag` equals `act` (the `Math.max(0.05, ...)` floor pushes flag up to act, and `Math.min(act, ...)` caps it at act), creating an empty ESCALATE band (`p >= flag && p < act` is unsatisfiable when flag === act). The previous F-836 fix corrected `derivePolicy` to enforce this invariant, but the health check only catches `act < 0.05` as 'degenerate' and misses this adjacent case where the escalation zone has zero width. Consider flagging `flag >= act` (or `flag === act` when act > 0.05) as a finding.
  ```existing
  for (const p of policies) {
    const counts = ledgersByRule[p.ruleId];
    if (counts === undefined) { findings.push(`${p.ruleId}: NO LEDGER — threshold is uncalibrated (${p.basis})`); continue; }
    const est = precisionFromCounts(counts);
    // TRAP: starvation — paying for judgments and using none.
    if (est.starved) findings.push(`${p.ruleId}: STARVED — the act band has never fired (0 res
  ```
  ```suggested
  for (const p of policies) {
    const counts = ledgersByRule[p.ruleId];
    if (counts === undefined) { findings.push(`${p.ruleId}: NO LEDGER — threshold is uncalibrated (${p.basis})`); continue; }
    // INVARIANT: flag must never exceed act — the ESCALATE band is [flag, act).
    if (p.flag > p.act) findings.push(`${p.ruleId}: INVARIANT VIOLATION — flag=${p.flag.toFixed(3)} > act=${p.act.toFixed
  ```

## src/omp/populate-corbell.ts
- **src/omp/populate-corbell.ts:129-129** (bug)
  **Unused parameter `storePath`**: The `storePath` parameter is never referenced in the function body. The function always derives the warm store path via `corbellCheckoutPath(root)` and uses that for both the freshness probe and the SQLite open. This is likely a bug — the caller's `storePath` may differ from `corbellCheckoutPath(root)`, meaning the function always reads from the hardcoded warm checkout path regardless of what the caller intends. If `storePath` was intended for the *destination* store (the session store written by `openTypedStore`), it's being shadowed by the local variable assignment. Review and either use `storePath` where appropriate or remove it from the signature to avoid misleading callers.
  ```existing
  export function populateFromCorbellCheckout(storePath: string, root: string, runTag: string): CorbellPopulateResult {
  ```
  ```suggested
  // If storePath is the warm checkout path, use it directly instead of deriving:
// const warmPath = storePath;
// If storePath is the destination session store, rename the parameter for clarity
// and pass it to openTypedStore(storePath) below.
  ```
