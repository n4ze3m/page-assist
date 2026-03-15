import { injectOllamaPullButtons } from "@/utils/ollama-pull-inject"

export default defineContentScript({
  main(ctx) {
    const sendMessage = async (modelName: string) => {
      await browser.runtime.sendMessage({
        type: "pull_model",
        modelName
      })
    }

    injectOllamaPullButtons(sendMessage)
  },
  allFrames: true,
  matches: ["*://ollama.com/*"],

})