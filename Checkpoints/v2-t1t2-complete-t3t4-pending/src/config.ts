import { loadOptions } from "./shim";
import type { OmpIntelOptions } from "./shim";

export { loadOptions };
export type { OmpIntelOptions };

export const DEFAULTS: Required<Pick<OmpIntelOptions, "ast" | "hashline" | "merkle" | "eval">> & {
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
