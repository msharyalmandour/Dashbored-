import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, FileImage, File as FileIcon, ExternalLink, FolderOpen } from "lucide-react";
import clsx from "clsx";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import EmptyState from "../components/ui/EmptyState";
import FileAttach from "../components/FileAttach";
import { useFiles } from "../hooks/useFiles";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useResearchProject } from "../hooks/useResearchProject";
import type { DriveFile } from "../data/types";
import { formatDateShort } from "../lib/date";

type Kind = "pdf" | "doc" | "sheet" | "image";

function detectKind(mimeType: string): Kind {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv")) return "sheet";
  return "doc";
}

const kindIcon: Record<Kind, typeof FileText> = {
  pdf: FileText,
  doc: FileIcon,
  sheet: FileSpreadsheet,
  image: FileImage,
};

const kindColor: Record<Kind, string> = {
  pdf: "bg-rose-50 text-rose-600",
  doc: "bg-sky-accent-50 text-sky-accent-600",
  sheet: "bg-brand-50 text-brand-600",
  image: "bg-amber-accent-50 text-amber-accent-600",
};

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function categoryLabel(f: DriveFile) {
  return f.category === "meeting-minutes" ? "محاضر الاجتماعات" : "عام";
}

export default function Files() {
  const { files, reload } = useFiles();
  const { roster } = useTeamRoster();
  const { project } = useResearchProject();
  const memberById = (id: string) => roster.find((m) => m.id === id);
  const [folder, setFolder] = useState("all");
  const teamFolderLink = project?.driveFolderId
    ? `https://drive.google.com/drive/folders/${project.driveFolderId}`
    : null;

  const folders = useMemo(
    () => ["all", ...Array.from(new Set(files.map(categoryLabel)))],
    [files],
  );

  const filtered = files.filter((f) => folder === "all" || categoryLabel(f) === folder);

  return (
    <div className="space-y-5">
      <FileAttach onAttach={reload} />

      {teamFolderLink ? (
        <a
          href={teamFolderLink}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-l from-brand-500 to-brand-600 px-4 py-3 text-sm font-bold text-white shadow-sm shadow-brand-500/30 hover:from-brand-600 hover:to-brand-700"
        >
          <span className="flex items-center gap-2">
            <FolderOpen size={16} />
            افتحوا مجلد الفريق كامل بدرايف
          </span>
          <ExternalLink size={15} />
        </a>
      ) : (
        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-xs font-semibold text-brand-950/45">
          مجلد الفريق بدرايف يُنشأ تلقائيًا أول ما ترفعون أول ملف — بعدها يظهر هنا رابط لفتحه كامل.
        </p>
      )}

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
            const kind = detectKind(file.mimeType);
            const Icon = kindIcon[kind];
            const uploader = memberById(file.uploadedById);
            return (
              <li key={file.id} className="flex items-center gap-4 p-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kindColor[kind]}`}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-brand-950">
                    <bdi>{file.name}</bdi>
                  </p>
                  <p className="text-xs text-brand-950/45">
                    {categoryLabel(file)}
                    {file.sizeBytes ? ` · ${formatSize(file.sizeBytes)}` : ""}
                  </p>
                </div>
                {file.driveViewLink && (
                  <a
                    href={file.driveViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs font-semibold text-brand-950/60 transition-colors hover:bg-brand-50 hover:text-brand-700"
                  >
                    <ExternalLink size={12} />
                    فتح بدرايف
                  </a>
                )}
                {uploader && (
                  <div className="hidden items-center gap-1.5 text-xs text-brand-950/45 sm:flex">
                    <Avatar initials={uploader.initials} color={uploader.color} size="sm" />
                    {uploader.name.split(" ")[0]}
                  </div>
                )}
                <span className="w-20 shrink-0 text-end text-xs text-brand-950/40">
                  {formatDateShort(file.createdAt)}
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
