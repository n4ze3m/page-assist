import { describe, it, expect } from 'vitest'
import { PageAssistPDFLoader } from '../pdf'

describe('loader/PageAssistPDFLoader', () => {
  it('aggregates page contents into one Document and preserves per-page metadata', async () => {
    const pages = [
      { content: 'Page 1 text', page: 1 },
      { content: 'Page 2 text', page: 2 },
    ]
    const url = 'https://example.com/test.pdf'

    const loader = new PageAssistPDFLoader({ pdf: pages, url })
    const docs = await loader.load()

    // Loader returns a single Document with joined content and metadata array
    expect(docs).toHaveLength(1)
    const doc = docs[0]
    expect(doc.pageContent).toBe('Page 1 text\n\nPage 2 text')

    // metadata is an array of the individual document metadatas
    const meta = doc.metadata as any[]
    expect(Array.isArray(meta)).toBe(true)
    expect(meta).toEqual([
      { source: url, page: 1 },
      { source: url, page: 2 },
    ])
  })
})
