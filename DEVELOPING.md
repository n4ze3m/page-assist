# Developing the tldw Assistant Extension

This document is for contributors working on the browser extension codebase.

## Prerequisites
- **OS**: macOS 13+, Linux, or Windows 11 (WSL2 recommended for Linux tooling).
- **Node.js**: 20.x LTS (>= 20.10). Check with `node -v`. Install via nvm from https://nodejs.org and https://github.com/nvm-sh/nvm.
- **Bun**: >= 1.0 (used for dev/build scripts). Check with `bun -v`. Install from https://bun.sh.
- **npm**: >= 10 (bundled with recent Node). Check with `npm -v`. If you prefer pnpm or yarn, keep them up to date but follow the existing lockfile.
- **Git**: >= 2.40. Check with `git --version`. Install from https://git-scm.com/downloads.
- **Browsers**: Current Chrome, Firefox, and Edge for extension development and manual testing.
- **Optional**: Playwright browsers via `npx playwright install chromium` if you plan to run e2e tests.

## Install & Build
- Install dependencies (respects `package-lock.json`):
  - `npm install`
- Common scripts:
  - Dev (Chrome): `bun dev` or `npm run dev`
  - Dev (Firefox): `bun run dev:firefox`
  - Dev (Edge): `bun run dev:edge`
  - Type-check: `bun run compile`
  - Build all: `bun run build`
  - Zip bundles: `bun run zip`
  - Docs: `bun run docs:dev`, `docs:build`, `docs:preview`

WXT outputs unpacked bundles under `.output/<browser>-mv3/` which you can load as extensions in your browser.

## Configuring tldw_server for Development

- The extension talks to a tldw_server instance; by default it points at:
  - `http://127.0.0.1:8000`
- You can change the server URL from:
  - Options → Settings → tldw server.

### API key via environment variables

For easier local dev and CI, you can provide the tldw_server API key via Vite/WXT env:

- Supported env vars:
  - `VITE_TLDW_API_KEY`
  - `VITE_TLDW_DEFAULT_API_KEY` (fallback name)
- How it works:
  - On startup, the extension reads these env vars and, if `tldwConfig.apiKey` is missing, seeds the API key from the env value.
  - The key is stored in extension local storage (`tldwConfig`) so both the UI and background proxies use it.
  - A user-entered key in Settings always wins over env; env will not overwrite an existing saved key.
- Example `.env.local`:
  ```bash
  VITE_TLDW_API_KEY=your-local-dev-api-key
  ```

### Security & placeholder keys

- Keys containing `REPLACE-ME` are treated as **placeholder/demo** values.
  - In development builds they are allowed but emit console warnings and are intended only for local demos.
  - In production builds they are rejected: API calls will fail with clear errors instructing the user to set a real key under Settings → tldw server.
- Never commit real API keys to the repository or `.env` files that might be checked in.

## Running Tests

- e2e tests (Playwright):
  - List tests: `npm run test:e2e -- --list`
  - Run a specific spec: `npm run test:e2e -- tests/e2e/serverConnectionCard.spec.ts`
- Type-checks:
  - `bun run compile`

Note: some e2e specs build the extension before running tests. Make sure your local Node/Bun/WXT versions satisfy the prerequisites above.

## Contribution Notes

- Follow the coding guidelines in `AGENTS.md` (TypeScript, 2-space indent, TailwindCSS for styles).
- Use conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- When introducing new user-visible configuration that touches auth, document it clearly (Settings copy + docs) and avoid hard-coding secrets.

