export {}

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === "sidepanel") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]
      await chrome.sidePanel.open({
        tabId: tab.id
      })
    })
  }
})

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: chrome.runtime.getURL("options.html") })
})

chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case "execute_side_panel":
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0]
        await chrome.sidePanel.open({
          tabId: tab.id
        })
      })
      break
    default:
      break
  }
})

chrome.contextMenus.create({
  id: "open-side-panel-pa",
  title: "Open Side Panel to Chat",
  contexts: ["all"]
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open-side-panel-pa") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]
      await chrome.sidePanel.open({
        tabId: tab.id
      })
    })
  }
})
