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
var __require = import.meta.require;

// ../../OMP/Graph_Intelligence/node_modules/xstate/dist/xstate-dev.development.cjs.js
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

// ../../OMP/Graph_Intelligence/node_modules/xstate/dist/raise-6dbf7d60.development.cjs.js
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

// ../../OMP/Graph_Intelligence/node_modules/xstate/dist/xstate-actors.development.cjs.js
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

// ../../OMP/Graph_Intelligence/node_modules/xstate/dist/assign-22c2f2aa.development.cjs.js
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

// ../../OMP/Graph_Intelligence/node_modules/xstate/dist/StateMachine-d4a4d688.development.cjs.js
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

// ../../OMP/Graph_Intelligence/node_modules/xstate/dist/log-dc444aec.development.cjs.js
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

// ../../OMP/Graph_Intelligence/node_modules/xstate/dist/xstate.development.cjs.js
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
var NODE_TYPES, PREDICATES, ALL_PREDICATES, NODE_TYPES_SET, PREDICATE_SET;
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
  PREDICATE_SET = new Set(ALL_PREDICATES);
});

// ../../OMP/Graph_Intelligence/node_modules/typescript/package.json
var require_package = __commonJS(function(exports, module) {
  module.exports = {
    name: "typescript",
    version: "7.0.2",
    license: "Apache-2.0",
    author: "Microsoft Corp.",
    homepage: "https://www.typescriptlang.org/",
    description: "TypeScript is a language for application scale JavaScript development",
    keywords: [
      "TypeScript",
      "Microsoft",
      "compiler",
      "language",
      "javascript"
    ],
    bugs: {
      url: "https://github.com/microsoft/TypeScript/issues"
    },
    repository: {
      type: "git",
      url: "https://github.com/microsoft/TypeScript.git"
    },
    type: "module",
    preferUnplugged: true,
    engines: {
      node: ">=16.20.0"
    },
    files: [
      "bin",
      "lib",
      "dist",
      "vendor",
      "NOTICE.txt"
    ],
    bin: {
      tsc: "./bin/tsc"
    },
    exports: {
      "./package.json": "./package.json",
      ".": "./lib/version.cjs",
      "./unstable/sync": "./dist/api/sync/api.js",
      "./unstable/async": "./dist/api/async/api.js",
      "./unstable/fs": "./dist/api/fs.js",
      "./unstable/proto": "./dist/api/proto.js",
      "./unstable/ast": "./dist/ast/index.js",
      "./unstable/ast/is": "./dist/ast/is.js",
      "./unstable/ast/factory": "./dist/ast/factory.generated.js",
      "./unstable/ast/utils": "./dist/ast/utils.js",
      "./unstable/ast/scanner": "./dist/ast/scanner.js",
      "./unstable/ast/visitor": "./dist/ast/visitor.js",
      "./unstable/ast/clone": "./dist/ast/clone.js"
    },
    imports: {
      "#getExePath": "./lib/getExePath.js",
      "#enums/*": {
        types: "./dist/enums/*.enum.d.ts",
        default: "./dist/enums/*.js"
      },
      "#vscode-jsonrpc/node": "./vendor/vscode-jsonrpc/lib/node/main.js"
    },
    gitHead: "2bd066d87f5bafd315be9f40889d0a60b9e58e0b",
    publishConfig: {
      access: "public",
      tag: "latest"
    },
    optionalDependencies: {
      "@typescript/typescript-win32-x64": "7.0.2",
      "@typescript/typescript-win32-arm64": "7.0.2",
      "@typescript/typescript-linux-x64": "7.0.2",
      "@typescript/typescript-linux-arm": "7.0.2",
      "@typescript/typescript-linux-arm64": "7.0.2",
      "@typescript/typescript-darwin-x64": "7.0.2",
      "@typescript/typescript-darwin-arm64": "7.0.2",
      "@typescript/typescript-aix-ppc64": "7.0.2",
      "@typescript/typescript-freebsd-arm64": "7.0.2",
      "@typescript/typescript-freebsd-x64": "7.0.2",
      "@typescript/typescript-linux-loong64": "7.0.2",
      "@typescript/typescript-linux-mips64el": "7.0.2",
      "@typescript/typescript-linux-ppc64": "7.0.2",
      "@typescript/typescript-linux-riscv64": "7.0.2",
      "@typescript/typescript-linux-s390x": "7.0.2",
      "@typescript/typescript-netbsd-arm64": "7.0.2",
      "@typescript/typescript-netbsd-x64": "7.0.2",
      "@typescript/typescript-openbsd-arm64": "7.0.2",
      "@typescript/typescript-openbsd-x64": "7.0.2",
      "@typescript/typescript-sunos-x64": "7.0.2"
    }
  };
});

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/core/core.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/core/util.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/core/errors.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/core/parse.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/core/regexes.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/core/checks.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/core/doc.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/core/versions.js
var version2;
var init_versions = __esm(() => {
  version2 = {
    major: 4,
    minor: 1,
    patch: 8
  };
});

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/core/schemas.js
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
    inst._zod.version = version2;
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/locales/en.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/locales/index.js
var init_locales = () => {};

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/core/registries.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/core/api.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/core/to-json-schema.js
var init_to_json_schema = () => {};

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/core/json-schema.js
var init_json_schema = () => {};

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/core/index.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/classic/checks.js
var init_checks2 = __esm(() => {
  init_core2();
});

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/classic/iso.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/classic/errors.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/classic/parse.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/classic/schemas.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/classic/compat.js
var ZodFirstPartyTypeKind;
var init_compat = __esm(() => {
  (function(ZodFirstPartyTypeKind) {})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
});

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/classic/coerce.js
var init_coerce = () => {};

// ../../OMP/Graph_Intelligence/node_modules/zod/v4/classic/external.js
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

