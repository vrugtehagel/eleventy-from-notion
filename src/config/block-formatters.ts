import type { BlockFormatters } from "../types/options.ts";

/** Retrieve a (potentially incomplete) set of block formatters. You can
 * specify a formatter for any Notion-supported block type in order to add
 * support, if there is none by default. There are fallbacks specified for
 * commonly used types, like paragraphs, headers, toggle blocks, lists, tables,
 * quotes, code blocks, dividers, callouts, and images. */
export function getBlockFormatters(
  formatters?: BlockFormatters,
): BlockFormatters {
  return { ...defaults, ...formatters };
}

const defaults: BlockFormatters = {
  paragraph: (content) => content ? `<p>${content}</p>` : "",
  heading1: (content) => `<h2>${content}</h2>`,
  heading2: (content) => `<h3>${content}</h3>`,
  heading3: (content) => `<h4>${content}</h4>`,
  bulletedListItem: (content, children, info) => {
    let result = `<li>${content}${children}</li>`;
    if (info.previous?.type != "bulletedListItem") result = "<ul>" + result;
    if (info.next?.type != "bulletedListItem") result = result + "</ul>";
    return result;
  },
  numberedListItem: (content, children, info) => {
    let result = `<li>${content}${children}</li>`;
    if (info.previous?.type != "numberedListItem") result = "<ol>" + result;
    if (info.next?.type != "numberedListItem") result = result + "</ol>";
    return result;
  },
  quote: (content, children) => {
    return `<blockquote>${content}${children}</blockquote>`;
  },
  toggle: (content, children) => {
    return `<details><summary>${content}</summary>${children}</details>`;
  },
  synced: (content, children) => children,
  code: (content, children, info) => {
    const code = `<code>${content}</code>`;
    const pre = `<pre data-language="${info.language}">${code}</pre>`;
    if (!info.caption || !info.caption.rich) return pre;
    const figcaption = `<figcaption>${info.caption.rich}</figcaption>`;
    return `<figure>${pre}${figcaption}</figure>`;
  },
  callout: (content, children, info) => {
    const header = `<p class="callout-header">${content}</p>`;
    const classes = `class="callout callout-${info.color}"`;
    return `<div ${classes} role="note">${header}${children}</div>`;
  },
  divider: () => `<hr>`,
  table: (content, children) => `<table>${children}</table>`,
  tableRow: (content, children, info) => {
    const { cells } = info;
    if (info.parent?.type != "table") throw Error("Unreachable");
    const isFirstRow = info.previous?.type != "tableRow";
    const isHeaderRow = isFirstRow && info.parent.hasRowHeader;
    if (isHeaderRow) return `<tr><th>${cells.join("</th><th>")}</th></tr>`;
    const hasHeader = info.parent.hasColumnHeader;
    if (!hasHeader) return `<tr><td>${cells.join("</td><td>")}</td></tr>`;
    const first = `<th>${cells[0]}</th>`;
    const others = `<td>${cells.slice(1).join("</td><td>")}</td>`;
    return `<tr>${first}${others}</tr>`;
  },
  image: (content, children, info) => {
    const img = `<img src="${info.url}" alt="">`;
    if (!info.caption || !info.caption.rich) return img;
    const figcaption = `<figcaption>${info.caption.rich}</figcaption>`;
    return `<figure>${img}${figcaption}</figure>`;
  },
};
