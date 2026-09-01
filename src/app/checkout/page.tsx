"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/utils";
import { SAUDI_CITIES, SITE } from "@/lib/constants";

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const shippingFee = subtotal >= SITE.freeShippingThreshold ? 0 : SITE.shippingFee;
  const total = subtotal + shippingFee;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    // TODO: POST to /api/checkout once Tap Payments + Supabase orders table
    // are connected. For now this simulates order placement locally so the
    // full customer flow (cart → checkout → confirmation) can be tested.
    const orderNumber = `ATH-${Date.now().toString().slice(-6)}`;
    sessionStorage.setItem("lastOrderNumber", orderNumber);
    sessionStorage.setItem("lastOrderTotal", String(total));
    clearCart();
    router.push("/order-confirmation");
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl text-foreground">سلتك فارغة</h1>
        <p className="mt-4 text-muted">أضف منتجاً قبل إتمام الشراء.</p>
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
      <h1 className="font-display mb-10 text-3xl text-foreground">إتمام الشراء</h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <fieldset className="rounded-2xl border border-border bg-surface p-6">
            <legend className="px-2 text-sm font-bold text-gold">بيانات التوصيل</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <input required placeholder="الاسم الكامل" className="input-field sm:col-span-2" />
              <input required type="tel" dir="ltr" placeholder="رقم الجوال" className="input-field" />
              <input type="email" dir="ltr" placeholder="البريد الإلكتروني (اختياري)" className="input-field" />
              <select required defaultValue="" className="input-field">
                <option value="" disabled>
                  اختر المدينة
                </option>
                {SAUDI_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <input required placeholder="الحي والشارع ورقم المبنى" className="input-field" />
              <textarea
                placeholder="ملاحظات إضافية (اختياري)"
                rows={3}
                className="input-field sm:col-span-2"
              />
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-border bg-surface p-6">
            <legend className="px-2 text-sm font-bold text-gold">طريقة الدفع</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {["مدى", "Apple Pay", "فيزا / ماستركارد"].map((method) => (
                <label
                  key={method}
                  className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-border p-4 text-sm text-muted opacity-60"
                >
                  <input type="radio" name="payment" disabled />
                  {method}
                </label>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">
              بوابة الدفع (Tap Payments) قيد الإعداد حالياً — سيتم تفعيل الدفع الإلكتروني قريباً.
            </p>
          </fieldset>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-gold py-4 text-sm font-bold text-background transition-transform hover:scale-[1.01] disabled:opacity-60"
          >
            {submitting ? "جارِ إرسال الطلب..." : "تأكيد الطلب"}
          </button>
        </form>

        <div className="h-fit rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-display mb-6 text-xl text-foreground">ملخص الطلب</h2>
          <ul className="space-y-3 text-sm">
            {items.map((item) => (
              <li key={item.productId} className="flex justify-between text-muted">
                <span className="text-foreground">
                  {item.name} × {item.quantity}
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="gold-divider my-5" />

          <div className="space-y-2 text-sm">
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
        </div>
      </div>
    </div>
  );
}
