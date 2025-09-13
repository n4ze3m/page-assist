# Extensions That Interfere with Websites

Some extensions (privacy, security, or header‑modifying tools) can interfere with network requests the extension makes to your tldw_server. If you notice pages behaving oddly or API calls failing only when the extension is enabled, try the following:

## Quick checks

- Temporarily disable other network/headers extensions (ad blockers, privacy tools) and test again
- Ensure the extension has site access permission for your server origin (Chromium)
- Verify your server’s CORS policy allows extension fetches

## Still seeing issues on unrelated sites?

If another site breaks only when the extension is enabled, please open an issue with:

- Browser/version
- The URL of the affected site (if shareable)
- A short description of the breakage
- Any relevant console/network errors

This helps us reproduce and adjust our background proxy behavior safely.
