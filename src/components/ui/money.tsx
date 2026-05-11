import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

interface MoneyProps {
  kobo: number;
  variant?: "default" | "strikethrough" | "large" | "sale";
  showDecimals?: boolean;
  className?: string;
}

export function Money({
  kobo,
  variant = "default",
  showDecimals = false,
  className,
}: MoneyProps) {
  return (
    <span
      data-num
      className={cn(
        "tabular",
        variant === "strikethrough" && "line-through text-fg-subtle font-medium",
        variant === "large" && "text-2xl font-bold tracking-tight",
        variant === "sale" && "text-danger font-bold",
        className,
      )}
    >
      {formatMoney(kobo, showDecimals)}
    </span>
  );
}
