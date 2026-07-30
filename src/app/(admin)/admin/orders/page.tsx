import { listAdminOrdersPage } from "@/lib/data/orders";
import { getActiveAdminStoreId } from "@/lib/store";
import { OrdersListClient } from "./orders-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

/** Split a comma-separated query param into a clean string array. */
function parseList(v: string | undefined): string[] {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export default async function AdminOrdersListPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    status?: string;
    payment?: string;
    source?: string;
    q?: string;
  };
}) {
  const storeId = await getActiveAdminStoreId();

  const page = Math.max(1, Number(searchParams.page) || 1);
  const status = searchParams.status ?? "all";
  const payment = parseList(searchParams.payment);
  const source = parseList(searchParams.source);
  const search = searchParams.q?.trim() ?? "";

  const { rows, total, statusCounts, allCount } = await listAdminOrdersPage({
    storeId,
    page,
    pageSize: PAGE_SIZE,
    status,
    payment,
    source,
    search,
  });

  return (
    <OrdersListClient
      orders={rows}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      statusCounts={statusCounts}
      allCount={allCount}
      filters={{ status, payment, source, search }}
    />
  );
}
