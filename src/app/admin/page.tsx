import { mockOrders } from "@/data/mock-orders";
import { mockProducts } from "@/data/mock-products";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/order-status";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const revenue = mockOrders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = mockOrders.filter((o) => o.status === "pending").length;
  const lowStock = mockProducts.filter((p) => !p.inStock).length;

  const stats = [
    { label: "إجمالي الإيرادات", value: formatPrice(revenue) },
    { label: "عدد الطلبات", value: mockOrders.length },
    { label: "طلبات بانتظار الدفع", value: pendingOrders },
    { label: "منتجات نفدت كميتها", value: lowStock },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-3xl text-foreground">نظرة عامة</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-2 text-2xl font-bold text-gold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 font-display text-xl text-foreground">أحدث الطلبات</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-right text-muted">
                <th className="pb-3 font-normal">رقم الطلب</th>
                <th className="pb-3 font-normal">العميل</th>
                <th className="pb-3 font-normal">الإجمالي</th>
                <th className="pb-3 font-normal">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {mockOrders.map((order) => (
                <tr key={order.id} className="border-b border-border/50 last:border-0">
                  <td className="py-3" dir="ltr">
                    {order.orderNumber}
                  </td>
                  <td className="py-3">{order.customerName}</td>
                  <td className="py-3">{formatPrice(order.total)}</td>
                  <td className="py-3">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs",
                        ORDER_STATUS_STYLES[order.status],
                      )}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
