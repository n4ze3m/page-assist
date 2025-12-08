export const openSidepanelForActiveTab = async (): Promise<void> => {
  try {
    const globalScope = globalThis as typeof globalThis & {
      chrome?: typeof chrome
    }

    const chromeGlobal = globalScope.chrome
    const sidePanelApi = chromeGlobal?.sidePanel
    const tabsApi = chromeGlobal?.tabs

    if (!sidePanelApi || !tabsApi) {
      return
    }

    const tabs = await tabsApi.query({
      active: true,
      currentWindow: true
    })
    const activeTab = tabs?.[0]
    if (!activeTab?.id) {
      return
    }

    await sidePanelApi.open({ tabId: activeTab.id })
  } catch {
    // ignore navigation errors
  }
}

