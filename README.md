# eleventy-from-notion

Import Notion pages into your Eleventy site.

## Getting started

To install the plugin package, use any of the following commands:

```sh
# For npm:
npx jsr add @vrugtehagel/eleventy-from-notion
# For yarn:
yarn dlx jsr add @vrugtehagel/eleventy-from-notion
# For pnpm:
pnpm dlx jsr add @vrugtehagel/eleventy-from-notion
# For deno:
deno add jsr:@vrugtehagel/eleventy-from-notion
```

To get started with Notion and Eleventy, there's a few things to set up. Let's
start with the basic boilerplate for your Eleventy config file, and then walk
through the more important options to provide to the plugin. After having added
the plugin to your project, import it into your Eleventy configuration file
(usually `.eleventy.js`) and add it using `.addPlugin()`:

```js
import EleventyFromNotion from "@vrugtehagel/eleventy-from-notion";

export default function (eleventyConfig) {
  // …
  eleventyConfig.addPlugin(EleventyFromNotion, {
    integrationSecret: process.env.NOTION_SECRET,
    database: "https://www.notion.so/0123456789abcdef0123456789abcdef",
    output: "notion/",
    schema: [
      // …
    ],
  });
  // …
}
```

There's a few things going on here. First things first; our API key.

### Integration secret

First, you'll need to create an internal Notion integration (which is what
Notion calls their API keys). That sounds difficult, but don't worry; it's
really just a few clicks. The process is described in detail in Notion's
[Create a notion integration][1] documentation, but here's the gist of it:

1. Head to <https://www.notion.com/my-integrations>.
2. Add a new integration.
3. Give it a name, and select "internal" for the integration type.
4. Reduce the permissions to be read-only.

At this point, you should be able to reveal and copy your "Internal Integration
Secret". Since this functions as an API key, which is a password of sorts, you
should _not_ commit this to your version control software. Instead, configure an
environment variable, and set the integration secret using that. By default, if
you don't pass the `integrationSecret` option directly, it is read from the
`NOTION_INTEGRATION_SECRET` environment variable.

### The Notion database page

Next, we'll need to set up a database of pages to import. The integration does
not automatically have access to your entire workspace, but instead, you need to
"connect" the integration to a page, which then gives the integration access to
said page and all pages under it. The plugin expects this "root" page to be a
database, and each entry in the database should be a regular page (which will be
imported). To add the integration to the database page, click the "•••" in the
corner of the page and select "Connections", then find the integration you
configured and select it. Then, in your Eleventy configuration, provide this
database to the plugin, either as a full URL, or as ID (the latter being a UUID
with or without dashes; this is contained within the URL).

### Page property schema

Next, and this is the last thing we need to configure, is our "schema". The
pages you import are part of the specified database, and (can) have additional
properties beyond just their content. These are called "page properties" in
Notion, and the concept is very similar to "front matter" in Eleventy. However,
the structure and naming is naturally a bit different, and you might not want to
import every single page property anyway. So, you'll need to tell the
`EleventyFromNotion` plugin exactly which properties to import, and what to
rename them to. For example, we probably want a page property to configure
permalinks. Let's say we called this field "Page URL" in Notion. We want it to
be imported as "permalink", so that Eleventy knows what URL to write the
template to. To configure this in the schema, we add an array entry like so:

```js
eleventyConfig.addPlugin(EleventyFromNotion, {
  // …
  schema: [
    { name: "Page URL", rename: "permalink" },
  ],
});
```

We can also configure nested front matter keys; for example, say we have a page
property in Notion called "SEO Description", then we can map this to the nested
`seo.description` property by specifying `name: "SEO Description"` together with
`rename: ["seo", "description"]`. And, this brings me to the next point; "text"
page properties in Notion are always rich text. In Eleventy, you might not
always want rich text; for example, an SEO description will probably go into a
`<meta>` tag, in which we want to use plain text. As such, text fields are
mapped to `{ rich, plain }` objects; for the SEO description example, that means
we can refer to it in our layout as `{{ seo.description.plain }}`. The other
page property types map more directly to primitives, such as checkboxes mapping
to booleans, or "select" fields mapping to a string.

### Imported templates

Lastly, a word about how the import process works. You may specify an output
path with the `output` option, which defaults to `notion/`. This is the path,
relative to your Eleventy input directory, that is used to write the imported
templates into. The file names match the page ID from Notion, i.e. they are
dashless UUIDs, and the extension is `.html` by default (though this can be
configured to be something else, like `.njk`). An additional `.notion` file is
created in this directory, which contains a bit of JSON that the plugin uses to
keep track of its state between subsequent runs. If the directory used for
imports is not empty, and it doesn't contain the `.notion` file, the import is
immediately aborted to avoid overwriting files unintentionally. In other words;
do not delete the `.notion` file. If you need to forcefully import all posts,
and you don't want to delete the folder in its entirety, delete the contents of
the `.notion` file rather than the file itself.

For permalinks, there are two main recommended ways of setting things up. The
first option is for when you want to be able to decide the permalink from within
the comfort of Notion. To do this, configure a page property (i.e. database
column) with a type of "URL". This type is important; if you decide to use
"text", then the page property contains rich text, which generates a
`{ rich, plain }` pair in the page's front matter. Eleventy then cannot process
your templates anymore because it expects a string for the `permalink`. This
problem is avoided by using the "URL" type. Note that you must then also
configure your schema to map this page property to front matter; for example, if
the page property is named "Link" then add
`{ name: "Link", rename: "permalink" }` to your `schema` array.

The second way of setting up permalinks is through a computed property in
Eleventy. You are free to add files to the specified output directory (which
defaults to `notion/`), as long as their names don't start with a valid Notion
ID (a UUID with or without dashes). For example, let's say you configured your
output directory to be `output: "external/notion/"`. Then, you can add a file
`external/notion/notion.11tydata.js` containing, for example:

```js
export default {
  permalink: function (data) {
    // Assuming a rich text `title` field is configured:
    return `/blog/${this.slugify(data.title.plain)}/`;
  },
};
```

This way, each post generates its own permalink dynamically.

[1]: https://developers.notion.com/docs/create-a-notion-integration
