// policy-store — THE RECIPES. D026: data, not code.
//
// THE PRINCIPLE: a threshold is a DECISION, and a decision that lives in source
// code can only be changed by a rebuild. The operator's cost posture is not a
// constant of the kernel — it is a number the operator OWNS and may revise.
// So the recipes live in versioned JSON and a human edits them without
// touching the build.
//
// ★ THE ECONOMICS THIS UNLOCKS: the probability is already stored on every row
//   (§6.4.3 rule 4). Changing a threshold re-BANDS those stored probabilities —
//   it does NOT re-ask the model. Fifty fires can be re-bandied under a revised
//   posture for $0, which is what makes calibration ITERATIVE instead of
//   expensive. `FireGate.reroute()` is the mechanism; this module is the data.
//
// ★ AND A POLICY THAT CANNOT BE LOADED IS LOUD. Putting the numbers in data
//   means the numbers can be wrong in a way code cannot: a missing file,
//   malformed JSON, or a policy whose act bar sits below its flag bar (which
//   would empty the ESCALATE band — the kernel's banding assumes act >= flag).
//   Every one of those THROWS with a name. A malformed policy that silently
//   fell back to the seeds would move the enforcement bar with nobody watching,
//   which is the exact class of silent change this kernel exists to eliminate.
//
// THE FALLBACK THAT IS NOT SILENT: a rule with NO entry in the file falls to
// the class seed in `fire-gate.ts` — that is the documented pre-calibration
// path, and the seed is the CODE's own named object, not a default invented
// here. A missing FILE is a different thing entirely and throws.

import * as fs from "node:fs";
import * as path from "node:path";
import type { Policy } from "./fire-gate.ts";

export class PolicyError extends Error {
  constructor(code: string, detail: string, cause?: unknown) {
    super(`GI_POLICY_${code}: ${detail}${cause instanceof Error ? ` (${cause.message})` : ""}`);
    this.name = "PolicyError";
  }
}

/** The on-disk shape. `version` is the FILE's schema version — bumped when the
 *  shape changes, so a reader can refuse a shape it does not understand. */
export interface PolicyFile {
  version: number;
  /** ruleId → the named policy. A rule absent here falls to its class seed. */
  policies: Record<string, Policy>;
}

/** THE SHIPPED RECIPES — the seeds from `fire-gate.ts` SEED_POLICY, written out
 *  so the file the operator edits is COMPLETE rather than a partial overlay. A
 *  file that omitted a class would make the seed path the common case, and a
 *  common-case fallback is a fallback nobody notices. */
export const DEFAULT_POLICY_FILE: PolicyFile = {
  version: 1,
  policies: {
    "*destructive": { name: "destructive-seed", act: 0.9, flag: 0.5, failPolarity: "closed" },
    "*dumb": { name: "dumb-seed", act: 0.75, flag: 0.35, failPolarity: "open" },
    "*theatrical": { name: "theatrical-seed", act: 0.85, flag: 0.45, failPolarity: "closed" },
  },
};

/** Write a policy file. Atomic (write-temp + rename) so a reader can never see
 *  a half-written recipe — a torn policy file would be a threshold that changed
 *  for no reason anyone can find. */
export function writePolicyFile(filePath: string, file: PolicyFile): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    fs.renameSync(tmp, filePath);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* the temp is already gone; nothing to clean */ }
    throw new PolicyError("WRITE_FAILED", `could not write the policies to ${filePath}`, e);
  }
}

/** Read + parse. Every failure path names itself. */
export function readPolicyFile(filePath: string): PolicyFile {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (e) {
    throw new PolicyError("MISSING", `no policy file at ${filePath} — refusing to substitute the seeds silently`, e);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new PolicyError("MALFORMED", `the policy file at ${filePath} is not valid JSON`, e);
  }
  if (parsed === null || typeof parsed !== "object") {
    throw new PolicyError("MALFORMED", `the policy file at ${filePath} is not an object`);
  }
  const obj = parsed as Partial<PolicyFile>;
  if (typeof obj.version !== "number" || !Number.isFinite(obj.version)) {
    throw new PolicyError("MALFORMED", `the policy file at ${filePath} has no numeric version`);
  }
  if (obj.policies === null || typeof obj.policies !== "object") {
    throw new PolicyError("MALFORMED", `the policy file at ${filePath} has no policies object`);
  }
  return { version: obj.version, policies: obj.policies as Record<string, Policy> };
}

