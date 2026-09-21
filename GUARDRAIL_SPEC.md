# GUARDRAIL SPEC — GI Kernel v2.1 build

**Mechanical enforcement, not advisory documents.** Each guardrail below is a shell-level
check with its implementation, its priority, and its cost. A guardrail that cannot be run
by a script is a wish, not a guardrail.

---

## G-1 · THE ASSERTING EDIT (kills EN-064/EN-065)

**Prevents:** silent no-op edits reported as landed.
**Priority:** P0 — the session's most expensive process failure.
**Cost:** ~0 (a grep after every scripted edit).
```bash
# every python edit script MUST use this shape; a bare str.replace is banned
python3 - <<'PY'
p = "<file>"; s = open(p).read()
old = """<exact anchor>"""
assert old in s, f"NOT FOUND in {p} — refusing to claim an unapplied fix"
open(p,"w").write(s.replace(old, "<new>", 1))
PY
# post-edit verification (mandatory, same turn):
grep -c "<new-text-marker>" <file>   # must be ≥1, else the edit did not land
```

## G-2 · THE RE-VERIFY GATE (kills EN-075)

**Prevents:** described-but-unfixed defects inside complete-reading commits.
**Priority:** P0.
**Cost:** one scan run per wave.
```bash
# no wave closes while the instrument that found the defect still finds it
ocr scan --provider muse-free --timeout 30 --concurrency 2 --format json --path <fixed-file> \
  > .audit/reverify-$(basename <fixed-file> .ts).json
python3 -c "
import json
o,_=json.JSONDecoder().raw_decode(open('.audit/reverify-<name>.json').read())
sevs=[c['severity'] for c in o.get('comments',[])]
assert 'high' not in sevs and 'critical' not in sevs, 'RE-VERIFY FAILED — wave stays open'
print('RE-VERIFY PASS')"
```

## G-3 · THE GRAPH-CONSULT RULE (kills D-1/T-16)

**Prevents:** ritual graph queries (gate tokens with no decision derived).
**Priority:** P1.
**Cost:** one query per structural edit (already required by the gate).
```bash
# before EVERY structural edit, the query's RESULT must be cited in the change:
# the edit's commit message or code comment must reference a symbol the query returned,
# or the gate records the query as UNUSED (M-GRAPH-6's ceremony counter)
# enforcement: the graph-fact rung is now FIRST in FireGate.judge (fire-gate.ts:415) —
# EVERY fire consults the graph, or its row says WHY NOT (graph:UNAVAILABLE/UNOBSERVED)
```

## G-4 · THE FRESHNESS CHECK (kills D-3/F-15/F-18)

**Prevents:** stale instruments served as fresh (graphs, dists, checkouts).
**Priority:** P0 — the worst derailment (confident answers about obsolete code).
**Cost:** one query per consult.
```bash
# graph stores: populated_at must postdate HEAD before ANY fact is served
bun -e '
import { Database } from "bun:sqlite";
const db = new Database("<store>", { readonly: true });
const m = db.query("SELECT value FROM gi_meta WHERE key=\x27populated_at\x27").get();
if (!m) { console.log("STALE-BY-CONSTRUCTION"); process.exit(2); }
console.log("populated_at=" + m.value); db.close();'
# dists: the live bundle sha must equal the manifest sha BEFORE any TUI leg (I-7)
sha256sum <deployed-bundle> | grep -q <manifest-sha> || { echo "SHADOW DIST"; exit 2; }
```

## G-5 · THE SCOPE JAIL (kills F-44/F-47)

**Prevents:** scope inferred from dependency graphs instead of granted by the operator.
**Priority:** P0 — the trust-breaking class.
**Cost:** one path check per write.
```bash
# the goal prompt names the authorized repos; NOTHING outside them is written
# ALLOWED_ROOTS comes from the goal prompt, never from a dependency
for f in $(git status --porcelain | awk '{print $2}'); do
  case "$f" in $ALLOWED_ROOTS*) ;; *) echo "SCOPE BREACH: $f"; exit 2;; esac
done
```

## G-6 · THE PRODUCER CHECK (closes T-3)

**Prevents:** synthetic-only oracle resolutions (labels measured as outcomes).
**Priority:** P1.
**Cost:** one producer run per session end.
```bash
# every session end runs the producer; unresolved rows with no evidence are COUNTED
bun -e '
import { resolveFromSession } from "./src/omp/evidence-producer.ts";
// events = this session'"'"'s tool calls; subjects = state_hash → subject map
const r = resolveFromSession(ledger, events, { recordsPath, subjects });
console.log(`resolved=${r.resolved} noEvidence=${r.noEvidence} noSubject=${r.noSubject}`);'
# noSubject > 0 → the subject map is incomplete (fix the map, not the oracle)
```

## G-7 · THE DELTA SCAN (kills the treadmill)

**Prevents:** unbounded convergent-scan loops (F-20, F-45, 19/19/19).
**Priority:** P1.
**Cost:** O(changed files) per wave instead of O(tree).
```bash
# per wave: scan CHANGED files only
git diff --name-only HEAD~1 -- src/ | grep '\.ts$' | tr '\n' ',' | sed 's/,$//' > /tmp/delta.txt
ocr scan --provider muse-free --timeout 30 --concurrency 2 --format json --path "$(cat /tmp/delta.txt)"
# convergence tracker: findings on UNCHANGED code across rounds = the treadmill signature
python3 -c "
import json
# overlap(previous_round_files, current_findings_on_unchanged) == 0 three times → STOP, rule the debt"
```

## G-8 · THE SHADOW BAN LIST (kills F-48)

**Prevents:** banned patterns resurrected because the ban lived in another project.
**Priority:** P1.
**Cost:** one grep per preflight.
```bash
# ~/.omp/agent/bans/*.ban — one file per ban, project-independent
grep -rn "indexer-fallback\|REGEX.*populate\|silent.*substitute" src/ --include="*.ts" \
  | grep -v "HISTORICAL\|documents the removal" && { echo "BANNED PATTERN PRESENT"; exit 2; }
echo "BAN LIST CLEAN"
```
