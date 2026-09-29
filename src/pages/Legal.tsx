import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, Mail, MessageCircle } from "lucide-react";
import Logo from "../components/Logo";
import {
  BUSINESS_OWNER_NAME,
  FREELANCE_DOC_NUMBER,
  LAST_UPDATED,
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP,
  legalDocs,
  type LegalDocId,
} from "../lib/legal";

const order: LegalDocId[] = ["terms", "privacy", "refund", "contact"];

/** صفحات قانونية عامة (شروط، خصوصية، استرداد، تواصل) — مفتوحة بدون تسجيل دخول
    لأن مزودي الدفع يراجعونها على الموقع العام قبل الموافقة */
export default function Legal() {
  const { doc } = useParams<{ doc: string }>();
  const current = doc && doc in legalDocs ? legalDocs[doc as LegalDocId] : null;
  if (!current) return <Navigate to="/legal/terms" replace />;

  const hasContact = !!(SUPPORT_EMAIL || SUPPORT_WHATSAPP);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-gradient-to-b from-amber-400/10 to-transparent" />
      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <Link to="/" className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-amber-300">
          الرئيسية
          <ArrowRight size={13} className="rotate-180" />
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-20">
        <nav className="mb-8 flex flex-wrap gap-2">
          {order.map((id) => (
            <Link
              key={id}
              to={`/legal/${id}`}
              className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
                id === current.id
                  ? "border-amber-400/50 bg-amber-400/15 text-amber-300"
                  : "border-white/10 bg-white/[0.04] text-white/55 hover:text-white"
              }`}
            >
              {legalDocs[id].title}
            </Link>
          ))}
        </nav>

        <h1 className="font-display text-3xl font-extrabold">{current.title}</h1>
        <p className="mt-1 text-sm text-white/40">
          {current.subtitle} · آخر تحديث {LAST_UPDATED}
        </p>

        <div className="mt-8 space-y-8">
          {current.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-base font-extrabold text-amber-300">{s.heading}</h2>
              {s.paragraphs?.map((p) => (
                <p key={p} className="mt-2 text-sm leading-relaxed text-white/70">
                  {p}
                </p>
              ))}
              {s.bullets && (
                <ul className="mt-2 list-disc space-y-1.5 ps-5 text-sm leading-relaxed text-white/70 marker:text-amber-400/60">
                  {s.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {current.id === "contact" && (
            <section className="space-y-3">
              {SUPPORT_EMAIL && (
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold hover:border-amber-400/40"
                >
                  <Mail size={18} className="text-amber-300" />
                  <span dir="ltr">{SUPPORT_EMAIL}</span>
                </a>
              )}
              {SUPPORT_WHATSAPP && (
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold hover:border-amber-400/40"
                >
                  <MessageCircle size={18} className="text-amber-300" />
                  <span dir="ltr">+{SUPPORT_WHATSAPP}</span>
                  <span className="text-xs font-normal text-white/40">واتساب</span>
                </a>
              )}
              {!hasContact && (
                <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/50">
                  قناة التواصل قيد الإعداد.
                </p>
              )}
              {(BUSINESS_OWNER_NAME || FREELANCE_DOC_NUMBER) && (
                <p className="pt-2 text-xs leading-relaxed text-white/40">
                  {BUSINESS_OWNER_NAME && <>المالكة: {BUSINESS_OWNER_NAME}. </>}
                  {FREELANCE_DOC_NUMBER && <>وثيقة العمل الحر رقم: {FREELANCE_DOC_NUMBER}. </>}
                  المملكة العربية السعودية.
                </p>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
