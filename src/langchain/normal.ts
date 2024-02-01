import { HumanMessage, AIMessage } from "@langchain/core/messages"
import { ChatMessageHistory } from "langchain/stores/message/in_memory"
import { ChatOllama } from "@langchain/community/chat_models/ollama"
import { getOllamaURL } from "~services/ollama"
import { cleanUrl } from "~libs/clean-url"

export class NormalChatOllama {
  ollama: ChatOllama

  async _init() {
    const ollamaURL = await getOllamaURL()
    this.ollama = new ChatOllama({
      baseUrl: cleanUrl(ollamaURL),
      model: "qwen:1.8b-chat"
    })
  }

  constructor() {
    this._init()
  }

  async send(message: HumanMessage) {
    if (!this.ollama) return null
  }
}
