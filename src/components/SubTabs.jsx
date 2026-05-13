import { REFINED, RESOURCES } from "./constants";
import { iconUrl } from "./iconResolver";

/**
 * Sub-tab row for the picker. Shows the four material families for the
 * active top tab (Refined or Resource), each with a sample icon.
 */
export default function SubTabs({
  topTab,
  subTabRefined,
  setSubTabRefined,
  subTabResource,
  setSubTabResource,
}) {
  const families = topTab === "refined" ? REFINED : RESOURCES;
  const active = topTab === "refined" ? subTabRefined : subTabResource;
  const setActive = topTab === "refined" ? setSubTabRefined : setSubTabResource;

  return (
    <div className="flex border-b border-amber-900/30 bg-stone-900/50 px-2">
      {families.map((f) => {
        // Pick a sensible sample tier for the icon shown next to the label.
        const sample = iconUrl(
          f,
          f.hasT1 === false ? 2 : topTab === "refined" ? 2 : 1,
          0,
        );
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
