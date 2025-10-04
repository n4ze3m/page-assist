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
    },
    surface: {
      50:  "#f8fbf7",  // very light moss
      100: "#eaf3e6",  // pale greenish gray
      200: "#d6e4d1",  // soft sage
      300: "#c0d3bb",  // muted green
      400: "#a3bfa1",  // earthy gray-green
      500: "#7e9c7d",  // mossy neutral
      600: "#5f7c5f",  // muted olive
      700: "#4a5f48",  // deep moss surface
      800: "#344233",  // shadowed moss
      900: "#212a1f",  // dark earthy
    }
  },
  default: {
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
    },
    surface: {
      50:  '#fafafa', // near white
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b', // near black
    }
  }
}

export type Theme = keyof typeof themes