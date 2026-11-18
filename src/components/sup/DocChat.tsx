import { tr } from "../../lib/i18n";
import type { TeamData } from "../../lib/supervisorDash";

/** محادثات الدكتورة (DocChat) — تنبني بالخطوة 13 */
export function DocChatView({ teams }: { teams: TeamData[] }) {
  return (
    <section className="sd-glass sd-in">
      <b style={{ fontSize: 20 }}>{tr("المحادثات")}</b>
      <p style={{ margin: "6px 0 0", fontSize: 14, color: "#ABA095" }}>{teams.length ? tr("قريب: كلّموا فرقكم من هنا بدل الإيميل.") : tr("أضيفوا رابط فريق عشان تبدأ اللوحة.")}</p>
    </section>
  );
}
