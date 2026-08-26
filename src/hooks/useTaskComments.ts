import { useEffect, useState } from "react";
import { taskComments as mockTaskComments } from "../data/mockData";
import type { TaskComment } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

interface CommentRow {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

function mapRow(row: CommentRow): TaskComment {
  return {
    id: row.id,
    taskId: row.task_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

let mockIdCounter = mockTaskComments.length + 1;

export function useTaskComments() {
  const [comments, setComments] = useState<TaskComment[]>(
    isSupabaseConfigured ? [] : mockTaskComments,
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const load = async () => {
      const { data } = await supabase!
        .from("task_comments")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setComments(data.map(mapRow));
      setLoading(false);
    };

    load();

    const channel = supabase!
      .channel("task-comments-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_comments" }, load)
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, []);

  const addComment = async (taskId: string, authorId: string, body: string) => {
    if (!isSupabaseConfigured) {
      const newComment: TaskComment = {
        id: `c${mockIdCounter++}`,
        taskId,
        authorId,
        body,
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => [...prev, newComment]);
      return { error: undefined as string | undefined };
    }

    const { error } = await supabase!.from("task_comments").insert({
      task_id: taskId,
      author_id: authorId,
      body,
    });
    return { error: error?.message };
  };

  return { comments, loading, addComment };
}
