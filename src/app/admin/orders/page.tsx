import { mockOrders } from "@/data/mock-orders";
import { formatPrice, cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/order-status";

export default function AdminOrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-foreground">الطلبات</h1>
        <span className="text-sm text-muted">{mockOrders.length} طلب</span>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-2 sm:p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-right text-muted">
                <th className="p-3 font-normal">رقم الطلب</th>
                <th className="p-3 font-normal">العميل</th>
                <th className="p-3 font-normal">المدينة</th>
                <th className="p-3 font-normal">عدد المنتجات</th>
                <th className="p-3 font-normal">الإجمالي</th>
                <th className="p-3 font-normal">طريقة الدفع</th>
                <th className="p-3 font-normal">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {mockOrders.map((order) => (
                <tr key={order.id} className="border-b border-border/50 last:border-0">
                  <td className="p-3" dir="ltr">
                    {order.orderNumber}
                  </td>
                  <td className="p-3">
                    <div>{order.customerName}</div>
                    <div dir="ltr" className="text-xs text-muted">
                      {order.customerPhone}
                    </div>
                  </td>
                  <td className="p-3">{order.city}</td>
                  <td className="p-3">
                    {order.items.reduce((n, i) => n + i.quantity, 0)}
                  </td>
                  <td className="p-3">{formatPrice(order.total)}</td>
                  <td className="p-3 text-muted">{order.paymentMethod ?? "—"}</td>
                  <td className="p-3">
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

      <p className="text-xs text-muted">
        البيانات الحالية تجريبية — سيتم استبدالها بجدول orders في Supabase عند ربط قاعدة البيانات.
      </p>
    </div>
  );
}
