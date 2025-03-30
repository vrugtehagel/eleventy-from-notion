import * as Notion from "@notionhq/client";
import { createRateLimitedFetch } from "./rate-limited-fetch.ts";
import * as config from "./config/index.ts";
import { getFrontMatter } from "./front-matter.ts";
import { formatBlocks } from "./format-blocks.ts";
import type { BuilderOptions, BuildOptions } from "./types/options.ts";
import type { FrontMatter } from "./types/output.ts";
import type {
  NotionBlock,
  NotionFlatBlock,
  NotionPage,
} from "./types/notion.ts";

/** A class that interacts with the Notion SDK to be an easy-to-work-with front
 * for retrieving page front matter and content. */
export class Builder {
  #client: Notion.Client;

  constructor({
    integrationSecret,
    notionClientOptions,
  }: BuilderOptions) {
    const auth = config.getAuth(integrationSecret);
    const options = notionClientOptions;
    const fetch = createRateLimitedFetch(500);
    this.#client = new Notion.Client({ fetch, ...options, auth });
  }

  /** Retrieve the front matter of all pages from a database that were modified
   * after a specified point in time. The time must be specified as a timestamp
   * (i.e. the number of milleseconds since the epoch, like what is returned by
   * `Date.now()`). The return value is a record mapping a page UUID to its
   * front matter. */
  async listUpdatedPages(
    databaseId: string,
    since: number,
    options?: BuildOptions,
  ): Promise<Record<string, FrontMatter>> {
    const list = this.#client.databases.query;
    const timestamp = "last_edited_time";
    const after = new Date(since).toISOString();
    const filter = { timestamp, [timestamp]: { after } } as const;
    const apiOptions = { database_id: databaseId, filter };
    const schema = config.getSchema(options?.schema);
    const formatters = config.getInlineFormatters(options?.formatters?.inline);
    const results = await Notion.collectPaginatedAPI(list, apiOptions);
    const pages = results.filter((result) => Notion.isFullPage(result));
    const get = (page: NotionPage) => getFrontMatter(page, formatters, schema);
    return Object.fromEntries(pages.map((page) => [page.id, get(page)]));
  }

  /** Retrieve the content of a Notion page, given a set of inline and block
   * formatters. Not all blocks are supported by default, but you may
   * supplement your own formatters to suit your exact needs. */
  async getPageContent(
    pageId: string,
    options: Omit<BuildOptions, "schema"> = {},
  ): Promise<string> {
    const inline = config.getInlineFormatters(options.formatters?.inline);
    const block = config.getBlockFormatters(options.formatters?.block);
    const formatters = { inline, block };
    const blocks = await this.#getChildBlocks(pageId);
    return formatBlocks(blocks, formatters);
  }

  /** Notion's API doesn't let us retrieve nested blocks, so we have to do this
   * ourselves recursively. From a parent block ID (which can be a page ID) we
   * list the "flattened" blocks, then make them all nested. The function below
   * making them nested in turn uses this function to list blocks, so we're
   * listing them all the way down until the deepest block.
   *
   * Note that in general it's good to try to avoid creating too many nested
   * blocks in Notion, since the rate limits are rather harsh, and each set
   * of nested blocks requires an additional API call. */
  async #getChildBlocks(blockId: string): Promise<NotionBlock[]> {
    const list = this.#client.blocks.children.list;
    const apiOptions = { block_id: blockId };
    const rawBlocks = await Notion.collectPaginatedAPI(list, apiOptions);
    const blocks = rawBlocks.filter((block) => Notion.isFullBlock(block));
    const promises = blocks.map((block) => this.#addBlockChildren(block));
    return await Promise.all(promises);
  }

  /** Take a flat `NotionBlock` (i.e. one without `children`) and turn it into
   * a nested one by retrieving its children recursively. */
  async #addBlockChildren(block: NotionFlatBlock): Promise<NotionBlock> {
    const hasChildren = block.has_children;
    const { id } = block;
    const children = hasChildren ? await this.#getChildBlocks(id) : [];
    return { ...block, children };
  }
}
