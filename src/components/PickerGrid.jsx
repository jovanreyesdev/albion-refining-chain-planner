import { useEffect, useRef, useState } from "react";
import invSlotBg from "../assets/inv-slot.jpg";
import {
  ENCH_LEVELS, ENCH_STYLE, tierLabel, tierRoman, enchAllowed,
} from "./constants";
import { iconUrl } from "./iconResolver";

/**
 * The big picker grid: rows = tiers, columns = enchantment levels.
 * Items are draggable; clicking adds directly via the qty prompt.
 */
export default function PickerGrid({
  family, kind, tiersToShow,
  onDragStart, onDragEnd, onClickItem,
}) {
  return (
    <div className="p-3 overflow-x-auto">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="w-12"></th>
            {ENCH_LEVELS.map((e) => {
              const s = ENCH_STYLE[e];
              return (
                <th key={e} className="px-2 py-1 text-xs font-bold text-amber-700">
                  {s.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {tiersToShow.map((t) => {
            // Render the T1 row for every family — even if the family has no
            // T1 item (ore/fiber). The T1 base cell shows as dim in those cases,
            // which keeps the table height stable across sub-tab switches.
            const familyHasThisT1 = !(kind === "raw" && t === 1 && family.hasT1 === false);
            return (
              <tr key={t}>
                <td className="text-right pr-2 text-xs font-mono text-amber-900">
                  <div>{tierRoman[t]}</div>
                  <div className="text-[10px] text-amber-700">T{t}</div>
                </td>
                {ENCH_LEVELS.map((e) => {
                  // T1 has no enchantments — only the base column is real.
                  const isT1 = t === 1;
                  const allowed = enchAllowed(t, e) && !(isT1 && e !== 0);
                  if (!allowed || (isT1 && !familyHasThisT1)) {
                    return (
                      <td key={e} className="p-1">
                        <EmptySlot dim />
                      </td>
                    );
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

/** Draggable item icon over the inventory-slot background. */
function PickerSlot({
  url, tier, ench, kind, familyKey, familyLabel,
  onDragStart, onDragEnd, onClick,
}) {
  // Track per-image load state so we can fade in once the icon decodes.
  // Resets to `false` whenever the URL changes (e.g., when the user switches
  // sub-tabs or top-tabs and a different family's icons are mounted).
  // We also check `.complete` so cache-hit images don't show a skeleton flash.
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    setLoaded(false);
    // If the browser already has the image cached, the onLoad event may not
    // fire — check `.complete` synchronously after mount and skip the skeleton.
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [url]);

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
        <>
          {/* Skeleton: shown until the icon's onLoad fires. Uses a soft pulse so
              it reads as "loading" rather than "broken." Sized to match the icon. */}
          {!loaded && (
            <div className="absolute inset-0 p-0.5">
              <div className="w-full h-full rounded animate-pulse bg-stone-700/40" />
            </div>
          )}
          <img
            ref={imgRef}
            src={url}
            alt={tierLabel(tier, ench)}
            draggable={false}
            loading="eager"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={`absolute inset-0 w-full h-full object-contain p-0.5 transition-opacity duration-200 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-amber-700/60 italic">
          missing
        </div>
      )}
    </div>
  );
}

/** A dim/empty cell — used for impossible slots (T2/T3 enchanted, no-T1 raws). */
function EmptySlot({ dim }) {
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
