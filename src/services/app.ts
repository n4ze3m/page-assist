import { Storage } from "@plasmohq/storage"
const storage = new Storage()
const storage2 = new Storage({
  area: "local"
})

const DEFAULT_URL_REWRITE_URL = "http://127.0.0.1:8000"

export const isUrlRewriteEnabled = async () => {
  const enabled = await storage.get<boolean | undefined>("urlRewriteEnabled")
  return enabled ?? false
}
export const setUrlRewriteEnabled = async (enabled: boolean) => {
  await storage.set("urlRewriteEnabled", enabled)
}

export const getIsAutoCORSFix = async () => {
  try {
    const enabled = await storage2.get<boolean | undefined>("autoCORSFix")
    return enabled ?? true
  } catch (e) {
    return true
  }
}

export const setAutoCORSFix = async (enabled: boolean) => {
  await storage2.set("autoCORSFix", enabled)
}

export const getRewriteUrl = async () => {
  const rewriteUrl = await storage.get("rewriteUrl")
  if (!rewriteUrl || rewriteUrl.trim() === "") {
    return DEFAULT_URL_REWRITE_URL
  }
  return rewriteUrl
}

export const setRewriteUrl = async (url: string) => {
  await storage.set("rewriteUrl", url)
}

export const getAdvancedCORSSettings = async () => {
  const [isEnableRewriteUrl, rewriteUrl, autoCORSFix] = await Promise.all([
    isUrlRewriteEnabled(),
    getRewriteUrl(),
    getIsAutoCORSFix()
  ])

  return {
    isEnableRewriteUrl,
    rewriteUrl,
    autoCORSFix
  }
}

// Legacy alias for backward compatibility
export const getAdvancedOllamaSettings = getAdvancedCORSSettings

export const copilotResumeLastChat = async () => {
  return await storage.get<boolean>("copilotResumeLastChat")
}

export const webUIResumeLastChat = async () => {
  return await storage.get<boolean>("webUIResumeLastChat")
}

export const defaultSidebarOpen = async () => {
  const sidebarOpen = await storage.get("sidebarOpen")
  if (!sidebarOpen || sidebarOpen === "") {
    return "right_clk"
  }
  return sidebarOpen
}

export const setSidebarOpen = async (sidebarOpen: string) => {
  await storage.set("sidebarOpen", sidebarOpen)
}

export const customHeaders = async (): Promise<
  { key: string; value: string }[]
> => {
  const headers = await storage.get<
    { key: string; value: string }[] | undefined
  >("customHeaders")

  // One-time migration from old key
  if (!headers) {
    const oldHeaders = await storage.get<
      { key: string; value: string }[] | undefined
    >("customOllamaHeaders")
    if (oldHeaders) {
      await storage.set("customHeaders", oldHeaders)
      return oldHeaders
    }
  }

  if (!headers) {
    return []
  }
  return headers
}

export const setCustomHeaders = async (headers: { key: string; value: string }[]) => {
  await storage.set("customHeaders", headers)
}

export const getCustomHeaders = async (): Promise<
  Record<string, string>
> => {
  const hdrs = await customHeaders()

  const headerMap: Record<string, string> = {}

  for (const header of hdrs) {
    headerMap[header.key] = header.value
  }

  return headerMap
}

// Legacy aliases for backward compatibility
export const customOllamaHeaders = customHeaders
export const setCustomOllamaHeaders = setCustomHeaders
export const getCustomOllamaHeaders = getCustomHeaders

export const getOpenOnIconClick = async (): Promise<string> => {
  const openOnIconClick = await storage.get<string>("openOnIconClick")
  return openOnIconClick || "webUI"
}

export const setOpenOnIconClick = async (
  option: "webUI" | "sidePanel"
): Promise<void> => {
  await storage.set("openOnIconClick", option)
}

export const getOpenOnRightClick = async (): Promise<string> => {
  const openOnRightClick = await storage.get<string>("openOnRightClick")
  return openOnRightClick || "sidePanel"
}

export const setOpenOnRightClick = async (
  option: "webUI" | "sidePanel"
): Promise<void> => {
  await storage.set("openOnRightClick", option)
}

export const getTotalFilePerKB = async (): Promise<number> => {
  const totalFilePerKB = await storage.get<number>("totalFilePerKB")
  return totalFilePerKB || 5
}

export const setTotalFilePerKB = async (
  totalFilePerKB: number
): Promise<void> => {
  await storage.set("totalFilePerKB", totalFilePerKB)
}

export const getNoOfRetrievedDocs = async (): Promise<number> => {
  const noOfRetrievedDocs = await storage.get<number>("noOfRetrievedDocs")
  return noOfRetrievedDocs || 4
}

export const setNoOfRetrievedDocs = async (
  noOfRetrievedDocs: number
): Promise<void> => {
  await storage.set("noOfRetrievedDocs", noOfRetrievedDocs)
}

export const isRemoveReasoningTagFromCopy = async (): Promise<boolean> => {
  const removeReasoningTagFromCopy = await storage.get<boolean>(
    "removeReasoningTagFromCopy"
  )
  return removeReasoningTagFromCopy ?? true
}
