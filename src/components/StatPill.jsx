/**
 * Small stat chip used in the header: "Raw 1,234", "Refined 56", etc.
 *
 * Mobile behaviour:
 *  - Tightened padding and dropped the fixed min-width so three pills fit
 *    alongside the help button + language switcher on a narrow viewport.
 *  - `flex-1` lets them share leftover header-row width equally on mobile;
 *    the original sizing is restored at the `sm:` breakpoint and above.
 */
export default function StatPill({ label, value, color }) {
  const colors = {
    amber:   "border-amber-600/50   bg-amber-900/30   text-amber-200",
    sky:     "border-sky-600/50     bg-sky-900/30     text-sky-200",
    emerald: "border-emerald-600/50 bg-emerald-900/30 text-emerald-200",
  };
  return (
    <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded border min-w-0 sm:min-w-18 flex-1 sm:flex-none ${colors[color]}`}>
      <div className="text-[9px] uppercase opacity-70 leading-tight whitespace-nowrap">{label}</div>
      <div className="font-bold text-sm leading-tight">{(value || 0).toLocaleString()}</div>
    </div>
  );
}
