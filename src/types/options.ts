/** Options passed to the page builder class. Configures the underlying Notion
 * client. Structural options and formatting options are passed to individual
 * methods. */
export type BuilderOptions = {
  /** The integration secret for your Notion workspace. This must be set up as
   * described in
   * <https://developers.notion.com/docs/create-a-notion-integration>. In a
   * nutshell:
   *
   * 1. Head to <https://www.notion.com/my-integrations>.
   * 2. Add a new integration.
   * 3. Give it a name, and select "internal" for the integration type.
   * 4. Recommended: reduce the permissions to be read-only.
   *
   * Now you should be able to reveal and copy your "Internal Integration
   * Secret". This secret should _not_ be committed to your version control
   * software; that means, do not set this option to a string directly.
   * Instead, configure a secret or environment variable and use that,
   * for example, `integrationSecret: process.env.MY_NOTION_SECRET`.
   *
   * By default (i.e. if you do not pass this option at all) the plugin
   * looks for an environment variable by the name of
   * `NOTION_INTEGRATION_SECRET`. If your environment specifies this
   * variable already, and you don't want that to be used, set this option
   * explicitly using an environment variable under a different name, as
   * described above. */
  integrationSecret?: string;

  /** An object of properties to pass down to the underlying Notion client.
   * Notably, the `auth` option must not be supplied; it is read from the
   * `integrationSecret` option. Also, this package specifies its own custom
   * `fetch` option, in order to work with Notion's rate limits of ~3 requests
   * per second. It is recommended not to overwrite that. */
  notionClientOptions?: Omit<Record<string, unknown>, "auth">;
};

/** Options determining how a Notion page transforms into an object of metadata
 * (front matter) and a string of HTML. */
export type BuildOptions = {
  /** Maps a page property in Notion to a key in the generated object of
   * metadata. The `name` option must match the name of the page property (i.e.
   * database column) in Notion. The property's value is then placed under the
   * key or path specified by `rename` (which defaults to the value in `name`).
   * When `rename` is specified as an array of strings, then the property is
   * nested under the specified keys.
   *
   * For example, if we specify `name: "SEO description"` together with
   * `rename: ["seo", "description"]`, then the value of the `"SEO description"
   * field in Notion can be accessed using the metadata by accessing the nested
   * `seo.description` property. */
  schema: Array<{ name: string; rename?: string | string[] }>;

  /** The formatters to use for both inline text (Notion calls this "rich
   * text") and blocks.
   *
   * For inline formatting, sensible fallbacks are set in an attempt to
   * generate somewhat semantic HTML by default. However, each type can be
   * overwritten to allow for completely custom rich text stringification.
   * Technically, it doesn't even need to stringify to HTML.
   *
   * > [!NOTE]
   * > Due to limitations in the Notion API, it is impossible to support both
   * > text colors as well as background colors for text. As such, text colors
   * > are not supported. The `color` formatter refers to text background
   * > colors only. Text colors are ignored, but using them can break
   * > the processing of specified background colors.
   *
   * For block formatting, there are types that do not have a fallback, because
   * there is not always a default that makes sense for the majority of users.
   * When the builder encounters a block of a type that is not specified and
   * does not have a fallback, a warning is logged and the block (including all
   * of its children) are ignored. To prevent this, you must specify your own
   * block formatter of the type in question. */
  formatters?: {
    inline?: InlineFormatters;
    block?: BlockFormatters;
  };
};

/**
 * For inline formatting, sensible fallbacks are set in an attempt to
 * generate somewhat semantic HTML by default. However, each type can be
 * overwritten to allow for completely custom rich text stringification.
 * Technically, it doesn't even need to stringify to HTML.
 *
 * > [!NOTE]
 * > Due to limitations in the Notion API, it is impossible to support both
 * > text colors as well as background colors for text. As such, text colors
 * > are not supported. The `color` formatter refers to text background
 * > colors only. Text colors are ignored, but using them can break
 * > the processing of specified background colors.
 *
 * All of these are optional; each of them has a fallback. By default, the
 * types are transformed to HTML using the following mapping:
 *
 * - `link` becomes `<a href=…>`;
 * - `bold` becomes `<strong>`;
 * - `italic` becomes `<em>`;
 * - `strikethrough` becomes `<s>`;
 * - `underline` becomes `<b>`;
 * - `code` becomes `<code>`;
 * - `color` becomes `<mark class=…>`
 *
 * In particular I've chosen underlined text to become `<b>`, not `<u>`,
 * because the latter is rarely semantically accurate (or useful, for that
 * matter) whereas `<b>`, the "bring to attention" element, more accurately
 * represents how I expect most people to use underlined text. To make sure
 * this is visually reflected in your HTML pages, use `font-weight: normal;`
 * together with `text-decoration: underline`. */
export type InlineFormatters = {
  link?: (content: string, info: { url: string }) => string;
  bold?: (content: string, info: {}) => string;
  italic?: (content: string, info: {}) => string;
  strikethrough?: (content: string, info: {}) => string;
  underline?: (content: string, info: {}) => string;
  code?: (content: string, info: {}) => string;
  color?: (content: string, info: { color: string }) => string;
};

