import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/useTranslation";
import { track } from "../analytics";

// =============================================================================
// FirstRunGuide
//
// A short, animated first-run tutorial that walks the user from "the picker"
// to "the inventory" with a bouncing pointer + step caption.
//
// Flow:
//   1. ~600ms after load — appear, pointing at the picker. ("Drag from here…")
//   2. 2200ms later     — slide down to the inventory. ("…drop into here.")
//   3. Auto-dismiss when the user adds an item, or click "Got it".
//
// Position is anchored to two DOM targets passed in as refs from App.jsx, so
// the guide stays accurate even when the layout changes between mobile/desktop.
// =============================================================================

const GUIDE_DISMISSED_KEY = "rcp:guideDismissed";

function hasBeenDismissed() {
  try {
    return localStorage.getItem(GUIDE_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function FirstRunGuide({
  inventoryFilled,
  pickerRef,
  inventoryRef,
}) {
  const t = useTranslation();
  // 0 = picker step, 1 = inventory step. -1 = not visible.
  const [step, setStep] = useState(-1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const rafRef = useRef(null);

  // First visibility kick: show step 0 after a short settle delay.
  useEffect(() => {
    if (hasBeenDismissed()) return;
    const showTimer = setTimeout(() => setStep(0), 600);
    return () => clearTimeout(showTimer);
  }, []);

  // After step 0 has been on screen briefly, advance to step 1 (the inventory).
  useEffect(() => {
    if (step !== 0) return;
    const advance = setTimeout(() => setStep(1), 2200);
    return () => clearTimeout(advance);
  }, [step]);

  // Recompute the on-screen position any time the step or layout changes.
  // Uses getBoundingClientRect so we stay accurate after resize / scroll / rerender.
  useEffect(() => {
    if (step < 0) return;
    const target = step === 0 ? pickerRef?.current : inventoryRef?.current;
    if (!target) return;

    const reposition = () => {
      const rect = target.getBoundingClientRect();
      setPos({
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY, // top of the target, accounting for scroll
      });
    };

    reposition();
    // Track resize + scroll so the bubble follows the target.
    const onChange = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(reposition);
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, { passive: true });
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange);
      cancelAnimationFrame(rafRef.current);
    };
  }, [step, pickerRef, inventoryRef]);

  // Auto-dismiss when user adds an item — they clearly got it.
  useEffect(() => {
    if (step >= 0 && inventoryFilled) {
      dismiss("auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryFilled]);

  const dismiss = (reason = "manual") => {
    setStep(-1);
    try { localStorage.setItem(GUIDE_DISMISSED_KEY, "1"); } catch { /* noop */ }
    track("guide_dismissed", { reason, step });
  };

  if (step < 0) return null;

  // Build the caption per step.
  const caption =
    step === 0
      ? t("guideStepPicker")   // "Pick an item from here…"
      : t("guideStepInventory"); // "…and drop it into your inventory."

  return (
    <>
      {/* Soft vignette so the highlighted target stands out. Non-blocking. */}
      <div
        className="fixed inset-0 z-30 pointer-events-none transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 80%)",
        }}
      />

      {/* The bubble — absolutely positioned over the active target.
          Uses translate() so we can animate position smoothly when the step changes. */}
      <div
        className="absolute z-40 pointer-events-auto"
        style={{
          left: pos.x,
          top: pos.y,
          transform: "translate(-50%, -100%) translateY(-20px)",
          transition:
            "left 600ms cubic-bezier(0.4, 0, 0.2, 1), top 600ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          className="relative w-[min(88vw,360px)] bg-stone-900/95 border-2 border-amber-500/70 rounded-xl
                     p-3.5 text-amber-100 shadow-2xl animate-[fadeIn_300ms_ease-out]"
          style={{
            boxShadow:
              "0 10px 40px rgba(0,0,0,0.7), 0 0 24px rgba(242,184,59,0.3), inset 0 1px 0 rgba(255,235,200,0.2)",
          }}
          role="dialog"
          aria-label={t("guideTitle")}
        >
          <div className="flex items-start gap-2.5">
            <div className="text-2xl shrink-0 leading-none">
              {step === 0 ? "👆" : "👇"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-amber-400/80 font-bold">
                {t("guideTitle")}
              </div>
              <div className="text-sm text-amber-100 mt-0.5 leading-snug">
                {caption}
              </div>
              {/* Step dots so the user senses progress (1 of 2). */}
              <div className="flex items-center gap-1.5 mt-2">
                {[0, 1].map((i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step
                        ? "w-6 bg-amber-400"
                        : "w-1.5 bg-amber-700/60"
                    }`}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={() => dismiss("manual")}
              aria-label={t("guideDismiss")}
              className="shrink-0 text-amber-400 hover:text-amber-200 text-xl leading-none
                         w-6 h-6 flex items-center justify-center rounded hover:bg-stone-800"
            >
              ×
            </button>
          </div>
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              onClick={() => dismiss("manual")}
              className="text-[11px] px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold
                         transition shadow-md"
            >
              {t("guideGotIt")}
            </button>
          </div>

          {/* Animated arrow at the bottom of the bubble pointing at the target. */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-6 text-amber-400 text-3xl
                       animate-[arrowBounce_1.1s_ease-in-out_infinite] drop-shadow-lg leading-none"
            aria-hidden="true"
          >
            ↓
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes arrowBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); opacity: 0.95; }
          50%      { transform: translateX(-50%) translateY(6px); opacity: 1; }
        }
      `}</style>
    </>
  );
}

/**
 * Small "?" help button that re-opens the guide on next page load.
 * Lives in the header.
 */
export function GuideHelpButton() {
  const t = useTranslation();
  return (
    <button
      onClick={() => {
        try { localStorage.removeItem(GUIDE_DISMISSED_KEY); } catch { /* noop */ }
        track("guide_reopened");
        window.location.reload();
      }}
      title={t("guideHelpTooltip")}
      aria-label={t("guideHelpTooltip")}
      className="inline-flex items-center justify-center w-7 h-7 rounded-full
                 bg-stone-900/60 border border-amber-700/40 text-amber-300
                 hover:bg-stone-800 hover:border-amber-500 hover:text-amber-100 transition"
    >
      ?
    </button>
  );
}
