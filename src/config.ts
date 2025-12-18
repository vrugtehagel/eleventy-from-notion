import * as Notion from "@notionhq/client";
import * as fs from "node:fs/promises";
import * as process from "node:process";
import * as crypto from "node:crypto";
import * as path from "node:path";
import { error } from "./error.ts";
import { Page } from "./page.ts";
import { Block } from "./block.ts";
import { Inline } from "./inline.ts";
import { createRateLimitedFetch } from "./custom-fetch.ts";
import { Defaults } from "../plugins/defaults.ts";
import type {
  Asset,
  BlockFormatter,
  Cache,
  DataFormatter,
  InlineFormatter,
  PageFilter,
  Parser,
  Plugin,
  RichText,
} from "./types.ts";

/** The main configuration object. Use its methods to specify the behavior of
 * the plugin. This is very similar to how one would configure Eleventy using
 * the `eleventyConfig` argument in its configuration function. The config
 * object has two main modes; it starts off in "config" mode, where you can use
 * setters to configure the behavior. Once your config function has finished
 * running, the config object switches to "run" mode. In this mode, it is
 * possible to retrieve formatters, parsers, metadata, etcetera, but it is no
 * longer possible to use most setters. For example, you can not change the
 * integration secret halfway through a build. */
export class Config {
  #running: boolean = false;
  #client: Notion.Client | null = null;
  #clientOptions: ConstructorParameters<typeof Notion.Client>[0];
  #secret: string = "";
  #extension: string = "";
  #directory: string = "";
  #cache: Cache | null = null;
  #dataSourceId: string = "";
  #databaseId: string = "";
  #properties = new Map<string, string[]>();
  #meta = new Map<string, string[]>();
  #blockFormatters = new Map<string, BlockFormatter>();
  #inlineFormatters = new Map<string, InlineFormatter>();
  #dataFormatter: DataFormatter | null = null;
  #parsers = new Map<string, Map<string, Parser>>();
  #assets = new Map<string, Asset>();
  #resolveAsset: (path: string) => string = (path: string) => path;
  #skippers: PageFilter[] = [];
  #deleters: PageFilter[] = [];

  /** Retrieve a new `Config` object from a certain configuration file. The
   * file path must exist, and it must have a default export that is a function
   * configuring the new `Config` object. */
  static async from(configPath: string): Promise<Config> {
    const mod = await import(path.resolve(configPath));
    const config = new Config();
    config.use(Defaults);
    await mod.default(config);
    config.#running = true;
    config.getOutputDirectory();
    config.getOutputExtension();
    const fetch = createRateLimitedFetch(500);
    const auth = config.getIntegrationSecret();
    const clientOptions = config.#clientOptions;
    config.#client = new Notion.Client({ fetch, ...clientOptions, auth });
    return config;
  }

