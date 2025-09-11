import { db } from './schema'
import type { ProcessedMedia } from './types'

export async function getAllProcessed(): Promise<ProcessedMedia[]> {
  return await db.processedMedia.toArray()
}

export async function getProcessedById(id: string): Promise<ProcessedMedia | undefined> {
  return await db.processedMedia.get(id)
}

export async function deleteProcessed(id: string): Promise<void> {
  await db.processedMedia.delete(id)
}

export async function clearProcessed(): Promise<void> {
  await db.processedMedia.clear()
}

