"use client";

import { useServerInsertedHTML } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Attribute = "class" | `data-${string}`;

export interface ThemeProviderProps {
  children: ReactNode;
  attribute?: Attribute | Attribute[];
  defaultTheme?: string;
  enableSystem?: boolean;
  enableColorScheme?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
  themes?: string[];
  forcedTheme?: string;
}

export interface UseThemeResult {
  theme: string | undefined;
  setTheme: (theme: string | ((prev: string) => string)) => void;
  resolvedTheme: string | undefined;
  systemTheme: "light" | "dark" | undefined;
  themes: string[];
  forcedTheme?: string;
}

const DEFAULT_THEMES = ["light", "dark"];
const MEDIA_QUERY = "(prefers-color-scheme: dark)";
const themeListeners = new Set<() => void>();

const ThemeContext = createContext<UseThemeResult>({
  theme: undefined,
  setTheme: () => {},
  resolvedTheme: undefined,
  systemTheme: undefined,
  themes: [],
});

function notifyThemeListeners() {
  for (const listener of themeListeners) {
    listener();
  }
}

function getSystemColorScheme(): "light" | "dark" {
  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

function getServerColorScheme(): "light" {
  return "light";
}

function subscribeSystemColorScheme(onStoreChange: () => void): () => void {
  const media = window.matchMedia(MEDIA_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function readStoredTheme(storageKey: string, fallback: string): string {
  try {
    return window.localStorage.getItem(storageKey) || fallback;
  } catch {
    return fallback;
  }
}

function temporarilyDisableTransitions(): () => void {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}"
    )
  );
  document.head.appendChild(style);
  return () => {
    window.getComputedStyle(document.body);
    window.setTimeout(() => {
      style.remove();
    }, 1);
  };
}

function applyThemeToDocument(options: {
  resolvedTheme: string;
  attribute: Attribute | Attribute[];
  themes: string[];
  enableColorScheme: boolean;
  disableTransitionOnChange: boolean;
}) {
  const { resolvedTheme, attribute, themes, enableColorScheme, disableTransitionOnChange } = options;
  const restoreTransitions = disableTransitionOnChange ? temporarilyDisableTransitions() : null;
  const root = document.documentElement;
  const attributes = Array.isArray(attribute) ? attribute : [attribute];

  for (const attr of attributes) {
    if (attr === "class") {
      root.classList.remove(...themes);
      if (resolvedTheme) {
        root.classList.add(resolvedTheme);
      }
    } else if (attr.startsWith("data-")) {
      if (resolvedTheme) {
        root.setAttribute(attr, resolvedTheme);
      } else {
        root.removeAttribute(attr);
      }
    }
  }

  if (enableColorScheme && (resolvedTheme === "light" || resolvedTheme === "dark")) {
    root.style.colorScheme = resolvedTheme;
  }

  restoreTransitions?.();
}

function buildThemeInitScript(options: {
  attribute: Attribute | Attribute[];
  storageKey: string;
  defaultTheme: string;
  enableSystem: boolean;
  enableColorScheme: boolean;
  forcedTheme?: string;
  themes: string[];
}): string {
  const attrsJson = JSON.stringify(Array.isArray(options.attribute) ? options.attribute : [options.attribute]);
  const themesJson = JSON.stringify(options.themes);
  const storageKeyJson = JSON.stringify(options.storageKey);
  const defaultThemeJson = JSON.stringify(options.defaultTheme);
  const forcedThemeJson = JSON.stringify(options.forcedTheme ?? null);

  return `!function(){try{var d=document.documentElement,attrs=${attrsJson},themes=${themesJson},forced=${forcedThemeJson},stored=localStorage.getItem(${storageKeyJson})||${defaultThemeJson},t=forced||(stored==="system"&&${options.enableSystem}?(window.matchMedia(${JSON.stringify(MEDIA_QUERY)}).matches?"dark":"light"):stored);for(var i=0;i<attrs.length;i++){var a=attrs[i];if(a==="class"){d.classList.remove.apply(d.classList,themes);if(t)d.classList.add(t)}else if(a.indexOf("data-")===0){if(t)d.setAttribute(a,t);else d.removeAttribute(a)}}if(${options.enableColorScheme}&&(t==="light"||t==="dark")){d.style.colorScheme=t}}catch(e){}}();`;
}

/**
 * Provides theme state (`light` / `dark` / `system`) cleanly under React 19
 * by injecting the pre-hydration anti-FOUC script strictly via SSR HTML.
 */
export function ThemeProvider({
  children,
  attribute = "data-theme",
  defaultTheme = "system",
  enableSystem = true,
  enableColorScheme = true,
  disableTransitionOnChange = false,
  storageKey = "theme",
  themes = DEFAULT_THEMES,
  forcedTheme,
}: ThemeProviderProps) {
  const fallbackTheme = enableSystem ? defaultTheme : defaultTheme === "system" ? "light" : defaultTheme;
  const isScriptInserted = useRef(false);

  useServerInsertedHTML(() => {
    if (isScriptInserted.current) {
      return null;
    }
    isScriptInserted.current = true;
    return (
      <script
        id="sambung-theme-init"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: buildThemeInitScript({
            attribute,
            storageKey,
            defaultTheme: fallbackTheme,
            enableSystem,
            enableColorScheme,
            forcedTheme,
            themes,
          }),
        }}
      />
    );
  });

  const subscribeThemeStorage = useCallback(
    (onStoreChange: () => void) => {
      themeListeners.add(onStoreChange);
      const handleStorage = (event: StorageEvent) => {
        if (event.key === storageKey || event.key === null) {
          onStoreChange();
        }
      };
      window.addEventListener("storage", handleStorage);
      return () => {
        themeListeners.delete(onStoreChange);
        window.removeEventListener("storage", handleStorage);
      };
    },
    [storageKey]
  );

  const theme = useSyncExternalStore(
    subscribeThemeStorage,
    () => readStoredTheme(storageKey, fallbackTheme),
    () => fallbackTheme
  );

  const systemTheme = useSyncExternalStore(
    subscribeSystemColorScheme,
    getSystemColorScheme,
    getServerColorScheme
  );

  const resolvedTheme = useMemo(() => {
    const active = forcedTheme ?? theme;
    if (active === "system" && enableSystem) {
      return systemTheme;
    }
    return active;
  }, [forcedTheme, theme, enableSystem, systemTheme]);

  useEffect(() => {
    applyThemeToDocument({
      resolvedTheme,
      attribute,
      themes,
      enableColorScheme,
      disableTransitionOnChange,
    });
  }, [resolvedTheme, attribute, themes, enableColorScheme, disableTransitionOnChange]);

  const setTheme = useCallback(
    (next: string | ((prev: string) => string)) => {
      const current = readStoredTheme(storageKey, fallbackTheme);
      const resolvedNext = typeof next === "function" ? next(current) : next;
      try {
        window.localStorage.setItem(storageKey, resolvedNext);
      } catch {
        // Ignore storage errors in restricted browser contexts
      }
      notifyThemeListeners();
    },
    [storageKey, fallbackTheme]
  );

  const value = useMemo<UseThemeResult>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme: enableSystem ? systemTheme : undefined,
      themes: enableSystem ? [...themes, "system"] : themes,
      forcedTheme,
    }),
    [theme, setTheme, resolvedTheme, enableSystem, systemTheme, themes, forcedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Reads and updates the active UI theme configured by `ThemeProvider`.
 */
export function useTheme(): UseThemeResult {
  return useContext(ThemeContext);
}