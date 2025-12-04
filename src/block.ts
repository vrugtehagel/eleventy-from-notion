import * as Notion from "@notionhq/client";
import { error } from "./error.ts";
import type { Config } from "./config.ts";
import type { Page } from "./page.ts";

/** This class semantically represents a block as given by the Notion API, but
 * provides some helper getters that provide some user-facing contextual
 * information for block formatters. This makes it easier to stringify pages as
 * a whole. */
export class Block<Hint = unknown> {
  #raw: Notion.BlockObjectResponse;
  #config: Config;
  #parent: Block | Page | null = null;
  #children: Block[] | null = null;
  #info: Hint | null = null;
  #content: string | null = null;
  #body: string | null = null;
  #formatted: string | null = null;

  constructor(
    block: Notion.BlockObjectResponse,
    config: Config,
    parent: Block | Page,
  ) {
    this.#raw = block;
    this.#config = config;
    this.#parent = parent;
  }

  /** Retrieve a sibling block relative to a child block. This is used to
   * provide `next` and `previous` getters; the `Page` interface must also have
   * this method. */
  getSibling(block: Block, offset: number): Block | null {
    if (offset == 0) return block;
    if (!this.#children) throw error`${"block"}-lacks-children`;
    const index = this.#children.indexOf(block);
    if (index == -1) return null;
    return this.#children[index + offset] ?? null;
  }

  /** Format the block as per the specified block formatter. This must be
   * called before the getters can be invoked. */
  async format(): Promise<string> {
    if (this.#formatted != null) return this.#formatted;
    await this.#getBody();
    const formatter = this.#config.getBlockFormatter(this.type);
    this.#formatted = formatter(this);
    return this.#formatted!;
  }

  /** Get the body of the block. This is effectively its children already
   * formatted. */
  async #getBody(): Promise<string> {
    if (this.#body != null) return this.#body;
    const children = await this.#getChildren();
    const promises = children.map((child) => child.format());
    const body = await Promise.all(promises);
    this.#body = body.join("");
    return this.#body;
  }

  /** Get the block's child blocks. This does not have an associated getter. */
  async #getChildren(): Promise<Block[]> {
    if (this.#children != null) return this.#children;
    this.#children = [];
    if (!this.#raw.has_children) return this.#children;
    this.#children = await this.#config.getBlocks(this.#raw.id, this);
    return this.#children;
  }

  /** Get the block type as per the Notion API, e.g. "heading_1" or
   * "numbered_list_item". */
  get type(): Notion.BlockObjectResponse["type"] {
    return this.#raw.type;
  }

  /** Get the previous sibling block, or `null` if there isn't one. */
  get previous(): Block | null {
    return this.#parent?.getSibling(this, -1) ?? null;
  }

  /** Get the next sibling block, or `null` if their isn't one. */
  get next(): Block | null {
    return this.#parent?.getSibling(this, 1) ?? null;
  }

  /** Get a block's info as defined by the block parser for this block's type.
   * A block parser _must_ be defined; if no block parser for this type exists,
   * an error is thrown (within `.getBlockParser()`). */
  get info(): Hint {
    if (this.#info) return this.#info;
    const parser = this.#config.getBlockParser(this.type);
    const raw = this.#raw;
    const data = raw[this.type as keyof typeof raw];
    this.#info = (parser?.(data) ?? {}) as Hint;
    return this.#info!;
  }

  /** Get a block's content. This is different from its body; for example, a
   * "bulleted_list_item" will have content (the text in the first line), but
   * can additionally have a body, which is effectively further content. It
   * doesn't seem to always make sense to make this distinction, but this is
   * how Notion's API treats it. */
  get content(): string {
    if (this.#content != null) return this.#content;
    const raw = this.#raw;
    const type = this.type as keyof typeof raw;
    const data = raw[type] as { rich_text?: Notion.RichTextItemResponse[] };
    this.#content = this.#config.formatRichText(data.rich_text ?? []).rich;
    return this.#content!;
  }

  /** Get a block's body, i.e. its children, formatted, and concatenated. */
  get body(): string {
    if (this.#body == null) throw error`missing-block-body`;
    return this.#body;
  }
}
