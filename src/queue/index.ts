import { processKnowledge } from "@/libs/process-knowledge"
import PubSub from "pubsub-js"

export const KNOWLEDGE_QUEUE = Symbol("queue")

let isProcessing = false

PubSub.subscribe(KNOWLEDGE_QUEUE, async (msg, id) => {
  try {
    isProcessing = true
    await processKnowledge(msg, id)
    isProcessing = false
  } catch (error) {
    console.error(error)
    isProcessing = false
  }
})

window.addEventListener("beforeunload", (event) => {
  if (isProcessing) {
    event.preventDefault()
    event.returnValue = ""
  }
})
