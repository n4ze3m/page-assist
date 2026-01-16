# Enhance Routes and UI Architecture

Last updated: 2026-01-16

## Summary

Group routes/settings; implement ChatInputShell wrappers; enforce styling conventions. Ties to activeContext.md pending UI refactor. High priority; estimated 2 hours.

## Phased Tasks

### 1. Group Settings Routes

- **Description**: Mkdir routes/settings/; move all option-\*.tsx files there.
- **Est. Time**: 20 minutes
- **Dependencies**: None
- **Verification**: ls routes/settings/ shows moved files; no broken imports.

### 2. Create Shared Settings Layout

- **Description**: Build routes/SettingsLayout.tsx with react-router tabs and lazy loading for settings sections.
- **Est. Time**: 40 minutes
- **Dependencies**: routes/option-index.tsx
- **Verification**: Manual navigation between settings tabs works.

### 3. Implement ChatInput Wrappers

- **Description**: Create components/ChatInput/ChatInputShell.tsx and ChatTextarea.tsx to reduce JSX duplication in forms.
- **Est. Time**: 40 minutes
- **Dependencies**: ChatInput controls/parts
- **Verification**: Migrate sidepanel-chat.tsx form; snapshot test passes.

### 4. Enforce Styling Conventions

- **Description**: Add ESLint rule for .pa-\* Tailwind utilities; add data-testid attributes for automation.
- **Est. Time**: 20 minutes
- **Dependencies**: tailwind.css utilities
- **Verification**: Lint passes on routes/; test IDs present.

### 5. Migrate Forms to Wrappers

- **Description**: Update Option/Playground/PlaygroundForm.tsx and Sidepanel/Chat/form.tsx to use new wrappers.
- **Est. Time**: 20 minutes
- **Dependencies**: ChatInputShell/ChatTextarea
- **Verification**: UI parity maintained; no visual regressions.

### 6. Final Verification

- **Description**: Run typecheck and tests; ensure no regressions.
- **Est. Time**: 10 minutes
- **Dependencies**: All above
- **Verification**: bun run compile && bun test succeed.

## Benefits

- Reduces settings files from 12 to 6-8
- Eliminates remaining JSX duplication
- Prepares for E2E automation (per ui-ux-chat-automation-plan.md)

## Risks/Notes

- Preserve form behavior parity during migration
- Ensure all .pa-\* classes are applied consistently
- Test keyboard shortcuts and interactions

## References

- activeContext.md: Pending UI wrappers
- ui-ux-chat-automation-plan.md: Test ID strategy
- productContext.md: UX consistency goals
- systemPatterns.md: UI composition patterns

## Status

Pending
