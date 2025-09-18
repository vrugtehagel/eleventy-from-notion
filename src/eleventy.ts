import * as fs from "node:fs/promises";
import * as config from "./config/index.ts";
import { Builder } from "./builder.ts";
import type { UserConfig } from "npm:@11ty/eleventy@^3.0";
import type { EleventyFromNotionOptions } from "./types/eleventy.ts";
import type { FrontMatter } from "./types/output.ts";
import type { NotionPage } from "./types/notion.ts";

/** The main Eleventy plugin. Add this to your Eleventy config file using
 *
 * ```js
 * eleventyConfig.addPlugin(EleventyFromNotion, {
 *   // options…
 * })
 * ```
 *
 * See {@link EleventyFromNotionOptions} for a list of available options. */
export async function EleventyFromNotion(
  userConfig: UserConfig,
  options: EleventyFromNotionOptions,
): Promise<void> {
  const { input } = userConfig.directories;
  const outputPath = config.getOutputPath(input, options.output);
  const language = options.formatters?.language;
  const extension = config.getExtension(options.extension, language);
  const { quiet = false } = options;
  await fs.mkdir(outputPath, { recursive: true });
  const metaPath = outputPath + ".notion";
  const json = await fs.readFile(metaPath, "utf8").catch(() => null);
  const meta = JSON.parse(json || "{}");
  const builder = new Builder(options);
  const since = meta.lastUpdated ?? 0;
  if (!quiet) console.log("Retrieving a list of updated Notion pages…");
  const databaseId = config.getDatabaseId(options.database);
  const pageMap = await builder.listUpdatedPages(databaseId, since, options);
  const found = pageMap.size;
  if (options.skipModified) await removeModified(pageMap, since, outputPath);
  if (options.skip) await removeSkipped(pageMap, options.skip);
  const amount = pageMap.size;
  const skipText = found > amount ? ` (skipping ${found - amount})` : "";
  const amountText = amount == 1 ? "1 page" : `${amount} pages`;
  if (!quiet) console.log(`Importing ${amountText}${skipText}.`);
  let updated = 0;
  for (const [page, frontMatter] of pageMap) {
    const name = page.id.replaceAll("-", "");
    const content = await builder.getPageContent(page.id, options);
    const file = `---json\n${JSON.stringify(frontMatter)}\n---\n${content}`;
    const path = outputPath + name + "." + extension;
    await fs.writeFile(path, file);
    updated++;
    if (!quiet) console.log(`Imported ${updated} / ${amount} (${name})`);
  }
  meta.lastUpdated = Date.now();
  await fs.writeFile(metaPath, JSON.stringify(meta));
  if (!quiet) console.log("Notion pages imported successfully!");
}

/** Takes the object of updated pages, and removes the ones that should be
 * skipped due to their template being updated after the time we last ran
 * an import. We do that because usually, if a file is modified after that
 * time, it means we imported it already, but the import failed after that,
 * causing the "last updated" time to be lagging behind. */
async function removeModified(
  pageMap: Map<NotionPage, unknown>,
  since: number,
  outputPath: string,
): Promise<void> {
  const filenames = await fs.readdir(outputPath);
  await Promise.all([...pageMap.keys()].map(async (page) => {
    const id = page.id.replaceAll("-", "");
    const filename = filenames.find((filename) => filename.startsWith(id));
    if (!filename) return;
    const { mtime } = await fs.stat(outputPath + filename);
    const timestamp = new Date(mtime).getTime();
    if (timestamp < since) return;
    pageMap.delete(page);
  }));
}

/** Remove pages based on a custom `skip` function. */
function removeSkipped(
  pageMap: Map<NotionPage, FrontMatter>,
  skip: (frontMatter: FrontMatter, page: NotionPage) => boolean,
): void {
  for (const [page, frontMatter] of [...pageMap]) {
    if (skip(frontMatter, page)) pageMap.delete(page);
  }
}
