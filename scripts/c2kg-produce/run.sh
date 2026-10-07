#!/bin/sh
# c2kg-produce — ★ THE L4 C2KG PRODUCER, runnable.
#
# ★ WHAT MADE THIS POSSIBLE (measured 2026-09-23):
#   1. the toolkit builds at all now that a JDK exists (the host had a JRE only;
#      `sudo apt-get install -y openjdk-21-jdk-headless` fixed it)
#   2. the parser builds its NODES + the DEFINES connections WITHOUT VS Code
#      (the regex tokenizer + the language specs). Only the ADDITIONAL outbound
#      connections (USES/INHERITS_FROM) go through VsCodeConnectionParser.
#   3. `commsChannel` is used for progress AND for the BatchProcessor's request/reply
#      (BatchProcessor.kt:65-69). The consumer HANDLES NULL, so a stub returning
#      {"commands":[null,...]} is the honest no-LSP answer.
#
# usage: sh scripts/c2kg-produce/run.sh [projectRoot]
set -e
ROOT="${1:-$(pwd)}"
GI_REPO="$(cd "$(dirname "$0")/../.." && pwd)"
TOOLKIT="$GI_REPO/research/graph-infra-repos/code-to-knowledge-graph"
JAR="$TOOLKIT/build/libs/code-to-knowledge-graph-1.2.0.jar"

[ -f "$JAR" ] || (cd "$TOOLKIT" && sh ./gradlew --no-daemon build -x test)
CP=$(cd "$TOOLKIT" && sh ./gradlew --no-daemon -q printRuntimeCp 2>/dev/null | grep RUNTIME_CP= | sed 's/^RUNTIME_CP=//')
CP="$CP:$JAR"

javac -cp "$CP" -d /tmp/c2kg "$GI_REPO/scripts/c2kg-produce/C2kgProduce.java"
# the parse set = the target's declared GI source roots (.omp/graph-intelligence/profile.yaml `sources:`)
PROF="$ROOT/.omp/graph-intelligence/profile.yaml"
SRCS=""
[ -f "$PROF" ] && SRCS=$(sed -n '/^sources:/,/^[^ ]/p' "$PROF" | sed -n 's/^ *- *//p' | while read -r s; do [ -d "$ROOT/$s" ] && printf '%s\n' "$ROOT/$s"; done | tr '\n' ' ')
# shellcheck disable=SC2086
# ★ F3 FIX (2026-10-07): protect a GOOD index from a bad regen. The Bevel no-comms parser
#   emits NODES with 0 edges; a regen silently dropped the W5-seal 411 edges. Back up the
#   existing index; after the parse, if the new one has 0 edges but the backup had edges,
#   RESTORE the backup (the edges survive) — else fail LOUD (nothing to preserve).
PREV="/tmp/c2kg-prev-$$.json"
[ -f "$ROOT/.c2kg/index.json" ] && cp "$ROOT/.c2kg/index.json" "$PREV"
java -cp "/tmp/c2kg:$CP" C2kgProduce "$ROOT" "$ROOT/.c2kg/index.json" $SRCS

python3 - "$ROOT/.c2kg/index.json" "$PREV" <<'PYGUARD'
import json, sys, shutil, os
new_p, prev_p = sys.argv[1], sys.argv[2]
def edges(p):
    try: return len(json.load(open(p)).get("edges", []))
    except Exception: return -1
n = edges(new_p); pv = edges(prev_p) if os.path.exists(prev_p) else -1
print("  c2kg: new=%d edges, prev=%d edges" % (n, pv))
if n == 0 and pv > 0:
    shutil.copy(prev_p, new_p)
    print("  ★ C2KG_PROTECTED: the regen produced 0 edges — RESTORED the prior %d-edge index (a symbol list is not a graph)." % pv)
    sys.exit(0)
if n == 0:
    sys.exit("C2KG_NO_EDGES: the produced index has 0 edges and no prior good index to restore — the edge derivation must run (the no-comms parser emits no connections).")
PYGUARD
[ -f "$PREV" ] && rm -f "$PREV"
