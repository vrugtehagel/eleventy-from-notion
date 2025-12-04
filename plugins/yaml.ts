import type { Config } from "../src/config.ts";

/** Format front matter as YAML. */
export function Yaml(config: Config): void {
  config.setDataFormatter((data) => `---\n${formatAny(data)}\n---\n`);
}

function formatAny(thing: unknown): string {
  if (thing == null) return "null";
  if (typeof thing != "object") return JSON.stringify(thing);
  if (Array.isArray(thing)) return formatArray(thing);
  return formatObject(thing);
}

function formatArray(things: unknown[]): string {
  return things.map((thing) => {
    return "- " + formatAny(thing).replaceAll("\n", "\n  ");
  }).join("\n");
}

function formatObject(things: object): string {
  return Object.entries(things).map(([key, thing]) => {
    if (!/^[a-zA-Z_]\w*$/.test(key)) key = JSON.stringify(key);
    if (thing == null) return key + ": null";
    const isObject = typeof thing == "object" || typeof thing == "function";
    if (!isObject) return key + ": " + JSON.stringify(thing);
    return key + ":\n  " + formatAny(thing).replaceAll("\n", "\n  ");
  }).join("\n");
}
