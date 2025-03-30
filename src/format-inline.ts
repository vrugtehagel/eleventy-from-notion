import type { InlineFormatters } from "./types/options.ts";
import type { NotionRichText } from "./types/notion.ts";

/** To format inline text, we need to be a bit careful. We receive formatted
 * text in "parts" of rich text, each part having its own formatting. However,
 * formatted text can overlap, and so we can't just willy-nilly format each
 * part of rich text on its own. For example, we might have some text that
 * reads "bold and italic", where "bold " is bold, " italic" is italic and
 * "and" is both bold and italic. If we format these part-by-part, we get HTML
 * elements for all three parts individually, which adds up to 4 elements. But,
 * we really only need three; the bold segment can be surrounded with a single
 * HTML element, and the italic text is forcefully split up in two parts.
 *
 * My solution here is to do a sort of first-come-first-serve approach, where
 * we format text as we encounter it, and encapsulate all subsequent parts of
 * rich text that also have that formatting. In example above, that means that
 * as soon as we encounter the bold text, we see that it spans over two parts
 * and so surround those two parts with the respective HTML and then look at
 * the leftover bits individually. A caveat of this approach is that formatted
 * segments that start at the same time need to be handled carefully; we should
 * always pick the formatting that spans the most parts, to avoid unnecessary
 * HTML elements. For example, if we have some text "Wait! Scratch that", where
 * "Wait!" is both strikethrough and bold, and " Scratch that" is only
 * strikethrough, then we should first handle the strikethrough text because if
 * we start with the bold text, then we are forcefully breaking up the
 * strikethrough text into two parts, unnecessarily.
 *
 * So, in short, the approach is to walk through the rich text, recursively
 * formatting parts of rich text, always the longest first. A `Reducable`
 * represents a piece of formatted text and an object of the formatting it has
 * yet to receive. If the `formatting` object is entry, the `content` is
 * completely formatted. */
type Reducable = {
  content: string;
  formatting: Partial<{
    link: string;
    bold: true;
    italic: true;
    strikethrough: true;
    underline: true;
    code: true;
    color: string;
  }>;
};

/** For inline formatting, we want to return both plain and HTML-formatted
 * text. To do so, we create a `Reducable` out of each part of rich text,
 * then recursively loop through them, adding formatting to the text. */
export function formatInline(
  richText: NotionRichText[],
  formatters: Required<InlineFormatters>,
): { rich: string; plain: string } {
  const plain = richText.map((part) => part.plain_text).join("");
  const allText = richText.every((part) => part.type == "text");
  if (!allText) throw Error("Mentions and equations are not yet supported");
  const reducables = richText.map((part) => getReducable(part));
  const rich = formatReducables(reducables, formatters);
  return { plain, rich };
}

/** Convert a part of rich text to a `Reducable`.*/
function getReducable(part: NotionRichText): Reducable {
  const formatting: Reducable["formatting"] = {};
  const hasLink = part.type == "text" && part.text.link != null;
  if (hasLink) formatting.link = part.text.link!.url;
  const rawColor = part.annotations.color;
  const isBackgroundColor = rawColor.endsWith("_background");
  const isDefaultColor = rawColor.startsWith("default");
  const hasColor = isBackgroundColor && !isDefaultColor;
  if (hasColor) formatting.color = rawColor.slice(0, -11);
  if (part.annotations.bold) formatting.bold = true;
  if (part.annotations.italic) formatting.italic = true;
  if (part.annotations.strikethrough) formatting.strikethrough = true;
  if (part.annotations.underline) formatting.underline = true;
  if (part.annotations.code) formatting.code = true;
  const content = part.plain_text;
  return { content, formatting };
}

/** Recursively reduce a list of `Reducable` objects using specified formatting
 * functions. */
function formatReducables(
  reducables: Reducable[],
  formatters: Required<InlineFormatters>,
): string {
  if (reducables.length == 0) return "";
  const { content, formatting: { ...formatting } } = reducables[0];
  const types = Object.keys(formatting) as Array<keyof typeof formatting>;
  const done = types.length == 0;
  if (done) return content + formatReducables(reducables.slice(1), formatters);
  const lengths = types.map((type) => getReducableRange(reducables, type));
  const maxLength = Math.max(...lengths);
  const maxLengthIndex = lengths.indexOf(maxLength);
  const type = types[maxLengthIndex];
  const formattedReducables = reducables.slice(0, maxLength);
  const remainingReducables = reducables.slice(maxLength);
  formattedReducables.forEach((reducable) => delete reducable.formatting[type]);
  const formatted = formatReducables(formattedReducables, formatters);
  const remaining = formatReducables(remainingReducables, formatters);
  return format(formatted, formatters, formatting, type) + remaining;
}

/** Format a string as per the given transforms and formatting. */
function format(
  content: string,
  { link, color, ...formatters }: Required<InlineFormatters>,
  formatting: Reducable["formatting"],
  type: keyof typeof formatting,
): string {
  if (type == "link") return link(content, { url: formatting[type]! });
  if (type == "color") return color(content, { color: formatting[type]! });
  return formatters[type](content, {});
}

/** Measures how many reducables the formatting of a certain type spans. */
function getReducableRange(
  reducables: Reducable[],
  type: keyof typeof reducables[0]["formatting"],
): number {
  if (reducables.length == 0) return 0;
  const value = reducables[0].formatting[type];
  const endsRange = ({ formatting }: Reducable) => formatting[type] != value;
  const index = reducables.findIndex((reducable) => endsRange(reducable));
  if (index == -1) return reducables.length;
  return index;
}
