import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import { AudioLines, Camera, Check, Download, House, MessagesSquare, PenLine } from "lucide-react";
import clsx from "clsx";
import { openAgent } from "../lib/agentBus";
import { tr } from "../lib/i18n";
import { useChatUnread } from "../hooks/useTeamChat";
import { queueDrop } from "../lib/dropQueue";

/** شريط التبويبات بالجوال فقط (زجاج عائم): الرئيسية · أكتب · [الوكيل بالنص] · مهامي · المحادثة.
    زر الوكيل كرة برتقالية فوقها موجة صوت. ضغطة طويلة (نص ثانية) تفتح قائمة: ارموا أي شي · صوّروا ورقة · اسألوا الوكيل.
    الضغطة العادية تبقى مثل ما هي (تفتح الوكيل). الديسكتوب يبقى على القائمة الجانبية. */
export default function BottomNav() {
  const unread = useChatUnread();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const camRef = useRef<HTMLInputElement>(null);
  const firstItem = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menu) return;
    firstItem.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu]);

  const press = () => {
    longPressed.current = false;
    timer.current = window.setTimeout(() => {
      longPressed.current = true;
      navigator.vibrate?.(12);
      setMenu(true);
    }, 500);
  };
  const release = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const tab = (to: string, label: string, Icon: typeof House, end?: boolean, badge = 0) => (
    <NavLink to={to} end={end} className={({ isActive }) => clsx("hg-tab", isActive && "on")} aria-label={badge ? `${label} · ${tr("{0} رسائل جديدة", badge)}` : undefined}>
      <span className="hg-ti">
        <Icon size={21} strokeWidth={1.7} aria-hidden />
      </span>
      {badge > 0 && (
        <span className="tc-badge !end-auto !top-0 ms-1 start-1/2" aria-hidden>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {label}
    </NavLink>
  );
  return (
    <>
      <nav className="hg-tabbar print:hidden md:hidden" aria-label={tr("التنقل")}>
        {tab("/", tr("الرئيسية"), House, true)}
        {tab("/proposal", tr("أكتب"), PenLine)}
        <button
          type="button"
          className="hg-fab select-none"
          data-learn="agent"
          aria-haspopup="menu"
          aria-expanded={menu}
          onPointerDown={press}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => {
            if (longPressed.current) return;
            openAgent();
          }}
          aria-label={tr("وكيل Wesync — ضغطة طويلة لـ«ارموا أي شي»")}
        >
          {/* موجة ثابتة (بدون حلقة حركة) */}
          <svg aria-hidden width="24" height="24" viewBox="0 0 26 26">
            <g fill="#FF9A3C">
              <rect x="4" y="10" width="3" height="6" rx="1.5" />
              <rect x="9.2" y="6" width="3" height="14" rx="1.5" />
              <rect x="14.4" y="3.5" width="3" height="19" rx="1.5" />
              <rect x="19.6" y="8.5" width="3" height="9" rx="1.5" />
            </g>
          </svg>
        </button>
        {tab("/tasks", tr("مهامي"), Check)}
        {tab("/chat", tr("المحادثة"), MessagesSquare, false, unread)}
      </nav>
      <input
        ref={camRef}
        type="file"
        hidden
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (!files.length) return;
          queueDrop(files, "orb");
          // هيرو «ارموا» يقراها فوق الصفحة نفسها
        }}
      />
      {menu &&
        createPortal(
          <div className="md:hidden">
            <div className="dr-scrim" onClick={() => setMenu(false)} aria-hidden />
            <div role="menu" aria-label={tr("من الكرة")} className="dr-menu dr-sh">
              <div className="px-2.5 pb-1 pt-1.5 text-[12px] font-bold text-[#FFB444]">{tr("ضغطة طويلة على الكرة")}</div>
              <button
                ref={firstItem}
                type="button"
                role="menuitem"
                className="dr-menu-i"
                style={{ background: "rgba(255,154,60,.12)" }}
                onClick={() => {
                  setMenu(false);
                  navigate("/drop");
                }}
              >
                <span className="dr-ic" style={{ background: "rgba(255,199,119,.14)", color: "#FFC777" }} aria-hidden>
                  <Download size={16} />
                </span>
                {tr("ارموا أي شي")}
              </button>
              <button
                type="button"
                role="menuitem"
                className="dr-menu-i"
                onClick={() => {
                  setMenu(false);
                  camRef.current?.click();
                }}
              >
                <span className="dr-ic" aria-hidden>
                  <Camera size={16} />
                </span>
                {tr("صوّروا ورقة")}
              </button>
              <button
                type="button"
                role="menuitem"
                className="dr-menu-i"
                onClick={() => {
                  setMenu(false);
                  openAgent();
                }}
              >
                <span className="dr-ic" aria-hidden>
                  <AudioLines size={16} />
                </span>
                {tr("اسألوا الوكيل")}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
