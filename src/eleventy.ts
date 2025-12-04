import { fromNotion } from "./index.ts";
import type { UserConfig } from "@11ty/eleventy";

/** The plugin doesn't actually do anything Eleventy-specific, but here's a
 * handy-dandy function to hook the two together. This'll import updated pages
 * whenever a build or serve is triggered. It does _not_ cause a reimport when
 * a build is triggered as part of a change during serving or watching. */
export async function EleventyFromNotion(
  _userConfig: UserConfig,
  options: { config?: string },
): Promise<void> {
  await fromNotion(options.config);
}
