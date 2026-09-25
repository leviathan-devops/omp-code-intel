# HIGH slice 4 — 23 findings across 12 files

## src/hunter/firewall/readonly.ts
- **src/hunter/firewall/readonly.ts:108-111** (security)
  `sed -n` READ bypass via unquoted/flag-prefixed payloads: the carve-out only BLOCKs quoted non-range (`rest.startsWith('\''/"')`), so `sed -n s/foo/bar/p file` and `sed -n -e 's/x/y/'` miss both the range regex and the quote check, fall through to the `blockVerbExemption` narrow-splitter scan (which ignores `/` and quotes) returning null, then `routeSed()==READ` promotes to ALLOW_READ/BASH_READ. The promotion re-check `parsed.metacharacter===null` is vacuous (BYPASS already returned early) and does not prove the quoted-range was present. Only the exact quoted-range should be exempt; any other `sed -n` shape must stay BLOCKED as BASH_MUTATION/BYPASS.
  ```existing
  if (m) return null; // the whole command is the sanctioned range read — no other metachars possible
    // The quoted NON-range (a substitution smuggled in the quotes — 's/x/y/') must BLOCK:
    // the quote char is the detected metachar (the carve-out is EXACT — §7.2:3203-3211).
    if (rest.startsWith('\'') || rest.startsWith('"')) return '\'';
  ```
  ```suggested
  if (m) return null;
    // Fail-closed: any other `sed -n` shape (unquoted script, -e/-E flags,
    // quoted non-range) must BLOCK — do not fall through to the narrow scan.
    return '\''; // or return 's' / dedicated sed sentinel so classify BLOCKs
  ```
- **src/hunter/firewall/readonly.ts:158-163** (security)
  Narrow-splitter exemption lets `find -exec ... +` execute as ALLOW_READ: READ verbs (and block verbs) only scan for `| ; & > < \n $ \``. `find . -exec rm -rf / {} +` contains none of those (the `;` variant is caught, the `+` terminator is not) so it returns null and `READ_VERBS.has('find')` allows it. More generally backslash, glob (`* ? [ ]`), `#`, parens/braces are never scanned on these paths despite BYPASS_METACHARACTERS calling them load-bearing.
  ```existing
  if (READ_VERBS.has(firstToken)) {
    for (const ch of command) {
      if (NARROW_SPLITTERS.has(ch)) return ch;
    }
    return null;
  }
  ```
  ```suggested
  if (READ_VERBS.has(firstToken)) {
    // Deny-list dangerous read-verb options before the splitter scan, e.g.:
    // if (/\s(-exec|-execdir|-delete|-fls|-fprint|-ok)/.test(command)) return 'E';
    for (const ch of command) {
      if (NARROW_SPLITTERS.has(ch)) return ch;
    }
    return null;
  }
  ```
- **src/hunter/firewall/readonly.ts:196-200** (security)
  Git routing inspects only tokens[1], so `git <read-subverb> <write-payload>` is allowed: `git log --output=/tmp/out`, `git diff --output=file`, `git show --output=...` route as READ via `log/diff/show` and the narrow scan ignores `- = / .` so no splitter fires, then the READ branch allows a file-write primitive that bypasses the `>` guard. Flags before the subverb (`git --git-dir=... log`) fail closed, but trailing write flags do not.
  ```existing
  function routeGit(secondToken: string): 'READ' | 'MUTATION' | null {
  if (GIT_READ_SUBVERBS.has(secondToken)) return 'READ';
  if (GIT_MUTATION_SUBVERBS.has(secondToken)) return 'MUTATION';
  return null; // 'git' alone or an unrecognized sub-verb — the fail-closed -> BLOCKED
}
  ```
  ```suggested
  function routeGit(secondToken: string, restTokens: string[]): 'READ' | 'MUTATION' | null {
  // ... existing checks ...
  // if READ candidate but rest contains --output/--upload-pack/--receive-pack/-o etc => return 'MUTATION'
  return null;
}
  ```

