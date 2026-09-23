// signing.ts — G2 signed rows + G3 hash chain.
// Port of the reference's HMAC-SHA256 row signature + prev_hash chaining
// (RSI_ARCHITECTURE_v1.md §1: kernel-only 32-byte key, sig over content).
// D1: the reference is Python; this is the TypeScript translation. The
// canonical field order is FIXED by this module — changing it invalidates
// every existing sig, which verifyChain() reports as a break (not silent).
import { createHmac, timingSafeEqual } from "node:crypto";

export const GENESIS = "GENESIS";

export interface SignableFields {
  entityId: string;
  kind: string;
  label: string;
  evidenceQuote: string;
  confidence: number;
  confirmed: number;
  refuted: number;
  unresolved: number;
  createdRun: string;
  supersededRun: string | null;
  prevHash: string | null;
}

/** Canonical content: fixed field order, `|`-joined. Empty string for NULLs. */
export function canonicalPayload(f: SignableFields): string {
  return [
    f.entityId,
    f.kind,
    f.label,
    f.evidenceQuote,
    String(f.confidence),
    String(f.confirmed),
    String(f.refuted),
    String(f.unresolved),
    f.createdRun,
    f.supersededRun ?? "",
    f.prevHash ?? "",
  ].join("|");
}

export function signPayload(canonical: string, key: Buffer): string {
  return createHmac("sha256", key).update(canonical, "utf8").digest("hex");
}

export function signRecord(f: SignableFields, key: Buffer): string {
  return signPayload(canonicalPayload(f), key);
}

/** Mutation seam (test-only): verify() compares through this hook so the
 *  battery's T8 can remove the signature check in-process and prove the
 *  tests bite. Production code never touches it. */
export const verifyHooks = {
  compare: (a: string, b: string): boolean => {
    const ab = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  },
};

export function verifyRecord(f: SignableFields, sig: string, key: Buffer): boolean {
  if (!sig || typeof sig !== "string") return false;
  const expected = signRecord(f, key);
  return verifyHooks.compare(expected, sig);
}
