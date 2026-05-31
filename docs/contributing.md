# Contributing to Page Assist

## Shared Components and Controls

Page Assist uses reusable components for consistency. Key shared components include:

- **ChatInputShell**: Wrapper for chat input fields with consistent styling and behavior.
- **ChatTextarea**: Standardized textarea for chat inputs with dynamic sizing.
- **SettingsLayout**: Layout component for settings pages with tabbed navigation.

When adding new UI elements, reuse these components to maintain design consistency.

## Tailwind CSS Conventions

- Use `.pa-*` prefixed classes for custom utilities (e.g., `.pa-border` for consistent borders).
- Follow BEM-like naming for component-specific classes.
- Prefer utility classes over custom CSS; add to `tailwind.config.js` if needed.
- Ensure responsive design with `sm:`, `md:`, `lg:` prefixes.

## Code Style

- Use TypeScript for all new code.
- Follow ESLint and Prettier configurations.
- Export components as default from their files.
- Use barrel exports in `index.ts` files for clean imports.

## Testing

- Write unit tests for services and hooks.
- Add E2E tests for UI interactions using Playwright.
- Aim for >85% coverage; focus on critical paths.

## Building and Running

- `bun run dev` for development.
- `bun run build:chrome` / `bun run build:firefox` for builds.
- `bun run test:ci` for tests with coverage.