## src/hunter/graph/corbell-adapter.ts
- **src/hunter/graph/corbell-adapter.ts:172-172** (bug)
  Async timeout leaks/reaps incorrectly: forceKillTimer is created inside the timeout closure and never cleared by done() (only timer/killTimer are cleared), `proc.on('exit')` is registered late (misses already-emitted exit → promise never settles on some interleavings), unref'd timers may let the process exit without settling, and only the direct child is killed — python grandchildren survive as orphans. Kill the process group / use detached:true, track and clear all timers, and prefer close over exit.
  ```existing
  const forceKillTimer = setTimeout(() => {
  ```
  ```suggested
  // Hoist: let forceKillTimer = null; clear it in done().
        // Spawn with {detached:true} and kill(-pid) to reap grandchildren.
        // Listen on 'close' (not late 'exit') and do not unref the timeout
        // if it is the only pending handle guarding a hung build.
  ```
- **src/hunter/graph/corbell-adapter.ts:263-263** (performance)
  Sync blocking retry starves the event loop: up to 8 attempts with Atomics.wait backoff (1s doubling capped at 16s ≈ up to ~2min blocked) plus clamped execSync timeouts. Async callers cannot interleave. Move retries to buildCorbellGraphAsync or document that defaultExec must never run on the serving loop.
  ```existing
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, backoff);
  ```
  ```suggested
  // Async alternative: await new Promise(r => setTimeout(r, backoff));
      // If sync contract must stay, cap total blocked time and note it in ExecFn docs.
  ```
- **src/hunter/graph/corbell-adapter.ts:751-751** (bug)
  Numeric enrichment silently misses integer thresholds and risks stack overflow: regex /(\d+\.\d+)/ only matches floats, so thresholds like `100`/`5` never populate comparator (downstream domain check stays silent), and Math.max(...nums) spreads an unbounded array. Also reads whole files synchronously with no size cap.
  ```existing
  const nums = [...src.matchAll(/(\d+\.\d+)/g)].map((m) => Number(m[1])).filter((n) => Number.isFinite(n));
  ```
  ```suggested
  const nums: number[] = [];
            for (const m of src.matchAll(/\b\d+(?:\.\d+)?\b/g)) { const n = Number(m[0]); if (Number.isFinite(n)) nums.push(n); }
            // cap file size before read; compute max via reduce, not spread.
  ```
- **src/hunter/graph/corbell-adapter.ts:938-938** (bug)
  Wrong-file fallback: whoCalls/chain/imports/awaits/unwired fall back to profile.project.root (a directory) when the node file is undefined (e.g. FOREIGN_PATH_UNRESOLVED degraded to undefined). Findings then attribute to the project dir instead of failing loud / marking unknown. Return undefined or throw rather than a directory.
  ```existing
  file: caller?.file ?? this.profile.project.root,
  ```
  ```suggested
  file: caller?.file ?? caller?.file /* required; degrade to '' + log, never a directory */,
  ```

## src/hunter/graph/graphify-adapter.ts
- **src/hunter/graph/graphify-adapter.ts:740-746** (bug)
  Endpoint locator uses un-normalized `e.src` instead of resolved `srcId`: `srcId/dstId` are derived from `source/src` + `target/dst` fallback, but the `source_location` fallback does `nodeByRawId.get(e.src)`. For edges carrying only `source/target` (real graphify schema, EN-041) `e.src` is undefined at runtime so the node locator is missed and `danglingNoLine` is inflated. Resolve via `srcId` (the same value used for `byId` lookup).
  ```existing
  const line = parseLineValue(edgeLoc)
      ?? srcNode?.line
      ?? tryResolveGraphifyLine(
        { data: (nodeByRawId.get(e.src)?.data ?? {}) as Record<string, unknown>,
          source_location: rawSourceLocation(nodeByRawId.get(e.src)) },
        rawEdge,
      );
  ```
  ```suggested
  const srcRaw = nodeByRawId.get(srcId);
    const line = parseLineValue(edgeLoc)
      ?? srcNode?.line
      ?? tryResolveGraphifyLine(
        { data: (srcRaw?.data ?? {}) as Record<string, unknown>,
          source_location: rawSourceLocation(srcRaw) },
        rawEdge,
      );
  ```
