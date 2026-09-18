// PORTED FROM v443-en38-graphify-oom-fixed/graph-intelligence/hydra/aether-auditor.ts:86-226 (runLayerHunter: template/ledger/graph/schema validation, ledger ensure, brief write, report stale/empty checks, HunterSettlement fulfilled/rejected shape) + hydra/aether-tools.ts:51-146 (capped read/grep) + :148-198 (force-bound write_findings) + :237-305 (graph_tag + buildAuditorTools) + hydra/aether-report-reader.ts:3-17,77-182 (MD grammar constants + canonical ## FINDING: parser) + hydra/aether-templates/types.ts (AuditorTemplate/outputSchema consumed, not redefined)
// OMP SEAM ADAPTATION (D2 bind-only law, GI_OMP_FULL_PORT_DPL1_SPEC §B.1/§9-D2): the AetherAgent LLM
// loop (aether-backend/agent.js, maxRounds:3, __aetherScriptedRun seam) is NOT ported — no LLM transport
// exists in OMP. The bound run path is a DETERMINISTIC sweep over the loaded GraphifyGraph + capped
// file reads: graph-structure families (god-node/cycle/dead-code/blast-radius) measure the graph
// directly; contract/oracle/stage/provenance families measure via graph + mission-grep (two-leg).
// Genuinely-empty results emit ONE confirmed-empty FINDING block (the fork sro-dead-code.ts:72 law —
// empty without a block is REJECTED), so every settled run yields a grammar-valid report.
// DIVERGENCE (named, cf. fork __divergences): graph_tag predicate = first template.filterTags entry
// passing the in-tree ontology isPredicate, else 'flagged_by' — the fork hunters pass ontology
// predicates at the call site; our sweep emits MEASURED predicates (graph-structure.god-node,
// cycles.import, dead-code.module) which the tool maps to the ontology via the caller-supplied
// defaultPredicate (belt construction), never via per-call override.
// LAW: stub-shaped errors legal ONLY after a real attempt — every rejection names the failed step.

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isPredicate, isNodeType } from "../hunter/shared/ontology.ts";
import { kindForLayer } from "../hunter/shared/kind-for-layer.ts";
import type { AuditorTemplate } from "./templates/types.ts";
import { GraphifyMapReader, readGraphJson, type GraphifyGraph } from "./map-reader.ts";
import type { GraphifyClientReader } from "./client-reader.ts";

const execFileAsync = promisify(execFile);

// ── Mission-tool caps + tokens (fork aether-tools.ts:10-17) ──
export const READ_CAP = 320;
export const GREP_CAP = 120;
export const GRAPH_TOOL_VIOLATION = "GRAPH_TOOL_VIOLATION";
export const WRITE_SCOPE_VIOLATION = "WRITE_SCOPE_VIOLATION";
export const GRAPH_TAG_INVALID_PREDICATE = "GRAPH_TAG_INVALID_PREDICATE";
export const GRAPH_TAG_INVALID_KIND = "GRAPH_TAG_INVALID_KIND";
export const READ_SCOPE_VIOLATION = "READ_SCOPE_VIOLATION";

// ── Report grammar (fork aether-report-reader.ts:3-17) ──
export const MD_FINDING_HEADER = "## FINDING:";
export const MD_SUMMARY_HEADER = "## SUMMARY";
export const MD_REQUIRED_FIELDS = ["predicate", "file", "evidence", "spec"] as const;

// ── Settlement (fork aether-auditor.ts:18-38) ──
export interface HunterTelemetry {
  roundsUsed: number;
  toolCallsMade: number;
  toolCallNames: string[];
  errors: string[];
  text?: string;
}

export interface HunterSettlementFulfilled {
  layerId: string;
  status: "fulfilled";
  findings: unknown;
  fileBytes: number;
  fileMtime: number;
  raw: string;
  telemetry: HunterTelemetry;
  ledgerDir: string;
  durationMs: number;
}

export interface HunterSettlementRejected {
  layerId: string;
  status: "rejected";
  error: string;
  ledgerDir: string;
  durationMs: number;
}

export type HunterSettlement = HunterSettlementFulfilled | HunterSettlementRejected;

// ── Mission tools (fork buildAuditorTools :292-305, AgentTool wrapper REMOVED — OMP has no
// pi-agent-core; the sweep invokes these directly and counts the calls in telemetry) ──
export interface MissionTool {
  name: string;
  description: string;
  invoke(params: Record<string, unknown>): Promise<string>;
}

function realResolve(p: string): string {
  const resolved = path.resolve(p);
  try {
    return fs.realpathSync(resolved);
  } catch {
    try {
      return path.join(fs.realpathSync(path.dirname(resolved)), path.basename(resolved));
    } catch {
      return resolved;
    }
  }
}

function isWithinRoot(realPath: string, realRoot: string): boolean {
  return realPath === realRoot || realPath.startsWith(realRoot + path.sep);
}

