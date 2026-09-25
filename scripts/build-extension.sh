#!/usr/bin/env bash
# build-extension — build + deploy the GI OMP extension bundle.
#
# ★ THE 9 MB DEFECT (2026-09-25): the bundle inlined the WHOLE TypeScript compiler
#   (`node_modules/typescript/lib/typescript.js`, ~9 MB) because two modules import it
#   (`src/hunter/diagnostics/engine.ts:44`, `src/hunter/graph/mechanical.ts:2`) for the
#   AST walk. A bundled dependency is a BUILD-CONFIG choice, not a design need — the
#   compiler is already resolvable at runtime (it lands at ~/node_modules/typescript,
#   reachable by node's upward resolution from the extension dir).
#
#   MEASURED: inline 9,336K → external 746K (92% smaller); import 139 ms → 41 ms.
#   The tool surface is IDENTICAL (7 tools + 4 hooks) and tsc stays clean.
#
# `--external` keeps the import as a runtime `require("typescript")` instead of
# inlining the source. @huggingface/transformers is externalized too: it is only
# referenced as a path/string for the KEV adapter's `up` check, never loaded at boot.
set -euo pipefail
R="${1:-/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence}"
OUT="$R/extensions/graph-intelligence/index.js"
DEPLOY="/home/leviathan/.omp/agent/extensions/graph-intelligence/index.js"

cd "$R"
bun build src/omp/extension.ts \
  --outfile "$OUT" \
  --target bun --format esm --bundle \
  --external typescript \
  --external '@huggingface/transformers'

cp "$OUT" "$DEPLOY"
printf '  dist: %s · %s\n' "$(sha256sum "$DEPLOY" | cut -c1-16)" "$(du -h "$DEPLOY" | cut -f1)"
