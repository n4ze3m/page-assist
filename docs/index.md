# Welcome to tldw Assistant

tldw Assistant is a browser extension frontend for tldw_server — your unified AI assistant. Use a side panel or full web UI to chat with models configured on your server, run RAG search with citations, ingest/process media, and access STT/TTS features.

## What is tldw_server integration?

Instead of connecting directly to providers, the extension talks to your tldw_server instance, which aggregates multiple LLM providers behind a single API. You manage providers and models on the server; the extension fetches models via the server and handles chat, RAG, and media flows through it.

## Getting Started

1. Build or load the extension (see project README)
2. Open Options → tldw Server
3. Enter your Server URL (e.g., http://localhost:8000)
4. Choose authentication mode (API key or login) and save
5. Click “Test Connection” to verify

Once connected, open the side panel or web UI and start chatting.

## Privacy

Check out our [Privacy Policy](/privacy) to understand how we handle your data.

## Contributing

We welcome issues and pull requests. See the repository README for build, style, and contribution guidelines.

## Acknowledgements

This project was refactored from the original Page Assist extension and would not exist without that work and community.
