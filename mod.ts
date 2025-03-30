export { Builder as NotionPageBuilder } from "./src/builder.ts";
export { EleventyFromNotion as default } from "./src/eleventy.ts";

export type {
  EleventyFromNotionOptions,
  EleventyOptions,
} from "./src/types/eleventy.ts";
export type {
  BlockFormatters,
  BlockInfo,
  BuilderOptions,
  BuildOptions,
  InlineFormatters,
} from "./src/types/options.ts";
export type { FrontMatter } from "./src/types/output.ts";
