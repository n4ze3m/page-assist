import { generateID } from "./helpers"
import { db } from "./schema"
import { HistoryInfo } from "./types"

export const generateBranchMessage = async (
  history_id: string,
  branchMessageIndex: number
) => {
  return await db.transaction(
    "rw",
    db.messages,
    db.chatHistories,
    db.sessionFiles,
    async () => {
      const chats = await db.messages
        .where("history_id")
        .equals(history_id)
        .toArray()
      const historyInfo = await db.chatHistories.get(history_id)

      const sortedMessages = chats.sort((a, b) => a.createdAt - b.createdAt)

      const messages = sortedMessages.slice(0, branchMessageIndex + 1)

      const newHistoryId = generateID()

      const history: HistoryInfo = {
        ...historyInfo,
        message_source: "branch",
        id: newHistoryId,
        createdAt: Date.now(),
      }

      await db.chatHistories.add(history)

      const newMessages = messages.map((message) => ({
        ...message,
        id: generateID(),
        history_id: newHistoryId
      }))

      await db.messages.bulkAdd(newMessages)

      const sessionFiles = await db.sessionFiles.get(history_id)

      if (sessionFiles) {
        const newSessionFiles = {
          ...sessionFiles,
          history_id: newHistoryId
        }
        await db.sessionFiles.put(newSessionFiles)
      }

      return {
        messages: newMessages,
        history
      }
    }
  )
}
