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

/** A function to format a block into a string. Used for custom block
 * formatters. */
export type BlockFormatter<Hint = unknown> = (
  block: Block<Hint>,
) => string;

/** A function to format a certain type of rich text into a string. Used for
 * custom inline formatting. The value provided depends on the type; it has
 * to be specified through the parser for the same type. */
export type InlineFormatter<Hint = unknown> = (
  content: string,
  info: { value: Hint },
) => string;

/** A function to stringify a complex data structure into a string, used for
 * stringifying front matter. If `---` delimiters are desirable for the front
 * matter, this must be included in the returned result. */
export type DataFormatter = (data: unknown) => string;

/** Parse a block, inline or data type. */
export type Parser<Hint = unknown> = (info: Hint) => unknown;

/** A simple representation of a piece of rich text; the `.plain` property
 * contains the text without any formatting, the `.rich` property contains
 * the text as formatted by the specified inline formatters. */
export type RichText = { plain: string; rich: string };

/** A filter to mark certain pages to be skipped or deleted. May be
 * asynchronous. It should return `true` if the filter applies to the page in
 * question (e.g. `true` if a page should be skipped or deleted). */
export type PageFilter = (page: Page) => boolean | Promise<boolean>;

/** An internal type for asset management. Includes the path to the location of
 * the asset, relative to the CWD, as well as a "resolved" path for use within
 * content. The promise under the `download` key resolves once the asset has
 * finished downloading and is fully present locally on disk. */
export type Asset = {
  path: string;
  resolved: string;
  download: Promise<void>;
};
