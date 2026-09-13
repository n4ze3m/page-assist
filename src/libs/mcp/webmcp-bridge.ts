/**
 * Bridge between Page Assist and the WebMCP API that a page exposes on
 * `document.modelContext` (Chrome 150+, `navigator.modelContext` before that).
 *
 * Tools are read and executed from the extension's isolated content world, the
 * same way Chrome's own Model Context Tool Inspector does it, so no MAIN world
 * injection and no extra manifest permission is required.
 */

export type WebMcpToolAnnotations = {
  readOnlyHint?: boolean
  untrustedContentHint?: boolean
  consequentialHint?: boolean
}

export type WebMcpToolDescriptor = {
  name: string
  title?: string
  description?: string
  inputSchema?: unknown
  annotations?: WebMcpToolAnnotations
  origin?: string
  frameId: number
}

export type WebMcpPageTools = {
  supported: boolean
  tools: WebMcpToolDescriptor[]
  url?: string
  title?: string
}

type FrameToolsResult = {
  supported: boolean
  tools: Omit<WebMcpToolDescriptor, "frameId">[]
  url?: string
  title?: string
}

type FrameExecuteResult = {
  ok: boolean
  text?: string
  error?: string
  navigated?: boolean
}

export const isWebMcpSupported = () => import.meta.env.BROWSER !== "firefox"

const getActiveTab = async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  const tab = tabs?.[0]
  if (!tab?.id) {
    throw new Error("No active tab was found for WebMCP.")
  }
  return tab
}

/**
 * Runs inside the page. Must stay self-contained: it is serialized and injected,
 * so it cannot close over anything from this module.
 */
const paReadWebMcpTools = async (): Promise<FrameToolsResult> => {
  const ctx =
    (document as any).modelContext || (navigator as any).modelContext || null

  if (!ctx || typeof ctx.getTools !== "function") {
    return { supported: false, tools: [] }
  }

  const registered = await ctx.getTools()
  const tools: any[] = []

  for (let i = 0; i < registered.length; i++) {
    const tool = registered[i]
    if (!tool || !tool.name) continue
    // getTools() walks the whole frame tree, so only claim the tools that this
    // frame actually registered. Otherwise every ancestor reports them again.
    if (tool.window && tool.window !== window) continue

    let schema = tool.inputSchema
    if (typeof schema === "string") {
      try {
        schema = JSON.parse(schema)
      } catch {
        schema = undefined
      }
    }

    const annotations = tool.annotations
      ? {
          readOnlyHint: tool.annotations.readOnlyHint === true ? true : undefined,
          untrustedContentHint:
            tool.annotations.untrustedContentHint === true ? true : undefined,
          consequentialHint:
            tool.annotations.consequentialHint === true ? true : undefined
        }
      : undefined

    tools.push({
      name: String(tool.name),
      title: tool.title ? String(tool.title) : undefined,
      description: tool.description ? String(tool.description) : undefined,
      inputSchema: schema,
      annotations,
      origin: tool.origin ? String(tool.origin) : undefined
    })
  }

  return {
    supported: true,
    tools,
    url: window.location.href,
    title: document.title
  }
}

/**
 * Runs inside the page. Must stay self-contained.
 */
const paExecuteWebMcpTool = async (
  name: string,
  argsJson: string
): Promise<FrameExecuteResult> => {
  const ctx =
    (document as any).modelContext || (navigator as any).modelContext || null

  if (!ctx || typeof ctx.getTools !== "function") {
    return { ok: false, error: "This page does not expose WebMCP tools." }
  }

  const registered = await ctx.getTools()
  let tool: any = null
  for (let i = 0; i < registered.length; i++) {
    const candidate = registered[i]
    if (!candidate || candidate.name !== name) continue
    if (candidate.window && candidate.window !== window) continue
    tool = candidate
    break
  }

  if (!tool) {
    return {
      ok: false,
      error:
        'The tool "' +
        name +
        '" is no longer registered on this page. The page may have navigated or changed state.'
    }
  }

  let input: unknown = {}
  try {
    input = JSON.parse(argsJson)
  } catch {
    input = {}
  }

  let result: unknown
  try {
    result = await ctx.executeTool(tool, input)
  } catch (error: any) {
    const messageText = error?.message ? String(error.message) : String(error)
    // Older builds of the origin trial expect a JSON string instead of an object.
    if (messageText.indexOf("Failed to parse input") === 0) {
      try {
        result = await ctx.executeTool(tool, argsJson)
      } catch (retryError: any) {
        return {
          ok: false,
          error: retryError?.message
            ? String(retryError.message)
            : String(retryError)
        }
      }
    } else {
      return { ok: false, error: messageText }
    }
  }

  if (result === null || result === undefined) {
    return { ok: true, navigated: true, text: "" }
  }

  if (typeof result === "string") {
    return { ok: true, text: result }
  }

  try {
    return { ok: true, text: JSON.stringify(result) }
  } catch {
    return { ok: true, text: String(result) }
  }
}

