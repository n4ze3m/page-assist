export interface DownloadProgressEvent {
  loaded: number
  total?: number
}

export const downloadChromeAIModel = async (
  onProgress?: (progress: DownloadProgressEvent) => void
): Promise<void> => {
  try {
    // Check if the newer LanguageModel API is available
    if (typeof (globalThis as any).LanguageModel !== "undefined") {
      const session = await (globalThis as any).LanguageModel.create({
        monitor(m: any) {
          if (onProgress) {
            m.addEventListener("downloadprogress", (e: DownloadProgressEvent) => {
              onProgress({
                loaded: e.loaded,
                total: e.total
              })
            })
          }
        }
      })
      
      // Clean up the session after download
      if (session && session.destroy) {
        session.destroy()
      }
      
      return
    }

    // Fallback for older APIs
    const ai = (window as any).ai
    
    if (ai?.languageModel?.create) {
      const session = await ai.languageModel.create({
        monitor(m: any) {
          if (onProgress) {
            m.addEventListener("downloadprogress", (e: DownloadProgressEvent) => {
              onProgress({
                loaded: e.loaded,
                total: e.total
              })
            })
          }
        }
      })
      
      if (session && session.destroy) {
        session.destroy()
      }
      
      return
    }

    throw new Error("Chrome AI download is not supported on this version")
  } catch (error) {
    console.error("Error downloading Chrome AI model:", error)
    throw error
  }
}
