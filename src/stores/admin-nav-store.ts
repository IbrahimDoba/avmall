"use client";

/**
 * Admin mobile-nav state. The hamburger lives in the per-page topbar while the
 * sidebar drawer lives in the layout — different component trees, so the open
 * state is shared here rather than lifted through props.
 *
 * See CLAUDE.md §12 — UI state belongs in Zustand, colocated with the feature.
 */

import { create } from "zustand";

interface AdminNavState {
  mobileOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useAdminNav = create<AdminNavState>((set) => ({
  mobileOpen: false,
  open: () => set({ mobileOpen: true }),
  close: () => set({ mobileOpen: false }),
}));
