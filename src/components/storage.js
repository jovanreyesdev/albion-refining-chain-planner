// =============================================================================
// localStorage keys and load helpers.
// Keeping these in one place makes it easier to bump versions or migrate.
// =============================================================================

export const STORAGE_KEY = "rcp:slots:v2";
export const SNAPSHOT_KEY = "rcp:snapshots:v2";
export const CASCADE_MODE_KEY = "rcp:cascadeMode";
export const SHOPPING_CHECKED_KEY = "rcp:shoppingChecked:v1";

// Random + time-based ID — collision-resistant enough for inventory slots.
export const newSlotId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export function loadSlots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function loadSnapshots() {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "[]");
  } catch {
    return [];
  }
}

export function loadCheckedSet() {
  try {
    const arr = JSON.parse(localStorage.getItem(SHOPPING_CHECKED_KEY) || "[]");
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function loadCascadeMode() {
  try {
    return JSON.parse(localStorage.getItem(CASCADE_MODE_KEY) || "true");
  } catch {
    return true;
  }
}
