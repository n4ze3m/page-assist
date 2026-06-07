// copied from https://gist.github.com/KristofferEriksson/87ea5b8195339577151a236a9e9b46ff
/**
 * Custom hook for dynamically resizing a textarea to fit its content.
 * @param {React.RefObject<HTMLTextAreaElement>} textareaRef - Reference to the textarea element.
 * @param {string} textContent - Current text content of the textarea.
 * @param {number} maxHeight - Optional: maxHeight of the textarea in pixels.
 */

import { useLayoutEffect } from "react";
const useDynamicTextareaSize = (
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  textContent: string,
  // optional maximum height after which textarea becomes scrollable
  maxHeight?: number
): void => {
  // useLayoutEffect runs synchronously after DOM mutations but before paint,
  // so the textarea is sized correctly on the very first render (no flash of
  // wrong/max height that only corrects on the next keystroke).
  useLayoutEffect(() => {
    const currentTextarea = textareaRef.current;
    if (currentTextarea) {
      const computedStyle = window.getComputedStyle(currentTextarea);
      const minHeight = parseFloat(computedStyle.minHeight) || 0;

      if (textContent.length === 0) {
        currentTextarea.style.maxHeight = maxHeight ? `${maxHeight}px` : "";
        currentTextarea.style.overflowY = "hidden";
        currentTextarea.style.height = `${minHeight}px`;
        return;
      }

      // Reset the height so scrollHeight reflects the content height only.
      // Using "auto" (instead of "0px") avoids a stale measurement when the
      // element also has an inline min-height set.
      currentTextarea.style.height = "auto";
      const contentHeight = currentTextarea.scrollHeight;

      if (maxHeight) {
        // Set max-height and adjust overflow behavior if maxHeight is provided
        currentTextarea.style.maxHeight = `${maxHeight}px`;
        currentTextarea.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
        currentTextarea.style.height = `${Math.min(contentHeight, maxHeight)}px`;
      } else {
        // Adjust height without max height constraint
        currentTextarea.style.height = `${contentHeight}px`;
      }
    }
  }, [textareaRef, textContent, maxHeight]);
};

export default useDynamicTextareaSize;
