// ═══ SCOPE BINDING — THE ECOSYSTEM IDENTITY CONTRACT (the boilerplate extraction) ═══
// TRUE SOURCE: Hydra_Wave_Manager/src/tools/wave-scope.ts (177L, 2026-08-28).
//
// THE OPERATOR'S LAW (verbatim, the source :2-7): "hydra should be PROPERLY
// SCOPED to waves spawned by HYDRA wave manager. trident and hydra wave
// managers are 2 separate self contained ecosystems... mutually exclusive one
// does not trigger the other. tool level equivalent of operational agent
// identity".
//
// THE CONCEPT: a tool's operational identity = the wave-id namespace + the
// on-disk state dir + the registry (the DB) + the generate mode. A binding
// REFUSES every id from a foreign namespace — the tools cannot touch each
// other's waves, files, or databases. Cross-ecosystem access is a LOUD
// refusal that NAMES the correct tool.
//
// GENERALIZED for N ecosystems: define the table, get the identity, the
// guards, and the alias-forgery refusal. The registry surface is injected
// (the one method the binding needs: findWaveBySession).

import * as path from 'node:path';

export interface RegistrySurface {
  /** The ONLY registry call the binding makes: which wave (if any) owns this
   *  session. Used for the loud cross-ecosystem refusal with the remedy. */
  findWaveBySession(sessionId: string): { wave: string; agent: string } | null;
}

export interface EcosystemSpec {
  /** The owning ecosystem's id ('trident' | 'hydra' | yours). */
  ecosystem: string;
  /** The on-disk state dir under the project root ('.trident' | '.hydra'). */
  stateDir: string;
  /** The wave-id namespace prefix ('wave-' | 'hy-wave-'). */
  wavePrefix: string;
  /** The generate mode ('sync' | 'async') — carried for the consumer. */
  generateMode: 'sync' | 'async';
  /** Human name for the logs + the refusals ('TRIDENT' | 'HYDRA'). */
  label: string;
  /** The ecosystem's OWN registry — zero shared state. */
  registry: RegistrySurface;
  /** The ecosystem's machine-global scratch dir (prompt files, manifests). */
  tmpDir: string;
}

export interface ScopeBinding extends EcosystemSpec {
  /** The project-root-scoped path join for this ecosystem's state files. */
  statePath(scopeRoot: string, ...parts: string[]): string;
  /** TRUE when the wave id belongs to THIS ecosystem. */
  ownsWave(waveId: string): boolean;
  /** TRUE when the id belongs to a KNOWN FOREIGN ecosystem. */
  isForeignWave(waveId: string): boolean;
  /** LOUD guard: throw unless the id belongs to THIS ecosystem. The refusal
   *  NAMES the correct tool — the operator never has to open the code. */
  assertOwnWave(waveId: string, action: string): void;
  /** LOUD guard for session-scoped actions: the session must belong to a wave
   *  of THIS ecosystem. The sibling registries are consulted READ-ONLY for
   *  the refusal check only; all state operations stay in-ecosystem. */
  assertOwnSession(sessionId: string, action: string): void;
}

/** THE LONGEST-PREFIX MATCH (single source of truth) — the longest registered prefix that is a
 *  prefix of `id`, or undefined when none matches. Used by ownerOf / isForeignWave / assertOwnWave /
 *  assertAliasNamespace so the four can never drift apart again.
 *  ★ F-956 FIX (2026-09-24): the sort-desc + linear-scan idiom was duplicated in 4 places; one site
 *  updated without the others reintroduces the overlap-misattribution class (F-207/F-521/F-709). */
export function findLongestMatchingPrefix(prefixes: Iterable<string>, id: string): string | undefined {
  if (typeof id !== 'string') return undefined;
  return [...prefixes].sort((a, b) => b.length - a.length).find((p) => id.startsWith(p));
}

export class ScopeBindingManager {
  private readonly bindings = new Map<string, ScopeBinding>();
  private readonly prefixes = new Map<string, ScopeBinding>();

