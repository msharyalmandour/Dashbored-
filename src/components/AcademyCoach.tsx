import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, GraduationCap, X } from "lucide-react";
import { allLessons, type LessonId } from "../data/academy";
import { setActiveLesson, useAcademy } from "../hooks/useAcademy";
import { tr } from "../lib/i18n";

const pathOf = (route: string) => route.split("?")[0];

/** يبدأ درس: يحفظه كدرس حالي ويودّي لصفحته */
export function useStartLesson() {
  const navigate = useNavigate();
  return (id: LessonId) => {
    const l = allLessons.find((x) => x.id === id);
    if (!l) return;
    setActiveLesson(id);
    navigate(l.route);
  };
}

/** المرشد اللي يطلع فوق الصفحة وقت الدرس: يضوّي على الزر المطلوب، يعرض الخطوات،
    ويحتفل لحاله لما الشغل الفعلي ينحفظ بالقاعدة (يعيد الفحص كل شوي وقت الدرس) */
export default function AcademyCoach() {
  const { active, signals, loaded, refresh, next, done, total } = useAcademy();
  const location = useLocation();
  const start = useStartLesson();
  const lesson = active
    ? (allLessons.find((l) => l.id === active) ?? null)
    : null;
  const onPage = !!lesson && location.pathname === pathOf(lesson.route);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [spot, setSpot] = useState(true);
  const [open, setOpen] = useState(true);
  const [celebrate, setCelebrate] = useState<LessonId | null>(null);
  const targetRef = useRef<Element | null>(null);

  // كل ما يتغيّر الدرس أو الصفحة: نرجّع الإضاءة والبطاقة
  useEffect(() => {
    setSpot(true);
    setOpen(true);
  }, [active, location.pathname]);

  // نفحص الشغل: على تغيّر الصفحة، وكل 6 ثواني طول ما الدرس شغّال
  useEffect(() => {
    if (!active) return;
    refresh(true);
    const t = window.setInterval(() => refresh(), 6000);
    const onVis = () => document.visibilityState === "visible" && refresh(true);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active, location.pathname, refresh]);

  // مراجعة درس مكتمل من قبل: نرشد بس بدون احتفال
  const reviewRef = useRef<{ id: LessonId | null; review: boolean }>({
    id: null,
    review: false,
  });
  if (reviewRef.current.id !== active)
    reviewRef.current = {
      id: active,
      review: !!active && loaded && signals[active],
    };
  const reviewing = reviewRef.current.review;

  // الدرس اكتمل؟ نحتفل ونوقّف الإرشاد
  useEffect(() => {
    if (active && loaded && signals[active] && !reviewing) {
      setCelebrate(active);
      setActiveLesson(null);
    }
  }, [active, loaded, signals, reviewing]);

  // ندوّر على العنصر المطلوب (الصفحة ممكن تتأخر شوي بالتحميل)
  useEffect(() => {
    targetRef.current = null;
    setRect(null);
    if (!lesson?.target || !onPage) return;
    let tries = 0;
    let scrolls = 0;
    let userMoved = false;
    const onUser = () => (userMoved = true);
    window.addEventListener("wheel", onUser, { passive: true });
    window.addEventListener("touchmove", onUser, { passive: true });
    const reduce =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.reduceMotion === "true";
    const find = () => {
      const els = Array.from(document.querySelectorAll(lesson.target!));
      const el = els.find((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      if (!el) return false;
      targetRef.current = el;
      const r = el.getBoundingClientRect();
      // الصفحة ممكن تكمّل تحميل وتنزّل العنصر بعد أول سكرول: نعيد لين يبان (إلا لو المستخدم حرّك بنفسه)
      const off = r.top < 70 || r.top > window.innerHeight * 0.6;
      if (off && !userMoved && scrolls < 4) {
        scrolls += 1;
        el.scrollIntoView({
          block: "center",
          behavior: reduce || scrolls > 1 ? "auto" : "smooth",
        });
      }
      setRect(el.getBoundingClientRect());
      return true;
    };
    find();
    const t = window.setInterval(() => {
      tries += 1;
      find();
      if (tries > 12) window.clearInterval(t);
    }, 350);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("wheel", onUser);
      window.removeEventListener("touchmove", onUser);
    };
  }, [lesson, onPage]);

  // نتابع مكان العنصر مع السكرول وتغيّر المقاس
  useLayoutEffect(() => {
    if (!rect) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = targetRef.current;
        if (el && el.isConnected) setRect(el.getBoundingClientRect());
        else setRect(null);
      });
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [!!rect]); // eslint-disable-line react-hooks/exhaustive-deps

  // أي ضغطة تطفي الإضاءة (عشان ما تغطّي على شغلهم) — الخطوات تبقى بالبطاقة
  useEffect(() => {
    if (!rect || !spot) return;
    const off = () => setSpot(false);
    const t = window.setTimeout(
      () => document.addEventListener("pointerdown", off, { once: true }),
      400,
    );
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerdown", off);
    };
  }, [rect, spot]);

  if (celebrate) {
    const l = allLessons.find((x) => x.id === celebrate);
    return createPortal(
      <div className="ac-card ac-done" role="status">
        <span className="ac-check" aria-hidden>
          <Check size={20} strokeWidth={3} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="ac-kicker">
            {tr("تعلّمتوها! {0} من {1}", done, total)}
          </p>
          <p className="ac-title">{l?.title}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {next ? (
              <button
                type="button"
                className="ac-primary"
                onClick={() => {
                  setCelebrate(null);
                  start(next.id);
                }}
              >
                {tr("الدرس الجاي: {0}", next.title)}
              </button>
            ) : (
              <Link
                to="/learn"
                className="ac-primary"
                onClick={() => setCelebrate(null)}
              >
                {tr("شوفوا شهادتكم")}
              </Link>
            )}
            <Link
              to="/learn"
              className="ac-ghost"
              onClick={() => setCelebrate(null)}
            >
              {tr("كل الدروس")}
            </Link>
          </div>
        </div>
        <button
          type="button"
          className="ac-x"
          aria-label={tr("إغلاق")}
          onClick={() => setCelebrate(null)}
        >
          <X size={18} />
        </button>
      </div>,
      document.body,
    );
  }

  if (!lesson) return null;

  const stop = () => setActiveLesson(null);
  const pad = 8;
  const hole =
    rect && spot && onPage
      ? {
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
        }
      : null;
  // الفقاعة جنب العنصر: تحته لو فيه مكان، وإلا فوقه
  const below = hole ? hole.top + hole.height + 150 < window.innerHeight : true;
  const bubbleW = Math.min(300, window.innerWidth - 32);
  // البطاقة تروح فوق لو العنصر تحت (أو بالمحادثة عشان ما تغطّي خانة الكتابة)
  const wide = window.innerWidth >= 768;
  const cardTop =
    !wide &&
    (location.pathname === "/chat" ||
      (!!rect && onPage && rect.bottom > window.innerHeight - 340));
  // بالكمبيوتر: البطاقة بالجهة المقابلة للعنصر
  const flip =
    wide &&
    !!rect &&
    onPage &&
    rect.left + rect.width / 2 < window.innerWidth / 2;
  const pos = `${cardTop ? " top" : ""}${flip ? " flip" : ""}`;
  const bubbleLeft = hole
    ? Math.max(
        16,
        Math.min(
          window.innerWidth - bubbleW - 16,
          hole.left + hole.width / 2 - bubbleW / 2,
        ),
      )
    : 0;

  return createPortal(
    <>
      {hole && (
        <>
          <div className="ac-hole" style={hole} aria-hidden />
          {!open && (
            <div
              className="ac-bubble"
              style={{
                width: bubbleW,
                left: bubbleLeft,
                ...(below
                  ? { top: hole.top + hole.height + 12 }
                  : { bottom: window.innerHeight - hole.top + 12 }),
              }}
              role="note"
            >
              {lesson.tip}
            </div>
          )}
        </>
      )}
      {open ? (
        <section className={`ac-card${pos}`} aria-label={tr("الدرس الحالي")}>
          <span className="ac-ic" aria-hidden>
            <GraduationCap size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="ac-kicker">{tr("درس · سووها بأيديكم")}</p>
            <p className="ac-title">{lesson.title}</p>
            {hole && <p className="ac-tip">{lesson.tip}</p>}
            {!onPage ? (
              <Link to={lesson.route} className="ac-primary mt-3">
                {tr("ودّوني للصفحة")}
              </Link>
            ) : (
              <ol className="ac-steps">
                {lesson.steps.map((s, i) => (
                  <li key={i}>
                    <span dir="ltr">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            )}
            <p className="ac-note">
              {reviewing
                ? tr("خلصتوا هالدرس من قبل، هذي مراجعة.")
                : tr("يكتمل لحاله أول ما تسوونها.")}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3">
              {onPage && lesson.target && !hole && rect && (
                <button
                  type="button"
                  className="ac-ghost"
                  onClick={() => setSpot(true)}
                >
                  {tr("وريني وين")}
                </button>
              )}
              <button
                type="button"
                className="ac-ghost"
                onClick={() => setOpen(false)}
              >
                {tr("صغّروها")}
              </button>
              <button type="button" className="ac-ghost" onClick={stop}>
                {tr("وقّفوا الدرس")}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <button
          type="button"
          className={`ac-pill${pos}`}
          onClick={() => setOpen(true)}
        >
          <GraduationCap size={16} aria-hidden />
          {lesson.title}
        </button>
      )}
    </>,
    document.body,
  );
}
