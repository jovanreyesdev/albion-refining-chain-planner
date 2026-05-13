// =============================================================================
// useTranslation — minimal i18n hook + provider.
//
// Wraps the app in <LanguageProvider> and exposes:
//   - useLanguage()    → { lang, setLang }
//   - useTranslation() → t(key, vars?)
//
// Falls back to English if a key is missing in the active locale.
// Placeholder syntax: "{name}" gets replaced with vars.name.
// =============================================================================

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import dict from "./translations";

const LANG_KEY = "rcp:lang";

const LanguageContext = createContext({ lang: "en", setLang: () => {} });

function detectBrowserLang() {
  const stored = (() => {
    try { return localStorage.getItem(LANG_KEY); } catch { return null; }
  })();
  if (stored && dict[stored]) return stored;
  const nav = (navigator.language || "en").toLowerCase();
  if (nav.startsWith("zh")) return "zh";
  if (nav.startsWith("th")) return "th";
  if (nav.startsWith("id") || nav.startsWith("ms")) return "id";
  return "en";
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectBrowserLang);

  const setLang = (next) => {
    setLangState(next);
    try { localStorage.setItem(LANG_KEY, next); } catch { /* noop */ }
  };

  // Reflect the chosen language on <html lang="..."> for accessibility/SEO.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang }), [lang]);
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/**
 * Returns a translator function: t(key, vars?).
 * Falls back to English if the key is missing in the active language.
 */
export function useTranslation() {
  const { lang } = useLanguage();
  return useMemo(() => {
    const table = dict[lang] || dict.en;
    const fallback = dict.en;
    return (key, vars) => {
      let raw = table[key];
      if (raw == null) raw = fallback[key];
      if (raw == null) return key; // last-resort: show the key so it's obvious
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, name) =>
        vars[name] != null ? String(vars[name]) : `{${name}}`,
      );
    };
  }, [lang]);
}
