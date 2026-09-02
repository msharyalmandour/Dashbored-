"use client";

import { useState } from "react";
import DemoBadge from "./DemoBadge";
import VinCheckTab from "./VinCheckTab";
import ImageCheckTab from "./ImageCheckTab";

type Tab = "vin" | "image";

export default function IdentifyPanel() {
  const [tab, setTab] = useState<Tab>("vin");

  return (
    <section id="identify" className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-3">
        <DemoBadge />
        <h2 className="font-editorial text-4xl text-text">الفحص الذكي</h2>
        <p className="max-w-xl text-text-soft">
          هذا القسم للعرض التجريبي فقط — النتائج بيانات وهمية ولا يوجد اتصال
          فعلي بأي نموذج ذكاء اصطناعي أو قاعدة بيانات حقيقية بهذه المرحلة.
        </p>
      </div>

      <div className="rounded-diqa border border-line bg-panel/60 p-1.5 sm:inline-flex sm:p-1">
        <div className="grid grid-cols-2 gap-1.5 sm:flex">
          <button
            type="button"
            onClick={() => setTab("vin")}
            className={`rounded-diqa-sm px-5 py-2.5 text-sm font-medium transition-colors ${
              tab === "vin"
                ? "bg-primary text-bg"
                : "text-text-soft hover:text-text"
            }`}
          >
            رقم الشاصي
          </button>
          <button
            type="button"
            onClick={() => setTab("image")}
            className={`rounded-diqa-sm px-5 py-2.5 text-sm font-medium transition-colors ${
              tab === "image"
                ? "bg-primary text-bg"
                : "text-text-soft hover:text-text"
            }`}
          >
            صورة القطعة
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-diqa border border-line bg-panel p-6 sm:p-8">
        {tab === "vin" ? <VinCheckTab /> : <ImageCheckTab />}
      </div>
    </section>
  );
}
