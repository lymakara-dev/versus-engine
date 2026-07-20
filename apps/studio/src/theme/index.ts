export interface Theme {
  key: string;
  backgroundFrom: string;
  backgroundTo: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  neutralAccent: string;
  fontDisplay: string;
  fontBody: string;
  motif: "speed-lines" | "circuit" | "none";
}

const themes: Record<string, Theme> = {
  speed: {
    key: "speed",
    backgroundFrom: "#0a0a0f",
    backgroundTo: "#1a1220",
    surface: "#15121c",
    textPrimary: "#f5f5f7",
    textSecondary: "#9a94a8",
    neutralAccent: "#ffcc00",
    fontDisplay: "'Archivo Black', 'Arial Black', sans-serif",
    fontBody: "'Inter', sans-serif",
    motif: "speed-lines",
  },
  circuit: {
    key: "circuit",
    backgroundFrom: "#050914",
    backgroundTo: "#0d1b2e",
    surface: "#0b1524",
    textPrimary: "#eef4ff",
    textSecondary: "#7d93b8",
    neutralAccent: "#4dd8ff",
    fontDisplay: "'Archivo Black', 'Arial Black', sans-serif",
    fontBody: "'Inter', sans-serif",
    motif: "circuit",
  },
  default: {
    key: "default",
    backgroundFrom: "#0c0c0e",
    backgroundTo: "#1c1c22",
    surface: "#151519",
    textPrimary: "#f5f5f7",
    textSecondary: "#96969e",
    neutralAccent: "#ffffff",
    fontDisplay: "'Archivo Black', 'Arial Black', sans-serif",
    fontBody: "'Inter', sans-serif",
    motif: "none",
  },
};

export function getTheme(themeKey: string): Theme {
  return themes[themeKey] ?? themes.default;
}
