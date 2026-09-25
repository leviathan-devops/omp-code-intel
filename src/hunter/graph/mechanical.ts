// PORTED FROM fork-v143 live-tree/graph-intelligence/ (extraction chain / query-engine) — verbatim; SEAM: import path rewrites to ported siblings.
import * as tsImport from 'typescript';
const ts: typeof tsImport = (tsImport as unknown as { default?: typeof tsImport }).default ?? tsImport;
import path from 'node:path';
import { PREDICATE_SET, isPredicate, type Predicate } from '../shared/ontology.ts';

export interface TypedTriple {
  subject: string;
  predicate: Predicate;
  object: string;
  evidence: string;
  confidence: number;
  file: string;
  line: number;
  subjectKind?: string;
  objectKind?: string;
}

export class MechanicalExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MECHANICAL_EXTRACTION_FAILED';
  }
}

function lineOf(sf: tsImport.SourceFile, node: tsImport.Node): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

// ★ F-700 FIX (2026-09-24): cache the split lines per SourceFile — the old form
//   re-split the FULL file text on EVERY node (O(fileSize × numNodes) per file).
//   WeakMap keyed on the SourceFile object: no lifetime leak, same-file calls share.
const evidenceLineCache = new WeakMap<tsImport.SourceFile, string[]>();
function evidenceQuoteForNode(sf: tsImport.SourceFile, node: tsImport.Node): string {
  const line = lineOf(sf, node);
  try {
    let lines = evidenceLineCache.get(sf);
    if (!lines) {
      lines = sf.getFullText().split('\n');
      evidenceLineCache.set(sf, lines);
    }
    const raw = lines[line - 1] ?? node.getText(sf);
    const trimmed = raw.trim();
    if (trimmed.length > 0) return trimmed.slice(0, 500);
    return node.getText(sf).trim().slice(0, 500) || `${sf.fileName}:${line}`;
  } catch (e: unknown) {
    throw new MechanicalExtractionError(`evidence extraction failed at ${sf.fileName}:${line} — ${e instanceof Error ? e.message : String(e)}`);
  }
}

function isExcluded(abs: string, root: string, excludes: string[]): boolean {
  for (const ex of excludes) {
    const exAbs = path.isAbsolute(ex) ? path.resolve(ex) : path.resolve(root, ex);
    if (abs === exAbs || abs.startsWith(exAbs + path.sep)) return true;
  }
  return false;
}

function toCanonicalFile(rel: string): string {
  return `file:${rel}`;
}

function toClassCanonical(name: string): string { return `class:${name}`; }
function toFnCanonical(name: string): string { return `fn:${name}`; }
function toMethodCanonical(cls: string, method: string): string { return `method:${cls}.${method}`; }
function toInterfaceCanonical(name: string): string { return `interface:${name}`; }
function toModuleCanonical(rel: string): string { return `module:${rel}`; }

export interface ExtractMechanicalOptions {
  root?: string;
  excludes?: string[];
  createdRun?: string;
}

