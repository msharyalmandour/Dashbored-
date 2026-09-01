"use client";

import { useState } from "react";

export function Newsletter() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
      <span className="text-xs tracking-[0.3em] text-gold">كن أول من يعلم</span>
      <h2 className="font-display mt-4 text-3xl text-foreground sm:text-4xl">
        اشترك في نشرتنا البريدية
      </h2>
      <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted">
        احصل على إشعار بالإصدارات الجديدة والعروض الحصرية أولاً بأول.
      </p>

      {submitted ? (
        <p className="mt-8 text-sm text-gold">
          شكراً لاشتراكك! سنوافيك بكل جديد. ✦
        </p>
      ) : (
        <form
          className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <input
            type="email"
            required
            placeholder="بريدك الإلكتروني"
            className="w-full flex-1 rounded-full border border-border bg-surface px-5 py-3 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-gold px-6 py-3 text-sm font-bold text-background transition-transform hover:scale-[1.02]"
          >
            اشتراك
          </button>
        </form>
      )}
    </section>
  );
}
