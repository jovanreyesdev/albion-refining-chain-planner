// =============================================================================
// Albion Online Data Project (AODP) market price client.
//
// AODP is a free, community-run mirror of Albion's in-game market data.
// Docs: https://www.albion-online-data.com/
//
// One endpoint covers everything we need:
//   GET https://{server}.albion-online-data.com/api/v2/stats/prices/
//       {comma-separated item IDs}.json?locations={cities}&qualities=1
//
// Per-server hostnames:
//   - Americas (West):  west.albion-online-data.com
//   - Europe:           europe.albion-online-data.com
//   - Asia:             east.albion-online-data.com
//
// We only ever query Normal quality (qualities=1). Feeders and raw mats are
// almost always sold at Normal — quality matters for gear, not crafting inputs.
// =============================================================================

export const SERVERS = [
  { code: "americas", label: "Americas", host: "west.albion-online-data.com" },
  { code: "europe",   label: "Europe",   host: "europe.albion-online-data.com" },
  { code: "asia",     label: "Asia",     host: "east.albion-online-data.com" },
];

// AODP city identifiers — match the strings the API expects in `locations`.
// Black Market (Caerleon's NPC fence) is omitted; players shop the city markets.
export const CITIES = [
  { code: "Bridgewatch",   label: "Bridgewatch",   short: "BW" },
  { code: "Caerleon",      label: "Caerleon",      short: "CRL" },
  { code: "Fort Sterling", label: "Fort Sterling", short: "FS" },
  { code: "Lymhurst",      label: "Lymhurst",      short: "LYM" },
  { code: "Martlock",      label: "Martlock",      short: "MAR" },
  { code: "Thetford",      label: "Thetford",      short: "THE" },
  { code: "Brecilien",     label: "Brecilien",     short: "BRC" },
];

/**
 * Build the AODP item ID for one shopping line.
 *
 * Format (from Albion's internal naming):
 *   Base (ench 0):     T{tier}_{FILEBASE}
 *   Enchanted (1..4):  T{tier}_{FILEBASE}_LEVEL{ench}@{ench}
 *
 * Examples:
 *   T4_ORE                 → T4 Copper Ore
 *   T5_ORE_LEVEL2@2        → T5.2 Iron Ore
 *   T4_METALBAR            → T4 Steel Bar
 *   T6_LEATHER_LEVEL1@1    → T6.1 Heavy Leather
 *
 * `family` here is the catalog entry from constants.js — it carries `fileBase`
 * (e.g., "ORE", "METALBAR") which is the suffix Albion uses internally.
 */
export function buildItemId(family, tier, ench) {
  const base = `T${tier}_${family.fileBase}`;
  if (!ench || ench === 0) return base;
  return `${base}_LEVEL${ench}@${ench}`;
}

/**
 * Fetch sell-order-min prices for a batch of items across all 7 cities,
 * Normal quality only.
 *
 * Returns a Map keyed by item ID. Each value is:
 *   { byCity: { [cityCode]: { price, updatedAtMs } }, anyData: boolean }
 *
 * If the request fails or returns nothing, returns an empty Map.
 * Callers should be defensive and treat missing entries as "price unknown".
 */
export async function fetchPrices({ itemIds, server, signal }) {
  if (!itemIds || itemIds.length === 0) return new Map();
  const host = (SERVERS.find((s) => s.code === server) || SERVERS[0]).host;
  // Dedupe — multiple shopping lines can share an item ID after grouping.
  const uniqueIds = [...new Set(itemIds)];
  const locations = CITIES.map((c) => encodeURIComponent(c.code)).join(",");
  // AODP accepts up to ~200 item IDs per request comfortably; our shopping
  // lists are well under that so a single request is fine.
  const url =
    `https://${host}/api/v2/stats/prices/` +
    `${uniqueIds.map(encodeURIComponent).join(",")}.json` +
    `?locations=${locations}&qualities=1`;

  let rows;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`AODP HTTP ${res.status}`);
    rows = await res.json();
  } catch (err) {
    // Abort is intentional (e.g., user changed server mid-flight). Anything
    // else is a real failure — return empty so the UI shows "—" rather than
    // crashing.
    if (err && err.name === "AbortError") throw err;
    console.warn("[marketApi] fetch failed:", err);
    return new Map();
  }

  const out = new Map();
  for (const row of rows || []) {
    // AODP row shape: { item_id, city, quality, sell_price_min,
    //                   sell_price_min_date, ... }
    if (!row || row.quality !== 1) continue;
    const id = row.item_id;
    const city = row.city;
    const price = Number(row.sell_price_min) || 0;
    const updatedAtMs = row.sell_price_min_date
      ? Date.parse(row.sell_price_min_date + "Z") // AODP timestamps are UTC, no TZ suffix
      : 0;
    if (!out.has(id)) out.set(id, { byCity: {}, anyData: false });
    const entry = out.get(id);
    // Skip entries the API returns as "no data" (price 0).
    if (price > 0) {
      entry.byCity[city] = { price, updatedAtMs };
      entry.anyData = true;
    } else if (!entry.byCity[city]) {
      // Keep a placeholder so we can show "—" without re-checking.
      entry.byCity[city] = { price: 0, updatedAtMs: 0 };
    }
  }
  return out;
}

/**
 * Bucket a price's age (in ms-since-update) into a freshness band.
 * Used by the UI to color-code per-city prices.
 *
 *   fresh:  < 1 hour    (green)   — trust this number
 *   recent: < 24 hours  (amber)   — probably fine but verify
 *   stale:  >= 24 hours (red)     — discount heavily
 *   none:   no data                — render as "—"
 */
export function priceFreshness(updatedAtMs, nowMs = Date.now()) {
  if (!updatedAtMs) return "none";
  const ageMs = nowMs - updatedAtMs;
  if (ageMs < 60 * 60 * 1000) return "fresh";
  if (ageMs < 24 * 60 * 60 * 1000) return "recent";
  return "stale";
}

/**
 * Human-readable "5 min ago" / "3 h ago" / "2 d ago" string.
 * Tiny custom formatter — we don't want to pull in a date library for one tooltip.
 */
export function formatAge(updatedAtMs, nowMs = Date.now()) {
  if (!updatedAtMs) return "no data";
  const ageMs = nowMs - updatedAtMs;
  const min = Math.round(ageMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const d = Math.round(hr / 24);
  return `${d} d ago`;
}
