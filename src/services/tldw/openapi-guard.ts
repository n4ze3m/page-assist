// Type-level guard to ensure API paths/methods used by the web UI
// match the bundled OpenAPI spec. This file only exports types, so it
// does not increase the runtime bundle size.

// Import the OpenAPI JSON as a type. `resolveJsonModule` is enabled in the
// repo's tsconfig, so TypeScript can infer literal keys from the JSON.
import type OpenAPISpec from '../../../openapi.json'

// Narrow the parts of the spec we care about: paths and their HTTP methods.
export type OpenApiPaths = OpenAPISpec['paths']
export type AllowedPath = Extract<keyof OpenApiPaths, string>
export type AllowedMethod<P extends AllowedPath> = Extract<keyof OpenApiPaths[P], string>

// Replace OpenAPI-style path params like {id} with `${string}` for runtime strings
type ReplaceParams<S extends string> = S extends `${infer A}{${string}}${infer B}`
  ? `${A}${string}${ReplaceParams<B>}`
  : S

// Runtime-acceptable path strings derived from the spec
export type RuntimePath = {
  [K in AllowedPath]: ReplaceParams<K>
}[AllowedPath]

// Given a runtime path, find its corresponding spec path key
type SpecPathForRuntime<R extends RuntimePath> = {
  [K in AllowedPath]: R extends ReplaceParams<K> ? K : never
}[AllowedPath]

// Support absolute URLs (used in a few spots), which we don’t constrain by spec
export type AbsoluteURL = `${'http' | 'https'}:${string}`
export type PathOrUrl = RuntimePath | AbsoluteURL

// If the path is one of the declared paths, constrain the method to those declared for that path.
// If the path is an absolute URL, allow any method string.
export type AllowedMethodFor<P extends PathOrUrl> = P extends RuntimePath
  ? AllowedMethod<SpecPathForRuntime<P>>
  : string

// Convenience: accept lower/upper/mixed-case method annotations at call sites
export type UpperLower<M extends string> = Uppercase<M> | Lowercase<M> | M

// Helper to normalize methods at runtime if needed by callers (optional)
export function normalizeMethod<M extends string>(method: M): Uppercase<M> {
  return String(method).toUpperCase() as Uppercase<M>
}
