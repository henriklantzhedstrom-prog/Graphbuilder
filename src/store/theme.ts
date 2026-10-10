import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "graphbuilder:theme";

function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.add("gb-theme-switching");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  // Tvinga fram omritning innan övergångarna slås på igen.
  void root.offsetHeight;
  root.classList.remove("gb-theme-switching");
}

interface ThemeState {
  theme: Theme;
  toggleTheme(): void;
}

/** Appen startar alltid i ljust läge; användarens val sparas i webbläsaren. */
export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: readStoredTheme(),
  toggleTheme: () => {
    const theme: Theme = get().theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Lagring blockerad: valet gäller bara den här gången.
    }
    applyTheme(theme);
    set({ theme });
  },
}));

applyTheme(useThemeStore.getState().theme);
