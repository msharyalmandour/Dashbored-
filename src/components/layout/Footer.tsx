import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { NAV_LINKS, SITE } from "@/lib/constants";

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gold">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="font-display gold-gradient-text text-2xl tracking-[0.2em]">
              {SITE.name}
            </span>
            <p className="mt-4 max-w-xs text-sm leading-7 text-muted">
              {SITE.description}
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold tracking-wide text-gold">
              روابط سريعة
            </h3>
            <ul className="space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold tracking-wide text-gold">
              خدمة العملاء
            </h3>
            <ul className="space-y-3 text-sm text-muted">
              <li>الشحن والتوصيل</li>
              <li>سياسة الاستبدال والاسترجاع</li>
              <li>الأسئلة الشائعة</li>
              <li>تتبع الطلب</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold tracking-wide text-gold">
              تواصل معنا
            </h3>
            <ul className="space-y-3 text-sm text-muted">
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-gold" />
                <span dir="ltr">{SITE.phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle size={16} className="text-gold" />
                <a href={SITE.whatsapp} className="hover:text-gold">واتساب</a>
              </li>
              <li className="flex items-center gap-2">
                <InstagramIcon />
                <a href={SITE.instagram} className="hover:text-gold">انستغرام</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="gold-divider my-10" />

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} {SITE.name} — جميع الحقوق محفوظة.</p>
          <p>عمل حر مرخّص · المملكة العربية السعودية</p>
        </div>
      </div>
    </footer>
  );
}
