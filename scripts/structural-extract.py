#!/usr/bin/env python3
"""structural-extract — THE KERNEL'S OWN STRUCTURAL EXTRACTOR.

★ WHY THIS EXISTS (measured, 2026-09-22): the graph-fact settlement layer
(`src/omp/graph-facts.ts`) shipped with six correct rules and could settle **0 of 4** of the
session's own structural derailments. The reason was NOT the rules — it was the EXTRACTOR:
corbell's indexer emits `method | class | flow | service`, and the rules need
`type | field | const | closure`. The four kinds are ALL AST-reachable, so the kernel
extracts them itself.

★ THE HONEST BOUND OF THIS SCRIPT, stated up front:
  · it writes a SECOND layer of nodes (`layer_id='structural'`) into the SAME typed store
    corbell writes to. It does NOT replace corbell's method graph — it ADDS the kinds
    corbell does not emit.
  · it uses THE SAME PARSER (tree-sitter + tree_sitter_typescript, the grammar corbell uses),
    so the two layers agree about what a TypeScript file IS.
  · `references` edges are emitted from the ENCLOSING declaration to each declared name it
    mentions — an exact AST-level count, not a text-level guess.
  · ★ AND IT WRITES ITS OWN PROVENANCE (`gi_meta.populated_at`) — the discipline whose
    absence made the corbell checkout refuse every fact as STALE BY CONSTRUCTION.

USAGE:  /home/leviathan/corbell-venv/bin/python scripts/structural-extract.py --root <dir> \
            --store <path/to/store.sqlite> [--run-tag <tag>]
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
import time
from pathlib import Path

import tree_sitter_typescript as tst
from tree_sitter import Language, Parser

# ── the node kinds this extractor emits, and the corbell kinds it deliberately does not ──
KINDS = ("type", "field", "const", "closure")

# the DDL the store already carries (typed_nodes/typed_edges/gi_meta) is created by
# `applyTypedDdl` on the TypeScript side; this script ASSERTS it exists rather than
# re-declaring it — a second copy of a schema is a second source of truth (EN-070).


def make_parser() -> Parser:
    try:
        return Parser(Language(tst.language_typescript()))
    except Exception:                                    # tree_sitter 0.21-and-earlier form
        p = Parser()
        p.set_language(Language(tst.language_typescript(), "typescript"))
        return p


# ── PASS 1: declarations → nodes ──────────────────────────────────────────────────────────
def collect_declarations(tree, src: bytes, rel: str) -> list[dict]:
    """Emit one node per declared: interface | type alias | class field | variable | closure.

    ★ A CLOSURE IS A DECLARATION TOO. The D-5 false-IGNORE happened because `const evict =
    () => …` was invisible: the graph counted one call site where the truth was two. A
    closure bound to a name is a first-class declaration for the purposes of guard parity."""
    out: list[dict] = []

    def name_of(node) -> str | None:
        n = node.child_by_field_name("name")
        if n is not None:
            return n.text.decode()
        # a variable_declarator carries its name as `name` too
        return None

    def add(kind: str, name: str, node) -> None:
        line = node.start_point[0] + 1
        # ★ THE ID CARRIES THE LINE, AND IT MUST. `typed_nodes.canonical_id` is UNIQUE, and
        #   the SAME NAME can be declared twice in one file (two `x` in different scopes, a
        #   field and a variable). MEASURED: `structural::<file>::<name>` hit
        #   "UNIQUE constraint failed" on the first real run. Two declarations of one name in
        #   different scopes ARE different nodes — the location is what makes them so.
        out.append({
            "id": f"structural::{rel}:{line}::{name}",
            "kind": kind,
            "label": name,
            "file": rel,
            "line": line,
            "spans": (node.start_byte, node.end_byte),
        })

    def walk(node) -> None:
        t = node.type
        if t == "interface_declaration":
            n = name_of(node)
            if n:
                add("type", n, node)
                # the MEMBERS of an interface are fields (D-6's kind)
                for c in node.children:
                    if c.type == "object_type" or c.type == "interface_body":
                        for m in c.children:
                            if m.type in ("property_signature", "method_signature"):
                                mn = name_of(m)
                                if mn:
                                    add("field", mn, m)
        elif t == "type_alias_declaration":
            n = name_of(node)
            if n:
                add("type", n, node)
        elif t in ("public_field_definition", "property_declaration"):
            n = name_of(node)
            if n:
                add("field", n, node)
        elif t == "variable_declarator":
            n = name_of(node)
            if n:
                v = node.child_by_field_name("value")
                # ★ a closure is its OWN kind — it is where guard-parity lives
                if v is not None and v.type == "arrow_function":
                    add("closure", n, node)
                else:
                    add("const", n, node)
        for c in node.children:
            walk(c)

    walk(tree.root_node)
    return out


# ── PASS 2: references → edges (so in-degree MEANS something) ─────────────────────────────
DECL_LINES: dict[str, list[tuple[str, int]]] = {}


def collect_references(tree, src: bytes, rel: str, declared: set[str]) -> list[dict]:
    """One edge per (enclosing declaration, declared name it mentions).

    ★ THE COUNT IS AST-EXACT: identifiers are compared as WHOLE TOKENS from the parse tree,
    never as substrings of the raw text. A text match would count `foo` inside `foobar`."""
    edges: list[dict] = []
    seen: set[tuple[str, str]] = set()

    def enclosing(node) -> str | None:
        cur = node.parent
        while cur is not None:
            if cur.type in ("interface_declaration", "type_alias_declaration",
                            "public_field_definition", "property_declaration",
                            "variable_declarator", "function_declaration",
                            "method_definition", "method_signature"):
                n = cur.child_by_field_name("name")
                if n is not None:
                    return n.text.decode()
            cur = cur.parent
        return None

    def walk(node) -> None:
        if node.type in ("identifier", "type_identifier", "property_identifier"):
            name = node.text.decode()
            # ★★★ THE DECLARATION SITE IS NOT A REFERENCE TO ITSELF — FOUND BY RUNNING THE
            #   RULE AGAINST THE REAL STORE. Without this guard, declaring `ledgerPath?: string`
            #   emitted `FireGateConfig --references--> ledgerPath`, so EVERY declared member
            #   had in-degree >= 1 and M-GRAPH-2 could never fire. The rule was correct; the
            #   EXTRACTOR MANUFACTURED THE REFERENCE IT WAS SUPPOSED TO LOOK FOR.
            #   ★ THE TEST: an identifier is a REFERENCE only when it is not the `name` field
            #     of its own declaration node.
            is_own_name = False
            par = node.parent
            if par is not None:
                nm = par.child_by_field_name("name")
                if nm is not None and nm.id == node.id:
                    is_own_name = True
                # type annotations: the `identifier` inside `Foo` in `x: Foo` IS a reference
                if par.type in ("type_annotation", "generic_type", "type_identifier"):
                    is_own_name = False
            if name in declared and not is_own_name:
                src_sym = enclosing(node)
                if src_sym is not None and src_sym != name:
                    key = (src_sym, name)
                    if key not in seen:
                        seen.add(key)
                        # resolve to the FIRST declaration of that name in the file — the
                        # enclosing symbol, not the reference site, carries the line
                        dst_line = next((ln for (lbl, ln) in DECL_LINES.get(rel, []) if lbl == name), 0)
                        edges.append({
                            "src": f"structural::{rel}::{src_sym}",
                            "dst": f"structural::{rel}:{dst_line}::{name}" if dst_line else f"structural::{rel}::{name}",
                            "predicate": "references",
                        })
        for c in node.children:
            walk(c)

    walk(tree.root_node)
    return edges


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--store", required=True)
    ap.add_argument("--run-tag", default=None)
    a = ap.parse_args()

    root = Path(a.root).resolve()
    store = Path(a.store).resolve()
    run = a.run_tag or f"structural-{int(time.time() * 1000):x}"

    parser = make_parser()

    conn = sqlite3.connect(str(store), timeout=30)
    cur = conn.cursor()

    # ★ THE SCHEMA IS NOT DECLARED HERE. Assert it exists (applyTypedDdl owns it).
    have = {r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    for need in ("typed_nodes", "typed_edges", "gi_meta"):
        if need not in have:
            print(f"GI_STRUCTURAL_NO_SCHEMA: {need} is absent from {store} — run the "
                  f"TypeScript applyTypedDdl first.", file=sys.stderr)
            return 2

    files = sorted(p for p in root.rglob("*.ts")
                   if "node_modules" not in p.parts and not p.name.endswith(".d.ts"))

    total_nodes = total_edges = 0
    for path in files:
        rel = str(path.relative_to(root))
        try:
            src = path.read_bytes()
        except OSError:
            continue
        tree = parser.parse(src)
        nodes = collect_declarations(tree, src, rel)
        declared = {n["label"] for n in nodes}
        DECL_LINES[rel] = [(n["label"], n["line"]) for n in nodes]
        edges = collect_references(tree, src, rel, declared)

        # supersede this file's previous structural rows, then insert the new set
        cur.execute("UPDATE typed_nodes SET superseded_run = ? WHERE layer_id = 'structural' "
                    "AND file = ? AND superseded_run IS NULL", (run, rel))
        cur.execute("UPDATE typed_edges SET superseded_run = ? WHERE layer_id = 'structural' "
                    "AND src_canonical IN (SELECT canonical_id FROM typed_nodes WHERE file = ?)",
                    (run, rel))
        for n in nodes:
            cur.execute(
                "INSERT INTO typed_nodes (canonical_id, kind, label, file, line, created_run, "
                "superseded_run, layer_id) VALUES (?,?,?,?,?,?,NULL,'structural')",
                (n["id"], n["kind"], n["label"], n["file"], n["line"], run))
            total_nodes += 1
        for e in edges:
            cur.execute(
                "INSERT INTO typed_edges (src_canonical, dst_canonical, predicate, "
                "evidence_quote, confidence, created_run, superseded_run, layer_id, derivation) "
                "VALUES (?,?,?,'ast-reference',1.0,?,NULL,'structural','explicit')",
                (e["src"], e["dst"], e["predicate"], run))
            total_edges += 1

    # ★ THE PROVENANCE RIDE-ALONG — a store without populated_at is refused as STALE BY
    #   CONSTRUCTION (measured on the corbell checkout: gi_meta had ZERO rows).
    cur.execute("INSERT INTO gi_meta (key, value) VALUES ('populated_at', ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z",))
    cur.execute("INSERT INTO gi_meta (key, value) VALUES ('structural_run', ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value", (run,))
    conn.commit()

    by_kind = dict(cur.execute(
        "SELECT kind, COUNT(*) FROM typed_nodes WHERE layer_id='structural' AND "
        "superseded_run IS NULL GROUP BY kind").fetchall())
    conn.close()

    print(f"STRUCTURAL_EXTRACT_OK run={run} files={len(files)} "
          f"nodes={total_nodes} edges={total_edges} kinds={by_kind}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
