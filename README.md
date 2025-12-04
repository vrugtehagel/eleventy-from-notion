# eleventy-from-notion

Import Notion pages into your Eleventy site.

## Getting started

To install the plugin package, use any of the following commands:

```bash
# For npm:
npx jsr add @vrugtehagel/eleventy-from-notion
# For yarn:
yarn dlx jsr add @vrugtehagel/eleventy-from-notion
# For pnpm:
pnpm dlx jsr add @vrugtehagel/eleventy-from-notion
# For deno:
deno add jsr:@vrugtehagel/eleventy-from-notion
```

To get started with Notion and Eleventy, there's a few things to set up. To
avoid polluting your Eleventy config with a bunch of Notion-related
configuration, your Notion configuration is expected to be written in a
different file; by default, a `notion.config.js` file alongside your
`eleventy.config.js` (or `.eleventy.js`) file. The only thing you need in your
Eleventy config is

```js
import EleventyFromNotion from "@vrugtehagel/eleventy-from-notion";

export default function (eleventyConfig) {
  // …
  eleventyConfig.addPlugin(EleventyFromNotion, {
    config: "notion.config.js",
  });
  // …
}
```

If you'd like to use the default path, the options object can be omitted
entirely. The plugin does not take any other options in this form; all remaining
configuration is done in your Notion config file. The syntax used in the Notion
config file closely resembles that of your Eleventy config; here's an example.

```js
import * as process from "node:process";
import { Markdown, Yaml } from "@vrugtehagel/eleventy-from-notion";

export default function (notionConfig) {
  notionConfig.use(Markdown);
  notionConfig.use(Yaml);

  notionConfig.setIntegrationSecret(process.env.NOTION_SECRET);
  notionConfig.setDataSourceId("0123456789abcdef0123456789abcdef");
  notionConfig.setOutputDirectory("./src/posts/");

  notionConfig.importProperty("URL", "permalink");
  notionConfig.importProperty("Name", "title");
  notionConfig.importProperty("Status", "status");
  notionConfig.importMeta("cover", "hero");

  notionConfig.skip((page) => page.frontMatter.status == "editing");
  notionConfig.delete((page) => page.frontMatter.status == "deleted");
}
```

## Integration secret

