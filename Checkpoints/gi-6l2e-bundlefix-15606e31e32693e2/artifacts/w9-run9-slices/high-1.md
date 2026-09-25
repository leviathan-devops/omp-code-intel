# HIGH slice 1 — 1 findings across 1 files

## src/hunter/diagnostics/fixture-calibration.ts
- **src/hunter/diagnostics/fixture-calibration.ts:157-158** (security)
  Path traversal risk: manifest.sourceFile comes from untrusted on-disk JSON and is joined to the fixture dir via path.join without sanitization. A manifest with sourceFile '../../etc/passwd' would read arbitrary files outside the fixture directory. Validate that the resolved path stays within the fixture dir (or at least that sourceFile has no directory separators).
  ```existing
  const source = fs.readFileSync(path.join(dir, manifest.sourceFile), 'utf8');
  if (!manifest.ruleId || !manifest.file || !manifest.line) {
  ```
  ```suggested
  // Path traversal guard: sourceFile must not escape the fixture dir
  const resolvedSource = path.resolve(dir, manifest.sourceFile);
  if (!resolvedSource.startsWith(path.resolve(dir))) {
    throw new Error(`CALIBRATION_FIXTURE_INVALID: sourceFile '${manifest.sourceFile}' escapes fixture dir ${dir}`);
  }
  const source = fs.readFileSync(resolvedSource, 'utf8');
  if (!manifest.ruleId || !manifes
  ```
