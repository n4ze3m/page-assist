import { bgRequest } from '@/services/background-proxy'
import { db } from '@/db/dexie/schema'
import { generateID } from '@/db/dexie/helpers'

export interface ProcessOptions {
  storeLocal?: boolean
  metadata?: Record<string, any>
}

export const tldwMedia = {
  async addUrl(url: string, metadata?: Record<string, any>) {
    return await bgRequest<any>({
      path: '/api/v1/media/add',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { url, ...(metadata || {}) }
    })
  },

  async processUrl(url: string, opts?: ProcessOptions) {
    // Process without storing on server
    const res = await bgRequest<any>({
      path: '/api/v1/media/process',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { url, ...(opts?.metadata || {}) }
    })
    if (opts?.storeLocal) {
      try {
        await db.processedMedia.add({
          id: generateID(),
          url,
          title: res?.title || res?.metadata?.title,
          content: res?.content || res?.text || '',
          metadata: res?.metadata || {},
          createdAt: Date.now()
        })
      } catch (e) {
        console.error('Failed to store processed media locally', e)
      }
    }
    return res
  }
}
