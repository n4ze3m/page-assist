# LLaMA.cpp (via tldw_server)

Configure LLaMA.cpp as a provider in your tldw_server instance. The extension will list models surfaced by the server.

Steps:

1. Configure LLaMA.cpp in tldw_server with its base URL (e.g., `http://localhost:8080/v1`)
2. In the extension, open Options → tldw Server, set Server URL and auth
3. Save and “Test Connection”
4. Choose models from the model selector in the UI

::: info
Ensure your model is loaded and available so tldw_server can surface it via `/api/v1/llm/models`.
:::
