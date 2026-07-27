import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AdminTopBar } from "@/components/admin/topbar";

export const dynamic = "force-dynamic";

/**
 * Shown when a signed-in staff member lands on a section their role doesn't
 * permit. The admin layout redirects here instead of rendering the guarded
 * page. Requires only a session (no permission), so it never loops.
 */
export default function NoAccessPage() {
  return (
    <>
      <AdminTopBar breadcrumbs={[{ label: "No access" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto mt-24 px-6 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-warning-bg text-warning">
            <ShieldAlert className="size-7" />
          </div>
          <h1 className="text-xl font-bold mb-2">You don&apos;t have access to that section</h1>
          <p className="text-sm text-fg-muted mb-6">
            Your role doesn&apos;t include permission to view this page. If you think you
            should have access, ask a manager to update your role under Staff &amp; roles.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/admin/orders"
              className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary-fg hover:bg-brand-primary-hover"
            >
              Go to Orders
            </Link>
            <Link
              href="/admin/profile"
              className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2"
            >
              Your profile
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
