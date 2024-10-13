import { useMutation, useQuery } from "@tanstack/react-query"
import React from "react"
import {
  getOllamaURL,
  systemPromptForNonRag,
  promptForRag,
  setOllamaURL as saveOllamaURL,
  setPromptForRag,
  setSystemPromptForNonRag,
  getAllModels,
  defaultEmbeddingChunkOverlap,
  defaultEmbeddingChunkSize,
  defaultEmbeddingModelForRag,
  saveForRag,
  getEmbeddingModels
} from "~/services/ollama"

import {
  Skeleton,
  Radio,
  Select,
  Form,
  InputNumber,
  Collapse,
  Switch
} from "antd"
import { useDarkMode } from "~/hooks/useDarkmode"
import { SaveButton } from "~/components/Common/SaveButton"
import { SUPPORTED_LANGUAGES } from "~/utils/supporetd-languages"
import { useMessage } from "~/hooks/useMessage"
import { MoonIcon, SunIcon } from "lucide-react"
import { Trans, useTranslation } from "react-i18next"
import { useI18n } from "@/hooks/useI18n"
import { TTSModeSettings } from "@/components/Option/Settings/tts-mode"
import { AdvanceOllamaSettings } from "@/components/Common/Settings/AdvanceOllamaSettings"
import { useStorage } from "@plasmohq/storage/hook"
import { getTotalFilePerKB } from "@/services/app"
import { SidepanelRag } from "@/components/Option/Settings/sidepanel-rag"

