import { useStorage } from "@plasmohq/storage/hook"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Alert, Button, Empty, Input, Skeleton, Switch, message } from "antd"
import { RotateCcw } from "lucide-react"
import { useEffect, useState } from "react"
import { updateMcpServer } from "@/db/dexie/mcp"
import {
  cachePageActionTools,
  DEFAULT_PAGE_ACTION_SYSTEM_PROMPT,
  getPageActionServer,
  getPageActionSystemPrompt,
  isPageActionInstalled,
  PAGE_ACTION_EXTENSION_ID,
  setPageActionSystemPrompt
} from "@/services/page-action"

export const PageActionSettings = () => {
  const [enabled, setEnabled] = useStorage("pageActionEnabled", true)
  const [requireApproval, setRequireApproval] = useStorage(
    "pageActionRequireApproval",
    true
  )
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [promptValue, setPromptValue] = useState("")
  const [promptSaving, setPromptSaving] = useState(false)

  useEffect(() => {
    getPageActionSystemPrompt().then(setPromptValue)
  }, [])

  const savePrompt = async () => {
    setPromptSaving(true)
    try {
      await setPageActionSystemPrompt(promptValue)
      message.success("Page Action system prompt saved.")
    } finally {
      setPromptSaving(false)
    }
  }

  const { data, status } = useQuery({
    queryKey: ["pageActionSettings"],
    queryFn: async () => {
      const installed = await isPageActionInstalled()
      const server = await getPageActionServer()
      return { installed, server }
    }
  })

  const tools = data?.server?.cachedTools ?? []

  const toggleTool = async (name: string, checked: boolean) => {
    const server = data?.server
    if (!server) return
    const updated = (server.cachedTools ?? []).map((tool) =>
      tool.name === name
        ? {
            ...tool,
            executionMode: checked ? "human_in_loop" : "disabled",
            enabled: checked
          }
        : tool
    )
    await updateMcpServer({ id: server.id, cachedTools: updated as any })
    queryClient.invalidateQueries({ queryKey: ["pageActionSettings"] })
  }

  const refreshTools = async () => {
    setRefreshing(true)
    try {
      await cachePageActionTools(true)
      message.success("Page Action tools refreshed.")
      queryClient.invalidateQueries({ queryKey: ["pageActionSettings"] })
    } catch (error) {
      message.error(
        "Could not load tools. Make sure the Page Action extension is installed."
      )
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          Page Action
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Let Page Assist act on the current tab (click, type, scroll, navigate,
          and more) using the Page Action companion extension.
        </p>
        <div className="border border-b border-gray-200 dark:border-gray-600 mt-3 mb-6"></div>
      </div>

      <div className="flex flex-row justify-between items-center">
        <span className="text-gray-700 text-sm dark:text-neutral-50">
          Enable Page Action (show in the chat sidebar)
        </span>
        <Switch checked={enabled} onChange={(value) => setEnabled(value)} />
      </div>


      <div className="flex flex-row justify-between items-start gap-4">
        <div className="flex flex-col">
          <span className="text-gray-700 text-sm dark:text-neutral-50">
            Require approval before each action
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Ask for confirmation before Page Action clicks, types, or navigates
            on your behalf.
          </span>
        </div>
        <Switch
          checked={requireApproval}
          onChange={(value) => setRequireApproval(value)}
        />
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700"></div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-row justify-between items-center">
          <span className="text-gray-700 text-sm dark:text-neutral-50">
            System prompt
          </span>
          <button
            type="button"
            onClick={() => setPromptValue(DEFAULT_PAGE_ACTION_SYSTEM_PROMPT)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:underline">
            Reset to default
          </button>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Instructions sent to the model in Page Action mode. Edit to change how
          it reads and acts on your pages.
        </span>
        <Input.TextArea
          value={promptValue}
          onChange={(e) => setPromptValue(e.target.value)}
          autoSize={{ minRows: 6, maxRows: 16 }}
        />
        <div className="flex flex-row justify-end">
          <button
            type="button"
            onClick={savePrompt}
            disabled={promptSaving}
            className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50">
            {promptSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700"></div>

      {status === "pending" && <Skeleton paragraph={{ rows: 4 }} active />}

      {status === "success" && (
        <>
          {!data?.installed && (
            <Alert
              type="warning"
              showIcon
              message="Page Action extension is not installed."
              description={
                <a
                  href={`https://chromewebstore.google.com/detail/${PAGE_ACTION_EXTENSION_ID}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center mt-2 rounded-md px-3 py-1.5 text-sm font-medium bg-black text-white dark:bg-white dark:text-black hover:opacity-90">
                  Install from the Chrome Web Store
                </a>
              }
            />
          )}

          <div className="flex flex-row justify-between items-center">
            <span className="text-gray-700 text-sm dark:text-neutral-50">
              Tools
            </span>
            <Button
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              loading={refreshing}
              onClick={refreshTools}>
              Refresh tools
            </Button>
          </div>

          {tools.length === 0 ? (
            <Empty description="No tools cached yet. Click Refresh tools." />
          ) : (
            <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-700 rounded-md border border-gray-200 dark:border-gray-700">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className="flex flex-row justify-between items-start gap-4 p-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {tool.name}
                    </span>
                    {tool.description && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {tool.description}
                      </span>
                    )}
                  </div>
                  <Switch
                    size="small"
                    checked={tool.executionMode !== "disabled"}
                    onChange={(checked) => toggleTool(tool.name, checked)}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
