#!/usr/bin/env bash
# ★ W3 — THE WHOLE-TREE AUDIT, PARALLEL (FR-3+FR-4). The serial shape was 7.5 min/file
#   (14 h for 112) — the WRONG DESIGN. This runs W workers, each pulling the next file
#   from a shared queue. The lane: muse-go-mimo (never verboo).
#
#   usage: whole-tree-audit.sh [ROOT] [OUT] [WORKERS] [FILELIST] [PARTSDIR]
#     FILELIST — an optional file with one path per line (the incremental re-audit).
#                Omitted → every src/**/*.ts (the whole-tree gate).
#     PARTSDIR — where the per-file JSON lands (default /tmp/w3parts). NEVER clobber
#                a baseline: pass a distinct dir for a re-audit.
set -uo pipefail
R="${1:-$(pwd)}"; OUT="${2:-/tmp/whole-tree-audit.json}"; W="${3:-12}"
FILELIST="${4:-}"; PARTS="${5:-/tmp/w3parts}"
cd "$R"
mkdir -p "$PARTS" && rm -f "$PARTS"/*.json
QLIST="/tmp/w3files-$(basename "$PARTS").txt"
if [ -n "$FILELIST" ] && [ -s "$FILELIST" ]; then
  cp "$FILELIST" "$QLIST"
else
  find src -name '*.ts' | sort > "$QLIST"
fi
N=$(wc -l < "$QLIST")
echo "[whole-tree] $N files · $W parallel workers · parts=$PARTS"
worker() {
  local id="$1"
  while :; do
    local f
    f=$(flock /tmp/w3queue.lock -c "head -1 $QLIST; sed -i 1d $QLIST" 2>/dev/null)
    [ -z "$f" ] && break
    local pf="$PARTS/$(echo "$f" | tr '/' '_').json"
    timeout 1800 ocr scan --path "$f" --provider muse-go-mimo --format json 2>/dev/null \
      | head -c 300000 > "$pf"
    # ★ the EMPTY-RESULT law: a 0-byte part is recorded as an explicit marker, so a
    #   re-audit can tell "the scan returned nothing" from "the file was never scanned".
    [ -s "$pf" ] || printf '{"comments":[],"note":"EMPTY_RESULT"}' > "$pf"
    printf "  [%s] w%s %s (%sB)\n" "$(date +%H:%M:%S)" "$id" "$f" "$(wc -c < "$pf")"
  done
}
for i in $(seq 1 "$W"); do worker "$i" & done
wait
# aggregate
echo "[" > "$OUT"; first=1
for p in "$PARTS"/*.json; do
  [ -s "$p" ] || continue
  [ "$first" -eq 0 ] && echo "," >> "$OUT"; first=0
  printf '{"part":"%s","result":%s}' "$(basename "$p" .json)" "$(cat "$p")" >> "$OUT"
done
echo "]" >> "$OUT"
echo "[whole-tree] DONE: $N files with $W workers -> $OUT"
