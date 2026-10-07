import { pathToFileURL } from "node:url";
import { z } from "zod";
const mod = await import(pathToFileURL("/home/leviathan/.omp/agent/extensions/graph-intelligence/index.js").href);
const root = "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence";
const tools = {};
const pi = { registerTool:(t)=>{tools[t.name]=t;}, on:()=>{}, zod:z, config:{}, cwd:root, log:()=>{}, exec:async()=>({stdout:"",code:0}) };
// the INJECTED cwdOf — the omp runtime provides it; it resolves the ctx's cwd
const cwdOf = (ctx) => (ctx && ctx.cwd) || root;
const names = mod.registerGiOmpTools(pi, cwdOf);
console.log("★ registerGiOmpTools(pi, cwdOf) RETURNED:", JSON.stringify(names));
console.log("REGISTERED:", Object.keys(tools).length, "tools:", Object.keys(tools).join(","));
const t = tools["gi-consumption"];
const r = await t.execute({ i:"hotseat-probe", subject:"populateSessionStore", scopeRoot: root }, { cwd: root });
console.log("★ gi-consumption LIVE RESULT:", JSON.stringify(r).slice(0, 500));
