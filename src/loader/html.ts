import { BaseDocumentLoader } from "langchain/document_loaders/base"
import { Document } from "@langchain/core/documents"
import { isWikipedia, parseWikipedia } from "@/parser/wiki"
import { extractReadabilityContent } from "@/parser/reader"
import { isYoutubeLink } from "@/utils/is-youtube"



const getTranscript = async (url: string) => {
  try {
    // Avoid Vite pre-bundling; load only at runtime in environments that support it
    const mod = await import(/* @vite-ignore */ 'yt-transcript')
    const YtTranscript = (mod as any).YtTranscript || mod
    const ytTranscript = new YtTranscript({ url })
    return await ytTranscript.getTranscript()
  } catch (e) {
    console.warn('YouTube transcript disabled in this environment:', e)
    return null
  }
}

export interface WebLoaderParams {
  html: string
  url: string
}

export class PageAssistHtmlLoader
  extends BaseDocumentLoader
  implements WebLoaderParams {
  html: string
  url: string

  constructor({ html, url }: WebLoaderParams) {
    super()
    this.html = html
    this.url = url
  }

  async load(): Promise<Document<Record<string, any>>[]> {
    console.log("Loading HTML...", this.url)
    if (isYoutubeLink(this.url)) {
      console.log("Youtube link detected")
      const transcript = await getTranscript(this.url)
      if (!transcript) {
        throw new Error("Transcript not found for this video.")
      }

      let text = ""

      transcript.forEach((item) => {
        text += `[${item?.start}] ${item?.text}\n`
      })

      return [
        {
          metadata: {
            source: this.url,
            url: this.url,
            audio: { chunks: transcript }
          },
          pageContent: text
        }
      ]
    }
    const metadata = { source: this.url, url: this.url, }
    return [new Document({ pageContent: this.html, metadata })]
  }

  async loadByURL(): Promise<Document<Record<string, any>>[]> {
    try {
      console.log("Loading HTML...", this.url)
      if (isYoutubeLink(this.url)) {
        console.log("Youtube link detected")
        const transcript = await getTranscript(this.url)
        if (!transcript) {
          throw new Error("Transcript not found for this video.")
        }

        let text = ""

        transcript?.forEach((item) => {
          text += `[${item?.start}] ${item?.text}\n`
        })

        return [
          {
            metadata: {
              url: this.url,
              source: this.url,
              audio: { chunks: transcript }
            },
            pageContent: text
          }
        ]
      }
      // await urlRewriteRuntime(this.url, "web")
      let text = "";
      if (isWikipedia(this.url)) {
        const fetchHTML = await fetch(this.url)
        text = parseWikipedia(await fetchHTML.text())
      } else {
        text = await extractReadabilityContent(this.url)
      }

      const metadata = { url: this.url }
      return [new Document({ pageContent: text, metadata })]
    } catch (e) {
      console.log("[PageAssistHtmlLoader] loadByURL", e)
      return []
    }
  }
}