function makeCappedReadTool(targetRoot: string): MissionTool {
  return {
    name: "read",
    description: `Read file window capped at ${READ_CAP} lines, scoped to targetRoot`,
    invoke: async (params) => {
      const filePath = String(params.path ?? "");
      const offset = typeof params.offset === "number" ? params.offset : 0;
      const limit = typeof params.limit === "number" ? params.limit : READ_CAP;
      if (!Number.isInteger(limit) || limit <= 0) return `READ_INVALID: limit must be a positive integer (got ${String(params.limit)})`;
      if (limit > READ_CAP) return `READ_CAP_EXCEEDED: ${limit} > ${READ_CAP}`;
      if (!filePath) return "READ_INVALID: path required";
      const rootReal = realResolve(path.resolve(targetRoot));
      const resolved = path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(targetRoot, filePath);
      const realFile = realResolve(resolved);
      if (!isWithinRoot(realFile, rootReal) && realFile !== rootReal) {
        return `${READ_SCOPE_VIOLATION}: read outside targetRoot ${filePath}`;
      }
      try {
        // W11 (frozen-scan TOCTOU HIGH): open ONCE post-containment — fstat +
        // read ride the pinned fd, so a symlink swap after the check reads the
        // checked inode, not the redirect target.
        // W16: O_NOFOLLOW — a swap to a symlink between containment and open
        // refuses (ELOOP) instead of pinning the redirected inode.
        const fd = fs.openSync(realFile, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
        try {
        const size = fs.fstatSync(fd).size;
        if (size > 8 * 1024 * 1024) return `READ_TOO_LARGE: ${size} bytes > 8MiB window cap (narrow offset/limit)`;
        const buf = Buffer.alloc(size);
        let total = 0;
        while (total < size) {
          const n = fs.readSync(fd, buf, total, size - total, total);
          if (n <= 0) break;
          total += n;
        }
        const lines = buf.subarray(0, total).toString("utf-8").split("\n");
        const start = Math.max(0, offset);
        const slice = lines.slice(start, Math.min(lines.length, start + limit));
        const truncated = start + limit < lines.length;
        const out = slice.join("\n") + (truncated ? "\n[TRUNCATED]" : "");
        return out;
        } finally {
          fs.closeSync(fd);
        }
      } catch (e) {
        return `READ_FAILED: ${String((e as Error).message).slice(0, 300)}`;
      }
    },
  };
}

function makeCappedGrepTool(targetRoot: string): MissionTool {
  return {
    name: "grep",
    description: `Grep capped at ${GREP_CAP} results, scoped to targetRoot`,
    invoke: async (params) => {
      const pattern = String(params.pattern ?? "");
      if (pattern.trim() === "") return "GREP_INVALID: empty pattern";
      // W24 (frozen-scan HIGH): clamp to a positive integer — negative/float/
      // NaN/Infinity turned a normal probe into SEARCH_FAILED (loud infra lie).
      const rawMax = typeof params.maxResults === "number" && Number.isFinite(params.maxResults) ? Math.floor(params.maxResults) : GREP_CAP;
      const maxResults = Math.min(Math.max(1, rawMax), GREP_CAP);
      const run = (cmd: string, args: string[]): Promise<string> =>
        new Promise((resolve) => {
          execFile(cmd, args, { timeout: 10_000, maxBuffer: 2_000_000 }, (err, stdout) => {
            if (err) {
              const code = (err as { code?: number }).code;
              const msg = String((err as Error).message);
              // V21 W8: rg/grep exit 1 with empty stdout = NO MATCHES (a normal
              // answer), never a tool failure. Real failures keep the loud token.
              if (code === 1 && !stdout) return resolve("(no matches)");
              return resolve(`SEARCH_FAILED: ${msg.slice(0, 160)}${stdout ? " | partial: " + String(stdout).slice(0, 400) : ""}`);
            }
            resolve(String(stdout));
          });
        });
      // V21 W6: `--` terminates flag parsing — a leading-dash pattern can no
      // longer inject rg/grep flags.
      let out = await run("rg", ["-n", "--max-count", String(maxResults), "--", pattern, targetRoot]);
      if (out.startsWith("SEARCH_FAILED") || out.length === 0) {
        out = await run("grep", ["-rn", "-E", "-m", String(maxResults), "--", pattern, targetRoot]);
      }
      if (out.startsWith("SEARCH_FAILED")) return out;
      if (out.trim().length === 0) return "(no matches)";
      return out.split("\n").filter(Boolean).slice(0, maxResults).join("\n").slice(0, 8000);
    },
  };
}

function makeForceBoundWriteTool(pinnedPath: string, ledgerDir: string): MissionTool {
  return {
    name: "write_findings",
    description: `Force-bound write to ${pinnedPath} (ONLY this path is writable)`,
    invoke: async (params) => {
      const attempted = String(params.path ?? "").trim();
      const pinnedReal = realResolve(path.resolve(pinnedPath));
      if (attempted !== "") {
        const attemptedReal = realResolve(path.resolve(attempted));
        if (attemptedReal !== pinnedReal) {
          return JSON.stringify({ error: GRAPH_TOOL_VIOLATION, detail: `path ${attemptedReal} != pinned ${pinnedReal}`, recorded: true });
        }
      }
      const ledgerReal = realResolve(path.resolve(ledgerDir));
      if (!isWithinRoot(pinnedReal, ledgerReal) && pinnedReal !== ledgerReal) {
        return JSON.stringify({ error: WRITE_SCOPE_VIOLATION, detail: "pinned target outside ledger", recorded: true });
      }
      try {
        fs.mkdirSync(path.dirname(pinnedReal), { recursive: true });
        const content = String(params.content ?? "");
        // W21 (frozen-scan HIGH): fd-pinned write — O_NOFOLLOW|O_TRUNC so a
        // symlink swap between containment and write cannot redirect the bytes.
        const wfd = fs.openSync(pinnedReal, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW, 0o644);
        try {
          fs.writeFileSync(wfd, content, "utf-8");
        } finally {
          fs.closeSync(wfd);
        }
        return JSON.stringify({ path: pinnedReal, bytes: Buffer.byteLength(content, "utf-8") });
      } catch (e) {
        return `WRITE_FAILED: ${String((e as Error).message).slice(0, 300)}`;
      }
    },
  };
}

export interface TypedEdgeRow {
  canonical_id: string;
  codeNodeId: string;
  kind: string;
  label: string;
  file: string;
  line: number;
  predicate: string;
  evidence_quote: string;
  created_run: string;
  confidence: number;
}

function makeGraphTagTool(ledgerDir: string, layerId: string, defaultPredicate: string): MissionTool {
  return {
    name: "graph_tag",
    description: "Tag a finding into the shared graph via ontology predicates (splice: appends a typed edge row)",
    invoke: async (params) => {
      const predicate = String(params.predicate ?? defaultPredicate).trim();
      if (!isPredicate(predicate)) {
        throw new Error(`${GRAPH_TAG_INVALID_PREDICATE}: ${predicate} not in ontology`);
      }
      const kind = kindForLayer(layerId);
      if (!isNodeType(kind)) {
        throw new Error(`${GRAPH_TAG_INVALID_KIND}: ${kind}`);
      }
      const file = String(params.findingFile ?? "unknown");
      const line = typeof params.findingLine === "number" ? params.findingLine : 0;
      const subject = String(params.findingSubject ?? "finding");
      const evidence = String(params.evidence ?? "");
      if (evidence.trim().length === 0) throw new Error("GRAPH_TAG_EVIDENCE_EMPTY: evidence required (no silent no-evidence tags)");
      // Evidence-quote CHECK (fork corbell-bridge DDL law): non-empty, explicit:/[INFERRED] prefix.
      const evidence_quote = evidence.startsWith("[INFERRED]") ? evidence : `explicit: ${evidence}`;
      const codeNodeId = `${file}:${line}:code`;
      const canonical_id = `${layerId}:${file}:${line}`;
      const row: TypedEdgeRow = {
        canonical_id, codeNodeId, kind, label: subject, file, line,
        predicate, evidence_quote, created_run: layerId, confidence: 1.0,
      };
      const splicePath = path.join(path.resolve(ledgerDir), "evidence", "typed-edges.jsonl");
      fs.mkdirSync(path.dirname(splicePath), { recursive: true });
      fs.appendFileSync(splicePath, JSON.stringify(row) + "\n", "utf-8");
      return JSON.stringify({ tagged: true, canonical_id, predicate, kind });
    },
  };
}

export interface AuditorToolbelt {
  tools: MissionTool[];
  read: MissionTool;
  grep: MissionTool;
  writeFindings: MissionTool;
  graphTag: MissionTool;
}

/** Mission-tool factory (fork buildAuditorTools :292-305 minus createGraphifyTools/AgentTool). */
export function buildAuditorTools(ledgerDir: string, targetRoot: string, layerId: string, defaultPredicate: string): AuditorToolbelt {
  if (!ledgerDir || typeof ledgerDir !== "string" || ledgerDir.trim() === "") {
    throw new Error("AUDITOR_TOOLS_INVALID: ledgerDir required");
  }
  if (!targetRoot || typeof targetRoot !== "string" || targetRoot.trim() === "") {
    throw new Error("AUDITOR_TOOLS_INVALID: targetRoot required");
  }
  // W13 note: the per-layer ledgerDir ALREADY isolates concurrent layers —
  // layering the filename too double-scoped the path and broke the pinned
  // write_findings contract (hunter may only write the pinned findings path).
  const reportPath = path.join(path.resolve(ledgerDir), "findings", "report.md");
  const read = makeCappedReadTool(targetRoot);
  const grep = makeCappedGrepTool(targetRoot);
  const writeFindings = makeForceBoundWriteTool(reportPath, ledgerDir);
  const graphTag = makeGraphTagTool(ledgerDir, layerId, defaultPredicate);
  return { tools: [read, grep, writeFindings, graphTag], read, grep, writeFindings, graphTag };
}

// ── Canonical report parser (fork aether-report-reader.ts:60-182, legacy-R23 + JSON fallbacks
// REMOVED — this writer only emits canonical blocks, so the reader only accepts them) ──
function stripOuterQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

export function parseFindingsMarkdown(raw: string): { candidates: Record<string, unknown>[]; summary: string } {
  const headerRe = /^##\s+FINDING:\s*(.+)$/gm;
  const headers: { subject: string; index: number }[] = [];
  let hm: RegExpExecArray | null;
  while ((hm = headerRe.exec(raw)) !== null) headers.push({ subject: hm[1]!.trim(), index: hm.index });
  if (headers.length === 0) {
    throw new Error(`GRAMMAR_VIOLATION: no '${MD_FINDING_HEADER}' block found — findings must use the markdown finding grammar (${MD_FINDING_HEADER} <subject> + - predicate, - file (path:line), - evidence, - spec)`);
  }
  const candidates: Record<string, unknown>[] = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]!;
    const blockBody = raw.slice(h.index, i + 1 < headers.length ? headers[i + 1]!.index : raw.length);
    const fields = new Map<string, string>();
    const lineRe = /^\s*-\s*(\w+):\s*(.+)\s*$/gm;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(blockBody)) !== null) fields.set(m[1]!.toLowerCase(), m[2]!.trim());
    for (const req of MD_REQUIRED_FIELDS) {
      if (!fields.get(req)?.trim()) {
        throw new Error(`GRAMMAR_VIOLATION: block "${h.subject}" missing required field '${req}' — each ${MD_FINDING_HEADER} block must carry - predicate, - file (path:line), - evidence, - spec`);
      }
    }
    const fileField = stripOuterQuotes(fields.get("file")!);
    const drive = /^[A-Za-z]:[\\/]/.test(fileField) ? fileField.slice(0, 2) : "";
    const rest = drive !== "" ? fileField.slice(2) : fileField;
    const mLine = /^(.*):(\d+)\s*$/.exec(rest);
    if (!mLine) {
      throw new Error(`GRAMMAR_VIOLATION: block "${h.subject}" malformed field 'file' — expected "<path>:<line>" got "${fileField}"`);
    }
    const line = Number.parseInt(mLine[2]!, 10);
    if (!Number.isFinite(line) || line <= 0 || !Number.isInteger(line)) {
      throw new Error(`GRAMMAR_VIOLATION: block "${h.subject}" malformed field 'file' line part — expected positive integer`);
    }
    const evidence = stripOuterQuotes(fields.get("evidence")!);
    if (evidence.length === 0) {
      throw new Error(`GRAMMAR_VIOLATION: block "${h.subject}" malformed field 'evidence' — empty after stripping quotes`);
    }
    const candidate: Record<string, unknown> = {
      subject: h.subject,
      predicate: stripOuterQuotes(fields.get("predicate")!),
      file: (drive + mLine[1]!).trim(),
      line,
      evidence,
      implicatedSpecClause: stripOuterQuotes(fields.get("spec")!),
      layer: fields.has("layer") ? stripOuterQuotes(fields.get("layer")!) : "unknown-layer",
      object: fields.has("object") ? stripOuterQuotes(fields.get("object")!) : "Contract",
    };
    if (fields.has("severity")) {
      const s = stripOuterQuotes(fields.get("severity")!).toUpperCase();
      if (!["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(s)) {
        throw new Error(`GRAMMAR_VIOLATION: block "${h.subject}" malformed field 'severity' — expected CRITICAL|HIGH|MEDIUM|LOW got "${s}"`);
      }
      candidate.severity = s;
    }
    if (fields.has("confidence")) {
      const n = Number.parseFloat(stripOuterQuotes(fields.get("confidence")!));
      if (!Number.isFinite(n) || n < 0 || n > 1) {
        throw new Error(`GRAMMAR_VIOLATION: block "${h.subject}" malformed field 'confidence' — expected 0.0-1.0`);
      }
      candidate.confidence = n;
    }
    candidates.push(candidate);
  }
  // H23 (qwen 33d64eca): \Z matches a literal "Z" in JS — end-of-input is $.
  const summaryRe = /^##\s+SUMMARY\s*\n([\s\S]*?)(?=\n##\s+|$)/im;
  const sm = raw.match(summaryRe);
  const summary = sm?.[1]?.trim().slice(0, 4000) ?? `${candidates.length} finding(s) extracted from markdown report`;
  return { candidates, summary };
}

