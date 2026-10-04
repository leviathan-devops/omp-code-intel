// GI KERNEL V2.2 W2 — TARGET-DRIVEN SOURCE-ROOT DISCOVERY (spec §3 W2).
// The graph is a FUNCTION OF THE TARGET: this module derives the target's
// source roots instead of hardcoding `<target>/src` (the E4 GRAPH_EMPTY root:
// Understand-Anything keeps sources in understand-anything-plugin/packages/*/src).
//
// THE ALGORITHM (in order, first hit wins per rule):
//   1. the target's own profile (.omp/graph-intelligence/profile.yaml) `sources:` key — EXPLICIT WINS
//   2. a workspace manifest (pnpm-workspace.yaml | package.json workspaces | lerna.json)
//      → each glob's dir + `/src` if it exists
//   3. tsconfig.json `include` / `files` → their common ancestor
//   4. a conventional root that EXISTS and CONTAINS .ts files: src/ · lib/ · app/ · packages/*/src
//   5. a bounded walk (depth ≤ 4) collecting every dir that contains ≥1 .ts and whose PARENT does not
// NO HIT → { error: "GI_NO_SOURCE_ROOT: no source root discovered under <target>" } (D5).
//
// THE REFUSAL LAW (the anti-GRAPH_EMPTY law): a build that finds no source root
// returns GI_NO_SOURCE_ROOT. It NEVER proceeds to produce an empty graph.

import fs from 'node:fs';
import path from 'node:path';
import { parseYamlSubset } from './loader.ts';

/** A .ts source file (never a declaration file — a dir of only .d.ts is not a source root). */
function isTsFile(name: string): boolean {
  return name.endsWith('.ts') && !name.endsWith('.d.ts');
}

/** Direct children only: does this dir hold ≥1 .ts file? Missing/unreadable → false. */
function dirHasDirectTs(dir: string): boolean {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  return entries.some((e) => e.isFile() && isTsFile(e.name));
}

/** Recursive .ts presence (prunes node_modules/.git, depth-capped). Missing → false. */
function dirContainsTsRecursive(dir: string, depth = 0): boolean {
  if (depth > 6) return false;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const e of entries) {
    if (e.isFile() && isTsFile(e.name)) return true;
  }
  for (const e of entries) {
    if (!e.isDirectory() || e.isSymbolicLink()) continue;
    if (e.name === 'node_modules' || e.name === '.git') continue;
    if (dirContainsTsRecursive(path.join(dir, e.name), depth + 1)) return true;
  }
  return false;
}

/** Realpath when possible, else the resolved absolute path (never throws). */
function realOrResolve(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

// ---------------------------------------------------------------------------
// Rule 1 — the target's own profile `sources:` key (EXPLICIT WINS)
// ---------------------------------------------------------------------------

function ruleProfileSources(root: string): { roots: string[]; via: string } | null {
  const profPath = path.join(root, '.omp', 'graph-intelligence', 'profile.yaml');
  if (!fs.existsSync(profPath)) return null;
  let raw: string;
  try {
    raw = fs.readFileSync(profPath, 'utf8');
  } catch {
    return null;
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = parseYamlSubset(raw);
  } catch {
    return null;
  }
  const sources = parsed['sources'];
  if (!Array.isArray(sources) || sources.length === 0) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of sources) {
    if (typeof s !== 'string' || s.length === 0) continue;
    try {
      const rp = fs.realpathSync(path.resolve(root, s));
      if (!fs.statSync(rp).isDirectory()) continue;
      if (!seen.has(rp)) {
        seen.add(rp);
        out.push(rp);
      }
    } catch {
      // a named-but-missing source is skipped — a later rule may still hit
    }
  }
  if (out.length === 0) return null;
  return { roots: out.sort(), via: `rule1:profile-sources ${profPath}` };
}

// ---------------------------------------------------------------------------
// Rule 2 — workspace manifests. Only the package list is needed, so a small
// dedicated extractor reads it: the full pnpm-workspace.yaml shape (quoted
// keys like '@scope/pkg', nested allowBuilds maps) is OUTSIDE the
// parseYamlSubset contract, which is reserved for the profile read above.
// ---------------------------------------------------------------------------

