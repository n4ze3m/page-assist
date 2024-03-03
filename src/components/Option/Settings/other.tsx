import { useQueryClient } from "@tanstack/react-query"
import { useDarkMode } from "~hooks/useDarkmode"
import { useMessageOption } from "~hooks/useMessageOption"
import { PageAssitDatabase } from "~libs/db"
import { Select } from "antd"
import { SUPPORTED_LANGUAGES } from "~utils/supporetd-languages"
import { MoonIcon, SunIcon } from "lucide-react"

export const SettingOther = () => {
  const { clearChat, speechToTextLanguage, setSpeechToTextLanguage } =
    useMessageOption()

  const queryClient = useQueryClient()

  const { mode, toggleDarkMode } = useDarkMode()

  return (
    <dl className="flex flex-col space-y-6">
      <div>
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          Web UI Settings
        </h2>
        <div className="border border-b border-gray-200 dark:border-gray-600 mt-3"></div>
      </div>
      <div className="flex flex-row justify-between">
        <span className="text-gray-500 dark:text-gray-400 text-lg">
          Speech Recognition Language
        </span>

        <Select
          placeholder="Select Language"
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
        />
      </div>
      <div className="flex flex-row justify-between">
        <span className="text-gray-500 dark:text-gray-400 text-lg">
          Change Theme
        </span>

        <button
          onClick={toggleDarkMode}
          className={`inline-flex mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm  dark:bg-white dark:text-gray-800 disabled:opacity-50 `}>
          {mode === "dark" ? (
            <SunIcon className="w-4 h-4 mr-2" />
          ) : (
            <MoonIcon className="w-4 h-4 mr-2" />
          )}
          {mode === "dark" ? "Light" : "Dark"}
        </button>
      </div>
      <div className="flex flex-row justify-between">
        <span className="text-gray-500 dark:text-gray-400 text-lg">
          Delete Chat History
        </span>

        <button
          onClick={async () => {
            const confirm = window.confirm(
              "Are you sure you want to delete your chat history? This action cannot be undone."
            )

            if (confirm) {
              const db = new PageAssitDatabase()
              await db.deleteChatHistory()
              queryClient.invalidateQueries({
                queryKey: ["fetchChatHistory"]
              })
              clearChat()
            }
          }}
          className="bg-red-500 dark:bg-red-600 text-white dark:text-gray-200 px-4 py-2 rounded-md">
          Delete
        </button>
      </div>
    </dl>
  )
}
