import { stdout } from "node:process";
import { StdoutLogger } from "../loggers/stdout.ts";
import { ConsoleLogger } from "../loggers/console.ts";
import { Config } from "./config.ts";
import type { Logger } from "./types.ts";

/** Run the importer. This runs your configuration file, fetches newly updated
 * files from Notion, applies skip or delete filters, stringifies content and
 * data using the provided formatters, imports assets, and writes the files to
 * disk in the location specified. */
export async function fromNotion(
  path: string = "./notion.config.js",
  logger: Logger = stdout?.isTTY ? StdoutLogger : ConsoleLogger,
): Promise<void> {
  logger.render();
  const config = await Config.from(path);
  logger.loadedConfig(path);
  const timestamp = Date.now();
  logger.render();
  const pages = await config.listUpdatedPages();
  logger.setPageAmount(pages.length);
  for (const page of pages) {
    logger.nextPage(page.filename);
    logger.render();
    await page.write();
    if (page.skipped) logger.pageResult("skipped");
    else if (page.deleted) logger.pageResult("deleted");
    else logger.pageResult("imported");
  }
  const assets = config.listAssets();
  logger.setAssetAmount(assets.length);
  logger.render();
  const remaining = new Set();
  for (const asset of assets) {
    remaining.add(asset);
    asset.finally(() => remaining.delete(asset));
  }
  while (remaining.size > 0) {
    await Promise.race([...remaining]);
    logger.downloadedAssets(assets.length - remaining.size);
    logger.render();
  }
  logger.downloadedAssets(assets.length);
  logger.render();
  await config.setLastUpdated(timestamp);
  logger.finalize();
  logger.render();
}
