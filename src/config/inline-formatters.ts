import type { BuildOptions, InlineFormatters } from "../types/options.ts";

/** Retrieve a full set of inline text formatters given a user-specified subset
 * of them. */
export function getInlineFormatters(
  { inline, language }: BuildOptions["formatters"] = {},
): Required<InlineFormatters> {
  const defaults = language == "md" ? md : html;
  if (!inline) return { ...defaults };
  const isObject = typeof inline == "object" && inline != null;
  if (isObject) return { ...defaults, ...inline };
  throw Error("The 'formatters.inline' option must be an object");
}

const html: Required<InlineFormatters> = {
  link: (content, { url }) => `<a href="${url}">${content}</a>`,
  bold: (content) => `<strong>${content}</strong>`,
  italic: (content) => `<em>${content}</em>`,
  strikethrough: (content) => `<s>${content}</s>`,
  underline: (content) => `<b>${content}</b>`,
  code: (content) => `<code>${content}</code>`,
  color: (content, { color }) => `<mark class="${color}">${content}</mark>`,
} as const;

const md: Required<InlineFormatters> = {
  link: (content, { url }) => `[${content}](${url})`,
  bold: (content) => `**${content}**`,
  italic: (content) => `_${content}_`,
  strikethrough: (content) => `~~${content}~~`,
  underline: (content) => `_${content}_`,
  code: (content) => {
    const match = content.match(/`+/g);
    if (!match) return `\`${content}\``;
    const length = Math.max(...match.map((ticks) => ticks.length));
    const delimiter = "`".repeat(length + 1);
    return `${delimiter} ${content} ${delimiter}`;
  },
  color: (content, { color }) => `[${content}]{.${color}}`,
};
