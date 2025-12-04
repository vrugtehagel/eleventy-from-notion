import * as fs from "node:fs/promises";
import type { Config } from "../src/config.ts";

/** Automatically skip pages in the import process if their output location
 * already contains a file that was modified since the last import. */
export function SkipModified(config: Config): void {
  config.skip(async (page) => {
    const stats = await fs.stat(page.path).catch(() => null);
    if (!stats) return false;
    const timestamp = new Date(stats.mtime).getTime();
    const since = await config.getLastUpdated();
    return timestamp > since;
  });
}
