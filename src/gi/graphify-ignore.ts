import fs from "node:fs";
import path from "node:path";

export interface IgnoreRule {
  negated: boolean;
  dirOnly: boolean;
  pattern: string;
}

/** Parse a .graphifyignore file. Blank lines and `#` comments are skipped. */
export function parseGraphifyIgnore(text: string): IgnoreRule[] {
  const rules: IgnoreRule[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
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
    if (body.startsWith("/")) body = body.slice(1);
    if (body.length === 0) continue;
    rules.push({ negated, dirOnly, pattern: body });
  }
  return rules;
}

function ruleMatches(relPath: string, rule: IgnoreRule): boolean {
  const pattern = rule.pattern;
  if (pattern.startsWith("*.")) {
    if (rule.dirOnly) return false;
    const suffix = pattern.slice(1);
    const base = relPath.slice(relPath.lastIndexOf("/") + 1);
    return base.endsWith(suffix);
  }
  if (pattern.includes("/")) {
    const exact = relPath === pattern || relPath.startsWith(`${pattern}/`);
    return exact;
  }
  const directory =
    relPath === pattern ||
    relPath.startsWith(`${pattern}/`) ||
    relPath.includes(`/${pattern}/`) ||
    relPath.endsWith(`/${pattern}`);
  if (rule.dirOnly) return directory;
  return directory || relPath === pattern;
}

/** Last matching rule wins, so a later `!` exception re-includes a path. */
export function isGraphifyIgnored(relPath: string, rules: readonly IgnoreRule[]): boolean {
  const norm = relPath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  let ignored = false;
  for (const rule of rules) {
    if (!ruleMatches(norm, rule)) continue;
    ignored = !rule.negated;
  }
  return ignored;
}

export function loadIgnoreFile(root: string): IgnoreRule[] {
  const file = path.join(root, ".graphifyignore");
  if (!fs.existsSync(file)) return [];
  return parseGraphifyIgnore(fs.readFileSync(file, "utf8"));
}
