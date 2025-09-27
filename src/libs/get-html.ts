import { defaultExtractContent } from "@/parser/default"
import { getPdf } from "./pdf"
import {
  isTweet,
  isTwitterTimeline,
  parseTweet,
  parseTwitterTimeline
} from "@/parser/twitter"
import { isGoogleDocs, parseGoogleDocs } from "@/parser/google-docs"
import { cleanUnwantedUnicode } from "@/utils/clean"
import { isYoutubeLink } from "@/utils/is-youtube"

const _getHtml = () => {
  const url = window.location.href
  if (document.contentType === "application/pdf") {
    return { url, content: "", type: "pdf" }
  }

  return {
    content: document.documentElement.outerHTML,
    url,
    type: "html"
  }
}

// this is a function that fetches youtube transcript from the current tab
const _fetchTranscriptYT = async () => {
  const url = window.location.href
  const response = await fetch(url)
  const content = await response.text()
  console.log("fetching transcript from youtube html", content.length)
  function extractYouTubeData(htmlContent: string) {
    const results: any = {}

    try {
      // Extract INNERTUBE_CONTEXT for client info
      const innertubePattern =
        /["']?INNERTUBE_CONTEXT["']?\s*:\s*({[\s\S]*?"client"[\s\S]*?})/
      const contextMatch = htmlContent.match(innertubePattern)

      if (contextMatch) {
        try {
          // Find complete client object with proper brace matching
          let startIdx = htmlContent.indexOf(contextMatch[1])
          let braceCount = 0
          let inString = false
          let escapeNext = false
          let endIdx = startIdx

          for (
            let i = startIdx;
            i < htmlContent.length && i < startIdx + 50000;
            i++
          ) {
            const char = htmlContent[i]

            if (!escapeNext) {
              if (char === '"' || char === "'") {
                inString = !inString
              } else if (char === "\\") {
                escapeNext = true
              } else if (!inString) {
                if (char === "{") braceCount++
                else if (char === "}") {
                  braceCount--
                  if (braceCount === 0) {
                    endIdx = i + 1
                    break
                  }
                }
              }
            } else {
              escapeNext = false
            }
          }

          const contextStr = htmlContent.substring(startIdx, endIdx)
          const contextObj = JSON.parse(contextStr)

          if (contextObj.client) {
            results.clientName = contextObj.client.clientName
            results.clientVersion = contextObj.client.clientVersion
          }
        } catch (e) {
          // Fallback to regex
        }
      }

      // Direct search for clientName and clientVersion as fallback
      if (!results.clientName) {
        const nameMatch = htmlContent.match(
          /["']?clientName["']?\s*:\s*["']([^"']+)["']/
        )
        if (nameMatch) results.clientName = nameMatch[1]
      }

      if (!results.clientVersion) {
        const versionMatch = htmlContent.match(
          /["']?clientVersion["']?\s*:\s*["']([^"']+)["']/
        )
        if (versionMatch) results.clientVersion = versionMatch[1]
      }

      // Extract getTranscriptEndpoint params - multiple patterns to catch different formats
      const transcriptPatterns = [
        /getTranscriptEndpoint\s*:\s*{[^{}]*params\s*:\s*["']([^"']+)["']/,
        /["']?getTranscriptEndpoint["']?\s*:\s*{[^{}]*["']?params["']?\s*:\s*["']([^"']+)["']/,
        /getTranscriptEndpoint["']?\s*:\s*{[\s\S]*?params["']?\s*:\s*["']([^"']+)["']/,
        // Look for the pattern in a broader context
        /getTranscriptEndpoint[^{]*{[^}]*params[^:]*:\s*["']([^"']+)["']/
      ]

      for (const pattern of transcriptPatterns) {
        const match = htmlContent.match(pattern)
        if (match) {
          results.transcriptParams = match[1]
          break
        }
      }

      // If not found, try to find it in a more complex nested structure
      if (!results.transcriptParams) {
        // Search for the endpoint object and extract params
        const endpointMatch = htmlContent.match(
          /getTranscriptEndpoint[^{]*({[\s\S]*?})(?=\s*[,}])/
        )
        if (endpointMatch) {
          const paramsMatch = endpointMatch[1].match(
            /params\s*:\s*["']([^"']+)["']/
          )
          if (paramsMatch) {
            results.transcriptParams = paramsMatch[1]
          }
        }
      }

      // Extract commandMetadata
      const cmdPatterns = [
        /["']?commandMetadata["']?\s*:\s*{\s*["']?webCommandMetadata["']?\s*:\s*{([^}]+)}/,
        /commandMetadata\s*:\s*{\s*webCommandMetadata\s*:\s*{([^}]+)}/
      ]

      for (const pattern of cmdPatterns) {
        const cmdMatch = htmlContent.match(pattern)
        if (cmdMatch) {
          const webCmd = cmdMatch[1]

          // Extract sendPost
          const sendPostMatch = webCmd.match(
            /["']?sendPost["']?\s*:\s*(true|false)/
          )
          if (sendPostMatch) {
            results.sendPost = sendPostMatch[1] === "true"
          }

          // Extract apiUrl
          const apiUrlMatch = webCmd.match(
            /["']?apiUrl["']?\s*:\s*["']([^"']+)["']/
          )
          if (apiUrlMatch) {
            results.apiUrl = apiUrlMatch[1]
          }

          break
        }
      }

      // Direct search for apiUrl if not found in commandMetadata
      if (!results.apiUrl) {
        const apiUrlMatch = htmlContent.match(
          /["']?apiUrl["']?\s*:\s*["'](\/youtubei\/v1\/get_transcript)["']/
        )
        if (apiUrlMatch) {
          results.apiUrl = apiUrlMatch[1]
        }
      }
    } catch (error) {
      console.error("Parsing error:", error)
      results.error = error.message
    }

    return results
  }

  async function fetchTranscript(extractedData: any) {
    if (!extractedData.transcriptParams) {
      throw new Error("No transcript params found")
    }

    const apiUrl = "/youtubei/v1/get_transcript"
    const url = `https://www.youtube.com${apiUrl}`

    const requestBody = {
      context: {
        client: {
          clientName: extractedData.clientName || "WEB",
          clientVersion: extractedData.clientVersion || "2.0"
        }
      },
      params: extractedData.transcriptParams
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return parseTranscriptResponse(data)
    } catch (error) {
      console.error("Failed to fetch transcript:", error)
      throw error
    }
  }

  function parseTranscriptResponse(data: any) {
    const transcript = []

    try {
      // Navigate through the YouTube API response structure
      const actions = data?.actions
      if (!actions) return transcript

      for (const action of actions) {
        const results =
          action?.updateEngagementPanelAction?.content?.transcriptRenderer
            ?.content?.transcriptSearchPanelRenderer?.body
            ?.transcriptSegmentListRenderer?.initialSegments ||
          action?.appendContinuationItemsAction?.continuationItems

        if (!results) continue

        for (const segment of results) {
          const cueGroup = segment?.transcriptSegmentRenderer?.snippet?.runs
          if (!cueGroup) continue

          const text = cueGroup.map((run) => run.text).join("")
          const startMs = segment?.transcriptSegmentRenderer?.startMs
          const endMs = segment?.transcriptSegmentRenderer?.endMs

          if (text) {
            transcript.push({
              text: text.trim(),
              start: startMs ? parseInt(startMs) / 1000 : null,
              end: endMs ? parseInt(endMs) / 1000 : null,
              startMs: startMs ? parseInt(startMs) : null,
              endMs: endMs ? parseInt(endMs) : null
            })
          }
        }
      }
    } catch (error) {
      console.error("Error parsing transcript response:", error)
    }

    return transcript
  }

  const getTranscriptYoutubeFromHTML = async (htmlContent: string) => {
    try {
      const extractedData = extractYouTubeData(htmlContent) as any
      if (!extractedData?.transcriptParams) {
        console.log("[YouTube Transcript] No transcript params found.")
        return ""
      }
      const transcript = await fetchTranscript(extractedData)
      return transcript?.map((t) => `[${t?.start}] ${t?.text}`).join("\n")
    } catch (e) {
      console.log("[YouTube Transcript] Error extracting transcript:", e)
      return ""
    }
  }
  const transcript = await getTranscriptYoutubeFromHTML(content)

  console.log(transcript)

  return transcript
}

export const fetchTranscriptYT = async () => {
  return new Promise<string>((resolve) => {
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(async (tabs) => {
        const tab = tabs[0]
        try {
          const data = await browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: _fetchTranscriptYT
          })

          if (data.length > 0) {
            resolve(data[0].result)
          }
        } catch (e) {
          console.error("error", e)
          resolve("")
        }
      })
  })
}

export const getDataFromCurrentTab = async () => {
  const result = new Promise((resolve) => {
    if (
      import.meta.env.BROWSER === "chrome" ||
      import.meta.env.BROWSER === "edge"
    ) {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0]

        const data = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: _getHtml
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
          try {
            const data = await browser.scripting.executeScript({
              target: { tabId: tab.id },
              func: _getHtml
            })

            if (data.length > 0) {
              resolve(data[0].result)
            }
          } catch (e) {
            console.error("error", e)
            // this is a weird method but it works
            if (import.meta.env.BROWSER === "firefox") {
              // all I need is to get the pdf url but somehow
              // firefox won't allow extensions to run content scripts on pdf https://bugzilla.mozilla.org/show_bug.cgi?id=1454760
              // so I set up a weird method to fix this issue by asking tab to give the url
              // and then I can get the pdf url
              const result = {
                url: tab.url,
                content: "",
                type: "pdf"
              }
              resolve(result)
            }
          }
        })
    }
  }) as Promise<{
    url: string
    content: string
    type: string
  }>

  const { content, type, url } = await result

  if (type === "pdf") {
    const res = await fetch(url)
    const data = await res.arrayBuffer()
    let pdfHtml: {
      content: string
      page: number
    }[] = []
    const pdf = await getPdf(data)

    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()

      if (content?.items.length === 0) {
        continue
      }

      const text = content?.items
        .map((item: any) => item.str)
        .join("\n")
        .replace(/\x00/g, "")
        .trim()
      pdfHtml.push({
        content: text,
        page: i
      })
    }

    return {
      url,
      content: "",
      pdf: pdfHtml,
      type: "pdf"
    }
  }
  if (isTwitterTimeline(url)) {
    const data = parseTwitterTimeline(content)
    return {
      url,
      content: data,
      type: "html",
      pdf: [],
      html: content
    }
  } else if (isTweet(url)) {
    const data = parseTweet(content)
    return {
      url,
      content: data,
      type: "html",
      pdf: [],
      html: content
    }
  } else if (isGoogleDocs(url)) {
    const data = await parseGoogleDocs()
    if (data) {
      return {
        url,
        content: cleanUnwantedUnicode(data),
        type: "html",
        pdf: [],
        html: content
      }
    }
  }
  const data = defaultExtractContent(content)
  return { url, content: data, type, pdf: [], html: content }
}

export const getContentFromCurrentTab = async (isUsingVS: boolean) => {
  const data = await getDataFromCurrentTab()

 
  if (isYoutubeLink(data.url)) {
    console.log("Youtube link detected")
    const transcript = await fetchTranscriptYT()
    console.log(transcript)
    return {
      ...data,
      content: transcript
    }
  }


  return data
}
