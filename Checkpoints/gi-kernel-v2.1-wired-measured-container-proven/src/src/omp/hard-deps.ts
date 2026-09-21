// hard-deps — T-6 THE HARD-DEPENDENCY REGISTER. NO FALLBACKS, ANYWHERE.
//
// THE OPERATOR'S LAW, verbatim:
//   "NO FUCKING STUPID FALLBACKS ANYWHERE IN THIS STACK. HARD DEPENDENCIES ON
//    EVERYTHING. LOUD FAIL CRASH IF ANYTHING IS NOT WORKED W/ CLEAR ERROR CODES"
//
// Its operational form, which this module is the single source of truth for:
//   1  every component DECLARES its dependency and its own error code
//   2  no component may substitute a weaker engine (there is no code path)
//   3  an unavailable dependency is a NAMED loud failure, never a silent pass
//   4  a component whose state cannot be determined is DOWN (fail-closed)
//
// The register is DATA. Probes ask reality; `requireUp` refuses to proceed on a
// DOWN answer. Nothing here reads a fallback, because none is declared.
import * as fs from "node:fs";

export type ComponentClass = "layer" | "kernel" | "store" | "harness";

export interface ComponentDecl {
  id: string;
  cls: ComponentClass;
  /** WHAT it cannot run without. A sentence an operator can act on. */
  dependency: string;
  /** The loud code raised when the dependency is absent. */
  errorCode: string;
  probe: () => { up: boolean; evidence: string };
}

export interface RegisterEntry extends ComponentDecl {
  /** The probe's last answer. Populated by `audit()`. */
  state: "UP" | "DOWN";
  evidence: string;
}

export class HardDependencyError extends Error {
  constructor(
    readonly code: string,
    readonly component: string,
    readonly dependency: string,
    readonly evidence: string,
  ) {
    super(`${code} — component '${component}' requires ${dependency} (${evidence}); there is no fallback`);
    this.name = "HardDependencyError";
  }
}

/** A path-backed dependency: the checkout, the store, the daemon socket, the
 *  key. Absent or unreadable ⇒ DOWN, with the errno as its evidence. */
export function pathComponent(
  id: string,
  cls: ComponentClass,
  dependency: string,
  errorCode: string,
  p: string,
  opts: { mustBeFile?: boolean } = {},
): ComponentDecl {
  return {
    id, cls, dependency, errorCode,
    probe: () => {
      try {
        const st = fs.statSync(p);
        if (opts.mustBeFile === true && !st.isFile()) {
          return { up: false, evidence: `${p} (not a regular file)` };
        }
        if (st.isFile() && st.size === 0) {
          // An EMPTY file is not a warm substrate — a zero-byte graph.json
          // would otherwise read as UP and silently contribute nothing.
          return { up: false, evidence: `${p} (EMPTY — 0 bytes)` };
        }
        return { up: true, evidence: `${p} (${st.isDirectory() ? "dir" : `${st.size}B`})` };
      } catch (e) {
        return { up: false, evidence: `${p} (${(e as NodeJS.ErrnoException).code ?? "ERR"})` };
      }
    },
  };
}

/** A command-backed dependency (the TSG binary, the Abide CLI). Resolved through
 *  a caller-supplied lookup so the register never shells out itself. */
export function commandComponent(
  id: string,
  cls: ComponentClass,
  dependency: string,
  errorCode: string,
  lookUp: () => string | null,
): ComponentDecl {
  return {
    id, cls, dependency, errorCode,
    probe: () => {
      const found = lookUp();
      return found === null ? { up: false, evidence: "not found on PATH" } : { up: true, evidence: found };
    },
  };
}

/** A key-backed dependency: presence + non-emptiness only. The VALUE is never
 *  read here, never logged, never returned — labels only (the secrets law). */
export function keyComponent(
  id: string,
  cls: ComponentClass,
  dependency: string,
  errorCode: string,
  envName: string,
  env: Record<string, string | undefined> = process.env,
): ComponentDecl {
  return {
    id, cls, dependency, errorCode,
    probe: () => {
      const v = env[envName];
      return v !== undefined && v.length > 0
        ? { up: true, evidence: `${envName} present (len=${v.length})` }
        : { up: false, evidence: `${envName} ABSENT` };
    },
  };
}

export interface AuditResult {
  entries: RegisterEntry[];
  down: RegisterEntry[];
  ok: boolean;
  /** The FIRST refusal an operator would hit, in declaration order. */
  firstCode: string | null;
}

/** Ask EVERY declared component. One DOWN entry fails the whole audit — the
 *  stack has no partial mode. */
export function audit(register: readonly ComponentDecl[]): AuditResult {
  const entries: RegisterEntry[] = register.map((d) => {
    let r: { up: boolean; evidence: string };
    try {
      r = d.probe();
    } catch (e) {
      // A probe that throws is DOWN. An unanswerable dependency is not UP.
      r = { up: false, evidence: e instanceof Error ? e.message : String(e) };
    }
    return { ...d, state: r.up ? "UP" : "DOWN", evidence: r.evidence };
  });
  const down = entries.filter((e) => e.state === "DOWN");
  return { entries, down, ok: down.length === 0, firstCode: down[0]?.errorCode ?? null };
}

