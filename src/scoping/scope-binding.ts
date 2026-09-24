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
    if (existing) return existing;
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
    for (const b of this.prefixes.values()) {
      if (b.ownsWave(waveId)) return b;
    }
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
    return path.join(scopeRoot, this.stateDir, ...parts);
  }

  ownsWave(waveId: string): boolean {
    return typeof waveId === 'string' && waveId.startsWith(this.wavePrefix);
  }

  isForeignWave(waveId: string): boolean {
    if (typeof waveId !== 'string') return false;
    const owner = this.allPrefixes().find((p) => waveId.startsWith(p));
    if (owner === undefined) return false; // not wave-like → not foreign
    return owner !== this.wavePrefix;
  }

  assertOwnWave(waveId: string, action: string): void {
    if (this.ownsWave(waveId)) return;
    const owner = this.isForeignWave(waveId)
      ? this.allPrefixes().find((p) => waveId.startsWith(p))
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
  for (const prefix of allPrefixes) {
    if (prefix === binding.wavePrefix) continue;
    if (a.startsWith(prefix)) {
      throw new Error(
        `[${binding.label} SCOPE] the waveId alias "${a}" forges the foreign namespace (${prefix}*). ` +
        `${binding.label} waves are ${binding.wavePrefix}* — drop the foreign prefix from the alias.`,
      );
    }
  }
}
