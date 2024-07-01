export const getChromeAISupported = async () => {
  try {
    let browserInfo = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)
    let version = browserInfo ? parseInt(browserInfo[2], 10) : 0

    if (version < 127) {
      return "browser_not_supported"
    }

    if (!("ai" in globalThis)) {
      return "ai_not_supported"
    }

    //@ts-ignore
    const createSession = await ai?.canCreateGenericSession()
    if (createSession !== "readily") {
      return "ai_not_ready"
    }

    return "success"
  } catch (e) {
    console.error(e)
    return "internal_error"
  }
}

export const isChromeAISupported = async () => {
  const result = await getChromeAISupported()
  return result === "success"
}