/** Extract a top-level string list `key:` in flow (`key: [a, b]`) or block form. */
function extractYamlStringList(raw: string, key: string): string[] | null {
  const lines = raw.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const stripped = line.split('#')[0]!;
    const m = /^(\s*)([A-Za-z0-9_.-]+)\s*:(.*)$/.exec(stripped);
    if (!m || m[2] !== key) continue;
    const rest = m[3]!.trim();
    if (rest.startsWith('[')) {
      const inner = rest.replace(/^\[/, '').replace(/].*$/, '');
      const items = inner
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter((s) => s.length > 0);
      return items;
    }
    if (rest.length > 0) return null; // a scalar, not a list
    const baseIndent = m[1]!.length;
    const out: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j]!.split('#')[0]!;
      if (l.trim().length === 0) continue;
      const indent = l.length - l.trimStart().length;
      if (indent <= baseIndent) break;
      const item = /^-\s+(.*)$/.exec(l.trim());
      if (!item) break;
      const v = item[1]!.trim().replace(/^['"]|['"]$/g, '');
      if (v.length > 0) out.push(v);
    }
    return out;
  }
  return null;
}

function readWorkspaceGlobs(root: string): { globs: string[]; via: string } | null {
  const pnpm = path.join(root, 'pnpm-workspace.yaml');
  if (fs.existsSync(pnpm)) {
    try {
      const globs = extractYamlStringList(fs.readFileSync(pnpm, 'utf8'), 'packages');
      if (globs && globs.length > 0) return { globs, via: pnpm };
    } catch {
      // fall through to the next manifest
    }
  }
  const pkgJson = path.join(root, 'package.json');
  if (fs.existsSync(pkgJson)) {
    try {
      const data = JSON.parse(fs.readFileSync(pkgJson, 'utf8')) as { workspaces?: unknown };
      const w = data.workspaces;
      const arr = Array.isArray(w)
        ? w
        : w !== null && typeof w === 'object'
          ? (w as { packages?: unknown }).packages
          : undefined;
      if (Array.isArray(arr)) {
        const globs = arr.filter((p): p is string => typeof p === 'string' && p.length > 0);
        if (globs.length > 0) return { globs, via: pkgJson };
      }
    } catch {
      // fall through to the next manifest
    }
  }
  const lerna = path.join(root, 'lerna.json');
  if (fs.existsSync(lerna)) {
    try {
      const data = JSON.parse(fs.readFileSync(lerna, 'utf8')) as { packages?: unknown };
      if (Array.isArray(data.packages)) {
        const globs = data.packages.filter((p): p is string => typeof p === 'string' && p.length > 0);
        if (globs.length > 0) return { globs, via: lerna };
      }
    } catch {
      // no manifest yielded a list
    }
  }
  return null;
}

/** A workspace glob → concrete dirs. Trailing /* or /** expands to subdirs; else a literal dir. */
function expandWorkspaceGlob(root: string, glob: string): string[] {
  const g = glob.trim().replace(/^\.\/+/, '');
  if (g.length === 0) return [];
  const star = g.indexOf('*');
  if (star >= 0) {
    const base = g.slice(0, star).replace(/\/+$/, '');
    const baseAbs = path.resolve(root, base);
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(baseAbs, { withFileTypes: true });
    } catch {
      return [];
    }
    return entries
      .filter((e) => e.isDirectory() || e.isSymbolicLink())
      .map((e) => path.join(baseAbs, e.name))
      .sort();
  }
  return [path.resolve(root, g)];
}

function ruleWorkspace(root: string): { roots: string[]; via: string } | null {
  const manifest = readWorkspaceGlobs(root);
  if (!manifest) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  const consider = (dir: string): void => {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(dir);
    } catch {
      return;
    }
    if (!stat.isDirectory()) return;
    // each glob's dir + `/src` if it exists (and holds sources), else the dir itself if it holds sources
    const src = path.join(dir, 'src');
    let pick: string | null = null;
    try {
      if (fs.statSync(src).isDirectory() && dirContainsTsRecursive(src)) pick = src;
    } catch {
      pick = null;
    }
    if (pick === null && dirContainsTsRecursive(dir)) pick = dir;
    if (pick === null) return;
    const rp = realOrResolve(pick);
    if (!seen.has(rp)) {
      seen.add(rp);
      out.push(rp);
    }
  };
  for (const g of manifest.globs) {
    for (const d of expandWorkspaceGlob(root, g)) consider(d);
  }
  if (out.length === 0) return null;
  return {
    roots: out.sort(),
    via: `rule2:workspace-manifest ${manifest.via} globs=[${manifest.globs.join(', ')}]`,
  };
}

