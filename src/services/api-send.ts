import { browser } from 'wxt/browser'
import type { PathOrUrl, AllowedMethodFor, UpperLower } from '@/services/tldw/openapi-guard'

export interface ApiSendPayload<P extends PathOrUrl = PathOrUrl, M extends AllowedMethodFor<P> = AllowedMethodFor<P>> {
  path: P
  method?: UpperLower<M>
  headers?: Record<string, string>
  body?: any
  noAuth?: boolean
  timeoutMs?: number
}

export interface ApiSendResponse<T = any> {
  ok: boolean
  status: number
  data?: T
  error?: string
  headers?: Record<string, string>
  retryAfterMs?: number | null
}

export async function apiSend<T = any, P extends PathOrUrl = PathOrUrl, M extends AllowedMethodFor<P> = AllowedMethodFor<P>>(
  payload: ApiSendPayload<P, M>
): Promise<ApiSendResponse<T>> {
  const resp = await browser.runtime.sendMessage({ type: 'tldw:request', payload })
  return resp as ApiSendResponse<T>
}
