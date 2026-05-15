import { useEffect, useMemo, useRef, useState } from "react";
import invSlotBg from "../assets/inv-slot.jpg";
import { tierRoman } from "./constants";
import { iconUrl } from "./iconResolver";
import {
  SHOPPING_CHECKED_KEY,
  MARKET_SERVER_KEY,
  loadCheckedSet,
  loadMarketServer,
} from "./storage";
import { useTranslation } from "../i18n/useTranslation";
import { track } from "../analytics";
import {
  SERVERS,
  CITIES,
  buildItemId,
  fetchPrices,
  priceFreshness,
  formatAge,
} from "./marketApi";

/**
 * Stable key for grouping/deduping shopping items.
 * Two requests for the same (kind, family, tier, ench) merge into one line.
 */
function shoppingItemKey(it) {
  return `${it.iconKind}-${it.iconFamily.key}-${it.iconTier}-${it.iconEnch}`;
}

/**
 * Shopping List with optional AODP market-price overlay.
 *
 * Each item gets a checkbox so users can tick off purchases at market.
 * Checked state is keyed by item identity and persisted to localStorage.
 * Stale keys are garbage-collected when the underlying inventory changes.
 *
 * Header includes a "Cascade refining" toggle and a server selector for the
 * AODP market API. Per-city prices are fetched from albion-online-data.com
 * whenever the shopping list contents (or selected server) change. Prices show
 * sell-order minimums at Normal quality, color-coded by freshness:
 *   fresh (<1 h)   green
 *   recent (<24 h) amber
 *   stale (>=24 h) red
 *   none           dimmed "—"
 */
