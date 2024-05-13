export const isGoogleDocs = (url: string) => {
  const GOOGLE_DOCS_REGEX = /docs\.google\.com\/document/g
  return GOOGLE_DOCS_REGEX.test(url)
}

const getGoogleDocs = () => {
  try {
    function traverse(
      obj: { [x: string]: any },
      predicate: { (_: any, value: any): boolean; (arg0: any, arg1: any): any },
      maxDepth: number,
      propNames = Object.getOwnPropertyNames(obj)
    ) {
      const visited = new Set()
      const results = []
      let iterations = 0

      const traverseObj = (
        name: string,
        value: unknown,
        path: any[],
        depth = 0
      ) => {
        iterations++
        if (name === "prototype" || value instanceof Window || depth > maxDepth)
          return

        const currentPath = [...path, name]

        try {
          if (predicate(name, value)) {
            results.push({ path: currentPath, value })
            return
          }
        } catch (error) {}

        if (value != null && !visited.has(value)) {
          visited.add(value)
          if (Array.isArray(value)) {
            value.forEach((val, index) => {
              try {
                traverseObj(index.toString(), val, currentPath, depth + 1)
              } catch (error) {}
            })
          } else if (value instanceof Object) {
            const propNamesForValue =
              value &&
              // @ts-ignore
              value.nodeType === 1 &&
              // @ts-ignore
              typeof value.nodeName === "string"
                ? Object.getOwnPropertyNames(obj)
                : Object.getOwnPropertyNames(value)

            propNamesForValue.forEach((prop) => {
              try {
                traverseObj(prop, value[prop], currentPath, depth + 1)
              } catch (error) {}
            })
          }
        }
      }

      propNames.forEach((prop) => {
        try {
          traverseObj(prop, obj[prop], [])
        } catch (error) {}
      })

      return { results, iterations }
    }

    const result = traverse(
      // @ts-ignore
      window.KX_kixApp,
      (_: any, value: { toString: () => string }) =>
        value && "\x03" === value.toString().charAt(0),
      5
    )
    if (result.results?.[0]?.value) {
      return {
        content: result.results[0].value
      }
    }

    return {
      content: null
    }
  } catch (error) {
    return {
      content: null
    }
  }
}

export const parseGoogleDocs = async () => {
  const result = new Promise((resolve) => {
    if (import.meta.env.BROWSER === "chrome") {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0]

        const data = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: "MAIN",
          func: getGoogleDocs
        })

        if (data.length > 0) {
          resolve(data[0].result)
        }
      })
    } else {
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then(async (tabs) => {
          const tab = tabs[0]

          const data = await browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: getGoogleDocs
          })

          if (data.length > 0) {
            resolve(data[0].result)
          }
        })
    }
  }) as Promise<{
    content?: string
  }>

  const { content } = await result

  return content
}
