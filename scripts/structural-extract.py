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
        [--source-root <dir> ...] [--target <dir>]

GI KERNEL V3 W2 — TARGET-DRIVEN SOURCE ROOTS (spec §3 W2): --source-root
(repeatable, resolved against --root) restricts the scan to those subtrees;
--target <dir> (== --root when --root is omitted) runs the same discovery
(profile sources → workspace manifest → tsconfig → conventional → bounded
walk) so a bare invocation scans the target's real sources, never a bare
<target> root. A source-less target is the NAMED GI_NO_SOURCE_ROOT refusal
(exit 1) — never an empty graph.
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


# ★ THE SHARED WALK_SKIP (GI_KERNEL_V2.3 FR-6). ONE law, mirrored from
#   src/hunter/profile/source-roots.ts WALK_SKIP. Every producer uses THIS set; a
#   producer with its own list is the drift class that left structural at 12.4% in-scope.
#   THE FOREIGN TREES below are this repo's residual polluters — the trees the rule-3
#   ancestor bug swept in: measured Checkpoints 36544 · fork-v143 11711 · research 7331 ·
#   Ship_Packages 3731 · SHIP_PACKAGES 2238 · vendor 128.
SKIP_DIRS = frozenset({
    # the generic build/state artifacts
    "node_modules", ".git", "dist", "build", ".gi", "Checkpoints",
    "corbell-data", ".omp", "coverage",
    # ★ the foreign/archive trees (this repo's residual polluters)
    "fork-v143", "research", "Ship_Packages", "SHIP_PACKAGES", "vendor",
})


def _has_direct_ts(d: Path) -> bool:
    try:
        return any(p.is_file() and p.suffix == ".ts" and not p.name.endswith(".d.ts")
                   for p in d.iterdir())
    except OSError:
        return False


def _contains_ts_recursive(d: Path, depth: int = 0) -> bool:
    if depth > 6:
        return False
    try:
        entries = list(d.iterdir())
    except OSError:
        return False
    for p in entries:
        if p.is_file() and p.suffix == ".ts" and not p.name.endswith(".d.ts"):
            return True
    for p in entries:
        if p.is_dir() and not p.is_symlink() and p.name not in SKIP_DIRS:
            if _contains_ts_recursive(p, depth + 1):
                return True
    return False


def _extract_yaml_string_list(raw: str, key: str) -> list[str] | None:
    lines = raw.splitlines()
    for i, line in enumerate(lines):
        body = line.split("#", 1)[0]
        m = __import__("re").match(r"^(\s*)([A-Za-z0-9_.\-]+)\s*:(.*)$", body)
        if not m or m.group(2) != key:
            continue
        rest = m.group(3).strip()
        if rest.startswith("["):
            inner = rest[1:].split("]", 1)[0]
            return [t.strip().strip("'\"") for t in inner.split(",") if t.strip().strip("'\"")]
        if rest:
            return None
        base = len(m.group(1))
        out: list[str] = []
        for nxt in lines[i + 1:]:
            nb = nxt.split("#", 1)[0]
            if not nb.strip():
                continue
            indent = len(nb) - len(nb.lstrip())
            if indent <= base:
                break
            im = __import__("re").match(r"^-\s+(.*)$", nb.strip())
            if not im:
                break
            v = im.group(1).strip().strip("'\"")
            if v:
                out.append(v)
        return out
    return None


def _expand_workspace_glob(root: Path, glob: str) -> list[Path]:
    g = glob.strip().lstrip("./")
    if not g:
        return []
    star = g.find("*")
    if star >= 0:
        base = (root / g[:star].rstrip("/")).resolve()
        try:
            return sorted(p for p in base.iterdir() if p.is_dir() or p.is_symlink())
        except OSError:
            return []
    return [root / g]


