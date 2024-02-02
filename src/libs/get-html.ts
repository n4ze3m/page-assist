const _getHtml = () => {
  const url = window.location.href
  const html = Array.from(document.querySelectorAll("script")).reduce(
    (acc, script) => {
      return acc.replace(script.outerHTML, "")
    },
    document.documentElement.outerHTML
  )
  return { url, html }
}

export const getHtmlOfCurrentTab = async () => {
  const result = new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]
      const data = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: _getHtml
      })

      if (data.length > 0) {
        resolve(data[0].result)
      }
    })
  }) as Promise<{
    url: string
    html: string
  }>

  return result
}
