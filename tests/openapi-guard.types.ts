// This file is not executed; it is used by TypeScript as a compile-time
// assertion that `bgRequest` is only ever called with `AllowedPath` or
// absolute URLs. If someone widens the path type to a plain string,
// the @ts-expect-error annotations below will start failing.

import type { AllowedPath, PathOrUrl } from '@/services/tldw/openapi-guard'
import { bgRequest } from '@/services/background-proxy'

// Valid relative paths should type-check.
const _ok1: Promise<any> = bgRequest({ path: '/api/v1/health', method: 'GET' })
const _ok2: Promise<any> = bgRequest({ path: '/api/v1/notes/search/', method: 'POST' })

// Absolute URLs are also permitted.
const _ok3: Promise<any> = bgRequest({ path: 'http://127.0.0.1:8000/api/v1/health' as PathOrUrl, method: 'GET' })

// Invalid paths must remain rejected by the type system.
// If `path` is ever widened to `string`, these @ts-expect-error markers
// will fail and remind us to restore the guard.
// @ts-expect-error - arbitrary strings must not be allowed as API paths
bgRequest({ path: 'api/v1/health', method: 'GET' })

// @ts-expect-error - missing leading slash is not an AllowedPath
bgRequest({ path: 'api/v1/unknown', method: 'GET' })

