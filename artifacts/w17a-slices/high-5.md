# HIGH slice 5 — 2 findings across 2 files

## src/hunter/harness/map.ts
- **src/hunter/harness/map.ts:77-77** (security)
  Path traversal risk: `profile.project.root` is used directly in `path.join` to construct the database path without any sanitization. If `root` contains `..` segments (e.g., `/some/path/../../etc`), the resulting `dbPath` could point outside the expected `.trident/knowledge-graph/` directory, potentially overwriting arbitrary files. Consider normalizing and validating that the resolved path stays within an expected parent directory.
  ```existing
  const dbPath = path.join(profile.project.root, '.trident', 'knowledge-graph', 'shared.db');
  ```
  ```suggested
  const resolved = path.resolve(profile.project.root, '.trident', 'knowledge-graph', 'shared.db');
  // Guard: ensure the resolved path doesn't escape the project root
  const projectRoot = path.resolve(profile.project.root);
  if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
    throw new Error(`map actor: resolved dbPath escapes project root (${resolved})`);
  }
  co
  ```

## src/hunter/tools/query-registration.ts
- **src/hunter/tools/query-registration.ts:58-58** (bug)
  `openSessionStore` is called with `callerSessionId: args.sessionId`, making `callerSessionId` always equal to `sessionId`. If the scope-checking logic in `openSessionStore` is supposed to verify that the *calling* session is authorized to access the *target* session's store, passing the same value defeats the purpose — an attacker-controlled `args.sessionId` will always pass the check against itself. Verify that `openSessionStore` expects the actual caller identity from a trusted source (e.g., a request context or process identity) rather than a user-supplied field.
  ```existing
  const opened = openSessionStore({ sessionId: args.sessionId, scopeRoot: args.scopeRoot, callerSessionId: args.sessionId });
  ```
  ```suggested
  // callerSessionId should come from a trusted source, not from user-supplied args:
const callerId = getCallerSessionId(); // or however the trusted identity is obtained
const opened = openSessionStore({ sessionId: args.sessionId, scopeRoot: args.scopeRoot, callerSessionId: callerId });
  ```
