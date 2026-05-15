// =============================================================================
// Icon resolver: maps (family, tier, enchantment) → bundled image URL.
//
// Vite's import.meta.glob with { eager: true } resolves every PNG under
// assets/items at build time. The result is a plain object keyed by the
// virtual path Vite uses, so iconUrl() just looks up the right key.
// =============================================================================

// NOTE: This file lives at src/components/, so the glob path goes up one folder.
const ICON_MODULES = import.meta.glob("../assets/items/**/*.png", {
  eager: true,
  import: "default",
});

/**
 * Resolve an icon URL for a given (family, tier, ench).
 *
 *  - Base file:        `T{tier}_{TYPE}.png`
 *  - Enchanted file:   `T{tier}_{TYPE}_LEVEL{e}@{e}.png`
 *
 * Returns null if no matching asset is bundled.
 */
export function iconUrl(family, tier, ench) {
  const base = `../assets/items/${family.dir}/T${tier}_${family.fileBase}`;
  const suffix = ench === 0 ? ".png" : `_LEVEL${ench}@${ench}.png`;
  const key = `${base}${suffix}`;
  return ICON_MODULES[key] || null;
}

/**
 * Warm the browser cache by issuing Image() requests for every bundled icon.
 * Call once during app startup so subsequent tab switches in the picker show
 * icons instantly without a skeleton flash.
 *
 * Idempotent — safe to call multiple times; the second call hits cache and
 * returns immediately for each URL.
 */
let _preloadStarted = false;
export function preloadAllIcons() {
  if (_preloadStarted) return;
  _preloadStarted = true;
  // Spread across microtasks so we don't hog the main thread on slow devices.
  // Loading is parallelizable — the browser will queue/prioritize as needed.
  Object.values(ICON_MODULES).forEach((url) => {
    if (!url) return;
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  });
}
