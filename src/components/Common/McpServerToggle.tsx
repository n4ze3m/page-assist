import { Popover, Switch, Tooltip } from "antd"
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { KeyRound, Plus } from "lucide-react"
import { MCPIcon } from "@/components/Icons/MCPIcon"
import { getAllMcpServers, updateMcpServer } from "@/db/dexie/mcp"
import type { McpServer } from "@/libs/mcp/types"
import { hasValidOAuthTokens } from "@/libs/mcp/oauth"

const getRootDomain = (hostname: string) => {
  const parts = hostname.split(".")
  if (parts.length <= 2) return hostname
  return parts.slice(-2).join(".")
}

const isPrivateHost = (hostname: string) => {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") return true
  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return true
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true
  if (!hostname.includes(".")) return true
  return false
}

const getServerFaviconUrl = (serverUrl: string) => {
  try {
    const { hostname } = new URL(serverUrl)
    if (isPrivateHost(hostname)) return null
    const domain = getRootDomain(hostname)
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return null
  }
}

export { getServerFaviconUrl }

const ServerFavicon = ({ url }: { url: string }) => {
  const faviconUrl = getServerFaviconUrl(url)

  if (!faviconUrl) {
    return <MCPIcon className="h-4 w-4 shrink-0 text-gray-400" />
  }

  return (
    <img
      src={faviconUrl}
      alt=""
      className="h-4 w-4 shrink-0 rounded-sm"
      onError={(e) => {
        e.currentTarget.style.display = "none"
      }}
    />
  )
}

const EmptyState = ({
  t,
  onNavigate
}: {
  t: (key: string) => string
  onNavigate: () => void
}) => (
  <div className="flex w-56 flex-col items-center py-4 text-center">
    <MCPIcon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
    <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-200">
      {t("tooltip.mcpEmpty")}
    </p>
    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
      {t("tooltip.mcpEmptyDesc")}
    </p>
    <button
      type="button"
      onClick={onNavigate}
      className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
      <Plus className="h-3 w-3" />
      {t("tooltip.mcpAddServer")}
    </button>
  </div>
)

export const McpServerToggle = () => {
  const { t } = useTranslation("playground")
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const { data: servers } = useQuery({
    queryKey: ["mcpServers"],
    queryFn: getAllMcpServers
  })

  const hasServers = servers && servers.length > 0
  const enabledCount = hasServers
    ? servers.filter((s) => s.enabled).length
    : 0

  const handleToggle = async (server: McpServer, checked: boolean) => {
    await updateMcpServer({ id: server.id, enabled: checked })
    queryClient.invalidateQueries({ queryKey: ["mcpServers"] })
  }

  const content = hasServers ? (
    <div className="w-56">
      <div className="space-y-1">
        {servers.map((server) => (
          <div
            key={server.id}
            className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-[#353535]">
            <div className="flex items-center gap-2 min-w-0 mr-3">
              <ServerFavicon url={server.url} />
              <span
                className="truncate text-sm text-gray-700 dark:text-gray-200"
                title={server.name}>
                {server.name}
              </span>
              {server.authType === "oauth" && (
                <Tooltip
                  title={
                    hasValidOAuthTokens(server.oauthTokens)
                      ? "OAuth connected"
                      : "OAuth not connected"
                  }>
                  <KeyRound
                    className={`h-3 w-3 shrink-0 ${
                      hasValidOAuthTokens(server.oauthTokens)
                        ? "text-green-500"
                        : "text-orange-400"
                    }`}
                  />
                </Tooltip>
              )}
            </div>
            <Switch
              size="small"
              checked={server.enabled}
              onChange={(checked) => handleToggle(server, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  ) : (
    <EmptyState
      t={t}
      onNavigate={() => {
        setOpen(false)
        navigate("/settings/mcp")
      }}
    />
  )

  return (
    <Popover
      content={content}
      title={hasServers ? t("tooltip.mcpServers") : undefined}
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
