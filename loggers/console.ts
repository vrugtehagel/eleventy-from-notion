import type { Logger } from "../src/types.ts";

/** A logger using only `console.log()` calls. This can clutter up the console
 * or terminal, but is the preferred choice if Node's `stdout` module doesn't
 * work properly in your specific environment, or if you need to be able to see
 * all the pages that have been imported. */
export const ConsoleLogger: Logger = new class implements Logger {
  #started: boolean = false;
  #pages: number = -1;
  #assets: number = -1;
  #actions = { total: 0, imported: 0, skipped: 0, deleted: 0 };
  #current: string = "";

  loadedConfig(_path: string): void {
    console.log("Retrieving a list of updated Notion pages…");
  }

  setPageAmount(amount: number): void {
    this.#pages = amount;
    console.log(`Importing ${amount} ${amount == 1 ? "page" : "pages"}.`);
  }

  nextPage(name: string): void {
    this.#current = name;
  }

  pageResult(action: "imported" | "skipped" | "deleted"): void {
    this.#actions.total++;
    this.#actions[action]++;
    let text = "";
    text += action[0].toUpperCase() + action.slice(1);
    text += " ";
    text += this.#current;
    text += ` (${this.#actions.total} / ${this.#pages})`;
    console.log(text);
  }

  setAssetAmount(amount: number): void {
    this.#assets = amount;
    const didWork = this.#actions.total != this.#actions.skipped;
    if (didWork) console.log("Notion pages imported successfully!");
    else console.log("Notion import complete; no pages imported!");
    console.log(`Downloading ${amount} asset${amount == 1 ? "" : "s"}…`);
  }

  downloadedAssets(amount: number): void {
    if (amount < this.#assets) return;
    console.log(`All assets downloaded.`);
  }

  finalize(): void {
    console.log("Notion import done!");
  }

  render(): void {
    if (this.#started) return;
    this.#started = true;
    console.log("Loading Eleventy-to-Notion config…");
  }
}();
