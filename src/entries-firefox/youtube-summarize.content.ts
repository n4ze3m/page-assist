export default defineContentScript({
  async main(ctx) {
    // Check if YouTube summarization is enabled
    const checkEnabled = async () => {
      try {
        const response = (await browser.runtime.sendMessage({
          type: "check_youtube_summarize_enabled"
        })) as { enabled?: boolean }
        return !!response?.enabled
      } catch (error) {
        console.error("Failed to check YouTube summarize setting:", error)
        return false
      }
    }

    const summarizeIconSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: inherit; width: 100%; height: 100%;">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
      </svg>
    `

    const createSummarizeButton = (): HTMLElement => {
      const buttonContainer = document.createElement("yt-button-view-model")
      buttonContainer.className =
        "ytd-menu-renderer pageassist-youtube-summarize-container"

      buttonContainer.innerHTML = `
        <button-view-model class="ytSpecButtonViewModelHost style-scope ytd-menu-renderer">
          <button class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading yt-spec-button-shape-next--enable-backdrop-filter-experiment pageassist-youtube-summarize"
                  title="Summarize with Page Assist"
                  aria-label="Summarize with Page Assist"
                  aria-disabled="false"
                  style="">
            <div aria-hidden="true" class="yt-spec-button-shape-next__icon">
              <span class="ytIconWrapperHost" style="width: 24px; height: 24px;">
                <span class="yt-icon-shape ytSpecIconShapeHost">
                  <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
                    ${summarizeIconSVG}
                  </div>
                </span>
              </span>
            </div>
            <div class="yt-spec-button-shape-next__button-text-content">Summarize</div>
            <yt-touch-feedback-shape aria-hidden="true" class="yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--touch-response">
              <div class="yt-spec-touch-feedback-shape__stroke"></div>
              <div class="yt-spec-touch-feedback-shape__fill"></div>
            </yt-touch-feedback-shape>
          </button>
        </button-view-model>
      `

      const button = buttonContainer.querySelector("button")
      button?.addEventListener("click", async () => {
        // Get video title for context
        const videoTitle =
          document
            .querySelector("h1.ytd-video-primary-info-renderer")
            ?.textContent?.trim() ||
          document
            .querySelector("h1 yt-formatted-string")
            ?.textContent?.trim() ||
          document.title.replace(" - YouTube", "")

        // Open sidebar and send summarize message
        await browser.runtime.sendMessage({
          type: "youtube_summarize",
          videoTitle,
          videoUrl: window.location.href
        })
      })

      return buttonContainer
    }

    const injectSummarizeButton = async () => {
      // Check if feature is enabled first
      const isEnabled = await checkEnabled()
      if (!isEnabled) {
        return
      }

      // Target the top-level buttons container
      const topLevelButtons = document.querySelector(
        "#top-level-buttons-computed"
      )

      if (
        topLevelButtons &&
        !document.querySelector(".pageassist-youtube-summarize-container")
      ) {
        const button = createSummarizeButton()

        // Try multiple insertion strategies for better compatibility
        // Strategy 1: Insert after like/dislike button (new UI)
        const likeDislikeButton = topLevelButtons.querySelector(
          "segmented-like-dislike-button-view-model"
        )

        // Strategy 2: Insert after share button as fallback
        const shareButton = topLevelButtons.querySelector(
          "yt-button-view-model"
        )

        if (likeDislikeButton) {
          // Insert after like/dislike button
          if (likeDislikeButton.nextSibling) {
            topLevelButtons.insertBefore(button, likeDislikeButton.nextSibling)
          } else {
            topLevelButtons.appendChild(button)
          }
        } else if (shareButton) {
          // Fallback: insert after share button
          if (shareButton.nextSibling) {
            topLevelButtons.insertBefore(button, shareButton.nextSibling)
          } else {
            topLevelButtons.appendChild(button)
          }
        } else {
          // Last resort: just append to the container
          topLevelButtons.appendChild(button)
        }
      }
    }

    const removeSummarizeButton = () => {
      const button = document.querySelector(
        ".pageassist-youtube-summarize-container"
      )
      if (button) {
        button.remove()
      }
    }

    // Listen for storage changes from background
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "youtube_summarize_setting_changed") {
        if (message.enabled) {
          injectSummarizeButton()
        } else {
          removeSummarizeButton()
        }
      }
    })

    // Observer to detect when top-level buttons are loaded
    const observer = new MutationObserver(() => {
      const topLevelButtons = document.querySelector("#top-level-buttons-computed")
      const existingButton = document.querySelector(".pageassist-youtube-summarize-container")

      // Inject button if container exists but button doesn't
      if (topLevelButtons && !existingButton) {
        injectSummarizeButton()
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    // Multiple injection attempts with different timings for better reliability
    // Immediate attempt
    injectSummarizeButton()

    // Short delay for quick page loads
    setTimeout(() => {
      injectSummarizeButton()
    }, 500)

    // Longer delay for slower connections
    setTimeout(() => {
      injectSummarizeButton()
    }, 2000)

    // Handle YouTube's SPA navigation
    let lastUrl = location.href
    new MutationObserver(() => {
      const url = location.href
      if (url !== lastUrl) {
        lastUrl = url
        // Remove old button and re-inject on navigation
        removeSummarizeButton()
        setTimeout(() => {
          injectSummarizeButton()
        }, 1000)
      }
    }).observe(document.body, { childList: true, subtree: true })
  },
  matches: ["*://www.youtube.com/watch*"],
  runAt: "document_end"
})
