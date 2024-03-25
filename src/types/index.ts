import { ChatHistory } from "@/store"

export type BotResponse = {
    bot: {
        text: string
        sourceDocuments: any[]
    }
    history: ChatHistory
    history_id: string
}