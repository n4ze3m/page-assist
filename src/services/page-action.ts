import { Storage } from "@plasmohq/storage"
import { McpServer } from "@/libs/mcp/types"
import {
  addMcpServer,
  getAllMcpServers,
  updateMcpServer
} from "@/db/dexie/mcp"
import { inspectMcpServerTools } from "@/libs/mcp/remote-tools"

export const PAGE_ACTION_EXTENSION_ID = "ahpkcbabjpffhikhipbphbkfnhncbndf"
export const PAGE_ACTION_SERVER_NAME = "Page Action"

const storage = new Storage()
const ENABLED_KEY = "pageActionEnabled"
const APPROVAL_KEY = "pageActionRequireApproval"
const SYSTEM_PROMPT_KEY = "pageActionSystemPrompt"

export const DEFAULT_PAGE_ACTION_SYSTEM_PROMPT = `You are Page Assist, an AI assistant that can act on the user's web browser to complete tasks on their behalf. You work through the Page Action tools, which let you read and control the user's currently active browser tab.

The current date and time is {current_date_time}.

You are an agent. Keep working until the user's request is fully resolved before ending your turn. Only stop when the task is done, or when you need information that only the user can provide.

# How to work
- Start by calling get_page_state to see the current page: its URL, title, and the numbered list of interactive elements.
- Act on elements by their index from get_page_state (click, input_text, select_dropdown_option). The pointer tools (click with x/y, drag, draw_path) use viewport coordinates.
- After any action that loads or changes the page (navigate, a click that follows a link, open_tab), call wait_for_load, then call get_page_state again before acting, because the indexes change.
- Take one action at a time and check the result. Do not assume an action worked; verify with get_page_state or extract_content.
- Use extract_content to read the page text. Use capture_screenshot only when you have vision support and need to see the page visually.
- For navigation use navigate or open_tab. Manage tabs with list_tabs, switch_tab, and close_tab.

# Guidelines
- Be careful with actions that submit forms, send messages, make purchases, or delete data. Confirm intent with the user before anything irreversible, unless they clearly asked for it.
- If a tool fails or an element is missing, call get_page_state again and adjust instead of repeating the same call.
- Never make up page content. Only state what you actually read from the page.
- Reply in the same language as the user.
- Keep the user informed with short, clear updates on what you did and what you found.`

export const isPageActionSupported = () =>
  import.meta.env.BROWSER !== "firefox"

export const isPageActionEnabled = async (): Promise<boolean> => {
  const value = await storage.get<boolean>(ENABLED_KEY)
  return value !== false
}

export const setPageActionEnabled = async (enabled: boolean): Promise<void> => {
  await storage.set(ENABLED_KEY, enabled)
}

export const isPageActionApprovalRequired = async (): Promise<boolean> => {
  const value = await storage.get<boolean>(APPROVAL_KEY)
  return value !== false
}

export const setPageActionApprovalRequired = async (
  value: boolean
): Promise<void> => {
  await storage.set(APPROVAL_KEY, value)
}

export const getPageActionSystemPrompt = async (): Promise<string> => {
  const value = await storage.get<string>(SYSTEM_PROMPT_KEY)
  return value && value.trim().length > 0
    ? value
    : DEFAULT_PAGE_ACTION_SYSTEM_PROMPT
}

export const setPageActionSystemPrompt = async (
  value: string
): Promise<void> => {
  await storage.set(SYSTEM_PROMPT_KEY, value)
}

export const getPageActionServer = async (): Promise<McpServer | undefined> => {
  const servers = await getAllMcpServers()
  return servers.find(
    (server) =>
      server.transport === "extension" &&
      server.url === PAGE_ACTION_EXTENSION_ID
  )
}

export const ensurePageActionServer = async (): Promise<McpServer> => {
  const existing = await getPageActionServer()
  if (existing) return existing

  await addMcpServer({
    name: PAGE_ACTION_SERVER_NAME,
    transport: "extension",
    url: PAGE_ACTION_EXTENSION_ID,
    enabled: false,
    authType: "none"
  } as Omit<McpServer, "id" | "createdAt" | "updatedAt">)

  const created = await getPageActionServer()
  if (!created) {
    throw new Error("Failed to create the Page Action server record.")
  }
  return created
}

export const isPageActionInstalled = (): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    const runtime = (globalThis as any).chrome?.runtime
    if (!runtime?.connect) {
      resolve(false)
      return
    }

    let settled = false
    const finish = (value: boolean) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    try {
      const port = runtime.connect(PAGE_ACTION_EXTENSION_ID, { name: "ping" })
      port.onDisconnect.addListener(() => finish(!runtime.lastError))
      setTimeout(() => {
        try {
          port.disconnect()
        } catch {
          // ignore
        }
        finish(true)
      }, 400)
    } catch {
      finish(false)
    }
  })

export const cachePageActionTools = async (
  force = false
): Promise<McpServer> => {
  const server = await ensurePageActionServer()

  if (!force && server.cachedTools && server.cachedTools.length > 0) {
    return server
  }

  const validation = await inspectMcpServerTools(server)
  return await updateMcpServer({
    id: server.id,
    cachedTools: validation.cachedTools,
    toolsLastSyncedAt: validation.toolsLastSyncedAt,
    toolsSyncError: validation.toolsSyncError
  })
}
