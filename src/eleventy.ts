import { fromNotion } from "./index.ts";
import type { Logger } from "./types.ts";

/** This type has a name for clarity, but is annotating a parameter that is
 * never being used. It represents the `eleventyConfig` object that Eleventy
 * passes to plugins. */
type UserConfig = unknown;

/** The plugin doesn't actually do anything Eleventy-specific, but here's a
 * handy-dandy function to hook the two together. This'll import updated pages
 * whenever a build or serve is triggered. It does _not_ cause a reimport when
 * a build is triggered as part of a change during serving or watching. */
export async function EleventyFromNotion(
  _userConfig: UserConfig,
  options: { config?: string; logger?: Logger },
): Promise<void> {
  await fromNotion(options.config, options.logger);
}