export async function readFindingsReport(
  reportPath: string,
  schema?: { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { message: string } } },
): Promise<{ findings: unknown; fileBytes: number; fileMtime: number; raw: string }> {
  if (!reportPath || typeof reportPath !== "string" || reportPath.trim() === "") {
    throw new Error("HUNTER_NO_REPORT: reportPath required");
  }
  let stat: fs.Stats;
  try {
    stat = fs.statSync(reportPath);
  } catch {
    throw new Error("HUNTER_NO_REPORT: " + reportPath);
  }
  const raw = fs.readFileSync(reportPath, "utf-8");
  if (raw.trim().length === 0) throw new Error("REPORT_PARSE_FAILED: empty file");
  const { candidates, summary } = parseFindingsMarkdown(raw);
  const payload = { candidates, summary };
  if (schema) {
    const res = schema.safeParse(payload);
    if (!res.success) throw new Error(`REPORT_SCHEMA_FAILED: ${res.error?.message ?? "invalid"}`);
    return { findings: res.data as unknown, fileBytes: stat.size, fileMtime: stat.mtimeMs, raw };
  }
  return { findings: payload, fileBytes: stat.size, fileMtime: stat.mtimeMs, raw };
}

// ── Deterministic sweep ──

interface SweptCandidate {
  subject: string;
  predicate: string;
  file: string;
  line: number;
  evidence: string;
  spec: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
}