/** THE REFUSAL. Call before any work that depends on the component. Throws a
 *  NAMED error on absence — never returns a substitute. */
export function requireUp(decl: ComponentDecl): void {
  let r: { up: boolean; evidence: string };
  try {
    r = decl.probe();
  } catch (e) {
    r = { up: false, evidence: e instanceof Error ? e.message : String(e) };
  }
  if (!r.up) {
    throw new HardDependencyError(decl.errorCode, decl.id, decl.dependency, r.evidence);
  }
}

/** Every declared component must carry a non-empty dependency AND error code.
 *  A component with a blank dependency is an undeclared dependency — the exact
 *  thing this register exists to make impossible. */
export function assertRegisterComplete(register: readonly ComponentDecl[]): void {
  const bad: string[] = [];
  for (const d of register) {
    if (d.id.trim() === "") bad.push("<blank id>");
    if (d.dependency.trim() === "") bad.push(`${d.id}: blank dependency`);
    if (d.errorCode.trim() === "") bad.push(`${d.id}: blank errorCode`);
  }
  if (bad.length > 0) {
    throw new Error(`REGISTER_INCOMPLETE: ${bad.join("; ")}`);
  }
}

// ── THE v2.0 REGISTER ───────────────────────────────────────────────────────
// Six graph layers + the enforcement kernel + the stores. Every dependency is a
// REAL path/key on this host — none is decorative.

export interface RegisterConfig {
  scopeRoot: string;
  /** The TSG example tree (the load unit). */
  tsgRoot?: string;
  /** The Abide tree (the ALU). */
  abideRoot?: string;
  /** The RSI store dir. */
  rsiDir?: string;
  env?: Record<string, string | undefined>;
}

export function buildRegister(cfg: RegisterConfig): ComponentDecl[] {
  const env = cfg.env ?? process.env;
  const join = (...parts: string[]): string => parts.filter((p) => p.length > 0).join("/");
  return [
    // ── the six graph layers ──────────────────────────────────────────────
    pathComponent("L1_SEMANTICA", "layer", "the semantica workspace + its KG store", "GI_LAYER_SEMANTICA",
      join(cfg.scopeRoot, ".omp/graph-intelligence/layers/semantica")),
    pathComponent("L2_ARSUMBRIS", "layer", "the au daemon socket + its typed repo graph", "GI_LAYER_ARSUMBRIS",
      join(cfg.scopeRoot, ".arsumbris")),
    pathComponent("L3_UA", "layer", "the understand-anything graph (.ua/knowledge-graph.json)", "GI_LAYER_UA",
      join(cfg.scopeRoot, ".ua/knowledge-graph.json")),
    pathComponent("L4_C2KG", "layer", "the code-to-knowledge-graph LSP index", "GI_LAYER_C2KG",
      join(cfg.scopeRoot, ".c2kg/index.json")),
    pathComponent("L5_CORBELL", "layer", "the corbell parse-grade checkout (PRIMARY)", "GI_LAYER_CORBELL",
      join(cfg.scopeRoot, "corbell-out")),
    pathComponent("L6_GRAPHIFY", "layer", "the graphify graph.json leg", "GI_LAYER_GRAPHIFY",
      join(cfg.scopeRoot, "graphify-out/graph.json"), { mustBeFile: true }),

    // ── the enforcement kernel ────────────────────────────────────────────
    pathComponent("TSG", "kernel", "the tsg binary/repo — the load unit", "GI_ENFORCE_TSG",
      cfg.tsgRoot ?? join(cfg.scopeRoot, "research/graph-infra-repos/typesafe-ai/examples/tsg")),
    pathComponent("ABIDE", "kernel", "the Abide source — the ALU (repair, never block)", "GI_ENFORCE_ABIDE",
      cfg.abideRoot ?? "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/JARVIS/reports/handovers/JEV_ABIDE_CONTEXT_HANDOVER"),
    keyComponent("JEV", "kernel", "the TypeSafe API key (the only part that thinks)", "GI_JEV_DOWN",
      "TYPESAFE_AI_API_KEY", env),

    // ── the stores ────────────────────────────────────────────────────────
    pathComponent("RSI_STORE", "store", "the reflex store dir (mode 0700, out-of-tree)", "GI_ENFORCE_RSI_STORE",
      cfg.rsiDir ?? "/home/leviathan/.omp/graph-intelligence/rsi"),

    // ── the gate substrate ────────────────────────────────────────────────
    pathComponent("GI_STORE_DIR", "store", "the per-scope GI state dir", "GI_POPULATE_FAILED",
      join(cfg.scopeRoot, ".omp/graph-intelligence")),
  ];
}
