#!/usr/bin/env bash
# GI-4: print the repo hash of extensions/graph-intelligence/index.js.
# With an argument, that value is the deployed hash and a mismatch fails.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
FILE="$ROOT/extensions/graph-intelligence/index.js"
if [[ ! -f "$FILE" ]]; then
  echo "GI_BUNDLE_MISSING: $FILE" >&2
  exit 1
fi
ACTUAL=$(sha256sum "$FILE" | awk '{print $1}')
echo "graph-intelligence index.js sha256=${ACTUAL}"
if [[ $# -ge 1 ]]; then
  DEPLOYED=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')
  if [[ "$DEPLOYED" != "$ACTUAL" ]]; then
    echo "GI_BUNDLE_HASH_MISMATCH: deployed=${DEPLOYED} repo=${ACTUAL}" >&2
    exit 1
  fi
  echo "GI_BUNDLE_HASH_OK"
fi
