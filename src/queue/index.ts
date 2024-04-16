import { processKnowledge } from "@/libs/process-knowledge"
import PubSub from "pubsub-js"

export const KNOWLEDGE_QUEUE = Symbol("queue")

PubSub.subscribe(KNOWLEDGE_QUEUE, processKnowledge)
