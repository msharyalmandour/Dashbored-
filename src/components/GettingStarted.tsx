import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Circle, X } from "lucide-react";
import Card from "./ui/Card";

const DISMISS_KEY = "wesync.gettingStarted.dismissed";

interface Step {
  id: string;
  label: string;
  hint: string;
  to: string;
  done: boolean;
}

/** أول أيام الفريق: ٣ خطوات بس بدل ما يضيع بالرئيسية — تختفي لما تكتمل أو لو أغلقها المستخدم. */
export default function GettingStarted({ hasTitle, hasSupervisor, hasMyTask }: { hasTitle: boolean; hasSupervisor: boolean; hasMyTask: boolean }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const steps: Step[] = [
    { id: "title", label: "ثبّتوا عنوان بحثكم", hint: "القائد يكتبه من بطاقة المرحلة تحت", to: "/", done: hasTitle },
    { id: "supervisor", label: "عرّفوا المشرفة بحسابكم", hint: "اكتبوا اسمها بالمقترح وأرسلوا لها رابط المتابعة من صفحة الفريق", to: "/team", done: hasSupervisor },
    { id: "task", label: "خذوا أول مهمة لكم", hint: "افتحوا المهام وحطوا مهمة باسمكم", to: "/tasks", done: hasMyTask },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (dismissed || doneCount === steps.length) return null;

  return (
    <Card tone="sky" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-brand-950">
          ابدأوا بثلاث خطوات <span className="text-xs font-bold text-brand-950/45">({doneCount}/3)</span>
        </p>
        <button
          aria-label="إخفاء"
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // ما يهم
            }
            setDismissed(true);
          }}
          className="rounded-lg p-1 text-brand-950/40 hover:bg-surface-muted"
        >
          <X size={15} />
        </button>
      </div>
      <ul className="space-y-2">
        {steps.map((s) => (
          <li key={s.id}>
            <Link to={s.to} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface-muted/70">
              {s.done ? <Check size={18} className="shrink-0 text-brand-500" /> : <Circle size={18} className="shrink-0 text-brand-950/25" />}
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-bold ${s.done ? "text-brand-950/40 line-through" : "text-brand-950"}`}>{s.label}</span>
                {!s.done && <span className="block text-xs text-brand-950/50">{s.hint}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
