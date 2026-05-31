# Settings

This page documents every option available on the **Settings** page of Page Assist. To open it, click the extension icon, open the Web UI, and go to **Settings → General Settings** (the gear icon).

The Settings page is organized into the sections described below.

## Web UI Settings

These options control the general behaviour of the chat experience.

| Setting | Description |
| --- | --- |
| **Language** | Changes the display language of Page Assist. |
| **Resume the last chat when opening the SidePanel (Copilot)** | Reopens your most recent SidePanel conversation instead of starting a new one. |
| **Enable Chat with Website by default (Copilot)** | Starts the SidePanel in "Chat with Website" mode automatically. |
| **Resume the last chat when opening the Web UI** | Reopens your most recent Web UI conversation on launch. |
| **Hide the current Chat Model Settings** | Hides the quick model-settings panel inside the chat view. |
| **Restore last used model for previous chats** | Restores the model that was used when you reopen an old chat. |
| **Send Notification After Finishing Processing the Knowledge Base** | Shows a browser notification when knowledge-base indexing completes. |
| **Generate Title using AI** | Automatically generates a chat title from the conversation. |
| **Enable or disable Ollama connection status check** | Toggles the periodic Ollama health check. |
| **Enable wide screen mode** | Uses a wider chat layout, useful for large screens. |
| **Open Reasoning Collapse by default** | Expands the reasoning/thinking block automatically for new messages. |
| **Show Thinking Mode State in Forms** | Displays the thinking-mode state inside model setting forms. |
| **Use Chat Bubble for User Messages** | Renders user messages inside chat bubbles. |
| **Automatically Copy Response to Clipboard** | Copies each AI response to the clipboard as soon as it finishes. |
| **Enable Markdown formatting for User messages** | Renders your own messages as Markdown. |
| **Copy as Formatted Text** | Copies responses as rich/formatted text rather than plain text. |
| **Enable Tab Mentions (@tab)** 🧪 | Lets you reference open browser tabs with `@tab` mentions. |
| **Paste Large Text as File** | Converts large pasted text into an attached file instead of inline text. |
| **Default OCR Language** | The default language used when extracting text from images. |
| **Enable Temporary Chat in SidePanel by default** | Starts SidePanel chats as temporary (not saved) by default. |
| **Enable Temporary Chat in Web UI by default** | Starts Web UI chats as temporary (not saved) by default. |
| **Remove Reasoning Tag from Copied Text** | Strips the reasoning/thinking block when copying a response. |
| **Show the 'Summarize' button on YouTube videos** 🧪 | Adds a summarize button to YouTube video pages (not available on Firefox). |
| **Hide Reasoning Widget from AI Messages** | Hides the reasoning widget from AI responses. |
| **Persist Chat Input (Save unsent messages)** | Keeps unsent text in the input box across sessions. |
| **Enable Message Queue While Streaming** | Lets you queue new messages while a response is still streaming. |
| **Optimize Chat UI for Small Screens** | Adjusts the chat layout for smaller screens. |
| **Enable Text Wrapping in Markdown Tables** | Wraps long cell text in Markdown tables instead of scrolling. |
| **Show 'Show more' for large human messages** | Collapses long user messages behind a "Show more" toggle. |
| **Sidebar Position** | Places the sidebar on the **Left** or **Right**. |
| **Show MCP Servers Toggle in Chat** | Shows the MCP servers toggle in the chat input area. |
| **Use Agent Web Search (model decides when to search and fetch)** | Lets the model decide when to search the web and fetch pages. |
| **Require approval before running MCP tools** | Prompts you to approve each MCP tool call before it runs. |
| **Show Provider Name in Model List** | Displays the provider name next to each model in the model picker. |
| **Default Prompt for SidePanel (Copilot)** | Default system prompt applied to new SidePanel chats. |
| **Default Prompt for Web UI** | Default system prompt applied to new Web UI chats. |
| **Change Theme** | Switches between Light and Dark mode. |

