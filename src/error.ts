export function error(
  parts: TemplateStringsArray,
  ...subs: string[]
): never {
  const key = parts.map((part, index) => `$${index}${part}`).join("").slice(2);
  const message = messages[key];
  if (!message) throw error`missing-error-${key}`;
  throw new Error(message(...subs).replaceAll(/  +/g, " "));
}

const messages: Record<string, (...args: string[]) => string> = {
  "missing-error-$1": (type) => `
    Attempted to throw an error "${type}" but no description for such error was
    found. This is a bug; please file an issue.
  `,
  "missing-secret": () => `
    No integration secret was specified.
    Please set up an environment variable containing the secret, and pass it as
    \`setIntegrationSecret(process.env.SECRET_NAME)\`.
    By default, the "NOTION_INTEGRATION_SECRET" environment variable is looked
    up and used, in which case no secret needs to be be configured explicitly.
  `,
  "secret-not-string": () => `
    Invalid argument to \`setIntegrationSecret()\`.
    The secret must be specified as a string.
    Note; do not specify it as a string literal! For security, it should not be
    included as plain text in your source files.
    Configure the secret as an environment variable instead, and pass it as
    \`process.env.SECRET_NAME\` or equivalent.
  `,
  "extension-not-string": () => `
    Invalid argument to \`setOutputExtension()\`.
    The output extension must be specified as a string.
  `,
  "missing-output-extension": () => `
    No output extension was specified.
    Either import and add the built-in \`Markdown\` plugin,
    or configure a custom extension using \`setOutputExtension()\`.
  `,
  "directory-not-string": () => `
    Invalid argument to \`setOutputDirectory()\`.
    The output directory path must be specified as a string.
  `,
  "absolute-directory": () => `
    Cannot configure an absolute directory as output directory.
    Please specify a location relative to the current working directory.
  `,
  "missing-output-directory": () => `
    No output directory was specified.
    Configure a CWD-relative path using \`setOutputDirectory()\`.
  `,
  "cache-corrupted": () => `
    Uh oh! The \`.notion\` cache file has been corrupted.
    Please restore the contents of the \`.notion\` file, or delete it.
  `,
  "client-not-initialized": () => `
    A method was called that requires the Notion client to make API calls,
    but the Notion client was not yet initialized.
  `,
  "data-source-id-not-string": () => `
    Invalid argument to \`setDataSourceId()\`.
    The data source ID must be specified as a string.
  `,
  "database-id-not-string": () => `
    Invalid argument to \`setDatabaseId()\`.
    The database ID must be specified as a string.
  `,
  "database-id-not-uuid": () => `
    The provided database ID does not match the expected format.
    It must be a valid UUID (optionally without its dashes).
  `,
  "invalid-database-url": () => `
    The specified database URL doesn't match the expected format.
  `,
  "missing-database-or-data-source-id": () => `
    Cannot retrieve the data source ID; no database or data source specified.
    Use either:
    - \`config.setDataSourceId(dataSourceId)\`
    - \`config.setDatabaseId(databaseId)\`
    - \`config.setDatabaseIdFromUrl(databaseUrl)\`
  `,
  "cannot-fetch-data-source-id": () => `
    A database ID was specified, but no associated data source was found.
    The specified database ID or URL points to a page of the wrong type.
  `,
  "empty-database": () => `
    A database ID was specified, but no associated data source was found.
    The specified database page does not seem to contain a data source.
  `,
  "cannot-nest-in-nothing": () => `
    A critical front-matter nesting error occurred.
    This is a bug; please file an issue.
  `,
  "cannot-nest-in-primitive": () => `
    A nested property was specified, but it cannot be nested because one of the
    intermediate objects was found to be a primitive.
    Please check your \`importProperty()\` and \`importMeta()\` calls.
  `,
  "cannot-run-$1": (method: string) => `
    Invalid call to \`${method}()\` while running the importer.
    This method can only be called during configuration.
  `,
  "cannot-run-$1-parser": (context: string) => `
    Cannot configure a parser for ${context} contexts during importing.
    This can only be done during configuration.
  `,
  "missing-$1-data-parser": (type: string) => `
    A property of type "${type}" was imported, but no parser was specified.
    Please define a parser using \`setDataParser()\`.
  `,
  "parser-type-not-string": () => `
    Invalid parser type; parser types must be strings.
  `,
  "filter-not-function": () => `
    A skip or delete filter must be specified as a function.
    This function receives a page as argument and should return a boolean.
  `,
  "format-inline-must-start-at-start": () => `
    Cannot call \`format()\` on \`Inline\` instance except for the first one.
    Rich text formatting is done from left to right.
  `,
  "formatter-type-not-string": () => `
    Invalid type for inline or block formatter.
    The block or inline type must be specified as a string.
  `,
  "meta-$1-not-found": (name: string) => `
    Tried to retrieve the "${name}" metadata property, but it does not exist.
    Please check the Notion API docs for the available properties.
  `,
  "meta-not-string": () => `
    Invalid first argument to \`importMeta()\`.
    The metadata property name must be specified as a string.
  `,
  "meta-rename-not-array": () => `
    Invalid second argument to \`importMeta()\`.
    The rename for the property must be a string or array of strings.
  `,
  "property-$1-not-found": (name: string) => `
    Tried to retrieve the "${name}" property, but it does not exist.
    Make sure the properties registered actually exist as a database column.
  `,
  "property-not-string": () => `
    Invalid first argument to \`importProperty()\`.
    The metadata property name must be specified as a string.
  `,
  "property-rename-not-array": () => `
    Invalid second argument to \`importProperty()\`.
    The rename for the property must be a string or array of strings.
  `,
  "missing-$1-block-formatter": (type: string) => `
    A block formatter for type "${type}" was requested, but not configured.
    Please specify a formatter for this type using \`setBlockFormatter()\`.
  `,
  "missing-$1-inline-formatter": (type: string) => `
    An inline formatter for type "${type}" was requested, but not configured.
    Please specify a formatter for this type using \`setInlineFormatter()\`.
  `,
  "missing-data-formatter": () => `
    No data formatter was specified.
    Import and add the built-in \`Json\` or \`Yaml\` data formatter plugin,
    or specify custom a formatter using \`setDataFormatter()\`.
  `,
  "resolver-not-function": () => `
    The value provided to \`setAssetPathResolver()\` was not a function.
    It should be a function that receives a single parameter, the local asset
    path, and returns a resolved asset path (both are strings).
  `,
  "$1-lacks-children": (thing: string) => `
    A ${thing} was asked about its children before it had loaded any.
    This is a bug; please file an issue.
  `,
  "missing-block-body": () => `
    A block's \`body\` getter was invoked before the body was ready.
    This is a bug; please file an issue.
  `,
  "unsupported-inline-type-$1": (type: string) => `
    Currently, parsing and formatting ${type}s is not yet supported.
  `,
};
