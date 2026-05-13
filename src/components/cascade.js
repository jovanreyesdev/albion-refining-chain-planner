// =============================================================================
// Cascade math — convert a flat list of inventory slots into per-chain refining
// plans. The plans include per-tier produced counts and shortfalls so the
// shopping list and breakdown UI can render without knowing the math.
// =============================================================================

import {
  RESOURCES, REFINED, REFINED_TO_RAW, RAW_TO_REFINED,
  TIERS, REFINING_TIERS, ENCH_LEVELS,
  RAW_PER_TIER, tierLabel,
} from "./constants";

/**
 * Build per-chain refining plans for every (resource × enchantment) combo.
 *
 * `cascadeMode` controls how shortfalls are calculated:
 *   - false: each tier is computed independently. The shortfall at tier T is
 *     "how many (T-1) refined feeders do I lack to refine my T raw?" Lower
 *     tiers' production does NOT count toward higher tiers' feeder needs.
 *
 *   - true: assumes the user buys every lower-tier shortfall and refines all
 *     the way up. Lower-tier production reduces higher-tier shortfalls.
 *     E.g., 70 T7 Hide + 300 T8 Hide: T7 step produces 14 T7 Leather (also
 *     requires buying 14 T6 Leather); that 14 T7 Leather then satisfies 14
 *     of the 60 T7 Leathers T8 needs, so net T7 shortfall = 46 (not 60).
 */
export function cascadeAllChains(slots, cascadeMode = false) {
  // Normalized inventory: inv[rawFamilyKey][ench][tier] = { raw, refined }
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
    // Albion rule: T1, T2, T3 only exist as base (.0). Enchantments start at T4.
    // The feeder for T4.x is T3 base (NOT T3.x — that item doesn't exist in game).
    // We run the base chain first to determine produced T3 base bars, then share
    // that T3 base pool across all enchanted T4 chains for the same resource.
    //
    // Order: .0 first, then .1, .2, .3, .4 — so T3 base is allocated in
    // enchantment order if it's scarce (the user can rearrange in practice).
    const basePlan = runChain({
      r,
      ench: 0,
      chainRaw: makeChainRaw(inv, r.key, 0),
      chainRefined: makeChainRefined(inv, r.key, 0),
      sharedT3BasePool: null,
      cascadeMode,
    });
    plans.push(basePlan);

    // T3 base pool available to enchanted chains = whatever's left in the base
    // chain's refinedAvail[3] (user-provided T3 base + base-chain-produced T3).
    let sharedT3BasePool = basePlan.refinedAvail[3] || 0;

    for (const e of [1, 2, 3, 4]) {
      const ePlan = runChain({
        r,
        ench: e,
        chainRaw: makeChainRaw(inv, r.key, e),
        chainRefined: makeChainRefined(inv, r.key, e),
        sharedT3BasePool,
        cascadeMode,
      });
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
 * For enchanted chains, T4.x's feeder is T3 BASE — shared across all .x chains
 * for the same resource. The caller passes `sharedT3BasePool` and we return
 * `sharedT3BasePoolRemaining` so the next enchanted chain knows what's left.
 */
function runChain({ r, ench, chainRaw, chainRefined, sharedT3BasePool, cascadeMode }) {
  const startTier = ench === 0 ? 2 : 4;
  const refinedAvail = { ...chainRefined };
  const steps = [];
  let sharedT3BasePoolRemaining = sharedT3BasePool;

  // Each tier's "gross demand" — how many refined units that tier could produce
  // if fed unlimited feeders. Equals floor(raw / perUnit).
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

    // Feeder enchantment level:
    //   - T4.x on an enchanted chain: feeder is T3 BASE (.0).
    //   - Otherwise: feeder is the same enchantment level as this chain.
    const feederUsesBase = ench !== 0 && t === 4;
    const feederEnchLevel = feederUsesBase ? 0 : ench;

    // Feeder count CURRENTLY available (from inventory + lower-tier chain output)
    const feederHaveOwned = !needsFeeder
      ? Infinity
      : feederUsesBase
        ? (sharedT3BasePoolRemaining || 0)
        : (refinedAvail[feederTier] || 0);

    const limitRaw = grossProduced[t];

    let produced, rawUsed, feederUsed, shortfallFeeder, shortfallRaw;
    let cascadeCredit = 0;
    let baseShortfall = 0;

    if (cascadeMode && needsFeeder) {
      // CASCADE MODE: assume the user buys whatever feeders are missing, so
      // every tier produces its full gross output. Shortfall = gross demand
      // minus currently-available feeders (which already includes any
      // lower-tier cascade output, since we process low → high).
      const grossFeederDemand = limitRaw;
      const feederAvailable = feederHaveOwned;
      produced = grossFeederDemand;
      rawUsed = produced * perUnit;
      feederUsed = produced;
      baseShortfall = grossFeederDemand;
      cascadeCredit = Math.min(feederAvailable, grossFeederDemand);
      shortfallFeeder = Math.max(0, grossFeederDemand - feederAvailable);
      shortfallRaw = 0;
    } else {
      // INDEPENDENT MODE: each tier only refines what its current feeders allow.
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
      baseShortfall = shortfallFeeder;
    }

    // Update refined pools. We cap actual consumption at what's truly owned so
    // we don't pretend bought feeders come from the inventory pool.
    refinedAvail[t] = (refinedAvail[t] || 0) + produced;
    if (needsFeeder) {
      if (feederUsesBase) {
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
      cascadeCredit,
      baseShortfall,
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
