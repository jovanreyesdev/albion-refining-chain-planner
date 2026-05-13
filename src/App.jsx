import { useState, useMemo, useEffect, useRef } from "react";
import invSlotBg from "./assets/inv-slot.jpg";
import buttonBg from "./assets/button.png";

// ============================================================================
// REFINING CHAIN PLANNER — Albion Online (Drag & Drop UI)
// Top tabs: Refined / Resource
// Sub-tabs: 4 material families each
// Picker grid: T1–T8 × Base/.1/.2/.3/.4 of actual item icons
// Drag item → inventory slot → prompt quantity → adds to inventory
// ============================================================================

// -------- Resource Catalog --------
// Each entry maps to its asset folder + filename convention.
// Refined: { raw: <type prop>, dir: 'refined/<plural>', fileBase: 'TYPE' }
// Resource: { dir: 'resources/<plural>', fileBase: 'TYPE' }
const REFINED = [
  { key: "metal_bars", label: "Metal Bars", short: "Bar",     dir: "refined/metal_bars", fileBase: "METALBAR" },
  { key: "leathers",   label: "Leather",    short: "Leather", dir: "refined/leathers",   fileBase: "LEATHER" },
  { key: "cloths",     label: "Cloth",      short: "Cloth",   dir: "refined/cloths",     fileBase: "CLOTH" },
  { key: "planks",     label: "Plank",      short: "Plank",   dir: "refined/planks",     fileBase: "PLANKS" },
];

const RESOURCES = [
  { key: "ores",   label: "Ore",   short: "Ore",   dir: "resources/ores",   fileBase: "ORE",   hasT1: false },
  { key: "hides",  label: "Hide",  short: "Hide",  dir: "resources/hides",  fileBase: "HIDE",  hasT1: true },
  { key: "fibers", label: "Fiber", short: "Fiber", dir: "resources/fibers", fileBase: "FIBER", hasT1: false },
  { key: "woods",  label: "Wood",  short: "Wood",  dir: "resources/woods",  fileBase: "WOOD",  hasT1: true },
];

// Map refined family → matching raw family (for cascade math)
const REFINED_TO_RAW = {
  metal_bars: "ores",
  leathers: "hides",
  cloths: "fibers",
  planks: "woods",
};
// And reverse
const RAW_TO_REFINED = {
  ores: "metal_bars",
  hides: "leathers",
  fibers: "cloths",
  woods: "planks",
};

const TIERS = [1, 2, 3, 4, 5, 6, 7, 8];
const REFINING_TIERS = [2, 3, 4, 5, 6, 7, 8]; // refined items start at T2
const ENCH_LEVELS = [0, 1, 2, 3, 4];

const RAW_PER_TIER = { 2: 2, 3: 2, 4: 2, 5: 3, 6: 4, 7: 5, 8: 5 };

const ENCH_STYLE = {
  0: { label: "Base", border: "border-stone-400",   glow: "" },
  1: { label: ".1",   border: "border-emerald-400", glow: "shadow-[0_0_8px_rgba(16,185,129,0.6)]" },
  2: { label: ".2",   border: "border-sky-400",     glow: "shadow-[0_0_8px_rgba(14,165,233,0.6)]" },
  3: { label: ".3",   border: "border-violet-400",  glow: "shadow-[0_0_8px_rgba(139,92,246,0.6)]" },
  4: { label: ".4",   border: "border-amber-400",   glow: "shadow-[0_0_8px_rgba(245,158,11,0.6)]" },
};

const tierLabel = (t, e) => (e === 0 ? `T${t}` : `T${t}.${e}`);
const tierRoman = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII" };

const enchAllowed = (tier, ench) => ench === 0 || tier >= 4;

// -------- Eagerly bundle all item icons via Vite --------
// import.meta.glob with { eager: true } means Vite resolves these at build time
// and we get a map { '/src/assets/items/.../T5_HIDE.png': '/assets/T5_HIDE-hash.png' }
const ICON_MODULES = import.meta.glob("./assets/items/**/*.png", { eager: true, import: "default" });

/**
 * Resolve an icon URL for a given (mode, family, tier, ench)
 * mode: "refined" | "resource"
 * family.dir tells us subpath, family.fileBase tells us TYPE name.
 *  - Base file:        `T{tier}_{TYPE}.png`
 *  - Enchanted file:   `T{tier}_{TYPE}_LEVEL{e}@{e}.png`
 */
function iconUrl(family, tier, ench) {
  const base = `./assets/items/${family.dir}/T${tier}_${family.fileBase}`;
  const suffix = ench === 0 ? ".png" : `_LEVEL${ench}@${ench}.png`;
  const key = `${base}${suffix}`;
  return ICON_MODULES[key] || null;
}

// =================================================================
// Inventory model
//   slot = { id, kind, familyKey, tier, ench, qty }
//   kind: "raw" | "refined"
// We persist the flat slot array to localStorage.
// =================================================================

const STORAGE_KEY = "rcp:slots:v2";
const SNAPSHOT_KEY = "rcp:snapshots:v2";

const newSlotId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function loadSlots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function loadSnapshots() {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "[]");
  } catch {
    return [];
  }
}

