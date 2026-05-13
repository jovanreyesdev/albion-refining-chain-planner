import { useTranslation } from "../i18n/useTranslation";

/**
 * Top-level tabs for the picker: Resource vs Refined.
 *
 * Styled like Albion's inventory tabs:
 *  - Inactive tabs sit on a darker recessed strip
 *  - Active tab "rises" to match the panel beneath it (same warm tan)
 *    and has a bright amber underline glow
 *  - Subtle inset shadow on the strip for depth
 */
export default function TopTabs({ topTab, setTopTab }) {
  const tr = useTranslation();
  return (
    <div
      className="flex relative"
      style={{
        background:
          "linear-gradient(180deg, #2a1a10 0%, #1c1108 60%, #150c06 100%)",
        boxShadow: "inset 0 -2px 6px rgba(0,0,0,0.6)",
      }}
    >
      {[
        { key: "resource", label: tr("tabResource") },
        { key: "refined", label: tr("tabRefined") },
      ].map((t) => {
        const active = topTab === t.key;
        return (
          <button
            key={t.key}
            onClick={() => setTopTab(t.key)}
            className={`relative px-6 py-3 text-sm tracking-wider transition cursor-pointer
              ${active
                ? "text-amber-50 font-extrabold"
                : "text-amber-800/70 hover:text-amber-300 font-semibold"}
            `}
            style={
              active
                ? {
                    // Active: bright warm panel with a strong glowing top edge
                    background:
                      "linear-gradient(180deg, #E5BC9A 0%, #C59F82 35%, #B58B6E 100%)",
                    boxShadow:
                      // top highlight + bottom soft amber glow + side separations
                      "inset 0 2px 0 rgba(255,235,200,0.7), inset 0 -2px 4px rgba(0,0,0,0.25), 0 0 14px rgba(242,184,59,0.35)",
                    textShadow: "0 1px 2px rgba(80,40,20,0.7)",
                  }
                : {
                    // Inactive: clearly recessed, low-contrast, darker
                    background:
                      "linear-gradient(180deg, #1a1108 0%, #120b06 100%)",
                    textShadow: "0 1px 1px rgba(0,0,0,0.9)",
                    boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.5)",
                  }
            }
          >
            {t.label}
            {active && (
              <>
                {/* Strong amber underline bar — wider, brighter, more glow */}
                <span
                  className="absolute -bottom-[1px] left-0 right-0 h-[4px]"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, #F2B83B 15%, #FFE08A 50%, #F2B83B 85%, transparent 100%)",
                    boxShadow:
                      "0 0 12px rgba(242,184,59,0.9), 0 0 4px rgba(255,224,138,0.8)",
                  }}
                />
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
