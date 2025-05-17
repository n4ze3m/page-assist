import "~/assets/tailwind.css"
import ReactDOM from "react-dom/client"
import SidePanelApp from "./sidepanel/App"

export default defineContentScript({
  async main(ctx) {
    browser.runtime.onMessage.addListener(async (message) => {
      if (message.type === "show-sidebar" && message.from === "background") {
        // Define the UI
        const ui = await createShadowRootUi(ctx, {
          position: "inline",
          anchor: "body",
          append: "first",
          name: "page-assist-sidebar",
          onMount: (container) => {
            const wrapper = document.createElement("div")
            container.append(wrapper)
            wrapper.style.cssText = `
              position: fixed;
              top: 0;
              right: 0;
              width: 400px;
              height: 100vh;
              background: white;
              box-shadow: -2px 0 5px rgba(0,0,0,0.2);
              z-index: 9999;
              transition: transform 0.3s ease;
            `

            const root = ReactDOM.createRoot(wrapper)
            root.render(<SidePanelApp />)
            return { root, wrapper }
          }
        })

        ui.mount()

        return true
      }
    })
  },
  matches: ["*://*/*"]
})
