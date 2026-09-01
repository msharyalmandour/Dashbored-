import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { mockProducts } from "@/data/mock-products";
import { formatPrice, cn } from "@/lib/utils";

export default function AdminProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-foreground">المنتجات</h1>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-background"
        >
          <Plus size={16} />
          إضافة منتج
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-2 sm:p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-right text-muted">
                <th className="p-3 font-normal">SKU</th>
                <th className="p-3 font-normal">المنتج</th>
                <th className="p-3 font-normal">الفئة</th>
                <th className="p-3 font-normal">السعر</th>
                <th className="p-3 font-normal">الحالة</th>
                <th className="p-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {mockProducts.map((product) => (
                <tr key={product.id} className="border-b border-border/50 last:border-0">
                  <td className="p-3 text-muted" dir="ltr">
                    {product.sku}
                  </td>
                  <td className="p-3">{product.name}</td>
                  <td className="p-3 text-muted">{product.category}</td>
                  <td className="p-3">{formatPrice(product.price)}</td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs",
                        product.inStock
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400",
                      )}
                    >
                      {product.inStock ? "متوفر" : "نفدت الكمية"}
                    </span>
                  </td>
                  <td className="p-3 text-left">
                    <Link
                      href={`/admin/products/${product.slug}`}
                      className="inline-flex items-center gap-1 text-xs text-gold hover:text-gold-light"
                    >
                      <Pencil size={14} />
                      تعديل
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted">
        البيانات الحالية تجريبية — سيتم استبدالها بجدول products في Supabase عند ربط قاعدة البيانات.
      </p>
    </div>
  );
}