/** ★ Validate every recipe. Called on load — a bad policy must never become
 *  the bar in force. */
export function validatePolicies(file: PolicyFile): void {
  for (const [ruleId, p] of Object.entries(file.policies)) {
    if (p === null || typeof p !== "object") {
      throw new PolicyError("MALFORMED", `the policy for ${ruleId} is not an object`);
    }
    for (const key of ["act", "flag"] as const) {
      const v = p[key];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new PolicyError("MALFORMED", `the policy for ${ruleId} has a non-numeric ${key}`);
      }
      if (v < 0 || v > 1) {
        throw new PolicyError("RANGE", `the policy for ${ruleId} has ${key}=${v}, outside 0..1 — it could never band`);
      }
    }
    if (p.act <= p.flag) {
      // ★ BOTH `act < flag` AND `act == flag` EMPTY THE ESCALATE BAND, and the first
      // version of this check only caught the first — an inconsistency found by the P5
      // red-team corpus (R-2, the K-policy probe). The reason to reject BOTH: ESCALATE
      // is a DOCUMENTED band of this kernel, and a policy that silently makes it
      // unreachable is exactly the silent-configuration class this module exists to
      // prevent ("a malformed policy that silently fell back to the seeds would move the
      // enforcement bar with nobody watching").
      //   act < flag   the two numbers CONTRADICT: the flag claims a higher bar than the
      //                act, and `p >= act` is tested first, so the flag is never consulted.
      //   act == flag  a ZERO-WIDTH band: `p >= act` catches everything `p >= flag` would.
      const kind = p.act < p.flag ? "INVERTED" : "ZERO_WIDTH_BAND";
      const detail = p.act < p.flag
        ? `act=${p.act} sits BELOW flag=${p.flag} — the flag would never be consulted`
        : `act=${p.act} EQUALS flag=${p.flag} — the ESCALATE band has zero width`;
      throw new PolicyError(kind, `the policy for ${ruleId} has ${detail}; ESCALATE would be unreachable`);
    }
    if (p.failPolarity !== "open" && p.failPolarity !== "closed") {
      throw new PolicyError("MALFORMED", `the policy for ${ruleId} has failPolarity='${String(p.failPolarity)}' — must be open|closed`);
    }
    if (typeof p.name !== "string" || p.name.trim() === "") {
      throw new PolicyError("MALFORMED", `the policy for ${ruleId} has no name — a threshold must be able to say what it is called`);
    }
  }
}

/** A LOADED, VALIDATED recipe set. `reload()` is the point of the class: it
 *  re-reads the file and reports whether anything moved, with NO rebuild. */
export class PolicyStore {
  private file: PolicyFile;

  constructor(readonly path: string) {
    this.file = readPolicyFile(path);
    validatePolicies(this.file);
  }

  /** Re-read from disk. Returns whether the recipe set CHANGED — a caller can
   *  use that to decide whether to re-band anything at all. */
  reload(): { changed: boolean; version: number; policies: number } {
    const next = readPolicyFile(this.path);
    validatePolicies(next);
    const changed = JSON.stringify(next) !== JSON.stringify(this.file);
    this.file = next;
    return { changed, version: next.version, policies: Object.keys(next.policies).length };
  }

  /** The policy for a rule, or undefined so the caller falls to its class seed
   *  — the documented pre-calibration path. NOT a silent default from here. */
  get(ruleId: string): Policy | undefined {
    return this.file.policies[ruleId];
  }

  all(): Record<string, Policy> {
    return { ...this.file.policies };
  }

  version(): number {
    return this.file.version;
  }

  /** Validate the CURRENT contents against the rules. Public so a caller can
   *  re-assert after a hand edit without a reload. */
  validate(): void {
    validatePolicies(this.file);
  }
}