export default function ShoppingList({ items, cascadeMode, setCascadeMode }) {
  const t = useTranslation();
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

  // -------- market data state --------
  const [server, setServer] = useState(loadMarketServer);
  const [priceMap, setPriceMap] = useState(() => new Map());
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesError, setPricesError] = useState(false);
  const [pricesFetchedAt, setPricesFetchedAt] = useState(0);

  // Item-ID list (memoized so identical inventories don't refetch).
  const itemIds = useMemo(
    () => grouped.map((g) => buildItemId(g.iconFamily, g.iconTier, g.iconEnch)),
    [grouped],
  );
  // Joined string used as the effect dep so the effect only fires when the
  // SET of IDs actually changes — not on every re-render of grouped[].
  const itemIdsKey = itemIds.join("|");

  // Persist server choice.
  useEffect(() => {
    try { localStorage.setItem(MARKET_SERVER_KEY, server); } catch {
      //
    }
  }, [server]);

  // Fetch prices whenever the shopping list contents or server change.
  // We legitimately need to set loading/error state when the request starts,
  // and clear the price map when the list becomes empty — these are external-
  // sync use cases, not derived state. Disable the strict rule here.
  const inFlightRef = useRef(null);
  useEffect(() => {
    if (itemIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPriceMap(new Map());
      setPricesError(false);
      return;
    }
    if (inFlightRef.current) inFlightRef.current.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;
    setPricesLoading(true);
    setPricesError(false);
    fetchPrices({ itemIds, server, signal: controller.signal })
      .then((map) => {
        if (controller.signal.aborted) return;
        setPriceMap(map);
        setPricesFetchedAt(Date.now());
        if (map.size === 0) setPricesError(true);
      })
      .catch((err) => {
        if (err && err.name === "AbortError") return;
        setPricesError(true);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setPricesLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIdsKey, server]);

  // Garbage-collect checked keys that no longer correspond to any shopping
  // item. Setting state inside an effect here is intentional — we're pruning
  // a persisted set in response to inventory changes.
  useEffect(() => {
    const validKeys = new Set(grouped.map((g) => g.key));
    let changed = false;
    const next = new Set();
    for (const k of checked) {
      if (validKeys.has(k)) next.add(k);
      else changed = true;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (changed) setChecked(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped]);

  // Persist checked set whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(SHOPPING_CHECKED_KEY, JSON.stringify([...checked]));
    } catch {
      //
    }
  }, [checked]);

  const toggleChecked = (key) => {
    setChecked((prev) => {
      const next = new Set(prev);
      const wasChecked = next.has(key);
      if (wasChecked) next.delete(key);
      else next.add(key);
      if (!wasChecked) track("shopping_item_checked");
      return next;
    });
  };

  const checkedCount = grouped.filter((g) => checked.has(g.key)).length;
  const allChecked = grouped.length > 0 && checkedCount === grouped.length;

  // Per-city grand totals + a "cheapest mix" total that picks the lowest
  // price per item across all cities. Skip checked items — they're bought.
  const costSummary = useMemo(() => {
    const perCityTotal = {};
    for (const c of CITIES) perCityTotal[c.code] = { sum: 0, missing: 0 };
    let cheapestGrand = 0;
    for (const it of grouped) {
      if (checked.has(it.key)) continue;
      const id = buildItemId(it.iconFamily, it.iconTier, it.iconEnch);
      const entry = priceMap.get(id);
      let cheapest = null;
      for (const c of CITIES) {
        const cell = entry?.byCity?.[c.code];
        if (cell && cell.price > 0) {
          perCityTotal[c.code].sum += cell.price * it.amount;
          if (cheapest === null || cell.price < cheapest.price) {
            cheapest = { price: cell.price, city: c.code };
          }
        } else {
          perCityTotal[c.code].missing += 1;
        }
      }
      if (cheapest) cheapestGrand += cheapest.price * it.amount;
    }
    return { perCityTotal, cheapestGrand };
  }, [grouped, priceMap, checked]);

  if (items.length === 0) {
    return (
      <div className="mb-5 p-4 bg-emerald-900/30 border border-emerald-700/40 rounded-lg">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-emerald-200 text-sm">
            {t("shoppingAllBalanced")}
          </span>
          <CascadeToggle cascadeMode={cascadeMode} setCascadeMode={setCascadeMode} />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 bg-stone-900/60 border border-amber-700/50 rounded-lg p-4 shadow-xl">
      <h2 className="font-bold text-amber-100 mb-3 flex items-center gap-2 flex-wrap">
        <span>🛒</span> {t("shoppingTitle")}
        <span className="text-xs text-amber-500/70 font-normal">
          {t("shoppingDoneOfTotal", {
            done: checkedCount,
            total: grouped.length,
            checkmark: allChecked ? " ✓" : "",
          })}
        </span>
        <div className="ml-auto flex items-center gap-4 flex-wrap">
          <ServerSelect
            server={server}
            setServer={setServer}
            loading={pricesLoading}
            error={pricesError}
            fetchedAt={pricesFetchedAt}
          />
          <CascadeToggle cascadeMode={cascadeMode} setCascadeMode={setCascadeMode} />
          {checkedCount > 0 && (
            <button
              onClick={() => setChecked(new Set())}
              className="text-[11px] text-amber-400/80 hover:text-amber-200 underline underline-offset-2"
              title={t("shoppingResetChecks")}
            >
              {t("shoppingResetChecks")}
            </button>
          )}
        </div>
      </h2>
      <div className="grid grid-cols-1 gap-2">
        {grouped.map((it) => {
          const url = iconUrl(it.iconFamily, it.iconTier, it.iconEnch);
          const isChecked = checked.has(it.key);
          const id = buildItemId(it.iconFamily, it.iconTier, it.iconEnch);
          const entry = priceMap.get(id);
          return (
            <div
              key={it.key}
              className={`bg-stone-800/50 rounded p-2 border transition select-none
                ${isChecked
                  ? "border-emerald-700/60 bg-emerald-900/20 opacity-60"
                  : "border-stone-700/50 hover:border-amber-700/50"}`}
            >
              <label className="flex items-center gap-2.5 cursor-pointer">
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
                    {(() => {
                      const tpl = t("shoppingBuyLine", { amount: "__AMT__", label: it.label });
                      const [before, after = ""] = tpl.split("__AMT__");
                      return (
                        <>
                          {before}
                          <span className={isChecked ? "" : "text-rose-300"}>
                            {it.amount.toLocaleString()}
                          </span>
                          {after}
                        </>
                      );
                    })()}
                  </div>
                  <div className={`text-[10px] truncate ${isChecked ? "text-emerald-500/50" : "text-amber-500/60"}`}>
                    {it.reasons[0]}
                  </div>
                </div>
              </label>
              <PriceStrip
                entry={entry}
                amount={it.amount}
                loading={pricesLoading && !entry}
                nowMs={pricesFetchedAt || 0}
              />
            </div>
          );
        })}
      </div>
      <CityTotalsRow
        totals={costSummary.perCityTotal}
        cheapestGrand={costSummary.cheapestGrand}
      />
    </div>
  );
}

/**
 * Tiny server picker shown in the shopping-list header.
 * Status dot: amber pulsing = loading, rose = error, emerald = success.
 */
function ServerSelect({ server, setServer, loading, error, fetchedAt }) {
  const t = useTranslation();
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-amber-300/90 select-none">
      <span className="font-semibold">{t("marketLabel")}</span>
      <select
        value={server}
        onChange={(e) => setServer(e.target.value)}
        className="bg-stone-800 border border-amber-700/40 rounded px-1.5 py-0.5 text-amber-100 cursor-pointer focus:outline-none focus:border-amber-500/60"
      >
        {SERVERS.map((s) => (
          <option key={s.code} value={s.code}>{s.label}</option>
        ))}
      </select>
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          loading ? "bg-amber-400 animate-pulse"
          : error ? "bg-rose-500"
          : fetchedAt ? "bg-emerald-500"
          : "bg-stone-500"
        }`}
        title={
          loading ? t("marketLoading")
          : error ? t("marketError")
          : fetchedAt ? t("marketUpdated", { age: formatAge(fetchedAt) })
          : t("marketNoData")
        }
      />
    </label>
  );
}

/**
 * Compact horizontal strip listing the sell-order-min price per city for one
 * item. Each cell shows the city abbreviation and the unit price, color-coded
 * by freshness. Hovering reveals the exact age, full city name, and subtotal.
 */
function PriceStrip({ entry, amount, loading, nowMs }) {
  const t = useTranslation();
  // nowMs comes from the parent so the component stays pure during render.
  const now = nowMs || 0;
  return (
    <div className="mt-2 pl-[60px] flex flex-wrap gap-1">
      {CITIES.map((c) => {
        const cell = entry?.byCity?.[c.code];
        const hasPrice = cell && cell.price > 0;
        const freshness = hasPrice ? priceFreshness(cell.updatedAtMs, now) : "none";
        const colorByFreshness = {
          fresh:  "text-emerald-300 border-emerald-700/40 bg-emerald-900/20",
          recent: "text-amber-300   border-amber-700/40   bg-amber-900/20",
          stale:  "text-rose-300    border-rose-700/40    bg-rose-900/20",
          none:   "text-stone-500   border-stone-700/40   bg-stone-800/30",
        };
        const tooltip = hasPrice
          ? t("marketTooltipPriced", {
              city: c.label,
              price: cell.price.toLocaleString(),
              amount: amount.toLocaleString(),
              total: (cell.price * amount).toLocaleString(),
              age: formatAge(cell.updatedAtMs, now),
            })
          : t("marketTooltipNoPrice", {
              city: c.label,
              state: loading ? t("marketLoadingShort") : t("marketNoRecentPrice"),
            });
        return (
          <div
            key={c.code}
            title={tooltip}
            className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${colorByFreshness[freshness]}`}
          >
            <span className="font-bold tracking-wide">{c.short}</span>
            <span className="tabular-nums">
              {hasPrice ? cell.price.toLocaleString() : (loading ? "…" : "—")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Bottom-of-shopping-list summary: total silver cost per city, plus a
 * "cheapest mix" grand total that picks the lowest price per item across cities.
 */
function CityTotalsRow({ totals, cheapestGrand }) {
  const tr = useTranslation();
  return (
    <div className="mt-3 pt-3 border-t border-amber-900/50">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
          {tr("estimatedTotalCost")}
        </span>
        <span
          className="text-sm font-bold text-emerald-300 tabular-nums"
          title={tr("cheapestMixTooltip")}
        >
          {tr("cheapestMix", {
            amount: cheapestGrand > 0 ? cheapestGrand.toLocaleString() : "—",
          })}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {CITIES.map((c) => {
          const cityTotals = totals[c.code];
          const hasAny = cityTotals.sum > 0;
          // Build tooltip from translation: "Banja total (3 items missing price data)"
          const baseTip = tr("cityTotalTooltip", { city: c.label });
          const missingTip =
            cityTotals.missing > 0
              ? " " + tr("cityTotalMissing", {
                  n: cityTotals.missing,
                  plural: cityTotals.missing === 1 ? "" : "s",
                })
              : "";
          return (
            <div
              key={c.code}
              title={baseTip + missingTip}
              className={`text-[11px] px-2 py-1 rounded border flex items-center gap-1.5 ${
                hasAny
                  ? "border-amber-700/40 bg-stone-800/50 text-amber-100"
                  : "border-stone-700/40 bg-stone-800/30 text-stone-500"
              }`}
            >
              <span className="font-bold tracking-wide">{c.short}</span>
              <span className="tabular-nums">
                {hasAny ? cityTotals.sum.toLocaleString() : "—"}
              </span>
              {cityTotals.missing > 0 && hasAny && (
                <span
                  className="text-rose-400/80 text-[9px]"
                  title={tr("cityTotalMissing", {
                    n: cityTotals.missing,
                    plural: cityTotals.missing === 1 ? "" : "s",
                  })}
                >
                  *
                </span>
              )}
            </div>
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
  const t = useTranslation();
  return (
    <label
      className="inline-flex items-center gap-2 text-xs text-amber-300/90 cursor-pointer select-none"
      title={cascadeMode ? t("cascadeTooltipOn") : t("cascadeTooltipOff")}
    >
      <input
        type="checkbox"
        checked={cascadeMode}
        onChange={(e) => setCascadeMode(e.target.checked)}
        className="w-3.5 h-3.5 accent-amber-400 cursor-pointer"
      />
      <span className="font-semibold">{t("cascadeToggleLabel")}</span>
      <span className="text-amber-500/60 text-[10px]">
        {cascadeMode ? t("cascadeOn") : t("cascadeOff")}
      </span>
    </label>
  );
}