function nodeLine(node: { data?: Record<string, unknown> }): number | null {
  const d = node.data ?? {};
  const loc = d["source_location"];
  if (typeof loc === "string") {
    const m = loc.match(/^L(\d+)$/);
    if (m) {
      const n = Number.parseInt(m[1]!, 10);
      if (Number.isInteger(n) && n > 0) return n;
    }
  }
  for (const k of ["line_start", "line", "line_end"]) {
    const v = d[k];
    if (typeof v === "number" && Number.isInteger(v) && v > 0) return v;
  }
  return null;
}

function nodeFile(targetRoot: string, node: { file: string; data?: Record<string, unknown> }): string {
  const raw = node.file || String(node.data?.["source_file"] ?? "");
  let rel = raw.replace(/^\.\//, "");
  // P1.2.2 + W9 (frozen-scan HIGH): normalize FIRST, then judge — `a/../../x`
  // does not literally start with `../` and slipped the old prefix check.
  if (rel.length > 0) rel = path.normalize(rel); // empty stays empty (normalize(".") === ".")
  if (rel && !path.isAbsolute(rel)) {
    if (rel === ".." || rel.startsWith("../") || rel.startsWith(`..${path.sep}`)) return ""; // both separator spellings
    return rel.split(path.sep).join("/");
  }
  if (rel) {
    // Absolute anchor: contained-only, emitted as root-relative posix (the
    // same format as the graphify normalize/projection containment).
    const r = path.relative(realResolve(path.resolve(targetRoot)), realResolve(rel));
    if (r === "" || r === ".." || r.startsWith(`..${path.sep}`) || path.isAbsolute(r)) return "";
    return r.split(path.sep).join("/");
  }
  return "";
}
/** P1.3.3 (W3): the shape gate SPOT-CHECKS ELEMENTS — array-level checks alone
 *  let garbage rows flow into the sweep and TypeError mid-walk. First 32 rows
 *  of each array must carry the contract fields (id/label; source+target). */
export function validateGraphShapeForTest(graph: unknown): void {
  assertGraphShape(graph);
  const g = graph as { nodes: unknown[]; edges: unknown[] };
  for (const n of g.nodes) {
    const row = n as Record<string, unknown>;
    if (typeof row["id"] !== "string" || row["id"].length === 0) {
      throw new Error("GRAPH_SHAPE_INVALID: nodes[] element missing non-empty string id");
    }
  }
  for (const e of g.edges) {
    const row = e as Record<string, unknown>;
    // W26: the seam matches the PROD contract exactly — src/dst only. The old
    // source/target alias fallback diverged from assertGraphShape (a graph
    // passing the seam failed prod, and vice versa).
    const src = row["src"];
    const dst = row["dst"];
    if (typeof src !== "string" || src.length === 0 || typeof dst !== "string" || dst.length === 0) {
      throw new Error("GRAPH_SHAPE_INVALID: edges[] element missing src/dst string endpoints");
    }
  }
}


// P1.2.2 (W2 gi-containment): test-seam export — the containment law of this
// helper is pinned by tests/st-gi-w2-containment.test.ts (T3).
export const nodeFileForTest = nodeFile;

function sourceLineQuote(targetRoot: string, relFile: string, line: number): string {
  try {
    const abs = path.resolve(targetRoot, relFile);
    const rootReal = realResolve(path.resolve(targetRoot));
    const realFile = realResolve(abs);
    if (!isWithinRoot(realFile, rootReal) && realFile !== rootReal) return "";
    const fd = fs.openSync(realFile, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
      const size = fs.fstatSync(fd).size;
      if (size > 8 * 1024 * 1024) return "";
      const buf = Buffer.alloc(size);
      let total = 0;
      while (total < size) {
        const n = fs.readSync(fd, total >= 0 ? buf.subarray(total) : buf, 0, size - total, total);
        if (n <= 0) break;
        total += n;
      }
      const lines = buf.subarray(0, total).toString("utf-8").split("\n");
      return (lines[line - 1] ?? "").trim().slice(0, 300);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return "";
  }
}

function sweepIncomplete(anchor: string, layerId: string, measured: string, fallbackFile: string): SweptCandidate {
  // W31 (frozen-scan HIGH): a FAILED sweep is not a verified empty — the
  // distinct predicate/severity make the infrastructure failure
  // machine-detectable downstream instead of grammar-valid clean.
  return {
    subject: `sweep incomplete — ${anchor}: ${measured}`,
    predicate: `${anchor}.sweep-incomplete`,
    file: fallbackFile,
    line: 1,
    evidence: `measured: ${measured}; sweep INCOMPLETE — no verdict possible from a failed sweep`,
    spec: `${layerId} audit — sweep infrastructure failure`,
    severity: "HIGH",
    confidence: 1.0,
  };
}

function confirmedEmpty(anchor: string, layerId: string, measured: string, fallbackFile: string): SweptCandidate {
  return {
    subject: `confirmed-empty — no ${anchor} findings measured`,
    predicate: `${anchor}.confirmed-empty`,
    file: fallbackFile,
    line: 1,
    evidence: `measured: ${measured}; no ${anchor} finding confirmed`,
    spec: `${layerId} audit — no implicated spec clause (confirmed-empty structural audit)`,
    severity: "LOW",
    confidence: 0.9,
  };
}

async function sweep(
  template: AuditorTemplate,
  graph: GraphifyGraph,
  targetRoot: string,
  belt: AuditorToolbelt,
  calls: { count: number; names: string[] },
): Promise<SweptCandidate[]> {
  const anchor = template.anchorPredicate;
  const firstNodeFile = graph.nodes.map((n) => nodeFile(targetRoot, n)).find((f) => f !== "") ?? "graph.json";
  const quote = (rel: string, ln: number, extra: string): string => {
    const q = sourceLineQuote(targetRoot, rel, ln);
    return q !== "" ? `"${q}" ${extra}`.trim() : `${extra} [no source line: ${rel}:${ln}]`;
  };

  if (anchor === "graph-structure") {
    // Mandate-true: graphQueries[3] 'explain god nodes with highest degree and their communities'.
    const degree = new Map<string, number>();
    for (const e of graph.edges) {
      degree.set(e.src, (degree.get(e.src) ?? 0) + 1);
      degree.set(e.dst, (degree.get(e.dst) ?? 0) + 1);
    }
    const top = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length === 0) return [confirmedEmpty(anchor, template.layerId, "graph has no edges", firstNodeFile)];
    const out: SweptCandidate[] = [];
    for (const [id, deg] of top) {
      const node = graph.nodes.find((n) => n.id === id);
      if (!node) continue;
      const rel = nodeFile(targetRoot, node);
      if (rel === "") continue;
      const ln = nodeLine(node) ?? 1;
      const ext = graph.edges.filter((e) => (e.src === id || e.dst === id) && e.confidence === "EXTRACTED").length;
      out.push({
        subject: `god-node concentration — ${node.label} degree ${deg}`,
        predicate: "graph-structure.god-node",
        file: rel,
        line: ln,
        evidence: quote(rel, ln, `degree ${deg} (${ext} EXTRACTED edges)`),
        spec: `${template.layerId} audit — god-node concentration (structural audit, no external spec clause)`,
        severity: deg >= 5 ? "CRITICAL" : deg >= 3 ? "HIGH" : deg >= 2 ? "MEDIUM" : "LOW",
        confidence: 0.9,
      });
    }
    return out.length > 0 ? out : [confirmedEmpty(anchor, template.layerId, "god nodes unresolvable to files", firstNodeFile)];
  }

  if (anchor === "cycles") {
    // V21 W7: Tarjan SCC first — cycle DETECTION is complete (a global-visited
    // DFS misses cycles that pass through nodes visited by an earlier seed).
    // Every SCC with >1 node (or a self-loop) holds a cycle; per-SCC DFS then
    // enumerates concrete cycle rows, capped at 3 WITH the cap disclosed.
    const adj = new Map<string, string[]>();
    for (const e of graph.edges) adj.set(e.src, [...(adj.get(e.src) ?? []), e.dst]);
    const selfLoop = new Set<string>();
    for (const e of graph.edges) if (e.src === e.dst) selfLoop.add(e.src);
    // Tarjan (iterative)
    const index = new Map<string, number>();
    const low = new Map<string, number>();
    const onStack = new Set<string>();
    const sccStack: string[] = [];
    const sccs: string[][] = [];
    let counter = 0;
    for (const seed of graph.nodes) {
      if (index.has(seed.id)) continue;
      const stack: Array<{ id: string; it: number }> = [{ id: seed.id, it: 0 }];
      while (stack.length > 0) {
        const top = stack[stack.length - 1]!;
        if (top.it === 0) {
          index.set(top.id, counter); low.set(top.id, counter); counter += 1;
          sccStack.push(top.id); onStack.add(top.id);
        }
        const nbs = adj.get(top.id) ?? [];
        if (top.it < nbs.length) {
          const nb = nbs[top.it++]!;
          if (!index.has(nb)) {
            stack.push({ id: nb, it: 0 });
          } else if (onStack.has(nb)) {
            low.set(top.id, Math.min(low.get(top.id)!, index.get(nb)!));
          }
        } else {
          stack.pop();
          if (stack.length > 0) {
            const parent = stack[stack.length - 1]!;
            // V21 fix-now F1: propagate only while top is still on the SCC
            // stack — after its component closes, its lowlink must NOT bleed
            // into the parent (classic iterative-Tarjan defect).
            if (onStack.has(top.id)) {
              low.set(parent.id, Math.min(low.get(parent.id)!, low.get(top.id)!));
            }
          }
          if (low.get(top.id) === index.get(top.id)) {
            const comp: string[] = [];
            for (;;) {
              const w = sccStack.pop()!;
              onStack.delete(w);
              comp.push(w);
              if (w === top.id) break;
            }
            if (comp.length > 1 || (comp.length === 1 && selfLoop.has(comp[0]!))) sccs.push(comp);
          }
        }
      }
    }
    if (sccs.length === 0) {
      return [confirmedEmpty(anchor, template.layerId, `Tarjan SCC over ${graph.nodes.length} nodes/${graph.edges.length} edges found no directed cycle`, firstNodeFile)];
    }
    // Per-SCC concrete enumeration (bounded, inside the SCC only)
    const cycles: string[][] = [];
    const CYCLE_CAP = 3;
    for (const comp of sccs) {
      if (cycles.length >= CYCLE_CAP) break;
      const compSet = new Set(comp);
      const compAdj = new Map<string, string[]>();
      for (const n of comp) compAdj.set(n, (adj.get(n) ?? []).filter((d) => compSet.has(d)));
      // W30: FRESH visited per seed — a shared set pruned cycles passing
      // through nodes visited by an earlier seed (the alias of the
      // global-visited defect this branch documents for the outer DFS).
      for (const seedOfComp of comp) {
        const localVisited = new Set<string>();
        if (cycles.length >= CYCLE_CAP) break;
        if (localVisited.has(seedOfComp)) continue;
        const stack: Array<{ id: string; it: number }> = [{ id: seedOfComp, it: 0 }];
        const path: string[] = [];
        const onS = new Set<string>();
        while (stack.length > 0 && cycles.length < CYCLE_CAP) {
          const top = stack[stack.length - 1]!;
          if (top.it === 0) {
            if (localVisited.has(top.id)) { stack.pop(); continue; }
            localVisited.add(top.id);
            path.push(top.id);
            onS.add(top.id);
          }
          const nbs = compAdj.get(top.id) ?? [];
          if (top.it < nbs.length) {
            const nb = nbs[top.it++]!;
            if (!localVisited.has(nb)) stack.push({ id: nb, it: 0 });
            else if (onS.has(nb)) cycles.push([...path.slice(path.indexOf(nb)), nb]);
          } else {
            stack.pop();
            onS.delete(top.id);
            path.pop();
          }
        }
      }
    }
    const truncated = sccs.length > 0 && cycles.length >= CYCLE_CAP;
    return cycles.slice(0, CYCLE_CAP).map((c) => {
      const head = graph.nodes.find((n) => n.id === c[0]);
      const rel = head ? nodeFile(targetRoot, head) : "";
      return {
        subject: `dependency cycle — ${c.join(" → ")}`,
        predicate: "cycles.import",
        file: rel === "" ? firstNodeFile : rel,
        line: head ? (nodeLine(head) ?? 1) : 1,
        evidence: `cycle [${c.join(", ")}] verified in graph edge set (${c.length - 1} hops); SCC count ${sccs.length}${truncated ? ` — CAP ${CYCLE_CAP} reached, more cycles may exist` : ""}`,
        spec: `${template.layerId} audit — circular dependency (structural audit, no external spec clause)`,
        severity: "HIGH" as const,
        confidence: 0.85,
      };
    });
  }

  if (anchor === "dead-code") {
    // Mandate-true: in-degree 0 AND out-degree 0, excluding manifests/entry scaffolding.
    const indeg = new Map<string, number>();
    const outdeg = new Map<string, number>();
    for (const e of graph.edges) {
      indeg.set(e.dst, (indeg.get(e.dst) ?? 0) + 1);
      outdeg.set(e.src, (outdeg.get(e.src) ?? 0) + 1);
    }
    const isolates = graph.nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0 && (outdeg.get(n.id) ?? 0) === 0).slice(0, 25);
    const out: SweptCandidate[] = [];
    let probeFailures = 0;
    let probeFailureReason = "";
    for (const n of isolates) {
      const rel = nodeFile(targetRoot, n);
      if (rel === "" || /(^|\/)package\.json$/.test(rel)) continue;
      const ln = nodeLine(n) ?? 1;
      const grepHit = await belt.grep.invoke({ pattern: n.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), maxResults: 5 });
      calls.count += 1;
      calls.names.push("grep");
      // V21 W8: infrastructure failure is LOUD — the node is skipped (no verdict
      // either way) and the failure is remembered. A dead-code row may never be
      // built on a failed probe, and a clean-empty may never hide one.
      if (grepHit.startsWith("SEARCH_FAILED") || grepHit.startsWith("GREP_INVALID")) {
        probeFailures += 1;
        probeFailureReason = grepHit.slice(0, 120);
        continue;
      }
      if (!grepHit.startsWith("(no matches)")) {
        continue; // grep confirms a consumer — RED_HERRING per calibration (namespace-import class)
      }
      out.push({
        subject: `dead code — ${n.label} with no graph edges and no grep consumers`,
        predicate: "dead-code.module",
        file: rel,
        line: ln,
        evidence: quote(rel, ln, "in-degree 0, out-degree 0, grep confirms no consumers"),
        spec: `${template.layerId} audit — dead declaration (structural audit, no external spec clause)`,
        severity: "MEDIUM",
        confidence: 0.8,
      });
      if (out.length >= 3) break;
    }
    if (out.length === 0 && probeFailures > 0) {
      // Every skipped probe means the sweep is INCOMPLETE — a clean-empty here
      // would be a silent-degrade lie. Name the infrastructure failure instead.
      return [sweepIncomplete(anchor, template.layerId, `dead-code sweep INCOMPLETE: ${probeFailures} node probe(s) failed (first: ${probeFailureReason})`)];
    }
    return out.length > 0 ? out : [confirmedEmpty(anchor, template.layerId, `in-degree/out-degree scan over ${graph.nodes.length} nodes + grep two-leg verification found no dead declarations`, firstNodeFile)];
  }

  if (anchor === "impact-path") {
    // Mandate-true: BFS blast radius from the highest-degree node, depth ≤5.
    const degree = new Map<string, number>();
    for (const e of graph.edges) {
      degree.set(e.src, (degree.get(e.src) ?? 0) + 1);
      degree.set(e.dst, (degree.get(e.dst) ?? 0) + 1);
    }
    const top = [...degree.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!top) return [confirmedEmpty(anchor, template.layerId, "graph has no edges", firstNodeFile)];
    const adj = new Map<string, string[]>();
    for (const e of graph.edges) {
      adj.set(e.src, [...(adj.get(e.src) ?? []), e.dst]);
      adj.set(e.dst, [...(adj.get(e.dst) ?? []), e.src]);
    }
    const seen = new Set<string>([top[0]]);
    let frontier = [top[0]];
    let depth = 0;
    while (frontier.length > 0 && depth < 5) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const nb of adj.get(id) ?? []) {
          if (!seen.has(nb)) {
            seen.add(nb);
            next.push(nb);
          }
        }
      }
      frontier = next;
      depth += 1;
    }
    const node = graph.nodes.find((n) => n.id === top[0]);
    const rel = node ? nodeFile(targetRoot, node) : "";
    return [{
      subject: `impact path — ${top[0]} reaches ${seen.size - 1} node(s) within ${depth} hop(s)`,
      predicate: "impact-path.blast-radius",
      file: rel === "" ? firstNodeFile : rel,
      line: node ? (nodeLine(node) ?? 1) : 1,
      evidence: `BFS from ${top[0]}: ${seen.size - 1} reachable within ${depth} hops [${[...seen].slice(0, 8).join(", ")}]`,
      spec: `${template.layerId} audit — blast radius (structural audit, no external spec clause)`,
      severity: seen.size >= 6 ? "HIGH" : "MEDIUM",
      confidence: 0.9,
    }];
  }

  // Contract/oracle/stage/provenance + all LASME families: two-leg measurement via mission-grep
  // (graph queries run first for the graphSlice evidence; grep confirms absence/presence).
  const probes: Record<string, string> = {
    contract: "checkContract",
    oracle: "Math\\.abs|epsilon",
    stage: "precondition|postcondition|invariant",
    provenance: "TRACE_GAP|implements",
    lexicon: "PatternFamily",
    actor: "createMachine|createActor",
    "state-machine": "createMachine",
    engine: "writeFileSync",
    adapter: "Object\\.assign|\\.\\.\\.",
    "mpse-threshold": "epsilon|threshold",
  };
  const probe = probes[anchor] ?? anchor.replace(/[^A-Za-z0-9_-]/g, "");
  const hit = await belt.grep.invoke({ pattern: probe, maxResults: 5 });
  calls.count += 1;
  calls.names.push("grep");
  const measured = hit.startsWith("(no matches)")
    ? `grep "${probe}" over targetRoot: no matches`
    : `grep "${probe}" over targetRoot: ${hit.split("\n").length} match line(s)`;
  if (!hit.startsWith("(no matches)") && !hit.startsWith("SEARCH_FAILED") && !hit.startsWith("GREP_INVALID")) {
    const firstLine = hit.split("\n")[0] ?? "";
    const flm = firstLine.match(/^(.+?):(\d+):/);
    // H22 (qwen 33d64eca): the grep-hit path must resolve INSIDE targetRoot —
    // a `../`-escaped match falls back to firstNodeFile (never leaves the root).
    let hitPath = flm ? flm[1]! : "";
    let contained = false;
    if (hitPath) {
      try {
        const realHit = realResolve(path.isAbsolute(hitPath) ? hitPath : path.resolve(targetRoot, hitPath));
        contained = isWithinRoot(realHit, realResolve(path.resolve(targetRoot)));
        if (contained) hitPath = realHit;
      } catch { contained = false; }
    }
    // W24: relativize against the RESOLVED root — the unresolved targetRoot
    // (symlink) made rel ../-escape or absolute, landing verbatim in findings.
    const rel = flm && contained ? (path.relative(realResolve(path.resolve(targetRoot)), hitPath) || hitPath) : firstNodeFile;
    return [{
      subject: `${anchor} signal — "${probe}" present at ${rel}`,
      predicate: `${anchor}.signal`,
      file: rel,
      line: flm ? Number.parseInt(flm[2]!, 10) : 1,
      evidence: `"${firstLine.slice(0, 200)}" — mission-grep two-leg confirmation`,
      spec: `${template.layerId} audit — ${anchor} mandate signal (structural audit, no external spec clause)`,
      severity: "MEDIUM",
      confidence: 0.7,
    }];
  }
  // V21 cleanup AUD-C2: infrastructure failure is LOUD here too — the generic
  // leg never reports a clean-empty that a failed probe produced.
  if (hit.startsWith("SEARCH_FAILED") || hit.startsWith("GREP_INVALID")) {
    return [sweepIncomplete(anchor, template.layerId, `probe INCOMPLETE: ${hit.slice(0, 140)} — no verdict possible from a failed probe`)];
  }
  return [confirmedEmpty(anchor, template.layerId, measured, firstNodeFile)];
}