  /** Register one ecosystem's identity. Idempotent per ecosystem. The binding
   *  gets a LIVE view of all prefixes (registration order must not matter —
   *  a binding registered before its sibling still recognizes the sibling's
   *  ids as foreign; the source hardcoded 2 constants, N ecosystems need the
   *  live view). */
  register(spec: EcosystemSpec): ScopeBinding {
    const existing = this.bindings.get(spec.ecosystem);
    // ★ F-1206 FIX (2026-09-25): same-ecosystem re-registration with a DIFFERENT prefix
    // ★ used to silently ignore the new prefix (idempotent no-op) — a misconfigured caller
    // ★ would believe the namespace moved while ownerOf/isForeignWave still served the old
    // ★ one. Identical re-registration stays a no-op; a CONFLICTING one is a loud contract
    // ★ error. (No stale map entry ever existed — the early return runs before
    // ★ prefixes.set — so ownerOf's longest-match is untouched by this change.)
    if (existing) {
      if (existing.wavePrefix !== spec.wavePrefix) {
        throw new Error(
          `[SCOPE] ecosystem "${spec.ecosystem}" already registered with wavePrefix "${existing.wavePrefix}" — cannot re-register with "${spec.wavePrefix}". Prefixes are immutable per ecosystem; use a new ecosystem id or restart the manager.`,
        );
      }
      return existing;
    }
    // ★ F-132 FIX (2026-09-24): refuse duplicate wavePrefix from a different ecosystem.
    //   Two ecosystems sharing a prefix silently breaks ownerOf (last-registered wins)
    //   and isForeignWave — the mutual-exclusivity contract depends on unique prefixes.
    const prefixOwner = this.prefixes.get(spec.wavePrefix);
    if (prefixOwner && prefixOwner.ecosystem !== spec.ecosystem) {
      throw new Error(
        `[SCOPE] wavePrefix "${spec.wavePrefix}" is already registered by ecosystem ` +
        `"${prefixOwner.ecosystem}" — cannot register "${spec.ecosystem}" with the same prefix. ` +
        `Each ecosystem MUST have a unique wave namespace.`,
      );
    }
    const binding = new ScopeBindingImpl(spec, () => [...this.prefixes.keys()]);
    this.bindings.set(spec.ecosystem, binding);
    this.prefixes.set(spec.wavePrefix, binding);
    // AUTO-WIRE: every binding sees the OTHERS' registries (live — a binding
    // registered later is visible to the earlier ones too).
    for (const b of this.bindings.values()) {
      const impl = b as ScopeBindingImpl;
      impl.withSiblingsFn(() => {
        const out: Record<string, RegistrySurface> = {};
        for (const [eco, other] of this.bindings.entries()) {
          if (eco !== impl.ecosystem) out[eco] = other.registry;
        }
        return out;
      });
    }
    return binding;
  }

  bindingFor(ecosystem: string): ScopeBinding {
    const b = this.bindings.get(ecosystem);
    if (!b) throw new Error(`[SCOPE] no binding registered for ecosystem "${ecosystem}" — register it at boot.`);
    return b;
  }

  /** The binding that OWNS a wave id — null when the id is nobody's. */
  ownerOf(waveId: string): ScopeBinding | null {
    // ★ F-207 FIX (2026-09-24): LONGEST-prefix match — first-match over
    //   registration order misattributes overlapping namespaces (wave- vs
    //   wave-extra-). F-132 only refused exact duplicates, not overlaps.
    //   ★ F-956: order from the shared helper; the ownsWave re-check keeps F-521 exact.
    const key = findLongestMatchingPrefix(this.prefixes.keys(), waveId);
    if (key === undefined) return null;
    const b = this.prefixes.get(key)!;
    if (b.ownsWave(waveId)) return b;
    return null;
  }
}

class ScopeBindingImpl implements ScopeBinding {
  constructor(
    private readonly spec: EcosystemSpec,
    private readonly allPrefixes: () => string[],
  ) {}
  get ecosystem(): string { return this.spec.ecosystem; }
  get stateDir(): string { return this.spec.stateDir; }
  get wavePrefix(): string { return this.spec.wavePrefix; }
  get generateMode(): 'sync' | 'async' { return this.spec.generateMode; }
  get label(): string { return this.spec.label; }
  get registry(): RegistrySurface { return this.spec.registry; }
  get tmpDir(): string { return this.spec.tmpDir; }

  statePath(scopeRoot: string, ...parts: string[]): string {
    // R16D FIX (2026-09-25, group-d finding :158): no traversal sanitization - `..`
    // segments in parts escaped stateDir (path.join resolves them). Resolve the joined
    // path and refuse LOUD on escape. In-bounds inputs return the exact joined string
    // as before (no behavior change for legitimate callers).
    const joined = path.join(scopeRoot, this.stateDir, ...parts);
    const base = path.resolve(scopeRoot, this.stateDir);
    const resolved = path.resolve(joined);
    if (resolved !== base && !resolved.startsWith(base + path.sep)) {
      throw new Error(
        `[${this.label} SCOPE] statePath: resolved path "${resolved}" escapes the state directory "${base}". Refusing.`,
      );
    }
    return joined;
  }

  ownsWave(waveId: string): boolean {
    // ★ F-521 FIX (2026-09-24): longest-prefix ownership — a bare startsWith returns true for
    //   the WRONG binding when namespaces overlap (wave- vs wave-extra-), so a direct
    //   ownsWave/assertOwnWave caller accepted a foreign wave that ownerOf would not. A longer
    //   registered prefix extending this one that also matches the id wins instead.
    if (typeof waveId !== 'string' || !waveId.startsWith(this.wavePrefix)) return false;
    for (const prefix of this.allPrefixes()) {
      if (prefix.length > this.wavePrefix.length && prefix.startsWith(this.wavePrefix) && waveId.startsWith(prefix)) {
        return false;
      }
    }
    return true;
  }

