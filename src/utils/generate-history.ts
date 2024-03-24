import {
    HumanMessage,
    AIMessage,
    type MessageContent,
} from "@langchain/core/messages"

export const generateHistory = (
    messages: {
        role: "user" | "assistant" | "system"
        content: string
        image?: string
    }[]
) => {
    let history = []
    for (const message of messages) {
        if (message.role === "user") {
            let content: MessageContent = [
                {
                    type: "text",
                    text: message.content
                }
            ]

            if (message.image) {
                content = [
                    {
                        type: "image_url",
                        image_url: message.image
                    },
                    {
                        type: "text",
                        text: message.content
                    }
                ]
            }
            history.push(
                new HumanMessage({
                    content: content
                })
            )
        } else if (message.role === "assistant") {
            history.push(
                new AIMessage({
                    content: [
                        {
                            type: "text",
                            text: message.content
                        }
                    ]
                })
            )
        }
    }
    return history
}