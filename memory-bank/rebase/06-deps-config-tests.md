# Dependencies, Configs, and Tests Plan

## Dependencies

- Keep our package.json versions
- Add upstream-only deps if referenced in code (e.g., @tailwindcss/forms, rehype-mathjax)
- bun.lock: accept upstream then `bun install` to reconcile

## Configs

- Keep our vitest.config.ts, playwright.config.ts; merge upstream tweaks
- tsconfig: ensure paths cover moved/added files

## Tests

- Import upstream component tests and e2e
- Keep our tests and mocks; align to shared setup
- CI: run `bun run compile`, `bun run test:ci`, `bun run build`
