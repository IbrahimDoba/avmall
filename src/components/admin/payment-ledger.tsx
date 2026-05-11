"use client";

import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Receipt } from "lucide-react";
import type { OrderPayment } from "@/lib/admin-mock-data";
import { cn } from "@/lib/utils";

interface PaymentLedgerProps {
  payments: readonly OrderPayment[];
  className?: string;
}

const STATUS_TONE = {
  completed: "success",
  pending: "warning",
  failed: "danger",
} as const;

export function PaymentLedger({ payments, className }: PaymentLedgerProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {payments.map((p, i) => (
        <div
          key={i}
          className={cn(
            "px-4 py-3 flex items-start gap-3",
            i > 0 && "border-t border-border",
          )}
        >
          <div
            className={cn(
              "size-9 rounded-md flex items-center justify-center flex-shrink-0",
              p.status === "completed"
                ? "bg-success-bg text-success"
                : p.status === "pending"
                  ? "bg-warning-bg text-warning"
                  : "bg-danger-bg text-danger",
            )}
          >
            <Receipt className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{p.method}</span>
              <Badge tone={STATUS_TONE[p.status]}>
                {p.status[0]!.toUpperCase() + p.status.slice(1)}
              </Badge>
            </div>
            <div className="text-[11px] text-fg-muted">
              <span className="font-mono tabular">{p.txRef}</span> · by {p.by} · {p.time}
            </div>
          </div>
          <div className="text-right">
            <Money kobo={p.amountKobo} className="font-bold text-sm" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 text-fg-muted hover:text-fg rounded-md hover:bg-surface-2"
                aria-label="Payment actions"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View receipt</DropdownMenuItem>
              <DropdownMenuItem>Copy reference</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive>Reverse payment</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
}
