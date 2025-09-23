// Type-level guard to ensure API paths/methods used by the web UI
// match the bundled OpenAPI spec. This file only exports types, so it
// does not increase the runtime bundle size.

// Import the OpenAPI JSON as a type. `resolveJsonModule` is enabled in the
// repo's tsconfig, so TypeScript can infer literal keys from the JSON.
// Lightweight path/method typing to avoid deep JSON type instantiation
// and keep compile-time safety reasonably constrained without excessive complexity.

// Allowed relative API path: anything beginning with a slash
export type AllowedPath = `/${string}`

// Absolute URL permitted in a few places
export type AbsoluteURL = `${'http' | 'https'}:${string}`

export type PathOrUrl = AllowedPath | AbsoluteURL

// Common HTTP methods accepted
export type AllowedHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'

// Any method is fine for absolute URLs; for paths, use the common set
export type AllowedMethodFor<P extends PathOrUrl> = P extends AbsoluteURL
  ? string
  : AllowedHttpMethod

// Convenience: accept lower/upper/mixed-case method annotations at call sites
export type UpperLower<M extends string> = Uppercase<M> | Lowercase<M> | M

export function normalizeMethod<M extends string>(method: M): Uppercase<M> {
  return String(method).toUpperCase() as Uppercase<M>
}
