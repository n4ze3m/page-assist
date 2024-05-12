import { Storage } from "@plasmohq/storage"
const storage = new Storage()

export const isUrlRewriteEnabled = async () => {
  const enabled = await storage.get("urlRewriteEnabled")
  return enabled === "true"
}

export const setUrlRewriteEnabled = async (enabled: boolean) => {
  await storage.set("urlRewriteEnabled", enabled ? "true" : "false")
}

export const getRewriteUrl = async () => {
  const rewriteUrl = await storage.get("rewriteUrl")
  return rewriteUrl
}

export const setRewriteUrl = async (url: string) => {
  await storage.set("rewriteUrl", url)
}
