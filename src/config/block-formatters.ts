import type {
  BlockFormatters,
  BlockInfo,
  BuildOptions,
} from "../types/options.ts";

/** Retrieve a (potentially incomplete) set of block formatters. You can
 * specify a formatter for any Notion-supported block type in order to add
 * support, if there is none by default. There are fallbacks specified for
 * commonly used types, like paragraphs, headers, toggle blocks, lists, tables,
 * quotes, code blocks, dividers, callouts, and images. */
export function getBlockFormatters(
  { block, language }: BuildOptions["formatters"] = {},
): BlockFormatters {
  const defaults = language == "md" ? md : html;
  if (!block) return { ...defaults };
  const isObject = typeof block == "object" && block != null;
  if (isObject) return { ...defaults, ...block };
  throw Error("The 'formatters.block' option must be an object");
}

const html: BlockFormatters = {
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
    const isHeaderRow = isFirstRow && info.parent.hasColumnHeader;
    if (isHeaderRow) return `<tr><th>${cells.join("</th><th>")}</th></tr>`;
    const hasHeader = info.parent.hasRowHeader;
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

const md: BlockFormatters = {
  paragraph: (content) => content ? `\n${content}\n` : "",
  heading1: (content) => `\n## ${content}\n`,
  heading2: (content) => `\n### ${content}\n`,
  heading3: (content) => `\n#### ${content}\n`,
  bulletedListItem: (content, children, info) => {
    let body = content + "\n";
    if (/^\n\d+\. |^\n- /.test(children)) body += children.slice(1);
    else if (children) body += children;
    body = "- " + body.replaceAll("\n", "\n  ");
    if (info.previous?.type != "bulletedListItem") body = "\n" + body;
    return body.replaceAll(/ +$/mg, "");
  },
  numberedListItem: (content, children, info) => {
    let body = content + "\n";
    if (/^\n\d+\. |^\n- /.test(children)) body += children.slice(1);
    else if (children) body += children;
    const marker = `${1 + getIndexOfType(info)}. `;
    body = marker + body.replaceAll("\n", "\n" + " ".repeat(marker.length));
    if (info.previous?.type != "numberedListItem") body = "\n" + body;
    return body.replaceAll(/ +$/mg, "");
  },
  quote: (content, children) => {
    let body = `\n${content}`;
    if (children) body += "\n" + children.replace(/\n$/, "");
    return body.replaceAll("\n", "\n> ").replaceAll(/ +$/mg, "") + "\n";
  },
  synced: (content, children) => children,
  code: (content, children, info) => {
    return `\n\`\`\`${info.language}\n${content}\n\`\`\`\n`;
  },
  callout: (content, children, info) => {
    const type = calloutTypes[info.color];
    if (!type) throw Error("Unrecognized callout type");
    let body = `\n[!${type}]\n${content}`;
    if (children) body += "\n" + children.replace(/\n$/, "");
    return body.replaceAll("\n", "\n> ").replaceAll(/ +$/mg, "") + "\n";
  },
  divider: () => `---\n\n`,
  table: (content, children) => "\n" + children,
  tableRow: (content, children, info) => {
    const { cells } = info;
    if (info.parent?.type != "table") throw Error("Unreachable");
    const isFirstRow = info.previous?.type != "tableRow";
    const row = `| ${cells.join(" | ")} |\n`;
    if (!isFirstRow) return row;
    return row + `| ${cells.map(() => "---").join(" | ")} |\n`;
  },
  image: (content, children, info) => {
    return `\n![${info.caption?.plain ?? ""}](${info.url})\n`;
  },
};

const calloutTypes: Record<string, string> = {
  blue_background: "INFO",
  green_background: "TIP",
  purple_background: "IMPORTANT",
  yellow_background: "WARNING",
  red_background: "CAUTION",
};

function getIndexOfType(info: BlockInfo | null): number {
  if (!info) return 0;
  if (info.previous?.type != info.type) return 0;
  return 1 + getIndexOfType(info.previous);
}
