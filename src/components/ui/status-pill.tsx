import { cn } from "@/lib/utils";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "paid" | "partial" | "unpaid" | "refunded";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "preorder";

interface PillProps {
  className?: string;
  bare?: boolean | undefined;
  children: React.ReactNode;
}

function Pill({ className, bare, children }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap tabular",
        className,
      )}
    >
      {!bare && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const ORDER_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const ORDER_CLASSES: Record<OrderStatus, string> = {
  pending: "bg-status-pending/10 text-status-pending",
  confirmed: "bg-status-confirmed/10 text-status-confirmed",
  processing: "bg-status-processing/10 text-status-processing",
  shipped: "bg-status-shipped/10 text-status-shipped",
  delivered: "bg-status-delivered/10 text-status-delivered",
  cancelled: "bg-status-cancelled/10 text-status-cancelled",
  refunded: "bg-status-refunded/10 text-status-refunded",
};

export function OrderStatusPill({
  status,
  bare,
  label,
}: {
  status: OrderStatus;
  bare?: boolean;
  label?: string;
}) {
  return (
    <Pill bare={bare} className={ORDER_CLASSES[status]}>
      {label ?? ORDER_LABELS[status]}
    </Pill>
  );
}

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  paid: "Paid",
  partial: "Partially paid",
  unpaid: "Unpaid",
  refunded: "Refunded",
};

const PAYMENT_CLASSES: Record<PaymentStatus, string> = {
  paid: "bg-success-bg text-success",
  partial: "bg-warning-bg text-warning",
  unpaid: "bg-surface-2 text-fg-muted",
  refunded: "bg-danger-bg text-danger",
};

export function PaymentStatusPill({
  status,
  bare,
  label,
}: {
  status: PaymentStatus;
  bare?: boolean;
  label?: string;
}) {
  return (
    <Pill bare={bare} className={PAYMENT_CLASSES[status]}>
      {label ?? PAYMENT_LABELS[status]}
    </Pill>
  );
}

const STOCK_LABELS: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  preorder: "Pre-order",
};

const STOCK_CLASSES: Record<StockStatus, string> = {
  in_stock: "bg-success-bg text-success",
  low_stock: "bg-warning-bg text-warning",
  out_of_stock: "bg-danger-bg text-danger",
  preorder: "bg-status-processing/15 text-status-processing",
};

export function StockStatusPill({
  status,
  bare,
  label,
}: {
  status: StockStatus;
  bare?: boolean;
  label?: string;
}) {
  return (
    <Pill bare={bare} className={STOCK_CLASSES[status]}>
      {label ?? STOCK_LABELS[status]}
    </Pill>
  );
}
