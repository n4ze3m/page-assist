const { surface, primary } = require('./src/assets/colors')

/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        primary:{
          50:  "rgb(var(--primary-50) / <alpha-value>)",
          100: "rgb(var(--primary-100) / <alpha-value>)",
          200: "rgb(var(--primary-200) / <alpha-value>)",
          300: "rgb(var(--primary-300) / <alpha-value>)",
          400: "rgb(var(--primary-400) / <alpha-value>)",
          500: "rgb(var(--primary-500) / <alpha-value>)",
          600: "rgb(var(--primary-600) / <alpha-value>)",
          700: "rgb(var(--primary-700) / <alpha-value>)",
          800: "rgb(var(--primary-800) / <alpha-value>)",
          900: "rgb(var(--primary-900) / <alpha-value>)",
        },
        surface
      },
      backgroundColor:{
        surface
      },
      backgroundImage: {
        'bottom-mask-light': 'linear-gradient(0deg, transparent 0, #ffffff 160px)',
        'bottom-mask-dark': 'linear-gradient(0deg, transparent 0, #1a1a1a 160px)',
      },
      maskImage: {
        'bottom-fade': 'linear-gradient(0deg, transparent 0, #000 160px)',
      }
    }
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")]
}