def _discover_source_roots(target: Path) -> tuple[list[Path] | None, str]:
    """The honest port of source-roots.ts rules 1-5. Returns (roots, evidence)
    or (None, the GI_NO_SOURCE_ROOT refusal string)."""
    root = target.resolve()
    # rule 1 — the target's own profile `sources:` key (EXPLICIT WINS)
    prof = root / ".omp" / "graph-intelligence" / "profile.yaml"
    if prof.is_file():
        try:
            import re as _re
            in_sources, collecting, indent0 = False, False, 0
            sources: list[str] = []
            for line in prof.read_text().splitlines():
                body = line.split("#", 1)[0].rstrip()
                if not body.strip():
                    continue
                mm = _re.match(r"^(\s*)sources\s*:(.*)$", body)
                if mm and not collecting:
                    rest = mm.group(2).strip()
                    if rest.startswith("["):
                        inner = rest[1:].split("]", 1)[0]
                        sources = [t.strip().strip("'\"") for t in inner.split(",")
                                   if t.strip().strip("'\"")]
                        in_sources = True
                        break
                    if rest:
                        break
                    in_sources, collecting, indent0 = True, True, len(mm.group(1))
                    continue
                if in_sources and collecting:
                    indent = len(body) - len(body.lstrip())
                    if indent <= indent0:
                        break
                    im = _re.match(r"^-\s+(.*)$", body.strip())
                    if not im:
                        break
                    v = im.group(1).strip().strip("'\"")
                    if v:
                        sources.append(v)
            hits = sorted({str((root / s).resolve()) for s in sources
                           if (root / s).is_dir()})
            if hits:
                return [Path(h) for h in hits], f"rule1:profile-sources {prof}"
        except OSError:
            pass
    # rule 2 — workspace manifests
    globs: list[str] | None = None
    via = ""
    pnpm = root / "pnpm-workspace.yaml"
    if pnpm.is_file():
        try:
            globs = _extract_yaml_string_list(pnpm.read_text(), "packages")
            via = str(pnpm)
        except OSError:
            globs = None
    if not globs:
        pkg = root / "package.json"
        if pkg.is_file():
            try:
                import json as _json
                data = _json.loads(pkg.read_text())
                w = data.get("workspaces")
                arr = w if isinstance(w, list) else (
                    w.get("packages") if isinstance(w, dict) else None)
                if isinstance(arr, list):
                    cand = [x for x in arr if isinstance(x, str) and x]
                    if cand:
                        globs, via = cand, str(pkg)
            except (OSError, ValueError):
                pass
    if not globs:
        lerna = root / "lerna.json"
        if lerna.is_file():
            try:
                import json as _json
                data = _json.loads(lerna.read_text())
                if isinstance(data.get("packages"), list):
                    cand = [x for x in data["packages"] if isinstance(x, str) and x]
                    if cand:
                        globs, via = cand, str(lerna)
            except (OSError, ValueError):
                pass
    if globs:
        out: list[str] = []
        for g in globs:
            for d in _expand_workspace_glob(root, g):
                if not d.is_dir():
                    continue
                src = d / "src"
                pick = src if (src.is_dir() and _contains_ts_recursive(src)) else (
                    d if _contains_ts_recursive(d) else None)
                if pick is not None:
                    rp = str(pick.resolve())
                    if rp not in out:
                        out.append(rp)
        if out:
            return [Path(h) for h in sorted(out)], f"rule2:workspace-manifest {via}"
    # rule 3 — tsconfig.json include/files → common ancestor
    tsc = root / "tsconfig.json"
    if tsc.is_file():
        try:
            import json as _json
            data = _json.loads(tsc.read_text())
            entries = [e for e in (data.get("include") or []) if isinstance(e, str) and e] + \
                      [e for e in (data.get("files") or []) if isinstance(e, str) and e]
            dirs: list[Path] = []
            for e in entries:
                head = e.split("*", 1)[0].rstrip("/")
                cand = root if not head else (root / head)
                if cand.is_dir():
                    dirs.append(cand.resolve())
                elif cand.is_file():
                    dirs.append(cand.resolve().parent)
            if dirs:
                # ★ THE GLOB-PREFIX LAW (ported from source-roots.ts ruleTsconfig, V2.2 W4,
                #   2026-09-28). The include entries name SOURCE DIRS directly (`src/**/*.ts`
                #   → `src/`, `tests/**/*.ts` → `tests/`). Returning their COMMON ANCESTOR
                #   (the repo root) made structural sweep the ENTIRE tree — Checkpoints/ ·
                #   fork-v143/ · research/ · Ship_Packages/ — measured 70,453 nodes at 12.4%
                #   in-scope (a PY/TS divergence: the TS rule got the W4 fix, the PY port did
                #   not). Return the PREFIX DIRS that hold sources; the ancestor stays ONLY
                #   as the fallback.
                with_ts = [d for d in dict.fromkeys(dirs)
                           if d.is_dir() and _contains_ts_recursive(d)]
                if with_ts:
                    entries_csv = ", ".join(entries)
                    return ([Path(h) for h in sorted(str(x) for x in with_ts)],
                            f"rule3:tsconfig {tsc} entries=[{entries_csv}]")
                parts = [list(p.parts) for p in dirs]
                common = list(parts[0])
                for pp in parts[1:]:
                    i = 0
                    while i < len(common) and i < len(pp) and common[i] == pp[i]:
                        i += 1
                    common = common[:i]
                anc = Path(*common) if common else Path("/")
                if anc.is_dir() and _contains_ts_recursive(anc):
                    return [anc.resolve()], f"rule3:tsconfig {tsc} (common ancestor)"
        except (OSError, ValueError):
            pass
    # rule 4 — conventional roots
    conv: list[str] = []
    for c in ("src", "lib", "app"):
        d = root / c
        if d.is_dir() and _contains_ts_recursive(d):
            rp = str(d.resolve())
            if rp not in conv:
                conv.append(rp)
    pkgs = root / "packages"
    if pkgs.is_dir():
        try:
            for n in sorted(p.name for p in pkgs.iterdir() if p.is_dir() or p.is_symlink()):
                d = pkgs / n / "src"
                if d.is_dir() and _contains_ts_recursive(d):
                    rp = str(d.resolve())
                    if rp not in conv:
                        conv.append(rp)
        except OSError:
            pass
    if conv:
        return [Path(h) for h in sorted(conv)], "rule4:conventional src/ lib/ app/ packages/*/src"
    # rule 5 — bounded walk (depth ≤ 4): dirs with ≥1 .ts whose parent has none
    found: list[str] = []

    def _visit(d: Path, depth: int, parent_has: bool) -> None:
        try:
            entries = list(d.iterdir())
        except OSError:
            return
        has = any(p.is_file() and p.suffix == ".ts" and not p.name.endswith(".d.ts")
                  for p in entries)
        if has and not parent_has:
            found.append(str(d.resolve()))
        if depth >= 4:
            return
        for n in sorted(p.name for p in entries
                        if p.is_dir() and not p.is_symlink() and p.name not in SKIP_DIRS):
            _visit(d / n, depth + 1, has)

    _visit(root, 0, False)
    if found:
        return [Path(h) for h in sorted(set(found))], "rule5:bounded-walk depth<=4"
    return None, f"GI_NO_SOURCE_ROOT: no source root discovered under {root}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=False, default=None)
    ap.add_argument("--target", required=False, default=None)
    ap.add_argument("--store", required=True)
    ap.add_argument("--run-tag", default=None)
    ap.add_argument("--source-root", dest="source_roots", action="append", default=[])
    a = ap.parse_args()

    base = a.root or a.target
    if not base:
        print("structural-extract: --root <dir> (or --target <dir>) is required",
              file=sys.stderr)
        return 2
    root = Path(base).resolve()
    store = Path(a.store).resolve()
    run = a.run_tag or f"structural-{int(time.time() * 1000):x}"

    # GI KERNEL V3 W2: --source-root (repeatable, against --root) wins;
    # otherwise discover from the target. Source-less → the NAMED refusal.
    if a.source_roots:
        scan_roots = [(root / s).resolve() for s in a.source_roots]
    else:
        discovered, evidence = _discover_source_roots(root)
        if discovered is None:
            print(evidence, file=sys.stderr)
            return 1
        scan_roots = discovered
        print(f"[structural-extract] source roots ({len(scan_roots)}): "
              f"{', '.join(str(r) for r in scan_roots)} ({evidence})")

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

    files: list[Path] = []
    for scan in scan_roots:
        if not scan.is_dir():
            continue
        # ★ THE SHARED SKIP APPLIES AT THE `rglob` TOO (GI_KERNEL_V2.3 FR-6) — not just at
        #   the walk. The V2.2 code filtered ONLY `node_modules`, so ANY positive root that
        #   contained an archive tree leaked it in. Now one law governs both: a path with
        #   ANY skipped part is dropped.
        files.extend(
            p for p in scan.rglob("*.ts")
            if not any(part in SKIP_DIRS for part in p.parts)
            and not p.name.endswith(".d.ts")
        )
    files = sorted(set(files))

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
