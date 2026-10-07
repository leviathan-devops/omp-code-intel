#!/usr/bin/env bash
# DEPLOY.sh — deploy the GI OMP extension bundle to the host runtime.
#
# The artifact: dist/gi-index.js (the built OMP extension).
# The target:  ~/.omp/agent/extensions/graph-intelligence/index.js
#
# ★ A NEW omp SESSION loads the new bundle (the extension is read at session construction).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/dist/gi-index.js"
DST="$HOME/.omp/agent/extensions/graph-intelligence/index.js"
EXPECT="879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741"

echo "== GI extension deploy =="
SRC_SHA=$(sha256sum "$SRC" | awk '{print $1}')
echo "source sha : $SRC_SHA"
if [ "$SRC_SHA" != "$EXPECT" ]; then
  echo "!! PACKAGED ARTIFACT SHA MISMATCH — expected $EXPECT, refusing to deploy." >&2
  exit 1
fi

mkdir -p "$(dirname "$DST")"
cp "$SRC" "$DST"
DST_SHA=$(sha256sum "$DST" | awk '{print $1}')
echo "deployed sha: $DST_SHA"
[ "$SRC_SHA" = "$DST_SHA" ] && echo "OK — source == deployed" || { echo "!! deploy mismatch" >&2; exit 1; }

echo
echo "Verify the runtime (a fresh session):"
echo "  bun $HERE/scripts/consumption-audit.ts <projectRoot> --gate   # expect union=8/8"
echo "  # the 7 gi_* tools + the graph hook load at session construction"
