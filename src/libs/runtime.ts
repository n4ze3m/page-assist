import { getAdvancedOllamaSettings } from "@/services/app"

export const urlRewriteRuntime = async function (
  domain: string,
  type = "ollama"
) {
  if (browser.runtime && browser.runtime.id) {
    const { isEnableRewriteUrl, rewriteUrl } = await getAdvancedOllamaSettings()
    if (import.meta.env.BROWSER === "chrome") {
      const url = new URL(domain)
      const domains = [url.hostname]
      let origin = `${url.protocol}//${url.hostname}`
      if (isEnableRewriteUrl && rewriteUrl && type === "ollama") {
        origin = rewriteUrl
      }
      const rules = [
        {
          id: 1,
          priority: 1,
          condition: {
            requestDomains: domains
          },
          action: {
            type: "modifyHeaders",
            requestHeaders: [
              {
                header: "Origin",
                operation: "set",
                value: origin
              }
            ]
          }
        }
      ]
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map((r) => r.id),
        // @ts-ignore
        addRules: rules
      })
    }

    if (import.meta.env.BROWSER === "firefox") {
      const url = new URL(domain)
      const domains = [`*://${url.hostname}/*`]
      browser.webRequest.onBeforeSendHeaders.addListener(
        (details) => {
          let origin = `${url.protocol}//${url.hostname}`
          if (isEnableRewriteUrl && rewriteUrl && type === "ollama") {
            origin = rewriteUrl
          }
          for (let i = 0; i < details.requestHeaders.length; i++) {
            if (details.requestHeaders[i].name === "Origin") {
              details.requestHeaders[i].value = origin
            }
          }
          return { requestHeaders: details.requestHeaders }
        },
        { urls: domains },
        ["blocking", "requestHeaders"]
      )
    }
  }
}
