// RC-4 (W0): bun supports cache-busting query imports (`./x.ts?w3`) to obtain a FRESH module
// instance per test. TypeScript cannot resolve the suffix, so declare the patterns here; the
// imports then type as `any`, which is exactly what a deliberately re-instantiated module is.
declare module "*?w1fd";
declare module "*?w3";
declare module "*?w3chain";
