
import { useEffect } from "react"
import { themes } from "@/assets/colors"
import { useThemeStore } from "@/store/theme"
import { TinyColor } from '@ctrl/tinycolor';
import layeredWavesSVG from "@/assets/backgrounds/layered-waves.svg?raw"; 
import blurryGradientSVG from "@/assets/backgrounds/blurry-gradient.svg?raw"; 
import blobSceneSVG from "@/assets/backgrounds/blob-scene.svg?raw"; 


import { useDarkMode } from "./useDarkmode";

export type BackgroundType = "blurryGradient" | "layeredWaves" | "blobScene"

export function useTheme() {
  const themeName = useThemeStore((state) => state.themeName)
  const setTheme = useThemeStore((state) => state.setTheme)
  const backgroundName = useThemeStore((state) => state.backgroundName)
  const setBackground = useThemeStore((state) => state.setBackground)

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

  const generateLayeredWaves = () : string => {
    const svgText = layeredWavesSVG

    const color = new TinyColor(themes[themeName].primary[mode == "dark" ? 900: 200]);

    const customizedSVG = svgText
      .replace(/{{color1}}/g, themes[themeName].surface[mode == "dark" ? 900: 100])
      .replace(/{{color2}}/g, color.clone().lighten(5).toHexString())
      .replace(/{{color3}}/g, color.toHexString())
      .replace(/{{color4}}/g, color.clone().spin(2).darken(5).toHexString())
      .replace(/{{color5}}/g, color.clone().spin(-2).darken(7).toHexString())
      .replace(/{{color6}}/g, color.clone().spin(2).darken(10).toHexString())

    return customizedSVG
  }

  const generateBlobScene = () : string => {
    const svgText = blobSceneSVG

    const color = new TinyColor(themes[themeName].primary[mode == "dark" ? 900: 100]);

    const customizedSVG = svgText
      .replace(/{{color1}}/g, themes[themeName].surface[mode == "dark" ? 900: 100])
      .replace(/{{color2}}/g, color.clone().lighten(5).toHexString())
      .replace(/{{color3}}/g, color.toHexString())
      .replace(/{{color4}}/g, color.clone().spin(3).darken(5).toHexString())
      .replace(/{{color5}}/g, color.clone().spin(-2).darken(7).toHexString())
      .replace(/{{color6}}/g, color.clone().spin(2).darken(4).toHexString())
      .replace(/{{color7}}/g, color.clone().spin(-4).darken(3).toHexString())

    return customizedSVG
  }

  const generateBlurryGradient = () : string => {
    const svgText = blurryGradientSVG

    const color = new TinyColor(themes[themeName].primary[mode == "dark" ? 800: 200]);

    const customizedSVG = svgText
      .replace(/{{color1}}/g, themes[themeName].surface[mode == "dark" ? 800: 100])
      .replace(/{{color2}}/g, color.clone().lighten(7).toHexString())
      .replace(/{{color3}}/g, color.toHexString())
      .replace(/{{color4}}/g, color.clone().spin(2).lighten(3).toHexString())
      .replace(/{{color5}}/g, color.clone().spin(-2).darken(3).toHexString())
      .replace(/{{color6}}/g, color.clone().spin(2).lighten(7).toHexString())
      .replace(/{{color7}}/g, color.clone().spin(-6).lighten(3).toHexString())

    return customizedSVG;
  }

  const getThemedSVGUri = () : string => {
    let customizedSVG = "";
    switch(backgroundName){
      case "blurryGradient":
        customizedSVG = generateBlurryGradient();
        break;
      case "layeredWaves":
        customizedSVG = generateLayeredWaves();
        break;
      case "blobScene":
        customizedSVG = generateBlobScene();
        break;
      default:
        customizedSVG = generateLayeredWaves();
        break;
    }
    return svgToDataURI(customizedSVG);
  }

  return { themeName, setTheme, backgroundName, setBackground, getThemedSVGUri }
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
