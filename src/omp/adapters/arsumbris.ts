// adapters/arsumbris — ★ L2 ARSUMBRIS → the KNOWLEDGE rung.
//
// The au daemon's typed repo graph, reached through its live socket. ★ LIVENESS,
// not existence: a stale socket FILE is DOWN (the register's own lesson — "two
// socket FILES sat there dated …" while the daemon was not running).
//
// The au runtime lives in HOME, not the scope root: `~/.arsumbris/au-host/run`.
import * as os from "node:os";
import * as path from "node:path";
import type { ConsumerProbe, LayerFact } from "../layer-registry.ts";
import { probeSocketDir } from "./_shared.ts";

export function arsumbrisProbe(home = process.env.HOME ?? os.homedir()): ConsumerProbe {
  const runDir = path.join(home, ".arsumbris/au-host/run");
  return {
    id: "L2_ARSUMBRIS",
    rung: "knowledge",
    dependency: "the au daemon socket + its typed repo graph",
    errorCode: "GI_LAYER_ARSUMBRIS",
    up: () => probeSocketDir(runDir),
    // ★ THE KNOWLEDGE SURFACE IS THE DAEMON, not a file. This adapter deliberately
    // returns NO facts until a socket client is wired (the au-mcp adapter rail is a
    // SEPARATE deliverable). Reporting zero facts is the HONEST state: the layer is
    // registered, its liveness is measured, and its contribution is not yet claimed.
    facts: (): LayerFact[] => [],
  };
}
