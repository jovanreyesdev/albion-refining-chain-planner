import { useEffect, useRef, useState } from "react";
import { LANGUAGES } from "../i18n/translations";
import { useLanguage } from "../i18n/useTranslation";

/**
 * Small dropdown for switching UI language.
 * Shows the active language's flag + label in a compact pill;
 * clicking opens a list of all available languages.
 */
export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const active = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-700/40 bg-stone-900/60 text-xs font-semibold text-amber-200 hover:border-amber-500/60 hover:text-amber-100 transition"
        title="Change language"
      >
        <span className="text-base leading-none">{active.flag}</span>
        <span>{active.label}</span>
        <span className="text-amber-500/70 text-[10px]">▾</span>
      </button>
      {open && (
        <ul
          className="absolute right-0 mt-1 w-40 bg-stone-900 border border-amber-700/40 rounded shadow-2xl z-30 overflow-hidden"
          role="listbox"
        >
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                onClick={() => { setLang(l.code); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-stone-800
                  ${l.code === lang ? "text-amber-100 bg-stone-800/70" : "text-amber-300/90"}`}
                role="option"
                aria-selected={l.code === lang}
              >
                <span className="text-base leading-none">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