- **src/hunter/graph/graphify-adapter.ts:321-324** (security)
  Containment mixes real root with unresolved abs + fail-open on unresolvable root: base is `realpathSync` canonicalized but `abs` falls back to non-real `keep abs` when the file does not exist, so `relative()` compares different canonicalizations. Symlinked/nonexistent `../` escapes can be misjudged as contained, and the `rootReal===null` early-return keeps loader-written absolute anchors (fail-open) while `projectGraphifyGraph` drops them (fail-closed) — stages disagree.
  ```existing
  const abs = path.isAbsolute(f) ? f : path.resolve(rootReal, f);
      let real = abs;
      try { real = fs.realpathSync(abs); } catch { /* keep abs */ }
      const rel = path.relative(rootReal, real);
  ```
  ```suggested
  const abs = path.isAbsolute(f) ? path.normalize(f) : path.resolve(rootReal, f);
      // Fail-closed: without realpath proof containment cannot be proven for
      // symlinked/missing paths — drop the anchor instead of trusting lexical abs.
      let real: string | null = null;
      try { real = fs.realpathSync(abs); } catch { real = null; }
      if (real === null) continue; // or safeFile = ""
  ```

## src/hunter/graph/interface.ts
- **src/hunter/graph/interface.ts:233-235** (bug)
  Null-profile guard crashes while building the ADAPTER_FAILED detail: the condition short-circuits on `!profile`, but the `throw adapterFailed(...)` argument dereferences `(profile as ...).graph` without `?.` after `profile`. `selectAdapter(null/undefined)` therefore throws a raw `TypeError: Cannot read properties of null (reading 'graph')` instead of the intended named `ADAPTER_FAILED`, defeating the F-903 loud-fail contract this guard was added for.
  ```existing
  if (!profile || typeof (profile as unknown as { graph?: { substrate?: unknown } }).graph?.substrate !== 'string') {
      throw adapterFailed(
        `substrate=${String((profile as unknown as { graph?: { substrate?: unknown } }).graph?.substrate)}`,
  ```
  ```suggested
  if (!profile || typeof (profile as unknown as { graph?: { substrate?: unknown } } | null | undefined)?.graph?.substrate !== 'string') {
      throw adapterFailed(
        `substrate=${String((profile as unknown as { graph?: { substrate?: unknown } } | null | undefined)?.graph?.substrate)}`,
  ```

## src/hunter/keys/go-key-pool.ts
- **src/hunter/keys/go-key-pool.ts:236-243** (bug)
  Cache is FIFO, not LRU, and delete-first does not fix mid-transaction close. A hit (`poolDbByPath.get(want)`) never refreshes recency (no delete+set), so the hottest path can be evicted as 'oldest'. Worse, `toClose` is still closed synchronously inline while another frame may hold that handle between `BEGIN IMMEDIATE` and `COMMIT` in `markGoKeyDead` — cross-path re-entrant `db()` evicts and closes the held handle, yielding 'database is closed' mid-transaction. Fix recency on hit and defer close (refcount or idle-close queue) instead of immediate `close()`.
  ```existing
  const toClose: Database[] = [];
  while (poolDbByPath.size > POOL_DB_LRU_MAX) {
    const oldest = poolDbByPath.keys().next();
    if (oldest.done) break;
    const evicted = poolDbByPath.get(oldest.value);
    poolDbByPath.delete(oldest.value);
    if (evicted && evicted !== fresh) toClose.push(evicted);
  }
  ```
  ```suggested
  // refresh recency on hit (in db() hit path):
  // poolDbByPath.delete(want); poolDbByPath.set(want, hit);
  // defer evicted close until no transaction holds it (refcount / idle queue)
  // instead of immediate db.close() here.
  ```
