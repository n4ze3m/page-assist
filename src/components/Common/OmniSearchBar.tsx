import React from "react"
import { Search as SearchIcon } from "lucide-react"

import { useDebounce } from "@/hooks/useDebounce"
import {
  omniSearch,
  type OmniSearchDependencies,
  type OmniSearchEntityType,
  type OmniSearchResponse,
  type OmniSearchResult
} from "@/utils/omni-search"
import { useTranslation } from "react-i18next"

type Props = {
  deps: OmniSearchDependencies
}

type ActivePosition = {
  sectionIndex: number
  itemIndex: number
}

export const OmniSearchBar: React.FC<Props> = ({ deps }) => {
  const { t } = useTranslation(["option", "common"])
  const [query, setQuery] = React.useState("")
  const debounced = useDebounce(query, 200)
  const [response, setResponse] = React.useState<OmniSearchResponse | null>(null)
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [active, setActive] = React.useState<ActivePosition | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const listboxId = React.useId()
  const activeId = React.useId()
  const latestRequestId = React.useRef(0)

  const trimmedQuery = debounced.trim()

  const flatResults = React.useMemo(() => {
    if (!response) return [] as Array<{
      sectionIndex: number
      itemIndex: number
      result: OmniSearchResult
    }>
    const items: Array<{
      sectionIndex: number
      itemIndex: number
      result: OmniSearchResult
    }> = []
    response.sections.forEach((section, sectionIndex) => {
      section.results.forEach((result, itemIndex) => {
        items.push({ sectionIndex, itemIndex, result })
      })
    })
    return items
  }, [response])

  const activeFilterLabel = React.useMemo(() => {
    if (!response?.query.filterType) return null
    const map: Record<OmniSearchEntityType, string> = {
      screen: t("option:omniSearch.filterScreen", "Screens"),
      chat: t("option:omniSearch.filterChat", "Chats"),
      media: t("option:omniSearch.filterMedia", "Media"),
      note: t("option:omniSearch.filterNote", "Notes"),
      flashcards: t(
        "option:omniSearch.filterFlashcards",
        "Flashcard Collections"
      ),
      prompt: t("option:omniSearch.filterPrompt", "Prompts")
    }
    return map[response.query.filterType] ?? null
  }, [response, t])

  React.useEffect(() => {
    if (!trimmedQuery) {
      setResponse(null)
      setOpen(false)
      setLoading(false)
      setActive(null)
      return
    }

    const run = async () => {
      const requestId = ++latestRequestId.current
      setLoading(true)
      try {
        const res = await omniSearch(trimmedQuery, deps, {
          limitPerSection: 5,
          flags: { enableTypePrefixes: true }
        })
        if (latestRequestId.current !== requestId) {
          return
        }
        setResponse(res)
        const hasResults = res.sections.some((s) => s.results.length > 0)
        setOpen(hasResults)
        if (hasResults) {
          const firstSectionIndex = res.sections.findIndex(
            (s) => s.results.length > 0
          )
          const firstItemIndex = firstSectionIndex >= 0 ? 0 : -1
          if (firstSectionIndex >= 0 && firstItemIndex >= 0) {
            setActive({ sectionIndex: firstSectionIndex, itemIndex: firstItemIndex })
          } else {
            setActive(null)
          }
        } else {
          setActive(null)
        }
      } catch {
        if (latestRequestId.current === requestId) {
          setResponse(null)
          setOpen(false)
          setActive(null)
        }
      } finally {
        if (latestRequestId.current === requestId) {
          setLoading(false)
        }
      }
    }

    void run()
  }, [deps, trimmedQuery])

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const meta = event.metaKey || event.ctrlKey
      const target = event.target as HTMLElement | null
      const tag = target?.tagName

      if (
        meta &&
        key === "k" &&
        tag !== "INPUT" &&
        tag !== "TEXTAREA" &&
        target?.getAttribute("contenteditable") !== "true"
      ) {
        event.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }

    window.addEventListener("keydown", handler)
    return () => {
      window.removeEventListener("keydown", handler)
    }
  }, [])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (inputRef.current && inputRef.current.contains(target as Node)) return
      const container = document.getElementById(listboxId)
      if (container && container.contains(target)) return
      setOpen(false)
    }

    if (open) {
      window.addEventListener("mousedown", handleClickOutside)
      return () => {
        window.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [open, listboxId])

  const moveActive = (delta: number) => {
    if (!flatResults.length) return
    let currentIndex = 0
    if (active) {
      const idx = flatResults.findIndex(
        (item) =>
          item.sectionIndex === active.sectionIndex &&
          item.itemIndex === active.itemIndex
      )
      currentIndex = idx >= 0 ? idx : 0
    }
    let nextIndex = currentIndex + delta
    if (nextIndex < 0) nextIndex = flatResults.length - 1
    if (nextIndex >= flatResults.length) nextIndex = 0
    const next = flatResults[nextIndex]
    setActive({ sectionIndex: next.sectionIndex, itemIndex: next.itemIndex })
  }

  const invokeNoResultsPrimary = () => {
    if (!response) return
    const q = displayQuery.trim()
    if (!q) return

    if (response.query.filterType === "note") {
      deps.createNoteFromOmni?.(q)
    } else if (response.query.filterType === "flashcards") {
      deps.createFlashcardCollectionFromOmni?.(q)
    } else if (!response.query.filterType) {
      deps.startNewChatFromOmni?.(q)
    }

    setOpen(false)
  }

  const activateCurrent = () => {
    if (!response || !active) return
    const section = response.sections[active.sectionIndex]
    const result = section?.results[active.itemIndex]
    if (!result) return
    result.onSelect()
    setOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      moveActive(1)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      moveActive(-1)
    } else if (event.key === "Enter") {
      if (open) {
        event.preventDefault()
        if (hasResults) {
          activateCurrent()
        } else {
          invokeNoResultsPrimary()
        }
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault()
        setOpen(false)
      }
    }
  }

  const hasResults =
    response && response.sections.some((section) => section.results.length > 0)

  const normalizedQuery = React.useMemo(
    () => trimmedQuery || query.trim(),
    [trimmedQuery, query]
  )

  const displayQuery = React.useMemo(() => {
    if (!response) return normalizedQuery
    const raw = response.query.raw.trim()
    if (!response.query.filterType) return raw || normalizedQuery
    const match = /^(\w+):\s*(.*)$/i.exec(raw)
    if (!match) return raw || normalizedQuery
    return match[2] || normalizedQuery
  }, [normalizedQuery, response])

  return (
    <div className="relative w-full max-w-xl" aria-label="Omni-search">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <SearchIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          onFocus={() => {
            if (hasResults) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={active ? `${activeId}-${active.sectionIndex}-${active.itemIndex}` : undefined}
          placeholder={t(
            "option:header.omniSearchPlaceholder",
            "Search screens, chats, media, notes…"
          )}
          className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-sm text-gray-900 shadow-sm outline-none ring-0 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:border-gray-600 dark:bg-[#111111] dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        {loading && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <span className="h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent" />
          </span>
        )}
      </div>

      {open && response && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-80 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#111111]"
        >
          {activeFilterLabel && (
            <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
              {t("option:omniSearch.filteringBy", "Filtering by:")}{" "}
              {activeFilterLabel}
            </div>
          )}
          {hasResults ? (
            response.sections.map((section, sectionIndex) =>
              section.results.length ? (
                <div key={section.label} className="border-b border-gray-100 last:border-b-0 dark:border-gray-800">
                  <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {section.label}
                  </div>
                  <ul className="py-1">
                    {section.results.map((result, itemIndex) => {
                      const isActive =
                        active?.sectionIndex === sectionIndex &&
                        active.itemIndex === itemIndex
                      const id = `${activeId}-${sectionIndex}-${itemIndex}`
                      return (
                        <li
                          key={result.id}
                          id={id}
                          role="option"
                          aria-selected={isActive}
                          className={`cursor-pointer px-3 py-1.5 text-sm ${
                            isActive
                              ? "bg-amber-50 text-gray-900 dark:bg-amber-500/20 dark:text-gray-50"
                              : "text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-[#1a1a1a]"
                          }`}
                          onMouseDown={(event) => {
                            event.preventDefault()
                            result.onSelect()
                            setOpen(false)
                          }}
                          onMouseEnter={() =>
                            setActive({ sectionIndex, itemIndex })
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-col">
                              <span className="truncate">{result.label}</span>
                              {result.subtitle && (
                                <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                                  {result.subtitle}
                                </span>
                              )}
                            </div>
                            <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                              {section.label}
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null
            )
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              <div>
                {t("option:header.omniSearchNoResults", {
                  defaultValue: 'No matches for "{{query}}".',
                  query: normalizedQuery
                })}
              </div>
              {normalizedQuery && (
                <div className="mt-2 flex flex-col gap-1">
                  {response?.query.filterType === "note" && (
                    <button
                      type="button"
                      className="w-full rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-left text-sm text-gray-700 hover:border-amber-400 hover:bg-amber-50 dark:border-gray-700 dark:text-gray-200 dark:hover:border-amber-500 dark:hover:bg-amber-500/10"
                      onClick={() => {
                        deps.createNoteFromOmni?.(displayQuery)
                        setOpen(false)
                      }}
                    >
                      {t("option:header.omniSearchCreateNote", {
                        defaultValue: 'Create note "{{query}}"',
                        query: displayQuery
                      })}
                    </button>
                  )}
                  {response?.query.filterType === "flashcards" && (
                    <button
                      type="button"
                      className="w-full rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-left text-sm text-gray-700 hover:border-amber-400 hover:bg-amber-50 dark:border-gray-700 dark:text-gray-200 dark:hover:border-amber-500 dark:hover:bg-amber-500/10"
                      onClick={() => {
                        deps.createFlashcardCollectionFromOmni?.(displayQuery)
                        setOpen(false)
                      }}
                    >
                      {t("option:header.omniSearchCreateFlashcards", {
                        defaultValue: 'Create flashcard collection "{{query}}"',
                        query: displayQuery
                      })}
                    </button>
                  )}
                  {!response?.query.filterType && (
                    <button
                      type="button"
                      className="w-full rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-left text-sm text-gray-700 hover:border-amber-400 hover:bg-amber-50 dark:border-gray-700 dark:text-gray-200 dark:hover:border-amber-500 dark:hover:bg-amber-500/10"
                      onClick={() => {
                        deps.startNewChatFromOmni?.(displayQuery)
                        setOpen(false)
                      }}
                    >
                      {t("option:header.omniSearchStartChat", {
                        defaultValue: 'Start new chat "{{query}}"',
                        query: displayQuery
                      })}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default OmniSearchBar
