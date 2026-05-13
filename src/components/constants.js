// =============================================================================
// Albion-related catalog data and lookup helpers.
// All constants tied to game mechanics (tiers, enchantments, resource families,
// refining recipe per tier) live here so the rest of the app doesn't repeat them.
// =============================================================================

// -------- Resource Catalog --------
// Each entry maps to its asset folder + filename convention.
// Refined: { dir: 'refined/<plural>', fileBase: 'TYPE' }
// Resource: { dir: 'resources/<plural>', fileBase: 'TYPE' }
export const REFINED = [
  { key: "metal_bars", label: "Metal Bars", short: "Bar",     dir: "refined/metal_bars", fileBase: "METALBAR" },
  { key: "leathers",   label: "Leather",    short: "Leather", dir: "refined/leathers",   fileBase: "LEATHER" },
  { key: "cloths",     label: "Cloth",      short: "Cloth",   dir: "refined/cloths",     fileBase: "CLOTH" },
  { key: "planks",     label: "Plank",      short: "Plank",   dir: "refined/planks",     fileBase: "PLANKS" },
];

export const RESOURCES = [
  { key: "ores",   label: "Ore",   short: "Ore",   dir: "resources/ores",   fileBase: "ORE",   hasT1: false },
  { key: "hides",  label: "Hide",  short: "Hide",  dir: "resources/hides",  fileBase: "HIDE",  hasT1: true },
  { key: "fibers", label: "Fiber", short: "Fiber", dir: "resources/fibers", fileBase: "FIBER", hasT1: false },
  { key: "woods",  label: "Wood",  short: "Wood",  dir: "resources/woods",  fileBase: "WOOD",  hasT1: true },
];

// Map refined family → matching raw family (for cascade math)
export const REFINED_TO_RAW = {
  metal_bars: "ores",
  leathers: "hides",
  cloths: "fibers",
  planks: "woods",
};
// And reverse
export const RAW_TO_REFINED = {
  ores: "metal_bars",
  hides: "leathers",
  fibers: "cloths",
  woods: "planks",
};

export const TIERS = [1, 2, 3, 4, 5, 6, 7, 8];
export const REFINING_TIERS = [2, 3, 4, 5, 6, 7, 8]; // refined items start at T2
export const ENCH_LEVELS = [0, 1, 2, 3, 4];

// Raw items required per refined unit at each tier (Albion recipe)
export const RAW_PER_TIER = { 2: 2, 3: 2, 4: 2, 5: 3, 6: 4, 7: 5, 8: 5 };

// Enchantment frame styling — loosely matches Albion's in-game border colors
export const ENCH_STYLE = {
  0: { label: "Base", border: "border-stone-400",   glow: "" },
  1: { label: ".1",   border: "border-emerald-400", glow: "shadow-[0_0_8px_rgba(16,185,129,0.6)]" },
  2: { label: ".2",   border: "border-sky-400",     glow: "shadow-[0_0_8px_rgba(14,165,233,0.6)]" },
  3: { label: ".3",   border: "border-violet-400",  glow: "shadow-[0_0_8px_rgba(139,92,246,0.6)]" },
  4: { label: ".4",   border: "border-amber-400",   glow: "shadow-[0_0_8px_rgba(245,158,11,0.6)]" },
};

export const tierLabel = (t, e) => (e === 0 ? `T${t}` : `T${t}.${e}`);
export const tierRoman = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII" };

// Enchantments only exist from T4 onward
export const enchAllowed = (tier, ench) => ench === 0 || tier >= 4;
