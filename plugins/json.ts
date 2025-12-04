import type { Config } from "../src/config.ts";

/** Format front matter as JSON. Note that this is, in theory, compatible with
 * YAML parsers and significantly faster to stringify. */
export function Json(config: Config): void {
  config.setDataFormatter((data) => {
    return `---json\n${JSON.stringify(data, null, 2)}\n---\n`;
  });
}
