import type { OrderStatus } from "@/lib/types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "بانتظار الدفع",
  paid: "مدفوع",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  refunded: "مسترجع",
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  paid: "bg-emerald-500/15 text-emerald-400",
  processing: "bg-blue-500/15 text-blue-400",
  shipped: "bg-purple-500/15 text-purple-400",
  delivered: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-red-500/15 text-red-400",
  refunded: "bg-red-500/15 text-red-400",
};
