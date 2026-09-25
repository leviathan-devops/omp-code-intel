# HIGH slice 2 — 7 findings across 6 files

## src/hunter/diagnostics/fixture-calibration.ts
- **src/hunter/diagnostics/fixture-calibration.ts:194-199** (maintainability)
  Duplicated path-containment logic between loadFireFixture and loadGoldenFixture (identical ~15-line block: lexical spelling check, `requireContained` call, and error callbacks). A future security fix applied to one loader but not the other would reintroduce the F-702/F-931 class vulnerability. Extract a shared helper, e.g. `resolveContainedSource(dir, sourceFile, fixtureKind): string` that performs both the lexical escape check and the symlink-aware `requireContained` call, then use it in both loaders.
  ```existing
  const contained = requireContained(
    spelled,
    dir,
    ({ real }) => { throw new Error(`CALIBRATION_FIXTURE_INVALID: fire fixture ${dir} sourceFile '${manifest.sourceFile}' escapes the fixture directory (realpath ${real})`); },
  );
  const source = fs.readFileSync(contained, 'utf8');
  ```
  ```suggested
  /** Resolve sourceFile against dir with both lexical and symlink containment checks.
 *  Called by both loadFireFixture and loadGoldenFixture to keep the security
 *  invariant (F-702, F-931) in a single enforceable location. */
function resolveContainedSource(dir: string, sourceFile: string, fixtureKind: 'fire' | 'golden'): string {
  const spelled = path.resolve(dir, sourceFile);
  const dirSpel
  ```

## src/hunter/graph/mechanical.ts
- **src/hunter/graph/mechanical.ts:272-280** (bug)
  Bug: Call/new expression callee resolution only matches simple identifiers, silently dropping call edges for all member/qualified/calculated invocations. For `A.B()`, `obj.method()`, `arr.forEach(cb)`, `foo()()`, `this.init()`, etc., `node.expression` is a PropertyAccessExpression, ElementAccessExpression, CallExpression, etc., and `ts.isIdentifier(node.expression)` returns false — so no `calls`/`awaits` triple is emitted. This is a significant gap: any call-graph query (whoCalls, callChains) will miss all method-on-method call edges, which dominate real codebases. Consider walking PropertyAccessExpression to extract the `.name` text (or for deeper chains like `a.b.c()`, at minimum extract the leaf method name), and handling ElementAccessExpression/CallExpression callees as a best-effort fallback.
  ```existing
  if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && ts.isIdentifier(node.expression)) {
          const callee = node.expression.text;
          const inAwait = parent !== undefined && ts.isAwaitExpression(parent);
          const callerId = currentFnId ?? fileCanon;
          const pred: Predicate = inAwait ? 'awaits' : 'calls';
          const callLine = lineOf(sf, node);
          co
  ```
  ```suggested
  if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
          const expr = node.expression;
          let calleeName: string | undefined;
          if (ts.isIdentifier(expr)) {
            calleeName = expr.text;
          } else if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.name)) {
            // A.B(), obj.method(), this.init() — extract the leaf method name
         
  ```
- **src/hunter/graph/mechanical.ts:216-220** (bug)
  Bug: Default-exported declarations (`export default class Foo {}`, `export default function bar() {}`) are parsed by the TypeScript AST as ExportAssignment nodes, not as standalone ClassDeclaration/FunctionDeclaration. The F-821b block at line 175 explicitly excludes ExportAssignment (`!ts.isExportAssignment(stmt)`), and the ExportAssignment handler at line 216 only emits `exports -> default:module` without extracting the contained declaration. Result: no `declares class:Foo` or `declares fn:bar` triple is ever emitted for the default-exported entity — it becomes invisible to any graph join on its canonical name. The ExportAssignment handler should inspect `stmt.expression` to extract the declaration name and emit the corresponding `declares` triple.
  ```existing
  if (ts.isExportAssignment(stmt)) {
        const expLine = lineOf(sf, stmt);
        const expEvidence = evidenceQuoteForNode(sf, stmt);
        pushTriple(fileCanon, 'exports', `default:${moduleCanon}`, expEvidence, relPosix, expLine);
      }
  ```
  ```suggested
  if (ts.isExportAssignment(stmt)) {
        const expLine = lineOf(sf, stmt);
        const expEvidence = evidenceQuoteForNode(sf, stmt);
        pushTriple(fileCanon, 'exports', `default:${moduleCanon}`, expEvidence, relPosix, expLine);
        // Extract the declaration name from the default export so it also has a declares triple.
        const expr = stmt.expression;
        if (ts.isClassDecla
  ```

## src/hunter/harness/recon.ts
- **src/hunter/harness/recon.ts:198-200** (bug)
  If db.close() throws, the thrown exception will replace any in-flight error from the try block, masking the real failure reason from upstream callers. This is especially problematic because the recon function's callers expect specific named errors (PROFILE_INVALID / CORPUS_MISSING / HISTORY_MISSING) to route to INCONCLUSIVE - a masked error could cause incorrect micro-loop routing.
  ```existing
  } finally {
    db.close();
  }
  ```
  ```suggested
  } finally {
    try {
      db.close();
    } catch (_closeErr) {
      // Swallow close errors to avoid masking the primary error.
    }
  }
  ```

