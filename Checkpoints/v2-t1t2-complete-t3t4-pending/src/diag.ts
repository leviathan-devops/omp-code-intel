import path from "node:path";
import { readFile } from "node:fs/promises";
import { LspClient } from "./lsp/client";

// src/diag.ts — diagnostics-on-write helper (V2 W1-C).
//
// Shared by omp_edit (src/edit.ts step 6) and resolve (src/ast.ts apply
// path): after a successful write, run the vendored LSP diagnostics over the
// touched file and return the card section to append. Best-effort by design:
// a good write NEVER fails on diagnostics.
//
// Returns:
//   { text: null, unavailable: false } — ext unserved: caller appends nothing,
//     sets no key.
//   { text: "<section>", unavailable: false } — diagnostics ran (problems or
//     the clean line): caller appends text.
//   { text: null, unavailable: true } — server binary missing or op timed
//     out: caller sets metadata.diag = "DIAG_UNAVAILABLE", appends nothing.

export interface DiagOutcome {
  text: string | null;
  unavailable: boolean;
}

const DIAG_TOTAL_TIMEOUT_MS = 15000;

function languageIdFor(ext: string): string {
  switch (ext) {
    case ".ts":
    case ".tsx":
      return "typescript";
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return "javascript";
    case ".py":
      return "python";
    default:
      return "plaintext";
  }
}

async function hasTsServer(worktreeRoot: string): Promise<boolean> {
  try {
    const { execFileSync } = await import("node:child_process");
    const out = execFileSync(
      "node",
      ["-e", "console.log(require.resolve('typescript', {paths:[process.argv[1]]}))", worktreeRoot],
      { encoding: "utf8", timeout: 10000 },
    );
    const resolved = out.trim().split("\n").pop() ?? "";
    const { statSync } = await import("node:fs");
    statSync(path.join(path.dirname(resolved), "tsserver.js"));
    return true;
  } catch {
    return false;
  }
}

export async function diagSection(abs: string, worktreeRoot: string, directory: string): Promise<DiagOutcome> {
  const ext = path.extname(abs).toLowerCase();
  const client = LspClient.forFile(abs);
  if (client === null) return { text: null, unavailable: false };
  // TS-generation guard: typescript-language-server needs a TypeScript ≤5
  // install on disk (lib/tsserver.js; TS 6+ removed it — "Could not find a
  // valid TypeScript installation"). Probe node resolution the way the
  // server does and skip the doomed handshake with DIAG_UNAVAILABLE when
  // the resolved typescript has no tsserver.js. Version-agnostic: it reads
  // the install the server would read, never a version string.
  if (client.spec.command === "typescript-language-server" && !(await hasTsServer(worktreeRoot))) {
    return { text: null, unavailable: true };
  }
  const rel = path.relative(directory, abs);
  const run = (async (): Promise<DiagOutcome> => {
    let text: string;
    try {
      text = await readFile(abs, "utf8");
    } catch {
      return { text: null, unavailable: true };
    }
    try {
      await client.initialize(worktreeRoot);
    } catch {
      try {
        await client.shutdown();
      } catch {
        // reaping only
      }
      return { text: null, unavailable: true };
    }
    try {
      await client.didOpen(abs, text, languageIdFor(ext));
      const rows = await client.diagnostics(abs);
      if (rows.length === 0) return { text: "Diagnostics: clean", unavailable: false };
      return {
        text: `Diagnostics: ${rows.length} problem(s)\n${rows.map((d) => `${rel}:${d.line} [${d.severity}] ${d.message}`).join("\n")}`,
        unavailable: false,
      };
    } catch {
      return { text: null, unavailable: true };
    } finally {
      try {
        await client.shutdown();
      } catch {
        // cleanup best-effort
      }
    }
  })();
  const timeout = new Promise<DiagOutcome>((resolve) => {
    setTimeout(() => resolve({ text: null, unavailable: true }), DIAG_TOTAL_TIMEOUT_MS);
  });
  return Promise.race([run, timeout]);
}
