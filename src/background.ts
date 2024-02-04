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
  chrome.tabs.create({url: chrome.runtime.getURL("options.html")});
});

// listen to commadns
chrome.commands.onCommand.addListener((command) => {
  console.log('Command', command)
})