import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"
import { getAllMemories, addMemory } from "@/db/dexie/memory"
import { Storage } from "@plasmohq/storage"

const MAX_MEMORIES = 20

const storage = new Storage()

export const createMemoryTool = () => {
  return new DynamicStructuredTool({
    name: "page_assist_save_memory",
    description:
      "Save a memory about the user's preferences, habits, personality, or important information they've shared. Use this proactively whenever you learn something personal about the user that will help you understand them better — no need to wait for them to ask you to remember. Also use it when the user explicitly asks you to remember something. Memories persist across conversations.",
    schema: z.object({
      content: z
        .string()
        .min(3)
        .describe("The memory content to save")
    }),
    func: async ({ content }) => {
      const memories = await getAllMemories()

      if (memories.length >= MAX_MEMORIES) {
        return "Memory is full (maximum 20 memories reached). Please ask the user to manage their existing memories in Settings > Memory before saving new ones."
      }

      const memory = await addMemory(content)
      return `Memory saved successfully: "${memory.content}"`
    }
  })
}

export const isMemoryEnabled = async (): Promise<boolean> => {
  const enabled = await storage.get("enableMemory")
  return !!enabled
}
