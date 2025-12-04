import type * as Notion from "@notionhq/client";
import type { Config } from "../src/config.ts";

export function DefaultsInline(config: Config): void {
  config.setInlineParser<
    Extract<Notion.RichTextItemResponse, { type: "text" }>
  >("color", (data) => {
    const { color } = data.annotations;
    if (!color.endsWith("_background")) return null;
    if (color == "default") return null;
    return color;
  });

  config.setInlineParser<
    Extract<Notion.RichTextItemResponse, { type: "text" }>
  >("link", (data) => {
    return data.text.link?.url ?? null;
  });

  config.setInlineParser<
    Extract<Notion.RichTextItemResponse, { type: "text" }>
  >("bold", (data) => {
    return data.annotations.bold || null;
  });

  config.setInlineParser<
    Extract<Notion.RichTextItemResponse, { type: "text" }>
  >("italic", (data) => {
    return data.annotations.italic || null;
  });

  config.setInlineParser<
    Extract<Notion.RichTextItemResponse, { type: "text" }>
  >("strikethrough", (data) => {
    return data.annotations.strikethrough || null;
  });

  config.setInlineParser<
    Extract<Notion.RichTextItemResponse, { type: "text" }>
  >("underline", (data) => {
    return data.annotations.underline || null;
  });

  config.setInlineParser<
    Extract<Notion.RichTextItemResponse, { type: "text" }>
  >("code", (data) => {
    return data.annotations.code || null;
  });
}
