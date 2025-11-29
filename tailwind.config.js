/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        surface2: "var(--color-surface-2)",
        primary: "var(--color-primary)",
        primaryStrong: "var(--color-primary-strong)",
        accent: "var(--color-accent)",
        success: "var(--color-success)",
        warn: "var(--color-warn)",
        danger: "var(--color-danger)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        textMuted: "var(--color-text-muted)",
        focus: "var(--color-focus)"
      },
      fontFamily: {
        display: ["Space Grotesk", "Inter", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        arimo: ["Arimo", "sans-serif"]
      },
      borderRadius: {
        card: "12px",
        pill: "9999px"
      },
      boxShadow: {
        card: "0 6px 18px rgba(0,0,0,0.16)",
        modal: "0 10px 30px rgba(0,0,0,0.28)"
      },
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