// ../../OMP/Graph_Intelligence/node_modules/zod/index.js
var init_zod = __esm(() => {
  init_external();
  init_external();
});

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
var candidateWithContract, MpseContractConformanceSchema, MpseContractOutputSchema, mpseContractTemplate, MpseOracleConformanceSchema, MpseOracleOutputSchema, mpseOracleTemplate, MpseStageConformanceSchema, MpseStageOutputSchema, mpseStageTemplate, TraceGapSchema, ProvenanceConformanceSchema, MpseProvenanceOutputSchema, mpseProvenanceTemplate, MPSE_TEMPLATES;
var init_mpse = __esm(() => {
  init_zod();
  init_types();
  candidateWithContract = LayerCandidateSchema.extend({
    contractId: string2().optional(),
    implementationStatus: _enum(["conformant", "violated", "unimplemented"]).optional()
  });
  MpseContractConformanceSchema = object({
    contractId: string2().min(1),
    specPath: string2().min(1),
    specLine: number2().int().positive(),
    specQuote: string2().min(1),
    implementationStatus: _enum(["conformant", "violated", "unimplemented"]),
    file: string2().optional(),
    line: number2().int().positive().optional(),
    evidence: string2().optional()
  });
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
  MpseOracleConformanceSchema = object({
    contractId: string2().min(1),
    specPath: string2().min(1),
    specLine: number2().int().positive(),
    specQuote: string2().min(1),
    implementationStatus: _enum(["conformant", "violated", "unimplemented"]),
    file: string2().optional(),
    line: number2().int().positive().optional(),
    evidence: string2().optional(),
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
  MpseStageConformanceSchema = object({
    contractId: string2().min(1),
    specPath: string2().min(1),
    specLine: number2().int().positive(),
    specQuote: string2().min(1),
    implementationStatus: _enum(["conformant", "violated", "unimplemented"]),
    file: string2().optional(),
    line: number2().int().positive().optional(),
    evidence: string2().optional()
  });
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
  TraceGapSchema = object({
    contractId: string2().min(1),
    specPath: string2().min(1),
    specLine: number2().int().positive(),
    specQuote: string2().min(1),
    implementationStatus: literal("unimplemented"),
    file: string2().optional(),
    line: number2().int().positive().optional(),
    evidence: string2().min(1),
    gapReason: string2().min(1).optional()
  });
  ProvenanceConformanceSchema = object({
    contractId: string2().min(1),
    specPath: string2().min(1),
    specLine: number2().int().positive(),
    specQuote: string2().min(1),
    implementationStatus: _enum(["conformant", "violated", "unimplemented"]),
    file: string2().optional(),
    line: number2().int().positive().optional(),
    evidence: string2().optional()
  });
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
    filterTags: ["spec-clause", "trace"],
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
var init_templates = __esm(() => {
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
  BY_LAYER_ID = {};
  for (const t of ALL_TEMPLATES)
    BY_LAYER_ID[t.layerId] = t;
});

// src/hunter/shared/kind-for-layer.ts
function kindForLayer(layerId) {
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
import fs21 from "fs";
import path24 from "path";
function parseGraphJson(contents, size) {
  const byteLen = size > 0 ? size : Buffer.byteLength(contents, "utf-8");
  if (byteLen > GRAPH_LOAD_BUDGET_BYTES2) {
    throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${byteLen} bytes (> ${GRAPH_LOAD_BUDGET_BYTES2} budget). Fix: scope/extract a subtree or lower the graph cardinality.`);
  }
  return JSON.parse(contents);
}
function normalizeGraph(raw) {
  const rawNodes = raw["nodes"] ?? [];
  const rawLinks = raw["links"] ?? raw["edges"] ?? [];
  const nodes = rawNodes.map((n) => {
    const r = n;
    return {
      id: String(r["id"] ?? r["label"] ?? ""),
      label: String(r["label"] ?? r["id"] ?? ""),
      type: String(r["file_type"] ?? r["type"] ?? "unknown"),
      file: String(r["source_file"] ?? r["file"] ?? ""),
      data: r
    };
  });
  const edges = rawLinks.map((e) => {
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
  const resolved = path24.resolve(graphPath);
  let stat;
  try {
    stat = fs21.statSync(resolved);
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
    raw = parseGraphJson(fs21.readFileSync(resolved, "utf-8"), gSize);
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
  constructor(mcp) {
    this.mcp = mcp ?? null;
  }
  async load(graphPath) {
    const g = await readGraphJson(graphPath);
    this.lastGraphPath = path24.resolve(graphPath);
    return g;
  }
  async query(graph, question) {
    if (!graph || !Array.isArray(graph.nodes))
      throw new Error("GRAPHIFY_QUERY_INVALID: graph required");
    if (typeof question !== "string" || question.trim() === "")
      throw new Error("GRAPHIFY_QUERY_INVALID: question must be non-empty");
    if (this.mcp?.isConnected()) {
      try {
        const raw = await this.mcp.callTool("query_graph", { question });
        String(raw);
        const matched = graph.nodes.filter((n) => question.toLowerCase().split(/\s+/).some((tok) => tok.length > 2 && (n.label.toLowerCase().includes(tok) || n.id.toLowerCase().includes(tok))));
        const relatedEdges = graph.edges.filter((e) => matched.some((m) => m.id === e.src || m.id === e.dst));
        if (matched.length > 0)
          return { nodes: matched, edges: relatedEdges, query: question };
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
    if (this.mcp?.isConnected()) {
      try {
        String(await this.mcp.callTool("shortest_path", { source: from, target: to }));
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
    const queue = [[fromId]];
    const visited = new Set([fromId]);
    while (queue.length > 0) {
      const cur = queue.shift();
      const last = cur[cur.length - 1];
      if (last === toId)
        return { from, to, hops: cur, length: cur.length - 1 };
      for (const nb of adj.get(last) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push([...cur, nb]);
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
    if (this.mcp?.isConnected()) {
      try {
        String(await this.mcp.callTool("get_node", { label: concept }));
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
        const key = `${e.src}\u2192${e.dst}:${e.relation}`;
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
import fs22 from "fs";
import path25 from "path";
import { execFile } from "child_process";
import { promisify } from "util";
function realResolve(p) {
  const resolved = path25.resolve(p);
  try {
    return fs22.realpathSync(resolved);
  } catch {
    try {
      return path25.join(fs22.realpathSync(path25.dirname(resolved)), path25.basename(resolved));
    } catch {
      return resolved;
    }
  }
}
function isWithinRoot(realPath, realRoot) {
  return realPath === realRoot || realPath.startsWith(realRoot + path25.sep);
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
      const rootReal = realResolve(path25.resolve(targetRoot));
      const resolved = path25.isAbsolute(filePath) ? path25.resolve(filePath) : path25.resolve(targetRoot, filePath);
      const realFile = realResolve(resolved);
      if (!isWithinRoot(realFile, rootReal) && realFile !== rootReal) {
        return `${READ_SCOPE_VIOLATION}: read outside targetRoot ${filePath}`;
      }
      try {
        const size = fs22.statSync(realFile).size;
        if (size > 8 * 1024 * 1024)
          return `READ_TOO_LARGE: ${size} bytes > 8MiB window cap (narrow offset/limit)`;
        const lines = fs22.readFileSync(realFile, "utf-8").split(`
`);
        const start = Math.max(0, offset);
        const slice = lines.slice(start, Math.min(lines.length, start + limit));
        const truncated = start + limit < lines.length;
        return slice.join(`
`) + (truncated ? `
[TRUNCATED]` : "");
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
      const maxResults = Math.min(typeof params.maxResults === "number" ? params.maxResults : GREP_CAP, GREP_CAP);
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
      let out = await run("rg", ["-n", "--max-count", String(maxResults), "--", pattern, targetRoot]);
      if (out.startsWith("SEARCH_FAILED") || out.length === 0) {
        out = await run("grep", ["-rn", "-E", "-m", String(maxResults), "--", pattern, targetRoot]);
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
      const pinnedReal = realResolve(path25.resolve(pinnedPath));
      if (attempted !== "") {
        const attemptedReal = realResolve(path25.resolve(attempted));
        if (attemptedReal !== pinnedReal) {
          return JSON.stringify({ error: GRAPH_TOOL_VIOLATION, detail: `path ${attemptedReal} != pinned ${pinnedReal}`, recorded: true });
        }
      }
      const ledgerReal = realResolve(path25.resolve(ledgerDir));
      if (!isWithinRoot(pinnedReal, ledgerReal) && pinnedReal !== ledgerReal) {
        return JSON.stringify({ error: WRITE_SCOPE_VIOLATION, detail: "pinned target outside ledger", recorded: true });
      }
      try {
        fs22.mkdirSync(path25.dirname(pinnedReal), { recursive: true });
        const content = String(params.content ?? "");
        fs22.writeFileSync(pinnedReal, content, "utf-8");
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
      const splicePath = path25.join(path25.resolve(ledgerDir), "evidence", "typed-edges.jsonl");
      fs22.mkdirSync(path25.dirname(splicePath), { recursive: true });
      fs22.appendFileSync(splicePath, JSON.stringify(row) + `
`, "utf-8");
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
  const reportPath = path25.join(path25.resolve(ledgerDir), "findings", "report.md");
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
    stat = fs22.statSync(reportPath);
  } catch {
    throw new Error("HUNTER_NO_REPORT: " + reportPath);
  }
  const raw = fs22.readFileSync(reportPath, "utf-8");
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
  const rel = raw.replace(/^\.\//, "");
  if (rel && !path25.isAbsolute(rel))
    return rel;
  if (rel)
    return path25.relative(targetRoot, rel) || rel;
  return "";
}
function sourceLineQuote(targetRoot, relFile, line) {
  try {
    const abs = path25.resolve(targetRoot, relFile);
    const rootReal = realResolve(path25.resolve(targetRoot));
    const realFile = realResolve(abs);
    if (!isWithinRoot(realFile, rootReal) && realFile !== rootReal)
      return "";
    const lines = fs22.readFileSync(realFile, "utf-8").split(`
`);
    return (lines[line - 1] ?? "").trim().slice(0, 300);
  } catch {
    return "";
  }
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
      const localVisited = new Set;
      for (const seedOfComp of comp) {
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
      return [confirmedEmpty(anchor, template.layerId, `dead-code sweep INCOMPLETE: ${probeFailures} node probe(s) failed (first: ${probeFailureReason}) \u2014 no dead-code verdict possible from a failed sweep`, firstNodeFile)];
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
        const realHit = realResolve(path25.isAbsolute(hitPath) ? hitPath : path25.resolve(targetRoot, hitPath));
        contained = isWithinRoot(realHit, realResolve(path25.resolve(targetRoot)));
        if (contained)
          hitPath = realHit;
      } catch {
        contained = false;
      }
    }
    const rel = flm && contained ? path25.relative(targetRoot, hitPath) || hitPath : firstNodeFile;
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
    return [confirmedEmpty(anchor, template.layerId, `probe INCOMPLETE: ${hit.slice(0, 140)} \u2014 no verdict possible from a failed probe`, firstNodeFile)];
  }
  return [confirmedEmpty(anchor, template.layerId, measured, firstNodeFile)];
}
function assertGraphShape(graph) {
  if (graph === null || typeof graph !== "object")
    throw new Error("GRAPHIFY_EXTRACT_FAILED: graph.json did not parse to an object");
  const g = graph;
  if (!Array.isArray(g.nodes))
    throw new Error("GRAPHIFY_EXTRACT_FAILED: graph.json missing a nodes[] array");
  if (!Array.isArray(g.edges))
    throw new Error("GRAPHIFY_EXTRACT_FAILED: graph.json missing an edges[] array");
  return { nodes: g.nodes, edges: g.edges };
}
async function runTemplateAudit(args) {
  const t0 = Date.now();
  const template = args.template;
  const layerId = template?.layerId ?? "unknown";
  const ledgerDir = path25.resolve(args.ledgerDir ?? "");
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
  const targetRoot = path25.resolve(args.targetRoot);
  if (!fs22.existsSync(targetRoot)) {
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
    fs22.mkdirSync(ledgerDir, { recursive: true });
  } catch (e) {
    return { layerId, status: "rejected", error: "HUNTER_LEDGER_MKDIR_FAILED: " + String(e.message ?? e).slice(0, 400), ledgerDir, durationMs: Date.now() - t0 };
  }
  const brief = [
    `# HUNT BRIEF \u2014 ${layerId}`,
    `- anchorPredicate: ${template.anchorPredicate}`,
    `- layerNumber: ${template.layerNumber}`,
    `- targetRoot: ${targetRoot}`,
    `- graphPath: ${path25.resolve(args.graphPath)}`,
    `- graph: ${graph.nodes.length} nodes / ${graph.edges.length} edges / godNodes [${graph.godNodes ?? [].slice(0, 5).join(", ")}]`,
    `- graphQueries: ${(template.graphQueries ?? []).join(" | ")}`,
    `- inputData: ${args.inputData ?? ""}`,
    "",
    template.staticPrompt,
    ""
  ].join(`
`);
  try {
    fs22.writeFileSync(path25.join(ledgerDir, "brief.md"), brief, "utf-8");
  } catch (e) {
    return { layerId, status: "rejected", error: "HUNTER_BRIEF_WRITE_FAILED: " + String(e.message ?? e).slice(0, 400), ledgerDir, durationMs: Date.now() - t0 };
  }
  const reader = new GraphifyMapReader(args.client ?? null);
  let sliceNote = "";
  try {
    const q0 = (template.graphQueries ?? [])[0] ?? template.anchorPredicate;
    const slice = await reader.query(graph, q0);
    calls.count += 1;
    calls.names.push("graph-query");
    sliceNote = `graphSlice query "${q0}" \u2192 ${slice.nodes.length} nodes / ${slice.edges.length} edges`;
  } catch (e) {
    errors.push("GRAPH_SLICE_FAILED: " + String(e.message).slice(0, 200));
    sliceNote = "graphSlice unavailable (see errors)";
  }
  let swept;
  try {
    swept = await sweep(template, graph, targetRoot, belt, calls);
  } catch (e) {
    return { layerId, status: "rejected", error: "HUNTER_SWEEP_FAILED: " + String(e.message ?? e).slice(0, 400), ledgerDir, durationMs: Date.now() - t0 };
  }
  const blocks = swept.map((c) => [
    `## FINDING: ${c.subject}`,
    `- layer: ${layerId}`,
    `- predicate: ${c.predicate}`,
    `- object: Contract`,
    `- file: ${c.file}:${c.line}`,
    `- evidence: "${c.evidence.replace(/"/g, "'")}"`,
    `- spec: ${c.spec}`,
    `- severity: ${c.severity}`,
    `- confidence: ${c.confidence}`
  ].join(`
`)).join(`

`);
  const summary = `${layerId}: ${swept.length} finding(s) \u2014 ${swept[0]?.subject ?? "no findings"}. ${sliceNote}.`;
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
        severity: c.severity
      });
      calls.count += 1;
      calls.names.push("graph_tag");
    } catch (e) {
      errors.push("GRAPH_TAG_FAILED: " + String(e.message).slice(0, 200));
    }
  }
  const reportPath = path25.join(ledgerDir, "findings", "report.md");
  try {
    const st = fs22.statSync(reportPath);
    const REPORT_MTIME_SLACK_MS = 100;
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
  init_ontology();
  init_map_reader();
  execFileAsync = promisify(execFile);
  MD_REQUIRED_FIELDS = ["predicate", "file", "evidence", "spec"];
});

// src/omp/extension.ts
import * as fs23 from "fs";
import * as path26 from "path";

// src/omp/typed-write.ts
import * as fs2 from "fs";
import * as path4 from "path";
import { Database as Database2 } from "bun:sqlite";
// src/scoping/db-path.ts
import * as os from "os";
import * as path from "path";
function makeDbPath(spec) {
  return function dbPath() {
    for (const env of spec.envVars) {
      const v = process.env[env];
      if (v && v.trim().length > 0)
        return path.join(v.trim(), spec.fileName);
    }
    if (process.env.BUN_TEST === "1" && spec.testFile) {
      return spec.testFile.startsWith("/") ? spec.testFile : path.join(os.tmpdir(), spec.testFile);
    }
    let dir = spec.defaultDir;
    if (dir.startsWith("~/")) {
      dir = path.join(process.env.HOME ?? process.env.USERPROFILE ?? ".", dir.slice(2));
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
    fresh.exec("PRAGMA busy_timeout = 5000;");
  } catch (_nonfatal) {}
  if (opts?.schema?.length) {
    for (let attempt = 0;attempt < 3; attempt++) {
      try {
        for (const stmt of opts.schema)
          fresh.run(stmt);
        break;
      } catch (e) {
        if (attempt === 2) {
          console.error(`[scoped-store${opts.id ? " " + opts.id : ""}] schema setup failed after 3 attempts:`, e instanceof Error ? e.message : String(e));
          break;
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
function upsertRow(table, pkColumn, pk, dataJson, extra) {
  const cols = extra ? Object.keys(extra) : [];
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
import * as path3 from "path";
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
  assertSessionStorePath(p);
  return p;
}
function assertSessionStorePath(p) {
  const norm = p.replace(/\\/g, "/");
  if (isGlobalHomeGraph(norm)) {
    throw new GiPathError("GI_GLOBAL_HOME_GRAPH", `GI_GLOBAL_HOME_GRAPH: session store must not be ${norm}`);
  }
  if (!SESSION_STORE_RE.test(norm)) {
    throw new GiPathError("GI_SHARED_PROJECT_STORE", `GI_SHARED_PROJECT_STORE: path must include /sessions/{sid24}/store.sqlite, got ${p}`);
  }
}
function isGlobalHomeGraph(norm) {
  const home = (process.env.HOME ?? os2.homedir()).replace(/\\/g, "/");
  const banned = path3.posix.join(home, ".omp/graph-intelligence/store.sqlite");
  return norm === banned;
}
// src/omp/typed-write.ts
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
  `CREATE TABLE IF NOT EXISTS typed_nodes (
    id INTEGER PRIMARY KEY,
    canonical_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    label TEXT NOT NULL,
    file TEXT,
    line INTEGER,
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
  `CREATE TABLE IF NOT EXISTS gi_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`
];
var SQLITE_MAGIC = Buffer.from("SQLite format 3");
function getMeta(storePath, key) {
  const db = openTypedStore(storePath);
  try {
    const row = db.query("SELECT value FROM gi_meta WHERE key = ?").get(key);
    return row?.value ?? null;
  } finally {
    db.close();
  }
}
function setMeta(storePath, key, value) {
  const db = openTypedStore(storePath);
  try {
    db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
  } finally {
    db.close();
  }
}
function openTypedStore(storePath) {
  assertSessionStorePath(storePath);
  fs2.mkdirSync(path4.dirname(storePath), { recursive: true });
  if (!fs2.existsSync(storePath) || fs2.statSync(storePath).size === 0) {} else {
    const head = Buffer.alloc(16);
    const fd = fs2.openSync(storePath, "r");
    try {
      fs2.readSync(fd, head, 0, 16, 0);
    } finally {
      fs2.closeSync(fd);
    }
    if (!head.subarray(0, SQLITE_MAGIC.length).equals(SQLITE_MAGIC)) {
      throw new GiStoreCorruptError(`GI_STORE_CORRUPT: ${storePath}`);
    }
  }
  const db = new Database2(storePath, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  for (const stmt of TYPED_STORE_DDL) {
    try {
      db.run(stmt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("UNIQUE")) {
        console.error(`[gi-omp] DDL note: UNIQUE index deferred (legacy duplicate rows) \u2014 ${msg.slice(0, 120)}`);
        continue;
      }
      throw e;
    }
  }
  return db;
}
function insertForkNodesBatch(db, nodes) {
  if (db.inTransaction !== true) {
    throw new Error("GI_TXN_REQUIRED: insertForkNodesBatch outside a transaction (mid-batch failure would leave a half-store)");
  }
  for (const node of nodes) {
    db.run("UPDATE typed_nodes SET superseded_run = ? WHERE canonical_id = ? AND superseded_run IS NULL", [node.run, node.canonicalId]);
    db.run("INSERT INTO typed_nodes (canonical_id, kind, label, file, line, created_run, superseded_run) VALUES (?, ?, ?, ?, ?, ?, NULL)", [node.canonicalId, node.kind, node.label, node.file, node.line, node.run]);
  }
}
function insertForkEdgesBatch(db, edges) {
  if (db.inTransaction !== true) {
    throw new Error("GI_TXN_REQUIRED: insertForkEdgesBatch outside a transaction (mid-batch failure would leave a half-store)");
  }
  for (const edge of edges) {
    db.run("UPDATE typed_edges SET superseded_run = ? WHERE src_canonical = ? AND dst_canonical = ? AND predicate = ? AND superseded_run IS NULL", [edge.run, edge.srcCanonical, edge.dstCanonical, edge.predicate]);
    db.run("INSERT INTO typed_edges (src_canonical, dst_canonical, predicate, evidence_quote, confidence, created_run, superseded_run) VALUES (?, ?, ?, ?, ?, ?, NULL)", [edge.srcCanonical, edge.dstCanonical, edge.predicate, edge.evidence, typeof edge.confidence === "number" && Number.isFinite(edge.confidence) ? edge.confidence : 1, edge.run]);
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
  const rows = db.query("SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL").all(label);
  return rows.map((r) => r.canonical_id);
}
function ph(n) {
  return Array.from({ length: n }, () => "?").join(", ");
}
function whoCalls(storePath, name) {
  const db = openTypedStore(storePath);
  try {
    const ids = resolveLiveIds(db, name);
    if (ids.length === 0)
      return { rows: 0, names: [], callers: [] };
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
    return { rows: mapped.length, names: mapped.map((r) => r.caller), callers: mapped };
  } finally {
    db.close();
  }
}
function blastRadius(storePath, symbol, depth = 8) {
  const db = openTypedStore(storePath);
  try {
    const ids = resolveLiveIds(db, symbol);
    if (ids.length === 0)
      return { root: symbol, depth: 0, nodes: [] };
    const rows = db.query(`WITH RECURSIVE blast(cid, depth) AS (
         SELECT canonical_id, 0 FROM typed_nodes WHERE canonical_id IN (${ph(ids.length)})
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
       GROUP BY n.file`).all(...ids, depth);
    const nodes = rows.map((r) => ({ file: r.file, depth: Number(r.depth) }));
    const maxDepth = nodes.reduce((m, n) => n.depth > m ? n.depth : m, 0);
    return { root: symbol, depth: maxDepth, nodes };
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
function chainCalls(storePath, from, to, maxDepth = 64) {
  const db = openTypedStore(storePath);
  try {
    const starts = db.query("SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL").all(from);
    const targets = db.query("SELECT DISTINCT label FROM typed_nodes WHERE label = ? AND superseded_run IS NULL").all(to);
    const toSet = new Set(targets.map((r) => r.label));
    const visited = new Set(starts.map((s) => s.canonical_id));
    const queue = starts.map((s) => ({ id: s.canonical_id, steps: [] }));
    let head = 0;
    while (head < queue.length && queue[head].steps.length < maxDepth) {
      const cur = queue[head++];
      const out = db.query(`SELECT dst.canonical_id AS dst_id, dst.label AS dst_label,
                dst.file AS dst_file, dst.line AS dst_line, e.predicate AS predicate
         FROM typed_edges e
         JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id
         WHERE e.src_canonical = ? AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL
           AND dst.superseded_run IS NULL`).all(cur.id);
      for (const e of out) {
        const step = {
          from: cur.id,
          to: e.dst_label,
          kind: e.predicate,
          file: e.dst_file ?? "",
          line: e.dst_line ?? 0
        };
        if (toSet.has(e.dst_label) && !(from === to && cur.steps.length === 0)) {
          return [...cur.steps, step];
        }
        if (!visited.has(e.dst_id)) {
          visited.add(e.dst_id);
          queue.push({ id: e.dst_id, steps: [...cur.steps, step] });
        }
      }
    }
    return [];
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
         )`).all();
    return rows.map((r) => {
      if (r.line === null || r.line === undefined) {
        throw new Error(`LINELESS_NODE: unwired row ${r.name} (${r.file ?? "?"}) has no line`);
      }
      return { name: r.name, file: r.file ?? "", line: r.line, status: "UNWIRED", kind: r.kind ?? "" };
    });
  } finally {
    db.close();
  }
}
function impact(storePath, symbol, depth = 8) {
  const db = openTypedStore(storePath);
  try {
    const ledger = [];
    const seen = new Set;
    const startIds = resolveLiveIds(db, symbol);
    if (startIds.length === 0)
      return { symbol, reaches: 0, ledger, hint: `next=chain from=${symbol}` };
    for (const id of startIds)
      seen.add(id);
    let frontier = startIds;
    for (let d = 1;d <= depth && frontier.length > 0; d++) {
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
          ledger.push({ symbol: c.caller, depth: d, file: c.file ?? "", line: c.line ?? 0, via: c.predicate ?? "" });
          next.push(c.id);
        }
      }
      frontier = next;
    }
    return { symbol, reaches: ledger.length, ledger, hint: `next=chain from=${symbol}` };
  } finally {
    db.close();
  }
}
function safeDelete(storePath, symbol) {
  const db = openTypedStore(storePath);
  try {
    const q = whoCalls(storePath, symbol);
    const imp = impact(storePath, symbol);
    const srcIds = resolveLiveIds(db, symbol);
    let mappedUses = [];
    if (srcIds.length > 0) {
      const uses = db.query(`SELECT DISTINCT dst.label AS symbol, dst.file AS file, dst.line AS line
         FROM typed_edges e
         JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id
         WHERE e.src_canonical IN (${ph(srcIds.length)})
           AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL
           AND dst.superseded_run IS NULL`).all(...srcIds);
      mappedUses = uses.filter((u) => u.line !== null && u.line !== undefined).map((u) => ({ symbol: u.symbol, file: u.file ?? "", line: u.line }));
    }
    const isTestPath = (f) => /(test|spec|mock|fixture)/i.test(f);
    const testReach = [
      ...q.callers.filter((c) => isTestPath(c.file)).map((c) => ({ symbol: c.caller, file: c.file, line: c.line })),
      ...mappedUses.filter((u) => isTestPath(u.file))
    ];
    return { symbol, callers: q.callers, reaches: imp.reaches, uses: mappedUses, testReach };
  } finally {
    db.close();
  }
}
function gateAdvisory(storePath, symbols, dial = "STEER", ripwire) {
  const db = openTypedStore(storePath);
  try {
    const callers = [];
    for (const symbol of symbols) {
      const q = whoCalls(storePath, symbol);
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
import * as fs3 from "fs";
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
  )`
];
var resolveRegistryPath = makeDbPath({
  envVars: ["GI_OMP_DB_DIR"],
  defaultDir: "~/.omp/graph-intelligence",
  fileName: "registry.sqlite",
  testFile: path5.join(os3.tmpdir(), "gi-omp-registry-test.sqlite")
});
function giRegistryPath() {
  if (!process.env.GI_OMP_DB_DIR) {
    const argv1 = process.argv[1] ?? "";
    const bunTestUnset = process.env.BUN_TEST === "1" || argv1.includes("st-gi-omp") || argv1.includes(".test.") || argv1.includes("_test_");
    if (bunTestUnset) {
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
  upsertRow("gi_sessions", "session_id", row.sessionId, "{}", {
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
  const storePath = sessionStorePath(input.scopeRoot, input.sessionId);
  const existing = findGiSessionByStorePath(storePath);
  if (existing && existing.session_id !== ownerKey) {
    throw new GiScopeError(`GI_SCOPE_REFUSED: store ${storePath} owned by ${existing.session_id}; caller ${callerKey}`);
  }
  fs3.mkdirSync(path6.dirname(storePath), { recursive: true });
  const created = !fs3.existsSync(storePath);
  if (created)
    fs3.writeFileSync(storePath, "");
  upsertGiSession({
    sessionId: ownerKey,
    scopeRoot: input.scopeRoot,
    storePath
  });
  return { storePath, ownerKey, created };
}

// src/omp/gate-hook.ts
import * as fs5 from "fs";

// src/omp/gate-middleware.ts
import * as fs4 from "fs";
var EXPORT_PARSE_RE = /export\s+(?:async\s+)?(?:function|const|class|let|var|type|interface|enum)\s+(\w+)/g;
var EXPORT_BRACES_RE = /export\s*\{([^}]*)\}(?:\s*from\s*['"][^'"]*['"])?/g;
var EXPORT_DEFAULT_RE = /export\s+default\b/g;
function parseExports(src) {
  const out = new Set;
  let m;
  EXPORT_PARSE_RE.lastIndex = 0;
  while (m = EXPORT_PARSE_RE.exec(src))
    out.add(m[1]);
  EXPORT_BRACES_RE.lastIndex = 0;
  while (m = EXPORT_BRACES_RE.exec(src)) {
    for (const spec of m[1].split(",")) {
      const s = spec.trim();
      if (!s)
        continue;
      const asMatch = /\bas\s+(\w+)\s*$/.exec(s);
      if (asMatch) {
        out.add(asMatch[1]);
        continue;
      }
      const plain = /^(\w+)$/.exec(s);
      if (plain)
        out.add(plain[1]);
    }
  }
  EXPORT_DEFAULT_RE.lastIndex = 0;
  while (m = EXPORT_DEFAULT_RE.exec(src))
    out.add("default");
  return [...out];
}
function resolveDial(env = process.env, dialFile) {
  const fromEnv = (env.GI_DIAL ?? "").toUpperCase();
  if (fromEnv === "OFF" || fromEnv === "STEER" || fromEnv === "FULL")
    return fromEnv;
  if (dialFile && fs4.existsSync(dialFile)) {
    try {
      const j = JSON.parse(fs4.readFileSync(dialFile, "utf8"));
      const lv = String(j.level ?? "").toUpperCase();
      if (lv === "OFF" || lv === "STEER" || lv === "FULL")
        return lv;
    } catch {}
  }
  return "STEER";
}
function runGraphGate(input) {
  if (!input.hasStore) {
    return { cancel: false, token: "GI_NO_STORE", advisory: "GI_NO_STORE: ALLOW+warn" };
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
function parseExportSites(src) {
  const out = new Map;
  const lineOf = (off) => {
    let line = 1;
    for (let i = 0;i < off; i++)
      if (src.charCodeAt(i) === 10)
        line++;
    return line;
  };
  const put = (name, off) => {
    if (!out.has(name))
      out.set(name, lineOf(off));
  };
  let m;
  EXPORT_PARSE_RE.lastIndex = 0;
  while (m = EXPORT_PARSE_RE.exec(src))
    put(m[1], m.index);
  EXPORT_BRACES_RE.lastIndex = 0;
  while (m = EXPORT_BRACES_RE.exec(src)) {
    for (const spec of m[1].split(",")) {
      const s = spec.trim();
      if (!s)
        continue;
      const asMatch = /\bas\s+(\w+)\s*$/.exec(s);
      if (asMatch) {
        put(asMatch[1], m.index);
        continue;
      }
      const plain = /^(\w+)$/.exec(s);
      if (plain)
        put(plain[1], m.index);
    }
  }
  EXPORT_DEFAULT_RE.lastIndex = 0;
  while (m = EXPORT_DEFAULT_RE.exec(src))
    put("default", m.index);
  return [...out.entries()].map(([name, line]) => ({ name, line }));
}

// src/omp/gate-hook.ts
function str(v) {
  return typeof v === "string" ? v : "";
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
    if (file && fs5.existsSync(file)) {
      try {
        oldText = fs5.readFileSync(file, "utf8");
      } catch {
        oldText = "";
      }
    }
    return { oldText, newText, file };
  }
  const oldString = str(input.old_string) || str(input.oldString);
  const newString = str(input.new_string) || str(input.newString);
  let oldText = oldString;
  if (file && fs5.existsSync(file)) {
    try {
      oldText = fs5.readFileSync(file, "utf8");
    } catch {
      oldText = oldString;
    }
  }
  if (oldString && newString) {
    return { oldText, newText: oldText.split(oldString).join(newString), file };
  }
  const dsl = str(input.input);
  let newText = oldText;
  if (dsl && oldText) {
    const names = oldText.match(/export\s+(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)/g) ?? [];
    newText = oldText;
    for (const full of names) {
      const n = full.replace(/export\s+(?:async\s+)?function\s+/, "");
      const stripped = new RegExp(String.raw`function\s+` + n);
      if (stripped.test(dsl) && !new RegExp(String.raw`export\s+(?:async\s+)?function\s+` + n).test(dsl)) {
        newText = newText.replace(new RegExp(String.raw`export\s+(async\s+)?function\s+` + n), "function " + n);
      }
    }
  }
  return { oldText, newText, file };
}
function attachGiGraphGate(pi) {
  let pendingSteer = null;
  pi.on("tool_call", (event) => {
    const name = String(event.toolName ?? "").toLowerCase();
    const input = event.input && typeof event.input === "object" ? event.input : {};
    try {
      fs5.appendFileSync("/tmp/gi-gate.log", JSON.stringify({
        name,
        keys: Object.keys(input),
        dial: process.env.GI_DIAL ?? "",
        origin: event.isAgentOrigin
      }) + `
`);
    } catch {}
    if (name !== "write" && name !== "write_file" && name !== "edit" && name !== "patch") {
      return;
    }
    if (event.isAgentOrigin === false)
      return;
    const dial = resolveDial(process.env);
    const rec = reconstruct(name, input);
    const verdict = runGraphGate({
      dial,
      oldText: rec.oldText,
      newText: rec.newText,
      file: rec.file,
      hasStore: true
    });
    try {
      fs5.appendFileSync("/tmp/gi-gate.log", JSON.stringify({ recFile: rec.file, dial, verdict }) + `
`);
    } catch {}
    if (verdict.cancel && verdict.token) {
      pendingSteer = null;
      throw new Error(`${verdict.token}: ${verdict.advisory ?? rec.file}`);
    }
    pendingSteer = verdict.token === "[GATE STEER]" ? `[GATE STEER] ${verdict.advisory ?? ""}`.trim() : null;
    return;
  });
  pi.on("tool_result", (event) => {
    if (!pendingSteer)
      return;
    const name = String(event.toolName ?? "").toLowerCase();
    if (name !== "write" && name !== "write_file" && name !== "edit" && name !== "patch") {
      pendingSteer = null;
      return;
    }
    const note = pendingSteer;
    pendingSteer = null;
    const extra = { type: "text", text: note };
    const prev = Array.isArray(event.content) ? event.content : [];
    return { content: [extra, ...prev], details: { ...typeof event.details === "object" && event.details ? event.details : {}, giSteer: note } };
  });
}

// src/omp/populate.ts
import * as fs10 from "fs";
import * as path11 from "path";

// src/omp/populate-corbell.ts
import * as fs9 from "fs";
import * as path10 from "path";
import { Database as Database4 } from "bun:sqlite";

// src/omp/populate-graphify.ts
import * as fs8 from "fs";
import * as path9 from "path";

// src/hunter/graph/graphify-adapter.ts
import * as fs7 from "fs";
import * as path8 from "path";

// src/hunter/log.ts
function tridentLog(level, ns, msg) {
  console.error(`[${level} ${ns}] ${msg}`);
}

// src/hunter/graph/corbell-adapter.ts
import fs6 from "fs";
import path7 from "path";
import { execSync } from "child_process";
import { Database as Database3 } from "bun:sqlite";
function resolveCorbell(profile, env = process.env) {
  const fromProfile = profile?.graph?.binaryPath;
  if (fromProfile && fromProfile.length > 0 && fs6.existsSync(fromProfile))
    return fromProfile;
  const fromEnv = env.CORBELL_BIN;
  if (fromEnv && fromEnv.length > 0 && fs6.existsSync(fromEnv))
    return fromEnv;
  const VENV_SITES = [path7.join("/home", "leviathan", "corbell-venv", "bin", "corbell"), path7.join("/", "opt", "corbell-venv", "bin", "corbell")];
  for (const candidate of VENV_SITES) {
    if (fs6.existsSync(candidate))
      return candidate;
  }
  const pathEnv = env.PATH ?? process.env.PATH ?? "";
  for (const dir of pathEnv.split(":")) {
    if (!dir)
      continue;
    const cand = path7.join(dir, "corbell");
    if (fs6.existsSync(cand))
      return cand;
  }
  throw new Error("CORBELL_NOT_FOUND - the corbell binary is missing; install it with 'pip install git+https://github.com/Corbell-AI/Corbell.git' or set CORBELL_BIN or graph.binaryPath");
}
var defaultExec = (cmdRaw, opts) => {
  const cmd = "exec " + cmdRaw;
  const ATTEMPTS = 8;
  let lastErr;
  for (let attempt = 1;attempt <= ATTEMPTS; attempt++) {
    try {
      return execSync(cmd, {
        cwd: opts?.cwd,
        timeout: opts?.timeout,
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
      const backoff = Math.min(16000, 1000 * Math.pow(2, attempt - 1));
      console.warn(`[corbell-adapter] database locked (attempt ${attempt}/${ATTEMPTS}) \u2014 retrying in ${backoff}ms`);
      execSync(`sleep ${backoff / 1000}`);
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
function resolveNodeFile(stored, root, fsMod = fs6) {
  const cacheKey = `${stored}\x00${root}`;
  const cached = resolveNodeFileCache.get(cacheKey);
  if (cached !== undefined)
    return cached;
  if (path7.isAbsolute(stored) && fsMod.existsSync(stored)) {
    resolveNodeFileCache.set(cacheKey, stored);
    return stored;
  }
  if (!path7.isAbsolute(stored)) {
    const joined = path7.resolve(root, stored);
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
    const candidate = path7.resolve(root, suffix);
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
      return "calls";
    default:
      tridentLog("DEBUG", "corbell-adapter", `unknown edge kind '${k}' -> 'calls' (the fallback)`);
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
  const root = path7.resolve(profile.project.root);
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
      file: path7.isAbsolute(file) ? file : path7.resolve(root, file),
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
    const wsConfigPath = path7.join(profile.project.root, "corbell-data", "workspace.yaml");
    const wsConfigExists = fs6.existsSync(wsConfigPath);
    let wsConfigStale = !wsConfigExists;
    if (wsConfigExists) {
      try {
        const wsText = fs6.readFileSync(wsConfigPath, "utf8");
        const rootMatch = /root:\s*["']?([^"'\n]+)/.exec(wsText);
        const svcMatch = /repo:\s*["']?([^"'\n]+)/.exec(wsText);
        if (rootMatch && svcMatch) {
          const declaredRoot = rootMatch[1].trim().replace(/^\.\/+/, "");
          const declaredRepo = svcMatch[1].trim();
          const actual = profile.project.root.replace(/^\.\/+/, "");
          const rootOk = declaredRoot === "." || declaredRoot === ".." || actual.endsWith(declaredRoot.replace(/\/+$/, ""));
          const repoOk = declaredRepo === "." || declaredRepo === ".." || actual.endsWith(declaredRepo.replace(/\/+$/, ""));
          wsConfigStale = !(rootOk && repoOk);
        } else {
          wsConfigStale = true;
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
    var warmIndexSkipped = false;
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
      const walkExcludes = new Set([...profileExcludes, "Checkpoints", "corbell-data", "context_management", ".trident"]);
      couplingEnv.CORBELL_WALK_EXCLUDE_DIRS = [...walkExcludes].join(",");
      try {
        const gitRoot = execSync("git rev-parse --show-toplevel", {
          cwd: profile.project.root,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"]
        }).trim();
        const rel = path7.relative(gitRoot, profile.project.root);
        if (rel.length > 0 && !rel.startsWith("..")) {
          couplingEnv.CORBELL_COUPLING_SCOPE = rel.split(path7.sep).join("/");
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
      const storePath = path7.join(profile.project.root, "corbell-data", ".corbell", "workspace.db");
      try {
        const st = fs6.statSync(storePath);
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
  writeWorkspaceConfig(profile, wsConfigPath) {
    const slug = profile.project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "service";
    const languages = profile.project.languages.length > 0 ? profile.project.languages[0] : "typescript";
    const config = [
      'version: "1"',
      "",
      "workspace:",
      `  name: "${profile.project.name}"`,
      '  root: ".."',
      "",
      "services:",
      `  - id: ${slug}`,
      "    repo: ..",
      `    language: ${languages}`,
      "    tags: [core]",
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
      fs6.mkdirSync(path7.dirname(wsConfigPath), { recursive: true });
      fs6.writeFileSync(wsConfigPath, config, "utf8");
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
    const dbPath = path7.join(profile.project.root, "corbell-data", ".corbell", "workspace.db");
    if (!fs6.existsSync(dbPath))
      return { nodes: [], edges: [] };
    let db;
    try {
      db = new Database3(dbPath, { readonly: true });
    } catch (e) {
      throw adapterFailed(`read ${dbPath}`, `could not open the corbell store: ${String(e)}`);
    }
    const nodes = [];
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
            const srcPath = path7.isAbsolute(file) ? file : path7.join(profile.project.root, file);
            const src = fs6.readFileSync(srcPath, "utf8");
            const nums = [...src.matchAll(/(\d+\.\d+)/g)].map((m) => Number(m[1])).filter((n) => Number.isFinite(n));
            if (nums.length > 0) {
              data["comparator"] = Math.max(...nums);
              data["numericLiterals"] = nums;
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
    return bySuffix?.id ?? `corbell:${symbol}`;
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
    return this.cachedEdges.filter((e) => e.kind === "calls" && e.targetId === target).map((e) => {
      const caller = this.nodeById(e.sourceId);
      return {
        file: caller?.file ?? this.profile.project.root,
        line: e.line ?? caller?.line ?? 0,
        caller: caller?.name ?? e.sourceId
      };
    });
  }
  chain(id) {
    this.ensureBuilt();
    const start = this.resolveNodeId(id);
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
          file: callee?.file ?? this.profile.project.root,
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
    return this.cachedEdges.filter((e) => e.kind === "imports" && e.sourceId === start).map((e) => {
      const src = this.nodeById(e.sourceId);
      const dst = this.nodeById(e.targetId);
      return { from: src?.name ?? e.sourceId, to: dst?.name ?? e.targetId, file: src?.file ?? this.profile.project.root, line: e.line ?? src?.line ?? 0 };
    });
  }
  awaits(symbol) {
    this.ensureBuilt();
    const start = this.resolveNodeId(symbol);
    return this.cachedEdges.filter((e) => e.kind === "awaits" && e.sourceId === start).map((e) => {
      const src = this.nodeById(e.sourceId);
      const dst = this.nodeById(e.targetId);
      return { from: src?.name ?? e.sourceId, to: dst?.name ?? e.targetId, file: src?.file ?? this.profile.project.root, line: e.line ?? src?.line ?? 0 };
    });
  }
  unwired() {
    this.ensureBuilt();
    const callTargets = new Set(this.cachedEdges.filter((e) => e.kind === "calls").map((e) => e.targetId));
    return this.cachedNodes.filter((n) => (n.kind === "function" || n.kind === "method" || n.kind === "class") && !callTargets.has(n.id)).map((n) => ({ id: n.id, name: n.name, file: n.file ?? this.profile.project.root, line: n.line ?? 0 }));
  }
  nodes(kind) {
    if (!this.built)
      return [];
    return kind === undefined ? [...this.cachedNodes] : this.cachedNodes.filter((n) => n.kind === kind);
  }
  async corbellParse(fileSubtree) {
    const out = [];
    for (const file of fileSubtree) {
      const rel = path7.isAbsolute(file) ? path7.relative(this.profile.project.root, file) : file;
      let text = "";
      try {
        text = fs6.readFileSync(path7.resolve(this.profile.project.root, rel), "utf8");
      } catch (e) {
        console.error("[corbell-adapter] unreadable subtree file skipped:", rel, e instanceof Error ? e.message : String(e));
        continue;
      }
      const lines = text.split(`
`);
      lines.forEach((line, idx) => {
        const m = /^\s*(?:export\s+)?(?:class|function)\s+(\w+)/.exec(line);
        if (m)
          out.push({ id: `corbell:${m[1]}`, kind: line.includes("class") ? "class" : "function", name: m[1], file: path7.resolve(this.profile.project.root, rel), line: idx + 1, lineage: "CODE_DERIVED", source: `${rel}:${idx + 1}` });
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
  if (profile.graph.substrate === "native-ast") {
    throw adapterFailed(`substrate='native-ast'`, "REMOVED: the native-ast fallback was ripped out per the operator ruling \u2014 corbell is the hard dependency. Install corbell (pip install git+https://github.com/Corbell-AI/Corbell.git into a py3.11+ venv, or set CORBELL_BIN) or fix graph.binaryPath. No fallback exists.");
  }
  switch (profile.graph.substrate) {
    case "corbell":
      return new CorbellAdapter(profile);
    case "graphify":
      return new GraphifyAdapter(profile);
    case "ix":
      throw adapterFailed("substrate=ix", "REMOVED in the OMP port: the ix adapter is excluded (manifest #12); corbell is the substrate \u2014 set graph.substrate=corbell.");
    default:
      throw adapterFailed(`substrate=${String(profile.graph.substrate)}`, "no adapter for the selected substrate");
  }
}

// src/hunter/graph/graphify-adapter.ts
var GRAPHIFY_OUT_ENV = "GRAPHIFY_OUT";
var GRAPHIFY_OUT_DEFAULT = "graphify-out/graph.json";
function resolveGraphifyOut(profile, override, env = process.env) {
  const root = profile?.project.root ? path8.resolve(profile.project.root) : process.cwd();
  const pick = typeof override === "string" && override.length > 0 ? override : typeof profile?.graph?.graphifyOut === "string" && profile.graph.graphifyOut.length > 0 ? profile.graph.graphifyOut : typeof env[GRAPHIFY_OUT_ENV] === "string" && env[GRAPHIFY_OUT_ENV].length > 0 ? env[GRAPHIFY_OUT_ENV] : GRAPHIFY_OUT_DEFAULT;
  return path8.isAbsolute(pick) ? pick : path8.resolve(root, pick);
}
function loadGraphifyFileSync(graphPath) {
  let size = 0;
  try {
    size = fs7.statSync(graphPath).size;
  } catch {
    throw new Error(`GRAPHIFY_NOT_WARM:no-graph at ${graphPath} (rebuild with: bun scripts/graphify-build.ts --target '${path8.dirname(path8.dirname(graphPath))}')`);
  }
  if (size === 0)
    throw graphEmpty(`graphify graph.json is empty (0 bytes at ${graphPath})`);
  if (size > GRAPH_LOAD_BUDGET_BYTES) {
    throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${size} bytes (> ${GRAPH_LOAD_BUDGET_BYTES} budget). Fix: scope/extract a subtree or lower the graph cardinality.`);
  }
  let raw;
  try {
    const text = fs7.readFileSync(graphPath, "utf8");
    if (Buffer.byteLength(text, "utf8") > GRAPH_LOAD_BUDGET_BYTES) {
      throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json grew past the budget between stat and read (${Buffer.byteLength(text, "utf8")} bytes).`);
    }
    raw = parseGraphJsonGuarded(text);
  } catch (e) {
    if (e instanceof Error && e.message.includes("GRAPHIFY_GRAPH_TOO_LARGE"))
      throw e;
    throw new Error(`GRAPHIFY_EXTRACT_FAILED: graph.json parse failed \u2014 ${e instanceof Error ? e.message : String(e)}`);
  }
  return normalizeGraphifyGraph(raw, { root: path8.dirname(path8.dirname(graphPath)) });
}
function normalizeGraphifyGraph(raw, opts) {
  const rawNodes = Array.isArray(raw["nodes"]) ? raw["nodes"] : [];
  const rawLinkSrc = Array.isArray(raw["links"]) ? raw["links"] : Array.isArray(raw["edges"]) ? raw["edges"] : [];
  const rawLinks = rawLinkSrc;
  const seenIds = new Set;
  const nodeIdByRaw = new Map;
  let dropped = 0;
  const nodes = [];
  for (const n of rawNodes) {
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
    nodes.push({
      id,
      label,
      type: String(r["file_type"] ?? r["type"] ?? "unknown"),
      file: String(r["source_file"] ?? r["file"] ?? ""),
      data: r
    });
  }
  if (dropped > 0)
    tridentLog("WARN", "graphify-adapter", `normalize: dropped ${dropped} id-less rows (no shared "" collision)`);
  const edges = rawLinks.map((e) => {
    const src = String(e["source"] ?? e["src"] ?? "");
    const dst = String(e["target"] ?? e["dst"] ?? "");
    const relation = String(e["relation"] ?? "references");
    const rawConf = String(e["confidence"] ?? "EXTRACTED");
    return { src, dst, relation, confidence: rawConf === "INFERRED" ? "INFERRED" : "EXTRACTED" };
  });
  const communityMap = new Map;
  for (const n of rawNodes) {
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
  if (opts?.root) {
    const rootReal = (() => {
      try {
        return fs7.realpathSync(opts.root);
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
      const abs = path8.isAbsolute(f) ? f : path8.resolve(rootReal, f);
      let real = abs;
      try {
        real = fs7.realpathSync(abs);
      } catch {}
      const rel = path8.relative(rootReal, real);
      const contained = rel !== ".." && !rel.startsWith(`..${path8.sep}`) && !path8.isAbsolute(rel);
      const safeFile = contained ? rel.split(path8.sep).join("/") : "";
      if (safeFile !== n.file) {
        nodes[i] = { ...n, file: safeFile };
        const at = nodeIdByRaw.get(rawNodes[i]);
        if (at === n.id)
          nodeIdByRaw.set(rawNodes[i], nodes[i].id);
      }
    }
  }
  return { nodes, edges, communities, godNodes };
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
      tridentLog("DEBUG", "graphify-adapter", `unknown edge relation '${relation}' -> 'traces-to' (the fallback)`);
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
      tridentLog("WARN", "graphify-adapter", `unknown typed predicate '${relation}' -> 'declares' (typo becomes declares \u2014 fix the source)`);
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
  throw new Error(`LINELESS_NODE: no line for ${context || "graphify node"} (checked line/line_start/line_end/source_location)`);
}
function tryResolveGraphifyLine(node, edge) {
  try {
    return resolveGraphifyLine(node, edge ?? null, "");
  } catch {
    return;
  }
}
function graphifyEvidence(predicate, src, dst, file, line) {
  const anchor = file && file.length > 0 ? `${file}:${line}` : src;
  return `explicit: ${predicate} in source ${src}->${dst} @ ${anchor}`;
}
function mapGraphifyToTyped(nodes, edges, runTag) {
  const nodeRows = nodes.map((n) => ({
    canonicalId: n.id,
    kind: graphifyKindToTyped(n.kind),
    label: n.name,
    file: typeof n.file === "string" ? n.file : null,
    line: resolveGraphifyLine({ line: n.line ?? undefined, data: n.data ?? {} }, null, n.id),
    run: runTag
  }));
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const edgeRows = edges.map((e) => {
    const src = nodesById.get(e.sourceId);
    const line = e.line ?? src?.line ?? tryResolveGraphifyLine({ data: src?.data ?? {} });
    if (line === undefined)
      throw new Error(`LINELESS_NODE: no line for edge ${e.sourceId}->${e.targetId} (edge + source both lineless)`);
    return {
      srcCanonical: e.sourceId,
      dstCanonical: e.targetId,
      predicate: graphifyPredicateToTyped(e.kind),
      evidence: graphifyEvidence(graphifyPredicateToTyped(e.kind), e.sourceId, e.targetId, src?.file ?? null, line),
      run: runTag
    };
  });
  return { nodeRows, edgeRows };
}
function projectGraphifyGraph(graph, root) {
  const rootReal = (() => {
    try {
      return fs7.realpathSync(root);
    } catch {
      return path8.resolve(root);
    }
  })();
  const nodes = graph.nodes.map((n) => {
    const kind = graphifyKindToNodeKind(n.type, n);
    let file;
    if (n.file && n.file.length > 0) {
      const abs = path8.isAbsolute(n.file) ? n.file : path8.resolve(rootReal, n.file);
      let real = abs;
      try {
        real = fs7.realpathSync(abs);
      } catch {}
      const rel = path8.relative(rootReal, real);
      if (rel !== ".." && !rel.startsWith(`..${path8.sep}`) && !path8.isAbsolute(rel))
        file = abs;
    }
    const data = n.data ?? {};
    const line = tryResolveGraphifyLine({ data });
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
    const src = `graphify:${e.src}`;
    const dst = `graphify:${e.dst}`;
    if (!byId.has(src) || !byId.has(dst)) {
      dangling++;
      continue;
    }
    const rawEdge = e;
    const edgeLoc = rawEdge["source_location"];
    const srcNode = byId.get(src);
    const srcFile = srcNode?.file;
    const line = parseLineValue(edgeLoc) ?? srcNode?.line ?? tryResolveGraphifyLine({ data: nodeByRawId.get(e.src)?.data ?? {} });
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
    tridentLog("WARN", "graphify-adapter", `project: dropped ${dangling} dangling edges; kept ${danglingNoLine} lineless-edge rows with line undefined (counted, never silent, never invented)`);
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
  constructor(profile) {
    this.profile = profile;
  }
  async build(profile) {
    const root = path8.resolve(profile.project.root);
    const graphPath = resolveGraphifyOut(profile);
    this.lastGraphPath = graphPath;
    const t0 = Date.now();
    if (!fs7.existsSync(graphPath)) {
      throw new Error(`GRAPHIFY_NOT_WARM:no-graph at ${graphPath} (rebuild with: bun scripts/graphify-build.ts --target '${root}')`);
    }
    let size = 0;
    try {
      size = fs7.statSync(graphPath).size;
    } catch (e) {
      throw new Error(`GRAPHIFY_NOT_WARM:unreadable ${graphPath}: ${e instanceof Error ? e.message.slice(0, 80) : String(e)}`);
    }
    if (size === 0)
      throw graphEmpty(`graphify graph.json is empty (0 bytes at ${graphPath})`);
    if (size > GRAPH_LOAD_BUDGET_BYTES) {
      throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${size} bytes (> ${GRAPH_LOAD_BUDGET_BYTES} budget). Fix: scope/extract a subtree or lower the graph cardinality.`);
    }
    if (size > GRAPH_PARSE_YIELD_BYTES) {
      await new Promise((resolve) => setImmediate(() => resolve()));
    }
    let raw;
    try {
      const text = fs7.readFileSync(graphPath, "utf8");
      if (Buffer.byteLength(text, "utf8") > GRAPH_LOAD_BUDGET_BYTES) {
        throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json grew past the budget between stat and read (${Buffer.byteLength(text, "utf8")} bytes).`);
      }
      raw = parseGraphJsonGuarded(text);
    } catch (e) {
      if (e instanceof Error && e.message.includes("GRAPHIFY_GRAPH_TOO_LARGE"))
        throw e;
      throw adapterParseError("graphify graph.json", `graph.json parse failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    const graph = normalizeGraphifyGraph(raw, { root: path8.dirname(path8.dirname(graphPath)) });
    if (graph.nodes.length === 0) {
      throw graphEmpty(`graphify graph produced zero nodes (graph.json at ${graphPath} carries no nodes)`);
    }
    const { nodes, edges } = projectGraphifyGraph(graph, root);
    if (nodes.length === 0) {
      throw graphEmpty(`graphify graph build produced zero nodes (graph.json at ${graphPath} carries no nodes; keys=${Object.keys(raw).slice(0, 8).join(",")})`);
    }
    this.cachedNodes = nodes;
    this.cachedEdges = edges;
    this.cachedRaw = graph;
    this.built = true;
    this.reindex();
    return {
      nodes,
      edges,
      durationMs: Date.now() - t0,
      adapter: "graphify",
      lineage: countLineage2(nodes, edges),
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
      if (line === undefined) {
        onLineless?.(`LINELESS_NODE skipped: whoCalls edge ${e.sourceId}->${e.targetId} (edge + caller both lineless)`);
        continue;
      }
      out.push({ file: caller?.file ?? this.profile.project.root, line, caller: caller?.name ?? e.sourceId });
    }
    return out;
  }
  buildSync(graphPath) {
    const root = path8.resolve(this.profile.project.root);
    const graph = loadGraphifyFileSync(graphPath);
    if (graph.nodes.length === 0) {
      throw graphEmpty(`graphify graph produced zero nodes (graph.json at ${graphPath} carries no nodes)`);
    }
    const { nodes, edges } = projectGraphifyGraph(graph, root);
    this.lastGraphPath = graphPath;
    this.cachedNodes = nodes;
    this.cachedEdges = edges;
    this.cachedRaw = graph;
    this.built = true;
    this.reindex();
    return { nodes, edges, graph };
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
    while (queue.length > 0) {
      const from = queue.shift();
      for (const e of bySource.get(from) ?? []) {
        const caller = this.nodeById(e.sourceId);
        const callee = this.nodeById(e.targetId);
        const line = e.line ?? callee?.line;
        if (line === undefined)
          throw new Error(`LINELESS_NODE: no line for chain edge ${e.sourceId}->${e.targetId} (edge + callee both lineless)`);
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
    return steps;
  }
  imports(module) {
    this.ensureBuilt();
    const start = this.resolveNodeId(module);
    return this.cachedEdges.filter((e) => e.kind === "imports" && e.sourceId === start).map((e) => {
      const src = this.nodeById(e.sourceId);
      const dst = this.nodeById(e.targetId);
      const line = e.line ?? src?.line;
      if (line === undefined)
        throw new Error(`LINELESS_NODE: no line for imports edge ${e.sourceId} (edge + source both lineless)`);
      return { from: src?.name ?? e.sourceId, to: dst?.name ?? e.targetId, file: src?.file ?? this.profile.project.root, line };
    });
  }
  awaits(symbol) {
    this.ensureBuilt();
    const start = this.resolveNodeId(symbol);
    return this.cachedEdges.filter((e) => e.kind === "awaits" && e.sourceId === start).map((e) => {
      const src = this.nodeById(e.sourceId);
      const dst = this.nodeById(e.targetId);
      const aline = e.line ?? src?.line;
      if (aline === undefined)
        throw new Error(`LINELESS_NODE: no line for awaits edge ${e.sourceId} (edge + source both lineless)`);
      return { from: src?.name ?? e.sourceId, to: dst?.name ?? e.targetId, file: src?.file ?? this.profile.project.root, line: aline };
    });
  }
  unwired() {
    this.ensureBuilt();
    const callTargets = new Set(this.cachedEdges.filter((e) => e.kind === "calls").map((e) => e.targetId));
    return this.cachedNodes.filter((n) => (n.kind === "function" || n.kind === "class") && !callTargets.has(n.id)).map((n) => {
      if (n.line === undefined || n.line === null) {
        throw new Error(`LINELESS_NODE: unwired row ${n.id} has no line (run graphify extract with source mapping, or drop the row)`);
      }
      return { id: n.id, name: n.name, file: n.file ?? this.profile.project.root, line: n.line };
    });
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
  return resolveGraphifyOut({ project: { root: path9.resolve(root) } });
}
function isGraphifyCheckoutFreshFor(root, graphPath, scope = ["src"], excludes = []) {
  if (scope.length === 0)
    return { fresh: false, reason: "stale-unscooped" };
  if (!fs8.existsSync(graphPath))
    return { fresh: false, reason: "absent" };
  let st;
  try {
    st = fs8.statSync(graphPath);
  } catch {
    return { fresh: false, reason: "absent" };
  }
  const warmMtime = st.mtimeMs;
  let newest = 0;
  let filesSeen = 0;
  let exhausted = false;
  const budget = { n: GRAPHIFY_FRESHNESS_BUDGET };
  const walk = (dir) => {
    if (budget.n <= 0) {
      exhausted = true;
      return;
    }
    let entries;
    try {
      entries = fs8.readdirSync(dir, { withFileTypes: true });
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
        walk(path9.join(dir, entry.name));
      } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        budget.n--;
        try {
          const m = fs8.statSync(path9.join(dir, entry.name)).mtimeMs;
          if (m > newest)
            newest = m;
          filesSeen += 1;
        } catch {}
      }
    }
  };
  for (const rel of scope) {
    const target = path9.isAbsolute(rel) ? rel : path9.join(root, rel);
    let stTarget = null;
    try {
      stTarget = fs8.statSync(target);
    } catch {
      stTarget = null;
    }
    if (stTarget?.isFile()) {
      const base = path9.basename(target);
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
  if (filesSeen === 0)
    return { fresh: false, reason: "stale-unscooped" };
  if (exhausted)
    return { fresh: false, reason: "stale-budget" };
  const hashPath = graphPath.replace(/\.json$/, ".graph_hash");
  let storedHash = null;
  try {
    storedHash = fs8.readFileSync(hashPath, "utf8").trim() || null;
  } catch (readErr) {
    console.log(`[gi-omp] freshness: no hash sidecar at ${hashPath} (${readErr instanceof Error ? readErr.message.slice(0, 40) : "read error"})`);
  }
  if (storedHash) {
    const currentHash = computeSourceHash(root, scope, excludes);
    if (currentHash !== storedHash)
      return { fresh: false, reason: "stale-content" };
    return { fresh: true, reason: "fresh" };
  }
  if (Math.floor(newest / 1000) <= Math.floor(warmMtime / 1000))
    return { fresh: true, reason: "fresh" };
  return { fresh: false, reason: "stale" };
}
function computeSourceHash(root, scope, excludes) {
  const crypto = __require("crypto");
  const hash = crypto.createHash("sha256");
  const budget = { n: 500 };
  const walk = (dir, prefix) => {
    if (budget.n <= 0)
      return;
    let entries;
    try {
      entries = fs8.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (budget.n <= 0)
        return;
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "dist", "build", "coverage", "__pycache__", "graphify-out", ".omp"].includes(entry.name))
          continue;
        if (excludes.includes(entry.name))
          continue;
        walk(path9.join(dir, entry.name), prefix + entry.name + "/");
      } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        budget.n--;
        try {
          const stat = fs8.statSync(path9.join(dir, entry.name));
          const fd = fs8.openSync(path9.join(dir, entry.name), "r");
          const buf = Buffer.alloc(Math.min(4096, stat.size));
          fs8.readSync(fd, buf, 0, buf.length, 0);
          fs8.closeSync(fd);
          hash.update(`${prefix}${entry.name}\x00${stat.size}\x00`);
          hash.update(buf);
        } catch {}
      }
    }
  };
  for (const rel of scope) {
    const target = path9.isAbsolute(rel) ? rel : path9.join(root, rel);
    try {
      const st = fs8.statSync(target);
      if (st.isFile()) {
        hash.update(`${rel}\x00${st.size}\x00`);
        continue;
      }
      if (st.isDirectory())
        walk(target, "");
    } catch {}
  }
  return hash.digest("hex");
}
function supersedeThenInsert(db, runTag, nodeRows, edgeRows, meta) {
  if (db.inTransaction === true) {
    throw new Error("GI_TXN_REQUIRED: supersedeThenInsert called inside an existing transaction (the helper owns BEGIN/COMMIT)");
  }
  if (nodeRows.length === 0 && edgeRows.length === 0) {
    throw new Error("GRAPHIFY_WRITE_FAILED: refusing supersede-then-insert with zero rows (would wipe live data)");
  }
  db.exec("BEGIN IMMEDIATE;");
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
    db.exec("COMMIT;");
  } catch (e) {
    try {
      db.exec("ROLLBACK;");
    } catch {}
    throw e;
  }
}

// src/omp/populate-corbell.ts
var CORBELL_CHECKOUT_REL = ".omp/graph-intelligence/corbell-checkout/store.sqlite";
var CORBELL_FRESHNESS_BUDGET = 500;
function corbellCheckoutPath(root) {
  return path10.join(root, CORBELL_CHECKOUT_REL);
}
function isCorbellCheckoutFreshFor(root, warmPath) {
  if (!fs9.existsSync(warmPath))
    return { fresh: false, reason: "absent" };
  let st;
  try {
    st = fs9.statSync(warmPath);
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
  const walk = (dir) => {
    if (budget.n <= 0) {
      exhausted = true;
      return;
    }
    let entries;
    try {
      entries = fs9.readdirSync(dir, { withFileTypes: true });
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
        budget.n--;
        walk(path10.join(dir, entry.name));
      } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        budget.n--;
        try {
          const m = fs9.statSync(path10.join(dir, entry.name)).mtimeMs;
          if (m > newest)
            newest = m;
        } catch {}
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
  const freshness = isCorbellCheckoutFreshFor(root, warmPath);
  if (!freshness.fresh) {
    return { ok: false, reason: `CORBELL_NOT_WARM:${freshness.reason}`, nodes: 0, edges: 0, checkoutPath: warmPath };
  }
  let rows = [];
  let edges = [];
  const stBefore = (() => {
    try {
      return fs9.statSync(warmPath).mtimeMs;
    } catch {
      return -1;
    }
  })();
  let src = null;
  try {
    src = new Database4(warmPath, { readonly: true });
    rows = src.query("SELECT canonical_id, kind, label, file, line FROM typed_nodes WHERE superseded_run IS NULL").all();
    edges = src.query("SELECT src_canonical, dst_canonical, predicate, evidence_quote, confidence FROM typed_edges WHERE superseded_run IS NULL").all();
  } catch (e) {
    return { ok: false, reason: `CORBELL_NOT_WARM:unreadable:${e instanceof Error ? e.message.slice(0, 60) : String(e)}`, nodes: 0, edges: 0, checkoutPath: warmPath };
  } finally {
    try {
      src?.close();
    } catch {}
  }
  const MAX_WARM_ROWS = 50000;
  let skippedInvalid = 0;
  const validRows = rows.filter((r) => {
    const validId = typeof r.canonical_id === "string" && r.canonical_id.length > 0;
    const validKind = typeof r.kind === "string" && r.kind.length > 0;
    const validLine = r.line === null || Number.isInteger(r.line) && r.line >= 0;
    if (!validId || !validKind || !validLine) {
      skippedInvalid += 1;
      return false;
    }
    return true;
  });
  if (validRows.length === 0) {
    return { ok: false, reason: "CORBELL_NOT_WARM:zero-rows", nodes: 0, edges: 0, checkoutPath: warmPath };
  }
  const freshnessAfter = isCorbellCheckoutFreshFor(root, warmPath);
  const mtimeAfter = (() => {
    try {
      return fs9.statSync(warmPath).mtimeMs;
    } catch {
      return -2;
    }
  })();
  if (!freshnessAfter.fresh || mtimeAfter !== stBefore) {
    return { ok: false, reason: "CORBELL_NOT_WARM:changed-mid-read", nodes: 0, edges: 0, checkoutPath: warmPath };
  }
  const materializeRows = validRows.length > MAX_WARM_ROWS ? validRows.slice(0, MAX_WARM_ROWS) : validRows;
  const materializeSkipped = skippedInvalid + (validRows.length - materializeRows.length);
  const nodeRows = materializeRows.map((r) => ({
    canonicalId: r.canonical_id,
    kind: r.kind,
    label: r.label,
    file: r.file,
    line: r.line,
    run: runTag
  }));
  const cappedEdges = edges.length > MAX_WARM_ROWS * 3 ? edges.slice(0, MAX_WARM_ROWS * 3) : edges;
  const edgeRows = cappedEdges.map((e) => ({
    srcCanonical: e.src_canonical,
    dstCanonical: e.dst_canonical,
    predicate: e.predicate,
    evidence: e.evidence_quote,
    confidence: typeof e.confidence === "number" && Number.isFinite(e.confidence) ? e.confidence : 1,
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
    try {
      db.close();
    } catch (closeErr) {
      console.error(`[gi-omp] store close warning: ${closeErr instanceof Error ? closeErr.message : String(closeErr)}`);
    }
  }
  return { ok: true, nodes: materializeRows.length, edges: cappedEdges.length, checkoutPath: warmPath, skipped: materializeSkipped };
}

// src/omp/populate.ts
var POPULATE_FILE_BUDGET = 1000;
var EXCLUDED_DIRS = new Set(["node_modules", ".git", ".hg", ".svn", "dist", "build", ".next", "coverage", "__pycache__"]);
var IMPORT_RE = /^\s*import\s+[^;]*?from\s*['"]([^'"]+)['"]/gm;
var BINDINGS_RE = /^\s*import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gm;
function collectTsFiles(root, budget) {
  const files = [];
  const walk = (dir, left) => {
    if (left.n <= 0)
      return;
    for (const entry of fs10.readdirSync(dir, { withFileTypes: true })) {
      if (left.n <= 0)
        return;
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name))
          continue;
        left.n--;
        walk(path11.join(dir, entry.name), left);
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        left.n--;
        files.push(path11.join(dir, entry.name));
      }
    }
  };
  walk(root, { n: budget });
  return files;
}
function populateSessionStore(storePath, root, runTag = "populate-" + Date.now().toString(36), opts) {
  if (opts?.substrate === "graphify") {
    return populateGraphifySessionStore(storePath, root, runTag);
  }
  const corbell = populateFromCorbellCheckout(storePath, root, runTag);
  if (corbell.ok) {
    setMeta(storePath, "substrate", "corbell");
    setMeta(storePath, "corbell_checkout", corbell.checkoutPath);
    setMeta(storePath, "populated_at", new Date().toISOString());
    console.error(`[gi-omp] populate substrate=corbell checkout=${corbell.checkoutPath} nodes=${corbell.nodes} edges=${corbell.edges}`);
    return {
      filesIndexed: 0,
      nodes: corbell.nodes,
      edges: corbell.edges,
      runTag,
      skipped: false,
      substrate: "corbell",
      corbellCheckout: corbell.checkoutPath
    };
  }
  console.error(`[gi-omp] populate falling back to the mechanical indexer: ${corbell.reason} (warm with: bun scripts/corbell-build.ts --target '${root}')`);
  const files = collectTsFiles(root, POPULATE_FILE_BUDGET);
  const db = openTypedStore(storePath);
  try {
    db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
    db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
  } finally {
    db.close();
  }
  const contents = new Map;
  const labelIndex = new Map;
  const EXPORT_STAR_RE = /export\s*\*\s*from\s*['"]([^'"]+)['"]/g;
  const EXPORT_TYPE_RE = /export\s+type\s*\{([^}]*)\}(?:\s*from\s*['"][^'"]*['"])?/g;
  for (const abs of files) {
    const rel = path11.relative(root, abs).split(path11.sep).join("/");
    let content = "";
    try {
      content = fs10.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    contents.set(rel, content);
    const indexName = (name) => {
      const canon = `Function:${name}:${rel}`;
      const list = labelIndex.get(name) ?? [];
      if (!list.includes(canon))
        list.push(canon);
      labelIndex.set(name, list);
    };
    for (const name of parseExports(content))
      indexName(name);
    let tm;
    EXPORT_TYPE_RE.lastIndex = 0;
    while ((tm = EXPORT_TYPE_RE.exec(content)) !== null) {
      for (const spec of tm[1].split(",")) {
        const s = spec.trim();
        if (!s)
          continue;
        const asMatch = /\bas\s+(\w+)\s*$/.exec(s);
        const nm = asMatch ? asMatch[1] : /^(\w+)$/.exec(s)?.[1] ?? null;
        if (nm)
          indexName(nm);
      }
    }
  }
  const starMerged = new Map;
  for (const [rel, content] of contents) {
    let sm;
    EXPORT_STAR_RE.lastIndex = 0;
    while ((sm = EXPORT_STAR_RE.exec(content)) !== null) {
      const spec = sm[1];
      if (!spec.startsWith("."))
        continue;
      const base = path11.posix.normalize(path11.posix.join(path11.posix.dirname(rel), spec)).replace(/\.(ts|js)x?$/, "");
      const cands = [`${base}.ts`, base, `${base}.js`, `${base}/index.ts`];
      let target = null;
      for (const c of cands) {
        if (contents.has(c)) {
          target = c;
          break;
        }
      }
      if (!target)
        continue;
      const tcontent = contents.get(target);
      for (const name of parseExports(tcontent)) {
        const canon = `Function:${name}:${rel}`;
        const list = labelIndex.get(name) ?? [];
        if (!list.includes(canon))
          list.push(canon);
        labelIndex.set(name, list);
        const per = starMerged.get(rel) ?? [];
        if (!per.includes(name))
          per.push(name);
        starMerged.set(rel, per);
      }
    }
  }
  const BARE_CALL_RE = /(?<![.\w])([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  const nodeRows = [];
  const edgeRows = [];
  const seenN = new Set;
  const seenE = new Set;
  for (const abs of files) {
    const rel = path11.relative(root, abs).split(path11.sep).join("/");
    const content = contents.get(rel);
    if (content === undefined)
      continue;
    const fileCanon = "File:" + rel;
    if (!seenN.has(fileCanon)) {
      seenN.add(fileCanon);
      nodeRows.push({ canonicalId: fileCanon, kind: "File", label: rel, file: rel, line: null, run: runTag });
    }
    const fnSpans = [];
    const FN_RE = /export\s+(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
    let fm;
    FN_RE.lastIndex = 0;
    while ((fm = FN_RE.exec(content)) !== null) {
      const fname = fm[1];
      let depth = 0;
      let end = content.length;
      let opened = false;
      for (let i = fm.index + fm[0].length - 1;i < content.length; i++) {
        const ch = content[i];
        if (ch === "{") {
          depth++;
          opened = true;
        } else if (ch === "}") {
          depth--;
          if (opened && depth === 0) {
            end = i;
            break;
          }
        }
      }
      fnSpans.push({ name: fname, start: fm.index, end });
    }
    const enclosingFn = (off) => {
      let best = null;
      let bestStart = -1;
      for (const s of fnSpans) {
        if (off >= s.start && off <= s.end && s.start > bestStart) {
          best = s.name;
          bestStart = s.start;
        }
      }
      return best;
    };
    const siteLine = new Map(parseExportSites(content).map((s) => [s.name, s.line]));
    for (const name of [...parseExports(content), ...starMerged.get(rel) ?? []]) {
      const canon = `Function:${name}:${rel}`;
      if (seenN.has(canon))
        continue;
      seenN.add(canon);
      nodeRows.push({ canonicalId: canon, kind: "Function", label: name, file: rel, line: siteLine.get(name) ?? null, run: runTag });
    }
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(content)) !== null) {
      const spec = m[1];
      if (!spec.startsWith("."))
        continue;
      const resolved = path11.posix.normalize(path11.posix.join(path11.posix.dirname(rel), spec));
      const dstCanon = "File:" + resolved;
      if (!seenN.has(dstCanon)) {
        seenN.add(dstCanon);
        nodeRows.push({ canonicalId: dstCanon, kind: "File", label: resolved, file: resolved, line: null, run: runTag });
      }
      const key = `${fileCanon}->${dstCanon}:imports`;
      if (seenE.has(key))
        continue;
      seenE.add(key);
      edgeRows.push({ srcCanonical: fileCanon, dstCanonical: dstCanon, predicate: "imports", evidence: `${rel} imports ${spec}`, run: runTag });
    }
    BINDINGS_RE.lastIndex = 0;
    while ((m = BINDINGS_RE.exec(content)) !== null) {
      const importOff = m.index;
      const callerFn = enclosingFn(importOff);
      const srcCanon = callerFn ? `Function:${callerFn}:${rel}` : fileCanon;
      const rawSpec = m[2];
      if (!rawSpec.startsWith("."))
        continue;
      const base = path11.posix.normalize(path11.posix.join(path11.posix.dirname(rel), rawSpec)).replace(/\.(ts|js)x?$/, "");
      const cands = [`${base}.ts`, base, `${base}.js`, `${base}/index.ts`];
      let resolvedFile = null;
      for (const c of cands) {
        if (contents.has(c)) {
          resolvedFile = c;
          break;
        }
      }
      if (!resolvedFile)
        continue;
      const targetContent = contents.get(resolvedFile);
      for (const raw of m[1].split(",")) {
        const binding = raw.split(" as ")[0].trim();
        if (!binding || !/^\w+$/.test(binding))
          continue;
        if (targetContent && !new RegExp(`(?:export\\s+(?:async\\s+)?(?:function|const|class|let|var|type|interface|enum)\\s+${binding}\\b|(?:^|\\n)\\s*(?:const|let|var|function|class|interface|type|enum)\\s+${binding}\\b|export\\s*\\{[^}]*\\b${binding}\\b)`).test(targetContent))
          continue;
        const dst = `Function:${binding}:${resolvedFile}`;
        const key = `${srcCanon}->${dst}:calls`;
        if (seenE.has(key))
          continue;
        seenE.add(key);
        edgeRows.push({ srcCanonical: srcCanon, dstCanonical: dst, predicate: "calls", evidence: `${rel} imports {${binding}} from ${rawSpec}`, run: runTag });
      }
    }
    const seenCall = new Set;
    BARE_CALL_RE.lastIndex = 0;
    while ((m = BARE_CALL_RE.exec(content)) !== null) {
      const name = m[1];
      const before = content.slice(Math.max(0, m.index - 80), m.index);
      if (/function\s*$/.test(before))
        continue;
      const dsts = labelIndex.get(name);
      if (!dsts)
        continue;
      const callerFn = enclosingFn(m.index);
      const srcCanon = callerFn ? `Function:${callerFn}:${rel}` : fileCanon;
      for (const dst of dsts) {
        if (dst.endsWith(":" + rel))
          continue;
        const key = `${srcCanon}->${dst}:calls`;
        if (seenE.has(key) || seenCall.has(key))
          continue;
        seenCall.add(key);
        seenE.add(key);
        edgeRows.push({ srcCanonical: srcCanon, dstCanonical: dst, predicate: "calls", evidence: `${rel} calls ${name} (bare-call scan)`, run: runTag });
      }
    }
  }
  const wdb = openTypedStore(storePath);
  try {
    wdb.exec("BEGIN IMMEDIATE;");
    insertForkNodesBatch(wdb, nodeRows);
    insertForkEdgesBatch(wdb, edgeRows);
    wdb.exec("COMMIT;");
  } finally {
    wdb.close();
  }
  setMeta(storePath, "substrate", "indexer-fallback");
  setMeta(storePath, "fallback_reason", corbell.reason ?? "");
  setMeta(storePath, "populated_at", new Date().toISOString());
  return {
    filesIndexed: files.length,
    nodes: nodeRows.length,
    edges: edgeRows.length,
    runTag,
    skipped: false,
    substrate: "indexer-fallback",
    fallbackReason: corbell.reason,
    corbellCheckout: corbell.checkoutPath
  };
}
function populateGraphifySessionStore(storePath, root, runTag, scope) {
  const resolvedRoot = path11.resolve(root);
  const graphPath = graphifyOutPath(resolvedRoot);
  const freshness = isGraphifyCheckoutFreshFor(resolvedRoot, graphPath, scope ?? ["src"]);
  if (!freshness.fresh) {
    const reason = `GRAPHIFY_NOT_WARM:${freshness.reason}`;
    console.error(`[gi-omp] populate substrate=graphify miss: ${reason} (build with: bun scripts/graphify-build.ts --target '${root}')`);
    return { filesIndexed: 0, nodes: 0, edges: 0, runTag, skipped: true, substrate: "graphify", fallbackReason: reason, graphifyGraph: graphPath };
  }
  const built = new GraphifyAdapter({ project: { root: resolvedRoot } }).buildSync(graphPath);
  const { nodeRows, edgeRows } = mapGraphifyToTyped(built.nodes, built.edges, runTag);
  if (nodeRows.length === 0) {
    const reason = "GRAPH_EMPTY:graphify graph produced zero nodes";
    console.error(`[gi-omp] populate substrate=graphify miss: ${reason} (graph=${graphPath})`);
    return { filesIndexed: 0, nodes: 0, edges: 0, runTag, skipped: true, substrate: "graphify", fallbackReason: reason, graphifyGraph: graphPath };
  }
  const db = openTypedStore(storePath);
  try {
    db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
    db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
    db.exec("BEGIN IMMEDIATE;");
    insertForkNodesBatch(db, nodeRows);
    insertForkEdgesBatch(db, edgeRows);
    db.exec("COMMIT;");
  } finally {
    db.close();
  }
  setMeta(storePath, "substrate", "graphify");
  setMeta(storePath, "graphify_graph", graphPath);
  setMeta(storePath, "graphify_nodes", String(nodeRows.length));
  setMeta(storePath, "graphify_edges", String(edgeRows.length));
  setMeta(storePath, "populated_at", new Date().toISOString());
  console.error(`[gi-omp] populate substrate=graphify graph=${graphPath} nodes=${nodeRows.length} edges=${edgeRows.length}`);
  return { filesIndexed: 0, nodes: nodeRows.length, edges: edgeRows.length, runTag, skipped: false, substrate: "graphify", graphifyGraph: graphPath };
}

// src/omp/ripwire-bridge.ts
import { spawnSync } from "child_process";
import * as fs11 from "fs";
import * as os4 from "os";
import * as path12 from "path";
var RIPWIRE_TIMEOUT_MS = 8000;
var RIPWIRE_MAX_BUFFER = 32 * 1024 * 1024;
function resolveRipwire(env = process.env) {
  const fromEnv = env.RIPWIRE_BIN;
  if (fromEnv && fromEnv.length > 0 && fs11.existsSync(fromEnv))
    return fromEnv;
  const home = env.HOME && env.HOME.length > 0 ? env.HOME : os4.homedir();
  const homeBin = path12.join(home, ".local", "bin", "ripwire");
  if (fs11.existsSync(homeBin))
    return homeBin;
  for (const dir of (env.PATH ?? "").split(":")) {
    if (!dir)
      continue;
    const cand = path12.join(dir, "ripwire");
    if (fs11.existsSync(cand))
      return cand;
  }
  return null;
}
function runRaw(root, args, timeoutMs, env) {
  const e = env ?? process.env;
  const bin = resolveRipwire(e);
  if (!bin)
    return { bin: null, status: null, stdout: "", stderr: "", execError: null };
  const res = spawnSync(bin, [root, ...args], {
    encoding: "utf8",
    timeout: timeoutMs ?? RIPWIRE_TIMEOUT_MS,
    maxBuffer: RIPWIRE_MAX_BUFFER,
    env: e
  });
  return {
    bin,
    status: res.status,
    stdout: String(res.stdout ?? ""),
    stderr: String(res.stderr ?? ""),
    execError: res.error ? res.error.message : null
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
        line: idx >= 0 ? Number(p.slice(idx + 1)) || 0 : 0
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
  const count = Number(j.count ?? callers.length);
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
  const reaches = Number(j.reaches ?? 0);
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
    data: { status: a.status, callers: Number(a.callers ?? 0), incompatible: Number(a.incompatible ?? 0), rows: callers }
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
      callers: Number(a.callers ?? 0),
      impact_reaches: Number(a.impact_reaches ?? 0),
      uses: Number(a.uses ?? 0),
      tested_self: Number(a.tested_self ?? 0),
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
    data: { reachable: a.reachable === "1", hops: Number(a.hops ?? 0), steps }
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
    data: { count: Number(a.count ?? 0), confidence: a.confidence ?? "" }
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
    data: { verdict: a.verdict ?? "", shape: a.shape ?? "", hops: Number(a.hops ?? 0), count: Number(a.count ?? 0), steps }
  };
}

// src/hunter/tools/bug-hunt.ts
import path23 from "path";

// src/hunter/harness/hunt-lock.ts
import fs12 from "fs";
import os5 from "os";
import path13 from "path";
var STALE_LOCK_TTL_MS = 30 * 60 * 1000;
function lockPathFor(targetPath) {
  return path13.join(targetPath, ".trident", "hunt.lock");
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
    return false;
  }
}
function isStale(payload) {
  const age = Date.now() - Date.parse(payload.acquiredAt);
  if (Number.isNaN(age))
    return true;
  if (age > STALE_LOCK_TTL_MS)
    return true;
  if (!isPidAlive(payload.pid))
    return true;
  return false;
}
function readPayload(lockPath) {
  try {
    const raw = fs12.readFileSync(lockPath, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.pid !== "number" || typeof parsed.acquiredAt !== "string")
      return null;
    return parsed;
  } catch (e) {
    console.warn(`[hunt-lock] readPayload failed for ${lockPath}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}
function acquireHuntLock(targetPath) {
  const lockPath = lockPathFor(targetPath);
  fs12.mkdirSync(path13.dirname(lockPath), { recursive: true });
  const payload = {
    pid: process.pid,
    acquiredAt: new Date().toISOString(),
    hostname: os5.hostname()
  };
  try {
    fs12.writeFileSync(lockPath, JSON.stringify(payload, null, 2), { flag: "wx" });
    return payload;
  } catch (e) {
    const code = e !== undefined && e !== null && typeof e === "object" && "code" in e ? e.code : undefined;
    if (code !== "EEXIST")
      throw e;
    const existing = readPayload(lockPath);
    if (existing && isStale(existing)) {
      try {
        fs12.unlinkSync(lockPath);
      } catch (err) {
        console.warn(`[hunt-lock] stale unlink failed for ${lockPath}: ${err instanceof Error ? err.message : String(err)}`);
      }
      try {
        fs12.writeFileSync(lockPath, JSON.stringify(payload, null, 2), { flag: "wx" });
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
    if (existing && existing.pid !== process.pid)
      return;
    fs12.unlinkSync(lockPath);
  } catch (e) {
    console.warn(`[hunt-lock] release failed for ${lockPath}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ../../OMP/Graph_Intelligence/node_modules/xstate/dist/xstate.development.cjs.mjs
var import_xstate_development_cjs = __toESM(require_xstate_development_cjs(), 1);

// src/hunter/harness/micro-loop-machine.ts
import path22 from "path";

// src/hunter/shared/db.ts
import fs13 from "fs";
import path14 from "path";
import { Database as Database5 } from "bun:sqlite";

// src/hunter/shared/migrations.ts
init_ontology();
function sqlList(values) {
  return values.map((v) => `'${v}'`).join(",");
}
var NODE_KINDS_SQL = sqlList(NODE_TYPES);
var PREDICATES_SQL = sqlList(ALL_PREDICATES);
var TYPED_GRAPH_DDL = `
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
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  evidence TEXT NOT NULL,
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

// src/hunter/shared/db.ts
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
  return new Error(`MIRROR_WRITE_FAILED: path=${mirrorPath} detail=${detail} (the MASTER_CONTEXT mirror is the awareness surface, not the truth - the .trident shared.db is the truth - D27)`);
}
function pragmaFailed(pragma, detail) {
  return new Error(`PRAGMA_FAILED: pragma=${pragma} detail=${detail} (a pragma exec failure is a loud named error - a database-is-locked on open must name the driver + the pragma, never surface as a raw sqlite throw - the store's fail-closed contract)`);
}
var SEVERITIES = ["CRIT", "HIGH", "MED", "WARN"];
var EVENT_KINDS = ["HUNT_DONE", "BUILD_DONE", "AUDIT_DONE"];
var IMPLEMENTATION_STATUSES = ["PENDING", "CHANGED", "UNCHANGED", "VERIFIED", "REJECTED"];
var CONFORMANCE_VERDICTS = ["CONFORMANT", "VIOLATED", "PARTIAL"];
var FINDING_VERDICTS = ["VIOLATION", "PASS"];
var CREATE_TABLES_SQL = `
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
  created_at INTEGER
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
`;
var MIRROR_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL,
  file TEXT, line INTEGER, lineage TEXT NOT NULL, source TEXT NOT NULL, data TEXT
);
CREATE TABLE IF NOT EXISTS graph_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL REFERENCES graph_nodes(id),
  target_id TEXT NOT NULL REFERENCES graph_nodes(id),
  kind TEXT NOT NULL, lineage TEXT NOT NULL, created_at INTEGER
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
`;
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
    const tx = this.handle.transaction(() => {
      this.handle.prepare("DELETE FROM graph_edges").run();
      this.handle.prepare("DELETE FROM graph_nodes").run();
      const nodeStmt = this.handle.prepare("INSERT INTO graph_nodes VALUES (?,?,?,?,?,?,?,?)");
      for (const n of nodes) {
        nodeStmt.run(n.id, n.kind, n.name, n.file ?? null, n.line ?? null, n.lineage, n.source, JSON.stringify(n.data ?? {}));
      }
      const edgeStmt = this.handle.prepare("INSERT INTO graph_edges (source_id,target_id,kind,lineage) VALUES (?,?,?,?)");
      for (const e of edges) {
        edgeStmt.run(e.sourceId, e.targetId, e.kind, e.lineage);
      }
    });
    tx();
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
    const persistedEvidence = finding.triad ? `${finding.evidence} | TRIAD ${JSON.stringify(finding.triad)}` : finding.evidence;
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
    const mirrorDir = path14.join(profile.project.root, "MASTER_CONTEXT", "knowledge-graph");
    const mirrorPath = path14.join(mirrorDir, "graph.db");
    let mirror;
    try {
      fs13.mkdirSync(mirrorDir, { recursive: true });
      mirror = new Database5(mirrorPath);
      applyPragmas(mirror);
      mirror.exec("DROP TABLE IF EXISTS events; DROP TABLE IF EXISTS findings; DROP TABLE IF EXISTS graph_edges; DROP TABLE IF EXISTS graph_nodes;");
      mirror.exec(MIRROR_SCHEMA_SQL);
    } catch (e) {
      throw mirrorWriteFailed(mirrorPath, `mirror open failed: ${String(e)}`);
    }
    try {
      const nodeIns = mirror.prepare("INSERT OR REPLACE INTO graph_nodes VALUES (?,?,?,?,?,?,?,?)");
      for (const row of this.handle.prepare("SELECT id,kind,name,file,line,lineage,source,data FROM graph_nodes").all()) {
        nodeIns.run(row["id"], row["kind"], row["name"], row["file"], row["line"], row["lineage"], row["source"], row["data"]);
      }
      const edgeIns = mirror.prepare("INSERT INTO graph_edges (source_id,target_id,kind,lineage,created_at) VALUES (?,?,?,?,?)");
      for (const row of this.handle.prepare("SELECT source_id,target_id,kind,lineage,created_at FROM graph_edges").all()) {
        edgeIns.run(row["source_id"], row["target_id"], row["kind"], row["lineage"], row["created_at"]);
      }
      const findIns = mirror.prepare("INSERT INTO findings (rule_id,severity,file,line,range_start,range_end,evidence,verdict,week,run_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
      for (const row of this.handle.prepare("SELECT rule_id,severity,file,line,range_start,range_end,evidence,verdict,week,run_id,created_at FROM findings").all()) {
        findIns.run(row["rule_id"], row["severity"], row["file"], row["line"], row["range_start"], row["range_end"], row["evidence"], row["verdict"], row["week"], row["run_id"], row["created_at"]);
      }
      const evIns = mirror.prepare("INSERT INTO events (kind,payload,created_at) VALUES (?,?,?)");
      for (const row of this.handle.prepare("SELECT kind,payload,created_at FROM events").all()) {
        evIns.run(row["kind"], row["payload"], row["created_at"]);
      }
    } catch (e) {
      throw mirrorWriteFailed(mirrorPath, `mirror copy failed: ${String(e)}`);
    } finally {
      mirror.close();
    }
    return mirrorPath;
  }
}
function openStore(dbPath) {
  if (dbPath !== ":memory:") {
    fs13.mkdirSync(path14.dirname(dbPath), { recursive: true });
  }
  const handle = new Database5(dbPath);
  applyPragmas(handle);
  handle.exec(CREATE_TABLES_SQL);
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

// src/hunter/diagnostics/engine.ts
import fs15 from "fs";
import path16 from "path";

// ../../OMP/Graph_Intelligence/node_modules/typescript/lib/version.cjs
var { version } = require_package();

// src/hunter/profile/loader.ts
import fs14 from "fs";
import path15 from "path";

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
    substrate: _enum(["corbell", "ix", "graphify"]),
    scope: array(string2()).min(1),
    excludes: array(string2()).default([]),
    rebuild: boolean2().optional(),
    graphifyOut: string2().min(1).optional()
  }),
  rules: object({
    corpus: array(string2()).min(1),
    bindings: record(string2(), any()).default({})
  }),
  pipeline: object({
    stages: array(PipelineStageSchema).min(1)
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
    if (/^\t/.test(trimmed))
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
      if (c === "\\")
        i++;
      else if (c === '"')
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
function parseFlowArray(inner, line) {
  const arr = [];
  if (inner.trim() === "")
    return arr;
  for (const part of splitTopLevel(inner, ",")) {
    const p = part.trim();
    if (p === "")
      continue;
    arr.push(parseFlowValue(p, line));
  }
  return arr;
}
function parseFlowMap(inner, line) {
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
    obj[k] = v === "" ? null : parseFlowValue(v, line);
  }
  return obj;
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
      else if (c === ":" && depth === 0)
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
function parseFlowValue(token, line) {
  const t = token.trim();
  if (t === "")
    return null;
  if (t.startsWith("{")) {
    if (!t.endsWith("}"))
      yamlErr([], t, line, `flow map is not closed on a single line: "${t}"`);
    return parseFlowMap(t.slice(1, -1), line);
  }
  if (t.startsWith("[")) {
    if (!t.endsWith("]"))
      yamlErr([], t, line, `flow array is not closed on a single line: "${t}"`);
    return parseFlowArray(t.slice(1, -1), line);
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
  function parseMapping(indent) {
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
          obj[key] = logical[pos].text.startsWith("-") ? parseSequence(childIndent) : parseMapping(childIndent);
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
  function parseSequence(indent) {
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
      const isMapItem = ci > 0 && !/^[{[]/.test(item) && !(item.startsWith("'") || item.startsWith('"'));
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
            itemMap[key] = logical[pos].text.startsWith("-") ? parseSequence(childIndent) : parseMapping(childIndent);
          } else {
            itemMap[key] = null;
          }
        } else {
          itemMap[key] = parseFlowValue(rest, l.line);
          if (pos < logical.length && logical[pos].indent > indent) {
            Object.assign(itemMap, parseMapping(logical[pos].indent));
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
  if (!fs14.existsSync(profilePath)) {
    throw profileInvalid("profilePath", profilePath, "the profile file must exist");
  }
  let raw;
  try {
    raw = fs14.readFileSync(profilePath, "utf8");
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
    const remedy = "MUST be written per this embedded minimal-viable-profile YAML template - fill ONLY the two <angle-bracket> paths: " + "profileVersion: 1 | project: { name: p, root: </abs/project/root>, languages: [typescript], entryPoints: [src/main.ts], build: bun run build, test: bun test } | " + "graph: { substrate: corbell, scope: [src], excludes: ['node_modules', 'dist', '.trident'] } | " + "rules: { corpus: [<path/to/existing/spec.md>] } | pipeline: { stages: [ { id: s1, entry: main, contract: stage-contract-prose } ] } | history: { failureLogs: [] } | awareness: { docs: [] }" + " | ALL-REQUIRED-TOP-LEVEL-FIELDS = profileVersion, project, graph, rules, pipeline, history, awareness";
    throw new Error(`PROFILE_INVALID (${result.error.issues.length} issue${result.error.issues.length === 1 ? "" : "s"}): ${detail} remedy=${remedy}`);
  }
  const profile = result.data;
  let resolvedRoot;
  try {
    resolvedRoot = fs14.realpathSync(profile.project.root);
  } catch {
    throw profileInvalid("project.root", profile.project.root, "the project root must exist and be a directory");
  }
  if (!fs14.existsSync(resolvedRoot) || !fs14.statSync(resolvedRoot).isDirectory()) {
    throw profileInvalid("project.root", profile.project.root, "the project root must exist and be a directory");
  }
  for (const entry of profile.rules.corpus) {
    if (!fs14.existsSync(path15.resolve(resolvedRoot, entry))) {
      throw corpusMissing(entry);
    }
  }
  for (const entry of profile.history.failureLogs) {
    if (!fs14.existsSync(path15.resolve(resolvedRoot, entry))) {
      throw historyMissing(entry);
    }
  }
  return profile;
}
// src/hunter/diagnostics/findings-store.ts
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
  for (let i = 0;i < findings.length; i++) {
    const f = findings[i];
    if (typeof f.evidence !== "string" || f.evidence.trim() === "") {
      throw findingNoTriplet(`finding ${f.ruleId} at ${f.file}:${f.line} carries an empty evidence string (landed=${i} remaining=${findings.length - i} of ${findings.length})`);
    }
    db.appendFinding(toFindingInput(f), runId, week);
  }
  return { runId, week: week ?? null, appended: findings.length };
}

// src/hunter/diagnostics/semantic-predicates.ts
init_zod();

// src/hunter/lexicon/templates.ts
init_zod();
import { createHash } from "crypto";
import { readFileSync as readFileSync6 } from "fs";
class LexiconError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = code;
    this.code = code;
  }
}
function templateBindingInvalid(templateId, detail) {
  return new LexiconError("TEMPLATE_BINDING_INVALID", `TEMPLATE_BINDING_INVALID: template=${templateId} detail=${detail} (the bound params failed the template's zod schema \u2014 an invalid binding is a loud named error, never a coerced default)`);
}
function templateMissing(templateId) {
  return new LexiconError("TEMPLATE_MISSING", `TEMPLATE_MISSING: template=${templateId} (the stored check_code names a template absent from the library \u2014 the battery cannot be reinstated)`);
}
function sha256(input) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
function readPath(obj, dotted) {
  let cur = obj;
  for (const part of dotted.split(".")) {
    if (cur === null || cur === undefined || typeof cur !== "object")
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
  if (typeof sev === "string") {
    return sev;
  }
  throw templateBindingInvalid("severity", "the severity binding must be a string");
}
function bindStringArray(bindings, key) {
  const v = bindings[key];
  if (Array.isArray(v)) {
    return v;
  }
  return [];
}
function bindStages(bindings) {
  const v = bindings["stages"];
  if (Array.isArray(v)) {
    return v;
  }
  return [];
}
function bindOperator(bindings) {
  const v = bindings["operator"];
  if (typeof v === "string" && (v === "lt" || v === "lte" || v === "gt" || v === "gte")) {
    return v;
  }
  return "gt";
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
  if (Array.isArray(v)) {
    return v;
  }
  return;
}
function contentAddress(templateId, bindings, anchor) {
  return `${templateId}:${sha256(`${anchor}|${JSON.stringify(bindings)}`).slice(0, 12)}`;
}
var CARD_FIELDS = {
  verbatimQuote: string2(),
  anchor: string2(),
  severity: _enum(SEVERITIES)
};
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
var WIRING_DEAD_MODULE = {
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
var WIRING_EXPORT_IMPORTER = {
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
          const src = readFileSync6(file, "utf-8").split(`
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
var CONTRACT_MUST_IMPLEMENT = {
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
      if (node.name !== declaredInterface && node.data?.["interface"] !== declaredInterface)
        continue;
      const members = node.data !== undefined && node.data !== null ? bindStringArray(node.data, "members") : [];
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
var PROVENANCE_TRACES_TO_SOURCE = {
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
var PROVENANCE_QUOTED_NOT_SYNTHESIZED = {
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
var DOMAIN_NUMERIC_THRESHOLD = {
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
    if (!symbol || !valuePath || typeof threshold !== "number")
      return findings;
    for (const node of ctx.graph.nodes()) {
      if (node.name !== symbol)
        continue;
      const value = readPath(node.data ?? {}, valuePath);
      if (typeof value !== "number")
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
var PROCESS_GATES_OUTPUTS = {
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
        findings.push({
          ruleId: "process.gates-measure-outputs-not-logic",
          severity: sev,
          file: cur.entry,
          line: 0,
          evidence: `stage ${cur.id} (entry ${cur.entry}) has no graph edge reaching stage ${next.id} (entry ${next.entry}) \u2014 the declared sequence is not wired in the call graph`,
          verdict: "VIOLATION"
        });
      }
    }
    return findings;
  }
};
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
    if (!spec.defMatchers.some((rx) => rx.test(n.name)))
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
var TEMPLATE_LIBRARY = {
  "wiring.no-dead-module": WIRING_DEAD_MODULE,
  "wiring.every-export-has-an-importer": WIRING_EXPORT_IMPORTER,
  "contract.must-implement": CONTRACT_MUST_IMPLEMENT,
  "provenance.traces-to-source": PROVENANCE_TRACES_TO_SOURCE,
  "provenance.quoted-not-synthesized": PROVENANCE_QUOTED_NOT_SYNTHESIZED,
  "domain.numeric-threshold": DOMAIN_NUMERIC_THRESHOLD,
  "process.gates-measure-outputs-not-logic": PROCESS_GATES_OUTPUTS
};

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
  if (!pat.familySeverity || typeof pat.familySeverity !== "string")
    return false;
  if (!sta || typeof sta.machineId !== "string" || sta.machineId.trim() === "")
    return false;
  if (typeof sta.from !== "string" || typeof sta.to !== "string")
    return false;
  if (!ev || typeof ev.file !== "string" || ev.file.trim() === "")
    return false;
  if (typeof ev.line !== "number" || !Number.isFinite(ev.line))
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
  const edgeLeg = cite ? edgeEvidence(cite) : "edge NONE (unanchored \u2014 never emitted)";
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
    console.error(`[semantic-predicates] edge anchor failed: ${String(e)}`);
    return null;
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
      if (!text.includes("process.cwd()"))
        continue;
      const lines = text.split(`
`);
      for (let i = 0;i < lines.length; i++)
        if ((lines[i] ?? "").includes("process.cwd()")) {
          const win = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 12)).join(`
`);
          if (/(writeFileSync?|appendFileSync?|mkdirSync?|createWriteStream|(?:path\.)?join|(?:path\.)?resolve).*\.trident|\.trident.*(writeFileSync?|mkdirSync?|(?:path\.)?join)/.test(win)) {
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
      if (!text.includes("setAbortFlag"))
        continue;
      const lines = text.split(`
`);
      for (let i = 0;i < lines.length; i++)
        if ((lines[i] ?? "").includes("setAbortFlag")) {
          const win = lines.slice(Math.max(0, i - 15), Math.min(lines.length, i + 15)).join(`
`);
          if (/abort/i.test(win) && !/writeStateAtomic|phase.*FAILED/.test(win)) {
            const triad = makeTriad(file, i + 1, "semantic.dual-store-lifecycle-write", sev);
            findings.push({ ruleId: "semantic.dual-store-lifecycle-write", severity: sev, file, line: i + 1, evidence: evEdge("semantic.dual-store-lifecycle-write", file, i + 1, lines[i].trim(), "HT-BUG-2", anchor), verdict: "VIOLATION", triad });
          }
        }
    }
    return findings;
  }
};
var P3 = {
  id: "semantic.unwired-enforcement",
  family: "WIRING",
  parameters: object({ ...CARD_FIELDS2 }),
  check(ctx) {
    const findings = [];
    const sev = bindSeverity2(ctx.bindings);
    for (const node of ctx.graph.nodes()) {
      if (node.kind !== "function" && node.kind !== "method" && node.kind !== "class")
        continue;
      if (!/(enforce|gate|guard|STATE_GATE)/i.test(node.name))
        continue;
      let callers;
      try {
        callers = ctx.graph.whoCalls(node.name);
      } catch (e) {
        console.error(`[semantic-predicates] P3 whoCalls failed for ${node.name}: ${String(e)}`);
        continue;
      }
      if (callers.length !== 0)
        continue;
      const file = node.file ?? "";
      if (!file)
        continue;
      const text = windowText(ctx, file);
      if (text === undefined)
        continue;
      if (!/(enforcer|gate|firewall)/i.test(file) && !/(enforcer|gate)/i.test(text.slice(0, 2000)))
        continue;
      const triad = makeTriad(file, node.line ?? 1, "semantic.unwired-enforcement", sev);
      const evidence = `[wired-dead] semantic.unwired-enforcement at ${file}:${node.line ?? 1} \u2014 ${node.name} | edge NONE inbound calls->${node.name} (whoCalls('${node.name}')=[]) | triad=semantic.unwired-enforcement`;
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
          if (!/DIAGNOSTIC_TOOLS|AUDIT_TOOLS|read/.test(win)) {
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
          } else if (!/Checkpoints/i.test(win) || !/\.trident/i.test(win)) {
            const triad = makeTriad(file, i + 1, "semantic.unscoped-walker", sev);
            findings.push({ ruleId: "semantic.unscoped-walker", severity: sev, file, line: i + 1, evidence: evEdge("semantic.unscoped-walker", file, i + 1, lines[i].trim() + " missing Checkpoints/.trident", "HT-BUG-20", anchor), verdict: "VIOLATION", triad });
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
  for (const file of uniq) {
    try {
      map.set(file, source.read(file));
    } catch (e) {
      console.error(`[engine] source read failed for ${file}: ${String(e)}`);
    }
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
    const key = `${f.ruleId}|${f.file}|${f.line}`;
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
      return 1;
  }
}
function violationFrequencies(profile, ruleIds) {
  const counts = new Map;
  for (const id of ruleIds)
    counts.set(id, 0);
  for (const logPath of profile.history.failureLogs) {
    const abs = path16.resolve(profile.project.root, logPath);
    let text;
    try {
      text = fs15.readFileSync(abs, "utf8");
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
  return {
    read(file, range) {
      const abs = path16.resolve(profile.project.root, file);
      let text;
      try {
        text = fs15.readFileSync(abs, "utf8");
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
  assertNoBlindness({
    graphNodesBefore: graph.nodes().length,
    graphNodesAfter: graph.nodes().length,
    changedNodeIds: new Set(ranked.map((f) => f.ruleId)),
    rerunNodeIds: new Set(ranked.map((f) => f.ruleId)),
    runResult: ranked
  });
  return summary;
}
var LOCAL_BUILD_SKIPS = new Set(["node_modules", ".trident", "dist", "Checkpoints", ".git"]);
function assertNoBlindness(checkpoint) {
  if (checkpoint.graphNodesAfter !== checkpoint.graphNodesBefore) {
    const before = checkpoint.graphNodesBefore;
    const after = checkpoint.graphNodesAfter;
    if (checkpoint.changedNodeIds.size > 0 && after === before) {} else if (after !== before && checkpoint.changedNodeIds.size === 0) {
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
import fs16 from "fs";
import path17 from "path";
function awarenessDocMissing(docPath) {
  return new Error(`CORPUS_MISSING: path=${docPath} remedy=the awareness doc must exist (fix the profile's awareness.docs)`);
}
var QUOTE_MARKER_RE = /^\s*>/;
function countQuotedRules(profile) {
  let count = 0;
  for (const entry of profile.rules.corpus) {
    const abs = path17.isAbsolute(entry) ? entry : path17.resolve(profile.project.root, entry);
    let text;
    try {
      text = fs16.readFileSync(abs, "utf8");
    } catch (e) {
      console.warn(`[recon] corpus file unreadable at ${abs}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
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
    const abs = path17.isAbsolute(doc) ? doc : path17.resolve(profile.project.root, doc);
    if (!fs16.existsSync(abs)) {
      throw awarenessDocMissing(doc);
    }
  }
  const dbPath = path17.join(profile.project.root, ".trident", "knowledge-graph", "shared.db");
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
    for (const row of db.prepare("SELECT payload FROM events WHERE kind = 'HUNT_DONE'").all()) {
      let payload;
      try {
        payload = JSON.parse(String(row["payload"] ?? "{}"));
      } catch (e) {
        console.warn(`[recon] HUNT_DONE payload parse failed \u2014 skipped: ${e instanceof Error ? e.message : String(e)}`);
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
    db.close();
  }
}

// src/hunter/harness/map.ts
import path18 from "path";

// src/hunter/shared/line-resolve.ts
function tryResolveLine(node, edge) {
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
    const m = /L?\s*(\d+)/.exec(v);
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
  const dbPath = path18.join(profile.project.root, ".trident", "knowledge-graph", "shared.db");
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
    if (edgeLocByTarget[e.targetId] === undefined) {
      const rec = e;
      edgeLocByTarget[e.targetId] = { source_location: rec["source_location"], metadata: rec["metadata"] };
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
    resolveLine({ line: n.line ?? undefined, data, source_location: data["source_location"] }, edgeLocByTarget[n.id] ?? null, n.id);
  }
}

// src/hunter/harness/scan.ts
import path20 from "path";

// src/hunter/lexicon/compiler.ts
import fs18 from "fs";

// src/hunter/lexicon/rule-card.ts
import fs17 from "fs";
function corpusUnreadable(corpusPath, detail) {
  return new LexiconError("CORPUS_UNREADABLE", `CORPUS_UNREADABLE: path=${corpusPath} detail=${detail} (a corpus path that cannot be read is a loud named error, never a silent skip)`);
}
function corpusEmpty() {
  return new LexiconError("CORPUS_EMPTY", `CORPUS_EMPTY: the corpus path list is empty \u2014 the profile's rules.corpus is min(1); a compile with zero corpus paths is a profile error, never an empty battery`);
}
var BLOCKQUOTE = /^\s*>\s?/;
var QUOTED_PASSAGE = /["\u201C][^"\u201D]{3,}["\u201D]/;
var RULE_SHAPE = /(^|\W)(NEVER|MUST|FUCKING|ALWAYS|ABSOLUTELY|BANNED|FORBIDDEN|MANDATORY)(\W|$)/i;
var SOFT_VOICE = /(^|\W)(may|might|could|should|perhaps|probably|maybe|consider|suggests?|possibly|ideally|eventually)(\W|$)/i;
var CONDITIONAL_HEDGE = /\bif\b[^\n]{0,60}\b(then|it would|we can|one could|may|might)\b/i;
var ARCH_TERMS = /architecture|pipeline|stage|module|layer|wiring|chain/gi;
var LOGIC_TERMS = /anchor|derive|compare|provenance|cascade|divergence|compute|inject/gi;
var PROCESS_TERMS = /audit|gate|verify|test|document|quote|evidence|harness/gi;
var DOMAIN_TERMS = /zone|liquidity|SL|TP|RRR|pip|mitigation|pressure|entry/gi;
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
var DECLARED_CLASSIFICATION = /^\s*classification\s*[:=]\s*(ARCH|LOGIC|PROCESS|DOMAIN)\b/i;
var DECLARED_SEVERITY = /^\s*severity\s*[:=]\s*(CRIT|HIGH|MED|WARN)\b/i;
function readDeclaredMeta(lines, start) {
  const meta = {};
  for (let i = start;i < lines.length && i < start + META_SCAN_WINDOW; i++) {
    const line = lines[i];
    if (line.trim() === "")
      break;
    if (isRuleShaped(line) || isQuotedPassage(line) || isBlockquote(line))
      break;
    const cm = line.match(DECLARED_CLASSIFICATION);
    if (cm && !meta.classification && isClassification(cm[1]))
      meta.classification = cm[1];
    const sm = line.match(DECLARED_SEVERITY);
    if (sm && !meta.severity && isSeverity(sm[1]))
      meta.severity = sm[1];
  }
  return meta;
}
var META_SCAN_WINDOW = 4;
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
  return { text: collected.join(" ").trim() };
}
function extractInlineQuote(line) {
  const m = line.match(/["\u201C]([^"\u201D]+)["\u201D]/);
  return m ? m[1].trim() : line.trim();
}
function makeCard(quote, anchor, sourceLine, declared) {
  const { classification: voted, ambiguous } = classify(quote);
  const proposed = ambiguous || quote.trim().length === 0 || voiceAmbiguous(quote) ? 1 : 0;
  return {
    verbatimQuote: quote,
    anchor,
    classification: declared?.classification ?? voted,
    severity: declared?.severity ?? rate(quote),
    proposed
  };
}
function extractRuleCards(corpusPaths) {
  if (corpusPaths.length === 0)
    throw corpusEmpty();
  const cards = [];
  for (const file of corpusPaths) {
    const lines = readLinesOrThrow(file);
    for (let i = 0;i < lines.length; i++) {
      const lineNo = i + 1;
      const anchor = `${file}:${lineNo}`;
      const line = lines[i];
      if (isBlockquote(line)) {
        const collected = collectBlockquote(lines, i);
        cards.push(makeCard(collected.text, anchor, line, readDeclaredMeta(lines, i + 1)));
      } else if (isQuotedPassage(line)) {
        cards.push(makeCard(extractInlineQuote(line), anchor, line, readDeclaredMeta(lines, i + 1)));
      } else if (isRuleShaped(line)) {
        cards.push(makeCard(line.trim(), anchor, line, readDeclaredMeta(lines, i + 1)));
      }
    }
  }
  return cards;
}
function readLinesOrThrow(file) {
  let text;
  try {
    text = fs17.readFileSync(file, "utf8");
  } catch (e) {
    throw corpusUnreadable(file, String(e));
  }
  return text.split(`
`);
}

// src/hunter/lexicon/compiled-store.ts
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
function writeBattery(db, battery) {
  if (battery.length === 0)
    return;
  const stmt = db.prepare(`INSERT OR REPLACE INTO compiled_predicates (${COMPILED_PREDICATES_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  for (const p of battery) {
    const checkCode = JSON.stringify({ template: p.template, bindings: p.bindings });
    stmt.run(p.id, p.family, p.template, JSON.stringify(p.bindings), p.verbatimQuote, p.anchor, p.severity, checkCode, p.batteryVersion, "PENDING");
  }
}
function writeRuleCards(db, cards, corpusHash) {
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM rule_cards WHERE corpus_hash = ?").run(corpusHash);
    const ins = db.prepare("INSERT INTO rule_cards (quote,anchor,classification,severity,proposed,corpus_hash) VALUES (?,?,?,?,?,?)");
    for (const c of cards) {
      ins.run(c.verbatimQuote, c.anchor, c.classification, c.severity, c.proposed, corpusHash);
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
function loadBattery(db, batteryVersion) {
  const rows = db.prepare("SELECT id,family,template,bindings,verbatim_quote,anchor,severity,check_code,battery_version FROM compiled_predicates WHERE battery_version = ?").all(batteryVersion);
  return rows.map((row) => rehydrate(row));
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
function batteryName(profile) {
  const cards = extractRuleCards(profile.rules.corpus);
  if (cards.length === 0)
    return "rules";
  const first = cards[0];
  const stem = first.anchor.split("/").pop()?.split(".")[0] ?? "rules";
  return `${first.classification.toLowerCase()}-${stem}`;
}
function batteryVersion(profile) {
  const corpusText = profile.rules.corpus.map((p) => {
    let text;
    try {
      text = fs18.readFileSync(p, "utf8");
    } catch (e) {
      throw corpusUnreadable(p, String(e));
    }
    return `${p}
${text}`;
  }).join(`
`);
  const hash = sha256(`${corpusText}
${JSON.stringify(profile.rules.bindings)}`);
  return `${projectTokenSlug(profile.project.name)}-${batteryName(profile)}-battery-v1 (fingerprint: ${hash.slice(0, 12)})`;
}
function selectTemplate(card) {
  switch (card.classification) {
    case "ARCH":
      return TEMPLATE_LIBRARY[ARCH_TEMPLATE_KEY];
    case "LOGIC":
      return TEMPLATE_LIBRARY["provenance.traces-to-source"];
    case "PROCESS":
      return TEMPLATE_LIBRARY["process.gates-measure-outputs-not-logic"];
    case "DOMAIN":
      return TEMPLATE_LIBRARY["domain.numeric-threshold"];
    default:
      return TEMPLATE_LIBRARY["process.gates-measure-outputs-not-logic"];
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
    const verbatimQuote = String(binding["verbatimQuote"] ?? "");
    if (!verbatimQuote || verbatimQuote.trim() === "") {
      throw new LexiconError("D13_VIOLATION", `D13_VIOLATION: declaredPredicate ${ruleId} lacks a verbatim quote \u2014 doctrine is QUOTED, never synthesized`);
    }
    const anchor = String(binding["anchor"] ?? `${ruleId}`);
    const severity = severityFromBinding(binding["severity"]);
    battery.push(compileTemplate(template, binding, { verbatimQuote, anchor, severity }, version));
  }
  return battery;
}
async function compile(profile) {
  const version = batteryVersion(profile);
  const cards = extractRuleCards(profile.rules.corpus);
  return [...compileCards(cards, profile, version), ...compileDeclared(profile, version)];
}
async function compileBattery(profile, db) {
  const version = batteryVersion(profile);
  if (db) {
    const row = db.prepare("SELECT COUNT(*) AS c FROM compiled_predicates WHERE battery_version = ?").get(version);
    if (Number(row?.["c"] ?? 0) > 0) {
      return { battery: loadBattery(db, version), batteryVersion: version, fromCache: true };
    }
  }
  const cards = extractRuleCards(profile.rules.corpus);
  const battery = [...compileCards(cards, profile, version), ...compileDeclared(profile, version)];
  if (db) {
    writeRuleCards(db, cards, version);
    writeBattery(db, battery);
  }
  return { battery, batteryVersion: version, fromCache: false };
}
function severityFromBinding(v) {
  if (typeof v === "string" && SEVERITIES.includes(v)) {
    return v;
  }
  return "HIGH";
}

// src/hunter/diagnostics/calibration.ts
import fs19 from "fs";
import path19 from "path";
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
  battery;
  fixtures;
  fixtureVersion;
  dryRun;
  fireByPred = new Map;
  silentByPred = new Map;
  verdicts = new Map;
  calibratedAt;
  constructor(battery, fixtures, fixtureVersion, dryRun = true) {
    this.battery = battery;
    this.fixtures = fixtures;
    this.fixtureVersion = fixtureVersion;
    this.dryRun = dryRun;
    this.calibratedAt = Date.now();
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
    const corpusHash = sha256(this.battery.map((p) => `${p.anchor}
${p.verbatimQuote}`).join(`
`));
    const bindingsHash = sha256(this.battery.map((p) => JSON.stringify(p.bindings)).join(`
`));
    const fixturesHash = sha256(`${this.serializeFixtures()}|${fixtureVersion}`);
    return sha256(`${corpusHash}|${bindingsHash}|${fixturesHash}`);
  }
  serializeFixtures() {
    const graphOf = (graph) => ({
      nodes: graph.nodes().map((n) => ({
        id: n.id,
        kind: n.kind,
        name: n.name,
        file: n.file ?? null,
        line: n.line ?? null,
        lineage: n.lineage,
        source: n.source,
        data: n.data ?? null
      }))
    });
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
      const failedTest = verdict === "CALIBRATED" ? undefined : fire.result === "MISS" ? silent.result === "FALSE-FIRE" ? "BOTH" : "FIRE" : "SILENT";
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
    if (write) {
      const recordPath = write.recordPath ?? path19.join(profile.project.root, ".trident", "bug-hunter");
      if (write.db) {
        this.writeCalibrationRows(write.db, records, fixtureVersion);
      }
      this.writeCalibrationRecord(recordPath, { version, records, excluded, coverageNote });
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
      const hit = findings.some((f) => f.ruleId === p.id && f.verdict === "VIOLATION" && f.file.endsWith(fixture.file) && f.line >= fixture.line - 2 && f.line <= fixture.line + 2);
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
    if (typeof f.source !== "string") {
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
    if (typeof g.source !== "string") {
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
    if (verdict) {
      this.verdicts.set(p.id, verdict);
      markCalibrated(p, verdict);
    } else {
      markCalibrated(p, "PENDING");
    }
  }
  writeCalibrationRows(db, records, fixtureVersion) {
    const ins = db.prepare("INSERT INTO calibrations (predicate_id,test,fixture,result,evidence,run_id,created_at) VALUES (?,?,?,?,?,?,?)");
    const runId = `calibration-${fixtureVersion}`;
    for (const r of records) {
      ins.run(r.predicateId, "FIRE", r.fire.fixtureAnchor, r.fire.fired ? "FIRED" : "MISS", r.fire.evidence, runId, Date.now());
      ins.run(r.predicateId, "SILENT", r.silent.goldenFixture, r.silent.findings === 0 ? "SILENT" : "FALSE-FIRE", r.silent.evidence, runId, Date.now());
    }
  }
  writeCalibrationRecord(recordPath, data) {
    fs19.mkdirSync(recordPath, { recursive: true });
    const existing = fs19.readdirSync(recordPath).filter((f) => /^CALIBRATION_v\d+\.md$/.test(f)).length;
    const n = existing + 1;
    const file = path19.join(recordPath, `CALIBRATION_v${n}.md`);
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
    fs19.writeFileSync(file, body);
  }
}
async function runCalibration(profile, fixtures, opts = {}) {
  try {
    const fixtureVersion = opts.fixtureVersion ?? "v1";
    const battery = opts.battery ?? await compile(profile);
    const gate = new CalibrationGate(battery, fixtures, fixtureVersion, opts.dryRun ?? true);
    return gate.run(profile, fixtureVersion, opts.db || opts.recordPath ? { db: opts.db, recordPath: opts.recordPath } : undefined);
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
function resolveCorpusPaths(profile) {
  const corpus = profile.rules.corpus.map((entry) => path20.isAbsolute(entry) ? entry : path20.resolve(profile.project.root, entry));
  return {
    ...profile,
    rules: { ...profile.rules, corpus }
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
      const bindingsAny = normalized.rules?.bindings ?? {};
      const rawFixtures = bindingsAny.calibrationFixtures;
      const isRecord = typeof rawFixtures === "object" && rawFixtures !== null;
      const fireField = isRecord ? rawFixtures.fire : undefined;
      const goldenField = isRecord ? rawFixtures.golden : undefined;
      const fixtures = {
        fire: Array.isArray(fireField) ? fireField : [],
        golden: Array.isArray(goldenField) ? goldenField : []
      };
      const hasFixtures = fixtures.fire.length > 0 || fixtures.golden.length > 0;
      if (hasFixtures) {
        const cal = await runCalibration(normalized, fixtures, { battery, dryRun: true });
        if (cal.excluded.length > 0) {
          liveBattery = cal.liveBattery;
          console.warn(`[scan] D17 calibration: ${cal.excluded.length} FLAGGED \u2192 EXCLUDED; ${cal.coverageNote}`);
        }
      }
    } catch (calErr) {
      console.warn(`[scan] D17 calibration gate failed (non-fatal, battery unchanged): ${calErr instanceof Error ? calErr.message : String(calErr)}`);
    }
    const run = runBattery(liveBattery, adapter, normalized, runId, db);
    return { battery, batteryVersion, run };
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
  const first = f.evidence.split(/\n|\.\s/)[0]?.trim() ?? f.evidence;
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
    const evidenceLen = f.evidence.split(/\s+->\s+|,|\n/).filter((s) => s.trim().length > 0).length;
    let footprint = 0;
    try {
      const calls = graph.whoCalls(f.ruleId);
      footprint = Math.min(10, calls.length);
    } catch (e) {
      console.warn(`[trace] graph whoCalls query failed \u2014 the honest 0 footprint: ${e instanceof Error ? e.message : String(e)}`);
      footprint = 0;
    }
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
  for (const t of traces)
    traceByFinding.set(t.findingId, t);
  const relevanceOf = (f) => {
    const t = traceByFinding.get(findingIdOf(f));
    if (!t)
      return 0;
    return Object.values(t.relevance).reduce((s, v) => s + v, 0);
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
    return findingIdOf(a) < findingIdOf(b) ? -1 : 1;
  });
  const fixOrder = ordered.map((f) => findingIdOf(f));
  return { findings: ordered, fixOrder };
}

// src/hunter/harness/report.ts
import fs20 from "fs";
import path21 from "path";

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
    whyBroken: trace?.rootCause ?? `the ${f.ruleId} predicate fired on the evidence at ${anchor}`,
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
    entries = fs20.readdirSync(projectRoot);
  } catch {
    return null;
  }
  for (const form of MASTER_CONTEXT_VARIANTS) {
    if (entries.includes(form)) {
      return path21.join(projectRoot, form);
    }
  }
  return null;
}
var REPORT_FILE_RE = /^bug_hunter_report_v(\d+)\.md$/;
function nextReportVersion(masterContextDir) {
  let names = [];
  try {
    names = fs20.readdirSync(masterContextDir);
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
  const masterContextDir = resolveMasterContextDir(input.projectRoot) ?? path21.join(input.projectRoot, "MASTER_CONTEXT");
  fs20.mkdirSync(masterContextDir, { recursive: true });
  const version = nextReportVersion(masterContextDir);
  const reportPath = path21.join(masterContextDir, `bug_hunter_report_v${version}.md`);
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
    lines.push(`### ${f.id} [${f.severity}]`, "", `rule: ${f.rule}`, "", "evidence:", "", "```", f.evidence, "```", "");
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
  const document = lines.join(`
`);
  fs20.writeFileSync(reportPath, document, "utf-8");
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
    for (const s of sections) {
      appendReportSection(input.db, s, input.runId);
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
      const raw = fs20.readFileSync(writerResult.reportPath, "utf-8");
      let stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, "");
      const titleMatch = stripped.match(/^# .*$/m);
      if (titleMatch && titleMatch.index !== undefined && titleMatch.index > 0) {
        stripped = stripped.substring(titleMatch.index);
      }
      if (stripped !== raw) {
        fs20.writeFileSync(writerResult.reportPath, stripped, "utf-8");
        console.log("[report] thinking-strip applied \u2014 removed", raw.length - stripped.length, "chars of meta-commentary");
      }
    } catch (stripErr) {
      console.warn("[report] thinking-strip failed (non-fatal):", stripErr instanceof Error ? stripErr.message : String(stripErr));
    }
    appendEvent(input.db, "HUNT_DONE", {
      runId: input.runId,
      reportPath: writerResult.reportPath,
      findingsCount: writerResult.findingsCount,
      batteryVersion: input.batteryVersion,
      fixOrder: input.fixOrder
    });
    try {
      const insertFact = input.db.prepare("INSERT INTO graph_facts (subject, predicate, object, evidence, confidence, created_at) VALUES (?,?,?,?,?,?)");
      for (const f of input.findings) {
        if (f.verdict === "VIOLATION") {
          insertFact.run(f.file, "has_finding", f.ruleId, String(f.evidence).slice(0, 500), 0.8, Date.now());
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
          const dbPath = path22.join(profileOverride.project.root, ".trident", "knowledge-graph", "shared.db");
          const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
          const slug = profileOverride.project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project";
          const store = openStore(dbPath);
          let seq = 0;
          try {
            const prefix = `${slug}-hunt-${day}-`;
            for (const row of store.prepare("SELECT payload FROM events WHERE kind = 'HUNT_DONE'").all()) {
              try {
                const payload = JSON.parse(String(row["payload"] ?? "{}"));
                if (typeof payload.runId === "string" && payload.runId.startsWith(prefix)) {
                  const rest = payload.runId.slice(prefix.length);
                  if (/^\d+$/.test(rest))
                    seq = Math.max(seq, Number(rest));
                }
              } catch {}
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
  const handle = {
    stop() {
      sub.unsubscribe();
      for (const d of handleDisposables.splice(0))
        d.unsubscribe();
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
      return new Promise((resolve) => {
        if (actor.getSnapshot().status === "done") {
          resolve();
          return;
        }
        const sub2 = actor.subscribe((s) => {
          if (s.status === "done") {
            sub2.unsubscribe();
            resolve();
          }
        });
        const sub3 = actor.subscribe((s) => {
          const value = typeof s.value === "string" ? s.value : Object.values(s.value)[0];
          if (value === "inconclusive") {
            sub3.unsubscribe();
            resolve();
          }
        });
        handleDisposables.push(sub2, sub3);
      });
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
  return;
}
function namedError(e) {
  if (e instanceof Error)
    return e.message;
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
  acquireHuntLock(args.targetPath);
  try {
    const machine = createMicroLoop({
      targetPath: args.targetPath,
      profilePath: args.profilePath,
      ...args.adapter ? { adapter: args.adapter } : {},
      ...args.profile ? { profile: args.profile } : {},
      ...args.battery ? { battery: args.battery } : {},
      ...args.reportWriter ? { reportWriter: args.reportWriter } : {}
    });
    try {
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
        machine.context.db?.close();
      } catch {}
      machine.stop();
    }
  } finally {
    try {
      releaseHuntLock(args.targetPath);
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
        const profilePath = typeof p.profilePath === "string" && p.profilePath.length > 0 ? p.profilePath : path23.join(scopeRoot, "profile.yaml");
        try {
          const result = await spawnBugHunterLoop({ targetPath, profilePath });
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
      } catch (e) {
        const err = e;
        const code = "code" in err ? String(err.code) : "GI_QUERY_FAIL";
        return textResult(`${code}: ${String(e)}`, { ok: false, error: code });
      }
    }
  });
}

// src/hunter/surface/query-tool.ts
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
      return mustImplement(db);
    case "unwired":
      return unwired(db, adapter);
    case "rule":
      return rule(input, db);
    case "violations":
      return violations(input, db);
    case "consistency":
      return consistency(db);
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
  const queue = startIds.map((s) => ({ id: s.canonical_id, steps: [] }));
  while (queue.length > 0 && queue[0].steps.length < MAX_DEPTH) {
    const cur = queue.shift();
    if (visited.has(cur.id))
      continue;
    visited.add(cur.id);
    const out = rowsAs(db.prepare(`
        SELECT dst.canonical_id AS dst_id, dst.label AS dst_label,
               dst.file AS dst_file, dst.line AS dst_line, e.predicate AS predicate
        FROM typed_edges e
        JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id
        WHERE e.src_canonical = ? AND e.predicate = 'calls' AND e.superseded_run IS NULL
      `).all(cur.id), "chain edges");
    for (const e of out) {
      const step = {
        from: cur.id,
        to: e.dst_label,
        kind: e.predicate,
        file: e.dst_file ?? "",
        line: e.dst_line ?? 0
      };
      if (toSet.has(e.dst_label) && !(from === to && cur.steps.length === 0)) {
        return formatRows([...cur.steps, step], input.format);
      }
      queue.push({ id: e.dst_id, steps: [...cur.steps, step] });
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
function mustImplement(db) {
  const spec = rowsAs(db.prepare("SELECT id, name, source, data FROM graph_nodes WHERE lineage = 'SPEC_DERIVED' AND kind = 'stage'").all(), "must-implement spec");
  const code = rowsAs(db.prepare("SELECT name FROM graph_nodes WHERE lineage = 'CODE_DERIVED'").all(), "must-implement code");
  const codeNames = new Set(code.map((r) => r.name));
  return spec.filter((s) => !codeNames.has(stageEntry(s))).map((s) => ({ stage: s.name, entry: stageEntry(s), id: s.id, declaredSource: s.source, status: "MUST_IMPLEMENT" }));
}
function unwired(db, adapter) {
  if (adapter) {
    return adapter.unwired().map((d) => ({ name: d.name, file: d.file, line: d.line, status: "UNWIRED" }));
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
  return code.map((n) => ({ name: n.label, file: n.file ?? "", line: n.line ?? 0, status: "UNWIRED" }));
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
  const rows = rowsAs(db.prepare(`SELECT rule_id, severity, file, line, evidence, verdict, week, run_id FROM findings WHERE verdict = 'VIOLATION'${byRun}${byWeek} ORDER BY CASE severity WHEN 'CRIT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MED' THEN 2 ELSE 3 END`).all(...params), "violations");
  const effectiveCap = input.format === "llm" ? MAX_QUERY_ROWS : MAX_QUERY_ROWS_FULL;
  const total = rows.length;
  const capped = rows.slice(0, effectiveCap);
  const off = Math.max(0, Math.floor(input.offset ?? 0));
  const lim = input.limit !== undefined ? Math.max(0, Math.floor(input.limit)) : effectiveCap;
  const sliced = capped.slice(off, off + lim);
  const result = [...sliced];
  result.push({ pagination: { offset: off, limit: lim, total } });
  return result;
}
function consistency(db) {
  const spec = rowsAs(db.prepare("SELECT id, name, source, data FROM graph_nodes WHERE lineage = 'SPEC_DERIVED'").all(), "consistency spec");
  const code = rowsAs(db.prepare("SELECT name FROM graph_nodes WHERE lineage = 'CODE_DERIVED'").all(), "consistency code");
  const codeNames = new Set(code.map((r) => r.name));
  return spec.filter((s) => !codeNames.has(stageEntry(s))).map((s) => ({ status: "DRIFT", specNode: s.name, entry: stageEntry(s), specId: s.id, declaredSource: s.source }));
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
  const files = rowsAs(db.prepare("SELECT DISTINCT file FROM typed_nodes WHERE label = ? AND superseded_run IS NULL AND file IS NOT NULL").all(root), "blast-radius files");
  if (files.length === 0)
    return [{ root, depth: 0, nodes: [] }];
  const seen = new Set;
  const nodes = [];
  let maxDepth = 0;
  for (const f of files) {
    const rows = rowsAs(db.prepare(`
        WITH RECURSIVE blast(file, depth) AS (
          SELECT ?, 0
          UNION
          SELECT src.file, blast.depth + 1
          FROM blast
          CROSS JOIN typed_nodes dst ON dst.file = blast.file
          CROSS JOIN typed_edges e ON e.dst_canonical = dst.canonical_id
          CROSS JOIN typed_nodes src ON src.canonical_id = e.src_canonical
          WHERE e.predicate IN ('calls', 'imports')
            AND e.superseded_run IS NULL
            AND src.file IS NOT NULL
            AND blast.depth < ?
        )
        SELECT file, MIN(depth) AS depth FROM blast WHERE depth > 0 GROUP BY file
      `).all(f.file, input.depth ?? DEFAULT_BLAST_DEPTH), "blast-radius walk");
    for (const r of rows) {
      if (seen.has(r.file))
        continue;
      seen.add(r.file);
      nodes.push({ file: r.file, depth: r.depth });
      if (r.depth > maxDepth)
        maxDepth = r.depth;
    }
  }
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
    db.close();
  }
}

// src/omp/extension.ts
var GI_TOOL_NAMES = ["graph-probe", "graph-query", "bug-hunt", "aether-code-audit"];
var GI_TOOL_NAMES_ALIASES = { "graph-code-audit": "aether-code-audit" };
var confineTargetPath = (normalized, callerCwd) => {
  let real = normalized;
  try {
    real = fs23.realpathSync(normalized);
  } catch {
    return { ok: false, error: `GI_PATH_DENIED: targetPath does not exist: '${normalized.slice(0, 120)}'` };
  }
  let st = null;
  try {
    st = fs23.statSync(real);
  } catch {
    st = null;
  }
  if (!st || !st.isDirectory()) {
    return { ok: false, error: `GI_PATH_DENIED: targetPath is not a directory: '${real.slice(0, 120)}'` };
  }
  const allowRoots = (process.env.GI_TARGET_ROOTS ?? "").split(/[:|]/).map((r) => r.trim()).filter((r) => r.length > 0);
  const roots = allowRoots.length > 0 ? allowRoots : [callerCwd, "/tmp"];
  const within = roots.some((root) => {
    const rel = path26.relative(path26.resolve(root), real);
    return rel === "" || !rel.startsWith("..") && !path26.isAbsolute(rel);
  });
  if (!within) {
    return { ok: false, error: `GI_PATH_DENIED: targetPath '${real.slice(0, 120)}' is outside the allowed roots (${roots.join(":").slice(0, 120)}); set GI_TARGET_ROOTS to extend` };
  }
  return { ok: true, real };
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
ripwire: ${rw.summary}`, { ok: true, rows: q.rows, names: q.names, callers: q.callers, substrate: substrate ?? "indexer-fallback", ripwire: rw });
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
ripwire: ${rw.summary}`, { ...w, ripwire: rw, ok: true });
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
ripwire: ${rw.summary}`, { ...sd, ripwire: rw, ok: true });
  }
  if (verb === "gate") {
    const dialRaw = String(p.dial ?? "STEER").toUpperCase();
    const sym = String(p.target ?? p.symbol ?? "");
    const rw = safeRipwire(() => ripwireEditCheck(scopeRoot, sym));
    const ga = gateAdvisory(storePath, [sym], dialRaw === "FULL" ? "FULL" : "STEER", { ok: rw.ok, summary: rw.summary });
    return textResult2(`${popNote}${ga.advisory}`, { ...ga, ripwire: rw, ok: true });
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
        try {
          clearGiRegistry();
          return textResult2("GI_CLEARED", { ok: true, token: "GI_CLEARED" });
        } catch (e) {
          const err = e;
          const code = "code" in err ? String(err.code) : "GI_CLEAR_REFUSED";
          return textResult2(`${code}: ${String(e)}`, { ok: false, error: code });
        }
      }
      const sessionID = String(ctx?.sessionID ?? "default");
      return textResult2(JSON.stringify({ token: "PROBE_TOOL_OK", sessionID, echo: p.echo ?? null }), { ok: true, token: "PROBE_TOOL_OK", sessionID });
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
      let callerId = "omp-default-session";
      if (ctx && typeof ctx === "object" && "sessionID" in ctx && typeof ctx.sessionID === "string" && String(ctx.sessionID).length > 0) {
        callerId = String(ctx.sessionID);
      }
      const sessionId = callerId;
      const substrate = typeof p.substrate === "string" ? p.substrate : "";
      const targetPathRaw = typeof p.targetPath === "string" ? p.targetPath : "";
      let scopeRoot = cwdOf(ctx && typeof ctx === "object" && "cwd" in ctx ? ctx : undefined);
      const callerCwd = cwdOf(ctx && typeof ctx === "object" && "cwd" in ctx ? ctx : undefined);
      if (targetPathRaw.length > 0) {
        if (!path26.isAbsolute(targetPathRaw)) {
          return textResult2(`GI_PATH_DENIED: targetPath must be absolute, got '${targetPathRaw.slice(0, 120)}'`, { ok: false, error: "GI_PATH_DENIED" });
        }
        const confined = confineTargetPath(path26.normalize(targetPathRaw), callerCwd);
        if (!confined.ok) {
          return textResult2(confined.error, { ok: false, error: "GI_PATH_DENIED" });
        }
        scopeRoot = confined.real;
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
          const pop = populateSessionStore(opened.storePath, scopeRoot, "graphify-" + Date.now().toString(36), { substrate: "graphify" });
          if (pop.skipped || (pop.fallbackReason ?? "").length > 0) {
            const reason = pop.fallbackReason ?? "GRAPHIFY_NOT_WARM:miss";
            return textResult2(`${reason}: graphify populate missed (graph=${graphPath}; rebuild with: bun scripts/graphify-build.ts --target '${scopeRoot}')`, { ok: false, error: reason.split(":")[0], reason, graphPath });
          }
          const popNote = `substrate=graphify graph=${graphPath} nodes=${pop.nodes} edges=${pop.edges}
`;
          return await runGraphQueryVerbs(verb, p, opened.storePath, scopeRoot, sessionId, popNote, "graphify");
        }
        let popNote = "";
        const stored = getMeta(opened.storePath, "substrate");
        const empty = countTypedNodes(opened.storePath) === 0;
        const warmPath = corbellCheckoutPath(scopeRoot);
        const warm = empty ? { fresh: false } : isCorbellCheckoutFreshFor(scopeRoot, warmPath);
        if (empty || warm.fresh && stored !== "corbell") {
          const pop = populateSessionStore(opened.storePath, scopeRoot);
          popNote = `substrate=${pop.substrate}${pop.fallbackReason ? ` reason=${pop.fallbackReason}` : ""}
`;
          return await runGraphQueryVerbs(verb, p, opened.storePath, scopeRoot, sessionId, popNote, pop.substrate);
        } else {
          popNote = `substrate=${stored ?? "indexer-fallback"}
`;
          return await runGraphQueryVerbs(verb, p, opened.storePath, scopeRoot, sessionId, popNote, stored ?? "indexer-fallback");
        }
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
    if (targetRaw !== "" && !path26.isAbsolute(targetRaw)) {
      return textResult2(`GI_PATH_DENIED: targetPath must be absolute, got '${targetRaw.slice(0, 120)}'`, { ok: false, error: "GI_PATH_DENIED" });
    }
    let targetRoot;
    if (targetRaw !== "") {
      const confined = confineTargetPath(path26.normalize(targetRaw), scopeRoot);
      if (!confined.ok) {
        return textResult2(confined.error, { ok: false, error: "GI_PATH_DENIED" });
      }
      targetRoot = confined.real;
    } else {
      const confined = confineTargetPath(path26.resolve(scopeRoot), scopeRoot);
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
        Promise.resolve().then(() => (init_templates(), exports_templates)),
        Promise.resolve().then(() => (init_auditor(), exports_auditor))
      ]);
      const { join, resolve } = await import("path");
      const template = templateByLayerId(layerId);
      if (!template) {
        return textResult2(`GI_AUDIT_NOT_WIRED: HUNTER_TEMPLATE_INVALID: unknown template '${layerId}' | ripwire: engine-binding=auditor template=invalid`, {
          ok: false,
          error: "GI_AUDIT_NOT_WIRED",
          cause: "HUNTER_TEMPLATE_INVALID"
        });
      }
      const ledgerDir = join(resolve(targetRoot), ".omp", "graph-intelligence", "audit", `${layerId}-${Date.now()}`);
      const graphPath = join(resolve(targetRoot), "graphify-out", "graph.json");
      const settlement = await runTemplateAudit({ template, ledgerDir, targetRoot, graphPath });
      if (settlement.status === "fulfilled") {
        const reportPath = join(settlement.ledgerDir, "findings", "report.md");
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
  return [...GI_TOOL_NAMES];
}
function giOmpExtension(pi) {
  const names = registerGiOmpTools(pi, (ctx) => ctx?.cwd ?? process.cwd());
  if (typeof pi.on === "function") {
    attachGiGraphGate(pi);
  }
  console.error("[gi-omp] registered " + names.join(", "));
}
export {
  GI_TOOL_NAMES,
  GI_TOOL_NAMES_ALIASES,
  giOmpExtension as default,
  registerGiOmpTools
};
