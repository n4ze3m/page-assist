export default defineContentScript({
  // Do not register in manifest; we'll inject on demand from background
  registration: "runtime",
  // Matches are required by WXT even if we inject by file path
  matches: ["<all_urls>"],
  async main() {
    // Load the actual TTS logic which sets up message listeners
    await import("./content/tts")
  }
})