// =================================================================
// Cascade math — convert flat slot list → per-chain plans
//
// `cascadeMode` controls how shortfalls are calculated:
//   - false (default): each tier is computed independently. The shortfall at
//     tier T is "how many (T-1) refined feeders do I lack to refine my T raw?"
//     Lower tiers' production does NOT count toward higher tiers' feeder needs.
//
//   - true (cascade-all): assumes the user buys every lower-tier shortfall and
//     refines all the way up. Lower-tier production reduces higher-tier shortfalls.
//     E.g., 70 T7 Hide + 300 T8 Hide: T7 step produces 14 T7 Leather (which we
//     ALSO have to buy 14 T6 Leather for); that 14 T7 Leather then satisfies 14
//     of the 60 T7 Leathers T8 would need, so net T7 shortfall = 46 (not 60).
// =================================================================
function cascadeAllChains(slots, cascadeMode = false) {
  // Build a normalized inventory: inv[rawFamilyKey][ench][tier] = { raw, refined }
  const inv = {};
  for (const r of RESOURCES) {
    inv[r.key] = {};
    for (const e of ENCH_LEVELS) {
      inv[r.key][e] = {};
      for (const t of TIERS) inv[r.key][e][t] = { raw: 0, refined: 0 };
    }
  }
  for (const s of slots) {
    const rawFamilyKey =
      s.kind === "raw" ? s.familyKey : REFINED_TO_RAW[s.familyKey];
    if (!rawFamilyKey || !inv[rawFamilyKey]) continue;
    if (!inv[rawFamilyKey][s.ench]) continue;
    if (!inv[rawFamilyKey][s.ench][s.tier]) continue;
    if (s.kind === "raw") inv[rawFamilyKey][s.ench][s.tier].raw += s.qty;
    else inv[rawFamilyKey][s.ench][s.tier].refined += s.qty;
  }

  const plans = [];
  for (const r of RESOURCES) {
    // Important Albion rule: T1, T2, T3 only exist as base (.0). Enchantments start at T4.
    // The feeder for T4.x is T3 base (NOT T3.x — which doesn't exist in-game).
    // So we run the base chain (.0) FIRST to determine how many T3 base bars get produced,
    // then share that T3 base pool across all enchanted T4 chains for the same resource.
    //
    // Order: .0 first, then .1, .2, .3, .4 — so T3 base is allocated in enchantment order
    // if it's scarce (the user can rearrange in practice).

    // First, build the base chain (.0) — it's self-contained and produces T3, T4, T5… base bars.
    const basePlan = runChain({
      r,
      ench: 0,
      chainRaw: makeChainRaw(inv, r.key, 0),
      chainRefined: makeChainRefined(inv, r.key, 0),
      sharedT3Base: null, // base chain doesn't need a shared T3 pool — it produces its own
      cascadeMode,
    });
    plans.push(basePlan);

    // The T3 base pool available to enchanted chains is whatever's left after the base chain
    // ran (refinedAvail[3] in the base plan). This includes any user-provided T3 base bars
    // PLUS anything the base chain produced.
    let sharedT3BasePool = basePlan.refinedAvail[3] || 0;

    for (const e of [1, 2, 3, 4]) {
      const ePlan = runChain({
        r,
        ench: e,
        chainRaw: makeChainRaw(inv, r.key, e),
        chainRefined: makeChainRefined(inv, r.key, e),
        sharedT3BasePool, // pool available at start of this enchanted chain
        cascadeMode,
      });
      // Consume from the shared pool what this chain used at T4
      sharedT3BasePool = ePlan.sharedT3BasePoolRemaining;
      plans.push(ePlan);
    }
  }
  return plans;
}

// Helpers to extract a single (resource, ench) chain's raw and refined inventory
function makeChainRaw(inv, rKey, ench) {
  const chainRaw = {};
  for (const t of TIERS) chainRaw[t] = inv[rKey][ench][t].raw;
  return chainRaw;
}
function makeChainRefined(inv, rKey, ench) {
  const chainRefined = {};
  for (const t of TIERS) chainRefined[t] = inv[rKey][ench][t].refined;
  return chainRefined;
}

/**
 * Run cascade refining for a single (resource, enchantment) chain.
 *
 * For enchanted chains, T4.x's feeder is T3 BASE (which is shared across all .x chains
 * for the same resource). The caller passes `sharedT3BasePool` — the count of T3 base
 * bars currently available to spend on this chain's T4 step. After T4 runs, we return
 * `sharedT3BasePoolRemaining` so the next enchanted chain knows what's left.
 */
