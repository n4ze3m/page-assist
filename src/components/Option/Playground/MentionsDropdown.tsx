import React from "react"
import { TabInfo, MentionPosition } from "~/hooks/useTabMentions"
import { Globe, X } from "lucide-react"

interface MentionsDropdownProps {
  show: boolean
  tabs: TabInfo[]
  mentionPosition: MentionPosition | null
  onSelectTab: (tab: TabInfo) => void
  onClose: () => void
  textareaRef: React.RefObject<HTMLTextAreaElement>
}

export const MentionsDropdown: React.FC<MentionsDropdownProps> = ({
  show,
  tabs,
  mentionPosition,
  onSelectTab,
  onClose,
  textareaRef
}) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [tabs])

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

  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  React.useEffect(() => {
    if (show && mentionPosition && textareaRef.current) {
      const textarea = textareaRef.current
      const rect = textarea.getBoundingClientRect()

      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")
      if (context) {
        const style = window.getComputedStyle(textarea)
        context.font = `${style.fontSize} ${style.fontFamily}`

        const textBeforeMention = textarea.value.substring(
          0,
          mentionPosition.start
        )
        const lines = textBeforeMention.split("\n")
        const currentLine = lines[lines.length - 1]

        const textWidth = context.measureText(currentLine).width

        setPosition({
          left: Math.min(textWidth + 8, rect.width - 200),
          top: -(Math.max(tabs.length, 1) * 55)
        })
      }
    }
  }, [show, mentionPosition, textareaRef])

  if (!show || tabs.length === 0) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 bg-neutral-50 dark:bg-[#2D2D2D] border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-y-auto w-80"
      style={{
        top: position.top
      }}>
      <div className="p-2 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-100">
          Select Tab
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-100">
          <X className="h-4 w-4" />
        </button>
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
          No tabs found matching "{mentionPosition.query}"
        </div>
      )}
    </div>
  )
}
