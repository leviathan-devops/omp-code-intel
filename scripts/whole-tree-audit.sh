#!/usr/bin/env bash
# ★ W3 — THE WHOLE-TREE AUDIT, PARALLEL (FR-3+FR-4). The serial shape was 7.5 min/file
#   (14 h for 112) — the WRONG DESIGN. This runs W workers, each pulling the next file
#   from a shared queue. The lane: muse-go-mimo (never verboo).
set -uo pipefail
R="${1:-$(pwd)}"; OUT="${2:-/tmp/whole-tree-audit.json}"; W="${3:-12}"
cd "$R"
mkdir -p /tmp/w3parts && rm -f /tmp/w3parts/*.json
find src -name '*.ts' | sort > /tmp/w3files.txt
N=$(wc -l < /tmp/w3files.txt)
echo "[whole-tree] $N files · $W parallel workers"
worker() {
  local id="$1"
  while :; do
    local f
    f=$(flock /tmp/w3queue.lock -c 'head -1 /tmp/w3files.txt; sed -i 1d /tmp/w3files.txt' 2>/dev/null)
    [ -z "$f" ] && break
    timeout 1800 ocr scan --path "$f" --provider muse-go-mimo --format json 2>/dev/null \
      | head -c 300000 > "/tmp/w3parts/$(echo "$f" | tr '/' '_').json"
    printf "  [%s] w%s %s\n" "$(date +%H:%M:%S)" "$id" "$f"
  done
}
for i in $(seq 1 "$W"); do worker "$i" & done
wait
# aggregate
echo "[" > "$OUT"; first=1
for p in /tmp/w3parts/*.json; do
  [ -s "$p" ] || continue
  [ "$first" -eq 0 ] && echo "," >> "$OUT"; first=0
  printf '{"part":"%s","result":%s}' "$(basename $p .json)" "$(cat "$p")" >> "$OUT"
done
echo "]" >> "$OUT"
echo "[whole-tree] DONE: $N files with $W workers -> $OUT"
