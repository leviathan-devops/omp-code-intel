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

# ★ THE PRE-FLIGHT LANE PROBE (the F-607 lesson, 2026-09-25): run 15 launched 113 parts onto
#   an exhausted go lane and returned 109 EMPTY_RESULT markers — 40 minutes to learn nothing.
#   Probe the lane with ONE real completion BEFORE the wave; refuse to start on a dead lane.
PROV="${AUDIT_PROVIDER:-muse-free}"
PROBE_URL="$(python3 -c "import json;d=json.load(open('/home/leviathan/.opencodereview/config.json'));print(d['custom_providers'].get('$PROV',{}).get('url',''))" 2>/dev/null)"
if [ -n "$PROBE_URL" ]; then
  MODEL="$(python3 -c "import json;d=json.load(open('/home/leviathan/.opencodereview/config.json'));print(d['custom_providers'].get('$PROV',{}).get('model',''))" 2>/dev/null)"
  CODE=$(timeout 90 curl -s -o /tmp/lane-probe.json -w '%{http_code}' -X POST "$PROBE_URL/responses" \
    -H 'Content-Type: application/json' -H 'User-Agent: opencode/1.18.31' \
    -d "{\"model\":\"$MODEL\",\"input\":\"reply with the single word READY\"}" 2>/dev/null)
  if [ "$CODE" != "200" ]; then
    echo "[whole-tree] ✗ LANE DEAD: $PROV ($PROBE_URL) answered HTTP $CODE."
    echo "[whole-tree]   $(head -c 200 /tmp/lane-probe.json 2>/dev/null)"
    echo "[whole-tree]   REFUSING TO LAUNCH — a dead lane yields 113 EMPTY_RESULT markers, not findings."
    exit 3
  fi
  echo "[whole-tree] ✓ lane probe: $PROV → HTTP 200 ($(head -c 60 /tmp/lane-probe.json | tr -d '\n'))"
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
    # ★ THE RATE-LIMIT RETRY (measured 2026-09-25): the zen-free tier answers
    #   FreeUsageLimitError 429 after a sustained burst (run 16: 25 files at 12 workers,
    #   then 57 EMPTY). A 0-byte part is RETRIED with backoff instead of being recorded
    #   as empty — the free tier RECOVERS, so the retry is the correct response, not a
    #   different lane.
    local attempt=0
    while [ "$attempt" -lt 4 ]; do
      timeout 1800 ocr scan --path "$f" --provider ${AUDIT_PROVIDER:-muse-free} --format json 2>/dev/null \
        | head -c 300000 > "$pf"
      [ -s "$pf" ] && break
      attempt=$((attempt + 1))
      printf "  [%s] w%s RETRY %d %s (rate limit)\n" "$(date +%H:%M:%S)" "$id" "$attempt" "$f"
      # backoff: 45s, 90s, 180s — paced under the free tier's window
      sleep $((45 * attempt))
    done
    # ★ the EMPTY-RESULT law: a part still empty after the retries is recorded as an
    #   explicit marker, so a re-audit can tell "the scan returned nothing" from
    #   "the file was never scanned".
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
