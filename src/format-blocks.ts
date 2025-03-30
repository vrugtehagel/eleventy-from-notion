import { formatInline } from "./format-inline.ts";
import type {
  BlockFormatters,
  BlockInfo,
  InlineFormatters,
} from "./types/options.ts";
import type { NotionBlock, NotionRichText } from "./types/notion.ts";

/** Block formatting is not super complicated. The most difficult part is to
 * transform the `NotionBlock` objects into simplified `BlockInfo` objects, and
 * the secondary difficulty is comforting TypeScript because it doesn't quite
 * understand what the type of `block[block.type]` is for `NotionBlock`
 * objects.
 *
 * Naturally, as most things in this package ended up, this is a recursive
 * process. Formatting a block into a string of HTML requires us to format its
 * child blocks first. So this trickles down the nested tree of blocks until
 * we've formatted everything. */
export function formatBlocks(
  blocks: NotionBlock[],
  formatters: { inline: Required<InlineFormatters>; block: BlockFormatters },
  parent: BlockInfo | null = null,
): string {
  const infos: BlockInfo[] = [];
  while (addNextSiblingBlockInfo(blocks, infos, formatters, parent)) continue;
  return blocks.map((block, index) => {
    return formatBlock(block, infos[index], formatters);
  }).join("");
}

/** Adds the next sibling block in an array of `BlockInfo` objects, given their
 * respective `NotionBlock` objects. Returns `true` if there is a next sibling
 * to add, otherwise returns `false`. */
function addNextSiblingBlockInfo(
  blocks: NotionBlock[],
  infos: BlockInfo[],
  formatters: { inline: Required<InlineFormatters>; block: BlockFormatters },
  parent: BlockInfo | null,
): boolean {
  if (blocks.length == infos.length) return false;
  const index = infos.length;
  const block = blocks[index];
  const info: Partial<BlockInfo> = {};
  const type = block.type.replace(/_(\w)/g, (_, char) => char.toUpperCase());
  info.type = type as BlockInfo["type"];
  info.parent = parent;
  info.previous = infos[index - 1] ?? null;
  const getNext = () => infos[index + 1] ?? null;
  Object.defineProperty(info, "next", { get: getNext });
  const extras = getExtras[type]?.(block, formatters.inline);
  Object.assign(info, extras);
  infos.push(info as BlockInfo);
  return infos.length < blocks.length;
}

/** Format a single block to a string of HTML, using the user-specified block
 * formatters (and the fallback block formatters). Note that inline formatting
 * still also applies because blocks (can) also contain rich text. */
function formatBlock(
  block: NotionBlock,
  info: BlockInfo,
  formatters: { inline: Required<InlineFormatters>; block: BlockFormatters },
): string {
  const type = block.type as keyof NotionBlock;
  const data = block[type] as { rich_text?: NotionRichText[] };
  const content = formatInline(data?.rich_text ?? [], formatters.inline).rich;
  const children = formatBlocks(block.children, formatters, info);
  const formatter = formatters.block[info.type];
  if (!formatter) throw Error(`Block type '${info.type}' is unsupported`);
  return (formatter as Function)(content, children, info);
}

/** Getters for the additional block info for each block type that has it. */
const getExtras: Record<string, Function> = {
  toDo: (block: NotionBlock<"to_do">) => {
    const { checked } = block.to_do;
    return { checked };
  },
  toggle: (block: NotionBlock<"toggle">) => {
    const { color } = block.toggle;
    return { color };
  },
  childPage: (block: NotionBlock<"child_page">) => {
    const { title } = block.child_page;
    return { title };
  },
  childDatabase: (block: NotionBlock<"child_database">) => {
    const { title } = block.child_database;
    return { title };
  },
  equation: (block: NotionBlock<"equation">) => {
    const { expression } = block.equation;
    return { expression };
  },
  code: (
    block: NotionBlock<"code">,
    formatters: Required<InlineFormatters>,
  ) => {
    const { language } = block.code;
    const caption = formatInline(block.code.caption, formatters);
    return { language, caption };
  },
  callout: (block: NotionBlock<"callout">) => {
    const { color } = block.callout;
    return { color };
  },
  table: (block: NotionBlock<"table">) => {
    const width = block.table.table_width;
    const hasColumnHeader = block.table.has_column_header;
    const hasRowHeader = block.table.has_row_header;
    return { width, hasColumnHeader, hasRowHeader };
  },
  tableRow: (
    block: NotionBlock<"table_row">,
    formatters: Required<InlineFormatters>,
  ) => {
    const rawCells = block.table_row.cells;
    const cells = rawCells.map((cell) => formatInline(cell, formatters).rich);
    return { cells };
  },
  embed: (
    block: NotionBlock<"embed">,
    formatters: Required<InlineFormatters>,
  ) => {
    const { url } = block.embed;
    const caption = formatInline(block.embed.caption, formatters);
    return { caption, url };
  },
  bookmark: (
    block: NotionBlock<"bookmark">,
    formatters: Required<InlineFormatters>,
  ) => {
    const { url } = block.bookmark;
    const caption = formatInline(block.bookmark.caption, formatters);
    return { caption, url };
  },
  image: (
    block: NotionBlock<"image">,
    formatters: Required<InlineFormatters>,
  ) => {
    const { image } = block;
    const caption = formatInline(image.caption, formatters);
    const { url } = image.type == "file" ? image.file : image.external;
    return { caption, url };
  },
  video: (
    block: NotionBlock<"video">,
    formatters: Required<InlineFormatters>,
  ) => {
    const { video } = block;
    const caption = formatInline(video.caption, formatters);
    const { url } = video.type == "file" ? video.file : video.external;
    return { caption, url };
  },
  pdf: (
    block: NotionBlock<"pdf">,
    formatters: Required<InlineFormatters>,
  ) => {
    const { pdf } = block;
    const caption = formatInline(pdf.caption, formatters);
    const { url } = pdf.type == "file" ? pdf.file : pdf.external;
    return { caption, url };
  },
  file: (
    block: NotionBlock<"file">,
    formatters: Required<InlineFormatters>,
  ) => {
    const { file } = block;
    const caption = formatInline(file.caption, formatters);
    const { url } = file.type == "file" ? file.file : file.external;
    return { caption, url };
  },
  linkPreview: (block: NotionBlock<"link_preview">) => {
    const { url } = block.link_preview;
    return { url };
  },
};
