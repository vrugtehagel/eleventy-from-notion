import { stdout } from "node:process";
import type { Logger } from "../src/types.ts";

/** The default logger. It shows progress in a more compact way than the
 * `ConsoleLogger`, while displaying more information in general. */
export const StdoutLogger: Logger = new class implements Logger {
  #lines: string[] = [];
  #config: string = "";
  #pages: number = -1;
  #actions = { total: 0, imported: 0, skipped: 0, deleted: 0 };
  #current: string = "";
  #previous: string = "";
  #assets: number = -1;
  #downloaded: number = 0;
  #finalized: boolean = false;

  loadedConfig(path: string): void {
    this.#config = path;
  }

  setPageAmount(amount: number): void {
    this.#pages = amount;
  }

  nextPage(name: string): void {
    this.#current = name;
  }

  pageResult(action: "imported" | "skipped" | "deleted"): void {
    this.#previous = `${action} ${this.#current}`;
    this.#actions.total++;
    this.#actions[action]++;
  }

  setAssetAmount(amount: number): void {
    this.#assets = amount;
  }

  downloadedAssets(amount: number): void {
    this.#downloaded = amount;
  }

  finalize(): void {
    this.#finalized = true;
  }

  #buildProgressBar(current: number, total: number): string {
    const suffix = `(${current} / ${total})`;
    if (current >= total) return `[${"#".repeat(40)}] ${suffix}`;
    const progress = Math.floor(current / total * 40);
    return `[${"#".repeat(progress)}>${" ".repeat(39 - progress)}] ${suffix}`;
  }

  #buildPageProgress(): string[] {
    if (this.#pages == -1) return ["| Listing updated pages"];
    if (this.#pages == 0) return ["| No pages to import."];
    const lines = ["|", `| Importing ${this.#current}`];
    if (this.#previous) lines[0] = `| Previous: ${this.#previous}`;
    if (this.#actions.total < this.#pages) return lines;
    lines[0] = "| All updated pages processed.";
    const actions = ["imported", "skipped", "deleted"] as const;
    const results = actions.map((action) =>
      `${this.#actions[action]} ${action}`
    );
    lines[1] = "| " + results.join(", ");
    return lines;
  }

  #buildAssetProgress(): string {
    if (this.#assets == -1) return "| Counting assets";
    if (this.#assets == 0) return "| No assets to download.";
    return "| Downloading assets";
  }

  #build(): void {
    this.#lines = [];
    const lines = this.#lines;
    if (!this.#config) return void lines.push("Loading Notion config");
    lines.push(`Config: ${this.#config}`);
    lines.push(...this.#buildPageProgress());
    if (this.#pages == -1) return;
    lines.push(this.#buildProgressBar(this.#actions.total, this.#pages));
    if (this.#actions.total < this.#pages) return;
    lines.push(this.#buildAssetProgress());
    if (this.#assets == -1) return;
    lines.push(this.#buildProgressBar(this.#downloaded, this.#assets));
    if (this.#downloaded < this.#assets) return;
    lines.push("| Writing metadata to `.notion`");
    if (!this.#finalized) return;
    lines.push("| Done, import complete!");
  }

  render(): void {
    stdout.moveCursor(0, -this.#lines.length);
    this.#build();
    stdout.clearScreenDown();
    stdout.write(this.#lines.join("\n") + "\n");
  }
}();
