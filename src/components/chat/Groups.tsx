import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Lock } from "lucide-react";
import { avatarLetter } from "../../lib/avatarLetter";
import { tr } from "../../lib/i18n";

/* المجموعتين (GroupsIntro / ChatGuard): «مع الدكتورة» بهوية كريمية دافية، و«الفريق بس» بزجاج داكن وقفل.
   الشريط فوق ثابت دايمًا، وكل تبويب فيه سطر يقول مين يشوف. */

export type Group = "doc" | "team";

export function DocAv({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span className="gr-docav" style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden>
      {avatarLetter(name) || "د"}
    </span>
  );
}

export function GroupTabs({ active, docName, unreadDoc, unreadTeam }: { active: Group; docName: string; unreadDoc: number; unreadTeam: number }) {
  return (
    <nav className="gr-tabs" aria-label={tr("المجموعات")}>
      <Link to="/chat?g=doc" className={active === "doc" ? "gr-tab doc on" : "gr-tab doc"} aria-current={active === "doc" ? "page" : undefined}>
        <DocAv name={docName} />
        <span className="gr-tab-m">
          <b>{tr("مع الدكتورة")}</b>
          <span>{tr("{0} تشوف كل شي", docName)}</span>
        </span>
        {unreadDoc > 0 && <i className="gr-badge">{unreadDoc}</i>}
      </Link>
      <Link to="/chat" className={active === "team" ? "gr-tab team on" : "gr-tab team"} aria-current={active === "team" ? "page" : undefined}>
        <span className="gr-lock" aria-hidden>
          <Lock size={16} />
        </span>
        <span className="gr-tab-m">
          <b>{tr("الفريق بس")}</b>
          <span>{tr("خاص · الدكتورة ما تشوفه")}</span>
        </span>
        {unreadTeam > 0 && <i className="gr-badge">{unreadTeam}</i>}
      </Link>
    </nav>
  );
}

export function GroupBanner({ group, docName }: { group: Group; docName: string }) {
  return group === "doc" ? (
    <div className="gr-banner doc">
      <DocAv name={docName} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{tr("هذا القروب مع {0}", docName)}</b>
        <span>{tr("كل رسالة هنا تشوفها الدكتورة · اكتبوا بأسلوب رسمي ولطيف")}</span>
      </div>
      <span className="gr-pill">
        <Eye size={14} aria-hidden />
        {tr("تشوف")}
      </span>
    </div>
  ) : (
    <div className="gr-banner team">
      <span className="gr-lock" aria-hidden>
        <Lock size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{tr("الفريق بس · خاص")}</b>
        <span>{tr("أنتم بس. الدكتورة ما تشوف هذا القروب أبد")}</span>
      </div>
      <span className="gr-pill">
        <Lock size={13} aria-hidden />
        {tr("خاص")}
      </span>
    </div>
  );
}

const introKey = (uid: string) => `wesync.groupsIntro.${uid}`;
export function useGroupsIntro(uid: string | undefined): [boolean, () => void] {
  const [seen, setSeen] = useState(() => {
    try {
      return !uid || localStorage.getItem(introKey(uid)) === "1";
    } catch {
      return true;
    }
  });
  const dismiss = () => {
    setSeen(true);
    try {
      if (uid) localStorage.setItem(introKey(uid), "1");
    } catch {
      /* بدون تخزين */
    }
  };
  return [!seen, dismiss];
}

/** أول مرة: عمودين، وش ينكتب وين، وزر «فهمنا» */
export function GroupsIntro({ docName, onDone }: { docName: string; onDone: () => void }) {
  return (
    <div className="gr-scrim" role="dialog" aria-modal="true" aria-labelledby="gr-intro-h">
      <div className="gr-intro">
        <h2 id="gr-intro-h">{tr("عندكم قروبين، وكل واحد له كلامه")}</h2>
        <div className="gr-cols">
          <section className="gr-col doc">
            <div className="gr-col-h">
              <DocAv name={docName} />
              <b>{tr("مع الدكتورة")}</b>
            </div>
            <ul>
              <li>{tr("أسئلة عن البحث والملاحظات")}</li>
              <li>{tr("طلبات التمديد والمواعيد")}</li>
              <li>{tr("الملفات اللي تبونها تشوفها")}</li>
            </ul>
            <span className="gr-col-f">
              <Eye size={14} aria-hidden /> {tr("{0} تشوف كل رسالة", docName)}
            </span>
          </section>
          <section className="gr-col team">
            <div className="gr-col-h">
              <span className="gr-lock" aria-hidden>
                <Lock size={16} />
              </span>
              <b>{tr("الفريق بس")}</b>
            </div>
            <ul>
              <li>{tr("توزيع الشغل بينكم")}</li>
              <li>{tr("المسودات قبل لا تجهز")}</li>
              <li>{tr("السوالف والضحك")}</li>
            </ul>
            <span className="gr-col-f">
              <Lock size={13} aria-hidden /> {tr("الدكتورة ما تشوفه أبد")}
            </span>
          </section>
        </div>
        <button type="button" className="gr-ok" onClick={onDone} autoFocus>
          {tr("فهمنا")}
        </button>
      </div>
    </div>
  );
}

/** «د. إسراء بتشوف هذي الرسالة» — قبل الإرسال لمجموعة الدكتورة لما الرسالة شكلها للفريق */
export function ChatGuard({ docName, text, onTeam, onDoc, onClose }: { docName: string; text: string; onTeam: () => void; onDoc: () => void; onClose: () => void }) {
  return (
    <div className="gr-scrim" role="alertdialog" aria-modal="true" aria-labelledby="gr-guard-h" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="gr-guard">
        <DocAv name={docName} size={52} />
        <h2 id="gr-guard-h">{tr("{0} بتشوف هذي الرسالة", docName)}</h2>
        <p className="gr-quote" dir="auto">
          «{text}»
        </p>
        <p className="gr-why">{tr("شكلها كلام بينكم. متأكدين تبونها بقروب الدكتورة؟")}</p>
        <button type="button" className="gr-go" onClick={onTeam} autoFocus>
          <Lock size={16} aria-hidden />
          {tr("أرسلوها للفريق بس")}
        </button>
        <button type="button" className="gr-alt" onClick={onDoc}>
          {tr("لا، للدكتورة")}
        </button>
      </div>
    </div>
  );
}

/** «انقلوها للدكتورة»: من «الفريق بس» لمجموعة الدكتورة، ودايمًا نأكد قبل */
export function MoveToDoc({ docName, text, onSend, onClose }: { docName: string; text: string; onSend: () => void; onClose: () => void }) {
  return (
    <div className="gr-scrim" role="alertdialog" aria-modal="true" aria-labelledby="gr-move-h" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="gr-guard">
        <DocAv name={docName} size={52} />
        <h2 id="gr-move-h">{tr("ننقلها لقروب {0}؟", docName)}</h2>
        <p className="gr-quote" dir="auto">
          «{text}»
        </p>
        <p className="gr-why">{tr("بتشوفها الدكتورة وكل الفريق.")}</p>
        <button type="button" className="gr-go" onClick={onSend} autoFocus>
          <Eye size={16} aria-hidden />
          {tr("أرسلوها للدكتورة")}
        </button>
        <button type="button" className="gr-alt" onClick={onClose}>
          {tr("لا، خلّوها هنا")}
        </button>
      </div>
    </div>
  );
}
