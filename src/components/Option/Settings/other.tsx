import { useQueryClient } from "@tanstack/react-query"
import { useDarkMode } from "~hooks/useDarkmode"
import { useMessageOption } from "~hooks/useMessageOption"
import { PageAssitDatabase } from "~libs/db"

export const SettingOther = () => {
  const { clearChat } = useMessageOption()

  const queryClient = useQueryClient()

  const { mode, toggleDarkMode } = useDarkMode()

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-row justify-between">
        <span className="text-gray-500 dark:text-gray-400 text-lg">
          Change Theme
        </span>

        <button
          onClick={toggleDarkMode}
          className="bg-blue-500 dark:bg-blue-600 text-white dark:text-gray-200 px-4 py-2 rounded-md">
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
    </div>
  )
}
