import type * as Notion from "@notionhq/client";
import type { Config } from "../src/config.ts";

export function DefaultsBlock(config: Config): void {
  config.setBlockParser<
    Notion.ToDoBlockObjectResponse["to_do"]
  >("to_do", ({ checked }) => {
    return { checked };
  });

  config.setBlockParser<
    Notion.ToggleBlockObjectResponse["toggle"]
  >("toggle", ({ color }) => {
    return { color };
  });

  config.setBlockParser<
    Notion.ChildPageBlockObjectResponse["child_page"]
  >("child_page", ({ title }) => {
    return { title };
  });

  config.setBlockParser<
    Notion.ChildDatabaseBlockObjectResponse["child_database"]
  >("child_database", ({ title }) => {
    return { title };
  });

  config.setBlockParser<
    Notion.EquationBlockObjectResponse["equation"]
  >("equation", ({ expression }) => {
    return { expression };
  });

  config.setBlockParser<
    Notion.CodeBlockObjectResponse["code"]
  >("code", ({ language, caption }) => {
    return { language, caption: config.formatRichText(caption) };
  });

  config.setBlockParser<
    Notion.CalloutBlockObjectResponse["callout"]
  >("callout", ({ color }) => {
    return { color };
  });

  config.setBlockParser<
    Notion.TableBlockObjectResponse["table"]
  >("table", (data) => {
    const width = data.table_width;
    const hasColumnHeader = data.has_column_header;
    const hasRowHeader = data.has_row_header;
    return { width, hasColumnHeader, hasRowHeader };
  });

  config.setBlockParser<
    Notion.TableRowBlockObjectResponse["table_row"]
  >("table_row", ({ cells }) => {
    return { cells: cells.map((cell) => config.formatRichText(cell)) };
  });

  config.setBlockParser<
    Notion.EmbedBlockObjectResponse["embed"]
  >("embed", ({ url, caption }) => {
    return { url, caption: config.formatRichText(caption) };
  });

  config.setBlockParser<
    Notion.BookmarkBlockObjectResponse["bookmark"]
  >("bookmark", ({ url, caption }) => {
    return { url, caption: config.formatRichText(caption) };
  });

  config.setBlockParser<
    Notion.ImageBlockObjectResponse["image"]
  >("image", (data) => {
    const { url } = data.type == "file" ? data.file : data.external;
    const path = config.getAssetPath(url);
    const caption = config.formatRichText(data.caption);
    return { url, path, caption };
  });

  config.setBlockParser<
    Notion.VideoBlockObjectResponse["video"]
  >("video", (data) => {
    const { url } = data.type == "file" ? data.file : data.external;
    const path = config.getAssetPath(url);
    const caption = config.formatRichText(data.caption);
    return { url, path, caption };
  });

  config.setBlockParser<
    Notion.PdfBlockObjectResponse["pdf"]
  >("pdf", (data) => {
    const { url } = data.type == "file" ? data.file : data.external;
    const path = config.getAssetPath(url);
    const caption = config.formatRichText(data.caption);
    return { url, path, caption };
  });

  config.setBlockParser<
    Notion.FileBlockObjectResponse["file"]
  >("file", (data) => {
    const { url } = data.type == "file" ? data.file : data.external;
    const path = config.getAssetPath(url);
    const caption = config.formatRichText(data.caption);
    return { url, path, caption };
  });

  config.setBlockParser<
    Notion.LinkPreviewBlockObjectResponse["link_preview"]
  >("link_preview", ({ url }) => {
    return { url };
  });
}