## Manage Web Search

Configure the internet search behaviour. The available fields change depending on the selected search engine.

| Setting | Description |
| --- | --- |
| **Search Engine** | The search provider to use (Google, DuckDuckGo, SearXNG, Brave API, Tavily API, Exa, Firecrawl, Ollama Search, Kagi, Perplexity, and more). |
| **SearXNG URL** | The base URL of your SearXNG instance (shown when SearXNG is selected). |
| **Google Domain** | The Google domain to query (shown when Google is selected). |
| **Brave / Tavily / Exa / Firecrawl / Ollama Search / Kagi / Perplexity API Key** | The API key for the selected API-based provider. |
| **Perform Simple Internet Search** | Uses a faster, lightweight search that skips visiting individual pages. |
| **Total Search Results** | How many search results to retrieve. |
| **Visit the website mentioned in the message** | Fetches and reads URLs that appear directly in your message. |
| **Internet Search ON by default** | Turns on internet search for every new chat automatically. |
| **Domain Filter List** | Only show results from the listed domains. |
| **Blocked Domains** | Exclude results from the listed domains. |

For a full walkthrough of internet search, see [Internet Search](/features/internet-search).

## Speech-to-Text Settings

| Setting | Description |
| --- | --- |
| **Speech Recognition Language** | The language used for voice input/transcription. |
| **Auto Submit Voice Message** | Automatically sends the message when you stop speaking. |
| **Auto Stop Timeout (ms)** | How long to wait (in milliseconds) before automatically stopping recording. |

## Text-to-Speech Settings

| Setting | Description |
| --- | --- |
| **Enable Text-to-Speech** | Turns on reading AI responses out loud. |
| **Auto play voice response after completion** | Plays the spoken response automatically when a message finishes. |
| **Text-to-Speech Provider** | The TTS engine to use: Browser TTS, ElevenLabs, OpenAI TTS, or Mistral TTS. |
| **Text-to-Speech Voice** | The voice used for playback (options depend on the selected provider). |
| **API Key / Base URL / TTS Model** | Connection details for ElevenLabs, OpenAI TTS, or Mistral TTS providers. |
| **Response Splitting** | How responses are split before being spoken: None, Punctuation, or Paragraph. |
| **Enable SSML (Speech Synthesis Markup Language)** | Interprets SSML tags in the response for finer playback control. |
| **Remove Reasoning Tag from TTS** | Skips the reasoning/thinking block when reading a response aloud. |
| **Playback Speed** | The speed at which speech is played back (e.g. `1` for normal). |

## System Settings

| Setting | Description |
| --- | --- |
| **Font Size** 🧪 | Increases or decreases the interface font scale. |
| **Set Default Action for Extension Icon Clicks** 🧪 | Choose whether clicking the toolbar icon opens the **Web UI** or the **SidePanel**. |
| **Set Default action for Context Menu** 🧪 | Choose whether the right-click context menu opens the **Web UI** or the **SidePanel**. |
| **Sync Custom Models, Prompts for Firefox Private Windows** 🧪 | (Firefox only) Syncs custom models and prompts into private/incognito windows. |
| **Enable Browser Storage Sync (Sync settings across devices)** | Syncs your settings across devices using browser storage sync. |
| **Show Web UI Button in Side Panel** | Adds a button to open the Web UI from inside the SidePanel. |
| **Chat Background Image** 🧪 | Upload a custom background image for the chat view. |
| **Export All Data** | Export chat history, knowledge base, prompts, MCP servers, model configs, and settings to a JSON file. You can choose which sections to include. |
| **Import All Data** | Import data from a Page Assist export file (Open WebUI exports are also supported). You can choose which sections to import. |
| **System Reset** | Clears all data. This cannot be undone. |

::: tip
Settings marked with 🧪 are experimental and may change or behave differently across browsers.
:::
