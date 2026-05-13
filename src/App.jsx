import { useEffect, useMemo, useState } from "react";

import {
  REFINED, RESOURCES, TIERS, REFINING_TIERS, tierLabel,
} from "./components/constants";
import { cascadeAllChains } from "./components/cascade";
import {
  STORAGE_KEY, SNAPSHOT_KEY, CASCADE_MODE_KEY,
  newSlotId, loadSlots, loadSnapshots, loadCascadeMode,
} from "./components/storage";

import ThemedButton from "./components/ThemedButton";
import TopTabs from "./components/TopTabs";
import SubTabs from "./components/SubTabs";
import PickerGrid from "./components/PickerGrid";
import InventoryPanel from "./components/InventoryPanel";
import QtyModal from "./components/QtyModal";
import StatPill from "./components/StatPill";
import ShoppingList from "./components/ShoppingList";
import PlansBreakdown from "./components/PlansBreakdown";
import SnapshotMenu from "./components/SnapshotMenu";
import FloatingLinks from "./components/FloatingLinks";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { useTranslation } from "./i18n/useTranslation";

// =============================================================================
// REFINING CHAIN PLANNER — Albion Online (Drag & Drop UI)
//
// This file is the top-level shell: state, persistence, top-level layout,
// and the wiring that connects the picker, inventory, shopping list, and
// per-chain breakdown together. Pure presentation/logic units live under
// ./components.
// =============================================================================

