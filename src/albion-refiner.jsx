import { useState, useMemo } from "react";

// Albion Online Refining Calculator
// Recipe pattern (same for Leather/Cloth/Plank/Metal Bars):
//   T2 = T1 raw x2
//   T3 = T2 refined x1 + T3 raw x2
//   T4 = T3 refined x1 + T4 raw x2
//   T5 = T4 refined x1 + T5 raw x3
//   T6 = T5 refined x1 + T6 raw x4
//   T7 = T6 refined x1 + T7 raw x5
//   T8 = T7 refined x1 + T8 raw x5
//
// Enchantments (.0 = base, .1, .2, .3, .4) start at T4 in Albion.
// Each enchantment level is its own cascade — T5.1 needs T4.1 refined and T5.1 raw.
// T2 and T3 only exist as base (.0).

const RESOURCES = [
  { key: "ore",   raw: "Ore",   refined: "Metal Bar" },
  { key: "hide",  raw: "Hide",  refined: "Leather" },
  { key: "fiber", raw: "Fiber", refined: "Cloth" },
  { key: "wood",  raw: "Wood",  refined: "Plank" },
];

const TIERS = [2, 3, 4, 5, 6, 7, 8];
const ENCHANT_LEVELS = [0, 1, 2, 3, 4]; // .0 = base

// Raw material count required at each tier
const RAW_PER_TIER = { 2: 2, 3: 2, 4: 2, 5: 3, 6: 4, 7: 5, 8: 5 };

// Tier label, e.g. "T5.1" or "T3"
const tierLabel = (tier, ench) => (ench === 0 ? `T${tier}` : `T${tier}.${ench}`);

// Enchantments only exist from T4 onward
const enchantAllowed = (tier, ench) => ench === 0 || tier >= 4;

// Build an empty inventory object: inventory[resourceKey][tier][ench] = number
const emptyInventory = () => {
  const inv = {};
  for (const r of RESOURCES) {
    inv[r.key] = {};
    for (const t of TIERS) {
      inv[r.key][t] = {};
      for (const e of ENCHANT_LEVELS) {
        inv[r.key][t][e] = 0;
      }
    }
  }
  return inv;
};

/**
 * Cascade refining for a single (resource, enchantment) chain.
 *
 * Inventory is indexed by tier for the given enchantment level.
 * rawInv[t]      = raw items of tier t (e.g. T5.1 Hide)
 * refinedInv[t]  = pre-existing refined items of tier t (e.g. T5.1 Leather you already own)
 *
 * For enchanted chains (ench > 0), the chain only exists from T4 onward, so
 * we start refining at T4. The "previous-tier refined" for T4.x is T3 (base) refined.
 * Per the problem statement, the user wants pure-enchantment chains: we feed T3 base
 * into the enchanted T4 step only if the user supplies it; otherwise it's a shortfall.
 */
