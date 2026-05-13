// =============================================================================
// Thin wrapper around Vercel Analytics' track() so the rest of the app
// imports from one place and we can swap providers later without touching
// every call site.
//
// In dev or when analytics isn't loaded, this is a no-op — never throws.
// =============================================================================

import { track as vercelTrack } from "@vercel/analytics";

/**
 * Track a custom event. Names use snake_case for readability in the dashboard.
 * Pass an optional `props` object for dimensions (kept small — Vercel limits
 * properties per event).
 *
 * Examples:
 *   track("inventory_add", { kind: "raw", tier: 7 })
 *   track("cascade_toggle", { enabled: true })
 *   track("language_change", { from: "en", to: "id" })
 */
export function track(event, props) {
  try {
    vercelTrack(event, props);
  } catch {
    // Swallow — analytics should never break the app
  }
}
