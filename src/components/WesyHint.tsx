import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { WesyAvatar } from "./brand/Wesy";
import { useAuth } from "../context/AuthContext";
import { useTour } from "../context/TourContext";
import { tr } from "../lib/i18n";

/* ويسي بالزاوية: أول مرة تفتح قسم يطلع صغير ويقول جملة وحدة عنه، وبس. ما يرجع لنفس القسم أبد.
   ما يطلع وقت الجولة، ولا بالرئيسية (فيها مكتبه)، ويختفي لحاله بعد ١٢ ثانية أو بضغطة. */

const LINES: { prefix: string; id: string; line: () => string }[] = [
  { prefix: "/tasks", id: "tasks", line: () => tr("أول مرة هنا؟ هذي مهامك. اضغط الدائرة جنب المهمة لما تخلصها.") },
  { prefix: "/research-search", id: "search", line: () => tr("اكتب موضوعك بكلمتين، وأنا أطلع لك دراسات.") },
  { prefix: "/evidence", id: "evidence", line: () => tr("هنا الدراسات اللي حفظتوها، كل وحدة جاهزة للاقتباس.") },
  { prefix: "/proposal", id: "proposal", line: () => tr("المقترح مقسوم أقسام. كل واحد منكم يمسك قسم.") },
  { prefix: "/chat", id: "chat", line: () => tr("هنا تتكلمون كفريق. اللي ينقال هنا ما يضيع.") },
  { prefix: "/meeting-minutes", id: "minutes", line: () => tr("هنا الاجتماعات. ملاحظات المشرف/ة تصير مهام.") },
  { prefix: "/calendar", id: "calendar", line: () => tr("كل مواعيدكم هنا بمكان واحد.") },
  { prefix: "/collect", id: "collect", line: () => tr("هنا الاستبيان والبيانات، خطوة خطوة.") },
  { prefix: "/files", id: "files", line: () => tr("ملفات الفريق كلها هنا.") },
];

const KEY = (uid: string) => `wesync.hints.${uid}`;
function seenSet(uid: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY(uid)) ?? "[]") as string[]);
  } catch {
    return new Set(LINES.map((l) => l.id));
  }
}

export default function WesyHint() {
  const { pathname } = useLocation();
  const { currentUser } = useAuth();
  const { activeIndex } = useTour();
  const [hint, setHint] = useState<{ id: string; text: string } | null>(null);
  const uid = currentUser?.id ?? "";

  useEffect(() => {
    setHint(null);
    if (!uid || activeIndex !== null) return;
    const match = LINES.find((l) => pathname === l.prefix || pathname.startsWith(`${l.prefix}/`));
    if (!match) return;
    const seen = seenSet(uid);
    if (seen.has(match.id)) return;
    seen.add(match.id);
    try {
      localStorage.setItem(KEY(uid), JSON.stringify([...seen]));
    } catch {
      return;
    }
    // نخلي الصفحة تفتح أول، بعدين يطلع
    const show = window.setTimeout(() => setHint({ id: match.id, text: match.line() }), 700);
    const hide = window.setTimeout(() => setHint(null), 12700);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [pathname, uid, activeIndex]);

  if (!hint) return null;
  return (
    <div key={hint.id} className="wt-hint print:hidden" role="status">
      <WesyAvatar size={38} state="greet" />
      <p className="m-0 min-w-0 flex-1 text-sm font-medium leading-relaxed text-ws-text">{hint.text}</p>
      <button type="button" className="wt-icon" onClick={() => setHint(null)} aria-label={tr("إخفاء")}>
        <X size={14} />
      </button>
    </div>
  );
}
