import { Select, Switch } from "antd"
import { useTranslation } from "react-i18next"
import { useStorage } from "@plasmohq/storage/hook"

export const ChatSettings = () => {
  const { t } = useTranslation("settings")

  const [webUIResumeLastChat, setWebUIResumeLastChat] = useStorage(
    "webUIResumeLastChat",
    false
  )

  const [restoreLastChatModel, setRestoreLastChatModel] = useStorage(
    "restoreLastChatModel",
    false
  )

  const [hideCurrentChatModelSettings, setHideCurrentChatModelSettings] =
    useStorage("hideCurrentChatModelSettings", false)

  const [checkWideMode, setCheckWideMode] = useStorage("checkWideMode", false)

  const [openReasoning, setOpenReasoning] = useStorage("openReasoning", false)

  const [userChatBubble, setUserChatBubble] = useStorage(
    "userChatBubble",
    true
  )

  const [autoCopyResponseToClipboard, setAutoCopyResponseToClipboard] =
    useStorage("autoCopyResponseToClipboard", false)

  const [useMarkdownForUserMessage, setUseMarkdownForUserMessage] = useStorage(
    "useMarkdownForUserMessage",
    false
  )

  const [copyAsFormattedText, setCopyAsFormattedText] = useStorage(
    "copyAsFormattedText",
    false
  )

  const [menuDensity, setMenuDensity] = useStorage(
    "menuDensity",
    "comfortable"
  )

  const [userTextColor, setUserTextColor] = useStorage(
    "chatUserTextColor",
    "default"
  )
  const [assistantTextColor, setAssistantTextColor] = useStorage(
    "chatAssistantTextColor",
    "default"
  )
  const [userTextFont, setUserTextFont] = useStorage(
    "chatUserTextFont",
    "default"
  )
  const [assistantTextFont, setAssistantTextFont] = useStorage(
    "chatAssistantTextFont",
    "default"
  )
  const [userTextSize, setUserTextSize] = useStorage(
    "chatUserTextSize",
    "md"
  )
  const [assistantTextSize, setAssistantTextSize] = useStorage(
    "chatAssistantTextSize",
    "md"
  )

  const colorOptions = [
    {
      value: "default",
      label: t("chatSettings.color.default", "Default")
    },
    { value: "blue", label: t("chatSettings.color.blue", "Blue") },
    { value: "green", label: t("chatSettings.color.green", "Green") },
    { value: "purple", label: t("chatSettings.color.purple", "Purple") },
    { value: "orange", label: t("chatSettings.color.orange", "Orange") },
    { value: "red", label: t("chatSettings.color.red", "Red") }
  ]

  const fontOptions = [
    {
      value: "default",
      label: t("chatSettings.font.default", "Default")
    },
    { value: "sans", label: t("chatSettings.font.sans", "Sans serif") },
    { value: "serif", label: t("chatSettings.font.serif", "Serif") },
    { value: "mono", label: t("chatSettings.font.mono", "Monospace") }
  ]

  const sizeOptions = [
    { value: "sm", label: t("chatSettings.size.sm", "Small") },
    { value: "md", label: t("chatSettings.size.md", "Medium") },
    { value: "lg", label: t("chatSettings.size.lg", "Large") }
  ]

  return (
    <dl className="flex flex-col space-y-6 text-sm">
      <div>
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          {t("chatSettings.title", "Chat settings")}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          {t(
            "chatSettings.description",
            "Control default behavior for the chat playground and composer."
          )}
        </p>
        <div className="border border-b border-gray-200 dark:border-gray-600 mt-3" />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t(
              "generalSettings.settings.webUIResumeLastChat.label",
              "Resume the last chat when opening the Web UI"
            )}
          </span>
        </div>
        <Switch
          checked={webUIResumeLastChat}
          onChange={(checked) => setWebUIResumeLastChat(checked)}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t(
              "generalSettings.settings.restoreLastChatModel.label",
              "Restore last used model for previous chats"
            )}
          </span>
        </div>

        <Switch
          checked={restoreLastChatModel}
          onChange={(checked) => setRestoreLastChatModel(checked)}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t(
              "generalSettings.settings.hideCurrentChatModelSettings.label",
              "Hide the current Chat Model Settings"
            )}
          </span>
        </div>

        <Switch
          checked={hideCurrentChatModelSettings}
          onChange={(checked) => setHideCurrentChatModelSettings(checked)}
        />
      </div>

      <div className="pt-4">
        <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
          {t("chatSettings.userHeading", "User messages")}
        </h3>
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("chatSettings.userColor", "User text color")}
          </span>
        </div>
        <Select
          style={{ width: 200 }}
          value={userTextColor}
          onChange={(value) => setUserTextColor(value)}
          options={colorOptions}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("chatSettings.userFont", "User font")}
          </span>
        </div>
        <Select
          style={{ width: 200 }}
          value={userTextFont}
          onChange={(value) => setUserTextFont(value)}
          options={fontOptions}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("chatSettings.userSize", "User text size")}
          </span>
        </div>
        <Select
          style={{ width: 200 }}
          value={userTextSize}
          onChange={(value) => setUserTextSize(value)}
          options={sizeOptions}
        />
      </div>

      <div className="pt-4">
        <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
          {t("chatSettings.assistantHeading", "Assistant messages")}
        </h3>
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("chatSettings.assistantColor", "Assistant text color")}
          </span>
        </div>
        <Select
          style={{ width: 200 }}
          value={assistantTextColor}
          onChange={(value) => setAssistantTextColor(value)}
          options={colorOptions}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("chatSettings.assistantFont", "Assistant font")}
          </span>
        </div>
        <Select
          style={{ width: 200 }}
          value={assistantTextFont}
          onChange={(value) => setAssistantTextFont(value)}
          options={fontOptions}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t("chatSettings.assistantSize", "Assistant text size")}
          </span>
        </div>
        <Select
          style={{ width: 200 }}
          value={assistantTextSize}
          onChange={(value) => setAssistantTextSize(value)}
          options={sizeOptions}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t(
              "generalSettings.settings.wideMode.label",
              "Enable wide screen mode"
            )}
          </span>
        </div>

        <Switch
          checked={checkWideMode}
          onChange={(checked) => setCheckWideMode(checked)}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t(
              "generalSettings.settings.menuDensity.label",
              "Menu density"
            )}
          </span>
        </div>
        <Select
          style={{ width: 200 }}
          value={menuDensity}
          onChange={(v) => setMenuDensity(v)}
          options={[
            {
              value: "comfortable",
              label: t(
                "generalSettings.settings.menuDensity.comfortable",
                "Comfortable"
              )
            },
            {
              value: "compact",
              label: t(
                "generalSettings.settings.menuDensity.compact",
                "Compact"
              )
            }
          ]}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t(
              "generalSettings.settings.openReasoning.label",
              "Open Reasoning Collapse by default"
            )}
          </span>
        </div>

        <Switch
          checked={openReasoning}
          onChange={(checked) => setOpenReasoning(checked)}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t(
              "generalSettings.settings.userChatBubble.label",
              "Use Chat Bubble for User Messages"
            )}
          </span>
        </div>

        <Switch
          checked={userChatBubble}
          onChange={(checked) => setUserChatBubble(checked)}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t(
              "generalSettings.settings.autoCopyResponseToClipboard.label",
              "Automatically Copy Response to Clipboard"
            )}
          </span>
        </div>

        <Switch
          checked={autoCopyResponseToClipboard}
          onChange={(checked) => setAutoCopyResponseToClipboard(checked)}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t(
              "generalSettings.settings.useMarkdownForUserMessage.label",
              "Enable Markdown formatting for User messages"
            )}
          </span>
        </div>

        <Switch
          checked={useMarkdownForUserMessage}
          onChange={(checked) => setUseMarkdownForUserMessage(checked)}
        />
      </div>

      <div className="flex flex-row justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-gray-700 dark:text-neutral-50">
            {t(
              "generalSettings.settings.copyAsFormattedText.label",
              "Copy as Formatted Text"
            )}
          </span>
        </div>

        <Switch
          checked={copyAsFormattedText}
          onChange={(checked) => setCopyAsFormattedText(checked)}
        />
      </div>
    </dl>
  )
}
