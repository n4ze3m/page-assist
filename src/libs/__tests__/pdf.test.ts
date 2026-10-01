import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// System under test
import * as pdfModule from '../pdf'

// Mock the sibling module that wraps pdfjs-dist
vi.mock('../pdfjs', () => {
  const getDocument = vi.fn()
  const GlobalWorkerOptions = { workerSrc: undefined as unknown }
  return {
    pdfDist: { getDocument, GlobalWorkerOptions }
  }
})

// Helper to get the mock easily (dynamic import so Vite alias/resolution isn't involved)
const getPdfDistMock = async () => (await import('../pdfjs') as any).pdfDist as {
  getDocument: ReturnType<typeof vi.fn>
}


describe('libs/pdf', () => {
  const originalFetch = global.fetch
  const encoder = new TextEncoder()

  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.fetch = originalFetch as any
  })

  it('getPdf calls pdfjs getDocument with safe flags and resolves pdfDocument', async () => {
    const pdfDocument = { numPages: 1 }

    const getDocumentReturn: any = {
      // getPdf awaits `.promise`
      promise: Promise.resolve(pdfDocument),
      // pdf.onPassword is assigned in our code path; include a place holder
      onPassword: undefined
    }

    ;(await getPdfDistMock()).getDocument.mockReturnValue(getDocumentReturn)

    const data = encoder.encode('dummy').buffer
    const result = await pdfModule.getPdf(data)

    // Validate: getDocument called with flags we set
    expect((await getPdfDistMock()).getDocument).toHaveBeenCalledTimes(1)
    expect((await getPdfDistMock()).getDocument).toHaveBeenCalledWith({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    })

    expect(result).toBe(pdfDocument as any)
  })

  it('processPdf fetches provided URL/base64 and returns pdfDocument via pdfjs pipeline', async () => {
    const arrayBuffer = encoder.encode('pdf-binary').buffer

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(arrayBuffer)
    } as any)

    // Ensure getPdf path works by providing a proper return from pdfjs getDocument
    const pdfDocument = { numPages: 1 }
    const getDocumentReturn: any = {
      promise: Promise.resolve(pdfDocument),
      onPassword: undefined
    }
    ;(await getPdfDistMock()).getDocument.mockReturnValue(getDocumentReturn)

    const pdf = await pdfModule.processPdf('data:application/pdf;base64,AAAA')

    expect(global.fetch).toHaveBeenCalled()
    // Validate that our pdfjs mock has been invoked through getPdf
    expect((await getPdfDistMock()).getDocument).toHaveBeenCalledTimes(1)
    expect(pdf).toBe(pdfDocument as any)
  })

  it('processPDFFromURL fetches, extracts text content across pages and returns concatenated text', async () => {
    const arrayBuffer = encoder.encode('pdf-binary').buffer

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(arrayBuffer)
    } as any)

    // Prepare a fake pdfDocument with two pages
    const page1 = {
      getTextContent: vi.fn().mockResolvedValue({
        items: [
          { str: 'Hello' },
          { str: '\u0000World' }, // contains null char that should be stripped
        ]
      })
    }
    const page2 = {
      getTextContent: vi.fn().mockResolvedValue({ items: [{ str: 'Page2' }] })
    }

    const pdfDocument: any = {
      numPages: 2,
      getPage: vi.fn()
        .mockResolvedValueOnce(page1 as any)
        .mockResolvedValueOnce(page2 as any)
    }

    // Mock pdfjs getDocument -> returns object with promise resolving to our pdfDocument
    ;(await getPdfDistMock()).getDocument.mockReturnValue({ promise: Promise.resolve(pdfDocument) } as any)

    const text = await pdfModule.processPDFFromURL('https://example.com/sample.pdf')

    // getPage called for both pages
    expect((pdfDocument.getPage as any).mock.calls.length).toBe(2)

    // Ensure text is concatenated with newlines, null chars removed, and trimmed
    // Our code joins page items with "\n" per page and concatenates pages directly
    expect(text).toBe('Hello\nWorldPage2')
  })
})
