import React from "react"
import { TabInfo, MentionPosition } from "~/hooks/useTabMentions"
import { Globe, X, RefreshCw } from "lucide-react"

interface MentionsDropdownProps {
  show: boolean
  tabs: TabInfo[]
  mentionPosition: MentionPosition | null
  onSelectTab: (tab: TabInfo) => void
  onClose: () => void
  textareaRef: React.RefObject<HTMLTextAreaElement>
  refetchTabs: () => Promise<void>
  onMentionsOpen: () => Promise<void>
}

export const MentionsDropdown: React.FC<MentionsDropdownProps> = ({
  show,
  tabs,
  mentionPosition,
  onSelectTab,
  onClose,
  textareaRef,
  refetchTabs,
  onMentionsOpen
}) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [tabs])

  React.useEffect(() => {
    if (show && textareaRef.current && dropdownRef.current) {
      const textareaRect = textareaRef.current.getBoundingClientRect()
      const dropdownHeight = dropdownRef.current.offsetHeight || 320 
      
      setPosition({
        top: -dropdownHeight - 8, 
        left: 0
      })
    }
  }, [show, tabs])

  React.useEffect(() => {
    if (show) {
      onMentionsOpen()
    }
  }, [show, onMentionsOpen])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!show) return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % tabs.length)
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + tabs.length) % tabs.length)
          break
        case "Enter":
          e.preventDefault()
          if (tabs[selectedIndex]) {
            onSelectTab(tabs[selectedIndex])
          }
          break
        case "Escape":
          e.preventDefault()
          onClose()
          break
      }
    }

    if (show) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [show, tabs, selectedIndex, onSelectTab, onClose])

  const handleRefreshTabs = async () => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    try {
      await refetchTabs()
    } catch (error) {
      console.error("Failed to refresh tabs:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!show || tabs.length === 0) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 bg-neutral-50 dark:bg-[#2a2a2a] border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-y-auto w-80"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="p-2 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-100">
          Select Tab
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshTabs}
            disabled={isRefreshing}
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh tabs (Ctrl+R)">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab)}
            className={`w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-3 transition-colors ${
              index === selectedIndex
                ? "bg-gray-100 dark:bg-gray-600 border-r-2 border-blue-500"
                : ""
            }`}>
            <div className="flex-shrink-0">
              {tab.favIconUrl ? (
                <img
                  src={tab.favIconUrl}
                  alt=""
                  className="w-4 h-4 rounded"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                    target.nextElementSibling?.classList.remove("hidden")
                  }}
                />
              ) : null}
              <Globe
                className={`w-4 h-4 text-gray-400 ${tab.favIconUrl ? "hidden" : ""}`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {tab.title}
              </div>
            </div>
          </button>
        ))}
      </div>

      {tabs.length === 0 && mentionPosition?.query && (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>No tabs found matching "{mentionPosition.query}"</p>
          <button
            onClick={handleRefreshTabs}
            disabled={isRefreshing}
            className="mt-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50">
            {isRefreshing ? "Refreshing..." : "Refresh tabs"}
          </button>
        </div>
      )}
    </div>
  )
}
