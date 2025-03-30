import * as process from "node:process";
import type { BuilderOptions } from "../types/options.ts";

/** Retrieves the so-called integration secret (i.e. API token) for Notion.
 * can be specified as a string, or through the `NOTION_INTEGRATION_SECRET`
 * environment variable. */
export function getAuth(
  secret: BuilderOptions["integrationSecret"],
): string {
  if (typeof secret == "string") return secret;
  if (secret != null) throw Error("The 'integrationSecret' must be a string");
  const auth = process.env.NOTION_INTEGRATION_SECRET;
  if (auth) return auth;
  throw Error(`Missing integration secret as option or environment variable`);
}