- **src/hunter/keys/go-key-pool.ts:192-193** (security)
  TOCTOU: `new Database(want)` follows symlinks. The O_EXCL pre-create refuses a plant at create time, but an attacker swapping file→symlink after the `EEXIST+hardenPoolFile` step and before SQLite opens it causes SQLite to open/create through the link; the post-open `lstat` refusal is too late (victim already touched). Sidecar hardening also swallows `ELOOP` (`catch {}`), so a `-wal`/`-shm` symlink plant is silently ignored while SQLite opens sidecars without `O_NOFOLLOW`. Consider opening via `O_NOFOLLOW` fd / refusing if `lstat` shows symlink immediately before open in a tight loop, and fail-closed (delete plant or throw) on sidecar `ELOOP` instead of best-effort swallow.
  ```existing
  const fresh = new Database(want, { create: true });
  try { hardenPoolFile(want); } catch { /* fs may already restrict */ }
  ```
- **src/hunter/keys/go-key-pool.ts:400-401** (bug)
  Re-home can hit PRIMARY KEY collision and lose the exile. On a swap reorder (idx0 holds keyid-B, idx1 holds keyid-A), marking idx0 finds `home=1` which is already occupied, so `UPDATE ... SET idx=?` violates `idx PRIMARY KEY` → transaction rolls back → `markGoKeyDead` returns 0 (no exile) and the still-limited key is hammered. Need collision handling (swap, DELETE occupant first, or keyid-primary-key schema) plus test for swap-reorder mark.
  ```existing
  if (home >= 0 && home !== idx) {
          conn.run('UPDATE go_key_pool SET idx = ? WHERE keyid = ? AND idx = ?', [home, displaced.keyid, idx]);
  ```
  ```suggested
  if (home >= 0 && home !== idx) {
          // handle occupant at home first (move/delete) or use keyid as PK
          conn.run('DELETE FROM go_key_pool WHERE idx = ?', [home]);
          conn.run('UPDATE go_key_pool SET idx = ? WHERE keyid = ? AND idx = ?', [home, displaced.keyid, idx]);
  ```

## src/hunter/lexicon/compiler.ts
- **src/hunter/lexicon/compiler.ts:236-246** (bug)
  Version-vs-cards double-read skew (TOCTOU): `batteryVersionAsync` reads corpus bytes + extracts cards for the fingerprint, then `compileBattery` re-extracts via `extractRuleCardsAsync` for compilation. A concurrent corpus edit between the two passes makes the fingerprint describe different bytes than those compiled, violating K20.3 determinism and risking a mislabeled cached battery. Fix: single extraction — e.g. have version function return `{version, cards, corpusText}` or accept pre-read cards/texts, and reuse them for compile.
  ```existing
  const version = await batteryVersionAsync(profile);
  if (db) {
    const row = db.prepare('SELECT COUNT(*) AS c FROM compiled_predicates WHERE battery_version = ?').get(version);
    if (Number(row?.['c'] ?? 0) > 0) {
      return { battery: loadBattery(db, version), batteryVersion: version, fromCache: true };
    }
  }
  // ★ F-704 FIX (2026-09-24): the async extractor — the sync readFileSync pa
  ```
  ```suggested
  const { version, cards } = await batteryVersionWithCardsAsync(profile);
// ... cache lookup ...
// const cards already available — do not re-extract
const battery = [...compileCards(cards, profile, version), ...compileDeclared(profile, version)];
  ```
- **src/hunter/lexicon/compiler.ts:262-267** (bug)
  Silent severity fallback violates fail-closed law: any missing/invalid `severity` (typo like 'HIGG', number, object) coerces to 'HIGH' instead of throwing a named error. Hides binding typos and diverges from D13/TEMPLATE_BINDING loud-error handling. Fix: default only on `undefined`/absent, throw `LexiconError('SEVERITY_UNKNOWN', ...)` on present-but-invalid.
  ```existing
  function severityFromBinding(v: unknown): Severity {
  if (typeof v === 'string' && (SEVERITIES as readonly string[]).includes(v)) {
    return v as Severity;
  }
  return 'HIGH';
}
  ```
  ```suggested
  function severityFromBinding(v: unknown, ctx: string): Severity {
  if (v === undefined) return 'HIGH';
  if (typeof v === 'string' && (SEVERITIES as readonly string[]).includes(v)) return v as Severity;
  throw new LexiconError('SEVERITY_UNKNOWN', `SEVERITY_UNKNOWN: ${ctx} carries invalid severity '${String(v)}' (expected ${SEVERITIES.join('|')})`);
}
  ```

