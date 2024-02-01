export {}

chrome.runtime.onMessage.addListener(async (message) => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0]
    await chrome.sidePanel.open({
      tabId: tab.id,
    })
  })
})
