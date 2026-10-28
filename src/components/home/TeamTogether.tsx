import { Link } from "react-router-dom";
import clsx from "clsx";
import Avatar from "../ui/Avatar";
import { num } from "../v3/WriteHeader";
import { useAuth } from "../../context/AuthContext";
import { useTeamRoster } from "../../hooks/useTeamRoster";
import { useTeamPresence } from "../../hooks/useTeamPresence";
import type { Task } from "../../data/types";
import { tr } from "../../lib/i18n";

/** «الفريق مع بعض»: كل عضو — متصل أو لا، وش يشتغل عليه الحين، كم خلّص هالأسبوع وكم باقي عليه.
    كلها من المهام وحضور الموقع (Realtime) — ما ينحفظ شي جديد. */
export default function TeamTogether({ tasks, today, style }: { tasks: Task[]; today: string; style?: React.CSSProperties }) {
  const { currentUser } = useAuth();
  const { roster } = useTeamRoster();
  const online = useTeamPresence();
  const onlineIds = new Set([...online.map((u) => u.id), ...(currentUser ? [currentUser.id] : [])]);
  const weekAgo = new Date(Date.parse(`${today}T00:00:00Z`) - 6 * 86400000).toISOString().slice(0, 10);

  const members = [...roster]
    .map((m) => {
      const mine = tasks.filter((t) => t.assigneeId === m.id);
      const open = mine.filter((t) => t.status !== "done").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      const now = open.find((t) => t.status === "in-progress") ?? open[0];
      const doneWeek = mine.filter((t) => t.status === "done" && t.completedAt && t.completedAt.slice(0, 10) >= weekAgo).length;
      return { m, now, open: open.length, doneWeek, online: onlineIds.has(m.id), me: m.id === currentUser?.id };
    })
    // أنت أول، ثم المتصلين، ثم الباقي
    .sort((a, b) => Number(b.me) - Number(a.me) || Number(b.online) - Number(a.online));

  const onlineCount = members.filter((x) => x.online && !x.me).length;

  return (
    <section className="v3-g v3-hover v3-rise !rounded-[28px] px-5 pb-4 pt-5 sm:px-6" style={style} aria-labelledby="team-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="team-title" className="v3-k m-0 text-[20px]">
            {tr("الفريق مع بعض")}
          </h2>
          <p className="v3-mut m-0 text-[13px]">
            {onlineCount > 0 ? tr("{0} أونلاين الحين غيرك", num(onlineCount)) : tr("وش يشتغل عليه كل واحد هالأسبوع")}
          </p>
        </div>
        <Link to="/team" className="v3-link !text-[var(--ws-c-muted)]">
          {tr("صفحة الفريق ←")}
        </Link>
      </div>
      {members.length === 0 ? (
        <p className="v3-mut m-0 py-4 text-[15px]">{tr("أول ما ينضم أعضاء الفريق، يطلعون هنا مع بعض.")}</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2">
          {members.map(({ m, now, open, doneWeek, online: on, me }) => (
            <li key={m.id} className={clsx("v3-g2 flex flex-col gap-2 !rounded-[20px] p-3.5", me && "!border-[rgba(255,154,60,.35)]")}>
              <div className="flex items-center gap-2.5">
                <span className="relative">
                  <Avatar initials={m.initials} color={m.color} size="md" />
                  <span
                    className="absolute -bottom-0.5 end-0 h-3 w-3 rounded-full border-2 border-[#15100d]"
                    style={{ background: on ? "var(--ws-c-done)" : "rgba(255,255,255,.25)" }}
                    aria-hidden
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold">
                    {m.name.split(" ")[0]}
                    {me && <span className="v3-mut font-normal"> · {tr("أنت")}</span>}
                  </div>
                  <div className="text-xs" style={{ color: on ? "var(--ws-c-done)" : "var(--ws-c-muted)" }}>
                    {on ? tr("أونلاين الحين") : m.role === "leader" ? tr("قائد/ة الفريق") : tr("مو أونلاين")}
                  </div>
                </div>
              </div>
              <div className="text-[13px] leading-snug sm:min-h-[40px]">
                {now ? (
                  <>
                    <span className="v3-mut">{now.status === "in-progress" ? tr("الحين:") : tr("الجاي:")} </span>
                    <Link to={`/tasks?task=${now.id}`} className="font-bold hover:underline" dir="auto">
                      {now.title}
                    </Link>
                  </>
                ) : (
                  <span className="v3-mut">{tr("ما فيه مهام مفتوحة")}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {doneWeek > 0 ? <span className="v3-st done">{tr("خلصت {0} هالأسبوع", num(doneWeek))}</span> : <span className="v3-st todo">{tr("ولا وحدة خلصت هالأسبوع")}</span>}
                <span className="v3-st todo">{tr("باقي {0}", num(open))}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
