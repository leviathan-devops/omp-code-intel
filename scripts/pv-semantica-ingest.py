#!/usr/bin/env python3
# ★ L1 SEMANTICA INGEST — the PV derailment transcript corpus.
# The stock semantica-ingest.py walks only .ts/.tsx/.js/.mjs; this producer walks the
# PROSE corpus and uses semantica's own extractors (regex entities + co-occurrence
# relations) → the L1 kg.json shape {entities, relationships, raw}.
import json, os, re, sys, itertools
from collections import Counter

SEMV = "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/JARVIS_DISCORD/packages/discord-ticket-phone/graph/.venv"
sys.path.insert(0, os.path.join(SEMV, "lib/python3.12/site-packages"))
from semantica.semantic_extract.methods import extract_entities_regex, extract_relations_cooccurrence
from semantica.kg.methods import build_kg

ROOT = sys.argv[1] if len(sys.argv) > 1 else "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/PLUTUS_VISION/forensic/pv-session-window"
OUTDIR = os.path.join(ROOT, ".omp/graph-intelligence/layers/semantica")
os.makedirs(OUTDIR, exist_ok=True)

# ★ THE DOMAIN PATTERNS — the derailment lexicon (the classes an auditor greps for).
PATTERNS = {
    "FILE":       r"\b(scripts/[\w./-]+\.py|pine-ide/[\w./-]+\.pine|[\w./-]+\.(?:pine|py|ts|json|md|yaml))\b",
    "FID":        r"\b(F-\d{1,3}|F-[A-Z])\b",
    "TOKEN":      r"\b(JG_[A-Z_]+|SC-\d{1,2}|ST-\d{1,2}[a-z]?|T-\d{2}|EN-\d{3}|OD-\d|AP-\d{1,2})\b",
    "CHECKPOINT": r"\b((?:v1|v2|e1|e2|indicator)-[\w]+-\d{4}-\d{2}-\d{2}|v1-[\w-]+|w5-work-backup)\b",
    "SHA":        r"\b([0-9a-f]{7,40})\b",
    "COMMIT":     r"\b((?:feat|fix|docs|chore|test|refactor|perf)\([\w-]+\))",
    "CLAIM":      r"\b(COMPLETE|PASS|PASSING|SHIPPED|VERIFIED|FULLY WORKING|fully working|done|works)\b",
    "TOOL":       r"\b(bash|edit|write|read|grep|ripwire|graph-query|container-testing|qwen-code-audit|hub|task|todo|goal|jm|jev)\b",
    "EVIDENCE":   r"\b(JG_NO_STORE|GI_NO_STORE|OCR_JSON_ABSENT|OCR_NO_FILES_REVIEWED|BLOCKED|UNVERIFIED|phantom|theatrical|baked|improvise[d]?|fabricat\w*|hallucinat\w*|derail\w*|regress\w*|revert\w*|stub\w*|slop)\b",
    "SCOPE":      r"\b(SC-19|baked literal|e1_injected|role_weight|calcZFP|ZFP|9-Pillar|Engine 1|Engine 2|Engine One|Engine Two)\b",
    "DATUM":      r"\b(\d{2,4} (?:commits|tokens|hours|days)|1[0-9]{2}[, ]?\d{3}[, ]?\d{3} tokens|\d+M tokens|\d{1,3}%)\b",
}

# ★ THE RELATION PATTERNS (subject → object), the derailment grammar.
REL_PATTERNS = {
    "has_refusal": [r"(?P<subject>F-\d{1,3})\s*[:\u2014-]\s*(?P<object>[A-Z][^\n.]{4,70})"],
    "edits":       [r"(?P<subject>[\w./-]+\.(?:pine|py|ts))\s+(?:was\s+)?(?:edited|modified|rewritten|changed)"],
    "reverts":     [r"(?P<subject>[0-9a-f]{7,40})\s+(?:revert|restore)\w*\s+(?P<object>[\w-]{4,40})"],
    "claims":      [r"(?P<subject>the agent|assistant|it)\s+(?:declared|claimed|reported)\s+(?P<object>[^\n.]{4,70})"],
    "blocks":      [r"(?P<subject>[A-Z_]{3,}(?:_BLOCK|_FAIL|_ABSENT|_REVIEWED))\s*(?:—|:|\s)\s*(?P<object>[^\n.]{4,70})"],
}

files = sorted(f for f in os.listdir(ROOT) if f.startswith("session_window_") and f.endswith(".md"))
print(f"[pv-semantica] corpus: {len(files)} files")

all_entities, entity_index = [], {}
rel_rows, rel_counter = [], Counter()
chunk_rows = []

for fn in files:
    text = open(os.path.join(ROOT, fn), encoding="utf-8", errors="replace").read()
    ents = extract_entities_regex(text, patterns=PATTERNS)
    # co-occurrence relations within the file (the window = the file)
    try:
        rels = extract_relations_cooccurrence(text, ents, window_size=6, min_frequency=2)
    except TypeError:
        rels = extract_relations_cooccurrence(text, ents)
    for e in ents:
        key = (e.text.lower(), e.label)
        if key not in entity_index:
            entity_index[key] = {"id": f"e{len(entity_index)}", "text": e.text, "type": e.label,
                                 "count": 0, "files": []}
        entity_index[key]["count"] += 1
        if fn not in entity_index[key]["files"]:
            entity_index[key]["files"].append(fn)
    for r in rels:
        s = r.subject.text if hasattr(r, "subject") else str(r.subject)
        o = r.object.text if hasattr(r, "object") else str(r.object)
        p = r.predicate if hasattr(r, "predicate") else "co_occurs"
        rel_counter[(s.lower(), p, o.lower())] += 1
    chunk_rows.append({"file": fn, "entities": len(ents), "relations": len(rels)})

entities = [{"id": v["id"], "text": v["text"], "type": v["type"], "count": v["count"],
             "files": v["files"]} for v in entity_index.values()]
id_of = {**{v["text"].lower(): v["id"] for v in entity_index.values()}}
for (s, p, o), c in rel_counter.most_common():
    if s in id_of and o in id_of and s != o:
        rel_rows.append({"source": id_of[s], "target": id_of[o], "type": p, "weight": c})

kg = build_kg([{"entities": entities, "relationships": rel_rows}])
kg["raw"] = {"corpus_root": ROOT, "files": len(files), "chunks": chunk_rows,
             "entity_types": dict(Counter(e["type"] for e in entities))}
with open(os.path.join(OUTDIR, "kg.json"), "w") as f:
    json.dump(kg, f, indent=2)

print(f"[pv-semantica] files={len(files)} entities={len(entities)} relationships={len(rel_rows)}")
print(f"[pv-semantica] → {OUTDIR}/kg.json ({os.path.getsize(os.path.join(OUTDIR,'kg.json'))} B)")
print(f"[pv-semantica] entity types: {dict(Counter(e['type'] for e in entities))}")
print(f"[pv-semantica] TOP entities: {[(e['type'], e['text'], e['count']) for e in sorted(entities, key=lambda x:-x['count'])[:18]]}")
assert len(entities) > 0, "GATE 1 FAILED: entities == 0"
assert len(rel_rows) > 0, "GATE 1 FAILED: relationships == 0"
print("[pv-semantica] GATE 1: entities>0 AND relationships>0 — PASS")