export const SettingsBody = () => {
  const { t } = useTranslation("settings")
  const [ollamaURL, setOllamaURL] = React.useState<string>("")
  const [systemPrompt, setSystemPrompt] = React.useState<string>("")
  const [ragPrompt, setRagPrompt] = React.useState<string>("")
  const [ragQuestionPrompt, setRagQuestionPrompt] = React.useState<string>("")
  const [selectedValue, setSelectedValue] = React.useState<"normal" | "rag">(
    "normal"
  )
  const [copilotResumeLastChat, setCopilotResumeLastChat] = useStorage(
    "copilotResumeLastChat",
    false
  )

  const [hideCurrentChatModelSettings, setHideCurrentChatModelSettings] =
    useStorage("hideCurrentChatModelSettings", false)

  const [ speechToTextLanguage, setSpeechToTextLanguage ] = useStorage(
    "speechToTextLanguage",
    "en-US"
  )
  const { mode, toggleDarkMode } = useDarkMode()

  const { changeLocale, locale, supportLanguage } = useI18n()

  const { data, status } = useQuery({
    queryKey: ["sidebarSettings"],
    queryFn: async () => {
      const [
        ollamaURL,
        systemPrompt,
        ragPrompt,
        allModels,
        chunkOverlap,
        chunkSize,
        defaultEM,
        totalFilePerKB
      ] = await Promise.all([
        getOllamaURL(),
        systemPromptForNonRag(),
        promptForRag(),
        getEmbeddingModels({ returnEmpty: true }),
        defaultEmbeddingChunkOverlap(),
        defaultEmbeddingChunkSize(),
        defaultEmbeddingModelForRag(),
        getTotalFilePerKB()
      ])

      return {
        url: ollamaURL,
        normalSystemPrompt: systemPrompt,
        ragSystemPrompt: ragPrompt.ragPrompt,
        ragQuestionPrompt: ragPrompt.ragQuestionPrompt,
        models: allModels,
        chunkOverlap,
        chunkSize,
        defaultEM,
        totalFilePerKB
      }
    }
  })

  const { mutate: saveRAG, isPending: isSaveRAGPending } = useMutation({
    mutationFn: async (f: {
      model: string
      chunkSize: number
      overlap: number
    }) => {
      await saveForRag(f.model, f.chunkSize, f.overlap, data.totalFilePerKB)
    }
  })

  React.useEffect(() => {
    if (data) {
      setOllamaURL(data.url)
      setSystemPrompt(data.normalSystemPrompt)
      setRagPrompt(data.ragSystemPrompt)
      setRagQuestionPrompt(data.ragQuestionPrompt)
    }
  }, [data])

  if (status === "pending") {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton active />
        <Skeleton active />
        <Skeleton active />
        <Skeleton active />
      </div>
    )
  }

  if (status === "error") {
    return <div>Error</div>
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl">
      <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-[#171717]">
        <h2 className="text-md font-semibold dark:text-white">
          {t("managePrompts.title")}
        </h2>
        <div className="my-3 flex justify-end">
          <Radio.Group
            defaultValue={selectedValue}
            onChange={(e) => setSelectedValue(e.target.value)}>
            <Radio.Button value="normal">
              {t("managePrompts.option1")}
            </Radio.Button>
            <Radio.Button value="rag">
              {t("managePrompts.option2")}
            </Radio.Button>
          </Radio.Group>
        </div>

        {selectedValue === "normal" && (
          <div>
            <span className="text-md font-thin text-gray-500 dark:text-gray-400">
              {t("managePrompts.systemPrompt")}
            </span>
            <textarea
              className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 dark:bg-[#171717] dark:text-white dark:placeholder-gray-400"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <div className="flex justify-end">
              <SaveButton
                onClick={() => {
                  setSystemPromptForNonRag(systemPrompt)
                }}
              />
            </div>
          </div>
        )}

        {selectedValue === "rag" && (
          <div>
            <div className="mb-3">
              <span className="text-md font-thin text-gray-500 dark:text-gray-400">
                {t("managePrompts.systemPrompt")}
              </span>
              <textarea
                className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 dark:bg-[#171717] dark:text-white dark:placeholder-gray-400"
                value={ragPrompt}
                onChange={(e) => setRagPrompt(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <span className="text-md  font-thin text-gray-500 dark:text-gray-400">
                {t("managePrompts.questionPrompt")}
              </span>
              <textarea
                className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 dark:bg-[#171717] dark:text-white dark:placeholder-gray-400"
                value={ragQuestionPrompt}
                onChange={(e) => setRagQuestionPrompt(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <SaveButton
                onClick={() => {
                  setPromptForRag(ragPrompt, ragQuestionPrompt)
                }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-[#171717]">
        <SidepanelRag hideBorder />
      </div>
      <div className="border flex flex-col gap-4 border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-[#171717]">
        <h2 className="text-md font-semibold dark:text-white">
          {t("ollamaSettings.heading")}
        </h2>
        <input
          className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 dark:bg-[#171717] dark:text-white dark:placeholder-gray-400"
          value={ollamaURL}
          type="url"
          onChange={(e) => setOllamaURL(e.target.value)}
          placeholder={t("ollamaSettings.settings.ollamaUrl.placeholder")}
        />

        <Collapse
          size="small"
          items={[
            {
              key: "1",
              label: (
                <div>
                  <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                    {t("ollamaSettings.settings.advanced.label")}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <Trans
                      i18nKey="settings:ollamaSettings.settings.advanced.help"
                      components={{
                        anchor: (
                          <a
                            href="https://github.com/n4ze3m/page-assist/blob/main/docs/connection-issue.md#solutions"
                            target="__blank"
                            className="text-blue-600 dark:text-blue-400"></a>
                        )
                      }}
                    />
                  </p>
                </div>
              ),
              children: <AdvanceOllamaSettings />
            }
          ]}
        />

        <div className="flex justify-end">
          <SaveButton
            onClick={() => {
              saveOllamaURL(ollamaURL)
            }}
          />
        </div>
      </div>
      <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-[#171717]">
        <h2 className="text-md mb-4 font-semibold dark:text-white">
          {t("rag.ragSettings.label")}
        </h2>
        <Form
          onFinish={(data) => {
            saveRAG({
              model: data.defaultEM,
              chunkSize: data.chunkSize,
              overlap: data.chunkOverlap
            })
          }}
          initialValues={{
            chunkSize: data.chunkSize,
            chunkOverlap: data.chunkOverlap,
            defaultEM: data.defaultEM
          }}>
          <Form.Item
            name="defaultEM"
            label={t("rag.ragSettings.model.label")}
            help={t("rag.ragSettings.model.help")}
            rules={[
              {
                required: true,
                message: t("rag.ragSettings.model.required")
              }
            ]}>
            <Select
              size="large"
              filterOption={(input, option) =>
                option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0 ||
                option.value.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
              showSearch
              placeholder="Select a model"
              style={{ width: "100%" }}
              className="mt-4"
              options={data.models?.map((model) => ({
                label: model.name,
                value: model.model
              }))}
            />
          </Form.Item>

          <Form.Item
            name="chunkSize"
            label={t("rag.ragSettings.chunkSize.label")}
            rules={[
              {
                required: true,
                message: t("rag.ragSettings.chunkSize.required")
              }
            ]}>
            <InputNumber
              style={{ width: "100%" }}
              placeholder={t("rag.ragSettings.chunkSize.placeholder")}
            />
          </Form.Item>
          <Form.Item
            name="chunkOverlap"
            label={t("rag.ragSettings.chunkOverlap.label")}
            rules={[
              {
                required: true,
                message: t("rag.ragSettings.chunkOverlap.required")
              }
            ]}>
            <InputNumber
              style={{ width: "100%" }}
              placeholder={t("rag.ragSettings.chunkOverlap.placeholder")}
            />
          </Form.Item>

          <div className="flex justify-end">
            <SaveButton disabled={isSaveRAGPending} btnType="submit" />
          </div>
        </Form>
      </div>

      <div className="border space-y-3 w-full border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-[#171717]">
        <h2 className="text-base mb-4 font-semibold leading-7 text-gray-900 dark:text-white">
          {t("generalSettings.title")}
        </h2>
        <div className="flex flex-col  space-y-4">
          <span className="text-gray-500   dark:text-neutral-50">
            {t("generalSettings.settings.copilotResumeLastChat.label")}
          </span>

          <div>
            <Switch
              checked={copilotResumeLastChat}
              onChange={(checked) => setCopilotResumeLastChat(checked)}
            />
          </div>
        </div>
        <div className="flex flex-col space-y-4">
          <div className="inline-flex items-center gap-2">
            <span className="text-gray-500   dark:text-neutral-50">
              {t("generalSettings.settings.hideCurrentChatModelSettings.label")}
            </span>
          </div>
          <div>
            <Switch
              checked={hideCurrentChatModelSettings}
              onChange={(checked) => setHideCurrentChatModelSettings(checked)}
            />
          </div>
        </div>
        <div>
          <div className="text-xs mb-2  dark:text-white">
            {t("generalSettings.settings.speechRecognitionLang.label")}{" "}
          </div>
          <Select
            placeholder={t(
              "generalSettings.settings.speechRecognitionLang.placeholder"
            )}
            allowClear
            showSearch
            options={SUPPORTED_LANGUAGES}
            value={speechToTextLanguage}
            filterOption={(input, option) =>
              option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0 ||
              option.value.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
            onChange={(value) => {
              setSpeechToTextLanguage(value)
            }}
            style={{
              width: "100%"
            }}
          />
        </div>
        <div>
          <div className="text-xs mb-2  dark:text-white">
            {t("generalSettings.settings.language.label")}{" "}
          </div>

          <Select
            placeholder={t("generalSettings.settings.language.placeholder")}
            showSearch
            options={supportLanguage}
            value={locale}
            filterOption={(input, option) =>
              option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0 ||
              option.value.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
            onChange={(value) => {
              changeLocale(value)
            }}
            style={{
              width: "100%"
            }}
          />
        </div>
      </div>

      <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-[#171717]">
        <TTSModeSettings hideBorder />
      </div>
      <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-[#171717]">
        <h2 className="text-md mb-4 font-semibold dark:text-white">
          {t("generalSettings.settings.darkMode.label")}{" "}
        </h2>
        {mode === "dark" ? (
          <button
            onClick={toggleDarkMode}
            className="select-none inline-flex text-center w-full rounded-lg border border-gray-900 py-3 px-6 justify-center font-sans text-xs font-bold uppercase text-gray-900 transition-all hover:opacity-75 focus:ring focus:ring-gray-300 active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none dark:border-gray-100 dark:text-white dark:hover:opacity-75 dark:focus:ring-dark dark:active:opacity-75 dark:disabled:pointer-events-none dark:disabled:opacity-50 dark:disabled:shadow-none">
            <SunIcon className="h-4 w-4 mr-2" />
            {t("generalSettings.settings.darkMode.options.light")}
          </button>
        ) : (
          <button
            onClick={toggleDarkMode}
            className="select-none inline-flex text-center w-full rounded-lg border border-gray-900 py-3 px-6 justify-center font-sans text-xs font-bold uppercase text-gray-900 transition-all hover:opacity-75 focus:ring focus:ring-gray-300 active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none dark:border-gray-100 dark:text-white dark:hover:opacity-75 dark:focus:ring-dark dark:active:opacity-75 dark:disabled:pointer-events-none dark:disabled:opacity-50 dark:disabled:shadow-none">
            <MoonIcon className="h-4 w-4 mr-2" />
            {t("generalSettings.settings.darkMode.options.dark")}
          </button>
        )}
      </div>
    </div>
  )
}
