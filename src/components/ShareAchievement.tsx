import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Share2, X } from "lucide-react";
import { drawAchievement, shareOrDownload } from "../lib/achievementCard";
import { tr } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";

/** نافذة بطاقة الإنجاز: معاينة الصورة + «شاركوها» (قائمة المشاركة بالجوال: ستوري/واتساب) أو «حمّلوها».
    الصورة تنرسم أول ما تنفتح النافذة: سفاري يرفض المشاركة لو سبقها انتظار داخل نفس الضغطة. */
export default function ShareAchievement({ title, sub, step, onClose }: { title: string; sub: string; step: number | null; onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const { team } = useAuth();
  const refCode = team?.referralCode ?? null;

  useEffect(() => {
    let alive = true;
    let made = "";
    void drawAchievement({ title, sub, step, refCode }).then((b) => {
      if (!alive || !b) return;
      made = URL.createObjectURL(b);
      setBlob(b);
      setUrl(made);
    });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [title, sub, step, refCode]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const act = async () => {
    if (!blob) return;
    const r = await shareOrDownload(blob, undefined, refCode);
    if (r === "downloaded") setNote(tr("نزلت الصورة — حطّوها بالستوري ✨"));
    if (r === "shared") onClose();
  };

  return createPortal(
    <div className="ach-scrim" onClick={onClose}>
      <div className="ach-sheet" role="dialog" aria-modal="true" aria-label={tr("بطاقة الإنجاز")} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <b className="flex-1 text-[17px] text-[#F2EBE3]">{tr("شاركوا إنجازكم")}</b>
          <button type="button" className="door-x" aria-label={tr("إغلاق")} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="m-0 mt-1 text-[13px] text-[#ABA095]">{tr("بدون عنوان بحثكم ولا أسماءكم — الإنجاز بس.")}</p>
        <div className="ach-prev">{url ? <img src={url} alt={tr("بطاقة الإنجاز: {0}", title)} /> : <span className="sup-skel" style={{ width: "100%", height: "100%" }} />}</div>
        <button type="button" className="ach-go" disabled={!blob} onClick={() => void act()}>
          <Share2 size={18} aria-hidden />
          {tr("شاركوها")}
        </button>
        <button
          type="button"
          className="ach-dl"
          disabled={!blob}
          onClick={() => {
            if (!blob) return;
            const a = document.createElement("a");
            a.href = url;
            a.download = "wesync-achievement.png";
            a.click();
            setNote(tr("نزلت الصورة — حطّوها بالستوري ✨"));
          }}
        >
          <Download size={16} aria-hidden />
          {tr("حمّلوها")}
        </button>
        {note && (
          <p role="status" className="m-0 mt-2 text-center text-[13px] text-[#FFC777]">
            {note}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
