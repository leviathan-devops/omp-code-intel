#!/usr/bin/env bash
# ★ container-substrate-payload — W4: ship the HOST-SIDE substrates into the container rig.
#
# THE GAP: the rig (gi-kev-ct) carries only the KEV payload, so its register reads consumed:1/8 —
# the other 7 consumers are GI_LAYER_DOWN because their substrates live on the HOST.
#
# ★ THE PATTERN (the one that carried KEV): stage the files at the CONTAINER's expected paths in
# a local dir, tar it, then ship with `container-testing action=cp` + extract in the container.
#
# THE 7 SUBSTRATES (the probes' exact paths, read from src/omp/adapters/*.ts):
#   L1 SEMANTICA  <scope>/.omp/graph-intelligence/layers/semantica/kg.json
#   L2 ARSUMBRIS  ~/.arsumbris/au-engine/run/<hash>.sock   ← a DAEMON (a PROCESS, not a file)
#   L3 UA         <scope>/.ua/knowledge-graph.json
#   L4 C2KG       <scope>/.c2kg/index.json
#   L5 CORBELL    <scope>/.omp/graph-intelligence/corbell-checkout/store.sqlite
#   L6 GRAPHIFY   <scope>/.omp/graph-intelligence/graphify-checkout/store.sqlite
#   ABIDE         <scope>/.abide/events.jsonl
#
# ★ THE HONEST RULE: a substrate ABSENT on the host is REPORTED as absent (it cannot be shipped),
# never fabricated. The register will read what the container REALLY carries.
set -uo pipefail

SRC="${1:-$(pwd)}"
OUT="${2:-/tmp/gi-substrate-payload}"
SCOPE_IN_CONTAINER="${3:-/root/gi-scope}"

rm -rf "$OUT"; mkdir -p "$OUT"

shipped=0; absent=0
ship() {  # $1 = the host path, $2 = the container-relative path
  local host="$1" rel="$2"
  if [ -e "$host" ]; then
    mkdir -p "$OUT/$(dirname "$rel")"
    cp -r "$host" "$OUT/$rel"
    printf '  ✓ %-56s -> %s\n' "$rel" "$(du -sh "$host" | cut -f1)"
    shipped=$((shipped+1))
  else
    printf '  ✗ %-56s ABSENT on the host\n' "$rel"
    absent=$((absent+1))
  fi
}

echo "[substrate-payload] the scope: $SCOPE_IN_CONTAINER"
ship "$SRC/.omp/graph-intelligence/layers/semantica/kg.json" "$SCOPE_IN_CONTAINER/.omp/graph-intelligence/layers/semantica/kg.json"
ship "$SRC/.ua/knowledge-graph.json"                          "$SCOPE_IN_CONTAINER/.ua/knowledge-graph.json"
ship "$SRC/.c2kg/index.json"                                  "$SCOPE_IN_CONTAINER/.c2kg/index.json"
ship "$SRC/.omp/graph-intelligence/corbell-checkout/store.sqlite"  "$SCOPE_IN_CONTAINER/.omp/graph-intelligence/corbell-checkout/store.sqlite"
ship "$SRC/.omp/graph-intelligence/graphify-checkout/store.sqlite" "$SCOPE_IN_CONTAINER/.omp/graph-intelligence/graphify-checkout/store.sqlite"
ship "$SRC/.abide/events.jsonl"                               "$SCOPE_IN_CONTAINER/.abide/events.jsonl"

# ★ L2 ARSUMBRIS is a DAEMON (a socket), not a file — it cannot be tarred. It needs the au-engine
#   STARTED inside the container. This script REPORTS that; it does not fake a socket.
if [ -d "${HOME}/.arsumbris/au-engine/run" ]; then
  printf '  ⚠ %-56s a DAEMON (a socket dir) — start au-engine in the container, never tar it\n' "~/.arsumbris/au-engine/run"
else
  printf '  ✗ %-56s ABSENT on the host\n' "~/.arsumbris/au-engine/run"
fi

tar -cf "${OUT}.tar" -C "$OUT" .
printf '[substrate-payload] shipped=%s absent=%s · the tar: %s\n' "$shipped" "$absent" "$(du -h "${OUT}.tar" | cut -f1)"
printf '[substrate-payload] ★ the container register will read AT MOST %s/8 + KEV + ABIDE\n' "$shipped"