function runChain({ r, ench, chainRaw, chainRefined, sharedT3BasePool, cascadeMode }) {
  const startTier = ench === 0 ? 2 : 4;
  const refinedAvail = { ...chainRefined };
  const steps = [];
  let sharedT3BasePoolRemaining = sharedT3BasePool;

  // Pre-compute each tier's "gross demand" — how many refined units that tier
  // could produce if fed unlimited feeders. This equals floor(raw / perUnit).
  // In cascade mode, lower-tier gross production reduces higher-tier shortfalls.
  const grossProduced = {};
  for (const t of REFINING_TIERS) {
    if (t < startTier) continue;
    const rawSourceTier = t === 2 ? 1 : t;
    grossProduced[t] = Math.floor((chainRaw[rawSourceTier] || 0) / RAW_PER_TIER[t]);
  }

  for (const t of REFINING_TIERS) {
    if (t < startTier) continue;
    const perUnit = RAW_PER_TIER[t];
    const rawSourceTier = t === 2 ? 1 : t;
    const rawHave = chainRaw[rawSourceTier] || 0;
    const needsFeeder = t > 2;
    const feederTier = t - 1;

    // The feeder enchantment level:
    //   - For T4.x on an enchanted chain, feeder is T3 BASE (.0).
    //   - For all other (t,ench) combinations, feeder is the same enchantment level.
    const feederUsesBase = ench !== 0 && t === 4;
    const feederEnchLevel = feederUsesBase ? 0 : ench;

    // How many feeder bars are CURRENTLY available (from inventory + lower-tier
    // chain output)? Used for the "feederHave" display & non-cascade math.
    const feederHaveOwned = !needsFeeder
      ? Infinity
      : feederUsesBase
        ? (sharedT3BasePoolRemaining || 0)
        : (refinedAvail[feederTier] || 0);

    const limitRaw = grossProduced[t]; // floor(rawHave / perUnit)

    let produced, rawUsed, feederUsed, shortfallFeeder, shortfallRaw;
    let cascadeCredit = 0;     // for reasoning text — how much of feederHaveOwned was lower-tier cascade output
    let baseShortfall = 0;     // for reasoning text — gross feeder demand before subtracting owned

    if (cascadeMode && needsFeeder) {
      // CASCADE MODE: assume the user will buy whatever feeders are missing, so
      // every tier produces its full grossProduced[t]. Shortfall = gross demand
      // minus (currently-available feeders from owned + lower-tier cascade output).
      const grossFeederDemand = limitRaw; // 1 feeder per produced unit
      // The feeder available now comes from inventory + whatever lower tier produced.
      // In cascade mode, the lower tier produces grossProduced[t-1] regardless of its feeders.
      // BUT, feederHaveOwned already reflects what the cascade has accumulated up to here,
      // because we process tiers low → high and update refinedAvail[t] with grossProduced[t]
      // at each step (below). So feederHaveOwned IS the cascade-aware feeder count.
      const feederAvailable = feederHaveOwned;
      produced = grossFeederDemand; // assume we buy what's needed and refine all raw
      rawUsed = produced * perUnit;
      feederUsed = produced;
      baseShortfall = grossFeederDemand;
      cascadeCredit = Math.min(feederAvailable, grossFeederDemand);
      shortfallFeeder = Math.max(0, grossFeederDemand - feederAvailable);
      shortfallRaw = 0; // cascade mode never claims "buy more raw"; user's raw count is the cap
    } else {
      // INDEPENDENT MODE (original behavior): each tier only refines what its
      // currently-available feeders allow.
      const limitFeeder = needsFeeder ? feederHaveOwned : Infinity;
      produced = Math.min(limitRaw, limitFeeder);
      rawUsed = produced * perUnit;
      feederUsed = needsFeeder ? produced : 0;
      shortfallFeeder = 0;
      shortfallRaw = 0;
      if (needsFeeder && limitRaw > limitFeeder) shortfallFeeder = limitRaw - limitFeeder;
      if (needsFeeder && limitFeeder > limitRaw && limitFeeder !== Infinity) {
        shortfallRaw = (limitFeeder - limitRaw) * perUnit;
      }
      baseShortfall = shortfallFeeder; // same in independent mode
    }

    // Update refined pools — in BOTH modes, the produced output becomes available
    // for the next tier (whether produced via cascade-buying or actually-refined).
    refinedAvail[t] = (refinedAvail[t] || 0) + produced;
    if (needsFeeder) {
      if (feederUsesBase) {
        // Consume from shared T3 base pool, but cap at what's actually owned
        // (we don't pretend bought T3 base bars come from the pool).
        const consumeFromPool = Math.min(feederUsed, sharedT3BasePoolRemaining || 0);
        sharedT3BasePoolRemaining = (sharedT3BasePoolRemaining || 0) - consumeFromPool;
      } else {
        const consumeFromAvail = Math.min(feederUsed, refinedAvail[feederTier] || 0);
        refinedAvail[feederTier] = (refinedAvail[feederTier] || 0) - consumeFromAvail;
      }
    }

    steps.push({
      tier: t, ench,
      label: tierLabel(t, ench),
      rawSourceLabel: t === 2 ? `T1${ench === 0 ? "" : "." + ench}` : tierLabel(t, ench),
      perUnit, rawHave, rawUsed,
      feederTier: needsFeeder ? feederTier : null,
      feederLabel: needsFeeder ? tierLabel(feederTier, feederEnchLevel) : null,
      feederHave: needsFeeder ? feederHaveOwned : null,
      feederUsesBase,
      feederUsed, produced, shortfallFeeder, shortfallRaw,
      refinedAfter: refinedAvail[t],
      // Cascade-only fields (for human-readable reasons in the shopping list)
      cascadeCredit, // how many feeders came "for free" from lower-tier cascade
      baseShortfall, // the un-discounted shortfall (gross demand) at this tier
      cascadeMode,
    });
  }

  const hasInput = Object.values(chainRaw).some((v) => v > 0) ||
                   Object.values(chainRefined).some((v) => v > 0);

  return {
    rawFamily: r,
    refinedFamily: REFINED.find(f => f.key === RAW_TO_REFINED[r.key]),
    ench, steps, refinedAvail, hasInput,
    sharedT3BasePoolRemaining,
  };
}

