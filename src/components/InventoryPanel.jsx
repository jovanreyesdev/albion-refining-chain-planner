import invSlotBg from "../assets/inv-slot.jpg";
import { RESOURCES, REFINED, tierLabel, tierRoman } from "./constants";
import { iconUrl } from "./iconResolver";

// Inventory uses CSS auto-fill so columns adapt to container width.
// Minimum slot size keeps slots looking like Albion's gear grid when squeezed.
const INVENTORY_MIN_SLOT_PX = 64;
const INVENTORY_MIN_SLOTS = 48; // always show at least this many cells

/**
 * Flat grid inventory that accepts drops. Pads with empty slots so the panel
 * always feels like a real bag. Grows in batches of 8 as the user fills it.
 */
export default function InventoryPanel({
  slots, onDrop, onDragOver, onClickSlot, onRemoveSlot,
}) {
  // Pad to next row of 8 above the filled count, with a minimum floor.
  const padTo = Math.max(
    INVENTORY_MIN_SLOTS,
    Math.ceil((slots.length + 4) / 8) * 8,
  );
  const filled = [...slots];
  while (filled.length < padTo) filled.push(null);

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="bg-[#C59F82] border-[7px] border-[#AF7F61] p-3 shadow-xl h-full"
    >
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${INVENTORY_MIN_SLOT_PX}px, 1fr))`,
        }}
      >
        {filled.map((slot, idx) =>
          slot ? (
            <FilledSlot
              key={slot.id}
              slot={slot}
              onClick={() => onClickSlot(slot)}
              onRemove={() => onRemoveSlot(slot.id)}
            />
          ) : (
            <EmptyInvSlot key={`empty-${idx}`} />
          )
        )}
      </div>
      {slots.length === 0 && (
        <div className="text-center text-amber-800 text-sm italic mt-3">
          Drag items from the picker into these slots, or click a picker item to add directly.
        </div>
      )}
    </div>
  );
}

function EmptyInvSlot() {
  return (
    <div
      className="aspect-square"
      style={{
        backgroundImage: `url(${invSlotBg})`,
        backgroundSize: "100% 100%, 100% 100%",
      }}
    />
  );
}

function FilledSlot({ slot, onClick, onRemove }) {
  const family =
    slot.kind === "raw"
      ? RESOURCES.find((r) => r.key === slot.familyKey)
      : REFINED.find((r) => r.key === slot.familyKey);
  const url = family ? iconUrl(family, slot.tier, slot.ench) : null;

  return (
    <div
      onClick={onClick}
      title={`${tierLabel(slot.tier, slot.ench)} ${family?.short || "?"} — click to edit, × to remove`}
      className="relative aspect-square cursor-pointer hover:scale-105 transition-transform group"
      style={{
        backgroundImage: `url(${invSlotBg})`,
        backgroundSize: "100% 100%, 100% 100%",
      }}
    >
      {url && (
        <img
          src={url}
          alt={tierLabel(slot.tier, slot.ench)}
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain p-0.5"
        />
      )}
      <span className="absolute top-0.5 left-0.5 text-[10px] font-bold text-amber-200 bg-black/60 px-1 rounded">
        {tierRoman[slot.tier]}
      </span>
      <span
        className="absolute bottom-0.5 right-0.5 text-xs font-bold text-white bg-black/70 px-1.5 rounded"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}
      >
        {slot.qty}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-xs
          opacity-0 group-hover:opacity-100 transition flex items-center justify-center font-bold
          hover:bg-rose-500 shadow-md"
        title="Remove this item"
      >
        ×
      </button>
    </div>
  );
}
