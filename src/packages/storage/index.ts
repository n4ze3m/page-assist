import pify from "pify"

import { isChromeBelow100 } from "./utils"

export type StorageWatchEventListener = Parameters<
  typeof chrome.storage.onChanged.addListener
>[0]

export type StorageAreaName = Parameters<StorageWatchEventListener>[1]
export type StorageWatchCallback = (
  change: chrome.storage.StorageChange,
  area: StorageAreaName
) => void

export type StorageCallbackMap = Record<string, StorageWatchCallback>

export type StorageArea = chrome.storage.StorageArea

export type InternalStorage = typeof chrome.storage

export abstract class BaseStorage {
  #extStorageEngine: InternalStorage

  #primaryClient: StorageArea
  get primaryClient() {
    return this.#primaryClient
  }

  #secondaryClient: globalThis.Storage
  get secondaryClient() {
    return this.#secondaryClient
  }

  #area: StorageAreaName
  get area() {
    return this.#area
  }

  get hasWebApi() {
    try {
      return typeof window !== "undefined" && !!window.localStorage
    } catch (error) {
      console.error(error)
      return false
    }
  }

  #watchMap = new Map<
    string,
    {
      callbackSet: Set<StorageWatchCallback>
      listener: StorageWatchEventListener
    }
  >()

  #copiedKeySet: Set<string>
  get copiedKeySet() {
    return this.#copiedKeySet
  }

  /**
   * the key is copied to the webClient
   */
  isCopied = (key: string) =>
    this.hasWebApi && (this.allCopied || this.copiedKeySet.has(key) || import.meta.env.IS_WEB_APP === "true")

  #allCopied = false
  get allCopied() {
    return this.#allCopied
  }

  getExtStorageApi = () => {
    // @ts-ignore
    return globalThis.browser?.storage || globalThis.chrome?.storage
  }

  get hasExtensionApi() {
    try {
      // Fallback to localStorage for web app
      if (import.meta.env.IS_WEB_APP === "true") {
        return false
      }
      return !!this.getExtStorageApi()
    } catch (error) {
      console.error(error)
      return false
    }
  }

  isWatchSupported = () => this.hasExtensionApi

  protected keyNamespace = ""
  isValidKey = (nsKey: string) => nsKey.startsWith(this.keyNamespace)
  getNamespacedKey = (key: string) => `${this.keyNamespace}${key}`
  getUnnamespacedKey = (nsKey: string) => nsKey.slice(this.keyNamespace.length)

