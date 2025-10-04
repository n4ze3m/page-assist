export const surface = {
  50:  '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
}

export const primary = {
  50: "#f5faff",
  100: "#e0f2ff",
  200: "#bae6fd",
  300: "#7dd3fc",
  400: "#38bdf8",
  500: "#0ea5e9",
  600: "#0284c7",
  700: "#0369a1",
  800: "#075985",
  900: "#0c4a6e",
}

export const themes = {
  moss: {
    primary: {
      50:  "#f7fdf5",  // misty light
      100: "#e7f4e0",
      200: "#cfeac2",
      300: "#a9d69e",
      400: "#7bbf74",
      500: "#5a9f59",  // true mossy green
      600: "#4b874d",
      700: "#3b6e3f",
      800: "#2f5633",
      900: "#1f3b22",  // deep moss
    }
  },
  sky: {
    primary: {
      50: "#f5faff",
      100: "#e0f2ff",
      200: "#bae6fd",
      300: "#7dd3fc",
      400: "#38bdf8",
      500: "#0ea5e9",
      600: "#0284c7",
      700: "#0369a1",
      800: "#075985",
      900: "#0c4a6e",
    }
  }
}

export type Theme = keyof typeof themes