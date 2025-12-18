import type { RichText } from "../src/types.ts";
import type { Config } from "../src/config.ts";
import type { Block } from "../src/block.ts";
import { error } from "../src/error.ts";

/** Stringify page content as Markdown. Not all styles and blocks are
 * supported by this plugin; only ones that have a clear translation into
 * Markdown. Manually add formatters for special cases. */
export function Markdown(config: Config): void {
  config.setOutputExtension("md");

  config.setBlockFormatter("paragraph", (block) => {
    if (block.content.trim() == "") return "";
    return `\n${block.content}\n`;
  });

  config.setBlockFormatter("heading_1", (block) => {
    return `\n## ${block.content}\n`;
  });

  config.setBlockFormatter("heading_2", (block) => {
    return `\n### ${block.content}\n`;
  });

  config.setBlockFormatter("heading_3", (block) => {
    return `\n#### ${block.content}\n`;
  });

  config.setBlockFormatter("bulleted_list_item", (block) => {
    let result = block.content;
    const containsList = /^\n(\d+\.|-) /.test(block.body);
    if (!containsList) result += "\n";
    result += block.body;
    result = "- " + result.replaceAll("\n", "\n  ");
    if (block.previous?.type != block.type) result = "\n" + result;
    return result.replaceAll(/ +$/mg, "");
  });

  config.setBlockFormatter("numbered_list_item", (block) => {
    let result = block.content;
    const containsList = /^\n(\d+\.|-) /.test(block.body);
    if (!containsList) result += "\n";
    result += block.body;
    const ols: Array<Block | null> = [block];
    while (ols[0]?.type == block.type) ols.unshift(ols[0].previous);
    ols.shift();
    const marker = `${ols.length}. `;
    const indent = "\n" + " ".repeat(marker.length);
    result = marker + result.replaceAll("\n", indent);
    if (ols.length == 1) result = "\n" + result;
    return result.replaceAll(/ +$/mg, "");
  });

  config.setBlockFormatter("quote", (block) => {
    let result = `\n${block.content}`;
    if (block.body) result += `\n${block.body.replace(/\n$/, "")}`;
    result = result.replaceAll("\n", "\n> ");
    return result.replaceAll(/ +$/mg, "") + "\n";
  });

  config.setBlockFormatter("synced", (block) => {
    return block.body;
  });

  config.setBlockFormatter<{
    language: string;
  }>("code", (block) => {
    const { language } = block.info;
    return `\n\`\`\`${language}\n${block.content}\n\`\`\`\n`;
  });

  const calloutTypes: Record<string, string> = {
    blue_background: "INFO",
    green_background: "TIP",
    purple_background: "IMPORTANT",
    yellow_background: "WARNING",
    red_background: "CAUTION",
  };
  config.setBlockFormatter<{
    color: string;
  }>("callout", (block) => {
    const type = calloutTypes[block.info.color] ?? null;
    if (!type) throw error`unrecognized-callout-type`;
    let result = `\n[!${type}]\n${block.content}`;
    if (block.body) result += `\n${block.body.replace(/\n$/, "")}`;
    result = result.replaceAll("\n", "\n> ");
    return result.replaceAll(/ +$/mg, "") + "\n";
  });

  config.setBlockFormatter("divider", () => {
    return `\n---\n`;
  });

  config.setBlockFormatter("table", (block) => {
    return "\n" + block.content;
  });

  config.setBlockFormatter<{
    cells: RichText[];
  }>("table_row", (block) => {
    const { cells } = block.info;
    const isFirstRow = block.previous?.type != block.type;
    const row = `| ${cells.map((text) => text.rich).join(" | ")} |\n`;
    if (!isFirstRow) return row;
    const headerLine = `| ${cells.map(() => "---").join(" | ")} |\n`;
    return row + headerLine;
  });

  config.setBlockFormatter<{
    caption?: RichText;
    url: string;
    path: string;
  }>("image", (block) => {
    const { caption, path } = block.info;
    return `\n![${caption?.plain ?? ""}](${path})\n`;
  });

  config.setInlineFormatter<string>("link", (content, { value }) => {
    return `[${content}](${value})`;
  });

  config.setInlineFormatter("bold", (content) => {
    return `**${content}**`;
  });

  config.setInlineFormatter("italic", (content) => {
    return `_${content}_`;
  });

  config.setInlineFormatter("strikethrough", (content) => {
    return `~~${content}~~`;
  });

  config.setInlineFormatter("code", (content) => {
    const match = content.match(/`+/g);
    if (!match) return `\`${content}\``;
    const lengths = match.map((ticks) => ticks.length);
    const length = Math.max(...lengths);
    const delimiter = "`".repeat(length + 1);
    return `${delimiter} ${content} ${delimiter}`;
  });
}
