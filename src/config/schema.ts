import type { BuildOptions } from "../types/options.ts";

/** Gets the normalized schema given some user-defined page properties. */
export function getSchema(
  schema?: BuildOptions["schema"],
): Array<{ name: string; rename: string[] }> {
  const isArray = Array.isArray(schema);
  if (!isArray) throw Error("The 'schema' option must be an array");
  const normalized = schema.map((entry) => normalize(entry));
  validateSchema(normalized);
  return normalized;
}

/** Normalizes (and validates) a schema entry, specifically transforming the
 * `rename` property to always be an array of strings (and to always exist). */
function normalize(
  schemaEntry: { name: string; rename?: string | string[] },
): { name: string; rename: string[] } {
  const { name, rename } = schemaEntry;
  const isString = typeof name == "string";
  if (!isString) throw Error("Schema 'name' properties must be strings");
  if (rename == null) return { name, rename: [name] };
  if (typeof rename == "string") return { name, rename: [rename] };
  const isArray = Array.isArray(rename);
  if (!isArray) throw Error("The 'rename' property must be a string or array");
  if (rename.length == 0) throw Error("A 'rename' array must not be empty");
  const allStrings = rename.every((key) => typeof key == "string");
  if (!allStrings) throw Error("All 'rename' array items must be strings");
  return { name, rename };
}

/** Makes sure the schema makes sense. Since you can specify nested objects, we
 * must validate that they don't clash; for example, if you specify `["foo"]`
 * for one key, and `["foo", "bar"]` for another, then we can't possibly
 * construct the front matter properly because `foo.bar` cannot exist if `foo`
 * contains a value. This also makes sure duplicate paths are disallowed. */
function validateSchema(
  schema: Array<{ name: string; rename: string[] }>,
): void {
  if (schema.length <= 1) return;
  const [property, ...others] = schema;
  const path = property.rename;
  const hasOverlap = others.some((property) => overlaps(property.rename, path));
  if (!hasOverlap) return validateSchema(others);
  throw Error(`Schema property '${path.join(".")}' overlaps with another`);
}

/** Test if one array "starts with" another; that is, the items in the shorter
 * array correspond one-to-one with the items at the same indexes in the other
 * array. The argument order is irrelevant; they are swapped if a shorter array
 * is passed as first argument. */
function overlaps(longer: string[], shorter: string[]): boolean {
  if (longer.length < shorter.length) return overlaps(shorter, longer);
  return shorter.every((item, index) => longer[index] == item);
}
