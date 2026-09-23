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
TOOLKIT="$ROOT/research/graph-infra-repos/code-to-knowledge-graph"
JAR="$TOOLKIT/build/libs/code-to-knowledge-graph-1.2.0.jar"

[ -f "$JAR" ] || (cd "$TOOLKIT" && sh ./gradlew --no-daemon build -x test)
CP=$(cd "$TOOLKIT" && sh ./gradlew --no-daemon -q printRuntimeCp 2>/dev/null | grep RUNTIME_CP= | sed 's/^RUNTIME_CP=//')
CP="$CP:$JAR"

javac -cp "$CP" -d /tmp/c2kg "$ROOT/scripts/c2kg-produce/C2kgProduce.java"
java -cp "/tmp/c2kg:$CP" C2kgProduce "$ROOT" "$ROOT/.c2kg/index.json"
