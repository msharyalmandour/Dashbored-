"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { PerfumeBottle } from "@/components/ui/PerfumeBottle";
import { formatPrice } from "@/lib/utils";
import { SITE } from "@/lib/constants";

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const shippingFee = subtotal === 0 || subtotal >= SITE.freeShippingThreshold ? 0 : SITE.shippingFee;
  const total = subtotal + shippingFee;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl text-foreground">سلتك فارغة</h1>
        <p className="mt-4 text-muted">لم تقم بإضافة أي منتج بعد.</p>
        <Link
          href="/shop"
          className="mt-8 inline-block rounded-full bg-gold px-8 py-3.5 text-sm font-bold text-background"
        >
          تسوق الآن
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display mb-10 text-3xl text-foreground">سلة المشتريات</h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4"
            >
              <Link
                href={`/product/${item.slug}`}
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-surface-raised"
              >
                <PerfumeBottle accentColor={item.accentColor} className="h-14 w-auto" />
              </Link>

              <div className="flex-1">
                <Link href={`/product/${item.slug}`} className="font-display text-foreground hover:text-gold">
                  {item.name}
                </Link>
                <p className="mt-1 text-xs text-muted">{item.volumeMl} مل</p>
                <p className="mt-1 text-sm font-bold text-gold">{formatPrice(item.price)}</p>
              </div>

              <div className="flex items-center rounded-full border border-border">
                <button
                  type="button"
                  aria-label="تقليل الكمية"
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="p-2 text-foreground hover:text-gold"
                >
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <button
                  type="button"
                  aria-label="زيادة الكمية"
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  className="p-2 text-foreground hover:text-gold"
                >
                  <Plus size={14} />
                </button>
              </div>

              <button
                type="button"
                aria-label="حذف المنتج"
                onClick={() => removeItem(item.productId)}
                className="p-2 text-muted hover:text-red-400"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        <div className="h-fit rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-display mb-6 text-xl text-foreground">ملخص الطلب</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-muted">
              <span>المجموع الفرعي</span>
              <span className="text-foreground">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>الشحن</span>
              <span className="text-foreground">
                {shippingFee === 0 ? "مجاني" : formatPrice(shippingFee)}
              </span>
            </div>
          </div>

          <div className="gold-divider my-5" />

          <div className="flex justify-between text-base font-bold">
            <span>الإجمالي</span>
            <span className="text-gold">{formatPrice(total)}</span>
          </div>

          <Link
            href="/checkout"
            className="mt-6 block rounded-full bg-gold py-3.5 text-center text-sm font-bold text-background transition-transform hover:scale-[1.01]"
          >
            إتمام الشراء
          </Link>
        </div>
      </div>
    </div>
  );
}
