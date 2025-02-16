import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Page Assist",
  description: "Page Assist is an open-source Chrome Extension that provides a Sidebar and Web UI for your Local AI model. It allows you to interact with your model from any webpage.",
  lastUpdated: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    search: {
      provider: "local",
    },
    editLink: {
      pattern: "https://github.com/n4ze3m/page-assist/edit/main/docs/:path",
      text: "Edit this page on GitHub"
    },
    nav: [
      { text: 'Home', link: '/' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Welcome to Page Assist', link: '/' },
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
          }
        ],
      },
      {
        text: "Providers",
        items: [
          {
            text: "Ollama",
            link: "/providers/ollama"
          },
          {
            text: "LM Studio",
            link: "/providers/lmstudio"
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
            text: "Ollama Connection Issue",
            link: "/connection-issue"
          }
        ]
      }],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/n4ze3m/page-assist' },
      { icon: 'x', link: 'https://x.com/page_assist' },
      { icon: 'discord', link: 'https://discord.gg/bu54382uBd' },
    ],
    footer: {
      message: "MIT Licensed Open Source Project",
      copyright: "Copyright © 2025 Muhammed Nazeem  & Page Assist Contributors",
    },
  },
})
