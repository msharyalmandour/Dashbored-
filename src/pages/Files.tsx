import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, FileImage, File as FileIcon } from "lucide-react";
import clsx from "clsx";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import EmptyState from "../components/ui/EmptyState";
import FileAttach, { type AttachedFileMeta } from "../components/FileAttach";
import { useAuth } from "../context/AuthContext";
import { files, teamMembers } from "../data/mockData";
import type { FileItem } from "../data/types";
import { formatDateShort, toISODate } from "../lib/date";

const ATTACHED_KEY = "nursync.attachedFiles";

function loadAttached(): FileItem[] {
  try {
    const raw = localStorage.getItem(ATTACHED_KEY);
    return raw ? (JSON.parse(raw) as FileItem[]) : [];
  } catch {
    return [];
  }
}

const kindIcon: Record<FileItem["kind"], typeof FileText> = {
  pdf: FileText,
  doc: FileIcon,
  sheet: FileSpreadsheet,
  image: FileImage,
};

const kindColor: Record<FileItem["kind"], string> = {
  pdf: "bg-rose-50 text-rose-600",
  doc: "bg-sky-accent-50 text-sky-accent-600",
  sheet: "bg-brand-50 text-brand-600",
  image: "bg-amber-accent-50 text-amber-accent-600",
};

export default function Files() {
  const { currentUser } = useAuth();
  const [folder, setFolder] = useState("all");
  const [attached, setAttached] = useState<FileItem[]>(loadAttached);
  const memberById = (id: string) => teamMembers.find((m) => m.id === id)!;

  const allFiles = [...attached, ...files];

  const folders = useMemo(
    () => ["all", ...Array.from(new Set(allFiles.map((f) => f.folder)))],
    [allFiles],
  );

  const filtered = allFiles.filter((f) => folder === "all" || f.folder === folder);

  const handleAttach = (meta: AttachedFileMeta) => {
    const newFile: FileItem = {
      id: `f-local-${Date.now()}`,
      name: meta.name,
      kind: meta.kind,
      size: meta.size,
      folder: "مرفقاتي",
      uploadedById: currentUser?.id ?? teamMembers[0].id,
      date: toISODate(new Date()),
    };
    setAttached((prev) => {
      const updated = [newFile, ...prev];
      localStorage.setItem(ATTACHED_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="space-y-5">
      <FileAttach onAttach={handleAttach} />

      <div className="flex flex-wrap gap-2">
        {folders.map((f) => (
          <button
            key={f}
            onClick={() => setFolder(f)}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              folder === f
                ? "bg-brand-500 text-white"
                : "bg-paper text-brand-950/60 hover:bg-surface-muted",
            )}
          >
            {f === "all" ? "كل الملفات" : f}
          </button>
        ))}
      </div>

      <Card className="p-0">
        <ul className="divide-y divide-brand-50">
          {filtered.map((file) => {
            const Icon = kindIcon[file.kind];
            const uploader = memberById(file.uploadedById);
            return (
              <li key={file.id} className="flex items-center gap-4 p-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kindColor[file.kind]}`}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-brand-950">
                    <bdi>{file.name}</bdi>
                  </p>
                  <p className="text-xs text-brand-950/45">{file.folder} · {file.size}</p>
                </div>
                <div className="hidden items-center gap-1.5 text-xs text-brand-950/45 sm:flex">
                  <Avatar initials={uploader.initials} color={uploader.color} size="sm" />
                  {uploader.name.split(" ")[0]}
                </div>
                <span className="w-20 shrink-0 text-end text-xs text-brand-950/40">
                  {formatDateShort(file.date)}
                </span>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li>
              <EmptyState
                icon={FileIcon}
                title="لا ملفات هنا بعد"
                desc="أرفقوا أول ملف للفريق — أي مستند أو صورة أو جدول يخص بحثكم."
              />
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
