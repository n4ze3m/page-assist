import React from "react"
import { useStorage } from "@plasmohq/storage/hook"

export interface TabInfo {
  id: number
  title: string
  url: string
  favIconUrl?: string
}

export interface MentionPosition {
  start: number
  end: number
  query: string
}

export const useTabMentions = (textareaRef: React.RefObject<HTMLTextAreaElement>) => {
  const [tabMentionsEnabled] = useStorage("tabMentionsEnabled", false)
  const [showMentions, setShowMentions] = React.useState(false)
  const [mentionPosition, setMentionPosition] = React.useState<MentionPosition | null>(null)
  const [availableTabs, setAvailableTabs] = React.useState<TabInfo[]>([])
  const [filteredTabs, setFilteredTabs] = React.useState<TabInfo[]>([])
  const [selectedDocuments, setSelectedDocuments] = React.useState<TabInfo[]>([])

  const fetchTabs = React.useCallback(async () => {
    try {
      const tabs = await browser.tabs.query({})
      const tabInfos: TabInfo[] = tabs
        .filter(tab => tab.id && tab.title && tab.url)
        .filter(tab => !tab.active)
        .filter(tab => tab?.status === 'complete') 
        .filter(tab => {
          const url = tab.url!.toLowerCase()
          return !url.startsWith('chrome://') &&
            !url.startsWith('edge://') &&
            !url.startsWith('brave://') &&
            !url.startsWith('firefox://') &&
            !url.startsWith('chrome-extension://') &&
            !url.startsWith('moz-extension://')
        })
        .map(tab => ({
          id: tab.id!,
          title: tab.title!,
          url: tab.url!,
          favIconUrl: tab.favIconUrl
        }))
      setAvailableTabs(tabInfos)
      return tabInfos
    } catch (error) {
      console.error("Failed to fetch tabs:", error)
      return []
    }
  }, [])

  const detectMention = React.useCallback((text: string, cursorPosition: number) => {
    if (!tabMentionsEnabled) return null

    // Find the last @ before cursor position
    const beforeCursor = text.substring(0, cursorPosition)
    const lastAtIndex = beforeCursor.lastIndexOf("@")

    if (lastAtIndex === -1) return null

    const charBeforeAt = lastAtIndex > 0 ? beforeCursor[lastAtIndex - 1] : " "
    if (charBeforeAt !== " " && lastAtIndex !== 0) return null

    const afterAt = text.substring(lastAtIndex + 1, cursorPosition)

    if (afterAt.includes(" ")) return null

    return {
      start: lastAtIndex,
      end: cursorPosition,
      query: afterAt.toLowerCase()
    }
  }, [tabMentionsEnabled])

  const handleTextChange = React.useCallback(async (text: string, cursorPosition: number) => {
    if (!tabMentionsEnabled) {
      setShowMentions(false)
      return
    }

    const mention = detectMention(text, cursorPosition)

    if (mention) {
      setMentionPosition(mention)

      let tabs = availableTabs
      if (tabs.length === 0) {
        tabs = await fetchTabs()
      }

      const filtered = tabs.filter(tab =>
        tab.title.toLowerCase().includes(mention.query) ||
        tab.url.toLowerCase().includes(mention.query)
      )

      setFilteredTabs(filtered)
      setShowMentions(true)
    } else {
      setShowMentions(false)
      setMentionPosition(null)
    }
  }, [tabMentionsEnabled, availableTabs, detectMention, fetchTabs])

  // New function to handle when mentions dropdown opens
  const handleMentionsOpen = React.useCallback(async () => {
    if (tabMentionsEnabled && showMentions) {
      // Always fetch fresh tabs when dropdown opens
      await fetchTabs()
    }
  }, [tabMentionsEnabled, showMentions, fetchTabs])

  const insertMention = React.useCallback((tab: TabInfo, currentText: string, setValue: (value: string) => void) => {
    if (!mentionPosition || !textareaRef.current) return

    if (selectedDocuments.find(doc => doc.id === tab.id)) {
      setShowMentions(false)
      setMentionPosition(null)
      return
    }

    setSelectedDocuments(prev => [...prev, tab])

    const before = currentText.substring(0, mentionPosition.start)
    const after = currentText.substring(mentionPosition.end)
    const newText = before + after
    setValue(newText)

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(mentionPosition.start, mentionPosition.start)
      }
    }, 0)

    setShowMentions(false)
    setMentionPosition(null)
  }, [mentionPosition, textareaRef, selectedDocuments])

  const closeMentions = React.useCallback(() => {
    setShowMentions(false)
    setMentionPosition(null)
  }, [])

  const removeDocument = React.useCallback((id: number) => {
    setSelectedDocuments(prev => prev.filter(doc => doc.id !== id))
  }, [])

  const clearSelectedDocuments = React.useCallback(() => {
    setSelectedDocuments([])
  }, [])

  return {
    tabMentionsEnabled,
    showMentions,
    mentionPosition,
    filteredTabs,
    selectedDocuments,
    handleTextChange,
    insertMention,
    closeMentions,
    removeDocument,
    clearSelectedDocuments,
    reloadTabs: fetchTabs,
    handleMentionsOpen  
  }
}