export default function App() {
  const t = useTranslation();
  // -------- state --------
  const [slots, setSlots] = useState(loadSlots);
  const [snapshots, setSnapshots] = useState(loadSnapshots);
  const [topTab, setTopTab] = useState("resource"); // "refined" | "resource"
  // Cascade mode: when ON, lower-tier output reduces higher-tier shortfalls
  // (assumes the user buys all needed lower-tier feeders).
  const [cascadeMode, setCascadeMode] = useState(loadCascadeMode);
  const [subTabRefined, setSubTabRefined] = useState(REFINED[0].key);
  const [subTabResource, setSubTabResource] = useState(RESOURCES[0].key);
  const [draggingItem, setDraggingItem] = useState(null);
  // qtyPrompt shape: { mode: "add"|"edit", slotId?, kind, familyKey, tier, ench, defaultQty }
  const [qtyPrompt, setQtyPrompt] = useState(null);

  // -------- persistence --------
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(slots)); } catch {
      //
    }
  }, [slots]);
  useEffect(() => {
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots)); } catch {
      //
    }
  }, [snapshots]);
  useEffect(() => {
    try { localStorage.setItem(CASCADE_MODE_KEY, JSON.stringify(cascadeMode)); } catch {
      //
    }
  }, [cascadeMode]);

  // -------- inventory mutations --------
  const addOrUpdateSlot = (kind, familyKey, tier, ench, qty) => {
    if (!qty || qty <= 0) return;
    // If a slot with same identity already exists, ADD to it (like Albion stacks).
    setSlots((prev) => {
      const existing = prev.find(
        (s) =>
          s.kind === kind &&
          s.familyKey === familyKey &&
          s.tier === tier &&
          s.ench === ench
      );
      if (existing) {
        return prev.map((s) => (s === existing ? { ...s, qty: s.qty + qty } : s));
      }
      return [...prev, { id: newSlotId(), kind, familyKey, tier, ench, qty }];
    });
  };

  const setSlotQty = (slotId, qty) => {
    if (qty <= 0) {
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      return;
    }
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, qty } : s)));
  };

  const removeSlot = (slotId) =>
    setSlots((prev) => prev.filter((s) => s.id !== slotId));

  const clearAll = () => {
    if (slots.length === 0) return;
    if (!confirm(t("confirmClear"))) return;
    setSlots([]);
  };

  // -------- snapshots --------
  const saveSnapshot = () => {
    const name = prompt(t("promptSnapshotName"), `Inv ${new Date().toLocaleDateString()}`);
    if (!name) return;
    setSnapshots((prev) => [
      { id: Date.now(), name, slots: JSON.parse(JSON.stringify(slots)) },
      ...prev,
    ]);
  };

  const loadSnapshot = (id) => {
    const snap = snapshots.find((s) => s.id === id);
    if (!snap) return;
    if (!confirm(t("confirmLoadSnapshot", { name: snap.name }))) return;
    setSlots(snap.slots);
  };

  const deleteSnapshot = (id) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  // -------- drop handler --------
  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggingItem) return;
    const { kind, familyKey, tier, ench } = draggingItem;
    setQtyPrompt({ mode: "add", kind, familyKey, tier, ench, defaultQty: 1 });
    setDraggingItem(null);
  };

  // -------- computed plans / shopping items / totals --------
  const plans = useMemo(() => cascadeAllChains(slots, cascadeMode), [slots, cascadeMode]);

  const shoppingItems = useMemo(() => {
    // Family key → translation key for the short label.
    const SHORT_KEY = {
      metal_bars: "famMetalBars", leathers: "famLeather",
      cloths: "famCloth", planks: "famPlank",
      ores: "famOre", hides: "famHide",
      fibers: "famFiber", woods: "famWood",
    };
    const localShort = (family) => t(SHORT_KEY[family.key] || "") || family.short;

    const items = [];
    for (const p of plans) {
      if (!p.hasInput) continue;
      const rawShortLocal = localShort(p.rawFamily);
      const refinedShortLocal = localShort(p.refinedFamily);
      for (const s of p.steps) {
        if (s.shortfallFeeder > 0) {
          const feederEnch = s.feederUsesBase ? 0 : p.ench;
          const reason = (s.cascadeMode && s.cascadeCredit > 0)
            ? t("cascadeReasonWithCredit", {
                baseShortfall: s.baseShortfall,
                tier: s.label,
                family: rawShortLocal.toLowerCase(),
                credit: s.cascadeCredit,
              })
            : t("cascadeReasonSimple", {
                tier: s.label,
                family: rawShortLocal.toLowerCase(),
              });
          items.push({
            kind: "refined",
            family: p.refinedFamily,
            ench: feederEnch,
            label: `${s.feederLabel} ${refinedShortLocal}`,
            amount: s.shortfallFeeder,
            reason,
            iconTier: s.feederTier,
            iconEnch: feederEnch,
            iconFamily: p.refinedFamily,
            iconKind: "refined",
          });
        }
        if (s.shortfallRaw > 0) {
          const rawTier = s.tier === 2 ? 1 : s.tier;
          items.push({
            kind: "raw",
            family: p.rawFamily,
            ench: p.ench,
            label: `${s.rawSourceLabel} ${rawShortLocal}`,
            amount: s.shortfallRaw,
            reason: t("cascadeReasonRaw", { feeder: s.feederLabel }),
            iconTier: rawTier,
            iconEnch: p.ench,
            iconFamily: p.rawFamily,
            iconKind: "raw",
          });
        }
      }
    }
    return items;
  }, [plans, t]);

  const totals = useMemo(() => {
    let raw = 0, refined = 0;
    for (const s of slots) {
      if (s.kind === "raw") raw += s.qty;
      else refined += s.qty;
    }
    let produced = 0;
    for (const p of plans) for (const st of p.steps) produced += st.produced;
    return { raw, refined, produced };
  }, [slots, plans]);

  // -------- JSON export (for testing / sharing scenarios) --------
  // const exportJson = () => {
  //   // Inventory with human-readable labels.
  //   const inventory = slots.map((s) => {
  //     const family =
  //       s.kind === "raw"
  //         ? RESOURCES.find((r) => r.key === s.familyKey)
  //         : REFINED.find((r) => r.key === s.familyKey);
  //     return {
  //       kind: s.kind,
  //       family: family?.label || s.familyKey,
  //       familyKey: s.familyKey,
  //       tier: s.tier,
  //       ench: s.ench,
  //       label: `${tierLabel(s.tier, s.ench)} ${family?.short || s.familyKey}`,
  //       qty: s.qty,
  //     };
  //   });

  //   // Dedupe + sum shopping items so the export matches what's on-screen.
  //   const shoppingGrouped = {};
  //   for (const it of shoppingItems) {
  //     const key = `${it.iconKind}-${it.iconFamily.key}-${it.iconTier}-${it.iconEnch}`;
  //     if (!shoppingGrouped[key]) {
  //       shoppingGrouped[key] = {
  //         kind: it.kind,
  //         family: it.iconFamily.label,
  //         familyKey: it.iconFamily.key,
  //         tier: it.iconTier,
  //         ench: it.iconEnch,
  //         label: it.label,
  //         amountNeeded: 0,
  //         reasons: [],
  //       };
  //     }
  //     shoppingGrouped[key].amountNeeded += it.amount;
  //     shoppingGrouped[key].reasons.push(it.reason);
  //   }
  //   const shoppingList = Object.values(shoppingGrouped);

  //   const refiningPlan = plans
  //     .filter((p) => p.hasInput)
  //     .map((p) => ({
  //       rawFamily: p.rawFamily.label,
  //       refinedFamily: p.refinedFamily.label,
  //       enchantment: p.ench,
  //       steps: p.steps.map((s) => ({
  //         tier: s.label,
  //         rawNeededPerUnit: s.perUnit,
  //         rawAvailable: s.rawHave,
  //         rawUsed: s.rawUsed,
  //         feederTier: s.feederLabel,
  //         feederAvailable: s.feederHave === Infinity ? null : s.feederHave,
  //         feederUsed: s.feederUsed,
  //         produced: s.produced,
  //         refinedRemainingAfter: s.refinedAfter,
  //         shortfallFeeder: s.shortfallFeeder,
  //         shortfallRaw: s.shortfallRaw,
  //       })),
  //     }));

  //   const payload = {
  //     exportedAt: new Date().toISOString(),
  //     version: 1,
  //     totals: {
  //       rawItems: totals.raw,
  //       refinedItems: totals.refined,
  //       willProduce: totals.produced,
  //     },
  //     inventory,
  //     refiningPlan,
  //     shoppingList,
  //   };

  //   const json = JSON.stringify(payload, null, 2);
  //   const blob = new Blob([json], { type: "application/json" });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  //   a.href = url;
  //   a.download = `refining-plan-${stamp}.json`;
  //   document.body.appendChild(a);
  //   a.click();
  //   document.body.removeChild(a);
  //   URL.revokeObjectURL(url);
  // };

  // -------- picker view derivation --------
  const currentFamily =
    topTab === "refined"
      ? REFINED.find((f) => f.key === subTabRefined)
      : RESOURCES.find((f) => f.key === subTabResource);
  const currentKind = topTab === "refined" ? "refined" : "raw";

  // Refined picker only shows T2–T8; raw picker shows T1–T8 (with dim T1 cells
  // for families that don't have a T1 like ore/fiber).
  const pickerTiers = topTab === "refined" ? REFINING_TIERS : TIERS;

  // =================================================================
  // RENDER
  // =================================================================
  return (
    <div
      className="min-h-screen text-amber-50 p-4 sm:p-6"
      style={{
        background:
          "radial-gradient(ellipse at top, #2d2418 0%, #1a1410 50%, #0f0c08 100%)",
      }}
    >
      <div className="max-w-[1500px] mx-auto">
        {/* Header */}
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1
              className="text-3xl font-bold text-amber-100"
              style={{ textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}
            >
              {t("appTitle")}
            </h1>
            <p className="text-sm text-amber-200/70 mt-1 max-w-2xl">
              {t("appTagline")}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <LanguageSwitcher />
            <StatPill label={t("statRaw")} value={totals.raw} color="amber" />
            <StatPill label={t("statRefined")} value={totals.refined} color="sky" />
            <StatPill label={t("statWillProduce")} value={totals.produced} color="emerald" />
          </div>
        </header>

        {/* Picker + Inventory: side-by-side on wide screens, stacked on narrow */}
        <div className="flex flex-col lg:flex-row gap-5 mb-5">
          <section className="bg-[#C59F82] border-[7px] border-[#AF7F61] overflow-hidden shadow-xl lg:shrink-0">
            <TopTabs topTab={topTab} setTopTab={setTopTab} />
            <SubTabs
              topTab={topTab}
              subTabRefined={subTabRefined}
              setSubTabRefined={setSubTabRefined}
              subTabResource={subTabResource}
              setSubTabResource={setSubTabResource}
            />
            <PickerGrid
              family={currentFamily}
              kind={currentKind}
              tiersToShow={pickerTiers}
              onDragStart={(item) => setDraggingItem(item)}
              onDragEnd={() => setDraggingItem(null)}
              onClickItem={(item) =>
                setQtyPrompt({ mode: "add", ...item, defaultQty: 1 })
              }
            />
          </section>

          <section className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-amber-100">{t("inventoryHeading")}</h2>
              <div className="flex gap-2">
                <ThemedButton onClick={saveSnapshot} title={t("btnSave")}>{t("btnSave")}</ThemedButton>
                <SnapshotMenu snapshots={snapshots} onLoad={loadSnapshot} onDelete={deleteSnapshot} />
                {/* <ThemedButton onClick={exportJson} title="Export inventory + shopping list as JSON">Export</ThemedButton> */}
                <ThemedButton onClick={clearAll} variant="danger" title={t("btnClear")}>{t("btnClear")}</ThemedButton>
              </div>
            </div>
            <div className="flex-1">
              <InventoryPanel
                slots={slots}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClickSlot={(slot) =>
                  setQtyPrompt({
                    mode: "edit",
                    slotId: slot.id,
                    kind: slot.kind,
                    familyKey: slot.familyKey,
                    tier: slot.tier,
                    ench: slot.ench,
                    defaultQty: slot.qty,
                  })
                }
                onRemoveSlot={removeSlot}
              />
            </div>
          </section>
        </div>

        <ShoppingList
          items={shoppingItems}
          cascadeMode={cascadeMode}
          setCascadeMode={setCascadeMode}
        />

        <PlansBreakdown plans={plans} />

        <footer className="mt-6 text-xs text-amber-700/60 text-center">
          {t("footerRecipe")}
          <div className="mt-1">{t("footerStorage")}</div>
          {/* Community + support links — small, low-pressure. */}
          <div className="mt-3 flex items-center justify-center gap-5 flex-wrap">
            <a
              href="https://discord.gg/RT6CdKRn"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-amber-500/80 hover:text-amber-300 transition"
              title={t("linkDiscord")}
            >
              <span>💬</span>
              <span>{t("linkDiscord")}</span>
            </a>
            <a
              href="https://ko-fi.com/medjoskambag"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-amber-500/80 hover:text-amber-300 transition"
              title={t("linkKofi")}
            >
              <span>☕</span>
              <span>{t("linkKofi")}</span>
            </a>
          </div>
        </footer>
      </div>

      {/* Floating community + support buttons (bottom-right) */}
      <FloatingLinks />

      {/* Quantity prompt modal */}
      {qtyPrompt && (
        <QtyModal
          prompt={qtyPrompt}
          onClose={() => setQtyPrompt(null)}
          onConfirm={(qty) => {
            if (qtyPrompt.mode === "add") {
              addOrUpdateSlot(qtyPrompt.kind, qtyPrompt.familyKey, qtyPrompt.tier, qtyPrompt.ench, qty);
            } else {
              setSlotQty(qtyPrompt.slotId, qty);
            }
            setQtyPrompt(null);
          }}
        />
      )}
    </div>
  );
}