First things first; the importer needs an API key to be able to fetch your
Notion content. You'll need to create an internal Notion integration (which is
what Notion calls their API keys). That might sound difficult, but don't worry;
it's really just a few clicks. The process is described in detail in Notion's
[Create a Notion integration](https://developers.notion.com/docs/create-a-notion-integration)
documentation, but here's the gist of it:

1. Head to <https://www.notion.com/my-integrations>.
2. Add a new integration.
3. Give it a name, and select "internal" for the integration type.
4. Reduce the permissions to be read-only.

At this point, you should be able to reveal and copy your "Internal Integration
Secret". Since this functions as an API key, which is a password of sorts, you
should not commit this to your version control software. Instead, configure an
environment variable, and set the integration secret using that. By default, if
you don't tell the plugin about the integration secret directly, it is read from
the `NOTION_INTEGRATION_SECRET` environment variable.

## The Notion data source

Next, we'll need to set up a data source containing pages to import. The
integration does not automatically have access to your entire workspace, but
instead, you need to "connect" the integration to a page, which then gives the
integration access to said page and all pages under it. There are a few ways to
specify this data source, but no matter how you specify it, each entry in the
database should be a regular page (which will be imported). To add the
integration to the database page, click the "•••" in the corner of the page and
select "Connections", then find the integration you configured and select it.
Then, in your Notion configuration, provide the data source to the plugin in one
of the following ways:

- By data source ID. This is the preferred method, as it avoids some additional
  work for the plugin. To retrieve the data source ID for a table, click the
  "settings" icon (to the right of the "New" button), hit "Manage data sources",
  locate the table in question, then click the "•••" to reveal the "Copy data
  source ID" button. Then add it in your Notion config using
  `notionConfig.setDataSourceId(…)`.
- By a URL point at a database. Since a database can contain multiple data
  sources, the plugin will automatically select the first data source. Set this
  in your Notion config using `notionConfig.setDatabaseIdFromUrl(…)`. The
  database ID is then extracted from the URL.
- As an alternative to specifying a URL, you may extract the database ID from
  the URL manually (typically the dashless UUID right after `notion.so/`, before
  any query parameters), then add it using `notionConfig.setDatabaseId(…)`.

## Properties

Next, we can optionally configure the page properties to import. Your data
source in Notion likely has columns; when navigating to a page, they are
presented as what in Eleventy would be front matter. You may import any number
of these using

```js
notionConfig.importProperty(notionName, eleventyName);
```

Here `notionName` must match the column name in Notion exactly. The property is
then imported and its value found under the front matter key specified in
`eleventyName`. You may specify `eleventyName` as a string or array of strings;
in the latter case, the property is nested with each array entry a nesting
level.

You may also import Notion page metadata. This is completely independent from
your data source columns; all Notion pages have this metadata. For example, a
page's icon (`"icon"`), cover image (`"cover"`), or whether it is locked
(`"is_locked"`). These may be specified the same way as properties, using

```js
notionConfig.importMeta(notionName, eleventyName);
```

### Data types

Both properties and metadata properties have a variety of different types. Page
properties may be rich text, URLs, multiselects, numbers, files, and so on.
Metadata properties have types, too, e.g. icons are strings, cover images are
files, and `is_locked` is a boolean. This plugin covers most of the basic types,
but not every property type is supported out-of-the-box. When trying to add such
a property, the plugin will tell you its type is unsupported and a data parser
is required. You may then specify how you'd like to interpret this property type
using

```js
notionConfig.setDataParser("type", (data) => {
  // …
});
```

## Imported templates

Since Notion pages aren't inherently exposed as being a certain format, the
plugin requires formatters in order to turn the objects returned by the Notion
API into strings. Most of the time, you'll want to either import pages as
Markdown or HTML; as such, this plugin provides built-in subplugins to achieve
this. Similarly, it exposes plugins to stringify the front matter in a certain
format, namely YAML or JSON. Here's an example on how to use them:

```js
import { Markdown, Yaml } from "@vrugtehagel/eleventy-from-notion";

export default function (notionConfig) {
  // …
  notionConfig.use(Markdown);
  notionConfig.use(Yaml);
  // …
}
```

Similar to the wide variety of data types Notion support, it supports many
different block types. A majority of them translate well into HTML or Markdown,
and the `Markdown` and `Html` plugins take care of this translation for you. In
some cases, like a multi-column layout, this translation isn't obvious, and thus
no sensible default can be provided. You can add (or overwrite) support for
block types using

```js
config.setBlockFormatter("type", (block) => {
  // …
});
```

For examples, you may refer to the `Markdown` and `Html` plugins' source code
shipped with this package.

If all data types, block types, and inline types (for rich text) are supported,
the Notion pages can be imported. Each page is imported as a file under the
directory specified with `notionConfig.setOutputDirectory(…)`. The extension
matches the content's format, and the file names match the page IDs from Notion.
Assets are also imported into the same directory; they are named
`asset-[filename]-[hash].[ext]` where the hash is base64 cut to 8 characters.
Lastly, a `.notion` file is created in the output directory, which is used to
cache data across runs (most importantly the timestamp for the most recent
successful import). Beyond this, you are free to add files and directories in
the output directory, as long as they don't clash with files imported. In
particular, adding a directory data file is allowed.

If you'd like to force a reimport, delete the `.notion` file or its contents.

## Permalink

For permalinks, there are two main recommended ways of setting things up. The
first option is for when you want to be able to decide the permalink from within
the comfort of Notion. To do this, configure a page property (i.e. data source
column) with a type of "URL". This type is important; if you decide to use
"text", then the page property contains rich text, which generates a
`{ rich, plain }` pair in the page's front matter. Eleventy then cannot process
your templates anymore because it expects a string for the permalink. This
problem is avoided by using the "URL" type. Note that you must then also import
this page property; for example, if the page property is named "Link" then
import it using `notionConfig.importProperty("Link", "permalink")` in your
Notion config.

The second way of setting up permalinks is through a computed property in
Eleventy. You are free to add files to the specified output directory, as long
as their names don't start with a valid Notion ID (a UUID with or without
dashes) or `asset-`. For example, let's say you configured your output directory
to be `external/notion/`. Then, you can add a file
`external/notion/notion.11tydata.js` containing:

```js
export default {
  permalink: function (data) {
    // Assuming a rich text `title` field is configured:
    return `/blog/${this.slugify(data.title.plain)}/`;
  },
};
```

This way, each post generates its own permalink dynamically.
