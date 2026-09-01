"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";

export function ProductForm({ product }: { product?: Product }) {
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    // TODO: insert/update into Supabase `products` table once connected.
    window.setTimeout(() => setSubmitting(false), 600);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <fieldset className="grid gap-4 rounded-2xl border border-border bg-surface p-6 sm:grid-cols-2">
        <legend className="px-2 text-sm font-bold text-gold">معلومات أساسية</legend>
        <input
          defaultValue={product?.name}
          required
          placeholder="اسم المنتج"
          className="input-field sm:col-span-2"
        />
        <textarea
          defaultValue={product?.description}
          required
          rows={3}
          placeholder="الوصف"
          className="input-field sm:col-span-2"
        />
        <input defaultValue={product?.sku} required placeholder="SKU" className="input-field" dir="ltr" />
        <input defaultValue={product?.category} required placeholder="الفئة" className="input-field" />
        <select defaultValue={product?.gender ?? "unisex"} className="input-field">
          <option value="men">رجالي</option>
          <option value="women">نسائي</option>
          <option value="unisex">مشترك</option>
        </select>
        <select defaultValue={product?.concentration ?? "Eau de Parfum"} className="input-field">
          <option value="Eau de Parfum">Eau de Parfum</option>
          <option value="Eau de Toilette">Eau de Toilette</option>
          <option value="Parfum">Parfum</option>
          <option value="معطر عود">معطر عود</option>
        </select>
      </fieldset>

      <fieldset className="grid gap-4 rounded-2xl border border-border bg-surface p-6 sm:grid-cols-3">
        <legend className="px-2 text-sm font-bold text-gold">السعر والمخزون</legend>
        <input
          defaultValue={product?.price}
          required
          type="number"
          min={0}
          placeholder="السعر (ر.س)"
          className="input-field"
        />
        <input
          defaultValue={product?.volumeMl}
          required
          type="number"
          min={0}
          placeholder="الحجم (مل)"
          className="input-field"
        />
        <label className="flex items-center gap-2 self-center text-sm text-foreground">
          <input type="checkbox" defaultChecked={product?.inStock ?? true} />
          متوفر في المخزون
        </label>
      </fieldset>

      <fieldset className="grid gap-4 rounded-2xl border border-border bg-surface p-6">
        <legend className="px-2 text-sm font-bold text-gold">هرم العطر</legend>
        <input
          defaultValue={product?.notes.top.join("، ")}
          placeholder="مقدمة العطر (مفصولة بفاصلة)"
          className="input-field"
        />
        <input
          defaultValue={product?.notes.heart.join("، ")}
          placeholder="قلب العطر (مفصولة بفاصلة)"
          className="input-field"
        />
        <input
          defaultValue={product?.notes.base.join("، ")}
          placeholder="قاعدة العطر (مفصولة بفاصلة)"
          className="input-field"
        />
      </fieldset>

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-full bg-gold px-8 py-3 text-sm font-bold text-background disabled:opacity-60"
      >
        {submitting ? "جارِ الحفظ..." : "حفظ المنتج"}
      </button>
      <p className="text-xs text-muted">
        هذا النموذج غير متصل بقاعدة البيانات بعد — سيتم ربطه بجدول products في Supabase لاحقاً.
      </p>
    </form>
  );
}
