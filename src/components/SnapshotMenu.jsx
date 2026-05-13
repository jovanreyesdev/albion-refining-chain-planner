import { useEffect, useRef, useState } from "react";
import ThemedButton from "./ThemedButton";
import { useTranslation } from "../i18n/useTranslation";

/**
 * Dropdown menu that lists saved inventory snapshots.
 * Closes on outside click. Each row is clickable to load, with an × to delete.
 */
export default function SnapshotMenu({ snapshots, onLoad, onDelete }) {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <ThemedButton onClick={() => setOpen(!open)}>
        {t("btnSnapshots")} {snapshots.length > 0 && `(${snapshots.length})`}
      </ThemedButton>
      {open && (
        <div className="absolute right-0 mt-1 w-72 bg-stone-900 border border-amber-700/40 rounded shadow-2xl z-30 max-h-80 overflow-y-auto">
          {snapshots.length === 0 ? (
            <div className="px-3 py-3 text-xs text-amber-500/60 italic">
              {t("snapshotsEmpty")}
            </div>
          ) : (
            <ul className="divide-y divide-stone-800">
              {snapshots.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-stone-800/60"
                >
                  <button
                    onClick={() => { onLoad(s.id); setOpen(false); }}
                    className="flex-1 text-left text-amber-200 hover:text-amber-100 truncate"
                  >
                    {s.name}
                  </button>
                  <button
                    onClick={() => onDelete(s.id)}
                    className="text-rose-400 hover:text-rose-300 px-1"
                    title="Delete"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
