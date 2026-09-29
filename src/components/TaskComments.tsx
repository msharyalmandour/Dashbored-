import { useState } from "react";
import { Send } from "lucide-react";
import Avatar from "./ui/Avatar";
import type { TaskComment } from "../data/types";

interface CommentAuthor {
  name: string;
  initials: string;
  color: string;
}

interface TaskCommentsProps {
  comments: TaskComment[];
  memberById: (id: string) => CommentAuthor;
  canComment: boolean;
  onSubmit: (body: string) => Promise<{ error?: string }> | void;
}

export default function TaskComments({ comments, memberById, canComment, onSubmit }: TaskCommentsProps) {
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const body = draft.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    await onSubmit(body);
    setSubmitting(false);
    setDraft("");
  };

  return (
    <div className="w-full border-t border-brand-50 pt-3">
      {comments.length > 0 ? (
        <ul className="space-y-3">
          {comments.map((c) => {
            const author = memberById(c.authorId);
            return (
              <li key={c.id} className="flex items-start gap-2.5">
                <Avatar initials={author.initials} color={author.color} size="sm" />
                <div className="min-w-0 flex-1 rounded-2xl bg-surface-muted px-3 py-2">
                  <p className="text-xs font-bold text-brand-950">{author.name.split(" ")[0]}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-brand-950/80">{c.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-brand-950/40">ولا تعليق بعد — ابدؤوا النقاش.</p>
      )}

      {canComment && (
        <div className="mt-3 flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="اكتب تعليقك..."
            className="flex-1 rounded-xl border border-brand-100 px-3 py-2 text-sm outline-none focus:border-brand-300"
          />
          <button
            onClick={submit}
            disabled={submitting || !draft.trim()}
            className="flex shrink-0 items-center justify-center rounded-xl bg-brand-500 p-2.5 text-white hover:bg-brand-600 disabled:opacity-50"
          >
            <Send size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
