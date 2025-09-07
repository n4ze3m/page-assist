import { useStorage } from "@plasmohq/storage/hook"
import { KeyboardShortcut } from "./useKeyboardShortcuts"

export interface ShortcutConfig {
  focusTextarea: KeyboardShortcut
  newChat: KeyboardShortcut
  toggleSidebar: KeyboardShortcut
  toggleChatMode: KeyboardShortcut
}

export const defaultShortcuts: ShortcutConfig = {
  focusTextarea: {
    key: 'Escape',
    shiftKey: true,
    preventDefault: true,
    stopPropagation: true
  },
  newChat: {
    key: 'o',
    ctrlKey: true,
    shiftKey: true,
    preventDefault: true,
    stopPropagation: true
  },
  toggleSidebar: {
    key: 'b',
    ctrlKey: true,
    preventDefault: true,
    stopPropagation: true
  },
  toggleChatMode: {
    key: 'e',
    ctrlKey: true,
    preventDefault: true,
    stopPropagation: true
  }
}

/**
 * Hook for managing keyboard shortcut configurations
 * Allows users to customize their keyboard shortcuts
 */
export const useShortcutConfig = () => {
  const [shortcuts, setShortcuts] = useStorage<ShortcutConfig>(
    "keyboardShortcuts",
    defaultShortcuts
  )

  const updateShortcut = (
    shortcutName: keyof ShortcutConfig,
    newShortcut: KeyboardShortcut
  ) => {
    setShortcuts(prev => ({
      ...prev,
      [shortcutName]: newShortcut
    }))
  }

  const resetShortcuts = () => {
    setShortcuts(defaultShortcuts)
  }

  const resetShortcut = (shortcutName: keyof ShortcutConfig) => {
    setShortcuts(prev => ({
      ...prev,
      [shortcutName]: defaultShortcuts[shortcutName]
    }))
  }

  return {
    shortcuts,
    updateShortcut,
    resetShortcuts,
    resetShortcut
  }
}

/**
 * Utility function to format shortcut for display
 */
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = []
  
  if (shortcut.ctrlKey) parts.push('Ctrl')
  if (shortcut.altKey) parts.push('Alt')
  if (shortcut.shiftKey) parts.push('Shift')
  if (shortcut.metaKey) parts.push('⌘')
  
  parts.push(shortcut.key)
  
  return parts.join(' + ')
}
