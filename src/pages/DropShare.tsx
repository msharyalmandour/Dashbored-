import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, PenLine, Sparkles, Users, X } from "lucide-react";
import Vessel from "../components/drop/Vessel";
import { useAuth } from "../context/AuthContext";
import { useResearchProject } from "../hooks/useResearchProject";
import { detectPaste, takeShared, type SharedPayload } from "../lib/drops";
import { queueDrop } from "../lib/dropQueue";
import { tr } from "../lib/i18n";

let sharedOnce: Promise<SharedPayload | null> | null = null;

/** «ارموها لـ Wesync» (DropShare): اللي انشارك من تطبيق ثاني — معاينة، شريحة كشف، الفريق، كلمة اختيارية، ثم «ارموها» */
export default function DropShare() {
  const navigate = useNavigate();
  const { team } = useAuth();
  const { project } = useResearchProject();
  const [shared, setShared] = useState<SharedPayload | null | undefined>(undefined);
  const [note, setNote] = useState("");

  useEffect(() => {
    // نفس الوعد للنداءين (React يشغّل الأثر مرتين بالتطوير) — المشاركة تنقرا وتنمسح مرة وحدة
    sharedOnce ??= takeShared();
    void sharedOnce.then(setShared);
  }, []);

  const text = [shared?.title, shared?.text, shared?.url].filter(Boolean).join("\n").trim();
  const images = useMemo(() => (shared?.files ?? []).filter((f) => f.type.startsWith("image/")), [shared]);
  const previews = useMemo(() => images.slice(0, 3).map((f) => URL.createObjectURL(f)), [images]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  const hint = detectPaste(text).hint;
  const fromWa = /whatsapp|واتساب/i.test(`${shared?.title ?? ""} ${shared?.files.map((f) => f.name).join(" ") ?? ""}`);
  const nothing = shared === null || (shared && !text && !shared.files.length);

  const go = () => {
    if (!shared) return;
    const body = [text, note.trim() && tr("كلمة من الفريق: {0}", note.trim())].filter(Boolean).join("\n\n");
    sharedOnce = null;
    queueDrop(shared.files, "share", body);
    navigate("/drop");
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 pt-1">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="h-[34px] w-[34px] rounded-full" style={{ background: "radial-gradient(circle at 50% 60%, #FFF0C2 0, #FFC85A 22%, #FF7A10 55%, #C2400A 82%)" }} />
        <b className="text-[17px]">Wesync</b>
        <span className="flex-1" />
        <button type="button" className="dr-card flex h-11 w-11 items-center justify-center rounded-full text-[#EAE3DC]" aria-label={tr("إغلاق")} onClick={() => navigate("/")}>
          <X size={18} />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <Vessel size={96} state="hover" />
        <div>
          <div className="text-[13px] font-bold text-[#FFB444]">{fromWa ? tr("جاية من واتساب") : tr("جاية من تطبيق ثاني")}</div>
          <h1 className="dr-title text-[24px] leading-[1.3]">{tr("ارموها لـ Wesync")}</h1>
        </div>
      </div>

      {shared === undefined ? null : nothing ? (
        <section className="dr-card rounded-[26px] p-4 text-center">
          <p className="m-0 text-[15px] text-[#E9D3B8]">{tr("ما وصلنا شي من المشاركة. جرّبوا تشاركونه مرة ثانية، أو ارموه من صفحة «ارموا أي شي».")}</p>
          <button type="button" className="dr-cream mt-3 w-full" onClick={() => navigate("/drop")}>
            {tr("افتحوا «ارموا أي شي»")}
          </button>
        </section>
      ) : (
        <>
          <section className="dr-card dr-in rounded-[26px] p-3">
            <div className="rounded-[18px] bg-[#0B141A] p-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
              {previews.length > 0 && (
                <div className={`grid gap-1.5 ${previews.length > 1 ? "grid-cols-2" : ""}`}>
                  {previews.map((u) => (
                    <img key={u} src={u} alt={tr("الصورة المشاركة")} className="max-h-[260px] w-full rounded-[10px] object-cover" />
                  ))}
                </div>
              )}
              {text && (
                <div className={`rounded-[10px_10px_10px_2px] bg-[#1F2C33] px-2.5 py-2 text-[13px] leading-[1.6] text-[#E9EDEF] ${previews.length ? "mt-2" : ""}`} dir="auto">
                  {text.length > 600 ? `${text.slice(0, 600)}…` : text}
                </div>
              )}
              {!previews.length && !text && (
                <div className="text-[13px] text-[#E9EDEF]" dir="auto">
                  {shared!.files.map((f) => f.name).join("، ")}
                </div>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {hint && (
                <span className="dr-chip gold">
                  <Sparkles size={12} aria-hidden />
                  {hint}
                </span>
              )}
              {images.length > 0 && <span className="dr-chip">{tr("سكرين شوت · {0}", images.length)}</span>}
              {shared!.files.length > images.length && <span className="dr-chip">{tr("ملفات · {0}", shared!.files.length - images.length)}</span>}
            </div>
          </section>
          <section className="dr-card rounded-[22px] px-3.5 py-3">
            <div className="mb-1.5 text-[13px] text-[#ABA095]">{tr("للفريق")}</div>
            <div className="flex items-center gap-2.5">
              <span className="dr-ic" aria-hidden>
                <Users size={16} />
              </span>
              <b className="flex-1 truncate text-[15px]" dir="auto">
                {project?.title?.trim() || team?.name || tr("فريقكم")}
              </b>
              <ChevronLeft size={18} className="text-[#ABA095] ltr:rotate-180" aria-hidden />
            </div>
          </section>
          <label className="flex min-h-[48px] items-center gap-2.5 rounded-2xl bg-black/25 px-3.5 text-[14px] text-[#ABA095] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
            <PenLine size={16} aria-hidden />
            <input className="min-w-0 flex-1 border-0 bg-transparent text-[#EAE3DC] outline-none placeholder:text-[#ABA095]" placeholder={tr("كلمة للفريق (اختياري)")} value={note} onChange={(e) => setNote(e.target.value)} dir="auto" />
          </label>
          <button type="button" className="dr-primary mt-1" onClick={go}>
            {tr("ارموها")}
          </button>
          <p className="m-0 text-center text-[12px] text-[#ABA095]">{tr("بنقراها ونوريكم وين بتنحط قبل لا نحطها.")}</p>
        </>
      )}
    </div>
  );
}
