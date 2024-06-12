/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: ["./src/**/*.tsx"],
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")]
}
