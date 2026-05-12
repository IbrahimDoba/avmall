import { notFound } from "next/navigation";
import { getAdminOrder } from "@/lib/data/orders";
import { OrderDetailClient } from "./order-detail-client";

interface PageProps {
  params: { number: string };
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const order = await getAdminOrder(params.number);
  if (!order) notFound();
  return <OrderDetailClient params={params} order={order} />;
}