  /** Use a plugin. Plugins are functions exactly like the main configuration
   * function; they receive the `Config` object as argument and can help
   * simplify and separate configuration. The return value of a plugin is
   * ignored. This method is only available in "config" mode. */
  use(plugin: Plugin): void {
    if (this.#running) throw error`cannot-run-${"use"}`;
    plugin(this);
  }

  /** Sets some options to pass to the underlying Notion `Client`, which is
   * used to make API calls. The integration secret must not be passed here;
   * use the `setIntegrationSecret()` method instead. A custom `fetch` is
   * passed by default to work with Notion's rate limits; overwrite this at
   * your own risk. This method is only available in "config" mode. */
  setClientOptions(
    options: ConstructorParameters<typeof Notion.Client>[0],
  ): void {
    if (this.#running) throw error`cannot-run-${"setClientOptions"}`;
    this.#clientOptions = options;
  }

  /** Set the integration secret. You should not pass it the string literally,
   * especially not if you have your code version controlled; use an
   * environment variable instead. By default, the `Config` object looks for an
   * environment variable named `NOTION_INTEGRATION_SECRET`; if this is
   * defined, setting it using this method is not needed.  This method is only
   * available in "config" mode. */
  setIntegrationSecret(secret: string): void {
    if (this.#running) throw error`cannot-run-${"setIntegrationSecret"}`;
    if (typeof secret != "string") throw error`secret-not-string`;
    this.#secret = secret;
  }

  /** Get the integration secret. If no secret has been set, and the
   * `NOTION_INTEGRATION_SECRET` environment variable is not found, then an
   * error is thrown. Otherwise the secret is returned. */
  getIntegrationSecret(): string {
    if (this.#secret) return this.#secret;
    const secret = process.env.NOTION_INTEGRATION_SECRET;
    if (!secret) throw error`missing-secret`;
    this.#secret = secret;
    return secret;
  }

  /** Set the output extension for the Notion files imported. The file names
   * match the page IDs from Notion, but the extension is relevant for how
   * Eleventy (or other tools) might process the pages. Generally, this method
   * would be set in a plugin that defines formatters for a certain file type;
   * for example, the `MarkdownOutput` plugin calls this method to set the
   * extensions to `md`. If you wish to change this, make sure to use it after
   * any plugins that might also set it, since later calls will overwrite the
   * value specified in earlier calls. It is recommended to specify this
   * without a leading period, but one is automatically removed if specified.
   * This method is only available in "config" mode. */
  setOutputExtension(extension: string): void {
    if (this.#running) throw error`cannot-run-${"setOutputExtension"}`;
    if (typeof extension != "string") throw error`extension-not-string`;
    if (extension.startsWith(".")) extension = extension.slice(1);
    this.#extension = extension;
  }

  /** Retrieve the output extension. If no extension has been set, an error is
   * thrown. */
  getOutputExtension(): string {
    if (!this.#extension) throw error`missing-output-extension`;
    return this.#extension;
  }

  /** Set the output directory to store the imported Notion pages in. This is
   * also the directory that may include a `.notion` file, which is used across
   * runs to avoid importing every single page every single time. The directory
   * must already exist. The path given must be relative to the current working
   * directory; in particular, it must not be an absolute path. A trailing
   * slash is recommended, but automatically added if omitted. */
  setOutputDirectory(path: string): void {
    if (this.#running) throw error`cannot-run-${"setOutputDirectory"}`;
    if (typeof path != "string") throw error`directory-not-string`;
    if (path.startsWith("/")) throw error`absolute-directory`;
    if (!path.endsWith("/")) path += "/";
    this.#directory = path;
  }

  /** Get the output directory. If no output directory has been set, or if it
   * is the empty string, an error is thrown. */
  getOutputDirectory(): string {
    if (!this.#directory) throw error`missing-output-directory`;
    return this.#directory;
  }

  /** Asynchronously return the cache held in the `.notion` file within the
   * output directory. If the output directory is not specified, this method
   * throws an error. If the output directory exists, but there is no `.notion`
   * file inside it, the import continues as usual and imports without cache.
   * Generally speaking it is best not to remove the `.notion` file to avoid
   * unnecessarily importing pages that were unchanged. */
  async #getCache(): Promise<Cache> {
    if (this.#cache) return this.#cache;
    const path = this.getOutputDirectory() + ".notion";
    const json = await fs.readFile(path, "utf8").catch(() => null);
    const cache = JSON.parse(json || "{}");
    if (typeof cache != "object") throw error`cache-corrupted`;
    if (Array.isArray(cache)) throw error`cache-corrupted`;
    this.#cache = cache;
    return cache;
  }

  /** Set the cache. The cache object must be passed in its entirety; retrieve
   * it using `#getCache()` first to make partial modifications. This writes
   * the new cache to the `.notion` file. */
  async #setCache(cache: Cache): Promise<void> {
    const json = JSON.stringify(cache, null, 2);
    const path = this.getOutputDirectory() + ".notion";
    await fs.writeFile(path, json, "utf8");
  }

  /** Get the timestamp for the last successful run. This is stored in the
   * generated `.notion` file, stored directly within the output directory. If
   * the output directory was not specified, an error is thrown. If it exists,
   * but does not contain a `.notion` file, `0` is returned, which causes all
   * pages to be imported. */
  async getLastUpdated(): Promise<number> {
    const cache = await this.#getCache();
    return cache.lastUpdated ?? 0;
  }

  /** Set the `lastUpdated` timestamp in the `.notion` cache file to a certain
   * value, or the current time if it was omitted. */
  async setLastUpdated(timestamp: number): Promise<void> {
    const cache = await this.#getCache();
    cache.lastUpdated = timestamp;
    await this.#setCache(cache);
  }

  /** This is the preferred method of specifying the ID of the data source to
   * import from Notion. This can be retrieved by clicking the "settings" icon
   * in the data source in question, selecting "Manage data sources", locating
   * the data source, clicking the three dots on the right of the data source's
   * name, and choosing "Copy data source ID". You may alternatively specify a
   * database ID or even the database's URL, in which case an API call is made
   * to retrieve the data source ID for the first data source on the page. This
   * method is only available in "config" mode. */
  setDataSourceId(dataSourceId: string): void {
    if (this.#running) throw error`cannot-run-${"setDataSourceId"}`;
    if (typeof dataSourceId != "string") throw error`data-source-id-not-string`;
    this.#dataSourceId = dataSourceId;
  }

  /** Set the ID of the database whose first data source will be imported. This
   * is an alternative to the `setDataSourceId()` method, but requires an extra
   * API call to retrieve the data source ID; as such using the latter is
   * recommended. The data source ID is located in the URL, as a UUID without
   * its dashes. If you're not sure which part of the URL you need, use the
   * `setDatabaseIdFromURL()` method instead. This method is only available in
   * "config" mode. */
  setDatabaseId(databaseId: string): void {
    if (this.#running) throw error`cannot-run-${"setDatabaseId"}`;
    if (typeof databaseId != "string") throw error`database-id-not-string`;
    const uuid = /^[0-9a-f]{8}(-?)([0-9a-f]{4}\1){3}\1[0-9a-f]{12}$/i;
    if (!uuid.test(databaseId)) throw error`database-id-not-uuid`;
    this.#databaseId = databaseId;
  }

  /** Set the ID of the database whose first data source will be imported. This
   * is an easy-to-use alternative to `setDatabaseId()`, though it is
   * recommended to specify the data source ID directly using the
   * `setDataSourceId()` method. This method is only available in "config"
   * mode. */
  setDatabaseIdFromUrl(databaseUrl: URL | string): void {
    if (this.#running) throw error`cannot-run-${"setDatbaseIdFromUrl"}`;
    const { pathname } = new URL(databaseUrl, "https://www.notion.so/");
    const parts = pathname.split(/[^0-9a-f]+/i);
    const uuid = parts.findLast((part) => /^[0-9a-f]{32}$/i.test(part));
    if (!uuid) throw error`invalid-database-url`;
    this.setDatabaseId(uuid);
  }

  /** Get the ID of the data source to import. If no data source ID was
   * specified, the data source ID is retrieved using the database ID or URL,
   * and if neither of those were specified, an error is thrown. This method
   * is asynchronous because retrieving the data source ID from a database ID
   * requires an API call. If a data source ID is specified, it returns a
   * promise immediately resolved with the specified data source ID; otherwise,
   * it is retrieved and cached for subsequent calls. */
  async getDataSourceId(): Promise<string> {
    if (this.#dataSourceId) return this.#dataSourceId;
    if (!this.#databaseId) throw error`missing-database-or-data-source-id`;
    if (!this.#client) throw error`client-not-initialized`;
    const options = { database_id: this.#databaseId };
    const database = await this.#client.databases.retrieve(options);
    const isDatabase = Notion.isFullDatabase(database);
    if (!isDatabase) throw error`cannot-fetch-data-source-id`;
    const hasDataSources = database.data_sources.length > 0;
    if (!hasDataSources) throw error`empty-database`;
    const [dataSource] = database.data_sources;
    this.#dataSourceId = dataSource.id;
    return this.#dataSourceId;
  }

  /** Import a Notion page property as a key-value pair in the front matter of
   * each output page. The property name is effectively the column name in
   * Notion; it must then be renamed to a key or nested key. A nested key can
   * be specified as an array of keys, such as `["foo", "bar"]` in order to
   * nest a property under `foo.bar`. */
  importProperty(property: string, rename: string | string[]): void {
    if (this.#running) throw error`cannot-run-${"importProperty"}`;
    if (typeof property != "string") throw error`property-not-string`;
    if (typeof rename == "string") rename = [rename];
    if (!Array.isArray(rename)) throw error`property-rename-not-array`;
    this.#properties.set(property, rename);
  }

  /** Get a copy of all properties that have been marked for import. The
   * returned map maps a property to a normalized array of keys. Modifying the
   * map does not affect the importing behavior; it is a copy. */
  getProperties(): Map<string, string[]> {
    return new Map(this.#properties);
  }

  /** Similar to importing page properties as front matter, some additional
   * metadata from Notion can be imported, such as the cover image or page
   * icon. These must match (non-nested) keys in the raw API response (as per
   * the `PageObjectResponse` type from Notion's SDK). */
  importMeta(meta: string, rename: string | string[]): void {
    if (this.#running) throw error`cannot-run-${"importMetadata"}`;
    if (typeof meta != "string") throw error`meta-not-string`;
    if (typeof rename == "string") rename = [rename];
    if (!Array.isArray(rename)) throw error`meta-rename-not-array`;
    this.#meta.set(meta, rename);
  }

  /** Get a copy of all the metadata that has been marked for import. The
   * returned map maps a property to a normalized array of keys. Modifying the
   * map does not affect the importing behavior; it is a copy. */
  getMeta(): Map<string, string[]> {
    return new Map(this.#meta);
  }

  /** Set a formatter for a specific block type, such as "heading_1" or
   * "paragraph". */
  setBlockFormatter<Hint>(
    type: string,
    formatter: BlockFormatter<Hint>,
  ): void {
    if (this.#running) throw error`cannot-run-${"setBlockFormatter"}`;
    if (typeof type != "string") throw error`formatter-type-not-string`;
    this.#blockFormatters.set(type, formatter as BlockFormatter);
  }

  /** Retrieve the defined formatter for a certain block type, such as
   * "heading_1" or "paragraph". */
  getBlockFormatter(type: string): BlockFormatter {
    const formatter = this.#blockFormatters.get(type);
    if (!formatter) throw error`missing-${type}-block-formatter`;
    return formatter;
  }

  /** Set a formatter for a specific inline style, such as "bold" or
   * "italic". */
  setInlineFormatter<Hint>(
    type: string,
    formatter: InlineFormatter<Hint>,
  ): void {
    if (this.#running) throw error`cannot-run-${"setInlineFormatter"}`;
    if (typeof type != "string") throw error`formatter-type-not-string`;
    this.#inlineFormatters.set(type, formatter as InlineFormatter);
  }

  /** Retrieve the formatter for a specific inline style, such as "bold" or
   * "italic". */
  getInlineFormatter(type: string): InlineFormatter {
    const formatter = this.#inlineFormatters.get(type);
    if (!formatter) throw error`missing-${type}-inline-formatter`;
    return formatter;
  }

  /** Set a formatter for data, used to stringify front matter. Note: this
   * expects to stringify the front matter entirely, meaning the result should
   * include the `---` delimiters if they are desirable. */
  setDataFormatter(formatter: DataFormatter): void {
    if (this.#running) throw error`cannot-run-${"setDataFormatter"}`;
    this.#dataFormatter = formatter;
  }

  /** Retrieve the formatter for data, for front matter. This must exist. */
  getDataFormatter(): DataFormatter {
    if (!this.#dataFormatter) throw error`missing-data-formatter`;
    return this.#dataFormatter;
  }

  /** Set a parser function for a specific type, for a target context, such
   * as "block" or "inline". This function is a generic version of user-facing
   * context-specific methods like `setBlockParser()`. */
  #setParser(context: string, type: string, parser: Parser): void {
    if (this.#running) throw error`cannot-run-set-${context}-parser`;
    if (typeof type != "string") throw error`parser-type-not-string`;
    const parsers = this.#parsers.get(context) ?? new Map();
    parsers.set(type, parser);
    this.#parsers.set(context, parsers);
  }

  /** Get a parser for a specific type, within a specific context. Used under
   * the hood for methods such as `getBlockFormatter()`. Throws an error if a
   * parser of the given type and context does not exist. */
  #getParser(context: string, type: string): Parser | null {
    return this.#parsers.get(context)?.get(type) ?? null;
  }

  /** Define a parser for a block of a specific type, such as "to_do" or
   * "table". */
  setBlockParser<Hint>(type: string, parser: Parser<Hint>): void {
    this.#setParser("block", type, parser as Parser);
  }

  /** Get a block parser for a specific type, such as "to_do" or "table" */
  getBlockParser(type: string): Parser | null {
    return this.#getParser("block", type) ?? null;
  }

  /** Define a parser for info for a rich text of a specific type, such as
   * "link" or "color". */
  setInlineParser<Hint>(type: string, parser: Parser<Hint>): void {
    this.#setParser("inline", type, parser as Parser);
  }

  /** Get a rich text parser for a specific type, such as "link" or "color" */
  getInlineParser(type: string): Parser | null {
    return this.#getParser("inline", type);
  }

  /** Get a list of the registered inline parsers. If a certain type is not
   * registered, it is ignored entirely in the formatting process. */
  getInlineStyles(): string[] {
    const parsers = this.#parsers.get("inline");
    if (!parsers) return [];
    return [...parsers.keys()];
  }

  /** Set a parser for a data type, such as "multi_select" or "date". */
  setDataParser<Hint>(type: string, parser: Parser<Hint>): void {
    this.#setParser("data", type, parser as Parser);
  }

  /** Retrieve the parser for a specific data type, such as "multi_select"
   * or "date". */
  getDataParser(type: string): Parser {
    const parser = this.#getParser("data", type);
    if (parser) return parser;
    throw error`missing-${type}-data-parser`;
  }

  /** Given a certain URL to an asset (like an image), provide a local location
   * within the output directory. This returns the same output location given
   * the same URL. */
  getAssetPath(assetUrl: URL | string): string {
    const url = new URL(assetUrl);
    const { href } = url;
    const cached = this.#assets.get(href);
    if (cached) return cached.path;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(url.host + url.pathname);
    const hash = crypto.createHash("sha256").update(bytes).digest("base64");
    const suffix = hash.slice(0, 8);
    const filename = url.pathname.split("/").at(-1) ?? "";
    const [_, name, extension] = filename.match(/^([^]*?)(\.?[^.]*)$/) ?? [];
    const asset = `asset-${name ?? ""}-${suffix}${extension ?? ""}`;
    const path = this.getOutputDirectory() + asset;
    const resolved = this.#resolveAsset(path);
    const download = this.#loadAsset(href, path);
    this.#assets.set(href, { path, resolved, download });
    return path;
  }

  /** Similar to `getAssetPath()`, this provides a location (either local or
   * external) to an asset given a URL to said asset. This returns the same
   * output location given the same input URL. The resolved asset path is
   * determined using the resolver set using `setAssetPathResolver()`. */
  getResolvedAssetPath(assetUrl: URL | string): string {
    const url = new URL(assetUrl);
    const { href } = url;
    this.getAssetPath(href);
    return this.#assets.get(href).resolved;
  }

  /** Load an asset in the background. This is done whenever a local asset path
   * is requested; it is fetched immediately, but a local path is immediately
   * provided, allowing the page import to continue while assets are fetched
   * in parallel. */
  async #loadAsset(assetUrl: string, path: string): Promise<void> {
    const response = await fetch(assetUrl);
    const bytes = await response.bytes();
    await fs.writeFile(path, bytes);
  }

  /** Resolve raw asset paths to a post-build path. Images referenced by pages
   * get imported directly under the output directory, but pages are often
   * processed to end up somewhere else (e.g. in a `/dist/` folder). Images may
   * also be processed by another tool to be moved to a separate location. This
   * type of processing causes the file paths used inside page content to be
   * out-of-sync with where the images are actually located. To mitigate this
   * issue, a resolver function can be specified here that turns a
   * (CWD-relative) asset path into a new path for use in page content. */
  setAssetPathResolver(resolver: (path: string) => string): void {
    if (typeof resolver != "function") throw error`resolver-not-function`;
    this.#resolveAsset = resolver;
  }

  /** Returns a promise that resolves once all assets have been downloaded. An
   * asset starts downloading whenever a path for it is requested; this method
   * only waits for all those requests to finish running. It does not itself
   * cause new requests to be made. */
  async downloadAssets(): Promise<number> {
    const assets = [...this.#assets.values()];
    await Promise.all(assets.map((asset) => asset.download));
    return assets.length;
  }

  /** Add a filter to skip certain pages from being imported. This can be
   * helpful for if you like keeping your drafts alongside your public posts.
   * In such a case, pages can be filtered out using a specific property. Pass
   * a filter that takes a page and returns a boolean (`true` if the page needs
   * to be skipped) to skip over pages during the import. */
  skip(filter: PageFilter): void {
    if (this.#running) throw error`cannot-run-${"skip"}`;
    if (typeof filter != "function") throw error`filter-not-function`;
    this.#skippers.push(filter);
  }

  /** If a page is deleted in Notion, it is no longer visible to the importer.
   * This can be problematic if your posts are cached, since deleted posts keep
   * on existing in the cache. As a workaround of sorts, you can tag posts for
   * deletion within Notion, specify them to be deleted using this method, and
   * the posts will be deleted from the cache. After the import has run and
   * removed the page, it is safe to delete in Notion. Pass a function as a
   * filter, which receives a page, and should return `true` if the page is to
   * be deleted. */
  delete(filter: PageFilter): void {
    if (this.#running) throw error`cannot-run-${"delete"}`;
    if (typeof filter != "function") throw error`filter-not-function`;
    this.#deleters.push(filter);
  }

  /** Asynchronously ask all registered skip filters whether or not a page
   * should be skipped. */
  async shouldSkip(page: Page): Promise<boolean> {
    const promises = this.#skippers.map((skipper) => skipper(page));
    const results = await Promise.all(promises);
    return results.some((shouldSkip) => shouldSkip);
  }

  /** Asynchronously ask all registered delete filters whether or not a page
   * should be deleted. */
  async shouldDelete(page: Page): Promise<boolean> {
    const promises = this.#deleters.map((deleter) => deleter(page));
    const results = await Promise.all(promises);
    return results.some((shouldDelete) => shouldDelete);
  }

  /** List pages to be updated since the last import. */
  async listUpdatedPages(): Promise<Page[]> {
    if (!this.#client) throw error`client-not-initialized`;
    const dataSourceId = await this.getDataSourceId();
    const since = await this.getLastUpdated();
    const after = new Date(since).toISOString();
    const timestamp = "last_edited_time";
    const filter = { timestamp, [timestamp]: { after } } as const;
    const apiOptions = { data_source_id: dataSourceId, filter };
    const list = this.#client.dataSources.query;
    const results = await Notion.collectPaginatedAPI(list, apiOptions);
    const pages = results.filter((result) => Notion.isFullPage(result));
    return pages.map((page) => new Page(page, this));
  }

  /** Get the child blocks for a certain ID, which can itself be a block, or
   * a page. It (asynchronously) returns a list of `Block` objects. */
  async getBlocks(id: string, parent: Block | Page): Promise<Block[]> {
    if (!this.#client) throw error`client-not-initialized`;
    const { list } = this.#client.blocks.children;
    const raw = await Notion.collectPaginatedAPI(list, { block_id: id });
    const blocks = raw.filter((block) => Notion.isFullBlock(block));
    return blocks.map((raw) => new Block(raw, this, parent));
  }

  /** Format a Notion rich text array into a string of markup, provided the
   * parsers and formatters for the used types. */
  formatRichText(richTexts: Notion.RichTextItemResponse[]): RichText {
    const plain = richTexts.map((part) => part.plain_text).join("");
    const inlines = Inline.fromRaw(richTexts, this);
    const rich = inlines[0]?.format() ?? "";
    return { plain, rich };
  }
}
