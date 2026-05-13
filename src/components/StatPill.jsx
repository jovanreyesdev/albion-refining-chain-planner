/**
 * Small stat chip used in the header: "Raw 1,234", "Refined 56", etc.
 */
export default function StatPill({ label, value, color }) {
  const colors = {
    amber:   "border-amber-600/50   bg-amber-900/30   text-amber-200",
    sky:     "border-sky-600/50     bg-sky-900/30     text-sky-200",
    emerald: "border-emerald-600/50 bg-emerald-900/30 text-emerald-200",
  };
  return (
    <div className={`px-3 py-1.5 rounded border min-w-18 ${colors[color]}`}>
      <div className="text-[9px] uppercase opacity-70">{label}</div>
      <div className="font-bold text-sm">{(value || 0).toLocaleString()}</div>
    </div>
  );
}
