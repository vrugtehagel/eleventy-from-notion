import type { Logger } from "../src/types.ts";

/** A noop-logger; it logs nothing at all. */
export const NoLogger: Logger = new class implements Logger {
  loadedConfig(_path: string): void {}

  setPageAmount(_amount: number): void {}

  nextPage(_name: string): void {}

  pageResult(_action: "imported" | "skipped" | "deleted"): void {}

  setAssetAmount(_amount: number): void {}

  downloadedAssets(_amount: number): void {}

  finalize(): void {}

  render(): void {}
}();
