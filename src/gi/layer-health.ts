import fs from "node:fs";
import path from "node:path";

export const DEFAULT_SCOPE_THRESHOLD = 0.9;

export interface LayerSnapshot {
  name: string;
  total: number;
  inScope: number;
}

export type LayerStatus = "OK" | "EMPTY" | "SCOPE_SUSPECT";

export interface LayerHealth {
  name: string;
  status: LayerStatus;
  color: "GREEN" | "RED";
  total: number;
  inScope: number;
  /** Null when the layer has no rows. An empty layer is not 100%. */
  ratio: number | null;
  line: string;
}

interface LayerLineInput {
  name: string;
  status: LayerStatus;
  total: number;
  inScope: number;
}

function emptyLine(name: string): string {
  return `EMPTY/RED ${name} 0/0`;
}

/** Format one layer. An empty layer is EMPTY/RED and is never `OK 0/0 100%`. */
export function formatLayerLine(health: LayerLineInput): string {
  switch (health.status) {
    case "EMPTY":
      return emptyLine(health.name);
    case "OK":
    case "SCOPE_SUSPECT": {
      if (health.total === 0) return emptyLine(health.name);
      const pct = Math.round((health.inScope / health.total) * 100);
      if (health.status === "OK") return `OK ${health.name} ${health.inScope}/${health.total} ${pct}%`;
      return `RED ${health.name} ${health.inScope}/${health.total} ${pct}%`;
    }
    default: {
      const neverStatus: never = health.status;
      throw new Error(`LAYER_STATUS_UNKNOWN: ${String(neverStatus)}`);
    }
  }
}

export function assessLayer(snapshot: LayerSnapshot, threshold = DEFAULT_SCOPE_THRESHOLD): LayerHealth {
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
      line,
    };
  }
  const ratio = snapshot.inScope / snapshot.total;
  const status: LayerStatus = ratio >= threshold ? "OK" : "SCOPE_SUSPECT";
  const color = status === "OK" ? "GREEN" : "RED";
  const line = formatLayerLine({
    name: snapshot.name,
    status,
    total: snapshot.total,
    inScope: snapshot.inScope,
  });
  return {
    name: snapshot.name,
    status,
    color,
    total: snapshot.total,
    inScope: snapshot.inScope,
    ratio,
    line,
  };
}

interface FixtureNode {
  inScope?: boolean;
}

interface FixtureFile {
  name: string;
  nodes: FixtureNode[];
}

export function loadLayerFixture(dir: string): LayerSnapshot {
  const file = path.join(dir, "layer.json");
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as FixtureFile;
  if (typeof parsed.name !== "string" || parsed.name.length === 0 || !Array.isArray(parsed.nodes)) {
    throw new Error(`LAYER_FIXTURE_INVALID: ${file}`);
  }
  let inScope = 0;
  for (const node of parsed.nodes) {
    if (node.inScope !== false) inScope += 1;
  }
  return { name: parsed.name, total: parsed.nodes.length, inScope };
}
