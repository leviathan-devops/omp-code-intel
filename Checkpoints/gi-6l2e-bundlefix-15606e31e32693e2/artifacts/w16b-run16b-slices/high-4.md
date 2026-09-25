# HIGH slice 4 — 4 findings across 3 files

## src/kernel/graph-pre-flight.ts
- **src/kernel/graph-pre-flight.ts:38-41** (bug)
  **`impactInDb` truncation silently ignored**: `impactInDb` caps its ledger at 5000 rows and sets `truncated: true` when the cap is hit (see `typed-write.ts:1119-1146`). `preFlight` never checks `imp.truncated`, so when a large graph is encountered, `imp.reaches` is under-reported (it equals `ledger.length`, not actual reachability). This silently produces an incorrect `commitStrategy` — e.g., a graph with 100 real reachable nodes but only 49 ledgered would get `"split"` instead of `"domain-level"`. A warning should be emitted when `imp.truncated` is true, mirroring the existing `NO CONSUMERS` and `WIDE BLAST RADIUS` patterns.
  ```existing
  const imp = impactInDb(db, target, 8);

    const byDepth: Record<number, number> = {};
    for (const row of imp.ledger) byDepth[row.depth] = (byDepth[row.depth] ?? 0) + 1;
  ```
  ```suggested
  const imp = impactInDb(db, target, 8);
    if (imp.truncated) warnings.push(`IMPACT TRUNCATED: blast-radius ledger capped at 5000 rows — reachability UNDER-REPORTED for ${target}; commit strategy may be too lenient`);

    const byDepth: Record<number, number> = {};
    for (const row of imp.ledger) byDepth[row.depth] = (byDepth[row.depth] ?? 0) + 1;
  ```

## src/omp/kernel-v2.ts
- **src/omp/kernel-v2.ts:561-561** (bug)
  Unsafe type assertion: `d.action as GateAdjudication["action"]` silently accepts any string returned by `gate.judge()`. If the gate returns an unexpected action value (e.g. "ALLOW"), this cast would mask the invalid value and downstream code would treat it as FIRE/ESCALATE/IGNORE without any runtime validation. Add a guard to reject unknown action values.
  ```existing
  action: d.action as GateAdjudication["action"],
  ```
  ```suggested
  action: validateAction(d.action),

// ... add helper:
const VALID_ACTIONS = new Set<GateAdjudication["action"]>(["FIRE", "ESCALATE", "IGNORE"]);
function validateAction(action: string): GateAdjudication["action"] {
  if (!VALID_ACTIONS.has(action as GateAdjudication["action"])) {
    throw new Error(`unexpected gate action: ${action}`);
  }
  return action as GateAdjudication["action"];
}
  ```

## src/omp/populate-graphify.ts
- **src/omp/populate-graphify.ts:174-195** (bug)
  **`walkFailed` check at line 174 is dead code — walk failures are silently ignored.**

The check `if (walkFailed) return { fresh: false, reason: "stale-read-failed" }` is placed at line 174, AFTER the `walk` function definition but BEFORE the `for` loop at line 175 that actually calls `walk()`. Since `walkFailed` is only set to `true` inside `walk()` (line 144), and `walk()` is only invoked from line 190 inside the scope loop, `walkFailed` is always `false` when checked at line 174.

After `walk()` sets `walkFailed = true` during the scope loop, the flag is never checked again. The probe continues and may reach the mtime comparison (line 205) based on partial data, potentially reporting "fresh" when a directory that failed `realpathSync` contained newer files.

The `stale-read-failed` reason was clearly intended as a fail-closed path (per the F-846 FIX comment), but it can never be reached. Move the check to AFTER the scope loop (alongside the `filesSeen` and `exhausted` checks at lines 194-195), or check it inside the loop after each `walk()` call.
  ```existing
  if (walkFailed) return { fresh: false, reason: "stale-read-failed" };
  for (const rel of scope) {
    const target = containedScopeTarget(root, rel);
    if (target === null) continue;
    // V21 cleanup fix-now: a scope entry may be a FILE — stat it directly
    // (walk() on a file throws ENOTDIR and silently counted nothing).
    let stTarget: fs.Stats | null = null;
    try { stTarget = fs.st
  ```
  ```suggested
  for (const rel of scope) {
    const target = containedScopeTarget(root, rel);
    if (target === null) continue;
    let stTarget: fs.Stats | null = null;
    try { stTarget = fs.statSync(target); } catch { stTarget = null; }
    if (stTarget?.isFile()) {
      const base = path.basename(target);
      if (excludes.includes(base)) continue;
      if (stTarget.mtimeMs > newest) newest = stTarget.m
  ```
- **src/omp/populate-graphify.ts:296-307** (bug)
  **`hashSourceTree` walk does NOT skip files matching `excludes` — inconsistency with `isGraphifyCheckoutFreshFor`.**

In `isGraphifyCheckoutFreshFor` (line 164), the file branch checks `if (excludes.includes(entry.name)) continue;` before counting the file toward the budget and mtime. But in `hashSourceTree` (lines 296-307), the file branch has NO such check — all matching extension files are hashed regardless of `excludes`.

This means a user-configured `excludes` entry for a file (e.g. `"debug-helper.ts"`) will:
1. Be skipped by the freshness probe's mtime walk (not triggering staleness via mtime)
2. Still be included in the content hash (triggering `stale-content` if it changes)

The net effect is that excluding a file by name does NOT prevent it from invalidating the content hash sidecar, undermining the purpose of the `excludes` configuration. Add `if (excludes.includes(entry.name)) continue;` in the file branch of `hashSourceTree`'s walk (and fold the filename into the digest as `skip-excluded:` so the hash remains deterministic).
  ```existing
  } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        budget.n--;
        try {
          const stat = fs.statSync(path.join(dir, entry.name));
          hashFile(path.join(dir, entry.name), `${prefix}${entry.name}`, stat.size);
        } catch {
          // frozen-scan HIGH: an unreadable file is NOT silently omitted
  ```
  ```suggested
  } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        if (excludes.includes(entry.name)) {
          hash.update(`skip-excluded:${prefix}${entry.name}\n`);
          continue;
        }
        budget.n--;
        try {
          const stat = fs.statSync(path.join(dir, entry.name));
          hashFile(path.join(dir, en
  ```
