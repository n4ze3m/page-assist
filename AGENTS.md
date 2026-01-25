# Agent Commands

## Quality Checks
After any changes in typescript files (.ts, .tsx), run "bun run compile" and fix the code compiler errors.
Do not change existing logic or functionality. If there are unit tests - they should pass.
After task is fully complete - run "bun run build", if errors present fix them.

- **Lint**: `bun run lint` (if configured)
- **Typecheck**: `bun run compile` (tsc --noEmit)
- **Test**: `bun run test:ci` and `bun run test:e2e`
- **Build**: `bun run build`

Run these after changes to ensure quality.
