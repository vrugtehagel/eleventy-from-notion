import type { EleventyOptions } from "../types/eleventy.ts";

export function getExtension(
  extension: EleventyOptions["extension"] = "html",
): string {
  const isString = typeof extension == "string";
  if (!isString) throw Error("The 'extension' option must be a string");
  if (extension.startsWith(".")) extension = extension.slice(1);
  return extension;
}
