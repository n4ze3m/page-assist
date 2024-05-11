export const chromeRunTime = async function (domain: string) {
  if (browser.runtime && browser.runtime.id) {
    if (import.meta.env.BROWSER === "chrome") {
      const url = new URL(domain)
      const domains = [url.hostname]
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
                value: `${url.protocol}//${url.hostname}`
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
          for (let i = 0; i < details.requestHeaders.length; i++) {
            if (details.requestHeaders[i].name === "Origin") {
              details.requestHeaders[i].value =
                `${url.protocol}//${url.hostname}`
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
