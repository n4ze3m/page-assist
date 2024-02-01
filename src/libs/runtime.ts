export const chromeRunTime = async function (domain: string) {
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
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

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map((r) => r.id),
      // @ts-ignore
      addRules: rules
    })
  }
}
