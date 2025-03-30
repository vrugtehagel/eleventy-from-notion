import type * as Notion from "@notionhq/client";
import type { ExtractGuard, ExtractTyped } from "./extract.ts";

/** Matches Notion's `PageObjectResponse` type. */
export type NotionPage = ExtractGuard<typeof Notion.isFullPage>;

/** Matches Notion's `DatabaseObjectResponse` type. */
export type NotionDatabase = ExtractGuard<typeof Notion.isFullDatabase>;

/** Matches Notion's `RichTextItemResponse` type. */
export type NotionRichText = NotionDatabase["title"][number];

/** Matches Notion's `BlockObjectResponse` type. */
export type NotionFlatBlock = ExtractGuard<typeof Notion.isFullBlock>;

/** Adds an extra `children` property to the `NotionFlatBlock` type in order to
 * support nested block structures. The Notion SDK doesn't let us retrieve
 * nested structures, but we need them, so we create them ourselves and pretend
 * this is how they've always been. */
type NotionNestedBlock = NotionFlatBlock & { children: NotionNestedBlock[] };

/** This is the main type we use for Notion's blocks; they are no longer flat,
 * and support a `Type` parameter, so that we can specify a single block type
 * through e.g. `NotionBlock<"to_do">`. */
export type NotionBlock<
  Type extends NotionFlatBlock["type"] = NotionFlatBlock["type"],
> = ExtractTyped<NotionNestedBlock, Type>;