// =================================================================
// Themed button (uses button.png as background)
// =================================================================
function ThemedButton({ children, onClick, className = "", title, variant = "default" }) {
  const variants = {
    default: "text-[#F2B83B]",
    danger: "text-rose-100",
    success: "text-emerald-100",
  };
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        backgroundImage: `url(${buttonBg})`,
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        textShadow: "0 1px 2px rgba(0,0,0,0.8)",
      }}
      className={`px-4 py-2 text-sm min-w-30 tracking-wide cursor-pointer hover:brightness-110 active:brightness-95 transition ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// =================================================================
// MAIN APP
// =================================================================
export default function App() {
  const [slots, setSlots] = useState(loadSlots);
  const [snapshots, setSnapshots] = useState(loadSnapshots);
  const [topTab, setTopTab] = useState("resource"); // "refined" | "resource"
  // Cascade mode: when ON, lower-tier output reduces higher-tier shortfalls (assuming
  // user buys all needed feeders). Persists in localStorage.
  const [cascadeMode, setCascadeMode] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("rcp:cascadeMode") || "true");
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try { localStorage.setItem("rcp:cascadeMode", JSON.stringify(cascadeMode)); } catch {}
  }, [cascadeMode]);
  const [subTabRefined, setSubTabRefined] = useState(REFINED[0].key);
  const [subTabResource, setSubTabResource] = useState(RESOURCES[0].key);
  const [draggingItem, setDraggingItem] = useState(null);
  const [qtyPrompt, setQtyPrompt] = useState(null); // { mode: "add"|"edit", slotId?, kind, familyKey, tier, ench, defaultQty }

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(slots)); } catch {}
  }, [slots]);
  useEffect(() => {
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots)); } catch {}
  }, [snapshots]);

  // --- Inventory mutations ---
  const addOrUpdateSlot = (kind, familyKey, tier, ench, qty) => {
    if (!qty || qty <= 0) return;
    // If a slot with same identity already exists, ADD to it
    setSlots((prev) => {
      const existing = prev.find(
        (s) => s.kind === kind && s.familyKey === familyKey && s.tier === tier && s.ench === ench
      );
      if (existing) {
        return prev.map((s) => s === existing ? { ...s, qty: s.qty + qty } : s);
      }
      return [...prev, { id: newSlotId(), kind, familyKey, tier, ench, qty }];
    });
  };

  const setSlotQty = (slotId, qty) => {
    if (qty <= 0) {
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      return;
    }
    setSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, qty } : s));
  };

  const removeSlot = (slotId) => setSlots((prev) => prev.filter((s) => s.id !== slotId));

  const clearAll = () => {
    if (slots.length === 0) return;
    if (!confirm("Clear all inventory?")) return;
    setSlots([]);
  };

  const saveSnapshot = () => {
    const name = prompt("Snapshot name:", `Inv ${new Date().toLocaleDateString()}`);
    if (!name) return;
    setSnapshots((prev) => [
      { id: Date.now(), name, slots: JSON.parse(JSON.stringify(slots)) },
      ...prev,
    ]);
  };

  const loadSnapshot = (id) => {
    const snap = snapshots.find((s) => s.id === id);
    if (!snap) return;
    if (!confirm(`Load "${snap.name}"? Current inventory will be replaced.`)) return;
    setSlots(snap.slots);
  };

  const deleteSnapshot = (id) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  // Export current inventory + computed shopping list as a downloadable JSON file.
  // Useful for testing the cascade math, sharing scenarios, or filing bug reports.
  const exportJson = () => {
    // Strip out the React-internal `id` from slot rows for a cleaner export,
    // and add human-readable labels alongside each entry.
    const inventory = slots.map((s) => {
      const family =
        s.kind === "raw"
          ? RESOURCES.find((r) => r.key === s.familyKey)
          : REFINED.find((r) => r.key === s.familyKey);
      return {
        kind: s.kind,
        family: family?.label || s.familyKey,
        familyKey: s.familyKey,
        tier: s.tier,
        ench: s.ench,
        label: `${tierLabel(s.tier, s.ench)} ${family?.short || s.familyKey}`,
        qty: s.qty,
      };
    });

    // Dedupe + sum identical items (e.g., T3 base bars requested by multiple
    // enchanted chains share a single pool — the user needs the SUM).
    // Mirrors the on-screen ShoppingList grouping so the export matches the UI.
    const shoppingGrouped = {};
    for (const it of shoppingItems) {
      const key = `${it.iconKind}-${it.iconFamily.key}-${it.iconTier}-${it.iconEnch}`;
      if (!shoppingGrouped[key]) {
        shoppingGrouped[key] = {
          kind: it.kind,
          family: it.iconFamily.label,
          familyKey: it.iconFamily.key,
          tier: it.iconTier,
          ench: it.iconEnch,
          label: it.label,
          amountNeeded: 0,
          reasons: [],
        };
      }
      shoppingGrouped[key].amountNeeded += it.amount;
      shoppingGrouped[key].reasons.push(it.reason);
    }
    const shoppingList = Object.values(shoppingGrouped);

    // Per-chain refining steps (only chains with any input)
    const refiningPlan = plans
      .filter((p) => p.hasInput)
      .map((p) => ({
        rawFamily: p.rawFamily.label,
        refinedFamily: p.refinedFamily.label,
        enchantment: p.ench,
        steps: p.steps.map((s) => ({
          tier: s.label,
          rawNeededPerUnit: s.perUnit,
          rawAvailable: s.rawHave,
          rawUsed: s.rawUsed,
          feederTier: s.feederLabel,
          feederAvailable: s.feederHave === Infinity ? null : s.feederHave,
          feederUsed: s.feederUsed,
          produced: s.produced,
          refinedRemainingAfter: s.refinedAfter,
          shortfallFeeder: s.shortfallFeeder,
          shortfallRaw: s.shortfallRaw,
        })),
      }));

    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      totals: {
        rawItems: totals.raw,
        refinedItems: totals.refined,
        willProduce: totals.produced,
      },
      inventory,
      refiningPlan,
      shoppingList,
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.href = url;
    a.download = `refining-plan-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Drop handler ---
  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggingItem) return;
    const { kind, familyKey, tier, ench } = draggingItem;
    setQtyPrompt({ mode: "add", kind, familyKey, tier, ench, defaultQty: 1 });
    setDraggingItem(null);
  };

  // --- Compute plans ---
  const plans = useMemo(() => cascadeAllChains(slots, cascadeMode), [slots, cascadeMode]);
  const shoppingItems = useMemo(() => {
    const items = [];
    for (const p of plans) {
      if (!p.hasInput) continue;
      for (const s of p.steps) {
        if (s.shortfallFeeder > 0) {
          // Feeder enchantment: T4.x feeds from T3 base (.0), everything else uses p.ench.
          const feederEnch = s.feederUsesBase ? 0 : p.ench;
          // Build a reason string. In cascade mode, show the math:
          //   "Need 46 T7 Leather (60 for T8 hide − 14 from T7 hide cascade)"
          let reason;
          if (s.cascadeMode && s.cascadeCredit > 0) {
            reason = `${s.baseShortfall} needed for ${s.label} ${p.rawFamily.short.toLowerCase()}, minus ${s.cascadeCredit} from lower-tier cascade`;
          } else {
            reason = `to refine remaining ${s.label} ${p.rawFamily.short.toLowerCase()}`;
          }
          items.push({
            kind: "refined",
            family: p.refinedFamily,
            ench: feederEnch,
            label: `${s.feederLabel} ${p.refinedFamily.short}`,
            amount: s.shortfallFeeder,
            reason,
            iconTier: s.feederTier,
            iconEnch: feederEnch,
            iconFamily: p.refinedFamily,
            iconKind: "refined",
          });
        }
        if (s.shortfallRaw > 0) {
          const rawTier = s.tier === 2 ? 1 : s.tier;
          items.push({
            kind: "raw",
            family: p.rawFamily,
            ench: p.ench,
            label: `${s.rawSourceLabel} ${p.rawFamily.short}`,
            amount: s.shortfallRaw,
            reason: `to fully use ${s.feederLabel} feeder`,
            iconTier: rawTier,
            iconEnch: p.ench,
            iconFamily: p.rawFamily,
            iconKind: "raw",
          });
        }
      }
    }
    return items;
  }, [plans]);

  // --- Totals ---
  const totals = useMemo(() => {
    let raw = 0, refined = 0;
    for (const s of slots) {
      if (s.kind === "raw") raw += s.qty;
      else refined += s.qty;
    }
    let produced = 0;
    for (const p of plans) for (const st of p.steps) produced += st.produced;
    return { raw, refined, produced };
  }, [slots, plans]);

  // Current family for picker
  const currentFamily =
    topTab === "refined"
      ? REFINED.find((f) => f.key === subTabRefined)
      : RESOURCES.find((f) => f.key === subTabResource);
  const currentKind = topTab === "refined" ? "refined" : "raw";

  // For refined picker, T1 doesn't exist. For raw picker, T1 depends on family.hasT1.
  const pickerTiers = topTab === "refined" ? REFINING_TIERS : TIERS;

  return (
    <div
      className="min-h-screen text-amber-50 p-4 sm:p-6"
      style={{
        background:
          "radial-gradient(ellipse at top, #2d2418 0%, #1a1410 50%, #0f0c08 100%)",
      }}
    >
      <div className="max-w-[1500px] mx-auto">
        {/* Header */}
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-amber-100" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}>
              Refining Chain Planner
            </h1>
            <p className="text-sm text-amber-200/70 mt-1 max-w-2xl">
              Drag items from the picker onto your inventory below. The cascade plan and shopping list update live.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <StatPill label="Raw" value={totals.raw} color="amber" />
            <StatPill label="Refined" value={totals.refined} color="sky" />
            <StatPill label="Will Produce" value={totals.produced} color="emerald" />
          </div>
        </header>

        {/* Picker + Inventory side-by-side on wide, stacked on narrow */}
        <div className="flex flex-col lg:flex-row gap-5 mb-5">
          {/* Picker — fixed natural width on wide screens */}
          <section className="bg-[#C59F82] border-[7px] border-[#AF7F61] overflow-hidden shadow-xl lg:shrink-0">
            <TopTabs topTab={topTab} setTopTab={setTopTab} />
            <SubTabs
              topTab={topTab}
              subTabRefined={subTabRefined}
              setSubTabRefined={setSubTabRefined}
              subTabResource={subTabResource}
              setSubTabResource={setSubTabResource}
            />
            <PickerGrid
              family={currentFamily}
              kind={currentKind}
              tiersToShow={pickerTiers}
              onDragStart={(item) => setDraggingItem(item)}
              onDragEnd={() => setDraggingItem(null)}
              onClickItem={(item) =>
                setQtyPrompt({ mode: "add", ...item, defaultQty: 1 })
              }
            />
          </section>

          {/* Inventory — fills remaining space on wide screens */}
          <section className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-amber-100">Your Inventory</h2>
              <div className="flex gap-2">
                <ThemedButton onClick={saveSnapshot} title="Save current inventory">Save</ThemedButton>
                <SnapshotMenu snapshots={snapshots} onLoad={loadSnapshot} onDelete={deleteSnapshot} />
                <ThemedButton onClick={exportJson} title="Export inventory + shopping list as JSON">Export</ThemedButton>
                <ThemedButton onClick={clearAll} variant="danger" title="Clear all items">Clear</ThemedButton>
              </div>
            </div>
            <div className="flex-1">
              <InventoryPanel
                slots={slots}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClickSlot={(slot) =>
                  setQtyPrompt({
                    mode: "edit",
                    slotId: slot.id,
                    kind: slot.kind,
                    familyKey: slot.familyKey,
                    tier: slot.tier,
                    ench: slot.ench,
                    defaultQty: slot.qty,
                  })
                }
                onRemoveSlot={removeSlot}
              />
            </div>
          </section>
        </div>

        {/* Shopping list */}
        <ShoppingList items={shoppingItems} cascadeMode={cascadeMode} setCascadeMode={setCascadeMode} />

        {/* Per-chain breakdown */}
        <PlansBreakdown plans={plans} />

        <footer className="mt-6 text-xs text-amber-700/60 text-center">
          T2 = T1 raw ×2 · T3+ = (T-1) refined + T raw (×2, ×2, ×3, ×4, ×5, ×5)
          <div className="mt-1">Inventory and snapshots are saved in your browser.</div>
        </footer>
      </div>

      {/* Quantity prompt modal */}
      {qtyPrompt && (
        <QtyModal
          prompt={qtyPrompt}
          onClose={() => setQtyPrompt(null)}
          onConfirm={(qty) => {
            if (qtyPrompt.mode === "add") {
              addOrUpdateSlot(qtyPrompt.kind, qtyPrompt.familyKey, qtyPrompt.tier, qtyPrompt.ench, qty);
            } else {
              setSlotQty(qtyPrompt.slotId, qty);
            }
            setQtyPrompt(null);
          }}
          onDelete={qtyPrompt.mode === "edit" ? () => {
            removeSlot(qtyPrompt.slotId);
            setQtyPrompt(null);
          } : null}
        />
      )}
    </div>
  );
}

