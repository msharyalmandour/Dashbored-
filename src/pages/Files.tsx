import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, FileImage, File as FileIcon, ExternalLink, FolderOpen } from "lucide-react";
import clsx from "clsx";
import { HighlightCard, PageColumns, PageHeader, Panel, rowSurface } from "../components/ui/page";
import Avatar from "../components/ui/Avatar";
import EmptyState from "../components/ui/EmptyState";
import FileAttach from "../components/FileAttach";
import { useFiles } from "../hooks/useFiles";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useResearchProject } from "../hooks/useResearchProject";
import type { DriveFile } from "../data/types";
import { formatDateShort } from "../lib/date";
import { tr } from "../lib/i18n";

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
  pdf: "bg-[#ff7a6b]/15 text-[#ff7a6b]",
  doc: "bg-brand-500/15 text-amber-accent-400",
  sheet: "bg-[#7fd6a0]/15 text-[#7fd6a0]",
  image: "bg-amber-accent-400/15 text-amber-accent-400",
};

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function categoryLabel(f: DriveFile) {
  return f.category === "meeting-minutes" ? tr("محاضر الاجتماعات") : tr("عام");
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
    () => Array.from(new Set(files.map(categoryLabel))),
    [files],
  );

  const filtered = files.filter((f) => folder === "all" || categoryLabel(f) === folder);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={tr("الفريق")}
        title={tr("الملفات")}
        subtitle={tr("كل ملفات البحث بمكان واحد، ومرتبطة بمجلد الفريق على درايف.")}
      />

      <PageColumns
        side={
          <>
            {teamFolderLink ? (
              <a href={teamFolderLink} target="_blank" rel="noreferrer" className="block">
                <HighlightCard kicker={tr("درايف الفريق")} title={tr("افتحوا مجلد الفريق كامل")} subtitle={tr("يفتح في تبويب جديد")}>
                  <ExternalLink size={16} className="mt-3 text-brand-950/80" />
                </HighlightCard>
              </a>
            ) : (
              <Panel>
                <p className="flex items-start gap-2 text-sm text-brand-950/55">
                  <FolderOpen size={16} className="mt-0.5 shrink-0 text-amber-accent-400" />{tr("مجلد الفريق بدرايف يُنشأ تلقائيًا أول ما ترفعون أول ملف — بعدها يظهر هنا رابط لفتحه كامل.")}</p>
              </Panel>
            )}
            <Panel title={tr("تصنيف الملفات")}>
              <ul className="space-y-1.5">
                {["all", ...folders].map((f) => {
                  const count = f === "all" ? files.length : files.filter((x) => categoryLabel(x) === f).length;
                  return (
                    <li key={f}>
                      <button
                        onClick={() => setFolder(f)}
                        className={clsx(
                          "flex w-full items-center justify-between rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                          folder === f
                            ? "bg-gradient-to-l from-amber-accent-400 to-brand-500 text-[#1a0f00]"
                            : "text-brand-950/60 hover:bg-brand-500/10",
                        )}
                      >
                        {f === "all" ? tr("كل الملفات") : f}
                        <span className="text-xs opacity-80">{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </>
        }
        main={
          <>
            <Panel title={tr("رفع ملف")}>
              <FileAttach onAttach={reload} />
            </Panel>
            <Panel title={folder === "all" ? tr("كل الملفات") : folder} hint={tr("{0} ملف", filtered.length)}>
              <ul className="flex flex-col gap-2.5">
                {filtered.map((file) => {
                  const kind = detectKind(file.mimeType);
                  const Icon = kindIcon[kind];
                  const uploader = memberById(file.uploadedById);
                  return (
                    <li key={file.id} className={clsx(rowSurface, "flex items-center gap-4")}>
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
                          className="flex shrink-0 items-center gap-1 rounded-full border border-brand-500/30 px-3 py-1.5 text-xs font-semibold text-amber-accent-400 transition-colors hover:bg-brand-500/10"
                        >
                          <ExternalLink size={12} />{tr("فتح بدرايف")}</a>
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
                      title={tr("لا ملفات هنا بعد")}
                      desc={tr("أرفقوا أول ملف للفريق — أي مستند أو صورة أو جدول يخص بحثكم.")}
                    />
                  </li>
                )}
              </ul>
            </Panel>
          </>
        }
      />
    </div>
  );
}
