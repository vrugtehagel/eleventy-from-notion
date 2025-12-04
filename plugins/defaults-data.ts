import * as Notion from "@notionhq/client";
import type { Config } from "../src/config.ts";

export function DefaultsData(config: Config): void {
  config.setDataParser<
    Notion.UrlPropertyItemObjectResponse["url"]
  >("url", (data) => {
    return data;
  });

  config.setDataParser<
    Notion.EmailPropertyItemObjectResponse["email"]
  >("email", (data) => {
    return data;
  });

  config.setDataParser<
    Notion.NumberPropertyItemObjectResponse["number"]
  >("number", (data) => {
    return data;
  });

  config.setDataParser<
    Notion.CheckboxPropertyItemObjectResponse["checkbox"]
  >("checkbox", (data) => {
    return data;
  });

  config.setDataParser<
    Notion.PhoneNumberPropertyItemObjectResponse["phone_number"]
  >("phone_number", (data) => {
    return data;
  });

  config.setDataParser<
    Notion.CreatedTimePropertyItemObjectResponse["created_time"]
  >("created_time", (data) => {
    return data;
  });

  config.setDataParser<
    Notion.LastEditedTimePropertyItemObjectResponse["last_edited_time"]
  >("last_edited_time", (data) => {
    return data;
  });

  config.setDataParser<
    Notion.SelectPropertyItemObjectResponse["select"]
  >("select", (data) => {
    return data?.name;
  });

  config.setDataParser<
    Notion.StatusPropertyItemObjectResponse["status"]
  >("status", (data) => {
    return data?.name;
  });

  config.setDataParser<
    Notion.MultiSelectPropertyItemObjectResponse["multi_select"]
  >("multi_select", (data) => {
    return data.map((item) => item.name);
  });

  config.setDataParser<
    Notion.TitlePropertyItemObjectResponse["title"]
  >("title", (data) => {
    // @ts-ignore I think this type error is a bug in Notion's SDK
    return config.formatRichText(data);
  });

  config.setDataParser<
    Notion.RichTextPropertyItemObjectResponse["rich_text"]
  >("rich_text", (data) => {
    // @ts-ignore I think this type error is a bug in Notion's SDK
    return config.formatRichText(data);
  });

  config.setDataParser<
    Notion.DatePropertyItemObjectResponse["date"]
  >("date", (data) => {
    if (!data) return null;
    const { start, end, time_zone: timezone } = data;
    if (end && timezone) return { start, end, timezone };
    if (end) return { start, end };
    if (timezone) return { start, timezone };
    return { start };
  });

  config.setDataParser<
    Notion.CreatedByPropertyItemObjectResponse["created_by"]
  >("created_by", (data) => {
    if (!Notion.isFullUser(data)) return null;
    if (!data.name) return null;
    const { name } = data;
    if (data.type == "bot") return { name };
    const email = data.person.email;
    if (email) return { name, email };
    return { name };
  });

  config.setDataParser<
    Notion.LastEditedByPropertyItemObjectResponse["last_edited_by"]
  >("last_edited_by", (data) => {
    if (!Notion.isFullUser(data)) return null;
    if (!data.name) return null;
    const { name } = data;
    if (data.type == "bot") return { name };
    const email = data.person.email;
    if (email) return { name, email };
    return { name };
  });

  config.setDataParser<
    Notion.PageObjectResponse["icon"]
  >("icon", (data) => {
    if (!data) return null;
    if (data.type != "emoji") return;
    return data.emoji;
  });

  config.setDataParser<
    Notion.PageObjectResponse["cover"]
  >("cover", (data) => {
    if (!data) return null;
    const { type } = data;
    const { url } = type == "file" ? data.file : data.external;
    const path = config.getAssetPath(url);
    return path;
  });

  config.setDataParser<
    Notion.PageObjectResponse["archived"]
  >("archived", (data) => {
    return data;
  });

  config.setDataParser<
    Notion.PageObjectResponse["in_trash"]
  >("in_trash", (data) => {
    return data;
  });

  config.setDataParser<
    Notion.PageObjectResponse["is_locked"]
  >("is_locked", (data) => {
    return data;
  });
}
