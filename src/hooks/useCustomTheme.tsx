import { useEffect } from "react";
import { useStorage } from "@plasmohq/storage/hook";

/**
 * Injects custom CSS (from URL or inline) globally for the entire app, whenever the stored values change.
 * Should be called once in the root App component.
 */
export function useCustomTheme() {
  const [cssUrl] = useStorage("customCssUrl", "");
  const [customCss] = useStorage("customCss", "");

  function applyCustomTheme() {
    // Remove previously injected custom theme elements
    document.querySelectorAll('[data-custom-theme]').forEach(el => el.remove());

    if (cssUrl) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssUrl;
      link.dataset.customTheme = 'url';
      document.head.appendChild(link);
    }

    if (customCss) {
      const style = document.createElement('style');
      style.textContent = customCss;
      style.dataset.customTheme = 'inline';
      document.head.appendChild(style);
    }
  }

  // Run on mount and whenever cssUrl/customCss changes
  useEffect(() => {
    applyCustomTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cssUrl, customCss]);
}
