/**
 * Top-level tabs for the picker: Resource vs Refined.
 * Active tab has an amber underline and a slightly lighter background.
 */
export default function TopTabs({ topTab, setTopTab }) {
  return (
    <div className="flex border-b border-amber-900/40 bg-stone-950/70">
      {[
        { key: "resource", label: "Resource" },
        { key: "refined", label: "Refined" },
      ].map((t) => (
        <button
          key={t.key}
          onClick={() => setTopTab(t.key)}
          className={`px-6 py-2.5 text-sm font-bold tracking-wide transition relative cursor-pointer ${
            topTab === t.key
              ? "text-amber-200 bg-stone-800/60"
              : "text-amber-500/60 hover:text-amber-300 hover:bg-stone-800/30"
          }`}
        >
          {t.label}
          {topTab === t.key && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>
      ))}
    </div>
  );
}
