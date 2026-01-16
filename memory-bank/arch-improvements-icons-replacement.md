# Replace Icons with CSS SVG Library

Last updated: 2026-01-16

## Summary

Replace current React icon components with a CSS SVG icon library that supports dark themes (e.g., Lucide or Heroicons). Improves performance, consistency, and theme support. Medium priority; estimated 1-2 hours.

## Phased Tasks

### 1. Select and Install Library

- **Description**: Research options (Lucide: lightweight SVGs with CSS vars for themes; Heroicons: Tailwind-native). Install via npm (e.g., `npm install lucide-react` or `npm install @heroicons/react`).
- **Est. Time**: 15 minutes
- **Dependencies**: package.json, Tailwind config
- **Verification**: Install succeeds; icons importable in test component.

### 2. Inventory Current Icons

- **Description**: Glob/search for existing React icon components (e.g., in components/, routes/) and list usages (e.g., grep for <IconName />).
- **Est. Time**: 20 minutes
- **Dependencies**: None
- **Verification**: Inventory table of icons to replace.

### 3. Replace Icons

- **Description**: Swap React components for SVG/CSS icons (e.g., <ChevronDown /> → lucide-chevron-down class or inline SVG). Update classNames for Tailwind styling.
- **Est. Time**: 45 minutes
- **Dependencies**: Selected library
- **Verification**: No compile errors; icons render correctly.

### 4. Implement Dark Theme Support

- **Description**: Configure library for dark mode (e.g., CSS vars in Tailwind for color; media queries). Test in light/dark (prefers-color-scheme).
- **Est. Time**: 20 minutes
- **Dependencies**: tailwind.config.js, assets/tailwind.css
- **Verification**: Icons adapt colors in dark mode; no artifacts.

### 5. Cleanup and Testing

- **Description**: Remove old React icon components; lint/typecheck; add simple tests if needed.
- **Est. Time**: 15 minutes
- **Dependencies**: All above
- **Verification**: bun run lint && bun run compile; manual theme toggle check.

## Benefits

- Lighter bundle (no JSX overhead)
- Consistent theming with Tailwind/dark mode
- Easier maintenance and customization

## Risks/Notes

- Ensure library is extension-compatible (no large bundles)
- Test accessibility (e.g., aria-labels on SVGs)
- Fallback to inline SVGs if library issues

## References

- techContext.md: Styling with Tailwind/AntD
- systemPatterns.md: UI conventions
- productContext.md: UX goals (responsiveness, accessibility)

## Status

Pending
