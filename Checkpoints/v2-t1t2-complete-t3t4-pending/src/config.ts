import { loadOptions } from "./shim";
import type { MimoIntelOptions } from "./shim";

export { loadOptions };
export type { MimoIntelOptions };

export const DEFAULTS: Required<Pick<MimoIntelOptions, "ast" | "hashline" | "merkle" | "eval">> & {
  ttsr: { rules: [] };
  advisor: undefined;
  shadow: [];
} = {
  ast: true,
  hashline: true,
  merkle: true,
  eval: { py: true, js: true },
  ttsr: { rules: [] },
  advisor: undefined,
  shadow: [],
};
