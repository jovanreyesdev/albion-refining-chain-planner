import { useEffect, useRef, useState } from "react";
import invSlotBg from "../assets/inv-slot.jpg";
import { RESOURCES, REFINED, tierLabel } from "./constants";
import { iconUrl } from "./iconResolver";
import ThemedButton from "./ThemedButton";
import { useTranslation } from "../i18n/useTranslation";

// Family-key to short-label translation key (item name on the modal)
const FAMILY_SHORT_KEY = {
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
 * Quantity prompt — shown after drag-drop or click on a picker/inventory slot.
 * Adds (or edits) the quantity for that specific item.
 *
 * Styled like Albion's system confirm dialog: deep slate panel, golden inset
 * border, buttons split on the bottom row.
 */
export default function QtyModal({ prompt, onClose, onConfirm }) {
  const t = useTranslation();
  const family =
    prompt.kind === "raw"
      ? RESOURCES.find((r) => r.key === prompt.familyKey)
      : REFINED.find((r) => r.key === prompt.familyKey);
  const url = family ? iconUrl(family, prompt.tier, prompt.ench) : null;
  const localFamilyShort = family
    ? t(FAMILY_SHORT_KEY[family.key] || "") || family.short
    : "";

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
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative p-6 border-1 border-[#595959] max-w-md w-full"
        style={{
          background: "linear-gradient(180deg, #2C2C2C 0%, #121110 100%)",
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
              <img
                src={url}
                alt=""
                className="absolute inset-0 w-full h-full object-contain p-0.5"
              />
            )}
          </div>
          <div>
            <div
              className="text-amber-100 font-bold text-lg"
              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
            >
              {tierLabel(prompt.tier, prompt.ench)} {localFamilyShort}
            </div>
            <div className="text-amber-400/80 text-xs uppercase tracking-wide">
              {prompt.kind === "raw" ? t("qtyTitleRaw") : t("qtyTitleRefined")}
            </div>
          </div>
        </div>
        <label className="block text-amber-200/80 text-sm mb-1.5">{t("qtyLabel")}</label>
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
        <div className="flex items-center mt-6">
          <div className="flex items-center justify-between w-full gap-6">
            <ThemedButton onClick={submit}>
              {prompt.mode === "add" ? t("qtyAdd") : t("qtySave")}
            </ThemedButton>
            <ThemedButton onClick={onClose}>{t("qtyCancel")}</ThemedButton>
          </div>
        </div>
        <div className="text-amber-700/50 text-[10px] mt-4 text-center">
          {t("qtyTip")}
        </div>
      </div>
    </div>
  );
}
