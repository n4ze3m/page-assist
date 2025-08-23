export default defineContentScript({
  registration: "runtime",
  matches: ["<all_urls>"],
  async main() {
    await import("../entries/content/tts")
  }
})
