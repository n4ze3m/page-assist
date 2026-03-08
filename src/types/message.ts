import { ChatDocuments } from "@/models/ChatTypes"
import { ChatMessageKind, McpToolCall } from "@/libs/mcp/types"

type WebSearch = {
  search_engine: string
  search_url: string
  search_query: string
  search_results: {
    title: string
    link: string
  }[]
}
export type Message = {
  isBot: boolean
  name: string
  message: string
  sources: any[]
  images?: string[]
  search?: WebSearch
  messageType?: string
  id?: string
  generationInfo?: any
  reasoning_time_taken?: number
  modelImage?: string
  modelName?: string
  documents?: ChatDocuments
  messageKind?: ChatMessageKind
  toolCalls?: McpToolCall[]
  toolCallId?: string
  toolName?: string
  toolServerName?: string
  toolError?: boolean
}
