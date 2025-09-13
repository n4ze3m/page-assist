import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "tldw Assistant",
  description: "tldw Assistant is an open‑source browser extension frontend for tldw_server, providing a side panel and web UI for chat, RAG, media processing, and more.",
  lastUpdated: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    search: {
      provider: "local",
    },
    // editLink disabled until repository URL is finalized
    // editLink: { pattern: "", text: "Edit this page on GitHub" },
    nav: [
      { text: 'Home', link: '/' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Welcome to tldw Assistant', link: '/' },
          {
            text: "Browser Support",
            link: "/browser-support"
          },
          {
            text: "Keyboard Shortcuts",
            link: "/shortcuts"
          }
        ],
      },
      {
        text: "Sidebar",
        items: [
          {
            text: "Sidebar Settings",
            link: "/sidebar"
          },
          {
            text: "Sidebar Copilot",
            link: "/sidebar/copilot"
          },
          {
            text: "Chat With Website",
            link: "/sidebar/chat-with-website"
          },
          {
            text: "Sidebar Vision (🧪)",
            link: "/sidebar/vision"
          }
        ],
      },
      {
        text: "Features",
        items: [
          {
            text: "Internet Search",
            link: "/features/internet-search"
          },
          {
            text: "Prompts",
            link: "/features/prompts"
          },
          {
            text: "Knowledge Base",
            link: "/features/knowledge-base"
          },
          {
            text: "Page Share",
            link: "/features/page-share"
          },
          {
            text: "Other",
            link: "/features/other"
          }
        ]
      },
      {
        text: "Providers",
        collapsed: true,
        items: [
          {
            text: "tldw_server Setup",
            link: "/tldw-server"
          },
          {
            text: "OpenAI Compatible API",
            link: "/providers/openai"
          }
        ]
      },
      {
        text: "Troubleshooting",
        items: [
          {
            text: "Connection Issues",
            link: "/connection-issue"
          },
          {
            text: "Extensions Causing Issue with Other Websites",
            link: "/extensions-causing-issue-other-websites"
          }
        ]
      }],
    // socialLinks can be added later
    footer: {
      message: "MIT Licensed Open Source Project",
      copyright: "Copyright © 2025 tldw Assistant Contributors",
    },
  },
  ignoreDeadLinks: true
})
