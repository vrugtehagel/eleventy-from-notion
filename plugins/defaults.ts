import type { Config } from "../src/config.ts";
import { DefaultsData } from "./defaults-data.ts";
import { DefaultsBlock } from "./defaults-block.ts";
import { DefaultsInline } from "./defaults-inline.ts";

/** Set default parsers for properties, blocks and inline styles. This is added
 * automatically, but parsers may be overwritten if necessary. Note; only the
 * most common types have default parsers. Manually provide the missing parsers
 * if they are needed. */
export function Defaults(config: Config): void {
  config.use(DefaultsData);
  config.use(DefaultsBlock);
  config.use(DefaultsInline);
}
