import type * as Notion from "@notionhq/client";
import { error } from "./error.ts";
import type { Config } from "./config.ts";
import type { Parser } from "./types.ts";

/** Represents a piece of rich text with a single set of styles. That is, it
 * never represents text _containing_ text of other styles. A line of rich text
 * is made up of individual `Inline` parts, and is formatted as such. */
export class Inline {
  #raw: Extract<Notion.RichTextItemResponse, { type: "text" }>;
  #config: Config;
  #siblings: Inline[] | null = null;
  #index: number | null = null;
  #styles = new Set<string>();

  /** Create an array of `Inline` objects from rich text. This also makes sure
   * that each `Inline` is aware of its siblings and position within them. */
  static fromRaw(
    richTexts: Notion.RichTextItemResponse[],
    config: Config,
  ): Inline[] {
    const inlines = richTexts.map((richText) => new Inline(richText, config));
    inlines.forEach((inline, index) => inline.#setContext(inlines, index));
    return inlines;
  }

  constructor(richText: Notion.RichTextItemResponse, config: Config) {
    const { type } = richText;
    if (type != "text") throw error`unsupported-inline-type-${type}`;
    this.#raw = richText;
    this.#config = config;
  }

  /** Inline text formats based on the formatting of its siblings. This is so
   * that e.g. something like `<b>foo <em>bar</em></b>` can format as such,
   * rather than formatting as a single bold "foo", and then a separate
   * bold-and-italic "bar" (i.e. within a separate `<b>`). */
  #setContext(siblings: Inline[], index: number): void {
    this.#siblings = siblings;
    this.#index = index;
  }

  /** Checks whether a sibling at a certain relative offset matches a value
   * given a parser for a certain style. This is used to determine how long
   * sequences of a certain types of formatting span. */
  #siblingMatches(offset: number, parser: Parser, value: unknown): boolean {
    if (offset == 0) return true;
    const index = this.#index! + offset;
    const sibling = this.#siblings![index] ?? null;
    if (sibling == null) return false;
    return parser(sibling.#raw) == value;
  }

  /** Get the length, in number of `Inline` objects, of a certain registered
   * style. */
  #getLength(style: string): number {
    if (this.#styles.has(style)) return 0;
    const parser = this.#config.getInlineParser(style)!;
    const value = parser(this.#raw);
    if (value == null) return 0;
    let length = 1;
    while (this.#siblingMatches(length, parser, value)) length++;
    return length;
  }

  /** Find the style that spans the most `Inline` objects; this is the style
   * we will format first. */
  #getLongestStyle(): { style: string; length: number } {
    const styles = this.#config.getInlineStyles();
    const lengths = styles.map((style) => this.#getLength(style));
    const length = Math.max(...lengths);
    if (length == 0) return { style: "", length };
    const index = lengths.indexOf(length);
    const style = styles[index];
    return { style, length };
  }

  /** Recursively format the `Inline` objects. At each step, this finds the
   * longest possible style, then cuts there and treats the formatted and
   * remaining `Inline` objects as separate strings of rich text. Then it
   * formats those, applies the long style to the first, and appends the
   * remainder. */
  format(): string {
    const { style, length } = this.#getLongestStyle();
    if (this.#index != 0) throw error`format-inline-must-start-at-start`;
    const cutIndex = Math.max(1, length);
    const inner = this.#siblings!.slice(0, cutIndex);
    const outer = this.#siblings!.slice(cutIndex);
    inner.forEach((inline, index) => inline.#setContext(inner, index));
    outer.forEach((inline, index) => inline.#setContext(outer, index));
    const tail = outer.length == 0 ? "" : outer[0].format();
    if (length == 0) return `${inner[0].#raw.text.content}${tail}`;
    inner.forEach((inline) => inline.#styles.add(style));
    const parser = this.#config.getInlineParser(style)!;
    const value = parser?.(this.#raw);
    const info = { value };
    const formatter = this.#config.getInlineFormatter(style);
    const formatted = formatter(inner[0].format(), info);
    return `${formatted}${tail}`;
  }
}
