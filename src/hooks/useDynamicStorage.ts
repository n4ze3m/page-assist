import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"
import { useEffect, useState } from "react"

// Storage instances
const syncStorage = new Storage({ area: "sync" })
const localStorage = new Storage({ area: "local" })
const configStorage = new Storage({ area: "local" })

/**
 * Custom hook that dynamically switches between sync and local storage
 * based on the storageSyncEnabled setting.
 *
 * This hook provides the same interface as useStorage but automatically
 * uses the correct storage area based on user preferences.
 *
 * @param key - The storage key
 * @param defaultValue - The default value if the key doesn't exist
 * @returns A tuple of [value, setValue] similar to useStorage
 */
export function useDynamicStorage<T = any>(
  key: string,
  defaultValue?: T
): [T | undefined, (value: T | undefined) => void, { isLoading: boolean }] {
  // Monitor storageSyncEnabled setting
  const [storageSyncEnabled] = useStorage(
    {
      key: "storageSyncEnabled",
      instance: configStorage
    },
    true
  )

  // Determine which storage to use
  const currentStorage = storageSyncEnabled ? syncStorage : localStorage

  // Use the appropriate storage
  const [syncValue, setSyncValue] = useStorage(
    {
      key,
      instance: syncStorage
    },
    defaultValue
  )

  const [localValue, setLocalValue] = useStorage(
    {
      key,
      instance: localStorage
    },
    defaultValue
  )

  // Return the value from the current storage
  const currentValue = storageSyncEnabled ? syncValue : localValue
  const currentSetter = storageSyncEnabled ? setSyncValue : setLocalValue

  return [currentValue, currentSetter, { isLoading: false }]
}

/**
 * Variant for when you need to specify options (like instance)
 * This is mainly for backwards compatibility with code that specifies instance
 */
export function useDynamicStorageWithOptions<T = any>(
  options: {
    key: string
    instance?: Storage
  },
  defaultValue?: T
): [T | undefined, (value: T | undefined) => void, { isLoading: boolean }] {
  // If an instance is explicitly provided and it's local storage, always use local
  if (options.instance) {
    const [value, setValue] = useStorage(options, defaultValue)
    return [value, setValue, { isLoading: false }]
  }

  // Otherwise use dynamic storage
  return useDynamicStorage(options.key, defaultValue)
}
