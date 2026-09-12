import { useStorage } from "@plasmohq/storage/hook"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button, Empty, Input, Skeleton, Switch, Tooltip, message } from "antd"
import { Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { ToolExecutionModeControl } from "@/components/MCP/ToolExecutionModeControl"
import { McpToolExecutionMode } from "@/libs/mcp/types"
import {
  clearWebMcpToolModes,
  DEFAULT_WEBMCP_SYSTEM_PROMPT,
  getAllWebMcpToolModes,
  getWebMcpSystemPrompt,
  setWebMcpSystemPrompt,
  setWebMcpToolMode
} from "@/services/webmcp"

const QUERY_KEY = ["webMcpToolPermissions"]

export const WebMcpSettings = () => {
  const { t } = useTranslation(["settings", "common"])
  const [enabled, setEnabled] = useStorage("webMcpEnabled", true)
  const [requireApproval, setRequireApproval] = useStorage(
    "webMcpRequireApproval",
    true
  )
  const queryClient = useQueryClient()
  const [promptValue, setPromptValue] = useState("")
  const [promptSaving, setPromptSaving] = useState(false)

  useEffect(() => {
    getWebMcpSystemPrompt().then(setPromptValue)
  }, [])

  const savePrompt = async () => {
    setPromptSaving(true)
    try {
      await setWebMcpSystemPrompt(promptValue)
      message.success("WebMCP system prompt saved.")
    } finally {
      setPromptSaving(false)
    }
  }

  const { data, status } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getAllWebMcpToolModes,
    refetchOnWindowFocus: false
  })

  const sites = Object.entries(data ?? {})
    .map(([origin, tools]) => ({ origin, tools: Object.entries(tools) }))
    .filter((site) => site.tools.length > 0)
    .sort((left, right) => left.origin.localeCompare(right.origin))

  const updateToolMode = async (
    origin: string,
    toolName: string,
    mode: McpToolExecutionMode
  ) => {
    await setWebMcpToolMode(origin, toolName, mode)
    queryClient.invalidateQueries({ queryKey: QUERY_KEY })
  }

  const forgetSite = async (origin: string) => {
    await clearWebMcpToolModes(origin)
    message.success(`Tool permissions for ${origin} were removed.`)
    queryClient.invalidateQueries({ queryKey: QUERY_KEY })
  }

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          WebMCP
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Some websites publish their own tools to AI agents through the WebMCP
          browser API. When a page does, Page Assist can call those tools
          directly instead of reading and clicking through the interface. Turn
          it on for a page with the plug button in the chat sidebar.
        </p>
        <div className="border border-b border-gray-200 dark:border-gray-600 mt-3 mb-6"></div>
      </div>

      <div className="flex flex-row justify-between items-center">
        <span className="text-gray-700 text-sm dark:text-neutral-50">
          Enable WebMCP (show in the chat sidebar)
        </span>
        <Switch checked={enabled} onChange={(value) => setEnabled(value)} />
      </div>

      <div className="flex flex-row justify-between items-start gap-4">
        <div className="flex flex-col">
          <span className="text-gray-700 text-sm dark:text-neutral-50">
            Human-in-the-loop
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {requireApproval
              ? "Page tools ask for approval before they run. Choose Always allow on a prompt to stop being asked for that tool."
              : "Page tools run without approval. Page tools are written by the website, so leave this on unless you trust the sites you use them on."}
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
            onClick={() => setPromptValue(DEFAULT_WEBMCP_SYSTEM_PROMPT)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:underline">
            Reset to default
          </button>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Instructions sent to the model when WebMCP tools are in play.
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

      <div className="flex flex-col gap-1">
        <span className="text-gray-700 text-sm dark:text-neutral-50">
          Saved tool permissions
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Decisions you made on an approval prompt, kept per site. Page tools
          you have not answered for yet always ask first.
        </span>
      </div>

      {status === "pending" && <Skeleton paragraph={{ rows: 3 }} active />}

      {status === "success" &&
        (sites.length === 0 ? (
          <Empty description="No tool permissions saved yet." />
        ) : (
          <div className="flex flex-col gap-4">
            {sites.map((site) => (
              <div
                key={site.origin}
                className="rounded-md border border-gray-200 dark:border-gray-700">
                <div className="flex flex-row items-center justify-between gap-4 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {site.origin}
                  </span>
                  <Tooltip title="Forget this site">
                    <Button
                      size="small"
                      type="text"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => forgetSite(site.origin)}
                    />
                  </Tooltip>
                </div>
                <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-700">
                  {site.tools.map(([toolName, mode]) => (
                    <div
                      key={toolName}
                      className="flex flex-row items-center justify-between gap-4 p-3">
                      <span className="text-sm text-gray-700 dark:text-neutral-50 break-all">
                        {toolName}
                      </span>
                      <div className="shrink-0">
                        {requireApproval ? (
                          <ToolExecutionModeControl
                            value={mode}
                            humanInLoopEnabled={requireApproval}
                            onChange={(next) =>
                              updateToolMode(site.origin, toolName, next)
                            }
                          />
                        ) : (
                          <Tooltip
                            title={
                              mode !== "disabled"
                                ? t("mcpSettings.actions.disable", "Disable")
                                : t("mcpSettings.actions.enable", "Enable")
                            }>
                            <Switch
                              size="small"
                              checked={mode !== "disabled"}
                              onChange={(checked) =>
                                updateToolMode(
                                  site.origin,
                                  toolName,
                                  checked ? "human_in_loop" : "disabled"
                                )
                              }
                            />
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  )
}
