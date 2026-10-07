#!/usr/bin/env python3
"""semantica-ingest — ★ THE L1 SEMANTICA INGEST: build the typed KG store.

THE REAL PIPELINE (measured 2026-09-23):
    from semantica.context import ContextGraph
    g = ContextGraph()
    g.add_node(node_id, node_type, content, **props) -> bool
    g.add_edge(source_id, target_id, edge_type, weight, **props) -> bool
    g.to_dict() / g.to_kg_dict() / g.save_to_file(path)

★ WHY THIS EXISTS: L1_SEMANTICA's substrate is
`<scopeRoot>/.omp/graph-intelligence/layers/semantica/kg.json` and nothing on this host
produced one. The producer is semantica's OWN ContextGraph.

The entities are the repo's DECLARATIONS (exported symbols) and its FILES; the
relationships are `defines` (file -> symbol) and `imports` (file -> file). A KG with
nodes and no edges is a file list wearing the name.

usage: python3 scripts/semantica-ingest.py [projectRoot]
"""
import json
import os
import re
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
SEMANTICA_SRC = os.path.join(
    ROOT, "research/graph-infra-repos/semantica"
)
sys.path.insert(0, SEMANTICA_SRC)

from semantica.context import ContextGraph  # noqa: E402

SKIP = {"node_modules", ".git", "Checkpoints", "graphify-out", "dist", "out",
        ".gi", "research", "SHIP_PACKAGES", "packages", ".ua", "reports",
        "__pycache__", ".venv", "corbell-data",
        # ★ THE OTHER-TREE LAW (2026-09-27): checked-in FOREIGN trees MUST be skipped,
        #   or the layer indexes THEM as source (measured: 80% of L1 was fork/archive).
        "fork-v143", "live-tree", "vendor", "Ship_Packages"}
EXTS = {".ts", ".tsx", ".js", ".mjs"}
# the exported-declaration forms (the same set the gate's own EXPORT_PARSE_RE covers)
DECL_RE = re.compile(
    r"^export\s+(?:async\s+)?(?:function|const|class|let|var|type|interface|enum)\s+(\w+)",
    re.M,
)
IMPORT_RE = re.compile(r"""^import\s+(?:[^'"]*?\s+from\s+)?['"](\.[^'"]+)['"]""", re.M)


def walk(d, out=None, depth=0):
    out = [] if out is None else out
    if depth > 8:
        return out
    try:
        entries = os.listdir(d)
    except OSError:
        return out
    for name in entries:
        if name in SKIP or name.startswith("."):
            continue
        p = os.path.join(d, name)
        if os.path.isdir(p):
            walk(p, out, depth + 1)
        elif os.path.splitext(name)[1] in EXTS:
            out.append(p)
    return out


g = ContextGraph()
files = walk(ROOT)
known = {os.path.relpath(f, ROOT) for f in files}
nodes = edges = 0

for f in files:
    rel = os.path.relpath(f, ROOT)
    try:
        src = open(f, encoding="utf-8").read()
    except OSError:
        continue
    file_id = f"file::{rel}"
    if g.add_node(file_id, "file", content=rel, path=rel):
        nodes += 1
    for name in DECL_RE.findall(src):
        sym_id = f"symbol::{rel}::{name}"
        if g.add_node(sym_id, "symbol", content=name, name=name, file=rel):
            nodes += 1
        if g.add_edge(file_id, sym_id, "defines"):
            edges += 1
    for spec in IMPORT_RE.findall(src):
        resolved = os.path.normpath(os.path.join(os.path.dirname(rel), spec))
        for cand in (resolved, resolved + ".ts", resolved + ".tsx",
                     os.path.join(resolved, "index.ts")):
            if cand in known:
                if g.add_edge(file_id, f"file::{cand}", "imports"):
                    edges += 1
                break

out_dir = os.path.join(ROOT, ".omp/graph-intelligence/layers/semantica")
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "kg.json")

# ★ the L1 adapter's contract: { entities: [{id,name,type,source}], relationships: [...] }
raw = g.to_dict()
# ★ MEASURED SHAPE (2026-09-23): {"nodes": [{"id","type","content","properties","metadata"}],
#   "edges": [{"id","familyId","source","target","type",…}], "statistics": {…}} — LISTS,
#   not dicts. The first mapping assumed a dict and produced entities=0.
ents = []
for n in (raw.get("nodes") or []):
    props = n.get("properties") or {}
    ents.append({
        "id": n.get("id"),
        "name": props.get("name") or n.get("content") or n.get("id"),
        "type": n.get("type") or "entity",
        "source": props.get("path") or props.get("file") or n.get("id"),
    })
rels = []
for e in (raw.get("edges") or []):
    rels.append({
        "source": e.get("source"),
        "target": e.get("target"),
        "type": e.get("type") or e.get("edge_type") or "related_to",
    })
json.dump({"entities": ents, "relationships": rels, "raw": raw},
          open(out_path, "w"), indent=1)
print(f"[semantica-ingest] root={ROOT} files={len(files)} nodes={nodes} edges={edges} "
      f"entities={len(ents)} relationships={len(rels)} -> {out_path} "
      f"({os.path.getsize(out_path)}B)")
