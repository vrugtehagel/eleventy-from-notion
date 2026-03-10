import type { Logger } from "../src/types.ts";

/** A logger that only shows when an import starts and finishes. */
export const QuietLogger: Logger = new class implements Logger {
  loadedConfig(_path: string): void {
    console.log("Starting Notion import…");
  }

  setPageAmount(_amount: number): void {}

  nextPage(_name: string): void {}

  pageResult(_action: "imported" | "skipped" | "deleted"): void {}

  setAssetAmount(_amount: number): void {}

  downloadedAssets(_amount: number): void {}

  finalize(): void {
    console.log("Notion import complete.");
  }

  render(): void {}
}();
