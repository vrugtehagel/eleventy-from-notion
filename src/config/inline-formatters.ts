import type { InlineFormatters } from "../types/options.ts";

/** Retrieve a full set of inline text formatters given a user-specified subset
 * of them. */
export function getInlineFormatters(
  formatters?: InlineFormatters,
): Required<InlineFormatters> {
  if (!formatters) return { ...defaults };
  const isObject = typeof formatters == "object" && formatters != null;
  if (isObject) return { ...defaults, ...formatters };
  throw Error("The 'formatters.inline' option must be an object");
}

const defaults: Required<InlineFormatters> = {
  link: (content, { url }) => `<a href="${url}">${content}</a>`,
  bold: (content) => `<strong>${content}</strong>`,
  italic: (content) => `<em>${content}</em>`,
  strikethrough: (content) => `<s>${content}</s>`,
  underline: (content) => `<b>${content}</b>`,
  code: (content) => `<code>${content}</code>`,
  color: (content, { color }) => `<mark class="${color}">${content}</mark>`,
} as const;
