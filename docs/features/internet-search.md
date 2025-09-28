# Internet Search

Page Assist supports internet search which can be used with your LLM. It works similarly to ChatGPT's internet search.

## Supported Search Engines

- Google (with region support)
- DuckDuckGo
- Sogou
- Baidu
- Brave
- Searxng
- Brave Search API
- Tavily Search API
- Bing
- Stract
- Startpage
- Exa
- Firecrawl
- Ollama Web search

## How to use Internet Search

Both Sidebar and Web UI support internet search. You can use it by toggling the switch on the right side with the globe icon.

![Internet Search](https://pub-35424b4473484be483c0afa08c69e7da.r2.dev/Screenshot%202025-02-19%20203546.png)

## Update Search Prompt

You can update the search prompt by going to Settings > RAG Settings. Scroll down and you will find the option `Configure RAG Prompt`. Select the `Web` tab and update the prompt.

![Update Search Prompt](https://pub-35424b4473484be483c0afa08c69e7da.r2.dev/Screenshot%202025-02-19%20204314.png)

- `{search_results}` - This will be replaced with search results. (do not remove this)
- `{current_date_time}` - This will be replaced with current date and time.
- `{query}` - This will be replaced with the search query.

## Visit websites from messages

This feature is enabled by default. If you want to disable it, you can do it from the settings.

### How it works?

When you enable internet search and input a webpage URL into the input box and send it, Page Assist will visit the website and extract the text from it. Then it will send the text to the LLM.

## Deep Search Mode

By default, `Perform Simple Internet Search` is enabled. If you want to use Deep Search Mode, you need to disable it.

Deep Search Mode will visit the website and extract the text from it. Then it will send the text to the LLM.

::: warning
The current Deep Search is not similar to ChatGPT's DeepSearch. It is a very basic implementation.
:::


## Enable Internet Search by Default

You can enable Internet Search by default by following these steps:

1. Go to Settings
2. Under the `General Settings` section
3. Scroll down to `Manage Web Search`
4. Enable `Internet Search ON by default`
5. Click on `Save Settings`