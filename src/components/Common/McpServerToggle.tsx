import { Popover, Switch } from "antd"
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { MCPIcon } from "@/components/Icons/MCPIcon"
import { getAllMcpServers, updateMcpServer } from "@/db/dexie/mcp"
import type { McpServer } from "@/libs/mcp/types"

export const McpServerToggle = () => {
  const { t } = useTranslation("playground")
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: servers } = useQuery({
    queryKey: ["mcpServers"],
    queryFn: getAllMcpServers
  })

  if (!servers || servers.length === 0) {
    return null
  }

  const enabledCount = servers.filter((s) => s.enabled).length

  const handleToggle = async (server: McpServer, checked: boolean) => {
    await updateMcpServer({ id: server.id, enabled: checked })
    queryClient.invalidateQueries({ queryKey: ["mcpServers"] })
  }

  const content = (
    <div className="w-56">
      <div className="space-y-1">
        {servers.map((server) => (
          <div
            key={server.id}
            className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-[#353535]">
            <span
              className="truncate text-sm text-gray-700 dark:text-gray-200 mr-3"
              title={server.name}>
              {server.name}
            </span>
            <Switch
              size="small"
              checked={server.enabled}
              onChange={(checked) => handleToggle(server, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <Popover
      content={content}
      title={t("tooltip.mcpServers")}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="topRight">
      <button
        type="button"
        className="relative inline-flex items-center justify-center dark:text-gray-300">
        <MCPIcon className="h-5 w-5" />
        {enabledCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[9px] font-medium text-white">
            {enabledCount}
          </span>
        )}
      </button>
    </Popover>
  )
}
