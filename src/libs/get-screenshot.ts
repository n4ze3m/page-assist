const captureVisibleTab = () => {
  const result = new Promise<string>((resolve) => {
    if (import.meta.env.BROWSER === "chrome") {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0]
        chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
          resolve(dataUrl)
        })
      })
    } else {
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then(async (tabs) => {
          const dataUrl = (await Promise.race([
            browser.tabs.captureVisibleTab(null, { format: "png" }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Screenshot capture timed out")),
                10000
              )
            )
          ])) as string
          resolve(dataUrl)
        })
    }
  })
  return result
}

export const getScreenshotFromCurrentTab = async () => {
  try {
    const screenshotDataUrl = await captureVisibleTab()
    return {
      success: true,
      screenshot: screenshotDataUrl,
      error: null
    }
  } catch (error) {
    return {
      success: false,
      screenshot: null,
      error:
        error instanceof Error ? error.message : "Failed to capture screenshot"
    }
  }
}
