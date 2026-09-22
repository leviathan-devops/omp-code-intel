// adapters/tsg — ★ TSG → the MEANING rung.
//
// ★ THE RUNG IS MEANING, NOT ENFORCEMENT: TSG answers what a passage MEANS; it does
// not block. The substrate is the tsg CLI (a real, runnable binary on this host).
//
// ★ NO-STUB LAW (WARHEAD 23) — REPLACED 2026-09-22: this adapter first returned
// `facts: () => []` unconditionally. The machinery EXISTS and RUNS:
//   $ tsg grep --dry-run --json 'silently discard an error' src/omp/
//   → real segmentation of src/omp/*.ts (the binary is ELF, 8.6 MB, target/release)
// The stub is replaced with the real invocation.
//
// THE CONTRACT (measured this session):
//   tsg grep --json --threshold <t> '<question>' <path>...
//   → JSONL: {"type":"start",...} · {"type":"request","request":{"state":{...}}}
//            {"type":"routing","path":"src/omp/x.ts","scores":<…>,"windows":N}
//   ★ WITHOUT TYPESAFE_API_KEY the routing rows carry `reason:"dry_run_routing_only"`
//     and NO scores — that is a MISSING-KEY state, not "zero facts". This adapter
//     THROWS GI_JEV_NO_KEY so the registry reports GI_LAYER_DOWN, exactly as the
//     register's own keyFileComponent does. The meaning judgment needs the key; the
//     segmentation does not, and the adapter never confuses the two.
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import type { ConsumerProbe, LayerFact } from "../layer-registry.ts";
import { KEY_FILE } from "../jev.ts";

export const TSG_REL = "research/graph-infra-repos/typesafe-ai/target/release/examples/tsg";
export const TSG_SRC_REL = "research/graph-infra-repos/typesafe-ai/examples/tsg";

/** Resolve the runnable binary: the built target first, then PATH. */
export function resolveTsgBinary(scopeRoot: string): string | null {
  const built = path.join(scopeRoot, TSG_REL);
  if (fs.existsSync(built)) return built;
  return null;
}

/** ★ THE KEY — read from the env first, then the register's own key file (imported so
 *  the two cannot drift).
 *
 *  ★ MEASURED 2026-09-22: the tsg CLI reads the env var `TYPESAFE_API_KEY` (NO `_AI_`),
 *  while the register's keyFileComponent and jev.ts name `TYPESAFE_AI_API_KEY` + the file
 *  `~/.config/typesafe/key`. The file EXISTS (107 B) and the CLI does NOT read it — so the
 *  adapter resolves the key from EITHER and injects it into the child as the CLI's own
 *  name. Without this the CLI exits `TYPESAFE_API_KEY must contain a nonempty UTF-8 API
 *  key` and TSG can never be consumed however healthy the substrate is.
 *
 *  ★ THE KEY IS NEVER LOGGED, NEVER ON ARGV, NEVER IN A ROW — it rides the child's env. */
export function tsgKey(env: NodeJS.ProcessEnv = process.env): string | null {
  for (const name of ["TYPESAFE_API_KEY", "TYPESAFE_AI_API_KEY"]) {
    const v = env[name];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  try {
    const v = fs.readFileSync(KEY_FILE, "utf8").trim();
    return v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** True when a usable key exists (env or the register's key file). */
export function tsgKeyPresent(env: NodeJS.ProcessEnv = process.env): boolean {
  return tsgKey(env) !== null;
}

interface TsgRow {
  type?: string;
  path?: string;
  scores?: unknown;
  windows?: number;
  reason?: string;
  request?: { state?: { byte_range?: { start?: number; end?: number }; passage?: string } };
}

export function tsgProbe(scopeRoot: string, tsgRoot?: string): ConsumerProbe {
  const srcRoot = tsgRoot ?? path.join(scopeRoot, TSG_SRC_REL);
  const bin = resolveTsgBinary(scopeRoot);
  return {
    id: "TSG",
    rung: "meaning",
    dependency: "the tsg binary/repo — the load unit",
    errorCode: "GI_ENFORCE_TSG",
    up: () => {
      if (bin === null) return { up: false, evidence: `${path.join(scopeRoot, TSG_REL)} — ENOENT (the tsg binary is not built)` };
      try {
        const st = fs.statSync(bin);
        return { up: true, evidence: `${bin} (${st.size}B, ELF CLI)` };
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code ?? "UNKNOWN";
        return { up: false, evidence: `${bin} — ${code}` };
      }
    },
    facts: (subject: string): LayerFact[] => {
      if (bin === null) throw new Error(`GI_ENFORCE_TSG: no tsg binary at ${path.join(scopeRoot, TSG_REL)}`);
      // ★ THE KEY GATE: the meaning judgment needs the key. Its absence is a NAMED
      //   state, never an empty fact set.
      const key = tsgKey();
      if (key === null) {
        throw new Error(`GI_JEV_NO_KEY: the tsg meaning judgment needs TYPESAFE_API_KEY (env) or ${KEY_FILE}; the CLI segments without it but cannot judge`);
      }
      let out: string;
      try {
        out = execFileSync(bin, ["grep", "--json", "--threshold", "0.5", subject, srcRoot], {
          encoding: "utf8",
          timeout: 180_000,
          maxBuffer: 32 * 1024 * 1024,
          // ★ the CLI's OWN env-var name; the key never appears on argv or in a log.
          env: { ...process.env, TYPESAFE_API_KEY: key },
        });
      } catch (e) {
        // ★ THE ERROR CARRIES THE CLI'S OWN OUTPUT. A bare "Command failed" hid the REASON
        //   (measured: the TypeSafe API answered HTTP 402 Payment Required and the CLI
        //   wrote it to STDOUT, which execFileSync's message does not include). A named
        //   failure must be DIAGNOSABLE, so the tail of stdout/stderr rides the error.
        const err = e as { message?: string; stdout?: unknown; stderr?: unknown };
        const out = String(err.stdout ?? "").slice(-400);
        const errOut = String(err.stderr ?? "").slice(-200);
        const detail = [out, errOut].filter((x) => x.length > 0).join(" | ");
        const msg = `${(err.message ?? String(e)).slice(0, 160)}${detail.length > 0 ? ` — CLI output: ${detail}` : ""}`;
        throw new Error(`GI_ENFORCE_TSG: the tsg CLI failed — ${msg}`);
      }
      const rows: TsgRow[] = [];
      for (const l of out.split("\n")) {
        if (l.trim().length === 0) continue;
        try { rows.push(JSON.parse(l) as TsgRow); } catch { /* a non-JSON line is skipped */ }
      }
      const scored = rows.filter((r) => r.type === "routing" && r.path !== undefined && r.scores !== null && r.scores !== undefined);
      if (scored.length === 0 && rows.some((r) => r.reason === "dry_run_routing_only")) {
        throw new Error(`GI_JEV_NO_KEY: the tsg run was a DRY RUN (no scores) — the key is absent or rejected`);
      }
      return scored.map((r) => ({
        consumer: "TSG" as const,
        rung: "meaning" as const,
        subject,
        value: { path: r.path, scores: r.scores, windows: r.windows },
        source: `${r.path}#tsg(threshold 0.7 · ${JSON.stringify(r.scores).slice(0, 80)})`,
      }));
    },
  };
}
