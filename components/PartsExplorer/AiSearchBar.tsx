"use client";

import { useState } from "react";

export default function AiSearchBar({
  onSearch,
  note,
}: {
  onSearch: (query: string) => void;
  note: string | null;
}) {
  const [query, setQuery] = useState("");

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(query);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-text-soft">
            ✨
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اكتب سؤالك… مثلاً: وين الرديتر؟"
            className="w-full rounded-diqa border border-line bg-panel py-3 pe-11 ps-4 text-sm text-text placeholder:text-text-soft/70 focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-diqa border border-primary bg-primary px-6 py-3 text-sm font-medium text-bg transition-colors hover:bg-transparent hover:text-primary"
        >
          ابحث
        </button>
      </form>
      {note && <p className="mt-2 text-sm text-accent">{note}</p>}
      <p className="mt-1 text-[11px] text-text-soft">
        محاكاة مطابقة كلمات مفتاحية (mock) — وليس نموذج ذكاء اصطناعي فعلي.
      </p>
    </div>
  );
}
