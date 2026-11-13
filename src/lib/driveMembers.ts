import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { syncDriveMembers } from "./driveTeam";
import { tr } from "./i18n";

/* الدرايف ومين مربوط (DriveD): حالة كل عضو والمشرف/ة من drive_members (القراءة لأعضاء الفريق بس)،
   وترتيب المجلد من team_drive_folders. دالة drive-team هي اللي تكتب (كل ساعة + كل ما أحد فتح الصفحة). */

export type DriveMemberStatus = "connected" | "invited" | "missing_email" | "view_only";
export interface DriveMemberRow {
  id: string;
  profile_id: string | null;
  kind: "member" | "supervisor";
  email: string | null;
  google_email: string | null;
  status: DriveMemberStatus;
  role: "writer" | "commenter" | "reader";
  invited_at: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
}
export interface DriveFolder {
  key: string;
  name: string;
  count: number;
}
export const DEFAULT_FOLDERS: DriveFolder[] = [
  { key: "proposal", name: "01 المقترح", count: 0 },
  { key: "literature", name: "02 الأدبيات", count: 0 },
  { key: "tools", name: "03 أدوات القياس", count: 0 },
  { key: "ethics", name: "04 الأخلاقيات", count: 0 },
  { key: "data", name: "05 البيانات", count: 0 },
  { key: "minutes", name: "06 المحاضر", count: 0 },
];

/** المربوط = متصل أو المشرف/ة «تشوف بس» (يشوفون المجلد) */
export const isLinked = (s: DriveMemberStatus) => s === "connected" || s === "view_only";

/** «خالد ما فتح الدعوة، وأحمد ناقص إيميله» — يسمّي مين ناقص وليش */
export function missingSentence(people: { name: string; status: DriveMemberStatus }[]): string {
  const invited = people.filter((p) => p.status === "invited").map((p) => p.name);
  const noEmail = people.filter((p) => p.status === "missing_email").map((p) => p.name);
  const parts: string[] = [];
  if (invited.length) parts.push(tr("{0} ما فتح الدعوة", joinNames(invited)));
  if (noEmail.length) parts.push(tr("{0} ناقص إيميله", joinNames(noEmail)));
  if (!parts.length) return tr("كل الفريق مربوط، وكل ملف ينحفظ بالمجلد لحاله.");
  return `${parts.join(tr("، و"))}. ${tr("لين يرتبطون، ملفاتهم ما تنحفظ بالمجلد.")}`;
}
function joinNames(n: string[]): string {
  if (n.length <= 1) return n[0] ?? "";
  return `${n.slice(0, -1).join(tr("، "))} ${tr("و")}${n[n.length - 1]}`;
}

export function useDriveMembers(opts: { sync?: boolean } = {}) {
  const [rows, setRows] = useState<DriveMemberRow[] | null>(null);
  const [folders, setFolders] = useState<DriveFolder[] | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  /** الجدول لسه ما انضاف بالقاعدة (قبل تشغيل الإضافة) */
  const [notReady, setNotReady] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase!.from("drive_members").select("id, profile_id, kind, email, google_email, status, role, invited_at, connected_at, last_sync_at");
    if (error) {
      setNotReady(true);
      setRows([]);
      return;
    }
    setNotReady(false);
    setRows((data ?? []) as DriveMemberRow[]);
    const f = await supabase!.rpc("team_drive_folders");
    const v = f.data as { folders?: DriveFolder[]; lastSyncAt?: string | null } | null;
    setFolders(v?.folders?.length ? v.folders : null);
    setLastSyncAt(v?.lastSyncAt ?? null);
  }, []);

  const sync = useCallback(
    async (force = false) => {
      setSyncing(true);
      await syncDriveMembers(force);
      setSyncing(false);
      await load();
    },
    [load],
  );

  useEffect(() => {
    void load();
    if (opts.sync) void sync();
  }, [load, sync, opts.sync]);

  return { rows, folders, lastSyncAt, notReady, syncing, reload: load, sync };
}