const injectionErrorMessage = (error: unknown) => {
  const raw = error instanceof Error ? error.message : String(error)
  if (
    raw.includes("Cannot access") ||
    raw.includes("chrome://") ||
    raw.includes("extension://") ||
    raw.includes("Extension manifest must request permission")
  ) {
    return "Page Assist cannot read this page. Browser and extension pages do not allow WebMCP access."
  }
  return raw
}

/** Origin of the active tab, used to scope per-tool preferences to a site. */
export const getActiveTabOrigin = async (): Promise<string | undefined> => {
  try {
    const tab = await getActiveTab()
    if (!tab.url) return undefined
    return new URL(tab.url).origin
  } catch {
    return undefined
  }
}

export const listWebMcpTools = async (): Promise<WebMcpPageTools> => {
  const tab = await getActiveTab()

  let results: any[]
  try {
    results = await browser.scripting.executeScript({
      target: { tabId: tab.id!, allFrames: true },
      func: paReadWebMcpTools as any
    })
  } catch (error) {
    throw new Error(injectionErrorMessage(error))
  }

  const frames = (results || [])
    .filter((entry) => entry && !entry.error && entry.result)
    .sort((left, right) => (left.frameId ?? 0) - (right.frameId ?? 0))

  const tools: WebMcpToolDescriptor[] = []
  const seen = new Set<string>()
  let supported = false
  let url: string | undefined
  let title: string | undefined

  for (const frame of frames) {
    const frameResult = frame.result as FrameToolsResult
    if (frameResult.supported) supported = true
    if ((frame.frameId ?? 0) === 0) {
      url = frameResult.url
      title = frameResult.title
    }

    for (const tool of frameResult.tools || []) {
      if (seen.has(tool.name)) continue
      seen.add(tool.name)
      tools.push({ ...tool, frameId: frame.frameId ?? 0 })
    }
  }

  return { supported, tools, url, title }
}

export const callWebMcpTool = async (
  name: string,
  args: unknown
): Promise<{ text: string; isError: boolean }> => {
  const tab = await getActiveTab()
  const { supported, tools } = await listWebMcpTools()

  if (!supported) {
    return {
      text: "This page does not expose WebMCP tools. It may have navigated away from a WebMCP-enabled page.",
      isError: true
    }
  }

  const target = tools.find((tool) => tool.name === name)
  if (!target) {
    return {
      text: `The tool "${name}" is no longer available on the current page.`,
      isError: true
    }
  }

  let argsJson: string
  try {
    argsJson = JSON.stringify(args ?? {})
  } catch {
    argsJson = "{}"
  }

  let results: any[]
  try {
    results = await browser.scripting.executeScript({
      target: { tabId: tab.id!, frameIds: [target.frameId] },
      func: paExecuteWebMcpTool as any,
      args: [name, argsJson]
    })
  } catch (error) {
    return { text: injectionErrorMessage(error), isError: true }
  }

  const frameResult = results?.[0]?.result as FrameExecuteResult | undefined

  if (!frameResult) {
    return {
      text: `No response from the page while running "${name}".`,
      isError: true
    }
  }

  if (!frameResult.ok) {
    return { text: frameResult.error || "The tool call failed.", isError: true }
  }

  if (frameResult.navigated) {
    return {
      text: `The tool "${name}" ran and the page navigated or submitted a form. Call the tool listing again to see what is available on the new page.`,
      isError: false
    }
  }

  return { text: frameResult.text ?? "", isError: false }
}