// ── Runner (fork runLayerHunter :86-226, AetherAgent replaced by sweep) ──

/** V21 cleanup AUD-C3: the loaded graph is shape-validated BEFORE the sweep —
 *  a malformed graph.json is a named rejection, never a TypeError mid-sweep. */
function assertGraphShape(graph: unknown): { nodes: unknown[]; edges: unknown[] } {
  if (graph === null || typeof graph !== "object") throw new Error("GRAPHIFY_EXTRACT_FAILED: graph.json did not parse to an object");
  const g = graph as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(g.nodes)) throw new Error("GRAPHIFY_EXTRACT_FAILED: graph.json missing a nodes[] array");
  if (!Array.isArray(g.edges)) throw new Error("GRAPHIFY_EXTRACT_FAILED: graph.json missing an edges[] array");
  // P1.3.3 wiring (W3 + frozen-scan HIGH): the PROD gate spot-checks ELEMENTS
  // too (first 32 rows: id / source+target) — array-level checks alone let
  // garbage rows TypeError mid-sweep. Same contract as the
  // validateGraphShapeForTest seam.
  for (const n of g.nodes as unknown[]) {
    const row = n as Record<string, unknown>;
    if (typeof row["id"] !== "string" || (row["id"] as string).length === 0) {
      throw new Error("GRAPHIFY_EXTRACT_FAILED: graph.json nodes[] element missing non-empty string id");
    }
  }
  for (const e of g.edges as unknown[]) {
    const row = e as Record<string, unknown>;
    // W16 (frozen-scan HIGH): the sweep reads e.src/e.dst — accepting the
    // source/target ALIAS here let a raw-shaped graph pass validation then
    // yield undefined keys mid-sweep (empty adjacency, false confirmed-empty).
    // Post-normalize rows are src/dst; anything else is a named refusal.
    const src = row["src"];
    const dst = row["dst"];
    if (typeof src !== "string" || src.length === 0 || typeof dst !== "string" || dst.length === 0) {
      throw new Error("GRAPHIFY_EXTRACT_FAILED: graph.json edges[] element missing src/dst string endpoints");
    }
  }
  return { nodes: g.nodes, edges: g.edges };
}

