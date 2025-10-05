
import { useEffect } from "react"
import { themes, Theme } from "@/assets/colors"
import { useThemeStore } from "@/store/theme"
import { TinyColor } from '@ctrl/tinycolor';
import svgString from "@/assets/backgrounds/layered-waves.svg?raw"; // the ?raw is key!
import { useDarkMode } from "./useDarkmode";


export function useTheme() {
  const themeName = useThemeStore((state) => state.themeName)
  const setTheme = useThemeStore((state) => state.setTheme)
  const { mode } = useDarkMode()

  useEffect(() => {
    const themeObj = themes[themeName ?? "default"];
    Object.entries(themeObj.primary).forEach(([key, hex]) => {
      const rgb = hexToRgb(hex);
      document.documentElement.style.setProperty(`--primary-${key}`, rgb);
    });
    Object.entries(themeObj.surface).forEach(([key, hex]) => {
      const rgb = hexToRgb(hex);
      document.documentElement.style.setProperty(`--surface-${key}`, rgb);
    });
  }, [themeName]);

  const getThemedSVGUri = () : string => {

    const svgText = svgString
    console.log("svgText", svgText)

    const color = new TinyColor(themes[themeName].primary[500]);

    const customizedSVG = svgText
      .replace(/{{color1}}/g, themes[themeName].surface[mode == "dark" ? 900: 100])
      .replace(/{{color2}}/g, color.clone().lighten(5).toHexString())
      .replace(/{{color3}}/g, color.toHexString())
      .replace(/{{color4}}/g, color.clone().spin(2).darken(5).toHexString())
      .replace(/{{color5}}/g, color.clone().spin(-2).darken(7).toHexString())
      .replace(/{{color6}}/g, color.clone().spin(2).darken(10).toHexString())

    return svgToDataURI(customizedSVG);
  }

  

  return { themeName, setTheme, getThemedSVGUri }
}

function svgToDataURI(svgString) {
  const encoded = encodeURIComponent(svgString)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');

  return `data:image/svg+xml,${encoded}`;
}

// Utility: Convert hex to R, G, B (no alpha)
function hexToRgb(hex: string): string {
  const normalized = hex.replace("#", "")
  const bigint = parseInt(normalized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `${r} ${g} ${b}`
}
