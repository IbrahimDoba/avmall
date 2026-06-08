"use client";

import * as React from "react";

/** Registers the staff PWA service worker. Mounted only inside the admin
 *  layout, so the SW (and installability) is scoped to staff, not shoppers. */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Avoid registering on dev HMR churn issues — register once on load.
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.error("[pwa] SW registration failed:", err));
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
