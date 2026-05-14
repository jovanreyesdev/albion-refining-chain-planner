import { REFINED, RESOURCES } from "./constants";
import { iconUrl } from "./iconResolver";
import { useTranslation } from "../i18n/useTranslation";

// Map family keys to translation keys so the tab label can be localized
// while the underlying catalog (constants.js) stays language-agnostic.
const FAMILY_LABEL_KEY = {
  metal_bars: "famMetalBars",
  leathers: "famLeather",
  cloths: "famCloth",
  planks: "famPlank",
  ores: "famOre",
  hides: "famHide",
  fibers: "famFiber",
  woods: "famWood",
};

/**
 * Sub-tab row for the picker. Shows the four material families for the
 * active top tab (Refined or Resource), each with a sample icon.
 *
 * Visual treatment:
 *  - Sits on a darker recessed strip (consistent with TopTabs)
 *  - Active sub-tab gets a subtle inset highlight + glowing amber underline
 *  - Item icons get a slight drop-shadow so they pop off the dark background
 *
 * Mobile behaviour:
 *  - On narrow viewports the tabs share width equally (flex-1) and shrink
 *    their padding so all four fit without horizontal overflow.
 *  - As an extra safety net the row is horizontally scrollable, with the
 *    scrollbar hidden (see .sub-tabs-row in index.css).
 */
export default function SubTabs({
  topTab,
  subTabRefined,
  setSubTabRefined,
  subTabResource,
  setSubTabResource,
}) {
  const tr = useTranslation();
  const families = topTab === "refined" ? REFINED : RESOURCES;
  const active = topTab === "refined" ? subTabRefined : subTabResource;
  const setActive = topTab === "refined" ? setSubTabRefined : setSubTabResource;

  return (
    <div
      className="flex px-1.5 pt-1.5 gap-1 overflow-x-auto sub-tabs-row"
      style={{
        background:
          "linear-gradient(180deg, #150c06 0%, #1c1108 100%)",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(0,0,0,0.6)",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {families.map((f) => {
        // Pick a sensible sample tier for the icon shown next to the label.
        const sample = iconUrl(
          f,
          f.hasT1 === false ? 2 : topTab === "refined" ? 2 : 1,
          0,
        );
        const isActive = active === f.key;
        return (
          <button
            key={f.key}
            onClick={() => setActive(f.key)}
            className={`relative px-2 sm:px-3 py-1.5 text-xs font-bold flex-1 sm:flex-none sm:min-w-32 min-w-0 flex justify-center items-center gap-1.5 sm:gap-2 transition cursor-pointer rounded-t-md whitespace-nowrap
              ${isActive
                ? "text-amber-50"
                : "text-amber-700/90 hover:text-amber-200"}
            `}
            style={
              isActive
                ? {
                    background:
                      "linear-gradient(180deg, rgba(197,159,130,0.4) 0%, rgba(180,140,110,0.2) 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,220,180,0.3), inset 0 -1px 0 rgba(0,0,0,0.3)",
                    textShadow: "0 1px 2px rgba(0,0,0,0.7)",
                  }
                : {
                    textShadow: "0 1px 1px rgba(0,0,0,0.7)",
                  }
            }
          >
            {sample && (
              <img
                src={sample}
                alt=""
                className="w-6 h-6 object-contain"
                style={{
                  filter: isActive
                    ? "drop-shadow(0 1px 2px rgba(0,0,0,0.7))"
                    : "drop-shadow(0 1px 2px rgba(0,0,0,0.7)) grayscale(0.25) opacity(0.85)",
                }}
              />
            )}
            <span>{tr(FAMILY_LABEL_KEY[f.key] || "") || f.label}</span>
            {isActive && (
              <span
                className="absolute bottom-0 left-2 right-2 h-[2px] rounded-t"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, #F2B83B 30%, #FFD771 50%, #F2B83B 70%, transparent 100%)",
                  boxShadow: "0 0 6px rgba(242,184,59,0.6)",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
