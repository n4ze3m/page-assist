/**
 * Copyright (c) 2023 Plasmo Corp. <foss@plasmo.com> (https://www.plasmo.com) and contributors
 * Licensed under the MIT license.
 * This module share storage between chrome storage and local storage.
 */
import { useCallback, useEffect, useRef, useState } from "react"

import { BaseStorage, Storage, type StorageCallbackMap } from "./index"

type Setter<T> = ((v?: T, isHydrated?: boolean) => T) | T

/**
 * isPublic: If true, the value will be synced with web API Storage
 */
export type RawKey =
  | string
  | {
      key: string
      instance: BaseStorage
    }

/**
 * https://docs.plasmo.com/framework/storage
 * @param onInit  If it is a function, the returned value will be rendered and persisted. If it is a static value, it will only be rendered, not persisted
 * @returns
 */
export const useStorage = <T = any>(rawKey: RawKey, onInit?: Setter<T>) => {
  const isObjectKey = typeof rawKey === "object"

  const key = isObjectKey ? rawKey.key : rawKey

  // Render state
  const [renderValue, setRenderValue] = useState<T>(onInit)

  // Use to ensure we don't set render state after unmounted
  const isMounted = useRef(false)

  // Ref that stores the render state, in order to minimize dependencies of callbacks below
  const renderValueRef = useRef(onInit instanceof Function ? onInit() : onInit)
  useEffect(() => {
    renderValueRef.current = renderValue
  }, [renderValue])

  // Storage state
  const storageRef = useRef(isObjectKey ? rawKey.instance : new Storage())

  // Save the value OR current rendering value into chrome storage
  const setStoreValue = useCallback(
    (v?: T) =>
      storageRef.current.set(key, v !== undefined ? v : renderValueRef.current),
    [key]
  )

  // Store the value into chrome storage, then set its render state
  const persistValue = useCallback(
    async (setter: Setter<T>) => {
      const newValue =
        setter instanceof Function ? setter(renderValueRef.current) : setter

      await setStoreValue(newValue)

      if (isMounted.current) {
        setRenderValue(newValue)
      }
    },
    [setStoreValue]
  )

  useEffect(() => {
    isMounted.current = true
    const watchConfig: StorageCallbackMap = {
      [key]: (change) => {
        if (isMounted.current) {
          setRenderValue(change.newValue)
        }
      }
    }

    storageRef.current.watch(watchConfig)

    storageRef.current.get<T>(key)?.then((v) => {
      if (onInit instanceof Function) {
        const initValue = onInit?.(v, true)
        if (initValue !== undefined) {
          persistValue(initValue)
        }
      } else {
        setRenderValue(v !== undefined ? v : onInit)
      }
    })

    return () => {
      isMounted.current = false
      storageRef.current.unwatch(watchConfig)
      if (onInit instanceof Function) {
        setRenderValue(onInit)
      }
    }
  }, [key, persistValue])

  const remove = useCallback(() => {
    storageRef.current.remove(key)
    setRenderValue(undefined)
  }, [key])

  return [
    renderValue,
    persistValue,
    {
      setRenderValue,
      setStoreValue,
      remove
    }
  ] as const
}