/** A set of function defining how to format a block into a string (usually a
 * string of HTML). Each formatter receives three arguments; first, its
 * contents, already stringified to HTML. For block types without content, such
 * as the `"divider"` type or the `"image"` type, an empty string is passed.
 * For the second argument, the children of the block is passed, as an
 * already-formatted string of HTML. Again, for block types that cannot have
 * children, such as a `"paragraph"` or `"embed"`, an empty string is passed.
 * Lastly, the third argument represents some contextual information about the
 * block, such as the previous or next sibling block, its parent, its type, or,
 * in some cases, some additional information about the specific block. This
 * is helpful for some block types that are a little less straight-forward to
 * stringify, such as bulleted list items (since they need to be surrounded by
 * a `<ul>` as a group of siblings) or tables. */
export type BlockFormatters = {
  paragraph?: (
    content: string,
    children: "",
    info: BaseBlockInfo<"paragraph">,
  ) => string;
  heading1?: (
    content: string,
    children: "",
    info: BaseBlockInfo<"heading1">,
  ) => string;
  heading2?: (
    content: string,
    children: "",
    info: BaseBlockInfo<"heading2">,
  ) => string;
  heading3?: (
    content: string,
    children: "",
    info: BaseBlockInfo<"heading3">,
  ) => string;
  bulletedListItem?: (
    content: string,
    children: string,
    info: BaseBlockInfo<"bulletedListItem">,
  ) => string;
  numberedListItem?: (
    content: string,
    children: string,
    info: BaseBlockInfo<"numberedListItem">,
  ) => string;
  quote?: (
    content: string,
    children: string,
    info: BaseBlockInfo<"quote">,
  ) => string;
  toDo?: (
    content: string,
    children: string,
    info: BaseBlockInfo<"toDo"> & {
      checked: boolean;
    },
  ) => string;
  toggle?: (
    content: string,
    children: string,
    info: BaseBlockInfo<"toggle"> & {
      color: string;
    },
  ) => string;
  synced?: (
    content: "",
    children: string,
    info: BaseBlockInfo<"synced">,
  ) => string;
  childPage?: (
    content: "",
    children: "",
    info: BaseBlockInfo<"childPage"> & {
      title: string;
    },
  ) => string;
  childDatabase?: (
    content: "",
    children: "",
    info: BaseBlockInfo<"childDatabase"> & {
      title: string;
    },
  ) => string;
  equation?: (
    content: "",
    children: "",
    info: BaseBlockInfo<"equation"> & {
      expression: string;
    },
  ) => string;
  code?: (
    content: string,
    children: "",
    info: BaseBlockInfo<"code"> & {
      language: string;
      caption: { rich: string; plain: string };
    },
  ) => string;
  callout?: (
    content: string,
    children: string,
    info: BaseBlockInfo<"callout"> & {
      color: string;
    },
  ) => string;
  divider?: (
    content: "",
    children: "",
    info: BaseBlockInfo<"divider">,
  ) => string;
  breadcrumb?: (
    content: "",
    children: "",
    info: BaseBlockInfo<"breadcrumb">,
  ) => string;
  tableOfContents?: (
    content: "",
    children: "",
    info: BaseBlockInfo<"tableOfContents">,
  ) => string;
  columnList?: (
    content: "",
    children: string,
    info: BaseBlockInfo<"columnList">,
  ) => string;
  column?: (
    content: "",
    children: string,
    info: BaseBlockInfo<"column">,
  ) => string;
  table?: (
    content: "",
    children: string,
    info: BaseBlockInfo<"table"> & {
      width: number;
      hasColumnHeader: boolean;
      hasRowHeader: boolean;
    },
  ) => string;
  tableRow?: (
    content: "",
    children: "",
    info: BaseBlockInfo<"tableRow"> & {
      cells: string[];
    },
  ) => string;
  embed?: (
    content: "",
    children: "",
    info: BaseBlockInfo<"embed"> & {
      caption: { rich: string; plain: string };
      url: string;
    },
  ) => string;
  bookmark?: (
    content: "",
    children: "",
    info: BaseBlockInfo<"bookmark"> & {
      caption: { rich: string; plain: string };
      url: string;
    },
  ) => string;
  image?: (
    content: "",
    children: "",
    info: BaseBlockInfo<"image"> & {
      caption: { rich: string; plain: string };
      url: string;
    },
  ) => string;
  video?: (
    content: "",
    children: "",
    info: BaseBlockInfo<"video"> & {
      caption: { rich: string; plain: string };
      url: string;
    },
  ) => string;
  pdf?: (
    content: "",
    children: "",
    info: BaseBlockInfo<"pdf"> & {
      caption: { rich: string; plain: string };
      url: string;
    },
  ) => string;
  file?: (
    content: "",
    children: "",
    info: BaseBlockInfo<"file"> & {
      caption: { rich: string; plain: string };
      url: string;
    },
  ) => string;
  linkPreview?: (
    content: "",
    children: "",
    info: BaseBlockInfo<"linkPreview"> & {
      url: string;
    },
  ) => string;
};

/** The common structure for all `info` parameters in block formatters. For
 * simple block types, these properties are all they have, for example
 * paragraphs or a divider. Some other types receive extra properties, such as
 * a table row receiving `cells` or a code block receiving the `language` and
 * `caption` properties. The `previous`, `next` and `parent` properties are
 * the same type as the `info` argument passed to any arbitrary block. */
type BaseBlockInfo<Type extends keyof BlockFormatters> = {
  type: Type;
  previous: BlockInfo | null;
  next: BlockInfo | null;
  parent: BlockInfo | null;
};

/** The exact info argument for a certain block type, or generically for all
 * block types if the type parameter is omitted. */
export type BlockInfo<
  Type extends keyof BlockFormatters = keyof BlockFormatters,
> = Parameters<Required<BlockFormatters>[Type]>[2];
