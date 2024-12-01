import { Storage } from "@plasmohq/storage"
const storage = new Storage()

const DEFAULT_URL_REWRITE_URL = "http://127.0.0.1:11434"

export const isUrlRewriteEnabled = async () => {
  const enabled = await storage.get<boolean | undefined>("urlRewriteEnabled")
  return enabled ?? false
}
export const setUrlRewriteEnabled = async (enabled: boolean) => {
  await storage.set("urlRewriteEnabled", enabled)
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

export const getAdvancedOllamaSettings = async () => {
  const [isEnableRewriteUrl, rewriteUrl] = await Promise.all([
    isUrlRewriteEnabled(),
    getRewriteUrl()
  ])

  return {
    isEnableRewriteUrl,
    rewriteUrl
  }
}

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

export const customOllamaHeaders = async (): Promise<
  { key: string; value: string }[]
> => {
  const headers = await storage.get<
    { key: string; value: string }[] | undefined
  >("customOllamaHeaders")
  if (!headers) {
    return []
  }
  return headers
}

export const setCustomOllamaHeaders = async (headers: string[]) => {
  await storage.set("customOllamaHeaders", headers)
}

export const getCustomOllamaHeaders = async (): Promise<
  Record<string, string>
> => {
  const headers = await customOllamaHeaders()

  const headerMap: Record<string, string> = {}

  for (const header of headers) {
    headerMap[header.key] = header.value
  }

  return headerMap
}

export const getOpenOnIconClick = async (): Promise<string> => {
  const openOnIconClick = await storage.get<string>("openOnIconClick");
  return openOnIconClick || "webUI";
};

export const setOpenOnIconClick = async (option: "webUI" | "sidePanel"): Promise<void> => {
  await storage.set("openOnIconClick", option);
};

export const getOpenOnRightClick = async (): Promise<string> => {
  const openOnRightClick = await storage.get<string>("openOnRightClick");
  return openOnRightClick || "sidePanel";
};

export const setOpenOnRightClick = async (option: "webUI" | "sidePanel"): Promise<void> => {
  await storage.set("openOnRightClick", option);
};


export const getTotalFilePerKB = async (): Promise<number> => {
  const totalFilePerKB = await storage.get<number>("totalFilePerKB");
  return totalFilePerKB || 10;
}


export const setTotalFilePerKB = async (totalFilePerKB: number): Promise<void> => {
  await storage.set("totalFilePerKB", totalFilePerKB);
};

export const getNoOfRetrievedDocs = async (): Promise<number> => {
  const noOfRetrievedDocs = await storage.get<number>("noOfRetrievedDocs");
  return noOfRetrievedDocs || 4 
}

export const setNoOfRetrievedDocs = async (noOfRetrievedDocs: number): Promise<void> => {
  await storage.set("noOfRetrievedDocs", noOfRetrievedDocs);
}