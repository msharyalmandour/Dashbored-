import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, FileImage, File as FileIcon } from "lucide-react";
import clsx from "clsx";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import { files, teamMembers } from "../data/mockData";
import type { FileItem } from "../data/types";
import { formatDateShort } from "../lib/date";

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
  const [folder, setFolder] = useState("all");
  const memberById = (id: string) => teamMembers.find((m) => m.id === id)!;

  const folders = useMemo(
    () => ["all", ...Array.from(new Set(files.map((f) => f.folder)))],
    [],
  );

  const filtered = files.filter((f) => folder === "all" || f.folder === folder);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {folders.map((f) => (
          <button
            key={f}
            onClick={() => setFolder(f)}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              folder === f
                ? "bg-brand-500 text-white"
                : "bg-white text-brand-950/60 hover:bg-surface-muted",
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
            <li className="py-10 text-center text-sm text-brand-950/40">لا توجد ملفات</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
