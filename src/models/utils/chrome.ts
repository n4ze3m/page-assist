export const checkChromeAIAvailability = async (): Promise<
  | "readily"
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "no"
  | "after-download"
> => {
  try {
    // latest latest newer version
    if (typeof (globalThis as any).LanguageModel !== "undefined") {
      const availability = await (
        globalThis as any
      ).LanguageModel.availability()
      console.log("LanguageModel availability:", availability) 
      if (availability === "downloadable") {
        return "downloadable"
      }
      if (availability === "downloading") {
        return "downloading"
      }
      return availability == "available" ? "readily" : "no"
    }
    const ai = (window as any).ai

    // latest i guess
    if (ai?.languageModel?.capabilities) {
      const capabilities = await ai.languageModel.capabilities()
      return capabilities?.available ?? "no"
    }

    // old version change
    if (ai?.assistant?.capabilities) {
      const capabilities = await ai.assistant.capabilities()
      return capabilities?.available ?? "no"
    }

    // too old version
    if (ai?.canCreateTextSession) {
      const available = await ai.canCreateTextSession()
      return available ?? "no"
    }

    return "no"
  } catch (e) {
    console.error("Error checking Chrome AI availability:", e)
    return "no"
  }
}

export interface AITextSession {
  prompt(input: string): Promise<string>
  promptStreaming(input: string): ReadableStream
  destroy(): void
  clone(): AITextSession
}

export const createAITextSession = async (
  data: any
): Promise<AITextSession> => {
  // even newer version
  if (typeof (globalThis as any).LanguageModel !== "undefined") {
    const session = await (globalThis as any).LanguageModel.create({
      ...data
    })
    return session
  }
  const ai = (window as any).ai

  // new version i guess
  if (ai?.languageModel?.create) {
    const session = await ai.languageModel.create({
      ...data
    })
    return session
  }

  // old version change
  if (ai?.assistant?.create) {
    const session = await ai.assistant.create({
      ...data
    })
    return session
  }

  // too old version
  if (ai.createTextSession) {
    const session = await ai.createTextSession({
      ...data
    })

    return session
  }

  throw new Error("Chrome AI is not available.")
}
