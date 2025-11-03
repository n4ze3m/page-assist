# Connection Issues

If the extension can’t reach your tldw_server, try these steps.

## 1) Verify settings

1. Open Options → tldw Server
2. Confirm Server URL (no trailing slash needed)
3. Select the correct auth mode (API key or login)
4. Click “Save”, then “Test Connection”

## 2) Grant host permission (Chromium)

When saving a new Server URL, Chromium browsers may prompt to grant the extension permission for that origin. Accept the prompt so the background can make authenticated requests and handle streaming.

You can also manage this under `chrome://extensions` → tldw Assistant → “Site access”.

## 3) Check server CORS and HTTPS

- For local development, HTTP is fine (http://127.0.0.1:8000)
- For remote servers, prefer HTTPS
- Ensure your server’s CORS policy allows your extension to fetch if required by your setup

## 4) Disable conflicting extensions

Temporarily disable extensions that block or rewrite network requests (privacy/ad‑blockers, header modifiers) and test again.

## 5) Trailing slash paths

Some endpoints require trailing slashes. The extension uses exact paths per the server API, but mismatches in proxies/CDNs can still redirect to 307/308 and break POST. Ensure your server routes match the documented paths.

If problems persist, please open an issue with your browser/version, server URL pattern, and any console errors.
