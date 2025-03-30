import type { EleventyOptions } from "../types/eleventy.ts";

/** Given the Eleventy input directory and a user-specified output path, return
 * the full path to the directory in which to output the Notion templates. */
export function getOutputPath(
  eleventyInput: string,
  path: EleventyOptions["output"] = "notion/",
): string {
  const isString = typeof path == "string";
  if (!isString) throw Error("The 'output' option must be a string");
  if (path.startsWith("/")) path = path.slice(1);
  if (!path.endsWith("/")) path += "/";
  if (!eleventyInput.endsWith("/")) eleventyInput += "/";
  return eleventyInput + path;
}
