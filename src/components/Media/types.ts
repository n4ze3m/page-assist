export type MediaResultItem = {
  kind: "media" | "note"
  id: string | number
  title?: string
  snippet?: string
  keywords?: string[]
  meta?: Record<string, any>
  raw: any
}
