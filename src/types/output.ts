/** Notion page properties are mapped to JSON-compatible objects, to be used in
 * a page's front matter (metadata). Most conversions are fairly
 * straight-forward, such as a "checkbox" type outputting a boolean, but some
 * are a bit more specific:
 *
 * - "text" page properties map to a `{ rich, plain }` object, to provide
 *   access to both the rich text (a string of HTML) as well as plain text, as
 *   Notion itself does not allow users to make this distinction.
 * - User-related page properties, such as the `"people"` type, convert to
 *   simple objects with a `name` property, and an `email` property if an email
 *   address was found.
 * - "date" page properties convert to `{ start, end, timezone }` objects. Not
 *   all dates are specified as ranges, but the distinction is made within the
 *   single "date" page property itself, rather than having different page
 *   properties for it. The `end` and `timezone` properties are therefore
 *   omitted according to the property's configuration.
 * - Empty properties may be mapped to `null` depending on their type. For
 *   example, the "select" property is mapped to `null` when empty, but the
 *   multiselect property is mapped to `[]` when no option was selected.
 *
 * Since mapping page properties to nested keys is permitted, this is a
 * recursive type. */
export type FrontMatter = {
  [key: string]:
    | boolean
    | number
    | string
    | string[]
    | { rich: string; plain: string }
    | { name: string; email?: string }
    | Array<{ name: string; email?: string }>
    | { start: string; end?: string; timezone?: string }
    | null
    | FrontMatter;
};
