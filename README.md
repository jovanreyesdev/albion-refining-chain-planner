# Refining Chain Planner

Plan your Albion Online refining cascade across all tiers and enchantments.
Enter your raw and refined inventory, and the planner shows what you can refine
now, auto-feeds each tier's output into the next, and tells you exactly how
many lower-tier items you still need to buy to fully refine everything you own.

## What it does

Albion's refining recipes form a chain: T6 needs T5 refined + T6 raw, T7 needs
T6 refined + T7 raw, and so on. Figuring out what to buy from market when you
have a mixed bag of raws across tiers and enchantments is fiddly to do by hand.

This tool does that math for you:

- **Drag-and-drop inventory** — pick items from a tier × enchantment grid and
  drop them into an inventory bag, just like in-game.
- **Live shopping list** — every refining shortfall becomes a buy-this line,
  deduplicated and grouped so you can shop it in one trip.
- **Cascade mode** — assume you'll refine everything to the top; lower-tier
  output reduces higher-tier shortfalls automatically.
- **Checkboxes** — tick items off as you buy them. Progress persists.
- **Snapshots** — save and reload named inventory states for "what if" planning.
- **JSON export** — dump the whole plan to a file for testing or sharing.

## Recipes encoded

```
T2 = T1 raw ×2
T3 = T2 refined + T3 raw ×2
T4 = T3 refined + T4 raw ×2
T5 = T4 refined + T5 raw ×3
T6 = T5 refined + T6 raw ×4
T7 = T6 refined + T7 raw ×5
T8 = T7 refined + T8 raw ×5
```

Same pattern applies to all four families (Ore → Metal Bars, Hide → Leather,
Fiber → Cloth, Wood → Plank). Enchantments (.1 through .4) start at T4. The
feeder for any T4.x is **T3 base** (which is shared across all enchanted chains
of the same resource), since T3 has no enchanted variants in-game.

## Tech stack

- React 19 with Vite 8 (`npm run dev` for dev server, `npm run build` for prod)
- Tailwind CSS v4 via `@tailwindcss/vite`
- All state persists in `localStorage` (inventory, snapshots, shopping
  checkmarks, cascade-mode preference) — nothing leaves your machine

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Project layout

```
src/
  App.jsx                    Top-level shell: state, persistence, layout
  components/
    constants.js             Resource catalog, tiers, enchantments, recipes
    iconResolver.js          Maps (family, tier, ench) → bundled icon URL
    storage.js               localStorage keys + load helpers
    cascade.js               The refining math (cascadeAllChains, runChain)
    ThemedButton.jsx         Albion-style button using button.png
    TopTabs.jsx              Resource / Refined top-level picker tabs
    SubTabs.jsx              Material family sub-tabs (Ore / Hide / ...)
    PickerGrid.jsx           T1–T8 × Base/.1–.4 draggable item grid
    InventoryPanel.jsx       The bag — accepts drops, shows filled slots
    QtyModal.jsx             Quantity prompt shown after drop/click
    ShoppingList.jsx         The buy list with checkboxes + cascade toggle
    PlansBreakdown.jsx       Per-chain step-by-step refining tables
    SnapshotMenu.jsx         Dropdown listing saved snapshots
    StatPill.jsx             Small header chips (Raw / Refined / Will Produce)
  assets/
    inv-slot.jpg             Inventory cell background texture
    button.png               Button background
    items/                   All resource & refined item icons (T1–T8 × .0–.4)
```

The math lives in `components/cascade.js` and is independent of the UI — handy
if you want to write tests or reuse the calculator elsewhere.

## Cascade mode explained

When ON, the planner assumes you'll buy whatever feeders are missing, so every
tier's output flows up the chain.

Example: 70 T7 Hide + 300 T8 Hide.

- T7 step: 70 ÷ 5 = 14 T7 Leather produced (requires buying 14 T6 Leather).
- T8 step: 300 ÷ 5 = 60 T7 Leather needed.
- With cascade ON: 14 of those 60 come from the T7 step → buy **46** T7 Leather.
- With cascade OFF: each tier alone → buy **60** T7 Leather.

Toggle lives in the Shopping List header and persists.
