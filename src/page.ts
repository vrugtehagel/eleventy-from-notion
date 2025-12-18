import type * as Notion from "@notionhq/client";
import * as fs from "node:fs/promises";
import { error } from "./error.ts";
import type { Config } from "./config.ts";
import type { Block } from "./block.ts";

/** Represents a Notion page in its entirety. */
export class Page {
  #raw: Notion.PageObjectResponse;
  #config: Config;
  #children: Block[] | null = null;
  #frontMatter: Record<string, unknown> | null = null;
  #skipped: boolean = false;
  #deleted: boolean = false;

  static #setNested(
    object: Record<string, unknown>,
    nesting: string[],
    value: unknown,
  ): void {
    if (nesting.length == 0) throw error`cannot-nest-in-nothing`;
    const [key, ...keys] = nesting;
    const isInvalid = keys.length > 0 && typeof object[key] != "object";
    if (isInvalid) throw error`cannot-nest-in-primitive`;
    else if (keys.length == 0) object[key] = value;
    else this.#setNested(object[key] as Record<string, unknown>, keys, value);
  }

  constructor(page: Notion.PageObjectResponse, config: Config) {
    this.#raw = page;
    this.#config = config;
  }

  /** Get the front matter as a formatted object as per the specified data
   * parser. */
  get frontMatter(): Record<string, unknown> {
    if (this.#frontMatter) return this.#frontMatter;
    this.#frontMatter = {};
    const properties = this.#config.getProperties();
    for (const [name, nesting] of properties) this.#setProperty(name, nesting);
    const meta = this.#config.getMeta();
    for (const [name, nesting] of meta) this.#setMeta(name, nesting);
    return this.#frontMatter;
  }

  /** Get the output filename for this page. */
  get filename(): string {
    const extension = this.#config.getOutputExtension();
    const name = this.#raw.id.replaceAll("-", "");
    return `${name}.${extension}`;
  }

  /** Get the full output file path for this page. This also takes into
   * account the configured output directory for the pages. */
  get path(): string {
    return this.#config.getOutputDirectory() + this.filename;
  }

  /** Set a (potentially nested) property in the front matter. */
  #setProperty(name: string, nesting: string[]): void {
    const value = this.getProperty(name);
    Page.#setNested(this.#frontMatter!, nesting, value);
  }

  /** Retrieve a sibling block relative to a child block. This is used to
   * provide `next` and `previous` getters on blocks; the `Block` interface
   * must also have this method. */
  getSibling(block: Block, offset: number): Block | null {
    if (offset == 0) return block;
    if (!this.#children) throw error`${"page"}-lacks-children`;
    const index = this.#children.indexOf(block);
    if (index == -1) return null;
    return this.#children[index + offset] ?? null;
  }

  /** Get a property from the raw Notion page object, formatted as specified by
   * the configured data parser. */
  getProperty(name: string): unknown {
    const exists = name in this.#raw.properties;
    if (!exists) throw error`property-${name}-not-found`;
    const property = this.#raw.properties[name];
    const { type } = property;
    const parser = this.#config.getDataParser(type);
    return parser(property[type as keyof typeof property]);
  }

  /** Set a (potentially nested) property in the front matter based on some
   * metadata property on the Notion page object. */
  #setMeta(name: string, nesting: string[]): void {
    const value = this.getMeta(name);
    Page.#setNested(this.#frontMatter!, nesting, value);
  }

  /** Get a metadata property from the raw Notion page object, formatted as
   * specified by the configured data parser. */
  getMeta(name: string): unknown {
    const exists = name in this.#raw;
    if (!exists) throw error`meta-${name}-not-found`;
    const parser = this.#config.getDataParser(name);
    return parser(this.#raw[name as keyof Notion.PageObjectResponse]);
  }

  /** Retrieve the formatted markup for the content of this page. */
  async getPageContent(): Promise<string> {
    const blocks = await this.#config.getBlocks(this.#raw.id, this);
    this.#children = blocks;
    const promises = blocks.map((block) => block.format());
    const parts = await Promise.all(promises);
    return parts.join("");
  }

  /** Whether or not the page was skipped during the import process. */
  get skipped(): boolean {
    return this.#skipped;
  }

  /** Whether or not the page was deleted during the writing process. */
  get deleted(): boolean {
    return this.#deleted;
  }

  /** Writes the file, unless it is filtered out by configured skip filters or
   * scheduled for deletion through configured delete filters. In the latter
   * case, the file is deleted instead of written to. This encapsulates the
   * whole import process; from importing the blocks, to stringifying content
   * and front matter, lastly writing it to disk in the specified location. The
   * output directory must already exist (but the file itself is created if it
   * does not yet exist). */
  async write(): Promise<void> {
    const shouldSkip = await this.#config.shouldSkip(this);
    this.#skipped = shouldSkip;
    if (shouldSkip) return;
    const shouldDelete = await this.#config.shouldDelete(this);
    this.#deleted = shouldDelete;
    const path = this.path;
    if (shouldDelete) return await fs.unlink(path).catch(() => {});
    const dataFormatter = this.#config.getDataFormatter();
    const frontMatter = dataFormatter(this.frontMatter);
    const content = await this.getPageContent();
    const output = frontMatter + content;
    await fs.writeFile(path, output, "utf8");
  }
}
