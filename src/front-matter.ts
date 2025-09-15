import * as Notion from "@notionhq/client";
import { formatInline } from "./format-inline.ts";
import type { InlineFormatters } from "./types/options.ts";
import type { FrontMatter } from "./types/output.ts";
import type { NotionPage } from "./types/notion.ts";

/** Given one of Notion's page objects and a set of build options, build the
 * formatted front matter. */
export function getFrontMatter(
  page: NotionPage,
  formatters: Required<InlineFormatters>,
  schema: Array<{ name: string; rename: string[] }>,
): FrontMatter {
  const result: FrontMatter = {};
  for (const property of schema) {
    const value = getPropertyValue(page, property.name, formatters);
    setNested(result, property.rename, value);
  }
  return result;
}

/** Retrieve a page property's formatted value. Throws if the property doesn't
 * exist or if it exists but its type is not understood. */
function getPropertyValue(
  page: NotionPage,
  name: string,
  formatters: Required<InlineFormatters>,
): FrontMatter[string] {
  const exists = name in page.properties;
  if (!exists) throw Error(`Page property '${name}' not found`);
  const property = page.properties[name];
  const { type } = property;
  if (type == "url") return property[type];
  if (type == "email") return property[type];
  if (type == "number") return property[type];
  if (type == "checkbox") return property[type];
  if (type == "phone_number") return property[type];
  if (type == "created_time") return property[type];
  if (type == "last_edited_time") return property[type];
  if (type == "select") return property[type]?.name ?? null;
  if (type == "status") return property[type]?.name ?? null;
  if (type == "multi_select") return property[type].map((item) => item.name);
  if (type == "title") return formatInline(property[type], formatters);
  if (type == "rich_text") return formatInline(property[type], formatters);
  if (type == "date") return property[type] && formatDate(property[type]);
  if (type == "created_by") return formatUser(property[type]);
  if (type == "last_edited_by") return formatUser(property[type]);
  if (type == "people") return formatUsers(property[type]);
  throw Error(`Page property type '${type}' is unsupported`);
}

/** Slightly adjust Notion's date formatting. */
function formatDate(
  date: { start: string; end: string | null; time_zone: string | null },
): { start: string; end?: string; timezone?: string } {
  const { start, end, time_zone: timezone } = date;
  if (end && timezone) return { start, end, timezone };
  if (end) return { start, end };
  if (timezone) return { start, timezone };
  return { start };
}

/** Turn a (partial) Notion user into a simplified user object, if possible. */
function formatUser(
  user: Parameters<typeof Notion.isFullUser>[0],
): { name: string; email?: string } | null {
  if (!Notion.isFullUser(user)) return null;
  if (!user.name) return null;
  const { name } = user;
  if (user.type == "bot") return { name };
  const email = user.person.email;
  if (email) return { name, email };
  return { name };
}

/** Turn multiple (partial) Notion users into an array of simplified user
 * objects. */
function formatUsers(
  users: Array<
    Parameters<typeof Notion.isFullUser>[0] | Notion.GroupObjectResponse
  >,
): Array<{ name: string; email?: string }> {
  const eligible = users.filter((user) => user.object != "group");
  const formatted = eligible.map((user) => formatUser(user));
  return formatted.filter((user) => user != null);
}

/** Sets a value on a nested object, creating intermediate objects where
 * necessary. Modifies the input `object`. For example, if `object` is `{}`,
 * `keys` is `["foo", "bar"]` and `value` is `23`, then the `object` is mutated
 * to be `{ foo: { bar: 23 } }`. This is a recursive function. */
function setNested(
  object: FrontMatter,
  [key, ...keys]: string[],
  value: FrontMatter[string],
): void {
  if (!key) throw Error("Unreachable");
  if (keys.length == 0) return void (object[key] = value);
  object[key] ??= {};
  if (typeof object[key] != "object") throw Error("Unreachable");
  if (Array.isArray(object[key])) throw Error("Unreachable");
  setNested(object[key], keys, value);
}
