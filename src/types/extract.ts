/** Extracts a type from a type guard function. This allows us to extract some
 * basic types from Notion's SDK, since most overarching types have
 * corresponding type guards. */
export type ExtractGuard<
  Guard,
> = Guard extends (arg: any) => arg is infer Type ? Type : never;

/** Filter a union type based on some subtype. Helpful to define a type for
 * specific types of block. For example, if `Fruits` has a union type of
 * `{ type: "apple" } | { type: "pear" }`, then we can retrieve the type for
 * a specific fruit by doing `ExtractTyped<Fruits, "pear">` to obtain
 * `{ type: "pear" }`. */
export type ExtractTyped<
  Union,
  Type extends string,
> = Union extends { type: Type } ? Union : never;
