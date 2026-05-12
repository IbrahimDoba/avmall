import { OrderDetailClient } from "./order-detail-client";

interface PageProps {
  params: { number: string };
}

// Server wrapper — Phase 4 wired the DB read at lib/data/orders.ts; the
// client component is being rewired in the next commit to consume the
// `order` prop directly. For now we forward `params` so the existing
// behaviour is preserved.
export default function AdminOrderDetailPage({ params }: PageProps) {
  return <OrderDetailClient params={params} />;
}
