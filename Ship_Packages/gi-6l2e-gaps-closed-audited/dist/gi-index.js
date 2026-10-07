// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  if (mod && typeof mod === "object" || typeof mod === "function") {
    for (let key of __getOwnPropNames(mod))
      if (!__hasOwnProp.call(to, key))
        __defProp(to, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true
        });
  }
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __esm = (fn, res, err) => () => {
  if (fn)
    try {
      res = fn(fn = 0);
    } catch (e) {
      err = [e];
    }
  if (err)
    throw err[0];
  return res;
};

// node_modules/zod/v4/core/core.js
function $constructor(name, initializer, params) {
  function init(inst, def) {
    var _a;
    Object.defineProperty(inst, "_zod", {
      value: inst._zod ?? {},
      enumerable: false
    });
    (_a = inst._zod).traits ?? (_a.traits = new Set);
    inst._zod.traits.add(name);
    initializer(inst, def);
    for (const k in _.prototype) {
      if (!(k in inst))
        Object.defineProperty(inst, k, { value: _.prototype[k].bind(inst) });
    }
    inst._zod.constr = _;
    inst._zod.def = def;
  }
  const Parent = params?.Parent ?? Object;

  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a;
    const inst = params?.Parent ? new Definition : this;
    init(inst, def);
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}
var NEVER, $brand, $ZodAsyncError, $ZodEncodeError, globalConfig;
var init_core = __esm(() => {
  NEVER = Object.freeze({
    status: "aborted"
  });
  $brand = Symbol("zod_brand");
  $ZodAsyncError = class $ZodAsyncError extends Error {
    constructor() {
      super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
    }
  };
  $ZodEncodeError = class $ZodEncodeError extends Error {
    constructor(name) {
      super(`Encountered unidirectional transform during encode: ${name}`);
      this.name = "ZodEncodeError";
    }
  };
  globalConfig = {};
});

// node_modules/zod/v4/core/util.js
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function joinValues(array, separator = "|") {
  return array.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  const set = false;
  return {
    get value() {
      if (!set) {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
      throw new Error("cached value already set");
    }
  };
}
function nullish(input) {
  return input === null || input === undefined;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepString = step.toString();
  let stepDecCount = (stepString.split(".")[1] || "").length;
  if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
    const match = stepString.match(/\d?e-(\d?)/);
    if (match?.[1]) {
      stepDecCount = Number.parseInt(match[1]);
    }
  }
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
function defineLazy(object, key, getter) {
  let value = undefined;
  Object.defineProperty(object, key, {
    get() {
      if (value === EVALUATING) {
        return;
      }
      if (value === undefined) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object, key, {
        value: v
      });
    },
    configurable: true
  });
}
function objectClone(obj) {
  return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function esc(str) {
  return JSON.stringify(str);
}
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === undefined)
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  return o;
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== undefined) {
    if (params?.error !== undefined)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function stringifyPrimitive(value) {
  if (typeof value === "bigint")
    return value.toString() + "n";
  if (typeof value === "string")
    return `"${value}"`;
  return `${value}`;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = {};
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        newShape[key] = currDef.shape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = { ...schema._zod.def.shape };
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        delete newShape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error("Object schemas containing refinements cannot be extended. Use `.safeExtend()` instead.");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  const def = {
    ...schema._zod.def,
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    checks: schema._zod.def.checks
  };
  return clone(schema, def);
}
function merge(a, b) {
  const def = mergeDefs(a._zod.def, {
    get shape() {
      const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: []
  });
  return clone(a, def);
}
function partial(Class, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in oldShape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      } else {
        for (const key in oldShape) {
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function required(Class, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      } else {
        for (const key in oldShape) {
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex;i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a;
    (_a = iss).path ?? (_a.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config) {
  const full = { ...iss, path: iss.path ?? [] };
  if (!iss.message) {
    const message = unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
    full.message = message;
  }
  delete full.inst;
  delete full.continue;
  if (!ctx?.reportInput) {
    delete full.input;
  }
  return full;
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
var EVALUATING, captureStackTrace, allowsEval, propertyKeyTypes, primitiveTypes, NUMBER_FORMAT_RANGES;
var init_util = __esm(() => {
  EVALUATING = Symbol("evaluating");
  captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
  allowsEval = cached(() => {
    if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
      return false;
    }
    try {
      const F = Function;
      new F("");
      return true;
    } catch (_) {
      return false;
    }
  });
  propertyKeyTypes = new Set(["string", "number", "symbol"]);
  primitiveTypes = new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
  NUMBER_FORMAT_RANGES = {
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-340282346638528860000000000000000000000, 340282346638528860000000000000000000000],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
  };
});

// node_modules/zod/v4/core/errors.js
function flattenError(error, mapper = (issue) => issue.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error, _mapper) {
  const mapper = _mapper || function(issue) {
    return issue.message;
  };
  const fieldErrors = { _errors: [] };
  const processError = (error) => {
    for (const issue of error.issues) {
      if (issue.code === "invalid_union" && issue.errors.length) {
        issue.errors.map((issues) => processError({ issues }));
      } else if (issue.code === "invalid_key") {
        processError({ issues: issue.issues });
      } else if (issue.code === "invalid_element") {
        processError({ issues: issue.issues });
      } else if (issue.path.length === 0) {
        fieldErrors._errors.push(mapper(issue));
      } else {
        let curr = fieldErrors;
        let i = 0;
        while (i < issue.path.length) {
          const el = issue.path[i];
          const terminal = i === issue.path.length - 1;
          if (!terminal) {
            curr[el] = curr[el] || { _errors: [] };
          } else {
            curr[el] = curr[el] || { _errors: [] };
            curr[el]._errors.push(mapper(issue));
          }
          curr = curr[el];
          i++;
        }
      }
    }
  };
  processError(error);
  return fieldErrors;
}
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
}, $ZodError, $ZodRealError;
var init_errors = __esm(() => {
  init_core();
  init_util();
  $ZodError = $constructor("$ZodError", initializer);
  $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
});

// node_modules/zod/v4/core/parse.js
var _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  if (result.issues.length) {
    const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params?.callee);
    throw e;
  }
  return result.value;
}, _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params?.callee);
    throw e;
  }
  return result.value;
}, _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
}, safeParse, _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
}, safeParseAsync, _encode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parse(_Err)(schema, value, ctx);
}, _decode = (_Err) => (schema, value, _ctx) => {
  return _parse(_Err)(schema, value, _ctx);
}, _encodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parseAsync(_Err)(schema, value, ctx);
}, _decodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _parseAsync(_Err)(schema, value, _ctx);
}, _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
}, _safeDecode = (_Err) => (schema, value, _ctx) => {
  return _safeParse(_Err)(schema, value, _ctx);
}, _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
}, _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _safeParseAsync(_Err)(schema, value, _ctx);
};
var init_parse = __esm(() => {
  init_core();
  init_errors();
  init_util();
  safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
  safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);
});

// node_modules/zod/v4/core/regexes.js
function emoji() {
  return new RegExp(_emoji, "u");
}
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime(args) {
  const time = timeSource({ precision: args.precision });
  const opts = ["Z"];
  if (args.local)
    opts.push("");
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const timeRegex = `${time}(?:${opts.join("|")})`;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
var cuid, cuid2, ulid, xid, ksuid, nanoid, duration, guid, uuid = (version) => {
  if (!version)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
}, email, _emoji = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`, ipv4, ipv6, cidrv4, cidrv6, base64, base64url, hostname, e164, dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`, date, string = (params) => {
  const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
}, integer, number, boolean, lowercase, uppercase;
var init_regexes = __esm(() => {
  cuid = /^[cC][^\s-]{8,}$/;
  cuid2 = /^[0-9a-z]+$/;
  ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
  xid = /^[0-9a-vA-V]{20}$/;
  ksuid = /^[A-Za-z0-9]{27}$/;
  nanoid = /^[a-zA-Z0-9_-]{21}$/;
  duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
  guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
  email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
  ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
  cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
  base64url = /^[A-Za-z0-9_-]*$/;
  hostname = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
  e164 = /^\+(?:[0-9]){6,14}[0-9]$/;
  date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
  integer = /^-?\d+$/;
  number = /^-?\d+(?:\.\d+)?/;
  boolean = /^(?:true|false)$/i;
  lowercase = /^[^A-Z]*$/;
  uppercase = /^[^a-z]*$/;
});

// node_modules/zod/v4/core/checks.js
var $ZodCheck, numericOriginMap, $ZodCheckLessThan, $ZodCheckGreaterThan, $ZodCheckMultipleOf, $ZodCheckNumberFormat, $ZodCheckMaxLength, $ZodCheckMinLength, $ZodCheckLengthEquals, $ZodCheckStringFormat, $ZodCheckRegex, $ZodCheckLowerCase, $ZodCheckUpperCase, $ZodCheckIncludes, $ZodCheckStartsWith, $ZodCheckEndsWith, $ZodCheckOverwrite;
var init_checks = __esm(() => {
  init_core();
  init_regexes();
  init_util();
  $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
    var _a;
    inst._zod ?? (inst._zod = {});
    inst._zod.def = def;
    (_a = inst._zod).onattach ?? (_a.onattach = []);
  });
  numericOriginMap = {
    number: "number",
    bigint: "bigint",
    object: "date"
  };
  $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst) => {
      const bag = inst._zod.bag;
      const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
      if (def.value < curr) {
        if (def.inclusive)
          bag.maximum = def.value;
        else
          bag.exclusiveMaximum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst) => {
      const bag = inst._zod.bag;
      const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
      if (def.value > curr) {
        if (def.inclusive)
          bag.minimum = def.value;
        else
          bag.exclusiveMinimum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst) => {
      var _a;
      (_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
    });
    inst._zod.check = (payload) => {
      if (typeof payload.value !== typeof def.value)
        throw new Error("Cannot mix number and bigint in multiple_of check.");
      const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
      if (isMultiple)
        return;
      payload.issues.push({
        origin: typeof payload.value,
        code: "not_multiple_of",
        divisor: def.value,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
    $ZodCheck.init(inst, def);
    def.format = def.format || "float64";
    const isInt = def.format?.includes("int");
    const origin = isInt ? "int" : "number";
    const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
    inst._zod.onattach.push((inst) => {
      const bag = inst._zod.bag;
      bag.format = def.format;
      bag.minimum = minimum;
      bag.maximum = maximum;
      if (isInt)
        bag.pattern = integer;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      if (isInt) {
        if (!Number.isInteger(input)) {
          payload.issues.push({
            expected: origin,
            format: def.format,
            code: "invalid_type",
            continue: false,
            input,
            inst
          });
          return;
        }
        if (!Number.isSafeInteger(input)) {
          if (input > 0) {
            payload.issues.push({
              input,
              code: "too_big",
              maximum: Number.MAX_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              continue: !def.abort
            });
          } else {
            payload.issues.push({
              input,
              code: "too_small",
              minimum: Number.MIN_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              continue: !def.abort
            });
          }
          return;
        }
      }
      if (input < minimum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_small",
          minimum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
      if (input > maximum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_big",
          maximum,
          inst
        });
      }
    };
  });
  $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== undefined;
    });
    inst._zod.onattach.push((inst) => {
      const curr = inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
      if (def.maximum < curr)
        inst._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length <= def.maximum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: def.maximum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== undefined;
    });
    inst._zod.onattach.push((inst) => {
      const curr = inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
      if (def.minimum > curr)
        inst._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length >= def.minimum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: def.minimum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== undefined;
    });
    inst._zod.onattach.push((inst) => {
      const bag = inst._zod.bag;
      bag.minimum = def.length;
      bag.maximum = def.length;
      bag.length = def.length;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length === def.length)
        return;
      const origin = getLengthableOrigin(input);
      const tooBig = length > def.length;
      payload.issues.push({
        origin,
        ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
        inclusive: true,
        exact: true,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
    var _a, _b;
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst) => {
      const bag = inst._zod.bag;
      bag.format = def.format;
      if (def.pattern) {
        bag.patterns ?? (bag.patterns = new Set);
        bag.patterns.add(def.pattern);
      }
    });
    if (def.pattern)
      (_a = inst._zod).check ?? (_a.check = (payload) => {
        def.pattern.lastIndex = 0;
        if (def.pattern.test(payload.value))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: def.format,
          input: payload.value,
          ...def.pattern ? { pattern: def.pattern.toString() } : {},
          inst,
          continue: !def.abort
        });
      });
    else
      (_b = inst._zod).check ?? (_b.check = () => {});
  });
  $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "regex",
        input: payload.value,
        pattern: def.pattern.toString(),
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
    def.pattern ?? (def.pattern = lowercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
    def.pattern ?? (def.pattern = uppercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
    $ZodCheck.init(inst, def);
    const escapedRegex = escapeRegex(def.includes);
    const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
    def.pattern = pattern;
    inst._zod.onattach.push((inst) => {
      const bag = inst._zod.bag;
      bag.patterns ?? (bag.patterns = new Set);
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.includes(def.includes, def.position))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "includes",
        includes: def.includes,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst) => {
      const bag = inst._zod.bag;
      bag.patterns ?? (bag.patterns = new Set);
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.startsWith(def.prefix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "starts_with",
        prefix: def.prefix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst) => {
      const bag = inst._zod.bag;
      bag.patterns ?? (bag.patterns = new Set);
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.endsWith(def.suffix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "ends_with",
        suffix: def.suffix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      payload.value = def.tx(payload.value);
    };
  });
});

// node_modules/zod/v4/core/doc.js
class Doc {
  constructor(args = []) {
    this.content = [];
    this.indent = 0;
    if (this)
      this.args = args;
  }
  indented(fn) {
    this.indent += 1;
    fn(this);
    this.indent -= 1;
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content = arg;
    const lines = content.split(`
`).filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    const F = Function;
    const args = this?.args;
    const content = this?.content ?? [``];
    const lines = [...content.map((x) => `  ${x}`)];
    return new F(...args, lines.join(`
`));
  }
}

// node_modules/zod/v4/core/versions.js
var version;
var init_versions = __esm(() => {
  version = {
    major: 4,
    minor: 1,
    patch: 8
  };
});

// node_modules/zod/v4/core/schemas.js
function isValidBase64(data) {
  if (data === "")
    return true;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
function isValidBase64URL(data) {
  if (!base64url.test(data))
    return false;
  const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return isValidBase64(padded);
}
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
function handlePropertyResult(result, final, key, input) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (result.value === undefined) {
    if (key in input) {
      final.value[key] = undefined;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  for (const k of keys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  for (const key of Object.keys(input)) {
    if (keySet.has(key))
      continue;
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r) => handlePropertyResult(r, payload, key, input)));
    } else {
      handlePropertyResult(r, payload, key, input);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  if (left.issues.length) {
    result.issues.push(...left.issues);
  }
  if (right.issues.length) {
    result.issues.push(...right.issues);
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ` + `${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
function handleTupleResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
function handleOptionalResult(result, input) {
  if (result.issues.length && input === undefined) {
    return { issues: [], value: undefined };
  }
  return result;
}
function handleDefaultResult(payload, def) {
  if (payload.value === undefined) {
    payload.value = def.defaultValue;
  }
  return payload;
}
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === undefined) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues }, ctx);
}
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      path: [...inst._zod.def.path ?? []],
      continue: !inst._zod.def.abort
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}
var $ZodType, $ZodString, $ZodStringFormat, $ZodGUID, $ZodUUID, $ZodEmail, $ZodURL, $ZodEmoji, $ZodNanoID, $ZodCUID, $ZodCUID2, $ZodULID, $ZodXID, $ZodKSUID, $ZodISODateTime, $ZodISODate, $ZodISOTime, $ZodISODuration, $ZodIPv4, $ZodIPv6, $ZodCIDRv4, $ZodCIDRv6, $ZodBase64, $ZodBase64URL, $ZodE164, $ZodJWT, $ZodNumber, $ZodNumberFormat, $ZodBoolean, $ZodAny, $ZodUnknown, $ZodNever, $ZodArray, $ZodObject, $ZodObjectJIT, $ZodUnion, $ZodIntersection, $ZodTuple, $ZodRecord, $ZodEnum, $ZodLiteral, $ZodTransform, $ZodOptional, $ZodNullable, $ZodDefault, $ZodPrefault, $ZodNonOptional, $ZodCatch, $ZodPipe, $ZodReadonly, $ZodCustom;
var init_schemas = __esm(() => {
  init_checks();
  init_core();
  init_parse();
  init_regexes();
  init_util();
  init_versions();
  init_util();
  $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
    var _a;
    inst ?? (inst = {});
    inst._zod.def = def;
    inst._zod.bag = inst._zod.bag || {};
    inst._zod.version = version;
    const checks = [...inst._zod.def.checks ?? []];
    if (inst._zod.traits.has("$ZodCheck")) {
      checks.unshift(inst);
    }
    for (const ch of checks) {
      for (const fn of ch._zod.onattach) {
        fn(inst);
      }
    }
    if (checks.length === 0) {
      (_a = inst._zod).deferred ?? (_a.deferred = []);
      inst._zod.deferred?.push(() => {
        inst._zod.run = inst._zod.parse;
      });
    } else {
      const runChecks = (payload, checks, ctx) => {
        let isAborted = aborted(payload);
        let asyncResult;
        for (const ch of checks) {
          if (ch._zod.def.when) {
            const shouldRun = ch._zod.def.when(payload);
            if (!shouldRun)
              continue;
          } else if (isAborted) {
            continue;
          }
          const currLen = payload.issues.length;
          const _ = ch._zod.check(payload);
          if (_ instanceof Promise && ctx?.async === false) {
            throw new $ZodAsyncError;
          }
          if (asyncResult || _ instanceof Promise) {
            asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
              await _;
              const nextLen = payload.issues.length;
              if (nextLen === currLen)
                return;
              if (!isAborted)
                isAborted = aborted(payload, currLen);
            });
          } else {
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              continue;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          }
        }
        if (asyncResult) {
          return asyncResult.then(() => {
            return payload;
          });
        }
        return payload;
      };
      const handleCanaryResult = (canary, payload, ctx) => {
        if (aborted(canary)) {
          canary.aborted = true;
          return canary;
        }
        const checkResult = runChecks(payload, checks, ctx);
        if (checkResult instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError;
          return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
        }
        return inst._zod.parse(checkResult, ctx);
      };
      inst._zod.run = (payload, ctx) => {
        if (ctx.skipChecks) {
          return inst._zod.parse(payload, ctx);
        }
        if (ctx.direction === "backward") {
          const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
          if (canary instanceof Promise) {
            return canary.then((canary) => {
              return handleCanaryResult(canary, payload, ctx);
            });
          }
          return handleCanaryResult(canary, payload, ctx);
        }
        const result = inst._zod.parse(payload, ctx);
        if (result instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError;
          return result.then((result) => runChecks(result, checks, ctx));
        }
        return runChecks(result, checks, ctx);
      };
    }
    inst["~standard"] = {
      validate: (value) => {
        try {
          const r = safeParse(inst, value);
          return r.success ? { value: r.data } : { issues: r.error?.issues };
        } catch (_) {
          return safeParseAsync(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
        }
      },
      vendor: "zod",
      version: 1
    };
  });
  $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string(inst._zod.bag);
    inst._zod.parse = (payload, _) => {
      if (def.coerce)
        try {
          payload.value = String(payload.value);
        } catch (_) {}
      if (typeof payload.value === "string")
        return payload;
      payload.issues.push({
        expected: "string",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    $ZodString.init(inst, def);
  });
  $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
    def.pattern ?? (def.pattern = guid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
    if (def.version) {
      const versionMap = {
        v1: 1,
        v2: 2,
        v3: 3,
        v4: 4,
        v5: 5,
        v6: 6,
        v7: 7,
        v8: 8
      };
      const v = versionMap[def.version];
      if (v === undefined)
        throw new Error(`Invalid UUID version: "${def.version}"`);
      def.pattern ?? (def.pattern = uuid(v));
    } else
      def.pattern ?? (def.pattern = uuid());
    $ZodStringFormat.init(inst, def);
  });
  $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
    def.pattern ?? (def.pattern = email);
    $ZodStringFormat.init(inst, def);
  });
  $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      try {
        const trimmed = payload.value.trim();
        const url = new URL(trimmed);
        if (def.hostname) {
          def.hostname.lastIndex = 0;
          if (!def.hostname.test(url.hostname)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid hostname",
              pattern: hostname.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (def.protocol) {
          def.protocol.lastIndex = 0;
          if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid protocol",
              pattern: def.protocol.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (def.normalize) {
          payload.value = url.href;
        } else {
          payload.value = trimmed;
        }
        return;
      } catch (_) {
        payload.issues.push({
          code: "invalid_format",
          format: "url",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
    def.pattern ?? (def.pattern = emoji());
    $ZodStringFormat.init(inst, def);
  });
  $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
    def.pattern ?? (def.pattern = nanoid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
    def.pattern ?? (def.pattern = cuid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
    def.pattern ?? (def.pattern = cuid2);
    $ZodStringFormat.init(inst, def);
  });
  $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
    def.pattern ?? (def.pattern = ulid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
    def.pattern ?? (def.pattern = xid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
    def.pattern ?? (def.pattern = ksuid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
    def.pattern ?? (def.pattern = datetime(def));
    $ZodStringFormat.init(inst, def);
  });
  $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
    def.pattern ?? (def.pattern = date);
    $ZodStringFormat.init(inst, def);
  });
  $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
    def.pattern ?? (def.pattern = time(def));
    $ZodStringFormat.init(inst, def);
  });
  $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
    def.pattern ?? (def.pattern = duration);
    $ZodStringFormat.init(inst, def);
  });
  $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
    def.pattern ?? (def.pattern = ipv4);
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst) => {
      const bag = inst._zod.bag;
      bag.format = `ipv4`;
    });
  });
  $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
    def.pattern ?? (def.pattern = ipv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst) => {
      const bag = inst._zod.bag;
      bag.format = `ipv6`;
    });
    inst._zod.check = (payload) => {
      try {
        new URL(`http://[${payload.value}]`);
      } catch {
        payload.issues.push({
          code: "invalid_format",
          format: "ipv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv4);
    $ZodStringFormat.init(inst, def);
  });
  $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      const parts = payload.value.split("/");
      try {
        if (parts.length !== 2)
          throw new Error;
        const [address, prefix] = parts;
        if (!prefix)
          throw new Error;
        const prefixNum = Number(prefix);
        if (`${prefixNum}` !== prefix)
          throw new Error;
        if (prefixNum < 0 || prefixNum > 128)
          throw new Error;
        new URL(`http://[${address}]`);
      } catch {
        payload.issues.push({
          code: "invalid_format",
          format: "cidrv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
    def.pattern ?? (def.pattern = base64);
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst) => {
      inst._zod.bag.contentEncoding = "base64";
    });
    inst._zod.check = (payload) => {
      if (isValidBase64(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
    def.pattern ?? (def.pattern = base64url);
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst) => {
      inst._zod.bag.contentEncoding = "base64url";
    });
    inst._zod.check = (payload) => {
      if (isValidBase64URL(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
    def.pattern ?? (def.pattern = e164);
    $ZodStringFormat.init(inst, def);
  });
  $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidJWT(payload.value, def.alg))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "jwt",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = inst._zod.bag.pattern ?? number;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Number(payload.value);
        } catch (_) {}
      const input = payload.value;
      if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
        return payload;
      }
      const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : undefined : undefined;
      payload.issues.push({
        expected: "number",
        code: "invalid_type",
        input,
        inst,
        ...received ? { received } : {}
      });
      return payload;
    };
  });
  $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
    $ZodCheckNumberFormat.init(inst, def);
    $ZodNumber.init(inst, def);
  });
  $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = boolean;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Boolean(payload.value);
        } catch (_) {}
      const input = payload.value;
      if (typeof input === "boolean")
        return payload;
      payload.issues.push({
        expected: "boolean",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      payload.issues.push({
        expected: "never",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          expected: "array",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = Array(input.length);
      const proms = [];
      for (let i = 0;i < input.length; i++) {
        const item = input[i];
        const result = def.element._zod.run({
          value: item,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result) => handleArrayResult(result, payload, i)));
        } else {
          handleArrayResult(result, payload, i);
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
    $ZodType.init(inst, def);
    const _normalized = cached(() => normalizeDef(def));
    defineLazy(inst._zod, "propValues", () => {
      const shape = def.shape;
      const propValues = {};
      for (const key in shape) {
        const field = shape[key]._zod;
        if (field.values) {
          propValues[key] ?? (propValues[key] = new Set);
          for (const v of field.values)
            propValues[key].add(v);
        }
      }
      return propValues;
    });
    const isObject2 = isObject;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject2(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = {};
      const proms = [];
      const shape = value.shape;
      for (const key of value.keys) {
        const el = shape[key];
        const r = el._zod.run({ value: input[key], issues: [] }, ctx);
        if (r instanceof Promise) {
          proms.push(r.then((r) => handlePropertyResult(r, payload, key, input)));
        } else {
          handlePropertyResult(r, payload, key, input);
        }
      }
      if (!catchall) {
        return proms.length ? Promise.all(proms).then(() => payload) : payload;
      }
      return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
    };
  });
  $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
    $ZodObject.init(inst, def);
    const superParse = inst._zod.parse;
    const _normalized = cached(() => normalizeDef(def));
    const generateFastpass = (shape) => {
      const doc = new Doc(["shape", "payload", "ctx"]);
      const normalized = _normalized.value;
      const parseStr = (key) => {
        const k = esc(key);
        return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
      };
      doc.write(`const input = payload.value;`);
      const ids = Object.create(null);
      let counter = 0;
      for (const key of normalized.keys) {
        ids[key] = `key_${counter++}`;
      }
      doc.write(`const newResult = {};`);
      for (const key of normalized.keys) {
        const id = ids[key];
        const k = esc(key);
        doc.write(`const ${id} = ${parseStr(key)};`);
        doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      }
      doc.write(`payload.value = newResult;`);
      doc.write(`return payload;`);
      const fn = doc.compile();
      return (payload, ctx) => fn(shape, payload, ctx);
    };
    let fastpass;
    const isObject2 = isObject;
    const jit = !globalConfig.jitless;
    const allowsEval2 = allowsEval;
    const fastEnabled = jit && allowsEval2.value;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject2(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
        if (!fastpass)
          fastpass = generateFastpass(def.shape);
        payload = fastpass(payload, ctx);
        if (!catchall)
          return payload;
        return handleCatchall([], input, payload, ctx, value, inst);
      }
      return superParse(payload, ctx);
    };
  });
  $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : undefined);
    defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : undefined);
    defineLazy(inst._zod, "values", () => {
      if (def.options.every((o) => o._zod.values)) {
        return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
      }
      return;
    });
    defineLazy(inst._zod, "pattern", () => {
      if (def.options.every((o) => o._zod.pattern)) {
        const patterns = def.options.map((o) => o._zod.pattern);
        return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
      }
      return;
    });
    const single = def.options.length === 1;
    const first = def.options[0]._zod.run;
    inst._zod.parse = (payload, ctx) => {
      if (single) {
        return first(payload, ctx);
      }
      let async = false;
      const results = [];
      for (const option of def.options) {
        const result = option._zod.run({
          value: payload.value,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          results.push(result);
          async = true;
        } else {
          if (result.issues.length === 0)
            return result;
          results.push(result);
        }
      }
      if (!async)
        return handleUnionResults(results, payload, inst, ctx);
      return Promise.all(results).then((results) => {
        return handleUnionResults(results, payload, inst, ctx);
      });
    };
  });
  $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      const left = def.left._zod.run({ value: input, issues: [] }, ctx);
      const right = def.right._zod.run({ value: input, issues: [] }, ctx);
      const async = left instanceof Promise || right instanceof Promise;
      if (async) {
        return Promise.all([left, right]).then(([left, right]) => {
          return handleIntersectionResults(payload, left, right);
        });
      }
      return handleIntersectionResults(payload, left, right);
    };
  });
  $ZodTuple = /* @__PURE__ */ $constructor("$ZodTuple", (inst, def) => {
    $ZodType.init(inst, def);
    const items = def.items;
    const optStart = items.length - [...items].reverse().findIndex((item) => item._zod.optin !== "optional");
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          input,
          inst,
          expected: "tuple",
          code: "invalid_type"
        });
        return payload;
      }
      payload.value = [];
      const proms = [];
      if (!def.rest) {
        const tooBig = input.length > items.length;
        const tooSmall = input.length < optStart - 1;
        if (tooBig || tooSmall) {
          payload.issues.push({
            ...tooBig ? { code: "too_big", maximum: items.length } : { code: "too_small", minimum: items.length },
            input,
            inst,
            origin: "array"
          });
          return payload;
        }
      }
      let i = -1;
      for (const item of items) {
        i++;
        if (i >= input.length) {
          if (i >= optStart)
            continue;
        }
        const result = item._zod.run({
          value: input[i],
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result) => handleTupleResult(result, payload, i)));
        } else {
          handleTupleResult(result, payload, i);
        }
      }
      if (def.rest) {
        const rest = input.slice(items.length);
        for (const el of rest) {
          i++;
          const result = def.rest._zod.run({
            value: el,
            issues: []
          }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result) => handleTupleResult(result, payload, i)));
          } else {
            handleTupleResult(result, payload, i);
          }
        }
      }
      if (proms.length)
        return Promise.all(proms).then(() => payload);
      return payload;
    };
  });
  $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!isPlainObject(input)) {
        payload.issues.push({
          expected: "record",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      const proms = [];
      if (def.keyType._zod.values) {
        const values = def.keyType._zod.values;
        payload.value = {};
        for (const key of values) {
          if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
            const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
            if (result instanceof Promise) {
              proms.push(result.then((result) => {
                if (result.issues.length) {
                  payload.issues.push(...prefixIssues(key, result.issues));
                }
                payload.value[key] = result.value;
              }));
            } else {
              if (result.issues.length) {
                payload.issues.push(...prefixIssues(key, result.issues));
              }
              payload.value[key] = result.value;
            }
          }
        }
        let unrecognized;
        for (const key in input) {
          if (!values.has(key)) {
            unrecognized = unrecognized ?? [];
            unrecognized.push(key);
          }
        }
        if (unrecognized && unrecognized.length > 0) {
          payload.issues.push({
            code: "unrecognized_keys",
            input,
            inst,
            keys: unrecognized
          });
        }
      } else {
        payload.value = {};
        for (const key of Reflect.ownKeys(input)) {
          if (key === "__proto__")
            continue;
          const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
          if (keyResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (keyResult.issues.length) {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
              input: key,
              path: [key],
              inst
            });
            payload.value[keyResult.value] = keyResult.value;
            continue;
          }
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result) => {
              if (result.issues.length) {
                payload.issues.push(...prefixIssues(key, result.issues));
              }
              payload.value[keyResult.value] = result.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[keyResult.value] = result.value;
          }
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
    $ZodType.init(inst, def);
    const values = getEnumValues(def.entries);
    const valuesSet = new Set(values);
    inst._zod.values = valuesSet;
    inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (valuesSet.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values,
        input,
        inst
      });
      return payload;
    };
  });
  $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    if (def.values.length === 0) {
      throw new Error("Cannot create literal schema with no valid values");
    }
    inst._zod.values = new Set(def.values);
    inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (inst._zod.values.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values: def.values,
        input,
        inst
      });
      return payload;
    };
  });
  $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      const _out = def.transform(payload.value, payload);
      if (ctx.async) {
        const output = _out instanceof Promise ? _out : Promise.resolve(_out);
        return output.then((output) => {
          payload.value = output;
          return payload;
        });
      }
      if (_out instanceof Promise) {
        throw new $ZodAsyncError;
      }
      payload.value = _out;
      return payload;
    };
  });
  $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    inst._zod.optout = "optional";
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? new Set([...def.innerType._zod.values, undefined]) : undefined;
    });
    defineLazy(inst._zod, "pattern", () => {
      const pattern = def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
      if (def.innerType._zod.optin === "optional") {
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise)
          return result.then((r) => handleOptionalResult(r, payload.value));
        return handleOptionalResult(result, payload.value);
      }
      if (payload.value === undefined) {
        return payload;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "pattern", () => {
      const pattern = def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : undefined;
    });
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? new Set([...def.innerType._zod.values, null]) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === null)
        return payload;
      return def.innerType._zod.run(payload, ctx);
    };
  });
  $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === undefined) {
        payload.value = def.defaultValue;
        return payload;
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result) => handleDefaultResult(result, def));
      }
      return handleDefaultResult(result, def);
    };
  });
  $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === undefined) {
        payload.value = def.defaultValue;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => {
      const v = def.innerType._zod.values;
      return v ? new Set([...v].filter((x) => x !== undefined)) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result) => handleNonOptionalResult(result, inst));
      }
      return handleNonOptionalResult(result, inst);
    };
  });
  $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result) => {
          payload.value = result.value;
          if (result.issues.length) {
            payload.value = def.catchValue({
              ...payload,
              error: {
                issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
              },
              input: payload.value
            });
            payload.issues = [];
          }
          return payload;
        });
      }
      payload.value = result.value;
      if (result.issues.length) {
        payload.value = def.catchValue({
          ...payload,
          error: {
            issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
          },
          input: payload.value
        });
        payload.issues = [];
      }
      return payload;
    };
  });
  $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => def.in._zod.values);
    defineLazy(inst._zod, "optin", () => def.in._zod.optin);
    defineLazy(inst._zod, "optout", () => def.out._zod.optout);
    defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        const right = def.out._zod.run(payload, ctx);
        if (right instanceof Promise) {
          return right.then((right) => handlePipeResult(right, def.in, ctx));
        }
        return handlePipeResult(right, def.in, ctx);
      }
      const left = def.in._zod.run(payload, ctx);
      if (left instanceof Promise) {
        return left.then((left) => handlePipeResult(left, def.out, ctx));
      }
      return handlePipeResult(left, def.out, ctx);
    };
  });
  $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then(handleReadonlyResult);
      }
      return handleReadonlyResult(result);
    };
  });
  $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
    $ZodCheck.init(inst, def);
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _) => {
      return payload;
    };
    inst._zod.check = (payload) => {
      const input = payload.value;
      const r = def.fn(input);
      if (r instanceof Promise) {
        return r.then((r) => handleRefineResult(r, payload, input, inst));
      }
      handleRefineResult(r, payload, input, inst);
      return;
    };
  });
});

// node_modules/zod/v4/locales/en.js
function en_default() {
  return {
    localeError: error()
  };
}
var parsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "NaN" : "number";
    }
    case "object": {
      if (Array.isArray(data)) {
        return "array";
      }
      if (data === null) {
        return "null";
      }
      if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
        return data.constructor.name;
      }
    }
  }
  return t;
}, error = () => {
  const Sizable = {
    string: { unit: "characters", verb: "to have" },
    file: { unit: "bytes", verb: "to have" },
    array: { unit: "items", verb: "to have" },
    set: { unit: "items", verb: "to have" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const Nouns = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue) => {
    switch (issue.code) {
      case "invalid_type":
        return `Invalid input: expected ${issue.expected}, received ${parsedType(issue.input)}`;
      case "invalid_value":
        if (issue.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue.values[0])}`;
        return `Invalid option: expected one of ${joinValues(issue.values, "|")}`;
      case "too_big": {
        const adj = issue.inclusive ? "<=" : "<";
        const sizing = getSizing(issue.origin);
        if (sizing)
          return `Too big: expected ${issue.origin ?? "value"} to have ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `Too big: expected ${issue.origin ?? "value"} to be ${adj}${issue.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue.inclusive ? ">=" : ">";
        const sizing = getSizing(issue.origin);
        if (sizing) {
          return `Too small: expected ${issue.origin} to have ${adj}${issue.minimum.toString()} ${sizing.unit}`;
        }
        return `Too small: expected ${issue.origin} to be ${adj}${issue.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue;
        if (_issue.format === "starts_with") {
          return `Invalid string: must start with "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Invalid string: must end with "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Invalid string: must include "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Invalid string: must match pattern ${_issue.pattern}`;
        return `Invalid ${Nouns[_issue.format] ?? issue.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${issue.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${issue.keys.length > 1 ? "s" : ""}: ${joinValues(issue.keys, ", ")}`;
      case "invalid_key":
        return `Invalid key in ${issue.origin}`;
      case "invalid_union":
        return "Invalid input";
      case "invalid_element":
        return `Invalid value in ${issue.origin}`;
      default:
        return `Invalid input`;
    }
  };
};
var init_en = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/index.js
var init_locales = () => {};

// node_modules/zod/v4/core/registries.js
class $ZodRegistry {
  constructor() {
    this._map = new WeakMap;
    this._idmap = new Map;
  }
  add(schema, ..._meta) {
    const meta = _meta[0];
    this._map.set(schema, meta);
    if (meta && typeof meta === "object" && "id" in meta) {
      if (this._idmap.has(meta.id)) {
        throw new Error(`ID ${meta.id} already exists in the registry`);
      }
      this._idmap.set(meta.id, schema);
    }
    return this;
  }
  clear() {
    this._map = new WeakMap;
    this._idmap = new Map;
    return this;
  }
  remove(schema) {
    const meta = this._map.get(schema);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.delete(meta.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...this.get(p) ?? {} };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema) };
      return Object.keys(f).length ? f : undefined;
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
}
function registry() {
  return new $ZodRegistry;
}
var $output, $input, globalRegistry;
var init_registries = __esm(() => {
  $output = Symbol("ZodOutput");
  $input = Symbol("ZodInput");
  globalRegistry = /* @__PURE__ */ registry();
});

// node_modules/zod/v4/core/api.js
function _string(Class, params) {
  return new Class({
    type: "string",
    ...normalizeParams(params)
  });
}
function _email(Class, params) {
  return new Class({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _guid(Class, params) {
  return new Class({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuid(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuidv4(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
function _uuidv6(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
function _uuidv7(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
function _url(Class, params) {
  return new Class({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _emoji2(Class, params) {
  return new Class({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _nanoid(Class, params) {
  return new Class({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid(Class, params) {
  return new Class({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid2(Class, params) {
  return new Class({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ulid(Class, params) {
  return new Class({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _xid(Class, params) {
  return new Class({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ksuid(Class, params) {
  return new Class({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv4(Class, params) {
  return new Class({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv6(Class, params) {
  return new Class({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv4(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv6(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64(Class, params) {
  return new Class({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64url(Class, params) {
  return new Class({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _e164(Class, params) {
  return new Class({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _jwt(Class, params) {
  return new Class({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _isoDateTime(Class, params) {
  return new Class({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDate(Class, params) {
  return new Class({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _isoTime(Class, params) {
  return new Class({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDuration(Class, params) {
  return new Class({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _number(Class, params) {
  return new Class({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
function _int(Class, params) {
  return new Class({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
function _boolean(Class, params) {
  return new Class({
    type: "boolean",
    ...normalizeParams(params)
  });
}
function _any(Class) {
  return new Class({
    type: "any"
  });
}
function _unknown(Class) {
  return new Class({
    type: "unknown"
  });
}
function _never(Class, params) {
  return new Class({
    type: "never",
    ...normalizeParams(params)
  });
}
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
function _normalize(form) {
  return _overwrite((input) => input.normalize(form));
}
function _trim() {
  return _overwrite((input) => input.trim());
}
function _toLowerCase() {
  return _overwrite((input) => input.toLowerCase());
}
function _toUpperCase() {
  return _overwrite((input) => input.toUpperCase());
}
function _array(Class, element, params) {
  return new Class({
    type: "array",
    element,
    ...normalizeParams(params)
  });
}
function _refine(Class, fn, _params) {
  const schema = new Class({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
function _superRefine(fn) {
  const ch = _check((payload) => {
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(issue(issue2, payload.value, ch._zod.def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  });
  return ch;
}
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
var init_api = __esm(() => {
  init_checks();
  init_util();
});

// node_modules/zod/v4/core/to-json-schema.js
var init_to_json_schema = () => {};

// node_modules/zod/v4/core/json-schema.js
var init_json_schema = () => {};

// node_modules/zod/v4/core/index.js
var init_core2 = __esm(() => {
  init_util();
  init_regexes();
  init_locales();
  init_json_schema();
  init_core();
  init_parse();
  init_errors();
  init_schemas();
  init_checks();
  init_versions();
  init_registries();
  init_api();
  init_to_json_schema();
});

// node_modules/zod/v4/classic/checks.js
var init_checks2 = __esm(() => {
  init_core2();
});

// node_modules/zod/v4/classic/iso.js
function datetime2(params) {
  return _isoDateTime(ZodISODateTime, params);
}
function date2(params) {
  return _isoDate(ZodISODate, params);
}
function time2(params) {
  return _isoTime(ZodISOTime, params);
}
function duration2(params) {
  return _isoDuration(ZodISODuration, params);
}
var ZodISODateTime, ZodISODate, ZodISOTime, ZodISODuration;
var init_iso = __esm(() => {
  init_core2();
  init_schemas2();
  ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
    $ZodISODateTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
    $ZodISODate.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
    $ZodISOTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
    $ZodISODuration.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
});

// node_modules/zod/v4/classic/errors.js
var initializer2 = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  Object.defineProperties(inst, {
    format: {
      value: (mapper) => formatError(inst, mapper)
    },
    flatten: {
      value: (mapper) => flattenError(inst, mapper)
    },
    addIssue: {
      value: (issue) => {
        inst.issues.push(issue);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
    },
    addIssues: {
      value: (issues) => {
        inst.issues.push(...issues);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
    },
    isEmpty: {
      get() {
        return inst.issues.length === 0;
      }
    }
  });
}, ZodError, ZodRealError;
var init_errors2 = __esm(() => {
  init_core2();
  init_core2();
  init_util();
  ZodError = $constructor("ZodError", initializer2);
  ZodRealError = $constructor("ZodError", initializer2, {
    Parent: Error
  });
});

// node_modules/zod/v4/classic/parse.js
var parse3, parseAsync2, safeParse2, safeParseAsync2, encode, decode, encodeAsync, decodeAsync, safeEncode, safeDecode, safeEncodeAsync, safeDecodeAsync;
var init_parse2 = __esm(() => {
  init_core2();
  init_errors2();
  parse3 = /* @__PURE__ */ _parse(ZodRealError);
  parseAsync2 = /* @__PURE__ */ _parseAsync(ZodRealError);
  safeParse2 = /* @__PURE__ */ _safeParse(ZodRealError);
  safeParseAsync2 = /* @__PURE__ */ _safeParseAsync(ZodRealError);
  encode = /* @__PURE__ */ _encode(ZodRealError);
  decode = /* @__PURE__ */ _decode(ZodRealError);
  encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
  decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
  safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
  safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
  safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
  safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
});

// node_modules/zod/v4/classic/schemas.js
function string2(params) {
  return _string(ZodString, params);
}
function number2(params) {
  return _number(ZodNumber, params);
}
function int(params) {
  return _int(ZodNumberFormat, params);
}
function boolean2(params) {
  return _boolean(ZodBoolean, params);
}
function any() {
  return _any(ZodAny);
}
function unknown() {
  return _unknown(ZodUnknown);
}
function never(params) {
  return _never(ZodNever, params);
}
function array(element, params) {
  return _array(ZodArray, element, params);
}
function object(shape, params) {
  const def = {
    type: "object",
    get shape() {
      assignProp(this, "shape", shape ? objectClone(shape) : {});
      return this.shape;
    },
    ...normalizeParams(params)
  };
  return new ZodObject(def);
}
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
function tuple(items, _paramsOrRest, _params) {
  const hasRest = _paramsOrRest instanceof $ZodType;
  const params = hasRest ? _params : _paramsOrRest;
  const rest = hasRest ? _paramsOrRest : null;
  return new ZodTuple({
    type: "tuple",
    items,
    rest,
    ...normalizeParams(params)
  });
}
function record(keyType, valueType, params) {
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
function _enum(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
function _default(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...normalizeParams(params)
  });
}
function _catch(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
  });
}
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
function refine(fn, _params = {}) {
  return _refine(ZodCustom, fn, _params);
}
function superRefine(fn) {
  return _superRefine(fn);
}
var ZodType, _ZodString, ZodString, ZodStringFormat, ZodEmail, ZodGUID, ZodUUID, ZodURL, ZodEmoji, ZodNanoID, ZodCUID, ZodCUID2, ZodULID, ZodXID, ZodKSUID, ZodIPv4, ZodIPv6, ZodCIDRv4, ZodCIDRv6, ZodBase64, ZodBase64URL, ZodE164, ZodJWT, ZodNumber, ZodNumberFormat, ZodBoolean, ZodAny, ZodUnknown, ZodNever, ZodArray, ZodObject, ZodUnion, ZodIntersection, ZodTuple, ZodRecord, ZodEnum, ZodLiteral, ZodTransform, ZodOptional, ZodNullable, ZodDefault, ZodPrefault, ZodNonOptional, ZodCatch, ZodPipe, ZodReadonly, ZodCustom;
var init_schemas2 = __esm(() => {
  init_core2();
  init_core2();
  init_checks2();
  init_iso();
  init_parse2();
  ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
    $ZodType.init(inst, def);
    inst.def = def;
    inst.type = def.type;
    Object.defineProperty(inst, "_def", { value: def });
    inst.check = (...checks) => {
      return inst.clone({
        ...def,
        checks: [
          ...def.checks ?? [],
          ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
        ]
      });
    };
    inst.clone = (def, params) => clone(inst, def, params);
    inst.brand = () => inst;
    inst.register = (reg, meta) => {
      reg.add(inst, meta);
      return inst;
    };
    inst.parse = (data, params) => parse3(inst, data, params, { callee: inst.parse });
    inst.safeParse = (data, params) => safeParse2(inst, data, params);
    inst.parseAsync = async (data, params) => parseAsync2(inst, data, params, { callee: inst.parseAsync });
    inst.safeParseAsync = async (data, params) => safeParseAsync2(inst, data, params);
    inst.spa = inst.safeParseAsync;
    inst.encode = (data, params) => encode(inst, data, params);
    inst.decode = (data, params) => decode(inst, data, params);
    inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
    inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
    inst.safeEncode = (data, params) => safeEncode(inst, data, params);
    inst.safeDecode = (data, params) => safeDecode(inst, data, params);
    inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
    inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
    inst.refine = (check, params) => inst.check(refine(check, params));
    inst.superRefine = (refinement) => inst.check(superRefine(refinement));
    inst.overwrite = (fn) => inst.check(_overwrite(fn));
    inst.optional = () => optional(inst);
    inst.nullable = () => nullable(inst);
    inst.nullish = () => optional(nullable(inst));
    inst.nonoptional = (params) => nonoptional(inst, params);
    inst.array = () => array(inst);
    inst.or = (arg) => union([inst, arg]);
    inst.and = (arg) => intersection(inst, arg);
    inst.transform = (tx) => pipe(inst, transform(tx));
    inst.default = (def) => _default(inst, def);
    inst.prefault = (def) => prefault(inst, def);
    inst.catch = (params) => _catch(inst, params);
    inst.pipe = (target) => pipe(inst, target);
    inst.readonly = () => readonly(inst);
    inst.describe = (description) => {
      const cl = inst.clone();
      globalRegistry.add(cl, { description });
      return cl;
    };
    Object.defineProperty(inst, "description", {
      get() {
        return globalRegistry.get(inst)?.description;
      },
      configurable: true
    });
    inst.meta = (...args) => {
      if (args.length === 0) {
        return globalRegistry.get(inst);
      }
      const cl = inst.clone();
      globalRegistry.add(cl, args[0]);
      return cl;
    };
    inst.isOptional = () => inst.safeParse(undefined).success;
    inst.isNullable = () => inst.safeParse(null).success;
    return inst;
  });
  _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    ZodType.init(inst, def);
    const bag = inst._zod.bag;
    inst.format = bag.format ?? null;
    inst.minLength = bag.minimum ?? null;
    inst.maxLength = bag.maximum ?? null;
    inst.regex = (...args) => inst.check(_regex(...args));
    inst.includes = (...args) => inst.check(_includes(...args));
    inst.startsWith = (...args) => inst.check(_startsWith(...args));
    inst.endsWith = (...args) => inst.check(_endsWith(...args));
    inst.min = (...args) => inst.check(_minLength(...args));
    inst.max = (...args) => inst.check(_maxLength(...args));
    inst.length = (...args) => inst.check(_length(...args));
    inst.nonempty = (...args) => inst.check(_minLength(1, ...args));
    inst.lowercase = (params) => inst.check(_lowercase(params));
    inst.uppercase = (params) => inst.check(_uppercase(params));
    inst.trim = () => inst.check(_trim());
    inst.normalize = (...args) => inst.check(_normalize(...args));
    inst.toLowerCase = () => inst.check(_toLowerCase());
    inst.toUpperCase = () => inst.check(_toUpperCase());
  });
  ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    _ZodString.init(inst, def);
    inst.email = (params) => inst.check(_email(ZodEmail, params));
    inst.url = (params) => inst.check(_url(ZodURL, params));
    inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
    inst.emoji = (params) => inst.check(_emoji2(ZodEmoji, params));
    inst.guid = (params) => inst.check(_guid(ZodGUID, params));
    inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
    inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
    inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
    inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
    inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
    inst.guid = (params) => inst.check(_guid(ZodGUID, params));
    inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
    inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
    inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
    inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
    inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
    inst.xid = (params) => inst.check(_xid(ZodXID, params));
    inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
    inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
    inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
    inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
    inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
    inst.e164 = (params) => inst.check(_e164(ZodE164, params));
    inst.datetime = (params) => inst.check(datetime2(params));
    inst.date = (params) => inst.check(date2(params));
    inst.time = (params) => inst.check(time2(params));
    inst.duration = (params) => inst.check(duration2(params));
  });
  ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    _ZodString.init(inst, def);
  });
  ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
    $ZodEmail.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
    $ZodGUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
    $ZodUUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
    $ZodURL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
    $ZodEmoji.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
    $ZodNanoID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
    $ZodCUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
    $ZodCUID2.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
    $ZodULID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
    $ZodXID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
    $ZodKSUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
    $ZodIPv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
    $ZodIPv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
    $ZodCIDRv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
    $ZodCIDRv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
    $ZodBase64.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
    $ZodBase64URL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
    $ZodE164.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
    $ZodJWT.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
    $ZodNumber.init(inst, def);
    ZodType.init(inst, def);
    inst.gt = (value, params) => inst.check(_gt(value, params));
    inst.gte = (value, params) => inst.check(_gte(value, params));
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.lt = (value, params) => inst.check(_lt(value, params));
    inst.lte = (value, params) => inst.check(_lte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
    inst.int = (params) => inst.check(int(params));
    inst.safe = (params) => inst.check(int(params));
    inst.positive = (params) => inst.check(_gt(0, params));
    inst.nonnegative = (params) => inst.check(_gte(0, params));
    inst.negative = (params) => inst.check(_lt(0, params));
    inst.nonpositive = (params) => inst.check(_lte(0, params));
    inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
    inst.step = (value, params) => inst.check(_multipleOf(value, params));
    inst.finite = () => inst;
    const bag = inst._zod.bag;
    inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
    inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
    inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
    inst.isFinite = true;
    inst.format = bag.format ?? null;
  });
  ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
    $ZodNumberFormat.init(inst, def);
    ZodNumber.init(inst, def);
  });
  ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
    $ZodBoolean.init(inst, def);
    ZodType.init(inst, def);
  });
  ZodAny = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
    $ZodAny.init(inst, def);
    ZodType.init(inst, def);
  });
  ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
    $ZodUnknown.init(inst, def);
    ZodType.init(inst, def);
  });
  ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
    $ZodNever.init(inst, def);
    ZodType.init(inst, def);
  });
  ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
    $ZodArray.init(inst, def);
    ZodType.init(inst, def);
    inst.element = def.element;
    inst.min = (minLength, params) => inst.check(_minLength(minLength, params));
    inst.nonempty = (params) => inst.check(_minLength(1, params));
    inst.max = (maxLength, params) => inst.check(_maxLength(maxLength, params));
    inst.length = (len, params) => inst.check(_length(len, params));
    inst.unwrap = () => inst.element;
  });
  ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
    $ZodObjectJIT.init(inst, def);
    ZodType.init(inst, def);
    defineLazy(inst, "shape", () => def.shape);
    inst.keyof = () => _enum(Object.keys(inst._zod.def.shape));
    inst.catchall = (catchall) => inst.clone({ ...inst._zod.def, catchall });
    inst.passthrough = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
    inst.loose = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
    inst.strict = () => inst.clone({ ...inst._zod.def, catchall: never() });
    inst.strip = () => inst.clone({ ...inst._zod.def, catchall: undefined });
    inst.extend = (incoming) => {
      return extend(inst, incoming);
    };
    inst.safeExtend = (incoming) => {
      return safeExtend(inst, incoming);
    };
    inst.merge = (other) => merge(inst, other);
    inst.pick = (mask) => pick(inst, mask);
    inst.omit = (mask) => omit(inst, mask);
    inst.partial = (...args) => partial(ZodOptional, inst, args[0]);
    inst.required = (...args) => required(ZodNonOptional, inst, args[0]);
  });
  ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
    $ZodUnion.init(inst, def);
    ZodType.init(inst, def);
    inst.options = def.options;
  });
  ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
    $ZodIntersection.init(inst, def);
    ZodType.init(inst, def);
  });
  ZodTuple = /* @__PURE__ */ $constructor("ZodTuple", (inst, def) => {
    $ZodTuple.init(inst, def);
    ZodType.init(inst, def);
    inst.rest = (rest) => inst.clone({
      ...inst._zod.def,
      rest
    });
  });
  ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
    $ZodRecord.init(inst, def);
    ZodType.init(inst, def);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
  });
  ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
    $ZodEnum.init(inst, def);
    ZodType.init(inst, def);
    inst.enum = def.entries;
    inst.options = Object.values(def.entries);
    const keys = new Set(Object.keys(def.entries));
    inst.extract = (values, params) => {
      const newEntries = {};
      for (const value of values) {
        if (keys.has(value)) {
          newEntries[value] = def.entries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...normalizeParams(params),
        entries: newEntries
      });
    };
    inst.exclude = (values, params) => {
      const newEntries = { ...def.entries };
      for (const value of values) {
        if (keys.has(value)) {
          delete newEntries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...normalizeParams(params),
        entries: newEntries
      });
    };
  });
  ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
    $ZodLiteral.init(inst, def);
    ZodType.init(inst, def);
    inst.values = new Set(def.values);
    Object.defineProperty(inst, "value", {
      get() {
        if (def.values.length > 1) {
          throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
        }
        return def.values[0];
      }
    });
  });
  ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
    $ZodTransform.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      if (_ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      payload.addIssue = (issue2) => {
        if (typeof issue2 === "string") {
          payload.issues.push(issue(issue2, payload.value, def));
        } else {
          const _issue = issue2;
          if (_issue.fatal)
            _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          _issue.input ?? (_issue.input = payload.value);
          _issue.inst ?? (_issue.inst = inst);
          payload.issues.push(issue(_issue));
        }
      };
      const output = def.transform(payload.value, payload);
      if (output instanceof Promise) {
        return output.then((output) => {
          payload.value = output;
          return payload;
        });
      }
      payload.value = output;
      return payload;
    };
  });
  ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
    $ZodNullable.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
    $ZodDefault.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeDefault = inst.unwrap;
  });
  ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
    $ZodPrefault.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
    $ZodNonOptional.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
    $ZodCatch.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeCatch = inst.unwrap;
  });
  ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
    $ZodPipe.init(inst, def);
    ZodType.init(inst, def);
    inst.in = def.in;
    inst.out = def.out;
  });
  ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
    $ZodReadonly.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
    $ZodCustom.init(inst, def);
    ZodType.init(inst, def);
  });
});

// node_modules/zod/v4/classic/compat.js
var ZodFirstPartyTypeKind;
var init_compat = __esm(() => {
  (function(ZodFirstPartyTypeKind) {})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
});

// node_modules/zod/v4/classic/coerce.js
var init_coerce = () => {};

// node_modules/zod/v4/classic/external.js
var init_external = __esm(() => {
  init_core2();
  init_core2();
  init_en();
  init_locales();
  init_iso();
  init_coerce();
  init_schemas2();
  init_checks2();
  init_errors2();
  init_parse2();
  init_compat();
  config(en_default());
});

// node_modules/zod/index.js
var init_zod = __esm(() => {
  init_external();
  init_external();
});

// node_modules/xstate/dist/xstate-dev.development.cjs.js
var require_xstate_dev_development_cjs = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  function getGlobal() {
    if (typeof globalThis !== "undefined") {
      return globalThis;
    }
    if (typeof self !== "undefined") {
      return self;
    }
    if (typeof window !== "undefined") {
      return window;
    }
    if (typeof global !== "undefined") {
      return global;
    }
    {
      console.warn("XState could not find a global object in this environment. Please let the maintainers know and raise an issue here: https://github.com/statelyai/xstate/issues");
    }
  }
  function getDevTools() {
    const w = getGlobal();
    if (w.__xstate__) {
      return w.__xstate__;
    }
    return;
  }
  function registerService(service) {
    if (typeof window === "undefined") {
      return;
    }
    const devTools = getDevTools();
    if (devTools) {
      devTools.register(service);
    }
  }
  var devToolsAdapter = (service) => {
    if (typeof window === "undefined") {
      return;
    }
    const devTools = getDevTools();
    if (devTools) {
      devTools.register(service);
    }
  };
  exports.devToolsAdapter = devToolsAdapter;
  exports.getGlobal = getGlobal;
  exports.registerService = registerService;
});

// node_modules/xstate/dist/raise-6dbf7d60.development.cjs.js
var require_raise_6dbf7d60_development_cjs = __commonJS(function(exports) {
  var dist_xstateDev = require_xstate_dev_development_cjs();

  class Mailbox {
    constructor(_process) {
      this._process = _process;
      this._active = false;
      this._current = null;
      this._last = null;
    }
    start() {
      this._active = true;
      this.flush();
    }
    clear() {
      if (this._current) {
        this._current.next = null;
        this._last = this._current;
      }
    }
    enqueue(event) {
      const enqueued = {
        value: event,
        next: null
      };
      if (this._current) {
        this._last.next = enqueued;
        this._last = enqueued;
        return;
      }
      this._current = enqueued;
      this._last = enqueued;
      if (this._active) {
        this.flush();
      }
    }
    flush() {
      while (this._current) {
        const consumed = this._current;
        this._process(consumed.value);
        this._current = consumed.next;
      }
      this._last = null;
    }
  }
  var STATE_DELIMITER = ".";
  var TARGETLESS_KEY = "";
  var NULL_EVENT = "";
  var STATE_IDENTIFIER = "#";
  var WILDCARD = "*";
  var XSTATE_INIT = "xstate.init";
  var XSTATE_ERROR = "xstate.error";
  var XSTATE_STOP = "xstate.stop";
  function createAfterEvent(delayRef, id) {
    return {
      type: `xstate.after.${delayRef}.${id}`
    };
  }
  function createDoneStateEvent(id, output) {
    return {
      type: `xstate.done.state.${id}`,
      output
    };
  }
  function createDoneActorEvent(invokeId, output) {
    return {
      type: `xstate.done.actor.${invokeId}`,
      output,
      actorId: invokeId
    };
  }
  function createErrorActorEvent(id, error) {
    return {
      type: `xstate.error.actor.${id}`,
      error,
      actorId: id
    };
  }
  function createInitEvent(input) {
    return {
      type: XSTATE_INIT,
      input
    };
  }
  function reportUnhandledError(err) {
    setTimeout(() => {
      throw err;
    });
  }
  var symbolObservable = (() => typeof Symbol === "function" && Symbol.observable || "@@observable")();
  function matchesState(parentStateId, childStateId) {
    const parentStateValue = toStateValue(parentStateId);
    const childStateValue = toStateValue(childStateId);
    if (typeof childStateValue === "string") {
      if (typeof parentStateValue === "string") {
        return childStateValue === parentStateValue;
      }
      return false;
    }
    if (typeof parentStateValue === "string") {
      return parentStateValue in childStateValue;
    }
    return Object.keys(parentStateValue).every((key) => {
      if (!(key in childStateValue)) {
        return false;
      }
      return matchesState(parentStateValue[key], childStateValue[key]);
    });
  }
  function toStatePath(stateId) {
    if (isArray(stateId)) {
      return stateId;
    }
    const result = [];
    let segment = "";
    for (let i = 0;i < stateId.length; i++) {
      const char = stateId.charCodeAt(i);
      switch (char) {
        case 92:
          segment += stateId[i + 1];
          i++;
          continue;
        case 46:
          result.push(segment);
          segment = "";
          continue;
      }
      segment += stateId[i];
    }
    result.push(segment);
    return result;
  }
  function toStateValue(stateValue) {
    if (isMachineSnapshot(stateValue)) {
      return stateValue.value;
    }
    if (typeof stateValue !== "string") {
      return stateValue;
    }
    const statePath = toStatePath(stateValue);
    return pathToStateValue(statePath);
  }
  function pathToStateValue(statePath) {
    if (statePath.length === 1) {
      return statePath[0];
    }
    const value = {};
    let marker = value;
    for (let i = 0;i < statePath.length - 1; i++) {
      if (i === statePath.length - 2) {
        marker[statePath[i]] = statePath[i + 1];
      } else {
        const previous = marker;
        marker = {};
        previous[statePath[i]] = marker;
      }
    }
    return value;
  }
  function mapValues(collection, iteratee) {
    const result = {};
    const collectionKeys = Object.keys(collection);
    for (let i = 0;i < collectionKeys.length; i++) {
      const key = collectionKeys[i];
      result[key] = iteratee(collection[key], key, collection, i);
    }
    return result;
  }
  function toArrayStrict(value) {
    if (isArray(value)) {
      return value;
    }
    return [value];
  }
  function toArray(value) {
    if (value === undefined) {
      return [];
    }
    return toArrayStrict(value);
  }
  function resolveOutput(mapper, context, event, self2) {
    if (typeof mapper === "function") {
      return mapper({
        context,
        event,
        self: self2
      });
    }
    if (!!mapper && typeof mapper === "object" && Object.values(mapper).some((val) => typeof val === "function")) {
      console.warn(`Dynamically mapping values to individual properties is deprecated. Use a single function that returns the mapped object instead.
Found object containing properties whose values are possibly mapping functions: ${Object.entries(mapper).filter(([, value]) => typeof value === "function").map(([key, value]) => `
 - ${key}: ${value.toString().replace(/\n\s*/g, "")}`).join("")}`);
    }
    return mapper;
  }
  function isArray(value) {
    return Array.isArray(value);
  }
  function isErrorActorEvent(event) {
    return event.type.startsWith("xstate.error.actor");
  }
  function toTransitionConfigArray(configLike) {
    return toArrayStrict(configLike).map((transitionLike) => {
      if (typeof transitionLike === "undefined" || typeof transitionLike === "string") {
        return {
          target: transitionLike
        };
      }
      return transitionLike;
    });
  }
  function normalizeTarget(target) {
    if (target === undefined || target === TARGETLESS_KEY) {
      return;
    }
    return toArray(target);
  }
  function toObserver(nextHandler, errorHandler, completionHandler) {
    const isObserver = typeof nextHandler === "object";
    const self2 = isObserver ? nextHandler : undefined;
    return {
      next: (isObserver ? nextHandler.next : nextHandler)?.bind(self2),
      error: (isObserver ? nextHandler.error : errorHandler)?.bind(self2),
      complete: (isObserver ? nextHandler.complete : completionHandler)?.bind(self2)
    };
  }
  function createInvokeId(stateNodeId, index) {
    return `${index}.${stateNodeId}`;
  }
  function resolveReferencedActor(machine, src) {
    const match = src.match(/^xstate\.invoke\.(\d+)\.(.*)/);
    if (!match) {
      return machine.implementations.actors[src];
    }
    const [, indexStr, nodeId] = match;
    const node = machine.getStateNodeById(nodeId);
    const invokeConfig = node.config.invoke;
    return (Array.isArray(invokeConfig) ? invokeConfig[indexStr] : invokeConfig).src;
  }
  function getAllOwnEventDescriptors(snapshot) {
    return [...new Set([...snapshot._nodes.flatMap((sn) => sn.ownEvents)])];
  }
  function matchesEventDescriptor(eventType, descriptor) {
    if (descriptor === eventType) {
      return true;
    }
    if (descriptor === WILDCARD) {
      return true;
    }
    if (!descriptor.endsWith(".*")) {
      return false;
    }
    if (/.*\*.+/.test(descriptor)) {
      console.warn(`Wildcards can only be the last token of an event descriptor (e.g., "event.*") or the entire event descriptor ("*"). Check the "${descriptor}" event.`);
    }
    const partialEventTokens = descriptor.split(".");
    const eventTokens = eventType.split(".");
    for (let tokenIndex = 0;tokenIndex < partialEventTokens.length; tokenIndex++) {
      const partialEventToken = partialEventTokens[tokenIndex];
      const eventToken = eventTokens[tokenIndex];
      if (partialEventToken === "*") {
        const isLastToken = tokenIndex === partialEventTokens.length - 1;
        if (!isLastToken) {
          console.warn(`Infix wildcards in transition events are not allowed. Check the "${descriptor}" transition.`);
        }
        return isLastToken;
      }
      if (partialEventToken !== eventToken) {
        return false;
      }
    }
    return true;
  }
  function createScheduledEventId(actorRef, id) {
    return `${actorRef.sessionId}.${id}`;
  }
  var idCounter = 0;
  function createSystem(rootActor, options) {
    const children = new Map;
    const keyedActors = new Map;
    const reverseKeyedActors = new WeakMap;
    const inspectionObservers = new Set;
    const timerMap = {};
    const {
      clock,
      logger
    } = options;
    const scheduler = {
      schedule: (source, target, event, delay, id = Math.random().toString(36).slice(2)) => {
        const scheduledEvent = {
          source,
          target,
          event,
          delay,
          id,
          startedAt: Date.now()
        };
        const scheduledEventId = createScheduledEventId(source, id);
        system._snapshot._scheduledEvents[scheduledEventId] = scheduledEvent;
        const timeout = clock.setTimeout(() => {
          delete timerMap[scheduledEventId];
          delete system._snapshot._scheduledEvents[scheduledEventId];
          system._relay(source, target, event);
        }, delay);
        timerMap[scheduledEventId] = timeout;
      },
      cancel: (source, id) => {
        const scheduledEventId = createScheduledEventId(source, id);
        const timeout = timerMap[scheduledEventId];
        delete timerMap[scheduledEventId];
        delete system._snapshot._scheduledEvents[scheduledEventId];
        if (timeout !== undefined) {
          clock.clearTimeout(timeout);
        }
      },
      cancelAll: (actorRef) => {
        for (const scheduledEventId in system._snapshot._scheduledEvents) {
          const scheduledEvent = system._snapshot._scheduledEvents[scheduledEventId];
          if (scheduledEvent.source === actorRef) {
            scheduler.cancel(actorRef, scheduledEvent.id);
          }
        }
      }
    };
    const sendInspectionEvent = (event) => {
      if (!inspectionObservers.size) {
        return;
      }
      const resolvedInspectionEvent = {
        ...event,
        rootId: rootActor.sessionId
      };
      inspectionObservers.forEach((observer) => observer.next?.(resolvedInspectionEvent));
    };
    const system = {
      _snapshot: {
        _scheduledEvents: (options?.snapshot && options.snapshot.scheduler) ?? {}
      },
      _bookId: () => `x:${idCounter++}`,
      _register: (sessionId, actorRef) => {
        children.set(sessionId, actorRef);
        return sessionId;
      },
      _unregister: (actorRef) => {
        children.delete(actorRef.sessionId);
        const systemId = reverseKeyedActors.get(actorRef);
        if (systemId !== undefined) {
          keyedActors.delete(systemId);
          reverseKeyedActors.delete(actorRef);
        }
      },
      get: (systemId) => {
        return keyedActors.get(systemId);
      },
      getAll: () => {
        return Object.fromEntries(keyedActors.entries());
      },
      _set: (systemId, actorRef) => {
        const existing = keyedActors.get(systemId);
        if (existing && existing !== actorRef) {
          throw new Error(`Actor with system ID '${systemId}' already exists.`);
        }
        keyedActors.set(systemId, actorRef);
        reverseKeyedActors.set(actorRef, systemId);
      },
      inspect: (observerOrFn) => {
        const observer = toObserver(observerOrFn);
        inspectionObservers.add(observer);
        return {
          unsubscribe() {
            inspectionObservers.delete(observer);
          }
        };
      },
      _sendInspectionEvent: sendInspectionEvent,
      _relay: (source, target, event) => {
        system._sendInspectionEvent({
          type: "@xstate.event",
          sourceRef: source,
          actorRef: target,
          event
        });
        target._send(event);
      },
      scheduler,
      getSnapshot: () => {
        return {
          _scheduledEvents: {
            ...system._snapshot._scheduledEvents
          }
        };
      },
      start: () => {
        const scheduledEvents = system._snapshot._scheduledEvents;
        system._snapshot._scheduledEvents = {};
        for (const scheduledId in scheduledEvents) {
          const {
            source,
            target,
            event,
            delay,
            id
          } = scheduledEvents[scheduledId];
          scheduler.schedule(source, target, event, delay, id);
        }
      },
      _clock: clock,
      _logger: logger
    };
    return system;
  }
  exports.executingCustomAction = false;
  var $$ACTOR_TYPE = 1;
  var ProcessingStatus = /* @__PURE__ */ function(ProcessingStatus) {
    ProcessingStatus[ProcessingStatus["NotStarted"] = 0] = "NotStarted";
    ProcessingStatus[ProcessingStatus["Running"] = 1] = "Running";
    ProcessingStatus[ProcessingStatus["Stopped"] = 2] = "Stopped";
    return ProcessingStatus;
  }({});
  var defaultOptions = {
    clock: {
      setTimeout: (fn, ms) => {
        return setTimeout(fn, ms);
      },
      clearTimeout: (id) => {
        return clearTimeout(id);
      }
    },
    logger: console.log.bind(console),
    devTools: false
  };

  class Actor {
    constructor(logic, options) {
      this.logic = logic;
      this._snapshot = undefined;
      this.clock = undefined;
      this.options = undefined;
      this.id = undefined;
      this.mailbox = new Mailbox(this._process.bind(this));
      this.observers = new Set;
      this.eventListeners = new Map;
      this.logger = undefined;
      this._processingStatus = ProcessingStatus.NotStarted;
      this._parent = undefined;
      this._syncSnapshot = undefined;
      this.ref = undefined;
      this._actorScope = undefined;
      this.systemId = undefined;
      this.sessionId = undefined;
      this.system = undefined;
      this._doneEvent = undefined;
      this.src = undefined;
      this._deferred = [];
      const resolvedOptions = {
        ...defaultOptions,
        ...options
      };
      const {
        clock,
        logger,
        parent,
        syncSnapshot,
        id,
        systemId,
        inspect
      } = resolvedOptions;
      this.system = parent ? parent.system : createSystem(this, {
        clock,
        logger
      });
      if (inspect && !parent) {
        this.system.inspect(toObserver(inspect));
      }
      this.sessionId = this.system._bookId();
      this.id = id ?? this.sessionId;
      this.logger = options?.logger ?? this.system._logger;
      this.clock = options?.clock ?? this.system._clock;
      this._parent = parent;
      this._syncSnapshot = syncSnapshot;
      this.options = resolvedOptions;
      this.src = resolvedOptions.src ?? logic;
      this.ref = this;
      this._actorScope = {
        self: this,
        id: this.id,
        sessionId: this.sessionId,
        logger: this.logger,
        defer: (fn) => {
          this._deferred.push(fn);
        },
        system: this.system,
        stopChild: (child) => {
          if (child._parent !== this) {
            throw new Error(`Cannot stop child actor ${child.id} of ${this.id} because it is not a child`);
          }
          child._stop();
        },
        emit: (emittedEvent) => {
          const listeners = this.eventListeners.get(emittedEvent.type);
          const wildcardListener = this.eventListeners.get("*");
          if (!listeners && !wildcardListener) {
            return;
          }
          const allListeners = [...listeners ? listeners.values() : [], ...wildcardListener ? wildcardListener.values() : []];
          for (const handler of allListeners) {
            try {
              handler(emittedEvent);
            } catch (err) {
              reportUnhandledError(err);
            }
          }
        },
        actionExecutor: (action) => {
          const exec = () => {
            this._actorScope.system._sendInspectionEvent({
              type: "@xstate.action",
              actorRef: this,
              action: {
                type: action.type,
                params: action.params
              }
            });
            if (!action.exec) {
              return;
            }
            const saveExecutingCustomAction = exports.executingCustomAction;
            try {
              exports.executingCustomAction = true;
              action.exec(action.info, action.params);
            } finally {
              exports.executingCustomAction = saveExecutingCustomAction;
            }
          };
          if (this._processingStatus === ProcessingStatus.Running) {
            exec();
          } else {
            this._deferred.push(exec);
          }
        }
      };
      this.send = this.send.bind(this);
      this.system._sendInspectionEvent({
        type: "@xstate.actor",
        actorRef: this
      });
      if (systemId) {
        this.systemId = systemId;
        this.system._set(systemId, this);
      }
      this._initState(options?.snapshot ?? options?.state);
      if (systemId && this._snapshot.status !== "active") {
        this.system._unregister(this);
      }
    }
    _initState(persistedState) {
      try {
        this._snapshot = persistedState ? this.logic.restoreSnapshot ? this.logic.restoreSnapshot(persistedState, this._actorScope) : persistedState : this.logic.getInitialSnapshot(this._actorScope, this.options?.input);
      } catch (err) {
        this._snapshot = {
          status: "error",
          output: undefined,
          error: err
        };
      }
    }
    update(snapshot, event) {
      this._snapshot = snapshot;
      let deferredFn;
      while (deferredFn = this._deferred.shift()) {
        try {
          deferredFn();
        } catch (err) {
          this._deferred.length = 0;
          this._snapshot = {
            ...snapshot,
            status: "error",
            error: err
          };
        }
      }
      switch (this._snapshot.status) {
        case "active":
          for (const observer of this.observers) {
            try {
              observer.next?.(snapshot);
            } catch (err) {
              reportUnhandledError(err);
            }
          }
          break;
        case "done":
          for (const observer of this.observers) {
            try {
              observer.next?.(snapshot);
            } catch (err) {
              reportUnhandledError(err);
            }
          }
          this._stopProcedure();
          this._complete();
          this._doneEvent = createDoneActorEvent(this.id, this._snapshot.output);
          if (this._parent) {
            this.system._relay(this, this._parent, this._doneEvent);
          }
          break;
        case "error":
          this._error(this._snapshot.error);
          break;
      }
      this.system._sendInspectionEvent({
        type: "@xstate.snapshot",
        actorRef: this,
        event,
        snapshot
      });
    }
    subscribe(nextListenerOrObserver, errorListener, completeListener) {
      const observer = toObserver(nextListenerOrObserver, errorListener, completeListener);
      if (this._processingStatus !== ProcessingStatus.Stopped) {
        this.observers.add(observer);
      } else {
        switch (this._snapshot.status) {
          case "done":
            try {
              observer.complete?.();
            } catch (err) {
              reportUnhandledError(err);
            }
            break;
          case "error": {
            const err = this._snapshot.error;
            if (!observer.error) {
              reportUnhandledError(err);
            } else {
              try {
                observer.error(err);
              } catch (err) {
                reportUnhandledError(err);
              }
            }
            break;
          }
        }
      }
      return {
        unsubscribe: () => {
          this.observers.delete(observer);
        }
      };
    }
    on(type, handler) {
      let listeners = this.eventListeners.get(type);
      if (!listeners) {
        listeners = new Set;
        this.eventListeners.set(type, listeners);
      }
      const wrappedHandler = handler.bind(undefined);
      listeners.add(wrappedHandler);
      return {
        unsubscribe: () => {
          listeners.delete(wrappedHandler);
        }
      };
    }
    select(selector, equalityFn = Object.is) {
      return {
        subscribe: (observerOrFn) => {
          const observer = toObserver(observerOrFn);
          const snapshot = this.getSnapshot();
          let previousSelected = selector(snapshot);
          return this.subscribe((snapshot) => {
            const nextSelected = selector(snapshot);
            if (!equalityFn(previousSelected, nextSelected)) {
              previousSelected = nextSelected;
              observer.next?.(nextSelected);
            }
          });
        },
        get: () => selector(this.getSnapshot())
      };
    }
    start() {
      if (this._processingStatus === ProcessingStatus.Running) {
        return this;
      }
      if (this._syncSnapshot) {
        this.subscribe({
          next: (snapshot) => {
            if (snapshot.status === "active") {
              this.system._relay(this, this._parent, {
                type: `xstate.snapshot.${this.id}`,
                snapshot
              });
            }
          },
          error: () => {}
        });
      }
      this.system._register(this.sessionId, this);
      if (this.systemId) {
        this.system._set(this.systemId, this);
      }
      this._processingStatus = ProcessingStatus.Running;
      const initEvent = createInitEvent(this.options.input);
      this.system._sendInspectionEvent({
        type: "@xstate.event",
        sourceRef: this._parent,
        actorRef: this,
        event: initEvent
      });
      const status = this._snapshot.status;
      switch (status) {
        case "done":
          this.update(this._snapshot, initEvent);
          return this;
        case "error":
          this._error(this._snapshot.error);
          return this;
      }
      if (!this._parent) {
        this.system.start();
      }
      if (this.logic.start) {
        try {
          this.logic.start(this._snapshot, this._actorScope);
        } catch (err) {
          this._snapshot = {
            ...this._snapshot,
            status: "error",
            error: err
          };
          this._error(err);
          return this;
        }
      }
      this.update(this._snapshot, initEvent);
      if (this.options.devTools) {
        this.attachDevTools();
      }
      this.mailbox.start();
      return this;
    }
    _process(event) {
      let nextState;
      let caughtError;
      try {
        nextState = this.logic.transition(this._snapshot, event, this._actorScope);
      } catch (err) {
        caughtError = {
          err
        };
      }
      if (caughtError) {
        const {
          err
        } = caughtError;
        this._snapshot = {
          ...this._snapshot,
          status: "error",
          error: err
        };
        this._error(err);
        return;
      }
      this.update(nextState, event);
      if (event.type === XSTATE_STOP) {
        this._stopProcedure();
        this._complete();
      }
    }
    _stop() {
      if (this._processingStatus === ProcessingStatus.Stopped) {
        return this;
      }
      this.mailbox.clear();
      if (this._processingStatus === ProcessingStatus.NotStarted) {
        this._processingStatus = ProcessingStatus.Stopped;
        return this;
      }
      this.mailbox.enqueue({
        type: XSTATE_STOP
      });
      return this;
    }
    stop() {
      if (this._parent) {
        throw new Error("A non-root actor cannot be stopped directly.");
      }
      return this._stop();
    }
    _complete() {
      for (const observer of this.observers) {
        try {
          observer.complete?.();
        } catch (err) {
          reportUnhandledError(err);
        }
      }
      this.observers.clear();
      this.eventListeners.clear();
    }
    _reportError(err) {
      if (!this.observers.size) {
        if (!this._parent) {
          reportUnhandledError(err);
        }
        this.eventListeners.clear();
        return;
      }
      let reportError = false;
      for (const observer of this.observers) {
        const errorListener = observer.error;
        reportError ||= !errorListener;
        try {
          errorListener?.(err);
        } catch (err2) {
          reportUnhandledError(err2);
        }
      }
      this.observers.clear();
      this.eventListeners.clear();
      if (reportError) {
        reportUnhandledError(err);
      }
    }
    _error(err) {
      this._stopProcedure();
      this._reportError(err);
      if (this._parent) {
        this.system._relay(this, this._parent, createErrorActorEvent(this.id, err));
      }
    }
    _stopProcedure() {
      if (this._processingStatus !== ProcessingStatus.Running) {
        return this;
      }
      this.system.scheduler.cancelAll(this);
      this.mailbox.clear();
      this.mailbox = new Mailbox(this._process.bind(this));
      this._processingStatus = ProcessingStatus.Stopped;
      this.system._unregister(this);
      return this;
    }
    _send(event) {
      if (this._processingStatus === ProcessingStatus.Stopped) {
        {
          let eventString;
          try {
            eventString = JSON.stringify(event);
          } catch {
            eventString = String(event);
          }
          console.warn(`Event "${event.type}" was sent to stopped actor "${this.id} (${this.sessionId})". This actor has already reached its final state, and will not transition.
Event: ${eventString}`);
        }
        return;
      }
      this.mailbox.enqueue(event);
    }
    send(event) {
      if (typeof event === "string") {
        throw new Error(`Only event objects may be sent to actors; use .send({ type: "${event}" }) instead`);
      }
      this.system._relay(undefined, this, event);
    }
    attachDevTools() {
      const {
        devTools
      } = this.options;
      if (devTools) {
        const resolvedDevToolsAdapter = typeof devTools === "function" ? devTools : dist_xstateDev.devToolsAdapter;
        resolvedDevToolsAdapter(this);
      }
    }
    toJSON() {
      return {
        xstate$$type: $$ACTOR_TYPE,
        id: this.id
      };
    }
    getPersistedSnapshot(options) {
      return this.logic.getPersistedSnapshot(this._snapshot, options);
    }
    [symbolObservable]() {
      return this;
    }
    getSnapshot() {
      if (!this._snapshot) {
        throw new Error(`Snapshot can't be read while the actor initializes itself`);
      }
      return this._snapshot;
    }
  }
  function createActor(logic, ...[options]) {
    return new Actor(logic, options);
  }
  var interpret = createActor;
  function resolveCancel(_, snapshot, actionArgs, actionParams, {
    sendId
  }) {
    const resolvedSendId = typeof sendId === "function" ? sendId(actionArgs, actionParams) : sendId;
    return [snapshot, {
      sendId: resolvedSendId
    }, undefined];
  }
  function executeCancel(actorScope, params) {
    actorScope.defer(() => {
      actorScope.system.scheduler.cancel(actorScope.self, params.sendId);
    });
  }
  function cancel(sendId) {
    function cancel(_args, _params) {
      {
        throw new Error(`This isn't supposed to be called`);
      }
    }
    cancel.type = "xstate.cancel";
    cancel.sendId = sendId;
    cancel.resolve = resolveCancel;
    cancel.execute = executeCancel;
    return cancel;
  }
  function resolveSpawn(actorScope, snapshot, actionArgs, _actionParams, {
    id,
    systemId,
    src,
    input,
    syncSnapshot
  }) {
    const logic = typeof src === "string" ? resolveReferencedActor(snapshot.machine, src) : src;
    const resolvedId = typeof id === "function" ? id(actionArgs) : id;
    let actorRef;
    let resolvedInput = undefined;
    if (logic) {
      resolvedInput = typeof input === "function" ? input({
        context: snapshot.context,
        event: actionArgs.event,
        self: actorScope.self
      }) : input;
      actorRef = createActor(logic, {
        id: resolvedId,
        src,
        parent: actorScope.self,
        syncSnapshot,
        systemId,
        input: resolvedInput
      });
    }
    if (!actorRef) {
      console.warn(`Actor type '${src}' not found in machine '${actorScope.id}'.`);
    }
    return [cloneMachineSnapshot(snapshot, {
      children: {
        ...snapshot.children,
        [resolvedId]: actorRef
      }
    }), {
      id,
      systemId,
      actorRef,
      src,
      input: resolvedInput
    }, undefined];
  }
  function executeSpawn(actorScope, {
    actorRef
  }) {
    if (!actorRef) {
      return;
    }
    actorScope.defer(() => {
      if (actorRef._processingStatus === ProcessingStatus.Stopped) {
        return;
      }
      actorRef.start();
    });
  }
  function spawnChild(...[src, {
    id,
    systemId,
    input,
    syncSnapshot = false
  } = {}]) {
    function spawnChild(_args, _params) {
      {
        throw new Error(`This isn't supposed to be called`);
      }
    }
    spawnChild.type = "xstate.spawnChild";
    spawnChild.id = id;
    spawnChild.systemId = systemId;
    spawnChild.src = src;
    spawnChild.input = input;
    spawnChild.syncSnapshot = syncSnapshot;
    spawnChild.resolve = resolveSpawn;
    spawnChild.execute = executeSpawn;
    return spawnChild;
  }
  function resolveStop(_, snapshot, args, actionParams, {
    actorRef
  }) {
    const actorRefOrString = typeof actorRef === "function" ? actorRef(args, actionParams) : actorRef;
    const resolvedActorRef = typeof actorRefOrString === "string" ? snapshot.children[actorRefOrString] : actorRefOrString;
    let children = snapshot.children;
    if (resolvedActorRef) {
      children = {
        ...children
      };
      delete children[resolvedActorRef.id];
    }
    return [cloneMachineSnapshot(snapshot, {
      children
    }), resolvedActorRef, undefined];
  }
  function unregisterRecursively(actorScope, actorRef) {
    const snapshot = actorRef.getSnapshot();
    if (snapshot && "children" in snapshot) {
      for (const child of Object.values(snapshot.children)) {
        unregisterRecursively(actorScope, child);
      }
    }
    actorScope.system._unregister(actorRef);
  }
  function executeStop(actorScope, actorRef) {
    if (!actorRef) {
      return;
    }
    unregisterRecursively(actorScope, actorRef);
    if (actorRef._processingStatus !== ProcessingStatus.Running) {
      actorScope.stopChild(actorRef);
      return;
    }
    actorScope.defer(() => {
      actorScope.stopChild(actorRef);
    });
  }
  function stopChild(actorRef) {
    function stop(_args, _params) {
      {
        throw new Error(`This isn't supposed to be called`);
      }
    }
    stop.type = "xstate.stopChild";
    stop.actorRef = actorRef;
    stop.resolve = resolveStop;
    stop.execute = executeStop;
    return stop;
  }
  var stop = stopChild;
  function checkStateIn(snapshot, _, {
    stateValue
  }) {
    if (typeof stateValue === "string" && isStateId(stateValue)) {
      const target = snapshot.machine.getStateNodeById(stateValue);
      return snapshot._nodes.some((sn) => sn === target);
    }
    return snapshot.matches(stateValue);
  }
  function stateIn(stateValue) {
    function stateIn() {
      {
        throw new Error(`This isn't supposed to be called`);
      }
    }
    stateIn.check = checkStateIn;
    stateIn.stateValue = stateValue;
    return stateIn;
  }
  function checkNot(snapshot, {
    context,
    event
  }, {
    guards
  }) {
    return !evaluateGuard(guards[0], context, event, snapshot);
  }
  function not(guard) {
    function not(_args, _params) {
      {
        throw new Error(`This isn't supposed to be called`);
      }
    }
    not.check = checkNot;
    not.guards = [guard];
    return not;
  }
  function checkAnd(snapshot, {
    context,
    event
  }, {
    guards
  }) {
    return guards.every((guard) => evaluateGuard(guard, context, event, snapshot));
  }
  function and(guards) {
    function and(_args, _params) {
      {
        throw new Error(`This isn't supposed to be called`);
      }
    }
    and.check = checkAnd;
    and.guards = guards;
    return and;
  }
  function checkOr(snapshot, {
    context,
    event
  }, {
    guards
  }) {
    return guards.some((guard) => evaluateGuard(guard, context, event, snapshot));
  }
  function or(guards) {
    function or(_args, _params) {
      {
        throw new Error(`This isn't supposed to be called`);
      }
    }
    or.check = checkOr;
    or.guards = guards;
    return or;
  }
  function evaluateGuard(guard, context, event, snapshot) {
    const {
      machine
    } = snapshot;
    const isInline = typeof guard === "function";
    const resolved = isInline ? guard : machine.implementations.guards[typeof guard === "string" ? guard : guard.type];
    if (!isInline && !resolved) {
      throw new Error(`Guard '${typeof guard === "string" ? guard : guard.type}' is not implemented.'.`);
    }
    if (typeof resolved !== "function") {
      return evaluateGuard(resolved, context, event, snapshot);
    }
    const guardArgs = {
      context,
      event
    };
    const guardParams = isInline || typeof guard === "string" ? undefined : ("params" in guard) ? typeof guard.params === "function" ? guard.params({
      context,
      event
    }) : guard.params : undefined;
    if (!("check" in resolved)) {
      return resolved(guardArgs, guardParams);
    }
    const builtinGuard = resolved;
    return builtinGuard.check(snapshot, guardArgs, resolved);
  }
  function isAtomicStateNode(stateNode) {
    return stateNode.type === "atomic" || stateNode.type === "final";
  }
  function getChildren(stateNode) {
    return Object.values(stateNode.states).filter((sn) => sn.type !== "history");
  }
  function getProperAncestors(stateNode, toStateNode) {
    const ancestors = [];
    if (toStateNode === stateNode) {
      return ancestors;
    }
    let m = stateNode.parent;
    while (m && m !== toStateNode) {
      ancestors.push(m);
      m = m.parent;
    }
    return ancestors;
  }
  function getAllStateNodes(stateNodes) {
    const nodeSet = new Set(stateNodes);
    const adjList = getAdjList(nodeSet);
    for (const s of nodeSet) {
      if (s.type === "compound" && (!adjList.get(s) || !adjList.get(s).length)) {
        getInitialStateNodesWithTheirAncestors(s).forEach((sn) => nodeSet.add(sn));
      } else {
        if (s.type === "parallel") {
          for (const child of getChildren(s)) {
            if (child.type === "history") {
              continue;
            }
            if (!nodeSet.has(child)) {
              const initialStates = getInitialStateNodesWithTheirAncestors(child);
              for (const initialStateNode of initialStates) {
                nodeSet.add(initialStateNode);
              }
            }
          }
        }
      }
    }
    for (const s of nodeSet) {
      let m = s.parent;
      while (m) {
        nodeSet.add(m);
        m = m.parent;
      }
    }
    return nodeSet;
  }
  function getValueFromAdj(baseNode, adjList) {
    const childStateNodes = adjList.get(baseNode);
    if (!childStateNodes) {
      return {};
    }
    if (baseNode.type === "compound") {
      const childStateNode = childStateNodes[0];
      if (childStateNode) {
        if (isAtomicStateNode(childStateNode)) {
          return childStateNode.key;
        }
      } else {
        return {};
      }
    }
    const stateValue = {};
    for (const childStateNode of childStateNodes) {
      stateValue[childStateNode.key] = getValueFromAdj(childStateNode, adjList);
    }
    return stateValue;
  }
  function getAdjList(stateNodes) {
    const adjList = new Map;
    for (const s of stateNodes) {
      if (!adjList.has(s)) {
        adjList.set(s, []);
      }
      if (s.parent) {
        if (!adjList.has(s.parent)) {
          adjList.set(s.parent, []);
        }
        adjList.get(s.parent).push(s);
      }
    }
    return adjList;
  }
  function getStateValue(rootNode, stateNodes) {
    const config = getAllStateNodes(stateNodes);
    return getValueFromAdj(rootNode, getAdjList(config));
  }
  function isInFinalState(stateNodeSet, stateNode) {
    if (stateNode.type === "compound") {
      return getChildren(stateNode).some((s) => s.type === "final" && stateNodeSet.has(s));
    }
    if (stateNode.type === "parallel") {
      return getChildren(stateNode).every((sn) => isInFinalState(stateNodeSet, sn));
    }
    return stateNode.type === "final";
  }
  var isStateId = (str) => str[0] === STATE_IDENTIFIER;
  function getCandidates(stateNode, receivedEventType) {
    const exactMatch = stateNode.transitions.get(receivedEventType);
    const wildcardCandidates = [...stateNode.transitions.keys()].filter((eventDescriptor) => eventDescriptor !== receivedEventType && matchesEventDescriptor(receivedEventType, eventDescriptor)).sort((a, b) => b.length - a.length).flatMap((key) => stateNode.transitions.get(key));
    return exactMatch ? [...exactMatch, ...wildcardCandidates] : wildcardCandidates;
  }
  function getDelayedTransitions(stateNode) {
    const afterConfig = stateNode.config.after;
    if (!afterConfig) {
      return [];
    }
    const mutateEntryExit = (delay) => {
      const afterEvent = createAfterEvent(delay, stateNode.id);
      const eventType = afterEvent.type;
      stateNode.entry.push(raise(afterEvent, {
        id: eventType,
        delay
      }));
      stateNode.exit.push(cancel(eventType));
      return eventType;
    };
    const delayedTransitions = Object.keys(afterConfig).flatMap((delay) => {
      const configTransition = afterConfig[delay];
      const resolvedTransition = typeof configTransition === "string" ? {
        target: configTransition
      } : configTransition;
      const resolvedDelay = Number.isNaN(+delay) ? delay : +delay;
      const eventType = mutateEntryExit(resolvedDelay);
      return toArray(resolvedTransition).map((transition) => ({
        ...transition,
        event: eventType,
        delay: resolvedDelay
      }));
    });
    return delayedTransitions.map((delayedTransition) => {
      const {
        delay
      } = delayedTransition;
      return {
        ...formatTransition(stateNode, delayedTransition.event, delayedTransition),
        delay
      };
    });
  }
  function formatTransition(stateNode, descriptor, transitionConfig) {
    const normalizedTarget = normalizeTarget(transitionConfig.target);
    const reenter = transitionConfig.reenter ?? false;
    const target = resolveTarget(stateNode, normalizedTarget);
    if (transitionConfig.cond) {
      throw new Error(`State "${stateNode.id}" has declared \`cond\` for one of its transitions. This property has been renamed to \`guard\`. Please update your code.`);
    }
    const transition = {
      ...transitionConfig,
      actions: toArray(transitionConfig.actions),
      guard: transitionConfig.guard,
      target,
      source: stateNode,
      reenter,
      eventType: descriptor,
      toJSON: () => ({
        ...transition,
        source: `#${stateNode.id}`,
        target: target ? target.map((t) => `#${t.id}`) : undefined
      })
    };
    return transition;
  }
  function formatTransitions(stateNode) {
    const transitions = new Map;
    if (stateNode.config.on) {
      for (const descriptor of Object.keys(stateNode.config.on)) {
        if (descriptor === NULL_EVENT) {
          throw new Error('Null events ("") cannot be specified as a transition key. Use `always: { ... }` instead.');
        }
        const transitionsConfig = stateNode.config.on[descriptor];
        transitions.set(descriptor, toTransitionConfigArray(transitionsConfig).map((t) => formatTransition(stateNode, descriptor, t)));
      }
    }
    if (stateNode.config.onDone) {
      const descriptor = `xstate.done.state.${stateNode.id}`;
      transitions.set(descriptor, toTransitionConfigArray(stateNode.config.onDone).map((t) => formatTransition(stateNode, descriptor, t)));
    }
    for (const invokeDef of stateNode.invoke) {
      if (invokeDef.onDone) {
        const descriptor = `xstate.done.actor.${invokeDef.id}`;
        transitions.set(descriptor, toTransitionConfigArray(invokeDef.onDone).map((t) => formatTransition(stateNode, descriptor, t)));
      }
      if (invokeDef.onError) {
        const descriptor = `xstate.error.actor.${invokeDef.id}`;
        transitions.set(descriptor, toTransitionConfigArray(invokeDef.onError).map((t) => formatTransition(stateNode, descriptor, t)));
      }
      if (invokeDef.onSnapshot) {
        const descriptor = `xstate.snapshot.${invokeDef.id}`;
        transitions.set(descriptor, toTransitionConfigArray(invokeDef.onSnapshot).map((t) => formatTransition(stateNode, descriptor, t)));
      }
    }
    for (const delayedTransition of stateNode.after) {
      let existing = transitions.get(delayedTransition.eventType);
      if (!existing) {
        existing = [];
        transitions.set(delayedTransition.eventType, existing);
      }
      existing.push(delayedTransition);
    }
    return transitions;
  }
  function formatRouteTransitions(rootStateNode) {
    const routeTransitions = [];
    const collectRoutes = (states) => {
      Object.values(states).forEach((sn) => {
        if (sn.config.route && sn.config.id) {
          const routeId = sn.config.id;
          const userGuard = sn.config.route.guard;
          const routeMatches = ({
            event
          }) => event.to === `#${routeId}`;
          const transition = {
            ...sn.config.route,
            guard: userGuard ? and([routeMatches, userGuard]) : routeMatches,
            target: `#${routeId}`
          };
          routeTransitions.push(formatTransition(rootStateNode, "xstate.route", transition));
        }
        if (sn.states) {
          collectRoutes(sn.states);
        }
      });
    };
    collectRoutes(rootStateNode.states);
    if (routeTransitions.length > 0) {
      rootStateNode.transitions.set("xstate.route", routeTransitions);
    }
  }
  function formatInitialTransition(stateNode, _target) {
    const resolvedTarget = typeof _target === "string" ? stateNode.states[_target] : _target ? stateNode.states[_target.target] : undefined;
    if (!resolvedTarget && _target) {
      throw new Error(`Initial state node "${_target}" not found on parent state node #${stateNode.id}`);
    }
    const transition = {
      source: stateNode,
      actions: !_target || typeof _target === "string" ? [] : toArray(_target.actions),
      eventType: null,
      reenter: false,
      target: resolvedTarget ? [resolvedTarget] : [],
      meta: typeof _target === "object" ? _target.meta : undefined,
      description: typeof _target === "object" ? _target.description : undefined,
      toJSON: () => ({
        ...transition,
        source: `#${stateNode.id}`,
        target: resolvedTarget ? [`#${resolvedTarget.id}`] : []
      })
    };
    return transition;
  }
  function resolveTarget(stateNode, targets) {
    if (targets === undefined) {
      return;
    }
    return targets.map((target) => {
      if (typeof target !== "string") {
        return target;
      }
      if (isStateId(target)) {
        return stateNode.machine.getStateNodeById(target);
      }
      const isInternalTarget = target[0] === STATE_DELIMITER;
      if (isInternalTarget && !stateNode.parent) {
        return getStateNodeByPath(stateNode, target.slice(1));
      }
      const resolvedTarget = isInternalTarget ? stateNode.key + target : target;
      if (stateNode.parent) {
        try {
          const targetStateNode = getStateNodeByPath(stateNode.parent, resolvedTarget);
          return targetStateNode;
        } catch (err) {
          throw new Error(`Invalid transition definition for state node '${stateNode.id}':
${err.message}`);
        }
      } else {
        throw new Error(`Invalid target: "${target}" is not a valid target from the root node. Did you mean ".${target}"?`);
      }
    });
  }
  function resolveHistoryDefaultTransition(stateNode) {
    const normalizedTarget = normalizeTarget(stateNode.config.target);
    if (!normalizedTarget) {
      if (stateNode.parent.type === "parallel") {
        return {
          target: [stateNode.parent]
        };
      }
      return stateNode.parent.initial;
    }
    return {
      target: normalizedTarget.map((t) => typeof t === "string" ? getStateNodeByPath(stateNode.parent, t) : t)
    };
  }
  function isHistoryNode(stateNode) {
    return stateNode.type === "history";
  }
  function getInitialStateNodesWithTheirAncestors(stateNode) {
    const states = getInitialStateNodes(stateNode);
    for (const initialState of states) {
      for (const ancestor of getProperAncestors(initialState, stateNode)) {
        states.add(ancestor);
      }
    }
    return states;
  }
  function getInitialStateNodes(stateNode) {
    const set = new Set;
    function iter(descStateNode) {
      if (set.has(descStateNode)) {
        return;
      }
      set.add(descStateNode);
      if (descStateNode.type === "compound") {
        iter(descStateNode.initial.target[0]);
      } else if (descStateNode.type === "parallel") {
        for (const child of getChildren(descStateNode)) {
          iter(child);
        }
      }
    }
    iter(stateNode);
    return set;
  }
  function getStateNode(stateNode, stateKey) {
    if (isStateId(stateKey)) {
      return stateNode.machine.getStateNodeById(stateKey);
    }
    if (!stateNode.states) {
      throw new Error(`Unable to retrieve child state '${stateKey}' from '${stateNode.id}'; no child states exist.`);
    }
    const result = stateNode.states[stateKey];
    if (!result) {
      throw new Error(`Child state '${stateKey}' does not exist on '${stateNode.id}'`);
    }
    return result;
  }
  function getStateNodeByPath(stateNode, statePath) {
    if (typeof statePath === "string" && isStateId(statePath)) {
      try {
        return stateNode.machine.getStateNodeById(statePath);
      } catch {}
    }
    const arrayStatePath = toStatePath(statePath).slice();
    let currentStateNode = stateNode;
    while (arrayStatePath.length) {
      const key = arrayStatePath.shift();
      if (!key.length) {
        break;
      }
      currentStateNode = getStateNode(currentStateNode, key);
    }
    return currentStateNode;
  }
  function getStateNodes(stateNode, stateValue) {
    if (typeof stateValue === "string") {
      const childStateNode = stateNode.states[stateValue];
      if (!childStateNode) {
        throw new Error(`State '${stateValue}' does not exist on '${stateNode.id}'`);
      }
      return [stateNode, childStateNode];
    }
    const childStateKeys = Object.keys(stateValue);
    const childStateNodes = childStateKeys.map((subStateKey) => getStateNode(stateNode, subStateKey)).filter(Boolean);
    return [stateNode.machine.root, stateNode].concat(childStateNodes, childStateKeys.reduce((allSubStateNodes, subStateKey) => {
      const subStateNode = getStateNode(stateNode, subStateKey);
      if (!subStateNode) {
        return allSubStateNodes;
      }
      const subStateNodes = getStateNodes(subStateNode, stateValue[subStateKey]);
      return allSubStateNodes.concat(subStateNodes);
    }, []));
  }
  function transitionAtomicNode(stateNode, stateValue, snapshot, event) {
    const childStateNode = getStateNode(stateNode, stateValue);
    const next = childStateNode.next(snapshot, event);
    if (!next || !next.length) {
      return stateNode.next(snapshot, event);
    }
    return next;
  }
  function transitionCompoundNode(stateNode, stateValue, snapshot, event) {
    const subStateKeys = Object.keys(stateValue);
    const childStateNode = getStateNode(stateNode, subStateKeys[0]);
    const next = transitionNode(childStateNode, stateValue[subStateKeys[0]], snapshot, event);
    if (!next || !next.length) {
      return stateNode.next(snapshot, event);
    }
    return next;
  }
  function transitionParallelNode(stateNode, stateValue, snapshot, event) {
    const allInnerTransitions = [];
    for (const subStateKey of Object.keys(stateValue)) {
      const subStateValue = stateValue[subStateKey];
      if (!subStateValue) {
        continue;
      }
      const subStateNode = getStateNode(stateNode, subStateKey);
      const innerTransitions = transitionNode(subStateNode, subStateValue, snapshot, event);
      if (innerTransitions) {
        allInnerTransitions.push(...innerTransitions);
      }
    }
    if (!allInnerTransitions.length) {
      return stateNode.next(snapshot, event);
    }
    return allInnerTransitions;
  }
  function transitionNode(stateNode, stateValue, snapshot, event) {
    if (typeof stateValue === "string") {
      return transitionAtomicNode(stateNode, stateValue, snapshot, event);
    }
    if (Object.keys(stateValue).length === 1) {
      return transitionCompoundNode(stateNode, stateValue, snapshot, event);
    }
    return transitionParallelNode(stateNode, stateValue, snapshot, event);
  }
  function getHistoryNodes(stateNode) {
    return Object.keys(stateNode.states).map((key) => stateNode.states[key]).filter((sn) => sn.type === "history");
  }
  function isDescendant(childStateNode, parentStateNode) {
    let marker = childStateNode;
    while (marker.parent && marker.parent !== parentStateNode) {
      marker = marker.parent;
    }
    return marker.parent === parentStateNode;
  }
  function hasIntersection(s1, s2) {
    const set1 = new Set(s1);
    const set2 = new Set(s2);
    for (const item of set1) {
      if (set2.has(item)) {
        return true;
      }
    }
    for (const item of set2) {
      if (set1.has(item)) {
        return true;
      }
    }
    return false;
  }
  function removeConflictingTransitions(enabledTransitions, stateNodeSet, historyValue) {
    const filteredTransitions = new Set;
    for (const t1 of enabledTransitions) {
      let t1Preempted = false;
      const transitionsToRemove = new Set;
      for (const t2 of filteredTransitions) {
        if (hasIntersection(computeExitSet([t1], stateNodeSet, historyValue), computeExitSet([t2], stateNodeSet, historyValue))) {
          if (isDescendant(t1.source, t2.source)) {
            transitionsToRemove.add(t2);
          } else {
            t1Preempted = true;
            break;
          }
        }
      }
      if (!t1Preempted) {
        for (const t3 of transitionsToRemove) {
          filteredTransitions.delete(t3);
        }
        filteredTransitions.add(t1);
      }
    }
    return Array.from(filteredTransitions);
  }
  function findLeastCommonAncestor(stateNodes) {
    const [head, ...tail] = stateNodes;
    for (const ancestor of getProperAncestors(head, undefined)) {
      if (tail.every((sn) => isDescendant(sn, ancestor))) {
        return ancestor;
      }
    }
  }
  function getEffectiveTargetStates(transition, historyValue) {
    if (!transition.target) {
      return [];
    }
    const targets = new Set;
    for (const targetNode of transition.target) {
      if (isHistoryNode(targetNode)) {
        if (historyValue[targetNode.id]) {
          for (const node of historyValue[targetNode.id]) {
            targets.add(node);
          }
        } else {
          for (const node of getEffectiveTargetStates(resolveHistoryDefaultTransition(targetNode), historyValue)) {
            targets.add(node);
          }
        }
      } else {
        targets.add(targetNode);
      }
    }
    return [...targets];
  }
  function getTransitionDomain(transition, historyValue) {
    const targetStates = getEffectiveTargetStates(transition, historyValue);
    if (!targetStates) {
      return;
    }
    if (!transition.reenter && targetStates.every((target) => target === transition.source || isDescendant(target, transition.source))) {
      return transition.source;
    }
    const lca = findLeastCommonAncestor(targetStates.concat(transition.source));
    if (lca) {
      return lca;
    }
    if (transition.reenter) {
      return;
    }
    return transition.source.machine.root;
  }
  function computeExitSet(transitions, stateNodeSet, historyValue) {
    const statesToExit = new Set;
    for (const t of transitions) {
      if (t.target?.length) {
        const domain = getTransitionDomain(t, historyValue);
        if (t.reenter && t.source === domain) {
          statesToExit.add(domain);
        }
        for (const stateNode of stateNodeSet) {
          if (isDescendant(stateNode, domain)) {
            statesToExit.add(stateNode);
          }
        }
      }
    }
    return [...statesToExit];
  }
  function areStateNodeCollectionsEqual(prevStateNodes, nextStateNodeSet) {
    if (prevStateNodes.length !== nextStateNodeSet.size) {
      return false;
    }
    for (const node of prevStateNodes) {
      if (!nextStateNodeSet.has(node)) {
        return false;
      }
    }
    return true;
  }
  function initialMicrostep(root, preInitialState, actorScope, initEvent, internalQueue) {
    return microstep([{
      target: [...getInitialStateNodes(root)],
      source: root,
      reenter: true,
      actions: [],
      eventType: null,
      toJSON: null
    }], preInitialState, actorScope, initEvent, true, internalQueue);
  }
  function microstep(transitions, currentSnapshot, actorScope, event, isInitial, internalQueue) {
    const actions = [];
    if (!transitions.length) {
      return [currentSnapshot, actions];
    }
    const originalExecutor = actorScope.actionExecutor;
    actorScope.actionExecutor = (action) => {
      actions.push(action);
      originalExecutor(action);
    };
    try {
      const mutStateNodeSet = new Set(currentSnapshot._nodes);
      let historyValue = currentSnapshot.historyValue;
      const filteredTransitions = removeConflictingTransitions(transitions, mutStateNodeSet, historyValue);
      let nextState = currentSnapshot;
      if (!isInitial) {
        [nextState, historyValue] = exitStates(nextState, event, actorScope, filteredTransitions, mutStateNodeSet, historyValue, internalQueue, actorScope.actionExecutor);
      }
      nextState = resolveActionsAndContext(nextState, event, actorScope, filteredTransitions.flatMap((t) => t.actions), internalQueue, undefined);
      nextState = enterStates(nextState, event, actorScope, filteredTransitions, mutStateNodeSet, internalQueue, historyValue, isInitial);
      const nextStateNodes = [...mutStateNodeSet];
      if (nextState.status === "done") {
        nextState = resolveActionsAndContext(nextState, event, actorScope, nextStateNodes.sort((a, b) => b.order - a.order).flatMap((state) => state.exit), internalQueue, undefined);
      }
      try {
        if (historyValue === currentSnapshot.historyValue && areStateNodeCollectionsEqual(currentSnapshot._nodes, mutStateNodeSet)) {
          return [nextState, actions];
        }
        return [cloneMachineSnapshot(nextState, {
          _nodes: nextStateNodes,
          historyValue
        }), actions];
      } catch (e) {
        throw e;
      }
    } finally {
      actorScope.actionExecutor = originalExecutor;
    }
  }
  function getMachineOutput(snapshot, event, actorScope, rootNode, rootCompletionNode) {
    if (rootNode.output === undefined) {
      return;
    }
    const doneStateEvent = createDoneStateEvent(rootCompletionNode.id, rootCompletionNode.output !== undefined && rootCompletionNode.parent ? resolveOutput(rootCompletionNode.output, snapshot.context, event, actorScope.self) : undefined);
    return resolveOutput(rootNode.output, snapshot.context, doneStateEvent, actorScope.self);
  }
  function enterStates(currentSnapshot, event, actorScope, filteredTransitions, mutStateNodeSet, internalQueue, historyValue, isInitial) {
    let nextSnapshot = currentSnapshot;
    const statesToEnter = new Set;
    const statesForDefaultEntry = new Set;
    computeEntrySet(filteredTransitions, historyValue, statesForDefaultEntry, statesToEnter);
    if (isInitial) {
      statesForDefaultEntry.add(currentSnapshot.machine.root);
    }
    const completedNodes = new Set;
    for (const stateNodeToEnter of [...statesToEnter].sort((a, b) => a.order - b.order)) {
      mutStateNodeSet.add(stateNodeToEnter);
      const actions = [];
      actions.push(...stateNodeToEnter.entry);
      for (const invokeDef of stateNodeToEnter.invoke) {
        actions.push(spawnChild(invokeDef.src, {
          ...invokeDef,
          syncSnapshot: !!invokeDef.onSnapshot
        }));
      }
      if (statesForDefaultEntry.has(stateNodeToEnter)) {
        const initialActions = stateNodeToEnter.initial.actions;
        actions.push(...initialActions);
      }
      nextSnapshot = resolveActionsAndContext(nextSnapshot, event, actorScope, actions, internalQueue, stateNodeToEnter.invoke.map((invokeDef) => invokeDef.id));
      if (stateNodeToEnter.type === "final") {
        const parent = stateNodeToEnter.parent;
        let ancestorMarker = parent?.type === "parallel" ? parent : parent?.parent;
        let rootCompletionNode = ancestorMarker || stateNodeToEnter;
        if (parent?.type === "compound") {
          internalQueue.push(createDoneStateEvent(parent.id, stateNodeToEnter.output !== undefined ? resolveOutput(stateNodeToEnter.output, nextSnapshot.context, event, actorScope.self) : undefined));
        }
        while (ancestorMarker?.type === "parallel" && !completedNodes.has(ancestorMarker) && isInFinalState(mutStateNodeSet, ancestorMarker)) {
          completedNodes.add(ancestorMarker);
          internalQueue.push(createDoneStateEvent(ancestorMarker.id));
          rootCompletionNode = ancestorMarker;
          ancestorMarker = ancestorMarker.parent;
        }
        if (ancestorMarker) {
          continue;
        }
        nextSnapshot = cloneMachineSnapshot(nextSnapshot, {
          status: "done",
          output: getMachineOutput(nextSnapshot, event, actorScope, nextSnapshot.machine.root, rootCompletionNode)
        });
      }
    }
    return nextSnapshot;
  }
  function computeEntrySet(transitions, historyValue, statesForDefaultEntry, statesToEnter) {
    for (const t of transitions) {
      const domain = getTransitionDomain(t, historyValue);
      for (const s of t.target || []) {
        if (!isHistoryNode(s) && (t.source !== s || t.source !== domain || t.reenter)) {
          statesToEnter.add(s);
          statesForDefaultEntry.add(s);
        }
        addDescendantStatesToEnter(s, historyValue, statesForDefaultEntry, statesToEnter);
      }
      const targetStates = getEffectiveTargetStates(t, historyValue);
      for (const s of targetStates) {
        const ancestors = getProperAncestors(s, domain);
        if (domain?.type === "parallel") {
          ancestors.push(domain);
        }
        addAncestorStatesToEnter(statesToEnter, historyValue, statesForDefaultEntry, ancestors, !t.source.parent && t.reenter ? undefined : domain);
      }
    }
  }
  function addDescendantStatesToEnter(stateNode, historyValue, statesForDefaultEntry, statesToEnter) {
    if (isHistoryNode(stateNode)) {
      if (historyValue[stateNode.id]) {
        const historyStateNodes = historyValue[stateNode.id];
        for (const s of historyStateNodes) {
          statesToEnter.add(s);
          addDescendantStatesToEnter(s, historyValue, statesForDefaultEntry, statesToEnter);
        }
        for (const s of historyStateNodes) {
          addProperAncestorStatesToEnter(s, stateNode.parent, statesToEnter, historyValue, statesForDefaultEntry);
        }
      } else {
        const historyDefaultTransition = resolveHistoryDefaultTransition(stateNode);
        for (const s of historyDefaultTransition.target) {
          statesToEnter.add(s);
          if (historyDefaultTransition === stateNode.parent?.initial) {
            statesForDefaultEntry.add(stateNode.parent);
          }
          addDescendantStatesToEnter(s, historyValue, statesForDefaultEntry, statesToEnter);
        }
        for (const s of historyDefaultTransition.target) {
          addProperAncestorStatesToEnter(s, stateNode.parent, statesToEnter, historyValue, statesForDefaultEntry);
        }
      }
    } else {
      if (stateNode.type === "compound") {
        const [initialState] = stateNode.initial.target;
        if (!isHistoryNode(initialState)) {
          statesToEnter.add(initialState);
          statesForDefaultEntry.add(initialState);
        }
        addDescendantStatesToEnter(initialState, historyValue, statesForDefaultEntry, statesToEnter);
        addProperAncestorStatesToEnter(initialState, stateNode, statesToEnter, historyValue, statesForDefaultEntry);
      } else {
        if (stateNode.type === "parallel") {
          for (const child of getChildren(stateNode).filter((sn) => !isHistoryNode(sn))) {
            if (![...statesToEnter].some((s) => isDescendant(s, child))) {
              if (!isHistoryNode(child)) {
                statesToEnter.add(child);
                statesForDefaultEntry.add(child);
              }
              addDescendantStatesToEnter(child, historyValue, statesForDefaultEntry, statesToEnter);
            }
          }
        }
      }
    }
  }
  function addAncestorStatesToEnter(statesToEnter, historyValue, statesForDefaultEntry, ancestors, reentrancyDomain) {
    for (const anc of ancestors) {
      if (!reentrancyDomain || isDescendant(anc, reentrancyDomain)) {
        statesToEnter.add(anc);
      }
      if (anc.type === "parallel") {
        for (const child of getChildren(anc).filter((sn) => !isHistoryNode(sn))) {
          if (![...statesToEnter].some((s) => isDescendant(s, child))) {
            statesToEnter.add(child);
            addDescendantStatesToEnter(child, historyValue, statesForDefaultEntry, statesToEnter);
          }
        }
      }
    }
  }
  function addProperAncestorStatesToEnter(stateNode, toStateNode, statesToEnter, historyValue, statesForDefaultEntry) {
    addAncestorStatesToEnter(statesToEnter, historyValue, statesForDefaultEntry, getProperAncestors(stateNode, toStateNode));
  }
  function exitStates(currentSnapshot, event, actorScope, transitions, mutStateNodeSet, historyValue, internalQueue, _actionExecutor) {
    let nextSnapshot = currentSnapshot;
    const statesToExit = computeExitSet(transitions, mutStateNodeSet, historyValue);
    statesToExit.sort((a, b) => b.order - a.order);
    let changedHistory;
    for (const exitStateNode of statesToExit) {
      for (const historyNode of getHistoryNodes(exitStateNode)) {
        let predicate;
        if (historyNode.history === "deep") {
          predicate = (sn) => isAtomicStateNode(sn) && isDescendant(sn, exitStateNode);
        } else {
          predicate = (sn) => {
            return sn.parent === exitStateNode;
          };
        }
        changedHistory ??= {
          ...historyValue
        };
        changedHistory[historyNode.id] = Array.from(mutStateNodeSet).filter(predicate);
      }
    }
    for (const s of statesToExit) {
      nextSnapshot = resolveActionsAndContext(nextSnapshot, event, actorScope, [...s.exit, ...s.invoke.map((def) => stopChild(def.id))], internalQueue, undefined);
      mutStateNodeSet.delete(s);
    }
    return [nextSnapshot, changedHistory || historyValue];
  }
  function getAction(machine, actionType) {
    return machine.implementations.actions[actionType];
  }
  function resolveAndExecuteActionsWithContext(currentSnapshot, event, actorScope, actions, extra, retries) {
    const {
      machine
    } = currentSnapshot;
    let intermediateSnapshot = currentSnapshot;
    for (const action of actions) {
      const isInline = typeof action === "function";
      const resolvedAction = isInline ? action : getAction(machine, typeof action === "string" ? action : action.type);
      const actionArgs = {
        context: intermediateSnapshot.context,
        event,
        self: actorScope.self,
        system: actorScope.system
      };
      const actionParams = isInline || typeof action === "string" ? undefined : ("params" in action) ? typeof action.params === "function" ? action.params({
        context: intermediateSnapshot.context,
        event
      }) : action.params : undefined;
      if (!resolvedAction || !("resolve" in resolvedAction)) {
        actorScope.actionExecutor({
          type: typeof action === "string" ? action : typeof action === "object" ? action.type : action.name || "(anonymous)",
          info: actionArgs,
          params: actionParams,
          exec: resolvedAction
        });
        continue;
      }
      const builtinAction = resolvedAction;
      const [nextState, params, actions] = builtinAction.resolve(actorScope, intermediateSnapshot, actionArgs, actionParams, resolvedAction, extra);
      intermediateSnapshot = nextState;
      if ("retryResolve" in builtinAction) {
        retries?.push([builtinAction, params]);
      }
      if ("execute" in builtinAction) {
        actorScope.actionExecutor({
          type: builtinAction.type,
          info: actionArgs,
          params,
          exec: builtinAction.execute.bind(null, actorScope, params)
        });
      }
      if (actions) {
        intermediateSnapshot = resolveAndExecuteActionsWithContext(intermediateSnapshot, event, actorScope, actions, extra, retries);
      }
    }
    return intermediateSnapshot;
  }
  function resolveActionsAndContext(currentSnapshot, event, actorScope, actions, internalQueue, deferredActorIds) {
    const retries = deferredActorIds ? [] : undefined;
    const nextState = resolveAndExecuteActionsWithContext(currentSnapshot, event, actorScope, actions, {
      internalQueue,
      deferredActorIds
    }, retries);
    retries?.forEach(([builtinAction, params]) => {
      builtinAction.retryResolve(actorScope, nextState, params);
    });
    return nextState;
  }
  function macrostep(snapshot, event, actorScope, internalQueue) {
    if (event.type === WILDCARD) {
      throw new Error(`An event cannot have the wildcard type ('${WILDCARD}')`);
    }
    let nextSnapshot = snapshot;
    const microsteps = [];
    function addMicrostep(step, event, transitions) {
      actorScope.system._sendInspectionEvent({
        type: "@xstate.microstep",
        actorRef: actorScope.self,
        event,
        snapshot: step[0],
        _transitions: transitions
      });
      microsteps.push(step);
    }
    if (event.type === XSTATE_STOP) {
      nextSnapshot = cloneMachineSnapshot(stopChildren(nextSnapshot, event, actorScope), {
        status: "stopped"
      });
      addMicrostep([nextSnapshot, []], event, []);
      return {
        snapshot: nextSnapshot,
        microsteps
      };
    }
    let nextEvent = event;
    if (nextEvent.type !== XSTATE_INIT) {
      const currentEvent = nextEvent;
      const isErr = isErrorActorEvent(currentEvent);
      const transitions = selectTransitions(currentEvent, nextSnapshot);
      if (isErr && !transitions.length) {
        nextSnapshot = cloneMachineSnapshot(snapshot, {
          status: "error",
          error: currentEvent.error
        });
        addMicrostep([nextSnapshot, []], currentEvent, []);
        return {
          snapshot: nextSnapshot,
          microsteps
        };
      }
      const step = microstep(transitions, snapshot, actorScope, nextEvent, false, internalQueue);
      nextSnapshot = step[0];
      addMicrostep(step, currentEvent, transitions);
    }
    let shouldSelectEventlessTransitions = true;
    const maxIterations = snapshot.machine.options?.maxIterations ?? Infinity;
    let iterationCount = 0;
    while (nextSnapshot.status === "active") {
      iterationCount++;
      if (iterationCount > maxIterations) {
        throw new Error(`Infinite loop detected: the machine has processed more than ${maxIterations} microsteps without reaching a stable state. This usually happens when there's a cycle of transitions (e.g., eventless transitions or raised events causing state A -> B -> C -> A).`);
      }
      let enabledTransitions = shouldSelectEventlessTransitions ? selectEventlessTransitions(nextSnapshot, nextEvent) : [];
      const previousState = enabledTransitions.length ? nextSnapshot : undefined;
      if (!enabledTransitions.length) {
        if (!internalQueue.length) {
          break;
        }
        nextEvent = internalQueue.shift();
        enabledTransitions = selectTransitions(nextEvent, nextSnapshot);
      }
      const step = microstep(enabledTransitions, nextSnapshot, actorScope, nextEvent, false, internalQueue);
      nextSnapshot = step[0];
      shouldSelectEventlessTransitions = nextSnapshot !== previousState;
      addMicrostep(step, nextEvent, enabledTransitions);
    }
    if (nextSnapshot.status !== "active") {
      stopChildren(nextSnapshot, nextEvent, actorScope);
    }
    return {
      snapshot: nextSnapshot,
      microsteps
    };
  }
  function stopChildren(nextState, event, actorScope) {
    return resolveActionsAndContext(nextState, event, actorScope, Object.values(nextState.children).map((child) => stopChild(child)), [], undefined);
  }
  function selectTransitions(event, nextState) {
    return nextState.machine.getTransitionData(nextState, event);
  }
  function selectEventlessTransitions(nextState, event) {
    const enabledTransitionSet = new Set;
    const atomicStates = nextState._nodes.filter(isAtomicStateNode);
    for (const stateNode of atomicStates) {
      loop:
        for (const s of [stateNode].concat(getProperAncestors(stateNode, undefined))) {
          if (!s.always) {
            continue;
          }
          for (const transition of s.always) {
            if (transition.guard === undefined || evaluateGuard(transition.guard, nextState.context, event, nextState)) {
              enabledTransitionSet.add(transition);
              break loop;
            }
          }
        }
    }
    return removeConflictingTransitions(Array.from(enabledTransitionSet), new Set(nextState._nodes), nextState.historyValue);
  }
  function resolveStateValue(rootNode, stateValue) {
    const allStateNodes = getAllStateNodes(getStateNodes(rootNode, stateValue));
    return getStateValue(rootNode, [...allStateNodes]);
  }
  function isMachineSnapshot(value) {
    return !!value && typeof value === "object" && "machine" in value && "value" in value;
  }
  var machineSnapshotMatches = function matches(testValue) {
    return matchesState(testValue, this.value);
  };
  var machineSnapshotHasTag = function hasTag(tag) {
    return this.tags.has(tag);
  };
  var machineSnapshotCan = function can(event) {
    if (!this.machine) {
      console.warn(`state.can(...) used outside of a machine-created State object; this will always return false.`);
    }
    const transitionData = this.machine.getTransitionData(this, event);
    return !!transitionData?.length && transitionData.some((t) => t.target !== undefined || t.actions.length);
  };
  var machineSnapshotToJSON = function toJSON() {
    const {
      _nodes: nodes,
      tags,
      machine,
      getMeta,
      toJSON,
      can,
      hasTag,
      matches,
      ...jsonValues
    } = this;
    return {
      ...jsonValues,
      tags: Array.from(tags)
    };
  };
  var machineSnapshotGetMeta = function getMeta() {
    return this._nodes.reduce((acc, stateNode) => {
      if (stateNode.meta !== undefined) {
        acc[stateNode.id] = stateNode.meta;
      }
      return acc;
    }, {});
  };
  function createMachineSnapshot(config, machine) {
    return {
      status: config.status,
      output: config.output,
      error: config.error,
      machine,
      context: config.context,
      _nodes: config._nodes,
      value: getStateValue(machine.root, config._nodes),
      tags: new Set(config._nodes.flatMap((sn) => sn.tags)),
      children: config.children,
      historyValue: config.historyValue || {},
      matches: machineSnapshotMatches,
      hasTag: machineSnapshotHasTag,
      can: machineSnapshotCan,
      getMeta: machineSnapshotGetMeta,
      toJSON: machineSnapshotToJSON
    };
  }
  function cloneMachineSnapshot(snapshot, config = {}) {
    return createMachineSnapshot({
      ...snapshot,
      ...config
    }, snapshot.machine);
  }
  function serializeHistoryValue(historyValue) {
    if (typeof historyValue !== "object" || historyValue === null) {
      return {};
    }
    const result = {};
    for (const key in historyValue) {
      const value = historyValue[key];
      if (Array.isArray(value)) {
        result[key] = value.map((item) => ({
          id: item.id
        }));
      }
    }
    return result;
  }
  function getPersistedSnapshot(snapshot, options) {
    const {
      _nodes: nodes,
      tags,
      machine,
      children,
      context,
      can,
      hasTag,
      matches,
      getMeta,
      toJSON,
      ...jsonValues
    } = snapshot;
    const childrenJson = {};
    for (const id in children) {
      const child = children[id];
      if (typeof child.src !== "string" && (!options || !("__unsafeAllowInlineActors" in options))) {
        throw new Error("An inline child actor cannot be persisted.");
      }
      childrenJson[id] = {
        snapshot: child.getPersistedSnapshot(options),
        src: child.src,
        systemId: child.systemId,
        syncSnapshot: child._syncSnapshot
      };
    }
    const persisted = {
      ...jsonValues,
      context: persistContext(context),
      children: childrenJson,
      historyValue: serializeHistoryValue(jsonValues.historyValue)
    };
    return persisted;
  }
  function persistContext(contextPart) {
    let copy;
    for (const key in contextPart) {
      const value = contextPart[key];
      if (value && typeof value === "object") {
        if ("sessionId" in value && "send" in value && "ref" in value) {
          copy ??= Array.isArray(contextPart) ? contextPart.slice() : {
            ...contextPart
          };
          copy[key] = {
            xstate$$type: $$ACTOR_TYPE,
            id: value.id
          };
        } else {
          const result = persistContext(value);
          if (result !== value) {
            copy ??= Array.isArray(contextPart) ? contextPart.slice() : {
              ...contextPart
            };
            copy[key] = result;
          }
        }
      }
    }
    return copy ?? contextPart;
  }
  function resolveRaise(_, snapshot, args, actionParams, {
    event: eventOrExpr,
    id,
    delay
  }, {
    internalQueue
  }) {
    const delaysMap = snapshot.machine.implementations.delays;
    if (typeof eventOrExpr === "string") {
      throw new Error(`Only event objects may be used with raise; use raise({ type: "${eventOrExpr}" }) instead`);
    }
    const resolvedEvent = typeof eventOrExpr === "function" ? eventOrExpr(args, actionParams) : eventOrExpr;
    let resolvedDelay;
    if (typeof delay === "string") {
      const configDelay = delaysMap && delaysMap[delay];
      resolvedDelay = typeof configDelay === "function" ? configDelay(args, actionParams) : configDelay;
    } else {
      resolvedDelay = typeof delay === "function" ? delay(args, actionParams) : delay;
    }
    if (typeof resolvedDelay !== "number") {
      internalQueue.push(resolvedEvent);
    }
    return [snapshot, {
      event: resolvedEvent,
      id,
      delay: resolvedDelay
    }, undefined];
  }
  function executeRaise(actorScope, params) {
    const {
      event,
      delay,
      id
    } = params;
    if (typeof delay === "number") {
      actorScope.defer(() => {
        const self2 = actorScope.self;
        actorScope.system.scheduler.schedule(self2, self2, event, delay, id);
      });
      return;
    }
  }
  function raise(eventOrExpr, options) {
    if (exports.executingCustomAction) {
      console.warn("Custom actions should not call `raise()` directly, as it is not imperative. See https://stately.ai/docs/actions#built-in-actions for more details.");
    }
    function raise(_args, _params) {
      {
        throw new Error(`This isn't supposed to be called`);
      }
    }
    raise.type = "xstate.raise";
    raise.event = eventOrExpr;
    raise.id = options?.id;
    raise.delay = options?.delay;
    raise.resolve = resolveRaise;
    raise.execute = executeRaise;
    return raise;
  }
  exports.$$ACTOR_TYPE = $$ACTOR_TYPE;
  exports.Actor = Actor;
  exports.NULL_EVENT = NULL_EVENT;
  exports.ProcessingStatus = ProcessingStatus;
  exports.STATE_DELIMITER = STATE_DELIMITER;
  exports.XSTATE_ERROR = XSTATE_ERROR;
  exports.XSTATE_STOP = XSTATE_STOP;
  exports.and = and;
  exports.cancel = cancel;
  exports.cloneMachineSnapshot = cloneMachineSnapshot;
  exports.createActor = createActor;
  exports.createErrorActorEvent = createErrorActorEvent;
  exports.createInitEvent = createInitEvent;
  exports.createInvokeId = createInvokeId;
  exports.createMachineSnapshot = createMachineSnapshot;
  exports.createSystem = createSystem;
  exports.evaluateGuard = evaluateGuard;
  exports.formatInitialTransition = formatInitialTransition;
  exports.formatRouteTransitions = formatRouteTransitions;
  exports.formatTransition = formatTransition;
  exports.formatTransitions = formatTransitions;
  exports.getAllOwnEventDescriptors = getAllOwnEventDescriptors;
  exports.getAllStateNodes = getAllStateNodes;
  exports.getCandidates = getCandidates;
  exports.getDelayedTransitions = getDelayedTransitions;
  exports.getPersistedSnapshot = getPersistedSnapshot;
  exports.getProperAncestors = getProperAncestors;
  exports.getStateNodeByPath = getStateNodeByPath;
  exports.getStateNodes = getStateNodes;
  exports.initialMicrostep = initialMicrostep;
  exports.interpret = interpret;
  exports.isAtomicStateNode = isAtomicStateNode;
  exports.isInFinalState = isInFinalState;
  exports.isMachineSnapshot = isMachineSnapshot;
  exports.isStateId = isStateId;
  exports.macrostep = macrostep;
  exports.mapValues = mapValues;
  exports.matchesEventDescriptor = matchesEventDescriptor;
  exports.matchesState = matchesState;
  exports.not = not;
  exports.or = or;
  exports.pathToStateValue = pathToStateValue;
  exports.raise = raise;
  exports.resolveActionsAndContext = resolveActionsAndContext;
  exports.resolveReferencedActor = resolveReferencedActor;
  exports.resolveStateValue = resolveStateValue;
  exports.spawnChild = spawnChild;
  exports.stateIn = stateIn;
  exports.stop = stop;
  exports.stopChild = stopChild;
  exports.toArray = toArray;
  exports.toObserver = toObserver;
  exports.toStatePath = toStatePath;
  exports.toTransitionConfigArray = toTransitionConfigArray;
  exports.transitionNode = transitionNode;
});

// node_modules/xstate/dist/xstate-actors.development.cjs.js
var require_xstate_actors_development_cjs = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  var dist_xstateGuards = require_raise_6dbf7d60_development_cjs();
  require_xstate_dev_development_cjs();
  function fromTransition(transition, initialContext) {
    return {
      config: transition,
      transition: (snapshot, event, actorScope) => {
        return {
          ...snapshot,
          context: transition(snapshot.context, event, actorScope)
        };
      },
      getInitialSnapshot: (_, input) => {
        return {
          status: "active",
          output: undefined,
          error: undefined,
          context: typeof initialContext === "function" ? initialContext({
            input
          }) : initialContext
        };
      },
      getPersistedSnapshot: (snapshot) => snapshot,
      restoreSnapshot: (snapshot) => snapshot
    };
  }
  var instanceStates = /* @__PURE__ */ new WeakMap;
  function fromCallback(callback) {
    const logic = {
      config: callback,
      start: (state, actorScope) => {
        const {
          self: self2,
          system,
          emit
        } = actorScope;
        const callbackState = {
          receivers: undefined,
          dispose: undefined
        };
        instanceStates.set(self2, callbackState);
        callbackState.dispose = callback({
          input: state.input,
          system,
          self: self2,
          sendBack: (event) => {
            if (self2.getSnapshot().status === "stopped") {
              return;
            }
            if (self2._parent) {
              system._relay(self2, self2._parent, event);
            }
          },
          receive: (listener) => {
            callbackState.receivers ??= new Set;
            callbackState.receivers.add(listener);
          },
          emit
        });
      },
      transition: (state, event, actorScope) => {
        const callbackState = instanceStates.get(actorScope.self);
        if (event.type === dist_xstateGuards.XSTATE_STOP) {
          state = {
            ...state,
            status: "stopped",
            error: undefined
          };
          instanceStates.delete(actorScope.self);
          callbackState.receivers?.clear();
          callbackState.dispose?.();
          return state;
        }
        callbackState.receivers?.forEach((receiver) => receiver(event));
        return state;
      },
      getInitialSnapshot: (_, input) => {
        return {
          status: "active",
          output: undefined,
          error: undefined,
          input
        };
      },
      getPersistedSnapshot: (snapshot) => snapshot,
      restoreSnapshot: (snapshot) => snapshot
    };
    return logic;
  }
  var XSTATE_OBSERVABLE_NEXT = "xstate.observable.next";
  var XSTATE_OBSERVABLE_ERROR = "xstate.observable.error";
  var XSTATE_OBSERVABLE_COMPLETE = "xstate.observable.complete";
  function fromObservable(observableCreator) {
    const logic = {
      config: observableCreator,
      transition: (snapshot, event) => {
        if (snapshot.status !== "active") {
          return snapshot;
        }
        switch (event.type) {
          case XSTATE_OBSERVABLE_NEXT: {
            const newSnapshot = {
              ...snapshot,
              context: event.data
            };
            return newSnapshot;
          }
          case XSTATE_OBSERVABLE_ERROR:
            return {
              ...snapshot,
              status: "error",
              error: event.data,
              input: undefined,
              _subscription: undefined
            };
          case XSTATE_OBSERVABLE_COMPLETE:
            return {
              ...snapshot,
              status: "done",
              input: undefined,
              _subscription: undefined
            };
          case dist_xstateGuards.XSTATE_STOP:
            snapshot._subscription.unsubscribe();
            return {
              ...snapshot,
              status: "stopped",
              input: undefined,
              _subscription: undefined
            };
          default:
            return snapshot;
        }
      },
      getInitialSnapshot: (_, input) => {
        return {
          status: "active",
          output: undefined,
          error: undefined,
          context: undefined,
          input,
          _subscription: undefined
        };
      },
      start: (state, {
        self: self2,
        system,
        emit
      }) => {
        if (state.status === "done") {
          return;
        }
        state._subscription = observableCreator({
          input: state.input,
          system,
          self: self2,
          emit
        }).subscribe({
          next: (value) => {
            system._relay(self2, self2, {
              type: XSTATE_OBSERVABLE_NEXT,
              data: value
            });
          },
          error: (err) => {
            system._relay(self2, self2, {
              type: XSTATE_OBSERVABLE_ERROR,
              data: err
            });
          },
          complete: () => {
            system._relay(self2, self2, {
              type: XSTATE_OBSERVABLE_COMPLETE
            });
          }
        });
      },
      getPersistedSnapshot: ({
        _subscription,
        ...state
      }) => state,
      restoreSnapshot: (state) => ({
        ...state,
        _subscription: undefined
      })
    };
    return logic;
  }
  function fromEventObservable(lazyObservable) {
    const logic = {
      config: lazyObservable,
      transition: (state, event) => {
        if (state.status !== "active") {
          return state;
        }
        switch (event.type) {
          case XSTATE_OBSERVABLE_ERROR:
            return {
              ...state,
              status: "error",
              error: event.data,
              input: undefined,
              _subscription: undefined
            };
          case XSTATE_OBSERVABLE_COMPLETE:
            return {
              ...state,
              status: "done",
              input: undefined,
              _subscription: undefined
            };
          case dist_xstateGuards.XSTATE_STOP:
            state._subscription.unsubscribe();
            return {
              ...state,
              status: "stopped",
              input: undefined,
              _subscription: undefined
            };
          default:
            return state;
        }
      },
      getInitialSnapshot: (_, input) => {
        return {
          status: "active",
          output: undefined,
          error: undefined,
          context: undefined,
          input,
          _subscription: undefined
        };
      },
      start: (state, {
        self: self2,
        system,
        emit
      }) => {
        if (state.status === "done") {
          return;
        }
        state._subscription = lazyObservable({
          input: state.input,
          system,
          self: self2,
          emit
        }).subscribe({
          next: (value) => {
            if (self2._parent) {
              system._relay(self2, self2._parent, value);
            }
          },
          error: (err) => {
            system._relay(self2, self2, {
              type: XSTATE_OBSERVABLE_ERROR,
              data: err
            });
          },
          complete: () => {
            system._relay(self2, self2, {
              type: XSTATE_OBSERVABLE_COMPLETE
            });
          }
        });
      },
      getPersistedSnapshot: ({
        _subscription,
        ...snapshot
      }) => snapshot,
      restoreSnapshot: (snapshot) => ({
        ...snapshot,
        _subscription: undefined
      })
    };
    return logic;
  }
  var XSTATE_PROMISE_RESOLVE = "xstate.promise.resolve";
  var XSTATE_PROMISE_REJECT = "xstate.promise.reject";
  var controllerMap = new WeakMap;
  function fromPromise(promiseCreator) {
    const logic = {
      config: promiseCreator,
      transition: (state, event, scope) => {
        if (state.status !== "active") {
          return state;
        }
        switch (event.type) {
          case XSTATE_PROMISE_RESOLVE: {
            const resolvedValue = event.data;
            return {
              ...state,
              status: "done",
              output: resolvedValue,
              input: undefined
            };
          }
          case XSTATE_PROMISE_REJECT:
            return {
              ...state,
              status: "error",
              error: event.data,
              input: undefined
            };
          case dist_xstateGuards.XSTATE_STOP: {
            controllerMap.get(scope.self)?.abort();
            controllerMap.delete(scope.self);
            return {
              ...state,
              status: "stopped",
              input: undefined
            };
          }
          default:
            return state;
        }
      },
      start: (state, {
        self: self2,
        system,
        emit
      }) => {
        if (state.status !== "active") {
          return;
        }
        const controller = new AbortController;
        controllerMap.set(self2, controller);
        const resolvedPromise = Promise.resolve(promiseCreator({
          input: state.input,
          system,
          self: self2,
          signal: controller.signal,
          emit
        }));
        resolvedPromise.then((response) => {
          if (self2.getSnapshot().status !== "active") {
            return;
          }
          controllerMap.delete(self2);
          system._relay(self2, self2, {
            type: XSTATE_PROMISE_RESOLVE,
            data: response
          });
        }, (errorData) => {
          if (self2.getSnapshot().status !== "active") {
            return;
          }
          controllerMap.delete(self2);
          system._relay(self2, self2, {
            type: XSTATE_PROMISE_REJECT,
            data: errorData
          });
        });
      },
      getInitialSnapshot: (_, input) => {
        return {
          status: "active",
          output: undefined,
          error: undefined,
          input
        };
      },
      getPersistedSnapshot: (snapshot) => snapshot,
      restoreSnapshot: (snapshot) => snapshot
    };
    return logic;
  }
  var emptyLogic = fromTransition((_) => {
    return;
  }, undefined);
  function createEmptyActor() {
    return dist_xstateGuards.createActor(emptyLogic);
  }
  exports.createEmptyActor = createEmptyActor;
  exports.fromCallback = fromCallback;
  exports.fromEventObservable = fromEventObservable;
  exports.fromObservable = fromObservable;
  exports.fromPromise = fromPromise;
  exports.fromTransition = fromTransition;
});

// node_modules/xstate/dist/assign-22c2f2aa.development.cjs.js
var require_assign_22c2f2aa_development_cjs = __commonJS(function(exports) {
  var dist_xstateGuards = require_raise_6dbf7d60_development_cjs();
  function createSpawner(actorScope, {
    machine,
    context
  }, event, spawnedChildren) {
    const spawn = (src, options) => {
      if (typeof src === "string") {
        const logic = dist_xstateGuards.resolveReferencedActor(machine, src);
        if (!logic) {
          throw new Error(`Actor logic '${src}' not implemented in machine '${machine.id}'`);
        }
        const actorRef = dist_xstateGuards.createActor(logic, {
          id: options?.id,
          parent: actorScope.self,
          syncSnapshot: options?.syncSnapshot,
          input: typeof options?.input === "function" ? options.input({
            context,
            event,
            self: actorScope.self
          }) : options?.input,
          src,
          systemId: options?.systemId
        });
        spawnedChildren[actorRef.id] = actorRef;
        return actorRef;
      } else {
        const actorRef = dist_xstateGuards.createActor(src, {
          id: options?.id,
          parent: actorScope.self,
          syncSnapshot: options?.syncSnapshot,
          input: options?.input,
          src,
          systemId: options?.systemId
        });
        return actorRef;
      }
    };
    return (src, options) => {
      const actorRef = spawn(src, options);
      spawnedChildren[actorRef.id] = actorRef;
      actorScope.defer(() => {
        if (actorRef._processingStatus === dist_xstateGuards.ProcessingStatus.Stopped) {
          return;
        }
        actorRef.start();
      });
      return actorRef;
    };
  }
  function resolveAssign(actorScope, snapshot, actionArgs, actionParams, {
    assignment
  }) {
    if (!snapshot.context) {
      throw new Error("Cannot assign to undefined `context`. Ensure that `context` is defined in the machine config.");
    }
    const spawnedChildren = {};
    const assignArgs = {
      context: snapshot.context,
      event: actionArgs.event,
      spawn: createSpawner(actorScope, snapshot, actionArgs.event, spawnedChildren),
      self: actorScope.self,
      system: actorScope.system
    };
    let partialUpdate = {};
    if (typeof assignment === "function") {
      partialUpdate = assignment(assignArgs, actionParams);
    } else {
      for (const key of Object.keys(assignment)) {
        const propAssignment = assignment[key];
        partialUpdate[key] = typeof propAssignment === "function" ? propAssignment(assignArgs, actionParams) : propAssignment;
      }
    }
    const updatedContext = Object.assign({}, snapshot.context, partialUpdate);
    return [dist_xstateGuards.cloneMachineSnapshot(snapshot, {
      context: updatedContext,
      children: Object.keys(spawnedChildren).length ? {
        ...snapshot.children,
        ...spawnedChildren
      } : snapshot.children
    }), undefined, undefined];
  }
  function assign(assignment) {
    if (dist_xstateGuards.executingCustomAction) {
      console.warn("Custom actions should not call `assign()` directly, as it is not imperative. See https://stately.ai/docs/actions#built-in-actions for more details.");
    }
    function assign(_args, _params) {
      {
        throw new Error(`This isn't supposed to be called`);
      }
    }
    assign.type = "xstate.assign";
    assign.assignment = assignment;
    assign.resolve = resolveAssign;
    return assign;
  }
  exports.assign = assign;
});

// node_modules/xstate/dist/StateMachine-d4a4d688.development.cjs.js
var require_StateMachine_d4a4d688_development_cjs = __commonJS(function(exports) {
  var dist_xstateGuards = require_raise_6dbf7d60_development_cjs();
  var assign = require_assign_22c2f2aa_development_cjs();
  var cache = new WeakMap;
  function memo(object, key, fn) {
    let memoizedData = cache.get(object);
    if (!memoizedData) {
      memoizedData = {
        [key]: fn()
      };
      cache.set(object, memoizedData);
    } else if (!(key in memoizedData)) {
      memoizedData[key] = fn();
    }
    return memoizedData[key];
  }
  var EMPTY_OBJECT = {};
  var toSerializableAction = (action) => {
    if (typeof action === "string") {
      return {
        type: action
      };
    }
    if (typeof action === "function") {
      if ("resolve" in action) {
        return {
          type: action.type
        };
      }
      return {
        type: action.name
      };
    }
    return action;
  };

  class StateNode {
    constructor(config, options) {
      this.config = config;
      this.key = undefined;
      this.id = undefined;
      this.type = undefined;
      this.path = undefined;
      this.states = undefined;
      this.history = undefined;
      this.entry = undefined;
      this.exit = undefined;
      this.parent = undefined;
      this.machine = undefined;
      this.meta = undefined;
      this.output = undefined;
      this.order = -1;
      this.description = undefined;
      this.tags = [];
      this.transitions = undefined;
      this.always = undefined;
      this.parent = options._parent;
      this.key = options._key;
      this.machine = options._machine;
      this.path = this.parent ? this.parent.path.concat(this.key) : [];
      this.id = this.config.id || [this.machine.id, ...this.path].join(dist_xstateGuards.STATE_DELIMITER);
      this.type = this.config.type || (this.config.states && Object.keys(this.config.states).length ? "compound" : this.config.history ? "history" : "atomic");
      this.description = this.config.description;
      this.order = this.machine.idMap.size;
      this.machine.idMap.set(this.id, this);
      this.states = this.config.states ? dist_xstateGuards.mapValues(this.config.states, (stateConfig, key) => {
        const stateNode = new StateNode(stateConfig, {
          _parent: this,
          _key: key,
          _machine: this.machine
        });
        return stateNode;
      }) : EMPTY_OBJECT;
      if (this.type === "compound" && !this.config.initial) {
        throw new Error(`No initial state specified for compound state node "#${this.id}". Try adding { initial: "${Object.keys(this.states)[0]}" } to the state config.`);
      }
      this.history = this.config.history === true ? "shallow" : this.config.history || false;
      this.entry = dist_xstateGuards.toArray(this.config.entry).slice();
      this.exit = dist_xstateGuards.toArray(this.config.exit).slice();
      this.meta = this.config.meta;
      this.output = this.type === "final" || !this.parent ? this.config.output : undefined;
      this.tags = dist_xstateGuards.toArray(config.tags).slice();
    }
    _initialize() {
      this.transitions = dist_xstateGuards.formatTransitions(this);
      if (this.config.always) {
        this.always = dist_xstateGuards.toTransitionConfigArray(this.config.always).map((t) => dist_xstateGuards.formatTransition(this, dist_xstateGuards.NULL_EVENT, t));
      }
      Object.keys(this.states).forEach((key) => {
        this.states[key]._initialize();
      });
    }
    get definition() {
      return {
        id: this.id,
        key: this.key,
        version: this.machine.version,
        type: this.type,
        initial: this.initial ? {
          target: this.initial.target,
          source: this,
          actions: this.initial.actions.map(toSerializableAction),
          eventType: null,
          reenter: false,
          meta: this.initial.meta,
          description: this.initial.description,
          toJSON: () => ({
            target: this.initial.target.map((t) => `#${t.id}`),
            source: `#${this.id}`,
            actions: this.initial.actions.map(toSerializableAction),
            eventType: null,
            meta: this.initial.meta,
            description: this.initial.description
          })
        } : undefined,
        history: this.history,
        states: dist_xstateGuards.mapValues(this.states, (state) => state.definition),
        on: this.on,
        transitions: [...this.transitions.values()].flat().map((t) => ({
          ...t,
          actions: t.actions.map(toSerializableAction)
        })),
        entry: this.entry.map(toSerializableAction),
        exit: this.exit.map(toSerializableAction),
        meta: this.meta,
        order: this.order || -1,
        output: this.output,
        invoke: this.invoke,
        description: this.description,
        tags: this.tags
      };
    }
    toJSON() {
      return this.definition;
    }
    get invoke() {
      return memo(this, "invoke", () => dist_xstateGuards.toArray(this.config.invoke).map((invokeConfig, i) => {
        const {
          src,
          systemId
        } = invokeConfig;
        const resolvedId = invokeConfig.id ?? dist_xstateGuards.createInvokeId(this.id, i);
        const sourceName = typeof src === "string" ? src : `xstate.invoke.${dist_xstateGuards.createInvokeId(this.id, i)}`;
        return {
          ...invokeConfig,
          src: sourceName,
          id: resolvedId,
          systemId,
          toJSON() {
            const {
              onDone,
              onError,
              ...invokeDefValues
            } = invokeConfig;
            return {
              ...invokeDefValues,
              type: "xstate.invoke",
              src: sourceName,
              id: resolvedId
            };
          }
        };
      }));
    }
    get on() {
      return memo(this, "on", () => {
        const transitions = this.transitions;
        return [...transitions].flatMap(([descriptor, t]) => t.map((t) => [descriptor, t])).reduce((map, [descriptor, transition]) => {
          map[descriptor] = map[descriptor] || [];
          map[descriptor].push(transition);
          return map;
        }, {});
      });
    }
    get after() {
      return memo(this, "delayedTransitions", () => dist_xstateGuards.getDelayedTransitions(this));
    }
    get initial() {
      return memo(this, "initial", () => dist_xstateGuards.formatInitialTransition(this, this.config.initial));
    }
    next(snapshot, event) {
      const eventType = event.type;
      const actions = [];
      let selectedTransition;
      const candidates = memo(this, `candidates-${eventType}`, () => dist_xstateGuards.getCandidates(this, eventType));
      for (const candidate of candidates) {
        const {
          guard
        } = candidate;
        const resolvedContext = snapshot.context;
        let guardPassed = false;
        try {
          guardPassed = !guard || dist_xstateGuards.evaluateGuard(guard, resolvedContext, event, snapshot);
        } catch (err) {
          const guardType = typeof guard === "string" ? guard : typeof guard === "object" ? guard.type : undefined;
          throw new Error(`Unable to evaluate guard ${guardType ? `'${guardType}' ` : ""}in transition for event '${eventType}' in state node '${this.id}':
${err.message}`);
        }
        if (guardPassed) {
          actions.push(...candidate.actions);
          selectedTransition = candidate;
          break;
        }
      }
      return selectedTransition ? [selectedTransition] : undefined;
    }
    get events() {
      return memo(this, "events", () => {
        const {
          states
        } = this;
        const events = new Set(this.ownEvents);
        if (states) {
          for (const stateId of Object.keys(states)) {
            const state = states[stateId];
            if (state.states) {
              for (const event of state.events) {
                events.add(`${event}`);
              }
            }
          }
        }
        return Array.from(events);
      });
    }
    get ownEvents() {
      const keys = Object.keys(Object.fromEntries(this.transitions));
      const events = new Set(keys.filter((descriptor) => {
        return this.transitions.get(descriptor).some((transition) => !(!transition.target && !transition.actions.length && !transition.reenter));
      }));
      return Array.from(events);
    }
  }
  var STATE_IDENTIFIER = "#";

  class StateMachine {
    constructor(config, implementations) {
      this.config = config;
      this.version = undefined;
      this.schemas = undefined;
      this.implementations = undefined;
      this.options = undefined;
      this.__xstatenode = true;
      this.idMap = new Map;
      this.root = undefined;
      this.id = undefined;
      this.states = undefined;
      this.events = undefined;
      this.id = config.id || "(machine)";
      this.implementations = {
        actors: implementations?.actors ?? {},
        actions: implementations?.actions ?? {},
        delays: implementations?.delays ?? {},
        guards: implementations?.guards ?? {}
      };
      this.version = this.config.version;
      this.schemas = this.config.schemas;
      this.options = {
        maxIterations: Infinity,
        ...this.config.options
      };
      this.transition = this.transition.bind(this);
      this.getInitialSnapshot = this.getInitialSnapshot.bind(this);
      this.getPersistedSnapshot = this.getPersistedSnapshot.bind(this);
      this.restoreSnapshot = this.restoreSnapshot.bind(this);
      this.start = this.start.bind(this);
      this.root = new StateNode(config, {
        _key: this.id,
        _machine: this
      });
      this.root._initialize();
      dist_xstateGuards.formatRouteTransitions(this.root);
      this.states = this.root.states;
      this.events = this.root.events;
      if (!("output" in this.root) && Object.values(this.states).some((state) => state.type === "final" && ("output" in state))) {
        console.warn("Missing `machine.output` declaration (top-level final state with output detected)");
      }
    }
    provide(implementations) {
      const {
        actions,
        guards,
        actors,
        delays
      } = this.implementations;
      return new StateMachine(this.config, {
        actions: {
          ...actions,
          ...implementations.actions
        },
        guards: {
          ...guards,
          ...implementations.guards
        },
        actors: {
          ...actors,
          ...implementations.actors
        },
        delays: {
          ...delays,
          ...implementations.delays
        }
      });
    }
    resolveState(config) {
      const resolvedStateValue = dist_xstateGuards.resolveStateValue(this.root, config.value);
      const nodeSet = dist_xstateGuards.getAllStateNodes(dist_xstateGuards.getStateNodes(this.root, resolvedStateValue));
      return dist_xstateGuards.createMachineSnapshot({
        _nodes: [...nodeSet],
        context: config.context || {},
        children: {},
        status: dist_xstateGuards.isInFinalState(nodeSet, this.root) ? "done" : config.status || "active",
        output: config.output,
        error: config.error,
        historyValue: config.historyValue
      }, this);
    }
    transition(snapshot, event, actorScope) {
      return dist_xstateGuards.macrostep(snapshot, event, actorScope, []).snapshot;
    }
    microstep(snapshot, event, actorScope) {
      return dist_xstateGuards.macrostep(snapshot, event, actorScope, []).microsteps.map(([s]) => s);
    }
    getTransitionData(snapshot, event) {
      return dist_xstateGuards.transitionNode(this.root, snapshot.value, snapshot, event) || [];
    }
    _getPreInitialState(actorScope, initEvent, internalQueue) {
      const {
        context
      } = this.config;
      const preInitial = dist_xstateGuards.createMachineSnapshot({
        context: typeof context !== "function" && context ? context : {},
        _nodes: [this.root],
        children: {},
        status: "active"
      }, this);
      if (typeof context === "function") {
        const assignment = ({
          spawn,
          event,
          self: self2
        }) => context({
          spawn,
          input: event.input,
          self: self2
        });
        return dist_xstateGuards.resolveActionsAndContext(preInitial, initEvent, actorScope, [assign.assign(assignment)], internalQueue, undefined);
      }
      return preInitial;
    }
    getInitialSnapshot(actorScope, input) {
      const initEvent = dist_xstateGuards.createInitEvent(input);
      const internalQueue = [];
      let snapshot = dist_xstateGuards.createMachineSnapshot({
        context: typeof this.config.context !== "function" && this.config.context ? this.config.context : {},
        _nodes: [this.root],
        children: {},
        status: "active"
      }, this);
      try {
        snapshot = this._getPreInitialState(actorScope, initEvent, internalQueue);
        const [nextState] = dist_xstateGuards.initialMicrostep(this.root, snapshot, actorScope, initEvent, internalQueue);
        const {
          snapshot: macroState
        } = dist_xstateGuards.macrostep(nextState, initEvent, actorScope, internalQueue);
        return macroState;
      } catch (error) {
        return dist_xstateGuards.cloneMachineSnapshot(snapshot, {
          status: "error",
          error
        });
      }
    }
    start(snapshot) {
      Object.values(snapshot.children).forEach((child) => {
        if (child.getSnapshot().status === "active") {
          child.start();
        }
      });
    }
    getStateNodeById(stateId) {
      const fullPath = dist_xstateGuards.toStatePath(stateId);
      const relativePath = fullPath.slice(1);
      const resolvedStateId = dist_xstateGuards.isStateId(fullPath[0]) ? fullPath[0].slice(STATE_IDENTIFIER.length) : fullPath[0];
      const stateNode = this.idMap.get(resolvedStateId);
      if (!stateNode) {
        throw new Error(`Child state node '#${resolvedStateId}' does not exist on machine '${this.id}'`);
      }
      return dist_xstateGuards.getStateNodeByPath(stateNode, relativePath);
    }
    get definition() {
      return this.root.definition;
    }
    toJSON() {
      return this.definition;
    }
    getPersistedSnapshot(snapshot, options) {
      return dist_xstateGuards.getPersistedSnapshot(snapshot, options);
    }
    restoreSnapshot(snapshot, _actorScope) {
      const children = {};
      const snapshotChildren = snapshot.children;
      Object.keys(snapshotChildren).forEach((actorId) => {
        const actorData = snapshotChildren[actorId];
        const childState = actorData.snapshot;
        const src = actorData.src;
        const logic = typeof src === "string" ? dist_xstateGuards.resolveReferencedActor(this, src) : src;
        if (!logic) {
          return;
        }
        const actorRef = dist_xstateGuards.createActor(logic, {
          id: actorId,
          parent: _actorScope.self,
          syncSnapshot: actorData.syncSnapshot,
          snapshot: childState,
          src,
          systemId: actorData.systemId
        });
        children[actorId] = actorRef;
      });
      function resolveHistoryReferencedState(root, referenced) {
        if (referenced instanceof StateNode) {
          return referenced;
        }
        try {
          return root.machine.getStateNodeById(referenced.id);
        } catch {
          {
            console.warn(`Could not resolve StateNode for id: ${referenced.id}`);
          }
        }
      }
      function reviveHistoryValue(root, historyValue) {
        if (!historyValue || typeof historyValue !== "object") {
          return {};
        }
        const revived = {};
        for (const key in historyValue) {
          const arr = historyValue[key];
          for (const item of arr) {
            const resolved = resolveHistoryReferencedState(root, item);
            if (!resolved) {
              continue;
            }
            revived[key] ??= [];
            revived[key].push(resolved);
          }
        }
        return revived;
      }
      const revivedHistoryValue = reviveHistoryValue(this.root, snapshot.historyValue);
      const restoredSnapshot = dist_xstateGuards.createMachineSnapshot({
        ...snapshot,
        children,
        _nodes: Array.from(dist_xstateGuards.getAllStateNodes(dist_xstateGuards.getStateNodes(this.root, snapshot.value))),
        historyValue: revivedHistoryValue
      }, this);
      const seen = new Set;
      function reviveContext(contextPart, children) {
        if (seen.has(contextPart)) {
          return;
        }
        seen.add(contextPart);
        for (const key in contextPart) {
          const value = contextPart[key];
          if (value && typeof value === "object") {
            if ("xstate$$type" in value && value.xstate$$type === dist_xstateGuards.$$ACTOR_TYPE) {
              contextPart[key] = children[value.id];
              continue;
            }
            reviveContext(value, children);
          }
        }
      }
      reviveContext(restoredSnapshot.context, children);
      return restoredSnapshot;
    }
  }
  exports.StateMachine = StateMachine;
  exports.StateNode = StateNode;
});

// node_modules/xstate/dist/log-dc444aec.development.cjs.js
var require_log_dc444aec_development_cjs = __commonJS(function(exports) {
  var dist_xstateGuards = require_raise_6dbf7d60_development_cjs();
  var assign = require_assign_22c2f2aa_development_cjs();
  function resolveEmit(_, snapshot, args, actionParams, {
    event: eventOrExpr
  }) {
    const resolvedEvent = typeof eventOrExpr === "function" ? eventOrExpr(args, actionParams) : eventOrExpr;
    return [snapshot, {
      event: resolvedEvent
    }, undefined];
  }
  function executeEmit(actorScope, {
    event
  }) {
    actorScope.defer(() => actorScope.emit(event));
  }
  function emit(eventOrExpr) {
    if (dist_xstateGuards.executingCustomAction) {
      console.warn("Custom actions should not call `emit()` directly, as it is not imperative. See https://stately.ai/docs/actions#built-in-actions for more details.");
    }
    function emit(_args, _params) {
      {
        throw new Error(`This isn't supposed to be called`);
      }
    }
    emit.type = "xstate.emit";
    emit.event = eventOrExpr;
    emit.resolve = resolveEmit;
    emit.execute = executeEmit;
    return emit;
  }
  var SpecialTargets = /* @__PURE__ */ function(SpecialTargets) {
    SpecialTargets["Parent"] = "#_parent";
    SpecialTargets["Internal"] = "#_internal";
    return SpecialTargets;
  }({});
  function resolveSendTo(actorScope, snapshot, args, actionParams, {
    to,
    event: eventOrExpr,
    id,
    delay
  }, extra) {
    const delaysMap = snapshot.machine.implementations.delays;
    if (typeof eventOrExpr === "string") {
      throw new Error(`Only event objects may be used with sendTo; use sendTo({ type: "${eventOrExpr}" }) instead`);
    }
    const resolvedEvent = typeof eventOrExpr === "function" ? eventOrExpr(args, actionParams) : eventOrExpr;
    let resolvedDelay;
    if (typeof delay === "string") {
      const configDelay = delaysMap && delaysMap[delay];
      resolvedDelay = typeof configDelay === "function" ? configDelay(args, actionParams) : configDelay;
    } else {
      resolvedDelay = typeof delay === "function" ? delay(args, actionParams) : delay;
    }
    const resolvedTarget = typeof to === "function" ? to(args, actionParams) : to;
    let targetActorRef;
    if (typeof resolvedTarget === "string") {
      if (resolvedTarget === SpecialTargets.Parent) {
        targetActorRef = actorScope.self._parent;
      } else if (resolvedTarget === SpecialTargets.Internal) {
        targetActorRef = actorScope.self;
      } else if (resolvedTarget.startsWith("#_")) {
        targetActorRef = snapshot.children[resolvedTarget.slice(2)];
      } else {
        targetActorRef = extra.deferredActorIds?.includes(resolvedTarget) ? resolvedTarget : snapshot.children[resolvedTarget];
      }
      if (!targetActorRef) {
        throw new Error(`Unable to send event to actor '${resolvedTarget}' from machine '${snapshot.machine.id}'.`);
      }
    } else {
      targetActorRef = resolvedTarget || actorScope.self;
    }
    return [snapshot, {
      to: targetActorRef,
      targetId: typeof resolvedTarget === "string" ? resolvedTarget : undefined,
      event: resolvedEvent,
      id,
      delay: resolvedDelay
    }, undefined];
  }
  function retryResolveSendTo(_, snapshot, params) {
    if (typeof params.to === "string") {
      params.to = snapshot.children[params.to];
    }
  }
  function executeSendTo(actorScope, params) {
    actorScope.defer(() => {
      const {
        to,
        event,
        delay,
        id
      } = params;
      if (typeof delay === "number") {
        actorScope.system.scheduler.schedule(actorScope.self, to, event, delay, id);
        return;
      }
      actorScope.system._relay(actorScope.self, to, event.type === dist_xstateGuards.XSTATE_ERROR ? dist_xstateGuards.createErrorActorEvent(actorScope.self.id, event.data) : event);
    });
  }
  function sendTo(to, eventOrExpr, options) {
    if (dist_xstateGuards.executingCustomAction) {
      console.warn("Custom actions should not call `sendTo()` directly, as it is not imperative. See https://stately.ai/docs/actions#built-in-actions for more details.");
    }
    function sendTo(_args, _params) {
      {
        throw new Error(`This isn't supposed to be called`);
      }
    }
    sendTo.type = "xstate.sendTo";
    sendTo.to = to;
    sendTo.event = eventOrExpr;
    sendTo.id = options?.id;
    sendTo.delay = options?.delay;
    sendTo.resolve = resolveSendTo;
    sendTo.retryResolve = retryResolveSendTo;
    sendTo.execute = executeSendTo;
    return sendTo;
  }
  function sendParent(event, options) {
    return sendTo(SpecialTargets.Parent, event, options);
  }
  function forwardTo(target, options) {
    if (!target || typeof target === "function") {
      const originalTarget = target;
      target = (...args) => {
        const resolvedTarget = typeof originalTarget === "function" ? originalTarget(...args) : originalTarget;
        if (!resolvedTarget) {
          throw new Error(`Attempted to forward event to undefined actor. This risks an infinite loop in the sender.`);
        }
        return resolvedTarget;
      };
    }
    return sendTo(target, ({
      event
    }) => event, options);
  }
  function resolveEnqueueActions(actorScope, snapshot, args, actionParams, {
    collect
  }) {
    const actions = [];
    const enqueue = function enqueue(action) {
      actions.push(action);
    };
    enqueue.assign = (...args) => {
      actions.push(assign.assign(...args));
    };
    enqueue.cancel = (...args) => {
      actions.push(dist_xstateGuards.cancel(...args));
    };
    enqueue.raise = (...args) => {
      actions.push(dist_xstateGuards.raise(...args));
    };
    enqueue.sendTo = (...args) => {
      actions.push(sendTo(...args));
    };
    enqueue.sendParent = (...args) => {
      actions.push(sendParent(...args));
    };
    enqueue.spawnChild = (...args) => {
      actions.push(dist_xstateGuards.spawnChild(...args));
    };
    enqueue.stopChild = (...args) => {
      actions.push(dist_xstateGuards.stopChild(...args));
    };
    enqueue.emit = (...args) => {
      actions.push(emit(...args));
    };
    collect({
      context: args.context,
      event: args.event,
      enqueue,
      check: (guard) => dist_xstateGuards.evaluateGuard(guard, snapshot.context, args.event, snapshot),
      self: actorScope.self,
      system: actorScope.system
    }, actionParams);
    return [snapshot, undefined, actions];
  }
  function enqueueActions(collect) {
    function enqueueActions(_args, _params) {
      {
        throw new Error(`This isn't supposed to be called`);
      }
    }
    enqueueActions.type = "xstate.enqueueActions";
    enqueueActions.collect = collect;
    enqueueActions.resolve = resolveEnqueueActions;
    return enqueueActions;
  }
  function resolveLog(_, snapshot, actionArgs, actionParams, {
    value,
    label
  }) {
    return [snapshot, {
      value: typeof value === "function" ? value(actionArgs, actionParams) : value,
      label
    }, undefined];
  }
  function executeLog({
    logger
  }, {
    value,
    label
  }) {
    if (label) {
      logger(label, value);
    } else {
      logger(value);
    }
  }
  function log(value = ({
    context,
    event
  }) => ({
    context,
    event
  }), label) {
    function log(_args, _params) {
      {
        throw new Error(`This isn't supposed to be called`);
      }
    }
    log.type = "xstate.log";
    log.value = value;
    log.label = label;
    log.resolve = resolveLog;
    log.execute = executeLog;
    return log;
  }
  exports.SpecialTargets = SpecialTargets;
  exports.emit = emit;
  exports.enqueueActions = enqueueActions;
  exports.forwardTo = forwardTo;
  exports.log = log;
  exports.sendParent = sendParent;
  exports.sendTo = sendTo;
});

// node_modules/xstate/dist/xstate.development.cjs.js
var require_xstate_development_cjs = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  var dist_xstateActors = require_xstate_actors_development_cjs();
  var dist_xstateGuards = require_raise_6dbf7d60_development_cjs();
  var StateMachine = require_StateMachine_d4a4d688_development_cjs();
  var assign = require_assign_22c2f2aa_development_cjs();
  var log = require_log_dc444aec_development_cjs();
  require_xstate_dev_development_cjs();
  function assertEvent(event, type) {
    const types = dist_xstateGuards.toArray(type);
    const matches = types.some((descriptor) => dist_xstateGuards.matchesEventDescriptor(event.type, descriptor));
    if (!matches) {
      const typesText = types.length === 1 ? `type matching "${types[0]}"` : `one of types matching "${types.join('", "')}"`;
      throw new Error(`Expected event ${JSON.stringify(event)} to have ${typesText}`);
    }
  }
  function createMachine(config, implementations) {
    return new StateMachine.StateMachine(config, implementations);
  }
  function mapState(snapshot, mapper) {
    const results = [];
    const findMapper = (currentMapper, nodePath) => {
      let mapper = currentMapper;
      for (const key of nodePath) {
        if (!mapper?.states) {
          return;
        }
        const states = mapper.states;
        if (!(key in states)) {
          return;
        }
        mapper = states[key];
      }
      return mapper;
    };
    const visited = new Set;
    for (const atomicNode of snapshot._nodes.filter(dist_xstateGuards.isAtomicStateNode)) {
      let current = atomicNode;
      while (current && !visited.has(current)) {
        visited.add(current);
        const nodeMapper = findMapper(mapper, current.path);
        if (nodeMapper?.map) {
          results.push({
            stateNode: current,
            result: nodeMapper.map(snapshot)
          });
        }
        current = current.parent;
      }
    }
    return results;
  }
  function createInertActorScope(actorLogic) {
    const self2 = dist_xstateGuards.createActor(actorLogic);
    const freshSystem = dist_xstateGuards.createSystem(self2, {
      clock: self2.system._clock,
      logger: self2.system._logger
    });
    self2.system = freshSystem;
    const inertActorScope = {
      self: self2,
      defer: () => {},
      id: "",
      logger: () => {},
      sessionId: "",
      stopChild: () => {},
      system: freshSystem,
      emit: () => {},
      actionExecutor: () => {}
    };
    return inertActorScope;
  }
  function getInitialSnapshot(actorLogic, ...[input]) {
    const actorScope = createInertActorScope(actorLogic);
    return actorLogic.getInitialSnapshot(actorScope, input);
  }
  function getNextSnapshot(actorLogic, snapshot, event) {
    const inertActorScope = createInertActorScope(actorLogic);
    inertActorScope.self._snapshot = snapshot;
    return actorLogic.transition(snapshot, event, inertActorScope);
  }
  function setup({
    schemas,
    actors,
    actions,
    guards,
    delays
  }) {
    return {
      assign: assign.assign,
      sendTo: log.sendTo,
      raise: dist_xstateGuards.raise,
      log: log.log,
      cancel: dist_xstateGuards.cancel,
      stopChild: dist_xstateGuards.stopChild,
      enqueueActions: log.enqueueActions,
      emit: log.emit,
      spawnChild: dist_xstateGuards.spawnChild,
      createStateConfig: (config) => config,
      createAction: (fn) => fn,
      createMachine: (config) => createMachine({
        ...config,
        schemas
      }, {
        actors,
        actions,
        guards,
        delays
      }),
      extend: (extended) => setup({
        schemas,
        actors,
        actions: {
          ...actions,
          ...extended.actions
        },
        guards: {
          ...guards,
          ...extended.guards
        },
        delays: {
          ...delays,
          ...extended.delays
        }
      })
    };
  }

  class SimulatedClock {
    constructor() {
      this.timeouts = new Map;
      this._now = 0;
      this._id = 0;
      this._flushing = false;
      this._flushingInvalidated = false;
    }
    now() {
      return this._now;
    }
    getId() {
      return this._id++;
    }
    setTimeout(fn, timeout) {
      this._flushingInvalidated = this._flushing;
      const id = this.getId();
      this.timeouts.set(id, {
        start: this.now(),
        timeout,
        fn
      });
      return id;
    }
    clearTimeout(id) {
      this._flushingInvalidated = this._flushing;
      this.timeouts.delete(id);
    }
    set(time) {
      if (this._now > time) {
        throw new Error("Unable to travel back in time");
      }
      this._now = time;
      this.flushTimeouts();
    }
    flushTimeouts() {
      if (this._flushing) {
        this._flushingInvalidated = true;
        return;
      }
      this._flushing = true;
      const sorted = [...this.timeouts].sort(([_idA, timeoutA], [_idB, timeoutB]) => {
        const endA = timeoutA.start + timeoutA.timeout;
        const endB = timeoutB.start + timeoutB.timeout;
        return endB > endA ? -1 : 1;
      });
      for (const [id, timeout] of sorted) {
        if (this._flushingInvalidated) {
          this._flushingInvalidated = false;
          this._flushing = false;
          this.flushTimeouts();
          return;
        }
        if (this.now() - timeout.start >= timeout.timeout) {
          this.timeouts.delete(id);
          timeout.fn.call(null);
        }
      }
      this._flushing = false;
    }
    increment(ms) {
      this._now += ms;
      this.flushTimeouts();
    }
  }
  function toPromise(actor) {
    return new Promise((resolve, reject) => {
      actor.subscribe({
        complete: () => {
          resolve(actor.getSnapshot().output);
        },
        error: reject
      });
    });
  }
  function transition(logic, snapshot, event) {
    const executableActions = [];
    const actorScope = createInertActorScope(logic);
    actorScope.actionExecutor = (action) => {
      executableActions.push(action);
    };
    const nextSnapshot = logic.transition(snapshot, event, actorScope);
    return [nextSnapshot, executableActions];
  }
  function initialTransition(logic, ...[input]) {
    const executableActions = [];
    const actorScope = createInertActorScope(logic);
    actorScope.actionExecutor = (action) => {
      executableActions.push(action);
    };
    const nextSnapshot = logic.getInitialSnapshot(actorScope, input);
    return [nextSnapshot, executableActions];
  }
  function getMicrosteps(machine, snapshot, event) {
    const actorScope = createInertActorScope(machine);
    const {
      microsteps
    } = dist_xstateGuards.macrostep(snapshot, event, actorScope, []);
    return microsteps;
  }
  function getInitialMicrosteps(machine, ...[input]) {
    const actorScope = createInertActorScope(machine);
    const initEvent = dist_xstateGuards.createInitEvent(input);
    const internalQueue = [];
    const preInitialSnapshot = machine._getPreInitialState(actorScope, initEvent, internalQueue);
    const first = dist_xstateGuards.initialMicrostep(machine.root, preInitialSnapshot, actorScope, initEvent, internalQueue);
    const {
      microsteps
    } = dist_xstateGuards.macrostep(first[0], initEvent, actorScope, internalQueue);
    return [first, ...microsteps];
  }
  function getNextTransitions(state) {
    const potentialTransitions = [];
    const atomicStates = state._nodes.filter(dist_xstateGuards.isAtomicStateNode);
    const visited = new Set;
    for (const stateNode of atomicStates) {
      for (const s of [stateNode].concat(dist_xstateGuards.getProperAncestors(stateNode, undefined))) {
        if (visited.has(s.id)) {
          continue;
        }
        visited.add(s.id);
        for (const [, transitions] of s.transitions) {
          potentialTransitions.push(...transitions);
        }
        if (s.always) {
          potentialTransitions.push(...s.always);
        }
      }
    }
    return potentialTransitions;
  }
  var defaultWaitForOptions = {
    timeout: Infinity
  };
  function waitFor(actorRef, predicate, options) {
    const resolvedOptions = {
      ...defaultWaitForOptions,
      ...options
    };
    return new Promise((res, rej) => {
      const {
        signal
      } = resolvedOptions;
      if (signal?.aborted) {
        rej(signal.reason);
        return;
      }
      let done = false;
      if (resolvedOptions.timeout < 0) {
        console.error("`timeout` passed to `waitFor` is negative and it will reject its internal promise immediately.");
      }
      const handle = resolvedOptions.timeout === Infinity ? undefined : setTimeout(() => {
        dispose();
        rej(new Error(`Timeout of ${resolvedOptions.timeout} ms exceeded`));
      }, resolvedOptions.timeout);
      const dispose = () => {
        clearTimeout(handle);
        done = true;
        sub?.unsubscribe();
        if (abortListener) {
          signal.removeEventListener("abort", abortListener);
        }
      };
      function checkEmitted(emitted) {
        if (predicate(emitted)) {
          dispose();
          res(emitted);
        }
      }
      let abortListener;
      let sub;
      checkEmitted(actorRef.getSnapshot());
      if (done) {
        return;
      }
      if (signal) {
        abortListener = () => {
          dispose();
          rej(signal.reason);
        };
        signal.addEventListener("abort", abortListener);
      }
      sub = actorRef.subscribe({
        next: checkEmitted,
        error: (err) => {
          dispose();
          rej(err);
        },
        complete: () => {
          dispose();
          rej(new Error(`Actor terminated without satisfying predicate`));
        }
      });
      if (done) {
        sub.unsubscribe();
      }
    });
  }
  exports.createEmptyActor = dist_xstateActors.createEmptyActor;
  exports.fromCallback = dist_xstateActors.fromCallback;
  exports.fromEventObservable = dist_xstateActors.fromEventObservable;
  exports.fromObservable = dist_xstateActors.fromObservable;
  exports.fromPromise = dist_xstateActors.fromPromise;
  exports.fromTransition = dist_xstateActors.fromTransition;
  exports.Actor = dist_xstateGuards.Actor;
  exports.__unsafe_getAllOwnEventDescriptors = dist_xstateGuards.getAllOwnEventDescriptors;
  exports.and = dist_xstateGuards.and;
  exports.cancel = dist_xstateGuards.cancel;
  exports.createActor = dist_xstateGuards.createActor;
  exports.getStateNodes = dist_xstateGuards.getStateNodes;
  exports.interpret = dist_xstateGuards.interpret;
  exports.isMachineSnapshot = dist_xstateGuards.isMachineSnapshot;
  exports.matchesState = dist_xstateGuards.matchesState;
  exports.not = dist_xstateGuards.not;
  exports.or = dist_xstateGuards.or;
  exports.pathToStateValue = dist_xstateGuards.pathToStateValue;
  exports.raise = dist_xstateGuards.raise;
  exports.spawnChild = dist_xstateGuards.spawnChild;
  exports.stateIn = dist_xstateGuards.stateIn;
  exports.stop = dist_xstateGuards.stop;
  exports.stopChild = dist_xstateGuards.stopChild;
  exports.toObserver = dist_xstateGuards.toObserver;
  exports.StateMachine = StateMachine.StateMachine;
  exports.StateNode = StateMachine.StateNode;
  exports.assign = assign.assign;
  exports.SpecialTargets = log.SpecialTargets;
  exports.emit = log.emit;
  exports.enqueueActions = log.enqueueActions;
  exports.forwardTo = log.forwardTo;
  exports.log = log.log;
  exports.sendParent = log.sendParent;
  exports.sendTo = log.sendTo;
  exports.SimulatedClock = SimulatedClock;
  exports.assertEvent = assertEvent;
  exports.createMachine = createMachine;
  exports.getInitialMicrosteps = getInitialMicrosteps;
  exports.getInitialSnapshot = getInitialSnapshot;
  exports.getMicrosteps = getMicrosteps;
  exports.getNextSnapshot = getNextSnapshot;
  exports.getNextTransitions = getNextTransitions;
  exports.initialTransition = initialTransition;
  exports.mapState = mapState;
  exports.setup = setup;
  exports.toPromise = toPromise;
  exports.transition = transition;
  exports.waitFor = waitFor;
});

// src/hunter/shared/ontology.ts
function isNodeType(v) {
  return typeof v === "string" && NODE_TYPES_SET.has(v);
}
function isPredicate(v) {
  return typeof v === "string" && PREDICATE_SET.has(v);
}
var NODE_TYPES, PREDICATES, HAS_FINDING_PREDICATE = "has_finding", ALL_PREDICATES, NODE_TYPES_SET, PREDICATE_SET;
var init_ontology = __esm(() => {
  NODE_TYPES = ["File", "Class", "Function", "Interface", "Module", "Machine", "Actor", "Engine", "Adapter", "Container", "Lexicon", "Contract", "Threshold", "Gate", "EvidenceFile", "SpecClause", "Graph", "Path"];
  PREDICATES = {
    lasme: ["declares", "implements", "triggers", "violates", "shouldBe", "wraps"],
    mpse: ["evaluates_to", "contradicts_oracle", "grounded_through", "unguarded_threshold"],
    sro: ["caused", "derived_from", "resolved_to", "superseded_by", "flagged_by"],
    wiring: ["calls", "imports", "awaits", "exports", "unwired"]
  };
  ALL_PREDICATES = [...PREDICATES.lasme, ...PREDICATES.mpse, ...PREDICATES.sro, ...PREDICATES.wiring];
  NODE_TYPES_SET = new Set(NODE_TYPES);
  PREDICATE_SET = new Set([...ALL_PREDICATES, HAS_FINDING_PREDICATE]);
});

// src/hunter/shared/migrations.ts
function sqlList(values) {
  return values.map((v) => `'${v.replace(/'/g, "''")}'`).join(",");
}
var NODE_KINDS_SQL, PREDICATES_SQL, GRAPH_FACT_PREDICATES_SQL, TYPED_GRAPH_DDL;
var init_migrations = __esm(() => {
  init_ontology();
  NODE_KINDS_SQL = sqlList(NODE_TYPES);
  PREDICATES_SQL = sqlList(ALL_PREDICATES);
  GRAPH_FACT_PREDICATES_SQL = `${PREDICATES_SQL},'${HAS_FINDING_PREDICATE}'`;
  TYPED_GRAPH_DDL = `
CREATE TABLE IF NOT EXISTS typed_nodes (
  id INTEGER PRIMARY KEY,
  canonical_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN (${NODE_KINDS_SQL})),
  label TEXT NOT NULL,
  file TEXT,
  line INTEGER,
  created_run TEXT NOT NULL,
  superseded_run TEXT
);
CREATE TABLE IF NOT EXISTS typed_edges (
  id INTEGER PRIMARY KEY,
  src_canonical TEXT NOT NULL,
  dst_canonical TEXT NOT NULL,
  predicate TEXT NOT NULL CHECK (predicate IN (${PREDICATES_SQL})),
  evidence_quote TEXT NOT NULL CHECK (length(evidence_quote) > 0),
  confidence REAL NOT NULL DEFAULT 1.0,
  created_run TEXT NOT NULL,
  superseded_run TEXT
);
CREATE TABLE IF NOT EXISTS resolutions (
  alias TEXT PRIMARY KEY,
  canonical_id TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('same','related','unrelated')),
  reasoning TEXT NOT NULL,
  created_run TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS graph_facts (
  id INTEGER PRIMARY KEY,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL CHECK (predicate IN (${GRAPH_FACT_PREDICATES_SQL})),
  object TEXT NOT NULL,
  evidence TEXT NOT NULL CHECK (length(evidence) > 0),
  confidence REAL NOT NULL,
  created_at INTEGER NOT NULL,
  superseded_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tn_canonical ON typed_nodes(canonical_id);
CREATE INDEX IF NOT EXISTS idx_tn_kind ON typed_nodes(kind);
-- THE FILE INDEX (GG-BUG-5, the host live-fire 2026-09-10): the graph gate's
-- blast-radius CTE joins dst.file = blast.file per recursion row \u2014 with no
-- index on file each step full-scans typed_nodes (measured: 468-row closure
-- at depth 2 took 81s on the 51K-edge production store; indexed it is ms).
CREATE INDEX IF NOT EXISTS idx_tn_file ON typed_nodes(file);
CREATE INDEX IF NOT EXISTS idx_te_src ON typed_edges(src_canonical);
CREATE INDEX IF NOT EXISTS idx_te_dst ON typed_edges(dst_canonical);
CREATE INDEX IF NOT EXISTS idx_te_pred ON typed_edges(predicate);
CREATE INDEX IF NOT EXISTS idx_res_canonical ON resolutions(canonical_id);
CREATE INDEX IF NOT EXISTS idx_gf_subject ON graph_facts(subject);
`;
});

// src/hunter/shared/db.ts
import fs19 from "fs";
import path20 from "path";
import { Database as Database5 } from "bun:sqlite";
function lineageMissing(id) {
  return new Error(`LINEAGE_MISSING: id=${id} (the SPEC_DERIVED/CODE_DERIVED/HYBRID duality cannot degrade - O28.4)`);
}
function findingNoTriplet(detail) {
  return new Error(`FINDING_NO_TRIPLET: ${detail} (no triplet = no finding - a non-empty evidence string is mandatory - O9.1)`);
}
function findingInvalid(field, value) {
  return new Error(`FINDING_INVALID: field=${field} value=${JSON.stringify(value)} (the severity canon is CRIT|HIGH|MED|WARN; the verdict is VIOLATION|PASS - fix the finding)`);
}
function eventInvalid(kind) {
  return new Error(`EVENT_INVALID: kind=${JSON.stringify(kind)} (the bus kinds are HUNT_DONE|BUILD_DONE|AUDIT_DONE - fix the event)`);
}
function implementationInvalid(field, value) {
  return new Error(`IMPLEMENTATION_INVALID: field=${field} value=${JSON.stringify(value)} (the status canon is PENDING|CHANGED|UNCHANGED|VERIFIED|REJECTED - fix the row)`);
}
function verdictInvalid(field, value) {
  return new Error(`VERDICT_INVALID: field=${field} value=${JSON.stringify(value)} (the verdict canon is CONFORMANT|VIOLATED|PARTIAL - fix the row)`);
}
function mirrorWriteFailed(mirrorPath, detail) {
  return new Error(`MIRROR_WRITE_FAILED: path=${mirrorPath} detail=${detail} (the MASTER_CONTEXT mirror is the awareness surface, not the truth - the .gi shared.db is the truth - D27)`);
}
function pragmaFailed(pragma, detail) {
  return new Error(`PRAGMA_FAILED: pragma=${pragma} detail=${detail} (a pragma exec failure is a loud named error - a database-is-locked on open must name the driver + the pragma, never surface as a raw sqlite throw - the store's fail-closed contract)`);
}
function applyPragmas(db) {
  const execPragma = (pragma) => {
    try {
      db.exec(pragma);
    } catch (e) {
      throw pragmaFailed(pragma, `driver=bun:sqlite message=${e instanceof Error ? e.message : String(e)}`);
    }
  };
  execPragma("PRAGMA journal_mode = WAL");
  execPragma("PRAGMA synchronous = NORMAL");
  execPragma("PRAGMA busy_timeout = 5000");
  execPragma("PRAGMA foreign_keys = ON");
  let priorVersion = 0;
  try {
    priorVersion = Number(db.query("PRAGMA user_version").get()?.user_version ?? 0);
  } catch {
    priorVersion = 0;
  }
  if (priorVersion !== 184) {
    console.warn(`[db] schema user_version ${priorVersion} -> 184 (the migrations apply at this open)`);
  }
  execPragma("PRAGMA user_version = 184");
}
function isNodeLineage(v) {
  return v === "SPEC_DERIVED" || v === "CODE_DERIVED" || v === "HYBRID";
}

class SharedDb {
  dbPath;
  handle;
  open = true;
  constructor(dbPath, handle) {
    this.dbPath = dbPath;
    this.handle = handle;
  }
  exec(sql) {
    this.handle.exec(sql);
  }
  prepare(sql) {
    const stmt = this.handle.prepare(sql);
    if (stmt !== undefined && stmt !== null) {
      return stmt;
    }
    throw new Error("[db] the sqlite prepare returned no statement");
  }
  close() {
    if (this.open) {
      this.handle.close();
      this.open = false;
    }
  }
  writeGraph(nodes, edges) {
    for (const n of nodes) {
      if (!isNodeLineage(n.lineage)) {
        throw lineageMissing(n.id);
      }
    }
    for (const e of edges) {
      if (!isNodeLineage(e.lineage)) {
        throw lineageMissing(`edge ${e.sourceId} -> ${e.targetId}`);
      }
    }
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const e of edges) {
      if (!nodeIds.has(e.sourceId) || !nodeIds.has(e.targetId)) {
        throw lineageMissing(`edge ${e.sourceId} -> ${e.targetId} (dangling endpoint \u2014 no such node in this write batch)`);
      }
    }
    const tx = this.handle.transaction(() => {
      this.handle.exec("DROP TABLE IF EXISTS temp._graph_nodes_stage");
      this.handle.exec("DROP TABLE IF EXISTS temp._graph_edges_stage");
      this.handle.exec("CREATE TEMP TABLE _graph_nodes_stage (id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL, file TEXT, line INTEGER, lineage TEXT NOT NULL, source TEXT NOT NULL, data TEXT)");
      this.handle.exec("CREATE TEMP TABLE _graph_edges_stage (source_id TEXT NOT NULL, target_id TEXT NOT NULL, kind TEXT NOT NULL, lineage TEXT NOT NULL, file TEXT, line INTEGER)");
      const nodeStmt = this.handle.prepare("INSERT INTO _graph_nodes_stage VALUES (?,?,?,?,?,?,?,?)");
      for (const n of nodes) {
        nodeStmt.run(n.id, n.kind, n.name, n.file ?? null, n.line ?? null, n.lineage, n.source, JSON.stringify(n.data ?? {}));
      }
      const edgeStmt = this.handle.prepare("INSERT INTO _graph_edges_stage (source_id,target_id,kind,lineage,file,line) VALUES (?,?,?,?,?,?)");
      for (const e of edges) {
        edgeStmt.run(e.sourceId, e.targetId, e.kind, e.lineage, e.file ?? null, e.line ?? null);
      }
      this.handle.prepare("DELETE FROM graph_edges").run();
      this.handle.prepare("DELETE FROM graph_nodes").run();
      this.handle.exec("INSERT INTO graph_nodes (id,kind,name,file,line,lineage,source,data) SELECT id,kind,name,file,line,lineage,source,data FROM _graph_nodes_stage");
      this.handle.exec("INSERT INTO graph_edges (source_id,target_id,kind,lineage,file,line) SELECT source_id,target_id,kind,lineage,file,line FROM _graph_edges_stage");
      this.handle.exec("DROP TABLE IF EXISTS temp._graph_edges_stage; DROP TABLE IF EXISTS temp._graph_nodes_stage");
    });
    tx.immediate();
  }
  appendFinding(finding, runId, week) {
    if (typeof finding.ruleId !== "string" || finding.ruleId.trim() === "") {
      throw findingNoTriplet(`finding at ${finding.file ?? "?"}:${finding.line ?? "?"} carries an empty ruleId \u2014 the Pattern leg of the EvidenceTriad is mandatory`);
    }
    if (typeof finding.evidence !== "string" || finding.evidence.trim() === "") {
      throw findingNoTriplet(`finding ${finding.ruleId} at ${finding.file ?? "?"}:${finding.line ?? "?"} carries an empty evidence string`);
    }
    if (!SEVERITIES.includes(finding.severity))
      throw findingInvalid("severity", finding.severity);
    if (!FINDING_VERDICTS.includes(finding.verdict))
      throw findingInvalid("verdict", finding.verdict);
    const persistedEvidence = finding.evidence;
    this.handle.prepare(`INSERT INTO findings (rule_id,severity,file,line,range_start,range_end,evidence,verdict,week,run_id,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(finding.ruleId, finding.severity, finding.file ?? null, finding.line ?? null, finding.rangeStart ?? null, finding.rangeEnd ?? null, persistedEvidence, finding.verdict, week ?? null, runId, Date.now());
  }
  appendReportSection(section, runId) {
    this.handle.prepare(`INSERT INTO report_sections (finding_id,how_broken,why_broken,what_violates,how_to_fix,what_to_do,why_works,run_id)
       VALUES (?,?,?,?,?,?,?,?)`).run(section.findingId, section.howBroken, section.whyBroken, section.whatViolates, section.howToFix, section.whatToDo, section.whyWorks, runId);
  }
  appendImplementation(row, runId) {
    if (!IMPLEMENTATION_STATUSES.includes(row.status)) {
      throw implementationInvalid("status", row.status);
    }
    this.handle.prepare("INSERT INTO implementations (file,before_sha,after_sha,claim,status,run_id) VALUES (?,?,?,?,?,?)").run(row.file, row.beforeSha, row.afterSha, row.claim, row.status, runId);
  }
  appendConformanceVerdict(row, runId) {
    if (!CONFORMANCE_VERDICTS.includes(row.verdict)) {
      throw verdictInvalid("verdict", row.verdict);
    }
    this.handle.prepare("INSERT INTO conformance_verdicts (finding_id,verdict,evidence,fixed_at,fixed_by,run_id) VALUES (?,?,?,?,?,?)").run(row.findingId, row.verdict, row.evidence, row.fixedAt ?? null, row.fixedBy, runId);
  }
  appendEvent(kind, payload) {
    if (!EVENT_KINDS.includes(kind))
      throw eventInvalid(kind);
    this.handle.prepare("INSERT INTO events (kind,payload,created_at) VALUES (?,?,?)").run(kind, JSON.stringify(payload), Date.now());
  }
  mirrorToMasterContext(profile) {
    const mirrorDir = path20.join(profile.project.root, "MASTER_CONTEXT", "knowledge-graph");
    const mirrorPath = path20.join(mirrorDir, "graph.db");
    let mirror;
    try {
      fs19.mkdirSync(mirrorDir, { recursive: true });
      mirror = new Database5(mirrorPath);
      applyPragmas(mirror);
    } catch (e) {
      try {
        mirror?.close();
      } catch {}
      throw mirrorWriteFailed(mirrorPath, `mirror open failed: ${String(e)}`);
    }
    const openMirror = mirror;
    try {
      const rebuild = openMirror.transaction(() => {
        openMirror.exec("DROP TABLE IF EXISTS events; DROP TABLE IF EXISTS findings; DROP TABLE IF EXISTS graph_edges; DROP TABLE IF EXISTS graph_nodes;");
        openMirror.exec(MIRROR_SCHEMA_SQL);
        const nodeIns = openMirror.prepare("INSERT OR REPLACE INTO graph_nodes VALUES (?,?,?,?,?,?,?,?)");
        for (const row of this.handle.prepare("SELECT id,kind,name,file,line,lineage,source,data FROM graph_nodes").all()) {
          nodeIns.run(row["id"], row["kind"], row["name"], row["file"], row["line"], row["lineage"], row["source"], row["data"]);
        }
        const edgeIns = openMirror.prepare("INSERT INTO graph_edges (source_id,target_id,kind,lineage,created_at,file,line) VALUES (?,?,?,?,?,?,?)");
        for (const row of this.handle.prepare("SELECT source_id,target_id,kind,lineage,created_at,file,line FROM graph_edges").all()) {
          edgeIns.run(row["source_id"], row["target_id"], row["kind"], row["lineage"], row["created_at"], row["file"] ?? null, row["line"] ?? null);
        }
        const findIns = openMirror.prepare("INSERT INTO findings (rule_id,severity,file,line,range_start,range_end,evidence,verdict,week,run_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
        for (const row of this.handle.prepare("SELECT rule_id,severity,file,line,range_start,range_end,evidence,verdict,week,run_id,created_at FROM findings").all()) {
          findIns.run(row["rule_id"], row["severity"], row["file"], row["line"], row["range_start"], row["range_end"], row["evidence"], row["verdict"], row["week"], row["run_id"], row["created_at"]);
        }
        const evIns = openMirror.prepare("INSERT INTO events (kind,payload,created_at) VALUES (?,?,?)");
        for (const row of this.handle.prepare("SELECT kind,payload,created_at FROM events").all()) {
          evIns.run(row["kind"], row["payload"], row["created_at"]);
        }
      });
      rebuild();
    } catch (e) {
      throw mirrorWriteFailed(mirrorPath, `mirror copy failed: ${String(e)}`);
    } finally {
      openMirror.close();
    }
    return mirrorPath;
  }
}
function priorStateDirs(root) {
  let entries;
  try {
    entries = fs19.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.filter((e) => e.isDirectory() && e.name.startsWith(".") && e.name !== GI_PROJECT_STATE_DIR).map((e) => e.name).filter((name) => fs19.existsSync(path20.join(root, name, "knowledge-graph"))).sort();
}
function resolveStateRel(root, rel) {
  const canonical = path20.join(root, GI_PROJECT_STATE_DIR, rel);
  if (fs19.existsSync(canonical))
    return canonical;
  for (const name of priorStateDirs(root)) {
    const candidate = path20.join(root, name, rel);
    if (fs19.existsSync(candidate))
      return candidate;
  }
  return canonical;
}
function resolveStoreDbPath(root) {
  return resolveStateRel(root, path20.join("knowledge-graph", "shared.db"));
}
function openStore(dbPath) {
  if (dbPath !== ":memory:") {
    fs19.mkdirSync(path20.dirname(dbPath), { recursive: true });
  }
  const handle = new Database5(dbPath);
  applyPragmas(handle);
  handle.exec(CREATE_TABLES_SQL);
  try {
    const cols = new Set(handle.prepare("PRAGMA table_info(graph_edges)").all().map((c) => c.name));
    for (const [name, decl] of [["file", "TEXT"], ["line", "INTEGER"]]) {
      if (!cols.has(name)) {
        handle.exec(`ALTER TABLE graph_edges ADD COLUMN ${name} ${decl}`);
        console.error(`[gi-omp] DDL MIGRATION: added graph_edges.${name} (pre-R19 store upgraded)`);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/no such table/i.test(msg)) {
      console.error(`[gi-omp] DDL MIGRATION: graph_edges absent (fresh store) \u2014 created by the DDL below`);
    } else {
      throw new Error(`GI_DDL_MIGRATION_FAILED: graph_edges migration faulted on an existing store \u2014 ${msg}`);
    }
  }
  handle.exec(TYPED_GRAPH_DDL);
  return new SharedDb(dbPath, handle);
}
function writeGraph(db, nodes, edges) {
  db.writeGraph(nodes, edges);
}
function appendReportSection(db, section, runId) {
  db.appendReportSection(section, runId);
}
function appendEvent(db, kind, payload) {
  db.appendEvent(kind, payload);
}
function mirrorToMasterContext(db, profile) {
  return db.mirrorToMasterContext(profile);
}
var SEVERITIES, EVENT_KINDS, IMPLEMENTATION_STATUSES, CONFORMANCE_VERDICTS, FINDING_VERDICTS, CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS graph_nodes (
  id        TEXT PRIMARY KEY,
  kind      TEXT NOT NULL,
  name      TEXT NOT NULL,
  file      TEXT,
  line      INTEGER,
  lineage   TEXT NOT NULL,
  source    TEXT NOT NULL,
  data      TEXT
);
CREATE TABLE IF NOT EXISTS graph_edges (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id  TEXT NOT NULL REFERENCES graph_nodes(id),
  target_id  TEXT NOT NULL REFERENCES graph_nodes(id),
  kind       TEXT NOT NULL,
  lineage    TEXT NOT NULL,
  created_at INTEGER,
  -- \u2605 R19-HIGH FIX (2026-09-25): the EDGE'S OWN ANCHOR. The table carried only endpoints +
  --   kind + lineage, so an edge's file:line was NEVER PERSISTED \u2014 the reuse path could not
  --   recover what the write path never stored, and every reader of a reused graph saw edges
  --   with no location while the in-memory build had them. The anchor is part of the edge.
  file       TEXT,
  line       INTEGER
);
CREATE TABLE IF NOT EXISTS findings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id     TEXT NOT NULL,
  severity    TEXT NOT NULL,
  file        TEXT,
  line        INTEGER,
  range_start INTEGER,
  range_end   INTEGER,
  evidence    TEXT NOT NULL,
  verdict     TEXT NOT NULL,
  week        TEXT,
  run_id      TEXT NOT NULL,
  created_at  INTEGER
);
CREATE TABLE IF NOT EXISTS report_sections (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  finding_id  TEXT NOT NULL,
  how_broken  TEXT NOT NULL,
  why_broken  TEXT NOT NULL,
  what_violates TEXT NOT NULL,
  how_to_fix  TEXT NOT NULL,
  what_to_do  TEXT NOT NULL,
  why_works   TEXT NOT NULL,
  run_id      TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS implementations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  file       TEXT NOT NULL,
  before_sha TEXT NOT NULL,
  after_sha  TEXT NOT NULL,
  claim      TEXT NOT NULL,
  status     TEXT NOT NULL,
  run_id     TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS conformance_verdicts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  finding_id TEXT NOT NULL,
  verdict    TEXT NOT NULL,
  evidence   TEXT NOT NULL,
  fixed_at   INTEGER,
  fixed_by   TEXT NOT NULL,
  run_id     TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL,
  payload    TEXT NOT NULL,
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS compiled_predicates (
  id         TEXT PRIMARY KEY,
  family     TEXT NOT NULL,
  template   TEXT NOT NULL,
  bindings   TEXT NOT NULL,
  verbatim_quote TEXT NOT NULL,
  anchor     TEXT NOT NULL,
  severity   TEXT NOT NULL,
  check_code TEXT NOT NULL,
  battery_version TEXT NOT NULL,
  calibrated TEXT NOT NULL DEFAULT 'PENDING'
);
CREATE TABLE IF NOT EXISTS calibrations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  predicate_id   TEXT NOT NULL,
  test           TEXT NOT NULL,
  fixture        TEXT NOT NULL,
  result         TEXT NOT NULL,
  evidence       TEXT NOT NULL,
  run_id         TEXT NOT NULL,
  created_at     INTEGER
);
CREATE TABLE IF NOT EXISTS rule_cards (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  quote      TEXT NOT NULL,
  anchor     TEXT NOT NULL,
  classification TEXT NOT NULL,
  severity   TEXT NOT NULL,
  proposed   INTEGER NOT NULL DEFAULT 0,
  corpus_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id     TEXT NOT NULL,
  actor      TEXT NOT NULL,
  event      TEXT NOT NULL,
  triplet    TEXT NOT NULL,
  created_at INTEGER
);
`, MIRROR_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL,
  file TEXT, line INTEGER, lineage TEXT NOT NULL, source TEXT NOT NULL, data TEXT
);
CREATE TABLE IF NOT EXISTS graph_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL REFERENCES graph_nodes(id),
  target_id TEXT NOT NULL REFERENCES graph_nodes(id),
  kind TEXT NOT NULL, lineage TEXT NOT NULL, created_at INTEGER,
  -- \u2605 W9-AUDIT FIX (2026-09-28): the EDGE'S OWN ANCHOR (the source table carries it via
  --   the R19 fix); the mirror DROPPED it, so a rebuilt mirror diverged from the truth.
  file TEXT, line INTEGER
);
CREATE TABLE IF NOT EXISTS findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id TEXT NOT NULL, severity TEXT NOT NULL, file TEXT, line INTEGER,
  range_start INTEGER, range_end INTEGER, evidence TEXT NOT NULL,
  verdict TEXT NOT NULL, week TEXT, run_id TEXT NOT NULL, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER
);
`, GI_PROJECT_STATE_DIR = ".gi";
var init_db = __esm(() => {
  init_migrations();
  SEVERITIES = ["CRIT", "HIGH", "MED", "WARN"];
  EVENT_KINDS = ["HUNT_DONE", "BUILD_DONE", "AUDIT_DONE"];
  IMPLEMENTATION_STATUSES = ["PENDING", "CHANGED", "UNCHANGED", "VERIFIED", "REJECTED"];
  CONFORMANCE_VERDICTS = ["CONFORMANT", "VIOLATED", "PARTIAL"];
  FINDING_VERDICTS = ["VIOLATION", "PASS"];
});

// src/hunter/shared/db-canon.ts
var init_db_canon = __esm(() => {
  init_db();
});

// src/hunter/lexicon/templates.ts
import { createHash as createHash4 } from "crypto";
function templateBindingInvalid(templateId, detail) {
  return new LexiconError("TEMPLATE_BINDING_INVALID", `TEMPLATE_BINDING_INVALID: template=${templateId} detail=${detail} (the bound params failed the template's zod schema \u2014 an invalid binding is a loud named error, never a coerced default)`);
}
function templateMissing(templateId) {
  return new LexiconError("TEMPLATE_MISSING", `TEMPLATE_MISSING: template=${templateId} (the stored check_code names a template absent from the library \u2014 the battery cannot be reinstated)`);
}
function sha256(input) {
  return createHash4("sha256").update(input, "utf8").digest("hex");
}
function readPath(obj, dotted) {
  let cur = obj;
  for (const part of dotted.split(".")) {
    if (cur === null || cur === undefined || typeof cur !== "object")
      return;
    if (!Object.hasOwn(cur, part))
      return;
    if (part === "__proto__" || part === "constructor" || part === "prototype")
      return;
    cur = cur[part];
  }
  return cur;
}
function compareOperator(op, value, threshold) {
  switch (op) {
    case "lt":
      return value < threshold;
    case "lte":
      return value <= threshold;
    case "gt":
      return value > threshold;
    case "gte":
      return value >= threshold;
    default:
      return value > threshold;
  }
}
function bindSeverity(bindings) {
  const sev = bindings["severity"];
  if (typeof sev === "string" && SEVERITIES.includes(sev)) {
    return sev;
  }
  throw templateBindingInvalid("severity", `the severity binding must be one of ${SEVERITIES.join("|")}`);
}
function bindStringArray(bindings, key) {
  const v = bindings[key];
  if (Array.isArray(v)) {
    return v.filter((el) => typeof el === "string");
  }
  return [];
}
function bindStages(bindings) {
  const v = bindings["stages"];
  if (Array.isArray(v)) {
    return v.filter((el) => typeof el === "object" && el !== null && typeof el.id === "string" && typeof el.entry === "string");
  }
  return [];
}
function bindOperator(bindings) {
  const v = bindings["operator"];
  if (typeof v === "string" && (v === "lt" || v === "lte" || v === "gt" || v === "gte")) {
    return v;
  }
  throw templateBindingInvalid("domain.numeric-threshold", `the operator binding must be one of lt|lte|gt|gte, got ${JSON.stringify(v)}`);
}
function bindNumber(bindings, key) {
  const v = bindings[key];
  if (typeof v === "number") {
    return v;
  }
  return;
}
function bindRange(bindings) {
  const v = bindings["range"];
  if (Array.isArray(v) && v.length === 2 && typeof v[0] === "number" && typeof v[1] === "number") {
    return [v[0], v[1]];
  }
  return;
}
function stableBindingsJson(v) {
  if (v === undefined)
    return "null";
  if (v === null || typeof v !== "object")
    return JSON.stringify(v) ?? "null";
  if (Array.isArray(v))
    return `[${v.map((x) => x === undefined ? "null" : stableBindingsJson(x)).join(",")}]`;
  const obj = v;
  const parts = [];
  for (const k of Object.keys(obj).sort()) {
    const val = obj[k];
    if (val === undefined)
      continue;
    parts.push(`${JSON.stringify(k)}:${stableBindingsJson(val)}`);
  }
  return `{${parts.join(",")}}`;
}
function contentAddress(templateId, bindings, anchor) {
  return `${templateId}:${sha256(`${anchor}|${stableBindingsJson(bindings)}`).slice(0, 12)}`;
}
function compileTemplate(template, rawBindings, card, batteryVersion) {
  let validated;
  try {
    validated = template.parameters.parse(rawBindings);
  } catch (e) {
    throw templateBindingInvalid(template.id, `the bound params failed the template's zod schema: ${String(e)}`);
  }
  return {
    id: contentAddress(template.id, validated, card.anchor),
    family: template.family,
    template: template.id,
    bindings: validated,
    verbatimQuote: card.verbatimQuote,
    anchor: card.anchor,
    severity: card.severity,
    batteryVersion,
    check: (ctx) => template.check({ ...ctx, bindings: validated })
  };
}
function safeWhoCalls(graph, sym) {
  try {
    return graph.whoCalls(sym) ?? [];
  } catch {
    return [];
  }
}
function safeImports(graph, module) {
  try {
    return graph.imports(module) ?? [];
  } catch {
    return [];
  }
}
function safeChain(graph, id) {
  try {
    return graph.chain(id) ?? [];
  } catch {
    return [];
  }
}
function safeAwaits(graph, sym) {
  try {
    return graph.awaits(sym) ?? [];
  } catch {
    return [];
  }
}
function safeNodes(graph) {
  try {
    return graph.nodes() ?? [];
  } catch {
    return [];
  }
}
function resolveEdgeAnchor(graph, spec) {
  const files = new Set;
  const cites = new Map;
  const add = (file, c) => {
    if (!file)
      return;
    files.add(file);
    const arr = cites.get(file) ?? [];
    arr.push(c);
    cites.set(file, arr);
  };
  for (const sym of spec.callSymbols) {
    for (const cs of safeWhoCalls(graph, sym)) {
      add(cs.file, { from: cs.caller, to: sym, kind: "calls", file: cs.file, line: cs.line });
    }
  }
  for (const n of safeNodes(graph)) {
    const keys = [];
    if (n.id)
      keys.push(n.id);
    if (n.name && n.name !== n.id)
      keys.push(n.name);
    if (n.file && n.file !== n.name && n.file !== n.id)
      keys.push(n.file);
    if (keys.length === 0)
      continue;
    for (const key of keys) {
      for (const e of safeImports(graph, key)) {
        const target = String(e.to);
        if (spec.importMatchers.some((m) => target.includes(m))) {
          add(e.file || n.file || "", { from: String(e.from), to: String(e.to), kind: "imports", file: e.file, line: e.line });
        }
      }
    }
  }
  for (const n of safeNodes(graph)) {
    if (n.kind !== "function" && n.kind !== "method" && n.kind !== "class")
      continue;
    if (!spec.defMatchers.some((rx) => {
      rx.lastIndex = 0;
      const hit = rx.test(n.name);
      rx.lastIndex = 0;
      return hit;
    }))
      continue;
    const inbound = safeWhoCalls(graph, n.name);
    const steps = safeChain(graph, n.id);
    const aw = safeAwaits(graph, n.name);
    if (inbound.length === 0 && steps.length === 0 && aw.length === 0)
      continue;
    const file = n.file ?? "";
    if (inbound.length > 0) {
      const c0 = inbound[0];
      add(file, { from: c0.caller, to: n.name, kind: "calls", file: c0.file, line: c0.line });
    } else if (steps.length > 0) {
      const s0 = steps[0];
      add(file, { from: String(s0.from), to: String(s0.to), kind: String(s0.kind), file: s0.file, line: s0.line });
    } else {
      const a0 = aw[0];
      add(file, { from: String(a0.from), to: String(a0.to), kind: "awaits", file: a0.file, line: a0.line });
    }
  }
  return { files, cites };
}
function edgeEvidence(c) {
  return `edge ${c.from} -[${c.kind}]-> ${c.to} (${c.file}:${c.line})`;
}
function firstCite(cites, file) {
  return cites.get(file)?.[0];
}
var LexiconError, CARD_FIELDS, WIRING_DEAD_MODULE, WIRING_EXPORT_IMPORTER, CONTRACT_MUST_IMPLEMENT, PROVENANCE_TRACES_TO_SOURCE, PROVENANCE_QUOTED_NOT_SYNTHESIZED, DOMAIN_NUMERIC_THRESHOLD, PROCESS_GATES_OUTPUTS, TEMPLATE_LIBRARY;
var init_templates = __esm(() => {
  init_zod();
  init_db_canon();
  LexiconError = class LexiconError extends Error {
    code;
    constructor(code, message) {
      super(message);
      this.name = code;
      this.code = code;
    }
  };
  CARD_FIELDS = {
    verbatimQuote: string2(),
    anchor: string2(),
    severity: _enum(SEVERITIES)
  };
  WIRING_DEAD_MODULE = {
    id: "wiring.no-dead-module",
    family: "WIRING",
    parameters: object({ ...CARD_FIELDS }),
    check(ctx) {
      const findings = [];
      const sev = bindSeverity(ctx.bindings);
      for (const dead of ctx.graph.unwired()) {
        findings.push({
          ruleId: "wiring.no-dead-module",
          severity: sev,
          file: dead.file,
          line: dead.line,
          evidence: `dead module ${dead.name} (${dead.file}:${dead.line}) has zero inbound callers \u2014 the unwired() graph read lists it`,
          verdict: "VIOLATION"
        });
      }
      return findings;
    }
  };
  WIRING_EXPORT_IMPORTER = {
    id: "wiring.every-export-has-an-importer",
    family: "WIRING",
    parameters: object({ ...CARD_FIELDS }),
    check(ctx) {
      const findings = [];
      const sev = bindSeverity(ctx.bindings);
      const exportLinesByFile = new Map;
      const isExportedDecl = (file, line) => {
        if (!file || typeof line !== "number" || line <= 0)
          return false;
        let lines = exportLinesByFile.get(file);
        if (!lines) {
          lines = new Set;
          try {
            const src = ctx.source.read(file).split(`
`);
            for (let i = 0;i < src.length; i++)
              if (/^\s*export\s/.test(src[i]))
                lines.add(i + 1);
          } catch {}
          exportLinesByFile.set(file, lines);
        }
        return lines.has(line);
      };
      for (const node of ctx.graph.nodes()) {
        if (node.kind !== "class" && node.kind !== "function")
          continue;
        if (!isExportedDecl(node.file, node.line ?? null))
          continue;
        const callers = ctx.graph.whoCalls(node.name);
        if (callers.length === 0 && node.file) {
          findings.push({
            ruleId: "wiring.every-export-has-an-importer",
            severity: sev,
            file: node.file,
            line: node.line ?? 0,
            evidence: `export ${node.name} (${node.file}:${node.line ?? "?"}) has zero call sites \u2014 whoCalls('${node.name}') returned []`,
            verdict: "VIOLATION"
          });
        }
      }
      return findings;
    }
  };
  CONTRACT_MUST_IMPLEMENT = {
    id: "contract.must-implement",
    family: "CONTRACT",
    parameters: object({
      ...CARD_FIELDS,
      declaredInterface: string2().default(""),
      requiredMembers: array(string2()).default([])
    }),
    check(ctx) {
      const findings = [];
      const sev = bindSeverity(ctx.bindings);
      const declaredInterface = String(ctx.bindings["declaredInterface"] ?? "");
      const requiredMembers = bindStringArray(ctx.bindings, "requiredMembers");
      if (!declaredInterface || requiredMembers.length === 0)
        return findings;
      for (const node of ctx.graph.nodes("class")) {
        const nodeInterface = node.data ? readPath(node.data, "interface") : undefined;
        if (node.name !== declaredInterface && nodeInterface !== declaredInterface)
          continue;
        const membersRaw = node.data ? readPath(node.data, "members") : undefined;
        const members = Array.isArray(membersRaw) ? membersRaw.filter((el) => typeof el === "string") : [];
        const missing = requiredMembers.filter((m) => !members.includes(m));
        if (missing.length > 0) {
          findings.push({
            ruleId: "contract.must-implement",
            severity: sev,
            file: node.file ?? "",
            line: node.line ?? 0,
            evidence: `class ${node.name} (${node.file}:${node.line ?? "?"}) declares members ${JSON.stringify(members)} \u2014 missing the declared members ${missing.join(", ")}`,
            verdict: "VIOLATION"
          });
        }
      }
      return findings;
    }
  };
  PROVENANCE_TRACES_TO_SOURCE = {
    id: "provenance.traces-to-source",
    family: "PROVENANCE",
    parameters: object({
      ...CARD_FIELDS,
      targetKinds: array(string2()).default([]),
      requiredTraces: array(string2()).default([])
    }),
    check(ctx) {
      const findings = [];
      const sev = bindSeverity(ctx.bindings);
      const targetKinds = bindStringArray(ctx.bindings, "targetKinds");
      const requiredTraces = bindStringArray(ctx.bindings, "requiredTraces");
      for (const targetKind of targetKinds) {
        for (const node of ctx.graph.nodes(targetKind)) {
          const incoming = ctx.graph.chain(node.id);
          const present = requiredTraces.some((r) => incoming.some((step) => step.to === node.id && step.kind === "traces-to" && step.from.includes(r)));
          if (!present) {
            findings.push({
              ruleId: "provenance.traces-to-source",
              severity: sev,
              file: node.file ?? "",
              line: node.line ?? 0,
              evidence: `${node.name} lacks a traces-to edge from ${requiredTraces.join("/")} \u2014 incoming edges: ${incoming.map((s) => `${s.kind}@${s.from}`).join(", ") || "NONE"}`,
              verdict: "VIOLATION"
            });
          }
        }
      }
      return findings;
    }
  };
  PROVENANCE_QUOTED_NOT_SYNTHESIZED = {
    id: "provenance.quoted-not-synthesized",
    family: "PROVENANCE",
    parameters: object({
      ...CARD_FIELDS,
      file: string2().default(""),
      quote: string2().default(""),
      range: tuple([number2(), number2()]).optional()
    }),
    check(ctx) {
      const findings = [];
      const sev = bindSeverity(ctx.bindings);
      const file = String(ctx.bindings["file"] ?? "");
      const quote = String(ctx.bindings["quote"] ?? "");
      if (!file || !quote)
        return findings;
      const range = bindRange(ctx.bindings);
      const text = ctx.source.read(file, range);
      if (!text.includes(quote)) {
        findings.push({
          ruleId: "provenance.quoted-not-synthesized",
          severity: sev,
          file,
          line: range?.[0] ?? 0,
          evidence: `the verbatim quote '${quote.slice(0, 80)}...' is absent from ${file} \u2014 doctrine is QUOTED, never synthesized (D13)`,
          verdict: "VIOLATION"
        });
      }
      return findings;
    }
  };
  DOMAIN_NUMERIC_THRESHOLD = {
    id: "domain.numeric-threshold",
    family: "DOMAIN",
    parameters: object({
      ...CARD_FIELDS,
      symbol: string2().default(""),
      valuePath: string2().default(""),
      operator: _enum(["lt", "lte", "gt", "gte"]).default("gt"),
      threshold: number2().optional()
    }),
    check(ctx) {
      const findings = [];
      const sev = bindSeverity(ctx.bindings);
      const symbol = String(ctx.bindings["symbol"] ?? "");
      const valuePath = String(ctx.bindings["valuePath"] ?? "");
      const operator = bindOperator(ctx.bindings);
      const threshold = bindNumber(ctx.bindings, "threshold");
      if (!symbol || !valuePath || typeof threshold !== "number" || !Number.isFinite(threshold))
        return findings;
      for (const node of ctx.graph.nodes()) {
        if (node.name !== symbol)
          continue;
        const value = readPath(node.data ?? {}, valuePath);
        if (typeof value !== "number" || !Number.isFinite(value))
          continue;
        if (compareOperator(operator, value, threshold)) {
          findings.push({
            ruleId: "domain.numeric-threshold",
            severity: sev,
            file: node.file ?? "",
            line: node.line ?? 0,
            evidence: `${node.name}.${valuePath} = ${value} violates the declared ${operator} ${threshold} ceiling (bindings: ${JSON.stringify(ctx.bindings)})`,
            verdict: "VIOLATION"
          });
        }
      }
      return findings;
    }
  };
  PROCESS_GATES_OUTPUTS = {
    id: "process.gates-measure-outputs-not-logic",
    family: "PROCESS",
    parameters: object({
      ...CARD_FIELDS,
      stages: array(object({ id: string2(), entry: string2() })).default([])
    }),
    check(ctx) {
      const findings = [];
      const sev = bindSeverity(ctx.bindings);
      const stages = bindStages(ctx.bindings);
      for (let i = 0;i + 1 < stages.length; i++) {
        const cur = stages[i];
        const next = stages[i + 1];
        const outgoing = ctx.graph.awaits(cur.entry);
        const callers = ctx.graph.whoCalls(next.entry);
        const connected = outgoing.some((e) => e.to.includes(next.entry)) || callers.some((c) => c.caller === cur.entry);
        if (!connected) {
          let stageFile = "";
          try {
            const hit = ctx.graph.nodes().find((n) => n.name === cur.entry);
            if (hit?.file)
              stageFile = hit.file;
          } catch {}
          findings.push({
            ruleId: "process.gates-measure-outputs-not-logic",
            severity: sev,
            file: stageFile,
            line: 0,
            evidence: `stage ${cur.id} (entry ${cur.entry}) has no graph edge reaching stage ${next.id} (entry ${next.entry}) \u2014 the declared sequence is not wired in the call graph`,
            verdict: "VIOLATION"
          });
        }
      }
      return findings;
    }
  };
  TEMPLATE_LIBRARY = {
    "wiring.no-dead-module": WIRING_DEAD_MODULE,
    "wiring.every-export-has-an-importer": WIRING_EXPORT_IMPORTER,
    "contract.must-implement": CONTRACT_MUST_IMPLEMENT,
    "provenance.traces-to-source": PROVENANCE_TRACES_TO_SOURCE,
    "provenance.quoted-not-synthesized": PROVENANCE_QUOTED_NOT_SYNTHESIZED,
    "domain.numeric-threshold": DOMAIN_NUMERIC_THRESHOLD,
    "process.gates-measure-outputs-not-logic": PROCESS_GATES_OUTPUTS
  };
});

// src/hunter/lexicon/rule-card.ts
function corpusUnreadable(corpusPath, detail) {
  return new LexiconError("CORPUS_UNREADABLE", `CORPUS_UNREADABLE: path=${corpusPath} detail=${detail} (a corpus path that cannot be read is a loud named error, never a silent skip)`);
}
function corpusEmpty() {
  return new LexiconError("CORPUS_EMPTY", `CORPUS_EMPTY: the corpus path list is empty \u2014 the profile's rules.corpus is min(1); a compile with zero corpus paths is a profile error, never an empty battery`);
}
function countMatches(re, text) {
  const m = text.match(re);
  return m ? m.length : 0;
}
function classify(quote) {
  const scores = {
    ARCH: countMatches(ARCH_TERMS, quote),
    LOGIC: countMatches(LOGIC_TERMS, quote),
    PROCESS: countMatches(PROCESS_TERMS, quote),
    DOMAIN: countMatches(DOMAIN_TERMS, quote)
  };
  const max = Math.max(...Object.values(scores));
  const CLASSIFICATIONS = ["ARCH", "LOGIC", "PROCESS", "DOMAIN"];
  const winners = CLASSIFICATIONS.filter((k) => scores[k] === max && scores[k] > 0);
  if (winners.length === 1)
    return { classification: winners[0], ambiguous: false };
  return { classification: "PROCESS", ambiguous: true };
}
function rate(text) {
  if (/(^|\W)(NEVER|FUCKING|ABSOLUTELY|MANDATORY)(\W|$)/i.test(text))
    return "CRIT";
  if (/(^|\W)(MUST|ALWAYS|BANNED|FORBIDDEN|CRITICAL)(\W|$)/i.test(text))
    return "HIGH";
  if (/(^|\W)(SHOULD|SHALL|REQUIRE|REQUIRES|REQUIRED|ENSURE)(\W|$)/i.test(text))
    return "MED";
  return "WARN";
}
function voiceAmbiguous(text) {
  return SOFT_VOICE.test(text) || CONDITIONAL_HEDGE.test(text);
}
function readDeclaredMeta(lines, start) {
  const meta = {};
  for (let i = start;i < lines.length && i < start + META_SCAN_WINDOW; i++) {
    const line = lines[i];
    if (line.trim() === "")
      break;
    const cm = line.match(DECLARED_CLASSIFICATION);
    if (cm && !meta.classification) {
      const v = String(cm[1]).toUpperCase();
      if (isClassification(v))
        meta.classification = v;
    }
    const sm = line.match(DECLARED_SEVERITY);
    if (sm && !meta.severity) {
      const v = String(sm[1]).toUpperCase();
      if (isSeverity(v))
        meta.severity = v;
    }
    if (cm || sm)
      continue;
    if (isRuleShaped(line) || isQuotedPassage(line) || isBlockquote(line))
      break;
  }
  return meta;
}
function isClassification(v) {
  return v === "ARCH" || v === "LOGIC" || v === "PROCESS" || v === "DOMAIN";
}
function isSeverity(v) {
  return SEVERITIES.includes(v);
}
function isBlockquote(line) {
  return BLOCKQUOTE.test(line);
}
function isQuotedPassage(line) {
  return QUOTED_PASSAGE.test(line);
}
function isRuleShaped(line) {
  return RULE_SHAPE.test(line);
}
function collectBlockquote(lines, start) {
  const collected = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "")
      break;
    const m = line.match(/^\s*>\s?/);
    if (!m)
      break;
    collected.push(line.slice(m[0].length));
    i++;
  }
  return { text: collected.join(" ").trim(), end: i };
}
function extractInlineQuote(line) {
  const m = line.match(/["\u201C]([^"\u201D]+)["\u201D]/);
  return m ? m[1].trim() : line.trim();
}
function makeCard(quote, anchor, sourceLine, declared) {
  const { classification: voted, ambiguous } = classify(quote);
  const curated = declared?.classification !== undefined && declared?.severity !== undefined;
  const proposed = curated ? 0 : ambiguous || quote.trim().length === 0 || voiceAmbiguous(quote) ? 1 : 0;
  return {
    verbatimQuote: quote,
    anchor,
    classification: declared?.classification ?? voted,
    severity: declared?.severity ?? rate(quote),
    proposed
  };
}
function cardsFromLines(file, lines) {
  const cards = [];
  for (let i = 0;i < lines.length; i++) {
    const lineNo = i + 1;
    const anchor = `${file}:${lineNo}`;
    const line = lines[i];
    if (isBlockquote(line)) {
      const collected = collectBlockquote(lines, i);
      cards.push(makeCard(collected.text, anchor, line, readDeclaredMeta(lines, collected.end)));
      i = collected.end - 1;
    } else if (isQuotedPassage(line)) {
      cards.push(makeCard(extractInlineQuote(line), anchor, line, readDeclaredMeta(lines, i + 1)));
    } else if (isRuleShaped(line)) {
      cards.push(makeCard(line.trim(), anchor, line, readDeclaredMeta(lines, i + 1)));
    }
  }
  return cards;
}
function cardsFromText(file, text) {
  return cardsFromLines(file, text.split(`
`));
}
var BLOCKQUOTE, QUOTED_PASSAGE, RULE_SHAPE, SOFT_VOICE, CONDITIONAL_HEDGE, ARCH_TERMS, LOGIC_TERMS, PROCESS_TERMS, DOMAIN_TERMS, DECLARED_CLASSIFICATION, DECLARED_SEVERITY, META_SCAN_WINDOW = 4;
var init_rule_card = __esm(() => {
  init_db_canon();
  init_templates();
  BLOCKQUOTE = /^\s*>\s?/;
  QUOTED_PASSAGE = /["\u201C][^"\u201D]{3,}["\u201D]/;
  RULE_SHAPE = /(^|\W)(NEVER|MUST|FUCKING|ALWAYS|ABSOLUTELY|BANNED|FORBIDDEN|MANDATORY)(\W|$)/i;
  SOFT_VOICE = /(^|\W)(may|might|could|should|perhaps|probably|maybe|consider|suggests?|possibly|ideally|eventually)(\W|$)/i;
  CONDITIONAL_HEDGE = /\bif\b[^\n]{0,60}\b(then|it would|we can|one could|may|might)\b/i;
  ARCH_TERMS = /architecture|pipeline|stage|module|layer|wiring|chain/gi;
  LOGIC_TERMS = /anchor|derive|compare|provenance|cascade|divergence|compute|inject/gi;
  PROCESS_TERMS = /audit|gate|verify|test|document|quote|evidence|harness/gi;
  DOMAIN_TERMS = /zone|liquidity|SL|TP|RRR|pip|mitigation|pressure|entry/gi;
  DECLARED_CLASSIFICATION = /^\s*classification\s*[:=]\s*(ARCH|LOGIC|PROCESS|DOMAIN)\b/i;
  DECLARED_SEVERITY = /^\s*severity\s*[:=]\s*(CRIT|HIGH|MED|WARN)\b/i;
});

// src/hunter/shared/containment.ts
import * as fs23 from "fs";
import * as path25 from "path";
function rootPrefixOf(rootReal) {
  if (rootReal.length === 0)
    throw new Error("CONTAINMENT_BAD_ROOT: rootReal must not be empty");
  return rootReal === path25.sep ? path25.sep : rootReal + path25.sep;
}
function insideRoot(real, rootReal) {
  return real === rootReal || real.startsWith(rootPrefixOf(rootReal));
}
function realNearest(target, maxClimb = 512) {
  const abs = path25.resolve(target);
  const missing = [];
  let dir = abs;
  for (let i = 0;i <= maxClimb; i += 1) {
    if (i === maxClimb) {
      throw new Error(`CONTAINMENT_CLIMB_EXHAUSTED: target=${target} (the missing chain exceeds ${maxClimb} segments \u2014 refusing unverified containment)`);
    }
    try {
      const realDir = fs23.realpathSync(dir);
      return missing.length === 0 ? realDir : path25.join(realDir, ...missing.reverse());
    } catch (e) {
      const code = e.code;
      if (code !== "ENOENT" && code !== "ENOTDIR")
        throw e;
      const parent = path25.dirname(dir);
      if (parent === dir)
        break;
      missing.push(path25.basename(dir));
      dir = parent;
    }
  }
  return abs;
}
function checkContained(target, root) {
  try {
    let rootReal;
    let rootResolved;
    try {
      rootReal = fs23.realpathSync(root);
      rootResolved = true;
    } catch {
      rootReal = realNearest(root);
      rootResolved = false;
    }
    const real = realNearest(target);
    const contained = insideRoot(real, rootReal);
    const targetAbs = path25.resolve(target);
    const resolved = real !== targetAbs || fs23.existsSync(real);
    return { real, rootReal, contained, resolved };
  } catch {
    let rootReal = "";
    try {
      rootReal = fs23.realpathSync(root);
    } catch {
      rootReal = path25.resolve(root);
    }
    return { real: path25.resolve(target), rootReal, contained: false, resolved: false };
  }
}
function requireContained(target, root, onViolation) {
  const { real, rootReal, contained } = checkContained(target, root);
  if (!contained)
    onViolation({ real, rootReal, target, root });
  return real;
}
var init_containment = () => {};

// src/hydra/templates/types.ts
var LayerCandidateSchema, SubagentOutputSchema;
var init_types = __esm(() => {
  init_zod();
  LayerCandidateSchema = object({
    layer: string2(),
    predicate: string2(),
    subject: string2(),
    object: string2(),
    file: string2(),
    line: number2().int().positive(),
    evidence: string2().min(1),
    implicatedSpecClause: string2().optional(),
    graphContext: object({
      communityId: number2().optional(),
      degree: number2().optional(),
      inferredPaths: array(string2()).optional()
    }).optional(),
    severity: _enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
    confidence: number2().min(0).max(1).optional(),
    crossReferenced: boolean2().optional(),
    crossReferencedBy: array(string2()).optional(),
    graphRefs: array(string2()).optional()
  });
  SubagentOutputSchema = object({
    candidates: array(LayerCandidateSchema),
    graphSlice: object({
      queriedConcepts: array(string2()),
      relevantSubgraph: string2()
    }).optional(),
    summary: string2()
  });
});

// src/hydra/templates/lasme.ts
function lasmeTemplate(layerId, anchorPredicate, layerNumber, graphQueries, filterTags, mandate) {
  return {
    layerId,
    anchorPredicate,
    layerNumber,
    graphQueries,
    filterTags,
    outputSchema: SubagentOutputSchema,
    staticPrompt: `IDENTITY: ${anchorPredicate.toUpperCase()} hunter \u2014 ${mandate} Fire on what IS (file+line+verbatim quote or [INFERRED]+graph edge); never fire on test fixtures/mocks/calib:-exempted sites. GRAPH LAW: query graph before files; prefer EXTRACTED; path-trace connections; subgraph depth 3 for blast radius; never fabricate. FINDINGS CONTRACT: findings/report.md via write_findings, ## FINDING: blocks (predicate/file path:line/evidence/spec) + ## SUMMARY.`
  };
}
var lasmeLexiconTemplate, lasmeActorTemplate, lasmeStateMachineTemplate, lasmeEngineTemplate, lasmeAdapterTemplate, lasmeMpseThresholdTemplate, LASME_TEMPLATES;
var init_lasme = __esm(() => {
  init_types();
  lasmeLexiconTemplate = lasmeTemplate("R18-lasme-lexicon", "lexicon", 18, ["find all interfaces with more than 5 members", "show if/else chains deeper than 3", "find numeric literals not in named constants"], ["lexicon", "PatternFamily", "ISE"], "hunt lexicon derailments (unanchored literals gating decisions, missing PatternFamily coverage).");
  lasmeActorTemplate = lasmeTemplate("R19-lasme-actor", "actor", 19, ["show all createMachine and createActor call sites", "trace send() to subscribe() paths", "find actors without subscription handlers"], ["actor", "createMachine", "createActor", "send", "subscribe"], "hunt actor topology (missing subscriptions, broken message flow, topology drift, orphan actors).");
  lasmeStateMachineTemplate = lasmeTemplate("R20-lasme-state-machine", "state-machine", 20, ["find machines with scattered boolean flags alongside them", "show state machines with their state count", "find XState createMachine configurations"], ["state-machine", "XState", "createMachine", "boolean-flags"], "hunt state-machine derailments (scattered boolean flags, missing machine coverage, drifted configs).");
  lasmeEngineTemplate = lasmeTemplate("R21-lasme-engine", "engine", 21, ["find all writeFileSync and file I/O calls", "trace degrade/fallback branches", "find container config references"], ["engine", "writeFileSync", "degrade", "side-effect"], "hunt engine derailments (unlogged degrades, silent swallows, side-effect scope breaches).");
  lasmeAdapterTemplate = lasmeTemplate("R22-lasme-adapter", "adapter", 22, ["find delegation function patterns", "show spread operator and Object.assign merge sites", "trace adapter to engine call chains"], ["adapter", "delegation", "snapshot-merge", "parity"], "hunt adapter derailments (broken delegation, lossy merges, parity drift between twin adapters).");
  lasmeMpseThresholdTemplate = lasmeTemplate("R23-lasme-mpse-threshold", "mpse-threshold", 23, ["find numeric comparisons in contract-checking functions", "show Math.abs and comparison operators near contract calls", "find epsilon oracle patterns"], ["mpse-threshold", "epsilon", "contract-call", "numeric-decision"], "hunt mpse-threshold derailments (unanchored numerics gating contract verdicts).");
  LASME_TEMPLATES = [
    lasmeLexiconTemplate,
    lasmeActorTemplate,
    lasmeStateMachineTemplate,
    lasmeEngineTemplate,
    lasmeAdapterTemplate,
    lasmeMpseThresholdTemplate
  ];
});

// src/hydra/templates/mpse.ts
var candidateWithContract, MpseConformanceBaseSchema, MpseContractConformanceSchema, MpseContractOutputSchema, mpseContractTemplate, MpseOracleConformanceSchema, MpseOracleOutputSchema, mpseOracleTemplate, MpseStageConformanceSchema, MpseStageOutputSchema, mpseStageTemplate, TraceGapSchema, ProvenanceConformanceSchema, MpseProvenanceOutputSchema, mpseProvenanceTemplate, MPSE_TEMPLATES;
var init_mpse = __esm(() => {
  init_zod();
  init_types();
  candidateWithContract = LayerCandidateSchema.extend({
    contractId: string2().optional(),
    implementationStatus: _enum(["conformant", "violated", "unimplemented"]).optional()
  });
  MpseConformanceBaseSchema = object({
    contractId: string2().min(1),
    specPath: string2().min(1),
    specLine: number2().int().positive(),
    specQuote: string2().min(1),
    implementationStatus: _enum(["conformant", "violated", "unimplemented"]),
    file: string2().optional(),
    line: number2().int().positive().optional(),
    evidence: string2().optional()
  });
  MpseContractConformanceSchema = MpseConformanceBaseSchema.extend({});
  MpseContractOutputSchema = object({
    candidates: array(candidateWithContract),
    conformances: array(MpseContractConformanceSchema).optional(),
    summary: string2().min(1)
  });
  mpseContractTemplate = {
    layerId: "R24-mpse-contract",
    anchorPredicate: "contract",
    layerNumber: 24,
    graphQueries: [
      "trace contract.checkContract() call chains",
      "find function implementations matching spec declarations"
    ],
    filterTags: ["threshold", "contract", "spec-clause"],
    outputSchema: MpseContractOutputSchema,
    staticPrompt: `IDENTITY: CONTRACT hunter \u2014 hunt contract conformance (unimplemented/violated/missing-guard/drifted contracts). Trace spec clause \u2192 checkContract() chain \u2192 implementing function \u2192 verdict. Fire on what IS (file+line+verbatim quote or [INFERRED]+graph edge). GRAPH LAW: query graph before files; prefer EXTRACTED; path-trace connections; subgraph depth 3 for blast radius; never fabricate. FINDINGS CONTRACT: findings/report.md via write_findings, ## FINDING: blocks (predicate/file path:line/evidence/spec) + ## SUMMARY.`
  };
  MpseOracleConformanceSchema = MpseConformanceBaseSchema.extend({
    epsilon: number2().optional()
  });
  MpseOracleOutputSchema = object({
    candidates: array(candidateWithContract),
    conformances: array(MpseOracleConformanceSchema).optional(),
    summary: string2().min(1)
  });
  mpseOracleTemplate = {
    layerId: "R25-mpse-oracle",
    anchorPredicate: "oracle",
    layerNumber: 25,
    graphQueries: [
      "find Math.abs and comparison operators near threshold constants",
      "trace epsilon oracle patterns"
    ],
    filterTags: ["threshold", "epsilon"],
    outputSchema: MpseOracleOutputSchema,
    staticPrompt: `IDENTITY: ORACLE hunter \u2014 hunt epsilon/oracle threshold enforcement (unguarded numeric decisions, epsilon drift, missing oracle guards near contract calls). Fire on what IS (file+line+verbatim quote or [INFERRED]+graph edge). GRAPH LAW: query graph before files; prefer EXTRACTED; never fabricate. FINDINGS CONTRACT: findings/report.md via write_findings, ## FINDING: blocks + ## SUMMARY.`
  };
  MpseStageConformanceSchema = MpseConformanceBaseSchema.extend({});
  MpseStageOutputSchema = object({
    candidates: array(candidateWithContract),
    conformances: array(MpseStageConformanceSchema).optional(),
    summary: string2().min(1)
  });
  mpseStageTemplate = {
    layerId: "R26-mpse-stage",
    anchorPredicate: "stage",
    layerNumber: 26,
    graphQueries: [
      "show function call chains with their pre/post conditions",
      "find stage gate violations"
    ],
    filterTags: ["pre-condition", "post-condition", "invariant"],
    outputSchema: MpseStageOutputSchema,
    staticPrompt: `IDENTITY: STAGE hunter \u2014 hunt stage-gate enforcement (pre/post/invariant violations in call chains, guard-skipping paths). Fire on what IS (file+line+verbatim quote or [INFERRED]+graph edge). GRAPH LAW: query graph before files; prefer EXTRACTED; never fabricate. FINDINGS CONTRACT: findings/report.md via write_findings, ## FINDING: blocks + ## SUMMARY.`
  };
  TraceGapSchema = MpseConformanceBaseSchema.extend({
    implementationStatus: literal("unimplemented"),
    evidence: string2().min(1),
    gapReason: string2().min(1).optional()
  });
  ProvenanceConformanceSchema = MpseConformanceBaseSchema.extend({});
  MpseProvenanceOutputSchema = object({
    candidates: array(candidateWithContract),
    conformances: array(ProvenanceConformanceSchema).optional(),
    traceGaps: array(TraceGapSchema).optional(),
    summary: string2().min(1)
  });
  mpseProvenanceTemplate = {
    layerId: "R27-mpse-provenance",
    anchorPredicate: "provenance",
    layerNumber: 27,
    graphQueries: [
      "path spec clause reference to code implementation",
      "find unreachable spec declarations"
    ],
    filterTags: ["trace-gap", "unreachable", "provenance"],
    outputSchema: MpseProvenanceOutputSchema,
    staticPrompt: `IDENTITY: PROVENANCE hunter \u2014 hunt trace gaps (spec clauses with no implementing code, unreachable declarations). Missing trace = TRACE_GAP. Fire on what IS (file+line+verbatim quote or [INFERRED]+graph edge). GRAPH LAW: query graph before files; prefer EXTRACTED; never fabricate. FINDINGS CONTRACT: findings/report.md via write_findings, ## FINDING: blocks + ## SUMMARY.`
  };
  MPSE_TEMPLATES = [mpseContractTemplate, mpseOracleTemplate, mpseStageTemplate, mpseProvenanceTemplate];
});

// src/hydra/templates/sro.ts
function sroTemplate(layerId, anchorPredicate, layerNumber, graphQueries, filterTags, mandate) {
  return {
    layerId,
    anchorPredicate,
    layerNumber,
    graphQueries,
    filterTags,
    outputSchema: SubagentOutputSchema,
    staticPrompt: `IDENTITY: ${anchorPredicate.toUpperCase()} hunter \u2014 ${mandate} You query the SAME shared graph all gates used (one-graph law). MEASURED, never assumed \u2014 an empty list is valid when genuinely measured empty. Every candidate CONFIRMED by graph query AND file grep (two-leg verification). GRAPH LAW: prefer EXTRACTED; subgraph depth 3 for blast radius; never fabricate. FINDINGS CONTRACT: findings/report.md via write_findings, ## FINDING: blocks (predicate/file path:line/evidence/spec) + ## SUMMARY.`
  };
}
var sroGraphTemplate, sroPathTemplate, sroDeadCodeTemplate, sroCyclesTemplate, SRO_TEMPLATES;
var init_sro = __esm(() => {
  init_types();
  sroGraphTemplate = sroTemplate("R28-sro-graph", "graph-structure", 28, [
    "show all nodes and edges from the merged graph",
    "find orphaned modules with no incoming or outgoing edges",
    "show layer violations where imports cross architectural boundaries",
    "explain god nodes with highest degree and their communities",
    "get subgraph around orphaned candidates depth 3"
  ], ["violates", "triggers", "shouldBe", "declares", "evaluates_to", "contradicts_oracle", "flagged_by", "caused"], "hunt architectural anomalies in the merged graph (orphans, layer violations, god-node risks).");
  sroPathTemplate = sroTemplate("R29-sro-path", "impact-path", 29, [
    "path from {finding.file}:{finding.line} to all callers within 5 hops",
    "get neighbors of {finding.subject} depth 3 for blast radius",
    "explain {finding.subject} including connections and community",
    "get subgraph centered on finding node depth 2"
  ], ["violates", "shouldBe", "implements", "evaluates_to", "contradicts_oracle", "ungrounded_threshold", "flagged_by", "derived_from"], "hunt impact paths (caller chains within 5 hops, blast radius per finding).");
  sroDeadCodeTemplate = sroTemplate("R30-sro-dead-code", "dead-code", 30, [
    "find nodes with in-degree 0 that are exported",
    "show functions not in any call chain",
    "find modules with no consumers",
    "get subgraph around candidate dead node depth 2"
  ], ["declares", "implements", "wraps", "shouldBe", "flagged_by", "derived_from", "violates", "evaluates_to"], "hunt dead code (exports with no importers, functions with no callers, modules with no consumers).");
  sroCyclesTemplate = sroTemplate("R31-sro-cycles", "cycles", 31, ["find cycles in the import graph", "show circular dependency chains"], ["violates", "triggers", "shouldBe", "declares", "evaluates_to", "contradicts_oracle", "flagged_by", "caused"], "hunt circular dependencies (import cycles length>=2 verified by reading import statements, SCCs size>=2).");
  SRO_TEMPLATES = [sroGraphTemplate, sroPathTemplate, sroDeadCodeTemplate, sroCyclesTemplate];
});

// src/hydra/templates/index.ts
var exports_templates = {};
__export(exports_templates, {
  templateByLayerId: () => templateByLayerId
});
function templateByLayerId(layerId) {
  if (typeof layerId !== "string" || layerId.trim() === "")
    return null;
  return BY_LAYER_ID[layerId] ?? null;
}
var ALL_TEMPLATES, BY_LAYER_ID;
var init_templates2 = __esm(() => {
  init_lasme();
  init_mpse();
  init_sro();
  init_types();
  init_lasme();
  init_mpse();
  init_sro();
  ALL_TEMPLATES = [
    ...LASME_TEMPLATES,
    ...MPSE_TEMPLATES,
    ...SRO_TEMPLATES
  ];
  if (ALL_TEMPLATES.length !== 14) {
    throw new Error(`HUNTER_TEMPLATE_COUNT: registry law requires exactly 14 templates (6 LASME + 4 MPSE + 4 SRO), found ${ALL_TEMPLATES.length}`);
  }
  BY_LAYER_ID = {};
  for (const t of ALL_TEMPLATES) {
    if (BY_LAYER_ID[t.layerId] !== undefined) {
      throw new Error(`HUNTER_TEMPLATE_DUPLICATE: duplicate layerId '${t.layerId}'`);
    }
    BY_LAYER_ID[t.layerId] = t;
  }
});

// src/hunter/shared/kind-for-layer.ts
function kindForLayer(layerId) {
  if (layerId == null || typeof layerId !== "string")
    return "Threshold";
  const low = layerId.toLowerCase();
  if (low.includes("r28"))
    return "Gate";
  if (low.includes("r29"))
    return "File";
  if (low.includes("r30"))
    return "File";
  if (low.includes("r31"))
    return "Container";
  if (low.includes("lexicon"))
    return "Lexicon";
  if (low.includes("actor"))
    return "Actor";
  if (low.includes("state-machine") || low.includes("state_machine"))
    return "Machine";
  if (low.includes("engine"))
    return "Engine";
  if (low.includes("adapter"))
    return "Adapter";
  if (low.includes("contract"))
    return "Contract";
  if (low.includes("oracle"))
    return "Threshold";
  if (low.includes("stage"))
    return "Gate";
  if (low.includes("provenance"))
    return "SpecClause";
  if (low.includes("mpse"))
    return "Threshold";
  if (low.includes("sro") || low.includes("graph") || low.includes("path") || low.includes("dead") || low.includes("cycle"))
    return "Gate";
  return "Threshold";
}

// src/hydra/map-reader.ts
import fs34 from "fs";
import path38 from "path";
function parseGraphJson(contents, _sizeHint) {
  const byteLen = Buffer.byteLength(contents, "utf-8");
  if (byteLen > GRAPH_LOAD_BUDGET_BYTES2) {
    throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${byteLen} bytes (> ${GRAPH_LOAD_BUDGET_BYTES2} budget). Fix: scope/extract a subtree or lower the graph cardinality.`);
  }
  let maxDepth = 0;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0;i < contents.length; i++) {
    const c = contents.charCodeAt(i);
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (c === 92) {
        escaped = true;
        continue;
      }
      if (c === 34)
        inString = false;
      continue;
    }
    if (c === 34) {
      inString = true;
      continue;
    }
    if (c === 123 || c === 91) {
      depth++;
      if (depth > maxDepth)
        maxDepth = depth;
    } else if (c === 125 || c === 93)
      depth--;
  }
  if (maxDepth > 64) {
    throw new Error(`GRAPHIFY_GRAPH_TOO_DEEP: graph.json nesting depth ${maxDepth} (> 64) \u2014 likely adversarial or corrupted payload`);
  }
  return JSON.parse(contents);
}
function normalizeGraph(raw) {
  const rawNodes = raw["nodes"] ?? [];
  const rawLinks = raw["links"] ?? raw["edges"] ?? [];
  for (const [i, n] of rawNodes.entries()) {
    if (n === null || typeof n !== "object" || Array.isArray(n)) {
      throw new Error(`GRAPHIFY_PARSE_INVALID: nodes[${i}] is not an object \u2014 got ${typeof n}`);
    }
  }
  const rawLinksValidated = rawLinks.map((e, i) => {
    if (e === null || typeof e !== "object" || Array.isArray(e)) {
      throw new Error(`GRAPHIFY_PARSE_INVALID: edges[${i}] is not an object \u2014 got ${typeof e}`);
    }
    return e;
  });
  const nodes = rawNodes.map((n, i) => {
    const r = n;
    const idRaw = r["id"] ?? r["label"];
    if (idRaw === undefined || idRaw === null || String(idRaw).length === 0) {
      throw new Error(`GRAPHIFY_PARSE_INVALID: nodes[${i}] has neither id nor label \u2014 an identity-less node would collide with every other on the empty key`);
    }
    return {
      id: String(idRaw),
      label: String(r["label"] ?? r["id"] ?? ""),
      type: String(r["file_type"] ?? r["type"] ?? "unknown"),
      file: String(r["source_file"] ?? r["file"] ?? ""),
      data: r
    };
  });
  const edges = rawLinksValidated.map((e) => {
    const rawConf = String(e["confidence"] ?? "EXTRACTED");
    return {
      src: String(e["source"] ?? e["src"] ?? ""),
      dst: String(e["target"] ?? e["dst"] ?? ""),
      relation: String(e["relation"] ?? "references"),
      confidence: rawConf === "INFERRED" ? "INFERRED" : "EXTRACTED"
    };
  });
  const communityMap = new Map;
  for (const n of rawNodes) {
    if (typeof n["community"] === "number") {
      const arr = communityMap.get(n["community"]) ?? [];
      arr.push(String(n["id"] ?? ""));
      communityMap.set(n["community"], arr);
    }
  }
  const communities = [];
  for (const [cid, members] of communityMap.entries()) {
    communities.push({ id: String(cid), label: `Community ${cid}`, members, size: members.length });
  }
  const degree = new Map;
  for (const e of edges) {
    degree.set(e.src, (degree.get(e.src) ?? 0) + 1);
    degree.set(e.dst, (degree.get(e.dst) ?? 0) + 1);
  }
  const godNodes = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  return { nodes, edges, communities, godNodes };
}
async function readGraphJson(graphPath) {
  if (typeof graphPath !== "string" || graphPath.trim() === "") {
    throw new Error("GRAPHIFY_CONNECT_INVALID: graphPath must be non-empty string");
  }
  const resolved = path38.resolve(graphPath);
  let stat;
  try {
    stat = await fs34.promises.stat(resolved);
  } catch {
    throw new Error(`GRAPHIFY_NOT_WARM: graph.json not found at ${resolved} \u2014 remedy: run the explicit graphify build for this target, then re-run the audit`);
  }
  const gSize = Number.isFinite(stat.size) && stat.size > 0 ? stat.size : Number.MAX_SAFE_INTEGER;
  if (gSize > GRAPH_LOAD_BUDGET_BYTES2) {
    throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${gSize} bytes (> ${GRAPH_LOAD_BUDGET_BYTES2} budget). Fix: scope/extract a subtree or lower graph cardinality.`);
  }
  if (gSize > GRAPH_PARSE_YIELD_BYTES2) {
    await new Promise((res) => setImmediate(() => res()));
  }
  let raw;
  try {
    raw = parseGraphJson(await fs34.promises.readFile(resolved, "utf-8"), gSize);
  } catch (err) {
    const msg = String(err.message ?? err);
    if (msg.includes("GRAPHIFY_GRAPH_TOO_LARGE"))
      throw err;
    throw new Error(`GRAPHIFY_EXTRACT_FAILED: graph.json parse failed \u2014 ${msg}`);
  }
  return normalizeGraph(raw);
}
function tokenScan(graph, question) {
  const toks = question.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const matched = graph.nodes.filter((n) => toks.some((tok) => n.label.toLowerCase().includes(tok) || n.id.toLowerCase().includes(tok) || n.file.toLowerCase().includes(tok)));
  const relatedEdges = graph.edges.filter((e) => matched.some((m) => m.id === e.src || m.id === e.dst));
  return matched.length > 0 ? { nodes: matched, edges: relatedEdges, query: question } : { nodes: graph.nodes.slice(0, 5), edges: [], query: question };
}

class GraphifyMapReader {
  mcp;
  lastGraphPath = null;
  lastProbeOkAt = 0;
  probeFresh() {
    return Date.now() - this.lastProbeOkAt < 30000;
  }
  constructor(mcp) {
    this.mcp = mcp ?? null;
  }
  async load(graphPath) {
    const g = await readGraphJson(graphPath);
    this.lastGraphPath = path38.resolve(graphPath);
    return g;
  }
  async query(graph, question) {
    if (!graph || !Array.isArray(graph.nodes))
      throw new Error("GRAPHIFY_QUERY_INVALID: graph required");
    if (typeof question !== "string" || question.trim() === "")
      throw new Error("GRAPHIFY_QUERY_INVALID: question must be non-empty");
    if (this.mcp?.isConnected() && !this.probeFresh()) {
      try {
        String(await this.mcp.callTool("query_graph", { question }));
        this.lastProbeOkAt = Date.now();
        return tokenScan(graph, question);
      } catch (e) {
        console.error("[map-reader] MCP query_graph failed (falling back to local scan) token=GRAPHIFY_MCP_FALLBACK reason=" + (e instanceof Error ? e.message : String(e)) + " remedy=local token-scan over loaded graph");
      }
    }
    return tokenScan(graph, question);
  }
  async path(graph, from, to) {
    if (!graph || !Array.isArray(graph.nodes))
      throw new Error("GRAPHIFY_PATH_INVALID: graph required");
    if (typeof from !== "string" || from.trim() === "" || typeof to !== "string" || to.trim() === "") {
      throw new Error("GRAPHIFY_PATH_INVALID: from and to must be non-empty");
    }
    if (this.mcp?.isConnected() && !this.probeFresh()) {
      try {
        String(await this.mcp.callTool("shortest_path", { source: from, target: to }));
        this.lastProbeOkAt = Date.now();
      } catch (e) {
        console.error("[map-reader] MCP shortest_path failed (falling back to local BFS) token=GRAPHIFY_MCP_FALLBACK reason=" + (e instanceof Error ? e.message : String(e)) + " remedy=local BFS over loaded graph");
      }
    }
    const low = (q) => q.toLowerCase();
    const fromId = graph.nodes.find((n) => n.label.toLowerCase().includes(low(from)) || n.id.toLowerCase() === low(from))?.id ?? null;
    const toId = graph.nodes.find((n) => n.label.toLowerCase().includes(low(to)) || n.id.toLowerCase() === low(to))?.id ?? null;
    if (!fromId || !toId)
      return { from, to, hops: [], length: 0 };
    const adj = new Map;
    for (const e of graph.edges) {
      adj.set(e.src, [...adj.get(e.src) ?? [], e.dst]);
      adj.set(e.dst, [...adj.get(e.dst) ?? [], e.src]);
    }
    const visited = new Set([fromId]);
    const parent = new Map([[fromId, null]]);
    const queue = [fromId];
    let head = 0;
    while (head < queue.length) {
      const last = queue[head++];
      if (last === toId) {
        const rev = [];
        let cur = toId;
        while (cur !== null) {
          rev.push(cur);
          cur = parent.get(cur) ?? null;
        }
        rev.reverse();
        return { from, to, hops: rev, length: rev.length - 1 };
      }
      for (const nb of adj.get(last) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          parent.set(nb, last);
          queue.push(nb);
        }
      }
    }
    return { from, to, hops: [], length: 0 };
  }
  async explain(graph, concept) {
    if (!graph || !Array.isArray(graph.nodes))
      throw new Error("GRAPHIFY_EXPLAIN_INVALID: graph required");
    if (typeof concept !== "string" || concept.trim() === "")
      throw new Error("GRAPHIFY_EXPLAIN_INVALID: concept must be non-empty");
    if (this.mcp?.isConnected() && !this.probeFresh()) {
      try {
        String(await this.mcp.callTool("get_node", { label: concept }));
        this.lastProbeOkAt = Date.now();
      } catch (e) {
        console.error("[map-reader] MCP get_node failed (falling back to local scan) token=GRAPHIFY_MCP_FALLBACK reason=" + (e instanceof Error ? e.message : String(e)) + " remedy=local scan over loaded graph");
      }
    }
    const low = concept.toLowerCase();
    const node = graph.nodes.find((n) => n.label.toLowerCase().includes(low) || n.id.toLowerCase() === low);
    if (!node)
      throw new Error(`GRAPHIFY_EXPLAIN_NOT_FOUND: no node matching "${concept}"`);
    const connections = graph.edges.filter((e) => e.src === node.id || e.dst === node.id).map((e) => e.src === node.id ? e.dst : e.src);
    return {
      id: node.id,
      label: node.label,
      type: node.type,
      file: node.file,
      degree: connections.length,
      community: graph.communities.find((c) => c.members.includes(node.id))?.id,
      connections,
      data: node.data
    };
  }
  async merge(slices) {
    if (!Array.isArray(slices))
      throw new Error("GRAPHIFY_MERGE_INVALID: slices must be array");
    const nodeMap = new Map;
    const edgeSet = new Set;
    const edges = [];
    const communityMap = new Map;
    for (const s of slices) {
      if (!s || typeof s !== "object")
        continue;
      const g = s;
      for (const n of g.nodes ?? []) {
        if (n && typeof n.id === "string" && !nodeMap.has(n.id))
          nodeMap.set(n.id, n);
      }
      for (const e of g.edges ?? []) {
        if (!e || typeof e.src !== "string")
          continue;
        const key = `${e.src}\u2192${e.dst}:${e.relation}:${e.confidence ?? "EXTRACTED"}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push(e);
        }
      }
      for (const c of g.communities ?? []) {
        if (c && typeof c.id === "string" && !communityMap.has(c.id))
          communityMap.set(c.id, c);
      }
    }
    const nodes = [...nodeMap.values()];
    const degree = new Map;
    for (const e of edges) {
      degree.set(e.src, (degree.get(e.src) ?? 0) + 1);
      degree.set(e.dst, (degree.get(e.dst) ?? 0) + 1);
    }
    return {
      nodes,
      edges,
      communities: [...communityMap.values()],
      godNodes: [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id)
    };
  }
  getLastGraphPath() {
    return this.lastGraphPath;
  }
}
var GRAPH_LOAD_BUDGET_BYTES2, GRAPH_PARSE_YIELD_BYTES2;
var init_map_reader = __esm(() => {
  GRAPH_LOAD_BUDGET_BYTES2 = 128 * 1024 * 1024;
  GRAPH_PARSE_YIELD_BYTES2 = 8 * 1024 * 1024;
});

// src/hydra/auditor.ts
var exports_auditor = {};
__export(exports_auditor, {
  runTemplateAudit: () => runTemplateAudit
});
import fs35 from "fs";
import path39 from "path";
import { execFile } from "child_process";
import { promisify } from "util";
function sanitizeReportField(v) {
  return String(v ?? "").replace(/[\r\n\u2028\u2029\u000B\u000C]+/g, " ").replace(/^##\s*/g, "").replace(/\s*##\s*/g, " ");
}
function realResolve(p) {
  const resolved = path39.resolve(p);
  try {
    return fs35.realpathSync(resolved);
  } catch {
    try {
      return path39.join(fs35.realpathSync(path39.dirname(resolved)), path39.basename(resolved));
    } catch {
      return resolved;
    }
  }
}
function isWithinRoot(realPath, realRoot) {
  return insideRoot(realPath, realRoot);
}
function makeCappedReadTool(targetRoot) {
  return {
    name: "read",
    description: `Read file window capped at ${READ_CAP} lines, scoped to targetRoot`,
    invoke: async (params) => {
      const filePath = String(params.path ?? "");
      const offset = typeof params.offset === "number" ? params.offset : 0;
      const limit = typeof params.limit === "number" ? params.limit : READ_CAP;
      if (!Number.isInteger(limit) || limit <= 0)
        return `READ_INVALID: limit must be a positive integer (got ${String(params.limit)})`;
      if (limit > READ_CAP)
        return `READ_CAP_EXCEEDED: ${limit} > ${READ_CAP}`;
      if (!filePath)
        return "READ_INVALID: path required";
      const rootReal = realResolve(path39.resolve(targetRoot));
      const resolved = path39.isAbsolute(filePath) ? path39.resolve(filePath) : path39.resolve(targetRoot, filePath);
      const realFile = realResolve(resolved);
      if (!isWithinRoot(realFile, rootReal) && realFile !== rootReal) {
        return `${READ_SCOPE_VIOLATION}: read outside targetRoot ${filePath}`;
      }
      try {
        const fd = fs35.openSync(realFile, fs35.constants.O_RDONLY | fs35.constants.O_NOFOLLOW);
        try {
          const size = fs35.fstatSync(fd).size;
          if (size > 8 * 1024 * 1024)
            return `READ_TOO_LARGE: ${size} bytes > 8MiB window cap (narrow offset/limit)`;
          const buf = Buffer.alloc(size);
          let total = 0;
          while (total < size) {
            const n = fs35.readSync(fd, buf, total, size - total, total);
            if (n <= 0)
              break;
            total += n;
          }
          const lines = buf.subarray(0, total).toString("utf-8").split(`
`);
          const start = Math.max(0, offset);
          const slice = lines.slice(start, Math.min(lines.length, start + limit));
          const truncated = start + limit < lines.length;
          const out = slice.join(`
`) + (truncated ? `
[TRUNCATED]` : "");
          return out;
        } finally {
          fs35.closeSync(fd);
        }
      } catch (e) {
        return `READ_FAILED: ${String(e.message).slice(0, 300)}`;
      }
    }
  };
}
function makeCappedGrepTool(targetRoot) {
  return {
    name: "grep",
    description: `Grep capped at ${GREP_CAP} results, scoped to targetRoot`,
    invoke: async (params) => {
      const pattern = String(params.pattern ?? "");
      if (pattern.trim() === "")
        return "GREP_INVALID: empty pattern";
      const rawMax = typeof params.maxResults === "number" && Number.isFinite(params.maxResults) ? Math.floor(params.maxResults) : GREP_CAP;
      const maxResults = Math.min(Math.max(1, rawMax), GREP_CAP);
      const run = (cmd, args) => new Promise((resolve) => {
        execFile(cmd, args, { timeout: 1e4, maxBuffer: 2000000 }, (err, stdout) => {
          if (err) {
            const code = err.code;
            const msg = String(err.message);
            if (code === 1 && !stdout)
              return resolve("(no matches)");
            return resolve(`SEARCH_FAILED: ${msg.slice(0, 160)}${stdout ? " | partial: " + String(stdout).slice(0, 400) : ""}`);
          }
          resolve(String(stdout));
        });
      });
      const rootReal = realResolve(path39.resolve(targetRoot));
      let out = await run("rg", ["-n", "--no-follow", "--max-count", String(maxResults), "--", pattern, targetRoot]);
      if (out.startsWith("SEARCH_FAILED") || out.length === 0) {
        out = await run("grep", ["-rn", "-I", "-E", "-m", String(maxResults), "--", pattern, targetRoot]);
      }
      if (!out.startsWith("SEARCH_FAILED")) {
        const kept = [];
        let trimmed = 0;
        for (const line of out.split(`
`)) {
          if (line.length === 0)
            continue;
          const hitFile = line.split(":")[0] ?? "";
          const abs = path39.isAbsolute(hitFile) ? path39.resolve(hitFile) : path39.resolve(targetRoot, hitFile);
          if (!isWithinRoot(realResolve(abs), rootReal) && realResolve(abs) !== rootReal) {
            trimmed += 1;
            continue;
          }
          kept.push(line);
        }
        if (trimmed > 0)
          out = (kept.length > 0 ? kept.join(`
`) : "") + `
[SEARCH_SCOPE_TRIMMED: ${trimmed} hit(s) outside targetRoot dropped]`;
        else
          out = kept.length > 0 ? kept.join(`
`) : out;
      }
      if (out.startsWith("SEARCH_FAILED"))
        return out;
      if (out.trim().length === 0)
        return "(no matches)";
      return out.split(`
`).filter(Boolean).slice(0, maxResults).join(`
`).slice(0, 8000);
    }
  };
}
function makeForceBoundWriteTool(pinnedPath, ledgerDir) {
  return {
    name: "write_findings",
    description: `Force-bound write to ${pinnedPath} (ONLY this path is writable)`,
    invoke: async (params) => {
      const attempted = String(params.path ?? "").trim();
      const pinnedReal = realResolve(path39.resolve(pinnedPath));
      if (attempted !== "") {
        const attemptedReal = realResolve(path39.resolve(attempted));
        if (attemptedReal !== pinnedReal) {
          return JSON.stringify({ error: GRAPH_TOOL_VIOLATION, detail: `path ${attemptedReal} != pinned ${pinnedReal}`, recorded: true });
        }
      }
      const ledgerReal = realResolve(path39.resolve(ledgerDir));
      if (!isWithinRoot(pinnedReal, ledgerReal) && pinnedReal !== ledgerReal) {
        return JSON.stringify({ error: WRITE_SCOPE_VIOLATION, detail: "pinned target outside ledger", recorded: true });
      }
      try {
        fs35.mkdirSync(path39.dirname(pinnedReal), { recursive: true });
        const content = String(params.content ?? "");
        if (content.length > 8 * 1024 * 1024) {
          return JSON.stringify({ error: "WRITE_TOO_LARGE: content exceeds the 8MiB write cap", recorded: true });
        }
        const wfd = fs35.openSync(pinnedReal, fs35.constants.O_WRONLY | fs35.constants.O_CREAT | fs35.constants.O_TRUNC | fs35.constants.O_NOFOLLOW, 420);
        try {
          fs35.writeFileSync(wfd, content, "utf-8");
        } finally {
          fs35.closeSync(wfd);
        }
        return JSON.stringify({ path: pinnedReal, bytes: Buffer.byteLength(content, "utf-8") });
      } catch (e) {
        return `WRITE_FAILED: ${String(e.message).slice(0, 300)}`;
      }
    }
  };
}
function makeGraphTagTool(ledgerDir, layerId, defaultPredicate) {
  return {
    name: "graph_tag",
    description: "Tag a finding into the shared graph via ontology predicates (splice: appends a typed edge row)",
    invoke: async (params) => {
      const predicate = String(params.predicate ?? defaultPredicate).trim();
      if (!isPredicate(predicate)) {
        throw new Error(`${GRAPH_TAG_INVALID_PREDICATE}: ${predicate} not in ontology`);
      }
      const kind = kindForLayer(layerId);
      if (!isNodeType(kind)) {
        throw new Error(`${GRAPH_TAG_INVALID_KIND}: ${kind}`);
      }
      const file = String(params.findingFile ?? "unknown");
      const line = typeof params.findingLine === "number" ? params.findingLine : 0;
      const subject = String(params.findingSubject ?? "finding");
      const evidence = String(params.evidence ?? "");
      if (evidence.trim().length === 0)
        throw new Error("GRAPH_TAG_EVIDENCE_EMPTY: evidence required (no silent no-evidence tags)");
      const evidence_quote = evidence.startsWith("[INFERRED]") ? evidence : `explicit: ${evidence}`;
      const codeNodeId = `${file}:${line}:code`;
      const canonical_id = `${layerId}:${file}:${line}`;
      const row = {
        canonical_id,
        codeNodeId,
        kind,
        label: subject,
        file,
        line,
        predicate,
        evidence_quote,
        created_run: layerId,
        confidence: 1
      };
      const splicePath = path39.join(path39.resolve(ledgerDir), "evidence", "typed-edges.jsonl");
      fs35.mkdirSync(path39.dirname(splicePath), { recursive: true });
      const sfd = fs35.openSync(splicePath, fs35.constants.O_WRONLY | fs35.constants.O_CREAT | fs35.constants.O_APPEND | fs35.constants.O_NOFOLLOW, 420);
      try {
        fs35.writeFileSync(sfd, JSON.stringify(row) + `
`, "utf-8");
      } finally {
        fs35.closeSync(sfd);
      }
      return JSON.stringify({ tagged: true, canonical_id, predicate, kind });
    }
  };
}
function buildAuditorTools(ledgerDir, targetRoot, layerId, defaultPredicate) {
  if (!ledgerDir || typeof ledgerDir !== "string" || ledgerDir.trim() === "") {
    throw new Error("AUDITOR_TOOLS_INVALID: ledgerDir required");
  }
  if (!targetRoot || typeof targetRoot !== "string" || targetRoot.trim() === "") {
    throw new Error("AUDITOR_TOOLS_INVALID: targetRoot required");
  }
  const reportPath = path39.join(path39.resolve(ledgerDir), "findings", "report.md");
  const read = makeCappedReadTool(targetRoot);
  const grep = makeCappedGrepTool(targetRoot);
  const writeFindings = makeForceBoundWriteTool(reportPath, ledgerDir);
  const graphTag = makeGraphTagTool(ledgerDir, layerId, defaultPredicate);
  return { tools: [read, grep, writeFindings, graphTag], read, grep, writeFindings, graphTag };
}
function stripOuterQuotes(s) {
  const t = s.trim();
  if (t.startsWith('"') && t.endsWith('"') || t.startsWith("'") && t.endsWith("'"))
    return t.slice(1, -1);
  return t;
}
function parseFindingsMarkdown(raw) {
  const headerRe = /^##\s+FINDING:\s*(.+)$/gm;
  const headers = [];
  let hm;
  while ((hm = headerRe.exec(raw)) !== null)
    headers.push({ subject: hm[1].trim(), index: hm.index });
  if (headers.length === 0) {
    throw new Error(`GRAMMAR_VIOLATION: no '${MD_FINDING_HEADER}' block found \u2014 findings must use the markdown finding grammar (${MD_FINDING_HEADER} <subject> + - predicate, - file (path:line), - evidence, - spec)`);
  }
  const candidates = [];
  for (let i = 0;i < headers.length; i++) {
    const h = headers[i];
    const blockBody = raw.slice(h.index, i + 1 < headers.length ? headers[i + 1].index : raw.length);
    const fields = new Map;
    const lineRe = /^\s*-\s*(\w+):\s*(.+)\s*$/gm;
    let m;
    while ((m = lineRe.exec(blockBody)) !== null)
      fields.set(m[1].toLowerCase(), m[2].trim());
    for (const req of MD_REQUIRED_FIELDS) {
      if (!fields.get(req)?.trim()) {
        throw new Error(`GRAMMAR_VIOLATION: block "${h.subject}" missing required field '${req}' \u2014 each ${MD_FINDING_HEADER} block must carry - predicate, - file (path:line), - evidence, - spec`);
      }
    }
    const fileField = stripOuterQuotes(fields.get("file"));
    const drive = /^[A-Za-z]:[\\/]/.test(fileField) ? fileField.slice(0, 2) : "";
    const rest = drive !== "" ? fileField.slice(2) : fileField;
    const mLine = /^(.*):(\d+)\s*$/.exec(rest);
    if (!mLine) {
      throw new Error(`GRAMMAR_VIOLATION: block "${h.subject}" malformed field 'file' \u2014 expected "<path>:<line>" got "${fileField}"`);
    }
    const line = Number.parseInt(mLine[2], 10);
    if (!Number.isFinite(line) || line <= 0 || !Number.isInteger(line)) {
      throw new Error(`GRAMMAR_VIOLATION: block "${h.subject}" malformed field 'file' line part \u2014 expected positive integer`);
    }
    const evidence = stripOuterQuotes(fields.get("evidence"));
    if (evidence.length === 0) {
      throw new Error(`GRAMMAR_VIOLATION: block "${h.subject}" malformed field 'evidence' \u2014 empty after stripping quotes`);
    }
    const candidate = {
      subject: h.subject,
      predicate: stripOuterQuotes(fields.get("predicate")),
      file: (drive + mLine[1]).trim(),
      line,
      evidence,
      implicatedSpecClause: stripOuterQuotes(fields.get("spec")),
      layer: fields.has("layer") ? stripOuterQuotes(fields.get("layer")) : "unknown-layer",
      object: fields.has("object") ? stripOuterQuotes(fields.get("object")) : "Contract"
    };
    if (fields.has("severity")) {
      const s = stripOuterQuotes(fields.get("severity")).toUpperCase();
      if (!["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(s)) {
        throw new Error(`GRAMMAR_VIOLATION: block "${h.subject}" malformed field 'severity' \u2014 expected CRITICAL|HIGH|MEDIUM|LOW got "${s}"`);
      }
      candidate.severity = s;
    }
    if (fields.has("confidence")) {
      const n = Number.parseFloat(stripOuterQuotes(fields.get("confidence")));
      if (!Number.isFinite(n) || n < 0 || n > 1) {
        throw new Error(`GRAMMAR_VIOLATION: block "${h.subject}" malformed field 'confidence' \u2014 expected 0.0-1.0`);
      }
      candidate.confidence = n;
    }
    candidates.push(candidate);
  }
  const summaryRe = /^##\s+SUMMARY\s*\n([\s\S]*?)(?=\n##\s+|$)/im;
  const sm = raw.match(summaryRe);
  const summary = sm?.[1]?.trim().slice(0, 4000) ?? `${candidates.length} finding(s) extracted from markdown report`;
  return { candidates, summary };
}
async function readFindingsReport(reportPath, schema) {
  if (!reportPath || typeof reportPath !== "string" || reportPath.trim() === "") {
    throw new Error("HUNTER_NO_REPORT: reportPath required");
  }
  let stat;
  try {
    stat = fs35.statSync(reportPath);
  } catch {
    throw new Error("HUNTER_NO_REPORT: " + reportPath);
  }
  const MAX_REPORT_BYTES = 64 * 1024 * 1024;
  if (stat.size > MAX_REPORT_BYTES) {
    throw new Error(`REPORT_PARSE_FAILED: report too large (${stat.size}B > ${MAX_REPORT_BYTES}B) \u2014 refusing to materialize`);
  }
  const raw = fs35.readFileSync(reportPath, "utf-8");
  if (raw.trim().length === 0)
    throw new Error("REPORT_PARSE_FAILED: empty file");
  const { candidates, summary } = parseFindingsMarkdown(raw);
  const payload = { candidates, summary };
  if (schema) {
    const res = schema.safeParse(payload);
    if (!res.success)
      throw new Error(`REPORT_SCHEMA_FAILED: ${res.error?.message ?? "invalid"}`);
    return { findings: res.data, fileBytes: stat.size, fileMtime: stat.mtimeMs, raw };
  }
  return { findings: payload, fileBytes: stat.size, fileMtime: stat.mtimeMs, raw };
}
function nodeLine(node) {
  const d = node.data ?? {};
  const loc = d["source_location"];
  if (typeof loc === "string") {
    const m = loc.match(/^L(\d+)$/);
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (Number.isInteger(n) && n > 0)
        return n;
    }
  }
  for (const k of ["line_start", "line", "line_end"]) {
    const v = d[k];
    if (typeof v === "number" && Number.isInteger(v) && v > 0)
      return v;
  }
  return null;
}
function nodeFile(targetRoot, node) {
  const raw = node.file || String(node.data?.["source_file"] ?? "");
  let rel = raw.replace(/^\.\//, "");
  if (rel.length > 0)
    rel = path39.normalize(rel);
  if (rel && !path39.isAbsolute(rel)) {
    if (rel === ".." || rel.startsWith("../") || rel.startsWith(`..${path39.sep}`))
      return "";
    return rel.split(path39.sep).join("/");
  }
  if (rel) {
    const r = path39.relative(realResolve(path39.resolve(targetRoot)), realResolve(rel));
    if (r === "" || r === ".." || r.startsWith(`..${path39.sep}`) || path39.isAbsolute(r))
      return "";
    return r.split(path39.sep).join("/");
  }
  return "";
}
function sourceLineQuote(targetRoot, relFile, line) {
  try {
    const abs = path39.resolve(targetRoot, relFile);
    const rootReal = realResolve(path39.resolve(targetRoot));
    const realFile = realResolve(abs);
    if (!isWithinRoot(realFile, rootReal) && realFile !== rootReal)
      return "";
    const fd = fs35.openSync(realFile, fs35.constants.O_RDONLY | fs35.constants.O_NOFOLLOW);
    try {
      const size = fs35.fstatSync(fd).size;
      if (size > 8 * 1024 * 1024)
        return "";
      const buf = Buffer.alloc(size);
      let total = 0;
      while (total < size) {
        const n = fs35.readSync(fd, buf, total, size - total, total);
        if (n <= 0)
          break;
        total += n;
      }
      const lines = buf.subarray(0, total).toString("utf-8").split(`
`);
      return (lines[line - 1] ?? "").trim().slice(0, 300);
    } finally {
      fs35.closeSync(fd);
    }
  } catch {
    return "";
  }
}
function sweepIncomplete(anchor, layerId, measured, fallbackFile) {
  return {
    subject: `sweep incomplete \u2014 ${anchor}: ${measured}`,
    predicate: `${anchor}.sweep-incomplete`,
    file: fallbackFile,
    line: 1,
    evidence: `measured: ${measured}; sweep INCOMPLETE \u2014 no verdict possible from a failed sweep`,
    spec: `${layerId} audit \u2014 sweep infrastructure failure`,
    severity: "HIGH",
    confidence: 1
  };
}
function confirmedEmpty(anchor, layerId, measured, fallbackFile) {
  return {
    subject: `confirmed-empty \u2014 no ${anchor} findings measured`,
    predicate: `${anchor}.confirmed-empty`,
    file: fallbackFile,
    line: 1,
    evidence: `measured: ${measured}; no ${anchor} finding confirmed`,
    spec: `${layerId} audit \u2014 no implicated spec clause (confirmed-empty structural audit)`,
    severity: "LOW",
    confidence: 0.9
  };
}
async function sweep(template, graph, targetRoot, belt, calls) {
  const anchor = template.anchorPredicate;
  const firstNodeFile = graph.nodes.map((n) => nodeFile(targetRoot, n)).find((f) => f !== "") ?? "graph.json";
  const quote = (rel, ln, extra) => {
    const q = sourceLineQuote(targetRoot, rel, ln);
    return q !== "" ? `"${q}" ${extra}`.trim() : `${extra} [no source line: ${rel}:${ln}]`;
  };
  if (anchor === "graph-structure") {
    const degree = new Map;
    for (const e of graph.edges) {
      degree.set(e.src, (degree.get(e.src) ?? 0) + 1);
      degree.set(e.dst, (degree.get(e.dst) ?? 0) + 1);
    }
    const top = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length === 0)
      return [confirmedEmpty(anchor, template.layerId, "graph has no edges", firstNodeFile)];
    const out = [];
    for (const [id, deg] of top) {
      const node = graph.nodes.find((n) => n.id === id);
      if (!node)
        continue;
      const rel = nodeFile(targetRoot, node);
      if (rel === "")
        continue;
      const ln = nodeLine(node) ?? 1;
      const ext = graph.edges.filter((e) => (e.src === id || e.dst === id) && e.confidence === "EXTRACTED").length;
      out.push({
        subject: `god-node concentration \u2014 ${node.label} degree ${deg}`,
        predicate: "graph-structure.god-node",
        file: rel,
        line: ln,
        evidence: quote(rel, ln, `degree ${deg} (${ext} EXTRACTED edges)`),
        spec: `${template.layerId} audit \u2014 god-node concentration (structural audit, no external spec clause)`,
        severity: deg >= 5 ? "CRITICAL" : deg >= 3 ? "HIGH" : deg >= 2 ? "MEDIUM" : "LOW",
        confidence: 0.9
      });
    }
    return out.length > 0 ? out : [confirmedEmpty(anchor, template.layerId, "god nodes unresolvable to files", firstNodeFile)];
  }
  if (anchor === "cycles") {
    const adj = new Map;
    for (const e of graph.edges)
      adj.set(e.src, [...adj.get(e.src) ?? [], e.dst]);
    const selfLoop = new Set;
    for (const e of graph.edges)
      if (e.src === e.dst)
        selfLoop.add(e.src);
    const index = new Map;
    const low = new Map;
    const onStack = new Set;
    const sccStack = [];
    const sccs = [];
    let counter = 0;
    for (const seed of graph.nodes) {
      if (index.has(seed.id))
        continue;
      const stack = [{ id: seed.id, it: 0 }];
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top.it === 0) {
          index.set(top.id, counter);
          low.set(top.id, counter);
          counter += 1;
          sccStack.push(top.id);
          onStack.add(top.id);
        }
        const nbs = adj.get(top.id) ?? [];
        if (top.it < nbs.length) {
          const nb = nbs[top.it++];
          if (!index.has(nb)) {
            stack.push({ id: nb, it: 0 });
          } else if (onStack.has(nb)) {
            low.set(top.id, Math.min(low.get(top.id), index.get(nb)));
          }
        } else {
          stack.pop();
          if (stack.length > 0) {
            const parent = stack[stack.length - 1];
            if (onStack.has(top.id)) {
              low.set(parent.id, Math.min(low.get(parent.id), low.get(top.id)));
            }
          }
          if (low.get(top.id) === index.get(top.id)) {
            const comp = [];
            for (;; ) {
              const w = sccStack.pop();
              onStack.delete(w);
              comp.push(w);
              if (w === top.id)
                break;
            }
            if (comp.length > 1 || comp.length === 1 && selfLoop.has(comp[0]))
              sccs.push(comp);
          }
        }
      }
    }
    if (sccs.length === 0) {
      return [confirmedEmpty(anchor, template.layerId, `Tarjan SCC over ${graph.nodes.length} nodes/${graph.edges.length} edges found no directed cycle`, firstNodeFile)];
    }
    const cycles = [];
    const CYCLE_CAP = 3;
    for (const comp of sccs) {
      if (cycles.length >= CYCLE_CAP)
        break;
      const compSet = new Set(comp);
      const compAdj = new Map;
      for (const n of comp)
        compAdj.set(n, (adj.get(n) ?? []).filter((d) => compSet.has(d)));
      for (const seedOfComp of comp) {
        const localVisited = new Set;
        if (cycles.length >= CYCLE_CAP)
          break;
        if (localVisited.has(seedOfComp))
          continue;
        const stack = [{ id: seedOfComp, it: 0 }];
        const path = [];
        const onS = new Set;
        while (stack.length > 0 && cycles.length < CYCLE_CAP) {
          const top = stack[stack.length - 1];
          if (top.it === 0) {
            if (localVisited.has(top.id)) {
              stack.pop();
              continue;
            }
            localVisited.add(top.id);
            path.push(top.id);
            onS.add(top.id);
          }
          const nbs = compAdj.get(top.id) ?? [];
          if (top.it < nbs.length) {
            const nb = nbs[top.it++];
            if (!localVisited.has(nb))
              stack.push({ id: nb, it: 0 });
            else if (onS.has(nb))
              cycles.push([...path.slice(path.indexOf(nb)), nb]);
          } else {
            stack.pop();
            onS.delete(top.id);
            path.pop();
          }
        }
      }
    }
    const truncated = sccs.length > 0 && cycles.length >= CYCLE_CAP;
    if (cycles.length === 0) {
      return sccs.slice(0, CYCLE_CAP).map((comp) => ({
        subject: `dependency cycle group \u2014 ${comp.length} strongly-connected members`,
        predicate: "cycles.import",
        file: firstNodeFile,
        line: 1,
        evidence: `Tarjan SCC [${comp.join(", ")}] verified in the graph edge set \u2014 per-edge enumeration unavailable (bounded); members are mutually recursive`,
        spec: `${template.layerId} audit \u2014 circular dependency (structural audit, no external spec clause)`,
        severity: "HIGH",
        confidence: 0.85
      }));
    }
    return cycles.slice(0, CYCLE_CAP).map((c) => {
      const head = graph.nodes.find((n) => n.id === c[0]);
      const rel = head ? nodeFile(targetRoot, head) : "";
      return {
        subject: `dependency cycle \u2014 ${c.join(" \u2192 ")}`,
        predicate: "cycles.import",
        file: rel === "" ? firstNodeFile : rel,
        line: head ? nodeLine(head) ?? 1 : 1,
        evidence: `cycle [${c.join(", ")}] verified in graph edge set (${c.length - 1} hops); SCC count ${sccs.length}${truncated ? ` \u2014 CAP ${CYCLE_CAP} reached, more cycles may exist` : ""}`,
        spec: `${template.layerId} audit \u2014 circular dependency (structural audit, no external spec clause)`,
        severity: "HIGH",
        confidence: 0.85
      };
    });
  }
  if (anchor === "dead-code") {
    const indeg = new Map;
    const outdeg = new Map;
    for (const e of graph.edges) {
      indeg.set(e.dst, (indeg.get(e.dst) ?? 0) + 1);
      outdeg.set(e.src, (outdeg.get(e.src) ?? 0) + 1);
    }
    const isolates = graph.nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0 && (outdeg.get(n.id) ?? 0) === 0).slice(0, 25);
    const out = [];
    let probeFailures = 0;
    let probeFailureReason = "";
    for (const n of isolates) {
      const rel = nodeFile(targetRoot, n);
      if (rel === "" || /(^|\/)package\.json$/.test(rel))
        continue;
      const ln = nodeLine(n) ?? 1;
      const grepHit = await belt.grep.invoke({ pattern: n.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), maxResults: 5 });
      calls.count += 1;
      calls.names.push("grep");
      if (grepHit.startsWith("SEARCH_FAILED") || grepHit.startsWith("GREP_INVALID")) {
        probeFailures += 1;
        probeFailureReason = grepHit.slice(0, 120);
        continue;
      }
      if (!grepHit.startsWith("(no matches)")) {
        continue;
      }
      out.push({
        subject: `dead code \u2014 ${n.label} with no graph edges and no grep consumers`,
        predicate: "dead-code.module",
        file: rel,
        line: ln,
        evidence: quote(rel, ln, "in-degree 0, out-degree 0, grep confirms no consumers"),
        spec: `${template.layerId} audit \u2014 dead declaration (structural audit, no external spec clause)`,
        severity: "MEDIUM",
        confidence: 0.8
      });
      if (out.length >= 3)
        break;
    }
    if (out.length === 0 && probeFailures > 0) {
      return [sweepIncomplete(anchor, template.layerId, `dead-code sweep INCOMPLETE: ${probeFailures} node probe(s) failed (first: ${probeFailureReason})`, firstNodeFile)];
    }
    if (probeFailures > 0) {
      out.push(sweepIncomplete(anchor, template.layerId, `dead-code sweep INCOMPLETE: ${probeFailures} node probe(s) failed (first: ${probeFailureReason})`, firstNodeFile));
    }
    return out.length > 0 ? out : [confirmedEmpty(anchor, template.layerId, `in-degree/out-degree scan over ${graph.nodes.length} nodes + grep two-leg verification found no dead declarations`, firstNodeFile)];
  }
  if (anchor === "impact-path") {
    const degree = new Map;
    for (const e of graph.edges) {
      degree.set(e.src, (degree.get(e.src) ?? 0) + 1);
      degree.set(e.dst, (degree.get(e.dst) ?? 0) + 1);
    }
    const top = [...degree.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!top)
      return [confirmedEmpty(anchor, template.layerId, "graph has no edges", firstNodeFile)];
    const adj = new Map;
    for (const e of graph.edges) {
      adj.set(e.src, [...adj.get(e.src) ?? [], e.dst]);
      adj.set(e.dst, [...adj.get(e.dst) ?? [], e.src]);
    }
    const seen = new Set([top[0]]);
    let frontier = [top[0]];
    let depth = 0;
    while (frontier.length > 0 && depth < 5) {
      const next = [];
      for (const id of frontier) {
        for (const nb of adj.get(id) ?? []) {
          if (!seen.has(nb)) {
            seen.add(nb);
            next.push(nb);
          }
        }
      }
      frontier = next;
      depth += 1;
    }
    const node = graph.nodes.find((n) => n.id === top[0]);
    const rel = node ? nodeFile(targetRoot, node) : "";
    return [{
      subject: `impact path \u2014 ${top[0]} reaches ${seen.size - 1} node(s) within ${depth} hop(s)`,
      predicate: "impact-path.blast-radius",
      file: rel === "" ? firstNodeFile : rel,
      line: node ? nodeLine(node) ?? 1 : 1,
      evidence: `BFS from ${top[0]}: ${seen.size - 1} reachable within ${depth} hops [${[...seen].slice(0, 8).join(", ")}]`,
      spec: `${template.layerId} audit \u2014 blast radius (structural audit, no external spec clause)`,
      severity: seen.size >= 6 ? "HIGH" : "MEDIUM",
      confidence: 0.9
    }];
  }
  const probes = {
    contract: "checkContract",
    oracle: "Math\\.abs|epsilon",
    stage: "precondition|postcondition|invariant",
    provenance: "TRACE_GAP|implements",
    lexicon: "PatternFamily",
    actor: "createMachine|createActor",
    "state-machine": "createMachine",
    engine: "writeFileSync",
    adapter: "Object\\.assign|\\.\\.\\.",
    "mpse-threshold": "epsilon|threshold"
  };
  const probe = probes[anchor] ?? anchor.replace(/[^A-Za-z0-9_-]/g, "");
  const hit = await belt.grep.invoke({ pattern: probe, maxResults: 5 });
  calls.count += 1;
  calls.names.push("grep");
  const measured = hit.startsWith("(no matches)") ? `grep "${probe}" over targetRoot: no matches` : `grep "${probe}" over targetRoot: ${hit.split(`
`).length} match line(s)`;
  if (!hit.startsWith("(no matches)") && !hit.startsWith("SEARCH_FAILED") && !hit.startsWith("GREP_INVALID")) {
    const firstLine = hit.split(`
`)[0] ?? "";
    const flm = firstLine.match(/^(.+?):(\d+):/);
    let hitPath = flm ? flm[1] : "";
    let contained = false;
    if (hitPath) {
      try {
        const realHit = realResolve(path39.isAbsolute(hitPath) ? hitPath : path39.resolve(targetRoot, hitPath));
        contained = isWithinRoot(realHit, realResolve(path39.resolve(targetRoot)));
        if (contained)
          hitPath = realHit;
      } catch {
        contained = false;
      }
    }
    const rel = flm && contained ? path39.relative(realResolve(path39.resolve(targetRoot)), hitPath) || hitPath : firstNodeFile;
    return [{
      subject: `${anchor} signal \u2014 "${probe}" present at ${rel}`,
      predicate: `${anchor}.signal`,
      file: rel,
      line: flm ? Number.parseInt(flm[2], 10) : 1,
      evidence: `"${firstLine.slice(0, 200)}" \u2014 mission-grep two-leg confirmation`,
      spec: `${template.layerId} audit \u2014 ${anchor} mandate signal (structural audit, no external spec clause)`,
      severity: "MEDIUM",
      confidence: 0.7
    }];
  }
  if (hit.startsWith("SEARCH_FAILED") || hit.startsWith("GREP_INVALID")) {
    return [sweepIncomplete(anchor, template.layerId, `probe INCOMPLETE: ${hit.slice(0, 140)} \u2014 no verdict possible from a failed probe`, firstNodeFile)];
  }
  return [confirmedEmpty(anchor, template.layerId, measured, firstNodeFile)];
}
function writeBriefPinned(briefPath, content) {
  const fd = fs35.openSync(briefPath, fs35.constants.O_WRONLY | fs35.constants.O_CREAT | fs35.constants.O_TRUNC | fs35.constants.O_NOFOLLOW, 420);
  try {
    fs35.writeFileSync(fd, content, "utf-8");
  } finally {
    fs35.closeSync(fd);
  }
}
function assertGraphShape(graph) {
  if (graph === null || typeof graph !== "object")
    throw new Error("GRAPHIFY_EXTRACT_FAILED: graph.json did not parse to an object");
  const g = graph;
  if (!Array.isArray(g.nodes))
    throw new Error("GRAPHIFY_EXTRACT_FAILED: graph.json missing a nodes[] array");
  if (!Array.isArray(g.edges))
    throw new Error("GRAPHIFY_EXTRACT_FAILED: graph.json missing an edges[] array");
  for (const n of g.nodes) {
    const row = n;
    if (typeof row["id"] !== "string" || row["id"].length === 0) {
      throw new Error("GRAPHIFY_EXTRACT_FAILED: graph.json nodes[] element missing non-empty string id");
    }
    if (typeof row["label"] !== "string" || row["label"].length === 0) {
      throw new Error("GRAPHIFY_EXTRACT_FAILED: graph.json nodes[] element missing non-empty string label");
    }
  }
  for (const e of g.edges) {
    const row = e;
    const src = row["src"];
    const dst = row["dst"];
    if (typeof src !== "string" || src.length === 0 || typeof dst !== "string" || dst.length === 0) {
      throw new Error("GRAPHIFY_EXTRACT_FAILED: graph.json edges[] element missing src/dst string endpoints");
    }
  }
  return { nodes: g.nodes, edges: g.edges };
}
async function runTemplateAudit(args) {
  const t0 = Date.now();
  const template = args.template;
  const layerId = template?.layerId ?? "unknown";
  const ledgerDir = path39.resolve(args.ledgerDir ?? "");
  const errors = [];
  const calls = { count: 0, names: [] };
  if (!template || typeof template.layerId !== "string" || template.layerId.trim() === "") {
    return { layerId, status: "rejected", error: "HUNTER_TEMPLATE_INVALID: layerId required", ledgerDir, durationMs: Date.now() - t0 };
  }
  if (!args.ledgerDir || typeof args.ledgerDir !== "string" || args.ledgerDir.trim() === "") {
    return { layerId, status: "rejected", error: "HUNTER_LEDGER_INVALID: ledgerDir required", ledgerDir, durationMs: Date.now() - t0 };
  }
  if (!template.outputSchema || typeof template.outputSchema.safeParse !== "function") {
    return { layerId, status: "rejected", error: "HUNTER_SCHEMA_INVALID: outputSchema required", ledgerDir, durationMs: Date.now() - t0 };
  }
  if (!args.targetRoot || typeof args.targetRoot !== "string" || args.targetRoot.trim() === "") {
    return { layerId, status: "rejected", error: "HUNTER_TARGET_INVALID: targetRoot required", ledgerDir, durationMs: Date.now() - t0 };
  }
  const targetRoot = path39.resolve(args.targetRoot);
  if (!fs35.existsSync(targetRoot)) {
    return { layerId, status: "rejected", error: `HUNTER_TARGET_INVALID: targetRoot not found: ${targetRoot}`, ledgerDir, durationMs: Date.now() - t0 };
  }
  let graph;
  try {
    graph = args.client ? await new GraphifyMapReader(args.client).load(args.graphPath) : await readGraphJson(args.graphPath);
    assertGraphShape(graph);
  } catch (e) {
    return { layerId, status: "rejected", error: String(e.message ?? e).slice(0, 500), ledgerDir, durationMs: Date.now() - t0 };
  }
  let belt;
  try {
    const tagPredicate = (template.filterTags ?? []).find((t) => isPredicate(t)) ?? "flagged_by";
    belt = buildAuditorTools(ledgerDir, targetRoot, layerId, tagPredicate);
  } catch (e) {
    return { layerId, status: "rejected", error: "HUNTER_TOOLS_FAILED: " + String(e.message ?? e).slice(0, 400), ledgerDir, durationMs: Date.now() - t0 };
  }
  try {
    fs35.mkdirSync(ledgerDir, { recursive: true });
  } catch (e) {
    return { layerId, status: "rejected", error: "HUNTER_LEDGER_MKDIR_FAILED: " + String(e.message ?? e).slice(0, 400), ledgerDir, durationMs: Date.now() - t0 };
  }
  const brief = [
    `# HUNT BRIEF \u2014 ${sanitizeReportField(layerId)}`,
    `- anchorPredicate: ${template.anchorPredicate}`,
    `- layerNumber: ${template.layerNumber}`,
    `- targetRoot: ${targetRoot}`,
    `- graphPath: ${path39.resolve(args.graphPath)}`,
    `- graph: ${graph.nodes.length} nodes / ${graph.edges.length} edges / godNodes [${(graph.godNodes ?? []).slice(0, 5).join(", ")}]`,
    `- graphQueries: ${(template.graphQueries ?? []).join(" | ")}`,
    `- inputData: ${args.inputData ?? ""}`,
    "",
    template.staticPrompt,
    ""
  ].join(`
`);
  try {
    writeBriefPinned(path39.join(ledgerDir, "brief.md"), brief);
  } catch (e) {
    return { layerId, status: "rejected", error: "HUNTER_BRIEF_WRITE_FAILED: " + String(e.message ?? e).slice(0, 400), ledgerDir, durationMs: Date.now() - t0 };
  }
  const reader = new GraphifyMapReader(args.client ?? null);
  let sliceNote = "";
  const q0 = (template.graphQueries ?? [])[0] ?? "";
  if (q0 !== "") {
    try {
      const slice = await reader.query(graph, q0);
      calls.count += 1;
      calls.names.push("graph-query");
      sliceNote = `graphSlice query "${sanitizeReportField(q0)}" \u2192 ${slice.nodes.length} nodes / ${slice.edges.length} edges`;
    } catch (e) {
      errors.push("GRAPH_SLICE_FAILED: " + String(e.message).slice(0, 200));
      sliceNote = "graphSlice unavailable (see errors)";
    }
  }
  let swept;
  try {
    swept = await sweep(template, graph, targetRoot, belt, calls);
  } catch (e) {
    return { layerId, status: "rejected", error: "HUNTER_SWEEP_FAILED: " + String(e.message ?? e).slice(0, 400), ledgerDir, durationMs: Date.now() - t0 };
  }
  const sanitize = (v) => sanitizeReportField(v);
  const blocks = swept.map((c) => [
    `## FINDING: ${sanitize(c.subject)}`,
    `- layer: ${sanitize(layerId)}`,
    `- predicate: ${sanitize(c.predicate)}`,
    `- object: Contract`,
    `- file: ${sanitize(c.file)}:${c.line}`,
    `- evidence: "${sanitize(c.evidence)}"`,
    `- spec: ${sanitize(c.spec)}`,
    `- severity: ${c.severity}`,
    `- confidence: ${c.confidence}`
  ].join(`
`)).join(`

`);
  const summary = `${sanitizeReportField(layerId)}: ${swept.length} finding(s) \u2014 ${sanitize(swept[0]?.subject ?? "no findings")}. ${sliceNote}.`;
  const report = `${blocks}

## SUMMARY
${summary}
`;
  const writeOut = await belt.writeFindings.invoke({ content: report });
  calls.count += 1;
  calls.names.push("write_findings");
  let wroteBytes = 0;
  try {
    const parsed = JSON.parse(writeOut);
    if (typeof parsed.bytes !== "number" || parsed.bytes <= 0 || typeof parsed.path !== "string" || parsed.path.length === 0 || parsed.error !== undefined)
      throw new Error("bad-shape");
    wroteBytes = parsed.bytes;
  } catch {
    return { layerId, status: "rejected", error: "HUNTER_REPORT_WRITE_FAILED: " + writeOut.slice(0, 300), ledgerDir, durationMs: Date.now() - t0 };
  }
  for (const c of swept) {
    try {
      await belt.graphTag.invoke({
        findingSubject: c.subject,
        findingFile: c.file,
        findingLine: c.line,
        evidence: c.evidence,
        severity: c.severity,
        predicate: isPredicate(c.predicate) ? c.predicate : undefined
      });
      calls.count += 1;
      calls.names.push("graph_tag");
    } catch (e) {
      errors.push("GRAPH_TAG_FAILED: " + String(e.message).slice(0, 200));
    }
  }
  const reportPath = path39.join(ledgerDir, "findings", "report.md");
  try {
    const st = fs35.statSync(reportPath);
    const REPORT_MTIME_SLACK_MS = 1500;
    if (!(st.mtimeMs + REPORT_MTIME_SLACK_MS >= t0)) {
      return { layerId, status: "rejected", error: `HUNTER_STALE_REPORT: report.md mtime ${st.mtimeMs} < run start ${t0} \u2014 not produced by this hunt`, ledgerDir, durationMs: Date.now() - t0 };
    }
    if (st.size === 0) {
      return { layerId, status: "rejected", error: "HUNTER_EMPTY_REPORT: this run wrote an empty report", ledgerDir, durationMs: Date.now() - t0 };
    }
  } catch {
    return { layerId, status: "rejected", error: "HUNTER_NO_REPORT: findings/report.md not written by this run (the hunt must always produce it)", ledgerDir, durationMs: Date.now() - t0 };
  }
  let read;
  try {
    read = await readFindingsReport(reportPath, template.outputSchema);
  } catch (e) {
    return { layerId, status: "rejected", error: String(e.message ?? e).slice(0, 600), ledgerDir, durationMs: Date.now() - t0 };
  }
  const telemetry = {
    roundsUsed: 1,
    toolCallsMade: calls.count,
    toolCallNames: calls.names,
    errors,
    text: read.raw.slice(0, 2000)
  };
  return {
    layerId,
    status: "fulfilled",
    findings: read.findings,
    fileBytes: read.fileBytes,
    fileMtime: read.fileMtime,
    raw: read.raw,
    telemetry,
    ledgerDir,
    durationMs: Date.now() - t0
  };
}
var execFileAsync, READ_CAP = 320, GREP_CAP = 120, GRAPH_TOOL_VIOLATION = "GRAPH_TOOL_VIOLATION", WRITE_SCOPE_VIOLATION = "WRITE_SCOPE_VIOLATION", GRAPH_TAG_INVALID_PREDICATE = "GRAPH_TAG_INVALID_PREDICATE", GRAPH_TAG_INVALID_KIND = "GRAPH_TAG_INVALID_KIND", READ_SCOPE_VIOLATION = "READ_SCOPE_VIOLATION", MD_FINDING_HEADER = "## FINDING:", MD_REQUIRED_FIELDS;
var init_auditor = __esm(() => {
  init_containment();
  init_ontology();
  init_map_reader();
  execFileAsync = promisify(execFile);
  MD_REQUIRED_FIELDS = ["predicate", "file", "evidence", "spec"];
});

// src/omp/extension.ts
import * as fs36 from "fs";
import * as path40 from "path";
import { Database as Database9 } from "bun:sqlite";

// src/omp/typed-write.ts
import * as fs3 from "fs";
import * as path4 from "path";
import { Database as Database2 } from "bun:sqlite";
// src/scoping/db-path.ts
import * as os from "os";
import * as path from "path";
function makeDbPath(spec) {
  return function dbPath() {
    const TILDE = String.fromCharCode(126);
    const TILDE_SLASH = TILDE + "/";
    for (const env of spec.envVars) {
      const v = process.env[env];
      if (v && v.trim().length > 0) {
        const raw = v.trim();
        if (raw === TILDE || raw.startsWith(TILDE_SLASH)) {
          const home = process.env.HOME ?? process.env.USERPROFILE;
          if (!home) {
            throw new Error(`[db-path] HOME_NOT_SET: neither HOME nor USERPROFILE env var is set ` + `(fileName="${spec.fileName}") \u2014 cannot resolve ${env}`);
          }
          return raw === TILDE ? path.join(home, spec.fileName) : path.join(home, raw.slice(2), spec.fileName);
        }
        return path.join(raw, spec.fileName);
      }
    }
    if (process.env.BUN_TEST === "1") {
      if (!spec.testFile) {
        throw new Error(`[db-path] GI_TEST_ISOLATION_BROKEN: BUN_TEST=1 but no testFile in spec ` + `(fileName="${spec.fileName}") \u2014 cannot isolate from production DB`);
      }
      const testFile = spec.testFile;
      if (path.isAbsolute(testFile))
        return testFile;
      if (testFile === TILDE || testFile.startsWith(TILDE_SLASH)) {
        const home = process.env.HOME ?? process.env.USERPROFILE;
        if (!home) {
          throw new Error(`[db-path] HOME_NOT_SET: neither HOME nor USERPROFILE env var is set ` + `(fileName="${spec.fileName}") - cannot resolve testFile`);
        }
        return testFile === TILDE ? path.join(home, spec.fileName) : path.join(home, testFile.slice(2) || spec.fileName);
      }
      return path.join(os.tmpdir(), testFile);
    }
    let dir = spec.defaultDir;
    if (dir === TILDE || dir.startsWith(TILDE_SLASH)) {
      const home = process.env.HOME ?? process.env.USERPROFILE;
      if (!home) {
        throw new Error(`[db-path] HOME_NOT_SET: neither HOME nor USERPROFILE env var is set ` + `(fileName="${spec.fileName}") \u2014 cannot resolve defaultDir`);
      }
      dir = path.join(home, dir.slice(2));
    }
    return path.join(dir, spec.fileName);
  };
}
// src/scoping/scoped-store.ts
import * as fs from "fs";
import * as path2 from "path";
import { Database } from "bun:sqlite";
var storeDb = null;
var storeDbPath = null;
function getStoreDb(opts) {
  if (!opts && storeDb)
    return storeDb;
  const want = opts?.dbPath ?? storeDbPath;
  if (!want)
    throw new Error("[scoped-store] no dbPath: pass opts.dbPath on the first call");
  if (storeDb && storeDbPath === want) {
    try {
      storeDb.query("SELECT 1").get();
      return storeDb;
    } catch (_sick) {
      try {
        storeDb.close();
      } catch (_c) {}
      storeDb = null;
    }
  }
  if (storeDb) {
    try {
      storeDb.close();
    } catch (_c) {}
    storeDb = null;
  }
  fs.mkdirSync(path2.dirname(want), { recursive: true });
  const fresh = new Database(want, { create: true });
  try {
    fresh.exec("PRAGMA journal_mode = WAL;");
  } catch (walErr) {
    console.error(`[scoped-store${opts?.id ? " " + opts.id : ""}] WAL mode FAILED \u2014 falling back to rollback journal (race-condition protection DEGRADED):`, walErr instanceof Error ? walErr.message : String(walErr));
  }
  try {
    fresh.exec("PRAGMA busy_timeout = 5000;");
  } catch (btErr) {
    console.error(`[scoped-store${opts?.id ? " " + opts.id : ""}] busy_timeout FAILED \u2014 busy/locked operations fail immediately instead of waiting 5s:`, btErr instanceof Error ? btErr.message : String(btErr));
  }
  try {
    const modeRow = fresh.query("PRAGMA journal_mode").get();
    const mode = typeof modeRow?.journal_mode === "string" ? modeRow.journal_mode.toLowerCase() : "";
    if (mode !== "" && mode !== "wal") {
      console.error(`[scoped-store${opts?.id ? " " + opts.id : ""}] WAL mode NOT ACTIVE (journal_mode=${mode || "unknown"}) \u2014 concurrent writers race (see the 8-session law above)`);
    }
  } catch {}
  if (opts?.schema?.length) {
    for (let attempt = 0;attempt < 3; attempt++) {
      try {
        for (const stmt of opts.schema)
          fresh.run(stmt);
        break;
      } catch (e) {
        if (attempt === 2) {
          console.error(`[scoped-store${opts.id ? " " + opts.id : ""}] schema setup failed after 3 attempts \u2014 evicting broken handle:`, e instanceof Error ? e.message : String(e));
          try {
            fresh.close();
          } catch {}
          throw e;
        }
        try {
          fresh.exec("PRAGMA busy_timeout = 5000;");
        } catch {}
      }
    }
  }
  storeDb = fresh;
  storeDbPath = want;
  return storeDb;
}
var storeOpenInFlightByPath = new Map;
function upsertRow(table, pkColumn, pk, dataJson, extra) {
  const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
  if (!IDENT.test(table) || !IDENT.test(pkColumn))
    throw new Error(`[scoped-store] GI_SQL_IDENT_REFUSED: ${table}.${pkColumn}`);
  const cols = extra ? Object.keys(extra) : [];
  for (const c of cols)
    if (!IDENT.test(c))
      throw new Error(`[scoped-store] GI_SQL_IDENT_REFUSED: ${c}`);
  const placeholders = ["?", "?", ...cols.map(() => "?")];
  const updates = ["data = excluded.data", ...cols.map((c) => `${c} = excluded.${c}`)];
  const sql = `INSERT INTO ${table} (${pkColumn}, data${cols.length ? ", " + cols.join(", ") : ""}) VALUES (${placeholders.join(", ")})
    ON CONFLICT(${pkColumn}) DO UPDATE SET ${updates.join(", ")}`;
  getStoreDb().run(sql, [pk, dataJson, ...cols.map((c) => extra[c])]);
}
// src/scoping/session-state.ts
function sessionKey(sessionId) {
  return sessionId.slice(-24);
}
// src/scoping/gi-session-path.ts
import * as os2 from "os";
import * as fs2 from "fs";
import * as path3 from "path";
import { createHash } from "crypto";
var GI_STATE_DIR = ".omp/graph-intelligence";
class GiPathError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "GiPathError";
    this.code = code;
  }
}
var SESSION_STORE_RE = /\/sessions\/[A-Za-z0-9_-]{8,24}\/store\.sqlite$/;
function sessionStorePath(scopeRoot, sessionId) {
  if (!scopeRoot || !path3.isAbsolute(scopeRoot)) {
    throw new GiPathError("GI_PATH_DENIED", "GI_PATH_DENIED: scopeRoot must be absolute");
  }
  let sid = sessionKey(sessionId);
  if (!sid) {
    throw new GiPathError("GI_PATH_DENIED", "GI_PATH_DENIED: sessionKey empty");
  }
  if (sid.length < 8)
    sid = (sid + "xxxxxxxx").slice(0, 8);
  const p = path3.join(scopeRoot, GI_STATE_DIR, "sessions", sid, "store.sqlite");
  assertSessionStorePath(p, scopeRoot);
  return p;
}
function assertSessionStorePath(p, optScopeRoot) {
  const resolved = path3.resolve(p);
  const norm = resolved.replace(/\\/g, "/");
  if (isGlobalHomeGraph(norm)) {
    throw new GiPathError("GI_GLOBAL_HOME_GRAPH", `GI_GLOBAL_HOME_GRAPH: session store must not be ${norm}`);
  }
  if (!SESSION_STORE_RE.test(norm)) {
    throw new GiPathError("GI_SHARED_PROJECT_STORE", `GI_SHARED_PROJECT_STORE: path must include /sessions/{sid24}/store.sqlite, got ${p}`);
  }
  const parent = path3.dirname(resolved);
  let parentReal = null;
  try {
    parentReal = fs2.realpathSync(parent);
  } catch (e) {
    const code = e !== null && typeof e === "object" && "code" in e ? e.code : undefined;
    if (code !== "ENOENT") {
      throw new GiPathError("GI_SHARED_PROJECT_STORE", `GI_SHARED_PROJECT_STORE: cannot resolve the session parent ${parent} to run the symlink guard (code=${String(code)}) \u2014 refusing rather than skipping containment`);
    }
    parentReal = null;
  }
  if (parentReal !== null) {
    const parentNorm = parentReal.replace(/\\/g, "/");
    const normParent = path3.dirname(norm);
    const want = /\/sessions\/([A-Za-z0-9_-]{8,24})\/?$/.exec(normParent);
    const got = /\/sessions\/([A-Za-z0-9_-]{8,24})\/?$/.exec(parentNorm);
    if (want !== null && (got === null || got[1] !== want[1])) {
      throw new GiPathError("GI_SHARED_PROJECT_STORE", `GI_SHARED_PROJECT_STORE: the session dir RESOLVES elsewhere (logical=${norm} real=${parentNorm}) \u2014 a symlinked session dir is a scope escape`);
    }
  }
  if (optScopeRoot !== undefined) {
    let realRoot;
    try {
      realRoot = fs2.realpathSync(optScopeRoot);
    } catch {
      throw new GiPathError("GI_SHARED_PROJECT_STORE", `GI_SHARED_PROJECT_STORE: scope root does not resolve: ${optScopeRoot}`);
    }
    const realParent = parentReal ?? parent;
    const realParentNorm = realParent.replace(/\\/g, "/");
    const realRootNorm = realRoot.replace(/\\/g, "/");
    const rootPrefix = realRootNorm.endsWith("/") ? realRootNorm : realRootNorm + "/";
    const under = realParentNorm === realRootNorm || realParentNorm.startsWith(rootPrefix);
    if (!under) {
      throw new GiPathError("GI_SHARED_PROJECT_STORE", `GI_SHARED_PROJECT_STORE: the session dir ESCAPES its scope (real parent=${realParentNorm} scope=${realRootNorm}) \u2014 a symlink above sessions/ is a scope escape`);
    }
  }
}
function resolveSessionId(ctx, env = process.env, scopeRoot) {
  const fromCtx = ctx?.sessionID;
  if (typeof fromCtx === "string" && fromCtx.length > 0) {
    return { id: fromCtx, source: "ctx.sessionID" };
  }
  const fromEnv = env["GI_SESSION_ID"];
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    return { id: fromEnv, source: "GI_SESSION_ID" };
  }
  const root = scopeRoot ?? env["GI_SCOPE_ROOT"] ?? process.cwd();
  const rootResolved = path3.resolve(root);
  const hash = createHash("sha256").update(rootResolved).digest("hex");
  let id = `scope-${hash.slice(0, 18)}`;
  if (id.length < 8)
    id = (id + "-xxxxxxxx").slice(0, 8);
  return { id, source: "scope-root" };
}
function resolveSessionIdFromEvent(event, env = process.env) {
  const direct = event["sessionId"] ?? event["sessionID"];
  if (typeof direct === "string" && direct.length > 0) {
    return { id: direct, source: "event.sessionId" };
  }
  return resolveSessionId(event, env);
}
function isGlobalHomeGraph(norm) {
  const home = (process.env.HOME ?? os2.homedir()).replace(/\\/g, "/");
  const banned = path3.join(home, ".omp/graph-intelligence/store.sqlite").replace(/\\/g, "/");
  return norm === banned;
}
// src/scoping/gi-ecosystem.ts
import { tmpdir as tmpdir2 } from "os";
import { join as join3, sep } from "path";
var GI_TMP_DIR = join3(tmpdir2(), "gi-omp-tmp");
// src/omp/typed-write.ts
import { createHash as createHash2 } from "crypto";

class GiStoreCorruptError extends Error {
  code = "GI_STORE_CORRUPT";
  constructor(message) {
    super(message);
    this.name = "GiStoreCorruptError";
  }
}
var GRAPH_LOAD_BUDGET_BYTES = 128 * 1024 * 1024;
var GRAPH_PARSE_YIELD_BYTES = 8 * 1024 * 1024;
function parseGraphJsonGuarded(contents, sizeHint = 0) {
  const byteLen = Buffer.byteLength(contents, "utf-8");
  if (byteLen > GRAPH_LOAD_BUDGET_BYTES) {
    throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${byteLen} bytes (> ${GRAPH_LOAD_BUDGET_BYTES} budget). Fix: scope/extract a subtree or lower the graph cardinality.`);
  }
  return JSON.parse(contents);
}
var TYPED_STORE_DDL = [
  `CREATE TABLE IF NOT EXISTS gi_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS typed_nodes (
    id INTEGER PRIMARY KEY,
    canonical_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    label TEXT NOT NULL,
    file TEXT,
    line INTEGER,
    layer_id TEXT,
    created_run TEXT NOT NULL,
    superseded_run TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS typed_edges (
    id INTEGER PRIMARY KEY,
    src_canonical TEXT NOT NULL,
    dst_canonical TEXT NOT NULL,
    predicate TEXT NOT NULL,
    evidence_quote TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    derivation TEXT,
    layer_id TEXT,
    created_run TEXT NOT NULL,
    superseded_run TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_tn_live_canonical ON typed_nodes(canonical_id) WHERE superseded_run IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_tn_canonical ON typed_nodes(canonical_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tn_label ON typed_nodes(label)`,
  `CREATE INDEX IF NOT EXISTS idx_tn_file ON typed_nodes(file)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_te_live_triple ON typed_edges(src_canonical, dst_canonical, predicate) WHERE superseded_run IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_te_src ON typed_edges(src_canonical)`,
  `CREATE INDEX IF NOT EXISTS idx_te_dst ON typed_edges(dst_canonical)`,
  `CREATE INDEX IF NOT EXISTS idx_te_pred ON typed_edges(predicate)`,
  `CREATE TABLE IF NOT EXISTS graph_gate_state (
    session_id TEXT PRIMARY KEY,
    drift REAL NOT NULL DEFAULT 0,
    state TEXT NOT NULL DEFAULT 'IDLE',
    edits_json TEXT NOT NULL DEFAULT '[]',
    queries_json TEXT NOT NULL DEFAULT '[]',
    updated_ms INTEGER NOT NULL DEFAULT 0
  )`
];
var SQLITE_MAGIC = Buffer.from("SQLite format 3\x00");
function getMeta(storePath, key) {
  const db = openTypedStore(storePath);
  try {
    const row = db.query("SELECT value FROM gi_meta WHERE key = ?").get(key);
    return row?.value ?? null;
  } finally {
    db.close();
  }
}
function verifyOpenedStoreFile(storePath) {
  const lst = fs3.lstatSync(storePath);
  if (lst.isSymbolicLink())
    throw new GiStoreCorruptError(`GI_STORE_SYMLINK: ${storePath} is a symlink \u2014 refusing (post-open re-verify)`);
  const fd = fs3.openSync(storePath, "r");
  try {
    const head = Buffer.alloc(16);
    let total = 0;
    while (total < 16) {
      const n = fs3.readSync(fd, head, total, 16 - total, total);
      if (n <= 0)
        break;
      total += n;
    }
    if (total < 16 || !head.subarray(0, SQLITE_MAGIC.length).equals(SQLITE_MAGIC)) {
      throw new GiStoreCorruptError(`GI_STORE_CORRUPT: ${storePath} failed post-open re-verify`);
    }
  } finally {
    fs3.closeSync(fd);
  }
}
function openTypedStore(storePath) {
  assertSessionStorePath(storePath);
  fs3.mkdirSync(path4.dirname(storePath), { recursive: true });
  let st = null;
  try {
    const lst = fs3.lstatSync(storePath);
    if (lst.isSymbolicLink())
      throw new GiStoreCorruptError(`GI_STORE_SYMLINK: ${storePath} is a symlink \u2014 refusing (session-store header contract)`);
    st = fs3.statSync(storePath);
  } catch (e) {
    const c = e;
    if (c.code === "ENOENT")
      st = null;
    else
      throw e;
  }
  if (st !== null) {
    if (!st.isFile())
      throw new GiStoreCorruptError(`GI_STORE_CORRUPT: ${storePath} is not a regular file`);
  }
  let postOpenVerify = false;
  if (st !== null && st.size > 0) {
    let treatAsFresh = false;
    let head = Buffer.alloc(0);
    try {
      const fd = fs3.openSync(storePath, "r");
      try {
        head = Buffer.alloc(16);
        let total = 0;
        while (total < 16) {
          const n = fs3.readSync(fd, head, total, 16 - total, total);
          if (n <= 0)
            break;
          total += n;
        }
        if (total < 16)
          throw new GiStoreCorruptError(`GI_STORE_CORRUPT: ${storePath} shorter than the 16-byte magic`);
      } finally {
        fs3.closeSync(fd);
      }
    } catch (e) {
      if (e instanceof GiStoreCorruptError)
        throw e;
      const c = e;
      if (c.code === "ENOENT") {
        treatAsFresh = true;
      } else {
        throw e;
      }
    }
    if (!treatAsFresh && !head.subarray(0, SQLITE_MAGIC.length).equals(SQLITE_MAGIC)) {
      throw new GiStoreCorruptError(`GI_STORE_CORRUPT: ${storePath}`);
    }
    postOpenVerify = !treatAsFresh;
  }
  const preOpenDev = st !== null ? st.dev : null;
  const preOpenIno = st !== null ? st.ino : null;
  const db = new Database2(storePath, { create: true });
  try {
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA busy_timeout = 5000;");
    if (postOpenVerify && preOpenDev !== null && preOpenIno !== null) {
      let postLst;
      let postSt;
      try {
        postLst = fs3.lstatSync(storePath);
        postSt = fs3.statSync(storePath);
      } catch {
        throw new GiStoreCorruptError(`GI_STORE_SWAPPED: ${storePath} vanished between validation and open \u2014 refusing (identity re-verify)`);
      }
      if (postLst.isSymbolicLink() || postSt.dev !== preOpenDev || postSt.ino !== preOpenIno) {
        throw new GiStoreCorruptError(`GI_STORE_SWAPPED: ${storePath} was replaced between validation and open (dev/ino changed) \u2014 refusing cross-session data`);
      }
    }
    if (postOpenVerify)
      verifyOpenedStoreFile(storePath);
    applyTypedDdl(db);
    try {
      const deferred = db.query("SELECT value FROM gi_meta WHERE key LIKE 'unique_index_deferred%'").all();
      if (deferred.length > 0)
        console.error(`[gi-omp] STORE OPENED WITH DEFERRED UNIQUE INDEX (${deferred.length} marker(s)) \u2014 legacy duplicate rows are unconstrained until dedup`);
    } catch {}
  } catch (e) {
    try {
      db.close();
    } catch {}
    throw e;
  }
  return db;
}
var DERIVATION_BASE = {
  explicit: 0.99,
  inferred: 0.72,
  heuristic: 0.45,
  unknown: 0.3
};
var OBSERVED_PREDICATES = [
  "imports",
  "declares",
  "implements",
  "extends",
  "defines",
  "contains",
  "parent_of"
];
var INFERRED_PREDICATES = [
  "calls",
  "invokes",
  "uses",
  "references",
  "invoked_by",
  "called_with",
  "is_of_type",
  "inherits_from",
  "traces-to",
  "depends_on"
];
function derivationOf(evidence, predicate) {
  const m = /^\s*([a-z_]+)\s*:/.exec(evidence);
  const prefix = m?.[1]?.toLowerCase();
  if (prefix !== undefined && prefix !== "explicit" && prefix in DERIVATION_BASE)
    return prefix;
  if (predicate !== undefined) {
    const pred = predicate.toLowerCase();
    if (OBSERVED_PREDICATES.includes(pred))
      return "explicit";
    if (INFERRED_PREDICATES.includes(pred))
      return "inferred";
  }
  if (prefix !== undefined && prefix in DERIVATION_BASE)
    return prefix;
  return "unknown";
}
function layerOf(canonicalId) {
  const i = canonicalId.indexOf(":");
  return i > 0 ? canonicalId.slice(0, i) : null;
}
var CORROBORATION_AGREE = 1.15;
var CORROBORATION_CONFLICT = 0.7;
var FRESHNESS_TAU_DAYS = {
  explicit: 1,
  inferred: 3,
  heuristic: 7,
  unknown: 1
};
function deriveConfidence(evidence, opts = {}) {
  const derivation = derivationOf(evidence, opts.predicate);
  const base = DERIVATION_BASE[derivation] ?? DERIVATION_BASE["unknown"];
  const corr = opts.corroboration === "agree" ? CORROBORATION_AGREE : opts.corroboration === "conflict" ? CORROBORATION_CONFLICT : 1;
  const tau = FRESHNESS_TAU_DAYS[derivation] ?? 1;
  const fresh = typeof opts.ageDays === "number" && opts.ageDays > 0 ? Math.exp(-opts.ageDays / tau) : 1;
  const raw = base * corr * fresh;
  const confidence = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : DERIVATION_BASE["unknown"];
  return { confidence, derivation };
}
function migrateLayerColumns(db) {
  const added = [];
  const cols = (t) => {
    const rows = db.query(`PRAGMA table_info(${t})`).all();
    return rows.map((r) => r.name);
  };
  const addCol = (t, col, decl) => {
    if (!cols(t).includes(col)) {
      db.run(`ALTER TABLE ${t} ADD COLUMN ${col} ${decl}`);
      added.push(`${t}.${col}`);
    }
  };
  addCol("typed_nodes", "layer_id", "TEXT");
  addCol("typed_edges", "layer_id", "TEXT");
  addCol("typed_edges", "derivation", "TEXT");
  let backfilled = 0;
  try {
    db.run(`UPDATE typed_nodes SET layer_id = substr(canonical_id, 1, instr(canonical_id, ':') - 1)
       WHERE layer_id IS NULL AND instr(canonical_id, ':') > 0`);
    const chg = db.query("SELECT changes() AS n").get();
    backfilled += chg?.n ?? 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/no such column|no such table|has no column/i.test(msg)) {
      throw new Error(`GI_LAYER_BACKFILL_FAILED: nodes layer_id backfill failed (${msg})`);
    }
  }
  try {
    db.run(`UPDATE typed_edges SET layer_id = substr(src_canonical, 1, instr(src_canonical, ':') - 1)
       WHERE layer_id IS NULL AND instr(src_canonical, ':') > 0`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/no such column|no such table|has no column/i.test(msg)) {
      throw new Error(`GI_LAYER_BACKFILL_FAILED: edges layer_id backfill failed (${msg})`);
    }
  }
  return { added, backfilled };
}
var LAYER_TTL_MS = {
  explicit: 24 * 60 * 60 * 1000,
  inferred: 3 * 24 * 60 * 60 * 1000,
  heuristic: 7 * 24 * 60 * 60 * 1000,
  unknown: 24 * 60 * 60 * 1000
};
function layerFreshness(db, opts = {}) {
  const derivation = opts.derivation ?? "explicit";
  const ttlMs = opts.ttlMs ?? LAYER_TTL_MS[derivation] ?? LAYER_TTL_MS["unknown"];
  const now = opts.now ?? Date.now();
  let populatedAt = null;
  try {
    const row = db.query("SELECT value FROM gi_meta WHERE key = 'populated_at'").get();
    if (row?.value !== undefined) {
      const t = Date.parse(row.value);
      populatedAt = Number.isFinite(t) ? t : null;
    }
  } catch {}
  if (populatedAt === null) {
    return { stale: true, code: `GI_LAYER_STALE:${derivation}`, populatedAt: null, ageMs: null, ttlMs, derivation };
  }
  const ageMs = now - populatedAt;
  const stale = ageMs > ttlMs;
  return {
    stale,
    code: stale ? `GI_LAYER_STALE:${derivation}` : null,
    populatedAt,
    ageMs,
    ttlMs,
    derivation
  };
}
function applyTypedDdl(db) {
  let dedupRecovered = 0;
  for (const stmt of TYPED_STORE_DDL) {
    try {
      db.run(stmt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (stmt.includes("CREATE UNIQUE INDEX") && /UNIQUE constraint failed/i.test(msg)) {
        try {
          const on = /ON\s+([\w_]+)\s*\(([^)]+)\)/i.exec(stmt);
          if (!on) {
            console.error(`[gi-omp] DDL note: unique index regex miss (recording deferral) \u2014 ${stmt.slice(0, 80)}`);
            try {
              db.run("INSERT OR REPLACE INTO gi_meta (key, value) VALUES (?, ?)", [`unique_index_deferred:${createHash2("sha256").update(stmt).digest("hex").slice(0, 12)}`, stmt.slice(0, 200)]);
            } catch {}
            continue;
          }
          if (on) {
            const table = on[1];
            const cols = on[2].split(",").map((c) => c.trim()).filter((c) => c.length > 0);
            const identOk = (x) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(x);
            if (!identOk(table) || cols.some((c) => !identOk(c))) {
              throw new Error(`DDL_DEDUP_INVALID_IDENT: parsed table/columns failed the identifier allowlist (${table}, ${cols.join(",")})`);
            }
            const groupBy = cols.join(", ");
            db.exec("BEGIN IMMEDIATE;");
            try {
              db.run(`UPDATE ${table} SET superseded_run = 'ddl-dedup' WHERE rowid IN (
                   SELECT rowid FROM ${table} t
                   WHERE t.superseded_run IS NULL
                     AND t.rowid NOT IN (
                       SELECT MAX(rowid) FROM ${table}
                       WHERE superseded_run IS NULL
                       GROUP BY ${groupBy}
                     )
                 )`);
              db.run(stmt);
              db.exec("COMMIT;");
              console.error(`[gi-omp] DDL note: UNIQUE index recovered after legacy-duplicate dedup \u2014 ${stmt.slice(0, 80)}`);
              dedupRecovered += 1;
            } catch (inner2) {
              try {
                db.exec("ROLLBACK;");
              } catch {}
              throw inner2;
            }
          }
        } catch (dedupErr) {
          const dm = dedupErr instanceof Error ? dedupErr.message : String(dedupErr);
          if (dm.includes("DDL_DEDUP_INVALID_IDENT"))
            throw dedupErr;
          console.error(`[gi-omp] DDL dedup failed (deferral still recorded): ${dm}`);
          try {
            db.run("INSERT OR REPLACE INTO gi_meta (key, value) VALUES (?, ?)", [`unique_index_deferred:${createHash2("sha256").update(stmt).digest("hex").slice(0, 12)}`, stmt.slice(0, 200)]);
          } catch {}
        }
        continue;
      }
      throw e;
    }
  }
  if (dedupRecovered > 0) {
    console.error(`[gi-omp] DDL: ${dedupRecovered} legacy-duplicate dedup(s) recovered \u2014 UNIQUE invariant restored`);
  }
  try {
    const mig = migrateLayerColumns(db);
    if (mig.added.length > 0) {
      console.error(`[gi-omp] DDL MIGRATION: added ${mig.added.join(", ")} (pre-v2 store upgraded)`);
    }
  } catch (e) {
    console.error(`[gi-omp] DDL MIGRATION SKIPPED (handle cannot introspect \u2014 layer_id absent until a capable open): ${e instanceof Error ? e.message : String(e)}`);
  }
}
function insertForkNodesBatch(db, nodes) {
  if (db.inTransaction !== true) {
    throw new Error("GI_TXN_REQUIRED: insertForkNodesBatch outside a transaction (mid-batch failure would leave a half-store)");
  }
  for (const node of nodes) {
    db.run("UPDATE typed_nodes SET superseded_run = ? WHERE canonical_id = ? AND superseded_run IS NULL", [node.run, node.canonicalId]);
    db.run("INSERT INTO typed_nodes (canonical_id, kind, label, file, line, layer_id, created_run, superseded_run) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)", [node.canonicalId, node.kind, node.label, node.file, node.line, node.layerId ?? layerOf(node.canonicalId), node.run]);
  }
}
function insertForkEdgesBatch(db, edges) {
  if (db.inTransaction !== true) {
    throw new Error("GI_TXN_REQUIRED: insertForkEdgesBatch outside a transaction (mid-batch failure would leave a half-store)");
  }
  for (const edge of edges) {
    db.run("UPDATE typed_edges SET superseded_run = ? WHERE src_canonical = ? AND dst_canonical = ? AND predicate = ? AND superseded_run IS NULL", [edge.run, edge.srcCanonical, edge.dstCanonical, edge.predicate]);
    const derivedB = deriveConfidence(edge.evidence, { predicate: edge.predicate });
    const confB = typeof edge.confidence === "number" && Number.isFinite(edge.confidence) ? edge.confidence : derivedB.confidence;
    db.run("INSERT INTO typed_edges (src_canonical, dst_canonical, predicate, evidence_quote, confidence, derivation, layer_id, created_run, superseded_run) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)", [edge.srcCanonical, edge.dstCanonical, edge.predicate, edge.evidence, confB, edge.derivation ?? derivedB.derivation, edge.layerId ?? layerOf(edge.srcCanonical), edge.run]);
  }
}
function countTypedNodes(storePath) {
  const db = openTypedStore(storePath);
  try {
    const row = db.query("SELECT COUNT(*) AS n FROM typed_nodes WHERE superseded_run IS NULL").get();
    return Number(row.n);
  } finally {
    db.close();
  }
}
function resolveLiveIds(db, label) {
  const rows = db.query("SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL ORDER BY canonical_id LIMIT 501").all(label);
  return rows.map((r) => r.canonical_id);
}
function ph(n) {
  return Array.from({ length: n }, () => "?").join(", ");
}
function whoCallsInDb(db, name) {
  let ids = resolveLiveIds(db, name);
  let truncated;
  if (ids.length > 500) {
    console.warn(`[gi-omp] whoCalls: '${name}' resolves to ${ids.length} live ids \u2014 capping at 500 (SQLite variable limit)`);
    ids = ids.slice(0, 500);
    truncated = true;
  }
  if (ids.length === 0)
    return { rows: 0, names: [], callers: [], truncated };
  const rows = db.query(`SELECT DISTINCT src.label AS caller, src.kind AS kind, src.file AS file, src.line AS line,
            e.predicate AS predicate, e.dst_canonical AS target_canonical
     FROM typed_edges e
     JOIN typed_nodes src ON e.src_canonical = src.canonical_id
     WHERE e.dst_canonical IN (${ph(ids.length)})
       AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL
       AND src.superseded_run IS NULL`).all(...ids);
  const mapped = rows.map((r) => ({
    caller: r.caller,
    file: r.file ?? "",
    line: r.line ?? 0,
    kind: r.kind ?? "",
    predicate: r.predicate ?? "",
    target_canonical: r.target_canonical
  }));
  return { rows: mapped.length, names: mapped.map((r) => r.caller), callers: mapped, truncated };
}
function whoCalls(storePath, name) {
  const db = openTypedStore(storePath);
  try {
    return whoCallsInDb(db, name);
  } finally {
    db.close();
  }
}
function blastRadius(storePath, symbol, depth = 8) {
  depth = Math.min(Math.max(1, Math.floor(depth) || 1), 16);
  const db = openTypedStore(storePath);
  try {
    let ids = resolveLiveIds(db, symbol);
    let idsTruncated = false;
    if (ids.length > 500) {
      console.warn(`[gi-omp] blastRadius: '${symbol}' resolves to ${ids.length} live ids \u2014 capping at 500 (SQLite variable limit); reachability UNDER-REPORTED`);
      idsTruncated = true;
      ids = ids.slice(0, 500);
    }
    if (ids.length === 0)
      return { root: symbol, depth: 0, nodes: [], truncated: false };
    const rows = db.query(`WITH RECURSIVE blast(cid, depth) AS (
         SELECT canonical_id, 0 FROM typed_nodes WHERE canonical_id IN (${ph(ids.length)}) AND superseded_run IS NULL
         UNION
         SELECT src.canonical_id, blast.depth + 1
         FROM blast
         JOIN typed_edges e ON e.dst_canonical = blast.cid
         JOIN typed_nodes src ON src.canonical_id = e.src_canonical
         WHERE e.predicate IN ('calls', 'traces-to', 'imports')
           AND e.superseded_run IS NULL
           AND src.superseded_run IS NULL
           AND blast.depth < ?
       )
       SELECT n.file AS file, MIN(blast.depth) AS depth
       FROM blast
       JOIN typed_nodes n ON n.canonical_id = blast.cid
       WHERE blast.depth > 0 AND n.file IS NOT NULL
       GROUP BY n.file
       LIMIT 5000`).all(...ids, depth);
    const nodes = rows.map((r) => ({ file: r.file, depth: Number(r.depth) }));
    const maxDepth = nodes.reduce((m, n) => n.depth > m ? n.depth : m, 0);
    const truncated = idsTruncated || rows.length >= 5000 || undefined;
    return { root: symbol, depth: maxDepth, nodes, truncated };
  } finally {
    db.close();
  }
}
function wouldBreak(storePath, symbol, proposed = "") {
  const q = whoCalls(storePath, symbol);
  let proposedCount = 0;
  if (proposed.trim()) {
    const m = /\(([^)]*)\)/.exec(proposed);
    const inside = m ? m[1].trim() : "";
    if (inside)
      proposedCount = inside.split(",").map((s) => s.trim()).filter(Boolean).length;
  }
  return {
    symbol,
    proposed,
    callers: q.rows,
    breaking: q.callers.map((c) => ({
      importer: `${c.caller} (${c.file}:${c.line})`,
      reason: `signature change unverified \u2014 ${proposedCount > 0 ? `proposed arity ${proposedCount}` : "no proposed signature"}; manual verification required (no per-call signature metadata)`
    })),
    argsUnknown: true
  };
}
function chainCalls(storePath, from, to, maxDepth = 64, visitCap = 20000) {
  const db = openTypedStore(storePath);
  try {
    const starts = db.query("SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL ORDER BY canonical_id LIMIT 500").all(from);
    const targets = db.query("SELECT DISTINCT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL ORDER BY canonical_id LIMIT 500").all(to);
    const toSet = new Set(targets.map((r) => r.canonical_id));
    maxDepth = Math.min(Math.max(1, Math.floor(maxDepth) || 1), 16);
    const cap = Math.min(Math.max(1, Math.floor(visitCap) || 20000), 1e5);
    let truncated = false;
    const visited = new Set(starts.map((s) => s.canonical_id));
    const queue = starts.map((s) => ({ id: s.canonical_id, label: from, steps: [] }));
    let head = 0;
    while (head < queue.length && queue[head].steps.length < maxDepth) {
      if (visited.size >= cap) {
        truncated = true;
        break;
      }
      const cur = queue[head++];
      const out = db.query(`SELECT dst.canonical_id AS dst_id, dst.label AS dst_label,
                dst.file AS dst_file, dst.line AS dst_line, e.predicate AS predicate
         FROM typed_edges e
         JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id
         WHERE e.src_canonical = ? AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL
           AND dst.superseded_run IS NULL LIMIT 500`).all(cur.id);
      for (const e of out) {
        const step = {
          from: cur.label,
          to: e.dst_label,
          kind: e.predicate,
          file: e.dst_file ?? "",
          line: e.dst_line ?? 0
        };
        if (toSet.has(e.dst_id) && !(from === to && cur.steps.length === 0)) {
          const result = [...cur.steps, step];
          if (truncated)
            result.truncated = true;
          return result;
        }
        if (!visited.has(e.dst_id)) {
          visited.add(e.dst_id);
          queue.push({ id: e.dst_id, label: e.dst_label, steps: [...cur.steps, step] });
        }
      }
    }
    const out = [];
    if (truncated)
      out.truncated = true;
    return out;
  } finally {
    db.close();
  }
}
function unwiredNodes(storePath) {
  const db = openTypedStore(storePath);
  try {
    const rows = db.query(`SELECT n.label AS name, n.file AS file, n.line AS line, n.kind AS kind
       FROM typed_nodes n
       WHERE n.kind IN ('method', 'flow', 'service', 'class', 'function', 'file', 'module', 'Function', 'Class', 'File', 'Module') AND n.superseded_run IS NULL
         AND n.file IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM typed_edges e
           WHERE e.dst_canonical = n.canonical_id
             AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL
         )
       ORDER BY n.label LIMIT 5001`).all();
    const out = [];
    let linelessSkipped = 0;
    for (const r of rows) {
      if (r.line === null || r.line === undefined) {
        linelessSkipped += 1;
        continue;
      }
      out.push({ name: r.name, file: r.file ?? "", line: r.line, status: "UNWIRED", kind: r.kind ?? "" });
    }
    if (linelessSkipped > 0) {
      console.warn(`[gi-omp] unwired: skipped ${linelessSkipped} lineless row(s) (counted, never silent)`);
    }
    const truncated = rows.length > 5000 ? true : undefined;
    if (truncated)
      console.warn(`[gi-omp] unwired: truncated at 5000 rows (deterministic order)`);
    out.truncated = truncated;
    return out;
  } finally {
    db.close();
  }
}
function impactInDb(db, symbol, depth = 8) {
  depth = Math.min(Math.max(1, Math.floor(depth) || 1), 16);
  const ledger = [];
  const seen = new Set;
  let startIds = resolveLiveIds(db, symbol);
  if (startIds.length > 500) {
    console.warn(`[gi-omp] impact: '${symbol}' resolves to ${startIds.length} live ids \u2014 capping at 500 (SQLite variable limit); reachability UNDER-REPORTED`);
    startIds = startIds.slice(0, 500);
  }
  if (startIds.length === 0)
    return { symbol, reaches: 0, ledger, hint: `next=chain from=${symbol}` };
  const LEDGER_CAP = 5000;
  let ledgerTruncated = false;
  for (const id of startIds)
    seen.add(id);
  let frontier = startIds;
  for (let d = 1;d <= depth && frontier.length > 0 && !ledgerTruncated; d++) {
    const next = [];
    for (let i = 0;i < frontier.length; i += 64) {
      const chunk = frontier.slice(i, i + 64);
      const callers = db.query(`SELECT DISTINCT src.canonical_id AS id, src.label AS caller, src.file AS file, src.line AS line, e.predicate AS predicate
         FROM typed_edges e
         JOIN typed_nodes src ON e.src_canonical = src.canonical_id
         WHERE e.dst_canonical IN (${ph(chunk.length)})
           AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL
           AND src.superseded_run IS NULL`).all(...chunk);
      for (const c of callers) {
        if (seen.has(c.id))
          continue;
        seen.add(c.id);
        if (ledger.length < LEDGER_CAP) {
          ledger.push({ symbol: c.caller, depth: d, file: c.file ?? "", line: c.line ?? 0, via: c.predicate ?? "" });
        } else {
          ledgerTruncated = true;
        }
        next.push(c.id);
      }
    }
    frontier = next;
  }
  return { symbol, reaches: ledger.length, ledger, truncated: ledgerTruncated, hint: `next=chain from=${symbol}` };
}
function impact(storePath, symbol, depth = 8) {
  const db = openTypedStore(storePath);
  try {
    return impactInDb(db, symbol, depth);
  } finally {
    db.close();
  }
}
function safeDelete(storePath, symbol) {
  const db = openTypedStore(storePath);
  try {
    const q = whoCallsInDb(db, symbol);
    const imp = impactInDb(db, symbol);
    let srcIds = resolveLiveIds(db, symbol);
    if (srcIds.length > 500) {
      console.warn(`[gi-omp] safeDelete: '${symbol}' resolves to ${srcIds.length} live ids \u2014 capping at 500 (SQLite variable limit)`);
      srcIds = srcIds.slice(0, 500);
    }
    let mappedUses = [];
    let usesLinelessDropped = 0;
    if (srcIds.length > 0) {
      const uses = db.query(`SELECT DISTINCT dst.label AS symbol, dst.file AS file, dst.line AS line
         FROM typed_edges e
         JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id
         WHERE e.src_canonical IN (${ph(srcIds.length)})
           AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL
           AND dst.superseded_run IS NULL
         LIMIT 500`).all(...srcIds);
      for (const u of uses) {
        if (u.line === null || u.line === undefined) {
          usesLinelessDropped += 1;
          continue;
        }
        mappedUses.push({ symbol: u.symbol, file: u.file ?? "", line: u.line });
      }
    }
    const isTestPath = (f) => /(test|spec|mock|fixture)/i.test(f);
    const testReach = [
      ...q.callers.filter((c) => isTestPath(c.file)).map((c) => ({ symbol: c.caller, file: c.file, line: c.line })),
      ...mappedUses.filter((u) => isTestPath(u.file))
    ];
    return { symbol, callers: q.callers, reaches: imp.reaches, uses: mappedUses, testReach, usesLinelessDropped, truncated: q.truncated === true || imp.truncated === true };
  } finally {
    db.close();
  }
}
function gateAdvisory(storePath, symbols, dial = "STEER", ripwire) {
  const db = openTypedStore(storePath);
  try {
    const callers = [];
    for (const symbol of symbols) {
      const q = whoCallsInDb(db, symbol);
      for (const c of q.callers) {
        callers.push({ symbol, caller: c.caller, file: c.file, line: c.line, via: c.predicate ?? "" });
      }
    }
    const named = callers.slice(0, 20).map((c) => `${c.caller} (${c.file}:${c.line})`).join(", ");
    const ripwireNote = ripwire === undefined ? "(store-derived; ripwire not consulted)" : ripwire.ok ? `(store-derived + ripwire ${ripwire.summary})` : `(store-derived; ripwire ${ripwire.summary})`;
    const advisory = dial === "FULL" ? `GRAPH_GATE_SIGNATURE_BREAK symbols=${symbols.join(",")} callers=${callers.length}${named ? ` no-longer-fit: ${named}` : ""} ${ripwireNote}` : `[GATE STEER] symbols=${symbols.join(",")} callers=${callers.length}${named ? ` review: ${named}` : ""} ${ripwireNote}`;
    return { dial, symbols, callers, advisory };
  } finally {
    db.close();
  }
}

// src/omp/store-open.ts
import * as fs4 from "fs";
import * as path6 from "path";

// src/omp/gi-registry.ts
import * as os3 from "os";
import * as path5 from "path";
var GI_REGISTRY_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS gi_sessions (
    session_id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}',
    scope_root TEXT NOT NULL,
    store_path TEXT NOT NULL,
    opened_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_gi_sessions_store_path ON gi_sessions(store_path)`
];
var resolveRegistryPath = makeDbPath({
  envVars: ["GI_OMP_DB_DIR"],
  defaultDir: "~/.omp/graph-intelligence",
  fileName: "registry.sqlite",
  testFile: path5.join(os3.tmpdir(), "gi-omp-registry-test.sqlite")
});
var giRegistryWarned = false;
function isRegistryTestContext() {
  const argv1 = process.argv[1] ?? "";
  return process.env.BUN_TEST != null || process.env.BUN_TEST_PID != null || argv1.includes("/tests/st-");
}
function giRegistryPath() {
  if (process.env.GI_OMP_DB_DIR && isRegistryTestContext() && !giRegistryWarned) {
    giRegistryWarned = true;
    console.warn(`[gi-registry] GI_OMP_DB_DIR is set inside a test context \u2014 test-isolation heuristics bypassed; ` + `registry resolves to GI_OMP_DB_DIR=${process.env.GI_OMP_DB_DIR} (explicit env wins by design; ` + `unset it globally or point it at a per-test temp dir)`);
  }
  if (!process.env.GI_OMP_DB_DIR) {
    const argv1 = process.argv[1] ?? "";
    const inTestContext = process.env.BUN_TEST != null || process.env.BUN_TEST_PID != null || argv1.includes("/tests/st-");
    if (inTestContext) {
      return path5.join(os3.tmpdir(), "gi-omp-registry-test.sqlite");
    }
  }
  return resolveRegistryPath();
}
function openGiRegistry() {
  return getStoreDb({
    dbPath: giRegistryPath(),
    schema: GI_REGISTRY_SCHEMA,
    id: "gi-omp"
  });
}
function upsertGiSession(row) {
  openGiRegistry();
  upsertRow("gi_sessions", "session_id", row.sessionId, row.data ?? "{}", {
    scope_root: row.scopeRoot,
    store_path: row.storePath,
    opened_at: new Date().toISOString()
  });
}
function findGiSessionByStorePath(storePath) {
  const db = openGiRegistry();
  const hit = db.query("SELECT session_id, scope_root, store_path FROM gi_sessions WHERE store_path = ?").get(storePath);
  return hit ?? null;
}
class GiClearError extends Error {
  code = "GI_CLEAR_REFUSED";
  constructor(message) {
    super(message);
    this.name = "GiClearError";
  }
}
function clearGiRegistry() {
  if (process.env.GI_OMP_ALLOW_CLEAR !== "1") {
    throw new GiClearError("GI_CLEAR_REFUSED: set GI_OMP_ALLOW_CLEAR=1 to wipe the registry (never default)");
  }
  const db = openGiRegistry();
  db.run("DELETE FROM gi_sessions");
}

// src/omp/store-open.ts
class GiScopeError extends Error {
  code = "GI_SCOPE_REFUSED";
  constructor(message) {
    super(message);
    this.name = "GiScopeError";
  }
}
function openSessionStore(input) {
  const ownerKey = sessionKey(input.sessionId);
  const callerKey = sessionKey(input.callerSessionId ?? input.sessionId);
  if (callerKey !== ownerKey) {
    throw new GiScopeError(`GI_SCOPE_REFUSED: session ${callerKey} cannot open store owned by ${ownerKey}`);
  }
  if (!path6.isAbsolute(input.scopeRoot) || input.scopeRoot.split(/[\\/]/).includes("..") || input.scopeRoot.includes("\x00")) {
    throw new GiScopeError(`GI_SCOPE_REFUSED: scopeRoot must be a canonical absolute path, got ${JSON.stringify(input.scopeRoot)}`);
  }
  let resolvedScopeRoot;
  try {
    resolvedScopeRoot = fs4.realpathSync(input.scopeRoot);
  } catch {
    throw new GiScopeError(`GI_SCOPE_REFUSED: scopeRoot does not resolve: ${JSON.stringify(input.scopeRoot)}`);
  }
  const storePath = sessionStorePath(resolvedScopeRoot, input.sessionId);
  const existing = findGiSessionByStorePath(storePath);
  if (existing && existing.session_id !== ownerKey) {
    throw new GiScopeError(`GI_SCOPE_REFUSED: store ${storePath} owned by ${existing.session_id}; caller ${callerKey}`);
  }
  fs4.mkdirSync(path6.dirname(storePath), { recursive: true });
  let created = false;
  try {
    fs4.writeFileSync(storePath, "", { flag: "wx" });
    created = true;
  } catch (e) {
    if (e.code !== "EEXIST")
      throw e;
  }
  const current = findGiSessionByStorePath(storePath);
  if (current && current.session_id !== ownerKey) {
    if (created) {
      try {
        fs4.unlinkSync(storePath);
      } catch (e) {
        console.warn(`[store-open] orphan cleanup failed for ${storePath}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    throw new GiScopeError(`GI_SCOPE_REFUSED: store ${storePath} owned by ${current.session_id}; caller ${callerKey}`);
  }
  if (!current) {
    upsertGiSession({
      sessionId: ownerKey,
      scopeRoot: resolvedScopeRoot,
      storePath
    });
  }
  const written = findGiSessionByStorePath(storePath);
  if (written && written.session_id !== ownerKey) {
    if (created) {
      try {
        fs4.unlinkSync(storePath);
      } catch (e) {
        console.warn(`[store-open] orphan cleanup failed for ${storePath}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    throw new GiScopeError(`GI_SCOPE_REFUSED: store ${storePath} raced to ${written.session_id}; caller ${callerKey} lost`);
  }
  if (!written) {
    if (created) {
      try {
        fs4.unlinkSync(storePath);
      } catch (e) {
        console.warn(`[store-open] orphan cleanup failed for ${storePath}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    throw new GiScopeError(`GI_SCOPE_REFUSED: store ${storePath} was not persisted to the registry (upsert wrote no row for ${ownerKey})`);
  }
  return { storePath, ownerKey, created };
}

class GiStoreScopeError extends Error {
  code = "GI_STORE_SCOPE_MISMATCH";
  constructor(message) {
    super(message);
    this.name = "GiStoreScopeError";
  }
}
function assertStoreScope(storePath, subjectRoot, opts = {}) {
  const subject = fs4.realpathSync(subjectRoot);
  let readBuildRoot = null;
  try {
    readBuildRoot = getMeta(storePath, "build_root");
  } catch {
    readBuildRoot = null;
  }
  if (readBuildRoot === null || readBuildRoot.length === 0) {
    return { buildRoot: null, subjectRoot: subject, foreign: false };
  }
  if (readBuildRoot !== subject) {
    if (opts.allowForeignStore === true) {
      return { buildRoot: readBuildRoot, subjectRoot: subject, foreign: true };
    }
    throw new GiStoreScopeError(`GI_STORE_SCOPE_MISMATCH: store built for ${readBuildRoot}, subject root is ${subject}`);
  }
  return { buildRoot: readBuildRoot, subjectRoot: subject, foreign: false };
}

// src/omp/gate-hook.ts
import * as fs8 from "fs";

// src/omp/gate-middleware.ts
import * as fs5 from "fs";
var EXPORT_PARSE_RE = /export\s+(?:async\s+)?(?:function\s*\*?|const|class|let|var|type|interface|enum)\s+(\w+)/g;
var EXPORT_GEN_RE = /export\s+(?:async\s+)?function\s*\*\s*(\w+)/g;
var EXPORT_DESTRUCT_RE = /export\s+(?:const|let|var)\s*(\{[^}]*\}|\[[^\]]*\])/g;
function eachDestructuredName(list, cb) {
  for (const spec of list.split(",")) {
    const noDefault = spec.split("=")[0] ?? "";
    const parts = noDefault.split(":");
    const name = (parts[parts.length - 1] ?? "").trim().replace(/^\.\.\./, "");
    if (/^[A-Za-z_$][\w$]*$/.test(name))
      cb(name);
  }
}
var EXPORT_BRACES_RE = /export\s*\{([^}]*)\}(?:\s*from\s*['"][^'"]*['"])?/g;
var EXPORT_DEFAULT_RE = /export\s+default\b/g;
function eachExportName(src, cb) {
  let m;
  EXPORT_PARSE_RE.lastIndex = 0;
  while (m = EXPORT_PARSE_RE.exec(src))
    cb(m[1], m.index);
  EXPORT_GEN_RE.lastIndex = 0;
  while (m = EXPORT_GEN_RE.exec(src))
    cb(m[1], m.index);
  EXPORT_DESTRUCT_RE.lastIndex = 0;
  while (m = EXPORT_DESTRUCT_RE.exec(src)) {
    const idx = m.index;
    eachDestructuredName(m[1].slice(1, -1), (n) => cb(n, idx));
  }
  EXPORT_BRACES_RE.lastIndex = 0;
  while (m = EXPORT_BRACES_RE.exec(src)) {
    const idx = m.index;
    for (const spec of m[1].split(",")) {
      const s = spec.trim();
      if (!s)
        continue;
      const asMatch = /\bas\s+(\w+)\s*$/.exec(s);
      if (asMatch) {
        cb(asMatch[1], idx);
        continue;
      }
      const plain = /^(\w+)$/.exec(s);
      if (plain)
        cb(plain[1], idx);
    }
  }
  EXPORT_DEFAULT_RE.lastIndex = 0;
  while (m = EXPORT_DEFAULT_RE.exec(src))
    cb("default", m.index);
}
function parseExports(src) {
  const out = new Set;
  eachExportName(src, (n) => out.add(n));
  return [...out];
}
function resolveDial(env = process.env, dialFile) {
  const fromEnv = (env.GI_DIAL ?? "").toUpperCase();
  if (fromEnv === "OFF" || fromEnv === "STEER" || fromEnv === "FULL")
    return fromEnv;
  if (dialFile && fs5.existsSync(dialFile)) {
    try {
      const j = JSON.parse(fs5.readFileSync(dialFile, "utf8"));
      const lv = String(j.level ?? "").toUpperCase();
      if (lv === "OFF" || lv === "STEER" || lv === "FULL")
        return lv;
    } catch {}
  }
  return "STEER";
}
function runGraphGate(input) {
  if (!input.hasStore) {
    if ((input.env?.GI_ALLOW_NO_STORE ?? process.env.GI_ALLOW_NO_STORE ?? "") === "1") {
      return {
        cancel: false,
        token: "GI_NO_STORE",
        advisory: "GI_NO_STORE: BYPASSED BY EXPLICIT ENV (GI_ALLOW_NO_STORE=1) \u2014 the graph gate did NOT verify this edit."
      };
    }
    return {
      cancel: true,
      token: "GI_NO_STORE",
      advisory: "GI_NO_STORE: no graph store for this scope \u2014 the gate CANNOT verify this edit, so it REFUSES. Populate the store (a graph-query populates on demand) or set GI_DIAL=OFF to disable the gate deliberately. A missing substrate is never a pass."
    };
  }
  const before = parseExports(input.oldText);
  const after = new Set(parseExports(input.newText));
  const removed = before.filter((n) => !after.has(n));
  if (removed.length === 0) {
    return { cancel: false, token: null, advisory: null };
  }
  if (input.dial === "FULL") {
    return {
      cancel: true,
      token: "GRAPH_GATE_SIGNATURE_BREAK",
      advisory: `removed=${removed.join(",")}`
    };
  }
  if (input.dial === "STEER") {
    return {
      cancel: false,
      token: "[GATE STEER]",
      advisory: `SIGNATURE_BREAK removed=${removed.join(",")}`
    };
  }
  return { cancel: false, token: null, advisory: null };
}

// src/omp/graph-gate.ts
var DRIFT_WINDOW_MS = 300000;
var TIER_T1_CUT = 0.4;
var TIER_T2_CUT = 0.6;
var TIER_T3_CUT = 0.8;
var TIER_T3_MIN_CONSECUTIVE = 5;
var SEV_WEIGHT = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 };
var DOC_SUFFIXES = [".md", ".json", ".yaml", ".yml", ".toml", ".txt", ".lock"];
var TEST_HINTS = ["test", "spec", "fixture", "__tests__", "__mocks__"];
function baseName(p) {
  return p.split("/").pop() ?? p;
}
function extractExportSymbols(text) {
  const out = [];
  const re = /\bexport\s+(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(text)) !== null)
    out.push(m[1]);
  const braceRe = /export\s*\{([^}]{1,400})\}/g;
  while ((m = braceRe.exec(text)) !== null) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim() ?? "";
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name))
        out.push(name);
    }
  }
  return [...new Set(out)];
}
function classifyEdit(toolName, args) {
  const targetFile = args.file ?? args.path ?? "";
  const lowered = targetFile.toLowerCase();
  if (DOC_SUFFIXES.some((s) => lowered.endsWith(s))) {
    return { severity: "NONE", structuralFlags: ["doc-only"], touchedSymbols: [], targetFile };
  }
  const base = baseName(lowered);
  const isTest = TEST_HINTS.some((h) => base.includes(h) || lowered.includes(`/${h}/`));
  const body = `${args.oldString ?? ""}
${args.newString ?? ""}
${args.content ?? ""}`;
  const oldSyms = extractExportSymbols(args.oldString ?? "");
  const newSyms = extractExportSymbols(args.newString ?? args.content ?? "");
  const structural = oldSyms.length > 0 || newSyms.length > 0 || /\bimport\s+.*\bfrom\b/.test(body) || /\bexport\s+default\b/.test(body) || /\bdelete\s+function\b/.test(body) || /:\s*[A-Za-z_$][A-Za-z0-9_$<>[\]|]*\s*[=;{]/.test(body) && /export\s+(type|interface)/.test(body);
  const touchedSymbols = [...new Set([...oldSyms, ...newSyms])];
  const flags = [];
  if (oldSyms.length > 0 || newSyms.length > 0)
    flags.push("export_change");
  if (/\bimport\s+.*\bfrom\b/.test(body))
    flags.push("import_change");
  if (/\bexport\s+default\b/.test(body))
    flags.push("default_export");
  if (isTest) {
    return { severity: "LOW", structuralFlags: flags.length > 0 ? flags : ["test-only"], touchedSymbols, targetFile };
  }
  if (structural) {
    return { severity: "HIGH", structuralFlags: flags.length > 0 ? flags : ["structural"], touchedSymbols, targetFile };
  }
  return { severity: "MEDIUM", structuralFlags: ["logic"], touchedSymbols, targetFile };
}
function createEmptyState() {
  return { editLog: [], graphQueries: [], gateState: "IDLE", drift: 0 };
}
function normTarget(t) {
  return t.replace(/\(\)$/, "").trim().toLowerCase();
}
function recordEdit(c, state, ts = Date.now()) {
  if (c.severity === "NONE")
    return;
  state.editLog.push({ timestamp: ts, severity: c.severity, symbols: c.touchedSymbols.map(normTarget) });
  if (state.gateState === "IDLE")
    state.gateState = "TRACKING";
}
function recordGraphQuery(q, state, ts = Date.now()) {
  const target = normTarget(q.target ?? "");
  if (target.length === 0)
    return;
  const resolved = q.resolved === true || typeof q.rows === "number" && q.rows > 0;
  state.graphQueries.push({ timestamp: ts, tool: q.tool, target, resolved });
}
function symbolVerified(sym, state) {
  const t = normTarget(sym);
  return state.graphQueries.some((q) => q.target === t && q.resolved === true);
}
function computeDrift(state, now = Date.now()) {
  state.editLog = state.editLog.filter((e) => now - e.timestamp < DRIFT_WINDOW_MS);
  state.graphQueries = state.graphQueries.filter((q) => now - q.timestamp < DRIFT_WINDOW_MS);
  let unverifiedWeight = 0;
  let totalWeight = 0;
  let unverifiedCount = 0;
  const verifiedSymbols = [];
  for (const edit of state.editLog) {
    const age = Math.max(0, now - edit.timestamp);
    if (age >= DRIFT_WINDOW_MS)
      continue;
    const decay = 1 - age / DRIFT_WINDOW_MS;
    const weight = SEV_WEIGHT[edit.severity] * decay;
    const verifiedHere = edit.symbols.filter((s) => symbolVerified(s, state));
    for (const v of verifiedHere)
      if (!verifiedSymbols.includes(v))
        verifiedSymbols.push(v);
    if (edit.symbols.length === 0) {
      continue;
    } else if (verifiedHere.length > 0) {
      totalWeight += weight;
      continue;
    } else {
      totalWeight += weight;
      unverifiedWeight += weight;
      unverifiedCount += 1;
    }
  }
  for (const q of state.graphQueries) {
    if (q.resolved === true && !verifiedSymbols.includes(q.target))
      verifiedSymbols.push(q.target);
  }
  const drift = totalWeight <= 0 ? 0 : Math.min(1, unverifiedWeight / totalWeight);
  let lastGraphQuery = null;
  for (const q of state.graphQueries) {
    if (lastGraphQuery === null || q.timestamp > lastGraphQuery)
      lastGraphQuery = q.timestamp;
  }
  state.drift = drift;
  return { drift, unverifiedCount, verifiedSymbols, lastGraphQuery };
}
function consecutiveUnverified(state, now = Date.now()) {
  let n = 0;
  for (let i = state.editLog.length - 1;i >= 0; i--) {
    const edit = state.editLog[i];
    if (now - edit.timestamp >= DRIFT_WINDOW_MS)
      break;
    if (edit.symbols.length === 0)
      continue;
    if (edit.symbols.some((s) => symbolVerified(s, state)))
      break;
    n += 1;
  }
  return n;
}
function gateDecision(d, state, now = Date.now()) {
  const n = consecutiveUnverified(state, now);
  const attempts = state.graphQueries.filter((q) => q.tool !== "reset").length;
  const resolvedAny = state.graphQueries.some((q) => q.resolved === true);
  const substrateUnreachable = attempts > 0 && !resolvedAny;
  if (substrateUnreachable && d.drift >= TIER_T1_CUT) {
    state.gateState = "WARNING";
    return {
      tier: "T1",
      state: "WARNING",
      advisory: `[GATE STEER] ${d.unverifiedCount} structural edits without a RESOLVABLE graph query \u2014 the graph substrate cannot serve this session (${attempts} query attempt(s), 0 resolved). Per the law, record RIPWIRE_MISSING and use grep as the structural map; the gate stays advisory.`
    };
  }
  if (d.drift >= TIER_T3_CUT && n >= TIER_T3_MIN_CONSECUTIVE) {
    state.gateState = "HARD_STOP";
    return {
      tier: "T3",
      state: "HARD_STOP",
      ttsrRuleName: "graph-before-structural-edit",
      blockReason: `GRAPH_GATE_ABORT: drift ${d.drift.toFixed(2)} with ${d.unverifiedCount} unverified structural edits \u2014 reasoning rewound, query the graph`
    };
  }
  if (d.drift >= TIER_T2_CUT && n >= 3) {
    state.gateState = "GATE_ON";
    return {
      tier: "T2",
      state: "GATE_ON",
      blockReason: `GRAPH_GATE_DRIFT_HIGH: ${d.unverifiedCount} structural edits without graph query. Call ripwire verb=callers or graph-query verb=who-calls on the symbols you are modifying.`
    };
  }
  if (d.drift >= TIER_T1_CUT) {
    state.gateState = "WARNING";
    return {
      tier: "T1",
      state: "WARNING",
      advisory: `[GATE STEER] ${d.unverifiedCount} symbols modified without graph query \u2014 consider ripwire verb=callers before the next structural edit`
    };
  }
  if (d.drift > 0)
    state.gateState = "TRACKING";
  else
    state.gateState = "IDLE";
  return { tier: "T0", state: state.gateState };
}

// src/omp/adapters/abide.ts
import { execFileSync as execFileSync2 } from "child_process";
import * as fs6 from "fs";
import * as path8 from "path";

// src/omp/adapters/jevk5.ts
import { execFileSync } from "child_process";
import * as path7 from "path";
var JEVK5_URL_DEFAULT = "http://127.0.0.1:8090/v1/systemone";
var JEVK5_HEALTH_8008 = "http://127.0.0.1:8008/health";
function jevk5Url(env = process.env) {
  const v = env.JEVK5_URL;
  return typeof v === "string" && v.length > 0 ? v : JEVK5_URL_DEFAULT;
}
function healthUrlFor(systemoneUrl) {
  try {
    const u = new URL(systemoneUrl);
    return `${u.protocol}//${u.host}/health`;
  } catch {
    return "http://127.0.0.1:8090/health";
  }
}
function portToken(url) {
  try {
    const u = new URL(url);
    return u.port.length > 0 ? `:${u.port}` : url;
  } catch {
    return url;
  }
}
function curlGet(url, timeoutS) {
  try {
    const out = execFileSync("curl", ["-s", "-m", String(timeoutS), url], {
      encoding: "utf8",
      timeout: (timeoutS + 2) * 1000,
      maxBuffer: 1 * 1024 * 1024
    });
    return String(out);
  } catch {
    return null;
  }
}
function parseHealth(raw) {
  let obj = null;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { ok: false, raw };
  }
  if (typeof obj !== "object" || obj === null)
    return { ok: false, raw };
  const rec = obj;
  const ok = rec["ok"] === true || rec["status"] === "ok";
  const model = typeof rec["model"] === "string" ? rec["model"] : undefined;
  const runtime = typeof rec["runtime"] === "string" ? rec["runtime"] : undefined;
  return { ok, model, runtime, raw };
}
function probeHealth(systemoneUrl) {
  const primary = healthUrlFor(systemoneUrl);
  const urls = primary === JEVK5_HEALTH_8008 ? [primary] : [primary, JEVK5_HEALTH_8008];
  const attempts = [];
  let best = null;
  for (const url of urls) {
    const raw = curlGet(url, 3);
    if (raw === null) {
      attempts.push(`${url} \u2014 UNREACHABLE`);
      continue;
    }
    const h = parseHealth(raw);
    attempts.push(`${url} \u2014 ${h.ok ? "ok" : "not-ok"} ${raw.slice(0, 120)}`);
    if (h.ok && best === null)
      best = { url, h };
  }
  if (best !== null) {
    const port = portToken(best.url);
    const model = best.h.model ?? "jevk5-4b-v0.2-Q8_0";
    const runtime = best.h.runtime !== undefined ? `, runtime ${best.h.runtime}` : "";
    const checked = urls.map((u) => portToken(u)).join(" + ");
    return {
      up: true,
      evidence: `jevk5 ${model} on ${port} (${best.url} ok${runtime}) [checked ${checked}]`
    };
  }
  const checked = urls.map((u) => portToken(u)).join(" nor ");
  return {
    up: false,
    evidence: `GI_JEVK5_DOWN: no JevK5 health at ${checked} (${attempts.join(" | ").slice(0, 300)})`
  };
}
function jevk5Available(url) {
  try {
    const sysUrl = url ?? jevk5Url();
    return probeHealth(sysUrl).up;
  } catch {
    return false;
  }
}
var JEVK5_MEANING_INSTRUCTIONS = "Does the named symbol behave as its name and role say it does? Answer with a noul judgment.";
function buildState(scopeRoot, subject) {
  const base = path7.basename(scopeRoot);
  return [
    `Repository: ${base}`,
    `Subject under review: ${subject}`,
    `The subject is a symbol in this repository's decision path. Judge whether the symbol's`,
    `implementation matches its declared name and role.`
  ].join(`
`);
}
function postSystemone(systemoneUrl, state) {
  const body = JSON.stringify({
    state,
    questions: { q1: { type: "noul", instructions: JEVK5_MEANING_INSTRUCTIONS } }
  });
  let out;
  try {
    const raw = execFileSync("curl", ["-s", "-m", "30", "-X", "POST", systemoneUrl, "-H", "Content-Type: application/json", "-d", body], {
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 4 * 1024 * 1024
    });
    out = String(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200);
    throw new Error(`GI_JEVK5_DOWN: the JevK5 POST to ${systemoneUrl} failed \u2014 ${msg}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch (e) {
    throw new Error(`GI_JEVK5_DOWN: the JevK5 server at ${systemoneUrl} printed invalid JSON \u2014 ${(e instanceof Error ? e.message : String(e)).slice(0, 120)} \xB7 output: ${out.slice(0, 160)}`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`GI_JEVK5_DOWN: the JevK5 server at ${systemoneUrl} answered a non-object \u2014 ${out.slice(0, 160)}`);
  }
  return parsed;
}
function jevk5Probe(scopeRoot) {
  const systemoneUrl = jevk5Url();
  const port = portToken(healthUrlFor(systemoneUrl));
  return {
    id: "TSG",
    rung: "meaning",
    dependency: `the live JevK5 GPU model (jevk5-4b-v0.2-Q8_0) via ${systemoneUrl} \u2014 the meaning gate's GPU judge`,
    errorCode: "GI_JEVK5_DOWN",
    up: () => {
      const h = probeHealth(systemoneUrl);
      return h.up ? { up: true, evidence: h.evidence } : { up: false, evidence: h.evidence };
    },
    facts: (subject) => {
      const res = postSystemone(systemoneUrl, buildState(scopeRoot, subject));
      const ans = res.answers?.["q1"];
      if (ans === undefined) {
        throw new Error(`GI_JEVK5_DOWN: the JevK5 answer carried no q1 \u2014 response: ${JSON.stringify(res).slice(0, 200)}`);
      }
      const noul = typeof ans.noul === "number" ? ans.noul : typeof ans.confidence === "number" ? ans.confidence : NaN;
      const confidence = typeof ans.confidence === "number" ? ans.confidence : noul;
      if (!Number.isFinite(noul) || !Number.isFinite(confidence)) {
        throw new Error(`GI_JEVK5_DOWN: the JevK5 answer carried a non-finite noul/confidence ${JSON.stringify(ans).slice(0, 160)} \u2014 refusing to report a verdict`);
      }
      const model = typeof res.model === "string" && res.model.length > 0 ? res.model : "jevk5-4b-v0.2-Q8_0";
      const ms = typeof res.latency_ms === "number" ? res.latency_ms : 0;
      const verdict = noul >= 0.5 ? "match" : "drift";
      return [
        {
          consumer: "TSG",
          rung: "meaning",
          subject,
          value: { meaning: verdict, confidence, noul, model, ms },
          source: `${scopeRoot}#jevk5(${verdict} p=${noul.toFixed(3)} \xB7 ${model} \xB7 ${port} \xB7 ${ms}ms)`
        }
      ];
    }
  };
}

// src/omp/adapters/abide.ts
var ABIDE_EVENTS_REL = ".abide/events.jsonl";
function abideEventsPath(abideRoot) {
  if (process.env.GI_ABIDE_ROOT !== undefined)
    return path8.join(process.env.GI_ABIDE_ROOT, ABIDE_EVENTS_REL);
  if (process.env.JARVIS_WORKSPACE !== undefined) {
    const envPath = path8.join(process.env.JARVIS_WORKSPACE, ABIDE_EVENTS_REL);
    if (fs6.existsSync(envPath))
      return envPath;
  }
  const base = path8.resolve(abideRoot ?? process.cwd());
  let dir = base;
  for (let i = 0;i < 6; i += 1) {
    const candidate = path8.join(dir, ABIDE_EVENTS_REL);
    if (fs6.existsSync(candidate))
      return candidate;
    const parent = path8.dirname(dir);
    if (parent === dir)
      break;
    dir = parent;
  }
  return path8.join(base, ABIDE_EVENTS_REL);
}
var tailCache = new Map;
function tailEvents(eventsPath, limit) {
  let st = null;
  try {
    st = fs6.statSync(eventsPath);
  } catch {
    st = null;
  }
  if (st !== null) {
    const hit = tailCache.get(eventsPath);
    if (hit && hit.size === st.size && hit.mtimeMs === st.mtimeMs)
      return hit.events.slice(-limit);
    const TAIL_BYTES_START = 1024 * 1024;
    const TAIL_BYTES_MAX = Math.min(st.size, 64 * 1024 * 1024);
    let fd = null;
    try {
      fd = fs6.openSync(eventsPath, "r");
      let accepted = false;
      let tailBytes = TAIL_BYTES_START;
      while (tailBytes <= TAIL_BYTES_MAX && !accepted) {
        const start = Math.max(0, st.size - tailBytes);
        const buf = Buffer.alloc(st.size - start);
        fs6.readSync(fd, buf, 0, buf.length, start);
        let text = buf.toString("utf8");
        if (start > 0) {
          const nl = text.indexOf(`
`);
          if (nl === -1) {
            tailBytes *= 2;
            continue;
          }
          text = text.slice(nl + 1);
        }
        const lines = text.split(`
`).filter((l) => l.trim().length > 0);
        if (lines.length >= limit || start === 0) {
          const out = [];
          for (const l of lines.slice(-limit)) {
            try {
              out.push(JSON.parse(l));
            } catch {}
          }
          tailCache.set(eventsPath, { size: st.size, mtimeMs: st.mtimeMs, events: out });
          return out;
        }
        tailBytes *= 2;
      }
    } catch {} finally {
      if (fd !== null) {
        try {
          fs6.closeSync(fd);
        } catch {}
      }
    }
  }
  const MAX_SAFE_FULL_READ = 32 * 1024 * 1024;
  if (st && st.size > MAX_SAFE_FULL_READ) {
    throw new Error(`GI_ENFORCE_ABIDE: bounded tail failed for ${eventsPath} (${st.size}B) and full read exceeds ${MAX_SAFE_FULL_READ}B \u2014 refusing to materialize the ledger`);
  }
  console.warn(`[gi-abide] bounded tail failed for ${eventsPath} \u2014 degraded full read (counted, never silent)`);
  let raw;
  try {
    raw = fs6.readFileSync(eventsPath, "utf8");
    if (Buffer.byteLength(raw, "utf8") > MAX_SAFE_FULL_READ) {
      throw new Error(`GI_ENFORCE_ABIDE: bounded tail failed for ${eventsPath} (${Buffer.byteLength(raw, "utf8")}B read) and full read exceeds ${MAX_SAFE_FULL_READ}B \u2014 refusing to materialize the ledger`);
    }
  } catch (e) {
    throw new Error(`GI_ENFORCE_ABIDE: bounded tail failed for ${eventsPath} and the fallback read is unavailable (${e.code ?? (e instanceof Error ? e.message : String(e))}) \u2014 the ledger cannot be read`);
  }
  const lines = raw.split(`
`).filter((l) => l.trim().length > 0);
  const out = [];
  for (const l of lines.slice(-limit)) {
    try {
      out.push(JSON.parse(l));
    } catch {}
  }
  try {
    const st2 = fs6.statSync(eventsPath);
    tailCache.set(eventsPath, { size: st2.size, mtimeMs: st2.mtimeMs, events: out });
  } catch {}
  return out;
}
function abideProbe(scopeRoot, abideRoot) {
  const eventsPath = abideEventsPath(abideRoot ?? scopeRoot);
  return {
    id: "ABIDE",
    rung: "repair",
    dependency: "the Abide source \u2014 the ALU (repair, never block)",
    errorCode: "GI_ENFORCE_ABIDE",
    up: () => {
      try {
        const st = fs6.statSync(eventsPath);
        if (!st.isFile())
          return { up: false, evidence: `${eventsPath} exists but is not a file` };
        if (st.size === 0)
          return { up: false, evidence: `${eventsPath} is EMPTY \u2014 the checker has emitted nothing` };
        return { up: true, evidence: `${eventsPath} (${st.size}B, mtime ${new Date(st.mtimeMs).toISOString()})` };
      } catch (e) {
        const code = e.code ?? "UNKNOWN";
        return { up: false, evidence: `${eventsPath} \u2014 ${code}` };
      }
    },
    facts: (subject) => {
      if (!fs6.existsSync(eventsPath)) {
        throw new Error(`GI_ENFORCE_ABIDE: the Abide event ledger is absent at ${eventsPath}`);
      }
      if (!subject || subject.trim().length === 0)
        return [];
      const events = tailEvents(eventsPath, 4000);
      const hits = events.filter((e) => {
        if (e.band !== "flag")
          return false;
        const span = (e.matched_span ?? "").trim();
        const verdict = (e.verdict ?? "").trim();
        const rule = (e.rule ?? "").trim();
        if (span.length > 0 && span.includes(subject))
          return true;
        if (verdict.length > 0 && verdict.includes(subject))
          return true;
        if (rule.length > 0 && rule.includes(subject))
          return true;
        if (span.length >= 6 && subject.includes(span))
          return true;
        return false;
      });
      return hits.map((e) => ({
        consumer: "ABIDE",
        rung: "repair",
        subject,
        value: {
          repair: "the flagged claim needs its structured atom / evidence",
          rule: e.rule,
          band: e.band,
          matchedSpan: e.matched_span,
          verdict: e.verdict
        },
        source: `${eventsPath}#${e.ts ?? "?"}(${e.rule ?? "?"} \xB7 span "${e.matched_span ?? "-"}")`
      }));
    }
  };
}
var ABIDE_MODEL_RULES = [
  {
    id: "ABIDE-R1",
    instructions: "Does this diff contain a claim of correctness, completion, or verification WITHOUT a tool result behind it (a claim without evidence)? Answer with a noul judgment: high noul means the violation IS present."
  },
  {
    id: "ABIDE-R2",
    instructions: "Does this diff report a skipped verification as passed, or a blocked or failed check as green? Answer with a noul judgment: high noul means the violation IS present."
  },
  {
    id: "ABIDE-R3",
    instructions: "Does this diff shrink scope or omit required work while presenting as complete (a scope shrink)? Answer with a noul judgment: high noul means the violation IS present."
  }
];
var ABIDE_ACT = 0.8;
var ABIDE_FLAG = 0.5;
function postRule(systemoneUrl, state, rule, timeoutS) {
  const body = JSON.stringify({
    state,
    questions: { q1: { type: "noul", instructions: rule.instructions } }
  });
  let out;
  try {
    const raw = execFileSync2("curl", ["-s", "-m", String(timeoutS), "-X", "POST", systemoneUrl, "-H", "Content-Type: application/json", "-d", body], {
      encoding: "utf8",
      timeout: (timeoutS + 5) * 1000,
      maxBuffer: 4 * 1024 * 1024
    });
    out = String(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200);
    throw new Error(`GI_JEVK5_DOWN: the live Abide judge POST to ${systemoneUrl} failed for ${rule.id} \u2014 ${msg}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch (e) {
    throw new Error(`GI_JEVK5_DOWN: the live Abide judge at ${systemoneUrl} printed invalid JSON for ${rule.id} \u2014 ${(e instanceof Error ? e.message : String(e)).slice(0, 120)} \xB7 output: ${out.slice(0, 160)}`);
  }
  const ans = parsed.answers?.["q1"];
  const noul = typeof ans?.noul === "number" ? ans.noul : typeof ans?.confidence === "number" ? ans.confidence : NaN;
  if (!Number.isFinite(noul)) {
    throw new Error(`GI_JEVK5_DOWN: the live Abide judge answer carried a non-finite noul/confidence for ${rule.id} \u2014 ${JSON.stringify(ans).slice(0, 160)}`);
  }
  return noul;
}
function judgeDiff(diff, opts) {
  const systemoneUrl = opts?.systemoneUrl ?? jevk5Url();
  const timeoutS = opts?.timeoutS ?? 30;
  const failOpen = (reason) => {
    let fallback = "offline fallback unavailable (no ledger at the search base)";
    try {
      const eventsPath = abideEventsPath(opts?.abideRoot);
      if (fs6.existsSync(eventsPath)) {
        const events = tailEvents(eventsPath, 4000);
        const flags = events.filter((e) => e.band === "flag").length;
        fallback = `offline fallback: ${eventsPath} carries ${events.length} recent event(s), ${flags} flag(s) \u2014 ledger only, no live verdict`;
      } else {
        fallback = `offline fallback: no ledger at ${eventsPath}`;
      }
    } catch (e) {
      fallback = `offline fallback unreadable (${e instanceof Error ? e.message.slice(0, 160) : String(e).slice(0, 160)})`;
    }
    return { ok: false, verdict: "SKIPPED", repair: null, reason, evidence: `${reason} \xB7 ${fallback}`, scores: {}, judge: systemoneUrl };
  };
  try {
    if (diff.trim().length === 0) {
      return { ok: true, verdict: "SILENT", repair: null, reason: "empty diff", evidence: "diff_len=0 live judge not called", scores: {}, judge: systemoneUrl };
    }
    const acting = [];
    const flagged = [];
    const perRule = [];
    const scores = {};
    for (const rule of ABIDE_MODEL_RULES) {
      const noul = postRule(systemoneUrl, diff, rule, timeoutS);
      scores[rule.id] = noul;
      perRule.push(`${rule.id}=${noul.toFixed(3)}`);
      if (noul >= ABIDE_ACT)
        acting.push(`${rule.id} (${rule.instructions}) p=${noul.toFixed(3)}`);
      else if (noul >= ABIDE_FLAG)
        flagged.push(`${rule.id} p=${noul.toFixed(3)}`);
    }
    const trace = `live judge ${systemoneUrl} rules=${ABIDE_MODEL_RULES.length} ${perRule.join(" ")}`;
    if (acting.length > 0) {
      return {
        ok: true,
        verdict: "REPAIR",
        repair: `[abide] ${acting.length} rule(s) violated on this edit: ${acting.join(" | ")}. Repair the edit; the change was NOT reverted.`,
        reason: `${acting.length} rule(s) at the act band`,
        evidence: trace,
        scores,
        judge: systemoneUrl
      };
    }
    return {
      ok: true,
      verdict: flagged.length > 0 ? "NOTICE" : "SILENT",
      repair: null,
      reason: flagged.length > 0 ? `${flagged.length} rule(s) flagged: ${flagged.join(", ")}` : "all rules clear",
      evidence: trace,
      scores,
      judge: systemoneUrl
    };
  } catch (e) {
    return failOpen(`live judge down (fail-open): ${e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300)}`);
  }
}

// src/omp/jev.ts
import * as fs7 from "fs";
import * as os4 from "os";
var KEY_FILE = `${os4.homedir()}/.config/typesafe/key`;

class JevError extends Error {
  code;
  status;
  constructor(code, message, status) {
    super(`${code}: ${message}`);
    this.code = code;
    this.status = status;
    this.name = "JevError";
  }
}
var TOOLGATE_URL_DEFAULT = process.env.TOOLGATE_URL ?? "http://127.0.0.1:8090/v1/systemone";
var GATE_THRESHOLD = {
  security: 0.5,
  info: 0.5
};
function graphBreakCandidate(file, advisory) {
  return {
    kind: "GRAPH_SIGNATURE_BREAK",
    signals: [file, advisory.slice(0, 80)],
    severity: "info",
    instructions: "An edit to a source file REMOVED one or more exported names (the gate reports which). " + "Decide whether this is a REAL signature break that a consumer would break on, or a " + "legitimate refactor (a rename/removal with the consumers updated in the same change, a " + "test-only export, an internal helper that was never imported).",
    criteria: {
      serve: "a legitimate refactor: the removed name looks local, test-only, or part of a coordinated rename (the edit or a sibling change updates the consumers)",
      refuse: "a real signature break: a public/most-imported export disappears with no replacement in the same edit \u2014 the graph's own unwired/blast-radius evidence flags it"
    }
  };
}
function scrubSecrets(text) {
  return text.replace(/(Bearer|token|api[_-]?key|secret|password|passwd|authorization)\s*[:=]?\s*[A-Za-z0-9_\-./+=~]{8,}/gi, "$1 <redacted>").replace(/(sk|pk|ghp|gho|xox[baprs])[-_][A-Za-z0-9_-]{12,}/g, "<redacted>");
}
function sanitizeForJudge(v, max = 160) {
  return String(v ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/[`"'\\]/g, "").replace(/\b(ignore|disregard|forget|override|system|assistant|instruction)s?\b/gi, "[word]").slice(0, max);
}
async function askToolGate(candidate, state, opts = {}) {
  const t0 = performance.now();
  const url = opts.url ?? TOOLGATE_URL_DEFAULT;
  const mk = (choice, confidence, probabilities, judge, degraded) => ({
    choice,
    confidence,
    probabilities,
    judge,
    ms: Math.round(performance.now() - t0),
    degraded
  });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state: "[the candidate kind: " + sanitizeForJudge(candidate.kind, 40) + `]
` + scrubSecrets(state),
        questions: { gate: { type: "choice", instructions: candidate.instructions, criteria: candidate.criteria } }
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 4000)
    });
    if (!res.ok) {
      throw new JevError("GI_TOOLGATE_HTTP", `${res.status} ${(await res.text().catch(() => "")).slice(0, 160)}`, res.status);
    }
    const json = await res.json();
    const a = json.answers?.["gate"];
    if (a == null || typeof a !== "object" || typeof a.choice !== "string") {
      throw new JevError("GI_TOOLGATE_BAD_RESPONSE", "the judge returned no gate choice", 200);
    }
    const probs = a.probabilities && typeof a.probabilities === "object" ? a.probabilities : {};
    if (a.choice !== "serve" && a.choice !== "refuse") {
      throw new JevError("GI_TOOLGATE_BAD_CHOICE", `the judge returned an unknown choice ${JSON.stringify(a.choice).slice(0, 40)} \u2014 expected serve|refuse`, 200);
    }
    const choice = a.choice;
    const rawConf = typeof a.confidence === "number" ? a.confidence : probs[choice] ?? 0;
    if (!Number.isFinite(rawConf) || rawConf <= 0 || rawConf > 1) {
      throw new JevError("GI_TOOLGATE_BAD_CONFIDENCE", `non-finite or out-of-range confidence ${String(rawConf)}`, 200);
    }
    return mk(choice, rawConf, probs, json.model ?? "jevk5-4b-v0.2-Q8_0", false);
  } catch (e) {
    return mk("refuse", 0, {}, `unavailable:${e instanceof Error ? e.name : "ERR"}`, true);
  }
}
function enforceGate(candidate, v) {
  if (candidate.kind === "NONE")
    return { action: "serve", reason: "detector: NONE", remedy: null };
  if (v.degraded) {
    if (candidate.severity === "security") {
      return {
        action: "refuse",
        reason: `security gate: judge unavailable (${v.judge}) \u2014 fail-CLOSED`,
        remedy: "the judge at :8090 is required for the security surface; start it (see hard-deps) and re-run"
      };
    }
    return { action: "serve", reason: `info gate: judge unavailable (${v.judge}) \u2014 fail-OPEN, named`, remedy: null };
  }
  const tau = GATE_THRESHOLD[candidate.severity];
  if (v.choice === "refuse" && v.confidence >= tau) {
    return {
      action: "refuse",
      reason: `${candidate.kind}: judge ${v.choice} p=${v.confidence.toFixed(3)} >= ${tau}`,
      remedy: candidate.kind === "READ_VERB_HIJACK" ? "if this is a legitimate read/filter, keep the read verb free of a write-redirect or an interpreter pipe; run the write step separately" : "if this is ordinary usage, remove the obfuscation/wrapper; a plain command is never judged a candidate"
    };
  }
  if (v.choice === "serve") {
    return { action: "serve", reason: `${candidate.kind}: judge serve p=${v.confidence.toFixed(3)} \u2014 the judge cleared it`, remedy: null };
  }
  return { action: "serve", reason: `${candidate.kind}: judge refuse p=${v.confidence.toFixed(3)} < ${tau} \u2014 below the bar, a low-confidence candidate never blocks`, remedy: null };
}
function gateLedgerPath() {
  return process.env.GATE_LEDGER ?? `${os4.homedir()}/.omp/run/gate-ledger.jsonl`;
}
function recordGateDecision(candidate, v, extra = {}) {
  try {
    const row = {
      ts: new Date().toISOString(),
      Pattern: candidate.kind,
      signals: candidate.signals.map((x) => scrubSecrets(String(x))),
      severity: candidate.severity,
      State: { command: (extra.command ?? "").slice(0, 300), sessionId: extra.sessionId ?? null, tool: extra.tool ?? null },
      Evidence: { judge: v.judge, choice: v.choice, confidence: v.confidence, probabilities: v.probabilities, ms: v.ms, degraded: v.degraded },
      enforced: extra.enforced ?? null,
      remedy: extra.remedy ?? null
    };
    const p = gateLedgerPath();
    const idx = p.lastIndexOf("/");
    const dir = idx > 0 ? p.slice(0, idx) : "";
    if (dir)
      fs7.mkdirSync(dir, { recursive: true });
    fs7.appendFileSync(p, JSON.stringify(row) + `
`);
    return true;
  } catch (e) {
    console.error(`GI_TOOLGATE_LEDGER_IO: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

// src/omp/gate-hook.ts
function str(v) {
  return typeof v === "string" ? v : "";
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function filePathOf(input) {
  return str(input.file_path) || str(input.filePath) || str(input.path);
}
function reconstruct(toolName, input) {
  const file = filePathOf(input) || str(input.path);
  const patch = str(input.input) || str(input.old_string) || str(input.oldString);
  if (toolName === "write" || toolName === "write_file") {
    const newText = str(input.content) || str(input.input);
    let oldText = "";
    if (file && fs8.existsSync(file)) {
      try {
        oldText = fs8.readFileSync(file, "utf8");
      } catch {
        oldText = "";
      }
    }
    return { oldText, newText, file };
  }
  const oldString = str(input.old_string) || str(input.oldString);
  const newString = str(input.new_string) || str(input.newString);
  let oldText = oldString;
  if (file && fs8.existsSync(file)) {
    try {
      oldText = fs8.readFileSync(file, "utf8");
    } catch {
      oldText = oldString;
    }
  }
  if (oldString && newString) {
    return { oldText, newText: oldText.replace(oldString, newString), file };
  }
  const dsl = str(input.input);
  let newText = oldText;
  if (dsl && oldText) {
    const names = oldText.match(/export\s+(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)/g) ?? [];
    newText = oldText;
    for (const full of names) {
      const n = full.replace(/export\s+(?:async\s+)?function\s+/, "");
      const stripped = new RegExp(String.raw`function\s+` + escapeRegExp(n));
      if (stripped.test(dsl) && !new RegExp(String.raw`export\s+(?:async\s+)?function\s+` + escapeRegExp(n)).test(dsl)) {
        newText = newText.replace(new RegExp(String.raw`export\s+(async\s+)?function\s+` + escapeRegExp(n)), "function " + n);
      }
    }
  }
  return { oldText, newText, file };
}
function attachGiGraphGate(pi) {
  const PENDING_STEER_TTL_MS = 120000;
  const PENDING_STEER_MAX_PER_SID = 10;
  const pendingSteer = new Map;
  const sweepStaleSteer = (now) => {
    for (const [sid, q] of pendingSteer) {
      const live = q.filter((e) => now - (e.enqueuedAt ?? 0) <= PENDING_STEER_TTL_MS);
      if (live.length === 0)
        pendingSteer.delete(sid);
      else if (live.length !== q.length)
        pendingSteer.set(sid, live);
    }
  };
  pi.on("tool_call", async (event) => {
    const name = String(event.toolName ?? "").toLowerCase();
    const input = event.input && typeof event.input === "object" ? event.input : {};
    if (process.env.GI_GATE_DEBUG === "1") {
      try {
        fs8.appendFileSync("/tmp/gi-gate.log", JSON.stringify({
          name,
          keys: Object.keys(input),
          dial: process.env.GI_DIAL ?? "",
          origin: event.isAgentOrigin
        }) + `
`);
      } catch {}
    }
    if (name !== "write" && name !== "write_file" && name !== "edit" && name !== "patch") {
      return;
    }
    if (event.isAgentOrigin === false)
      return;
    const dial = resolveDial(process.env);
    const rec = reconstruct(name, input);
    try {
      const judged = judgeDiff(rec.newText ?? "");
      try {
        const maxP = Object.values(judged.scores).reduce((a, b) => Math.max(a, b), 0);
        const cand = {
          kind: "ABIDE_JUDGE",
          signals: [
            rec.file ?? "?",
            `verdict=${judged.verdict}`,
            Object.entries(judged.scores).map(([k, v]) => `${k}=${v.toFixed(3)}`).join(" ")
          ].filter(Boolean),
          severity: "info",
          instructions: "the ABIDE live judge over the edit diff",
          criteria: { serve: "no rule violated", refuse: "a rule at the act band (>=0.8)" }
        };
        recordGateDecision(cand, {
          judge: judged.judge,
          choice: judged.verdict === "REPAIR" ? "refuse" : "serve",
          confidence: maxP,
          probabilities: judged.scores,
          ms: 0,
          degraded: !judged.ok
        }, {
          tool: name,
          command: rec.file ?? "",
          sessionId: resolveSessionIdFromEvent(event).id,
          enforced: judged.verdict === "REPAIR" ? "refused" : "served",
          remedy: judged.repair ?? null
        });
      } catch {}
      if (judged.ok && judged.verdict === "REPAIR" && judged.repair) {
        const jSid = resolveSessionIdFromEvent(event).id;
        sweepStaleSteer(Date.now());
        const q = pendingSteer.get(jSid) ?? [];
        q.push({ tool: name, note: `[ABIDE] ${judged.repair}`, enqueuedAt: Date.now(), file: rec.file });
        while (q.length > PENDING_STEER_MAX_PER_SID)
          q.shift();
        pendingSteer.set(jSid, q);
      }
    } catch {}
    const verdict = runGraphGate({
      dial,
      oldText: rec.oldText,
      newText: rec.newText,
      file: rec.file,
      hasStore: true
    });
    if (process.env.GI_GATE_DEBUG === "1") {
      try {
        fs8.appendFileSync("/tmp/gi-gate.log", JSON.stringify({ recFile: rec.file, dial, verdict }) + `
`);
      } catch {}
    }
    const steerSid = resolveSessionIdFromEvent(event).id;
    if (verdict.cancel && verdict.token) {
      try {
        const cand = graphBreakCandidate(rec.file, verdict.advisory ?? "");
        const jv = await askToolGate(cand, `file=${rec.file}
the gate flagged: ${verdict.token}
${verdict.advisory ?? ""}
-- the OLD text --
${(rec.oldText ?? "").slice(0, 900)}
-- the NEW text --
${(rec.newText ?? "").slice(0, 900)}`);
        const ef = enforceGate(cand, jv);
        recordGateDecision(cand, jv, {
          tool: name,
          command: rec.file,
          sessionId: steerSid,
          enforced: ef.action === "refuse" ? "refused" : "served",
          remedy: ef.remedy
        });
        if (ef.action === "serve") {
          return;
        }
      } catch {}
      const stale = pendingSteer.get(steerSid);
      if (stale) {
        const rest = stale.filter((e) => !(e.tool === name && e.file === rec.file));
        if (rest.length > 0)
          pendingSteer.set(steerSid, rest);
        else
          pendingSteer.delete(steerSid);
      }
      throw new Error(`${verdict.token}: ${verdict.advisory ?? rec.file}`);
    }
    if (verdict.token === "[GATE STEER]") {
      sweepStaleSteer(Date.now());
      const queue = pendingSteer.get(steerSid) ?? [];
      queue.push({ tool: name, note: `[GATE STEER] ${verdict.advisory ?? ""}`.trim(), enqueuedAt: Date.now(), file: rec.file });
      while (queue.length > PENDING_STEER_MAX_PER_SID)
        queue.shift();
      pendingSteer.set(steerSid, queue);
    }
    return;
  });
  pi.on("tool_result", (event) => {
    const name = String(event.toolName ?? "").toLowerCase();
    if (name !== "write" && name !== "write_file" && name !== "edit" && name !== "patch") {
      return;
    }
    const sid = resolveSessionIdFromEvent(event).id;
    const queue = pendingSteer.get(sid);
    if (!queue || queue.length === 0)
      return;
    const inRec = event.input && typeof event.input === "object" ? event.input : {};
    const resFile = str(inRec.file_path) || str(inRec.filePath) || str(inRec.path) || str(inRec.file);
    let qi = resFile ? queue.findIndex((e) => e.tool === name && e.file === resFile) : -1;
    if (qi === -1)
      qi = queue.findIndex((e) => e.tool === name);
    if (qi === -1)
      return;
    const note = queue.splice(qi, 1)[0].note;
    if (queue.length === 0)
      pendingSteer.delete(sid);
    const extra = { type: "text", text: note };
    const prev = Array.isArray(event.content) ? event.content : [];
    return { content: [extra, ...prev], details: { ...typeof event.details === "object" && event.details ? event.details : {}, giSteer: note } };
  });
}
function registerGraphGate(pi) {
  attachGiGraphGate(pi);
  const states = new Map;
  const STATE_IDLE_TTL_MS = 600000;
  const STATE_MAX_ENTRIES = 1000;
  const stateSeen = new Map;
  const sweepIdleStates = (now) => {
    for (const [sid] of states) {
      const seen = stateSeen.get(sid) ?? now;
      if (now - seen > STATE_IDLE_TTL_MS) {
        states.delete(sid);
        stateSeen.delete(sid);
      }
    }
    while (states.size > STATE_MAX_ENTRIES) {
      let oldest = null;
      let oldestSeen = Infinity;
      for (const [sid] of states) {
        const s = stateSeen.get(sid) ?? Infinity;
        if (s < oldestSeen) {
          oldestSeen = s;
          oldest = sid;
        }
      }
      if (oldest === null)
        break;
      states.delete(oldest);
      stateSeen.delete(oldest);
    }
  };
  const PENDING_QUERY_TTL_MS = 120000;
  const PENDING_QUERY_MAX_PER_SID = 10;
  const pendingQueries = new Map;
  const sweepStaleQueries = (now) => {
    for (const [sid, q] of pendingQueries) {
      const live = q.filter((e) => now - e.enqueuedAt <= PENDING_QUERY_TTL_MS);
      if (live.length === 0)
        pendingQueries.delete(sid);
      else if (live.length !== q.length)
        pendingQueries.set(sid, live);
    }
  };
  pi.on("tool_call", async (event) => {
    const name = String(event.toolName ?? "").toLowerCase();
    const isEdit = name === "write" || name === "write_file" || name === "edit" || name === "patch";
    const isQuery = name === "graph-query" || name === "ripwire" || String(event.toolName ?? "") === "graph-query";
    const sid = resolveSessionIdFromEvent(event).id;
    sweepIdleStates(Date.now());
    let st = states.get(sid);
    if (!st) {
      st = createEmptyState();
      states.set(sid, st);
    }
    stateSeen.set(sid, Date.now());
    if (isQuery) {
      sweepStaleQueries(Date.now());
      const target = fieldStr(eventInput(event), "target") || fieldStr(eventInput(event), "symbol");
      if (target) {
        const queue = pendingQueries.get(sid) ?? [];
        queue.push({ target, tool: name, enqueuedAt: Date.now() });
        while (queue.length > PENDING_QUERY_MAX_PER_SID)
          queue.shift();
        pendingQueries.set(sid, queue);
      }
      return;
    }
    if (!isEdit)
      return;
    const rec = reconstruct(name, eventInput(event));
    const c = classifyEdit(name, { file: rec.file, oldString: rec.oldText, newString: rec.newText });
    recordEdit(c, st);
    const d = computeDrift(st);
    const g = gateDecision(d, st);
    if (g.tier === "T3") {
      states.delete(sid);
      stateSeen.delete(sid);
      throw new Error(`${g.blockReason ?? "GRAPH_GATE_ABORT"} (rule: graph-before-structural-edit)`);
    }
    if (g.tier === "T2") {
      throw new Error(g.blockReason ?? "GRAPH_GATE_DRIFT_HIGH");
    }
    return;
  });
  pi.on("tool_result", (event) => {
    const name = String(event.toolName ?? "").toLowerCase();
    if (name !== "graph-query" && name !== "ripwire")
      return;
    const sid = resolveSessionIdFromEvent(event).id;
    const queue = pendingQueries.get(sid);
    if (!queue || queue.length === 0)
      return;
    const qi = queue.findIndex((e) => e.tool === name);
    if (qi === -1)
      return;
    const q = queue.splice(qi, 1)[0];
    if (queue.length === 0)
      pendingQueries.delete(sid);
    const st = states.get(sid);
    if (!st)
      return;
    const details = typeof event.details === "object" && event.details !== null ? event.details : {};
    const errored = event.isError === true || typeof event.error === "string" && event.error.length > 0 || details.ok === false || typeof details.error === "string" && details.error.length > 0;
    const content = Array.isArray(event.content) ? event.content : [];
    const text = content.map((c) => typeof c === "object" && c !== null && ("text" in c) ? String(c.text) : "").join(`
`);
    const structuredRows = (() => {
      const d = typeof event.details === "object" && event.details !== null ? event.details : {};
      for (const v of [d.rowCount, d.rows, d.count, d.row_count]) {
        if (typeof v === "number" && Number.isFinite(v))
          return v;
      }
      for (const c of content) {
        if (typeof c === "object" && c !== null && !("text" in c)) {
          const r = c;
          for (const v of [r.rowCount, r.rows, r.count]) {
            if (typeof v === "number" && Number.isFinite(v))
              return v;
          }
        }
      }
      return null;
    })();
    const hasRows = structuredRows !== null ? structuredRows > 0 : /rows?\s*[:=]\s*[1-9]/.test(text) || /"count":\s*[1-9]/.test(text) || /(?:^|\n)\s*(?:src|lib|tests|packages)\/[^\s]+:\d+/.test(text) || /<callers>|<defs>|<impact>|<rows>/i.test(text) || /"(?:callers|defs|impact|results|matches)":\s*\[\s*\{/.test(text) || /^\s*(?:src|lib|tests|packages)\/[^\s]+\s*:\s*\d+/m.test(text);
    const noRows = structuredRows !== null ? structuredRows === 0 : /rows?\s*[:=]\s*0\b/.test(text) || /"count":\s*0\b/.test(text) || /"(?:callers|defs|impact|results|matches)":\s*\[\s*\]/.test(text) || /NO NODE|not found|0 (?:rows|matches|results)/i.test(text);
    const resolved = !errored && hasRows;
    recordGraphQuery({ tool: q.tool, target: q.target, resolved, rows: hasRows ? 1 : 0 }, st);
    if (!pendingQueries.has(sid)) {
      states.delete(sid);
      stateSeen.delete(sid);
    }
    return;
  });
}
function eventInput(event) {
  const input = event.input;
  return typeof input === "object" && input !== null ? input : {};
}
function fieldStr(record, key) {
  if (!(key in record))
    return "";
  const value = record[key];
  return typeof value === "string" ? value : "";
}

// src/omp/claim-firewall.ts
var CLAIM_FIREWALL_REMEDY = "bind every done-shaped claim atom to a THIS-TURN tool-result span " + "(run the tests/build in this turn and quote the tool output) \u2014 " + "an unbound completion claim is REJECTED fail-closed";
var ATOM_PATTERNS = [
  { kind: "count", re: /\b\d+\s*\/\s*\d+\s*(?:tests?|pass\w*|green)?\b/i },
  { kind: "count", re: /\b\d+\s+tests?\s+(?:pass\w*|green|ok)\b/i },
  { kind: "count", re: /\ball\s+\d+\s+tests?\s+pass\w*\b/i },
  { kind: "state", re: /\btests?\s+pass\w*\b/i },
  { kind: "state", re: /\bverified\b/i },
  { kind: "state", re: /\b(?:tests?|suite|build|battery)\s+green\b/i },
  { kind: "state", re: /\bgreen\s+(?:suite|build|tests?|battery)\b/i },
  { kind: "completion", re: /\bdone\b/i },
  { kind: "completion", re: /\bshipped\b/i },
  { kind: "completion", re: /\bcomplet(?:e[sd]?|ion)\b/i },
  { kind: "path", re: /\b(?:report|artifact|ledger)\s+(?:written|landed|at|to)\s+\S+/i }
];
function detectClaimAtoms(text) {
  const found = [];
  if (typeof text !== "string" || text.length === 0)
    return found;
  for (const p of ATOM_PATTERNS) {
    const flags = p.re.flags.includes("g") ? p.re.flags : p.re.flags + "g";
    const g = new RegExp(p.re.source, flags);
    let m;
    while ((m = g.exec(text)) !== null) {
      if (m[0].length === 0) {
        g.lastIndex += 1;
        continue;
      }
      const start = m.index;
      found.push({ text: m[0], kind: p.kind, charRange: [start, start + m[0].length] });
    }
  }
  found.sort((a, b) => a.charRange[0] - b.charRange[0]);
  const atoms = [];
  let lastEnd = -1;
  for (const a of found) {
    if (a.charRange[0] < lastEnd)
      continue;
    atoms.push(a);
    lastEnd = a.charRange[1];
  }
  return atoms;
}
var STOPWORDS = new Set([
  "that",
  "this",
  "with",
  "have",
  "from",
  "they",
  "will",
  "would",
  "there",
  "their",
  "what",
  "about",
  "which",
  "when",
  "your",
  "were",
  "been",
  "for"
]);
function contentTokens(s) {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}
function digitTokens(s) {
  return s.match(/\d+/g) ?? [];
}
var ATOM_POSITIVE = /\b(?:pass\w*|green|ok|okay|verified|done|complete\w*|shipped)\b/i;
var LOCAL_PASS = /\b(?:pass(?:ed|es|ing)?|green|ok|okay)\b/i;
var LOCAL_FAIL = /\b(?:fail(?:ed|s|ing)?|error(?:s|ed)?|broken)\b/i;
function localVerdict(span, num) {
  const m = new RegExp(`\\b${num}\\b`).exec(span);
  if (m === null)
    return "absent";
  const after = span.slice(m.index + m[0].length, m.index + m[0].length + 40);
  const p = LOCAL_PASS.exec(after);
  const f = LOCAL_FAIL.exec(after);
  if (p !== null && (f === null || p.index <= f.index))
    return "pass";
  if (f !== null)
    return "fail";
  return "unknown";
}
function bindClaimAtoms(atoms, turnToolResults) {
  const spans = (turnToolResults ?? []).filter((s) => typeof s === "string" && s.trim().length > 0);
  return atoms.map((atom) => {
    const nums = digitTokens(atom.text);
    const hit = spans.find((span) => {
      if (nums.length > 0) {
        const allPresent = nums.every((n) => new RegExp(`\\b${n}\\b`).test(span));
        if (!allPresent)
          return false;
        if (ATOM_POSITIVE.test(atom.text)) {
          const verdicts = nums.map((n) => localVerdict(span, n));
          if (verdicts.some((v) => v === "fail"))
            return false;
          if (verdicts.some((v) => v === "pass"))
            return true;
        }
        return true;
      }
      const low = span.toLowerCase();
      const toks = contentTokens(atom.text);
      return toks.length === 0 ? false : toks.every((t) => low.includes(t));
    });
    if (hit === undefined) {
      return {
        atom,
        span: null,
        verdict: "FABRICATED",
        evidence: `no THIS-TURN tool-result span binds atom "${atom.text}" ` + `(kind=${atom.kind}) \u2014 the span IS the proof`
      };
    }
    return {
      atom,
      span: hit,
      verdict: "SUPPORTED",
      evidence: hit.slice(0, 200)
    };
  });
}
function adjudicateClaim(claim, opts) {
  const text = typeof claim.text === "string" ? claim.text : "";
  const atoms = detectClaimAtoms(text);
  if (atoms.length === 0) {
    return {
      verdict: "SUPPORTED",
      action: "PASS",
      reasons: ["no done-shaped claim atoms \u2014 nothing to bind"],
      bindings: []
    };
  }
  const bindings = bindClaimAtoms(atoms, claim.turnToolResults ?? []);
  const reasons = [];
  let fabricated = false;
  for (const b of bindings) {
    if (b.verdict === "FABRICATED") {
      fabricated = true;
      reasons.push(`FABRICATED: atom "${b.atom.text}" (kind=${b.atom.kind}) has NO bound THIS-TURN tool-result span`);
      continue;
    }
    if (opts?.judge !== undefined && b.span !== null) {
      let j;
      try {
        j = opts.judge(b.atom, b.span);
      } catch (e) {
        fabricated = true;
        b.verdict = "UNCERTIFIABLE";
        b.evidence = `the judge failed on atom "${b.atom.text}" (fail-closed): ${e instanceof Error ? e.message : String(e)}`;
        reasons.push(`FABRICATED (fail-closed): the judge failed on atom "${b.atom.text}"`);
        continue;
      }
      if (j === "contradicts") {
        fabricated = true;
        b.verdict = "CONTRADICTED";
        b.evidence = `the judge contradicts atom "${b.atom.text}" on its bound span`;
        reasons.push(`FABRICATED: the judge contradicts atom "${b.atom.text}"`);
        continue;
      }
    }
    reasons.push(`SUPPORTED: atom "${b.atom.text}" bound to a THIS-TURN tool-result span`);
  }
  if (fabricated) {
    return { verdict: "FABRICATED", action: "REJECT", reasons, bindings };
  }
  return { verdict: "SUPPORTED", action: "PASS", reasons, bindings };
}
var TURN_END_SURFACES = ["stop", "turn_end", "turn-end", "session_stop", "session_end"];
function sidOf(event) {
  const direct = event["sessionId"] ?? event["sessionID"];
  if (typeof direct === "string" && direct.length > 0)
    return direct;
  return "turn-default";
}
function resultTextOf(event) {
  const parts = [];
  const c = event["content"];
  if (Array.isArray(c)) {
    for (const b of c) {
      if (typeof b === "string")
        parts.push(b);
      else if (b !== null && typeof b === "object" && "text" in b) {
        parts.push(String(b.text));
      }
    }
  }
  for (const k of ["text", "output"]) {
    const v = event[k];
    if (typeof v === "string" && v.length > 0)
      parts.push(v);
  }
  const d = event["details"];
  if (d !== null && typeof d === "object") {
    try {
      parts.push(JSON.stringify(d));
    } catch {}
  }
  return parts.join(`
`);
}
function closingTextOf(event) {
  for (const k of ["closingText", "text", "message", "lastMessage"]) {
    const v = event[k];
    if (typeof v === "string" && v.trim().length > 0)
      return v;
  }
  const c = event["content"];
  if (typeof c === "string" && c.trim().length > 0)
    return c;
  if (Array.isArray(c)) {
    const t = c.map((b) => typeof b === "string" ? b : b !== null && typeof b === "object" && ("text" in b) ? String(b.text) : "").join(`
`).trim();
    if (t.length > 0)
      return t;
  }
  return "";
}
function attachClaimFirewall(pi) {
  const turnSpans = new Map;
  pi.on("tool_result", (event) => {
    try {
      const t = resultTextOf(event);
      if (t.trim().length > 0) {
        const sid = sidOf(event);
        const q = turnSpans.get(sid) ?? [];
        q.push(t.slice(0, 4000));
        while (q.length > 50)
          q.shift();
        turnSpans.set(sid, q);
      }
    } catch {}
    return;
  });
  const onTurnEnd = (event) => {
    const closing = closingTextOf(event);
    if (closing.trim().length === 0)
      return;
    const sid = sidOf(event);
    const spans = turnSpans.get(sid) ?? [];
    const r = adjudicateClaim({ text: closing, turnToolResults: spans });
    turnSpans.delete(sid);
    if (r.verdict === "FABRICATED") {
      throw new Error(`GI_FABRICATED_CLAIM: the turn's completion claim is UNBOUND ` + `(${r.reasons.join(" | ").slice(0, 400)}). ${CLAIM_FIREWALL_REMEDY}`);
    }
    return;
  };
  for (const surf of TURN_END_SURFACES) {
    try {
      pi.on(surf, onTurnEnd);
    } catch {}
  }
}

// src/omp/card-hud.ts
import fs10 from "fs";
import path10 from "path";
import { Database as Database3 } from "bun:sqlite";

// src/gi-lsp/cards.ts
import fs9 from "fs";
import path9 from "path";
function meta(db, key) {
  try {
    const row = db.query("SELECT value FROM gi_meta WHERE key = ?").get(key);
    return row?.value ?? null;
  } catch {
    return null;
  }
}
function declarationsIn(src) {
  const out = [];
  const seen = new Set;
  const rx = /^[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:abstract\s+)?(?:function\s*\*?|const|let|var|class|interface|type|enum)[ \t]+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = rx.exec(src)) !== null) {
    const name = m[1];
    if (seen.has(name))
      continue;
    seen.add(name);
    const line = src.slice(0, m.index).split(`
`).length;
    out.push({ name, line });
  }
  return out;
}
function isCodeFile(relFile) {
  return /\.(ts|tsx|js|jsx|mjs|cjs|py)$/.test(relFile);
}
function callersCard(db, symbol) {
  let q;
  try {
    q = whoCallsInDb(db, symbol);
  } catch {
    return null;
  }
  if (q.callers.length === 0)
    return null;
  const shown = q.callers.slice(0, 12);
  const rows = shown.map((c) => `${c.caller} (${c.file || "?"}:${c.line})`);
  return {
    shape: "CALLERS",
    title: `${symbol} \u2014 ${q.callers.length} caller${q.callers.length === 1 ? "" : "s"}`,
    rows,
    severity: 3,
    source: "gi-lsp/callers",
    total: q.callers.length
  };
}
function unwiredCard(db, symbol) {
  let q;
  try {
    q = whoCallsInDb(db, symbol);
  } catch {
    return null;
  }
  if (q.callers.length !== 0)
    return null;
  return {
    shape: "UNWIRED",
    title: `${symbol} \u2014 0 callers`,
    rows: [`no inbound edges in the graph store`],
    severity: 2,
    source: "gi-lsp/unwired",
    total: 0
  };
}
function scopeCard(db, projectRoot) {
  const stored = meta(db, "build_root");
  if (!stored)
    return null;
  let a;
  try {
    a = fs9.realpathSync(projectRoot);
  } catch {
    a = path9.resolve(projectRoot);
  }
  let b;
  try {
    b = fs9.existsSync(stored) ? fs9.realpathSync(stored) : stored;
  } catch {
    b = stored;
  }
  if (a === b)
    return null;
  return {
    shape: "SCOPE",
    title: "GI store scope mismatch",
    rows: [`store build_root: ${b}`, `this file's root: ${a}`],
    severity: 1,
    source: "gi-lsp/scope",
    total: -1
  };
}
function meaningValue(v) {
  if (typeof v !== "object" || v === null)
    return null;
  const rec = v;
  const confidence = typeof rec["confidence"] === "number" ? rec["confidence"] : NaN;
  const noul = typeof rec["noul"] === "number" ? rec["noul"] : confidence;
  if (!Number.isFinite(confidence) || !Number.isFinite(noul))
    return null;
  const meaning = typeof rec["meaning"] === "string" ? rec["meaning"] : noul >= 0.5 ? "match" : "drift";
  const model = typeof rec["model"] === "string" ? rec["model"] : "unreported-model";
  return { meaning, confidence, noul, model };
}
function meaningCard(db, symbol, judge) {
  let facts;
  try {
    facts = judge(symbol);
  } catch {
    return null;
  }
  if (!Array.isArray(facts) || facts.length === 0)
    return null;
  const fact = facts[0];
  const v = meaningValue(fact.value);
  if (v === null)
    return null;
  const storeRoot = meta(db, "build_root");
  const conf = v.confidence.toFixed(3);
  return {
    shape: "MEANING",
    title: `${symbol} \u2014 meaning ${v.meaning} (confidence ${conf})`,
    rows: [
      `confidence ${conf} \xB7 noul ${v.noul.toFixed(3)} \xB7 ${v.meaning}`,
      `judge ${v.model}`,
      `store ${storeRoot ?? "(unprovenanced)"}`,
      `evidence ${fact.source}`
    ],
    severity: 3,
    source: "gi-lsp/meaning",
    total: -1
  };
}
function fileCards(opts) {
  const { db, projectRoot, relFile, src, judge } = opts;
  const maxCards = opts.maxCards ?? 20;
  if (!isCodeFile(relFile))
    return [];
  const cards = [];
  const scope = scopeCard(db, projectRoot);
  if (scope)
    cards.push(scope);
  const decls = declarationsIn(src);
  if (judge !== undefined) {
    for (const d of decls.slice(0, 1)) {
      const m = meaningCard(db, d.name, judge);
      if (m) {
        cards.push(m);
        break;
      }
    }
  }
  for (const d of decls) {
    const c = callersCard(db, d.name);
    if (c)
      cards.push(c);
    else {
      const u = unwiredCard(db, d.name);
      if (u)
        cards.push(u);
    }
    if (cards.length >= maxCards)
      break;
  }
  return cards;
}
function shownTotal(cards) {
  const total = cards.reduce((s, c) => s + (c.total > 0 ? c.total : 0), 0);
  const shown = cards.reduce((s, c) => s + (c.total > 0 ? Math.min(c.rows.length, c.total) : 0), 0);
  return `shown=${shown} total=${total}`;
}
function relTo(root, abs) {
  const r = root.endsWith(path9.sep) ? root : root + path9.sep;
  return abs.startsWith(r) ? abs.slice(r.length) : path9.basename(abs);
}

// src/omp/card-hud.ts
var STORE_RELS = [
  ".omp/graph-intelligence/corbell-checkout/store.sqlite",
  ".omp/graph-intelligence/graphify-checkout/store.sqlite",
  ".omp/graph-intelligence/structural/store.sqlite"
];
function resolveStorePath(projectRoot) {
  for (const rel of STORE_RELS) {
    const p = path10.join(projectRoot, rel);
    if (!fs10.existsSync(p))
      continue;
    try {
      const db = new Database3(p, { readonly: true });
      const n = db.query("SELECT COUNT(*) AS n FROM typed_nodes WHERE superseded_run IS NULL").get()?.n ?? 0;
      db.close();
      if (n > 0)
        return p;
    } catch {}
  }
  return null;
}
function formatHud(cards) {
  const head = `[GI CARD-HUD] ${cards.length} card(s) for this file's symbols (${shownTotal(cards)})`;
  const body = cards.map((c) => `  \xB7 ${c.title}
${c.rows.slice(0, 4).map((r) => `      ${r}`).join(`
`)}`).join(`
`);
  return `${head}
${body}`;
}
var PENDING_MAX_PER_SID = 8;
var PENDING_TTL_MS = 5 * 60 * 1000;
var CODE_TOOLS = new Set(["write", "write_file", "edit", "patch"]);
function fileOf(input) {
  for (const k of ["file_path", "filePath", "path", "file"]) {
    const v = input[k];
    if (typeof v === "string" && v.length > 0)
      return v;
  }
  return "";
}
function cwdOf(event) {
  for (const k of ["cwd", "workspaceRoot", "root"]) {
    const v = event[k];
    if (typeof v === "string" && v.length > 0)
      return v;
  }
  return process.cwd();
}
function attachCardHud(pi) {
  const pending = new Map;
  pi.on("tool_call", (event) => {
    const name = String(event.toolName ?? "").toLowerCase();
    if (!CODE_TOOLS.has(name))
      return;
    if (event.isAgentOrigin === false)
      return;
    const input = event.input && typeof event.input === "object" ? event.input : {};
    const file = fileOf(input);
    if (file.length === 0)
      return;
    try {
      const projectRoot = cwdOf(event);
      const storePath = resolveStorePath(projectRoot);
      if (storePath === null)
        return;
      const relFile = relTo(projectRoot, path10.isAbsolute(file) ? file : path10.join(projectRoot, file));
      const src = fs10.readFileSync(path10.isAbsolute(file) ? file : path10.join(projectRoot, file), "utf8");
      const db = new Database3(storePath, { readonly: true });
      let cards = [];
      try {
        const judge = jevk5Probe(projectRoot).facts;
        cards = fileCards({ db, projectRoot, relFile, src, judge });
      } finally {
        db.close();
      }
      if (cards.length === 0)
        return;
      const sid = String(event.sessionID ?? event.sessionId ?? "default");
      const now = Date.now();
      const q = (pending.get(sid) ?? []).filter((e) => now - e.enqueuedAt <= PENDING_TTL_MS);
      q.push({ tool: name, note: formatHud(cards), file: relFile, enqueuedAt: now });
      while (q.length > PENDING_MAX_PER_SID)
        q.shift();
      pending.set(sid, q);
    } catch {}
    return;
  });
  pi.on("tool_result", (event) => {
    const name = String(event.toolName ?? "").toLowerCase();
    if (!CODE_TOOLS.has(name))
      return;
    const sid = String(event.sessionID ?? event.sessionId ?? "default");
    const q = pending.get(sid);
    if (!q || q.length === 0)
      return;
    const input = event.input && typeof event.input === "object" ? event.input : {};
    const resFile = fileOf(input);
    let qi = resFile ? q.findIndex((e) => e.tool === name && e.file.endsWith(resFile)) : -1;
    if (qi === -1)
      qi = q.findIndex((e) => e.tool === name);
    if (qi === -1)
      return;
    const card = q.splice(qi, 1)[0];
    if (q.length === 0)
      pending.delete(sid);
    return { content: [{ type: "text", text: card.note }], prepend: true };
  });
}

// src/omp/populate.ts
import * as path17 from "path";

// src/omp/populate-corbell.ts
import * as fs16 from "fs";
import * as path16 from "path";
import { Database as Database4 } from "bun:sqlite";

// src/omp/populate-graphify.ts
import { createHash as createHash3 } from "crypto";
import * as fs15 from "fs";
import * as path15 from "path";

// src/hunter/graph/graphify-adapter.ts
import * as fs14 from "fs";
import * as path14 from "path";

// src/hunter/log.ts
function giLog(level, ns, msg) {
  console.error(`[${level} ${ns}] ${msg}`);
}

// src/hunter/graph/corbell-adapter.ts
import fs13 from "fs";
import path13 from "path";
import { execSync } from "child_process";
import { createRequire } from "module";

// src/hunter/profile/source-roots.ts
import fs12 from "fs";
import path12 from "path";

// src/hunter/profile/loader.ts
import fs11 from "fs";
import path11 from "path";

// src/hunter/profile/schema.ts
init_zod();
var PipelineStageSchema = object({
  id: string2().min(1),
  entry: string2().min(1),
  contract: string2().min(1)
});
var ProjectProfileSchema = object({
  profileVersion: number2().int().default(1),
  project: object({
    name: string2().min(1),
    root: string2().min(1),
    languages: array(string2()).min(1),
    entryPoints: array(string2()).min(1),
    build: string2().min(1),
    test: string2().min(1)
  }),
  graph: object({
    substrate: _enum(["corbell", "graphify"]),
    scope: array(string2()).min(1),
    excludes: array(string2()).default([]),
    rebuild: boolean2().optional(),
    graphifyOut: string2().min(1).optional()
  }),
  rules: object({
    corpus: array(string2()).min(1),
    bindings: record(string2(), any()).default({}).refine((b) => Object.keys(b).length <= 500, { message: "the bindings map is capped at 500 keys (abuse cap \u2014 split the profile)" })
  }),
  pipeline: object({
    stages: array(PipelineStageSchema).min(1).refine((s) => new Set(s.map((x) => x.id)).size === s.length, { message: "pipeline.stages[].id must be unique per profile" })
  }),
  history: object({
    failureLogs: array(string2()).default([])
  }),
  awareness: object({
    docs: array(string2()).default([])
  })
});

// src/hunter/profile/loader.ts
function profileInvalid(field, value, remedy) {
  return new Error(`PROFILE_INVALID: field=${field} value=${JSON.stringify(value)} remedy=${remedy}`);
}
function corpusMissing(profilePath) {
  return new Error(`CORPUS_MISSING: path=${profilePath} remedy=the corpus file must exist (fix the profile's rules.corpus)`);
}
function historyMissing(profilePath) {
  return new Error(`HISTORY_MISSING: path=${profilePath} remedy=the failure log must exist (fix the profile's history.failureLogs)`);
}

class YamlParseError extends Error {
  fieldPath;
  lineText;
  lineNo;
  constructor(fieldPath, lineText, lineNo, reason) {
    const near = lineText.trim() === "" ? "" : ` near "${lineText.trim()}"`;
    super(`yaml parse error at line ${lineNo}: ${reason}${near}`);
    this.name = "YamlParseError";
    this.fieldPath = fieldPath;
    this.lineText = lineText;
    this.lineNo = lineNo;
  }
}
function yamlErr(keyPath, text, lineNo, reason) {
  throw new YamlParseError(keyPath.join("."), text, lineNo, reason);
}
function stripComment(s) {
  let q = null;
  for (let i = 0;i < s.length; i++) {
    const c = s[i];
    if (q === null) {
      if (c === "'" || c === '"')
        q = c;
      else if (c === "#")
        return s.slice(0, i);
    } else if (q === "'") {
      if (c === "'") {
        if (s[i + 1] === "'")
          i++;
        else
          q = null;
      }
    } else {
      if (c === "\\")
        i++;
      else if (c === '"')
        q = null;
    }
  }
  return s;
}
function scanQuoteState(s, open) {
  let q = open;
  for (let i = 0;i < s.length; i++) {
    const c = s[i];
    if (q === null) {
      if (c === "'" || c === '"')
        q = c;
    } else if (q === "'") {
      if (c === "'") {
        if (s[i + 1] === "'")
          i++;
        else
          q = null;
      }
    } else {
      if (c === "\\")
        i++;
      else if (c === '"')
        q = null;
    }
  }
  return q;
}
function stripCommentWithState(s) {
  let q = null;
  let cut = s.length;
  for (let i = 0;i < s.length; i++) {
    const c = s[i];
    if (q === null) {
      if (c === "'" || c === '"')
        q = c;
      else if (c === "#") {
        cut = i;
        break;
      }
    } else if (q === "'") {
      if (c === "'") {
        if (s[i + 1] === "'")
          i++;
        else
          q = null;
      }
    } else {
      if (c === "\\")
        i++;
      else if (c === '"')
        q = null;
    }
  }
  return { text: s.slice(0, cut).trimEnd(), quoteOpen: q };
}
function preprocess(physical) {
  const out = [];
  let folding = null;
  let currentText = "";
  let currentIndent = 0;
  let currentLineNo = 0;
  for (let i = 0;i < physical.length; i++) {
    const raw = physical[i];
    if (folding !== null) {
      const stripped = raw.trimStart();
      currentText += " " + stripped;
      folding = scanQuoteState(stripped, folding);
      if (folding === null) {
        out.push({ indent: currentIndent, text: stripComment(currentText).trimEnd(), line: currentLineNo });
        currentText = "";
      }
      continue;
    }
    const trimmed = raw.trim();
    if (trimmed === "")
      continue;
    const leadingWs = raw.slice(0, raw.length - raw.trimStart().length);
    if (leadingWs.includes("\t"))
      yamlErr([], trimmed, i + 1, "tabs are not allowed in indentation (the subset is space-indented)");
    const indent = raw.length - raw.trimStart().length;
    const { text, quoteOpen } = stripCommentWithState(trimmed);
    if (text.trim() === "")
      continue;
    if (quoteOpen !== null) {
      folding = quoteOpen;
      currentText = text;
      currentIndent = indent;
      currentLineNo = i + 1;
    } else {
      out.push({ indent, text, line: i + 1 });
    }
  }
  if (folding !== null)
    yamlErr([], currentText, currentLineNo, "unterminated quoted string");
  return out;
}
function splitTopLevel(s, sep) {
  const parts = [];
  let cur = "";
  let depth = 0;
  let q = null;
  for (let i = 0;i < s.length; i++) {
    const c = s[i];
    if (q === null) {
      if (c === "'" || c === '"')
        q = c;
      else if (c === "{" || c === "[")
        depth++;
      else if (c === "}" || c === "]")
        depth--;
      else if (c === sep && depth === 0) {
        parts.push(cur);
        cur = "";
        continue;
      }
    } else if (q === "'") {
      if (c === "'") {
        if (s[i + 1] === "'")
          i++;
        else
          q = null;
      }
    } else {
      if (c === "\\" && i + 1 < s.length) {
        cur += c + s[i + 1];
        i++;
        continue;
      } else if (c === '"')
        q = null;
    }
    cur += c;
  }
  parts.push(cur);
  return parts;
}
function unescapeDouble(s) {
  return s.replace(/\\(.)/g, (_m, ch) => {
    switch (ch) {
      case "n":
        return `
`;
      case "t":
        return "\t";
      case "r":
        return "\r";
      case "0":
        return "\x00";
      case '"':
        return '"';
      case "\\":
        return "\\";
      case "'":
        return "'";
      default:
        return ch;
    }
  });
}
function parseScalar(t) {
  if (t === "")
    return null;
  const lower = t.toLowerCase();
  if (lower === "null" || t === "~")
    return null;
  if (lower === "true")
    return true;
  if (lower === "false")
    return false;
  if (/^-?\d+$/.test(t))
    return Number(t);
  if (/^-?\d+\.\d+$/.test(t))
    return Number(t);
  return t;
}
function parseQuoted(t, line) {
  if (t.startsWith("'")) {
    if (t.length < 2 || !t.endsWith("'"))
      yamlErr([], t, line, "unterminated single-quoted string");
    return t.slice(1, -1).replace(/''/g, "'");
  }
  if (t.startsWith('"')) {
    if (t.length < 2 || !t.endsWith('"'))
      yamlErr([], t, line, "unterminated double-quoted string");
    return unescapeDouble(t.slice(1, -1));
  }
  yamlErr([], t, line, `unexpected token: "${t}"`);
}
function parseFlowArray(inner, line, depth = 0) {
  if (depth > 100)
    yamlErr([], inner, line, "maximum flow-nesting depth (100) exceeded");
  const arr = [];
  if (inner.trim() === "")
    return arr;
  for (const part of splitTopLevel(inner, ",")) {
    const p = part.trim();
    if (p === "")
      continue;
    arr.push(parseFlowValue(p, line, depth));
  }
  return arr;
}
function parseFlowMap(inner, line, depth = 0) {
  if (depth > 100)
    yamlErr([], inner, line, "maximum flow-nesting depth (100) exceeded");
  const obj = {};
  if (inner.trim() === "")
    return obj;
  for (const part of splitTopLevel(inner, ",")) {
    const p = part.trim();
    if (p === "")
      continue;
    const ci = findTopLevelColon(p);
    if (ci < 0)
      yamlErr([], p, line, `flow map entry "${p}" must be "key: value"`);
    const k = p.slice(0, ci).trim();
    if (k === "" || /["'{}[\]\s]/.test(k))
      yamlErr([], p, line, `flow map key "${k}" is not a plain key`);
    const v = p.slice(ci + 1).trim();
    obj[k] = v === "" ? null : parseFlowValue(v, line, depth);
  }
  return obj;
}
function isKeyColon(s, ci, flow = false) {
  if (ci < 0 || ci >= s.length)
    return false;
  if (ci + 1 >= s.length)
    return true;
  const next = s[ci + 1];
  if (next === " " || next === "\t")
    return true;
  if (flow && (next === "," || next === "}" || next === "]"))
    return true;
  return false;
}
function findTopLevelColon(s) {
  let depth = 0;
  let q = null;
  for (let i = 0;i < s.length; i++) {
    const c = s[i];
    if (q === null) {
      if (c === "'" || c === '"')
        q = c;
      else if (c === "{" || c === "[")
        depth++;
      else if (c === "}" || c === "]")
        depth--;
      else if (c === ":" && depth === 0 && isKeyColon(s, i, true))
        return i;
    } else if (q === "'") {
      if (c === "'") {
        if (s[i + 1] === "'")
          i++;
        else
          q = null;
      }
    } else {
      if (c === "\\")
        i++;
      else if (c === '"')
        q = null;
    }
  }
  return -1;
}
function parseFlowValue(token, line, depth = 0) {
  if (depth > 100)
    yamlErr([], token, line, "maximum flow-nesting depth (100) exceeded");
  const t = token.trim();
  if (t === "")
    return null;
  if (t.startsWith("{")) {
    if (!t.endsWith("}"))
      yamlErr([], t, line, `flow map is not closed on a single line: "${t}"`);
    return parseFlowMap(t.slice(1, -1), line, depth + 1);
  }
  if (t.startsWith("[")) {
    if (!t.endsWith("]"))
      yamlErr([], t, line, `flow array is not closed on a single line: "${t}"`);
    return parseFlowArray(t.slice(1, -1), line, depth + 1);
  }
  if (t.startsWith("'") || t.startsWith('"'))
    return parseQuoted(t, line);
  if (t.indexOf(":") >= 0)
    yamlErr([], t, line, `an unquoted value containing ":" is outside the supported subset: "${t}"`);
  return parseScalar(t);
}
function parseYamlSubset(raw) {
  const logical = preprocess(raw.split(`
`));
  if (logical.length === 0)
    yamlErr([], "(empty document)", 1, "the profile must contain a top-level mapping");
  let pos = 0;
  const keyPath = [];
  function parseMapping(indent, depth = 0) {
    if (depth > 100)
      yamlErr(keyPath, "(nested mapping)", pos < logical.length ? logical[pos].line : 0, "maximum profile nesting depth (100) exceeded");
    const obj = {};
    while (pos < logical.length) {
      const l = logical[pos];
      if (l.indent < indent)
        break;
      if (l.indent > indent)
        yamlErr(keyPath, l.text, l.line, `unexpected indentation (expected depth ${indent})`);
      if (l.text.startsWith("-"))
        yamlErr(keyPath, l.text, l.line, "a sequence item cannot appear where a mapping key is expected");
      const ci = l.text.indexOf(":");
      if (ci < 0)
        yamlErr(keyPath, l.text, l.line, 'expected "key: value"');
      if (!isKeyColon(l.text, ci))
        yamlErr(keyPath, l.text, l.line, 'expected "key: value" (a ":" must be followed by a space \u2014 "foo:bar" is a plain scalar, not a mapping)');
      const key = l.text.slice(0, ci).trim();
      if (key === "")
        yamlErr(keyPath, l.text, l.line, "empty mapping key");
      if (/["'{}[\]\s]/.test(key))
        yamlErr(keyPath, l.text, l.line, `key "${key}" is not a plain scalar key`);
      const rest = l.text.slice(ci + 1).trim();
      pos++;
      keyPath.push(key);
      if (rest === "") {
        if (pos < logical.length && logical[pos].indent > indent) {
          const childIndent = logical[pos].indent;
          obj[key] = logical[pos].text.startsWith("-") ? parseSequence(childIndent, depth + 1) : parseMapping(childIndent, depth + 1);
        } else {
          obj[key] = null;
        }
      } else {
        obj[key] = parseFlowValue(rest, l.line);
      }
      keyPath.pop();
    }
    return obj;
  }
  function parseSequence(indent, depth = 0) {
    if (depth > 100)
      yamlErr(keyPath, "(nested sequence)", pos < logical.length ? logical[pos].line : 0, "maximum profile nesting depth (100) exceeded");
    const arr = [];
    while (pos < logical.length) {
      const l = logical[pos];
      if (l.indent < indent)
        break;
      if (l.indent > indent)
        yamlErr(keyPath, l.text, l.line, "unexpected indentation inside a sequence");
      if (!l.text.startsWith("-"))
        yamlErr(keyPath, l.text, l.line, 'expected a "- " sequence item');
      const item = l.text.slice(1).trimStart();
      pos++;
      if (item === "")
        yamlErr(keyPath, l.text, l.line, "a sequence item must have an inline value in this subset");
      const ci = item.indexOf(":");
      const isMapItem = ci > 0 && isKeyColon(item, ci) && !/^[{[]/.test(item) && !(item.startsWith("'") || item.startsWith('"'));
      if (isMapItem) {
        const key = item.slice(0, ci).trim();
        if (key === "" || /["'{}[\]\s]/.test(key))
          yamlErr(keyPath, l.text, l.line, `sequence map key "${key}" is not a plain key`);
        const rest = item.slice(ci + 1).trim();
        const itemMap = {};
        keyPath.push(String(arr.length), key);
        if (rest === "") {
          if (pos < logical.length && logical[pos].indent > indent) {
            const childIndent = logical[pos].indent;
            itemMap[key] = logical[pos].text.startsWith("-") ? parseSequence(childIndent, depth + 1) : parseMapping(childIndent, depth + 1);
          } else {
            itemMap[key] = null;
          }
        } else {
          itemMap[key] = parseFlowValue(rest, l.line);
          if (pos < logical.length && logical[pos].indent > indent) {
            Object.assign(itemMap, parseMapping(logical[pos].indent, depth + 1));
          }
        }
        arr.push(itemMap);
        keyPath.pop();
        keyPath.pop();
      } else {
        arr.push(parseFlowValue(item, l.line));
      }
    }
    return arr;
  }
  const root = parseMapping(0);
  if (pos < logical.length)
    yamlErr(keyPath, logical[pos].text, logical[pos].line, "unexpected trailing content");
  return root;
}
function extractReceived(input, p) {
  let cur = input;
  for (const k of p) {
    if (cur !== null && typeof cur === "object" && k in cur) {
      cur = cur[k];
    } else {
      return;
    }
  }
  return cur;
}
function loadProfile(profilePath) {
  if (!fs11.existsSync(profilePath)) {
    throw profileInvalid("profilePath", profilePath, "the profile file must exist");
  }
  let raw;
  try {
    raw = fs11.readFileSync(profilePath, "utf8");
  } catch (e) {
    throw profileInvalid("profilePath", profilePath, `the profile file must be readable: ${String(e)}`);
  }
  let parsed;
  if (profilePath.endsWith(".json")) {
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw profileInvalid("yaml", raw.slice(0, 200), `the profile JSON must parse: ${String(e)}`);
    }
  } else {
    try {
      parsed = parseYamlSubset(raw);
    } catch (e) {
      if (e instanceof YamlParseError) {
        throw profileInvalid(e.fieldPath === "" ? "yaml" : e.fieldPath, e.lineText, `the profile YAML must parse within the supported subset - ${e.message}`);
      }
      throw profileInvalid("yaml", raw.slice(0, 120), `the profile YAML must parse: ${String(e)}`);
    }
  }
  const result = ProjectProfileSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.slice(0, 12);
    const collapseNote = result.error.issues.length > issues.length ? ` | (+${result.error.issues.length - issues.length} more issues truncated - fix these first)` : "";
    const detail = issues.map((issue) => {
      const field = issue.path.join(".") || "(top-level)";
      const value = extractReceived(parsed, issue.path);
      const valueText = value === undefined ? "" : ` value=${JSON.stringify(value)}`;
      return `${field}:${valueText} ${issue.message}`;
    }).join(" | ") + collapseNote;
    const remedy = "MUST be written per this embedded minimal-viable-profile YAML template - fill ONLY the two <angle-bracket> paths: " + "profileVersion: 1 | project: { name: p, root: </abs/project/root>, languages: [typescript], entryPoints: [src/main.ts], build: bun run build, test: bun test } | " + "graph: { substrate: corbell, scope: [src], excludes: ['node_modules', 'dist', '.gi'] } | " + "rules: { corpus: [<path/to/existing/spec.md>] } | pipeline: { stages: [ { id: s1, entry: main, contract: stage-contract-prose } ] } | history: { failureLogs: [] } | awareness: { docs: [] }" + " | ALL-REQUIRED-TOP-LEVEL-FIELDS = profileVersion, project, graph, rules, pipeline, history, awareness";
    throw new Error(`PROFILE_INVALID (${result.error.issues.length} issue${result.error.issues.length === 1 ? "" : "s"}): ${detail} remedy=${remedy}`);
  }
  const profile = result.data;
  let resolvedRoot;
  try {
    resolvedRoot = fs11.realpathSync(profile.project.root);
  } catch {
    throw profileInvalid("project.root", profile.project.root, "the project root must exist and be a directory");
  }
  try {
    const st = fs11.statSync(resolvedRoot);
    if (!st.isDirectory()) {
      throw profileInvalid("project.root", profile.project.root, "the project root must exist and be a directory");
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("PROFILE_INVALID"))
      throw e;
    throw profileInvalid("project.root", profile.project.root, "the project root must exist and be a directory");
  }
  const contained = (entry) => {
    const abs = path11.resolve(resolvedRoot, entry);
    let real;
    try {
      real = fs11.realpathSync(abs);
    } catch {
      return false;
    }
    return real === resolvedRoot || real.startsWith(resolvedRoot + path11.sep);
  };
  for (const entry of profile.rules.corpus) {
    if (!contained(entry)) {
      throw corpusMissing(entry);
    }
  }
  for (const entry of profile.history.failureLogs) {
    if (!contained(entry)) {
      throw historyMissing(entry);
    }
  }
  return profile;
}

// src/hunter/profile/source-roots.ts
function isTsFile(name) {
  return name.endsWith(".ts") && !name.endsWith(".d.ts");
}
function dirContainsTsRecursive(dir, depth = 0) {
  if (depth > 6)
    return false;
  let entries;
  try {
    entries = fs12.readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const e of entries) {
    if (e.isFile() && isTsFile(e.name))
      return true;
  }
  for (const e of entries) {
    if (!e.isDirectory() || e.isSymbolicLink())
      continue;
    if (e.name === "node_modules" || e.name === ".git")
      continue;
    if (dirContainsTsRecursive(path12.join(dir, e.name), depth + 1))
      return true;
  }
  return false;
}
function realOrResolve(p) {
  try {
    return fs12.realpathSync(p);
  } catch {
    return path12.resolve(p);
  }
}
function ruleProfileSources(root) {
  const profPath = path12.join(root, ".omp", "graph-intelligence", "profile.yaml");
  if (!fs12.existsSync(profPath))
    return null;
  let raw;
  try {
    raw = fs12.readFileSync(profPath, "utf8");
  } catch {
    return null;
  }
  let parsed;
  try {
    parsed = parseYamlSubset(raw);
  } catch {
    return null;
  }
  const sources = parsed["sources"];
  if (!Array.isArray(sources) || sources.length === 0)
    return null;
  const out = [];
  const seen = new Set;
  for (const s of sources) {
    if (typeof s !== "string" || s.length === 0)
      continue;
    try {
      const rp = fs12.realpathSync(path12.resolve(root, s));
      if (!fs12.statSync(rp).isDirectory())
        continue;
      if (!seen.has(rp)) {
        seen.add(rp);
        out.push(rp);
      }
    } catch {}
  }
  if (out.length === 0)
    return null;
  return { roots: out.sort(), via: `rule1:profile-sources ${profPath}` };
}
function extractYamlStringList(raw, key) {
  const lines = raw.split(`
`);
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i];
    const stripped = line.split("#")[0];
    const m = /^(\s*)([A-Za-z0-9_.-]+)\s*:(.*)$/.exec(stripped);
    if (!m || m[2] !== key)
      continue;
    const rest = m[3].trim();
    if (rest.startsWith("[")) {
      const inner = rest.replace(/^\[/, "").replace(/].*$/, "");
      const items = inner.split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter((s) => s.length > 0);
      return items;
    }
    if (rest.length > 0)
      return null;
    const baseIndent = m[1].length;
    const out = [];
    for (let j = i + 1;j < lines.length; j++) {
      const l = lines[j].split("#")[0];
      if (l.trim().length === 0)
        continue;
      const indent = l.length - l.trimStart().length;
      if (indent <= baseIndent)
        break;
      const item = /^-\s+(.*)$/.exec(l.trim());
      if (!item)
        break;
      const v = item[1].trim().replace(/^['"]|['"]$/g, "");
      if (v.length > 0)
        out.push(v);
    }
    return out;
  }
  return null;
}
function readWorkspaceGlobs(root) {
  const pnpm = path12.join(root, "pnpm-workspace.yaml");
  if (fs12.existsSync(pnpm)) {
    try {
      const globs = extractYamlStringList(fs12.readFileSync(pnpm, "utf8"), "packages");
      if (globs && globs.length > 0)
        return { globs, via: pnpm };
    } catch {}
  }
  const pkgJson = path12.join(root, "package.json");
  if (fs12.existsSync(pkgJson)) {
    try {
      const data = JSON.parse(fs12.readFileSync(pkgJson, "utf8"));
      const w = data.workspaces;
      const arr = Array.isArray(w) ? w : w !== null && typeof w === "object" ? w.packages : undefined;
      if (Array.isArray(arr)) {
        const globs = arr.filter((p) => typeof p === "string" && p.length > 0);
        if (globs.length > 0)
          return { globs, via: pkgJson };
      }
    } catch {}
  }
  const lerna = path12.join(root, "lerna.json");
  if (fs12.existsSync(lerna)) {
    try {
      const data = JSON.parse(fs12.readFileSync(lerna, "utf8"));
      if (Array.isArray(data.packages)) {
        const globs = data.packages.filter((p) => typeof p === "string" && p.length > 0);
        if (globs.length > 0)
          return { globs, via: lerna };
      }
    } catch {}
  }
  return null;
}
function expandWorkspaceGlob(root, glob) {
  const g = glob.trim().replace(/^\.\/+/, "");
  if (g.length === 0)
    return [];
  const star = g.indexOf("*");
  if (star >= 0) {
    const base = g.slice(0, star).replace(/\/+$/, "");
    const baseAbs = path12.resolve(root, base);
    let entries;
    try {
      entries = fs12.readdirSync(baseAbs, { withFileTypes: true });
    } catch {
      return [];
    }
    return entries.filter((e) => e.isDirectory() || e.isSymbolicLink()).map((e) => path12.join(baseAbs, e.name)).sort();
  }
  return [path12.resolve(root, g)];
}
function ruleWorkspace(root) {
  const manifest = readWorkspaceGlobs(root);
  if (!manifest)
    return null;
  const out = [];
  const seen = new Set;
  const consider = (dir) => {
    let stat;
    try {
      stat = fs12.statSync(dir);
    } catch {
      return;
    }
    if (!stat.isDirectory())
      return;
    const src = path12.join(dir, "src");
    let pick = null;
    try {
      if (fs12.statSync(src).isDirectory() && dirContainsTsRecursive(src))
        pick = src;
    } catch {
      pick = null;
    }
    if (pick === null && dirContainsTsRecursive(dir))
      pick = dir;
    if (pick === null)
      return;
    const rp = realOrResolve(pick);
    if (!seen.has(rp)) {
      seen.add(rp);
      out.push(rp);
    }
  };
  for (const g of manifest.globs) {
    for (const d of expandWorkspaceGlob(root, g))
      consider(d);
  }
  if (out.length === 0)
    return null;
  return {
    roots: out.sort(),
    via: `rule2:workspace-manifest ${manifest.via} globs=[${manifest.globs.join(", ")}]`
  };
}
function commonAncestor(dirs) {
  const split = dirs.map((d) => d.split(path12.sep).filter((s) => s.length > 0));
  let common = split[0] ?? [];
  for (const parts of split.slice(1)) {
    let i = 0;
    while (i < common.length && i < parts.length && common[i] === parts[i])
      i++;
    common = common.slice(0, i);
  }
  if (common.length === 0)
    return path12.sep;
  return path12.sep + common.join(path12.sep);
}
function ruleTsconfig(root) {
  const tsconfig = path12.join(root, "tsconfig.json");
  if (!fs12.existsSync(tsconfig))
    return null;
  let data;
  try {
    data = JSON.parse(fs12.readFileSync(tsconfig, "utf8"));
  } catch {
    return null;
  }
  const entries = [];
  if (Array.isArray(data.include)) {
    for (const e of data.include)
      if (typeof e === "string" && e.length > 0)
        entries.push(e);
  }
  if (Array.isArray(data.files)) {
    for (const e of data.files)
      if (typeof e === "string" && e.length > 0)
        entries.push(e);
  }
  if (entries.length === 0)
    return null;
  const dirs = [];
  for (const e of entries) {
    const star = e.indexOf("*");
    const head = (star >= 0 ? e.slice(0, star) : e).replace(/\/+$/, "");
    const abs = head.length === 0 ? root : path12.resolve(root, head);
    try {
      const st = fs12.statSync(abs);
      if (st.isDirectory())
        dirs.push(realOrResolve(abs));
      else if (st.isFile())
        dirs.push(path12.dirname(realOrResolve(abs)));
    } catch {}
  }
  if (dirs.length === 0)
    return null;
  const withTs = [...new Set(dirs)].filter((d) => {
    try {
      return fs12.statSync(d).isDirectory() && dirContainsTsRecursive(d);
    } catch {
      return false;
    }
  });
  if (withTs.length > 0) {
    return {
      roots: withTs.map(realOrResolve),
      via: `rule3:tsconfig ${tsconfig} entries=[${entries.join(", ")}]`
    };
  }
  const ancestor = commonAncestor(dirs);
  try {
    if (fs12.statSync(ancestor).isDirectory() && dirContainsTsRecursive(ancestor)) {
      return {
        roots: [realOrResolve(ancestor)],
        via: `rule3:tsconfig ${tsconfig} entries=[${entries.join(", ")}] (common ancestor)`
      };
    }
  } catch {}
  return null;
}
function ruleConventional(root) {
  const out = [];
  const seen = new Set;
  const take = (abs) => {
    try {
      if (fs12.statSync(abs).isDirectory() && dirContainsTsRecursive(abs)) {
        const rp = realOrResolve(abs);
        if (!seen.has(rp)) {
          seen.add(rp);
          out.push(rp);
        }
      }
    } catch {}
  };
  for (const c of ["src", "lib", "app"])
    take(path12.join(root, c));
  const pkgs = path12.join(root, "packages");
  try {
    const entries = fs12.readdirSync(pkgs, { withFileTypes: true });
    const names = entries.filter((e) => e.isDirectory() || e.isSymbolicLink()).map((e) => e.name).sort();
    for (const n of names)
      take(path12.join(pkgs, n, "src"));
  } catch {}
  if (out.length === 0)
    return null;
  return { roots: out.sort(), via: "rule4:conventional src/ lib/ app/ packages/*/src" };
}
var WALK_SKIP = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".gi",
  "Checkpoints",
  "corbell-data",
  ".omp",
  "coverage",
  "fork-v143",
  "research",
  "Ship_Packages",
  "SHIP_PACKAGES",
  "vendor"
]);
function ruleWalk(root, maxDepth = 4) {
  const out = [];
  const visit = (dir, depth, ancestorPushed) => {
    let entries;
    try {
      entries = fs12.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const hasTs = entries.some((e) => e.isFile() && isTsFile(e.name));
    const here = hasTs && !ancestorPushed;
    if (here)
      out.push(realOrResolve(dir));
    if (depth >= maxDepth)
      return;
    const subs = entries.filter((e) => e.isDirectory() && !e.isSymbolicLink() && !WALK_SKIP.has(e.name)).map((e) => e.name).sort();
    for (const s of subs)
      visit(path12.join(dir, s), depth + 1, ancestorPushed || here);
  };
  visit(root, 0, false);
  if (out.length === 0)
    return null;
  return { roots: [...new Set(out)].sort(), via: `rule5:bounded-walk depth<=${maxDepth}` };
}
function discoverSourceRoots(targetRoot) {
  const root = realOrResolve(path12.resolve(targetRoot));
  try {
    if (!fs12.statSync(root).isDirectory()) {
      return { error: `GI_NO_SOURCE_ROOT: no source root discovered under ${targetRoot} (not a directory)` };
    }
  } catch {
    return { error: `GI_NO_SOURCE_ROOT: no source root discovered under ${targetRoot} (the target does not exist)` };
  }
  const r1 = ruleProfileSources(root);
  if (r1)
    return { roots: r1.roots, evidence: r1.via };
  const r2 = ruleWorkspace(root);
  if (r2)
    return { roots: r2.roots, evidence: r2.via };
  const r3 = ruleTsconfig(root);
  if (r3)
    return { roots: r3.roots, evidence: r3.via };
  const r4 = ruleConventional(root);
  if (r4)
    return { roots: r4.roots, evidence: r4.via };
  const r5 = ruleWalk(root);
  if (r5)
    return { roots: r5.roots, evidence: r5.via };
  return { error: `GI_NO_SOURCE_ROOT: no source root discovered under ${targetRoot}` };
}

// src/hunter/graph/corbell-adapter.ts
function resolveCorbell(profile, env = process.env) {
  const safe = (p) => {
    if (/[^A-Za-z0-9_@%+=:,./\\-]/.test(p)) {
      throw new Error(`CORBELL_BIN_UNSAFE: resolved binary path contains shell metacharacters: ${p.slice(0, 120)}`);
    }
    return p;
  };
  const fromProfile = profile?.graph?.binaryPath;
  if (fromProfile && fromProfile.length > 0 && fs13.existsSync(fromProfile))
    return safe(fromProfile);
  const fromEnv = env.CORBELL_BIN;
  if (fromEnv && fromEnv.length > 0 && fs13.existsSync(fromEnv))
    return safe(fromEnv);
  const VENV_SITES = [path13.join("/home", "leviathan", "corbell-venv", "bin", "corbell"), path13.join("/", "opt", "corbell-venv", "bin", "corbell")];
  for (const candidate of VENV_SITES) {
    if (fs13.existsSync(candidate))
      return safe(candidate);
  }
  const pathEnv = env.PATH ?? process.env.PATH ?? "";
  for (const dir of pathEnv.split(":")) {
    if (!dir)
      continue;
    const cand = path13.join(dir, "corbell");
    if (fs13.existsSync(cand))
      return safe(cand);
  }
  throw new Error("CORBELL_NOT_FOUND - the corbell binary is missing; install it with 'pip install git+https://github.com/Corbell-AI/Corbell.git' or set CORBELL_BIN or graph.binaryPath");
}
function splitShellWords(raw) {
  const out = [];
  let cur = "";
  let quote = null;
  let started = false;
  for (let i = 0;i < raw.length; i++) {
    const ch = raw[i];
    if (quote !== null) {
      if (ch === quote) {
        quote = null;
        continue;
      }
      cur += ch;
      started = true;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
      continue;
    }
    if (ch === "\\" && i + 1 < raw.length) {
      cur += raw[i + 1];
      i++;
      started = true;
      continue;
    }
    if (ch === " " || ch === "\t" || ch === `
` || ch === "\r") {
      if (started) {
        out.push(cur);
        cur = "";
        started = false;
      }
      continue;
    }
    cur += ch;
    started = true;
  }
  if (started)
    out.push(cur);
  return out;
}
var defaultExec = (cmdRaw, opts) => {
  const shellEscape = (tok) => `'${tok.split(`'`).join(`'"'"'`)}'`;
  const parts = splitShellWords(cmdRaw);
  if (parts.length === 0) {
    throw new Error(`CORBELL_EXEC_UNSAFE: refusing empty command`);
  }
  const [binRaw, ...args] = parts;
  if (/[^A-Za-z0-9_@%+=:,./\\-]/.test(binRaw)) {
    throw new Error(`CORBELL_EXEC_UNSAFE: binary path contains shell metacharacters: ${binRaw.slice(0, 120)}`);
  }
  const cmd = "exec " + [binRaw, ...args.map(shellEscape)].join(" ");
  const ATTEMPTS = 8;
  const retryT0 = Date.now();
  const retryTimeout = opts?.timeout;
  const retryDeadline = typeof retryTimeout === "number" && retryTimeout > 0 ? retryT0 + retryTimeout : Number.POSITIVE_INFINITY;
  let blockedMs = 0;
  const SYNC_BLOCK_BUDGET_MS = 30000;
  let lastErr;
  for (let attempt = 1;attempt <= ATTEMPTS; attempt++) {
    try {
      const execBudget = retryDeadline - Date.now();
      if (execBudget <= 0)
        break;
      let execTimeout;
      if (retryDeadline === Number.POSITIVE_INFINITY) {
        execTimeout = retryTimeout;
      } else {
        execTimeout = Math.max(1, Math.min(retryTimeout ?? Number.POSITIVE_INFINITY, execBudget));
      }
      return execSync(cmd, {
        cwd: opts?.cwd,
        timeout: execTimeout,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, ...opts?.env ?? {} }
      }).toString();
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!/database is locked|SQLITE_BUSY/i.test(msg) || attempt === ATTEMPTS)
        break;
      const remaining = retryDeadline - Date.now();
      if (remaining <= 0)
        break;
      const backoff = Math.min(16000, 1000 * Math.pow(2, attempt - 1), remaining, SYNC_BLOCK_BUDGET_MS - blockedMs);
      if (backoff <= 0)
        break;
      blockedMs += backoff;
      console.warn(`[corbell-adapter] database locked (attempt ${attempt}/${ATTEMPTS}) \u2014 retrying in ${backoff}ms`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, backoff);
    }
  }
  throw lastErr;
};
var NODE_ROW_RE = /^(?<kind>\w+)\s+(?<name>[\w.$:]+)\s+(?<file>.+):(?<line>\d+)$/;
var KNOWN_NODE_KINDS = ["class", "function", "method", "module", "stage", "rule", "file"];
function mapNodeType(t) {
  switch (t) {
    case "method":
      return "method";
    case "service":
    case "datastore":
    case "queue":
      return "module";
    case "flow":
      return "function";
    default:
      return "module";
  }
}
var resolveNodeFileCache = new Map;
function resolveNodeFile(stored, root, fsMod = fs13) {
  const cacheKey = `${stored}\x00${root}`;
  const cached = resolveNodeFileCache.get(cacheKey);
  if (cached !== undefined)
    return cached;
  if (path13.isAbsolute(stored) && fsMod.existsSync(stored)) {
    resolveNodeFileCache.set(cacheKey, stored);
    return stored;
  }
  if (!path13.isAbsolute(stored)) {
    const joined = path13.resolve(root, stored);
    if (fsMod.existsSync(joined)) {
      resolveNodeFileCache.set(cacheKey, joined);
      return joined;
    }
  }
  const anchors = ["/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/", "JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/", "OPENCODE_WORKSPACE/", "/workspace/", "/app/"];
  for (const anchor of anchors) {
    const idx = stored.lastIndexOf(anchor);
    if (idx === -1)
      continue;
    let suffix = stored.slice(idx + anchor.length);
    const srcIdx = suffix.indexOf("src/");
    if (srcIdx > 0)
      suffix = suffix.slice(srcIdx);
    const candidate = path13.resolve(root, suffix);
    if (fsMod.existsSync(candidate)) {
      resolveNodeFileCache.set(cacheKey, candidate);
      return candidate;
    }
  }
  throw new Error(`FOREIGN_PATH_UNRESOLVED: ${stored} does not exist under ${root} (no anchor match)`);
}
function mapEdgeKind(k) {
  switch (k) {
    case "method_call":
    case "call":
      return "calls";
    case "flow_step":
    case "wires":
      return "traces-to";
    case "depends-on":
    case "import":
    case "imports":
      return "imports";
    case "awaits":
    case "await":
      return "awaits";
    case "git_coupling":
      return "coupling";
    default:
      giLog("DEBUG", "corbell-adapter", `unknown edge kind '${k}' -> 'calls' (the fallback)`);
      return "calls";
  }
}
function normalizeRowKind(k) {
  if (KNOWN_NODE_KINDS.includes(k)) {
    return k;
  }
  return "file";
}
function truncate(s, n = 200) {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? `${one.slice(0, n)}\u2026` : one;
}
function parseBuildOutput(stdout, profile) {
  const rows = stdout.split(`
`).map((l) => l.trim()).filter((l) => l.length > 0);
  const matches = rows.filter((row) => NODE_ROW_RE.test(row));
  if (rows.length > 0 && matches.length === 0 && !/Graph built|Methods:|Services:|Edges:/i.test(stdout)) {
    throw adapterParseError("corbell graph build stdout", `no graph rows parsed and the output is not the build summary: "${truncate(stdout)}"`);
  }
  const root = path13.resolve(profile.project.root);
  return matches.map((row) => {
    const m = NODE_ROW_RE.exec(row);
    const kind = m.groups.kind;
    const name = m.groups.name;
    const file = m.groups.file;
    const line = Number(m.groups.line);
    return {
      id: `corbell:${name}`,
      kind: normalizeRowKind(kind),
      name,
      file: path13.isAbsolute(file) ? file : path13.resolve(root, file),
      line,
      lineage: "CODE_DERIVED",
      source: `${file}:${line}`
    };
  });
}
function countLineage(nodes, edges) {
  const count = (l, list) => list.filter((n) => n.lineage === l).length;
  return {
    spec: count("SPEC_DERIVED", nodes) + count("SPEC_DERIVED", edges),
    code: count("CODE_DERIVED", nodes) + count("CODE_DERIVED", edges),
    hybrid: count("HYBRID", nodes) + count("HYBRID", edges)
  };
}
function stripYamlComment(raw) {
  let quote = null;
  for (let i = 0;i < raw.length; i++) {
    const ch = raw[i];
    if (quote !== null) {
      if (ch === quote)
        quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "#")
      return raw.slice(0, i);
  }
  return raw;
}
function unquoteYamlScalar(raw) {
  const v = raw.trim();
  if (v.length === 0)
    return null;
  const q = v[0];
  if ((q === '"' || q === "'") && v.length >= 2 && v.endsWith(q))
    return v.slice(1, -1).trim();
  return v;
}
function parseWorkspaceConfig(text) {
  let root = null;
  const repos = [];
  for (const rawLine of text.split(`
`)) {
    const line = stripYamlComment(rawLine).replace(/\s+$/, "");
    if (line.trim().length === 0)
      continue;
    const m = /^(\s*)(?:-\s+)?([A-Za-z_][A-Za-z0-9_-]*)\s*:(.*)$/.exec(line);
    if (!m)
      continue;
    const indent = m[1].length;
    const key = m[2];
    const value = unquoteYamlScalar(m[3]);
    if (value === null)
      continue;
    if (key === "root" && indent <= 2 && root === null)
      root = value;
    if (key === "repo")
      repos.push(value);
  }
  return { root, repos };
}
var bunSqliteModule = null;
var requireFromAdapter = createRequire(import.meta.url);
function isBunSqliteModule(v) {
  return typeof v === "object" && v !== null && "Database" in v && typeof v.Database === "function";
}
function loadBunSqlite() {
  if (bunSqliteModule)
    return bunSqliteModule;
  let loaded;
  try {
    loaded = requireFromAdapter("bun:sqlite");
  } catch (e) {
    throw adapterFailed("read corbell store", `BUN_SQLITE_UNAVAILABLE: the bun:sqlite driver could not be loaded (the corbell store read requires the Bun runtime): ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!isBunSqliteModule(loaded)) {
    throw adapterFailed("read corbell store", `BUN_SQLITE_UNAVAILABLE: bun:sqlite loaded without a Database constructor (module shape: ${typeof loaded})`);
  }
  bunSqliteModule = loaded;
  return bunSqliteModule;
}

class CorbellAdapter {
  profile;
  exec;
  cachedNodes = [];
  cachedEdges = [];
  built = false;
  constructor(profile, exec = defaultExec) {
    this.profile = profile;
    this.exec = exec;
  }
  async build(profile) {
    this.assertCorbell(profile);
    const discovered = discoverSourceRoots(path13.resolve(profile.project.root));
    if ("error" in discovered)
      throw new Error(discovered.error);
    console.log(`[corbell-adapter] source roots (${discovered.roots.length}): ${discovered.roots.join(", ")} (${discovered.evidence})`);
    const wsConfigPath = path13.join(profile.project.root, "corbell-data", "workspace.yaml");
    const wsConfigExists = fs13.existsSync(wsConfigPath);
    let wsConfigStale = !wsConfigExists;
    if (wsConfigExists) {
      try {
        const wsText = fs13.readFileSync(wsConfigPath, "utf8");
        const cfg = parseWorkspaceConfig(wsText);
        if (cfg.root === null || cfg.repos.length === 0) {
          wsConfigStale = true;
        } else {
          const configDir = path13.resolve(path13.join(profile.project.root, "corbell-data"));
          const realOrResolved = (p) => {
            try {
              return fs13.realpathSync(p);
            } catch {
              return path13.resolve(p);
            }
          };
          const projectRootAbs = realOrResolved(path13.resolve(profile.project.root));
          const rootOk = realOrResolved(path13.resolve(configDir, cfg.root)) === projectRootAbs;
          const expectedRepos = new Set(this.scopeRepoRefs(profile).map((ref) => realOrResolved(path13.resolve(configDir, ref))));
          const declaredRepos = cfg.repos.map((ref) => realOrResolved(path13.resolve(configDir, ref)));
          const repoOk = declaredRepos.length === expectedRepos.size && declaredRepos.every((abs) => expectedRepos.has(abs));
          wsConfigStale = !(rootOk && repoOk);
        }
      } catch (e) {
        console.warn(`[corbell-adapter] workspace.yaml read failed \u2014 regenerating: ${String(e)}`);
        wsConfigStale = true;
      }
    }
    if (wsConfigStale) {
      console.log(`[corbell-adapter] writing the profile-driven corbell workspace config at ${wsConfigPath} (${wsConfigExists ? "stale template" : "absent"})`);
      this.writeWorkspaceConfig(profile, wsConfigPath);
    }
    const t0 = Date.now();
    let stdout;
    let warmIndexSkipped = false;
    if (profile?.graph?.rebuild === false) {
      warmIndexSkipped = true;
      console.log("[corbell-adapter] graph.rebuild=false \u2014 using the existing index (skip the minutes-long scan)");
      stdout = "";
    } else {
      const couplingEnv = {
        CORBELL_COUPLING_MONTHS: "1",
        CORBELL_COUPLING_MAX_COMMIT_FILES: "200",
        CORBELL_COUPLING_MAX_COMMITS: "500"
      };
      const profileExcludes = profile?.graph?.excludes ?? [];
      const walkExcludes = new Set([...profileExcludes, ...WALK_SKIP, "corbell-data", "context_management"]);
      couplingEnv.CORBELL_WALK_EXCLUDE_DIRS = [...walkExcludes].join(",");
      try {
        const gitRoot = execSync("git rev-parse --show-toplevel", {
          cwd: profile.project.root,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"]
        }).trim();
        const rel = path13.relative(gitRoot, profile.project.root);
        if (rel.length > 0 && !rel.startsWith("..")) {
          couplingEnv.CORBELL_COUPLING_SCOPE = rel.split(path13.sep).join("/");
        }
      } catch (e) {
        console.error("[corbell-adapter] git coupling unavailable \u2014 degrading to no-coupling:", e instanceof Error ? e.message : e);
      }
      try {
        const buildBin = resolveCorbell(profile);
        stdout = this.exec(`${buildBin} graph build --methods`, {
          cwd: profile.project.root,
          env: couplingEnv
        });
      } catch (e) {
        throw adapterFailed("corbell graph build --methods", `the CLI call failed: ${String(e)}`);
      }
      const storePath = path13.join(profile.project.root, "corbell-data", ".corbell", "workspace.db");
      try {
        const st = fs13.statSync(storePath);
        const MB = 1024 * 1024;
        if (st.size > 512 * MB) {
          throw adapterFailed("corbell graph build --methods", `CORBELL_STORE_BLOATED: ${storePath} is ${(st.size / MB).toFixed(0)}MB (>512MB) \u2014 ` + `the build escaped its scope. Remedy: delete the store, verify the ` + `CORBELL_COUPLING_* knobs reached the vendor, rebuild.`);
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("CORBELL_STORE_BLOATED"))
          throw e;
      }
    }
    let nodes = warmIndexSkipped ? [] : parseBuildOutput(stdout, profile);
    let edges = [];
    if (nodes.length === 0) {
      const store = this.readCorbellStore(profile);
      nodes = store.nodes;
      edges = store.edges;
    }
    if (nodes.length === 0) {
      throw graphEmpty(`corbell graph build produced zero nodes (the CLI reported: "${truncate(stdout)}")`);
    }
    const codeKinds = new Set(["method", "class", "function", "file", "rule", "constant"]);
    if (!nodes.some((n) => codeKinds.has(n.kind))) {
      throw graphEmpty(`corbell graph build produced ${nodes.length} scaffolding-only node(s) (${nodes.map((n) => n.kind).join(",")}) with ZERO code nodes \u2014 the source was not scanned (the tree-sitter grammars / the repo root / the source in a build dir); the CLI reported: "${truncate(stdout)}"`);
    }
    this.cachedNodes = nodes;
    this.cachedEdges = edges;
    this.built = true;
    return {
      nodes,
      edges,
      durationMs: Date.now() - t0,
      adapter: "corbell",
      lineage: countLineage(nodes, edges),
      command: "corbell graph build --methods"
    };
  }
  scopeRepoRefs(profile) {
    const configDir = path13.join(path13.resolve(profile.project.root), "corbell-data");
    const toRef = (abs) => {
      const rel = path13.relative(configDir, abs).split(path13.sep).join("/");
      return rel.length > 0 ? rel : "..";
    };
    const override = profile.graph.sourceRoots;
    if (Array.isArray(override)) {
      const explicit = override.filter((s) => typeof s === "string" && s.length > 0);
      if (explicit.length > 0)
        return explicit.map((s) => toRef(path13.resolve(profile.project.root, s)));
    }
    const discovered = discoverSourceRoots(path13.resolve(profile.project.root));
    if (!("error" in discovered) && discovered.roots.length > 0) {
      return discovered.roots.map(toRef);
    }
    const first = profile.graph.scope.length > 0 ? String(profile.graph.scope[0]) : "";
    const dir = first.replace(/^\.\/+|\/+$/g, "");
    if (dir.length === 0) {
      throw new Error(`GI_NO_SOURCE_ROOT: the profile carries no scope and discoverSourceRoots found no roots under ${profile.project.root} \u2014 refusing to emit the whole-tree '..' ref (the unbounded-walk class)`);
    }
    return [dir.startsWith("../") ? dir : `../${dir}`];
  }
  writeWorkspaceConfig(profile, wsConfigPath) {
    const slug = profile.project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "service";
    const languages = profile.project.languages.length > 0 ? profile.project.languages[0] : "typescript";
    const repoRefs = this.scopeRepoRefs(profile);
    const serviceBlocks = repoRefs.map((repoRef, i) => [
      `  - id: ${repoRefs.length === 1 ? slug : `${slug}-${i + 1}`}`,
      `    repo: ${repoRef}`,
      `    language: ${languages}`,
      "    tags: [core]"
    ].join(`
`)).join(`
`);
    const config = [
      'version: "1"',
      "",
      "workspace:",
      `  name: "${profile.project.name}"`,
      '  root: ".."',
      "",
      "services:",
      serviceBlocks,
      "",
      "existing_docs:",
      "  auto_scan: true",
      "  paths: []",
      "  patterns:",
      '    - "*.design.md"',
      '    - "*-spec.md"',
      '    - "RFC-*.md"',
      '    - "ADR-*.md"',
      '    - "DESIGN.md"',
      "",
      "storage:",
      "  graph:",
      "    backend: sqlite",
      "    path: .corbell/workspace.db",
      "  embeddings:",
      "    backend: sqlite",
      "    path: .corbell/workspace.db",
      "  model: all-MiniLM-L6-v2",
      ""
    ].join(`
`);
    try {
      fs13.mkdirSync(path13.dirname(wsConfigPath), { recursive: true });
      fs13.writeFileSync(wsConfigPath, config, "utf8");
    } catch (e) {
      throw adapterFailed("write corbell-data/workspace.yaml", `the profile-driven config write failed: ${String(e)}`);
    }
  }
  assertCorbell(profile) {
    let bin;
    try {
      bin = resolveCorbell(profile);
    } catch (e) {
      throw adapterFailed("corbell --help", e instanceof Error ? e.message : String(e));
    }
    try {
      this.exec(`${bin} --help`, { cwd: profile.project.root, timeout: 15000 });
    } catch (e) {
      const err = e;
      const code = typeof err === "object" && err !== null && err.code !== undefined ? err.code : undefined;
      const missing = code === "ENOENT";
      throw adapterFailed("corbell --help", missing ? `CORBELL_NOT_FOUND - the corbell binary is missing; install it with 'pip install corbell' (NOTE: the package is not published on PyPI as of 2026-08-12 - use 'pip install git+https://github.com/Corbell-AI/Corbell.git' instead)` : `the corbell CLI failed to start: ${String(e)}`);
    }
  }
  readCorbellStore(profile) {
    const dbPath = path13.join(profile.project.root, "corbell-data", ".corbell", "workspace.db");
    if (!fs13.existsSync(dbPath))
      return { nodes: [], edges: [] };
    const { Database: DatabaseCtor } = loadBunSqlite();
    let db;
    try {
      db = new DatabaseCtor(dbPath, { readonly: true });
    } catch (e) {
      throw adapterFailed(`read ${dbPath}`, `could not open the corbell store: ${String(e)}`);
    }
    const nodes = [];
    const srcCache = new Map;
    const enrichCache = new Map;
    try {
      for (const row of db.prepare("SELECT id, node_type, data FROM graph_nodes").all()) {
        const id = String(row["id"]);
        const nodeType = String(row["node_type"]);
        let data = {};
        try {
          data = JSON.parse(String(row["data"] ?? "{}"));
        } catch (e) {
          console.warn(`[corbell-adapter] node '${id}' carries unparseable data JSON \u2014 continuing with {}: ${String(e)}`);
        }
        const file = typeof data["file_path"] === "string" ? data["file_path"] : null;
        if (file && typeof data["comparator"] !== "number") {
          try {
            const srcPath = path13.isAbsolute(file) ? file : path13.join(profile.project.root, file);
            let enriched = enrichCache.get(srcPath);
            if (enriched === undefined) {
              enriched = {};
              let src = srcCache.get(srcPath);
              if (src === undefined) {
                try {
                  const st = fs13.statSync(srcPath);
                  if (st.size > 1e6) {
                    console.warn(`[corbell-adapter] source-read enrichment skipped for '${file}' (${st.size}B > 1MB cap)`);
                    src = "";
                    srcCache.set(srcPath, src);
                  }
                } catch {}
                if (src === undefined) {
                  src = fs13.readFileSync(srcPath, "utf8");
                  srcCache.set(srcPath, src);
                }
              }
              if (src.length > 1e6) {
                console.warn(`[corbell-adapter] source-read enrichment skipped for '${file}' (${src.length}B > 1MB cap)`);
              } else {
                const nums = [];
                for (const m of src.matchAll(/\b\d+(?:\.\d+)?\b/g)) {
                  const n = Number(m[0]);
                  if (Number.isFinite(n))
                    nums.push(n);
                }
                if (nums.length > 0) {
                  enriched.comparator = nums.reduce((a, b) => a > b ? a : b, nums[0]);
                  enriched.numericLiterals = nums.slice(0, 1e4);
                }
              }
              enrichCache.set(srcPath, enriched);
            }
            if (enriched.comparator !== undefined) {
              data["comparator"] = enriched.comparator;
              data["numericLiterals"] = enriched.numericLiterals;
            }
          } catch (e) {
            console.warn(`[corbell-adapter] source-read enrichment failed for '${file}': ${String(e)}`);
          }
        }
        const lineVal = data["line"] ?? data["line_start"] ?? data["line_end"];
        const line = typeof lineVal === "number" ? lineVal : typeof lineVal === "string" ? Number(lineVal) : undefined;
        const name = typeof data["name"] === "string" && data["name"] !== "" ? data["name"] : typeof data["method_name"] === "string" && data["method_name"] !== "" ? data["method_name"] : typeof data["function_name"] === "string" && data["function_name"] !== "" ? data["function_name"] : typeof data["class_name"] === "string" && data["class_name"] !== "" ? data["class_name"] : id;
        let resolvedFile;
        if (file) {
          try {
            resolvedFile = resolveNodeFile(file, profile.project.root);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("FOREIGN_PATH_UNRESOLVED")) {
              console.error("[corbell-adapter] " + msg);
              resolvedFile = undefined;
            } else
              throw e;
          }
        }
        nodes.push({
          id: `corbell:${id}`,
          kind: mapNodeType(nodeType),
          name,
          file: resolvedFile,
          line: Number.isFinite(line) ? line : undefined,
          lineage: "CODE_DERIVED",
          source: "corbell",
          data
        });
      }
      const classes = new Map;
      for (const n of nodes) {
        const cn = n.data && typeof n.data["class_name"] === "string" ? n.data["class_name"] : null;
        if (n.kind === "method" && cn) {
          if (!classes.has(cn))
            classes.set(cn, { methods: [], file: n.file ?? undefined });
          classes.get(cn).methods.push(n.name);
        }
      }
      for (const [cn, c] of classes) {
        nodes.push({
          id: `corbell:class:${cn}`,
          kind: "class",
          name: cn,
          file: c.file,
          lineage: "CODE_DERIVED",
          source: "corbell",
          data: { members: c.methods }
        });
      }
      const edges = [];
      const nodeIds = new Set(nodes.map((n) => n.id));
      for (const row of db.prepare("SELECT source_id, target_id, kind, metadata FROM graph_edges").all()) {
        let meta = {};
        try {
          meta = JSON.parse(String(row["metadata"] ?? "{}"));
        } catch (e) {
          console.warn(`[corbell-adapter] edge '${String(row["source_id"])}->${String(row["target_id"])}' carries unparseable metadata \u2014 continuing with {}: ${String(e)}`);
        }
        const src = `corbell:${String(row["source_id"])}`;
        const tgt = `corbell:${String(row["target_id"])}`;
        if (!nodeIds.has(src) || !nodeIds.has(tgt))
          continue;
        const lineVal = meta["line"];
        const line = typeof lineVal === "number" ? lineVal : typeof lineVal === "string" ? Number(lineVal) : undefined;
        edges.push({
          sourceId: src,
          targetId: tgt,
          kind: mapEdgeKind(String(row["kind"])),
          lineage: "CODE_DERIVED",
          line: Number.isFinite(line) ? line : undefined
        });
      }
      return { nodes, edges };
    } catch (e) {
      throw adapterFailed(`read ${dbPath}`, `could not read the corbell store rows: ${String(e)}`);
    } finally {
      db.close();
    }
  }
  readStore(profile) {
    const selfAsStoreReader = this;
    return selfAsStoreReader.readCorbellStore(profile);
  }
  emitWorkspaceConfig(profile, wsConfigPath) {
    const selfAsConfigWriter = this;
    return selfAsConfigWriter.writeWorkspaceConfig(profile, wsConfigPath);
  }
  resolveNodeId(symbol) {
    if (symbol.startsWith("corbell:"))
      return symbol;
    const byName = this.cachedNodes.find((n) => n.name === symbol);
    if (byName)
      return byName.id;
    const bySuffix = this.cachedNodes.find((n) => n.id.endsWith(`::${symbol}`) || n.id.endsWith(`:${symbol}`));
    if (!bySuffix) {
      giLog("WARN", "corbell-adapter", `resolveNodeId: symbol '${symbol}' matched no node \u2014 UNRESOLVED (the query verb returns [] and never a phantom match)`);
      return null;
    }
    return bySuffix.id;
  }
  nodeById(id) {
    return this.cachedNodes.find((n) => n.id === id);
  }
  ensureBuilt() {
    if (!this.built) {
      throw adapterFailed("corbell query", "no graph built \u2014 call build() first (the query verbs read the built graph)");
    }
  }
  whoCalls(symbol) {
    this.ensureBuilt();
    const target = this.resolveNodeId(symbol);
    if (target === null)
      return [];
    return this.cachedEdges.filter((e) => e.kind === "calls" && e.targetId === target).map((e) => {
      const caller = this.nodeById(e.sourceId);
      return {
        file: caller?.file ?? e.file ?? "",
        line: e.line ?? caller?.line ?? 0,
        caller: caller?.name ?? e.sourceId
      };
    });
  }
  chain(id) {
    this.ensureBuilt();
    const start = this.resolveNodeId(id);
    if (start === null)
      return [];
    const steps = [];
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length > 0) {
      const from = queue.shift();
      for (const e of this.cachedEdges.filter((x) => x.kind === "calls" && x.sourceId === from)) {
        const caller = this.nodeById(e.sourceId);
        const callee = this.nodeById(e.targetId);
        steps.push({
          from: caller?.name ?? e.sourceId,
          to: callee?.name ?? e.targetId,
          kind: e.kind,
          file: callee?.file ?? e.file ?? "",
          line: e.line ?? callee?.line ?? 0
        });
        if (!seen.has(e.targetId)) {
          seen.add(e.targetId);
          queue.push(e.targetId);
        }
      }
    }
    return steps;
  }
  imports(module) {
    this.ensureBuilt();
    const start = this.resolveNodeId(module);
    if (start === null)
      return [];
    return this.cachedEdges.filter((e) => e.kind === "imports" && e.sourceId === start).map((e) => {
      const src = this.nodeById(e.sourceId);
      const dst = this.nodeById(e.targetId);
      return { from: src?.name ?? e.sourceId, to: dst?.name ?? e.targetId, file: src?.file ?? e.file ?? "", line: e.line ?? src?.line ?? 0 };
    });
  }
  awaits(symbol) {
    this.ensureBuilt();
    const start = this.resolveNodeId(symbol);
    if (start === null)
      return [];
    return this.cachedEdges.filter((e) => e.kind === "awaits" && e.sourceId === start).map((e) => {
      const src = this.nodeById(e.sourceId);
      const dst = this.nodeById(e.targetId);
      return { from: src?.name ?? e.sourceId, to: dst?.name ?? e.targetId, file: src?.file ?? e.file ?? "", line: e.line ?? src?.line ?? 0 };
    });
  }
  unwired() {
    this.ensureBuilt();
    const callTargets = new Set(this.cachedEdges.filter((e) => e.kind === "calls").map((e) => e.targetId));
    return this.cachedNodes.filter((n) => (n.kind === "function" || n.kind === "method" || n.kind === "class") && !callTargets.has(n.id)).map((n) => ({ id: n.id, name: n.name, file: n.file ?? "", line: n.line ?? 0 }));
  }
  nodes(kind) {
    if (!this.built)
      return [];
    return kind === undefined ? [...this.cachedNodes] : this.cachedNodes.filter((n) => n.kind === kind);
  }
  async corbellParse(fileSubtree) {
    const out = [];
    const rootAbs = path13.resolve(this.profile.project.root);
    for (const file of fileSubtree) {
      const rel = path13.isAbsolute(file) ? path13.relative(rootAbs, file) : file;
      const abs = path13.resolve(rootAbs, rel);
      if (abs !== rootAbs && !abs.startsWith(rootAbs + path13.sep)) {
        console.error("[corbell-adapter] subtree file OUTSIDE the project root refused:", file);
        continue;
      }
      let text = "";
      try {
        text = fs13.readFileSync(abs, "utf8");
      } catch (e) {
        console.error("[corbell-adapter] unreadable subtree file skipped:", rel, e instanceof Error ? e.message : String(e));
        continue;
      }
      const lines = text.split(`
`);
      lines.forEach((line, idx) => {
        const m = /^\s*(?:export\s+)?(?:class|function)\s+(\w+)/.exec(line);
        if (m)
          out.push({ id: `corbell:${m[1]}`, kind: line.includes("class") ? "class" : "function", name: m[1], file: abs, line: idx + 1, lineage: "CODE_DERIVED", source: `${rel}:${idx + 1}` });
      });
    }
    return out;
  }
  nodeDiff(before, after) {
    const beforeById = new Map(before.map((n) => [n.id, n]));
    const afterById = new Map(after.map((n) => [n.id, n]));
    const added = [];
    const removed = [];
    const changed = [];
    for (const [id, node] of afterById) {
      if (!beforeById.has(id))
        added.push(node);
      else {
        const prev = beforeById.get(id);
        if (prev.file !== node.file || prev.line !== node.line || prev.name !== node.name)
          changed.push(node);
      }
    }
    for (const [id, node] of beforeById)
      if (!afterById.has(id))
        removed.push(node);
    return { added, removed, changed };
  }
  update(nodes, edges) {
    const byId = new Map(this.cachedNodes.map((n) => [n.id, n]));
    for (const n of nodes) {
      const prev = byId.get(n.id);
      byId.set(n.id, prev ? { ...prev, ...Object.fromEntries(Object.entries(n).filter(([, v]) => v !== undefined && v !== null)) } : n);
    }
    this.cachedNodes = [...byId.values()];
    const edgeKey = (e) => `${e.sourceId}\x00${e.targetId}\x00${e.kind}`;
    const byEdge = new Map(this.cachedEdges.map((e) => [edgeKey(e), e]));
    for (const e of edges)
      byEdge.set(edgeKey(e), e);
    this.cachedEdges = [...byEdge.values()];
    if (this.cachedNodes.length > 0 || this.cachedEdges.length > 0)
      this.built = true;
  }
}

// src/hunter/graph/interface.ts
class GraphError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = code;
    this.code = code;
  }
}

class AdapterFailedError extends GraphError {
  command;
  detail;
  constructor(command, detail) {
    super("ADAPTER_FAILED", `ADAPTER_FAILED: command=${command} detail=${detail}`);
    this.command = command;
    this.detail = detail;
  }
}

class AdapterParseError extends GraphError {
  section;
  detail;
  constructor(section, detail) {
    super("ADAPTER_PARSE_ERROR", `ADAPTER_PARSE_ERROR: section=${section} detail=${detail}`);
    this.section = section;
    this.detail = detail;
  }
}

class GraphEmptyError extends GraphError {
  detail;
  constructor(detail) {
    super("GRAPH_EMPTY", `GRAPH_EMPTY: detail=${detail}`);
    this.detail = detail;
  }
}
function adapterFailed(command, detail) {
  return new AdapterFailedError(command, detail);
}
function adapterParseError(section, detail) {
  return new AdapterParseError(section, detail);
}
function graphEmpty(detail) {
  return new GraphEmptyError(detail);
}
function selectAdapter(profile) {
  if (!profile || typeof profile?.graph?.substrate !== "string") {
    throw adapterFailed(`substrate=${String(profile?.graph?.substrate)}`, "profile.graph or profile.graph.substrate is missing or not a string \u2014 set graph.substrate to corbell or graphify.");
  }
  if (profile.graph.substrate === "native-ast") {
    throw adapterFailed(`substrate='native-ast'`, "REMOVED: the native-ast fallback was ripped out per the operator ruling \u2014 corbell is the hard dependency. Install corbell (pip install git+https://github.com/Corbell-AI/Corbell.git into a py3.11+ venv, or set CORBELL_BIN) or fix graph.binaryPath. No fallback exists.");
  }
  if (profile.graph.substrate === "ix") {
    throw adapterFailed("substrate=ix", "REMOVED in the OMP port: the ix adapter is excluded (manifest #12); corbell is the substrate \u2014 set graph.substrate=corbell.");
  }
  switch (profile.graph.substrate) {
    case "corbell":
      return new CorbellAdapter(profile);
    case "graphify":
      return new GraphifyAdapter(profile);
    default:
      throw adapterFailed(`substrate=${String(profile.graph.substrate)}`, "no adapter for the selected substrate");
  }
}

// src/hunter/graph/graphify-adapter.ts
var GRAPHIFY_OUT_ENV = "GRAPHIFY_OUT";
var GRAPHIFY_OUT_DEFAULT = "graphify-out/graph.json";
function resolveGraphifyOut(profile, override, env = process.env) {
  const root = profile?.project.root ? path14.resolve(profile.project.root) : process.cwd();
  const pick = typeof override === "string" && override.length > 0 ? override : typeof profile?.graph?.graphifyOut === "string" && profile.graph.graphifyOut.length > 0 ? profile.graph.graphifyOut : typeof env[GRAPHIFY_OUT_ENV] === "string" && env[GRAPHIFY_OUT_ENV].length > 0 ? env[GRAPHIFY_OUT_ENV] : GRAPHIFY_OUT_DEFAULT;
  return path14.isAbsolute(pick) ? pick : path14.resolve(root, pick);
}
function statAndReadGraphJson(graphPath) {
  let size = 0;
  try {
    size = fs14.statSync(graphPath).size;
  } catch (e) {
    throw new Error(`GRAPHIFY_STAT_FAILED:${graphPath}:${e instanceof Error ? e.message : String(e)}`);
  }
  if (size === 0)
    throw graphEmpty(`graphify graph.json is empty (0 bytes at ${graphPath})`);
  if (size > GRAPH_LOAD_BUDGET_BYTES) {
    throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${size} bytes (> ${GRAPH_LOAD_BUDGET_BYTES} budget). Fix: scope/extract a subtree or lower the graph cardinality.`);
  }
  const text = fs14.readFileSync(graphPath, "utf8");
  if (Buffer.byteLength(text, "utf8") > GRAPH_LOAD_BUDGET_BYTES) {
    throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json grew past the budget between stat and read (${Buffer.byteLength(text, "utf8")} bytes).`);
  }
  return { text, size };
}
function loadGraphifyFileSync(graphPath, rootOverride) {
  let text;
  try {
    text = statAndReadGraphJson(graphPath).text;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("GRAPHIFY_STAT_FAILED:")) {
      throw new Error(`GRAPHIFY_NOT_WARM:no-graph at ${graphPath} (rebuild with: bun scripts/graphify-build.ts --target '${path14.dirname(path14.dirname(graphPath))}')`);
    }
    throw e;
  }
  let raw;
  try {
    raw = parseGraphJsonGuarded(text);
  } catch (e) {
    throw new Error(`GRAPHIFY_EXTRACT_FAILED: graph.json parse failed \u2014 ${e instanceof Error ? e.message : String(e)}`);
  }
  return normalizeGraphifyGraph(raw, { root: rootOverride ?? path14.dirname(path14.dirname(graphPath)) });
}
function normalizeGraphifyGraph(raw, opts) {
  const rawNodes = Array.isArray(raw["nodes"]) ? raw["nodes"] : [];
  const rawLinkSrc = Array.isArray(raw["links"]) ? raw["links"] : Array.isArray(raw["edges"]) ? raw["edges"] : [];
  const rawLinks = rawLinkSrc;
  const seenIds = new Set;
  const nodeIdByRaw = new Map;
  let dropped = 0;
  const nodes = [];
  const keptRaw = [];
  for (const n of rawNodes) {
    if (n === null || typeof n !== "object" || Array.isArray(n)) {
      dropped++;
      continue;
    }
    const r = n;
    let id = String(r["id"] ?? r["label"] ?? "");
    const label = String(r["label"] ?? r["id"] ?? "");
    if (id.length === 0) {
      dropped++;
      continue;
    }
    const original = id;
    if (seenIds.has(id)) {
      let k = 2;
      while (seenIds.has(`${original}#${k}`))
        k++;
      id = `${original}#${k}`;
    }
    seenIds.add(id);
    nodeIdByRaw.set(r, id);
    keptRaw.push(r);
    nodes.push({
      id,
      label,
      type: String(r["file_type"] ?? r["type"] ?? "unknown"),
      file: String(r["source_file"] ?? r["file"] ?? ""),
      data: r
    });
  }
  if (dropped > 0)
    giLog("WARN", "graphify-adapter", `normalize: dropped ${dropped} id-less rows (no shared "" collision)`);
  let edgeDropped = 0;
  const edges = rawLinks.filter((e) => {
    if (e === null || typeof e !== "object" || Array.isArray(e)) {
      edgeDropped++;
      return false;
    }
    return true;
  }).map((e) => {
    const src = String(e["source"] ?? e["src"] ?? "");
    const dst = String(e["target"] ?? e["dst"] ?? "");
    const relation = String(e["relation"] ?? "unknown");
    const rawConf = String(e["confidence"] ?? "EXTRACTED");
    return { src, dst, relation, confidence: rawConf === "INFERRED" ? "INFERRED" : "EXTRACTED" };
  });
  const communityMap = new Map;
  for (const n of rawNodes) {
    if (n === null || typeof n !== "object" || Array.isArray(n))
      continue;
    const r = n;
    const cid = r["community"];
    if (typeof cid === "number") {
      const arr = communityMap.get(cid) ?? [];
      arr.push(r);
      communityMap.set(cid, arr);
    }
  }
  const communities = [];
  for (const [cid, memberObjs] of communityMap.entries()) {
    const members = memberObjs.map((r) => nodeIdByRaw.get(r)).filter((id) => typeof id === "string" && id.length > 0);
    if (members.length === 0)
      continue;
    communities.push({ id: String(cid), label: `Community ${cid}`, members, size: members.length });
  }
  const degree = new Map;
  for (const e of edges) {
    degree.set(e.src, (degree.get(e.src) ?? 0) + 1);
    degree.set(e.dst, (degree.get(e.dst) ?? 0) + 1);
  }
  const godNodes = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  let anchorUnverified = 0;
  if (opts?.root) {
    const rootReal = (() => {
      try {
        return fs14.realpathSync(opts.root);
      } catch {
        return null;
      }
    })();
    if (rootReal === null) {
      return { nodes, edges, communities, godNodes };
    }
    for (let i = 0;i < nodes.length; i++) {
      const n = nodes[i];
      const f = n.file;
      if (f.length === 0)
        continue;
      const abs = path14.isAbsolute(f) ? path14.normalize(f) : path14.resolve(rootReal, f);
      let real = abs;
      try {
        real = fs14.realpathSync(abs);
      } catch {
        anchorUnverified += 1;
      }
      const rel = path14.relative(rootReal, real);
      const contained = isContainedRel(rel);
      const safeFile = contained ? rel.split(path14.sep).join("/") : "";
      if (safeFile !== n.file) {
        nodes[i] = { ...n, file: safeFile };
        const raw = keptRaw[i];
        const at = nodeIdByRaw.get(raw);
        if (at === n.id)
          nodeIdByRaw.set(raw, nodes[i].id);
      }
    }
  }
  if (anchorUnverified > 0) {
    giLog("WARN", "graphify-adapter", `normalize: ${anchorUnverified} anchor(s) kept on their LEXICAL path \u2014 realpath unprovable (symlink containment unverified; the row stays visible rather than vanishing)`);
  }
  return { nodes, edges, communities, godNodes };
}
function scopeBuildToProfile(nodes, edges, root, scopeDirs) {
  const norm = (s) => s.replace(/\/+$/, "");
  const scopes = scopeDirs.map(norm).map((s) => s.toLowerCase()).filter((s) => s.length > 0);
  let rootCanon = null;
  try {
    rootCanon = fs14.realpathSync(root);
  } catch (e) {
    console.warn(`[graphify-adapter] scope root unresolvable (fail-closed, ${nodes.length} rows dropped): ${e instanceof Error ? e.message : String(e)}`);
    rootCanon = null;
  }
  if (rootCanon === null) {
    return { nodes: [], edges: [], dropped: nodes.length };
  }
  const inScope = (f) => {
    if (f === undefined || f.length === 0)
      return false;
    let rel = "";
    try {
      rel = containedRel(rootCanon, f).toLowerCase();
    } catch {
      rel = "";
    }
    if (rel.length === 0)
      return false;
    return scopes.some((s) => rel === s || rel.startsWith(`${s}/`));
  };
  const nodesIn = nodes.filter((n) => inScope(n.file ?? undefined));
  const idSet = new Set(nodesIn.map((n) => n.id));
  const edgesIn = edges.filter((e) => idSet.has(e.sourceId) && idSet.has(e.targetId));
  return { nodes: nodesIn, edges: edgesIn, dropped: nodes.length - nodesIn.length };
}
var KNOWN_NODE_KINDS2 = ["class", "function", "method", "module", "stage", "rule", "file"];
function graphifyKindToNodeKind(rawType, node) {
  const key = String(rawType ?? "").toLowerCase().trim();
  switch (key) {
    case "file":
      return "file";
    case "function":
      return "function";
    case "method":
      return "function";
    case "class":
      return "class";
    case "module":
      return "module";
    case "import":
      return "module";
    case "interface":
    case "property":
      return "class";
    case "service":
    case "datastore":
    case "queue":
      return "module";
    case "flow":
      return "function";
    default:
      break;
  }
  if (key !== "code" && key !== "" && key !== "unknown") {
    if (KNOWN_NODE_KINDS2.includes(key))
      return key;
  }
  const data = node?.data ?? {};
  if (data["_callable"] === true)
    return "function";
  const label = String(node?.label ?? "");
  if (/\(\)$/.test(label) || /^(function|method|def)\s+/i.test(label))
    return "function";
  if (/\.(ts|js|mjs|cjs|tsx|jsx|py|json|yaml|yml|md|toml)$/i.test(label))
    return "file";
  const file = String(node?.file ?? "");
  if (label.length > 0 && file.length > 0 && file.endsWith(label))
    return "file";
  return "file";
}
function graphifyRelationToEdgeKind(relation) {
  const key = String(relation ?? "").toLowerCase().trim();
  switch (key) {
    case "calls":
    case "call":
      return "calls";
    case "imports":
    case "imports_from":
    case "import":
      return "imports";
    case "inherits":
    case "implements":
      return "implements";
    case "extends":
      return "extends";
    case "uses":
    case "wires":
      return "wires";
    case "contains":
    case "references":
    case "traces-to":
    case "traces_to":
      return "traces-to";
    case "constrains":
      return "constrains";
    case "awaits":
    case "await":
      return "awaits";
    default:
      giLog("DEBUG", "graphify-adapter", `unknown edge relation '${relation}' -> 'traces-to' (the fallback)`);
      return "traces-to";
  }
}
function graphifyKindToTyped(kind) {
  switch (kind) {
    case "file":
      return "File";
    case "function":
    case "method":
      return "Function";
    case "class":
    case "rule":
      return "Class";
    case "module":
    case "stage":
      return "Module";
    default:
      return "EvidenceFile";
  }
}
function graphifyPredicateToTyped(relation) {
  const key = String(relation ?? "").toLowerCase().trim();
  switch (key) {
    case "calls":
    case "call":
      return "calls";
    case "imports":
    case "imports_from":
    case "import":
      return "imports";
    case "inherits":
    case "implements":
      return "implements";
    case "uses":
    case "wires":
      return "wraps";
    case "references":
    case "traces-to":
    case "traces_to":
    case "contains":
      return "declares";
    case "returns":
    case "constrains":
    case "shouldbe":
    case "should-be":
      return "shouldBe";
    case "awaits":
    case "await":
      return "awaits";
    case "extends":
      return "extends";
    default:
      giLog("WARN", "graphify-adapter", `unknown typed predicate '${relation}' -> 'declares' (typo becomes declares \u2014 fix the source)`);
      return "declares";
  }
}
function parseLineValue(v) {
  if (typeof v === "number" && Number.isFinite(v) && v >= 1)
    return Math.floor(v);
  if (typeof v === "string") {
    const m = /^L?\s*(\d+)\s*$/.exec(v.trim());
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n >= 1)
        return Math.floor(n);
    }
  }
  return;
}
function rawSourceLocation(x) {
  return x !== null && typeof x === "object" ? x["source_location"] : undefined;
}
function resolveGraphifyLine(node, edge, context = "") {
  const data = node.data ?? {};
  const candidates = [
    node.line,
    data["line"],
    data["line_start"],
    data["line_end"],
    node.source_location,
    data["source_location"],
    edge?.source_location,
    edge?.metadata?.["line"]
  ];
  for (const c of candidates) {
    const n = parseLineValue(c);
    if (n !== undefined)
      return n;
  }
  return null;
}
function tryResolveGraphifyLine(node, edge) {
  const n = resolveGraphifyLine(node, edge ?? null, "");
  return n === null ? undefined : n;
}
function containedRel(root, f) {
  let rootCanon;
  try {
    rootCanon = fs14.realpathSync(root);
  } catch {
    throw new Error(`CONTAINMENT_ROOT_UNRESOLVABLE: ${root} cannot be canonicalized \u2014 refusing all anchors`);
  }
  const abs = path14.isAbsolute(f) ? f : path14.resolve(rootCanon, f);
  let real = abs;
  try {
    real = fs14.realpathSync(abs);
  } catch {}
  const rel = path14.relative(rootCanon, real).split(path14.sep).join("/");
  if (rel.length === 0 || rel.split("/").includes(".."))
    return "";
  return rel;
}
function isContainedRel(rel) {
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${path14.sep}`) && !path14.isAbsolute(rel);
}
function graphifyEvidence(predicate, src, dst, file, line) {
  const anchor = file && file.length > 0 ? `${file}:${line}` : src;
  return `explicit: ${predicate} in source ${src}->${dst} @ ${anchor}`;
}
function mapGraphifyToTyped(nodes, edges, runTag) {
  const nodeRows = nodes.map((n) => {
    const line = resolveGraphifyLine({ line: n.line ?? undefined, data: n.data ?? {}, source_location: rawSourceLocation(n) }, null, n.id);
    return {
      canonicalId: n.id,
      kind: graphifyKindToTyped(n.kind),
      label: n.name,
      file: typeof n.file === "string" ? n.file : null,
      line,
      run: runTag
    };
  });
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  let linelessEdgesDropped = 0;
  const edgeRows = edges.flatMap((e) => {
    const src = nodesById.get(e.sourceId);
    const line = e.line ?? src?.line ?? tryResolveGraphifyLine({ data: src?.data ?? {}, source_location: rawSourceLocation(src) }, e);
    if (line == null) {
      linelessEdgesDropped++;
      return [];
    }
    return {
      srcCanonical: e.sourceId,
      dstCanonical: e.targetId,
      predicate: graphifyPredicateToTyped(e.kind),
      evidence: graphifyEvidence(graphifyPredicateToTyped(e.kind), e.sourceId, e.targetId, src?.file ?? null, line),
      run: runTag
    };
  });
  if (linelessEdgesDropped > 0)
    console.warn(`[gi-omp] mapGraphifyToTyped: dropped ${linelessEdgesDropped} lineless edge(s) (counted, never silent)`);
  return { nodeRows, edgeRows };
}
function projectGraphifyGraph(graph, root) {
  const rootReal = (() => {
    try {
      return fs14.realpathSync(root);
    } catch {
      return null;
    }
  })();
  const nodes = graph.nodes.map((n) => {
    const kind = graphifyKindToNodeKind(n.type, n);
    let file;
    if (rootReal !== null && n.file && n.file.length > 0) {
      const abs = path14.isAbsolute(n.file) ? n.file : path14.resolve(rootReal, n.file);
      let real = abs;
      try {
        real = fs14.realpathSync(abs);
      } catch {}
      const rel = path14.relative(rootReal, real);
      const contained = isContainedRel(rel);
      if (contained)
        file = rel.split(path14.sep).join("/");
    }
    const data = n.data ?? {};
    const line = tryResolveGraphifyLine({ data, source_location: rawSourceLocation(n) });
    const name = n.label && n.label.length > 0 ? n.label : n.id;
    return {
      id: `graphify:${n.id}`,
      kind,
      name,
      file,
      line,
      lineage: "CODE_DERIVED",
      source: file && line !== undefined ? `${file}:${line}` : file ?? `graphify:${n.id}`,
      data
    };
  });
  const nodeByRawId = new Map(graph.nodes.map((n) => [n.id, n]));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = [];
  let dangling = 0;
  let danglingNoLine = 0;
  for (const e of graph.edges) {
    const rawE = e;
    const srcId = String(rawE["source"] ?? rawE["src"] ?? "");
    const dstId = String(rawE["target"] ?? rawE["dst"] ?? "");
    const src = `graphify:${srcId}`;
    const dst = `graphify:${dstId}`;
    if (srcId === "" || dstId === "" || !byId.has(src) || !byId.has(dst)) {
      dangling++;
      continue;
    }
    const rawEdge = e;
    const edgeLoc = rawEdge["source_location"];
    const srcNode = byId.get(src);
    const srcFile = srcNode?.file;
    const srcRaw = nodeByRawId.get(srcId);
    const line = parseLineValue(edgeLoc) ?? srcNode?.line ?? tryResolveGraphifyLine({
      data: srcRaw?.data ?? {},
      source_location: rawSourceLocation(srcRaw)
    }, rawEdge);
    if (line === undefined)
      danglingNoLine++;
    edges.push({
      sourceId: src,
      targetId: dst,
      kind: graphifyRelationToEdgeKind(e.relation),
      lineage: "CODE_DERIVED",
      file: srcFile,
      line
    });
  }
  if (dangling + danglingNoLine > 0)
    giLog("WARN", "graphify-adapter", `project: dropped ${dangling} dangling edges; kept ${danglingNoLine} lineless-edge rows with line undefined (counted, never silent, never invented)`);
  return { nodes, edges };
}
function countLineage2(nodes, edges) {
  const count = (l, list) => list.filter((n) => n.lineage === l).length;
  return {
    spec: count("SPEC_DERIVED", nodes) + count("SPEC_DERIVED", edges),
    code: count("CODE_DERIVED", nodes) + count("CODE_DERIVED", edges),
    hybrid: count("HYBRID", nodes) + count("HYBRID", edges)
  };
}

class GraphifyAdapter {
  profile;
  cachedNodes = [];
  cachedEdges = [];
  cachedRaw = null;
  lastGraphPath = null;
  built = false;
  buildInFlight = false;
  constructor(profile) {
    this.profile = profile;
  }
  async build(profile) {
    if (this.buildInFlight) {
      throw adapterFailed("graphify build", "ADAPTER_BUSY: a build() is already in flight on this adapter \u2014 serialize builds, one at a time");
    }
    this.buildInFlight = true;
    this.built = false;
    const t0 = Date.now();
    let scopedNodes = null;
    let scopedEdges = null;
    try {
      this.profile = profile;
      const root = path14.resolve(profile.project.root);
      const graphPath = resolveGraphifyOut(profile);
      if (!fs14.existsSync(graphPath)) {
        throw new Error(`GRAPHIFY_NOT_WARM:no-graph at ${graphPath} (rebuild with: bun scripts/graphify-build.ts --target '${root}')`);
      }
      let text;
      let size;
      try {
        ({ text, size } = statAndReadGraphJson(graphPath));
      } catch (e) {
        if (e instanceof Error && e.message.startsWith(`GRAPHIFY_STAT_FAILED:${graphPath}:`)) {
          throw new Error(`GRAPHIFY_NOT_WARM:unreadable ${graphPath}: ${e.message.slice(`GRAPHIFY_STAT_FAILED:${graphPath}:`.length, `GRAPHIFY_STAT_FAILED:${graphPath}:`.length + 80)}`);
        }
        throw e;
      }
      if (size > GRAPH_PARSE_YIELD_BYTES) {
        await new Promise((resolve) => setImmediate(() => resolve()));
      }
      let raw;
      try {
        raw = parseGraphJsonGuarded(text);
      } catch (e) {
        throw adapterParseError("graphify graph.json", `graph.json parse failed: ${e instanceof Error ? e.message : String(e)}`);
      }
      const graph = normalizeGraphifyGraph(raw, { root: path14.resolve(profile.project.root) });
      const scopeDirs = profile.graph?.scope ?? ["src"];
      const projected = projectGraphifyGraph(graph, root);
      const filtered = scopeBuildToProfile(projected.nodes, projected.edges, root, scopeDirs);
      if (filtered.dropped > 0) {
        giLog("WARN", "graphify-adapter", `build: scope filter dropped ${filtered.dropped} out-of-scope row(s) (scope=${scopeDirs.join(",")})`);
      }
      scopedNodes = filtered.nodes;
      scopedEdges = filtered.edges;
      if (scopedNodes.length === 0) {
        throw graphEmpty(`graphify graph build produced zero in-scope nodes (graph.json at ${graphPath}; scope=${scopeDirs.join(",")})`);
      }
      this.cachedNodes = scopedNodes;
      this.cachedEdges = scopedEdges;
      this.cachedRaw = graph;
      this.lastGraphPath = graphPath;
      this.built = true;
      this.reindex();
    } finally {
      this.buildInFlight = false;
    }
    return {
      nodes: scopedNodes,
      edges: scopedEdges,
      durationMs: Date.now() - t0,
      adapter: "graphify",
      lineage: countLineage2(scopedNodes, scopedEdges),
      command: "graphify extract --code-only --no-cluster"
    };
  }
  raw() {
    return this.cachedRaw;
  }
  graphPath() {
    return this.lastGraphPath;
  }
  byIdIdx = new Map;
  byNameIdx = new Map;
  reindex() {
    this.byIdIdx = new Map(this.cachedNodes.map((n) => [n.id, n]));
    this.byNameIdx = new Map;
    for (const n of this.cachedNodes)
      if (!this.byNameIdx.has(n.name))
        this.byNameIdx.set(n.name, n);
  }
  resolveNodeId(symbol) {
    if (symbol.startsWith("graphify:"))
      return symbol;
    const byName = this.byNameIdx.get(symbol);
    if (byName)
      return byName.id;
    for (const n of this.cachedNodes) {
      if (n.id.endsWith(`::${symbol}`) || n.id.endsWith(`:${symbol}`))
        return n.id;
    }
    giLog("WARN", "graphify-adapter", `resolveNodeId: symbol '${symbol}' matched no node \u2014 phantom id 'graphify:${symbol}' (callers read empty, never wrong)`);
    return `graphify:${symbol}`;
  }
  nodeById(id) {
    return this.byIdIdx.get(id);
  }
  ensureBuilt() {
    if (!this.built) {
      throw adapterFailed("graphify query", "no graph built \u2014 call build() first (the query verbs read the built graph)");
    }
  }
  whoCalls(symbol, onLineless) {
    this.ensureBuilt();
    const target = this.resolveNodeId(symbol);
    const out = [];
    for (const e of this.cachedEdges.filter((e2) => e2.kind === "calls" && e2.targetId === target)) {
      const caller = this.nodeById(e.sourceId);
      const line = e.line ?? caller?.line;
      if (line === undefined || line === null) {
        onLineless?.(`LINELESS_NODE skipped: whoCalls edge ${e.sourceId}->${e.targetId} (edge + caller both lineless)`);
        continue;
      }
      out.push({ file: caller?.file ?? this.profile.project.root, line, caller: caller?.name ?? e.sourceId });
    }
    return out;
  }
  buildSync(graphPath, profileOverride) {
    if (this.buildInFlight) {
      throw adapterFailed("graphify buildSync", "ADAPTER_BUSY: an async build() is in flight on this adapter \u2014 serialize builds, one at a time");
    }
    this.buildInFlight = true;
    this.built = false;
    try {
      const effectiveProfile = profileOverride ?? this.profile;
      const root = path14.resolve(effectiveProfile.project.root);
      const graph = loadGraphifyFileSync(graphPath, root);
      if (graph.nodes.length === 0) {
        throw graphEmpty(`graphify graph produced zero nodes (graph.json at ${graphPath} carries no nodes)`);
      }
      const raw = projectGraphifyGraph(graph, root);
      const filtered = scopeBuildToProfile(raw.nodes, raw.edges, root, effectiveProfile.graph?.scope ?? ["src"]);
      if (filtered.dropped > 0) {
        giLog("WARN", "graphify-adapter", `buildSync: scope filter dropped ${filtered.dropped} out-of-scope row(s)`);
      }
      if (filtered.nodes.length === 0) {
        throw graphEmpty(`graphify graph build produced zero in-scope nodes (graph.json at ${graphPath}; scope=${(effectiveProfile.graph?.scope ?? ["src"]).join(",")})`);
      }
      this.lastGraphPath = graphPath;
      this.cachedNodes = filtered.nodes;
      this.cachedEdges = filtered.edges;
      this.cachedRaw = graph;
      this.built = true;
      this.reindex();
      return { nodes: filtered.nodes, edges: filtered.edges, graph };
    } finally {
      this.buildInFlight = false;
    }
  }
  chain(id) {
    this.ensureBuilt();
    const start = this.resolveNodeId(id);
    const bySource = new Map;
    for (const e of this.cachedEdges) {
      if (e.kind !== "calls")
        continue;
      const arr = bySource.get(e.sourceId) ?? [];
      arr.push(e);
      bySource.set(e.sourceId, arr);
    }
    const steps = [];
    const seen = new Set([start]);
    const queue = [start];
    let linelessSkipped = 0;
    while (queue.length > 0) {
      const from = queue.shift();
      for (const e of bySource.get(from) ?? []) {
        const caller = this.nodeById(e.sourceId);
        const callee = this.nodeById(e.targetId);
        const line = e.line ?? callee?.line;
        if (line === undefined || line === null) {
          linelessSkipped += 1;
          continue;
        }
        steps.push({
          from: caller?.name ?? e.sourceId,
          to: callee?.name ?? e.targetId,
          kind: e.kind,
          file: callee?.file ?? this.profile.project.root,
          line
        });
        if (!seen.has(e.targetId)) {
          seen.add(e.targetId);
          queue.push(e.targetId);
        }
      }
    }
    if (linelessSkipped > 0)
      giLog("WARN", "graphify-adapter", `chain: skipped ${linelessSkipped} lineless step(s) (counted, never silent)`);
    return steps;
  }
  imports(module) {
    this.ensureBuilt();
    const start = this.resolveNodeId(module);
    const out = [];
    let linelessSkipped = 0;
    for (const e of this.cachedEdges) {
      if (e.kind !== "imports" || e.sourceId !== start)
        continue;
      const src = this.nodeById(e.sourceId);
      const dst = this.nodeById(e.targetId);
      const line = e.line ?? src?.line;
      if (line === undefined || line === null) {
        linelessSkipped += 1;
        continue;
      }
      out.push({ from: src?.name ?? e.sourceId, to: dst?.name ?? e.targetId, file: src?.file ?? this.profile.project.root, line });
    }
    if (linelessSkipped > 0)
      giLog("WARN", "graphify-adapter", `imports: skipped ${linelessSkipped} lineless edge(s) (counted, never silent)`);
    return out;
  }
  awaits(symbol) {
    this.ensureBuilt();
    const start = this.resolveNodeId(symbol);
    const out = [];
    let linelessSkipped = 0;
    for (const e of this.cachedEdges) {
      if (e.kind !== "awaits" || e.sourceId !== start)
        continue;
      const src = this.nodeById(e.sourceId);
      const dst = this.nodeById(e.targetId);
      const aline = e.line ?? src?.line;
      if (aline === undefined || aline === null) {
        linelessSkipped += 1;
        continue;
      }
      out.push({ from: src?.name ?? e.sourceId, to: dst?.name ?? e.targetId, file: src?.file ?? this.profile.project.root, line: aline });
    }
    if (linelessSkipped > 0)
      giLog("WARN", "graphify-adapter", `awaits: skipped ${linelessSkipped} lineless edge(s) (counted, never silent)`);
    return out;
  }
  unwired() {
    this.ensureBuilt();
    const callTargets = new Set(this.cachedEdges.filter((e) => e.kind === "calls").map((e) => e.targetId));
    const out = [];
    let linelessSkipped = 0;
    for (const n of this.cachedNodes) {
      if (!((n.kind === "function" || n.kind === "class") && !callTargets.has(n.id)))
        continue;
      if (n.line === undefined || n.line === null) {
        linelessSkipped += 1;
        continue;
      }
      out.push({ id: n.id, name: n.name, file: n.file ?? this.profile.project.root, line: n.line });
    }
    if (linelessSkipped > 0)
      giLog("WARN", "graphify-adapter", `unwired: skipped ${linelessSkipped} lineless row(s) (counted, never silent)`);
    return out;
  }
  nodes(kind) {
    this.ensureBuilt();
    return kind === undefined ? [...this.cachedNodes] : this.cachedNodes.filter((n) => n.kind === kind);
  }
}

// src/omp/populate-graphify.ts
var GRAPHIFY_FRESHNESS_BUDGET = 500;
function graphifyOutPath(root, profile) {
  if (profile)
    return resolveGraphifyOut(profile);
  return resolveGraphifyOut({ project: { root: path15.resolve(root) } });
}
function containedScopeTarget(root, rel) {
  let rootCanon = null;
  try {
    rootCanon = fs15.realpathSync(root);
  } catch {
    return null;
  }
  const target = path15.isAbsolute(rel) ? rel : path15.join(rootCanon, rel);
  try {
    const real = fs15.realpathSync(target);
    const r = path15.relative(rootCanon, real);
    if (r === "" || !r.split(path15.sep).includes("..") && !path15.isAbsolute(r))
      return target;
    return null;
  } catch {
    return null;
  }
}
function isGraphifyCheckoutFreshFor(root, graphPath, scope = ["src"], excludes = []) {
  if (scope.length === 0)
    return { fresh: false, reason: "stale-unscooped" };
  if (!fs15.existsSync(graphPath))
    return { fresh: false, reason: "absent" };
  let st;
  try {
    st = fs15.statSync(graphPath);
  } catch {
    return { fresh: false, reason: "absent" };
  }
  const warmMtime = st.mtimeMs;
  const hashPath0 = graphHashSidecarPath(graphPath);
  let sidecarHash = null;
  try {
    sidecarHash = fs15.readFileSync(hashPath0, "utf8").trim() || null;
  } catch {
    sidecarHash = null;
  }
  if (sidecarHash) {
    let currentHash;
    try {
      currentHash = computeSourceHash(root, scope, excludes);
    } catch (hashErr) {
      return { fresh: false, reason: `stale-hash-error: ${hashErr instanceof Error ? hashErr.message.slice(0, 80) : String(hashErr).slice(0, 80)}` };
    }
    if (currentHash !== sidecarHash)
      return { fresh: false, reason: "stale-content" };
    return { fresh: true, reason: "fresh" };
  }
  let newest = 0;
  let filesSeen = 0;
  let exhausted = false;
  let walkFailed = false;
  const budget = { n: GRAPHIFY_FRESHNESS_BUDGET };
  const visited = new Set;
  const walk = (dir) => {
    if (budget.n <= 0) {
      exhausted = true;
      return;
    }
    let realDir;
    try {
      realDir = fs15.realpathSync(dir);
    } catch {
      walkFailed = true;
      return;
    }
    if (visited.has(realDir))
      return;
    visited.add(realDir);
    let entries;
    try {
      entries = fs15.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (budget.n <= 0) {
        exhausted = true;
        return;
      }
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "dist", "build", "coverage", "__pycache__", "graphify-out", ".omp"].includes(entry.name))
          continue;
        if (excludes.includes(entry.name))
          continue;
        walk(path15.join(dir, entry.name));
      } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        if (excludes.includes(entry.name))
          continue;
        budget.n--;
        try {
          const m = fs15.statSync(path15.join(dir, entry.name)).mtimeMs;
          if (m > newest)
            newest = m;
          filesSeen += 1;
        } catch {}
      }
    }
  };
  for (const rel of scope) {
    const target = containedScopeTarget(root, rel);
    if (target === null)
      continue;
    let stTarget = null;
    try {
      stTarget = fs15.statSync(target);
    } catch {
      stTarget = null;
    }
    if (stTarget?.isFile()) {
      const base = path15.basename(target);
      if (excludes.includes(base))
        continue;
      if (stTarget.mtimeMs > newest)
        newest = stTarget.mtimeMs;
      filesSeen += 1;
      continue;
    }
    if (stTarget?.isDirectory())
      walk(target);
  }
  if (walkFailed)
    return { fresh: false, reason: "stale-read-failed" };
  if (filesSeen === 0)
    return { fresh: false, reason: "stale-unscooped" };
  if (exhausted)
    return { fresh: false, reason: "stale-budget" };
  if (newest <= warmMtime)
    return { fresh: true, reason: "fresh" };
  return { fresh: false, reason: "stale" };
}
function graphHashSidecarPath(graphPath) {
  return /\.json$/.test(graphPath) ? graphPath.replace(/\.json$/, ".graph_hash") : `${graphPath}.graph_hash`;
}
var GRAPH_HASH_WHOLE_FILE_MAX = 65536;
function hashSourceTree(root, scope, excludes, budgetN) {
  const hash = createHash3("sha256");
  const budget = { n: budgetN };
  let exhausted = false;
  const hashFile = (abs, anchor, statSize) => {
    let size = statSize;
    let fd = null;
    try {
      fd = fs15.openSync(abs, "r");
      size = fs15.fstatSync(fd).size;
      let read = 0;
      if (size <= GRAPH_HASH_WHOLE_FILE_MAX) {
        const buf = Buffer.alloc(size);
        read = fs15.readSync(fd, buf, 0, size, 0);
        hash.update(`${anchor}\x00${read}\x00`);
        hash.update(buf.subarray(0, read));
      } else {
        const CHUNK = 65536;
        const MAX_HASH_BYTES = 8 * 1024 * 1024;
        hash.update(`${anchor}\x00${size}\x00`);
        let offset = 0;
        const chunk = Buffer.alloc(CHUNK);
        while (offset < size && offset < MAX_HASH_BYTES) {
          const want = Math.min(CHUNK, size - offset, MAX_HASH_BYTES - offset);
          const n = fs15.readSync(fd, chunk, 0, want, offset);
          if (n <= 0)
            break;
          hash.update(chunk.subarray(0, n));
          offset += n;
        }
        read = offset;
        if (offset < size)
          hash.update(`capped@${offset}
`);
      }
      if (read < Math.min(size, GRAPH_HASH_WHOLE_FILE_MAX) && size <= GRAPH_HASH_WHOLE_FILE_MAX)
        hash.update(`short-read
`);
    } finally {
      if (fd !== null)
        fs15.closeSync(fd);
    }
  };
  const visitedDirs = new Set;
  const walk = (dir, prefix) => {
    if (budget.n <= 0) {
      exhausted = true;
      return;
    }
    let realDir;
    try {
      realDir = fs15.realpathSync(dir);
    } catch {
      hash.update(`skip-dir:${prefix}
`);
      return;
    }
    if (visitedDirs.has(realDir)) {
      hash.update(`skip-cycle:${prefix}
`);
      return;
    }
    visitedDirs.add(realDir);
    let entries;
    try {
      entries = fs15.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (budget.n <= 0) {
        exhausted = true;
        return;
      }
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "dist", "build", "coverage", "__pycache__", "graphify-out", ".omp"].includes(entry.name))
          continue;
        if (excludes.includes(entry.name))
          continue;
        walk(path15.join(dir, entry.name), prefix + entry.name + "/");
      } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        if (excludes.includes(entry.name)) {
          hash.update(`skip-excluded:${prefix}${entry.name}
`);
          continue;
        }
        budget.n--;
        try {
          const stat = fs15.statSync(path15.join(dir, entry.name));
          hashFile(path15.join(dir, entry.name), `${prefix}${entry.name}`, stat.size);
        } catch {
          hash.update(`skip:${prefix}${entry.name}
`);
        }
      }
    }
  };
  hash.update(`scope=${scope.join(",")}
`);
  for (const rel of scope) {
    const target = containedScopeTarget(root, rel);
    if (target === null)
      continue;
    const base = path15.basename(target);
    if (excludes.includes(base))
      continue;
    try {
      const st = fs15.statSync(target);
      if (st.isFile())
        hashFile(target, rel, st.size);
      else if (st.isDirectory())
        walk(target, "");
    } catch {}
  }
  if (exhausted)
    hash.update(`gi-graph-hash:budget-exhausted
`);
  return hash.digest("hex");
}
function computeSourceHash(root, scope, excludes) {
  return hashSourceTree(root, scope, excludes, 500);
}
function minimalGraphifyProfile(root) {
  const resolved = path15.resolve(root);
  const slug = path15.basename(resolved).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "target";
  return {
    profileVersion: 1,
    project: {
      name: slug,
      root: resolved,
      languages: ["typescript"],
      entryPoints: ["src/main.ts"],
      build: "bun run build",
      test: "bun test"
    },
    graph: { substrate: "graphify", scope: ["src"], excludes: [] },
    rules: { corpus: [], bindings: {} },
    pipeline: { stages: [{ id: "s1", entry: "main", contract: "graphify-populate" }] },
    history: { failureLogs: [] },
    awareness: { docs: [] }
  };
}
function supersedeThenInsert(db, runTag, nodeRows, edgeRows, meta) {
  if (nodeRows.length === 0 && edgeRows.length === 0) {
    throw new Error("GRAPHIFY_WRITE_FAILED: refusing supersede-then-insert with zero rows (would wipe live data)");
  }
  if (db.inTransaction)
    throw new Error("GI_TXN_NESTED: supersedeThenInsert entered with an open transaction (caller owns it) \u2014 refusing to double-commit");
  try {
    db.exec("BEGIN IMMEDIATE;");
  } catch (beginErr) {
    const bmsg = beginErr instanceof Error ? beginErr.message : String(beginErr);
    if (/within a transaction/i.test(bmsg)) {
      throw new Error(`GI_TXN_NESTED: supersedeThenInsert entered with an open transaction (caller owns it) \u2014 refusing to double-commit (${bmsg})`);
    }
    throw beginErr;
  }
  try {
    if (nodeRows.length > 0) {
      db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
      insertForkNodesBatch(db, nodeRows);
    }
    if (edgeRows.length > 0) {
      db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
      insertForkEdgesBatch(db, edgeRows);
    }
    for (const [k, v] of meta) {
      db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [k, v]);
    }
    try {
      db.exec("COMMIT;");
    } catch (commitErr) {
      try {
        db.exec("ROLLBACK;");
      } catch {}
      throw commitErr;
    }
  } catch (e) {
    try {
      db.exec("ROLLBACK;");
    } catch {}
    throw e;
  }
}

// src/omp/populate-corbell.ts
var CORBELL_CHECKOUT_REL = ".omp/graph-intelligence/corbell-checkout/store.sqlite";
var CORBELL_FRESHNESS_BUDGET = 50000;
var CORBELL_PREDICATES = ["calls", "traces-to", "imports"];
function corbellCheckoutPath(root) {
  return path16.join(root, CORBELL_CHECKOUT_REL);
}
function warmStoreStat(p) {
  try {
    const st = fs16.statSync(p);
    return { mtimeMs: st.mtimeMs, size: st.size, ino: st.ino };
  } catch {
    return null;
  }
}
function warmStoreUnchanged(before, after) {
  if (!before || !after)
    return false;
  return before.mtimeMs === after.mtimeMs && before.size === after.size && before.ino === after.ino;
}
function isCorbellCheckoutFreshFor(root, warmPath) {
  if (!fs16.existsSync(warmPath))
    return { fresh: false, reason: "absent" };
  let st;
  try {
    st = fs16.statSync(warmPath);
  } catch {
    return { fresh: false, reason: "absent" };
  }
  if (st.size === 0)
    return { fresh: false, reason: "empty" };
  const warmMtime = st.mtimeMs;
  let newest = 0;
  let walkFailed = false;
  let exhausted = false;
  const budget = { n: CORBELL_FRESHNESS_BUDGET };
  const visited = new Set;
  const walk = (dir, depth = 0) => {
    if (budget.n <= 0) {
      exhausted = true;
      return;
    }
    if (depth > 256) {
      walkFailed = true;
      return;
    }
    let realDir;
    try {
      realDir = fs16.realpathSync(dir);
    } catch {
      walkFailed = true;
      return;
    }
    if (visited.has(realDir))
      return;
    visited.add(realDir);
    let entries;
    try {
      entries = fs16.readdirSync(dir, { withFileTypes: true });
    } catch {
      walkFailed = true;
      return;
    }
    for (const entry of entries) {
      if (budget.n <= 0) {
        exhausted = true;
        return;
      }
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "dist", "build", "coverage", "__pycache__", "corbell-data", ".omp"].includes(entry.name))
          continue;
        walk(path16.join(dir, entry.name), depth + 1);
      } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        budget.n--;
        try {
          const m = fs16.statSync(path16.join(dir, entry.name)).mtimeMs;
          if (m > newest)
            newest = m;
        } catch {
          walkFailed = true;
          return;
        }
      }
    }
  };
  walk(root);
  if (walkFailed)
    return { fresh: false, reason: "stale-read-failed" };
  if (exhausted)
    return { fresh: false, reason: "stale-budget" };
  if (newest > warmMtime)
    return { fresh: false, reason: "stale" };
  return { fresh: true, reason: "fresh" };
}
function populateFromCorbellCheckout(storePath, root, runTag) {
  const warmPath = corbellCheckoutPath(root);
  const stBefore = warmStoreStat(warmPath);
  const freshness = isCorbellCheckoutFreshFor(root, warmPath);
  if (!freshness.fresh) {
    return { ok: false, reason: `CORBELL_NOT_WARM:${freshness.reason}`, nodes: 0, edges: 0, checkoutPath: warmPath };
  }
  let rows = [];
  let edges = [];
  const MAX_WARM_ROWS = 50000;
  let src = null;
  try {
    src = new Database4(warmPath, { readonly: true });
    rows = src.query("SELECT canonical_id, kind, label, file, line FROM typed_nodes WHERE superseded_run IS NULL ORDER BY canonical_id LIMIT ?").all(MAX_WARM_ROWS + 1);
    edges = src.query("SELECT src_canonical, dst_canonical, predicate, evidence_quote, confidence FROM typed_edges WHERE superseded_run IS NULL ORDER BY src_canonical, dst_canonical, predicate LIMIT ?").all(MAX_WARM_ROWS * 3 + 1);
  } catch (e) {
    return { ok: false, reason: `CORBELL_NOT_WARM:unreadable:${e instanceof Error ? e.message.slice(0, 60) : String(e)}`, nodes: 0, edges: 0, checkoutPath: warmPath };
  } finally {
    try {
      src?.close();
    } catch {}
  }
  let skippedInvalid = 0;
  const validRows = rows.filter((r) => {
    const validId = typeof r.canonical_id === "string" && r.canonical_id.length > 0;
    const validKind = typeof r.kind === "string" && r.kind.length > 0;
    const validLine = r.line === null || Number.isInteger(r.line) && r.line >= 0;
    const validLabel = typeof r.label === "string" && r.label.length > 0;
    if (!validId || !validKind || !validLabel || !validLine) {
      skippedInvalid += 1;
      return false;
    }
    return true;
  });
  if (validRows.length === 0) {
    return { ok: false, reason: "CORBELL_NOT_WARM:zero-rows", nodes: 0, edges: 0, checkoutPath: warmPath };
  }
  const freshnessAfter = { fresh: true, reason: "fresh" };
  const sortedValid = [...validRows].sort((a, b) => a.canonical_id.localeCompare(b.canonical_id));
  const materializeRows = sortedValid.length > MAX_WARM_ROWS ? sortedValid.slice(0, MAX_WARM_ROWS) : sortedValid;
  const materializeSkipped = skippedInvalid + (sortedValid.length - materializeRows.length);
  const stAfter = warmStoreStat(warmPath);
  if (!freshnessAfter.fresh || !warmStoreUnchanged(stBefore, stAfter)) {
    return { ok: false, reason: "CORBELL_NOT_WARM:changed-mid-read", nodes: 0, edges: 0, checkoutPath: warmPath };
  }
  const keptIds = new Set(materializeRows.map((r) => r.canonical_id));
  const nodeRows = materializeRows.map((r) => ({
    canonicalId: r.canonical_id,
    kind: r.kind,
    label: r.label,
    file: r.file,
    line: r.line,
    run: runTag
  }));
  let edgeSkipped = 0;
  const validEdges = edges.filter((e) => {
    const ok = typeof e.src_canonical === "string" && e.src_canonical.length > 0 && typeof e.dst_canonical === "string" && e.dst_canonical.length > 0 && CORBELL_PREDICATES.includes(e.predicate) && keptIds.has(e.src_canonical) && keptIds.has(e.dst_canonical);
    if (!ok)
      edgeSkipped += 1;
    return ok;
  });
  const cappedEdges = validEdges.length > MAX_WARM_ROWS * 3 ? validEdges.slice(0, MAX_WARM_ROWS * 3) : validEdges;
  edgeSkipped += validEdges.length - cappedEdges.length;
  const edgeRows = cappedEdges.map((e) => ({
    srcCanonical: e.src_canonical,
    dstCanonical: e.dst_canonical,
    predicate: e.predicate,
    evidence: e.evidence_quote,
    confidence: typeof e.confidence === "number" && Number.isFinite(e.confidence) && e.confidence >= 0 && e.confidence <= 1 ? e.confidence : 0.5,
    run: runTag
  }));
  let db;
  try {
    db = openTypedStore(storePath);
    supersedeThenInsert(db, runTag, nodeRows, edgeRows, [
      ["substrate", "corbell"],
      ["corbell_checkout", warmPath],
      ["corbell_nodes", String(nodeRows.length)],
      ["corbell_edges", String(edgeRows.length)]
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `CORBELL_WRITE_FAILED:${msg.slice(0, 120)}`, nodes: 0, edges: 0, checkoutPath: warmPath };
  } finally {
    if (db !== undefined) {
      try {
        db.close();
      } catch (closeErr) {
        console.error(`[gi-omp] store close warning: ${closeErr instanceof Error ? closeErr.message : String(closeErr)}`);
      }
    }
  }
  return { ok: true, nodes: materializeRows.length, edges: cappedEdges.length, checkoutPath: warmPath, skipped: materializeSkipped + edgeSkipped };
}

// src/omp/populate.ts
function populateSessionStore(storePath, root, runTag = "populate-" + Date.now().toString(36), opts) {
  if (opts?.substrate === "graphify") {
    try {
      return populateGraphifySessionStore(storePath, root, runTag, opts?.scope);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      console.error(`[gi-omp] populate substrate=graphify FAILED (build or write, not a freshness miss): ${reason}`);
      return { filesIndexed: 0, nodes: 0, edges: 0, runTag, skipped: true, substrate: "graphify", fallbackReason: `GRAPHIFY_BUILD_FAILED: ${reason}` };
    }
  }
  const corbell = populateFromCorbellCheckout(storePath, root, runTag);
  if (corbell.ok) {
    let db = null;
    let metaDegraded = false;
    try {
      db = openTypedStore(storePath);
    } catch (openErr) {
      metaDegraded = true;
      console.error(`[gi-omp] GI_META_WRITE_FAILED: could not open ${storePath} for the meta write (${openErr instanceof Error ? openErr.message : String(openErr)}) \u2014 data populated, meta degraded`);
    }
    if (db !== null) {
      try {
        try {
          db.exec("BEGIN IMMEDIATE;");
        } catch (beginErr) {
          metaDegraded = true;
          console.error(`[gi-omp] GI_META_WRITE_FAILED: BEGIN for the meta write failed at ${storePath} (${beginErr instanceof Error ? beginErr.message : String(beginErr)}) \u2014 data populated, meta degraded`);
        }
        if (!metaDegraded)
          try {
            db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["substrate", "corbell"]);
            db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["corbell_checkout", corbell.checkoutPath]);
            db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["populated_at", new Date().toISOString()]);
            db.exec("COMMIT;");
          } catch (e) {
            try {
              db.exec("ROLLBACK;");
            } catch {}
            metaDegraded = true;
            console.error(`[gi-omp] GI_META_WRITE_FAILED: batch meta write for ${storePath} did not commit (${e instanceof Error ? e.message : String(e)}) - data populated, meta degraded`);
          }
      } finally {
        try {
          db.close();
        } catch {}
      }
    }
    console.error(`[gi-omp] populate substrate=corbell checkout=${corbell.checkoutPath} nodes=${corbell.nodes} edges=${corbell.edges}`);
    return {
      filesIndexed: 0,
      nodes: corbell.nodes,
      edges: corbell.edges,
      runTag,
      skipped: false,
      substrate: "corbell",
      ...metaDegraded ? { metaDegraded: true } : {},
      corbellCheckout: corbell.checkoutPath
    };
  }
  const reason = `GI_POPULATE_FAILED:${corbell.reason ?? "CORBELL_NOT_WARM"}`;
  console.error(`[gi-omp] populate LOUD FAIL (no regex fallback): ${reason} (warm with: bun scripts/corbell-build.ts --target '${root}')`);
  return {
    filesIndexed: 0,
    nodes: 0,
    edges: 0,
    runTag,
    skipped: true,
    substrate: undefined,
    fallbackReason: reason,
    corbellCheckout: corbell.checkoutPath
  };
}
function populateGraphifySessionStore(storePath, root, runTag, scope) {
  const resolvedRoot = path17.resolve(root);
  const graphPath = graphifyOutPath(resolvedRoot);
  const freshness = isGraphifyCheckoutFreshFor(resolvedRoot, graphPath, scope ?? ["src"]);
  if (!freshness.fresh) {
    const reason = `GRAPHIFY_NOT_WARM:${freshness.reason}`;
    console.error(`[gi-omp] populate substrate=graphify miss: ${reason} (build with: bun scripts/graphify-build.ts --target '${root}')`);
    return { filesIndexed: 0, nodes: 0, edges: 0, runTag, skipped: true, substrate: "graphify", fallbackReason: reason, graphifyGraph: graphPath };
  }
  const built = new GraphifyAdapter(minimalGraphifyProfile(resolvedRoot)).buildSync(graphPath);
  const { nodeRows, edgeRows } = mapGraphifyToTyped(built.nodes, built.edges, runTag);
  if (nodeRows.length === 0) {
    const reason = "GRAPH_EMPTY:graphify graph produced zero nodes";
    console.error(`[gi-omp] populate substrate=graphify miss: ${reason} (graph=${graphPath})`);
    return { filesIndexed: 0, nodes: 0, edges: 0, runTag, skipped: true, substrate: "graphify", fallbackReason: reason, graphifyGraph: graphPath };
  }
  const db = openTypedStore(storePath);
  try {
    try {
      supersedeThenInsert(db, runTag, nodeRows, edgeRows, [
        ["substrate", "graphify"],
        ["graphify_graph", graphPath],
        ["graphify_nodes", String(nodeRows.length)],
        ["graphify_edges", String(edgeRows.length)],
        ["populated_at", new Date().toISOString()]
      ]);
    } catch (e) {
      throw new Error(`GRAPHIFY_WRITE_FAILED: session store write for ${resolvedRoot} did not commit (${e instanceof Error ? e.message : String(e)})`, { cause: e });
    }
  } finally {
    try {
      db.close();
    } catch {}
  }
  console.error(`[gi-omp] populate substrate=graphify graph=${graphPath} nodes=${nodeRows.length} edges=${edgeRows.length}`);
  return { filesIndexed: 0, nodes: nodeRows.length, edges: edgeRows.length, runTag, skipped: false, substrate: "graphify", graphifyGraph: graphPath };
}

// src/omp/ripwire-bridge.ts
import { spawnSync } from "child_process";
import * as fs17 from "fs";
import * as os5 from "os";
import * as path18 from "path";
var RIPWIRE_TIMEOUT_MS = 8000;
var RIPWIRE_MAX_BUFFER = 32 * 1024 * 1024;
function resolveRipwire(env = process.env) {
  const fromEnv = env.RIPWIRE_BIN;
  if (fromEnv && fromEnv.length > 0 && fs17.existsSync(fromEnv))
    return fromEnv;
  const home = env.HOME && env.HOME.length > 0 ? env.HOME : os5.homedir();
  const homeBin = path18.join(home, ".local", "bin", "ripwire");
  if (fs17.existsSync(homeBin))
    return homeBin;
  for (const dir of (env.PATH ?? "").split(":")) {
    if (!dir)
      continue;
    const cand = path18.join(dir, "ripwire");
    if (fs17.existsSync(cand))
      return cand;
  }
  return null;
}
function safeArg(a) {
  if (typeof a !== "string")
    return null;
  if (a.includes("\x00"))
    return null;
  if (a.length > 4096)
    return null;
  return a;
}
function runRaw(root, args, timeoutMs, env) {
  const e = env ?? process.env;
  const bin = resolveRipwire(e);
  if (!bin)
    return { bin: null, status: null, stdout: "", stderr: "", execError: null };
  const bad = [root, ...args].find((a) => safeArg(a) === null);
  if (bad !== undefined) {
    return { bin, status: null, stdout: "", stderr: "", execError: `RIPWIRE_ARG_INVALID: argv element ${JSON.stringify(String(bad).slice(0, 60))} is not a plain non-NUL string` };
  }
  const res = spawnSync(bin, [root, ...args], {
    encoding: "utf8",
    timeout: timeoutMs ?? RIPWIRE_TIMEOUT_MS,
    maxBuffer: RIPWIRE_MAX_BUFFER,
    env: e
  });
  const rawErr = res.error;
  const stdoutLen = String(res.stdout ?? "").length;
  const isTruncated = rawErr !== undefined && (rawErr.code === "ENOBUFS" || rawErr.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" || rawErr.code === undefined && stdoutLen >= RIPWIRE_MAX_BUFFER);
  const execError = rawErr === undefined ? null : isTruncated ? `TRUNCATED: stdout exceeded maxBuffer ${RIPWIRE_MAX_BUFFER}B \u2014 ${rawErr.message}` : rawErr.message;
  return {
    bin,
    status: res.status,
    stdout: String(res.stdout ?? ""),
    stderr: String(res.stderr ?? ""),
    execError
  };
}
function xmlPayload(stdout) {
  const i = stdout.indexOf("-->");
  return i >= 0 ? stdout.slice(i + 3) : stdout;
}
function firstTag(payload) {
  const m = /<([a-z][a-z0-9-]*)\s([^>]*?)\/?>/.exec(payload);
  const attrs = {};
  if (m)
    for (const mm of m[2].matchAll(/([a-z][a-z0-9_-]*)="([^"]*)"/gi))
      attrs[mm[1]] = mm[2];
  return { tag: m ? m[1] : "", attrs };
}
function childRows(payload, tags) {
  const out = [];
  for (const t of tags.split(",")) {
    for (const mm of payload.matchAll(new RegExp(`<${t}\\s([^>]*?)/>`, "g"))) {
      const a = {};
      for (const kv of mm[1].matchAll(/([a-z][a-z0-9_-]*)="([^"]*)"/gi))
        a[kv[1]] = kv[2];
      const p = String(a.p ?? "");
      const idx = p.lastIndexOf(":");
      out.push({
        name: String(a.n ?? "?"),
        file: idx >= 0 ? p.slice(0, idx) : p,
        line: idx >= 0 ? safeNum(p.slice(idx + 1), 0) : 0
      });
    }
  }
  return out;
}
function absentLeg(reason) {
  return { present: false, ok: false, summary: `absent (${reason})`, data: {} };
}
function failLeg(run, detail) {
  return { present: run.bin !== null, ok: false, summary: `query failed (${detail.slice(0, 140)})`, data: { stderr: run.stderr.slice(0, 400) } };
}
function jsonOf(stdout) {
  const i = stdout.indexOf("{");
  if (i === -1)
    return null;
  try {
    return JSON.parse(stdout.slice(i));
  } catch {
    return null;
  }
}
function safeNum(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function ripwireCallers(root, symbol, opts) {
  const run = runRaw(root, [`--callers=${symbol}`, "--json"], opts?.timeoutMs, opts?.env);
  if (!run.bin)
    return absentLeg("ripwire binary not found (set RIPWIRE_BIN)");
  if (run.execError)
    return failLeg(run, `exec error: ${run.execError}`);
  const j = jsonOf(run.stdout);
  if (!j)
    return failLeg(run, run.stderr.trim() || `no JSON (exit ${String(run.status)})`);
  const callers = (Array.isArray(j.callers) ? j.callers : []).map((c) => {
    const r = c;
    const p = String(r.p ?? "");
    const idx = p.lastIndexOf(":");
    return { name: String(r.n ?? "?"), file: idx >= 0 ? p.slice(0, idx) : p, line: idx >= 0 ? Number(p.slice(idx + 1)) || 0 : 0 };
  });
  const count = safeNum(j.count, callers.length);
  return {
    present: true,
    ok: true,
    summary: `${count} callers${callers.length > 0 ? ` (e.g. ${callers.slice(0, 3).map((c) => `${c.name} ${c.file}:${c.line}`).join(", ")})` : ""}`,
    data: { count, callers }
  };
}
function ripwireImpact(root, symbol, opts) {
  const run = runRaw(root, [`--impact=${symbol}`, "--json"], opts?.timeoutMs, opts?.env);
  if (!run.bin)
    return absentLeg("ripwire binary not found (set RIPWIRE_BIN)");
  if (run.execError)
    return failLeg(run, `exec error: ${run.execError}`);
  const j = jsonOf(run.stdout);
  if (!j)
    return failLeg(run, run.stderr.trim() || `no JSON (exit ${String(run.status)})`);
  const reaches = safeNum(j.reaches, 0);
  return {
    present: true,
    ok: true,
    summary: `impact_reaches=${reaches} radius_untested=${String(j.radius_untested ?? "?")}`,
    data: { reaches, radius_tested: j.radius_tested, radius_untested: j.radius_untested }
  };
}
function ripwireEditCheck(root, symbol, opts) {
  const run = runRaw(root, [`--edit-check=${symbol}`], opts?.timeoutMs, opts?.env);
  if (!run.bin)
    return absentLeg("ripwire binary not found (set RIPWIRE_BIN)");
  if (run.execError)
    return failLeg(run, `exec error: ${run.execError}`);
  const payload = xmlPayload(run.stdout);
  const { tag, attrs: a } = firstTag(payload);
  if (tag !== "edit-check")
    return failLeg(run, run.stderr.trim() || `no edit-check row (exit ${String(run.status)})`);
  const callers = childRows(payload, "c");
  return {
    present: true,
    ok: true,
    summary: `edit-check status=${a.status ?? "?"} callers=${a.callers ?? "?"} incompatible=${a.incompatible ?? "?"}${callers.length > 0 ? ` (e.g. ${callers.slice(0, 3).map((c) => `${c.name} ${c.file}:${c.line}`).join(", ")})` : ""}`,
    data: { status: a.status, callers: safeNum(a.callers, 0), incompatible: safeNum(a.incompatible, 0), rows: callers }
  };
}
function ripwireSafeDelete(root, symbol, opts) {
  const run = runRaw(root, [`--safe-delete=${symbol}`], opts?.timeoutMs, opts?.env);
  if (!run.bin)
    return absentLeg("ripwire binary not found (set RIPWIRE_BIN)");
  if (run.execError)
    return failLeg(run, `exec error: ${run.execError}`);
  const payload = xmlPayload(run.stdout);
  const { tag, attrs: a } = firstTag(payload);
  if (tag !== "safe-delete")
    return failLeg(run, run.stderr.trim() || `no safe-delete row (exit ${String(run.status)})`);
  return {
    present: true,
    ok: true,
    summary: `safe-delete callers=${a.callers ?? "?"} impact_reaches=${a.impact_reaches ?? "?"} uses=${a.uses ?? "?"} tested_self=${a.tested_self ?? "?"} risk=${a.risk ?? "?"}`,
    data: {
      callers: safeNum(a.callers, 0),
      impact_reaches: safeNum(a.impact_reaches, 0),
      uses: safeNum(a.uses, 0),
      tested_self: safeNum(a.tested_self, 0),
      risk: a.risk ?? ""
    }
  };
}
function ripwirePath(root, from, to, opts) {
  const run = runRaw(root, [`--path=${from},${to}`], opts?.timeoutMs, opts?.env);
  if (!run.bin)
    return absentLeg("ripwire binary not found (set RIPWIRE_BIN)");
  if (run.execError)
    return failLeg(run, `exec error: ${run.execError}`);
  const payload = xmlPayload(run.stdout);
  const { tag, attrs: a } = firstTag(payload);
  if (tag !== "path")
    return failLeg(run, run.stderr.trim() || `no path row (exit ${String(run.status)})`);
  const steps = childRows(payload, "s");
  return {
    present: true,
    ok: true,
    summary: `path reachable=${a.reachable ?? "?"} hops=${a.hops ?? "?"}${steps.length > 0 ? ` (${steps.slice(0, 4).map((s) => s.name).join(" \u2192 ")})` : ""}`,
    data: { reachable: a.reachable === "1", hops: safeNum(a.hops, 0), steps }
  };
}
function ripwireDeadCode(root, opts) {
  const run = runRaw(root, ["--dead-code"], opts?.timeoutMs, opts?.env);
  if (!run.bin)
    return absentLeg("ripwire binary not found (set RIPWIRE_BIN)");
  if (run.execError)
    return failLeg(run, `exec error: ${run.execError}`);
  const payload = xmlPayload(run.stdout);
  const { tag, attrs: a } = firstTag(payload);
  if (tag !== "dead-code")
    return failLeg(run, run.stderr.trim() || `no dead-code row (exit ${String(run.status)})`);
  return {
    present: true,
    ok: true,
    summary: `dead-code count=${a.count ?? "?"} confidence=${a.confidence ?? "?"}`,
    data: { count: safeNum(a.count, 0), confidence: a.confidence ?? "" }
  };
}
function ripwireVerify(root, claim, opts) {
  const run = runRaw(root, [`--verify=${claim}`], opts?.timeoutMs, opts?.env);
  if (!run.bin)
    return absentLeg("ripwire binary not found (set RIPWIRE_BIN)");
  if (run.execError)
    return failLeg(run, `exec error: ${run.execError}`);
  const payload = xmlPayload(run.stdout);
  const { tag, attrs: a } = firstTag(payload);
  if (tag !== "verify") {
    return { present: true, ok: false, summary: `claim refused (${(run.stderr.trim() || `exit ${String(run.status)}`).slice(0, 200)})`, data: {} };
  }
  const steps = childRows(payload, "s");
  return {
    present: true,
    ok: true,
    summary: `${a.verdict ?? "?"} shape=${a.shape ?? "?"}${a.hops !== undefined ? ` hops=${a.hops}` : ""}${a.count !== undefined ? ` count=${a.count}` : ""}${steps.length > 0 ? ` (${steps.slice(0, 3).map((s) => s.name).join(" \u2192 ")})` : ""}`,
    data: { verdict: a.verdict ?? "", shape: a.shape ?? "", hops: safeNum(a.hops, 0), count: safeNum(a.count, 0), steps }
  };
}

// src/hunter/tools/bug-hunt.ts
import path28 from "path";

// src/hunter/harness/hunt-lock.ts
import fs18 from "fs";
import os6 from "os";
import path19 from "path";
var STALE_LOCK_TTL_MS = 30 * 60 * 1000;
function lockPathFor(targetPath) {
  return path19.join(targetPath, ".gi", "hunt.lock");
}
function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    if (e !== undefined && e !== null && typeof e === "object" && "code" in e) {
      const code = e.code;
      if (code === "ESRCH")
        return false;
      if (code === "EPERM")
        return true;
    }
    console.warn(`[hunt-lock] isPidAlive unknown code for pid=${pid}: ${String(e)}`);
    return true;
  }
}
function isStale(payload) {
  const age = Date.now() - Date.parse(payload.acquiredAt);
  if (Number.isNaN(age))
    return true;
  if (age > STALE_LOCK_TTL_MS)
    return true;
  if (typeof payload.hostname === "string" && payload.hostname !== os6.hostname())
    return false;
  if (!isPidAlive(payload.pid))
    return true;
  return false;
}
function readPayload(lockPath) {
  try {
    const raw = fs18.readFileSync(lockPath, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.pid !== "number" || !Number.isInteger(parsed.pid) || parsed.pid <= 0)
      return null;
    if (typeof parsed.acquiredAt !== "string" || Number.isNaN(Date.parse(parsed.acquiredAt)))
      return null;
    if (typeof parsed.hostname !== "string" || parsed.hostname.length === 0)
      return null;
    return parsed;
  } catch (e) {
    console.warn(`[hunt-lock] readPayload failed for ${lockPath}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}
function acquireHuntLock(targetPath) {
  const lockPath = lockPathFor(targetPath);
  fs18.mkdirSync(path19.dirname(lockPath), { recursive: true });
  const payload = {
    pid: process.pid,
    acquiredAt: new Date().toISOString(),
    hostname: os6.hostname()
  };
  try {
    fs18.writeFileSync(lockPath, JSON.stringify(payload, null, 2), { flag: "wx" });
    return payload;
  } catch (e) {
    const code = e !== undefined && e !== null && typeof e === "object" && "code" in e ? e.code : undefined;
    if (code !== "EEXIST")
      throw e;
    const existing = readPayload(lockPath);
    let stale = existing ? isStale(existing) : false;
    if (!existing) {
      try {
        const ageMs = Date.now() - fs18.statSync(lockPath).mtimeMs;
        if (!Number.isNaN(ageMs) && ageMs > STALE_LOCK_TTL_MS)
          stale = true;
      } catch {}
    }
    if (stale) {
      const reread = readPayload(lockPath);
      if (existing) {
        if (!reread || reread.pid !== existing.pid || reread.acquiredAt !== existing.acquiredAt || reread.hostname !== existing.hostname) {
          throw new Error(`HUNT_ALREADY_RUNNING: the lock at ${lockPath} changed during stale-recovery (a peer won the race) \u2014 retry the hunt.`);
        }
      } else if (reread) {
        throw new Error(`HUNT_ALREADY_RUNNING: pid=${reread.pid} acquiredAt=${reread.acquiredAt} holds ${lockPath} \u2014 wait for it to finish or delete the stale lock.`);
      } else {
        const fresh2 = readPayload(lockPath);
        if (fresh2) {
          throw new Error(`HUNT_ALREADY_RUNNING: pid=${fresh2.pid} acquiredAt=${fresh2.acquiredAt} holds ${lockPath} \u2014 wait for it to finish or delete the stale lock.`);
        }
        let ageMs2 = Number.NaN;
        try {
          ageMs2 = Date.now() - fs18.statSync(lockPath).mtimeMs;
        } catch {
          throw new Error(`HUNT_ALREADY_RUNNING: the lock at ${lockPath} changed during stale-recovery (a peer won the race) \u2014 retry the hunt.`);
        }
        if (Number.isNaN(ageMs2) || ageMs2 <= STALE_LOCK_TTL_MS) {
          throw new Error(`HUNT_ALREADY_RUNNING: the lock at ${lockPath} changed during stale-recovery (a peer won the race) \u2014 retry the hunt.`);
        }
      }
      try {
        fs18.unlinkSync(lockPath);
      } catch (err) {
        const unlinkCode = err !== undefined && err !== null && typeof err === "object" && "code" in err ? err.code : undefined;
        if (unlinkCode === "ENOENT") {
          throw new Error(`HUNT_ALREADY_RUNNING: the lock at ${lockPath} changed during stale-recovery (a peer won the race) \u2014 retry the hunt.`);
        }
        console.warn(`[hunt-lock] stale unlink failed for ${lockPath}: ${err instanceof Error ? err.message : String(err)}`);
      }
      try {
        fs18.writeFileSync(lockPath, JSON.stringify(payload, null, 2), { flag: "wx" });
        return payload;
      } catch (e2) {
        const code2 = e2 !== undefined && e2 !== null && typeof e2 === "object" && "code" in e2 ? e2.code : undefined;
        if (code2 === "EEXIST") {
          const holder2 = readPayload(lockPath);
          const holderPid = holder2?.pid ?? "?";
          const holderAt = holder2?.acquiredAt ?? "?";
          throw new Error(`HUNT_ALREADY_RUNNING: pid=${holderPid} acquiredAt=${holderAt} holds ${lockPath} \u2014 wait for it to finish or delete the stale lock.`);
        }
        throw e2;
      }
    }
    const holderPid = existing?.pid ?? "?";
    const holderAt = existing?.acquiredAt ?? "?";
    throw new Error(`HUNT_ALREADY_RUNNING: pid=${holderPid} acquiredAt=${holderAt} holds ${lockPath} \u2014 wait for it to finish or delete the stale lock.`);
  }
}
function releaseHuntLock(targetPath) {
  const lockPath = lockPathFor(targetPath);
  try {
    const existing = readPayload(lockPath);
    if (!existing) {
      console.warn(`[hunt-lock] release skipped for ${lockPath}: unreadable payload (fail-closed, lock kept)`);
      return;
    }
    if (existing.pid !== process.pid)
      return;
    if (typeof existing.hostname === "string" && existing.hostname !== os6.hostname()) {
      console.warn(`[hunt-lock] release skipped for ${lockPath}: held by host ${existing.hostname} (this host ${os6.hostname()} \u2014 a colliding PID must not unlink a foreign lock)`);
      return;
    }
    const fresh = readPayload(lockPath);
    if (!fresh || fresh.pid !== existing.pid || fresh.acquiredAt !== existing.acquiredAt || fresh.hostname !== existing.hostname) {
      console.warn(`[hunt-lock] release skipped for ${lockPath}: the lock changed during release (a peer won the race) \u2014 keeping the current holder's lock`);
      return;
    }
    const fresh2 = readPayload(lockPath);
    if (!fresh2 || fresh2.pid !== existing.pid || fresh2.acquiredAt !== existing.acquiredAt || fresh2.hostname !== existing.hostname) {
      console.warn(`[hunt-lock] release skipped for ${lockPath}: the lock changed just before unlink (a peer won the race) \u2014 keeping the current holder's lock`);
      return;
    }
    try {
      fs18.unlinkSync(lockPath);
    } catch (e) {
      const code = e !== undefined && e !== null && typeof e === "object" && "code" in e ? e.code : undefined;
      if (code === "ENOENT") {
        console.warn(`[hunt-lock] release skipped for ${lockPath}: the lock vanished before unlink (a peer won the race) \u2014 nothing to delete`);
        return;
      }
      throw e;
    }
  } catch (e) {
    console.warn(`[hunt-lock] release failed for ${lockPath}: ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }
}

// node_modules/xstate/dist/xstate.development.cjs.mjs
var import_xstate_development_cjs = __toESM(require_xstate_development_cjs(), 1);

// src/hunter/harness/micro-loop-machine.ts
init_db();

// src/hunter/diagnostics/engine.ts
init_db();
import fs20 from "fs";
import path21 from "path";
import { createRequire as createRequire2 } from "module";

// src/hunter/diagnostics/findings-store.ts
init_db_canon();
init_db_canon();
function toFindingInput(f) {
  return {
    ruleId: f.ruleId,
    severity: f.severity,
    file: f.file,
    line: f.line,
    rangeStart: f.rangeStart,
    rangeEnd: f.rangeEnd,
    evidence: f.evidence,
    verdict: f.verdict
  };
}
function appendFindings(db, findings, runId, week) {
  if (typeof runId !== "string" || runId.trim() === "") {
    throw findingNoTriplet(`refusing appendFindings of ${findings.length} findings with an empty runId \u2014 the run scope is mandatory (K21.2 determinism)`);
  }
  if (findings.length === 0)
    return { runId, week: week ?? null, appended: 0 };
  for (let i = 0;i < findings.length; i++) {
    const f = findings[i];
    if (typeof f.evidence !== "string" || f.evidence.trim() === "") {
      throw findingNoTriplet(`finding ${f.ruleId} at ${f.file}:${f.line} carries an empty evidence string (landed=0 remaining=${findings.length} of ${findings.length})`);
    }
  }
  try {
    db.exec("BEGIN IMMEDIATE");
  } catch (e) {
    throw new Error(`FINDING_TX_BEGIN_FAILED: cannot open the appendFindings transaction \u2014 ${e instanceof Error ? e.message : String(e)} (appendFindings is non-reentrant; serialize hunts or commit the outer transaction first)`);
  }
  try {
    for (let i = 0;i < findings.length; i++) {
      const f = findings[i];
      if (typeof f.evidence !== "string" || f.evidence.trim() === "") {
        throw findingNoTriplet(`finding ${f.ruleId} at ${f.file}:${f.line} carries an empty evidence string (landed=${i} remaining=${findings.length - i} of ${findings.length})`);
      }
      db.appendFinding(toFindingInput(f), runId, week);
    }
    db.exec("COMMIT");
  } catch (e) {
    try {
      db.exec("ROLLBACK");
    } catch (rb) {
      throw new Error(`FINDING_ROLLBACK_FAILED: batch error=${e instanceof Error ? e.message : String(e)} rollback error=${rb instanceof Error ? rb.message : String(rb)} (the transaction may still be open \u2014 do not reuse this handle for writes)`);
    }
    throw e;
  }
  return { runId, week: week ?? null, appended: findings.length };
}

// src/hunter/diagnostics/semantic-predicates.ts
init_zod();
init_db();
init_templates();

// src/hunter/triad.ts
function isEvidenceTriad(v) {
  if (typeof v !== "object" || v === null)
    return false;
  const t = v;
  const pat = t.pattern;
  const sta = t.state;
  const ev = t.evidence;
  if (!pat || typeof pat.memberId !== "string" || pat.memberId.trim() === "")
    return false;
  if (pat.familySeverity !== "CRITICAL" && pat.familySeverity !== "HIGH" && pat.familySeverity !== "MEDIUM" && pat.familySeverity !== "LOW")
    return false;
  if (!sta || typeof sta.machineId !== "string" || sta.machineId.trim() === "")
    return false;
  if (typeof sta.from !== "string" || sta.from.trim() === "")
    return false;
  if (typeof sta.to !== "string" || sta.to.trim() === "")
    return false;
  if (!ev || typeof ev.file !== "string" || ev.file.trim() === "")
    return false;
  if (typeof ev.line !== "number" || !Number.isFinite(ev.line) || ev.line < 1 || !Number.isInteger(ev.line))
    return false;
  return true;
}

// src/hunter/diagnostics/semantic-predicates.ts
var CARD_FIELDS2 = { verbatimQuote: string2(), anchor: string2(), severity: _enum(SEVERITIES) };
var SEVERITY_MAP = { CRIT: "CRITICAL", HIGH: "HIGH", MED: "MEDIUM" };
function mapSeverity(dbSev) {
  return SEVERITY_MAP[dbSev] ?? "LOW";
}
function makeTriad(file, line, memberId, severity) {
  const triad = { pattern: { memberId, familySeverity: mapSeverity(severity) }, state: { machineId: "semantic-battery", from: "IDLE", to: "VIOLATED" }, evidence: { file, line } };
  if (!isEvidenceTriad(triad))
    throw new Error("FINDING_NO_TRIPLET");
  return triad;
}
function bindSeverity2(b) {
  const v = b["severity"];
  if (typeof v === "string" && SEVERITIES.includes(v))
    return v;
  return "HIGH";
}
function evEdge(mid, file, line, snippet, bug, anchor) {
  const cite = firstCite(anchor.cites, file);
  if (!cite)
    throw new Error(`FINDING_NO_ANCHOR: ${mid} at ${file}:${line} \u2014 no traversed edge (callers must pre-check firstCite)`);
  const edgeLeg = edgeEvidence(cite);
  return `[${bug}] ${mid} at ${file}:${line} \u2014 ${snippet.slice(0, 180)} | ${edgeLeg} | triad=${mid}`;
}
function windowText(ctx, file) {
  const hoisted = ctx.contentMap?.get(file);
  if (hoisted !== undefined)
    return hoisted;
  try {
    return ctx.source.read(file);
  } catch (e) {
    console.error(`[semantic-predicates] source read failed for ${file}: ${String(e)}`);
    return;
  }
}
function anchored(ctx, spec) {
  let anchor;
  try {
    anchor = resolveEdgeAnchor(ctx.graph, spec);
  } catch (e) {
    throw new Error(`SEMANTIC_ANCHOR_INFRA_FAILED: resolveEdgeAnchor failed (spec=${spec.callSymbols.slice(0, 3).join(",") || spec.importMatchers.slice(0, 3).join(",")}) \u2014 ${e instanceof Error ? e.message : String(e)}`);
  }
  if (anchor.files.size === 0)
    return null;
  return anchor;
}
var P1_SPEC = {
  callSymbols: ["writeFile", "writeFileSync", "appendFile", "appendFileSync", "mkdir", "mkdirSync", "join", "resolve", "createWriteStream", "rmSync", "existsSync", "cwd"],
  importMatchers: ["node:path", "node:fs", "path", "fs"],
  defMatchers: []
};
var P1 = {
  id: "semantic.process-cwd-persistence",
  family: "PROCESS",
  parameters: object({ ...CARD_FIELDS2 }),
  check(ctx) {
    const findings = [];
    const sev = bindSeverity2(ctx.bindings);
    const anchor = anchored(ctx, P1_SPEC);
    if (anchor === null)
      return findings;
    for (const file of anchor.files) {
      const text = windowText(ctx, file);
      if (text === undefined)
        continue;
      if (!firstCite(anchor.cites, file))
        continue;
      if (!text.includes("process.cwd()"))
        continue;
      const lines = text.split(`
`);
      for (let i = 0;i < lines.length; i++)
        if ((lines[i] ?? "").includes("process.cwd()")) {
          const win = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 12)).join(`
`);
          if (/(writeFile(Sync)?|appendFile(Sync)?|mkdir(Sync)?|rmSync|existsSync|createWriteStream|(?:path\.)?join|(?:path\.)?resolve|cwd).*\.gi(?![\w-])|\.gi(?![\w-]).*(writeFile(Sync)?|appendFile(Sync)?|mkdir(Sync)?|rmSync|existsSync|createWriteStream|(?:path\.)?join|(?:path\.)?resolve|cwd)/.test(win)) {
            const triad = makeTriad(file, i + 1, "semantic.process-cwd-persistence", sev);
            findings.push({ ruleId: "semantic.process-cwd-persistence", severity: sev, file, line: i + 1, evidence: evEdge("semantic.process-cwd-persistence", file, i + 1, lines[i].trim(), "HT-BUG-3b/15", anchor), verdict: "VIOLATION", triad });
          }
        }
    }
    return findings;
  }
};
var P2_SPEC = {
  callSymbols: ["setAbortFlag", "abort", "writeState", "writeStateAtomic", "clearPoller", "setPhase"],
  importMatchers: [],
  defMatchers: []
};
var P2 = {
  id: "semantic.dual-store-lifecycle-write",
  family: "PROCESS",
  parameters: object({ ...CARD_FIELDS2 }),
  check(ctx) {
    const findings = [];
    const sev = bindSeverity2(ctx.bindings);
    const anchor = anchored(ctx, P2_SPEC);
    if (anchor === null)
      return findings;
    for (const file of anchor.files) {
      const text = windowText(ctx, file);
      if (text === undefined)
        continue;
      if (!firstCite(anchor.cites, file))
        continue;
      if (!text.includes("setAbortFlag"))
        continue;
      const lines = text.split(`
`);
      for (let i = 0;i < lines.length; i++)
        if ((lines[i] ?? "").includes("setAbortFlag")) {
          const winWithoutTrigger = lines.slice(Math.max(0, i - 15), i).join(`
`) + `
` + lines.slice(i + 1, Math.min(lines.length, i + 15)).join(`
`);
          if (/abort/i.test(winWithoutTrigger) && !/writeStateAtomic|phase.*FAILED/.test(winWithoutTrigger)) {
            const triad = makeTriad(file, i + 1, "semantic.dual-store-lifecycle-write", sev);
            findings.push({ ruleId: "semantic.dual-store-lifecycle-write", severity: sev, file, line: i + 1, evidence: evEdge("semantic.dual-store-lifecycle-write", file, i + 1, lines[i].trim(), "HT-BUG-2", anchor), verdict: "VIOLATION", triad });
          }
        }
    }
    return findings;
  }
};
var P3_SPEC = {
  callSymbols: ["enforce", "enforceStateGate", "guard", "gate"],
  importMatchers: ["enforce", "gate", "guard", "firewall"],
  defMatchers: [/(enforce|gate|guard|STATE_GATE)/i]
};
var P3 = {
  id: "semantic.unwired-enforcement",
  family: "WIRING",
  parameters: object({ ...CARD_FIELDS2 }),
  check(ctx) {
    const findings = [];
    const sev = bindSeverity2(ctx.bindings);
    const anchor = anchored(ctx, P3_SPEC);
    if (anchor === null)
      return findings;
    let deadIds = null;
    try {
      deadIds = new Set(ctx.graph.unwired().map((d) => d.id));
    } catch {
      deadIds = null;
    }
    for (const node of ctx.graph.nodes()) {
      if (node.kind !== "function" && node.kind !== "method" && node.kind !== "class")
        continue;
      if (!/(enforce|gate|guard|STATE_GATE)/i.test(node.name))
        continue;
      const file = node.file ?? "";
      if (!file)
        continue;
      if (!anchor.files.has(file))
        continue;
      if (!firstCite(anchor.cites, file))
        continue;
      const nid = node.id;
      if (deadIds !== null) {
        if (nid === undefined || !deadIds.has(nid))
          continue;
      } else {
        let callers;
        try {
          callers = ctx.graph.whoCalls(node.name);
        } catch (e) {
          console.error(`[semantic-predicates] P3 whoCalls failed for ${node.name}: ${String(e)}`);
          continue;
        }
        if (callers.length !== 0)
          continue;
      }
      const text = windowText(ctx, file);
      if (text === undefined)
        continue;
      if (!/(enforcer|gate|firewall)/i.test(file) && !/(enforcer|gate)/i.test(text.slice(0, 2000)))
        continue;
      const triad = makeTriad(file, node.line ?? 1, "semantic.unwired-enforcement", sev);
      const evidence = evEdge("semantic.unwired-enforcement", file, node.line ?? 1, `${node.name} \u2014 ${deadIds !== null ? `unwired() lists id ${nid ?? node.name}` : `whoCalls("${node.name}")=[]`} over the calls edges (no inbound caller in the edge store)`, "wired-dead", anchor);
      findings.push({ ruleId: "semantic.unwired-enforcement", severity: sev, file, line: node.line ?? 1, evidence, verdict: "VIOLATION", triad });
    }
    return findings;
  }
};
var P4_SPEC = {
  callSymbols: ["stopReason"],
  importMatchers: [],
  defMatchers: [/stopReason/i]
};
var P4 = {
  id: "semantic.error-only-guard-gap",
  family: "CONTRACT",
  parameters: object({ ...CARD_FIELDS2 }),
  check(ctx) {
    const findings = [];
    const sev = bindSeverity2(ctx.bindings);
    const anchor = anchored(ctx, P4_SPEC);
    if (anchor === null)
      return findings;
    for (const file of anchor.files) {
      const text = windowText(ctx, file);
      if (text === undefined)
        continue;
      if (!firstCite(anchor.cites, file))
        continue;
      if (!text.includes("stopReason"))
        continue;
      const lines = text.split(`
`);
      for (let i = 0;i < lines.length; i++)
        if (/stopReason.*error|stopReason.*aborted/i.test(lines[i] ?? "")) {
          const win = lines.slice(Math.max(0, i - 8), Math.min(lines.length, i + 16)).join(`
`);
          if (!/Array\.isArray.*message\.content|AETHER_MALFORMED/.test(win)) {
            const triad = makeTriad(file, i + 1, "semantic.error-only-guard-gap", sev);
            findings.push({ ruleId: "semantic.error-only-guard-gap", severity: sev, file, line: i + 1, evidence: evEdge("semantic.error-only-guard-gap", file, i + 1, lines[i].trim(), "HT-BUG-8", anchor), verdict: "VIOLATION", triad });
          }
        }
    }
    return findings;
  }
};
var P5_SPEC = {
  callSymbols: ["enforce", "enforceStateGate"],
  importMatchers: ["diagnostic", "audit", "enforce", "guardian", "poseidon", "hook", "phase"],
  defMatchers: [/PHASE_REQUIRED_TOOLS/i]
};
var P5 = {
  id: "semantic.diagnostics-jail",
  family: "PROCESS",
  parameters: object({ ...CARD_FIELDS2 }),
  check(ctx) {
    const findings = [];
    const sev = bindSeverity2(ctx.bindings);
    const anchor = anchored(ctx, P5_SPEC);
    if (anchor === null)
      return findings;
    for (const file of anchor.files) {
      const text = windowText(ctx, file);
      if (text === undefined)
        continue;
      if (!firstCite(anchor.cites, file))
        continue;
      if (!/PHASE_REQUIRED_TOOLS/i.test(text))
        continue;
      if (/DIAGNOSTIC_TOOLS/i.test(text))
        continue;
      const lines = text.split(`
`);
      for (let i = 0;i < lines.length; i++)
        if (/PHASE_REQUIRED_TOOLS/i.test(lines[i] ?? "")) {
          const win = lines.slice(Math.max(0, i - 5), Math.min(lines.length, i + 30)).join(`
`);
          if (!/DIAGNOSTIC_TOOLS|AUDIT_TOOLS|\bread\b/.test(win)) {
            const triad = makeTriad(file, i + 1, "semantic.diagnostics-jail", sev);
            findings.push({ ruleId: "semantic.diagnostics-jail", severity: sev, file, line: i + 1, evidence: evEdge("semantic.diagnostics-jail", file, i + 1, lines[i].trim(), "HT-BUG-21", anchor), verdict: "VIOLATION", triad });
          }
        }
    }
    return findings;
  }
};
var P6_SPEC = {
  callSymbols: ["readdirSync", "readdir", "scanTsFiles", "walkFiles", "globSync"],
  importMatchers: ["node:fs", "fs"],
  defMatchers: [/scanTsFiles|walker|walkFiles/i]
};
var P6 = {
  id: "semantic.unscoped-walker",
  family: "PROCESS",
  parameters: object({ ...CARD_FIELDS2 }),
  check(ctx) {
    const findings = [];
    const sev = bindSeverity2(ctx.bindings);
    const anchor = anchored(ctx, P6_SPEC);
    if (anchor === null)
      return findings;
    for (const file of anchor.files) {
      const text = windowText(ctx, file);
      if (text === undefined)
        continue;
      if (!firstCite(anchor.cites, file))
        continue;
      if (!/scanTsFiles|readdirSync/i.test(text))
        continue;
      const lines = text.split(`
`);
      for (let i = 0;i < lines.length; i++)
        if (/scanTsFiles|readdirSync/i.test(lines[i] ?? "")) {
          const win = lines.slice(Math.max(0, i - 20), Math.min(lines.length, i + 30)).join(`
`);
          const hasEx = /exclude|EXCLUDED_DIRS/i.test(win);
          if (!hasEx) {
            const triad = makeTriad(file, i + 1, "semantic.unscoped-walker", sev);
            findings.push({ ruleId: "semantic.unscoped-walker", severity: sev, file, line: i + 1, evidence: evEdge("semantic.unscoped-walker", file, i + 1, lines[i].trim(), "HT-BUG-20", anchor), verdict: "VIOLATION", triad });
          } else if (!/Checkpoints/i.test(win) || !/\.gi(?![\w-])/i.test(win) || !/\bdist\b/i.test(win)) {
            const triad = makeTriad(file, i + 1, "semantic.unscoped-walker", sev);
            findings.push({ ruleId: "semantic.unscoped-walker", severity: sev, file, line: i + 1, evidence: evEdge("semantic.unscoped-walker", file, i + 1, lines[i].trim() + " missing Checkpoints/.gi/dist", "HT-BUG-20", anchor), verdict: "VIOLATION", triad });
          }
        }
    }
    return findings;
  }
};
var SEMANTIC_TEMPLATES = {
  "semantic.process-cwd-persistence": P1,
  "semantic.dual-store-lifecycle-write": P2,
  "semantic.unwired-enforcement": P3,
  "semantic.error-only-guard-gap": P4,
  "semantic.diagnostics-jail": P5,
  "semantic.unscoped-walker": P6
};
var SEMANTIC_PREDICATE_IDS = Object.keys(SEMANTIC_TEMPLATES);
function buildSemanticBattery(batteryVersion = "semantic-v1") {
  const out = [];
  for (const [id, tmpl] of Object.entries(SEMANTIC_TEMPLATES))
    out.push(compileTemplate(tmpl, { verbatimQuote: tmpl.id, anchor: `semantic-predicates.ts:${id}`, severity: "HIGH" }, { verbatimQuote: tmpl.id, anchor: `semantic-predicates.ts:${id}`, severity: "HIGH" }, batteryVersion));
  return out;
}

// src/hunter/diagnostics/engine.ts
var _giRequire = createRequire2(import.meta.url);
var _giTs = null;
var ts = new Proxy({}, {
  get(_t, p) {
    if (_giTs === null) {
      try {
        _giTs = _giRequire("typescript");
      } catch (e) {
        throw new Error(`GI_TS_MISSING: 'typescript' is not resolvable from ${import.meta.url} (${e instanceof Error ? e.message : "ERR"}) \u2014 the AST-walk path requires it`);
      }
    }
    return Reflect.get(_giTs, p);
  }
});
var SEVERITY_RANK_CRIT = 4;

class EngineError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = code;
    this.code = code;
  }
}
function engineGraphEmpty(detail) {
  return new EngineError("ENGINE_GRAPH_EMPTY", `ENGINE_GRAPH_EMPTY: detail=${detail} (a scan over an empty graph is a loud fail \u2014 the engine refuses to run on zero nodes, never a silent zero)`);
}
function findingCheckFailed(predicateId, detail) {
  return new EngineError("FINDING_CHECK_FAILED", `FINDING_CHECK_FAILED: predicateId=${predicateId} detail=${detail} (a predicate that throws mid-check aborts the run \u2014 atomic per predicate, never a silent skip)`);
}
function sourceReadFailed(p, detail) {
  return new EngineError("SOURCE_READ_FAILED", `SOURCE_READ_FAILED: path=${p} detail=${detail} (the engine's source reads are the lockdown surface \u2014 an unreadable source is a loud fail, never an empty read)`);
}
function historyLogUnreadable(p, detail) {
  return new EngineError("HISTORY_LOG_UNREADABLE", `HISTORY_LOG_UNREADABLE: path=${p} detail=${detail} (the ranking's history reads are part of the engine's determinism \u2014 an unreadable log is a loud fail, never a silent skip)`);
}
function buildFileContentMap(nodes, source) {
  const map = new Map;
  const uniq = new Set;
  for (const n of nodes)
    if (n.file)
      uniq.add(n.file);
  const failed = [];
  for (const file of uniq) {
    try {
      map.set(file, source.read(file));
    } catch (e) {
      failed.push(`${file}: ${String(e)}`);
    }
  }
  if (failed.length > 0) {
    throw sourceReadFailed(failed.join("; "), "buildFileContentMap refuses a partial scope \u2014 every anchored file must read");
  }
  return map;
}
function run(battery, ctx) {
  if (ctx.graph.nodes().length === 0) {
    throw engineGraphEmpty("the graph adapter reported zero nodes");
  }
  const contentMap = ctx.contentMap ?? buildFileContentMap(ctx.graph.nodes(), ctx.source);
  const normalized = [];
  for (const predicate of battery) {
    if (!SEVERITIES.includes(predicate.severity)) {
      throw findingInvalid("severity", predicate.severity);
    }
    const checkCtx = { graph: ctx.graph, source: ctx.source, bindings: predicate.bindings, contentMap };
    let found;
    try {
      found = predicate.check(checkCtx);
    } catch (e) {
      throw findingCheckFailed(predicate.id, String(e?.message ?? e));
    }
    for (const f of found) {
      if (typeof f.evidence !== "string" || f.evidence.trim() === "") {
        throw findingNoTriplet(`predicate ${predicate.id} emitted a finding at ${f.file}:${f.line} with an empty evidence string`);
      }
      if (!FINDING_VERDICTS.includes(f.verdict)) {
        throw findingInvalid("verdict", f.verdict);
      }
      const range = f.range ?? [f.line, f.line];
      normalized.push({
        ruleId: predicate.id,
        severity: predicate.severity,
        file: f.file,
        line: f.line,
        rangeStart: range[0],
        rangeEnd: range[1],
        evidence: f.evidence,
        verdict: f.verdict
      });
    }
  }
  return normalized;
}
function dedupe(findings) {
  const seen = new Set;
  const out = [];
  for (const f of findings) {
    const key = JSON.stringify([f.ruleId, f.file, f.line]);
    if (seen.has(key))
      continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}
function severityScore(s) {
  switch (s) {
    case "CRIT":
      return SEVERITY_RANK_CRIT;
    case "HIGH":
      return 3;
    case "MED":
      return 2;
    case "WARN":
      return 1;
    default:
      throw findingInvalid("severity", s);
  }
}
function violationFrequencies(profile, ruleIds) {
  const counts = new Map;
  for (const id of ruleIds)
    counts.set(id, 0);
  const rootReal = fs20.realpathSync(profile.project.root);
  if (rootReal === path21.sep) {
    throw historyLogUnreadable(profile.project.root, 'project root resolves to the filesystem root \u2014 containment against "/" admits every path and is not a boundary');
  }
  const rootPrefix = rootReal + path21.sep;
  const containedIn = (parentReal) => parentReal === rootReal || parentReal.startsWith(rootPrefix);
  for (const logPath of profile.history.failureLogs) {
    const abs = path21.resolve(profile.project.root, logPath);
    const parentReal = fs20.realpathSync(path21.dirname(abs));
    if (!containedIn(parentReal))
      throw historyLogUnreadable(abs, `path escapes project root (root=${rootReal} parent=${parentReal})`);
    let logReal = abs;
    try {
      logReal = fs20.realpathSync(abs);
    } catch {}
    if (!containedIn(logReal))
      throw historyLogUnreadable(abs, `symlink escapes project root (root=${rootReal} file=${logReal})`);
    let text;
    try {
      text = fs20.readFileSync(logReal, "utf8");
    } catch (e) {
      throw historyLogUnreadable(abs, String(e));
    }
    for (const id of ruleIds) {
      const occurrences = text.split(id).length - 1;
      counts.set(id, (counts.get(id) ?? 0) + occurrences);
    }
  }
  return counts;
}
function rankFindings(findings, profile) {
  const ruleIds = [...new Set(findings.map((f) => f.ruleId))];
  const freq = violationFrequencies(profile, ruleIds);
  const bounded = (id) => {
    const raw = freq.get(id) ?? 0;
    return raw > 0 ? Math.min(3, raw) : 1;
  };
  return [...findings].sort((a, b) => {
    const sa = severityScore(a.severity) * bounded(a.ruleId);
    const sb = severityScore(b.severity) * bounded(b.ruleId);
    if (sa === sb)
      return 0;
    return sa > sb ? -1 : 1;
  });
}
function lockdownReadSource(profile) {
  const rootReal = fs20.realpathSync(profile.project.root);
  return {
    read(file, range) {
      const abs = path21.resolve(profile.project.root, file);
      if (rootReal === path21.sep) {
        throw sourceReadFailed(file, 'project root resolves to the filesystem root \u2014 containment against "/" admits every path and is not a boundary');
      }
      const rootPrefix = rootReal + path21.sep;
      const inside = (q) => q === rootReal || q.startsWith(rootPrefix);
      const parentReal = fs20.realpathSync(path21.dirname(abs));
      if (!inside(parentReal))
        throw sourceReadFailed(abs, `path escapes project root (root=${rootReal} parent=${parentReal})`);
      let fileReal = abs;
      try {
        fileReal = fs20.realpathSync(abs);
      } catch {}
      if (!inside(fileReal))
        throw sourceReadFailed(abs, `symlink escapes project root (root=${rootReal} file=${fileReal})`);
      let text;
      try {
        const fd = fs20.openSync(fileReal, fs20.constants.O_RDONLY | fs20.constants.O_NOFOLLOW);
        try {
          text = fs20.readFileSync(fd, "utf8");
        } finally {
          fs20.closeSync(fd);
        }
      } catch (e) {
        throw sourceReadFailed(abs, String(e));
      }
      if (!range)
        return text;
      const lines = text.split(`
`);
      const start = Math.max(1, range[0]);
      const end = Math.min(lines.length, range[1]);
      if (start > end)
        return "";
      return lines.slice(start - 1, end).join(`
`);
    }
  };
}
function runBattery(battery, graph, profile, runId, db, week) {
  const semantic = buildSemanticBattery();
  const fullBattery = [...battery, ...semantic];
  const source = lockdownReadSource(profile);
  const contentMap = buildFileContentMap(graph.nodes(), source);
  const ctx = { graph, source, contentMap };
  const raw = run(fullBattery, ctx);
  const deduped = dedupe(raw);
  const ranked = rankFindings(deduped, profile);
  if (db) {
    appendFindings(db, ranked, runId, week);
  }
  const summary = {
    runId,
    findings: ranked,
    findingsCount: raw.length,
    dedupedCount: ranked.length,
    predicatesExecuted: fullBattery.length
  };
  const allNodeIds = new Set(graph.nodes().map((n) => n.id));
  assertNoBlindness({
    graphNodesBefore: allNodeIds.size,
    graphNodesAfter: graph.nodes().length,
    changedNodeIds: new Set,
    rerunNodeIds: new Set(allNodeIds),
    runResult: ranked
  });
  return summary;
}
function assertNoBlindness(checkpoint) {
  if (checkpoint.graphNodesAfter !== checkpoint.graphNodesBefore) {
    const before = checkpoint.graphNodesBefore;
    const after = checkpoint.graphNodesAfter;
    if (checkpoint.changedNodeIds.size === 0) {
      throw new EngineError("GRAPH_INCOMPLETE", `GRAPH_INCOMPLETE: graphNodesAfter=${after} graphNodesBefore=${before} \u2014 the graph changed without a re-parse`);
    }
  }
  const changed = checkpoint.changedNodeIds;
  const rerun = checkpoint.rerunNodeIds;
  if (changed.size !== rerun.size || [...changed].some((id) => !rerun.has(id))) {
    if (changed.size > 0) {
      throw new EngineError("BATTERY_INCOMPLETE", `BATTERY_INCOMPLETE: changedNodeIds=${[...changed].join(",")} rerunNodeIds=${[...rerun].join(",")} \u2014 the battery predicates were not fully rerun on changed nodeIds`);
    }
  }
  if (checkpoint.runResult.length === 0 && changed.size > 0) {
    throw new EngineError("ENGINE_SKIP", `ENGINE_SKIP: runResult is empty but changedNodeIds is non-empty (${[...changed].join(",")}) \u2014 the engine returned early without covering changed nodeIds`);
  }
}

// src/hunter/harness/recon.ts
import fs21 from "fs";
import path22 from "path";
init_db();
function awarenessDocMissing(docPath) {
  return new Error(`CORPUS_MISSING: path=${docPath} remedy=the awareness doc must exist (fix the profile's awareness.docs)`);
}
var QUOTE_MARKER_RE = /^\s*>/;
function projectRootReal(root) {
  try {
    return fs21.realpathSync(root);
  } catch (e) {
    throw new Error(`CORPUS_UNREADABLE: project root ${root} cannot resolve (realpath failed: ${e instanceof Error ? e.message : String(e)} \u2014 chmod/fix permissions or remove broken symlinks)`);
  }
}
function assertInsideProject(root, absPath) {
  const rootReal = projectRootReal(root);
  let real;
  try {
    real = fs21.realpathSync(absPath);
  } catch (e) {
    throw new Error(`CORPUS_UNREADABLE: path=${absPath} cannot resolve for containment check (realpath failed: ${e instanceof Error ? e.message : String(e)} \u2014 the corpus path must exist inside the project)`);
  }
  if (real !== rootReal && !real.startsWith(rootReal + path22.sep)) {
    throw new Error(`CORPUS_UNREADABLE: path=${absPath} (real: ${real}) escapes project root ${root} (real: ${rootReal}) \u2014 resolve corpus paths inside the project`);
  }
  return real;
}
function countQuotedRules(profile) {
  let count = 0;
  for (const entry of profile.rules.corpus) {
    const abs = path22.isAbsolute(entry) ? entry : path22.resolve(profile.project.root, entry);
    const real = assertInsideProject(profile.project.root, abs);
    let text;
    try {
      text = fs21.readFileSync(real, "utf8");
    } catch (e) {
      throw new Error(`CORPUS_UNREADABLE: path=${abs} detail=${e instanceof Error ? e.message : String(e)} (a corpus path that cannot be read is a loud named error, never a silent skip)`);
    }
    for (const line of text.split(`
`)) {
      if (QUOTE_MARKER_RE.test(line))
        count += 1;
    }
  }
  return count;
}
function recon(profilePath) {
  const profile = loadProfile(profilePath);
  for (const doc of profile.awareness.docs) {
    const abs = path22.isAbsolute(doc) ? doc : path22.resolve(profile.project.root, doc);
    if (!fs21.existsSync(abs)) {
      throw awarenessDocMissing(doc);
    }
    assertInsideProject(profile.project.root, abs);
  }
  const projectRootResolved = path22.resolve(profile.project.root);
  let projectRootReal;
  try {
    projectRootReal = fs21.realpathSync(projectRootResolved);
  } catch (e) {
    throw new Error(`recon actor: project root does not resolve (${projectRootResolved}) \u2014 ${e instanceof Error ? e.message : String(e)}`);
  }
  const dbPath = resolveStoreDbPath(projectRootReal);
  if (dbPath !== projectRootReal && !dbPath.startsWith(projectRootReal + path22.sep)) {
    throw new Error(`recon actor: resolved dbPath escapes project root (${dbPath} not under ${projectRootReal})`);
  }
  const runId = openAndNextRunId(projectToken(profile.project.name), dbPath);
  return {
    stages: profile.pipeline.stages.length,
    batteryCount: countQuotedRules(profile),
    corpusCount: profile.rules.corpus.length,
    profile,
    runId
  };
}
function projectToken(projectName) {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug === "" ? "project" : slug;
}
function openAndNextRunId(token, dbPath) {
  const db = openStore(dbPath);
  try {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `${token}-hunt-${day}-`;
    let seq = 0;
    for (const row of db.prepare("SELECT payload FROM events WHERE kind = 'HUNT_DONE' AND payload LIKE ?").all(`%${prefix}%`)) {
      let payload = {};
      let rawText = "";
      try {
        const raw = row["payload"];
        if (raw instanceof Uint8Array)
          rawText = new TextDecoder().decode(raw);
        else if (typeof raw === "string")
          rawText = raw;
        else if (raw !== null && typeof raw === "object") {
          payload = raw;
        } else
          rawText = String(raw ?? "");
        if (!rawText && typeof payload !== "object")
          rawText = String(raw ?? "{}");
        if (rawText)
          payload = JSON.parse(rawText);
        if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {} else {
          console.warn("[recon] HUNT_DONE payload is not an object \u2014 skipped");
          continue;
        }
      } catch (e) {
        const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const salvage = new RegExp(`"runId"\\s*:\\s*"${esc}(\\d+)"`).exec(rawText);
        if (salvage?.[1] !== undefined)
          seq = Math.max(seq, Number(salvage[1]));
        console.warn(`[recon] HUNT_DONE payload parse failed \u2014 skipped: ${e instanceof Error ? e.message : String(e)}; raw=${rawText.slice(0, 120)}`);
        continue;
      }
      if (typeof payload.runId === "string" && payload.runId.startsWith(prefix)) {
        const rest = payload.runId.slice(prefix.length);
        if (/^\d+$/.test(rest))
          seq = Math.max(seq, Number(rest));
      }
    }
    return `${prefix}${seq + 1}`;
  } finally {
    try {
      db.close();
    } catch {}
  }
}

// src/hunter/harness/map.ts
init_db();
import path23 from "path";

// src/hunter/shared/line-resolve.ts
function tryResolveLine(node, edge) {
  const obj = node !== null && typeof node === "object" ? node : undefined;
  const data = obj?.data ?? {};
  const candidates = [
    obj?.line,
    data["line"],
    data["line_start"],
    data["line_end"],
    obj?.source_location,
    data["source_location"],
    edge?.source_location,
    edge?.metadata?.["line"]
  ];
  for (const c of candidates) {
    const n = parseLineValue2(c);
    if (n !== undefined)
      return n;
  }
  return;
}
function resolveLine(node, edge, context = "") {
  const n = tryResolveLine(node, edge);
  if (n !== undefined)
    return n;
  const who = context && context.length > 0 ? context : "graph node";
  throw new Error(`LINELESS_NODE: no line for ${who} (checked line/line_start/line_end/source_location)`);
}
function parseLineValue2(v) {
  if (typeof v === "number" && Number.isFinite(v) && v >= 1)
    return Math.floor(v);
  if (typeof v === "string") {
    const m = /^\s*L?\s*(\d+)\s*$/.exec(v);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n >= 1)
        return Math.floor(n);
    }
  }
  return;
}

// src/hunter/harness/map.ts
async function map(profile, adapterOverride) {
  const adapter = adapterOverride ?? selectAdapter(profile);
  const buildResult = await adapter.build(profile);
  assertMappableLines(buildResult);
  if (buildResult.nodes.length === 0) {
    throw graphEmpty("map actor: adapter build produced zero nodes");
  }
  const projectRootResolved = path23.resolve(profile.project.root);
  const dbPath = resolveStoreDbPath(projectRootResolved);
  if (dbPath !== projectRootResolved && !dbPath.startsWith(projectRootResolved + path23.sep)) {
    throw new Error(`map actor: resolved dbPath escapes project root (${dbPath})`);
  }
  const db = openStore(dbPath);
  try {
    writeGraph(db, buildResult.nodes, buildResult.edges);
    const mirrorPath = mirrorToMasterContext(db, profile);
    return { adapter, buildResult, db, dbPath, mirrorPath };
  } catch (e) {
    try {
      db.close();
    } catch {}
    throw e;
  }
}
var LINELESS_EXEMPT_KIND = {
  file: true,
  module: true,
  stage: true,
  rule: true
};
function assertMappableLines(buildResult) {
  const edgeLocByTarget = {};
  for (const e of buildResult.edges) {
    const cand = { source_location: e.source_location, metadata: e.metadata };
    const prev = edgeLocByTarget[e.targetId];
    if (prev === undefined) {
      edgeLocByTarget[e.targetId] = cand;
    } else if (tryResolveLine({}, prev) === undefined && tryResolveLine({}, cand) !== undefined) {
      edgeLocByTarget[e.targetId] = cand;
    }
  }
  for (const n of buildResult.nodes) {
    if (n.lineage === "SPEC_DERIVED")
      continue;
    if (LINELESS_EXEMPT_KIND[n.kind] === true)
      continue;
    if (typeof n.file !== "string" || n.file.length === 0)
      continue;
    const data = n.data ?? {};
    resolveLine({ line: n.line === 0 ? undefined : n.line ?? undefined, data, source_location: data["source_location"] }, edgeLocByTarget[n.id] ?? null, n.id);
  }
}

// src/hunter/harness/scan.ts
import path26 from "path";

// src/hunter/lexicon/compiler.ts
init_db_canon();
init_templates();
init_rule_card();
import { readFile } from "fs/promises";

// src/hunter/lexicon/compiled-store.ts
init_db_canon();
init_templates();
var COMPILED_PREDICATES_COLUMNS = [
  "id",
  "family",
  "template",
  "bindings",
  "verbatim_quote",
  "anchor",
  "severity",
  "check_code",
  "battery_version",
  "calibrated"
].join(",");
function writeCompiledCache(db, battery, cards, corpusHash) {
  db.exec("BEGIN IMMEDIATE");
  let committed = false;
  const stmts = [];
  try {
    const delCards = db.prepare("DELETE FROM rule_cards WHERE corpus_hash = ?");
    stmts.push(delCards);
    delCards.run(corpusHash);
    const insCard = db.prepare("INSERT INTO rule_cards (quote,anchor,classification,severity,proposed,corpus_hash) VALUES (?,?,?,?,?,?)");
    stmts.push(insCard);
    for (const c of cards) {
      insCard.run(c.verbatimQuote, c.anchor, c.classification, c.severity, c.proposed, corpusHash);
    }
    {
      const delBat = db.prepare("DELETE FROM compiled_predicates WHERE battery_version = ?");
      stmts.push(delBat);
      delBat.run(corpusHash);
      for (const p of battery) {
        if (p.batteryVersion !== corpusHash) {
          throw new LexiconError("VERSION_MISMATCH", `VERSION_MISMATCH: battery predicate ${p.id} has batteryVersion ${p.batteryVersion} != corpusHash ${corpusHash}`);
        }
      }
    }
    if (battery.length > 0) {
      const insBat = db.prepare(`INSERT OR REPLACE INTO compiled_predicates (${COMPILED_PREDICATES_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?)`);
      stmts.push(insBat);
      for (const p of battery) {
        const checkCode = JSON.stringify({ template: p.template, bindings: p.bindings });
        insBat.run(p.id, p.family, p.template, JSON.stringify(p.bindings), p.verbatimQuote, p.anchor, p.severity, checkCode, p.batteryVersion, "PENDING");
      }
    }
    db.exec("COMMIT");
    committed = true;
  } catch (e) {
    if (!committed) {
      try {
        db.exec("ROLLBACK");
      } catch {}
    }
    throw e;
  } finally {
    for (const st of stmts) {
      try {
        st.finalize();
      } catch {}
    }
  }
}
function loadBattery(db, batteryVersion) {
  const stmt = db.prepare("SELECT id,family,template,bindings,verbatim_quote,anchor,severity,check_code,battery_version FROM compiled_predicates WHERE battery_version = ?");
  try {
    const rows = stmt.all(batteryVersion);
    return rows.map((row) => rehydrate(row));
  } finally {
    try {
      stmt.finalize();
    } catch {}
  }
}
function rehydrate(row) {
  let bindings;
  let templateId;
  let bound;
  try {
    bindings = JSON.parse(String(row["bindings"] ?? "{}"));
    const parsed = JSON.parse(String(row["check_code"] ?? "{}"));
    const code = parsed !== undefined && parsed !== null && typeof parsed === "object" ? parsed : {};
    templateId = String(code["template"] ?? row["template"] ?? "");
    bound = code["bindings"] ?? bindings;
  } catch (e) {
    console.error(`[compiled-store] BINDINGS_UNPARSEABLE id=${String(row["id"])}: ${e instanceof Error ? e.message : String(e)}`);
    throw new LexiconError("BINDINGS_UNPARSEABLE", `BINDINGS_UNPARSEABLE: id=${String(row["id"])} detail=${String(e)}`);
  }
  const template = TEMPLATE_LIBRARY[templateId];
  if (!template)
    throw templateMissing(templateId);
  return {
    id: String(row["id"]),
    family: predicateFamilyFrom(row["family"]),
    template: templateId,
    bindings: bound,
    verbatimQuote: String(row["verbatim_quote"]),
    anchor: String(row["anchor"]),
    severity: severityFrom(row["severity"]),
    batteryVersion: String(row["battery_version"]),
    check: (ctx) => template.check({ ...ctx, bindings: bound })
  };
}
function predicateFamilyFrom(v) {
  if (v === "WIRING" || v === "CONTRACT" || v === "PROVENANCE" || v === "DOMAIN" || v === "PROCESS") {
    return v;
  }
  return "WIRING";
}
function severityFrom(v) {
  if (typeof v === "string" && SEVERITIES.includes(v)) {
    return v;
  }
  return "MED";
}

// src/hunter/lexicon/compiler.ts
var ARCH_TEMPLATE_KEY = "contract.must-implement";
function projectTokenSlug(projectName) {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug === "" ? "project" : slug;
}
function batteryNameFromCards(cards) {
  if (cards.length === 0)
    return "rules";
  const first = cards[0];
  const stem = first.anchor.split("/").pop()?.split(".")[0] ?? "rules";
  return `${first.classification.toLowerCase()}-${stem}`;
}
async function batteryVersionWithCardsAsync(profile) {
  if (profile.rules.corpus.length === 0) {
    await Promise.resolve().then(() => init_rule_card());
    throw corpusEmpty();
  }
  const reads = await Promise.all(profile.rules.corpus.map(async (p) => {
    let text;
    try {
      text = await readFile(p, "utf8");
    } catch (e) {
      throw corpusUnreadable(p, String(e));
    }
    return { file: p, text };
  }));
  const texts = reads.map(({ file, text }) => `${file}
${text}`);
  const cards = reads.flatMap(({ file, text }) => cardsFromText(file, text));
  const corpusText = texts.join(`
`);
  const hash = sha256(`${corpusText}
${JSON.stringify(profile.rules.bindings)}`);
  const version = `${projectTokenSlug(profile.project.name)}-${batteryNameFromCards(cards)}-battery-v1 (fingerprint: ${hash.slice(0, 12)})`;
  return { version, cards };
}
function selectTemplate(card) {
  const need = (key) => {
    const t = TEMPLATE_LIBRARY[key];
    if (!t)
      throw new LexiconError("TEMPLATE_MISSING", `TEMPLATE_MISSING: no predicate template for key '${key}' (classification=${card.classification})`);
    return t;
  };
  switch (card.classification) {
    case "ARCH":
      return need(ARCH_TEMPLATE_KEY);
    case "LOGIC":
      return need("provenance.traces-to-source");
    case "PROCESS":
      return need("process.gates-measure-outputs-not-logic");
    case "DOMAIN":
      return need("domain.numeric-threshold");
    default:
      throw new LexiconError("CLASSIFICATION_UNKNOWN", `CLASSIFICATION_UNKNOWN: card anchor=${card.anchor} carries classification '${String(card.classification)}' \u2014 no template binding exists (expected ARCH|LOGIC|PROCESS|DOMAIN)`);
  }
}
function compileCards(cards, profile, version) {
  const battery = [];
  for (const card of cards) {
    if (!card.verbatimQuote || card.verbatimQuote.trim() === "") {
      throw new LexiconError("D13_VIOLATION", `D13_VIOLATION: card anchor=${card.anchor} \u2014 doctrine is QUOTED, never synthesized; the remedy: record the verbatim rule text or curate the PROPOSED card`);
    }
    const template = selectTemplate(card);
    const bindings = {
      ...profile.rules.bindings[template.id] ?? {},
      verbatimQuote: card.verbatimQuote,
      anchor: card.anchor,
      severity: card.severity
    };
    battery.push(compileTemplate(template, bindings, card, version));
  }
  return battery;
}
function compileDeclared(profile, version) {
  const declared = profile.rules.bindings["declaredPredicates"];
  if (!declared || typeof declared !== "object")
    return [];
  const battery = [];
  for (const [ruleId, raw] of Object.entries(declared)) {
    const binding = raw ?? {};
    const templateId = String(binding["template"] ?? "");
    const template = TEMPLATE_LIBRARY[templateId];
    if (!template) {
      throw new LexiconError("TEMPLATE_UNKNOWN", `TEMPLATE_UNKNOWN: declaredPredicate ${ruleId} names template '${templateId}' which is not in the library`);
    }
    const rawQuote = binding["verbatimQuote"];
    if (typeof rawQuote !== "string" || rawQuote.trim() === "") {
      throw new LexiconError("D13_VIOLATION", `D13_VIOLATION: declaredPredicate ${ruleId} lacks a verbatim quote \u2014 doctrine is QUOTED, never synthesized`);
    }
    const verbatimQuote = rawQuote;
    const anchor = String(binding["anchor"] ?? `${ruleId}`);
    const severity = severityFromBinding(binding["severity"]);
    battery.push(compileTemplate(template, binding, { verbatimQuote, anchor, severity }, version));
  }
  return battery;
}
async function compile(profile) {
  const { battery } = await compileBattery(profile);
  return battery;
}
async function compileBattery(profile, db) {
  const { version, cards: versionCards } = await batteryVersionWithCardsAsync(profile);
  if (db) {
    const row = db.prepare("SELECT COUNT(*) AS c FROM compiled_predicates WHERE battery_version = ?").get(version);
    if (Number(row?.["c"] ?? 0) > 0) {
      return { battery: loadBattery(db, version), batteryVersion: version, fromCache: true };
    }
  }
  const cards = versionCards;
  const battery = [...compileCards(cards, profile, version), ...compileDeclared(profile, version)];
  if (db) {
    writeCompiledCache(db, battery, cards, version);
  }
  return { battery, batteryVersion: version, fromCache: false };
}
function severityFromBinding(v) {
  if (v === undefined)
    return "HIGH";
  if (typeof v === "string" && SEVERITIES.includes(v)) {
    return v;
  }
  throw new LexiconError("SEVERITY_UNKNOWN", `SEVERITY_UNKNOWN: declared binding carries invalid severity '${String(v)}' (expected ${SEVERITIES.join("|")})`);
}

// src/hunter/diagnostics/calibration.ts
init_templates();
import fs22 from "fs";
import path24 from "path";
class CalibrationError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = code;
    this.code = code;
  }
}
function calibrationFixtureInvalid(detail) {
  return new CalibrationError("CALIBRATION_FIXTURE_INVALID", `CALIBRATION_FIXTURE_INVALID: detail=${detail} (a malformed fixture is a loud named error, never a coerced default)`);
}

class CalibrationGate {
  fixtures;
  fixtureVersion;
  dryRun;
  fireByPred = new Map;
  silentByPred = new Map;
  verdicts = new Map;
  battery;
  calibratedAt;
  constructor(battery, fixtures, fixtureVersion, dryRun = true) {
    this.fixtures = fixtures;
    this.fixtureVersion = fixtureVersion;
    this.dryRun = dryRun;
    this.calibratedAt = Date.now();
    this.battery = battery.map((p) => ({ ...p }));
  }
  async fireTest(p, fireFixtures) {
    const result = this.computeFireTest(p, fireFixtures);
    this.fireByPred.set(p.id, result);
    this.mark(p);
    return result;
  }
  async silentTest(p, goldenFixtures) {
    const result = this.computeSilentTest(p, goldenFixtures);
    this.silentByPred.set(p.id, result);
    this.mark(p);
    return result;
  }
  verdictOf(predicateId) {
    return this.verdicts.get(predicateId) ?? "PENDING";
  }
  liveBattery() {
    return this.battery.filter((p) => this.verdictOf(p.id) === "CALIBRATED");
  }
  excluded() {
    return this.battery.filter((p) => this.verdictOf(p.id) === "FLAGGED");
  }
  batteryVersion(fixtureVersion = this.fixtureVersion) {
    const corpusHash = sha256(this.battery.map((p) => `${p.id}
${p.anchor}
${p.verbatimQuote}
${p.severity}
${p.template}
${p.family}`).join(`
`));
    const bindingsHash = sha256(this.battery.map((p) => JSON.stringify(p.bindings)).join(`
`));
    const fixturesHash = sha256(`${this.serializeFixtures()}|${fixtureVersion}`);
    return sha256(`${corpusHash}|${bindingsHash}|${fixturesHash}`);
  }
  serializeFixtures() {
    const graphOf = (graph) => {
      let rawNodes;
      try {
        rawNodes = graph.nodes();
      } catch (e) {
        throw calibrationFixtureInvalid(`graph.nodes() threw for fixture: ${e instanceof Error ? e.message : String(e)}`);
      }
      const nodes = rawNodes.map((n) => ({
        id: n.id,
        kind: n.kind,
        name: n.name,
        file: n.file ?? null,
        line: n.line ?? null,
        lineage: n.lineage,
        source: n.source,
        data: n.data ?? null
      }));
      nodes.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      const edges = rawNodes.map((n) => {
        try {
          return { to: n.id, callers: graph.whoCalls(n.name).map((c) => `${c.caller}@${c.file}:${c.line}`).sort() };
        } catch (e) {
          throw calibrationFixtureInvalid(`graph.whoCalls() threw for node ${n.name}: ${e instanceof Error ? e.message : String(e)}`);
        }
      });
      edges.sort((a, b) => String(a.to).localeCompare(String(b.to)));
      return { nodes, edges };
    };
    return JSON.stringify({
      fire: this.fixtures.fire.map((f) => ({
        ruleId: f.ruleId,
        file: f.file,
        line: f.line,
        description: f.description,
        source: f.source,
        graph: graphOf(f.graph)
      })),
      golden: this.fixtures.golden.map((g) => ({
        anchor: g.anchor,
        file: g.file,
        source: g.source,
        graph: graphOf(g.graph)
      }))
    });
  }
  async run(profile, fixtureVersion = this.fixtureVersion, write) {
    const records = [];
    for (const p of this.battery) {
      const fireFixtures = this.fixtures.fire.filter((f) => f.ruleId === p.id);
      const fire = this.computeFireTest(p, fireFixtures);
      this.fireByPred.set(p.id, fire);
      const silent = this.computeSilentTest(p, this.fixtures.golden);
      this.silentByPred.set(p.id, silent);
      this.mark(p);
      const verdict = this.verdictOf(p.id);
      if (verdict === "PENDING") {
        throw new CalibrationError("CALIBRATION_PENDING", `CALIBRATION_PENDING: predicate ${p.id} reached the record stage without a completed fire+silent verdict \u2014 a calibration row is never written from a half-tested predicate`);
      }
      const fireFailed = fire.result === "MISS";
      const silentFailed = silent.result === "FALSE-FIRE";
      const failedTest = verdict === "CALIBRATED" ? undefined : fireFailed && silentFailed ? "BOTH" : fireFailed ? "FIRE" : silentFailed ? "SILENT" : undefined;
      const reason = failedTest === "FIRE" ? "the predicate never fires on its own trigger fixture \u2014 the logic is dead" : failedTest === "SILENT" ? `the predicate fires on the golden state \u2014 false positives on known-good` : failedTest === "BOTH" ? "both the fire and the silent tests fail \u2014 the predicate is incoherent" : undefined;
      records.push({
        predicateId: p.id,
        fire: {
          fixtureAnchor: fireFixtures.map((f) => `${f.file}:${f.line}`).join(",") || "NONE",
          fired: fire.result === "FIRED",
          evidence: fire.evidence
        },
        silent: {
          goldenFixture: this.fixtures.golden.map((g) => g.anchor).join(","),
          findings: silent.findings,
          evidence: silent.evidence
        },
        verdict,
        failedTest,
        reason,
        calibratedAt: this.calibratedAt
      });
    }
    const liveBattery = this.battery.filter((p) => this.verdictOf(p.id) === "CALIBRATED");
    const excluded = this.battery.filter((p) => this.verdictOf(p.id) === "FLAGGED");
    const coverageNote = excluded.length === 0 ? "all predicates calibrated \u2014 zero exclusions" : excluded.map((p) => `${p.id}: ${records.find((r) => r.predicateId === p.id)?.reason ?? "FLAGGED"}`).join(`
`);
    const version = this.batteryVersion(fixtureVersion);
    if (write && !this.dryRun) {
      const recordPath = write.recordPath ?? path24.join(profile.project.root, ".gi", "bug-hunter");
      if (write.db) {
        this.writeCalibrationRows(write.db, records, fixtureVersion);
      }
      try {
        this.writeCalibrationRecord(recordPath, { version, records, excluded, coverageNote });
      } catch (e) {
        let compensated = false;
        let deleteDetail = "no-db-write";
        if (write.db) {
          try {
            const del = write.db.prepare("DELETE FROM calibrations WHERE run_id = ? AND created_at = ?").run(`calibration-${fixtureVersion}`, this.calibratedAt);
            const affected = typeof del === "object" && del !== null && "changes" in del ? Number(del.changes) : NaN;
            if (Number.isFinite(affected) && affected > 0) {
              compensated = true;
            } else {
              deleteDetail = `the DELETE affected ${Number.isFinite(affected) ? affected : "an unknown number of"} rows (no rows matched run_id=calibration-${fixtureVersion} created_at=${this.calibratedAt}) \u2014 the half-evidence may still stand`;
            }
          } catch (delErr) {
            deleteDetail = delErr instanceof Error ? delErr.message : String(delErr);
          }
        }
        throw new CalibrationError("CALIBRATION_PERSIST_SPLIT", compensated ? `CALIBRATION_PERSIST_SPLIT: the file record failed after the DB rows committed (${e instanceof Error ? e.message : String(e)}) \u2014 this session's rows were compensated (deleted) so no half-evidence stands` : `CALIBRATION_PERSIST_SPLIT: the file record failed after the DB rows committed (${e instanceof Error ? e.message : String(e)}) \u2014 compensation DELETE FAILED (${deleteDetail}): this session's rows may still stand \u2014 re-run calibration or delete WHERE run_id='calibration-${fixtureVersion}' AND created_at=${this.calibratedAt}`);
      }
    }
    return { records, liveBattery, excluded, batteryVersion: version, coverageNote, dryRun: this.dryRun };
  }
  runCheck(p, graph, source) {
    const ctx = { graph, source: { read: () => source } };
    return run([p], ctx);
  }
  computeFireTest(p, fireFixtures) {
    const matching = fireFixtures.filter((f) => f.ruleId === p.id);
    if (matching.length === 0) {
      return {
        result: "MISS",
        fixtureAnchor: "NONE",
        evidence: `no fire fixtures matched predicate ${p.id} \u2014 the predicate has no recorded violation history to prove against`
      };
    }
    const hits = [];
    const misses = [];
    for (const fixture of matching) {
      this.validateFireFixture(fixture);
      const findings = this.runCheck(p, fixture.graph, fixture.source);
      const normFixture = fixture.file.replace(/\\/g, "/");
      const hit = findings.some((f) => {
        const normFinding = f.file.replace(/\\/g, "/");
        const fileMatch = normFinding === normFixture || normFinding.endsWith("/" + normFixture);
        return f.ruleId === p.id && f.verdict === "VIOLATION" && fileMatch && f.line >= fixture.line - 2 && f.line <= fixture.line + 2;
      });
      (hit ? hits : misses).push(`${fixture.file}:${fixture.line}`);
    }
    const fired = hits.length > 0;
    const evidence = fired ? `fired on ${hits.length}/${matching.length} fire fixtures (${hits.map((h) => `${h}:HIT`).join(", ")})${misses.length > 0 ? `; missed ${misses.map((m) => `${m}:MISS`).join(", ")}` : ""}` : `ZERO fire fixtures triggered \u2014 ${matching.length} candidates checked (${matching.map((m) => `${m.file}:${m.line}`).join(", ")})`;
    return {
      result: fired ? "FIRED" : "MISS",
      fixtureAnchor: matching.map((f) => `${f.file}:${f.line}`).join(","),
      evidence
    };
  }
  computeSilentTest(p, goldenFixtures) {
    const offending = [];
    for (const g of goldenFixtures) {
      this.validateGoldenFixture(g);
      const findings = this.runCheck(p, g.graph, g.source);
      for (const f of findings) {
        if (f.ruleId === p.id) {
          offending.push(`${g.anchor}:${f.severity} \u2014 ${f.evidence.slice(0, 200)}`);
        }
      }
    }
    return {
      result: offending.length === 0 ? "SILENT" : "FALSE-FIRE",
      goldenFixture: goldenFixtures.map((g) => g.anchor).join(","),
      findings: offending.length,
      evidence: offending.join(`
`)
    };
  }
  validateFireFixture(f) {
    if (typeof f.ruleId !== "string" || f.ruleId.trim() === "") {
      throw calibrationFixtureInvalid("a fire fixture carries an empty ruleId");
    }
    if (typeof f.file !== "string" || f.file.trim() === "") {
      throw calibrationFixtureInvalid(`fire fixture ${f.ruleId} carries an empty file anchor`);
    }
    if (typeof f.line !== "number" || !Number.isFinite(f.line)) {
      throw calibrationFixtureInvalid(`fire fixture ${f.ruleId} carries an invalid line anchor`);
    }
    if (!f.graph || typeof f.graph.nodes !== "function") {
      throw calibrationFixtureInvalid(`fire fixture ${f.ruleId} carries no graph`);
    }
    if (typeof f.source !== "string" || f.source.trim() === "") {
      throw calibrationFixtureInvalid(`fire fixture ${f.ruleId} carries no source read`);
    }
  }
  validateGoldenFixture(g) {
    if (typeof g.anchor !== "string" || g.anchor.trim() === "") {
      throw calibrationFixtureInvalid("a golden fixture carries an empty anchor");
    }
    if (typeof g.file !== "string" || g.file.trim() === "") {
      throw calibrationFixtureInvalid(`golden fixture ${g.anchor} carries an empty file anchor`);
    }
    if (!g.graph || typeof g.graph.nodes !== "function") {
      throw calibrationFixtureInvalid(`golden fixture ${g.anchor} carries no graph`);
    }
    if (typeof g.source !== "string" || g.source.trim() === "") {
      throw calibrationFixtureInvalid(`golden fixture ${g.anchor} carries no source read`);
    }
  }
  mark(p) {
    const fire = this.fireByPred.get(p.id);
    const silent = this.silentByPred.get(p.id);
    let verdict;
    if (fire && fire.result === "MISS")
      verdict = "FLAGGED";
    else if (silent && silent.result === "FALSE-FIRE")
      verdict = "FLAGGED";
    else if (fire && silent)
      verdict = "CALIBRATED";
    const owned = this.battery.find((b) => b.id === p.id);
    if (owned) {
      if (verdict) {
        this.verdicts.set(p.id, verdict);
        markCalibrated(owned, verdict);
      } else {
        markCalibrated(owned, "PENDING");
      }
    } else {
      if (verdict)
        this.verdicts.set(p.id, verdict);
    }
  }
  writeCalibrationRows(db, records, fixtureVersion) {
    const ins = db.prepare("INSERT INTO calibrations (predicate_id,test,fixture,result,evidence,run_id,created_at) VALUES (?,?,?,?,?,?,?)");
    const runId = `calibration-${fixtureVersion}`;
    try {
      db.exec("BEGIN IMMEDIATE");
      for (const r of records) {
        ins.run(r.predicateId, "FIRE", r.fire.fixtureAnchor, r.fire.fired ? "FIRED" : "MISS", r.fire.evidence, runId, this.calibratedAt);
        ins.run(r.predicateId, "SILENT", r.silent.goldenFixture, r.silent.findings === 0 ? "SILENT" : "FALSE-FIRE", r.silent.evidence, runId, this.calibratedAt);
      }
      db.exec("COMMIT");
    } catch (e) {
      try {
        db.exec("ROLLBACK");
      } catch (rb) {
        throw new CalibrationError("CALIBRATION_ROLLBACK_FAILED", `CALIBRATION_ROLLBACK_FAILED: batch error=${e instanceof Error ? e.message : String(e)} rollback error=${rb instanceof Error ? rb.message : String(rb)} (the transaction may still be open \u2014 do not reuse this handle for writes)`);
      }
      throw e;
    }
  }
  writeCalibrationRecord(recordPath, data) {
    fs22.mkdirSync(recordPath, { recursive: true });
    const existing = fs22.readdirSync(recordPath).filter((f) => /^CALIBRATION_v\d+\.md$/.test(f)).length;
    let n = existing + 1;
    let file = path24.join(recordPath, `CALIBRATION_v${n}.md`);
    for (;; ) {
      let fd;
      try {
        fd = fs22.openSync(file, "wx", 420);
      } catch (e) {
        const code = e?.code;
        if (code === "EEXIST") {
          n += 1;
          file = path24.join(recordPath, `CALIBRATION_v${n}.md`);
          continue;
        }
        throw e;
      }
      fs22.closeSync(fd);
      break;
    }
    const rows = data.records.map((r) => `| ${r.predicateId} | ${r.verdict} | ${r.failedTest ?? "-"} | ${r.fire.fired ? "FIRED" : "MISS"} | ${r.silent.findings === 0 ? "SILENT" : "FALSE-FIRE"} |`).join(`
`);
    const excludedIds = data.excluded.map((p) => p.id);
    const body = [
      `# CALIBRATION_v${n}`,
      "",
      `- batteryVersion: ${data.version}`,
      `- dryRun: ${this.dryRun}`,
      `- calibratedAt: ${this.calibratedAt}`,
      `- excludedIds: ${JSON.stringify(excludedIds)}`,
      "",
      "## Records",
      "",
      "| predicateId | verdict | failedTest | fire | silent |",
      "|---|---|---|---|---|",
      rows,
      "",
      "## Coverage note",
      "",
      data.coverageNote,
      "",
      "```jsonc",
      JSON.stringify({
        batteryVersion: data.version,
        dryRun: this.dryRun,
        calibratedAt: this.calibratedAt,
        excludedIds,
        records: data.records,
        coverageNote: data.coverageNote
      }, null, 2),
      "```",
      ""
    ].join(`
`);
    const tmpFile = `${file}.tmp.${process.pid}.${Date.now()}`;
    try {
      fs22.writeFileSync(tmpFile, body, { mode: 420 });
      fs22.renameSync(tmpFile, file);
    } catch (e) {
      try {
        fs22.unlinkSync(tmpFile);
      } catch {}
      throw e;
    }
  }
}
async function runCalibration(profile, fixtures, opts = {}) {
  try {
    const fixtureVersion = opts.fixtureVersion ?? "v1";
    const battery = opts.battery ?? await compile(profile);
    const gate = new CalibrationGate(battery, fixtures, fixtureVersion, opts.dryRun ?? true);
    const result = await gate.run(profile, fixtureVersion, opts.db || opts.recordPath ? { db: opts.db, recordPath: opts.recordPath } : undefined);
    return result;
  } catch (e) {
    console.warn(`[calibration] runCalibration failed: ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }
}
function markCalibrated(p, verdict) {
  if (p !== undefined && p !== null) {
    p.calibrated = verdict;
    return;
  }
  throw calibrationFixtureInvalid("the predicate row is missing for the calibrated mark");
}

// src/hunter/harness/scan.ts
init_containment();
function resolveCorpusPaths(profile) {
  const root = path26.resolve(profile.project.root);
  const corpus = profile.rules.corpus.map((entry) => {
    const abs = path26.isAbsolute(entry) ? path26.normalize(entry) : path26.resolve(root, entry);
    const ev = checkContained(abs, root);
    if (!ev.contained) {
      throw new Error(`HUNT_INVALID_CORPUS: entry=${entry} resolves outside the project root (root=${ev.rootReal} real=${ev.real}) \u2014 corpus entries must stay under the root.`);
    }
    if (!ev.resolved) {
      console.warn(`[scan] HUNT_INVALID_CORPUS WARNING: entry=${entry} could not be resolved through symlinks (real=${ev.real}) \u2014 contained on the nearest ancestor, treating as inside but unverified`);
    }
    return ev.real;
  });
  return {
    ...profile,
    rules: { ...profile.rules, corpus }
  };
}
function extractCalibrationFixtures(bindings) {
  const raw = bindings?.calibrationFixtures;
  if (raw === undefined || raw === null)
    return null;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`SCAN_INVALID_BINDINGS: calibrationFixtures must be an object with fire/golden arrays, got ${Array.isArray(raw) ? "array" : typeof raw} \u2014 refusing a silent calibration skip`);
  }
  const rec = raw;
  for (const key of ["fire", "golden"]) {
    const v = rec[key];
    if (v !== undefined && !Array.isArray(v)) {
      throw new Error(`SCAN_INVALID_BINDINGS: calibrationFixtures.${key} must be an array, got ${typeof v} \u2014 refusing a silent calibration skip`);
    }
  }
  return {
    fire: Array.isArray(rec.fire) ? rec.fire : [],
    golden: Array.isArray(rec.golden) ? rec.golden : []
  };
}
async function scan(profile, adapter, runId, db) {
  try {
    const normalized = resolveCorpusPaths(profile);
    const { battery, batteryVersion } = await compileBattery(normalized, db);
    if (battery.length === 0) {
      throw new Error("HUNT_NO_COVERAGE: rulesCompiled=0 \u2014 the rule battery compiled zero actionable predicates. " + "The corpus must contain machine-matchable rules (not prose contracts). state=inconclusive.");
    }
    const methodsScanned = adapter.nodes().length;
    if (methodsScanned === 0) {
      throw new Error("HUNT_NO_COVERAGE: methodsScanned=0 \u2014 the graph reported zero methods. " + "No methods to scan is inconclusive, never a clean pass. state=inconclusive.");
    }
    let liveBattery = battery;
    try {
      const fixtures = extractCalibrationFixtures(normalized.rules.bindings) ?? { fire: [], golden: [] };
      const hasFixtures = fixtures.fire.length > 0 || fixtures.golden.length > 0;
      if (hasFixtures) {
        const cal = await runCalibration(normalized, fixtures, { battery, dryRun: true });
        if (cal.excluded.length > 0) {
          liveBattery = cal.liveBattery;
          console.warn(`[scan] D17 calibration: ${cal.excluded.length} FLAGGED \u2192 EXCLUDED; ${cal.coverageNote}`);
        }
        if (liveBattery.length === 0) {
          throw new Error(`HUNT_NO_COVERAGE: all ${battery.length} predicates FLAGGED by D17 calibration (liveBattery empty) \u2014 zero calibrated predicates is INCONCLUSIVE, never a clean pass. ${cal.coverageNote}`);
        }
      }
    } catch (calErr) {
      const msg = calErr instanceof Error ? calErr.message : String(calErr);
      if (msg.startsWith("HUNT_NO_COVERAGE:"))
        throw calErr;
      console.warn(`[scan] D17 calibration gate failed: ${msg}`);
      throw new Error(`SCAN_CALIBRATION_FAILED: the D17 gate faulted (${msg.slice(0, 200)}) \u2014 the battery is unvalidated, refusing the run`);
    }
    const run = runBattery(liveBattery, adapter, normalized, runId, db);
    return { battery: liveBattery, batteryVersion, run };
  } catch (e) {
    console.warn(`[scan] failed: ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }
}

// src/hunter/harness/trace.ts
function findingIdOf(f) {
  return `${f.ruleId}:${f.file}:${f.line}`;
}
function severityWeight(s) {
  switch (s) {
    case "CRIT":
      return 1;
    case "HIGH":
      return 0.75;
    case "MED":
      return 0.5;
    case "WARN":
      return 0.25;
    default:
      return 0.5;
  }
}
function deriveRootCause(f, evidenceLen) {
  const anchor = `${f.file}:${f.line}`;
  const evidenceText = typeof f.evidence === "string" ? f.evidence : "";
  const first = evidenceText.split(/\n|\.\s/)[0]?.trim() ?? evidenceText;
  const mechanism = first.length > 120 ? `${first.slice(0, 120)}\u2026` : first;
  const depth = evidenceLen > 3 ? "a multi-step edge chain" : "a single-edge mechanism";
  return `the ${f.ruleId} violation at ${anchor} (${depth}): ${mechanism}`;
}
function legacySolveTrace(findings, graph) {
  const ruleCounts = new Map;
  for (const f of findings) {
    ruleCounts.set(f.ruleId, (ruleCounts.get(f.ruleId) ?? 0) + 1);
  }
  const total = findings.length === 0 ? 1 : findings.length;
  return findings.map((f) => {
    const blast = ruleCounts.get(f.ruleId) ?? 0;
    const evText = typeof f.evidence === "string" ? f.evidence : "";
    const evidenceLen = evText.split(/\s+->\s+|,|\n/).filter((s) => s.trim().length > 0).length;
    const relevance = {
      "first-principles": severityWeight(f.severity),
      "systematic-debugging": Math.min(1, evidenceLen / 6),
      "problem-solving": f.file && f.line > 0 ? 1 : 0.5,
      "own-every-problem": 1,
      "steve-jobs-energy": Math.min(1, severityWeight(f.severity) * (0.5 + blast / total)),
      "scale-is-infinite": Math.min(1, blast / total)
    };
    const rootCause = deriveRootCause(f, evidenceLen);
    return {
      findingId: findingIdOf(f),
      ruleId: f.ruleId,
      severity: f.severity,
      file: f.file,
      line: f.line,
      relevance,
      rootCause
    };
  });
}
async function solveTrace(findings, graph) {
  if (!Array.isArray(findings)) {
    throw new Error("TRACE_INVALID: findings must be array");
  }
  if (findings.length === 0)
    return [];
  return legacySolveTrace(findings, graph);
}

// src/hunter/harness/strike.ts
function strike(findings, profile, traces = []) {
  const deduped = dedupe(findings);
  const ranked = rankFindings(deduped, profile);
  const traceByFinding = new Map;
  for (const t of traces) {
    const existing = traceByFinding.get(t.findingId);
    if (!existing) {
      traceByFinding.set(t.findingId, { ...t, relevance: { ...t.relevance } });
      continue;
    }
    const merged = { ...existing.relevance };
    for (const [k, v] of Object.entries(t.relevance ?? {}))
      merged[k] = (merged[k] ?? 0) + (typeof v === "number" ? v : 0);
    traceByFinding.set(t.findingId, { ...existing, relevance: merged });
  }
  const relevanceOf = (f) => {
    const t = traceByFinding.get(findingIdOf(f));
    if (!t || t.relevance == null)
      return 0;
    return Object.values(t.relevance).reduce((s, v) => s + (typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0), 0);
  };
  const ordered = [...ranked].sort((a, b) => {
    const ra = relevanceOf(a);
    const rb = relevanceOf(b);
    if (ra !== rb)
      return rb - ra;
    const sa = severityScore(a.severity);
    const sb = severityScore(b.severity);
    if (sa !== sb)
      return sb - sa;
    const ia = findingIdOf(a), ib = findingIdOf(b);
    return ia < ib ? -1 : ia > ib ? 1 : 0;
  });
  const fixOrder = ordered.map((f) => findingIdOf(f));
  return { findings: ordered, fixOrder };
}

// src/hunter/harness/report.ts
init_ontology();
init_db();
import fs24 from "fs";
import path27 from "path";

// src/hunter/firewall/lexicon-types.ts
var MASTER_CONTEXT_VARIANTS = [
  "MASTER_CONTEXT",
  "master-context",
  "master_context",
  "MasterContext",
  "masterContext",
  "master context"
];

// src/hunter/harness/report.ts
function sectionFromFinding(f, trace) {
  const anchor = `${f.file}:${f.line}`;
  const mechanism = trace?.rootCause ?? `the ${f.ruleId} violation at ${anchor}`;
  return {
    findingId: findingIdOf(f),
    howBroken: mechanism,
    whyBroken: trace?.rootCause ? `the ${f.ruleId} predicate fired because ${trace.rootCause} (at ${anchor})` : `the ${f.ruleId} predicate fired on the evidence at ${anchor}`,
    whatViolates: f.evidence,
    howToFix: `resolve the ${f.ruleId} violation at ${anchor}`,
    whatToDo: `1. fix ${f.file}:${f.line} per the evidence; 2. re-run the battery to confirm the ${f.ruleId} predicate is silent`,
    whyWorks: `removing the violation restores the ${f.ruleId} contract (the predicate re-check passes on the corrected state)`
  };
}
function toWriterSection(s) {
  return {
    finding_id: s.findingId,
    how_broken: s.howBroken,
    why_broken: s.whyBroken,
    what_violates: s.whatViolates,
    how_to_fix: s.howToFix,
    what_to_do: s.whatToDo,
    why_works: s.whyWorks,
    run_id: ""
  };
}
function resolveMasterContextDir(projectRoot) {
  let entries = [];
  try {
    entries = fs24.readdirSync(projectRoot);
  } catch {
    return null;
  }
  for (const form of MASTER_CONTEXT_VARIANTS) {
    if (entries.includes(form)) {
      return path27.join(projectRoot, form);
    }
  }
  return null;
}
var REPORT_FILE_RE = /^bug_hunter_report_v(\d+)\.md$/;
function nextReportVersion(masterContextDir) {
  let names = [];
  try {
    names = fs24.readdirSync(masterContextDir);
  } catch {
    return 1;
  }
  const versions = [];
  for (const name of names) {
    const m = name.match(REPORT_FILE_RE);
    if (m)
      versions.push(Number(m[1]));
  }
  return versions.length === 0 ? 1 : Math.max(...versions) + 1;
}
async function writeReportDirect(input) {
  const masterContextDir = resolveMasterContextDir(input.projectRoot) ?? path27.join(input.projectRoot, "MASTER_CONTEXT");
  fs24.mkdirSync(masterContextDir, { recursive: true });
  let version = nextReportVersion(masterContextDir);
  let reportPath = path27.join(masterContextDir, `bug_hunter_report_v${version}.md`);
  const lines = [
    `# BUG-HUNT REPORT \u2014 v${version}`,
    "",
    `- runId: ${input.runId}`,
    `- findings: ${input.findings.length}`,
    `- sections: ${input.sections.length}`,
    ...version > 1 ? [`- supersedes: bug_hunter_report_v${version - 1}.md (append-only, never overwrite)`] : [],
    "",
    "---",
    "",
    "## Findings",
    ""
  ];
  const findingRows = input.findings;
  if (findingRows.length === 0) {
    lines.push("_No findings \u2014 the honest zero (the battery ran clean)._", "");
  }
  for (const f of findingRows) {
    const safeEvidence = String(f.evidence).replace(/^(\s*)```/gm, "$1`\u200B``");
    lines.push(`### ${f.id} [${f.severity}]`, "", `rule: ${f.rule}`, "", "evidence:", "", "```", safeEvidence, "```", "");
  }
  lines.push("## Report sections (the 6-part contract)", "");
  for (const s of input.sections) {
    lines.push(`### ${s.finding_id}`, "", `how_broken: ${s.how_broken}`, "", `why_broken: ${s.why_broken}`, "", `what_violates: ${s.what_violates}`, "", `how_to_fix: ${s.how_to_fix}`, "", `what_to_do: ${s.what_to_do}`, "", `why_works: ${s.why_works}`, "");
  }
  const graphRows = input.graphSummaries;
  if (graphRows.length > 0) {
    lines.push("## Graph summaries", "");
    for (const g of graphRows) {
      lines.push(`- ${g.label} \u2014 ${g.detail}`);
    }
    lines.push("");
  }
  let document = lines.join(`
`);
  let wrote = false;
  for (let attempt = 0;attempt < 5; attempt++) {
    const retryVersion = nextReportVersion(masterContextDir);
    const retryPath = path27.join(masterContextDir, `bug_hunter_report_v${retryVersion}.md`);
    try {
      const sepAt = lines.indexOf("---");
      const retryHeader = [
        `# BUG-HUNT REPORT \u2014 v${retryVersion}`,
        "",
        `- runId: ${input.runId}`,
        `- findings: ${input.findings.length}`,
        `- sections: ${input.sections.length}`,
        ...retryVersion > 1 ? [`- supersedes: bug_hunter_report_v${retryVersion - 1}.md (append-only, never overwrite)`] : []
      ];
      document = [...retryHeader, ...sepAt >= 0 ? lines.slice(sepAt - 1) : lines.slice(1)].join(`
`);
      fs24.writeFileSync(retryPath, document, { encoding: "utf-8", flag: "wx" });
      version = retryVersion;
      reportPath = retryPath;
      wrote = true;
      break;
    } catch (e) {
      const code = e !== null && typeof e === "object" && "code" in e ? String(e.code) : "";
      if (code === "EEXIST" && attempt < 4)
        continue;
      throw new Error(`REPORT_WRITE_FAILED: path=${retryPath} detail=${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (!wrote) {
    throw new Error(`REPORT_WRITE_FAILED: the retry loop exhausted without writing ${masterContextDir} \u2014 refusing to return a phantom reportPath`);
  }
  const bytes = Buffer.byteLength(document, "utf-8");
  return {
    reportPath,
    version,
    bytes,
    findingsCount: findingRows.length,
    chunks: 1,
    truncated: false
  };
}
async function report(input) {
  try {
    const sections = [];
    for (const f of input.findings) {
      const trace = input.traces.find((t) => t.findingId === findingIdOf(f));
      sections.push(sectionFromFinding(f, trace));
    }
    const writerResult = await input.writer({
      projectRoot: input.profile.project.root,
      runId: input.runId,
      findings: input.findings.map((f) => ({
        id: findingIdOf(f),
        severity: f.severity,
        rule: f.ruleId,
        evidence: f.evidence
      })),
      sections: sections.map(toWriterSection).map((s) => ({ ...s, run_id: input.runId })),
      graphSummaries: input.findings.map((f) => ({
        label: `${f.ruleId} --violates\u2192 ${f.file}:${f.line}`,
        detail: f.evidence
      }))
    });
    try {
      const rpRoot = resolveMasterContextDir(input.profile.project.root) ?? path27.join(input.profile.project.root, "MASTER_CONTEXT");
      const rootAbs = path27.resolve(rpRoot);
      const rpAbs = path27.resolve(rootAbs, writerResult.reportPath);
      if (rpAbs !== rootAbs && !rpAbs.startsWith(rootAbs + path27.sep)) {
        throw new Error(`REPORT_PATH_UNSAFE: writerResult.reportPath "${writerResult.reportPath}" escapes ${rpRoot} \u2014 refusing to read/rewrite an out-of-tree path`);
      }
      const raw = fs24.readFileSync(writerResult.reportPath, "utf-8");
      const segs = raw.split(/(```[\s\S]*?```)/g);
      let stripped = segs.map((seg, i) => i % 2 === 1 ? seg : seg.replace(/<think>[\s\S]*?<\/think>/g, "")).join("");
      const plain = segs.filter((_, i) => i % 2 === 0).join(`
`);
      const titleMatch = plain.match(/^# .*$/m);
      if (titleMatch && titleMatch.index !== undefined && titleMatch.index > 0) {
        const at = stripped.indexOf(titleMatch[0]);
        if (at > 0)
          stripped = stripped.substring(at);
      }
      if (stripped !== raw) {
        if (stripped.trim().length === 0) {
          throw new Error(`REPORT_STRIP_FAILED: the thinking-strip emptied ${writerResult.reportPath} (raw ${raw.length} chars) \u2014 leaving the original file intact; refusing to record HUNT_DONE on an empty artifact`);
        }
        fs24.writeFileSync(writerResult.reportPath, stripped, "utf-8");
        const sealed = fs24.readFileSync(writerResult.reportPath, "utf-8");
        if (sealed !== stripped) {
          throw new Error(`REPORT_STRIP_FAILED: read-back mismatch on ${writerResult.reportPath} (wrote ${stripped.length} chars, read ${sealed.length}) \u2014 refusing to record HUNT_DONE on an unverified artifact`);
        }
        console.log("[report] thinking-strip applied \u2014 removed", raw.length - stripped.length, "chars of meta-commentary");
      }
    } catch (stripErr) {
      if (stripErr instanceof Error && (stripErr.message.startsWith("REPORT_STRIP_FAILED") || stripErr.message.startsWith("REPORT_PATH_UNSAFE")))
        throw stripErr;
      console.warn("[report] thinking-strip failed (non-fatal):", stripErr instanceof Error ? stripErr.message : String(stripErr));
    }
    try {
      input.db.exec("BEGIN IMMEDIATE");
    } catch (e) {
      throw new Error(`REPORT_TX_BEGIN_FAILED: ${e instanceof Error ? e.message : String(e)} (caller may already hold a transaction \u2014 use a savepoint or serialize hunts)`);
    }
    try {
      for (const s of sections) {
        appendReportSection(input.db, s, input.runId);
      }
      appendEvent(input.db, "HUNT_DONE", {
        runId: input.runId,
        reportPath: writerResult.reportPath,
        findingsCount: writerResult.findingsCount,
        batteryVersion: input.batteryVersion,
        fixOrder: input.fixOrder
      });
      input.db.exec("COMMIT");
    } catch (dbErr) {
      try {
        input.db.exec("ROLLBACK");
      } catch (rbErr) {
        throw new Error(`REPORT_ROLLBACK_FAILED: batch error=${dbErr instanceof Error ? dbErr.message : String(dbErr)} rollback error=${rbErr instanceof Error ? rbErr.message : String(rbErr)} (the transaction may still be open \u2014 do not reuse this handle for writes)`);
      }
      throw dbErr;
    }
    try {
      const insertFact = input.db.prepare("INSERT INTO graph_facts (subject, predicate, object, evidence, confidence, created_at) VALUES (?,?,?,?,?,?)");
      for (const f of input.findings) {
        if (f.verdict === "VIOLATION") {
          insertFact.run(f.file, HAS_FINDING_PREDICATE, f.ruleId, String(f.evidence).slice(0, 500), 0.8, Date.now());
        }
      }
    } catch (memErr) {
      console.warn("[report] the graph_facts memory wire failed (non-fatal):", memErr instanceof Error ? memErr.message : String(memErr));
    }
    try {
      input.server.refresh?.(input.runId, input.findings.length);
    } catch (lspErr) {
      console.warn("[report] the diagnostics-server refresh failed (non-fatal):", lspErr instanceof Error ? lspErr.message : String(lspErr));
    }
    return {
      reportPath: writerResult.reportPath,
      writerResult,
      sectionsAppended: sections.length
    };
  } catch (e) {
    console.warn(`[report] failed: ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }
}

// src/hunter/harness/micro-loop-machine.ts
var MICRO_LOOP_TYPES = machineTypes();
function createMicroLoop(options) {
  const { targetPath, profilePath } = options;
  const runId = `hunt-${Date.now()}-${profilePath.split("/").pop()?.replace(/[^a-z0-9]/gi, "") || "run"}`;
  if (options.profile) {
    if (options.profile.project.root !== targetPath) {
      throw new Error(`[micro-loop] targetPath=${targetPath} disagrees with profile.project.root=${options.profile.project.root} \u2014 pass one root (the hunt target IS the profile root)`);
    }
  }
  const adapterOverride = options.adapter ?? null;
  const profileOverride = options.profile ?? null;
  const batteryOverride = options.battery ?? null;
  const writer = options.reportWriter ?? ((input) => writeReportDirect(input));
  const server = options.diagnosticsServer ?? {};
  const machine = import_xstate_development_cjs.createMachine({
    id: "microLoop",
    types: MICRO_LOOP_TYPES,
    initial: "idle",
    context: {
      runId,
      targetPath,
      profilePath,
      profile: null,
      intendedBehavior: null,
      adapter: null,
      db: null,
      battery: [],
      batteryVersion: null,
      findings: [],
      traces: [],
      fixOrder: [],
      reportPath: null,
      error: null
    },
    states: {
      idle: {
        on: { START: "recon" }
      },
      recon: {
        invoke: {
          src: "recon",
          input: { profilePath },
          onDone: {
            target: "map",
            actions: import_xstate_development_cjs.assign({
              profile: ({ event }) => actorOutput(event, "recon").profile,
              intendedBehavior: ({ event }) => actorOutput(event, "recon"),
              runId: ({ event }) => actorOutput(event, "recon").runId
            })
          },
          onError: {
            target: "inconclusive",
            actions: import_xstate_development_cjs.assign({ error: ({ event }) => namedError(actorError(event)) })
          }
        }
      },
      map: {
        invoke: {
          src: "map",
          input: ({ context }) => {
            const profile = requireLoaded(context.profile, "map");
            return { profile, adapterOverride };
          },
          onDone: {
            target: "scan",
            actions: import_xstate_development_cjs.assign({
              adapter: ({ event }) => actorOutput(event, "map").adapter,
              db: ({ event }) => actorOutput(event, "map").db
            })
          },
          onError: {
            target: "inconclusive",
            actions: import_xstate_development_cjs.assign({ error: ({ event }) => namedError(actorError(event)) })
          }
        }
      },
      scan: {
        invoke: {
          src: "scan",
          input: ({ context }) => ({
            profile: requireLoaded(context.profile, "scan"),
            adapter: requireLoaded(context.adapter, "scan"),
            runId: context.runId,
            db: context.db
          }),
          onDone: {
            target: "trace",
            actions: import_xstate_development_cjs.assign({
              battery: ({ event }) => actorOutput(event, "scan").battery,
              batteryVersion: ({ event }) => actorOutput(event, "scan").batteryVersion,
              findings: ({ event }) => actorOutput(event, "scan").run.findings
            })
          },
          onError: {
            target: "inconclusive",
            actions: import_xstate_development_cjs.assign({ error: ({ event }) => namedError(actorError(event)) })
          }
        }
      },
      trace: {
        invoke: {
          src: "trace",
          input: ({ context }) => ({
            findings: context.findings,
            adapter: requireLoaded(context.adapter, "trace")
          }),
          onDone: {
            target: "strike",
            actions: import_xstate_development_cjs.assign({ traces: ({ event }) => actorOutput(event, "trace") })
          },
          onError: {
            target: "inconclusive",
            actions: import_xstate_development_cjs.assign({ error: ({ event }) => namedError(actorError(event)) })
          }
        }
      },
      strike: {
        invoke: {
          src: "strike",
          input: ({ context }) => ({
            findings: context.findings,
            profile: requireLoaded(context.profile, "strike"),
            traces: context.traces
          }),
          onDone: {
            target: "report",
            actions: import_xstate_development_cjs.assign({
              findings: ({ event }) => actorOutput(event, "strike").findings,
              fixOrder: ({ event }) => actorOutput(event, "strike").fixOrder
            })
          },
          onError: {
            target: "inconclusive",
            actions: import_xstate_development_cjs.assign({ error: ({ event }) => namedError(actorError(event)) })
          }
        }
      },
      report: {
        invoke: {
          src: "report",
          input: ({ context }) => ({
            profile: requireLoaded(context.profile, "report"),
            runId: context.runId,
            findings: context.findings,
            traces: context.traces,
            fixOrder: context.fixOrder,
            batteryVersion: context.batteryVersion ?? "",
            db: requireLoaded(context.db, "report"),
            writer,
            server
          }),
          onDone: {
            target: "done",
            actions: import_xstate_development_cjs.assign({ reportPath: ({ event }) => actorOutput(event, "report").reportPath })
          },
          onError: {
            target: "inconclusive",
            actions: import_xstate_development_cjs.assign({ error: ({ event }) => namedError(actorError(event)) })
          }
        }
      },
      done: { type: "final" },
      inconclusive: { type: "final" }
    }
  }, {
    actors: {
      recon: import_xstate_development_cjs.fromPromise(async ({ input }) => {
        if (profileOverride) {
          const dbPath = resolveStoreDbPath(profileOverride.project.root);
          const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
          const slug = profileOverride.project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project";
          const store = openStore(dbPath);
          let seq = 0;
          try {
            const prefix = `${slug}-hunt-${day}-`;
            for (const row of store.prepare("SELECT payload FROM events WHERE kind = 'HUNT_DONE'").all()) {
              let rawText = "";
              try {
                const raw = row["payload"];
                rawText = typeof raw === "string" ? raw : String(raw ?? "");
                const payload = raw !== null && typeof raw === "object" ? raw : JSON.parse(String(raw ?? "{}"));
                if (typeof payload.runId === "string" && payload.runId.startsWith(prefix)) {
                  const rest = payload.runId.slice(prefix.length);
                  if (/^\d+$/.test(rest))
                    seq = Math.max(seq, Number(rest));
                }
              } catch (e) {
                const idx = rawText.indexOf(prefix);
                if (idx !== -1) {
                  const dm = /^\d+/.exec(rawText.slice(idx + prefix.length));
                  if (dm?.[0] !== undefined)
                    seq = Math.max(seq, Number(dm[0]));
                }
                console.warn(`[micro-loop] stub-seam HUNT_DONE payload parse failed \u2014 skipped: ${e instanceof Error ? e.message : String(e)}; raw=${rawText.slice(0, 120)}`);
              }
            }
          } finally {
            store.close();
          }
          return {
            stages: profileOverride.pipeline.stages.length,
            batteryCount: profileOverride.rules.corpus.length,
            corpusCount: profileOverride.rules.corpus.length,
            profile: profileOverride,
            runId: `${slug}-hunt-${day}-${seq + 1}`
          };
        }
        return recon(input.profilePath);
      }),
      map: import_xstate_development_cjs.fromPromise(async ({ input }) => {
        try {
          const result = await map(input.profile, input.adapterOverride ?? undefined);
          return result;
        } catch (e) {
          console.warn(`[micro-loop] map actor failed: ${e instanceof Error ? e.message : String(e)}`);
          throw e;
        }
      }),
      scan: import_xstate_development_cjs.fromPromise(async ({ input }) => {
        if (batteryOverride) {
          const version = batteryOverride[0]?.batteryVersion ?? "stub-battery-v1";
          const run = runBattery(batteryOverride, input.adapter, input.profile, input.runId, input.db ?? undefined);
          return { battery: batteryOverride, batteryVersion: version, run };
        }
        return scan(input.profile, input.adapter, input.runId, input.db ?? undefined);
      }),
      trace: import_xstate_development_cjs.fromPromise(async ({ input }) => {
        return solveTrace(input.findings, input.adapter);
      }),
      strike: import_xstate_development_cjs.fromPromise(async ({ input }) => {
        return strike(input.findings, input.profile, input.traces);
      }),
      report: import_xstate_development_cjs.fromPromise(async ({ input }) => {
        return report(input);
      })
    }
  });
  const actor = import_xstate_development_cjs.createActor(machine);
  let snapshot = {
    runId,
    targetPath,
    profilePath,
    profile: null,
    intendedBehavior: null,
    adapter: null,
    db: null,
    battery: [],
    batteryVersion: null,
    findings: [],
    traces: [],
    fixOrder: [],
    reportPath: null,
    error: null
  };
  const sub = actor.subscribe((s) => {
    snapshot = s.context;
  });
  const handleDisposables = [];
  let pendingDone = null;
  let pendingSettle = null;
  const handle = {
    stop() {
      sub.unsubscribe();
      if (pendingSettle !== null) {
        pendingSettle();
        pendingSettle = null;
      }
      for (const d of handleDisposables.splice(0)) {
        try {
          d.unsubscribe();
        } catch (e) {
          console.error("[micro-loop] disposable unsubscribe failed:", e instanceof Error ? e.message : String(e));
        }
      }
      try {
        snapshot.db?.close();
      } catch (e) {
        console.error("[micro-loop] db close failed:", e instanceof Error ? e.message : String(e));
      }
      try {
        actor.stop();
      } catch (e) {
        console.error("[micro-loop] actor stop failed:", e instanceof Error ? e.message : String(e));
      }
    },
    start(event) {
      actor.start();
      actor.send(event);
    },
    done() {
      if (pendingDone !== null)
        return pendingDone;
      pendingDone = new Promise((resolve) => {
        if (actor.getSnapshot().status === "done") {
          resolve();
          return;
        }
        const snapStatus = actor.getSnapshot().status;
        if (snapStatus === "stopped" || snapStatus === "error") {
          resolve();
          return;
        }
        let settled = false;
        pendingSettle = settle;
        const sub2 = actor.subscribe((s) => {
          if (s.status === "done") {
            settle();
          }
        });
        handleDisposables.push(sub2);
        function settle() {
          if (settled)
            return;
          settled = true;
          pendingSettle = null;
          sub2.unsubscribe();
          for (let i = handleDisposables.length - 1;i >= 0; i--) {
            if (handleDisposables[i] === sub2)
              handleDisposables.splice(i, 1);
          }
          pendingDone = null;
          resolve();
        }
      });
      return pendingDone;
    },
    get state() {
      return { value: snapshotState(actor.getSnapshot()) };
    },
    get context() {
      return snapshot;
    },
    getSnapshot() {
      const value = snapshotState(actor.getSnapshot());
      const STATE_PROJECTION = { done: "done" };
      const terminal = STATE_PROJECTION[value] ?? "inconclusive";
      return {
        state: terminal,
        phase: value,
        result: {
          runId: snapshot.runId,
          state: terminal,
          findingsCount: snapshot.findings.length,
          reportPath: snapshot.reportPath,
          fixOrder: snapshot.fixOrder,
          error: snapshot.error
        }
      };
    }
  };
  return handle;
}
function snapshotState(s) {
  const v = s.value;
  if (typeof v === "string")
    return v;
  if (v !== undefined && v !== null && typeof v === "object") {
    const entries = Object.values(v);
    const first = entries[0];
    if (typeof first === "string")
      return first;
  }
  return "unknown-state";
}
function namedError(e) {
  if (e instanceof Error)
    return e.message;
  if (e === undefined || e === null)
    return "unknown error (no error payload)";
  return String(e);
}
function actorOutput(event, actorName) {
  if (typeof event !== "object" || event === null) {
    throw new Error(`[micro-loop] ${actorName} actor event missing output`);
  }
  if (!("output" in event)) {
    throw new Error(`[micro-loop] ${actorName} actor event missing output`);
  }
  const output = event.output;
  if (output === undefined || output === null) {
    throw new Error(`[micro-loop] ${actorName} actor event missing output`);
  }
  return output;
}
function actorError(event) {
  if (typeof event !== "object" || event === null)
    return;
  if (!("error" in event))
    return;
  return event.error;
}
function requireLoaded(value, stage) {
  if (value === undefined || value === null) {
    throw new Error(`[micro-loop] ${stage} reached before its dependency loaded`);
  }
  return value;
}
function machineTypes() {
  const marker = {};
  if (marker !== undefined && marker !== null && typeof marker === "object") {
    return marker;
  }
  throw new Error("the XState types marker failed to initialize");
}

// src/hunter/tools/bug-hunt.ts
async function spawnBugHunterLoop(args) {
  const inconclusive = (message) => ({ runId: `hunt-failed-${Date.now()}`, state: "inconclusive", findingsCount: 0, reportPath: null, fixOrder: [], error: message });
  const fsDyn = await import("fs");
  const absTarget = path28.resolve(args.targetPath);
  let scopeReal = null;
  if (args.scopeRoot) {
    try {
      scopeReal = fsDyn.realpathSync(path28.resolve(args.scopeRoot));
    } catch {
      return inconclusive(`HUNT_SCOPE_INVALID: scopeRoot=${args.scopeRoot} cannot resolve for scope check (realpath failed \u2014 chmod/fix permissions or remove broken symlinks)`);
    }
  } else {
    try {
      scopeReal = fsDyn.realpathSync(absTarget);
    } catch {
      return inconclusive(`HUNT_SCOPE_INVALID: targetPath=${args.targetPath} cannot resolve for scope check (realpath failed \u2014 chmod/fix permissions or remove broken symlinks)`);
    }
  }
  if (scopeReal === path28.sep) {
    return inconclusive(`HUNT_SCOPE_INVALID: scopeRoot=${args.scopeRoot} resolves to the filesystem root \u2014 containment against '/' admits every path and is not a boundary`);
  }
  const scopePrefix = scopeReal === null ? null : scopeReal + path28.sep;
  const inScope = (real) => scopeReal === null || real === scopeReal || scopePrefix !== null && real.startsWith(scopePrefix);
  const lockTarget = args.scopeRoot ? path28.resolve(args.scopeRoot) : absTarget;
  let targetOk = false;
  try {
    targetOk = fsDyn.statSync(absTarget).isDirectory();
  } catch {
    targetOk = false;
  }
  if (!targetOk) {
    return inconclusive(`HUNT_SCOPE_INVALID: targetPath=${args.targetPath} (no existing directory at ${absTarget} \u2014 the hunt target must be a real directory inside the scope)`);
  }
  if (scopeReal !== null) {
    let targetReal;
    try {
      targetReal = fsDyn.realpathSync(absTarget);
    } catch {
      return inconclusive(`HUNT_SCOPE_INVALID: targetPath=${args.targetPath} cannot resolve for scope check (scope=${scopeReal} realpath failed \u2014 chmod/fix permissions or remove broken symlinks)`);
    }
    if (!inScope(targetReal)) {
      return inconclusive(`HUNT_SCOPE_INVALID: targetPath=${args.targetPath} resolves outside the scope root (scope=${scopeReal} target=${targetReal})`);
    }
  }
  if (typeof args.profilePath === "string" && args.profilePath.length > 0) {
    const absProfile = path28.resolve(args.profilePath);
    if (!fsDyn.existsSync(absProfile)) {
      return inconclusive(`HUNT_SCOPE_INVALID: profilePath=${args.profilePath} (nothing at ${absProfile} \u2014 the profile must exist)`);
    }
  }
  acquireHuntLock(lockTarget);
  try {
    const absProfile = typeof args.profilePath === "string" && args.profilePath.length > 0 ? path28.resolve(args.profilePath) : undefined;
    if (absProfile !== undefined) {
      let profileOk = false;
      try {
        profileOk = fsDyn.statSync(absProfile).isFile();
      } catch {
        profileOk = false;
      }
      if (!profileOk) {
        return inconclusive(`HUNT_SCOPE_INVALID: profilePath=${args.profilePath} (nothing at ${absProfile} \u2014 the profile must exist)`);
      }
      if (scopeReal !== null) {
        let profileReal;
        try {
          profileReal = fsDyn.realpathSync(absProfile);
        } catch {
          return inconclusive(`HUNT_SCOPE_INVALID: profilePath=${args.profilePath} cannot resolve for scope check (scope=${scopeReal} realpath failed \u2014 chmod/fix permissions or remove broken symlinks)`);
        }
        if (!inScope(profileReal)) {
          return inconclusive(`HUNT_SCOPE_INVALID: profilePath=${args.profilePath} resolves outside the scope root (scope=${scopeReal} profile=${profileReal})`);
        }
      }
    }
    let machine = null;
    try {
      machine = createMicroLoop({
        targetPath: absTarget,
        profilePath: absProfile ?? "",
        ...args.adapter ? { adapter: args.adapter } : {},
        ...args.profile ? { profile: args.profile } : {},
        ...args.battery ? { battery: args.battery } : {},
        ...args.reportWriter ? { reportWriter: args.reportWriter } : {}
      });
      machine.start({ type: "START" });
      await machine.done();
      const { result } = machine.getSnapshot();
      const out = {
        runId: result.runId,
        state: result.state,
        findingsCount: result.findingsCount,
        reportPath: result.reportPath,
        fixOrder: result.fixOrder,
        error: result.error
      };
      if (out.state === "inconclusive") {
        console.error(`[bug-hunt] HUNT_INCONCLUSIVE runId=${out.runId} error=${out.error ?? "unknown"} (fail-closed RESULT, never a throw)`);
      }
      return out;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[bug-hunt] HUNT_INCONCLUSIVE error=${message} (the machine threw \u2014 mapped to the fail-closed RESULT)`);
      return {
        runId: `hunt-failed-${Date.now()}`,
        state: "inconclusive",
        findingsCount: 0,
        reportPath: null,
        fixOrder: [],
        error: message
      };
    } finally {
      try {
        machine?.context.db?.close();
      } catch {}
      try {
        machine?.stop();
      } catch {}
    }
  } finally {
    try {
      releaseHuntLock(lockTarget);
    } catch (e) {
      console.error(`[bug-hunt] HUNT_LOCK_RELEASE_FAILED target=${args.targetPath} error=${e instanceof Error ? e.message : String(e)} (loud, never masking the hunt RESULT)`);
    }
  }
}
function textResult(text, details) {
  return { content: [{ type: "text", text }], details };
}
function namedCode(message) {
  const idx = message.indexOf(":");
  const head = (idx === -1 ? message : message.slice(0, idx)).trim();
  return head.length > 0 ? head : "HUNT_INCONCLUSIVE";
}
function createBugHuntTool(pi, opts) {
  const zstr = () => pi.zod.string();
  const obj = (shape) => pi.zod.object(shape);
  const cwdOf = opts.cwdOf;
  pi.registerTool({
    name: "bug-hunt",
    description: "GI-OMP bug hunter. action=status reads the session store (unwired count + fix order); action=hunt runs the REAL micro-loop (recon/map/scan/trace/strike/report) under hunt-lock \u2014 fail-closed INCONCLUSIVE as RESULT.",
    parameters: obj({ i: zstr().optional(), action: pi.zod.enum(["hunt", "status"]), targetPath: zstr().optional(), profilePath: zstr().optional() }),
    execute: async (_id, params, _sig, _upd, ctx) => {
      const p = params && typeof params === "object" ? params : {};
      const callerId = String(ctx?.sessionID ?? "omp-default-session");
      const scopeRoot = cwdOf(ctx && typeof ctx === "object" && "cwd" in ctx ? ctx : undefined);
      if (String(p.action ?? "").toLowerCase() === "hunt") {
        const targetPath = typeof p.targetPath === "string" && p.targetPath.length > 0 ? p.targetPath : scopeRoot;
        const profilePath = typeof p.profilePath === "string" && p.profilePath.length > 0 ? p.profilePath : path28.join(scopeRoot, "profile.yaml");
        try {
          const result = await spawnBugHunterLoop({ targetPath, profilePath, scopeRoot });
          if (result.state === "inconclusive") {
            const message = result.error ?? "HUNT_INCONCLUSIVE";
            return textResult(`${message}`, {
              ok: false,
              state: "inconclusive",
              error: namedCode(message),
              runId: result.runId,
              findingsCount: 0,
              reportPath: null,
              fixOrder: [],
              action: "hunt"
            });
          }
          return textResult(`HUNT_DONE runId=${result.runId} findingsCount=${result.findingsCount} reportPath=${result.reportPath ?? "null"}`, {
            ok: true,
            token: "HUNT_DONE",
            state: "done",
            runId: result.runId,
            findingsCount: result.findingsCount,
            reportPath: result.reportPath,
            fixOrder: result.fixOrder,
            action: "hunt"
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error(`[bug-hunt] hunt tool failed LOUD (fail-closed RESULT): ${message}`);
          return textResult(`${message}`, { ok: false, state: "inconclusive", error: namedCode(message), action: "hunt" });
        }
      }
      try {
        try {
          acquireHuntLock(path28.resolve(scopeRoot));
        } catch (lockErr) {
          const lockMsg = lockErr instanceof Error ? lockErr.message : String(lockErr);
          if (lockMsg.includes("HUNT_ALREADY_RUNNING")) {
            return textResult(`HUNT_BUSY: a hunt holds the lock for ${scopeRoot} - status refuses a half-written read (retry after the hunt releases the lock)`, { ok: false, error: "HUNT_BUSY", action: p.action ?? "status" });
          }
          throw lockErr;
        }
        try {
          const opened = openSessionStore({ sessionId: callerId, scopeRoot, callerSessionId: callerId });
          if (countTypedNodes(opened.storePath) === 0) {
            populateSessionStore(opened.storePath, scopeRoot);
          }
          let u = [];
          let linelessNote = "";
          try {
            u = unwiredNodes(opened.storePath);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("LINELESS_NODE")) {
              linelessNote = ` store-note=${msg.slice(0, 120)}`;
            } else {
              throw e;
            }
          }
          const fixOrder = u.slice(0, 20).map((r) => `${r.name} (${r.file}:${r.line})`);
          return textResult(`state=done findingsCount=${u.length} fixOrderCount=${fixOrder.length}${linelessNote}`, {
            ok: true,
            state: "done",
            findingsCount: u.length,
            fixOrder,
            action: p.action ?? "status"
          });
        } finally {
          try {
            releaseHuntLock(path28.resolve(scopeRoot));
          } catch {}
        }
      } catch (e) {
        const errObj = typeof e === "object" && e !== null ? e : {};
        const code = typeof errObj === "object" && errObj !== null && "code" in errObj && typeof errObj.code === "string" ? String(errObj.code) : "GI_QUERY_FAIL";
        return textResult(`${code}: ${String(e)}`, { ok: false, error: code });
      }
    }
  });
}

// src/hunter/tools/query-registration.ts
init_db();

// src/hunter/surface/query-tool.ts
var MAX_BLAST_DEPTH = 64;
var DEFAULT_BLAST_DEPTH = 8;
var MAX_QUERY_ROWS = 200;
var MAX_QUERY_ROWS_FULL = 2000;
function runQuery(input, db, adapter, ext) {
  switch (input.verb) {
    case "who-calls":
      return whoCalls2(input, db);
    case "chain":
      return chain(input, db);
    case "must-implement":
      return mustImplement(db, input.format);
    case "unwired":
      return unwired(db, adapter, input.format);
    case "rule":
      return rule(input, db);
    case "violations":
      return violations(input, db);
    case "consistency":
      return consistency(db, input.format);
    case "semantic-search":
      return semanticVerb(input, ext?.semantic);
    case "code-search":
      return semanticVerb(input, ext?.semantic);
    case "docs-patterns":
      return docsPatternsVerb(input, ext?.docs);
    case "blast-radius":
      return blastRadius2(input, db);
    case "would-break":
      return wouldBreak2(input, db);
    default: {
      const v = verbOf(input);
      if (typeof v !== "undefined") {
        throw new Error(`QUERY_INVALID: verb=${String(v)} (the verbs are who-calls|chain|must-implement|unwired|rule|violations|consistency|semantic-search|code-search|docs-patterns|blast-radius|would-break)`);
      }
      throw new Error("QUERY_INVALID: verb is missing (the verbs are who-calls|chain|must-implement|unwired|rule|violations|consistency|semantic-search|code-search|docs-patterns|blast-radius|would-break)");
    }
  }
}
function rowsAs(rows, label) {
  if (Array.isArray(rows)) {
    return rows;
  }
  throw new Error(`[query-tool] ${label} expected an array of rows, got ${typeof rows}`);
}
function verbOf(input) {
  if (typeof input === "object" && input !== null) {
    const verb = input.verb;
    if (verb !== undefined)
      return verb;
  }
  return;
}
function rowAs(row, label) {
  if (row !== undefined && row !== null) {
    return row;
  }
  return row;
}
function whoCalls2(input, db) {
  const symbol = input.symbol ?? "";
  const edges = rowsAs(db.prepare(`
      SELECT DISTINCT src.label AS src_label, src.file AS src_file, src.line AS src_line
      FROM typed_edges e
      JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id AND dst.label = ?
      JOIN typed_nodes src ON e.src_canonical = src.canonical_id
      WHERE e.predicate IN ('calls', 'imports') AND e.superseded_run IS NULL
        AND src.file IS NOT NULL
        -- \u2605 R18-HIGH FIX (2026-09-25): whoCalls had NO LIMIT while the violations verb caps at
        --   MAX_QUERY_ROWS_FULL. A ubiquitous symbol (a util called everywhere) returned EVERY
        --   caller \u2014 an unbounded read that materializes the whole edge set in JS. Same cap as
        --   the other full-format verbs; the answer stays bounded.
        --   (NOTE: no backticks in this comment \u2014 one would terminate the JS template literal.)
        LIMIT ${MAX_QUERY_ROWS_FULL}
    `).all(symbol), "who-calls edges");
  const rows = edges.map((e) => ({
    caller: e.src_label,
    file: e.src_file,
    line: e.src_line ?? 0
  }));
  return formatRows(rows, input.format);
}
function chain(input, db) {
  const from = input.from ?? input.symbol ?? "";
  const to = input.to ?? "";
  const MAX_DEPTH = 64;
  const startIds = rowsAs(db.prepare("SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL").all(from), "chain start nodes");
  const toLabels = rowsAs(db.prepare("SELECT DISTINCT label FROM typed_nodes WHERE label = ? AND superseded_run IS NULL").all(to), "chain target labels");
  const toSet = new Set(toLabels.map((r) => r.label));
  const visited = new Set;
  const parent = new Map;
  const depthOf = new Map;
  const queue = [];
  for (const st of startIds) {
    if (visited.has(st.canonical_id))
      continue;
    visited.add(st.canonical_id);
    parent.set(st.canonical_id, { parent: null, step: null });
    depthOf.set(st.canonical_id, 0);
    queue.push(st.canonical_id);
  }
  let head = 0;
  const buildPath = (curId, finalStep) => {
    const rev = [];
    let c = curId;
    while (c !== null) {
      const ent = parent.get(c);
      if (!ent || !ent.step)
        break;
      rev.push(ent.step);
      c = ent.parent;
    }
    rev.reverse();
    rev.push(finalStep);
    return rev.map((r, i) => ({ ...r, step: i + 1 }));
  };
  const chainEdgesStmt = db.prepare(`
        SELECT dst.canonical_id AS dst_id, dst.label AS dst_label,
               dst.file AS dst_file, dst.line AS dst_line, e.predicate AS predicate
        FROM typed_edges e
        JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id
        WHERE e.src_canonical = ? AND e.predicate = 'calls' AND e.superseded_run IS NULL
      `);
  while (head < queue.length) {
    const curId = queue[head];
    const curDepth = depthOf.get(curId) ?? 0;
    head += 1;
    if (curDepth >= MAX_DEPTH)
      continue;
    const out = rowsAs(chainEdgesStmt.all(curId), "chain edges");
    for (const e of out) {
      const step = {
        from: curId,
        to: e.dst_label,
        kind: e.predicate,
        file: e.dst_file ?? "",
        line: e.dst_line ?? 0
      };
      if (toSet.has(e.dst_label) && !(from === to && curDepth === 0)) {
        return formatRows(buildPath(curId, step), input.format);
      }
      if (visited.has(e.dst_id))
        continue;
      visited.add(e.dst_id);
      parent.set(e.dst_id, { parent: curId, step });
      depthOf.set(e.dst_id, curDepth + 1);
      queue.push(e.dst_id);
    }
  }
  return formatRows([], input.format);
}
function stageEntry(node) {
  if (node.data) {
    try {
      const parsed = JSON.parse(node.data);
      if (typeof parsed.entry === "string" && parsed.entry.length > 0)
        return parsed.entry;
    } catch (e) {
      console.warn(`[query-tool] stage data parse failed \u2014 the name fallback: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return node.name;
}
function codeNameSet(db) {
  const names = new Set;
  try {
    for (const r of rowsAs(db.prepare("SELECT label FROM typed_nodes WHERE superseded_run IS NULL").all(), "code-names typed")) {
      if (r.label)
        names.add(r.label);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/no such table/i.test(msg))
      throw e;
  }
  for (const r of rowsAs(db.prepare("SELECT name FROM graph_nodes WHERE lineage = 'CODE_DERIVED'").all(), "code-names graph")) {
    names.add(r.name);
  }
  return names;
}
function mustImplement(db, format) {
  const spec = rowsAs(db.prepare("SELECT id, name, source, data FROM graph_nodes WHERE lineage = 'SPEC_DERIVED' AND kind = 'stage'").all(), "must-implement spec");
  const codeNames = codeNameSet(db);
  return formatRows(spec.filter((s) => !codeNames.has(stageEntry(s))).map((s) => ({ stage: s.name, entry: stageEntry(s), id: s.id, declaredSource: s.source, status: "MUST_IMPLEMENT" })), format);
}
function unwired(db, adapter, format) {
  if (adapter) {
    return formatRows(adapter.unwired().map((d) => ({ name: d.name, file: d.file, line: d.line, status: "UNWIRED" })), format);
  }
  const code = rowsAs(db.prepare(`
      SELECT n.canonical_id AS id, n.label, n.file, n.line
      FROM typed_nodes n
      WHERE n.kind IN ('Function', 'Class') AND n.superseded_run IS NULL
        AND n.file IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM typed_edges e
          WHERE e.dst_canonical = n.canonical_id
            AND e.predicate IN ('calls', 'imports') AND e.superseded_run IS NULL
        )
    `).all(), "unwired code");
  return formatRows(code.map((n) => ({ name: n.label, file: n.file ?? "", line: n.line ?? 0, status: "UNWIRED" })), format);
}
function rule(input, db) {
  const ruleId = input.ruleId ?? "";
  const p = rowAs(db.prepare("SELECT family, template, bindings, verbatim_quote, anchor, severity FROM compiled_predicates WHERE id = ?").get(ruleId), "rule predicate");
  if (!p)
    return [];
  const findings = rowsAs(db.prepare("SELECT severity, file, line, evidence, verdict, run_id FROM findings WHERE rule_id = ? ORDER BY severity DESC").all(ruleId), "rule findings");
  return [{
    ruleId,
    family: p.family,
    template: p.template,
    verbatimQuote: p.verbatim_quote,
    anchor: p.anchor,
    severity: p.severity,
    violations: findings.map((f) => ({ file: f.file ?? "", line: f.line ?? 0, severity: f.severity, verdict: f.verdict, runId: f.run_id }))
  }];
}
function violations(input, db) {
  const byRun = input.runId ? " AND run_id = ?" : "";
  const byWeek = input.week ? " AND week = ?" : "";
  const params = [];
  if (input.runId)
    params.push(input.runId);
  if (input.week)
    params.push(input.week);
  const effectiveCap = input.format === "llm" ? MAX_QUERY_ROWS : MAX_QUERY_ROWS_FULL;
  const off = Math.max(0, Math.floor(input.offset ?? 0));
  const lim = input.limit !== undefined ? Math.min(Math.max(0, Math.floor(input.limit)), effectiveCap) : effectiveCap;
  const rows = rowsAs(db.prepare(`SELECT rule_id, severity, file, line, evidence, verdict, week, run_id FROM findings WHERE verdict = 'VIOLATION'${byRun}${byWeek} ORDER BY CASE severity WHEN 'CRIT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MED' THEN 2 ELSE 3 END, id LIMIT ? OFFSET ?`).all(...params, lim, off), "violations");
  return formatRows(rows, input.format);
}
function consistency(db, format) {
  const spec = rowsAs(db.prepare("SELECT id, name, source, data FROM graph_nodes WHERE lineage = 'SPEC_DERIVED'").all(), "consistency spec");
  const codeNames = codeNameSet(db);
  return formatRows(spec.filter((s) => !codeNames.has(stageEntry(s))).map((s) => ({ status: "DRIFT", specNode: s.name, entry: stageEntry(s), specId: s.id, declaredSource: s.source })), format);
}
function semanticVerb(input, surface) {
  if (!surface) {
    throw new Error("SEMANTIC_UNAVAILABLE: the semantic-search verb requires the corbell embeddings surface (wire it through the query registration \u2014 the corbell store must be built)");
  }
  const query = (input.query ?? "").trim();
  if (query.length === 0)
    return [];
  const topK = Math.max(1, Math.floor(input.topK ?? 10));
  const hits = surface.query(query, topK);
  const rows = hits.map((h) => ({
    rank: h.rank,
    file: h.filePath,
    line: h.startLine,
    endLine: h.endLine,
    symbol: h.symbol ?? h.chunkType,
    chunkType: h.chunkType,
    score: h.score,
    service: h.serviceId,
    language: h.language,
    preview: h.content.replace(/\s+/g, " ").slice(0, 80)
  }));
  return formatRows(rows, input.format);
}
function docsPatternsVerb(input, surface) {
  if (!surface) {
    throw new Error("DOCS_UNAVAILABLE: the docs-patterns verb requires the corbell docs surface (wire it through the query registration \u2014 run the corbell docs scan/learn first)");
  }
  const rows = surface.list().map((p) => ({
    pattern: p.id,
    sourceFile: p.sourceFile,
    type: p.detectedType,
    sections: p.sectionHeadings.join(","),
    decisions: p.decisions.map((d) => d.summary).join(" | ")
  }));
  return formatRows(rows, input.format);
}
function blastRadius2(input, db) {
  const root = (input.symbol ?? input.from ?? "").trim();
  if (!root)
    return [{ root: "", depth: 0, nodes: [] }];
  let ids = rowsAs(db.prepare("SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL").all(root), "blast-radius ids").map((r) => r.canonical_id);
  if (ids.length === 0)
    return [{ root, depth: 0, nodes: [] }];
  if (ids.length > 500)
    ids = ids.slice(0, 500);
  const ph = ids.map(() => "?").join(", ");
  const cap = Math.min(input.depth ?? DEFAULT_BLAST_DEPTH, MAX_BLAST_DEPTH);
  const rows = rowsAs(db.prepare(`
      WITH RECURSIVE blast(cid, depth) AS (
        SELECT canonical_id, 0 FROM typed_nodes WHERE canonical_id IN (${ph}) AND superseded_run IS NULL
        UNION
        SELECT src.canonical_id, blast.depth + 1
        FROM blast
        JOIN typed_edges e ON e.dst_canonical = blast.cid
        JOIN typed_nodes src ON src.canonical_id = e.src_canonical
        WHERE e.predicate IN ('calls', 'imports')
          AND e.superseded_run IS NULL
          AND src.superseded_run IS NULL
          AND src.file IS NOT NULL
          AND blast.depth < ?
      )
      SELECT n.file AS file, MIN(blast.depth) AS depth
      FROM blast
      JOIN typed_nodes n ON n.canonical_id = blast.cid
      WHERE blast.depth > 0 AND n.file IS NOT NULL
      GROUP BY n.file
    `).all(...ids, cap), "blast-radius walk");
  const nodes = rows.map((r) => ({ file: r.file, depth: Number(r.depth) }));
  const maxDepth = nodes.reduce((m, n) => n.depth > m ? n.depth : m, 0);
  return [{ root, depth: maxDepth, nodes }];
}
function wouldBreak2(input, db) {
  const symbol = (input.symbol ?? "").trim();
  const proposed = (input.proposed ?? "").trim();
  let proposedCount = 0;
  if (proposed.length > 0) {
    const m = /\(([^)]*)\)/.exec(proposed);
    const inside = m ? m[1].trim() : "";
    if (inside !== "") {
      proposedCount = inside.split(",").map((s) => s.trim()).filter((s) => s.length > 0).length;
    }
  }
  const callers = rowsAs(db.prepare(`
      SELECT DISTINCT src.label AS src_label, src.file AS src_file, src.line AS src_line
      FROM typed_edges e
      JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id AND dst.label = ?
      JOIN typed_nodes src ON e.src_canonical = src.canonical_id
      WHERE e.predicate = 'calls' AND e.superseded_run IS NULL AND src.file IS NOT NULL
      LIMIT 5000
    `).all(symbol), "would-break callers");
  const breaking = callers.map((c) => ({
    importer: `${c.src_label} (${c.src_file}:${c.src_line})`,
    reason: `signature change unverified \u2014 ${proposedCount > 0 ? `proposed arity ${proposedCount}` : "no proposed signature"}; the caller's call shape requires manual verification (the typed substrate carries no per-call signature metadata)`
  }));
  return [{ symbol, proposed, breaking, argsUnknown: true, callers: callers.length }];
}
function formatRows(rows, format) {
  if (format !== "llm")
    return rows;
  return rows.map((r) => {
    if (r.from !== undefined && r.to !== undefined && r.kind !== undefined) {
      return { record: `chain step=${r.step ?? 1} from=${String(r.from)} to=${String(r.to)} kind=${String(r.kind)}` };
    }
    if (r.ruleId !== undefined && r.file !== undefined) {
      return { record: `${String(r.ruleId)} ${String(r.file)}:${String(r.line ?? 0)}` };
    }
    return { record: Object.entries(r).map(([k, v]) => `${k}=${String(v)}`).join(" ") };
  });
}

// src/hunter/tools/query-registration.ts
async function runQueryTool(args) {
  const opened = openSessionStore({ sessionId: args.sessionId, scopeRoot: args.scopeRoot, callerSessionId: args.sessionId });
  const db = openStore(opened.storePath);
  try {
    const rows = runQuery({
      verb: args.verb,
      symbol: args.symbol,
      from: args.from,
      to: args.to,
      ruleId: args.ruleId,
      week: args.week,
      runId: args.runId,
      query: args.query,
      topK: args.topK,
      format: args.format,
      limit: args.limit,
      offset: args.offset,
      proposed: args.proposed,
      depth: args.depth
    }, db, undefined, undefined);
    return JSON.stringify(rows, null, 2);
  } finally {
    try {
      db.close();
    } catch {}
  }
}

// src/omp/layer-registry.ts
function isAnchored(f) {
  return typeof f.source === "string" && f.source.trim().length > 0;
}
function probeConsumer(p) {
  try {
    const raw = p.up();
    return raw !== null && raw !== undefined && typeof raw.up === "boolean" ? { up: raw.up, evidence: typeof raw.evidence === "string" ? raw.evidence : "" } : { up: false, evidence: "the probe returned a malformed shape (no boolean `up`) - DOWN by construction" };
  } catch (e) {
    return { up: false, evidence: e instanceof Error ? e.message : String(e) };
  }
}
function createLayerRegistry() {
  const byId = new Map;
  const auditOne = (p, subject) => {
    const probe = probeConsumer(p);
    if (!probe.up) {
      return {
        consumer: p.id,
        rung: p.rung,
        up: false,
        evidence: probe.evidence,
        factsReturned: 0,
        factsDiscarded: 0,
        consumed: false,
        verdict: "GI_LAYER_DOWN"
      };
    }
    let raw = [];
    try {
      const got = p.facts(subject);
      raw = Array.isArray(got) ? got.filter((f) => f !== null && typeof f === "object") : [];
      if (!Array.isArray(got)) {
        return {
          consumer: p.id,
          rung: p.rung,
          up: true,
          evidence: "facts() returned a NON-ARRAY \u2014 malformed response, not an absent substrate",
          factsReturned: 0,
          factsDiscarded: 0,
          consumed: false,
          verdict: `GI_LAYER_ERROR:${p.id}`
        };
      }
    } catch (e) {
      return {
        consumer: p.id,
        rung: p.rung,
        up: true,
        evidence: `facts() threw: ${e instanceof Error ? e.message : String(e)}`,
        factsReturned: 0,
        factsDiscarded: 0,
        consumed: false,
        verdict: `GI_LAYER_ERROR:${p.id}`
      };
    }
    const anchored = raw.filter(isAnchored);
    const discarded = raw.length - anchored.length;
    const consumed = anchored.length > 0;
    return {
      consumer: p.id,
      rung: p.rung,
      up: true,
      evidence: probe.evidence,
      factsReturned: anchored.length,
      factsDiscarded: discarded,
      consumed,
      verdict: consumed ? "CONSUMED" : "GI_LAYER_UNCONSUMED"
    };
  };
  const registry = {
    register(probe) {
      byId.set(probe.id, probe);
    },
    consumers() {
      return [...byId.values()];
    },
    audit(subject) {
      return [...byId.values()].map((p) => auditOne(p, subject));
    },
    factsForWithFaults(subject) {
      const facts = [];
      const faults = [];
      for (const p of [...byId.values()]) {
        const probe = probeConsumer(p);
        if (!probe.up) {
          const reason = `GI_LAYER_DOWN:${p.id} - ${probe.evidence || "the probe reports DOWN"}`;
          console.error("[layer-registry] factsFor: consumer " + p.id + " is DOWN or malformed - see audit GI_LAYER_DOWN:" + p.id + ": " + reason);
          faults.push({ consumer: p.id, reason });
          continue;
        }
        try {
          const got = p.facts(subject);
          if (!Array.isArray(got)) {
            console.error("[layer-registry] factsFor: consumer " + p.id + " returned non-array facts - see audit GI_LAYER_ERROR:" + p.id);
            faults.push({ consumer: p.id, reason: "facts() returned non-array facts - see audit GI_LAYER_ERROR:" + p.id });
            continue;
          }
          for (const f of got) {
            if (f !== null && typeof f === "object" && isAnchored(f))
              facts.push(f);
          }
        } catch (factsErr) {
          console.error("[layer-registry] factsFor: consumer " + p.id + " threw mid-query - see audit GI_LAYER_ERROR:" + p.id + ": " + (factsErr instanceof Error ? factsErr.message : String(factsErr)));
          faults.push({ consumer: p.id, reason: "facts() threw mid-query - see audit GI_LAYER_ERROR:" + p.id + ": " + (factsErr instanceof Error ? factsErr.message : String(factsErr)) });
          continue;
        }
      }
      return { facts, faults };
    },
    factsFor(subject) {
      return registry.factsForWithFaults(subject).facts;
    },
    decisionsInfluenced(subject) {
      return [...new Set(registry.factsFor(subject).map((f) => f.consumer))];
    },
    summary(subject) {
      const reports = registry.audit(subject);
      const consumed = reports.filter((r) => r.consumed);
      const down = reports.filter((r) => r.verdict === "GI_LAYER_DOWN");
      const unconsumed = reports.filter((r) => r.verdict === "GI_LAYER_UNCONSUMED");
      const errors = reports.filter((r) => r.verdict.startsWith("GI_LAYER_ERROR"));
      const parts = [
        `consumed:${consumed.length}/${reports.length}`,
        `rungs=${[...new Set(consumed.map((r) => r.rung))].sort().join(",") || "none"}`
      ];
      if (unconsumed.length > 0)
        parts.push(`GI_LAYER_UNCONSUMED=${unconsumed.map((r) => r.consumer).join(",")}`);
      if (down.length > 0)
        parts.push(`GI_LAYER_DOWN=${down.map((r) => r.consumer).join(",")}`);
      if (errors.length > 0)
        parts.push(`GI_LAYER_ERROR=${errors.map((r) => r.consumer).join(",")}`);
      return parts.join(" ");
    }
  };
  return registry;
}

// src/omp/adapters/corbell.ts
import * as path29 from "path";

// src/omp/adapters/_shared.ts
import * as fs25 from "fs";
import { execFileSync as execFileSync3 } from "child_process";
import { Database as Database6 } from "bun:sqlite";
function probePath(p, mustBeFile = false) {
  try {
    const st = fs25.statSync(p);
    if (mustBeFile && !st.isFile())
      return { up: false, evidence: `${p} exists but is not a file` };
    return { up: true, evidence: `${p} (${st.isFile() ? `${st.size}B` : "dir"})` };
  } catch (e) {
    const code = e.code ?? "UNKNOWN";
    return { up: false, evidence: `${p} \u2014 ${code}` };
  }
}
function probeSocketConnect(dir, timeoutMs = 1200, match = /^[0-9a-f]{16}\.sock$/) {
  let files;
  try {
    files = fs25.readdirSync(dir).filter((n) => match.test(n));
  } catch (e) {
    const code = e.code ?? "UNKNOWN";
    return { up: false, evidence: `${dir} \u2014 ${code}` };
  }
  if (files.length === 0)
    return { up: false, evidence: `${dir} \u2014 no matching socket files (${match}) \u2014 the daemon is not running` };
  const attempts = [];
  for (const f of files) {
    const sock = `${dir}/${f}`;
    try {
      execFileSync3("curl", ["-s", "--max-time", String(Math.ceil(timeoutMs / 1000)), "--unix-socket", sock, "http://localhost/"], {
        stdio: "ignore",
        timeout: timeoutMs
      });
      attempts.push(`${f}=LIVE`);
      return { up: true, evidence: `${dir} \u2014 connect() accepted on ${f}` };
    } catch (e) {
      const err = e;
      if (err.status == null) {
        return { up: false, evidence: `${dir} \u2014 PROBE INFRA BROKEN: curl could not exec (${err.code ?? "unknown"}) \u2014 install curl; this is NOT a socket verdict` };
      }
      const code = err.status;
      if (code === 52 || code === 56) {
        attempts.push(`${f}=LIVE(exit ${code} \u2014 connected, no HTTP reply)`);
        return { up: true, evidence: `${dir} \u2014 connect() accepted on ${f} (curl exit ${code})` };
      }
      attempts.push(`${f}=refused`);
    }
  }
  return { up: false, evidence: `${dir} \u2014 every socket refused (stale files, no daemon): ${attempts.join(" ")}` };
}
function openReadOnly(storePath) {
  try {
    return new Database6(storePath, { readonly: true });
  } catch {
    return null;
  }
}
function liveEdgesFor(db, subject, limit = 200) {
  try {
    const rows = db.query(`SELECT src_canonical AS src, predicate, dst_canonical AS dst, evidence_quote AS evidence
           FROM typed_edges
          WHERE superseded_run IS NULL
            AND (src_canonical LIKE ? ESCAPE '\\' OR dst_canonical LIKE ? ESCAPE '\\')
          ORDER BY id DESC LIMIT ?`).all(`%${escapeLike(subject)}%`, `%${escapeLike(subject)}%`, limit);
    return rows;
  } catch (e) {
    throw new Error(`GI_STORE_QUERY_FAILED: ${storePathOf(db)} \u2014 ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
  }
}
function storePathOf(db) {
  try {
    return db.query("PRAGMA database_list").all()[0]?.file ?? "<unknown>";
  } catch {
    return "<unknown>";
  }
}
function assertStoreFresh(storePath) {
  const db = openReadOnly(storePath);
  if (db === null)
    return;
  let f;
  try {
    f = layerFreshness(db);
  } finally {
    try {
      db.close();
    } catch {}
  }
  if (f.stale) {
    throw new Error(`${f.code ?? "GI_LAYER_STALE"} \u2014 the store at ${storePath} is STALE ` + `(populatedAt=${f.populatedAt === null ? "NEVER" : new Date(f.populatedAt).toISOString()} \xB7 ` + `ageMs=${f.ageMs ?? "?"} \xB7 ttlMs=${f.ttlMs}); no fact is served from it`);
  }
}
function storeFacts(consumer, rung, storePath, subject, limit = 50) {
  assertStoreFresh(storePath);
  const db = openReadOnly(storePath);
  if (db === null) {
    throw new Error(`GI_STORE_UNREADABLE: ${storePath} could not be opened read-only (the substrate fault must not read as "no facts")`);
  }
  try {
    const edges = liveEdgesFor(db, subject, limit);
    const out = edges.map((e) => ({
      consumer,
      rung,
      subject,
      value: { predicate: e.predicate, from: e.src, to: e.dst },
      source: `${storePath}#typed_edges(${e.src} -[${e.predicate}]-> ${e.dst})`
    }));
    return out;
  } finally {
    try {
      db.close();
    } catch {}
  }
}
function escapeLike(s) {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

// src/omp/adapters/corbell.ts
function corbellProbe(scopeRoot) {
  if (!path29.isAbsolute(scopeRoot))
    throw new Error(`GI_LAYER_CORBELL: scopeRoot must be absolute, got '${scopeRoot.slice(0, 120)}'`);
  const normalizedRoot = path29.resolve(scopeRoot);
  const storePath = path29.join(normalizedRoot, CORBELL_CHECKOUT_REL);
  return {
    id: "L5_CORBELL",
    rung: "settlement",
    dependency: "the corbell parse-grade checkout (PRIMARY)",
    errorCode: "GI_LAYER_CORBELL",
    up: () => {
      const probe = probePath(storePath, true);
      if (!probe.up)
        return probe;
      try {
        assertStoreFresh(storePath);
        return probe;
      } catch (e) {
        return { up: false, evidence: `${storePath} (${e instanceof Error ? e.message : String(e)})` };
      }
    },
    facts: (subject) => {
      assertStoreFresh(storePath);
      return storeFacts("L5_CORBELL", "settlement", storePath, subject);
    }
  };
}

// src/omp/adapters/graphify.ts
import * as path30 from "path";
var GRAPHIFY_CHECKOUT_REL = ".omp/graph-intelligence/graphify-checkout/store.sqlite";
function graphifyProbe(scopeRoot) {
  const storePath = path30.join(scopeRoot, GRAPHIFY_CHECKOUT_REL);
  return {
    id: "L6_GRAPHIFY",
    rung: "settlement",
    dependency: "the graphify graph.json leg",
    errorCode: "GI_LAYER_GRAPHIFY",
    up: () => probePath(storePath, true),
    facts: (subject) => {
      assertStoreFresh(storePath);
      return storeFacts("L6_GRAPHIFY", "settlement", storePath, subject);
    }
  };
}

// src/omp/adapters/c2kg.ts
import * as fs26 from "fs";
import * as path31 from "path";
function c2kgProbe(scopeRoot) {
  const indexPath = path31.join(scopeRoot, ".c2kg/index.json");
  return {
    id: "L4_C2KG",
    rung: "context",
    dependency: "the code-to-knowledge-graph LSP index",
    errorCode: "GI_LAYER_C2KG",
    up: () => probePath(indexPath, true),
    facts: (subject) => {
      if (!fs26.existsSync(indexPath)) {
        throw new Error(`GI_LAYER_C2KG: the index is absent at ${indexPath}`);
      }
      let parsed;
      try {
        parsed = JSON.parse(fs26.readFileSync(indexPath, "utf8"));
      } catch (e) {
        throw new Error(`GI_LAYER_C2KG: the index is unparseable \u2014 ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
      }
      const idx = typeof parsed === "object" && parsed !== null ? parsed : {};
      const symbols = Array.isArray(idx.symbols) ? idx.symbols : [];
      const hits = symbols.filter((s) => typeof s === "object" && s !== null && typeof s.name === "string" && s.name.includes(subject));
      const symbolFacts = hits.slice(0, 50).map((s) => ({
        consumer: "L4_C2KG",
        rung: "context",
        subject,
        value: {
          kind: typeof s.kind === "string" ? s.kind : undefined,
          file: typeof s.file === "string" ? s.file : undefined,
          line: typeof s.line === "number" ? s.line : undefined
        },
        source: `${indexPath}#symbols(${typeof s.file === "string" ? s.file : "?"}:${typeof s.line === "number" ? s.line : "?"})`
      }));
      const idxEdges = Array.isArray(idx.edges) ? idx.edges : [];
      const edgeFacts = idxEdges.filter((e) => typeof e === "object" && e !== null && (String(e["src"] ?? "").includes(subject) || String(e["dst"] ?? "").includes(subject))).slice(0, 50).map((e) => ({
        consumer: "L4_C2KG",
        rung: "context",
        subject,
        value: {
          src: typeof e["src"] === "string" ? e["src"] : undefined,
          predicate: typeof e["predicate"] === "string" ? e["predicate"] : undefined,
          dst: typeof e["dst"] === "string" ? e["dst"] : undefined,
          confidence: typeof e["confidence"] === "number" ? e["confidence"] : undefined
        },
        source: `${indexPath}#edges(${String(e["src"] ?? "?")} ${String(e["predicate"] ?? "?")} ${String(e["dst"] ?? "?")})`
      }));
      return edgeFacts.concat(symbolFacts).slice(0, 50);
    }
  };
}

// src/omp/adapters/ua.ts
import * as fs27 from "fs";
import * as path32 from "path";
function uaProbe(scopeRoot) {
  if (!path32.isAbsolute(scopeRoot) || scopeRoot.split(/[\\/]/).includes("..") || scopeRoot.includes("\x00"))
    throw new Error(`GI_LAYER_UA: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  const graphPath = path32.join(path32.resolve(scopeRoot), ".ua/knowledge-graph.json");
  return {
    id: "L3_UA",
    rung: "context",
    dependency: "the understand-anything graph (.ua/knowledge-graph.json)",
    errorCode: "GI_LAYER_UA",
    up: () => probePath(graphPath, true),
    facts: (subject) => {
      let raw;
      try {
        raw = fs27.readFileSync(graphPath, "utf8");
      } catch (e) {
        throw new Error(`GI_LAYER_UA: the knowledge graph is absent/unreadable at ${graphPath} \u2014 ${e.code ?? (e instanceof Error ? e.message.slice(0, 80) : String(e))}`);
      }
      let g;
      try {
        g = JSON.parse(raw);
      } catch (e) {
        throw new Error(`GI_LAYER_UA: the knowledge graph is unparseable \u2014 ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
      }
      const hits = (g.nodes ?? []).filter((n) => (n.name ?? "").includes(subject) || (n.id ?? "").includes(subject));
      return hits.map((n) => ({
        consumer: "L3_UA",
        rung: "context",
        subject,
        value: { name: n.name, file: n.file, line: n.line },
        source: `${graphPath}#nodes(${n.file ?? "?"}:${n.line ?? "?"})`
      }));
    }
  };
}

// src/omp/adapters/arsumbris.ts
init_containment();
import * as fs28 from "fs";
import * as os7 from "os";
import * as path33 from "path";
import { execFileSync as execFileSync4 } from "child_process";
function auEngineRead(repoRoot, read, subject) {
  if (!path33.isAbsolute(repoRoot))
    throw new Error(`GI_LAYER_ARSUMBRIS: repoRoot must be absolute, got ${JSON.stringify(repoRoot)}`);
  if (!/^[A-Za-z0-9_-]+$/.test(read))
    throw new Error(`GI_LAYER_ARSUMBRIS: refusing unknown engine read ${JSON.stringify(read)}`);
  if (subject.length > 1024)
    throw new Error(`GI_LAYER_ARSUMBRIS: subject exceeds 1024 chars (${subject.length}) \u2014 refusing`);
  if (subject.includes("\x00"))
    throw new Error(`GI_LAYER_ARSUMBRIS: subject carries NUL \u2014 refusing`);
  const repoCanon = path33.resolve(repoRoot);
  const script = path33.join(repoCanon, "scripts/au-read.ts");
  requireContained(script, repoCanon, () => {
    throw new Error(`GI_LAYER_ARSUMBRIS: reader escapes the repo root \u2014 refusing`);
  });
  if (!fs28.existsSync(script))
    throw new Error(`GI_LAYER_ARSUMBRIS: the reader is absent at ${script}`);
  let out;
  try {
    out = execFileSync4(process.execPath, ["run", script, read, subject, repoCanon], {
      encoding: "utf8",
      timeout: 45000,
      maxBuffer: 32 * 1024 * 1024
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 240) : String(e);
    throw new Error(`GI_LAYER_ARSUMBRIS: the engine read '${read}' failed \u2014 ${msg}`);
  }
  try {
    return JSON.parse(out);
  } catch (e) {
    throw new Error(`GI_LAYER_ARSUMBRIS: the daemon returned unparseable JSON \u2014 ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
  }
}
function arsumbrisProbe(scopeRoot, home = process.env.HOME ?? os7.homedir()) {
  const runDir = path33.join(home, ".arsumbris/au-engine/run");
  return {
    id: "L2_ARSUMBRIS",
    rung: "knowledge",
    dependency: "the au daemon socket + its typed repo graph",
    errorCode: "GI_LAYER_ARSUMBRIS",
    up: () => probeSocketConnect(runDir),
    facts: (subject) => {
      const raw = auEngineRead(scopeRoot, "instances", subject);
      if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error(`GI_LAYER_ARSUMBRIS: the daemon returned non-object JSON (${raw === null ? "null" : Array.isArray(raw) ? "array" : typeof raw}) \u2014 refusing`);
      }
      const res = raw;
      const rawInstances = res.reply?.result?.instances;
      const instances = Array.isArray(rawInstances) ? rawInstances : [];
      const hits = subject.length === 0 ? instances : instances.filter((i) => {
        const values = [];
        const seen = new WeakSet;
        const walk = (v, depth = 0) => {
          if (depth > 64)
            return;
          if (typeof v === "string")
            values.push(v);
          else if (Array.isArray(v)) {
            if (seen.has(v))
              return;
            seen.add(v);
            for (const x of v)
              walk(x, depth + 1);
          } else if (v && typeof v === "object") {
            if (seen.has(v))
              return;
            seen.add(v);
            for (const x of Object.values(v))
              walk(x, depth + 1);
          }
        };
        walk(i);
        return values.some((v) => v.includes(subject));
      });
      const instanceFacts = hits.slice(0, 50).map((i) => {
        const claim = Array.isArray(i["claim"]) ? i["claim"].map(String) : [];
        return {
          consumer: "L2_ARSUMBRIS",
          rung: "knowledge",
          subject,
          value: { claim, closure: i["closure"], shape: i["effective_shape"] },
          source: `${res.socket ?? "~/.arsumbris/au-engine/run"}${"#instance("}${claim.slice(0, 2).join(",") || "?"})`
        };
      });
      let fileFacts = [];
      if (subject.trim().length > 0) {
        try {
          const filesRaw = auEngineRead(scopeRoot, "files", "");
          const files = filesRaw?.reply?.result?.files;
          const fileList = Array.isArray(files) ? files : [];
          fileFacts = fileList.filter((e) => {
            const vals = [e["path"], e["stem"], e["repo"]].filter((v) => typeof v === "string");
            if (vals.some((v) => v.includes(subject)))
              return true;
            return subject.length >= 6 && vals.some((v) => v.length >= 6 && subject.includes(v));
          }).slice(0, 50).map((e) => ({
            consumer: "L2_ARSUMBRIS",
            rung: "knowledge",
            subject,
            value: { kind: e["kind"], path: e["path"], stem: e["stem"] },
            source: `${res.socket ?? "~/.arsumbris/au-engine/run"}#file(${String(e["path"] ?? "?")})`
          }));
        } catch {}
      }
      return instanceFacts.concat(fileFacts).slice(0, 50);
    }
  };
}

// src/omp/adapters/semantica.ts
import * as fs29 from "fs";
import * as path34 from "path";
function semanticaProbe(scopeRoot) {
  if (!path34.isAbsolute(scopeRoot) || scopeRoot.split(/[/\\]/).includes(".."))
    throw new Error(`GI_LAYER_SEMANTICA: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  let resolvedRoot;
  let needsRealpathCheck = false;
  try {
    resolvedRoot = fs29.realpathSync(path34.resolve(scopeRoot));
  } catch {
    resolvedRoot = path34.resolve(scopeRoot);
    needsRealpathCheck = true;
  }
  const canonRoot = () => {
    if (!needsRealpathCheck)
      return resolvedRoot;
    try {
      resolvedRoot = fs29.realpathSync(path34.resolve(scopeRoot));
      needsRealpathCheck = false;
    } catch {}
    return resolvedRoot;
  };
  const kgPathFor = () => path34.join(canonRoot(), ".omp/graph-intelligence/layers/semantica/kg.json");
  return {
    id: "L1_SEMANTICA",
    rung: "decision",
    dependency: "the semantica workspace + its KG store",
    errorCode: "GI_LAYER_SEMANTICA",
    up: () => probePath(kgPathFor(), true),
    facts: (subject) => {
      const liveKgPath = kgPathFor();
      let raw;
      try {
        raw = fs29.readFileSync(liveKgPath, "utf8");
      } catch (e) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store is absent/unreadable at ${liveKgPath} \u2014 ${e.code ?? (e instanceof Error ? e.message.slice(0, 80) : String(e))}`);
      }
      let kg;
      try {
        kg = JSON.parse(raw);
      } catch (e) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store is unparseable \u2014 ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
      }
      if (kg === null || typeof kg !== "object" || Array.isArray(kg)) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store root is not a valid object (got ${kg === null ? "null" : Array.isArray(kg) ? "array" : typeof kg})`);
      }
      if (kg.entities !== undefined && !Array.isArray(kg.entities)) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store has an invalid 'entities' field (expected array, got ${typeof kg.entities})`);
      }
      const hits = (kg.entities ?? []).filter((e) => {
        if (e === null || e === undefined || typeof e !== "object")
          return false;
        const nm = e.name;
        if (typeof nm !== "string")
          return false;
        return nm.includes(subject);
      });
      return hits.map((e) => ({
        consumer: "L1_SEMANTICA",
        rung: "decision",
        subject,
        value: { type: e.type, name: e.name },
        source: `${liveKgPath}#entities(${e.id ?? e.name ?? "?"})`
      }));
    }
  };
}

// src/omp/adapters/tsg.ts
import * as fs30 from "fs";
import * as path35 from "path";
import { execFileSync as execFileSync5 } from "child_process";
var TSG_REL = "research/graph-infra-repos/typesafe-ai/target/release/examples/tsg";
var TSG_SRC_REL = "research/graph-infra-repos/typesafe-ai/examples/tsg";
function resolveTsgBinary(scopeRoot) {
  const built = path35.join(scopeRoot, TSG_REL);
  if (fs30.existsSync(built))
    return built;
  return null;
}
function tsgKey(env = process.env) {
  for (const name of ["TYPESAFE_API_KEY", "TYPESAFE_AI_API_KEY"]) {
    const v = env[name];
    if (typeof v === "string" && v.trim().length > 0)
      return v.trim();
  }
  try {
    const fd = fs30.openSync(KEY_FILE, fs30.constants.O_RDONLY | fs30.constants.O_NOFOLLOW);
    try {
      const st = fs30.fstatSync(fd);
      if (!st.isFile())
        return null;
      if ((st.mode & 63) !== 0)
        return null;
      const v = fs30.readFileSync(fd, "utf8").trim();
      return v.length > 0 ? v : null;
    } finally {
      fs30.closeSync(fd);
    }
  } catch {
    return null;
  }
}
function tsgProbe(scopeRoot, tsgRoot) {
  const srcRoot = tsgRoot ?? path35.join(scopeRoot, TSG_SRC_REL);
  const bin = resolveTsgBinary(scopeRoot);
  return {
    id: "TSG",
    rung: "meaning",
    dependency: "the tsg binary/repo \u2014 the load unit",
    errorCode: "GI_ENFORCE_TSG",
    up: () => {
      if (bin === null)
        return { up: false, evidence: `${path35.join(scopeRoot, TSG_REL)} \u2014 ENOENT (the tsg binary is not built)` };
      try {
        const st = fs30.statSync(bin);
        return { up: true, evidence: `${bin} (${st.size}B, ELF CLI)` };
      } catch (e) {
        const code = e.code ?? "UNKNOWN";
        return { up: false, evidence: `${bin} \u2014 ${code}` };
      }
    },
    facts: (subject) => {
      if (bin === null)
        throw new Error(`GI_ENFORCE_TSG: no tsg binary at ${path35.join(scopeRoot, TSG_REL)}`);
      const key = tsgKey();
      if (key === null) {
        throw new Error(`GI_JEV_NO_KEY: the tsg meaning judgment needs TYPESAFE_API_KEY (env) or ${KEY_FILE}; the CLI segments without it but cannot judge`);
      }
      let out;
      try {
        out = execFileSync5(bin, ["grep", "--json", "--threshold", "0.5", "--", subject, srcRoot], {
          encoding: "utf8",
          timeout: 180000,
          maxBuffer: 32 * 1024 * 1024,
          env: { ...process.env, TYPESAFE_API_KEY: key }
        });
      } catch (e) {
        const err = e;
        const redact = (s) => {
          if (key === null || key.length === 0)
            return s;
          let out = s.split(key).join("[redacted]");
          if (key.length >= 16) {
            const seen = new Set;
            for (let i = 0;i + 8 <= key.length; i++) {
              const gram = key.slice(i, i + 8);
              if (seen.has(gram))
                continue;
              seen.add(gram);
              out = out.split(gram).join("...[redacted-frag]");
            }
          }
          return out;
        };
        const out = redact(String(err.stdout ?? "").slice(-400));
        const errOut = redact(String(err.stderr ?? "").slice(-200));
        const detail = [out, errOut].filter((x) => x.length > 0).join(" | ");
        const msg = `${(err.message ?? String(e)).slice(0, 160)}${detail.length > 0 ? ` \u2014 CLI output: ${detail}` : ""}`;
        throw new Error(`GI_ENFORCE_TSG: the tsg CLI failed \u2014 ${msg}`);
      }
      const rows = [];
      for (const l of out.split(`
`)) {
        if (l.trim().length === 0)
          continue;
        try {
          rows.push(JSON.parse(l));
        } catch {}
      }
      const scored = rows.filter((r) => r.type === "routing" && r.path !== undefined && r.scores !== null && r.scores !== undefined);
      if (scored.length === 0 && rows.some((r) => r.reason === "dry_run_routing_only")) {
        throw new Error(`GI_JEV_NO_KEY: the tsg run was a DRY RUN (no scores) \u2014 the key is absent or rejected`);
      }
      return scored.map((r) => ({
        consumer: "TSG",
        rung: "meaning",
        subject,
        value: { path: r.path, scores: r.scores, windows: r.windows },
        source: `${r.path}#tsg(threshold 0.5 \xB7 ${JSON.stringify(r.scores).slice(0, 80)})`
      }));
    }
  };
}

// src/omp/adapters/kev.ts
import * as fs31 from "fs";
import * as path36 from "path";
import { execFileSync as execFileSync6 } from "child_process";
var KEV_CLI_REL = "scripts/kev-decide.ts";
var KEV_MODEL = "onnx-community/kev-0.6b-ONNX";
function resolveKevCli(scopeRoot) {
  const p = path36.join(scopeRoot, KEV_CLI_REL);
  return fs31.existsSync(p) ? p : null;
}
function resolveKevRuntime(scopeRoot) {
  const p = path36.join(scopeRoot, "node_modules", "@huggingface", "transformers", "package.json");
  return fs31.existsSync(p) ? p : null;
}
function isUniform(dist, tol = 0.001) {
  if (dist.length === 0)
    return true;
  const eq = 1 / dist.length;
  return dist.every((x) => Math.abs(x - eq) < tol);
}
var MEANING_QUESTION = {
  instr: "Does the named symbol behave as its name and role say it does?",
  options: ["match", "drift", "unclear"]
};
function buildState2(scopeRoot, subject) {
  const base = path36.basename(scopeRoot);
  return [
    `Repository: ${base}`,
    `Subject under review: ${subject}`,
    `The subject is a symbol in this repository's decision path. Judge whether the symbol's`,
    `implementation matches its declared name and role. Answer "unclear" when the name alone`,
    `does not determine the behavior.`
  ].join(`
`);
}
function kevProbe(scopeRoot) {
  const cli = resolveKevCli(scopeRoot);
  const runtime = resolveKevRuntime(scopeRoot);
  return {
    id: "TSG",
    rung: "meaning",
    dependency: `the local KEV model (${KEV_MODEL}) via @huggingface/transformers \u2014 the meaning gate's local substitute for the remote Jev`,
    errorCode: "GI_ENFORCE_KEV",
    up: () => {
      if (runtime === null) {
        return { up: false, evidence: `${path36.join(scopeRoot, "node_modules/@huggingface/transformers")} \u2014 ENOENT (the ONNX runtime is not installed)` };
      }
      if (cli === null) {
        return { up: false, evidence: `${path36.join(scopeRoot, KEV_CLI_REL)} \u2014 ENOENT (the KEV CLI is absent)` };
      }
      return { up: true, evidence: `${cli} + ${runtime} (the local KEV meaning gate)` };
    },
    facts: (subject) => {
      if (cli === null)
        throw new Error(`GI_ENFORCE_KEV: no KEV CLI at ${path36.join(scopeRoot, KEV_CLI_REL)}`);
      let out;
      try {
        out = execFileSync6(process.execPath, [cli, "--json", JSON.stringify({ state: buildState2(scopeRoot, subject), questions: [MEANING_QUESTION] })], {
          encoding: "utf8",
          timeout: 120000,
          maxBuffer: 8 * 1024 * 1024,
          cwd: scopeRoot
        });
      } catch (e) {
        const err = e;
        const tail = String(err.stdout ?? "").slice(-300);
        throw new Error(`GI_ENFORCE_KEV: the KEV CLI failed \u2014 ${tail.length > 0 ? tail : (err.message ?? String(e)).slice(0, 200)}`);
      }
      const candidates = out.split(`
`).filter((l) => l.trim().startsWith("{") && l.includes('"ok"'));
      const line = candidates[candidates.length - 1];
      if (line === undefined)
        throw new Error(`GI_ENFORCE_KEV: the KEV CLI printed no JSON \u2014 output: ${out.slice(0, 200)}`);
      let ans;
      try {
        ans = JSON.parse(line);
      } catch (e) {
        throw new Error(`GI_ENFORCE_KEV: the KEV CLI printed invalid JSON \u2014 ${(e instanceof Error ? e.message : String(e)).slice(0, 120)} \xB7 the line: ${line.slice(0, 160)}`);
      }
      if (!ans.ok)
        throw new Error(`GI_ENFORCE_KEV: ${ans.error ?? "the KEV decision failed"}`);
      const dist = ans.answers?.[0];
      if (dist === undefined || dist.length === 0)
        throw new Error("GI_ENFORCE_KEV: the KEV decision carried no distribution");
      if (!dist.every((x) => Number.isFinite(x))) {
        throw new Error(`GI_ENFORCE_KEV: the KEV decision carried a non-finite distribution ${JSON.stringify(dist)} \u2014 refusing to report a verdict`);
      }
      if (isUniform(dist)) {
        throw new Error(`GI_ENFORCE_KEV: KEV returned a UNIFORM distribution ${JSON.stringify(dist)} \u2014 the pointer head found no signal (the all-zero-logit class); refusing to report a verdict`);
      }
      const labels = ans.labels?.[0] ?? [];
      let best = ans.best?.[0] ?? 0;
      if (!Number.isInteger(best) || best < 0 || best >= dist.length) {
        let m = 0;
        for (let k = 1;k < dist.length; k++)
          if (dist[k] > dist[m])
            m = k;
        best = m;
      }
      const verdict = best < labels.length ? labels[best] ?? "unknown" : "unknown";
      return [
        {
          consumer: "TSG",
          rung: "meaning",
          subject,
          value: { meaning: verdict, distribution: dist, labels, ms: ans.ms ?? 0, model: ans.model ?? KEV_MODEL },
          source: `${cli}#kev(${verdict} p=${dist[best]?.toFixed(3)} \xB7 ${KEV_MODEL} \xB7 ${ans.ms ?? 0}ms)`
        }
      ];
    }
  };
}

// src/omp/layer-consumption.ts
var L2E_CONSUMERS = [
  "L1_SEMANTICA",
  "L2_ARSUMBRIS",
  "L3_UA",
  "L4_C2KG",
  "L5_CORBELL",
  "L6_GRAPHIFY",
  "TSG",
  "ABIDE"
];
function buildRegistry(scopeRoot, overrides) {
  const registry = createLayerRegistry();
  const downProbe = (id, rung, reason) => ({
    id,
    rung,
    dependency: "unconstructible probe (see evidence)",
    errorCode: "GI_REGISTRY_PROBE_BUILD",
    up: () => ({ up: false, evidence: reason }),
    facts: () => {
      throw new Error(reason);
    }
  });
  const tryProbe = (id, rung, make) => {
    try {
      return make();
    } catch (e) {
      return downProbe(id, rung, `GI_REGISTRY_PROBE_BUILD:${id} constructor threw \u2014 ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
    }
  };
  const kevAvailable = (() => {
    try {
      return resolveKevCli(scopeRoot) !== null && resolveKevRuntime(scopeRoot) !== null;
    } catch {
      return false;
    }
  })();
  const probes = [
    tryProbe("L5_CORBELL", "settlement", () => corbellProbe(scopeRoot)),
    tryProbe("L6_GRAPHIFY", "settlement", () => graphifyProbe(scopeRoot)),
    tryProbe("L4_C2KG", "context", () => c2kgProbe(scopeRoot)),
    tryProbe("L3_UA", "context", () => uaProbe(scopeRoot)),
    tryProbe("L2_ARSUMBRIS", "knowledge", () => arsumbrisProbe(scopeRoot)),
    tryProbe("L1_SEMANTICA", "decision", () => semanticaProbe(scopeRoot)),
    tryProbe("TSG", "meaning", () => jevk5Available() ? jevk5Probe(scopeRoot) : kevAvailable ? kevProbe(scopeRoot) : tsgProbe(scopeRoot)),
    tryProbe("ABIDE", "repair", () => abideProbe(scopeRoot))
  ];
  for (const p of probes) {
    const override = overrides?.[p.id];
    registry.register(override ?? p);
  }
  const missing = L2E_CONSUMERS.filter((id) => !registry.consumers().some((c) => c.id === id));
  if (missing.length > 0) {
    throw new Error(`GI_REGISTRY_INCOMPLETE: no probe registered for ${missing.join(",")}`);
  }
  return registry;
}
var SIX_L2E_CONSUMERS = L2E_CONSUMERS;
function consumptionAudit(scopeRoot, subject) {
  const registry = buildRegistry(scopeRoot);
  const reports = registry.audit(subject);
  const influenced = reports.filter((r) => r.consumed).map((r) => r.consumer);
  const consumed = reports.filter((r) => r.consumed);
  const errors = reports.filter((r) => r.verdict.startsWith("GI_LAYER_ERROR"));
  const down = reports.filter((r) => r.verdict === "GI_LAYER_DOWN");
  const unconsumed = reports.filter((r) => r.verdict === "GI_LAYER_UNCONSUMED");
  const parts = [
    `consumed:${consumed.length}/${reports.length}`,
    `rungs=${[...new Set(consumed.map((r) => r.rung))].sort().join(",") || "none"}`
  ];
  if (unconsumed.length > 0)
    parts.push(`GI_LAYER_UNCONSUMED=${unconsumed.map((r) => r.consumer).join(",")}`);
  if (down.length > 0)
    parts.push(`GI_LAYER_DOWN=${down.map((r) => r.consumer).join(",")}`);
  if (errors.length > 0)
    parts.push(`GI_LAYER_ERROR=${errors.map((r) => r.consumer).join(",")}`);
  return {
    scopeRoot,
    subject,
    reports,
    influenced,
    summary: parts.join(" "),
    offenders: reports.filter((r) => !r.consumed).map((r) => ({ consumer: r.consumer, verdict: r.verdict, evidence: r.evidence }))
  };
}

// src/omp/graph-facts.ts
import { Database as Database7 } from "bun:sqlite";
var LIKE = (target) => `%${target.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
function freshnessGate(db, input) {
  const f = layerFreshness(db, { derivation: input.derivation ?? "explicit", now: input.now });
  if (!f.stale)
    return null;
  return {
    rule: "M-GRAPH-3",
    settles: true,
    action: "IGNORE",
    reason: "the graph store is STALE \u2014 no fact is served from it",
    evidence: `${f.code ?? "GI_LAYER_STALE"} \xB7 populatedAt=${f.populatedAt === null ? "NEVER" : new Date(f.populatedAt).toISOString()} \xB7 ageMs=${f.ageMs ?? "?"} \xB7 ttlMs=${f.ttlMs}`
  };
}
function inDegree(db, target, predicate) {
  const where = predicate === undefined ? `dst_canonical LIKE ?1 ESCAPE CHAR(92) AND superseded_run IS NULL` : `dst_canonical LIKE ?1 ESCAPE CHAR(92) AND predicate = ?2 AND superseded_run IS NULL`;
  const params = predicate === undefined ? [LIKE(target)] : [LIKE(target), predicate];
  const n = db.query(`SELECT COUNT(*) AS n FROM typed_edges WHERE ${where}`).get(...params).n;
  const rows = db.query(`SELECT src_canonical FROM typed_edges WHERE ${where} LIMIT 5`).all(...params);
  return { n, sample: rows.map((r) => r.src_canonical) };
}
function graphFacts(input) {
  let db;
  try {
    db = new Database7(input.storePath, { readonly: true });
  } catch (e) {
    return [{
      rule: "M-GRAPH-3",
      settles: false,
      action: null,
      reason: "the graph layer is UNAVAILABLE \u2014 the fact set could not be read",
      evidence: `GI_GRAPH_FACTS_UNAVAILABLE: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`
    }];
  }
  try {
    const verdicts = [];
    const stale = freshnessGate(db, input);
    if (stale !== null)
      return [stale];
    const known = db.query(`SELECT COUNT(*) AS n FROM typed_nodes WHERE canonical_id LIKE ?1 ESCAPE CHAR(92) AND superseded_run IS NULL`).get(LIKE(input.target)).n;
    if (known === 0) {
      return [{
        rule: "M-GRAPH-1",
        settles: false,
        action: null,
        reason: `the graph has NO NODE for "${input.target}" \u2014 no fact exists to settle on`,
        evidence: "node absent \xB7 UNOBSERVED (a fall-through, never a pass)"
      }];
    }
    const inD = inDegree(db, input.target);
    const outD = db.query(`SELECT COUNT(*) AS n FROM typed_edges WHERE src_canonical LIKE ?1 ESCAPE CHAR(92) AND superseded_run IS NULL`).get(LIKE(input.target)).n;
    if (input.intent === "consume") {
      const producers = inDegree(db, input.target, "calls");
      verdicts.push(producers.n === 0 ? {
        rule: "M-GRAPH-1",
        settles: true,
        action: "FIRE",
        reason: `the consumed symbol "${input.target}" has ZERO incoming ` + "`calls`" + ` edges \u2014 nothing constructs or calls it`,
        evidence: `in-degree 0 (calls) \xB7 out-degree ${outD}`
      } : {
        rule: "M-GRAPH-1",
        settles: true,
        action: "IGNORE",
        reason: `the consumed symbol "${input.target}" has producers`,
        evidence: `in-degree (calls) ${producers.n} \xB7 sample: ${producers.sample.slice(0, 3).join(", ")}`
      });
    }
    if (input.intent === "declare") {
      verdicts.push(outD === 0 && inD.n === 0 ? {
        rule: "M-GRAPH-2",
        settles: true,
        action: "FIRE",
        reason: `the declared symbol "${input.target}" has ZERO incoming edges \u2014 declared, never consumed`,
        evidence: `in-degree 0 \xB7 out-degree ${outD}`
      } : {
        rule: "M-GRAPH-2",
        settles: true,
        action: "IGNORE",
        reason: `the declared symbol "${input.target}" is referenced`,
        evidence: `in-degree ${inD.n} \xB7 out-degree ${outD}`
      });
    }
    if (input.intent === "mutate") {
      const sites = inDegree(db, input.target, "calls");
      verdicts.push({
        rule: "M-GRAPH-4",
        settles: false,
        action: null,
        reason: sites.n > 1 ? `the mutation "${input.target}" has ${sites.n} call sites \u2014 their guards must agree` : `the mutation "${input.target}" shows ${sites.n} call site \u2014 A LOWER BOUND, not a proof of one (the indexer cannot see inline closures)`,
        evidence: sites.n > 1 ? `call sites: ${sites.sample.join(", ")}` : `in-degree ${sites.n} \u2014 UNOBSERVED, never IGNORE: the extractor's coverage is incomplete`
      });
    }
    if (input.intent === "measure") {
      const self2 = db.query(`SELECT COUNT(*) AS n FROM typed_edges WHERE src_canonical = dst_canonical AND src_canonical LIKE ?1 ESCAPE CHAR(92) AND superseded_run IS NULL`).get(LIKE(input.target)).n;
      verdicts.push(self2 > 0 ? {
        rule: "M-GRAPH-5",
        settles: true,
        action: "FIRE",
        reason: `"${input.target}" appears on BOTH ends of an edge \u2014 a self-referential measurement`,
        evidence: `self-edges: ${self2}`
      } : {
        rule: "M-GRAPH-5",
        settles: true,
        action: "IGNORE",
        reason: `"${input.target}" has no self-edge`,
        evidence: `self-edges: 0`
      });
    }
    return verdicts;
  } catch (e) {
    return [{
      rule: "M-GRAPH-3",
      settles: false,
      action: null,
      reason: "the graph layer query failed \u2014 no fact exists to settle on",
      evidence: `GI_GRAPH_FACTS_QUERY_FAILED: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`
    }];
  } finally {
    try {
      db.close();
    } catch {}
  }
}

// src/omp/fire-gate.ts
var DESTRUCTIVE_COMMANDS = new Set(["rm", "rmdir", "dd", "mkfs", "shutdown", "reboot", "kill", "pkill", "drop", "truncate"]);

// src/omp/kernel-v2.ts
function preflight(layers) {
  const offenders = [];
  const up = [];
  for (const l of layers) {
    let probe;
    try {
      probe = l.probe();
    } catch (e) {
      probe = { up: false, evidence: e instanceof Error ? e.message : String(e) };
    }
    if (probe.up)
      up.push(l.id);
    else
      offenders.push({ id: l.id, dependency: l.dependency, errorCode: l.errorCode, evidence: probe.evidence });
  }
  if (offenders.length > 0) {
    return { ok: false, code: `GI_STACK_INCOMPLETE:${offenders[0].id}`, offenders, up };
  }
  return { ok: true, code: null, offenders, up };
}
var PASS = { verdict: "PASS", tier: "T0", reason: "no signal", evidence: "" };
var dumbDetector = {
  id: "dumb.grounding-precondition",
  class: "dumb",
  detect(ctx) {
    if (ctx.queriedBefore)
      return { ...PASS, reason: "target was queried before the act" };
    return {
      verdict: "VIOLATION",
      tier: "T1",
      reason: `no graph query on '${ctx.target}' before the act \u2014 the edit is blind`,
      evidence: `execution record: queried_before=false for target='${ctx.target}' tool='${ctx.toolName}'`
    };
  }
};
var theatricalDetector = {
  id: "theatrical.claim-without-span",
  class: "theatrical",
  detect(ctx) {
    const unbound = ctx.claims.filter((c) => c.spans === 0);
    if (unbound.length === 0)
      return { ...PASS, reason: "every claim carries at least one bound span" };
    const first = unbound[0];
    return {
      verdict: "VIOLATION",
      tier: "T2",
      reason: `claim has ZERO bound evidence spans: "${first.text.slice(0, 80)}"`,
      evidence: `claims=${ctx.claims.length} unbound=${unbound.length} spans[0]=0`
    };
  }
};
var destructiveDetector = {
  id: "destructive.layer-certification",
  class: "destructive",
  detect(ctx) {
    if (ctx.certifications.length === 0) {
      return {
        verdict: "UNCERTIFIABLE",
        tier: "T2",
        reason: "no layer certified this act \u2014 nothing to stand on",
        evidence: "certifications=0"
      };
    }
    const v = ctx.certifications.find((c) => c.verdict !== "PASS");
    if (v === undefined)
      return { ...PASS, reason: `all ${ctx.certifications.length} layers certified` };
    if (v.verdict === "VIOLATION") {
      return {
        verdict: "VIOLATION",
        tier: "T2",
        reason: `${v.layer}: ${v.reason}`,
        evidence: `certifications=${ctx.certifications.length} first_non_pass=${v.layer}:${v.verdict}`
      };
    }
    return {
      verdict: "UNCERTIFIABLE",
      tier: "T2",
      reason: `${v.layer} could not certify: ${v.reason}`,
      evidence: `certifications=${ctx.certifications.length} first_non_pass=${v.layer}:UNCERTIFIABLE`
    };
  }
};
var DEFAULT_DETECTORS = [dumbDetector, theatricalDetector, destructiveDetector];
function classifyByDetectors(detectors, ctx) {
  return detectors.map((d) => {
    let outcome;
    try {
      outcome = d.detect(ctx);
    } catch (e) {
      outcome = {
        verdict: "UNCERTIFIABLE",
        tier: "T2",
        reason: `detector ${d.id} threw`,
        evidence: e instanceof Error ? e.message : String(e)
      };
    }
    return { detector: d, outcome };
  });
}
var TIER_ORDER = { T0: 0, T1: 1, T2: 2, T3: 3 };
var VERDICT_RANK = { PASS: 0, UNCERTIFIABLE: 1, VIOLATION: 2 };
function worstOutcome(outcomes) {
  if (outcomes.length === 0) {
    throw new Error("worstOutcome requires at least one outcome");
  }
  return outcomes.reduce((a, b) => {
    const va = VERDICT_RANK[a.outcome.verdict];
    const vb = VERDICT_RANK[b.outcome.verdict];
    if (vb > va)
      return b;
    if (vb === va && a.outcome.verdict !== "PASS" && b.outcome.verdict !== "PASS") {
      const order = { destructive: 3, theatrical: 2, dumb: 1, benign: 0 };
      if (order[b.detector.class] > order[a.detector.class])
        return b;
    }
    return a;
  });
}
function runKernelV2(input) {
  const stages = [];
  const detectors = input.detectors?.length ? input.detectors : DEFAULT_DETECTORS;
  const pre = preflight(input.layers);
  stages.push({
    stage: 0,
    name: "PREFLIGHT",
    outcome: pre.ok ? "UP" : "REFUSE",
    detail: pre.ok ? `${pre.up.length} layer(s) up` : `${pre.offenders.length} layer(s) DOWN: ${pre.offenders.map((o) => o.id).join(",")}`
  });
  if (!pre.ok) {
    const reason = pre.offenders.map((o) => `${o.errorCode} (${o.id} needs ${o.dependency}; ${o.evidence})`).join(" | ");
    return finish(stages, "REFUSE", pre.code, "benign", reason, `offenders=${pre.offenders.length}`);
  }
  const outcomes = classifyByDetectors(detectors, input);
  stages.push({
    stage: 1,
    name: "CLASSIFY",
    outcome: "OK",
    detail: `3 classes asked (dumb|theatrical|destructive)`
  });
  stages.push({
    stage: 2,
    name: "BIND+INDEX",
    outcome: "OK",
    detail: `claims=${input.claims.length} bound=${input.claims.filter((c) => c.spans > 0).length}`
  });
  stages.push({
    stage: 3,
    name: "DETECT",
    outcome: outcomes.some((o) => o.outcome.verdict !== "PASS") ? "SIGNAL" : "CLEAN",
    detail: outcomes.map((o) => `${o.detector.class}:${o.outcome.verdict}`).join(" ")
  });
  const worst = worstOutcome(outcomes);
  stages.push({
    stage: 4,
    name: "KERNEL",
    outcome: worst.outcome.verdict,
    detail: `${worst.detector.id} (${worst.detector.class})`
  });
  let verdict;
  if (worst.outcome.verdict === "VIOLATION") {
    verdict = TIER_ORDER[worst.outcome.tier] >= TIER_ORDER["T2"] || worst.detector.class === "destructive" ? "REFUSE" : "STEER";
  } else if (worst.outcome.verdict === "UNCERTIFIABLE") {
    verdict = "REFUSE";
  } else {
    verdict = "ALLOW";
  }
  stages.push({
    stage: 5,
    name: "VERDICT",
    outcome: verdict,
    detail: worst.outcome.reason
  });
  const cleanRun = worst.outcome.verdict === "PASS";
  const code = cleanRun ? null : worst.detector.class === "destructive" ? "GI_VIOLATION" : worst.detector.class === "theatrical" ? "GI_FABRICATED_CLAIM" : "GI_BLIND_ACT";
  const run = finish(stages, verdict, code, cleanRun ? "benign" : worst.detector.class, worst.outcome.reason, worst.outcome.evidence);
  if (!input.record) {
    stages.push({ stage: 6, name: "RECORD", outcome: "SKIPPED", detail: "no sink supplied" });
  } else {
    try {
      input.record(run);
      stages.push({ stage: 6, name: "RECORD", outcome: "WRITTEN", detail: "enforcement ledger" });
    } catch (e) {
      stages.push({ stage: 6, name: "RECORD", outcome: "FAILED", detail: e instanceof Error ? e.message : String(e) });
    }
  }
  return run;
}
function finish(stages, verdict, code, cls, reason, evidence) {
  return { stages, verdict, code, class: cls, reason, evidence };
}

// src/omp/decision.ts
import * as path37 from "path";
import * as fs33 from "fs";

// src/omp/fire-ledger.ts
import { Database as Database8 } from "bun:sqlite";
import * as nodePath from "path";
var FIRE_DECISIONS_DDL = `
CREATE TABLE IF NOT EXISTS fire_decisions (
  id               INTEGER PRIMARY KEY,
  at               TEXT NOT NULL,
  rule_id          TEXT NOT NULL,
  cls              TEXT NOT NULL,
  question_version TEXT NOT NULL,
  probability      REAL NOT NULL,
  band             TEXT NOT NULL,
  action           TEXT NOT NULL,
  policy_name      TEXT NOT NULL,
  act_threshold    REAL NOT NULL,
  flag_threshold   REAL NOT NULL,
  state_hash       TEXT NOT NULL,
  -- \u2605 EN-090 \u2014 nullable BY CONSTRUCTION: rows written before the migration have no target
  --   and never can (it was hashed away). NULL is the honest value for them.
  target           TEXT,
  cost_usd         REAL NOT NULL DEFAULT 0,
  later_truth      TEXT NOT NULL DEFAULT 'unresolved'
                   CHECK (later_truth IN ('confirmed','refuted','unresolved')),
  truth_at         TEXT
);
CREATE INDEX IF NOT EXISTS idx_fd_rule_truth ON fire_decisions(rule_id, later_truth);
CREATE INDEX IF NOT EXISTS idx_fd_hash ON fire_decisions(state_hash);
`;

class LedgerError extends Error {
  code;
  constructor(code, detail, cause) {
    super(`GI_LEDGER_${code}: ${detail}${cause instanceof Error ? ` (${cause.message})` : ""}`, { cause });
    this.code = code;
    this.name = "LedgerError";
  }
}
function toLedgerCode(code) {
  const bare = code.startsWith("GI_LEDGER_") ? code.slice("GI_LEDGER_".length) : code;
  return `GI_LEDGER_${bare}`;
}

class FireLedger {
  path;
  db;
  insertStmt;
  closed = false;
  persistFailureCount = 0;
  lastPersist = null;
  resolvedPath;
  constructor(path) {
    this.path = path;
    if (path.trim() === "" || path.trim() === ":memory:" || path.trim().startsWith("file::memory:")) {
      throw new LedgerError("NOT_PERSISTENT", `path ${JSON.stringify(path)} names an in-memory database \u2014 the ledger must survive the process or it is not a ledger`);
    }
    this.resolvedPath = nodePath.resolve(path);
    let db;
    try {
      db = new Database8(path, { create: true });
      db.exec(FIRE_DECISIONS_DDL);
    } catch (e) {
      throw new LedgerError("OPEN_FAILED", `cannot open or migrate the fire ledger at ${path}`, e);
    }
    this.db = db;
    try {
      const cols = this.db.query("PRAGMA table_info(fire_decisions)").all();
      if (!cols.some((c) => c.name === "target")) {
        this.db.exec("ALTER TABLE fire_decisions ADD COLUMN target TEXT");
      }
    } catch (e) {
      throw new LedgerError("MIGRATION_FAILED", `cannot add the target column to the ledger at ${path} \u2014 the DDL and the insert would disagree`, e);
    }
    try {
      this.db.exec("PRAGMA journal_mode = WAL;");
    } catch {}
    this.insertStmt = this.db.prepare(`
      INSERT INTO fire_decisions (
        at, rule_id, cls, question_version, probability, band, action,
        policy_name, act_threshold, flag_threshold, state_hash, target, cost_usd,
        later_truth, truth_at
      ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,NULL)
    `);
  }
  rawDb() {
    this.ensureOpen();
    return this.db;
  }
  ensureOpen() {
    if (this.closed) {
      throw new LedgerError("CLOSED", `the ledger at ${this.path} is closed \u2014 reopen it rather than reading a closed handle`);
    }
  }
  guard(op, fn) {
    this.ensureOpen();
    try {
      return fn();
    } catch (e) {
      if (e instanceof LedgerError)
        throw e;
      throw new LedgerError("QUERY_FAILED", `${op} failed on ${this.path}`, e);
    }
  }
  persistFailures() {
    return this.persistFailureCount;
  }
  lastPersistError() {
    return this.lastPersist;
  }
  notePersistFailure(code, message) {
    this.persistFailureCount += 1;
    this.lastPersist = { code, message, at: new Date().toISOString() };
  }
  append(row) {
    this.ensureOpen();
    if (row === null || typeof row !== "object") {
      throw new LedgerError("MALFORMED_ROW", `append requires a row object, got ${String(row)}`);
    }
    for (const key of ["at", "ruleId", "cls", "questionVersion", "band", "action", "policyName", "stateHash"]) {
      if (typeof row[key] !== "string" || row[key].trim() === "") {
        if (key === "stateHash") {
          throw new LedgerError("EMPTY_STATE_HASH", "a row without a state_hash cannot be resolved later");
        }
        throw new LedgerError("MALFORMED_ROW", `${key} must be a non-empty string, got ${JSON.stringify(row[key])}`);
      }
    }
    for (const key of ["probability", "actThreshold", "flagThreshold", "costUsd"]) {
      if (typeof row[key] !== "number" || !Number.isFinite(row[key])) {
        if (key === "probability") {
          throw new LedgerError("BAD_PROBABILITY", `probability must be finite, got ${String(row[key])}`);
        }
        throw new LedgerError("BAD_NUMBER", `${key} must be finite, got ${String(row[key])}`);
      }
    }
    for (const key of ["probability", "actThreshold", "flagThreshold"]) {
      if (row[key] < 0 || row[key] > 1) {
        throw new LedgerError("BAD_PROBABILITY", `${key}=${row[key]} is outside 0..1 \u2014 a probability that cannot band`);
      }
    }
    if (!["act", "escalate", "ignore"].includes(row.band)) {
      throw new LedgerError("BAD_DOMAIN", `band='${row.band}' is not act|escalate|ignore`);
    }
    if (!["FIRE", "ESCALATE", "IGNORE"].includes(row.action)) {
      throw new LedgerError("BAD_DOMAIN", `action='${row.action}' is not FIRE|ESCALATE|IGNORE`);
    }
    if (row.laterTruth !== "unresolved") {
      throw new LedgerError("TRUTH_AT_FIRING", `a row must be inserted 'unresolved', got '${String(row.laterTruth)}' \u2014 the oracle resolves it later`);
    }
    try {
      const r = this.insertStmt.run(row.at, row.ruleId, row.cls, row.questionVersion, row.probability, row.band, row.action, row.policyName, row.actThreshold, row.flagThreshold, row.stateHash, row.target ?? null, row.costUsd, row.laterTruth);
      return Number(r.lastInsertRowid);
    } catch (e) {
      throw new LedgerError("APPEND_FAILED", `row for ${row.ruleId} (${row.stateHash}) was not written`, e);
    }
  }
  appendMany(rows) {
    return this.appendManyDetailed(rows).committed.length;
  }
  appendManyDetailed(rows) {
    this.ensureOpen();
    if (rows.length === 0)
      return { committed: [], failed: [] };
    const tx = this.db.transaction((rs) => {
      for (const r of rs)
        this.append(r);
      return rs.length;
    });
    try {
      tx(rows);
      return { committed: [...rows], failed: [] };
    } catch (e) {
      if (!(e instanceof LedgerError)) {
        throw new LedgerError("APPEND_MANY_FAILED", `${rows.length} rows did not commit`, e);
      }
      const committed = [];
      const failed = [];
      for (const r of rows) {
        try {
          this.append(r);
          committed.push(r);
        } catch (inner) {
          const err = inner instanceof LedgerError ? inner : new LedgerError("APPEND_FAILED", "row did not commit", inner);
          failed.push({ row: r, error: err });
          this.notePersistFailure(toLedgerCode(err.code), err.message);
        }
      }
      return { committed, failed };
    }
  }
  all(limit) {
    if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
      throw new LedgerError("BAD_LIMIT", `all(limit) needs a positive integer, got ${String(limit)}`);
    }
    return this.guard("all", () => {
      const raw = limit === undefined ? this.db.query(`SELECT * FROM fire_decisions ORDER BY id ASC`).all() : this.db.query(`SELECT * FROM fire_decisions ORDER BY id DESC LIMIT ?1`).all(limit);
      const rows = raw.map(toPersisted);
      return limit === undefined ? rows : rows.reverse();
    });
  }
  byRule(ruleId, limit) {
    if (typeof ruleId !== "string" || ruleId.trim() === "") {
      throw new LedgerError("BAD_RULE_ID", `byRule needs a non-empty ruleId, got ${JSON.stringify(ruleId)}`);
    }
    if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
      throw new LedgerError("BAD_LIMIT", `byRule(limit) needs a positive integer, got ${String(limit)}`);
    }
    return this.guard("byRule", () => {
      const raw = limit === undefined ? this.db.query(`SELECT * FROM fire_decisions WHERE rule_id = ?1 ORDER BY id ASC`).all(ruleId) : this.db.query(`SELECT * FROM fire_decisions WHERE rule_id = ?1 ORDER BY id DESC LIMIT ?2`).all(ruleId, limit);
      const rows = raw.map(toPersisted);
      return limit === undefined ? rows : rows.reverse();
    });
  }
  count() {
    return this.guard("count", () => {
      const r = this.db.query(`SELECT COUNT(*) AS n FROM fire_decisions`).get();
      return r.n;
    });
  }
  recordTruth(stateHash, truth, at = new Date().toISOString()) {
    if (truth !== "confirmed" && truth !== "refuted") {
      throw new LedgerError("BAD_TRUTH", `the oracle resolves to confirmed|refuted; got ${JSON.stringify(truth)}`);
    }
    if (typeof stateHash !== "string" || stateHash.trim() === "") {
      throw new LedgerError("BAD_STATE_HASH", `recordTruth needs a non-empty stateHash, got ${JSON.stringify(stateHash)}`);
    }
    if (typeof at !== "string" || !Number.isFinite(Date.parse(at))) {
      throw new LedgerError("BAD_TRUTH_AT", `truth_at must be a parseable timestamp, got ${JSON.stringify(at)}`);
    }
    return this.guard("recordTruth", () => {
      try {
        const r = this.db.prepare(`UPDATE fire_decisions SET later_truth = ?1, truth_at = ?2 WHERE state_hash = ?3 AND later_truth = 'unresolved'`).run(truth, at, stateHash);
        return Number(r.changes);
      } catch (e) {
        throw new LedgerError("TRUTH_FAILED", `could not resolve state ${stateHash}`, e);
      }
    });
  }
  countsByRule() {
    return this.guard("countsByRule", () => {
      const raw = this.db.query(`SELECT rule_id, later_truth, COUNT(*) AS n
           FROM fire_decisions
          GROUP BY rule_id, later_truth`).all();
      const out = {};
      for (const r of raw) {
        const slot = out[r.rule_id] ??= { confirmed: 0, refuted: 0, unresolved: 0 };
        if (r.later_truth === "confirmed")
          slot.confirmed += r.n;
        else if (r.later_truth === "refuted")
          slot.refuted += r.n;
        else if (r.later_truth === "unresolved")
          slot.unresolved += r.n;
        else {
          throw new LedgerError("UNKNOWN_TRUTH", `row has later_truth='${r.later_truth}' for ${r.rule_id} \u2014 refusing to misclassify it`);
        }
      }
      return out;
    });
  }
  truthOf(stateHash) {
    return this.guard("truthOf", () => {
      const r = this.db.query(`SELECT later_truth FROM fire_decisions WHERE state_hash = ?1 ORDER BY id DESC LIMIT 1`).get(stateHash);
      if (r === null)
        return null;
      if (r.later_truth !== "confirmed" && r.later_truth !== "refuted" && r.later_truth !== "unresolved") {
        throw new LedgerError("UNKNOWN_TRUTH", `row has later_truth='${r.later_truth}' for ${stateHash} \u2014 refusing to launder it into a Truth`);
      }
      return r.later_truth;
    });
  }
  columns() {
    return this.guard("columns", () => {
      const r = this.db.query(`PRAGMA table_info(fire_decisions)`).all();
      return r.map((x) => x.name);
    });
  }
  indices() {
    return this.guard("indices", () => {
      const r = this.db.query(`PRAGMA index_list(fire_decisions)`).all();
      return r.map((x) => x.name);
    });
  }
  close() {
    if (this.closed)
      return;
    this.closed = true;
    try {
      this.insertStmt.finalize();
    } catch {}
    try {
      this.db.close();
    } catch {}
  }
}
function persistedTruth(v, stateHash) {
  if (v === "confirmed" || v === "refuted" || v === "unresolved")
    return v;
  throw new LedgerError("UNKNOWN_TRUTH", `row ${String(stateHash)} has later_truth=${JSON.stringify(v)} \u2014 refusing to launder it into a Truth`);
}
function toPersisted(raw) {
  return {
    id: Number(raw["id"]),
    at: String(raw["at"]),
    ruleId: String(raw["rule_id"]),
    cls: String(raw["cls"]),
    questionVersion: String(raw["question_version"]),
    probability: Number(raw["probability"]),
    band: String(raw["band"]),
    action: String(raw["action"]),
    policyName: String(raw["policy_name"]),
    actThreshold: Number(raw["act_threshold"]),
    flagThreshold: Number(raw["flag_threshold"]),
    stateHash: String(raw["state_hash"]),
    ...raw["target"] === null || raw["target"] === undefined ? {} : { target: String(raw["target"]) },
    costUsd: Number(raw["cost_usd"]),
    laterTruth: persistedTruth(raw["later_truth"], raw["state_hash"]),
    truthAt: raw["truth_at"] === null || raw["truth_at"] === undefined ? null : String(raw["truth_at"])
  };
}
var drained = new Map;
var poisoned = new Map;
var POISON_CODES = new Set(["MALFORMED_ROW", "EMPTY_STATE_HASH", "BAD_PROBABILITY", "BAD_NUMBER", "BAD_DOMAIN", "TRUTH_AT_FIRING", "BAD_LIMIT", "BAD_RULE_ID", "BAD_STATE_HASH", "BAD_TRUTH", "BAD_TRUTH_AT", "NOT_PERSISTENT"]);

// src/omp/policy-store.ts
import * as fs32 from "fs";
var SUPPORTED_POLICY_VERSIONS = [1];
var FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
function assertSafeKey(key) {
  if (FORBIDDEN_KEYS.has(key)) {
    throw new PolicyError("FORBIDDEN_KEY", `the rule id ${JSON.stringify(key)} collides with Object.prototype \u2014 refusing to load a prototype-pollution vector`);
  }
}
function nullProtoRecord() {
  return Object.create(null);
}
function canonical(value) {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value) ?? "null";
  if (Array.isArray(value))
    return `[${value.map(canonical).join(",")}]`;
  const entries = Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
}

class PolicyError extends Error {
  code;
  constructor(code, detail, cause) {
    super(`GI_POLICY_${code}: ${detail}${cause instanceof Error ? ` (${cause.message})` : ""}`, { cause });
    this.code = code;
    this.name = "PolicyError";
  }
}
function deepFreeze(value) {
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value))
      deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}
var DEFAULT_POLICY_FILE = deepFreeze({
  version: 1,
  policies: {
    "*destructive": { name: "destructive-seed", act: 0.9, flag: 0.5, failPolarity: "closed" },
    "*dumb": { name: "dumb-seed", act: 0.75, flag: 0.35, failPolarity: "open" },
    "*theatrical": { name: "theatrical-seed", act: 0.85, flag: 0.45, failPolarity: "closed" }
  }
});
function frozenCopy(policy) {
  return Object.freeze({ ...policy });
}
function readPolicyFile(filePath) {
  let raw;
  try {
    raw = fs32.readFileSync(filePath, "utf8");
  } catch (e) {
    const code = e?.code;
    const kind = code === "ENOENT" ? "MISSING" : code === "EACCES" ? "UNREADABLE" : code === "EISDIR" || code === "ENOTDIR" ? "NOT_A_FILE" : "READ_FAILED";
    throw new PolicyError(kind, `could not read the policy file at ${filePath} (${code ?? "unknown"})`, e);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new PolicyError("MALFORMED", `the policy file at ${filePath} is not valid JSON`, e);
  }
  if (parsed === null || typeof parsed !== "object") {
    throw new PolicyError("MALFORMED", `the policy file at ${filePath} is not an object`);
  }
  const obj = parsed;
  if (typeof obj.version !== "number" || !Number.isFinite(obj.version)) {
    throw new PolicyError("MALFORMED", `the policy file at ${filePath} has no numeric version`);
  }
  if (obj.policies === null || typeof obj.policies !== "object" || Array.isArray(obj.policies)) {
    throw new PolicyError("MALFORMED", `the policy file at ${filePath} has no policies object (an array is not a map)`);
  }
  if (!SUPPORTED_POLICY_VERSIONS.includes(obj.version)) {
    throw new PolicyError("UNSUPPORTED_VERSION", `the policy file at ${filePath} declares version ${obj.version}; this build understands ${SUPPORTED_POLICY_VERSIONS.join(", ")}`);
  }
  const policies = nullProtoRecord();
  for (const [ruleId, pol] of Object.entries(obj.policies)) {
    assertSafeKey(ruleId);
    policies[ruleId] = pol;
  }
  const file = deepFreeze({ version: obj.version, policies });
  validatePolicies(file);
  return file;
}
function validatePolicies(file) {
  if (file === null || typeof file !== "object" || Array.isArray(file)) {
    throw new PolicyError("MALFORMED", `validatePolicies needs a PolicyFile object`);
  }
  if (file.policies === null || typeof file.policies !== "object" || Array.isArray(file.policies)) {
    throw new PolicyError("MALFORMED", `the policies must be a map, not ${Array.isArray(file.policies) ? "an array" : typeof file.policies}`);
  }
  if (!SUPPORTED_POLICY_VERSIONS.includes(file.version)) {
    throw new PolicyError("UNSUPPORTED_VERSION", `version ${file.version} is not supported by this build (${SUPPORTED_POLICY_VERSIONS.join(", ")})`);
  }
  for (const [ruleId, p] of Object.entries(file.policies)) {
    assertSafeKey(ruleId);
    if (p === null || typeof p !== "object") {
      throw new PolicyError("MALFORMED", `the policy for ${ruleId} is not an object`);
    }
    for (const key of ["act", "flag"]) {
      const v = p[key];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new PolicyError("MALFORMED", `the policy for ${ruleId} has a non-numeric ${key}`);
      }
      if (v < 0 || v > 1) {
        throw new PolicyError("RANGE", `the policy for ${ruleId} has ${key}=${v}, outside 0..1 \u2014 it could never band`);
      }
    }
    if (p.act <= p.flag) {
      const kind = p.act < p.flag ? "INVERTED" : "ZERO_WIDTH_BAND";
      const detail = p.act < p.flag ? `act=${p.act} sits BELOW flag=${p.flag} \u2014 the flag would never be consulted` : `act=${p.act} EQUALS flag=${p.flag} \u2014 the ESCALATE band has zero width`;
      throw new PolicyError(kind, `the policy for ${ruleId} has ${detail}; ESCALATE would be unreachable`);
    }
    if (p.failPolarity !== "open" && p.failPolarity !== "closed") {
      throw new PolicyError("MALFORMED", `the policy for ${ruleId} has failPolarity='${String(p.failPolarity)}' \u2014 must be open|closed`);
    }
    if (typeof p.name !== "string" || p.name.trim() === "") {
      throw new PolicyError("MALFORMED", `the policy for ${ruleId} has no name \u2014 a threshold must be able to say what it is called`);
    }
  }
}

class PolicyStore {
  path;
  file;
  constructor(path) {
    this.path = path;
    this.file = readPolicyFile(path);
    validatePolicies(this.file);
  }
  reload() {
    const next = readPolicyFile(this.path);
    validatePolicies(next);
    const changed = canonical(next) !== canonical(this.file);
    this.file = next;
    return { changed, version: next.version, policies: Object.keys(next.policies).length };
  }
  get(ruleId) {
    if (!Object.hasOwn(this.file.policies, ruleId))
      return;
    const p = this.file.policies[ruleId];
    return p === undefined ? undefined : frozenCopy(p);
  }
  all() {
    const out = nullProtoRecord();
    for (const [k, v] of Object.entries(this.file.policies)) {
      assertSafeKey(k);
      out[k] = frozenCopy(v);
    }
    return Object.freeze(out);
  }
  version() {
    return this.file.version;
  }
  validate() {
    validatePolicies(this.file);
  }
}

// src/omp/decision.ts
var LAYER_IDS = [
  "L1_SEMANTICA",
  "L2_ARSUMBRIS",
  "L3_UA",
  "L4_C2KG",
  "L5_CORBELL",
  "L6_GRAPHIFY"
];
function layerCertifications(facts) {
  const layerIdList = [...LAYER_IDS];
  return facts.filter((f) => layerIdList.includes(f.consumer)).map((f) => ({
    layer: f.consumer,
    verdict: "PASS",
    reason: `${f.source}`
  }));
}
function decideFromRegistry(scopeRoot, subject, act, record) {
  if (typeof scopeRoot !== "string" || scopeRoot.trim().length === 0) {
    throw new Error("GI_DECIDE_BAD_INPUT: scopeRoot must be a non-empty string");
  }
  if (typeof subject !== "string" || subject.trim().length === 0) {
    throw new Error("GI_DECIDE_BAD_INPUT: subject must be a non-empty string");
  }
  if (act === null || typeof act !== "object") {
    throw new Error("GI_DECIDE_BAD_INPUT: act must be an object");
  }
  const a = act;
  if (typeof a.toolName !== "string" || a.toolName.trim().length === 0) {
    throw new Error("GI_DECIDE_BAD_INPUT: act.toolName must be a non-empty string");
  }
  if (typeof a.target !== "string" || a.target.trim().length === 0) {
    throw new Error("GI_DECIDE_BAD_INPUT: act.target must be a non-empty string");
  }
  if (typeof a.queriedBefore !== "boolean") {
    throw new Error("GI_DECIDE_BAD_INPUT: act.queriedBefore must be a boolean (undefined would silently read as blind)");
  }
  if (!path37.isAbsolute(scopeRoot) || scopeRoot.split(/[\\/]/).includes("..") || scopeRoot.includes("\x00")) {
    throw new Error(`GI_DECIDE_BAD_INPUT: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  }
  const registry = buildRegistry(scopeRoot);
  const facts = registry.factsFor(subject);
  const influenced = [...new Set(facts.map((f) => f.consumer))];
  const layers = registry.consumers().filter((c) => LAYER_IDS.includes(c.id)).map((c) => ({
    id: c.id,
    dependency: c.dependency,
    errorCode: c.errorCode,
    probe: () => {
      const s = c.up();
      return { up: s.up, evidence: s.evidence };
    }
  }));
  const certifications = layerCertifications(facts);
  const run = runKernelV2({
    toolName: act.toolName,
    target: act.target,
    queriedBefore: act.queriedBefore,
    claims: act.claims ?? [],
    certifications,
    layers,
    record
  });
  return {
    subject,
    scopeRoot,
    layersWired: layers.length,
    consumersTotal: SIX_L2E_CONSUMERS.length,
    facts,
    influenced,
    run
  };
}
function decideFireFromGraph(scopeRoot, target, intent) {
  if (typeof scopeRoot !== "string" || scopeRoot.trim().length === 0) {
    throw new Error("GI_DECIDE_BAD_INPUT: scopeRoot must be a non-empty string");
  }
  if (typeof target !== "string" || target.trim().length === 0) {
    throw new Error("GI_DECIDE_BAD_INPUT: target must be a non-empty string");
  }
  if (target.includes("\x00")) {
    throw new Error("GI_DECIDE_BAD_INPUT: target must not contain NUL bytes");
  }
  if (intent !== "consume" && intent !== "declare" && intent !== "mutate" && intent !== "measure") {
    throw new Error(`GI_DECIDE_BAD_INPUT: intent must be one of consume|declare|mutate|measure (got ${String(intent)})`);
  }
  if (!path37.isAbsolute(scopeRoot) || scopeRoot.split(/[\\/]/).includes("..") || scopeRoot.includes("\x00")) {
    throw new Error(`GI_DECIDE_BAD_INPUT: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  }
  const storePath = corbellCheckoutPath(scopeRoot);
  const verdicts = graphFacts({ storePath, target, intent });
  const settles = verdicts.some((v) => v.settles);
  const fires = verdicts.filter((v) => v.action === "FIRE").length;
  const policyPath = path37.join(scopeRoot, ".omp", "graph-intelligence", "policy.json");
  let policyCount = Object.keys(DEFAULT_POLICY_FILE.policies).length;
  let policySource = "the seed policy set (no policy.json on disk \u2014 the named fallback)";
  try {
    const store = new PolicyStore(policyPath);
    policyCount = Object.keys(store.all()).length;
    policySource = policyPath;
  } catch (e) {
    if (fs33.existsSync(policyPath)) {
      const msg = e instanceof Error ? e.message : String(e);
      policySource = `POLICY_INVALID: ${policyPath} (${msg}) \u2014 the seed set stands, LOUDLY`;
    }
  }
  const ledgerPath = path37.join(scopeRoot, ".omp", "graph-intelligence", "fire-decisions.db");
  const ledgerDir = path37.dirname(ledgerPath);
  try {
    fs33.mkdirSync(ledgerDir, { recursive: true });
  } catch (e) {
    throw new Error(`GI_LEDGER_DIR_FAILED: cannot create ${ledgerDir} (${e instanceof Error ? e.message : String(e)})`);
  }
  let ledger;
  try {
    ledger = new FireLedger(ledgerPath);
  } catch (e) {
    throw new Error(`GI_LEDGER_OPEN_FAILED: cannot open the fire ledger at ${ledgerPath} (${e instanceof Error ? e.message : String(e)})`);
  }
  return { storePath, target, intent, verdicts, settles, fires, policyCount, policySource, ledgerPath, ledger };
}

// src/omp/extension.ts
var GI_TOOL_NAMES = ["graph-probe", "graph-query", "bug-hunt", "aether-code-audit", "gi-consumption", "gi-decide"];
var GI_TOOL_NAMES_ALIASES = { "graph-code-audit": "aether-code-audit" };
var wipeInFlight = false;
var populateLane = Promise.resolve();
var withPopulateLane = async (fn) => {
  const run = populateLane.then(fn, fn);
  populateLane = run.then(() => {
    return;
  }, () => {
    return;
  });
  return run;
};
function ensureAuditRoot(targetReal, auditRoot) {
  const rel = path40.relative(targetReal, auditRoot);
  if (rel === "" || rel.startsWith("..") || path40.isAbsolute(rel))
    return "audit root escapes the target root";
  const parts = rel.split(path40.sep).filter((p) => p.length > 0);
  let cur = targetReal;
  try {
    for (const part of parts) {
      if (part === ".." || part === "." || path40.isAbsolute(part))
        return "audit root escapes the target root";
      cur = path40.join(cur, part);
      let st = null;
      try {
        st = fs36.lstatSync(cur);
      } catch {
        st = null;
      }
      if (st && st.isSymbolicLink())
        return "audit root is a symlink plant";
      if (!st)
        fs36.mkdirSync(cur);
    }
  } catch (mkErr) {
    return `cannot create audit root: ${mkErr instanceof Error ? mkErr.message : String(mkErr)}`;
  }
  return null;
}
function ledgerDirConfined(ledgerReal, targetReal) {
  if (typeof ledgerReal !== "string" || typeof targetReal !== "string") {
    throw new Error(`GI_LEDGER_CONFINE_INVALID: ledgerDirConfined needs two string paths, got (${typeof ledgerReal}, ${typeof targetReal})`);
  }
  const rel = path40.relative(targetReal, ledgerReal);
  return rel !== "" && !rel.startsWith("..") && !path40.isAbsolute(rel);
}
function substrateNeedsPopulate(storePath, scopeRoot) {
  if (countTypedNodes(storePath) === 0)
    return true;
  const stored = getMeta(storePath, "substrate");
  const warm = isCorbellCheckoutFreshFor(scopeRoot, corbellCheckoutPath(scopeRoot));
  return warm.fresh && stored !== "corbell";
}
function settlementLedgerConfined(ledgerPath, targetReal) {
  if (typeof ledgerPath !== "string" || typeof targetReal !== "string") {
    return { ok: false, error: `GI_LEDGER_INVALID: settlementLedgerConfined needs two string paths, got (${typeof ledgerPath}, ${typeof targetReal})` };
  }
  let real = ledgerPath;
  try {
    real = fs36.realpathSync(ledgerPath);
  } catch {
    return { ok: false, error: "GI_PATH_DENIED: settlement ledger does not exist" };
  }
  if (!ledgerDirConfined(real, targetReal)) {
    return { ok: false, error: "GI_LEDGER_DENIED: settlement ledger outside the audit target root" };
  }
  return { ok: true, real };
}
function writeWipeAudit(giDir, note) {
  fs36.mkdirSync(giDir, { recursive: true });
  const regPath = path40.join(giDir, "registry.sqlite");
  const db = new Database9(regPath);
  try {
    db.exec("CREATE TABLE IF NOT EXISTS gi_meta (key TEXT PRIMARY KEY, value TEXT)");
    db.run("INSERT INTO gi_meta (key, value) VALUES ('last_wipe', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [note]);
  } finally {
    db.close();
  }
}
function graphProbeWipeAudited(ctx, cwdOf) {
  const wipeCwd = cwdOf(ctx);
  const wipeConfined = confineTargetPath(path40.normalize(wipeCwd), wipeCwd);
  if (!wipeConfined.ok) {
    return { audited: false, text: `WIPE_AUDIT_FAILED: ${wipeConfined.error}` };
  }
  try {
    writeWipeAudit(path40.join(wipeConfined.real, ".omp", "graph-intelligence"), `${ctx?.sessionID ?? "unknown-session"}@${new Date().toISOString()}`);
    return { audited: true, text: "" };
  } catch (auditErr) {
    return { audited: false, text: `WIPE_AUDIT_FAILED: ${auditErr instanceof Error ? auditErr.message : String(auditErr)}` };
  }
}
function parseTargetRoots(raw) {
  if (typeof raw !== "string") {
    throw new Error(`GI_TARGET_ROOTS_INVALID: parseTargetRoots needs a '|'-separated string, got ${typeof raw}`);
  }
  return raw.split("|").map((r) => r.trim()).filter((r) => r.length > 0);
}
var confineTargetPath = (normalized, callerCwd) => {
  let real = normalized;
  try {
    real = fs36.realpathSync(normalized);
  } catch {
    return { ok: false, error: `GI_PATH_DENIED: targetPath does not exist: '${normalized.slice(0, 120)}'` };
  }
  let st = null;
  try {
    st = fs36.statSync(real);
  } catch {
    st = null;
  }
  if (!st || !st.isDirectory()) {
    return { ok: false, error: `GI_PATH_DENIED: targetPath is not a directory: '${real.slice(0, 120)}'` };
  }
  const allowRoots = parseTargetRoots(process.env.GI_TARGET_ROOTS ?? "");
  const roots = allowRoots.length > 0 ? allowRoots : [callerCwd, "/tmp"];
  const within = roots.some((root) => {
    let rootReal = null;
    try {
      rootReal = fs36.realpathSync(root);
    } catch {
      rootReal = null;
    }
    if (rootReal === null)
      return false;
    const rel = path40.relative(rootReal, real);
    return rel === "" || !rel.split(/[\\/]/).includes("..") && !path40.isAbsolute(rel);
  });
  if (!within) {
    return { ok: false, error: `GI_PATH_DENIED: targetPath '${real.slice(0, 120)}' is outside the allowed roots (${roots.join("|").slice(0, 120)}); set GI_TARGET_ROOTS to extend (separator '|')` };
  }
  let realAfter = null;
  try {
    realAfter = fs36.realpathSync(normalized);
  } catch {
    realAfter = null;
  }
  if (realAfter !== real) {
    return { ok: false, error: `GI_PATH_DENIED: the path changed during the confinement check (TOCTOU) \u2014 '${normalized.slice(0, 120)}'` };
  }
  let stAfter = null;
  try {
    stAfter = fs36.statSync(realAfter);
  } catch {
    stAfter = null;
  }
  if (!stAfter || !stAfter.isDirectory()) {
    return { ok: false, error: `GI_PATH_DENIED: targetPath is not a directory after re-resolve: '${(realAfter ?? normalized).slice(0, 120)}'` };
  }
  return { ok: true, real: realAfter ?? real };
};
function textResult2(text, details) {
  return { content: [{ type: "text", text }], details };
}
function safeRipwire(fn) {
  try {
    return fn();
  } catch (e) {
    return { present: false, ok: false, summary: "absent (leg threw: " + String(e instanceof Error ? e.message : e).slice(0, 80) + ")", data: {} };
  }
}
function sanitizeLayerId(raw) {
  const t = raw.trim();
  if (t === "")
    return { ok: true, layerId: "R28-sro-graph" };
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(t)) {
    return { ok: false, error: `HUNTER_TEMPLATE_INVALID: '${t.slice(0, 64)}' is not a valid layerId (allowed: alnum . _ -, <= 64 chars)` };
  }
  return { ok: true, layerId: t };
}
async function runGraphQueryVerbs(verb, p, storePath, scopeRoot, sessionId, popNote, substrate) {
  try {
    assertStoreScope(storePath, scopeRoot);
  } catch (e) {
    if (e instanceof Error && e.message.includes("GI_STORE_SCOPE_MISMATCH")) {
      return textResult2(e.message, { ok: false, error: "GI_STORE_SCOPE_MISMATCH", verb });
    }
    throw e;
  }
  if (verb === "who-calls") {
    const sym = String(p.target ?? p.symbol ?? "");
    if (sym.trim() === "")
      return textResult2("QUERY_INVALID: target required (who-calls needs a symbol)", { ok: false, error: "QUERY_INVALID", verb });
    const q = whoCalls(storePath, sym);
    const head = q.callers.slice(0, 20).map((c) => `${c.caller} (${c.file}:${c.line})`).join(`
`);
    const rw = safeRipwire(() => ripwireCallers(scopeRoot, sym));
    return textResult2(`${popNote}rows=${q.rows}
${head}
ripwire: ${rw.summary}`, { ok: true, rows: q.rows, names: q.names, callers: q.callers, substrate: substrate && substrate.length > 0 ? substrate : "GI_SUBSTRATE_UNKNOWN", ripwire: rw });
  }
  if (verb === "blast-radius") {
    const b = blastRadius(storePath, String(p.target ?? p.symbol ?? ""));
    const rw = safeRipwire(() => ripwireImpact(scopeRoot, String(p.target ?? p.symbol ?? "")));
    return textResult2(`rows=${b.nodes.length} root=${b.root} depth=${b.depth}
ripwire: ${rw.summary}`, { ok: true, rows: b.nodes.length, root: b.root, depth: b.depth, nodes: b.nodes, ripwire: rw });
  }
  if (verb === "would-break") {
    const sym = String(p.target ?? p.symbol ?? "");
    const w = wouldBreak(storePath, sym, String(p.proposed ?? ""));
    const rw = safeRipwire(() => ripwireEditCheck(scopeRoot, sym));
    return textResult2(`callers=${w.callers} argsUnknown=${w.argsUnknown}
ripwire: ${rw.summary}`, { ...w, ripwire: rw, ok: w.ok !== false });
  }
  if (verb === "unwired") {
    const u = unwiredNodes(storePath);
    const head = u.slice(0, 20).map((r) => `${r.name} (${r.file}:${r.line})`).join(`
`);
    const rw = safeRipwire(() => ripwireDeadCode(scopeRoot));
    return textResult2(`rows=${u.length}
${head}
ripwire: ${rw.summary}`, { ok: true, rows: u.length, names: u.map((r) => r.name), unwired: u, ripwire: rw });
  }
  if (verb === "chain") {
    const from = String(p.from ?? p.target ?? p.symbol ?? "");
    const to = String(p.to ?? "");
    const steps = chainCalls(storePath, from, to);
    const head = steps.map((s) => `${s.from} -> ${s.to} [${s.kind}]`).join(`
`);
    const rw = safeRipwire(() => to.length > 0 ? ripwirePath(scopeRoot, from, to) : { present: true, ok: false, summary: "skipped (no `to` argument)", data: {} });
    return textResult2(`rows=${steps.length}
${head}
ripwire: ${rw.summary}`, { ok: true, rows: steps.length, steps, ripwire: rw });
  }
  if (verb === "impact") {
    const sym = String(p.target ?? p.symbol ?? "");
    const im = impact(storePath, sym, 8);
    const head = im.ledger.slice(0, 20).map((r) => `${r.symbol}@depth${r.depth} (${r.file}:${r.line}) via ${r.via}`).join(`
`);
    const rw = safeRipwire(() => ripwireImpact(scopeRoot, sym));
    return textResult2(`${popNote}impact_reaches=${im.reaches}
${head}
hint=${im.hint}
ripwire: ${rw.summary}`, { ok: true, rows: im.reaches, impact_reaches: im.reaches, ledger: im.ledger, hint: im.hint, ripwire: rw });
  }
  if (verb === "safe-delete") {
    const sym = String(p.target ?? p.symbol ?? "");
    const sd = safeDelete(storePath, sym);
    const head = sd.callers.slice(0, 20).map((c) => `${c.caller} (${c.file}:${c.line})`).join(`
`);
    const rw = safeRipwire(() => ripwireSafeDelete(scopeRoot, sym));
    return textResult2(`${popNote}safe_delete: ${sym} callers=${sd.callers.length} reaches=${sd.reaches} uses=${sd.uses.length} testReach=${sd.testReach.length}
${head}
ripwire: ${rw.summary}`, { ...sd, ripwire: rw, ok: sd.ok !== false });
  }
  if (verb === "gate") {
    const dialRaw = String(p.dial ?? "STEER").toUpperCase();
    const sym = String(p.target ?? p.symbol ?? "");
    const rw = safeRipwire(() => ripwireEditCheck(scopeRoot, sym));
    const ga = gateAdvisory(storePath, [sym], dialRaw === "FULL" ? "FULL" : "STEER", { ok: rw.ok, summary: rw.summary });
    return textResult2(`${popNote}${ga.advisory}`, { ...ga, ripwire: rw, ok: ga.ok !== false });
  }
  if (verb === "verify") {
    const claim = String(p.target ?? p.symbol ?? "");
    if (claim.length === 0) {
      return textResult2('VERIFY_INVALID: claim required (closed shapes: calls(A,B), uses(SYM), unused(SYM), contains(FILE,"LIT"), defines(FILE,SYM), reaches(SYM,FILTER))', { ok: false, error: "VERIFY_INVALID" });
    }
    const rw = safeRipwire(() => ripwireVerify(scopeRoot, claim));
    return textResult2(`${popNote}verify: ${rw.summary}`, { ...rw.data, ripwire: rw, ok: rw.ok, error: rw.ok ? undefined : rw.present ? "VERIFY_FAILED" : "RIPWIRE_ABSENT" });
  }
  if (verb === "must-implement" || verb === "rule" || verb === "violations" || verb === "consistency") {
    const sym = String(p.target ?? p.symbol ?? "");
    const delegated = await runQueryTool({
      sessionId,
      scopeRoot,
      verb,
      symbol: sym || undefined,
      from: typeof p.from === "string" ? p.from : undefined,
      to: typeof p.to === "string" ? p.to : undefined,
      ruleId: sym || undefined,
      proposed: typeof p.proposed === "string" ? p.proposed : undefined
    });
    let items;
    try {
      const parsed = JSON.parse(delegated);
      if (!Array.isArray(parsed))
        return textResult2(`QUERY_DELEGATION_INVALID: verb ${verb} delegation returned non-array`, { ok: false, error: "QUERY_DELEGATION_INVALID", verb });
      items = parsed;
    } catch {
      return textResult2(`QUERY_DELEGATION_INVALID: verb ${verb} delegation unparseable`, { ok: false, error: "QUERY_DELEGATION_INVALID", verb });
    }
    return textResult2(`${popNote}rows=${items.length}
${delegated}`, { ok: true, verb, rows: items.length, items });
  }
  return textResult2(`rows=0`, { ok: true, rows: 0, verb });
}
function registerGiOmpTools(pi, cwdOf) {
  const zstr = () => pi.zod.string();
  const obj = (shape) => pi.zod.object(shape);
  pi.registerTool({
    name: "graph-probe",
    description: "GI-OMP health probe. Returns PROBE_TOOL_OK + session identity. action=wipe is env-gated.",
    parameters: obj({ i: zstr().optional(), echo: zstr().optional(), action: zstr().optional() }),
    execute: async (_id, params, _sig, _upd, ctx) => {
      const p = params && typeof params === "object" ? params : {};
      if (String(p.action ?? "").toLowerCase() === "wipe") {
        if (wipeInFlight) {
          return textResult2("GI_WIPE_INFLIGHT: a wipe is already running \u2014 serialize wipe operations, retry after it completes", { ok: false, error: "GI_WIPE_INFLIGHT" });
        }
        if (process.env.GI_OMP_ALLOW_CLEAR !== "1") {
          return textResult2("GI_CLEAR_REFUSED: action=wipe requires GI_OMP_ALLOW_CLEAR=1 in the environment", { ok: false, error: "GI_CLEAR_REFUSED" });
        }
        wipeInFlight = true;
        try {
          try {
            const wipeAudit = graphProbeWipeAudited(ctx, cwdOf);
            if (!wipeAudit.audited) {
              return textResult2(`WIPE_AUDIT_FAILED
${wipeAudit.text}`, { ok: false, error: "WIPE_AUDIT_FAILED", wipeAudited: false });
            }
            clearGiRegistry();
            return textResult2("GI_CLEARED", { ok: true, token: "GI_CLEARED", wipeAudited: true });
          } finally {
            wipeInFlight = false;
          }
        } catch (e) {
          let code = "GI_CLEAR_REFUSED";
          const c = e?.code;
          if (typeof c === "string" && c.length > 0)
            code = c;
          return textResult2(`${code}: ${String(e)}`, { ok: false, error: code });
        }
      }
      const sid = resolveSessionId(ctx, process.env);
      const sessionID = sid.id;
      return textResult2(JSON.stringify({ token: "PROBE_TOOL_OK", sessionID, sessionIDSource: sid.source, echo: p.echo ?? null }), { ok: true, token: "PROBE_TOOL_OK", sessionID, sessionIDSource: sid.source });
    }
  });
  pi.registerTool({
    name: "graph-query",
    description: "Parse-grade GI query against THIS session store only. Verbs: who-calls, blast-radius, would-break, unwired, chain, impact (upstream closure + depth ledger), safe-delete (callers + reaches + uses + test-reach), gate (STEER/FULL caller advisory), verify (ripwire claim check: calls(A,B) uses(SYM) unused(SYM) contains(FILE,LIT) defines(FILE,SYM) reaches(SYM,FILTER)), must-implement, rule, violations, consistency. Params substrate+targetPath select the graphify leg (explicit absolute targetPath). Every twin verb appends a `ripwire:` cross-check line (store-primary, live-tree ripwire leg named).",
    parameters: obj({
      i: zstr().optional(),
      verb: zstr(),
      target: zstr().optional(),
      symbol: zstr().optional(),
      from: zstr().optional(),
      to: zstr().optional(),
      proposed: zstr().optional(),
      sessionId: zstr().optional(),
      dial: zstr().optional(),
      substrate: zstr().optional(),
      targetPath: zstr().optional()
    }),
    execute: async (_id, params, _sig, _upd, ctx) => {
      const p = params && typeof params === "object" ? params : {};
      const verb = String(p.verb ?? "");
      const verbs = ["who-calls", "blast-radius", "would-break", "unwired", "chain", "impact", "safe-delete", "gate", "verify", "must-implement", "rule", "violations", "consistency"];
      if (!verbs.includes(verb)) {
        return textResult2("QUERY_INVALID: " + verb, { ok: false, error: "QUERY_INVALID" });
      }
      if (["who-calls", "impact", "safe-delete", "gate", "blast-radius", "would-break"].includes(verb) && String(p.target ?? p.symbol ?? "").trim() === "") {
        return textResult2(`QUERY_INVALID: verb '${verb}' requires a non-empty target`, { ok: false, error: "QUERY_INVALID" });
      }
      let callerId = "omp-default-session";
      if (ctx && typeof ctx === "object" && "sessionID" in ctx && typeof ctx.sessionID === "string" && String(ctx.sessionID).length > 0) {
        callerId = String(ctx.sessionID);
      }
      const sessionId = callerId;
      const substrate = typeof p.substrate === "string" ? p.substrate : "";
      const targetPathRaw = typeof p.targetPath === "string" ? p.targetPath : "";
      const callerCtx = ctx && typeof ctx === "object" && "cwd" in ctx ? ctx : undefined;
      let scopeRoot = cwdOf(callerCtx);
      const callerCwd = scopeRoot;
      if (targetPathRaw.length > 0) {
        if (!path40.isAbsolute(targetPathRaw)) {
          return textResult2(`GI_PATH_DENIED: targetPath must be absolute, got '${targetPathRaw.slice(0, 120)}'`, { ok: false, error: "GI_PATH_DENIED" });
        }
        const confined = confineTargetPath(path40.normalize(targetPathRaw), callerCwd);
        if (!confined.ok) {
          return textResult2(confined.error, { ok: false, error: "GI_PATH_DENIED" });
        }
        scopeRoot = confined.real;
      } else {
        const defaultConfined = confineTargetPath(callerCwd, callerCwd);
        if (!defaultConfined.ok) {
          return textResult2(defaultConfined.error, { ok: false, error: "GI_PATH_DENIED" });
        }
        scopeRoot = defaultConfined.real;
      }
      try {
        const opened = openSessionStore({ sessionId, scopeRoot, callerSessionId: callerId });
        if (substrate === "graphify") {
          const graphPath = graphifyOutPath(scopeRoot);
          const fresh = isGraphifyCheckoutFreshFor(scopeRoot, graphPath);
          if (!fresh.fresh) {
            const reason = `GRAPHIFY_NOT_WARM:${fresh.reason}`;
            return textResult2(`${reason}: no warm graphify graph at ${graphPath} (rebuild with: bun scripts/graphify-build.ts --target '${scopeRoot}')`, { ok: false, error: reason.split(":")[0], reason, graphPath });
          }
          let pop = await withPopulateLane(async () => populateSessionStore(opened.storePath, scopeRoot, "graphify-" + Date.now().toString(36), { substrate: "graphify" }));
          if (pop.skipped || (pop.fallbackReason ?? "").length > 0) {
            pop = await withPopulateLane(async () => populateSessionStore(opened.storePath, scopeRoot, "graphify-" + Date.now().toString(36), { substrate: "graphify" }));
          }
          if (pop.skipped || (pop.fallbackReason ?? "").length > 0) {
            const reason = pop.fallbackReason ?? "GRAPHIFY_NOT_WARM:miss";
            return textResult2(`${reason}: graphify populate missed (graph=${graphPath}; rebuild with: bun scripts/graphify-build.ts --target '${scopeRoot}')`, { ok: false, error: reason.split(":")[0], reason, graphPath });
          }
          const popNote = `substrate=graphify graph=${graphPath} nodes=${pop.nodes} edges=${pop.edges}
`;
          return await runGraphQueryVerbs(verb, p, opened.storePath, scopeRoot, sessionId, popNote, "graphify");
        }
        let popNote = "";
        const pop = await withPopulateLane(async () => {
          if (!substrateNeedsPopulate(opened.storePath, scopeRoot))
            return null;
          return populateSessionStore(opened.storePath, scopeRoot);
        });
        if (pop === null) {
          const storedNow = getMeta(opened.storePath, "substrate") ?? "GI_SUBSTRATE_UNKNOWN";
          popNote = `substrate=${storedNow}
`;
          return await runGraphQueryVerbs(verb, p, opened.storePath, scopeRoot, sessionId, popNote, storedNow);
        }
        popNote = `substrate=${pop.substrate}${pop.fallbackReason ? ` reason=${pop.fallbackReason}` : ""}
`;
        return await runGraphQueryVerbs(verb, p, opened.storePath, scopeRoot, sessionId, popNote, pop.substrate);
      } catch (e) {
        const code = typeof e === "object" && e !== null && "code" in e ? String(e.code) : "GI_QUERY_FAIL";
        return textResult2(`${code}: ${String(e instanceof Error ? e.message : e)}`, { ok: false, error: code });
      }
    }
  });
  createBugHuntTool(pi, { cwdOf });
  const aetherAuditExecute = async (_id, params, _sig, _upd, ctx) => {
    const p = params && typeof params === "object" ? params : {};
    const scopeRoot = cwdOf(ctx && typeof ctx === "object" && "cwd" in ctx ? ctx : undefined);
    const targetRaw = String(p.targetPath ?? "").trim();
    if (targetRaw !== "" && !path40.isAbsolute(targetRaw)) {
      return textResult2(`GI_PATH_DENIED: targetPath must be absolute, got '${targetRaw.slice(0, 120)}'`, { ok: false, error: "GI_PATH_DENIED" });
    }
    let targetRoot;
    if (targetRaw !== "") {
      const confined = confineTargetPath(path40.normalize(targetRaw), scopeRoot);
      if (!confined.ok) {
        return textResult2(confined.error, { ok: false, error: "GI_PATH_DENIED" });
      }
      targetRoot = confined.real;
    } else {
      const confined = confineTargetPath(path40.resolve(scopeRoot), scopeRoot);
      if (!confined.ok) {
        return textResult2(confined.error, { ok: false, error: "GI_PATH_DENIED" });
      }
      targetRoot = confined.real;
    }
    const sanitized = sanitizeLayerId(String(p.template ?? ""));
    if (!sanitized.ok) {
      return textResult2(sanitized.error, { ok: false, error: "HUNTER_TEMPLATE_INVALID" });
    }
    const layerId = sanitized.layerId;
    try {
      const [{ templateByLayerId }, { runTemplateAudit }] = await Promise.all([
        Promise.resolve().then(() => (init_templates2(), exports_templates)),
        Promise.resolve().then(() => (init_auditor(), exports_auditor))
      ]);
      const { join, resolve } = await import("path");
      const template = templateByLayerId(layerId);
      if (!template) {
        return textResult2(`GI_AUDIT_NOT_WIRED: HUNTER_TEMPLATE_INVALID: unknown template '${layerId}' | ripwire: engine-binding=auditor template=invalid`, {
          error: "GI_AUDIT_NOT_WIRED",
          cause: "HUNTER_TEMPLATE_INVALID"
        });
      }
      const targetReal = resolve(targetRoot);
      const auditRoot = join(targetReal, ".omp", "graph-intelligence", "audit");
      const rootRefusal = ensureAuditRoot(targetReal, auditRoot);
      if (rootRefusal !== null) {
        return textResult2(`GI_LEDGER_DENIED: ${rootRefusal}`.slice(0, 200), { ok: false, error: "GI_LEDGER_DENIED" });
      }
      const auditRootReal = fs36.realpathSync(auditRoot);
      const ledgerRel = path40.relative(targetReal, auditRootReal);
      if (ledgerRel === "" || ledgerRel.startsWith("..") || path40.isAbsolute(ledgerRel)) {
        return textResult2("GI_LEDGER_DENIED: audit root is a symlink plant", { ok: false, error: "GI_LEDGER_DENIED" });
      }
      const ledgerDir = fs36.mkdtempSync(join(auditRoot, `${layerId}-`));
      const ledgerReal = fs36.realpathSync(ledgerDir);
      if (!ledgerDirConfined(ledgerReal, targetReal)) {
        return textResult2("GI_LEDGER_DENIED: evidence dir escaped the target root (symlink plant?)", { ok: false, error: "GI_LEDGER_DENIED" });
      }
      const graphPath = join(resolve(targetRoot), "graphify-out", "graph.json");
      const settlement = await runTemplateAudit({ template, ledgerDir, targetRoot, graphPath });
      if (settlement.status === "fulfilled") {
        const reportConfined = settlementLedgerConfined(settlement.ledgerDir, targetReal);
        if (!reportConfined.ok) {
          return textResult2(`GI_LEDGER_DENIED: settlement ledger escaped the root (${reportConfined.error})`, { ok: false, error: "GI_LEDGER_DENIED" });
        }
        const reportPath = join(reportConfined.real, "findings", "report.md");
        return textResult2(`AUDIT_DONE layer=${layerId} findings=${settlement.findings.candidates?.length ?? "?"} reportPath=${reportPath}`, {
          ok: true,
          findings: settlement.findings,
          reportPath,
          layerId
        });
      }
      return textResult2(`GI_AUDIT_NOT_WIRED: ${settlement.error} | ripwire: engine-binding=auditor attempt=real`, {
        ok: false,
        error: "GI_AUDIT_NOT_WIRED",
        cause: settlement.error
      });
    } catch (e) {
      return textResult2(`GI_AUDIT_NOT_WIRED: ${String(e instanceof Error ? e.message : e).slice(0, 300)} | ripwire: engine-binding=auditor attempt=real`, {
        ok: false,
        error: "GI_AUDIT_NOT_WIRED",
        cause: String(e instanceof Error ? e.message : e).slice(0, 300)
      });
    }
  };
  const aetherAuditParams = obj({ i: zstr().optional(), targetPath: zstr().optional(), template: zstr().optional() });
  pi.registerTool({
    name: "aether-code-audit",
    description: "GI-OMP aether code audit over the graphify graph (EN-38 guards intact, fork aether-auditor.ts runLayerHunter contract). Runs one hunter template (default R28-sro-graph) over targetPath's graphify-out/graph.json \u2192 findings + reportPath. Degraded refusal GI_AUDIT_NOT_WIRED only after a real attempt (missing/oversize/unparseable graph, invalid template).",
    parameters: aetherAuditParams,
    execute: aetherAuditExecute
  });
  pi.registerTool({
    name: "graph-code-audit",
    description: "ALIAS of aether-code-audit (pre-rename name, same execute, removal only on operator order).",
    parameters: aetherAuditParams,
    execute: aetherAuditExecute
  });
  const consumptionParams = obj({ i: zstr().optional(), subject: zstr().optional(), scopeRoot: zstr().optional() });
  pi.registerTool({
    name: "gi-consumption",
    description: "THE 6L+2E CONSUMPTION PROBE. Reports `consumed:N/8` over the 8 consumers (6 graph layers L1 SEMANTICA/L2 ARSUMBRIS/L3 UA/L4 C2KG/L5 CORBELL/L6 GRAPHIFY + 2 Jev kernels TSG/ABIDE), each asked for an ANCHORED fact about `subject`. A layer is CONSUMED iff its substrate answers AND it contributed >=1 anchored fact; a wired-but-silent consumer is GI_LAYER_UNCONSUMED; an absent substrate is GI_LAYER_DOWN. NEVER reports a green on file existence alone.",
    parameters: consumptionParams,
    execute: async (_id, params, _sig, _upd, ctx) => {
      const p = params ?? {};
      const callerCwd = cwdOf(ctx);
      const rawRoot = p.scopeRoot && p.scopeRoot.length > 0 ? p.scopeRoot : callerCwd;
      const confined = confineTargetPath(path40.normalize(rawRoot), callerCwd);
      if (!confined.ok) {
        return textResult2(`GI_PATH_DENIED: ${confined.error}`, { ok: false, error: "GI_PATH_DENIED" });
      }
      const root = confined.real;
      const subject = p.subject && p.subject.length > 0 ? p.subject : "populateSessionStore";
      try {
        const audit = consumptionAudit(root, subject);
        const lines = audit.reports.map((r) => `${r.consumer}	${r.verdict}	rung=${r.rung}	facts=${r.factsReturned}`);
        return textResult2(`${audit.summary}
subject=${subject}
scopeRoot=${root}
${lines.join(`
`)}`, { ok: audit.influenced.length > 0, summary: audit.summary, influenced: audit.influenced, offenders: audit.offenders, consumers: SIX_L2E_CONSUMERS });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return textResult2(`GI_CONSUMPTION_FAILED: ${msg}`, { ok: false, error: "GI_CONSUMPTION_FAILED" });
      }
    }
  });
  const decideParams = obj({
    i: zstr().optional(),
    subject: zstr().optional(),
    scopeRoot: zstr().optional(),
    target: zstr().optional(),
    toolName: zstr().optional(),
    queriedBefore: zstr().optional(),
    claims: zstr().optional()
  });
  pi.registerTool({
    name: "gi-decide",
    description: "THE 6L+2E DECISION. Runs the KERNEL over the layer REGISTRY: the registry's 6 graph layers become the kernel's PREFLIGHT declarations, its ANCHORED facts become the certifications the detectors read, and the kernel returns the verdict (ALLOW/STEER/REFUSE/ABORT) with the class (dumb/theatrical/destructive/benign). A layer DOWN refuses the stack with `GI_STACK_INCOMPLETE:<id>` \u2014 never an empty pass. The decision consults the REGISTRY, never a raw store.",
    parameters: decideParams,
    execute: async (_id, params, _sig, _upd, ctx) => {
      const p = params ?? {};
      const callerCwd = cwdOf(ctx);
      const rawRoot = p.scopeRoot && p.scopeRoot.length > 0 ? p.scopeRoot : callerCwd;
      const confined = confineTargetPath(path40.normalize(rawRoot), callerCwd);
      if (!confined.ok) {
        return textResult2(`GI_PATH_DENIED: ${confined.error}`, { ok: false, error: "GI_PATH_DENIED" });
      }
      const root = confined.real;
      const subject = p.subject && p.subject.length > 0 ? p.subject : "populateSessionStore";
      try {
        const fireTarget = p.target && p.target.length > 0 ? p.target : subject;
        const fire = decideFireFromGraph(root, fireTarget, "consume");
        const recordSink = (run) => {
          const band = run.verdict === "REFUSE" || run.verdict === "ABORT" ? "act" : run.verdict === "STEER" ? "escalate" : "ignore";
          const action = band === "act" ? "FIRE" : band === "escalate" ? "ESCALATE" : "IGNORE";
          const row = {
            at: new Date().toISOString(),
            ruleId: `kernel-v2:${run.class}:${run.verdict}`,
            cls: run.class,
            questionVersion: "kernel-v2",
            probability: band === "act" ? 1 : band === "escalate" ? 0.5 : 0,
            band,
            action,
            policyName: `kernel-v2.${run.class}`,
            actThreshold: 0.5,
            flagThreshold: 0.25,
            stateHash: (run.reason || run.evidence || "kernel-v2").slice(0, 16),
            target: fireTarget,
            costUsd: 0,
            laterTruth: "unresolved"
          };
          fire.ledger.append(row);
        };
        let callClaims = [];
        if (typeof p.claims === "string" && p.claims.trim().length > 0) {
          try {
            callClaims = JSON.parse(p.claims);
          } catch {
            callClaims = [];
          }
        }
        const ev = decideFromRegistry(root, subject, {
          toolName: p.toolName && p.toolName.length > 0 ? p.toolName : "gi-decide",
          target: fireTarget,
          queriedBefore: p.queriedBefore === "true",
          claims: callClaims
        }, recordSink);
        const stageLines = ev.run.stages.map((s) => `  stage ${s.stage} ${s.name}	${s.outcome}	${s.detail}`);
        const fireLines = fire.verdicts.map((v) => `  ${v.rule}	settles=${v.settles}	action=${v.action ?? "none"}	${v.reason}`);
        return textResult2(`verdict=${ev.run.verdict}	class=${ev.run.class}	code=${ev.run.code ?? "none"}
subject=${subject}
scopeRoot=${root}
layersWired=${ev.layersWired}/${ev.consumersTotal}
influenced=${ev.influenced.join(",") || "none"}
reason=${ev.run.reason}
${stageLines.join(`
`)}
graph: store=${fire.storePath}	settles=${fire.settles}	fires=${fire.fires}	policy=${fire.policyCount}@${fire.policySource}	ledger=${fire.ledgerPath}
${fireLines.join(`
`)}`, { ok: ev.run.verdict === "ALLOW", verdict: ev.run.verdict, class: ev.run.class, code: ev.run.code, layersWired: ev.layersWired, influenced: ev.influenced, graphSettles: fire.settles, graphFires: fire.fires, policyCount: fire.policyCount });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return textResult2(`GI_DECIDE_FAILED: ${msg}`, { ok: false, error: "GI_DECIDE_FAILED" });
      }
    }
  });
  return [...GI_TOOL_NAMES];
}
function giOmpExtension(pi) {
  const names = registerGiOmpTools(pi, (ctx) => ctx?.cwd ?? process.cwd());
  if (typeof pi.on === "function") {
    registerGraphGate(pi);
    attachClaimFirewall(pi);
    try {
      attachCardHud(pi);
    } catch {}
  }
  console.error("[gi-omp] registered " + names.join(", "));
}
export {
  GI_TOOL_NAMES,
  GI_TOOL_NAMES_ALIASES,
  giOmpExtension as default,
  ensureAuditRoot,
  graphProbeWipeAudited,
  ledgerDirConfined,
  parseTargetRoots,
  registerGiOmpTools,
  settlementLedgerConfined,
  substrateNeedsPopulate,
  writeWipeAudit
};
