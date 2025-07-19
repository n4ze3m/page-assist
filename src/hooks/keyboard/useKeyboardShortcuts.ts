import { useEffect, useCallback } from 'react'
import { useShortcutConfig } from './useShortcutConfig'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  preventDefault?: boolean
  stopPropagation?: boolean
}

export interface KeyboardShortcutConfig {
  shortcut: KeyboardShortcut
  action: () => void
  enabled?: boolean
  description?: string
}

/**
 * Hook for managing configurable keyboard shortcuts
 * @param shortcuts Array of keyboard shortcut configurations
 * @param target Target element to attach listeners to (defaults to document)
 */
export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcutConfig[],
  target: Document | HTMLElement | null = document
) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      shortcuts.forEach(({ shortcut, action, enabled = true }) => {
        if (!enabled) return

        const {
          key,
          ctrlKey = false,
          altKey = false,
          shiftKey = false,
          metaKey = false,
          preventDefault = true,
          stopPropagation = true
        } = shortcut

        // Check if the key combination matches
        const keyMatches = event.key.toLowerCase() === key.toLowerCase()
        const ctrlMatches = event.ctrlKey === ctrlKey
        const altMatches = event.altKey === altKey
        const shiftMatches = event.shiftKey === shiftKey
        const metaMatches = event.metaKey === metaKey

        if (keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches) {
          if (preventDefault) {
            event.preventDefault()
          }
          if (stopPropagation) {
            event.stopPropagation()
          }
          action()
        }
      })
    },
    [shortcuts]
  )

  useEffect(() => {
    if (!target) return

    target.addEventListener('keydown', handleKeyDown)

    return () => {
      target.removeEventListener('keydown', handleKeyDown)
    }
  }, [target, handleKeyDown])
}

/**
 * Hook specifically for focus shortcuts in forms
 * @param textareaRef Reference to the textarea element to focus
 * @param enabled Whether the shortcuts are enabled
 */
export const useFocusShortcuts = (
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  enabled: boolean = true
) => {
  const { shortcuts: configuredShortcuts } = useShortcutConfig()

  const focusTextarea = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      // Place cursor at the end of the text
      const textLength = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(textLength, textLength)
    }
  }, [textareaRef])

  const shortcuts: KeyboardShortcutConfig[] = [
    {
      shortcut: configuredShortcuts.focusTextarea,
      action: focusTextarea,
      enabled,
      description: 'Focus textarea'
    }
  ]

  useKeyboardShortcuts(shortcuts)

  return {
    focusTextarea,
    shortcuts
  }
}
