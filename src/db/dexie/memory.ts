import { db } from "./schema"
import { Memory, Memories } from "./types"
import { generateID } from "../index"

export const getAllMemories = async (): Promise<Memories> => {
  try {
    const memories = await db.memories.orderBy("createdAt").reverse().toArray()
    return memories
  } catch (error) {
    console.error("Error getting all memories:", error)
    return []
  }
}

export const addMemory = async (content: string): Promise<Memory> => {
  const now = Date.now()
  const memory: Memory = {
    id: generateID(),
    content: content.trim(),
    createdAt: now,
    updatedAt: now
  }

  await db.memories.add(memory)
  return memory
}

export const updateMemory = async (
  id: string,
  content: string
): Promise<Memory | null> => {
  const memory = await db.memories.get(id)

  if (!memory) {
    return null
  }

  const updatedMemory: Memory = {
    ...memory,
    content: content.trim(),
    updatedAt: Date.now()
  }

  await db.memories.put(updatedMemory)
  return updatedMemory
}

export const deleteMemory = async (id: string): Promise<boolean> => {
  try {
    await db.memories.delete(id)
    return true
  } catch (error) {
    console.error("Error deleting memory:", error)
    return false
  }
}

export const deleteAllMemories = async (): Promise<void> => {
  await db.memories.clear()
}

export const getMemoryById = async (id: string): Promise<Memory | null> => {
  const memory = await db.memories.get(id)
  return memory || null
}

export const bulkAddMemories = async (memories: Memory[]): Promise<void> => {
  await db.memories.bulkAdd(memories)
}

export const exportMemories = async (): Promise<Memories> => {
  return await getAllMemories()
}

export const importMemories = async (memories: Memories): Promise<void> => {
  await bulkAddMemories(memories)
}

export const getMemoriesAsContext = async (): Promise<string> => {
  const memories = await getAllMemories()

  if (memories.length === 0) {
    return ""
  }

  const memoryContext = memories
    .map((memory) => {
      return `- ${memory.content}`
    })
    .join("\n")

  return `User Context (Personal Memories):\n${memoryContext}`
}
