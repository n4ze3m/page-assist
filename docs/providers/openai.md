# OpenAI Compatible API (via tldw_server)

tldw Assistant now connects exclusively to your tldw_server instance. Providers like OpenAI, LLaMA.cpp, and others are configured on the server. The extension fetches available models from `/api/v1/llm/models` exposed by your server.

## How to use

1. Configure your providers and API keys in tldw_server (see its documentation)
2. In the extension, open Options → tldw Server and set the Server URL and authentication
3. Save, then click “Test Connection”
4. The model picker in the UI will list models from your server

::: info
If your server exposes model metadata, the extension will surface provider names and capabilities. Otherwise, it shows flat model IDs.
:::
