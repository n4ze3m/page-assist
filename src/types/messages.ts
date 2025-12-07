/**
 * Message types for chat interactions.
 * Replaces @langchain/core/messages types.
 */

export type MessageRole = "system" | "human" | "ai" | "function" | "tool"

export type MessageContentText = {
  type: "text"
  text: string
}

export type MessageContentImageUrl = {
  type: "image_url"
  image_url: string | { url: string }
}

export type MessageContentPart = MessageContentText | MessageContentImageUrl

export type MessageContent = string | MessageContentPart[]

export interface MessageFields {
  content: MessageContent
  additional_kwargs?: Record<string, any>
}

/**
 * Base message class with role discrimination.
 */
export abstract class BaseMessage {
  content: MessageContent
  additional_kwargs: Record<string, any>

  constructor(fields: MessageFields | MessageContent) {
    if (typeof fields === "string" || Array.isArray(fields)) {
      this.content = fields
      this.additional_kwargs = {}
    } else {
      this.content = fields.content
      this.additional_kwargs = fields.additional_kwargs ?? {}
    }
  }

  abstract _getType(): MessageRole
}

/**
 * System message for initial instructions.
 */
export class SystemMessage extends BaseMessage {
  _getType(): MessageRole {
    return "system"
  }
}

/**
 * Human/user message.
 */
export class HumanMessage extends BaseMessage {
  _getType(): MessageRole {
    return "human"
  }
}

/**
 * AI/assistant message.
 */
export class AIMessage extends BaseMessage {
  _getType(): MessageRole {
    return "ai"
  }
}

/**
 * Streaming chunk of an AI message.
 */
export class AIMessageChunk extends AIMessage {
  constructor(fields: MessageFields | MessageContent) {
    super(fields)
  }
}

/**
 * Function call message (for tool use).
 */
export class FunctionMessage extends BaseMessage {
  name: string

  constructor(fields: MessageFields & { name: string }) {
    super(fields)
    this.name = fields.name
  }

  _getType(): MessageRole {
    return "function"
  }
}

/**
 * Tool response message.
 */
export class ToolMessage extends BaseMessage {
  tool_call_id: string

  constructor(fields: MessageFields & { tool_call_id: string }) {
    super(fields)
    this.tool_call_id = fields.tool_call_id
  }

  _getType(): MessageRole {
    return "tool"
  }
}
