import { useEffect, useState } from "react";
import { Download, Receipt } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useFounderNumber } from "../hooks/useFounderNumber";
import FounderBadge from "../components/team/FounderBadge";
import WLogo from "../components/brand/WLogo";
import { LuxHead } from "../components/lux/Lux";
import { V3Glow } from "../components/v3/WriteHeader";
import { formatDateShort } from "../lib/date";
import { tr } from "../lib/i18n";

/* الإيصال الذهبي (B02Receipt): كل باب ينفتح وكل خطوة بدليل لها إيصال — الباب، الخطوة، التاريخ، الفريق، والمدة من بداية الفريق.
   «نزّلوا سجل الرحلة» = نسخة للطباعة (حفظ كـ PDF من المتصفح). داخلي، فيقدر يكون فيه اسم الفريق. */

const DOOR_NAME: Record<string, string> = { write: tr("المقترح"), methodology: tr("المنهجية والأخلاقيات"), supervisor: tr("المشرف/ة"), calendar: tr("التقويم والملفات"), collect: tr("جمع البيانات") };
interface Row {
  id: string;
  kind: string;
  title: string;
  proof: Record<string, unknown>;
  created_at: string;
}

export default function Receipts() {
  const { team, mode } = useAuth();
  const founder = useFounderNumber();
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    if (mode !== "supabase" || !supabase || !team?.id) return setRows([]);
    void supabase
      .from("receipts")
      .select("id, kind, title, proof, created_at")
      .order("created_at")
      .then(({ data, error }) => setRows(error ? [] : ((data ?? []) as Row[])));
  }, [team?.id, mode]);
  const start = team?.createdAt ? Date.parse(team.createdAt) : null;
  const daysIn = (iso: string) => (start ? Math.max(0, Math.round((Date.parse(iso) - start) / 864e5)) : null);
  const label = (r: Row) => (r.kind === "door" ? tr("انفتح: {0}", DOOR_NAME[String(r.proof.key ?? "")] ?? String(r.proof.key ?? "")) : r.title);

  return (
    <div className="v3 relative">
      <V3Glow />
      <LuxHead kicker={tr("الفريق")} title={tr("سجل الرحلة")} sub={tr("كل خطوة سويتوها، بإيصالها")}>
        <button type="button" className="lx-ghost rc-noprint" onClick={() => window.print()} disabled={!rows?.length}>
          <Download size={17} aria-hidden />
          {tr("نزّلوا سجل الرحلة")}
        </button>
      </LuxHead>
      <section className="rc-sheet" aria-label={tr("الإيصالات")}>
        <header className="rc-head">
          <WLogo size={40} />
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 18 }}>{team?.name ?? ""}</b>
            <div style={{ fontSize: 13, color: "#ABA095" }}>{tr("سجل رحلة البحث · Wesync")}</div>
          </div>
          <FounderBadge n={founder} />
        </header>
        {rows === null && <p className="rc-empty">{tr("نجيب الإيصالات…")}</p>}
        {rows?.length === 0 && <p className="rc-empty">{tr("أول إيصال يطلع لما ينفتح لكم أول باب.")}</p>}
        <ol className="rc-list">
          {rows?.map((r, i) => (
            <li key={r.id} className="rc-row">
              <span className="rc-n" dir="ltr">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="rc-ic" aria-hidden>
                <Receipt size={16} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: "block", fontSize: 15 }}>{label(r)}</b>
                <span style={{ fontSize: 12, color: "#ABA095" }}>
                  {formatDateShort(r.created_at.slice(0, 10))}
                  {daysIn(r.created_at) !== null ? ` · ${tr("اليوم {0} من رحلتكم", daysIn(r.created_at)! + 1)}` : ""}
                </span>
              </span>
              <span className="rc-ok">{tr("بدليل ✓")}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
