import { useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useProposal } from "../../hooks/useProposal";
import { useTasksData } from "../../hooks/useTasksData";
import { useCalendarEvents } from "../../hooks/useCalendarEvents";
import { useSupervisorFeedback } from "../../hooks/useSupervisorFeedback";
import { useProjectMemory } from "../../hooks/useProjectMemory";
import { useResearchProject } from "../../hooks/useResearchProject";
import type { AgentAction } from "../../hooks/useProjectAgent";
import { addDaysISO, toISODate } from "../../lib/date";
import type { ReceiptItem, UndoPayload } from "../../lib/agentPlan";

/** ينفّذ إجراء الوكيل بصلاحيات المستخدم (RLS)، ويرجّع وش تغيّر + كيف نتراجع (ينحفظ بالسجل).
    ما ينادى إلا بعد «وافقوا وسوّوها». */
export function useAgentRun() {
  const { currentUser } = useAuth();
  const { aim, gap, questions, updateAimStatement, updateGap, setResearchQuestions } = useProposal();
  const { tasks, addTask, updateStatus, deleteTask } = useTasksData();
  const { addEvent, deleteEvent } = useCalendarEvents();
  const { addItems, remove: removeFeedback } = useSupervisorFeedback();
  const { add: addMemory, remove: removeMemory } = useProjectMemory();
  const { project } = useResearchProject();
  // أحدث قيم (عشان كذا إجراء ورا بعض بنفس الخطة ما يشتغل على نسخة قديمة)
  const latest = useRef({ aim: aim.statement, gap: gap.gapStatement, questions: questions.map((q) => q.text) });
  useEffect(() => {
    latest.current = { aim: aim.statement, gap: gap.gapStatement, questions: questions.map((q) => q.text) };
  }, [aim.statement, gap.gapStatement, questions]);

  const run = async (a: AgentAction): Promise<ReceiptItem | null> => {
    const item = (label: string, to: string, undo: UndoPayload, diff: ReceiptItem["diff"] = {}): ReceiptItem => ({ type: a.type, label, to, undo, diff });
    switch (a.type) {
      case "add_task": {
        if (!currentUser) return null;
        const { error, id } = await addTask({
          title: a.title,
          description: a.description,
          assigneeId: a.assigneeId ?? currentUser.id,
          dueDate: addDaysISO(toISODate(new Date()), a.days),
          priority: a.priority ?? "medium",
        });
        if (error) return null;
        return item(a.title, id ? `/tasks?task=${id}` : "/tasks", id ? { kind: "delete_task", id } : { kind: "none" }, { after: { title: a.title, assigneeId: a.assigneeId, days: a.days } });
      }
      case "update_task": {
        const before = tasks.find((t) => t.id === a.taskId)?.status;
        const { error } = await updateStatus(a.taskId, a.status);
        if (error) return null;
        return item(a.title, `/tasks?task=${a.taskId}`, before ? { kind: "task_status", id: a.taskId, status: before } : { kind: "none" }, { before, after: a.status });
      }
      case "add_event": {
        const { error, id } = await addEvent({ title: a.title, date: a.date, time: a.time, type: a.eventType, location: a.location });
        if (error) return null;
        return item(a.title, "/calendar", id ? { kind: "delete_event", id } : { kind: "none" }, { after: { date: a.date, time: a.time } });
      }
      case "set_aim": {
        const before = latest.current.aim;
        const { error } = await updateAimStatement(a.text);
        if (error) return null;
        latest.current.aim = a.text;
        return item(a.text, "/proposal", { kind: "set_aim", text: before }, { before, after: a.text });
      }
      case "set_gap": {
        const before = latest.current.gap;
        const { error } = await updateGap({ gapStatement: a.text });
        if (error) return null;
        latest.current.gap = a.text;
        return item(a.text, "/proposal", { kind: "set_gap", text: before }, { before, after: a.text });
      }
      case "add_questions":
      case "set_questions": {
        const before = latest.current.questions;
        const have = new Set(before.map((x) => x.trim()));
        const next = a.type === "set_questions" ? a.texts : [...before, ...a.texts.filter((x) => !have.has(x.trim()))];
        const { error } = await setResearchQuestions(next);
        if (error) return null;
        latest.current.questions = next;
        return item(next.join(" · "), "/proposal", { kind: "set_questions", texts: before }, { before, after: next });
      }
      case "remember": {
        if (!currentUser) return null;
        const { id, error } = await addMemory(a.note, currentUser.id);
        if (error || !id) return null;
        return item(a.note, "/", { kind: "forget", id }, { after: a.note });
      }
      case "forget": {
        const { error } = await removeMemory(a.memoryId);
        if (error) return null;
        return item(a.note, "/", { kind: "remember", note: a.note }, { before: a.note });
      }
      case "add_feedback_items": {
        if (!currentUser) return null;
        const { error, ids } = await addItems(
          a.items.map((i) => ({ comment: i.comment, sectionKey: i.sectionKey, assigneeId: i.assigneeId })),
          currentUser.id,
          project?.id ?? null,
        );
        if (error) return null;
        return item(a.items.map((i) => i.comment).join(" · "), "/meeting-minutes", ids?.length ? { kind: "delete_feedback", ids } : { kind: "none" }, { after: a.items });
      }
      default:
        return null;
    }
  };

  /** يرجّع خطوة وحدة. true = رجعت */
  const undo = async (u: UndoPayload): Promise<boolean> => {
    switch (u.kind) {
      case "delete_task":
        return !(await deleteTask(u.id)).error;
      case "task_status":
        return !(await updateStatus(u.id, u.status)).error;
      case "delete_event":
        return !(await deleteEvent(u.id)).error;
      case "set_aim":
        return !(await updateAimStatement(u.text)).error;
      case "set_gap":
        return !(await updateGap({ gapStatement: u.text })).error;
      case "set_questions":
        return !(await setResearchQuestions(u.texts)).error;
      case "forget":
        return !(await removeMemory(u.id)).error;
      case "remember":
        return currentUser ? !(await addMemory(u.note, currentUser.id)).error : false;
      case "delete_feedback": {
        let ok = true;
        for (const id of u.ids) ok = !(await removeFeedback(id)).error && ok;
        return ok;
      }
      default:
        return true;
    }
  };

  return { run, undo };
}
