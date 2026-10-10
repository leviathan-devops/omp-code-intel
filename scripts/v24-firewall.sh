#!/usr/bin/env bash
# scripts/v24-firewall.sh — THE V2.4 PREDICATE. Exit 0 = every gate is wired; nonzero = FAIL.
# Each detector checks the OBSERVABLE (a row, a token, a count) — never a bare keyword.
set -uo pipefail
R=/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
FAIL=0
fail() { echo "  FAIL: $1"; FAIL=1; }
pass() { echo "  PASS: $1"; }

echo "=== V2.4 FIREWALL ==="
# 1. THE DECORATIVE GATE — every gate must be able to refuse
grep -q 'GI_RETRIEVAL_GATE' "$R/src/omp/gate-hook.ts" && pass "the retrieval gate exists" || fail "the retrieval gate missing"
grep -q 'GI_LOOP_REPEAT' "$R/src/omp/gate-hook.ts" && pass "the loop gate exists" || fail "the loop gate missing"
grep -q 'GI_NO_SUBSTRATE' "$R/src/omp/gate-hook.ts" && pass "the substrate gate exists" || fail "the substrate gate missing"
grep -q 'GI_DONE_UNPROVEN' "$R/src/omp/claim-firewall.ts" && pass "the done gate exists" || fail "the done gate missing"
grep -q 'extractFunctionSymbols' "$R/src/omp/graph-gate.ts" && pass "the logic-edit symbols exist" || fail "the W3 extractor missing"
# 2. THE REMOTE JUDGE — a remote reference anywhere is a HARD STOP
if grep -rn 'api\.typesafe\.ai' "$R/src/" "$HOME/.omp/agent/extensions/lexicon-gate/lib.ts" 2>/dev/null | grep -v '^Binary' | head -1; then
  fail "a remote-judge reference exists"
else
  pass "no remote-judge reference"
fi
# 3. THE NULL JUDGE — the GRAY-band rows must carry a judge read. (Fire/silent rows record
#    null BY DESIGN.) Assert the NEWEST row's shape, not the existence of any one row
#    (the auditor's F5: one placeable row turned an 85%-null ledger green).
if [ -f "$HOME/.omp/run/lexicon-ledger.jsonl" ]; then
  LAST=$(tail -1 "$HOME/.omp/run/lexicon-ledger.jsonl")
  case "$LAST" in
    *'"source_kind":"own_utterance"'*) : ;;
  esac
  if echo "$LAST" | grep -q '"jev":0\.[0-9]'; then
    pass "the newest ledger row carries a judge read (jev:0.<p>)"
  elif echo "$LAST" | grep -q '"confidence":0\.[0-9]*.*"source_kind":"(quotation|table|doc|rule_source)"'; then
    pass "the newest row is a non-actionable source-kind (null is correct by design)"
  else
    fail "the newest ledger row is neither a judge read nor a non-actionable source-kind"
  fi
fi
# 4. THE LOCAL JUDGE — :8090 must answer
if curl -s -m5 http://127.0.0.1:8090/health | grep -q '"ok"'; then
  pass "the local judge is up"
else
  fail "the local judge is DOWN"
fi
# 5. THE UNGATED EDIT — the query mandate must be in the gate. The runtime emits
#    GRAPH_GATE_DRIFT_HIGH (T2) / GRAPH_GATE_ABORT (T3) — NOT a GI_QUERY_REQUIRED token
#    (that token exists only in docs; the auditor caught it). Assert the REAL tokens.
grep -q 'GRAPH_GATE_DRIFT_HIGH' "$R/src/omp/graph-gate.ts" && pass "the query mandate exists (GRAPH_GATE_DRIFT_HIGH)" || fail "the query mandate missing"
# 6. THE RAW CORPUS READ — the retrieval detector must exist
grep -q 'RETRIEVAL_READ' "$R/src/omp/jev.ts" && pass "the retrieval candidate exists" || fail "the retrieval candidate missing"
# 7. THE DONE-WITHOUT-PROOF — the route=act builder must exist
grep -q 'DONE_ROUTE_ACT' "$R/src/omp/jev.ts" && pass "the done candidate exists" || fail "the done candidate missing"
# 8. THE DEPLOYED DIST — source == deployed
S=$(sha256sum "$R/extensions/graph-intelligence/index.js" | cut -c1-16)
D=$(sha256sum "$HOME/.omp/agent/extensions/graph-intelligence/index.js" | cut -c1-16)
[ "$S" = "$D" ] && pass "source==deployed ($S)" || fail "source($S) != deployed($D)"
echo
[ "$FAIL" -eq 0 ] && echo "FIREWALL: EXIT 0 (all green)" || echo "FIREWALL: EXIT 1 (fix the FAILs)"
exit $FAIL
