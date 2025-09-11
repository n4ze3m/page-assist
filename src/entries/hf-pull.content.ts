export default defineContentScript({
  main() {
    const sendToTldw = async () => {
      const url = window.location.href
      await browser.runtime.sendMessage({
        type: 'tldw:request',
        payload: { path: '/api/v1/media/add', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { url } }
      })
      alert('[tldw] Sent page to tldw_server for processing')
    }

    const downloadSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
        <path d="M12 16l-6-6h4V4h4v6h4l-6 6z"/>
        <path d="M4 20h16v-2H4v2z"/>
      </svg>
    `

    const injectButton = () => {
      if (document.querySelector('.tldw-send-button')) return
      const btn = document.createElement('button')
      btn.className = 'tldw-send-button focus:outline-hidden inline-flex cursor-pointer items-center text-sm bg-white shadow-xs rounded-md border px-2 py-1 text-gray-600'
      btn.title = 'Send to tldw_server'
      btn.innerHTML = `${downloadSVG} <span class="ml-1.5">Send to tldw_server</span>`
      btn.style.position = 'fixed'
      btn.style.bottom = '60px'
      btn.style.right = '20px'
      btn.style.zIndex = '2147483647'
      btn.addEventListener('click', sendToTldw)
      document.body.appendChild(btn)
    }

    const observer = new MutationObserver(() => injectButton())
    observer.observe(document.documentElement, { childList: true, subtree: true })
    injectButton()
  },
  allFrames: true,
  matches: ["*://huggingface.co/*"]
})
