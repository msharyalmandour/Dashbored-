import { useLocation } from "react-router-dom";
import { openAgent } from "../lib/agentBus";
import { tr } from "../lib/i18n";
import { SCENE_ART } from "../data/sceneArt";

type Pose = "wave" | "clip" | "gantt" | "coffee" | "point";
type Scene = { match: string[]; pose: Pose; tag: string; say: string; flip?: boolean; art: string; big: string };

/** مشهد ويسي لكل قسم (التصميم الموحّد): رسم كرتوني بسيط + جملة منه + «اسأل ويسي». ويسي ما يختفي من أي قسم. */
const SCENES: Scene[] = [
  { match: ["/research-search", "/evidence", "/literature-review"], pose: "point", tag: "المكتبة", say: "أدوّر وأقرأ عنكم، وأنتم تقررون", art: "search", big: "دراسات تجاوب على سؤالكم" },
  { match: ["/proposal", "/methodology", "/ethical-approval"], pose: "clip", tag: "المكتب", say: "أرتّب كلامكم، ما أكتب بدالكم", art: "write", big: "فصل فصل، بدون ضغط" },
  { match: ["/collect", "/study-kit", "/surveys", "/stats", "/fieldwork"], pose: "point", tag: "غرفة البيانات", say: "أتابع الردود، وأشرح لكم الأرقام بالعربي", art: "collect", big: "الرقم يصير جملة تفهمونها", flip: true },
  { match: ["/tasks", "/team"], pose: "gantt", tag: "غرفة الفريق", say: "كل واحد له خطوة واضحة، وما أحد يشيل الحمل لحاله", art: "team", big: "فريق واحد، خطوة كل أسبوع" },
  { match: ["/meeting-minutes", "/feedback", "/minutes"], pose: "point", tag: "غرفة الاجتماعات", say: "أجهّز الأجندة، وأكتب المحضر عنكم", art: "sup", big: "تدخلون جاهزين وتطلعون بقرارات" },
  { match: ["/calendar"], pose: "clip", tag: "التقويم", say: "مواعيدكم في جوالكم، وأذكّركم قبل كل موعد", art: "cal", big: "ولا موعد يفوتكم" },
  { match: ["/files", "/drive"], pose: "wave", tag: "الملفات والدرايف", say: "كل ملف ترفعونه أحطه بمكانه", art: "files", big: "ارموا، وأنا أرتب" },
  { match: ["/viva"], pose: "point", tag: "المنصة", say: "أدرّبكم لين تدخلون المناقشة واثقين", art: "viva", big: "تدخلون المناقشة واثقين" },
];
/** لون كل قسم (كسر الألوان — قرار المالك 2026-11-28): البرتقالي يظل للأزرار والهوية */
const SECTION_OF: [string[], string][] = [
  [["/research-search", "/evidence", "/literature-review"], "search"],
  [["/proposal", "/methodology", "/ethical-approval"], "write"],
  [["/collect", "/study-kit", "/surveys", "/stats", "/fieldwork"], "collect"],
  [["/meeting-minutes", "/feedback", "/minutes", "/meet"], "supervisor"],
  [["/tasks", "/team"], "team"],
  [["/chat"], "chat"],
  [["/calendar", "/files", "/drive"], "calendar"],
  [["/wesy"], "wesy"],
];
export function sectionOf(pathname: string): string {
  if (pathname === "/") return "home";
  const hit = SECTION_OF.find(([paths]) => paths.some((m) => pathname === m || pathname.startsWith(`${m}/`)));
  return hit ? hit[1] : "other";
}

/** صفحات ملء الشاشة أو لها مشهدها الخاص */
const SKIP = ["/", "/chat", "/meet", "/drop", "/explain", "/start", "/agent", "/wesy", "/meeting-minutes/live", "/meeting-minutes/new"];

function useScene(): Scene | null {
  const { pathname } = useLocation();
  if (/^\/meeting-minutes\/[^/]+$/.test(pathname)) return null;
  if (SKIP.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)))) return null;
  return SCENES.find((s) => s.match.some((m) => pathname === m || pathname.startsWith(`${m}/`))) ?? null;
}

/** هل للصفحة مشهد ويسي؟ (Layout يبني عليها عمودين بالشاشات العريضة) */
export function useHasScene() {
  return useScene() !== null;
}

/** شريط ويسي فوق (الشاشات الأصغر) */
export default function LuxSectionScene() {
  const scene = useScene();
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

/** مشهد ويسي على الجنب (الشاشات العريضة) — نفس لوحة مركز التصميم: رسمة القسم + ويسي + جملته + اسأل ويسي */
export function LuxSideScene() {
  const scene = useScene();
  if (!scene) return null;
  const art = SCENE_ART[scene.art];
  const flip = scene.flip ?? art?.flip ?? false;
  return (
    <aside className="lxp-scene" aria-label={tr(scene.tag)}>
      {/* رسومات ثابتة من كودنا (sceneArt.ts)، مو من مستخدم */}
      {art && <svg className="lxp-props" viewBox="0 0 470 834" preserveAspectRatio="xMidYMax slice" aria-hidden dangerouslySetInnerHTML={{ __html: art.props }} />}
      <img className={flip ? "lxp-wesy flip" : "lxp-wesy"} src={`/lux/wz-${scene.pose}.webp`} alt="" decoding="async" style={{ height: `${Math.round(((art?.h ?? 450) / 834) * 100)}%` }} />
      <span className="lxp-tag">{tr(scene.tag)}</span>
      <div className="lxp-cap">
        <p className="lxp-say">{tr("ويسي: {0}", tr(scene.say))}</p>
        <p className="lxp-big">{tr(scene.big)}</p>
      </div>
      <button type="button" className="lxp-ask" onClick={() => openAgent()}>
        <span className="flex-1 text-start">{tr("اسأل ويسي أي شي عن بحثكم…")}</span>
        <b>{tr("اسأل")}</b>
      </button>
      <span className="lxp-door r" aria-hidden />
      <span className="lxp-door l" aria-hidden />
    </aside>
  );
}