function cascade({ rawInv, refinedInv, ench }) {
  // Determine which tier the chain starts at:
  //  - base chain (.0) starts at T2 (T1 raw -> T2 refined)
  //  - enchanted chain (.x) starts at T4 (needs T3 refined of SAME enchantment level,
  //    but T3 only exists as base; treat T3 refined inventory as the feeder for T4.x as well)
  const startTier = ench === 0 ? 2 : 4;

  const steps = []; // human-readable per-tier breakdown
  // refinedAvailable[t] = how many refined of tier t we currently have access to
  const refinedAvailable = {};
  for (const t of TIERS) refinedAvailable[t] = refinedInv[t] || 0;

  // For T2: input is T1 raw. T1 raw lives in rawInv[1] — but TIERS starts at 2.
  // We treat rawInv[1] separately (the "T1 raw" slot the UI exposes for base chains only).
  // Higher tiers consume rawInv[t] of the matching tier.

  for (const t of TIERS) {
    if (t < startTier) continue;

    const rawNeededPerUnit = RAW_PER_TIER[t];
    // For T2, the raw is T1 (one tier below). For T3+, the raw is the SAME tier.
    // (In Albion, T2 Bar = 2 T1 Ore. T3 Bar = 1 T2 Bar + 2 T3 Ore. T4 = 1 T3 Bar + 2 T4 Ore. Etc.)
    const rawSourceTier = t === 2 ? 1 : t;
    const rawHave = rawInv[rawSourceTier] || 0;

    // Refined feeder requirement:
    //  - T2 needs no refined feeder.
    //  - T3+ needs 1 refined of tier (t-1) per unit produced.
    const needsFeeder = t > 2;
    const feederTier = t - 1;
    const feederHave = needsFeeder ? (refinedAvailable[feederTier] || 0) : Infinity;

    // How many units of tier t can we produce?
    // Limit 1: raw / rawNeededPerUnit
    // Limit 2: feeder (if needed) — 1 per unit
    const limitFromRaw = Math.floor(rawHave / rawNeededPerUnit);
    const limitFromFeeder = needsFeeder ? feederHave : Infinity;
    const produced = Math.min(limitFromRaw, limitFromFeeder);

    // Consume inputs
    const rawConsumed = produced * rawNeededPerUnit;
    const feederConsumed = needsFeeder ? produced : 0;

    // Track shortfall: what would we need to fully use the raw on hand?
    // If feeder is the bottleneck, user needs more feeder (i.e. lower-tier refined).
    // If raw is the bottleneck (or there's no raw), there's no shortfall to report at this tier.
    let shortfallFeeder = 0;
    let shortfallRaw = 0;
    if (needsFeeder && limitFromRaw > limitFromFeeder) {
      // We have extra raw we can't refine because we lack feeder
      shortfallFeeder = limitFromRaw - limitFromFeeder;
    }
    if (needsFeeder && limitFromFeeder > limitFromRaw && limitFromFeeder !== Infinity) {
      // We have extra feeder we can't use because we lack raw at this tier
      shortfallRaw = (limitFromFeeder - limitFromRaw) * rawNeededPerUnit;
    }

    // Update available refined for next tier
    refinedAvailable[t] = (refinedAvailable[t] || 0) + produced;
    if (needsFeeder) {
      refinedAvailable[feederTier] = (refinedAvailable[feederTier] || 0) - feederConsumed;
    }

    steps.push({
      tier: t,
      label: tierLabel(t, ench),
      rawSourceTier,
      rawSourceLabel: t === 2 ? `T1${ench === 0 ? "" : "." + ench}` : tierLabel(t, ench),
      rawNeededPerUnit,
      rawHave,
      rawConsumed,
      feederTier: needsFeeder ? feederTier : null,
      feederLabel: needsFeeder ? tierLabel(feederTier, ench) : null,
      feederHave: needsFeeder ? feederHave : null,
      feederConsumed,
      produced,
      shortfallFeeder, // refined of tier (t-1) we'd need to fully use the raw
      shortfallRaw,    // raw of tier t we'd need to buy to fully use available feeder
      refinedRemainingAfter: refinedAvailable[t],
    });
  }

  return { steps, finalRefined: refinedAvailable };
}

function NumberInput({ value, onChange, ...rest }) {
  return (
    <input
      type="number"
      min="0"
      value={value || ""}
      onChange={(e) => onChange(Math.max(0, parseInt(e.target.value || "0", 10)))}
      className="w-20 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      placeholder="0"
      {...rest}
    />
  );
}

