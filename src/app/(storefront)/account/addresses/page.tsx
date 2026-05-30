import { redirect } from "next/navigation";
import { db, hasDatabase } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-session";
import { AddressesClient, type AddressView } from "./addresses-client";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/login?next=/account/addresses");

  let addresses: AddressView[] = [];
  if (hasDatabase) {
    const rows = await db.customerAddress.findMany({
      where: { customerId: session.customerId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    addresses = rows.map((a) => ({
      id: a.id,
      label: a.label,
      recipient: a.recipient,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      isDefault: a.isDefault,
    }));
  }

  return <AddressesClient initial={addresses} />;
}
