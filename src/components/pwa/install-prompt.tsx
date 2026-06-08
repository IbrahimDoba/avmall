"use client";

import * as React from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "avmall_install_dismissed";

/** "Install Avmall" banner. Appears only when the browser fires
 *  beforeinstallprompt (Android Chrome on an installable PWA) and the staffer
 *  hasn't already dismissed or installed it. */
export function InstallPrompt() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return; // already installed
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode — fine, just won't persist */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setVisible(false);
    setDeferred(null);
  }

  if (!visible) return null;

  return (
    <div className="lg:hidden fixed inset-x-3 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-40 rounded-lg border border-border bg-surface shadow-lg p-3 flex items-center gap-3">
      <div className="size-9 rounded-md bg-info-bg text-brand-primary flex items-center justify-center flex-shrink-0">
        <Download className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">Install the Avmall app</div>
        <div className="text-[11px] text-fg-muted">Add it to your home screen for one-tap access.</div>
      </div>
      <button
        onClick={install}
        className="px-3 h-9 rounded-md bg-brand-primary text-brand-primary-fg text-xs font-bold flex-shrink-0"
      >
        Install
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="size-7 rounded-md hover:bg-surface-2 text-fg-muted flex items-center justify-center flex-shrink-0"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
