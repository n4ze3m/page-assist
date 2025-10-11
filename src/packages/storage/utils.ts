export const isChromeBelow100 = () => {
  try {
    const ua = globalThis.navigator?.userAgent

    const browserMatch =
      ua.match(
        /(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i
      ) || []

    if (browserMatch[1] === "Chrome") {
      return (
        parseInt(browserMatch[2]) < 100 ||
        globalThis.chrome.runtime?.getManifest()?.manifest_version === 2
      );
    }
  } catch {
    return false
  }

  return false
}
