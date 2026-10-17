// src/gi/budget.ts
import fs from "node:fs";
var GRAPH_LOAD_BUDGET_BYTES = 128 * 1024 * 1024;

class GraphifyGraphTooLargeError extends Error {
  code = "GRAPHIFY_GRAPH_TOO_LARGE";
  constructor(size, budget, detail) {
    super(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${size} bytes (> ${budget} budget). ${detail}`);
    this.name = "GraphifyGraphTooLargeError";
  }
}
function defaultRead(graphPath) {
  return fs.readFileSync(graphPath, "utf8");
}
function defaultParse(text) {
  return JSON.parse(text);
}
function loadGraphDocument(graphPath, options) {
  const budget = options?.budgetBytes ?? GRAPH_LOAD_BUDGET_BYTES;
  const read = options?.read ?? defaultRead;
  const parse = options?.parse ?? defaultParse;
  const size = fs.statSync(graphPath).size;
  if (size > budget) {
    throw new GraphifyGraphTooLargeError(size, budget, "Refresh refused before read. Fix: scope/extract a subtree or lower the graph cardinality.");
  }
  const text = read(graphPath);
  const actual = Buffer.byteLength(text, "utf8");
  if (actual > budget) {
    throw new GraphifyGraphTooLargeError(actual, budget, "Refresh refused before parse. graph.json grew past the budget between stat and read.");
  }
  try {
    return parse(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`GRAPHIFY_EXTRACT_FAILED: graph.json is not valid JSON (${msg})`);
  }
}
// src/gi/graphify-ignore.ts
import fs2 from "node:fs";
import path from "node:path";
function parseGraphifyIgnore(text) {
  const rules = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (trimmed === "" || trimmed.startsWith("#"))
      continue;
    let body = trimmed;
    let negated = false;
    if (body.startsWith("!")) {
      negated = true;
      body = body.slice(1).trim();
    }
    let dirOnly = false;
    if (body.endsWith("/")) {
      dirOnly = true;
      body = body.slice(0, -1);
    }
    if (body.startsWith("/"))
      body = body.slice(1);
    if (body.length === 0)
      continue;
    rules.push({ negated, dirOnly, pattern: body });
  }
  return rules;
}
function ruleMatches(relPath, rule) {
  const pattern = rule.pattern;
  if (pattern.startsWith("*.")) {
    if (rule.dirOnly)
      return false;
    const suffix = pattern.slice(1);
    const base = relPath.slice(relPath.lastIndexOf("/") + 1);
    return base.endsWith(suffix);
  }
  if (pattern.includes("/")) {
    const exact = relPath === pattern || relPath.startsWith(`${pattern}/`);
    return exact;
  }
  const directory = relPath === pattern || relPath.startsWith(`${pattern}/`) || relPath.includes(`/${pattern}/`) || relPath.endsWith(`/${pattern}`);
  if (rule.dirOnly)
    return directory;
  return directory || relPath === pattern;
}
function isGraphifyIgnored(relPath, rules) {
  const norm = relPath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  let ignored = false;
  for (const rule of rules) {
    if (!ruleMatches(norm, rule))
      continue;
    ignored = !rule.negated;
  }
  return ignored;
}
function loadIgnoreFile(root) {
  const file = path.join(root, ".graphifyignore");
  if (!fs2.existsSync(file))
    return [];
  return parseGraphifyIgnore(fs2.readFileSync(file, "utf8"));
}
// src/gi/refresh.ts
import fs3 from "node:fs";
import path2 from "node:path";
function asRecord(value) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return null;
}
function listRefreshInputs(root) {
  const rules = loadIgnoreFile(root);
  const kept = [];
  const ignored = [];
  const walk = (dir) => {
    const entries = fs3.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isSymbolicLink()) {
        ignored.push(path2.relative(root, path2.join(dir, ent.name)).split(path2.sep).join("/"));
        continue;
      }
      const abs = path2.join(dir, ent.name);
      const rel = path2.relative(root, abs).split(path2.sep).join("/");
      if (isGraphifyIgnored(rel, rules)) {
        ignored.push(rel);
        continue;
      }
      if (ent.isDirectory()) {
        walk(abs);
        continue;
      }
      if (ent.isFile())
        kept.push(rel);
    }
  };
  walk(root);
  kept.sort();
  ignored.sort();
  return { kept, ignored };
}
function refreshGraphify(root, options) {
  const inputs = listRefreshInputs(root);
  const graphPath = path2.join(root, "graphify-out", "graph.json");
  if (!fs3.existsSync(graphPath)) {
    throw new Error(`GRAPHIFY_NOT_WARM: graph.json missing at ${graphPath}`);
  }
  const doc = asRecord(loadGraphDocument(graphPath, options));
  const nodes = doc && Array.isArray(doc.nodes) ? doc.nodes.length : 0;
  const edges = doc && Array.isArray(doc.edges) ? doc.edges.length : 0;
  return { ...inputs, nodes, edges, graphPath };
}
// src/gi/corbell-retry.ts
var DEFAULT_MAX_ATTEMPTS = 5;
var DEFAULT_BASE_DELAY_MS = 50;
var DEFAULT_CAP_DELAY_MS = 400;
var DEFAULT_MAX_TOTAL_DELAY_MS = 1000;
function isSqliteBusy(err) {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /SQLITE_BUSY|database is locked/i.test(msg);
}
function delayForAttempt(attempt, baseDelayMs, capDelayMs) {
  const exponential = baseDelayMs * 2 ** (attempt - 1);
  return Math.min(capDelayMs, exponential);
}
async function defaultSleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
async function withCorbellBusyRetry(op, options) {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const capDelayMs = options?.capDelayMs ?? DEFAULT_CAP_DELAY_MS;
  const maxTotalDelayMs = options?.maxTotalDelayMs ?? DEFAULT_MAX_TOTAL_DELAY_MS;
  const sleep = options?.sleep ?? defaultSleep;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error(`CORBELL_RETRY_INVALID: maxAttempts=${String(maxAttempts)}`);
  }
  if (baseDelayMs < 0 || capDelayMs < 0 || maxTotalDelayMs < 0) {
    throw new Error("CORBELL_RETRY_INVALID: delays must be >= 0");
  }
  let waited = 0;
  let last;
  for (let attempt = 1;attempt <= maxAttempts; attempt++) {
    try {
      return await op();
    } catch (err) {
      if (!isSqliteBusy(err))
        throw err;
      last = err;
      if (attempt === maxAttempts)
        break;
      const delay = delayForAttempt(attempt, baseDelayMs, capDelayMs);
      if (delay <= 0 || waited + delay > maxTotalDelayMs)
        break;
      await sleep(delay);
      waited += delay;
    }
  }
  const cause = last instanceof Error ? last.message : String(last);
  throw new Error(`CORBELL_SQLITE_BUSY: database remained locked after ${maxAttempts} bounded retries (backoff cap ${capDelayMs}ms, waited ${waited}ms). Last error: ${cause}`, { cause: last });
}
// src/gi/layer-health.ts
import fs4 from "node:fs";
import path3 from "node:path";
var DEFAULT_SCOPE_THRESHOLD = 0.9;
function emptyLine(name) {
  return `EMPTY/RED ${name} 0/0`;
}
function formatLayerLine(health) {
  switch (health.status) {
    case "EMPTY":
      return emptyLine(health.name);
    case "OK":
    case "SCOPE_SUSPECT": {
      if (health.total === 0)
        return emptyLine(health.name);
      const pct = Math.round(health.inScope / health.total * 100);
      if (health.status === "OK")
        return `OK ${health.name} ${health.inScope}/${health.total} ${pct}%`;
      return `RED ${health.name} ${health.inScope}/${health.total} ${pct}%`;
    }
    default: {
      const neverStatus = health.status;
      throw new Error(`LAYER_STATUS_UNKNOWN: ${String(neverStatus)}`);
    }
  }
}
function assessLayer(snapshot, threshold = DEFAULT_SCOPE_THRESHOLD) {
  if (!Number.isInteger(snapshot.total) || snapshot.total < 0) {
    throw new Error(`LAYER_COUNT_INVALID: total=${snapshot.total}`);
  }
  if (!Number.isInteger(snapshot.inScope) || snapshot.inScope < 0 || snapshot.inScope > snapshot.total) {
    throw new Error(`LAYER_COUNT_INVALID: inScope=${snapshot.inScope} total=${snapshot.total}`);
  }
  if (snapshot.total === 0) {
    const line = formatLayerLine({ name: snapshot.name, status: "EMPTY", total: 0, inScope: 0 });
    return {
      name: snapshot.name,
      status: "EMPTY",
      color: "RED",
      total: 0,
      inScope: 0,
      ratio: null,
      line
    };
  }
  const ratio = snapshot.inScope / snapshot.total;
  const status = ratio >= threshold ? "OK" : "SCOPE_SUSPECT";
  const color = status === "OK" ? "GREEN" : "RED";
  const line = formatLayerLine({
    name: snapshot.name,
    status,
    total: snapshot.total,
    inScope: snapshot.inScope
  });
  return {
    name: snapshot.name,
    status,
    color,
    total: snapshot.total,
    inScope: snapshot.inScope,
    ratio,
    line
  };
}
function loadLayerFixture(dir) {
  const file = path3.join(dir, "layer.json");
  const parsed = JSON.parse(fs4.readFileSync(file, "utf8"));
  if (typeof parsed.name !== "string" || parsed.name.length === 0 || !Array.isArray(parsed.nodes)) {
    throw new Error(`LAYER_FIXTURE_INVALID: ${file}`);
  }
  let inScope = 0;
  for (const node of parsed.nodes) {
    if (node.inScope !== false)
      inScope += 1;
  }
  return { name: parsed.name, total: parsed.nodes.length, inScope };
}
// src/gi/backup-guard.ts
var LARGE_FILE_MAX_BYTES = 1e6;
function isTrackedBackup(relPath, bytes) {
  const norm = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (bytes >= LARGE_FILE_MAX_BYTES) {
    return { backup: true, reason: `size ${bytes} >= ${LARGE_FILE_MAX_BYTES}` };
  }
  if (norm.endsWith(".sqlite") || norm.endsWith(".sqlite3") || norm.endsWith(".bak")) {
    return { backup: true, reason: "backup suffix" };
  }
  if (norm === "graphify-out" || norm.startsWith("graphify-out/")) {
    return { backup: true, reason: "graphify-out" };
  }
  const segments = norm.split("/");
  if (segments.some((segment) => segment === "backups" || segment === "backup")) {
    return { backup: true, reason: "backup directory" };
  }
  return { backup: false, reason: null };
}
export {
  DEFAULT_SCOPE_THRESHOLD,
  GRAPH_LOAD_BUDGET_BYTES,
  GraphifyGraphTooLargeError,
  LARGE_FILE_MAX_BYTES,
  assessLayer,
  formatLayerLine,
  isGraphifyIgnored,
  isSqliteBusy,
  isTrackedBackup,
  listRefreshInputs,
  loadGraphDocument,
  loadIgnoreFile,
  loadLayerFixture,
  parseGraphifyIgnore,
  refreshGraphify,
  withCorbellBusyRetry
};
