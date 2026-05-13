import { useEffect, useMemo, useState } from "react";
import invSlotBg from "../assets/inv-slot.jpg";
import { tierRoman } from "./constants";
import { iconUrl } from "./iconResolver";
import { SHOPPING_CHECKED_KEY, loadCheckedSet } from "./storage";

/**
 * Stable key for grouping/deduping shopping items.
 * Two requests for the same (kind, family, tier, ench) merge into one line.
 */
function shoppingItemKey(it) {
  return `${it.iconKind}-${it.iconFamily.key}-${it.iconTier}-${it.iconEnch}`;
}

/**
 * Shopping List.
 *
 * Each item gets a checkbox so users can tick off purchases at market.
 * Checked state is keyed by item identity and persisted to localStorage.
 * Stale keys are garbage-collected when the underlying inventory changes.
 *
 * Header includes a "Cascade refining" toggle that switches between two
 * calculation modes (described in cascade.js).
 */
export default function ShoppingList({ items, cascadeMode, setCascadeMode }) {
  // Dedupe + sort. When multiple chains request the same item (e.g., T3 base
  // bars needed by both T4.2 and T4.3 chains, since they share the base T3
  // pool), we SUM the amounts — the user has to satisfy ALL the chains.
  const grouped = useMemo(() => {
    const g = {};
    for (const it of items) {
      const key = shoppingItemKey(it);
      if (!g[key]) g[key] = { ...it, reasons: [], amount: 0, key };
      g[key].amount += it.amount;
      g[key].reasons.push(it.reason);
    }
    return Object.values(g).sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "refined" ? -1 : 1;
      if (a.iconFamily.key !== b.iconFamily.key)
        return a.iconFamily.key.localeCompare(b.iconFamily.key);
      if (a.iconEnch !== b.iconEnch) return a.iconEnch - b.iconEnch;
      return a.iconTier - b.iconTier;
    });
  }, [items]);

  const [checked, setChecked] = useState(loadCheckedSet);

  // Garbage-collect checked keys that no longer correspond to any shopping
  // item (e.g., user added inventory that resolved a shortfall).
  useEffect(() => {
    const validKeys = new Set(grouped.map((g) => g.key));
    let changed = false;
    const next = new Set();
    for (const k of checked) {
      if (validKeys.has(k)) next.add(k);
      else changed = true;
    }
    if (changed) setChecked(next);
  }, [grouped]);

  // Persist whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(SHOPPING_CHECKED_KEY, JSON.stringify([...checked]));
    } catch {}
  }, [checked]);

  const toggleChecked = (key) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const checkedCount = grouped.filter((g) => checked.has(g.key)).length;
  const allChecked = grouped.length > 0 && checkedCount === grouped.length;

  if (items.length === 0) {
    return (
      <div className="mb-5 p-4 bg-emerald-900/30 border border-emerald-700/40 rounded-lg">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-emerald-200 text-sm">
            ✓ All balanced — nothing else to buy. (Or your inventory is empty.)
          </span>
          <CascadeToggle cascadeMode={cascadeMode} setCascadeMode={setCascadeMode} />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 bg-stone-900/60 border border-amber-700/50 rounded-lg p-4 shadow-xl">
      <h2 className="font-bold text-amber-100 mb-3 flex items-center gap-2 flex-wrap">
        <span>🛒</span> Shopping List
        <span className="text-xs text-amber-500/70 font-normal">
          ({checkedCount}/{grouped.length} done{allChecked ? " ✓" : ""})
        </span>
        <div className="ml-auto flex items-center gap-4 flex-wrap">
          <CascadeToggle cascadeMode={cascadeMode} setCascadeMode={setCascadeMode} />
          {checkedCount > 0 && (
            <button
              onClick={() => setChecked(new Set())}
              className="text-[11px] text-amber-400/80 hover:text-amber-200 underline underline-offset-2"
              title="Uncheck all items"
            >
              Reset checks
            </button>
          )}
        </div>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {grouped.map((it) => {
          const url = iconUrl(it.iconFamily, it.iconTier, it.iconEnch);
          const isChecked = checked.has(it.key);
          return (
            <label
              key={it.key}
              className={`flex items-center gap-2.5 bg-stone-800/50 rounded p-2 border cursor-pointer transition select-none
                ${isChecked
                  ? "border-emerald-700/60 bg-emerald-900/20 opacity-60"
                  : "border-stone-700/50 hover:border-amber-700/50"}`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleChecked(it.key)}
                className="w-4 h-4 shrink-0 accent-emerald-500 cursor-pointer"
                aria-label={`Mark ${it.label} as purchased`}
              />
              <div
                className={`relative w-12 h-12 rounded border-2 shrink-0 ${isChecked ? "grayscale" : ""}`}
                style={{
                  backgroundImage: `url(${invSlotBg})`,
                  backgroundSize: "100% 100%",
                }}
              >
                {url && (
                  <img src={url} alt="" className="absolute inset-0 w-full h-full object-contain p-0.5" />
                )}
                <span className="absolute top-0 left-0 text-[9px] font-bold text-amber-200 bg-black/70 px-1 rounded">
                  {tierRoman[it.iconTier]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold truncate ${isChecked ? "text-emerald-300 line-through" : "text-amber-100"}`}>
                  Buy <span className={isChecked ? "" : "text-rose-300"}>{it.amount.toLocaleString()}</span> × {it.label}
                </div>
                <div className={`text-[10px] truncate ${isChecked ? "text-emerald-500/50" : "text-amber-500/60"}`}>
                  {it.reasons[0]}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Cascade-mode toggle — kept as its own component (declared at module scope,
 * not inside ShoppingList) so React doesn't recreate it on every parent render.
 * Used in both the empty-state banner and the populated header.
 */
function CascadeToggle({ cascadeMode, setCascadeMode }) {
  return (
    <label
      className="inline-flex items-center gap-2 text-xs text-amber-300/90 cursor-pointer select-none"
      title={
        cascadeMode
          ? "ON: When you refine low-tier items, the result is used for high-tier items.\n\nExample:\n• You have 70 T7 Hide and 300 T8 Hide.\n• Refining 70 T7 Hide makes 14 T7 Leather.\n• Those 14 T7 Leather are used for the 300 T8 Hide.\n• So you only need to buy 46 more T7 Leather (not 60)."
          : "OFF: Each tier is calculated alone. Refining low-tier items does NOT help with high-tier items.\n\nExample:\n• You have 70 T7 Hide and 300 T8 Hide.\n• T7 step says: buy 14 T6 Leather.\n• T8 step says: buy 60 T7 Leather.\n• The 14 T7 Leather you make from T7 Hide is ignored."
      }
    >
      <input
        type="checkbox"
        checked={cascadeMode}
        onChange={(e) => setCascadeMode(e.target.checked)}
        className="w-3.5 h-3.5 accent-amber-400 cursor-pointer"
      />
      <span className="font-semibold">Use lower tier output for higher tier</span>
      <span className="text-amber-500/60 text-[10px]">
        {cascadeMode ? "(ON — buy less)" : "(OFF — each tier alone)"}
      </span>
    </label>
  );
}