// =================================================================
// Top Tabs
// =================================================================
function TopTabs({ topTab, setTopTab }) {
  return (
    <div className="flex border-b border-amber-900/40 bg-stone-950/70">
      {[
        { key: "resource", label: "Resource" },
        { key: "refined", label: "Refined" },
      ].map((t) => (
        <button
          key={t.key}
          onClick={() => setTopTab(t.key)}
          className={`px-6 py-2.5 text-sm font-bold tracking-wide transition relative cursor-pointer ${
            topTab === t.key
              ? "text-amber-200 bg-stone-800/60"
              : "text-amber-500/60 hover:text-amber-300 hover:bg-stone-800/30"
          }`}
        >
          {t.label}
          {topTab === t.key && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>
      ))}
    </div>
  );
}

// =================================================================
// Sub Tabs
// =================================================================
function SubTabs({ topTab, subTabRefined, setSubTabRefined, subTabResource, setSubTabResource }) {
  const families = topTab === "refined" ? REFINED : RESOURCES;
  const active = topTab === "refined" ? subTabRefined : subTabResource;
  const setActive = topTab === "refined" ? setSubTabRefined : setSubTabResource;

  return (
    <div className="flex border-b border-amber-900/30 bg-stone-900/50 px-2">
      {families.map((f) => {
        const sample = iconUrl(f, f.hasT1 === false ? 2 : (topTab === "refined" ? 2 : 1), 0);
        return (
          <button
            key={f.key}
            onClick={() => setActive(f.key)}
            className={`px-4 py-2 text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              active === f.key
                ? "text-amber-100 bg-stone-800/70 border-b-2 border-amber-400"
                : "text-amber-500/70 hover:text-amber-200"
            }`}
          >
            {sample && (
              <img src={sample} alt="" className="w-6 h-6 object-contain" />
            )}
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

// =================================================================
// Picker Grid — T1–T8 × Base/.1/.2/.3/.4
// =================================================================
function PickerGrid({ family, kind, tiersToShow, onDragStart, onDragEnd, onClickItem }) {
  return (
    <div className="p-3 overflow-x-auto">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="w-12"></th>
            {ENCH_LEVELS.map((e) => {
              const s = ENCH_STYLE[e];
              return (
                <th key={e} className={`px-2 py-1 text-xs font-bold text-amber-700`}>
                  {s.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {tiersToShow.map((t) => {
            // Render the T1 row for every family — even if the family has no T1 item
            // (ore/fiber). The T1 base cell shows as a dim empty slot in those cases,
            // which keeps the table height stable across sub-tab switches.
            const familyHasThisT1 = !(kind === "raw" && t === 1 && family.hasT1 === false);
            return (
              <tr key={t}>
                <td className="text-right pr-2 text-xs font-mono text-amber-900">
                  <div>{tierRoman[t]}</div>
                  <div className="text-[10px] text-amber-700">T{t}</div>
                </td>
                {ENCH_LEVELS.map((e) => {
                  // T1 has no enchantments — only the base column can ever be a real item.
                  const isT1 = t === 1;
                  const allowed = enchAllowed(t, e) && !(isT1 && e !== 0);
                  // If the family has no T1 (ore/fiber), the base cell is also dim.
                  if (!allowed || (isT1 && !familyHasThisT1)) {
                    return <td key={e} className="p-1"><EmptySlot dim /></td>;
                  }
                  const url = iconUrl(family, t, e);
                  return (
                    <td key={e} className="p-1">
                      <PickerSlot
                        url={url}
                        tier={t}
                        ench={e}
                        kind={kind}
                        familyKey={family.key}
                        familyLabel={family.short}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        onClick={() =>
                          onClickItem({
                            kind,
                            familyKey: family.key,
                            tier: t,
                            ench: e,
                          })
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =================================================================
// Picker Slot — draggable item icon over inv-slot background
// =================================================================
function PickerSlot({ url, tier, ench, kind, familyKey, familyLabel, onDragStart, onDragEnd, onClick }) {
  return (
    <div
      draggable={!!url}
      onDragStart={(ev) => {
        ev.dataTransfer.effectAllowed = "copy";
        ev.dataTransfer.setData("text/plain", JSON.stringify({ kind, familyKey, tier, ench }));
        onDragStart({ kind, familyKey, tier, ench });
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      title={`${tierLabel(tier, ench)} ${familyLabel} — drag to inventory or click to add`}
      className="relative w-14 h-14 rounded cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
      style={{
        backgroundImage: `url(${invSlotBg})`,
        backgroundSize: "100% 100%, 100% 100%",
      }}
    >
      {url ? (
        <img
          src={url}
          alt={tierLabel(tier, ench)}
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain p-0.5"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-amber-700/60 italic">
          missing
        </div>
      )}
    </div>
  );
}

function EmptySlot({ dim }) {
  // Dim slots get a darker overlay to indicate "not available" but remain visibly slot-shaped.
  return (
    <div
      className="w-14 h-14"
      style={{
        backgroundImage: `url(${invSlotBg})`,
        backgroundSize: dim
          ? "100% 100%, 100% 100%, 100% 100%"
          : "100% 100%, 100% 100%",
      }}
    />
  );
}

// =================================================================
// Inventory Panel — flat slot grid, drop target
// =================================================================
// Inventory uses CSS auto-fill so columns adapt to container width.
// Minimum slot size keeps slots looking like Albion's gear grid even when squeezed.
const INVENTORY_MIN_SLOT_PX = 64;
const INVENTORY_MIN_SLOTS = 48; // always show at least this many cells

function InventoryPanel({ slots, onDrop, onDragOver, onClickSlot, onRemoveSlot }) {
  // Always render extra empty slots so the panel feels like a real bag.
  // Pad to next row of 8 above the filled count, with a minimum floor.
  const padTo = Math.max(INVENTORY_MIN_SLOTS, Math.ceil((slots.length + 4) / 8) * 8);
  const filled = [...slots];
  while (filled.length < padTo) filled.push(null);

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="bg-[#C59F82] border-[7px] border-[#AF7F61] p-3 shadow-xl h-full"
    >
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${INVENTORY_MIN_SLOT_PX}px, 1fr))`,
        }}
      >
        {filled.map((slot, idx) =>
          slot ? (
            <FilledSlot
              key={slot.id}
              slot={slot}
              onClick={() => onClickSlot(slot)}
              onRemove={() => onRemoveSlot(slot.id)}
            />
          ) : (
            <EmptyInvSlot key={`empty-${idx}`} />
          )
        )}
      </div>
      {slots.length === 0 && (
        <div className="text-center text-amber-800 text-sm italic mt-3">
          Drag items from the picker into these slots, or click a picker item to add directly.
        </div>
      )}
    </div>
  );
}

function EmptyInvSlot() {
  return (
    <div
      className="aspect-square"
      style={{
        backgroundImage: `url(${invSlotBg})`,
        backgroundSize: "100% 100%, 100% 100%",
      }}
    />
  );
}

function FilledSlot({ slot, onClick, onRemove }) {
  const family =
    slot.kind === "raw"
      ? RESOURCES.find((r) => r.key === slot.familyKey)
      : REFINED.find((r) => r.key === slot.familyKey);
  const url = family ? iconUrl(family, slot.tier, slot.ench) : null;

  return (
    <div
      onClick={onClick}
      title={`${tierLabel(slot.tier, slot.ench)} ${family?.short || "?"} — click to edit, × to remove`}
      className="relative aspect-square cursor-pointer hover:scale-105 transition-transform group"
      style={{
        backgroundImage: `url(${invSlotBg})`,
        backgroundSize: "100% 100%, 100% 100%",
      }}
    >
      {url && (
        <img
          src={url}
          alt={tierLabel(slot.tier, slot.ench)}
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain p-0.5"
        />
      )}
      {/* Tier badge top-left */}
      <span className="absolute top-0.5 left-0.5 text-[10px] font-bold text-amber-200 bg-black/60 px-1 rounded">
        {tierRoman[slot.tier]}
      </span>
      {/* Qty bottom-right */}
      <span className="absolute bottom-0.5 right-0.5 text-xs font-bold text-white bg-black/70 px-1.5 rounded"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}>
        {slot.qty}
      </span>
      {/* Remove × on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-xs
          opacity-0 group-hover:opacity-100 transition flex items-center justify-center font-bold
          hover:bg-rose-500 shadow-md"
        title="Remove this item"
      >
        ×
      </button>
    </div>
  );
}

// =================================================================
// Quantity Modal
// =================================================================
function QtyModal({ prompt, onClose, onConfirm }) {
  const family =
    prompt.kind === "raw"
      ? RESOURCES.find((r) => r.key === prompt.familyKey)
      : REFINED.find((r) => r.key === prompt.familyKey);
  const url = family ? iconUrl(family, prompt.tier, prompt.ench) : null;

  const [qty, setQty] = useState(prompt.defaultQty || 1);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = () => onConfirm(parseInt(qty || "0", 10));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      {/* Albion-style modal: deep slate panel, soft golden inset border, rounded corners */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative p-6 border-1 border-[#595959] max-w-md w-full"
        style={{
          background: "linear-gradient(180deg, #2C2C2C 0%, #121110 100%)"
        }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="relative w-16 h-16 rounded border-2"
            style={{
              backgroundImage: `
                radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.5) 100%),
                url(${invSlotBg})
              `,
              backgroundSize: "100% 100%, 100% 100%",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6)",
            }}
          >
            {url && (
              <img src={url} alt="" className="absolute inset-0 w-full h-full object-contain p-0.5" />
            )}
          </div>
          <div>
            <div className="text-amber-100 font-bold text-lg" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
              {tierLabel(prompt.tier, prompt.ench)} {family?.short}
            </div>
            <div className="text-amber-400/80 text-xs uppercase tracking-wide">
              {prompt.kind === "raw" ? "Raw material" : "Refined"}
            </div>
          </div>
        </div>
        <label className="block text-amber-200/80 text-sm mb-1.5">Quantity</label>
        <input
          ref={inputRef}
          type="number"
          min="0"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onClose();
          }}
          className="w-full px-3 py-2 bg-slate-900/70 border border-amber-700/40 rounded text-amber-100 text-lg font-bold focus:outline-none focus:border-amber-400"
        />
        {/* Buttons: Delete on the far left, Cancel + Confirm on the far right.
            justify-between with a flex spacer keeps the two groups split apart like Albion's dialog. */}
        <div className="flex items-center mt-6">
          <div className="flex items-center justify-between w-full gap-6">
            <ThemedButton onClick={submit}>
              {prompt.mode === "add" ? "Yes" : "Save"}
            </ThemedButton>
            <ThemedButton onClick={onClose}>No</ThemedButton>
          </div>
        </div>
        <div className="text-amber-700/50 text-[10px] mt-4 text-center">
          Tip: Enter to confirm · Esc to cancel
        </div>
      </div>
    </div>
  );
}

// =================================================================
// Stat Pill
// =================================================================
function StatPill({ label, value, color }) {
  const colors = {
    amber:   "border-amber-600/50   bg-amber-900/30   text-amber-200",
    sky:     "border-sky-600/50     bg-sky-900/30     text-sky-200",
    emerald: "border-emerald-600/50 bg-emerald-900/30 text-emerald-200",
  };
  return (
    <div className={`px-3 py-1.5 rounded border ${colors[color]}`}>
      <div className="text-[9px] uppercase opacity-70">{label}</div>
      <div className="font-bold text-sm">{(value || 0).toLocaleString()}</div>
    </div>
  );
}

// =================================================================
// Shopping List
//
// Each item gets a checkbox so users can tick off purchases as they shop.
// The checked state is keyed by item identity (kind + family + tier + ench)
// and persisted to localStorage. When the inventory changes such that an
// item no longer appears in the shopping list, its checked state is forgotten.
// Toggling a checkbox visually crosses out the row and dims it.
// =================================================================
const SHOPPING_CHECKED_KEY = "rcp:shoppingChecked:v1";

function loadCheckedSet() {
  try {
    const arr = JSON.parse(localStorage.getItem(SHOPPING_CHECKED_KEY) || "[]");
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function shoppingItemKey(it) {
  return `${it.iconKind}-${it.iconFamily.key}-${it.iconTier}-${it.iconEnch}`;
}

function ShoppingList({ items, cascadeMode, setCascadeMode }) {
  // Dedupe + sort.
  // When multiple chains request the same item (e.g., T3 base bars needed by both
  // T4.2 and T4.3 chains, since they share the base T3 pool), we SUM the amounts —
  // the user has to buy enough to satisfy ALL the chains drawing from that pool.
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

  // Garbage-collect checked keys that no longer correspond to any shopping item.
  // (E.g., user added inventory that resolved a shortfall — that item is gone now.)
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

  // Persist whenever it changes
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

  // Reusable cascade-mode toggle (shown in both empty and populated states)
  const CascadeToggle = () => (
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

  if (items.length === 0) {
    return (
      <div className="mb-5 p-4 bg-emerald-900/30 border border-emerald-700/40 rounded-lg">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-emerald-200 text-sm">
            ✓ All balanced — nothing else to buy. (Or your inventory is empty.)
          </span>
          <CascadeToggle />
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
          <CascadeToggle />
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
              {/* Custom-styled checkbox */}
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleChecked(it.key)}
                className="w-4 h-4 shrink-0 accent-emerald-500 cursor-pointer"
                aria-label={`Mark ${it.label} as purchased`}
              />
              <div
                className={`relative w-12 h-12 rounded border-2 shrink-0 ${isChecked ? "grayscale" : ""}`}
                style={{ backgroundImage: `url(${invSlotBg})`, backgroundSize: "100% 100%" }}
              >
                {url && <img src={url} alt="" className="absolute inset-0 w-full h-full object-contain p-0.5" />}
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

// =================================================================
// Per-chain breakdown
// =================================================================
function PlansBreakdown({ plans }) {
  const [open, setOpen] = useState(false);
  const active = plans.filter((p) => p.hasInput);
  if (active.length === 0) return null;

  return (
    <div className="mb-5 bg-stone-900/60 border border-amber-900/40 rounded-lg shadow-xl">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-stone-800/50 text-amber-100 font-bold"
      >
        <span className="text-amber-400">{open ? "▼" : "▶"}</span>
        Per-chain breakdown
        <span className="text-xs font-normal text-amber-500/70">({active.length} active)</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {active.map((p, i) => (
            <ChainTable key={i} plan={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChainTable({ plan }) {
  const style = ENCH_STYLE[plan.ench];
  return (
    <div className="border border-stone-700/60 rounded overflow-hidden">
      <div className={`px-3 py-1.5 text-sm font-bold bg-stone-800/70 flex items-center gap-2 border-l-4 ${style.border}`}>
        <span className="text-amber-300">{style.label}</span>
        <span className="text-amber-100">{plan.rawFamily.label} → {plan.refinedFamily.label}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase text-amber-500/70 bg-stone-800/40 border-b border-stone-700/40">
              <th className="px-2 py-1.5">Tier</th>
              <th className="px-2 py-1.5">Raw used</th>
              <th className="px-2 py-1.5">Feeder used</th>
              <th className="px-2 py-1.5">Produced</th>
              <th className="px-2 py-1.5">Left after</th>
              <th className="px-2 py-1.5">Notes</th>
            </tr>
          </thead>
          <tbody>
            {plan.steps.map((s) => (
              <tr key={s.tier} className="border-b border-stone-800/40 text-amber-100/90">
                <td className="px-2 py-1.5 font-mono font-semibold">{s.label}</td>
                <td className="px-2 py-1.5">
                  {s.rawUsed}/{s.rawHave} {s.rawSourceLabel}
                  <span className="text-amber-800"> ({s.perUnit}/u)</span>
                </td>
                <td className="px-2 py-1.5">
                  {s.feederLabel
                    ? `${s.feederUsed}/${s.feederHave === Infinity ? "∞" : s.feederHave} ${s.feederLabel}`
                    : <span className="text-amber-700/50 italic">none</span>}
                </td>
                <td className="px-2 py-1.5 font-semibold text-emerald-400">{s.produced}</td>
                <td className="px-2 py-1.5">{s.refinedAfter}</td>
                <td className="px-2 py-1.5">
                  {s.shortfallFeeder === 0 && s.shortfallRaw === 0 ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <span className="text-rose-300 text-[11px]">
                      {s.shortfallFeeder > 0 && `Need ${s.shortfallFeeder} ${s.feederLabel} ref`}
                      {s.shortfallFeeder > 0 && s.shortfallRaw > 0 && " · "}
                      {s.shortfallRaw > 0 && `Need ${s.shortfallRaw} ${s.rawSourceLabel} raw`}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =================================================================
// Snapshot menu
// =================================================================
function SnapshotMenu({ snapshots, onLoad, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <ThemedButton onClick={() => setOpen(!open)}>
        Snapshots {snapshots.length > 0 && `(${snapshots.length})`}
      </ThemedButton>
      {open && (
        <div className="absolute right-0 mt-1 w-72 bg-stone-900 border border-amber-700/40 rounded shadow-2xl z-30 max-h-80 overflow-y-auto">
          {snapshots.length === 0 ? (
            <div className="px-3 py-3 text-xs text-amber-500/60 italic">
              No snapshots yet.
            </div>
          ) : (
            <ul className="divide-y divide-stone-800">
              {snapshots.map((s) => (
                <li key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-stone-800/60">
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
