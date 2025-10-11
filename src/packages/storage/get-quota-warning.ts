import type { BaseStorage } from "./index"

// https://stackoverflow.com/a/23329386/3151192
function byteLengthCharCode(str: string) {
  // returns the byte length of an utf8 string
  let s = str.length
  for (var i = str.length - 1; i >= 0; i--) {
    const code = str.charCodeAt(i)
    if (code > 0x7f && code <= 0x7ff) s++
    else if (code > 0x7ff && code <= 0xffff) s += 2
    if (code >= 0xdc00 && code <= 0xdfff) i-- //trail surrogate
  }
  return s
}

export const getQuotaWarning = async (
  storage: BaseStorage,
  key: string,
  value: string
) => {
  let warning = ""

  // Skip quota check for web app as localStorage has different quota handling
  if (import.meta.env.IS_WEB_APP === "true") {
    return warning
  }

  checkQuota: if (storage.area !== "managed") {
    // Explicit access to the un-polyfilled version is used here
    // as the polyfill might override the non-existent function
    if (!chrome?.storage?.[storage.area].getBytesInUse) {
      break checkQuota
    }

    const client = storage.primaryClient

    // Firefox doesn't support quota bytes so the defined value at
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync#storage_quotas_for_sync_data
    // is used
    const quota: number = client["QUOTA_BYTES"] || 102400

    const newValueByteSize = byteLengthCharCode(value)
    const [byteInUse, oldValueByteSize] = await Promise.all([
      client.getBytesInUse(),
      client.getBytesInUse(key)
    ])

    const newByteInUse = byteInUse + newValueByteSize - oldValueByteSize

    // if used 80% of quota, show warning
    const usedPercentage = newByteInUse / quota
    if (usedPercentage > 0.8) {
      warning = `Storage quota is almost full. ${newByteInUse}/${quota}, ${
        usedPercentage * 100
      }%`
    }

    if (usedPercentage > 1.0) {
      throw new Error(`ABORTED - New value would exceed storage quota.`)
    }
  }

  return warning
}
