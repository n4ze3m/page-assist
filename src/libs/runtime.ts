/**
 * Rewrites the URL of a request to set the 'Origin' header based on the user's Ollama settings.
 *
 * This function is used to handle CORS issues that may arise when making requests to certain domains.
 * It checks the user's Ollama settings to determine if URL rewriting is enabled, and if so, it updates the
 * 'Origin' header of the request to the specified rewrite URL.
 *
 * @param domain - The domain of the request to be rewritten.
 * @param type - The type of request, defaults to 'ollama'.
 * @returns - A Promise that resolves when the URL rewriting is complete.
 */
import { getAdvancedOllamaSettings } from "@/services/features/app"

let firefoxRewriteListener: ((details: any) => any) | null = null

const removeFirefoxRewriteListener = () => {
  if (firefoxRewriteListener) {
    try {
      browser.webRequest.onBeforeSendHeaders.removeListener(
        firefoxRewriteListener
      )
    } catch (e) {}
    firefoxRewriteListener = null
  }
}

export const urlRewriteRuntime = async function (
  domain: string,
  type = "ollama"
) {
  if (browser.runtime && browser.runtime.id) {
    const { isEnableRewriteUrl, rewriteUrl, autoCORSFix } =
      await getAdvancedOllamaSettings()

    if (!autoCORSFix) {
      if (
        import.meta.env.BROWSER === "chrome" ||
        import.meta.env.BROWSER === "edge"
      ) {
        try {
          await browser.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [1],
            addRules: []
          })
        } catch (e) {}
      }

      if (import.meta.env.BROWSER === "firefox") {
        removeFirefoxRewriteListener()
      }

      return
    }

    if (
      import.meta.env.BROWSER === "chrome" ||
      import.meta.env.BROWSER === "edge"
    ) {
      const url = new URL(domain)
      let origin = url.origin
      if (isEnableRewriteUrl && rewriteUrl && type === "ollama") {
        origin = rewriteUrl
      }
      const rules = [
        {
          id: 1,
          priority: 1,
          condition: {
            // anchor to the exact scheme://host:port — requestDomains would
            // match every port on the hostname and break unrelated local apps
            urlFilter: `|${url.origin}/`,
            // only rewrite requests made by this extension, never by web pages
            initiatorDomains: [browser.runtime.id]
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
      let origin = url.origin
      if (isEnableRewriteUrl && rewriteUrl && type === "ollama") {
        origin = rewriteUrl
      }
      const extensionBaseUrl =
        new URL(browser.runtime.getURL("/options.html")).origin + "/"
      removeFirefoxRewriteListener()
      firefoxRewriteListener = (details) => {
        // match patterns ignore ports, so scope to the exact origin here,
        // and only touch requests made by this extension
        if (
          !details.url.startsWith(`${url.origin}/`) ||
          !details.originUrl?.startsWith(extensionBaseUrl)
        ) {
          return { requestHeaders: details.requestHeaders }
        }
        for (let i = 0; i < details.requestHeaders.length; i++) {
          if (details.requestHeaders[i].name === "Origin") {
            details.requestHeaders[i].value = origin
          }
        }
        return { requestHeaders: details.requestHeaders }
      }
      browser.webRequest.onBeforeSendHeaders.addListener(
        firefoxRewriteListener,
        { urls: [`*://${url.hostname}/*`] },
        ["blocking", "requestHeaders"]
      )
    }
  }
}
