/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      backgroundImage: {
        'bottom-mask-light': 'linear-gradient(0deg, transparent 0, #ffffff 160px)',
        'bottom-mask-dark': 'linear-gradient(0deg, transparent 0, #171717 160px)',
      },
      maskImage: {
        'bottom-fade': 'linear-gradient(0deg, transparent 0, #000 160px)',
      }
    }
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")]
}
