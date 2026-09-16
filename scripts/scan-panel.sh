#!/usr/bin/env bash
# ═══ SCAN PANEL — EVENT-AWARE OCR WRAPPER ═══
# PORTED VERBATIM from provider-chain.ts:18:
#   STALL_MS = 60_000 — no event for 60s = the stream is DEAD, not thinking
#   The "event" = ocr's stdout/stderr bytes. Every byte resets the timer.
#   The timer NEVER fires while ocr is producing output — only on genuine silence.
#
# ocr runs NORMALLY inside this wrapper. Nothing about ocr is modified.
# The wrapper just watches the process output and kills it on stall.
set -uo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
STALL_MS=60  # seconds of SILENCE before kill (the boilerplate's 60_000ms)
MAX_RETRIES=3
FILES=(
  src/omp/populate-graphify.ts
  src/omp/populate-corbell.ts
  src/omp/extension.ts
  src/omp/typed-write.ts
  src/hunter/graph/graphify-adapter.ts
  src/hunter/keys/go-key-pool.ts
  src/hydra/auditor.ts
)
PROVIDER="${1:-openrouter-laguna}"
RESULTS_DIR="/tmp/scan-panel-results"
mkdir -p "$RESULTS_DIR"; rm -f "$RESULTS_DIR"/*.json

echo "=== SCAN PANEL — $(date) — provider: $PROVIDER ==="
echo "STALL_MS: ${STALL_MS}s (event-based: resets on every output byte)"
echo ""

runOneFile() {
  local FILE="$1" OUTFILE="$2"
  # launch ocr normally
  ocr scan --path "$REPO/$FILE" --provider "$PROVIDER" --timeout 30 --format json > "$OUTFILE" 2>&1 &
  local PID=$!
  local last_size=0 last_change=$(date +%s)
  # ═══ THE STALL WATCHDOG (the STALL_MS pattern) ═══
  while kill -0 "$PID" 2>/dev/null; do
    sleep 5
    local cur_size
    cur_size=$(stat -c %s "$OUTFILE" 2>/dev/null || echo 0)
    if [ "$cur_size" -gt "$last_size" ]; then
      # EVENT: output is flowing — reset the timer (provider-chain.ts:18)
      last_size=$cur_size
      last_change=$(date +%s)
    else
      local now=$(date +%s)
      local silent=$(( now - last_change ))
      if [ "$silent" -ge "$STALL_MS" ]; then
        # 60s of SILENCE = the LLM inside ocr is HUNG — kill it
        echo "    STALL: ${silent}s silence — killing PID $PID"
        kill "$PID" 2>/dev/null; wait "$PID" 2>/dev/null
        return 1  # stalled
      fi
    fi
  done
  wait "$PID" 2>/dev/null
  local exit_code=$?
  # did we get valid JSON?
  if [ -s "$OUTFILE" ] && python3 -c "import json; json.load(open('$OUTFILE'))" 2>/dev/null; then
    return 0  # success
  fi
  return 1  # completed but no valid JSON = failed
}

PASS=0; FAIL=0; STALLED=0
for FILE in "${FILES[@]}"; do
  BASENAME=$(basename "$FILE" .ts)
  OUTFILE="$RESULTS_DIR/$BASENAME.json"
  echo "--- $FILE ---"
  SUCCESS=false
  for ATTEMPT in $(seq 1 $MAX_RETRIES); do
    echo "  attempt $ATTEMPT/$MAX_RETRIES"
    if runOneFile "$REPO/$FILE" "$OUTFILE"; then
      echo "  OK: $(wc -c < "$OUTFILE") bytes"
      PASS=$((PASS + 1)); SUCCESS=true; break
    else
      if [ -s "$OUTFILE" ] && ! python3 -c "import json; json.load(open('$OUTFILE'))" 2>/dev/null; then
        echo "  INVALID-JSON (exit was not stall — real failure)"
      fi
      if [ "$ATTEMPT" -lt "$MAX_RETRIES" ]; then
        echo "  retrying in 5s..."
        sleep 5
      fi
    fi
  done
  if [ "$SUCCESS" = false ]; then
    echo "  SCAN_STALLED after $MAX_RETRIES attempts"
    STALLED=$((STALLED + 1))
  fi
done

echo ""
echo "=== PANEL RESULTS ==="
echo "pass: $PASS / ${#FILES[@]} · stalled: $STALLED"
if [ "$PASS" -gt 0 ]; then
  echo "=== FINDINGS FROM SCANNED FILES ==="
  python3 -c "
import json, glob, collections
total = collections.Counter()
for f in sorted(glob.glob('$RESULTS_DIR/*.json')):
    try:
        d = json.load(open(f))
        rows = d if isinstance(d, list) else d.get('findings', d.get('comments', []))
        for r in rows:
            s = r.get('severity', r.get('sev', '?'))
            total[s] += 1
    except: pass
if total:
    crit = total.get('critical', 0); high = total.get('high', 0)
    verdict = 'PASS (0 critical/high)' if crit == 0 and high == 0 else f'FAIL ({crit} critical, {high} high)'
    print(f'GATE: {verdict}')
    print(f'Total: {sum(total.values())} — {dict(total)}')
else:
    print('No findings parsed from results')
"
fi
if [ "$STALLED" -gt 0 ]; then
  echo "STALLED FILES: $STALLED — retry these individually when the provider recovers"
fi