  constructor({
    area = "sync" as StorageAreaName,
    allCopied = false,
    copiedKeyList = [] as string[]
  } = {}) {
    this.setCopiedKeySet(copiedKeyList)
    this.#area = area
    this.#allCopied = allCopied

    try {
      if (this.hasWebApi && (allCopied || copiedKeyList.length > 0 || import.meta.env.IS_WEB_APP === "true")) {
        this.#secondaryClient = window.localStorage
      }
    } catch {}

    try {
      if (this.hasExtensionApi) {
        this.#extStorageEngine = this.getExtStorageApi()

        if (isChromeBelow100()) {
          this.#primaryClient = pify(this.#extStorageEngine[this.area], {
            exclude: ["getBytesInUse"],
            errorFirst: false
          })
        } else {
          this.#primaryClient = this.#extStorageEngine[this.area]
        }
      }
    } catch {}
  }

  setCopiedKeySet(keyList: string[]) {
    this.#copiedKeySet = new Set(keyList)
  }

  rawGetAll = () => {
    if (this.#primaryClient) {
      return this.#primaryClient.get()
    }

    // Fallback to localStorage for web app
    if (this.hasWebApi && this.#secondaryClient) {
      const result: Record<string, string> = {}
      for (let i = 0; i < this.#secondaryClient.length; i++) {
        const key = this.#secondaryClient.key(i)
        if (key) {
          result[key] = this.#secondaryClient.getItem(key)
        }
      }
      return Promise.resolve(result)
    }

    return Promise.resolve({})
  }

  getAll = async () => {
    const allData = await this.rawGetAll()
    return Object.entries(allData)
      .filter(([key]) => this.isValidKey(key))
      .reduce(
        (acc, [key, value]) => {
          acc[this.getUnnamespacedKey(key)] = value as string
          return acc
        },
        {} as Record<string, string>
      )
  }

  /**
   * Copy the key/value between extension storage and web storage.
   * @param key if undefined, copy all keys between storages.
   * @returns false if the value is unchanged or it is a secret key.
   */
  copy = async (key?: string) => {
    const syncAll = key === undefined
    if (
      (!syncAll && !this.copiedKeySet.has(key)) ||
      !this.allCopied ||
      !this.hasExtensionApi
    ) {
      return false
    }

    const dataMap = this.allCopied
      ? await this.rawGetAll()
      : await this.#primaryClient.get(
          (syncAll ? [...this.copiedKeySet] : [key]).map(this.getNamespacedKey)
        )

    if (!dataMap) {
      return false
    }

    let changed = false

    for (const pKey in dataMap) {
      const value = dataMap[pKey] as string
      const previousValue = this.#secondaryClient?.getItem(pKey)
      this.#secondaryClient?.setItem(pKey, value)
      changed ||= value !== previousValue
    }

    return changed
  }

  protected rawGet = async (key: string): Promise<string> => {
    if (this.hasExtensionApi) {
      const dataMap = await this.#primaryClient.get(key)

      return dataMap[key]
    }

    // If chrome storage is not available, use localStorage
    // TODO: TRY asking for storage permission and retry?
    if (this.isCopied(key)) {
      return this.#secondaryClient?.getItem(key)
    }

    return null
  }

  protected rawSet = async (key: string, value: string) => {
    // If not a secret, we set it in localstorage as well
    if (this.isCopied(key)) {
      this.#secondaryClient?.setItem(key, value)
    }

    if (this.hasExtensionApi) {
      await this.#primaryClient.set({ [key]: value })
    }

    return null
  }

  /**
   * @param includeCopies Also cleanup copied data from secondary storage
   */
  clear = async (includeCopies = false) => {
    if (includeCopies) {
      this.#secondaryClient?.clear()
    }

    await this.#primaryClient.clear()
  }

  protected rawRemove = async (key: string) => {
    if (this.isCopied(key)) {
      this.#secondaryClient?.removeItem(key)
    }

    if (this.hasExtensionApi) {
      await this.#primaryClient.remove(key)
    }
  }

  removeAll = async () => {
    // Using rawGetAll to retrieve all keys with namespace
    const allData = await this.rawGetAll()
    const keyList = Object.keys(allData)

    await Promise.all(keyList.map(this.rawRemove))
  }

  watch = (callbackMap: StorageCallbackMap) => {
    const canWatch = this.isWatchSupported()
    if (canWatch) {
      this.#addListener(callbackMap)
    }
    return canWatch
  }

  #addListener = (callbackMap: StorageCallbackMap) => {
    for (const cbKey in callbackMap) {
      const nsKey = this.getNamespacedKey(cbKey)
      const callbackSet = this.#watchMap.get(nsKey)?.callbackSet || new Set()
      callbackSet.add(callbackMap[cbKey])

      if (callbackSet.size > 1) {
        continue;
      }

      const chromeStorageListener = (
        changes: {
          [key: string]: chrome.storage.StorageChange
        },
        areaName: StorageAreaName
      ) => {
        if (areaName !== this.area || !changes[nsKey]) {
          return
        }

        const storageComms = this.#watchMap.get(nsKey)
        Promise.all([
          this.parseValue(changes[nsKey].newValue),
          this.parseValue(changes[nsKey].oldValue)
        ]).then(([newValue, oldValue]) => {
          for (const cb of storageComms.callbackSet) {
            cb({ newValue, oldValue }, areaName)
          }
        })
      }

      this.#extStorageEngine.onChanged.addListener(chromeStorageListener)

      this.#watchMap.set(nsKey, {
        callbackSet,
        listener: chromeStorageListener
      })
    }
  }

  unwatch = (callbackMap: StorageCallbackMap) => {
    const canWatch = this.isWatchSupported()
    if (canWatch) {
      this.#removeListener(callbackMap)
    }
    return canWatch
  }

  #removeListener(callbackMap: StorageCallbackMap) {
    for (const cbKey in callbackMap) {
      const nsKey = this.getNamespacedKey(cbKey)
      const callback = callbackMap[cbKey]
      if (this.#watchMap.has(nsKey)) {
        const storageComms = this.#watchMap.get(nsKey)
        storageComms.callbackSet.delete(callback)

        if (storageComms.callbackSet.size === 0) {
          this.#watchMap.delete(nsKey)
          this.#extStorageEngine.onChanged.removeListener(storageComms.listener)
        }
      }
    }
  }

  unwatchAll = () => this.#removeAllListener()

  #removeAllListener() {
    this.#watchMap.forEach(({ listener }) =>
      this.#extStorageEngine.onChanged.removeListener(listener)
    )

    this.#watchMap.clear()
  }

  /**
   * Get value from either local storage or chrome storage.
   */
  abstract get: <T = string>(key: string) => Promise<T>

  /**
   * Set the value. If it is a secret, it will only be set in extension storage.
   * Returns a warning if storage capacity is almost full.
   * Throws error if the new item will make storage full
   */
  abstract set: (key: string, rawValue: any) => Promise<string>

  abstract remove: (key: string) => Promise<void>

  /**
   * Parse the value into its original form from storage raw value.
   */
  protected abstract parseValue: (rawValue: any) => Promise<any>

  /**
   * Alias for get
   */
  async getItem<T = string>(key: string) {
    return this.get<T>(key)
  }

  /**
   * Alias for set, but returns void instead
   */
  async setItem(key: string, rawValue: any) {
    await this.set(key, rawValue)
  }

  /**
   * Alias for remove
   */
  async removeItem(key: string) {
    return this.remove(key)
  }
}

export type StorageOptions = ConstructorParameters<typeof BaseStorage>[0]

/**
 * https://docs.plasmo.com/framework/storage
 */
export class Storage extends BaseStorage {
  get = async <T = string>(key: string) => {
    const nsKey = this.getNamespacedKey(key)
    const rawValue = await this.rawGet(nsKey)
    return this.parseValue(rawValue) as T
  }

  set = async (key: string, rawValue: any) => {
    const nsKey = this.getNamespacedKey(key)
    const value = JSON.stringify(rawValue)
    return this.rawSet(nsKey, value)
  }

  remove = async (key: string) => {
    const nsKey = this.getNamespacedKey(key)
    return this.rawRemove(nsKey)
  }

  setNamespace = (namespace: string) => {
    this.keyNamespace = namespace
  }

  protected parseValue = async (rawValue: any) => {
    if (rawValue === undefined) {
      return undefined
    }

    if (typeof rawValue !== "string") {
      return rawValue
    }

    try {
      return JSON.parse(rawValue)
    } catch (error) {
      console.error(error)
      return rawValue
    }
  }
}
