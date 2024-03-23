import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Skeleton, Radio, Form, Alert } from "antd"
import React from "react"
import { SaveButton } from "~/components/Common/SaveButton"
import {
  getWebSearchPrompt,
  setSystemPromptForNonRagOption,
  systemPromptForNonRagOption,
  geWebSearchFollowUpPrompt,
  setWebPrompts
} from "~/services/ollama"

export const SettingPrompt = () => {
  const [selectedValue, setSelectedValue] = React.useState<"normal" | "web">(
    "web"
  )

  const queryClient = useQueryClient()

  const { status, data } = useQuery({
    queryKey: ["fetchOllaPrompt"],
    queryFn: async () => {
      const [prompt, webSearchPrompt, webSearchFollowUpPrompt] =
        await Promise.all([
          systemPromptForNonRagOption(),
          getWebSearchPrompt(),
          geWebSearchFollowUpPrompt()
        ])

      return {
        prompt,
        webSearchPrompt,
        webSearchFollowUpPrompt
      }
    }
  })

  return (
    <div className="flex flex-col gap-3">
      {status === "pending" && <Skeleton paragraph={{ rows: 4 }} active />}

      {status === "success" && (
        <div>
          <div className="my-3 flex justify-end">
            <Radio.Group
              defaultValue={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}>
              <Radio.Button value="normal">Normal</Radio.Button>
              <Radio.Button value="web">Web</Radio.Button>
            </Radio.Group>
          </div>

          {selectedValue === "normal" && (
            <Form
              layout="vertical"
              onFinish={(values) => {
                setSystemPromptForNonRagOption(values?.prompt || "")
                queryClient.invalidateQueries({
                  queryKey: ["fetchOllaPrompt"]
                })
              }}
              initialValues={{
                prompt: data.prompt
              }}>
              <Form.Item>
                <Alert
                  message="Configuring the system prompt here is deprecated. Please use the Manage Prompts section to add or edit prompts. This section will be removed in a future release"
                  type="warning"
                  showIcon
                  closable
                />
              </Form.Item>
              <Form.Item label="System Prompt" name="prompt">
                <textarea
                  value={data.prompt}
                  rows={5}
                  id="ollamaPrompt"
                  placeholder="Your System Prompt"
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-[#262626] dark:text-gray-100"
                />
              </Form.Item>
              <Form.Item>
                <div className="flex justify-end">
                  <SaveButton btnType="submit" />
                </div>{" "}
              </Form.Item>
            </Form>
          )}

          {selectedValue === "web" && (
            <Form
              layout="vertical"
              onFinish={(values) => {
                setWebPrompts(
                  values?.webSearchPrompt || "",
                  values?.webSearchFollowUpPrompt || ""
                )
                queryClient.invalidateQueries({
                  queryKey: ["fetchOllaPrompt"]
                })
              }}
              initialValues={{
                webSearchPrompt: data.webSearchPrompt,
                webSearchFollowUpPrompt: data.webSearchFollowUpPrompt
              }}>
              <Form.Item
                label="Web Search Prompt"
                name="webSearchPrompt"
                help="Do not remove `{search_results}` from the prompt."
                rules={[
                  {
                    required: true,
                    message: "Please input your Web Search Prompt!"
                  }
                ]}>
                <textarea
                  value={data.webSearchPrompt}
                  rows={5}
                  id="ollamaWebSearchPrompt"
                  placeholder="Your Web Search Prompt"
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-[#262626] dark:text-gray-100"
                />
              </Form.Item>
              <Form.Item
                label="Web Search Follow Up Prompt"
                name="webSearchFollowUpPrompt"
                help="Do not remove `{chat_history}` and `{question}` from the prompt."
                rules={[
                  {
                    required: true,
                    message: "Please input your Web Search Follow Up Prompt!"
                  }
                ]}>
                <textarea
                  value={data.webSearchFollowUpPrompt}
                  rows={5}
                  id="ollamaWebSearchFollowUpPrompt"
                  placeholder="Your Web Search Follow Up Prompt"
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-[#262626] dark:text-gray-100"
                />
              </Form.Item>
              <Form.Item>
                <div className="flex justify-end">
                  <SaveButton btnType="submit" />
                </div>{" "}
              </Form.Item>
            </Form>
          )}
        </div>
      )}
    </div>
  )
}
