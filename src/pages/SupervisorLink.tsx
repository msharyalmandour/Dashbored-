import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { loadTeams, rememberTeam } from "../lib/supervisorLocal";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** رابط المشرفة (#/supervisor/<رمز>) — من الإيميلات ورسائل الفريق القديمة والجديدة.
    الصفحة القديمة المستقلة انحذفت: الرابط يحفظ الفريق بقائمتها ويفتح لوحة المشرفة على الفريق نفسه (وعلى الطلب لو فيه ?open=). */
export default function SupervisorLink() {
  const { token = "" } = useParams<{ token: string }>();
  const [search] = useSearchParams();
  if (!UUID.test(token)) return <Navigate to="/supervisor" replace />;
  const t = token.toLowerCase();
  // نحفظه قبل ما تفتح اللوحة عشان يطلع بقائمة «فرقي» من أول مرة (بدون ما نمسح اسمه لو محفوظ)
  const known = loadTeams().find((x) => x.token === t);
  rememberTeam(t, known?.teamName ?? "");
  const open = search.get("open");
  const q = new URLSearchParams({ t, ...(open ? { open } : {}) });
  return <Navigate to={`/supervisor?${q.toString()}`} replace />;
}
