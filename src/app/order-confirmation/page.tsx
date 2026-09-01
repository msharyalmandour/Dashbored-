"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function OrderConfirmationPage() {
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    // sessionStorage isn't available during SSR, so this must read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrderNumber(sessionStorage.getItem("lastOrderNumber"));
    const storedTotal = sessionStorage.getItem("lastOrderTotal");
    setTotal(storedTotal ? Number(storedTotal) : null);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
      <CheckCircle2 size={56} className="mx-auto text-gold" />

      <h1 className="font-display mt-6 text-3xl text-foreground sm:text-4xl">
        تم استلام طلبك بنجاح
      </h1>

      <p className="mt-4 leading-8 text-muted">
        شكراً لثقتك بـ أثر. سيتم التواصل معك قريباً لتأكيد الطلب وموعد التوصيل.
      </p>

      {orderNumber && (
        <div className="mx-auto mt-8 inline-flex flex-col gap-1 rounded-2xl border border-border bg-surface px-8 py-5">
          <span className="text-xs text-muted">رقم الطلب</span>
          <span dir="ltr" className="font-display text-lg text-gold">
            {orderNumber}
          </span>
          {total !== null && (
            <span className="mt-2 text-sm text-foreground">
              الإجمالي: {formatPrice(total)}
            </span>
          )}
        </div>
      )}

      <p className="mt-6 text-xs text-muted">
        ملاحظة: الدفع الإلكتروني عبر Tap Payments قيد الإعداد — هذا الطلب تجريبي حتى ربط بوابة الدفع وقاعدة البيانات.
      </p>

      <Link
        href="/shop"
        className="mt-10 inline-block rounded-full bg-gold px-8 py-3.5 text-sm font-bold text-background"
      >
        متابعة التسوق
      </Link>
    </div>
  );
}
