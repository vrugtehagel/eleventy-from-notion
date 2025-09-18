import type { EleventyOptions } from "../types/eleventy.ts";

export function getExtension(
  extension: EleventyOptions["extension"],
  language?: "md" | "html",
): string {
  if (!verifyString(extension, "extension")) verifyString(language, "language");
  const value = extension ?? language ?? "html";
  if (value.startsWith(".")) return value.slice(1);
  return value;
}

function verifyString(value: unknown, name: string): boolean {
  if (value == null) return false;
  if (typeof value == "string") return true;
  throw Error(`The "${name}" option must be a string`);
}
