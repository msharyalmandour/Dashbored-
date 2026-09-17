import { useCallback, useEffect, useState } from "react";
import { files as mockFiles } from "../data/mockData";
import type { DriveFile } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const kindMime: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  sheet: "application/vnd.ms-excel",
  image: "image/png",
};

/** بوضع العرض التجريبي (بدون Supabase) نعرض بيانات mockData.ts القديمة
    للعرض فقط — الرفع الحقيقي أصلًا يحتاج مشروع Supabase متصل */
const mockDriveFiles: DriveFile[] = mockFiles.map((f) => ({
  id: f.id,
  name: f.name,
  mimeType: kindMime[f.kind] ?? "application/octet-stream",
  sizeBytes: 0,
  category: "general",
  driveFileId: f.id,
  driveViewLink: "",
  uploadedById: f.uploadedById,
  createdAt: f.date,
}));

interface FileRowDb {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  category: DriveFile["category"];
  drive_file_id: string;
  drive_view_link: string;
  uploaded_by: string | null;
  created_at: string;
}

function mapRow(row: FileRowDb): DriveFile {
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    category: row.category,
    driveFileId: row.drive_file_id,
    driveViewLink: row.drive_view_link,
    uploadedById: row.uploaded_by ?? "",
    createdAt: row.created_at,
  };
}

/** ملفات الفريق الحقيقية — كل ملف هنا حقيقي فعلًا وموجود بمجلد Drive
    الخاص بالفريق، مو مجرد اسم محلي زي قبل. الإدراج يصير فقط من داخل
    Edge Function drive-upload بعد نجاح الرفع الفعلي، فهذا الـ hook
    قراءة فقط (بدون addFile يدوي). */
export function useFiles() {
  const [files, setFiles] = useState<DriveFile[]>(isSupabaseConfigured ? [] : mockDriveFiles);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase!
      .from("files")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setFiles((data as FileRowDb[]).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    if (!isSupabaseConfigured) return;
    const channel = supabase!
      .channel(`files-sync-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "files" }, load)
      .subscribe();
    return () => {
      supabase!.removeChannel(channel);
    };
  }, [load]);

  return { files, loading, reload: load };
}
