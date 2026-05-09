import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/*
 * Theme provider — semantic-token flip orchestrator (DESIGN.md §10).
 *
 * Three modes: "light" | "dark" | "system". The provider:
 *   - Reads localStorage on mount, falls back to "system".
 *   - Watches `prefers-color-scheme` while in "system" mode.
 *   - Toggles the `.dark` class on <html> to drive the dark-mode block in
 *     packages/ui/src/styles/base.css.
 *
 * To avoid FOUC on first paint, render <ThemeInitScript /> from the document
 * head — that mirrors this logic synchronously, before React hydrates.
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** The user's chosen mode. */
  theme: Theme;
  /** What's actually applied right now (system resolves to light/dark). */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "whattax-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function resolveTheme(theme: Theme, system: ResolvedTheme): ResolvedTheme {
  return theme === "system" ? system : theme;
}

function applyThemeClass(resolved: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

interface ThemeProviderProps {
  children: ReactNode;
  /** Mode used until localStorage is read (avoids hydration flash). */
  defaultTheme?: Theme;
}

function ThemeProvider({
  children,
  defaultTheme = "system",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");

  // Read persisted theme + system preference once on mount.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored);
    }
    setSystemTheme(readSystemTheme());
  }, []);

  // Listen for system preference changes; only matters when theme === "system".
  useEffect(() => {
    const mql = window.matchMedia(DARK_QUERY);
    const onChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };
    mql.addEventListener("change", onChange);
    return () => {
      mql.removeEventListener("change", onChange);
    };
  }, []);

  const resolvedTheme = resolveTheme(theme, systemTheme);

  // Sync .dark class whenever the resolved theme changes.
  useEffect(() => {
    applyThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ resolvedTheme, setTheme, theme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

function useTheme(): ThemeContextValue {
  const ctx = use(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}

/*
 * Inline script that runs synchronously in the document <head>, before any
 * React rendering. Sets the `.dark` class on <html> using the same logic the
 * provider uses on mount. This eliminates the flash of incorrect theme on
 * first paint. Render once at the top of the document head.
 */
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${STORAGE_KEY}");var m=window.matchMedia("${DARK_QUERY}").matches;var d=s==="dark"||((s==="system"||!s)&&m);if(d)document.documentElement.classList.add("dark");}catch(_){}})();`;

function ThemeInitScript() {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: minimal SSR theme bootstrap
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
    />
  );
}

export { ThemeProvider, ThemeInitScript, useTheme, THEME_INIT_SCRIPT };