## src/hunter/shared/containment.ts
- **src/hunter/shared/containment.ts:101-101** (bug)
  checkContained documents NEVER throws but can throw on three paths, so callers relying on no-throw get an uncaught exception. realNearest rethrows non-ENOENT/ENOTDIR (EACCES/ELOOP), the root fallback `realNearest(root)` can throw the same way, and insideRoot/rootPrefixOf throws on empty root. Either the contract or the code is wrong.
  ```existing
  * THE CHECK — resolve both sides and answer containment. NEVER throws; the caller owns the
  ```
  ```suggested
  // Either narrow the contract: `MAY throw EACCES/ELOOP/CONTAINMENT_BAD_ROOT`,
// or make it total, e.g.:
// try { real = realNearest(target); } catch { return { real: path.resolve(target), rootReal, contained: false, resolved: false }; }
  ```
- **src/hunter/shared/containment.ts:79-80** (security)
  maxClimb truncation silently degrades to a string-prefix check. When the missing chain is deeper than maxClimb (default 12) the walk gives up and returns `path.resolve` spelling without following any symlinks; that spelling can then satisfy insideRoot while the real filesystem path escapes. Non-existing segments can't themselves be links, but the unreached existing ancestor can. A fixed depth bound should not decide a security check.
  ```existing
  // nothing on the chain resolved: return the resolved spelling (loudly wrong beats silently absent)
  return abs;
  ```
  ```suggested
  // Climb until filesystem root (parent===dir already bounds it), or fail closed:
// for (;;) { ... } // no maxClimb
// and/or on budget exhaustion: throw / return contained:false with resolved:false
// so requireContained cannot return the unresolved spelling as safe.
  ```

## src/hunter/shared/line-resolve.ts
- **src/hunter/shared/line-resolve.ts:26-30** (bug)
  Missing null guard on `node` violates the `Never throws` contract. `node.data`/`node.line` throws `TypeError: Cannot read properties of null` when callers pass null/undefined, escaping as an unrouted exception instead of the named `LINELESS_NODE` refusal the micro-loop maps to INCONCLUSIVE.
  ```existing
  export function tryResolveLine(
  node: { line?: unknown; data?: Record<string, unknown>; source_location?: unknown },
  edge?: { source_location?: unknown; metadata?: unknown } | null,
): number | undefined {
  const data = node.data ?? {};
  ```
  ```suggested
  export function tryResolveLine(
  node: { line?: unknown; data?: Record<string, unknown>; source_location?: unknown } | null | undefined,
  edge?: { source_location?: unknown; metadata?: unknown } | null,
): number | undefined {
  if (node == null || typeof node !== "object") {
    // Null node: no node fields to walk, but still try edge-only candidates
    // so the "Never throws" + LINELESS_NODE
  ```

## src/hydra/auditor.ts
- **src/hydra/auditor.ts:189-192** (security)
  The grep tool (both `rg` and `grep -r` fallback) follows symlinks by default when traversing directories inside `targetRoot`. Unlike the `read` tool (which uses `isWithinRoot` + `O_NOFOLLOW`) and the `write_findings` tool (which validates the pinned path against `ledgerDir` + `O_NOFOLLOW`), the grep tool has NO symlink containment. A symlink inside targetRoot pointing to `/etc/shadow` or any external directory would yield matches (and printed file paths) from outside the containment boundary. This is the only tool in the belt that leaks data through symlinks.

Suggestion: After grep returns, filter output lines to only include those whose file path resolves inside targetRoot (a post-hoc containment gate), or use `rg --no-follow` / `grep -P` equivalents where feasible, or run the grep in a subprocess with a chroot/namespace constraint.
  ```existing
  let out = await run("rg", ["-n", "--max-count", String(maxResults), "--", pattern, targetRoot]);
      if (out.startsWith("SEARCH_FAILED") || out.length === 0) {
        out = await run("grep", ["-rn", "-E", "-m", String(maxResults), "--", pattern, targetRoot]);
      }
  ```