## src/hunter/surface/lsp-injector.ts
- **src/hunter/surface/lsp-injector.ts:245-263** (security)
  **ReDoS vulnerability remains despite the guard.** The `GLOB_MAX_STARS=8` and `GLOB_MAX_LEN=200` checks are necessary but not sufficient. A pattern like `*a*a*a*a*a*a*a*a` (8 stars, 15 chars — passes both guards) compiles to `.*a.*a.*a.*a.*a.*a.*a.*a`. On a non-matching string with many `a` characters (e.g., `"aaaaaaaaaaaaaaaaab"` — 16 `a`s followed by `b`), the regex engine must try exponentially many partitions of the `.*` groups, causing catastrophic backtracking. The same vulnerability exists in the duplicate copy in `resolveTouchedFiles`. Both the `globToRegExp` method and the inline copy in `resolveTouchedFiles` need this fixed.
  ```existing
  /** ★ F-1205 FIX (2026-09-25): the glob→RegExp compiler shared with the in-memory
   *  branch below (F-32/F-49 escaping + F-1043 ReDoS guards) — one compiler, so the DB
   *  expansion and the state-key expansion cannot diverge. Null = refuse (never invent). */
  private globToRegExp(candidate: string): RegExp | null {
    const GLOB_MAX_LEN = 200;
    const GLOB_MAX_STARS = 8;
    if (candidate.
  ```
  ```suggested
  private globToRegExp(candidate: string): RegExp | null {
    const GLOB_MAX_LEN = 200;
    const GLOB_MAX_STARS = 8;
    if (candidate.length > GLOB_MAX_LEN) return null;
    let starCount = 0;
    for (const ch of candidate) if (ch === '*') starCount++;
    if (starCount > GLOB_MAX_STARS) return null;
    try {
      // ReDoS-safe: replace glob stars with atomic-like alternation groups.
      // 
  ```

## src/omp/fire-gate.ts
- **src/omp/fire-gate.ts:542-552** (bug)
  **Unhandled promise rejection risk on the timer.** `Promise.withResolvers<never>()` at line 542 creates a deferred whose rejection has no `.catch()` handler. When the judge call wins the `Promise.race` at line 549, `clearTimeout(handle)` cancels the timer callback (so the rejection never fires), and the normal path processes the answer. However, `timer.promise` itself is never `.catch()`-ed — if a timer callback fires and rejects *after* the await resolves (e.g., a timer queued before `clearTimeout` executes its synchronous cancel in a race condition with the event loop), the rejection is unhandled. The standard pattern for this is to attach a no-op `.catch()` to suppress the rejection on the non-winning promise: `timer.promise.catch(() => {})`. This is a correctness issue that can surface as `UnhandledPromiseRejection` crashes in Node.js.
  ```existing
  const timer = Promise.withResolvers<never>();
      const handle = setTimeout(() => timer.reject(new FireGateTimeout(ceiling)), ceiling);
      // ★ W2-1: a concurrent identical fire SHARES the call already in flight.
      const call = this.judgeOnce(cacheKey, state);
      sharedCall = call.shared;
      thisCall = call.answers;
      try {
        answers = await Promise.race([call.answers, tim
  ```
  ```suggested
  const timer = Promise.withResolvers<never>();
      const handle = setTimeout(() => timer.reject(new FireGateTimeout(ceiling)), ceiling);
      // Suppress unhandled rejection when the judge call wins the race.
      void timer.promise.catch(() => {});
      // ★ W2-1: a concurrent identical fire SHARES the call already in flight.
      const call = this.judgeOnce(cacheKey, state);
      sharedCal
  ```

## src/omp/populate.ts
- **src/omp/populate.ts:50-54** (bug)
  **Graphify build/transform errors are miscategorized as freshness "misses" in the outer catch.**

When `populateGraphifySessionStore` is called (line 45), the inner function already returns a structured `skipped` result for the freshness-miss case (line 128–131) — it does not throw. The outer `catch` on line 46 only fires when `buildSync` (line 139), `mapGraphifyToTyped` (line 140), or the re-thrown `GRAPHIFY_WRITE_FAILED` (line 147) throws. Yet the log on line 49 labels all of these as `populate substrate=graphify miss:`, and the caller receives the same `{ skipped: true, fallbackReason }` shape as a genuine freshness miss.

This means downstream callers **cannot distinguish** between "graph not built yet" (transient, retryable after build) and "graph built but unprocessable" (likely a bug or data corruption). The log message partially mitigates this with `(graph build or write failed)` in parentheses, but the `fallbackReason` string returned to the caller lacks this categorization.

**Suggestion:** Catch build/transform errors *within* `populateGraphifySessionStore` and return a result with a distinct `fallbackReason` prefix (e.g., `GRAPHIFY_BUILD_FAILED` or `GRAPHIFY_TRANSFORM_FAILED`), so callers can route retries and alerts correctly.
  ```existing
  } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      console.error(`[gi-omp] populate substrate=graphify miss: ${reason} (graph build or write failed)`);
      return { filesIndexed: 0, nodes: 0, edges: 0, runTag, skipped: true, substrate: "graphify", fallbackReason: reason };
    }
  ```
  ```suggested
  try {
      return populateGraphifySessionStore(storePath, root, runTag, opts?.scope);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      const isWrite = reason.startsWith("GRAPHIFY_WRITE_FAILED");
      const prefix = isWrite ? "GRAPHIFY_WRITE_FAILED" : "GRAPHIFY_BUILD_FAILED";
      console.error(`[gi-omp] populate substrate=graphify ${prefix}: ${reason}`);

  ```
