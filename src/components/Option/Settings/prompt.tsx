import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Skeleton, Radio, Form, Alert } from "antd"
import React from "react"
import { useTranslation } from "react-i18next"
import { SaveButton } from "~/components/Common/SaveButton"
import {
  getWebSearchPrompt,
  setSystemPromptForNonRagOption,
  systemPromptForNonRagOption,
  geWebSearchFollowUpPrompt,
  setWebPrompts
} from "~/services/ollama"

export const SettingPrompt = () => {
  const { t } = useTranslation("settings")

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
              <Radio.Button value="normal">
                {t("ollamaSettings.settings.prompt.option1")}
              </Radio.Button>
              <Radio.Button value="web">
                {t("ollamaSettings.settings.prompt.option2")}
              </Radio.Button>
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
                  message={t("ollamaSettings.settings.prompt.alert")}
                  type="warning"
                  showIcon
                  closable
                />
              </Form.Item>
              <Form.Item
                label={t("ollamaSettings.settings.prompt.systemPrompt")}
                name="prompt">
                <textarea
                  value={data.prompt}
                  rows={5}
                  id="ollamaPrompt"
                  placeholder={t(
                    "ollamaSettings.settings.prompt.systemPromptPlaceholder"
                  )}
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
                label={t("ollamaSettings.settings.prompt.webSearchPrompt")}
                name="webSearchPrompt"
                help={t("ollamaSettings.settings.prompt.webSearchPromptHelp")}
                rules={[
                  {
                    required: true,
                    message: t(
                      "ollamaSettings.settings.prompt.webSearchPromptError"
                    )
                  }
                ]}>
                <textarea
                  value={data.webSearchPrompt}
                  rows={5}
                  id="ollamaWebSearchPrompt"
                  placeholder={t(
                    "ollamaSettings.settings.prompt.webSearchPromptPlaceholder"
                  )}
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-[#262626] dark:text-gray-100"
                />
              </Form.Item>
              <Form.Item
                label={t("ollamaSettings.settings.prompt.webSearchFollowUpPrompt")}
                name="webSearchFollowUpPrompt"
                help={t("ollamaSettings.settings.prompt.webSearchFollowUpPromptHelp")}
                rules={[
                  {
                    required: true,
                    message: t("ollamaSettings.settings.prompt.webSearchFollowUpPromptError")
                  }
                ]}>
                <textarea
                  value={data.webSearchFollowUpPrompt}
                  rows={5}
                  id="ollamaWebSearchFollowUpPrompt"
                  placeholder={t("ollamaSettings.settings.prompt.webSearchFollowUpPromptPlaceholder")}
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