## src/omp/adapters/kev.ts
- **src/omp/adapters/kev.ts:119-120** (bug)
  The `out.split("\n").reverse().find(...)` heuristic to extract JSON from CLI stdout is fragile and error-prone. If the CLI emits debug lines, warnings, or progress indicators to stdout (e.g., `{"debug": true}` or a truncated `{"partial...`), this picks up the wrong line. The try/catch around `JSON.parse` prevents a crash, but the wrong object could silently pass all downstream checks (ok, distribution, uniform) and produce a fabricated verdict. A safer approach is to use a structured protocol: scan only lines that begin with `{` AND contain `"ok"`, or better yet, capture stderr for diagnostics and treat stdout as exclusively JSON.
  ```existing
  const line = out.split("\n").reverse().find((l) => l.trim().startsWith("{"));
      if (line === undefined) throw new Error(`GI_ENFORCE_KEV: the KEV CLI printed no JSON — output: ${out.slice(0, 200)}`);
  ```
  ```suggested
  // Prefer a JSON object that looks like a real KEV answer (has "ok" field)
      const candidates = out.split("\n").filter((l) => l.trim().startsWith("{") && l.includes('"ok"'));
      const line = candidates[candidates.length - 1];
      if (line === undefined) throw new Error(`GI_ENFORCE_KEV: the KEV CLI printed no JSON — output: ${out.slice(0, 200)}`);
  ```
- **src/omp/adapters/kev.ts:107-112** (performance)
  The synchronous `execFileSync` with a 120-second timeout blocks the calling thread entirely. In any concurrent or server-based probe runner, a slow or hung CLI process will block the event loop for up to two minutes, creating a denial-of-service risk for other probes. The F-1206 NOTE acknowledges this as deferred, but it remains a live issue. The recommended mitigation is to migrate `facts()` to an async signature and use `execFile` (callback/promise-based), or offload to a worker thread.
  ```existing
  out = execFileSync(process.execPath, [cli, "--json", JSON.stringify({ state: buildState(scopeRoot, subject), questions: [MEANING_QUESTION] })], {
          encoding: "utf8",
          timeout: 120_000,
          maxBuffer: 8 * 1024 * 1024,
          cwd: scopeRoot,
        });
  ```

## src/omp/gate-middleware.ts
- **src/omp/gate-middleware.ts:112-112** (bug)
  `runGraphGate` reads `process.env.GI_ALLOW_NO_STORE` directly (line ~101) instead of accepting a configurable `env` parameter like `resolveDial` does. This inconsistency means: (1) the bypass decision cannot be unit-tested without mutating the global `process.env`, (2) concurrent test runs can interfere with each other, and (3) the gate's security-relevant behavior (fail-closed vs bypass) is harder to verify in isolation. Consider threading the same `env` parameter through `GateInput` or as a second argument, consistent with `resolveDial`'s pattern.
  ```existing
  if ((process.env.GI_ALLOW_NO_STORE ?? "") === "1") {
  ```
  ```suggested
  // Add env to GateInput or pass as parameter:
    if ((input.env?.GI_ALLOW_NO_STORE ?? process.env.GI_ALLOW_NO_STORE ?? "") === "1") {
  ```

## src/omp/populate.ts
- **src/omp/populate.ts:82-84** (bug)
  `db.close()` is not guarded by try/catch in the corbell path. If `close()` throws (e.g., I/O error on flush, corrupted DB handle), the exception propagates out of the finally block and masks the return value — including the `metaDegraded` flag. The graphify path already wraps close correctly (`try { db.close(); } catch { ... }`). Apply the same pattern here.
  ```existing
  } finally {
      db.close();
    }
  ```
  ```suggested
  } finally {
      try { db.close(); } catch { /* close best-effort */ }
    }
  ```
