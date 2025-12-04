import { Config } from "./config.ts";

/** Run the importer. This runs your configuration file, fetches newly updated
 * files from Notion, applies skip or delete filters, stringifies content and
 * data using the provided formatters, imports assets, and writes the files to
 * disk in the location specified. */
export async function fromNotion(path = "./notion.config.js"): Promise<void> {
  console.log("Loading Eleventy-to-Notion config…");
  const config = await Config.from(path);
  console.log("Retrieving a list of updated Notion pages…");
  const timestamp = Date.now();
  const pages = await config.listUpdatedPages();
  const amount = pages.length;
  console.log(`Importing ${amount} ${amount == 1 ? "page" : "pages"}.`);
  const counts = { total: 0, imported: 0, skipped: 0, deleted: 0 };
  for (const page of pages) {
    await page.write();
    let action: keyof typeof counts = "imported";
    if (page.skipped) action = "skipped";
    else if (page.deleted) action = "deleted";
    counts[action]++;
    counts.total++;
    let text = "";
    text += action[0].toUpperCase() + action.slice(1);
    text += " ";
    text += page.filename;
    text += ` (${counts.total} / ${amount})`;
    console.log(text);
  }
  const didWork = counts.total != counts.skipped;
  if (didWork) console.log("Notion pages imported successfully!");
  else console.log("Notion import complete; no pages imported!");
  console.log("Downloading assets…");
  const assets = await config.downloadAssets();
  console.log(`${assets} ${assets == 1 ? "asset" : "assets"} downloaded.`);
  await config.setLastUpdated(timestamp);
}