// ---------------------------------------------------------------------------
// Rule 3 — tsconfig.json `include` / `files` → their common ancestor
// ---------------------------------------------------------------------------

function commonAncestor(dirs: string[]): string {
  const split = dirs.map((d) => d.split(path.sep).filter((s) => s.length > 0));
  let common = split[0] ?? [];
  for (const parts of split.slice(1)) {
    let i = 0;
    while (i < common.length && i < parts.length && common[i] === parts[i]) i++;
    common = common.slice(0, i);
  }
  if (common.length === 0) return path.sep;
  return path.sep + common.join(path.sep);
}

function ruleTsconfig(root: string): { roots: string[]; via: string } | null {
  const tsconfig = path.join(root, 'tsconfig.json');
  if (!fs.existsSync(tsconfig)) return null;
  let data: { include?: unknown; files?: unknown };
  try {
    data = JSON.parse(fs.readFileSync(tsconfig, 'utf8')) as { include?: unknown; files?: unknown };
  } catch {
    return null;
  }
  const entries: string[] = [];
  if (Array.isArray(data.include)) {
    for (const e of data.include) if (typeof e === 'string' && e.length > 0) entries.push(e);
  }
  if (Array.isArray(data.files)) {
    for (const e of data.files) if (typeof e === 'string' && e.length > 0) entries.push(e);
  }
  if (entries.length === 0) return null;
  const dirs: string[] = [];
  for (const e of entries) {
    const star = e.indexOf('*');
    const head = (star >= 0 ? e.slice(0, star) : e).replace(/\/+$/, '');
    const abs = head.length === 0 ? root : path.resolve(root, head);
    try {
      const st = fs.statSync(abs);
      if (st.isDirectory()) dirs.push(realOrResolve(abs));
      else if (st.isFile()) dirs.push(path.dirname(realOrResolve(abs)));
    } catch {
      // a named-but-missing entry is skipped
    }
  }
  if (dirs.length === 0) return null;
  // ★ THE GLOB-PREFIX LAW (V2.2 W4 fix, 2026-09-26 — found on the GI repo itself): the
  //   include entries name the SOURCE dirs directly (`src/**/*.ts` → `src/`,
  //   `tests/**/*.ts` → `tests/`). Returning their COMMON ANCESTOR (the repo root) made
  //   corbell walk the ENTIRE tree — Checkpoints/, node_modules/, Ship_Packages/ — which
  //   hits corbell's CLI RecursionError (a real mechanism) and is the 90-min D-state
  //   stall the adapter's own comment warns about. Return the PREFIX DIRS; the ancestor
  //   stays only as the fallback when no prefix dir holds sources directly.
  const withTs = [...new Set(dirs)].filter((d) => {
    try {
      return fs.statSync(d).isDirectory() && dirContainsTsRecursive(d);
    } catch {
      return false;
    }
  });
  if (withTs.length > 0) {
    return {
      roots: withTs.map(realOrResolve),
      via: `rule3:tsconfig ${tsconfig} entries=[${entries.join(', ')}]`,
    };
  }
  const ancestor = commonAncestor(dirs);
  try {
    if (fs.statSync(ancestor).isDirectory() && dirContainsTsRecursive(ancestor)) {
      return {
        roots: [realOrResolve(ancestor)],
        via: `rule3:tsconfig ${tsconfig} entries=[${entries.join(', ')}] (common ancestor)`,
      };
    }
  } catch {
    // the ancestor holds no sources — miss
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rule 4 — conventional roots that EXIST and CONTAIN .ts files
// ---------------------------------------------------------------------------

function ruleConventional(root: string): { roots: string[]; via: string } | null {
  const out: string[] = [];
  const seen = new Set<string>();
  const take = (abs: string): void => {
    try {
      if (fs.statSync(abs).isDirectory() && dirContainsTsRecursive(abs)) {
        const rp = realOrResolve(abs);
        if (!seen.has(rp)) {
          seen.add(rp);
          out.push(rp);
        }
      }
    } catch {
      // absent — skip
    }
  };
  for (const c of ['src', 'lib', 'app']) take(path.join(root, c));
  const pkgs = path.join(root, 'packages');
  try {
    const entries = fs.readdirSync(pkgs, { withFileTypes: true });
    const names = entries
      .filter((e) => e.isDirectory() || e.isSymbolicLink())
      .map((e) => e.name)
      .sort();
    for (const n of names) take(path.join(pkgs, n, 'src'));
  } catch {
    // no packages/ dir — skip
  }
  if (out.length === 0) return null;
  return { roots: out.sort(), via: 'rule4:conventional src/ lib/ app/ packages/*/src' };
}

// ---------------------------------------------------------------------------
// Rule 5 — bounded walk (depth ≤ 4): every dir with ≥1 .ts whose PARENT has none
// ---------------------------------------------------------------------------

/** ★ THE SHARED WALK_SKIP (GI_KERNEL_V2.3 FR-6) — ONE skip law, EXPORTED so every
 *  producer (structural-extract.py, semantica-ingest.py, c2kg-produce, ua-ingest.ts)
 *  mirrors THIS set. A producer with its own list is the drift class that left
 *  structural at 12.4% in-scope. The foreign/archive trees are this repo's residual
 *  polluters (the rule-3 ancestor bug swept them in: Checkpoints 36544 · fork-v143 11711
 *  · research 7331 · Ship_Packages 3731 · SHIP_PACKAGES 2238 · vendor 128). */
export const WALK_SKIP = new Set([
  // the generic build/state artifacts
  'node_modules',
  '.git',
  'dist',
  'build',
  '.gi',
  'Checkpoints',
  'corbell-data',
  '.omp',
  'coverage',
  // ★ the foreign/archive trees
  'fork-v143',
  'research',
  'Ship_Packages',
  'SHIP_PACKAGES',
  'vendor',
]);

function ruleWalk(root: string, maxDepth = 4): { roots: string[]; via: string } | null {
  const out: string[] = [];
  const visit = (dir: string, depth: number, ancestorPushed: boolean): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const hasTs = entries.some((e) => e.isFile() && isTsFile(e.name));
    // ★ THE ROOT-MOST LAW (V2.2 fix, 2026-09-26): push a dir ONLY when it holds .ts and NO
    //   ANCESTOR was already pushed. The original "parent has no .ts" test pushed BOTH
    //   `graph-intelligence` AND its descendants (`graph-intelligence/shared/knowledge-graph`,
    //   `…/subagents/gi-omp-bug-hunter`) whenever an intermediate dir lacked a DIRECT .ts —
    //   overlapping roots → the same file scanned twice → DUPLICATE nodes (measured: 2720 vs
    //   the correct 2086). A pushed root covers its whole subtree recursively, so a descendant
    //   is never a second root. A CONTAINER dir (no direct .ts) is still skipped, so the
    //   `packages/foo/src` case keeps working.
    const here = hasTs && !ancestorPushed;
    if (here) out.push(realOrResolve(dir));
    if (depth >= maxDepth) return;
    const subs = entries
      .filter((e) => e.isDirectory() && !e.isSymbolicLink() && !WALK_SKIP.has(e.name))
      .map((e) => e.name)
      .sort();
    for (const s of subs) visit(path.join(dir, s), depth + 1, ancestorPushed || here);
  };
  visit(root, 0, false);
  if (out.length === 0) return null;
  return { roots: [...new Set(out)].sort(), via: `rule5:bounded-walk depth<=${maxDepth}` };
}

// ---------------------------------------------------------------------------
// The entry point
// ---------------------------------------------------------------------------

export function discoverSourceRoots(targetRoot: string): { roots: string[]; evidence: string } | { error: string } {
  const root = realOrResolve(path.resolve(targetRoot));
  try {
    if (!fs.statSync(root).isDirectory()) {
      return { error: `GI_NO_SOURCE_ROOT: no source root discovered under ${targetRoot} (not a directory)` };
    }
  } catch {
    return { error: `GI_NO_SOURCE_ROOT: no source root discovered under ${targetRoot} (the target does not exist)` };
  }
  const r1 = ruleProfileSources(root);
  if (r1) return { roots: r1.roots, evidence: r1.via };
  const r2 = ruleWorkspace(root);
  if (r2) return { roots: r2.roots, evidence: r2.via };
  const r3 = ruleTsconfig(root);
  if (r3) return { roots: r3.roots, evidence: r3.via };
  const r4 = ruleConventional(root);
  if (r4) return { roots: r4.roots, evidence: r4.via };
  const r5 = ruleWalk(root);
  if (r5) return { roots: r5.roots, evidence: r5.via };
  return { error: `GI_NO_SOURCE_ROOT: no source root discovered under ${targetRoot}` };
}
