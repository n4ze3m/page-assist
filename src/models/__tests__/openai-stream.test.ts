import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { describe, expect, it } from "vitest"
import { CustomChatOpenAI } from "../CustomChatOpenAI"

it("keeps roles, images and tools after the OpenAI client is initialized", async () => {
  const model = new CustomChatOpenAI({
    openAIApiKey: "test",
    modelName: "test"
  })
  let request: any
  model.client = {
    responses: {
      stream: async function* () {
        yield { type: "response.output_text.delta", delta: "lossy response" }
      }
    },
    chat: {
      completions: {
        create: async function* (params) {
          request = params
          yield {
            choices: [
              { index: 0, delta: { role: "assistant", content: "response" } }
            ]
          }
        }
      }
    }
  } as any
  const image = "data:image/png;base64,image"
  const tools = [
    {
      type: "function" as const,
      function: {
        name: "inspect",
        parameters: { type: "object", properties: {} }
      }
    }
  ]
  for await (const _chunk of model._streamResponseChunks(
    [
      new SystemMessage("instructions"),
      new HumanMessage({
        content: [
          { type: "text", text: "question" },
          { type: "image_url", image_url: { url: image } }
        ]
      })
    ],
    { tools }
  )) {
  }
  expect(request?.messages).toEqual([
    { role: "system", content: "instructions" },
    {
      role: "user",
      content: [
        { type: "text", text: "question" },
        { type: "image_url", image_url: { url: image } }
      ]
    }
  ])
  expect(request.tools).toEqual(tools)
})
