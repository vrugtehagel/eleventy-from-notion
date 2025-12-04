import type { RichText } from "../src/types.ts";
import type { Config } from "../src/config.ts";

/** Stringify page content as HTML. Not all styles and blocks are
 * supported by this plugin; only ones that have a clear semantic translation
 * into HTML. Manually add formatters for special cases. */
export function Html(config: Config): void {
  config.setOutputExtension("html");

  config.setBlockFormatter("paragraph", (block) => {
    if (block.content.trim() == "") return "";
    return `<p>${block.content}</p>`;
  });

  config.setBlockFormatter("heading_1", (block) => {
    return `<h2>${block.content}</h2>`;
  });

  config.setBlockFormatter("heading_2", (block) => {
    return `<h3>${block.content}</h3>`;
  });

  config.setBlockFormatter("heading_3", (block) => {
    return `<h4>${block.content}</h4>`;
  });

  config.setBlockFormatter("bulleted_list_item", (block) => {
    let result = `<li>${block.content}${block.body}</li>`;
    if (block.previous?.type != block.type) result = "<ul>" + result;
    if (block.next?.type != block.type) result += "</ul>";
    return result;
  });

  config.setBlockFormatter("numbered_list_item", (block) => {
    let result = `<li>${block.content}${block.body}</li>`;
    if (block.previous?.type != block.type) result = "<ol>" + result;
    if (block.next?.type != block.type) result += "</ol>";
    return result;
  });

  config.setBlockFormatter("quote", (block) => {
    return `<blockquote>${block.content}${block.body}</blockquote>`;
  });

  config.setBlockFormatter("toggle", (block) => {
    const summary = `<summary>${block.content}</summary>`;
    return `<details>${summary}${block.body}</details>`;
  });

  config.setBlockFormatter("synced", (block) => {
    return block.body;
  });

  config.setBlockFormatter<{
    language: string;
    caption: RichText;
  }>("code", (block) => {
    const { language, caption } = block.info;
    const code = `<code>${block.content}</code>`;
    const pre = `<pre data-language="${language}">${code}</pre>`;
    if (!caption.rich) return pre;
    const figcaption = `<figcaption>${caption.rich}</figcaption>`;
    return `<figure>${pre}${figcaption}</figure>`;
  });

  config.setBlockFormatter<{
    color: string;
  }>("callout", (block) => {
    const color = block.info.color.replace("background_", "");
    const header = `<p class="callout-header">${block.content}</p>`;
    const classes = `class="callout callout-${color}"`;
    return `<div ${classes} role="note">${header}${block.body}</div>`;
  });

  config.setBlockFormatter("divider", () => {
    return "<hr>";
  });

  config.setBlockFormatter("table", (block) => {
    return `<table>${block.body}</table>`;
  });

  config.setBlockFormatter<{
    cells: RichText[];
  }>("table_row", (block) => {
    const { cells } = block.info;
    const cellName = block.previous?.type == block.type ? "td" : "th";
    const tds = cells.map((text) => `<${cellName}>${text.rich}</${cellName}>`);
    return `<tr>${tds.join("")}</tr>`;
  });

  config.setBlockFormatter<{
    caption?: RichText;
    url: string;
    path: string;
  }>("image", (block) => {
    const { caption, path } = block.info;
    return `<img src="${path}" alt="${caption?.plain ?? ""}">`;
  });

  config.setInlineFormatter<string>("link", (content, { value }) => {
    return `<a href="${value}">${content}</a>`;
  });

  config.setInlineFormatter("bold", (content) => {
    return `<strong>${content}</strong>`;
  });

  config.setInlineFormatter("italic", (content) => {
    return `<em>${content}</em>`;
  });

  config.setInlineFormatter("strikethrough", (content) => {
    return `<s>${content}</s>`;
  });

  config.setInlineFormatter("underline", (content) => {
    return `<b>${content}</b>`;
  });

  config.setInlineFormatter("code", (content) => {
    return `<code>${content}</code>`;
  });

  config.setInlineFormatter<string>("color", (content, { value }) => {
    const color = value.replace("background_", "");
    return `<mark class="${color}">${content}</mark>`;
  });
}