  isForeignWave(waveId: string): boolean {
    if (typeof waveId !== 'string') return false;
    // ★ F-207 FIX (2026-09-24): longest match (see ownerOf) — first-match returns
    //   the least-specific prefix when namespaces overlap.
    const owner = findLongestMatchingPrefix(this.allPrefixes(), waveId); // ★ F-956: shared helper.
    if (owner === undefined) return false; // not wave-like → not foreign
    return owner !== this.wavePrefix;
  }

  assertOwnWave(waveId: string, action: string): void {
    if (this.ownsWave(waveId)) return;
    const owner = this.isForeignWave(waveId)
      // ★ F-207 FIX (2026-09-24): longest match — the remedy must name the real owner.
      ? findLongestMatchingPrefix(this.allPrefixes(), waveId) // ★ F-956: shared helper.
      : undefined;
    if (owner === undefined) {
      // A bare alias or empty id: refuse with the exact-id remedy.
      throw new Error(
        `[${this.label} SCOPE] "${waveId}" is not a fully-qualified wave id of the ${this.ecosystem} ecosystem ` +
        `(${this.wavePrefix}*). Pass the exact wave id from the generate result.`,
      );
    }
    void owner;
    throw new Error(
      `[${this.label} SCOPE] ${action}: "${waveId}" is a FOREIGN wave — the ${this.label} tool REFUSES cross-ecosystem access. ` +
      `The ecosystems are MUTUALLY EXCLUSIVE. Use the tool whose prefix is "${owner}".`,
    );
  }

  assertOwnSession(sessionId: string, action: string): void {
    const own = this.spec.registry.findWaveBySession(sessionId);
    if (own) return; // the session belongs to THIS ecosystem — proceed.
    // The READ-ONLY sibling check (auto-wired by the manager): is the session
    // a FOREIGN wave's agent? Refuse with the remedy. If no registry knows
    // it, the session is unbound — proceed; the action's own not-found
    // handling applies.
    for (const [eco, surface] of Object.entries(this.siblingsFn ? this.siblingsFn() : {})) {
      const hit = surface.findWaveBySession(sessionId);
      if (hit) {
        throw new Error(
          `[${this.label} SCOPE] ${action}: session ${sessionId} belongs to ${hit.wave} (${hit.agent}) — a ` +
          `${eco.toUpperCase()} wave. The ${this.label} tool REFUSES cross-ecosystem access.`,
        );
      }
    }
    // ★ F-357 FIX (2026-09-24): the unbound session was SILENT — a stale/typo-ed id
    //   sailed through indistinguishable from a bound one in every log. Name it LOUD
    //   and proceed: the refusal point for unknown sessions is the action's own
    //   not-found handling, which names the id again at the point of use.
    //   Silence becomes a named warning; control flow unchanged.
    console.warn(
      `[${this.label} SCOPE] unbound session: ${action} with session ${sessionId} — bound to NO known ecosystem (neither ${this.ecosystem} nor any sibling); proceeding to the action's own not-found handling. A typo'd or stale session id surfaces here first.`,
    );
  }

  private siblingsFn?: () => Record<string, RegistrySurface>;
  /** Wire the sibling registries (read-only, for the refusal remedy only). */
  withSiblings(siblings: Record<string, RegistrySurface>): this {
    this.siblingsFn = () => siblings;
    return this;
  }
  /** Wire a LIVE siblings provider (the manager auto-wires this: every
   *  registered binding sees the others' registries as they join). */
  withSiblingsFn(fn: () => Record<string, RegistrySurface>): this {
    this.siblingsFn = fn;
    return this;
  }
}

/** THE ALIAS-FORGERY GUARD (the winner :167-177): an operator alias that
 *  flows INTO the generated wave id may not forge a foreign namespace prefix
 *  — refused at generate time, before any state is written. */
export function assertAliasNamespace(binding: ScopeBinding, alias: unknown, allPrefixes: string[]): void {
  if (typeof alias !== 'string' || alias.trim().length === 0) return;
  const a = alias.trim();
  // ★ F-709 FIX (2026-09-24): LONGEST-prefix match — consistent with ownerOf /
  //   isForeignWave / assertOwnWave (F-207). Insertion-order iteration fired the
  //   shorter prefix first on overlaps (wave- vs wave-extra-) with the wrong remedy.
  // ★ F-956: shared helper over the FOREIGN prefixes only — the longest foreign match names the remedy.
  const forged = findLongestMatchingPrefix(allPrefixes.filter((p) => p !== binding.wavePrefix), a);
  if (forged !== undefined) {
    throw new Error(
      `[${binding.label} SCOPE] the waveId alias "${a}" forges the foreign namespace (${forged}*). ` +
      `${binding.label} waves are ${binding.wavePrefix}* — drop the foreign prefix from the alias.`,
    );
  }
}
