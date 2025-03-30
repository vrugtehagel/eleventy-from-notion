import type { EleventyOptions } from "../types/eleventy.ts";

const FULL_UUID = /^[0-9a-f]{8}-([0-9a-f]{4}-){3}-[0-9a-f]{12}$/i;
const COMPACT_UUID = /^[0-9a-f]{32}$/i;
const NON_HEX_CHAR = /[^0-9a-f]/i;

/** Retrieve the UUID (either full or compact) of the database specified by the
 * user. */
export function getDatabaseId(database: EleventyOptions["database"]): string {
  if (!database) throw Error("Missing 'database' option");
  if (database instanceof URL) return getDatabaseIdFromUrl(database);
  const isString = typeof database == "string";
  if (!isString) throw Error("'database' option must be a UUID or URL");
  if (FULL_UUID.test(database)) return database;
  if (COMPACT_UUID.test(database)) return database;
  try {
    return getDatabaseIdFromUrl(new URL(database));
  } catch {}
  throw Error("Unrecognized format for 'database' option");
}

/** Retrieve the UUID from the URL of a page. The page URL contains the compact
 * UUID within the path, at the end. */
function getDatabaseIdFromUrl(url: URL): string {
  const parts = url.pathname.split(NON_HEX_CHAR);
  const uuid = parts.findLast((part) => COMPACT_UUID.test(part));
  if (uuid) return uuid;
  throw Error("Could not extract database UUID from URL");
}
