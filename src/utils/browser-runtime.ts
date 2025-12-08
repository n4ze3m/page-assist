export const getBrowserRuntime = () => {
  try {
    const globalScope = globalThis as typeof globalThis & {
      browser?: typeof chrome
      chrome?: typeof chrome
    }

    if (globalScope.browser?.runtime) {
      return globalScope.browser.runtime
    }

    if (globalScope.chrome?.runtime) {
      return globalScope.chrome.runtime
    }
  } catch {
    // ignore runtime detection errors
  }

  return null
}