export default function AlbionRefiner() {
  // rawInventory[resourceKey][tier][ench] — note tier 1 is allowed here (raw only)
  const [rawInventory, setRawInventory] = useState(() => {
    const inv = emptyInventory();
    // Add a T1 raw slot for each resource (base only)
    for (const r of RESOURCES) inv[r.key][1] = { 0: 0 };
    return inv;
  });
  // refinedInventory[resourceKey][tier][ench] — pre-existing refined items
  const [refinedInventory, setRefinedInventory] = useState(() => emptyInventory());
  const [activeResource, setActiveResource] = useState("ore");
  const [activeEnch, setActiveEnch] = useState(0);

  const setRaw = (rKey, tier, ench, val) => {
    setRawInventory((prev) => {
      const next = { ...prev, [rKey]: { ...prev[rKey], [tier]: { ...prev[rKey][tier], [ench]: val } } };
      return next;
    });
  };

  const setRefined = (rKey, tier, ench, val) => {
    setRefinedInventory((prev) => {
      const next = { ...prev, [rKey]: { ...prev[rKey], [tier]: { ...prev[rKey][tier], [ench]: val } } };
      return next;
    });
  };

  // Compute cascade for the active resource + enchantment view
  const result = useMemo(() => {
    const rawInv = {};
    const refinedInv = {};
    for (const t of TIERS) {
      rawInv[t] = rawInventory[activeResource][t]?.[activeEnch] || 0;
      refinedInv[t] = refinedInventory[activeResource][t]?.[activeEnch] || 0;
    }
    // T1 raw only exists for base (.0)
    rawInv[1] = activeEnch === 0 ? (rawInventory[activeResource][1]?.[0] || 0) : 0;
    return cascade({ rawInv, refinedInv, ench: activeEnch });
  }, [rawInventory, refinedInventory, activeResource, activeEnch]);

  const resourceMeta = RESOURCES.find((r) => r.key === activeResource);

  // Tiers to display rows for in the inventory grid
  const inventoryTiers = activeEnch === 0 ? [1, 2, 3, 4, 5, 6, 7, 8] : [4, 5, 6, 7, 8];

  const clearAll = () => {
    setRawInventory(() => {
      const inv = emptyInventory();
      for (const r of RESOURCES) inv[r.key][1] = { 0: 0 };
      return inv;
    });
    setRefinedInventory(emptyInventory());
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Albion Refining Calculator</h1>
          <p className="text-sm text-slate-600 mt-1">
            Enter your raw and refined inventory, then see the cascade plan: what you can refine now,
            what shortfalls you have, and how many lower-tier items you need to buy to fully refine the next tier.
          </p>
        </header>

        {/* Resource + enchantment selectors */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase">Resource:</span>
            <div className="flex rounded-md overflow-hidden border border-slate-300">
              {RESOURCES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setActiveResource(r.key)}
                  className={`px-3 py-1.5 text-sm font-medium transition ${
                    activeResource === r.key
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {r.raw} → {r.refined}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase">Enchant:</span>
            <div className="flex rounded-md overflow-hidden border border-slate-300">
              {ENCHANT_LEVELS.map((e) => (
                <button
                  key={e}
                  onClick={() => setActiveEnch(e)}
                  className={`px-3 py-1.5 text-sm font-medium transition ${
                    activeEnch === e
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {e === 0 ? "Base" : `.${e}`}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={clearAll}
            className="ml-auto px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
          >
            Clear all
          </button>
        </div>

        {/* Inventory entry */}
        <section className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Your inventory — {resourceMeta.raw} / {resourceMeta.refined}{" "}
            {activeEnch === 0 ? "(Base)" : `(.${activeEnch} enchantment)`}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm font-medium text-slate-500 px-2 mb-1">
            <div>Tier</div>
            <div>Raw {resourceMeta.raw}</div>
            <div>Refined {resourceMeta.refined}</div>
          </div>
          {inventoryTiers.map((t) => {
            const isT1 = t === 1;
            return (
              <div
                key={t}
                className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center px-2 py-1.5 border-t border-slate-100"
              >
                <div className="font-mono text-sm text-slate-700">{tierLabel(t, activeEnch)}</div>
                <div>
                  <NumberInput
                    value={
                      isT1
                        ? rawInventory[activeResource][1]?.[0] || 0
                        : rawInventory[activeResource][t]?.[activeEnch] || 0
                    }
                    onChange={(v) =>
                      isT1
                        ? setRaw(activeResource, 1, 0, v)
                        : setRaw(activeResource, t, activeEnch, v)
                    }
                  />
                </div>
                <div>
                  {isT1 ? (
                    <span className="text-xs text-slate-400 italic">— (T1 has no refined form)</span>
                  ) : (
                    <NumberInput
                      value={refinedInventory[activeResource][t]?.[activeEnch] || 0}
                      onChange={(v) => setRefined(activeResource, t, activeEnch, v)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Cascade plan */}
        <section className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Refining plan — {tierLabel(0, 0) /* placeholder */ /* not used */} {""}
            <span className="text-slate-400 font-normal">
              ({resourceMeta.refined}, {activeEnch === 0 ? "Base" : `.${activeEnch}`})
            </span>
          </h2>

          {result.steps.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing to refine yet — enter some inventory above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3">Tier</th>
                    <th className="py-2 pr-3">Raw used</th>
                    <th className="py-2 pr-3">Refined feeder</th>
                    <th className="py-2 pr-3">Produced</th>
                    <th className="py-2 pr-3">Refined left after</th>
                    <th className="py-2 pr-3">Shortfalls</th>
                  </tr>
                </thead>
                <tbody>
                  {result.steps.map((s) => (
                    <tr key={s.tier} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-3 font-mono font-semibold text-slate-800">{s.label}</td>
                      <td className="py-2 pr-3">
                        <span className="text-slate-700">
                          {s.rawConsumed} / {s.rawHave} {s.rawSourceLabel} {resourceMeta.raw}
                        </span>
                        <div className="text-xs text-slate-400">
                          (needs {s.rawNeededPerUnit} per unit)
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        {s.feederLabel ? (
                          <>
                            <span className="text-slate-700">
                              {s.feederConsumed} / {s.feederHave === Infinity ? "∞" : s.feederHave}{" "}
                              {s.feederLabel} {resourceMeta.refined}
                            </span>
                            <div className="text-xs text-slate-400">(1 per unit)</div>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">none</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 font-semibold text-emerald-700">{s.produced}</td>
                      <td className="py-2 pr-3 text-slate-600">{s.refinedRemainingAfter}</td>
                      <td className="py-2 pr-3 text-xs">
                        {s.shortfallFeeder === 0 && s.shortfallRaw === 0 ? (
                          <span className="text-emerald-600">✓ balanced</span>
                        ) : (
                          <div className="space-y-1">
                            {s.shortfallFeeder > 0 && (
                              <div className="text-amber-700">
                                Need <b>{s.shortfallFeeder}</b> more {s.feederLabel} {resourceMeta.refined}{" "}
                                to use all raw on hand
                              </div>
                            )}
                            {s.shortfallRaw > 0 && (
                              <div className="text-rose-700">
                                Need <b>{s.shortfallRaw}</b> more {s.rawSourceLabel} {resourceMeta.raw}{" "}
                                to use all feeder
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Shopping list summary */}
          <ShoppingSummary steps={result.steps} resourceMeta={resourceMeta} ench={activeEnch} />
        </section>

        <footer className="mt-6 text-xs text-slate-400">
          Recipe: T2 = T1 raw ×2 · T3 = T2 ref + T3 raw ×2 · T4 = T3 ref + T4 raw ×2 ·
          T5 = T4 ref + T5 raw ×3 · T6 = T5 ref + T6 raw ×4 · T7 = T6 ref + T7 raw ×5 ·
          T8 = T7 ref + T8 raw ×5
        </footer>
      </div>
    </div>
  );
}

function ShoppingSummary({ steps, resourceMeta, ench }) {
  // Aggregate shortfalls into a clean shopping list
  const items = [];
  for (const s of steps) {
    if (s.shortfallFeeder > 0) {
      items.push({
        type: "feeder",
        label: `${s.feederLabel} ${resourceMeta.refined}`,
        amount: s.shortfallFeeder,
        reason: `to refine remaining ${s.label} raw`,
      });
    }
    if (s.shortfallRaw > 0) {
      items.push({
        type: "raw",
        label: `${s.rawSourceLabel} ${resourceMeta.raw}`,
        amount: s.shortfallRaw,
        reason: `to consume available ${s.feederLabel} feeder for ${s.label}`,
      });
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
      <div className="text-xs font-semibold uppercase text-amber-800 mb-2">Shopping list</div>
      <ul className="text-sm space-y-1">
        {items.map((i, idx) => (
          <li key={idx} className="text-amber-900">
            • Buy <b>{i.amount}</b> {i.label} <span className="text-amber-700 text-xs">— {i.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
