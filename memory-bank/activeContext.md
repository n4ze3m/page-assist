# Active Context: Page Assist

Last updated: 2025-12-21

1) Current Work Focus
- Refactor theming to respect system color scheme via prefers-color-scheme media queries.
- Remove dependency on runtime ".dark" class toggling and localStorage theme override.
- Ensure Tailwind, custom CSS, and Ant Design theming behave consistently across Chrome/Firefox.

2) Recent Changes (this session)
- Tailwind configuration:
  - tailwind.config.js: darkMode switched from "class" to "media".
- Base CSS:
  - src/assets/tailwind.css: replaced .dark-qualified rules with @media (prefers-color-scheme: dark) for scrollbars, shimmer text, table components, etc. (light remains the default styles).
- Theme hook:
  - src/hooks/useDarkmode.tsx: simplified to system-driven mode only (dark|light from matchMedia). No DOM class mutations or localStorage writes. toggleDarkMode retained as a no-op for API compatibility. Initializes from current system preference to avoid FOUC.
- Route wrappers:
  - src/routes/chrome-route.tsx and src/routes/firefox-route.tsx: removed injecting "dark"/"light" classes; wrappers now only apply the "arimo" font class.
- Settings UI:
  - Options: src/components/Option/Settings/general-settings.tsx — removed manual toggle button; shows read-only "System: Dark/Light".
  - Sidepanel: src/components/Sidepanel/Settings/body.tsx — removed manual toggle button; shows read-only "System: Dark/Light".

3) Next Steps (short-term)
- Validate theming manually across OS/browser themes (Chrome/Firefox):
  - Tailwind dark: utilities, custom CSS (scrollbars/table/shimmer), and Ant Design algorithm changes.
- Scan for any remaining ".dark " usage in CSS/JSX (outside comments) and migrate if found.
- Consider optional future enhancement:
  - Manual override using data-theme + CSS vars layer (without reverting Tailwind to class mode).

4) Active Decisions and Preferences
- Theming:
  - Tailwind darkMode: "media" — system-first; no runtime DOM theme class.
  - Custom CSS uses @media (prefers-color-scheme: dark) for dark-specific rules.
  - useDarkmode hook is information-only (reflects system preference); no side effects on DOM/localStorage.
  - Ant Design theming continues to switch algorithms based on the hook’s mode.
- Privacy-first, local-by-default storage continues unchanged.

5) Learnings & Insights
- Moving to system media queries eliminates theme FOUC risk and simplifies runtime code.
- Ant Design theme switching based on hook mode seamlessly maps to system preference.
- Removing manual toggle reduces UX complexity; if needed later, a data-theme override can be layered without reintroducing Tailwind class mode.

6) Open Questions / To Clarify
- Do we want to reintroduce a user-facing override (data-theme) later?
- Should we expose a developer flag to force theme for screenshots/tests?
- Confirm there are no legacy paths that depended on .dark on the html/body wrapper.

7) Update Triggers
- Any future theme variable/token changes.
- If adding a manual override (data-theme), update Tech and Patterns docs accordingly.
- Prior to release, add a smoke test checklist for theme validation.

Appendix: Reference Pointers
- Config: tailwind.config.js (darkMode: "media"); wxt.config.ts unchanged for theming
- Hook: src/hooks/useDarkmode.tsx (system-only)
- CSS: src/assets/tailwind.css (media queries)
- Routes: src/routes/*-route.tsx (no theme class injection)
- Settings: general-settings.tsx, sidepanel settings body.tsx (read-only system label)
