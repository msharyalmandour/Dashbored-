import { useEffect, useState } from "react";
import { tasks as mockTasks } from "../data/mockData";
import type { Task } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

interface TaskRow {
  id: string;
  title: string;
  description: string;
  assignee_id: string;
  due_date: string;
  status: Task["status"];
  priority: Task["priority"];
  section_key: string | null;
}

function mapRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
    status: row.status,
    priority: row.priority,
    sectionKey: (row.section_key as Task["sectionKey"]) ?? undefined,
  };
}

let mockIdCounter = mockTasks.length + 1;

export function useTasksData() {
  const [tasks, setTasks] = useState<Task[]>(isSupabaseConfigured ? [] : mockTasks);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const load = async () => {
      const { data } = await supabase!
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setTasks(data.map(mapRow));
      setLoading(false);
    };

    load();

    const channel = supabase!
      .channel("tasks-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, []);

  const addTask = async (input: {
    title: string;
    description: string;
    assigneeId: string;
    dueDate: string;
    priority: Task["priority"];
  }) => {
    if (!isSupabaseConfigured) {
      const newTask: Task = {
        id: `t${mockIdCounter++}`,
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId,
        dueDate: input.dueDate,
        priority: input.priority,
        status: "todo",
      };
      setTasks((prev) => [newTask, ...prev]);
      return { error: undefined as string | undefined };
    }

    const { error } = await supabase!.from("tasks").insert({
      title: input.title,
      description: input.description,
      assignee_id: input.assigneeId,
      due_date: input.dueDate,
      priority: input.priority,
      status: "todo",
    });
    return { error: error?.message };
  };

  const updateStatus = async (taskId: string, status: Task["status"]) => {
    if (!isSupabaseConfigured) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
      return { error: undefined as string | undefined };
    }

    // تحديث فوري بالواجهة قبل انتظار رد الخادم — يحس التطبيق أسرع
    let previous: Task[] = [];
    setTasks((prev) => {
      previous = prev;
      return prev.map((t) => (t.id === taskId ? { ...t, status } : t));
    });
    const { error } = await supabase!.from("tasks").update({ status }).eq("id", taskId);
    if (error) setTasks(previous);
    return { error: error?.message };
  };

  return { tasks, loading, addTask, updateStatus };
}
