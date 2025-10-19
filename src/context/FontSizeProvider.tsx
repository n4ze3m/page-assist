import { useStorage } from '@plasmohq/storage/hook';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface FontSizeContextType {
  scale: number;
  increase: () => void;
  decrease: () => void;
  reset: () => void;
  minScale: number;
  maxScale: number;
}

interface FontSizeProviderProps {
  children: React.ReactNode;
  initialScale?: number;
  step?: number;
  minScale?: number;
  maxScale?: number;
  storageKey?: string;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);


export const FontSizeProvider = ({
  children,
  initialScale = 1,
  step = 0.1,
  minScale = 0.8,
  maxScale = 2.0,
  storageKey = 'font-size-scale'
}: FontSizeProviderProps) => {
  const [storedScale, setStoredScale] = useStorage<number>(
    storageKey,
    initialScale
  );
  
  const validScale = (scale: number) => {
    if (isNaN(scale) || scale < minScale) return minScale;
    if (scale > maxScale) return maxScale;
    return scale;
  };
  
  const scale = validScale(storedScale);

  const increase = () => {
    setStoredScale(validScale(scale + step));
  };
  
  const decrease = () => {
    setStoredScale(validScale(scale - step));
  };
  
  const reset = () => {
    setStoredScale(initialScale);
  };
  
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', scale.toString());
    
    let styleElement = document.getElementById('font-scale-styles');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'font-scale-styles';
      document.head.appendChild(styleElement);
    }
    
    const textSizeClasses = [
      'text-xs', 'text-sm', 'text-base', 'text-lg', 
      'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 
      'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl'
    ];
    
    const tailwindRules = textSizeClasses.map(className => {
      return `.${className} { font-size: calc(var(--${className}-size, 1rem) * var(--font-scale)) !important; }`;
    }).join('\n');
    
    const proseRules = `
      /* Base prose class scaling */
      .prose {
        font-size: calc(1rem * var(--font-scale));
      }
      
      /* Prose size variants */
      .prose-xs {
        font-size: calc(0.75rem * var(--font-scale));
      }
      .prose-sm {
        font-size: calc(0.875rem * var(--font-scale));
      }
      .prose-base {
        font-size: calc(1rem * var(--font-scale));
      }
      .prose-lg {
        font-size: calc(1.125rem * var(--font-scale));
      }
      .prose-xl {
        font-size: calc(1.25rem * var(--font-scale));
      }
      .prose-2xl {
        font-size: calc(1.5rem * var(--font-scale));
      }
      
      /* Scale all elements within prose */
      .prose h1 {
        font-size: calc(2.25em * var(--font-scale));
      }
      .prose h2 {
        font-size: calc(1.5em * var(--font-scale));
      }
      .prose h3 {
        font-size: calc(1.25em * var(--font-scale));
      }
      .prose h4 {
        font-size: calc(1em * var(--font-scale));
      }
      .prose p, .prose ul, .prose ol, .prose blockquote {
        font-size: calc(1em * var(--font-scale));
      }
      .prose figcaption {
        font-size: calc(0.875em * var(--font-scale));
      }
      .prose code {
        font-size: calc(0.875em * var(--font-scale));
      }

      /* Table content scaling */
      .prose table,
      .prose th,
      .prose td {
        font-size: calc(1em * var(--font-scale));
      }
    `;
    
    const sizeDefinitions = `
      :root {
        --text-xs-size: 0.75rem;
        --text-sm-size: 0.875rem;
        --text-base-size: 1rem;
        --text-lg-size: 1.125rem;
        --text-xl-size: 1.25rem;
        --text-2xl-size: 1.5rem;
        --text-3xl-size: 1.875rem;
        --text-4xl-size: 2.25rem;
        --text-5xl-size: 3rem;
        --text-6xl-size: 3.75rem;
        --text-7xl-size: 4.5rem;
        --text-8xl-size: 6rem;
        --text-9xl-size: 8rem;
      }
    `;
    
    styleElement.textContent = sizeDefinitions + tailwindRules + proseRules;
    
    return () => {
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, [scale]);
  const contextValue: FontSizeContextType = {
    scale,
    increase,
    decrease, 
    reset,
    minScale,
    maxScale
  };

  return (
    <FontSizeContext.Provider value={contextValue}>
      {children}
    </FontSizeContext.Provider>
  );
};
export const useFontSize = (): FontSizeContextType => {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
};
