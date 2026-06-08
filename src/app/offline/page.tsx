import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline · Avmall" };

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center bg-bg">
      <div className="size-14 rounded-full bg-surface-2 flex items-center justify-center text-fg-muted">
        <WifiOff className="size-6" />
      </div>
      <div>
        <h1 className="text-lg font-bold">You&apos;re offline</h1>
        <p className="text-sm text-fg-muted mt-1 max-w-xs">
          Avmall needs a connection to load orders and products. Reconnect and
          try again.
        </p>
      </div>
    </div>
  );
}
