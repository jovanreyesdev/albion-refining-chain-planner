import { useState } from "react";
import { ENCH_STYLE } from "./constants";
import { useTranslation } from "../i18n/useTranslation";

// Family key → translation key (for localized labels in the breakdown header)
const FAMILY_LABEL_KEY = {
  metal_bars: "famMetalBars", leathers: "famLeather",
  cloths: "famCloth", planks: "famPlank",
  ores: "famOre", hides: "famHide",
  fibers: "famFiber", woods: "famWood",
};

/**
 * Collapsed breakdown of every active chain's refining steps.
 * Mostly for verifying the math or debugging unusual scenarios.
 */
export default function PlansBreakdown({ plans }) {
  const t = useTranslation();
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
        {t("breakdownTitle")}
        <span className="text-xs font-normal text-amber-500/70">{t("breakdownActive", { n: active.length })}</span>
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
  const t = useTranslation();
  const style = ENCH_STYLE[plan.ench];
  const rawLabelLocal = t(FAMILY_LABEL_KEY[plan.rawFamily.key] || "") || plan.rawFamily.label;
  const refinedLabelLocal = t(FAMILY_LABEL_KEY[plan.refinedFamily.key] || "") || plan.refinedFamily.label;
  return (
    <div className="border border-stone-700/60 rounded overflow-hidden">
      <div className={`px-3 py-1.5 text-sm font-bold bg-stone-800/70 flex items-center gap-2 border-l-4 ${style.border}`}>
        <span className="text-amber-300">{style.label}</span>
        <span className="text-amber-100">{rawLabelLocal} → {refinedLabelLocal}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase text-amber-500/70 bg-stone-800/40 border-b border-stone-700/40">
              <th className="px-2 py-1.5">{t("breakdownTier")}</th>
              <th className="px-2 py-1.5">{t("breakdownRawUsed")}</th>
              <th className="px-2 py-1.5">{t("breakdownFeederUsed")}</th>
              <th className="px-2 py-1.5">{t("breakdownProduced")}</th>
              <th className="px-2 py-1.5">{t("breakdownLeftAfter")}</th>
              <th className="px-2 py-1.5">{t("breakdownNotes")}</th>
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
                    : <span className="text-amber-700/50 italic">{t("breakdownNone")}</span>}
                </td>
                <td className="px-2 py-1.5 font-semibold text-emerald-400">{s.produced}</td>
                <td className="px-2 py-1.5">{s.refinedAfter}</td>
                <td className="px-2 py-1.5">
                  {s.shortfallFeeder === 0 && s.shortfallRaw === 0 ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <span className="text-rose-300 text-[11px]">
                      {s.shortfallFeeder > 0 && t("breakdownNeedFeeder", { n: s.shortfallFeeder, tier: s.feederLabel })}
                      {s.shortfallFeeder > 0 && s.shortfallRaw > 0 && " · "}
                      {s.shortfallRaw > 0 && t("breakdownNeedRaw", { n: s.shortfallRaw, tier: s.rawSourceLabel })}
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
