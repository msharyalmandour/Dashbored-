import { useLocation } from "react-router-dom";
import { openAgent } from "../lib/agentBus";
import { tr } from "../lib/i18n";

type Pose = "wave" | "clip" | "gantt" | "coffee" | "point";
type Scene = { match: string[]; pose: Pose; tag: string; say: string; flip?: boolean };

/** مشهد ويسي لكل قسم (التصميم الموحّد): رسم كرتوني بسيط + جملة منه + «اسأل ويسي». ويسي ما يختفي من أي قسم. */
const SCENES: Scene[] = [
  { match: ["/research-search", "/evidence", "/literature-review"], pose: "point", tag: "المكتبة", say: "أدوّر وأقرأ عنكم، وأنتم تقررون" },
  { match: ["/proposal", "/methodology", "/ethical-approval"], pose: "clip", tag: "المكتب", say: "أرتّب كلامكم، ما أكتب بدالكم" },
  { match: ["/collect", "/study-kit", "/surveys", "/stats", "/fieldwork"], pose: "gantt", tag: "غرفة البيانات", say: "أتابع الردود، وأشرح لكم الأرقام بالعربي" },
  { match: ["/tasks", "/team"], pose: "clip", tag: "غرفة الفريق", say: "كل واحد له خطوة واضحة، وما أحد يشيل الحمل لحاله", flip: true },
  { match: ["/meeting-minutes", "/feedback", "/minutes"], pose: "point", tag: "غرفة الاجتماعات", say: "أجهّز الأجندة، وأكتب المحضر عنكم" },
  { match: ["/calendar", "/files", "/drive"], pose: "wave", tag: "التقويم والملفات", say: "مواعيدكم في جوالكم، وملفاتكم كل واحد بمكانه" },
  { match: ["/viva"], pose: "point", tag: "المنصة", say: "أدرّبكم لين تدخلون المناقشة واثقين" },
];
/** صفحات ملء الشاشة أو لها مشهدها الخاص */
const SKIP = ["/", "/chat", "/meet", "/drop", "/explain", "/start", "/agent", "/wesy", "/meeting-minutes/live", "/meeting-minutes/new"];

export default function LuxSectionScene() {
  const { pathname } = useLocation();
  // صفحة محضر وحدة لها ويسي بالواجهة نفسها
  if (/^\/meeting-minutes\/[^/]+$/.test(pathname)) return null;
  if (SKIP.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)))) return null;
  const scene = SCENES.find((s) => s.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)));
  if (!scene) return null;
  return (
    <aside className="lxs" aria-label={tr(scene.tag)}>
      <span className="lxs-sun" aria-hidden />
      <img className={scene.flip ? "lxs-wesy flip" : "lxs-wesy"} src={`/lux/wz-${scene.pose}.webp`} alt="" decoding="async" />
      <div className="lxs-txt">
        <span className="lxs-tag">{tr(scene.tag)}</span>
        <p className="lxs-say">{tr("ويسي: {0}", tr(scene.say))}</p>
      </div>
      <button type="button" className="lxs-ask" onClick={() => openAgent()}>
        <span>{tr("اسأل ويسي")}</span>
      </button>
    </aside>
  );
}