export function extractMechanical(program: tsImport.Program, opts: ExtractMechanicalOptions = {}): TypedTriple[] {
  if (!program || typeof program.getSourceFiles !== 'function') {
    throw new MechanicalExtractionError('MECHANICAL_EXTRACTION_FAILED: program is null/undefined or missing getSourceFiles');
  }
  // ★ F-137 FIX (2026-09-24): dead type-checker instantiation removed — the checker was voided unused, and getTypeChecker() is expensive on large programs; the extraction is purely syntactic.

  const sourceFiles = program.getSourceFiles();
  if (!Array.isArray(sourceFiles)) {
    throw new MechanicalExtractionError('MECHANICAL_EXTRACTION_FAILED: program.getSourceFiles returned non-array');
  }

  let root = opts.root ? path.resolve(opts.root) : '';
  if (!root) {
    try {
      const first = sourceFiles.find((sf) => !sf.isDeclarationFile && !sf.fileName.includes('node_modules'));
      if (first) root = path.dirname(path.resolve(first.fileName));
    } catch (e: unknown) {
      throw new MechanicalExtractionError(`MECHANICAL_EXTRACTION_FAILED: cannot resolve root — ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!root) root = process.cwd();
  }

  const excludes = opts.excludes ?? [];
  const triples: TypedTriple[] = [];

  const pushTriple = (subject: string, predicate: Predicate, object: string, evidence: string, file: string, line: number): void => {
    if (!isPredicate(predicate)) {
      throw new MechanicalExtractionError(`MECHANICAL_EXTRACTION_FAILED: predicate ${String(predicate)} not in closed ontology vocabulary`);
    }
    if (!evidence || evidence.trim().length === 0) {
      throw new MechanicalExtractionError(`MECHANICAL_EXTRACTION_FAILED: evidence_quote is mandatory — empty evidence for ${subject} -[${predicate}]-> ${object} at ${file}:${line} (MC-B-02)`);
    }
    triples.push({ subject, predicate, object, evidence: evidence.trim().slice(0, 500), confidence: 1.0, file, line });
  };

  for (const sf of sourceFiles) {
    const abs = path.resolve(sf.fileName);
    if (sf.isDeclarationFile) continue;
    if (abs.includes(`${path.sep}node_modules${path.sep}`)) continue;
    if (abs.includes(`${path.sep}.trident${path.sep}`)) continue;
    if (abs.includes(`${path.sep}dist${path.sep}`)) continue;
    if (isExcluded(abs, root, excludes)) continue;
    // ★ F-4 FIX (2026-09-24): any file outside root is skipped, regardless of how root was derived (old inner guard let non-root files through when root === cwd).
    if (!abs.startsWith(root + path.sep) && abs !== path.join(root, path.basename(abs))) continue;

    const rel = path.relative(root, abs) || path.basename(abs);
    const relPosix = rel.split(path.sep).join(path.posix.sep);
    const fileCanon = toCanonicalFile(relPosix);
    const moduleCanon = toModuleCanonical(relPosix);

    for (const stmt of sf.statements) {
      if (ts.isClassDeclaration(stmt) && stmt.name) {
        const clsName = stmt.name.text;
        const clsLine = lineOf(sf, stmt);
        const clsEvidence = evidenceQuoteForNode(sf, stmt);
        pushTriple(fileCanon, 'declares', toClassCanonical(clsName), clsEvidence, relPosix, clsLine);
        for (const member of stmt.members) {
          // ★ F-820 FIX (2026-09-24): getters/setters are class members — the old
          //   method|property|constructor check silently dropped accessors, so class
          //   topology missed method:Foo.bar triples for `get bar`/`set bar`.
          if ((ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member) || ts.isConstructorDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) && member.name && ts.isIdentifier(member.name)) {
            const mName = member.name.text;
            const mLine = lineOf(sf, member);
            const mEvidence = evidenceQuoteForNode(sf, member);
            const methodCanon = toMethodCanonical(clsName, mName);
            pushTriple(toClassCanonical(clsName), 'declares', methodCanon, mEvidence, relPosix, mLine);
          }
        }
      }
      if (ts.isInterfaceDeclaration(stmt) && stmt.name) {
        const ifaceName = stmt.name.text;
        const ifaceLine = lineOf(sf, stmt);
        const ifaceEvidence = evidenceQuoteForNode(sf, stmt);
        pushTriple(fileCanon, 'declares', toInterfaceCanonical(ifaceName), ifaceEvidence, relPosix, ifaceLine);
      }
      if (ts.isFunctionDeclaration(stmt) && stmt.name) {
        const fnName = stmt.name.text;
        const fnLine = lineOf(sf, stmt);
        const fnEvidence = evidenceQuoteForNode(sf, stmt);
        pushTriple(fileCanon, 'declares', toFnCanonical(fnName), fnEvidence, relPosix, fnLine);
      }
      if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
            const fnName = decl.name.text;
            const fnLine = lineOf(sf, decl);
            const fnEvidence = evidenceQuoteForNode(sf, stmt);
            pushTriple(fileCanon, 'declares', toFnCanonical(fnName), fnEvidence, relPosix, fnLine);
          }
        }
      }
      if (ts.isModuleDeclaration(stmt) && stmt.name && ts.isIdentifier(stmt.name)) {
        const modName = stmt.name.text;
        const modLine = lineOf(sf, stmt);
        const modEvidence = evidenceQuoteForNode(sf, stmt);
        pushTriple(fileCanon, 'declares', toModuleCanonical(modName), modEvidence, relPosix, modLine);
      }
      // ★ F-821b FIX (2026-09-24): inline exports (`export class/function/const`)
      //   produce triples for the declaration but no `exports` triple linking the
      //   symbol back to the file.  Detect the export modifier and emit it.
      if (ts.canHaveModifiers(stmt) && ts.getModifiers(stmt)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) && !ts.isExportDeclaration(stmt) && !ts.isExportAssignment(stmt)) {
        const expLine = lineOf(sf, stmt);
        const expEvidence = evidenceQuoteForNode(sf, stmt);
        if (ts.isClassDeclaration(stmt) && stmt.name) {
          pushTriple(fileCanon, 'exports', toClassCanonical(stmt.name.text), expEvidence, relPosix, expLine);
        } else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
          pushTriple(fileCanon, 'exports', toFnCanonical(stmt.name.text), expEvidence, relPosix, expLine);
        } else if (ts.isVariableStatement(stmt)) {
          for (const decl of stmt.declarationList.declarations) {
            if (!ts.isIdentifier(decl.name)) continue;
            // ★ R15H5 FIX (2026-09-25): the old form emitted `exports fn:<name>` for
            //   EVERY inline-exported variable (`export const x = 5` → `fn:x`), while
            //   `declares` only emits `fn:` for arrow/function initializers — the
            //   `fn:` namespace was polluted and declares↔exports joins broke. Gate
            //   on the function-like initializer like the declares branch above; a
            //   non-function export has no declares triple to join to, so it emits
            //   nothing instead of a dangling `fn:` edge.
            const isFn = decl.initializer !== undefined && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));
            if (!isFn) continue;
            pushTriple(fileCanon, 'exports', `fn:${decl.name.text}`, expEvidence, relPosix, expLine);
          }
        }
      }
      if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
        const target = stmt.moduleSpecifier.text;
        let targetRel = target;
        if (target.startsWith('.')) {
          targetRel = path.posix.normalize(path.posix.join(path.posix.dirname(relPosix), target));
          // ★ F-400 FIX (2026-09-24): .mjs/.cjs are known extensions — only bare
          //   imports get the .ts default, else foo.mjs resolved as foo.mjs.ts.
          const knownExts = ['.ts', '.tsx', '.js', '.mjs', '.cjs'];
          if (!knownExts.some((ext) => targetRel.endsWith(ext))) {
            targetRel = `${targetRel}.ts`;
          }
        }
        const targetCanon = `file:${targetRel}`;
        const impLine = lineOf(sf, stmt);
        const impEvidence = evidenceQuoteForNode(sf, stmt);
        pushTriple(fileCanon, 'imports', targetCanon, impEvidence, relPosix, impLine);
      }
      // ★ F-821 FIX (2026-09-24): handle ExportAssignment (`export default expr`).
      // ★ R19-HIGH FIX (2026-09-25): `isExportAssignment` is `export default <EXPR>` ONLY.
      //   `export default class Foo {}` and `export default function bar() {}` are DECLARATIONS
      //   carrying the `default` modifier — they never reach this branch, so a module whose
      //   DEFAULT export is a class/function produced no `exports default:<module>` edge at all.
      //   The named-export edge and the default-export edge are now both emitted for them.
      if (ts.isExportAssignment(stmt) || (ts.canHaveModifiers(stmt) && (ts.getModifiers(stmt) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword))) {
        const expLine = lineOf(sf, stmt);
        const expEvidence = evidenceQuoteForNode(sf, stmt);
        pushTriple(fileCanon, 'exports', `default:${moduleCanon}`, expEvidence, relPosix, expLine);
      }
      // ★ F-821b FIX (2026-09-24): the F-821 edit widened this branch to include
      //   ExportAssignment, which has NO `moduleSpecifier` — TS2339 on every read. The
      //   re-export branch is ExportDeclaration ONLY (its `export default` sibling is already
      //   handled above with `default:${moduleCanon}`).
      if (ts.isExportDeclaration(stmt)) {
        const expLine = lineOf(sf, stmt);
        const expEvidence = evidenceQuoteForNode(sf, stmt);
        if (stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)) {
          const target = stmt.moduleSpecifier.text;
          let targetRel = target;
          if (target.startsWith('.')) {
            targetRel = path.posix.normalize(path.posix.join(path.posix.dirname(relPosix), target));
            // ★ F-500 FIX (2026-09-24): mirror the import branch's known-ext resolution —
            //   a bare re-export './bar' must canon to file:./bar.ts like imports do,
            //   else import/export triples for the same module never join.
            const knownExts = ['.ts', '.tsx', '.js', '.mjs', '.cjs'];
            if (!knownExts.some((ext) => targetRel.endsWith(ext))) {
              targetRel = `${targetRel}.ts`;
            }
          }
          pushTriple(fileCanon, 'exports', `file:${targetRel}`, expEvidence, relPosix, expLine);
        } else {
          pushTriple(fileCanon, 'exports', moduleCanon, expEvidence, relPosix, expLine);
        }
      }
    }

    let currentClass: string | null = null;
    let currentFnId: string | null = null;
    // ★ F-911 FIX (2026-09-24): UNBOUNDED recursion — visit() recursed via ts.forEachChild with no depth ceiling, so a pathological AST (deep binary chains / nested callbacks) blew the call stack. Depth-threaded with a throwing ceiling; the deep-AST path now takes the new branch.
    const MAX_DEPTH = 1000;
    const visit = (node: tsImport.Node, parent: tsImport.Node | undefined, depth = 0): void => {
      if (depth > MAX_DEPTH) {
        throw new MechanicalExtractionError(`AST depth exceeds ${MAX_DEPTH} at ${relPosix}:${lineOf(sf, node)} — possible pathological input`);
      }
      const prevClass = currentClass;
      const prevFn = currentFnId;
      try {
        if (ts.isClassDeclaration(node) && node.name) currentClass = node.name.text;
        if (ts.isFunctionDeclaration(node) && node.name) currentFnId = `fn:${node.name.text}`;
        // ★ F-820b FIX (2026-09-24): mirror member iteration — getters/setters track as method: too.
        if ((ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node) || ts.isConstructorDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) && node.name && ts.isIdentifier(node.name)) {
          currentFnId = currentClass ? `method:${currentClass}.${node.name.text}` : `fn:${node.name.text}`;
        }
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
          currentFnId = `fn:${node.name.text}`;
        }
        // THE INSTANTIATION EDGE (the whoCalls new-blindness fix, 2026-09-12 —
        // the self-hunt's own 384/393 false positives): `new X()` is an inbound
        // call edge for X exactly like `X()` — the same fn: target keeps the
        // name join (engine whoCalls resolves fn:symbol) intact.
        // ★ R19-HIGH FIX (2026-09-25): only a BARE identifier produced a call edge, so every
        //   member/qualified invocation — `A.B()`, `obj.method()`, `this.helper()`, `ns.fn()` —
        //   was SILENTLY DROPPED. On a codebase that calls through namespaces/objects (this one
        //   does), whoCalls under-reports systematically, and an under-reported fan-in is the
        //   failure that makes a "safe to change" verdict wrong. The triple's target is
        //   `fn:<symbol>` (the name join the engine resolves), so the PROPERTY name is the right
        //   callee for a member call — `A.B()` names B, resolved by name like a bare `B()`.
        if (
          (ts.isCallExpression(node) || ts.isNewExpression(node)) &&
          (ts.isIdentifier(node.expression) || ts.isPropertyAccessExpression(node.expression))
        ) {
          const callee = ts.isIdentifier(node.expression) ? node.expression.text : node.expression.name.text;
          const inAwait = parent !== undefined && ts.isAwaitExpression(parent);
          const callerId = currentFnId ?? fileCanon;
          const pred: Predicate = inAwait ? 'awaits' : 'calls';
          const callLine = lineOf(sf, node);
          const callEvidence = evidenceQuoteForNode(sf, node);
          pushTriple(callerId, pred, `fn:${callee}`, callEvidence, relPosix, callLine);
        }
      } catch (e: unknown) {
        if (e instanceof MechanicalExtractionError) throw e;
        throw new MechanicalExtractionError(`walk failed at ${relPosix}:${lineOf(sf, node)} — ${e instanceof Error ? e.message : String(e)}`);
      }
      ts.forEachChild(node, (child) => visit(child, node, depth + 1));
      currentClass = prevClass;
      currentFnId = prevFn;
    };
    try {
      visit(sf, undefined);
    } catch (e: unknown) {
      if (e instanceof MechanicalExtractionError) throw e;
      throw new MechanicalExtractionError(`mechanical walk failed for ${relPosix} — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ★ F-138 FIX (2026-09-24): dead `void fs` block removed — the empty-triples case returns [] honestly; the no-op kept a now-removed import alive.

  return triples;
}

export function extractMechanicalFromProgram(program: tsImport.Program, opts?: ExtractMechanicalOptions): TypedTriple[] {
  return extractMechanical(program, opts);
}
