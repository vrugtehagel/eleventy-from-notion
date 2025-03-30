import type { BuilderOptions, BuildOptions } from "./options.ts";

/** As part of the Eleventy build process, Notion is queried for updated Notion
 * pages, and they are processed and written into a special folder. The
 * filenames for the templates match the Notion page UUID, without the dashes.
 * The extension is `.html` by default, but can be configured using the
 * `extension` option. By default, these Notion templates are put into the
 * `notion/` folder under your Eleventy input directory. Note that the
 * templates are only updated as part of an Eleventy "build" run, not when
 * serving or watching. */
export type EleventyOptions = {
  /** The database containing all pages that should be imported. This should be
   * specified as an ID (a UUID, either with or without the dashes) or a URL
   * to the database's page (either as a string or URL object).
   *
   * You must add the internal Notion integration to this page by finding and
   * selecting it by navigating to "••• > Connections". This page functions as
   * an index, so will not itself generate an output template. */
  database: string | URL;

  /** The folder to write the Eleventy templates to after being imported or
   * updated from Notion. Is relative to your Eleventy input directory, and
   * defaults to `/notion/`. For example, if your input directory is `src/`,
   * then templates are dumped into `src/notion/`. The plugin keeps track of
   * the last updated time using the `.notion` file in this output folder; if
   * the specified output folder exists but does not contain the `.notion` file
   * then an error is thrown. This is to prevent unintentionally overwriting
   * files that were not meant to be overwritten.
   *
   * Do not modify the templates in this directory. */
  output?: string;

  /** The extension to use for the templates. The filename matches the Notion
   * page ID. By default, the extension is `html`, which is processed by
   * Eleventy as Liquid. This can be avoided by setting Eleventy's
   * `htmlTemplateEngine` to `false`. That can be done either in your Eleventy
   * configuration file, to disable it altogether, or you may put a data file
   * in the output directory, as long as its filename does not start with a
   * valid UUID nor a valid UUID without dashes. */
  extension?: string;

  /** Large imports can take a while due to Notion's rate limits, so it can be
   * helpful to know how far along an import really is. As such, the plugin by
   * default lets you know how many pages will be imported, and logs the
   * progress during the import process. To disable these messages, set this
   * option to `true`. */
  quiet?: boolean;

  /** If a Notion pages was updated, but its output template file was modified
   * since the last successful import, then skip the importing of this page.
   * This is mostly useful for large imports, or imports that can error out
   * halfway through, since the plugin's "last updated" timestamp is only
   * updated after a _successful_ import. Defaults to `false`. */
  skipModified?: boolean;
};

/** To use the plugin, you must pass an options object configuring a few
 * things, such as your integration secret, your Notion database ID or URL,
 * a schema for processing your Notion page properties, and optionally
 * formatters to adjust the way rich text or blocks are converted to HTML. */
export type EleventyFromNotionOptions =
  & BuilderOptions
  & BuildOptions
  & EleventyOptions;
