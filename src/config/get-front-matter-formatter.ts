import type { FrontMatter } from "../types/output.ts";

/** Retrieve a formatter function that transforms an object of front matter
 * data as a string (including the front matter delimiters). */
export function getFrontMatterFormatter(
  formatter?: (frontMatter: FrontMatter) => string,
): (frontMatter: FrontMatter) => string {
  formatter ??= formatAsYaml;
  if (typeof formatter == "function") return formatter;
  throw Error("The 'formatters.frontMatter' option must be a function");
}

function isPrimitive(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value == "object") return false;
  if (typeof value == "function") return false;
  return true;
}

function formatAsYaml(frontMatter: FrontMatter): string {
  return `---\n${formatAnyAsYaml(frontMatter)}\n---\n`;
}

function formatAnyAsYaml(frontMatter: FrontMatter[string]): string {
  if (isPrimitive(frontMatter)) return JSON.stringify(frontMatter);
  if (Array.isArray(frontMatter)) return formatArrayAsYaml(frontMatter);
  return formatObjectAsYaml(frontMatter as FrontMatter);
}

function formatArrayAsYaml(array: FrontMatter[string]): string {
  if (!Array.isArray(array)) throw Error("Unreachable");
  return array.map((item) => {
    const formatted = formatAnyAsYaml(item);
    return "- " + formatted.replaceAll("\n", "\n  ");
  }).join("\n");
}

function formatObjectAsYaml(object: FrontMatter): string {
  return Object.entries(object).map(([key, value]) => {
    if (!/^[a-zA-Z_]\w*$/.test(key)) key = JSON.stringify(key);
    if (isPrimitive(value)) value = " " + JSON.stringify(value);
    else value = "\n  " + formatAnyAsYaml(value).replaceAll("\n", "\n  ");
    return key + ":" + value;
  }).join("\n");
}
