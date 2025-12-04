import type { Config } from "./config.ts";
import type { Page } from "./page.ts";
import type { Block } from "./block.ts";

/** Internal shape of the `.notion` file used to prevent pages from being
 * imported every single time. This is subject to change; do not use the
 * `.notion` file, use methods on the configuration object instead. */
export type Cache = {
  /** Time of the last successfully completed import. Can be manually set to
   * `0` to force a full reimport. */
  lastUpdated?: number;
};

/** A plugin receives a single argument; the `config` object. This is exactly
 * the same object as the one passed to the Notion configuration function. */
export type Plugin = (config: Config) => unknown;

/**  */
export type BlockFormatter<Hint = unknown> = (
  block: Block<Hint>,
) => string;

export type InlineFormatter<Hint = unknown> = (
  content: string,
  info: { value: Hint },
) => string;

export type DataFormatter = (data: unknown) => string;

export type Parser<Hint = unknown> = (info: Hint) => unknown;

export type RichText = { plain: string; rich: string };

export type PageFilter = (page: Page) => boolean | Promise<boolean>;