export interface RunTemplateAuditArgs {
  template: AuditorTemplate;
  inputData?: string;
  ledgerDir: string;
  targetRoot: string;
  graphPath: string;
  client?: GraphifyClientReader | null;
}

export async function runTemplateAudit(args: RunTemplateAuditArgs): Promise<HunterSettlement> {
  const t0 = Date.now();
  const template = args.template;
  const layerId = template?.layerId ?? "unknown";
  const ledgerDir = path.resolve(args.ledgerDir ?? "");
  const errors: string[] = [];
  const calls = { count: 0, names: [] as string[] };

  if (!template || typeof template.layerId !== "string" || template.layerId.trim() === "") {
    return { layerId, status: "rejected", error: "HUNTER_TEMPLATE_INVALID: layerId required", ledgerDir, durationMs: Date.now() - t0 };
  }
  if (!args.ledgerDir || typeof args.ledgerDir !== "string" || args.ledgerDir.trim() === "") {
    return { layerId, status: "rejected", error: "HUNTER_LEDGER_INVALID: ledgerDir required", ledgerDir, durationMs: Date.now() - t0 };
  }
  if (!template.outputSchema || typeof (template.outputSchema as { safeParse?: unknown }).safeParse !== "function") {
    return { layerId, status: "rejected", error: "HUNTER_SCHEMA_INVALID: outputSchema required", ledgerDir, durationMs: Date.now() - t0 };
  }
  if (!args.targetRoot || typeof args.targetRoot !== "string" || args.targetRoot.trim() === "") {
    return { layerId, status: "rejected", error: "HUNTER_TARGET_INVALID: targetRoot required", ledgerDir, durationMs: Date.now() - t0 };
  }
  const targetRoot = path.resolve(args.targetRoot);
  if (!fs.existsSync(targetRoot)) {
    return { layerId, status: "rejected", error: `HUNTER_TARGET_INVALID: targetRoot not found: ${targetRoot}`, ledgerDir, durationMs: Date.now() - t0 };
  }

  // Graph load — the REAL attempt. GRAPHIFY_NOT_WARM / GRAPHIFY_GRAPH_TOO_LARGE /
  // GRAPHIFY_EXTRACT_FAILED surface here; the bind maps them to the degraded path.
  let graph: GraphifyGraph;
  try {
    graph = args.client ? await new GraphifyMapReader(args.client).load(args.graphPath) : await readGraphJson(args.graphPath);
    // V21 cleanup AUD-C3: shape-validated before the sweep — a malformed
    // graph.json is a named rejection, never a TypeError mid-sweep.
    assertGraphShape(graph);
  } catch (e) {
    return { layerId, status: "rejected", error: String((e as Error).message ?? e).slice(0, 500), ledgerDir, durationMs: Date.now() - t0 };
  }

  let belt: AuditorToolbelt;
  try {
    const tagPredicate = (template.filterTags ?? []).find((t) => isPredicate(t)) ?? "flagged_by";
    belt = buildAuditorTools(ledgerDir, targetRoot, layerId, tagPredicate);
  } catch (e) {
    return { layerId, status: "rejected", error: "HUNTER_TOOLS_FAILED: " + String((e as Error).message ?? e).slice(0, 400), ledgerDir, durationMs: Date.now() - t0 };
  }
  try {
    fs.mkdirSync(ledgerDir, { recursive: true });
  } catch (e) {
    return { layerId, status: "rejected", error: "HUNTER_LEDGER_MKDIR_FAILED: " + String((e as Error).message ?? e).slice(0, 400), ledgerDir, durationMs: Date.now() - t0 };
  }

  // Brief (fork :121-127) — input data + graph digest the sweep consumed.
  const brief = [
    `# HUNT BRIEF — ${layerId}`,
    `- anchorPredicate: ${template.anchorPredicate}`,
    `- layerNumber: ${template.layerNumber}`,
    `- targetRoot: ${targetRoot}`,
    `- graphPath: ${path.resolve(args.graphPath)}`,
    `- graph: ${graph.nodes.length} nodes / ${graph.edges.length} edges / godNodes [${graph.godNodes ?? [].slice(0, 5).join(", ")}]`,
    `- graphQueries: ${(template.graphQueries ?? []).join(" | ")}`,
    `- inputData: ${args.inputData ?? ""}`,
    "",
    template.staticPrompt,
    "",
  ].join("\n");
  try {
    fs.writeFileSync(path.join(ledgerDir, "brief.md"), brief, "utf-8");
  } catch (e) {
    return { layerId, status: "rejected", error: "HUNTER_BRIEF_WRITE_FAILED: " + String((e as Error).message ?? e).slice(0, 400), ledgerDir, durationMs: Date.now() - t0 };
  }

  // Graph-slice evidence: run the template's first query through the reader (MCP-first,
  // local-fallback inside) so the report's graphRefs are consumed, not asserted.
  const reader = new GraphifyMapReader(args.client ?? null);
  let sliceNote = "";
  try {
    const q0 = (template.graphQueries ?? [])[0] ?? template.anchorPredicate;
    const slice = await reader.query(graph, q0);
    calls.count += 1;
    calls.names.push("graph-query");
    sliceNote = `graphSlice query "${q0}" → ${slice.nodes.length} nodes / ${slice.edges.length} edges`;
  } catch (e) {
    errors.push("GRAPH_SLICE_FAILED: " + String((e as Error).message).slice(0, 200));
    sliceNote = "graphSlice unavailable (see errors)";
  }

  let swept: SweptCandidate[];
  try {
    swept = await sweep(template, graph, targetRoot, belt, calls);
  } catch (e) {
    return { layerId, status: "rejected", error: "HUNTER_SWEEP_FAILED: " + String((e as Error).message ?? e).slice(0, 400), ledgerDir, durationMs: Date.now() - t0 };
  }

  // Report via the force-bound tool (fork systemPrompt law: ONLY write_findings produces it).
  const blocks = swept.map((c) => [
    `## FINDING: ${c.subject}`,
    `- layer: ${layerId}`,
    `- predicate: ${c.predicate}`,
    `- object: Contract`,
    `- file: ${c.file}:${c.line}`,
    `- evidence: "${c.evidence.replace(/"/g, "'")}"`,
    `- spec: ${c.spec}`,
    `- severity: ${c.severity}`,
    `- confidence: ${c.confidence}`,
  ].join("\n")).join("\n\n");
  const summary = `${layerId}: ${swept.length} finding(s) — ${swept[0]?.subject ?? "no findings"}. ${sliceNote}.`;
  const report = `${blocks}\n\n## SUMMARY\n${summary}\n`;
  const writeOut = await belt.writeFindings.invoke({ content: report });
  calls.count += 1;
  calls.names.push("write_findings");
  let wroteBytes = 0;
  try {
    const parsed = JSON.parse(writeOut) as { bytes?: unknown; path?: unknown; error?: unknown };
    if (typeof parsed.bytes !== "number" || parsed.bytes <= 0 || typeof parsed.path !== "string" || parsed.path.length === 0 || parsed.error !== undefined) throw new Error("bad-shape");
    wroteBytes = parsed.bytes;
  } catch {
    return { layerId, status: "rejected", error: "HUNTER_REPORT_WRITE_FAILED: " + writeOut.slice(0, 300), ledgerDir, durationMs: Date.now() - t0 };
  }
  void wroteBytes;

  // graph_tag splice: one typed edge per finding (failures are loud in telemetry, non-fatal —
  // the report is already on disk; a tag failure must not void a measured hunt).
  for (const c of swept) {
    try {
      await belt.graphTag.invoke({
        findingSubject: c.subject,
        findingFile: c.file,
        findingLine: c.line,
        evidence: c.evidence,
        severity: c.severity,
        // W15: the MEASURED predicate when it is ontology-valid — off-ontology
        // measured names (dead-code.module) fall back to the layer default
        // inside the tool instead of throwing per-tag.
        predicate: isPredicate(c.predicate) ? c.predicate : undefined,
      });
      calls.count += 1;
      calls.names.push("graph_tag");
    } catch (e) {
      errors.push("GRAPH_TAG_FAILED: " + String((e as Error).message).slice(0, 200));
    }
  }

  // Read-back validation (fork :161-168 stale/empty checks + schema validation).
  const reportPath = path.join(ledgerDir, "findings", "report.md");
  try {
    const st = fs.statSync(reportPath);
    // H21 (qwen 33d64eca): the freshness slack is FILESYSTEM-GRANULARITY only
    // (100ms) — the old +2000ms accepted a report written up to 2s BEFORE the
    // run started as "produced by this hunt".
    const REPORT_MTIME_SLACK_MS = 100;
    if (!(st.mtimeMs + REPORT_MTIME_SLACK_MS >= t0)) {
      return { layerId, status: "rejected", error: `HUNTER_STALE_REPORT: report.md mtime ${st.mtimeMs} < run start ${t0} — not produced by this hunt`, ledgerDir, durationMs: Date.now() - t0 };
    }
    if (st.size === 0) {
      return { layerId, status: "rejected", error: "HUNTER_EMPTY_REPORT: this run wrote an empty report", ledgerDir, durationMs: Date.now() - t0 };
    }
  } catch {
    return { layerId, status: "rejected", error: "HUNTER_NO_REPORT: findings/report.md not written by this run (the hunt must always produce it)", ledgerDir, durationMs: Date.now() - t0 };
  }
  let read: { findings: unknown; fileBytes: number; fileMtime: number; raw: string };
  try {
    read = await readFindingsReport(reportPath, template.outputSchema as never);
  } catch (e) {
    return { layerId, status: "rejected", error: String((e as Error).message ?? e).slice(0, 600), ledgerDir, durationMs: Date.now() - t0 };
  }

  const telemetry: HunterTelemetry = {
    roundsUsed: 1,
    toolCallsMade: calls.count,
    toolCallNames: calls.names,
    errors,
    text: read.raw.slice(0, 2000),
  };
  return {
    layerId,
    status: "fulfilled",
    findings: read.findings,
    fileBytes: read.fileBytes,
    fileMtime: read.fileMtime,
    raw: read.raw,
    telemetry,
    ledgerDir,
    durationMs: Date.now() - t0,
  };
}
