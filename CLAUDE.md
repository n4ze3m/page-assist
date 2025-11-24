# Repository Guidelines

## Prerequisites
- OS: macOS 13+, Linux, or Windows 11 (WSL2 recommended for Linux tooling).
- Node.js: 20.x LTS (>= 20.10). Check with `node -v`. Install via nvm: see https://nodejs.org and https://github.com/nvm-sh/nvm.
- Bun: >= 1.0 (used for dev/build scripts). Check with `bun -v`. Install from https://bun.sh.
- npm: >= 10 (bundled with recent Node). Check with `npm -v`. If using other package managers (pnpm/yarn), keep them up to date.
- Git: >= 2.40. Check with `git --version`. Install from https://git-scm.com/downloads.
- Browsers: Current Chrome, Firefox, and Edge for extension dev/testing (load unpacked builds from `.output/<browser>-mv3/`).
- Optional CLIs: Playwright browsers via `npx playwright install chromium` for e2e tests; see https://playwright.dev/docs/intro.

## Project Structure & Module Organization
- `src/`: Extension source (TypeScript/React).
  - `entries-firefox/`: background, content, sidepanel, options entries.
  - `components/`, `hooks/`, `routes/`, `services/`, `utils/`: feature code.
  - `assets/`: icons, styles (`tailwind.css`), fonts, locales.
- `src/public/_locales/`: Chrome i18n message files.
- `docs/`: VitePress documentation.
- `wxt.config.ts`: WXT build config; `tailwind.config.js`: Tailwind setup.

## Build, Test, and Development Commands
- Dev (Chrome): `bun dev` or `npm run dev` — WXT dev server for Chrome.
- Dev (Firefox): `bun run dev:firefox` — Firefox target with live reload.
- Dev (Edge): `bun run dev:edge` — Edge target with live reload.
- Type-check: `bun run compile` — TypeScript `--noEmit` check.
- Build all: `bun run build` (or `build:chrome|firefox|edge`).
- Zip: `bun run zip` (or `zip:firefox`) to produce release archives.
- Docs: `bun run docs:dev|build|preview` for VitePress docs.
Tip: WXT outputs to `.output/<browser>-mv3/` for loading as an unpacked extension.

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts`/`.tsx`), 2‑space indent.
- Components: PascalCase files in `src/components` (e.g., `ModelSelect.tsx`).
- Hooks: `useXxx.ts(x)` in `src/hooks` (e.g., `useDarkmode.tsx`).
- Utilities/Services: kebab-case in `src/utils`/`src/services` (e.g., `humanize-milliseconds.ts`).
- Imports: Prettier 3 + `@plasmohq/prettier-plugin-sort-imports`. Run: `bunx prettier --write .`.
- Styles: TailwindCSS; prefer utility classes over ad-hoc CSS.

## Testing Guidelines
- No formal test suite yet; use manual smoke tests.
- Verify: options pages, sidepanel flows, keyboard shortcuts, OCR/TTS, and provider integrations across Chrome/Firefox/Edge.
- Run type checks before PR: `bun run compile`.

## Commit & Pull Request Guidelines
- Commits: conventional prefixes (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`). Use imperative mood and keep concise.
- PRs must include: clear description, linked issues, screenshots/GIFs for UI changes, steps to test, and doc updates under `docs/` if applicable.
- Internationalization: when adding text, update relevant files in `src/assets/locale/*` and `_locales/*` as needed.

## Security & Configuration Tips
- Do not hard-code API keys/tokens; configure providers via Options pages and extension storage. Avoid committing secrets.

