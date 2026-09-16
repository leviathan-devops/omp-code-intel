import path from "node:path";

export interface OmpIntelOptions {
  ast?: boolean;
  hashline?: boolean;
  eval?: { py?: boolean; js?: boolean };
  merkle?: boolean;
  ttsr?: { rules: { key: string; re: string; body: string }[] };
  advisor?: { model?: string };
  shadow?: string[];
  receipts?: boolean;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function loadOptions(raw: Record<string, unknown> | undefined): OmpIntelOptions {
  const out: OmpIntelOptions = {};
  if (raw === undefined) return out;
  if (typeof raw.ast === "boolean") out.ast = raw.ast;
  if (typeof raw.hashline === "boolean") out.hashline = raw.hashline;
  if (typeof raw.merkle === "boolean") out.merkle = raw.merkle;
  if (raw.eval === false) {
    out.eval = { py: false, js: false };
  } else if (isRecord(raw.eval)) {
    const ev: { py?: boolean; js?: boolean } = {};
    if (typeof raw.eval.py === "boolean") ev.py = raw.eval.py;
    if (typeof raw.eval.js === "boolean") ev.js = raw.eval.js;
    if (ev.py !== undefined || ev.js !== undefined) out.eval = ev;
  }
  if (isRecord(raw.ttsr) && Array.isArray(raw.ttsr.rules)) {
    const rules: { key: string; re: string; body: string }[] = [];
    for (const r of raw.ttsr.rules) {
      if (isRecord(r) && typeof r.key === "string" && typeof r.re === "string" && typeof r.body === "string") {
        rules.push({ key: r.key, re: r.re, body: r.body });
      }
    }
    out.ttsr = { rules };
  }
  if (isRecord(raw.advisor)) {
    const adv: { model?: string } = {};
    if (typeof raw.advisor.model === "string") adv.model = raw.advisor.model;
    if (adv.model !== undefined) out.advisor = adv;
  }
  if (raw.receipts === true) out.receipts = true;
  if (Array.isArray(raw.shadow)) {
    const shadow: string[] = [];
    for (const s of raw.shadow) {
      if (typeof s === "string") shadow.push(s);
    }
    out.shadow = shadow;
  }
  return out;
}

export function resolveAbs(ctx: { directory: string }, p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.join(ctx.directory, p);
}

export function toPathList(p?: string): string[] {
  if (p === undefined || p === "") return ["."];
  const parts = p.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
  return parts.length > 0 ? parts : ["."];
}
